# ResourceQuota

## 概述

ResourceQuota 是 Kubernetes 中用于限制命名空间资源总量的对象。它可以限制命名空间中可以创建的对象数量，以及这些对象可以消耗的计算资源总量，为多租户环境提供资源隔离和公平分配。

| 关键点 | 内容 |
| ---- | ---- |
| 核心作用 | 限制命名空间内资源的总体使用量 |
| 作用范围 | 命名空间级别 |
| 限制类型 | 计算资源、存储资源、对象数量 |
| 执行机制 | 准入控制器实时检查 |
| 配额状态 | 实时跟踪已使用和剩余配额 |

## ResourceQuota 的本质

### 设计理念

* **资源总量控制**：限制命名空间内所有资源的总体使用量
* **多租户隔离**：为不同租户提供资源隔离和公平分配
* **预算管理**：类似云计算的资源预算概念
* **防止资源耗尽**：避免单个命名空间消耗过多集群资源

### 工作原理

```
资源创建请求 → ResourceQuota 检查 → 配额验证 → 更新使用量 → 资源创建
       ↓              ↓              ↓           ↓           ↓
   用户提交        准入控制器      检查剩余配额   更新计数器    成功/失败
```

### ResourceQuota vs LimitRange

| 特性 | ResourceQuota | LimitRange |
| ---- | ---- | ---- |
| 控制范围 | 命名空间总量 | 单个资源对象 |
| 限制类型 | 总量限制 | 单体限制 |
| 对象数量 | 支持 | 不支持 |
| 默认值 | 不支持 | 支持 |
| 使用场景 | 多租户资源分配 | 资源规范化 |

## 基本配置

### 1. 计算资源配额

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: development
  labels:
    quota-type: compute
    environment: development
spec:
  hard:
    # CPU 配额
    requests.cpu: "10"        # CPU 请求总量限制
    limits.cpu: "20"          # CPU 限制总量限制
    
    # 内存配额
    requests.memory: 20Gi     # 内存请求总量限制
    limits.memory: 40Gi       # 内存限制总量限制
    
    # 临时存储配额
    requests.ephemeral-storage: 50Gi   # 临时存储请求总量
    limits.ephemeral-storage: 100Gi    # 临时存储限制总量

---
# 测试 Pod - 消耗配额
apiVersion: v1
kind: Pod
metadata:
  name: quota-test-1
  namespace: development
spec:
  containers:
  - name: app
    image: nginx:1.20
    resources:
      requests:
        cpu: "1"          # 消耗 1 CPU 请求配额
        memory: 2Gi       # 消耗 2Gi 内存请求配额
      limits:
        cpu: "2"          # 消耗 2 CPU 限制配额
        memory: 4Gi       # 消耗 4Gi 内存限制配额

---
# 第二个 Pod
apiVersion: v1
kind: Pod
metadata:
  name: quota-test-2
  namespace: development
spec:
  containers:
  - name: app
    image: busybox:1.35
    resources:
      requests:
        cpu: "500m"       # 消耗 0.5 CPU 请求配额
        memory: 1Gi       # 消耗 1Gi 内存请求配额
      limits:
        cpu: "1"          # 消耗 1 CPU 限制配额
        memory: 2Gi       # 消耗 2Gi 内存限制配额

# 当前配额使用情况：
# CPU requests: 1.5/10, limits: 3/20
# Memory requests: 3Gi/20Gi, limits: 6Gi/40Gi
```

### 2. 对象数量配额

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: object-count-quota
  namespace: production
  labels:
    quota-type: object-count
    environment: production
spec:
  hard:
    # Pod 相关
    pods: "50"                    # 最多 50 个 Pod
    replicationcontrollers: "10"  # 最多 10 个 RC
    
    # 工作负载控制器
    deployments.apps: "20"        # 最多 20 个 Deployment
    replicasets.apps: "30"        # 最多 30 个 ReplicaSet
    statefulsets.apps: "5"        # 最多 5 个 StatefulSet
    daemonsets.apps: "3"          # 最多 3 个 DaemonSet
    jobs.batch: "10"              # 最多 10 个 Job
    cronjobs.batch: "5"           # 最多 5 个 CronJob
    
    # 服务和网络
    services: "20"                # 最多 20 个 Service
    services.loadbalancers: "3"   # 最多 3 个 LoadBalancer 服务
    services.nodeports: "5"       # 最多 5 个 NodePort 服务
    ingresses.networking.k8s.io: "10"  # 最多 10 个 Ingress
    
    # 配置和存储
    configmaps: "30"              # 最多 30 个 ConfigMap
    secrets: "20"                 # 最多 20 个 Secret
    persistentvolumeclaims: "15"  # 最多 15 个 PVC
    
    # RBAC
    roles.rbac.authorization.k8s.io: "10"         # 最多 10 个 Role
    rolebindings.rbac.authorization.k8s.io: "15"  # 最多 15 个 RoleBinding

---
# 测试对象创建
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-deployment-1
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: test-app-1
  template:
    metadata:
      labels:
        app: test-app-1
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

# 这个 Deployment 会：
# - 消耗 1 个 deployments.apps 配额
# - 创建 1 个 ReplicaSet（消耗 replicasets.apps 配额）
# - 创建 3 个 Pod（消耗 pods 配额）
```

