# Git 协作流程

Git 协作流程要解决三个问题：每个人在哪里开发、什么时候同步、如何把变更合进主分支。流程不是越复杂越好，关键是匹配团队规模、发布频率和质量门禁。

![Git 协作流程](/git/git-team-workflow.svg)

## 单人到多人通用流程

### 1. 开始任务

```bash
git switch main
git pull --rebase
git switch -c feature/order-export
```

要求：

- 从最新主分支创建任务分支。
- 分支名能看出任务类型和内容。
- 一个分支只承载一个主要目标。

### 2. 开发和提交

```bash
git status -sb
git diff
git add -p
git commit
```

提交前检查：

- 是否包含调试日志、临时文件、密钥。
- 是否把格式化和业务变更混在一起。
- 提交信息是否能说明意图。

### 3. 同步主分支

```bash
git fetch origin
git rebase origin/main
```

如果团队禁止 rebase，也可以使用：

```bash
git merge origin/main
```

同步后运行测试，确保当前分支仍可工作。

### 4. 推送并发起评审

```bash
git push -u origin feature/order-export
```

在 GitHub、GitLab 或类似平台发起 PR/MR，填写：

- 改动目的。
- 主要实现点。
- 测试方式。
- 风险点和回滚方式。
- 关联 Issue 或需求。

### 5. 合并和清理

合并后清理本地和远程分支：

```bash
git switch main
git pull --rebase
git branch -d feature/order-export
git fetch origin --prune
```

如果远程分支没有自动删除：

```bash
git push origin --delete feature/order-export
```

## 常见工作流

### GitHub Flow

结构：

```text
main
feature/*
```

特点：

- 主分支始终可部署。
- 每个变更通过短生命周期分支完成。
- 通过 PR 审查和 CI 后合并。

适用：

- Web 服务、SaaS、持续交付项目。
- 团队希望流程简单，发布频繁。

### Git Flow

结构：

```text
main
develop
feature/*
release/*
hotfix/*
```

特点：

- `develop` 承载集成开发。
- `release/*` 做发布准备。
- `hotfix/*` 从生产分支修复。

适用：

- 版本发布节奏固定。
- 多版本并行维护。
- 移动端、桌面端、嵌入式等发布窗口较重的项目。

不适用：

- 小团队高频发布的服务端项目，流程成本可能偏高。

### 主干开发

结构：

```text
main
short-lived branches
feature flags
```

特点：

- 分支寿命很短，频繁集成。
- 未完成能力通过 feature flag 隔离。
- 强依赖自动化测试和持续集成。

适用：

- 工程能力较成熟的团队。
- 需要快速集成和快速发布的项目。

## 合并策略

| 策略 | 历史形态 | 适用场景 |
| --- | --- | --- |
| Merge commit | 保留分支线 | 想保留完整开发过程 |
| Squash merge | 多个提交压成一个 | PR 内提交杂乱，但变更目标单一 |
| Rebase merge | 历史线性 | 团队偏好干净提交历史 |

选择标准：

- 如果 PR 内每个提交都有独立价值，保留提交。
- 如果 PR 内有很多 `wip`、修正提交，用 squash。
- 如果团队需要可追踪分支合并边界，用 merge commit。

## 发布流程

### 使用 tag 标记版本

```bash
git switch main
git pull --rebase
git tag -a v1.4.0 -m "release v1.4.0"
git push origin v1.4.0
```

查看 tag：

```bash
git tag
git show v1.4.0
```

### hotfix 流程

```bash
git switch main
git pull --rebase
git switch -c hotfix/payment-timeout
# 修改并测试
git commit
git push -u origin hotfix/payment-timeout
```

合并到主分支并发布后，如果还有 release 或 develop 分支，要把修复同步过去：

```bash
git switch develop
git pull --rebase
git cherry-pick <hotfix-commit>
```

## 团队协作检查清单

提交前：

- `git status -sb` 确认只包含本次任务文件。
- `git diff` 确认没有临时代码。
- 本地测试通过。
- 提交信息符合团队规范。

发起 PR/MR 前：

- 分支已同步目标分支。
- CI 能通过。
- PR 描述包含测试方式。
- 涉及数据库、配置、兼容性时写清上线顺序。

合并后：

- 删除已合并分支。
- 本地 `fetch --prune` 清理远程引用。
- 需要发布时打 tag 或触发发布流水线。
