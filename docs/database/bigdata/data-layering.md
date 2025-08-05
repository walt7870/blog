# 大数据分层架构详解

## 概述

数据分层是大数据架构设计中的核心概念，通过将数据按照不同的处理阶段和业务需求进行分层管理，实现数据的有序流转、质量控制和价值挖掘。合理的数据分层架构能够提高数据处理效率、保证数据质量、降低维护成本。

## 数据分层架构模型

### 经典三层架构

```
┌─────────────────────────────────────────────────────────┐
│                  经典三层架构                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  应用层 (Application Layer)                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │  BI报表   数据分析   机器学习   实时监控         │   │
│  └─────────────────────────────────────────────────┘   │
│                           │                             │
│                           ▼                             │
│  数据仓库层 (Data Warehouse Layer)                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │  维度表   事实表   聚合表   主题域               │   │
│  └─────────────────────────────────────────────────┘   │
│                           │                             │
│                           ▼                             │
│  数据集成层 (Data Integration Layer)                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ETL处理   数据清洗   数据转换   数据加载        │   │
│  └─────────────────────────────────────────────────┘   │
│                           │                             │
│                           ▼                             │
│  数据源层 (Data Source Layer)                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  业务系统   日志文件   外部数据   实时流数据      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 现代五层架构

```
┌─────────────────────────────────────────────────────────┐
│                  现代五层架构                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  应用服务层 (Application Service Layer)                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  API服务   报表系统   分析工具   ML平台          │   │
│  └─────────────────────────────────────────────────┘   │
│                           │                             │
│                           ▼                             │
│  数据集市层 (Data Mart Layer) - DM                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │  主题集市   部门集市   个性化视图   轻度聚合      │   │
│  └─────────────────────────────────────────────────┘   │
│                           │                             │
│                           ▼                             │
│  数据仓库层 (Data Warehouse Layer) - DW                │
│  ┌─────────────────────────────────────────────────┐   │
│  │  维度建模   事实表   维度表   历史数据           │   │
│  └─────────────────────────────────────────────────┘   │
│                           │                             │
│                           ▼                             │
│  数据中台层 (Data Middle Layer) - DWD/DWS              │
│  ┌─────────────────────────────────────────────────┐   │
│  │  明细数据   汇总数据   公共维度   业务主题        │   │
│  └─────────────────────────────────────────────────┘   │
│                           │                             │
│                           ▼                             │
│  操作数据层 (Operational Data Layer) - ODS             │
│  ┌─────────────────────────────────────────────────┐   │
│  │  原始数据   增量数据   全量数据   数据快照        │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 详细分层说明

### 1. ODS 层 (Operational Data Store)

**定义：** 操作数据存储层，存储原始数据的副本

**特点：**
- 数据结构与源系统保持一致
- 最小化的数据转换
- 保留数据的原始状态
- 支持增量和全量数据

**数据处理：**
```sql
-- ODS层数据加载示例
-- 全量加载
INSERT OVERWRITE TABLE ods_user_info
SELECT 
    user_id,
    user_name,
    email,
    phone,
    create_time,
    update_time,
    '${bizdate}' as etl_date
FROM source_user_info;

-- 增量加载
INSERT INTO TABLE ods_user_info
SELECT 
    user_id,
    user_name,
    email,
    phone,
    create_time,
    update_time,
    '${bizdate}' as etl_date
FROM source_user_info
WHERE update_time >= '${start_time}' 
  AND update_time < '${end_time}';
```

**表设计规范：**
```sql
-- ODS表结构示例
CREATE TABLE ods_order_info (
    order_id STRING COMMENT '订单ID',
    user_id STRING COMMENT '用户ID',
    product_id STRING COMMENT '商品ID',
    order_amount DECIMAL(10,2) COMMENT '订单金额',
    order_status STRING COMMENT '订单状态',
    create_time TIMESTAMP COMMENT '创建时间',
    update_time TIMESTAMP COMMENT '更新时间',
    etl_date STRING COMMENT 'ETL日期'
) COMMENT 'ODS层-订单信息表'
PARTITIONED BY (dt STRING COMMENT '分区日期')
STORED AS PARQUET;
```

