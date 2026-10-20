# Git 提交规范

提交规范的目标不是让历史看起来漂亮，而是让未来的人能快速判断：这次改动解决了什么问题、影响范围在哪里、能不能安全回滚。

## 提交粒度

一个提交应表达一个完整意图。

适合放在一个提交里：

- 一个 bug 修复及对应测试。
- 一个小功能的完整最小实现。
- 一次独立重构，不混入业务行为变化。
- 文档更新和相关示例调整。

不适合混在一个提交里：

- 格式化全项目代码 + 修改业务逻辑。
- 升级依赖 + 重构调用方 + 改接口行为。
- 多个无关 bug 修复。
- 临时调试代码和正式逻辑。

拆分技巧：

```bash
git add -p
git commit
```

如果最后一个提交混入了两个意图，先确认它尚未共享、没有额外未提交改动，再拆分。以下过程要求存在父提交，备份分支只保护旧提交：

```bash
git status -sb
git branch backup/before-split HEAD
git reset --mixed HEAD~1
git add -p
git diff --cached
git commit -m "fix(order): 修复导出超时判断"
git add -p
git diff --cached
git commit -m "refactor(order): 提取导出参数校验"
```

`--mixed` 把分支和索引退回父提交，保留工作区中的全部文件变化，因此 `add -p` 才能重新选择暂存内容。`--soft` 会保留原索引，直接接 `add -p` 不能把已经暂存的改动拆开。每个新提交都应单独构建或验证，不能仅把相邻代码行分成两份；同一块包含两个意图时需要编辑补丁或先整理代码。已共享的历史采用后续修正提交，避免未经协调改写。

## 提交信息结构

推荐格式：

```text
<type>(<scope>): <summary>

<body>

<footer>
```

示例：

```text
fix(order): 将上传超时标记为可重试失败

对象存储上传超出请求窗口后，原实现把任务保留在运行状态。
补充超时终态和重试标志，使用户能再次发起导出。

Closes #128
```

### type

| type | 使用场景 |
| --- | --- |
| `feat` | 新功能 |
| `fix` | bug 修复 |
| `docs` | 文档 |
| `style` | 格式调整，不影响逻辑 |
| `refactor` | 重构，不改变外部行为 |
| `perf` | 性能优化 |
| `test` | 测试 |
| `build` | 构建系统或依赖 |
| `ci` | CI 配置 |
| `chore` | 杂项维护 |
| `revert` | 回滚提交 |

### scope

`scope` 表示影响范围，可以是模块、业务域或技术层。

```text
feat(auth): 增加密码重置入口
fix(payment): 阻止重复回调记账
docs(git): 补充分支协作流程
```

### summary

摘要用祈使或动词短语，说明做了什么。

较好：

```text
fix(order): 拒绝重复创建导出任务
feat(user): 增加账号锁定状态
```

较差：

```text
update
fix bug
wip
change files
```

## 分支命名

常用格式：

```text
feature/<short-name>
fix/<short-name>
hotfix/<short-name>
release/<version>
chore/<short-name>
docs/<short-name>
```

示例：

```text
feature/order-export
fix/payment-callback-retry
hotfix/login-token-expire
release/v1.8.0
docs/git-workflow
```

有任务号时可以加在前面：

```text
feature/PROJ-128-order-export
```

## PR / MR 描述

订单导出修复的描述可以写成：

```markdown
## 改动
上传超过请求窗口时，任务由“运行中”变为“可重试失败”，避免永久占位。

## 验证
补充超时、成功、重复回调三个用例；填写实际执行结果和命令。

## 风险
核对旧客户端是否能识别新增状态；上线前验收旧版客户端的失败提示。

## 关联
Closes #128
```

填写重点：

- 改动：说明用户可见变化或工程影响。
- 测试：写实际执行过的命令或验证步骤。
- 风险：写兼容性、数据迁移、配置变更、性能影响。
- 关联：关联 Issue、需求、故障单。

## 代码审查关注点

审查者重点看：

- 需求是否被完整实现。
- 是否有无关改动混入。
- 错误处理和边界条件是否足够。
- 测试是否覆盖关键路径。
- 是否引入敏感信息或大文件。
- 是否需要同步文档、配置、迁移脚本。

作者提交前自查：

```bash
git diff origin/main...HEAD
git log --oneline origin/main..HEAD
```

## 自动化约束

项目可以通过 commitlint、Husky、pre-commit 等工具约束提交。

### commitlint 示例

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

`commitlint.config.cjs`：

```js
module.exports = {
  extends: ['@commitlint/config-conventional'],
};
```

### Husky 示例

```bash
npm install --save-dev husky
npx husky init
```

`.husky/commit-msg`：

```bash
npx --no -- commitlint --edit "$1"
```

`.husky/pre-commit`：

```bash
npm test
```

本地 Hook 依赖安装，可以被跳过，也不会随普通 Clone 自动启用；它只负责尽早反馈。必需测试、提交格式或签名要求应在托管平台 CI 和受保护分支规则中执行。Hook 是可执行代码，运行新仓库的安装脚本前应审查来源。具体工具职责见 [Git 生态工具](./ecosystem.md)。
