# Git - 分布式版本控制系统

## 概述

Git 是一个分布式版本控制系统，由 Linus Torvalds 于 2005 年创建，用于管理 Linux 内核开发。Git 具有强大的分支管理、分布式协作和版本控制功能，已成为现代软件开发的标准工具。

### 主要特性

- **分布式**: 每个开发者都有完整的代码库副本
- **快速**: 本地操作，无需网络连接
- **分支管理**: 轻量级分支，强大的合并功能
- **数据完整性**: SHA-1 哈希确保数据完整性
- **非线性开发**: 支持复杂的开发工作流

## 安装和配置

### 安装 Git

#### macOS
```bash
# 使用 Homebrew
brew install git

# 或下载官方安装包
# https://git-scm.com/download/mac
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install git
```

#### Linux (CentOS/RHEL)
```bash
sudo yum install git
# 或
sudo dnf install git
```

#### Windows
```bash
# 使用 Chocolatey
choco install git

# 或下载官方安装包
# https://git-scm.com/download/win
```

### 初始配置

```bash
# 设置用户信息
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 设置默认编辑器
git config --global core.editor "vim"
# 或
git config --global core.editor "code --wait"

# 设置默认分支名
git config --global init.defaultBranch main

# 查看配置
git config --list
git config --global --list
```

### 常用配置

```bash
# 设置换行符处理
git config --global core.autocrlf input  # Linux/macOS
git config --global core.autocrlf true   # Windows

# 设置凭证存储
git config --global credential.helper store
git config --global credential.helper cache

# 设置别名
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual '!gitk'

# 设置合并工具
git config --global merge.tool vimdiff
git config --global mergetool.prompt false
```

## 基础概念

### 工作区、暂存区和版本库

```
工作区 (Working Directory)
    ↓ git add
暂存区 (Staging Area / Index)
    ↓ git commit
版本库 (Repository / .git)
```

### 文件状态

- **Untracked**: 未跟踪的文件
- **Modified**: 已修改但未暂存
- **Staged**: 已暂存，准备提交
- **Committed**: 已提交到版本库

### 分支概念

- **HEAD**: 当前分支的指针
- **master/main**: 默认主分支
- **feature branch**: 功能分支
- **remote branch**: 远程分支

## 基础命令

### 仓库操作

```bash
# 初始化仓库
git init

# 克隆仓库
git clone <repository-url>
git clone <repository-url> <directory-name>
git clone --depth 1 <repository-url>  # 浅克隆

# 查看仓库状态
git status
git status -s  # 简短格式

# 查看远程仓库
git remote -v
git remote add origin <repository-url>
git remote remove origin
```

### 文件操作

```bash
# 添加文件到暂存区
git add <file>
git add .  # 添加所有文件
git add *.js  # 添加特定类型文件
git add -p <file>  # 交互式添加

# 移除文件
git rm <file>  # 删除文件并暂存
git rm --cached <file>  # 从暂存区移除，保留文件
git mv <old-file> <new-file>  # 重命名文件

# 查看文件差异
git diff  # 工作区与暂存区
git diff --staged  # 暂存区与版本库
git diff HEAD  # 工作区与版本库
git diff <commit1> <commit2>  # 两个提交之间的差异
```

### 提交操作

```bash
# 提交更改
git commit -m "commit message"
git commit -a -m "commit message"  # 跳过暂存区
git commit --amend  # 修改最后一次提交

# 查看提交历史
git log
git log --oneline  # 单行显示
git log --graph  # 图形化显示
git log --author="author name"
git log --since="2023-01-01"
git log -p <file>  # 查看特定文件的提交历史

# 撤销操作
git reset --soft HEAD~1   # 撤销提交，保留更改
git reset --mixed HEAD~1  # 撤销提交和暂存
git reset --hard HEAD~1   # 撤销提交和更改
git revert <commit>       # 创建新提交来撤销更改
```

### 分支操作

```bash
# 查看分支
git branch
git branch -r  # 远程分支
git branch -a  # 所有分支

# 创建分支
git branch <branch-name>
git checkout -b <branch-name>  # 创建并切换
git switch -c <branch-name>    # Git 2.23+ 推荐方式

# 切换分支
git checkout <branch-name>
git switch <branch-name>       # Git 2.23+ 推荐方式

# 删除分支
git branch -d <branch-name>    # 安全删除
git branch -D <branch-name>    # 强制删除

# 合并分支
git merge <branch-name>
git merge --no-ff <branch-name>  # 禁用快进合并
git merge --abort  # 取消合并

# 变基操作
git rebase <branch-name>
git rebase -i HEAD~3  # 交互式变基
git rebase --abort    # 取消变基
```

### 远程操作