### 3. 存储配额

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
  namespace: data-processing
  labels:
    quota-type: storage
    team: data-team
spec:
  hard:
    # 通用存储配额
    requests.storage: "1Ti"       # 总存储请求量限制
    persistentvolumeclaims: "20"  # PVC 数量限制
    
    # 按存储类别的配额
    fast-ssd.storageclass.storage.k8s.io/requests.storage: "500Gi"  # 高速 SSD 存储配额
    standard.storageclass.storage.k8s.io/requests.storage: "2Ti"    # 标准存储配额
    backup.storageclass.storage.k8s.io/requests.storage: "5Ti"     # 备份存储配额
    
    # 按存储类别的 PVC 数量
    fast-ssd.storageclass.storage.k8s.io/persistentvolumeclaims: "5"   # 高速 SSD PVC 数量
    standard.storageclass.storage.k8s.io/persistentvolumeclaims: "10"  # 标准 PVC 数量
    backup.storageclass.storage.k8s.io/persistentvolumeclaims: "20"    # 备份 PVC 数量

---
# 高速存储 PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: fast-data-pvc
  namespace: data-processing
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 100Gi    # 消耗 fast-ssd 存储配额

---
# 标准存储 PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: standard-data-pvc
  namespace: data-processing
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: standard
  resources:
    requests:
      storage: 500Gi    # 消耗 standard 存储配额

---
# 备份存储 PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: backup-pvc
  namespace: data-processing
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: backup
  resources:
    requests:
      storage: 1Ti      # 消耗 backup 存储配额
```

## 高级配置

### 1. 优先级类配额

```yaml
# 优先级类定义
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000
globalDefault: false
description: "高优先级工作负载"

---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority
value: 100
globalDefault: false
description: "低优先级工作负载"

---
# 按优先级的资源配额
apiVersion: v1
kind: ResourceQuota
metadata:
  name: priority-quota
  namespace: mixed-workloads
  labels:
    quota-type: priority-based
spec:
  hard:
    # 高优先级工作负载配额
    high-priority.priorityclass.scheduling.k8s.io/requests.cpu: "8"      # 高优先级 CPU 请求
    high-priority.priorityclass.scheduling.k8s.io/requests.memory: 16Gi   # 高优先级内存请求
    high-priority.priorityclass.scheduling.k8s.io/pods: "20"              # 高优先级 Pod 数量
    
    # 低优先级工作负载配额
    low-priority.priorityclass.scheduling.k8s.io/requests.cpu: "4"        # 低优先级 CPU 请求
    low-priority.priorityclass.scheduling.k8s.io/requests.memory: 8Gi     # 低优先级内存请求
    low-priority.priorityclass.scheduling.k8s.io/pods: "50"               # 低优先级 Pod 数量
    
    # 总体配额（所有优先级）
    requests.cpu: "15"           # 总 CPU 请求（高优先级 + 低优先级 + 默认）
    requests.memory: 30Gi        # 总内存请求
    pods: "100"                  # 总 Pod 数量

---
# 高优先级 Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-app
  namespace: mixed-workloads
spec:
  replicas: 3
  selector:
    matchLabels:
      app: critical-app
  template:
    metadata:
      labels:
        app: critical-app
    spec:
      priorityClassName: high-priority  # 使用高优先级
      containers:
      - name: app
        image: critical-service:v1.0
        resources:
          requests:
            cpu: "1"        # 消耗高优先级 CPU 配额
            memory: 2Gi     # 消耗高优先级内存配额
          limits:
            cpu: "2"
            memory: 4Gi

---
# 低优先级 Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-job
  namespace: mixed-workloads
spec:
  replicas: 5
  selector:
    matchLabels:
      app: batch-job
  template:
    metadata:
      labels:
        app: batch-job
    spec:
      priorityClassName: low-priority   # 使用低优先级
      containers:
      - name: worker
        image: batch-worker:v1.0
        resources:
          requests:
            cpu: "200m"     # 消耗低优先级 CPU 配额
            memory: 512Mi   # 消耗低优先级内存配额
          limits:
            cpu: "500m"
            memory: 1Gi
```

### 2. 作用域配额

```yaml
# 终止状态 Pod 配额
apiVersion: v1
kind: ResourceQuota
metadata:
  name: terminating-quota
  namespace: batch-processing
  labels:
    quota-type: terminating
spec:
  # 作用域：只对终止状态的 Pod 生效
  scopes:
  - Terminating
  hard:
    requests.cpu: "5"        # 终止状态 Pod 的 CPU 请求总量
    requests.memory: 10Gi    # 终止状态 Pod 的内存请求总量
    pods: "20"               # 终止状态 Pod 的数量

---
# 非终止状态 Pod 配额
apiVersion: v1
kind: ResourceQuota
metadata:
  name: not-terminating-quota
  namespace: batch-processing
