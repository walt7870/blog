---
title: PostgreSQL 详解
author: Walt
date: 2024-12-19 10:00:00
LastEditTime: 2024-12-19 10:00:00
LastEditors: Walt
---

# PostgreSQL 详解

PostgreSQL 是一个功能强大的开源对象关系数据库系统，以其可靠性、功能丰富性和性能而闻名。它被称为"世界上最先进的开源关系数据库"。

## 概述

### 历史背景

- **1986年**：加州大学伯克利分校开始 POSTGRES 项目
- **1996年**：更名为 PostgreSQL，支持 SQL
- **现在**：由全球开发者社区维护，持续发展

### 核心特性

1. **ACID 兼容**：完全支持事务的原子性、一致性、隔离性和持久性
2. **SQL 标准兼容**：高度兼容 SQL 标准
3. **扩展性强**：支持自定义数据类型、函数、操作符
4. **多版本并发控制 (MVCC)**：高并发性能
5. **丰富的数据类型**：支持 JSON、数组、几何类型等

## 安装与配置

### 安装方式

#### 1. 官方安装包
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib
```

#### 2. Docker 安装
```bash
# 拉取镜像
docker pull postgres:15

# 运行容器
docker run --name postgres-db \
  -e POSTGRES_PASSWORD=mypassword \
  -e POSTGRES_DB=mydb \
  -p 5432:5432 \
  -d postgres:15
```

### 基本配置

#### postgresql.conf 主要参数
```ini
# 连接设置
listen_addresses = '*'
port = 5432
max_connections = 100

# 内存设置
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# WAL 设置
wal_level = replica
max_wal_size = 1GB
min_wal_size = 80MB

# 日志设置
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'all'
```

#### pg_hba.conf 认证配置
```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             postgres                                peer
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

## 数据类型

### 基本数据类型

```sql
-- 数值类型
CREATE TABLE numeric_types (
    id SERIAL PRIMARY KEY,
    small_int SMALLINT,
    integer_val INTEGER,
    big_int BIGINT,
    decimal_val DECIMAL(10,2),
    real_val REAL,
    double_val DOUBLE PRECISION
);

-- 字符类型
CREATE TABLE text_types (
    id SERIAL PRIMARY KEY,
    char_val CHAR(10),
    varchar_val VARCHAR(255),
    text_val TEXT
);

-- 日期时间类型
CREATE TABLE datetime_types (
    id SERIAL PRIMARY KEY,
    date_val DATE,
    time_val TIME,
    timestamp_val TIMESTAMP,
    timestamptz_val TIMESTAMPTZ,
    interval_val INTERVAL
);
```

### 高级数据类型

#### JSON 类型
```sql
-- JSON 和 JSONB
CREATE TABLE json_example (
    id SERIAL PRIMARY KEY,
    data JSON,
    data_binary JSONB
);

-- 插入 JSON 数据
INSERT INTO json_example (data, data_binary) VALUES 
('{
  "name": "John",
  "age": 30,
  "skills": ["PostgreSQL", "Python"]
}', 
'{
  "name": "John",
  "age": 30,
  "skills": ["PostgreSQL", "Python"]
}');

-- 查询 JSON 数据
SELECT data->>'name' as name,
       data_binary->'skills' as skills
FROM json_example;
```

#### 数组类型
```sql
-- 数组类型
CREATE TABLE array_example (
    id SERIAL PRIMARY KEY,
    tags TEXT[],
    scores INTEGER[]
);

-- 插入数组数据
INSERT INTO array_example (tags, scores) VALUES 
(ARRAY['postgresql', 'database', 'sql'], ARRAY[95, 87, 92]);

-- 查询数组数据
SELECT tags[1] as first_tag,
       array_length(scores, 1) as score_count
FROM array_example;
```

#### 几何类型
```sql
-- 几何类型
CREATE TABLE geometry_example (
    id SERIAL PRIMARY KEY,
    location POINT,
    area POLYGON,
    path_data PATH
);

-- 插入几何数据
INSERT INTO geometry_example (location, area) VALUES 
(POINT(121.5, 31.2), POLYGON('((0,0),(0,1),(1,1),(1,0))'));

-- 几何查询
SELECT location,
       location <-> POINT(121.0, 31.0) as distance
FROM geometry_example;
```

