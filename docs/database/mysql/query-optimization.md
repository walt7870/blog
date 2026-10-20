# MySQL 查询优化

订单列表只显示 20 笔订单，数据库却可能先读取几十万行、展开商品和包裹，再排序取 20 行。也可能数据库执行只需几毫秒，时间实际花在连接池等待或网络传输。优化要先确定慢在哪里，再减少真正多做的工作；把 SQL 改短、把 JOIN 改成子查询，都不能单独证明变快。

本文以 MySQL 8.4、InnoDB 为基线，围绕“买家订单分页与明细统计”建立可运行的小例子。小数据用于核对等价性和计划入口，性能结论仍需代表性的规模、分布、并发与参数。索引的物理结构见[索引系统](./index-system.md)，锁与快照见[事务系统](./transaction-system.md)，长期监控见[监控与运维](./monitoring-operations.md)。

## 先固定查询的合同

“买家 7 在十月创建的订单，按创建时间和编号倒序，每页两笔，每笔附商品金额及包裹数”包含几个不可随意改变的条件：月份必须有年份边界，分页单位是订单，时间相同时仍有确定顺序，没有商品或包裹的订单也要保留。

![订单先分页、明细分别聚合，避免商品与包裹交叉放大](/database/mysql-query-cardinality.svg)

图中的订单 103 有两条商品明细和两个包裹。如果直接关联这两个一对多集合，会得到四行；此时 `SUM(商品金额)` 会重复累计。错误结果跑得再快，也不是可用的优化方案。

在本地独立实例初始化练习数据：

```sql
CREATE DATABASE query_demo;
USE query_demo;
CREATE TABLE orders (
    id BIGINT UNSIGNED PRIMARY KEY,
    buyer_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL,
    amount DECIMAL(12,2) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE order_items (
    id BIGINT UNSIGNED PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    INDEX idx_order (order_id)
) ENGINE=InnoDB;
CREATE TABLE shipments (
    id BIGINT UNSIGNED PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    INDEX idx_order (order_id)
) ENGINE=InnoDB;
INSERT INTO orders VALUES
    (101,7,'2026-10-01 09:00:00',10.00),
    (102,7,'2026-10-02 10:00:00',30.00),
    (103,7,'2026-10-02 10:00:00',50.00),
    (104,7,'2026-10-03 11:00:00',39.90),
    (105,8,'2026-10-04 12:00:00',90.00),
    (106,7,'2026-11-01 00:00:00',70.00),
    (107,7,'2026-09-30 23:59:59',80.00);
INSERT INTO order_items VALUES
    (1,101,1,10.00),(2,103,1,20.00),(3,103,1,30.00);
INSERT INTO shipments VALUES (1,103),(2,103);
```

练习特意保留相同时间、跨月边界、另一个买家以及零明细订单，用来抓住改写造成的遗漏、重复和跨用户读取。实际评测还应加入热门买家、冷门买家、不同时间跨度和极大订单，不能只测一个恰好有利的参数。

## 用计划确认访问路径

先记录原查询与估算计划：

```sql
USE query_demo;
SELECT id, created_at, amount
FROM orders
WHERE buyer_id=7
  AND YEAR(created_at)=2026 AND MONTH(created_at)=10
ORDER BY created_at DESC, id DESC
LIMIT 2;

EXPLAIN FORMAT=TREE
SELECT id, created_at, amount
FROM orders
WHERE buyer_id=7
  AND YEAR(created_at)=2026 AND MONTH(created_at)=10
ORDER BY created_at DESC, id DESC
LIMIT 2;
```

结果应是 104、103。`YEAR/MONTH` 包住普通时间列，不利于直接按原始时间索引形成范围；改为半开区间，并为买家、时间和稳定排序键建立联合索引：

