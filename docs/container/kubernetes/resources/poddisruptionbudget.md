---
title: Kubernetes PodDisruptionBudget
author: Walt
date: 2026-07-18
---

# Kubernetes PodDisruptionBudget

PodDisruptionBudget（PDB）限制通过 Eviction API 发起的自愿中断期间，匹配工作负载可以同时少多少 Ready Pod。它用于节点排空、集群升级和部分自动化维护，不保护节点故障、内核崩溃或网络分区等非自愿中断。

## `minAvailable` 与 `maxUnavailable`

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: order-api
  namespace: orders
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: order-api
```

只能设置 `minAvailable` 或 `maxUnavailable` 之一。对由 Deployment 等控制器管理的服务，`maxUnavailable: 1` 常能更直接表达允许一次中断一个副本；百分比会按 Kubernetes 规则取整，应在目标副本数上验证实际结果。

PDB selector 必须精确匹配目标 Pod。`policy/v1` 中空 selector 会匹配 Namespace 中所有 Pod，不能作为占位配置。

## PDB 不提供什么

- 不阻止 Pod 因节点故障、OOM 或应用崩溃而消失。
- 不保证剩余 Pod 有足够业务容量。
- 不替代副本跨节点/可用区分布。
- 不控制 Deployment 自己的滚动发布策略。
- 不保证有状态系统在少一个副本时仍满足一致性和仲裁。

高可用还需要副本、拓扑、探针、容量、优雅停机和数据层故障模型。

## 与节点排空的关系

`kubectl drain` 通过 Eviction API 请求驱逐，PDB 不允许时会等待或失败。常见阻塞原因：

- 副本数等于 `minAvailable`，没有任何可驱逐空间。
- 某些 Pod 不 Ready，`currentHealthy` 已低于目标。
- 新副本因资源、拓扑、PVC 或配额无法 Ready。
- 多个工作负载 PDB 同时限制维护窗口。

不要用 `--disable-eviction` 或直接删除 Pod 绕过 PDB，除非已经明确接受可用性风险并有审批与恢复计划。

## 设计方法

1. 从业务允许的并发中断和剩余容量确定预算。
2. 验证单节点、单可用区和发布期间的副本分布。
3. 确保集群有空间在驱逐前创建替代 Pod。
4. 在维护演练中记录 Eviction、替代 Pod Ready 和服务指标。
5. 对单副本服务不要用 PDB 伪装高可用；先解决副本与状态问题。

## 排障

```bash
kubectl get pdb order-api -n orders -o yaml
kubectl describe pdb order-api -n orders
kubectl get pod -n orders -l app=order-api -o wide
kubectl drain <node> --ignore-daemonsets --dry-run=server
```

| 字段 | 含义 |
| --- | --- |
| `currentHealthy` | 当前匹配且健康的 Pod |
| `desiredHealthy` | 预算要求的健康 Pod 数 |
| `disruptionsAllowed` | 当前允许的自愿驱逐数量 |
| `expectedPods` | 控制器推导的期望 Pod 数 |

当 `disruptionsAllowed: 0` 时，先修复不 Ready Pod、补足容量或调整工作负载；只有重新评估业务风险后才修改预算。
