# MySQL 高可用与扩展

## 高可用概述

高可用性（High Availability，HA）是指系统在面对各种故障时仍能持续提供服务的能力。对于数据库系统而言，高可用不仅要求系统能够快速从故障中恢复，还要确保数据的一致性和完整性。MySQL 高可用架构的设计需要综合考虑业务需求、技术复杂度、成本投入和运维能力等多个因素。

### 高可用的重要性

#### 业务连续性需求

**服务可用性要求**：
- 现代业务对系统可用性要求越来越高
- 7×24 小时不间断服务成为标准
- 任何停机都可能造成重大经济损失
- 用户体验直接影响业务竞争力

**数据价值保护**：
- 数据是企业最重要的资产之一
- 数据丢失可能导致不可挽回的损失
- 数据一致性关系到业务逻辑正确性
- 合规性要求对数据保护提出更高标准

**成本效益考量**：
- 停机成本远超高可用投入成本
- 声誉损失难以量化但影响深远
- 客户流失可能带来长期负面影响
- 监管处罚和法律风险不容忽视

#### 可用性指标

**可用性等级**：
- **99%**：年停机时间约 3.65 天
- **99.9%**：年停机时间约 8.77 小时
- **99.99%**：年停机时间约 52.6 分钟
- **99.999%**：年停机时间约 5.26 分钟
- **99.9999%**：年停机时间约 31.6 秒

**关键指标定义**：

**MTBF（平均故障间隔时间）**：
- 系统正常运行的平均时间
- 反映系统的可靠性水平
- 影响维护计划和资源配置
- 用于评估硬件和软件质量

**MTTR（平均恢复时间）**：
- 从故障发生到系统恢复的平均时间
- 包括故障检测、诊断和修复时间
- 直接影响系统可用性指标
- 是运维能力的重要体现

**RTO（恢复时间目标）**：
- 业务可接受的最大停机时间
- 用于指导技术方案选择
- 影响投资决策和架构设计
- 需要与业务部门协商确定

**RPO（恢复点目标）**：
- 业务可接受的最大数据丢失量
- 通常以时间为单位衡量
- 决定备份和复制策略
- 影响存储和网络投入

### 故障类型分析

#### 硬件故障

**服务器硬件故障**：
- **CPU 故障**：处理器损坏或过热
- **内存故障**：内存条损坏或不兼容
- **主板故障**：主板元件损坏
- **电源故障**：电源模块失效
- **风扇故障**：散热系统失效

**存储系统故障**：
- **硬盘故障**：机械硬盘或 SSD 损坏
- **RAID 控制器故障**：RAID 卡损坏
- **存储网络故障**：SAN/NAS 连接问题
- **文件系统损坏**：文件系统元数据损坏

**网络设备故障**：
- **网卡故障**：网络接口卡损坏
- **交换机故障**：网络交换设备失效
- **路由器故障**：网络路由设备问题
- **网络线路故障**：物理连接中断

#### 软件故障

**操作系统故障**：
- **系统崩溃**：内核 panic 或蓝屏
- **资源耗尽**：内存、文件描述符耗尽
- **配置错误**：系统参数配置不当
- **驱动程序问题**：设备驱动故障

**数据库软件故障**：
- **MySQL 进程崩溃**：mysqld 进程异常退出
- **死锁和阻塞**：事务处理异常
- **内存泄漏**：长期运行导致内存耗尽
- **配置错误**：参数配置不当导致故障

**应用程序故障**：
- **连接池耗尽**：数据库连接数超限
- **SQL 注入攻击**：恶意 SQL 执行
- **业务逻辑错误**：应用程序 Bug
- **性能问题**：慢查询导致系统响应缓慢

#### 人为因素

**操作错误**：
- **误删除数据**：错误的 DELETE 或 DROP 操作
- **配置错误**：参数配置不当
- **权限误操作**：错误的权限分配
- **维护操作失误**：升级或维护过程中的错误

**安全威胁**：
- **恶意攻击**：外部入侵和攻击
- **内部威胁**：内部人员的恶意操作
- **权限滥用**：超出职责范围的操作
- **数据泄露**：敏感数据的非授权访问

#### 环境因素

**电力问题**：
- **停电**：市电中断
- **电压不稳**：电压波动影响设备
- **UPS 故障**：不间断电源失效
- **发电机故障**：备用电源系统问题

**环境条件**：
- **温度异常**：机房温度过高或过低
- **湿度问题**：湿度过高或过低
- **空调故障**：制冷系统失效
- **消防系统误触发**：消防设备误动作

**自然灾害**：
- **地震**：地震导致设备损坏
- **火灾**：火灾烧毁设备和数据
- **洪水**：洪水淹没机房设备
- **台风**：强风暴雨影响设施

## 主从复制架构

主从复制是 MySQL 最基础也是最重要的高可用技术之一。通过将主服务器的数据变更实时同步到一个或多个从服务器，实现数据的冗余存储和读写分离，提高系统的可用性和性能。

### 复制原理

#### 复制机制详解

