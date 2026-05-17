# LimitRange

## 概述

LimitRange 是 Kubernetes 中用于限制命名空间内资源使用的策略对象。它可以设置 Pod、容器、PersistentVolumeClaim 等资源的最小值、最大值和默认值，确保集群资源的合理分配和使用。

| 关键点 | 内容 |
| ---- | ---- |
| 核心作用 | 限制和控制命名空间内资源的使用 |
| 作用范围 | 命名空间级别 |
| 限制对象 | Pod、容器、PVC 等资源 |
| 限制类型 | CPU、内存、存储、对象数量 |
| 执行时机 | 资源创建和更新时 |

## LimitRange 的本质

### 设计理念

* **资源治理**：防止单个资源消耗过多集群资源
* **默认策略**：为没有指定资源限制的对象提供默认值
* **质量保证**：确保资源请求的合理性
* **多租户支持**：在多租户环境中提供资源隔离

### 工作原理

```
资源创建请求 → LimitRange 验证 → 应用默认值/限制 → 资源创建成功/失败
       ↓              ↓                ↓                ↓
   用户提交        准入控制器检查      自动设置默认值      最终资源配置
```

### 限制类型

| 限制类型 | 描述 | 适用资源 |
| ---- | ---- | ---- |
| `min` | 最小值限制 | CPU、内存、存储 |
| `max` | 最大值限制 | CPU、内存、存储 |
| `default` | 默认限制值（limit） | CPU、内存 |
| `defaultRequest` | 默认请求值（request） | CPU、内存 |
| `maxLimitRequestRatio` | limit/request 的最大比例 | CPU、内存 |

## 基本配置

### 1. 容器资源限制

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: container-limit-range
  namespace: development
  labels:
    environment: development
    resource-type: container
spec:
  limits:
  # 容器 CPU 限制
  - type: Container
    resource: cpu
    min: "100m"          # 最小 CPU 请求
    max: "2"             # 最大 CPU 限制
    default: "500m"      # 默认 CPU 限制
    defaultRequest: "200m"  # 默认 CPU 请求
    maxLimitRequestRatio: 4  # limit/request 最大比例
  
  # 容器内存限制
  - type: Container
    resource: memory
    min: "128Mi"         # 最小内存请求
    max: "4Gi"           # 最大内存限制
    default: "1Gi"       # 默认内存限制
    defaultRequest: "256Mi"  # 默认内存请求
    maxLimitRequestRatio: 2  # limit/request 最大比例

---
# 测试 Pod - 将应用上述限制
apiVersion: v1
kind: Pod
metadata:
  name: test-container-limits
  namespace: development
spec:
  containers:
  - name: app
    image: nginx:1.20
    # 不指定资源，将使用 LimitRange 中的默认值
    # resources:
    #   requests:
    #     cpu: "200m"     # 来自 defaultRequest
    #     memory: "256Mi"  # 来自 defaultRequest
    #   limits:
    #     cpu: "500m"     # 来自 default
    #     memory: "1Gi"    # 来自 default
```

### 2. Pod 级别限制

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: pod-limit-range
  namespace: production
  labels:
    environment: production
    resource-type: pod
spec:
  limits:
  # Pod 总体 CPU 限制
  - type: Pod
    resource: cpu
    min: "200m"          # Pod 最小 CPU 请求总和
    max: "8"             # Pod 最大 CPU 限制总和
  
  # Pod 总体内存限制
  - type: Pod
    resource: memory
    min: "256Mi"         # Pod 最小内存请求总和
    max: "16Gi"          # Pod 最大内存限制总和
  
  # Pod 临时存储限制
  - type: Pod
    resource: ephemeral-storage
    min: "1Gi"           # Pod 最小临时存储请求
    max: "10Gi"          # Pod 最大临时存储限制

---
# 多容器 Pod 示例
apiVersion: v1
kind: Pod
metadata:
  name: multi-container-pod
  namespace: production
spec:
  containers:
  - name: web-server
    image: nginx:1.20
    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "1"
        memory: "2Gi"
  
  - name: sidecar
    image: busybox:1.35
    resources:
      requests:
        cpu: "50m"
        memory: "64Mi"
      limits:
        cpu: "200m"
        memory: "256Mi"
  # Pod 总计：
  # CPU requests: 150m, limits: 1.2
  # Memory requests: 192Mi, limits: 2.25Gi
  # 都在 LimitRange 允许范围内
```

