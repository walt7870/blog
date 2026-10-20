---
title: Kubernetes DaemonSet
author: Walt
date: 2026-10-20
---

# Kubernetes DaemonSet

DaemonSet 确保每个符合条件的节点运行一个 Pod，适合节点级日志、监控、网络、存储或安全代理。它按节点覆盖范围扩缩，不适合需要按业务负载增加任意副本的服务。

## 选择目标节点

DaemonSet 按 nodeSelector 或 nodeAffinity 选择节点，再结合污点容忍等条件创建 Pod；通常仍由调度器绑定。控制器会自动补充一些节点状态污点的容忍，包括 `node.kubernetes.io/unschedulable:NoSchedule`，所以 cordon 不会阻止匹配的 DaemonSet Pod 运行。它不是普通 Deployment 调度规则的简单复制。

![DaemonSet 节点标签、cordon 与覆盖范围](/container/daemonset-node-coverage.svg)

下面只覆盖具有 `node-pool: workers` 标签的节点，需先创建 `observability` namespace、核实标签并替换镜像 digest。镜像必须支持非 root 用户；这份清单本身不包含主机日志挂载或具体采集配置。

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-agent
  namespace: observability
spec:
  selector:
    matchLabels: { app: node-agent }
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 10%
  template:
    metadata:
      labels: { app: node-agent }
    spec:
      nodeSelector:
        node-pool: workers
      containers:
        - name: agent
          image: registry.example.com/node-agent@sha256:replace-with-digest
          resources:
            requests: { cpu: 50m, memory: 64Mi }
            limits: { memory: 256Mi }
          securityContext:
            runAsNonRoot: true
            allowPrivilegeEscalation: false
```

若还存在专用节点污点，应按实际需要增加特定 toleration；容忍只是解除排斥，不会主动选中节点。`system-node-critical` 和全污点容忍会扩大调度影响，不能作为普通日志代理的默认配置。

## 主机访问是高风险边界

网络、存储和日志代理可能需要 `hostNetwork`、`hostPID`、hostPath 或特权能力。这些配置会扩大到节点级权限，应逐项解释并最小化：

- 只挂载必要目录，并优先只读。
- 只添加确实需要的 Linux capability。
- 使用 seccomp/AppArmor/SELinux 等运行时约束。
- 限制 ServiceAccount 和 Kubernetes API 权限。
- 为节点级资源占用设置 requests 和上限。

不要复制“特权 + 根目录 hostPath”模板来解决权限问题。

## 滚动更新

DaemonSet 更新会逐节点替换 Pod。网络或存储代理可能直接影响节点数据面，升级前应：

1. 选择非关键节点或独立节点池灰度。
2. 验证代理退出和新代理就绪期间的连接/挂载影响。
3. 设定 maxUnavailable、停止条件和节点回退方式。
4. 观察至少一个完整负载周期，再扩大范围。

OnDelete 策略只在需要外部系统逐节点控制更新时使用；它不会自动替换旧 Pod。

例如十个匹配节点设置 `maxUnavailable: 10%`，更新预算为一个不可用节点代理；若已有一个代理不 Ready，更新可能停住。DaemonSet 还可配置 `maxSurge` 让新旧代理短暂共存，但主机端口、锁文件和节点规则写入必须允许共存，否则应采用经过验证的替换方式。

## 排障

```bash
kubectl get daemonset node-agent -n observability
kubectl get pod -n observability -l app=node-agent -o wide
kubectl describe daemonset node-agent -n observability
kubectl get node --show-labels
kubectl get events -n observability --sort-by=.metadata.creationTimestamp
```

| 现象 | 优先检查 |
| --- | --- |
| 某些节点没有 Pod | selector/affinity、污点/容忍、节点状态 |
| Desired 与 Ready 差距大 | 镜像、资源、主机端口、权限、探针 |
| 更新长期不完成 | maxUnavailable、异常节点、新版本 Ready |
| 代理启动后节点异常 | 主机权限、内核/运行时兼容、资源占用 |
| 删除 DaemonSet 后残留影响 | 主机文件、网络规则、挂载和清理逻辑 |
