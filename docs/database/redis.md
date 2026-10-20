---
title: Redis
author: Walt
---

<script setup>
import { withBase } from 'vitepress'
</script>

# Redis

订单详情查询可以先读缓存，通知任务可以用 Stream 跟踪消费，导出任务可以用短租约减少重复启动。它们都能用 Redis，但对丢失、重复、过期和恢复的要求不同：缓存丢了通常可重建，已支付订单与待发通知不能只靠一条带 TTL 的键证明已经完成。

本页采用 **Redis 7 系列**的命令语义，以订单查询、通知和限流串联数据结构与运行边界。不要直接套用更新版本才加入的命令选项；连接后用 `INFO server` 核对实际版本。Redis 是内存数据结构服务，持久化、复制和淘汰要分别设计，不能由“高性能”推出业务可靠性。

## 从独立实例开始

以下是本机练习命令，容器不接入网络，也不发布宿主端口，使用 `docker exec` 连接。名称、卷名已存在时先核对归属，换名称，不删除已有服务或卷。

```bash
docker run --name redis-lab --network none \
  --mount source=redis-lab-data,target=/data \
  --detach redis:7-alpine \
  redis-server --bind 127.0.0.1 --protected-mode yes \
  --appendonly yes --appendfsync everysec \
  --maxmemory 128mb --maxmemory-policy noeviction
docker exec -it redis-lab redis-cli
```

下面的 `text` 围栏在这个交互式 redis-cli 中逐条执行，Bash 命令在宿主机执行，不能混用。练习实例使用默认本地用户；生产需要受限网络、ACL 用户和按需要启用 TLS，保护模式不能代替认证，也不要把端口直接发布到所有网卡。密码不要放在命令行 `-a` 或提交到配置仓库。

应用账号只允许业务所需的键前缀、命令与频道，管理、复制、备份使用各自身份。ACL 的键范围不等于 Pub/Sub 频道范围，脚本也要具备其调用命令的权限。不要靠重命名 CONFIG、EVAL 等命令替代权限设计；禁掉 EVAL 还会破坏依赖脚本的客户端。

## 选数据结构，也选数据边界

| 需求 | 结构与操作入口 | 需要额外判断的边界 |
| --- | --- | --- |
| 整份订单详情缓存 | String，SET/GET | 对象大小、TTL、序列化版本与数据库回源 |
| 少量字段单独修改 | Hash，HSET/HGET | Redis 7.0/7.2 不能给每个字段单独设 TTL，不要混用更高版本能力 |
| 无序成员与去重 | Set，SADD/SISMEMBER | 是 Redis 中当前保留集合，不自动成为持久业务幂等记录 |
| 金额/积分排名 | Sorted Set，ZADD/ZRANGE | 分值是浮点数；同分按成员字典序，REV 也会反转同分顺序 |
| 短列表与任务搬移 | List，LPUSH/LMOVE | 单纯 LPOP 后进程崩溃可能丢任务，需处理中队列与重试 |
| 带消费进度的任务流 | Stream，XREADGROUP/XACK | Pending、重领、幂等、保留长度与持久化缺一不可 |
| 密集编号的签到 | Bitmap，SETBIT/BITCOUNT | 偏移是位，默认统计范围是字节；稀疏大编号会扩张内存 |
| 访客规模估算 | HyperLogLog，PFADD/PFCOUNT | 近似基数，不提供完整成员清单，不能替代精确结算 |

```text
SET cache:order:101 '{"id":101,"status":"pending","version":1}' EX 60
GET cache:order:101
TTL cache:order:101
HSET order:101:summary status pending customer_id 1
HGET order:101:summary status
SADD order:101:tags gift express
SISMEMBER order:101:tags gift
ZADD sales:202610 5000 customer:1 3990 customer:2
ZRANGE sales:202610 0 1 REV WITHSCORES
SETBIT login:20261019 123 1
SETBIT login:20261019 456 1
BITCOUNT login:20261019 0 200
BITCOUNT login:20261019 0 200 BIT
PFADD visitors:20261019 user1 user2 user1
PFCOUNT visitors:20261019
```

排名为 customer:1 的 5000、customer:2 的 3990，这里用“分”为整数单位，仍要控制在分值可精确表示的范围内。位图默认 `0 200` 指字节 0～200，包含两位；指定 BIT 后只统计位 0～200，得到 1。BIT 选项从 Redis 7.0 加入。HLL 在本例估计为 2，但大规模结果不能承诺逐个精确。