spec:
  # 作用域：只对非终止状态的 Pod 生效
  scopes:
  - NotTerminating
  hard:
    requests.cpu: "20"       # 非终止状态 Pod 的 CPU 请求总量
    requests.memory: 40Gi    # 非终止状态 Pod 的内存请求总量
    pods: "50"               # 非终止状态 Pod 的数量

---
# BestEffort QoS 类配额
apiVersion: v1
kind: ResourceQuota
metadata:
  name: besteffort-quota
  namespace: experimental
spec:
  # 作用域：只对 BestEffort QoS 类的 Pod 生效
  scopes:
  - BestEffort
  hard:
    pods: "10"               # BestEffort Pod 数量限制

---
# NotBestEffort QoS 类配额
apiVersion: v1
kind: ResourceQuota
metadata:
  name: not-besteffort-quota
  namespace: experimental
spec:
  # 作用域：只对非 BestEffort QoS 类的 Pod 生效
  scopes:
  - NotBestEffort
  hard:
    requests.cpu: "10"       # 非 BestEffort Pod 的 CPU 请求
    requests.memory: 20Gi    # 非 BestEffort Pod 的内存请求
    pods: "30"               # 非 BestEffort Pod 数量
```

### 3. 多配额组合策略

```yaml
# 基础计算资源配额
apiVersion: v1
kind: ResourceQuota
metadata:
  name: base-compute-quota
  namespace: enterprise-app
  labels:
    quota-category: compute
    priority: high
spec:
  hard:
    # 基础计算资源
    requests.cpu: "50"           # 总 CPU 请求
    limits.cpu: "100"            # 总 CPU 限制
    requests.memory: 100Gi       # 总内存请求
    limits.memory: 200Gi         # 总内存限制
    requests.ephemeral-storage: 500Gi  # 总临时存储请求
    limits.ephemeral-storage: 1Ti      # 总临时存储限制

---
# 对象数量配额
apiVersion: v1
kind: ResourceQuota
metadata:
  name: object-quota
  namespace: enterprise-app
  labels:
    quota-category: objects
    priority: medium
spec:
  hard:
    # 核心对象
    pods: "200"                  # Pod 总数
    deployments.apps: "50"       # Deployment 数量
    services: "30"               # Service 数量
    configmaps: "100"            # ConfigMap 数量
    secrets: "50"                # Secret 数量
    
    # 存储对象
    persistentvolumeclaims: "30" # PVC 数量
    
    # 网络对象
    ingresses.networking.k8s.io: "20"  # Ingress 数量
    networkpolicies.networking.k8s.io: "10"  # NetworkPolicy 数量

---
# 存储专用配额
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
  namespace: enterprise-app
  labels:
    quota-category: storage
    priority: high
spec:
  hard:
    # 总存储配额
    requests.storage: "10Ti"     # 总存储请求
    
    # 按存储类型分配
    fast-ssd.storageclass.storage.k8s.io/requests.storage: "2Ti"    # 高速存储
    standard.storageclass.storage.k8s.io/requests.storage: "5Ti"   # 标准存储
    archive.storageclass.storage.k8s.io/requests.storage: "20Ti"   # 归档存储
    
    # 按存储类型的 PVC 数量
    fast-ssd.storageclass.storage.k8s.io/persistentvolumeclaims: "10"
    standard.storageclass.storage.k8s.io/persistentvolumeclaims: "15"
    archive.storageclass.storage.k8s.io/persistentvolumeclaims: "5"

---
# GPU 资源配额（如果集群支持）
apiVersion: v1
kind: ResourceQuota
metadata:
  name: gpu-quota
  namespace: enterprise-app
  labels:
    quota-category: gpu
    priority: critical
spec:
  hard:
    # GPU 资源
    requests.nvidia.com/gpu: "20"    # GPU 请求总数
    limits.nvidia.com/gpu: "20"      # GPU 限制总数
    
    # GPU 内存（如果支持）
    requests.nvidia.com/gpu-memory: "160Gi"  # GPU 内存请求
    limits.nvidia.com/gpu-memory: "160Gi"    # GPU 内存限制
```

## 实际应用场景

### 1. 多租户 SaaS 平台

```yaml
# 企业级租户配额
apiVersion: v1
kind: ResourceQuota
metadata:
  name: enterprise-tenant-quota
  namespace: tenant-enterprise-001
  labels:
    tenant-id: enterprise-001
    plan: enterprise
    billing-tier: premium
  annotations:
    tenant-name: "Acme Corporation"
    contract-start: "2024-01-01"
    contract-end: "2024-12-31"
    contact: "admin@acme.com"
