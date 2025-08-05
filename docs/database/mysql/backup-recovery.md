# MySQL 备份与恢复

## 备份恢复概述

数据备份与恢复是数据库管理中最关键的环节之一，直接关系到数据的安全性和业务的连续性。完善的备份恢复策略能够在硬件故障、人为错误、自然灾害等各种情况下保护数据不丢失，确保业务能够快速恢复正常运行。

### 备份的重要性

#### 数据保护需求

**硬件故障防护**：
- 磁盘损坏和故障
- 服务器硬件失效
- 存储系统故障
- 网络设备故障
- 电源和环境问题

**软件故障防护**：
- 操作系统崩溃
- 数据库软件 Bug
- 应用程序错误
- 驱动程序问题
- 配置错误导致的故障

**人为错误防护**：
- 误删除数据或表
- 错误的数据修改
- 配置错误
- 权限误操作
- 维护操作失误

**外部威胁防护**：
- 恶意攻击和入侵
- 病毒和恶意软件
- 数据泄露
- 勒索软件攻击
- 自然灾害

#### 业务连续性要求

**恢复时间目标（RTO）**：
- 系统恢复到正常运行状态的最大可接受时间
- 不同业务系统有不同的 RTO 要求
- 影响备份策略和恢复方案的选择
- 需要平衡成本和业务需求

**恢复点目标（RPO）**：
- 系统能够容忍的最大数据丢失量
- 通常以时间为单位衡量
- 决定备份频率和方式
- 影响存储和网络资源需求

**可用性要求**：
- 系统正常运行时间的百分比
- 99.9%、99.99%、99.999% 等不同级别
- 影响架构设计和投资成本
- 需要综合考虑技术和经济因素

### 备份策略原则

#### 3-2-1 备份原则

**3 份数据副本**：
- 1 份生产数据
- 2 份备份副本
- 确保数据的多重保护
- 降低同时丢失的风险

**2 种不同介质**：
- 本地存储（磁盘、磁带）
- 云存储或远程存储
- 避免单一介质的风险
- 提高数据安全性

**1 份异地备份**：
- 地理位置分离的备份
- 防范自然灾害和区域性故障
- 确保业务连续性
- 满足合规性要求

#### 备份分层策略

**热备份**：
- 在线实时备份
- 不影响业务运行
- 恢复速度快
- 成本相对较高

**温备份**：
- 定期自动备份
- 短暂影响性能
- 平衡成本和效果
- 适合大多数场景

**冷备份**：
- 离线完整备份
- 需要停止服务
- 数据一致性好
- 适合维护窗口

## 备份类型与方法

### 逻辑备份

逻辑备份是将数据库中的数据以 SQL 语句的形式导出，生成可读的文本文件。这种备份方式具有良好的可移植性和可读性，但备份和恢复速度相对较慢。

#### mysqldump 工具

**基本用法**：
```bash
# 备份单个数据库
mysqldump -u username -p database_name > backup.sql

# 备份多个数据库
mysqldump -u username -p --databases db1 db2 db3 > backup.sql

# 备份所有数据库
mysqldump -u username -p --all-databases > backup.sql

# 备份单个表
mysqldump -u username -p database_name table_name > table_backup.sql
```

**重要参数详解**：

**数据一致性参数**：
- `--single-transaction`：使用事务保证 InnoDB 表的一致性
- `--lock-tables`：锁定所有表（MyISAM 表）
- `--lock-all-tables`：锁定所有数据库的所有表
- `--master-data`：记录二进制日志位置信息

**数据内容参数**：
- `--no-data`：只备份表结构，不备份数据
- `--no-create-info`：只备份数据，不备份表结构
- `--complete-insert`：生成完整的 INSERT 语句
- `--extended-insert`：使用多行 INSERT 语句（默认）

**性能优化参数**：
- `--quick`：逐行检索结果，节省内存
- `--opt`：优化选项组合（默认启用）
- `--compress`：压缩客户端和服务器之间的通信
- `--max_allowed_packet`：设置最大数据包大小

**高级备份示例**：
```bash
# 完整的生产环境备份
mysqldump -u backup_user -p \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --master-data=2 \
  --flush-logs \
  --all-databases > full_backup_$(date +%Y%m%d_%H%M%S).sql

# 压缩备份
mysqldump -u username -p database_name | gzip > backup.sql.gz

# 远程备份
mysqldump -h remote_host -u username -p database_name > backup.sql
```