### 2. DWD 层 (Data Warehouse Detail)

**定义：** 数据仓库明细层，清洗和标准化后的明细数据

**特点：**
- 数据清洗和质量控制
- 统一数据标准和格式
- 建立业务主键
- 保留明细粒度

**数据处理：**
```sql
-- DWD层数据处理示例
INSERT OVERWRITE TABLE dwd_order_info
SELECT 
    order_id,
    user_id,
    product_id,
    CASE 
        WHEN order_amount IS NULL OR order_amount < 0 THEN 0
        ELSE order_amount 
    END as order_amount,
    CASE 
        WHEN order_status IN ('created', 'pending') THEN '待支付'
        WHEN order_status = 'paid' THEN '已支付'
        WHEN order_status = 'shipped' THEN '已发货'
        WHEN order_status = 'delivered' THEN '已送达'
        WHEN order_status = 'cancelled' THEN '已取消'
        ELSE '未知状态'
    END as order_status_desc,
    create_time,
    update_time,
    '${bizdate}' as etl_date
FROM ods_order_info
WHERE dt = '${bizdate}'
  AND order_id IS NOT NULL
  AND user_id IS NOT NULL;
```

**数据质量检查：**
```sql
-- 数据质量检查脚本
-- 检查空值
SELECT 
    COUNT(*) as total_count,
    COUNT(CASE WHEN order_id IS NULL THEN 1 END) as null_order_id,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_user_id,
    COUNT(CASE WHEN order_amount < 0 THEN 1 END) as negative_amount
FROM dwd_order_info
WHERE dt = '${bizdate}';

-- 检查重复数据
SELECT 
    order_id,
    COUNT(*) as cnt
FROM dwd_order_info
WHERE dt = '${bizdate}'
GROUP BY order_id
HAVING COUNT(*) > 1;
```

### 3. DWS 层 (Data Warehouse Summary)

**定义：** 数据仓库汇总层，基于业务需求的轻度汇总数据

**特点：**
- 按业务主题汇总
- 多维度预聚合
- 提高查询性能
- 支持不同时间粒度

**汇总维度设计：**
```sql
-- 用户维度汇总
INSERT OVERWRITE TABLE dws_user_order_1d
SELECT 
    user_id,
    COUNT(DISTINCT order_id) as order_count,
    SUM(order_amount) as total_amount,
    AVG(order_amount) as avg_amount,
    MAX(order_amount) as max_amount,
    MIN(order_amount) as min_amount,
    COUNT(DISTINCT product_id) as product_count,
    '${bizdate}' as stat_date
FROM dwd_order_info
WHERE dt = '${bizdate}'
  AND order_status_desc = '已支付'
GROUP BY user_id;

-- 商品维度汇总
INSERT OVERWRITE TABLE dws_product_order_1d
SELECT 
    product_id,
    COUNT(DISTINCT order_id) as order_count,
    COUNT(DISTINCT user_id) as user_count,
    SUM(order_amount) as total_amount,
    AVG(order_amount) as avg_amount,
    '${bizdate}' as stat_date
FROM dwd_order_info
WHERE dt = '${bizdate}'
  AND order_status_desc = '已支付'
GROUP BY product_id;
```

**时间维度汇总：**
```sql
-- 周汇总
INSERT OVERWRITE TABLE dws_user_order_1w
SELECT 
    user_id,
    SUM(order_count) as order_count,
    SUM(total_amount) as total_amount,
    AVG(avg_amount) as avg_amount,
    MAX(max_amount) as max_amount,
    MIN(min_amount) as min_amount,
    '${week_start}' as week_start,
    '${week_end}' as week_end
FROM dws_user_order_1d
WHERE stat_date >= '${week_start}'
  AND stat_date <= '${week_end}'
GROUP BY user_id;
```

### 4. DM 层 (Data Mart)

**定义：** 数据集市层，面向特定业务主题的数据集合

**特点：**
- 业务导向的数据组织
- 高度聚合的数据
- 直接支持业务分析
- 针对性的性能优化

