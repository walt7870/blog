# Apache Spark 执行与订单批处理

订单数据库不适合在交易高峰扫描几年的明细生成报表。把已提交的订单变更落到原始存储，Spark读取确定范围的数据、按业务规则去重，再关联维度并汇总，是常见的离线处理路径。它负责分布式计算，数据持久化、任务依赖和发布验收仍需要存储、调度器与数据合同配合。

本文以 **Spark 4.0.1、PySpark和Java 17** 为练习基线。本地模式便于验证语义，不能证明多节点吞吐、网络故障恢复或生产连接器兼容性。升级3.x应用时同时检查Java/Python版本、ANSI SQL行为、时间解析和连接器的Scala二进制版本。

## 谁申请资源，谁执行任务

![Spark Driver 与 Executor 执行边界](/bigdata/spark-execution-boundaries.svg)

Driver运行主程序，创建SparkSession、构建计划并调度Task。集群管理器负责为应用分配Executor资源，**Task由Driver直接调度给Executor**，不是每次经由集群管理器转发。Executor执行分区计算，保存应用缓存、Shuffle数据并反馈状态。Standalone、YARN和Kubernetes是不同的资源管理选择；不沿用已经移除的Mesos部署路径。

`client`与`cluster`部署模式决定Driver在哪里运行，不决定数据是否分布式。client模式的提交进程结束或网络不可达会影响Driver；cluster模式由集群运行Driver，但不自动解决业务输出的重复提交。生产Driver UI、History Server、资源管理与存储入口需要权限控制，不能把4040端口公开当监控方案。

## 从惰性计划到 Shuffle

DataFrame描述有字段的分布式数据及其计算计划。`select/filter/withColumn`通常先构建计划，`count/show/write`等Action才触发执行。一个应用可以有多个Job，Job按依赖拆成Stage，Stage中的Task处理分区；不能把“一行代码”当成“一个节点上的一个任务”。

SQL/DataFrame可以由Catalyst优化并生成执行代码；RDD保留更底层的分区变换能力。Scala/Java的Dataset提供编码器与类型化API，PySpark没有同样的类型化Dataset接口。Parquet、JSON、JDBC等有内置入口；Kafka、湖仓表和其他数据库常需要额外连接器，不能假定一个`format`名称就代表依赖已经齐全。

![Spark 订单版本去重与汇总的 Shuffle](/bigdata/spark-order-shuffle.svg)

过滤本地记录通常不需要重新分布数据；按订单号求最新版本、按日期汇总或大表关联，往往需要按键交换数据，即Shuffle。它会产生网络、序列化、磁盘与合并成本，但并非应当一律避免：正确地聚合同一订单的所有版本，通常就需要把相关数据汇到一起。

## 可运行的订单日报

准备Java17和独立Python环境后安装`pyspark==4.0.1`，把下面完整程序放在`order_daily.py`，用相同环境的`spark-submit --master 'local[2]' order_daily.py`运行。JAVA_HOME指向实际JDK安装目录；`local[2]`是两个本地执行线程，不是两个远程Executor。

练习输入7条变更：102版本2重复一次，104从paid变成cancelled。指标定义为**按当前有效订单状态，统计下单业务日期上的已支付订单金额**，不是支付流水或财务结算。时区为Asia/Shanghai；同一业务键同一版本内容必须相同，冲突时停止而不是随机选一条。

