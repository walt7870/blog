# PodDisruptionBudget (PDB)

## 概述

PodDisruptionBudget (PDB) 是 Kubernetes 中用于控制应用程序在自愿中断期间可用性的对象。它定义了在维护操作（如节点升级、集群缩容等）期间，应用程序必须保持的最小可用 Pod 数量或最大不可用 Pod 数量，确保应用程序的高可用性。

| 关键点 | 内容 |
| ---- | ---- |
| 核心作用 | 控制自愿中断期间的 Pod 可用性 |
| 中断类型 | 只影响自愿中断，不影响非自愿中断 |
| 控制方式 | 最小可用数量或最大不可用数量 |
| 作用对象 | 通过标签选择器选择的 Pod 集合 |
| 应用场景 | 集群维护、节点升级、应用更新 |

## PodDisruptionBudget 的本质

### 设计理念

* **高可用性保障**：确保关键应用在维护期间保持服务可用
* **优雅中断**：控制 Pod 的中断速度和数量
* **运维友好**：为集群维护操作提供安全保障
* **业务连续性**：避免因维护操作导致的服务中断

### 工作原理

```
维护操作请求 → PDB 检查 → 评估可用性 → 允许/拒绝中断 → 执行操作
       ↓            ↓           ↓             ↓            ↓
   节点驱逐      检查 PDB    计算可用 Pod   中断决策      Pod 迁移
```

### 中断类型

| 中断类型 | 描述 | PDB 是否生效 | 示例 |
| ---- | ---- | ---- | ---- |
| 自愿中断 | 由管理员或自动化系统主动发起 | ✅ 生效 | 节点维护、集群升级、应用更新 |
| 非自愿中断 | 由硬件故障或系统问题导致 | ❌ 不生效 | 节点故障、网络中断、内核崩溃 |

### PDB vs 副本控制

| 特性 | PodDisruptionBudget | Deployment/ReplicaSet |
| ---- | ---- | ---- |
| 控制目标 | 中断期间的可用性 | 期望的副本数量 |
| 作用时机 | 维护操作期间 | 持续运行期间 |
| 故障处理 | 不处理非自愿中断 | 自动恢复故障 Pod |
| 配置方式 | 最小可用/最大不可用 | 副本数量 |

## 基本配置

### 1. 最小可用 Pod 数量

```yaml
# 基于绝对数量的 PDB
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
  namespace: production
  labels:
    app: web-app
    tier: frontend
spec:
  # 最少保持 3 个 Pod 可用
  minAvailable: 3
  selector:
    matchLabels:
      app: web-app
      tier: frontend

---
# 对应的 Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 5  # 总共 5 个副本
  selector:
    matchLabels:
      app: web-app
      tier: frontend
  template:
    metadata:
      labels:
        app: web-app
        tier: frontend
    spec:
      containers:
      - name: web
        image: nginx:1.20
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
        readinessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 15
          periodSeconds: 20

# 这个配置意味着：
# - 总共 5 个 Pod
# - 维护期间最少保持 3 个 Pod 可用
# - 最多可以同时中断 2 个 Pod
```

### 2. 基于百分比的最小可用

```yaml
# 基于百分比的 PDB
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-service-pdb
  namespace: production
  labels:
    app: api-service
    component: backend
spec:
  # 最少保持 80% 的 Pod 可用
  minAvailable: 80%
  selector:
    matchLabels:
      app: api-service
      component: backend

---
# 对应的 Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
spec:
  replicas: 10  # 总共 10 个副本
  selector:
    matchLabels:
      app: api-service
      component: backend
  template:
    metadata:
      labels:
        app: api-service
        component: backend
    spec:
      containers:
      - name: api
        image: api-service:v1.2.0
        ports:
        - containerPort: 8080
        env:
        - name: DB_HOST
          value: "postgres.database.svc.cluster.local"
        - name: REDIS_HOST
          value: "redis.cache.svc.cluster.local"
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        readinessProbe:
          httpGet:
            path: /api/health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /api/health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10

# 这个配置意味着：
# - 总共 10 个 Pod
# - 维护期间最少保持 8 个 Pod 可用（80%）
# - 最多可以同时中断 2 个 Pod
```

### 3. 最大不可用 Pod 数量

