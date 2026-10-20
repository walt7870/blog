---
title: Kubernetes LimitRange
author: Walt
date: 2026-07-18
---

# Kubernetes LimitRange

LimitRange 在 Namespace 内为单个 Pod、Container 或 PVC 设置默认值、最小值、最大值和比例约束。它在准入阶段影响新对象，不会自动修改已经运行的 Pod。

例如订单 API 忘写 resources，平台可以补上 `100m` CPU request 和 `128Mi` 内存 request，再检查单容器上下限。通过这一关只说明对象满足规则；Namespace 剩余配额和节点可用容量还要分别检查。

![Pod 从资源默认值、单对象约束、团队配额到节点调度的不同检查阶段](/container/resource-admission-capacity.svg)

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
        cpu: "1"
        memory: 512Mi
      min:
        cpu: 25m
        memory: 32Mi
      max:
        cpu: "2"
        memory: 2Gi
```

`orders` Namespace 需已存在。`defaultRequest` 填补缺失 request，`default` 填补缺失 limit；完全未声明资源的普通容器在本例中得到 CPU `100m/1`、内存 `128Mi/512Mi` 的 request/limit。`min/max` 用于约束声明，不表示进程实际已使用这些资源。

示例显式设置默认 CPU limit 为1核，并非所有服务都应采用这个值。CPU limit 可能引入 throttling，需要根据延迟和吞吐验证。尤其不能只删掉 `default.cpu` 就声称不限制 CPU：Container 类型的 `max.cpu` 还可能自动补成默认 limit，应读取创建后的 LimitRange 和 Pod 确认最终值。若策略选择不统一设置 CPU limit，需要同时审查 max、其他 LimitRange 和准入注入行为。

默认值还可能与显式字段冲突：应用写了 `requests.cpu: 1500m` 却漏写 limit，本例会补出 `limits.cpu: 1`，最终 request 大于 limit，Pod 会被拒绝。一个空间应有明确的默认值所有者；多个 LimitRange 的默认值选择没有可靠顺序，不能用创建先后作为覆盖规则。

默认值只是兜底，不是容量数据。每个生产工作负载仍应通过压测和观测显式设置 requests。

## PVC 约束

下面是另一条 LimitRange 的 `spec` 片段，需补上 `apiVersion/kind/metadata`；它不应替换上面的 Container 规则而让默认值意外消失：

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

因此修改默认 request 会同时改变调度密度、HPA 指标和配额消耗，应先评估现有工作负载和新建对象。它不会重写 Deployment 模板，也不会批量修正旧 Pod；同一 Deployment 的新旧副本可能在规则变更后得到不同资源，回滚镜像也不等于回滚准入默认值。

## 验证

先在具备同样规则的测试空间做服务端 dry-run，检查注入结果；该请求仍要求 API 连接、创建权限和准入规则允许，不会实际运行镜像或证明调度成功：

```bash
kubectl get limitrange -n orders -o yaml
kubectl run limit-test -n orders --image=registry.k8s.io/pause:3.10 \
  --restart=Never --dry-run=server -o yaml
kubectl describe limitrange workload-defaults -n orders
```

核对返回的 `.spec.containers[].resources`，再用临时清单验证低于最小值、超过最大值和 request/limit 冲突三个拒绝路径。需要观察调度或运行期限制时，再在测试空间创建真实 Pod，记录 Events、CPU throttling 或内存退出证据，最后清理测试对象。

| 现象 | 优先检查 |
| --- | --- |
| Pod 创建被拒绝 | min/max、limit/request 比例、ResourceQuota |
| 未填写资源却出现限制 | LimitRange default/defaultRequest |
| HPA CPU 比例异常 | 注入后的 CPU request 是否符合真实容量 |
| 调度密度变化 | 新 Pod requests、节点 allocatable、已有配额 |
| 修改规则后旧 Pod 未变化 | 这是预期行为，需要受控重建 |
