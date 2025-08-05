# NoSQL数据库详解

## 概述

NoSQL（Not Only SQL）数据库是为了应对大数据、高并发、分布式计算等现代应用需求而发展起来的非关系型数据库。与传统的关系型数据库相比，NoSQL数据库具有更好的可扩展性、灵活性和性能，特别适合处理大规模、非结构化或半结构化数据。

### NoSQL的特点

- **灵活的数据模型**：支持多种数据结构，无需预定义模式
- **水平扩展性**：支持分布式架构，可线性扩展
- **高性能**：针对特定场景优化，读写性能优异
- **高可用性**：支持数据复制和故障转移
- **最终一致性**：采用BASE理论，保证最终数据一致性

## NoSQL数据库分类

### 1. 键值存储（Key-Value Store）

键值存储是最简单的NoSQL数据库类型，数据以键值对的形式存储。

#### Redis示例

```java
// Redis Java客户端使用示例
public class RedisKeyValueExample {
    
    private Jedis jedis;
    
    public RedisKeyValueExample() {
        // 连接Redis
        jedis = new Jedis("localhost", 6379);
        
        // 如果有密码
        // jedis.auth("password");
        
        // 选择数据库
        jedis.select(0);
    }
    
    /**
     * 基本字符串操作
     */
    public void stringOperations() {
        // 设置键值
        jedis.set("user:1001:name", "张三");
        jedis.set("user:1001:age", "25");
        jedis.set("user:1001:email", "zhangsan@example.com");
        
        // 设置带过期时间的键值
        jedis.setex("session:abc123", 3600, "user_data"); // 1小时过期
        
        // 获取值
        String name = jedis.get("user:1001:name");
        String age = jedis.get("user:1001:age");
        
        System.out.println("用户姓名: " + name + ", 年龄: " + age);
        
        // 批量操作
        jedis.mset("key1", "value1", "key2", "value2", "key3", "value3");
        List<String> values = jedis.mget("key1", "key2", "key3");
        
        // 原子操作
        Long newAge = jedis.incr("user:1001:age"); // 年龄+1
        jedis.decr("user:1001:age"); // 年龄-1
        
        // 检查键是否存在
        boolean exists = jedis.exists("user:1001:name");
        
        // 删除键
        jedis.del("session:abc123");
    }
    
    /**
     * 哈希操作
     */
    public void hashOperations() {
        String userKey = "user:1002";
        
        // 设置哈希字段
        jedis.hset(userKey, "name", "李四");
        jedis.hset(userKey, "age", "30");
        jedis.hset(userKey, "city", "北京");
        
        // 批量设置哈希字段
        Map<String, String> userInfo = new HashMap<>();
        userInfo.put("name", "王五");
        userInfo.put("age", "28");
        userInfo.put("city", "上海");
        userInfo.put("profession", "工程师");
        jedis.hmset("user:1003", userInfo);
        
        // 获取哈希字段
        String name = jedis.hget(userKey, "name");
        String age = jedis.hget(userKey, "age");
        
        // 获取所有字段
        Map<String, String> allFields = jedis.hgetAll(userKey);
        System.out.println("用户信息: " + allFields);
        
        // 获取多个字段
        List<String> fields = jedis.hmget(userKey, "name", "age", "city");
        
        // 检查字段是否存在
        boolean hasAge = jedis.hexists(userKey, "age");
        
        // 获取所有字段名
        Set<String> fieldNames = jedis.hkeys(userKey);
        
        // 删除字段
        jedis.hdel(userKey, "city");
    }
    
    /**
     * 列表操作
     */
    public void listOperations() {
        String listKey = "message_queue";
        
        // 从左侧推入元素
        jedis.lpush(listKey, "message1", "message2", "message3");
        
        // 从右侧推入元素
        jedis.rpush(listKey, "message4", "message5");
        
        // 获取列表长度
        long length = jedis.llen(listKey);
        System.out.println("列表长度: " + length);
        
        // 获取列表范围内的元素
        List<String> messages = jedis.lrange(listKey, 0, -1); // 获取所有元素
        System.out.println("所有消息: " + messages);
        
        // 从左侧弹出元素
        String leftMessage = jedis.lpop(listKey);
        
        // 从右侧弹出元素
        String rightMessage = jedis.rpop(listKey);
        
        // 阻塞式弹出（用于消息队列）
        List<String> result = jedis.blpop(10, listKey); // 10秒超时
        
        // 修剪列表
        jedis.ltrim(listKey, 0, 99); // 保留前100个元素
    }
    
    /**
     * 集合操作
     */
    public void setOperations() {
        String setKey1 = "tags:user:1001";
        String setKey2 = "tags:user:1002";
        
        // 添加元素到集合
        jedis.sadd(setKey1, "java", "python", "redis", "mysql");
        jedis.sadd(setKey2, "python", "redis", "mongodb", "elasticsearch");
        
        // 获取集合所有元素
        Set<String> tags1 = jedis.smembers(setKey1);
        System.out.println("用户1的标签: " + tags1);
        
        // 检查元素是否存在
        boolean hasJava = jedis.sismember(setKey1, "java");
        
        // 获取集合大小
        long size = jedis.scard(setKey1);
        
        // 随机获取元素
        String randomTag = jedis.srandmember(setKey1);
        
        // 集合运算
        Set<String> intersection = jedis.sinter(setKey1, setKey2); // 交集
        Set<String> union = jedis.sunion(setKey1, setKey2); // 并集
        Set<String> difference = jedis.sdiff(setKey1, setKey2); // 差集
        
        System.out.println("交集: " + intersection);
        System.out.println("并集: " + union);
        System.out.println("差集: " + difference);
        
        // 移除元素
        jedis.srem(setKey1, "mysql");
    }
    
    /**
     * 有序集合操作
     */
    public void sortedSetOperations() {
        String zsetKey = "leaderboard";
        
        // 添加元素（带分数）
        jedis.zadd(zsetKey, 100, "player1");
        jedis.zadd(zsetKey, 200, "player2");
        jedis.zadd(zsetKey, 150, "player3");
        jedis.zadd(zsetKey, 300, "player4");
        
        // 批量添加
        Map<String, Double> scoreMembers = new HashMap<>();
        scoreMembers.put("player5", 250.0);
        scoreMembers.put("player6", 180.0);
        jedis.zadd(zsetKey, scoreMembers);
        
        // 获取排名（按分数从低到高）
        Set<String> topPlayers = jedis.zrange(zsetKey, 0, 2); // 前3名
        System.out.println("分数最低的3名: " + topPlayers);
        
        // 获取排名（按分数从高到低）
        Set<String> bottomPlayers = jedis.zrevrange(zsetKey, 0, 2); // 前3名
        System.out.println("分数最高的3名: " + bottomPlayers);
        
        // 获取带分数的排名
        Set<Tuple> playersWithScores = jedis.zrangeWithScores(zsetKey, 0, -1);
        for (Tuple tuple : playersWithScores) {
            System.out.println("玩家: " + tuple.getElement() + ", 分数: " + tuple.getScore());
        }
        
        // 获取分数范围内的元素
        Set<String> midRangePlayers = jedis.zrangeByScore(zsetKey, 150, 250);
        
        // 获取元素的分数
        Double score = jedis.zscore(zsetKey, "player2");
        
        // 获取元素的排名
        Long rank = jedis.zrank(zsetKey, "player2"); // 从低到高的排名
        Long revRank = jedis.zrevrank(zsetKey, "player2"); // 从高到低的排名
        
        // 增加分数
        jedis.zincrby(zsetKey, 50, "player1"); // player1分数+50
        
        // 获取集合大小
        long count = jedis.zcard(zsetKey);
        
        // 删除元素
        jedis.zrem(zsetKey, "player6");
    }
    
    /**
     * 发布订阅
     */
    public void pubSubOperations() {
        // 发布消息
        jedis.publish("news_channel", "今日新闻：Redis 7.0发布");
        jedis.publish("sports_channel", "体育新闻：世界杯开始");
        
        // 订阅频道（通常在单独的线程中）
        Thread subscriberThread = new Thread(() -> {
            Jedis subscriberJedis = new Jedis("localhost", 6379);
            
            JedisPubSub pubSub = new JedisPubSub() {
                @Override
                public void onMessage(String channel, String message) {
                    System.out.println("收到消息 [" + channel + "]: " + message);
                }
                
                @Override
                public void onSubscribe(String channel, int subscribedChannels) {
                    System.out.println("订阅频道: " + channel);
                }
                
                @Override
                public void onUnsubscribe(String channel, int subscribedChannels) {
                    System.out.println("取消订阅频道: " + channel);
                }
            };
            
            // 订阅频道
            subscriberJedis.subscribe(pubSub, "news_channel", "sports_channel");
        });
        
        subscriberThread.start();
    }
    
    /**
     * 事务操作
     */
    public void transactionOperations() {
        // 开始事务
        Transaction transaction = jedis.multi();
        
        try {
            // 添加命令到事务队列
            transaction.set("key1", "value1");
            transaction.set("key2", "value2");
            transaction.incr("counter");
            transaction.lpush("list1", "item1", "item2");
            
            // 执行事务
            List<Object> results = transaction.exec();
            
            System.out.println("事务执行结果: " + results);
            
        } catch (Exception e) {
            // 取消事务
            transaction.discard();
            System.err.println("事务执行失败: " + e.getMessage());
        }
    }
    
    /**
     * 管道操作（批量执行）
     */
    public void pipelineOperations() {
        // 创建管道
        Pipeline pipeline = jedis.pipelined();
        
        // 批量添加命令
        for (int i = 0; i < 1000; i++) {
            pipeline.set("key:" + i, "value:" + i);
            pipeline.expire("key:" + i, 3600); // 1小时过期
        }
        
        // 执行管道
        List<Object> results = pipeline.syncAndReturnAll();
        
        System.out.println("管道执行完成，处理了 " + results.size() + " 个命令");
    }
    
    /**
     * Lua脚本执行
     */
    public void luaScriptOperations() {
        // 原子性的获取并增加计数器
        String luaScript = 
            "local current = redis.call('GET', KEYS[1])\n" +
            "if current == false then\n" +
            "    redis.call('SET', KEYS[1], ARGV[1])\n" +
            "    return ARGV[1]\n" +
            "else\n" +
            "    local newval = current + ARGV[1]\n" +
            "    redis.call('SET', KEYS[1], newval)\n" +
            "    return newval\n" +
            "end";
        
        // 执行Lua脚本
        Object result = jedis.eval(luaScript, 1, "counter:page_views", "1");
        System.out.println("页面访问量: " + result);
        
        // 限流脚本示例
        String rateLimitScript = 
            "local key = KEYS[1]\n" +
            "local limit = tonumber(ARGV[1])\n" +
            "local window = tonumber(ARGV[2])\n" +
            "local current = redis.call('GET', key)\n" +
            "if current == false then\n" +
            "    redis.call('SETEX', key, window, 1)\n" +
            "    return 1\n" +
            "elseif tonumber(current) < limit then\n" +
            "    return redis.call('INCR', key)\n" +
            "else\n" +
            "    return -1\n" +
            "end";
        
        // 限制每分钟最多100次请求
        Object rateLimitResult = jedis.eval(rateLimitScript, 1, "rate_limit:user:1001", "100", "60");
        
        if (rateLimitResult.equals(-1L)) {
            System.out.println("请求被限流");
        } else {
            System.out.println("请求通过，当前计数: " + rateLimitResult);
        }
    }
    
    /**
     * 关闭连接
     */
    public void close() {
        if (jedis != null) {
            jedis.close();
        }
    }
    
    /**
     * 使用示例
     */
    public static void main(String[] args) {
        RedisKeyValueExample example = new RedisKeyValueExample();
        
        try {
            // 执行各种操作
            example.stringOperations();
            example.hashOperations();
            example.listOperations();
            example.setOperations();
            example.sortedSetOperations();
            example.transactionOperations();
            example.pipelineOperations();
            example.luaScriptOperations();
            
        } finally {
            example.close();
        }
    }
}
```

