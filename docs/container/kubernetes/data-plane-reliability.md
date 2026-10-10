---
title: Kubernetes 数据面、存储与可靠性
author: Walt
date: 2026-07-18
---

# Kubernetes 数据面、存储与可靠性

控制面决定“应该有什么”，数据面负责让请求和数据真正流动。生产故障经常发生在对象已经收敛之后：Service 后端陈旧、NetworkPolicy 拒绝出口、卷与 Pod 不在同一拓扑、扩容速度赶不上负载，都会表现为“Pod 明明是 Running”。

![Kubernetes 请求与存储数据路径](/container/kubernetes-request-data-path.svg)

## 一条请求如何到达 Pod

典型外部 HTTP 请求会经过云负载均衡器或边缘代理、Gateway/Ingress 实现、Service 数据面、EndpointSlice 中的后端地址，最终进入 Pod 监听端口。这里的每一层都可能独立健康，也可能独立失败。

| 层级 | 关键对象或组件 | 需要验证的事实 |
| --- | --- | --- |
| 外部入口 | LoadBalancer、Gateway、Ingress | 地址、证书、监听器、路由状态 |
| 服务抽象 | Service | selector、port、targetPort、协议 |
| 后端集合 | EndpointSlice | 地址、端口、ready/serving/terminating |
| 集群网络 | CNI、Service 实现、NetworkPolicy | 路由、转发、允许的入口和出口 |
| 应用进程 | Pod、容器 | 实际监听地址、协议、超时和日志 |

Kubernetes 1.33 起旧 Endpoints API 已弃用。排查和自研控制器应以 EndpointSlice 为准；旧 Endpoints 对单个 Service 最多记录 1000 个后端，且缺少 EndpointSlice 的拓扑和状态表达能力。

```bash
kubectl get svc order-api -n orders -o yaml
kubectl get endpointslice -n orders -l kubernetes.io/service-name=order-api -o yaml
kubectl get networkpolicy -n orders
kubectl run net-debug --rm -it --restart=Never --image=curlimages/curl -- sh
```

## CNI、路由与 Service 实现

CNI 插件在 Pod sandbox 创建或删除时配置网络命名空间、接口、地址和路由；它不定义 Kubernetes Service。不同实现可能采用 Overlay 封装、底层网络原生路由或混合模式，选择会影响 MTU、跨网段可达性、云路由规模和故障证据。

Service 虚拟地址则由 kube-proxy 的 iptables/IPVS/nftables 模式，或 Cilium 等 eBPF 实现转换到 EndpointSlice 后端。对象相同并不代表节点数据路径相同，排障前必须先确认实际实现和模式。

```bash
kubectl -n kube-system get ds,pod -o wide
kubectl get node -o wide
kubectl get endpointslice -A
ip route
```

先做分层探测：Pod IP 不通优先看 CNI、路由和 NetworkPolicy；Pod IP 可达但 Service IP 不通再看 Service 规则与后端集合；只有域名失败再进入 DNS 链路。直接重启 CoreDNS 或网络组件会破坏现场证据。

## DNS 不是独立于网络的黑盒

Pod 的 `/etc/resolv.conf` 通常把集群域名查询交给 CoreDNS，CoreDNS 再读取 Service/EndpointSlice 并把外部域名转发到上游解析器。`ndots`、搜索域、上游超时和应用连接池都可能放大延迟。

```bash
kubectl exec -n orders <pod> -- cat /etc/resolv.conf
kubectl exec -n orders <pod> -- nslookup order-api.orders.svc.cluster.local
kubectl -n kube-system logs deploy/coredns --tail=100
```

应同时比较完整集群域名、短域名和外部域名，并记录 DNS 查询耗时；“最终能解析”不能排除重试造成的尾延迟。

## 存储从声明到挂载

PVC 是工作负载对存储的请求，StorageClass 描述供应策略，CSI 驱动负责创建、挂载和管理具体卷。动态供应并不消除拓扑约束：云盘通常只能挂载到特定区域，Pod 调度位置必须与卷可达范围一致。

