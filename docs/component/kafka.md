# Kafka

## kafka 是什么

Kafka 是一个开源的分布式事件流平台，是分布式、高吞吐、可扩展、持久化的消息队列系统，被广泛应用于大数据实时处理、消息队列的，等场景，最初由 LinkedIn 开发，后捐献给 Apache 基金会。

### 主要应用场景包括

1. 志收集系统

2. 微服务之间的解耦通信

3. 实时流式数据处理（如 Kafka + Flink/Spark）

4. 事件驱动架构（EDA） 的核心通道

### 设计目标

1. 高吞吐：每秒百万级消息

2. 可扩展：支持水平扩展

3. 高可用：数据通过副本机制保障

4. 持久性：消息写入磁盘，具备日志系统的能力

### 架构设计

                     +-------------------+
                     |   Kafka Cluster   |
                     +-------------------+
                         |         |
                         |         |
                    +--------+  +--------+
                    |Broker 1|  |Broker 2|  ... Broker N
                    +--------+  +--------+
                        |             |
                -----------------------------
                |                           |
         +-------------+           +---------------+
         |   Producer  |           |   Consumer     |
         +-------------+           +---------------+
**组件说明：**

| 组件                     | 作用                                               |
| ---------------------- | ------------------------------------------------ |
| **Producer**           | 生产者，负责发送消息到 Kafka                                |
| **Consumer**           | 消费者，从 Kafka 读取消息                                 |
| **Topic**              | 主题，消息的分类容器（逻辑划分）                                 |
| **Partition**          | 分区，主题的物理分片，Kafka 并发和顺序保证的关键                      |
| **Broker**             | Kafka 的一个服务器实例，一个节点                              |
| **Kafka Cluster**      | Kafka 集群，由多个 Broker 组成                           |
| **Zookeeper（或 KRaft）** | 用于管理 Kafka 集群的元数据、选举、健康状态等（新版本支持去 ZK 的 KRaft 模式） |

#### 组件功能详细介绍

##### 1. Topic（主题）

**基本定义**
Topic 是 Kafka 中的“主题”或“消息分类通道”，是消息逻辑归属的单位，是Kafka中消息的分类容器，所有消息都必须发送到某个主题中，消费者也只能从指定的 Topic 中消费。
> 类比理解：
>Kafka 是邮局
>Topic 是收件地址
>Producer 是寄件人
>Consumer 是收件人

##### 设计理念

1. 逻辑隔离
Kafka 是一个“多租户”的平台，不同系统/模块间不能互相干扰。每个业务（比如订单系统、支付系统）可以用一个 Topic。

2. 支持大规模分布式并发处理
一个 Topic 可以被划分成多个 Partition，每个 Partition 可以在不同的 Broker 上并发处理消息。Partition 提供了 Kafka 的可扩展性和高吞吐性。

3. 支持灵活的订阅模式
Kafka 支持一对一（一组消费者只消费一份数据）或一对多（多组消费者各自消费）模式。多个消费者组可以重复消费同一个 Topic 的消息，互不干扰。

##### Topic 的使用场景（典型业务实践）
✅ 场景 1：日志收集系统
>不同服务将日志发送到不同的 Topic，例如：access-log,error-log,debug-log等
>Kafka可以与 ELK、Flink 等工具协同做实时处理。

✅ 场景 2：电商平台的订单系统
>1. 用户下单后，消息发送到 Topic：order-created
>2. 支付成功后，写入 Topic：order-paid
>3. 发货通知写入 Topic：order-shipped

多个系统（库存、物流、通知）可以各自监听不同 Topic 或 同一个 Topic 的不同分区。

✅ 场景 3：用户行为埋点
>将用户点击、搜索、浏览等行为数据写入一个 Topic：user-events

后台系统实时处理用户数据，生成推荐、个性化配置等。

✅ 场景 4：消息驱动的微服务架构
> A 系统发送消息到 user-signup，B、C、D 系统都订阅该 Topic，异步做“发邮件”、“发优惠券”、“写入 CRM”等逻辑。

###### Topic常用命令

>默认你已安装 Kafka 并位于其根目录，命令都在 bin/ 目录下

**创建topic**

``` bash
# 创建一个名为 test-topic 的 Topic，3 个分区，1 个副本
bin/kafka-topics.sh --create \
    --bootstrap-server localhost:9092 \
    --replication-factor 1 \
    --partitions 3 \
    --topic test-topic
```

