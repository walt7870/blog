# MySQL 索引系统

索引决定查询按什么顺序找到记录，以及为此需要读取多少数据。订单表有一千万行时，“某买家最近 20 笔已支付订单”不应先读完所有订单再排序；但索引也要占空间，并在写入时维护。本页以 MySQL 8.4、InnoDB 为基线，用一条订单列表查询解释访问路径、覆盖与回表。

## 聚簇索引与二级索引

InnoDB 的聚簇索引叶子记录保存行数据，二级索引记录保存索引列和主键列。通过二级索引找到主键后，再去聚簇索引取其他列，称为回表。如果需要的列已在选用索引中，通常可以走覆盖访问，减少回表；这不等于所有并发、可见性或锁定读取下都完全不访问聚簇记录。

![订单联合索引的覆盖读取与回表](/database/mysql-index-order-path.svg)

图中联合键按 `(buyer_id, status, created_at, id)` 排序。固定买家 10 和状态 `paid` 后，符合条件的记录位于同一个连续范围；反向扫描即可按时间、编号降序返回 5、3。选择 `id, created_at` 可以覆盖；再取 `amount` 时需要读取对应的行。

B+ 树把键组织在页中，内部页导航，叶子页按键顺序连接。一次点查主要沿树高访问，范围查询还要计入扫描记录、过滤和输出的代价，不能全部写成 O(log n)。页在文件中不必连续，页内逻辑键顺序也不表示整行在磁盘上始终连续排列。

有主键时以主键组织聚簇索引；没有主键时，会选所有列均非空的第一个合适唯一索引；再没有才生成隐藏的 6 字节行标识。明确、稳定且较短的主键便于关联和维护，也能减少二级索引携带主键的空间。主键查询同样可能读很多行，并非任何查询都“主键最快”。

## 可运行示例：买家的订单列表

在本地实验实例中建立独立练习库，连接方式见 [MySQL 总览](./index.md)。以下小数据用于核对结果与索引语义，不用于推断生产性能。

```sql
CREATE DATABASE index_demo CHARACTER SET utf8mb4;
USE index_demo;

CREATE TABLE orders (
    id BIGINT UNSIGNED PRIMARY KEY,
    buyer_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(16) NOT NULL,
    created_at DATETIME NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    INDEX idx_buyer_status_time (buyer_id, status, created_at, id)
) ENGINE=InnoDB;

INSERT INTO orders VALUES
    (1, 10, 'paid',   '2026-01-01 10:01:00', 20.00),
    (2, 10, 'unpaid', '2026-01-01 10:02:00', 30.00),
    (3, 10, 'paid',   '2026-01-01 10:03:00', 40.00),
    (4, 20, 'paid',   '2026-01-01 10:04:00', 50.00),
    (5, 10, 'paid',   '2026-01-01 10:05:00', 60.00);

SELECT id, created_at
FROM orders
WHERE buyer_id = 10 AND status = 'paid'
ORDER BY created_at DESC, id DESC
LIMIT 2;

EXPLAIN SELECT id, created_at
FROM orders
WHERE buyer_id = 10 AND status = 'paid'
ORDER BY created_at DESC, id DESC
LIMIT 2;

EXPLAIN ANALYZE SELECT id, created_at, amount
FROM orders
WHERE buyer_id = 10 AND status = 'paid'
ORDER BY created_at DESC, id DESC
LIMIT 2;
```

结果先是订单 5，再是 3。`id` 为时间相同时提供确定顺序，避免只按非唯一时间排序导致分页重复或遗漏。`EXPLAIN` 的 `key`、`rows` 和 `Extra` 分别帮助看选用索引、估算行数和额外操作；`Using index` 通常表示覆盖访问，`Using index condition` 表示索引条件下推，两者不是同一件事。`EXPLAIN ANALYZE` 会实际执行 SELECT，应在可控负载下使用。

## 联合索引为什么有最左前缀

联合索引按键的字典序组织，不是把多列各自排序。对 `(a,b,c)`，`a=1 AND b=2` 能限定一个较窄范围；`a=1 AND c=3` 通常先限定 a 的范围，再过滤 c，不能直接把所有 c=3 的记录当作连续区间。SQL 中条件书写顺序不必与索引列顺序相同。

| 条件与需求 | 需要判断的访问边界 |
| --- | --- |
| `a=1 AND b=2 ORDER BY c` | 固定前两列后，后续键顺序可能满足排序 |
| `a=1 AND b>2 AND c=3` | b 范围之后，c 不一定继续缩小同一个连续扫描区间，但仍可能用于过滤或覆盖 |
| 只有 `b=2` | 缺少 a 时不能按普通最左前缀直接定位；可能选择全索引扫描、表扫描或满足条件的 Skip Scan |
| 多个索引列组成 OR | 可能采用 Index Merge，也可能扫描；以计划和数据分布为准 |
| 前缀固定但返回大部分行 | 回表成本可能让扫描更便宜；被选中与能使用是两回事 |

