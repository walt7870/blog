---
title: MongoDB
author: Walt
---

# MongoDB

一笔订单经常连同商品明细、收货地址和下单价格一起读取。把这些有界、生命周期接近的内容放在一个文档里，可以减少关联，也能在一次更新中守住文档内部的条件。库存、商品现价和不断增长的操作历史则有独立生命周期，全部嵌入订单会带来重复更新和无限数组。

本页以 **MongoDB 7.0、mongosh** 为基线，使用同一订单模型解释嵌入与引用、数组查询、聚合、事务、复制及恢复。BSON 是带明确数据类型的文档格式，不等于任意 JSON；“灵活结构”也不等于不需要字段合同。通用数据库边界见[数据库总览](./index.md)。

![订单快照内嵌明细、独立库存、事务事件及外部通知的边界](/database/mongodb-order-boundaries.svg)

## 建立可丢弃的练习副本集

以下 Bash 命令启动不接入网络、不发布宿主端口的本地容器，使用容器内回环地址访问。名称或卷名已存在时换名称，不删除既有服务。单节点副本集用于练习事务，**不提供节点故障后的高可用**。

```bash
docker run --name mongo-lab --network none \
  --mount source=mongo-lab-data,target=/data/db \
  --detach mongo:7.0 \
  mongod --bind_ip 127.0.0.1 --replSet lab-rs
docker exec -it mongo-lab mongosh
```

在新实例的 mongosh 内初始化一次，等待 `db.hello().isWritablePrimary` 为 true 后再建库：

```javascript
rs.initiate({
  _id: "lab-rs",
  members: [{ _id: 0, host: "localhost:27017" }]
});
db.hello().isWritablePrimary;
```

本练习依靠无网络暴露的隔离方式，不是生产认证模板。生产需要账号最小权限、允许的来源、成员间认证以及客户端 TLS；使用当前 `net.tls` 配置，不沿用旧 `net.ssl` 名称。账号密码交互输入或通过受控凭据文件管理，不写进 URI、脚本或 Git。配置 `keyFile` 不等于完成证书身份校验；副本集对外通告的每个主机名都必须能被客户端解析和访问。

当前入口是 mongosh，不是旧 `mongo` shell。`use`、`show collections` 是 shell 辅助命令；下文用 `db.getSiblingDB()` 便于脚本化。容器前台运行 mongod，不照搬 systemd 环境的 fork、日志目录与进程文件；MongoDB 7.0 也不能照搬旧 `storage.journal.enabled` 开关。

## 文档有边界，字段有合同

下单后商品名称和价格快照应保持历史含义，商品涨价不回写旧订单。这里金额按“分”保存，演示限制在 32 位整数范围；更大的金额需要选定 Decimal128 或 64 位整数，并保持驱动与前端精度合同，不能先经 JavaScript 浮点数再补精度。

```javascript
db = db.getSiblingDB("order_lab");
db.createCollection("orders", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["tenantId","requestId","customerId","status","amountCents","createdAt","items"],
    properties: {
      tenantId: { bsonType: "string", minLength: 1 },
      requestId: { bsonType: "string", minLength: 1 },
      customerId: { bsonType: "int" },
      status: { enum: ["pending","paid","cancelled"] },
      amountCents: { bsonType: "int", minimum: 0 },
      createdAt: { bsonType: "date" },
      items: { bsonType: "array", minItems: 1, maxItems: 100,
        items: { bsonType: "object", required: ["sku","qty","unitCents"],
          properties: {
            sku: { bsonType: "string" },
            qty: { bsonType: "int", minimum: 1 },
            unitCents: { bsonType: "int", minimum: 0 }
          }
        }
      }
    }
  } },
  validationLevel: "strict", validationAction: "error"
});
db.orders.createIndex({tenantId:1,requestId:1},{unique:true});
db.orders.insertMany([
  {_id:101,tenantId:"t1",requestId:"req-101",customerId:NumberInt(1),status:"paid",
   amountCents:NumberInt(5000),createdAt:ISODate("2026-10-02T02:00:00Z"),
   items:[{sku:"book",qty:NumberInt(1),unitCents:NumberInt(2000)},
          {sku:"bag",qty:NumberInt(3),unitCents:NumberInt(1000)}]},
  {_id:102,tenantId:"t1",requestId:"req-102",customerId:NumberInt(1),status:"pending",
   amountCents:NumberInt(3000),createdAt:ISODate("2026-10-02T02:00:00Z"),
   items:[{sku:"mug",qty:NumberInt(2),unitCents:NumberInt(1500)}]},
  {_id:103,tenantId:"t1",requestId:"req-103",customerId:NumberInt(1),status:"paid",
   amountCents:NumberInt(3990),createdAt:ISODate("2026-10-03T03:00:00Z"),
   items:[{sku:"lamp",qty:NumberInt(1),unitCents:NumberInt(3990)}]},
  {_id:104,tenantId:"t1",requestId:"req-104",customerId:NumberInt(2),status:"cancelled",
   amountCents:NumberInt(2000),createdAt:ISODate("2026-09-30T15:59:59Z"),
   items:[{sku:"book",qty:NumberInt(1),unitCents:NumberInt(2000)}]}
]);
```

