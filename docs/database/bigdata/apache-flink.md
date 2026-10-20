<script setup>
import { withBase } from 'vitepress'
</script>

# Apache Flink 时间、状态与恢复

支付服务在01:04完成一笔交易，消息因网络重试到01:07才被计算任务收到。要统计01:00到01:05的支付额，就不能只看机器收到消息的时间。Flink把持续到达的事件、按键保存的状态和时间推进结合起来，维护窗口、关联结果和实时指标。

本文以 **Flink 1.20.3、Java 17** 为可运行练习基线，版本固定是为了明确API与验证范围。2.x应用需要重新核对已移除API、连接器、状态序列化和恢复兼容性，不混用旧FlinkKafkaConsumer、TimeCharacteristic或SinkFunction模板。Flink负责计算与状态恢复，不能替业务系统定义“哪条消息算重复”或保证任意外部接口只调用一次。

## 事件怎样流过集群

Client提交JobGraph；JobManager侧负责作业协调、资源管理、调度与检查点，TaskManager运行算子的并行子任务。数据通常在TaskManager之间直接交换，不是每条消息都经过JobManager。Slot是资源分配单位，不能理解为“一核一个算子”；算子链和Slot Sharing会影响实际任务布局。

`map/filter`逐条变换，`keyBy`把同一业务键的数据路由到同一分区，窗口或ProcessFunction再维护对应状态。按租户和支付流水号去重，与按租户累计金额是两次不同的分区：前者把同一流水聚在一起，后者把同一租户的有效流水聚在一起。

![Flink 检查点与下游提交边界](/bigdata/flink-checkpoint-boundaries.svg)

Keyed State随业务键分区，Operator State属于算子子任务并按对应规则重新分配。把一个Java HashMap声明在函数里并不等于可恢复状态。状态后端决定运行中的状态怎样组织，Checkpoint Storage决定快照持久化到哪里；RocksDB本地目录不能替代远端检查点存储。

## 水位线为什么会影响金额

事件时间来自支付完成字段，处理时间来自当前机器时钟。前者适合按业务发生时间统计，后者适合“系统最近五分钟收到多少请求”等运行指标。事件时间能减少重放速度对结果的影响，但有限等待、坏时间戳、迟到规则和输入缺失仍会改变结果。

Watermark表示算子认为事件时间已经推进到某个位置。它不是实际时钟，也不是“之前的消息一定到齐”的证明。多输入或多分区通常受最慢活跃输入限制；空闲分区可用idleness策略排除，但恢复后送来的旧消息仍可能迟到。未来异常时间戳也可能错误推进水位线，应在入口校验。

![Flink 支付窗口触发与迟到处理](/bigdata/flink-payment-lateness.svg)

以UTC的`[01:00,01:05)`滚动窗口为例，默认事件时间触发器在Watermark达到窗口最大时间戳01:04:59.999时首次输出。允许迟到2分钟时，清理时间为01:06:59.999。清理前到达的01:04流水还能更新窗口并再次输出；清理后相同时间范围的流水进入迟到侧输出，或者在未配置侧输出时被丢弃。**乱序容忍与allowedLateness不是同一个等待参数**：前者控制水位线落后程度，后者控制已触发窗口保留多久。

| 设置或对象 | 解决什么 | 不能替代什么 |
| --- | --- | --- |
| 乱序容忍20秒 | 根据已见最大时间戳生成较落后的Watermark | 不保证网络延迟绝不超过20秒 |
| allowedLateness 2分钟 | 窗口首次输出后继续接收部分迟到事件 | 不负责消息去重，也不回滚下游旧结果 |
| 迟到侧输出 | 把已清理窗口的事件交给修正链路 | 不会自动重算历史报表 |
| 稳定结果键 | 按租户、窗口起点覆盖同一窗口的新版结果 | 不能让有副作用的通知天然只发送一次 |

窗口第二次输出的是更新后的完整金额时，下游应按窗口键upsert，不能把两次累计值相加。退款是独立负向流水还是更新旧记录，也必须先约定；对订单状态变更直接做sum会把取消和重复版本算错，相关状态快照见[Spark订单日报](./apache-spark.md)。

## 可运行的支付去重与五分钟汇总

练习只接收**不可变的成功支付流水**，金额单位为分，币种固定CNY，时间统一UTC。相同支付号与内容重复只算一次；同号金额或支付时间冲突立即失败。它不接受订单pending/paid/cancelled状态流，也不实现退款结算。

下载完整的[pom.xml](/bigdata/examples/flink-payment-lab/pom.xml)与<a :href="withBase('/bigdata/examples/flink-payment-lab/PaymentWindowLab.java')" download="PaymentWindowLab.java">PaymentWindowLab.java</a>，分别放到项目根目录和`src/main/java/lab/`。使用Java17和Maven3执行：

```bash
mvn -q package dependency:build-classpath -Dmdep.outputFile=classpath.txt
java -cp "target/classes:$(cat classpath.txt)" lab.PaymentWindowLab
```

程序使用本地有界输入和单并行度：p101在01:01支付5000分，p102在01:02支付3000分并重复一次，p103在01:06支付3990分。结果必须是两个窗口，分别2笔8000分、1笔3990分；重复输入不改变总额11990分。程序对结果集合做断言，不依赖输出顺序。

核心的两次分区与状态操作如下，完整类、依赖和输入在上述文件中：