### 2. 文档数据库（Document Database）

文档数据库以文档为基本存储单位，通常使用JSON、BSON等格式。

#### MongoDB示例

```java
// MongoDB Java驱动使用示例
public class MongoDocumentExample {
    
    private MongoClient mongoClient;
    private MongoDatabase database;
    private MongoCollection<Document> collection;
    
    public MongoDocumentExample() {
        // 连接MongoDB
        mongoClient = MongoClients.create("mongodb://localhost:27017");
        
        // 选择数据库
        database = mongoClient.getDatabase("ecommerce");
        
        // 选择集合
        collection = database.getCollection("products");
    }
    
    /**
     * 文档插入操作
     */
    public void insertOperations() {
        // 插入单个文档
        Document product = new Document("name", "iPhone 14")
                .append("brand", "Apple")
                .append("price", 999.99)
                .append("category", "Electronics")
                .append("specs", new Document("storage", "128GB")
                        .append("color", "Black")
                        .append("screen", "6.1 inch"))
                .append("tags", Arrays.asList("smartphone", "ios", "premium"))
                .append("inStock", true)
                .append("createdAt", new Date());
        
        collection.insertOne(product);
        System.out.println("插入产品，ID: " + product.getObjectId("_id"));
        
        // 批量插入文档
        List<Document> products = Arrays.asList(
            new Document("name", "Samsung Galaxy S23")
                .append("brand", "Samsung")
                .append("price", 899.99)
                .append("category", "Electronics")
                .append("specs", new Document("storage", "256GB")
                        .append("color", "White")
                        .append("screen", "6.1 inch"))
                .append("tags", Arrays.asList("smartphone", "android"))
                .append("inStock", true)
                .append("createdAt", new Date()),
                
            new Document("name", "MacBook Pro")
                .append("brand", "Apple")
                .append("price", 1999.99)
                .append("category", "Computers")
                .append("specs", new Document("cpu", "M2")
                        .append("memory", "16GB")
                        .append("storage", "512GB SSD"))
                .append("tags", Arrays.asList("laptop", "professional"))
                .append("inStock", false)
                .append("createdAt", new Date())
        );
        
        collection.insertMany(products);
        System.out.println("批量插入 " + products.size() + " 个产品");
    }
    
    /**
     * 文档查询操作
     */
    public void queryOperations() {
        // 查询所有文档
        System.out.println("=== 所有产品 ===");
        for (Document doc : collection.find()) {
            System.out.println(doc.toJson());
        }
        
        // 条件查询
        System.out.println("\n=== Apple产品 ===");
        for (Document doc : collection.find(eq("brand", "Apple"))) {
            System.out.println(doc.getString("name") + " - $" + doc.getDouble("price"));
        }
        
        // 复合条件查询
        System.out.println("\n=== 价格在500-1500之间的产品 ===");
        for (Document doc : collection.find(and(
                gte("price", 500),
                lte("price", 1500)
        ))) {
            System.out.println(doc.getString("name") + " - $" + doc.getDouble("price"));
        }
        
        // 正则表达式查询
        System.out.println("\n=== 名称包含'Pro'的产品 ===");
        for (Document doc : collection.find(regex("name", ".*Pro.*", "i"))) {
            System.out.println(doc.getString("name"));
        }
        
        // 数组查询
        System.out.println("\n=== 包含'smartphone'标签的产品 ===");
        for (Document doc : collection.find(in("tags", "smartphone"))) {
            System.out.println(doc.getString("name"));
        }
        
        // 嵌套文档查询
        System.out.println("\n=== 存储为128GB的产品 ===");
        for (Document doc : collection.find(eq("specs.storage", "128GB"))) {
            System.out.println(doc.getString("name"));
        }
        
        // 投影查询（只返回指定字段）
        System.out.println("\n=== 产品名称和价格 ===");
        for (Document doc : collection.find()
                .projection(fields(include("name", "price"), excludeId()))) {
            System.out.println(doc.toJson());
        }
        
        // 排序查询
        System.out.println("\n=== 按价格降序排列 ===");
        for (Document doc : collection.find()
                .sort(descending("price"))
                .limit(3)) {
            System.out.println(doc.getString("name") + " - $" + doc.getDouble("price"));
        }
    }
    
    /**
     * 文档更新操作
     */
    public void updateOperations() {
        // 更新单个文档
        UpdateResult result = collection.updateOne(
            eq("name", "iPhone 14"),
            combine(
                set("price", 899.99),
                set("updatedAt", new Date()),
                addToSet("tags", "discounted")
            )
        );
        System.out.println("更新文档数: " + result.getModifiedCount());
        
        // 更新多个文档
        UpdateResult multiResult = collection.updateMany(
            eq("category", "Electronics"),
            combine(
                inc("viewCount", 1),
                set("lastViewed", new Date())
            )
        );
        System.out.println("批量更新文档数: " + multiResult.getModifiedCount());
        
        // Upsert操作（不存在则插入）
        UpdateResult upsertResult = collection.updateOne(
            eq("name", "iPad Air"),
            combine(
                set("brand", "Apple"),
                set("price", 599.99),
                set("category", "Tablets"),
                set("createdAt", new Date())
            ),
            new UpdateOptions().upsert(true)
        );
        
        if (upsertResult.getUpsertedId() != null) {
            System.out.println("插入新文档，ID: " + upsertResult.getUpsertedId());
        }
        
        // 数组操作
        collection.updateOne(
            eq("name", "iPhone 14"),
            combine(
                push("reviews", new Document("user", "john")
                        .append("rating", 5)
                        .append("comment", "Great phone!")
                        .append("date", new Date())),
                inc("reviewCount", 1)
            )
        );
    }
    
    /**
     * 文档删除操作
     */
    public void deleteOperations() {
        // 删除单个文档
        DeleteResult deleteResult = collection.deleteOne(eq("inStock", false));
        System.out.println("删除文档数: " + deleteResult.getDeletedCount());
        
        // 删除多个文档
        DeleteResult multiDeleteResult = collection.deleteMany(
            and(
                eq("category", "Electronics"),
                lt("price", 100)
            )
        );
        System.out.println("批量删除文档数: " + multiDeleteResult.getDeletedCount());
    }
    
    /**
     * 聚合操作
     */
    public void aggregationOperations() {
        System.out.println("=== 聚合查询示例 ===");
        
        // 按品牌分组统计
        List<Document> brandStats = collection.aggregate(Arrays.asList(
            group("$brand", 
                sum("count", 1),
                avg("avgPrice", "$price"),
                min("minPrice", "$price"),
                max("maxPrice", "$price")
            ),
            sort(descending("count"))
        )).into(new ArrayList<>());
        
        System.out.println("\n=== 品牌统计 ===");
        for (Document stat : brandStats) {
            System.out.printf("品牌: %s, 数量: %d, 平均价格: %.2f\n",
                stat.getString("_id"),
                stat.getInteger("count"),
                stat.getDouble("avgPrice")
            );
        }
        
        // 价格区间分析
        List<Document> priceRanges = collection.aggregate(Arrays.asList(
            addFields(new Field<>("priceRange", 
                new Document("$switch", new Document("branches", Arrays.asList(
                    new Document("case", new Document("$lt", Arrays.asList("$price", 500)))
                            .append("then", "低价位"),
                    new Document("case", new Document("$lt", Arrays.asList("$price", 1000)))
                            .append("then", "中价位"),
                    new Document("case", new Document("$gte", Arrays.asList("$price", 1000)))
                            .append("then", "高价位")
                )).append("default", "未知"))
            )),
            group("$priceRange", sum("count", 1)),
            sort(ascending("_id"))
        )).into(new ArrayList<>());
        
        System.out.println("\n=== 价格区间分析 ===");
        for (Document range : priceRanges) {
            System.out.printf("%s: %d个产品\n",
                range.getString("_id"),
                range.getInteger("count")
            );
        }
        
        // 复杂聚合：每个类别的热门标签
        List<Document> categoryTags = collection.aggregate(Arrays.asList(
            unwind("$tags"),
            group(new Document("category", "$category").append("tag", "$tags"),
                sum("count", 1)
            ),
            sort(descending("count")),
            group("$_id.category",
                push("tags", new Document("tag", "$_id.tag").append("count", "$count"))
            )
        )).into(new ArrayList<>());
        
        System.out.println("\n=== 类别热门标签 ===");
        for (Document categoryTag : categoryTags) {
            System.out.println("类别: " + categoryTag.getString("_id"));
            List<Document> tags = categoryTag.getList("tags", Document.class);
            for (Document tag : tags.subList(0, Math.min(3, tags.size()))) {
                System.out.printf("  %s: %d次\n", 
                    tag.getString("tag"), 
                    tag.getInteger("count")
                );
            }
        }
    }
    
    /**
     * 索引操作
     */
    public void indexOperations() {
        // 创建单字段索引
        collection.createIndex(ascending("name"));
        collection.createIndex(descending("price"));
        
        // 创建复合索引
        collection.createIndex(compound(ascending("category"), descending("price")));
        
        // 创建文本索引（全文搜索）
        collection.createIndex(text("name", "tags"));
        
        // 创建唯一索引
        collection.createIndex(ascending("sku"), new IndexOptions().unique(true));
        
        // 创建部分索引
        collection.createIndex(ascending("discountPrice"), 
            new IndexOptions().partialFilterExpression(exists("discountPrice")));
        
        // 创建TTL索引（自动过期）
        collection.createIndex(ascending("createdAt"), 
            new IndexOptions().expireAfter(30, TimeUnit.DAYS));
        
        // 列出所有索引
        System.out.println("=== 集合索引 ===");
        for (Document index : collection.listIndexes()) {
            System.out.println(index.toJson());
        }
    }
    
    /**
     * 全文搜索
     */
    public void textSearchOperations() {
        // 全文搜索
        System.out.println("=== 全文搜索 'phone' ===");
        for (Document doc : collection.find(text("phone"))) {
            System.out.println(doc.getString("name"));
        }
        
        // 带权重的全文搜索
        System.out.println("\n=== 搜索结果按相关性排序 ===");
        for (Document doc : collection.find(text("apple smartphone"))
                .projection(fields(include("name", "price"), 
                    computed("score", new Document("$meta", "textScore"))))
                .sort(new Document("score", new Document("$meta", "textScore")))) {
            System.out.printf("%s (相关性: %.2f)\n", 
                doc.getString("name"), 
                doc.getDouble("score")
            );
        }
    }
    
    /**
     * 地理空间查询
     */
    public void geospatialOperations() {
        // 创建地理空间索引
        MongoCollection<Document> stores = database.getCollection("stores");
        stores.createIndex(Indexes.geo2dsphere("location"));
        
        // 插入带地理位置的文档
        stores.insertMany(Arrays.asList(
            new Document("name", "北京店")
                .append("location", new Document("type", "Point")
                    .append("coordinates", Arrays.asList(116.4074, 39.9042))),
            new Document("name", "上海店")
                .append("location", new Document("type", "Point")
                    .append("coordinates", Arrays.asList(121.4737, 31.2304))),
            new Document("name", "深圳店")
                .append("location", new Document("type", "Point")
                    .append("coordinates", Arrays.asList(114.0579, 22.5431)))
        ));
        
        // 查找附近的店铺（以北京为中心，半径100公里）
        System.out.println("=== 北京附近100公里内的店铺 ===");
        for (Document store : stores.find(
                near("location", new Point(new Position(116.4074, 39.9042)), 100000.0, 0.0))) {
            System.out.println(store.getString("name"));
        }
    }
    
    /**
     * 关闭连接
     */
    public void close() {
        if (mongoClient != null) {
            mongoClient.close();
        }
    }
    
    /**
     * 使用示例
     */
    public static void main(String[] args) {
        MongoDocumentExample example = new MongoDocumentExample();
        
        try {
            example.insertOperations();
            example.queryOperations();
            example.updateOperations();
            example.aggregationOperations();
            example.indexOperations();
            example.textSearchOperations();
            example.geospatialOperations();
            
        } finally {
            example.close();
        }
    }
}
```

