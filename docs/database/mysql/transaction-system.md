# MySQL 事务处理机制

购买三件商品时，“订单已经创建，但库存没有扣减”是一个业务错误。事务把同一数据库中的相关变更放进一个提交单位；条件更新、约束和正确的错误分支保证业务规则，锁与版本控制处理并发。单纯写上 `START TRANSACTION` 和 `COMMIT`，不能让错误的扣库存逻辑自动变正确。以下以 MySQL 8.4 LTS、InnoDB 为范围。

## ACID 与业务边界

| 特性 | 在订单中的含义 | 仍需应用处理的部分 |
| --- | --- | --- |
| <span style="white-space:nowrap">原子性</span> | 订单写入与扣库存一起提交或一起撤销 | 捕获错误并回滚；不要把非事务引擎或隐式提交 DDL 混进来 |
| <span style="white-space:nowrap">一致性</span> | 不出现负库存、重复请求或无效引用 | 正数量、价格、状态迁移、影响行数和跨行不变量 |
| <span style="white-space:nowrap">隔离性</span> | 并发交易按选定的隔离与锁规则读取和修改 | 不把过期快照用于覆盖写入；处理等待、死锁和重试 |
| <span style="white-space:nowrap">持久性</span> | 提交记录按配置进入可恢复的持久化链路 | 日志同步策略、存储可靠性、备份、复制和故障演练 |

事务覆盖的是参与事务的数据库资源。发送邮件、调用支付接口和发布 Kafka 消息不会随着 MySQL 回滚自动撤销。需要可靠通知时，把订单与 outbox 记录在同一事务提交，再由投递器处理重试、确认与消费者幂等，见[事件驱动架构](../../design/architecture/event-driven-architecture.md)。

InnoDB 的原子性依赖 undo 等机制；隔离性由 MVCC 与锁共同实现。开启 binlog 时，内部协调让 InnoDB 的提交状态与 binlog 一致，这不能直接解释为“已经原子提交到所有外部系统”。持久化链路与[服务模块](./service-modules.md)对应，字段约束详见[数据类型设计](./data-types-design.md)。

## 一个可运行的扣库存事务

下面只在独立测试实例新建 `txn_demo`。库存有五件，请求编号是幂等识别键，订单和库存均为 InnoDB。这里用存储过程让错误分支完整可执行；应用实现时也要在同一连接上执行开始、写入、提交和回滚。

```sql
CREATE DATABASE txn_demo CHARACTER SET utf8mb4;
USE txn_demo;
CREATE TABLE inventory (
    sku_id BIGINT UNSIGNED PRIMARY KEY,
    available INT NOT NULL,
    version INT UNSIGNED NOT NULL DEFAULT 0,
    CONSTRAINT chk_available CHECK (available >= 0)
) ENGINE=InnoDB;
CREATE TABLE reservations (
    request_id VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    sku_id BIGINT UNSIGNED NOT NULL,
    quantity INT NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT chk_quantity CHECK (quantity > 0),
    CONSTRAINT fk_reservation_sku FOREIGN KEY (sku_id) REFERENCES inventory(sku_id)
) ENGINE=InnoDB;
INSERT INTO inventory (sku_id, available) VALUES (101, 5), (102, 5);
```

```sql
USE txn_demo;
DELIMITER //
CREATE PROCEDURE reserve_stock(IN p_request VARCHAR(40), IN p_quantity INT)
BEGIN
    DECLARE v_sku BIGINT UNSIGNED DEFAULT NULL;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    IF p_request IS NULL OR CHAR_LENGTH(TRIM(p_request)) = 0
       OR p_quantity IS NULL OR p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '请求编号和正数量不能为空';
    END IF;
    START TRANSACTION;
    SELECT sku_id INTO v_sku FROM inventory WHERE sku_id = 101 FOR UPDATE;
    IF v_sku IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SKU不存在';
    END IF;
    INSERT INTO reservations (request_id, sku_id, quantity)
    VALUES (p_request, 101, p_quantity);
    UPDATE inventory SET available = available - p_quantity, version = version + 1
    WHERE sku_id = 101 AND available >= p_quantity;
    IF ROW_COUNT() <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '库存不足';
    END IF;
    COMMIT;
END//
DELIMITER ;
```

