# MySQL 监控与运维

## 监控体系概述

数据库监控是确保 MySQL 系统稳定运行的重要手段，通过实时收集、分析和展示各种性能指标，帮助运维人员及时发现问题、预防故障，并为性能优化提供数据支撑。完善的监控体系不仅能够提高系统可用性，还能显著降低运维成本和业务风险。

### 监控的重要性

#### 故障预防与快速响应

**早期预警机制**：
- 通过监控关键指标的变化趋势，在问题恶化前发出预警
- 识别性能瓶颈和资源不足的早期征象
- 预测系统容量需求，提前进行扩容规划
- 发现异常访问模式和潜在的安全威胁

**故障快速定位**：
- 提供详细的性能数据和历史趋势分析
- 帮助快速识别故障根因和影响范围
- 缩短平均故障恢复时间（MTTR）
- 减少故障对业务的影响时间和范围

**性能优化指导**：
- 识别系统性能瓶颈和优化机会
- 提供数据驱动的优化决策支持
- 验证优化措施的效果
- 建立性能基线和对比标准

#### 业务价值体现

**服务质量保障**：
- 确保数据库服务的稳定性和可用性
- 维护用户体验和客户满意度
- 支撑业务的持续增长和发展
- 降低因系统故障导致的业务损失

**运维效率提升**：
- 自动化监控减少人工巡检工作量
- 智能告警避免无效报警和漏报
- 统一监控平台提高运维效率
- 历史数据分析支持运维决策

**成本控制优化**：
- 合理规划资源配置，避免过度投资
- 及时发现资源浪费和优化机会
- 延长硬件设备的使用寿命
- 降低因故障导致的损失和恢复成本

### 监控层次架构

#### 基础设施监控

**硬件资源监控**：
- **CPU 使用率**：整体使用率、各核心负载分布、上下文切换频率
- **内存使用情况**：物理内存、虚拟内存、缓存和缓冲区使用
- **磁盘 I/O 性能**：读写速度、IOPS、队列深度、响应时间
- **网络流量**：带宽使用率、数据包丢失率、连接数统计

**操作系统监控**：
- **系统负载**：平均负载、进程数量、线程状态分布
- **文件系统**：磁盘空间使用率、inode 使用情况
- **系统进程**：MySQL 进程状态、资源占用情况
- **系统日志**：内核日志、系统错误信息

#### 数据库服务监控

**连接管理监控**：
- **连接数统计**：当前连接数、最大连接数、连接使用率
- **连接质量**：连接建立速度、连接超时情况
- **用户会话**：活跃会话数、长时间运行的会话
- **连接池状态**：连接池大小、空闲连接数、等待队列长度

**查询性能监控**：
- **查询执行统计**：查询数量、平均执行时间、慢查询数量
- **SQL 语句分析**：最频繁的查询、最耗时的查询
- **索引使用情况**：索引命中率、全表扫描次数
- **锁等待情况**：锁等待时间、死锁发生频率

**存储引擎监控**：
- **InnoDB 状态**：缓冲池命中率、日志写入速度、页面读写统计
- **事务处理**：事务数量、回滚率、长事务监控
- **表空间使用**：数据文件大小、自动扩展情况
- **复制状态**：主从延迟、复制错误、二进制日志状态

#### 应用层监控

**业务指标监控**：
- **关键业务操作**：订单处理量、用户登录次数、支付成功率
- **数据一致性**：数据校验结果、主从数据一致性检查
- **业务流程监控**：关键业务流程的执行时间和成功率
- **用户体验指标**：页面响应时间、接口调用成功率

**应用性能监控**：
- **数据库连接池**：连接获取时间、连接泄漏检测
- **ORM 性能**：SQL 生成效率、N+1 查询检测
- **缓存效果**：缓存命中率、缓存更新频率
- **异常监控**：数据库异常、连接超时、查询错误

### 监控指标体系

#### 可用性指标

**服务可用性**：
- **服务状态**：MySQL 服务是否正常运行
- **连接可用性**：是否能够正常建立数据库连接
- **响应能力**：基本查询的响应时间
- **故障恢复时间**：从故障发生到服务恢复的时间

**数据可用性**：
- **数据完整性**：数据是否完整无损
- **数据一致性**：主从数据是否一致
- **备份可用性**：备份文件是否可用
- **恢复能力**：数据恢复的速度和成功率

#### 性能指标

**吞吐量指标**：
- **QPS（每秒查询数）**：系统每秒处理的查询数量
- **TPS（每秒事务数）**：系统每秒处理的事务数量
- **连接吞吐量**：每秒建立和关闭的连接数
- **数据传输量**：每秒传输的数据量

**响应时间指标**：
- **平均响应时间**：查询的平均执行时间
- **95% 响应时间**：95% 的查询在此时间内完成
- **99% 响应时间**：99% 的查询在此时间内完成
- **最大响应时间**：最长的查询执行时间

**资源利用率指标**：
- **CPU 利用率**：数据库进程的 CPU 使用情况
- **内存利用率**：缓冲池和其他内存结构的使用情况
- **磁盘利用率**：磁盘空间和 I/O 资源的使用情况
- **网络利用率**：网络带宽的使用情况

#### 错误指标

**错误率统计**：
- **查询错误率**：失败查询占总查询的比例
- **连接错误率**：连接失败占总连接尝试的比例
- **事务回滚率**：回滚事务占总事务的比例
- **复制错误率**：复制过程中发生错误的频率

**异常事件监控**：
- **慢查询数量**：执行时间超过阈值的查询数量
- **死锁发生次数**：系统中死锁的发生频率
- **连接超时次数**：连接建立或查询超时的次数
- **内存不足事件**：内存分配失败的次数

## 性能监控

### 关键性能指标

#### 查询性能指标

**查询执行统计**：

MySQL 提供了丰富的性能统计信息，通过 `SHOW STATUS` 命令可以查看各种查询执行统计：

```sql
-- 查看查询执行统计
SHOW GLOBAL STATUS LIKE 'Com_%';

-- 重要指标说明：
-- Com_select: SELECT 语句执行次数
-- Com_insert: INSERT 语句执行次数
-- Com_update: UPDATE 语句执行次数
-- Com_delete: DELETE 语句执行次数
-- Com_commit: COMMIT 操作次数
-- Com_rollback: ROLLBACK 操作次数

-- 查看查询缓存统计
SHOW GLOBAL STATUS LIKE 'Qcache_%';

-- 查看慢查询统计
SHOW GLOBAL STATUS LIKE 'Slow_queries';

-- 查看连接统计
SHOW GLOBAL STATUS LIKE 'Connections';
SHOW GLOBAL STATUS LIKE 'Max_used_connections';
SHOW GLOBAL STATUS LIKE 'Threads_%';
```

**性能模式监控**：

MySQL 5.5+ 引入的 Performance Schema 提供了更详细的性能监控信息：

```sql
-- 启用性能模式
SET GLOBAL performance_schema = ON;

-- 查看最耗时的 SQL 语句
SELECT 
    DIGEST_TEXT,
    COUNT_STAR as exec_count,
    AVG_TIMER_WAIT/1000000000 as avg_time_sec,
    MAX_TIMER_WAIT/1000000000 as max_time_sec,
    SUM_TIMER_WAIT/1000000000 as total_time_sec
FROM performance_schema.events_statements_summary_by_digest
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;

-- 查看表的 I/O 统计
SELECT 
    OBJECT_SCHEMA,
    OBJECT_NAME,
    COUNT_READ,
    COUNT_WRITE,
    COUNT_FETCH,
    COUNT_INSERT,
    COUNT_UPDATE,
    COUNT_DELETE
FROM performance_schema.table_io_waits_summary_by_table
WHERE OBJECT_SCHEMA NOT IN ('mysql', 'performance_schema', 'information_schema')
ORDER BY COUNT_READ + COUNT_WRITE DESC
LIMIT 10;

-- 查看索引使用统计
SELECT 
    OBJECT_SCHEMA,
    OBJECT_NAME,
    INDEX_NAME,
    COUNT_FETCH,
    COUNT_INSERT,
    COUNT_UPDATE,
    COUNT_DELETE
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE OBJECT_SCHEMA NOT IN ('mysql', 'performance_schema', 'information_schema')
ORDER BY COUNT_FETCH DESC
LIMIT 10;
```

**实时性能监控**：

