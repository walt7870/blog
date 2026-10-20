---
title: Kubernetes StatefulSet
author: Walt
date: 2026-10-20
---

# Kubernetes StatefulSet

StatefulSet 为一组 Pod 提供稳定序号、网络身份和每副本持久卷，适合应用已经能利用这些身份管理复制、成员关系或分片的场景。它不会自动把普通应用变成高可用数据库，也不负责数据一致性、备份和主从切换。

## 稳定身份

名为 `orders-db`、副本数为 3 的 StatefulSet 会创建 `orders-db-0`、`orders-db-1`、`orders-db-2`。配合 Headless Service，每个 Pod 可以获得稳定 DNS，例如：

```text
orders-db-0.orders-db.orders.svc.cluster.local
```

Pod 被重建时名称保持，IP 可以变化。应用成员关系应使用稳定 DNS 或领域内成员 ID，不持久化 Pod IP。

![StatefulSet 替代 Pod 复用稳定身份和原 PVC](/container/statefulset-identity-volume.svg)

这里稳定的是序号及其存储关联，不是进程或 Pod UID。网络分区时，强删旧 Pod 对象不能证明旧进程已经停止；数据库等单写应用必须先隔离旧实例或旧节点，避免同一成员身份出现两个活跃写入者。

## 最小结构

下面只演示对象关系：需先创建 `orders` namespace，准备 `fast-rwo` StorageClass，并替换镜像 digest、数据目录和数据库启动配置。三个独立容器不会自动组成 PostgreSQL 或其他数据库集群，成员发现、复制、认证和备份必须由应用或 Operator 配置。

```yaml
apiVersion: v1
kind: Service
metadata:
  name: orders-db
  namespace: orders
spec:
  clusterIP: None
  selector: { app: orders-db }
  ports:
    - name: db
      port: 5432
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: orders-db
  namespace: orders
spec:
  serviceName: orders-db
  replicas: 3
  selector:
    matchLabels: { app: orders-db }
  template:
    metadata:
      labels: { app: orders-db }
    spec:
      containers:
        - name: database
          image: registry.example.com/database@sha256:replace-with-digest
          ports:
            - name: db
              containerPort: 5432
          volumeMounts:
            - name: data
              mountPath: /var/lib/database
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-rwo
        resources:
          requests: { storage: 100Gi }
```

每个副本会得到独立 PVC，例如 `data-orders-db-0`。`persistentVolumeClaimRetentionPolicy` 的默认值为 `Retain`，缩容或删除 StatefulSet 默认保留这些 PVC；若配置为 `Delete`，会改变相应回收行为，删除 PVC 后还要结合 PV reclaimPolicy 判断底层数据后果。`ReadWriteOnce` 限制的是单节点挂载，不是严格单 Pod 写入；需要单 Pod 访问语义时，核对 CSI 对 `ReadWriteOncePod` 的支持。

## 顺序、发布和分区

默认 `OrderedReady` 扩容时从低序号开始，前一个 Pod Running/Ready 后才创建下一个；缩容时从高序号开始，等待前一个删除完成。默认 RollingUpdate 从高序号向低序号逐个替换，并等待可用条件。不要把三种顺序混为“统一正序”。删除整个 StatefulSet 本身也不保证按序终止，需要有序停机时先按应用协议缩容。

只有应用不依赖这些等待关系时才使用 `Parallel`。它主要改变扩缩容并发；滚动更新还要看更新策略和 `maxUnavailable`，不能仅凭这个字段认为所有副本会同时更新。

RollingUpdate 可以通过 partition 保留低序号副本在旧版本，用于分阶段验证。即使 Pod 逐个更新，数据库 schema、协议和成员变更仍必须支持新旧版本混跑。

例如三个副本、`partition: 2` 时只更新序号 2，0 和 1 保持旧 template。验证成员同步和业务读写后再降低 partition。若新 Pod 永远不 Ready，恢复旧 template 后仍可能需要删除卡住的新 Pod 才能继续；执行前先确认应用数据与旧进程隔离状态，不能把它当成无条件重试按钮。

## 存储和拓扑

多可用区集群优先使用 `WaitForFirstConsumer` 的 StorageClass，让卷拓扑和 Pod 调度一起决定。还要定义：

- 副本是否跨节点/可用区分散。
- 卷故障后的重挂载和恢复时间。
- 单副本卷与应用复制之间的职责。
- 备份的一致性点、恢复顺序和演练频率。
- 缩容后遗留 PVC 的审批与清理方式。

PVC 独立于 Pod 不等于跨区容灾。

## 排障

```bash
kubectl get statefulset,pod,pvc -n orders -o wide
kubectl describe statefulset orders-db -n orders
kubectl describe pod orders-db-0 -n orders
kubectl describe pvc data-orders-db-0 -n orders
kubectl get events -n orders --sort-by=.metadata.creationTimestamp
```

| 现象 | 优先检查 |
| --- | --- |
| 后续序号不创建 | 前一 Pod Ready、OrderedReady、init/探针 |
| Pod Pending | PVC、StorageClass、拓扑、节点资源 |
| 新 Pod 找不到成员 | Headless Service、DNS、应用成员配置 |
| 更新卡在某序号 | Pod 日志、探针、版本兼容、partition |
| 缩容后 PVC 仍在 | 这是默认保护行为，按数据保留策略处理 |
| Pod 重建后数据异常 | 卷挂载、应用复制/恢复逻辑，不只看 PVC Bound |