每个键只能有一种结构，`GET` Hash 会报 WRONGTYPE，不是“对象还没有字段”。键名先分业务与职责，例如 `cache:order:101` 和 `lock:export:{tenant:1}`，不要让锁、计数和缓存共用同一键。花括号还影响 Cluster 槽位，不应随意插入。

## 缓存更新为什么仍有旧值窗口

![订单缓存命中、回源、数据库提交后失效与延迟旧回填的关系](/database/redis-cache-order-race.svg)

Cache-aside 的常见流程是：读命中直接返回，未命中读数据库并以有限 TTL 回填；写入先提交数据库，再使缓存失效。数据库失败时不应先把“成功结果”写入缓存。数据库已提交而删除失败时，要通过可靠的重试、变更事件或其他补偿收敛。

即便“先提交再删”都成功，也存在图中的竞态：A 已读到旧数据库值但迟迟没有回填，B 提交新值并删缓存，随后 A 把旧值放回。TTL 缩短窗口但不提供强一致；延迟双删也只是依赖延迟上界的缓解办法，不能保证所有慢请求被覆盖。

订单支付结果等要求写后立即正确的读取，可直接走权威库，或在明确的版本协议与读取规则下处理。版本号只放进 JSON 里并不会自动拒绝旧回填，需要缓存侧比较/写入协议及失效标记的保留边界。若数据库读副本滞后，回源还可能重新读旧值；仅改 Redis 代码无法消除这种滞后。

缓存不存在的数据可短暂记空值，但要区分“查无此单”和“数据库超时”；后者不能缓存成不存在。热点失效时用合并回源、限并发和抖动 TTL 保护数据库，并明确 Redis 不可用时是降级、限流还是报错，不能让所有请求无限制穿透。

## 原子执行、事务与回滚不是同一件事

Redis 会串行执行许多核心命令，但网络 I/O、后台持久化等工作不能简单概括为“整个服务只有一个线程”。单条命令、MULTI/EXEC 和 Lua 各有边界；多次 GET/SET 组成的业务过程不会因为每条命令独立执行就自动成为一个原子操作。

```text
SET tx:counter text
MULTI
INCR tx:counter
SET tx:done yes
EXEC
GET tx:counter
GET tx:done
```

INCR 在 EXEC 内执行时报类型错误，但后续 SET 仍成功，最终为 `text`、`yes`。Redis 事务不提供关系型数据库式的整体回滚。入队时的参数数量/命令错误则可能让 EXEC 拒绝整组执行，要区分入队错误与执行期错误。Lua 中前面的写入也不会在后续脚本报错时自动撤销，所以先验证参数与键类型，再执行短小、有界的修改。

WATCH 用同一连接监视键，在其他连接修改、过期或淘汰它后，EXEC 可能返回空结果，应用需要有限重试。WATCH、读取、MULTI 与 EXEC 不能被连接池分散到不同连接。Pipeline 主要减少往返，不天然增加隔离性；例如 redis-py 的 `pipeline()` 默认带事务，单纯批量传输要显式选择 `transaction=False`，并检查每条返回值。

## 固定窗口限流与租约锁

每个调用分别 INCR、EXPIRE，在两条命令之间崩溃可能留下无 TTL 计数。使用<a :href="withBase('/database/examples/redis-fixed-window.lua')" download>固定窗口脚本</a>将计数和首个请求的 TTL 放在一次有界执行中。脚本接受 1～1000000 的整数次数、1～86400000 的整数毫秒窗口；使用专用键前缀，不与外部 SET/EXPIRE 混写。语义是**每个窗口最多放行 limit 次，拒绝请求也记为尝试次数**。

在博客仓库根目录运行，下列三次调用返回的第一项应为 1、1、0，第二项为 1、2、3，第三项是剩余毫秒数：

```bash
docker cp public/database/examples/redis-fixed-window.lua redis-lab:/data/fixed-window.lua
docker exec redis-lab redis-cli --eval /data/fixed-window.lua rate:export:customer1 , 2 60000
docker exec redis-lab redis-cli --eval /data/fixed-window.lua rate:export:customer1 , 2 60000
docker exec redis-lab redis-cli --eval /data/fixed-window.lua rate:export:customer1 , 2 60000
```