```sql
-- 查看当前正在执行的查询
SELECT 
    ID,
    USER,
    HOST,
    DB,
    COMMAND,
    TIME,
    STATE,
    INFO
FROM INFORMATION_SCHEMA.PROCESSLIST
WHERE COMMAND != 'Sleep'
ORDER BY TIME DESC;

-- 查看锁等待情况
SELECT 
    r.trx_id waiting_trx_id,
    r.trx_mysql_thread_id waiting_thread,
    r.trx_query waiting_query,
    b.trx_id blocking_trx_id,
    b.trx_mysql_thread_id blocking_thread,
    b.trx_query blocking_query
FROM information_schema.innodb_lock_waits w
INNER JOIN information_schema.innodb_trx b ON b.trx_id = w.blocking_trx_id
INNER JOIN information_schema.innodb_trx r ON r.trx_id = w.requesting_trx_id;

-- 查看 InnoDB 状态
SHOW ENGINE INNODB STATUS\G
```

#### 资源使用监控

**内存使用监控**：

```sql
-- 查看缓冲池状态
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_%';

-- 重要指标：
-- Innodb_buffer_pool_pages_total: 缓冲池总页数
-- Innodb_buffer_pool_pages_free: 空闲页数
-- Innodb_buffer_pool_pages_data: 数据页数
-- Innodb_buffer_pool_pages_dirty: 脏页数
-- Innodb_buffer_pool_read_requests: 读请求次数
-- Innodb_buffer_pool_reads: 物理读次数

-- 计算缓冲池命中率
SELECT 
    ROUND(
        (1 - (Innodb_buffer_pool_reads / Innodb_buffer_pool_read_requests)) * 100, 2
    ) AS buffer_pool_hit_rate
FROM (
    SELECT 
        VARIABLE_VALUE AS Innodb_buffer_pool_reads
    FROM INFORMATION_SCHEMA.GLOBAL_STATUS 
    WHERE VARIABLE_NAME = 'Innodb_buffer_pool_reads'
) AS reads,
(
    SELECT 
        VARIABLE_VALUE AS Innodb_buffer_pool_read_requests
    FROM INFORMATION_SCHEMA.GLOBAL_STATUS 
    WHERE VARIABLE_NAME = 'Innodb_buffer_pool_read_requests'
) AS requests;

-- 查看内存使用详情（MySQL 5.7+）
SELECT 
    EVENT_NAME,
    CURRENT_NUMBER_OF_BYTES_USED/1024/1024 AS current_mb,
    HIGH_NUMBER_OF_BYTES_USED/1024/1024 AS high_mb
FROM performance_schema.memory_summary_global_by_event_name
WHERE CURRENT_NUMBER_OF_BYTES_USED > 0
ORDER BY CURRENT_NUMBER_OF_BYTES_USED DESC
LIMIT 10;
```

**磁盘 I/O 监控**：

```sql
-- 查看文件 I/O 统计
SELECT 
    FILE_NAME,
    EVENT_NAME,
    COUNT_READ,
    COUNT_WRITE,
    SUM_NUMBER_OF_BYTES_READ/1024/1024 AS read_mb,
    SUM_NUMBER_OF_BYTES_WRITE/1024/1024 AS write_mb
FROM performance_schema.file_summary_by_instance
WHERE EVENT_NAME LIKE '%innodb%'
ORDER BY SUM_NUMBER_OF_BYTES_READ + SUM_NUMBER_OF_BYTES_WRITE DESC
LIMIT 10;

-- 查看表空间使用情况
SELECT 
    TABLE_SCHEMA,
    TABLE_NAME,
    ROUND(DATA_LENGTH/1024/1024, 2) AS data_mb,
    ROUND(INDEX_LENGTH/1024/1024, 2) AS index_mb,
    ROUND((DATA_LENGTH + INDEX_LENGTH)/1024/1024, 2) AS total_mb
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA NOT IN ('mysql', 'performance_schema', 'information_schema', 'sys')
ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC
LIMIT 10;
```

### 监控工具

#### 原生监控工具

**mysqladmin 工具**：

```bash
# 查看服务器状态
mysqladmin -u root -p status

# 持续监控服务器状态
mysqladmin -u root -p -i 5 status

# 查看进程列表
mysqladmin -u root -p processlist

# 查看扩展状态
mysqladmin -u root -p extended-status

# 查看变量
mysqladmin -u root -p variables

# 刷新日志
mysqladmin -u root -p flush-logs

# 检查服务器是否存活
mysqladmin -u root -p ping
```

**MySQL Workbench**：
- 图形化的性能监控界面
- 实时性能仪表板
- 查询分析和优化建议
- 服务器配置管理
- 用户和权限管理

**MySQL Enterprise Monitor**：
- 企业级监控解决方案
- 自动化监控和告警
- 性能趋势分析
- 查询分析器
- 配置建议和最佳实践

#### 第三方监控工具

**Prometheus + Grafana**：

```yaml
# prometheus.yml 配置
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'mysql'
    static_configs:
      - targets: ['localhost:9104']
    scrape_interval: 5s
    metrics_path: /metrics
```

```bash
# 安装 MySQL Exporter
wget https://github.com/prometheus/mysqld_exporter/releases/download/v0.14.0/mysqld_exporter-0.14.0.linux-amd64.tar.gz
tar xvf mysqld_exporter-0.14.0.linux-amd64.tar.gz

# 创建监控用户
mysql -u root -p -e "
CREATE USER 'exporter'@'localhost' IDENTIFIED BY 'password';
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'localhost';
FLUSH PRIVILEGES;
"

# 启动 MySQL Exporter
./mysqld_exporter --config.my-cnf=/etc/mysql/my.cnf
```

**Zabbix 监控**：

```xml
<!-- MySQL 监控模板 -->
<template>
    <name>MySQL Server</name>
    <items>
        <item>
            <name>MySQL Status</name>
            <key>mysql.ping</key>
            <type>0</type>
            <value_type>3</value_type>
            <delay>60</delay>
        </item>
        <item>
            <name>MySQL Queries per second</name>
            <key>mysql.qps</key>
            <type>0</type>
            <value_type>0</value_type>
            <delay>60</delay>
        </item>
        <item>
            <name>MySQL Connections</name>
            <key>mysql.connections</key>
            <type>0</type>
            <value_type>3</value_type>
            <delay>60</delay>
        </item>
    </items>
    <triggers>
        <trigger>
            <expression>{MySQL Server:mysql.ping.last()}=0</expression>
            <name>MySQL is down</name>
            <priority>5</priority>
        </trigger>
    </triggers>
</template>
```

**Nagios 监控**：

```bash
# 安装 MySQL 插件
wget https://github.com/nagios-plugins/nagios-plugins/archive/release-2.3.3.tar.gz
tar xzf release-2.3.3.tar.gz
cd nagios-plugins-release-2.3.3
./configure --with-mysql
make && make install

# 配置监控项
define service {
    use                     generic-service
    host_name               mysql-server
    service_description     MySQL Status
    check_command           check_mysql!username!password
    normal_check_interval   5
    retry_check_interval    1
}

define service {
    use                     generic-service
    host_name               mysql-server
    service_description     MySQL Slave Status
    check_command           check_mysql_slave!username!password
    normal_check_interval   5
    retry_check_interval    1
}
```

#### 自定义监控脚本

**Python 监控脚本**：

