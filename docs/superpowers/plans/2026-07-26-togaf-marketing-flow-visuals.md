# TOGAF 营销系统流程图优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把营销系统实战的七张卡片式 SVG 重构为能清楚表达主流程、异常分支、事实责任和反馈证据的语义化流程图。

**Architecture:** 每张图采用与问题匹配的图形语法，并共享克制的颜色、字体、箭头和图例规则。SVG 保持 1440px 横向画布，文章只增加简短读图说明；移动端继续使用现有局部横向滚动样式。

**Tech Stack:** VitePress Markdown、原生 SVG、CSS、`xmllint`、Chrome/agent-browser、Node.js 构建。

---

## 文件边界

- 修改 `public/architecture/togaf/marketing-decision-chain.svg`：四层因果闭环。
- 修改 `public/architecture/togaf/marketing-value-capability-map.svg`：价值流泳道与能力热力。
- 修改 `public/architecture/togaf/marketing-data-application-boundary.svg`：事实 Owner、应用协作和分析消费。
- 修改 `public/architecture/togaf/marketing-realtime-decision-flow.svg`：带延迟和异常分支的时序图。
- 修改 `public/architecture/togaf/marketing-benefit-ledger-state.svg`：权益与预算状态机。
- 修改 `public/architecture/togaf/marketing-measurement-loop.svg`：交易事实与测量双轨闭环。
- 修改 `public/architecture/togaf/marketing-migration-roadmap.svg`：七阶段接管路线图。
- 修改 `docs/design/architecture/togaf/marketing-system-practice.md`：七处简短读图说明。
- 不修改 `.vitepress/sidebar.ts`、`.vitepress/theme/style.css` 或其他专题文件。

### Task 1: 建立 SVG 公共视觉约束

**Files:**
- Inspect: `public/architecture/togaf/marketing-*.svg`

- [ ] **Step 1: 固定画布和字体规则**

所有图使用以下根节点和字体组，允许高度在 760—860 之间按内容调整：

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="820" viewBox="0 0 1440 820" role="img" aria-labelledby="title desc">
  <title id="title">与图示一致的中文标题</title>
  <desc id="desc">说明主流程、关键分支和最终证据。</desc>
  <rect width="1440" height="820" fill="#ffffff"/>
  <g font-family="Arial, 'PingFang SC', sans-serif"></g>
</svg>
```

- [ ] **Step 2: 固定线条语义**

使用 `#334155` 实线表达同步主流程，`#0f766e` 虚线表达异步事实和反馈，`#b45309` 表达降级，`#be123c` 表达拒绝或失败。箭头文字放在独立白底标签中，避免与线条重叠。

- [ ] **Step 3: 记录图例位置**

每张图右上角只保留与该图有关的 2—4 项图例，不做全局大图例；标题区高度固定为 112px，主体从 `y=128` 开始。

### Task 2: 重构营销架构决策链

**Files:**
- Modify: `public/architecture/togaf/marketing-decision-chain.svg`

- [ ] **Step 1: 用四层闭环替换横向卡片串联**

四层从上到下固定为：

```text
业务结果：增量毛利｜护栏：预算、投诉、退订、Consent
业务能力：识别人群 → 生成决策 → 承诺权益 → 协调触达 → 观察转化
事实与责任：身份/授权 → 活动/Offer → 权益账本 → 曝光/订单 → 实验/归因
运行证据：业务结果 + 系统 SLO + 数据质量
```

右侧用“架构决策”竖向脊柱连接四层；底部从运行证据回到业务结果，标注“验证假设、调整投资和规则”。在每层左侧放置一个失败断点：目标失真、能力断裂、事实多写、证据不可解释。

- [ ] **Step 2: 验证 XML**

Run: `xmllint --noout public/architecture/togaf/marketing-decision-chain.svg`
Expected: exit code `0` and no output.

### Task 3: 重构价值流与能力热力图

**Files:**
- Modify: `public/architecture/togaf/marketing-value-capability-map.svg`

- [ ] **Step 1: 建立三条泳道**

第一泳道保留七阶段：制定策略、识别人群、生成决策、承诺权益、渠道触达、观察转化、归因学习。第二泳道对应关键事实：策略假设、Audience Snapshot、Decision、Reservation、Exposure、Order/Refund、Experiment Result。第三泳道使用 1—5 级色块展示能力成熟度。

- [ ] **Step 2: 增加三个跨阶段断点**

精确标注：

