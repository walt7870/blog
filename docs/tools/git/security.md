# Git 安全与仓库治理

Git 会把提交历史长期保存。敏感信息、大文件、生成物和错误配置一旦进入历史，不是删掉当前文件就结束了。仓库治理的重点是：哪些东西不能进仓库、已经进了怎么处理、如何降低再次发生的概率。

## 不应提交的内容

常见禁止提交：

- `.env`、本地配置、数据库密码。
- 私钥、token、访问密钥，以及含私钥的证书容器。
- 构建产物、缓存、日志。
- 本地 IDE 用户配置；团队共享的格式化和调试配置可按约定提交。
- 大型二进制文件，除非使用 Git LFS。
- 用户数据、生产数据、脱敏不完整的数据样本。

## .gitignore

`.gitignore` 只对未被 Git 跟踪的文件生效。已经提交过的文件，即使后来加入 `.gitignore`，仍然会被继续跟踪。

示例：

```text
# 环境配置
.env
.env.*
!.env.example

# 密钥
*.key
*.pem
secrets/

# 日志和缓存
*.log
.cache/
dist/
build/
node_modules/

# 本机 IDE 状态（团队配置按项目约定保留）
.idea/workspace.xml
```

如果文件已经被跟踪，需要先从索引移除：

```bash
git rm --cached .env
git commit -m "chore: 停止跟踪本地环境配置"
```

本地文件会保留，但 Git 不再跟踪。

`.pem` 可能保存私钥，也可能只包含公开证书，扩展名无法判断敏感性。忽略规则用于减少误提交，不能代替内容检查；公开根证书是否入库由发布与更新策略决定。`rm --cached` 后文件仍在旧提交中，也可能在其他分支继续被跟踪。

## .gitattributes

`.gitattributes` 用于定义文件属性，例如换行、diff、merge、LFS。

示例：

```text
* text=auto
*.sh text eol=lf
*.bat text eol=crlf
*.png binary
*.jpg binary
```

团队跨 Windows、macOS、Linux 开发时，建议明确换行策略，减少无意义 diff。

## 敏感信息已经提交

处理顺序：

1. 立即吊销泄露的密钥或 token。
2. 从当前代码删除敏感文件。
3. 判断是否需要清理 Git 历史。
4. 通知团队重新拉取或重置受影响分支。

删除当前文件：

```bash
git rm --cached .env
echo ".env" >> .gitignore
git add .gitignore
git commit -m "chore: 从仓库移除本地环境配置"
```

这不会清理历史中的敏感内容。历史清理会改写提交历史，应在团队确认后执行。

## 清理历史

历史清理适用于密钥、超大文件、误提交数据集等严重问题。

常见工具：

- `git filter-repo`
- BFG Repo-Cleaner

清理应在专用的新 Clone 中进行，先冻结受影响引用的写入、保存原始完整对象标识，再使用工具按明确路径或内容规则重写。例如以下只展示清理一个路径的本地步骤：

```bash
git filter-repo --path .env --invert-paths
git log --all -- .env
git fsck --full
```

空日志只说明该路径不在当前引用可见历史中，还要检查重命名前路径、其他文件中的同一凭据及需要保留的标签。构建与依赖验收通过后，核对重写前后每条受影响引用的映射。`filter-repo` 通常会移除 `origin`，应在本地验证后再恢复已核实的远端地址。

向远端发布时逐条使用明确租约，例如 `git push --force-with-lease=refs/heads/main:<清理前远端完整OID> origin refs/heads/main:refs/heads/main`。租约不匹配就停止调查，不能重新读取最新值后盲目覆盖。其他分支和标签分别评估、审批与更新；禁止把全量 `--all`、`--tags` 强推当成清理模板。平台隐藏的 MR 引用和缓存可能需要管理员按平台机制处理，单次 Push 不会清除所有副本。

风险：

- 所有协作者需要重新同步本地仓库。
- 旧 clone、fork、CI 缓存里可能仍有泄露内容。
- 密钥必须先吊销，不能只依赖历史清理。

## 大文件治理

Git 不适合直接存储频繁变化的大二进制文件。

检查仓库大小：

```bash
du -sh "$(git rev-parse --git-common-dir)"
git count-objects -vH
```

查找大文件：

```bash
git rev-list --objects --all |
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' |
  awk '$1 == "blob"' |
  sort -k3 -nr |
  head
```

处理方式：

- 图片、设计稿、视频、压缩包使用 Git LFS。
- 构建产物放制品仓库。
- 可再生成文件不进入 Git。

## Git LFS

初始化：