#### 逻辑备份的优势与限制

**优势**：
- **可读性好**：生成的 SQL 文件可以直接查看和编辑
- **跨平台**：可以在不同操作系统和 MySQL 版本间迁移
- **选择性强**：可以选择特定的数据库、表或数据
- **压缩效果好**：文本文件压缩比高
- **版本兼容性**：不同 MySQL 版本间兼容性好

**限制**：
- **速度较慢**：大数据量时备份和恢复时间长
- **资源消耗**：需要较多的 CPU 和内存资源
- **一致性挑战**：大型数据库的一致性备份较困难
- **存储空间**：可能需要较大的存储空间

### 物理备份

物理备份是直接复制数据库的数据文件，包括数据文件、索引文件、日志文件等。这种方式备份和恢复速度快，但可移植性相对较差。

#### 文件系统级备份

**冷备份方法**：
```bash
# 停止 MySQL 服务
sudo systemctl stop mysql

# 复制数据目录
sudo cp -r /var/lib/mysql /backup/mysql_backup_$(date +%Y%m%d)

# 启动 MySQL 服务
sudo systemctl start mysql
```

**热备份考虑**：
- 需要确保数据文件的一致性
- InnoDB 表需要特殊处理
- 可能需要使用文件系统快照
- 考虑使用专业备份工具

**快照备份**：
```bash
# 创建 LVM 快照
sudo lvcreate -L 10G -s -n mysql_snapshot /dev/vg0/mysql_lv

# 挂载快照
sudo mkdir /mnt/mysql_snapshot
sudo mount /dev/vg0/mysql_snapshot /mnt/mysql_snapshot

# 复制数据
sudo cp -r /mnt/mysql_snapshot/* /backup/

# 清理快照
sudo umount /mnt/mysql_snapshot
sudo lvremove /dev/vg0/mysql_snapshot
```

#### MySQL Enterprise Backup

**商业备份解决方案**：
- MySQL 官方提供的企业级备份工具
- 支持热备份和增量备份
- 提供压缩和加密功能
- 集成监控和管理功能

**基本用法**：
```bash
# 完整备份
mysqlbackup --user=backup_user --password \
  --backup-dir=/backup/full \
  backup-and-apply-log

# 增量备份
mysqlbackup --user=backup_user --password \
  --backup-dir=/backup/incremental \
  --incremental-base=dir:/backup/full \
  backup
```

#### Percona XtraBackup

**开源物理备份工具**：
- 支持 InnoDB 和 XtraDB 的热备份
- 提供增量备份功能
- 支持压缩和加密
- 备份过程不锁表

**完整备份**：
```bash
# 创建完整备份
xtrabackup --user=backup_user --password=password \
  --backup --target-dir=/backup/full

# 准备备份（应用日志）
xtrabackup --prepare --target-dir=/backup/full
```

**增量备份**：
```bash
# 第一次增量备份
xtrabackup --user=backup_user --password=password \
  --backup --target-dir=/backup/inc1 \
  --incremental-basedir=/backup/full

# 第二次增量备份
xtrabackup --user=backup_user --password=password \
  --backup --target-dir=/backup/inc2 \
  --incremental-basedir=/backup/inc1
```

### 增量备份策略

#### 二进制日志备份

**二进制日志的作用**：
- 记录所有数据修改操作
- 支持点时间恢复
- 用于主从复制
- 提供增量备份基础

**日志备份方法**：
```bash
# 刷新日志文件
mysql -u root -p -e "FLUSH LOGS;"

# 备份二进制日志
cp /var/lib/mysql/mysql-bin.* /backup/binlogs/

# 使用 mysqlbinlog 导出
mysqlbinlog mysql-bin.000001 > binlog_backup.sql
```

**自动化日志备份**：
```bash
#!/bin/bash
# 二进制日志备份脚本

BACKUP_DIR="/backup/binlogs"
DATE=$(date +%Y%m%d_%H%M%S)

# 刷新日志
mysql -u backup_user -p$BACKUP_PASSWORD -e "FLUSH LOGS;"

# 获取当前日志文件
CURRENT_LOG=$(mysql -u backup_user -p$BACKUP_PASSWORD -e "SHOW MASTER STATUS\G" | grep File | awk '{print $2}')

# 备份除当前日志外的所有日志
for log in $(ls /var/lib/mysql/mysql-bin.* | grep -v $CURRENT_LOG); do
    cp $log $BACKUP_DIR/
done

# 清理旧日志
mysql -u backup_user -p$BACKUP_PASSWORD -e "PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 7 DAY);"
```