**业务主题设计：**
```sql
-- 用户画像主题
CREATE TABLE dm_user_profile AS
SELECT 
    u.user_id,
    u.user_name,
    u.age_group,
    u.gender,
    u.city,
    o.total_orders,
    o.total_amount,
    o.avg_order_amount,
    o.first_order_date,
    o.last_order_date,
    DATEDIFF(CURRENT_DATE, o.last_order_date) as days_since_last_order,
    CASE 
        WHEN o.total_amount >= 10000 THEN '高价值用户'
        WHEN o.total_amount >= 5000 THEN '中价值用户'
        WHEN o.total_amount >= 1000 THEN '普通用户'
        ELSE '低价值用户'
    END as user_value_level
FROM dim_user u
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(order_id) as total_orders,
        SUM(order_amount) as total_amount,
        AVG(order_amount) as avg_order_amount,
        MIN(create_time) as first_order_date,
        MAX(create_time) as last_order_date
    FROM dwd_order_info
    WHERE order_status_desc = '已支付'
    GROUP BY user_id
) o ON u.user_id = o.user_id;

-- 商品销售分析主题
CREATE TABLE dm_product_sales_analysis AS
SELECT 
    p.product_id,
    p.product_name,
    p.category_name,
    p.brand_name,
    s.sales_amount_30d,
    s.sales_count_30d,
    s.user_count_30d,
    s.avg_price,
    RANK() OVER (PARTITION BY p.category_name ORDER BY s.sales_amount_30d DESC) as category_rank,
    RANK() OVER (ORDER BY s.sales_amount_30d DESC) as overall_rank
FROM dim_product p
LEFT JOIN (
    SELECT 
        product_id,
        SUM(order_amount) as sales_amount_30d,
        COUNT(order_id) as sales_count_30d,
        COUNT(DISTINCT user_id) as user_count_30d,
        AVG(order_amount) as avg_price
    FROM dwd_order_info
    WHERE dt >= DATE_SUB(CURRENT_DATE, 30)
      AND order_status_desc = '已支付'
    GROUP BY product_id
) s ON p.product_id = s.product_id;
```

### 5. APP 层 (Application)

**定义：** 应用层，直接支撑业务应用的数据

**特点：**
- 面向具体应用场景
- 高度定制化
- 性能优化到极致
- 直接对接前端系统

**应用场景示例：**
```sql
-- 实时大屏数据
CREATE TABLE app_realtime_dashboard AS
SELECT 
    CURRENT_TIMESTAMP as update_time,
    SUM(CASE WHEN DATE(create_time) = CURRENT_DATE THEN order_amount ELSE 0 END) as today_sales,
    SUM(CASE WHEN DATE(create_time) = DATE_SUB(CURRENT_DATE, 1) THEN order_amount ELSE 0 END) as yesterday_sales,
    COUNT(CASE WHEN DATE(create_time) = CURRENT_DATE THEN order_id END) as today_orders,
    COUNT(CASE WHEN DATE(create_time) = DATE_SUB(CURRENT_DATE, 1) THEN order_id END) as yesterday_orders,
    COUNT(DISTINCT CASE WHEN DATE(create_time) = CURRENT_DATE THEN user_id END) as today_users,
    COUNT(DISTINCT CASE WHEN DATE(create_time) = DATE_SUB(CURRENT_DATE, 1) THEN user_id END) as yesterday_users
FROM dwd_order_info
WHERE dt >= DATE_SUB(CURRENT_DATE, 1)
  AND order_status_desc = '已支付';

-- 推荐系统特征表
CREATE TABLE app_recommendation_features AS
SELECT 
    user_id,
    COLLECT_LIST(product_id) as purchased_products,
    COLLECT_LIST(category_id) as preferred_categories,
    AVG(order_amount) as avg_spending,
    COUNT(DISTINCT DATE(create_time)) as active_days,
    MAX(create_time) as last_purchase_time
FROM dwd_order_info
WHERE dt >= DATE_SUB(CURRENT_DATE, 90)
  AND order_status_desc = '已支付'
GROUP BY user_id;
```