```yaml
# 基于最大不可用数量的 PDB
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: database-pdb
  namespace: production
  labels:
    app: database
    type: stateful
spec:
  # 最多允许 1 个 Pod 不可用
  maxUnavailable: 1
  selector:
    matchLabels:
      app: database
      type: stateful

---
# 对应的 StatefulSet
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
  namespace: production
spec:
  serviceName: database-headless
  replicas: 3  # 3 个数据库副本
  selector:
    matchLabels:
      app: database
      type: stateful
  template:
    metadata:
      labels:
        app: database
        type: stateful
    spec:
      containers:
      - name: postgres
        image: postgres:13
        env:
        - name: POSTGRES_DB
          value: "appdb"
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        - name: PGDATA
          value: "/var/lib/postgresql/data/pgdata"
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi
        readinessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - pg_isready -U $POSTGRES_USER -d $POSTGRES_DB
          initialDelaySeconds: 15
          periodSeconds: 5
        livenessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - pg_isready -U $POSTGRES_USER -d $POSTGRES_DB
          initialDelaySeconds: 45
          periodSeconds: 10
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 100Gi

# 这个配置意味着：
# - 总共 3 个数据库 Pod
# - 维护期间最多允许 1 个 Pod 不可用
# - 至少保持 2 个 Pod 可用
```

## 高级配置

### 1. 多层 PDB 策略

```yaml
# 关键服务的严格 PDB
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: critical-service-pdb
  namespace: production
  labels:
    service-tier: critical
    availability: high
  annotations:
    description: "关键业务服务的严格可用性保障"
    contact: "sre-team@company.com"
spec:
  # 关键服务：最少保持 90% 可用
  minAvailable: 90%
  selector:
    matchLabels:
      service-tier: critical
      environment: production

---
# 重要服务的标准 PDB
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: important-service-pdb
  namespace: production
  labels:
    service-tier: important
    availability: medium
spec:
  # 重要服务：最少保持 75% 可用
  minAvailable: 75%
  selector:
    matchLabels:
      service-tier: important
      environment: production

---
# 一般服务的宽松 PDB
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: standard-service-pdb
  namespace: production
  labels:
    service-tier: standard
    availability: low
spec:
  # 一般服务：最多允许 50% 不可用
  maxUnavailable: 50%
  selector:
    matchLabels:
      service-tier: standard
      environment: production

---
# 关键服务 Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
spec:
  replicas: 10
  selector:
    matchLabels:
      app: payment-service
      service-tier: critical
      environment: production
  template:
    metadata:
      labels:
        app: payment-service
        service-tier: critical
        environment: production
    spec:
      containers:
      - name: payment
        image: payment-service:v2.1.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: 300m
            memory: 512Mi
          limits:
            cpu: 600m
            memory: 1Gi

---
# 重要服务 Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: production
spec:
  replicas: 8
  selector:
    matchLabels:
      app: user-service
      service-tier: important
      environment: production
  template:
    metadata:
      labels:
        app: user-service
        service-tier: important
        environment: production
    spec:
      containers:
      - name: user
        image: user-service:v1.5.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 400m
            memory: 512Mi

---
# 一般服务 Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-service
  namespace: production
spec:
  replicas: 4
  selector:
    matchLabels:
      app: notification-service
      service-tier: standard
      environment: production
  template:
    metadata:
      labels:
        app: notification-service
        service-tier: standard
        environment: production
    spec:
      containers:
      - name: notification
        image: notification-service:v1.0.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

### 2. 跨可用区的 PDB

```yaml
# 跨可用区部署的 PDB
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: multi-az-service-pdb
  namespace: production
  labels:
    deployment-strategy: multi-az
    availability: high
spec:
  # 确保每个可用区至少有一个 Pod
  minAvailable: 3  # 假设有 3 个可用区
  selector:
    matchLabels:
      app: multi-az-service
      deployment-strategy: multi-az

---
# 跨可用区的 Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: multi-az-service
  namespace: production
spec:
  replicas: 9  # 每个可用区 3 个副本
  selector:
    matchLabels:
      app: multi-az-service
      deployment-strategy: multi-az
  template:
    metadata:
      labels:
        app: multi-az-service
        deployment-strategy: multi-az
    spec:
      # 反亲和性确保 Pod 分布在不同节点和可用区
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - multi-az-service
              topologyKey: kubernetes.io/hostname
          - weight: 50
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - multi-az-service
              topologyKey: topology.kubernetes.io/zone
      containers:
      - name: app
        image: multi-az-service:v1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: AZ_INFO
          valueFrom:
            fieldRef:
              fieldPath: metadata.annotations['topology.kubernetes.io/zone']
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 400m
            memory: 512Mi
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
```

### 3. 有状态应用的 PDB

```yaml
# Redis 集群的 PDB
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: redis-cluster-pdb
  namespace: cache
  labels:
    app: redis-cluster
    type: cache
