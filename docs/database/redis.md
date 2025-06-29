---
title: Redis 详解
author: Walt
date: 2024-12-19 10:00:00
LastEditTime: 2024-12-19 10:00:00
LastEditors: Walt
---

# Redis 详解

Redis（Remote Dictionary Server）是一个开源的内存数据结构存储系统，可以用作数据库、缓存和消息代理。它支持多种数据结构，具有高性能、高可用性和丰富的功能特性。

## 概述

### 核心特性

1. **内存存储**：所有数据存储在内存中，提供极高的读写性能
2. **丰富的数据类型**：支持字符串、哈希、列表、集合、有序集合等
3. **持久化**：支持 RDB 和 AOF 两种持久化方式
4. **高可用性**：支持主从复制、哨兵模式和集群模式
5. **原子操作**：所有操作都是原子性的
6. **发布订阅**：支持消息发布订阅模式
7. **事务支持**：支持事务和 Lua 脚本

### 应用场景

- **缓存系统**：Web 应用缓存、数据库查询缓存
- **会话存储**：用户会话信息存储
- **计数器**：网站访问量、点赞数等计数
- **排行榜**：游戏排行榜、热门文章排序
- **消息队列**：简单的消息队列实现
- **分布式锁**：分布式系统中的锁机制
- **实时分析**：实时数据统计和分析

## 安装与配置

### 安装方式

#### 1. 官方安装包
```bash
# macOS
brew install redis

# Ubuntu/Debian
sudo apt update
sudo apt install redis-server

# CentOS/RHEL
sudo yum install epel-release
sudo yum install redis

# 编译安装
wget http://download.redis.io/redis-stable.tar.gz
tar xzf redis-stable.tar.gz
cd redis-stable
make
make install
```

#### 2. Docker 安装
```bash
# 拉取镜像
docker pull redis:7.2

# 运行容器
docker run --name redis-server \
  -p 6379:6379 \
  -d redis:7.2

# 带配置文件运行
docker run --name redis-server \
  -p 6379:6379 \
  -v /path/to/redis.conf:/usr/local/etc/redis/redis.conf \
  -d redis:7.2 redis-server /usr/local/etc/redis/redis.conf

# 带数据持久化
docker run --name redis-server \
  -p 6379:6379 \
  -v /data/redis:/data \
  -d redis:7.2 redis-server --appendonly yes
```

### 基本配置

#### redis.conf 主要配置
```ini
# 网络配置
bind 127.0.0.1 ::1
port 6379
tcp-backlog 511
timeout 0
tcp-keepalive 300

# 通用配置
daemonize yes
pidfile /var/run/redis_6379.pid
loglevel notice
logfile /var/log/redis/redis-server.log
databases 16

# 内存配置
maxmemory 2gb
maxmemory-policy allkeys-lru

# 持久化配置
# RDB 配置
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis

# AOF 配置
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# 安全配置
requirepass your_password
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG "CONFIG_9a8b7c6d"

# 客户端配置
maxclients 10000

# 慢查询配置
slowlog-log-slower-than 10000
slowlog-max-len 128
```

## 数据类型与操作

### 1. 字符串 (String)

```bash
# 基本操作
SET key value
GET key
DEL key
EXISTS key

# 设置过期时间
SET key value EX 3600  # 秒
SET key value PX 3600000  # 毫秒
SETEX key 3600 value
EXPIRE key 3600
TTL key

# 数值操作
SET counter 10
INCR counter
DECR counter
INCRBY counter 5
DECRBY counter 3

# 字符串操作
SET name "Redis"
APPEND name " Database"
STRLEN name
GETRANGE name 0 4
SETRANGE name 6 "Cache"

# 批量操作
MSET key1 value1 key2 value2 key3 value3
MGET key1 key2 key3

# 条件设置
SETNX key value  # 仅当 key 不存在时设置
SET key value NX  # 同上
SET key value XX  # 仅当 key 存在时设置
```