该过程自己管理事务，必须作为独立业务调用，不嵌入调用方已经开启的事务。MySQL 没有普通的嵌套事务；再次 `START TRANSACTION` 会影响原事务边界，过程里的错误回滚也会作用于当前连接事务。正式服务还应校验请求编号格式、SKU、业务身份与数量上限。

先锁库存再插入引用它的预留，避免多个事务先因外键检查持有共享锁、随后一起升级为库存排他锁。多 SKU 时应按统一顺序逐项锁定，并让其他修改入口遵循相同顺序；这能减少死锁，仍需处理数据库返回的死锁错误。条件更新保留数量判断，不能因为前面加过锁就省略业务不变量。

```sql
CALL txn_demo.reserve_stock('R001', 3);
SELECT available FROM txn_demo.inventory WHERE sku_id = 101;
SELECT request_id, quantity FROM txn_demo.reservations ORDER BY request_id;
```

结果是库存 `2`，订单 `R001、3`。再请求四件必须报库存不足，并且不能留下第二笔预留记录；传负数必须在修改前拒绝，否则减去负数反而增加库存。不要先做普通查询判断库存、在查询之后无条件扣减，两个请求可能同时看到足量。

重复 `R001` 会触发唯一键冲突，当前事务回滚，不会再扣三件。应用接到重复键时应按请求编号查询已提交记录，比较 SKU、数量和请求归属，相同输入才返回原结果；同一个编号携带不同输入应报冲突。提交请求发送后连接断开，结果可能已提交，只是响应丢失，此时不能换编号直接重做。

## 快照读、当前读与隔离级别

![双会话中快照读与锁定读看到不同版本](/database/mysql-transaction-read-view.svg)

图中的初始库存为 `2`。RR 下，普通一致性读在首次读取时建立快照，而非一律在 `START TRANSACTION` 时建立。B 提交加一后，A 的普通查询仍返回 `2`；A 的 `FOR UPDATE` 读取可锁定的当前记录并返回 `3`。两种读取不能混为同一时点的数据，更不能认为“快照显示有两件，所以无条件写入一定安全”。

按顺序在两个独立连接中执行，不能把 A、B 代码贴进同一个连接。

**A，建立 RR 快照：**

```sql
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
START TRANSACTION;
SELECT available FROM txn_demo.inventory WHERE sku_id = 101;
```

**B，修改并提交：**

```sql
START TRANSACTION;
UPDATE txn_demo.inventory SET available = available + 1 WHERE sku_id = 101;
COMMIT;
```

**A，再次读取：**

```sql
SELECT available FROM txn_demo.inventory WHERE sku_id = 101;
SELECT available FROM txn_demo.inventory WHERE sku_id = 101 FOR UPDATE;
SELECT available FROM txn_demo.inventory WHERE sku_id = 101;
ROLLBACK;
```

A 的三次结果是 `2、3、2`：锁定读本身没有替换已有快照。若 A 自己修改了记录，后续一致性读也能看到自己的修改，因此不能再把所有结果解释为数据库某一历史时刻的完整副本。`START TRANSACTION WITH CONSISTENT SNAPSHOT` 可以在 RR 下显式提前建立一致性快照，但不能替代业务写入的并发控制。

| 隔离级别 | 普通读取行为 | 写入与选型边界 |
| --- | --- | --- |
| READ UNCOMMITTED | 可能读取未提交数据 | 不应因为报表“大概就行”而默认采用，脏读可能产生不存在的事实 |
| READ COMMITTED | 每次一致性读使用新的快照 | 同一事务两次统计可能不同；写操作仍要加锁与检查条件 |
| REPEATABLE READ | 通常复用首次一致性读建立的快照 | InnoDB 默认；锁定读和写入使用当前记录，范围锁另有规则 |
| SERIALIZABLE | 显式事务中的普通读通常转换为共享锁定读 | 冲突操作等待或失败；不是所有事务简单排成一个队列，也不能省掉错误处理 |

