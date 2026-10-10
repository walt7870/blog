---
title: Kubernetes StatefulSet
author: Walt
date: 2026-07-18
---

# Kubernetes StatefulSet

StatefulSet 为一组 Pod 提供稳定序号、网络身份和每副本持久卷，适合应用已经能利用这些身份管理复制、成员关系或分片的场景。它不会自动把普通应用变成高可用数据库，也不负责数据一致性、备份和主从切换。

## 稳定身份

名为 `orders-db`、副本数为 3 的 StatefulSet 会创建 `orders-db-0`、`orders-db-1`、`orders-db-2`。配合 Headless Service，每个 Pod 可以获得稳定 DNS，例如：

```text
orders-db-0.orders-db.orders.svc.cluster.local
```

Pod 被重建时名称保持，IP 可以变化。应用成员关系应使用稳定 DNS 或领域内成员 ID，不持久化 Pod IP。

## 最小结构

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

每个副本会得到独立 PVC，例如 `data-orders-db-0`。默认缩容或删除 StatefulSet 不会自动删除这些 PVC，以降低误删数据风险；回收流程必须显式设计。

## 顺序、发布和分区

默认 `OrderedReady` 按序创建、更新和删除，前一个 Pod 未 Ready 会阻塞后续。只有应用不依赖顺序时才使用 `Parallel` podManagementPolicy。

RollingUpdate 可以通过 partition 保留低序号副本在旧版本，用于分阶段验证。即使 Pod 逐个更新，数据库 schema、协议和成员变更仍必须支持新旧版本混跑。

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
