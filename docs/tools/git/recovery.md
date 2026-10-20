# Git 撤销与恢复

订单导出修复暂存后，又加了一段调试日志：想删日志、取消暂存、撤销本地提交和撤销线上共享提交，是四件不同的事。恢复命令取决于要改变哪份内容，以及是否有人依赖已有历史。

![按内容位置选择Git撤销方式](/git/recovery-scope.svg)

## 先保护现场

先查看分支、工作区和索引，记录正在进行的 merge、rebase 或 cherry-pick。不要把一条清理命令当作通用恢复入口。

```bash
git status -sb
git diff
git diff --staged
git log -5 --oneline
```

`git branch backup/before-recovery` 只给当前提交增加引用，不能保存未提交文件。重要文件可复制到仓库外；已跟踪和未跟踪修改可用 `git stash push -u -m "恢复前现场"` 保存，随后检查 `git stash show -u --stat`。默认 stash 不含未跟踪文件，`-u` 也不含忽略文件。包含敏感配置的现场备份要控制存放位置。新分支上的临时提交也是选择，但应先检查内容，避免提交凭据。

## 工作区与索引分别恢复

普通 `restore` 默认从索引恢复工作区。在前面的例子里，它删除 add 之后的日志，保留索引里的修复；它不一定恢复成 HEAD。

```bash
git diff -- src/order-export.ts
git restore -- src/order-export.ts
```

`git restore --staged -- src/order-export.ts` 默认从 HEAD 恢复该路径的索引，保留工作区内容。它不是把一份文件搬到另一个目录；执行后用两份 diff 确认范围。以下命令明确从某个提交恢复工作区，执行前把占位值替换为实际提交：

```bash
git restore --source=REPLACE_WITH_COMMIT -- src/order-export.ts
git diff -- src/order-export.ts
```

要同时恢复索引和工作区，必须显式加 `--staged --worktree`，这会覆盖这两个位置的内容。未提交的覆盖结果通常无法靠 reflog 找回。

## 修改最后一次提交

未共享的提交可以补充文件或修正说明。amend 创建一个新提交代替当前尖端，ID 会改变，并非原地修改数据库记录。

```bash
git add -- src/order-export.ts
git diff --staged
git commit --amend
```

只改说明可用 `git commit --amend -m "fix(export): 修复空结果导出"`。已共享提交优先追加修复；在允许整理的个人远程分支上也要核对他人是否已依赖它，参见 [分支与合并](./branching.md)。

## reset 调整本地历史

下面三条是替代方案，只选符合目标的一条，且必须确实有上一个提交。附着分支时 reset 移动当前分支，detached HEAD 时移动 HEAD。

| 命令 | 引用 | 索引 | 工作区 | 典型目的 |
| --- | --- | --- | --- | --- |
| `git reset --soft HEAD~1` | 回到父提交 | 保留 | 保留 | 重新组织最后一次提交 |
| `git reset --mixed HEAD~1` | 回到父提交 | 按父提交重建 | 保留 | 重新选择暂存内容 |
| `git reset --hard HEAD~1` | 回到父提交 | 按父提交重建 | 按父提交重建 | 放弃明确不再需要的现场 |

hard 会丢失已跟踪的未提交修改，还可能删除阻挡目标路径写入的未跟踪文件或目录，不能简单理解为“只影响跟踪文件”。操作前先备份；reset 也不会自动撤销远端公共提交。

## revert 撤销共享变更

已推送到公共 main 的错误修改通常用新提交反向应用，保留审查记录。先确认工作区干净、目标修改及后续依赖，再执行：

```bash
git show REPLACE_WITH_COMMIT
git revert REPLACE_WITH_COMMIT
# 运行导出、权限和回归测试
git push
```

`git revert OLD..NEW` 选择 NEW 可达而 OLD 不可达的提交，**不包含 OLD**；分叉历史还可能包含侧支提交。先用 `git log --oneline OLD..NEW` 核对集合，不能把这个范围理解成文件中的连续行。合并提交需要明确 `-m` 主父，撤销合并还影响以后再次合并的祖先判断，不能盲目选择 `-m 1`。

撤销不保证业务回滚：数据库迁移、已发送通知或已写出的文件需要各自恢复策略。revert 冲突时用 status 定位，解决后 add 并 `git revert --continue`；放弃此次操作用 `git revert --abort`。

## reflog 找回仍存在的提交

误 reset、amend 或 rebase 后，可以从本地引用移动记录定位旧提交。先查看真实条目，再建立新分支，避免立即把当前现场覆盖掉。

```bash
git reflog --date=iso
git show REPLACE_WITH_OLD_COMMIT
git branch recovery/export REPLACE_WITH_OLD_COMMIT
```

reflog 通常不随 clone/push 传播，会过期；不可达对象也可能被垃圾回收。它记录引用移动，不是每次编辑的文件备份，不能承诺恢复从未 add/commit/stash 的内容。远端已删除且本地也无对象时，需要其他克隆或备份。

## clean 删除未跟踪文件

清理前先限定路径并预览；两次命令间若文件变化，应重新预览。以下只针对确认可重建的构建输出：

```bash
git clean -nd -- build-output/
# 核对预览后再执行
git clean -fd -- build-output/
```

`-d` 包含目录，`-x` 还包含忽略文件，`-X` 只针对忽略文件。忽略文件可能包括环境配置和下载资产，不等于可安全删除。clean 删除的文件通常不能靠 Git 恢复；不在仓库根盲目执行 `clean -fdx`。

## 恢复后的验收

如果目的只是取消暂存，应验证工作区字节仍在、暂存 diff 已清空；如果是撤销共享修复，应验证新增反向提交、远端引用以及业务行为。操作中断则使用与当前操作对应的 `merge --abort`、`rebase --abort` 或 `cherry-pick --abort`，不要混用 reset 掩盖尚未理解的状态。