### 3. PersistentVolumeClaim 限制

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: pvc-limit-range
  namespace: data-processing
  labels:
    resource-type: storage
spec:
  limits:
  # PVC 存储大小限制
  - type: PersistentVolumeClaim
    resource: storage
    min: "1Gi"           # 最小存储请求
    max: "100Gi"         # 最大存储请求

---
# 符合限制的 PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-pvc
  namespace: data-processing
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi      # 在 1Gi-100Gi 范围内
  storageClassName: fast-ssd
```

## 高级配置

### 1. 综合资源限制策略

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: comprehensive-limits
  namespace: microservices
  labels:
    policy-type: comprehensive
    managed-by: platform-team
  annotations:
    description: "微服务命名空间的综合资源限制策略"
    last-updated: "2024-01-15"
spec:
  limits:
  # 容器 CPU 限制（细粒度控制）
  - type: Container
    resource: cpu
    min: "50m"           # 最小 CPU，防止过小的请求
    max: "4"             # 最大 CPU，防止单容器占用过多
    default: "200m"      # 默认限制
    defaultRequest: "100m"  # 默认请求
    maxLimitRequestRatio: 10  # 允许较大的突发比例
  
  # 容器内存限制
  - type: Container
    resource: memory
    min: "64Mi"          # 最小内存
    max: "8Gi"           # 最大内存
    default: "512Mi"     # 默认限制
    defaultRequest: "128Mi"  # 默认请求
    maxLimitRequestRatio: 4   # 内存突发比例
  
  # 容器临时存储限制
  - type: Container
    resource: ephemeral-storage
    min: "100Mi"         # 最小临时存储
    max: "5Gi"           # 最大临时存储
    default: "1Gi"       # 默认限制
    defaultRequest: "200Mi"  # 默认请求
  
  # Pod 级别限制（总体控制）
  - type: Pod
    resource: cpu
    min: "100m"          # Pod 最小 CPU 总和
    max: "16"            # Pod 最大 CPU 总和
  
  - type: Pod
    resource: memory
    min: "128Mi"         # Pod 最小内存总和
    max: "32Gi"          # Pod 最大内存总和
  
  - type: Pod
    resource: ephemeral-storage
    min: "200Mi"         # Pod 最小临时存储总和
    max: "20Gi"          # Pod 最大临时存储总和
  
  # PVC 存储限制
  - type: PersistentVolumeClaim
    resource: storage
    min: "500Mi"         # 最小存储
    max: "500Gi"         # 最大存储

---
# 应用示例：微服务 Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: microservice-app
  namespace: microservices
spec:
  replicas: 3
  selector:
    matchLabels:
      app: microservice-app
  template:
    metadata:
      labels:
        app: microservice-app
    spec:
      containers:
      - name: app
        image: my-microservice:v1.0
        # 不指定 resources，将使用 LimitRange 默认值
        ports:
        - containerPort: 8080
        env:
        - name: JAVA_OPTS
          value: "-Xmx400m -Xms100m"  # 与内存限制匹配
```

### 2. 环境特定的限制策略

