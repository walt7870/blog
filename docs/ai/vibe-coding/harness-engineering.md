# Harness 工程：规格的强制执行体系

## 定义

Harness 工程是为 AI Agent 建立的规则、约束、隔离、检查和回滚的完整体系。

让 AI 在规格框架内安全、可控、可测地工作。

## 为什么需要 Harness

### 没有 Harness 的风险

```
Agent 很快，改代码很快，但问题也很快：

1. Agent 改错了
   ├─ 没有 CI 检查 → 坏代码直接上线
   └─ 用户被影响

2. Agent 改对了，但改太多了
   ├─ 改了不该改的文件
   ├─ 关联影响未知
   └─ 崩溃不可追踪

3. Agent 改了敏感操作
   ├─ 没有人工确认
   ├─ 数据库直接删了
   └─ 无法恢复

4. Agent 一直改不对
   ├─ 没有回滚机制
   ├─ 修复成本越来越高
   └─ 最后推倒重来
```

快的 Agent 需要更强的控制，不是更弱的控制。

## Harness 的五个核心部分

### 1. 仓库说明和禁区

明确告诉 Agent 这个项目是什么、怎么组织、哪些不能改。

```
项目根目录 CLAUDE.md 或 .claude/instructions.md：

# 项目概览
- 名字：订单管理系统
- 技术栈：Node.js + Express + PostgreSQL + React
- 目的：管理和追踪 B2B 订单

# 代码结构
src/
  api/          # Express 路由和中间件
  services/     # 业务逻辑
  models/       # 数据库模型
  utils/        # 工具函数
  migrations/   # 数据库迁移

# 核心命令
npm run dev       # 开发服务器
npm run test      # 运行测试
npm run build     # 生产构建

# 禁区（不能改）
❌ src/middleware/auth.js - 认证中间件，涉及整个系统的安全
❌ package.json 的 dependencies - 版本经过充分测试
❌ database.yml - 生产数据库连接（本地用 SQLite）
❌ .env - 生产环境变量不能改

# 限制和约束
⚠ 新增数据库字段需要写迁移脚本，不能直接改 schema
⚠ 涉及权限和支付的改动需要人工 review
⚠ 第三方库升级需要评估兼容性
⚠ 生产配置改动需要核实与运维沟通

# 团队规范
- 提交信息格式：feat(feature): description 或 fix(module): description
- 单元测试覆盖率要求：>=80%
- 破坏性改动要在 commit message 中标注
```

Agent 看到这些信息后，就知道自己的边界。

### 2. 可执行的检查和验证

让 Agent 在改完后能自动验证改对了。

```bash
# 类型检查
npm run type-check
# 失败意味着有类型错误，不能提交

# 代码风格
npm run lint
# 失败意味着不符合团队规范

# 单元测试
npm run test
# 失败意味着逻辑有问题或破坏了现有功能

# 集成测试
npm run test:integration
# 失败意味着跨模块的交互有问题

# 构建检查
npm run build
# 失败意味着构建有问题，肯定无法上线

# 安全扫描
npm run security-check
# 失败意味着引入了已知漏洞
```

这些检查都要在 CI 上自动运行，Agent 也要全部通过。

### 3. 隔离环境

Agent 改代码时不能直接改 main 分支，要在隔离的环境工作。

```
工作流：

main 分支（生产）
  ↓
  ├─ Agent 创建新分支：feature/order-export
  │  （这是隔离环境，不影响 main）
  │
  ├─ Agent 在新分支上改代码
  ├─ Agent 提交到新分支
  ├─ CI 自动检查新分支
  │
  └─ 如果检查全部通过，才能 merge 到 main
     如果失败，Agent 在同分支继续修改
     
修复流程（出现问题的应急）：
main（出问题了）
  ├─ 快速 revert → 恢复到上一个稳定版本
  └─ 创建新分支修复根因
```

分支隔离确保 main 永远是稳定的。

### 4. 可观测性和日志

