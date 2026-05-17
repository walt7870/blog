# Vertical Pod Autoscaler (VPA)

## 概述

Vertical Pod Autoscaler (VPA) 是 Kubernetes 中用于自动调整 Pod 资源请求和限制的组件。与 HPA 水平扩展不同，VPA 通过垂直扩展（增加或减少单个 Pod 的 CPU 和内存资源）来优化资源利用率和应用性能。

| 关键点 | 内容 |
| ---- | ---- |
| 核心作用 | 自动调整 Pod 的 CPU 和内存资源 |
| 扩展方式 | 垂直扩展（调整资源大小） |
| 工作模式 | Off、Initial、Auto、Recreate |
| 资源类型 | CPU、内存 |
| 适用场景 | 资源需求变化的单体应用 |

## VPA 的本质

### 设计理念

* **资源优化**：根据实际使用情况自动调整资源配置
* **成本控制**：避免资源过度分配和浪费
* **性能保障**：确保应用有足够的资源运行
* **运维简化**：减少手动调整资源配置的工作量

### 工作原理

```
监控指标 → 分析使用模式 → 计算推荐值 → 应用资源调整 → 重启 Pod
    ↓           ↓            ↓           ↓           ↓
  CPU/内存    历史数据分析   资源推荐    更新配置    生效变更
```

### VPA 组件架构

| 组件 | 功能 | 描述 |
| ---- | ---- | ---- |
| VPA Recommender | 资源推荐 | 分析历史数据，生成资源推荐值 |
| VPA Updater | 资源更新 | 根据推荐值更新 Pod 资源配置 |
| VPA Admission Controller | 准入控制 | 在 Pod 创建时应用推荐的资源配置 |

### VPA vs HPA

| 特性 | VPA | HPA |
| ---- | ---- | ---- |
| 扩展方式 | 垂直扩展（调整资源） | 水平扩展（增加副本） |
| 适用场景 | 单体应用、有状态应用 | 无状态应用、微服务 |
| 资源类型 | CPU、内存 | CPU、内存、自定义指标 |
| Pod 重启 | 需要重启 | 不需要重启 |
| 配置复杂度 | 相对简单 | 相对复杂 |

## 基本配置

### 1. 简单的 VPA 配置

```yaml
# 基础 VPA 配置
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: web-app-vpa
  namespace: production
  labels:
    app: web-app
    component: autoscaling
spec:
  # 目标工作负载
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  
  # VPA 更新策略
  updatePolicy:
    updateMode: "Auto"  # 自动更新模式
  
  # 资源策略
  resourcePolicy:
    containerPolicies:
    - containerName: web
      # 最小资源限制
      minAllowed:
        cpu: 100m
        memory: 128Mi
      # 最大资源限制
      maxAllowed:
        cpu: 2000m
        memory: 2Gi
      # 控制的资源类型
      controlledResources: ["cpu", "memory"]
      # 控制的值类型
      controlledValues: RequestsAndLimits

---
# 对应的 Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web
        image: nginx:1.20
        ports:
        - containerPort: 80
        # 初始资源配置（VPA 会自动调整）
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
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
```

### 2. 仅推荐模式的 VPA

```yaml
# 仅推荐模式 - 不自动更新
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-service-vpa
  namespace: production
  labels:
    app: api-service
    vpa-mode: recommendation-only
  annotations:
    description: "API 服务的资源推荐分析"
    team: "backend-team"
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  
  # 仅推荐模式，不自动更新
  updatePolicy:
    updateMode: "Off"
  
  resourcePolicy:
    containerPolicies:
    - containerName: api
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 4000m
        memory: 4Gi
      controlledResources: ["cpu", "memory"]
      # 仅控制 requests，不控制 limits
      controlledValues: RequestsOnly

---
# 对应的 Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
    spec:
      containers:
      - name: api
        image: api-service:v1.2.0
        ports:
        - containerPort: 8080
        env:
        - name: DB_HOST
          value: "postgres.database.svc.cluster.local"
        - name: CACHE_SIZE
          value: "256MB"
        resources:
          requests:
            cpu: 300m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
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
```

### 3. 初始化模式的 VPA

```yaml
# 初始化模式 - 仅在 Pod 创建时设置资源
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: batch-job-vpa
  namespace: data-processing
  labels:
    app: batch-job
    vpa-mode: initial-only
spec:
  targetRef:
    apiVersion: batch/v1
    kind: Job
    name: data-processing-job
  
  # 初始化模式
  updatePolicy:
    updateMode: "Initial"
  
  resourcePolicy:
    containerPolicies:
    - containerName: processor
      minAllowed:
        cpu: 500m
        memory: 1Gi
      maxAllowed:
        cpu: 8000m
        memory: 16Gi
      controlledResources: ["cpu", "memory"]
      controlledValues: RequestsAndLimits

---
# 对应的 Job
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processing-job
  namespace: data-processing
spec:
  template:
    metadata:
      labels:
        app: batch-job
    spec:
      restartPolicy: Never
      containers:
      - name: processor
        image: data-processor:v2.0.0
        env:
        - name: INPUT_PATH
          value: "/data/input"
        - name: OUTPUT_PATH
          value: "/data/output"
        - name: BATCH_SIZE
          value: "1000"
        # VPA 会在 Pod 创建时设置合适的资源
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        volumeMounts:
        - name: data-volume
          mountPath: /data
      volumes:
      - name: data-volume
        persistentVolumeClaim:
          claimName: data-processing-pvc
```