**查看topic**
``` bash
bin/kafka-topics.sh --list --bootstrap-server localhost:9092
```

**查看topic详情**
``` bash
bin/kafka-topics.sh --describe --topic test-topic --bootstrap-server localhost:9092
```

输出类似：
``` yaml
Topic: test-topic  PartitionCount:3  ReplicationFactor:1  Configs:segment.bytes=1073741824
    Partition: 0  Leader: 0  Replicas: 0  Isr: 0
    Partition: 1  Leader: 0  Replicas: 0  Isr: 0
    Partition: 2  Leader: 0  Replicas: 0  Isr: 0
```

解释：

* Leader：当前负责读写的副本所在 broker ID

* Replicas：该 partition 的所有副本

* Isr（In-Sync Replicas）：当前和 leader 同步的副本列表

**删除 Topic**

```bash
bin/kafka-topics.sh --delete --topic test-topic --bootstrap-server localhost:9092
```

>⚠️ 注意：需要在 server.properties 中配置 delete.topic.enable=true,删除不是立即生效，Kafka 会异步清理

**增加 Topic 的 Partition（⚠️ 注意顺序性问题）**
```bash
bin/kafka-topics.sh --alter \
    --topic test-topic \
    --bootstrap-server localhost:9092 \
    --partitions 6
```
>增加分区会打破原有 key 的 hash 到分区的规律，可能导致乱序（生产者有指定 key 的情况下）

##### 2. Partition（分区）

###### 基本定义

**Partition** 是 Kafka 中 Topic 的物理子集，是消息的 最小存储和并发处理单位,一个 Topic 可以包含多个Partition,一个**Partition**内部的消息是严格有序的（按 offset）,每个 Topic 被切分为多个分区。每个分区是一个有序的、不可变的消息队列。
>Kafka 的 Topic 类似一个“大水池”，而 Partition 是水池中并列的“水管”，数据是通过不同的水管进出。

###### 设计理念

Partition 的设计为 Kafka 提供了 可扩展性、高可用性、顺序性，主要体现在以下几方面：

1. 分布式并发能力
多个 Partition 可以分布在不同的 Broker 上，Producer 和 Consumer 可以并发对多个 Partition 读写，大幅提升性能。

2. 高吞吐 + 可水平扩展
当负载增加时，只需要增加 Partition 数量和 Consumer 数量，就可以轻松扩容。

3. 提供“局部有序”保障
Kafka 不保证 Topic 级别的全局顺序，但每个 Partition 内的消息是有序的。如果你希望消息是有序的，应将相关消息定向发送到同一个 Partition（通过设置 key）。

##### Partition 的常用命令

1. **创建 Topic 时指定分区数**
```bash
bin/kafka-topics.sh --create \
  --topic user-log \
  --partitions 4 \
  --replication-factor 1 \
  --bootstrap-server localhost:9092
--partitions 4：
#创建 4 个分区，Partition-0 到 Partition-3。
```

2. **修改分区数量（增加）**
```bash
bin/kafka-topics.sh --alter \
  --topic user-log \
  --partitions 6 \
  --bootstrap-server localhost:9092
```

⚠️ 注意：只能增加分区数，不能减少。增加后会影响有 key 的消息顺序性（key 到 partition 的映射会变）。

3. **查看特定 Partition 的消息（开发测试时常用）**

```bash
bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic user-log \
  --partition 0 \
  --from-beginning
```
4. **指定 key 发送到特定 Partition（生产者发送）**
```bash

bin/kafka-console-producer.sh \
  --broker-list localhost:9092 \
  --topic user-log \
  --property "parse.key=true" \
  --property "key.separator=:" 
  ```
>Kafka 会根据 key 的 hash 决定 Partition。

##### 分区数如何设计？（关键实践建议）

| 需求场景              | 建议分区数      |
| ----------------- | ---------- |
| 小型测试环境            | 1-3        |
| 单 Topic 吞吐 10MB/s | ≥ 3        |
| 每秒几万条消息的系统        | 10-30      |
| 实时大数据处理           | 50+，但需测压验证 |


#####  实践建议
分区数量 ≈ 预期消费者数量 × 每消费者处理能力 × 并发系数
不能一味多，过多分区会带来副作用：
1. 控制器压力变大

2. 文件句柄数量多

3. Topic 管理复杂

4. Broker 重启慢
