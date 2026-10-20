# 归档、压缩与恢复验证

把订单导出目录做成一个文件，涉及三个不同目标：归档保存文件路径及部分元数据，压缩减少字节，备份还要保证数据一致、保留策略和可恢复性。生成一个`.tar.gz`只完成前两步，不能直接证明备份可用。常用入口见[压缩归档速查](./archive-compress.md)。

![从稳定源数据到隔离恢复验收的归档流程](/linux/archive-restore-contract.svg)

## 先选容器，再选压缩算法

tar把多个文件组成一个归档，通常不负责压缩；gzip、bzip2和xz处理字节流。`tar.gz`可理解为“装进同一个箱子，再缩小箱子的传输体积”。gzip对多个输入文件通常逐个生成`.gz`，`gzip -r`也不是把目录打成一个包。这里讨论的工具都用于无损压缩，不把音视频有损编码混入文件恢复流程。

ZIP和7z本身支持多个成员，适合相应接收端；ZIP常用于跨平台交付，但文件名编码、符号链接、权限和大文件兼容仍要按接收工具验证。7-Zip在不同系统可能叫`7z`或`7zz`，RAR的创建和解包工具、仓库许可与可用性也不同，不按发行版名称承诺一个安装命令通用。

压缩率没有固定排名。日志、CSV通常可压缩，已压缩的视频、APK、JPEG或随机密文可能收益很低，甚至变大。选择时同时看产物大小、压缩时间、解压时间、峰值内存和接收端支持；不要为了少几个字节让恢复端超过内存预算。

## 创建之前固定数据与路径合同

归档位置应在输入目录之外，避免把正在增长的输出装进自己。用`tar -C 源父目录 相对目录`生成相对成员路径，恢复时再用`-C 目标目录`确定落点；`-C`不仅用于解包，也影响后续输入名称的解析。先决定归档顶层是否包含`orders/`，否则恢复命令容易多套一层或覆盖错误位置。

运行中的数据库文件、持续写入的日志、虚拟机镜像可能在读取期间变化。tar提示“file changed as we read it”时，不应把存在输出文件当作成功；即使没有告警，多文件之间也不一定处于同一业务时刻。数据库用对应备份/导出机制，普通目录按需求暂停写入或使用一致性快照，再对稳定视图归档。

GNU tar默认保存符号链接本身，`-h`会跟随链接，可能把原先范围外的数据带进来。ACL、扩展属性、SELinux标签、稀疏文件与UID/GID恢复需要明确的工具选项、文件系统及权限支持，不能用一个`-p`承诺全部保真。配置与数据混合目录还要排除临时文件、凭据和不应发布的内容，并检查最终成员清单。

## 可运行实验：创建、校验、恢复、比较

下面使用Bash、GNU tar、gzip和GNU coreutils，在自己的临时目录内完成流程。实验含中文和空格文件名；它不处理真实订单数据，也不修改系统目录。

```bash
set -euo pipefail
blog_archive_dir=$(mktemp -d)
trap 'rm -rf -- "$blog_archive_dir"' EXIT
mkdir -p "$blog_archive_dir/source/orders" "$blog_archive_dir/restored"
printf 'order_id,status\n1001,paid\n' > "$blog_archive_dir/source/orders/订单 列表.csv"
printf 'format=csv\n' > "$blog_archive_dir/source/orders/export.conf"
ln -s export.conf "$blog_archive_dir/source/orders/current.conf"

tar -czf "$blog_archive_dir/orders.tar.gz.part" \
  -C "$blog_archive_dir/source" orders
gzip -t "$blog_archive_dir/orders.tar.gz.part"
tar -tzf "$blog_archive_dir/orders.tar.gz.part"
mv "$blog_archive_dir/orders.tar.gz.part" "$blog_archive_dir/orders.tar.gz"
(
  cd "$blog_archive_dir"
  sha256sum orders.tar.gz > orders.tar.gz.sha256
  sha256sum -c orders.tar.gz.sha256
)
tar --extract --gzip --file="$blog_archive_dir/orders.tar.gz" \
  --directory="$blog_archive_dir/restored" \
  --no-same-owner --no-same-permissions
cmp "$blog_archive_dir/source/orders/订单 列表.csv" \
  "$blog_archive_dir/restored/orders/订单 列表.csv"
test "$(readlink "$blog_archive_dir/restored/orders/current.conf")" = export.conf
printf 'restore_verified\n'
```