```yaml
# 开发环境 - 宽松限制
apiVersion: v1
kind: LimitRange
metadata:
  name: development-limits
  namespace: dev
  labels:
    environment: development
    policy-level: permissive
spec:
  limits:
  - type: Container
    resource: cpu
    min: "10m"           # 很小的最小值
    max: "2"             # 适中的最大值
    default: "100m"
    defaultRequest: "50m"
    maxLimitRequestRatio: 20  # 允许大的突发比例
  
  - type: Container
    resource: memory
    min: "32Mi"
    max: "4Gi"
    default: "256Mi"
    defaultRequest: "64Mi"
    maxLimitRequestRatio: 8

---
# 生产环境 - 严格限制
apiVersion: v1
kind: LimitRange
metadata:
  name: production-limits
  namespace: prod
  labels:
    environment: production
    policy-level: strict
spec:
  limits:
  - type: Container
    resource: cpu
    min: "100m"          # 较高的最小值
    max: "1"             # 较低的最大值
    default: "500m"
    defaultRequest: "200m"
    maxLimitRequestRatio: 2   # 严格的突发比例
  
  - type: Container
    resource: memory
    min: "128Mi"
    max: "2Gi"
    default: "1Gi"
    defaultRequest: "256Mi"
    maxLimitRequestRatio: 2
  
  # 生产环境额外限制 PVC
  - type: PersistentVolumeClaim
    resource: storage
    min: "1Gi"
    max: "50Gi"          # 生产环境存储限制更严格

---
# 测试环境 - 中等限制
apiVersion: v1
kind: LimitRange
metadata:
  name: testing-limits
  namespace: test
  labels:
    environment: testing
    policy-level: moderate
spec:
  limits:
  - type: Container
    resource: cpu
    min: "50m"
    max: "1.5"
    default: "300m"
    defaultRequest: "100m"
    maxLimitRequestRatio: 5
  
  - type: Container
    resource: memory
    min: "64Mi"
    max: "3Gi"
    default: "512Mi"
    defaultRequest: "128Mi"
    maxLimitRequestRatio: 4
```

### 3. 特殊工作负载的限制

```yaml
# 大数据处理命名空间
apiVersion: v1
kind: LimitRange
metadata:
  name: bigdata-limits
  namespace: bigdata
  labels:
    workload-type: compute-intensive
spec:
  limits:
  # 允许更大的资源使用
  - type: Container
    resource: cpu
    min: "500m"          # 较高的最小 CPU
    max: "16"            # 很高的最大 CPU
    default: "2"
    defaultRequest: "1"
    maxLimitRequestRatio: 2
  
  - type: Container
    resource: memory
    min: "1Gi"           # 较高的最小内存
    max: "64Gi"          # 很高的最大内存
    default: "8Gi"
    defaultRequest: "4Gi"
    maxLimitRequestRatio: 2
  
  # Pod 级别也需要更高限制
  - type: Pod
    resource: cpu
    max: "32"            # 允许多容器高 CPU 使用
  
  - type: Pod
    resource: memory
    max: "128Gi"         # 允许多容器高内存使用

---
# 边缘计算命名空间
apiVersion: v1
kind: LimitRange
metadata:
  name: edge-limits
  namespace: edge
  labels:
    workload-type: resource-constrained
spec:
  limits:
  # 资源受限环境的严格限制
  - type: Container
    resource: cpu
    min: "10m"           # 很小的最小值
    max: "500m"          # 较小的最大值
    default: "100m"
    defaultRequest: "50m"
    maxLimitRequestRatio: 3
  
  - type: Container
    resource: memory
    min: "16Mi"          # 很小的最小内存
    max: "512Mi"         # 较小的最大内存
    default: "128Mi"
    defaultRequest: "64Mi"
    maxLimitRequestRatio: 2
  
  - type: PersistentVolumeClaim
    resource: storage
    min: "100Mi"
    max: "10Gi"          # 存储也受限
```

## 实际应用场景

### 1. 多租户环境资源隔离

```yaml
# 租户 A - 高级套餐
apiVersion: v1
kind: LimitRange
metadata:
  name: tenant-a-premium
  namespace: tenant-a
  labels:
    tenant: tenant-a
    plan: premium
    billing-tier: high
spec:
  limits:
  - type: Container
    resource: cpu
    min: "100m"
    max: "4"             # 高级套餐允许更多 CPU
    default: "1"
    defaultRequest: "200m"
  
  - type: Container
    resource: memory
    min: "128Mi"
    max: "8Gi"           # 高级套餐允许更多内存
    default: "2Gi"
    defaultRequest: "512Mi"
  
  - type: PersistentVolumeClaim
    resource: storage
    min: "1Gi"
    max: "1Ti"           # 高级套餐允许更多存储

---
# 租户 B - 基础套餐
apiVersion: v1
kind: LimitRange
metadata:
  name: tenant-b-basic
  namespace: tenant-b
  labels:
    tenant: tenant-b
    plan: basic
    billing-tier: low
spec:
  limits:
  - type: Container
    resource: cpu
    min: "50m"
    max: "1"             # 基础套餐 CPU 限制
    default: "200m"
    defaultRequest: "100m"
  
  - type: Container
    resource: memory
    min: "64Mi"
    max: "2Gi"           # 基础套餐内存限制
    default: "512Mi"
    defaultRequest: "128Mi"
  
  - type: PersistentVolumeClaim
    resource: storage
    min: "500Mi"
    max: "100Gi"         # 基础套餐存储限制
```

