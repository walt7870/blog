---
title: Kubernetes 可靠性、弹性与容量
author: Walt
date: 2026-07-18
---

# Kubernetes 可靠性、弹性与容量

高可用不是把 `replicas` 从 1 改成 3，弹性也不是安装 HPA。可靠性来自明确故障域、可用容量、流量摘除、数据恢复和控制面恢复；弹性来自指标、工作负载、节点和外部依赖共同闭环。

## 先写故障模型

| 故障 | Kubernetes 能做什么 | 仍需设计什么 |
| --- | --- | --- |
| 容器退出 | kubelet 按 restartPolicy 重启 | 启动幂等、探针和本地状态处理 |
| Pod 丢失 | 控制器补副本 | Ready 容量和连接恢复 |
| 节点失联 | 标记节点状态并迁移可替代 Pod | 检测窗口、剩余容量、卷可达性 |
| 可用区故障 | 在其他区域调度新副本 | 拓扑分布、跨区容量、数据复制 |
| 控制面故障 | HA 控制面继续提供 API | etcd 多数派、负载均衡、恢复演练 |
| 区域级灾难 | Kubernetes 本身通常无法跨区域恢复 | 异地备份、DNS/流量切换和业务 RTO/RPO |

“三个副本”只有在故障域独立、入口只发给 Ready 后端、依赖同样冗余且剩余容量足够时才有意义。

## 控制面高可用边界

典型 HA 控制面包含多个 kube-apiserver、controller-manager、scheduler 和奇数个 etcd 成员。API Server 可并行服务；controller-manager 和 scheduler 常通过 Leader Election 维持单活控制循环；etcd 依靠多数派提交。

增加 etcd 成员不会线性提高可用性：3 成员可容忍 1 个失效，5 成员可容忍 2 个，但跨慢链路会增加提交延迟。备份必须包含快照、证书和集群恢复步骤，并在隔离环境实际恢复。只监控 Pod Running 看不到磁盘 fsync、etcd quorum 或 API 尾延迟问题。

## 节点失联、污点与驱逐

节点控制器根据心跳更新 Node Conditions，并为异常节点添加 `node.kubernetes.io/not-ready` 或 `unreachable` 等污点。Pod 是否继续容忍以及多久后驱逐，由 toleration 和控制器策略共同决定。

过短容忍会把瞬时网络抖动放大成大规模重建；过长容忍会让已不可达副本长时间占据期望数量。带本地盘、单区卷或有状态选主的 Pod 还要考虑旧实例是否真的停止，避免双写。

计划维护使用 `cordon` 阻止新调度，使用 `drain` 驱逐可迁移工作负载。PDB 只限制自愿驱逐，不保证节点突发故障时副本仍存活；PDB 过严也会让升级或排空永久阻塞。

```bash
kubectl get node
kubectl describe node <node>
kubectl get pdb -A
kubectl get pod -A --field-selector spec.nodeName=<node> -o wide
kubectl drain <node> --ignore-daemonsets --delete-emptydir-data --dry-run=server
```

## 资源请求、限制与 QoS

Pod 的 QoS 类别影响节点压力下的驱逐顺序：所有容器 CPU/内存 request 与 limit 都相等时通常为 Guaranteed；至少设置 request/limit 但不满足 Guaranteed 为 Burstable；都未设置为 BestEffort。QoS 不是绝对保护，节点仍可能在资源耗尽时驱逐 Pod。

容量规划应区分四组数字：

- 调度容量：节点 Allocatable 减去所有 requests。
- 运行容量：真实 CPU、工作集内存、IO、网络和临时存储。
- 故障余量：失去一个节点或一个可用区后仍可用的容量。
- 变更余量：滚动发布的 surge、重调度和节点升级所需空间。

```text
单副本稳定吞吐 = 在目标延迟和错误率下测得的吞吐
基础副本 = ceil(峰值负载 / 单副本稳定吞吐)
目标副本 = ceil(基础副本 × 发布余量 × 故障余量)
节点需求 = ceil(目标 requests / 单节点可分配资源)
```

平均利用率会掩盖热点和尾延迟。至少按 workload、Pod、node、zone 观察 P50/P95/P99，并把外部依赖配额纳入模型。

## 从 HPA 到节点扩容的闭环

HPA 根据指标计算期望副本，但新副本要经过调度、节点准备、镜像拉取和应用预热才能贡献容量。若集群无空位，Pod 先 Pending，节点扩缩组件再根据不可调度原因申请节点；云配额、可用区库存和启动时间都在闭环内。

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

## 官方资料

- [Node-pressure Eviction](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/)
- [Horizontal Pod Autoscaling](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