## 高级配置

### 1. 多容器 Pod 的 VPA

```yaml
# 多容器应用的 VPA 配置
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: multi-container-vpa
  namespace: production
  labels:
    app: multi-container-app
    complexity: high
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: multi-container-app
  
  updatePolicy:
    updateMode: "Auto"
    # 最小副本数，避免所有 Pod 同时重启
    minReplicas: 2
  
  resourcePolicy:
    containerPolicies:
    # 主应用容器
    - containerName: app
      minAllowed:
        cpu: 200m
        memory: 256Mi
      maxAllowed:
        cpu: 2000m
        memory: 4Gi
      controlledResources: ["cpu", "memory"]
      controlledValues: RequestsAndLimits
    
    # Sidecar 容器 - 日志收集
    - containerName: log-collector
      minAllowed:
        cpu: 50m
        memory: 64Mi
      maxAllowed:
        cpu: 200m
        memory: 256Mi
      controlledResources: ["cpu", "memory"]
      controlledValues: RequestsOnly
    
    # Sidecar 容器 - 监控代理
    - containerName: monitoring-agent
      minAllowed:
        cpu: 50m
        memory: 64Mi
      maxAllowed:
        cpu: 300m
        memory: 512Mi
      controlledResources: ["cpu", "memory"]
      controlledValues: RequestsAndLimits
    
    # Init 容器 - 不受 VPA 控制
    - containerName: init-db
      mode: "Off"

---
# 对应的多容器 Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: multi-container-app
  namespace: production
spec:
  replicas: 4
  selector:
    matchLabels:
      app: multi-container-app
  template:
    metadata:
      labels:
        app: multi-container-app
    spec:
      initContainers:
      - name: init-db
        image: postgres:13
        command: ['sh', '-c', 'until pg_isready -h db; do sleep 1; done']
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
      
      containers:
      # 主应用容器
      - name: app
        image: web-app:v1.5.0
        ports:
        - containerPort: 8080
        env:
        - name: LOG_LEVEL
          value: "INFO"
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi
        volumeMounts:
        - name: app-logs
          mountPath: /var/log/app
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
      
      # 日志收集 Sidecar
      - name: log-collector
        image: fluentd:v1.14
        env:
        - name: FLUENTD_CONF
          value: "fluent.conf"
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
        volumeMounts:
        - name: app-logs
          mountPath: /var/log/app
          readOnly: true
        - name: fluentd-config
          mountPath: /fluentd/etc
      
      # 监控代理 Sidecar
      - name: monitoring-agent
        image: prometheus/node-exporter:v1.3.0
        ports:
        - containerPort: 9100
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
      
      volumes:
      - name: app-logs
        emptyDir: {}
      - name: fluentd-config
        configMap:
          name: fluentd-config
```

### 2. StatefulSet 的 VPA 配置

```yaml
# StatefulSet 的 VPA 配置
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: database-vpa
  namespace: database
  labels:
    app: postgres
    type: stateful
  annotations:
    description: "PostgreSQL 数据库的资源自动调整"
    warning: "StatefulSet VPA 需要谨慎使用，可能影响数据一致性"
spec:
  targetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: postgres-cluster
  
  # 使用 Recreate 模式，确保有序重启
  updatePolicy:
    updateMode: "Recreate"
  
  resourcePolicy:
    containerPolicies:
    - containerName: postgres
      minAllowed:
        cpu: 500m
        memory: 1Gi
      maxAllowed:
        cpu: 4000m
        memory: 8Gi
      controlledResources: ["cpu", "memory"]
      controlledValues: RequestsAndLimits
      
      # 资源推荐的历史长度
      historyLength: 168h  # 7 天
      
      # CPU 推荐的百分位数
      cpuHistogramBucketWeights:
        "0.5": 1.0
        "0.95": 2.0
        "0.99": 1.0
      
      # 内存推荐的百分位数
      memoryHistogramBucketWeights:
        "0.5": 1.0
        "0.95": 2.0
        "0.99": 1.0

---
# 对应的 StatefulSet
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-cluster
  namespace: database
spec:
  serviceName: postgres-headless
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
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
              name: postgres-credentials
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: password
        - name: PGDATA
          value: "/var/lib/postgresql/data/pgdata"
        ports:
        - containerPort: 5432
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
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
```

### 3. 自定义资源推荐策略