spec:
  hard:
    # 计算资源 - 企业级配额
    requests.cpu: "100"          # 100 核 CPU 请求
    limits.cpu: "200"            # 200 核 CPU 限制
    requests.memory: 400Gi       # 400GB 内存请求
    limits.memory: 800Gi         # 800GB 内存限制
    
    # 对象数量 - 企业级限制
    pods: "500"                  # 500 个 Pod
    deployments.apps: "100"      # 100 个 Deployment
    services: "50"               # 50 个 Service
    services.loadbalancers: "10" # 10 个 LoadBalancer
    ingresses.networking.k8s.io: "20"  # 20 个 Ingress
    
    # 存储资源 - 企业级存储
    requests.storage: "50Ti"     # 50TB 存储
    persistentvolumeclaims: "100" # 100 个 PVC
    
    # 配置和密钥
    configmaps: "200"            # 200 个 ConfigMap
    secrets: "100"               # 100 个 Secret

---
# 标准租户配额
apiVersion: v1
kind: ResourceQuota
metadata:
  name: standard-tenant-quota
  namespace: tenant-standard-001
  labels:
    tenant-id: standard-001
    plan: standard
    billing-tier: medium
spec:
  hard:
    # 计算资源 - 标准配额
    requests.cpu: "20"           # 20 核 CPU 请求
    limits.cpu: "40"             # 40 核 CPU 限制
    requests.memory: 80Gi        # 80GB 内存请求
    limits.memory: 160Gi         # 160GB 内存限制
    
    # 对象数量 - 标准限制
    pods: "100"                  # 100 个 Pod
    deployments.apps: "20"       # 20 个 Deployment
    services: "15"               # 15 个 Service
    services.loadbalancers: "2"  # 2 个 LoadBalancer
    ingresses.networking.k8s.io: "5"   # 5 个 Ingress
    
    # 存储资源 - 标准存储
    requests.storage: "10Ti"     # 10TB 存储
    persistentvolumeclaims: "30" # 30 个 PVC
    
    # 配置和密钥
    configmaps: "50"             # 50 个 ConfigMap
    secrets: "30"                # 30 个 Secret

---
# 基础租户配额
apiVersion: v1
kind: ResourceQuota
metadata:
  name: basic-tenant-quota
  namespace: tenant-basic-001
  labels:
    tenant-id: basic-001
    plan: basic
    billing-tier: low
spec:
  hard:
    # 计算资源 - 基础配额
    requests.cpu: "5"            # 5 核 CPU 请求
    limits.cpu: "10"             # 10 核 CPU 限制
    requests.memory: 20Gi        # 20GB 内存请求
    limits.memory: 40Gi          # 40GB 内存限制
    
    # 对象数量 - 基础限制
    pods: "30"                   # 30 个 Pod
    deployments.apps: "10"       # 10 个 Deployment
    services: "5"                # 5 个 Service
    services.loadbalancers: "0"  # 不允许 LoadBalancer
    ingresses.networking.k8s.io: "2"   # 2 个 Ingress
    
    # 存储资源 - 基础存储
    requests.storage: "1Ti"      # 1TB 存储
    persistentvolumeclaims: "10" # 10 个 PVC
    
    # 配置和密钥
    configmaps: "20"             # 20 个 ConfigMap
    secrets: "10"                # 10 个 Secret
```

### 2. 开发环境资源管理

```yaml
# 开发团队 A 配额
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-team-a-quota
  namespace: dev-team-a
  labels:
    team: team-a
    environment: development
    cost-center: "engineering"
spec:
  hard:
    # 开发环境计算资源
    requests.cpu: "10"           # 10 核 CPU
    limits.cpu: "20"             # 20 核 CPU（允许突发）
    requests.memory: 40Gi        # 40GB 内存
    limits.memory: 80Gi          # 80GB 内存
    
    # 开发环境对象限制
    pods: "100"                  # 100 个 Pod
    deployments.apps: "30"       # 30 个 Deployment
    services: "20"               # 20 个 Service
    
    # 开发环境存储
    requests.storage: "5Ti"      # 5TB 存储（包含测试数据）
    persistentvolumeclaims: "50" # 50 个 PVC
    
    # 开发环境配置
    configmaps: "100"            # 100 个 ConfigMap（各种配置）
    secrets: "50"                # 50 个 Secret

---
# 测试环境配额
apiVersion: v1
kind: ResourceQuota
metadata:
  name: test-environment-quota
  namespace: testing
  labels:
    environment: testing
    purpose: integration-testing
spec:
  hard:
    # 测试环境需要稳定资源
    requests.cpu: "15"           # 15 核 CPU
    limits.cpu: "25"             # 25 核 CPU
    requests.memory: 60Gi        # 60GB 内存
    limits.memory: 100Gi         # 100GB 内存
    
    # 测试环境对象
    pods: "150"                  # 150 个 Pod（并行测试）
    deployments.apps: "40"       # 40 个 Deployment
    services: "30"               # 30 个 Service
    jobs.batch: "50"             # 50 个测试 Job
    
    # 测试数据存储
    requests.storage: "10Ti"     # 10TB 存储（测试数据）
    persistentvolumeclaims: "30" # 30 个 PVC

---
# 预发布环境配额
apiVersion: v1
kind: ResourceQuota
metadata:
  name: staging-environment-quota
  namespace: staging
  labels:
    environment: staging
    purpose: pre-production