校验拒绝字符串日期、负金额和错误类型；唯一索引约束同租户内的请求号，但这些都不自动证明“金额等于所有明细合计”或“支付凭证有效”。这些跨字段业务规则需要另外实现。订单限 100 条明细只是本例的有界模型，仍要遵守单个 BSON 文档 **16 MiB** 等限制；操作日志、聊天记录等持续增长的数据应另存集合。

`$set` 修改指定字段，`replaceOne` 替换整份文档主体，未给出的字段会丢失。`upsert:true` 只表示未匹配时尝试插入，不等于解决并发重复请求；需要匹配的唯一索引、冲突处理以及稳定的业务请求号。订单中的客户编号是引用，MongoDB 不会自动替它验证另一个集合里的客户存在。

## 数组条件必须命中同一元素

```javascript
db.orders.find({
  tenantId:"t1", "items.sku":"book", "items.qty":{$gte:2}
},{_id:1}).toArray();
db.orders.find({
  tenantId:"t1", items:{$elemMatch:{sku:"book",qty:{$gte:2}}}
},{_id:1}).toArray();
```

第一项返回 101：book 满足 sku，另一条 bag 满足数量，条件可由不同元素分别满足。第二项为空，因为没有同一条 book 明细数量达到 2。外层同时出现两个点路径，不会自动变成“同一商品”。数组索引、多键索引边界与查询语义应一起检查，而不是发现结果不对后简单加 DISTINCT。

对缺失和 NULL 也要明确：`{note:null}` 可匹配字段为 null 或不存在的文档；`$exists:true` 包含显式 null。要区分缺失、空值、空字符串与空数组，不能仅靠真假判断。投影通常不能任意混合包含与排除规则，`_id` 是常见例外。

## 聚合之前确定计数对象

先从订单集合汇总十月已支付订单，时间边界对应上海时间：

```javascript
db.orders.aggregate([
  {$match:{tenantId:"t1",status:"paid",createdAt:{
    $gte:ISODate("2026-09-30T16:00:00Z"),
    $lt:ISODate("2026-10-31T16:00:00Z")
  }}},
  {$group:{_id:"$customerId",orderCount:{$sum:1},paidCents:{$sum:"$amountCents"}}},
  {$sort:{paidCents:-1,_id:1}}
]).toArray();

db.orders.aggregate([
  {$match:{tenantId:"t1",status:"paid"}},
  {$unwind:"$items"},
  {$group:{_id:null,lineCount:{$sum:1},
    orderIds:{$addToSet:"$_id"},
    itemCents:{$sum:{$multiply:["$items.qty","$items.unitCents"]}}}},
  {$project:{_id:0,lineCount:1,orderCount:{$size:"$orderIds"},itemCents:1}}
]).toArray();
```

第一项得到客户 1、两单、8990 分。第二项展开为三条明细，所以 lineCount 为 3，订单数仍为 2，商品金额合计为 8990。若展开后直接 `$sum:1` 命名为 orderCount，或反复累加订单总金额，就会产生错误报表。此处用小集合 `$addToSet` 解释去重，大规模应按订单与分类分层聚合，避免把无限订单号装进一个结果文档。

`$lookup` 是读取时关联，不自动提供外键或去重；再 `$unwind` 可能放大行数，也可能把没有匹配商品的订单丢掉。历史金额应取订单快照，不能关联商品现价后重算旧销售额。按月分组应包含年份与业务时区，只有 `$month` 会混合不同年份的十月。执行前先明确报表是订单、明细、件数还是客户数量，以及优惠和运费归属。

## 索引服务实际查询