所有 Agent 的操作都要有记录，出问题时能追踪。

```
记录内容：

✓ 改了哪些文件（git diff）
✓ 提交了什么（commit message）
✓ 运行了哪些命令（命令列表和输出）
✓ 测试结果（哪些通过、哪些失败）
✓ 耗时和资源使用
✓ 任何警告和错误信息
✓ Agent 的决策日志（为什么选择这样改）

例：
---
Agent 操作日志 - 2025-05-23 10:15:00
任务：添加订单导出功能

步骤 1：理解需求
  ├─ 读取 src/models/Order.js（285 行）
  ├─ 读取 src/api/orders.js（412 行）
  └─ 分析完成 ✓

步骤 2：实现
  ├─ 创建 src/services/export.js（94 行新增）
  ├─ 修改 src/api/orders.js（添加 /export 端点）
  ├─ 创建 test/export.test.js（12 个测试）
  └─ 实现完成 ✓

步骤 3：验证
  ├─ 运行 npm run type-check → 0 errors ✓
  ├─ 运行 npm run lint → 0 warnings ✓
  ├─ 运行 npm run test → 187/187 passed ✓
  ├─ 运行 npm run build → success ✓
  └─ 验证完成 ✓

步骤 4：提交
  ├─ 分支：feature/order-export
  ├─ 3 个 commits
  ├─ 共 106 行改动
  └─ 提交完成 ✓

结论：✓ 任务完成，所有检查通过，等待人工 review
---

这份日志对于排查问题非常关键。
```

### 5. 人工确认点和回滚机制

对于高风险操作，Agent 不能自动执行，要人工确认。

```
高风险操作清单：

❌ 需要人工确认的操作
- 删除数据库表或字段
- 修改权限系统
- 修改支付逻辑
- 修改加密或数据安全相关代码
- 新增第三方依赖（需要审计）
- 修改生产部署配置

Agent 遇到这些操作时的行为：

Agent 制定计划：
"为了完成这个功能，我需要：
1. 新增 orders 表的 exported_at 字段
2. 新增导出日志表
3. 调用第三方的 export-service 库

其中，操作 1 和 2 需要人工确认（涉及数据库结构改动）。
请确认是否继续？"

人工审核：
☐ 数据库改动是否合理？
☐ 迁移脚本是否安全（有回滚吗）？
☐ 有备份吗？

确认：
"✓ 已确认，可以继续"
或
"✗ 拒绝，请改用其他方案"

回滚机制：
如果改动上线后出问题，能快速回滚：

git revert <commit>  # 撤销这个改动
或
git reset --hard <tag>  # 回到某个已知稳定的版本

且数据库有备份可以恢复。
```

## Harness 的三个层级

### L1：个人项目 Harness（轻量）

```
文件清单：
✓ README.md with 核心命令
✓ .gitignore 配置
✓ 基础的 npm scripts (test, build)

用途：个人实验项目，但也要有最小规范。
```

### L2：小团队 Harness（中等）

```
文件清单：
✓ CLAUDE.md 或 .claude/instructions.md
✓ 完整的 CI/CD（GitHub Actions、GitLab CI 等）
✓ Pre-commit hooks（本地检查）
✓ 单元测试和集成测试
✓ 分支保护规则（main 不能直接 push）
✓ PR review 流程

工具：
✓ Conventional Commits（规范化 commit message）
✓ SonarQube 或类似工具（代码质量扫描）
✓ Dependabot（依赖安全扫描）
```

### L3：大型系统 Harness（完整）

```
文件清单：
✓ 完整的文档（架构、API、约束、风险）
✓ 企业级 CI/CD
✓ 多环境部署管理（dev / staging / prod）
✓ 全面的自动化测试（单元 + 集成 + E2E）
✓ 性能和安全检查
✓ 监控和告警
✓ 审计日志
✓ 灾难恢复计划

工具：
✓ ArgoCD 或 Flux（GitOps）
✓ Datadog / New Relic（监控）
✓ Vault（密钥管理）
✓ 完整的 compliance 检查（审计要求）
```