## 维度建模

### 星型模型

```
┌─────────────────────────────────────────────────────────┐
│                    星型模型                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              维度表 (Dimension Tables)                  │
│                                                         │
│  ┌─────────────┐                    ┌─────────────┐   │
│  │  dim_user   │                    │ dim_product │   │
│  │             │                    │             │   │
│  │ user_id(PK) │                    │product_id(PK)│   │
│  │ user_name   │                    │product_name │   │
│  │ age         │                    │ category    │   │
│  │ gender      │                    │ brand       │   │
│  │ city        │                    │ price       │   │
│  └─────────────┘                    └─────────────┘   │
│         │                                    │         │
│         │              ┌─────────────┐       │         │
│         │              │             │       │         │
│         └──────────────│ fact_order  │───────┘         │
│                        │             │                 │
│                        │ order_id(PK)│                 │
│                        │ user_id(FK) │                 │
│                        │product_id(FK)│                │
│                        │ date_id(FK) │                 │
│                        │order_amount │                 │
│                        │ quantity    │                 │
│                        │create_time  │                 │
│                        └─────────────┘                 │
│                               │                         │
│                               │                         │
│                        ┌─────────────┐                 │
│                        │  dim_date   │                 │
│                        │             │                 │
│                        │ date_id(PK) │                 │
│                        │ date_value  │                 │
│                        │ year        │                 │
│                        │ month       │                 │
│                        │ day         │                 │
│                        │ quarter     │                 │
│                        │ week        │                 │
│                        └─────────────┘                 │
└─────────────────────────────────────────────────────────┘
```

### 雪花模型

```
┌─────────────────────────────────────────────────────────┐
│                    雪花模型                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │ dim_brand   │    │ dim_category│    │  dim_city   │ │
│  │             │    │             │    │             │ │
│  │ brand_id(PK)│    │category_id  │    │ city_id(PK) │ │
│  │ brand_name  │    │category_name│    │ city_name   │ │
│  └─────────────┘    └─────────────┘    └─────────────┘ │
│         │                    │                    │     │
│         │                    │                    │     │
│  ┌─────────────┐              │            ┌─────────────┐ │
│  │ dim_product │              │            │  dim_user   │ │
│  │             │              │            │             │ │
│  │product_id(PK)│              │            │ user_id(PK) │ │
│  │product_name │              │            │ user_name   │ │
│  │category_id(FK)──────────────┘            │ age         │ │
│  │ brand_id(FK)│                           │ gender      │ │
│  │ price       │                           │ city_id(FK) │ │
│  └─────────────┘                           └─────────────┘ │
│         │                                          │       │
│         │              ┌─────────────┐             │       │
│         │              │             │             │       │
│         └──────────────│ fact_order  │─────────────┘       │
│                        │             │                     │
│                        │ order_id(PK)│                     │
│                        │ user_id(FK) │                     │
│                        │product_id(FK)│                    │
│                        │ date_id(FK) │                     │
│                        │order_amount │                     │
│                        │ quantity    │                     │
│                        │create_time  │                     │
│                        └─────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

### 维度表设计

```sql
-- 用户维度表
CREATE TABLE dim_user (
    user_id STRING COMMENT '用户ID',
    user_name STRING COMMENT '用户姓名',
    gender STRING COMMENT '性别',
    age INT COMMENT '年龄',
    age_group STRING COMMENT '年龄段',
    city STRING COMMENT '城市',
    province STRING COMMENT '省份',
    register_date DATE COMMENT '注册日期',
    user_level STRING COMMENT '用户等级',
    is_active STRING COMMENT '是否活跃',
    create_time TIMESTAMP COMMENT '创建时间',
    update_time TIMESTAMP COMMENT '更新时间'
) COMMENT '用户维度表'
STORED AS PARQUET;