```java
SingleOutputStreamOperator<Payment> unique = source
    .assignTimestampsAndWatermarks(
        WatermarkStrategy.<Payment>forBoundedOutOfOrderness(Duration.ofSeconds(20))
            .withTimestampAssigner((payment, previous) -> payment.paidAtMillis))
    .keyBy(payment -> payment.paymentId)
    .process(new Deduplicate())
    .uid("payment-deduplicate-v1");

SingleOutputStreamOperator<String> result = unique
    .keyBy(payment -> payment.tenantId)
    .window(TumblingEventTimeWindows.of(Duration.ofMinutes(5)))
    .aggregate(new Totals(), new DescribeWindow())
    .uid("payment-window-v1");
```

本练习支付号全局唯一；如果业务只保证租户内唯一，去重键必须同时包含tenantId。Deduplicate使用ValueState保存首次有效流水，重号时比较内容；示例不设置TTL，适用于这组有限输入。持续运行的任务必须约定重放上限与去重保留周期，或使用永久流水唯一约束。处理时间TTL到期后再次收到旧支付号可能被重新计入，TTL不是永久去重。

有界源结束会发出最终Watermark并触发剩余窗口，这只能证明本地去重、分组和金额语义。它不能证明真实Kafka空闲分区推进、迟到修正、Checkpoint恢复或外部sink提交；练习不启用周期检查点，也不把终端输出当可靠sink。修改输入可验证同号冲突、负金额和空支付号会失败；重放同一批输入应保持两窗口结果不变。

## 从检查点恢复为何还会重复

假设检查点42记录源位点、去重状态和窗口状态。随后流水p104写入一个普通HTTP接口，进程在下一次检查点完成前失败。恢复42以后p104可能再次被读取；即使Flink内部状态回到一致位置，HTTP服务已经执行的操作也不会自动撤销。

端到端恰好一次需要组合验证：源可以从检查点位点重放，算子状态一致恢复，sink能把外部提交与检查点协调起来，或者根据稳定业务键进行幂等写入。Kafka事务sink还要核对事务ID、超时、连接器版本与下游read_committed；普通JDBC批量insert、日志输出和邮件接口都不能仅凭EXACTLY_ONCE配置获得同样语义。源业务自身发送两次相同支付仍需要业务去重。

生产配置至少要明确检查点间隔、超时、取消后的保留策略、全体节点可访问的持久化存储以及失败重启策略。存储URI、文件系统插件和身份权限需要一起部署；只把HDFS字符串写进配置不代表目录已可用。作业UI中出现“completed”后，还要实际恢复并核对位点、金额和下游可见结果。

Aligned Checkpoint等待各输入的barrier对齐；反压严重时对齐耗时可能增加。Unaligned Checkpoint把在途数据也纳入快照，能降低部分反压场景的等待，但会增加快照数据和恢复成本，**它不等于增量检查点**。增量快照则取决于状态后端等条件，关注本次增量和完整恢复依赖，不能只看UI里一项较小的字节数。

## 保存点、升级与部署

Checkpoint主要服务自动故障恢复，Savepoint主要服务计划中的停止、迁移与升级。两者都不是任意版本、任意代码改动之间的通行证。保留稳定算子UID，核对状态名、序列化器、maxParallelism和连接器恢复合同，先在隔离环境恢复同一份状态，再切正式任务。

命令行入口在Flink发行包`bin/flink`中：运行任务使用`run`，创建保存点使用`savepoint`，停止并保留状态使用对应版本的`stop --savepointPath`选项，恢复使用`run -s`。`--drain`会推进事件时间并触发窗口，可能改变后续恢复效果，不能无条件加到每次升级命令中。先用发行包`--help`核对选项，再代入真实作业ID和所有节点可访问的目录。

Session集群共享资源，Application模式以应用组织运行边界；Standalone、YARN和Kubernetes的资源与身份配置不同。镜像、Flink版本、Java版本与连接器需要固定，作业JAR和插件必须存在。Web UI、REST和指标端口应位于受控网络，凭据通过受限配置注入，不在命令行和示例中写生产口令。

Table API/SQL适合关系变换，但聚合和Join可能产生更新与撤回记录。选sink前检查它接收append、upsert还是完整changelog，以及主键和空值如何处理；不能用旧toRetractStream片段推断当前所有表都能直接追加。KafkaSource/KafkaSink、JDBC与表连接器有独立依赖和兼容矩阵，框架版本相同不代表所有连接器已经打包。

## 从现象定位原因

| 现象 | 先取什么证据 | 处理与验收 |
| --- | --- | --- |
| 窗口迟迟不输出 | 各输入Watermark、空闲分区、事件时间分布 | 核对单位与时区、空闲策略；重放边界事件观察窗口触发 |
| 支付额越来越大 | 支付ID重复率、窗口结果键、sink写入方式 | 分清源重复与结果更新；重放同一数据，核对外部最终金额 |
| 一个并行子任务很慢 | 各subtask输入量、热点键、busy/backpressured时间 | 先找热点或外部慢调用；加并行度不自动拆开单一热点键 |
| 检查点频繁超时 | start delay、alignment、快照上传时长和状态量 | 区分反压与存储慢，按瓶颈处理；验证恢复耗时和资源峰值 |
| 状态不断增长 | 去重键、Join保留范围、定时器与TTL | 明确保留合同和迟到损失，验证清理后重放旧事件的结果 |
| 恢复后金额异常 | 恢复快照、源保留位点、UID、状态兼容与sink提交 | 对固定输入注入失败，核对缺失、重复与补偿，保留失败证据 |

与Spark Structured Streaming比较时，检查延迟目标、状态规模、连接器、恢复和团队运维能力，不用“真正流式”或笼统吞吐排名选型。Flink提供持续流执行与批处理能力；Spark Structured Streaming默认主要是微批，但同样具备事件时间和有状态计算。最终依据实际链路的正确性、延迟与恢复成本选择。
