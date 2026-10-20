# HDFS：文件、块与故障恢复

每天生成几百 GB 的订单明细，希望多台计算节点并行读取，并在一块磁盘损坏后继续工作，这是 HDFS 擅长的场景。它提供的是分布式文件系统：路径、目录、权限、文件块和冗余；订单主键、事务表与指标口径属于上层数据模型和表格式的职责。

HDFS 适合大文件和高吞吐访问，不适合把每条订单都写成一个小文件，也不能当作可任意修改字节的本地磁盘。文件支持追加和截断等操作，但不提供普通文件那样的任意位置覆盖写。本页按 Hadoop 3.4.x 的机制和命令组织；客户端的实际版本与集群配置需要一起核对。

## 读取位置找 NameNode，传输数据找 DataNode

NameNode 管理目录、权限、文件到块的映射和块放置决策。DataNode 保存实际块及其校验信息，响应客户端读写，并向 NameNode 上报心跳和块报告。文件内容不经 NameNode 转发：客户端先取得位置，再直接连接相应 DataNode。NameNode 能访问而 DataNode 地址不能访问时，就可能出现“目录列得出，文件读不了”。

![HDFS元数据与数据读写路径](/bigdata/hdfs-client-block-path.svg)

读一个文件时，客户端分块选择可用副本并校验内容；副本不可达或校验失败时，尝试其他副本并报告问题。写一个三副本块时，客户端向第一个 DataNode 发数据，后者继续转发，确认沿管线反向返回。实际副本放置受到机架、存储类型、容量和节点健康约束，不能假定第一份必在客户端本机；普通客户端也可能根本不是 DataNode。

`write()` 返回、数据在管线中确认、对其他读者可见和持久化到设备不是同一个时刻。Java 客户端需要按使用场景理解 `hflush()`、`hsync()` 和关闭文件的保证，以及底层设备的持久化语义。管线故障会触发恢复和重传；租约恢复处理未正常关闭的写者，不应由多个应用直接并发改写同一文件。

## 一个文件怎样变成多个块

假设块大小为 128 MiB，一个 300 MiB 文件通常拆为 128、128、44 MiB 三个块。三副本的逻辑内容存储约为 900 MiB，另有校验、元数据和其他开销。1 KiB 小文件不会实际占满 128 MiB，但仍消耗 inode、块映射、文件句柄和 RPC 等资源；几千万小文件可能先耗尽元数据能力，而非磁盘容量。

`dfs.blocksize`、`dfs.replication` 是创建文件时使用的重要默认值，也可以按文件设置。修改集群默认配置并不等于所有旧文件立刻改块大小或副本数。增加副本是异步补齐的过程，设置成功不表示副本已经到位；副本不足、缺块和副本损坏也需要分别判断。

纠删码用数据单元和校验单元降低冗余开销。例如 RS-6-3 在完整条带下以六份数据和三份校验提供约 1.5 倍内容开销，但需要足够节点和正确的放置策略，恢复还会增加网络及计算负担。它与三副本的写入路径、性能和部分文件操作限制不同，不能把副本参数改成某个数字来代替纠删码选型。

## 元数据持久化、检查点和 HA

NameNode 通过 `fsimage` 保存命名空间镜像，通过 `edits` 记录后续变更；重启时加载镜像并重放日志。DataNode 的块报告帮助恢复块所在节点的信息。只备份 DataNode 磁盘而丢失命名空间，并不能直接恢复原来的路径、权限和文件关系。

Secondary NameNode 的职责是合并镜像与日志生成检查点，减少恢复时的日志重放成本，它不是随时能接管请求的热备。进程名称里有 “Secondary” 不表示已经具备高可用。

使用 QJM 的 HA 部署由 Active NameNode 服务写入，Standby 跟进共享 edits；常见做法是部署奇数个 JournalNode，例如三个，写日志需要多数派确认。DataNode 向相关 NameNode 报告块信息，Standby 也执行检查点，因此这类部署不应另设 Secondary NameNode。自动故障转移还需要 ZooKeeper、ZKFC、健康检查与 fencing。QJM 保证 JournalNode 同时只接受一个 NameNode 写者；旧 Active 仍可能短暂提供过时读取，因此还需理解 fencing 对隔离旧进程的作用。JournalNode 解决共享编辑日志，ZooKeeper 协助协调选主，二者不能互相替代。

客户端应使用配置了故障转移代理的逻辑 nameservice 地址，而不是固定连接某台 Active 的主机名。HA 降低单个 NameNode 故障的影响，不能代替业务文件备份、机架容灾或集群外恢复演练；Federation 则通过多个命名空间分摊规模，两者解决的问题不同。

## 从现有客户端检查一个文件

先确认已安装 Hadoop 客户端、`HADOOP_CONF_DIR` 指向正确环境，并具备所需身份和读取权限。`hdfs` 命令名不保证访问的就是 HDFS：`fs.defaultFS` 配错时，文件命令可能落在本地文件系统。下面设置要检查的现有文件，所有 HDFS 操作均为读取。

```bash
export HDFS_FILE=/user/data/orders/part-00000.parquet

hdfs version
HDFS_TARGET=$(hdfs getconf -confKey fs.defaultFS) || exit 1
case "$HDFS_TARGET" in
  hdfs://*) printf '目标文件系统：%s\n' "$HDFS_TARGET" ;;
  *) printf '当前不是预期HDFS：%s\n' "$HDFS_TARGET" >&2; exit 1 ;;
esac
hdfs dfs -ls "$HDFS_FILE"
hdfs dfs -stat 'bytes=%b blocksize=%o replication=%r' "$HDFS_FILE"
hdfs fsck "$HDFS_FILE" -files -blocks -locations
```

