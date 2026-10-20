---
title: Kubernetes ResourceQuota
author: Walt
date: 2026-07-18
---

# Kubernetes ResourceQuota

ResourceQuota 限制一个 Namespace 可创建的对象数量和可申请的资源总量。它在 API 准入阶段拒绝超过配额的新建或更新，不会在运行时按团队节流 CPU，也不会主动驱逐已经运行的 Pod。

例如 `orders` 的 CPU requests 配额为20核，当前已声明18核。新建一个请求3核的 Pod 会超过配额；改成2核才满足这一项检查，但节点可能仍没有可放置的2核空位。配额是团队预算，调度是逐节点放置，两者不能互相替代。

![资源准入、配额拒绝与调度等待分别发生的位置](/container/resource-admission-capacity.svg)

## 计算与对象配额

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: orders-budget
  namespace: orders
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.memory: 80Gi
    requests.storage: 2Ti
    persistentvolumeclaims: "50"
    pods: "200"
    services.loadbalancers: "5"
```

示例要求 `orders` 已存在，并且集群启用了 ResourceQuota 准入。requests 配额限制资源声明总量，limits 配额限制声明上限总量，对象配额限制资源数量；它们不读取 `kubectl top` 的瞬时使用量作为预算。普通多容器 Pod 需要计入各容器，含 init 容器、原生 sidecar 或 Pod overhead 时按对应 Pod 资源计算规则核对，不能永远只把第一个容器乘副本数。

CPU、内存和 `pods` 预算针对非终止态 Pod；已经 Succeeded/Failed 的 Job Pod 不再消耗这些计算预算，但保留的 Job/Pod 对象仍可能消耗 `count/jobs.batch`、`count/pods` 等对象数配额。真实节点容量、系统预留和故障冗余仍需单独规划。

当 Namespace 对 requests/limits 设置配额时，未声明资源的 Pod 可能被拒绝。通常配套 LimitRange 提供兜底默认值，但生产工作负载应显式填写测量后的 requests。

本例要求新 Pod 具备 CPU/内存 requests 和内存 limit。平台应核对准入补值后的对象；不能因为工作负载原始模板没有这些字段，就认定没有消耗对应配额。多个匹配的 ResourceQuota 会同时约束对象，新增更宽的配额不会覆盖原来的窄配额。

## 按优先级或范围分配

ResourceQuota 支持 scopes 和 scopeSelector，可按 BestEffort、NotBestEffort、Terminating、PriorityClass 等范围区分配额。使用前应验证对象究竟落入哪个 scope，避免关键工作负载与批任务争用同一预算。

配额不是强多租户边界：集群级资源、节点容量、网络带宽、外部云配额和控制面负载仍可能被其他租户影响。

PriorityClass 配额也不是预留节点：它限制匹配 Pod 的声明总量，不会保证节点优先腾出这些容量。scopes 限定后只支持相应资源项，不应把通用配额清单原样复制进去；配额和规则本身的修改权限也需要限制，否则使用者可直接提高预算。

## 使用量和拒绝

```bash
kubectl get resourcequota orders-budget -n orders
kubectl describe resourcequota orders-budget -n orders
kubectl get resourcequota orders-budget -n orders \
  -o jsonpath='{.status.hard}{"\n"}{.status.used}{"\n"}'
```

Quota controller 异步计算 usage。新 Namespace 创建配额后短暂未完成初始计算时，某些受限资源的创建可能等待或被拒绝；自动化应处理明确 API 错误，不无限重试。

`status.used` 不是一份可由调用方自行扣减的余额。准入会执行配额核算，不能以“控制器异步”推断可以绕过上限；降低 hard 到当前 usage 以下，也不会主动删除已有 Pod。扩容节点不会自动增加 Namespace hard，调高 hard 也不会自动申请节点。

常见失败是 Deployment 创建成功、ReplicaSet 报 `FailedCreate / exceeded quota`，而不是所有新 Pod 都以 Pending 出现：被准入拒绝的 Pod 根本没有持久化。先看 ReplicaSet Events，区分“创建不出来”和“已创建但调度不出去”：

```bash
kubectl describe deployment order-api -n orders
kubectl get replicaset -n orders -l app=order-api
kubectl get events -n orders --sort-by=.metadata.creationTimestamp
kubectl get pods -n orders -l app=order-api -o wide
```

## 设计预算

1. 统计工作负载稳定 requests、峰值副本、发布 surge 和故障冗余。
2. 为 HPA 最大副本、Job 并行度和临时调试保留空间。
3. 单独限制 LoadBalancer、PVC、Secret 等容易带来成本或控制面压力的对象。
4. 设置 70%、85%、95% 等 usage 告警，而不是等 API 拒绝后再处理。
5. 建立临时扩容、审批、到期和回收流程。

配额设置得等于当前使用量会阻塞滚动发布，因为新版本可能需要 surge Pod。预算必须包含变更过程而不只包含稳定态。

例如10个普通单容器副本各请求1核，`maxSurge: 2` 时至少要为12核声明留空间，再考虑其他工作负载和终止中 Pod 的重叠；HPA 最大副本为20时，也不能仍按10核预算验收。先验证发布、扩容和节点维护三个过程，再决定预算。完整计算与发布时序见 [Deployment](./deployment.md)，单对象默认值见 [LimitRange](./limitrange.md)。

## 排障

| 现象 | 优先检查 |
| --- | --- |
| API 返回 exceeded quota | `status.used/hard`、本次对象增量、surge |
| Pod 因未声明 requests 被拒绝 | Quota 要求、LimitRange、Pod resources |
| HPA 无法继续扩容 | Pod/requests 配额、maxReplicas、节点容量 |
| PVC 创建被拒绝 | PVC 数量、requests.storage、StorageClass 配额 |
| 使用量看似不下降 | 对象是否真正删除、finalizer、controller 同步延迟 |
