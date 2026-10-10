---
title: Kubernetes LimitRange
author: Walt
date: 2026-07-18
---

# Kubernetes LimitRange

LimitRange 在 Namespace 内为单个 Pod、Container 或 PVC 设置默认值、最小值、最大值和比例约束。它在准入阶段影响新对象，不会自动修改已经运行的 Pod。

## 默认 requests 与 limits

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: workload-defaults
  namespace: orders
spec:
  limits:
    - type: Container
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      default:
        memory: 512Mi
      min:
        cpu: 25m
        memory: 32Mi
      max:
        cpu: "2"
        memory: 2Gi
```

`defaultRequest` 填补缺失 request，`default` 填补缺失 limit。示例没有默认 CPU limit，避免在未评估延迟影响时统一引入 CPU throttling；组织应根据工作负载类型决定。

默认值只是兜底，不是容量数据。每个生产工作负载仍应通过压测和观测显式设置 requests。

## PVC 约束

```yaml
spec:
  limits:
    - type: PersistentVolumeClaim
      min:
        storage: 1Gi
      max:
        storage: 1Ti
```

PVC LimitRange 约束单个声明大小；Namespace 总存储量和 PVC 数量由 ResourceQuota 控制。

## 与调度、HPA 和配额的关系

- scheduler 使用 Pod requests 计算放置。
- HPA CPU utilization 以 CPU requests 为分母。
- ResourceQuota 汇总 Namespace 的 requests/limits 和对象数量。
- LimitRange 可能先补默认值，再导致 ResourceQuota 拒绝对象。

因此修改默认 request 会同时改变调度密度、HPA 指标和配额消耗，应先评估现有工作负载和新建对象。

## 验证

```bash
kubectl get limitrange -n orders -o yaml
kubectl run limit-test -n orders --image=registry.k8s.io/pause:3.10 --restart=Never
kubectl get pod limit-test -n orders -o jsonpath='{.spec.containers[0].resources}'
kubectl describe limitrange workload-defaults -n orders
```

测试完成后删除 Pod。验证最小/最大值时使用临时清单并确认 API 返回的拒绝原因。

| 现象 | 优先检查 |
| --- | --- |
| Pod 创建被拒绝 | min/max、limit/request 比例、ResourceQuota |
| 未填写资源却出现限制 | LimitRange default/defaultRequest |
| HPA CPU 比例异常 | 注入后的 CPU request 是否符合真实容量 |
| 调度密度变化 | 新 Pod requests、节点 allocatable、已有配额 |
| 修改规则后旧 Pod 未变化 | 这是预期行为，需要受控重建 |