### 3. 列族数据库（Column Family）

列族数据库以列族为基本存储单位，适合处理大规模稀疏数据。

#### HBase示例

```java
// HBase Java API使用示例
public class HBaseColumnFamilyExample {
    
    private Connection connection;
    private Admin admin;
    
    public HBaseColumnFamilyExample() throws IOException {
        // 创建HBase配置
        Configuration config = HBaseConfiguration.create();
        config.set("hbase.zookeeper.quorum", "localhost");
        config.set("hbase.zookeeper.property.clientPort", "2181");
        config.set("hbase.master", "localhost:16000");
        
        // 创建连接
        connection = ConnectionFactory.createConnection(config);
        admin = connection.getAdmin();
    }
    
    /**
     * 表管理操作
     */
    public void tableOperations() throws IOException {
        TableName tableName = TableName.valueOf("user_profiles");
        
        // 检查表是否存在
        if (admin.tableExists(tableName)) {
            System.out.println("表已存在，先删除");
            admin.disableTable(tableName);
            admin.deleteTable(tableName);
        }
        
        // 创建表描述符
        TableDescriptorBuilder tableBuilder = TableDescriptorBuilder.newBuilder(tableName);
        
        // 定义列族
        ColumnFamilyDescriptor basicInfo = ColumnFamilyDescriptorBuilder
            .newBuilder(Bytes.toBytes("basic"))
            .setMaxVersions(3) // 保留3个版本
            .setTimeToLive(86400) // TTL 1天
            .setCompressionType(Compression.Algorithm.SNAPPY) // 压缩
            .setBloomFilterType(BloomType.ROW) // 布隆过滤器
            .build();
        
        ColumnFamilyDescriptor contactInfo = ColumnFamilyDescriptorBuilder
            .newBuilder(Bytes.toBytes("contact"))
            .setMaxVersions(1)
            .build();
        
        ColumnFamilyDescriptor preferences = ColumnFamilyDescriptorBuilder
            .newBuilder(Bytes.toBytes("prefs"))
            .setMaxVersions(1)
            .build();
        
        // 添加列族到表
        tableBuilder.setColumnFamily(basicInfo);
        tableBuilder.setColumnFamily(contactInfo);
        tableBuilder.setColumnFamily(preferences);
        
        // 创建表
        admin.createTable(tableBuilder.build());
        System.out.println("表创建成功: " + tableName);
        
        // 列出所有表
        System.out.println("\n=== 所有表 ===");
        for (TableDescriptor desc : admin.listTableDescriptors()) {
            System.out.println("表名: " + desc.getTableName());
            for (ColumnFamilyDescriptor cf : desc.getColumnFamilies()) {
                System.out.println("  列族: " + cf.getNameAsString());
            }
        }
    }
    
    /**
     * 数据写入操作
     */
    public void putOperations() throws IOException {
        TableName tableName = TableName.valueOf("user_profiles");
        Table table = connection.getTable(tableName);
        
        try {
            // 单行写入
            Put put1 = new Put(Bytes.toBytes("user001"));
            put1.addColumn(Bytes.toBytes("basic"), Bytes.toBytes("name"), Bytes.toBytes("张三"));
            put1.addColumn(Bytes.toBytes("basic"), Bytes.toBytes("age"), Bytes.toBytes("25"));
            put1.addColumn(Bytes.toBytes("basic"), Bytes.toBytes("gender"), Bytes.toBytes("男"));
            put1.addColumn(Bytes.toBytes("contact"), Bytes.toBytes("email"), Bytes.toBytes("zhangsan@example.com"));
            put1.addColumn(Bytes.toBytes("contact"), Bytes.toBytes("phone"), Bytes.toBytes("13800138000"));
            put1.addColumn(Bytes.toBytes("prefs"), Bytes.toBytes("language"), Bytes.toBytes("zh-CN"));
            put1.addColumn(Bytes.toBytes("prefs"), Bytes.toBytes("theme"), Bytes.toBytes("dark"));
            
            table.put(put1);
            System.out.println("插入用户: user001");
            
            // 批量写入
            List<Put> puts = new ArrayList<>();
            
            Put put2 = new Put(Bytes.toBytes("user002"));
            put2.addColumn(Bytes.toBytes("basic"), Bytes.toBytes("name"), Bytes.toBytes("李四"));
            put2.addColumn(Bytes.toBytes("basic"), Bytes.toBytes("age"), Bytes.toBytes("30"));
            put2.addColumn(Bytes.toBytes("basic"), Bytes.toBytes("gender"), Bytes.toBytes("女"));
            put2.addColumn(Bytes.toBytes("contact"), Bytes.toBytes("email"), Bytes.toBytes("lisi@example.com"));
            puts.add(put2);
            
            Put put3 = new Put(Bytes.toBytes("user003"));
            put3.addColumn(Bytes.toBytes("basic"), Bytes.toBytes("name"), Bytes.toBytes("王五"));
            put3.addColumn(Bytes.toBytes("basic"), Bytes.toBytes("age"), Bytes.toBytes("28"));
            put3.addColumn(Bytes.toBytes("contact"), Bytes.toBytes("phone"), Bytes.toBytes("13900139000"));
            put3.addColumn(Bytes.toBytes("prefs"), Bytes.toBytes("language"), Bytes.toBytes("en-US"));
            puts.add(put3);
            
            table.put(puts);
            System.out.println("批量插入 " + puts.size() + " 个用户");
            
            // 带时间戳的写入
            long timestamp = System.currentTimeMillis();
            Put putWithTimestamp = new Put(Bytes.toBytes("user001"));
            putWithTimestamp.addColumn(Bytes.toBytes("basic"), Bytes.toBytes("last_login"), 
                timestamp, Bytes.toBytes(String.valueOf(timestamp)));
            table.put(putWithTimestamp);
            
        } finally {
            table.close();
        }
    }
    
    /**
     * 数据读取操作
     */
    public void getOperations() throws IOException {
        TableName tableName = TableName.valueOf("user_profiles");
        Table table = connection.getTable(tableName);
        
        try {
            // 单行查询
            Get get = new Get(Bytes.toBytes("user001"));
            Result result = table.get(get);
            
            System.out.println("=== 用户 user001 信息 ===");
            for (Cell cell : result.rawCells()) {
                String family = Bytes.toString(CellUtil.cloneFamily(cell));
                String qualifier = Bytes.toString(CellUtil.cloneQualifier(cell));
                String value = Bytes.toString(CellUtil.cloneValue(cell));
                long timestamp = cell.getTimestamp();
                
                System.out.printf("%s:%s = %s (时间戳: %d)\n", 
                    family, qualifier, value, timestamp);
            }
            
            // 查询指定列族
            Get getBasic = new Get(Bytes.toBytes("user001"));
            getBasic.addFamily(Bytes.toBytes("basic"));
            Result basicResult = table.get(getBasic);
            
            System.out.println("\n=== 用户 user001 基本信息 ===");
            String name = Bytes.toString(basicResult.getValue(Bytes.toBytes("basic"), Bytes.toBytes("name")));
            String age = Bytes.toString(basicResult.getValue(Bytes.toBytes("basic"), Bytes.toBytes("age")));
            System.out.println("姓名: " + name + ", 年龄: " + age);
            
            // 查询指定列
            Get getEmail = new Get(Bytes.toBytes("user001"));
            getEmail.addColumn(Bytes.toBytes("contact"), Bytes.toBytes("email"));
            Result emailResult = table.get(getEmail);
            
            if (!emailResult.isEmpty()) {
                String email = Bytes.toString(emailResult.getValue(
                    Bytes.toBytes("contact"), Bytes.toBytes("email")));
                System.out.println("邮箱: " + email);
            }
            
            // 批量查询
            List<Get> gets = Arrays.asList(
                new Get(Bytes.toBytes("user001")),
                new Get(Bytes.toBytes("user002")),
                new Get(Bytes.toBytes("user003"))
            );
            
            Result[] results = table.get(gets);
            System.out.println("\n=== 批量查询结果 ===");
            for (int i = 0; i < results.length; i++) {
                Result r = results[i];
                if (!r.isEmpty()) {
                    String rowKey = Bytes.toString(r.getRow());
                    String userName = Bytes.toString(r.getValue(
                        Bytes.toBytes("basic"), Bytes.toBytes("name")));
                    System.out.println(rowKey + ": " + userName);
                }
            }
            
        } finally {
            table.close();
        }
    }
    
    /**
     * 扫描操作
     */
    public void scanOperations() throws IOException {
        TableName tableName = TableName.valueOf("user_profiles");
        Table table = connection.getTable(tableName);
        
        try {
            // 全表扫描
            Scan scan = new Scan();
            ResultScanner scanner = table.getScanner(scan);
            
            System.out.println("=== 全表扫描 ===");
            for (Result result : scanner) {
                String rowKey = Bytes.toString(result.getRow());
                String name = Bytes.toString(result.getValue(
                    Bytes.toBytes("basic"), Bytes.toBytes("name")));
                System.out.println("用户: " + rowKey + ", 姓名: " + name);
            }
            scanner.close();
            
            // 范围扫描
            Scan rangeScan = new Scan();
            rangeScan.withStartRow(Bytes.toBytes("user001"));
            rangeScan.withStopRow(Bytes.toBytes("user003"));
            
            ResultScanner rangeScanner = table.getScanner(rangeScan);
            System.out.println("\n=== 范围扫描 (user001 到 user003) ===");
            for (Result result : rangeScanner) {
                String rowKey = Bytes.toString(result.getRow());
                System.out.println("用户: " + rowKey);
            }
            rangeScanner.close();
            
            // 列族过滤扫描
            Scan familyScan = new Scan();
            familyScan.addFamily(Bytes.toBytes("contact"));
            
            ResultScanner familyScanner = table.getScanner(familyScan);
            System.out.println("\n=== 联系信息扫描 ===");
            for (Result result : familyScanner) {
                String rowKey = Bytes.toString(result.getRow());
                String email = Bytes.toString(result.getValue(
                    Bytes.toBytes("contact"), Bytes.toBytes("email")));
                String phone = Bytes.toString(result.getValue(
                    Bytes.toBytes("contact"), Bytes.toBytes("phone")));
                
                System.out.printf("%s - 邮箱: %s, 电话: %s\n", rowKey, email, phone);
            }
            familyScanner.close();
            
            // 带过滤器的扫描
            Scan filterScan = new Scan();
            
            // 值过滤器：查找年龄大于25的用户
            Filter ageFilter = new ValueFilter(CompareOperator.GREATER, 
                new BinaryComparator(Bytes.toBytes("25")));
            filterScan.setFilter(ageFilter);
            
            ResultScanner filterScanner = table.getScanner(filterScan);
            System.out.println("\n=== 年龄大于25的用户 ===");
            for (Result result : filterScanner) {
                String rowKey = Bytes.toString(result.getRow());
                String name = Bytes.toString(result.getValue(
                    Bytes.toBytes("basic"), Bytes.toBytes("name")));
                String age = Bytes.toString(result.getValue(
                    Bytes.toBytes("basic"), Bytes.toBytes("age")));
                System.out.printf("%s: %s (年龄: %s)\n", rowKey, name, age);
            }
            filterScanner.close();
            
        } finally {
            table.close();
        }
    }
    
    /**
     * 数据删除操作
     */
    public void deleteOperations() throws IOException {
        TableName tableName = TableName.valueOf("user_profiles");
        Table table = connection.getTable(tableName);
        
        try {
            // 删除指定列
            Delete deleteColumn = new Delete(Bytes.toBytes("user001"));
            deleteColumn.addColumn(Bytes.toBytes("prefs"), Bytes.toBytes("theme"));
            table.delete(deleteColumn);
            System.out.println("删除 user001 的主题偏好");
            
            // 删除指定列族
            Delete deleteFamily = new Delete(Bytes.toBytes("user002"));
            deleteFamily.addFamily(Bytes.toBytes("prefs"));
            table.delete(deleteFamily);
            System.out.println("删除 user002 的所有偏好设置");
            
            // 删除整行
            Delete deleteRow = new Delete(Bytes.toBytes("user003"));
            table.delete(deleteRow);
            System.out.println("删除 user003 整行数据");
            
            // 批量删除
            List<Delete> deletes = Arrays.asList(
                new Delete(Bytes.toBytes("user004")),
                new Delete(Bytes.toBytes("user005"))
            );
            table.delete(deletes);
            System.out.println("批量删除用户数据");
            
        } finally {
            table.close();
        }
    }
    
    /**
     * 原子操作
     */
    public void atomicOperations() throws IOException {
        TableName tableName = TableName.valueOf("user_profiles");
        Table table = connection.getTable(tableName);
        
        try {
            // 检查并设置（CAS操作）
            boolean success = table.checkAndMutate(Bytes.toBytes("user001"), 
                Bytes.toBytes("basic"))
                .qualifier(Bytes.toBytes("age"))
                .ifEquals(Bytes.toBytes("25"))
                .thenPut(new Put(Bytes.toBytes("user001"))
                    .addColumn(Bytes.toBytes("basic"), Bytes.toBytes("age"), Bytes.toBytes("26")));
            
            System.out.println("CAS操作结果: " + (success ? "成功" : "失败"));
            
            // 原子增量操作
            long newValue = table.incrementColumnValue(
                Bytes.toBytes("user001"),
                Bytes.toBytes("basic"),
                Bytes.toBytes("login_count"),
                1L
            );
            System.out.println("登录次数增加后: " + newValue);
            
        } finally {
            table.close();
        }
    }
    
    /**
     * 协处理器示例
     */
    public void coprocessorOperations() throws Throwable {
        // 注意：这需要在HBase集群中部署协处理器
        TableName tableName = TableName.valueOf("user_profiles");
        Table table = connection.getTable(tableName);
        
        try {
            // 使用AggregationClient进行聚合查询
            // 这需要在表上启用AggregateProtocol协处理器
            
            System.out.println("协处理器功能需要在HBase集群中配置");
            
        } finally {
            table.close();
        }
    }
    
    /**
     * 关闭连接
     */
    public void close() throws IOException {
        if (admin != null) {
            admin.close();
        }
        if (connection != null) {
            connection.close();
        }
    }
    
    /**
     * 使用示例
     */
    public static void main(String[] args) {
        try {
            HBaseColumnFamilyExample example = new HBaseColumnFamilyExample();
            
            example.tableOperations();
            example.putOperations();
            example.getOperations();
            example.scanOperations();
            example.atomicOperations();
            example.deleteOperations();
            
            example.close();
            
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

### 4. 图数据库（Graph Database）

图数据库以图结构存储数据，适合处理复杂的关系数据。

#### Neo4j示例

```java
// Neo4j Java驱动使用示例
public class Neo4jGraphExample {
    