```python
#!/usr/bin/env python3
import mysql.connector
import time
import json
import logging
from datetime import datetime

class MySQLMonitor:
    def __init__(self, config):
        self.config = config
        self.connection = None
        self.logger = self._setup_logger()
    
    def _setup_logger(self):
        logger = logging.getLogger('mysql_monitor')
        logger.setLevel(logging.INFO)
        
        handler = logging.FileHandler('/var/log/mysql_monitor.log')
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        return logger
    
    def connect(self):
        try:
            self.connection = mysql.connector.connect(
                host=self.config['host'],
                user=self.config['user'],
                password=self.config['password'],
                database=self.config['database']
            )
            return True
        except Exception as e:
            self.logger.error(f"Connection failed: {e}")
            return False
    
    def get_status_variables(self):
        cursor = self.connection.cursor()
        cursor.execute("SHOW GLOBAL STATUS")
        
        status = {}
        for name, value in cursor.fetchall():
            try:
                status[name] = int(value)
            except ValueError:
                status[name] = value
        
        cursor.close()
        return status
    
    def get_innodb_status(self):
        cursor = self.connection.cursor()
        cursor.execute("SHOW ENGINE INNODB STATUS")
        
        result = cursor.fetchone()
        innodb_status = result[2] if result else ""
        
        cursor.close()
        return innodb_status
    
    def get_processlist(self):
        cursor = self.connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT ID, USER, HOST, DB, COMMAND, TIME, STATE, INFO
            FROM INFORMATION_SCHEMA.PROCESSLIST
            WHERE COMMAND != 'Sleep'
            ORDER BY TIME DESC
        """)
        
        processes = cursor.fetchall()
        cursor.close()
        return processes
    
    def get_slow_queries(self):
        cursor = self.connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                DIGEST_TEXT,
                COUNT_STAR as exec_count,
                AVG_TIMER_WAIT/1000000000 as avg_time_sec,
                MAX_TIMER_WAIT/1000000000 as max_time_sec,
                SUM_TIMER_WAIT/1000000000 as total_time_sec
            FROM performance_schema.events_statements_summary_by_digest
            WHERE AVG_TIMER_WAIT/1000000000 > 1
            ORDER BY SUM_TIMER_WAIT DESC
            LIMIT 10
        """)
        
        slow_queries = cursor.fetchall()
        cursor.close()
        return slow_queries
    
    def calculate_metrics(self, status):
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'connections': {
                'current': status.get('Threads_connected', 0),
                'max_used': status.get('Max_used_connections', 0),
                'total': status.get('Connections', 0)
            },
            'queries': {
                'total': status.get('Queries', 0),
                'select': status.get('Com_select', 0),
                'insert': status.get('Com_insert', 0),
                'update': status.get('Com_update', 0),
                'delete': status.get('Com_delete', 0)
            },
            'innodb': {
                'buffer_pool_hit_rate': self._calculate_buffer_pool_hit_rate(status),
                'pages_read': status.get('Innodb_buffer_pool_reads', 0),
                'pages_written': status.get('Innodb_buffer_pool_pages_flushed', 0)
            },
            'slow_queries': status.get('Slow_queries', 0)
        }
        
        return metrics
    
    def _calculate_buffer_pool_hit_rate(self, status):
        reads = status.get('Innodb_buffer_pool_reads', 0)
        read_requests = status.get('Innodb_buffer_pool_read_requests', 0)
        
        if read_requests > 0:
            hit_rate = (1 - (reads / read_requests)) * 100
            return round(hit_rate, 2)
        return 0
    
    def monitor(self):
        if not self.connect():
            return None
        
        try:
            status = self.get_status_variables()
            metrics = self.calculate_metrics(status)
            
            # 检查告警条件
            self._check_alerts(metrics)
            
            # 记录监控数据
            self.logger.info(f"Metrics: {json.dumps(metrics)}")
            
            return metrics
            
        except Exception as e:
            self.logger.error(f"Monitoring failed: {e}")
            return None
        finally:
            if self.connection:
                self.connection.close()
    
    def _check_alerts(self, metrics):
        # 连接数告警
        if metrics['connections']['current'] > 80:
            self.logger.warning(
                f"High connection count: {metrics['connections']['current']}"
            )
        
        # 缓冲池命中率告警
        if metrics['innodb']['buffer_pool_hit_rate'] < 95:
            self.logger.warning(
                f"Low buffer pool hit rate: {metrics['innodb']['buffer_pool_hit_rate']}%"
            )
        
        # 慢查询告警
        if metrics['slow_queries'] > 100:
            self.logger.warning(
                f"High slow query count: {metrics['slow_queries']}"
            )

# 使用示例
if __name__ == "__main__":
    config = {
        'host': 'localhost',
        'user': 'monitor_user',
        'password': 'monitor_password',
        'database': 'mysql'
    }
    
    monitor = MySQLMonitor(config)
    
    while True:
        metrics = monitor.monitor()
        if metrics:
            print(json.dumps(metrics, indent=2))
        
        time.sleep(60)  # 每分钟监控一次
```

**Shell 监控脚本**：

```bash
#!/bin/bash
# MySQL 监控脚本

# 配置参数
MYSQL_USER="monitor_user"
MYSQL_PASS="monitor_password"
MYSQL_HOST="localhost"
MYSQL_PORT="3306"
LOG_FILE="/var/log/mysql_monitor.log"
ALERT_EMAIL="admin@example.com"

# 日志函数
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

# 发送告警
send_alert() {
    local subject="$1"
    local message="$2"
    echo "$message" | mail -s "$subject" $ALERT_EMAIL
    log_message "ALERT: $subject - $message"
}

# 检查 MySQL 服务状态
check_mysql_status() {
    if ! mysqladmin -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER -p$MYSQL_PASS ping >/dev/null 2>&1; then
        send_alert "MySQL Service Down" "MySQL service is not responding on $MYSQL_HOST:$MYSQL_PORT"
        return 1
    fi
    return 0
}

# 检查连接数
check_connections() {
    local current_connections=$(mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER -p$MYSQL_PASS -e "SHOW STATUS LIKE 'Threads_connected';" | awk 'NR==2 {print $2}')
    local max_connections=$(mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER -p$MYSQL_PASS -e "SHOW VARIABLES LIKE 'max_connections';" | awk 'NR==2 {print $2}')
    
    local usage_percent=$((current_connections * 100 / max_connections))
    
    log_message "Connections: $current_connections/$max_connections ($usage_percent%)"
    
    if [ $usage_percent -gt 80 ]; then
        send_alert "High Connection Usage" "Connection usage is $usage_percent% ($current_connections/$max_connections)"
    fi
}

# 检查慢查询
check_slow_queries() {
    local slow_queries=$(mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER -p$MYSQL_PASS -e "SHOW STATUS LIKE 'Slow_queries';" | awk 'NR==2 {print $2}')
    
    # 读取上次的慢查询数量
    local last_slow_queries=0
    if [ -f "/tmp/last_slow_queries" ]; then
        last_slow_queries=$(cat /tmp/last_slow_queries)
    fi
    
    local new_slow_queries=$((slow_queries - last_slow_queries))
    
    log_message "Slow queries: $slow_queries (new: $new_slow_queries)"
    
    if [ $new_slow_queries -gt 10 ]; then
        send_alert "High Slow Query Rate" "$new_slow_queries new slow queries detected"
    fi
    
    echo $slow_queries > /tmp/last_slow_queries
}

# 检查复制状态
check_replication() {
    local slave_status=$(mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER -p$MYSQL_PASS -e "SHOW SLAVE STATUS\G" 2>/dev/null)
    
    if [ -n "$slave_status" ]; then
        local io_running=$(echo "$slave_status" | grep "Slave_IO_Running:" | awk '{print $2}')
        local sql_running=$(echo "$slave_status" | grep "Slave_SQL_Running:" | awk '{print $2}')
        local seconds_behind=$(echo "$slave_status" | grep "Seconds_Behind_Master:" | awk '{print $2}')
        
        log_message "Replication - IO: $io_running, SQL: $sql_running, Lag: $seconds_behind seconds"
        
        if [ "$io_running" != "Yes" ] || [ "$sql_running" != "Yes" ]; then
            send_alert "Replication Error" "Slave IO: $io_running, SQL: $sql_running"
        fi
        
        if [ "$seconds_behind" != "NULL" ] && [ $seconds_behind -gt 300 ]; then
            send_alert "High Replication Lag" "Replication lag is $seconds_behind seconds"
        fi
    fi
}

# 检查磁盘空间
check_disk_space() {
    local mysql_datadir=$(mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER -p$MYSQL_PASS -e "SHOW VARIABLES LIKE 'datadir';" | awk 'NR==2 {print $2}')
    local disk_usage=$(df $mysql_datadir | tail -1 | awk '{print $5}' | sed 's/%//')
    
    log_message "Disk usage: $disk_usage%"
    
    if [ $disk_usage -gt 85 ]; then
        send_alert "High Disk Usage" "Disk usage is $disk_usage% for MySQL data directory"
    fi
}

# 主监控函数
main() {
    log_message "Starting MySQL monitoring check"
    
    # 检查 MySQL 服务状态
    if ! check_mysql_status; then
        exit 1
    fi
    
    # 执行各项检查
    check_connections
    check_slow_queries
    check_replication
    check_disk_space
    
    log_message "MySQL monitoring check completed"
}

# 执行主函数
main
```

## 日志管理

### 日志类型

#### 错误日志

错误日志记录了 MySQL 服务器启动、运行和关闭过程中的重要信息，包括错误、警告和注意事项。这是故障诊断的重要信息源。

**错误日志配置**：

```ini
# my.cnf 错误日志配置
[mysqld]
# 启用错误日志
log-error=/var/log/mysql/error.log

# 日志级别设置
log-error-verbosity=3  # 1=错误, 2=错误+警告, 3=错误+警告+信息

# 日志时间戳格式
log-timestamps=SYSTEM  # SYSTEM 或 UTC
```

**错误日志分析**：

```bash
# 查看最近的错误
tail -f /var/log/mysql/error.log

# 搜索特定错误
grep -i "error" /var/log/mysql/error.log
grep -i "warning" /var/log/mysql/error.log
grep -i "crash" /var/log/mysql/error.log

# 统计错误类型
grep -i "error" /var/log/mysql/error.log | awk '{print $4}' | sort | uniq -c | sort -nr

# 查看启动信息
grep -i "ready for connections" /var/log/mysql/error.log

# 查看关闭信息
grep -i "shutdown" /var/log/mysql/error.log
```

