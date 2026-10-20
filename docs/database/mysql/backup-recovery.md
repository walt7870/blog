# MySQL 备份与恢复

下午 14:00，运维脚本误删了订单。凌晨 02:00 的备份虽然完好，直接恢复仍会丢掉白天的正常订单；主从复制也可能已经把误删同步过去。需要的是一条可验证的恢复链：先恢复一致性备份，再回放其后的连续 binlog，停在错误事务之前。

本文以 MySQL 8.4 LTS 为基线。所有恢复先进入隔离实例，核对结果后才制定切换或数据补回方案。备份成功退出、压缩包能解开、数据库能启动，是三个不同层面的检查，都不能单独证明订单已恢复。

## 恢复目标决定保留哪些材料

**RPO** 是可容忍的数据损失时间窗口，**RTO** 是从事故开始到业务恢复的时间目标。假设订单系统要求 RPO 不超过 5 分钟、RTO 不超过 1 小时，每晚全量备份还不够：需要持续归档 binlog，并实测取回、解密、导入、回放、校验与切换是否能在一小时内完成。

![全量备份与连续日志共同组成订单恢复链](/database/mysql-recovery-chain.svg)

图中的时间用于解释事故过程，不是备份频率模板。真正的恢复点受最晚已可靠归档的日志、备份一致性以及密钥可用性共同限制。异步复制有延迟，复制也会传播误操作；不能把“有副本”直接写成零丢失备份。

| 材料 | 解决的问题 | 缺失后的影响 |
| --- | --- | --- |
| 一致性全量备份 | 提供可恢复的起始数据集 | 只有日志未必能重建完整实例 |
| 备份对应的 binlog 位点或 GTID 集 | 确定回放起点，避免重复或遗漏 | 不能仅凭文件修改时间接续 |
| 连续日志与归档清单 | 恢复全量之后的正常事务 | 中间缺一个文件也可能使恢复链断裂 |
| 版本、配置、账号与存储对象清单 | 重建运行环境及执行身份 | 数据恢复后应用仍可能无法运行 |
| 加密密钥、证书及其版本 | 读取加密数据和备份 | 有密文文件仍可能无法恢复 |

至少让一份副本处于独立故障域，并防止生产账号删除全部历史备份。不可变或离线副本、保留期限和密钥恢复要一起设计；同机另一目录不构成异地备份。

## 逻辑、物理与快照如何选择

逻辑备份重建表定义与行数据，便于选择对象和检查内容，但大库导入通常受 SQL 执行、索引重建及约束检查影响。物理备份复制数据页和恢复所需日志，通常更适合大体量恢复，但更依赖服务器版本、工具版本、文件布局和加密配置。跨版本逻辑迁移也需要测试语法、字符集、排序规则与存储对象，不能承诺任意版本兼容。

| 方法 | 适合的入口 | 必须验证的边界 |
| --- | --- | --- |
| `mysqldump` | 小中型库、单库迁移、对象级导出 | 一致性范围、DDL、执行身份、恢复耗时 |
| MySQL Shell 导出/加载工具 | 需要并行逻辑导出、分块与并行加载 | 工具/服务器兼容性、线程数、权限与完整性 |
| 兼容版本的物理备份工具 | 大数据量、较短的重建时间 | 对应 MySQL 分支支持、prepare、锁与日志、密钥 |
| 冷备或协调后的存储快照 | 可停机窗口，或具备完整快照协议 | 所有相关卷的一致时点、配置与密钥、恢复流程 |

MySQL Enterprise Backup 有许可边界。Percona XtraBackup 必须选与服务器分支匹配的版本，不能把 8.0 工具直接当成 8.4 通用工具。物理在线备份也可能申请备份锁、元数据锁或短暂阻塞，不能统一称为“完全不锁表、不影响业务”。

直接对运行中的 `/var/lib/mysql` 执行 `cp`，不能保证复制期间的数据页与日志一致。快照也不是单独执行一次 `lvcreate` 就完成：数据、redo、undo、binlog 若跨卷，需要协调一致性，且要确认快照空间不会耗尽。

## 练习：导出一份可核对的订单备份

下面使用两个独立练习实例：源实例和恢复实例。两者均为兼容的 MySQL 8.4，均不连接业务应用，恢复实例没有同名业务数据。本练习采用文件位点模式，源实例须启用 binlog，`gtid_mode=OFF`；**不直接套用到 GTID 复制集群**。

先在源实例初始化：

```sql
CREATE DATABASE restore_demo;
CREATE TABLE restore_demo.orders (
    id BIGINT UNSIGNED PRIMARY KEY,
    status VARCHAR(20) NOT NULL,
    amount DECIMAL(12,2) NOT NULL
) ENGINE=InnoDB;
INSERT INTO restore_demo.orders VALUES (1001, 'PAID', 39.90);
SELECT @@version, @@log_bin, @@gtid_mode;
```