    private Driver driver;
    
    public Neo4jGraphExample() {
        // 连接Neo4j数据库
        driver = GraphDatabase.driver("bolt://localhost:7687", 
            AuthTokens.basic("neo4j", "password"));
    }
    
    /**
     * 创建节点和关系
     */
    public void createNodesAndRelationships() {
        try (Session session = driver.session()) {
            // 创建用户节点
            session.run("CREATE (u1:User {id: 1, name: '张三', age: 25, city: '北京'})");
            session.run("CREATE (u2:User {id: 2, name: '李四', age: 30, city: '上海'})");
            session.run("CREATE (u3:User {id: 3, name: '王五', age: 28, city: '深圳'})");
            session.run("CREATE (u4:User {id: 4, name: '赵六', age: 32, city: '广州'})");
            
            // 创建公司节点
            session.run("CREATE (c1:Company {id: 1, name: '阿里巴巴', industry: '互联网'})");
            session.run("CREATE (c2:Company {id: 2, name: '腾讯', industry: '互联网'})");
            session.run("CREATE (c3:Company {id: 3, name: '华为', industry: '通信'})");
            
            // 创建技能节点
            session.run("CREATE (s1:Skill {name: 'Java', category: '编程语言'})");
            session.run("CREATE (s2:Skill {name: 'Python', category: '编程语言'})");
            session.run("CREATE (s3:Skill {name: 'Machine Learning', category: '技术'})");
            session.run("CREATE (s4:Skill {name: 'Big Data', category: '技术'})");
            
            System.out.println("节点创建完成");
            
            // 创建关系
            // 用户之间的朋友关系
            session.run("""
                MATCH (u1:User {id: 1}), (u2:User {id: 2})
                CREATE (u1)-[:FRIEND_OF {since: '2020-01-01', strength: 0.8}]->(u2)
                CREATE (u2)-[:FRIEND_OF {since: '2020-01-01', strength: 0.8}]->(u1)
            """);
            
            session.run("""
                MATCH (u1:User {id: 1}), (u3:User {id: 3})
                CREATE (u1)-[:FRIEND_OF {since: '2021-06-15', strength: 0.6}]->(u3)
                CREATE (u3)-[:FRIEND_OF {since: '2021-06-15', strength: 0.6}]->(u1)
            """);
            
            session.run("""
                MATCH (u2:User {id: 2}), (u4:User {id: 4})
                CREATE (u2)-[:FRIEND_OF {since: '2019-03-20', strength: 0.9}]->(u4)
                CREATE (u4)-[:FRIEND_OF {since: '2019-03-20', strength: 0.9}]->(u2)
            """);
            
            // 用户工作关系
            session.run("""
                MATCH (u1:User {id: 1}), (c1:Company {id: 1})
                CREATE (u1)-[:WORKS_AT {position: '高级工程师', start_date: '2022-01-01', salary: 25000}]->(c1)
            """);
            
            session.run("""
                MATCH (u2:User {id: 2}), (c2:Company {id: 2})
                CREATE (u2)-[:WORKS_AT {position: '架构师', start_date: '2021-03-15', salary: 35000}]->(c2)
            """);
            
            session.run("""
                MATCH (u3:User {id: 3}), (c3:Company {id: 3})
                CREATE (u3)-[:WORKS_AT {position: '数据科学家', start_date: '2020-09-01', salary: 30000}]->(c3)
            """);
            
            // 用户技能关系
            session.run("""
                MATCH (u1:User {id: 1}), (s1:Skill {name: 'Java'})
                CREATE (u1)-[:HAS_SKILL {level: 'Expert', years: 5}]->(s1)
            """);
            
            session.run("""
                MATCH (u1:User {id: 1}), (s4:Skill {name: 'Big Data'})
                CREATE (u1)-[:HAS_SKILL {level: 'Advanced', years: 3}]->(s4)
            """);
            
            session.run("""
                MATCH (u2:User {id: 2}), (s2:Skill {name: 'Python'})
                CREATE (u2)-[:HAS_SKILL {level: 'Expert', years: 6}]->(s2)
            """);
            
            session.run("""
                MATCH (u2:User {id: 2}), (s3:Skill {name: 'Machine Learning'})
                CREATE (u2)-[:HAS_SKILL {level: 'Expert', years: 4}]->(s3)
            """);
            
            session.run("""
                MATCH (u3:User {id: 3}), (s2:Skill {name: 'Python'})
                CREATE (u3)-[:HAS_SKILL {level: 'Advanced', years: 4}]->(s2)
            """);
            
            session.run("""
                MATCH (u3:User {id: 3}), (s3:Skill {name: 'Machine Learning'})
                CREATE (u3)-[:HAS_SKILL {level: 'Expert', years: 5}]->(s3)
            """);
            
            System.out.println("关系创建完成");
        }
    }
    