-- 商品维度表
CREATE TABLE dim_product (
    product_id STRING COMMENT '商品ID',
    product_name STRING COMMENT '商品名称',
    category_id STRING COMMENT '类目ID',
    category_name STRING COMMENT '类目名称',
    brand_id STRING COMMENT '品牌ID',
    brand_name STRING COMMENT '品牌名称',
    price DECIMAL(10,2) COMMENT '商品价格',
    status STRING COMMENT '商品状态',
    create_time TIMESTAMP COMMENT '创建时间',
    update_time TIMESTAMP COMMENT '更新时间'
) COMMENT '商品维度表'
STORED AS PARQUET;

-- 时间维度表
CREATE TABLE dim_date (
    date_id STRING COMMENT '日期ID',
    date_value DATE COMMENT '日期值',
    year INT COMMENT '年',
    month INT COMMENT '月',
    day INT COMMENT '日',
    quarter INT COMMENT '季度',
    week INT COMMENT '周',
    weekday INT COMMENT '星期几',
    is_weekend STRING COMMENT '是否周末',
    is_holiday STRING COMMENT '是否节假日',
    holiday_name STRING COMMENT '节假日名称'
) COMMENT '时间维度表'
STORED AS PARQUET;
```

## 数据治理

### 数据质量管理

**质量检查规则：**
```sql
-- 完整性检查
CREATE VIEW data_quality_completeness AS
SELECT 
    'dwd_order_info' as table_name,
    'order_id' as column_name,
    COUNT(*) as total_count,
    COUNT(order_id) as non_null_count,
    ROUND((COUNT(order_id) * 100.0 / COUNT(*)), 2) as completeness_rate,
    '${bizdate}' as check_date
FROM dwd_order_info
WHERE dt = '${bizdate}'
UNION ALL
SELECT 
    'dwd_order_info' as table_name,
    'user_id' as column_name,
    COUNT(*) as total_count,
    COUNT(user_id) as non_null_count,
    ROUND((COUNT(user_id) * 100.0 / COUNT(*)), 2) as completeness_rate,
    '${bizdate}' as check_date
FROM dwd_order_info
WHERE dt = '${bizdate}';

-- 准确性检查
CREATE VIEW data_quality_accuracy AS
SELECT 
    'dwd_order_info' as table_name,
    'order_amount' as column_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN order_amount >= 0 THEN 1 END) as valid_count,
    ROUND((COUNT(CASE WHEN order_amount >= 0 THEN 1 END) * 100.0 / COUNT(*)), 2) as accuracy_rate,
    '${bizdate}' as check_date
FROM dwd_order_info
WHERE dt = '${bizdate}';

-- 唯一性检查
CREATE VIEW data_quality_uniqueness AS
SELECT 
    'dwd_order_info' as table_name,
    'order_id' as column_name,
    COUNT(*) as total_count,
    COUNT(DISTINCT order_id) as unique_count,
    ROUND((COUNT(DISTINCT order_id) * 100.0 / COUNT(*)), 2) as uniqueness_rate,
    '${bizdate}' as check_date
FROM dwd_order_info
WHERE dt = '${bizdate}';
```

### 元数据管理

**表元数据：**
```sql
-- 表元数据管理
CREATE TABLE metadata_table_info (
    table_name STRING COMMENT '表名',
    table_comment STRING COMMENT '表注释',
    database_name STRING COMMENT '数据库名',
    table_type STRING COMMENT '表类型',
    storage_format STRING COMMENT '存储格式',
    partition_columns STRING COMMENT '分区字段',
    owner STRING COMMENT '负责人',
    create_time TIMESTAMP COMMENT '创建时间',
    update_time TIMESTAMP COMMENT '更新时间'
) COMMENT '表元数据信息';

-- 字段元数据
CREATE TABLE metadata_column_info (
    table_name STRING COMMENT '表名',
    column_name STRING COMMENT '字段名',
    column_type STRING COMMENT '字段类型',
    column_comment STRING COMMENT '字段注释',
    is_nullable STRING COMMENT '是否可空',
    is_primary_key STRING COMMENT '是否主键',
    default_value STRING COMMENT '默认值',
    create_time TIMESTAMP COMMENT '创建时间',
    update_time TIMESTAMP COMMENT '更新时间'
) COMMENT '字段元数据信息';

