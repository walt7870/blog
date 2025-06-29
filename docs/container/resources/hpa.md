# HPA (Horizontal Pod Autoscaler)

## 概述

Horizontal Pod Autoscaler (HPA) 是 Kubernetes 中用于自动水平扩缩容 Pod 的控制器。它根据 CPU 使用率、内存使用率或自定义指标自动调整 Deployment、ReplicaSet 或 StatefulSet 中的 Pod 副本数量，以应对负载变化。

| 关键点 | 内容 |
| ---- | ---- |
| 核心作用 | 根据指标自动调整 Pod 副本数量 |
| 扩缩容方向 | 水平扩缩容（增减 Pod 数量） |
| 指标类型 | CPU、内存、自定义指标、外部指标 |
| 目标资源 | Deployment、ReplicaSet、StatefulSet |

## HPA 的本质

### 设计理念

* **响应式扩缩容**：根据实际负载自动调整资源
* **成本优化**：避免资源浪费和不足
* **高可用性**：确保应用在负载变化时保持稳定
* **多指标支持**：支持多种指标类型和自定义指标

### 工作原理

```
HPA 控制器
    ↓
定期检查指标（默认15秒）
    ↓
计算期望副本数 = 当前副本数 × (当前指标值 / 目标指标值)
    ↓
应用扩缩容策略
    ↓
更新目标资源的副本数
```

### 扩缩容算法

```
期望副本数 = ceil[当前副本数 × (当前指标值 / 目标指标值)]

# 示例
当前副本数: 3
当前 CPU 使用率: 80%
目标 CPU 使用率: 50%
期望副本数 = ceil[3 × (80 / 50)] = ceil[4.8] = 5
```

## 基本配置

### 1. 基于 CPU 的 HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cpu-hpa
  namespace: default
  labels:
    app: web-app
spec:
  # 目标资源
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  
  # 副本数范围
  minReplicas: 2
  maxReplicas: 10
  
  # 指标配置
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70  # 目标 CPU 使用率 70%
  
  # 扩缩容行为
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # 缩容稳定窗口 5 分钟
      policies:
      - type: Percent
        value: 10  # 每次最多缩容 10%
        periodSeconds: 60
      - type: Pods
        value: 2   # 每次最多缩容 2 个 Pod
        periodSeconds: 60
      selectPolicy: Min  # 选择最保守的策略
    
    scaleUp:
      stabilizationWindowSeconds: 60   # 扩容稳定窗口 1 分钟
      policies:
      - type: Percent
        value: 50  # 每次最多扩容 50%
        periodSeconds: 60
      - type: Pods
        value: 4   # 每次最多扩容 4 个 Pod
        periodSeconds: 60
      selectPolicy: Max  # 选择最激进的策略

---
# 目标 Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  labels:
    app: web-app
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
        image: nginx:1.21
        ports:
        - containerPort: 80
        
        # 必须设置资源请求，HPA 才能工作
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

### 2. 基于内存的 HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: memory-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: memory-intensive-app
  
  minReplicas: 1
  maxReplicas: 8
  
  metrics:
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80  # 目标内存使用率 80%
  
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 600  # 内存缩容更保守
      policies:
      - type: Pods
        value: 1
        periodSeconds: 120
    scaleUp:
      stabilizationWindowSeconds: 120
      policies:
      - type: Pods
        value: 2
        periodSeconds: 60

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: memory-intensive-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: memory-intensive-app
  template:
    metadata:
      labels:
        app: memory-intensive-app
    spec:
      containers:
      - name: app
        image: memory-app:v1.0
        resources:
          requests:
            cpu: 100m
            memory: 512Mi  # 内存请求
          limits:
            cpu: 500m
            memory: 1Gi
