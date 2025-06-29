---
title: Elasticsearch 详解
author: Walt
date: 2024-12-19 10:00:00
LastEditTime: 2024-12-19 10:00:00
LastEditors: Walt
---

# Elasticsearch 详解

Elasticsearch 是一个基于 Apache Lucene 的分布式搜索和分析引擎，能够实现近实时搜索。它是 Elastic Stack（ELK Stack）的核心组件，广泛用于全文搜索、日志分析、数据可视化等场景。

## 概述

### 核心概念

- **索引 (Index)**：类似数据库中的数据库，是文档的容器
- **文档 (Document)**：基本的信息单元，以 JSON 格式存储
- **字段 (Field)**：文档中的键值对
- **映射 (Mapping)**：定义文档及其字段的存储和索引方式
- **分片 (Shard)**：索引的水平分割单元
- **副本 (Replica)**：分片的备份
- **节点 (Node)**：集群中的单个服务器
- **集群 (Cluster)**：一个或多个节点的集合

### 主要特性

1. **分布式架构**：天然支持水平扩展
2. **近实时搜索**：文档索引后几乎立即可搜索
3. **RESTful API**：通过 HTTP REST API 进行所有操作
4. **多租户**：支持多个索引和类型
5. **丰富的查询 DSL**：强大的查询语言
6. **聚合分析**：支持复杂的数据分析
7. **高可用性**：自动故障检测和恢复

## 安装与配置

### 安装方式

#### 1. 官方安装包
```bash
# macOS
brew install elasticsearch

# Ubuntu/Debian
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo apt-key add -
echo "deb https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list
sudo apt-get update
sudo apt-get install elasticsearch

# CentOS/RHEL
sudo rpm --import https://artifacts.elastic.co/GPG-KEY-elasticsearch
echo '[elasticsearch]
name=Elasticsearch repository for 8.x packages
baseurl=https://artifacts.elastic.co/packages/8.x/yum
gpgcheck=1
gpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch
enabled=0
autorefresh=1
type=rpm-md' | sudo tee /etc/yum.repos.d/elasticsearch.repo
sudo yum install --enablerepo=elasticsearch elasticsearch
```

#### 2. Docker 安装
```bash
# 拉取镜像
docker pull docker.elastic.co/elasticsearch/elasticsearch:8.11.0

# 单节点运行
docker run --name elasticsearch \
  -p 9200:9200 -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:8.11.0

# 带数据持久化
docker run --name elasticsearch \
  -p 9200:9200 -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  -v /data/elasticsearch:/usr/share/elasticsearch/data \
  docker.elastic.co/elasticsearch/elasticsearch:8.11.0
```

#### 3. Docker Compose 集群
```yaml
# docker-compose.yml
version: '3.8'
services:
  es01:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: es01
    environment:
      - node.name=es01
      - cluster.name=es-docker-cluster
      - discovery.seed_hosts=es02,es03
      - cluster.initial_master_nodes=es01,es02,es03
      - bootstrap.memory_lock=true
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - data01:/usr/share/elasticsearch/data
    ports:
      - 9200:9200
    networks:
      - elastic

  es02:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: es02
    environment:
      - node.name=es02
      - cluster.name=es-docker-cluster
      - discovery.seed_hosts=es01,es03
      - cluster.initial_master_nodes=es01,es02,es03
      - bootstrap.memory_lock=true
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - data02:/usr/share/elasticsearch/data
    networks:
      - elastic

  es03:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: es03
    environment:
      - node.name=es03
      - cluster.name=es-docker-cluster
      - discovery.seed_hosts=es01,es02
      - cluster.initial_master_nodes=es01,es02,es03
      - bootstrap.memory_lock=true
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - data03:/usr/share/elasticsearch/data
    networks:
      - elastic

volumes:
  data01:
    driver: local
  data02:
    driver: local
  data03:
    driver: local

networks:
  elastic:
    driver: bridge
```

### 基本配置