列顺序需要同时考虑等值条件、范围、排序、复用查询和数据分布。例如订单查询已固定买家和状态，即使状态只有几个取值，放在时间范围前仍可能有价值。不能机械套用“选择性最高永远放第一”或“范围列永远最后”。

深分页还要计入跳过行的成本。拿到上一页最后的时间与编号后，可以限定下一页起点：

```sql
USE index_demo;
SELECT id, created_at
FROM orders
WHERE buyer_id = 10 AND status = 'paid'
  AND (created_at < '2026-01-01 10:05:00'
       OR (created_at = '2026-01-01 10:05:00' AND id < 5))
ORDER BY created_at DESC, id DESC
LIMIT 2;
```

此时返回 3、1。游标与排序方向、查询条件必须一致；这不等于跨请求持有数据库快照，期间记录的插入、删除或排序字段更新仍会改变可见集合。是否使用游标分页取决于业务是否需要跳到任意页和固定快照。

## 唯一、前缀与特殊索引

唯一索引用于约束业务键，但 MySQL 唯一索引允许多个 NULL；联合唯一键包含 NULL 时，也不能按“所有列值都唯一”理解。用户名、请求号等必须存在的业务标识应同时使用 `NOT NULL`，并明确大小写与排序规则。

```sql
USE index_demo;
CREATE TABLE contacts (
    id INT PRIMARY KEY,
    email VARCHAR(128) NULL,
    UNIQUE KEY uk_email (email)
) ENGINE=InnoDB;
INSERT INTO contacts VALUES (1, NULL), (2, NULL), (3, 'a@example.test');
SELECT COUNT(*) FROM contacts WHERE email IS NULL;
```

查询返回 2。再次写入相同非空邮箱会触发唯一约束；在不区分大小写的排序规则下，大小写变体也可能冲突。`UNIQUE(name(10))` 只对前十个字符约束，可能拒绝完整名称不同但前缀相同的记录，不应冒充整列精确唯一性。

| 索引形式 | 适用入口与限制 |
| --- | --- |
| 普通 B+ 树索引 | 等值、范围和有序访问；写入需要维护各棵相关树 |
| 字符串前缀索引 | 减少长键空间，但不能完整覆盖原长字符串，也不保证满足整列排序 |
| 函数索引 / 生成列索引 | 可索引受支持表达式；查询表达式、类型与排序规则必须匹配 |
| FULLTEXT | 按分词和相关性检索；分词器、停用词和词长影响结果，不等于子串匹配 |
| SPATIAL | 空间候选过滤；坐标参考系、空间谓词和精确判断仍需核对 |
| MEMORY 的 HASH | 等值查找；不提供范围和排序访问，不能据此推导 InnoDB 普通索引也是哈希 |

MySQL 8.4 没有通用的 `CREATE INDEX ... WHERE status='active'` 部分索引语法。生成列可以辅助表达条件约束，但不会因此得到 PostgreSQL 式的通用行子集索引。字符串索引长度限制要按引擎、行格式、页大小与字符集计算；默认 16KB 页的 InnoDB DYNAMIC 常见上限为 3072 字节，不是 3072 个中文字符。

## 不把所有变化都叫索引失效

普通索引列上套函数，通常无法直接按原始键形成对应范围；可改成半开时间范围，或在适合时设计匹配的函数索引。数字列与数字字符串比较可能完成常量转换，而字符串列与数字比较可能破坏预期的访问及相等语义，不能不看类型就说“引号导致失效”。参数类型应与列保持一致。

`NOT`、`!=`、`OR` 和前导通配符也不是索引被永久关闭。优化器可能选择范围、Index Merge 或覆盖索引扫描，只是未必能缩小到很少的数据。将 OR 改成 UNION 时还要核对重复行、排序、LIMIT 和 NULL 语义，不能只比较耗时就认定等价。

## 维护与验收

先保留代表性参数、结果集、扫描行数、延迟分位数与写入负载，再增加或调整索引。变更后除了查询是否变快，还要比较写入延迟、空间、Buffer Pool 压力和复制延迟；建索引本身也可能消耗大量 I/O，并在元数据锁阶段等待或阻塞请求。

确认某索引没有使用，需要覆盖完整业务周期与读写实例，不能只看重启后的短窗口。可先评估不可见索引进行回退演练，但唯一约束仍会执行，索引仍有维护成本，也不能借此隐藏主键。`ANALYZE TABLE`、重建或删除索引均应结合影响窗口，不安排无依据的定期重建。

验收时用真实规模与分布比较计划估算和实际行数，再确认查询结果、稳定排序及并发业务语义没有变化。慢 SQL 的完整定位见 [查询优化](./query-optimization.md)，锁定读和索引范围的关系见 [事务机制](./transaction-system.md)。