### 2. CI/CD 流水线资源控制

```yaml
# CI/CD 构建环境
apiVersion: v1
kind: LimitRange
metadata:
  name: cicd-build-limits
  namespace: cicd
  labels:
    purpose: build-pipeline
    resource-type: ephemeral
spec:
  limits:
  # 构建任务通常需要较多 CPU 但运行时间短
  - type: Container
    resource: cpu
    min: "200m"          # 构建需要一定的 CPU
    max: "8"             # 允许并行构建
    default: "2"
    defaultRequest: "500m"
    maxLimitRequestRatio: 4
  
  # 构建可能需要较多内存（编译、打包）
  - type: Container
    resource: memory
    min: "256Mi"
    max: "16Gi"          # 大型项目构建需要更多内存
    default: "4Gi"
    defaultRequest: "1Gi"
    maxLimitRequestRatio: 2
  
  # 构建过程产生大量临时文件
  - type: Container
    resource: ephemeral-storage
    min: "1Gi"
    max: "50Gi"          # 构建缓存和临时文件
    default: "10Gi"
    defaultRequest: "2Gi"

---
# 部署环境（资源使用更稳定）
apiVersion: v1
kind: LimitRange
metadata:
  name: cicd-deploy-limits
  namespace: cicd
  labels:
    purpose: deployment
    resource-type: stable
spec:
  limits:
  - type: Container
    resource: cpu
    min: "50m"
    max: "1"             # 部署任务 CPU 需求较低
    default: "200m"
    defaultRequest: "100m"
  
  - type: Container
    resource: memory
    min: "128Mi"
    max: "2Gi"           # 部署任务内存需求较低
    default: "512Mi"
    defaultRequest: "256Mi"
```

### 3. 机器学习工作负载

```yaml
# ML 训练环境
apiVersion: v1
kind: LimitRange
metadata:
  name: ml-training-limits
  namespace: ml-training
  labels:
    workload-type: ml-training
    resource-intensive: "true"
spec:
  limits:
  # ML 训练需要大量计算资源
  - type: Container
    resource: cpu
    min: "1"             # 训练至少需要 1 核
    max: "32"            # 允许大规模并行训练
    default: "8"
    defaultRequest: "4"
    maxLimitRequestRatio: 2
  
  # ML 训练通常需要大量内存
  - type: Container
    resource: memory
    min: "2Gi"           # 训练至少需要 2GB 内存
    max: "256Gi"         # 大模型训练需要大量内存
    default: "32Gi"
    defaultRequest: "16Gi"
    maxLimitRequestRatio: 2
  
  # GPU 资源（如果集群支持）
  - type: Container
    resource: nvidia.com/gpu
    min: "0"             # GPU 可选
    max: "8"             # 最多 8 个 GPU
    default: "1"
    defaultRequest: "1"

---
# ML 推理环境
apiVersion: v1
kind: LimitRange
metadata:
  name: ml-inference-limits
  namespace: ml-inference
  labels:
    workload-type: ml-inference
    latency-sensitive: "true"
spec:
  limits:
  # 推理服务需要稳定的资源
  - type: Container
    resource: cpu
    min: "200m"          # 推理需要一定 CPU
    max: "4"             # 推理通常不需要太多 CPU
    default: "1"
    defaultRequest: "500m"
    maxLimitRequestRatio: 2
  
  - type: Container
    resource: memory
    min: "512Mi"         # 推理需要加载模型
    max: "16Gi"          # 大模型推理需要更多内存
    default: "4Gi"
    defaultRequest: "2Gi"
    maxLimitRequestRatio: 2
```

## 命令行操作

### 基本操作

