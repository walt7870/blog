# MySQL 存储引擎

存储引擎决定表怎样保存记录、组织索引，以及并发和故障时怎样读取、回滚和恢复。MySQL 的 SQL 服务层可以访问不同引擎，但相同的 `START TRANSACTION`、`UPDATE`、`ROLLBACK`，对非事务表不会产生与 InnoDB 相同的保证。

本页以 MySQL 8.4 的独立服务端为范围。交易表通常从 InnoDB 开始；选择其他引擎，需要说明它解决的具体限制，以及放弃了哪些事务和恢复能力，而不能只凭“读多写少”或“小表”决定。

## 引擎如何承接 SQL

![事务表与非事务表的回滚边界](/database/mysql-engine-rollback.svg)

图中同一会话先后修改两张表。InnoDB 的修改可以回滚，MyISAM 的修改已经生效；将两种引擎放在同一个 SQL 事务块里，并不能把它们变成一个原子业务单元。订单写入使用 InnoDB，而关键审计记录使用非事务表时，就可能留下“订单未成功但审计已写入”的局部结果。

## InnoDB：记录、版本与恢复

InnoDB 聚簇索引保存行数据，二级索引携带主键；详细的定位与回表路径见 [索引系统](./index-system.md)。数据页进入 Buffer Pool 后，读取不一定触发磁盘 I/O，更新先产生内存脏页，再按日志与刷页策略持久化。

| 机制 | 负责的工作 | 需要保留的边界 |
| --- | --- | --- |
| 锁与 MVCC | 协调并发修改和一致性读取 | 普通快照读、锁定读和更新的行为不同 |
| undo | 回滚修改，按版本链重建可见记录 | 长事务会延长旧版本保留时间 |
| redo | 在崩溃恢复时重放必要的页修改 | 不能代替历史备份或业务审计 |
| doublewrite | 为数据页的部分写入故障提供恢复保护 | 不等于 redo，也不能独自证明提交耐久性 |
| 表空间与后台线程 | 管理页、checkpoint、刷脏与 purge | 文件删除、直接复制与任意改参数不能代替引擎维护 |

InnoDB 行记录包含事务 ID 和回滚指针等信息，沿 undo 链寻找满足 Read View 的版本；不是每行都有一组“创建版本号、删除版本号”字段。默认 REPEATABLE READ 的普通一致性读取通常由首次一致性读建立快照，READ COMMITTED 则通常逐语句建立新快照，不能统一说成“事务开始时的快照”。

持有记录 X 锁会阻塞冲突的锁定读或写，但普通一致性 SELECT 往往仍能读取可见的已提交版本。锁在索引记录和范围上生效，范围与隔离级别、访问路径及语句有关；没有合适索引也可能扩大扫描与锁的影响面，见 [事务机制](./transaction-system.md)。

binlog 属于 MySQL 服务层，用于复制和时间点恢复，不是 InnoDB 独有的引擎日志。启用 binlog 时，事务提交需要协调服务层与引擎状态。应用正确性还取决于约束、业务校验和事务边界，不能把“一致性”全部归给某一个日志或触发器。

## 实验：同一事务块中的不同结果

使用 [总览中的本地容器](./index.md) 建立独立练习库。这里有意混用引擎来展示失败方式，不用于业务表设计。

```sql
CREATE DATABASE engine_demo;
USE engine_demo;

CREATE TABLE transactional_counter (
    id INT PRIMARY KEY,
    value INT NOT NULL
) ENGINE=InnoDB;
CREATE TABLE nontransactional_counter (
    id INT PRIMARY KEY,
    value INT NOT NULL
) ENGINE=MyISAM;

INSERT INTO transactional_counter VALUES (1, 10);
INSERT INTO nontransactional_counter VALUES (1, 10);

START TRANSACTION;
UPDATE transactional_counter SET value = 9 WHERE id = 1;
UPDATE nontransactional_counter SET value = 9 WHERE id = 1;
ROLLBACK;

SELECT value FROM transactional_counter WHERE id = 1;
SELECT value FROM nontransactional_counter WHERE id = 1;
```

结果分别是 10 和 9，客户端还可能报告非事务表不能完全回滚的警告。生产程序不能只检查 `ROLLBACK` 是否返回成功，就推断业务数据全部恢复。跨不同数据库服务更不会因使用相同引擎就自动得到本地事务，需要另行设计业务补偿或分布式事务边界。

## 其他引擎的适用边界