## 高级功能

### 1. 窗口函数

```sql
-- 创建示例表
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER,
    department VARCHAR(50),
    sale_amount DECIMAL(10,2),
    sale_date DATE
);

-- 插入示例数据
INSERT INTO sales (employee_id, department, sale_amount, sale_date) VALUES
(1, 'Sales', 1000.00, '2024-01-01'),
(2, 'Sales', 1500.00, '2024-01-02'),
(3, 'Marketing', 800.00, '2024-01-01'),
(4, 'Marketing', 1200.00, '2024-01-02');

-- 窗口函数示例
SELECT 
    employee_id,
    department,
    sale_amount,
    -- 排名函数
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY sale_amount DESC) as row_num,
    RANK() OVER (PARTITION BY department ORDER BY sale_amount DESC) as rank,
    DENSE_RANK() OVER (PARTITION BY department ORDER BY sale_amount DESC) as dense_rank,
    
    -- 聚合函数
    SUM(sale_amount) OVER (PARTITION BY department) as dept_total,
    AVG(sale_amount) OVER (PARTITION BY department) as dept_avg,
    
    -- 偏移函数
    LAG(sale_amount, 1) OVER (PARTITION BY department ORDER BY sale_date) as prev_sale,
    LEAD(sale_amount, 1) OVER (PARTITION BY department ORDER BY sale_date) as next_sale
FROM sales;
```

### 2. 公用表表达式 (CTE)

```sql
-- 递归 CTE 示例：组织架构
CREATE TABLE employees (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100),
    manager_id INTEGER REFERENCES employees(id)
);

INSERT INTO employees VALUES
(1, 'CEO', NULL),
(2, 'VP Sales', 1),
(3, 'VP Engineering', 1),
(4, 'Sales Manager', 2),
(5, 'Engineer', 3);

-- 递归查询组织层级
WITH RECURSIVE org_chart AS (
    -- 基础查询：顶级管理者
    SELECT id, name, manager_id, 1 as level, name as path
    FROM employees
    WHERE manager_id IS NULL
    
    UNION ALL
    
    -- 递归查询：下级员工
    SELECT e.id, e.name, e.manager_id, oc.level + 1, 
           oc.path || ' -> ' || e.name
    FROM employees e
    JOIN org_chart oc ON e.manager_id = oc.id
)
SELECT level, name, path
FROM org_chart
ORDER BY level, name;
```

### 3. 全文搜索

```sql
-- 创建全文搜索示例
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    content TEXT,
    search_vector TSVECTOR
);

-- 插入示例数据
INSERT INTO documents (title, content) VALUES
('PostgreSQL Tutorial', 'Learn PostgreSQL database management system'),
('Advanced SQL', 'Master advanced SQL techniques and optimization'),
('Database Design', 'Best practices for database schema design');

-- 更新搜索向量
UPDATE documents SET search_vector = 
    to_tsvector('english', title || ' ' || content);

-- 创建 GIN 索引
CREATE INDEX idx_search_vector ON documents USING GIN(search_vector);

-- 全文搜索查询
SELECT title, content,
       ts_rank(search_vector, query) as rank
FROM documents, to_tsquery('english', 'PostgreSQL & database') as query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

### 4. 分区表

```sql
-- 创建分区表
CREATE TABLE sales_data (
    id SERIAL,
    sale_date DATE NOT NULL,
    amount DECIMAL(10,2),
    region VARCHAR(50)
) PARTITION BY RANGE (sale_date);

-- 创建分区
CREATE TABLE sales_2024_q1 PARTITION OF sales_data
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE sales_2024_q2 PARTITION OF sales_data
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

CREATE TABLE sales_2024_q3 PARTITION OF sales_data
    FOR VALUES FROM ('2024-07-01') TO ('2024-10-01');