#### elasticsearch.yml 主要配置
```yaml
# 集群配置
cluster.name: my-application
node.name: node-1
node.roles: [master, data, ingest]

# 网络配置
network.host: 0.0.0.0
http.port: 9200
transport.port: 9300

# 发现配置
discovery.seed_hosts: ["host1", "host2"]
cluster.initial_master_nodes: ["node-1", "node-2"]

# 路径配置
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch

# 内存配置
bootstrap.memory_lock: true

# 安全配置
xpack.security.enabled: true
xpack.security.transport.ssl.enabled: true
xpack.security.http.ssl.enabled: true

# 监控配置
xpack.monitoring.collection.enabled: true
```

#### JVM 配置 (jvm.options)
```
# 堆内存设置（建议设置为物理内存的一半，但不超过 32GB）
-Xms2g
-Xmx2g

# GC 配置
-XX:+UseG1GC
-XX:G1HeapRegionSize=16m
-XX:+UseG1OldGCMixedGCCount=16
-XX:+UseG1MixedGCLiveThresholdPercent=90

# 其他优化
-Djava.io.tmpdir=${ES_TMPDIR}
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=/var/lib/elasticsearch
-XX:ErrorFile=/var/log/elasticsearch/hs_err_pid%p.log
```

## 基本操作

### 集群和节点管理

```bash
# 检查集群健康状态
GET /_cluster/health

# 查看集群状态
GET /_cluster/state

# 查看节点信息
GET /_nodes
GET /_nodes/stats

# 查看集群设置
GET /_cluster/settings

# 更新集群设置
PUT /_cluster/settings
{
  "persistent": {
    "cluster.routing.allocation.disk.watermark.low": "85%",
    "cluster.routing.allocation.disk.watermark.high": "90%"
  }
}
```

### 索引管理

```bash
# 创建索引
PUT /my_index
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "my_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "stop"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "my_analyzer"
      },
      "content": {
        "type": "text"
      },
      "publish_date": {
        "type": "date"
      },
      "author": {
        "type": "keyword"
      },
      "tags": {
        "type": "keyword"
      },
      "views": {
        "type": "integer"
      }
    }
  }
}

# 查看索引
GET /_cat/indices?v
GET /my_index

# 查看索引设置
GET /my_index/_settings

# 查看索引映射
GET /my_index/_mapping

# 更新索引设置
PUT /my_index/_settings
{
  "number_of_replicas": 2
}

# 删除索引
DELETE /my_index

# 关闭/打开索引
POST /my_index/_close
POST /my_index/_open
```

### 文档操作

#### 索引文档
```bash
# 创建文档（指定 ID）
PUT /my_index/_doc/1
{
  "title": "Elasticsearch 入门指南",
  "content": "Elasticsearch 是一个强大的搜索引擎...",
  "publish_date": "2024-12-19",
  "author": "张三",
  "tags": ["elasticsearch", "搜索", "教程"],
  "views": 100
}

# 创建文档（自动生成 ID）
POST /my_index/_doc
{
  "title": "高级搜索技巧",
  "content": "本文介绍 Elasticsearch 的高级搜索功能...",
  "publish_date": "2024-12-20",
  "author": "李四",
  "tags": ["elasticsearch", "高级", "技巧"],
  "views": 50
}

# 批量索引
POST /_bulk
{"index":{"_index":"my_index","_id":"2"}}
{"title":"搜索优化策略","content":"如何优化 Elasticsearch 搜索性能...","publish_date":"2024-12-21","author":"王五","tags":["优化","性能"],"views":75}
{"index":{"_index":"my_index","_id":"3"}}
{"title":"集群管理","content":"Elasticsearch 集群的配置和管理...","publish_date":"2024-12-22","author":"赵六","tags":["集群","管理"],"views":120}
```

#### 查询文档
```bash
# 根据 ID 获取文档
GET /my_index/_doc/1

# 检查文档是否存在
HEAD /my_index/_doc/1

# 获取文档的源数据
GET /my_index/_source/1

# 批量获取
GET /_mget
{
  "docs": [
    {"_index": "my_index", "_id": "1"},
    {"_index": "my_index", "_id": "2"}
  ]
}
```

#### 更新文档
```bash
# 部分更新
POST /my_index/_update/1
{
  "doc": {
    "views": 150
  }
}

# 脚本更新
POST /my_index/_update/1
{
  "script": {
    "source": "ctx._source.views += params.increment",
    "params": {
      "increment": 10
    }
  }
}

# Upsert（不存在则创建）
POST /my_index/_update/4
{
  "doc": {
    "title": "新文章",
    "views": 1
  },
  "doc_as_upsert": true
}
```

