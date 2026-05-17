# Git 生态工具

Git 本体提供版本控制能力，围绕它形成了托管平台、评审、CI/CD、Hooks、大文件、图形化客户端和 GitOps 等生态。选工具时先看团队要解决的问题，不要只按热度堆工具。

## 托管平台

常见平台：

- GitHub
- GitLab
- Bitbucket
- Gitea
- Gerrit

平台通常提供：

- 仓库托管和权限。
- Pull Request / Merge Request。
- Issue、Project、Wiki。
- CI/CD。
- Release 和制品。
- 分支保护、审查规则、代码扫描。

Git 是底层版本控制，平台是协作和治理层。

## Hooks

Git Hooks 是 Git 操作前后自动执行的脚本。

常见客户端 Hooks：

| Hook | 时机 | 常见用途 |
| --- | --- | --- |
| `pre-commit` | 提交前 | 格式化、lint、测试 |
| `commit-msg` | 提交信息生成后 | 校验提交信息 |
| `pre-push` | 推送前 | 跑测试、检查分支 |
| `post-merge` | 合并后 | 安装依赖、生成文件 |

示例：

```bash
# .git/hooks/pre-commit
#!/bin/sh
npm test
```

需要可执行权限：

```bash
chmod +x .git/hooks/pre-commit
```

团队项目通常不用直接提交 `.git/hooks`，而是使用 Husky、pre-commit 等工具把 Hook 配置纳入仓库。

## Husky 与 lint-staged

前端项目常见组合：

```bash
npm install --save-dev husky lint-staged
npx husky init
```

`package.json` 示例：

```json
{
  "lint-staged": {
    "*.{js,ts,vue}": ["eslint --fix", "prettier --write"],
    "*.{md,json}": ["prettier --write"]
  }
}
```

`.husky/pre-commit`：

```bash
npx lint-staged
```

用途：只检查本次提交涉及的文件，减少提交前等待时间。

## pre-commit

多语言项目常用 `pre-commit` 管理 Hooks。

`.pre-commit-config.yaml` 示例：

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
```

安装：

```bash
pre-commit install
pre-commit run --all-files
```

适合 Python、Go、Java、前端混合仓库。

## Git LFS

Git LFS 用指针文件替代大文件内容，把大文件存储在 LFS 服务中。

适合：

- 图片、视频、音频。
- 设计稿。
- 模型文件。
- 不适合频繁 diff 的二进制资源。

基础命令：

```bash
git lfs install
git lfs track "*.mp4"
git add .gitattributes
git add demo.mp4
git commit -m "chore: add demo video"
git lfs ls-files
```

大文件治理细节见 [安全与仓库治理](./security.md)。

## 命令行增强

### tig

文本模式查看历史：

```bash
brew install tig
tig
```

### lazygit

终端交互式 Git UI：

```bash
brew install lazygit
lazygit
```

### delta

增强 diff 阅读体验：

```bash
brew install git-delta
git config --global core.pager delta
git config --global interactive.diffFilter "delta --color-only"
```

## GUI 客户端

常见选择：

- GitHub Desktop：适合 GitHub 用户和新手。
- SourceTree：适合 Atlassian 体系。
- Fork：轻量、响应快。
- GitKraken：功能完整，偏商业化。
- IDE 内置 Git：适合日常提交、diff、冲突处理。

GUI 适合看历史、解决冲突、做审查前自查；关键操作仍建议理解对应 Git 命令。

## CI/CD

Git 推送常作为流水线触发源。

常见触发：

```text
push main        -> 构建、测试、部署测试环境
pull_request     -> lint、测试、预览环境
tag v*           -> 构建 release、发布制品
```

推荐门禁：

- PR/MR 必须通过 lint 和测试。
- 主分支必须保护。
- 发布使用 tag 或 release 分支触发。
- 密钥放平台 Secret，不写入仓库。

## GitOps

GitOps 把 Git 仓库作为系统期望状态来源。常见于 Kubernetes 部署。

基本链路：

```text
修改部署配置 -> 提交到 Git -> CI 检查 -> GitOps 控制器同步到集群
```

适合：

- Kubernetes 配置管理。
- 多环境部署记录。
- 需要审计和回滚的基础设施变更。

注意：

- 生产密钥不应明文提交。
- 环境差异要清晰拆分。
- 自动同步前要有审查和回滚策略。

## 选型

| 需求 | 工具方向 |
| --- | --- |
| 统一提交格式 | commitlint、Commitizen |
| 提交前检查 | Husky、pre-commit、lint-staged |
| 管理大文件 | Git LFS |
| 看历史和 diff | tig、delta、IDE Git |
| 降低命令行门槛 | lazygit、GUI 客户端 |
| 团队评审和权限 | GitHub、GitLab、Gitea |
| 自动构建发布 | GitHub Actions、GitLab CI、Jenkins |
| 配置即部署 | Argo CD、Flux |
