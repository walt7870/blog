# MySQL 分区表

分区把一张逻辑表的记录放进多个物理分区。应用仍查询同一张表，优化器先判断哪些分区可能有结果，再在这些分区内选择索引和扫描方式。它适合按时间淘汰日志、按明确边界管理大量历史记录；不能把一台 MySQL 自动变成多机分片系统，也不保证查询会并行执行或一定变快。以下以 MySQL 8.4 LTS、InnoDB 为范围。

例如客服只查某租户十月份的访问日志，按日期分区可以排除其他月份；如果客服只拿到一个请求编号，没有日期条件，就可能需要访问全部分区。分区解决的是访问范围与维护单位，分区内如何找记录仍取决于[索引](./index-system.md)。

## 日期边界与分区裁剪

![按月分区的边界、裁剪与删除后的下界变化](/database/mysql-partition-boundaries.svg)

`VALUES LESS THAN` 只定义上界，不根据分区名称推断月份。图中的 `p202610` 起初覆盖十月，是因为前一个分区的上界为十月一日。删除前一个分区后，它也能接收九月的迟到数据；名称没有变，实际范围已经变了。保留窗口要在写入入口验证，不能只靠定时删除分区。

下面是独立实验库，会新建表并删除其中的历史分区。只在本地测试实例按顺序执行，不要替换为生产库名。

```sql
CREATE DATABASE partition_demo CHARACTER SET utf8mb4;
USE partition_demo;

CREATE TABLE access_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    log_date DATE NOT NULL,
    tenant_id BIGINT UNSIGNED NOT NULL,
    message VARCHAR(200) NOT NULL,
    PRIMARY KEY (id, log_date),
    INDEX idx_tenant_date (tenant_id, log_date)
) ENGINE=InnoDB
PARTITION BY RANGE COLUMNS(log_date) (
    PARTITION p_before VALUES LESS THAN ('2026-10-01'),
    PARTITION p202610 VALUES LESS THAN ('2026-11-01'),
    PARTITION p202611 VALUES LESS THAN ('2026-12-01'),
    PARTITION p_future VALUES LESS THAN (MAXVALUE)
);

INSERT INTO access_logs (log_date, tenant_id, message) VALUES
('2026-09-30', 10, '旧日志'),
('2026-10-01', 10, '十月首日'),
('2026-10-31', 10, '十月末日'),
('2026-11-01', 10, '十一月首日'),
('2026-12-01', 10, '未来日志');

SELECT id, log_date FROM access_logs
WHERE tenant_id = 10
  AND log_date >= '2026-10-01' AND log_date < '2026-11-01'
ORDER BY log_date, id;
```

结果是编号 `2、3`，十一月一日不在范围内。日期时间字段也优先使用这种左闭右开范围，避免把一天的末尾写成 `23:59:59` 而漏掉小数秒。这里选择 `DATE` 是因为日志按业务日期保留；真实日志若同时需要精确发生时间，应另存约定时区的时间列，并明确从哪个时区计算分区日期。

```sql
EXPLAIN SELECT id, log_date FROM partition_demo.access_logs
WHERE tenant_id = 10
  AND log_date >= '2026-10-01' AND log_date < '2026-11-01';

EXPLAIN SELECT id, log_date FROM partition_demo.access_logs
WHERE tenant_id = 10;
```

8.4 直接查看 `EXPLAIN` 的 `partitions` 列，第一条只需 `p202610`，第二条会列出全部分区。分区裁剪与索引选择是两项判断：即使只剩一个分区，也可能在里面全扫描；小数据实验中的成本选择不能当作生产性能结论。

`MONTH(log_date) = 10` 表达“所有年份的十月”，不能随意改成“2026 年十月”并称为等价优化。先确认业务究竟要哪段时间，再检查计划；需要多个年份时保留原语义或明确列出相应范围。

## 提前创建与删除历史分区

已有 `MAXVALUE` 时，不能在它后面直接 `ADD PARTITION` 加一个有限上界。应拆开兜底分区，让其中已有的数据重新归位。

```sql
ALTER TABLE partition_demo.access_logs
REORGANIZE PARTITION p_future INTO (
    PARTITION p202612 VALUES LESS THAN ('2027-01-01'),
    PARTITION p_future VALUES LESS THAN (MAXVALUE)
);

SELECT id, log_date FROM partition_demo.access_logs PARTITION (p202612);

SELECT PARTITION_NAME, PARTITION_DESCRIPTION, TABLE_ROWS
FROM information_schema.PARTITIONS
WHERE TABLE_SCHEMA = 'partition_demo' AND TABLE_NAME = 'access_logs'
ORDER BY PARTITION_ORDINAL_POSITION;
```

