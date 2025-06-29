# RBAC (Role-Based Access Control)

## 概述

RBAC（基于角色的访问控制）是 Kubernetes 中用于管理用户和服务账户权限的授权机制。它通过定义角色（Role）和角色绑定（RoleBinding）来控制谁可以访问哪些 Kubernetes 资源，以及可以执行哪些操作。RBAC 是 Kubernetes 安全模型的核心组件。

| 关键点 | 内容 |
| ---- | ---- |
| 核心作用 | 控制对 Kubernetes 资源的访问权限 |
| 授权模型 | 基于角色的访问控制 |
| 主要组件 | Role、ClusterRole、RoleBinding、ClusterRoleBinding |
| 权限原则 | 最小权限原则，默认拒绝 |
| 作用范围 | 命名空间级别和集群级别 |

## RBAC 的本质

### 设计理念

* **最小权限原则**：只授予完成任务所需的最小权限
* **职责分离**：不同角色拥有不同的权限
* **可审计性**：所有权限分配都可以追踪和审计
* **细粒度控制**：支持资源级别和操作级别的精确控制

### 核心组件

```
RBAC 组件关系：

User/ServiceAccount ──→ RoleBinding ──→ Role ──→ Resources
                    ↘              ↗
                     ClusterRoleBinding ──→ ClusterRole

组件说明：
- Role: 命名空间级别的权限集合
- ClusterRole: 集群级别的权限集合
- RoleBinding: 将 Role 绑定到用户/服务账户（命名空间级别）
- ClusterRoleBinding: 将 ClusterRole 绑定到用户/服务账户（集群级别）
```

### 权限模型

```
权限 = 资源 + 动词 + 资源名称（可选）

示例：
- 资源: pods, services, deployments
- 动词: get, list, create, update, delete, watch
- 资源名称: 特定的资源实例名称
```

## Role 和 RoleBinding

### 1. 基本 Role 定义

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: development
  labels:
    rbac-type: basic
    team: platform
rules:
# 规则1：读取 Pod
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]

# 规则2：读取 Pod 日志
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get", "list"]

