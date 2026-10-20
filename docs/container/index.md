---
title: 容器技术
author: Walt
date: 2026-05-17
---

# 容器技术

订单服务在开发电脑上能启动，搬到服务器却提示缺少动态库；导出的 CSV 放在容器内部，重新创建容器后文件又不见了。这两类问题分别涉及交付环境和数据生命周期。容器把程序及其用户态依赖打包成镜像，但运行时仍需要匹配的平台、内核能力、配置、网络和存储。

![订单服务从镜像构建到运行与数据保存的交付关系](/container/container-delivery-map.svg)

镜像可以理解为程序的交付包。容器是用这个包创建的运行实例，多个实例可以使用同一镜像。Docker 提供单机上的构建、运行和管理入口；Kubernetes 持续比较应用期望状态与集群实际状态，驱动控制器和节点完成部署与恢复。二者处在不同的职责层次。

<TopicDirectory :items="[
  { title: '容器基础', description: '镜像、隔离、运行时和标准接口的关系', href: '/docs/container/basic/', icon: 'layers' },
  { title: 'Docker', description: '构建镜像、运行服务、连接网络与保存数据', href: '/docs/container/docker/', icon: 'boxes' },
  { title: 'Kubernetes', description: '工作负载、服务发现、存储与集群运行机制', href: '/docs/container/kubernetes/', icon: 'network' },
  { title: '本地工具', description: '在开发电脑上准备容器和集群运行环境', href: '/docs/container/tools/', icon: 'terminal' }
]" />

## 用订单交付线理解各层

构建订单服务时，先固定基础镜像、依赖和构建输入，产出适合目标 CPU 与操作系统的镜像，再记录发布摘要并推送镜像仓库。服务器拉取镜像后，还要注入数据库连接配置、声明监听端口并挂载导出目录，才能启动可用服务。镜像内容相同，不代表外部数据库、权限和环境配置也相同。

假设导出任务把 CSV 写到 `/exports`。没有挂载时，文件通常落入这个容器的可写层：停止再启动原容器，文件通常还在；删除并重建容器，可写层随旧容器删除。挂载命名卷后，该路径的写入进入卷，能否保留由卷的生命周期决定。若多台节点都要读取结果，还应选择合适的共享存储或对象存储，不能把单机目录当成跨节点共享。

单台机器部署几个服务，可以先用 Docker 和 Compose 管理。需要跨节点调度、失败后的副本补齐、声明式发布以及多团队资源治理时，再评估 Kubernetes。集群能重新创建进程，但数据库可用性、业务幂等、共享数据与正确探针仍需要应用和基础设施共同保证。

## 阅读路径

| 当前问题 | 入口 |
| --- | --- |
| 不清楚镜像、容器、卷和内核的关系 | [核心概念](./basic/concepts) |
| 分不清 Docker、containerd、runc、Podman | [运行时与工具边界](./basic/runtimes) |
| 想知道 OCI、CRI、CNI、CSI 各管什么 | [标准与接口边界](./basic/standards) |
| 准备运行第一个服务 | [Docker 导览](./docker/)与[命令](./docker/command) |
| 镜像太大、平台不匹配、版本难追踪 | [镜像构建与供应链](./docker/image-build-supply-chain) |
| 重建丢文件、服务连不上、要组合部署 | [存储、网络与 Compose](./docker/storage-network-compose) |
| 要把 Java 应用交付为镜像 | [Java 应用容器化](./docker/java-application) |
| 开始部署和治理集群工作负载 | [Kubernetes 导览](./kubernetes/)与[资源对象](./kubernetes/resources/) |
| 需要发布、排错和生产约束 | [生产实践](./kubernetes/production-practice)与[进阶机制](./kubernetes/advanced/) |
| macOS 需要 Linux 容器环境 | [工具导览](./tools/)与[Colima](./tools/colima) |

第一次实践可以依次完成“运行服务、观察日志、挂载目录、重新创建、验证数据”这条闭环，再进入镜像构建与集群编排。已经遇到故障时，从现象对应的对象开始：拉取失败查镜像，启动失败查进程和配置，访问失败查监听与网络，文件消失查写入落点和对象生命周期。

## 视频与配套内容

[容器视频目录](./video-series)和[Kubernetes 视频目录](./kubernetes/video-series)整理了对应章节。可结合 [Docker 实践视频](https://www.bilibili.com/video/BV1tbNK6LEgq/)与 [Kubernetes 系列](https://space.bilibili.com/181407346/lists/5147962?type=series)操作；执行命令前先确认当前工具版本和实验环境，避免把演示中的清理命令直接用于已有业务。
