# ServiceAccount

## 概述

ServiceAccount 是 Kubernetes 中用于为 Pod 提供身份标识的机制。它允许 Pod 中的应用程序安全地访问 Kubernetes API 服务器和其他集群资源。ServiceAccount 是实现 Pod 级别身份验证和授权的基础。

| 关键点 | 内容 |
| ---- | ---- |
| 核心作用 | 为 Pod 提供身份标识和 API 访问凭证 |
| 默认行为 | 每个 Namespace 都有一个 default ServiceAccount |
| 认证方式 | 基于 JWT Token 的身份验证 |
| 使用场景 | API 访问、RBAC 授权、镜像拉取认证 |

## ServiceAccount 的本质

### 设计理念

* **身份隔离**：为不同的应用提供独立的身份标识
* **最小权限原则**：每个应用只获得必要的权限
* **自动化管理**：自动为 Pod 注入认证凭证
* **安全访问**：提供安全的 API 访问机制

### 工作原理

```
ServiceAccount 创建
    ↓
自动生成 Secret (JWT Token)
    ↓
Pod 使用 ServiceAccount
    ↓
自动挂载 Token 到 Pod
    ↓
应用使用 Token 访问 API
```

### 与用户账户的区别

| 特性 | ServiceAccount | User Account |
| ---- | ---- | ---- |
| 作用域 | Namespace 级别 | 集群级别 |
| 管理方式 | Kubernetes 管理 | 外部系统管理 |
| 使用对象 | Pod/应用程序 | 人类用户 |
| 认证方式 | JWT Token | 证书/OIDC/其他 |
| 生命周期 | 与 Namespace 绑定 | 独立管理 |

## 默认 ServiceAccount

每个 Namespace 都会自动创建一个名为 `default` 的 ServiceAccount：

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: default
  namespace: default
  uid: 12345678-1234-1234-1234-123456789012
  resourceVersion: "12345"
  creationTimestamp: "2024-01-15T10:00:00Z"
secrets:
- name: default-token-abcde
automountServiceAccountToken: true
```

### 默认行为

```yaml
# Pod 默认使用 default ServiceAccount
apiVersion: v1
kind: Pod
metadata:
  name: example-pod
spec:
  # 如果不指定，默认使用 default ServiceAccount
  serviceAccountName: default
  containers:
  - name: app
    image: nginx
    # Token 自动挂载到 /var/run/secrets/kubernetes.io/serviceaccount/
```

## 基本配置

### 1. 创建简单 ServiceAccount

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-service-account
  namespace: default
  labels:
    app: myapp
    component: backend
  annotations:
    description: "Service account for backend application"
automountServiceAccountToken: true
```

### 2. 禁用自动挂载 Token

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: no-token-sa
  namespace: default
# 禁用自动挂载 Token（提高安全性）
automountServiceAccountToken: false
```

### 3. 带有镜像拉取密钥的 ServiceAccount

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: registry-sa
  namespace: default
# 关联镜像拉取密钥
imagePullSecrets:
- name: docker-registry-secret
- name: private-registry-secret
automountServiceAccountToken: true
```

## 在 Pod 中使用 ServiceAccount

### 1. 指定 ServiceAccount

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  serviceAccountName: my-service-account
  containers:
  - name: app
    image: myapp:latest
    # Token 会自动挂载到容器中
```

### 2. 禁用 Token 自动挂载

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  serviceAccountName: my-service-account
  # Pod 级别禁用自动挂载
  automountServiceAccountToken: false
  containers:
  - name: app
    image: myapp:latest
```

### 3. Deployment 中使用 ServiceAccount

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      serviceAccountName: myapp-sa
      containers:
      - name: app
        image: myapp:latest
        ports:
        - containerPort: 8080
```

## RBAC 权限配置

### 1. 创建角色和角色绑定

```yaml
# ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: pod-reader
  namespace: default

---
# 角色定义
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: pod-reader-role
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get", "list"]

---
# 角色绑定
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: pod-reader-binding
  namespace: default
subjects:
- kind: ServiceAccount
  name: pod-reader
  namespace: default
roleRef:
  kind: Role
  name: pod-reader-role
  apiGroup: rbac.authorization.k8s.io
```

### 2. 集群级别权限

```yaml
# ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cluster-admin-sa
  namespace: kube-system

---
# 集群角色绑定
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-admin-binding
subjects:
- kind: ServiceAccount
  name: cluster-admin-sa
  namespace: kube-system
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
```

### 3. 自定义集群角色

```yaml
# 自定义集群角色
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: node-reader
rules:
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["metrics.k8s.io"]
  resources: ["nodes", "pods"]
  verbs: ["get", "list"]