```yaml
# 高级 VPA 配置 - 自定义推荐策略
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: ml-training-vpa
  namespace: machine-learning
  labels:
    app: ml-training
    workload-type: compute-intensive
  annotations:
    description: "机器学习训练任务的智能资源调整"
    optimization-target: "performance"
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ml-training-job
  
  updatePolicy:
    updateMode: "Auto"
    # 更新时的最小副本数
    minReplicas: 1
    # 最大不可用副本数
    maxUnavailable: 1
  
  resourcePolicy:
    containerPolicies:
    - containerName: trainer
      minAllowed:
        cpu: 2000m
        memory: 4Gi
      maxAllowed:
        cpu: 16000m
        memory: 32Gi
      controlledResources: ["cpu", "memory"]
      controlledValues: RequestsAndLimits
      
      # 扩展的历史数据长度（7 天）
      historyLength: 168h
      
      # CPU 推荐策略 - 偏向高性能
      cpuHistogramBucketWeights:
        "0.5": 0.5   # 50% 百分位权重较低
        "0.9": 2.0   # 90% 百分位权重较高
        "0.95": 3.0  # 95% 百分位权重最高
        "0.99": 1.0  # 99% 百分位适中权重
      
      # 内存推荐策略 - 保守策略
      memoryHistogramBucketWeights:
        "0.5": 1.0
        "0.9": 1.5
        "0.95": 2.0
        "0.99": 2.5  # 内存更保守，避免 OOM
      
      # 资源推荐的安全边际
      safetyMarginFraction: 0.15  # 15% 的安全边际
      
      # 最小变更阈值
      minChangeThreshold:
        cpu: 0.1     # CPU 变更至少 10%
        memory: 0.2  # 内存变更至少 20%

---
# 对应的机器学习训练 Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-training-job
  namespace: machine-learning
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ml-training
  template:
    metadata:
      labels:
        app: ml-training
    spec:
      containers:
      - name: trainer
        image: tensorflow/tensorflow:2.8.0-gpu
        command:
        - python
        - /app/train.py
        env:
        - name: CUDA_VISIBLE_DEVICES
          value: "0"
        - name: TF_CPP_MIN_LOG_LEVEL
          value: "2"
        - name: BATCH_SIZE
          value: "32"
        - name: EPOCHS
          value: "100"
        resources:
          requests:
            cpu: 4000m
            memory: 8Gi
            nvidia.com/gpu: 1
          limits:
            cpu: 8000m
            memory: 16Gi
            nvidia.com/gpu: 1
        volumeMounts:
        - name: model-data
          mountPath: /data
        - name: model-output
          mountPath: /output
        - name: shared-memory
          mountPath: /dev/shm
      
      volumes:
      - name: model-data
        persistentVolumeClaim:
          claimName: ml-data-pvc
      - name: model-output
        persistentVolumeClaim:
          claimName: ml-output-pvc
      - name: shared-memory
        emptyDir:
          medium: Memory
          sizeLimit: 2Gi
      
      # GPU 节点选择
      nodeSelector:
        accelerator: nvidia-tesla-v100
      
      tolerations:
      - key: nvidia.com/gpu
        operator: Exists
        effect: NoSchedule
```

## 实际应用场景

### 1. Web 应用的资源优化

```yaml
# 电商网站的 VPA 策略
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: ecommerce-frontend-vpa
  namespace: ecommerce
  labels:
    app: frontend
    tier: web
    optimization: cost-performance
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ecommerce-frontend
  
  updatePolicy:
    updateMode: "Auto"
  
  resourcePolicy:
    containerPolicies:
    - containerName: frontend
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 1000m
        memory: 1Gi
      controlledResources: ["cpu", "memory"]
      controlledValues: RequestsAndLimits

---
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: ecommerce-api-vpa
  namespace: ecommerce
  labels:
    app: api
    tier: backend
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ecommerce-api
  
  updatePolicy:
    updateMode: "Auto"
  
  resourcePolicy:
    containerPolicies:
    - containerName: api
      minAllowed:
        cpu: 200m
        memory: 256Mi
      maxAllowed:
        cpu: 2000m
        memory: 4Gi
      controlledResources: ["cpu", "memory"]
      controlledValues: RequestsAndLimits

---
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: ecommerce-cache-vpa
  namespace: ecommerce
  labels:
    app: redis
    tier: cache
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: redis-cache
  
  updatePolicy:
    updateMode: "Initial"  # 缓存服务使用初始化模式
  
  resourcePolicy:
    containerPolicies:
    - containerName: redis
      minAllowed:
        cpu: 100m
        memory: 512Mi
      maxAllowed:
        cpu: 1000m
        memory: 4Gi
      controlledResources: ["memory"]  # 只控制内存
      controlledValues: RequestsAndLimits
```

### 2. 数据处理管道的 VPA

```yaml
# 数据摄取服务
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: data-ingestion-vpa
  namespace: data-pipeline
  labels:
    component: ingestion
    data-flow: realtime
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: kafka-consumer
  
  updatePolicy:
    updateMode: "Auto"
  
  resourcePolicy:
    containerPolicies:
    - containerName: consumer
      minAllowed:
        cpu: 200m
        memory: 512Mi
      maxAllowed:
        cpu: 4000m
        memory: 8Gi
      controlledResources: ["cpu", "memory"]
      controlledValues: RequestsAndLimits

---
# 数据转换服务
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: data-transformation-vpa
  namespace: data-pipeline
  labels:
    component: transformation
    processing-type: stream
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: stream-processor
  
  updatePolicy:
    updateMode: "Auto"
  
  resourcePolicy:
    containerPolicies:
    - containerName: processor
      minAllowed:
        cpu: 500m
        memory: 1Gi
      maxAllowed:
        cpu: 8000m
        memory: 16Gi
      controlledResources: ["cpu", "memory"]
      controlledValues: RequestsAndLimits
      
      # 处理任务的特殊配置
      historyLength: 72h  # 3 天历史
      cpuHistogramBucketWeights:
        "0.5": 1.0
        "0.9": 2.0
        "0.95": 1.5

---
# 数据存储服务
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: data-storage-vpa
  namespace: data-pipeline
  labels:
    component: storage
    storage-type: timeseries
spec:
  targetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: influxdb-cluster
  
  updatePolicy:
    updateMode: "Recreate"  # StatefulSet 使用 Recreate 模式
  
  resourcePolicy:
    containerPolicies:
    - containerName: influxdb
      minAllowed:
        cpu: 1000m
        memory: 2Gi
      maxAllowed:
        cpu: 6000m
        memory: 12Gi
      controlledResources: ["cpu", "memory"]
      controlledValues: RequestsAndLimits
```

