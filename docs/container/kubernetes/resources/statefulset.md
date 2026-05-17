# StatefulSet

## 概述

StatefulSet 是 Kubernetes 中用于管理有状态应用的工作负载控制器。与 Deployment 不同，StatefulSet 为每个 Pod 提供稳定的网络标识、持久化存储和有序的部署、扩缩容、删除操作。

| 关键点 | 内容 |
| ---- | ---- |
| 核心作用 | 管理有状态应用，提供稳定的标识和存储 |
| Pod 命名 | 有序命名（如 web-0, web-1, web-2） |
| 网络标识 | 稳定的 DNS 名称和主机名 |
| 存储 | 每个 Pod 独立的持久化存储 |
| 使用场景 | 数据库、消息队列、分布式存储系统 |

## StatefulSet 的本质

### 设计理念

* **稳定的网络标识**：每个 Pod 都有稳定的网络标识符
* **稳定的存储**：每个 Pod 都有独立的持久化存储
* **有序部署**：Pod 按顺序创建、更新和删除
* **唯一性保证**：确保在任何时候只有一个具有给定标识的 Pod

### 工作原理

```
StatefulSet 创建
    ↓
按顺序创建 Pod (web-0 → web-1 → web-2)
    ↓
为每个 Pod 分配稳定的 DNS 名称
    ↓
为每个 Pod 创建独立的 PVC
    ↓
应用可以通过稳定标识进行通信
```

### 与 Deployment 的对比

| 特性 | StatefulSet | Deployment |
| ---- | ---- | ---- |
| Pod 命名 | 有序命名（web-0, web-1） | 随机命名（web-abc123） |
| 网络标识 | 稳定的 DNS 名称 | 不稳定 |
| 存储 | 每个 Pod 独立 PVC | 共享存储或无状态 |
| 部署顺序 | 有序部署 | 并行部署 |
| 扩缩容 | 有序扩缩容 | 并行扩缩容 |
| 更新策略 | 滚动更新或分区更新 | 滚动更新 |
| 适用场景 | 有状态应用 | 无状态应用 |

## 基本配置

### 1. 简单的 StatefulSet

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web
  namespace: default
spec:
  serviceName: "nginx"  # 必须指定 Headless Service
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.20
        ports:
        - containerPort: 80
          name: web
        volumeMounts:
        - name: www
          mountPath: /usr/share/nginx/html
  volumeClaimTemplates:
  - metadata:
      name: www
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: "standard"
      resources:
        requests:
          storage: 1Gi

---
# 必需的 Headless Service
apiVersion: v1
kind: Service
metadata:
  name: nginx
  labels:
    app: nginx
spec:
  ports:
  - port: 80
    name: web
  clusterIP: None  # Headless Service
  selector:
    app: nginx