spec:
  # Redis 集群：最多允许 1 个节点不可用
  maxUnavailable: 1
  selector:
    matchLabels:
      app: redis-cluster
      role: node

---
# Redis 集群 StatefulSet
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
  namespace: cache
spec:
  serviceName: redis-cluster-headless
  replicas: 6  # 3 主 + 3 从
  selector:
    matchLabels:
      app: redis-cluster
      role: node
  template:
    metadata:
      labels:
        app: redis-cluster
        role: node
    spec:
      containers:
      - name: redis
        image: redis:6.2-alpine
        command:
        - redis-server
        args:
        - /etc/redis/redis.conf
        - --cluster-enabled
        - "yes"
        - --cluster-config-file
        - /data/nodes.conf
        - --cluster-node-timeout
        - "5000"
        - --appendonly
        - "yes"
        ports:
        - containerPort: 6379
          name: client
        - containerPort: 16379
          name: gossip
        volumeMounts:
        - name: redis-data
          mountPath: /data
        - name: redis-config
          mountPath: /etc/redis
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        readinessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 5
          periodSeconds: 5
        livenessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 30
          periodSeconds: 10
      volumes:
      - name: redis-config
        configMap:
          name: redis-config
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 10Gi

---
# Elasticsearch 集群的 PDB
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: elasticsearch-master-pdb
  namespace: logging
  labels:
    app: elasticsearch
    role: master
spec:
  # ES 主节点：最少保持 2 个可用（确保仲裁）
  minAvailable: 2
  selector:
    matchLabels:
      app: elasticsearch
      role: master

---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: elasticsearch-data-pdb
  namespace: logging
  labels:
    app: elasticsearch
    role: data
spec:
  # ES 数据节点：最多允许 1 个不可用
  maxUnavailable: 1
  selector:
    matchLabels:
      app: elasticsearch
      role: data

---
# Elasticsearch 主节点 StatefulSet
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch-master
  namespace: logging
spec:
  serviceName: elasticsearch-master-headless
  replicas: 3
  selector:
    matchLabels:
      app: elasticsearch
      role: master
  template:
    metadata:
      labels:
        app: elasticsearch
        role: master
    spec:
      containers:
      - name: elasticsearch
        image: elasticsearch:7.17.0
        env:
        - name: cluster.name
          value: "elasticsearch-cluster"
        - name: node.name
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: node.roles
          value: "master"
        - name: discovery.seed_hosts
          value: "elasticsearch-master-headless"
        - name: cluster.initial_master_nodes
          value: "elasticsearch-master-0,elasticsearch-master-1,elasticsearch-master-2"
        - name: ES_JAVA_OPTS
          value: "-Xms1g -Xmx1g"
        ports:
        - containerPort: 9200
          name: http
        - containerPort: 9300
          name: transport
        volumeMounts:
        - name: elasticsearch-data
          mountPath: /usr/share/elasticsearch/data
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: 1000m
            memory: 2Gi
        readinessProbe:
          httpGet:
            path: /_cluster/health?local=true
            port: 9200
          initialDelaySeconds: 30
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /_cluster/health?local=true
            port: 9200
          initialDelaySeconds: 90
          periodSeconds: 30
  volumeClaimTemplates:
  - metadata:
      name: elasticsearch-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: standard
      resources:
        requests:
          storage: 50Gi
```

## 实际应用场景

### 1. 电商平台的 PDB 策略

```yaml
# 订单服务 - 关键业务
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: order-service-pdb
  namespace: ecommerce
  labels:
    service: order
    criticality: critical
    business-impact: high
  annotations:
    description: "订单服务的高可用性保障"
    sla-requirement: "99.9%"
    max-downtime: "5 minutes per month"
spec:
  # 订单服务：最少保持 95% 可用
  minAvailable: 95%
  selector:
    matchLabels:
      app: order-service
      tier: backend

---
# 支付服务 - 关键业务
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: payment-service-pdb
  namespace: ecommerce
  labels:
    service: payment
    criticality: critical
    business-impact: high