窗口从首个请求开始，边界两侧仍可突发。需要更平滑的速率时选择令牌桶或滑动窗口，并使用经过验证的实现：令牌桶每次丢弃小数补充量再重置时间，会在高频调用下长期补不出令牌；滑动日志用时间戳字符串做成员会覆盖同一时刻的请求，且必须明确被拒请求是否记入。时间来源、精度、唯一请求号、过期及内存成本都属于算法合同。

租约锁则是另一类需求：

```text
SET lock:export:customer1 attempt-a NX PX 30000
SET lock:export:customer1 attempt-b NX PX 30000
EVAL "if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end" 1 lock:export:customer1 attempt-b
GET lock:export:customer1
EVAL "if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end" 1 lock:export:customer1 attempt-a
```

第一条成功、第二条未取得锁，错误令牌释放返回 0，键仍为 attempt-a，正确令牌释放返回 1。这里的短令牌只用于演示；应用每次获取都生成新的不可预测唯一令牌，等待时限与租约时长分开设置。

比较令牌删除可以避免误删别人的锁，**不能阻止租约到期后的旧持有者继续写业务数据**。进程暂停超过 30 秒时，另一进程可能已取得新锁；关键写入还需要存储端可验证的 fencing token、版本条件、唯一约束或业务幂等。异步复制主从切换也可能丢失尚未复制的锁；不能把 SET NX PX 宣称为所有故障下的全局互斥保证。

## Stream 的确认不等于业务只执行一次

![通知消息经过未投递、Pending、故障后重领和确认的状态流转](/database/redis-stream-delivery.svg)

在新的练习键上使用固定 ID，便于核对每一步；生产通常让 `XADD *` 生成 ID：

```text
XADD mail:{orders} 1-0 order_id 101 event_id notice-101
XADD mail:{orders} 2-0 order_id 103 event_id notice-103
XGROUP CREATE mail:{orders} mailers 0
XREADGROUP GROUP mailers worker-a COUNT 1 STREAMS mail:{orders} >
XPENDING mail:{orders} mailers
XAUTOCLAIM mail:{orders} mailers worker-b 0 0-0 COUNT 1
XACK mail:{orders} mailers 1-0
XPENDING mail:{orders} mailers
XLEN mail:{orders}
```

分组从 `0` 开始，第一次读取得到 1-0，Pending 数为 1；worker-b 重领，确认后 Pending 为 0，但 Stream 长度仍为 2，第二条尚未投递。`XACK` 只从本组 Pending 中确认，不会删除消息，更不会知道邮件是否已发出。这里重领等待设为 0 只为立即演示；生产设成合理的处理超时，否则会抢走还在执行的任务。

如果 worker-a 已发送邮件、但 ACK 前崩溃，worker-b 会再次获得该消息。消息中应有稳定业务事件号，通知服务据此幂等；发信与外部副作用无法由 Redis ACK 组成一个跨系统原子提交。超过重试上限的任务进入有记录的失败处理流程，不能无限重领。

`XGROUP CREATE ... $` 从建组时的流尾部开始，会跳过已有积压；消费者读取 `>` 表示本组尚未投递的新消息，不会自动返回所有 Pending。重试需读取自己的 Pending 或使用 XAUTOCLAIM 等重领机制，扫描未完成时按返回游标继续。消息保留/裁剪策略必须覆盖处理与重试窗口，不能先裁掉待处理内容，再把 Pending 数当成功证明。Pub/Sub 没有这种积压和确认能力，断线期间消息通常丢失，不适合作为可靠订单任务队列。

## 过期、淘汰与持久化分别保证什么

```text
SET ttl:order:101 first EX 60
TTL ttl:order:101
SET ttl:order:101 second
TTL ttl:order:101
EXPIRE ttl:order:101 60
SET ttl:order:101 third KEEPTTL
TTL ttl:order:101
```

普通 SET 覆盖会清掉旧 TTL，因此第二次 TTL 为 -1；不存在的键为 -2，KEEPTTL 保留已有 TTL。过期通常通过访问检查与后台清理推进，不是精确的业务调度器；不要用过期通知当“保证恰好执行一次”的延迟任务。