#### 慢查询日志

慢查询日志记录执行时间超过指定阈值的 SQL 语句，是性能优化的重要工具。

**慢查询日志配置**：

```ini
# my.cnf 慢查询日志配置
[mysqld]
# 启用慢查询日志
slow-query-log=1
slow-query-log-file=/var/log/mysql/slow.log

# 慢查询时间阈值（秒）
long-query-time=2

# 记录未使用索引的查询
log-queries-not-using-indexes=1

# 限制未使用索引查询的记录频率
log-throttle-queries-not-using-indexes=10

# 记录管理语句
log-slow-admin-statements=1

# 记录从库上的慢查询
log-slow-slave-statements=1
```

**慢查询日志分析**：

```bash
# 使用 mysqldumpslow 分析慢查询日志
mysqldumpslow -s t -t 10 /var/log/mysql/slow.log  # 按时间排序，显示前10条
mysqldumpslow -s c -t 10 /var/log/mysql/slow.log  # 按次数排序，显示前10条
mysqldumpslow -s l -t 10 /var/log/mysql/slow.log  # 按锁定时间排序

# 分析特定时间段的慢查询
mysqldumpslow -s t -t 10 -g "2023-12-01" /var/log/mysql/slow.log

# 过滤特定用户的慢查询
mysqldumpslow -s t -t 10 -g "user_name" /var/log/mysql/slow.log

# 使用 pt-query-digest 进行详细分析
pt-query-digest /var/log/mysql/slow.log > slow_query_report.txt

# 实时监控慢查询
tail -f /var/log/mysql/slow.log | grep -A 10 "Query_time"
```

**慢查询分析脚本**：

```python
#!/usr/bin/env python3
import re
import sys
from collections import defaultdict
from datetime import datetime

class SlowQueryAnalyzer:
    def __init__(self, log_file):
        self.log_file = log_file
        self.queries = []
        self.stats = defaultdict(list)
    
    def parse_log(self):
        with open(self.log_file, 'r') as f:
            content = f.read()
        
        # 分割每个查询记录
        query_blocks = re.split(r'# Time: ', content)[1:]
        
        for block in query_blocks:
            query_info = self._parse_query_block(block)
            if query_info:
                self.queries.append(query_info)
                self._update_stats(query_info)
    
    def _parse_query_block(self, block):
        lines = block.strip().split('\n')
        if len(lines) < 3:
            return None
        
        # 解析时间
        time_match = re.match(r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)', lines[0])
        if not time_match:
            return None
        
        timestamp = time_match.group(1)
        
        # 解析查询统计信息
        user_host_line = None
        query_time_line = None
        sql_text = []
        
        for i, line in enumerate(lines[1:], 1):
            if line.startswith('# User@Host:'):
                user_host_line = line
            elif line.startswith('# Query_time:'):
                query_time_line = line
            elif not line.startswith('#'):
                sql_text.extend(lines[i:])
                break
        
        if not query_time_line:
            return None
        
        # 解析查询时间和其他统计信息
        query_time_match = re.search(r'Query_time: ([\d.]+)', query_time_line)
        lock_time_match = re.search(r'Lock_time: ([\d.]+)', query_time_line)
        rows_sent_match = re.search(r'Rows_sent: (\d+)', query_time_line)
        rows_examined_match = re.search(r'Rows_examined: (\d+)', query_time_line)
        
        return {
            'timestamp': timestamp,
            'query_time': float(query_time_match.group(1)) if query_time_match else 0,
            'lock_time': float(lock_time_match.group(1)) if lock_time_match else 0,
            'rows_sent': int(rows_sent_match.group(1)) if rows_sent_match else 0,
            'rows_examined': int(rows_examined_match.group(1)) if rows_examined_match else 0,
            'user_host': user_host_line,
            'sql_text': ' '.join(sql_text).strip()
        }
    
    def _update_stats(self, query_info):
        # 简化 SQL 语句用于分组
        normalized_sql = self._normalize_sql(query_info['sql_text'])
        
        self.stats[normalized_sql].append({
            'query_time': query_info['query_time'],
            'lock_time': query_info['lock_time'],
            'rows_sent': query_info['rows_sent'],
            'rows_examined': query_info['rows_examined']
        })
    
    def _normalize_sql(self, sql):
        # 移除具体的值，保留 SQL 结构
        sql = re.sub(r'\b\d+\b', 'N', sql)
        sql = re.sub(r"'[^']*'", "'S'", sql)
        sql = re.sub(r'"[^"]*"', '"S"', sql)
        sql = re.sub(r'\s+', ' ', sql)
        return sql.strip()[:200]  # 限制长度
    
    def generate_report(self):
        print("=== 慢查询分析报告 ===")
        print(f"总慢查询数量: {len(self.queries)}")
        print(f"不同查询模式数量: {len(self.stats)}")
        print()
        
        # 按总执行时间排序
        sorted_stats = sorted(
            self.stats.items(),
            key=lambda x: sum(q['query_time'] for q in x[1]),
            reverse=True
        )
        
        print("=== 最耗时的查询模式（前10个）===")
        for i, (sql, queries) in enumerate(sorted_stats[:10], 1):
            total_time = sum(q['query_time'] for q in queries)
            avg_time = total_time / len(queries)
            max_time = max(q['query_time'] for q in queries)
            count = len(queries)
            
            print(f"{i}. 执行次数: {count}, 总时间: {total_time:.2f}s, 平均时间: {avg_time:.2f}s, 最大时间: {max_time:.2f}s")
            print(f"   SQL: {sql[:100]}...")
            print()
        
        # 按执行次数排序
        sorted_by_count = sorted(
            self.stats.items(),
            key=lambda x: len(x[1]),
            reverse=True
        )
        
        print("=== 最频繁的查询模式（前10个）===")
        for i, (sql, queries) in enumerate(sorted_by_count[:10], 1):
            count = len(queries)
            avg_time = sum(q['query_time'] for q in queries) / count
            
            print(f"{i}. 执行次数: {count}, 平均时间: {avg_time:.2f}s")
            print(f"   SQL: {sql[:100]}...")
            print()

# 使用示例
if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 slow_query_analyzer.py <slow_query_log_file>")
        sys.exit(1)
    
    analyzer = SlowQueryAnalyzer(sys.argv[1])
    analyzer.parse_log()
    analyzer.generate_report()
```

#### 二进制日志

二进制日志记录了所有修改数据的语句，主要用于复制和数据恢复。

**二进制日志配置**：

```ini
# my.cnf 二进制日志配置
[mysqld]
# 启用二进制日志
log-bin=mysql-bin

# 二进制日志格式
binlog-format=ROW  # ROW, STATEMENT, MIXED

# 二进制日志同步策略
sync-binlog=1  # 每次事务提交都同步到磁盘

# 二进制日志过期时间
expire-logs-days=7

# 最大二进制日志文件大小
max-binlog-size=1G

# 二进制日志缓存大小
binlog-cache-size=1M

# 启用 GTID
gtid-mode=ON
enforce-gtid-consistency=ON
```

**二进制日志管理**：

```sql
-- 查看二进制日志文件
SHOW BINARY LOGS;

-- 查看当前二进制日志状态
SHOW MASTER STATUS;

-- 查看二进制日志事件
SHOW BINLOG EVENTS IN 'mysql-bin.000001';

-- 刷新二进制日志
FLUSH LOGS;

-- 清理二进制日志
PURGE BINARY LOGS TO 'mysql-bin.000010';
PURGE BINARY LOGS BEFORE '2023-12-01 00:00:00';

-- 重置二进制日志（谨慎使用）
RESET MASTER;
```

**二进制日志分析**：

```bash
# 使用 mysqlbinlog 查看二进制日志内容
mysqlbinlog mysql-bin.000001

# 查看指定时间范围的日志
mysqlbinlog --start-datetime="2023-12-01 10:00:00" \
            --stop-datetime="2023-12-01 12:00:00" \
            mysql-bin.000001

# 查看指定位置范围的日志
mysqlbinlog --start-position=1000 --stop-position=5000 mysql-bin.000001

# 基于行的日志解析（显示具体的数据变更）
mysqlbinlog --base64-output=DECODE-ROWS -v mysql-bin.000001

# 生成可执行的 SQL 语句
mysqlbinlog mysql-bin.000001 > binlog_statements.sql

# 分析特定数据库的变更
mysqlbinlog --database=mydb mysql-bin.000001
```