#### 增量备份策略设计

**备份频率规划**：
- **完整备份**：每周一次
- **增量备份**：每天一次
- **日志备份**：每小时一次
- **实时同步**：关键系统考虑实时复制

**备份保留策略**：
- 每日备份保留 30 天
- 每周备份保留 12 周
- 每月备份保留 12 个月
- 年度备份长期保留

**存储空间规划**：
- 完整备份：数据库大小的 1-2 倍
- 增量备份：每日变化量的累积
- 压缩比：通常可达到 50-80%
- 冗余存储：考虑多副本存储

## 恢复方法与技术

### 完整恢复

完整恢复是将数据库恢复到备份时点的状态，通常用于灾难恢复或系统迁移场景。

#### 逻辑备份恢复

**基本恢复步骤**：
```bash
# 创建新数据库（如果需要）
mysql -u root -p -e "CREATE DATABASE restored_db;"

# 恢复数据
mysql -u root -p restored_db < backup.sql

# 或者恢复所有数据库
mysql -u root -p < full_backup.sql
```

**大文件恢复优化**：
```bash
# 调整 MySQL 参数以提高恢复速度
mysql -u root -p -e "
SET GLOBAL innodb_flush_log_at_trx_commit = 0;
SET GLOBAL sync_binlog = 0;
SET GLOBAL foreign_key_checks = 0;
SET GLOBAL unique_checks = 0;
SET GLOBAL autocommit = 0;
"

# 恢复数据
mysql -u root -p database_name < large_backup.sql

# 恢复参数设置
mysql -u root -p -e "
SET GLOBAL innodb_flush_log_at_trx_commit = 1;
SET GLOBAL sync_binlog = 1;
SET GLOBAL foreign_key_checks = 1;
SET GLOBAL unique_checks = 1;
SET GLOBAL autocommit = 1;
"
```

**分段恢复**：
```bash
# 将大备份文件分割
split -l 100000 large_backup.sql backup_part_

# 逐个恢复
for file in backup_part_*; do
    echo "Restoring $file..."
    mysql -u root -p database_name < $file
done
```

#### 物理备份恢复

**XtraBackup 恢复**：
```bash
# 停止 MySQL 服务
sudo systemctl stop mysql

# 清空数据目录
sudo rm -rf /var/lib/mysql/*

# 恢复数据
sudo xtrabackup --copy-back --target-dir=/backup/full

# 修改权限
sudo chown -R mysql:mysql /var/lib/mysql

# 启动服务
sudo systemctl start mysql
```

**增量备份恢复**：
```bash
# 准备完整备份
xtrabackup --prepare --apply-log-only --target-dir=/backup/full

# 应用第一个增量备份
xtrabackup --prepare --apply-log-only --target-dir=/backup/full \
  --incremental-dir=/backup/inc1

# 应用第二个增量备份
xtrabackup --prepare --target-dir=/backup/full \
  --incremental-dir=/backup/inc2

# 执行恢复
xtrabackup --copy-back --target-dir=/backup/full
```

### 点时间恢复（PITR）

点时间恢复允许将数据库恢复到过去某个特定的时间点，这对于从人为错误中恢复数据非常有用。

#### PITR 原理

**恢复过程**：
1. 恢复最近的完整备份
2. 应用备份时间点之后的二进制日志
3. 恢复到指定的时间点或位置
4. 验证数据完整性

**时间点确定**：
- 基于时间戳恢复
- 基于二进制日志位置恢复
- 基于 GTID 恢复（MySQL 5.6+）
- 排除特定的错误事务

#### 实施 PITR

**准备工作**：
```bash
# 查看二进制日志文件
mysql -u root -p -e "SHOW BINARY LOGS;"

# 查看当前二进制日志位置
mysql -u root -p -e "SHOW MASTER STATUS;"

# 分析二进制日志内容
mysqlbinlog --start-datetime="2023-12-01 10:00:00" \
  --stop-datetime="2023-12-01 12:00:00" \
  mysql-bin.000001
```

