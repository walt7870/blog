# Git 从原理到协作视频系列

《Git 从原理到协作》共 18 集，按“底层模型、日常操作、团队协作、仓库治理、故障恢复”组织。视频负责建立直观链路，文档提供可复制命令、判断标准和排查闭环。

## 学习路线

| 阶段 | 集数 | 目标 | 配套文档 |
| --- | --- | --- | --- |
| 建立模型 | EP01–EP03 | 理解快照、对象、引用、工作区和暂存区 | [核心概念](./concepts.md)、[基础命令](./git.md) |
| 安全修改历史 | EP04–EP07 | 掌握分支、合并、Rebase 和恢复边界 | [分支与合并](./branching.md)、[撤销与恢复](./recovery.md) |
| 团队与发布 | EP08–EP10 | 理解远程引用、协作流程和版本追踪 | [协作流程](./workflow.md)、[进阶操作](./advanced.md) |
| 存储与仓库架构 | EP11–EP13 | 处理对象库、大仓库和代码组织 | [对象库与大型仓库](./internals-large-repositories.md)、[仓库组织策略](./repository-strategies.md) |
| 排障与交付 | EP14–EP18 | 建立定位、安全、CI/CD 和恢复能力 | [安全与治理](./security.md)、[生态工具](./ecosystem.md) |

## 全部视频

| 集数 | 主题 | 视频 | 深入阅读 |
| --- | --- | --- | --- |
| EP01 | Git 是什么：代码历史如何被保存与协作 | [B站](https://www.bilibili.com/video/BV1esN96WEY4) | [Git 总览](./index.md)、[核心概念](./concepts.md) |
| EP02 | 安装、配置与第一个仓库 | [B站](https://www.bilibili.com/video/BV1RpN96REGk) | [基础命令](./git.md) |
| EP03 | 暂存区、差异与提交边界 | [B站](https://www.bilibili.com/video/BV1LEN96tE4c) | [核心概念](./concepts.md)、[基础命令](./git.md) |
| EP04 | 分支、切换、Stash 与 Worktree | [B站](https://www.bilibili.com/video/BV1iEN96tE9h) | [分支与合并](./branching.md)、[进阶操作](./advanced.md) |
| EP05 | Merge、三方合并与冲突处理 | [B站](https://www.bilibili.com/video/BV1jjN96fEKR) | [分支与合并](./branching.md) |
| EP06 | Rebase、Cherry-pick 与历史整理 | [B站](https://www.bilibili.com/video/BV1BjN96fEM8) | [分支与合并](./branching.md) |
| EP07 | 撤销、恢复与 Reflog | [B站](https://www.bilibili.com/video/BV1ayNX6DEe3) | [撤销与恢复](./recovery.md) |
| EP08 | Remote、Fetch、Pull、Push 与 Refspec | [B站](https://www.bilibili.com/video/BV1GyNX6QEh4) | [基础命令](./git.md)、[核心概念](./concepts.md) |
| EP09 | 团队分支、评审与主干协作 | [B站](https://www.bilibili.com/video/BV1YyNX6DEBk) | [协作流程](./workflow.md)、[提交规范](./conventions.md) |
| EP10 | Tag、语义版本与发布追踪 | [B站](https://www.bilibili.com/video/BV1eCNX6HELV) | [进阶操作](./advanced.md)、[协作流程](./workflow.md) |
| EP11 | 对象存储、Packfile 与仓库维护 | [B站](https://www.bilibili.com/video/BV1eCNX6HEWM) | [对象库与大型仓库](./internals-large-repositories.md) |
| EP12 | 大型仓库、Sparse、Partial Clone 与 LFS | [B站](https://www.bilibili.com/video/BV1amNX6SE2f) | [对象库与大型仓库](./internals-large-repositories.md)、[安全与治理](./security.md) |
| EP13 | Submodule、Subtree 与 Monorepo | [B站](https://www.bilibili.com/video/BV1QmNX6UEkQ) | [仓库组织策略](./repository-strategies.md) |
| EP14 | Log、Blame、Bisect 与故障定位 | [B站](https://www.bilibili.com/video/BV13mNX6SEo2) | [进阶操作](./advanced.md) |
| EP15 | 签名、凭据、Hooks 与仓库安全 | [B站](https://www.bilibili.com/video/BV1a2NX6JE1w) | [安全与治理](./security.md)、[生态工具](./ecosystem.md) |
| EP16 | Git 与 CI/CD 自动化发布 | [B站](https://www.bilibili.com/video/BV1h2NX6JEmw) | [生态工具](./ecosystem.md)、[协作流程](./workflow.md) |
| EP17 | 仓库损坏、误删与灾难恢复 | [B站](https://www.bilibili.com/video/BV1iBNX6REsg) | [撤销与恢复](./recovery.md)、[对象库与大型仓库](./internals-large-repositories.md) |
| EP18 | 完整项目协作与故障恢复实战 | [B站](https://www.bilibili.com/video/BV1RBNX6RE8C) | [协作流程](./workflow.md)、[安全与治理](./security.md) |

## 能力验证清单

完成这套路线后，应能独立完成：

- 解释工作区、暂存区、提交对象、分支和远程跟踪引用之间的关系。
- 把混合修改拆成多个意图清晰的提交。
- 判断 Merge、Rebase、Cherry-pick 和 Revert 的适用边界。
- 使用 Fetch、Refspec 和 Ahead/Behind 信息解释远程同步状态。
- 为团队设计分支、评审、CI、Tag 和发布追踪流程。
- 分析仓库增长来自文件数量、历史、Blob 还是引用规模。
- 在 Submodule、Subtree、Monorepo、多仓库和制品依赖之间做选择。
- 使用 Log、Blame、Bisect、Reflog 和 Fsck 定位问题并保护现场。
- 处理密钥泄露、大文件误提交、对象损坏和远端不可用等故障。