### 3. 微服务架构的 VPA 管理

```yaml
# 用户服务 VPA
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: user-service-vpa
  namespace: microservices
  labels:
    service: user
    criticality: high
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service
  
  updatePolicy:
    updateMode: "Auto"
  
  resourcePolicy:
    containerPolicies:
    - containerName: user-service
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 1000m
        memory: 2Gi
      controlledResources: ["cpu", "memory"]
      controlledValues: RequestsAndLimits

---
# 订单服务 VPA
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: order-service-vpa
  namespace: microservices
  labels:
    service: order
    criticality: critical
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  
  updatePolicy:
    updateMode: "Auto"
  
  resourcePolicy:
    containerPolicies:
    - containerName: order-service
      minAllowed:
        cpu: 200m
        memory: 256Mi
      maxAllowed:
        cpu: 2000m
        memory: 4Gi
      controlledResources: ["cpu", "memory"]
      controlledValues: RequestsAndLimits

---
# 通知服务 VPA - 仅推荐模式
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: notification-service-vpa
  namespace: microservices
  labels:
    service: notification
    criticality: low
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: notification-service
  
  updatePolicy:
    updateMode: "Off"  # 低优先级服务仅提供推荐
  
  resourcePolicy:
    containerPolicies:
    - containerName: notification-service
      minAllowed:
        cpu: 50m
        memory: 64Mi
      maxAllowed:
        cpu: 500m
        memory: 512Mi
      controlledResources: ["cpu", "memory"]
      controlledValues: RequestsOnly
```

## 命令行操作

### 基本操作

```bash
# 查看 VPA 资源
kubectl get vpa
kubectl get verticalpodautoscaler  # 完整名称
kubectl get vpa -n production

# 查看详细信息
kubectl describe vpa web-app-vpa -n production
kubectl get vpa web-app-vpa -o yaml

# 查看所有命名空间的 VPA
kubectl get vpa --all-namespaces

# 查看 VPA 状态
kubectl get vpa -o wide
```

### VPA 推荐查看

```bash
# 查看 VPA 推荐值
kubectl describe vpa web-app-vpa -n production | grep -A 20 "Recommendation:"

# 获取 JSON 格式的推荐
kubectl get vpa web-app-vpa -n production -o jsonpath='{.status.recommendation}' | jq .

# 查看历史推荐
kubectl get vpa web-app-vpa -n production -o jsonpath='{.status.conditions}' | jq .

# 比较当前配置和推荐值
kubectl get vpa web-app-vpa -n production -o json | jq '{
  "current": .spec.resourcePolicy.containerPolicies[0],
  "recommendation": .status.recommendation.containerRecommendations[0]
}'
```

### VPA 管理操作

```bash
# 创建 VPA
kubectl apply -f vpa.yaml

# 更新 VPA 配置
kubectl apply -f updated-vpa.yaml

# 删除 VPA
kubectl delete vpa web-app-vpa -n production

# 暂停 VPA（设置为 Off 模式）
kubectl patch vpa web-app-vpa -n production --type='merge' -p='{
  "spec": {
    "updatePolicy": {
      "updateMode": "Off"
    }
  }
}'

# 恢复 VPA（设置为 Auto 模式）
kubectl patch vpa web-app-vpa -n production --type='merge' -p='{
  "spec": {
    "updatePolicy": {
      "updateMode": "Auto"
    }
  }
}'
```

### VPA 监控脚本