# 规则3：读取 Pod 状态
- apiGroups: [""]
  resources: ["pods/status"]
  verbs: ["get"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: pod-reader-binding
  namespace: development
subjects:
# 绑定到用户
- kind: User
  name: alice
  apiGroup: rbac.authorization.k8s.io

# 绑定到服务账户
- kind: ServiceAccount
  name: pod-reader-sa
  namespace: development

# 绑定到组
- kind: Group
  name: developers
  apiGroup: rbac.authorization.k8s.io

roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

### 2. 复杂的 Role 配置

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: application-manager
  namespace: production
  labels:
    role-type: application-management
    security-level: high
rules:
# 管理 Deployment
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# 管理 ReplicaSet（Deployment 的子资源）
- apiGroups: ["apps"]
  resources: ["replicasets"]
  verbs: ["get", "list", "watch"]

# 管理 Pod
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch", "delete"]

# 管理 Service
- apiGroups: [""]
  resources: ["services"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# 管理 ConfigMap
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# 管理 Secret（只读）
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list"]

# 管理 Ingress
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# 管理 HPA
- apiGroups: ["autoscaling"]
  resources: ["horizontalpodautoscalers"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# 查看事件
- apiGroups: [""]
  resources: ["events"]
  verbs: ["get", "list", "watch"]

# 执行 Pod 命令（用于调试）
- apiGroups: [""]
  resources: ["pods/exec"]
  verbs: ["create"]

# 端口转发（用于调试）
- apiGroups: [""]
  resources: ["pods/portforward"]
  verbs: ["create"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: application-manager-binding
  namespace: production
subjects:
- kind: User
  name: app-admin
  apiGroup: rbac.authorization.k8s.io
- kind: ServiceAccount
  name: deployment-controller
  namespace: production
roleRef:
  kind: Role
  name: application-manager
  apiGroup: rbac.authorization.k8s.io
```

### 3. 特定资源的 Role

```yaml
# 只能管理特定名称的资源
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: specific-deployment-manager
  namespace: production
rules:
# 只能管理名为 "web-app" 的 Deployment
- apiGroups: ["apps"]
  resources: ["deployments"]
  resourceNames: ["web-app", "api-server"]
  verbs: ["get", "update", "patch"]

# 只能读取特定的 ConfigMap
- apiGroups: [""]
  resources: ["configmaps"]
  resourceNames: ["web-app-config", "api-server-config"]
  verbs: ["get"]

# 只能读取特定的 Secret
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["web-app-secret"]
  verbs: ["get"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: specific-deployment-binding
  namespace: production
subjects:
- kind: User
  name: web-app-maintainer
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: specific-deployment-manager
  apiGroup: rbac.authorization.k8s.io
```

## ClusterRole 和 ClusterRoleBinding

### 1. 基本 ClusterRole 定义

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-reader
  labels:
    rbac-type: cluster-level
    access-level: read-only
rules:
# 读取所有命名空间的 Pod
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]

# 读取所有命名空间的 Service
- apiGroups: [""]
  resources: ["services"]
  verbs: ["get", "list", "watch"]

# 读取所有命名空间的 Deployment
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch"]

# 读取节点信息
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list", "watch"]

# 读取命名空间
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get", "list", "watch"]

# 读取持久卷
- apiGroups: [""]
  resources: ["persistentvolumes"]
  verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-reader-binding
subjects:
- kind: User
  name: monitoring-user
  apiGroup: rbac.authorization.k8s.io
- kind: ServiceAccount
  name: monitoring-sa
  namespace: monitoring
roleRef:
  kind: ClusterRole
  name: cluster-reader
  apiGroup: rbac.authorization.k8s.io
```

### 2. 集群管理员 ClusterRole

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-admin-custom
  labels:
    rbac-type: admin
    security-level: high
rules:
# 管理所有资源（除了一些敏感资源）
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]
  # 排除一些敏感操作
  # resourceNames: [] # 可以用来限制特定资源

# 但是排除对 RBAC 资源的完全控制
- apiGroups: ["rbac.authorization.k8s.io"]
  resources: ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]
  verbs: ["get", "list", "watch"]  # 只读权限

---
# 更安全的集群管理员角色
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: platform-admin
rules:
# 管理工作负载
- apiGroups: ["apps"]
  resources: ["*"]
  verbs: ["*"]

# 管理核心资源
- apiGroups: [""]
  resources: ["pods", "services", "configmaps", "secrets", "persistentvolumeclaims"]
  verbs: ["*"]

# 管理网络
- apiGroups: ["networking.k8s.io"]
  resources: ["*"]
  verbs: ["*"]

# 管理存储
- apiGroups: ["storage.k8s.io"]
  resources: ["*"]
  verbs: ["*"]

# 管理自动扩缩容
- apiGroups: ["autoscaling"]
  resources: ["*"]
  verbs: ["*"]

# 管理批处理作业
- apiGroups: ["batch"]
  resources: ["*"]
  verbs: ["*"]

# 读取节点信息
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list", "watch"]

# 管理命名空间
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["*"]

# 有限的 RBAC 权限
- apiGroups: ["rbac.authorization.k8s.io"]
  resources: ["roles", "rolebindings"]
  verbs: ["*"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: platform-admin-binding
subjects:
- kind: User
  name: platform-admin
  apiGroup: rbac.authorization.k8s.io
- kind: Group
  name: platform-team
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: platform-admin
  apiGroup: rbac.authorization.k8s.io
```

### 3. 特定功能的 ClusterRole

```yaml
# 监控系统的 ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: monitoring-collector
  labels:
    component: monitoring
rules:
# 读取所有 Pod 和节点指标
- apiGroups: [""]
  resources: ["nodes", "nodes/metrics", "nodes/stats", "nodes/proxy"]
  verbs: ["get", "list", "watch"]

- apiGroups: [""]
  resources: ["pods", "services", "endpoints"]
  verbs: ["get", "list", "watch"]

# 读取 Deployment 和 ReplicaSet
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets", "daemonsets", "statefulsets"]
  verbs: ["get", "list", "watch"]

# 读取 Ingress
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get", "list", "watch"]

# 读取 HPA
- apiGroups: ["autoscaling"]
  resources: ["horizontalpodautoscalers"]
  verbs: ["get", "list", "watch"]

# 访问非资源 URL（如 /metrics）
- nonResourceURLs: ["/metrics", "/metrics/*"]
  verbs: ["get"]

---
# CI/CD 系统的 ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cicd-deployer
rules:
# 管理应用部署
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# 管理服务
- apiGroups: [""]
  resources: ["services"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# 管理配置
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# 管理 Ingress
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# 读取 Pod（用于部署状态检查）
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]

# 读取事件
- apiGroups: [""]
  resources: ["events"]
  verbs: ["get", "list", "watch"]

---
# 网络管理员的 ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: network-admin
rules:
# 管理网络策略
- apiGroups: ["networking.k8s.io"]
  resources: ["networkpolicies"]
  verbs: ["*"]

# 管理 Ingress
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses", "ingressclasses"]
  verbs: ["*"]

# 管理服务
- apiGroups: [""]
  resources: ["services", "endpoints"]
  verbs: ["*"]

# 读取 Pod（用于网络调试）
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]

# 读取节点（用于网络拓扑）
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list", "watch"]
```

## 实际应用场景

### 1. 多租户环境的 RBAC 配置

```yaml
# 租户 A 的命名空间管理员
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tenant-a-admin
  namespace: tenant-a
  labels:
    tenant: tenant-a
    role-type: admin
rules:
# 管理租户内的所有资源
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tenant-a-admin-binding
  namespace: tenant-a
subjects:
- kind: User
  name: tenant-a-admin
  apiGroup: rbac.authorization.k8s.io
- kind: Group
  name: tenant-a-team
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: tenant-a-admin
  apiGroup: rbac.authorization.k8s.io

---
# 租户 A 的开发者角色
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tenant-a-developer
  namespace: tenant-a
rules:
# 管理应用部署
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# 管理 Pod
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch", "delete"]

# 管理服务
- apiGroups: [""]
  resources: ["services"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# 管理配置（但不能管理敏感的 Secret）
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# 只读 Secret
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list"]

# 查看日志和执行命令（用于调试）
- apiGroups: [""]
  resources: ["pods/log", "pods/exec", "pods/portforward"]
  verbs: ["get", "create"]

# 查看事件
- apiGroups: [""]
  resources: ["events"]
  verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tenant-a-developer-binding
  namespace: tenant-a
subjects:
- kind: Group
  name: tenant-a-developers
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: tenant-a-developer
  apiGroup: rbac.authorization.k8s.io

---
# 租户 A 的只读用户
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tenant-a-viewer
  namespace: tenant-a
rules:
# 只读所有资源
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tenant-a-viewer-binding
  namespace: tenant-a
subjects:
- kind: Group
  name: tenant-a-viewers
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: tenant-a-viewer
  apiGroup: rbac.authorization.k8s.io
```

### 2. CI/CD 流水线的 RBAC 配置

```yaml
# CI/CD 服务账户
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cicd-service-account
  namespace: cicd
  labels:
    component: cicd
    managed-by: platform-team

---
# CI/CD 部署角色
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cicd-deployer
  labels:
    component: cicd
rules:
# 管理应用部署（所有命名空间）
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets", "daemonsets", "statefulsets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# 管理 Pod
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch", "delete"]

# 管理服务
- apiGroups: [""]
  resources: ["services"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# 管理配置
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# 管理 Secret（CI/CD 需要管理部署密钥）
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# 管理 Ingress
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# 管理 HPA
- apiGroups: ["autoscaling"]
  resources: ["horizontalpodautoscalers"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# 管理 Job 和 CronJob
- apiGroups: ["batch"]
  resources: ["jobs", "cronjobs"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# 读取事件（用于部署状态检查）
- apiGroups: [""]
  resources: ["events"]
  verbs: ["get", "list", "watch"]

# 读取命名空间
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cicd-deployer-binding
subjects:
- kind: ServiceAccount
  name: cicd-service-account
  namespace: cicd
roleRef:
  kind: ClusterRole
  name: cicd-deployer
  apiGroup: rbac.authorization.k8s.io

---
# 限制 CI/CD 不能访问生产环境的敏感资源
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: production-restrictions
  namespace: production
rules:
# 在生产环境中，CI/CD 不能删除 Secret
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
  # 注意：没有 delete 权限

# 不能删除持久卷声明
- apiGroups: [""]
  resources: ["persistentvolumeclaims"]
  verbs: ["get", "list", "watch"]
  # 注意：只有读权限

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cicd-production-restrictions
  namespace: production
subjects:
- kind: ServiceAccount
  name: cicd-service-account
  namespace: cicd
roleRef:
  kind: Role
  name: production-restrictions
  apiGroup: rbac.authorization.k8s.io
```

### 3. 监控系统的 RBAC 配置

```yaml
# Prometheus 服务账户
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prometheus
  namespace: monitoring
  labels:
    app: prometheus
    component: monitoring

---
# Prometheus ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: prometheus
  labels:
    app: prometheus
rules:
# 读取所有 Pod 和服务
- apiGroups: [""]
  resources: ["nodes", "nodes/metrics", "services", "endpoints", "pods"]
  verbs: ["get", "list", "watch"]

# 读取 Ingress
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get", "list", "watch"]

# 读取 ConfigMap（用于服务发现）
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get"]

# 访问非资源 URL
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
# Grafana 服务账户和角色
apiVersion: v1
kind: ServiceAccount
metadata:
  name: grafana
  namespace: monitoring

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: grafana
rules:
# Grafana 通常只需要读取权限
- apiGroups: [""]
  resources: ["nodes", "pods", "services"]
  verbs: ["get", "list"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: grafana
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: grafana
subjects:
- kind: ServiceAccount
  name: grafana
  namespace: monitoring
```

## 命令行操作

### 基本操作

```bash
# 查看 RBAC 资源
kubectl get roles
kubectl get rolebindings
kubectl get clusterroles
kubectl get clusterrolebindings

# 查看特定命名空间的 RBAC
kubectl get roles,rolebindings -n production

# 查看详细信息
kubectl describe role pod-reader -n development
kubectl describe clusterrole cluster-admin

# 查看 RBAC 的 YAML 配置
kubectl get role pod-reader -o yaml
kubectl get clusterrole cluster-admin -o yaml
```

### 权限检查

```bash
# 检查当前用户的权限
kubectl auth can-i create pods
kubectl auth can-i delete deployments
kubectl auth can-i get secrets --namespace=production

# 检查特定用户的权限
kubectl auth can-i create pods --as=alice
kubectl auth can-i delete deployments --as=system:serviceaccount:default:my-sa

# 检查在特定命名空间的权限
kubectl auth can-i create pods --namespace=production

# 列出用户可以执行的所有操作
kubectl auth can-i --list
kubectl auth can-i --list --as=alice
kubectl auth can-i --list --namespace=production
```

### 创建和管理 RBAC

```bash
# 使用命令行创建 Role
kubectl create role pod-reader \
  --verb=get,list,watch \
  --resource=pods \
  --namespace=development

# 使用命令行创建 ClusterRole
kubectl create clusterrole deployment-manager \
  --verb=get,list,watch,create,update,patch,delete \
  --resource=deployments

# 使用命令行创建 RoleBinding
kubectl create rolebinding pod-reader-binding \
  --role=pod-reader \
  --user=alice \
  --namespace=development

# 使用命令行创建 ClusterRoleBinding
kubectl create clusterrolebinding cluster-admin-binding \
  --clusterrole=cluster-admin \
  --user=admin

# 绑定到服务账户
kubectl create rolebinding pod-reader-sa-binding \
  --role=pod-reader \
  --serviceaccount=development:pod-reader-sa \
  --namespace=development
```

### 调试和故障排查

```bash
# 查看当前用户信息
kubectl config view --minify
kubectl config current-context

# 查看服务账户的 Token
kubectl get serviceaccount my-sa -o yaml
kubectl describe serviceaccount my-sa

# 查看服务账户的 Secret
kubectl get secret $(kubectl get serviceaccount my-sa -o jsonpath='{.secrets[0].name}') -o yaml

# 测试服务账户的权限
kubectl auth can-i get pods --as=system:serviceaccount:default:my-sa

# 查看 RBAC 相关的事件
kubectl get events --field-selector reason=Forbidden
```

## 故障排查

### 常见问题

| 问题 | 可能原因 | 解决方案 |
| ---- | ---- | ---- |
| 权限被拒绝 | 缺少相应的 Role 或 RoleBinding | 检查并创建适当的 RBAC 规则 |
| 无法访问资源 | apiGroups 配置错误 | 检查资源的 API 组 |
| ClusterRole 不生效 | 使用了 RoleBinding 而不是 ClusterRoleBinding | 使用正确的绑定类型 |
| 服务账户权限不足 | 服务账户未绑定到适当的角色 | 创建 RoleBinding 或 ClusterRoleBinding |
| 权限过于宽泛 | 使用了通配符权限 | 遵循最小权限原则，精确定义权限 |

### 诊断步骤

1. **检查用户身份**
```bash
# 确认当前用户身份
kubectl config view --minify
kubectl auth whoami
```

2. **检查权限**
```bash
# 测试具体权限
kubectl auth can-i <verb> <resource> --namespace=<namespace>

# 列出所有权限
kubectl auth can-i --list --namespace=<namespace>
```

3. **检查 RBAC 配置**
```bash
# 查看相关的 Role 和 RoleBinding
kubectl get roles,rolebindings -n <namespace>
kubectl describe rolebinding <binding-name> -n <namespace>
```

4. **检查服务账户**
```bash
# 查看服务账户配置
kubectl get serviceaccount <sa-name> -o yaml
kubectl describe serviceaccount <sa-name>
```

### 常见错误和解决方案

```yaml
# 错误1：API 组配置错误
# 错误的配置
rules:
- apiGroups: ["apps/v1"]  # 错误：不应该包含版本
  resources: ["deployments"]
  verbs: ["get"]

# 正确的配置
rules:
- apiGroups: ["apps"]  # 正确：只包含组名
  resources: ["deployments"]
  verbs: ["get"]

---
# 错误2：资源名称错误
# 错误的配置
rules:
- apiGroups: [""]
  resources: ["pod"]  # 错误：应该是复数形式
  verbs: ["get"]

# 正确的配置
rules:
- apiGroups: [""]
  resources: ["pods"]  # 正确：复数形式
  verbs: ["get"]

---
# 错误3：绑定主体配置错误
# 错误的配置
subjects:
- kind: ServiceAccount
  name: my-sa
  # 错误：缺少 namespace

# 正确的配置
subjects:
- kind: ServiceAccount
  name: my-sa
  namespace: default  # 正确：包含 namespace
```

## 最佳实践

### 1. 安全配置最佳实践

```yaml
# 1. 遵循最小权限原则
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: minimal-pod-manager
  namespace: production
rules:
# 只授予必要的权限
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]  # 不包含 create, delete
  
# 如果需要管理特定资源，使用 resourceNames
- apiGroups: [""]
  resources: ["configmaps"]
  resourceNames: ["app-config"]  # 只能访问特定的 ConfigMap
  verbs: ["get", "update"]

---
# 2. 使用专用的服务账户
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-specific-sa
  namespace: production
  labels:
    app: my-app
    security-level: restricted
  annotations:
    description: "Service account for my-app with minimal permissions"

---
# 3. 定期审计的角色
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: auditable-role
  namespace: production
  labels:
    security-review: required
    last-reviewed: "2024-01-15"
    next-review: "2024-04-15"
  annotations:
    reviewer: "security-team@company.com"
    purpose: "Application deployment and management"
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "update", "patch"]
  # 明确记录每个权限的用途

---
# 4. 环境特定的权限
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: development-permissions
  namespace: development
  labels:
    environment: development
    permission-level: relaxed
rules:
# 开发环境可以有更宽松的权限
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: production-permissions
  namespace: production
  labels:
    environment: production
    permission-level: strict
rules:
# 生产环境严格限制权限
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "update", "patch"]
  # 注意：没有 create 和 delete 权限
```

### 2. 组织和管理最佳实践

```yaml
# 1. 使用一致的命名约定
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: team-app-env-role  # 格式：团队-应用-环境-角色类型
  # 例如：platform-web-prod-admin
  namespace: production
  labels:
    team: platform
    app: web-server
    environment: production
    role-type: admin
    managed-by: platform-team

---
# 2. 使用角色聚合
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: base-reader
  labels:
    rbac.example.com/aggregate-to-monitoring: "true"
rules:
- apiGroups: [""]
  resources: ["pods", "services"]
  verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: monitoring-reader
aggregationRule:
  clusterRoleSelectors:
  - matchLabels:
      rbac.example.com/aggregate-to-monitoring: "true"
rules: []  # 规则将从聚合的角色中继承

---
# 3. 使用组进行权限管理
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: developers-binding
subjects:
# 绑定到组而不是个人用户
- kind: Group
  name: developers
  apiGroup: rbac.authorization.k8s.io
- kind: Group
  name: senior-developers
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: developer-role
  apiGroup: rbac.authorization.k8s.io
```

### 3. 监控和审计

```yaml
# Prometheus 监控规则
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: rbac-monitoring
  namespace: monitoring
spec:
  groups:
  - name: rbac.rules
    rules:
    # 监控 RBAC 资源数量
    - record: kubernetes:rbac:roles:count
      expr: count(kube_role_info)
    
    - record: kubernetes:rbac:clusterroles:count
      expr: count(kube_clusterrole_info)
    
    # 监控权限被拒绝的事件
    - alert: RBACPermissionDenied
      expr: increase(apiserver_audit_total{verb="create",objectRef_reason="Forbidden"}[5m]) > 10
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "High number of RBAC permission denied events"
        description: "{{ $value }} permission denied events in the last 5 minutes"
    
    # 监控特权角色的使用
    - alert: PrivilegedRoleUsed
      expr: increase(apiserver_audit_total{user_username=~".*admin.*"}[1h]) > 0
      for: 0m
      labels:
        severity: info
      annotations:
        summary: "Privileged role used"
        description: "Admin user {{ $labels.user_username }} performed actions"

---
# 审计策略
apiVersion: v1
kind: ConfigMap
metadata:
  name: rbac-audit-policy
  namespace: kube-system
data:
  audit-policy.yaml: |
    apiVersion: audit.k8s.io/v1
    kind: Policy
    rules:
    # 审计所有 RBAC 相关操作
    - level: Metadata
      resources:
      - group: "rbac.authorization.k8s.io"
        resources: ["*"]
      verbs: ["*"]
    
    # 审计权限检查
    - level: Request
      resources:
      - group: "authorization.k8s.io"
        resources: ["subjectaccessreviews"]
    
    # 审计特权用户的操作
    - level: RequestResponse
      users: ["admin", "cluster-admin"]
      verbs: ["create", "update", "patch", "delete"]
```

### 4. 自动化和工具

```bash
#!/bin/bash
# RBAC 审计脚本

set -e

echo "=== RBAC 安全审计 ==="

# 1. 检查过于宽泛的权限
echo "检查过于宽泛的权限..."
kubectl get clusterroles -o json | jq -r '.items[] | select(.rules[]? | select(.verbs[]? == "*" and .resources[]? == "*")) | .metadata.name'

# 2. 检查直接绑定到 cluster-admin 的用户
echo "检查 cluster-admin 绑定..."
kubectl get clusterrolebindings -o json | jq -r '.items[] | select(.roleRef.name == "cluster-admin") | .metadata.name'

# 3. 检查没有使用的 ServiceAccount
echo "检查未使用的 ServiceAccount..."
for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  kubectl get serviceaccounts -n $ns -o json | jq -r --arg ns "$ns" '.items[] | select(.metadata.name != "default") | "\($ns)/\(.metadata.name)"'
done

# 4. 检查过期的角色（基于标签）
echo "检查需要审查的角色..."
kubectl get roles,clusterroles -A -o json | jq -r '.items[] | select(.metadata.labels["next-review"]? < now | strftime("%Y-%m-%d")) | "\(.metadata.namespace // "cluster")/\(.metadata.name)"'

# 5. 生成权限报告
echo "生成权限报告..."
for user in $(kubectl get rolebindings,clusterrolebindings -A -o json | jq -r '.items[].subjects[]? | select(.kind == "User") | .name' | sort -u); do
  echo "用户 $user 的权限:"
  kubectl auth can-i --list --as=$user | head -10
  echo "---"
done

echo "=== 审计完成 ==="
```

## 总结

RBAC 是 Kubernetes 安全模型的核心组件，它提供了细粒度的权限控制机制，确保集群资源的安全访问。

**关键要点**：
- RBAC 基于角色的访问控制模型，支持命名空间和集群级别的权限管理
- 遵循最小权限原则，只授予必要的权限
- 使用标签和注解进行角色管理和审计
- 定期审查和更新权限配置
- 通过监控和审计确保 RBAC 策略的有效性
- 在不同环境中采用不同的权限策略