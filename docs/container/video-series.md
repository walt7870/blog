---
title: 容器与容器管理视频系列
author: Walt
date: 2026-07-12
---

# 容器与容器管理视频系列

这组视频从 Linux 进程隔离开始，沿着 Docker 构建与运行、镜像分发、Kubernetes 编排，一直讲到安全、可观测性和生产容量。视频用于建立动态的系统视角，正文负责补充命令、配置、判断标准和排障步骤。

系列入口：[容器与容器管理系统课：从 Docker 到 Kubernetes 生产实践](https://www.bilibili.com/video/BV1tbNK6LEgq/)

![从构建镜像到运行配置、请求验证与数据保存的交付关系](/container/container-delivery-map.svg)

## 分集与配套阅读

<div class="container-video-map" tabindex="0" role="region" aria-label="容器视频与配套正文">

| 集数 | 主题 | 视频 | 配套正文 |
| --- | --- | --- | --- |
| 01 | 容器到底是什么：从一个进程到集群管理系统 | [播放](https://www.bilibili.com/video/BV1tbNK6LEgq/?p=1) | [核心概念](./basic/concepts)、[运行时边界](./basic/runtimes) |
| 02 | Docker 生命周期与日常操作 | [播放](https://www.bilibili.com/video/BV1tbNK6LEgq/?p=2) | [Docker 导览](./docker/)、[常用命令](./docker/command) |
| 03 | Dockerfile、镜像分层与 BuildKit | [播放](https://www.bilibili.com/video/BV1tbNK6LEgq/?p=3) | [镜像构建与供应链](./docker/image-build-supply-chain) |
| 04 | Namespace、cgroups、OCI 与运行时 | [播放](https://www.bilibili.com/video/BV1tbNK6LEgq/?p=4) | [运行时与工具边界](./basic/runtimes)、[容器标准](./basic/standards) |
| 05 | 容器存储与数据边界 | [播放](https://www.bilibili.com/video/BV1tbNK6LEgq/?p=5) | [存储、网络与 Compose](./docker/storage-network-compose) |
| 06 | 容器网络全链路 | [播放](https://www.bilibili.com/video/BV1tbNK6LEgq/?p=6) | [存储、网络与 Compose](./docker/storage-network-compose) |
| 07 | Docker Compose 单机编排 | [播放](https://www.bilibili.com/video/BV1tbNK6LEgq/?p=7) | [存储、网络与 Compose](./docker/storage-network-compose) |
| 08 | Registry 与镜像供应链 | [播放](https://www.bilibili.com/video/BV1tbNK6LEgq/?p=8) | [镜像构建与供应链](./docker/image-build-supply-chain) |
| 09 | Kubernetes 架构与 API 对象 | [播放](https://www.bilibili.com/video/BV1tbNK6LEgq/?p=9) | [Kubernetes 导览](./kubernetes/)、[资源导览](./kubernetes/resources/) |
| 10 | 工作负载、发布、调度与扩缩容 | [播放](https://www.bilibili.com/video/BV1tbNK6LEgq/?p=10) | [Deployment](./kubernetes/resources/deployment)、[HPA](./kubernetes/resources/hpa)、[生产实践](./kubernetes/production-practice) |
| 11 | Service、Ingress 与集群网络 | [播放](https://www.bilibili.com/video/BV1tbNK6LEgq/?p=11) | [Service](./kubernetes/resources/service)、[Ingress](./kubernetes/resources/ingress)、[NetworkPolicy](./kubernetes/resources/networkpolicy) |
| 12 | ConfigMap、Secret、PV 与有状态应用 | [播放](https://www.bilibili.com/video/BV1tbNK6LEgq/?p=12) | [ConfigMap](./kubernetes/resources/configmap)、[Secret](./kubernetes/resources/secret)、[PV 与 PVC](./kubernetes/resources/pv-pvc) |
| 13 | Kubernetes 安全与多租户治理 | [播放](https://www.bilibili.com/video/BV1tbNK6LEgq/?p=13) | [RBAC](./kubernetes/resources/rbac)、[ServiceAccount](./kubernetes/resources/serviceaccount)、[生产实践](./kubernetes/production-practice) |
| 14 | 可观测性、排障与生产容量 | [播放](https://www.bilibili.com/video/BV1tbNK6LEgq/?p=14) | [生产实践](./kubernetes/production-practice) |

</div>

<style scoped>
.container-video-map { max-width: 100%; }
.container-video-map :deep(table) { min-width: 620px; }
.container-video-map :deep(th:nth-child(3)),
.container-video-map :deep(td:nth-child(3)) { white-space: nowrap; }
@media (max-width: 640px) {
  .container-video-map { overflow-x: auto; }
}
</style>

## 学习顺序

第一次接触容器时，先完成 01 至 04 集并阅读[基础导览](./basic/)，确认能解释镜像、容器、运行时、OCI、CRI 的边界。接着完成 05 至 08 集，用一个带数据库的应用练习镜像、卷、网络、Compose 和 Registry。最后进入 09 至 14 集，把同一个应用迁移到 Kubernetes，补齐探针、资源约束、发布策略、安全和监控。

例如订单导出任务先生成 CSV，再删除并重建应用容器：CSV 若消失，应检查文件是否只写入容器可写层；数据库若保留，也还需验证备份能否恢复。迁移到 Kubernetes 后则继续检查新 Pod 是否重新挂到正确卷、是否就绪并真正接收请求。这条练习同时覆盖生命周期、持久化和服务入口，不把“容器 Running”当作业务完成。

不建议只背资源名称。每完成一段，应留下可以运行的交付物：

1. 一个可重复构建、以非 root 用户运行的镜像。
2. 一份能启动应用和数据库的 Compose 文件，包含持久卷与健康检查。
3. 一组 Kubernetes 清单，至少包含 Deployment、Service、ConfigMap、Secret 和资源请求。
4. 一份故障记录，写明现象、证据、定位层级、修复动作和验证结果。

## 能力验证

- 能解释进程的 Namespace、cgroups 隔离，以及常见分层文件系统的写入落点，并说明共享内核的边界。
- 能判断数据应该进入镜像、容器可写层、Bind Mount 还是 Volume。
- 能解释主机端口、容器端口、容器 DNS 与 Service 发现的差别。
- 能用镜像摘要追踪实际制品，而不是只依赖可变标签。
- 能沿 Deployment -> ReplicaSet -> Pod 查发布；排查请求时，分别核对 Ingress/Service 的入口配置、EndpointSlice 中的端点条件，以及数据面实际选择的 Pod。EndpointSlice 不承载业务请求。
- 能根据工作负载选择 requests、limits、探针、扩缩容和中断预算。
- 能区分应用错误、资源不足、调度失败、网络故障、存储故障和权限故障。