### 2. 哈希 (Hash)

```bash
# 基本操作
HSET user:1 name "Alice" age 30 email "alice@example.com"
HGET user:1 name
HGETALL user:1
HDEL user:1 email
HEXISTS user:1 name
HLEN user:1

# 批量操作
HMSET user:2 name "Bob" age 25 city "New York"
HMGET user:2 name age city

# 数值操作
HINCRBY user:1 age 1
HINCRBYFLOAT user:1 score 1.5

# 获取所有键或值
HKEYS user:1
HVALS user:1

# 条件设置
HSETNX user:1 phone "123456789"
```

### 3. 列表 (List)

```bash
# 添加元素
LPUSH mylist "first"
RPUSH mylist "second" "third"
LINSERT mylist BEFORE "second" "middle"

# 获取元素
LRANGE mylist 0 -1  # 获取所有元素
LINDEX mylist 0     # 获取指定位置元素
LLEN mylist         # 获取列表长度

# 删除元素
LPOP mylist         # 从左侧弹出
RPOP mylist         # 从右侧弹出
LREM mylist 1 "second"  # 删除指定值
LTRIM mylist 0 2    # 保留指定范围

# 修改元素
LSET mylist 0 "new_first"

# 阻塞操作
BLPOP mylist 10     # 阻塞式左侧弹出
BRPOP mylist 10     # 阻塞式右侧弹出
BRPOPLPUSH source dest 10  # 阻塞式右弹左推
```

### 4. 集合 (Set)

```bash
# 添加和删除
SADD myset "apple" "banana" "orange"
SREM myset "banana"
SPOP myset          # 随机弹出一个元素

# 查询操作
SMEMBERS myset      # 获取所有成员
SISMEMBER myset "apple"  # 检查成员是否存在
SCARD myset         # 获取集合大小
SRANDMEMBER myset 2 # 随机获取成员

# 集合运算
SADD set1 "a" "b" "c"
SADD set2 "b" "c" "d"
SUNION set1 set2    # 并集
SINTER set1 set2    # 交集
SDIFF set1 set2     # 差集

# 存储运算结果
SUNIONSTORE result set1 set2
SINTERSTORE result set1 set2
SDIFFSTORE result set1 set2
```

### 5. 有序集合 (Sorted Set)

```bash
# 添加元素
ZADD leaderboard 100 "Alice" 85 "Bob" 92 "Charlie"
ZADD leaderboard 88 "David"

# 查询操作
ZRANGE leaderboard 0 -1 WITHSCORES  # 按分数升序
ZREVRANGE leaderboard 0 -1 WITHSCORES  # 按分数降序
ZRANK leaderboard "Alice"    # 获取排名（升序）
ZREVRANK leaderboard "Alice" # 获取排名（降序）
ZSCORE leaderboard "Alice"   # 获取分数
ZCARD leaderboard            # 获取元素数量

# 范围查询
ZRANGEBYSCORE leaderboard 80 95 WITHSCORES
ZREVRANGEBYSCORE leaderboard 95 80 WITHSCORES
ZCOUNT leaderboard 80 95

# 修改分数
ZINCRBY leaderboard 5 "Bob"

# 删除元素
ZREM leaderboard "Charlie"
ZREMRANGEBYRANK leaderboard 0 0  # 删除排名范围
ZREMRANGEBYSCORE leaderboard 0 60  # 删除分数范围

# 集合运算
ZUNIONSTORE result 2 set1 set2 WEIGHTS 1 2
ZINTERSTORE result 2 set1 set2 AGGREGATE MAX
```

### 6. 位图 (Bitmap)