**二进制日志（Binary Log）**：
- 主服务器将所有数据变更操作记录到二进制日志中
- 日志以事件（Event）的形式存储
- 包括 DDL、DML 和事务控制语句
- 支持基于语句、行和混合模式的复制

**复制过程**：
1. **主服务器写入**：数据变更写入二进制日志
2. **从服务器请求**：从服务器的 I/O 线程连接主服务器
3. **日志传输**：主服务器的 Dump 线程发送日志事件
4. **中继日志**：从服务器将接收到的事件写入中继日志
5. **SQL 执行**：从服务器的 SQL 线程读取中继日志并执行

**复制线程**：

**主服务器端**：
- **Dump 线程**：负责向从服务器发送二进制日志事件
- 每个从服务器连接对应一个 Dump 线程
- 维护发送位置信息
- 处理从服务器的请求

**从服务器端**：
- **I/O 线程**：连接主服务器并请求二进制日志
- **SQL 线程**：执行中继日志中的 SQL 语句
- 两个线程独立工作，提高复制效率

#### 复制模式

**基于语句的复制（SBR）**：
- 复制实际执行的 SQL 语句
- 日志文件相对较小
- 某些函数可能导致数据不一致
- 适合大部分 OLTP 场景

**基于行的复制（RBR）**：
- 复制数据行的实际变更
- 数据一致性更好
- 日志文件可能较大
- 适合包含不确定函数的场景

**混合模式复制（MBR）**：
- 根据语句类型自动选择复制模式
- 平衡一致性和效率
- MySQL 5.7+ 的默认模式
- 提供最佳的兼容性

### 复制配置

#### 主服务器配置

**基本配置参数**：
```ini
# my.cnf 主服务器配置
[mysqld]
# 启用二进制日志
log-bin=mysql-bin

# 服务器唯一标识
server-id=1

# 二进制日志格式
binlog-format=ROW

# 同步二进制日志到磁盘
sync-binlog=1

# InnoDB 事务日志刷新策略
innodb-flush-log-at-trx-commit=1

# 二进制日志过期时间（天）
expire-logs-days=7

# 最大二进制日志文件大小
max-binlog-size=1G

# 二进制日志缓存大小
binlog-cache-size=1M

# 启用 GTID
gtid-mode=ON
enforce-gtid-consistency=ON
```

**创建复制用户**：
```sql
-- 创建专用的复制用户
CREATE USER 'repl_user'@'%' IDENTIFIED BY 'strong_password';

-- 授予复制权限
GRANT REPLICATION SLAVE ON *.* TO 'repl_user'@'%';

-- 刷新权限
FLUSH PRIVILEGES;

-- 查看主服务器状态
SHOW MASTER STATUS;
```

#### 从服务器配置

**基本配置参数**：
```ini
# my.cnf 从服务器配置
[mysqld]
# 服务器唯一标识（必须不同于主服务器）
server-id=2

# 启用中继日志
relay-log=relay-bin

# 从服务器只读模式
read-only=1

# 超级用户只读模式
super-read-only=1

# 跳过复制错误（谨慎使用）
# slave-skip-errors=1062,1032

# 并行复制线程数
slave-parallel-workers=4

# 并行复制类型
slave-parallel-type=LOGICAL_CLOCK

# 启用 GTID
gtid-mode=ON
enforce-gtid-consistency=ON
```

**配置复制连接**：
```sql
-- 配置主服务器连接信息
CHANGE MASTER TO
    MASTER_HOST='192.168.1.100',
    MASTER_PORT=3306,
    MASTER_USER='repl_user',
    MASTER_PASSWORD='strong_password',
    MASTER_AUTO_POSITION=1;  -- 使用 GTID 自动定位

-- 启动复制
START SLAVE;

-- 查看复制状态
SHOW SLAVE STATUS\G
```

#### 复制监控

**关键状态指标**：
```sql
-- 查看复制状态
SHOW SLAVE STATUS\G

-- 重要字段说明：
-- Slave_IO_Running: I/O 线程运行状态
-- Slave_SQL_Running: SQL 线程运行状态
-- Seconds_Behind_Master: 复制延迟（秒）
-- Last_IO_Error: I/O 线程最后错误
-- Last_SQL_Error: SQL 线程最后错误
-- Master_Log_File: 当前读取的主日志文件
-- Read_Master_Log_Pos: 当前读取位置
-- Relay_Master_Log_File: 中继日志对应的主日志文件
-- Exec_Master_Log_Pos: 已执行的主日志位置
```

**性能监控查询**：
```sql
-- 查看复制延迟
SELECT 
    CHANNEL_NAME,
    SERVICE_STATE,
    LAST_ERROR_MESSAGE,
    LAST_ERROR_TIMESTAMP
FROM performance_schema.replication_connection_status;

-- 查看复制应用状态
SELECT 
    CHANNEL_NAME,
    SERVICE_STATE,
    APPLYING_TRANSACTION,
    LAST_APPLIED_TRANSACTION
FROM performance_schema.replication_applier_status_by_coordinator;

-- 查看复制工作线程状态
SELECT 
    CHANNEL_NAME,
    WORKER_ID,
    SERVICE_STATE,
    LAST_ERROR_MESSAGE
FROM performance_schema.replication_applier_status_by_worker;
```

