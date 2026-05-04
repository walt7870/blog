# RabbitMQ：从概念到生产实践

RabbitMQ 是一个成熟的消息代理（Message Broker），最核心的特点是**路由能力强、协议支持丰富、任务队列好用、管理工具友好**。  
它非常适合业务系统里的异步任务、削峰填谷、事件通知和微服务解耦。

## 一句话理解

RabbitMQ 像一个“带规则的分拣中心”：生产者把消息交给 `Exchange`，`Exchange` 根据规则把消息投递到一个或多个 `Queue`，消费者从队列里取消息处理。

```mermaid
flowchart LR
  P1[Producer] --> E[Exchange]
  E -->|Binding: error| Q1[Queue: error]
  E -->|Binding: info| Q2[Queue: info]
  E -->|Binding: order.*| Q3[Queue: order events]
  Q1 --> C1[Consumer A]
  Q2 --> C2[Consumer B]
  Q3 --> C3[Consumer C]
```

## 适合与不适合

适合：

- 后台任务队列：发邮件、发短信、生成文件、同步第三方。
- 业务事件分发：订单创建后通知库存、优惠券、CRM。
- 复杂路由：按业务类型、日志级别、主题模式分发。
- 中小规模微服务异步解耦。

不适合：

- 超高吞吐事件流和长期历史回放，优先考虑 Kafka/Pulsar。
- 把队列当数据库长期堆积消息。
- 需要海量分区流处理生态的场景。

## 核心组件

| 组件 | 作用 |
| --- | --- |
| Producer | 生产者，发送消息 |
| Exchange | 交换机，接收并路由消息 |
| Queue | 队列，存储消息 |
| Binding | 绑定关系，定义 Exchange 到 Queue 的路由规则 |
| Routing Key | 路由键，消息路由依据 |
| Consumer | 消费者，处理队列消息 |
| Connection | TCP 连接，成本较高 |
| Channel | 连接内的轻量逻辑通道，AMQP 操作主要发生在 Channel 上 |
| Virtual Host | 逻辑隔离空间，类似命名空间 |

## Exchange 类型

| 类型 | 路由方式 | 典型用途 |
| --- | --- | --- |
| Direct | routing key 完全匹配 | 明确类型分发，如 `error`、`order_paid` |
| Fanout | 忽略 routing key，广播到所有绑定队列 | 系统广播、缓存刷新 |
| Topic | 通配符匹配，`*` 匹配一个单词，`#` 匹配多个单词 | 事件总线，如 `order.*` |
| Headers | 根据消息头匹配 | 复杂规则，使用较少 |

Topic Exchange 示例：

```txt
binding key: order.*        匹配 order.created、order.paid
binding key: order.#        匹配 order.created、order.payment.success
binding key: *.error        匹配 payment.error、stock.error
```

## 消息发送与消费流程

```mermaid
sequenceDiagram
  participant P as Producer
  participant E as Exchange
  participant Q as Queue
  participant C as Consumer

  P->>E: basic.publish(exchange, routingKey, message)
  E->>Q: 根据 binding 路由到队列
  Q->>C: 投递消息
  C->>C: 执行业务逻辑
  C-->>Q: basic.ack
```

如果消费者处理失败，可以 `nack/reject`，让消息重新入队或进入死信队列。

## 可靠性能力

RabbitMQ 的可靠性分两段：

1. **生产者 -> RabbitMQ**：靠 Publisher Confirms 确认 broker 已接收。
2. **RabbitMQ -> 消费者**：靠 Consumer Acknowledgements 确认消费者已处理。

```mermaid
flowchart LR
  P[Producer] -->|publish| B[(Broker)]
  B -->|publisher confirm| P
  B -->|deliver| C[Consumer]
  C -->|ack/nack| B
```

生产建议：

- 队列 `durable=true`
- 消息 `delivery_mode=2`
- 开启 publisher confirm
- 消费者手动 ack
- 业务侧做幂等

## TTL、死信与重试

RabbitMQ 常用 TTL + DLX 实现延迟重试：

```mermaid
flowchart TD
  MainQ[主队列] --> C[消费者]
  C -->|失败 nack/reject| RetryQ[重试队列 TTL]
  RetryQ -->|TTL 到期 DLX| MainQ
  C -->|超过最大次数| DLQ[死信队列]
```

核心参数：

- `x-message-ttl`：消息过期时间。
- `x-dead-letter-exchange`：死信交换机。
- `x-dead-letter-routing-key`：死信路由键。
- `x-max-length`：队列最大消息数。
- `x-max-length-bytes`：队列最大容量。