#### 删除文档
```bash
# 删除单个文档
DELETE /my_index/_doc/1

# 根据查询删除
POST /my_index/_delete_by_query
{
  "query": {
    "range": {
      "views": {
        "lt": 50
      }
    }
  }
}
```

## 搜索和查询

### 基本搜索

```bash
# 搜索所有文档
GET /my_index/_search

# 简单查询字符串
GET /my_index/_search?q=elasticsearch

# 分页搜索
GET /my_index/_search
{
  "from": 0,
  "size": 10,
  "query": {
    "match_all": {}
  }
}

# 排序
GET /my_index/_search
{
  "query": {
    "match_all": {}
  },
  "sort": [
    {"publish_date": {"order": "desc"}},
    {"views": {"order": "desc"}}
  ]
}

# 字段过滤
GET /my_index/_search
{
  "_source": ["title", "author", "publish_date"],
  "query": {
    "match_all": {}
  }
}
```

### 查询 DSL

#### 全文搜索
```bash
# match 查询
GET /my_index/_search
{
  "query": {
    "match": {
      "title": "elasticsearch 搜索"
    }
  }
}

# multi_match 查询
GET /my_index/_search
{
  "query": {
    "multi_match": {
      "query": "elasticsearch",
      "fields": ["title^2", "content"]
    }
  }
}

# match_phrase 查询（短语匹配）
GET /my_index/_search
{
  "query": {
    "match_phrase": {
      "content": "搜索引擎"
    }
  }
}

# query_string 查询
GET /my_index/_search
{
  "query": {
    "query_string": {
      "query": "elasticsearch AND (搜索 OR 引擎)",
      "fields": ["title", "content"]
    }
  }
}
```

#### 精确匹配
```bash
# term 查询
GET /my_index/_search
{
  "query": {
    "term": {
      "author": "张三"
    }
  }
}

# terms 查询
GET /my_index/_search
{
  "query": {
    "terms": {
      "tags": ["elasticsearch", "搜索"]
    }
  }
}

# range 查询
GET /my_index/_search
{
  "query": {
    "range": {
      "views": {
        "gte": 50,
        "lte": 200
      }
    }
  }
}

# exists 查询
GET /my_index/_search
{
  "query": {
    "exists": {
      "field": "tags"
    }
  }
}
```

#### 复合查询
```bash
# bool 查询
GET /my_index/_search
{
  "query": {
    "bool": {
      "must": [
        {"match": {"title": "elasticsearch"}}
      ],
      "filter": [
        {"range": {"views": {"gte": 50}}}
      ],
      "should": [
        {"term": {"author": "张三"}}
      ],
      "must_not": [
        {"term": {"tags": "过时"}}
      ]
    }
  }
}

# boosting 查询
GET /my_index/_search
{
  "query": {
    "boosting": {
      "positive": {
        "match": {"content": "elasticsearch"}
      },
      "negative": {
        "match": {"content": "过时"}
      },
      "negative_boost": 0.2
    }
  }
}
```

### 聚合分析

#### 指标聚合
```bash
# 基本统计
GET /my_index/_search
{
  "size": 0,
  "aggs": {
    "avg_views": {
      "avg": {"field": "views"}
    },
    "max_views": {
      "max": {"field": "views"}
    },
    "min_views": {
      "min": {"field": "views"}
    },
    "sum_views": {
      "sum": {"field": "views"}
    },
    "stats_views": {
      "stats": {"field": "views"}
    }
  }
}

# 百分位数
GET /my_index/_search
{
  "size": 0,
  "aggs": {
    "views_percentiles": {
      "percentiles": {
        "field": "views",
        "percents": [25, 50, 75, 95, 99]
      }
    }
  }
}
```

