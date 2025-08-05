# Apache Spark 详解

## 概述

Apache Spark 是一个开源的分布式计算框架，专为大规模数据处理而设计。它提供了比传统 MapReduce 更快的内存计算能力，支持批处理、流处理、机器学习和图计算等多种工作负载。

## Spark 架构

### 核心架构组件

```
┌─────────────────────────────────────────────────────────┐
│                  Spark 架构图                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Driver Program                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              SparkContext                       │   │
│  │  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │    DAG      │  │  Task       │              │   │
│  │  │  Scheduler  │  │ Scheduler   │              │   │
│  │  └─────────────┘  └─────────────┘              │   │
│  └─────────────────────────────────────────────────┘   │
│                           │                             │
│                           ▼                             │
│  Cluster Manager                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Standalone / YARN / Mesos / Kubernetes        │   │
│  └─────────────────────────────────────────────────┘   │
│                           │                             │
│                           ▼                             │
│  Worker Nodes                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Executor  │  │   Executor  │  │   Executor  │   │
│  │  ┌───────┐  │  │  ┌───────┐  │  │  ┌───────┐  │   │
│  │  │ Task  │  │  │  │ Task  │  │  │  │ Task  │  │   │
│  │  └───────┘  │  │  └───────┘  │  │  └───────┘  │   │
│  │  ┌───────┐  │  │  ┌───────┐  │  │  ┌───────┐  │   │
│  │  │ Cache │  │  │  │ Cache │  │  │  │ Cache │  │   │
│  │  └───────┘  │  │  └───────┘  │  │  └───────┘  │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 组件说明

1. **Driver Program**
   - 包含应用程序的 main 函数
   - 创建 SparkContext
   - 定义 RDD 和操作
   - 调度任务到集群

2. **SparkContext**
   - Spark 应用程序的入口点
   - 连接到集群管理器
   - 获取 Executor
   - 发送应用代码到 Executor

3. **Cluster Manager**
   - 负责资源分配
   - 支持多种模式：Standalone、YARN、Mesos、Kubernetes

4. **Executor**
   - 运行在 Worker 节点上的进程
   - 执行任务
   - 存储数据在内存或磁盘

## 核心概念

### 1. RDD (Resilient Distributed Dataset)

**特性：**
- **弹性**：自动容错和恢复
- **分布式**：数据分布在集群中
- **不可变**：创建后不能修改
- **惰性求值**：只有在 Action 操作时才计算

**RDD 操作类型：**

1. **Transformation（转换操作）**
   ```scala
   // 示例
   val rdd1 = sc.textFile("input.txt")
   val rdd2 = rdd1.filter(_.contains("error"))
   val rdd3 = rdd2.map(_.toUpperCase)
   ```

2. **Action（行动操作）**
   ```scala
   // 示例
   val count = rdd3.count()
   val results = rdd3.collect()
   rdd3.saveAsTextFile("output")
   ```

### 2. DataFrame 和 Dataset

**DataFrame：**
- 结构化数据抽象
- 类似关系型数据库的表
- 支持 SQL 查询
- 优化的执行引擎

```scala
// DataFrame 示例
val df = spark.read.json("people.json")
df.select("name", "age").filter($"age" > 21).show()

// SQL 查询
df.createOrReplaceTempView("people")
spark.sql("SELECT name, age FROM people WHERE age > 21").show()
```

**Dataset：**
- 类型安全的 DataFrame
- 编译时类型检查
- 结合了 RDD 和 DataFrame 的优点

```scala
// Dataset 示例
case class Person(name: String, age: Int)
val ds = spark.read.json("people.json").as[Person]
ds.filter(_.age > 21).map(_.name).show()
```

### 3. Spark SQL

**特性：**
- 支持标准 SQL
- 多数据源支持
- 查询优化器（Catalyst）
- 代码生成

**数据源支持：**
- JSON、Parquet、ORC
- Hive、JDBC
- Cassandra、HBase
- Kafka、Elasticsearch

```scala
// 多数据源示例
val jdbcDF = spark.read
  .format("jdbc")
  .option("url", "jdbc:postgresql:dbserver")
  .option("dbtable", "schema.tablename")
  .option("user", "username")
  .option("password", "password")
  .load()

