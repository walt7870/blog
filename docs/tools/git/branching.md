# Git 分支与合并

订单导出分支增加了空结果处理，同事同时在 main 增加权限检查。整合时既要保留修复，也要保留权限约束。merge、rebase、cherry-pick 的差别在提交关系；没有冲突也不证明两项业务逻辑组合正确。

![merge rebase与cherry-pick的提交关系](/git/branch-integration.svg)

## 从明确的基线开始

以下假设工作区已处理完、main 跟踪 origin/main，并且没有需要重写的 main 本地提交。更新失败就检查分叉，不自动变基共享历史。

```bash
git status -sb
git switch main
git pull --ff-only
git switch -c feature/order-export
```

创建分支不复制完整文件目录。未提交修改也可能随切换保留，或因会被覆盖而阻止切换；它们不是天然归属于旧分支。要同时修改两个版本，使用 [worktree](./advanced.md)。

## merge 保留原提交关系

在功能分支同步 main，可以 fetch 后 merge，不改变已有功能提交的 ID。反过来，在目标分支执行 merge 才是把功能纳入目标，命令始终以当前分支为接收方。

```bash
git fetch origin
git switch feature/order-export
git merge origin/main
```

若当前提交已经是目标祖先，默认可快进，只移动引用。发生分叉时通常创建 merge commit，拥有两个父提交；`--no-ff` 在本可快进时也创建合并提交，`--ff-only` 则拒绝需要合并提交的情况。历史形态按团队策略选择，不把“出现一条线”当作质量标准。

## rebase 重放本分支提交

功能分支未被其他人依赖，且团队允许整理时，可将分支自己的提交重放到新的 origin/main 之后。重放通常生成新的提交 ID；已等价应用或变为空的提交可能被跳过，默认处理也不会原样保留所有 merge 结构。

```bash
git fetch origin
git switch feature/order-export
git rebase origin/main
```

“只在个人分支”是协作条件，不是因为命令更安全。若别人已经基于该历史开发，优先 merge 或协调变更。交互整理用 `git rebase -i HEAD~3`，但要求确实存在相应祖先；`reword` 改说明，`fixup`/`squash` 合并提交，`drop` 删除重放项。开始前先保护提交引用并处理未提交工作。

## cherry-pick 复制指定修改

维护 release 分支时，只需带回空结果修复，不需要整个导出功能分支，可选择具体修复提交：

```bash
git switch release/v1.4
git cherry-pick -x REPLACE_WITH_FIX_COMMIT
```

占位值替换为核实过的提交。新提交有自己的父关系和 ID，`-x` 在说明中记录来源。修复可能依赖前置重构或新的数据库字段，必须检查依赖并运行该发布分支上的测试。merge commit 涉及主父选择，不能直接当普通单父提交复制。

## 冲突先理解操作上下文

发生冲突时先看 status：当前是 merge、rebase 还是 cherry-pick。文件中的冲突标记需要按业务意图组合，例如权限判断必须保留，导出空列表也应生成合法文件；不能只因一侧测试通过就整块覆盖另一侧。

```bash
git status
git diff --name-only --diff-filter=U
# 编辑冲突，验证权限、空列表与正常导出
git add -- src/order-export.ts
git diff --staged
# 按当前操作只选择一条继续命令
git merge --continue
# git rebase --continue
# git cherry-pick --continue
```

rebase 中的 ours/theirs 与直观的“我的分支/别人的分支”容易相反，先辨认正在重放的提交及新基线。解决冲突只是语法整合，仍要测试。

取消使用对应的 `merge --abort`、`rebase --abort` 或 `cherry-pick --abort`。操作前存在未提交修改时，尤其不要假设任何 abort 都能重建所有工作内容；先保护现场，恢复细节见 [撤销与恢复](./recovery.md)。

## 对比与推送

```bash
git fetch origin
git log --oneline origin/main..HEAD
git diff origin/main...HEAD
git branch -vv
```

log 列本分支独有可达提交；三点 diff 从 merge-base 比较到 HEAD，常用于看功能分支引入的文件变化，不是直接比较两个分支尖端。需要当前两端快照差异时用两点或直接指定两个提交。

首次推送通常用 `git push -u origin feature/order-export`。已推送个人分支变基后，普通 push 会因非快进被拒绝；先核对远端变化与团队约定，再考虑带租约推送。默认 `--force-with-lease` 依赖本地远程跟踪引用，后台 fetch 可能刷新它；需要严格保护时使用已人工核对的明确预期 OID，而不是把默认租约当作绝对保证。公共分支优先新增提交。

## 合并后清理

`git branch --merged main` 检查提交祖先关系。squash/rebase merge 后，原功能提交可能不是 main 的祖先，因此 `git branch -d` 拒绝并不一定说明功能未交付。先比较评审结果、最终提交和分支差异，保留仍需内容，再决定删除；不要机械改成 `-D`。

远程分支删除与本地分支删除是独立操作；`fetch --prune` 清理的是相应远程跟踪引用，不会自动删除同名本地分支。发布和评审闭环见 [协作流程](./workflow.md)。