#### 桶聚合
```bash
# terms 聚合
GET /my_index/_search
{
  "size": 0,
  "aggs": {
    "authors": {
      "terms": {
        "field": "author",
        "size": 10
      }
    }
  }
}

# range 聚合
GET /my_index/_search
{
  "size": 0,
  "aggs": {
    "view_ranges": {
      "range": {
        "field": "views",
        "ranges": [
          {"to": 50},
          {"from": 50, "to": 100},
          {"from": 100}
        ]
      }
    }
  }
}

# date_histogram 聚合
GET /my_index/_search
{
  "size": 0,
  "aggs": {
    "articles_over_time": {
      "date_histogram": {
        "field": "publish_date",
        "calendar_interval": "month"
      }
    }
  }
}
```

#### 嵌套聚合
```bash
# 按作者分组，计算每个作者的平均浏览量
GET /my_index/_search
{
  "size": 0,
  "aggs": {
    "authors": {
      "terms": {
        "field": "author"
      },
      "aggs": {
        "avg_views": {
          "avg": {"field": "views"}
        },
        "total_views": {
          "sum": {"field": "views"}
        }
      }
    }
  }
}

# 复杂嵌套聚合
GET /my_index/_search
{
  "size": 0,
  "aggs": {
    "monthly_stats": {
      "date_histogram": {
        "field": "publish_date",
        "calendar_interval": "month"
      },
      "aggs": {
        "authors": {
          "terms": {
            "field": "author"
          },
          "aggs": {
            "avg_views": {
              "avg": {"field": "views"}
            }
          }
        },
        "total_views": {
          "sum": {"field": "views"}
        }
      }
    }
  }
}
```

## 映射和分析

### 映射管理

```bash
# 查看映射
GET /my_index/_mapping

# 添加字段映射
PUT /my_index/_mapping
{
  "properties": {
    "category": {
      "type": "keyword"
    },
    "rating": {
      "type": "float"
    },
    "location": {
      "type": "geo_point"
    }
  }
}

# 动态模板
PUT /my_index
{
  "mappings": {
    "dynamic_templates": [
      {
        "strings_as_keywords": {
          "match_mapping_type": "string",
          "match": "*_keyword",
          "mapping": {
            "type": "keyword"
          }
        }
      },
      {
        "strings_as_text": {
          "match_mapping_type": "string",
          "mapping": {
            "type": "text",
            "fields": {
              "keyword": {
                "type": "keyword",
                "ignore_above": 256
              }
            }
          }
        }
      }
    ]
  }
}
```

### 分析器配置

```bash
# 自定义分析器
PUT /my_index
{
  "settings": {
    "analysis": {
      "char_filter": {
        "my_char_filter": {
          "type": "mapping",
          "mappings": [
            "& => and",
            "| => or"
          ]
        }
      },
      "tokenizer": {
        "my_tokenizer": {
          "type": "pattern",
          "pattern": "[\\W|_]+"
        }
      },
      "filter": {
        "my_stopwords": {
          "type": "stop",
          "stopwords": ["is", "at", "the", "on"]
        },
        "my_stemmer": {
          "type": "stemmer",
          "language": "english"
        }
      },
      "analyzer": {
        "my_analyzer": {
          "type": "custom",
          "char_filter": ["my_char_filter"],
          "tokenizer": "my_tokenizer",
          "filter": [
            "lowercase",
            "my_stopwords",
            "my_stemmer"
          ]
        }
      }
    }
  }
}

# 测试分析器
GET /my_index/_analyze
{
  "analyzer": "my_analyzer",
  "text": "The quick brown foxes are running & jumping"
}

# 中文分析器（需要安装 IK 插件）
PUT /chinese_index
{
  "settings": {
    "analysis": {
      "analyzer": {
        "ik_smart_analyzer": {
          "type": "ik_smart"
        },
        "ik_max_word_analyzer": {
          "type": "ik_max_word"
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "ik_max_word",
        "search_analyzer": "ik_smart"
      },
      "content": {
        "type": "text",
        "analyzer": "ik_max_word"
      }
    }
  }
}
```

## 性能优化

### 索引优化