val parquetDF = spark.read.parquet("path/to/file.parquet")
```

## Spark 生态系统

### 1. Spark Streaming

**特性：**
- 微批处理模型
- 容错性
- 与批处理 API 统一

```scala
// Spark Streaming 示例
val ssc = new StreamingContext(sc, Seconds(1))
val lines = ssc.socketTextStream("localhost", 9999)
val words = lines.flatMap(_.split(" "))
val wordCounts = words.map(x => (x, 1)).reduceByKey(_ + _)
wordCounts.print()
ssc.start()
ssc.awaitTermination()
```

### 2. Structured Streaming

**特性：**
- 真正的流处理
- 事件时间处理
- 端到端一致性保证

```scala
// Structured Streaming 示例
val df = spark
  .readStream
  .format("kafka")
  .option("kafka.bootstrap.servers", "host1:port1,host2:port2")
  .option("subscribe", "topic1")
  .load()

val query = df.writeStream
  .outputMode("append")
  .format("console")
  .start()

query.awaitTermination()
```

### 3. MLlib (Machine Learning)

**功能模块：**
- 分类和回归
- 聚类
- 协同过滤
- 特征提取和转换
- 模型评估

```scala
// MLlib 示例
import org.apache.spark.ml.classification.LogisticRegression
import org.apache.spark.ml.feature.VectorAssembler

// 特征工程
val assembler = new VectorAssembler()
  .setInputCols(Array("feature1", "feature2", "feature3"))
  .setOutputCol("features")

val featureDF = assembler.transform(rawDF)

// 训练模型
val lr = new LogisticRegression()
  .setLabelCol("label")
  .setFeaturesCol("features")

val model = lr.fit(featureDF)

// 预测
val predictions = model.transform(testDF)
```

### 4. GraphX (图计算)

**特性：**
- 图数据结构
- 图算法库
- 图并行计算

```scala
// GraphX 示例
import org.apache.spark.graphx._

// 创建图
val vertices = sc.parallelize(Array((1L, "Alice"), (2L, "Bob")))
val edges = sc.parallelize(Array(Edge(1L, 2L, "friend")))
val graph = Graph(vertices, edges)

// PageRank 算法
val ranks = graph.pageRank(0.0001).vertices
```

## 性能优化

### 1. 内存管理

**存储级别：**
```scala
// 不同的存储级别
rdd.persist(StorageLevel.MEMORY_ONLY)
rdd.persist(StorageLevel.MEMORY_AND_DISK)
rdd.persist(StorageLevel.MEMORY_ONLY_SER)
rdd.persist(StorageLevel.DISK_ONLY)
```

**内存配置：**
```bash
# 执行内存配置
spark.executor.memory=4g
spark.executor.memoryFraction=0.8
spark.storage.memoryFraction=0.6
```

### 2. 并行度调优

```scala
// 设置分区数
val rdd = sc.textFile("input.txt", minPartitions = 100)

// 重新分区
val repartitionedRDD = rdd.repartition(200)
val coalescedRDD = rdd.coalesce(50)
```

### 3. 数据倾斜处理

**解决方案：**
1. **加盐技术**
   ```scala
   // 为 key 添加随机前缀
   val saltedRDD = rdd.map { case (key, value) =>
     val salt = Random.nextInt(100)
     (s"${salt}_${key}", value)
   }
   ```

2. **预聚合**
   ```scala
   // 先进行局部聚合
   val preAggregated = rdd.mapPartitions { iter =>
     iter.groupBy(_._1).map { case (key, values) =>
       (key, values.map(_._2).sum)
     }.iterator
   }
   ```

### 4. 广播变量和累加器

```scala
// 广播变量
val broadcastVar = sc.broadcast(Array(1, 2, 3))
val result = rdd.map(x => x * broadcastVar.value.sum)

// 累加器
val accum = sc.longAccumulator("My Accumulator")
rdd.foreach(x => accum.add(x))
println(accum.value)
```

## 部署模式

### 1. Standalone 模式

```bash
# 启动 Master
./sbin/start-master.sh

