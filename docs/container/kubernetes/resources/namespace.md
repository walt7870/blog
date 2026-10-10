---
title: Kubernetes Namespace
author: Walt
date: 2026-07-18
---

# Kubernetes Namespace

Namespace 为大多数 Kubernetes 对象提供命名和管理范围，适合按环境、团队或租户组织资源。它不是虚拟集群，也不会自动提供网络、资源和安全隔离；隔离需要 RBAC、NetworkPolicy、ResourceQuota、准入策略和节点边界共同完成。

## 怎样划分

常见划分方式：

| 方式 | 适合场景 | 风险 |
| --- | --- | --- |
| 按环境 | dev/staging/prod 管理边界明确 | 多团队共享时权限容易过宽 |
| 按团队/产品 | 责任、成本和权限容易归属 | 同一产品多环境仍需额外维度 |
| 按租户 | 多租户资源和策略边界 | 强隔离需求可能需要独立集群 |

不要为每个微服务创建 Namespace；这会放大 RBAC、配额、网络策略和运维对象数量。一个 Namespace 应对应稳定的管理和策略边界。

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

## Namespace 和名称解析

同 Namespace 内可以用 `order-api` 访问 Service，跨 Namespace 使用 `order-api.orders` 或完整集群 DNS。Secret、ConfigMap、Role、PVC 等 Namespace 级资源不能直接被其他 Namespace 引用，个别 API 会提供显式授权机制。

集群级资源如 Node、Namespace、ClusterRole、StorageClass、CRD 不属于任何 Namespace。删除 Namespace 不会删除这些集群级对象或自动清理所有外部云资源。

## 删除边界

删除 Namespace 会级联删除其中的大量 Namespace 级对象，是高风险操作。对象带 finalizer 或 API 扩展不可用时，Namespace 可能长期 Terminating。

```bash
kubectl get namespace orders -o yaml
kubectl api-resources --verbs=list --namespaced -o name
kubectl get <resource> -n orders
```

不要直接清空 Namespace finalizers 作为第一反应。先找出残留资源、不可用 APIService、Conversion Webhook 或控制器，确认外部资源清理完成；强制 finalize 可能留下云盘、负载均衡器或数据库。

## 排障与审计

```bash
kubectl get namespace --show-labels
kubectl get all -n orders
kubectl get resourcequota,limitrange,networkpolicy -n orders
kubectl auth can-i --list -n orders --as=<identity>
kubectl get events -n orders --sort-by=.metadata.creationTimestamp
```

| 现象 | 优先检查 |
| --- | --- |
| 对象创建到错误空间 | 当前 kubeconfig namespace、清单 metadata.namespace |
| 创建被拒绝 | ResourceQuota、LimitRange、准入策略、RBAC |
| 跨 Namespace 访问失败 | DNS 名称、NetworkPolicy、目标授权机制 |
| Namespace 删除卡住 | remaining resources、finalizers、APIService/Webhook |
| 团队看见其他资源 | RoleBinding/ClusterRoleBinding 和聚合权限 |