```javascript
db.orders.createIndex({tenantId:1,customerId:1,createdAt:-1,_id:-1});
db.orders.find({tenantId:"t1",customerId:NumberInt(1)},
              {_id:1,status:1,createdAt:1})
  .sort({createdAt:-1,_id:-1}).limit(10).explain("executionStats");
db.orders.getIndexes();
```

租户和客户等值条件后接稳定排序键，可服务客户订单时间线；没有唯一的 `_id` 破同分，同时间记录分页可能不稳定。大 skip 仍需跨过前面的记录，深分页可用末条 `(createdAt,_id)` 作为游标，并保留租户与排序范围条件。

先比较返回数、totalKeysExamined、totalDocsExamined、排序阶段与索引边界；IXSCAN 出现不等于高效，COLLSCAN 在四行数据上也未必不合理。`executionStats` 会实际执行读取工作，不在生产随意运行无界聚合分析。hint 只能用于验证候选，不该作为掩盖统计或查询设计问题的永久开关。

数组生成 multikey 索引有组合限制，复合索引不能随意包含多个独立数组字段；部分索引需要查询能满足其过滤条件。唯一索引的缺失/NULL 行为、稀疏与部分索引都要按模型验证。传统 text 索引每集合只能有一个，中文分词和检索质量也不能由“建了 text 索引”推出。地理查询使用正确的 GeoJSON、经纬度顺序和 2dsphere 索引，不与平面坐标混算。

TTL 索引只能用于合适的日期字段与结构，后台清理不是精确调度。会话即使还没被 TTL 删除，应用也要按 expiresAt 拒绝过期访问；不能以文档还在就认定令牌有效。

## 单文档条件更新与跨文档事务

扣一个库存单位时，条件和修改放在同一条更新中：

```javascript
db.inventory.insertMany([
  {_id:"lamp",available:NumberInt(1)},
  {_id:"mug",available:NumberInt(10)}
]);
db.inventory.updateOne({_id:"lamp",available:{$gte:1}},{$inc:{available:-1}});
db.inventory.updateOne({_id:"lamp",available:{$gte:1}},{$inc:{available:-1}});
db.inventory.findOne({_id:"lamp"});
```

第一次 matchedCount 为 1，第二次为 0，库存仍为 0。先查库存再无条件减会引入竞争；updateMany 对每个文档的修改原子，不表示整组都原子。`modifiedCount=0` 还可能表示目标已经是该值，要结合 matchedCount 和业务条件判断。

若需要同时改变订单、扣独立库存并写一条待发事件，就需要多文档事务。以下只用于新练习数据，102 仍为 pending，杯子库存为 10；待发事件与实际发信分开：

```javascript
db.createCollection("outbox");
const orderSession = db.getMongo().startSession();
const orderDb = orderSession.getDatabase("order_lab");
try {
  orderSession.startTransaction({
    readConcern:{level:"snapshot"},writeConcern:{w:"majority"}
  });
  const changed = orderDb.orders.updateOne(
    {_id:102,tenantId:"t1",status:"pending"},{$set:{status:"paid"}}
  );
  if (changed.matchedCount !== 1) throw new Error("订单状态不匹配");
  const stock = orderDb.inventory.updateOne(
    {_id:"mug",available:{$gte:2}},{$inc:{available:-2}}
  );
  if (stock.matchedCount !== 1) throw new Error("库存不足");
  orderDb.outbox.insertOne({_id:"paid-102",orderId:102,eventType:"OrderPaid"});
  orderSession.commitTransaction();
} catch (error) {
  orderSession.abortTransaction();
  throw error;
} finally {
  orderSession.endSession();
}
```

成功后 102 为 paid、杯子库存为 8、outbox 有一条事件。故障测试应另起新练习基线，把库存设为不足，验证失败时订单也未提交。事务需副本集或分片环境，standalone 不支持这类多文档事务；单节点副本集能复现提交/回滚，不能证明多数副本故障容忍。

示例省略生产重试策略。正式应用使用驱动支持的事务 API，区分暂态事务错误与提交结果未知；提交超时不等于已经回滚，不能无条件重新扣款。回调可能重试，不能在事务回调内直接发邮件、调用支付或完成不可逆外部副作用。outbox 由后续投递器读取并按事件号幂等处理，事务只保证事件记录与数据库状态一起提交。

## 读偏好、读关注与写关注

![写关注、读取位置、读关注和故障切换分别作用的位置](/database/mongodb-read-write-concerns.svg)

