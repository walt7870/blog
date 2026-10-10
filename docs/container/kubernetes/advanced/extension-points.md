---
title: Kubernetes 扩展点与接口边界
author: Walt
date: 2026-07-18
---

# Kubernetes 扩展点与接口边界

Kubernetes 可扩展，不代表所有问题都应写 CRD。扩展点位于 API 同步路径、异步控制链、调度器、节点代理和数据面等不同位置；选错位置会扩大故障范围，甚至让一个辅助能力阻断整个集群。

![Kubernetes 扩展点与故障边界](/container/kubernetes-extension-points.svg)

## 先按故障边界分类

| 扩展点 | 所在路径 | 典型用途 | 失败影响 |
| --- | --- | --- | --- |
| CRD + Controller | API 存储 + 异步调谐 | 领域资源、平台 API | CR 可写但可能不收敛 |
| Admission Webhook/Policy | API 同步写路径 | 默认化、校验、策略 | 匹配请求延迟或失败 |
| Aggregated API | API 请求路径 | 自定义存储和 API 行为 | 对应 APIService 不可用 |
| Scheduler Plugin | 调度路径 | 特殊放置、协同调度 | Pod 无法绑定或延迟 |
| CRI | kubelet到运行时 | 容器与 sandbox 生命周期 | 节点无法启动/停止容器 |
| CNI | Pod sandbox 网络 | 地址、接口、路由、策略 | Pod 无法联网或创建 |
| CSI | 卷控制面和节点面 | 供应、attach、mount | PVC 或 Pod 卡住 |
| Device Plugin | kubelet设备分配 | GPU、FPGA、专用设备 | 设备不可见或分配失败 |
| DRA | API + 调度 + kubelet | 结构化动态设备请求 | ResourceClaim 或 Pod Pending |

同步路径扩展应最少化外部依赖，节点扩展应能逐节点灰度，异步控制器应能重试和恢复。不同类别不能用同一套“Deployment 可用率”完成验收。

## API 扩展：CRD 还是 Aggregated API

CRD 复用 kube-apiserver 的存储、watch、RBAC、schema、Status 和通用元数据，适合大多数声明式 API。Aggregated API 由独立 API Server 提供，可以自定义存储、协议和子资源行为，但需要维护 APIService、证书、发现、鉴权链和高可用。

如果只是需要复杂校验或控制逻辑，CRD + CEL + Controller 往往仍足够；只有确实需要 CRD 无法提供的 API 语义时才承担聚合 API 成本。

Admission 更接近门禁：ValidatingAdmissionPolicy 可以用 CEL 在 API Server 内声明校验；Webhook 适合必须调用自定义代码的场景。它们不应执行慢业务流程，也不应把外部创建动作放在一次 API 请求事务中。

## 调度器扩展

Scheduler Framework 暴露 PreFilter、Filter、Score、Reserve、Permit、Bind 等扩展点。插件必须清楚自己提供硬约束、软偏好还是绑定副作用：

- Filter 错误会让节点不可行，范围过大可能让所有 Pod Pending。
- Score 权重不合理会形成热点，但通常仍能调度。
- Reserve/Unreserve 必须成对恢复，否则失败周期可能泄漏预留状态。
- Permit 等待必须有超时和失败语义，避免 Pod 永久悬挂。
- 自定义 Bind 进入关键路径，需要与默认绑定和重试兼容。

优先使用内置亲和性、拓扑分布、污点和 RuntimeClass；只有稳定需求无法表达且团队能维护调度器版本兼容时再写插件。

## CRI、CNI 与 CSI

CRI 是 kubelet 和容器运行时之间的 gRPC 接口，覆盖镜像、Pod sandbox 和容器生命周期。containerd、CRI-O 等实现负责把请求落到 OCI 运行时与本地资源，但 kubelet仍是节点 Pod 状态的协调者。

CNI 更像一次网络配置协议：运行时在 sandbox 生命周期中调用插件，插件返回接口、地址、路由和 DNS 结果。Kubernetes NetworkPolicy 是否生效、Service 如何转发，取决于具体网络实现，不是 CNI 规范本身自动提供。

CSI 把供应、发布和挂载分到控制器服务与节点服务。驱动升级要分别验证控制器副本、节点 DaemonSet、sidecar 版本矩阵、已有卷和新建卷，不能只看 controller Deployment Ready。

## Device Plugin 与 DRA

Device Plugin 通过 kubelet注册和 gRPC `ListAndWatch` 上报设备健康，在 `Allocate` 时返回容器需要的设备、挂载或环境配置。插件通常以 DaemonSet 部署；kubelet重启后，插件必须重新注册。它适合整型扩展资源，但请求表达和共享模型有限。

Dynamic Resource Allocation（DRA）通过 DeviceClass、ResourceClaim、ResourceSlice 等 API 让设备请求、发现和分配更结构化，适合复杂设备属性与动态选择。DRA 能力仍随 Kubernetes 版本演进，采用前必须核对当前 API 稳定级别、驱动支持和 feature gates，不能把实验字段写成长期平台契约。

RuntimeClass 则用于选择容器运行时 handler，并可附带调度开销和节点约束。它解决“使用哪种隔离运行时”，不替代设备发现或网络存储插件。

## 扩展点选型问题

上线任何扩展前，按顺序回答：

1. 内置 API、策略或控制器能否表达需求。
2. 它位于同步、异步、调度还是节点路径。
3. 故障时阻断新变更，还是影响已有工作负载。
4. 状态、Events、指标和日志能否定位到具体阶段。
5. 如何灰度、双跑、回退和处理跨版本兼容。
6. 谁负责证书、RBAC、容量、升级和停止维护后的迁移。

最佳扩展点通常是能解决问题且故障边界最小的那个。可以异步完成的动作不要塞进 Admission，可以用标准资源表达的需求不要先发明一套新 API。

## 最小故障实验

| 扩展 | 注入故障 | 验收证据 |
| --- | --- | --- |
| Webhook | 停止后端或制造超时 | 匹配范围、failurePolicy、API 延迟与恢复 |
| Controller | 动作后、Status 前终止 | 重启后不重复副作用并最终收敛 |
| Scheduler Plugin | 返回不可行或超时 | Pod Event 可解释，不影响无关 Pod |
| CNI/CSI | 单节点插件不可用 | 故障局限、节点告警、恢复后自动继续 |
| Device Plugin/DRA | 设备变为 unhealthy | 容量更新、调度结果和运行中 Pod 边界 |

扩展设计完成的标志不是 Demo 成功，而是每个失败阶段都有可解释状态和退出路径。

## 官方资料

- [Compute, Storage, and Networking Extensions](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/)
- [Device Plugins](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/)
- [Dynamic Resource Allocation](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/)
