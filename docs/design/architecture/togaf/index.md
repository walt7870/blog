# TOGAF 架构框架概述

## 引言

TOGAF（The Open Group Architecture Framework）是一个企业架构框架与方法论，为组织构建、治理和管理企业级架构提供通用语言、结构化方法和最佳实践。它广泛应用于企业数字化转型、IT与业务对齐、复杂系统治理等场景。

TOGAF 不是某个技术栈，也不是一组固定模板。它更像一套“把复杂企业变化讲清楚、拆清楚、治理清楚”的工作方法：先确认业务为什么要变，再分析现状架构，定义目标架构，识别差距，形成迁移路线，最后通过治理机制保证项目实施不偏离目标。

## 阅读路径

已经具备后端系统设计经验，希望理解 TOGAF 如何贯穿业务、数据、应用、技术和迁移治理，可以先阅读 [TOGAF 深度实践：从订单重构到企业级变革](./deep-practice.md)。它使用同一个零售全渠道案例，完整推演能力热力分析、数据责任、应用边界、质量属性、Gap、过渡架构、工作包和治理证据。

本页、深度主文、问题辨析和十个专题页共同承担导读与查阅职责，覆盖架构起点、ADM、四大架构域、架构内容、差距、迁移和治理。推荐顺序如下：

| 阅读目标 | 建议入口 |
| --- | --- |
| 建立整体框架 | 本页与配套视频 |
| 理解企业架构与后端架构如何衔接 | [深度实践](./deep-practice.md) |
| 按核心问题检查概念与应用 | [核心问题与应用辨析](./core-questions.md) |
| 建立干系人和原则约束 | [干系人与架构原则](./stakeholders-principles.md) |
| 查阅 ADM 阶段 | [ADM 方法](./adm-method.md) |
| 查阅单个架构域 | 业务、数据、应用和技术架构专题 |
| 理解架构资产如何沉淀 | [架构内容与仓库](./architecture-content-repository.md) |
| 分析现状、目标和差距 | [Baseline、Target 与 Gap](./baseline-target-gap.md) |
| 设计过渡状态和路线图 | [过渡架构与迁移规划](./transition-migration-planning.md) |
| 查阅实施与变更治理 | [架构治理](./architecture-governance.md) |

## 各专题分别解决什么问题

| 专题 | 需要回答的工程问题 | 页面入口 |
| --- | --- | --- |
| 核心问题与应用辨析 | 关键概念如何连接，何时使用，如何判断是否成立 | [核心问题与应用辨析](./core-questions.md) |
| 干系人与原则 | 谁关心什么，跨项目约束如何形成并检查 | [干系人与架构原则](./stakeholders-principles.md) |
| ADM | 如何让架构工作从授权、目标、迁移走到运行反馈 | [ADM 方法](./adm-method.md) |
| 业务架构 | 企业为了实现结果，必须具备哪些能力和责任 | [业务架构](./business-architecture.md) |
| 数据架构 | 核心事实是什么，谁能改变，副本多久可信 | [数据架构](./data-architecture.md) |
| 应用架构 | 系统边界如何从能力和数据责任中推导出来 | [应用架构](./application-architecture.md) |
| 技术架构 | 业务损失如何转成容量、可靠性、安全和成本要求 | [技术架构](./technology-architecture.md) |
| 架构内容与仓库 | 决策如何形成工件、构建块并被版本化复用 | [架构内容与仓库](./architecture-content-repository.md) |
| Baseline/Target/Gap | 现状与目标如何比较并形成可执行差距 | [Baseline、Target 与 Gap](./baseline-target-gap.md) |
| 过渡架构与迁移 | 企业不停机时如何逐步转移事实和系统责任 | [过渡架构与迁移规划](./transition-migration-planning.md) |
| 架构治理 | 目标如何进入交付，偏差如何被发现并收敛 | [架构治理](./architecture-governance.md) |

## 视频讲解