CREATE TABLE sales_2024_q4 PARTITION OF sales_data
    FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');

-- 插入数据（自动路由到对应分区）
INSERT INTO sales_data (sale_date, amount, region) VALUES
('2024-02-15', 1000.00, 'North'),
('2024-05-20', 1500.00, 'South'),
('2024-08-10', 1200.00, 'East'),
('2024-11-05', 1800.00, 'West');
```

## 性能优化

### 1. 索引优化

```sql
-- B-tree 索引（默认）
CREATE INDEX idx_employee_name ON employees(name);

-- 复合索引
CREATE INDEX idx_sales_date_amount ON sales(sale_date, sale_amount);

-- 部分索引
CREATE INDEX idx_active_users ON users(email) WHERE active = true;

-- 表达式索引
CREATE INDEX idx_lower_email ON users(lower(email));

-- GIN 索引（用于数组、JSON、全文搜索）
CREATE INDEX idx_tags_gin ON posts USING GIN(tags);

-- GiST 索引（用于几何数据、范围类型）
CREATE INDEX idx_location_gist ON locations USING GIST(coordinates);
```

### 2. 查询优化

```sql
-- 使用 EXPLAIN 分析查询计划
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM sales 
WHERE sale_date >= '2024-01-01' 
AND sale_amount > 1000;

-- 使用 EXPLAIN (FORMAT JSON) 获取详细信息
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT s.*, e.name
FROM sales s
JOIN employees e ON s.employee_id = e.id
WHERE s.sale_date >= '2024-01-01';
```

### 3. 统计信息更新

```sql
-- 更新表统计信息
ANALYZE sales;

-- 更新所有表统计信息
ANALYZE;

-- 查看统计信息
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'sales';
```

## 备份与恢复

### 1. 逻辑备份

```bash
# 备份单个数据库
pg_dump -h localhost -U postgres -d mydb > mydb_backup.sql

# 备份所有数据库
pg_dumpall -h localhost -U postgres > all_databases.sql

# 自定义格式备份（推荐）
pg_dump -h localhost -U postgres -d mydb -Fc > mydb_backup.dump

# 并行备份（提高速度）
pg_dump -h localhost -U postgres -d mydb -Fd -j 4 -f mydb_backup_dir
```

### 2. 恢复数据

```bash
# 从 SQL 文件恢复
psql -h localhost -U postgres -d mydb < mydb_backup.sql

# 从自定义格式恢复
pg_restore -h localhost -U postgres -d mydb mydb_backup.dump

# 并行恢复
pg_restore -h localhost -U postgres -d mydb -j 4 mydb_backup_dir
```

### 3. 物理备份

```bash
# 基础备份
pg_basebackup -h localhost -U postgres -D /backup/base -Ft -z -P

# 连续归档备份配置
# 在 postgresql.conf 中设置：
# wal_level = replica
# archive_mode = on
# archive_command = 'cp %p /backup/wal/%f'
```

## 高可用性

### 1. 流复制配置

#### 主服务器配置
```ini
# postgresql.conf
wal_level = replica
max_wal_senders = 3
wal_keep_size = 64MB

# pg_hba.conf
host replication replicator 192.168.1.0/24 md5
```

#### 从服务器配置
```bash
# 创建基础备份
pg_basebackup -h master_host -D /var/lib/postgresql/data -U replicator -P -W

# standby.signal 文件
touch /var/lib/postgresql/data/standby.signal
```

```ini
# postgresql.conf（从服务器）
primary_conninfo = 'host=master_host port=5432 user=replicator'
hot_standby = on
```

### 2. 故障转移

```bash
# 提升从服务器为主服务器
pg_promote -D /var/lib/postgresql/data

# 或者删除 standby.signal 文件
rm /var/lib/postgresql/data/standby.signal
```

## 监控与维护

### 1. 系统视图监控

```sql
-- 查看当前连接
SELECT pid, usename, application_name, client_addr, state, query
FROM pg_stat_activity
WHERE state = 'active';

-- 查看数据库统计
SELECT datname, numbackends, xact_commit, xact_rollback, 
       blks_read, blks_hit, tup_returned, tup_fetched