spec:
  # 支付服务：最多允许 1 个 Pod 不可用
  maxUnavailable: 1
  selector:
    matchLabels:
      app: payment-service
      tier: backend

---
# 商品服务 - 重要业务
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: product-service-pdb
  namespace: ecommerce
  labels:
    service: product
    criticality: important
    business-impact: medium
spec:
  # 商品服务：最少保持 80% 可用
  minAvailable: 80%
  selector:
    matchLabels:
      app: product-service
      tier: backend

---
# 推荐服务 - 一般业务
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: recommendation-service-pdb
  namespace: ecommerce
  labels:
    service: recommendation
    criticality: standard
    business-impact: low
spec:
  # 推荐服务：最多允许 50% 不可用
  maxUnavailable: 50%
  selector:
    matchLabels:
      app: recommendation-service
      tier: backend

---
# 前端应用 - 用户界面
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: frontend-pdb
  namespace: ecommerce
  labels:
    service: frontend
    criticality: important
    business-impact: high
spec:
  # 前端应用：最少保持 85% 可用
  minAvailable: 85%
  selector:
    matchLabels:
      app: frontend
      tier: frontend
```

### 2. 微服务架构的 PDB 管理

```yaml
# API 网关 - 流量入口
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-gateway-pdb
  namespace: microservices
  labels:
    component: api-gateway
    layer: edge
    traffic-handling: "true"
spec:
  # API 网关：最少保持 90% 可用
  minAvailable: 90%
  selector:
    matchLabels:
      app: api-gateway
      component: edge

---
# 服务发现 - 基础设施
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: service-discovery-pdb
  namespace: microservices
  labels:
    component: service-discovery
    layer: infrastructure
    critical-infrastructure: "true"
spec:
  # 服务发现：最多允许 1 个不可用
  maxUnavailable: 1
  selector:
    matchLabels:
      app: consul
      component: service-discovery

---
# 配置中心 - 基础设施
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: config-center-pdb
  namespace: microservices
  labels:
    component: config-center
    layer: infrastructure
spec:
  # 配置中心：最少保持 2 个可用
  minAvailable: 2
  selector:
    matchLabels:
      app: config-center
      component: infrastructure

---
# 消息队列 - 中间件
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: message-queue-pdb
  namespace: microservices
  labels:
    component: message-queue
    layer: middleware
spec:
  # 消息队列：最多允许 1 个不可用
  maxUnavailable: 1
  selector:
    matchLabels:
      app: rabbitmq
      component: message-queue

---
# 监控系统 - 运维工具
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: monitoring-pdb
  namespace: monitoring
  labels:
    component: monitoring
    layer: observability
spec:
  # 监控系统：最少保持 75% 可用
  minAvailable: 75%
  selector:
    matchLabels:
      app: prometheus
      component: monitoring
```

### 3. 数据平台的 PDB 策略

```yaml
# 数据摄取服务
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: data-ingestion-pdb
  namespace: data-platform
  labels:
    component: data-ingestion
    data-flow: critical
spec:
  # 数据摄取：最少保持 80% 可用
  minAvailable: 80%
  selector:
    matchLabels:
      app: kafka-connect
      component: data-ingestion

---
# 流处理服务
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: stream-processing-pdb
  namespace: data-platform
  labels:
    component: stream-processing
    processing-type: realtime
spec:
  # 流处理：最多允许 25% 不可用
  maxUnavailable: 25%
  selector:
    matchLabels:
      app: flink
      component: stream-processing

---
# 批处理服务
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: batch-processing-pdb
  namespace: data-platform
  labels:
    component: batch-processing
    processing-type: batch
spec:
  # 批处理：最多允许 50% 不可用（可容忍更多中断）
  maxUnavailable: 50%
  selector:
    matchLabels:
      app: spark
      component: batch-processing

---
# 数据存储服务
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: data-storage-pdb
  namespace: data-platform
  labels:
    component: data-storage
    storage-type: distributed
spec:
  # 数据存储：最多允许 1 个节点不可用
  maxUnavailable: 1
  selector:
    matchLabels:
      app: hdfs
      component: datanode

---
# 数据查询服务
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: data-query-pdb
  namespace: data-platform
  labels:
    component: data-query
    query-type: analytical
spec:
  # 数据查询：最少保持 70% 可用
  minAvailable: 70%
  selector:
    matchLabels:
      app: presto
      component: data-query