```bash
#!/bin/bash
# VPA 监控和分析脚本

NAMESPACE=${1:-default}
OUTPUT_FORMAT=${2:-table}

echo "=== VPA 状态监控 - $NAMESPACE ==="

# 检查 VPA 是否存在
if ! kubectl get vpa -n $NAMESPACE &>/dev/null; then
    echo "命名空间 $NAMESPACE 中没有 VPA 资源"
    exit 0
fi

# 获取所有 VPA
echo "1. VPA 列表:"
kubectl get vpa -n $NAMESPACE
echo

# VPA 详细状态
echo "2. VPA 详细状态:"
for vpa in $(kubectl get vpa -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}'); do
    echo "--- $vpa ---"
    
    # 获取基本信息
    target=$(kubectl get vpa $vpa -n $NAMESPACE -o jsonpath='{.spec.targetRef.name}')
    mode=$(kubectl get vpa $vpa -n $NAMESPACE -o jsonpath='{.spec.updatePolicy.updateMode}')
    
    echo "目标工作负载: $target"
    echo "更新模式: $mode"
    
    # 获取推荐值
    if kubectl get vpa $vpa -n $NAMESPACE -o jsonpath='{.status.recommendation}' | grep -q containerRecommendations; then
        echo "资源推荐:"
        kubectl get vpa $vpa -n $NAMESPACE -o json | jq -r '
            .status.recommendation.containerRecommendations[] |
            "  容器: " + .containerName +
            "\n    CPU 推荐: " + (.target.cpu // "N/A") +
            "\n    内存推荐: " + (.target.memory // "N/A") +
            "\n    CPU 下限: " + (.lowerBound.cpu // "N/A") +
            "\n    内存下限: " + (.lowerBound.memory // "N/A") +
            "\n    CPU 上限: " + (.upperBound.cpu // "N/A") +
            "\n    内存上限: " + (.upperBound.memory // "N/A")
        '
    else
        echo "  暂无推荐数据"
    fi
    
    # 获取当前 Pod 资源配置
    if [[ -n "$target" ]]; then
        echo "当前 Pod 资源配置:"
        kubectl get deployment $target -n $NAMESPACE -o json 2>/dev/null | jq -r '
            .spec.template.spec.containers[] |
            "  容器: " + .name +
            "\n    CPU 请求: " + (.resources.requests.cpu // "N/A") +
            "\n    内存请求: " + (.resources.requests.memory // "N/A") +
            "\n    CPU 限制: " + (.resources.limits.cpu // "N/A") +
            "\n    内存限制: " + (.resources.limits.memory // "N/A")
        ' || echo "  无法获取当前配置"
    fi
    
    echo
done

# VPA 推荐分析
echo "3. VPA 推荐分析:"
for vpa in $(kubectl get vpa -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}'); do
    echo "--- $vpa ---"
    
    # 检查是否有推荐数据
    if kubectl get vpa $vpa -n $NAMESPACE -o jsonpath='{.status.recommendation}' | grep -q containerRecommendations; then
        # 分析推荐与当前配置的差异
        target=$(kubectl get vpa $vpa -n $NAMESPACE -o jsonpath='{.spec.targetRef.name}')
        
        if [[ -n "$target" ]]; then
            echo "资源优化建议:"
            
            # 这里可以添加更复杂的分析逻辑
            # 比较当前配置和推荐值，计算优化潜力
            kubectl get vpa $vpa -n $NAMESPACE -o json | jq -r '
                .status.recommendation.containerRecommendations[] |
                "  " + .containerName + " 容器建议调整资源配置"
            '
        fi
    else
        echo "  等待收集足够的监控数据..."
    fi
    echo
done

# 生成 CSV 报告（如果需要）
if [[ "$OUTPUT_FORMAT" == "csv" ]]; then
    echo "4. 生成 CSV 报告:"
    csv_file="/tmp/vpa-report-$(date +%Y%m%d-%H%M%S).csv"
    
    echo "VPA名称,命名空间,目标工作负载,更新模式,容器名称,CPU推荐,内存推荐,CPU下限,内存下限,CPU上限,内存上限" > $csv_file
    
    for vpa in $(kubectl get vpa -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}'); do
        target=$(kubectl get vpa $vpa -n $NAMESPACE -o jsonpath='{.spec.targetRef.name}')
        mode=$(kubectl get vpa $vpa -n $NAMESPACE -o jsonpath='{.spec.updatePolicy.updateMode}')
        
        kubectl get vpa $vpa -n $NAMESPACE -o json | jq -r --arg vpa "$vpa" --arg ns "$NAMESPACE" --arg target "$target" --arg mode "$mode" '
            .status.recommendation.containerRecommendations[]? |
            [$vpa, $ns, $target, $mode, .containerName, (.target.cpu // "N/A"), (.target.memory // "N/A"), (.lowerBound.cpu // "N/A"), (.lowerBound.memory // "N/A"), (.upperBound.cpu // "N/A"), (.upperBound.memory // "N/A")] |
            @csv
        ' >> $csv_file
    done
    
    echo "CSV 报告已生成: $csv_file"
fi

echo "=== 监控完成 ==="
```

## 故障排查

### 常见问题

| 问题 | 可能原因 | 解决方案 |
| ---- | ---- | ---- |
| VPA 没有推荐值 | 监控数据不足或 metrics-server 问题 | 检查 metrics-server，等待足够的监控数据 |
| Pod 频繁重启 | VPA 更新过于频繁 | 调整 minChangeThreshold 或使用 Off 模式 |
| 资源推荐不合理 | 历史数据不足或配置错误 | 检查 historyLength 和权重配置 |
| VPA 与 HPA 冲突 | 同时使用 VPA 和 HPA | 避免同时使用，或使用不同的指标 |
| StatefulSet 更新失败 | 更新模式不当 | 使用 Recreate 模式或 Initial 模式 |

### 诊断步骤

1. **检查 VPA 组件状态**
```bash
# 检查 VPA 组件是否运行
kubectl get pods -n kube-system | grep vpa

# 检查 VPA Recommender 日志
kubectl logs -n kube-system deployment/vpa-recommender

# 检查 VPA Updater 日志
kubectl logs -n kube-system deployment/vpa-updater

# 检查 VPA Admission Controller 日志
kubectl logs -n kube-system deployment/vpa-admission-controller
```

2. **验证 metrics-server**
```bash
# 检查 metrics-server 状态
kubectl get pods -n kube-system | grep metrics-server

# 测试指标获取
kubectl top nodes
kubectl top pods -n production
```

3. **检查 VPA 配置**
```bash
# 验证 VPA 配置
kubectl describe vpa <name> -n <namespace>

# 检查目标工作负载是否存在
kubectl get deployment <target-name> -n <namespace>

# 验证选择器匹配
kubectl get pods -l <selector> -n <namespace>
```

4. **分析推荐算法**
```bash
# 查看推荐历史
kubectl get vpa <name> -o jsonpath='{.status.conditions}' | jq .

# 检查推荐值的合理性
kubectl describe vpa <name> | grep -A 20 "Recommendation:"
```

### 常见错误和解决方案

