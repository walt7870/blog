# Apache Kafka 详解

如果你想从消息中间件和事件流平台角度系统学习 Kafka，建议优先阅读 [Kafka：事件流平台完整入门](/docs/tools/mq/kafka)，其中整理了 16 集 Kafka 核心原理视频入口，并按 Topic、Partition、Consumer Group、可靠性、事务、存储和运维场景展开。

## 概述

Apache Kafka 是一个分布式流处理平台，最初由LinkedIn开发，现在是Apache软件基金会的顶级项目。Kafka被设计为一个高吞吐量、低延迟的分布式消息系统，能够处理大规模的实时数据流。

### 核心特性

- **高吞吐量**：单个Kafka集群可以处理数万亿条消息
- **低延迟**：消息延迟可以低至几毫秒
- **持久化**：消息持久化存储在磁盘上，支持数据重放
- **分布式**：天然支持分布式架构，具备高可用性
- **容错性**：通过副本机制保证数据不丢失
- **可扩展性**：支持水平扩展，可以动态增加节点

## 核心概念

### 1. Topic（主题）

```java
// Topic是消息的逻辑分类
public class TopicExample {
    
    /**
     * Topic特性：
     * - 消息的逻辑分组
     * - 可以有多个分区
     * - 支持多个生产者和消费者
     */
    public void createTopic() {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        
        try (AdminClient adminClient = AdminClient.create(props)) {
            // 创建Topic
            NewTopic newTopic = new NewTopic("user-events", 3, (short) 2);
            
            // 设置Topic配置
            Map<String, String> configs = new HashMap<>();
            configs.put("retention.ms", "604800000"); // 7天保留期
            configs.put("compression.type", "lz4");   // 压缩类型
            configs.put("cleanup.policy", "delete");  // 清理策略
            newTopic.configs(configs);
            
            CreateTopicsResult result = adminClient.createTopics(Arrays.asList(newTopic));
            result.all().get(); // 等待创建完成
            
            System.out.println("Topic创建成功");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    
    /**
     * 查询Topic信息
     */
    public void describeTopic() {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        
        try (AdminClient adminClient = AdminClient.create(props)) {
            DescribeTopicsResult result = adminClient.describeTopics(Arrays.asList("user-events"));
            
            result.all().get().forEach((topicName, description) -> {
                System.out.println("Topic: " + topicName);
                System.out.println("分区数: " + description.partitions().size());
                description.partitions().forEach(partition -> {
                    System.out.println("分区 " + partition.partition() + 
                                     ", Leader: " + partition.leader().id() +
                                     ", 副本: " + partition.replicas().stream()
                                                   .map(node -> String.valueOf(node.id()))
                                                   .collect(Collectors.joining(",")));
                });
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

### 2. Partition（分区）

```java
// 分区是Topic的物理分割
public class PartitionExample {
    
    /**
     * 分区特性：
     * - 每个分区是一个有序的消息序列
     * - 分区内消息有序，分区间无序
     * - 每个分区可以有多个副本
     * - 消费者数量不能超过分区数量
     */
    
    /**
     * 自定义分区器
     */
    public static class CustomPartitioner implements Partitioner {
        
        @Override
        public int partition(String topic, Object key, byte[] keyBytes, 
                           Object value, byte[] valueBytes, Cluster cluster) {
            
            List<PartitionInfo> partitions = cluster.partitionsForTopic(topic);
            int numPartitions = partitions.size();
            
            if (key == null) {
                // 轮询分配
                return ThreadLocalRandom.current().nextInt(numPartitions);
            }
            
            // 基于key的hash分区
            if (key instanceof String) {
                String stringKey = (String) key;
                
                // 特殊业务逻辑：VIP用户消息发送到特定分区
                if (stringKey.startsWith("VIP_")) {
                    return 0; // VIP用户消息都发送到分区0
                }
                
                // 普通用户按hash分区
                return Math.abs(stringKey.hashCode()) % numPartitions;
            }
            
            return Math.abs(key.hashCode()) % numPartitions;
        }
        
        @Override
        public void close() {
            // 清理资源
        }
        
        @Override
        public void configure(Map<String, ?> configs) {
            // 配置初始化
        }
    }
    
    /**
     * 分区重平衡监听器
     */
    public static class RebalanceListener implements ConsumerRebalanceListener {
        
        private final Consumer<String, String> consumer;
        private final Map<TopicPartition, OffsetAndMetadata> currentOffsets = new HashMap<>();
        
        public RebalanceListener(Consumer<String, String> consumer) {
            this.consumer = consumer;
        }
        
        @Override
        public void onPartitionsRevoked(Collection<TopicPartition> partitions) {
            System.out.println("分区被撤销: " + partitions);
            
            // 提交当前偏移量
            consumer.commitSync(currentOffsets);
            currentOffsets.clear();
        }
        
        @Override
        public void onPartitionsAssigned(Collection<TopicPartition> partitions) {
            System.out.println("分区被分配: " + partitions);
            
            // 可以在这里设置特定的偏移量
            for (TopicPartition partition : partitions) {
                // 从最新位置开始消费
                consumer.seekToEnd(Arrays.asList(partition));
            }
        }
        
        public void addOffset(TopicPartition partition, OffsetAndMetadata offset) {
            currentOffsets.put(partition, offset);
        }
    }
}
```

### 3. Producer（生产者）

```java
// 生产者负责发送消息到Kafka
public class ProducerExample {
    
    private KafkaProducer<String, String> producer;
    