**基于时间的恢复**：
```bash
# 1. 恢复完整备份
mysql -u root -p database_name < full_backup.sql

# 2. 应用二进制日志到指定时间
mysqlbinlog --start-datetime="2023-12-01 00:00:00" \
  --stop-datetime="2023-12-01 11:59:59" \
  mysql-bin.000001 mysql-bin.000002 | mysql -u root -p
```

**基于位置的恢复**：
```bash
# 查找错误操作的位置
mysqlbinlog mysql-bin.000001 | grep -i "drop table"

# 恢复到错误操作之前
mysqlbinlog --start-position=1000 --stop-position=5000 \
  mysql-bin.000001 | mysql -u root -p

# 跳过错误操作，继续恢复
mysqlbinlog --start-position=6000 \
  mysql-bin.000001 | mysql -u root -p
```

**GTID 恢复**：
```bash
# 查看 GTID 信息
mysql -u root -p -e "SELECT @@GLOBAL.gtid_executed;"

# 基于 GTID 恢复
mysqlbinlog --include-gtids='server-uuid:1-100' \
  mysql-bin.000001 | mysql -u root -p

# 排除特定 GTID
mysqlbinlog --exclude-gtids='server-uuid:50' \
  mysql-bin.000001 | mysql -u root -p
```

### 部分恢复

部分恢复是指只恢复数据库中的特定部分，如特定的表、数据库或数据行。

#### 表级恢复

**从完整备份中提取表**：
```bash
# 从备份文件中提取特定表的结构和数据
sed -n '/^-- Table structure for table `target_table`/,/^-- Table structure for table `/p' \
  full_backup.sql > table_structure.sql

sed -n '/^INSERT INTO `target_table`/p' \
  full_backup.sql > table_data.sql

# 恢复表
mysql -u root -p database_name < table_structure.sql
mysql -u root -p database_name < table_data.sql
```

**使用 mysqldump 恢复单表**：
```bash
# 备份单表
mysqldump -u root -p database_name target_table > table_backup.sql

# 恢复单表
mysql -u root -p database_name < table_backup.sql
```

#### 数据行级恢复

**从二进制日志中恢复特定数据**：
```bash
# 查找特定数据的修改记录
mysqlbinlog --base64-output=DECODE-ROWS -v mysql-bin.000001 | \
  grep -A 10 -B 10 "target_value"

# 生成反向操作的 SQL
mysqlbinlog --flashback mysql-bin.000001 > flashback.sql

# 应用反向操作
mysql -u root -p database_name < flashback.sql
```

**使用第三方工具**：
- **binlog2sql**：解析二进制日志生成 SQL
- **MyFlash**：闪回工具
- **mysqlbinlog_flashback**：官方闪回工具

## 灾难恢复规划

### 灾难恢复策略

#### 风险评估

**灾难类型分析**：
- **自然灾害**：地震、火灾、洪水、台风
- **技术故障**：硬件故障、软件错误、网络中断
- **人为因素**：操作错误、恶意攻击、内部威胁
- **环境因素**：停电、温度异常、设施故障

**影响评估**：
- **数据丢失风险**：评估可能的数据丢失量
- **业务中断时间**：估算恢复所需时间
- **经济损失**：计算业务中断的经济影响
- **声誉影响**：评估对企业声誉的影响

**概率分析**：
- 各种灾难发生的概率
- 历史事件统计分析
- 行业风险评估报告
- 地理位置风险因素

#### 恢复目标设定

**RTO（恢复时间目标）设定**：
- **关键系统**：RTO < 1 小时
- **重要系统**：RTO < 4 小时
- **一般系统**：RTO < 24 小时
- **非关键系统**：RTO < 72 小时

**RPO（恢复点目标）设定**：
- **零数据丢失**：实时同步复制
- **最小数据丢失**：RPO < 15 分钟
- **可接受丢失**：RPO < 1 小时
- **较大容忍度**：RPO < 24 小时

**可用性目标**：
- **99.999%**：年停机时间 < 5.26 分钟
- **99.99%**：年停机时间 < 52.6 分钟
- **99.9%**：年停机时间 < 8.77 小时
- **99%**：年停机时间 < 3.65 天

### 多站点备份

#### 异地备份策略

**地理分布**：
- **本地备份**：同一数据中心内的备份
- **同城异地**：同一城市不同位置的备份
- **异地备份**：不同城市或地区的备份
- **云端备份**：公有云或私有云备份

**传输方式**：
- **专线传输**：高速稳定的专用网络
- **VPN 传输**：加密的虚拟专用网络
- **互联网传输**：公共网络传输
- **物理介质**：磁带、硬盘等物理运输

**同步策略**：
- **实时同步**：数据变化立即同步
- **准实时同步**：几分钟内完成同步
- **定时同步**：按固定时间间隔同步
- **手动同步**：人工触发的同步操作

#### 云备份解决方案

**公有云备份**：
```bash
# AWS S3 备份示例
aws s3 cp backup.sql s3://my-backup-bucket/mysql/$(date +%Y%m%d)/