```sql
USE query_demo;
CREATE INDEX idx_buyer_time ON orders (buyer_id, created_at, id);
ANALYZE TABLE orders;

SELECT id, created_at, amount
FROM orders
WHERE buyer_id=7
  AND created_at >= '2026-10-01' AND created_at < '2026-11-01'
ORDER BY created_at DESC, id DESC
LIMIT 2;

EXPLAIN FORMAT=JSON
SELECT id, created_at, amount
FROM orders
WHERE buyer_id=7
  AND created_at >= '2026-10-01' AND created_at < '2026-11-01'
ORDER BY created_at DESC, id DESC
LIMIT 2;

EXPLAIN ANALYZE FORMAT=TREE
SELECT id, created_at, amount
FROM orders
WHERE buyer_id=7
  AND created_at >= '2026-10-01' AND created_at < '2026-11-01'
ORDER BY created_at DESC, id DESC
LIMIT 2;
```

日期改写与原条件在此 DATETIME 数据合同下等价，并包含 10 月 31 日的任意合法时间精度。涉及 TIMESTAMP、业务时区和夏令时，先把边界换算到约定的存储/连接时区，不能直接套用同一组字面量。

优化器根据统计信息估算候选计划的成本，不承诺寻找数学上的全局最优，更不是在执行前测试所有方案。成本值不是毫秒。小表可能仍选扫描；索引“能用”和“本次被选用”是两件事，不能要求七行表必须展现大库的收益。

| 观察入口 | 应当如何解释 |
| --- | --- |
| `key` / 访问节点 | 本次采用的索引与查找方式，候选 `possible_keys` 不等于实际采用 |
| 估算 `rows` / `filtered` | 按统计信息估计访问与过滤量，不是精确计数 |
| `actual rows` / `loops` | 实际迭代器输出与执行次数；多循环时按每循环口径理解，估算总输出可结合两者 |
| `actual time=a..b` | 返回首行及完成该迭代器的时间，单位毫秒；多循环时是每循环平均，包含子节点耗时 |
| `Using filesort` | 需要额外排序，不代表必然写到磁盘 |
| `Using index` | 通常表示覆盖访问；与 `Using index condition` 的索引条件下推不同 |

不要把树中父子节点时间全部相加，它们有包含关系；计划计时也不包含应用端完整响应链。MySQL 8.4 的 `EXPLAIN ANALYZE` 使用 TREE，不支持 ANALYZE 的 JSON 格式，而且**会真正执行语句**。优先在隔离环境分析受控 SELECT；不能当成不会访问数据的纯静态检查。

传统 EXPLAIN 的查询块 `id` 不是通用执行时间轴，不能机械理解为“数字越大先跑”。判断连接算法使用 TREE 和实际计划；8.4 可采用嵌套循环或哈希连接，不把旧 BNL、排序合并连接或“并行索引快速全扫描”列成通用可选菜单。

## 分页需要稳定顺序与一致的过滤

上一页最后一笔是 `103 / 2026-10-02 10:00:00`，下一页按相同查询合同继续：

```sql
USE query_demo;
SELECT id, created_at, amount
FROM orders
WHERE buyer_id=7
  AND created_at >= '2026-10-01' AND created_at < '2026-11-01'
  AND (created_at < '2026-10-02 10:00:00'
       OR (created_at='2026-10-02 10:00:00' AND id<103))
ORDER BY created_at DESC, id DESC
LIMIT 2;
```

应返回 102、101；若只写 `created_at < 上页时间`，同一时刻的 102 就被遗漏。大 OFFSET 仍需跳过前面的候选记录，游标可以减少这部分工作，但不支持同样方便的任意页跳转，也不自动冻结跨请求快照。排序字段被修改、记录被删除或新订单插入时，产品需明确可见性要求。

如果还有“只看有已发货包裹的订单”，必须把这个过滤放入产生页面的候选集合，不能先取两笔任意订单，再在外层过滤。后者可能返回不足两笔，甚至一笔都没有。反之，仅用于展示的包裹详情，可以在选好订单页后再批量读取。

## 明细先分别聚合，再合并

下面是故意保留的错误计算，用于观察一对多关联的行数变化：

```sql
USE query_demo;
SELECT o.id, COUNT(i.id) AS item_count,
       SUM(i.quantity*i.unit_price) AS item_amount,
       COUNT(s.id) AS shipment_count
FROM orders o
LEFT JOIN order_items i ON i.order_id=o.id
LEFT JOIN shipments s ON s.order_id=o.id
WHERE o.id=103
GROUP BY o.id;
```

