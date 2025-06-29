---
title: MongoDB 详解
author: Walt
date: 2024-12-19 10:00:00
LastEditTime: 2024-12-19 10:00:00
LastEditors: Walt
---

# MongoDB 详解

MongoDB 是一个基于文档的 NoSQL 数据库，以其灵活的数据模型、强大的查询功能和良好的扩展性而广受欢迎。它使用 JSON 风格的文档存储数据，非常适合现代应用开发。

## 概述

### 核心概念

- **文档 (Document)**：MongoDB 的基本数据单元，类似关系数据库的行
- **集合 (Collection)**：文档的容器，类似关系数据库的表
- **数据库 (Database)**：集合的容器
- **字段 (Field)**：文档中的键值对，类似关系数据库的列

### 主要特性

1. **文档导向**：使用 BSON（Binary JSON）格式存储数据
2. **动态模式**：无需预定义表结构
3. **丰富查询**：支持复杂查询、索引和聚合
4. **水平扩展**：内置分片支持
5. **高可用性**：副本集提供自动故障转移
6. **灵活索引**：支持多种索引类型

## 安装与配置

### 安装方式

#### 1. 官方安装包
```bash
# macOS
brew tap mongodb/brew
brew install mongodb-community

# Ubuntu
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# CentOS/RHEL
sudo yum install -y mongodb-org
```

#### 2. Docker 安装
```bash
# 拉取镜像
docker pull mongo:7.0

# 运行容器
docker run --name mongodb \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  -p 27017:27017 \
  -d mongo:7.0

# 带数据持久化
docker run --name mongodb \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  -p 27017:27017 \
  -v /data/mongodb:/data/db \
  -d mongo:7.0
```

### 基本配置

#### mongod.conf 配置文件
```yaml
# 网络配置
net:
  port: 27017
  bindIp: 127.0.0.1,::1
  maxIncomingConnections: 65536

# 存储配置
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
  wiredTiger:
    engineConfig:
      cacheSizeGB: 1
    collectionConfig:
      blockCompressor: snappy
    indexConfig:
      prefixCompression: true

# 系统日志
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log
  logRotate: rename
  verbosity: 0

# 进程管理
processManagement:
  fork: true
  pidFilePath: /var/run/mongodb/mongod.pid

# 安全配置
security:
  authorization: enabled
  keyFile: /etc/mongodb/keyfile

# 副本集配置
replication:
  replSetName: "rs0"

# 分片配置
sharding:
  clusterRole: shardsvr
```

## 数据模型

### 文档结构

```javascript
// 用户文档示例
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "username": "john_doe",
  "email": "john@example.com",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "age": 30,
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "zipCode": "10001"
    }
  },
  "interests": ["programming", "music", "travel"],
  "createdAt": ISODate("2024-01-01T00:00:00Z"),
  "lastLogin": ISODate("2024-12-19T10:00:00Z"),
  "isActive": true
}
```

### 数据类型

```javascript
// MongoDB 支持的数据类型示例
{
  // 基本类型
  "string": "Hello World",
  "number": 42,
  "boolean": true,
  "null": null,
  
  // 特殊类型
  "objectId": ObjectId("507f1f77bcf86cd799439011"),
  "date": ISODate("2024-12-19T10:00:00Z"),
  "regex": /pattern/i,
  "binary": BinData(0, "base64data"),
  
  // 复合类型
  "array": [1, 2, 3, "mixed", {"nested": "object"}],
  "object": {
    "nested": "value",
    "deep": {
      "level": "two"
    }
  },
  
  // 数值类型
  "int32": NumberInt(32),
  "int64": NumberLong(64),
  "decimal": NumberDecimal("123.45")
}
```

## 基本操作

### 数据库和集合操作

```javascript
// 连接到 MongoDB
mongo

// 显示所有数据库
show dbs

// 切换/创建数据库
use myapp

// 显示当前数据库
db

// 显示集合
show collections

// 创建集合
db.createCollection("users")

// 删除集合
db.users.drop()

// 删除数据库
db.dropDatabase()
```

### CRUD 操作

#### 插入文档
```javascript
// 插入单个文档
db.users.insertOne({
  username: "alice",
  email: "alice@example.com",
  age: 25,
  interests: ["reading", "hiking"]
})

// 插入多个文档
db.users.insertMany([
  {
    username: "bob",
    email: "bob@example.com",
    age: 30,
    interests: ["programming", "gaming"]
  },
  {
    username: "charlie",
    email: "charlie@example.com",
    age: 35,
    interests: ["music", "cooking"]
  }
])
```