```bash
# 刷新间隔优化
PUT /my_index/_settings
{
  "refresh_interval": "30s"
}

# 批量索引时禁用刷新
PUT /my_index/_settings
{
  "refresh_interval": "-1"
}

# 批量索引完成后恢复
PUT /my_index/_settings
{
  "refresh_interval": "1s"
}

# 副本数量优化
PUT /my_index/_settings
{
  "number_of_replicas": 0
}

# 强制合并段
POST /my_index/_forcemerge?max_num_segments=1

# 索引模板
PUT /_index_template/my_template
{
  "index_patterns": ["logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 1,
      "refresh_interval": "30s"
    },
    "mappings": {
      "properties": {
        "@timestamp": {
          "type": "date"
        },
        "message": {
          "type": "text"
        },
        "level": {
          "type": "keyword"
        }
      }
    }
  }
}
```

### 查询优化

```bash
# 使用 filter 而不是 query（可缓存）
GET /my_index/_search
{
  "query": {
    "bool": {
      "filter": [
        {"term": {"author": "张三"}},
        {"range": {"views": {"gte": 50}}}
      ]
    }
  }
}

# 使用 constant_score 查询
GET /my_index/_search
{
  "query": {
    "constant_score": {
      "filter": {
        "term": {"author": "张三"}
      },
      "boost": 1.0
    }
  }
}

# 分页优化（使用 search_after）
GET /my_index/_search
{
  "size": 10,
  "sort": [
    {"publish_date": "desc"},
    {"_id": "desc"}
  ]
}

# 后续页面
GET /my_index/_search
{
  "size": 10,
  "sort": [
    {"publish_date": "desc"},
    {"_id": "desc"}
  ],
  "search_after": ["2024-12-19T10:00:00Z", "doc_id_here"]
}
```

### 硬件和配置优化

```yaml
# elasticsearch.yml 性能配置
# 内存设置
bootstrap.memory_lock: true

# 线程池设置
thread_pool:
  write:
    size: 8
    queue_size: 1000
  search:
    size: 13
    queue_size: 1000

# 索引设置
indices.memory.index_buffer_size: 20%
indices.memory.min_index_buffer_size: 48mb

# 网络设置
network.tcp.keep_alive: true
network.tcp.reuse_address: true

# 发现设置
discovery.zen.fd.ping_timeout: 120s
discovery.zen.fd.ping_retries: 6
```

## 监控和运维

### 集群监控

```bash
# 集群健康状态
GET /_cluster/health?level=indices

# 节点统计
GET /_nodes/stats
GET /_nodes/stats/indices,os,process,jvm,transport,http,fs,thread_pool

# 索引统计
GET /_stats
GET /my_index/_stats

# 分片分配
GET /_cat/shards?v
GET /_cluster/allocation/explain

# 任务管理
GET /_tasks
GET /_tasks?actions=*search*&detailed

# 热点线程
GET /_nodes/hot_threads
```

### 性能分析

```bash
# 慢查询日志
PUT /_cluster/settings
{
  "transient": {
    "logger.org.elasticsearch.index.search.slowlog.query": "DEBUG",
    "logger.org.elasticsearch.index.search.slowlog.fetch": "DEBUG",
    "logger.org.elasticsearch.index.indexing.slowlog.index": "DEBUG"
  }
}

# 索引级别的慢查询设置
PUT /my_index/_settings
{
  "index.search.slowlog.threshold.query.warn": "10s",
  "index.search.slowlog.threshold.query.info": "5s",
  "index.search.slowlog.threshold.query.debug": "2s",
  "index.search.slowlog.threshold.query.trace": "500ms",
  "index.search.slowlog.threshold.fetch.warn": "1s",
  "index.search.slowlog.threshold.fetch.info": "800ms",
  "index.search.slowlog.threshold.fetch.debug": "500ms",
  "index.search.slowlog.threshold.fetch.trace": "200ms"
}

# 查询分析
GET /my_index/_search
{
  "profile": true,
  "query": {
    "match": {
      "title": "elasticsearch"
    }
  }
}
```

### 备份和恢复

```bash
# 创建快照仓库
PUT /_snapshot/my_backup
{
  "type": "fs",
  "settings": {
    "location": "/mount/backups/my_backup",
    "compress": true
  }
}

# 创建快照
PUT /_snapshot/my_backup/snapshot_1
{
  "indices": "my_index,another_index",
  "ignore_unavailable": true,
  "include_global_state": false,
  "metadata": {
    "taken_by": "admin",
    "taken_because": "backup before upgrade"
  }
}

# 查看快照
GET /_snapshot/my_backup/_all
GET /_snapshot/my_backup/snapshot_1

# 恢复快照
POST /_snapshot/my_backup/snapshot_1/_restore
{
  "indices": "my_index",
  "ignore_unavailable": true,
  "include_global_state": false,
  "rename_pattern": "my_index",
  "rename_replacement": "restored_my_index"
}

# 删除快照
DELETE /_snapshot/my_backup/snapshot_1
```

