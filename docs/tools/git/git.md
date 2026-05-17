# Git 基础命令与日常操作

这篇文档聚焦每天都会用到的 Git 操作：初始化、配置、查看状态、暂存、提交、查看历史、同步远程和临时保存修改。复杂分支策略、提交规范和恢复操作分别放在独立专题中。

## 安装与初始配置

### 安装 Git

```bash
# macOS
brew install git

# Ubuntu / Debian
sudo apt update
sudo apt install git

# CentOS / RHEL
sudo yum install git
# 或
sudo dnf install git

# Windows 可使用 winget
winget install --id Git.Git -e
```

安装后确认版本：

```bash
git --version
```

### 用户信息

提交会记录作者名称和邮箱。第一次使用 Git 先配置：

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git config --global init.defaultBranch main
```

检查配置：

```bash
git config --global --list
git config --show-origin --get user.email
```

`--show-origin` 能看到配置来自哪个文件，排查多层配置冲突时很有用。

### 常用基础配置

```bash
# 编辑器
git config --global core.editor "vim"
# 或
git config --global core.editor "code --wait"

# 换行符处理
git config --global core.autocrlf input  # macOS / Linux
git config --global core.autocrlf true   # Windows

# 拉取时默认 rebase，减少无意义 merge commit
git config --global pull.rebase true

# 自动记录冲突解决方式
git config --global rerere.enabled true
```

团队项目里，换行、格式化、忽略文件等更适合放在仓库级配置中，例如 `.editorconfig`、`.gitattributes`、`.gitignore`。

## 新建和获取仓库

### 初始化本地仓库

```bash
mkdir demo
cd demo
git init
git status
```

初始化后会生成 `.git/` 目录，它保存提交对象、引用、索引和配置。

### 克隆远程仓库

```bash
git clone <repository-url>
git clone <repository-url> <directory-name>
```

只想快速查看最近版本，可以浅克隆：

```bash
git clone --depth 1 <repository-url>
```

浅克隆缺少完整历史，不适合做历史追踪、二分排查或长期开发。需要恢复完整历史时：

```bash
git fetch --unshallow
```

## 查看当前状态

`git status` 是每天最该频繁执行的命令。

```bash
git status
git status -sb
```

常见状态：

| 状态 | 含义 | 下一步 |
| --- | --- | --- |
| `Untracked` | 新文件，Git 还没跟踪 | `git add <file>` 或加入 `.gitignore` |
| `modified` | 已跟踪文件被修改 | `git diff` 查看变化 |
| `staged` | 已进入暂存区 | `git diff --staged` 后提交 |
| `ahead` | 本地有远程没有的提交 | `git push` |
| `behind` | 本地落后远程 | `git pull --rebase` 或 `git fetch` 后处理 |

## 查看差异

提交前先看差异，避免把临时调试内容提交进去。

```bash
git diff                 # 工作区 vs 暂存区
git diff --staged        # 暂存区 vs HEAD
git diff HEAD            # 工作区整体 vs HEAD
git diff main...HEAD     # 当前分支相对 main 的改动
git diff -- <file>       # 只看某个文件
```

常见使用顺序：

```bash
git status -sb
git diff
git add <file>
git diff --staged
git commit
```

## 暂存文件

### 按文件暂存

```bash
git add src/user.ts
git add docs/git.md
```

### 暂存当前目录改动

```bash
git add .
```

使用 `git add .` 前先看 `git status`，确认没有误加日志、密钥、临时文件。

### 交互式暂存

```bash
git add -p
```

适用场景：

- 一个文件里包含两个无关修改。
- 想把重构和业务变更拆成不同提交。
- 提交前发现调试代码和正式代码混在一起。

## 提交

### 创建提交

```bash
git commit -m "feat(auth): add login endpoint"
```

更推荐打开编辑器写完整提交信息：

```bash
git commit
```

提交信息格式见 [提交规范](./conventions.md)。

### 修改最后一次提交

还没推送时，可以修正最后一次提交：

```bash
git add <file>
git commit --amend
```

只改提交信息：

```bash
git commit --amend -m "fix(auth): handle empty token"
```

如果提交已经推送到公共分支，不要随意 amend 后强推。优先新增提交或使用 `revert`。

## 查看历史

```bash
git log
git log --oneline
git log --oneline --graph --decorate --all
git log -p -- <file>
git log --follow -- <file>
```

常用排查：

```bash
# 看某段代码是谁改的
git blame <file>

# 看某个提交改了什么
git show <commit>

# 看两个提交之间有哪些提交
git log <old>..<new>
```

## 远程仓库

### 查看远程地址

```bash
git remote -v
```

### 添加远程仓库

```bash
git remote add origin <repository-url>
```

### 获取远程更新

```bash
git fetch origin
git fetch --all --prune
```

`fetch` 只下载远程更新，不会改工作区。想先观察远程变化，用它比直接 `pull` 更安全。

### 拉取远程更新

```bash
git pull --rebase
```

等价于先 `fetch`，再把本地提交搬到远程最新提交之后。功能分支上常用它减少无意义 merge commit。

### 推送分支

```bash
git push -u origin feature/login
git push
```

`-u` 会设置上游分支，以后可以直接 `git push` 和 `git pull`。

## 临时保存修改

`stash` 用于临时收起工作区修改，适合“当前工作没做完，但需要切分支处理别的事”。

```bash
git stash push -m "wip login form"
git stash list
git stash show -p stash@{0}
git stash pop
```

只保存部分修改：

```bash
git stash push -p
```

注意：

- `stash pop` 会应用并删除 stash。
- `stash apply` 只应用，不删除。
- stash 不是长期存储方案，重要改动应尽快提交到分支。

## 日常开发模板

### 开始任务

```bash
git switch main
git pull --rebase
git switch -c feature/order-export
```

### 开发中提交

```bash
git status -sb
git diff
git add -p
git diff --staged
git commit
```

### 推送并发起评审

```bash
git fetch origin
git rebase origin/main
git push -u origin feature/order-export
```

如果 rebase 发生冲突，处理方式见 [分支与合并](./branching.md)。

## 排错

### 不知道当前在哪个分支

```bash
git status -sb
git branch --show-current
```

### 提交前发现误加文件

```bash
git restore --staged <file>
```

文件内容仍保留在工作区，只是从暂存区拿出来。

### 想丢弃某个文件的本地修改

```bash
git restore <file>
```

这会丢弃工作区修改，执行前先 `git diff -- <file>` 确认。

### 推送被拒绝

```bash
git fetch origin
git rebase origin/<branch>
git push
```

如果多人同时改了同一分支，先理解远程多出的提交，不要直接 `push --force`。