普通 RR 快照不因别人插入而增加可见行；范围锁定读则常用 next-key 锁阻止相应区间插入。不能据此宣称“RR 完全消除一切幻读和并发异常”，尤其是混合快照读、当前读、自己的写入以及跨多行规则时。隔离级别也不是按性能由快到慢的固定排行，需按实际访问模式验证。

MVCC 通过记录的事务信息和 undo 版本链寻找可见版本。Read View 需要区分创建时仍活跃的事务、已完成的旧事务和后来事务，不能仅用“事务编号不在活跃列表”判断所有版本可见。`DB_TRX_ID`、`DB_ROLL_PTR` 参与版本管理；没有合适聚簇键时才使用内部行编号，并非所有表都额外带一列可查询的 `DB_ROW_ID`。历史版本用于隔离和回滚，不是任意时间点查询或长期审计接口。

## 锁的作用范围与死锁

InnoDB 行锁实际锁定索引记录，也可能包含间隙；非唯一范围访问在 RR 下常有 next-key 锁。完整唯一键等值命中现存记录时通常只需记录锁，查不到时的范围和间隙行为要另看。缺少合适索引可能扫描、锁住更多记录，不能简单描述为“自动升级成表锁”：InnoDB 不会因行锁多就执行那种锁升级。

`FOR SHARE` 获取共享锁，`FOR UPDATE` 获取排他锁，均应放在需要持锁跨语句的显式事务中。行排他锁阻塞冲突的锁定读和写入，通常不阻塞 RC/RR 普通 MVCC 读取；元数据锁等其他等待仍可能让 SELECT 阻塞。表级 IS/IX 意向锁用来协调不同粒度的锁，并不意味着同表只能有一个事务修改记录。

可以在 A 锁住 SKU 101、B 锁住 SKU 102 后，让 A 更新 102、B 更新 101，形成等待环。启用死锁检测时 InnoDB 会选择一个事务整体回滚，受害者不是固定的 A 或 B。统一按 SKU 顺序锁定、缩短事务、改善索引可降低概率，但唯一键和外键检查也会参与锁竞争，不能保证从此没有死锁。

| 结果 | 默认需要注意的事务状态 | 应用动作 |
| --- | --- | --- |
| 普通重复键、约束错误 | 常见情形只撤销当前语句，之前修改仍在事务里 | 本业务整体失败时显式回滚，不继续误提交 |
| 锁等待超时 1205 | 默认通常回滚等待语句；`innodb_rollback_on_timeout` 会影响行为 | 明确回滚整个业务事务，再按政策有限重试 |
| 死锁 1213 | InnoDB 回滚整个受害事务 | 从业务事务起点重试，重新读取判断条件 |
| COMMIT 后断线 | 客户端可能不知道提交结果 | 按同一个幂等键核实，不能认定失败 |

重试要有次数上限、退避与抖动，并保证事务外副作用不会被重复执行。`NOWAIT` 用于冲突时立即失败，`SKIP LOCKED` 跳过已锁记录，适合任务队列竞争领取，但返回的是不完整视图，不应拿它计算完整库存或财务总额。需要有意撤销部分工作时可用 `SAVEPOINT` 与 `ROLLBACK TO SAVEPOINT`，这不等于嵌套提交，也不能假定释放了此前获得的所有锁。

## 日志、提交与恢复

undo 支持回滚与旧版本；redo 记录恢复所需的页变更，不是重新执行应用 SQL；binlog 记录服务层数据变更事件，在 ROW 格式下主要是行事件。WAL 要求相应 redo 在脏数据页落盘之前持久化，不意味着内存里修改页面前必须先完成一次磁盘同步。后台刷页与 checkpoint 推进可回收的日志范围，提交成功通常不要求所有脏页当场刷完。

