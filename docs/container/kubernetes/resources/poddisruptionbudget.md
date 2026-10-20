---
title: Kubernetes PodDisruptionBudget
author: Walt
date: 2026-07-18
---

# Kubernetes PodDisruptionBudget

PodDisruptionBudget（PDB）限制通过 Eviction API 发起的自愿中断期间，匹配工作负载可以同时少多少 Ready Pod。它用于节点排空、集群升级和部分自动化维护，不保护节点故障、内核崩溃或网络分区等非自愿中断。

例如订单服务期望3个副本、要求至少2个Ready。3个都健康时通常能驱逐1个；若其中1个已经不Ready，再驱逐一个健康Pod会只剩1个，预算会拒绝。PDB不会主动补副本，恢复工作仍属于Deployment等控制器。

![三副本最少两个就绪时，健康状态如何改变可驱逐预算](/container/pdb-healthy-budget.svg)

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

示例要求 `orders` 已存在，selector只匹配订单工作负载。`minAvailable: 2`不会因创建PDB就把应用扩为3副本；若HPA允许缩到2，健康Pod的自愿驱逐就可能被全部阻止。`maxUnavailable`适用于同一受支持控制器管理的Pod集合，不能随意混选多个独立服务。

百分比两种字段都向上取整，但含义不同：3副本的 `minAvailable: "50%"` 要求至少2个健康；`maxUnavailable: "50%"` 允许2个不可用，只剩1个。单副本配 `maxUnavailable: "30%"` 也可能允许驱逐唯一副本，不能把百分数直觉当成可用性保证。

PDB selector 必须精确匹配目标 Pod。`policy/v1` 中空 selector 会匹配 Namespace 中所有 Pod，不能作为占位配置。

## PDB 不提供什么

- 不阻止 Pod 因节点故障、OOM 或应用崩溃而消失。
- 不保证剩余 Pod 有足够业务容量。
- 不替代副本跨节点/可用区分布。
- 不控制 Deployment 自己的滚动发布策略。
- 不阻止HPA经目标控制器缩容，也不阻止普通Pod DELETE。
- 不保证有状态系统在少一个副本时仍满足一致性和仲裁。

高可用还需要副本、拓扑、探针、容量、优雅停机和数据层故障模型。

## 与节点排空的关系

`kubectl drain` 通过 Eviction API 请求驱逐，PDB 不允许时会等待或失败。常见阻塞原因：

- 副本数等于 `minAvailable`，没有任何可驱逐空间。
- 某些 Pod 不 Ready，`currentHealthy` 已低于目标。
- 新副本因资源、拓扑、PVC 或配额无法 Ready。
- 多个工作负载 PDB 同时限制维护窗口。

非自愿故障虽然不会被PDB拦住，但会降低健康副本数、消耗后续自愿中断空间。多个PDB的selector重叠也会导致驱逐失败，应检查实际匹配集合，而不是只看其中一个PDB的状态。

对于处于Running但不Ready的异常Pod，默认 `IfHealthyBudget` 策略在应用已不满足预算时可能阻塞驱逐。集群支持时可评估 `unhealthyPodEvictionPolicy: AlwaysAllow`，允许驱逐这些异常Pod，帮助维护继续；它不放宽健康Pod的预算，也不保证异常Pod的数据或任务可丢弃。应结合应用恢复机制选择。

不要用 `--disable-eviction` 或直接删除 Pod 绕过 PDB，除非已经明确接受可用性风险并有审批与恢复计划。

## 设计方法

1. 从业务允许的并发中断和剩余容量确定预算。
2. 验证单节点、单可用区和发布期间的副本分布。
3. 预留替代Pod的调度容量；drain本身不会保证先创建Ready替代Pod再驱逐。
4. 在维护演练中记录 Eviction、替代 Pod Ready 和服务指标。
5. 对单副本服务不要用 PDB 伪装高可用；先解决副本与状态问题。

## 排障

```bash
kubectl get pdb order-api -n orders -o yaml
kubectl describe pdb order-api -n orders
kubectl get pod -n orders -l app=order-api -o wide
node_name=替换为实际测试节点名称
kubectl drain "$node_name" --ignore-daemonsets --dry-run=server
```

服务端dry-run不会持久修改节点或真正迁移Pod，不能证明后续替代Pod能Ready、多个连续驱逐能完成或业务无中断。正式演练还需验证剩余容量、优雅停机和替代Pod恢复；`--ignore-daemonsets`只是跳过DaemonSet Pod，不代表把这些Pod迁走。

| 字段 | 含义 |
| --- | --- |
| `currentHealthy` | 当前匹配且健康的 Pod |
| `desiredHealthy` | 预算要求的健康 Pod 数 |
| `disruptionsAllowed` | 当前允许的自愿驱逐数量 |
| `expectedPods` | 控制器推导的期望 Pod 数 |

同时检查 `observedGeneration` 是否追上当前配置和状态Conditions。`disruptionsAllowed`是当前计算状态，真正驱逐时还会重新核对；它不是可以提前锁定的维护名额，也不能仅用 `currentHealthy - minAvailable` 替代全部控制器状态。

当 `disruptionsAllowed: 0` 时，先修复不 Ready Pod、补足容量或调整工作负载；只有重新评估业务风险后才修改预算。