`volumeBindingMode: WaitForFirstConsumer` 会把卷绑定推迟到出现消费者后，使调度器能够综合 Pod 约束和存储拓扑选择位置。立即绑定在多可用区环境中可能先创建了一个 Pod 无法使用的卷。

```bash
kubectl get pvc,pv -n orders
kubectl describe pvc order-data -n orders
kubectl get storageclass -o yaml
kubectl describe pod <pod> -n orders
kubectl get volumeattachment
```

PVC 让数据卷生命周期独立于 Pod，但不会自动提供数据库复制、跨区域容灾或一致性备份。恢复能力必须由存储快照、应用级备份、复制协议和演练共同证明。

CSI 链路分为控制面和节点面。external-provisioner 根据 PVC 创建卷，external-attacher 协调需要 attach 的设备；目标节点上的 node plugin 再执行 stage/publish，把卷挂入 Pod。某一步成功不能证明下一步完成。

| 现象 | 优先证据 |
| --- | --- |
| PVC 一直 Pending | StorageClass、provisioner、配额、拓扑与 PVC Events |
| VolumeAttachment 卡住 | CSI attacher、云盘占用、节点身份和区域 |
| Pod 报 MountVolume | kubelet、CSI node plugin、设备和文件系统 |
| 挂载成功但应用读写失败 | 容器权限、只读标记、文件系统与应用日志 |

生产验收不能止于“Pod 能启动”，还要验证节点重启、Pod 漂移、卷重新挂载、快照恢复和故障时的数据一致性。

## 高可用是完整故障模型

增加副本只能覆盖一部分故障。高可用设计至少要回答：

- 副本是否真的分散到不同节点或可用区。
- Service 是否只把流量发给 Ready 后端。
- 节点维护、滚动发布和单区故障时剩余容量是否足够。
- 应用是否能处理重复请求、连接中断和优雅停机。
- 数据依赖是否具备与计算层一致的故障边界。

```yaml
topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app: order-api
```

PDB 只限制自愿中断，不阻止节点故障，也不会修复只有一个副本的设计。`minAvailable` 设置过高还可能阻塞节点排空和升级。

## 弹性链路的四个层级

| 层级 | 负责内容 | 主要盲区 |
| --- | --- | --- |
| HPA | 根据指标调整工作负载副本 | 冷启动、指标延迟、不可水平扩展状态 |
| VPA | 给出或应用资源建议 | 可能通过重建 Pod 生效，需评估中断 |
| 事件驱动扩缩 | 根据队列、流量等外部信号调整副本 | 指标语义和外部依赖可用性 |
| 节点扩缩 | 为不可调度 Pod 提供或回收节点 | 云资源配额、启动时间、拓扑和成本 |

扩 Pod 之前先确认单副本稳定吞吐、尾延迟、资源成本和依赖上限。否则 HPA 只会把慢请求复制到更多实例。

```text
基础副本数 = ceil(峰值请求量 / 单副本稳定吞吐)
规划副本数 = 基础副本数 × 故障与发布冗余系数
```

## 从症状到层级

| 症状 | 优先检查 |
| --- | --- |
| 域名可解析但返回 503 | Gateway/Ingress Conditions、Service、EndpointSlice、Ready |
| 集群内 Service 不通 | Service 端口、EndpointSlice、NetworkPolicy、应用监听 |
| Pod Pending 且 PVC Pending | StorageClass、绑定模式、拓扑、CSI Events |
| 节点故障后服务容量骤降 | 拓扑分布、PDB、剩余资源、数据依赖 |
| HPA 已到最大副本仍超时 | 单副本吞吐、外部依赖、指标延迟、节点容量 |
| 发布时出现连接错误 | readiness、preStop、终止宽限期、入口摘流延迟 |

定位时同时保留对象、Events、组件日志和业务指标。单条日志只能证明某个组件在某一时刻观察到了什么，不能单独证明整条链路的根因。