`innodb_flush_log_at_trx_commit=1` 与 `sync_binlog=1` 是启用 binlog 时常用的持久性基线，仍依赖操作系统、文件系统和存储正确履行同步语义。设置为 0/2 或降低 binlog 同步频率会改变故障下的丢失窗口，不能称为无代价的“性能优化”，周期也不是严格的实时保证。doublewrite 解决的是数据页部分写入问题，不替代 redo、复制或备份。

```sql
SELECT @@innodb_flush_log_at_trx_commit, @@sync_binlog, @@log_bin,
       @@innodb_redo_log_capacity, @@innodb_doublewrite;
SHOW BINARY LOG STATUS;
```

8.4 用 `innodb_redo_log_capacity` 查看 redo 容量，binlog 状态用 `SHOW BINARY LOG STATUS`。`log_bin` 不能靠 `SET GLOBAL log_bin=ON` 临时开启。这里仅查看配置，不在教学查询里顺手降低全局持久性或重启数据库；备份恢复见[备份与恢复](./backup-recovery.md)，副本与主库故障切换见[高可用](./high-availability.md)。

## 排查长事务和等待

应用连接池空闲不等于事务已结束。异常后未回滚的连接重新入池，可能继续持锁，甚至把下一位调用者的 SQL 放进上一个事务。结束时必须明确提交或回滚，并恢复隔离级别、自动提交等会话状态。开启自动提交可能提交当前事务，不能把 `SET autocommit=1` 当无副作用的清理语句。

```sql
SELECT trx_id, trx_state, trx_started, trx_mysql_thread_id,
       trx_rows_locked, trx_rows_modified, trx_query
FROM information_schema.innodb_trx ORDER BY trx_started;

SELECT REQUESTING_ENGINE_TRANSACTION_ID, BLOCKING_ENGINE_TRANSACTION_ID,
       REQUESTING_THREAD_ID, BLOCKING_THREAD_ID
FROM performance_schema.data_lock_waits;

SELECT ENGINE_TRANSACTION_ID, OBJECT_SCHEMA, OBJECT_NAME, INDEX_NAME,
       LOCK_TYPE, LOCK_MODE, LOCK_STATUS, LOCK_DATA
FROM performance_schema.data_locks
WHERE OBJECT_SCHEMA = 'txn_demo';

SELECT NAME, COUNT FROM information_schema.innodb_metrics
WHERE NAME = 'trx_rseg_history_len';
SHOW ENGINE INNODB STATUS;
```

先把等待事务与阻塞事务对应起来，再看锁住的对象、索引和语句。Performance Schema 的线程编号不直接等于连接编号，需通过 `performance_schema.threads` 映射；阻塞连接可能已经执行完 SQL 而仍未提交，`trx_query` 为空不能证明没有影响。8.4 使用 `data_locks/data_lock_waits`，不使用已移除的 `INNODB_LOCKS/INNODB_LOCK_WAITS`。

长快照可能阻止 purge 清理仍被需要的旧版本，导致历史积累。History list length 不是“某行版本链长度”，更不是按固定阈值即可判定系统危险的通用指标；结合最老读视图、写入速度、undo 空间和 purge 进度判断。`Com_commit/(Com_commit+Com_rollback)` 只比较命令计数，不能当作包含自动提交、失败重试与业务结果的事务成功率。

验收时并发提交多笔各买一件的独立请求，确认不会超卖、预留总量与库存差相符；重复同一请求不能再扣库存。再分别复现 RC/RR 读取差异、行锁等待、1205 后事务状态、死锁整笔回滚、普通约束错误和响应丢失处理。正常提交后重新查询或正常重启，只证明相应路径可用，不能代替断电、日志损坏、主从切换与备份恢复演练。
