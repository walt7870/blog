# Git 撤销与恢复

Git 里的撤销命令要先分清两件事：要撤销的是工作区、暂存区、提交历史，还是远程公共历史。不同区域用错命令，风险差很多。

## 先确认当前状态

任何恢复操作前先执行：

```bash
git status -sb
git diff
git diff --staged
```

如果不确定某个命令会不会丢数据，先创建临时分支：

```bash
git switch -c backup/before-recovery
```

## 撤销工作区修改

丢弃某个文件的本地修改：

```bash
git restore <file>
```

丢弃当前目录所有未暂存修改：

```bash
git restore .
```

风险：会丢弃工作区内容。执行前先 `git diff`。

## 取消暂存

文件已经 `git add`，但还不想提交：

```bash
git restore --staged <file>
```

取消所有暂存：

```bash
git restore --staged .
```

这不会丢弃文件内容，只是把文件从暂存区移回工作区。

## 修改最后一次提交

还没推送时，修正最后一次提交：

```bash
git add <file>
git commit --amend
```

只改提交信息：

```bash
git commit --amend -m "fix(order): handle empty export result"
```

如果已经推送到公共分支，优先不要 amend。改写历史后需要强推，会影响其他人。

## reset

`reset` 会移动当前分支指针，适合处理本地未共享历史。

### soft

撤销提交，保留暂存区：

```bash
git reset --soft HEAD~1
```

适合：刚提交完发现提交信息或内容要重组。

### mixed

撤销提交和暂存，保留工作区：

```bash
git reset HEAD~1
```

适合：想重新选择要提交的文件。

### hard

撤销提交、暂存和工作区：

```bash
git reset --hard HEAD~1
```

风险最高。执行前确认没有要保留的工作区修改。

## revert

`revert` 通过创建一个新提交来撤销旧提交，适合公共分支。

```bash
git revert <commit>
```

撤销一个范围：

```bash
git revert <old>..<new>
```

适用：

- 已推送到主分支的错误提交。
- 需要保留审计历史。
- 不想改写公共历史。

## reflog

`reflog` 记录 HEAD 和分支指针移动历史，是误操作后的重要救援工具。

```bash
git reflog
```

恢复到误操作前的位置：

```bash
git switch -c recovery <reflog-entry>
```

示例：

```bash
git switch -c recovery HEAD@{2}
```

常见场景：

- `reset --hard` 后发现提交丢了。
- rebase 后历史不符合预期。
- 切分支或 amend 后找不到之前的位置。

## clean

`clean` 删除未跟踪文件。

先预览：

```bash
git clean -fdn
```

确认后执行：

```bash
git clean -fd
```

包括 `.gitignore` 忽略文件：

```bash
git clean -fdx
```

`-x` 风险很高，可能删除本地构建缓存、环境文件或下载资源。

## 常见场景

### 提交错了文件，但还没推送

```bash
git reset --soft HEAD~1
git restore --staged .
git add -p
git commit
```

### 已推送提交需要撤销

```bash
git revert <commit>
git push
```

### 删除的文件想找回

从当前 HEAD 恢复：

```bash
git restore <file>
```

从指定提交恢复：

```bash
git restore --source=<commit> -- <file>
```

### rebase 做坏了

rebase 过程中：

```bash
git rebase --abort
```

rebase 已完成：

```bash
git reflog
git switch -c recovery HEAD@{n}
```

## 选择表

| 目标 | 命令 |
| --- | --- |
| 丢弃工作区某文件修改 | `git restore <file>` |
| 取消暂存 | `git restore --staged <file>` |
| 修改最后一次未推送提交 | `git commit --amend` |
| 撤销本地提交但保留修改 | `git reset --soft HEAD~1` |
| 撤销公共分支提交 | `git revert <commit>` |
| 找回误删提交 | `git reflog` |
| 删除未跟踪文件 | `git clean -fd` |