    public ProducerExample() {
        Properties props = new Properties();
        
        // 基础配置
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        
        // 性能优化配置
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);        // 批次大小
        props.put(ProducerConfig.LINGER_MS_CONFIG, 10);            // 等待时间
        props.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 33554432);  // 缓冲区大小
        props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "lz4");  // 压缩类型
        
        // 可靠性配置
        props.put(ProducerConfig.ACKS_CONFIG, "all");             // 确认级别
        props.put(ProducerConfig.RETRIES_CONFIG, 3);               // 重试次数
        props.put(ProducerConfig.RETRY_BACKOFF_MS_CONFIG, 1000);   // 重试间隔
        props.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, 30000); // 请求超时
        
        // 幂等性配置
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        
        // 自定义分区器
        props.put(ProducerConfig.PARTITIONER_CLASS_CONFIG, 
                 PartitionExample.CustomPartitioner.class.getName());
        
        this.producer = new KafkaProducer<>(props);
    }
    
    /**
     * 同步发送消息
     */
    public void sendSync(String topic, String key, String value) {
        try {
            ProducerRecord<String, String> record = new ProducerRecord<>(topic, key, value);
            
            // 添加消息头
            record.headers().add("timestamp", String.valueOf(System.currentTimeMillis()).getBytes());
            record.headers().add("source", "user-service".getBytes());
            
            RecordMetadata metadata = producer.send(record).get();
            
            System.out.printf("消息发送成功: topic=%s, partition=%d, offset=%d%n",
                            metadata.topic(), metadata.partition(), metadata.offset());
                            
        } catch (Exception e) {
            System.err.println("消息发送失败: " + e.getMessage());
        }
    }
    
    /**
     * 异步发送消息
     */
    public void sendAsync(String topic, String key, String value) {
        ProducerRecord<String, String> record = new ProducerRecord<>(topic, key, value);
        
        producer.send(record, new Callback() {
            @Override
            public void onCompletion(RecordMetadata metadata, Exception exception) {
                if (exception != null) {
                    System.err.println("消息发送失败: " + exception.getMessage());
                    
                    // 可以实现重试逻辑或者记录失败消息
                    handleSendFailure(record, exception);
                } else {
                    System.out.printf("消息发送成功: topic=%s, partition=%d, offset=%d%n",
                                    metadata.topic(), metadata.partition(), metadata.offset());
                }
            }
        });
    }
    
    /**
     * 批量发送消息
     */
    public void sendBatch(String topic, List<String> messages) {
        List<Future<RecordMetadata>> futures = new ArrayList<>();
        
        for (int i = 0; i < messages.size(); i++) {
            String key = "key-" + i;
            String value = messages.get(i);
            
            ProducerRecord<String, String> record = new ProducerRecord<>(topic, key, value);
            Future<RecordMetadata> future = producer.send(record);
            futures.add(future);
        }
        
        // 等待所有消息发送完成
        for (Future<RecordMetadata> future : futures) {
            try {
                RecordMetadata metadata = future.get(10, TimeUnit.SECONDS);
                System.out.printf("批量消息发送成功: partition=%d, offset=%d%n",
                                metadata.partition(), metadata.offset());
            } catch (Exception e) {
                System.err.println("批量消息发送失败: " + e.getMessage());
            }
        }
    }
    
    /**
     * 事务性发送
     */
    public void sendTransactional(String topic, List<String> messages) {
        // 配置事务ID
        Properties props = new Properties();
        props.putAll(producer.configs());
        props.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "my-transactional-id");
        
        KafkaProducer<String, String> transactionalProducer = new KafkaProducer<>(props);
        
        try {
            // 初始化事务
            transactionalProducer.initTransactions();
            
            // 开始事务
            transactionalProducer.beginTransaction();
            
            // 发送消息
            for (int i = 0; i < messages.size(); i++) {
                ProducerRecord<String, String> record = 
                    new ProducerRecord<>(topic, "key-" + i, messages.get(i));
                transactionalProducer.send(record);
            }
            
            // 提交事务
            transactionalProducer.commitTransaction();
            System.out.println("事务提交成功");
            
        } catch (Exception e) {
            // 回滚事务
            transactionalProducer.abortTransaction();
            System.err.println("事务回滚: " + e.getMessage());
        } finally {
            transactionalProducer.close();
        }
    }
    
    private void handleSendFailure(ProducerRecord<String, String> record, Exception exception) {
        // 实现失败处理逻辑
        // 例如：记录到死信队列、重试、告警等
        System.err.println("处理发送失败的消息: " + record.value());
    }
    
    public void close() {
        producer.close();
    }
}
```

### 4. Consumer（消费者）

```java
// 消费者负责从Kafka读取消息
public class ConsumerExample {
    
    private KafkaConsumer<String, String> consumer;
    private final AtomicBoolean running = new AtomicBoolean(true);
    
    public ConsumerExample(String groupId) {
        Properties props = new Properties();
        
        // 基础配置
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        
        // 消费策略配置
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest"); // 从最早开始消费
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);     // 手动提交偏移量
        props.put(ConsumerConfig.AUTO_COMMIT_INTERVAL_MS_CONFIG, 5000); // 自动提交间隔
        
