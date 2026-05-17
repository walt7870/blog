# Git 总览

Git 是分布式版本控制系统。它解决的不是“把文件备份一下”，而是让多人能围绕同一份代码持续修改、审查、合并、回滚和发布，并且保留每一次变更的上下文。

Git 专题按使用路径拆分：

- [基础命令与日常操作](./git.md)：安装配置、`status`、`add`、`commit`、`diff`、`log`、`stash` 等日常命令。
- [核心概念](./concepts.md)：工作区、暂存区、版本库、对象模型、HEAD、远程分支。
- [分支与合并](./branching.md)：分支创建、merge、rebase、cherry-pick、冲突处理。
- [协作流程](./workflow.md)：从接任务到提交合并的完整路径，以及 Git Flow、GitHub Flow、主干开发的差异。
- [提交规范](./conventions.md)：提交粒度、提交信息、分支命名、Pull Request / Merge Request 规范。
- [撤销与恢复](./recovery.md)：`restore`、`reset`、`revert`、`reflog`、`clean` 的适用场景。
- [安全与仓库治理](./security.md)：敏感信息、`.gitignore`、大文件、历史清理、权限边界。
- [进阶操作](./advanced.md)：tag、bisect、worktree、submodule、sparse checkout 等低频但关键的能力。
- [生态工具](./ecosystem.md)：托管平台、Hooks、LFS、GUI、命令行增强、CI/CD 与 GitOps。

![Git 心智模型](/git/git-mental-model.svg)

## Git 的作用

Git 的核心作用可以分成四层：

| 层级 | 解决的问题 | 常用能力 |
| --- | --- | --- |
| 个人修改管理 | 记录每次修改，随时查看和回退 | `status`、`diff`、`add`、`commit` |
| 分支隔离 | 新功能、修复、实验互不影响 | `branch`、`switch`、`merge`、`rebase` |
| 团队协作 | 多人围绕同一仓库并行开发 | `fetch`、`pull`、`push`、PR/MR |
| 发布与追踪 | 标记版本、定位问题、审计变更 | `tag`、`log`、`blame`、`bisect` |

它不是项目管理工具，也不是代码评审平台；GitHub、GitLab、Gitea 等平台是在 Git 之上提供权限、评审、Issue、CI/CD、制品和发布能力。

## 基本工作闭环

日常开发里，Git 的最小闭环是：

```bash
git status
git diff
git add <file>
git commit -m "type(scope): message"
git pull --rebase
git push
```

每一步对应一个明确问题：

| 命令 | 先回答什么问题 |
| --- | --- |
| `git status` | 当前有哪些文件变了 |
| `git diff` | 这些变化具体是什么 |
| `git add` | 哪些变化准备进入下一次提交 |
| `git commit` | 这次提交要表达什么意图 |
| `git pull --rebase` | 推送前是否落后远程 |
| `git push` | 把本地提交同步到远程 |

## 推荐学习顺序

### 第一阶段：能独立提交

先掌握：

```bash
git clone
git status
git diff
git add
git commit
git log
git push
git pull
```

目标是能看懂“我改了什么、准备提交什么、提交到了哪里”。

### 第二阶段：能安全协作

继续掌握：

```bash
git switch -c
git fetch
git merge
git rebase
git stash
git restore
git revert
```

目标是能在功能分支上工作，处理远程更新和冲突，并知道哪些操作会改写历史。

### 第三阶段：能治理仓库

再学习：

```bash
git tag
git bisect
git blame
git reflog
git cherry-pick
git worktree
git lfs
```

目标是能定位问题、维护发布版本、处理大文件和复杂协作场景。

## 团队使用规范

一个可维护的 Git 工作方式通常包含这些约定：

- 主分支保持可构建、可测试、可发布。
- 新功能和修复在独立分支完成。
- 提交粒度围绕一个完整意图，不把无关改动混在一起。
- 提交信息说明“为什么改”和“改了什么”，不要只写 `update`、`fix`。
- 合并前通过自动化检查和代码审查。
- 公共分支谨慎使用 `push --force`，需要改写历史时使用 `--force-with-lease`。
- 密钥、证书、`.env`、私有配置不进入仓库。

## 常见误区

| 误区 | 问题 | 更稳妥的做法 |
| --- | --- | --- |
| 每次都 `git add .` | 容易把调试文件、密钥、无关修改带进去 | 先 `git diff`，再按文件或用 `git add -p` |
| 用 `reset --hard` 解决所有问题 | 会丢弃工作区修改 | 先 `git status` 和 `git diff`，确认不需要再执行 |
| 已推送提交直接 rebase 后强推 | 可能覆盖他人提交 | 公共分支用 `revert`，必要强推用 `--force-with-lease` |
| 把二进制大文件直接提交 | 仓库会持续膨胀 | 使用 Git LFS 或制品仓库 |
| 冲突时只保留一边 | 容易漏掉业务逻辑 | 理解两边意图，合并后运行测试 |

## 阅读路线

如果刚开始用 Git，先读 [核心概念](./concepts.md) 和 [基础命令与日常操作](./git.md)。

如果已经能提交代码，但协作时容易混乱，重点读 [分支与合并](./branching.md)、[协作流程](./workflow.md) 和 [提交规范](./conventions.md)。

如果需要处理线上回滚、误删、误提交密钥、大文件膨胀，直接读 [撤销与恢复](./recovery.md) 和 [安全与仓库治理](./security.md)。

如果需要做版本发布、定位引入 bug 的提交、同时维护多个分支或处理外部仓库依赖，读 [进阶操作](./advanced.md)。