#### 通用查询日志

通用查询日志记录所有的 SQL 语句和连接信息，主要用于审计和调试。

**通用查询日志配置**：

```ini
# my.cnf 通用查询日志配置
[mysqld]
# 启用通用查询日志
general-log=1
general-log-file=/var/log/mysql/general.log

# 或者输出到表中
# log-output=TABLE
```

**动态启用/禁用**：

```sql
-- 动态启用通用查询日志
SET GLOBAL general_log = 'ON';
SET GLOBAL general_log_file = '/var/log/mysql/general.log';

-- 动态禁用通用查询日志
SET GLOBAL general_log = 'OFF';

-- 查看日志设置
SHOW VARIABLES LIKE 'general_log%';

-- 如果输出到表中，可以查询日志内容
SELECT * FROM mysql.general_log ORDER BY event_time DESC LIMIT 10;
```

### 日志轮转

#### 自动日志轮转

**使用 logrotate**：

```bash
# 创建 MySQL 日志轮转配置
sudo vim /etc/logrotate.d/mysql

# 配置内容
/var/log/mysql/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 640 mysql mysql
    sharedscripts
    postrotate
        if test -x /usr/bin/mysqladmin && \
           /usr/bin/mysqladmin ping &>/dev/null
        then
            /usr/bin/mysqladmin flush-logs
        fi
    endscript
}

# 测试配置
sudo logrotate -d /etc/logrotate.d/mysql

# 强制执行轮转
sudo logrotate -f /etc/logrotate.d/mysql
```

**MySQL 内置日志轮转**：

```sql
-- 刷新所有日志文件
FLUSH LOGS;

-- 刷新错误日志
FLUSH ERROR LOGS;

-- 刷新慢查询日志
FLUSH SLOW LOGS;

-- 刷新通用查询日志
FLUSH GENERAL LOGS;

-- 刷新二进制日志
FLUSH BINARY LOGS;
```

#### 日志清理脚本

```bash
#!/bin/bash
# MySQL 日志清理脚本

# 配置参数
LOG_DIR="/var/log/mysql"
RETENTION_DAYS=30
MYSQL_USER="root"
MYSQL_PASS="password"

# 清理错误日志
clean_error_logs() {
    echo "Cleaning error logs older than $RETENTION_DAYS days..."
    find $LOG_DIR -name "error.log.*" -mtime +$RETENTION_DAYS -delete
}

# 清理慢查询日志
clean_slow_logs() {
    echo "Cleaning slow query logs older than $RETENTION_DAYS days..."
    find $LOG_DIR -name "slow.log.*" -mtime +$RETENTION_DAYS -delete
}

# 清理通用查询日志
clean_general_logs() {
    echo "Cleaning general logs older than $RETENTION_DAYS days..."
    find $LOG_DIR -name "general.log.*" -mtime +$RETENTION_DAYS -delete
}

# 清理二进制日志
clean_binary_logs() {
    echo "Cleaning binary logs older than $RETENTION_DAYS days..."
    
    # 计算清理日期
    PURGE_DATE=$(date -d "$RETENTION_DAYS days ago" '+%Y-%m-%d %H:%M:%S')
    
    # 执行清理
    mysql -u $MYSQL_USER -p$MYSQL_PASS -e \
        "PURGE BINARY LOGS BEFORE '$PURGE_DATE';"
}

# 压缩旧日志文件
compress_old_logs() {
    echo "Compressing old log files..."
    find $LOG_DIR -name "*.log.*" -not -name "*.gz" -mtime +1 -exec gzip {} \;
}

# 主函数
main() {
    echo "Starting MySQL log cleanup - $(date)"
    
    clean_error_logs
    clean_slow_logs
    clean_general_logs
    clean_binary_logs
    compress_old_logs
    
    echo "MySQL log cleanup completed - $(date)"
}

# 执行清理
main
```

## 故障诊断

### 常见故障类型

#### 连接问题

**连接数耗尽**：

```sql
-- 查看当前连接数
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Max_used_connections';
SHOW VARIABLES LIKE 'max_connections';

-- 查看连接详情
SELECT 
    USER,
    HOST,
    DB,
    COMMAND,
    TIME,
    STATE,
    COUNT(*) as connection_count
FROM INFORMATION_SCHEMA.PROCESSLIST
GROUP BY USER, HOST, DB, COMMAND, STATE
ORDER BY connection_count DESC;

-- 查找长时间运行的连接
SELECT 
    ID,
    USER,
    HOST,
    DB,
    COMMAND,
    TIME,
    STATE,
    INFO
FROM INFORMATION_SCHEMA.PROCESSLIST
WHERE TIME > 300  -- 超过5分钟的连接
ORDER BY TIME DESC;
```

**解决方案**：

```bash
# 临时增加最大连接数
mysql -u root -p -e "SET GLOBAL max_connections = 500;"

# 杀死空闲连接
mysql -u root -p -e "
SELECT CONCAT('KILL ', ID, ';') as kill_command
FROM INFORMATION_SCHEMA.PROCESSLIST
WHERE COMMAND = 'Sleep' AND TIME > 3600;
" | grep KILL | mysql -u root -p

# 永久修改配置
echo "max_connections = 500" >> /etc/mysql/my.cnf
sudo systemctl restart mysql
```

**连接超时问题**：

```sql
-- 查看超时相关参数
SHOW VARIABLES LIKE '%timeout%';

-- 重要参数：
-- connect_timeout: 连接建立超时时间
-- interactive_timeout: 交互式连接超时时间
-- wait_timeout: 非交互式连接超时时间
-- net_read_timeout: 网络读取超时时间
-- net_write_timeout: 网络写入超时时间

-- 调整超时参数
SET GLOBAL wait_timeout = 28800;  -- 8小时
SET GLOBAL interactive_timeout = 28800;
SET GLOBAL net_read_timeout = 60;
SET GLOBAL net_write_timeout = 60;
```

#### 性能问题

**慢查询诊断**：

```sql
-- 查看当前正在执行的慢查询
SELECT 
    ID,
    USER,
    HOST,
    DB,
    COMMAND,
    TIME,
    STATE,
    LEFT(INFO, 100) as QUERY_TEXT
FROM INFORMATION_SCHEMA.PROCESSLIST
WHERE TIME > 10 AND COMMAND = 'Query'
ORDER BY TIME DESC;

-- 使用 Performance Schema 分析慢查询
SELECT 
    DIGEST_TEXT,
    COUNT_STAR as exec_count,
    AVG_TIMER_WAIT/1000000000 as avg_time_sec,
    MAX_TIMER_WAIT/1000000000 as max_time_sec,
    SUM_TIMER_WAIT/1000000000 as total_time_sec,
    SUM_ROWS_EXAMINED/COUNT_STAR as avg_rows_examined
FROM performance_schema.events_statements_summary_by_digest
WHERE AVG_TIMER_WAIT/1000000000 > 1
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;

-- 分析表的访问模式
SELECT 
    OBJECT_SCHEMA,
    OBJECT_NAME,
    COUNT_READ,
    COUNT_WRITE,
    COUNT_FETCH,
    SUM_TIMER_WAIT/1000000000 as total_time_sec
FROM performance_schema.table_io_waits_summary_by_table
WHERE OBJECT_SCHEMA NOT IN ('mysql', 'performance_schema', 'information_schema')
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;
```

**锁等待诊断**：

```sql
-- 查看当前锁等待情况
SELECT 
    r.trx_id waiting_trx_id,
    r.trx_mysql_thread_id waiting_thread,
    r.trx_query waiting_query,
    b.trx_id blocking_trx_id,
    b.trx_mysql_thread_id blocking_thread,
    b.trx_query blocking_query,
    w.requesting_lock_id,
    w.blocking_lock_id
FROM information_schema.innodb_lock_waits w
INNER JOIN information_schema.innodb_trx b ON b.trx_id = w.blocking_trx_id
INNER JOIN information_schema.innodb_trx r ON r.trx_id = w.requesting_trx_id;

-- 查看死锁信息
SHOW ENGINE INNODB STATUS\G

-- 查看锁等待超时设置
SHOW VARIABLES LIKE 'innodb_lock_wait_timeout';

-- 查看当前事务
SELECT 
    trx_id,
    trx_state,
    trx_started,
    trx_requested_lock_id,
    trx_wait_started,
    trx_weight,
    trx_mysql_thread_id,
    trx_query
FROM information_schema.innodb_trx
ORDER BY trx_started;
```

**内存问题诊断**：