十二月一日的编号 `5` 移入 `p202612`。`MAXVALUE` 能避免未来日期立刻写入失败，但也会掩盖漏建分区：应监控提前量、兜底分区是否积累数据，以及任务最近一次成功时间。`TABLE_ROWS` 对 InnoDB 是估算值，精确验收用限定范围的 `COUNT(*)`，并评估扫描成本。

删除分区会同时删除其中记录，属于 DDL，不能指望业务事务的 `ROLLBACK` 恢复。上线前先确认保留政策、归档是否可恢复、读写窗口、元数据锁等待和复制延迟。下面只删除实验表中的九月记录：

```sql
ALTER TABLE partition_demo.access_logs DROP PARTITION p_before;

SELECT COUNT(*) FROM partition_demo.access_logs WHERE id = 1;

START TRANSACTION;
INSERT INTO partition_demo.access_logs (id, log_date, tenant_id, message)
VALUES (6, '2026-09-30', 10, '模拟迟到日志');
SELECT id FROM partition_demo.access_logs PARTITION (p202610)
WHERE log_date < '2026-10-01';
ROLLBACK;
```

两个结果依次为 `0` 和 `6`：旧记录确实删除，但新的九月记录能进入现在的第一个分区。这里回滚的只是后面的插入，不是前面的删除分区。若业务不允许迟到记录，应拒绝、隔离或送到专门归档链路，不要让它重新进入在线保留区。

自动维护任务应先读取实际边界，以月首计算目标上界，在固定库表白名单中生成 DDL，重复运行时跳过已经存在的目标。多个执行器要互斥；失败要告警并保留当前边界，不能盲目重试删除。标识符不能像普通查询参数一样绑定，不应直接拼接外部传入的表名。分区 DDL 的锁和重建行为需按具体操作核验，不能统称为无锁或瞬间完成。

## 类型选择与限制

| 类型 | 分配规则与典型用途 | 容易误用之处 |
| --- | --- | --- |
| `RANGE` | 整数表达式的上界，如整数金额单位或年份 | 不能直接以 `DECIMAL` 表达式代替整数分区表达式 |
| `RANGE COLUMNS` | 直接比较整数、字符串、`DATE`、`DATETIME` 列；本例用日期 | 多列按元组比较，不是每列独立划一张网格 |
| `LIST` / `LIST COLUMNS` | 明确枚举的整数或受支持列值，如固定业务区域 | 未列出的值会失败；不要把 `ENUM` 列直接当作 `LIST` 整数表达式 |
| `HASH` | 对整数表达式取分布，如租户编号 | 同一热点租户仍落在一个分区，不保证请求负载均匀 |
| `KEY` | 使用 MySQL 内部哈希，支持范围比普通 HASH 更广的列类型 | 不用于时间段淘汰；空列列表要满足可用主键或非空唯一键等推导规则 |

子分区是在 RANGE/LIST 分区内再使用 HASH/KEY。只有在维护粒度和访问模式确有需求时才引入；分区总数、文件数、统计与 DDL 成本都会增加。不能把任意函数放进表达式，例如 `CRC32(region)` 不是可随意使用的 HASH 分区函数。8.4 普通非 NDB 表最多 8192 个分区（含子分区），这不是建议目标。

**每一个唯一键都必须包含分区表达式涉及的全部列**，主键也包括在内。本例主键是 `(id, log_date)`，同一 `id` 配不同日期不会被该主键拒绝；`AUTO_INCREMENT` 的正常分配不能替代全局唯一约束。给主键加日期以“让 DDL 通过”，可能已经改变订单号幂等或外部引用合同。需要单列全局唯一、外键和时间淘汰同时成立时，应先重新评估表结构或归档方案。

在此版本范围内，用户分区 InnoDB 表不能定义外键，也不能被其他 InnoDB 外键引用；不支持分区表的 FULLTEXT 索引，空间列也有限制。不要把普通表的功能清单照搬过来。分区规则还会受 SQL mode 影响，主从及维护任务应保持一致的规则环境，避免边界计算发生变化。

## 排查与验收

“没有可用分区”先查实际值和上界，尤其是未提前建未来分区、LIST 新增业务值、日期转换和时区问题。主键/唯一键错误先列出所有唯一键，逐一核对分区列，不要只检查主键。查询变慢时，对比有无时间条件的 `partitions`、实际扫描行数和索引，再判断是未裁剪、分区内访问差，还是分区过多导致维护成本。

维护后复核日期边界的前一条、第一条、最后一条和下一分区第一条；确认未来分区可写、兜底数据可见、迟到数据遵循保留政策。`ANALYZE TABLE` 更新统计，`CHECK TABLE` 检查表，不能把 `REPAIR TABLE` 当作 InnoDB 修复方案。备份与恢复流程见[备份与恢复](./backup-recovery.md)，涉及事务提交和回滚的行为见[事务系统](./transaction-system.md)。