    /**
     * 基本查询操作
     */
    public void basicQueries() {
        try (Session session = driver.session()) {
            // 查询所有用户
            System.out.println("=== 所有用户 ===");
            Result result = session.run("MATCH (u:User) RETURN u.name, u.age, u.city");
            while (result.hasNext()) {
                Record record = result.next();
                System.out.printf("姓名: %s, 年龄: %d, 城市: %s\n",
                    record.get("u.name").asString(),
                    record.get("u.age").asInt(),
                    record.get("u.city").asString());
            }
            
            // 条件查询
            System.out.println("\n=== 年龄大于28的用户 ===");
            result = session.run("MATCH (u:User) WHERE u.age > 28 RETURN u.name, u.age");
            while (result.hasNext()) {
                Record record = result.next();
                System.out.printf("%s (年龄: %d)\n",
                    record.get("u.name").asString(),
                    record.get("u.age").asInt());
            }
            
            // 查询关系
            System.out.println("\n=== 朋友关系 ===");
            result = session.run("""
                MATCH (u1:User)-[r:FRIEND_OF]->(u2:User)
                RETURN u1.name, u2.name, r.since, r.strength
            """);
            while (result.hasNext()) {
                Record record = result.next();
                System.out.printf("%s 和 %s 是朋友 (认识时间: %s, 亲密度: %.1f)\n",
                    record.get("u1.name").asString(),
                    record.get("u2.name").asString(),
                    record.get("r.since").asString(),
                    record.get("r.strength").asDouble());
            }
        }
    }
    