`stat` 展示逻辑文件大小、配置块大小与副本参数，`fsck` 展示块及位置，不能仅凭 `ls` 的文件长度判断副本已经健康。`fsck` 的权限和集群策略可能限制可见信息；保留完整输出、退出码和诊断时间，不要用 `grep HEALTHY` 判断，因为 `UNHEALTHY` 同样包含这个字符串。命令超时、认证失败也不能当作“零异常”。

## 小文件上传与回读练习

本段要求已有可用 HDFS 和当前用户的可写家目录，沿用上面确认过的客户端环境。它创建独立练习路径，不修改已有业务文件，也不负责配置集群。可将以下代码作为完整脚本执行，成功后保留练习文件供核对。

```bash
set -eu
HDFS_TARGET=$(hdfs getconf -confKey fs.defaultFS)
case "$HDFS_TARGET" in hdfs://*) ;; *) exit 1 ;; esac
HDFS_LOCAL=$(mktemp -d)
HDFS_LAB="/user/$(id -un)/blog-hdfs-lab-$(date +%Y%m%d%H%M%S)-$$"
printf 'order_id,amount_cent\n102,3000\n' > "$HDFS_LOCAL/orders.csv"
hdfs dfs -mkdir "$HDFS_LAB"
hdfs dfs -chmod 700 "$HDFS_LAB"
hdfs dfs -put "$HDFS_LOCAL/orders.csv" "$HDFS_LAB/orders.csv"
hdfs dfs -chmod 600 "$HDFS_LAB/orders.csv"
hdfs dfs -get "$HDFS_LAB/orders.csv" "$HDFS_LOCAL/roundtrip.csv"
cmp "$HDFS_LOCAL/orders.csv" "$HDFS_LOCAL/roundtrip.csv"
hdfs fsck "$HDFS_LAB/orders.csv" -files -blocks -locations
printf '核对路径：%s\n本地目录：%s\n' "$HDFS_LAB" "$HDFS_LOCAL"
```

`cmp` 无输出且退出码为零表示这次回读内容一致，不表示跨节点故障、HA 或灾难恢复已经通过。练习需要当前用户在 `/user` 下已经有家目录；权限不足时应检查身份和目录授权，不改全局权限来绕过。`700` 用于目录，`600` 用于文件：目录需要执行位才能遍历，递归对目录执行 `chmod 644` 会破坏访问。

HDFS 提供自己的校验机制，具体校验类型可配置；不能用一个独立 Java `CRC32` 例子模拟完整 HDFS 文件校验。`hdfs dfs -checksum` 返回的文件校验还可能依赖块布局和校验模式，比较跨布局文件前需要理解其组成。逐字节回读或在同一算法下计算内容哈希，验证的是另一个层面的内容一致性。

## 故障排查按证据分支

| 现象 | 先核对什么 | 后续动作与边界 |
| --- | --- | --- |
| `ls` 成功，读文件超时 | 客户端收到的 DataNode 主机名、端口、路由和认证 | 修复客户端到实际数据端点的连通性；不只检查 NameNode |
| 副本不足 | 存活节点、机架与存储策略、容量、退役状态 | 处理不可用资源并观察补副本；不是马上删除文件 |
| 缺块或所有副本损坏 | 受影响文件、块报告、磁盘和校验错误 | 保留证据，从独立副本或源端重建；增加副本数不能凭空恢复内容 |
| NameNode 安全模式 | 启动恢复进度、块上报、可用副本与磁盘资源 | 排除原因后恢复；不把强制退出安全模式当通用修复 |
| 文件写入卡住 | 管线、DataNode 磁盘、网络、租约和 NameNode 日志 | 先确认写者是否仍存活，再按恢复流程处理租约 |
| 文件删除但空间未下降 | Trash、快照引用、异步块回收、正在使用的文件 | 检查保留关系；不手工删除 DataNode 存储目录里的块文件 |

集群管理员可进一步查看 `hdfs dfsadmin -report`、安全模式状态及对应监控。文件系统健康、服务进程存活、业务数据完整是三个不同层次：`pgrep` 只能说明本机有匹配进程，不能证明远端集群健康。监控应分别记录缺块、损坏副本、低冗余、容量、RPC 延迟、GC、写入失败和 HA 角色状态，并把采集失败也作为可见状态。

## 容量、权限与备份

先按实际文件数、块数、冗余策略和增长率规划 NameNode 与 DataNode，不直接套用固定 8 GB 堆、线程数或超时。小文件治理、合理合并和写入批次往往比盲目增大块大小更有用。跨节点数据平衡与单节点磁盘平衡也有不同工具和范围，维护时要控制带宽并观察业务延迟。短路读取还需要本机 DataNode、域套接字及权限配置，单开一个布尔参数并不完整。

简单认证模式下的用户名不是可靠身份认证，目录权限不能替代 Kerberos。对外服务要同时考虑 RPC、数据传输、Web 接口、存储加密、密钥与审计，并限制管理端口。权限设计需要验证“未授权用户实际被拒绝”，而不是只查询一张角色配置表。

HDFS 快照保留某目录在某时刻的命名空间和文件引用，适合误删与变更回退，但依赖同一集群的元数据和块仍存在。Trash 是否生效、保留多久都受配置与调用方式影响，Java API 删除也不能自动等同于 shell 移入回收站。独立备份应覆盖数据、元数据、配置与密钥，并在隔离环境验证恢复。湖表还需要保留其目录和表元数据，不能只复制底层 Parquet，详见[数据仓库与数据湖](./data-warehouse-lake.md)。
