---
title: Kubernetes PV、PVC 与 StorageClass
author: Walt
date: 2026-07-18
---

# Kubernetes PV、PVC 与 StorageClass

PersistentVolumeClaim（PVC）描述工作负载需要的存储，PersistentVolume（PV）代表集群可用的卷，StorageClass 描述动态供应、绑定和回收策略。Pod 通过 PVC 使用卷，不直接依赖云盘或存储设备的具体实现。

## 动态供应

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

## 访问模式不是应用一致性协议

| 模式 | 含义 |
| --- | --- |
| ReadWriteOnce（RWO） | 卷可被单个节点读写 |
| ReadOnlyMany（ROX） | 可被多个节点只读挂载 |
| ReadWriteMany（RWX） | 可被多个节点读写，依赖存储支持 |
| ReadWriteOncePod（RWOP） | 限制为单个 Pod 读写，依赖 CSI 支持 |

RWO 是节点级挂载语义，不自动阻止同一节点上的多个 Pod 使用。访问模式也不提供数据库锁、复制或事务一致性。

## 回收与删除

动态卷常使用 `Delete`，PVC 删除后底层卷也可能删除；`Retain` 会保留 PV 和底层数据，等待人工回收。回收策略必须和数据等级、备份和审批流程匹配。

删除 StatefulSet 默认不会自动删除其 PVC。删除 Namespace、PVC 或修改 retention policy 前，应确认底层卷、快照和应用恢复路径。

## 扩容

当 StorageClass 允许扩容时，可以增加 PVC `spec.resources.requests.storage`。是否需要文件系统在线扩容、Pod 重启或存储后端操作取决于 CSI 驱动和文件系统。

PVC 通常只能扩不能缩。缩容需要创建新卷、复制数据和切换工作负载，不能直接把声明值改小。

## 快照和备份

CSI VolumeSnapshot 可以创建存储级快照，但快照是否应用一致、是否跨区域、保留多久和能否恢复取决于驱动与上层流程。数据库通常需要冻结写入、日志截点或原生备份协议。

恢复验收必须实际创建新 PVC、挂载到隔离环境并验证数据，而不是只检查 Snapshot Ready。

## 排障路径

```bash
kubectl get pvc order-data -n orders -o yaml
kubectl describe pvc order-data -n orders
kubectl get pv,storageclass
kubectl describe pod <pod> -n orders
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