# 阿里云 OSS 备份
ossutil cp backup.sql oss://my-backup-bucket/mysql/$(date +%Y%m%d)/

# 腾讯云 COS 备份
coscmd upload backup.sql mysql/$(date +%Y%m%d)/backup.sql
```

**混合云策略**：
- 本地保留近期备份
- 云端保留长期备份
- 关键数据多云备份
- 成本和安全平衡

**云备份优势**：
- 无限扩展的存储容量
- 高可用性和持久性
- 自动化管理和监控
- 成本效益和按需付费

### 业务连续性计划

#### 应急响应流程

**事件检测**：
- 自动监控系统告警
- 人工发现异常情况
- 用户反馈问题报告
- 第三方监控服务通知

**初步评估**：
1. 确认事件的性质和严重程度
2. 评估对业务的影响范围
3. 确定是否需要启动灾难恢复
4. 通知相关人员和管理层

**应急响应**：
1. 激活应急响应团队
2. 实施临时缓解措施
3. 启动备用系统或服务
4. 与用户和客户沟通

**恢复执行**：
1. 执行详细的恢复计划
2. 监控恢复进度和质量
3. 验证系统功能和数据完整性
4. 逐步恢复正常业务操作

#### 恢复测试

**测试类型**：
- **桌面演练**：理论性的流程演练
- **功能测试**：测试特定恢复功能
- **全面演练**：完整的灾难恢复演练
- **突击测试**：不预先通知的测试

**测试频率**：
- 关键系统：每季度测试
- 重要系统：每半年测试
- 一般系统：每年测试
- 新系统：上线前必须测试

**测试内容**：
- 备份文件的完整性验证
- 恢复过程的时间测量
- 恢复后的功能验证
- 应急响应流程的有效性

**测试记录**：
- 详细记录测试过程和结果
- 识别和记录发现的问题
- 制定改进措施和计划
- 更新恢复文档和流程

## 自动化备份系统

### 备份脚本开发

#### 完整备份脚本

```bash
#!/bin/bash
# MySQL 自动化备份脚本

# 配置参数
DB_USER="backup_user"
DB_PASS="backup_password"
DB_HOST="localhost"
BACKUP_DIR="/backup/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30
LOG_FILE="/var/log/mysql_backup.log"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 日志函数
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

# 备份函数
backup_database() {
    local db_name=$1
    local backup_file="$BACKUP_DIR/${db_name}_${DATE}.sql"
    
    log_message "开始备份数据库: $db_name"
    
    mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --master-data=2 \
        $db_name > $backup_file
    
    if [ $? -eq 0 ]; then
        # 压缩备份文件
        gzip $backup_file
        log_message "数据库 $db_name 备份成功: ${backup_file}.gz"
        
        # 计算文件大小
        size=$(du -h "${backup_file}.gz" | cut -f1)
        log_message "备份文件大小: $size"
    else
        log_message "数据库 $db_name 备份失败"
        return 1
    fi
}

# 清理旧备份
cleanup_old_backups() {
    log_message "开始清理 $RETENTION_DAYS 天前的备份文件"
    find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
    log_message "旧备份文件清理完成"
}

# 发送通知
send_notification() {
    local status=$1
    local message=$2
    
    # 邮件通知
    echo "$message" | mail -s "MySQL备份状态: $status" admin@example.com
    
    # 可以添加其他通知方式，如钉钉、微信等
}

