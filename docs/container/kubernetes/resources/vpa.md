---
title: Kubernetes Vertical Pod Autoscaler
author: Walt
date: 2026-07-18
---

# Kubernetes Vertical Pod Autoscaler

Vertical Pod Autoscaler（VPA）根据历史和当前资源使用，为容器计算 CPU/内存 requests 建议，并可按配置把建议应用到 Pod。VPA 不是 kube-controller-manager 内置控制器，需要安装对应 CRD 和组件；能力与更新行为应以所用发行版为准。

例如订单 API 的内存 request 为128Mi，但多个业务周期稳定使用约350Mi。VPA可以给出更合适的声明建议，减少错误调度承诺；它不会替应用修复内存泄漏，也不会保证把request提高就能消除OOM。是否触及内存limit、是否有节点空间、是否允许中断，都要单独检查。

![VPA建议状态、Off观察模式与Recreate更新生效路径](/container/vpa-recommendation-application.svg)

## 组件和边界

常见实现包含：

- Recommender：计算目标、下限和上限建议。
- Admission Controller：在新 Pod 创建时写入建议资源。
- Updater：按模式和能力更新已有Pod资源；Recreate路径通过Eviction API驱逐，由工作负载控制器重建。

VPA 主要管理 requests，不是节点扩容器。requests 增大后如果节点无空间，Pod 可能 Pending，需要节点扩缩或容量预留配合。

## 先使用建议模式

示例要求已安装兼容的VPA CRD/Recommender，`orders/order-api`存在且业务容器名确实为 `api`。固定部署版本后先使用 `Off`，不依赖自动更新模式的默认值：

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
      - containerName: "*"
        mode: "Off"
      - containerName: api
        mode: "Auto"
        controlledResources: ["cpu", "memory"]
        controlledValues: "RequestsOnly"
        minAllowed: { cpu: 100m, memory: 128Mi }
        maxAllowed: { cpu: "2", memory: 2Gi }
```

`updateMode: Off` 只生成recommendation，适合先观察多个负载周期。容器策略中的 `mode: Auto` 表示对 `api` 计算建议，不会覆盖整个VPA的Off更新策略；通配Off使未单独配置的sidecar不被纳入自动管理。

这里明确设置 `RequestsOnly`。上游实现的 `controlledValues` 默认通常是 `RequestsAndLimits`，可能按request比例同步调整limit，不能把“VPA主要管理requests”理解为永远不碰limits。`RequestsOnly` 下也要检查建议是否超过原limit；例如内存request想升到384Mi而limit仍为256Mi，就必须先解决字段合同冲突，不能直接开启更新。

| 更新模式 | 生效入口 | 需要验证 |
| --- | --- | --- |
| `Off` | 仅写VPA状态中的建议 | 采样覆盖、应用真实瓶颈 |
| `Initial` | 新Pod创建时准入注入 | 旧Pod不会自动变化、新Pod能否调度 |
| `Recreate` | 准入注入，加Updater驱逐后重建 | PDB、最小副本、重建和恢复时间 |
| `InPlaceOrRecreate`（部署版本支持时） | 尝试原地调整，失败可回退重建 | 集群能力、容器resize策略、回退中断 |

原地调整不等于绝无中断；是否重启容器或回退驱逐取决于模式、集群及资源策略。其他模式名称与支持范围以安装的CRD、控制器镜像和feature gate共同确定，不能只因API接受了字段就认定节点已支持。

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

先对齐 `.status.recommendation.containerRecommendations[].containerName`，确认读的是业务容器，再比较当前request、建议和真实曲线。`lowerBound`并不保证应用稳定，`uncappedTarget`远高于 `maxAllowed` 也说明策略可能截断了需求，不能因为受限target停在2Gi就认定2Gi足够。

## 与 HPA 配合

HPA 使用 CPU utilization 时，分母是 CPU requests；VPA 同时修改 CPU requests 会改变 HPA 看到的比例，两个控制器可能互相影响。

常见策略：

- VPA 只输出建议，人工或流水线评审后调整。
- HPA 使用请求量、队列或其他不依赖 requests 的指标。
- VPA 只管理内存，HPA 使用 CPU 或业务指标。
- 在正式自动化前用真实负载验证组合行为。

## 更新中断

如果应用建议需要驱逐Pod，应同时检查PDB、拓扑、PVC、配额和剩余容量。Updater经Eviction API驱逐时会尊重PDB；替代Pod通常由控制器在旧Pod删除后创建，Deployment的 `maxSurge` 不能被当成VPA驱逐前必有替代Pod的保证。

验收要分别确认“建议已生成”“新Pod字段已注入”“调度成功”“业务恢复”，以及PDB拒绝驱逐时能否保留旧Pod。停止自动更新可先退回Off；已重建Pod的资源不会因此自动恢复，还需受控调整并验证实际对象。

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
