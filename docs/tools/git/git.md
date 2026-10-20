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

编辑器选择自己已安装的一项，例如 `git config --global core.editor "code --wait"`。不要顺序复制多个替代设置；同一键后一次设置通常覆盖前一次。Git 配置作用域也有区别：`--global` 影响当前用户，默认 `--local` 影响当前仓库。

团队用 `.gitattributes` 约定路径的换行和二进制处理，例如 `*.sh text eol=lf`；已有仓库先检查策略，避免切换 `core.autocrlf` 后产生整库换行变更。`.editorconfig` 管编辑器格式，`.gitignore` 处理未跟踪文件发现，不能互相替代。同步方式每次显式指定，掌握分支策略前不默认全局启用 rebase。`rerere.enabled` 可复用已记录的冲突处理，但仍须检查复用结果并测试。

## 新建和获取仓库

### 初始化本地仓库

```bash
mkdir demo
cd demo
git init
git status
```

普通初始化生成 `.git/` 管理目录；linked worktree 或 submodule 中也可能是 `.git` 文件。脚本通过 `git rev-parse --git-dir` 定位管理数据。

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
| `ahead` | 相对本地上游跟踪引用领先 | fetch 后检查，再按团队流程推送 |
| `behind` | 相对本地上游跟踪引用落后 | fetch 后检查快进或分叉 |

## 查看差异

提交前先看差异，避免把临时调试内容提交进去。

```bash
git diff                 # 工作区 vs 暂存区
git diff --staged        # 暂存区 vs HEAD
git diff HEAD            # 工作区整体 vs HEAD
git diff main...HEAD     # 从 merge-base 到 HEAD 的差异
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
git commit -m "feat(auth): 增加登录接口"
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
git commit --amend -m "fix(auth): 处理空令牌"
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

`fetch` 下载对象并按 refspec 更新本地引用，通常不改变当前工作区和当前本地分支。`--prune` 还会按映射清理已不存在的远程跟踪引用；它不是纯下载，也不会自动合并修改。

### 拉取远程更新

```bash
git pull --ff-only
```

这会先 fetch，再仅在能够快进时更新当前分支；分叉会拒绝。当前分支必须配置正确上游。未共享功能分支按约定可用 `pull --rebase` 重放本地提交，共享分支则先理解他人依赖，参见 [分支与合并](./branching.md)。

### 推送分支

```bash
git push -u origin feature/login
git push
```

`-u` 会设置上游分支，以后可以直接 `git push` 和 `git pull`。

### Refspec 与远程引用映射

Refspec 描述“从哪条引用取数据，更新到哪条引用”。默认 Fetch 规则通常可以这样查看：

```bash
git config --get-all remote.origin.fetch
```

常见结果：

```text
+refs/heads/*:refs/remotes/origin/*
```

冒号左侧是远端分支，右侧是本地远程跟踪引用。开头的 `+` 表示即使远端发生非快进更新，也允许刷新对应的远程跟踪引用；它不会直接改写当前本地分支。

只获取特定分支或命名空间：

```bash
git fetch origin \
  'refs/heads/release/*:refs/remotes/origin/release/*'
```

推送也可以显式写出来源和目标：

```bash
git push origin HEAD:refs/heads/feature/login
git push origin :refs/heads/obsolete-branch
```

第二条命令会删除远端分支，执行前应确认分支保护、评审状态和团队约定。日常不需要手写 Refspec，但在同名分支、特殊命名空间、镜像仓库和“为什么 Fetch 后本地出现这条引用”的排查中，它是关键线索。

## 临时保存修改

`stash` 用于临时收起工作区修改，适合“当前工作没做完，但需要切分支处理别的事”。

```bash
git stash push -u -m "暂存登录表单开发"
git stash list
git stash show -p stash@{0}
git stash pop
```

只保存部分修改：

```bash
git stash push -p
```

注意：

- 默认 stash 只含已跟踪修改，`-u` 额外包含未跟踪文件，不含忽略文件。
- `stash pop` 成功应用后删除对应条目，冲突时通常保留；先解决冲突再核对是否需要手工删除，不能无条件再次 pop。
- `stash apply` 只应用，不删除；需要尝试恢复时便于保留原条目。恢复原暂存状态还涉及 `--index`，也可能冲突。
- stash 不是长期存储方案，重要改动应尽快提交到分支。

## 日常开发模板

### 开始任务

```bash
git switch main
git pull --ff-only
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
git merge origin/main
git push -u origin feature/order-export
```

这里 merge 保留原提交关系，个人未共享分支也可按约定 rebase。同步后测试，再推送；冲突处理见 [分支与合并](./branching.md)。

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

工作区内容保留，索引按 HEAD 恢复。它不移动文件；用两份 diff 核对范围。

### 想丢弃某个文件的本地修改

```bash
git restore <file>
```

这默认以索引恢复工作区，覆盖索引之后的修改；索引不一定等于 HEAD。先 `git diff -- <file>` 确认，详见 [撤销与恢复](./recovery.md)。

### 推送被拒绝

先读拒绝原因：非快进才涉及历史整合；权限不足、受保护分支、Hook 或网络错误需要各自排查。非快进时 fetch 后用 `git log --left-right --oneline HEAD...@{upstream}` 观察双方提交，再按约定 merge 或 rebase，运行测试后重试。没有上游时先指定正确比较分支；不要把所有拒绝都处理成强推。
