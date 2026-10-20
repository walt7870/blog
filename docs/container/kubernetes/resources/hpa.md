---
title: Kubernetes HPA 与弹性容量
author: Walt
date: 2026-07-18
---

# Kubernetes HPA 与弹性容量

HorizontalPodAutoscaler（HPA）根据资源、自定义或外部指标调整 Deployment、StatefulSet 等可伸缩目标的副本数。它是反馈控制器，不是容量规划器：指标延迟、冷启动、资源请求和外部依赖都会影响扩缩容结果。

订单 API 从4个副本扩到8个，并不表示吞吐立即翻倍。指标要先传播，控制器再修改目标的 `scale`，随后工作负载控制器创建 Pod；调度、拉镜像、启动和预热完成后才有新增服务能力。

![负载上升到新增Pod Ready之间各阶段的假设时间线](/container/kubernetes-capacity-delay.svg)

## 计算模型

HPA 的核心比例近似为：

```text
期望副本数 = ceil(当前副本数 × 当前指标 / 目标指标)
```

实际算法还会处理容差、缺失指标、未就绪 Pod、稳定窗口和行为策略。使用 CPU `averageUtilization` 时，分母来自容器 CPU requests；没有可靠 requests，利用率目标就缺少稳定基准。

例如4个同配置、就绪且有有效指标的副本，平均CPU利用率为130%，目标65%，基础建议为 `ceil(4 × 130 / 65) = 8`。130%是实际使用量相对 request 的比例，不表示超过节点CPU总量；request为 `500m`、使用约 `650m` 就是130%。若其他条件不满足，最终结果不保证为8。

`Resource` 指标可能汇总Pod中多个容器；某个相关容器缺少 CPU request 会影响利用率计算。只希望按主业务容器伸缩时，可在集群支持的情况下使用 `ContainerResource`，并随容器重命名同步维护指标配置。

## 一个可控配置

示例要求 `orders/order-api` Deployment 已存在，资源 requests 已设置，资源指标API可用。Metrics Server通常需单独安装；Prometheus本身不会自动提供HPA需要的 `custom.metrics.k8s.io` 或 `external.metrics.k8s.io`，相应指标还需适配器与授权配置。

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-api
  namespace: orders
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-api
  minReplicas: 3
  maxReplicas: 20
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 60
        - type: Pods
          value: 4
          periodSeconds: 60
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 20
          periodSeconds: 60
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 65
```

快速扩容、慢速缩容是常见起点，但参数必须来自压测和生产曲线。长连接、批处理、队列消费者或昂贵初始化需要不同策略。

这里 `selectPolicy: Max` 选扩容策略中允许变化更大的一个；100%和4个Pod都在60秒统计窗口内约束变化，不表示每隔60秒必定执行一次。缩容300秒稳定窗口保留近期较高建议以抑制抖动，再由20%策略限制下降速度，不能把它理解成“低负载后固定等待300秒再一次缩完”。

## 选择指标

| 指标 | 适合场景 | 风险 |
| --- | --- | --- |
| CPU | CPU 成本随流量近似增长的无状态服务 | I/O 瓶颈时不能反映压力 |
| 内存 | 可释放、与并发相关的工作集 | 内存不回落会导致只扩不缩 |
| 请求并发/速率 | Web 服务容量与请求量相关 | 需处理采集与传播延迟 |
| 队列长度/积压时间 | 异步消费者 | 需要结合处理速率和消息时效 |
| 业务指标 | 指标直接对应用户负载 | 语义、可用性和防抖责任更高 |

一个 HPA 配置多个指标时，会选择各指标计算出的最大期望副本。若一个指标失败、另一个建议缩容，通常会跳过缩容；另一个有效指标建议扩容时仍可扩容。缺失指标不是0负载，不应据此主动减副本。

## HPA、VPA 和节点扩缩

- HPA 调整 Pod 数量。
- VPA 建议或调整单 Pod 的 requests，某些模式可能通过重建 Pod 生效。
- 节点扩缩组件为不可调度 Pod 增减节点。

HPA 扩出 Pod 后，如果节点没有容量，Pod 会 Pending；节点创建时间又可能远长于业务流量上升时间。容量规划必须包含预留节点、启动时间和故障冗余。

HPA 与 VPA 同时修改同一资源维度时可能互相影响。常见做法是 HPA 使用 CPU、请求或队列指标，VPA 只提供建议或管理另一维度，并先在非生产环境观察。

同一目标的副本数还应有明确所有者：GitOps持续重写 `.spec.replicas`、人工 `kubectl scale` 与HPA可能相互覆盖。采用HPA后，应在交付工具中明确字段管理方式，而不是让多个循环持续争抢副本数。

## 排查扩缩容

```bash
kubectl get hpa order-api -n orders -w
kubectl describe hpa order-api -n orders
kubectl get --raw '/apis/metrics.k8s.io/v1beta1/namespaces/orders/pods'
kubectl get deploy order-api -n orders -o yaml
kubectl get pod -n orders -l app=order-api -o wide
```

| 现象 | 优先检查 |
| --- | --- |
| `<unknown>` 指标 | metrics API、适配器、权限、指标标签 |
| CPU 很高但不扩 | CPU requests、目标类型、maxReplicas、HPA Conditions |
| 扩出 Pod 一直 Pending | 节点容量、资源请求、拓扑和节点扩缩 |
| 副本来回抖动 | 指标噪声、稳定窗口、冷启动和负载周期 |
| 已到 maxReplicas 仍超时 | 单副本容量、数据库/缓存/下游上限、排队策略 |
| 缩容造成请求中断 | readiness、优雅停机、连接排空和缩容速度 |

HPA通过目标控制器缩容，Deployment/StatefulSet随后删除Pod，并不经Eviction API申请PDB预算。PDB不能阻止这类缩容；长请求、消费者任务和长连接必须由应用排空、终止宽限期与伸缩策略保护。相同边界也适用于Deployment自己的滚动发布，见 [PDB](./poddisruptionbudget.md)。

## 验收方式

先压测单副本在目标尾延迟和错误率下的稳定吞吐，再验证指标传播、扩容启动、节点供给和下游容量。一次弹性实验应记录：负载开始、指标出现、HPA 决策、Pod Ready、流量恢复和缩容完成的时间点。

如果流量峰值在新副本 Ready 之前已经结束，单纯调 HPA 参数无法解决问题，应考虑预扩容、队列削峰、降低启动时间或保留基础容量。