```yaml
# 错误1：VPA 和 HPA 冲突
# 问题：同时使用 VPA 和 HPA 控制同一个工作负载

# 解决方案1：使用不同的指标
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
spec:
  resourcePolicy:
    containerPolicies:
    - containerName: app
      controlledResources: ["memory"]  # VPA 只控制内存
      controlledValues: RequestsAndLimits

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  metrics:
  - type: Resource
    resource:
      name: cpu  # HPA 只使用 CPU 指标
      target:
        type: Utilization
        averageUtilization: 70

---
# 错误2：StatefulSet 更新模式错误
# 问题配置
spec:
  updatePolicy:
    updateMode: "Auto"  # StatefulSet 不适合 Auto 模式

# 正确配置
spec:
  updatePolicy:
    updateMode: "Recreate"  # 或者 "Initial"

---
# 错误3：资源限制过于严格
# 问题配置
spec:
  resourcePolicy:
    containerPolicies:
    - containerName: app
      minAllowed:
        cpu: 2000m
        memory: 4Gi
      maxAllowed:
        cpu: 2100m  # 范围过小
        memory: 4.5Gi

# 正确配置
spec:
  resourcePolicy:
    containerPolicies:
    - containerName: app
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 4000m  # 给予足够的调整空间
        memory: 8Gi
```

## 最佳实践

### 1. VPA 部署策略

```yaml
# 分阶段部署 VPA
# 阶段1：观察模式
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: app-vpa-phase1
  namespace: production
  labels:
    phase: observation
    deployment-stage: "1"
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: production-app
  
  # 第一阶段：仅观察，不自动更新
  updatePolicy:
    updateMode: "Off"
  
  resourcePolicy:
    containerPolicies:
    - containerName: app
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 2000m
        memory: 4Gi
      controlledResources: ["cpu", "memory"]
      controlledValues: RequestsAndLimits
      
      # 收集较长时间的历史数据
      historyLength: 336h  # 14 天

---
# 阶段2：初始化模式（新 Pod 应用推荐）
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: app-vpa-phase2
  namespace: production
  labels:
    phase: initial
    deployment-stage: "2"
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: production-app
  
  # 第二阶段：仅在新 Pod 创建时应用推荐
  updatePolicy:
    updateMode: "Initial"
  
  resourcePolicy:
    containerPolicies:
    - containerName: app
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 2000m
        memory: 4Gi
      controlledResources: ["cpu", "memory"]
      controlledValues: RequestsAndLimits

---
# 阶段3：自动模式（完全自动化）
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: app-vpa-phase3
  namespace: production
  labels:
    phase: automatic
    deployment-stage: "3"
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: production-app
  
  # 第三阶段：完全自动化
  updatePolicy:
    updateMode: "Auto"
    minReplicas: 2  # 确保最小副本数
  
  resourcePolicy:
    containerPolicies:
    - containerName: app
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 2000m
        memory: 4Gi
      controlledResources: ["cpu", "memory"]
      controlledValues: RequestsAndLimits
      
      # 生产环境的保守配置
      safetyMarginFraction: 0.15
      minChangeThreshold:
        cpu: 0.2
        memory: 0.3
```

### 2. 监控和告警集成

```yaml
# Prometheus 监控规则
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: vpa-monitoring
  namespace: monitoring
spec:
  groups:
  - name: vpa.rules
    rules:
    # VPA 推荐与实际使用的差异
    - record: kubernetes:vpa:recommendation_diff_cpu
      expr: |
        (
          kube_verticalpodautoscaler_status_recommendation_containerrecommendations_target{resource="cpu"}
          -
          kube_pod_container_resource_requests{resource="cpu"}
        ) / kube_pod_container_resource_requests{resource="cpu"} * 100
    
    - record: kubernetes:vpa:recommendation_diff_memory
      expr: |
        (
          kube_verticalpodautoscaler_status_recommendation_containerrecommendations_target{resource="memory"}
          -
          kube_pod_container_resource_requests{resource="memory"}
        ) / kube_pod_container_resource_requests{resource="memory"} * 100
    
    # VPA 推荐异常告警
    - alert: VPARecommendationTooHigh
      expr: |
        kubernetes:vpa:recommendation_diff_cpu > 200
        or
        kubernetes:vpa:recommendation_diff_memory > 200
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "VPA 推荐值异常偏高"
        description: "VPA {{ $labels.verticalpodautoscaler }} 的推荐值比当前配置高出 200% 以上"
    
    # VPA 更新频率告警
    - alert: VPAUpdateTooFrequent
      expr: |
        increase(kube_verticalpodautoscaler_status_update_time[1h]) > 5
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "VPA 更新过于频繁"
        description: "VPA {{ $labels.verticalpodautoscaler }} 在过去 1 小时内更新超过 5 次"
    
    # VPA 无推荐数据告警
    - alert: VPANoRecommendation
      expr: |
        time() - kube_verticalpodautoscaler_status_recommendation_containerrecommendations_target > 3600
      for: 30m
      labels:
        severity: info
      annotations:
        summary: "VPA 缺少推荐数据"
        description: "VPA {{ $labels.verticalpodautoscaler }} 超过 1 小时没有更新推荐数据"
```

### 3. 自动化 VPA 管理

