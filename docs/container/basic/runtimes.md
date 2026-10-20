---
title: 运行时与工具边界
author: Walt
date: 2026-05-17
---

# 运行时与工具边界

Docker、containerd 和 runc 经常出现在同一台机器上，因为它们承担不同职责。排查“容器起不来”时，需要先区分请求有没有到达管理端、镜像有没有准备好，以及进程创建在哪一步失败。

![Docker Engine 与 Kubernetes 节点的运行时调用关系](/container/runtime-control-paths.svg)

## Docker 的创建路径

Docker CLI 向 Engine API 发送请求，daemon 负责镜像、容器、网络和卷等管理工作。常见 Linux 安装中，Engine 使用 containerd 管理容器生命周期，containerd 经由 shim 与配置的 OCI 运行时启动进程。runc 是常用 OCI 运行时，主要完成进程创建等操作，不需要作为每个容器的常驻管理服务。

镜像构建通常由 BuildKit 执行，与启动既有镜像是不同路径。排查构建依赖下载失败，应检查构建器和构建网络；运行中的服务无法访问数据库，则应检查服务配置及运行网络。

CLI 不一定操作本机 daemon。先用下面的只读命令确认上下文、连接端点及客户端和服务端版本：

```bash
docker context show
docker context inspect
docker version
```

若 context 指向远程服务器，绑定挂载的宿主路径也按 daemon 所在服务器解释。开发电脑上存在 `/data/exports`，不代表远程 daemon 能看到该目录。连接失败时，客户端版本信息也不能代替服务端状态。

## Kubernetes 节点的创建路径

用户提交工作负载后，API Server 保存资源，控制器推动期望状态，调度器为待调度 Pod 选择节点。节点上的 kubelet 通过 CRI 与容器运行时通信。containerd 的 CRI 插件和 CRI-O 都能提供这类能力，再使用 OCI 运行时创建进程。Kubernetes 1.26 及以后要求运行时支持 CRI v1。

Docker 构建的兼容镜像可以被这类运行时使用，镜像兼容性与管理 API 兼容性是两回事。Kubernetes 移除内置 dockershim 后，不能因此推断 Docker 构建的镜像失效；若要使用 Docker Engine，则需要匹配的 CRI 适配方案。

`docker`、`ctr`、`nerdctl` 和 `crictl` 的连接端点、namespace 与管理模型不同。containerd 的 namespace 是管理对象隔离机制，也不能和 Linux namespace 混为一谈。在错误 namespace 下查不到容器，不代表节点上没有容器；绕过 kubelet 手动删除任务，还可能让平台状态与实际状态暂时不一致。集群排错优先从 Pod 事件、节点状态及正确的 CRI 端点开始。

## Podman 与本地虚拟机

Podman 可以在没有中心 daemon 的方式下管理容器，但仍有运行时、辅助监控进程及可选 API 服务。“无中心 daemon”不等于不产生后台进程。rootless 方式减少部分宿主权限暴露，同时带来端口、挂载、用户映射和资源委派约束；是否安全仍取决于实际授权与运行配置。

macOS 上的 Colima 基于 Lima 提供 Linux 虚拟机，再在其中运行所选容器运行时。Docker CLI 是操作入口，虚拟机负责提供 Linux 内核，这两个职责不能互换。Docker Desktop、Rancher Desktop 也会组合运行环境、工具与管理能力，启用哪个后端和集群需要查看当前配置。

订单容器运行失败时，先确认操作端点，再看镜像拉取、实例创建和进程退出证据。只有虚拟机本身异常时才进入 VM 层；只有节点端 CRI 出错时才检查对应运行时，避免在多个工具中反复执行互不对应的清理命令。

接口如何分工见[容器标准](./standards)，本地环境操作见[Colima](../tools/colima)。