```python
from pathlib import Path
from tempfile import mkdtemp
from pyspark.sql import SparkSession, Window, functions as F

spark = (SparkSession.builder.appName("order-daily-lab")
         .config("spark.sql.session.timeZone", "Asia/Shanghai")
         .config("spark.sql.shuffle.partitions", "4")
         .getOrCreate())
spark.sparkContext.setLogLevel("WARN")
work = Path(mkdtemp(prefix="spark-order-lab-"))

try:
    schema = "tenantId string, orderId string, version long, status string, amountCents long, createdAt string"
    rows = [
        ("t1", "101", 1, "paid", 5000, "2026-10-19T01:00:00Z"),
        ("t1", "102", 1, "pending", 3000, "2026-10-19T02:00:00Z"),
        ("t1", "102", 2, "paid", 3000, "2026-10-19T02:00:00Z"),
        ("t1", "102", 2, "paid", 3000, "2026-10-19T02:00:00Z"),
        ("t1", "103", 1, "paid", 3990, "2026-10-19T20:00:00Z"),
        ("t1", "104", 1, "paid", 2000, "2026-10-19T20:00:00Z"),
        ("t1", "104", 2, "cancelled", 2000, "2026-10-19T20:00:00Z"),
    ]
    raw = spark.createDataFrame(rows, schema)
    invalid = raw.filter(
        F.col("tenantId").isNull() | F.col("orderId").isNull()
        | F.col("version").isNull() | (F.col("version") < 1)
        | F.col("amountCents").isNull() | (F.col("amountCents") < 0)
        | F.col("status").isNull()
        | ~F.col("status").isin("pending", "paid", "cancelled")
        | F.col("createdAt").isNull()
    )
    if invalid.limit(1).count():
        raise ValueError("订单输入不满足字段合同")
    conflicts = (raw.groupBy("tenantId", "orderId", "version")
                 .agg(F.countDistinct(F.struct("status", "amountCents", "createdAt"))
                      .alias("variants"))
                 .filter("variants > 1"))
    if conflicts.limit(1).count():
        raise ValueError("同一订单版本出现不同内容")

    latest_window = Window.partitionBy("tenantId", "orderId").orderBy(F.desc("version"))
    latest = (raw.dropDuplicates()
              .withColumn("rn", F.row_number().over(latest_window))
              .filter("rn = 1").drop("rn"))
    daily = (latest.filter(F.col("status") == "paid")
             .withColumn("bizDate", F.to_date(F.to_timestamp("createdAt")))
             .groupBy("tenantId", "bizDate")
             .agg(F.count("*").alias("orders"), F.sum("amountCents").alias("amountCents")))
    daily.explain(mode="formatted")
    daily.orderBy("tenantId", "bizDate").show()

    output = str(work / "daily")
    daily.write.mode("errorifexists").partitionBy("bizDate").parquet(output)
    restored = spark.read.parquet(output)
    actual = {(str(r.bizDate), r.orders, r.amountCents) for r in restored.collect()}
    assert actual == {("2026-10-19", 2, 8000), ("2026-10-20", 1, 3990)}
    print("日报校验通过：3单，11990分；输出目录：", output)
finally:
    spark.stop()
```

7条变更收敛成4单，最终3单paid，共11990分。103在UTC的19日20点下单，属于北京时间20日。先筛paid再取最新版本会让104的取消消失，错误保留旧paid；直接对原始paid事件求和还会重复计算102。程序里的`collect()`只用于两个结果行的练习校验，不能用于把海量明细全部搬到Driver。

严格时间解析异常应使批次失败或进入隔离区；生产可以用`try_to_timestamp`识别坏时间后显式处理，不能让null日期悄悄进入默认分区。输入合同还要约束空白业务键、合法状态迁移、删除事件和源记录版本的完整性。只读某天的增量文件不一定包含所有订单最新状态，需要已有状态表或湖仓upsert机制配合。

## 执行成功以后怎样发布

练习写入新临时目录，不覆盖生产数据。真实日报记录源快照/位点、任务版本、业务日期与运行号，写到独立候选版本，检查去重数、金额和分区范围，再发布。失败重试不能无条件append到已有日报，也不应对整张表直接overwrite。

HDFS的目录重命名、对象存储的文件提交、Iceberg/Delta/Hudi的表事务是不同的发布机制。湖仓表需要对应Catalog、连接器和提交协议，单纯写一批Parquet文件不会自动获得多写者事务。分区覆盖也要限制影响范围；删除或纠正导致空分区时，必须明确旧结果怎样移除。

