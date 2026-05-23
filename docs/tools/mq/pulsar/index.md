# Apache Pulsar：云原生消息与流平台

Apache Pulsar 是一个面向云原生和多租户场景的分布式消息与流平台。  
它和 Kafka、RabbitMQ 最大的不同在于：**Broker 无状态，消息存储交给 Apache BookKeeper，天然支持存储计算分离和多租户治理**。

## 一句话理解

Pulsar 像一个“多租户消息平台”：业务按 Tenant/Namespace 隔离，Broker 负责接入和调度，BookKeeper 负责持久化日志，消费者通过不同订阅模式读取消息。

![Pulsar 多租户消息平台](/mq/pulsar-platform-overview.svg)

## 适合与不适合

适合：

- 多业务线共用一套消息平台。
- 需要租户、命名空间、配额和权限治理。
- 需要存储和计算独立扩展。
- 需要多订阅模型、跨地域复制、分层存储。

不适合：

- 团队只需要简单任务队列，RabbitMQ 更轻。
- 主要依赖 Kafka 生态和 Kafka Streams，Kafka 更成熟。
- 运维团队暂时不想维护 Broker + BookKeeper + 元数据组件。

## 核心对象模型

| 对象 | 说明 |
| --- | --- |
| Tenant | 租户，最高级别的管理和隔离单位 |
| Namespace | 租户下的逻辑空间，用于配置策略、配额、权限 |
| Topic | 消息主题 |
| Partitioned Topic | 分区主题，提高并行度 |
| Subscription | 订阅，保存消费进度和分发语义 |
| Producer | 生产者 |
| Consumer | 消费者 |
| Reader | 类似低级别读取 API，可从指定位置读 |

Topic 命名格式：

```txt
persistent://tenant/namespace/topic
non-persistent://tenant/namespace/topic
```

## 架构组件

![Pulsar 架构组件](/mq/pulsar-architecture.svg)

### Broker

Broker 主要负责：

- 客户端连接。
- Topic lookup。
- 消息路由和分发。
- 订阅和游标管理。
- 权限、限流、配额。

### BookKeeper

BookKeeper 负责持久化存储：

- 消息写入 ledger。
- 多副本复制。
- 高可用和故障恢复。
- 支持历史数据分层存储。

### Metadata Store

保存集群元数据：

- 租户、命名空间、Topic。
- Schema。
- Broker 负载。
- BookKeeper ledger 元数据。

## 四种订阅模式

| 模式 | 分发方式 | 顺序性 | 场景 |
| --- | --- | --- | --- |
| Exclusive | 单消费者独占 | 强 | 严格单消费者处理 |
| Failover | 主备消费者 | 强 | 有序 + 高可用 |
| Shared | 多消费者轮询/分摊 | 弱 | 高吞吐任务处理 |
| Key_Shared | 同 key 到同消费者 | key 内有序 | 订单/用户维度保序 |

![Pulsar 四种订阅模式](/mq/pulsar-subscription-modes.svg)

## 消息写入与消费流程

![Pulsar 消息写入与消费流程](/mq/pulsar-write-consume-flow.svg)

Pulsar 通过 subscription cursor 保存每个订阅的消费进度。不同订阅之间互不影响。

## Schema 能力

Pulsar 内置 Schema Registry，支持：

- Avro
- JSON
- Protobuf
- KeyValue
- Bytes/String 等基础类型

Schema 的价值：

- 生产端和消费端共享消息结构。
- 防止不兼容字段变更。
- 支持 schema 演进和版本管理。

## 高级能力

| 能力 | 说明 | 场景 |
| --- | --- | --- |
| Delayed Delivery | 延迟投递消息 | 超时任务、延迟通知 |
| Message TTL | 消息过期 | 控制堆积与生命周期 |
| Retention | 消息保留 | 回放与审计 |
| Backlog Quota | 堆积配额 | 防止租户占满资源 |
| Geo-Replication | 跨集群复制 | 多地域容灾 |
| Tiered Storage | 分层存储 | 历史数据低成本保存 |
| Pulsar Functions | 轻量流处理 | 消息转换、过滤、富化 |
| Pulsar IO | Source/Sink 连接器 | 对接数据库、文件、其他 MQ |

## 分层存储

Pulsar 可以把已经封存的 BookKeeper ledger 下沉到对象存储，例如 S3、GCS、Azure Blob。

![Pulsar 分层存储](/mq/pulsar-tiered-storage.svg)

这样可以在保留长期历史消息的同时降低热存储成本。

## Pulsar Functions 与 IO

![Pulsar Functions 与 IO](/mq/pulsar-functions-io.svg)

典型用途：

- 消息过滤。
- 字段转换。
- 数据富化。
- 轻量实时 ETL。
- 从数据库导入或导出到外部系统。

## 统一案例：订单超时关闭 + 支付成功发券

### 资源规划

| 层级 | 示例 |
| --- | --- |
| Tenant | `commerce` |
| Namespace | `order-prod` |
| Topic | `persistent://commerce/order-prod/order-created` |
| Topic | `persistent://commerce/order-prod/order-timeout-check` |
| Topic | `persistent://commerce/order-prod/order-paid` |
| Topic | `persistent://commerce/order-prod/coupon-issue` |

### 流程图

![Pulsar 订单超时与发券流程](/mq/pulsar-order-case.svg)

### 订阅设计

- `order-timeout-check` 使用 `Key_Shared`，同一个 `orderId` 的检查和状态事件尽量落到同一消费者。
- `coupon-issue` 使用 `Shared`，提高发券并行度。
- 发券服务仍然要幂等，避免重复投递导致重复发券。

## 监控指标

| 指标 | 含义 |
| --- | --- |
| backlog | 订阅堆积 |
| msgRateIn/msgRateOut | 生产/消费速率 |
| publish latency | 生产延迟 |
| dispatch rate | broker 分发速率 |
| BookKeeper write latency | 存储写入延迟 |
| storage size | 存储占用 |
| subscription ack rate | ack 速率 |

## 常见坑

1. Shared 订阅用于要求同 key 顺序的业务。
2. Tenant/Namespace 没规划好，后期权限和配额混乱。
3. 不设置 backlog quota，单业务堆积影响整个平台。
4. 只关注 Broker，忽略 BookKeeper 磁盘和写延迟。
5. Schema 演进不受控，下游消费失败。
6. 把 Functions 当复杂计算平台，导致职责过重。

## 参考资料整理

- [Pulsar Overview](https://pulsar.apache.org/docs/next/concepts-overview/)：Pulsar 总体能力。
- [Architecture Overview](https://pulsar.apache.org/docs/next/concepts-architecture-overview)：Broker、BookKeeper、Metadata Store 架构。
- [Messaging Concepts](https://pulsar.apache.org/docs/next/concepts-messaging)：Topic、Subscription、ack、retention 等消息概念。
- [Schema Overview](https://pulsar.apache.org/docs/next/schema-overview)：内置 Schema Registry。
- [Tiered Storage](https://pulsar.apache.org/docs/next/concepts-tiered-storage)：分层存储。