它返回商品数 4、商品金额 100.00、包裹数 4；实际应是 2、50.00、2。`COUNT(DISTINCT i.id)` 可以修正这一项计数，却不会顺带修正 SUM；`SUM(DISTINCT 金额)` 也不是补救，同价的两件商品仍应分别累计。

按页面订单分别汇总两个明细集合：

```sql
USE query_demo;
WITH page AS (
    SELECT id, created_at, amount
    FROM orders
    WHERE buyer_id=7
      AND created_at >= '2026-10-01' AND created_at < '2026-11-01'
    ORDER BY created_at DESC, id DESC
    LIMIT 2
), item_stats AS (
    SELECT i.order_id, COUNT(*) AS item_count,
           SUM(i.quantity*i.unit_price) AS item_amount
    FROM order_items i JOIN page p ON p.id=i.order_id
    GROUP BY i.order_id
), shipment_stats AS (
    SELECT s.order_id, COUNT(*) AS shipment_count
    FROM shipments s JOIN page p ON p.id=s.order_id
    GROUP BY s.order_id
)
SELECT p.id, p.amount,
       COALESCE(i.item_count,0) AS item_count,
       COALESCE(i.item_amount,0) AS item_amount,
       COALESCE(s.shipment_count,0) AS shipment_count
FROM page p
LEFT JOIN item_stats i ON i.order_id=p.id
LEFT JOIN shipment_stats s ON s.order_id=p.id
ORDER BY p.created_at DESC, p.id DESC;
```

结果仍是两笔订单：104 没有明细，三个统计值为 0；103 的商品数为 2、金额为 50.00、包裹数为 2。订单总额与商品金额是不同业务字段，优惠、运费等可能让两者不同，不应为了“对齐”而更新历史订单金额。

CTE 是表达结构的工具，不天然更快；是否合并、物化、如何访问子表，要继续看执行计划。实际接口也可先取页面 ID，再批量查询明细并按订单组装，避免逐订单发 N 次 SQL。多次查询若要求同一快照，应在同一连接的适当只读事务中完成；不能一边声称一致性、一边把查询分配到不同副本或连接。

## EXISTS、NULL 与聚合不能随意替换

只问“是否有商品明细”，使用 EXISTS 可以直接表达存在性，避免把订单复制成多行。优化器可能选择半连接等方案，相关子查询不必然逐行完整扫描；改成 JOIN 后再 DISTINCT 也不保证更便宜。

```sql
USE query_demo;
SELECT o.id
FROM orders o
WHERE o.buyer_id=7
  AND o.created_at >= '2026-10-01' AND o.created_at < '2026-11-01'
  AND EXISTS (SELECT 1 FROM order_items i WHERE i.order_id=o.id)
ORDER BY o.id DESC;

CREATE TABLE exclusions (order_id BIGINT UNSIGNED NULL);
INSERT INTO exclusions VALUES (103),(NULL);

SELECT id FROM orders
WHERE buyer_id=7
  AND created_at >= '2026-10-01' AND created_at < '2026-11-01'
  AND id NOT IN (SELECT order_id FROM exclusions);

SELECT o.id FROM orders o
WHERE o.buyer_id=7
  AND o.created_at >= '2026-10-01' AND o.created_at < '2026-11-01'
  AND NOT EXISTS (SELECT 1 FROM exclusions e WHERE e.order_id=o.id)
ORDER BY o.id DESC;
```

第一项返回 103、101。第二项因子查询含 NULL，不返回原本直觉认为“未排除”的订单；第三项按“没有相等排除记录”的合同返回 104、102、101。两种写法语义不同，不能不检查可空性就互换。

行条件放 WHERE，聚合结果条件放 HAVING。例如按天统计买家订单金额，筛出日合计大于 50 的日期：

```sql
USE query_demo;
SELECT DATE(created_at) AS order_day, SUM(amount) AS day_amount
FROM orders
WHERE buyer_id=7
  AND created_at >= '2026-10-01' AND created_at < '2026-11-01'
GROUP BY DATE(created_at)
HAVING SUM(amount)>50
ORDER BY order_day;
```