### 读写分离

读写分离是利用主从复制架构实现的一种负载均衡策略，将读操作分发到从服务器，写操作保留在主服务器，从而提高系统的整体性能和可扩展性。

#### 读写分离原理

**流量分发策略**：
- **写操作路由**：所有写操作（INSERT、UPDATE、DELETE）路由到主服务器
- **读操作路由**：读操作（SELECT）路由到从服务器
- **事务处理**：事务内的所有操作路由到同一服务器
- **一致性要求**：根据业务需求选择强一致性或最终一致性

**负载均衡算法**：
- **轮询（Round Robin）**：按顺序分发请求
- **加权轮询**：根据服务器性能分配权重
- **最少连接**：选择连接数最少的服务器
- **响应时间**：选择响应时间最短的服务器
- **哈希算法**：根据请求特征进行哈希分发

#### 实现方案

**应用层实现**：
```java
// Java 应用层读写分离示例
public class DatabaseRouter {
    private DataSource masterDataSource;
    private List<DataSource> slaveDataSources;
    private LoadBalancer loadBalancer;
    
    public DataSource getDataSource(boolean isWrite) {
        if (isWrite || TransactionSynchronizationManager.isCurrentTransactionReadOnly() == false) {
            return masterDataSource;
        } else {
            return loadBalancer.select(slaveDataSources);
        }
    }
    
    @Transactional(readOnly = true)
    public List<User> findUsers() {
        // 自动路由到从库
        return userRepository.findAll();
    }
    
    @Transactional
    public void saveUser(User user) {
        // 自动路由到主库
        userRepository.save(user);
    }
}
```

**中间件实现**：

**ProxySQL 配置**：
```sql
-- 配置后端服务器
INSERT INTO mysql_servers(hostgroup_id, hostname, port, weight) VALUES
(0, '192.168.1.100', 3306, 1000),  -- 主服务器
(1, '192.168.1.101', 3306, 900),   -- 从服务器1
(1, '192.168.1.102', 3306, 900);   -- 从服务器2

-- 配置用户
INSERT INTO mysql_users(username, password, default_hostgroup) VALUES
('app_user', 'password', 0);

-- 配置查询路由规则
INSERT INTO mysql_query_rules(rule_id, active, match_pattern, destination_hostgroup, apply) VALUES
(1, 1, '^SELECT.*', 1, 1),  -- 读操作路由到从库
(2, 1, '^INSERT|UPDATE|DELETE.*', 0, 1);  -- 写操作路由到主库

-- 加载配置
LOAD MYSQL SERVERS TO RUNTIME;
LOAD MYSQL USERS TO RUNTIME;
LOAD MYSQL QUERY RULES TO RUNTIME;

-- 保存配置
SAVE MYSQL SERVERS TO DISK;
SAVE MYSQL USERS TO DISK;
SAVE MYSQL QUERY RULES TO DISK;
```

**MaxScale 配置**：
```ini
# maxscale.cnf
[maxscale]
threads=auto

# 定义服务器
[master]
type=server
address=192.168.1.100
port=3306
protocol=MariaDBBackend

[slave1]
type=server
address=192.168.1.101
port=3306
protocol=MariaDBBackend

[slave2]
type=server
address=192.168.1.102
port=3306
protocol=MariaDBBackend

# 定义监控
[MySQL-Monitor]
type=monitor
module=mariadbmon
servers=master,slave1,slave2
user=monitor_user
password=monitor_password
monitor_interval=2000

# 定义读写分离服务
[Read-Write-Service]
type=service
router=readwritesplit
servers=master,slave1,slave2
user=maxscale_user
password=maxscale_password
max_slave_connections=100%
max_slave_replication_lag=30

# 定义监听器
[Read-Write-Listener]
type=listener
service=Read-Write-Service
protocol=MariaDBClient
port=4006
```

#### 一致性处理

**数据一致性挑战**：
- **复制延迟**：从库数据可能滞后于主库
- **读写时序**：写入后立即读取可能读到旧数据
- **事务一致性**：事务内的读写操作需要保持一致
- **会话一致性**：同一会话内的操作需要保持一致

**一致性解决方案**：

**强制主库读取**：
```java
@Service
public class UserService {
    
    @Transactional
    public void updateUserAndRead(Long userId, String newName) {
        // 更新操作，路由到主库
        userRepository.updateName(userId, newName);
        
        // 强制从主库读取最新数据
        User user = userRepository.findByIdFromMaster(userId);
        
        // 后续业务逻辑
        processUser(user);
    }
}
```