```

## 命令行操作

### 基本操作

```bash
# 查看 PodDisruptionBudget
kubectl get poddisruptionbudgets
kubectl get pdb  # 简写形式
kubectl get pdb -n production

# 查看详细信息
kubectl describe pdb web-app-pdb -n production
kubectl get pdb web-app-pdb -o yaml

# 查看所有命名空间的 PDB
kubectl get pdb --all-namespaces

# 查看 PDB 状态
kubectl get pdb -o wide
```

### PDB 状态监控

```bash
# 查看 PDB 详细状态
kubectl describe pdb -n production

# 查看 PDB 的当前状态
kubectl get pdb -o jsonpath='{.items[*].status}' | jq .

# 监控 PDB 状态变化
watch kubectl get pdb -n production

# 查看 PDB 相关事件
kubectl get events --field-selector involvedObject.kind=PodDisruptionBudget -n production
```

### 创建和管理

```bash
# 从文件创建 PDB
kubectl apply -f pdb.yaml

# 更新 PDB
kubectl apply -f updated-pdb.yaml

# 删除 PDB
kubectl delete pdb web-app-pdb -n production

# 批量删除
kubectl delete pdb --all -n test-namespace
```

### 驱逐测试

```bash
# 测试节点驱逐（模拟维护操作）
# 1. 查看当前 Pod 分布
kubectl get pods -n production -o wide

# 2. 查看 PDB 状态
kubectl get pdb -n production

# 3. 驱逐节点（这会触发 PDB 检查）
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# 4. 观察 PDB 是否阻止了过多的 Pod 被驱逐
kubectl get pdb -n production
kubectl get pods -n production -o wide

# 5. 恢复节点
kubectl uncordon <node-name>
```

### PDB 验证脚本

```bash
#!/bin/bash
# PDB 验证脚本

NAMESPACE=${1:-default}
APP_LABEL=${2:-app}

echo "=== PodDisruptionBudget 验证 - $NAMESPACE ==="

# 检查是否存在 PDB
if ! kubectl get pdb -n $NAMESPACE &>/dev/null; then
    echo "命名空间 $NAMESPACE 中没有 PodDisruptionBudget"
    exit 0
fi

# 获取所有 PDB
echo "1. PodDisruptionBudget 列表:"
kubectl get pdb -n $NAMESPACE
echo

# 详细状态检查
echo "2. PDB 状态详情:"
for pdb in $(kubectl get pdb -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}'); do
    echo "--- $pdb ---"
    kubectl describe pdb $pdb -n $NAMESPACE | grep -A 10 "Status:\|Allowed disruptions\|Current\|Desired"
    echo
done

# 检查 Pod 与 PDB 的匹配关系
echo "3. Pod 与 PDB 匹配关系:"
for pdb in $(kubectl get pdb -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}'); do
    echo "--- $pdb ---"
    
    # 获取 PDB 的选择器
    selector=$(kubectl get pdb $pdb -n $NAMESPACE -o jsonpath='{.spec.selector.matchLabels}' | jq -r 'to_entries | map("\(.key)=\(.value)") | join(",")')
    
    if [[ -n "$selector" ]]; then
        echo "选择器: $selector"
        echo "匹配的 Pod:"
        kubectl get pods -n $NAMESPACE -l "$selector" --no-headers | wc -l | xargs echo "  Pod 数量:"
        kubectl get pods -n $NAMESPACE -l "$selector" -o jsonpath='{.items[*].metadata.name}' | tr ' ' '\n' | sed 's/^/  - /'
    else
        echo "无法获取选择器"
    fi
    echo
done

# 模拟驱逐测试
echo "4. 驱逐可行性分析:"
for pdb in $(kubectl get pdb -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}'); do
    echo "--- $pdb ---"
    
    # 获取 PDB 状态
    current_healthy=$(kubectl get pdb $pdb -n $NAMESPACE -o jsonpath='{.status.currentHealthy}')
    desired_healthy=$(kubectl get pdb $pdb -n $NAMESPACE -o jsonpath='{.status.desiredHealthy}')
    disruptions_allowed=$(kubectl get pdb $pdb -n $NAMESPACE -o jsonpath='{.status.disruptionsAllowed}')
    
    echo "  当前健康 Pod: $current_healthy"
    echo "  期望健康 Pod: $desired_healthy"
    echo "  允许中断数量: $disruptions_allowed"
    
    if [[ "$disruptions_allowed" -gt 0 ]]; then
        echo "  ✅ 可以安全驱逐 $disruptions_allowed 个 Pod"
    else
        echo "  ❌ 当前不能驱逐任何 Pod"
    fi
    echo