| 引擎 | 可以解决的问题 | 选择前要确认 |
| --- | --- | --- |
| MyISAM | 兼容历史非事务表与特定存储需求 | 表锁、无事务回滚、崩溃修复成本；不因 COUNT 快就迁移交易表 |
| MEMORY | 可丢失且可重建的内存查找表 | 重启清空数据、表锁、容量限制、无事务回滚 |
| ARCHIVE | 特定压缩归档读写场景 | 操作和索引能力受限，不是备份或合规保留制度的替代品 |
| CSV | 受限的 CSV 表访问与数据交换 | 类型、索引和并发限制，普通导入导出未必需要换引擎 |
| FEDERATED | 通过表映射访问远程 MySQL | 是否启用、远端权限、网络失败与非本地事务边界 |

可用性与能力以当前发行版及构建为准，使用 `SHOW ENGINES` 检查。MySQL NDB Cluster 是另一套集群部署与引擎体系，不能把本机普通 MySQL 的安装与调参直接当作 NDB 集群方案。

MyISAM 维护表的行数，无 WHERE 的单表 `COUNT(*)` 可以利用该统计；有过滤条件不能由一个总行数直接得出结果。这也不表示在受正常锁保护的查询中计数“因为并发所以随便不准确”。MySQL 8 使用事务数据字典管理元数据，不能照搬旧版 `.frm` 文件说明；MyISAM 数据和索引仍分别对应 `.MYD`、`.MYI`。

MEMORY 默认支持 HASH 等值访问，也可显式建立 BTREE 以支持范围访问。用户建立的 MEMORY 表不等于优化器使用的内部临时表；超出容量时不能假定自动转成磁盘表。MySQL 8.4 的内部临时表常用 TempTable，并有自己的内存与落盘机制。MEMORY 不支持 BLOB/TEXT，且变长字符列的内存表示也需要评估，不能按磁盘 VARCHAR 的直觉估容量。

## 验证 MEMORY 的生命周期

下面在同一练习库建立可重建的查找表：

```sql
USE engine_demo;
CREATE TABLE scratch_lookup (
    id INT PRIMARY KEY,
    value INT NOT NULL,
    KEY idx_value USING BTREE (value)
) ENGINE=MEMORY;
INSERT INTO scratch_lookup VALUES (1, 10), (2, 20);
SELECT COUNT(*) FROM scratch_lookup;
SHOW ENGINES;
```

第一次计数为 2。只对自己的练习容器重启服务：

```bash
docker restart blog-mysql-demo
docker exec -it blog-mysql-demo mysql -uroot -p engine_demo
```

等待服务恢复后再次查询：

```sql
USE engine_demo;
SELECT COUNT(*) FROM scratch_lookup;
SELECT value FROM transactional_counter WHERE id = 1;
```

MEMORY 表结构仍存在，但记录数为 0；InnoDB 计数记录仍为 10。应用如果依赖内存表，必须在恢复后重新加载并控制未就绪时的读取，不能把唯一配置副本、库存或不可重建会话放进去。

## 表空间、迁移与运维

InnoDB 的独立表空间通常为每表一个 `.ibd`，还存在系统、通用、undo 和临时表空间。MySQL 8 的数据字典与 undo 组织不同于早期版本，不能笼统说成“都在 ibdata1”。直接复制运行中的 `.ibd` 也不是可靠备份，需要受支持的一致备份、可传输表空间流程或逻辑导出。

修改 `innodb_file_per_table` 不会自动迁移已存在的表。执行 `ALTER TABLE ... ENGINE=InnoDB` 可能重建表并产生空间、I/O、元数据锁和复制压力，应先在备份还原的副本上验证：行数与业务校验、字段默认值、唯一/外键约束、全文与空间行为、应用查询和写入都需要覆盖。非事务历史表没有的数据保证，不能靠一个 ALTER 补回过去丢失的信息。

评估性能时保持数据分布、并发、索引、内存和持久性策略可比。InnoDB 的 Buffer Pool 应按实例实际内存预算、容器限制及其他进程占用设置；redo 容量在 8.4 以 `innodb_redo_log_capacity` 管理。降低刷盘强度会改变故障丢失窗口，不是免费的性能收益。

验收应包含正常查询、并发更新、事务回滚和服务重启后的数据检查。真实断电恢复、备份还原与跨节点故障，需要另外设计可重复演练；正常重启实验不能替代这些验收。具体流程见 [备份与恢复](./backup-recovery.md) 和 [监控与运维](./monitoring-operations.md)。
