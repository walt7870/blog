---
title: 容器基础导览
author: Walt
date: 2026-05-17
---

# 容器基础导览

容器基础模块用于解释所有容器技术共享的概念和标准。无论后续使用 Docker、containerd、Podman，还是把应用部署到 Kubernetes，都需要先理解镜像、容器、运行时、仓库、标准接口和隔离机制。

## 阅读路径

| 文档 | 重点 | 适合场景 |
| --- | --- | --- |
| [核心概念](./concepts) | 容器、镜像、运行时、namespace、cgroup、分层边界 | 建立全局认知 |
| [运行时与工具边界](./runtimes) | Docker、containerd、CRI-O、runc、Podman 的位置 | 分清生态角色 |
| [容器标准](./standards) | OCI、CRI、CNI、CSI 等标准 | 理解不同组件如何互通 |

## 为什么先看基础

很多容器问题不是 Docker 命令问题，而是分层边界没分清：

| 现象 | 背后的基础概念 |
| --- | --- |
| Kubernetes 节点没有 Docker 也能跑镜像 | 镜像标准和 CRI 运行时 |
| 容器删除后数据丢了 | 容器可写层和持久化卷 |
| 容器内端口监听了但外部访问不到 | 网络命名空间和端口映射 |
| 容器能启动但被 OOMKilled | cgroup 内存限制 |
| 镜像能拉取但无法运行 | CPU 架构、入口命令、运行时兼容 |

先掌握这些概念，后面学习 Docker 命令、Kubernetes YAML 和 Colima 工具时会更容易定位问题。
