---
title: 容器工具导览
author: Walt
date: 2026-10-20
---

# 容器工具导览

在 Mac 上安装 Docker 命令后仍连不上服务，不一定是镜像问题：CLI 是入口，本地 Linux VM 提供内核，VM 内运行时创建容器。容器工具应按所处位置选择，而不是把 Colima、BuildKit、Registry 和 Kubernetes 都看成同一层的替代品。

![Docker 与 Kubernetes 的创建路径及本地虚拟机边界](/container/runtime-control-paths.svg)

## 从当前任务选择入口

| 当前任务 | 工具负责什么 | 阅读入口 |
| --- | --- | --- |
| macOS 运行 Linux 容器 | Docker Desktop、Colima 等提供本地 VM 与运行时入口 | [Colima](./colima)：安装、profile、端点、文件与端口排错 |
| 把程序变成镜像 | BuildKit 构建；buildx 管理构建器和构建入口 | [镜像构建与供应链](../docker/image-build-supply-chain) |
| 启动应用与数据库 | Docker CLI 管理实例，Compose 声明单机组合 | [常用命令](../docker/command)、[存储、网络与 Compose](../docker/storage-network-compose) |
| 分发团队镜像 | Docker Hub、Harbor 或云 Registry 保存镜像与访问策略 | [镜像构建与供应链](../docker/image-build-supply-chain) |
| 练习集群对象 | kind、minikube、k3d 或 Colima Kubernetes 提供本地集群 | [Kubernetes 导览](../kubernetes/)与[Colima](./colima) |
| 排查集群故障 | kubectl 查对象和事件，stern、k9s 辅助浏览 | [可观测性与证据链](../kubernetes/observability) |

同一个订单应用在 Docker Desktop 能启动，切到 Colima 后却看不到旧镜像和数据库卷，通常是因为请求进入了另一台 daemon。context 改变的是管理目标，不会把原有对象搬过去。应先确认两个端点，再通过镜像分发和数据库备份恢复迁移，而不是直接创建同名空卷后认定数据丢失。

## 本地通过后还要验证什么

本地练习可以验证配置、请求和重建后的数据，但不能直接证明生产容量或故障域隔离。Apple Silicon 上构建的 ARM 镜像需要核对目标节点平台；宿主共享目录的性能不能代表服务器本地卷；单 VM Kubernetes 也不能覆盖控制面或跨节点容灾。

进入新工具前留下原环境的端点、镜像摘要、平台和恢复方法；迁移后重放相同业务请求，并核对持久数据。运行时与编排的原理见[运行时与工具边界](../basic/runtimes)，接口分工见[容器标准](../basic/standards)。