```sql
-- 查看内存使用情况
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_%';

-- 计算缓冲池命中率
SELECT 
    ROUND(
        (1 - (Innodb_buffer_pool_reads / Innodb_buffer_pool_read_requests)) * 100, 2
    ) AS buffer_pool_hit_rate
FROM (
    SELECT 
        VARIABLE_VALUE AS Innodb_buffer_pool_reads
    FROM INFORMATION_SCHEMA.GLOBAL_STATUS 
    WHERE VARIABLE_NAME = 'Innodb_buffer_pool_reads'
) AS reads,
(
    SELECT 
        VARIABLE_VALUE AS Innodb_buffer_pool_read_requests
    FROM INFORMATION_SCHEMA.GLOBAL_STATUS 
    WHERE VARIABLE_NAME = 'Innodb_buffer_pool_read_requests'
) AS requests;

-- 查看内存分配详情（MySQL 5.7+）
SELECT 
    EVENT_NAME,
    CURRENT_NUMBER_OF_BYTES_USED/1024/1024 AS current_mb,
    HIGH_NUMBER_OF_BYTES_USED/1024/1024 AS high_mb
FROM performance_schema.memory_summary_global_by_event_name
WHERE CURRENT_NUMBER_OF_BYTES_USED > 0
ORDER BY CURRENT_NUMBER_OF_BYTES_USED DESC
LIMIT 20;

-- 查看临时表使用情况
SHOW GLOBAL STATUS LIKE 'Created_tmp_%';
```

#### 复制问题

**主从复制诊断**：

```sql
-- 在从库上检查复制状态
SHOW SLAVE STATUS\G

-- 重要字段说明：
-- Slave_IO_Running: IO线程是否运行
-- Slave_SQL_Running: SQL线程是否运行
-- Seconds_Behind_Master: 复制延迟秒数
-- Last_IO_Error: 最后的IO错误
-- Last_SQL_Error: 最后的SQL错误
-- Exec_Master_Log_Pos: 执行到的主库日志位置
-- Read_Master_Log_Pos: 读取到的主库日志位置

-- 在主库上检查复制状态
SHOW MASTER STATUS;
SHOW PROCESSLIST;

-- 查看从库连接信息
SELECT 
    USER,
    HOST,
    DB,
    COMMAND,
    TIME,
    STATE
FROM INFORMATION_SCHEMA.PROCESSLIST
WHERE COMMAND = 'Binlog Dump';
```

**复制延迟分析**：

```bash
# 监控复制延迟脚本
#!/bin/bash

MYSQL_USER="repl_monitor"
MYSQL_PASS="password"
SLAVE_HOST="slave_server"
MASTER_HOST="master_server"

# 检查复制延迟
check_replication_lag() {
    local lag=$(mysql -h $SLAVE_HOST -u $MYSQL_USER -p$MYSQL_PASS -e \
        "SHOW SLAVE STATUS\G" | grep "Seconds_Behind_Master:" | awk '{print $2}')
    
    if [ "$lag" = "NULL" ]; then
        echo "ERROR: Replication is broken"
        return 1
    elif [ $lag -gt 300 ]; then
        echo "WARNING: High replication lag: $lag seconds"
        return 2
    else
        echo "OK: Replication lag: $lag seconds"
        return 0
    fi
}

# 检查复制线程状态
check_replication_threads() {
    local io_running=$(mysql -h $SLAVE_HOST -u $MYSQL_USER -p$MYSQL_PASS -e \
        "SHOW SLAVE STATUS\G" | grep "Slave_IO_Running:" | awk '{print $2}')
    local sql_running=$(mysql -h $SLAVE_HOST -u $MYSQL_USER -p$MYSQL_PASS -e \
        "SHOW SLAVE STATUS\G" | grep "Slave_SQL_Running:" | awk '{print $2}')
    
    if [ "$io_running" != "Yes" ] || [ "$sql_running" != "Yes" ]; then
        echo "ERROR: Replication threads not running - IO: $io_running, SQL: $sql_running"
        return 1
    else
        echo "OK: Replication threads running"
        return 0
    fi
}

# 主函数
main() {
    echo "Checking replication status..."
    check_replication_threads
    check_replication_lag
}

main
```

### 诊断工具

#### 系统诊断工具

**pt-stalk 工具**：

```bash
# 安装 Percona Toolkit
sudo apt-get install percona-toolkit

# 使用 pt-stalk 监控 MySQL
pt-stalk --function=processlist --variable=Threads_running --threshold=25 \
         --match-command=Query --collect-oprofile --collect-strace \
         --collect-tcpdump --collect-gdb

# 当 Threads_running 超过 25 时自动收集诊断信息
```

**pt-summary 工具**：

```bash
# 生成系统摘要报告
pt-summary

# 生成 MySQL 摘要报告
pt-mysql-summary -- --user=root --password=password

# 生成磁盘摘要报告
pt-diskstats
```

**innotop 工具**：

```bash
# 安装 innotop
sudo apt-get install innotop

# 启动 innotop
innotop -u root -p password

# 常用快捷键：
# T - 查看 InnoDB 事务
# L - 查看锁等待
# Q - 查看查询列表
# I - 查看 InnoDB I/O 信息
# B - 查看缓冲池信息
```

#### 性能分析工具

**pt-query-digest**：

```bash
# 分析慢查询日志
pt-query-digest /var/log/mysql/slow.log > slow_query_report.txt

# 分析二进制日志
pt-query-digest --type=binlog mysql-bin.000001

# 分析通用查询日志
pt-query-digest --type=genlog /var/log/mysql/general.log

# 实时分析查询
pt-query-digest --processlist h=localhost,u=root,p=password

# 过滤特定时间段
pt-query-digest --since='2023-12-01 10:00:00' --until='2023-12-01 12:00:00' slow.log
```

**pt-index-usage**：

```bash
# 分析索引使用情况
pt-index-usage /var/log/mysql/slow.log

# 输出未使用的索引
pt-index-usage --host=localhost --user=root --password=password \
               --database=mydb --create-save-results-database
```

**pt-duplicate-key-checker**：

```bash
# 检查重复索引
pt-duplicate-key-checker --host=localhost --user=root --password=password

# 检查特定数据库
pt-duplicate-key-checker h=localhost,u=root,p=password,D=mydb
```

### 故障恢复

#### 数据恢复

**基于二进制日志的恢复**：

```bash
# 场景：需要恢复到特定时间点

# 1. 停止 MySQL 服务
sudo systemctl stop mysql

# 2. 恢复最近的完整备份
mysql -u root -p < /backup/full_backup_2023-12-01.sql

# 3. 应用二进制日志到故障时间点
mysqlbinlog --start-datetime="2023-12-01 00:00:00" \
            --stop-datetime="2023-12-01 14:30:00" \
            mysql-bin.000001 mysql-bin.000002 | mysql -u root -p

# 4. 启动 MySQL 服务
sudo systemctl start mysql
```

**表级恢复**：

```sql
-- 恢复单个表
-- 1. 创建临时数据库
CREATE DATABASE temp_recovery;

-- 2. 在临时数据库中恢复表
USE temp_recovery;
source /backup/table_backup.sql;

-- 3. 将数据插入到原表
INSERT INTO production.users SELECT * FROM temp_recovery.users;

-- 4. 清理临时数据库
DROP DATABASE temp_recovery;
```

#### 复制恢复

**重建从库复制**：

```sql
-- 在主库上
-- 1. 锁定表（可选，用于一致性）
FLUSH TABLES WITH READ LOCK;

-- 2. 记录当前位置
SHOW MASTER STATUS;

-- 3. 创建备份
-- mysqldump -u root -p --all-databases --master-data=2 > master_backup.sql

-- 4. 解锁表
UNLOCK TABLES;

-- 在从库上
-- 1. 停止复制
STOP SLAVE;

-- 2. 恢复备份
-- mysql -u root -p < master_backup.sql

-- 3. 配置复制
CHANGE MASTER TO
    MASTER_HOST='master_ip',
    MASTER_USER='repl_user',
    MASTER_PASSWORD='repl_password',
    MASTER_LOG_FILE='mysql-bin.000001',
    MASTER_LOG_POS=12345;

-- 4. 启动复制
START SLAVE;

-- 5. 检查复制状态
SHOW SLAVE STATUS\G
```

**跳过复制错误**：

```sql
-- 跳过单个错误
STOP SLAVE;
SET GLOBAL sql_slave_skip_counter = 1;
START SLAVE;

-- 跳过特定错误类型
STOP SLAVE;
SET GLOBAL slave_skip_errors = '1062,1053';
START SLAVE;

-- 基于 GTID 跳过事务
STOP SLAVE;
SET GTID_NEXT = 'uuid:transaction_id';
BEGIN; COMMIT;
SET GTID_NEXT = 'AUTOMATIC';
START SLAVE;
```

## 运维最佳实践

### 预防性维护