# 主执行流程
main() {
    log_message "开始执行MySQL备份任务"
    
    # 获取所有数据库列表
    databases=$(mysql -h $DB_HOST -u $DB_USER -p$DB_PASS -e "SHOW DATABASES;" | grep -Ev "^(Database|information_schema|performance_schema|mysql|sys)$")
    
    backup_success=0
    backup_total=0
    
    for db in $databases; do
        backup_total=$((backup_total + 1))
        if backup_database $db; then
            backup_success=$((backup_success + 1))
        fi
    done
    
    # 清理旧备份
    cleanup_old_backups
    
    # 生成报告
    log_message "备份任务完成: 成功 $backup_success/$backup_total"
    
    if [ $backup_success -eq $backup_total ]; then
        send_notification "成功" "所有数据库备份成功完成"
    else
        send_notification "部分失败" "$backup_success/$backup_total 个数据库备份成功"
    fi
}

# 执行主函数
main
```

#### 增量备份脚本

```bash
#!/bin/bash
# MySQL 增量备份脚本（基于二进制日志）

# 配置参数
DB_USER="backup_user"
DB_PASS="backup_password"
DB_HOST="localhost"
BINLOG_DIR="/var/lib/mysql"
BACKUP_DIR="/backup/mysql/binlogs"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/mysql_binlog_backup.log"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 日志函数
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

# 获取当前二进制日志信息
get_current_binlog() {
    mysql -h $DB_HOST -u $DB_USER -p$DB_PASS -e "SHOW MASTER STATUS\G" | grep File | awk '{print $2}'
}

# 刷新二进制日志
flush_logs() {
    log_message "刷新二进制日志"
    mysql -h $DB_HOST -u $DB_USER -p$DB_PASS -e "FLUSH LOGS;"
}

# 备份二进制日志
backup_binlogs() {
    local current_log=$(get_current_binlog)
    log_message "当前二进制日志文件: $current_log"
    
    # 备份除当前日志外的所有日志
    for log_file in $(ls $BINLOG_DIR/mysql-bin.* 2>/dev/null | grep -v $current_log); do
        if [ -f "$log_file" ]; then
            local backup_file="$BACKUP_DIR/$(basename $log_file)_$DATE"
            cp "$log_file" "$backup_file"
            gzip "$backup_file"
            log_message "备份二进制日志: $(basename $log_file)"
        fi
    done
}

# 清理旧的二进制日志
purge_old_binlogs() {
    local days_to_keep=7
    log_message "清理 $days_to_keep 天前的二进制日志"
    
    mysql -h $DB_HOST -u $DB_USER -p$DB_PASS -e \
        "PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL $days_to_keep DAY);"
}

# 主执行流程
main() {
    log_message "开始执行二进制日志备份任务"
    
    # 刷新日志
    flush_logs
    
    # 备份日志文件
    backup_binlogs
    
    # 清理旧日志
    purge_old_binlogs
    
    log_message "二进制日志备份任务完成"
}

# 执行主函数
main
```

### 定时任务配置

#### Cron 任务设置

```bash
# 编辑 crontab
crontab -e

# 添加定时任务
# 每天凌晨 2 点执行完整备份
0 2 * * * /backup/scripts/mysql_full_backup.sh

# 每小时执行增量备份（二进制日志）
0 * * * * /backup/scripts/mysql_binlog_backup.sh

# 每周日凌晨 1 点执行数据库优化
0 1 * * 0 /backup/scripts/mysql_optimize.sh

# 每月 1 号凌晨 3 点执行长期备份
0 3 1 * * /backup/scripts/mysql_monthly_backup.sh
```

#### Systemd Timer 配置

**创建服务文件**：
```ini
# /etc/systemd/system/mysql-backup.service
[Unit]
Description=MySQL Database Backup
After=mysql.service

[Service]
Type=oneshot
User=backup
ExecStart=/backup/scripts/mysql_full_backup.sh
```

**创建定时器文件**：
```ini
# /etc/systemd/system/mysql-backup.timer
[Unit]
Description=Run MySQL backup daily
Requires=mysql-backup.service

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

**启用定时器**：
```bash
# 重新加载 systemd 配置
sudo systemctl daemon-reload

# 启用并启动定时器
sudo systemctl enable mysql-backup.timer
sudo systemctl start mysql-backup.timer

# 查看定时器状态
sudo systemctl status mysql-backup.timer
```

### 监控与告警

#### 备份状态监控