```text
人群不可重现 → 决策无法复盘
权益无共同凭证 → 成本无法对账
曝光定义不统一 → 归因失去可信输入
```

断点使用向下的红色虚线，从上游事实穿过后续阶段，体现局部缺失对整条价值流的影响。

- [ ] **Step 3: 验证 XML**

Run: `xmllint --noout public/architecture/togaf/marketing-value-capability-map.svg`
Expected: exit code `0` and no output.

### Task 4: 重构数据权威与应用边界

**Files:**
- Modify: `public/architecture/togaf/marketing-data-application-boundary.svg`

- [ ] **Step 1: 建立三层责任结构**

第一层是事实 Owner：会员与身份、Consent、营销平台、权益账本、订单支付。第二层是协作应用：画像与标签、人群计算、实时决策、促销定价、渠道网关。第三层是消费方：CDP 组合视图、实验与归因、经营看板。

- [ ] **Step 2: 区分写入、读取和禁止关系**

实线箭头只从 Owner 指向其事实；虚线箭头表示应用读取。图底部增加红色禁止回写带：

```text
CDP / 度量平台不得反向修改客户身份、Consent、权益状态和订单交易事实
```

- [ ] **Step 3: 验证 XML**

Run: `xmllint --noout public/architecture/togaf/marketing-data-application-boundary.svg`
Expected: exit code `0` and no output.

### Task 5: 重构实时营销决策时序图

**Files:**
- Modify: `public/architecture/togaf/marketing-realtime-decision-flow.svg`

- [ ] **Step 1: 保留七个参与者并显示同步延迟预算**

参与者为渠道/BFF、决策入口、身份与 Consent、特征与人群、规则裁决、权益账本、证据日志。同步主链标注目标预算：入口与身份 15ms、特征读取 20ms、规则裁决 25ms、权益预留 30ms、组装返回 10ms，整体 P95 小于 100ms。

- [ ] **Step 2: 增加四条条件分支**

```text
Consent 不允许 → 返回 CONSENT_DENIED，不进入规则裁决
画像过期但基础事实可用 → 使用保守候选并标记 degraded=true
权益或预算不足 → 返回 BENEFIT_UNAVAILABLE，不伪造成功 Offer
渠道真实展示 → 异步记录 Exposure；决策返回本身不算曝光
```

拒绝分支使用红色返回箭头，降级分支使用橙色，异步曝光使用青色虚线。

- [ ] **Step 3: 验证 XML**

Run: `xmllint --noout public/architecture/togaf/marketing-realtime-decision-flow.svg`
Expected: exit code `0` and no output.

### Task 6: 重构权益与预算账本状态机

**Files:**
- Modify: `public/architecture/togaf/marketing-benefit-ledger-state.svg`

- [ ] **Step 1: 分离正常路径和异常路径**

正常路径固定为 `AVAILABLE → RESERVED → GRANTED → REDEEMING → REDEEMED → SETTLED`。异常分支包括：RESERVED 超时到 RELEASED、GRANTED 到 EXPIRED、发放失败回到 RELEASED、REDEEMING 失败回到 GRANTED、退款后按政策进入 RETURNED 或 REVERSED。

- [ ] **Step 2: 在转换边标注守护条件**

每条关键转换使用业务凭证：`decisionId + benefitType`、`grantId`、`orderId`、`settlementId`。底部保留两条守恒式，并加入“条件写 + 状态前置校验”“Outbox 发布”“扫描补偿”“账本对账”四项实现护栏。

- [ ] **Step 3: 验证 XML**

Run: `xmllint --noout public/architecture/togaf/marketing-benefit-ledger-state.svg`
Expected: exit code `0` and no output.

### Task 7: 重构实验、归因与反馈闭环

**Files:**
- Modify: `public/architecture/togaf/marketing-measurement-loop.svg`

- [ ] **Step 1: 建立交易事实轨与测量轨**

事实轨为 `Audience Snapshot → Assignment → Decision → Exposure → Order/Payment → Refund`。测量轨从事实轨读取数据后分成漏斗、触点归因、随机实验三条路径，再汇入策略评审。

- [ ] **Step 2: 增加不可逆边界和修正回路**

在订单事实与分析结果之间放置单向边界，标注“归因只能解释交易，不能修改交易”。迟到曝光和退款通过虚线进入重算窗口，重算结果更新分析版本后再反馈策略。

- [ ] **Step 3: 验证 XML**

