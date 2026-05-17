---
title: 容器工具导览
author: Walt
date: 2026-05-17
---

# 容器工具导览

容器工具主要服务本地开发、镜像构建、集群访问和运维排查。它们不是容器技术本身，而是围绕容器运行时、镜像仓库或 Kubernetes 提供更顺手的使用入口。

## 当前文档

| 文档 | 重点 | 适用场景 |
| --- | --- | --- |
| [Colima](./colima) | macOS 上使用 Docker、containerd 或 Kubernetes 的本地环境工具 | 不想使用 Docker Desktop，或希望更可控地配置本地虚拟机 |

## 工具分类

| 类别 | 作用 | 常见工具 |
| --- | --- | --- |
| 本地运行环境 | 在开发机提供 Linux VM、容器运行时或 Docker 兼容体验 | Docker Desktop、Colima、Rancher Desktop、Podman |
| 镜像构建 | 构建和缓存镜像 | Docker BuildKit、buildx、kaniko |
| 镜像仓库 | 保存和分发镜像 | Docker Hub、Harbor、云厂商 Registry |
| Kubernetes 本地集群 | 本地学习和测试 K8s | kind、minikube、k3d、Colima Kubernetes |
| 运维排查 | 查看日志、事件、资源状态 | kubectl、stern、k9s |

## 选择建议

| 场景 | 推荐方向 |
| --- | --- |
| macOS 日常开发，只需要 Docker 命令 | Colima 或 Docker Desktop |
| 需要本地跑一个轻量 Kubernetes | Colima Kubernetes、kind、k3d |
| CI 中构建镜像 | BuildKit、buildx、云厂商构建服务 |
| 团队镜像治理 | Harbor 或云厂商 Registry |
| Kubernetes 日常排查 | kubectl 为基础，再补 k9s、stern 等工具 |

工具的选择不应脱离团队环境。生产集群用什么运行时、镜像仓库和网络插件，本地环境最好尽量贴近它们；否则本地能跑不代表上线后行为一致。Colima 这类工具的定位是降低本地使用容器的门槛，不应和 Docker、containerd、Kubernetes 的生态层级混淆。
