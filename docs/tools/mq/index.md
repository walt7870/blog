# 消息中间件全景：选型、能力与落地

消息中间件（MQ）不是简单的“队列工具”，它解决的是分布式系统里的**异步解耦、削峰填谷、事件分发、可靠投递、状态同步和流式处理**问题。

一套业务系统从单体走向微服务或事件驱动时，最先遇到的通常不是“怎么发一条消息”，而是：

- 下游系统慢了，主链路要不要等？
- 多个系统都关心一个业务事件，谁来通知？
- 失败要重试几次？重复消费怎么办？
- 消息要保留多久？能不能回放？
- 是否需要顺序、事务、延时、广播、多租户？

这篇是总览页，重点回答“为什么需要 MQ、怎么选、落地时要设计什么”。具体组件能力见：

- [Kafka](/docs/tools/mq/kafka)
- [RabbitMQ](/docs/tools/mq/rabbitmq)
- [RocketMQ](/docs/tools/mq/rocketmq)
- [Pulsar](/docs/tools/mq/pulsar/)

## 视频学习入口

| 系列 | 链接 | 搭配阅读 |
| --- | --- | --- |
| Kafka 核心原理科普 | [从第 01 集开始](https://www.bilibili.com/video/BV1fA7N64EiL) | 看完后阅读 [Kafka](./kafka.md)，重点补 Topic、Partition、Consumer Group、事务和容量规划 |
| RocketMQ 核心原理科普 | [RocketMQ 01](https://www.bilibili.com/video/BV1DH7N65EF3) | 看完后阅读 [RocketMQ](./rocketmq.md)，重点补事务消息、延迟消息、顺序消息和存储结构 |
| RabbitMQ | 暂无配套视频 | 先阅读 [RabbitMQ](./rabbitmq.md)，重点理解 Exchange、Queue、Binding、Confirm、Ack、TTL 与 DLX |

## MQ 在系统中的位置

![MQ 在系统中的位置](/mq/mq-system-position.svg)

核心变化是：主链路只完成必要的业务提交，耗时或可异步的动作交给 MQ 后面的消费者处理。

## MQ 解决的典型问题

| 问题 | 不用 MQ 的表现 | 使用 MQ 后 |
| --- | --- | --- |
| 应用解耦 | A 服务直接调用 B/C/D，任一下游失败影响主链路 | A 只发布事件，下游各自订阅 |
| 削峰填谷 | 高峰流量直接打爆数据库或第三方接口 | 消息先进入队列，消费者按能力处理 |
| 异步任务 | 用户请求等待慢操作完成 | 请求快速返回，后台异步执行 |
| 广播通知 | 逐个调用订阅方 | 多消费者订阅同一事件 |
| 事件回放 | 历史事件丢失，无法重建状态 | 保留消息后可重新消费 |
| 最终一致性 | 分布式事务复杂 | 通过事件、重试、幂等、补偿实现 |

## 主流组件能力地图

| 组件 | 核心模型 | 最强能力 | 典型场景 | 选型关键词 |
| --- | --- | --- | --- | --- |
| RabbitMQ | Exchange + Queue | 灵活路由、任务队列、协议生态 | 业务异步、任务分发、微服务解耦 | 好上手、路由强 |
| Kafka | Topic + Partition Log | 高吞吐、可回放、流处理生态 | 日志、埋点、CDC、实时数据管道 | 事件流、数据平台 |
| RocketMQ | Topic + Queue | 事务消息、顺序消息、延时消息 | 订单、支付、库存、交易链路 | 业务语义强 |
| Pulsar | Topic + Subscription + BookKeeper | 多租户、存算分离、多订阅模型 | 云原生统一消息平台、跨地域 | 平台化、多租户 |

## 选型流程图

![消息中间件选型流程](/mq/mq-selection-flow.svg)

## 消息投递的基本语义

| 语义 | 含义 | 风险 | 落地建议 |
| --- | --- | --- | --- |
| 至多一次 | 最多投递一次 | 可能丢消息 | 只适合日志、指标等可丢场景 |
| 至少一次 | 至少成功投递一次 | 可能重复 | 最常见，消费者必须幂等 |
| 精确一次 | 业务结果看起来只发生一次 | 实现复杂 | 依赖事务、幂等、状态机组合 |

现实工程里不要幻想“MQ 帮我保证业务绝对只执行一次”。更可靠的做法是：**MQ 至少一次 + 消费者幂等 + 业务状态机约束**。

## 一个标准消息处理链路

![标准消息处理链路](/mq/mq-delivery-semantics.svg)

## 落地前必须设计的 8 件事

1. **消息契约**：字段、版本、兼容策略、事件命名。
2. **Topic/Queue 规划**：按业务域拆分，不要所有消息共用一个主题。
3. **消息键设计**：用于分区、顺序、幂等和排查。
4. **投递语义**：至少一次、至多一次，还是需要事务协同。
5. **幂等策略**：唯一键、防重表、状态机、乐观锁。
6. **失败策略**：重试次数、退避间隔、死信、人工补偿。
7. **消息生命周期**：TTL、保留时间、归档、清理。
8. **监控告警**：堆积、延迟、失败率、重试量、死信量。

## 统一案例：订单超时关闭 + 支付成功发券

这套案例会在每篇组件文档里展开：

![订单超时关闭与支付成功发券](/mq/mq-order-timeout-coupon.svg)

核心业务规则：

- 下单 30 分钟未支付，自动关闭订单。
- 支付成功后异步发券。
- 超时关闭和支付成功存在竞态，订单状态机必须兜底。
- 发券必须幂等，不能重复发。

不同组件实现方式：

| 组件 | 推荐实现 |
| --- | --- |
| RabbitMQ | TTL + DLX 实现延时检查，失败进入重试/死信 |
| Kafka | 事件流 + 调度服务，适合可回放和审计 |
| RocketMQ | 延时消息 + 事务消息，最贴近交易业务语义 |
| Pulsar | Delayed Delivery + Key_Shared，同订单保序并行消费 |

## 参考链接整理

- RabbitMQ：官方 Tutorials、Publisher Confirms、Consumer Acknowledgements、Quorum Queues、Streams、Federation
- Kafka：官方 Documentation、Design、Producer Configs、Exactly Once Semantics、Transactions
- RocketMQ：官方 Message、Normal/FIFO/Delay/Transaction Message、Consumer Group、Retry Policy
- Pulsar：官方 Architecture、Messaging、Schema、Tiered Storage、Geo-Replication、Functions、Connectors
