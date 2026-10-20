---
title: Kubernetes 调度与节点生命周期
author: Walt
date: 2026-10-20
---

# Kubernetes 调度与节点生命周期

Pod 从创建到对外服务不是一个原子动作。scheduler 只负责选择节点并写入绑定结果；kubelet、容器运行时、CNI、CSI 和探针随后在节点上继续收敛。把“调度成功”和“运行成功”分开，才能解释 Pod 为什么会停在 Pending、ContainerCreating、Running but NotReady 或 Terminating。

![Pod 从调度到终止的生命周期](/container/kubernetes-scheduling-lifecycle.svg)

## 调度器实际做什么

满足入队条件、由该调度器负责且尚未绑定的 Pod 会进入调度队列；设置了 scheduling gates 的 Pod 还要先解除门控。调度周期负责选节点，并在末段执行 Reserve 和 Permit；绑定周期等待许可后执行 PreBind、Bind 和 PostBind。调度周期串行运行，绑定周期可以并发；失败通常释放已保留状态并回队列重试。

| 阶段 | 主要问题 | 典型约束 |
| --- | --- | --- |
| QueueSort | 下一个调度哪个 Pod | 优先级、入队时间、重试退避 |
| PreFilter/Filter | 哪些节点可行 | requests、nodeSelector、亲和性、污点、卷拓扑 |
| PostFilter | 没有可行节点后怎么办 | 抢占候选、诊断原因 |
| PreScore/Score | 可行节点中哪个更优 | 资源均衡、拓扑分布、镜像位置、插件权重 |
| Reserve | 插件记录选中节点的暂留状态 | 后续失败时由 Unreserve 清理，避免绑定并发竞态 |
| Permit | 调度周期末决定允许、拒绝或等待 | 等待发生在绑定周期开头，超时则回退 |
| PreBind/Bind | 写入最终绑定 | 卷准备、`.spec.nodeName` |
| PostBind | 绑定成功后的通知 | 清理或更新插件状态 |

Filter 是硬条件，Score 是偏好。把软偏好误写成硬亲和性，可能让整个工作负载无法调度；只写软分布又可能在资源紧张时把副本集中到一个故障域。

以下变量均需替换成现存对象；命令只读。不要把尖括号占位符直接交给 shell，它可能被解析成重定向：

```bash
namespace=orders
pod_name=order-api-替换为实际名称
node_name=替换为实际节点名称
kubectl get pod "$pod_name" -n "$namespace" -o wide
kubectl get pod "$pod_name" -n "$namespace" -o jsonpath='{.status.conditions[?(@.type=="PodScheduled")]}'
kubectl describe pod "$pod_name" -n "$namespace"
kubectl get events -n "$namespace" --field-selector "involvedObject.name=$pod_name" --sort-by=.metadata.creationTimestamp
```

`FailedScheduling` Event 中的多条原因可能来自不同节点，不能只读最后半句。应把节点数量、不可行原因比例、Pod requests、卷拓扑和污点一起保存。

## requests 决定调度，不是实时用量

scheduler 依据 Pod requests 与节点可分配资源判断容量，不读取容器此刻的 CPU、内存利用率。一个实际空闲但 requests 已被占满的节点仍会拒绝新 Pod；反过来，requests 过低会让节点被过度装箱，运行时再因内存压力发生驱逐。

有效请求还会受 init container 和 Pod overhead 影响。CPU 竞争首先表现为等待和延迟，配置 CPU limit 后还可能触发配额限流；内存超过限制或节点不足时可能触发 OOMKill 或节点压力驱逐。调度容量和运行容量必须分别验证。

例如某节点可分配 4 CPU，已有 Pod 合计请求 3.5 CPU，即使当前使用量只有 0.2 CPU，新请求 1 CPU 的订单 API 仍放不进去。反过来把请求改成 0.1 CPU 可能让调度成功，却没有增加节点实际算力。应通过负载测试修正请求，并同时保留节点故障或发布时所需的余量。

## 绑定后由 kubelet 接管

kubelet 的同步循环观察分配到本节点的 Pod，对比期望与本地实际状态，并通过 CRI 驱动容器运行时。以下是需要完成的职责，配置、镜像、卷和沙箱准备可能交错，不是所有运行时上的固定串行调用：