---
# ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: monitoring-sa
  namespace: monitoring

---
# 集群角色绑定
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: monitoring-binding
subjects:
- kind: ServiceAccount
  name: monitoring-sa
  namespace: monitoring
roleRef:
  kind: ClusterRole
  name: node-reader
  apiGroup: rbac.authorization.k8s.io
```

## Token 管理

### 1. 查看 ServiceAccount Token

```bash
# 查看 ServiceAccount
kubectl get serviceaccount my-service-account -o yaml

# 查看关联的 Secret
kubectl get secret

# 获取 Token
kubectl get secret my-service-account-token-xxxxx -o jsonpath='{.data.token}' | base64 -d
```

### 2. 手动创建 Token Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-sa-token
  namespace: default
  annotations:
    kubernetes.io/service-account.name: my-service-account
type: kubernetes.io/service-account-token
```

### 3. 长期 Token（Kubernetes 1.24+）

```bash
# 创建长期 Token
kubectl create token my-service-account --duration=8760h

# 创建不过期的 Token Secret
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: my-sa-secret
  namespace: default
  annotations:
    kubernetes.io/service-account.name: my-service-account
type: kubernetes.io/service-account-token
EOF
```

## 高级配置

### 1. 多个镜像拉取密钥

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: multi-registry-sa
  namespace: default
imagePullSecrets:
- name: docker-hub-secret
- name: gcr-secret
- name: private-registry-secret
automountServiceAccountToken: true

---
# Docker Hub 密钥
apiVersion: v1
kind: Secret
metadata:
  name: docker-hub-secret
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: eyJhdXRocyI6eyJodHRwczovL2luZGV4LmRvY2tlci5pby92MS8iOnsidXNlcm5hbWUiOiJ1c2VyIiwicGFzc3dvcmQiOiJwYXNzIiwiYXV0aCI6ImRYTmxjanB3WVhOeiJ9fX0=

---
# 私有仓库密钥
apiVersion: v1
kind: Secret
metadata:
  name: private-registry-secret
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: eyJhdXRocyI6eyJwcml2YXRlLXJlZ2lzdHJ5LmNvbSI6eyJ1c2VybmFtZSI6InVzZXIiLCJwYXNzd29yZCI6InBhc3MiLCJhdXRoIjoiZFhObGNqcHdZWE56In19fQ==
```

### 2. 条件性 Token 挂载

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: conditional-token-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: conditional-app
  template:
    metadata:
      labels:
        app: conditional-app
    spec:
      serviceAccountName: api-access-sa
      containers:
      # 需要 API 访问的容器
      - name: api-client
        image: api-client:latest
        # 自动挂载 Token
      
      # 不需要 API 访问的容器
      - name: sidecar
        image: sidecar:latest
        # 可以通过 securityContext 禁用
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
      
      # 显式禁用整个 Pod 的 Token 挂载
      # automountServiceAccountToken: false
```

### 3. 投影卷中的 ServiceAccount Token

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: projected-token-pod
spec:
  serviceAccountName: my-service-account
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: projected-token
      mountPath: /var/run/secrets/tokens
      readOnly: true
  volumes:
  - name: projected-token
    projected:
      sources:
      - serviceAccountToken:
          path: token
          expirationSeconds: 3600  # 1小时过期
          audience: api
      - configMap:
          name: app-config
          items:
          - key: config.yaml
            path: config.yaml
      - secret:
          name: app-secret
          items:
          - key: password
            path: password
```

## 实际应用场景

### 1. 监控系统 ServiceAccount

```yaml
# Prometheus ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prometheus
  namespace: monitoring

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: prometheus
rules:
- apiGroups: [""]
  resources:
  - nodes
  - nodes/proxy
  - services
  - endpoints
  - pods
  verbs: ["get", "list", "watch"]
- apiGroups:
  - extensions
  resources:
  - ingresses
  verbs: ["get", "list", "watch"]
- nonResourceURLs: ["/metrics"]
  verbs: ["get"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: prometheus
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus
subjects:
- kind: ServiceAccount
  name: prometheus
  namespace: monitoring

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      serviceAccountName: prometheus
      containers:
      - name: prometheus
        image: prom/prometheus:latest
        ports:
        - containerPort: 9090
```

### 2. CI/CD 系统 ServiceAccount

```yaml
# Jenkins ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: jenkins
  namespace: ci-cd

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: jenkins
rules:
# Pod 管理权限
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]
- apiGroups: [""]
  resources: ["pods/exec"]
  verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get", "list", "watch"]
