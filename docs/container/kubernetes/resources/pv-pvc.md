---
title: Kubernetes PV、PVC 与 StorageClass
author: Walt
date: 2026-07-18
---

# Kubernetes PV、PVC 与 StorageClass

PersistentVolumeClaim（PVC）描述工作负载需要的存储，PersistentVolume（PV）代表集群可用的卷，StorageClass 描述动态供应、绑定和回收策略。Pod 通过 PVC 使用卷，不直接依赖云盘或存储设备的具体实现。

![PVC 声明、CSI 供应和应用文件读写的三种路径](/container/kubernetes-volume-reconcile.svg)

例如订单数据库需要 100 GiB 数据盘：PVC 提出容量和访问模式，供应器创建真实卷并生成 PV，节点再把卷挂进 Pod。PVC/PV 的 `Bound` 只证明对象已绑定，不证明文件系统可挂载、数据库文件可打开或备份可恢复。PV、StorageClass 是集群级对象，PVC 属于 Namespace，Pod 只能引用同 Namespace 的 PVC。

## 动态供应

下面展示两个对象之间的配置关系。`csi.example.com` 是占位供应器，不能直接作为生产部署清单；应先确认集群现有 CSI 驱动、参数和 `fast-rwo` 是否由平台管理，业务通常只创建引用已批准 StorageClass 的 PVC。`orders` Namespace 需预先存在。

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-rwo
provisioner: csi.example.com
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Delete
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: order-data
  namespace: orders
spec:
  accessModes: ["ReadWriteOnce"]
  storageClassName: fast-rwo
  resources:
    requests:
      storage: 100Gi
```

供应器名称和参数由集群 CSI 驱动决定。`WaitForFirstConsumer` 会等到出现使用 PVC 的 Pod 后，再综合节点/可用区约束供应和绑定卷，减少卷创建在错误故障域导致 Pod 无法调度的情况。

因此刚建 PVC 时 `Pending` 可能是等待消费者的正常状态。若 Pod 通过 `nodeName` 绕过调度器，该模式可能一直等不到调度选择；需要节点约束时用 `nodeSelector` 或亲和性，再核对存储拓扑。跨可用区漂移也不等于已有盘会自动搬迁。

PVC 省略 `storageClassName` 时可由默认 StorageClass 补入；显式设为 `""` 则不使用默认类，也不触发按类动态供应。这两种配置不能混为一谈。已有 PV 的回收策略是在供应时继承的，修改 StorageClass 不会追溯修改既有 PV。

## 访问模式不是应用一致性协议

| 模式 | 含义 |
| --- | --- |
| ReadWriteOnce（RWO） | 卷可被单个节点读写 |
| ReadOnlyMany（ROX） | 可被多个节点只读挂载 |
| ReadWriteMany（RWX） | 可被多个节点读写，依赖存储支持 |
| ReadWriteOncePod（RWOP） | 限制为单个 Pod 读写，依赖 CSI 支持 |

RWO 是节点级挂载语义，不自动阻止同一节点上的多个 Pod 使用。访问模式也不提供数据库锁、复制或事务一致性。

例如把同一数据库 PVC 挂给同节点上的两个普通 Pod，RWO 可能仍允许挂载，但两个数据库进程同时写同一数据目录会破坏应用约束。RWOP 的单 Pod 边界依赖匹配版本和能力的 CSI 实现，仍不能替代数据库复制或故障节点的隔离方案。

## 回收与删除

动态卷常使用 `Delete`，PVC 删除后底层卷也可能删除；`Retain` 会保留 PV 和底层数据，等待人工回收。回收策略必须和数据等级、备份和审批流程匹配。

以 `order-data` 为例，Pod 重建仍引用原 PVC 时可复用原卷；删除 PVC 后，若绑定 PV 使用受支持的 `Delete` 策略，控制器会回收 PV 和实际存储卷。换成 `Retain` 时，PV 通常进入 `Released`，不会因为新建了同名 PVC 就自动重新交付旧数据；管理员需核对旧 claim UID、数据归属和重新绑定流程。

删除 StatefulSet 默认不会自动删除其 PVC。删除 Namespace、PVC 或修改 retention policy 前，应确认底层卷、快照和应用恢复路径。

使用中的 PVC/PV 受保护 finalizer 可能停留在 `Terminating`；先查仍引用卷的 Pod、绑定关系和 CSI 回收状态，不把移除 finalizer 当常规排障。保护机制延缓删除，不提供备份。StatefulSet 也可显式配置 PVC retention policy，具体见 [StatefulSet](./statefulset.md)。

## 扩容

当 StorageClass 允许扩容时，可以增加 PVC `spec.resources.requests.storage`。是否需要文件系统在线扩容、Pod 重启或存储后端操作取决于 CSI 驱动和文件系统。

PVC 通常只能扩不能缩。缩容需要创建新卷、复制数据和切换工作负载，不能直接把声明值改小。

扩容请求应改 PVC，不能只改 PV 容量让声明看似一致。按“PVC Conditions → 存储后端容量 → 节点文件系统容量 → 应用可写空间”逐层验证；例如申请从 100 GiB 增到 150 GiB，PVC 数字变大仍不能证明容器内文件系统已完成扩容。

## 快照和备份

CSI VolumeSnapshot 可以创建存储级快照，但快照是否应用一致、是否跨区域、保留多久和能否恢复取决于驱动与上层流程。数据库通常需要冻结写入、日志截点或原生备份协议。

恢复验收必须实际创建新 PVC、挂载到隔离环境并验证数据，而不是只检查 Snapshot Ready。

CSI 快照还需要匹配的 CRD、snapshot controller、驱动能力和 VolumeSnapshotClass。用新 PVC 从快照恢复时，检查源 Namespace、驱动、容量与访问模式，防止把恢复流程误操作到原卷。数据库恢复后验证日志截点、最近订单记录及读写完整性，再统计恢复点和恢复耗时；同故障域里的快照不自动具备异地备份能力。

## 排障路径

```bash
kubectl get pvc order-data -n orders -o yaml
kubectl describe pvc order-data -n orders
kubectl get pv,storageclass
pod_name=替换为实际数据库Pod名称
kubectl describe pod "$pod_name" -n orders
kubectl get volumeattachment
kubectl get events -n orders --sort-by=.metadata.creationTimestamp
```

| 现象 | 优先检查 |
| --- | --- |
| PVC Pending | StorageClass、供应器、配额、拓扑和 Events |
| Pod Pending 且 PVC 等待消费者 | Pod 调度约束、节点资源、可用区 |
| Multi-Attach 错误 | 卷仍挂在旧节点、访问模式、节点故障状态 |
| Mount 失败 | CSI node plugin、文件系统、Secret、节点日志 |
| 扩容不完成 | StorageClass、CSI 能力、PVC Conditions、文件系统 |
| PVC 删除后数据丢失 | reclaimPolicy 和备份/恢复流程 |

本地 `hostPath` 不适合作为多节点生产持久卷；它把数据固定在单节点路径，Pod 漂移后无法自动获得原数据。