## 实际应用案例

### 1. 日志分析系统

```bash
# 创建日志索引模板
PUT /_index_template/logs_template
{
  "index_patterns": ["logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 1,
      "index.lifecycle.name": "logs_policy",
      "index.lifecycle.rollover_alias": "logs"
    },
    "mappings": {
      "properties": {
        "@timestamp": {
          "type": "date"
        },
        "level": {
          "type": "keyword"
        },
        "message": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "service": {
          "type": "keyword"
        },
        "host": {
          "type": "keyword"
        },
        "ip": {
          "type": "ip"
        },
        "user_agent": {
          "type": "text"
        },
        "response_time": {
          "type": "float"
        }
      }
    }
  }
}

# 创建索引生命周期策略
PUT /_ilm/policy/logs_policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "5GB",
            "max_age": "1d"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "allocate": {
            "number_of_replicas": 0
          },
          "forcemerge": {
            "max_num_segments": 1
          }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "allocate": {
            "number_of_replicas": 0
          }
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}

# 日志分析查询
GET /logs-*/_search
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        {
          "range": {
            "@timestamp": {
              "gte": "now-1h"
            }
          }
        }
      ]
    }
  },
  "aggs": {
    "error_count": {
      "filter": {
        "term": {"level": "ERROR"}
      }
    },
    "services": {
      "terms": {
        "field": "service",
        "size": 10
      },
      "aggs": {
        "avg_response_time": {
          "avg": {
            "field": "response_time"
          }
        }
      }
    },
    "timeline": {
      "date_histogram": {
        "field": "@timestamp",
        "fixed_interval": "5m"
      },
      "aggs": {
        "error_rate": {
          "filter": {
            "term": {"level": "ERROR"}
          }
        }
      }
    }
  }
}
```

### 2. 电商搜索系统

```bash
# 创建商品索引
PUT /products
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "product_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "stop", "synonym"]
        }
      },
      "filter": {
        "synonym": {
          "type": "synonym",
          "synonyms": [
            "手机,mobile,phone",
            "电脑,computer,pc",
            "笔记本,laptop,notebook"
          ]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "name": {
        "type": "text",
        "analyzer": "product_analyzer",
        "fields": {
          "keyword": {
            "type": "keyword"
          }
        }
      },
      "description": {
        "type": "text",
        "analyzer": "product_analyzer"
      },
      "category": {
        "type": "keyword"
      },
      "brand": {
        "type": "keyword"
      },
      "price": {
        "type": "float"
      },
      "rating": {
        "type": "float"
      },
      "sales_count": {
        "type": "integer"
      },
      "tags": {
        "type": "keyword"
      },
      "created_at": {
        "type": "date"
      },
      "in_stock": {
        "type": "boolean"
      }
    }
  }
}

# 商品搜索查询
GET /products/_search
{
  "query": {
    "function_score": {
      "query": {
        "bool": {
          "must": [
            {
              "multi_match": {
                "query": "苹果手机",
                "fields": ["name^3", "description", "tags^2"],
                "type": "best_fields",
                "fuzziness": "AUTO"
              }
            }
          ],
          "filter": [
            {"term": {"in_stock": true}},
            {"range": {"price": {"gte": 1000, "lte": 8000}}},
            {"range": {"rating": {"gte": 4.0}}}
          ]
        }
      },
      "functions": [
        {
          "filter": {"range": {"sales_count": {"gte": 100}}},
          "weight": 1.5
        },
        {
          "gauss": {
            "created_at": {
              "origin": "now",
              "scale": "30d",
              "decay": 0.5
            }
          }
        }
      ],
      "score_mode": "multiply",
      "boost_mode": "multiply"
    }
  },
  "sort": [
    "_score",
    {"sales_count": {"order": "desc"}}
  ],
  "aggs": {
    "categories": {
      "terms": {
        "field": "category",
        "size": 10
      }
    },
    "brands": {
      "terms": {
        "field": "brand",
        "size": 10
      }
    },
    "price_ranges": {
      "range": {
        "field": "price",
        "ranges": [
          {"to": 1000},
          {"from": 1000, "to": 3000},
          {"from": 3000, "to": 5000},
          {"from": 5000}
        ]
      }
    }
  },
  "highlight": {
    "fields": {
      "name": {},
      "description": {
        "fragment_size": 150,
        "number_of_fragments": 3
      }
    }
  }
}
```

