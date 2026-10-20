<script setup>
import { withBase } from 'vitepress'
</script>

# AI 编程深度系列

AI 编程已经从代码补全发展到能够搜索仓库、修改文件、运行命令、调用外部工具并提交可审查结果的 Coding Agent。能力边界扩大后，真正需要掌握的不再只是 Prompt，而是任务契约、上下文、工具、验证、安全和团队治理组成的完整工程系统。

本系列面向有 Git、测试和团队开发经验的职业开发者，共 14 篇。内容从 Agent 的工作机制和 2026 年工具生态开始，逐步进入任务契约、Context Engineering、仓库规则、MCP，再通过一个 Spring Boot 订单服务完成 Brownfield 修改，最后讨论 Cloud Agent、多 Agent、安全治理和提效证据。

![从任务、工具执行到验证与停止条件的工程闭环](/ai/agent-verification-loop.svg)

## 阅读路线

第一次系统学习，建议按 01 到 14 的顺序阅读。前八篇建立心智模型和基础设施，09 到 11 是连续实战，最后三篇处理规模化采用后的并发、安全和度量问题。

如果正在给团队落地 Coding Agent，可以先读 05、06、07、11、13：它们分别解决任务怎样交代、事实怎样进入上下文、仓库规则怎样维护、结果怎样验证以及权限怎样治理。

如果准备做 Brownfield 改造，可以从 09 开始连续阅读三篇实战。<a :href="withBase('/ai/examples/coding-order-lab.zip')" download>下载订单实战源码</a>后，从只支持创建的基线加入取消合同，观察红灯，再比较最终实现并重跑测试和 HTTP。源码包含基线与最终两份快照，不需要额外仓库或历史标签。

## 系列目录

| 篇目 | 主题 | 解决的问题 |
| --- | --- | --- |
| 01 | [任务闭环与自治边界](./01-ai-coding-agent-era.md) | 从补全、Chat 到 Agent、Cloud Agent 和 Review Agent，怎样判断自治边界 |
| 02 | [Coding Agent 到底怎样工作](./02-coding-agent-internals.md) | Model、Harness、Instructions、Tools、Context 和 Feedback 如何构成执行循环 |
| 03 | [AI 编程工具的工作流选型](./03-ai-coding-tool-landscape-2026.md) | 怎样按代码位置、工具反馈、权限与交付能力试点评估 |
| 04 | [Vibe、Agentic 与 Spec-Driven](./04-vibe-agentic-spec-driven.md) | 三种方法分别适合什么任务，怎样从原型进入生产门禁 |
| 05 | [Agent 可执行的任务契约](./05-executable-task-contract.md) | 怎样把目标、范围、约束、验收和交付物写成可执行任务 |
| 06 | [Context Engineering](./06-context-engineering.md) | 怎样管理检索、渐进加载、压缩、污染、失效和上下文成本 |
| 07 | [AGENTS.md、Rules、Skills 与 Hooks](./07-agents-rules-skills-hooks.md) | 仓库指令、作用域、能力封装和确定性门禁怎样分工 |
| 08 | [MCP 与 Agent 工具工程](./08-mcp-agent-tool-engineering.md) | Client、Server、Tools、Resources、授权和信任边界怎样设计 |
| 09 | [Brownfield 实战一：先理解，再修改](./09-brownfield-understand-before-edit.md) | 怎样建立基线、仓库地图、调用链、状态模型和实施计划 |
| 10 | [Brownfield 实战二：测试驱动修改](./10-brownfield-test-driven-agent-change.md) | 怎样用失败测试驱动领域状态、实现和根因修正 |
| 11 | [Brownfield 实战三：验证与交付](./11-brownfield-verification-review-delivery.md) | 怎样审查 Diff、识别假测试并形成可追责交付证据 |
| 12 | [Cloud Agent、Worktree 与多 Agent](./12-cloud-agent-worktree-multi-agent.md) | 怎样拆任务、并发、隔离分支、控制冲突和计算总成本 |
| 13 | [AI 编程安全与团队治理](./13-ai-coding-security-governance.md) | 沙箱、Shell、Secrets、Prompt Injection、供应链和审计怎样落地 |
| 14 | [AI 编程到底有没有提效](./14-does-ai-coding-improve-productivity.md) | 怎样理解不同研究结论，并用团队试点测量净交付收益 |

## 贯穿实战

实战使用一个独立 Spring Boot 订单教学服务：在不引入数据库的前提下新增取消订单接口，要求首次取消成功、重复取消幂等、订单不存在返回 `404`、已支付订单返回 `409`。需求同时触及领域状态、Repository、Service、Controller、异常映射、单元测试和 MockMvc Web 集成测试，用来练习旧代码库中的探索与修改。

系列不把“代码生成完成”当作结束。每个实战结论都回到可观察证据：基线是否通过、失败测试是否真实失败、实现后哪些测试通过、真实 HTTP 行为是否符合契约、Diff 是否超出范围，以及哪些结论仍然没有经过远程环境验证。

## 使用边界

产品入口、模型名称、套餐、默认权限和平台能力变化较快，工具选型应以最新官方文档和组织实际环境为准。系列提供的是稳定的工程判断框架：为任务选择最低但足够的自治级别，用确定性工具验证可验证部分，把产品与架构取舍留给明确责任人，并让每一次交付都具备可复现证据和回滚路径。