## Harness 工程中的 Spec-Driven

规格如何驱动 Harness：

### 1. 规格即验收准则

```
功能规格：
"订单导出功能必须：
- 支持 CSV 和 Excel 格式
- 导出后文件自动下载
- 导出数据不能包含用户隐私信息
- 导出操作要有日志记录"

Harness 中的验收命令：
npm run test -- order-export.test.js
// 这个测试覆盖所有上述要求

Agent 改完后必须通过这个测试。
```

### 2. 规格定义 CI 检查

```
规格要求代码质量：
"所有改动必须通过 TypeScript 类型检查，
测试覆盖率不能下降，
不能引入已知安全漏洞。"

Harness CI：
npm run type-check  # TypeScript 检查
npm run test        # 测试覆盖率检查
npm audit          # 安全漏洞检查

全部通过才能合并。
```

### 3. 规格定义禁区

```
规格说：
"不能改权限系统，因为涉及整个应用的安全。"

Harness 禁区：
src/middleware/auth.js  # Agent 不能改

如果 Agent 的改动影响了这个文件，
CI 会报错，Agent 需要重新设计方案。
```

## 常见的 Harness 配置

### .github/workflows/ci.yml

```yaml
name: CI

on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      
      # 类型检查
      - run: npm run type-check
      
      # 代码风格
      - run: npm run lint
      
      # 单元测试
      - run: npm run test
      
      # 构建
      - run: npm run build
      
      # 安全扫描
      - run: npm audit

  # 可选：部署到测试环境验证
  deploy-test:
    needs: check
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run build
      - run: deploy-to-staging.sh
```

### .claude/instructions.md

```markdown
# 这个项目的 Harness

## 快速开始
npm run dev

## 验证改动
npm run type-check && npm run lint && npm run test && npm run build

## 禁区（不能改）
- src/middleware/auth.js
- package.json dependencies（除非必要）
- src/config/production.js

## 高风险操作需要人工确认
- 数据库 schema 改动
- 权限逻辑修改
- 第三方库升级

## 分支策略
- main：生产分支，必须稳定
- develop：开发分支
- feature/*：功能分支
- hotfix/*：紧急修复

## 提交规范
feat(order): 新增订单导出功能
fix(auth): 修复登录超时问题
refactor(api): 简化 API 响应处理
test(order): 补充订单导出测试
```

## 实践建议

### 对个人

1. **即使一个人写代码，也要有 CI 检查**。这样 AI 改代码时才有标准。
2. **核心命令一定要文档化**。"npm test" 必须清楚地工作。
3. **分支保护规则不要太松**。至少要求 CI 通过。
4. **定期审计 Harness 规则**。删掉过时的限制，补充新的风险点。

### 对团队

1. **把 Harness 作为团队规范的真实来源**。优于口头说教。
2. **定期演练回滚流程**。确保真的出问题时能快速恢复。
3. **监控 Agent 违反 Harness 的情况**。是规则不对还是 Agent 理解有问题。
4. **给 Agent 反馈**。"这次违反了禁区"，让 Agent 学到。

## Harness 的局限

### ✓ Harness 能防止的风险

- 低级错误（类型错误、语法错误）
- 无法编译或运行的代码
- 破坏现有功能的改动
- 安全漏洞（已知的）

### ❌ Harness 无法防止的风险

- 算法错误（逻辑上对，但不符合业务要求）
- 性能问题（能编译和运行，但太慢）
- 用户体验问题（功能对，但用户不爱用）
- 架构问题（代码对，但系统设计有缺陷）

这些需要人工 review。

## 总结

Harness 工程是 Agent 工程的"安全网"。

没有 Harness，AI 很快就会出事。有了 Harness，AI 能在安全边界内快速工作，风险降到可接受的水平。

Harness 不是反对 AI 快速工作，而是**让快速工作变成可持续的快速工作**。

→ [下一步：组织流程工程](./organizational-engineering.md)