```bash
#!/bin/bash
# VPA 自动化管理和优化脚本

set -e

# 配置
CONFIG_DIR="/etc/kubernetes/vpa-configs"
LOG_FILE="/var/log/vpa-manager.log"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL}"
DRY_RUN=${DRY_RUN:-true}
OPTIMIZATION_THRESHOLD=${OPTIMIZATION_THRESHOLD:-30}  # 30% 差异阈值

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

# 分析 VPA 推荐
analyze_vpa_recommendations() {
    local namespace="$1"
    local vpa_name="$2"
    
    log "分析 VPA $namespace/$vpa_name 的推荐值"
    
    # 获取目标工作负载
    local target=$(kubectl get vpa $vpa_name -n $namespace -o jsonpath='{.spec.targetRef.name}')
    local target_kind=$(kubectl get vpa $vpa_name -n $namespace -o jsonpath='{.spec.targetRef.kind}')
    
    if [[ -z "$target" ]]; then
        log "无法获取 VPA $vpa_name 的目标工作负载"
        return 1
    fi
    
    # 检查是否有推荐数据
    if ! kubectl get vpa $vpa_name -n $namespace -o jsonpath='{.status.recommendation}' | grep -q containerRecommendations; then
        log "VPA $vpa_name 暂无推荐数据"
        return 0
    fi
    
    # 分析每个容器的推荐
    kubectl get vpa $vpa_name -n $namespace -o json | jq -r '
        .status.recommendation.containerRecommendations[] |
        .containerName
    ' | while read container; do
        analyze_container_recommendation $namespace $vpa_name $target $target_kind $container
    done
}

# 分析单个容器的推荐
analyze_container_recommendation() {
    local namespace="$1"
    local vpa_name="$2"
    local target="$3"
    local target_kind="$4"
    local container="$5"
    
    # 获取推荐值
    local cpu_recommendation=$(kubectl get vpa $vpa_name -n $namespace -o json | jq -r --arg container "$container" '
        .status.recommendation.containerRecommendations[] |
        select(.containerName == $container) |
        .target.cpu // "0"
    ')
    
    local memory_recommendation=$(kubectl get vpa $vpa_name -n $namespace -o json | jq -r --arg container "$container" '
        .status.recommendation.containerRecommendations[] |
        select(.containerName == $container) |
        .target.memory // "0"
    ')
    
    # 获取当前配置
    local current_cpu=$(kubectl get $target_kind $target -n $namespace -o json | jq -r --arg container "$container" '
        .spec.template.spec.containers[] |
        select(.name == $container) |
        .resources.requests.cpu // "0"
    ')
    
    local current_memory=$(kubectl get $target_kind $target -n $namespace -o json | jq -r --arg container "$container" '
        .spec.template.spec.containers[] |
        select(.name == $container) |
        .resources.requests.memory // "0"
    ')
    
    # 计算差异百分比
    local cpu_diff=$(calculate_percentage_diff "$current_cpu" "$cpu_recommendation")
    local memory_diff=$(calculate_percentage_diff "$current_memory" "$memory_recommendation")
    
    log "容器 $container 分析结果:"
    log "  CPU: $current_cpu -> $cpu_recommendation (差异: ${cpu_diff}%)"
    log "  内存: $current_memory -> $memory_recommendation (差异: ${memory_diff}%)"
    
    # 检查是否需要优化
    if [[ $(echo "$cpu_diff > $OPTIMIZATION_THRESHOLD" | bc -l) -eq 1 ]] || \
       [[ $(echo "$memory_diff > $OPTIMIZATION_THRESHOLD" | bc -l) -eq 1 ]]; then
        
        local optimization_potential="CPU: ${cpu_diff}%, 内存: ${memory_diff}%"
        send_notification "💡 发现优化机会: $namespace/$target/$container - $optimization_potential" "info"
        
        # 生成优化建议
        generate_optimization_suggestion $namespace $vpa_name $target $target_kind $container
    fi
}

# 计算百分比差异
calculate_percentage_diff() {
    local current="$1"
    local recommended="$2"
    
    # 转换为数值（简化处理，实际应该处理各种单位）
    local current_num=$(echo $current | sed 's/[^0-9]//g')
    local recommended_num=$(echo $recommended | sed 's/[^0-9]//g')
    
    if [[ -z "$current_num" ]] || [[ "$current_num" == "0" ]]; then
        echo "0"
        return
    fi
    
    if [[ -z "$recommended_num" ]] || [[ "$recommended_num" == "0" ]]; then
        echo "0"
        return
    fi
    
    # 计算百分比差异
    local diff=$(echo "scale=2; (($recommended_num - $current_num) / $current_num) * 100" | bc -l)
    echo "${diff#-}"  # 返回绝对值
}

# 生成优化建议
generate_optimization_suggestion() {
    local namespace="$1"
    local vpa_name="$2"
    local target="$3"
    local target_kind="$4"
    local container="$5"
    
    local suggestion_file="/tmp/vpa-optimization-${namespace}-${target}-${container}.yaml"
    
    log "生成优化建议文件: $suggestion_file"
    
    # 获取推荐值并生成 YAML
    kubectl get vpa $vpa_name -n $namespace -o json | jq -r --arg container "$container" '
        .status.recommendation.containerRecommendations[] |
        select(.containerName == $container) |
        "# VPA 优化建议 - " + $container + "\n" +
        "# 当前时间: " + (now | strftime("%Y-%m-%d %H:%M:%S")) + "\n" +
        "# CPU 推荐: " + (.target.cpu // "N/A") + "\n" +
        "# 内存推荐: " + (.target.memory // "N/A") + "\n" +
        "\nresources:\n" +
        "  requests:\n" +
        "    cpu: \"" + (.target.cpu // "100m") + "\"\n" +
        "    memory: \"" + (.target.memory // "128Mi") + "\"\n" +
        "  limits:\n" +
        "    cpu: \"" + (.upperBound.cpu // (.target.cpu // "200m")) + "\"\n" +
        "    memory: \"" + (.upperBound.memory // (.target.memory // "256Mi")) + "\""
    ' > $suggestion_file
    
    log "优化建议已保存到: $suggestion_file"
}

# 主函数
main() {
    log "开始 VPA 自动化管理"
    
    # 检查必要的工具
    for tool in kubectl jq bc; do
        if ! command -v $tool &> /dev/null; then
            send_notification "❌ 缺少必要工具: $tool" "error"
            exit 1
        fi
    done
    
    # 获取所有命名空间的 VPA
    local namespaces=$(kubectl get vpa --all-namespaces -o jsonpath='{.items[*].metadata.namespace}' | tr ' ' '\n' | sort -u)
    
    for namespace in $namespaces; do
        log "处理命名空间: $namespace"
        
        local vpas=$(kubectl get vpa -n $namespace -o jsonpath='{.items[*].metadata.name}')
        
        for vpa in $vpas; do
            analyze_vpa_recommendations $namespace $vpa
        done
    done
    
    log "VPA 自动化管理完成"
    send_notification "✅ VPA 自动化分析完成" "good"
}

# 执行主函数
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
```

