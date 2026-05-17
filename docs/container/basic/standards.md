---
title: 容器标准
author: Walt
date: 2026-05-17
---

# 容器标准

容器生态能互通，关键在于标准把职责拆开：镜像如何表达、镜像如何分发、容器如何启动、Kubernetes 如何调用运行时、网络和存储如何插件化。标准让 Docker 构建的镜像可以被 containerd 拉取，也让 Kubernetes 能替换底层运行时。

## 标准分层

| 标准或接口 | 关注点 | 典型实现或使用方 |
| --- | --- | --- |
| OCI Image | 镜像格式、层、清单、配置 | Docker、BuildKit、containerd、Podman |
| OCI Runtime | 如何根据 bundle 启动容器 | runc、crun、gVisor |
| OCI Distribution | 镜像仓库的拉取和推送协议 | Docker Registry、Harbor |
| CRI | kubelet 调用容器运行时的接口 | containerd、CRI-O |
| CNI | 容器或 Pod 网络插件接口 | Calico、Cilium、Flannel |
| CSI | 存储系统接入编排平台的接口 | 云盘、Ceph、NFS、各类存储插件 |

## OCI：镜像和运行时的共同语言

OCI 主要解决两个问题：

- 镜像怎么表达：层、清单、平台架构、启动配置。
- 容器怎么启动：文件系统 bundle、命名空间、cgroup、挂载、生命周期钩子。

对日常使用者来说，最重要的影响是：镜像不再只属于 Docker，镜像已经成为云原生交付中的通用制品。

## CRI：Kubernetes 与运行时的边界

CRI 是 kubelet 调用容器运行时的接口。kubelet 不需要知道底层是 containerd 还是 CRI-O，只要运行时实现 CRI，就可以接入 Kubernetes。

这解释了一个常见现象：Kubernetes 集群中可以没有 Docker Engine，但仍然能运行 Dockerfile 构建出来的镜像。因为 Kubernetes 真正需要的是符合镜像标准和 CRI 接口的运行时。

## CNI：Pod 网络的插件化

CNI 负责给容器或 Pod 配置网络。Kubernetes 创建 Pod 时，会让网络插件为 Pod 分配 IP、配置路由和网络策略能力。

不同 CNI 插件侧重点不同：

| 插件方向 | 关注点 |
| --- | --- |
| 基础连通 | Pod 跨节点互通、Service 转发 |
| 网络策略 | 控制 Pod 间访问关系 |
| 可观测性 | 连接追踪、流量分析、故障定位 |
| 高性能 | eBPF、直连路由、减少封包开销 |

## CSI：存储的插件化

CSI 让 Kubernetes 能以统一方式接入不同存储系统。应用通过 PVC 申请存储，具体由哪个云盘、分布式存储或本地存储提供，由 StorageClass 和 CSI 插件决定。

这个分层让业务 YAML 不需要直接绑定某个云厂商 API。迁移环境时，通常可以保持 PVC 使用方式不变，只替换底层 StorageClass。

## 选型时怎么看

| 问题 | 关注点 |
| --- | --- |
| 镜像能不能在不同环境运行 | 是否符合 OCI 镜像格式，架构是否匹配 |
| Kubernetes 节点用什么运行时 | 是否实现 CRI，运维生态是否成熟 |
| Pod 网络怎么排查 | 当前使用的 CNI 插件、网络策略、路由模式 |
| PVC 为什么绑定失败 | StorageClass、CSI 插件、存储容量和权限 |
| 镜像仓库如何治理 | 镜像签名、漏洞扫描、保留策略、访问控制 |