```bash
# 设置位
SETBIT user:login:20241219 123 1  # 用户 123 在今天登录
SETBIT user:login:20241219 456 1  # 用户 456 在今天登录

# 获取位
GETBIT user:login:20241219 123

# 统计
BITCOUNT user:login:20241219      # 今天登录的用户数
BITCOUNT user:login:20241219 0 100  # 用户 0-100 中登录的数量

# 位运算
BITOP AND result user:login:20241218 user:login:20241219  # 连续两天都登录
BITOP OR result user:login:20241218 user:login:20241219   # 两天内登录过
BITOP XOR result user:login:20241218 user:login:20241219  # 只在一天登录

# 查找位
BITPOS user:login:20241219 1      # 第一个登录用户的 ID
BITPOS user:login:20241219 0      # 第一个未登录用户的 ID
```

### 7. HyperLogLog

```bash
# 添加元素
PFADD unique:visitors "user1" "user2" "user3"
PFADD unique:visitors "user1" "user4"  # user1 重复，不会增加计数

# 获取基数估算
PFCOUNT unique:visitors

# 合并 HyperLogLog
PFADD unique:visitors:page1 "user1" "user2"
PFADD unique:visitors:page2 "user2" "user3"
PFMERGE unique:visitors:total unique:visitors:page1 unique:visitors:page2
PFCOUNT unique:visitors:total
```

### 8. 流 (Stream)

```bash
# 添加消息
XADD mystream * field1 value1 field2 value2
XADD mystream 1640000000000-0 user "Alice" action "login"

# 读取消息
XRANGE mystream - +           # 读取所有消息
XRANGE mystream - + COUNT 10  # 读取前 10 条消息
XREVRANGE mystream + - COUNT 5  # 倒序读取 5 条消息

# 获取流信息
XLEN mystream
XINFO STREAM mystream

# 消费者组
XGROUP CREATE mystream mygroup $ MKSTREAM
XREADGROUP GROUP mygroup consumer1 COUNT 1 STREAMS mystream >

# 确认消息
XACK mystream mygroup 1640000000000-0

# 查看待处理消息
XPENDING mystream mygroup
```

## 高级功能

### 1. 事务

```bash
# 基本事务
MULTI
SET key1 "value1"
SET key2 "value2"
INCR counter
EXEC

# 取消事务
MULTI
SET key1 "value1"
DISCARD

# 监视键（乐观锁）
WATCH key1
MULTI
SET key1 "new_value"
EXEC

# 取消监视
UNWATCH
```

### 2. Lua 脚本

```bash
# 执行 Lua 脚本
EVAL "return redis.call('SET', KEYS[1], ARGV[1])" 1 mykey myvalue

# 复杂脚本示例：原子性增加并设置过期时间
EVAL "
local current = redis.call('GET', KEYS[1])
if current == false then
    redis.call('SET', KEYS[1], 1)
    redis.call('EXPIRE', KEYS[1], ARGV[1])
    return 1
else
    return redis.call('INCR', KEYS[1])
end
" 1 counter 3600

# 加载脚本
SCRIPT LOAD "return redis.call('GET', KEYS[1])"
# 返回 SHA1 值，如：c686f316aaf1eb01d5a4de1b2b733d0c7853842f

# 使用 SHA1 执行脚本
EVALSHA c686f316aaf1eb01d5a4de1b2b733d0c7853842f 1 mykey

# 检查脚本是否存在
SCRIPT EXISTS c686f316aaf1eb01d5a4de1b2b733d0c7853842f

# 清除脚本缓存
SCRIPT FLUSH
```

### 3. 发布订阅

```bash
# 订阅频道
SUBSCRIBE news sports

# 模式订阅
PSUBSCRIBE news:* sport:*

# 发布消息
PUBLISH news "Breaking news!"
PUBLISH sports "Game result"

# 查看频道信息
PUBSUB CHANNELS        # 所有活跃频道
PUBSUB CHANNELS news*  # 匹配模式的频道
PUBSUB NUMSUB news sports  # 频道订阅者数量
PUBSUB NUMPAT          # 模式订阅数量

# 取消订阅
UNSUBSCRIBE news
PUNSUBSCRIBE news:*
```

