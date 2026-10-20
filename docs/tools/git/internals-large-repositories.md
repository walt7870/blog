# Git 对象库、存储与大型仓库

Git 的日常命令最终都落到两类数据上：不可变的对象和可移动的引用。理解对象怎样组织、何时变得不可达、Packfile 怎样压缩，以及大型仓库究竟大在哪里，才能判断仓库变慢、克隆过久或对象损坏时该检查什么。

![Git 对象存储与维护](/git/git-object-storage.svg)

## 对象关系

普通 Clone 的对象库通常位于 `.git/objects/`，Worktree、Submodule 或替代对象目录的布局可能不同。用 `git rev-parse --git-path objects` 定位对象目录，用 `git rev-parse --git-common-dir` 定位共享管理目录。核心对象有四类：

| 对象 | 保存内容 | 典型关系 |
| --- | --- | --- |
| `blob` | 文件内容，不包含文件名 | 被 `tree` 引用 |
| `tree` | 目录项、文件名、权限和子对象标识 | 引用 `blob` 或子 `tree` |
| `commit` | 顶层 `tree`、父提交、作者、提交者和说明 | 引用一个 `tree` 和零到多个父提交 |
| `tag` | 被标记对象、标签创建者、说明和可选签名 | 通常引用 `commit` |

查看对象类型和内容：

```bash
git cat-file -t HEAD
git cat-file -p HEAD
git cat-file -p HEAD^{tree}
```

一次提交并不直接嵌入所有文件，而是引用一棵目录树。没有变化的目录和文件内容可以继续复用已有对象，因此提交表现为完整快照，存储时又不必复制所有内容。

## 内容寻址与完整性

对象标识由对象类型、长度和内容共同计算。内容发生变化后会得到新的对象标识，上层 `tree` 和 `commit` 的引用也会随之改变。

这能检测对象内容是否与标识一致，但不能单独证明“是谁创建了提交”或“谁有权发布”。作者可信需要提交签名、平台身份和权限规则共同保证。

查看当前仓库使用的对象格式：

```bash
git rev-parse --show-object-format
```

脚本和外部系统不应假设对象标识永远是固定长度，也不应把缩写哈希当作跨仓库的永久主键。

## 引用、HEAD 与 Reflog

分支、远程跟踪分支和标签都是引用：

```text
refs/heads/main
refs/remotes/origin/main
refs/tags/v1.4.0
```

引用为对象图提供可读入口。只要从引用能够沿父提交和目录树到达某个对象，该对象就是可达的。

```bash
git show-ref
git for-each-ref --format='%(refname) %(objectname)'
```

`HEAD` 通常指向当前分支。Reflog 记录本地引用移动过程，因此分支误删、错误 `reset` 或 Rebase 后，旧提交可能仍能通过 Reflog 找回：

```bash
git reflog
git switch -c recovery HEAD@{2}
```

Reflog 不是长期备份。记录会过期，不可达对象也可能在后续维护中被清理。

## 松散对象与 Packfile

新对象通常先以松散对象形式写入 `.git/objects/`。随着对象增多，Git 会把对象整理进 Packfile：

```text
.git/objects/pack/pack-xxxx.pack
.git/objects/pack/pack-xxxx.idx
```

`.pack` 保存压缩后的对象数据，`.idx` 用于从对象标识定位 Packfile 中的位置。相似对象可以使用 Delta 表达差异，减少历史版本重复内容占用的空间。

查看对象和 Pack 状态：

```bash
git count-objects -vH
object_dir=$(git rev-parse --git-path objects)
for pack_index in "$object_dir"/pack/*.idx; do
  [ -f "$pack_index" ] || continue
  git verify-pack -v "$pack_index"
done
```

不要手工删除 `.git/objects/pack/` 下的文件。索引、Packfile、多包索引和提交图之间存在配套关系，缺少其中一部分可能让对象无法读取。

## 维护与清理

常规维护优先使用：

```bash
git maintenance run --auto
git gc
```

`maintenance run --auto` 按启用任务的条件决定是否执行，可能不做任何工作；不能把一次调用当成已完成全量压缩和清理。`gc` 则协调对象打包及满足保留条件的数据清理，仍受配置、并发写入和过期时间影响。日常不应频繁运行：

```bash
git gc --aggressive
```

`--aggressive` 会投入更多时间重新计算压缩关系，不等于一定能显著减小仓库，也不能解决误提交大文件的根因。

维护前先测量：

```bash
du -sh "$(git rev-parse --git-common-dir)"
git count-objects -vH
git status -sb
```

如果仓库持续膨胀，应先确认是大 Blob、引用数量、历史长度还是构建产物进入历史，再选择 LFS、历史清理、仓库拆分或工作区优化。