    /**
     * 复杂图查询
     */
    public void complexQueries() {
        try (Session session = driver.session()) {
            // 查找共同朋友
            System.out.println("=== 张三和李四的共同朋友 ===");
            Result result = session.run("""
                MATCH (u1:User {name: '张三'})-[:FRIEND_OF]->(common)<-[:FRIEND_OF]-(u2:User {name: '李四'})
                RETURN common.name
            """);
            while (result.hasNext()) {
                Record record = result.next();
                System.out.println("共同朋友: " + record.get("common.name").asString());
            }
            
            // 查找朋友的朋友（二度关系）
            System.out.println("\n=== 张三的朋友的朋友 ===");
            result = session.run("""
                MATCH (u:User {name: '张三'})-[:FRIEND_OF*2]->(friend_of_friend)
                WHERE friend_of_friend <> u
                RETURN DISTINCT friend_of_friend.name
            """);
            while (result.hasNext()) {
                Record record = result.next();
                System.out.println("朋友的朋友: " + record.get("friend_of_friend.name").asString());
            }
            
            // 查找最短路径
            System.out.println("\n=== 张三到赵六的最短路径 ===");
            result = session.run("""
                MATCH path = shortestPath((start:User {name: '张三'})-[:FRIEND_OF*]-(end:User {name: '赵六'}))
                RETURN [node in nodes(path) | node.name] as path_names
            """);
            if (result.hasNext()) {
                Record record = result.next();
                List<Object> pathNames = record.get("path_names").asList();
                System.out.println("最短路径: " + String.join(" -> ", 
                    pathNames.stream().map(Object::toString).toArray(String[]::new)));
            }
            
            // 查找具有相同技能的用户
            System.out.println("\n=== 具有Python技能的用户 ===");
            result = session.run("""
                MATCH (u:User)-[r:HAS_SKILL]->(s:Skill {name: 'Python'})
                RETURN u.name, r.level, r.years
                ORDER BY r.years DESC
            """);
            while (result.hasNext()) {
                Record record = result.next();
                System.out.printf("%s - 水平: %s, 经验: %d年\n",
                    record.get("u.name").asString(),
                    record.get("r.level").asString(),
                    record.get("r.years").asInt());
            }
        }
    }
    