| 机制 | 能提供什么 | 不能由它推出什么 |
| --- | --- | --- |
| TTL | 到期后不再按普通键读取 | 精确时间点触发外部任务 |
| maxmemory + 淘汰策略 | 内存压力下选择可淘汰键 | 关键队列/锁/会话一定存活 |
| noeviction | 超限时拒绝部分新增内存的写入 | 进程 RSS 永远小于 maxmemory，或所有读取都失败 |
| RDB | 某时刻的数据快照 | 最后一次快照之后的写入不会丢失 |
| AOF everysec | 通常按秒刷盘的写入恢复 | 故障下严格只丢一秒或同步复制语义 |
| 异步复制 | 副本追赶主库的数据 | 主库确认的每个写入都已到达可提升副本 |

LRU/LFU 是近似策略；volatile 系列只在带 TTL 的键中选择，没有候选时可能拒绝写入。将可淘汰缓存与不能随意淘汰的任务/锁混在同一实例，会让内存策略互相冲突。`maxmemory` 之外还要为复制/AOF缓冲、分配器和 fork 写时复制留出余量。

RDB 的 BGSAVE 在后台生成快照，但 fork 和写时复制仍可能带来停顿与内存压力，不能称为完全无阻塞。Redis 7 的 AOF 是 manifest 管理的多文件集合，重写期间文件会变化；不能只复制一个旧路径 `appendonly.aof` 当完整备份。选用与当前版本兼容的备份工具/一致性流程，核对生成状态、文件集、权限、校验和并恢复到独立实例；同时有 AOF/RDB 时还要检查实际启动加载路径，不能替换 RDB 后就假定它被加载。

## 复制、Sentinel 与 Cluster 的职责

主从复制同步数据，Sentinel 负责监测与发现新的主节点，Cluster 将键分散到 **16384 个槽**并处理相应主从角色。Sentinel 的故障判定 quorum 与故障转移授权所需多数是两个条件，通常部署至少三个独立 Sentinel，不能把同机多个进程当故障域隔离。客户端需要支持发现和切换，固定连旧主地址不会自动恢复。

Cluster 的多键命令、事务和 Lua 要满足相关键位于同一槽，必要时用 `{...}` hash tag 规划；把所有键放进同一 tag 会消除分片收益。客户端应处理 MOVED/ASK 和拓扑更新，DB 编号也不能照单机方式任意切换。复制确认命令 WAIT 可提高指定副本收到写入的可见程度，但不把 Redis 变成强一致共识系统，也不证明所有故障下数据都不会丢失。

高可用验收要覆盖旧主隔离、网络分区、客户端重连、写入丢失范围和业务重试，而不只是执行 `REPLICAOF NO ONE`。缓存场景可以重建与降级；关键业务的权威状态、唯一约束和幂等记录应放在满足其持久与一致性要求的系统里。

## 从业务延迟定位 Redis 问题

```text
INFO server
INFO memory
INFO stats
INFO persistence
INFO replication
SLOWLOG GET 5
MEMORY USAGE cache:order:101
SCAN 0 MATCH cache:order:* COUNT 100
```

先比较业务端超时、连接池等待、网络往返与服务端执行时间。SLOWLOG 记录命令执行耗时，不包含客户端通信等完整请求时长，单位为微秒；它没有慢命令不代表用户请求就不慢。MONITOR 有性能和数据暴露成本，只在受控短时间内使用，不默认常驻。

内存看 used_memory、RSS、碎片及 eviction/rejected 指标，持久化看最近保存/重写状态、fork 和磁盘，复制看角色与链路/偏移。计数器要按时间差计算速率，并处理重启重置。SCAN 要一直使用返回游标直到 0，COUNT 是工作量提示，不是严格页长；扫描期间可能重复或变化，不能把一次返回当完整一致快照。大键操作、无界 LRANGE/HGETALL/SMEMBERS 和长 Lua 都可能拖慢其他请求。

配置先用 `CONFIG GET` 核对，不把不存在的通用 `tcp-nodelay` 指令放进 redis.conf；复制链路的 `repl-disable-tcp-nodelay` 是另一个选项。不要从旧文章照搬 ziplist 编码阈值，实际编码与配置名需按当前版本检查。基准测试会产生真实负载与键，只能在独立实例运行，并记录值大小、连接/并发、Pipeline、持久化、命中率和网络条件，不能只公布一个 QPS。

本页的验收是：复现事务执行错误却保留后续写入、识别缓存旧回填、验证锁的错误令牌不能释放、完成通知 Pending 到确认的闭环，并能解释为什么这些测试仍不代表主从切换下的零丢失与全局互斥。