**延迟补偿机制**：
```java
public class ConsistencyManager {
    private static final int MAX_RETRY = 3;
    private static final long RETRY_INTERVAL = 100; // ms
    
    public <T> T readWithConsistency(Supplier<T> readOperation, 
                                   Predicate<T> consistencyCheck) {
        for (int i = 0; i < MAX_RETRY; i++) {
            T result = readOperation.get();
            if (consistencyCheck.test(result)) {
                return result;
            }
            
            if (i < MAX_RETRY - 1) {
                try {
                    Thread.sleep(RETRY_INTERVAL);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
        
        // 最后尝试从主库读取
        return readFromMaster();
    }
}
```

**会话粘性**：
```java
public class SessionStickyRouter {
    private ThreadLocal<Boolean> forcemaster = new ThreadLocal<>();
    private long stickyDuration = 5000; // 5秒
    
    public void markWriteOperation() {
        forcemaster.set(true);
        // 设置定时器，一段时间后允许读从库
        scheduleResetSticky();
    }
    
    public DataSource getDataSource(boolean isWrite) {
        if (isWrite || Boolean.TRUE.equals(forcemaster.get())) {
            return masterDataSource;
        } else {
            return selectSlaveDataSource();
        }
    }
}
```

## 集群技术

### MySQL Cluster (NDB)

MySQL Cluster 是 MySQL 的分布式计算环境，提供了高可用性、高性能和可扩展性。它使用 NDB 存储引擎，支持实时的、内存中的、冗余的、事务性的数据库操作。

#### NDB 架构

**组件构成**：

**管理节点（Management Node）**：
- 负责集群的配置和管理
- 监控其他节点的状态
- 处理集群的启动和关闭
- 通常部署 1-2 个节点以提供冗余

**数据节点（Data Node）**：
- 存储实际的数据
- 处理数据的读写操作
- 提供数据的冗余和分片
- 通常部署偶数个节点以支持复制

**SQL 节点（SQL Node）**：
- 提供标准的 MySQL 接口
- 处理 SQL 查询和事务
- 可以有多个节点以提供负载均衡
- 无状态设计，可以动态添加或删除

**数据分布**：
- **分片（Sharding）**：数据按主键哈希分布到不同节点
- **复制（Replication）**：每个分片有多个副本
- **节点组（Node Group）**：包含相同数据副本的节点集合
- **分区（Partition）**：数据的逻辑分割单位

#### 配置部署

**管理节点配置**：
```ini
# config.ini - 集群配置文件
[ndbd default]
NoOfReplicas=2
DataMemory=80M
IndexMemory=18M

[ndbd]
Hostname=192.168.1.10
DataDir=/var/lib/mysql-cluster

[ndbd]
Hostname=192.168.1.11
DataDir=/var/lib/mysql-cluster

[ndbd]
Hostname=192.168.1.12
DataDir=/var/lib/mysql-cluster

[ndbd]
Hostname=192.168.1.13
DataDir=/var/lib/mysql-cluster

[ndb_mgmd]
Hostname=192.168.1.20
DataDir=/var/lib/mysql-cluster

[mysqld]
Hostname=192.168.1.30

[mysqld]
Hostname=192.168.1.31
```

**数据节点配置**：
```ini
# my.cnf - 数据节点配置
[mysql_cluster]
ndb-connectstring=192.168.1.20

[ndbd]
datadir=/var/lib/mysql-cluster
```

**SQL 节点配置**：
```ini
# my.cnf - SQL 节点配置
[mysqld]
ndbcluster
ndb-connectstring=192.168.1.20

[mysql_cluster]
ndb-connectstring=192.168.1.20
```

#### 集群管理

**启动集群**：
```bash
# 1. 启动管理节点
ndb_mgmd -f /var/lib/mysql-cluster/config.ini

# 2. 启动数据节点
ndbd --initial  # 首次启动使用 --initial

# 3. 启动 SQL 节点
mysqld_safe &
```

**集群监控**：
```bash
# 连接到管理节点
ndb_mgm

# 查看集群状态
ndb_mgm> SHOW

# 查看详细状态
ndb_mgm> ALL STATUS

# 查看报告
ndb_mgm> ALL REPORT MEMORY
```

**在线维护**：
```bash
# 滚动重启节点
ndb_mgm> 2 RESTART

# 停止节点
ndb_mgm> 2 STOP

# 启动节点
ndb_mgm> 2 START

# 在线备份
ndb_mgm> START BACKUP
```

### Galera Cluster

Galera Cluster 是基于 Galera 复制库的 MySQL 集群解决方案，提供同步多主复制，确保数据的强一致性。

#### Galera 原理

**同步复制机制**：
- **写集复制**：事务在所有节点上同步执行
- **认证机制**：确保事务在所有节点上的一致性
- **冲突检测**：检测并解决并发事务冲突
- **自动故障转移**：节点故障时自动切换

**复制流程**：
1. **事务执行**：在本地节点执行事务
2. **写集生成**：生成事务的写集（Write Set）
3. **全局排序**：通过 GCS 进行全局排序
4. **认证检查**：检查是否与其他事务冲突
5. **应用事务**：在所有节点应用事务
6. **提交确认**：确认事务在所有节点提交

#### 配置部署