spec:
  hard:
    # 预发布环境接近生产配置
    requests.cpu: "30"           # 30 核 CPU
    limits.cpu: "50"             # 50 核 CPU
    requests.memory: 120Gi       # 120GB 内存
    limits.memory: 200Gi         # 200GB 内存
    
    # 预发布环境对象
    pods: "200"                  # 200 个 Pod
    deployments.apps: "50"       # 50 个 Deployment
    services: "40"               # 40 个 Service
    ingresses.networking.k8s.io: "15"  # 15 个 Ingress
    
    # 预发布存储
    requests.storage: "20Ti"     # 20TB 存储
    persistentvolumeclaims: "40" # 40 个 PVC
```

### 3. 机器学习平台资源配额

```yaml
# ML 训练环境配额
apiVersion: v1
kind: ResourceQuota
metadata:
  name: ml-training-quota
  namespace: ml-training
  labels:
    workload-type: ml-training
    resource-intensive: "true"
    gpu-enabled: "true"
spec:
  hard:
    # 高计算需求
    requests.cpu: "200"          # 200 核 CPU（大规模训练）
    limits.cpu: "400"            # 400 核 CPU
    requests.memory: 1Ti         # 1TB 内存（大模型训练）
    limits.memory: 2Ti           # 2TB 内存
    
    # GPU 资源
    requests.nvidia.com/gpu: "50"    # 50 个 GPU
    limits.nvidia.com/gpu: "50"      # 50 个 GPU
    
    # 训练任务对象
    pods: "100"                  # 100 个训练 Pod
    jobs.batch: "200"            # 200 个训练 Job
    
    # 大量数据存储
    requests.storage: "500Ti"    # 500TB 存储（训练数据集）
    persistentvolumeclaims: "100" # 100 个 PVC
    
    # 模型和配置
    configmaps: "200"            # 200 个 ConfigMap（训练配置）
    secrets: "100"               # 100 个 Secret（API 密钥等）

---
# ML 推理环境配额
apiVersion: v1
kind: ResourceQuota
metadata:
  name: ml-inference-quota
  namespace: ml-inference
  labels:
    workload-type: ml-inference
    latency-sensitive: "true"
spec:
  hard:
    # 推理服务资源
    requests.cpu: "50"           # 50 核 CPU
    limits.cpu: "100"            # 100 核 CPU
    requests.memory: 200Gi       # 200GB 内存
    limits.memory: 400Gi         # 400GB 内存
    
    # 推理 GPU
    requests.nvidia.com/gpu: "20"    # 20 个 GPU
    limits.nvidia.com/gpu: "20"      # 20 个 GPU
    
    # 推理服务对象
    pods: "200"                  # 200 个推理 Pod
    deployments.apps: "50"       # 50 个推理 Deployment
    services: "50"               # 50 个推理 Service
    ingresses.networking.k8s.io: "20"  # 20 个 Ingress
    
    # 模型存储
    requests.storage: "50Ti"     # 50TB 存储（模型文件）
    persistentvolumeclaims: "50" # 50 个 PVC

---
# ML 实验环境配额
apiVersion: v1
kind: ResourceQuota
metadata:
  name: ml-experiment-quota
  namespace: ml-experiments
  labels:
    workload-type: ml-experiments
    temporary: "true"
spec:
  hard:
    # 实验环境资源
    requests.cpu: "30"           # 30 核 CPU
    limits.cpu: "60"             # 60 核 CPU
    requests.memory: 120Gi       # 120GB 内存
    limits.memory: 240Gi         # 240GB 内存
    
    # 实验 GPU
    requests.nvidia.com/gpu: "10"    # 10 个 GPU
    limits.nvidia.com/gpu: "10"      # 10 个 GPU
    
    # 实验对象（较多短期任务）
    pods: "300"                  # 300 个实验 Pod
    jobs.batch: "500"            # 500 个实验 Job
    
    # 实验数据存储
    requests.storage: "100Ti"    # 100TB 存储（实验数据）
    persistentvolumeclaims: "200" # 200 个 PVC
```

## 命令行操作

### 基本操作

```bash
# 查看 ResourceQuota
kubectl get resourcequotas
kubectl get resourcequota -n production
kubectl get quota  # 简写形式

# 查看详细信息
kubectl describe resourcequota compute-quota -n development
kubectl get resourcequota compute-quota -o yaml

# 查看所有命名空间的配额
kubectl get resourcequotas --all-namespaces

# 查看配额使用情况
kubectl get resourcequota -o wide
```

### 配额状态监控

```bash
# 查看配额使用详情
kubectl describe resourcequota -n production

# 查看特定配额的使用情况
kubectl get resourcequota compute-quota -n development -o jsonpath='{.status}' | jq .

# 监控配额使用变化
watch kubectl get resourcequota -n production

# 查看配额相关事件
kubectl get events --field-selector reason=FailedCreate -n production
```

### 创建和管理

```bash
# 从文件创建 ResourceQuota
kubectl apply -f resourcequota.yaml

# 更新 ResourceQuota
kubectl apply -f updated-resourcequota.yaml

