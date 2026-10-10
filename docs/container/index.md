---
title: 容器技术
author: Walt
date: 2026-05-17
---

# 容器技术

容器技术解决的是应用交付和运行隔离的问题：把应用、运行时、依赖库、配置入口和启动命令封装成镜像，再交给容器运行时或部署平台启动。Docker、containerd、Kubernetes、Colima 处在不同层级，不能简单归为同一类工具。

![容器交付链路](/container/container-delivery-map.svg)

配套视频分为两条路线：[容器与容器管理系统课](https://www.bilibili.com/video/BV1tbNK6LEgq/)负责从容器基础进入 Kubernetes，[Kubernetes 进阶：机制、扩展与云原生生态](https://space.bilibili.com/181407346/lists/5147962?type=series)继续深入控制面、数据面、Operator 和平台工程。逐集正文映射见 [容器基础视频系列](./video-series)和 [Kubernetes 进阶视频系列](./kubernetes/video-series)。

## 这组文档解决什么问题

容器专题按“基础概念 -> 容器实现 -> 部署编排 -> 使用工具”的方式组织：

| 模块 | 解决的问题 | 适合阅读的时机 |
| --- | --- | --- |
| [Basic](./basic/) | 容器、镜像、运行时、隔离机制、标准接口 | 建立全局认知，分清生态层级 |
| [Docker](./docker/) | Docker 作为容器工具链如何构建镜像、运行容器、管理网络和卷 | 单机开发、镜像制作、排查 Docker 使用问题 |
| [Kubernetes](./kubernetes/) | 如何把容器应用部署成可调度、可扩缩、可恢复的集群服务，并扩展为平台能力 | 多服务生产部署、发布治理、资源隔离、平台工程 |
| [Tools](./tools/) | Colima 等本地容器工具如何选择和使用 | macOS/Linux 本地容器环境、轻量 K8s 实验 |

## 从入门到生产的学习路径

| 阶段 | 需要解决的问题 | 正文入口 | 实践产物 |
| --- | --- | --- | --- |
| 运行模型 | 容器与虚拟机有何不同，进程怎样被隔离和限制 | [核心概念](./basic/concepts)、[运行时边界](./basic/runtimes) | 能画出镜像、容器、运行时和宿主内核的关系 |
| 单机交付 | 怎样构建、运行、联网并保存数据 | [Docker 导览](./docker/)、[存储、网络与 Compose](./docker/storage-network-compose) | 一个应用与数据库组成的可重复开发环境 |
| 制品治理 | 怎样缓存构建、缩小镜像并追踪进入生产的内容 | [镜像构建与供应链](./docker/image-build-supply-chain) | 带版本、摘要、扫描记录的运行镜像 |
| 集群编排 | 怎样管理副本、发布、服务发现、配置和持久卷 | [Kubernetes 导览](./kubernetes/)、[资源导览](./kubernetes/resources/) | 一组可部署的 Kubernetes 资源清单 |
| 生产治理 | 怎样约束资源、安全、容量并形成排障闭环 | [Kubernetes 生产实践](./kubernetes/production-practice) | 发布检查清单、容量数据和一次故障复盘 |

## 容器解决的核心问题

传统部署常见的问题是环境不可复制：开发机、测试机和生产机的系统版本、动态库、目录结构、启动参数都可能不一样。容器把这些差异收敛到镜像和启动参数里，让应用交付更接近“同一个制品在不同环境运行”。

容器常覆盖四个边界：

| 边界 | 说明 | 常见工具 |
| --- | --- | --- |
| 构建边界 | 把源码和依赖变成镜像 | Dockerfile、BuildKit |
| 运行边界 | 给进程提供隔离的文件系统、网络、资源限制 | Docker、containerd、runc |
| 分发边界 | 上传、拉取和版本化镜像 | Registry、Harbor、Docker Hub |
| 编排边界 | 管理多个副本、服务发现、滚动发布和故障恢复 | Kubernetes |

## 从代码到运行的路径

一个常见 Web 服务进入容器平台，大致会经过以下步骤：

1. 编写 `Dockerfile`，把应用和运行依赖封装成镜像。
2. 构建镜像并打标签，例如 `registry.example.com/order-api:1.4.2`。
3. 推送镜像到镜像仓库，让部署环境可以拉取。
4. 在单机用 Docker 验证端口、环境变量、卷挂载和启动命令。
5. 在 Kubernetes 中用 Deployment 描述副本数和发布策略。
6. 用 Service、Ingress、ConfigMap、Secret、PVC 等资源补齐访问、配置、密钥和存储。
7. 通过日志、事件、指标和探针排查运行状态。

这条链路中，基础概念解释“容器为什么能隔离和复用”，Docker 更关注“开发者如何构建和运行容器”，containerd 这类运行时更关注“节点如何实际管理容器生命周期”，Kubernetes 更关注“很多容器如何被稳定地部署和治理”。

## 容器、镜像、运行时与编排

| 概念 | 作用 | 容易混淆的点 |
| --- | --- | --- |
| 镜像 | 应用运行所需文件的只读模板 | 镜像不是正在运行的进程 |
| 容器 | 镜像启动后的运行实例 | 容器删除后，写入容器层的数据通常会丢失 |
| 运行时 | 拉取镜像、创建容器、管理生命周期 | containerd、CRI-O、runc 属于不同运行时层级 |
| 高层工具 | 封装构建、运行、日志、网络、卷等操作 | Docker、Podman 面向开发者体验 |
| 编排系统 | 调度、扩缩容、服务发现、滚动更新 | Kubernetes 不负责构建镜像，它负责部署和治理容器应用 |

## 什么时候先看 Basic

如果还分不清镜像、容器、运行时、仓库、CRI、OCI、CNI、CSI，应该先看 [Basic](./basic/)。这些概念是 Docker、containerd、Kubernetes 和 Colima 的共同底层。

## 什么时候只用 Docker

只用 Docker 通常适合单机开发、临时验证、工具服务、个人服务器和较小规模部署。判断标准不是“服务是否重要”，而是是否已经需要自动调度、多副本恢复、跨节点网络和集群级权限治理。

常见场景：

- 本地启动 MySQL、Redis、Nginx、MinIO 等依赖。
- 在 CI 中构建和测试镜像。
- 单台服务器部署一个明确边界的小应用。
- 排查镜像启动命令、端口映射、文件挂载和环境变量。

## 什么时候需要 Kubernetes

当系统开始出现多个服务、多副本、滚动发布、节点故障恢复、不同团队共享集群、配置和密钥统一管理时，就需要 Kubernetes 这类容器部署和编排框架。

典型信号：

- 一个服务至少需要多个副本，且要自动替换失败实例。
- 服务之间需要稳定发现，而不是手写 IP。
- 发布需要灰度、滚动更新、回滚和探针保护。
- 集群资源需要按团队、环境或命名空间隔离。
- 需要统一接入日志、监控、告警和权限控制。

## 排查入口

| 问题 | 优先查看 |
| --- | --- |
| 不清楚 Docker、containerd、Kubernetes、Colima 的关系 | [容器基础导览](./basic/) |
| 想理解 OCI、CRI、CNI、CSI | [容器标准](./basic/standards) |
| 镜像构建慢、镜像过大、容器启动命令不清楚 | [Docker 导览](./docker/) |
| 构建缓存不稳定、镜像无法追踪、供应链风险不清楚 | [镜像构建与供应链](./docker/image-build-supply-chain) |
| `docker run` 后端口不通、卷挂载不生效 | [Docker 常用命令](./docker/command) |
| 多服务启动顺序、容器 DNS、Volume 生命周期不清楚 | [存储、网络与 Compose](./docker/storage-network-compose) |
| Pod 起不来、服务访问不到、发布失败 | [Kubernetes 导览](./kubernetes/) |
| 不清楚 Pod、Service、Ingress、PVC 的分工 | [Kubernetes 资源导览](./kubernetes/resources/) |
| 想在 macOS 上轻量跑 Docker 或 Kubernetes | [工具导览](./tools/) |
| 需要上线检查、容量估算、安全基线和系统排障路径 | [Kubernetes 生产实践](./kubernetes/production-practice) |