FROM pg_stat_database;

-- 查看表统计
SELECT schemaname, tablename, seq_scan, seq_tup_read, 
       idx_scan, idx_tup_fetch, n_tup_ins, n_tup_upd, n_tup_del
FROM pg_stat_user_tables;

-- 查看索引使用情况
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### 2. 锁监控

```sql
-- 查看当前锁
SELECT l.pid, l.mode, l.locktype, l.relation::regclass, 
       a.usename, a.query, a.state
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE l.granted = false;

-- 查看阻塞关系
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.GRANTED;
```

### 3. 维护任务

```sql
-- 手动 VACUUM
VACUUM VERBOSE sales;

-- VACUUM FULL（重建表）
VACUUM FULL sales;

-- ANALYZE 更新统计信息
ANALYZE sales;

-- REINDEX 重建索引
REINDEX TABLE sales;
REINDEX INDEX idx_sales_date;

-- 查看表膨胀情况
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
       pg_stat_get_live_tuples(c.oid) as live_tuples,
       pg_stat_get_dead_tuples(c.oid) as dead_tuples
FROM pg_stat_user_tables
JOIN pg_class c ON c.relname = tablename
WHERE pg_stat_get_dead_tuples(c.oid) > 0
ORDER BY pg_stat_get_dead_tuples(c.oid) DESC;
```

## 扩展功能

### 1. 常用扩展

```sql
-- 安装扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "hstore";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- 使用 UUID
SELECT uuid_generate_v4();

-- 使用加密函数
SELECT crypt('password', gen_salt('bf'));

-- 使用 hstore
CREATE TABLE user_attributes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    attributes HSTORE
);

INSERT INTO user_attributes (user_id, attributes) VALUES
(1, 'name=>"John", age=>"30", city=>"New York"');

SELECT attributes->'name' as name,
       attributes->'age' as age
FROM user_attributes;
```

### 2. 自定义函数

```sql
-- PL/pgSQL 函数
CREATE OR REPLACE FUNCTION calculate_age(birth_date DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(YEAR FROM AGE(birth_date));
END;
$$ LANGUAGE plpgsql;

-- 使用函数
SELECT name, birth_date, calculate_age(birth_date) as age
FROM users;

-- 触发器函数
CREATE OR REPLACE FUNCTION update_modified_time()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trigger_update_modified_time
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_time();
```

## 最佳实践

### 1. 数据库设计

- **规范化**：适度规范化，避免过度规范化
- **索引策略**：为查询条件和连接字段创建索引
- **数据类型**：选择合适的数据类型，避免浪费空间
- **约束**：使用适当的约束保证数据完整性

### 2. 性能优化

- **连接池**：使用连接池减少连接开销
- **批量操作**：使用批量插入/更新提高效率
- **分区**：对大表使用分区提高查询性能
- **监控**：定期监控慢查询和系统资源

### 3. 安全性

- **权限控制**：最小权限原则
- **SSL 连接**：生产环境使用 SSL
- **密码策略**：强密码和定期更换
- **审计日志**：启用审计日志记录

### 4. 运维管理

- **定期备份**：制定备份策略和恢复测试
- **监控告警**：设置关键指标监控
- **版本升级**：及时升级到稳定版本
- **文档维护**：维护数据库文档和变更记录

## 总结

PostgreSQL 是一个功能强大、可靠性高的开源数据库系统，适合各种规模的应用。其丰富的功能特性、良好的扩展性和活跃的社区支持，使其成为现代应用开发的优秀选择。

### 优势

- 功能丰富，标准兼容性好
- 性能优秀，支持高并发
- 扩展性强，支持自定义类型和函数
- 开源免费，社区活跃
- 可靠性高，数据安全性好

### 适用场景

- 企业级应用系统
- 数据分析和报表系统
- 地理信息系统 (GIS)
- 需要复杂查询的应用
- 对数据一致性要求高的系统

通过合理的设计、配置和优化，PostgreSQL 能够为各种应用提供稳定、高效的数据存储和处理能力。