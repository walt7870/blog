# Git 协作流程

订单导出从开发到上线，会经过任务分支、评审、测试、集成和发布。Git 记录提交关系，平台管理评审和门禁，发布系统决定哪个制品进入哪个环境；三者需要用提交 ID 和制品摘要衔接。

![任务分支评审集成与发布闭环](/git/git-team-workflow.svg)

## 开始一个独立任务

先处理工作区修改，再确认 main 的上游。以下适用于本地 main 只跟随 origin/main 的常规场景，发生分叉会停止，需先理解双方提交。

```bash
git status -sb
git switch main
git pull --ff-only
git switch -c feature/order-export
```

一个任务分支承载一个主要交付目标。实现导出时顺手升级全部依赖，会让评审、回滚和故障定位都失去明确边界。确需独立验证的重构，拆成先后依赖的变更，并在评审中说明关系。

## 开发、同步和评审

提交前检查 status、工作区 diff 和暂存 diff，按文件或补丁选取范围。提交应能说明意图，并带上权限、空结果和导出失败的测试。命令细节见 [日常命令](./git.md)，提交组织见 [提交规范](./conventions.md)。

```bash
git fetch origin
git merge origin/main
# 检查差异并运行测试
git push -u origin feature/order-export
```

这组同步保留已有提交 ID。个人未被依赖的分支可按团队约定选择 rebase；共享分支不能因为希望历史线性就直接改写。合并成功后仍要验证业务：同事新增的权限校验与自己的空列表处理可能在无文本冲突的情况下互相影响。

PR/MR 描述应交代触发问题、最终行为、验证方法和实际结果。涉及数据库或配置时，写清兼容窗口和上线顺序；测试未覆盖的外部系统应明确范围。评审批准和 CI 通过都要对应最终提交，后续又推送修改时需重新满足门禁。

## 选择工作流

| 工作方式 | 历史与发布组织 | 适用条件与成本 |
| --- | --- | --- |
| 短任务分支与 PR | main 加短期 feature 分支，审核后集成 | 适合持续交付；main 可发布还取决于测试、迁移和配置兼容 |
| 主干开发 | 频繁集成到主干，分支很短或直接受控提交 | 依赖快速测试、小步修改和有退出计划的功能开关 |
| 发布分支 | main 持续开发，release 分支维护指定版本 | 适合发布窗口或多版本支持；需追踪修复回流 |
| Git Flow | develop、release、hotfix 与 main 分工 | 适合明确版本节奏；长期分支增加同步与补丁遗漏成本 |

团队规模不能单独决定工作流。若移动端等待商店审核，但服务端每天更新，可采用各自发布边界；无需强迫所有模块使用同一条长分支。仓库组织取舍见 [仓库策略](./repository-strategies.md)。

## 合并方式决定历史形态

merge commit 保留原提交和集成节点；squash merge 把功能的最终差异形成一个新提交；rebase merge 通常重放提交形成线性历史。选型看是否需要每个开发提交、评审边界和可回滚单元，而不是只看图形是否整齐。

合并后先核对目标分支最终内容和 CI，再清理本地分支：

```bash
git switch main
git pull --ff-only
git branch -d feature/order-export
git fetch origin --prune
```

`branch -d` 基于祖先关系检查。squash/rebase merge 后原提交可能未成为 main 祖先，删除会被拒绝；先核对评审记录和差异，保留还需要的内容，再决定是否删除。`fetch --prune` 清理远程跟踪引用，不会删除本地分支；远程分支删除也应符合团队策略。

## 版本标签与实际发布

正式版本应从已确认的提交打标签，并记录构建来源。下面假设该提交已通过发布检查：

```bash
git tag -a v1.4.0 REPLACE_WITH_RELEASE_COMMIT -m "发布 v1.4.0"
git show v1.4.0
git push origin v1.4.0
```

tag 是引用，不等于部署完成，也不天然不可变。平台可保护标签并限制发布权限，流水线应把提交 ID、制品摘要和环境验收结果一起记录。回滚宜使用已验证的旧制品，不能假设同一 tag 再构建就得到完全相同的依赖与二进制。

## 紧急修复从实际生产基线开始

main 可能已包含未发布功能，因此先定位生产对应 tag 或提交，而不是直接从 main 创建 hotfix。以下占位值必须替换为实际生产提交：

```bash
git fetch origin --tags
git switch -c hotfix/payment-timeout REPLACE_WITH_PRODUCTION_COMMIT
# 修复、测试、提交，再推送进行评审
git push -u origin hotfix/payment-timeout
```

修复发布后，将相同意图带回 main 和仍受支持的 release 分支；可以 merge，也可对独立补丁使用 `cherry-pick -x`。回流前检查依赖和是否已包含等价修改，分别在各分支测试。只有生产修复、主干回流和其他维护版本的处理状态都可追踪，紧急修复才形成闭环。
