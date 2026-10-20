---
title: Kubernetes 进阶视频系列
author: Walt
date: 2026-10-20
---

# Kubernetes 进阶视频系列

《Kubernetes 进阶：机制、扩展与云原生生态》共 24 集，主线从 API 与控制循环开始，继续进入网络、存储、高可用、版本升级、CRD、Operator、Gateway API、eBPF、服务网格、GitOps、可观测和内部开发平台。

视频用于展示状态变化和组件关系；正文负责补全命令、配置边界、失败证据和生产判断。系列可在 [B站视频列表](https://space.bilibili.com/181407346/lists/5147962?type=series) 连续观看。

## 学习路线

| 阶段 | 集数 | 学习目标 | 配套正文 |
| --- | --- | --- | --- |
| 控制系统基础 | EP01–EP05 | 理解 API 写路径、etcd、控制循环、调度和 Pod 落地 | [控制面、API 与调谐](./control-plane)、[调度与节点生命周期](./scheduling-node-lifecycle) |
| 数据面与可靠性 | EP06–EP09 | 跟踪网络、存储、故障域和容量闭环 | [数据面、存储与可靠性](./data-plane-reliability)、[可靠性、弹性与容量](./reliability-capacity) |
| 版本治理 | EP10–EP11 | 建立版本发布、兼容、升级和回退模型 | [版本与升级](./version-upgrade) |
| API 扩展 | EP12–EP17 | 选择扩展接口，设计 CRD，并实现可恢复的 Operator | [扩展点与接口边界](./advanced/extension-points)、[CRD](./advanced/CR-CRD)、[Operator](./advanced/operator) |
| 云原生生态 | EP18–EP22 | 跟踪流量数据路径、GitOps 控制循环和供应链证据 | [流量工程](./advanced/traffic-engineering)、[GitOps、策略与供应链](./advanced/delivery-security) |
| 可观测与平台 | EP23–EP24 | 建立跨层证据链，再组合成稳定的平台 API | [可观测性](./observability)、[平台工程](./advanced/platform-engineering) |

## 全部视频

| 集数 | 主题 | 视频 | 深入阅读 |
| --- | --- | --- | --- |
| EP01 | 为什么它是分布式控制系统 | [B站](https://www.bilibili.com/video/BV1KoKV6PEQK) | [控制面、API 与调谐](./control-plane) |
| EP02 | 一次 API 请求经历了什么 | [B站](https://www.bilibili.com/video/BV11RKV6eEuJ) | [控制面、API 与调谐](./control-plane) |
| EP03 | etcd 与 API 一致性 | [B站](https://www.bilibili.com/video/BV14RKV6vERc) | [控制面、API 与调谐](./control-plane) |
| EP04 | 控制器如何持续发现变化 | [B站](https://www.bilibili.com/video/BV1cpKV64ErR) | [控制面、API 与调谐](./control-plane) |
| EP05 | Pod 从提交到运行 | [B站](https://www.bilibili.com/video/BV1HpKV64EyK) | [调度与节点生命周期](./scheduling-node-lifecycle)、[Pod](./resources/pod) |
| EP06 | 网络数据面完整路径 | [B站](https://www.bilibili.com/video/BV1HnKV6ZERq) | [数据面、存储与可靠性](./data-plane-reliability)、[Service](./resources/service) |
| EP07 | 存储数据面完整路径 | [B站](https://www.bilibili.com/video/BV1JxKV6sEmc) | [数据面、存储与可靠性](./data-plane-reliability)、[PV 与 PVC](./resources/pv-pvc) |
| EP08 | 高可用不只是增加副本 | [B站](https://www.bilibili.com/video/BV1cxKV6sE3V) | [可靠性、弹性与容量](./reliability-capacity) |
| EP09 | 弹性与容量规划 | [B站](https://www.bilibili.com/video/BV1HWKV6dE1F) | [可靠性、弹性与容量](./reliability-capacity)、[HPA](./resources/hpa) |
| EP10 | Kubernetes 版本如何产生 | [B站](https://www.bilibili.com/video/BV1wWKV6dEVo) | [版本与升级](./version-upgrade) |
| EP11 | 生产集群如何安全升级 | [B站](https://www.bilibili.com/video/BV1PjKV6hEKP) | [版本与升级](./version-upgrade) |
| EP12 | Kubernetes 扩展体系 | [B站](https://www.bilibili.com/video/BV1NjKV6hE9u) | [扩展点与接口边界](./advanced/extension-points) |
| EP13 | 设计真正可用的 CRD | [B站](https://www.bilibili.com/video/BV1PLKV6wES3) | [CRD](./advanced/CR-CRD) |
| EP14 | CRD 版本演进与兼容 | [B站](https://www.bilibili.com/video/BV1KLKV6wEb4) | [CRD](./advanced/CR-CRD)、[版本与升级](./version-upgrade) |
| EP15 | Operator 的运行模型 | [B站](https://www.bilibili.com/video/BV14LKV6wEpR) | [Operator](./advanced/operator) |
| EP16 | 生产级 Reconcile | [B站](https://www.bilibili.com/video/BV1PJKV6bEYL) | [Operator](./advanced/operator) |
| EP17 | Operator 生命周期管理 | [B站](https://www.bilibili.com/video/BV1PJKV6bEyE) | [Operator](./advanced/operator) |
| EP18 | Gateway API 下一代入口 | [B站](https://www.bilibili.com/video/BV1AEKV6FErC) | [流量工程](./advanced/traffic-engineering)、[Ingress 与 Gateway](./resources/ingress) |
| EP19 | Cilium 与 eBPF 网络 | [B站](https://www.bilibili.com/video/BV1PEKV6FET5) | [流量工程](./advanced/traffic-engineering) |
| EP20 | Istio 服务网格深入 | [B站](https://www.bilibili.com/video/BV1dvKV67Egd) | [流量工程](./advanced/traffic-engineering) |
| EP21 | GitOps 控制循环 | [B站](https://www.bilibili.com/video/BV1qvKV6EEFi) | [GitOps、策略与供应链](./advanced/delivery-security) |
| EP22 | 策略、安全与供应链 | [B站](https://www.bilibili.com/video/BV17YKV6SEUz) | [GitOps、策略与供应链](./advanced/delivery-security) |
| EP23 | Kubernetes 可观测体系 | [B站](https://www.bilibili.com/video/BV1dYKV6UEgP) | [可观测性与证据链](./observability) |
| EP24 | 从集群到内部开发平台 | [B站](https://www.bilibili.com/video/BV1ZYKV6UEMN) | [平台工程](./advanced/platform-engineering) |

## 每个阶段应留下什么证据

可以用一个订单 API 贯穿学习：先发布三个副本，故意把 Service 的 `targetPort` 配错，记录“Pod Ready 但入口请求失败”的现象；再对齐 Service 端口、端点端口、应用监听端口和代理日志，修复后重放同一请求。这能区分“容器能运行”和“整条请求路径可用”，相关步骤分别对应 EP05、EP06 和 EP23。实验应在独立 namespace 内进行，并保留原配置用于恢复。

看完视频并不等于掌握机制。每个阶段至少应留下一个可以复核的产物：

1. 一次 API 变更的对象版本、Conditions、Events 和控制器动作时间线。
2. 一条从入口到 Pod 的网络路径，以及一次断点故障的定位记录。
3. 一次卷绑定或节点故障实验，包含数据恢复边界。
4. 一份升级前兼容矩阵和实际回退条件。
5. 一个具备 schema、status、Conditions、finalizer 和版本策略的 CRD。
6. 一次重复 Reconcile、并发更新和删除中断测试。
7. 一份生态组件选型记录，写清问题、收益、依赖、升级和退出成本。
8. 一次从业务 SLI 到对象、数据面和应用 Trace 的完整证据链。