# Secret 管理权限
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list", "create", "update", "delete"]
# Deployment 管理权限
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: jenkins
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: jenkins
subjects:
- kind: ServiceAccount
  name: jenkins
  namespace: ci-cd
```

### 3. 应用程序 ServiceAccount

```yaml
# 微服务应用 ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: microservice-sa
  namespace: production
imagePullSecrets:
- name: private-registry

---
# 应用特定权限
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: microservice-role
rules:
# 读取配置
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list"]
# 服务发现
- apiGroups: [""]
  resources: ["services", "endpoints"]
  verbs: ["get", "list"]
# 健康检查
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get"]
  resourceNames: ["self"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: microservice-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: microservice-sa
  namespace: production
roleRef:
  kind: Role
  name: microservice-role
  apiGroup: rbac.authorization.k8s.io

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: microservice
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: microservice
  template:
    metadata:
      labels:
        app: microservice
    spec:
      serviceAccountName: microservice-sa
      containers:
      - name: app
        image: private-registry.com/microservice:v1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: KUBERNETES_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: KUBERNETES_POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
```

## 命令行操作

### 基本操作

```bash
# 创建 ServiceAccount
kubectl create serviceaccount my-sa
kubectl create sa my-sa  # 简写

# 查看 ServiceAccount
kubectl get serviceaccount
kubectl get sa  # 简写

# 查看特定 ServiceAccount
kubectl get sa my-sa -o yaml
kubectl describe sa my-sa

# 删除 ServiceAccount
kubectl delete sa my-sa
```

### Token 操作

```bash
# 创建 Token（Kubernetes 1.24+）
kubectl create token my-sa
kubectl create token my-sa --duration=1h
kubectl create token my-sa --audience=api

# 获取 ServiceAccount 的 Secret
kubectl get sa my-sa -o jsonpath='{.secrets[0].name}'

# 获取 Token 内容
SECRET_NAME=$(kubectl get sa my-sa -o jsonpath='{.secrets[0].name}')
kubectl get secret $SECRET_NAME -o jsonpath='{.data.token}' | base64 -d

# 获取 CA 证书
kubectl get secret $SECRET_NAME -o jsonpath='{.data.ca\.crt}' | base64 -d
```

### 权限检查

```bash
# 检查 ServiceAccount 权限
kubectl auth can-i get pods --as=system:serviceaccount:default:my-sa
kubectl auth can-i create deployments --as=system:serviceaccount:default:my-sa

# 列出 ServiceAccount 的所有权限
kubectl auth can-i --list --as=system:serviceaccount:default:my-sa

# 检查特定 Namespace 的权限
kubectl auth can-i get pods --as=system:serviceaccount:production:my-sa -n production
```

### 调试和故障排查

```bash
# 查看 Pod 使用的 ServiceAccount
kubectl get pod my-pod -o jsonpath='{.spec.serviceAccountName}'

# 查看 Pod 中挂载的 Token
kubectl exec my-pod -- cat /var/run/secrets/kubernetes.io/serviceaccount/token

# 查看 Token 信息（需要 jq）
kubectl exec my-pod -- cat /var/run/secrets/kubernetes.io/serviceaccount/token | \
  cut -d. -f2 | base64 -d | jq .

# 测试 API 访问
kubectl exec my-pod -- curl -H "Authorization: Bearer $(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
  https://kubernetes.default.svc/api/v1/namespaces/default/pods
```

## 安全最佳实践

### 1. 最小权限原则

```yaml
# 错误：过度权限
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: bad-binding
subjects:
- kind: ServiceAccount
  name: my-app
  namespace: default
roleRef:
  kind: ClusterRole
  name: cluster-admin  # 过度权限！
  apiGroup: rbac.authorization.k8s.io

---
# 正确：最小权限
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: app-role
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list"]
  resourceNames: ["app-config"]  # 限制特定资源

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-binding
  namespace: default
subjects:
- kind: ServiceAccount
  name: my-app
  namespace: default
roleRef:
  kind: Role
  name: app-role
  apiGroup: rbac.authorization.k8s.io
```

### 2. Token 安全管理

```yaml
# 禁用不必要的 Token 自动挂载
apiVersion: v1
kind: ServiceAccount
metadata:
  name: secure-sa
  namespace: default
automountServiceAccountToken: false  # 默认禁用

---
# 只在需要时启用
apiVersion: v1
kind: Pod
metadata:
  name: api-client-pod
spec:
  serviceAccountName: secure-sa
  automountServiceAccountToken: true  # 显式启用
  containers:
  - name: api-client
    image: api-client:latest

---
# 使用短期 Token
apiVersion: v1
kind: Pod
metadata:
  name: short-token-pod
spec:
  serviceAccountName: my-sa
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: token
      mountPath: /var/run/secrets/tokens
  volumes:
  - name: token
    projected:
      sources:
      - serviceAccountToken:
          path: token
          expirationSeconds: 3600  # 1小时过期
```

### 3. 网络安全

```yaml
# 限制 ServiceAccount 的网络访问
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-api-access
  namespace: default
spec:
  podSelector:
    matchLabels:
      serviceaccount: restricted-sa
  policyTypes:
  - Egress
  egress:
  # 只允许访问 Kubernetes API
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: TCP
      port: 443
  # 允许 DNS 查询
  - to: []
    ports:
    - protocol: UDP
      port: 53
```

## 故障排查

### 常见问题

| 问题 | 可能原因 | 解决方案 |
| ---- | ---- | ---- |
| Pod 无法访问 API | 权限不足 | 检查 RBAC 配置 |
| Token 不存在 | ServiceAccount 创建失败 | 检查 ServiceAccount 状态 |
| 镜像拉取失败 | imagePullSecrets 配置错误 | 检查 Secret 配置 |
| 权限被拒绝 | 角色绑定错误 | 检查 RoleBinding 配置 |
| Token 过期 | 使用了短期 Token | 刷新或使用长期 Token |

### 诊断步骤

1. **检查 ServiceAccount 状态**
```bash
kubectl get sa my-sa -o yaml
kubectl describe sa my-sa
```

2. **检查关联的 Secret**
```bash
kubectl get secret | grep my-sa
kubectl describe secret my-sa-token-xxxxx
```

3. **检查 RBAC 权限**
```bash
kubectl get role,rolebinding,clusterrole,clusterrolebinding | grep my-sa
kubectl auth can-i --list --as=system:serviceaccount:default:my-sa
```

4. **检查 Pod 配置**
```bash
kubectl get pod my-pod -o yaml | grep -A5 -B5 serviceAccount
kubectl describe pod my-pod
```

5. **测试 API 访问**
```bash
# 在 Pod 内测试
kubectl exec my-pod -- curl -k -H "Authorization: Bearer $(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
  https://kubernetes.default.svc/api/v1/namespaces/default/pods
```

## 监控和审计

### 1. ServiceAccount 使用监控

```yaml
# Prometheus 监控规则
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: serviceaccount-alerts
  namespace: monitoring
spec:
  groups:
  - name: serviceaccount.rules
    rules:
    - alert: ServiceAccountTokenExpiring
      expr: (kube_secret_info{type="kubernetes.io/service-account-token"} * on(namespace, name) kube_secret_created) < (time() - 86400 * 30)
      for: 24h
      labels:
        severity: warning
      annotations:
        summary: "ServiceAccount token expiring soon"
        description: "ServiceAccount token {{ $labels.name }} in namespace {{ $labels.namespace }} is expiring soon."
    
    - alert: UnusedServiceAccount
      expr: kube_serviceaccount_info unless on(namespace, serviceaccount) kube_pod_spec_service_account
      for: 7d
      labels:
        severity: info
      annotations:
        summary: "Unused ServiceAccount detected"
        description: "ServiceAccount {{ $labels.serviceaccount }} in namespace {{ $labels.namespace }} has not been used for 7 days."
```

### 2. 审计策略

```yaml
# 审计策略配置
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# 记录 ServiceAccount 的创建、更新、删除
- level: Metadata
  resources:
  - group: ""
    resources: ["serviceaccounts"]
  verbs: ["create", "update", "patch", "delete"]

# 记录 RBAC 变更
- level: Metadata
  resources:
  - group: "rbac.authorization.k8s.io"
    resources: ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]
  verbs: ["create", "update", "patch", "delete"]

# 记录 Token 创建
- level: Request
  resources:
  - group: ""
    resources: ["serviceaccounts/token"]
  verbs: ["create"]
```

## 总结

ServiceAccount 是 Kubernetes 中实现 Pod 身份验证和授权的核心机制。通过合理配置 ServiceAccount 和相关的 RBAC 权限，可以确保应用程序安全地访问 Kubernetes API 和集群资源。

**关键要点**：
- 每个 Pod 都应该使用专用的 ServiceAccount
- 遵循最小权限原则配置 RBAC
- 合理管理 Token 的生命周期和安全性
- 定期审计和监控 ServiceAccount 的使用情况
- 在不需要 API 访问时禁用 Token 自动挂载