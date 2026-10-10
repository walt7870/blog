---
title: Kubernetes HPA 与弹性容量
author: Walt
date: 2026-07-18
---

# Kubernetes HPA 与弹性容量

HorizontalPodAutoscaler（HPA）根据资源、自定义或外部指标调整 Deployment、StatefulSet 等可伸缩目标的副本数。它是反馈控制器，不是容量规划器：指标延迟、冷启动、资源请求和外部依赖都会影响扩缩容结果。

## 计算模型

HPA 的核心比例近似为：

```text
期望副本数 = ceil(当前副本数 × 当前指标 / 目标指标)
```

实际算法还会处理容差、缺失指标、未就绪 Pod、稳定窗口和行为策略。使用 CPU `averageUtilization` 时，分母来自容器 CPU requests；没有可靠 requests，利用率目标就缺少稳定基准。

## 一个可控配置

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

## 选择指标

| 指标 | 适合场景 | 风险 |
| --- | --- | --- |
| CPU | CPU 成本随流量近似增长的无状态服务 | I/O 瓶颈时不能反映压力 |
| 内存 | 可释放、与并发相关的工作集 | 内存不回落会导致只扩不缩 |
| 请求并发/速率 | Web 服务容量与请求量相关 | 需处理采集与传播延迟 |
| 队列长度/积压时间 | 异步消费者 | 需要结合处理速率和消息时效 |
| 业务指标 | 指标直接对应用户负载 | 语义、可用性和防抖责任更高 |

一个 HPA 配置多个指标时，会选择各指标计算出的最大期望副本；任何关键指标不可用都可能影响缩容判断。

## HPA、VPA 和节点扩缩

- HPA 调整 Pod 数量。
- VPA 建议或调整单 Pod 的 requests，某些模式可能通过重建 Pod 生效。
- 节点扩缩组件为不可调度 Pod 增减节点。

HPA 扩出 Pod 后，如果节点没有容量，Pod 会 Pending；节点创建时间又可能远长于业务流量上升时间。容量规划必须包含预留节点、启动时间和故障冗余。

HPA 与 VPA 同时修改同一资源维度时可能互相影响。常见做法是 HPA 使用 CPU、请求或队列指标，VPA 只提供建议或管理另一维度，并先在非生产环境观察。

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
| 缩容造成请求中断 | readiness、优雅停机、PDB 和连接排空 |

## 验收方式

先压测单副本在目标尾延迟和错误率下的稳定吞吐，再验证指标传播、扩容启动、节点供给和下游容量。一次弹性实验应记录：负载开始、指标出现、HPA 决策、Pod Ready、流量恢复和缩容完成的时间点。

如果流量峰值在新副本 Ready 之前已经结束，单纯调 HPA 参数无法解决问题，应考虑预扩容、队列削峰、降低启动时间或保留基础容量。
