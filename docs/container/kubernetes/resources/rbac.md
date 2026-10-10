---
title: Kubernetes RBAC
author: Walt
date: 2026-07-18
---

# Kubernetes RBAC

RBAC 根据身份、资源和 verb 决定 Kubernetes API 请求是否允许。Role/ClusterRole 是允许规则集合，RoleBinding/ClusterRoleBinding 把规则授予用户、组或 ServiceAccount。Kubernetes RBAC 没有显式 deny；多个绑定的允许权限会合并。

## 四个对象的范围

| 对象 | 规则范围 | 授权范围 |
| --- | --- | --- |
| Role | 单 Namespace 内资源 | 由 RoleBinding 授权 |
| ClusterRole | 集群资源或可复用规则 | 可被任意 Binding 引用 |
| RoleBinding | 当前 Namespace | 引用 Role 或 ClusterRole |
| ClusterRoleBinding | 整个集群 | 只能引用 ClusterRole |

优先 RoleBinding；只有确实需要访问 Node、Namespace、CRD 等集群级资源或跨 Namespace 数据时才使用 ClusterRoleBinding。

## 最小权限示例

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-log-reader
  namespace: orders
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: oncall-pod-log-reader
  namespace: orders
subjects:
  - kind: Group
    name: orders-oncall
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-log-reader
  apiGroup: rbac.authorization.k8s.io
```

`pods/log`、`pods/exec`、`deployments/scale`、`customresources/status` 都是独立 subresource，应按实际动作授权。读取 Secret、创建 Pod、exec、impersonate、bind、escalate 和修改 Webhook/RBAC 都属于高风险权限。

## `resourceNames` 的边界

`resourceNames` 可以限制对已知对象名的部分请求，但 list/watch 无法像 get 一样简单按对象名过滤。需要列举对象时，应重新设计 Namespace 或 API 边界，不假设 `resourceNames` 能完成所有细粒度隔离。

非资源 URL 如 `/healthz`、`/version` 只能在 ClusterRole 的 `nonResourceURLs` 中授权。

## 防止权限升级

重点审计：

- 能创建/修改 RoleBinding 或 ClusterRoleBinding 的身份。
- 能使用 `impersonate`、`bind`、`escalate` 的身份。
- 能创建 Pod 并指定高权限 ServiceAccount 的身份。
- 能读取 Secret、exec 进 Pod、创建调试容器或挂载主机目录的身份。
- 通配 `apiGroups: ["*"]`、`resources: ["*"]`、`verbs: ["*"]`。

“只能创建 Pod”可能等价于获得该 Namespace 中可用 ServiceAccount、Secret 和节点能力，不能按资源名表面判断风险。

## 验证权限

```bash
kubectl auth can-i get pods -n orders --as=<user>
kubectl auth can-i get pods/log -n orders --as=<user>
kubectl auth can-i --list -n orders --as=<user>
kubectl auth can-i create pods/exec -n orders --as=<user>
kubectl get role,rolebinding -n orders -o yaml
kubectl get clusterrole,clusterrolebinding -o yaml
```

`can-i` 验证授权决策，但完整审计还要结合身份提供者、准入策略和实际 API 审计日志。

## 变更流程

1. 从具体工作任务列出资源、verb、Namespace 和 subresource。
2. 用专用测试身份验证允许路径和关键拒绝路径。
3. 优先绑定组或 ServiceAccount，不直接散落大量个人绑定。
4. 对临时权限设置到期和回收流程。
5. 监控高风险 API 调用与 RBAC 变更。

权限收紧前先确认控制器、流水线和应急流程的真实调用，避免在故障时才发现恢复主体被拒绝。