### 4. 管道 (Pipeline)

```python
# Python 示例
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

# 使用管道
pipe = r.pipeline()
pipe.set('key1', 'value1')
pipe.set('key2', 'value2')
pipe.get('key1')
pipe.get('key2')
results = pipe.execute()
print(results)  # [True, True, b'value1', b'value2']
```

## 持久化

### 1. RDB 持久化

```bash
# 手动触发 RDB 保存
SAVE      # 同步保存（阻塞）
BGSAVE    # 异步保存（非阻塞）

# 查看最后保存时间
LASTSAVE

# 配置自动保存
# redis.conf 中配置
save 900 1    # 900 秒内至少 1 个键改变
save 300 10   # 300 秒内至少 10 个键改变
save 60 10000 # 60 秒内至少 10000 个键改变

# 禁用 RDB
save ""
```

### 2. AOF 持久化

```bash
# 启用 AOF
# redis.conf 中配置
appendonly yes
appendfilename "appendonly.aof"

# AOF 同步策略
appendfsync always    # 每个写命令都同步
appendfsync everysec  # 每秒同步一次（推荐）
appendfsync no        # 由操作系统决定

# 手动重写 AOF
BGREWRITEAOF

# 自动重写配置
auto-aof-rewrite-percentage 100  # 文件大小增长 100% 时重写
auto-aof-rewrite-min-size 64mb   # 最小重写文件大小
```

### 3. 混合持久化

```ini
# redis.conf 配置
aof-use-rdb-preamble yes  # 启用混合持久化
```

## 高可用性

### 1. 主从复制

#### 主服务器配置
```ini
# redis.conf
bind 0.0.0.0
port 6379
requirepass master_password
masterauth master_password
```

#### 从服务器配置
```ini
# redis.conf
replicaof 192.168.1.100 6379
masterauth master_password
requirepass replica_password
replica-read-only yes
```

#### 运行时配置
```bash
# 设置主从关系
REPLICAOF 192.168.1.100 6379

# 取消主从关系
REPLICAOF NO ONE

# 查看复制信息
INFO replication
```

### 2. 哨兵模式

#### 哨兵配置文件 (sentinel.conf)
```ini
port 26379
sentinel monitor mymaster 192.168.1.100 6379 2
sentinel auth-pass mymaster master_password
sentinel down-after-milliseconds mymaster 5000
sentinel parallel-syncs mymaster 1
sentinel failover-timeout mymaster 10000
```

#### 启动哨兵
```bash
redis-sentinel /path/to/sentinel.conf
```

#### 哨兵命令
```bash
# 连接哨兵
redis-cli -p 26379

# 查看主服务器信息
SENTINEL masters
SENTINEL master mymaster

# 查看从服务器信息
SENTINEL slaves mymaster

# 查看哨兵信息
SENTINEL sentinels mymaster

# 手动故障转移
SENTINEL failover mymaster
```

### 3. 集群模式

#### 集群配置
```ini
# redis.conf
port 7000
cluster-enabled yes
cluster-config-file nodes-7000.conf
cluster-node-timeout 5000
appendonly yes
```

#### 创建集群
```bash
# 启动节点
redis-server redis-7000.conf
redis-server redis-7001.conf
redis-server redis-7002.conf
redis-server redis-7003.conf
redis-server redis-7004.conf
redis-server redis-7005.conf

# 创建集群
redis-cli --cluster create \
  127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
  127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
  --cluster-replicas 1
```

#### 集群管理
```bash
# 连接集群
redis-cli -c -p 7000

# 查看集群信息
CLUSTER INFO
CLUSTER NODES

# 添加节点
redis-cli --cluster add-node 127.0.0.1:7006 127.0.0.1:7000

# 删除节点
redis-cli --cluster del-node 127.0.0.1:7000 node_id

# 重新分片
redis-cli --cluster reshard 127.0.0.1:7000

# 检查集群
redis-cli --cluster check 127.0.0.1:7000
```