readPreference 决定读主还是读副本；readConcern 决定可读数据的可见性保证；writeConcern 决定写入需要怎样的确认。它们不是同一个“强一致开关”。`secondaryPreferred` 可以减轻部分读负担，也可能读到滞后状态；`majority` 读取不自动等于最近一次业务写入。

在相应配置、读写关注和同一因果会话约束下，可以获得所需的因果顺序保证；不能把任意新连接上的 secondary 读取当成写后必可见。线性化读取有明确限制和代价，应按单文档强实时要求单独评估。驱动连接池与拓扑发现负责找到可用节点，但不能代替应用的超时、幂等和错误处理。

副本集多数确认依赖持有数据的投票成员，仲裁者只投票，不保存业务副本。两个数据节点加仲裁者不能当成三个数据副本，也不应作为无条件推荐拓扑。写关注 wtimeout 只表示指定确认未及时满足，写入可能已经落在部分节点并继续复制；“报错后一定没写入”是危险假设。选举、旧主失去写资格、驱动重连和回滚范围需要完整故障演练。

分片再增加一层路由：mongos 按分片键定位数据，config server 保存元数据，各 shard 本身通常是副本集。分片键选择同时影响热点、目标路由、范围查询与唯一性约束；缺少键条件可能 scatter-gather。hashed 不自动消除低基数或单热点键问题，单调增长范围键也可能把新写入集中到少数分片。不要在普通单机上混入 `clusterRole: shardsvr` 就当完成分片部署。

## 备份以恢复到新库验收

下面在**停止练习写入后**进行逻辑备份；不代表并发业务下跨集合的一致快照。Bash 命令使用容器内 Database Tools，先核对工具版本与服务端兼容性：

```bash
umask 077
docker exec mongo-lab mongodump --db order_lab --archive --gzip > order-lab.archive.gz
docker exec -i mongo-lab mongorestore --archive --gzip \
  --nsFrom 'order_lab.*' --nsTo 'order_restore.*' \
  --nsInclude 'order_lab.*' --stopOnError < order-lab.archive.gz
docker exec mongo-lab mongosh --quiet --eval \
  'db=db.getSiblingDB("order_restore"); print(db.orders.countDocuments({})); printjson(db.orders.aggregate([{$group:{_id:null,cents:{$sum:"$amountCents"}}}]).toArray());'
```

恢复应为四单、13990 分，且要核对索引、校验器、outbox 与库存；新库已存在时先核对归属，不用 `--drop` 随手覆盖。每条命令检查退出码，空/半截 archive 不应进入恢复。数据库级备份不自动包含整个部署的账号、角色、配置与密钥管理方案。

有并发写入时应选与部署相容的完整一致性方案，例如满足条件的副本集全量 dump 加 oplog 回放，或受支持的物理快照/备份服务，并演练恢复目标。不能给任意 `--db` 或分片 dump 加上 `--oplog` 就宣称得到集群一致快照。oplog 保留窗口也不等于任意历史时间都能恢复。mongoexport/mongoimport 用于数据交换，不能代替 BSON 备份、索引、验证器和部署级恢复。

## 排查与维护闭环

先把问题归到连接/认证、错误结果、阻塞/延迟、复制进度或容量。连接检查通告主机名、来源、TLS 与认证库；结果问题检查 BSON 类型、缺失/NULL、数组同元素语义、unwind 行数和业务时区，再看访问计划。副本延迟不能靠强制 hint 或给读请求加更多重试解决。

慢查询从业务分位延迟、服务端结构化日志、当前操作与 explain 对照。Profiler 的 level 2 记录全部操作，不是只记录超过 slowms 的慢查询；使用 level 1 等受控采样，记录原设置并恢复，注意性能和查询内容暴露。批量无序写不保证前后顺序，也不保证全成全败，必须逐项检查错误。

WiredTiger cache 不等于进程总内存，操作系统页缓存、连接与聚合等还有额外开销。compact、reIndex 等不能当成定期通用优化按钮，需要核对版本、部署限制、锁、磁盘和复制影响。监控累计操作数要按时间差计算并处理重启；索引零次访问也不能仅凭短观察窗口判定可删除。

本页的达成标志是：能解释 101 的数组误匹配、两单三明细与 8990 分的区别，验证库存不会减成负数、事务失败不留下半套修改，并恢复到新库核对完整业务状态。文档模型减少了某些关联，不会自动消除并发、事务与运维问题。
