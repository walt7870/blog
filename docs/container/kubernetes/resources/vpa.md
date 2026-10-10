---
title: Kubernetes Vertical Pod Autoscaler
author: Walt
date: 2026-07-18
---

# Kubernetes Vertical Pod Autoscaler

Vertical Pod Autoscaler（VPA）根据历史和当前资源使用，为容器计算 CPU/内存 requests 建议，并可按配置把建议应用到 Pod。VPA 不是 kube-controller-manager 内置控制器，需要安装对应 CRD 和组件；能力与更新行为应以所用发行版为准。

## 组件和边界

常见实现包含：

- Recommender：计算目标、下限和上限建议。
- Admission Controller：在新 Pod 创建时写入建议资源。
- Updater：判断是否需要通过驱逐/重建让已有 Pod 使用新值。

VPA 主要管理 requests，不是节点扩容器。requests 增大后如果节点无空间，Pod 可能 Pending，需要节点扩缩或容量预留配合。

## 先使用建议模式

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: order-api
  namespace: orders
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-api
  updatePolicy:
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
      - containerName: api
        controlledResources: ["cpu", "memory"]
        minAllowed: { cpu: 100m, memory: 128Mi }
        maxAllowed: { cpu: "2", memory: 2Gi }
```

`Off` 模式只生成 recommendation，适合先观察多个负载周期。`Initial` 仅在 Pod 创建时应用；其他自动更新模式可能通过驱逐/重建 Pod 生效，具体名称和 in-place 能力随 VPA 版本与集群能力变化，启用前必须核对并演练。

## 阅读 Recommendation

```bash
kubectl get vpa order-api -n orders -o yaml
```

每个容器通常包含：

| 字段 | 含义 |
| --- | --- |
| `target` | 当前模型建议的 requests |
| `lowerBound` | 低于此值更容易资源不足 |
| `upperBound` | 高于此值可能浪费资源 |
| `uncappedTarget` | 不考虑 policy 上限时的原始目标 |

建议依赖观测历史。新服务、周期任务、突发流量和内存泄漏可能产生误导，不能直接把 target 当成永久容量值。

## 与 HPA 配合

HPA 使用 CPU utilization 时，分母是 CPU requests；VPA 同时修改 CPU requests 会改变 HPA 看到的比例，两个控制器可能互相影响。

常见策略：

- VPA 只输出建议，人工或流水线评审后调整。
- HPA 使用请求量、队列或其他不依赖 requests 的指标。
- VPA 只管理内存，HPA 使用 CPU 或业务指标。
- 在正式自动化前用真实负载验证组合行为。

## 更新中断

如果应用建议需要驱逐 Pod，应同时检查 Deployment surge、PDB、拓扑、PVC 和剩余容量。PDB 可能阻止 VPA 更新；强行绕过会扩大业务中断。

对单副本、有状态、长任务或启动缓慢的工作负载，优先建议模式或维护窗口，不默认开启自动驱逐。

## 排障

```bash
kubectl get vpa -A
kubectl describe vpa order-api -n orders
kubectl get pod -n orders -l app=order-api -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].resources.requests}{"\n"}{end}'
kubectl get events -n orders --sort-by=.metadata.creationTimestamp
```

| 现象 | 优先检查 |
| --- | --- |
| 没有 recommendation | VPA 组件、metrics 来源、历史窗口、targetRef |
| 新 Pod 未使用建议 | Admission Controller、update mode、resource policy |
| 自动更新长期不发生 | PDB、Updater、最小副本、驱逐限制 |
| 更新后 Pod Pending | requests 增长、节点容量、拓扑和配额 |
| HPA 行为突然变化 | CPU requests 是否被 VPA 修改 |

VPA 的目标是让 requests 更接近实际需求，不是替代性能分析。内存持续增长、CPU 异常和下游瓶颈仍要回到应用与系统证据定位。
