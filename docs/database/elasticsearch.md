---
title: Elasticsearch 搜索、索引与恢复
author: Walt
date: 2024-12-19 10:00:00
LastEditTime: 2026-10-19 00:00:00
LastEditors: Walt
---

# Elasticsearch 搜索、索引与恢复

用户输入“阅读灯”，希望按相关性找到商品；客服按状态、买家和下单时间筛选订单；运营统计每天的成交金额。这些查询可以交给 Elasticsearch，但“是否已经付款”“还能否扣库存”仍由交易数据库决定。搜索索引是适合检索的派生视图，需要同步、刷新和恢复机制。

本文使用 Elasticsearch **8.19.6** 的 REST 接口演示。8.x 一个索引只有一套映射，不再用 mapping type 区分业务。练习是单节点，不代表高可用部署；9.x、托管服务的认证与运维入口需要按对应版本确认。

## 索引里面保存了什么

索引包含 JSON 文档，映射决定字段怎样解析、检索、排序和聚合。一个主分片是一个 Lucene 索引，副本是该分片的另一份在线拷贝，不能替代独立快照：误删通常也会传播到副本。

例如订单 101 的 `status` 是完整取值 `paid`，应使用 `keyword`；商品名称要拆词，应使用 `text`；金额用整数分；时间显式使用 `date`。`text` 可以再配 `keyword` 子字段，但不应把长正文默认复制一份用来排序。

![Elasticsearch 写入确认与搜索可见性](/database/elasticsearch-write-visibility.svg)

写入先路由到主分片，再按复制协议处理副本。响应成功、可搜索和有可恢复备份是三件事。默认的请求级 translog 持久化参与写入确认；refresh 让新数据对搜索器可见，flush 建立 Lucene 提交点并推进 translog 生命周期。**refresh 不是磁盘备份，flush 也不是 snapshot。**

普通按 ID 的 GET 默认是实时读取，可以在 refresh 前读到刚写入的文档；`_search` 读取已打开的搜索视图。默认刷新通常约每秒一次，但取决于索引配置和是否近期被搜索，不能承诺每笔写入都在一秒内可见。`refresh=wait_for` 等待相关刷新，不是每笔都强制执行 refresh；禁用周期刷新后可能持续等待。

## 本机练习入口

下面关闭安全功能的实例仅用于本机练习，端口只绑定 `127.0.0.1`，不发布节点传输端口 9300。具名卷保存实验数据和快照目录；容器内快照只是恢复练习，不具备离机容灾能力。

```bash
# 为实验快照卷设置容器用户权限，不修改宿主目录
docker volume create es-order-snapshots
docker run --rm --user 0 --entrypoint sh \
  -v es-order-snapshots:/snapshots \
  docker.elastic.co/elasticsearch/elasticsearch:8.19.6 \
  -c 'chown 1000:0 /snapshots'

docker run -d --name es-order-lab --memory 2g \
  -p 127.0.0.1:19200:9200 \
  -e discovery.type=single-node \
  -e xpack.security.enabled=false \
  -e 'ES_JAVA_OPTS=-Xms512m -Xmx512m' \
  -e path.repo=/usr/share/elasticsearch/snapshots \
  -v es-order-data:/usr/share/elasticsearch/data \
  -v es-order-snapshots:/usr/share/elasticsearch/snapshots \
  docker.elastic.co/elasticsearch/elasticsearch:8.19.6

# 等待启动后确认版本；启动过程可能需要几十秒
curl -fsS http://127.0.0.1:19200/
```

若挂载目录报权限错误，确认容器用户对目录具有读写权限，不使用 `chmod -R 777`。生产必须启用认证、HTTP 与节点间 TLS，客户端使用 CA 验证与最小权限 API Key；凭据不能写入前端、日志或仓库。节点发现、证书、快照存储、容量和失败恢复需要一起设计。

下列 `http` 块是 **Kibana Dev Tools Console 的请求语法**，依次在空白实验索引中执行，不是 shell 命令。没有 Kibana 时，将 JSON 保存为本地文件，通过 curl 发起等价请求，例如：

```bash
curl -fsS -X PUT http://127.0.0.1:19200/orders_lab \
  -H 'Content-Type: application/json' \
  --data-binary @mapping.json
```

`mapping.json` 内容是下一块请求体。重复练习应换一个新索引名，并同步修改请求；已有索引不能再次 `PUT` 创建，也不能原地把已索引的字段从 `text` 改成 `keyword`。

## 用映射确定查询合同

订单明细是一组对象。普通 `object` 数组可能把不同明细的字段展平，导致“商品是 book 且数量至少 2”由两条不同明细共同满足。`nested` 保留每个明细内部的配对关系，代价是额外的内部文档与查询成本；仅需要订单级关键词时也可以单独维护扁平的搜索字段。

