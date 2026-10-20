# 数据分层与指标口径

运营看到昨天有三笔已支付订单，财务导出的却只有两笔，未必是谁的 SQL 写错：一边数的是支付流水，一边查的是订单当前状态，还可能使用了不同的日期。数据分层首先要固定这些含义，再决定存几张表。把同一份数据复制到五个目录，并不会自动产生五层治理能力。

本页以订单变更生成日报为例，讲清原始记录、明细状态、公共汇总与应用报表之间的合同。存储和表格式的选型见[数据仓库与数据湖](./data-warehouse-lake.md)，分布式执行见 [Spark](./apache-spark.md)，持续到达的支付流水见 [Flink](./apache-flink.md)。

## 从七条变更到三笔订单

订单 102 从待支付变为已支付，支付后的版本被投递两次；订单 104 曾经支付，后来取消。原始接入共七条变更，按订单收敛后是四个当前状态，其中三笔仍为已支付。若直接筛原始记录的 `paid` 并累加，会同时计入重复版本和已经取消的旧状态。

![订单数据分层与发布边界](/bigdata/order-layer-contracts.svg)

这里的指标叫“截至输入截点，当前仍处于已支付状态的订单金额，按订单创建业务日归属”。金额是订单金额，既不是支付成功流水额，也不是扣除退款后的净收入。订单取消会改变历史创建日的结果；如果要看“当日发生了多少支付”，应另建支付事实表，而不是修改这个指标的名称。

| 层 | 本例一行代表什么 | 输入与输出合同 |
| --- | --- | --- |
| ODS 原始层 | 一次接收到的订单变更 | 保留原文、来源、接入批次及源位置；业务重复允许存在 |
| DWD 明细层 | 截点内一个租户的一张订单的最新状态 | 业务键唯一，版本可比较，同版本内容冲突阻断；保留取消状态 |
| DWS 汇总层 | 一个租户、一个订单业务日的已支付统计 | 先从最新状态筛选，再保存金额总和与订单数 |
| ADS 应用层 | 某报表版本下的一日指标 | 明确输入截点、口径版本与发布日期，读者只读取已发布版本 |

ODS、DWD、DWS、ADS 是常见命名约定，不是必须实现的行业标准。DIM 通常表示共享维度，DM 表示业务集市；APP、ADS 的含义要在团队内统一。小项目可以先用原始表、明细视图和报表视图，出现复用或成本问题后再物化。数据中台是组织和服务能力的安排，不能简单插成 DWD、DWS 之间的一层。

## 先确定粒度，再关联维度

一张订单可以买两件商品。订单头存 8,000 分，关联两行商品明细后，这个订单金额会出现两次。此时 `SUM(order_amount)` 得到 16,000 分，`COUNT(DISTINCT order_id)` 虽然能修订单数，却不能同时修金额。`SUM(DISTINCT order_amount)` 也不成立，因为两张订单可能恰好同价。

订单头事实使用 `(tenant_id, order_id)`；订单明细事实使用 `(tenant_id, order_id, line_id)`，保存每行的成交金额。按商品汇总要从明细事实出发，订单级优惠、运费和退款必须制定分摊与尾差规则，再核对“各明细分摊金额之和等于订单对应金额”。本页只处理订单头，不假装它能直接产出商品销量。

维度说明“按什么看”：客户、商品、门店、日期等。星型模型把常用属性放在各维度表，事实表关联这些维度；雪花模型进一步拆分类目、品牌等层级，减少重复，也增加查询关联。两者都不能代替粒度定义。历史销售按成交时的客户城市统计时，需要保留维度版本和有效区间；使用客户当前城市会把过去的销售重新归属。区间通常采用左闭右开，同一业务键的版本区间不能重叠，缺失维度进入明确的未知成员或待补状态。

## 可运行的本地分层练习

下面使用 SQLite 3.25 及以上的窗口函数演示逻辑合同，无需启动数据平台。它不提供 Spark、Hive 或湖表的生产 DDL。安装好 `sqlite3` 后在终端执行整个代码块，所有表只存在于本次内存数据库。`.bail on` 和质量断言会在异常时退出。

日期已由接入合同规范为上海时区的 `YYYY-MM-DD` 订单创建日，避免把接入日期当业务日期。生产环境还要校验原始时间、时区转换和日期合法性；本例的 SQL 长度检查不承担完整日期解析。版本为源系统为每张订单生成的递增整数，不使用接入时间猜先后。