```bash
#!/bin/bash
# 备份状态检查脚本

BACKUP_DIR="/backup/mysql"
LOG_FILE="/var/log/mysql_backup.log"
ALERT_EMAIL="admin@example.com"

# 检查最近备份
check_recent_backup() {
    local hours_threshold=25  # 25小时内应该有备份
    
    latest_backup=$(find $BACKUP_DIR -name "*.sql.gz" -mtime -1 | head -1)
    
    if [ -z "$latest_backup" ]; then
        echo "警告: 在过去 $hours_threshold 小时内没有找到备份文件"
        return 1
    else
        echo "最新备份文件: $latest_backup"
        return 0
    fi
}

# 检查备份文件完整性
check_backup_integrity() {
    local backup_file=$1
    
    # 检查文件是否可以正常解压
    if gzip -t "$backup_file" 2>/dev/null; then
        echo "备份文件 $backup_file 完整性检查通过"
        return 0
    else
        echo "错误: 备份文件 $backup_file 损坏"
        return 1
    fi
}

# 检查磁盘空间
check_disk_space() {
    local threshold=90  # 磁盘使用率阈值
    
    usage=$(df $BACKUP_DIR | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ $usage -gt $threshold ]; then
        echo "警告: 备份目录磁盘使用率 $usage% 超过阈值 $threshold%"
        return 1
    else
        echo "磁盘空间检查通过: 使用率 $usage%"
        return 0
    fi
}

# 发送告警
send_alert() {
    local message=$1
    echo "$message" | mail -s "MySQL备份告警" $ALERT_EMAIL
}

# 主检查流程
main() {
    echo "开始备份状态检查 - $(date)"
    
    errors=""
    
    # 检查最近备份
    if ! check_recent_backup; then
        errors="$errors\n- 缺少最近的备份文件"
    fi
    
    # 检查磁盘空间
    if ! check_disk_space; then
        errors="$errors\n- 磁盘空间不足"
    fi
    
    # 检查最新备份文件的完整性
    latest_backup=$(find $BACKUP_DIR -name "*.sql.gz" -mtime -1 | head -1)
    if [ -n "$latest_backup" ]; then
        if ! check_backup_integrity "$latest_backup"; then
            errors="$errors\n- 备份文件损坏"
        fi
    fi
    
    # 发送告警
    if [ -n "$errors" ]; then
        alert_message="MySQL备份系统发现以下问题:$errors"
        echo "$alert_message"
        send_alert "$alert_message"
    else
        echo "所有检查项目通过"
    fi
}

# 执行检查
main
```

#### 性能监控

```bash
#!/bin/bash
# 备份性能监控脚本

LOG_FILE="/var/log/mysql_backup.log"
METRICS_FILE="/var/log/backup_metrics.log"

# 分析备份性能
analyze_backup_performance() {
    echo "=== 备份性能分析报告 - $(date) ===" >> $METRICS_FILE
    
    # 分析最近7天的备份时间
    echo "最近7天备份时间统计:" >> $METRICS_FILE
    grep "备份成功" $LOG_FILE | tail -7 | while read line; do
        echo "$line" >> $METRICS_FILE
    done
    
    # 计算平均备份时间
    avg_time=$(grep "备份成功" $LOG_FILE | tail -7 | \
               awk '{print $NF}' | awk -F: '{print $1*60+$2}' | \
               awk '{sum+=$1} END {print sum/NR}')
    
    echo "平均备份时间: ${avg_time} 秒" >> $METRICS_FILE
    
    # 分析备份文件大小趋势
    echo "备份文件大小趋势:" >> $METRICS_FILE
    find /backup/mysql -name "*.sql.gz" -mtime -7 -exec ls -lh {} \; | \
        awk '{print $5, $9}' >> $METRICS_FILE
    
    echo "" >> $METRICS_FILE
}

# 执行性能分析
analyze_backup_performance
```

## 总结

MySQL 备份与恢复是数据库管理的核心技能，需要从多个维度进行全面规划：

1. **备份策略设计**：根据业务需求制定合适的备份策略
2. **备份方法选择**：选择适合的备份工具和技术
3. **恢复方案制定**：建立完整的恢复流程和测试机制
4. **灾难恢复规划**：制定全面的灾难恢复计划
5. **自动化实施**：构建自动化的备份监控系统

**关键要点**：
- 备份不是目的，能够成功恢复才是目标
- 定期测试备份和恢复流程的有效性
- 平衡备份成本和业务需求
- 建立完善的监控和告警机制
- 持续优化备份策略和技术方案

通过系统性的备份恢复管理，可以确保数据的安全性和业务的连续性，为企业的稳定运行提供坚实的保障。