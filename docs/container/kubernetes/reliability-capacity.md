---
title: Kubernetes 可靠性、弹性与容量
author: Walt
date: 2026-10-20
---

# Kubernetes 可靠性、弹性与容量

高可用不是把 `replicas` 从 1 改成 3，弹性也不是安装 HPA。可靠性来自明确故障域、可用容量、流量摘除、数据恢复和控制面恢复；弹性来自指标、工作负载、节点和外部依赖共同闭环。

![扩容决策到就绪容量之间存在等待窗口](/container/kubernetes-capacity-delay.svg)

## 先写故障模型

| 故障 | Kubernetes 能做什么 | 仍需设计什么 |
| --- | --- | --- |
| 容器退出 | kubelet 按 restartPolicy 重启 | 启动幂等、探针和本地状态处理 |
| Pod 丢失 | 控制器补副本 | Ready 容量和连接恢复 |
| 节点失联 | 更新节点状态，控制器按策略创建替代 Pod | 旧实例隔离、检测窗口、剩余容量、卷可达性 |
| 可用区故障 | 约束允许且有容量时，在其他可用区创建新副本 | 拓扑分布、跨区容量、数据复制 |
| 控制面故障 | HA 控制面继续提供 API | etcd 多数派、负载均衡、恢复演练 |
| 区域级灾难 | Kubernetes 本身通常无法跨区域恢复 | 异地备份、DNS/流量切换和业务 RTO/RPO |

“三个副本”只有在故障域独立、入口只发给 Ready 后端、依赖同样冗余且剩余容量足够时才有意义。

## 控制面高可用边界

典型 HA 控制面包含多个 kube-apiserver、controller-manager、scheduler 和奇数个 etcd 成员。API Server 可并行服务；controller-manager 和 scheduler 常通过 Leader Election 维持单活控制循环；etcd 依靠多数派提交。

增加 etcd 成员不会线性提高可用性：3 成员可容忍 1 个失效，5 成员可容忍 2 个，但跨慢链路会增加提交延迟。备份必须包含快照、证书和集群恢复步骤，并在隔离环境实际恢复。只监控 Pod Running 看不到磁盘 fsync、etcd quorum 或 API 尾延迟问题。

## 节点失联、污点与驱逐

节点控制器根据心跳更新 Node Conditions，并为异常节点添加 `node.kubernetes.io/not-ready` 或 `unreachable` 等污点。Pod 是否继续容忍以及多久后驱逐，由 toleration 和控制器策略共同决定。

过短容忍会把瞬时网络抖动放大成大规模重建；过长容忍会让已不可达副本长时间占据期望数量。带本地盘、单区卷或有状态选主的 Pod 还要考虑旧实例是否真的停止，避免双写。

计划维护使用 `cordon` 阻止普通新 Pod 调度，使用 `drain` 排空符合条件的工作负载。相同 UID 的 Pod 不会搬家，控制器创建的新 Pod 需要重新调度和挂载。PDB 约束 Eviction API 发起的自愿中断，不阻止直接删除、Deployment 自身滚动更新或节点故障；PDB 过严也会让升级或排空阻塞。

先把变量改为现存节点名，查询节点、PDB 和该节点上的 Pod：

```bash
node_name=替换为实际节点名称
kubectl get nodes
kubectl describe node "$node_name"
kubectl get pdb -A
kubectl get pod -A --field-selector "spec.nodeName=$node_name" -o wide
```

维护窗口中可以先运行 `kubectl drain "$node_name" --ignore-daemonsets --dry-run=server`，检查当时的服务端请求是否可接受；它不实际排空，也不能证明替代副本能就绪、卷能重新挂载或业务无损。确认备份与容量后再执行实际维护流程。`--delete-emptydir-data` 表示接受删除 Pod 时丢失 emptyDir 数据，不应为了绕过报错直接追加；DaemonSet 和镜像 Pod 等也有单独处理边界。

## 资源请求、限制与 QoS

在按容器声明 CPU/内存的常规配置中，所有容器（含 init container）都必须为 CPU 和内存设置大于零且分别相等的 request/limit，才满足 Guaranteed；不满足该条件但至少声明一项 CPU/内存请求或限制时为 Burstable；均未声明时为 BestEffort。只设置临时存储并不会得到 Burstable。启用 Pod 级资源声明时还需按该功能的规则判断，最终以准入后的配置和 `status.qosClass` 为准，不能只看仓库里的 YAML。

