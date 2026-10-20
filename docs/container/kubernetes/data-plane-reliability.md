---
title: Kubernetes 数据面、存储与可靠性
author: Walt
date: 2026-10-20
---

# Kubernetes 数据面、存储与可靠性

控制面决定“应该有什么”，数据面负责让请求和数据真正流动。生产故障经常发生在对象已经收敛之后：Service 后端陈旧、NetworkPolicy 拒绝出口、卷与 Pod 不在同一拓扑、扩容速度赶不上负载，都会表现为“Pod 明明是 Running”。

![Service 配置来源与两种业务请求路径](/container/kubernetes-request-data-path.svg)

## 一条请求如何到达 Pod

外部 HTTP 请求可先经过云负载均衡器或边缘代理，再到 Gateway/Ingress 的具体代理实现。代理可能访问 Service 虚拟 IP，也可能读取端点配置直接访问 Pod IP；不能假定所有入口流量都经过 ClusterIP。EndpointSlice 保存地址、端口与条件，是转发规则的配置来源，不是业务请求经过的代理进程。

| 层级 | 关键对象或组件 | 需要验证的事实 |
| --- | --- | --- |
| 外部入口 | LoadBalancer、Gateway、Ingress | 地址、证书、监听器、路由状态 |
| 服务抽象 | Service | selector、port、targetPort、协议 |
| 后端集合 | EndpointSlice | 地址、端口、ready/serving/terminating |
| 集群网络 | CNI、Service 实现、NetworkPolicy | 路由、转发、允许的入口和出口 |
| 应用进程 | Pod、容器 | 实际监听地址、协议、超时和日志 |

Kubernetes 1.33 起旧 Endpoints API 已弃用。排查和自研控制器应以 EndpointSlice 为准；旧 Endpoints 对单个 Service 最多记录 1000 个后端，且缺少 EndpointSlice 的拓扑和状态表达能力。

EndpointSlice 可以记录尚未就绪和正在终止的端点。Pod 后端的 `serving` 对应 Ready，`terminating` 表达删除状态，`ready` 通常近似“serving 且未终止”。Service 设置 `publishNotReadyAddresses: true` 时 ready 有特殊语义；部分代理在所有端点都终止时还会选择 serving 的终止端点。排障必须同时核对条件与实际代理策略，不能仅数地址数量。

例如发布中的订单 API 有 3 个端点，但只有 2 个 ready，正常业务请求主要应进入这 2 个。入口若返回 503，应继续检查入口选中的地址及规则是否已同步；把“Slice 里有 3 个 IP”当作健康证明，会漏掉未就绪副本。

```bash
kubectl get svc order-api -n orders -o yaml
kubectl get endpointslice -n orders -l kubernetes.io/service-name=order-api -o yaml
kubectl get networkpolicy -n orders
```

## CNI、路由与 Service 实现

CNI 插件在 Pod sandbox 创建或删除时配置网络命名空间、接口、地址和路由；它不定义 Kubernetes Service。不同实现可能采用 Overlay 封装、底层网络原生路由或混合模式，选择会影响 MTU、跨网段可达性、云路由规模和故障证据。

Service 虚拟地址通常由 kube-proxy 的 iptables、nftables 等模式，或替代它的 eBPF 数据面映射到后端。IPVS 模式自 Kubernetes 1.35 起弃用，已有集群需结合版本与迁移计划判断，不能作为新环境默认推荐。对象相同不代表节点路径相同，排障前必须确认实际实现和模式。

```bash
kubectl -n kube-system get ds,pod -o wide
kubectl get node -o wide
kubectl get endpointslice -A
```

`ip route` 等节点网络命令应在对应 Linux 节点或获准的诊断环境执行，不能用 Mac 的宿主路由代替 Pod 所在节点的证据。先在相同来源位置做分层探测：Pod IP 不通优先看监听、CNI、路由和 NetworkPolicy；Pod IP 可达但 Service IP 不通再看 Service 规则、后端条件和端口；只有域名失败再进入 DNS 链路。不要在不同来源网络之间直接比较结果。

## DNS 不是独立于网络的黑盒