```

### 3. 多指标 HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: multi-metric-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  
  minReplicas: 3
  maxReplicas: 20
  
  metrics:
  # CPU 指标
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  
  # 内存指标
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 70
  
  # Pod 级别的自定义指标
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"  # 每个 Pod 每秒 100 个请求
  
  # 对象级别的自定义指标
  - type: Object
    object:
      metric:
        name: queue_length
      describedObject:
        apiVersion: v1
        kind: Service
        name: message-queue
      target:
        type: Value
        value: "50"  # 队列长度不超过 50
  
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 20
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 5
        periodSeconds: 30
      selectPolicy: Max
```

## 自定义指标 HPA

### 1. 基于 Prometheus 指标的 HPA

```yaml
# 首先需要部署 Prometheus Adapter
apiVersion: v1
kind: ConfigMap
metadata:
  name: adapter-config
  namespace: monitoring
data:
  config.yaml: |
    rules:
    # HTTP 请求速率指标
    - seriesQuery: 'http_requests_total{namespace!="",pod!=""}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        matches: "^http_requests_total"
        as: "http_requests_per_second"
      metricsQuery: 'rate(http_requests_total{<<.LabelMatchers>>}[2m])'
    
    # 队列长度指标
    - seriesQuery: 'queue_length{namespace!=""}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          service: {resource: "service"}
      name:
        matches: "^queue_length"
        as: "queue_length"
      metricsQuery: 'queue_length{<<.LabelMatchers>>}'

---
# 基于自定义指标的 HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: custom-metrics-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-api
  
  minReplicas: 2
  maxReplicas: 15
  
  metrics:
  # 基础 CPU 指标
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  
  # 自定义指标：HTTP 请求速率
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "50"  # 每个 Pod 每秒 50 个请求
  
  # 自定义指标：响应时间
  - type: Pods
    pods:
      metric:
        name: http_request_duration_seconds
      target:
        type: AverageValue
        averageValue: "200m"  # 平均响应时间 200ms
  
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 15
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
      - type: Percent
        value: 50
        periodSeconds: 30
      - type: Pods
        value: 3
        periodSeconds: 30
      selectPolicy: Max

---
# 目标应用需要暴露指标
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-api
  template:
    metadata:
      labels:
        app: web-api
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: api
        image: web-api:v2.0
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        
        env:
        - name: METRICS_PORT
          value: "9090"
        
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 512Mi
        
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
```

### 2. 基于外部指标的 HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: external-metrics-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: worker-app
  
  minReplicas: 1
  maxReplicas: 10
  
  metrics:
  # 外部指标：消息队列长度
  - type: External
    external:
      metric:
        name: rabbitmq_queue_messages
        selector:
          matchLabels:
            queue: "work-queue"
            vhost: "production"
      target:
        type: Value
        value: "100"  # 队列中消息数不超过 100
  
  # 外部指标：数据库连接数
  - type: External
    external:
      metric:
        name: postgresql_connections
        selector:
          matchLabels:
            database: "production"
      target:
        type: Value
        value: "80"  # 数据库连接数不超过 80
  
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 600  # 外部指标缩容更保守
      policies:
      - type: Pods
        value: 1
        periodSeconds: 120
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 2
        periodSeconds: 30
```

## 扩缩容行为配置

### 1. 详细的扩缩容策略

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: advanced-behavior-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-service
  
  minReplicas: 2
  maxReplicas: 50
  
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  
  behavior:
    # 缩容行为
    scaleDown:
      # 稳定窗口：在此时间内不会再次缩容
      stabilizationWindowSeconds: 300
      
      # 缩容策略
      policies:
      # 策略1：每分钟最多缩容 10%
      - type: Percent
        value: 10
        periodSeconds: 60
      
      # 策略2：每分钟最多缩容 2 个 Pod
      - type: Pods
        value: 2
        periodSeconds: 60
      
      # 策略3：每 2 分钟最多缩容 5 个 Pod
      - type: Pods
        value: 5
        periodSeconds: 120
      
      # 选择策略：Min 表示选择最保守的策略
      selectPolicy: Min
    
    # 扩容行为
    scaleUp:
      # 稳定窗口：在此时间内不会再次扩容
      stabilizationWindowSeconds: 60
      
      # 扩容策略
      policies:
      # 策略1：每 30 秒最多扩容 100%
      - type: Percent
        value: 100
        periodSeconds: 30
      
      # 策略2：每 30 秒最多扩容 4 个 Pod
      - type: Pods
        value: 4
        periodSeconds: 30
      
      # 策略3：每分钟最多扩容 8 个 Pod
      - type: Pods
        value: 8
        periodSeconds: 60
      
      # 选择策略：Max 表示选择最激进的策略
      selectPolicy: Max
```