**基本配置**：
```ini
# my.cnf - Galera 配置
[mysqld]
# 基本设置
bind-address=0.0.0.0
default-storage-engine=innodb
innodb-autoinc-lock-mode=2
innodb-doublewrite=1
query-cache-size=0
query-cache-type=0

# Galera 设置
wsrep_on=ON
wsrep_provider=/usr/lib/galera/libgalera_smm.so
wsrep_cluster_name="my_galera_cluster"
wsrep_cluster_address="gcomm://192.168.1.10,192.168.1.11,192.168.1.12"
wsrep_node_name="node1"
wsrep_node_address="192.168.1.10"
wsrep_sst_method=rsync
wsrep_sst_auth=sst_user:sst_password

# 复制设置
wsrep_slave_threads=4
wsrep_certify_nonPK=1
wsrep_max_ws_rows=131072
wsrep_max_ws_size=1073741824
wsrep_debug=0
wsrep_convert_LOCK_to_trx=0
wsrep_retry_autocommit=1
wsrep_auto_increment_control=1
```

**集群初始化**：
```bash
# 第一个节点启动（引导集群）
mysqld_safe --wsrep-new-cluster &

# 其他节点正常启动
mysqld_safe &
```

**状态监控**：
```sql
-- 查看集群状态
SHOW STATUS LIKE 'wsrep_%';

-- 重要状态变量
-- wsrep_cluster_size: 集群节点数
-- wsrep_cluster_status: 集群状态
-- wsrep_connected: 是否连接到集群
-- wsrep_ready: 是否准备接受查询
-- wsrep_local_state_comment: 本地节点状态
```

#### 故障处理

**脑裂处理**：
```bash
# 检查集群状态
mysql -e "SHOW STATUS LIKE 'wsrep_cluster_size';"

# 如果出现脑裂，选择一个节点作为主节点
mysql -e "SET GLOBAL wsrep_provider_options='pc.bootstrap=YES';"

# 重新启动其他节点
systemctl restart mysql
```

**节点恢复**：
```bash
# 检查节点状态
mysql -e "SHOW STATUS LIKE 'wsrep_local_state_comment';"

# 如果节点状态异常，重新同步
mysql -e "SET GLOBAL wsrep_desync=ON;"
mysql -e "SET GLOBAL wsrep_desync=OFF;"
```

### Group Replication

MySQL Group Replication 是 MySQL 5.7 引入的原生集群解决方案，提供自动故障检测、故障转移和弹性扩展能力。

#### Group Replication 原理

**组复制机制**：
- **分布式状态机**：所有节点维护相同的状态
- **原子广播**：确保消息在所有节点的一致性传递
- **冲突检测**：基于认证数据库检测事务冲突
- **自动故障检测**：通过心跳机制检测节点故障

**一致性保证**：
- **最终一致性**：异步模式下的最终一致性
- **强一致性**：同步模式下的强一致性
- **读写一致性**：读操作可以在任意节点执行
- **因果一致性**：保证操作的因果关系

#### 配置部署

**基本配置**：
```ini
# my.cnf - Group Replication 配置
[mysqld]
# 基本设置
server-id=1
gtid-mode=ON
enforce-gtid-consistency=ON
master-info-repository=TABLE
relay-log-info-repository=TABLE
binlog-checksum=NONE
log-slave-updates=ON
log-bin=binlog
binlog-format=ROW

# Group Replication 设置
plugin-load-add='group_replication.so'
group_replication_group_name="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
group_replication_start_on_boot=off
group_replication_local_address="192.168.1.10:33061"
group_replication_group_seeds="192.168.1.10:33061,192.168.1.11:33061,192.168.1.12:33061"
group_replication_bootstrap_group=off

# 单主模式设置
group_replication_single_primary_mode=ON
group_replication_enforce_update_everywhere_checks=OFF
```

**启动组复制**：
```sql
-- 在第一个节点上启动组复制
SET GLOBAL group_replication_bootstrap_group=ON;
START GROUP_REPLICATION;
SET GLOBAL group_replication_bootstrap_group=OFF;

-- 在其他节点上加入组
START GROUP_REPLICATION;

-- 查看组成员
SELECT * FROM performance_schema.replication_group_members;
```

**监控管理**：
```sql
-- 查看组复制状态
SELECT 
    MEMBER_ID,
    MEMBER_HOST,
    MEMBER_PORT,
    MEMBER_STATE,
    MEMBER_ROLE
FROM performance_schema.replication_group_members;

-- 查看复制延迟
SELECT 
    COUNT_TRANSACTIONS_IN_QUEUE,
    COUNT_TRANSACTIONS_CHECKED,
    COUNT_CONFLICTS_DETECTED,
    COUNT_TRANSACTIONS_ROWS_VALIDATING
FROM performance_schema.replication_group_member_stats;
```

## 扩展策略

### 垂直扩展

垂直扩展（Scale Up）是通过增加单个服务器的硬件资源来提高系统性能的方法。这是最直接的扩展方式，但存在硬件限制和成本效益问题。

#### 硬件升级策略