done

echo "=== 验证完成 ==="
```

## 故障排查

### 常见问题

| 问题 | 可能原因 | 解决方案 |
| ---- | ---- | ---- |
| 节点无法驱逐 | PDB 阻止了 Pod 驱逐 | 检查 PDB 配置，调整 minAvailable 或 maxUnavailable |
| PDB 不生效 | 选择器不匹配或 Pod 没有标签 | 检查选择器和 Pod 标签 |
| 驱逐操作卡住 | Pod 无法正常终止 | 检查 Pod 的 terminationGracePeriodSeconds |
| PDB 状态异常 | 控制器问题或资源冲突 | 检查 kube-controller-manager 日志 |
| 意外的服务中断 | PDB 配置过于宽松 | 调整 PDB 策略，增加可用性要求 |

### 诊断步骤

1. **检查 PDB 配置**
```bash
# 确认 PDB 存在且配置正确
kubectl get pdb -n <namespace>
kubectl describe pdb <name> -n <namespace>
```

2. **验证选择器匹配**
```bash
# 检查 PDB 选择器
kubectl get pdb <name> -o yaml | grep -A 5 selector

# 检查匹配的 Pod
kubectl get pods -l <selector> -n <namespace>
```

3. **检查 PDB 状态**
```bash
# 查看 PDB 当前状态
kubectl get pdb <name> -o jsonpath='{.status}' | jq .

# 检查是否有足够的健康 Pod
kubectl describe pdb <name> -n <namespace>
```

4. **测试驱逐操作**
```bash
# 模拟驱逐测试
kubectl drain <node-name> --dry-run --ignore-daemonsets

# 查看驱逐失败的原因
kubectl get events --field-selector reason=EvictionBlocked -n <namespace>
```

### 常见错误和解决方案

```yaml
# 错误1：选择器不匹配
# 错误的配置
spec:
  selector:
    matchLabels:
      app: web-app      # Pod 的标签是 app: webapp

# 正确的配置
spec:
  selector:
    matchLabels:
      app: webapp       # 与 Pod 标签匹配

---
# 错误2：PDB 配置过于严格
# 问题配置
spec:
  minAvailable: 5     # 但只有 3 个 Pod
  selector:
    matchLabels:
      app: small-service

# 修正配置
spec:
  minAvailable: 2     # 或者使用百分比 minAvailable: 67%
  selector:
    matchLabels:
      app: small-service

---
# 错误3：同时设置 minAvailable 和 maxUnavailable
# 错误的配置
spec:
  minAvailable: 3
  maxUnavailable: 1   # 不能同时设置

# 正确的配置（选择其一）
spec:
  minAvailable: 3     # 或者只设置 maxUnavailable: 1
```

## 最佳实践

### 1. PDB 设计原则

```yaml
# 1. 基于业务重要性的分层策略
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: tier1-critical-pdb
  namespace: production
  labels:
    tier: critical
    sla: "99.99"
  annotations:
    description: "关键业务服务，要求最高可用性"
    business-impact: "直接影响收入和用户体验"
    escalation: "立即通知 SRE 团队"
spec:
  # 关键服务：最少保持 95% 可用
  minAvailable: 95%
  selector:
    matchLabels:
      service-tier: critical
      environment: production

---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: tier2-important-pdb
  namespace: production
  labels:
    tier: important
    sla: "99.9"
spec:
  # 重要服务：最少保持 80% 可用
  minAvailable: 80%
  selector:
    matchLabels:
      service-tier: important
      environment: production

---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: tier3-standard-pdb
  namespace: production
  labels:
    tier: standard
    sla: "99.5"
spec:
  # 标准服务：最多允许 40% 不可用
  maxUnavailable: 40%
  selector:
    matchLabels:
      service-tier: standard
      environment: production
```

### 2. 监控和告警集成

```yaml
# Prometheus 监控规则
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: pdb-monitoring
  namespace: monitoring