### 2. 不同场景的扩缩容策略

```yaml
# 场景1：稳定的 Web 服务
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: stable-web-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: stable-web
  
  minReplicas: 3
  maxReplicas: 10
  
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 600  # 10 分钟稳定期
      policies:
      - type: Percent
        value: 10  # 保守缩容
        periodSeconds: 120
    scaleUp:
      stabilizationWindowSeconds: 120  # 2 分钟稳定期
      policies:
      - type: Percent
        value: 30  # 适中扩容
        periodSeconds: 60

---
# 场景2：突发流量的 API 服务
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: burst-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: burst-api
  
  minReplicas: 2
  maxReplicas: 30
  
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50  # 更低的阈值
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
  
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 20  # 较快缩容
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 30   # 快速响应
      policies:
      - type: Percent
        value: 200  # 激进扩容
        periodSeconds: 30
      - type: Pods
        value: 10   # 大量扩容
        periodSeconds: 30
      selectPolicy: Max

---
# 场景3：批处理工作负载
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: batch-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: batch-worker
  
  minReplicas: 0  # 可以缩容到 0
  maxReplicas: 20
  
  metrics:
  - type: External
    external:
      metric:
        name: queue_length
      target:
        type: Value
        value: "50"
  
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 180
      policies:
      - type: Pods
        value: 5  # 快速缩容
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
      - type: Pods
        value: 10  # 快速扩容
        periodSeconds: 30
```

## 实际应用场景

### 1. 电商网站的 HPA 配置

```yaml
# 前端 Web 服务
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
  namespace: ecommerce
  labels:
    app: frontend
    tier: web
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend
  
  minReplicas: 3  # 保证基本可用性
  maxReplicas: 20 # 应对促销高峰
  
  metrics:
  # CPU 使用率
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  
  # 并发连接数
  - type: Pods
    pods:
      metric:
        name: nginx_connections_active
      target:
        type: AverageValue
        averageValue: "100"
  
  # 请求响应时间
  - type: Pods
    pods:
      metric:
        name: http_request_duration_p95
      target:
        type: AverageValue
        averageValue: "500m"  # 95% 请求在 500ms 内
  
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 15
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 5
        periodSeconds: 30
      selectPolicy: Max

---
# API 服务
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: ecommerce
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  
  minReplicas: 5  # API 服务需要更多基础副本
  maxReplicas: 30
  
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
  
  # API 请求速率
  - type: Pods
    pods:
      metric:
        name: api_requests_per_second
      target:
        type: AverageValue
        averageValue: "200"
  
  # 数据库连接池使用率
  - type: Pods
    pods:
      metric:
        name: db_connection_pool_usage
      target:
        type: AverageValue
        averageValue: "0.7"  # 70% 使用率
  
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 600  # API 服务缩容更保守
      policies:
      - type: Percent
        value: 10
        periodSeconds: 120
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
      - type: Percent
        value: 50
        periodSeconds: 30

---
# 订单处理服务
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-processor-hpa
  namespace: ecommerce
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-processor
  
  minReplicas: 2
  maxReplicas: 15
  
  metrics:
  # 订单队列长度
  - type: External
    external:
      metric:
        name: rabbitmq_queue_messages
        selector:
          matchLabels:
            queue: "order-processing"
      target:
        type: Value
        value: "100"  # 队列中订单数不超过 100
  
  # CPU 使用率
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 75
  
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 1
        periodSeconds: 120
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 3
        periodSeconds: 30
```

