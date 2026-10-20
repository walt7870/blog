---
title: Kubernetes Pod
author: Walt
date: 2026-10-20
---

# Kubernetes Pod

Pod 是 Kubernetes 的最小调度单位。一个 Pod 中的容器共享网络命名空间，并可挂载同一份 Pod 卷；卷仍要在各容器中显式声明 volumeMounts。它们被放到同一节点。Pod 不是虚拟机，也不是稳定服务地址；替代 Pod 总有新的 UID，IP 可能变化，不能把旧 Pod 的网络地址当作持久身份。

![Pod 从声明、调度到启动和终止的生命周期](/container/kubernetes-scheduling-lifecycle.svg)

## 什么时候直接创建 Pod

生产应用通常由 Deployment、StatefulSet、DaemonSet 或 Job 管理，不直接创建裸 Pod。裸 Pod 适合临时调试和最小实验，但节点故障后不会由工作负载控制器补建。

多容器 Pod 只适合生命周期、网络和资源边界紧密耦合的进程，例如应用与必须同地运行的代理。可以独立扩缩、发布或故障隔离的服务应拆成不同 Pod。

## 一个生产基线

下面是配置结构示例：先在目标 namespace 创建 `order-api` ServiceAccount，再替换镜像为真实 digest。镜像必须支持非 root 用户、只读根文件系统和三个健康端点；需要写临时文件时，应额外挂载有容量上限的可写卷。不能把占位 digest 原样部署。

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
| `Initialized` | 普通 init 已成功结束；原生 sidecar init 按其启动规则判断 |
| `ContainersReady` | 所有需就绪的容器是否满足就绪要求 |
| `Ready` | 容器就绪及自定义 readiness gates 等条件是否全部满足 |

`Running` 不等于 Ready：它只表示 Pod 已绑定节点、容器已创建，且至少一个容器仍在运行、启动或重启。普通 Service 通常按就绪端点接流量，但 `publishNotReadyAddresses` 等配置可改变行为；不能只看 phase 判断流量是否安全。

容器状态中的 `waiting.reason`、`terminated.reason`、退出码和 `restartCount` 比 phase 更能解释 `ImagePullBackOff`、`CrashLoopBackOff`、OOMKilled 和探针失败。

## init container、卷和配置

普通 init container 按顺序成功结束后，业务容器才启动。原生 sidecar 是设置 `restartPolicy: Always` 的 init container，达到启动条件后可与后续容器并行运行，并持续到 Pod 终止。不要把它理解成必须退出的初始化脚本。普通 init 适合生成配置、等待必要条件或设置文件权限，但不应无限等待外部服务；超时和失败要能从日志与 Events 看见。

ConfigMap/Secret 环境变量只在容器创建时读取。卷投影可能更新文件，但应用是否重载由应用决定。持久数据应使用 PVC，不写进容器可写层。

## 排障顺序

查询示例使用当前 namespace；切换到实际环境后再执行。`--previous` 只在同一 Pod 内仍保留上一轮容器日志时有效。

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