spec:
  groups:
  - name: pdb.rules
    rules:
    # PDB 健康状态监控
    - record: kubernetes:pdb:health_ratio
      expr: |
        (
          kube_poddisruptionbudget_status_current_healthy 
          / 
          kube_poddisruptionbudget_status_desired_healthy
        ) * 100
    
    # PDB 违规告警
    - alert: PDBViolation
      expr: |
        kube_poddisruptionbudget_status_current_healthy 
        < 
        kube_poddisruptionbudget_status_desired_healthy
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "PodDisruptionBudget 违规"
        description: "PDB {{ $labels.poddisruptionbudget }} 在命名空间 {{ $labels.namespace }} 中违规，当前健康 Pod 数量低于期望值"
    
    # PDB 无法驱逐告警
    - alert: PDBBlockingEviction
      expr: |
        kube_poddisruptionbudget_status_disruptions_allowed == 0
        and
        kube_poddisruptionbudget_status_current_healthy > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "PDB 阻止驱逐操作"
        description: "PDB {{ $labels.poddisruptionbudget }} 在命名空间 {{ $labels.namespace }} 中不允许任何驱逐操作，可能影响维护工作"
    
    # PDB 配置异常告警
    - alert: PDBMisconfigured
      expr: |
        kube_poddisruptionbudget_status_desired_healthy == 0
        or
        kube_poddisruptionbudget_status_expected_pods == 0
      for: 1m
      labels:
        severity: warning
      annotations:
        summary: "PDB 配置异常"
        description: "PDB {{ $labels.poddisruptionbudget }} 在命名空间 {{ $labels.namespace }} 中配置异常，没有匹配到任何 Pod"
```

### 3. 自动化 PDB 管理

```bash
#!/bin/bash
# PDB 自动化管理脚本

set -e

# 配置
CONFIG_DIR="/etc/kubernetes/pdb-configs"
LOG_FILE="/var/log/pdb-manager.log"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL}"
DRY_RUN=${DRY_RUN:-false}

# 日志函数
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

# 发送通知
send_notification() {
    local message="$1"
    local severity="$2"
    
    log "$message"
    
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local color="good"
        case $severity in
            warning) color="warning" ;;
            error) color="danger" ;;
        esac
        
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"$color\",\"text\":\"$message\"}]}" \
            $SLACK_WEBHOOK
    fi
}

# 检查 PDB 健康状态
check_pdb_health() {
    local namespace="$1"
    
    log "检查命名空间 $namespace 的 PDB 健康状态"
    
    local unhealthy_pdbs=$(kubectl get pdb -n $namespace -o json | jq -r '
        .items[] |
        select(.status.currentHealthy < .status.desiredHealthy) |
        .metadata.name
    ')
    
    if [[ -n "$unhealthy_pdbs" ]]; then
        for pdb in $unhealthy_pdbs; do
            local current=$(kubectl get pdb $pdb -n $namespace -o jsonpath='{.status.currentHealthy}')
            local desired=$(kubectl get pdb $pdb -n $namespace -o jsonpath='{.status.desiredHealthy}')
            
            send_notification "🚨 PDB 健康检查失败: $namespace/$pdb (当前: $current, 期望: $desired)" "error"
        done
        return 1
    else
        log "命名空间 $namespace 中所有 PDB 状态正常"
        return 0
    fi
}

# 自动调整 PDB
auto_adjust_pdb() {
    local namespace="$1"
    local pdb_name="$2"
    
    log "分析 PDB $namespace/$pdb_name 的调整需求"
    
    # 获取当前 Pod 数量
    local selector=$(kubectl get pdb $pdb_name -n $namespace -o jsonpath='{.spec.selector.matchLabels}' | jq -r 'to_entries | map("\(.key)=\(.value)") | join(",")')
    local current_pods=$(kubectl get pods -n $namespace -l "$selector" --field-selector=status.phase=Running --no-headers | wc -l)
    
    # 获取 PDB 配置
    local min_available=$(kubectl get pdb $pdb_name -n $namespace -o jsonpath='{.spec.minAvailable}')
    local max_unavailable=$(kubectl get pdb $pdb_name -n $namespace -o jsonpath='{.spec.maxUnavailable}')
    
    # 分析是否需要调整
    if [[ -n "$min_available" ]]; then
        if [[ "$min_available" =~ % ]]; then
            local percentage=${min_available%\%}
            local required_pods=$((current_pods * percentage / 100))
        else
            local required_pods=$min_available
        fi
        
        if [[ $required_pods -ge $current_pods ]]; then
            send_notification "⚠️ PDB 配置需要调整: $namespace/$pdb_name (要求 $required_pods 个 Pod，但只有 $current_pods 个)" "warning"
            
            if [[ "$DRY_RUN" != "true" ]]; then
                # 这里可以实现自动调整逻辑
                log "建议调整 PDB $namespace/$pdb_name 的 minAvailable 值"
            fi
        fi
    fi
}

# 生成 PDB 报告
generate_pdb_report() {
    local output_file="/tmp/pdb-report-$(date +%Y%m%d-%H%M%S).json"
    
    log "生成 PDB 状态报告: $output_file"
    
    kubectl get pdb --all-namespaces -o json | jq '{
        "timestamp": now | strftime("%Y-%m-%d %H:%M:%S"),
        "summary": {
            "total_pdbs": (.items | length),
            "healthy_pdbs": [.items[] | select(.status.currentHealthy >= .status.desiredHealthy)] | length,
            "unhealthy_pdbs": [.items[] | select(.status.currentHealthy < .status.desiredHealthy)] | length,
            "blocking_pdbs": [.items[] | select(.status.disruptionsAllowed == 0)] | length
        },
        "details": [
            .items[] | {
                "namespace": .metadata.namespace,
                "name": .metadata.name,
                "current_healthy": .status.currentHealthy,
                "desired_healthy": .status.desiredHealthy,
                "disruptions_allowed": .status.disruptionsAllowed,
                "expected_pods": .status.expectedPods,
                "status": (if .status.currentHealthy >= .status.desiredHealthy then "healthy" else "unhealthy" end)
            }
        ]
    }' > $output_file
    
    # 发送摘要通知
    local total=$(jq -r '.summary.total_pdbs' $output_file)
    local healthy=$(jq -r '.summary.healthy_pdbs' $output_file)
    local unhealthy=$(jq -r '.summary.unhealthy_pdbs' $output_file)
    
    send_notification "📊 PDB 状态报告: 总计 $total 个，健康 $healthy 个，异常 $unhealthy 个" "info"
    
    log "PDB 报告已生成: $output_file"
}