```

### 2. 带有初始化容器的 StatefulSet

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
spec:
  serviceName: mysql
  replicas: 3
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      initContainers:
      # 初始化 MySQL 配置
      - name: init-mysql
        image: mysql:8.0
        command:
        - bash
        - "-c"
        - |
          set -ex
          # 根据 Pod 序号生成 server-id
          [[ `hostname` =~ -([0-9]+)$ ]] || exit 1
          ordinal=${BASH_REMATCH[1]}
          echo [mysqld] > /mnt/conf.d/server-id.cnf
          echo server-id=$((100 + $ordinal)) >> /mnt/conf.d/server-id.cnf
          # 复制适当的配置文件
          if [[ $ordinal -eq 0 ]]; then
            cp /mnt/config-map/master.cnf /mnt/conf.d/
          else
            cp /mnt/config-map/slave.cnf /mnt/conf.d/
          fi
        volumeMounts:
        - name: conf
          mountPath: /mnt/conf.d
        - name: config-map
          mountPath: /mnt/config-map
      
      # 克隆数据（从前一个 Pod）
      - name: clone-mysql
        image: gcr.io/google-samples/xtrabackup:1.0
        command:
        - bash
        - "-c"
        - |
          set -ex
          # 如果是第一个 Pod，跳过克隆
          [[ `hostname` =~ -([0-9]+)$ ]] || exit 1
          ordinal=${BASH_REMATCH[1]}
          [[ $ordinal -eq 0 ]] && exit 0
          # 从前一个 Pod 克隆数据
          ncat --recv-only mysql-$(($ordinal-1)).mysql 3307 | xbstream -x -C /var/lib/mysql
          xtrabackup --prepare --target-dir=/var/lib/mysql
        volumeMounts:
        - name: data
          mountPath: /var/lib/mysql
          subPath: mysql
        - name: conf
          mountPath: /etc/mysql/conf.d
      
      containers:
      - name: mysql
        image: mysql:8.0
        env:
        - name: MYSQL_ALLOW_EMPTY_PASSWORD
          value: "1"
        ports:
        - name: mysql
          containerPort: 3306
        volumeMounts:
        - name: data
          mountPath: /var/lib/mysql
          subPath: mysql
        - name: conf
          mountPath: /etc/mysql/conf.d
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
        livenessProbe:
          exec:
            command: ["mysqladmin", "ping"]
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
        readinessProbe:
          exec:
            command: ["mysql", "-h", "127.0.0.1", "-e", "SELECT 1"]
          initialDelaySeconds: 5
          periodSeconds: 2
          timeoutSeconds: 1
      
      # 数据备份 Sidecar
      - name: xtrabackup
        image: gcr.io/google-samples/xtrabackup:1.0
        ports:
        - name: xtrabackup
          containerPort: 3307
        command:
        - bash
        - "-c"
        - |
          set -ex
          cd /var/lib/mysql
          # 确定克隆数据的起始位置
          if [[ -f xtrabackup_slave_info && "x$(<xtrabackup_slave_info)" != "x" ]]; then
            cat xtrabackup_slave_info | sed -E 's/;$//g' > change_master_to.sql.in
            rm -f xtrabackup_slave_info xtrabackup_binlog_info
          elif [[ -f xtrabackup_binlog_info ]]; then
            [[ `cat xtrabackup_binlog_info` =~ ^(.*?)[[:space:]]+(.*?)$ ]] || exit 1
            rm -f xtrabackup_binlog_info xtrabackup_slave_info
            echo "CHANGE MASTER TO MASTER_LOG_FILE='${BASH_REMATCH[1]}',\
                  MASTER_LOG_POS=${BASH_REMATCH[2]}" > change_master_to.sql.in
          fi
          # 检查是否需要完成克隆
          if [[ -f change_master_to.sql.in ]]; then
            echo "Waiting for mysqld to be ready (accepting connections)"
            until mysql -h 127.0.0.1 -e "SELECT 1"; do sleep 1; done
            echo "Initializing replication from clone position"
            mysql -h 127.0.0.1 \
                  -e "$(<change_master_to.sql.in), \
                          MASTER_HOST='mysql-0.mysql', \
                          MASTER_USER='root', \
                          MASTER_PASSWORD='', \
                          MASTER_CONNECT_RETRY=10; \
                        START SLAVE;" || exit 1
            mv change_master_to.sql.in change_master_to.sql.orig
          fi
          # 启动备份服务器
          exec ncat --listen --keep-open --send-only --max-conns=1 3307 -c \
            "xtrabackup --backup --slave-info --stream=xbstream --host=127.0.0.1 --user=root"
        volumeMounts:
        - name: data
          mountPath: /var/lib/mysql
          subPath: mysql
        - name: conf
          mountPath: /etc/mysql/conf.d
        resources:
          requests:
            cpu: 100m
            memory: 100Mi
      
      volumes:
      - name: conf
        emptyDir: {}
      - name: config-map
        configMap:
          name: mysql
  
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: "fast-ssd"
      resources:
        requests:
          storage: 10Gi
```

### 3. 配置 ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql
  labels:
    app: mysql
data:
  master.cnf: |
    # 主节点配置
    [mysqld]
    log-bin=mysql-bin
    binlog-format=ROW
    gtid-mode=ON
    enforce-gtid-consistency=ON
    log-slave-updates=ON
    read-only=OFF
  
  slave.cnf: |
    # 从节点配置
    [mysqld]
    super-read-only=ON
    log-bin=mysql-bin
    binlog-format=ROW
    gtid-mode=ON
    enforce-gtid-consistency=ON
    log-slave-updates=ON
    read-only=ON
    skip-slave-start
```

## 更新策略

### 1. 滚动更新（RollingUpdate）

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web
spec:
  serviceName: "nginx"
  replicas: 3
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      # 分区更新：只更新序号 >= partition 的 Pod
      partition: 0  # 默认值，更新所有 Pod
      # 最大不可用 Pod 数量（Kubernetes 1.24+）
      maxUnavailable: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.21  # 更新镜像版本
        ports:
        - containerPort: 80
```

### 2. 分区更新策略

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web
spec:
  serviceName: "nginx"
  replicas: 5
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      partition: 3  # 只更新 web-3 和 web-4
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80
```

### 3. OnDelete 更新策略

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web
spec:
  serviceName: "nginx"
  replicas: 3
  updateStrategy:
    type: OnDelete  # 手动删除 Pod 才会更新
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80
```

## 持久化存储

