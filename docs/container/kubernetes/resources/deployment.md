---
title: Kubernetes Deployment
author: Walt
date: 2026-07-18
---

# Kubernetes Deployment

Deployment 管理无状态工作负载的期望副本和滚动发布。它通过 ReplicaSet 创建 Pod，并以 Pod template 的变化区分版本。Deployment 负责副本收敛，不保证应用协议兼容、数据迁移安全或下游容量充足。

## 资源关系

```text
Deployment
  -> ReplicaSet revision N
     -> Pods
  -> ReplicaSet revision N+1
     -> Pods
```

修改副本数不会创建新 revision；修改 `.spec.template` 会创建或复用对应 ReplicaSet。排障发布应同时看 Deployment、ReplicaSet 和 Pod。

## 一个可回滚配置

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

selector 创建后不要修改，并确保与 Pod template labels 匹配。镜像使用不可变摘要，避免相同 tag 在不同节点解析到不同制品。

## 滚动发布的容量边界

`maxSurge` 控制额外创建多少 Pod，`maxUnavailable` 控制更新期间允许多少目标副本不可用。`maxUnavailable: 0` 也不能单独保证零中断，还需要：

- 新 Pod 只有真正可服务时才 Ready。
- 旧 Pod 在退出前完成摘流和在途请求处理。
- 集群有 surge 所需资源和拓扑空间。
- 新旧版本在数据库、缓存、消息和协议上兼容。
- 入口和 EndpointSlice 传播延迟被纳入终止时间。

## 发布操作

```bash
kubectl apply -f deployment.yaml
kubectl rollout status deploy/order-api -n orders
kubectl rollout history deploy/order-api -n orders
kubectl get deploy,rs,pod -n orders -o wide
kubectl rollout undo deploy/order-api -n orders --to-revision=<revision>
```

回滚 Deployment 只恢复 Pod template。数据库迁移、外部资源和已经产生的业务数据不会自动回滚，必须有独立兼容方案。

## 状态判断

| 字段/Condition | 判断 |
| --- | --- |
| `observedGeneration` | 控制器是否处理了当前 spec |
| `updatedReplicas` | 已运行新 template 的副本 |
| `readyReplicas` | Ready 副本 |
| `availableReplicas` | 满足最短可用时间的副本 |
| `Progressing=False/ProgressDeadlineExceeded` | 发布未在截止时间内推进 |

`kubectl apply` 成功但 `observedGeneration` 未追上时，应先检查控制器和 API；新 Pod 已创建但不 Ready 时，进入 Pod、配置、网络或依赖层。

## 常见故障

| 现象 | 优先检查 |
| --- | --- |
| 新 ReplicaSet 没有 Pod | 配额、Admission、selector、控制器 Events |
| Pod Pending | 资源请求、节点容量、拓扑、PVC |
| rollout 卡住 | readiness、镜像拉取、progress deadline、surge 容量 |
| 发布完成但请求错误 | 协议兼容、Service 端口、应用指标、外部依赖 |
| 旧 Pod 不退出 | preStop、宽限期、连接排空、节点/kubelet |
| 回滚后仍异常 | 数据迁移、ConfigMap/Secret、外部资源和不可逆副作用 |
