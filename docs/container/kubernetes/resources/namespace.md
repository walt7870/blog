---
title: Kubernetes Namespace
author: Walt
date: 2026-07-18
---

# Kubernetes Namespace

Namespace 为大多数 Kubernetes 对象提供命名和管理范围，适合按环境、团队或租户组织资源。它不是虚拟集群，也不会自动提供网络、资源和安全隔离；隔离需要 RBAC、NetworkPolicy、ResourceQuota、准入策略和节点边界共同完成。

例如订单团队管理 `orders`，支付团队管理 `payments`，两边都可以有名为 `api` 的 Service。名称不会冲突，但应用能否互通、谁能读日志、各自能用多少 CPU，分别由网络策略、授权和配额决定。Namespace 不能嵌套，也不能把一个对象同时放进两个空间。

![RoleBinding 引用集群规则时仍只授权其所在命名空间的资源](/container/rbac-namespace-scope.svg)

图中值班组只获得 `orders` 的日志权限；换成不同 Namespace 不会改变组身份，也不会自动授予对应权限。图示只表达 API 授权，应用之间的网络访问还要检查 [NetworkPolicy](./networkpolicy.md)。

## 怎样划分

常见划分方式：

| 方式 | 适合场景 | 风险 |
| --- | --- | --- |
| 按环境 | dev/staging/prod 管理边界明确 | 多团队共享时权限容易过宽 |
| 按团队/产品 | 责任、成本和权限容易归属 | 同一产品多环境仍需额外维度 |
| 按租户 | 多租户资源和策略边界 | 强隔离需求可能需要独立集群 |

不必机械地为每个微服务创建 Namespace；这会放大 RBAC、配额、网络策略和运维对象数量。一个 Namespace 应对应稳定的管理和策略边界。若同一团队拥有的多个服务遵循相同策略，可以用 labels 区分；不可信租户需要隔离控制面、节点或内核时，应进一步评估独立集群与运行时边界。

## 建立一个可治理空间

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: orders
  labels:
    owner: commerce
    environment: production
    pod-security.kubernetes.io/enforce: restricted
```

创建后还应配套：

- 团队和工作负载的 Role/RoleBinding。
- 默认拒绝与必要允许的 NetworkPolicy。
- ResourceQuota 和 LimitRange。
- 镜像、Pod 安全和标签等准入策略。
- 成本、日志、指标和告警归属。

`enforce: restricted` 要求集群启用了 Pod Security Admission，且工作负载符合对应规则；它不会补齐网络策略或资源配额。生产中应按集群支持版本固定并演练 `enforce-version`，避免升级时默认跟随最新规则而意外拒绝新 Pod。现有不合规 Pod 不会因为加了标签就自动被替换或修复。

## Namespace 和名称解析

在通常的集群 DNS 搜索配置下，同 Namespace 内可以用 `order-api` 访问 Service，跨 Namespace 使用 `order-api.orders` 或 `order-api.orders.svc.<集群域>`；集群域不保证是 `cluster.local`。名字解析成功只说明找到了地址，不证明应用端口和网络策略允许访问。

Pod 中 Secret、ConfigMap 和 PVC 的普通引用要求同 Namespace；RoleBinding 引用 Role 也要求同 Namespace。跨空间读取 API 对象可以通过显式授权完成，不能把“引用字段不支持”理解成“任何 API 都无法跨空间操作”。Gateway API 等资源有专门的跨空间规则，应按各自 API 检查。

集群级资源如 Node、Namespace、ClusterRole、StorageClass、CRD 不属于任何 Namespace。删除 Namespace 不会删除这些集群级对象或自动清理所有外部云资源。

## 删除边界

删除 Namespace 会级联删除其中的大量 Namespace 级对象，是高风险操作。对象带 finalizer 或 API 扩展不可用时，Namespace 可能长期 Terminating。

```bash
kubectl get namespace orders -o yaml
kubectl api-resources --verbs=list --namespaced -o name
kubectl get pods,deployments,services,persistentvolumeclaims -n orders
kubectl get apiservice
kubectl get namespace orders -o jsonpath='{.status.conditions}'
```

不要直接清空 Namespace finalizers 作为第一反应。先找出残留资源、不可用 APIService、Conversion Webhook 或控制器，确认外部资源清理完成；强制 finalize 可能留下云盘、负载均衡器或数据库。

`api-resources` 用于列出实际安装的 Namespace 级资源类型，再针对 Namespace Conditions 提示的类型逐一查询。`kubectl get all` 不包含 Secret、ConfigMap、PVC 和全部自定义资源，结果为空不能证明空间已清理。删除 `orders` 里的 PVC 还可能触发集群级 PV 和云盘回收，具体见 [PV/PVC](./pv-pvc.md)。

## 排障与审计

```bash
kubectl get namespace --show-labels
kubectl get all -n orders
kubectl get resourcequota,limitrange,networkpolicy -n orders
identity=替换为实际已认证用户名
kubectl auth can-i --list -n orders --as="$identity"
kubectl get events -n orders --sort-by=.metadata.creationTimestamp
```

模拟身份检查要求操作者拥有相应 `impersonate` 权限。`--as` 不会自动带上外部身份提供者的全部组；验证组绑定时，还需在批准的测试身份或完整组信息下核对，避免把模拟身份缺组误判成配置错误。

| 现象 | 优先检查 |
| --- | --- |
| 对象创建到错误空间 | 当前 kubeconfig namespace、清单 metadata.namespace |
| 创建被拒绝 | ResourceQuota、LimitRange、准入策略、RBAC |
| 跨 Namespace 访问失败 | DNS 名称、NetworkPolicy、目标授权机制 |
| Namespace 删除卡住 | remaining resources、finalizers、APIService/Webhook |
| 团队看见其他资源 | RoleBinding/ClusterRoleBinding 和聚合权限 |
