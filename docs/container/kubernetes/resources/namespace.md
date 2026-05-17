# Namespace

## 概述

Namespace 是 Kubernetes 中用于创建虚拟集群的机制，它在同一个物理集群中提供了逻辑上的隔离。Namespace 为资源提供了作用域，使得不同的团队、项目或环境可以在同一个集群中共存而不相互干扰。

| 关键点 | 内容 |
| ---- | ---- |
| 核心作用 | 提供资源的逻辑隔离和作用域 |
| 默认 Namespace | default、kube-system、kube-public、kube-node-lease |
| 资源隔离 | 名称隔离、网络策略、资源配额 |
| 使用场景 | 多租户、环境隔离、团队协作 |

## Namespace 的本质

### 设计理念

* **多租户支持**：在同一集群中为不同用户或团队提供隔离的工作空间
* **资源组织**：将相关的资源逻辑地组织在一起
* **访问控制**：结合 RBAC 实现细粒度的权限控制
* **资源管理**：通过资源配额限制每个 Namespace 的资源使用

### 工作原理

```
物理集群
    ↓
逻辑分割（Namespace）
    ↓
├── development (开发环境)
├── staging (测试环境)
├── production (生产环境)
└── monitoring (监控系统)
```

### Namespace 的作用域

| 资源类型 | 是否受 Namespace 限制 | 说明 |
| ---- | ---- | ---- |
| Pod | 是 | 每个 Pod 属于特定的 Namespace |
| Service | 是 | Service 在 Namespace 内唯一 |
| ConfigMap/Secret | 是 | 配置和密钥在 Namespace 内隔离 |
| Deployment/StatefulSet | 是 | 工作负载控制器受 Namespace 限制 |
| PersistentVolume | 否 | PV 是集群级别的资源 |
| Node | 否 | 节点是集群级别的资源 |
| ClusterRole | 否 | 集群角色是全局的 |
| StorageClass | 否 | 存储类是集群级别的资源 |

## 默认 Namespace

Kubernetes 集群默认包含以下 Namespace：

### 1. default
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: default
  labels:
    name: default
```
- **用途**：默认的 Namespace，用户创建的资源如果不指定 Namespace 会放在这里
- **特点**：不能删除
- **建议**：生产环境中避免使用 default Namespace

### 2. kube-system
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kube-system
  labels:
    name: kube-system
```
- **用途**：存放 Kubernetes 系统组件
- **包含组件**：kube-dns、kube-proxy、kubernetes-dashboard 等
- **特点**：不应该在此 Namespace 中部署用户应用

### 3. kube-public
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kube-public
  labels:
    name: kube-public
```
- **用途**：存放公开可读的资源
- **特点**：所有用户（包括未认证用户）都可以读取
- **使用场景**：集群信息、公共配置等

### 4. kube-node-lease
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kube-node-lease
  labels:
    name: kube-node-lease
```
- **用途**：存放节点租约对象
- **作用**：提高节点心跳的性能
- **版本**：Kubernetes 1.13+ 引入

## 基本配置

### 1. 创建简单 Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: development
  labels:
    name: development
    environment: dev
    team: backend
```

### 2. 带有注解的 Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    name: production
    environment: prod
    team: platform
    cost-center: "12345"
  annotations:
    description: "Production environment for main application"
    contact: "platform-team@company.com"
    created-by: "DevOps Team"
    budget: "$10000/month"
```

### 3. 多环境 Namespace 配置

```yaml
# 开发环境
apiVersion: v1
kind: Namespace
metadata:
  name: dev
  labels:
    environment: development
    tier: non-production
    team: engineering

---
# 测试环境
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    environment: staging
    tier: non-production
    team: qa

---
# 生产环境
apiVersion: v1
kind: Namespace
metadata:
  name: prod
  labels:
    environment: production
    tier: production
    team: sre
    criticality: high
```

## 资源配额 (ResourceQuota)

### 1. 基本资源配额

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-quota
  namespace: development