节点压力驱逐还会考虑用量是否超过 request、Pod Priority 以及相对超额量，不能把 QoS 名称当成唯一排序键。容器 OOM、节点压力驱逐和调度抢占是不同路径；Guaranteed 不是绝不被终止的承诺。

容量规划应区分四组数字：

- 调度容量：节点 Allocatable 减去所有 requests。
- 运行容量：真实 CPU、工作集内存、IO、网络和临时存储。
- 故障余量：失去一个节点或一个可用区后仍可用的容量。
- 变更余量：滚动发布的 surge、重调度和节点升级所需空间。

```text
单副本稳定吞吐 = 在目标延迟和错误率下测得的吞吐
基础副本 = ceil(峰值负载 / 单副本稳定吞吐)
目标副本 = 根据故障后剩余容量、发布策略和启动延迟增加余量
CPU 节点数下界 = ceil(目标 CPU requests / 单节点可用 CPU)
内存节点数下界 = ceil(目标内存 requests / 单节点可用内存)
```

例如订单 API 峰值 900 请求/秒，压测单副本在目标延迟内可稳定处理 300 请求/秒，基础需求是 3 个 Ready 副本。若只有 3 副本，失去其中一个就只剩 600 请求/秒；若部署 6 副本、均分到三个可用区，失去一个区后还剩 4 副本、1200 请求/秒。这只验证了计算容量，仍要检查数据库、入口和卷是否能承受同样故障。

两个节点数下界取较大值仍只是粗估：系统与 DaemonSet 已占用的 request、单 Pod 能否装入、卷拓扑、反亲和性、临时存储和每节点 Pod 上限都可能抬高实际节点数。发布时还要给 surge Pod 留位置。不要把 CPU 核数与 GiB 相加后做一次除法。

平均利用率会掩盖热点和尾延迟。至少按 workload、Pod、node、zone 观察 P50/P95/P99，并把外部依赖配额纳入模型。

## 从 HPA 到节点扩容的闭环

HPA 根据指标计算期望副本，但新副本要经过调度、节点准备、镜像拉取和应用预热才能贡献容量。若集群无空位，Pod 先 Pending，节点扩缩组件再根据不可调度原因申请节点；云配额、可用区库存和启动时间都在闭环内。

图中示例从负载上升到新增容量可用共 240 秒。只在错误率升高后才触发扩容，意味着这四分钟需要靠现有余量、排队或限流覆盖。应分别记录指标到达、HPA 改副本、节点可用、容器启动和 Ready 的时间，才能知道缩短哪一段最有效；该时间线是说明用假设，不是通用性能指标。

| 层级 | 适合信号 | 常见失败 |
| --- | --- | --- |
| HPA | CPU、内存、每 Pod 请求率 | 指标延迟、抖动、maxReplicas 太低 |
| KEDA/外部指标 | 队列深度、事件积压、外部负载 | 指标语义错误、凭据和外部系统故障 |
| VPA | 长期资源建议或重设 | 重启影响、与 HPA 同指标冲突 |
| 节点扩缩 | 不可调度 Pod 的资源与拓扑需求 | 配额、节点启动慢、缩容受 PDB/卷阻塞 |

扩容信号应领先于用户可见错误。对慢启动服务，可以保留基础副本、使用预测或队列指标，并设置合理 stabilization window。缩容则要慢于流量下降、连接排空和任务完成。

## 拓扑和反亲和性不是越严越好

`topologySpreadConstraints` 可以按 hostname 或 zone 控制分布，podAntiAffinity 可以阻止副本共置。`DoNotSchedule` 提供硬保证，但在故障或小集群中可能让 Pod Pending；`ScheduleAnyway` 保持可调度性，但需要告警监控实际偏斜。

拓扑策略应与节点池真实标签、卷区域和入口流量域一致。写了 zone 分布而所有节点标签相同，等于没有跨域；跨区部署数据库但卷和复制协议不支持，也不会自动获得容灾。

## 演练和验收

可靠性声明需要故障证据，至少包括：

1. 删除单个 Pod，测量 Ready 容量和请求错误。
2. cordon/drain 一个节点，验证 PDB、重调度、卷和排空时间。
3. 隔离一个可用区或等价故障域，验证剩余容量与依赖。
4. 制造负载阶跃，记录 HPA、Pending Pod、节点到位和业务恢复时间。
5. 恢复备份到隔离环境，测量真实 RTO/RPO。

每次演练同时保留对象时间线、业务 SLI、组件指标和变更记录。只有“系统最后恢复了”不足以证明恢复时间满足目标。
