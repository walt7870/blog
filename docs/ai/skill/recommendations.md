# Skill 推荐与选型

下文整理的是 **Claude Code** 场景下常用的一批 **现成 Skill**（通过 [skills.sh](https://skills.sh) 索引、`npx skills add … -g` 安装）。思路来自「高频、真能装进生态、能抬高结果下限」的筛选标准；同类能力只保留一个主力即可，避免装一堆却很少触发。

> 装配前请自行核对仓库来源与权限；`-g` 为全局安装，团队规范若要求项目内锁定版本，可改为项目级流程并做审计。

## 装配顺序（三梯队）

| 梯队 | 建议优先 | 解决什么问题 |
| --- | --- | --- |
| 第一 | `agent-browser`、`summarize`、`find-skills` | 网页里能执行、长信息能压缩、生态里能搜到现成轮子 |
| 第二 | `skill-creator`、`tmux`、测试 / 文档 / 重构类 | 把自己的流程固化、长会话与终端可控、写测写文档更像工程实践 |
| 第三 | Git / Changelog / Research 类 | 交付链路（PR、版本说明）与调研型任务 |

## 十条：名称、用途、索引页、安装命令

以下 **skills.sh 链接** 与 **`npx skills add`** 均按公开索引页整理；若上游改名，以对应页面为准。

### 1. agent-browser

| 项 | 内容 |
| --- | --- |
| 用途 | 让助手能驱动浏览器：打开页、点击、填表、截图、抓页面信息、跑 Web 测试流程，把「网站上的事」接进工作流。 |
| 索引 | [skills.sh · vercel-labs/agent-browser](https://skills.sh/vercel-labs/agent-browser/agent-browser) |
| 安装 | `npx skills add vercel-labs/agent-browser@agent-browser -g -y` |

### 2. find-skills

| 项 | 内容 |
| --- | --- |
| 用途 | 在 skills 生态里先搜有没有现成方案，降低「重复摸索」成本；偏发现与选型入口。 |
| 索引 | [skills.sh · find-skills](https://skills.sh/vercel-labs/skills/find-skills) |
| 安装 | `npx skills add vercel-labs/skills@find-skills -g -y` |

### 3. summarize

| 项 | 内容 |
| --- | --- |
| 用途 | 压缩长网页、长文档、转录稿、会议纪要、多篇材料，稳定做「读完 → 结论」；读 RFC/issue 讨论也适用。 |
| 索引 | [skills.sh · steipete/clawdis · summarize](https://skills.sh/steipete/clawdis/summarize) |
| 安装 | `npx skills add steipete/clawdis@summarize -g -y` |

### 4. skill-creator

| 项 | 内容 |
| --- | --- |
| 用途 | 把个人或团队重复动作（提纲、格式、测试骨架、release notes 等）沉淀成可复用 Skill。 |
| 索引 | [skills.sh · anthropics · skill-creator](https://skills.sh/anthropics/skills/skill-creator) |
| 安装 | `npx skills add anthropics/skills@skill-creator -g -y` |

### 5. tmux

| 项 | 内容 |
| --- | --- |
| 用途 | 长命令、持续看日志、交互式 CLI、并行任务、远程会话不断线时，用 tmux 维持续航式终端会话。 |
| 索引 | [skills.sh · steipete/clawdis · tmux](https://skills.sh/steipete/clawdis/tmux) |
| 安装 | `npx skills add steipete/clawdis@tmux -g -y` |

### 6. 测试 / E2E / Playwright 向

| 项 | 内容 |
| --- | --- |
| 用途 | 强化测试结构、断言、边界与 Playwright 场景化写法，减少「能生成但难维护」的测试代码。 |
| 索引（示例） | [anthropics · webapp-testing](https://skills.sh/anthropics/skills/webapp-testing)、[supercent-io · testing-strategies](https://skills.sh/supercent-io/skills-template/testing-strategies) |
| 安装（其一） | `npx skills add anthropics/skills@webapp-testing -g -y` |

可按栈再在 [skills.sh](https://skills.sh) 搜 `playwright`、`e2e` 等关键词补第二条。

### 7. 文档 / README / API 文档向

| 项 | 内容 |
| --- | --- |
| 用途 | 约束文档结构，让 README、上手说明、API 说明更「有重点」而不是堆字。 |
| 索引（示例） | [googleworkspace/cli · gws-docs](https://skills.sh/googleworkspace/cli/gws-docs) |
| 安装（其一） | `npx skills add googleworkspace/cli@gws-docs -g -y` |

文档类没有单一万能包名，建议按语言/场景在索引站搜索：`api docs`、`readme`、`java docs`、`python docs` 等，选与当前仓库最贴近的一条。

### 8. 重构 / Review / 最佳实践向

| 项 | 内容 |
| --- | --- |
| 用途 | 坏味道、拆大函数、命名与复杂度控制，把「能跑」往「能长期维护」推。 |
| 索引（主） | [supercent-io · code-refactoring](https://skills.sh/supercent-io/skills-template/code-refactoring) |
| 安装（主） | `npx skills add supercent-io/skills-template@code-refactoring -g -y` |
| 备选索引 | [github · awesome-copilot · refactor](https://skills.sh/github/awesome-copilot/refactor)（安装命令请在页面内查看） |

### 9. Git 工作流 / Changelog / Release 向

| 项 | 内容 |
| --- | --- |
| 用途 | 规范 commit、整理 changelog、写 release note、PR 描述与影响范围，覆盖「开发之后那一串杂活」。 |
| 索引（主） | [supercent-io · changelog-maintenance](https://skills.sh/supercent-io/skills-template/changelog-maintenance) |
| 安装（主） | `npx skills add supercent-io/skills-template@changelog-maintenance -g -y` |
| 备选索引 | [wshobson/agents · changelog-automation](https://skills.sh/wshobson/agents/changelog-automation) |

### 10. 调研 / 网页检索 / 摘录向

| 项 | 内容 |
| --- | --- |
| 用途 | 查资料、读网页、提取与对比方案，把选型、读文档、扫 issue 讨论纳入同一套流程。 |
| 索引（主） | [tavily-ai · research](https://skills.sh/tavily-ai/skills/research) |
| 安装（主） | `npx skills add tavily-ai/skills@research -g -y` |
| 备选索引 | [199-biotechnologies · deep-research](https://skills.sh/199-biotechnologies/claude-deep-research-skill/deep-research) |

Tavily 类能力通常需要 **API Key**；使用前在对应 Skill 说明与环境变量里配置好，避免把密钥写进仓库。

---

## 通用原则（与上表配合）

1. **少而精**：同类只保留一个主力，避免触发条件重叠。
2. **可验证**：装上后至少跑通一条真实任务（例如打开指定站点、跑一条测试、产出一节 changelog）。
3. **定期裁剪**：长期不用的从全局卸载或迁出团队清单，减少噪音与攻击面。

## 维护节奏建议

- **每月**：看触发频率，合并重复条目。
- **大版本升级栈**：复查 `npx` 包名与文档是否仍有效。
- **重复失误**：优先把防再犯写进自研 Skill（配合 `skill-creator`）。

## 延伸阅读

- 索引与发现：[skills.sh](https://skills.sh)
- 原文讨论与装配思路：[Claude Code 十个最值得装的 Skills](https://mp.weixin.qq.com/s/9OOV_phsQacXQjeUF1jVug)（微信公众号）