### 2. 微服务架构的 HPA 配置

```yaml
# 用户服务
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-service-hpa
  namespace: microservices
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service
  
  minReplicas: 2
  maxReplicas: 8
  
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  
  # gRPC 请求速率
  - type: Pods
    pods:
      metric:
        name: grpc_requests_per_second
      target:
        type: AverageValue
        averageValue: "50"
  
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 1
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 2
        periodSeconds: 30

---
# 支付服务（关键服务，更保守的策略）
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: payment-service-hpa
  namespace: microservices
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-service
  
  minReplicas: 3  # 关键服务保持更多副本
  maxReplicas: 12
  
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50  # 更低的 CPU 阈值
  
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 70
  
  # 支付请求队列
  - type: External
    external:
      metric:
        name: payment_queue_length
      target:
        type: Value
        value: "20"  # 支付队列更短
  
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 600  # 更长的稳定期
      policies:
      - type: Pods
        value: 1
        periodSeconds: 180  # 更慢的缩容
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
      - type: Pods
        value: 2
        periodSeconds: 30

---
# 通知服务（可以快速扩缩容）
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: notification-service-hpa
  namespace: microservices
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: notification-service
  
  minReplicas: 1
  maxReplicas: 20
  
  metrics:
  # 通知队列长度
  - type: External
    external:
      metric:
        name: notification_queue_messages
      target:
        type: Value
        value: "500"
  
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 120
      policies:
      - type: Pods
        value: 3  # 快速缩容
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
      - type: Pods
        value: 5  # 快速扩容
        periodSeconds: 30
```

## 命令行操作

### 基本操作

```bash
# 创建 HPA
kubectl apply -f hpa.yaml

# 查看 HPA
kubectl get hpa
kubectl get horizontalpodautoscaler  # 完整名称

# 查看 HPA 详情
kubectl describe hpa cpu-hpa

# 查看 HPA 状态
kubectl get hpa cpu-hpa -o wide

# 实时监控 HPA
kubectl get hpa -w
```

### 使用命令行创建 HPA

```bash
# 基于 CPU 创建 HPA
kubectl autoscale deployment web-app --cpu-percent=70 --min=2 --max=10

# 基于内存创建 HPA（需要 v2 API）
kubectl apply -f - <<EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: memory-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
EOF
```

### 调试和监控

```bash
# 查看 HPA 事件
kubectl get events --field-selector involvedObject.kind=HorizontalPodAutoscaler

# 查看 HPA 的指标
kubectl top pods -l app=web-app
kubectl top nodes

# 查看 Metrics Server 状态
kubectl get pods -n kube-system -l k8s-app=metrics-server

# 查看自定义指标
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1" | jq .

# 查看外部指标
kubectl get --raw "/apis/external.metrics.k8s.io/v1beta1" | jq .

# 手动触发扩缩容测试
kubectl patch deployment web-app -p '{"spec":{"replicas":1}}'

# 生成负载测试
kubectl run -i --tty load-generator --rm --image=busybox --restart=Never -- /bin/sh
# 在容器内执行
while true; do wget -q -O- http://web-app-service/; done
```

### HPA 管理

```bash
# 暂停 HPA
kubectl patch hpa cpu-hpa -p '{"spec":{"minReplicas":null,"maxReplicas":null}}'

# 恢复 HPA
kubectl patch hpa cpu-hpa -p '{"spec":{"minReplicas":2,"maxReplicas":10}}'

# 更新 HPA 配置
kubectl patch hpa cpu-hpa -p '{"spec":{"metrics":[{"type":"Resource","resource":{"name":"cpu","target":{"type":"Utilization","averageUtilization":80}}}]}}'

# 删除 HPA
kubectl delete hpa cpu-hpa

# 查看 HPA 的 YAML 配置
kubectl get hpa cpu-hpa -o yaml
```

## 故障排查

### 常见问题