**CPU 升级**：
- **核心数增加**：提高并发处理能力
- **频率提升**：提高单线程性能
- **缓存增大**：减少内存访问延迟
- **架构优化**：选择更先进的 CPU 架构

**内存扩展**：
- **容量增加**：支持更大的数据集和缓存
- **速度提升**：使用更快的内存类型
- **通道增加**：提高内存带宽
- **NUMA 优化**：优化多 CPU 系统的内存访问

**存储优化**：
- **SSD 替换**：使用 SSD 替换机械硬盘
- **NVMe 升级**：使用 NVMe SSD 提高 I/O 性能
- **RAID 配置**：优化 RAID 级别和配置
- **存储网络**：使用高速存储网络

**网络升级**：
- **带宽增加**：升级到更高带宽的网络
- **延迟优化**：使用低延迟网络设备
- **多网卡**：使用多个网卡提高吞吐量
- **网络优化**：优化网络协议栈参数

#### 性能调优

**MySQL 参数优化**：
```ini
# 高性能配置示例
[mysqld]
# 内存相关
innodb_buffer_pool_size=32G  # 设置为物理内存的 70-80%
innodb_buffer_pool_instances=8
innodb_log_buffer_size=64M
key_buffer_size=256M
query_cache_size=0  # 禁用查询缓存

# I/O 相关
innodb_io_capacity=2000
innodb_io_capacity_max=4000
innodb_read_io_threads=8
innodb_write_io_threads=8
innodb_flush_method=O_DIRECT

# 连接相关
max_connections=1000
max_connect_errors=100000
back_log=500
thread_cache_size=100

# 事务相关
innodb_flush_log_at_trx_commit=2
sync_binlog=0
innodb_support_xa=0
```

**操作系统优化**：
```bash
# 内核参数优化
echo 'vm.swappiness=1' >> /etc/sysctl.conf
echo 'vm.dirty_ratio=15' >> /etc/sysctl.conf
echo 'vm.dirty_background_ratio=5' >> /etc/sysctl.conf
echo 'net.core.somaxconn=65535' >> /etc/sysctl.conf
echo 'net.ipv4.tcp_max_syn_backlog=65535' >> /etc/sysctl.conf

# 文件系统优化
mount -o noatime,nodiratime /dev/sdb1 /var/lib/mysql

# I/O 调度器优化
echo noop > /sys/block/sdb/queue/scheduler
```

#### 垂直扩展限制

**硬件限制**：
- **物理极限**：单机硬件性能存在上限
- **成本效益**：高端硬件成本呈指数增长
- **可用性风险**：单点故障风险增加
- **扩展性差**：难以应对突发负载

**软件限制**：
- **架构瓶颈**：软件架构可能成为瓶颈
- **锁竞争**：高并发下锁竞争加剧
- **内存管理**：大内存管理复杂度增加
- **垃圾回收**：大堆内存的垃圾回收影响

### 水平扩展

水平扩展（Scale Out）是通过增加服务器数量来提高系统性能和容量的方法。这种方式具有更好的可扩展性和成本效益，但增加了系统复杂度。

#### 分库分表

**分库策略**：

**按业务分库**：
- 将不同业务模块的数据存储在不同数据库中
- 减少单库的数据量和访问压力
- 便于业务模块的独立开发和维护
- 需要处理跨库事务和查询问题

**按数据特征分库**：
- 根据数据的访问模式进行分库
- 如按地理位置、时间范围等分库
- 提高查询效率和数据局部性
- 需要合理设计分库规则

**分表策略**：

**水平分表**：
```sql
-- 按用户 ID 分表示例
CREATE TABLE user_0 (
    id BIGINT PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(100),
    created_at TIMESTAMP
);

CREATE TABLE user_1 (
    id BIGINT PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(100),
    created_at TIMESTAMP
);

-- 分表路由逻辑
-- table_index = user_id % table_count
```

**垂直分表**：
```sql
-- 将大表按字段拆分
CREATE TABLE user_basic (
    id BIGINT PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(100),
    created_at TIMESTAMP
);

CREATE TABLE user_profile (
    user_id BIGINT PRIMARY KEY,
    avatar VARCHAR(200),
    bio TEXT,
    preferences JSON,
    FOREIGN KEY (user_id) REFERENCES user_basic(id)
);
```

**分片算法**：

**哈希分片**：
```java
public class HashSharding {
    private int shardCount;
    
    public int getShardIndex(Object shardKey) {
        return Math.abs(shardKey.hashCode()) % shardCount;
    }
    
    public String getTableName(String baseTableName, Object shardKey) {
        int shardIndex = getShardIndex(shardKey);
        return baseTableName + "_" + shardIndex;
    }
}
```

**范围分片**：
```java
public class RangeSharding {
    private List<ShardRange> shardRanges;
    
    public int getShardIndex(long shardKey) {
        for (int i = 0; i < shardRanges.size(); i++) {
            ShardRange range = shardRanges.get(i);
            if (shardKey >= range.getStart() && shardKey < range.getEnd()) {
                return i;
            }
        }
        throw new IllegalArgumentException("Invalid shard key: " + shardKey);
    }
}
```