    /**
     * 聚合查询
     */
    public void aggregationQueries() {
        try (Session session = driver.session()) {
            // 统计每个城市的用户数量
            System.out.println("=== 各城市用户统计 ===");
            Result result = session.run("""
                MATCH (u:User)
                RETURN u.city, count(u) as user_count
                ORDER BY user_count DESC
            """);
            while (result.hasNext()) {
                Record record = result.next();
                System.out.printf("%s: %d人\n",
                    record.get("u.city").asString(),
                    record.get("user_count").asInt());
            }
            
            // 统计每个技能的用户数量
            System.out.println("\n=== 技能热度统计 ===");
            result = session.run("""
                MATCH (u:User)-[:HAS_SKILL]->(s:Skill)
                RETURN s.name, count(u) as user_count, s.category
                ORDER BY user_count DESC
            """);
            while (result.hasNext()) {
                Record record = result.next();
                System.out.printf("%s (%s): %d人掌握\n",
                    record.get("s.name").asString(),
                    record.get("s.category").asString(),
                    record.get("user_count").asInt());
            }
            
            // 计算平均工资
            System.out.println("\n=== 各公司平均工资 ===");
            result = session.run("""
                MATCH (u:User)-[r:WORKS_AT]->(c:Company)
                RETURN c.name, avg(r.salary) as avg_salary, count(u) as employee_count
                ORDER BY avg_salary DESC
            """);
            while (result.hasNext()) {
                Record record = result.next();
                System.out.printf("%s: 平均工资 %.0f元, 员工 %d人\n",
                    record.get("c.name").asString(),
                    record.get("avg_salary").asDouble(),
                    record.get("employee_count").asInt());
            }
        }
    }
    
    /**
     * 推荐算法示例
     */
    public void recommendationQueries() {
        try (Session session = driver.session()) {
            // 基于朋友关系的用户推荐
            System.out.println("=== 为张三推荐可能认识的人 ===");
            Result result = session.run("""
                MATCH (target:User {name: '张三'})-[:FRIEND_OF]->(friend)-[:FRIEND_OF]->(recommendation)
                WHERE NOT (target)-[:FRIEND_OF]->(recommendation) AND target <> recommendation
                RETURN recommendation.name, count(*) as mutual_friends
                ORDER BY mutual_friends DESC
                LIMIT 3
            """);
            while (result.hasNext()) {
                Record record = result.next();
                System.out.printf("推荐用户: %s (共同朋友数: %d)\n",
                    record.get("recommendation.name").asString(),
                    record.get("mutual_friends").asInt());
            }
            
            // 基于技能的工作推荐
            System.out.println("\n=== 为掌握Python的用户推荐公司 ===");
            result = session.run("""
                MATCH (skill:Skill {name: 'Python'})<-[:HAS_SKILL]-(user:User)
                MATCH (other_user:User)-[:WORKS_AT]->(company:Company)
                WHERE (other_user)-[:HAS_SKILL]->(skill) AND NOT (user)-[:WORKS_AT]->(company)
                RETURN user.name, company.name, count(*) as skill_match_count
                ORDER BY user.name, skill_match_count DESC
            """);
            while (result.hasNext()) {
                Record record = result.next();
                System.out.printf("为 %s 推荐公司: %s\n",
                    record.get("user.name").asString(),
                    record.get("company.name").asString());
            }
        }
    }
    