使用 `mysql_config_editor` 或现有凭据系统配置 `backup` 与 `restore` 两个连接入口，分别指向源实例和恢复实例。`--password` 不带值，让工具交互读取；不要把真实密码放进命令参数或脚本。login-path 文件只是受保护的凭据文件，混淆存储不等于密钥保险箱，需限制系统用户访问。远程连接还要按[安全与权限管理](./security-permissions.md)配置身份校验。

下面 Bash 脚本每次新建一个目录，只在导出、压缩和检查全部成功后产生完成标记：

```bash
#!/usr/bin/env bash
set -euo pipefail
umask 077
backup_root=${BACKUP_ROOT:-/backup/mysql}
mkdir -p "$backup_root"
backup_run=$(mktemp -d "$backup_root/run.XXXXXXXX")
trap 'rm -f "$backup_run/full.sql.gz.partial"' EXIT

mysql --login-path=backup --batch \
  --execute='SELECT @@version, @@log_bin, @@gtid_mode;' \
  > "$backup_run/server.tsv"

mysqldump --login-path=backup \
  --single-transaction --quick --source-data=2 \
  --set-gtid-purged=OFF --no-tablespaces \
  --routines --triggers --events \
  --databases restore_demo \
  | gzip > "$backup_run/full.sql.gz.partial"

gzip -t "$backup_run/full.sql.gz.partial"
mv "$backup_run/full.sql.gz.partial" "$backup_run/full.sql.gz"
(
  cd "$backup_run"
  sha256sum full.sql.gz server.tsv > SHA256SUMS
)
printf '%s\n' '导出与本地文件检查通过，尚未证明可恢复' > "$backup_run/COMPLETE"
printf '%s\n' "$backup_run"
```

此脚本使用 GNU/Linux 的 `sha256sum`；macOS 可换为 `shasum -a 256` 并保持校验端一致。`pipefail` 让导出失败不被后面的 gzip 成功掩盖，临时文件不冒充完成文件。目录存在或文件非零都不是成功标准，失败任务应保留错误原因并告警，不能继续清理历史恢复链。

几个参数需要连在一起理解：

- `--single-transaction` 为 InnoDB 建立一致性读，不保证 MyISAM/MEMORY 的在线一致性，导出期间还应避免相关表的 `ALTER/DROP/TRUNCATE/RENAME` 等 DDL。
- `--source-data=2` 把起点以注释形式写入导出，通常是 `CHANGE REPLICATION SOURCE TO ... SOURCE_LOG_FILE=..., SOURCE_LOG_POS=...`。与单事务组合时仍会短暂取得全局读锁，长语句可能让该阶段等待。
- `--set-gtid-purged=OFF` 在本练习中避免写入 GTID 状态；它不是生产 GTID 恢复的默认选择。GTID 场景必须规划已执行集合、重复事务和复制接续。
- `--no-tablespaces` 不导出表空间定义，从而减少某些权限需求；数据表仍会导出。过程、事件、触发器按参数显式包含，但操作系统配置和所有账号不会因此自动齐备。

备份账号按对象与选项授权，例如表数据读取、视图/触发器/事件及过程可见性；记录位点还涉及 `REPLICATION CLIENT`、`RELOAD` 等权限。不同选项会改变要求，不能复制一条 `GRANT ALL ON *.*` 作为补救。还原账号则需要执行导出文件所含 DDL 和存储对象的权限，两者不应混为日常应用账号。

## 先恢复全量，再验证基线

把实际输出目录传给下面命令。执行前核对 `restore` 连接指向隔离实例；带 `--databases` 的导出包含库名与 `USE`，不能靠在 mysql 命令末尾写一个新库名就安全改名。

```bash
set -euo pipefail
: "${BACKUP_DIR:?填写本次完整备份目录}"
test -f "$BACKUP_DIR/COMPLETE"
(cd "$BACKUP_DIR" && sha256sum -c SHA256SUMS)
gzip -t "$BACKUP_DIR/full.sql.gz"
gzip -dc "$BACKUP_DIR/full.sql.gz" | mysql --login-path=restore
mysql --login-path=restore --table \
  --execute='SELECT id,status,amount FROM restore_demo.orders ORDER BY id;'
```

此时恢复实例应只有 `1001 / PAID / 39.90`。导入会执行文件中的建库、建表及可能存在的删表语句，所以先隔离目标十分关键。禁止用 `--force` 把一串还原错误变成“跑到末尾就成功”。

不要按文本行数 `split` SQL 文件：一条多行 INSERT、过程定义、分隔符和会话设置可能被拆开。需要并行恢复时使用支持分块的工具；需要单表时优先在隔离库完整恢复，再用工具导出目标对象，不用 sed 猜 SQL 边界。

## 回放到误删之前

在完成全量备份后，源实例产生一笔正常订单，再发生误删：

```sql
INSERT INTO restore_demo.orders VALUES (1002, 'PAID', 20.00);
-- 练习中无并发写入，此位点用于标记下一笔错误事务之前的边界。
SHOW BINARY LOG STATUS;
DELETE FROM restore_demo.orders WHERE id=1001;
```