| 问题 | 可能原因 | 解决方案 |
| ---- | ---- | ---- |
| HPA 不工作 | Metrics Server 未安装 | 安装 Metrics Server |
| 无法获取指标 | Pod 未设置资源请求 | 设置 resources.requests |
| 扩缩容频繁 | 稳定窗口太短 | 增加 stabilizationWindowSeconds |
| 自定义指标不可用 | Prometheus Adapter 配置错误 | 检查 Adapter 配置 |
| 扩容不及时 | 扩容策略太保守 | 调整扩容策略 |

### 诊断步骤

1. **检查 HPA 状态**
```bash
kubectl describe hpa cpu-hpa
kubectl get hpa cpu-hpa -o yaml
```

2. **检查 Metrics Server**
```bash
kubectl get pods -n kube-system -l k8s-app=metrics-server
kubectl logs -n kube-system -l k8s-app=metrics-server
```

3. **检查目标资源**
```bash
kubectl describe deployment web-app
kubectl get pods -l app=web-app
```

4. **检查资源配置**
```bash
kubectl get pods -l app=web-app -o jsonpath='{.items[*].spec.containers[*].resources}'
```

5. **检查指标可用性**
```bash
# 检查资源指标
kubectl top pods -l app=web-app

# 检查自定义指标
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/default/pods/*/http_requests_per_second" | jq .
```

### 常见错误和解决方案

```yaml
# 错误1：missing request for cpu
# 解决方案：确保 Pod 设置了 CPU 请求
spec:
  containers:
  - name: app
    image: app:v1.0
    resources:
      requests:
        cpu: 100m  # 必须设置
        memory: 128Mi

# 错误2：unable to get metrics for resource cpu
# 解决方案：检查 Metrics Server
kubectl get apiservice v1beta1.metrics.k8s.io -o yaml

# 错误3：the HPA was unable to compute the replica count
# 解决方案：检查目标资源是否存在
kubectl get deployment web-app

# 错误4：failed to get cpu utilization
# 解决方案：等待 Pod 运行一段时间后再检查
kubectl get pods -l app=web-app
```

## 最佳实践

### 1. 资源配置最佳实践

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: best-practice-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: best-practice-app
  template:
    metadata:
      labels:
        app: best-practice-app
    spec:
      containers:
      - name: app
        image: app:v1.0
        
        # 关键：必须设置资源请求
        resources:
          requests:
            cpu: 200m      # 基于实际使用情况设置
            memory: 256Mi   # 基于实际使用情况设置
          limits:
            cpu: 1000m      # 允许突发使用
            memory: 512Mi   # 防止内存泄漏
        
        # 健康检查确保 Pod 就绪
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
      
      terminationGracePeriodSeconds: 30

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: best-practice-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: best-practice-app
  
  # 合理的副本数范围
  minReplicas: 2   # 保证基本可用性
  maxReplicas: 20  # 防止资源耗尽
  
  metrics:
  # 主要指标：CPU
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70  # 留有余量
  
  # 辅助指标：内存
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  
  # 合理的扩缩容行为
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # 5分钟稳定期
      policies:
      - type: Percent
        value: 10   # 保守缩容
        periodSeconds: 60
      - type: Pods
        value: 2    # 限制缩容速度
        periodSeconds: 60
      selectPolicy: Min
    
    scaleUp:
      stabilizationWindowSeconds: 60   # 1分钟稳定期
      policies:
      - type: Percent
        value: 50   # 适中扩容
        periodSeconds: 30
      - type: Pods
        value: 4    # 限制扩容速度
        periodSeconds: 30
      selectPolicy: Max
```

### 2. 监控和告警

```yaml
# Prometheus 告警规则
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: hpa-alerts
  namespace: monitoring
