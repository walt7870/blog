---
title: Kubernetes 生产实践
author: Walt
date: 2026-07-18
---

# Kubernetes 生产实践

生产级 Kubernetes 不是把 `docker run` 改写成 YAML。它要求应用、资源对象、调度策略、网络、存储、安全和观测形成闭环：控制器能够恢复已知故障，团队能够用证据定位未知故障，容量和发布策略能够保护服务目标。

![Kubernetes 生产排障链路](/container/production-troubleshooting-loop.svg)

这篇文章负责跨资源的生产组合。控制面时序见 [控制面、API 与调谐](./control-plane)，网络与存储路径见 [数据面、存储与可靠性](./data-plane-reliability)，逐集视频入口见 [Kubernetes 进阶视频系列](./video-series)。

## 从期望状态理解 API

客户端把资源提交给 kube-apiserver，数据经过认证、授权、准入和校验后保存。控制器持续观察实际状态并创建或更新下级对象，scheduler 为未绑定节点的 Pod 选择位置，kubelet 再通过容器运行时落实到节点。

因此，Deployment 显示成功不等于请求链路成功；Pod Running 也不等于应用 Ready。检查时要区分：

- 对象是否被 API 接受。
- 控制器是否生成了 ReplicaSet 和 Pod。
- Pod 是否被调度、拉取镜像并启动。
- 就绪探针是否通过，EndpointSlice 是否包含该 Pod。
- Service、Ingress 和应用协议是否一致。

## 资源请求、限制与调度

`requests` 是调度和资源保障的重要依据，`limits` 是运行上限。CPU 超过限制通常会被节流，内存超过限制可能触发 OOMKill。没有可靠的 requests，scheduler 无法判断节点还能承载多少负载，HPA 的 CPU 利用率也可能失去稳定基准。

```yaml
resources:
  requests:
    cpu: 250m
    memory: 512Mi
  limits:
    cpu: "1"
    memory: 1Gi
```

初始值应来自压测和生产观测：记录稳定吞吐下的 CPU、工作集内存、尾延迟和 GC，再为波动留余量。不要把 limits 当成容量规划；容量还要考虑副本数、节点可用资源、系统预留、升级中断和故障冗余。

调度约束按目标选择：

| 目标 | 机制 |
| --- | --- |
| 只运行在具备某能力的节点 | nodeSelector、nodeAffinity、taint/toleration |
| 副本分散到不同节点或可用区 | podAntiAffinity、topologySpreadConstraints |
| 节点维护时保留最少副本 | PodDisruptionBudget |
| 随指标调整副本 | HPA；同时保证应用可水平扩展 |

## 发布与探针

启动探针保护启动较慢的应用；就绪探针决定 Pod 是否进入 Service 后端；存活探针只用于判断进程是否已无法自行恢复。把外部数据库短暂不可用放进存活探针，可能造成所有副本同时重启并放大故障。

```yaml
strategy:
  rollingUpdate:
    maxUnavailable: 0
    maxSurge: 1
startupProbe:
  httpGet: { path: /health/startup, port: 8080 }
  failureThreshold: 30
  periodSeconds: 5
readinessProbe:
  httpGet: { path: /health/readiness, port: 8080 }
  periodSeconds: 5
livenessProbe:
  httpGet: { path: /health/liveness, port: 8080 }
  periodSeconds: 10
```

发布前还要确认 `terminationGracePeriodSeconds` 与应用优雅停机时间匹配，并用 `preStop` 或应用信号处理完成摘流、停止接收新请求和处理在途请求。

## 网络请求链路

外部 HTTP 请求通常经过 LoadBalancer 或 Gateway/Ingress Controller、路由规则、Service、EndpointSlice，最终进入 Pod。排查时从两端向中间收敛：

```bash
kubectl get ingress,svc,endpointslice -n orders
kubectl describe ingress order-api -n orders
kubectl run net-debug --rm -it --image=curlimages/curl -- sh
# 容器内测试 DNS、Service 和 Pod 地址
```

Service 的 selector 必须匹配 Pod label，目标端口必须与应用监听端口一致。NetworkPolicy 启用默认拒绝后，要同时允许入口流量和 DNS、数据库等必要出口，不应只写入站规则。

## 配置、密钥与存储

