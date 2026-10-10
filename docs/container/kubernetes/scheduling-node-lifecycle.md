---
title: Kubernetes 调度与节点生命周期
author: Walt
date: 2026-07-18
---

# Kubernetes 调度与节点生命周期

Pod 从创建到对外服务不是一个原子动作。scheduler 只负责选择节点并写入绑定结果；kubelet、容器运行时、CNI、CSI 和探针随后在节点上继续收敛。把“调度成功”和“运行成功”分开，才能解释 Pod 为什么会停在 Pending、ContainerCreating、Running but NotReady 或 Terminating。

![Pod 从调度到终止的生命周期](/container/kubernetes-scheduling-lifecycle.svg)

## 调度器实际做什么

新 Pod 没有 `.spec.nodeName` 时进入调度队列。scheduler 在一个调度周期中选择可行节点，在绑定周期中完成保留、许可和绑定；任一扩展点失败都可能让 Pod 回到队列，而不是直接判定永久失败。

| 阶段 | 主要问题 | 典型约束 |
| --- | --- | --- |
| QueueSort | 下一个调度哪个 Pod | 优先级、入队时间、重试退避 |
| PreFilter/Filter | 哪些节点可行 | requests、nodeSelector、亲和性、污点、卷拓扑 |
| PostFilter | 没有可行节点后怎么办 | 抢占候选、诊断原因 |
| PreScore/Score | 可行节点中哪个更优 | 资源均衡、拓扑分布、镜像位置、插件权重 |
| Reserve | 暂时为 Pod 保留资源 | 避免并行调度发生竞态 |
| Permit | 是否等待外部条件 | gang/co-scheduling 等插件语义 |
| PreBind/Bind | 写入最终绑定 | 卷准备、`.spec.nodeName` |

Filter 是硬条件，Score 是偏好。把软偏好误写成硬亲和性，可能让整个工作负载无法调度；只写软分布又可能在资源紧张时把副本集中到一个故障域。

```bash
kubectl get pod <pod> -n <namespace> -o wide
kubectl get pod <pod> -n <namespace> -o jsonpath='{.status.conditions[?(@.type=="PodScheduled")]}'
kubectl describe pod <pod> -n <namespace>
kubectl get events -n <namespace> --field-selector involvedObject.name=<pod> --sort-by=.metadata.creationTimestamp
```

`FailedScheduling` Event 中的多条原因可能来自不同节点，不能只读最后半句。应把节点数量、不可行原因比例、Pod requests、卷拓扑和污点一起保存。

## requests 决定调度，不是实时用量

scheduler 依据 Pod requests 与节点可分配资源判断容量，不读取容器此刻的 CPU、内存利用率。一个实际空闲但 requests 已被占满的节点仍会拒绝新 Pod；反过来，requests 过低会让节点被过度装箱，运行时再因内存压力发生驱逐。

有效请求还会受 init container 和 Pod overhead 影响。CPU 可压缩，竞争时主要表现为限速和延迟；内存不可压缩，超过限制或节点不足时可能触发 OOMKill 或节点压力驱逐。调度容量和运行容量必须分别验证。

## 绑定后由 kubelet 接管

kubelet 的同步循环观察分配到本节点的 Pod，对比期望与本地实际状态，并通过 CRI 驱动容器运行时。典型路径是：

1. 获取 Secret、ConfigMap、ServiceAccount 和镜像拉取凭据。
2. 通过 CRI 创建 Pod sandbox；CNI 为 sandbox 配置网络。
3. 协调 CSI 卷并完成节点侧挂载。
4. 按顺序运行 init containers，再启动普通容器。
5. 执行 startup、liveness、readiness 探针并回写 Pod Status。
6. 持续发现容器退出、sandbox 变化和本地资源压力，再执行重启或终止。

Pod Lifecycle Event Generator（PLEG）等节点机制帮助 kubelet发现运行时变化，但 API Status、运行时状态和应用真实可用性仍可能短暂不同步。`Running` 只表示至少一个容器在运行；只有 Ready Pod 才通常进入 Service 可用后端。

```bash
kubectl get pod <pod> -n <namespace> -o jsonpath='{range .status.containerStatuses[*]}{.name}{" ready="}{.ready}{" restarts="}{.restartCount}{" waiting="}{.state.waiting.reason}{" terminated="}{.state.terminated.reason}{"\n"}{end}'
kubectl describe node <node>
kubectl get --raw "/api/v1/nodes/<node>/proxy/healthz"
```

节点日志命令取决于发行版。自管 systemd 节点常用 `journalctl -u kubelet` 和运行时服务日志；托管集群应使用厂商提供的节点诊断和日志入口。

## 探针分工与启动顺序

| 探针 | 失败后动作 | 适合表达 |
| --- | --- | --- |
| startupProbe | 启动阶段失败会重启容器；成功前屏蔽其他探针 | 慢启动是否完成 |
| readinessProbe | 从 Service 后端摘除，不重启容器 | 当前是否能接收新流量 |
| livenessProbe | 重启容器 | 进程是否已不可恢复地卡死 |

把下游数据库短暂失败写入 liveness，可能在依赖故障时同时重启所有副本；把只验证进程端口的探针当 readiness，又会过早接流量。探针应便宜、稳定，并严格对应动作语义。

## 终止不是立即杀进程

删除 Pod 后，API 出现 `deletionTimestamp`，EndpointSlice 会更新终止和就绪状态，kubelet 执行 `preStop` 并向容器主进程发送终止信号，宽限期结束后才强制停止。入口、Service 数据面、应用进程和客户端连接对终止的观察并不同步。

可靠下线需要同时满足：

- readiness 及时失败，不再接收新请求。
- 应用收到终止信号后停止接新任务并完成在途请求。
- `terminationGracePeriodSeconds` 覆盖最慢合法请求和摘流传播时间。
- `preStop` 不重复完成应用已经实现的排空，也不无限 sleep。
- PDB 和发布策略保证终止期间仍有足够 Ready 容量。

强删 `--grace-period=0 --force` 只让 API 快速遗忘对象，不保证节点进程、卷或外部会话已经清理。

## 用状态阶段定位故障

| 表现 | 边界 | 首要证据 |
| --- | --- | --- |
| Pending + FailedScheduling | 调度周期 | requests、污点、亲和性、配额、卷拓扑 |
| 已绑定 + ContainerCreating | 节点准备 | kubelet、CRI、CNI、CSI、镜像拉取 Events |
| Running + NotReady | 应用接流量前 | readiness、依赖、容器日志、EndpointSlice |
| CrashLoopBackOff | 容器反复退出 | lastState、退出码、前一次日志、探针 |
| Terminating 过久 | 下线与清理 | finalizer、preStop、宽限期、节点可达性 |

一次完整实验应故意制造一个不可调度约束、一次镜像拉取失败、一次 readiness 失败和一次长请求下线，记录每个阶段的 Condition、Event、节点动作与流量变化。这样得到的是可复用的故障模型，而不是几个状态名。

## 官方资料

- [Scheduling Framework](https://kubernetes.io/docs/concepts/scheduling-eviction/scheduling-framework/)
- [Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
