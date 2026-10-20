# MySQL 监控与运维

订单接口从 100 毫秒变成 5 秒，可能在等连接池、等另一个事务释放行锁，也可能数据库只用了 20 毫秒，时间花在应用处理。只看 CPU 或“数据库端口通了”无法区分这些情况。监控应把业务请求、连接、语句、事务、复制和主机资源连成同一条证据链。

本文以 MySQL 8.4、InnoDB 为基线。查询改写见[查询优化](./query-optimization.md)，副本切换见[高可用与扩展](./high-availability.md)，误删还原见[备份恢复](./backup-recovery.md)。这里关注怎样采集、判断、定位和验证，不用一次全库重启代替诊断。

## 从业务症状进入数据库

![订单请求与数据库观测如何汇入告警及排查闭环](/database/mysql-observation-loop.svg)

先在应用记录订单接口的成功率、延迟分位数、连接池等待和数据库调用耗时，再关联同一时段的 MySQL 指标。业务延迟升高而 SQL 执行仍稳定时，应继续查连接池、网络和应用；不能因“用了数据库”就先改数据库参数。

| 观察对象 | 信号与入口 | 能说明什么，不能说明什么 |
| --- | --- | --- |
| 业务请求 | 请求数、错误率、P95/P99、幂等结果 | 用户是否受影响；不能由数据库平均耗时替代 |
| 连接 | `Threads_connected`、`Threads_running`、应用池等待 | 已建立连接、活动线程及排队；大量 Sleep 不必然泄漏 |
| 语句 | digest、慢日志、实际执行计划 | 哪些模板消耗时间/扫描量；摘要平均值不是 P99 |
| 事务与锁 | `innodb_trx`、`data_lock_waits`、元数据锁 | 谁在等待、谁在阻塞；当前为空不能证明刚才没有问题 |
| 复制 | 接收/应用状态、错误、目标 GTID 等待 | 各阶段进度；接收正常不证明数据已经可读 |
| 主机与存储 | CPU、内存、I/O 延迟、空间、inode、容器限额 | 资源是否成为瓶颈；Buffer Pool 空闲少不等于内存不足 |

业务告警与采集故障分开。Prometheus 能访问 exporter，但 exporter 无法登录 MySQL，是数据库采集失败；连 exporter 都访问不到，则先查采集进程、网络和配置。指标消失不能当成数值为零。

## 区分累计值、速率与当前值

`Questions`、`Queries`、`Slow_queries` 等是累计计数，不能把当前累计值直接标为“每秒”。`Questions` 主要统计客户端执行语句，`Queries` 还包含存储程序内部执行等，选哪种口径需保持一致。`Com_commit` 也不等于所有业务事务数，自动提交等行为会影响解释。

先取同一实例的两个采样点：

```sql
SELECT NOW(6) AS sampled_at, VARIABLE_NAME, VARIABLE_VALUE
FROM performance_schema.global_status
WHERE VARIABLE_NAME IN (
  'Uptime', 'Questions', 'Queries', 'Slow_queries',
  'Threads_connected', 'Threads_running', 'Max_used_connections',
  'Innodb_buffer_pool_read_requests', 'Innodb_buffer_pool_reads'
);
SELECT VARIABLE_NAME, VARIABLE_VALUE
FROM performance_schema.global_variables
WHERE VARIABLE_NAME IN ('max_connections', 'performance_schema');
```

例如 10:00:00 的 `Questions=10000`，10:00:10 为 11200，则这十秒平均为 `(11200-10000)/10=120` 次/秒。如果实例中途重启，`Uptime` 回退且计数下降，这一对样本不能直接相减；计数被人工重置也需识别。Prometheus 的 `rate` 可处理计数器重置，但仍需关注缺失样本与采样窗口。

`Threads_connected` 是当前值，`Max_used_connections` 是观测周期内的高水位；不对它们做同样的速率计算。Buffer Pool 的窗口命中率应按 `1-Δ物理读/Δ逻辑读请求` 计算，并处理分母为零、重置和冷启动；高命中率也可能伴随很大的绝对物理读量，不能单靠 95% 或 99% 判健康。