```bash
# 查看 LimitRange
kubectl get limitranges
kubectl get limitranges -n production
kubectl get lr  # 简写形式

# 查看详细信息
kubectl describe limitrange container-limit-range -n development
kubectl get limitrange container-limit-range -o yaml

# 查看所有命名空间的 LimitRange
kubectl get limitranges --all-namespaces

# 查看 LimitRange 的 JSON 格式
kubectl get limitrange pod-limit-range -o json
```

### 创建和管理

```bash
# 从文件创建 LimitRange
kubectl apply -f limitrange.yaml

# 创建简单的 LimitRange（命令行方式）
kubectl create namespace test-limits

# 更新 LimitRange
kubectl apply -f updated-limitrange.yaml

# 删除 LimitRange
kubectl delete limitrange container-limit-range -n development

# 批量删除
kubectl delete limitranges --all -n test-namespace
```

### 验证和测试

```bash
# 测试 LimitRange 是否生效
# 1. 创建一个超出限制的 Pod
kubectl run test-pod --image=nginx --requests='cpu=5' -n development
# 应该失败并显示 LimitRange 错误

# 2. 创建一个符合限制的 Pod
kubectl run test-pod --image=nginx --requests='cpu=100m,memory=128Mi' --limits='cpu=500m,memory=512Mi' -n development

# 3. 查看 Pod 的实际资源配置
kubectl get pod test-pod -o yaml | grep -A 10 resources:

# 4. 创建没有资源规格的 Pod，查看默认值是否应用
kubectl run default-pod --image=nginx -n development
kubectl describe pod default-pod -n development | grep -A 10 "Limits\|Requests"
```

### 调试和故障排查

```bash
# 查看 LimitRange 相关事件
kubectl get events --field-selector reason=FailedCreate -n development

# 查看准入控制器日志（如果有权限）
kubectl logs -n kube-system -l component=kube-apiserver

# 验证 LimitRange 配置
kubectl get limitrange -o wide

# 检查命名空间中的所有资源限制
kubectl describe namespace development
```

## 故障排查

### 常见问题

| 问题 | 可能原因 | 解决方案 |
| ---- | ---- | ---- |
| Pod 创建失败 | 资源请求超出 LimitRange 限制 | 调整 Pod 资源请求或修改 LimitRange |
| 默认值未应用 | LimitRange 配置错误 | 检查 LimitRange 的 default 和 defaultRequest 配置 |
| 资源比例错误 | limit/request 比例超出限制 | 调整 maxLimitRequestRatio 或 Pod 资源配置 |
| PVC 创建失败 | 存储请求超出限制 | 调整 PVC 存储请求或修改 LimitRange |
| LimitRange 不生效 | 命名空间错误或资源类型不匹配 | 检查命名空间和资源类型配置 |

### 诊断步骤

1. **检查 LimitRange 配置**
```bash
# 确认 LimitRange 存在且配置正确
kubectl get limitrange -n <namespace>
kubectl describe limitrange <name> -n <namespace>
```

2. **验证资源请求**
```bash
# 检查失败的资源创建
kubectl describe pod <pod-name> -n <namespace>
kubectl get events --field-selector involvedObject.name=<pod-name> -n <namespace>
```

3. **测试限制**
```bash
# 创建测试资源验证限制
kubectl run test --image=nginx --dry-run=server -o yaml
```

### 常见错误和解决方案

```yaml
# 错误1：资源类型配置错误
# 错误的配置
spec:
  limits:
  - type: container  # 错误：应该是 Container（大写）
    resource: cpu

# 正确的配置
spec:
  limits:
  - type: Container  # 正确：首字母大写
    resource: cpu

---
# 错误2：资源单位错误
# 错误的配置
spec:
  limits:
  - type: Container
    resource: memory
    min: "128M"      # 错误：应该是 Mi
    max: "1G"        # 错误：应该是 Gi

# 正确的配置
spec:
  limits:
  - type: Container
    resource: memory
    min: "128Mi"     # 正确：使用 Mi
    max: "1Gi"       # 正确：使用 Gi

---
# 错误3：逻辑错误的限制
# 错误的配置
spec:
  limits:
  - type: Container
    resource: cpu
    min: "1"         # 错误：最小值大于默认值
    default: "500m"
    max: "2"

# 正确的配置
spec:
  limits:
  - type: Container
    resource: cpu
    min: "100m"      # 正确：min <= defaultRequest <= default <= max
    defaultRequest: "200m"
    default: "500m"
    max: "2"
```

