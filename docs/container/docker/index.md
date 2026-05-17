---
title: Docker 导览
author: Walt
date: 2026-05-17
---

# Docker 导览

Docker 是容器生态里最常见的开发者工具链之一。它把镜像构建、容器运行、网络、卷、日志和仓库操作封装成统一命令体验，适合本地开发、单机验证和镜像制作。

容器的全局概念和标准不放在 Docker 模块里，已经归到 [Basic](../basic/)。学习 Docker 前，最好先理解镜像、容器、运行时、OCI、CRI 等基础边界。

![Docker 镜像与容器层](/container/docker-layer-model.svg)

## 阅读路径

| 文档 | 重点 | 使用场景 |
| --- | --- | --- |
| [常用命令](./command) | 镜像、容器、日志、网络、卷、清理 | 日常开发和排查 |
| [Java 应用镜像](./java-application) | Spring Boot / Jar 应用的 Dockerfile、构建和运行 | 后端服务容器化交付 |
| [容器基础概念](../basic/concepts) | 容器、镜像、运行时、隔离机制 | 理解 Docker 背后的通用模型 |
| [运行时与工具边界](../basic/runtimes) | Docker、containerd、CRI-O、runc、Podman | 分清 Docker 与其他容器实现的关系 |

## Docker 在交付链路中的位置

Docker 主要负责面向使用者的四类工作：

| 能力 | 说明 | 常用入口 |
| --- | --- | --- |
| 构建镜像 | 根据 Dockerfile 把应用和依赖打包 | `docker build` |
| 运行容器 | 从镜像创建进程隔离环境 | `docker run` |
| 管理本地资源 | 查看镜像、容器、网络、卷和日志 | `docker ps`、`docker images`、`docker logs` |
| 组合多容器 | 描述本地多服务开发环境 | Docker Compose |

在团队协作中，Docker 通常配合镜像仓库使用。开发者构建镜像并推送到仓库，测试或生产环境再拉取同一个镜像运行。这个过程让“部署什么”变得明确：部署的是某个不可变镜像标签，而不是临时拼装的服务器环境。

## 基本工作流

一个最小的 Docker 工作流通常如下：

1. 写 `Dockerfile`，明确基础镜像、文件复制、依赖安装和启动命令。
2. 用 `docker build -t app:dev .` 构建镜像。
3. 用 `docker run --rm -p 8080:8080 app:dev` 本地验证。
4. 用 `docker logs`、`docker exec`、`docker inspect` 排查启动、端口、权限和挂载问题。
5. 给镜像打上仓库标签并推送，例如 `registry.example.com/app:1.0.0`。

## Docker 与 containerd

Docker 是完整工具链，containerd 更偏运行时组件。开发者通常直接使用 Docker 命令；Kubernetes 节点上则常见 containerd 负责镜像拉取和容器生命周期。两者都属于容器生态，但面向的使用层不同。

更细的边界见 [运行时与工具边界](../basic/runtimes)。

## 常见排查方向

| 现象 | 优先检查 |
| --- | --- |
| 容器启动后立刻退出 | 启动命令、入口脚本权限、应用日志 |
| 端口访问不到 | `-p` 映射、应用监听地址、主机防火墙 |
| 文件变更没生效 | 镜像是否重新构建、挂载路径是否覆盖 |
| 容器内无权限写文件 | 容器用户、挂载目录权限、SELinux/AppArmor |
| 镜像很大 | 基础镜像、构建缓存、无用依赖、多阶段构建 |

## 与 Kubernetes 的关系

Docker 可以在单机上直接运行容器，而 Kubernetes 面向集群部署和编排。生产环境中，Kubernetes 节点通常直接使用 containerd 或 CRI-O 作为运行时，不一定安装 Docker Engine。

这并不影响 Docker 的学习价值。Dockerfile、镜像、仓库、端口、环境变量和卷这些概念，仍然是理解 Kubernetes 工作负载的基础。
