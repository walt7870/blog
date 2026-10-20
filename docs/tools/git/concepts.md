# Git 核心概念

工作区、暂存区、提交树是同一文件在不同阶段的内容。分支和 HEAD 则回答“当前历史指向哪里”。用订单导出文件先修功能、再加调试输出的场景理解这两组对象，比背一串命令更容易判断操作范围。

![Git工作区索引提交与远程引用的数据关系](/git/git-data-flow.svg)

## 三份内容如何比较

假设 `src/order-export.ts` 已被跟踪，HEAD 中还是旧逻辑。修改为空结果也生成合法文件，执行 `git add`；然后又在文件里加入临时日志。此时工作区有“修复加日志”，索引只有“修复”，HEAD 仍是旧版。

```bash
git diff -- src/order-export.ts
git diff --staged -- src/order-export.ts
git show :src/order-export.ts
git show HEAD:src/order-export.ts
```

第一条比较工作区与索引，看到调试日志；第二条比较索引与 HEAD，看到修复。后两条直接读取索引和提交中的文件。普通 `git commit` 根据索引形成提交，临时日志仍留在工作区；再次 add 才会改变候选内容。

索引不只是文件名清单，它记录路径、模式和对象标识等信息。冲突期间还可能包含不同阶段的条目；不能把它当作一份永不变化的备份。

## 文件状态可以叠加

`git status --short` 的前两列分别描述索引相对 HEAD、工作区相对索引的状态。文件既能有已暂存修改，也能有尚未暂存修改；“已提交、已修改、已暂存”不是互斥的四个生命周期盒子。

| 简短状态 | 例子 | 解释 |
| --- | --- | --- |
| `??` | 新建导出测试 | 尚未跟踪 |
| ` M` | 修改但未 add | 工作区相对索引变化 |
| `M ` | 修改后 add | 索引相对 HEAD 变化 |
| `MM` | add 后再次编辑 | 两份变化都存在 |
| `UU` | 双方修改同一处且未解决 | 索引仍有未合并条目 |

未跟踪文件通常不出现在普通 `git diff` 中，要同时检查 status。`.gitignore` 主要控制未跟踪文件的发现与添加，不会自动停止跟踪已提交文件。

## 提交、文件树和内容对象

commit 指向根 tree，tree 记录路径及子 tree/blob；blob 保存文件内容，不保存文件名。commit 还包含父提交、作者、提交者、时间与说明等。根提交没有父提交，普通提交通常一个，merge 提交可以多个。

```bash
git cat-file -p HEAD
git ls-tree HEAD
git show --stat HEAD
```

Git 从对象序列化内容计算对象 ID；对象 ID 不是写在 commit 内容里的随机业务编号。仓库可能使用不同对象格式，不应把固定的40字符长度写成所有仓库的前提。Git 展示 diff 是比较快照的结果，并不意味着每次提交只存补丁。

常规仓库的管理数据在 `.git/`。linked worktree 或 submodule 的 `.git` 也可能是指向实际管理目录的文件；脚本应通过 `git rev-parse --git-dir` 定位，而不是硬编码目录结构。

## HEAD 和分支如何移动

正常附着分支时，HEAD 是指向当前分支的符号引用，分支指向一个提交。在 main 上创建新提交，会更新 main；其他分支仍停在原位置。detached HEAD 则直接指向提交，新建提交不会自动推进某个命名分支。

```bash
git branch --show-current
git symbolic-ref -q HEAD
git rev-parse HEAD
```

第一条在 detached HEAD 时没有分支名；第二条也会返回非零。若要保留该位置上的开发，建立新分支使提交获得稳定引用。更多历史关系见 [分支与合并](./branching.md)。

## 远程引用是本地观察

`refs/remotes/origin/main` 是本地对远端 main 的记录。它会在相关 fetch，以及成功推送后的对应更新中变化，并不实时跟随远端。上游配置告诉 Git 当前分支通常与哪个远程分支比较，不代表自动同步。

```bash
git fetch origin
git log --oneline main..origin/main
git log --oneline origin/main..main
git status -sb
```

第一个范围列出 origin/main 可达、main 不可达的提交；第二个反过来。ahead/behind 需要正确的上游并以当前本地跟踪引用为准。双方都有独有提交时是分叉，不能用一次快进覆盖它。

## 判断与恢复边界

`git merge-base --is-ancestor A B` 成功表示 A 可从 B 的父关系追溯到，适合检查原提交是否纳入历史；squash 后内容可能已合入，但原提交未成为祖先，因此该检查不能证明业务改动是否重复。

status 没有输出只说明在当前检查范围内没有报告的变化。忽略文件仍可能存在，submodule 状态也受选项影响，更不能推导本地已推送。reflog 记录本地引用移动，不能替代未提交内容备份；恢复操作见 [撤销与恢复](./recovery.md)。