#### 查询文档
```javascript
// 查询所有文档
db.users.find()

// 格式化输出
db.users.find().pretty()

// 条件查询
db.users.find({age: 30})
db.users.find({age: {$gte: 25}})
db.users.find({interests: "programming"})

// 逻辑操作符
db.users.find({
  $and: [
    {age: {$gte: 25}},
    {age: {$lte: 35}}
  ]
})

db.users.find({
  $or: [
    {age: {$lt: 25}},
    {age: {$gt: 35}}
  ]
})

// 字段投影
db.users.find({}, {username: 1, email: 1, _id: 0})

// 排序
db.users.find().sort({age: 1})  // 升序
db.users.find().sort({age: -1}) // 降序

// 限制和跳过
db.users.find().limit(5)
db.users.find().skip(10).limit(5)

// 计数
db.users.countDocuments()
db.users.countDocuments({age: {$gte: 30}})
```

#### 更新文档
```javascript
// 更新单个文档
db.users.updateOne(
  {username: "alice"},
  {$set: {age: 26, lastLogin: new Date()}}
)

// 更新多个文档
db.users.updateMany(
  {age: {$lt: 30}},
  {$set: {category: "young"}}
)

// 替换文档
db.users.replaceOne(
  {username: "bob"},
  {
    username: "bob",
    email: "bob.new@example.com",
    age: 31,
    interests: ["programming", "photography"]
  }
)

// Upsert（不存在则插入）
db.users.updateOne(
  {username: "david"},
  {$set: {email: "david@example.com", age: 28}},
  {upsert: true}
)

// 数组操作
db.users.updateOne(
  {username: "alice"},
  {$push: {interests: "photography"}}
)

db.users.updateOne(
  {username: "alice"},
  {$pull: {interests: "reading"}}
)

db.users.updateOne(
  {username: "alice"},
  {$addToSet: {interests: "travel"}}
)
```

#### 删除文档
```javascript
// 删除单个文档
db.users.deleteOne({username: "charlie"})

// 删除多个文档
db.users.deleteMany({age: {$lt: 25}})

// 删除所有文档
db.users.deleteMany({})
```

## 高级查询

### 复杂查询操作

```javascript
// 正则表达式查询
db.users.find({email: /gmail\.com$/})
db.users.find({username: /^a/i})

// 数组查询
db.users.find({interests: {$in: ["programming", "music"]}})
db.users.find({interests: {$all: ["programming", "gaming"]}})
db.users.find({interests: {$size: 2}})

// 嵌套文档查询
db.users.find({"profile.age": {$gte: 30}})
db.users.find({"profile.address.city": "New York"})

// 存在性查询
db.users.find({email: {$exists: true}})
db.users.find({phone: {$exists: false}})

// 类型查询
db.users.find({age: {$type: "number"}})
db.users.find({_id: {$type: "objectId"}})

// 文本搜索
db.users.createIndex({username: "text", email: "text"})
db.users.find({$text: {$search: "alice"}})
```

### 聚合管道

```javascript
// 基本聚合
db.users.aggregate([
  {$match: {age: {$gte: 25}}},
  {$group: {
    _id: "$category",
    count: {$sum: 1},
    avgAge: {$avg: "$age"}
  }},
  {$sort: {count: -1}}
])

// 复杂聚合示例
db.orders.aggregate([
  // 阶段1：匹配条件
  {$match: {
    orderDate: {$gte: ISODate("2024-01-01")}
  }},
  
  // 阶段2：展开数组
  {$unwind: "$items"},
  
  // 阶段3：关联查询
  {$lookup: {
    from: "products",
    localField: "items.productId",
    foreignField: "_id",
    as: "productInfo"
  }},
  
  // 阶段4：展开关联结果
  {$unwind: "$productInfo"},
  
  // 阶段5：计算字段
  {$addFields: {
    itemTotal: {$multiply: ["$items.quantity", "$productInfo.price"]}
  }},
  
  // 阶段6：分组统计
  {$group: {
    _id: {
      category: "$productInfo.category",
      month: {$month: "$orderDate"}
    },
    totalSales: {$sum: "$itemTotal"},
    totalQuantity: {$sum: "$items.quantity"},
    orderCount: {$sum: 1}
  }},
  
  // 阶段7：排序
  {$sort: {"_id.month": 1, totalSales: -1}},
  
  // 阶段8：投影
  {$project: {
    _id: 0,
    category: "$_id.category",
    month: "$_id.month",
    totalSales: 1,
    totalQuantity: 1,
    orderCount: 1,
    avgOrderValue: {$divide: ["$totalSales", "$orderCount"]}
  }}
])
```