### 1. 动态存储供应

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      containers:
      - name: postgres
        image: postgres:13
        env:
        - name: POSTGRES_DB
          value: mydb
        - name: POSTGRES_USER
          value: user
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
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
  
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: "fast-ssd"
      resources:
        requests:
          storage: 20Gi

---
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
type: Opaque
data:
  password: cGFzc3dvcmQxMjM=  # password123
```

### 2. 多存储卷配置

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
spec:
  serviceName: elasticsearch
  replicas: 3
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      containers:
      - name: elasticsearch
        image: elasticsearch:7.15.0
        env:
        - name: cluster.name
          value: "elasticsearch-cluster"
        - name: node.name
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: discovery.seed_hosts
          value: "elasticsearch-0.elasticsearch,elasticsearch-1.elasticsearch,elasticsearch-2.elasticsearch"
        - name: cluster.initial_master_nodes
          value: "elasticsearch-0,elasticsearch-1,elasticsearch-2"
        - name: ES_JAVA_OPTS
          value: "-Xms1g -Xmx1g"
        ports:
        - containerPort: 9200
          name: http
        - containerPort: 9300
          name: transport
        volumeMounts:
        - name: data
          mountPath: /usr/share/elasticsearch/data
        - name: logs
          mountPath: /usr/share/elasticsearch/logs
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
  
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: "fast-ssd"
      resources:
        requests:
          storage: 50Gi
  - metadata:
      name: logs
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: "standard"
      resources:
        requests:
          storage: 10Gi
```

## 服务发现和网络

### 1. Headless Service 配置

```yaml
# Headless Service（必需）
apiVersion: v1
kind: Service
metadata:
  name: cassandra
  labels:
    app: cassandra
spec:
  ports:
  - port: 9042
    name: cql
  - port: 7000
    name: intra-node
  - port: 7001
    name: tls-intra-node
  - port: 7199
    name: jmx
  clusterIP: None  # Headless Service
  selector:
    app: cassandra

---
# 可选：普通 Service 用于外部访问
apiVersion: v1
kind: Service
metadata:
  name: cassandra-client
  labels:
    app: cassandra
spec:
  type: ClusterIP
  ports:
  - port: 9042
    targetPort: 9042
    name: cql
  selector:
    app: cassandra
```

### 2. DNS 解析示例

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: cassandra
spec:
  serviceName: cassandra
  replicas: 3
  selector:
    matchLabels:
      app: cassandra
  template:
    metadata:
      labels:
        app: cassandra
    spec:
      containers:
      - name: cassandra
        image: cassandra:3.11
        env:
        - name: CASSANDRA_SEEDS
          # 使用稳定的 DNS 名称
          value: "cassandra-0.cassandra.default.svc.cluster.local,cassandra-1.cassandra.default.svc.cluster.local"
        - name: CASSANDRA_CLUSTER_NAME
          value: "Cassandra"
        - name: CASSANDRA_DC
          value: "DC1"
        - name: CASSANDRA_RACK
          value: "Rack1"
        - name: POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        ports:
        - containerPort: 7000
          name: intra-node
        - containerPort: 7001
          name: tls-intra-node
        - containerPort: 7199
          name: jmx
        - containerPort: 9042
          name: cql
        volumeMounts:
        - name: cassandra-data
          mountPath: /var/lib/cassandra
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi
  
  volumeClaimTemplates:
  - metadata:
      name: cassandra-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: "fast-ssd"
      resources:
        requests:
          storage: 50Gi
```

## 扩缩容操作

### 1. 手动扩缩容

```bash
# 扩容到 5 个副本
kubectl scale statefulset web --replicas=5

# 缩容到 2 个副本
kubectl scale statefulset web --replicas=2

# 查看扩缩容状态
kubectl get statefulset web -w
```

### 2. 自动扩缩容（HPA）

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: web
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
```

## 实际应用场景