```bash
sqlite3 ':memory:' <<'SQL'
.bail on
.headers on
.mode column
CREATE TABLE ods_order_change (
  event_no INTEGER PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  order_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  status TEXT NOT NULL,
  amount_cent INTEGER NOT NULL,
  business_day TEXT NOT NULL
);
INSERT INTO ods_order_change VALUES
  (1,'t1',101,1,'paid',     5000,'2026-10-19'),
  (2,'t1',102,1,'pending',  3000,'2026-10-19'),
  (3,'t1',102,2,'paid',     3000,'2026-10-19'),
  (4,'t1',102,2,'paid',     3000,'2026-10-19'),
  (5,'t1',103,1,'paid',     3990,'2026-10-20'),
  (6,'t1',104,1,'paid',     2000,'2026-10-19'),
  (7,'t1',104,2,'cancelled',2000,'2026-10-19');

-- 质量门禁先于版本收敛，不能让任意一条冲突记录获胜。
CREATE TEMP TABLE quality_gate (ok INTEGER NOT NULL CHECK (ok = 1));
INSERT INTO quality_gate
SELECT CASE WHEN COUNT(*) = 0 THEN 1 ELSE 0 END
FROM ods_order_change
WHERE trim(tenant_id) = '' OR order_id <= 0 OR version <= 0
   OR amount_cent < 0 OR typeof(amount_cent) <> 'integer'
   OR status NOT IN ('pending','paid','cancelled')
   OR length(business_day) <> 10;
INSERT INTO quality_gate
SELECT CASE WHEN COUNT(*) = 0 THEN 1 ELSE 0 END
FROM (
  SELECT tenant_id, order_id, version
  FROM ods_order_change
  GROUP BY tenant_id, order_id, version
  HAVING MIN(status) <> MAX(status)
      OR MIN(amount_cent) <> MAX(amount_cent)
      OR MIN(business_day) <> MAX(business_day)
);

CREATE TEMP VIEW dwd_order_current AS
SELECT tenant_id, order_id, version, status, amount_cent, business_day
FROM (
  SELECT *, ROW_NUMBER() OVER (
    PARTITION BY tenant_id, order_id
    ORDER BY version DESC, event_no DESC
  ) AS rn
  FROM ods_order_change
)
WHERE rn = 1;

CREATE TEMP VIEW dws_order_day AS
SELECT tenant_id, business_day,
       COUNT(*) AS paid_orders, SUM(amount_cent) AS paid_amount_cent
FROM dwd_order_current
WHERE status = 'paid'
GROUP BY tenant_id, business_day;

CREATE TEMP VIEW ads_order_day AS
SELECT *, ROUND(paid_amount_cent * 1.0 / paid_orders, 2) AS avg_cent
FROM dws_order_day;
SELECT * FROM ads_order_day ORDER BY tenant_id, business_day;
SELECT SUM(paid_orders) AS paid_orders,
       SUM(paid_amount_cent) AS amount_cent,
       ROUND(SUM(paid_amount_cent) * 1.0 / NULLIF(SUM(paid_orders),0),2)
         AS weighted_avg_cent
FROM dws_order_day;

INSERT INTO quality_gate
SELECT CASE WHEN (SELECT COUNT(*) FROM dwd_order_current) = 4
  AND (SELECT SUM(paid_orders) FROM dws_order_day) = 3
  AND (SELECT SUM(paid_amount_cent) FROM dws_order_day) = 11990
  THEN 1 ELSE 0 END;
SQL
```

预期 10 月 19 日为 2 单、8,000 分，20 日为 1 单、3,990 分；两日共 3 单、11,990 分，平均每单 3,996.67 分。两个日均值分别为 4,000 和 3,990，直接平均得到 3,995，已经改变了订单的权重。因此 DWS 保留可组合的分子、分母，跨日再计算比率。用户数去重、分位数等指标也不能直接把每天的最终值相加或平均，需要相应的集合或可合并状态。

可以在质量门禁之前增加一条 `102 v2 paid 3100` 的输入，确认同版本冲突导致非零退出；增加负金额也应失败，而不是变为零继续入仓。相同内容的重复版本可以再加一条，日报应保持不变。用全新内存库重跑会得到同一结果，这是本例的确定性验证；它不等于分布式写入或故障恢复验证。