-- 血缘关系
CREATE TABLE metadata_lineage (
    source_table STRING COMMENT '源表',
    target_table STRING COMMENT '目标表',
    dependency_type STRING COMMENT '依赖类型',
    transform_logic STRING COMMENT '转换逻辑',
    create_time TIMESTAMP COMMENT '创建时间',
    update_time TIMESTAMP COMMENT '更新时间'
) COMMENT '数据血缘关系';
```

### 数据安全

**权限管理：**
```sql
-- 角色权限管理
CREATE TABLE security_role (
    role_id STRING COMMENT '角色ID',
    role_name STRING COMMENT '角色名称',
    role_desc STRING COMMENT '角色描述',
    create_time TIMESTAMP COMMENT '创建时间'
) COMMENT '角色信息表';

-- 用户角色关系
CREATE TABLE security_user_role (
    user_id STRING COMMENT '用户ID',
    role_id STRING COMMENT '角色ID',
    grant_time TIMESTAMP COMMENT '授权时间',
    expire_time TIMESTAMP COMMENT '过期时间'
) COMMENT '用户角色关系表';

-- 表权限管理
CREATE TABLE security_table_permission (
    role_id STRING COMMENT '角色ID',
    table_name STRING COMMENT '表名',
    permission_type STRING COMMENT '权限类型(SELECT/INSERT/UPDATE/DELETE)',
    grant_time TIMESTAMP COMMENT '授权时间'
) COMMENT '表权限管理';
```

## 性能优化

### 分区策略

```sql
-- 按日期分区
CREATE TABLE fact_order_daily (
    order_id STRING,
    user_id STRING,
    product_id STRING,
    order_amount DECIMAL(10,2),
    create_time TIMESTAMP
) COMMENT '订单事实表-按日分区'
PARTITIONED BY (dt STRING COMMENT '日期分区')
STORED AS PARQUET;

-- 多级分区
CREATE TABLE fact_order_multi_partition (
    order_id STRING,
    user_id STRING,
    product_id STRING,
    order_amount DECIMAL(10,2),
    create_time TIMESTAMP
) COMMENT '订单事实表-多级分区'
PARTITIONED BY (
    year STRING COMMENT '年分区',
    month STRING COMMENT '月分区',
    day STRING COMMENT '日分区'
)
STORED AS PARQUET;
```

### 索引优化

```sql
-- 创建索引
CREATE INDEX idx_user_id ON dwd_order_info (user_id);
CREATE INDEX idx_product_id ON dwd_order_info (product_id);
CREATE INDEX idx_create_time ON dwd_order_info (create_time);

-- 复合索引
CREATE INDEX idx_user_product ON dwd_order_info (user_id, product_id);
```

### 存储优化

```sql
-- 列式存储优化
CREATE TABLE fact_order_optimized (
    order_id STRING,
    user_id STRING,
    product_id STRING,
    order_amount DECIMAL(10,2),
    create_time TIMESTAMP
) 
STORED AS PARQUET
TBLPROPERTIES (
    'parquet.compression'='SNAPPY',
    'parquet.block.size'='134217728',
    'parquet.page.size'='1048576'
);

-- 数据压缩
SET hive.exec.compress.output=true;
SET mapred.output.compression.codec=org.apache.hadoop.io.compress.SnappyCodec;
```

## 监控和运维

### 数据监控

```sql
-- 数据量监控
CREATE VIEW monitor_data_volume AS
SELECT 
    table_name,
    partition_date,
    record_count,
    file_size_mb,
    avg_record_size,
    check_time
FROM (
    SELECT 
        'dwd_order_info' as table_name,
        dt as partition_date,
        COUNT(*) as record_count,
        ROUND(SUM(input_file_size) / 1024 / 1024, 2) as file_size_mb,
        ROUND(SUM(input_file_size) / COUNT(*), 2) as avg_record_size,
        CURRENT_TIMESTAMP as check_time
    FROM dwd_order_info
    WHERE dt >= DATE_SUB(CURRENT_DATE, 7)
    GROUP BY dt
) t;