    /**
     * 图算法示例
     */
    public void graphAlgorithms() {
        try (Session session = driver.session()) {
            // PageRank算法（需要APOC插件）
            System.out.println("=== 用户影响力分析 (PageRank) ===");
            try {
                Result result = session.run("""
                    CALL gds.pageRank.stream({
                        nodeProjection: 'User',
                        relationshipProjection: 'FRIEND_OF'
                    })
                    YIELD nodeId, score
                    RETURN gds.util.asNode(nodeId).name as name, score
                    ORDER BY score DESC
                """);
                while (result.hasNext()) {
                    Record record = result.next();
                    System.out.printf("%s: 影响力分数 %.4f\n",
                        record.get("name").asString(),
                        record.get("score").asDouble());
                }
            } catch (Exception e) {
                System.out.println("PageRank需要Graph Data Science库支持");
            }
            
            // 社区检测
            System.out.println("\n=== 社区检测 ===");
            try {
                Result result = session.run("""
                    CALL gds.louvain.stream({
                        nodeProjection: 'User',
                        relationshipProjection: 'FRIEND_OF'
                    })
                    YIELD nodeId, communityId
                    RETURN gds.util.asNode(nodeId).name as name, communityId
                    ORDER BY communityId, name
                """);
                while (result.hasNext()) {
                    Record record = result.next();
                    System.out.printf("%s: 社区 %d\n",
                        record.get("name").asString(),
                        record.get("communityId").asLong());
                }
            } catch (Exception e) {
                System.out.println("社区检测需要Graph Data Science库支持");
            }
        }
    }
    
    /**
     * 数据更新操作
     */
    public void updateOperations() {
        try (Session session = driver.session()) {
            // 更新节点属性
            session.run("""
                MATCH (u:User {name: '张三'})
                SET u.age = 26, u.last_updated = datetime()
            """);
            System.out.println("更新张三的年龄");
            
            // 更新关系属性
            session.run("""
                MATCH (u1:User {name: '张三'})-[r:FRIEND_OF]->(u2:User {name: '李四'})
                SET r.strength = 0.9, r.last_contact = date()
            """);
            System.out.println("更新朋友关系强度");
            
            // 添加新的关系
            session.run("""
                MATCH (u1:User {name: '张三'}), (u4:User {name: '赵六'})
                CREATE (u1)-[:FRIEND_OF {since: date(), strength: 0.5}]->(u4)
                CREATE (u4)-[:FRIEND_OF {since: date(), strength: 0.5}]->(u1)
            """);
            System.out.println("添加新的朋友关系");
        }
    }
    
    /**
     * 数据删除操作
     */
    public void deleteOperations() {
        try (Session session = driver.session()) {
            // 删除关系
            session.run("""
                MATCH (u1:User {name: '张三'})-[r:FRIEND_OF]-(u2:User {name: '王五'})
                DELETE r
            """);
            System.out.println("删除朋友关系");
            
            // 删除节点（先删除相关关系）
            session.run("""
                MATCH (u:User {name: '测试用户'})
                DETACH DELETE u
            """);
            System.out.println("删除测试用户及其所有关系");
        }
    }
    
    /**
     * 事务处理
     */
    public void transactionOperations() {
        // 显式事务
        try (Session session = driver.session()) {
            try (Transaction tx = session.beginTransaction()) {
                // 创建新用户
                tx.run("CREATE (u:User {id: 100, name: '新用户', age: 25})");
                
                // 建立关系
                tx.run("""
                    MATCH (u1:User {id: 100}), (u2:User {name: '张三'})
                    CREATE (u1)-[:FRIEND_OF {since: date()}]->(u2)
                """);
                
                // 提交事务
                tx.commit();
                System.out.println("事务提交成功");
                
            } catch (Exception e) {
                System.err.println("事务回滚: " + e.getMessage());
            }
        }
    }
    
    /**
     * 关闭连接
     */
    public void close() {
        if (driver != null) {
            driver.close();
        }
    }
    
    /**
     * 使用示例
     */
    public static void main(String[] args) {
        Neo4jGraphExample example = new Neo4jGraphExample();
        
        try {
            example.createNodesAndRelationships();
            example.basicQueries();
            example.complexQueries();
            example.aggregationQueries();
            example.recommendationQueries();
            example.graphAlgorithms();
            example.updateOperations();
            example.transactionOperations();
            
        } finally {
            example.close();
        }
    }
}
```

## CAP定理和BASE理论

### CAP定理

CAP定理指出，在分布式系统中，一致性（Consistency）、可用性（Availability）和分区容错性（Partition tolerance）三者不能同时满足，最多只能同时满足其中两个。

- **一致性（Consistency）**：所有节点在同一时间看到相同的数据
- **可用性（Availability）**：系统在任何时候都能响应用户请求
- **分区容错性（Partition tolerance）**：系统能够容忍网络分区故障

### BASE理论

BASE理论是对CAP定理的延伸，提供了一种在分布式系统中实现高可用性的方法：

- **基本可用（Basically Available）**：系统基本可用，允许损失部分可用性
- **软状态（Soft state）**：允许系统存在中间状态，不影响系统整体可用性
- **最终一致性（Eventual consistency）**：系统中所有数据副本经过一定时间后，最终能够达到一致的状态

## NoSQL数据库选择指南

### 选择标准

| 数据库类型 | 适用场景 | 优势 | 劣势 |
|-----------|---------|------|------|
| 键值存储 | 缓存、会话存储、购物车 | 高性能、简单 | 功能有限、无复杂查询 |
| 文档数据库 | 内容管理、用户配置、产品目录 | 灵活模式、丰富查询 | 事务支持有限 |
| 列族数据库 | 时间序列、日志分析、IoT数据 | 高写入性能、压缩率高 | 学习成本高、复杂查询困难 |
| 图数据库 | 社交网络、推荐系统、知识图谱 | 关系查询强大、图算法丰富 | 不适合大量数据、性能依赖图结构 |

### 性能对比

```java
// 性能测试示例
public class NoSQLPerformanceTest {
    
    public void performanceComparison() {
        // Redis性能测试
        long redisStartTime = System.currentTimeMillis();
        // 执行10万次Redis操作
        for (int i = 0; i < 100000; i++) {
            // jedis.set("key" + i, "value" + i);
        }
        long redisEndTime = System.currentTimeMillis();
        System.out.println("Redis写入10万条数据耗时: " + (redisEndTime - redisStartTime) + "ms");
        
        // MongoDB性能测试
        long mongoStartTime = System.currentTimeMillis();
        // 执行1万次MongoDB操作
        for (int i = 0; i < 10000; i++) {
            // collection.insertOne(new Document("key", "value" + i));
        }
        long mongoEndTime = System.currentTimeMillis();
        System.out.println("MongoDB写入1万条文档耗时: " + (mongoEndTime - mongoStartTime) + "ms");
    }
}
```

## 最佳实践

### 1. 数据建模

- **键值存储**：设计合理的键命名规范，使用命名空间
- **文档数据库**：避免过深的嵌套，合理使用引用和嵌入
- **列族数据库**：设计合适的行键，避免热点问题
- **图数据库**：优化图结构，避免超级节点

### 2. 性能优化

- **索引策略**：根据查询模式创建合适的索引
- **分片策略**：合理设计分片键，保证数据均匀分布
- **缓存策略**：使用多级缓存，减少数据库压力
- **连接池**：合理配置连接池参数

### 3. 运维监控

- **监控指标**：QPS、延迟、错误率、资源使用率
- **告警机制**：设置合理的告警阈值
- **备份策略**：定期备份，测试恢复流程
- **容量规划**：根据业务增长预测容量需求

## 总结

NoSQL数据库为现代应用提供了灵活、可扩展的数据存储解决方案。选择合适的NoSQL数据库需要考虑数据模型、查询需求、性能要求、一致性需求等多个因素。在实际应用中，往往需要结合多种数据库技术，构建混合架构来满足不同的业务需求。