```bash
git lfs install
```

跟踪文件类型：

```bash
git lfs track "*.psd"
git lfs track "*.zip"
git lfs track "*.mp4"
git add .gitattributes
git commit -m "chore: 使用 LFS 跟踪大型资源"
```

查看 LFS 文件：

```bash
git lfs ls-files
git lfs status
```

注意：已经进入普通 Git 历史的大文件，不会因为新增 LFS 规则自动迁移，需要单独清理或迁移。

## 凭据管理

HTTPS 远端通常使用个人访问令牌或 OAuth 凭据，SSH 远端使用私钥。无论采用哪种方式，都不应把口令和令牌写进远端 URL、脚本、Shell 历史或仓库配置。

查看凭据助手来源：

```bash
git config --show-origin --get-all credential.helper
```

常见选择：

- macOS 使用系统钥匙串，例如 `osxkeychain`。
- Windows 使用 Git Credential Manager。
- Linux 使用桌面密钥环或组织提供的凭据助手。
- CI 使用平台 Secret 和短期凭据，按环境限制权限。

不建议长期使用 `credential.helper store`，它会把凭据以明文形式保存在用户目录。令牌应遵循最小权限、短有效期、可吊销和定期轮换原则。

## 提交与标签签名

签名验证提交或标签的内容与签名一致，并证明签名时有人持有相应私钥，常见格式包括 GPG、SSH 和 X.509。提交中的作者字段仍可任意填写，签名者也可能是机器人；真实身份还需可信公钥映射，授权仍需平台策略。它不能替代代码审查和分支保护。

查看签名：

```bash
git log --show-signature
git verify-commit <commit>
git verify-tag <tag>
```

创建签名提交或带说明的签名标签：

```bash
git commit -S -m "fix(auth): 拒绝过期令牌"
git tag -s v1.4.0 -m "发布 v1.4.0"
```

组织需要同时维护可信公钥来源、密钥吊销流程、机器人签名规则和托管平台的 Verified 状态。签名验证成功只说明加密身份匹配，发布授权仍由组织策略决定。

## 备份与灾难恢复

Reflog 只记录当前 Clone 的本地引用移动，不是备份。可靠恢复应同时保护远端引用、标签、LFS 对象、发布制品和运行配置。

创建可离线传输的 Git Bundle：

```bash
git bundle create repository-backup.bundle --all
git bundle verify repository-backup.bundle
git clone repository-backup.bundle recovered-repository
```

Bundle 保护所选引用可达的 Git 对象，不包含未提交工作区、独立 LFS 正文、子模块仓库、平台 Issue/MR、CI Secret 或运行数据库。恢复订单项目时，先恢复 Git 快照，再取对应 LFS 与依赖制品，重建配置并执行构建；仅能 `git log` 不算业务恢复成功。

![Git 泄露处置与备份边界](/git/security-recovery-boundaries.svg)

也可以维护独立镜像：

```bash
git clone --mirror <repository-url> repository.git
git -C repository.git remote update --prune
```

镜像会同步删除远端已经删除的引用，因此不能作为唯一的时间点备份。备份需要版本保留、异地副本和定期恢复演练。

发现对象损坏时：

1. 停止在原仓库继续提交、维护或清理。
2. 复制整个仓库和 `.git/` 保存现场。
3. 运行 `git fsck --full` 记录缺失或损坏对象。
4. 从可靠远端、其他完整 Clone 或时间点备份确认对象来源。
5. 在副本中恢复并重新运行完整性检查与业务构建。

Partial Clone、Shallow Clone 和未下载完整 LFS 对象的工作区不能直接当作完整备份。对象存储和完整性检查详见 [对象库与大型仓库](./internals-large-repositories.md)。

## 权限与保护

托管平台上建议配置：

- 主分支保护。
- 必须通过 PR/MR 合并。
- 必须通过 CI。
- 至少一名审查者批准。
- 禁止直接 push 到主分支。
- 限制谁能创建 tag 和发布版本。

Git 本身负责版本历史，平台负责权限和流程治理。

## 排查清单

- `git status --ignored` 查看忽略规则是否生效。
- `git check-ignore -v <file>` 查看某文件被哪条规则忽略。
- `git ls-files <file>` 判断文件是否已被跟踪。
- `git log --all -- <file>` 查看文件历史。
- 发现密钥泄露后先吊销，再清理历史。
- `git log --show-signature` 检查关键提交和发布标签的签名状态。
- `git fsck --full` 检查对象与引用完整性。
- 定期验证 Bundle、镜像和 LFS 备份能否真实恢复。