# 删除 ResourceQuota
kubectl delete resourcequota compute-quota -n development

# 批量删除
kubectl delete resourcequotas --all -n test-namespace
```

### 配额验证和测试

```bash
# 测试配额限制
# 1. 尝试创建超出配额的资源
kubectl run test-pod --image=nginx --requests='cpu=100' -n development
# 应该失败并显示配额错误

# 2. 查看当前配额使用情况
kubectl describe resourcequota -n development

# 3. 创建符合配额的资源
kubectl run test-pod --image=nginx --requests='cpu=1,memory=1Gi' -n development

# 4. 再次查看配额使用情况
kubectl describe resourcequota -n development
```

### 配额分析脚本

```bash
#!/bin/bash
# 配额使用分析脚本

NAMESPACE=${1:-default}

echo "=== ResourceQuota 使用分析 - $NAMESPACE ==="

# 检查是否存在 ResourceQuota
if ! kubectl get resourcequota -n $NAMESPACE &>/dev/null; then
    echo "命名空间 $NAMESPACE 中没有 ResourceQuota"
    exit 0
fi

# 获取所有 ResourceQuota
echo "1. ResourceQuota 列表:"
kubectl get resourcequota -n $NAMESPACE
echo

# 详细使用情况
echo "2. 详细使用情况:"
for quota in $(kubectl get resourcequota -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}'); do
    echo "--- $quota ---"
    kubectl describe resourcequota $quota -n $NAMESPACE | grep -A 20 "Resource\|Used\|Hard"
    echo
done

# 计算使用率
echo "3. 使用率分析:"
kubectl get resourcequota -n $NAMESPACE -o json | jq -r '
  .items[] | 
  "\(.metadata.name):" as $name |
  .status.hard as $hard |
  .status.used as $used |
  $hard | keys[] as $resource |
  if $used[$resource] then
    ($used[$resource] | tonumber) / ($hard[$resource] | tonumber) * 100 as $percentage |
    "  \($resource): \($used[$resource])/\($hard[$resource]) (\($percentage | floor)%)"
  else
    "  \($resource): 0/\($hard[$resource]) (0%)"
  end
'

echo "=== 分析完成 ==="
```

## 故障排查

### 常见问题

| 问题 | 可能原因 | 解决方案 |
| ---- | ---- | ---- |
| 资源创建失败 | 超出 ResourceQuota 限制 | 检查配额使用情况，调整配额或删除不需要的资源 |
| 配额未生效 | 命名空间错误或配额配置错误 | 检查命名空间和配额配置 |
| 配额计算错误 | 资源单位不匹配 | 检查资源单位（CPU、内存、存储） |
| 无法删除资源 | 配额控制器问题 | 检查 kube-controller-manager 日志 |
| 配额状态不更新 | 控制器同步问题 | 重启相关控制器或等待同步 |

### 诊断步骤

1. **检查配额配置**
```bash
# 确认 ResourceQuota 存在且配置正确
kubectl get resourcequota -n <namespace>
kubectl describe resourcequota <name> -n <namespace>
```

2. **检查配额使用情况**
```bash
# 查看当前使用情况
kubectl describe resourcequota -n <namespace>

# 查看配额状态
kubectl get resourcequota -o yaml -n <namespace>
```

3. **检查失败的资源创建**
```bash
# 查看相关事件
kubectl get events --field-selector reason=FailedCreate -n <namespace>

# 查看具体错误信息
kubectl describe pod <pod-name> -n <namespace>
```

4. **验证资源计算**
```bash
# 手动计算资源使用
kubectl get pods -n <namespace> -o json | jq '.items[].spec.containers[].resources.requests'
```

### 常见错误和解决方案

```yaml
# 错误1：资源单位不一致
# 错误的配置
spec:
  hard:
    requests.memory: "10G"    # 错误：应该使用 Gi
    requests.cpu: "10000m"    # 可以，但建议使用 "10"

# 正确的配置
spec:
  hard:
    requests.memory: "10Gi"   # 正确：使用 Gi
    requests.cpu: "10"        # 正确：使用核数

---
# 错误2：配额范围配置错误
# 错误的配置
spec:
  scopes:
  - terminating           # 错误：应该是 Terminating
  hard:
    pods: "10"

# 正确的配置
spec:
  scopes:
  - Terminating           # 正确：首字母大写
  hard:
    pods: "10"

---
# 错误3：存储类配额配置错误
# 错误的配置
spec:
  hard:
    fast-ssd.storageclass.storage.k8s.io/request.storage: "100Gi"  # 错误：request 应该是 requests

# 正确的配置
spec:
  hard:
    fast-ssd.storageclass.storage.k8s.io/requests.storage: "100Gi"  # 正确：使用 requests
```

## 最佳实践

### 1. 配额设计原则

```yaml
# 1. 分层配额设计
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-base-quota
  namespace: production
  labels:
    quota-tier: base
    environment: production
    review-cycle: quarterly
  annotations:
    description: "生产环境基础资源配额"
    owner: "platform-team@company.com"
    last-review: "2024-01-15"
    next-review: "2024-04-15"
    escalation-contact: "sre-team@company.com"
