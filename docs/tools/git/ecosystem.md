# Git 生态工具

Git 本体提供版本控制能力，围绕它形成了托管平台、评审、CI/CD、Hooks、大文件、图形化客户端和 GitOps 等生态。选工具时先看团队要解决的问题，不要只按热度堆工具。

![Git 工具在提交和交付中的职责](/git/tool-delivery-boundaries.svg)

以订单导出为例：本地 Hook 提前检查参数校验代码，平台 CI 在评审提交上重跑测试，构建作业保存对应提交的镜像 digest，部署作业再用专用身份切换环境。四步分别减少反馈等待、实施合并门禁、固定产物和控制发布权限；安装一个本地工具不能替代整条链路。

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
#!/bin/sh
npm test
```

上面是 `pre-commit` 文件正文。默认 Hook 路径可用以下命令定位；若配置了 `core.hooksPath`，应按该配置使用的目录管理：

```bash
git config --show-origin --get core.hooksPath
git rev-parse --git-path hooks
# 保存脚本后，对实际路径下的 pre-commit 设置可执行权限
```

团队项目通常使用 Husky、pre-commit 等工具把 Hook 配置纳入仓库，而不依赖手动复制内部文件。Worktree 或 Submodule 中 `.git` 可以是指向管理目录的文件，不能假定它总是目录。本地 Hook 可跳过，也可能未安装，强制规则仍由服务端实施。

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

lint-staged 按暂存路径选择文件。默认会为部分暂存文件临时隐藏未暂存变化，并暂存任务修改的文件，因此格式化器可能改变本次提交内容。提交前查看 `git diff --cached`，不要把“选择了文件”理解为格式化器只修改选中的行。关闭备份或隐藏机制会改变失败恢复行为，应先用一次部分暂存场景验证。

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

适合 Python、Go、Java、前端混合仓库。`rev` 是固定版本示例，升级时审查 Hook 变更并通过锁定版本的 CI 复验，不用浮动分支代替版本。

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
git commit -m "chore: 纳入演示视频"
git lfs ls-files
```

大文件治理细节见 [安全与仓库治理](./security.md)。

LFS 指针进入 Git 不代表二进制已能下载。CI、备份和协作者还需要 LFS 服务访问权限；额度耗尽或对象缺失时，Git 历史可读而文件内容仍不可用。无需保留源码版本关系的构建包应放制品仓库。

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

自建平台的完整实践见 [GitLab CI/CD 搭建与发布](./gitlab-cicd.md)，覆盖 Runner 执行模型、受保护分支、构建与部署权限、静态站点和容器发布，以及通知和回滚。

### 可追踪的发布链路

一次可审计、可回滚的发布至少要能串起：

```text
源提交 -> 受保护标签或发布记录 -> 流水线运行 -> 制品摘要 -> 部署环境
```

建议保留：

- 源提交的完整对象标识，以及触发发布的标签。
- 流水线运行编号、构建参数和依赖锁文件。
- 镜像摘要或制品校验和，不只记录可移动标签。
- 每个环境实际部署的版本、时间和审批记录。
- 回滚目标、数据库兼容边界和恢复步骤。

发布失败时，应能从环境中的制品摘要反查源码提交，也能从源码提交找到对应流水线和制品。仅以分支名、`latest` 或文件名作为版本依据，无法保证复现。

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

例如把订单 API 的镜像 digest 从 A 改到 B，控制器会尝试收敛到 B；把配置提交恢复到 A，只会再次声明旧配置。已执行的数据库迁移、外部消息或数据写入不会自动撤销。验收要同时核对控制器同步结果、工作负载就绪和真实业务响应，不能只看 Git 提交已合并。

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