Pod 的 `/etc/resolv.conf` 通常把集群域名查询交给 CoreDNS，CoreDNS 再读取 Service/EndpointSlice 并把外部域名转发到上游解析器。`ndots`、搜索域、上游超时和应用连接池都可能放大延迟。

下面假设集群域为 `cluster.local`、工作负载在 `orders`。先替换 Pod 名，并确认镜像内提供这些工具；精简应用镜像缺少 `nslookup` 不代表 DNS 故障，应使用获准的诊断容器：

```bash
pod_name=order-api-替换为实际名称
kubectl exec -n orders "$pod_name" -- cat /etc/resolv.conf
kubectl exec -n orders "$pod_name" -- nslookup order-api.orders.svc.cluster.local
kubectl -n kube-system logs deploy/coredns --tail=100
```

应同时比较完整集群域名、短域名和外部域名，并记录 DNS 查询耗时；“最终能解析”不能排除重试造成的尾延迟。

## 存储从声明到挂载

![PVC 动态供应与节点侧挂载分别协调](/container/kubernetes-volume-reconcile.svg)

PVC 是工作负载对存储的请求，StorageClass 描述供应策略，CSI 驱动负责创建、挂载和管理具体卷。动态供应并不消除拓扑约束：云盘通常只能挂载到特定区域，Pod 调度位置必须与卷可达范围一致。

`volumeBindingMode: WaitForFirstConsumer` 会把卷绑定推迟到出现消费者后，使调度器能够综合 Pod 约束和存储拓扑选择位置。立即绑定在多可用区环境中可能先创建了一个 Pod 无法使用的卷。

```bash
kubectl get pvc,pv -n orders
kubectl describe pvc order-data -n orders
kubectl get storageclass -o yaml
kubectl describe pod "$pod_name" -n orders
kubectl get volumeattachment
```

PVC 让数据卷生命周期独立于 Pod，但不会自动提供数据库复制、跨区域容灾或一致性备份。恢复能力必须由存储快照、应用级备份、复制协议和演练共同证明。

CSI 链路分为控制面和节点面。external-provisioner 观察 PVC 与 StorageClass，调用驱动创建卷，并通过 PV 表达实际卷；external-attacher 处理需要 attach 的卷与 VolumeAttachment。目标节点的 kubelet 调用 CSI node plugin 完成 NodePublish，支持 staging 的驱动还会先 NodeStage；不需要 attach 的驱动没有对应设备附加阶段。某一步成功不能证明下一步完成，读写数据也不经过 PVC 或 StorageClass 对象。

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

以下是 PodSpec 片段；独立 Pod 放在 `spec` 下，Deployment 放在 `spec.template.spec` 下。对应 Pod 模板需带有 `app: order-api` 标签，节点需正确标记可用区；硬约束无可行位置时，新 Pod 会保持 Pending。

```yaml
topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app: order-api
```

PDB 主要限制通过 Eviction API 发起的自愿中断，例如常规节点排空；不阻止节点故障、直接删除 Pod，也不限制 Deployment 自身的滚动更新删除。`minAvailable` 过高会阻塞排空，不能修复只有一个副本的设计。发布容量应另外用工作负载更新策略和实测约束。

## 弹性链路的四个层级

| 层级 | 负责内容 | 主要盲区 |
| --- | --- | --- |
| HPA | 根据指标调整工作负载副本 | 冷启动、指标延迟、不可水平扩展状态 |
| VPA | 给出或应用资源建议 | 可能通过重建 Pod 生效，需评估中断 |
| 事件驱动扩缩 | 根据队列、流量等外部信号调整副本 | 指标语义和外部依赖可用性 |
| 节点扩缩 | 为不可调度 Pod 提供或回收节点 | 云资源配额、启动时间、拓扑和成本 |

扩 Pod 之前先确认单副本稳定吞吐、尾延迟、资源成本和依赖上限。否则 HPA 只会把慢请求复制到更多实例。

```text
基础副本数 = ceil(峰值每秒请求数 / 单副本稳定每秒吞吐)
规划副本数 = ceil(基础副本数 × 故障与发布冗余系数)
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
