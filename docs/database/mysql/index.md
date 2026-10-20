# MySQL

MySQL 的核心作用是让一组有关联的数据在并发和故障下仍按约定变化。商城里，创建订单和扣减库存需要一起成功；订单列表需要按买家、状态和时间查询；服务重启后，已确认的订单仍应能恢复。这些问题分别连接到表设计、索引、事务、日志与运维。

本专题示例以 **MySQL 8.4 LTS、InnoDB** 为基线。LTS 表示长期支持系列，不表示可以忽略小版本升级验证。已有 8.0 系统应先检查连接器、认证、SQL、执行计划和升级路径；不要直接套用 5.7 的配置文件。MySQL 8 已移除 Query Cache，8.4 默认禁用 `mysql_native_password`，旧配置或旧客户端可能因此启动、登录失败。

![MySQL 写入、复制与恢复的边界](/database/mysql-operation-boundaries.svg)

图中从库用于分担读取，备份用于恢复历史状态。误删订单也会复制到从库，所以“有从库”不等于“有备份”；异步复制还有延迟，刚下单后的详情页通常需要读主库或采用明确的一致性策略。

## 按问题选择阅读入口

先建立“SQL 如何经过服务端进入存储引擎”的模型，再用一个小业务表验证索引和事务。机制、实操与运维分别在细节页展开，避免把所有配置堆在入口页。

| 当前问题 | 阅读入口 | 要带走的判断 |
| --- | --- | --- |
| SQL 如何连接、解析、执行 | [服务模块](./service-modules.md) | 区分应用连接池、服务端会话、执行器与 InnoDB |
| 如何建表并读写记录 | [基础语法](./basic-syntax.md) | 写出有明确条件、结果和异常处理的 SQL |
| 金额、时间、标识怎么存 | [数据类型与设计](./data-types-design.md) | 取值范围、精度、字符集与业务约束匹配 |
| 两个请求同时扣库存怎么办 | [事务机制](./transaction-system.md) | 判断原子性、隔离级别、锁等待及重试边界 |
| 查询为什么读了很多行 | [索引系统](./index-system.md) | 看访问路径、联合索引和回表代价 |
| InnoDB 与其他引擎有何差异 | [存储引擎](./storage-engines.md) | 按事务、锁和恢复能力选择，交易表优先 InnoDB |
| SQL 偶发或持续变慢 | [查询优化](./query-optimization.md) | 用执行计划、实际耗时与负载证据定位 |
| 主库故障后如何继续服务 | [复制与高可用](./high-availability.md) | 区分复制、故障判定、旧主隔离和切换 |
| 历史大表如何清理 | [分区表](./partitioning.md) | 验证分区裁剪、唯一键限制和删除范围 |
| 哪个账号能访问哪些数据 | [安全与权限](./security-permissions.md) | 最小权限、网络边界与传输加密配合 |
| 如何恢复误删或损坏的数据 | [备份与恢复](./backup-recovery.md) | 用可恢复的备份和日志验证 RPO、RTO |
| 如何发现容量和性能退化 | [监控与运维](./monitoring-operations.md) | 联合看连接、锁、I/O、复制延迟与业务指标 |

## 本地实验：先验证一个库存表

下面的容器只用于本机练习，使用随机 root 密码，数据留在该容器中。名字已存在时换一个名字，不要删掉未知实例。先确保 Docker 正常运行，再启动 MySQL；镜像 `8.4` 会跟随该系列更新，团队复现实验时应进一步固定小版本或镜像摘要。

```bash
docker run --name blog-mysql-demo \
  -e MYSQL_RANDOM_ROOT_PASSWORD=yes \
  -e MYSQL_DATABASE=shop_demo \
  -p 127.0.0.1:13306:3306 \
  -d mysql:8.4

# 等待 ready for connections；日志包含这个练习实例的生成密码
docker logs blog-mysql-demo

# 在密码提示中输入生成密码，不把密码拼进命令行
docker exec -it blog-mysql-demo mysql -uroot -p shop_demo
```

这里在容器内通过本地连接进入数据库。如果使用主机上安装的客户端，应显式指定 TCP：`mysql --protocol=TCP -h127.0.0.1 -P13306 -uroot -p shop_demo`。`localhost` 在 Unix 客户端中通常选择本地 socket，可能连到另一实例。生产应用应使用专用账号与受控网络，不沿用练习用 root。

