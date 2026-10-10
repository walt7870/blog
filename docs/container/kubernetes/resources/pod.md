---
title: Kubernetes Pod
author: Walt
date: 2026-07-18
---

# Kubernetes Pod

Pod 是 Kubernetes 的最小调度单位。一个 Pod 中的容器共享网络命名空间和卷，并被放到同一节点。Pod 不是虚拟机，也不是稳定服务地址；控制器会在故障或发布时创建新的 Pod，新 Pod 通常拥有新的 UID 和 IP。

## 什么时候直接创建 Pod

生产应用通常由 Deployment、StatefulSet、DaemonSet 或 Job 管理，不直接创建裸 Pod。裸 Pod 适合临时调试和最小实验，但节点故障后不会由工作负载控制器补建。

多容器 Pod 只适合生命周期、网络和资源边界紧密耦合的进程，例如应用与必须同地运行的代理。可以独立扩缩、发布或故障隔离的服务应拆成不同 Pod。

## 一个生产基线

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: order-api
  labels:
    app: order-api
spec:
  serviceAccountName: order-api
  terminationGracePeriodSeconds: 30
  securityContext:
    runAsNonRoot: true
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: api
      image: registry.example.com/order-api@sha256:replace-with-digest
      ports:
        - name: http
          containerPort: 8080
      resources:
        requests:
          cpu: 250m
          memory: 256Mi
        limits:
          memory: 512Mi
      startupProbe:
        httpGet: { path: /health/startup, port: http }
        failureThreshold: 30
        periodSeconds: 5
      readinessProbe:
        httpGet: { path: /health/readiness, port: http }
        periodSeconds: 5
      livenessProbe:
        httpGet: { path: /health/liveness, port: http }
        periodSeconds: 10
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]
```

CPU limit 是否设置取决于延迟目标和节流风险；内存 limit 超出时可能导致 OOMKill。requests 应来自测量，因为 scheduler、HPA 和容量规划都会使用它。

## 生命周期和 Conditions

`status.phase` 只有 Pending、Running、Succeeded、Failed、Unknown 等粗粒度状态。定位问题应继续看容器状态和 Conditions：

| Condition | 含义 |
| --- | --- |
| `PodScheduled` | 是否已经绑定节点 |
| `Initialized` | init containers 是否完成 |
| `ContainersReady` | 所有业务容器是否 Ready |
| `Ready` | Pod 是否可作为 Service 后端 |

`Running` 不等于 Ready；进程已经启动但就绪探针失败时，Pod 仍不应接收流量。

容器状态中的 `waiting.reason`、`terminated.reason`、退出码和 `restartCount` 比 phase 更能解释 `ImagePullBackOff`、`CrashLoopBackOff`、OOMKilled 和探针失败。

## init container、卷和配置

init container 按顺序运行并全部成功后，业务容器才启动。它适合生成配置、等待必要条件或设置文件权限，但不应无限等待外部服务；超时和失败要能从日志与 Events 看见。

ConfigMap/Secret 环境变量只在容器创建时读取。卷投影可能更新文件，但应用是否重载由应用决定。持久数据应使用 PVC，不写进容器可写层。

## 排障顺序

```bash
kubectl get pod order-api -o wide
kubectl describe pod order-api
kubectl get pod order-api -o jsonpath='{range .status.conditions[*]}{.type}{"="}{.status}{" "}{.reason}{"\n"}{end}'
kubectl logs order-api -c api
kubectl logs order-api -c api --previous
kubectl get events --field-selector involvedObject.name=order-api --sort-by=.metadata.creationTimestamp
```

| 现象 | 优先检查 |
| --- | --- |
| Pending | PodScheduled、资源请求、污点/容忍、拓扑、PVC |
| ImagePullBackOff | 镜像名、Registry 凭据、节点网络、限流 |
| CrashLoopBackOff | 当前与 previous 日志、退出码、启动参数、探针 |
| Running 但不接流量 | Ready Condition、readinessProbe、EndpointSlice |
| OOMKilled | limit、工作集、堆外内存、并发和内存泄漏 |
| Terminating 很久 | preStop、宽限期、卷卸载、节点状态和 finalizer |

需要进入容器时优先使用 `kubectl exec`；镜像缺少工具时使用 ephemeral container 调试，避免为了排障永久扩大生产镜像。
