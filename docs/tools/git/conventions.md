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

如果已经提交混了，可以在未推送前使用：

```bash
git reset --soft HEAD~1
git add -p
git commit
```

## 提交信息结构

推荐格式：

```text
<type>(<scope>): <summary>

<body>

<footer>
```

示例：

```text
fix(order): handle export timeout

Increase export job timeout and return retryable error when the
third-party storage upload exceeds the request window.

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
feat(auth): add password reset
fix(payment): prevent duplicate callback
docs(git): add branch workflow
```

### summary

摘要用祈使或动词短语，说明做了什么。

较好：

```text
fix(order): reject duplicate export jobs
feat(user): add account lock status
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

推荐模板：

```markdown
## 改动

- 

## 测试

- 

## 风险

- 

## 关联

- 
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

自动化规则不能替代代码审查，但能挡住明显不合规的提交。