        // 性能配置
        props.put(ConsumerConfig.FETCH_MIN_BYTES_CONFIG, 1024);         // 最小拉取字节数
        props.put(ConsumerConfig.FETCH_MAX_WAIT_MS_CONFIG, 500);        // 最大等待时间
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 500);         // 单次拉取最大记录数
        props.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, 30000);     // 会话超时时间
        props.put(ConsumerConfig.HEARTBEAT_INTERVAL_MS_CONFIG, 10000);  // 心跳间隔
        
        this.consumer = new KafkaConsumer<>(props);
    }
    
    /**
     * 基本消费模式
     */
    public void basicConsume(String topic) {
        consumer.subscribe(Arrays.asList(topic));
        
        try {
            while (running.get()) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(1000));
                
                for (ConsumerRecord<String, String> record : records) {
                    System.out.printf("消费消息: topic=%s, partition=%d, offset=%d, key=%s, value=%s%n",
                                    record.topic(), record.partition(), record.offset(),
                                    record.key(), record.value());
                    
                    // 处理消息
                    processMessage(record);
                }
                
                // 手动提交偏移量
                consumer.commitSync();
            }
        } catch (Exception e) {
            System.err.println("消费异常: " + e.getMessage());
        } finally {
            consumer.close();
        }
    }
    
    /**
     * 批量消费模式
     */
    public void batchConsume(String topic, int batchSize) {
        consumer.subscribe(Arrays.asList(topic));
        
        List<ConsumerRecord<String, String>> batch = new ArrayList<>();
        
        try {
            while (running.get()) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(1000));
                
                for (ConsumerRecord<String, String> record : records) {
                    batch.add(record);
                    
                    if (batch.size() >= batchSize) {
                        processBatch(batch);
                        
                        // 提交批次中最后一条消息的偏移量
                        ConsumerRecord<String, String> lastRecord = batch.get(batch.size() - 1);
                        Map<TopicPartition, OffsetAndMetadata> offsets = new HashMap<>();
                        offsets.put(
                            new TopicPartition(lastRecord.topic(), lastRecord.partition()),
                            new OffsetAndMetadata(lastRecord.offset() + 1)
                        );
                        consumer.commitSync(offsets);
                        
                        batch.clear();
                    }
                }
            }
            
            // 处理剩余的消息
            if (!batch.isEmpty()) {
                processBatch(batch);
            }
            
        } catch (Exception e) {
            System.err.println("批量消费异常: " + e.getMessage());
        } finally {
            consumer.close();
        }
    }
    
    /**
     * 指定分区消费
     */
    public void consumeSpecificPartitions(String topic, List<Integer> partitions) {
        List<TopicPartition> topicPartitions = partitions.stream()
            .map(partition -> new TopicPartition(topic, partition))
            .collect(Collectors.toList());
            
        consumer.assign(topicPartitions);
        
        // 从特定偏移量开始消费
        for (TopicPartition partition : topicPartitions) {
            consumer.seek(partition, 100); // 从偏移量100开始
        }
        
        try {
            while (running.get()) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(1000));
                
                for (ConsumerRecord<String, String> record : records) {
                    System.out.printf("指定分区消费: partition=%d, offset=%d, value=%s%n",
                                    record.partition(), record.offset(), record.value());
                    
                    processMessage(record);
                }
                
                consumer.commitSync();
            }
        } catch (Exception e) {
            System.err.println("指定分区消费异常: " + e.getMessage());
        } finally {
            consumer.close();
        }
    }
    
    /**
     * 消费者组重平衡
     */
    public void consumeWithRebalance(String topic) {
        PartitionExample.RebalanceListener rebalanceListener = 
            new PartitionExample.RebalanceListener(consumer);
            
        consumer.subscribe(Arrays.asList(topic), rebalanceListener);
        
        try {
            while (running.get()) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(1000));
                
                for (ConsumerRecord<String, String> record : records) {
                    processMessage(record);
                    
                    // 记录偏移量用于重平衡时提交
                    TopicPartition partition = new TopicPartition(record.topic(), record.partition());
                    OffsetAndMetadata offset = new OffsetAndMetadata(record.offset() + 1);
                    rebalanceListener.addOffset(partition, offset);
                }
                
                consumer.commitAsync();
            }
        } catch (Exception e) {
            System.err.println("重平衡消费异常: " + e.getMessage());
        } finally {
            consumer.close();
        }
    }
    
    private void processMessage(ConsumerRecord<String, String> record) {
        try {
            // 模拟消息处理
            Thread.sleep(10);
            
            // 检查消息头
            record.headers().forEach(header -> {
                System.out.printf("消息头: %s = %s%n", 
                                header.key(), new String(header.value()));
            });
            
            // 业务逻辑处理
            handleBusinessLogic(record.value());
            
        } catch (Exception e) {
            System.err.println("消息处理失败: " + e.getMessage());
            // 可以实现重试或死信队列逻辑
        }
    }
    
    private void processBatch(List<ConsumerRecord<String, String>> batch) {
        System.out.println("批量处理 " + batch.size() + " 条消息");
        
        // 批量业务处理
        List<String> values = batch.stream()
            .map(ConsumerRecord::value)
            .collect(Collectors.toList());
            
        handleBatchBusinessLogic(values);
    }
    
    private void handleBusinessLogic(String message) {
        // 实现具体的业务逻辑
        System.out.println("处理业务消息: " + message);
    }
    
    private void handleBatchBusinessLogic(List<String> messages) {
        // 实现批量业务逻辑
        System.out.println("批量处理业务消息: " + messages.size() + " 条");
    }
    
    public void shutdown() {
        running.set(false);
    }
}
```

## Kafka架构

### 1. 集群架构

```yaml
# Kafka集群架构配置
kafka-cluster:
  brokers:
    - id: 1
      host: kafka-1.example.com
      port: 9092
      log.dirs: /var/kafka-logs-1
      
    - id: 2
      host: kafka-2.example.com
      port: 9092
      log.dirs: /var/kafka-logs-2
      
    - id: 3
      host: kafka-3.example.com
      port: 9092
      log.dirs: /var/kafka-logs-3
  
  zookeeper:
    ensemble:
      - zk-1.example.com:2181
      - zk-2.example.com:2181
      - zk-3.example.com:2181
    
  replication:
    default.replication.factor: 3
    min.insync.replicas: 2
    
  performance:
    num.network.threads: 8
    num.io.threads: 16
    socket.send.buffer.bytes: 102400
    socket.receive.buffer.bytes: 102400
    socket.request.max.bytes: 104857600