```sql
SELECT VERSION(), @@default_storage_engine, @@transaction_isolation;

CREATE TABLE inventory (
    sku_id BIGINT UNSIGNED PRIMARY KEY,
    available INT NOT NULL,
    CONSTRAINT ck_inventory_nonnegative CHECK (available >= 0)
) ENGINE=InnoDB;

INSERT INTO inventory (sku_id, available) VALUES (101, 5);

START TRANSACTION;
UPDATE inventory
SET available = available - 2
WHERE sku_id = 101 AND available >= 2;
SELECT ROW_COUNT() AS affected_rows;
ROLLBACK;

SELECT available FROM inventory WHERE sku_id = 101;
```

这次更新应影响 1 行，回滚后库存仍为 5。将数量改为 6 时，更新影响 0 行，表示没有满足条件的库存记录；它不是 SQL 执行错误。真实下单流程必须验证数量为正整数、检查更新行数，并把订单写入放在同一事务里，任一步失败就回滚。`CHECK` 只是防止库内出现负库存，不能阻止“减去负数”意外增加库存。

重试还需要业务幂等键：超时可能发生在提交之后，直接重放扣减会重复扣库存。唯一订单号或请求号可以帮助识别已完成的业务请求，但必须与订单状态、事务处理一起设计，不能只给某列加唯一索引就宣称整个流程幂等。

## 查询快慢要看访问路径

订单列表常见条件是“某个买家的已支付订单，按创建时间倒序取 20 条”。通常先评估 `(buyer_id, status, created_at, id)` 这样的联合索引，再用真实数据分布检验；它不是所有订单查询的通用索引。大结果集、低选择性条件和分页位置都会改变代价。

对上面的库存主键查询，可先看计划：

```sql
EXPLAIN SELECT available FROM inventory WHERE sku_id = 101;
EXPLAIN ANALYZE SELECT available FROM inventory WHERE sku_id = 101;
```

`EXPLAIN` 给出估算计划，`EXPLAIN ANALYZE` 会实际执行查询并报告节点耗时、行数和循环次数。这里仅使用只读 SELECT；对线上大查询仍需评估执行成本。索引存在不代表一定被选中，统计信息、表大小和返回行数都影响优化器判断。

## 事务、日志和备份分别保护什么

InnoDB 用锁与 MVCC 协调并发，undo 支持回滚及一致性读取，redo 支持崩溃恢复。服务层的 binlog 用于复制和时间点恢复。redo 不是业务历史归档，binlog 也不能单独重建缺少初始状态的整库。

提交确认与日志落盘策略有关。`innodb_flush_log_at_trx_commit=1`、`sync_binlog=1` 是常见的耐久性基线，但仍依赖操作系统和存储正确兑现刷盘；改为较弱策略可能在断电或崩溃时损失已确认事务。不要为了压测数字，把弱持久性配置写成无条件优化建议。

恢复验收应在独立实例导入备份，再按目标位点重放保留的 binlog，核对订单数、关键业务键、金额和恢复耗时。复制延迟、磁盘故障与误操作需要不同措施；定期演练才能知道备份是否真的可用。

## 排查闭环

| 现象 | 先确认什么 | 后续动作 |
| --- | --- | --- |
| 应用拿不到连接 | 应用池等待、活跃连接、请求是否泄漏 | 修复连接释放和慢事务，再评估池大小与连接上限 |
| 相同 SQL 偶发很慢 | 是否等锁、I/O 抖动、连接排队 | 按时间窗口关联会话、锁和系统指标 |
| 刚更新却查到旧值 | 查询是否去了从库、缓存或旧事务快照 | 明确读路由和事务边界，核对复制进度 |
| 更新返回成功却无库存变化 | 驱动异常、受影响行数和提交结果 | 区分条件不满足、事务回滚及结果未知 |
| 重启后记录缺失 | 连接实例、持久化目录、日志配置、故障时间 | 保留现场，在独立实例验证恢复路径 |

完成本专题的起点是能解释一次查询读了哪些数据、一次写入何时算成功，以及失败后如何验证结果，而不是记住一组固定的内存或连接数配置。
