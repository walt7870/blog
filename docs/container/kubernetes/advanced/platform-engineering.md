---
title: 从 Kubernetes 集群到平台工程
author: Walt
date: 2026-07-18
---

# 从 Kubernetes 集群到平台工程

内部开发平台不是给 `kubectl` 套一层表单。它应把开发者反复完成的任务抽象成稳定意图，自动组合交付、入口、策略、观测和运行时能力，并用可理解的状态反馈结果。平台的价值来自减少认知和协调成本，而不是隐藏所有 Kubernetes 细节。

![Kubernetes 平台能力分层](/container/kubernetes-platform-layers.svg)

## 从开发者任务定义平台 API

开发者通常关心“发布一个可访问、可观测、可扩缩的订单服务”，而不是填写 Deployment、Service、HPA、Gateway 和监控规则的全部字段。平台 API 应围绕稳定任务设计，例如：

```yaml
apiVersion: platform.example.com/v1alpha1
kind: Application
metadata:
  name: order-api
  namespace: orders
spec:
  image: registry.example.com/order-api@sha256:...
  port: 8080
  exposure: internal
  availability: standard
  scaling:
    minReplicas: 3
    maxReplicas: 20
```

`availability: standard` 应由平台映射为经过验证的副本、拓扑、PDB、探针和发布策略，而不是让每个团队复制同一组 YAML。平台仍要保留受控的逃生舱口，用于确实超出标准模型的服务。

## 平台控制链

| 层级 | 负责内容 | 不应承担的内容 |
| --- | --- | --- |
| 开发者接口 | 稳定意图、模板、文档和状态 | 暴露所有底层实现字段 |
| 平台 API/Controller | 默认值、策略、资源组合和反馈 | 替应用做业务容错 |
| GitOps/交付 | 变更审计、环境晋级和恢复来源 | 替运行时控制器管理外部生命周期 |
| Kubernetes/云资源 | 调度、网络、存储和基础设施 | 定义开发者产品体验 |
| 可观测与支持 | SLO、证据关联、告警和支持流程 | 只显示一个无解释的绿色图标 |

Crossplane Composition 或自研 Operator 可以把平台资源展开为 Kubernetes 与云资源；Cluster API 负责声明式集群生命周期；多集群 Fleet 系统负责放置和策略传播。它们解决的层级不同，不能互相替代。

Crossplane 用 XRD 定义组合资源 API，用 Composition 把一个平台意图展开成多个 Kubernetes 或云资源；函数流水线根据观察状态和期望状态计算组合结果。它适合基础设施组合，但平台仍要负责 API 版本、凭据边界、删除策略和恢复来源。

Cluster API 在管理集群中运行 Provider，通过 Cluster、Machine、MachineDeployment 等 CR 管理工作负载集群和节点基础设施。管理集群因此成为关键控制面：其备份、Provider 兼容和凭据故障会影响后续集群生命周期，即使现有工作负载集群暂时仍在运行。

多集群平台还要分开三类状态：平台意图是否被接受、目标集群是否完成放置、每个集群内的工作负载是否健康。把它们压成一个 Ready 会掩盖部分区域失败和配置传播延迟。

## 把状态变成产品反馈

平台不能只把下级对象的 Ready 布尔值原样上抛。它应把用户能行动的状态组织成 Conditions，例如：

| Condition | 含义 | 用户可执行动作 |
| --- | --- | --- |
| `Accepted` | 平台已接受且理解请求 | 修正不支持的字段或策略冲突 |
| `DependenciesReady` | Registry、Secret、数据库等依赖可用 | 补凭据、配额或依赖资源 |
| `Progressing` | 发布或基础设施动作正在进行 | 查看当前阶段和预计超时 |
| `Ready` | 当前 generation 已满足服务条件 | 对照 SLO 继续验证业务 |
| `Degraded` | 仍提供部分能力但已偏离目标 | 查看影响范围和恢复主体 |

状态要带 `observedGeneration`、稳定 Reason、时间和关联下级资源。用户看到失败时，应知道卡在哪一层、由谁恢复，而不是被迫逐个读取内部 CRD。

## 平台 SLO

平台 SLO 应覆盖控制面和用户结果：

- 平台 API 请求可用性与延迟。
- 从提交到资源被接受、开始调谐和最终 Ready 的时间。
- 控制器最长未收敛对象、队列深度和失败率。
- 发布、扩缩容、证书、DNS 和云资源动作成功率。
- 平台故障是否影响已有工作负载，恢复后是否能自动收敛。

“页面可以打开”不代表平台可用。真实验收应从开发者提交一个服务开始，直到入口、观测和回滚都完成。

## 租户、护栏和例外

安全默认值应内建在平台模板和策略中，例如非 root、资源请求、镜像摘要、最小权限、网络边界和审计标签。护栏必须配套可解释错误和例外流程，否则团队会绕过平台。

平台 API 一旦开放就是兼容契约。字段废弃、默认值变化和底层组件替换都要通过版本、迁移和观测完成，不能要求所有租户在同一天理解底层实现变化。

## 判断平台是否值得建设

适合平台化的信号：

- 多个团队重复组合相同基础设施，并反复犯同类错误。
- 组织已经能稳定运营 Kubernetes、网络、存储和观测底座。
- 有明确的开发者任务、产品负责人和支持责任。
- 能用交付时间、故障率、认知成本或合规证据衡量收益。

不适合的信号：

- 只有少量服务，现有模板和流水线已经足够。
- 底层能力本身不稳定，平台只是把错误藏到更深一层。
- 没有团队负责升级、值班、文档和迁移。
- 平台 API 只是逐字段复制 Kubernetes API，没有形成稳定意图。

平台建设应从一条高频开发者旅程开始，先证明端到端收益，再扩展能力目录。

## 官方资料

- [Crossplane Compositions](https://docs.crossplane.io/latest/composition/compositions/)
- [Cluster API Concepts](https://cluster-api.sigs.k8s.io/user/concepts)