#### 定期维护任务

**数据库优化**：

```sql
-- 分析表统计信息
ANALYZE TABLE table_name;

-- 优化表结构
OPTIMIZE TABLE table_name;

-- 检查表完整性
CHECK TABLE table_name;

-- 修复表
REPAIR TABLE table_name;

-- 批量优化所有表
SELECT CONCAT('OPTIMIZE TABLE ', table_schema, '.', table_name, ';') as optimize_sql
FROM information_schema.tables
WHERE table_schema NOT IN ('mysql', 'performance_schema', 'information_schema', 'sys')
AND engine = 'InnoDB';
```

**索引维护**：

```sql
-- 查找未使用的索引
SELECT 
    OBJECT_SCHEMA,
    OBJECT_NAME,
    INDEX_NAME
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE INDEX_NAME IS NOT NULL
AND INDEX_NAME != 'PRIMARY'
AND COUNT_STAR = 0
AND OBJECT_SCHEMA NOT IN ('mysql', 'performance_schema', 'information_schema');

-- 查找重复索引
SELECT 
    a.TABLE_SCHEMA,
    a.TABLE_NAME,
    a.INDEX_NAME as index1,
    b.INDEX_NAME as index2,
    a.COLUMN_NAME
FROM information_schema.STATISTICS a
JOIN information_schema.STATISTICS b ON (
    a.TABLE_SCHEMA = b.TABLE_SCHEMA
    AND a.TABLE_NAME = b.TABLE_NAME
    AND a.COLUMN_NAME = b.COLUMN_NAME
    AND a.INDEX_NAME != b.INDEX_NAME
)
WHERE a.TABLE_SCHEMA NOT IN ('mysql', 'performance_schema', 'information_schema')
ORDER BY a.TABLE_SCHEMA, a.TABLE_NAME;
```

**统计信息更新**：

```bash
#!/bin/bash
# 自动更新统计信息脚本

MYSQL_USER="admin"
MYSQL_PASS="password"
DATABASE="production"

# 获取需要更新统计信息的表
TABLES=$(mysql -u $MYSQL_USER -p$MYSQL_PASS -D $DATABASE -e "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = '$DATABASE' 
AND engine = 'InnoDB'
AND (update_time < DATE_SUB(NOW(), INTERVAL 7 DAY) OR update_time IS NULL);
" | tail -n +2)

# 更新统计信息
for table in $TABLES; do
    echo "Analyzing table: $table"
    mysql -u $MYSQL_USER -p$MYSQL_PASS -D $DATABASE -e "ANALYZE TABLE $table;"
done

echo "Statistics update completed"
```

#### 容量规划

**存储空间监控**：

```sql
-- 查看数据库大小
SELECT 
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
GROUP BY table_schema
ORDER BY SUM(data_length + index_length) DESC;

-- 查看表大小增长趋势
SELECT 
    TABLE_SCHEMA,
    TABLE_NAME,
    ROUND(DATA_LENGTH/1024/1024, 2) AS data_mb,
    ROUND(INDEX_LENGTH/1024/1024, 2) AS index_mb,
    ROUND((DATA_LENGTH + INDEX_LENGTH)/1024/1024, 2) AS total_mb,
    TABLE_ROWS,
    CREATE_TIME,
    UPDATE_TIME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA NOT IN ('mysql', 'performance_schema', 'information_schema', 'sys')
ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC
LIMIT 20;

-- 预测存储需求
SELECT 
    TABLE_SCHEMA,
    TABLE_NAME,
    TABLE_ROWS,
    ROUND((DATA_LENGTH + INDEX_LENGTH)/TABLE_ROWS, 2) AS avg_row_size,
    ROUND((DATA_LENGTH + INDEX_LENGTH)/1024/1024, 2) AS current_mb,
    ROUND((DATA_LENGTH + INDEX_LENGTH)/1024/1024 * 1.5, 2) AS projected_mb_50_growth
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA NOT IN ('mysql', 'performance_schema', 'information_schema', 'sys')
AND TABLE_ROWS > 0
ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC;
```

**性能基线建立**：

```python
#!/usr/bin/env python3
# 性能基线收集脚本

import mysql.connector
import json
import time
from datetime import datetime, timedelta

class PerformanceBaseline:
    def __init__(self, config):
        self.config = config
        self.baseline_data = []
    
    def collect_metrics(self):
        connection = mysql.connector.connect(**self.config)
        cursor = connection.cursor(dictionary=True)
        
        # 收集关键性能指标
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'queries_per_second': self._get_qps(cursor),
            'connections': self._get_connection_stats(cursor),
            'innodb_stats': self._get_innodb_stats(cursor),
            'slow_queries': self._get_slow_query_stats(cursor),
            'table_stats': self._get_table_stats(cursor)
        }
        
        cursor.close()
        connection.close()
        
        return metrics
    
    def _get_qps(self, cursor):
        cursor.execute("SHOW GLOBAL STATUS LIKE 'Queries'")
        result = cursor.fetchone()
        return int(result['Value']) if result else 0
    
    def _get_connection_stats(self, cursor):
        cursor.execute("""
            SELECT 
                (SELECT VARIABLE_VALUE FROM INFORMATION_SCHEMA.GLOBAL_STATUS WHERE VARIABLE_NAME = 'Threads_connected') as current_connections,
                (SELECT VARIABLE_VALUE FROM INFORMATION_SCHEMA.GLOBAL_STATUS WHERE VARIABLE_NAME = 'Max_used_connections') as max_used_connections,
                (SELECT VARIABLE_VALUE FROM INFORMATION_SCHEMA.GLOBAL_VARIABLES WHERE VARIABLE_NAME = 'max_connections') as max_connections
        """)
        return cursor.fetchone()
    
    def _get_innodb_stats(self, cursor):
        cursor.execute("""
            SELECT 
                (SELECT VARIABLE_VALUE FROM INFORMATION_SCHEMA.GLOBAL_STATUS WHERE VARIABLE_NAME = 'Innodb_buffer_pool_read_requests') as read_requests,
                (SELECT VARIABLE_VALUE FROM INFORMATION_SCHEMA.GLOBAL_STATUS WHERE VARIABLE_NAME = 'Innodb_buffer_pool_reads') as physical_reads,
                (SELECT VARIABLE_VALUE FROM INFORMATION_SCHEMA.GLOBAL_STATUS WHERE VARIABLE_NAME = 'Innodb_buffer_pool_pages_total') as total_pages,
                (SELECT VARIABLE_VALUE FROM INFORMATION_SCHEMA.GLOBAL_STATUS WHERE VARIABLE_NAME = 'Innodb_buffer_pool_pages_free') as free_pages
        """)
        return cursor.fetchone()
    
    def _get_slow_query_stats(self, cursor):
        cursor.execute("SHOW GLOBAL STATUS LIKE 'Slow_queries'")
        result = cursor.fetchone()
        return int(result['Value']) if result else 0
    
    def _get_table_stats(self, cursor):
        cursor.execute("""
            SELECT 
                COUNT(*) as total_tables,
                SUM(TABLE_ROWS) as total_rows,
                ROUND(SUM(DATA_LENGTH + INDEX_LENGTH)/1024/1024, 2) as total_size_mb
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA NOT IN ('mysql', 'performance_schema', 'information_schema', 'sys')
        """)
        return cursor.fetchone()
    
    def collect_baseline(self, duration_hours=24, interval_minutes=15):
        """收集指定时间段的性能基线数据"""
        end_time = datetime.now() + timedelta(hours=duration_hours)
        
        while datetime.now() < end_time:
            try:
                metrics = self.collect_metrics()
                self.baseline_data.append(metrics)
                
                print(f"Collected metrics at {metrics['timestamp']}")
                
                # 保存到文件
                with open('performance_baseline.json', 'w') as f:
                    json.dump(self.baseline_data, f, indent=2)
                
                time.sleep(interval_minutes * 60)
                
            except Exception as e:
                print(f"Error collecting metrics: {e}")
                time.sleep(60)  # 出错时等待1分钟后重试
    
    def analyze_baseline(self):
        """分析基线数据"""
        if not self.baseline_data:
            print("No baseline data available")
            return
        
        # 计算平均值、最大值、最小值
        qps_values = [m['queries_per_second'] for m in self.baseline_data]
        conn_values = [int(m['connections']['current_connections']) for m in self.baseline_data]
        
        analysis = {
            'collection_period': {
                'start': self.baseline_data[0]['timestamp'],
                'end': self.baseline_data[-1]['timestamp'],
                'samples': len(self.baseline_data)
            },
            'qps_stats': {
                'avg': sum(qps_values) / len(qps_values),
                'max': max(qps_values),
                'min': min(qps_values)
            },
            'connection_stats': {
                'avg': sum(conn_values) / len(conn_values),
                'max': max(conn_values),
                'min': min(conn_values)
            }
        }
        
        print(json.dumps(analysis, indent=2))
        return analysis

# 使用示例
if __name__ == "__main__":
    config = {
        'host': 'localhost',
        'user': 'monitor_user',
        'password': 'monitor_password',
        'database': 'mysql'
    }
    
    baseline = PerformanceBaseline(config)
    
    # 收集24小时的基线数据，每15分钟采样一次
    baseline.collect_baseline(duration_hours=24, interval_minutes=15)
    
    # 分析基线数据
    baseline.analyze_baseline()
```