## 队列类型

| 队列类型 | 特点 | 使用建议 |
| --- | --- | --- |
| Classic Queue | 传统队列，功能成熟 | 简单场景可用 |
| Quorum Queue | 基于 Raft 的复制队列，高可用 | 生产环境高可靠队列优先考虑 |
| Stream | 追加日志模型，支持重复读取和回放 | 大 fan-out、回放、高吞吐场景 |

Quorum Queue 更适合需要高可用和数据安全的业务队列；Stream 更接近日志流，不是传统任务队列。

## 集群与跨集群

| 能力 | 说明 |
| --- | --- |
| Clustering | 多节点组成 RabbitMQ 集群 |
| Quorum Queue Replication | 队列副本通过 Raft 保持一致 |
| Federation | 跨集群按需转发消息 |
| Shovel | 从一个 broker/queue 主动搬运消息到另一个位置 |

简单理解：

- 同机房高可用：集群 + Quorum Queue。
- 跨地域松耦合：Federation。
- 数据迁移/桥接：Shovel。

## 权限与隔离

RabbitMQ 通过 `Virtual Host` 做逻辑隔离：

```txt
/prod-order
/prod-payment
/test-order
```

每个用户可以配置：

- configure：能否声明 exchange/queue/binding。
- write：能否发布消息。
- read：能否消费消息。

生产环境应删除默认 `guest/guest` 或限制其访问范围。

## 统一案例：订单超时关闭 + 支付成功发券

### 拓扑设计

```mermaid
flowchart LR
  Order[订单服务] -->|order.created| Ex[order.event.exchange topic]
  Payment[支付服务] -->|order.paid| Ex

  Ex -->|order.created| DelayQ[order.timeout.delay.queue TTL 30m]
  DelayQ -->|DLX 到期| TimeoutQ[order.timeout.check.queue]
  TimeoutQ --> TimeoutC[超时检查消费者]

  Ex -->|order.paid| CouponQ[coupon.issue.queue]
  CouponQ --> CouponC[发券消费者]

  TimeoutC --> OrderDB[(订单库)]
  CouponC --> CouponDB[(券库)]
  TimeoutQ --> TimeoutDLQ[timeout.dlq]
  CouponQ --> CouponDLQ[coupon.dlq]
```

### 处理逻辑

1. 下单成功发布 `order.created`。
2. 消息进入延迟队列，30 分钟 TTL 到期后转入超时检查队列。
3. 消费者查询订单状态：
   - 未支付：关闭订单。
   - 已支付/已取消：忽略。
4. 支付成功发布 `order.paid`。
5. 发券消费者按 `orderId` 幂等发券。

### 关键点

- 超时关闭不能只依赖消息，要以订单库状态为准。
- 发券必须幂等，避免重复消费导致重复发券。
- 死信队列要接入告警，不能只堆在那里。

## 监控指标

| 指标 | 含义 | 排查方向 |
| --- | --- | --- |
| Ready | 待消费消息数 | 消费能力不足或下游慢 |
| Unacked | 已投递未确认 | 消费者卡住或 ack 逻辑异常 |
| Publish rate | 发布速率 | 上游流量 |
| Deliver rate | 投递速率 | 消费处理能力 |
| Connections/Channels | 连接与信道数 | 是否泄漏或过度建连 |
| Disk/Memory watermark | 资源水位 | 触发流控会影响生产 |

## 常见坑

1. 自动 ack 导致“业务失败但消息已确认”。
2. 重试没有上限，毒丸消息无限循环。
3. 消息体太大，把 MQ 当文件存储。
4. 单队列承载所有业务，热点明显。
5. 只配置 durable 队列，忘了消息持久化。
6. 没有 publisher confirm，生产者以为发成功但 broker 没收到。

## 参考资料整理

- [RabbitMQ Tutorials](https://www.rabbitmq.com/tutorials.html)：官方入门教程，覆盖 work queue、publish/subscribe、routing、topic 等模式。
- [Consumer Acknowledgements and Publisher Confirms](https://www.rabbitmq.com/docs/next/confirms)：解释 ack 与 confirm 的边界。
- [Quorum Queues](https://www.rabbitmq.com/docs/quorum-queues)：生产高可用队列能力。
- [Streams](https://www.rabbitmq.com/docs/streams)：RabbitMQ 的日志流能力。
- [Federation Reference](https://www.rabbitmq.com/federation-reference.html)：跨集群消息转发。