1. 获取 Secret、ConfigMap、ServiceAccount 和镜像拉取凭据。
2. 通过 CRI 创建 Pod sandbox；CNI 为 sandbox 配置网络。
3. 协调卷准备并完成节点侧挂载；并非所有卷都由 CSI 提供。
4. 按声明顺序处理 init containers。普通 init 必须完成；原生 sidecar 以可重启 init 形式启动后继续运行，再进入后续阶段。
5. 执行 startup、liveness、readiness 探针并回写 Pod Status。
6. 持续发现容器退出、sandbox 变化和本地资源压力，再执行重启或终止。

Pod Lifecycle Event Generator（PLEG）等节点机制帮助 kubelet 发现运行时变化，但 API Status、运行时状态和应用真实可用性仍可能短暂不同步。Pod phase 为 `Running` 表示已绑定节点、全部容器已创建，至少一个仍在运行或启动、重启过程中；仍需观察 Ready 和实际请求。相同 UID 的 Pod 不会迁移到另一节点，故障后的替代 Pod 是新对象。

```bash
kubectl get pod "$pod_name" -n "$namespace" -o jsonpath='{range .status.containerStatuses[*]}{.name}{" ready="}{.ready}{" restarts="}{.restartCount}{" waiting="}{.state.waiting.reason}{" terminated="}{.state.terminated.reason}{"\n"}{end}'
kubectl describe node "$node_name"
```

节点日志命令取决于发行版。自管 systemd 节点常用 `journalctl -u kubelet` 和运行时服务日志；托管集群应使用厂商提供的节点诊断和日志入口。

## 探针分工与启动顺序

| 探针 | 失败后动作 | 适合表达 |
| --- | --- | --- |
| startupProbe | 连续失败达到阈值后终止容器，再按重启策略处理；成功前屏蔽其他探针 | 慢启动是否完成 |
| readinessProbe | 连续失败达到阈值后标记未就绪，传播到端点与路由；不因此重启容器 | 当前是否能接收新流量 |
| livenessProbe | 连续失败达到阈值后终止容器，再按重启策略处理 | 进程是否已不可恢复地卡死 |

把下游数据库短暂失败写入 liveness，可能在依赖故障时同时重启所有副本；把只验证进程端口的探针当 readiness，又会过早接流量。探针应便宜、稳定，并严格对应动作语义。

## 终止不是立即杀进程

正常删除 Pod 后，API 记录 `deletionTimestamp` 和宽限期，节点清理与端点条件传播并行发生。非零宽限期下，kubelet 先执行各容器的 `preStop`，再要求运行时向主进程发送停止信号，通常为 TERM；镜像 STOPSIGNAL 或受支持的容器配置可能改变信号。宽限期包含 `preStop` 时间，不是钩子完成后再重新计时。钩子到期仍未完成时有一次短暂的 2 秒扩展，不应把它当成额外业务预算；到期残留进程会被强制停止。

普通容器之间没有固定停止顺序，原生 sidecar 有专门的停止次序。终止端点通常仍保留在 EndpointSlice 中并标记 `terminating`，常规流量选择不再把它当作 ready；依赖 `serving` 的排空与回退行为还取决于数据面实现。入口、应用和客户端对终止的观察不同步，已有长连接也不会因为端点更新自动完成。

可靠下线需要同时满足：

- readiness 及时失败，不再接收新请求。
- 应用收到终止信号后停止接新任务并完成在途请求。
- `terminationGracePeriodSeconds` 覆盖最慢合法请求和摘流传播时间。
- `preStop` 不重复完成应用已经实现的排空，也不无限 sleep。
- 滚动发布用 `maxUnavailable`、`maxSurge` 和容量验收约束可用副本；PDB 约束使用 Eviction API 的自愿中断，不限制 Deployment 自身滚动更新的删除。

强删 `--grace-period=0 --force` 只让 API 快速遗忘对象，不保证节点进程、卷或外部会话已经清理。

## 用状态阶段定位故障

| 表现 | 边界 | 首要证据 |
| --- | --- | --- |
| Pending + FailedScheduling | 调度周期 | requests、污点、亲和性、配额、卷拓扑 |
| 已绑定 + ContainerCreating | 节点准备 | kubelet、CRI、CNI、CSI、镜像拉取 Events |
| Running + NotReady | 应用接流量前 | readiness、依赖、容器日志、EndpointSlice |
| CrashLoopBackOff | 容器反复退出 | lastState、退出码、前一次日志、探针 |
| Terminating 过久 | 下线与清理 | finalizer、preStop、宽限期、节点可达性 |

一次完整实验应在隔离测试 namespace 中制造一个不可调度约束、一次镜像拉取失败、一次 readiness 失败和一次长请求下线，记录每个阶段的 Condition、Event、节点动作与流量变化。这样得到的是可复用的故障模型，而不是几个状态名。
