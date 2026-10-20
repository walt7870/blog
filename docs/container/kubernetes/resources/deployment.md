---
title: Kubernetes Deployment
author: Walt
date: 2026-10-20
---

# Kubernetes Deployment

Deployment 管理无状态工作负载的期望副本和滚动发布。它通过 ReplicaSet 创建 Pod，并以 Pod template 的变化区分版本。Deployment 负责副本收敛，不保证应用协议兼容、数据迁移安全或下游容量充足。

## 资源关系

Deployment 持有发布期望，新旧 ReplicaSet 分别管理各自 template 的 Pod。ReplicaSet 的目标数变化与实际进程退出并非同一时刻。

![Deployment 发布过程中目标副本与终止资源的区别](/container/deployment-rollout-capacity.svg)

修改副本数不会创建新 revision；修改 `.spec.template` 会创建或复用对应 ReplicaSet。排障发布应同时看 Deployment、ReplicaSet 和 Pod。

## 一个发布配置

先创建 `orders` namespace，替换镜像 digest，并确认应用提供示例 readiness 端点。以下资源演示滚动发布控制；保留旧 ReplicaSet 只提供恢复 template 的入口，不能保证业务数据可回滚。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-api
  namespace: orders
spec:
  replicas: 3
  revisionHistoryLimit: 5
  progressDeadlineSeconds: 600
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: order-api
  template:
    metadata:
      labels:
        app: order-api
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: api
          image: registry.example.com/order-api@sha256:replace-with-digest
          ports:
            - name: http
              containerPort: 8080
          resources:
            requests: { cpu: 250m, memory: 256Mi }
            limits: { memory: 512Mi }
          readinessProbe:
            httpGet: { path: /health/readiness, port: http }
            periodSeconds: 5
```

`apps/v1` 的 selector 创建后不可修改，并确保与 Pod template labels 匹配。镜像使用不可变摘要，避免相同 tag 在不同节点解析到不同制品。

## 滚动发布的容量边界

`maxSurge` 控制额外创建多少 Pod，`maxUnavailable` 控制更新期间允许多少目标副本不可用。`maxUnavailable: 0` 也不能单独保证零中断，还需要：

- 新 Pod 只有真正可服务时才 Ready。
- 旧 Pod 在退出前完成摘流和在途请求处理。
- 集群有 surge 所需资源和拓扑空间。
- 新旧版本在数据库、缓存、消息和协议上兼容。
- 入口和 EndpointSlice 传播延迟被纳入终止时间。

例如三个旧副本都可用，先创建一个新 Pod；若它一直不 Ready，`maxUnavailable: 0` 会阻止继续减少旧的可用副本。新 Pod 满足可用条件后才逐步替换。旧 Pod 进入 Terminating 后可能继续占用 CPU、内存和连接，因此实际资源占用可短时超过 `replicas + maxSurge` 的简单估算。PDB 也不限制这条控制器直接删除路径。

## 发布操作

```bash
kubectl apply -f deployment.yaml
kubectl rollout status deploy/order-api -n orders
kubectl rollout history deploy/order-api -n orders
kubectl get deploy,rs,pod -n orders -o wide
```

确认历史 revision、依赖兼容和回滚授权后，才执行恢复动作：

```bash
target_revision=替换为历史版本号
kubectl rollout undo deploy/order-api -n orders --to-revision="$target_revision"
kubectl rollout status deploy/order-api -n orders
```

回滚 Deployment 只恢复 Pod template。数据库迁移、外部资源和已经产生的业务数据不会自动回滚，必须有独立兼容方案。

## 状态判断

| 字段/Condition | 判断 |
| --- | --- |
| `observedGeneration` | 控制器是否处理了当前 spec |
| `updatedReplicas` | 匹配新 template 的非终止副本，不代表已经 Running 或 Ready |
| `readyReplicas` | Ready 副本 |
| `availableReplicas` | 满足最短可用时间的副本 |
| `Progressing=False` | 发布推进失败，结合 reason 判断原因 |

`kubectl apply` 成功但 `observedGeneration` 未追上时，应先检查控制器和 API；新 Pod 已创建但不 Ready 时，进入 Pod、配置、网络或依赖层。

当 `Progressing=False` 且 reason 为 `ProgressDeadlineExceeded` 时，表示发布未在截止时间内推进。它不会自动执行 `rollout undo`。告警或发布系统应据此停止扩大范围，再结合业务指标决定修复前滚还是恢复旧 template。

## 常见故障

| 现象 | 优先检查 |
| --- | --- |
| 新 ReplicaSet 没有 Pod | 配额、Admission、selector、控制器 Events |
| Pod Pending | 资源请求、节点容量、拓扑、PVC |
| rollout 卡住 | readiness、镜像拉取、progress deadline、surge 容量 |
| 发布完成但请求错误 | 协议兼容、Service 端口、应用指标、外部依赖 |
| 旧 Pod 不退出 | preStop、宽限期、连接排空、节点/kubelet |
| 回滚后仍异常 | 数据迁移、ConfigMap/Secret、外部资源和不可逆副作用 |