先写`.part`，全部成功后再在同一目录改名，避免使用者把半成品当作正式产物；同一文件系统内改名能提供名称切换的原子性，但不自动保证断电持久性。这个最小实验只比较一个文件内容和一个链接目标。真实恢复还应按合同检查完整成员、摘要、权限、链接、应用启动和业务数据；不能因一个`cmp`通过就声称整棵目录完全一致。

`gzip -t`检查压缩数据的校验信息，`tar -t`读取归档结构，`sha256sum -c`检查是否与指定摘要一致，恢复验收检查能否使用。四者各有作用：tar成员可列出不等于每个普通文件的数据均未变化，摘要文件若也来自同一不可信渠道则不能证明来源可信。跨网络交付应核对独立可信渠道提供的摘要或签名。

## 解包先看清单，再进入空目录

可信来源也可能打包了错误顶层、绝对路径、`..`成员、特殊文件或指向外部的链接。先用`tar -tvf`、`unzip -l`或`7z l`查看成员，评估展开后空间和文件数，再用普通用户在新建空目录解包。不要把未知包直接以root身份解到`/`、业务目录或已有共享目录。

列表预检不能充当完整的恶意归档防护。解包工具版本、路径检查和链接处理都影响边界，超大展开量还可能耗尽空间。对不可信包使用有资源限制的隔离环境，不依赖几行`grep`过滤就宣称安全。GNU tar的`--no-same-owner --no-same-permissions`限制部分元数据恢复，不是通用沙箱。

`tar --overwrite`是覆盖策略，不是交互确认；`--keep-old-files`遇到已有成员会报错，`--skip-old-files`跳过，均需理解退出状态和工具版本。unzip的`-o`无提示覆盖，`-n`不覆盖。正式恢复先在旁路目录验证，再按发布或维护流程切换，不用覆盖生产来验证包是否正确。

## 大目录、管道和分卷要保留失败信号

GNU tar可以用gzip、bzip2、xz，也可接pigz等并行工具。用管道时启用Bash的`set -o pipefail`，否则上游tar失败、下游仍正常退出会被误判成成功。下面是稳定输入目录的模板：

```text
set -o pipefail
tar -cf - -C /snapshot orders | pigz -p 4 > /backup/orders.tar.gz.part
```

仍需检查命令状态、测试并恢复后再发布产物。线程数应按CPU配额和在线业务预算设置；xz可用`-T`选择线程、用`--memlimit-compress`或`--memlimit-decompress`控制对应阶段预算，具体调整行为要核对版本。并行不意味着解压一定同样并行。

分卷只解决传输或单文件大小限制，不能降低最终恢复需要的总空间。先生成受校验的稳定文件，再按明确顺序分片，记录每片大小、摘要和重组后的摘要；少一片、顺序错或截断都应拒绝恢复。不要仅凭通配符拼接成功就认为产物正确；超过两位编号的顺序尤其要提前设计。

## 备份链与损坏处理

按mtime选出新文件只是过滤，不是完整增量备份：删除、重命名、目录结构与依赖的基线都需要记录。GNU tar的`--listed-incremental`使用快照文件记录状态，恢复依赖对应全量和后续增量的顺序，增量恢复还可能删除目标中不在快照里的成员。应在专用恢复目录演练，不把它当作普通解包随意作用到已有数据。

备份保留策略应在新备份验证后执行，按明确清单和恢复点依赖删除，不用`ls | tail | xargs rm`处理可能有空格、换行或多级增量关系的文件。压缩包不是完整容灾方案，还需要异地副本、访问控制、恢复时间和恢复点目标。

压缩测试失败时保留原包与摘要，优先重新获取或重做稳定源备份。`gzip -f`允许强制处理与覆盖，不是修复，更不是“强制解压”；解压要明确`-d`。ZIP工具的修复模式只能尝试恢复部分可读结构，应输出到新文件，随后逐项验收，不能声称内容完整恢复。空间不足先检查实际目标挂载的字节和inode、临时目录及展开大小，方法见[系统信息](./system-info.md)。