事故发生后先保存日志和现场，控制继续写入的范围。使用全量文件里的 `SOURCE_LOG_FILE/POS` 作为起点，以日志里的完整事务边界确定停止点；练习中上面查到的位置可作为误删前边界，生产并发下不能把随手查到的位置等同于事故起点。

使用 `mysqlbinlog --base64-output=DECODE-ROWS -vv` 检查行事件以及事务的开始、结束和位置。该模式服务阅读，不能拿解码注释直接执行。时间筛选可以帮助定位，但受时区、同秒多笔事务和提交先后影响，不如已经核准的事务边界精确。

下面模板限定为**同一个归档日志文件内**的回放，起止位置必须从该文件实测填写，停止点选在错误事务开始前，不能截在事务中间：

```bash
set -euo pipefail
: "${BINLOG_FILE:?填写归档日志的完整路径}"
: "${START_POS:?填写全量备份记录的起点}"
: "${STOP_POS:?填写误操作事务之前的边界}"
test "$START_POS" -lt "$STOP_POS"
mysqlbinlog --start-position="$START_POS" --stop-position="$STOP_POS" \
  "$BINLOG_FILE" > replay.sql.partial
mv replay.sql.partial replay.sql
mysql --login-path=restore < replay.sql
mysql --login-path=restore --table \
  --execute='SELECT id,status,amount FROM restore_demo.orders ORDER BY id;'
```

预期得到 `1001 / PAID / 39.90` 和 `1002 / PAID / 20.00`：基线订单仍在，备份后的正常订单也补上，误删没有回放。

跨多个日志时按**源实例日志索引顺序**一次传给 mysqlbinlog，起点作用于第一个文件、停止位置作用于最后一个文件，保留同一解析与执行链路。先确认中间每个文件存在且来自同一条恢复链，不要按无补零的字符串名随意排序，更不能每个文件都重复使用相同的起止位置。导出单库不意味着整段 binlog 只含该库；应核对跨库事务、存储程序和过滤语义，隔离恢复需要能容纳实际回放范围。

若要排除错误事务后继续回放，还需评估后续事务是否依赖被误删的数据，GTID 是否已执行，以及账务和外部系统是否需要补偿。不能仅跳过一个位置或 GTID，就宣称恢复到了没有发生过误删的当前状态。

MySQL 8.4 的官方 `mysqlbinlog` 没有通用 `--flashback` 参数。第三方反向 SQL 工具受行镜像、DDL、数据类型和事务边界限制；即便生成出反向语句，也要在隔离环境验证冲突和业务含义，不能直接对生产“倒放”。

## 日志归档与历史清理

`SHOW BINARY LOGS` 用于核对文件清单，`SHOW BINARY LOG STATUS` 查看当前源日志位置。持续归档可以通过 mysqlbinlog 的远程原始读取能力或备份平台实现，但需有重连、断点、文件闭合、校验及延迟监控；文件被创建不等于已经完整归档。

普通文件复制不能安全读取仍在写入的日志；磁盘加密日志的读取又涉及服务端解密和 keyring，不能混用“复制原文件”与“可直接由 mysqlbinlog 解析”。应记录每份归档的源实例、日志名、长度/摘要、完成时间和可验证边界。

删除旧日志之前同时检查：所有仍保留的全量/增量链、最落后的复制节点、归档确认点与恢复窗口。`binlog_expire_logs_seconds` 是源端保留配置，不知道你的异地复制是否已成功；不能写一个“复制后固定删除七天前日志”的脚本来替代确认。备份任务失败时尤其不能顺手删除唯一有效的旧链。

物理增量备份同样有顺序：全量基线、每次增量的 LSN 范围、工具要求的 prepare 阶段必须连续衔接。在副本目录中完成准备，保留原始备份；恢复到新的空数据目录，核对所有者、配置、密钥和版本后启动。不要先 `rm -rf /var/lib/mysql/*` 再期待 copy-back 可以兜底。

## 恢复验收与切换

压缩校验和摘要只能证明文件层面的一致性；数据库恢复验收至少要覆盖：

1. **对象完整**：表、索引、约束、视图、过程、事件及其 `DEFINER` 与预期相符；隔离恢复时防止事件调度器误触发任务。
2. **数据正确**：核对关键订单、支付金额汇总、主外键关系、状态分布与最近正常事务；不能只比较总行数。
3. **应用可用**：凭据、字符集、时区、SQL 模式和连接参数匹配，执行下单、查询、幂等重试等受控验证。
4. **外部一致**：支付、消息、缓存与搜索索引按已确认的权威数据对账和补偿，避免恢复后重复扣款或重复通知。
5. **恢复时间**：记录取回、解密、导入、回放、检查与切换的实测耗时，及最终覆盖到的源端事务边界，再判断 RPO/RTO。

只有验收通过才切换流量或把经过比对的数据补回原库。保留事故前现场、恢复工件和回退办法；切换后限制双写，持续核对关键业务。定期演练还需覆盖丢失一个增量、日志中间缺档、备份损坏、密钥不可用和恢复权限不足等失败情况。