```

### 2. 存储机制

```java
// Kafka存储机制说明
public class KafkaStorageExample {
    
    /**
     * Kafka存储结构：
     * 
     * /var/kafka-logs/
     * ├── topic-partition-0/
     * │   ├── 00000000000000000000.log    # 日志段文件
     * │   ├── 00000000000000000000.index  # 偏移量索引
     * │   ├── 00000000000000000000.timeindex # 时间戳索引
     * │   ├── 00000000000000001000.log
     * │   ├── 00000000000000001000.index
     * │   └── leader-epoch-checkpoint     # Leader纪元检查点
     * └── topic-partition-1/
     *     ├── 00000000000000000000.log
     *     └── ...
     */
    
    /**
     * 日志段管理
     */
    public void logSegmentManagement() {
        // 日志段配置
        Properties props = new Properties();
        
        // 日志段大小配置
        props.put("log.segment.bytes", "1073741824");      // 1GB
        props.put("log.segment.ms", "604800000");          // 7天
        
        // 日志保留配置
        props.put("log.retention.hours", "168");          // 7天
        props.put("log.retention.bytes", "1073741824");   // 1GB
        
        // 日志清理配置
        props.put("log.cleanup.policy", "delete");       // 删除策略
        props.put("log.cleaner.enable", "true");         // 启用日志清理
        
        // 压缩配置
        props.put("compression.type", "lz4");            // 压缩类型
        
        System.out.println("日志段管理配置完成");
    }
    
    /**
     * 索引机制
     */
    public void indexMechanism() {
        /**
         * Kafka使用两种索引：
         * 
         * 1. 偏移量索引(.index)：
         *    - 稀疏索引，不是每条消息都有索引项
         *    - 索引项格式：(相对偏移量, 物理位置)
         *    - 用于快速定位消息在日志文件中的位置
         * 
         * 2. 时间戳索引(.timeindex)：
         *    - 基于时间戳的索引
         *    - 索引项格式：(时间戳, 相对偏移量)
         *    - 用于基于时间的消息查找
         */
        
        // 索引配置
        Properties indexProps = new Properties();
        indexProps.put("log.index.interval.bytes", "4096");  // 索引间隔
        indexProps.put("log.index.size.max.bytes", "10485760"); // 索引文件最大大小
        
        System.out.println("索引机制配置完成");
    }
}
```

## 性能优化

### 1. 生产者优化

```java
// 生产者性能优化
public class ProducerOptimization {
    
    /**
     * 高性能生产者配置
     */
    public KafkaProducer<String, String> createHighPerformanceProducer() {
        Properties props = new Properties();
        
        // 基础配置
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        
        // 批处理优化
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 65536);        // 64KB批次大小
        props.put(ProducerConfig.LINGER_MS_CONFIG, 20);            // 等待20ms收集更多消息
        props.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 67108864);  // 64MB缓冲区
        
        // 压缩优化
        props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "lz4");  // 使用LZ4压缩
        
        // 网络优化
        props.put(ProducerConfig.SEND_BUFFER_CONFIG, 131072);      // 128KB发送缓冲区
        props.put(ProducerConfig.RECEIVE_BUFFER_CONFIG, 65536);    // 64KB接收缓冲区
        
        // 并发优化
        props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);
        
        // 可靠性与性能平衡
        props.put(ProducerConfig.ACKS_CONFIG, "1");               // 只等待Leader确认
        props.put(ProducerConfig.RETRIES_CONFIG, 3);
        props.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, 10000);
        
        return new KafkaProducer<>(props);
    }
    
    /**
     * 异步批量发送优化
     */
    public void optimizedAsyncSend() {
        KafkaProducer<String, String> producer = createHighPerformanceProducer();
        
        // 使用线程池进行异步发送
        ExecutorService executor = Executors.newFixedThreadPool(10);
        
        List<String> messages = generateMessages(10000);
        
        // 分批异步发送
        int batchSize = 100;
        for (int i = 0; i < messages.size(); i += batchSize) {
            int endIndex = Math.min(i + batchSize, messages.size());
            List<String> batch = messages.subList(i, endIndex);
            
            executor.submit(() -> {
                for (String message : batch) {
                    ProducerRecord<String, String> record = 
                        new ProducerRecord<>("high-throughput-topic", message);
                    
                    producer.send(record, (metadata, exception) -> {
                        if (exception != null) {
                            System.err.println("发送失败: " + exception.getMessage());
                        }
                    });
                }
            });
        }
        
        executor.shutdown();
        producer.close();
    }
    
    private List<String> generateMessages(int count) {
        List<String> messages = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            messages.add("Message-" + i + "-" + System.currentTimeMillis());
        }
        return messages;
    }
}
```

### 2. 消费者优化

```java
// 消费者性能优化
public class ConsumerOptimization {
    
