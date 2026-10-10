---
title: Kubernetes ResourceQuota
author: Walt
date: 2026-07-18
---

# Kubernetes ResourceQuota

ResourceQuota 限制一个 Namespace 可创建的对象数量和可申请的资源总量。它在 API 准入阶段拒绝超过配额的新建或更新，不会在运行时按团队节流 CPU，也不会主动驱逐已经运行的 Pod。

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

requests 配额限制调度承诺总量，limits 配额限制声明上限总量，对象配额限制资源数量。真实节点容量、系统预留和故障冗余仍需单独规划。

当 Namespace 对 requests/limits 设置配额时，未声明资源的 Pod 可能被拒绝。通常配套 LimitRange 提供兜底默认值，但生产工作负载应显式填写测量后的 requests。

## 按优先级或范围分配

ResourceQuota 支持 scopes 和 scopeSelector，可按 BestEffort、NotBestEffort、Terminating、PriorityClass 等范围区分配额。使用前应验证对象究竟落入哪个 scope，避免关键工作负载与批任务争用同一预算。

配额不是强多租户边界：集群级资源、节点容量、网络带宽、外部云配额和控制面负载仍可能被其他租户影响。

## 使用量和拒绝

```bash
kubectl get resourcequota orders-budget -n orders
kubectl describe resourcequota orders-budget -n orders
kubectl get resourcequota orders-budget -n orders \
  -o jsonpath='{.status.hard}{"\n"}{.status.used}{"\n"}'
```

Quota controller 异步计算 usage。新 Namespace 创建配额后短暂未完成初始计算时，某些受限资源的创建可能等待或被拒绝；自动化应处理明确 API 错误，不无限重试。

## 设计预算

1. 统计工作负载稳定 requests、峰值副本、发布 surge 和故障冗余。
2. 为 HPA 最大副本、Job 并行度和临时调试保留空间。
3. 单独限制 LoadBalancer、PVC、Secret 等容易带来成本或控制面压力的对象。
4. 设置 70%、85%、95% 等 usage 告警，而不是等 API 拒绝后再处理。
5. 建立临时扩容、审批、到期和回收流程。

配额设置得等于当前使用量会阻塞滚动发布，因为新版本可能需要 surge Pod。预算必须包含变更过程而不只包含稳定态。

## 排障

| 现象 | 优先检查 |
| --- | --- |
| API 返回 exceeded quota | `status.used/hard`、本次对象增量、surge |
| Pod 因未声明 requests 被拒绝 | Quota 要求、LimitRange、Pod resources |
| HPA 无法继续扩容 | Pod/requests 配额、maxReplicas、节点容量 |
| PVC 创建被拒绝 | PVC 数量、requests.storage、StorageClass 配额 |
| 使用量看似不下降 | 对象是否真正删除、finalizer、controller 同步延迟 |
