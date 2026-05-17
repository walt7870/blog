# Git 核心概念

Git 的命令很多，但底层模型并不复杂。先理解工作区、暂存区、版本库、提交对象和引用，后面的分支、合并、恢复都会更容易判断。

![Git 数据流](/git/git-data-flow.svg)

## 三个区域

### 工作区

工作区就是项目目录里能直接编辑的文件。

```bash
git status
git diff
```

工作区里的修改还没有进入下一次提交。它们可能是正式代码，也可能只是临时调试内容。

### 暂存区

暂存区也叫 index，是下一次提交的候选内容。

```bash
git add <file>
git diff --staged
```

暂存区的价值是“选择提交内容”。同一个文件里可以通过 `git add -p` 只暂存部分改动。

### 版本库

版本库是 `.git/` 目录，保存提交历史、对象、分支引用、远程引用和配置。

```bash
git log --oneline
git show HEAD
```

提交后，暂存区中的快照会进入版本库，形成一个新的 commit。

## 文件状态

| 状态 | 含义 | 常见操作 |
| --- | --- | --- |
| Untracked | 新文件，未被 Git 管理 | `git add` 或加入 `.gitignore` |
| Modified | 已跟踪文件被修改 | `git diff`、`git add` |
| Staged | 已进入暂存区 | `git diff --staged`、`git commit` |
| Committed | 已进入提交历史 | `git log`、`git show` |

查看简短状态：

```bash
git status -sb
```

## 提交是什么

一次 commit 是一个项目快照，同时记录：

- 这次提交的文件树。
- 父提交。
- 作者和提交者。
- 时间。
- 提交信息。
- 对象哈希。

查看提交：

```bash
git show <commit>
git cat-file -p <commit>
```

提交不是“差异文件”的集合，而是指向一棵文件树的快照。Git 能展示差异，是因为它可以比较两个快照。

## HEAD、分支和引用

分支本质上是指向某个提交的可移动引用。当前所在位置由 `HEAD` 表示。

```bash
git branch --show-current
git rev-parse HEAD
git show-ref --heads
```

常见关系：

```text
main -> C3
HEAD -> main
```

当你在 `main` 上提交一次，新提交变成 `C4`，`main` 会移动到 `C4`。

```text
main -> C4
HEAD -> main
```

## 远程分支

`origin/main` 不是远程仓库里的实时分支，而是本地保存的“上次 fetch 时远程 main 的位置”。

```bash
git fetch origin
git log --oneline main..origin/main
git log --oneline origin/main..main
```

含义：

- `main..origin/main`：远程有、本地没有的提交。
- `origin/main..main`：本地有、远程没有的提交。

## 常见判断

### 工作区是否干净

```bash
git status --short
```

没有输出表示工作区和暂存区都没有待处理改动。

### 当前提交是不是某分支祖先

```bash
git merge-base --is-ancestor <old> <new>
```

常用于脚本判断一个提交是否已经被合入目标分支。

### 本地分支是否落后远程

```bash
git fetch origin
git status -sb
```

出现 `behind` 时，先拉取远程变化；出现 `ahead` 时，本地有待推送提交。

## 常见误区

- 暂存区不是“备份区”，它只是下一次提交的候选快照。
- `origin/main` 不会自动更新，需要 `git fetch`。
- 分支不是一份完整代码副本，只是指向提交的引用。
- commit 哈希不是随机 ID，它由对象内容计算而来。
- 工作区干净不代表本地已经推送，需要看 `ahead/behind`。
