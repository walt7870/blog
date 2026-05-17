---
title: 运行时与工具边界
author: Walt
date: 2026-05-17
---

# 运行时与工具边界

容器生态里很多名字都能“运行容器”，但它们的层级不同。Docker 更像面向开发者的完整工具链，containerd 和 CRI-O 更像运行时，runc 和 crun 更靠近内核隔离执行，Kubernetes 是部署和编排平台，Colima 是本地环境工具。

## 分层关系

| 角色 | 典型项目 | 主要职责 |
| --- | --- | --- |
| 用户工具 | Docker CLI、Podman CLI | 提供命令行、构建、运行、日志、网络、卷等操作入口 |
| 高层运行时 | Docker Engine、containerd、CRI-O | 管理镜像、容器生命周期、快照、拉取和运行请求 |
| 低层运行时 | runc、crun | 根据 OCI runtime spec 创建容器进程 |
| 编排平台 | Kubernetes | 调度 Pod、维护副本、服务发现、滚动发布和自愈 |
| 本地环境工具 | Colima、Docker Desktop、Rancher Desktop | 在开发机上准备 Linux VM、运行时和可选 Kubernetes |

## Docker

Docker 是开发者最常接触的容器工具链。它提供 Dockerfile 构建、镜像管理、容器运行、网络、卷、日志和 Compose 等能力。它适合本地开发、单机部署、镜像构建和快速验证。

Docker 的价值在于把很多底层能力包装成一致的开发体验，但它不是容器技术本身。生产 Kubernetes 集群可以使用 Docker 构建镜像，却不一定用 Docker Engine 运行容器。

## containerd

containerd 是从 Docker 中拆分出来的高层容器运行时，专注镜像拉取、镜像存储、容器生命周期、快照和运行时调用。很多 Kubernetes 集群会直接使用 containerd 作为节点运行时。

containerd 通常不是普通开发者日常操作入口，但它是理解 Kubernetes 节点运行容器的重要组件。

## CRI-O

CRI-O 是面向 Kubernetes CRI 的运行时实现，目标是为 Kubernetes 提供必要的容器运行能力。它不像 Docker 那样提供完整开发者工作流，而是更聚焦集群节点运行时。

## runc 与 crun

runc 和 crun 属于低层 OCI runtime。高层运行时会调用它们来真正创建 Linux namespace、配置 cgroup、挂载文件系统并启动容器进程。

日常使用中很少直接操作 runc，但当排查底层运行时、容器逃逸防护、cgroup 或 seccomp/AppArmor 配置时，需要知道它的位置。

## Podman

Podman 是无守护进程的容器工具，命令体验与 Docker 接近，并强调 rootless 模式。它适合希望减少常驻 daemon、增强本地安全边界或在某些 Linux 发行版生态中替代 Docker 的场景。

## Kubernetes

Kubernetes 不是容器运行时，也不是镜像构建工具。它是容器应用的部署和编排框架。它通过 kubelet 调用 CRI 运行时，运行时再调用低层运行时启动容器。

在 Kubernetes 中，最重要的操作对象不是单个容器，而是 Pod、Deployment、Service、Ingress、ConfigMap、Secret、PVC 等资源。

## Colima

Colima 是 macOS 上的本地容器环境工具。macOS 不能直接使用 Linux 容器内核能力，所以 Colima 通过 Lima 创建 Linux 虚拟机，在虚拟机里运行 containerd 或 Docker，并可选择启用 Kubernetes。

Colima 不属于容器标准，也不是编排框架。它的定位是“让开发机更方便地使用容器生态”。

## 选型判断

| 需求 | 优先看 |
| --- | --- |
| 本地构建和运行镜像 | Docker、Podman、Colima |
| Kubernetes 节点运行时 | containerd、CRI-O |
| 容器底层隔离实现 | runc、crun |
| 多节点部署、服务发现、滚动发布 | Kubernetes |
| macOS 上轻量使用 Docker/Kubernetes | Colima |