### 1. Redis 集群

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  serviceName: redis
  replicas: 6  # 3 主 + 3 从
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      initContainers:
      - name: config
        image: redis:6.2-alpine
        command:
        - sh
        - -c
        - |
          set -ex
          [[ `hostname` =~ -([0-9]+)$ ]] || exit 1
          ordinal=${BASH_REMATCH[1]}
          
          # 生成 Redis 配置
          if [[ $ordinal -lt 3 ]]; then
            # 主节点配置
            cat > /etc/redis/redis.conf <<EOF
          port 6379
          cluster-enabled yes
          cluster-config-file nodes.conf
          cluster-node-timeout 5000
          appendonly yes
          dir /data
          EOF
          else
            # 从节点配置
            master_ordinal=$(($ordinal - 3))
            cat > /etc/redis/redis.conf <<EOF
          port 6379
          cluster-enabled yes
          cluster-config-file nodes.conf
          cluster-node-timeout 5000
          appendonly yes
          dir /data
          slaveof redis-${master_ordinal}.redis 6379
          EOF
          fi
        volumeMounts:
        - name: config
          mountPath: /etc/redis
      
      containers:
      - name: redis
        image: redis:6.2-alpine
        command:
        - redis-server
        - /etc/redis/redis.conf
        ports:
        - containerPort: 6379
          name: client
        - containerPort: 16379
          name: gossip
        volumeMounts:
        - name: data
          mountPath: /data
        - name: config
          mountPath: /etc/redis
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
      
      volumes:
      - name: config
        emptyDir: {}
  
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: "fast-ssd"
      resources:
        requests:
          storage: 5Gi

---
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  ports:
  - port: 6379
    targetPort: 6379
    name: client
  - port: 16379
    targetPort: 16379
    name: gossip
  clusterIP: None
  selector:
    app: redis
```

### 2. MongoDB 副本集

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
spec:
  serviceName: mongodb
  replicas: 3
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      initContainers:
      - name: install
        image: busybox:1.35
        command:
        - sh
        - -c
        - |
          set -ex
          # 安装 MongoDB 工具
          wget -qO- https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2004-x86_64-100.5.1.tgz | tar xz
          cp mongodb-database-tools-*/bin/* /shared/
        volumeMounts:
        - name: shared
          mountPath: /shared
      
      containers:
      - name: mongodb
        image: mongo:5.0
        command:
        - mongod
        - --replSet=rs0
        - --bind_ip_all
        - --dbpath=/data/db
        env:
        - name: MONGO_INITDB_ROOT_USERNAME
          value: admin
        - name: MONGO_INITDB_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: password
        ports:
        - containerPort: 27017
        volumeMounts:
        - name: data
          mountPath: /data/db
        - name: shared
          mountPath: /shared
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi
        livenessProbe:
          exec:
            command:
            - mongo
            - --eval
            - "db.adminCommand('ping')"
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - mongo
            - --eval
            - "db.adminCommand('ping')"
          initialDelaySeconds: 5
          periodSeconds: 5
      
      # Sidecar 容器用于初始化副本集
      - name: mongo-sidecar
        image: mongo:5.0
        command:
        - sh
        - -c
        - |
          set -ex
          # 等待 MongoDB 启动
          until mongo --host mongodb-0.mongodb --eval "print('MongoDB is ready')"; do
            echo "Waiting for MongoDB..."
            sleep 2
          done
          
          # 初始化副本集（只在第一个 Pod 上执行）
          if [[ "$(hostname)" == "mongodb-0" ]]; then
            mongo --host mongodb-0.mongodb --eval '
              rs.initiate({
                _id: "rs0",
                members: [
                  {_id: 0, host: "mongodb-0.mongodb:27017"},
                  {_id: 1, host: "mongodb-1.mongodb:27017"},
                  {_id: 2, host: "mongodb-2.mongodb:27017"}
                ]
              })
            '
          fi
          
          # 保持容器运行
          tail -f /dev/null
        volumeMounts:
        - name: shared
          mountPath: /shared
      
      volumes:
      - name: shared
        emptyDir: {}
  
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: "fast-ssd"
      resources:
        requests:
          storage: 20Gi

---
apiVersion: v1
kind: Service
metadata:
  name: mongodb
spec:
  ports:
  - port: 27017
    targetPort: 27017
  clusterIP: None
  selector:
    app: mongodb

---
apiVersion: v1
kind: Secret
metadata:
  name: mongodb-secret
type: Opaque
data:
  password: bW9uZ29wYXNzd29yZA==  # mongopassword
```

## 命令行操作

### 基本操作

```bash
# 创建 StatefulSet
kubectl apply -f statefulset.yaml

# 查看 StatefulSet
kubectl get statefulset
kubectl get sts  # 简写

# 查看特定 StatefulSet
kubectl get sts web -o wide
kubectl describe sts web

# 查看 StatefulSet 的 Pod
kubectl get pods -l app=web

# 查看 PVC
kubectl get pvc
```

### 扩缩容操作

```bash
# 扩容
kubectl scale sts web --replicas=5

# 查看扩容进度
kubectl get sts web -w
kubectl get pods -l app=web -w

# 缩容
kubectl scale sts web --replicas=2
```

### 更新操作

