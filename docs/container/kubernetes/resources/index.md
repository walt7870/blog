---
title: Kubernetes 资源导览
author: Walt
date: 2026-05-17
---

# Kubernetes 资源导览

Kubernetes 的资源对象可以按职责分成工作负载、网络、配置、安全、存储、调度和治理几类。理解资源之间的关系，比单独记每个 YAML 字段更重要。

## 资源地图

| 类别 | 资源 | 作用 |
| --- | --- | --- |
| 工作负载 | [Pod](./pod)、[Deployment](./deployment)、[StatefulSet](./statefulset)、[DaemonSet](./daemonset)、[Job 和 CronJob](./job-cronjob) | 运行应用进程和任务 |
| 网络访问 | [Service](./service)、[Endpoint](./endpoint)、[Ingress](./ingress)、[NetworkPolicy](./networkpolicy) | 服务发现、入口流量和网络隔离 |
| 配置与密钥 | [ConfigMap](./configmap)、[Secret](./secret) | 注入配置和敏感信息 |
| 存储 | [PV 和 PVC](./pv-pvc) | 为 Pod 提供持久化数据 |
| 权限身份 | [ServiceAccount](./serviceaccount)、[RBAC](./rbac) | 控制 Pod 和用户能访问什么 |
| 资源治理 | [Namespace](./namespace)、[ResourceQuota](./resourcequota)、[LimitRange](./limitrange) | 多环境、多团队和资源边界 |
| 可用性与扩缩容 | [HPA](./hpa)、[VPA](./vpa)、[PodDisruptionBudget](./poddisruptionbudget) | 应对负载变化和维护中断 |
| 扩展资源 | [Custom Resource](./customresource) | 扩展 Kubernetes API |

## 部署一个服务时怎么组合

典型无状态服务通常从这几类资源开始：

1. Namespace：确定应用所在环境。
2. ConfigMap 和 Secret：准备配置和敏感信息。
3. Deployment：声明镜像、副本数、探针和资源限制。
4. Service：为 Pod 提供稳定访问入口。
5. Ingress：需要外部 HTTP/HTTPS 访问时再配置。
6. HPA 和 PDB：根据生产可用性要求补齐扩缩容和维护保护。

有状态服务还要增加 PVC 或 StatefulSet。需要节点级常驻进程时，优先看 DaemonSet。需要批处理或定时任务时，看 Job 和 CronJob。

## 常见排查链路

| 现象 | 检查资源 |
| --- | --- |
| Pod 一直 Pending | Pod、Node、ResourceQuota、PVC、调度约束 |
| Pod 反复重启 | Pod、ConfigMap、Secret、探针、应用日志 |
| Service 访问不到 | Service、Endpoint、Pod labels、NetworkPolicy |
| Ingress 不生效 | Ingress、IngressClass、Controller、Service |
| PVC 绑定失败 | PVC、PV、StorageClass、CSI 插件 |
| 扩缩容不工作 | HPA、metrics-server、Deployment、资源请求 |

每篇资源文档都按“概念定位、典型配置、常见误区、排查入口”展开，适合在遇到具体问题时按资源名查阅。