```http
PUT /orders_lab
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0,
    "refresh_interval": "-1"
  },
  "mappings": {
    "dynamic": "strict",
    "properties": {
      "orderId": { "type": "keyword" },
      "tenantId": { "type": "keyword" },
      "customerId": { "type": "keyword" },
      "name": { "type": "text", "analyzer": "standard" },
      "status": { "type": "keyword" },
      "amountCents": { "type": "long" },
      "createdAt": { "type": "date" },
      "version": { "type": "long" },
      "items": {
        "type": "nested",
        "properties": {
          "sku": { "type": "keyword" },
          "qty": { "type": "integer" }
        }
      }
    }
  }
}
```

副本数 0 和禁用自动 refresh 只是为了在单节点上稳定观察实验现象，后面会恢复刷新。生产副本要放到不同故障域，主分片数也不应照抄为 1。`dynamic: strict` 拒绝未知字段，却不是完整的业务校验器；正数金额、状态机、必填字段和租户权限仍须在写入端验证。

### 写入一批订单

Bulk 使用 NDJSON：动作行与文档行交替，每行是完整 JSON，**文件末尾也要换行**。以下将四笔订单写入，同一订单使用稳定 `_id`。初始版本号 1 对应源记录版本；没有版本协议时不要随意添加 `version_type`。

```http
POST /orders_lab/_bulk
{"index":{"_id":"101","version":1,"version_type":"external"}}
{"orderId":"101","tenantId":"t1","customerId":"c1","name":"book and mug","status":"paid","amountCents":5000,"createdAt":"2026-10-01T01:00:00Z","version":1,"items":[{"sku":"book","qty":1},{"sku":"mug","qty":3}]}
{"index":{"_id":"102","version":1,"version_type":"external"}}
{"orderId":"102","tenantId":"t1","customerId":"c1","name":"mug","status":"pending","amountCents":3000,"createdAt":"2026-10-01T02:00:00Z","version":1,"items":[{"sku":"mug","qty":2}]}
{"index":{"_id":"103","version":1,"version_type":"external"}}
{"orderId":"103","tenantId":"t1","customerId":"c2","name":"reading lamp","status":"paid","amountCents":3990,"createdAt":"2026-10-02T01:00:00Z","version":1,"items":[{"sku":"lamp","qty":1}]}
{"index":{"_id":"104","version":1,"version_type":"external"}}
{"orderId":"104","tenantId":"t1","customerId":"c1","name":"book","status":"cancelled","amountCents":2000,"createdAt":"2026-10-02T02:00:00Z","version":1,"items":[{"sku":"book","qty":1}]}

```

HTTP 200 只表示批量请求得到处理。必须检查顶层 `errors` 和每个 `items` 的 `status/error`：映射错误进入失败队列，429/临时故障做有界退避；不能因为一条失败就无条件重放整批非幂等操作。完整覆盖写入与脚本“金额加一”的重试语义不同。

现在可以观察 GET 与搜索的区别，再显式刷新：

```http
GET /orders_lab/_doc/101

GET /orders_lab/_count

POST /orders_lab/_refresh

GET /orders_lab/_count

PUT /orders_lab/_settings
{
  "index": { "refresh_interval": "1s" }
}
```

禁用自动刷新时，GET 能取回 101，首次 count 为 0，显式 refresh 后为 4。通常不应在每次写入后调用 `_refresh`；需要立即展示本次变更时，可对有限请求使用 `refresh=wait_for`，并监控等待时间。

## 查询、分词与聚合

`match` 先分析查询文本，再构造检索条件；`term` 查索引中的精确词项。`term` 用在 `status` 这样的 `keyword` 上很合适，用它查询未经确认分词结果的正文，容易得不到预期结果。

```http
GET /orders_lab/_search
{
  "track_total_hits": true,
  "query": {
    "bool": {
      "must": [{ "match": { "name": "lamp" } }],
      "filter": [
        { "term": { "tenantId": "t1" } },
        { "term": { "status": "paid" } }
      ]
    }
  }
}

POST /orders_lab/_analyze
{
  "field": "name",
  "text": ["Reading Lamp", "阅读灯"]
}

GET /orders_lab/_search
{
  "query": {
    "bool": {
      "filter": [
        { "term": { "tenantId": "t1" } },
        {
          "nested": {
            "path": "items",
            "query": {
              "bool": {
                "filter": [
                  { "term": { "items.sku": "book" } },
                  { "range": { "items.qty": { "gte": 2 } } }
                ]
              }
            }
          }
        }
      ]
    }
  }
}
```

第一条查询返回 103，最后一条没有结果：101 的 book 数量只有 1，不能借用 mug 的数量 3。所有租户查询都要有授权范围；过滤一个用户传入的 `tenantId` 本身不构成权限校验。