## 性能优化

### 1. 内存优化

```bash
# 查看内存使用
INFO memory
MEMORY USAGE key

# 内存分析
MEMORY STATS
MEMORY DOCTOR

# 设置内存限制和淘汰策略
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru

# 淘汰策略选项：
# noeviction: 不淘汰，内存满时返回错误
# allkeys-lru: 所有键中淘汰最近最少使用
# volatile-lru: 有过期时间的键中淘汰最近最少使用
# allkeys-random: 所有键中随机淘汰
# volatile-random: 有过期时间的键中随机淘汰
# volatile-ttl: 淘汰即将过期的键
# allkeys-lfu: 所有键中淘汰最少使用频率
# volatile-lfu: 有过期时间的键中淘汰最少使用频率
```

### 2. 网络优化

```ini
# redis.conf
tcp-nodelay yes          # 禁用 Nagle 算法
tcp-keepalive 300        # TCP keepalive
timeout 0                # 客户端空闲超时
maxclients 10000         # 最大客户端连接数
```

### 3. 慢查询分析

```bash
# 配置慢查询
CONFIG SET slowlog-log-slower-than 10000  # 10ms
CONFIG SET slowlog-max-len 128

# 查看慢查询
SLOWLOG GET 10
SLOWLOG LEN
SLOWLOG RESET
```

## 监控与运维

### 1. 监控指标

```bash
# 服务器信息
INFO
INFO server
INFO clients
INFO memory
INFO persistence
INFO stats
INFO replication
INFO cpu
INFO cluster
INFO keyspace

# 实时监控
MONITOR

# 客户端连接
CLIENT LIST
CLIENT INFO
CLIENT KILL ip:port

# 配置信息
CONFIG GET *
CONFIG GET maxmemory
CONFIG SET maxmemory 2gb
```

### 2. 性能测试

```bash
# 基准测试
redis-benchmark -h 127.0.0.1 -p 6379 -n 100000 -c 50

# 指定测试命令
redis-benchmark -h 127.0.0.1 -p 6379 -t set,get -n 100000 -q

# 测试管道性能
redis-benchmark -h 127.0.0.1 -p 6379 -n 100000 -P 16

# 测试特定数据大小
redis-benchmark -h 127.0.0.1 -p 6379 -n 100000 -d 100
```

### 3. 备份与恢复

```bash
# RDB 备份
cp /var/lib/redis/dump.rdb /backup/dump-$(date +%Y%m%d).rdb

# AOF 备份
cp /var/lib/redis/appendonly.aof /backup/appendonly-$(date +%Y%m%d).aof

# 恢复数据
# 1. 停止 Redis 服务
sudo systemctl stop redis

# 2. 替换数据文件
cp /backup/dump.rdb /var/lib/redis/dump.rdb

# 3. 启动 Redis 服务
sudo systemctl start redis
```

## 实际应用案例

### 1. 缓存系统

```python
import redis
import json
import time

class CacheManager:
    def __init__(self, host='localhost', port=6379, db=0):
        self.redis_client = redis.Redis(host=host, port=port, db=db)
    
    def get_user(self, user_id):
        # 先从缓存获取
        cache_key = f"user:{user_id}"
        cached_data = self.redis_client.get(cache_key)
        
        if cached_data:
            return json.loads(cached_data)
        
        # 缓存未命中，从数据库获取
        user_data = self.get_user_from_db(user_id)
        
        # 存入缓存，设置 1 小时过期
        self.redis_client.setex(
            cache_key, 
            3600, 
            json.dumps(user_data)
        )
        
        return user_data
    
    def get_user_from_db(self, user_id):
        # 模拟数据库查询
        time.sleep(0.1)
        return {
            'id': user_id,
            'name': f'User {user_id}',
            'email': f'user{user_id}@example.com'
        }
```