MySQL 8.4 使用 `performance_schema.global_status/global_variables`，不要继续查询旧的 `information_schema.GLOBAL_STATUS/GLOBAL_VARIABLES`。`performance_schema` 在实例启动时确定，不能靠 `SET GLOBAL performance_schema=ON` 动态开启；采集表空还应检查具体 instruments、consumers、容量与权限。

## 用摘要定位累计成本

按 SQL 模板观察次数、总耗时和扫描/返回量，找出值得继续分析的请求：

```sql
SELECT SCHEMA_NAME, DIGEST_TEXT, COUNT_STAR,
       ROUND(SUM_TIMER_WAIT / 1e12, 3) AS total_seconds,
       ROUND(AVG_TIMER_WAIT / 1e12, 6) AS avg_seconds,
       ROUND(SUM_ROWS_EXAMINED / NULLIF(COUNT_STAR, 0), 1) AS avg_examined,
       ROUND(SUM_ROWS_SENT / NULLIF(COUNT_STAR, 0), 1) AS avg_sent,
       SUM_ERRORS
FROM performance_schema.events_statements_summary_by_digest
WHERE SCHEMA_NAME NOT IN ('mysql', 'performance_schema', 'sys')
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;
```

Performance Schema 计时按皮秒归一化，除以 `1e12` 才是秒，除以 `1e9` 得到的是毫秒。这里的总耗时是多次语句耗时的累加，并发时可以大于墙上经过的时间；不能直接当成 CPU 忙碌时间或“最近一分钟耗时”。

摘要有重启、清空、容量和淘汰边界。持续监控应比较同一 digest 两次采样的增量，保留首次/末次观察时间；不要为每轮采集清空表。平均耗时很低的模板，仍可能因请求量大而累计成本很高。锁定具体模板后，在代表性参数和数据规模下检查执行计划，步骤见[查询优化](./query-optimization.md)。

## 找到真正的阻塞事务

支付更新卡住时，先观察活动线程、事务和数据锁等待。以下查询展示等待连接与阻塞连接，并关联到表和索引；监控账号需要相应可见权限，SQL 文本中可能有业务参数，应限制采集和访问范围。

```sql
SELECT PROCESSLIST_ID, PROCESSLIST_USER, PROCESSLIST_HOST,
       PROCESSLIST_DB, PROCESSLIST_COMMAND, PROCESSLIST_TIME,
       PROCESSLIST_STATE, PROCESSLIST_INFO
FROM performance_schema.threads
WHERE TYPE='FOREGROUND'
  AND PROCESSLIST_ID IS NOT NULL
  AND PROCESSLIST_COMMAND <> 'Sleep'
ORDER BY PROCESSLIST_TIME DESC;

SELECT trx_id, trx_state, trx_started, trx_wait_started,
       trx_mysql_thread_id, trx_query
FROM information_schema.innodb_trx
ORDER BY trx_started;

SELECT wt.PROCESSLIST_ID AS waiting_connection,
       bt.PROCESSLIST_ID AS blocking_connection,
       r.OBJECT_SCHEMA, r.OBJECT_NAME, r.INDEX_NAME,
       r.LOCK_TYPE, r.LOCK_MODE,
       w.REQUESTING_ENGINE_TRANSACTION_ID AS waiting_trx,
       w.BLOCKING_ENGINE_TRANSACTION_ID AS blocking_trx
FROM performance_schema.data_lock_waits w
JOIN performance_schema.data_locks r
  ON r.ENGINE=w.ENGINE
 AND r.ENGINE_LOCK_ID=w.REQUESTING_ENGINE_LOCK_ID
LEFT JOIN performance_schema.threads wt
  ON wt.THREAD_ID=w.REQUESTING_THREAD_ID
LEFT JOIN performance_schema.threads bt
  ON bt.THREAD_ID=w.BLOCKING_THREAD_ID;
```

MySQL 8.4 不再使用旧 `information_schema.innodb_lock_waits`。这里观察的是数据锁；DDL 等待还应查 `performance_schema.metadata_locks`，可通过 `sys.schema_table_lock_waits` 查看阻塞关系。诊断语句本身也是瞬时快照，跨表关联期间状态可能改变。