# 启动 Worker
./sbin/start-slave.sh spark://master:7077

# 提交应用
./bin/spark-submit \
  --class MyApp \
  --master spark://master:7077 \
  --executor-memory 2g \
  --total-executor-cores 4 \
  myapp.jar
```

### 2. YARN 模式

```bash
# Cluster 模式
./bin/spark-submit \
  --class MyApp \
  --master yarn \
  --deploy-mode cluster \
  --executor-memory 2g \
  --num-executors 10 \
  myapp.jar

# Client 模式
./bin/spark-submit \
  --class MyApp \
  --master yarn \
  --deploy-mode client \
  --executor-memory 2g \
  --num-executors 10 \
  myapp.jar
```

### 3. Kubernetes 模式

```bash
# K8s 部署
./bin/spark-submit \
  --master k8s://https://kubernetes-api-server:443 \
  --deploy-mode cluster \
  --name spark-pi \
  --class org.apache.spark.examples.SparkPi \
  --conf spark.executor.instances=2 \
  --conf spark.kubernetes.container.image=spark:latest \
  local:///opt/spark/examples/jars/spark-examples.jar
```

## 监控和调试

### 1. Spark UI

**主要功能：**
- Jobs 监控
- Stages 详情
- Storage 使用情况
- Executors 状态
- SQL 查询计划

**访问地址：**
- Driver UI: http://driver:4040
- History Server: http://history-server:18080

### 2. 日志配置

```properties
# log4j.properties
log4j.rootCategory=INFO, console
log4j.appender.console=org.apache.log4j.ConsoleAppender
log4j.appender.console.target=System.err
log4j.appender.console.layout=org.apache.log4j.PatternLayout
log4j.appender.console.layout.ConversionPattern=%d{yy/MM/dd HH:mm:ss} %p %c{1}: %m%n

# 设置特定包的日志级别
log4j.logger.org.apache.spark.repl.Main=WARN
log4j.logger.org.spark_project.jetty=WARN
```

### 3. 性能调优工具

**常用工具：**
- Spark History Server
- Ganglia
- Grafana + Prometheus
- Dr. Elephant

## 最佳实践

### 1. 开发建议

1. **选择合适的数据结构**
   - 结构化数据使用 DataFrame/Dataset
   - 非结构化数据使用 RDD

2. **避免 Shuffle 操作**
   ```scala
   // 避免
   rdd.groupByKey().mapValues(_.sum)
   
   // 推荐
   rdd.reduceByKey(_ + _)
   ```

3. **合理使用缓存**
   ```scala
   // 多次使用的 RDD 进行缓存
   val cachedRDD = rdd.filter(_.contains("error")).cache()
   cachedRDD.count()
   cachedRDD.collect()
   ```

### 2. 生产环境配置

```bash
# 推荐配置
spark.sql.adaptive.enabled=true
spark.sql.adaptive.coalescePartitions.enabled=true
spark.sql.adaptive.skewJoin.enabled=true
spark.serializer=org.apache.spark.serializer.KryoSerializer
spark.sql.execution.arrow.pyspark.enabled=true
```

### 3. 资源规划

**内存规划：**
- Executor 内存 = 堆内存 + 堆外内存
- 堆内存 = 存储内存 + 执行内存 + 其他内存
- 建议 Executor 内存不超过 64GB

**CPU 规划：**
- 每个 Executor 2-5 个 CPU 核心
- 避免单个 Executor 占用过多资源

## 总结

Apache Spark 作为现代大数据处理的核心框架，具有以下优势：

1. **统一的计算引擎**：支持批处理、流处理、机器学习和图计算
2. **高性能**：内存计算和优化的执行引擎
3. **易用性**：丰富的 API 和 SQL 支持
4. **容错性**：自动故障恢复机制
5. **可扩展性**：支持从单机到数千节点的集群

掌握 Spark 的核心概念和最佳实践，对于构建高效的大数据处理系统至关重要。随着技术的不断发展，Spark 也在持续演进，向着更加智能化和自动化的方向发展。