### 3. 地理位置搜索

```bash
# 创建位置索引
PUT /locations
{
  "mappings": {
    "properties": {
      "name": {
        "type": "text"
      },
      "location": {
        "type": "geo_point"
      },
      "category": {
        "type": "keyword"
      },
      "rating": {
        "type": "float"
      }
    }
  }
}

# 添加位置数据
POST /locations/_bulk
{"index":{"_id":"1"}}
{"name":"星巴克咖啡","location":{"lat":39.9042,"lon":116.4074},"category":"咖啡店","rating":4.5}
{"index":{"_id":"2"}}
{"name":"麦当劳","location":{"lat":39.9052,"lon":116.4084},"category":"快餐","rating":4.2}
{"index":{"_id":"3"}}
{"name":"肯德基","location":{"lat":39.9032,"lon":116.4064},"category":"快餐","rating":4.1}

# 地理位置搜索
GET /locations/_search
{
  "query": {
    "bool": {
      "must": {
        "match_all": {}
      },
      "filter": {
        "geo_distance": {
          "distance": "1km",
          "location": {
            "lat": 39.9042,
            "lon": 116.4074
          }
        }
      }
    }
  },
  "sort": [
    {
      "_geo_distance": {
        "location": {
          "lat": 39.9042,
          "lon": 116.4074
        },
        "order": "asc",
        "unit": "km",
        "mode": "min",
        "distance_type": "arc"
      }
    }
  ]
}

# 地理边界搜索
GET /locations/_search
{
  "query": {
    "geo_bounding_box": {
      "location": {
        "top_left": {
          "lat": 39.91,
          "lon": 116.40
        },
        "bottom_right": {
          "lat": 39.90,
          "lon": 116.42
        }
      }
    }
  }
}
```

## 最佳实践

### 1. 索引设计

- **分片数量**：根据数据量和查询负载确定，通常每个分片 20-40GB
- **副本数量**：根据可用性要求和查询负载确定
- **映射设计**：合理设置字段类型，避免动态映射
- **索引模板**：使用索引模板统一管理索引设置

### 2. 查询优化

- **使用 filter**：对于精确匹配使用 filter 而不是 query
- **避免深分页**：使用 search_after 代替 from/size
- **合理使用聚合**：避免高基数字段的 terms 聚合
- **缓存利用**：充分利用查询缓存和请求缓存

### 3. 性能调优

- **内存设置**：JVM 堆内存不超过 32GB，设置为物理内存的一半
- **磁盘优化**：使用 SSD，合理设置文件系统
- **网络优化**：使用高速网络，调整网络参数
- **监控告警**：设置关键指标监控和告警

### 4. 运维管理

- **定期备份**：制定备份策略和恢复测试
- **索引生命周期**：使用 ILM 管理索引生命周期
- **集群升级**：制定滚动升级策略
- **容量规划**：监控资源使用，提前扩容

## 总结

Elasticsearch 是一个功能强大的分布式搜索和分析引擎，适用于全文搜索、日志分析、实时分析等多种场景。通过合理的索引设计、查询优化和集群管理，Elasticsearch 能够为应用提供高性能、高可用的搜索和分析能力。

### 优势

- 强大的全文搜索能力
- 丰富的查询和聚合功能
- 良好的水平扩展能力
- 近实时的搜索响应
- 活跃的社区和生态

### 适用场景

- 企业搜索平台
- 日志分析系统
- 电商搜索引擎
- 实时数据分析
- 监控和告警系统

通过深入理解 Elasticsearch 的核心概念和最佳实践，可以充分发挥其在现代数据处理和搜索场景中的价值。