```bash
# 更新镜像
kubectl patch sts web -p '{"spec":{"template":{"spec":{"containers":[{"name":"nginx","image":"nginx:1.21"}]}}}}'

# 查看更新状态
kubectl rollout status sts web

# 查看更新历史
kubectl rollout history sts web

# 回滚到上一个版本
kubectl rollout undo sts web

# 暂停更新
kubectl rollout pause sts web

# 恢复更新
kubectl rollout resume sts web
```

### 调试操作

```bash
# 查看 Pod 日志
kubectl logs web-0
kubectl logs web-0 -f  # 跟踪日志

# 进入 Pod
kubectl exec -it web-0 -- /bin/bash

# 查看 Pod 详细信息
kubectl describe pod web-0

# 查看事件
kubectl get events --sort-by=.metadata.creationTimestamp

# 删除特定 Pod（会自动重建）
kubectl delete pod web-0

# 强制删除 Pod
kubectl delete pod web-0 --force --grace-period=0
```

## 故障排查

### 常见问题

| 问题 | 可能原因 | 解决方案 |
| ---- | ---- | ---- |
| Pod 无法启动 | PVC 创建失败 | 检查 StorageClass 和存储资源 |
| Pod 卡在 Pending | 资源不足 | 检查节点资源和调度策略 |
| 更新卡住 | Pod 无法正常终止 | 检查应用的优雅关闭逻辑 |
| 数据丢失 | PVC 被误删 | 检查 PV 回收策略 |
| 网络连接失败 | Service 配置错误 | 检查 Headless Service 配置 |

### 诊断步骤

1. **检查 StatefulSet 状态**
```bash
kubectl get sts web -o yaml
kubectl describe sts web
```

2. **检查 Pod 状态**
```bash
kubectl get pods -l app=web
kubectl describe pod web-0
```

3. **检查存储**
```bash
kubectl get pvc
kubectl get pv
kubectl describe pvc www-web-0
```

4. **检查网络**
```bash
kubectl get svc
kubectl describe svc nginx
```

5. **检查事件**
```bash
kubectl get events --field-selector involvedObject.name=web-0
```

## 最佳实践

### 1. 资源配置

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: production-app
spec:
  serviceName: production-app
  replicas: 3
  selector:
    matchLabels:
      app: production-app
  template:
    metadata:
      labels:
        app: production-app
    spec:
      # 反亲和性确保 Pod 分布在不同节点
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - production-app
            topologyKey: kubernetes.io/hostname
      
      containers:
      - name: app
        image: myapp:v1.0.0
        ports:
        - containerPort: 8080
        
        # 资源限制
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi
        
        # 健康检查
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        
        # 优雅关闭
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
        
        volumeMounts:
        - name: data
          mountPath: /data
  
  # 更新策略
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      partition: 0
  
  # Pod 管理策略
  podManagementPolicy: OrderedReady
  
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: "fast-ssd"
      resources:
        requests:
          storage: 10Gi
```

### 2. 安全配置

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: secure-app
spec:
  serviceName: secure-app
  replicas: 3
  selector:
    matchLabels:
      app: secure-app
  template:
    metadata:
      labels:
        app: secure-app
    spec:
      serviceAccountName: secure-app-sa
      
      # 安全上下文
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
      
      containers:
      - name: app
        image: myapp:v1.0.0
        
        # 容器安全上下文
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        
        ports:
        - containerPort: 8080
        
        volumeMounts:
        - name: data
          mountPath: /data
        - name: tmp
          mountPath: /tmp
        - name: var-run
          mountPath: /var/run
      
      volumes:
      - name: tmp
        emptyDir: {}
      - name: var-run
        emptyDir: {}
  
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: "encrypted-ssd"
      resources:
        requests:
          storage: 10Gi
```

### 3. 监控配置

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: monitored-app
  labels:
    app: monitored-app
spec:
  serviceName: monitored-app
  replicas: 3
  selector:
    matchLabels:
      app: monitored-app
  template:
    metadata:
      labels:
        app: monitored-app
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: app
        image: myapp:v1.0.0
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        
        # 环境变量
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        
        volumeMounts:
        - name: data
          mountPath: /data
  
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: "fast-ssd"
      resources:
        requests:
          storage: 10Gi
```

## 总结

StatefulSet 是 Kubernetes 中管理有状态应用的核心控制器，它提供了稳定的网络标识、持久化存储和有序的生命周期管理。通过合理配置 StatefulSet，可以在 Kubernetes 中成功运行数据库、消息队列、分布式存储等有状态应用。

**关键要点**：
- StatefulSet 为每个 Pod 提供稳定的标识和存储
- 必须配合 Headless Service 使用
- 支持有序的部署、扩缩容和更新
- 适合需要稳定网络标识和持久化存储的应用
- 需要仔细设计存储、网络和更新策略