# 维护窗口检查
check_maintenance_window() {
    local current_hour=$(date +%H)
    local current_day=$(date +%u)  # 1=Monday, 7=Sunday
    
    # 定义维护窗口：周二和周四的 02:00-04:00
    if [[ $current_day -eq 2 || $current_day -eq 4 ]] && [[ $current_hour -ge 2 && $current_hour -lt 4 ]]; then
        return 0  # 在维护窗口内
    else
        return 1  # 不在维护窗口内
    fi
}

# 主函数
main() {
    log "开始 PDB 管理任务"
    
    # 检查所有命名空间的 PDB 健康状态
    local overall_health=0
    for namespace in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
        if kubectl get pdb -n $namespace &>/dev/null; then
            if ! check_pdb_health $namespace; then
                overall_health=1
            fi
        fi
    done
    
    # 在维护窗口内进行自动调整
    if check_maintenance_window; then
        log "当前在维护窗口内，执行自动调整检查"
        
        for namespace in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
            for pdb in $(kubectl get pdb -n $namespace -o jsonpath='{.items[*].metadata.name}' 2>/dev/null); do
                auto_adjust_pdb $namespace $pdb
            done
        done
    fi
    
    # 生成每日报告（每天上午 8 点）
    if [[ $(date +%H) == "08" ]]; then
        generate_pdb_report
    fi
    
    if [[ $overall_health -eq 0 ]]; then
        log "所有 PDB 状态正常"
    else
        log "发现 PDB 健康问题，请检查相关告警"
        exit 1
    fi
    
    log "PDB 管理任务完成"
}

# 执行主函数
main "$@"
```

## 总结

PodDisruptionBudget 是 Kubernetes 中确保应用高可用性的重要工具，它在集群维护和应用更新期间提供了关键的可用性保障。

**关键要点**：
- PDB 只对自愿中断生效，不能防止硬件故障等非自愿中断
- 通过 minAvailable 或 maxUnavailable 控制维护期间的 Pod 可用性
- 需要与应用的副本数量和业务重要性相匹配
- 应该结合监控告警来确保 PDB 策略的有效性
- 在微服务架构中，不同服务应该根据其重要性设置不同的 PDB 策略
- 定期审查和调整 PDB 配置以适应业务变化和扩容需求