## 索引优化

### 索引类型

```javascript
// 单字段索引
db.users.createIndex({username: 1})  // 升序
db.users.createIndex({age: -1})      // 降序

// 复合索引
db.users.createIndex({age: 1, username: 1})

// 多键索引（数组字段）
db.users.createIndex({interests: 1})

// 文本索引
db.users.createIndex({
  username: "text",
  email: "text",
  "profile.firstName": "text"
})

// 2dsphere 索引（地理位置）
db.locations.createIndex({coordinates: "2dsphere"})

// 哈希索引
db.users.createIndex({userId: "hashed"})

// 部分索引
db.users.createIndex(
  {email: 1},
  {partialFilterExpression: {email: {$exists: true}}}
)

// 稀疏索引
db.users.createIndex({phone: 1}, {sparse: true})

// 唯一索引
db.users.createIndex({email: 1}, {unique: true})

// TTL 索引（自动过期）
db.sessions.createIndex(
  {createdAt: 1},
  {expireAfterSeconds: 3600}
)
```

### 索引管理

```javascript
// 查看索引
db.users.getIndexes()

// 查看索引使用情况
db.users.find({username: "alice"}).explain("executionStats")

// 删除索引
db.users.dropIndex({username: 1})
db.users.dropIndex("username_1")

// 重建索引
db.users.reIndex()

// 查看索引大小
db.users.totalIndexSize()

// 索引统计
db.users.aggregate([{$indexStats: {}}])
```

## 副本集

### 副本集配置

```javascript
// 初始化副本集
rs.initiate({
  _id: "rs0",
  members: [
    {_id: 0, host: "mongodb1:27017", priority: 2},
    {_id: 1, host: "mongodb2:27017", priority: 1},
    {_id: 2, host: "mongodb3:27017", arbiterOnly: true}
  ]
})

// 查看副本集状态
rs.status()

// 查看副本集配置
rs.conf()

// 添加成员
rs.add("mongodb4:27017")

// 删除成员
rs.remove("mongodb4:27017")

// 设置优先级
var config = rs.conf()
config.members[1].priority = 0.5
rs.reconfig(config)

// 强制选举
rs.stepDown()
```

### 读写配置

```javascript
// 设置读偏好
db.users.find().readPref("secondary")
db.users.find().readPref("secondaryPreferred")

// 设置写关注
db.users.insertOne(
  {username: "test"},
  {writeConcern: {w: "majority", j: true, wtimeout: 5000}}
)

// 设置读关注
db.users.find().readConcern("majority")
```

## 分片

### 分片集群配置

```javascript
// 启用分片
sh.enableSharding("myapp")

// 创建分片键
sh.shardCollection("myapp.users", {userId: "hashed"})
sh.shardCollection("myapp.orders", {customerId: 1, orderDate: 1})

// 查看分片状态
sh.status()

// 查看分片分布
db.users.getShardDistribution()

// 添加分片
sh.addShard("rs1/mongodb4:27017,mongodb5:27017,mongodb6:27017")

// 移除分片
sh.removeShard("rs1")

// 平衡器控制
sh.startBalancer()
sh.stopBalancer()
sh.isBalancerRunning()
```

## 性能优化

### 查询优化

```javascript
// 使用 explain 分析查询
db.users.find({age: {$gte: 30}}).explain("executionStats")

// 查看慢查询
db.setProfilingLevel(2, {slowms: 100})
db.system.profile.find().sort({ts: -1}).limit(5)

// 使用 hint 强制使用索引
db.users.find({age: 30}).hint({age: 1})

// 批量操作
var bulk = db.users.initializeUnorderedBulkOp()
bulk.insert({username: "user1", age: 25})
bulk.insert({username: "user2", age: 30})
bulk.find({username: "user1"}).updateOne({$set: {age: 26}})
bulk.execute()
```

### 内存和存储优化

```javascript
// 查看集合统计
db.users.stats()

// 查看数据库统计
db.stats()

// 压缩集合
db.runCommand({compact: "users"})

// 查看连接状态
db.serverStatus().connections

// 查看内存使用
db.serverStatus().mem

// 查看操作统计
db.serverStatus().opcounters
```