spec:
  hard:
    # 保守的基础配额
    requests.cpu: "50"           # 基础 CPU 配额
    limits.cpu: "100"            # 基础 CPU 限制
    requests.memory: 200Gi       # 基础内存配额
    limits.memory: 400Gi         # 基础内存限制
    
    # 基础对象数量
    pods: "200"                  # 基础 Pod 数量
    deployments.apps: "50"       # 基础 Deployment 数量
    services: "30"               # 基础 Service 数量
    
    # 基础存储
    requests.storage: "50Ti"     # 基础存储配额
    persistentvolumeclaims: "100" # 基础 PVC 数量

---
# 2. 渐进式配额增长
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-extended-quota
  namespace: production
  labels:
    quota-tier: extended
    environment: production
    approval-required: "true"
spec:
  hard:
    # 扩展配额（需要审批）
    requests.cpu: "100"          # 扩展 CPU 配额
    limits.cpu: "200"            # 扩展 CPU 限制
    requests.memory: 500Gi       # 扩展内存配额
    limits.memory: 1Ti           # 扩展内存限制
    
    # 扩展对象数量
    pods: "500"                  # 扩展 Pod 数量
    deployments.apps: "100"      # 扩展 Deployment 数量
    services: "80"               # 扩展 Service 数量
    
    # 扩展存储
    requests.storage: "200Ti"    # 扩展存储配额
    persistentvolumeclaims: "300" # 扩展 PVC 数量
```

### 2. 监控和告警

```yaml
# Prometheus 监控规则
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: resourcequota-monitoring
  namespace: monitoring
spec:
  groups:
  - name: resourcequota.rules
    rules:
    # 配额使用率监控
    - record: kubernetes:resourcequota:usage_ratio
      expr: |
        (
          kube_resourcequota{type="used"} 
          / 
          kube_resourcequota{type="hard"}
        ) * 100
    
    # CPU 配额使用率告警
    - alert: ResourceQuotaCPUUsageHigh
      expr: |
        (
          kube_resourcequota{resource="requests.cpu", type="used"} 
          / 
          kube_resourcequota{resource="requests.cpu", type="hard"}
        ) * 100 > 80
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "命名空间 CPU 配额使用率过高"
        description: "命名空间 {{ $labels.namespace }} 的 CPU 配额使用率为 {{ $value | humanizePercentage }}"
    
    # 内存配额使用率告警
    - alert: ResourceQuotaMemoryUsageHigh
      expr: |
        (
          kube_resourcequota{resource="requests.memory", type="used"} 
          / 
          kube_resourcequota{resource="requests.memory", type="hard"}
        ) * 100 > 85
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "命名空间内存配额使用率过高"
        description: "命名空间 {{ $labels.namespace }} 的内存配额使用率为 {{ $value | humanizePercentage }}"
    
    # 配额即将耗尽告警
    - alert: ResourceQuotaNearExhaustion
      expr: |
        (
          kube_resourcequota{type="used"} 
          / 
          kube_resourcequota{type="hard"}
        ) * 100 > 95
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "资源配额即将耗尽"
        description: "命名空间 {{ $labels.namespace }} 的 {{ $labels.resource }} 配额使用率为 {{ $value | humanizePercentage }}，即将耗尽"
    
    # Pod 数量配额告警
    - alert: ResourceQuotaPodCountHigh
      expr: |
        (
          kube_resourcequota{resource="pods", type="used"} 
          / 
          kube_resourcequota{resource="pods", type="hard"}
        ) * 100 > 90
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Pod 数量配额使用率过高"
        description: "命名空间 {{ $labels.namespace }} 的 Pod 数量配额使用率为 {{ $value | humanizePercentage }}"
```

### 3. 自动化配额管理

```bash
#!/bin/bash
# 自动配额管理脚本

set -e

# 配置
CONFIG_FILE="/etc/kubernetes/quota-config.yaml"
LOG_FILE="/var/log/quota-manager.log"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL}"

# 日志函数
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

# 发送 Slack 通知
send_slack_notification() {
    local message="$1"
    local color="$2"
    
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"$color\",\"text\":\"$message\"}]}" \
            $SLACK_WEBHOOK
    fi
}

# 检查配额使用率
check_quota_usage() {
    local namespace="$1"
    local threshold="${2:-80}"
    
    log "检查命名空间 $namespace 的配额使用情况"
    
    # 获取配额使用情况
    local quota_data=$(kubectl get resourcequota -n $namespace -o json 2>/dev/null)
    
    if [[ -z "$quota_data" ]]; then
        log "命名空间 $namespace 中没有 ResourceQuota"
        return 0
    fi
    
    # 分析每个配额项
    echo "$quota_data" | jq -r '
        .items[] |
        .metadata.name as $quota_name |
        .status.hard as $hard |
        .status.used as $used |
        $hard | keys[] as $resource |
        if $used[$resource] then
            ($used[$resource] | tonumber) / ($hard[$resource] | tonumber) * 100 as $percentage |
            if $percentage > '$threshold' then
                "WARNING: \($quota_name)/\($resource): \($percentage | floor)% (\($used[$resource])/\($hard[$resource]))"
            else
                "OK: \($quota_name)/\($resource): \($percentage | floor)% (\($used[$resource])/\($hard[$resource]))"
            end
        else
            "OK: \($quota_name)/\($resource): 0% (0/\($hard[$resource]))"
        end
    ' | while read line; do
        if [[ $line == WARNING:* ]]; then
            log "$line"
            send_slack_notification "🚨 配额告警: $namespace - $line" "warning"
        else
            log "$line"
        fi
    done
}