### 自动化运维

#### 自动化脚本

**健康检查脚本**：

```bash
#!/bin/bash
# MySQL 健康检查脚本

# 配置参数
CONFIG_FILE="/etc/mysql-monitor.conf"
LOG_FILE="/var/log/mysql-health-check.log"
ALERT_EMAIL="dba@company.com"
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

# 加载配置
source $CONFIG_FILE

# 日志函数
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

# 发送告警
send_alert() {
    local level="$1"
    local message="$2"
    
    # 发送邮件
    echo "$message" | mail -s "MySQL Alert [$level]" $ALERT_EMAIL
    
    # 发送 Slack 通知
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"MySQL Alert [$level]: $message\"}" \
        $SLACK_WEBHOOK
    
    log "ALERT [$level]: $message"
}

# 检查 MySQL 服务状态
check_service_status() {
    if ! systemctl is-active --quiet mysql; then
        send_alert "CRITICAL" "MySQL service is not running"
        return 1
    fi
    
    if ! mysqladmin -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASS ping >/dev/null 2>&1; then
        send_alert "CRITICAL" "MySQL is not responding to ping"
        return 1
    fi
    
    log "Service status: OK"
    return 0
}

# 检查连接数
check_connections() {
    local current=$(mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASS -e \
        "SHOW STATUS LIKE 'Threads_connected';" | awk 'NR==2 {print $2}')
    local max=$(mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASS -e \
        "SHOW VARIABLES LIKE 'max_connections';" | awk 'NR==2 {print $2}')
    
    local usage=$((current * 100 / max))
    
    if [ $usage -gt 90 ]; then
        send_alert "CRITICAL" "Connection usage is $usage% ($current/$max)"
    elif [ $usage -gt 80 ]; then
        send_alert "WARNING" "Connection usage is $usage% ($current/$max)"
    fi
    
    log "Connections: $current/$max ($usage%)"
}

# 检查磁盘空间
check_disk_space() {
    local datadir=$(mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASS -e \
        "SHOW VARIABLES LIKE 'datadir';" | awk 'NR==2 {print $2}')
    local usage=$(df $datadir | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ $usage -gt 90 ]; then
        send_alert "CRITICAL" "Disk usage is $usage% for MySQL data directory"
    elif [ $usage -gt 85 ]; then
        send_alert "WARNING" "Disk usage is $usage% for MySQL data directory"
    fi
    
    log "Disk usage: $usage%"
}

# 检查复制状态
check_replication() {
    local slave_status=$(mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASS -e \
        "SHOW SLAVE STATUS\G" 2>/dev/null)
    
    if [ -n "$slave_status" ]; then
        local io_running=$(echo "$slave_status" | grep "Slave_IO_Running:" | awk '{print $2}')
        local sql_running=$(echo "$slave_status" | grep "Slave_SQL_Running:" | awk '{print $2}')
        local lag=$(echo "$slave_status" | grep "Seconds_Behind_Master:" | awk '{print $2}')
        
        if [ "$io_running" != "Yes" ] || [ "$sql_running" != "Yes" ]; then
            send_alert "CRITICAL" "Replication error - IO: $io_running, SQL: $sql_running"
        elif [ "$lag" != "NULL" ] && [ $lag -gt 300 ]; then
            send_alert "WARNING" "High replication lag: $lag seconds"
        fi
        
        log "Replication: IO=$io_running, SQL=$sql_running, Lag=$lag"
    fi
}

# 检查慢查询
check_slow_queries() {
    local slow_queries=$(mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASS -e \
        "SHOW STATUS LIKE 'Slow_queries';" | awk 'NR==2 {print $2}')
    
    # 读取上次检查的慢查询数量
    local last_count=0
    if [ -f "/tmp/last_slow_queries" ]; then
        last_count=$(cat /tmp/last_slow_queries)
    fi
    
    local new_slow=$((slow_queries - last_count))
    
    if [ $new_slow -gt 50 ]; then
        send_alert "WARNING" "$new_slow new slow queries detected"
    fi
    
    echo $slow_queries > /tmp/last_slow_queries
    log "Slow queries: $slow_queries (new: $new_slow)"
}

# 检查缓冲池命中率
check_buffer_pool() {
    local hit_rate=$(mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASS -e "
        SELECT ROUND(
            (1 - (
                (SELECT VARIABLE_VALUE FROM INFORMATION_SCHEMA.GLOBAL_STATUS WHERE VARIABLE_NAME = 'Innodb_buffer_pool_reads') /
                (SELECT VARIABLE_VALUE FROM INFORMATION_SCHEMA.GLOBAL_STATUS WHERE VARIABLE_NAME = 'Innodb_buffer_pool_read_requests')
            )) * 100, 2
        ) AS hit_rate;
    " | awk 'NR==2 {print $1}')
    
    if (( $(echo "$hit_rate < 95" | bc -l) )); then
        send_alert "WARNING" "Low buffer pool hit rate: $hit_rate%"
    fi
    
    log "Buffer pool hit rate: $hit_rate%"
}

# 主检查函数
main() {
    log "Starting MySQL health check"
    
    check_service_status || exit 1
    check_connections
    check_disk_space
    check_replication
    check_slow_queries
    check_buffer_pool
    
    log "MySQL health check completed"
}

# 执行检查
main
```

**配置文件示例**：

```bash
# /etc/mysql-monitor.conf
MYSQL_HOST="localhost"
MYSQL_USER="monitor_user"
MYSQL_PASS="monitor_password"
MYSQL_PORT="3306"

# 告警阈值
CONNECTION_WARNING_THRESHOLD=80
CONNECTION_CRITICAL_THRESHOLD=90
DISK_WARNING_THRESHOLD=85
DISK_CRITICAL_THRESHOLD=90
REPLICATION_LAG_WARNING=300
SLOW_QUERY_WARNING=50
BUFFER_POOL_WARNING=95
```

#### 定时任务配置

**Crontab 配置**：

```bash
# 编辑 crontab
crontab -e

# 添加定时任务
# 每5分钟执行健康检查
*/5 * * * * /usr/local/bin/mysql-health-check.sh

# 每小时收集性能指标
0 * * * * /usr/local/bin/mysql-performance-collect.sh

# 每天凌晨2点执行备份
0 2 * * * /usr/local/bin/mysql-backup.sh

# 每周日凌晨3点执行表优化
0 3 * * 0 /usr/local/bin/mysql-optimize-tables.sh

# 每月1号清理旧日志
0 4 1 * * /usr/local/bin/mysql-log-cleanup.sh
```

**Systemd 定时器配置**：

```ini
# /etc/systemd/system/mysql-health-check.service
[Unit]
Description=MySQL Health Check
After=mysql.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/mysql-health-check.sh
User=mysql
Group=mysql

# /etc/systemd/system/mysql-health-check.timer
[Unit]
Description=Run MySQL Health Check every 5 minutes
Requires=mysql-health-check.service

[Timer]
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
# 启用定时器
sudo systemctl enable mysql-health-check.timer
sudo systemctl start mysql-health-check.timer

# 查看定时器状态
sudo systemctl status mysql-health-check.timer
sudo systemctl list-timers
```

### 总结

MySQL 监控与运维是确保数据库系统稳定运行的关键环节。通过建立完善的监控体系、实施有效的故障诊断流程、遵循运维最佳实践，可以显著提高数据库系统的可用性和性能。

**关键要点**：

1. **全面监控**：建立涵盖硬件、操作系统、数据库服务和应用层的多层次监控体系
2. **主动预警**：设置合理的告警阈值，实现故障的早期发现和预防
3. **快速诊断**：掌握常用的诊断工具和方法，能够快速定位和解决问题
4. **自动化运维**：通过脚本和工具实现运维任务的自动化，提高效率和可靠性
5. **持续优化**：基于监控数据进行性能分析和优化，不断提升系统性能

通过系统性的监控运维实践，可以构建一个高可用、高性能的 MySQL 数据库环境，为业务发展提供可靠的数据支撑。