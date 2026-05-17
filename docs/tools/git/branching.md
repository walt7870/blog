# Git 分支与合并

分支用于隔离不同任务。合并用于把一个分支的提交整合到另一个分支。理解 merge、rebase、cherry-pick 的差异，可以避免协作时把历史改乱。

## 分支基础

### 创建分支

```bash
git switch main
git pull --rebase
git switch -c feature/payment-callback
```

`feature/payment-callback` 从当前 `main` 位置创建，并切换过去。

### 查看分支

```bash
git branch
git branch -a
git branch -vv
```

`-vv` 可以看到本地分支跟踪的远程分支，以及 ahead/behind 状态。

### 删除分支

```bash
git branch -d feature/payment-callback
git push origin --delete feature/payment-callback
```

`-d` 会检查分支是否已合并；`-D` 会强制删除，只在确认不再需要时使用。

## merge

`merge` 把另一个分支的历史合入当前分支。

```bash
git switch main
git merge feature/payment-callback
```

适用场景：

- 保留真实分支历史。
- 发布分支、长期分支合并。
- 团队约定不改写公共分支历史。

常见选项：

```bash
git merge --no-ff feature/payment-callback
git merge --abort
```

`--no-ff` 会保留一次 merge commit，方便看出某个功能分支的合并边界。

## rebase

`rebase` 会把当前分支的提交“搬到”目标提交之后，形成更线性的历史。

```bash
git switch feature/payment-callback
git fetch origin
git rebase origin/main
```

适用场景：

- 功能分支推送前同步主分支。
- 整理本地提交历史。
- 减少无意义 merge commit。

不适用场景：

- 已被多人基于其继续开发的公共分支。
- 不确定是否会覆盖别人提交的远程分支。

## merge 和 rebase 的选择

| 场景 | 推荐 |
| --- | --- |
| 功能分支同步主分支 | `git rebase origin/main` |
| 功能分支合入主分支 | 按团队平台策略选择 merge、squash 或 rebase merge |
| 长期发布分支合并 | `git merge` |
| 已推送且多人使用的公共分支 | 避免 rebase |
| 本地未推送提交整理 | `git rebase -i` |

## 交互式 rebase

整理最近 3 个提交：

```bash
git rebase -i HEAD~3
```

常见动作：

```text
pick    保留提交
reword  修改提交信息
squash  合并到前一个提交，并编辑提交信息
fixup   合并到前一个提交，丢弃当前提交信息
drop    删除提交
```

适合在发起 PR/MR 前整理本地历史，不适合在公共分支上重写别人依赖的提交。

## cherry-pick

`cherry-pick` 用于把某个提交单独复制到当前分支。

```bash
git switch release/v1.4
git cherry-pick <commit>
```

常见场景：

- 把主分支上的修复补到 release 分支。
- 把 hotfix 同步到多个维护分支。
- 只拿某个提交，不合并整个功能分支。

中途冲突：

```bash
git status
# 修改冲突文件
git add <file>
git cherry-pick --continue
```

取消：

```bash
git cherry-pick --abort
```

## 冲突处理

冲突表示 Git 无法自动判断两边修改应该如何组合。

### 处理步骤

```bash
git status
# 打开冲突文件，处理 <<<<<<< ======= >>>>>>> 标记
git add <resolved-file>
git status
git merge --continue
```

rebase 冲突时：

```bash
git rebase --continue
```

取消当前合并或变基：

```bash
git merge --abort
git rebase --abort
```

### 冲突文件示例

```text
<<<<<<< HEAD
return order.getPaidAmount();
=======
return order.getActualPaidAmount();
>>>>>>> feature/payment-callback
```

处理时不要机械保留一边，要理解两边业务意图。处理后通常要运行相关测试。

## 排查

### 分支是否已经合入

```bash
git branch --merged main
git branch --no-merged main
```

### 当前分支相对主分支改了什么

```bash
git fetch origin
git log --oneline origin/main..HEAD
git diff origin/main...HEAD
```

### rebase 后推送被拒绝

如果确认只是自己功能分支的历史被重写：

```bash
git push --force-with-lease
```

不要用裸 `--force`。`--force-with-lease` 会检查远程分支是否出现了你本地不知道的新提交，能降低覆盖别人工作的风险。
