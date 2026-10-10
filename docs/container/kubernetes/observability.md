---
title: Kubernetes 可观测性与证据链
author: Walt
date: 2026-07-18
---

# Kubernetes 可观测性与证据链

Kubernetes 可观测性不是安装 Prometheus、日志平台和 Trace 后端。真正目标是把一次用户症状沿着入口、Service、Pod、节点、控制器和外部依赖还原成时间线，并能区分“对象期望错误、控制器未收敛、数据面未执行、应用自身失败”。

![Kubernetes 跨层可观测证据链](/container/kubernetes-observability-chain.svg)

## 五类信号回答不同问题

| 信号 | 擅长回答 | 不能单独证明 |
| --- | --- | --- |
| Metrics | 何时、影响多大、是否越过阈值 | 某次请求为何失败 |
| Logs | 某组件在某时刻记录了什么 | 整条链路的因果关系 |
| Traces | 一个请求跨服务经过哪里、耗时在哪 | 未采样请求和集群控制状态 |
| Events/Conditions | Kubernetes 对象为何未推进 | 长期趋势和业务影响 |
| Audit Logs | 谁对 API 做了什么、是否获准 | 控制器后续是否成功收敛 |

高质量排障通常先用 SLI 和指标确定时间窗与影响面，再用 Conditions/Events 找控制阶段，用 trace 关联请求路径，最后进入相关组件日志。反过来从海量日志搜索错误词，容易把同时发生的噪声当根因。

## 观测对象分层

```text
用户结果：成功率、延迟、正确性、队列等待
应用链路：请求、依赖、重试、业务事件
工作负载：Deployment、Pod、HPA、Job、PVC
集群数据面：Gateway、Service、DNS、CNI、CSI、Mesh
集群控制面：API Server、scheduler、controller、etcd
基础设施：节点、内核、网络、云盘、负载均衡器
```

每层都应能关联到 cluster、namespace、workload、pod、node、zone 和版本。标签维度要受控：request ID、用户 ID 等高基数值放入日志或 trace，不应无界进入指标标签。

## 控制面和控制器指标

Kubernetes 组件暴露 Prometheus 格式指标，但稳定性级别和名称可能随版本变化。关键视角包括：

- kube-apiserver 请求速率、延迟、5xx、inflight 和 Admission 延迟。
- etcd 请求/提交延迟、leader 变化、数据库空间和多数派健康。
- scheduler 尝试、调度延迟、不可调度 Pod 和插件耗时。
- controller-manager 工作队列深度、重试、调谐耗时与 leader election。
- kubelet Pod 启动、PLEG/运行时操作、卷操作和节点资源压力。

自定义 Operator 至少暴露 Reconcile 总数、错误、耗时、队列深度、重试、外部依赖调用和最长未收敛对象。只监控进程存活会漏掉“Controller Running 但所有对象都在失败”。

```bash
kubectl get --raw /metrics | head
kubectl get --raw /readyz?verbose
kubectl get --raw /livez?verbose
kubectl get --raw /api/v1/nodes/<node>/proxy/metrics | head
```

端点访问权限和路径取决于组件与发行版；生产采集应使用受控 ServiceMonitor/PodMonitor、TLS 和最小 RBAC，不应给普通用户开放所有组件指标。

## 日志、Events 与 Audit

Kubernetes 不原生提供集群级日志存储。容器把 stdout/stderr 写到节点后，通常由每节点日志 Agent 采集到独立后端；需要设置轮转、磁盘上限、多行解析和丢弃监控。应用把所有请求体和 Secret 打进日志会同时制造成本和泄露风险。

Events 是有限保留时间的诊断信号，不是审计日志。关键故障应在发生时采集，或导出到长期后端。Conditions 更适合保存对象当前可操作状态，但 Message 也不应成为无限日志缓冲区。

API Audit 可以记录请求阶段、用户、verb、资源、响应码等。审计策略要分层：对 Secret、token 和大对象谨慎记录 Request/Response Body；同时监控 webhook/backend 写入失败，避免“配置了审计”却在故障时没有记录。

## Trace 与 Kubernetes 元数据

OpenTelemetry Collector 可用 k8sattributes processor 把 Pod、namespace、node 等元数据附到 telemetry；kubeletstats、filelog、k8s cluster receiver 分别采集节点/容器指标、日志和集群状态。部署形态通常是节点 Agent + 集群 Gateway，各自承担本地采集与集中处理。

Trace 需要跨入口、代理和应用传播统一上下文。建议同时记录：

- `trace_id`/`span_id` 和受控 request ID。
- workload、pod、node、zone 与镜像 digest。
- Route/Service、发布 revision 和功能开关版本。
- 依赖端点、超时、重试次数和最终错误类别。

代理生成的 trace 不能替应用 span 判断业务阶段；应用 trace 也看不到 CNI 丢包和调度失败。二者通过时间、Pod 元数据和请求标识拼接。

## 从 SLI 到告警

告警应优先面向用户结果和错误预算消耗，再用组件告警解释原因。典型组合是：

| 层级 | 示例 |
| --- | --- |
| 用户 SLI | 成功率、P99 延迟、任务等待、数据新鲜度 |
| 工作负载 | Ready 容量不足、CrashLoop、Pending、HPA 触顶 |
| 控制面 | API 5xx/延迟、etcd 提交、调度失败、队列积压 |
| 基础设施 | NodeNotReady、内存/磁盘/PID 压力、网络和卷错误 |

单一瞬时阈值容易制造噪声。生产告警应带持续窗口、影响范围、runbook、仪表盘和责任方；对 SLO 使用快慢多窗口 burn-rate 可以同时捕获突发和缓慢消耗。

## 一次 503 的证据链

1. 用入口成功率和 trace 确认开始时间、Route、版本和受影响区域。
2. 检查 Gateway/Route Conditions 与代理 access log，区分未匹配、无后端和上游错误。
3. 检查 Service 与 EndpointSlice，确认 Ready 地址是否在故障前变化。
4. 查看 Pod Conditions、Events、发布 revision 与 readiness 指标。
5. 若 Service 到 Pod 流量异常，再看 CNI/Hubble、NetworkPolicy、节点和 DNS。
6. 对齐应用 trace、日志和依赖指标，确认超时发生在哪一跳。

最终记录应写成可证伪结论，例如：“12:03 新 revision 的 readiness 在 8 秒内通过，但依赖连接池需 40 秒预热；EndpointSlice 提前纳入后端，12:03–12:04 该 revision 产生 83% 的 503。”这比“网络抖动”更能指导修复和回归测试。

## 可观测系统自身也要被监控

验证采集延迟、丢弃数、队列、后端写入失败、采样比例、日志轮转和时间同步。故障期间流量放大会让 telemetry 量同时上升，若管道无背压和限额，最需要证据时反而最先丢失。

上线验收至少注入一次应用错误、策略拒绝、Pod Pending、节点压力和采集后端不可用，确认告警、上下文关联、数据保留和降级行为符合预期。

## 官方资料

- [System Metrics](https://kubernetes.io/docs/concepts/cluster-administration/system-metrics/)
- [Logging Architecture](https://kubernetes.io/docs/concepts/cluster-administration/logging/)
- [Auditing](https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/)
- [OpenTelemetry Collector Kubernetes Components](https://opentelemetry.io/docs/platforms/kubernetes/collector/components/)
