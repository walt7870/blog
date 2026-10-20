---
title: Kubernetes 云原生扩展生态
author: Walt
date: 2026-07-18
---

# Kubernetes 云原生扩展生态

Gateway API、Cilium、Service Mesh、GitOps 和策略引擎解决的是不同层级的问题。它们都可能表现为“安装几个 CRD 和控制器”，但故障范围分别位于 API、节点数据面、服务通信、配置来源和准入路径。选型时先定位问题层级，再比较引入后的长期责任。

本文用于横向选型。需要跟踪实际数据路径和迁移证据时阅读 [Gateway、Cilium 与 Service Mesh](./traffic-engineering)；需要设计 GitOps、Admission、Pod Security 和镜像信任链时阅读 [GitOps、策略与供应链安全](./delivery-security)；需要比较 CRI、CNI、CSI、DRA 等接口时阅读 [扩展点与接口边界](./extension-points)。

![先定位业务需求再选择模板、控制器或运行路径扩展](/container/extension-selection-path.svg)

以订单API为例：复用发布清单用模板；外部请求到不了服务查Gateway；Pod间策略拒绝查网络数据面；提交配置后被持续改回查GitOps所有权。这些现象可能同时出现，但对应不同证据，不能用“再装一个Operator”统一处理。

## Gateway API

Ingress API 已冻结：仍是稳定 API，项目没有移除计划，但不再继续扩展。Gateway API 通过 `GatewayClass`、`Gateway`、`HTTPRoute` 等资源拆分基础设施提供者、集群运维和应用团队的职责，并提供更明确的状态与可移植路由模型。

| 对象 | 典型负责人 | 责任 |
| --- | --- | --- |
| GatewayClass | 平台/基础设施团队 | 选择实现和全局能力 |
| Gateway | 集群或网络团队 | 监听器、地址、证书和允许的路由范围 |
| HTTPRoute/GRPCRoute | 应用团队 | 域名、路径、后端和流量规则 |

Gateway API 是 CRD 规范，不自带数据面。采用前要核对目标实现的 conformance profile、支持的资源/字段和标准/实验通道。迁移应盘点 Ingress 注解，区分可直接映射的标准语义和实现私有功能，再双跑、比较状态与流量，最后切换入口并保留回退窗口。

## Cilium 与 eBPF

Cilium 可以用 eBPF 实现 Pod 网络、Service 转发、NetworkPolicy 和可观测能力，并可在特定模式下替代 kube-proxy。收益可能包括更直接的数据路径和身份感知策略，但它把兼容性延伸到 Linux 内核、网络设备、Service 行为和节点升级。

生产迁移需要验证：

- Kubernetes、Cilium、内核和云网络组合是否在支持矩阵内。
- NodePort、LoadBalancer、HostNetwork、双栈和连接跟踪行为。
- 现有 NetworkPolicy 在新实现中的语义和默认拒绝边界。
- 逐节点切换时长连接、回程路径和故障节点的处理。
- 回退是否需要重建节点，还是能在原节点恢复旧数据面。

不要因为“eBPF 更快”跳过基线测量。先用真实流量比较吞吐、尾延迟、CPU、连接规模和排障成本。

## 服务网格

Service Mesh 把服务身份、mTLS、流量治理和遥测下沉到基础设施数据面。Sidecar 模式为每个工作负载注入代理；Ambient 等模式把四层安全隧道和七层策略拆到不同组件。无论形态如何，网格都不会自动修复应用超时、事务幂等或不合理的重试预算。

引入前应回答：

- 哪些需求无法由客户端库、Gateway 或平台统一配置解决。
- 证书颁发、轮换和信任域由谁负责。
- 控制面故障是否影响现有数据面连接和新配置传播。
- L4 与 L7 观测如何关联到应用 trace 和 Kubernetes 对象。
- 升级代理、Waypoint 或节点组件时如何灰度和回退。

## GitOps

GitOps 控制器持续比较版本库或 OCI 来源中的期望状态与集群实际状态，并按策略修复漂移。Git 提供审计和恢复来源，控制器负责运行时收敛；它不意味着每个生产对象都应由人工直接编辑 YAML。

```text
代码/配置变更 -> 评审与构建 -> 不可变制品 -> 环境期望仓库
       -> GitOps 控制器 -> Kubernetes API -> 工作负载状态与告警
```

需要明确：

- 源码仓库、制品仓库和环境仓库各自保存什么。
- Secret 使用加密文件、外部密钥引用还是运行时注入。
- 紧急变更会被自动回滚、暂时忽略还是反向提交到 Git。
- 生成后的 YAML、Helm values、CRD 和控制器版本如何一起晋级。
- Git 不可用时现有工作负载是否继续运行，恢复后如何处理积压变更。

## 策略、安全与供应链

策略可以出现在构建、Registry、Admission 和运行时多个位置。越靠近 API 同步写路径，阻断能力越强，故障影响也越大。

| 层级 | 典型检查 | 适合发现的问题 |
| --- | --- | --- |
| CI | 单元测试、SBOM、漏洞和配置扫描 | 源码与制品缺陷 |
| Registry | 签名、摘要、准入标记 | 未授权或不可追踪制品 |
| Admission | CEL、ValidatingAdmissionPolicy、Webhook | 不符合集群规则的对象 |
| Runtime | NetworkPolicy、seccomp、运行时检测 | 实际通信和进程异常 |

优先使用内置、声明式、低延迟的策略机制。确实需要 Webhook 时，限制匹配范围、设置短超时和高可用，避免依赖环，并为 `failurePolicy` 的开放或阻断选择准备风险说明。

## 选型记录模板

每个候选组件至少记录：

1. 当前问题和可量化成功指标。
2. 内置能力和较简单方案为什么不够。
3. 同步路径、异步控制面和节点数据面的故障范围。
4. 版本、CRD、Webhook、内核或外部 API 依赖。
5. 指标、日志、状态和演练能否证明恢复。
6. 灰度、双跑、停止条件和退出路径。
7. 升级、证书、容量、值班和迁移的长期负责人。