## 最佳实践

### 1. 设计原则

```yaml
# 1. 分层设计：不同环境不同策略
apiVersion: v1
kind: LimitRange
metadata:
  name: production-strict
  namespace: prod
  labels:
    environment: production
    policy-level: strict
    review-required: "true"
  annotations:
    description: "生产环境严格资源限制"
    contact: "platform-team@company.com"
    last-review: "2024-01-15"
    next-review: "2024-04-15"
spec:
  limits:
  # 生产环境：严格但合理的限制
  - type: Container
    resource: cpu
    min: "100m"          # 确保最小性能
    max: "2"             # 防止资源垄断
    default: "500m"      # 合理的默认值
    defaultRequest: "200m"  # 保证基本资源
    maxLimitRequestRatio: 3  # 适度的突发能力
  
  - type: Container
    resource: memory
    min: "128Mi"         # 确保基本内存
    max: "4Gi"           # 防止内存泄漏影响
    default: "1Gi"       # 合理的默认值
    defaultRequest: "256Mi"  # 保证基本内存
    maxLimitRequestRatio: 2  # 内存突发控制

---
# 2. 渐进式限制：从宽松到严格
apiVersion: v1
kind: LimitRange
metadata:
  name: development-permissive
  namespace: dev
  labels:
    environment: development
    policy-level: permissive
spec:
  limits:
  # 开发环境：宽松限制，便于调试
  - type: Container
    resource: cpu
    min: "10m"           # 很小的最小值
    max: "4"             # 较大的最大值
    default: "200m"      # 适中的默认值
    defaultRequest: "50m"   # 较小的默认请求
    maxLimitRequestRatio: 10  # 大的突发比例
```

### 2. 监控和告警

```yaml
# Prometheus 监控规则
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: limitrange-monitoring
  namespace: monitoring
spec:
  groups:
  - name: limitrange.rules
    rules:
    # 监控资源使用接近限制的情况
    - alert: ContainerNearCPULimit
      expr: |
        (
          rate(container_cpu_usage_seconds_total{container!="POD",container!=""}[5m]) 
          / 
          on(pod, namespace, container) kube_pod_container_resource_limits{resource="cpu"}
        ) > 0.8
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "容器 CPU 使用接近限制"
        description: "{{ $labels.namespace }}/{{ $labels.pod }}/{{ $labels.container }} CPU 使用率 {{ $value | humanizePercentage }}"
    
    # 监控内存使用接近限制
    - alert: ContainerNearMemoryLimit
      expr: |
        (
          container_memory_working_set_bytes{container!="POD",container!=""} 
          / 
          on(pod, namespace, container) kube_pod_container_resource_limits{resource="memory"}
        ) > 0.9
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "容器内存使用接近限制"
        description: "{{ $labels.namespace }}/{{ $labels.pod }}/{{ $labels.container }} 内存使用率 {{ $value | humanizePercentage }}"
    
    # 监控 LimitRange 拒绝的资源创建
    - alert: LimitRangeViolations
      expr: increase(apiserver_admission_controller_admission_duration_seconds_count{name="LimitRanger",rejected="true"}[5m]) > 0
      for: 0m
      labels:
        severity: info
      annotations:
        summary: "LimitRange 拒绝了资源创建请求"
        description: "在过去 5 分钟内有 {{ $value }} 个资源创建请求被 LimitRange 拒绝"
```

### 3. 自动化管理

