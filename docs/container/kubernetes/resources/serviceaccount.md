---
title: Kubernetes ServiceAccount
author: Walt
date: 2026-07-18
---

# Kubernetes ServiceAccount

ServiceAccount 是 Namespace 内工作负载访问 Kubernetes API 或外部身份系统时使用的机器身份。它本身不包含权限；RoleBinding/ClusterRoleBinding 把权限授予该身份。

## 每个工作负载使用专用身份

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-api
  namespace: orders
automountServiceAccountToken: false
```

不访问 Kubernetes API 的应用应关闭自动挂载。需要访问时，在 Pod 上显式启用并授予最小权限：

```yaml
spec:
  serviceAccountName: order-api
  automountServiceAccountToken: true
```

不要让多个无关服务共享同一 ServiceAccount，也不要用 Namespace 的 `default` ServiceAccount 承载业务权限。

## TokenRequest 与投影 Token

现代 Pod 默认使用短期、可轮换、绑定到 ServiceAccount/Pod 的投影 Token，而不是长期 Secret Token。需要自定义 audience 或有效期时：

```yaml
volumes:
  - name: api-token
    projected:
      sources:
        - serviceAccountToken:
            path: token
            audience: orders-api
            expirationSeconds: 3600
```

外部服务验证 Token 时必须检查 issuer、audience、有效期和签名。不要把 Kubernetes API Token 当成通用长期 API key。

临时调试可使用：

```bash
kubectl create token order-api -n orders --audience=orders-api --duration=10m
```

Token 可能出现在终端、进程参数或日志中，调试后仍要清理暴露路径。

## RBAC 绑定

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: config-reader
  namespace: orders
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    resourceNames: ["order-api-config"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: order-api-config-reader
  namespace: orders
subjects:
  - kind: ServiceAccount
    name: order-api
    namespace: orders
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: config-reader
```

优先使用 RoleBinding 把权限限制在 Namespace。即使引用 ClusterRole，RoleBinding 也只在自身 Namespace 授权；ClusterRoleBinding 才会把权限扩展到集群范围。

## 云工作负载身份

访问云 API 时，优先使用云厂商的 workload identity/联合身份，把 ServiceAccount 映射到短期云凭据。不要把长期云密钥存进 Secret 并分发给所有副本。

要验证 Token 轮换、Pod 重建、节点迁移和身份系统不可用时的行为，并限制哪些 ServiceAccount 可以映射高权限云角色。

## 排障

```bash
kubectl get serviceaccount order-api -n orders -o yaml
kubectl auth can-i get configmap/order-api-config -n orders \
  --as=system:serviceaccount:orders:order-api
kubectl auth can-i --list -n orders \
  --as=system:serviceaccount:orders:order-api
kubectl describe pod <pod> -n orders
```

| 现象 | 优先检查 |
| --- | --- |
| Pod 创建失败 | ServiceAccount 名称和 Namespace |
| API 返回 401 | Token 挂载、有效期、issuer/audience |
| API 返回 403 | Role、Binding、资源、verb、subresource |
| 云 API 拒绝 | 联合身份映射、audience、云角色策略 |
| Token 不应存在却被挂载 | Pod 与 ServiceAccount 的 automount 设置 |