## 备份与恢复

### mongodump 和 mongorestore

```bash
# 备份整个数据库
mongodump --host localhost:27017 --db myapp --out /backup/

# 备份特定集合
mongodump --host localhost:27017 --db myapp --collection users --out /backup/

# 压缩备份
mongodump --host localhost:27017 --db myapp --gzip --out /backup/

# 恢复数据库
mongorestore --host localhost:27017 --db myapp /backup/myapp/

# 恢复到不同数据库
mongorestore --host localhost:27017 --db newapp /backup/myapp/

# 删除现有数据后恢复
mongorestore --host localhost:27017 --db myapp --drop /backup/myapp/
```

### mongoexport 和 mongoimport

```bash
# 导出为 JSON
mongoexport --host localhost:27017 --db myapp --collection users --out users.json

# 导出为 CSV
mongoexport --host localhost:27017 --db myapp --collection users --type csv --fields username,email,age --out users.csv

# 导入 JSON
mongoimport --host localhost:27017 --db myapp --collection users --file users.json

# 导入 CSV
mongoimport --host localhost:27017 --db myapp --collection users --type csv --headerline --file users.csv
```

## 安全性

### 认证和授权

```javascript
// 创建管理员用户
use admin
db.createUser({
  user: "admin",
  pwd: "password",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})

// 创建数据库用户
use myapp
db.createUser({
  user: "appuser",
  pwd: "apppassword",
  roles: [
    {role: "readWrite", db: "myapp"},
    {role: "read", db: "logs"}
  ]
})

// 创建只读用户
db.createUser({
  user: "readonly",
  pwd: "readpassword",
  roles: [{role: "read", db: "myapp"}]
})

// 查看用户
db.getUsers()

// 删除用户
db.dropUser("username")

// 修改用户密码
db.changeUserPassword("username", "newpassword")
```

### SSL/TLS 配置

```yaml
# mongod.conf
net:
  ssl:
    mode: requireSSL
    PEMKeyFile: /etc/ssl/mongodb.pem
    CAFile: /etc/ssl/ca.pem
    allowConnectionsWithoutCertificates: false
```

## 监控与运维

### 监控指标

```javascript
// 服务器状态
db.serverStatus()

// 数据库统计
db.stats()

// 集合统计
db.users.stats()

// 当前操作
db.currentOp()

// 终止操作
db.killOp(opid)

// 副本集状态
rs.status()

// 分片状态
sh.status()
```

### 日志分析

```bash
# 查看日志
tail -f /var/log/mongodb/mongod.log

# 过滤慢查询
grep "slow operation" /var/log/mongodb/mongod.log

# 分析连接
grep "connection" /var/log/mongodb/mongod.log
```

## 最佳实践

### 1. 数据建模

- **嵌入 vs 引用**：根据数据访问模式选择
- **反规范化**：适度冗余提高查询性能
- **数组大小**：避免无限增长的数组
- **文档大小**：控制在 16MB 以内

### 2. 索引策略

- **查询模式**：根据查询模式创建索引
- **复合索引**：注意字段顺序
- **索引维护**：定期检查索引使用情况
- **避免过多索引**：影响写入性能

### 3. 性能优化

- **连接池**：合理配置连接池大小
- **批量操作**：使用批量操作提高效率
- **分页查询**：使用 skip 和 limit 要谨慎
- **聚合优化**：合理使用聚合管道

### 4. 运维管理

- **监控告警**：设置关键指标监控
- **备份策略**：定期备份和恢复测试
- **容量规划**：监控存储和内存使用
- **版本升级**：及时升级到稳定版本

## 总结

MongoDB 是一个功能强大的文档数据库，特别适合需要灵活数据模型和快速开发的现代应用。其丰富的查询功能、良好的扩展性和高可用性特性，使其成为 NoSQL 数据库的优秀选择。

### 优势

- 灵活的文档模型
- 强大的查询和聚合功能
- 良好的水平扩展能力
- 丰富的索引支持
- 活跃的社区和生态

### 适用场景

- 内容管理系统
- 实时分析应用
- 物联网数据存储
- 移动应用后端
- 大数据处理

通过合理的数据建模、索引设计和性能优化，MongoDB 能够为各种应用提供高效、可靠的数据存储解决方案。