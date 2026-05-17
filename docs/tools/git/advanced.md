# Git 进阶操作

进阶命令不一定每天使用，但在发布、排障、大仓库和多仓库协作时很关键。使用这类命令前，先确认当前分支、工作区状态和是否会影响公共历史。

## 标签 tag

tag 用于给某个提交打版本标记，常用于发布。

### 创建 tag

```bash
git switch main
git pull --rebase
git tag -a v1.4.0 -m "release v1.4.0"
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

测试命令返回 `0` 表示 good，非 `0` 表示 bad。

## worktree

`worktree` 可以让同一个仓库同时检出多个工作目录，适合一边开发功能，一边处理 hotfix。

```bash
git worktree add ../project-hotfix hotfix/payment-timeout
```

查看：

```bash
git worktree list
```

删除工作树目录后清理记录：

```bash
git worktree prune
```

适用场景：

- 当前分支有未完成改动，不想 stash。
- 需要同时跑两个分支。
- 大仓库重新 clone 成本高。

## submodule

submodule 用于在一个仓库中引用另一个仓库的特定提交。

### 添加子模块

```bash
git submodule add <repository-url> third_party/libfoo
git commit -m "chore: add libfoo submodule"
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
cd third_party/libfoo
git fetch
git switch main
git pull --rebase
cd -
git add third_party/libfoo
git commit -m "chore: update libfoo submodule"
```

注意：主仓库记录的是子模块提交指针，不是子模块分支名。更新后必须在主仓库提交指针变化。

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