## 完整性检查

对象读取异常、磁盘故障或迁移后，可以运行：

```bash
git fsck --full
```

`fsck` 检查对象有效性和引用连通性。常见结果包括：

| 结果 | 含义 | 下一步 |
| --- | --- | --- |
| `dangling commit` | 检查范围内没有其他对象或根直接使用该提交 | 检查内容并建立恢复引用；不代表所有不可达提交都会单独列出 |
| `missing blob` | 提交或目录树引用的文件对象缺失 | 从可靠远端或备份补回对象 |
| `bad object` | 对象损坏或引用指向无效对象 | 停止写入，保存现场并检查存储 |
| 无输出 | 没有发现需要报告的完整性问题 | 再检查工作区、远端和业务制品 |

对象损坏时不要立刻复制文件覆盖 `.git/`。先保留损坏仓库副本，再确认可靠远端、其他 Clone 或备份是否包含缺失对象。

`unreachable` 与 `dangling` 不同：一串失去引用的提交中，后一个仍引用前一个，前一个不可达却未必悬空。默认 `fsck` 还会把索引和 Reflog 等作为根；使用 `--no-reflogs` 会改变结果。`missing blob` 在完整仓库中是故障线索，Partial Clone 中还要核对 Promisor 对象约定和按需下载能力，不能直接删除引用“消除报错”。

## 大型仓库的四个维度

“仓库很大”至少要区分四种情况：

| 维度 | 常见现象 | 优先方向 |
| --- | --- | --- |
| 文件数量多 | `status`、检出、文件系统扫描慢 | Sparse Checkout、文件系统监控、模块边界 |
| 历史很深 | `log`、克隆、历史分析耗时 | Shallow Clone 仅用于短期任务，服务端维护提交图 |
| Blob 总体积大 | 克隆和磁盘占用高 | Partial Clone、Git LFS、清理误提交大文件 |
| 引用和分支多 | Fetch、协商、服务端维护变慢 | 清理失效引用、限制长期分支、优化 Refspec |

先测量再优化：

```bash
git count-objects -vH
git branch -a
git tag --list | wc -l
git rev-list --objects --all |
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' |
  awk '$1 == "blob"' |
  sort -k3 -nr |
  head
```

## Shallow、Partial、Sparse 与 LFS

这些能力解决的问题不同：

| 能力 | 少取什么 | 本地是否拥有完整历史 | 主要代价 |
| --- | --- | --- | --- |
| Shallow Clone | 旧提交 | 否 | 历史、合并基线和 Bisect 受限 |
| Partial Clone | 部分 Blob 或 Tree | 提交历史可以完整，对象按需补取 | 离线能力下降，服务器需支持过滤 |
| Sparse Checkout | 规则未选中的工作区路径 | 对象库可能仍完整 | 隐藏路径仍被版本管理；锥形模式也保留部分上级目录文件 |
| Git LFS | 大文件正文进入独立存储 | Git 保存指针和普通历史 | 依赖 LFS 服务、配额和权限 |

### Partial Clone

不预取历史中的所有文件内容：

```bash
git clone --filter=blob:none <repository-url>
```

缺失 Blob 在命令真正需要时从 Promisor Remote 获取。普通 Clone 最后的检出仍会下载当前版本需要的文件；过滤主要减少历史 Blob 的预取。断网前需要确认将要访问的对象已经在本地，CI 和备份流程也不能把 Partial Clone 误认为完整副本。

### Sparse Checkout

只把部分路径放入工作区：

```bash
git clone --filter=blob:none --sparse <repository-url>
cd <repo>
git sparse-checkout set services/order shared/contracts
```

Sparse Checkout 不会让其他路径停止被跟踪，只是控制哪些路径出现在当前工作区。

### Git LFS

对需要版本化的大型二进制文件：

```bash
git lfs install
git lfs track "*.psd"
git add .gitattributes
git commit -m "chore: 使用 LFS 管理设计资源"
```

已经进入普通 Git 历史的大文件不会自动迁移。迁移会改写历史，需要单独评估协作者、Fork、CI 缓存和发布引用。

## 排查闭环

仓库变慢或异常时按以下顺序处理：

1. `git status -sb` 确认当前操作状态。
2. `git count-objects -vH` 区分松散对象与 Pack 规模。
3. 检查大 Blob、分支和标签数量。
4. `git fsck --full` 检查对象和引用完整性。
5. 根据瓶颈选择维护、Partial Clone、Sparse Checkout、LFS 或历史治理。
6. 在副本上验证恢复或迁移方案，再处理共享仓库。

维护命令只能整理现状，仓库边界、制品存储和团队流程才决定增长是否会再次发生。