spec:
  hard:
    # 计算资源限制
    requests.cpu: "4"      # CPU 请求总量
    requests.memory: 8Gi   # 内存请求总量
    limits.cpu: "8"        # CPU 限制总量
    limits.memory: 16Gi    # 内存限制总量
    
    # 存储资源限制
    requests.storage: 100Gi              # 存储请求总量
    persistentvolumeclaims: "10"         # PVC 数量限制
    
    # 对象数量限制
    pods: "20"                           # Pod 数量限制
    services: "10"                       # Service 数量限制
    secrets: "20"                        # Secret 数量限制
    configmaps: "20"                     # ConfigMap 数量限制
    replicationcontrollers: "5"          # RC 数量限制
```

### 2. 按存储类限制配额

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
  namespace: production
spec:
  hard:
    # 按存储类限制
    fast-ssd.storageclass.storage.k8s.io/requests.storage: 50Gi
    standard.storageclass.storage.k8s.io/requests.storage: 200Gi
    
    # 按存储类限制 PVC 数量
    fast-ssd.storageclass.storage.k8s.io/persistentvolumeclaims: "5"
    standard.storageclass.storage.k8s.io/persistentvolumeclaims: "20"
```

### 3. 按优先级类限制配额

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: priority-quota
  namespace: production
spec:
  hard:
    # 高优先级 Pod 的资源限制
    high-priority.priorityclass.scheduling.k8s.io/pods: "5"
    high-priority.priorityclass.scheduling.k8s.io/requests.cpu: "2"
    high-priority.priorityclass.scheduling.k8s.io/requests.memory: 4Gi
    
    # 普通优先级 Pod 的资源限制
    normal-priority.priorityclass.scheduling.k8s.io/pods: "15"
    normal-priority.priorityclass.scheduling.k8s.io/requests.cpu: "6"
    normal-priority.priorityclass.scheduling.k8s.io/requests.memory: 12Gi
```

## 限制范围 (LimitRange)

### 1. Pod 资源限制

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: pod-limit-range
  namespace: development
spec:
  limits:
  # Pod 级别限制
  - type: Pod
    max:
      cpu: "2"        # Pod 最大 CPU
      memory: 4Gi     # Pod 最大内存
    min:
      cpu: 100m       # Pod 最小 CPU
      memory: 128Mi   # Pod 最小内存
  
  # Container 级别限制
  - type: Container
    default:          # 默认限制（如果容器未指定）
      cpu: 500m
      memory: 512Mi
    defaultRequest:   # 默认请求（如果容器未指定）
      cpu: 100m
      memory: 128Mi
    max:              # 容器最大限制
      cpu: "1"
      memory: 2Gi
    min:              # 容器最小限制
      cpu: 50m
      memory: 64Mi
    maxLimitRequestRatio:  # 限制与请求的最大比例
      cpu: 4
      memory: 2
```

### 2. 存储限制

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: storage-limit-range
  namespace: development
spec:
  limits:
  # PVC 存储限制
  - type: PersistentVolumeClaim
    max:
      storage: 50Gi   # 单个 PVC 最大存储
    min:
      storage: 1Gi    # 单个 PVC 最小存储
```

## 网络策略 (NetworkPolicy)

### 1. Namespace 间网络隔离

```yaml
# 默认拒绝所有入站流量
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}  # 选择所有 Pod
  policyTypes:
  - Ingress

---
# 允许同 Namespace 内通信
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-same-namespace
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: production

---
# 允许特定 Namespace 访问
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-monitoring
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    ports:
    - protocol: TCP
      port: 8080
```

### 2. 跨 Namespace 服务访问

```yaml
# 允许前端访问后端服务
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: backend
spec:
  podSelector:
    matchLabels:
      tier: api
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: frontend
      podSelector:
        matchLabels:
          tier: web
    ports:
    - protocol: TCP
      port: 8080
