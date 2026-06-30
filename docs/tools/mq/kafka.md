# Kafka：事件流平台完整入门

Kafka 不只是消息队列，它更准确的定位是**分布式事件流平台**。  
它把消息当作可持久化、可顺序读取、可回放的日志来管理，因此特别适合日志、埋点、实时数据管道、CDC 和事件驱动架构。

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

## 一句话理解

Kafka 像一组可扩展的“分区日志文件”：生产者不断追加事件，消费者按自己的 offset 读取事件。消息不会因为某个消费者读过就立即消失，其他消费者组仍然可以继续读取。

![Kafka Topic、Partition 与消费者组](/mq/kafka-topic-partition-consumers.svg)

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
| KRaft | 新版 Kafka 元数据管理模式，逐步替代 ZooKeeper |

## Topic、Partition 与顺序

Kafka 的顺序保证是：**同一个 Partition 内有序，Topic 全局不保证有序**。

![Kafka 分区顺序模型](/mq/kafka-topic-partition-order.svg)

如果你希望同一个订单的事件有序，必须让相同 `orderId` 的消息进入同一个分区。

分区设计要同时看吞吐、顺序、扩容和治理成本。分区数太少，消费并行度和写入吞吐上不去；分区数太多，会增加 Broker 文件句柄、元数据管理、Leader 选举和 Rebalance 成本。更重要的是，扩分区会改变 key 到分区的映射，可能破坏同一个 key 的长期顺序假设。

常见规划方式：

1. 先估算写入峰值、单分区吞吐和消费者处理能力。
2. 再确认哪些事件必须按 key 保序，例如 `orderId`、`userId`、`deviceId`。
3. 给未来增长留余量，但不要为了“保险”无限加分区。
4. 对核心 Topic 建立命名、分区数、保留时间、Schema 和负责人标准。

## Consumer Group 工作方式

同一个 Consumer Group 内，一个分区同时只能分配给一个消费者；不同消费者组之间互不影响。

![Kafka Consumer Group 工作方式](/mq/kafka-consumer-groups.svg)

注意：

- 分区数是同组消费并行度的上限。
- 消费者数量超过分区数，多出来的消费者会空闲。
- 扩容/缩容消费者会触发 rebalance。

## 写入流程

![Kafka 写入与读取流程](/mq/kafka-write-fetch-flow.svg)

生产可靠性关键参数：

- `acks=all`：等待 ISR 副本确认。
- `enable.idempotence=true`：生产端幂等，减少重试重复。
- `retries`：允许失败重试。
- `min.insync.replicas`：最少同步副本数。

如果追求可靠性，通常会组合使用 `acks=all`、`enable.idempotence=true` 和合理的 `min.insync.replicas`。如果追求吞吐，则会关注 batch、linger、compression、buffer memory 和分区并行。可靠性和吞吐不是绝对对立，但要明确业务更怕“丢”还是更怕“慢”。

## 保留、压缩与回放

Kafka 消息保留不依赖消费者是否消费，而依赖 Topic 配置：

| 能力 | 说明 | 场景 |
| --- | --- | --- |
| 时间保留 | 保留最近 N 小时/天消息 | 普通事件流 |
| 大小保留 | 保留到指定磁盘大小 | 控制成本 |
| Log Compaction | 按 key 保留最后一条记录 | 状态快照、配置变更 |
| Tiered Storage | 历史数据下沉到低成本存储 | 长期保留和回放 |

这也是 Kafka 和传统队列最大的差异之一：Kafka 天然支持“重复消费”和“历史回放”。

## 事务与 Exactly Once

Kafka 支持：

- 幂等生产者：避免生产端重试导致重复写入。
- 事务生产者：把多分区写入和 offset 提交放入同一事务。
- Exactly Once Semantics：主要服务于 Kafka Streams 或消费-处理-再写入 Kafka 的链路。

但业务系统仍然要注意：

- 调用外部接口无法天然纳入 Kafka 事务。
- 数据库写入仍需业务幂等或 Outbox 模式。
- “精确一次”更多是端到端设计结果，不只是一个配置。

## 常见架构模式

### 1) 日志与埋点管道

![Kafka 日志与埋点管道](/mq/kafka-log-pipeline.svg)

### 2) CDC 数据同步

![Kafka CDC 数据同步](/mq/kafka-cdc-pipeline.svg)

### 3) Outbox 最终一致性

业务服务先在同一个数据库事务里写业务表和 outbox 表，再由 outbox relay 投递 Kafka。

![Kafka Outbox 最终一致性](/mq/kafka-outbox-flow.svg)

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

## 参考资料整理

- [Apache Kafka Documentation](https://kafka.apache.org/documentation)：官方总文档。
- [Kafka Design](https://kafka.apache.org/31/design/design/)：理解日志、分区、复制和顺序写设计。
- [Producer Configs](https://kafka.apache.org/27/configuration/producer-configs/)：生产者可靠性与吞吐参数。
- [Idempotent Producer](https://cwiki.apache.org/confluence/display/KAFKA/Idempotent+Producer)：生产端幂等机制。
- [KIP-98 Exactly Once Semantics](https://cwiki.apache.org/confluence/display/KAFKA/KIP-98%2B-%2BExactly%2BOnce%2BDelivery%2Band%2BTransactional%2BMessaging)：事务与精确一次语义。
