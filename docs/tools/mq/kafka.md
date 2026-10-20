# Kafka：分区日志、消费进度与可靠处理

Kafka 不只是消息队列，它更准确的定位是**分布式事件流平台**。  
它把消息当作可持久化、可顺序读取、可回放的日志来管理，因此特别适合日志、埋点、实时数据管道、CDC 和事件驱动架构。

## 分区日志模型

Kafka 像一组可扩展的“分区日志文件”：生产者不断追加事件，消费者按自己的 offset 读取事件。消息不会因为某个消费者读过就立即消失，其他消费者组仍然可以继续读取。

![Kafka Topic、Partition 与消费者组](/mq/kafka-topic-partition-consumers.svg)

## 视频讲解

Kafka 核心原理科普系列已经按单集发布，建议按下面顺序看完，再回到本文查 Topic、Partition、Consumer Group、事务、存储和容量规划细节。

| 集数 | 主题 | 视频 |
| --- | --- | --- |
| 01 | Kafka 到底是什么 | [B站](https://www.bilibili.com/video/BV1fA7N64EiL) |
| 02 | Topic 是业务事件入口 | [B站](https://www.bilibili.com/video/BV1Fc7N6fEnf) |
| 03 | Partition 才是真正的落盘骨架 | [B站](https://www.bilibili.com/video/BV1Jc7N6fESQ) |
| 04 | Key、Offset 与顺序边界 | [B站](https://www.bilibili.com/video/BV1FA7N6bExo) |
| 05 | Broker、Cluster 与 Controller | [B站](https://www.bilibili.com/video/BV1Fc7N6fEY3) |
| 06 | Producer 写入路径 | [B站](https://www.bilibili.com/video/BV1P97P6eEwv) |
| 07 | 副本、ISR 与高水位 | [B站](https://www.bilibili.com/video/BV1W97P6eE4Y) |
| 08 | Consumer Group 与 Rebalance | [B站](https://www.bilibili.com/video/BV1W97P6eETj) |
| 09 | 投递语义与幂等 Producer | [B站](https://www.bilibili.com/video/BV1fA7N64EV7) |
| 10 | Kafka 事务机制 | [B站](https://www.bilibili.com/video/BV1A97P6eEow) |
| 11 | Segment、Index 与 Retention | [B站](https://www.bilibili.com/video/BV1JA7N6tEJH) |
| 12 | 高吞吐从哪里来 | [B站](https://www.bilibili.com/video/BV1C97P6eEfD) |
| 13 | Topic 与容量规划 | [B站](https://www.bilibili.com/video/BV1P97P6eEgQ) |
| 14 | 安全、治理与运维观测 | [B站](https://www.bilibili.com/video/BV1Fc7N6fEx8) |
| 15 | Streams、Connect 与生态 | [B站](https://www.bilibili.com/video/BV1W97P6eEbG) |
| 16 | Kafka 适合什么场景 | [B站](https://www.bilibili.com/video/BV1W97P6eEbT) |

## 适合与不适合

适合：

- 日志、埋点、行为流、IoT 数据。
- 数据管道：业务库 CDC -> Kafka -> Flink/数仓/搜索。
- 同一份事件需要多个系统各自消费。
- 需要事件回放、审计、重建下游状态。

不适合：

- 复杂路由和协议适配，RabbitMQ 更合适。
- 细粒度延迟任务，RocketMQ/RabbitMQ 更直接。
- 只需要简单后台任务队列，Kafka 的模型偏重。

## 核心概念

| 概念 | 说明 |
| --- | --- |
| Topic | 事件分类，例如 `order.created.v1` |
| Partition | Topic 的物理分片，分区内有序 |
| Offset | 消息在分区内的位置 |
| Producer | 写入事件 |
| Consumer | 读取事件 |
| Consumer Group | 消费者组，同组内分摊分区 |
| Broker | Kafka 服务节点 |
| Controller | 管理元数据和分区领导者 |
| KRaft | 元数据 Raft 仲裁；Kafka 4.x 已移除 ZooKeeper 模式 |

## Topic、Partition 与顺序

Kafka 的顺序保证是：**同一个 Partition 内有序，Topic 全局不保证有序**。

如果你希望同一个订单的事件有序，必须让相同 `orderId` 的消息进入同一个分区。

这只是分区日志中的顺序，不自动等于业务完成顺序：多个生产者并发发送、消费者把任务扔到线程池并行处理，都可能改变业务观察顺序。同 key 放在不同 Topic 也不存在统一排序。Kafka 4.x 使用 KRaft，旧 ZooKeeper 集群要先按受支持版本完成迁移，不能直接套用 4.x 启动配置。

分区设计要同时看吞吐、顺序、扩容和治理成本。分区数太少，消费并行度和写入吞吐上不去；分区数太多，会增加 Broker 文件句柄、元数据管理、Leader 选举和 Rebalance 成本。更重要的是，扩分区会改变 key 到分区的映射，可能破坏同一个 key 的长期顺序假设。

常见规划方式：

1. 先估算写入峰值、单分区吞吐和消费者处理能力。
2. 再确认哪些事件必须按 key 保序，例如 `orderId`、`userId`、`deviceId`。
3. 给未来增长留余量，但不要为了“保险”无限加分区。
4. 对核心 Topic 建立命名、分区数、保留时间、Schema 和负责人标准。

## Consumer Group 工作方式

这里讨论经典 Consumer Group：同组内一个分区同时分配给一个消费者，不同组分别保存进度。新版本 Share Group 是不同的队列消费模型，不能将其能力混写到经典组的分区分配规则中。

注意：

- 分区数是同组消费并行度的上限。
- 消费者数量超过分区数，多出来的消费者会空闲。
- 扩容/缩容消费者会触发 rebalance。

## 写入流程

![Kafka 写入与读取流程](/mq/kafka-write-fetch-flow.svg)

生产可靠性关键参数：

- `acks=all`：等待当前 ISR 集合完成所需复制，结合 `min.insync.replicas` 判断能否接受写入。
- `enable.idempotence=true`：生产端幂等，减少重试重复。
- `retries`：允许失败重试。
- `min.insync.replicas`：最少同步副本数。

如果追求可靠性，通常会组合使用 `acks=all`、`enable.idempotence=true` 和合理的 `min.insync.replicas`。如果追求吞吐，则会关注 batch、linger、compression、buffer memory 和分区并行。可靠性和吞吐不是绝对对立，但要明确业务更怕“丢”还是更怕“慢”。

例如副本因子 3、`min.insync.replicas=2` 配合 `acks=all`，ISR 只剩 1 时拒绝此类写入，以可用性换取副本条件。`acks=all` 不表示每条消息都逐副本同步 `fsync`；仍需考虑故障域、电源和磁盘风险。幂等 Producer 解决其协议边界内的重试重复，应用重新构造一条新消息或跨实例重复发布仍需业务去重。

## 保留、压缩与回放

Kafka 消息保留不依赖消费者是否消费，而依赖 Topic 配置：

| 能力 | 说明 | 场景 |
| --- | --- | --- |
| 时间保留 | 保留最近 N 小时/天消息 | 普通事件流 |
| 大小保留 | 保留到指定磁盘大小 | 控制成本 |
| Log Compaction | 后台按 key 清理旧值，最终保留最新状态 | 状态恢复、配置变更 |
| Tiered Storage | 历史数据下沉到低成本存储 | 长期保留和回放 |

这也是 Kafka 和传统队列最大的差异之一：Kafka 天然支持“重复消费”和“历史回放”。

回放只能覆盖仍在保留范围内的数据。大小限制按分区生效，清理按 segment 进行，并不是 Topic 达到某个总字节数就精确裁切。Compaction 不是即时唯一键表，旧值和 tombstone 可能暂存；离线消费者还要关注删除标记的保留期限，不能把压缩日志直接当作无限期的全量审计历史。

## 事务与 Exactly Once

Kafka 支持：

- 幂等生产者：避免生产端重试导致重复写入。
- 事务生产者：把多分区写入和 offset 提交放入同一事务。
- Exactly Once Semantics：主要服务于 Kafka Streams 或消费-处理-再写入 Kafka 的链路。

但业务系统仍然要注意：

- 调用外部接口无法天然纳入 Kafka 事务。
- 数据库写入仍需业务幂等或 Outbox 模式。
- “精确一次”更多是端到端设计结果，不只是一个配置。

消费、计算、再写 Kafka 的事务链路需要事务 Producer，将输出与输入 offset 一起提交，并由下游使用 `read_committed` 排除未提交或已中止事务。外部订单库不属于这个事务。若消费者写库后才提交 offset，重启可能重做；应把去重记录和业务写入放在同一个数据库事务，成功后再提交进度。

## 常见架构模式

### 1) 日志与埋点管道

采集器把访问事件写入 Topic，实时任务计算分钟指标，离线任务按另一消费组归档。同一事件可多路处理，采集端仍需处理发送失败和本地缓冲上限；“日志场景”也不意味着所有日志都允许丢失。

### 2) CDC 数据同步

CDC 读取数据库变更日志，向下游传播已提交变化。消费端按主键更新派生视图，启动快照和增量日志要衔接；它不允许搜索索引反向成为订单状态的权威来源。

### 3) Outbox 最终一致性

业务服务先在同一个数据库事务里写业务表和 outbox 表，再由 outbox relay 投递 Kafka。

![Kafka Outbox 最终一致性](/mq/kafka-outbox-flow.svg)

relay 发送成功后、标记 Outbox 完成前退出会重复发布，所以每条记录要有稳定 `eventId`。跨消费者或跨数据库的副作用不能靠“relay 已成功”证明完成，需要各自的幂等与对账。

## 统一案例：订单超时关闭 + 支付成功发券

### Topic 设计

| Topic | 说明 | Key |
| --- | --- | --- |
| `order.created.v1` | 订单创建事件 | `orderId` |
| `order.paid.v1` | 支付成功事件 | `orderId` |
| `order.timeout-check.v1` | 到期检查事件 | `orderId` |
| `coupon.issue.v1` | 发券事件 | `orderId` |

### 推荐流程

![Kafka 订单超时与发券流程](/mq/kafka-order-case.svg)

Kafka 不直接等价于延迟队列，因此常见做法是加一个调度服务，用数据库、时间轮、Redis ZSet 或专门调度系统记录到期任务。

关键点：

- 所有订单事件 key 使用 `orderId`。
- 超时检查只发“检查指令”，最终以订单库状态为准。
- 支付成功和超时关闭存在竞态，订单状态机必须限制非法流转。
- 发券按 `orderId + couponTemplateId` 幂等。

上述四个 Topic 的同 key 不提供跨 Topic 顺序。若需要完整订单事件序列，应在单一事件流内设计顺序与版本；超时指令仍以订单库条件更新仲裁，不能由消息到达顺序裁决是否已支付。

## 监控指标

| 指标 | 含义 |
| --- | --- |
| Consumer Lag | 消费堆积 |
| Under Replicated Partitions | 副本不足 |
| Offline Partitions | 不可用分区 |
| Request Latency | broker 请求延迟 |
| Rebalance Rate | 消费组重平衡频率 |
| Disk Usage | 日志磁盘使用 |

生产排查时，不要只看 Lag 的绝对值。更重要的是趋势：Lag 是持续增长、周期性波动，还是某个分区异常增长。单分区 Lag 异常通常说明 key 热点、消费者卡住或下游依赖变慢；全组 Lag 增长更可能是整体消费能力不足或上游流量突增。

## 常见坑

1. 认为 Kafka 是普通队列，消费完就删除。
2. 分区数随意设置，后期扩分区破坏 key 顺序。
3. 消费端不幂等，重试后重复执行业务。
4. Consumer Lag 只看总量，不看是否持续增长。
5. 把大对象直接写 Kafka，导致网络和磁盘压力异常。
6. 没有规划 schema 演进，字段变更导致下游消费失败。

## 验证入口

在具备权限的测试集群，用与集群版本匹配的 CLI 查看分区和组进度，替换示例地址与名称：

```bash
bin/kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic order.paid.v1
bin/kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group coupon-service
```

先核实每个分区 Leader、ISR 和 Lag，再定位慢分区的业务 key、处理耗时和下游依赖。消费提交失败要检查 rebalance、处理时长与 `max.poll.interval.ms`，不能只增加线程。回放必须使用隔离消费组或经过明确设计的 offset 调整，先评估是否会重复发券；记录消费者写库成功但未提交 offset 后退出的恢复结果，才能检验幂等是否有效。