典型例子：会话 A 更新订单 1001 后没有提交，随后变成 Sleep；会话 B 更新同一订单并等待。A 看起来没有“正在运行的慢查询”，却仍持有事务锁。只找 `COMMAND='Query'` 或一键清理所有 Sleep，都会错过根因或误伤连接池。

先联系事务拥有者、检查应用边界，再决定提交、回滚或中断。`KILL QUERY` 只终止当前语句，不保证整个事务已回滚并释放全部锁；`KILL CONNECTION` 会断开连接并触发事务回滚，回滚也可能很久。必须确认具体连接、业务影响与重试合同，不能把自动拼接 KILL 全部执行写成日常巡检动作。死锁与锁等待超时的恢复语义见[事务系统](./transaction-system.md)。

## 复制监控按线程职责拆开

普通异步复制先看接收线程，再看协调器和各应用 worker；正在应用及最近应用事务的列属于 worker 表，不要误查协调器表：

```sql
SELECT CHANNEL_NAME, SERVICE_STATE,
       LAST_ERROR_NUMBER, LAST_ERROR_MESSAGE
FROM performance_schema.replication_connection_status;

SELECT CHANNEL_NAME, SERVICE_STATE,
       LAST_ERROR_NUMBER, LAST_ERROR_MESSAGE
FROM performance_schema.replication_applier_status_by_coordinator;

SELECT CHANNEL_NAME, WORKER_ID, SERVICE_STATE,
       LAST_ERROR_NUMBER, LAST_ERROR_MESSAGE,
       APPLYING_TRANSACTION, LAST_APPLIED_TRANSACTION
FROM performance_schema.replication_applier_status_by_worker;
```

单线程配置、未设置复制通道或不同复制模式下，部分表可能为空。应先知道“这台实例按设计应有哪个角色和通道”，再判断缺失是不是异常；独立主库没有副本通道，不应被判定为复制损坏。

对延迟敏感的写后读，用目标 GTID 等待或经验证的心跳与时钟合同；`Seconds_Behind_Source` 为 NULL、缺失或为零，都需结合线程状态解释。Group Replication 还要观察成员是否 ONLINE、角色、队列及多数派；切换与脑裂处理见[高可用与扩展](./high-availability.md)，不通过跳事务“修好”监控。

## 接入 Prometheus 时保留采集边界

以 mysqld_exporter 的单目标模式为例，先确认安装版本的 `--help` 与启用的 collectors。数据库账号按采集需求授权、限制来源和并发；官方常见授权包含 `PROCESS`、`REPLICATION CLIENT` 和全局 `SELECT`，其中全局 SELECT 能读取业务数据，不能把这套授权称为无敏感访问的最低权限。缩减授权时要逐项验证所需 collector，而不是把采集错误静默忽略。

以下为 exporter 与 MySQL 同机、明确使用 TCP IPv4 的账号模板。远程或容器部署需按数据库实际看到的来源地址配置，不直接沿用 `127.0.0.1`：

```sql
CREATE USER 'exporter'@'127.0.0.1'
  IDENTIFIED BY '<替换为监控专用随机密码>'
  WITH MAX_USER_CONNECTIONS 3;
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.*
  TO 'exporter'@'127.0.0.1';
```

秘密配置与数据库服务端 `my.cnf` 分开，例如 `/etc/mysqld-exporter/client.cnf`，仅允许运行 exporter 的用户读取，文件权限可设为 `0600`：

```ini
[client]
user=exporter
password=<替换为监控专用随机密码>
```

启动单目标采集，并仅监听本机地址。Prometheus 在远端时，使用专用受限监听地址及经过配置的 TLS/认证或受保护网络，不把 metrics 端口直接开放到公网。

```bash
mysqld_exporter --version
mysqld_exporter --config.my-cnf=/etc/mysqld-exporter/client.cnf \
  --mysqld.address=127.0.0.1:3306 \
  --web.listen-address=127.0.0.1:9104
curl --fail --max-time 5 http://127.0.0.1:9104/metrics
```

确认响应中的 `mysql_up`、预期指标、采集耗时和错误日志，再配置 Prometheus。以下假设 Prometheus 能通过自己的本机地址访问 exporter；两个服务分处容器时，`127.0.0.1` 不会自动指向另一个容器。

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
rule_files:
  - mysql-alerts.yml
