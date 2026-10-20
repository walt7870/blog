---
title: Kubernetes 资源对象导览
author: Walt
date: 2026-10-20
---

# Kubernetes 资源对象导览

Kubernetes 的资源对象可以按职责分成工作负载、网络、配置、安全、存储、调度和治理几类。理解资源之间的关系，比单独记每个 YAML 字段更重要。

![资源配置怎样变成订单服务的请求路径](/container/kubernetes-request-data-path.svg)

以订单 API 为例：Deployment 经 ReplicaSet 补齐 Pod，Service 的 selector 让控制器整理 EndpointSlice，网络实现再把这些配置落实到转发规则。请求经过入口代理和数据面到达应用；EndpointSlice 保存的是后端信息，不是转发流量的中间服务。图中的配置传播和请求箭头要分开阅读，具体机制见[数据面、存储与可靠性](../data-plane-reliability)。

## 资源地图

| 类别 | 资源 | 作用 |
| --- | --- | --- |
| 工作负载 | [Pod](./pod)、[Deployment](./deployment)、[StatefulSet](./statefulset)、[DaemonSet](./daemonset)、[Job 和 CronJob](./job-cronjob) | 运行应用进程和任务 |
| 网络访问 | [Service](./service)、[EndpointSlice](./endpoint)、[Ingress 与 Gateway](./ingress)、[NetworkPolicy](./networkpolicy) | 服务发现、入口流量和网络隔离 |
| 配置与密钥 | [ConfigMap](./configmap)、[Secret](./secret) | 注入配置和敏感信息 |
| 存储 | [PV 和 PVC](./pv-pvc) | 为 Pod 提供持久化数据 |
| 权限身份 | [ServiceAccount](./serviceaccount)、[RBAC](./rbac) | 控制 Pod 和用户能访问什么 |
| 资源治理 | [Namespace](./namespace)、[ResourceQuota](./resourcequota)、[LimitRange](./limitrange) | 多环境、多团队和资源边界 |
| 可用性与扩缩容 | [HPA](./hpa)、[VPA](./vpa)、[PodDisruptionBudget](./poddisruptionbudget) | 应对负载变化和维护中断 |
| 扩展资源 | [Custom Resource](./customresource) | 进入 CRD 与 Operator 专题的兼容入口 |

## 部署一个服务时怎么组合

典型无状态服务通常从这几类资源开始：

1. Namespace：确定命名与策略作用域；它本身不提供完整网络或租户隔离。
2. ConfigMap 和 Secret：准备配置和敏感信息。
3. Deployment：声明镜像、副本数、探针和资源限制。
4. Service：为 Pod 提供稳定访问入口。
5. Ingress 或 Gateway/HTTPRoute：需要外部 HTTP/HTTPS 访问时，配合已部署的控制器配置入口。
6. HPA 和 PDB：分别处理负载驱动扩容和通过 Eviction API 发起的维护中断；PDB 不控制 Deployment 自身滚动删除。

有状态服务还要增加 PVC 或 StatefulSet。需要节点级常驻进程时，优先看 DaemonSet。需要批处理或定时任务时，看 Job 和 CronJob。

## 常见排查链路

| 现象 | 检查资源 |
| --- | --- |
| Pod 一直 Pending | Pod、Node、ResourceQuota、PVC、调度约束 |
| Pod 反复重启 | Pod、ConfigMap、Secret、探针、应用日志 |
| Service 访问不到 | Service、EndpointSlice、Pod labels、NetworkPolicy |
| Ingress 不生效 | Ingress/Gateway、Class、Controller、Service、EndpointSlice |
| PVC 绑定失败 | PVC、PV、StorageClass、CSI 插件 |
| 扩缩容不工作 | HPA、metrics-server、Deployment、资源请求 |

每篇资源文档都按“概念定位、典型配置、常见误区、排查入口”展开，适合在遇到具体问题时按资源名查阅。