`bool.filter` 仍属于 Query DSL，只是不计算相关性分数，部分结果可能被缓存，不保证每个过滤都命中缓存。`should` 在已有 `must` 或 `filter` 时默认可以完全不匹配；若其表达的是必要条件，显式设置 `minimum_should_match`，或放入合适的 `must/filter`。

`standard` 可以演示英文小写化，但不是完整的中文分词方案。先用 `_analyze` 查看实际词项，再用自己的中文查询集验证召回、排序和专有名词。引入 IK 等社区插件前确认与 ES 精确版本匹配、所有相关节点一致、升级路径可用；仅安装成功不说明搜索质量合格。

### 聚合算的是哪些订单

下面只统计已支付订单，以北京时间的自然日分桶。两笔订单共 8990 分；不要在 `nested` 明细展开后把明细数当订单数，也不要用当前商品价重算历史成交额。

```http
GET /orders_lab/_search
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        { "term": { "tenantId": "t1" } },
        { "term": { "status": "paid" } }
      ]
    }
  },
  "aggs": {
    "totalCents": { "sum": { "field": "amountCents" } },
    "daily": {
      "date_histogram": {
        "field": "createdAt",
        "calendar_interval": "day",
        "time_zone": "Asia/Shanghai"
      },
      "aggs": { "cents": { "sum": { "field": "amountCents" } } }
    }
  }
}
```

`terms` 通常取前 N 个桶，分布式统计可能有计数误差；查看误差指标并按需求调整 `shard_size`，枚举全部分组考虑 `composite` 和 `after_key`。`cardinality`、常用百分位聚合是近似统计。财务对账应由权威数据和明确口径完成，不能把搜索近似结果当总账。

## 分页与同步都需要稳定边界

![Elasticsearch 派生视图与 PIT 分页边界](/database/elasticsearch-derived-pagination.svg)

浅分页可以使用 `from/size`，但深分页让各分片收集并合并大量候选。不能把 `index.max_result_window` 调很大作为常规导出方案。稳定遍历使用 PIT 固定搜索视图，再用 `search_after` 传递上页实际返回的排序值。

```http
POST /orders_lab/_pit?keep_alive=1m

```

将返回 `id` 放入下一请求的 `pit.id`。PIT 搜索使用 `/_search`，不在 URL 中再写索引名：

```http
POST /_search
{
  "size": 2,
  "query": { "term": { "tenantId": "t1" } },
  "pit": { "id": "替换为最新PIT_ID", "keep_alive": "1m" },
  "sort": [{ "createdAt": "asc" }, { "orderId": "asc" }]
}
```

这里 `orderId` 是租户内唯一且有 doc values 的 `keyword`，不直接按 `_id` 排序。PIT 还会增加 `_shard_doc` 作为平局裁决项，因此每条命中的 `sort` 可能包含第三个值。下一页保持查询与排序完全一致，**原样复制最后一条命中的整个 `sort` 数组**，并使用上次响应中最新的 `pit_id`：

```http
POST /_search
{
  "size": 2,
  "query": { "term": { "tenantId": "t1" } },
  "pit": { "id": "替换为最新PIT_ID", "keep_alive": "1m" },
  "sort": [{ "createdAt": "asc" }, { "orderId": "asc" }],
  "search_after": ["复制上页最后命中的全部sort值，并保留数字类型"]
}

DELETE /_pit
{
  "id": "替换为最新PIT_ID"
}
```

这两处占位字段要由实际响应替换，不能把示意字符串直接发送。PIT 延续的是搜索视图，不是锁住源数据库；超时后需要重开并重新定义遍历边界。完成或取消导出时及时关闭 PIT，长期持有会保留旧段，增加磁盘与文件句柄占用。

### 避免旧事件覆盖新状态

源库事务提交后，CDC/outbox 消费者把订单完整视图写入索引。以稳定订单号作为 `_id` 避免重复插入，仍不能防止旧事件覆盖新状态。可以把**源记录单调递增版本**映射成 `external` 版本；下面版本 2 成功，同一版本重放或版本 1 迟到都会返回 409。

```http
PUT /orders_lab/_doc/102?version=2&version_type=external&refresh=wait_for
{
  "orderId": "102",
  "tenantId": "t1",
  "customerId": "c1",
  "name": "mug",
  "status": "paid",
  "amountCents": 3000,
  "createdAt": "2026-10-01T02:00:00Z",
  "version": 2,
  "items": [{ "sku": "mug", "qty": 2 }]
}
```

409 只有在核对确实是旧事件或已处理重放后才能确认消费；映射冲突、权限错误不能按重复成功处理。`external_gte` 接受相同版本，只有同版本必定对应完全相同内容时才考虑使用。版本要覆盖整条记录生命周期，删后重建与删除墓碑的保留期要一起设计，避免旧事件在很久以后复活记录。