```

## RBAC 权限控制

### 1. Namespace 级别的角色

```yaml
# 开发者角色
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: development
  name: developer
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps", "secrets"]
  verbs: ["get", "list", "create", "update", "patch", "delete"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["pods/log", "pods/exec"]
  verbs: ["get", "list"]

---
# 只读角色
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: viewer
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps"]
  verbs: ["get", "list"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list"]
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get", "list"]
```

### 2. 角色绑定

```yaml
# 绑定用户到开发者角色
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-binding
  namespace: development
subjects:
- kind: User
  name: john@company.com
  apiGroup: rbac.authorization.k8s.io
- kind: User
  name: jane@company.com
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: developer
  apiGroup: rbac.authorization.k8s.io

---
# 绑定服务账户到角色
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: app-service-account
  namespace: production
roleRef:
  kind: Role
  name: viewer
  apiGroup: rbac.authorization.k8s.io
```

## 命令行操作

### 创建和管理 Namespace

```bash
# 创建 Namespace
kubectl create namespace development
kubectl create ns dev  # 简写

# 从 YAML 文件创建
kubectl apply -f namespace.yaml

# 查看所有 Namespace
kubectl get namespaces
kubectl get ns  # 简写

# 查看特定 Namespace
kubectl get namespace development

# 查看 Namespace 详细信息
kubectl describe namespace development

# 删除 Namespace（会删除其中的所有资源）
kubectl delete namespace development
```

### 在特定 Namespace 中操作

```bash
# 在特定 Namespace 中创建资源
kubectl apply -f deployment.yaml -n development

# 查看特定 Namespace 中的资源
kubectl get pods -n development
kubectl get all -n development

# 设置默认 Namespace
kubectl config set-context --current --namespace=development

# 查看当前上下文的 Namespace
kubectl config view --minify | grep namespace

# 查看所有 Namespace 中的资源
kubectl get pods --all-namespaces
kubectl get pods -A  # 简写
```

### 资源配额管理

```bash
# 查看资源配额
kubectl get resourcequota -n development
kubectl describe resourcequota dev-quota -n development

# 查看限制范围
kubectl get limitrange -n development
kubectl describe limitrange pod-limit-range -n development

# 查看 Namespace 资源使用情况
kubectl top nodes
kubectl top pods -n development
```

## 实际应用场景

### 1. 多环境部署

```yaml
# 环境配置模板
apiVersion: v1
kind: Namespace
metadata:
  name: ${ENVIRONMENT}
  labels:
    environment: ${ENVIRONMENT}
    team: ${TEAM}
    project: ${PROJECT}

---
# 环境特定的资源配额
apiVersion: v1
kind: ResourceQuota
metadata:
  name: ${ENVIRONMENT}-quota
  namespace: ${ENVIRONMENT}
spec:
  hard:
    requests.cpu: ${CPU_REQUESTS}
    requests.memory: ${MEMORY_REQUESTS}
    limits.cpu: ${CPU_LIMITS}
    limits.memory: ${MEMORY_LIMITS}
    pods: ${MAX_PODS}

---
# 应用部署
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: ${ENVIRONMENT}
spec:
  replicas: ${REPLICAS}
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:${VERSION}
        env:
        - name: ENVIRONMENT
          value: ${ENVIRONMENT}
```

### 2. 多租户架构

```yaml
# 租户 A
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-a
  labels:
    tenant: tenant-a
    billing-id: "12345"
    tier: premium

---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-a-quota
  namespace: tenant-a
spec:
  hard:
    requests.cpu: "10"     # 高级租户更多资源
    requests.memory: 20Gi
    pods: "50"

---
# 租户 B
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-b
  labels:
    tenant: tenant-b
    billing-id: "67890"
    tier: standard

---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-b-quota
  namespace: tenant-b
spec:
  hard:
    requests.cpu: "5"      # 标准租户较少资源
    requests.memory: 10Gi
    pods: "25"
```

### 3. 微服务架构

```yaml
# 前端服务 Namespace
apiVersion: v1
kind: Namespace
metadata:
  name: frontend
  labels:
    tier: frontend
    team: ui-team

---
# 后端服务 Namespace
apiVersion: v1
kind: Namespace
metadata:
  name: backend
  labels:
    tier: backend
    team: api-team

---
# 数据层 Namespace
apiVersion: v1
kind: Namespace
metadata:
  name: data
  labels:
    tier: data
    team: data-team

---
# 共享服务 Namespace
apiVersion: v1
kind: Namespace
metadata:
  name: shared
  labels:
    tier: shared
    team: platform-team
```

## 故障排查

### 常见问题

| 问题 | 可能原因 | 解决方案 |
| ---- | ---- | ---- |
| 无法创建资源 | 资源配额限制 | 检查 ResourceQuota 设置 |
| Pod 无法启动 | LimitRange 限制 | 调整容器资源请求和限制 |
| 网络无法访问 | NetworkPolicy 阻止 | 检查网络策略配置 |
| 权限被拒绝 | RBAC 权限不足 | 检查角色和角色绑定 |
| Namespace 删除卡住 | 资源清理问题 | 强制删除残留资源 |

### 诊断步骤

1. **检查 Namespace 状态**
```bash
kubectl get namespace development -o yaml
kubectl describe namespace development
```

2. **检查资源配额使用情况**
```bash
kubectl describe resourcequota -n development
kubectl get resourcequota -n development -o yaml
```

3. **检查限制范围**
```bash
kubectl describe limitrange -n development
```

4. **检查网络策略**
```bash
kubectl get networkpolicy -n development
kubectl describe networkpolicy -n development
```

5. **检查 RBAC 权限**
```bash
kubectl get role,rolebinding -n development
kubectl describe rolebinding -n development
```

6. **强制删除 Namespace**
```bash
# 如果 Namespace 删除卡住
kubectl get namespace development -o json > temp.json
# 编辑 temp.json，删除 finalizers 字段
kubectl replace --raw "/api/v1/namespaces/development/finalize" -f temp.json
```

## 最佳实践

### 1. 命名规范

```yaml
# 推荐的命名规范
apiVersion: v1
kind: Namespace
metadata:
  name: myapp-production  # 应用名-环境
  labels:
    app: myapp
    environment: production
    team: backend
    cost-center: "engineering"
    version: v1
  annotations:
    description: "MyApp production environment"
    contact: "backend-team@company.com"
    documentation: "https://wiki.company.com/myapp"
    created-date: "2024-01-15"
```

### 2. 资源管理策略

```yaml
# 生产环境严格限制
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: myapp-production
spec:
  hard:
    # 计算资源
    requests.cpu: "20"      # 保守的资源分配
    requests.memory: 40Gi
    limits.cpu: "40"        # 允许突发使用
    limits.memory: 80Gi
    
    # 对象数量
    pods: "100"
    services: "20"
    persistentvolumeclaims: "10"
    
    # 存储
    requests.storage: 500Gi

---
# 开发环境宽松限制
apiVersion: v1
kind: ResourceQuota
metadata:
  name: development-quota
  namespace: myapp-development
spec:
  hard:
    requests.cpu: "5"       # 较少的资源分配
    requests.memory: 10Gi
    limits.cpu: "10"
    limits.memory: 20Gi
    pods: "50"
```

### 3. 安全配置

```yaml
# 网络安全策略
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: production-security
  namespace: myapp-production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  # 只允许来自负载均衡器的流量
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
  # 允许监控系统访问
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    ports:
    - protocol: TCP
      port: 8080
  egress:
  # 允许访问数据库
  - to:
    - namespaceSelector:
        matchLabels:
          name: database
    ports:
    - protocol: TCP
      port: 5432
  # 允许 DNS 查询
  - to: []
    ports:
    - protocol: UDP
      port: 53
```

### 4. 监控和告警

```yaml
# Prometheus 监控规则
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: namespace-alerts
  namespace: monitoring
spec:
  groups:
  - name: namespace.rules
    rules:
    - alert: NamespaceResourceQuotaExceeded
      expr: kube_resourcequota{type="hard"} - kube_resourcequota{type="used"} < 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Namespace {{ $labels.namespace }} resource quota exceeded"
        description: "Resource quota for {{ $labels.resource }} in namespace {{ $labels.namespace }} has been exceeded."
    
    - alert: NamespaceHighResourceUsage
      expr: (kube_resourcequota{type="used"} / kube_resourcequota{type="hard"}) > 0.8
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High resource usage in namespace {{ $labels.namespace }}"
        description: "Resource {{ $labels.resource }} usage in namespace {{ $labels.namespace }} is above 80%."
```

## 总结

Namespace 是 Kubernetes 中实现多租户和资源隔离的核心机制。通过合理使用 Namespace，可以在同一个集群中为不同的团队、项目或环境提供逻辑隔离，并结合资源配额、网络策略和 RBAC 实现细粒度的资源管理和访问控制。

**关键要点**：
- Namespace 提供逻辑隔离，不是物理隔离
- 结合 ResourceQuota 和 LimitRange 进行资源管理
- 使用 NetworkPolicy 实现网络隔离
- 通过 RBAC 控制访问权限
- 合理的命名和标签策略有助于管理和监控
- 删除 Namespace 会删除其中的所有资源