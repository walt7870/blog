---
title: 容器标准与接口边界
author: Walt
date: 2026-05-17
---

# 容器标准与接口边界

同一个订单镜像能在不同平台运行，依赖镜像格式与运行约定的兼容；Pod 能拿到 IP、挂载数据卷，则需要网络和存储接口配合。OCI、CRI、CNI、CSI 描述不同对象的合同，不能用一个“容器标准”替代它们的具体职责。

![镜像、进程、网络与存储分别采用的接口合同](/container/container-interface-contracts.svg)

## OCI：内容、分发与启动

OCI Image Specification 描述清单、配置、文件系统层及镜像索引等内容对象；Distribution Specification 描述客户端与仓库之间的内容分发协议；Runtime Specification 描述运行 bundle 的配置和容器生命周期。镜像需要经过解包、准备根文件系统与运行配置，才能由运行时启动进程。

因此 OCI 运行时本身不承担 Dockerfile 构建，也不能仅凭支持 Runtime Specification 就推断它会访问镜像仓库。不同实现兼容这些规范，还需要在平台、可选能力和安全配置上匹配。校验摘要用于识别内容，验证发布者与供应链信任还需要另外的签名和策略机制。

## CRI：kubelet 与运行时

CRI 通过 gRPC 为 kubelet 提供镜像和运行时服务，包括镜像拉取、Pod sandbox 与容器生命周期等操作。kubelet 面对的是节点 CRI 端点，背后可以是 containerd 的 CRI 插件或其他实现，而非直接发送 Docker CLI 命令。

镜像拉取和 sandbox 准备属于不同阶段。订单 Pod 出现 `ImagePullBackOff`，先查镜像名、凭据、平台及仓库连接；出现 `FailedCreatePodSandBox`，应查看具体事件与运行时日志，继续区分网络、sandbox 配置及底层启动错误。不能把全部启动失败都归因于镜像。

## CNI：网络接入

CNI 约定运行时与网络插件的配置和调用，常见操作包括 ADD、DEL；插件可以结合 IPAM 分配地址。在 Kubernetes 的常见实现中，CRI 运行时准备 sandbox 时调用网络插件，失败或删除时还需要回收对应网络资源。实际调用与清理方式以所用实现为准。

CNI 接口并不承诺自动具备 NetworkPolicy、Service 转发或 Ingress 功能。具体网络方案可能组合实现其中多项能力，Service 流量转发则可由 kube-proxy 或替代数据面负责。排查 Pod 有 IP 却不能访问 Service 时，应继续检查端点、转发与策略，不能只验证地址分配。

## CSI：存储供给与挂载

CSI 定义身份、控制器和节点侧的存储 RPC；Kubernetes 通过相应组件及 sidecar 把存储对象操作衔接到驱动。不同驱动支持的能力不同，动态创建卷、控制器侧附加、节点挂载、扩容和快照不能一概视为必选能力。

应用通过 PVC 表达需求，PV 表示可用卷，StorageClass 可以描述动态供给策略；静态供给则可能直接使用已有 PV。PVC 处于 Pending 不一定是故障，采用 `WaitForFirstConsumer` 时可能在等待工作负载调度。PVC 已 Bound 只说明完成绑定，节点权限、附加或挂载仍可能失败，应用也未必已经可写。

例如订单导出 Pod 调度到新节点后，应分别核查卷供给、附加、节点挂载和应用目录权限。更换 StorageClass 不会自动把旧卷的数据搬到新卷；迁移要独立制定复制、一致性和回退方案。对象关系和配置见 [PV、PVC 与 StorageClass](../kubernetes/resources/pv-pvc)。

## 按失败对象排查

| 失败对象 | 先检查的合同与证据 |
| --- | --- |
| 镜像无法获取 | 分发协议、认证、内容摘要和目标平台 |
| 进程无法创建 | 运行配置、根文件系统、内核与 OCI 运行时错误 |
| kubelet 无法管理容器 | CRI 端点、协议版本和运行时健康状态 |
| sandbox 网络失败 | CNI 配置、插件日志、IPAM 和回收状态 |
| 卷已绑定但无法写入 | CSI 阶段事件、节点挂载、文件系统与用户权限 |

这些标准减少接口差异，并不意味着所有实现和插件都能无条件互换。变更运行时、网络或存储驱动前，需要明确旧对象如何退出、新对象如何接管，以及业务如何验收和恢复。