### 2. 分布式锁

```python
import redis
import uuid
import time

class DistributedLock:
    def __init__(self, redis_client, key, timeout=10):
        self.redis_client = redis_client
        self.key = key
        self.timeout = timeout
        self.identifier = str(uuid.uuid4())
    
    def acquire(self):
        end_time = time.time() + self.timeout
        
        while time.time() < end_time:
            # 尝试获取锁
            if self.redis_client.set(self.key, self.identifier, nx=True, ex=self.timeout):
                return True
            time.sleep(0.001)
        
        return False
    
    def release(self):
        # 使用 Lua 脚本确保原子性
        lua_script = """
        if redis.call('GET', KEYS[1]) == ARGV[1] then
            return redis.call('DEL', KEYS[1])
        else
            return 0
        end
        """
        
        return self.redis_client.eval(lua_script, 1, self.key, self.identifier)

# 使用示例
r = redis.Redis()
lock = DistributedLock(r, 'my_resource')

if lock.acquire():
    try:
        # 执行需要锁保护的代码
        print("获取锁成功，执行业务逻辑")
        time.sleep(5)
    finally:
        lock.release()
else:
    print("获取锁失败")
```

### 3. 排行榜系统

```python
import redis
import time

class Leaderboard:
    def __init__(self, redis_client, name):
        self.redis_client = redis_client
        self.key = f"leaderboard:{name}"
    
    def add_score(self, user_id, score):
        """添加或更新用户分数"""
        self.redis_client.zadd(self.key, {user_id: score})
    
    def increment_score(self, user_id, increment):
        """增加用户分数"""
        return self.redis_client.zincrby(self.key, increment, user_id)
    
    def get_top_users(self, count=10):
        """获取排行榜前 N 名"""
        return self.redis_client.zrevrange(
            self.key, 0, count-1, withscores=True
        )
    
    def get_user_rank(self, user_id):
        """获取用户排名"""
        rank = self.redis_client.zrevrank(self.key, user_id)
        return rank + 1 if rank is not None else None
    
    def get_user_score(self, user_id):
        """获取用户分数"""
        return self.redis_client.zscore(self.key, user_id)
    
    def get_users_around(self, user_id, count=5):
        """获取用户周围的排名"""
        rank = self.redis_client.zrevrank(self.key, user_id)
        if rank is None:
            return []
        
        start = max(0, rank - count // 2)
        end = start + count - 1
        
        return self.redis_client.zrevrange(
            self.key, start, end, withscores=True
        )

# 使用示例
r = redis.Redis()
leaderboard = Leaderboard(r, 'game_scores')

# 添加分数
leaderboard.add_score('user1', 1000)
leaderboard.add_score('user2', 1500)
leaderboard.add_score('user3', 800)

# 获取排行榜
top_users = leaderboard.get_top_users(10)
print("排行榜前10名:", top_users)

# 获取用户排名
rank = leaderboard.get_user_rank('user2')
print(f"user2 的排名: {rank}")
```

### 4. 限流器