    /**
     * 高性能消费者配置
     */
    public KafkaConsumer<String, String> createHighPerformanceConsumer(String groupId) {
        Properties props = new Properties();
        
        // 基础配置
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        
        // 拉取优化
        props.put(ConsumerConfig.FETCH_MIN_BYTES_CONFIG, 50000);        // 50KB最小拉取
        props.put(ConsumerConfig.FETCH_MAX_WAIT_MS_CONFIG, 500);        // 最大等待500ms
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 1000);        // 单次最多1000条
        props.put(ConsumerConfig.FETCH_MAX_BYTES_CONFIG, 52428800);     // 50MB最大拉取
        
        // 网络优化
        props.put(ConsumerConfig.RECEIVE_BUFFER_CONFIG, 262144);        // 256KB接收缓冲区
        props.put(ConsumerConfig.SEND_BUFFER_CONFIG, 131072);           // 128KB发送缓冲区
        
        // 会话管理
        props.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, 30000);     // 30s会话超时
        props.put(ConsumerConfig.HEARTBEAT_INTERVAL_MS_CONFIG, 10000);  // 10s心跳间隔
        
        // 偏移量管理
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);     // 手动提交
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "latest");
        
        return new KafkaConsumer<>(props);
    }
    
    /**
     * 多线程消费优化
     */
    public void multiThreadConsume(String topic, int threadCount) {
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        
        for (int i = 0; i < threadCount; i++) {
            final int threadId = i;
            executor.submit(() -> {
                KafkaConsumer<String, String> consumer = 
                    createHighPerformanceConsumer("high-perf-group-" + threadId);
                
                consumer.subscribe(Arrays.asList(topic));
                
                try {
                    while (true) {
                        ConsumerRecords<String, String> records = 
                            consumer.poll(Duration.ofMillis(1000));
                        
                        if (!records.isEmpty()) {
                            // 并行处理消息
                            records.forEach(record -> {
                                processMessageAsync(record);
                            });
                            
                            // 批量提交偏移量
                            consumer.commitAsync();
                        }
                    }
                } catch (Exception e) {
                    System.err.println("消费线程 " + threadId + " 异常: " + e.getMessage());
                } finally {
                    consumer.close();
                }
            });
        }
    }
    
    /**
     * 流水线消费模式
     */
    public void pipelineConsume(String topic) {
        KafkaConsumer<String, String> consumer = createHighPerformanceConsumer("pipeline-group");
        consumer.subscribe(Arrays.asList(topic));
        
        // 创建处理队列
        BlockingQueue<ConsumerRecord<String, String>> processingQueue = 
            new LinkedBlockingQueue<>(10000);
        
        // 启动处理线程池
        ExecutorService processingPool = Executors.newFixedThreadPool(20);
        for (int i = 0; i < 20; i++) {
            processingPool.submit(() -> {
                while (true) {
                    try {
                        ConsumerRecord<String, String> record = processingQueue.take();
                        processMessage(record);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            });
        }
        
        // 消费线程
        try {
            while (true) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(1000));
                
                for (ConsumerRecord<String, String> record : records) {
                    // 非阻塞放入处理队列
                    if (!processingQueue.offer(record)) {
                        System.err.println("处理队列已满，丢弃消息");
                    }
                }
                
                // 定期提交偏移量
                consumer.commitAsync();
            }
        } finally {
            consumer.close();
            processingPool.shutdown();
        }
    }
    
    private void processMessageAsync(ConsumerRecord<String, String> record) {
        // 异步处理消息
        CompletableFuture.runAsync(() -> {
            processMessage(record);
        });
    }
    
    private void processMessage(ConsumerRecord<String, String> record) {
        // 模拟消息处理
        try {
            Thread.sleep(1); // 模拟处理时间
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
```

## 监控与运维

### 1. 监控指标

```java
// Kafka监控指标收集
public class KafkaMonitoring {
    
    private final MeterRegistry meterRegistry;
    
    public KafkaMonitoring(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }
    
    /**
     * 生产者监控
     */
    public void monitorProducer(KafkaProducer<String, String> producer) {
        // 获取生产者指标
        Map<MetricName, ? extends Metric> metrics = producer.metrics();
        
        // 关键指标监控
        metrics.forEach((metricName, metric) -> {
            String name = metricName.name();
            
            switch (name) {
                case "record-send-rate":
                    // 消息发送速率
                    meterRegistry.gauge("kafka.producer.record.send.rate", metric.metricValue());
                    break;
                    
                case "record-error-rate":
                    // 消息错误率
                    meterRegistry.gauge("kafka.producer.record.error.rate", metric.metricValue());
                    break;
                    
                case "request-latency-avg":
                    // 平均请求延迟
                    meterRegistry.gauge("kafka.producer.request.latency.avg", metric.metricValue());
                    break;
                    
                case "buffer-available-bytes":
                    // 可用缓冲区大小
                    meterRegistry.gauge("kafka.producer.buffer.available.bytes", metric.metricValue());
                    break;
                    
                case "batch-size-avg":
                    // 平均批次大小
                    meterRegistry.gauge("kafka.producer.batch.size.avg", metric.metricValue());
                    break;
            }
        });
    }
    
    /**
     * 消费者监控
     */
    public void monitorConsumer(KafkaConsumer<String, String> consumer) {
        Map<MetricName, ? extends Metric> metrics = consumer.metrics();
        
        metrics.forEach((metricName, metric) -> {
            String name = metricName.name();
            
            switch (name) {
                case "records-consumed-rate":
                    // 消息消费速率
                    meterRegistry.gauge("kafka.consumer.records.consumed.rate", metric.metricValue());
                    break;
                    
                case "fetch-latency-avg":
                    // 平均拉取延迟
                    meterRegistry.gauge("kafka.consumer.fetch.latency.avg", metric.metricValue());
                    break;
                    
                case "records-lag-max":
                    // 最大消费滞后
                    meterRegistry.gauge("kafka.consumer.records.lag.max", metric.metricValue());
                    break;
                    
                case "fetch-size-avg":
                    // 平均拉取大小
                    meterRegistry.gauge("kafka.consumer.fetch.size.avg", metric.metricValue());
                    break;
            }
        });
    }
    
    /**
     * 集群监控
     */
    public void monitorCluster() {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        
        try (AdminClient adminClient = AdminClient.create(props)) {
            // 监控Topic信息
            ListTopicsResult topicsResult = adminClient.listTopics();
            Set<String> topics = topicsResult.names().get();
            
            meterRegistry.gauge("kafka.cluster.topics.count", topics.size());
            
            // 监控每个Topic的分区信息
            for (String topic : topics) {
                DescribeTopicsResult describeResult = 
                    adminClient.describeTopics(Arrays.asList(topic));
                
                TopicDescription description = describeResult.all().get().get(topic);
                int partitionCount = description.partitions().size();
                
                meterRegistry.gauge("kafka.topic.partitions.count", 
                                  Tags.of("topic", topic), partitionCount);
                
                // 监控副本状态
                for (TopicPartitionInfo partition : description.partitions()) {
                    int replicaCount = partition.replicas().size();
                    int isrCount = partition.isr().size();
                    
                    meterRegistry.gauge("kafka.partition.replicas.count",
                                      Tags.of("topic", topic, "partition", String.valueOf(partition.partition())),
                                      replicaCount);
                    
                    meterRegistry.gauge("kafka.partition.isr.count",
                                      Tags.of("topic", topic, "partition", String.valueOf(partition.partition())),
                                      isrCount);
                }
            }
            
        } catch (Exception e) {
            System.err.println("集群监控异常: " + e.getMessage());
        }
    }
    
    /**
     * 消费者组监控
     */
    public void monitorConsumerGroups() {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        
        try (AdminClient adminClient = AdminClient.create(props)) {
            // 获取所有消费者组
            ListConsumerGroupsResult groupsResult = adminClient.listConsumerGroups();
            Collection<ConsumerGroupListing> groups = groupsResult.all().get();
            
            for (ConsumerGroupListing group : groups) {
                String groupId = group.groupId();
                
                // 获取消费者组详情
                DescribeConsumerGroupsResult describeResult = 
                    adminClient.describeConsumerGroups(Arrays.asList(groupId));
                
                ConsumerGroupDescription description = 
                    describeResult.all().get().get(groupId);
                
                // 监控消费者组成员数量
                int memberCount = description.members().size();
                meterRegistry.gauge("kafka.consumer.group.members.count",
                                  Tags.of("group", groupId), memberCount);
                
                // 监控消费者组状态
                String state = description.state().toString();
                meterRegistry.gauge("kafka.consumer.group.state",
                                  Tags.of("group", groupId, "state", state), 1);
                
                // 监控消费滞后
                ListConsumerGroupOffsetsResult offsetsResult = 
                    adminClient.listConsumerGroupOffsets(groupId);
                
                Map<TopicPartition, OffsetAndMetadata> offsets = 
                    offsetsResult.partitionsToOffsetAndMetadata().get();
                
                for (Map.Entry<TopicPartition, OffsetAndMetadata> entry : offsets.entrySet()) {
                    TopicPartition partition = entry.getKey();
                    long consumerOffset = entry.getValue().offset();
                    
                    // 获取分区的最新偏移量
                    // 这里需要额外的逻辑来获取最新偏移量并计算滞后
                    
                    meterRegistry.gauge("kafka.consumer.group.offset",
                                      Tags.of("group", groupId, 
                                             "topic", partition.topic(),
                                             "partition", String.valueOf(partition.partition())),
                                      consumerOffset);
                }
            }
            
        } catch (Exception e) {
            System.err.println("消费者组监控异常: " + e.getMessage());
        }
    }
}
```

### 2. 运维脚本

```bash
#!/bin/bash
# Kafka运维管理脚本

KAFKA_HOME="/opt/kafka"
KAFKA_CONFIG="$KAFKA_HOME/config/server.properties"
ZOOKEEPER_CONNECT="localhost:2181"
BOOTSTRAP_SERVERS="localhost:9092"

# 1. 集群健康检查
check_cluster_health() {
    echo "检查Kafka集群健康状态..."
    
    # 检查Kafka进程
    if pgrep -f "kafka.Kafka" > /dev/null; then
        echo "✓ Kafka进程运行正常"
    else
        echo "✗ Kafka进程未运行"
        return 1
    fi
    
    # 检查ZooKeeper连接
    if $KAFKA_HOME/bin/kafka-broker-api-versions.sh --bootstrap-server $BOOTSTRAP_SERVERS > /dev/null 2>&1; then
        echo "✓ Kafka集群连接正常"
    else
        echo "✗ Kafka集群连接异常"
        return 1
    fi
    
    # 检查Topic列表
    topic_count=$($KAFKA_HOME/bin/kafka-topics.sh --bootstrap-server $BOOTSTRAP_SERVERS --list | wc -l)
    echo "✓ 当前Topic数量: $topic_count"
    
    return 0
}

# 2. Topic管理
manage_topics() {
    echo "Topic管理操作..."
    
    # 创建Topic
    create_topic() {
        local topic_name=$1
        local partitions=${2:-3}
        local replication_factor=${3:-2}
        
        echo "创建Topic: $topic_name (分区:$partitions, 副本:$replication_factor)"
        
        $KAFKA_HOME/bin/kafka-topics.sh \
            --bootstrap-server $BOOTSTRAP_SERVERS \
            --create \
            --topic $topic_name \
            --partitions $partitions \
            --replication-factor $replication_factor \
            --config retention.ms=604800000 \
            --config compression.type=lz4
    }
    
    # 删除Topic
    delete_topic() {
        local topic_name=$1
        echo "删除Topic: $topic_name"
        
        $KAFKA_HOME/bin/kafka-topics.sh \
            --bootstrap-server $BOOTSTRAP_SERVERS \
            --delete \
            --topic $topic_name
    }
    
    # 修改Topic配置
    modify_topic() {
        local topic_name=$1
        local config_key=$2
        local config_value=$3
        
        echo "修改Topic配置: $topic_name ($config_key=$config_value)"
        
        $KAFKA_HOME/bin/kafka-configs.sh \
            --bootstrap-server $BOOTSTRAP_SERVERS \
            --entity-type topics \
            --entity-name $topic_name \
            --alter \
            --add-config $config_key=$config_value
    }
    
    # 增加分区
    increase_partitions() {
        local topic_name=$1
        local new_partition_count=$2
        
        echo "增加Topic分区: $topic_name (新分区数:$new_partition_count)"
        
        $KAFKA_HOME/bin/kafka-topics.sh \
            --bootstrap-server $BOOTSTRAP_SERVERS \
            --alter \
            --topic $topic_name \
            --partitions $new_partition_count
    }
}

# 3. 消费者组管理
manage_consumer_groups() {
    echo "消费者组管理..."
    
    # 列出所有消费者组
    list_consumer_groups() {
        echo "当前消费者组列表:"
        $KAFKA_HOME/bin/kafka-consumer-groups.sh \
            --bootstrap-server $BOOTSTRAP_SERVERS \
            --list
    }
    
    # 查看消费者组详情
    describe_consumer_group() {
        local group_id=$1
        echo "消费者组详情: $group_id"
        
        $KAFKA_HOME/bin/kafka-consumer-groups.sh \
            --bootstrap-server $BOOTSTRAP_SERVERS \
            --group $group_id \
            --describe
    }
    
    # 重置消费者组偏移量
    reset_consumer_group_offset() {
        local group_id=$1
        local topic=$2
        local reset_type=${3:-"earliest"}
        
        echo "重置消费者组偏移量: $group_id (Topic:$topic, 重置到:$reset_type)"
        
        $KAFKA_HOME/bin/kafka-consumer-groups.sh \
            --bootstrap-server $BOOTSTRAP_SERVERS \
            --group $group_id \
            --topic $topic \
            --reset-offsets \
            --to-$reset_type \
            --execute
    }
    
    # 删除消费者组
    delete_consumer_group() {
        local group_id=$1
        echo "删除消费者组: $group_id"
        
        $KAFKA_HOME/bin/kafka-consumer-groups.sh \
            --bootstrap-server $BOOTSTRAP_SERVERS \
            --group $group_id \
            --delete
    }
}

# 4. 性能测试
performance_test() {
    echo "Kafka性能测试..."
    
    # 生产者性能测试
    producer_perf_test() {
        local topic=$1
        local num_records=${2:-100000}
        local record_size=${3:-1024}
        local throughput=${4:-10000}
        
        echo "生产者性能测试: Topic=$topic, 消息数=$num_records, 消息大小=$record_size, 吞吐量=$throughput"
        
        $KAFKA_HOME/bin/kafka-producer-perf-test.sh \
            --topic $topic \
            --num-records $num_records \
            --record-size $record_size \
            --throughput $throughput \
            --producer-props bootstrap.servers=$BOOTSTRAP_SERVERS \
                            acks=1 \
                            compression.type=lz4 \
                            batch.size=65536 \
                            linger.ms=10
    }
    
    # 消费者性能测试
    consumer_perf_test() {
        local topic=$1
        local messages=${2:-100000}
        
        echo "消费者性能测试: Topic=$topic, 消息数=$messages"
        
        $KAFKA_HOME/bin/kafka-consumer-perf-test.sh \
            --topic $topic \
            --messages $messages \
            --bootstrap-server $BOOTSTRAP_SERVERS \
            --consumer-props group.id=perf-test-group \
                            fetch.min.bytes=50000 \
                            fetch.max.wait.ms=500
    }
}

# 5. 数据备份与恢复
backup_and_restore() {
    echo "数据备份与恢复..."
    
    # 备份Topic数据
    backup_topic() {
        local topic=$1
        local backup_dir=$2
        local from_beginning=${3:-true}
        
        echo "备份Topic数据: $topic -> $backup_dir"
        
        mkdir -p $backup_dir
        
        if [ "$from_beginning" = "true" ]; then
            offset_reset="--from-beginning"
        else
            offset_reset=""
        fi
        
        $KAFKA_HOME/bin/kafka-console-consumer.sh \
            --bootstrap-server $BOOTSTRAP_SERVERS \
            --topic $topic \
            $offset_reset \
            --property print.key=true \
            --property key.separator=: \
            --timeout-ms 30000 > $backup_dir/${topic}_backup_$(date +%Y%m%d_%H%M%S).txt
    }
    
    # 恢复Topic数据
    restore_topic() {
        local topic=$1
        local backup_file=$2
        
        echo "恢复Topic数据: $backup_file -> $topic"
        
        $KAFKA_HOME/bin/kafka-console-producer.sh \
            --bootstrap-server $BOOTSTRAP_SERVERS \
            --topic $topic \
            --property parse.key=true \
            --property key.separator=: < $backup_file
    }
}

# 6. 日志清理
clean_logs() {
    echo "清理Kafka日志..."
    
    # 清理过期日志段
    clean_expired_logs() {
        local log_dir="/var/kafka-logs"
        local retention_days=${1:-7}
        
        echo "清理 $retention_days 天前的日志文件"
        
        find $log_dir -name "*.log" -mtime +$retention_days -delete
        find $log_dir -name "*.index" -mtime +$retention_days -delete
        find $log_dir -name "*.timeindex" -mtime +$retention_days -delete
        
        echo "日志清理完成"
    }
    
    # 清理孤立的索引文件
    clean_orphaned_indexes() {
        local log_dir="/var/kafka-logs"
        
        echo "清理孤立的索引文件"
        
        # 查找没有对应.log文件的.index文件
        find $log_dir -name "*.index" | while read index_file; do
            log_file="${index_file%.index}.log"
            if [ ! -f "$log_file" ]; then
                echo "删除孤立索引文件: $index_file"
                rm -f "$index_file"
            fi
        done
    }
}

# 7. 监控告警
monitoring_alerts() {
    echo "监控告警检查..."
    
    # 检查磁盘使用率
    check_disk_usage() {
        local log_dir="/var/kafka-logs"
        local threshold=${1:-85}
        
        disk_usage=$(df $log_dir | awk 'NR==2 {print $5}' | sed 's/%//')
        
        if [ $disk_usage -gt $threshold ]; then
            echo "⚠ 磁盘使用率过高: ${disk_usage}% (阈值: ${threshold}%)"
            send_alert "Kafka磁盘使用率告警" "当前使用率: ${disk_usage}%"
        else
            echo "✓ 磁盘使用率正常: ${disk_usage}%"
        fi
    }
    
    # 检查消费滞后
    check_consumer_lag() {
        local group_id=$1
        local lag_threshold=${2:-10000}
        
        lag_info=$($KAFKA_HOME/bin/kafka-consumer-groups.sh \
                   --bootstrap-server $BOOTSTRAP_SERVERS \
                   --group $group_id \
                   --describe | awk 'NR>1 {sum+=$5} END {print sum}')
        
        if [ "$lag_info" != "" ] && [ $lag_info -gt $lag_threshold ]; then
            echo "⚠ 消费滞后过高: $lag_info (阈值: $lag_threshold)"
            send_alert "Kafka消费滞后告警" "消费者组: $group_id, 滞后: $lag_info"
        else
            echo "✓ 消费滞后正常: $lag_info"
        fi
    }
    
    # 发送告警
    send_alert() {
        local title=$1
        local message=$2
        
        # 这里可以集成各种告警方式：邮件、钉钉、企业微信等
        echo "[ALERT] $title: $message"
        
        # 示例：发送到日志文件
        echo "$(date): $title - $message" >> /var/log/kafka-alerts.log
    }
}

# 主函数
main() {
    case $1 in
        "health")
            check_cluster_health
            ;;
        "topics")
            manage_topics
            ;;
        "groups")
            manage_consumer_groups
            ;;
        "perf")
            performance_test
            ;;
        "backup")
            backup_and_restore
            ;;
        "clean")
            clean_logs
            ;;
        "monitor")
            monitoring_alerts
            ;;
        *)
            echo "用法: $0 {health|topics|groups|perf|backup|clean|monitor}"
            exit 1
            ;;
    esac
}