spec:
  groups:
  - name: hpa.rules
    rules:
    # HPA 无法获取指标
    - alert: HPAMetricsUnavailable
      expr: kube_horizontalpodautoscaler_status_condition{condition="ScalingActive",status="false"} == 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "HPA {{ $labels.horizontalpodautoscaler }} cannot get metrics"
        description: "HPA {{ $labels.horizontalpodautoscaler }} in namespace {{ $labels.namespace }} has been unable to get metrics for 5 minutes."
    
    # HPA 达到最大副本数
    - alert: HPAMaxReplicas
      expr: kube_horizontalpodautoscaler_status_current_replicas >= kube_horizontalpodautoscaler_spec_max_replicas
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "HPA {{ $labels.horizontalpodautoscaler }} reached max replicas"
        description: "HPA {{ $labels.horizontalpodautoscaler }} in namespace {{ $labels.namespace }} has been at max replicas for 10 minutes."
    
    # HPA 频繁扩缩容
    - alert: HPAFrequentScaling
      expr: increase(kube_horizontalpodautoscaler_status_current_replicas[30m]) > 10
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "HPA {{ $labels.horizontalpodautoscaler }} scaling frequently"
        description: "HPA {{ $labels.horizontalpodautoscaler }} in namespace {{ $labels.namespace }} has scaled more than 10 times in the last 30 minutes."

---
# Grafana 仪表板配置
apiVersion: v1
kind: ConfigMap
metadata:
  name: hpa-dashboard
  namespace: monitoring
data:
  dashboard.json: |
    {
      "dashboard": {
        "title": "HPA Monitoring",
        "panels": [
          {
            "title": "Current Replicas",
            "type": "graph",
            "targets": [
              {
                "expr": "kube_horizontalpodautoscaler_status_current_replicas",
                "legendFormat": "{{ horizontalpodautoscaler }}"
              }
            ]
          },
          {
            "title": "CPU Utilization",
            "type": "graph",
            "targets": [
              {
                "expr": "rate(container_cpu_usage_seconds_total[5m]) * 100",
                "legendFormat": "{{ pod }}"
              }
            ]
          },
          {
            "title": "Memory Utilization",
            "type": "graph",
            "targets": [
              {
                "expr": "container_memory_usage_bytes / container_spec_memory_limit_bytes * 100",
                "legendFormat": "{{ pod }}"
              }
            ]
          }
        ]
      }
    }
```

### 3. 测试和验证

```bash
#!/bin/bash
# HPA 测试脚本

set -e

HPA_NAME="test-hpa"
DEPLOYMENT_NAME="test-app"
NAMESPACE="default"

echo "=== HPA 测试开始 ==="

# 1. 检查初始状态
echo "检查初始状态..."
kubectl get hpa $HPA_NAME -n $NAMESPACE
kubectl get deployment $DEPLOYMENT_NAME -n $NAMESPACE

# 2. 生成负载
echo "生成负载..."
kubectl run load-generator \
  --image=busybox \
  --restart=Never \
  --rm -i --tty \
  -- /bin/sh -c "while true; do wget -q -O- http://test-app-service:80/; done" &

LOAD_PID=$!

# 3. 监控扩容
echo "监控扩容过程..."
for i in {1..20}; do
  echo "第 $i 分钟:"
  kubectl get hpa $HPA_NAME -n $NAMESPACE
  kubectl top pods -l app=test-app -n $NAMESPACE
  sleep 60
done

# 4. 停止负载
echo "停止负载生成..."
kill $LOAD_PID

# 5. 监控缩容
echo "监控缩容过程..."
for i in {1..10}; do
  echo "缩容第 $i 分钟:"
  kubectl get hpa $HPA_NAME -n $NAMESPACE
  sleep 60
done

echo "=== HPA 测试完成 ==="
```

## 总结

HPA 是 Kubernetes 中实现自动扩缩容的核心组件，它能够根据多种指标自动调整应用的副本数量，提高资源利用率和应用可用性。

**关键要点**：
- HPA 需要 Metrics Server 或自定义指标提供者
- 目标 Pod 必须设置资源请求（requests）
- 合理配置扩缩容行为以避免频繁变化
- 支持多种指标类型：资源指标、Pod 指标、对象指标、外部指标
- 通过监控和告警确保 HPA 正常工作
- 根据应用特性选择合适的扩缩容策略