scrape_configs:
  - job_name: mysql
    scrape_timeout: 5s
    static_configs:
      - targets: ['127.0.0.1:9104']
```

按实际暴露的指标核对名称与类型后，可用 `rate(mysql_global_status_questions[5m])` 查看窗口内客户端语句速率。不要把每个订单号、完整 SQL 或请求参数做成监控标签；高基数会让采集与存储本身成为负担。

最小告警先区分 exporter 不可达与 MySQL 采集失败，保存为上面引用的 `mysql-alerts.yml`：

```yaml
groups:
  - name: mysql-availability
    rules:
      - alert: MySQLExporterUnavailable
        expr: up{job="mysql"} == 0
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: MySQL 指标采集端点不可达
      - alert: MySQLCollectionFailed
        expr: mysql_up{job="mysql"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: exporter 无法正常采集 MySQL
```

用 `promtool check config prometheus.yml`、`promtool check rules mysql-alerts.yml` 检查配置后再加载。规则中的两分钟只是示例，应根据业务预算和采样周期调整；另外设置目标清单缺失、采集过期和监控系统自身健康告警，因为目标从配置中被删后，不会继续产生 `up=0`。测试通知路由、分组、去重和恢复通知，确认故障发生时有人能按运行手册处理。

## 日志保留、空间与维护窗口

慢日志用来保留实际慢请求，示例配置放在 MySQL 实际加载的 `[mysqld]` 段。路径应事先创建并允许 mysqld 写入；开启前评估流量、敏感参数、磁盘预算与轮转。

```ini
[mysqld]
slow_query_log=ON
log_output=FILE
slow_query_log_file=/var/log/mysql/slow.log
long_query_time=1
min_examined_row_limit=0
log_queries_not_using_indexes=OFF
log_timestamps=UTC
```

动态调整全局 `long_query_time` 不会改写已有连接的会话值，需要处理连接池与观察窗口。慢日志在语句执行后记录，顺序不等于开始顺序；未达到阈值、不满足行数门槛、采集未启用等情况都会让日志缺失。ROW 复制的行事件不会因为打开 `log_slow_replica_statements` 就成为完整的副本慢 SQL 日志。

错误日志先确认输出到文件、systemd journal 还是容器标准错误，再按故障时间查看启动、崩溃、存储、连接和复制错误。通用查询日志开销与敏感信息范围较大，只在受控窗口用于定位；它也不能代替完整的审计策略。

轮转应使用部署环境已验证的机制，先重命名、再让 MySQL 重新打开对应日志，确认新文件持续写入后才压缩归档。不要用 `/var/log/mysql/*.log` 的统一规则混管 binlog、relay log 或引擎文件；binlog 清理先核对所有副本与恢复链需求，通过数据库管理接口执行，不用 `rm`、按文件年龄自动删除或重置 GTID。

容量要同时计算数据、索引、binlog、relay log、临时文件、备份以及在线 DDL/重建可能需要的额外空间。`information_schema.tables` 的 InnoDB 行数和大小是估算，不能当精确磁盘占用；按多个采样点的实际文件系统增长估算可用时间，并为异常积压留余量。

不安排无依据的“每周全库 OPTIMIZE/REPAIR”。`REPAIR TABLE` 不修复 InnoDB；`OPTIMIZE TABLE` 可能重建表并造成 I/O、空间与锁影响。索引一段时间没被读取，不等于可以删除，还需覆盖完整业务周期、约束、复制与故障路径。维护动作由实际证据触发，在窗口内一次改变主要因素，并保留回退办法。

## 验证排查是否形成闭环

一次排查至少保留业务症状、实例角色与版本、时间窗口、关键 SQL 模板、阻塞关系或资源证据，以及调整前后的同口径结果。先验证错误率和延迟恢复，再观察复制积压、回滚、磁盘增长等副作用。不要把监控曲线暂时回落直接等同于根因已消除。

隔离演练可以从三个小场景开始：制造一个未提交订单事务，确认等待链能定位到阻塞连接；暂停副本应用，确认接收正常与订单不可见能被区分；停止 exporter，确认采集失败不会显示为“QPS 降到零、数据库一切正常”。每次演练都检查告警、定位入口、恢复后采集和业务结果，才能知道这套监控在故障时是否可用。
