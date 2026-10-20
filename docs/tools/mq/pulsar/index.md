# Apache Pulsar：云原生消息与流平台

Apache Pulsar 是一个面向云原生和多租户场景的分布式消息与流平台。  
它把消息持久化交给 Apache BookKeeper，Broker 负责连接、主题所有权与分发，支持存储和计算独立扩展。这里的“Broker 无状态”只表示不把持久消息副本绑定在 Broker 本地磁盘，Broker 仍有连接、缓存和主题运行状态，故障迁移需要恢复并重新连接。

## 对象与职责

Pulsar 像一个“多租户消息平台”：业务按 Tenant/Namespace 隔离，Broker 负责接入和调度，BookKeeper 负责持久化日志，消费者通过不同订阅模式读取消息。

![Pulsar 的接入、持久化与元数据边界](/mq/pulsar-architecture.svg)

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
- 保存持久日志；封存 ledger 的分层卸载由 Pulsar 的 offloader 协调。

### Metadata Store

保存集群元数据：

- 租户、命名空间、Topic。
- Schema。
- Broker 负载。
- BookKeeper ledger 元数据。

## 四种订阅模式

| 模式 | 分发方式 | 顺序性 | 场景 |
| --- | --- | --- | --- |
| Exclusive | 订阅只允许一个消费者 | 主题分区内有序 | 单消费者处理 |
| Failover | 分区的活动消费者与备消费者 | 分区内有序 | 有序 + 高可用 |
| Shared | 多消费者轮询/分摊 | 弱 | 高吞吐任务处理 |
| Key_Shared | 同 key 路由到同消费者 | 满足发送、批处理与重投约束时按 key 处理 | 订单/用户维度并行 |

![Pulsar 四种订阅模式](/mq/pulsar-subscription-modes.svg)

订阅模式不提供整个分区 Topic 的全局顺序，也不保证异步任务完成顺序。Key_Shared 的生产端要禁用普通混 key batching，或采用 key-based batching；否则一个 batch 内不同 key 可能被分发给同一个消费者，破坏期望的按 key 分摊。重投、负确认和主动放宽有序策略还需另行验证，不能仅凭设置了 key 就宣称业务严格有序。

## 消息写入与消费流程

Pulsar 通过 subscription cursor 保存每个订阅的消费进度。不同订阅之间互不影响。

消费者业务提交后 ack 丢失，消息可能重新投递；cursor 不是业务事务。发券记录与去重记录应放在同一个数据库事务，重投时通过唯一约束确认已完成，再 ack。不同订阅有各自的积压与策略，但仍共享集群资源，不能把逻辑隔离理解成物理资源无干扰。

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

兼容性依赖所选策略与数据格式。Schema 检查不能证明业务单位和字段语义一致，例如把金额从“分”改成“元”仍可能满足数值类型；需在事件契约中固定含义，并用新旧消费者共同验证。

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

这样可以在保留长期历史消息的同时降低热存储成本。

offload 复制完成不代表热存储立刻删除，仍受卸载删除延迟和保留策略控制。长期回放还依赖对象存储可访问、凭据有效及 ledger 元数据仍存在，不能只备份对象文件就宣称整个订阅可恢复。

## Pulsar Functions 与 IO

典型用途：

- 消息过滤。
- 字段转换。
- 数据富化。
- 轻量实时 ETL。
- 从数据库导入或导出到外部系统。

例如 Pulsar IO 的 Source 从外部系统写入主题，Function 读取事件并补充标签后写入结果主题，Sink 再更新搜索索引。三者有各自的消费进度与失败策略；写到外部系统时仍要考虑重复和幂等，不能把 Function 看作跨数据库事务。

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

- `order-timeout-check` 可使用 Shared 或 Key_Shared 做延迟投递，按订单键分摊处理；延迟机制需要对应订阅模式支持。
- `coupon-issue` 使用 `Shared`，提高发券并行度。
- 发券服务仍然要幂等，避免重复投递导致重复发券。

延迟投递本身会让后发送的即时消息先到达，因此不能把它当作同订单完整事件的严格顺序机制。不同 Topic 的订阅也不保证同 key 落到同一进程。到期消息只触发带状态和时间条件的订单更新，支付和关闭竞争由数据库仲裁；支付已到账但关闭先成功时，需要退款或对账流程。

按 Pulsar 4.0.x 的机制，只有 Shared 和 Key_Shared 支持延迟投递，其他模式会立即分发。还要检查延迟跟踪与时间精度配置：允许提前一个 tick 的设置不能代替订单库的到期条件。TTL 必须覆盖预期延迟与恢复时间，否则消息可能在到期投递前被标记过期；长期延迟也会占用 backlog 和存储，应配置配额告警。

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

## 从积压定位到恢复

先确定 tenant、namespace、topic 与 subscription，再用匹配集群版本的管理 CLI 查看统计；下面示例需测试集群权限：

```bash
bin/pulsar-admin topics stats persistent://commerce/order-prod/order-paid
```

某个订阅积压增长时检查其消费速率、未确认量与下游耗时；多个主题一起变慢时再看 Broker 和 BookKeeper 的写延迟、磁盘与限流。重置 cursor 会导致回放或跳过业务，排错时不要直接执行。验收应包含消费者重启重投、不同 key 的 batch、延迟与即时消息交错、Bookie 故障后持久化与恢复，不只比较发布 TPS。