```python
import redis
import time

class RateLimiter:
    def __init__(self, redis_client):
        self.redis_client = redis_client
    
    def is_allowed(self, key, limit, window):
        """滑动窗口限流"""
        now = time.time()
        pipeline = self.redis_client.pipeline()
        
        # 删除窗口外的记录
        pipeline.zremrangebyscore(key, 0, now - window)
        
        # 获取当前窗口内的请求数
        pipeline.zcard(key)
        
        # 添加当前请求
        pipeline.zadd(key, {str(now): now})
        
        # 设置过期时间
        pipeline.expire(key, int(window) + 1)
        
        results = pipeline.execute()
        current_requests = results[1]
        
        return current_requests < limit
    
    def token_bucket(self, key, capacity, refill_rate, tokens_requested=1):
        """令牌桶限流"""
        lua_script = """
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local tokens_requested = tonumber(ARGV[3])
        local now = tonumber(ARGV[4])
        
        local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
        local tokens = tonumber(bucket[1]) or capacity
        local last_refill = tonumber(bucket[2]) or now
        
        -- 计算需要添加的令牌数
        local elapsed = now - last_refill
        local tokens_to_add = math.floor(elapsed * refill_rate)
        tokens = math.min(capacity, tokens + tokens_to_add)
        
        if tokens >= tokens_requested then
            tokens = tokens - tokens_requested
            redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
            redis.call('EXPIRE', key, 3600)
            return 1
        else
            redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
            redis.call('EXPIRE', key, 3600)
            return 0
        end
        """
        
        result = self.redis_client.eval(
            lua_script, 1, key, capacity, refill_rate, tokens_requested, time.time()
        )
        
        return bool(result)

# 使用示例
r = redis.Redis()
limiter = RateLimiter(r)

# 滑动窗口限流：每分钟最多 100 次请求
user_id = 'user123'
if limiter.is_allowed(f'rate_limit:{user_id}', 100, 60):
    print("请求允许")
else:
    print("请求被限流")

# 令牌桶限流：容量 10，每秒补充 1 个令牌
if limiter.token_bucket(f'token_bucket:{user_id}', 10, 1, 1):
    print("请求允许")
else:
    print("请求被限流")
```

## 最佳实践

### 1. 键命名规范

```bash
# 使用有意义的前缀和分隔符
user:1001:profile
user:1001:sessions
cache:article:123
counter:page_views:20241219
lock:order:456
queue:email:pending

# 避免过长的键名
# 好的例子
user:1001:profile
# 不好的例子
very_long_application_name:user_management:user_profile:user_id_1001
```

### 2. 数据结构选择

- **String**：简单的键值对、计数器、缓存
- **Hash**：对象存储、用户信息
- **List**：消息队列、最新列表
- **Set**：标签、去重
- **Sorted Set**：排行榜、时间序列
- **Bitmap**：用户签到、在线状态
- **HyperLogLog**：基数统计、UV 统计

### 3. 过期时间设置

```bash
# 为缓存数据设置合理的过期时间
SETEX cache:user:1001 3600 "user_data"  # 1小时
SETEX session:abc123 1800 "session_data"  # 30分钟

# 使用随机过期时间避免缓存雪崩
SETEX cache:article:123 $((3600 + RANDOM % 600)) "article_data"
```

### 4. 内存优化

```bash
# 使用合适的数据结构
# 小的 hash 使用 ziplist 编码
hash-max-ziplist-entries 512
hash-max-ziplist-value 64

# 小的 list 使用 ziplist 编码
list-max-ziplist-size -2

# 小的 set 使用 intset 编码
set-max-intset-entries 512

# 小的 zset 使用 ziplist 编码
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
```

### 5. 安全配置

```ini
# 设置密码
requirepass your_strong_password

# 重命名危险命令
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG "CONFIG_9a8b7c6d"
rename-command EVAL ""

# 绑定特定 IP
bind 127.0.0.1 192.168.1.100

# 禁用保护模式（仅在安全网络环境下）
protected-mode yes
```

## 总结

Redis 是一个功能强大、性能优异的内存数据库，适用于缓存、会话存储、实时分析、消息队列等多种场景。通过合理的数据结构选择、配置优化和架构设计，Redis 能够为应用提供高性能的数据存储和处理能力。

### 优势

- 极高的读写性能
- 丰富的数据类型支持
- 强大的持久化机制
- 良好的高可用性方案
- 活跃的社区和生态

### 适用场景

- Web 应用缓存
- 会话管理
- 实时排行榜
- 计数器和统计
- 消息队列
- 分布式锁
- 限流和防刷

通过深入理解 Redis 的特性和最佳实践，可以充分发挥其在现代应用架构中的价值。