# 执行主函数
main $@
```

## 最佳实践

### 1. 架构设计

- **合理的分区策略**：根据业务特点和消费者数量设计分区数
- **副本配置**：生产环境建议至少3个副本，确保高可用
- **Topic命名规范**：使用有意义的命名，便于管理和监控
- **消息格式设计**：使用Avro、Protobuf等序列化格式

### 2. 性能优化

- **批处理优化**：合理设置batch.size和linger.ms
- **压缩配置**：根据网络和CPU情况选择压缩算法
- **内存配置**：合理分配JVM堆内存和页缓存
- **网络优化**：调整网络缓冲区大小

### 3. 运维管理

- **监控体系**：建立完善的监控和告警机制
- **容量规划**：根据业务增长预估容量需求
- **备份策略**：定期备份重要数据和配置
- **升级策略**：制定滚动升级方案

### 4. 安全配置

- **认证授权**：配置SASL/SSL认证
- **网络隔离**：使用防火墙和VPC隔离
- **数据加密**：启用传输和存储加密
- **审计日志**：记录关键操作日志

## 总结

Apache Kafka作为现代数据架构的核心组件，在大数据处理、实时流计算、微服务通信等场景中发挥着重要作用。通过合理的架构设计、性能优化和运维管理，可以构建高可用、高性能的消息系统，为业务提供可靠的数据传输保障。

掌握Kafka的核心概念、API使用、性能调优和运维技巧，是大数据工程师和架构师的必备技能。随着云原生技术的发展，Kafka也在不断演进，支持更多的部署模式和集成方案。