```bash
# 获取远程更新
git fetch <remote>
git fetch --all

# 拉取并合并
git pull <remote> <branch>
git pull --rebase  # 使用变基而不是合并

# 推送到远程
git push <remote> <branch>
git push -u origin <branch>  # 设置上游分支
git push --force  # 强制推送（谨慎使用）

# 查看远程分支
git branch -r
git ls-remote origin

## 高级功能

### 标签管理

```bash
# 创建标签
git tag <tag-name>
git tag -a <tag-name> -m "tag message"  # 带注释的标签

# 查看标签
git tag
git tag -l "v1.*"  # 过滤标签

# 推送标签
git push origin <tag-name>
git push origin --tags  # 推送所有标签

# 删除标签
git tag -d <tag-name>
git push origin --delete <tag-name>
```

### 贮藏操作

```bash
# 贮藏更改
git stash
git stash push -m "stash message"
git stash push -p  # 交互式贮藏

# 查看贮藏
git stash list
git stash show
git stash show -p

# 应用贮藏
git stash apply  # 应用但不删除
git stash pop    # 应用并删除
git stash drop   # 删除贮藏
git stash clear  # 删除所有贮藏
```

### 子模块

```bash
# 添加子模块
git submodule add <repository-url> <path>

# 克隆包含子模块的仓库
git clone --recursive <repository-url>
# 或
git clone <repository-url>
git submodule init
git submodule update

# 更新子模块
git submodule update --remote
git submodule foreach git pull origin main
```

### 高级工作流

```bash
# Cherry-pick
git cherry-pick <commit-hash>
git cherry-pick <commit1> <commit2>

# 重置到特定提交
git reset --hard <commit-hash>
git reset --soft <commit-hash>

# 查看文件历史
git blame <file>
git log --follow <file>  # 跟踪文件重命名

# 二分查找
git bisect start
git bisect bad <commit>
git bisect good <commit>
git bisect reset
```

## Git 工作流

### Git Flow

```bash
# 主分支
main/master     # 生产环境代码
develop         # 开发环境代码

