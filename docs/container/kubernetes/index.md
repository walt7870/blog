---
title: Kubernetes 导览
author: Walt
date: 2026-05-17
---

# Kubernetes 导览

Kubernetes 是容器部署和编排框架，负责把一组容器应用运行在多台机器组成的集群上。它不是容器运行时，也不是镜像构建工具；它通过 kubelet 调用 containerd、CRI-O 等 CRI 运行时来运行容器。

![Kubernetes 控制循环](/container/kubernetes-control-loop.svg)

## 阅读路径

| 文档 | 重点 | 适合场景 |
| --- | --- | --- |
| [资源导览](./resources/) | Pod、Deployment、Service、Ingress、ConfigMap、Secret、PVC 等资源的分工 | 学习和排查应用部署 |
| [进阶导览](./advanced/) | CRD、Operator 等扩展机制 | 理解平台扩展和自动化运维 |

## Kubernetes 解决什么问题

单机 Docker 可以启动容器，但生产环境需要面对更多问题：服务要有多个副本，节点会故障，发布要可回滚，配置和密钥要统一管理，应用之间要通过稳定地址访问。Kubernetes 把这些问题抽象成资源对象和控制循环。

| 问题 | Kubernetes 的处理方式 |
| --- | --- |
| 容器挂了怎么办 | kubelet 和控制器重新拉起或替换 Pod |
| 服务副本数如何保持 | Deployment、ReplicaSet、StatefulSet 等控制器维护副本 |
| Pod IP 变化如何访问 | Service 提供稳定访问入口和服务发现 |
| 外部流量如何进入 | Ingress 或 LoadBalancer Service 暴露入口 |
| 配置如何注入 | ConfigMap、Secret、环境变量、挂载文件 |
| 存储如何持久化 | PV、PVC、StorageClass 和 CSI 插件 |
| 权限如何控制 | ServiceAccount、Role、RoleBinding、RBAC |

## 核心组件

Kubernetes 集群可以分成控制平面和工作节点。

| 区域 | 组件 | 作用 |
| --- | --- | --- |
| 控制平面 | kube-apiserver | 所有资源操作的统一入口 |
| 控制平面 | etcd | 保存集群状态数据 |
| 控制平面 | kube-scheduler | 为未调度的 Pod 选择节点 |
| 控制平面 | kube-controller-manager | 运行控制循环，对齐期望状态和实际状态 |
| 工作节点 | kubelet | 管理本节点 Pod 生命周期 |
| 工作节点 | Container Runtime | 拉取镜像并运行容器 |
| 工作节点 | kube-proxy / CNI | 支撑 Service 转发和 Pod 网络 |

## 应用部署的资源组合

一个常见 Web 应用在 Kubernetes 里通常不是一个 YAML，而是一组资源协作：

| 资源 | 负责内容 |
| --- | --- |
| Namespace | 隔离环境或团队空间 |
| Deployment | 管理无状态应用副本和滚动更新 |
| Service | 为 Pod 集合提供稳定访问入口 |
| Ingress | 管理 HTTP/HTTPS 域名和路径路由 |
| ConfigMap | 注入非敏感配置 |
| Secret | 注入密码、Token、证书等敏感信息 |
| PVC | 申请持久化存储 |
| HPA | 根据指标水平扩缩容 |
| PDB | 控制维护期间的最小可用副本 |

## 排查应用时的顺序

Kubernetes 故障排查要沿着资源链路往下看，而不是只盯着 Pod。

1. 看资源是否存在：Deployment、Service、Ingress、ConfigMap、Secret 是否在正确 Namespace。
2. 看控制器状态：Deployment 是否完成 rollout，ReplicaSet 是否创建了 Pod。
3. 看 Pod 状态：是否 Pending、CrashLoopBackOff、ImagePullBackOff、OOMKilled。
4. 看事件：`kubectl describe` 中的 Events 往往直接说明调度、镜像、探针或卷挂载问题。
5. 看日志：容器日志用于判断应用启动和业务错误。
6. 看网络路径：Ingress 到 Service，Service 到 Endpoint，Endpoint 到 Pod。

## 常用命令入口

```bash
kubectl get pod -A
kubectl get deploy,svc,ingress -n <namespace>
kubectl describe pod <pod> -n <namespace>
kubectl logs <pod> -n <namespace>
kubectl rollout status deploy/<name> -n <namespace>
```

命令只是入口，关键是知道自己正在检查哪一层：调度、启动、配置、网络、存储、权限还是应用自身。