应返回 `2026-10-02 / 80.00`。把 HAVING 改成 `WHERE amount>50` 会丢掉当天 30 和 50 的两笔订单。按天/月聚合使用表达式本身不是错误，是否需要生成列、索引或预聚合表取决于访问成本。预聚合必须有完整回填、更新/删除补偿、重试幂等和对账，不能只创建 INSERT 触发器就当成可靠统计系统。

## 从慢查询收敛到证据

先在应用跟踪中区分连接池等待、数据库执行、结果传输与序列化，再按 SQL 模板和参数分布定位高成本请求。一次很慢和累计很贵都需要观察；单次 5 毫秒、每秒执行上万次的模板，也可能比偶发慢查询消耗更多资源。

Performance Schema 的摘要表可以作为定位入口：

```sql
SELECT SCHEMA_NAME, DIGEST_TEXT, COUNT_STAR,
       ROUND(SUM_TIMER_WAIT/1e12,3) AS total_seconds,
       ROUND(AVG_TIMER_WAIT/1e12,6) AS avg_seconds,
       ROUND(SUM_ROWS_EXAMINED/NULLIF(COUNT_STAR,0),1) AS avg_rows_examined,
       ROUND(SUM_ROWS_SENT/NULLIF(COUNT_STAR,0),1) AS avg_rows_sent
FROM performance_schema.events_statements_summary_by_digest
WHERE SCHEMA_NAME='query_demo'
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;
```

计时器按皮秒归一化，除以 `1e12` 才是秒，不能除以 `1e9` 后标成秒。摘要按模板聚合，计数有重启、重置与容量边界，不是天然的“最近一分钟”。应比较两个采样点的增量，并处理重启或重置；平均值也不能替代 P95/P99。未启用相关消费者或采集容量不足时，空表不证明没有慢请求。

慢日志用于保留实际慢 SQL，启用前核对采集开销、文件权限、轮转及敏感参数。修改全局 `long_query_time` 不会自动改写已有连接的会话值。`log_queries_not_using_indexes` 可能记录大量便宜的小表查询，不能无条件打开后把所有记录都算故障。具体配置与告警见[监控与运维](./monitoring-operations.md)。

## 索引、缓存和参数的取舍

联合索引需要同时满足过滤、排序和返回列，不能按“选择性最高永远放最前”机械排列。覆盖更多列能减少回表，也会增加空间、写放大和 Buffer Pool 压力。统计估算与实际行数偏差很大时，再检查数据倾斜、统计采样、直方图和参数代表性，不先用 FORCE INDEX 固定偶然有效的计划。

`OR`、`!=`、`NOT` 不是禁止词；BETWEEN 也不比等价的上下界天然更快。AND 条件书写顺序通常不决定扫描顺序；IN 与 EXISTS、INNER 与 LEFT JOIN 的选择首先由结果语义决定。LEFT JOIN 右表条件放 ON 或 WHERE，还可能改变零匹配订单的保留方式。

MySQL 8.4 已没有旧 Query Cache，不能再配置 `query_cache_size/type`；InnoDB Buffer Pool 缓存数据页，与缓存 SQL 结果不同。应用缓存要设计键中的租户/权限、更新失效、版本或过期、并发回填与故障时的限流。增加 L1/L2 也会增加陈旧读和失效传播问题，不能只比较命中时延。

排序、连接等缓冲可能按线程或操作分配，不能看见 filesort 就全局放大内存。`ANALYZE TABLE`、建索引和重建表都有负载及锁影响，按实际证据安排窗口。生产优化每次改变一个主要因素，保留原参数、计划和结果样本，设置可回退的发布范围。

## 验收一项优化

先逐项核对新旧查询的结果、重复行、NULL、稳定排序、分页边界与授权范围。此后在相同数据与参数分布、缓存状态、并发负载下比较多轮延迟分位数、扫描/返回比、锁等待及资源消耗；同时观察写入、复制延迟和内存峰值。

计划中出现索引、少一个排序节点或单次测量变快，都是局部证据。验收结论应说明测试规模与业务边界，不把“扫描行数减少”直接换算成固定吞吐提升或用户投诉下降。只有结果正确、开销改善且副作用可接受，才完成这次优化。
