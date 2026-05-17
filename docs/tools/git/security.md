# Git 安全与仓库治理

Git 会把提交历史长期保存。敏感信息、大文件、生成物和错误配置一旦进入历史，不是删掉当前文件就结束了。仓库治理的重点是：哪些东西不能进仓库、已经进了怎么处理、如何降低再次发生的概率。

## 不应提交的内容

常见禁止提交：

- `.env`、本地配置、数据库密码。
- 私钥、证书、token、访问密钥。
- 构建产物、缓存、日志。
- 本地 IDE 用户配置。
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

# IDE
.idea/
.vscode/
```

如果文件已经被跟踪，需要先从索引移除：

```bash
git rm --cached .env
git commit -m "chore: stop tracking local env file"
```

本地文件会保留，但 Git 不再跟踪。

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
git commit -m "chore: remove local env from repository"
```

这不会清理历史中的敏感内容。历史清理会改写提交历史，应在团队确认后执行。

## 清理历史

历史清理适用于密钥、超大文件、误提交数据集等严重问题。

常见工具：

- `git filter-repo`
- BFG Repo-Cleaner

清理后通常需要强推：

```bash
git push --force-with-lease --all
git push --force-with-lease --tags
```

风险：

- 所有协作者需要重新同步本地仓库。
- 旧 clone、fork、CI 缓存里可能仍有泄露内容。
- 密钥必须先吊销，不能只依赖历史清理。

## 大文件治理

Git 不适合直接存储频繁变化的大二进制文件。

检查仓库大小：

```bash
du -sh .git
git count-objects -vH
```

查找大文件：

```bash
git rev-list --objects --all |
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' |
  awk '/^blob/ {print $3, $4}' |
  sort -nr |
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
git commit -m "chore: track large assets with lfs"
```

查看 LFS 文件：

```bash
git lfs ls-files
git lfs status
```

注意：已经进入普通 Git 历史的大文件，不会因为新增 LFS 规则自动迁移，需要单独清理或迁移。

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