如果直接修改 ES 中的文档，可使用返回的 `_seq_no`、`_primary_term` 做乐观并发控制；它们不等于源库业务版本。跨文档更新不具备关系库事务语义，不能用搜索索引协调扣库存和支付。

## 快照与索引迁移

索引可以从源库重建，不表示可以不备份。分词器、映射、别名和恢复所需配置也要管理；某些日志数据没有其他权威源，更需要明确 RPO/RTO。复制正在使用的数据目录不是受支持的集群备份方法。

本机已设置 `path.repo`，先注册并验证文件系统仓库，再创建完成态快照。多节点共享文件仓库需要所有相关 master/data 节点挂载同一路径、正确权限和可见性；通常使用受支持的对象存储仓库做离机备份，并限制写入者。

```http
PUT /_snapshot/order_lab_repo
{
  "type": "fs",
  "settings": { "location": "/usr/share/elasticsearch/snapshots" }
}

POST /_snapshot/order_lab_repo/_verify

PUT /_snapshot/order_lab_repo/orders_01?wait_for_completion=true
{
  "indices": "orders_lab",
  "include_global_state": false
}

GET /_snapshot/order_lab_repo/orders_01

POST /_snapshot/order_lab_repo/orders_01/_restore?wait_for_completion=true
{
  "indices": "orders_lab",
  "include_global_state": false,
  "include_aliases": false,
  "rename_pattern": "orders_lab",
  "rename_replacement": "orders_restored"
}

GET /orders_restored/_count

GET /orders_restored/_mapping
```

必须确认快照状态为 `SUCCESS`、分片失败数为 0，再演练恢复。练习在版本 2 写入后备份，恢复新索引应有 4 单、总金额 13990 分，102 为 paid/version 2；检查映射和实际查询，不能只看恢复请求已被接受。这里排除了全局状态和别名，不代表备份了安全系统等全部 feature state，也未演示跨版本恢复。

生产更改映射通常建立新索引，回填历史数据、追平增量、核对计数/版本/查询，再原子切换读写别名。`_reindex` 不会自动复制目标映射和设置，也不会持续追踪期间新写入；回填期间的版本冲突、删除和切换窗口必须有协议。

## 运维从现象进入

集群 green 表示当前主副分片已分配，不证明搜索语义正确或备份可恢复；yellow 表示主分片已分配但存在未分配副本；red 表示至少一个主分片未分配。单节点设置 1 副本通常 yellow，因为同一分片的主副不能放在同一节点，不应拿这一实验结论推导生产可以长期去掉副本。

```http
GET /_cluster/health

GET /_cat/shards?v

GET /orders_lab/_stats/indexing,search,refresh,segments

GET /_nodes/stats/jvm,fs,thread_pool
```

| 现象 | 检查顺序 | 避免的操作 |
| --- | --- | --- |
| 已写入但搜索不到 | 源记录、消费位点、Bulk逐项结果、查询/分词、refresh | 重复扣款、每秒对全索引强制刷新 |
| 429 或队列增长 | 写入速率、单批大小、热点主分片、磁盘/JVM、客户端退避 | 盲目扩大线程池和队列，把过载转成更长等待 |
| 分片未分配 | `_cat/shards` 后按具体分片用 allocation explain，查节点/故障域/磁盘水位 | 清除水位保护、删除数据目录或强制分配陈旧主分片 |
| 聚合或排序很慢 | 时间与租户范围、keyword/doc values、桶数、Profile与慢日志 | 给所有text启用fielddata，大范围无界聚合 |
| 空间增长 | 保留策略、段合并、旧PIT、分片数、快照容量与恢复需求 | 对活跃写索引频繁force merge、用副本代替备份 |

新集群的 `cluster.initial_master_nodes` 只用于首次引导，成功后移除，不用于已有集群重启或新节点加入。不要沿用旧的 `discovery.zen.*` 参数。堆内存需要给文件系统缓存和原生内存留空间；优先理解版本自适应设置与容器内存限制，再依据实际GC和查询负载调整，不能照抄“一半内存”的固定模板。

日志类索引使用 ILM/数据流时，还要设计初始写入入口和匹配模板。使用 rollover alias 的方案必须有带 `is_write_index: true` 的初始索引；warm/cold 阶段要有相应数据层和容量。订单业务索引通常按业务键覆盖更新，不能直接照搬日志滚动策略，否则同一订单可能跨索引重复出现。

一次完整练习应留下三个结果：搜索查询返回正确的业务集合；重复与乱序事件不会覆盖新版本；从快照恢复的新索引可以通过同一组查询。之后再用多节点故障演练、真实中文查询集和实际数据量评估可用性、召回率与性能。