这段练习把七条变更视为一个完整输入截点，每次都从头收敛。如果生产任务只读“今日接入分区”，它看不到昨日的最新版本，就不能直接替换整张当前状态表。增量处理必须将变更与已有状态按业务键和版本合并；低版本迟到不得覆盖高版本。源端删除用明确的删除事件或墓碑表达，保留版本以阻止旧记录复活，不能将“本批未出现”当作删除。

## 补数和发布：历史结果怎样改变

假设正式日报已经发布，随后订单 101 的 `v2 cancelled` 才到达。它属于新接入批次，但影响的是 10 月 19 日：该日从 2 单、8,000 分改为 1 单、3,000 分。只重算接入当天会漏修历史；对旧汇总简单再加一遍又会重复。

稳妥的批处理方式是记录本批受影响的业务键，合并前后状态，并取旧、新两侧涉及的业务日期作为重算范围。日期字段被纠正时，两天都要处理。按该范围从完整明细状态重新生成候选汇总，比散落在多处的加减补丁更容易核对。数据量很大而需要增量聚合时，也必须维护前后值和幂等变更身份。

| 发布步骤 | 检查内容 | 失败时的处理 |
| --- | --- | --- |
| 固定输入 | 快照或源位置、接入批次集合、业务截点、代码及口径版本 | 输入不完整时不生成正式结果 |
| 生成候选 | 新的任务运行 ID；包含受影响日期，即使结果为零 | 独立目录或暂存表保留失败产物以排查 |
| 校验 | 业务键唯一、无版本冲突、行数与金额对账、受影响范围完整 | 阻断切换，保留上一正式版本 |
| 发布 | 使用存储引擎支持的事务或可原子切换的版本指针 | 并发发布校验预期前版本，冲突后重新读取 |
| 复验与清理 | 读者读取同一完整版本；记录旧版本及回退位置 | 按保留期回收，不能立即删除仍在读取的文件 |

特别注意零结果：如果某日最后一笔订单取消，候选查询可能不再返回这一日。发布逻辑仍要显式替换或清空该日；只把有行结果做 upsert，会留下旧的非零值。多个分区分批 `overwrite` 也不天然构成一次原子报表发布，读者可能看到新旧日期混在一起；具体保证取决于表格式、目录提交和读取方式。

## 治理落到哪里

ODS 保存原始值并不表示所有人都能读取。姓名、联系方式和访问令牌等需要在接入、存储、查询引擎各自控制：敏感字段可使用受控原始区、脱敏派生表和列级权限。只建立一张 `security_table_permission` 元数据表不会自动拦截查询，授权必须由实际执行引擎或存储策略强制实施。

质量失败需要保留来源身份、失败字段、规则版本和受影响范围。对可独立隔离的坏记录，写入受限隔离区并核对缺失影响；如果会改变财务口径，应阻断对应批次发布。不能先把负金额改零，再用“没有负金额”证明数据质量通过。合法退款应建模为退款事实，并明确定义如何与订单指标衔接。

每个输出至少能查到负责人、粒度、业务键、时间口径、上游快照、转换版本和发布运行 ID。监控既看作业是否成功，也看输入是否齐全、业务日期覆盖、隔离数量、源端与目标对账和发布延迟；一张空分区无法仅凭 `MAX(etl_time)` 证明已按时产出。文件大小从文件或表元数据读取，不假设每行有 `input_file_size` 字段。

## 查询慢或数字不对时怎么查

先复现同一个报表版本和输入截点，避免拿今天的当前状态与昨天的历史报表对比。检查原始事件是否完整，再看同业务键的版本、明细粒度及关联后的行数，最后核对时间归属、状态筛选与汇总公式。对订单 102 能追到原始两次 `v2`、一个最终状态和一次汇总贡献，才说明这条链路可解释。

性能问题再看分区裁剪、文件大小分布、连接基数和执行计划。按订单创建日分区与按接入日分区解决不同扫描问题，不能靠多加 `year/month/day` 三列自动加速。Parquet 文件不是关系数据库索引表，不能直接套用通用 `CREATE INDEX` 示例；是否支持索引、聚簇、数据跳过和统计信息，需要检查实际查询引擎与表格式。调度的任务依赖、重试和补数入口见 [DolphinScheduler](./dolphinscheduler.md)。