-- 数据延迟监控
CREATE VIEW monitor_data_latency AS
SELECT 
    table_name,
    partition_date,
    expected_time,
    actual_time,
    delay_minutes,
    status
FROM (
    SELECT 
        'dwd_order_info' as table_name,
        dt as partition_date,
        CONCAT(dt, ' 08:00:00') as expected_time,
        MAX(etl_time) as actual_time,
        ROUND((UNIX_TIMESTAMP(MAX(etl_time)) - UNIX_TIMESTAMP(CONCAT(dt, ' 08:00:00'))) / 60, 2) as delay_minutes,
        CASE 
            WHEN MAX(etl_time) <= CONCAT(dt, ' 08:30:00') THEN '正常'
            WHEN MAX(etl_time) <= CONCAT(dt, ' 09:00:00') THEN '轻微延迟'
            ELSE '严重延迟'
        END as status
    FROM dwd_order_info
    WHERE dt >= DATE_SUB(CURRENT_DATE, 7)
    GROUP BY dt
) t;
```

### 任务调度

```python
# Airflow DAG 示例
from airflow import DAG
from airflow.operators.bash_operator import BashOperator
from airflow.operators.python_operator import PythonOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'data_team',
    'depends_on_past': False,
    'start_date': datetime(2023, 1, 1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=5)
}

dag = DAG(
    'data_warehouse_etl',
    default_args=default_args,
    description='数据仓库ETL流程',
    schedule_interval='0 2 * * *',  # 每天凌晨2点执行
    catchup=False
)

# ODS层数据加载
ods_task = BashOperator(
    task_id='load_ods_data',
    bash_command='hive -f /path/to/ods_load.sql',
    dag=dag
)

# DWD层数据处理
dwd_task = BashOperator(
    task_id='process_dwd_data',
    bash_command='hive -f /path/to/dwd_process.sql',
    dag=dag
)

# DWS层数据汇总
dws_task = BashOperator(
    task_id='aggregate_dws_data',
    bash_command='hive -f /path/to/dws_aggregate.sql',
    dag=dag
)

# 数据质量检查
quality_check = PythonOperator(
    task_id='data_quality_check',
    python_callable=check_data_quality,
    dag=dag
)

# 任务依赖关系
ods_task >> dwd_task >> dws_task >> quality_check
```

## 最佳实践

### 1. 设计原则

1. **分层清晰**
   - 每层职责明确
   - 避免跨层访问
   - 保持数据流向单一

2. **标准统一**
   - 命名规范统一
   - 数据类型标准化
   - 编码格式一致

3. **可扩展性**
   - 支持业务变化
   - 易于添加新数据源
   - 支持水平扩展

### 2. 开发规范

```sql
-- 表命名规范
-- ODS层：ods_[业务域]_[表名]
-- DWD层：dwd_[业务域]_[表名]
-- DWS层：dws_[业务域]_[聚合维度]_[时间粒度]
-- DM层：dm_[主题域]_[表名]
-- APP层：app_[应用场景]_[表名]

-- 字段命名规范
-- 主键：[表名]_id
-- 外键：[关联表名]_id
-- 时间字段：create_time, update_time, etl_time
-- 状态字段：[业务含义]_status
-- 金额字段：[业务含义]_amount
```

### 3. 运维建议

1. **监控告警**
   - 数据量异常监控
   - 数据延迟监控
   - 数据质量监控
   - 任务执行监控

2. **备份策略**
   - 重要数据定期备份
   - 多地域备份
   - 备份数据验证

3. **性能调优**
   - 定期分析查询性能
   - 优化分区策略
   - 调整存储格式
   - 更新统计信息

## 总结

数据分层架构是大数据平台的核心设计理念，通过合理的分层设计可以实现：

1. **数据治理**：清晰的数据流转和质量控制
2. **性能优化**：针对不同层次的性能优化策略
3. **业务支撑**：快速响应业务需求变化
4. **成本控制**：合理的资源分配和使用
5. **团队协作**：明确的开发和维护职责

随着业务的发展和技术的演进，数据分层架构也需要持续优化和完善，以适应不断变化的业务需求和技术环境。