Run: `xmllint --noout public/architecture/togaf/marketing-measurement-loop.svg`
Expected: exit code `0` and no output.

### Task 8: 重构七阶段迁移路线图

**Files:**
- Modify: `public/architecture/togaf/marketing-migration-roadmap.svg`

- [ ] **Step 1: 建立阶段、门槛与回退三层路线**

七阶段依次为语义与 Owner 对齐、统一采集与 Consent、影子决策、低风险活动接管、权益账本接管、渠道迁移、旧写入口退出。每个阶段显示一个进入条件、一个对账指标和一个退出证据。

- [ ] **Step 2: 展示责任接管比例**

在路线图下方加入责任接管带，从“旧系统 100% 写入”逐步变化到“新平台 100% 写入”。影子阶段明确标注“只比较、不承诺权益”，灰度阶段标注“互斥分流、不长期双写”，每个阶段下方保留回退锚点。

- [ ] **Step 3: 验证 XML**

Run: `xmllint --noout public/architecture/togaf/marketing-migration-roadmap.svg`
Expected: exit code `0` and no output.

### Task 9: 补充正文读图说明

**Files:**
- Modify: `docs/design/architecture/togaf/marketing-system-practice.md:11,141,197,278,386,617,714`

- [ ] **Step 1: 在七张图后增加短说明**

分别加入以下内容，每段只解释读图顺序，不重复后续表格：

```markdown
> 读图：先从业务结果向下追到能力、事实责任和运行证据，再沿反馈线回到下一轮策略；任一层断裂，增长结论都无法被证明。

> 读图：横向是营销价值产生的顺序，纵向是每一步必须留下的事实和支撑能力；红色断点说明上游缺失会怎样污染后续决策。

> 读图：上层系统裁决业务事实，中层应用围绕事实完成决策，底层平台只消费并解释；读取关系不等于拥有反向修改权。

> 读图：黑色实线是 100ms 内的同步承诺链，红色和橙色分别表示拒绝与降级，青色虚线表示渠道展示后的异步曝光事实。

> 读图：主干描述权益从可用到结算，向下分支处理超时、失败和退款；每次转换都必须同时保持客户权益、预算和限量额度一致。

> 读图：上轨只记录发生过的交易事实，下轨分别回答过程转化、触点解释和因果增量；分析结论通过策略反馈生效，不能改写订单事实。

> 读图：迁移不是七次系统上线，而是七次责任接管；只有进入条件、对账结果、回退点和退出证据齐备，写入口才能继续向新平台移动。
```

- [ ] **Step 2: 检查标题和图片引用未变化**

Run: `rg -n "marketing-[a-z-]+\\.svg|> 读图：" docs/design/architecture/togaf/marketing-system-practice.md`
Expected: `7` image references and `7` reading notes.

### Task 10: 静态、构建与浏览器验证

**Files:**
- Verify: `public/architecture/togaf/marketing-*.svg`
- Verify: `docs/design/architecture/togaf/marketing-system-practice.md`

- [ ] **Step 1: 验证全部 SVG 与差异格式**

Run: `find public/architecture/togaf -maxdepth 1 -name 'marketing-*.svg' -print0 | xargs -0 xmllint --noout`
Expected: exit code `0` and no output.

Run: `git diff --check -- docs/design/architecture/togaf/marketing-system-practice.md public/architecture/togaf/marketing-*.svg`
Expected: exit code `0` and no output.

- [ ] **Step 2: 扫描文字边界**

在 Chrome 中对七张 SVG 逐个运行 `getBBox()`，检查所有文字位于所属容器和 `viewBox` 内，结果应为 `0` 个越界元素；箭头路径不得与标签包围盒相交。

- [ ] **Step 3: 执行完整构建**

Run: `npm run docs:build`
Expected: exit code `0`; 允许项目既有的 `ld`、`dts` 高亮回退和大分块警告。

- [ ] **Step 4: 验证桌面和移动端**

在 1440×1000 的浅色和深色主题下检查七张图完整加载、文字和线条可辨识、正文无截断、控制台无错误。在 390×844 检查页面本身不横向溢出，七张图的父容器可局部横向滚动，图中文字在 760px 渲染宽度下仍可读。

- [ ] **Step 5: 审计最终范围**

Run: `git diff --stat -- docs/design/architecture/togaf/marketing-system-practice.md public/architecture/togaf/marketing-*.svg`
Expected: 仅一篇文章和七张营销 SVG 有变化；其他用户文件保持原状。