**一致性哈希**：
```java
public class ConsistentHashing {
    private TreeMap<Long, String> ring = new TreeMap<>();
    private int virtualNodes = 150;
    
    public void addNode(String node) {
        for (int i = 0; i < virtualNodes; i++) {
            long hash = hash(node + ":" + i);
            ring.put(hash, node);
        }
    }
    
    public String getNode(String key) {
        long hash = hash(key);
        Map.Entry<Long, String> entry = ring.ceilingEntry(hash);
        if (entry == null) {
            entry = ring.firstEntry();
        }
        return entry.getValue();
    }
}
```

#### 中间件解决方案

**ShardingSphere**：
```yaml
# sharding-jdbc 配置
dataSources:
  ds0:
    url: jdbc:mysql://192.168.1.10:3306/demo_ds_0
    username: root
    password: password
  ds1:
    url: jdbc:mysql://192.168.1.11:3306/demo_ds_1
    username: root
    password: password

shardingRule:
  tables:
    t_order:
      actualDataNodes: ds${0..1}.t_order_${0..1}
      tableStrategy:
        inline:
          shardingColumn: order_id
          algorithmExpression: t_order_${order_id % 2}
      keyGenerator:
        type: SNOWFLAKE
        column: order_id
  defaultDatabaseStrategy:
    inline:
      shardingColumn: user_id
      algorithmExpression: ds${user_id % 2}
```

**Vitess**：
```yaml
# Vitess 配置示例
topology:
  cells:
    - name: zone1
      keyspaces:
        - name: commerce
          shards:
            - name: "-80"
              tablets:
                - type: master
                  host: tablet1
                - type: replica
                  host: tablet2
            - name: "80-"
              tablets:
                - type: master
                  host: tablet3
                - type: replica
                  host: tablet4
```

#### 跨分片查询

**分布式查询处理**：
```java
public class DistributedQueryProcessor {
    
    public List<Order> queryOrdersByUserId(Long userId) {
        // 确定分片
        String shardKey = getShardKey(userId);
        
        // 单分片查询
        return queryFromShard(shardKey, userId);
    }
    
    public List<Order> queryOrdersByDateRange(Date start, Date end) {
        List<Order> results = new ArrayList<>();
        
        // 跨分片查询
        for (String shard : getAllShards()) {
            List<Order> shardResults = queryFromShard(shard, start, end);
            results.addAll(shardResults);
        }
        
        // 合并排序
        return mergeAndSort(results);
    }
    
    public long countOrdersByStatus(String status) {
        long totalCount = 0;
        
        // 并行查询所有分片
        List<CompletableFuture<Long>> futures = getAllShards().stream()
            .map(shard -> CompletableFuture.supplyAsync(() -> 
                countFromShard(shard, status)))
            .collect(Collectors.toList());
        
        // 汇总结果
        for (CompletableFuture<Long> future : futures) {
            totalCount += future.join();
        }
        
        return totalCount;
    }
}
```

**分布式事务处理**：
```java
@Service
public class DistributedTransactionService {
    
    @GlobalTransactional
    public void transferMoney(Long fromUserId, Long toUserId, BigDecimal amount) {
        // 可能涉及不同分片的操作
        accountService.debit(fromUserId, amount);
        accountService.credit(toUserId, amount);
        
        // 记录转账日志
        transactionLogService.log(fromUserId, toUserId, amount);
    }
    
    @Compensable
    public void processOrder(Order order) {
        try {
            // 减库存
            inventoryService.decreaseStock(order.getProductId(), order.getQuantity());
            
            // 创建订单
            orderService.createOrder(order);
            
            // 扣款
            paymentService.charge(order.getUserId(), order.getAmount());
            
        } catch (Exception e) {
            // 自动补偿
            compensate(order);
            throw e;
        }
    }
}
```

### 负载均衡

负载均衡是将工作负载分布到多个服务器上的技术，以提高系统的性能、可用性和可扩展性。

#### 负载均衡算法

**轮询（Round Robin）**：
```java
public class RoundRobinLoadBalancer {
    private List<Server> servers;
    private AtomicInteger currentIndex = new AtomicInteger(0);
    
    public Server selectServer() {
        if (servers.isEmpty()) {
            return null;
        }
        
        int index = currentIndex.getAndIncrement() % servers.size();
        return servers.get(index);
    }
}
```

**加权轮询（Weighted Round Robin）**：
```java
public class WeightedRoundRobinLoadBalancer {
    private List<WeightedServer> servers;
    private int totalWeight;
    private AtomicInteger currentWeight = new AtomicInteger(0);
    
    public Server selectServer() {
        int weight = currentWeight.getAndIncrement() % totalWeight;
        int currentSum = 0;
        
        for (WeightedServer server : servers) {
            currentSum += server.getWeight();
            if (weight < currentSum) {
                return server.getServer();
            }
        }
        
        return null;
    }
}
```