Task失败可按血缘重算丢失分区，但不能自动撤销对外发信、扣款或JDBC逐行写入。在`foreachPartition`中访问外部系统要设计稳定业务键、批量提交、幂等与失败恢复；Task重试和推测执行可能重复触发副作用。累加器适合诊断，不作为准确结算计数器。

## 根据计划和运行数据调优

先在Spark UI的SQL/Stages中定位耗时Stage，再比较Task输入量、Shuffle读写、spill、GC和长尾。一个Task处理了大部分热门用户的数据，增加Executor数量也不会自动拆开那个键；空分区很多时盲增并行度反而增加调度成本。

| 现象 | 判断入口 | 对应处理与边界 |
| --- | --- | --- |
| 大量小Task | 输入文件大小、任务启动耗时、分区数 | 合并小文件、调整读分区；不强行`coalesce(1)`制造单点 |
| 一个Task特别慢 | 键分布、Shuffle分区行数与spill | 评估预聚合、AQE倾斜Join、热点拆分；随机加盐后必须按原键再聚合 |
| Driver内存不足 | collect/toPandas、本地大列表、任务元数据 | 分布式输出或有界采样，不靠增加Executor内存修Driver问题 |
| Executor被杀 | 堆、off-heap、Python进程、容器上限与memoryOverhead | 一起核算容器预算，不能把executor.memory当全部进程内存 |
| 广播关联失败 | 实际维表大小、统计信息、超时与并发 | 小表才评估broadcast；Hint不是容量保证 |
| 缓存无收益 | 是否重复使用、Storage占用、重算/读取成本 | 多次复用昂贵中间结果才persist，并及时unpersist |

`groupByKey`后把分区所有值拉成列表、或在Python的`mapPartitions`中对整个迭代器做无界分组，都可能放大内存。求和优先考虑能做局部合并的聚合；平均数加盐拆分后保留sum/count，再按原键合并，不能直接平均各盐桶的均值。

AQE默认开启并能利用运行时统计合并部分Shuffle分区、调整Join策略，但不是所有算子都可自动消除倾斜。输入分区、Shuffle分区和输出文件数量是三个相关但不同的控制点；示例的4个Shuffle分区只适合小样本。旧的`spark.executor.memoryFraction`、`spark.storage.memoryFraction`和固定“每个Executor多少核”的模板不应直接沿用。

## 流处理与部署边界

Structured Streaming复用DataFrame/SQL模型，默认主要以微批处理执行；不能简单称为“真正流式，所以没有批”。检查点记录进度与状态，端到端恰好一次还依赖可重放源和支持正确提交协议的sink。`foreachBatch`的外部写入通常要用batchId或业务键实现幂等；连续处理模式的算子和交付语义另有限制。DStream/Spark Streaming属于旧API，维护已有任务时再按对应版本处理。

| 位置 | 应当核对 |
| --- | --- |
| 提交端 | spark-submit与运行包版本、Python依赖、连接器坐标、配置与凭据注入 |
| Driver | 可被Executor访问的地址、资源预算、重启策略、UI和日志权限 |
| Executor | 输入/输出存储权限、运行环境一致性、磁盘/网络/容器内存 |
| 历史记录 | event log持久化、History Server权限、日志保留与敏感数据控制 |

Standalone使用当前的`start-worker.sh`入口；YARN和Kubernetes要按实际队列、命名空间与服务身份提交，不能拿一个`latest`镜像和不存在的示例JAR当部署闭环。Spark4使用Log4j2配置体系，不再复制旧Log4j1的`log4j.properties`模板。

验收应先重放同一输入得到相同结果，再加入重复版本、冲突版本、取消、跨日和坏时间数据，验证去重与失败边界。之后才用真实数据量评估倾斜、Shuffle、存储提交和多节点恢复；本地小样本正确与生产任务可恢复需要分别证明。
