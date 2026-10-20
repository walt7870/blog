# Git 进阶操作

进阶命令不一定每天使用，但在发布、排障、大仓库和多仓库协作时很关键。使用这类命令前，先确认当前分支、工作区状态和是否会影响公共历史。

## 标签 tag

tag 用于给某个提交打版本标记，常用于发布。

### 创建 tag

```bash
git switch main
git fetch origin
git merge --ff-only origin/main
# 先完成该提交的构建与验收，再创建发布标记
git tag -a v1.4.0 -m "发布 v1.4.0"
git push origin v1.4.0
```

建议发布版本使用 annotated tag，因为它包含创建者、时间和说明。

### 查看 tag

```bash
git tag
git tag -l "v1.*"
git show v1.4.0
```

### 删除 tag

本地删除：

```bash
git tag -d v1.4.0
```

远程删除：

```bash
git push origin --delete v1.4.0
```

已经发布给外部用户的 tag 不应随意删除或重打。

## bisect

`bisect` 用二分法定位哪个提交引入了问题。

### 使用流程

```bash
git bisect start
git bisect bad
git bisect good <known-good-commit>
```

Git 会切到中间提交。测试后标记：

```bash
git bisect good
# 或
git bisect bad
```

直到 Git 找到第一个坏提交。结束后回到原分支：

```bash
git bisect reset
```

### 自动化

如果有稳定测试脚本：

```bash
git bisect start
git bisect bad
git bisect good <known-good-commit>
git bisect run npm test
git bisect reset
```

测试脚本返回 `0` 表示 good，`1` 到 `127`（除 `125`）表示 bad，`125` 表示当前提交无法测试而跳过；其他退出码使定位中止。脚本不存在产生的 `127` 也会被当作 bad，所以环境检查不能省略。

例如订单导出在新版本超过超时窗口：先固定数据集、依赖服务和超时阈值，再让脚本只用结果判定退出。旧提交缺少可用编译环境时返回 `125`，不要把编译器下载失败当作导出回归。二分定位要求选定范围内的好坏边界适合二分；问题反复引入又修复、测试偶发失败时，应缩小范围或先稳定复现。跳过边界附近的提交可能只能得到一组候选提交，不能声称已经唯一定位。

## worktree

`worktree` 可以让同一个仓库同时检出多个工作目录，适合一边开发功能，一边处理 hotfix。

```bash
git worktree add -b hotfix/payment-timeout ../project-hotfix <production-commit>
```

查看：

```bash
git worktree list
```

修复完成、提交已保留且工作区干净后，正常删除工作树：

```bash
git worktree remove ../project-hotfix
# 只有目录已经被外部删除时，才检查并清理失效管理记录
git worktree prune --dry-run
git worktree prune
```

工作树共享对象库及大多数引用，但各有工作目录、索引和 HEAD。一个目录中的未提交改动不会出现在另一个目录；同一普通分支默认不能同时检出到两个工作树。配置默认仍可能共享，独立目录也不会隔离端口、数据库或构建缓存。处理 hotfix 前要分配独立运行资源，不能只看目录名称。

适用场景：

- 当前分支有未完成改动，不想 stash。
- 需要同时跑两个分支。
- 大仓库重新 clone 成本高。

## submodule

submodule 用于在一个仓库中引用另一个仓库的特定提交。

### 添加子模块

```bash
git submodule add <repository-url> third_party/libfoo
git commit -m "chore: 引入 libfoo 子模块"
```

### 克隆包含子模块的仓库

```bash
git clone --recursive <repository-url>
```

已有仓库初始化子模块：

```bash
git submodule update --init --recursive
```

### 更新子模块

```bash
git -C third_party/libfoo fetch origin
git -C third_party/libfoo switch --detach <verified-commit>
git -C third_party/libfoo status -sb
git add third_party/libfoo
git commit -m "chore: 更新 libfoo 到已验收提交"
```

主仓库记录的是子模块提交指针，不是子模块分支名。先确认目标提交已在子仓库远端可访问，再提交主仓库指针；修改子模块源码时，先在子仓库建立分支、提交并推送。否则其他人克隆主仓库后会拿不到依赖。组织与发布边界见 [仓库组织策略](./repository-strategies.md)。

## sparse checkout

sparse checkout 适合大仓库中只检出部分目录。

```bash
git clone --filter=blob:none --sparse <repository-url>
cd <repo>
git sparse-checkout set docs tools
```

查看规则：

```bash
git sparse-checkout list
```

增加目录：

```bash
git sparse-checkout add packages/app
```

适用：

- 单体仓库很大，只需要部分模块。
- CI 只构建某些目录。
- 网络或磁盘成本敏感。

Sparse Checkout 控制工作区路径，Partial Clone 的 `--filter` 控制预取对象；检出当前版本需要的 Blob 仍会下载。两者不能代替完整备份，区别见 [对象库与大型仓库](./internals-large-repositories.md)。

## blame 与历史追踪

查看某行最近是谁改的：

```bash
git blame <file>
```

查看文件重命名前后的历史：

```bash
git log --follow -- <file>
```

查看某个函数相关变更：

```bash
git log -L :function_name:path/to/file
```

使用 `blame` 时不要只看作者，要结合提交上下文：

```bash
git show <commit>
```

## patch

生成补丁：

```bash
git format-patch -1 <commit>
```

应用补丁：

```bash
git am <patch-file>
```

查看工作区补丁：

```bash
git diff > change.patch
```

应用普通 diff：

```bash
git apply change.patch
```

`format-patch` / `git am` 会保留提交信息；`diff` / `apply` 只处理文件变化。

`git diff` 默认只包含未暂存的已跟踪变化；暂存内容用 `git diff --cached`，未跟踪文件需要另行纳入。收到普通补丁先运行 `git apply --check change.patch` 检查是否可应用，再审查内容。`git am` 遇到冲突时使用 `--continue` 或 `--abort`，不要把它和 `git apply` 的恢复过程混用。

## 维护命令

查看对象数量和大小：

```bash
git count-objects -vH
```

清理和压缩：

```bash
git gc
git maintenance run --auto
```

不要把 `git gc --aggressive` 当作日常命令。它耗时更长，通常只在仓库异常膨胀或迁移治理时评估使用。

## 使用前检查

执行进阶命令前先确认：

```bash
git status -sb
git branch --show-current
git remote -v
```

涉及历史改写、远程删除、tag 重打、历史清理时，先和团队确认影响范围，并准备恢复方案。
