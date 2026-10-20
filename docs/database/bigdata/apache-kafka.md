# Kafka 数据接入与重放

订单数据库记录了“订单102已支付”，搜索、数仓和实时告警需要各自处理这次变化。直接在支付请求里同时调用三个下游，会把下游故障带进交易链路；数据库写入后再发消息，又可能在两步之间失败。数据接入需要明确事实怎样发布、消费者从哪里恢复，以及重复事件如何收敛。

Kafka提供可保留、按分区读取的事件日志。本文围绕数据平台接入和补数展开；Topic、Broker、复制、事务与视频入口见[Kafka事件流平台](../../tools/mq/kafka.md)。本地命令固定为 **Apache Kafka 4.1.0 Docker镜像**，只验证单节点KRaft实验，不代表当前最新补丁或生产高可用配置。Kafka4.x已移除ZooKeeper模式，不能继续套用旧的ZooKeeper部署模板。

## 三种位置为什么不能互换

![Kafka 订单接入的位置与业务身份](/bigdata/kafka-ingestion-identities.svg)

CDC连接器读取已提交的数据库日志，记录binlog/WAL等源位置，把变化发布到Kafka。Outbox则把业务记录和待发布事件写进同一个数据库事务，再由relay或CDC投递。两者都需要处理重试、快照衔接和下游幂等；Kafka不会自动读取数据库，也不会替普通应用的“写库、发消息”两步建立原子性。

| 标识 | 回答的问题 | 不能拿它做什么 |
| --- | --- | --- |
| 数据库源位点 | 采集器已经读取到哪段源日志 | 不能直接当Kafka消费offset；切库和快照阶段还需连接器合同 |
| topic + partition + offset | 这条记录位于哪条Kafka日志的哪里 | 不代表跨分区时间顺序，也不保证业务事件唯一 |
| tenantId + orderId + version | 哪个订单的哪个业务版本 | 不代表消费者已经持久化，也不等于支付流水号 |
| eventId或支付流水号 | 哪次不可变业务事实 | 不能用消费时间随机生成，否则重试后身份改变 |

102版本1为pending，版本2为paid；版本2因重试出现两次，版本1又晚到。原始层可以保留四次接收记录，当前订单明细却只保留最高有效版本。不能按Kafka offset跨分区选“最后一条”，也不能每收到一次paid就加一次订单金额。

Key通常选择需要同序的业务实体，例如`tenantId:orderId`。在分区数和分区策略稳定时，相同Key可以落到同一分区；扩分区、改分区器或多生产者并发会影响这种假设。分区内日志顺序也不替代源业务版本校验，跨Topic不会自动形成一个订单的全局顺序。

## 消费进度与处理结果

普通KafkaConsumer的`poll()`读取位置、已提交位置和业务处理完成位置是三件事。关闭自动提交以后，只能在业务结果已经可靠落地后推进提交位置；提交的数字通常表示**下一条要读取的offset**。处理了offset40，就提交41，而不是40。

![Kafka 多分区消费的连续提交边界](/bigdata/kafka-commit-frontier.svg)

同一批读到分区0与分区1的数据，需要分别维护位置。即使分区0的42已经完成，只要41还没成功，就不能提交43跳过41。把异步任务扔进线程池后立即commit，或者只提交“整个批次最后一条记录”的分区，都会破坏处理合同。

同步串行处理可在整批成功后提交对应分区的下一位置；异步处理要维护每个分区连续成功的前沿，并在rebalance撤销时处理仍在执行的任务。KafkaConsumer不能被多个业务线程随意并发访问，通常由一个消费线程负责poll、pause/resume和commit，有界工作队列负责处理；队列满时施加反压，不能丢弃消息后继续提交。

| 失败位置 | 恢复后可能发生什么 | 设计要求 |
| --- | --- | --- |
| 先提交offset，业务写入前失败 | 新消费者跳过尚未落地的记录 | 调整提交顺序，不能靠重试找回已跳过消息 |
| 业务写入成功，提交offset前失败 | 旧记录再次被处理 | 唯一事件键、版本条件更新或原子记录消费进度 |
| 业务处理异常被捕获后继续commit | 失败消息从正常消费路径消失 | 停止推进该分区，或完成可追踪的重试/隔离交接 |
| rebalance时无条件seekToEnd | 直接越过积压 | 从已提交位置恢复；主动跳过必须有范围与补偿依据 |

同一消费者组分摊分区，不同组分别读取。例如`warehouse-orders`、`search-orders`和`risk-orders`有各自进度；给每个线程分配不同groupId会变成多次独立消费，不是并行分摊。这里指普通消费者组，Share Groups的逐条共享消费模型需要按独立版本和API讨论。

## 独立单节点实验

需要Docker。下面容器没有宿主端口、没有外部网络，客户端命令全部通过`docker exec`在容器内部执行，避免把无认证实验入口暴露出去。容器名必须尚未使用；保留容器即可继续读取实验数据，不要反复创建或格式化已有日志目录。

```bash
docker run -d --name kafka-order-lab --network none --hostname localhost apache/kafka:4.1.0

# 启动完成后查看Broker支持的API；启动过程中连接失败可稍后重试
docker exec kafka-order-lab /opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092

docker exec kafka-order-lab /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --create --topic orders_raw_lab \
  --partitions 2 --replication-factor 1 --config retention.ms=604800000

docker exec kafka-order-lab /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --describe --topic orders_raw_lab
```

应看到两个分区、副本数1、Leader与ISR中都有本节点。副本1仅适合这个实验；生产常以多副本配合acks=all、合理min.insync.replicas与故障域规划，确认写入失败策略。ISR减少可能使写入被拒绝，不能为了“可用”无条件改成acks=1或允许不完整副本选主。

