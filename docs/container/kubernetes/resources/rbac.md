---
title: Kubernetes RBAC
author: Walt
date: 2026-07-18
---

# Kubernetes RBAC

RBAC 根据身份、资源和 verb 决定 Kubernetes API 请求是否允许。Role/ClusterRole 是允许规则集合，RoleBinding/ClusterRoleBinding 把规则授予用户、组或 ServiceAccount。Kubernetes RBAC 没有显式 deny；多个绑定的允许权限会合并。

例如值班人员需要查看订单 Pod 的日志，但不需要执行命令或读取支付系统配置。应把任务拆成“列出 orders 中的 Pod”和“读取 pods/log”两种 API 权限，再给值班组绑定规则；日志读取不要求 `pods/exec`，也不应顺带授予 Secret 权限。

![集群级规则通过 RoleBinding 仅授权当前命名空间的示例](/container/rbac-namespace-scope.svg)

## 四个对象的范围

| 对象 | 规则范围 | 授权范围 |
| --- | --- | --- |
| Role | 单 Namespace 内资源 | 由 RoleBinding 授权 |
| ClusterRole | 集群资源或可复用规则 | 可被任意 Binding 引用 |
| RoleBinding | 当前 Namespace | 引用 Role 或 ClusterRole |
| ClusterRoleBinding | 整个集群 | 只能引用 ClusterRole |

优先 RoleBinding。一个 ClusterRole 可以定义可复用的 Namespace 级规则，再由不同 Namespace 的 RoleBinding 分别授予；读取两个明确的空间，不必直接扩成全集群权限。Node、Namespace、CRD 等集群级资源，或确实需要全集群资源权限时，才考虑 ClusterRoleBinding。

图中只展示一条绑定。若另有 ClusterRoleBinding 给同一组授予更广权限，删除这条 RoleBinding 也不会撤回另一条绑定带来的权限；排查时要核对该身份及其所有组的允许集合。

## 最小权限示例

下面使用本地 Role 实现同样的 `orders` 作用范围；图中使用 ClusterRole 是为了说明规则可复用，两种方案选择一种即可。`orders` Namespace 和身份提供者返回的 `orders-oncall` 组需预先存在。Kubernetes 不会因创建 Group subject 自动建立用户组：

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

Role 的 `apiGroups` 使用 API 组名，不包含版本，例如 Deployment 使用 `apps`，不是 `apps/v1`；Pod 和日志属于核心组 `""`。资源名为复数形式。清单里的 RoleBinding subject 是组名，实际认证结果若没有该组，即使用户名相似也不会命中。

## `resourceNames` 的边界

`resourceNames` 可以限制已知名称的部分请求。例如只允许 `get` 名为 `order-api-config` 的 ConfigMap。它不是 label 过滤器；当受限规则包含 list/watch 时，客户端还要提交匹配的 `metadata.name` field selector，普通的全量 list 不会由服务器自动裁剪成允许对象列表。

创建资源、集合删除以及不同子资源的授权属性各有边界，不能把 `resourceNames` 当成通用对象隔离机制。需要按团队或租户列举对象时，应先设计 Namespace 和 API 边界；也不能只凭名称限制就认定 Pod 创建者无法取得该空间中的其他身份或凭据。

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
identity=替换为实际值班用户名
kubectl auth can-i get pods -n orders --as="$identity" --as-group=orders-oncall
kubectl auth can-i get pods --subresource=log -n orders --as="$identity" --as-group=orders-oncall
kubectl auth can-i get pods --subresource=log -n payments --as="$identity" --as-group=orders-oncall
kubectl auth can-i create pods --subresource=exec -n orders --as="$identity" --as-group=orders-oncall
kubectl get role,rolebinding -n orders -o yaml
kubectl get clusterrole,clusterrolebinding -o yaml
```

示例要求操作者具有对应用户和组的 `impersonate` 权限，`payments` 空间需已存在。只存在上面的绑定时，预期依次为 `yes / yes / no / no`；若拒绝项意外为 `yes`，继续检查其他组和全集群绑定，不能用更窄的新 Role 覆盖旧授权。

`can-i` 验证授权决策，不会真正读取日志或证明准入允许写入。再用已批准的实际值班身份完成日志读取，核对审计日志中的 user/groups、namespace、resource/subresource 和 verb。仅复制 `--as` 用户名而遗漏组，不能完整复现真实身份。

Binding 的 `roleRef` 创建后不可变，更换角色需要替换绑定；修改原 Role 规则则会影响所有引用它的主体。变更前检查影响集合，临时权限回收后重做允许与拒绝验证。

## 变更流程

1. 从具体工作任务列出资源、verb、Namespace 和 subresource。
2. 用专用测试身份验证允许路径和关键拒绝路径。
3. 优先绑定组或 ServiceAccount，不直接散落大量个人绑定。
4. 对临时权限设置到期和回收流程。
5. 监控高风险 API 调用与 RBAC 变更。

权限收紧前先确认控制器、流水线和应急流程的真实调用，避免在故障时才发现恢复主体被拒绝。