```bash
#!/bin/bash
# LimitRange 管理脚本

set -e

NAMESPACE=${1:-default}
ENVIRONMENT=${2:-development}

echo "为命名空间 $NAMESPACE 创建 $ENVIRONMENT 环境的 LimitRange"

# 根据环境选择不同的限制策略
case $ENVIRONMENT in
  "production")
    CPU_MIN="100m"
    CPU_MAX="2"
    CPU_DEFAULT="500m"
    CPU_REQUEST="200m"
    MEMORY_MIN="128Mi"
    MEMORY_MAX="4Gi"
    MEMORY_DEFAULT="1Gi"
    MEMORY_REQUEST="256Mi"
    ;;
  "staging")
    CPU_MIN="50m"
    CPU_MAX="3"
    CPU_DEFAULT="300m"
    CPU_REQUEST="100m"
    MEMORY_MIN="64Mi"
    MEMORY_MAX="6Gi"
    MEMORY_DEFAULT="512Mi"
    MEMORY_REQUEST="128Mi"
    ;;
  "development")
    CPU_MIN="10m"
    CPU_MAX="4"
    CPU_DEFAULT="200m"
    CPU_REQUEST="50m"
    MEMORY_MIN="32Mi"
    MEMORY_MAX="8Gi"
    MEMORY_DEFAULT="256Mi"
    MEMORY_REQUEST="64Mi"
    ;;
  *)
    echo "未知环境: $ENVIRONMENT"
    exit 1
    ;;
esac

# 生成 LimitRange YAML
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: LimitRange
metadata:
  name: ${ENVIRONMENT}-limits
  namespace: ${NAMESPACE}
  labels:
    environment: ${ENVIRONMENT}
    managed-by: automation
    created-at: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
spec:
  limits:
  - type: Container
    resource: cpu
    min: "${CPU_MIN}"
    max: "${CPU_MAX}"
    default: "${CPU_DEFAULT}"
    defaultRequest: "${CPU_REQUEST}"
    maxLimitRequestRatio: 4
  - type: Container
    resource: memory
    min: "${MEMORY_MIN}"
    max: "${MEMORY_MAX}"
    default: "${MEMORY_DEFAULT}"
    defaultRequest: "${MEMORY_REQUEST}"
    maxLimitRequestRatio: 2
EOF

echo "LimitRange 创建完成"

# 验证创建结果
kubectl get limitrange ${ENVIRONMENT}-limits -n ${NAMESPACE}
kubectl describe limitrange ${ENVIRONMENT}-limits -n ${NAMESPACE}
```

### 4. 测试和验证

```bash
#!/bin/bash
# LimitRange 测试脚本

NAMESPACE=${1:-test-limits}

echo "=== LimitRange 功能测试 ==="

# 创建测试命名空间
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# 应用测试 LimitRange
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: LimitRange
metadata:
  name: test-limits
  namespace: $NAMESPACE
spec:
  limits:
  - type: Container
    resource: cpu
    min: "100m"
    max: "1"
    default: "500m"
    defaultRequest: "200m"
  - type: Container
    resource: memory
    min: "128Mi"
    max: "2Gi"
    default: "1Gi"
    defaultRequest: "256Mi"
EOF

echo "1. 测试默认值应用..."
# 创建没有资源规格的 Pod
kubectl run test-default --image=nginx -n $NAMESPACE
sleep 2
echo "默认资源配置:"
kubectl get pod test-default -n $NAMESPACE -o jsonpath='{.spec.containers[0].resources}' | jq .

echo "2. 测试超出限制的请求..."
# 尝试创建超出限制的 Pod
kubectl run test-exceed --image=nginx --requests='cpu=2' -n $NAMESPACE 2>&1 | grep -i "exceeded" || echo "限制检查正常"

echo "3. 测试符合限制的请求..."
# 创建符合限制的 Pod
kubectl run test-valid --image=nginx --requests='cpu=200m,memory=256Mi' --limits='cpu=800m,memory=1.5Gi' -n $NAMESPACE
sleep 2
echo "有效资源配置:"
kubectl get pod test-valid -n $NAMESPACE -o jsonpath='{.spec.containers[0].resources}' | jq .

echo "4. 清理测试资源..."
kubectl delete namespace $NAMESPACE

echo "=== 测试完成 ==="
```

## 总结

LimitRange 是 Kubernetes 中重要的资源治理工具，它提供了细粒度的资源控制能力，确保集群资源的合理分配和使用。

**关键要点**：
- LimitRange 在命名空间级别控制资源使用，支持容器、Pod 和 PVC 的限制
- 提供最小值、最大值、默认值和默认请求值的设置
- 支持 CPU、内存、存储等多种资源类型的限制
- 在资源创建时通过准入控制器进行验证和默认值应用
- 是多租户环境和资源治理的重要组件
- 需要根据不同环境和工作负载类型制定合适的限制策略