# 自动扩展配额
auto_scale_quota() {
    local namespace="$1"
    local resource="$2"
    local current_usage="$3"
    local current_limit="$4"
    local usage_percentage="$5"
    
    # 如果使用率超过 90%，自动扩展 20%
    if (( $(echo "$usage_percentage > 90" | bc -l) )); then
        local new_limit=$(echo "$current_limit * 1.2" | bc -l | cut -d. -f1)
        
        log "自动扩展配额: $namespace/$resource 从 $current_limit 扩展到 $new_limit"
        
        # 这里应该调用配额更新 API 或生成配额更新请求
        # kubectl patch resourcequota ... (需要具体实现)
        
        send_slack_notification "📈 自动配额扩展: $namespace/$resource $current_limit → $new_limit" "good"
    fi
}

# 生成配额报告
generate_quota_report() {
    local output_file="/tmp/quota-report-$(date +%Y%m%d).html"
    
    log "生成配额使用报告: $output_file"
    
    cat > $output_file << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Kubernetes ResourceQuota 使用报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .warning { background-color: #fff3cd; }
        .critical { background-color: #f8d7da; }
        .ok { background-color: #d4edda; }
    </style>
</head>
<body>
    <h1>Kubernetes ResourceQuota 使用报告</h1>
    <p>生成时间: $(date)</p>
    <table>
        <tr>
            <th>命名空间</th>
            <th>配额名称</th>
            <th>资源类型</th>
            <th>已使用</th>
            <th>总配额</th>
            <th>使用率</th>
            <th>状态</th>
        </tr>
EOF
    
    # 获取所有命名空间的配额信息
    for namespace in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
        kubectl get resourcequota -n $namespace -o json 2>/dev/null | jq -r '
            .items[] |
            .metadata.name as $quota_name |
            .metadata.namespace as $ns |
            .status.hard as $hard |
            .status.used as $used |
            $hard | keys[] as $resource |
            if $used[$resource] then
                ($used[$resource] | tonumber) / ($hard[$resource] | tonumber) * 100 as $percentage |
                if $percentage > 90 then
                    "        <tr class=\"critical\"><td>\($ns)</td><td>\($quota_name)</td><td>\($resource)</td><td>\($used[$resource])</td><td>\($hard[$resource])</td><td>\($percentage | floor)%</td><td>危险</td></tr>"
                elif $percentage > 80 then
                    "        <tr class=\"warning\"><td>\($ns)</td><td>\($quota_name)</td><td>\($resource)</td><td>\($used[$resource])</td><td>\($hard[$resource])</td><td>\($percentage | floor)%</td><td>警告</td></tr>"
                else
                    "        <tr class=\"ok\"><td>\($ns)</td><td>\($quota_name)</td><td>\($resource)</td><td>\($used[$resource])</td><td>\($hard[$resource])</td><td>\($percentage | floor)%</td><td>正常</td></tr>"
                end
            else
                "        <tr class=\"ok\"><td>\($ns)</td><td>\($quota_name)</td><td>\($resource)</td><td>0</td><td>\($hard[$resource])</td><td>0%</td><td>正常</td></tr>"
            end
        ' >> $output_file
    done
    
    cat >> $output_file << 'EOF'
    </table>
</body>
</html>
EOF
    
    log "配额报告已生成: $output_file"
}

# 主函数
main() {
    log "开始配额管理任务"
    
    # 检查所有命名空间的配额使用情况
    for namespace in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
        check_quota_usage $namespace 80
    done
    
    # 生成每日报告
    if [[ $(date +%H) == "09" ]]; then  # 每天上午 9 点生成报告
        generate_quota_report
    fi
    
    log "配额管理任务完成"
}

# 执行主函数
main "$@"
```

## 总结

ResourceQuota 是 Kubernetes 中重要的资源治理工具，它提供了命名空间级别的资源总量控制，是多租户环境和资源管理的核心组件。

**关键要点**：
- ResourceQuota 控制命名空间内资源的总体使用量，包括计算资源、存储资源和对象数量
- 支持多种配额类型和作用域，可以精确控制不同类型资源的使用
- 通过准入控制器实时检查和更新配额使用情况
- 是多租户环境资源隔离和公平分配的重要保障
- 需要结合监控告警和自动化管理来确保配额策略的有效执行
- 应该根据业务需求和环境特点制定合适的配额策略