ConfigMap 与 Secret 的职责是把环境差异移出镜像，但 Secret 默认并不等同于加密保险箱。应配合静态加密、最小 RBAC、外部密钥系统、轮换和审计。

配置变更还要明确生效方式：环境变量只在容器创建时读取；挂载文件可能更新，但应用是否重新加载取决于自身实现。常见做法是把配置摘要写入 Pod template annotation，使配置变化触发受控滚动发布。

有状态服务要同时考虑：

- PVC 的访问模式、容量、StorageClass 与扩容能力。
- StatefulSet 的稳定标识和每副本独立卷。
- 同可用区调度、卷绑定与节点故障恢复时间。
- 应用级复制、备份、恢复演练和一致性要求。

PVC 让卷独立于 Pod，但不会自动提供跨区域容灾，也不能替代数据库备份。

## 安全与多租户

生产工作负载至少应落实以下基线：

```yaml
securityContext:
  runAsNonRoot: true
  seccompProfile:
    type: RuntimeDefault
containers:
  - name: api
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop: ["ALL"]
```

ServiceAccount 应按工作负载拆分，不使用默认账号承载广泛权限；Role 与 RoleBinding 只授予必要 Namespace 和资源动作。Namespace 是组织边界，不是完整安全边界，还需结合 NetworkPolicy、ResourceQuota、LimitRange、准入策略和节点隔离。

## 可观测与排障

日志用于还原离散事件，指标用于发现趋势和触发告警，追踪用于定位跨服务延迟，事件用于解释 Kubernetes 控制面的近期决策。四类信号要共享服务名、环境、版本、Pod 和 trace 标识，才能从告警追到具体发布与请求。

```bash
kubectl get deploy,rs,pod -n orders -o wide
kubectl describe pod <pod> -n orders
kubectl logs <pod> -n orders --previous
kubectl get events -n orders --sort-by=.lastTimestamp
kubectl top pod -n orders
kubectl rollout history deploy/order-api -n orders
```

稳定的排障顺序是：先确认影响范围和最近变更，再判断故障位于 API/控制器、调度、节点运行时、应用启动、网络、存储还是权限层；每一步都留下可复核证据，修复后用相同指标验证恢复。

## 容量与高可用

“能承受多少并发”不能由节点数量直接推导。它由单请求成本、外部依赖、延迟目标、实例资源、连接池、队列长度和峰值模型共同决定。容量规划应通过压测获得单副本在目标延迟和错误率下的稳定吞吐，再计算副本和节点需求。

```text
所需副本数 = 峰值请求量 / 单副本稳定吞吐 × 冗余系数
```

随后校验节点故障、滚动发布和可用区故障时，剩余容量是否仍满足目标。HPA 解决的是已定义指标下的副本调整，无法弥补错误的资源请求、慢数据库、冷启动过长或不可水平扩展的应用。具体算法、指标和节点扩缩边界见 [HPA 与弹性容量](./resources/hpa)。

## 版本与扩展组件

生产基线还包括 Kubernetes 小版本、补丁版本和生态兼容矩阵。截至 2026-07-18，官方维护 1.36、1.35、1.34 三个小版本分支；执行升级时仍需在当天重新核对补丁版本与发行版支持情况。

升级前至少扫描废弃 API、CRD served/storage 版本、Admission/Conversion Webhook、CNI、CSI、Gateway/Ingress、Service Mesh、Operator 和监控栈。详细顺序、停止条件和回退边界见 [版本与升级](./version-upgrade)。

## 上线检查清单

- 镜像使用受控 Registry 和可追踪摘要，以非 root 用户运行。
- requests、limits、探针、优雅停机和滚动策略经过验证。
- 副本跨节点或可用区分散，并配置适当的 PDB。
- Service、Ingress、NetworkPolicy 和 TLS 链路有独立验证步骤。
- 配置与密钥不进入镜像，权限遵循最小授权并可轮换。
- 持久数据有备份、恢复演练和故障边界说明。
- 日志、指标、追踪、事件能够关联到版本与实例。
- 容量结果来自目标场景压测，并包含发布和故障冗余。
- 回滚动作、负责人和验证指标在发布前已经明确。
- Kubernetes、CNI、CSI、CRD、Webhook 和平台组件版本位于验证过的兼容矩阵中。