### 4. 测试和验证

```bash
#!/bin/bash
# VPA 功能测试脚本

set -e

NAMESPACE="vpa-test"
APP_NAME="test-app"
VPA_NAME="${APP_NAME}-vpa"

echo "=== VPA 功能测试 ==="

# 1. 创建测试命名空间
echo "1. 创建测试环境"
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# 2. 部署测试应用
echo "2. 部署测试应用"
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $APP_NAME
  namespace: $NAMESPACE
spec:
  replicas: 2
  selector:
    matchLabels:
      app: $APP_NAME
  template:
    metadata:
      labels:
        app: $APP_NAME
    spec:
      containers:
      - name: app
        image: nginx:1.20
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
        ports:
        - containerPort: 80
EOF

# 3. 创建 VPA
echo "3. 创建 VPA（观察模式）"
cat <<EOF | kubectl apply -f -
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: $VPA_NAME
  namespace: $NAMESPACE
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: $APP_NAME
  updatePolicy:
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
    - containerName: app
      minAllowed:
        cpu: 50m
        memory: 64Mi
      maxAllowed:
        cpu: 1000m
        memory: 1Gi
      controlledResources: ["cpu", "memory"]
      controlledValues: RequestsAndLimits
EOF

# 4. 等待 VPA 收集数据
echo "4. 等待 VPA 收集监控数据（60秒）"
sleep 60

# 5. 检查 VPA 状态
echo "5. 检查 VPA 状态"
kubectl describe vpa $VPA_NAME -n $NAMESPACE

# 6. 生成负载
echo "6. 生成负载测试"
kubectl run load-generator --image=busybox --rm -it --restart=Never -n $NAMESPACE -- /bin/sh -c "
  while true; do
    wget -q -O- http://${APP_NAME}.${NAMESPACE}.svc.cluster.local/ > /dev/null
    sleep 0.1
  done
" &

LOAD_PID=$!

# 7. 等待负载运行
echo "7. 运行负载测试（120秒）"
sleep 120

# 8. 停止负载
echo "8. 停止负载测试"
kill $LOAD_PID 2>/dev/null || true

# 9. 检查推荐值
echo "9. 检查 VPA 推荐值"
kubectl get vpa $VPA_NAME -n $NAMESPACE -o yaml | grep -A 20 recommendation || echo "暂无推荐数据"

# 10. 测试自动更新模式
echo "10. 切换到自动更新模式"
kubectl patch vpa $VPA_NAME -n $NAMESPACE --type='merge' -p='{
  "spec": {
    "updatePolicy": {
      "updateMode": "Auto"
    }
  }
}'

# 11. 等待自动更新
echo "11. 等待自动更新（60秒）"
sleep 60

# 12. 检查 Pod 是否被更新
echo "12. 检查 Pod 资源配置"
kubectl get pods -n $NAMESPACE -o jsonpath='{.items[*].spec.containers[*].resources}' | jq .

# 13. 清理测试环境
echo "13. 清理测试环境"
read -p "是否删除测试环境？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    kubectl delete namespace $NAMESPACE
    echo "测试环境已清理"
else
    echo "测试环境保留，命名空间: $NAMESPACE"
fi

echo "=== VPA 测试完成 ==="
```

## 总结

Vertical Pod Autoscaler (VPA) 是 Kubernetes 中重要的资源优化工具，通过自动调整 Pod 的 CPU 和内存资源来提高资源利用率和应用性能。

### 核心价值

1. **资源优化**：根据实际使用情况自动调整资源配置
2. **成本控制**：避免资源过度分配，降低运营成本
3. **性能保障**：确保应用有足够的资源运行
4. **运维简化**：减少手动调整资源配置的工作量

### 使用建议

1. **分阶段部署**：从观察模式开始，逐步过渡到自动模式
2. **合理配置**：设置合适的资源范围和更新策略
3. **监控告警**：建立完善的监控和告警机制
4. **测试验证**：在非生产环境充分测试后再应用到生产
5. **避免冲突**：注意与 HPA 的配合使用

### 适用场景

- **单体应用**：资源需求变化较大的单体应用
- **有状态应用**：数据库、缓存等有状态服务
- **批处理任务**：资源需求不确定的批处理作业
- **开发测试环境**：资源配置优化和成本控制

VPA 是 Kubernetes 资源管理的重要补充，与 HPA、资源配额等功能配合使用，可以构建完整的资源管理和优化体系。]