写入四条记录，竖线前为Key，后面是JSON值。第三条是业务重复，即使Producer启用了幂等，也不会自动把应用主动发送的两条相同JSON合成一条。

```bash
docker exec -i kafka-order-lab /opt/kafka/bin/kafka-console-producer.sh \
  --bootstrap-server localhost:9092 --topic orders_raw_lab \
  --producer-property acks=all --producer-property enable.idempotence=true \
  --property parse.key=true --property 'key.separator=|' <<'EVENTS'
t1:102|{"tenantId":"t1","orderId":"102","version":1,"status":"pending","amountCents":3000}
t1:102|{"tenantId":"t1","orderId":"102","version":2,"status":"paid","amountCents":3000}
t1:102|{"tenantId":"t1","orderId":"102","version":2,"status":"paid","amountCents":3000}
t1:103|{"tenantId":"t1","orderId":"103","version":1,"status":"paid","amountCents":3990}
EVENTS

docker exec kafka-order-lab /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 --topic orders_raw_lab --from-beginning \
  --max-messages 4 --timeout-ms 10000 \
  --property print.partition=true --property print.offset=true --property print.key=true \
  --property 'key.separator=|'
```

应读到四条原始记录。102的三个版本落在同一分区，offset递增，但不要预设具体分区号或跨分区输出顺序。当前状态按业务键和版本收敛后是两单paid，共6990分；直接对原始paid事件求和会得到9990分。完整订单版本去重与金额断言见[Spark练习](./apache-spark.md)。

再次执行上面的consumer命令，新启动的控制台消费者会从当前最早保留位置读取同一批记录；消费不会删除它们。这是日志重放验证，不是“业务写入与消费位置原子提交”的演示。`--from-beginning`不覆盖已有消费者组的有效提交位置；已有组的恢复位置要单独检查。

## 把重放变成可控补数

补数先写清Topic、分区起止offset、源快照/事件范围、Schema版本和结果目标。用独立groupId或显式分区范围，写到独立候选结果；核对事件数、业务去重数、金额和缺失率后发布。普通消费者重启不是补数方案，把正式组重置到earliest可能重复发券或通知。

查看正式组进度的入口是发行包`bin/kafka-consumer-groups.sh --bootstrap-server ... --group ... --describe`。需要重置时先让组停止，在确定分区范围后用`--reset-offsets`与`--dry-run`查看计划，再决定是否执行。没有有效提交或offset超出保留范围时，`auto.offset.reset`才参与定位；它不是“每次启动都从earliest”的开关。源日志已经过期的数据，需要上游快照或归档恢复，调整offset不能重新创造记录。

删除型保留按时间/大小清理日志段，不等消费者读完。Compaction按Key逐步清理旧值，不是即时去重，也不是无限期业务历史；删除标记tombstone及其保留窗口影响慢消费者能否正确重建状态。源事件原始归档、当前状态Topic和审计历史需要不同合同。

把console-consumer输出重定向为文本再灌回Topic，不是完整备份：它可能丢失Headers、时间戳、事务信息、二进制边界和消费组位置。跨集群复制、对象存储归档与恢复工具要分别验证数据及元数据范围。不要对运行中的Kafka目录手工按mtime删除`.log/.index/.timeindex`，保留与清理由Kafka配置和管理入口控制。

## 采集器和事务的边界

Kafka Connect负责运行Source/Sink Connector，连接器负责具体系统的快照、位点、Schema与写入语义。Debezium等插件不是“部署Broker就附带可用”；需要配置plugin.path、连接器权限、源日志保留、内部Topic、转换与错误策略。把异常全部放进死信Topic只能隔离症状，仍要保留原始身份、错误原因、责任范围和回灌幂等。

消费Kafka再写Kafka时，事务Producer可以把输出记录和消费位置放在同一事务，下游使用read_committed观察已提交结果；事务ID需要正确分配以处理旧实例与重启。事务中止后消费者的本地读取位置也要回退或重建，不能只abort后接着读。数据库和HTTP效果一般不在Kafka事务内，需要目标系统的幂等、事务写入或对应连接器提交协议。

业务库到Kafka的采集验收要包括：同一源快照与增量衔接、采集器失败后恢复、重复与删除事件、Schema演进、源日志过期、下游恢复和结果对账。单节点控制台能读写，只覆盖最基础的数据路径。

## 从积压找瓶颈

| 现象 | 查看位置 | 判断与动作 |
| --- | --- | --- |
| 所有分区lag持续增长 | 生产速率、处理速率、下游耗时和消费组成员 | 区分流量增加与下游变慢，先保证反压和重试范围 |
| 一个分区积压 | Key分布、该成员日志、批次耗时 | 检查热点键和毒消息；加消费者不能拆开单分区 |
| lag较小但业务未落地 | poll位置、提交位置、异步队列和目标结果 | 排查提前提交，不把Broker lag当端到端完成指标 |
| Broker可连但客户端报其他地址失败 | advertised.listeners、DNS、网络与认证 | bootstrap地址只用于发现，客户端还须访问元数据返回的地址 |
| 写入确认失败 | ISR、min.insync.replicas、磁盘、请求超时 | 保留失败证据和事件身份；超时可能是结果未知而非确定没写入 |
| 重放后当前状态倒退 | 版本比较、快照标记、删除语义和目标更新条件 | 相同版本冲突隔离，拒绝低版本覆盖，核对最终状态 |

容量评估同时计算峰值字节率、副本放大、保留周期、积压恢复速度、磁盘与网络余量。batch、linger和压缩按实际负载测量，不用一组“高性能参数”替代延迟与可靠性验收。Schema、个人信息字段、ACL、TLS/SASL和日志留存也属于数据合同的一部分。