# 功能分支
feature/*       # 新功能开发
release/*       # 发布准备
hotfix/*        # 紧急修复
```

### GitHub Flow

```bash
# 简化的工作流
main           # 主分支，始终可部署
feature/*      # 功能分支
```

### GitLab Flow

```bash
# 环境分支
main           # 主分支
pre-production  # 预生产环境
production      # 生产环境
```

## 扩展工具

### Git LFS (Large File Storage)

Git LFS 用于管理大文件，避免将大文件存储在 Git 仓库中。

#### 安装 Git LFS

```bash
# macOS
brew install git-lfs

# Linux (Ubuntu/Debian)
curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | sudo bash
sudo apt-get install git-lfs

# Windows
# 下载安装包：https://git-lfs.github.com/
```

#### 使用 Git LFS

```bash
# 初始化 LFS
git lfs install

# 跟踪大文件类型
git lfs track "*.psd"
git lfs track "*.zip"
git lfs track "*.pdf"
git lfs track "*.mp4"

# 查看跟踪的文件类型
git lfs track

# 查看 LFS 文件
git lfs ls-files

# 拉取 LFS 文件
git lfs pull

# 检查 LFS 状态
git lfs status
```

#### .gitattributes 配置

```bash
# 自动跟踪文件类型
*.psd filter=lfs diff=lfs merge=lfs -text
*.zip filter=lfs diff=lfs merge=lfs -text
*.pdf filter=lfs diff=lfs merge=lfs -text
*.mp4 filter=lfs diff=lfs merge=lfs -text
*.mov filter=lfs diff=lfs merge=lfs -text
*.avi filter=lfs diff=lfs merge=lfs -text
*.iso filter=lfs diff=lfs merge=lfs -text
```

### Git Hooks

Git Hooks 是在 Git 操作时自动执行的脚本。

#### 常用 Hooks

```bash
# 客户端 Hooks
pre-commit      # 提交前执行
prepare-commit-msg  # 准备提交消息时
commit-msg      # 提交消息后
post-commit     # 提交后
pre-rebase      # 变基前
post-merge      # 合并后

# 服务器端 Hooks
pre-receive     # 接收推送前
update          # 更新分支前
post-receive    # 接收推送后
```

#### 示例：Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

# 运行代码检查
npm run lint

# 运行测试
npm test

# 检查文件大小
find . -name "*.js" -size +1M -exec echo "Large file found: {}" \;
```

### Git 别名和脚本

#### 有用的别名

```bash
# 添加到 ~/.gitconfig
[alias]
    st = status
    co = checkout
    br = branch
    ci = commit
    ca = commit -a
    cm = commit -m
    unstage = reset HEAD --
    last = log -1 HEAD
    visual = !gitk
    lg = log --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit
    ll = log --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit --all
    amend = commit --amend --reuse-message=HEAD
    undo = reset --soft HEAD^
    cleanup = "!git branch --merged | grep -v '\\*\\|main\\|develop' | xargs -n 1 git branch -d"
```

#### 自定义脚本

```bash
#!/bin/bash
# git-feature.sh - 创建功能分支

if [ -z "$1" ]; then
    echo "Usage: git-feature <feature-name>"
    exit 1
fi

feature_name=$1
branch_name="feature/$feature_name"

git checkout -b $branch_name
echo "Created and switched to branch: $branch_name"
```

### Git 图形化工具

#### 命令行工具

```bash
# tig - 文本模式 Git 浏览器
brew install tig
tig

# lazygit - 简单的 Git 终端 UI
brew install lazygit
lazygit

# gitui - 快速的 Git 终端 UI
brew install gitui
gitui
```

#### GUI 工具

- **GitHub Desktop**: 官方桌面客户端
- **GitKraken**: 功能强大的 Git 客户端
- **SourceTree**: Atlassian 的免费 Git 客户端
- **Fork**: 快速友好的 Git 客户端
- **SmartGit**: 商业 Git 客户端

### Git 工作流工具

#### Conventional Commits

标准化提交消息格式：

```bash
# 格式
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]

# 类型
feat:     新功能
fix:      修复
docs:     文档
style:    格式
refactor: 重构
test:     测试
chore:    构建过程或辅助工具的变动

# 示例
feat(auth): add OAuth2 authentication
fix(api): resolve user creation bug
docs(readme): update installation instructions
```

#### Commitizen

交互式提交工具：

```bash
# 安装
npm install -g commitizen
npm install -g cz-conventional-changelog

# 配置
echo '{ "path": "cz-conventional-changelog" }' > ~/.czrc

# 使用
git cz
```

#### Husky

Git Hooks 管理工具：

```bash
# 安装
npm install husky --save-dev

# 配置
npx husky install
npx husky add .husky/pre-commit "npm test"
npx husky add .husky/commit-msg "npx --no -- commitlint --edit \$1"
```

### Git 性能优化工具

#### Git 配置优化

```bash
# 启用并行索引预加载
git config --global core.preloadindex true

# 启用文件系统监视
git config --global core.fsmonitor true

# 启用稀疏检出
git config --global core.sparseCheckout true

# 设置压缩级别
git config --global core.compression 9

# 启用 delta 压缩
git config --global core.deltaBaseCacheLimit 2g
```

#### Git 维护

```bash
# 垃圾回收
git gc --aggressive --prune=now

# 重新打包
git repack -a -d --depth=250 --window=250

# 优化仓库
git maintenance start
git maintenance run --auto
```

## 最佳实践

### 提交消息规范

```bash
# 好的提交消息
feat: add user authentication system
fix: resolve memory leak in data processing
docs: update API documentation
style: format code according to style guide
refactor: simplify user validation logic
test: add unit tests for user service
chore: update dependencies

# 避免的提交消息
update
fix bug
changes
wip
```

### 分支管理

```bash
# 分支命名规范
feature/user-authentication
bugfix/memory-leak-fix
hotfix/security-patch
release/v1.2.0

# 分支策略
- 主分支保持稳定
- 功能分支从主分支创建
- 及时删除已合并的分支
- 使用 Pull Request/Merge Request
```

### 代码审查

```bash
# 审查清单
- 代码质量和风格
- 功能完整性
- 测试覆盖
- 文档更新
- 安全性考虑
- 性能影响
```

### 安全最佳实践

```bash
# 避免提交敏感信息
- 使用 .gitignore 排除敏感文件
- 使用环境变量存储密钥
- 定期检查提交历史中的敏感信息
- 使用 git-secrets 等工具

# 示例 .gitignore
.env
*.key
*.pem
secrets/
config/database.yml
```

## 故障排除

### 常见问题

```bash
# 撤销最后一次提交
git reset --soft HEAD~1

# 撤销已推送的提交
git revert <commit-hash>

# 解决合并冲突
git status  # 查看冲突文件
# 手动编辑冲突文件
git add <resolved-file>
git commit

# 恢复删除的文件
git checkout <commit-hash> -- <file>

# 查看文件历史
git log --follow <file>

# 清理工作区
git clean -fd
git reset --hard HEAD
```

### 性能问题

```bash
# 大仓库优化
git clone --depth 1 <repository-url>
git fetch --unshallow

# 减少磁盘使用
git gc --aggressive
git repack -a -d --depth=250 --window=250

# 检查仓库大小
du -sh .git
git count-objects -vH
```

## 参考资源

- [Git 官方文档](https://git-scm.com/doc)
- [Git 教程](https://git-scm.com/book/en/v2)
- [GitHub Guides](https://guides.github.com/)
- [Git LFS 文档](https://git-lfs.github.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [Git 最佳实践](https://github.com/trein/dev-best-practices)
