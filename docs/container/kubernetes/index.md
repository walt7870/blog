---
title: Kubernetes 导览
author: Walt
date: 2026-10-20
---

# Kubernetes 导览

Kubernetes 是一个以 API 和控制循环为核心的分布式系统。用户提交期望状态，控制平面保存并传播事实，控制器、调度器、kubelet 和数据面组件持续把实际状态向目标收敛。它负责部署和治理容器应用，但不负责构建镜像，也不替代应用本身的事务、数据复制和容灾设计。

![Kubernetes 控制循环](/container/kubernetes-control-loop.svg)

## 阅读路径

这组文档按“系统机制、资源对象、生产治理、平台扩展”组织，不要求按资源名称从头背到尾。

| 阶段 | 先解决的问题 | 文档入口 |
| --- | --- | --- |
| 建立系统模型 | API 请求怎样写入事实，控制器如何发现并修正偏差 | [控制面、API 与调谐](./control-plane) |
| 跟踪 Pod 落地 | scheduler 如何选节点，kubelet、CRI、探针和终止怎样接力 | [调度与节点生命周期](./scheduling-node-lifecycle) |
| 跟踪真实请求 | CNI、DNS、Service 和 CSI 链路经过哪些组件 | [数据面、存储与可靠性](./data-plane-reliability) |
| 组合应用资源 | Pod、Deployment、Service、Secret、PVC 等怎样分工 | [资源对象导览](./resources/) |
| 建立可靠性 | 故障域、QoS、HPA、节点扩容和恢复演练怎样闭环 | [可靠性、弹性与容量](./reliability-capacity) |
| 进入生产 | 怎样设置发布、安全和排障基线 | [生产实践](./production-practice) |
| 建立证据链 | 怎样关联指标、日志、Trace、Events 和审计 | [可观测性与证据链](./observability) |
| 管理生命周期 | 如何检查版本偏差、废弃 API、组件兼容和回退边界 | [版本与升级](./version-upgrade) |
| 扩展平台 | CRD、Operator、扩展接口、流量、GitOps 和平台 API 如何协作 | [进阶扩展](./advanced/) |

配套的 24 集进阶视频已经全部公开，逐集链接和正文映射见 [Kubernetes 进阶视频系列](./video-series)。

## Kubernetes 解决什么问题

单机容器工具可以启动进程，但无法单独解决跨节点调度、副本恢复、服务发现、滚动发布、集群级权限和统一观测。Kubernetes 把这些问题拆成可以组合的 API 对象和控制器。

| 工程问题 | Kubernetes 机制 | 仍需应用或平台负责 |
| --- | --- | --- |
| 进程退出、节点失联 | 控制器补副本，kubelet管理节点上的 Pod | 正确的探针、优雅停机和故障冗余 |
| 副本地址变化 | Service、DNS、EndpointSlice | 协议超时、重试、幂等和连接池 |
| 跨节点放置 | scheduler、资源请求、亲和性、拓扑分布 | 容量模型和跨可用区成本 |
| 配置与凭据注入 | ConfigMap、Secret、ServiceAccount | 密钥系统、轮换、审计和应用热加载 |
| 持久卷挂载 | PV、PVC、StorageClass、CSI | 数据库复制、备份、恢复和一致性 |
| 自动扩缩 | HPA、节点扩缩组件、外部指标 | 可水平扩展的应用和可信指标 |

## 一次变更的完整路径

以修改 Deployment 镜像为例，成功响应只表示 API 请求已经被接受，不表示新版本已经对外提供服务。

1. 客户端把对象发送到 kube-apiserver。
2. 请求经过认证、授权、准入和字段校验，再写入存储。
3. Deployment 控制器观察到新期望，更新 ReplicaSet。
4. ReplicaSet 控制器创建新 Pod，scheduler 为其选择节点。
5. 目标节点上的 kubelet 拉取镜像并通过 CRI 创建容器。
6. kubelet 更新就绪条件，EndpointSlice 控制器更新端点条件，Service 数据面据此选择可用后端。EndpointSlice 可以已经包含未就绪 Pod 的地址，不是只在就绪后才出现。
7. 发布控制器根据 `maxSurge`、`maxUnavailable` 和 Pod 状态继续推进。

例如订单查询接口升级后，镜像已拉取但数据库连接池尚未初始化，Pod 可以 Running 而 Ready 为 false。默认路由应继续使用可服务的旧副本；如果 readiness 只探测一个提前开放的端口，新副本就可能过早接流量。排查发布应同时检查 rollout、Pod Conditions、Events、EndpointSlice 和业务响应。`publishNotReadyAddresses`、终止端点及数据面策略有例外，详见[数据面、存储与可靠性](./data-plane-reliability)。

以下观察命令假设已经存在 `orders` namespace 和 `order-api` Deployment，不会创建应用：

```bash
kubectl rollout status deploy/order-api -n orders
kubectl get deploy,rs,pod -n orders -o wide
kubectl get endpointslice -n orders -l kubernetes.io/service-name=order-api
kubectl get events -n orders --sort-by=.metadata.creationTimestamp
```

## 控制平面和工作节点

| 区域 | 组件 | 主要职责 | 常见证据 |
| --- | --- | --- | --- |
| 控制平面 | kube-apiserver | API 入口、认证授权、准入和对象读写 | 审计日志、请求延迟、错误码 |
| 控制平面 | etcd | 保存 API 对象的持久状态 | 提交延迟、空间、成员健康 |
| 控制平面 | kube-scheduler | 为未绑定 Pod 选择节点 | PodScheduled Condition、调度 Events |
| 控制平面 | controller-manager | 运行内置控制循环 | 对象状态、Events、工作队列指标 |
| 工作节点 | kubelet | 协调 Pod、卷、探针和容器生命周期 | Pod Conditions、kubelet 日志 |
| 工作节点 | CRI 运行时 | 拉取镜像、创建和停止容器 | 容器状态、运行时日志 |
| 数据面 | CNI、Service 实现 | Pod 联网和 Service 转发 | EndpointSlice、路由、连接指标 |

## 当前版本基线

生产集群应选择受支持分支的当前补丁版本，并在升级前核对组件版本偏差、废弃 API 和生态兼容矩阵。分支号、支持期限和升级检查集中在[版本与升级](./version-upgrade)，总览中的控制循环不依赖某个固定小版本。

## 按现象进入文档

| 现象 | 先看哪里 |
| --- | --- |
| `apply` 成功但对象不收敛 | [控制面、API 与调谐](./control-plane) |
| Pod Pending、拉镜像失败或探针不通过 | [调度与节点生命周期](./scheduling-node-lifecycle)、[Pod](./resources/pod) |
| Service 有地址但请求失败 | [数据面、存储与可靠性](./data-plane-reliability)、[Service](./resources/service) |
| PVC Pending 或卷无法挂载 | [PV 与 PVC](./resources/pv-pvc)、[数据面、存储与可靠性](./data-plane-reliability) |
| 扩缩容不稳定、容量仍然不足 | [可靠性、弹性与容量](./reliability-capacity)、[HPA](./resources/hpa) |
| Gateway、Cilium 或 Mesh 路径异常 | [流量工程](./advanced/traffic-engineering) |
| 权限拒绝、策略阻断或制品不可信 | [GitOps、策略与供应链](./advanced/delivery-security) |
| CR 一直 Terminating、Operator 重复执行 | [CRD](./advanced/CR-CRD)、[Operator](./advanced/operator) |
| 有告警但无法定位到具体控制环 | [可观测性与证据链](./observability) |
| 升级后 API 或扩展组件异常 | [版本与升级](./version-upgrade) |