**最少连接（Least Connections）**：
```java
public class LeastConnectionsLoadBalancer {
    private List<Server> servers;
    private Map<Server, AtomicInteger> connectionCounts;
    
    public Server selectServer() {
        Server selectedServer = null;
        int minConnections = Integer.MAX_VALUE;
        
        for (Server server : servers) {
            int connections = connectionCounts.get(server).get();
            if (connections < minConnections) {
                minConnections = connections;
                selectedServer = server;
            }
        }
        
        return selectedServer;
    }
    
    public void onConnectionEstablished(Server server) {
        connectionCounts.get(server).incrementAndGet();
    }
    
    public void onConnectionClosed(Server server) {
        connectionCounts.get(server).decrementAndGet();
    }
}
```

**响应时间加权**：
```java
public class ResponseTimeWeightedLoadBalancer {
    private Map<Server, ResponseTimeTracker> responseTrackers;
    
    public Server selectServer() {
        Server bestServer = null;
        double bestScore = Double.MAX_VALUE;
        
        for (Server server : responseTrackers.keySet()) {
            ResponseTimeTracker tracker = responseTrackers.get(server);
            double avgResponseTime = tracker.getAverageResponseTime();
            int activeConnections = tracker.getActiveConnections();
            
            // 计算综合得分（响应时间 * 活跃连接数）
            double score = avgResponseTime * (activeConnections + 1);
            
            if (score < bestScore) {
                bestScore = score;
                bestServer = server;
            }
        }
        
        return bestServer;
    }
}
```

#### 健康检查

**主动健康检查**：
```java
public class HealthChecker {
    private ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(5);
    private Map<Server, Boolean> serverHealth = new ConcurrentHashMap<>();
    
    public void startHealthCheck() {
        scheduler.scheduleAtFixedRate(() -> {
            for (Server server : servers) {
                checkServerHealth(server);
            }
        }, 0, 30, TimeUnit.SECONDS);
    }
    
    private void checkServerHealth(Server server) {
        try {
            // 执行健康检查查询
            Connection conn = DriverManager.getConnection(
                server.getJdbcUrl(), server.getUsername(), server.getPassword());
            
            Statement stmt = conn.createStatement();
            stmt.setQueryTimeout(5); // 5秒超时
            
            ResultSet rs = stmt.executeQuery("SELECT 1");
            
            if (rs.next() && rs.getInt(1) == 1) {
                markServerHealthy(server);
            } else {
                markServerUnhealthy(server);
            }
            
            conn.close();
            
        } catch (Exception e) {
            markServerUnhealthy(server);
            logger.warn("Health check failed for server: " + server, e);
        }
    }
    
    private void markServerHealthy(Server server) {
        Boolean wasHealthy = serverHealth.put(server, true);
        if (wasHealthy == null || !wasHealthy) {
            logger.info("Server {} is now healthy", server);
            notifyServerHealthy(server);
        }
    }
    
    private void markServerUnhealthy(Server server) {
        Boolean wasHealthy = serverHealth.put(server, false);
        if (wasHealthy == null || wasHealthy) {
            logger.warn("Server {} is now unhealthy", server);
            notifyServerUnhealthy(server);
        }
    }
}
```

**被动健康检查**：
```java
public class PassiveHealthChecker {
    private Map<Server, FailureCounter> failureCounters = new ConcurrentHashMap<>();
    private int maxFailures = 3;
    private long recoveryTime = 60000; // 1分钟
    
    public void recordSuccess(Server server) {
        FailureCounter counter = failureCounters.get(server);
        if (counter != null) {
            counter.reset();
        }
    }
    
    public void recordFailure(Server server) {
        FailureCounter counter = failureCounters.computeIfAbsent(
            server, k -> new FailureCounter());
        
        counter.increment();
        
        if (counter.getCount() >= maxFailures) {
            markServerUnhealthy(server);
            scheduleRecoveryCheck(server);
        }
    }
    
    private void scheduleRecoveryCheck(Server server) {
        scheduler.schedule(() -> {
            // 尝试恢复服务器
            if (checkServerRecovery(server)) {
                markServerHealthy(server);
                failureCounters.get(server).reset();
            } else {
                scheduleRecoveryCheck(server); // 继续检查
            }
        }, recoveryTime, TimeUnit.MILLISECONDS);
    }
}
```

## 总结

MySQL 高可用与扩展是构建可靠数据库系统的关键技术，需要综合考虑多个方面：

1. **高可用设计**：通过冗余、故障检测和自动切换确保服务连续性
2. **复制技术**：利用主从复制、集群技术实现数据冗余和负载分担
3. **扩展策略**：根据业务需求选择垂直扩展或水平扩展方案
4. **负载均衡**：通过智能路由和健康检查优化资源利用
5. **监控运维**：建立完善的监控体系和运维流程

**关键要点**：
- 根据业务需求选择合适的高可用方案
- 平衡一致性、可用性和分区容错性
- 考虑系统复杂度和运维成本
- 建立完善的测试和演练机制
- 持续优化和改进架构设计

通过合理的高可用和扩展设计，可以构建出既稳定可靠又能灵活扩展的 MySQL 数据库系统，为业务发展提供坚实的技术支撑。