配套视频系列：[TOGAF 企业架构系统课：从 ADM 到 4A 架构落地](https://www.bilibili.com/video/BV1dnKD6pEfW)。

视频用一个零售企业数字化升级案例串联 TOGAF 的核心主线，适合先建立整体理解；本文和子页面适合回查概念、方法步骤和架构工件。

| 分P | 主题 | 对应文章 |
| --- | --- | --- |
| P01 | TOGAF 到底解决什么问题 | 本页：框架定位与企业复杂性 |
| P02 | ADM 是 TOGAF 的主引擎 | [ADM 方法](./adm-method.md) |
| P03 | 业务架构，把战略翻译成能力 | [业务架构](./business-architecture.md) |
| P04 | 数据架构，让企业核心事实可信 | [数据架构](./data-architecture.md) |
| P05 | 应用架构，定义系统边界和协作方式 | [应用架构](./application-architecture.md) |
| P06 | 技术架构，支撑稳定、扩展和安全 | [技术架构](./technology-architecture.md) |
| P07 | 架构产物和架构仓库 | [架构内容与仓库](./architecture-content-repository.md) |
| P08 | Baseline、Target 和 Gap Analysis | [Baseline、Target 与 Gap](./baseline-target-gap.md) |
| P09 | 迁移路线和实施治理 | [过渡架构与迁移规划](./transition-migration-planning.md) |
| P10 | 完整案例复盘 | [深度实践](./deep-practice.md) |
| P11 | 四大架构深度解析 | [深度实践](./deep-practice.md) |

## TOGAF 的核心组成

- 架构开发方法（ADM）：从愿景到实施治理的完整方法论
- 架构内容框架：标准化的工件、模型与交付物
- 企业连续体与资源库：重用与参考的组织方式
- 架构能力框架：确保组织具备持续架构能力的组织与流程

这几部分的关系可以这样理解：ADM 是工作流程，内容框架告诉你每一步需要产出什么，企业连续体和架构仓库负责沉淀可复用资产，架构能力框架负责组织、角色、流程和治理机制。

## 四大架构域（Architecture Domains）

- 业务架构（Business Architecture）
- 数据架构（Data Architecture）
- 应用架构（Application Architecture）
- 技术架构（Technology Architecture）

这四个领域常被称为 4A 架构域。它们不是并列写四份文档，而是从不同视角描述同一次企业变化。

| 架构域 | 关注问题 | 典型产物 | 零售数字化例子 |
| --- | --- | --- | --- |
| 业务架构 | 企业要实现什么能力、流程和价值 | 能力地图、价值流、业务流程、组织职责 | 从“门店销售”扩展到“全渠道会员运营、统一订单、统一履约” |
| 数据架构 | 企业核心事实是什么，谁负责，如何流动 | 数据域、主数据、数据标准、数据血缘 | 统一会员、商品、订单、库存口径，避免各系统各算各的 |
| 应用架构 | 哪些系统承载哪些能力，边界如何划分 | 应用地图、系统职责、接口契约、集成关系 | 商城、会员中心、订单中心、库存中心、物流系统各司其职 |
| 技术架构 | 运行底座如何保证性能、稳定、安全和扩展 | 技术标准、平台能力、容量方案、安全与观测 | 大促下单链路用网关、限流、缓存、消息队列、监控告警支撑 |

## ADM（Architecture Development Method）概览

1. 初始阶段（Preliminary）
2. 架构愿景（Phase A）
3. 业务架构（Phase B）
4. 信息系统架构（Phase C：数据与应用）
5. 技术架构（Phase D）
6. 机会与解决方案（Phase E）
7. 迁移规划（Phase F）
8. 实施治理（Phase G）
9. 架构变更管理（Phase H）
10. 需求管理（Requirements Management，贯穿全流程）

ADM 的关键不是机械走完阶段，而是形成一个可治理的闭环。每一轮架构工作都应回答五个问题：

- 当前企业架构现状是什么，也就是 Baseline Architecture。
- 目标业务和技术状态是什么，也就是 Target Architecture。
- 现状和目标之间有哪些差距，也就是 Gap Analysis。
- 哪些差距要合并成工作包、项目或过渡架构。
- 实施过程中如何评审、度量、例外处理和持续变更。

## Baseline、Target 与 Gap

企业架构真正落地时，最重要的不是画一张漂亮目标图，而是把现状、目标和差距说清楚。

| 概念 | 说明 | 例子 |
| --- | --- | --- |
| Baseline Architecture | 当前业务、数据、应用、技术的实际状态 | 门店系统、商城系统和会员系统分别维护会员信息 |
| Target Architecture | 希望达到的目标架构状态 | 建立统一会员中心，沉淀统一会员标识、等级、权益和触达记录 |
| Gap Analysis | 从现状到目标缺什么、改什么、迁移什么 | 数据清洗、接口改造、旧系统适配、权限收敛、报表口径迁移 |

Gap 不应只写成“系统需要改造”。更好的写法是拆成可执行项：数据对象要统一、应用边界要重划、接口要标准化、存量数据要迁移、权限和审计要补齐、项目依赖要排序。

## 端到端案例

假设一家零售企业要做全渠道数字化升级，TOGAF 的工作路径可以这样展开：

1. 在 Preliminary 阶段建立架构原则：客户体验优先、核心数据统一、能力复用优先、系统分层治理。
2. 在 Phase A 定义架构愿景：从门店为中心转向会员、商品、订单、库存统一运营。
3. 在业务架构中识别会员运营、商品管理、订单履约、库存协同、售后服务等核心能力。
4. 在数据架构中统一会员、商品、订单、库存等核心数据对象和口径。
5. 在应用架构中明确商城、会员中心、订单中心、库存中心、物流系统的职责边界。
6. 在技术架构中设计高并发下单、缓存、消息队列、数据库、监控、安全和灾备能力。
7. 在机会与解决方案阶段把目标拆成统一会员、订单中心、库存联动、数据分析等工作包。
8. 在迁移规划中定义过渡架构，避免一次性推倒重来。
9. 在实施治理中通过架构评审、标准检查、例外管理和变更反馈控制偏差。

## 文档导航

- [TOGAF 深度实践](./deep-practice.md)
- [核心问题与应用辨析](./core-questions.md)
- [干系人与架构原则](./stakeholders-principles.md)
- [ADM 方法](./adm-method.md)
- [业务架构](./business-architecture.md)
- [数据架构](./data-architecture.md)
- [应用架构](./application-architecture.md)
- [技术架构](./technology-architecture.md)
- [架构内容与仓库](./architecture-content-repository.md)
- [Baseline、Target 与 Gap](./baseline-target-gap.md)
- [过渡架构与迁移规划](./transition-migration-planning.md)
- [架构治理](./architecture-governance.md)

## 适用价值

- 对齐业务目标与技术实现
- 降低复杂度，提升可重复性与治理能力
- 支持跨部门协作与沟通
- 促进资产重用与标准化
- 把架构从一次性方案沉淀为可复用、可追踪、可演进的组织能力

## 总结

TOGAF 为企业级架构提供了系统化的方法与语言。学习 TOGAF 时，不要停留在名词层面，而要抓住“战略目标 -> 业务能力 -> 数据事实 -> 应用边界 -> 技术底座 -> 迁移治理”这条主线。结合组织实际环境进行裁剪与落地，才是发挥其价值的关键。
