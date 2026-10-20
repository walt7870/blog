---
title: Kubernetes 生产实践
author: Walt
date: 2026-10-20
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
- 就绪探针和 EndpointSlice 端点条件是否允许接流量，代理是否已更新后端。
- Service、Ingress 和应用协议是否一致。

## 资源请求、限制与调度

`requests` 是调度和资源保障的重要依据，`limits` 是运行上限。CPU 超过限制通常会被节流，内存超过限制可能触发 OOMKill。没有可靠的 requests，scheduler 无法判断节点还能承载多少负载，HPA 的 CPU 利用率也可能失去稳定基准。

以下是容器字段片段，放在 Deployment 的 `spec.template.spec.containers[]` 中，不是独立资源：

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
| 只运行在具备某能力的节点 | nodeSelector 或 required nodeAffinity，并核对节点真实标签 |
| 专用节点排斥普通工作负载 | taint；对应 Pod 的 toleration 只解除排斥，不保证选中该节点 |
| 副本分散到不同节点或可用区 | podAntiAffinity、topologySpreadConstraints |
| 限制维护时的自愿中断 | PDB 约束 Eviction API；不限制直接删除和工作负载自身滚动删除 |
| 随指标调整副本 | HPA；同时保证应用可水平扩展 |

## 发布与探针

启动探针保护启动较慢的应用；就绪探针影响端点是否可被选择，不代表未就绪 Pod 的地址一定不存在；存活探针只用于判断进程是否已无法自行恢复。把外部数据库短暂不可用放进存活探针，可能造成所有副本同时重启并放大故障。

更新策略位于 Deployment 的 `spec.strategy`，这里的 `maxUnavailable: 0` 要求发布过程中保留已有可用容量，`maxSurge: 1` 允许多建一个副本；集群也必须有位置容纳它：

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0
    maxSurge: 1
```

探针位于 `spec.template.spec.containers[]` 内的目标容器，不能与 Deployment 的 `strategy` 并列。应用必须实际实现对应端点：

```yaml
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

外部 HTTP 请求通常经过负载均衡器和入口代理，再由代理按路由选择 Pod，或先访问 Service 虚拟 IP。Service 与 EndpointSlice 是路由配置依据，EndpointSlice 不转发请求。排查时对比入口、Service、端点条件与 Pod 实际监听：

```bash
kubectl get ingress,svc,endpointslice -n orders
kubectl describe ingress order-api -n orders
kubectl get networkpolicy -n orders
```

若需要集群内探测，在已批准的诊断环境使用包含 DNS/HTTP 工具的镜像，分别测试域名、Service 地址和 Pod 地址，保持 namespace、NetworkPolicy 和协议一致。诊断 Pod 与故障 Pod 身份或策略不同，探测成功也不能直接证明原应用可达。

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

以下是 PodSpec 安全片段，Deployment 中放在 `spec.template.spec`；镜像占位符必须替换成实际制品。示例假设应用支持 UID/GID 10001、监听非特权端口，只在 `/tmp` 写临时文件。若程序还写日志或缓存目录，需要为那些目录单独规划可写卷，而不是直接关闭只读根文件系统：

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 10001
  runAsGroup: 10001
  fsGroup: 10001
  seccompProfile:
    type: RuntimeDefault
containers:
  - name: api
    image: registry.example.com/orders/api:替换为实际版本
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop: ["ALL"]
    volumeMounts:
      - name: tmp
        mountPath: /tmp
volumes:
  - name: tmp
    emptyDir:
      sizeLimit: 128Mi
```

ServiceAccount 应按工作负载拆分，不使用默认账号承载广泛权限；Role 与 RoleBinding 只授予必要 Namespace 和资源动作。Namespace 是组织边界，不是完整安全边界，还需结合 NetworkPolicy、ResourceQuota、LimitRange、准入策略和节点隔离。

## 可观测与排障

日志用于还原离散事件，指标用于发现趋势和触发告警，追踪用于定位跨服务延迟，事件用于解释 Kubernetes 控制面的近期决策。四类信号要共享服务名、环境、版本、Pod 和 trace 标识，才能从告警追到具体发布与请求。

下面只查询现存对象。替换 Pod 名，`--previous` 仅在容器存在上一轮实例时有效；多容器 Pod 再指定 `-c`，`top` 需要资源指标 API：

```bash
pod_name=order-api-替换为实际名称
kubectl get deploy,rs,pod -n orders -o wide
kubectl describe pod "$pod_name" -n orders
kubectl logs "$pod_name" -n orders --previous
kubectl get events -n orders --sort-by=.metadata.creationTimestamp
kubectl top pod -n orders
kubectl rollout history deploy/order-api -n orders
```

稳定的排障顺序是：先确认影响范围和最近变更，再判断故障位于 API/控制器、调度、节点运行时、应用启动、网络、存储还是权限层；每一步都留下可复核证据，修复后用相同指标验证恢复。

## 容量与高可用

“能承受多少并发”不能由节点数量直接推导。它由单请求成本、外部依赖、延迟目标、实例资源、连接池、队列长度和峰值模型共同决定。容量规划应通过压测获得单副本在目标延迟和错误率下的稳定吞吐，再计算副本和节点需求。

```text
基础副本数 = ceil(峰值每秒请求数 / 单副本稳定每秒吞吐)
规划副本数 = ceil(基础副本数 × 已验证的冗余系数)
```

随后校验节点故障、滚动发布和可用区故障时，剩余容量是否仍满足目标。HPA 解决的是已定义指标下的副本调整，无法弥补错误的资源请求、慢数据库、冷启动过长或不可水平扩展的应用。具体算法、指标和节点扩缩边界见 [HPA 与弹性容量](./resources/hpa)。

## 版本与扩展组件

生产基线还包括 Kubernetes 小版本、补丁版本和生态兼容矩阵。维护分支和版本偏差统一见[版本与升级](./version-upgrade)，执行当天还要核对目标补丁和发行版支持情况。

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
