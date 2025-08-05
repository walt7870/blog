# 数据仓库与数据湖

## 概述

数据仓库和数据湖是现代企业数据管理的两种重要架构模式。数据仓库提供结构化的数据存储和分析能力，而数据湖则支持多种数据类型的存储和处理。随着大数据技术的发展，两者正在融合形成现代数据平台。

## 数据仓库（Data Warehouse）

### 核心概念

数据仓库是一个面向主题的、集成的、相对稳定的、反映历史变化的数据集合，用于支持管理决策。

#### 特点
- **面向主题**：围绕特定业务主题组织数据
- **集成性**：来自多个数据源的数据经过清洗和转换
- **非易失性**：数据一旦进入仓库，一般不会被删除
- **时变性**：记录数据的历史变化

### 传统数据仓库架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   数据源层      │    │   数据集成层    │    │   数据存储层    │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ 业务系统    │ │───▶│ │ ETL工具     │ │───▶│ │ 数据仓库    │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ 外部数据    │ │───▶│ │ 数据清洗    │ │───▶│ │ 数据集市    │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ 日志文件    │ │───▶│ │ 数据转换    │ │───▶│ │ OLAP立方体  │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │   数据应用层    │
                                               │                 │
                                               │ ┌─────────────┐ │
                                               │ │ BI报表      │ │
                                               │ └─────────────┘ │
                                               │ ┌─────────────┐ │
                                               │ │ 数据分析    │ │
                                               │ └─────────────┘ │
                                               │ ┌─────────────┐ │
                                               │ │ 决策支持    │ │
                                               │ └─────────────┘ │
                                               └─────────────────┘
```

### 维度建模

#### 星型模型（Star Schema）

```sql
-- 事实表：销售事实表
CREATE TABLE fact_sales (
    sale_id BIGINT PRIMARY KEY,
    product_key INT,
    customer_key INT,
    date_key INT,
    store_key INT,
    quantity INT,
    unit_price DECIMAL(10,2),
    total_amount DECIMAL(12,2),
    discount_amount DECIMAL(10,2),
    created_time TIMESTAMP
);

-- 维度表：产品维度
CREATE TABLE dim_product (
    product_key INT PRIMARY KEY,
    product_id VARCHAR(50),
    product_name VARCHAR(200),
    category VARCHAR(100),
    subcategory VARCHAR(100),
    brand VARCHAR(100),
    supplier VARCHAR(100),
    unit_cost DECIMAL(10,2),
    created_date DATE,
    updated_date DATE
);

-- 维度表：客户维度
CREATE TABLE dim_customer (
    customer_key INT PRIMARY KEY,
    customer_id VARCHAR(50),
    customer_name VARCHAR(200),
    gender VARCHAR(10),
    age_group VARCHAR(20),
    city VARCHAR(100),
    province VARCHAR(100),
    customer_segment VARCHAR(50),
    registration_date DATE
);

-- 维度表：日期维度
CREATE TABLE dim_date (
    date_key INT PRIMARY KEY,
    full_date DATE,
    year INT,
    quarter INT,
    month INT,
    week INT,
    day_of_month INT,
    day_of_week INT,
    day_name VARCHAR(20),
    month_name VARCHAR(20),
    is_weekend BOOLEAN,
    is_holiday BOOLEAN
);

-- 维度表：门店维度
CREATE TABLE dim_store (
    store_key INT PRIMARY KEY,
    store_id VARCHAR(50),
    store_name VARCHAR(200),
    store_type VARCHAR(50),
    city VARCHAR(100),
    province VARCHAR(100),
    region VARCHAR(100),
    manager VARCHAR(100),
    open_date DATE
);
```

#### 雪花模型（Snowflake Schema）

```sql
-- 产品维度表（规范化）
CREATE TABLE dim_product (
    product_key INT PRIMARY KEY,
    product_id VARCHAR(50),
    product_name VARCHAR(200),
    category_key INT,
    brand_key INT,
    supplier_key INT,
    unit_cost DECIMAL(10,2)
);

-- 产品类别表
CREATE TABLE dim_category (
    category_key INT PRIMARY KEY,
    category_id VARCHAR(50),
    category_name VARCHAR(100),
    parent_category_key INT
);

-- 品牌表
CREATE TABLE dim_brand (
    brand_key INT PRIMARY KEY,
    brand_id VARCHAR(50),
    brand_name VARCHAR(100),
    brand_country VARCHAR(100)
);

-- 供应商表
CREATE TABLE dim_supplier (
    supplier_key INT PRIMARY KEY,
    supplier_id VARCHAR(50),
    supplier_name VARCHAR(200),
    supplier_city VARCHAR(100),
    supplier_country VARCHAR(100)
);
```

### ETL流程实现

```python
# ETL流程示例
import pandas as pd
from sqlalchemy import create_engine
from datetime import datetime, timedelta
import logging

class DataWarehouseETL:
    def __init__(self, source_conn, target_conn):
        self.source_engine = create_engine(source_conn)
        self.target_engine = create_engine(target_conn)
        self.logger = logging.getLogger(__name__)
    
    def extract_sales_data(self, start_date, end_date):
        """
        从源系统提取销售数据
        """
        query = """
        SELECT 
            s.sale_id,
            s.product_id,
            s.customer_id,
            s.sale_date,
            s.store_id,
            s.quantity,
            s.unit_price,
            s.total_amount,
            s.discount_amount,
            p.product_name,
            p.category,
            p.brand,
            c.customer_name,
            c.city as customer_city,
            st.store_name,
            st.city as store_city
        FROM sales s
        JOIN products p ON s.product_id = p.product_id
        JOIN customers c ON s.customer_id = c.customer_id
        JOIN stores st ON s.store_id = st.store_id
        WHERE s.sale_date BETWEEN %s AND %s
        """
        
        df = pd.read_sql(query, self.source_engine, 
                        params=[start_date, end_date])
        self.logger.info(f"提取了 {len(df)} 条销售记录")
        return df
    
    def transform_sales_data(self, df):
        """
        转换销售数据
        """
        # 数据清洗
        df = df.dropna(subset=['sale_id', 'product_id', 'customer_id'])
        
        # 数据类型转换
        df['sale_date'] = pd.to_datetime(df['sale_date'])
        df['quantity'] = df['quantity'].astype(int)
        df['unit_price'] = df['unit_price'].astype(float)
        df['total_amount'] = df['total_amount'].astype(float)
        
        # 计算派生字段
        df['profit_amount'] = df['total_amount'] - df['discount_amount']
        df['year'] = df['sale_date'].dt.year
        df['month'] = df['sale_date'].dt.month
        df['quarter'] = df['sale_date'].dt.quarter
        
        # 数据验证
        invalid_records = df[df['total_amount'] < 0]
        if not invalid_records.empty:
            self.logger.warning(f"发现 {len(invalid_records)} 条无效记录")
            df = df[df['total_amount'] >= 0]
        
        self.logger.info(f"转换后保留 {len(df)} 条有效记录")
        return df
    
    def load_dimension_tables(self):
        """
        加载维度表
        """
        # 加载产品维度
        product_query = """
        SELECT DISTINCT
            ROW_NUMBER() OVER (ORDER BY product_id) as product_key,
            product_id,
            product_name,
            category,
            subcategory,
            brand,
            supplier,
            unit_cost,
            CURRENT_DATE as created_date
        FROM products
        """
        
        products_df = pd.read_sql(product_query, self.source_engine)
        products_df.to_sql('dim_product', self.target_engine, 
                          if_exists='replace', index=False)
        
        # 加载客户维度
        customer_query = """
        SELECT DISTINCT
            ROW_NUMBER() OVER (ORDER BY customer_id) as customer_key,
            customer_id,
            customer_name,
            gender,
            CASE 
                WHEN age < 25 THEN '18-24'
                WHEN age < 35 THEN '25-34'
                WHEN age < 45 THEN '35-44'
                WHEN age < 55 THEN '45-54'
                ELSE '55+'
            END as age_group,
            city,
            province,
            customer_segment,
            registration_date
        FROM customers
        """
        
        customers_df = pd.read_sql(customer_query, self.source_engine)
        customers_df.to_sql('dim_customer', self.target_engine, 
                           if_exists='replace', index=False)
        
        # 生成日期维度
        self.generate_date_dimension()
        
        self.logger.info("维度表加载完成")
    
    def generate_date_dimension(self):
        """
        生成日期维度表
        """
        start_date = datetime(2020, 1, 1)
        end_date = datetime(2025, 12, 31)
        
        dates = []
        current_date = start_date
        
        while current_date <= end_date:
            dates.append({
                'date_key': int(current_date.strftime('%Y%m%d')),
                'full_date': current_date,
                'year': current_date.year,
                'quarter': (current_date.month - 1) // 3 + 1,
                'month': current_date.month,
                'week': current_date.isocalendar()[1],
                'day_of_month': current_date.day,
                'day_of_week': current_date.weekday() + 1,
                'day_name': current_date.strftime('%A'),
                'month_name': current_date.strftime('%B'),
                'is_weekend': current_date.weekday() >= 5,
                'is_holiday': self.is_holiday(current_date)
            })
            current_date += timedelta(days=1)
        
        dates_df = pd.DataFrame(dates)
        dates_df.to_sql('dim_date', self.target_engine, 
                       if_exists='replace', index=False)
    
    def is_holiday(self, date):
        """
        判断是否为节假日（简化版本）
        """
        holidays = [
            (1, 1),   # 元旦
            (5, 1),   # 劳动节
            (10, 1),  # 国庆节
            (12, 25), # 圣诞节
        ]
        return (date.month, date.day) in holidays
    
    def load_fact_table(self, df):
        """
        加载事实表
        """
        # 获取维度键
        product_keys = pd.read_sql('SELECT product_id, product_key FROM dim_product', 
                                  self.target_engine)
        customer_keys = pd.read_sql('SELECT customer_id, customer_key FROM dim_customer', 
                                   self.target_engine)
        
        # 关联维度键
        df = df.merge(product_keys, on='product_id', how='left')
        df = df.merge(customer_keys, on='customer_id', how='left')
        
        # 生成日期键
        df['date_key'] = df['sale_date'].dt.strftime('%Y%m%d').astype(int)
        
        # 选择事实表字段
        fact_columns = [
            'sale_id', 'product_key', 'customer_key', 'date_key',
            'quantity', 'unit_price', 'total_amount', 'discount_amount'
        ]
        
        fact_df = df[fact_columns]
        fact_df.to_sql('fact_sales', self.target_engine, 
                      if_exists='append', index=False)
        
        self.logger.info(f"加载了 {len(fact_df)} 条事实记录")
    
    def run_etl(self, start_date, end_date):
        """
        运行完整的ETL流程
        """
        try:
            self.logger.info(f"开始ETL流程: {start_date} 到 {end_date}")
            
            # Extract
            raw_data = self.extract_sales_data(start_date, end_date)
            
            # Transform
            clean_data = self.transform_sales_data(raw_data)
            
            # Load dimensions (只在首次运行时执行)
            self.load_dimension_tables()
            
            # Load facts
            self.load_fact_table(clean_data)
            
            self.logger.info("ETL流程完成")
            
        except Exception as e:
            self.logger.error(f"ETL流程失败: {str(e)}")
            raise

# 使用示例
if __name__ == "__main__":
    source_conn = "mysql://user:password@localhost/source_db"
    target_conn = "postgresql://user:password@localhost/warehouse_db"
    
    etl = DataWarehouseETL(source_conn, target_conn)
    etl.run_etl('2024-01-01', '2024-01-31')
```

## 数据湖（Data Lake）

### 核心概念

数据湖是一个存储大量原始数据的存储库，数据以其原生格式保存，直到需要时才进行处理。

#### 特点
- **模式灵活**：支持结构化、半结构化和非结构化数据
- **存储成本低**：使用廉价的存储介质
- **处理灵活**：支持多种数据处理引擎
- **扩展性强**：可以水平扩展到PB级别

### 数据湖架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              数据湖架构                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                            数据消费层                                        │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│ │ BI工具      │ │ 机器学习    │ │ 实时分析    │ │ 数据科学    │ │ API服务 │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│                            数据处理层                                        │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│ │ Spark       │ │ Flink       │ │ Presto      │ │ Hive        │ │ Kafka   │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│                            数据管理层                                        │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│ │ 元数据管理  │ │ 数据目录    │ │ 数据血缘    │ │ 数据质量    │ │ 安全管理│ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│                            数据存储层                                        │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                          分布式文件系统                                  │ │
│ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │ │
│ │ │ 原始数据区  │ │ 清洗数据区  │ │ 建模数据区  │ │ 应用数据区  │       │ │
│ │ │ (Raw Zone)  │ │(Clean Zone) │ │(Model Zone) │ │ (App Zone)  │       │ │
│ │ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│                            数据接入层                                        │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│ │ 批量接入    │ │ 流式接入    │ │ API接入     │ │ 文件上传    │ │ 爬虫采集│ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 数据湖实现示例

```python
# 基于Spark的数据湖处理示例
from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import *
import boto3
from datetime import datetime

class DataLakeProcessor:
    def __init__(self, app_name="DataLakeProcessor"):
        self.spark = SparkSession.builder \
            .appName(app_name) \
            .config("spark.sql.adaptive.enabled", "true") \
            .config("spark.sql.adaptive.coalescePartitions.enabled", "true") \
            .getOrCreate()
        
        self.s3_client = boto3.client('s3')
        self.bucket_name = "my-data-lake"
    
    def ingest_raw_data(self, source_path, target_path, data_format="json"):
        """
        原始数据接入
        """
        try:
            # 读取原始数据
            if data_format == "json":
                df = self.spark.read.json(source_path)
            elif data_format == "csv":
                df = self.spark.read.option("header", "true").csv(source_path)
            elif data_format == "parquet":
                df = self.spark.read.parquet(source_path)
            else:
                raise ValueError(f"不支持的数据格式: {data_format}")
            
            # 添加元数据
            df = df.withColumn("ingestion_timestamp", current_timestamp()) \
                   .withColumn("ingestion_date", current_date()) \
                   .withColumn("source_file", lit(source_path))
            
            # 按日期分区存储
            df.write \
                .mode("append") \
                .partitionBy("ingestion_date") \
                .parquet(target_path)
            
            print(f"成功接入 {df.count()} 条记录到 {target_path}")
            return df
            
        except Exception as e:
            print(f"数据接入失败: {str(e)}")
            raise
    
    def clean_and_validate_data(self, raw_path, clean_path):
        """
        数据清洗和验证
        """
        # 读取原始数据
        df = self.spark.read.parquet(raw_path)
        
        # 数据清洗
        # 1. 去除重复记录
        df = df.dropDuplicates()
        
        # 2. 处理空值
        df = df.na.drop(subset=["id", "timestamp"])  # 关键字段不能为空
        df = df.na.fill({"category": "unknown", "amount": 0})  # 填充默认值
        
        # 3. 数据类型转换
        df = df.withColumn("amount", col("amount").cast("double")) \
               .withColumn("timestamp", to_timestamp(col("timestamp")))
        
        # 4. 数据验证
        # 验证金额范围
        df = df.filter(col("amount") >= 0)
        
        # 验证时间范围
        current_time = datetime.now()
        df = df.filter(col("timestamp") <= current_time)
        
        # 5. 添加数据质量标记
        df = df.withColumn("data_quality_score", 
                          when(col("amount").isNull() | col("category").isNull(), 0.5)
                          .otherwise(1.0))
        
        # 6. 添加清洗时间戳
        df = df.withColumn("cleaned_timestamp", current_timestamp())
        
        # 保存清洗后的数据
        df.write \
            .mode("overwrite") \
            .partitionBy("ingestion_date") \
            .parquet(clean_path)
        
        print(f"数据清洗完成，保留 {df.count()} 条有效记录")
        return df
    
    def create_data_model(self, clean_path, model_path):
        """
        创建数据模型
        """
        # 读取清洗后的数据
        df = self.spark.read.parquet(clean_path)
        
        # 创建聚合模型
        daily_summary = df.groupBy(
            date_format(col("timestamp"), "yyyy-MM-dd").alias("date"),
            col("category")
        ).agg(
            count("*").alias("transaction_count"),
            sum("amount").alias("total_amount"),
            avg("amount").alias("avg_amount"),
            max("amount").alias("max_amount"),
            min("amount").alias("min_amount")
        )
        
        # 添加计算字段
        daily_summary = daily_summary.withColumn(
            "amount_category",
            when(col("avg_amount") < 100, "low")
            .when(col("avg_amount") < 1000, "medium")
            .otherwise("high")
        )
        
        # 保存模型数据
        daily_summary.write \
            .mode("overwrite") \
            .partitionBy("date") \
            .parquet(f"{model_path}/daily_summary")
        
        # 创建用户行为模型
        user_behavior = df.groupBy("user_id").agg(
            count("*").alias("total_transactions"),
            sum("amount").alias("total_spent"),
            avg("amount").alias("avg_transaction_amount"),
            countDistinct("category").alias("category_diversity"),
            datediff(max("timestamp"), min("timestamp")).alias("active_days")
        )
        
        # 用户分群
        user_behavior = user_behavior.withColumn(
            "user_segment",
            when((col("total_spent") > 10000) & (col("total_transactions") > 100), "high_value")
            .when((col("total_spent") > 1000) & (col("total_transactions") > 20), "medium_value")
            .otherwise("low_value")
        )
        
        user_behavior.write \
            .mode("overwrite") \
            .parquet(f"{model_path}/user_behavior")
        
        print("数据模型创建完成")
        return daily_summary, user_behavior
    
    def create_application_views(self, model_path, app_path):
        """
        创建应用层视图
        """
        # 读取模型数据
        daily_summary = self.spark.read.parquet(f"{model_path}/daily_summary")
        user_behavior = self.spark.read.parquet(f"{model_path}/user_behavior")
        
        # 创建BI报表数据
        # 月度趋势报表
        monthly_trend = daily_summary.withColumn(
            "month", date_format(col("date"), "yyyy-MM")
        ).groupBy("month", "category").agg(
            sum("total_amount").alias("monthly_amount"),
            sum("transaction_count").alias("monthly_transactions")
        )
        
        monthly_trend.write \
            .mode("overwrite") \
            .parquet(f"{app_path}/monthly_trend")
        
        # 用户价值分析
        user_value_analysis = user_behavior.groupBy("user_segment").agg(
            count("*").alias("user_count"),
            avg("total_spent").alias("avg_spent_per_user"),
            sum("total_spent").alias("segment_total_value")
        )
        
        user_value_analysis.write \
            .mode("overwrite") \
            .parquet(f"{app_path}/user_value_analysis")
        
        print("应用层视图创建完成")
    
    def setup_data_catalog(self):
        """
        设置数据目录
        """
        # 注册表到Hive Metastore
        self.spark.sql("""
            CREATE DATABASE IF NOT EXISTS data_lake
            COMMENT '数据湖数据库'
            LOCATION 's3a://my-data-lake/warehouse/'
        """)
        
        # 注册原始数据表
        self.spark.sql("""
            CREATE TABLE IF NOT EXISTS data_lake.raw_transactions (
                id STRING,
                user_id STRING,
                amount DOUBLE,
                category STRING,
                timestamp TIMESTAMP,
                ingestion_timestamp TIMESTAMP,
                source_file STRING
            )
            USING PARQUET
            PARTITIONED BY (ingestion_date DATE)
            LOCATION 's3a://my-data-lake/raw/transactions/'
        """)
        
        # 注册清洗数据表
        self.spark.sql("""
            CREATE TABLE IF NOT EXISTS data_lake.clean_transactions (
                id STRING,
                user_id STRING,
                amount DOUBLE,
                category STRING,
                timestamp TIMESTAMP,
                data_quality_score DOUBLE,
                cleaned_timestamp TIMESTAMP
            )
            USING PARQUET
            PARTITIONED BY (ingestion_date DATE)
            LOCATION 's3a://my-data-lake/clean/transactions/'
        """)
        
        # 注册聚合模型表
        self.spark.sql("""
            CREATE TABLE IF NOT EXISTS data_lake.daily_summary (
                category STRING,
                transaction_count BIGINT,
                total_amount DOUBLE,
                avg_amount DOUBLE,
                max_amount DOUBLE,
                min_amount DOUBLE,
                amount_category STRING
            )
            USING PARQUET
            PARTITIONED BY (date STRING)
            LOCATION 's3a://my-data-lake/model/daily_summary/'
        """)
        
        print("数据目录设置完成")
    
    def run_data_pipeline(self, source_path, data_format="json"):
        """
        运行完整的数据管道
        """
        try:
            print("开始数据湖处理管道...")
            
            # 定义路径
            raw_path = f"s3a://{self.bucket_name}/raw/transactions/"
            clean_path = f"s3a://{self.bucket_name}/clean/transactions/"
            model_path = f"s3a://{self.bucket_name}/model/"
            app_path = f"s3a://{self.bucket_name}/app/"
            
            # 1. 数据接入
            print("步骤1: 数据接入")
            self.ingest_raw_data(source_path, raw_path, data_format)
            
            # 2. 数据清洗
            print("步骤2: 数据清洗")
            self.clean_and_validate_data(raw_path, clean_path)
            
            # 3. 数据建模
            print("步骤3: 数据建模")
            self.create_data_model(clean_path, model_path)
            
            # 4. 应用层处理
            print("步骤4: 应用层处理")
            self.create_application_views(model_path, app_path)
            
            # 5. 设置数据目录
            print("步骤5: 设置数据目录")
            self.setup_data_catalog()
            
            print("数据湖处理管道完成")
            
        except Exception as e:
            print(f"数据管道执行失败: {str(e)}")
            raise
    
    def close(self):
        """
        关闭Spark会话
        """
        self.spark.stop()

# 使用示例
if __name__ == "__main__":
    processor = DataLakeProcessor()
    
    try:
        # 运行数据管道
        processor.run_data_pipeline(
            source_path="s3a://source-bucket/transactions/2024/01/",
            data_format="json"
        )
        
        # 查询示例
        result = processor.spark.sql("""
            SELECT category, sum(total_amount) as total
            FROM data_lake.daily_summary
            WHERE date >= '2024-01-01'
            GROUP BY category
            ORDER BY total DESC
        """)
        
        result.show()
        
    finally:
        processor.close()
```

## 现代数据湖架构（Lakehouse）

### Delta Lake架构

```python
# Delta Lake示例
from delta.tables import *
from pyspark.sql import SparkSession
from pyspark.sql.functions import *

class DeltaLakeManager:
    def __init__(self):
        self.spark = SparkSession.builder \
            .appName("DeltaLakeManager") \
            .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
            .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
            .getOrCreate()
    
    def create_delta_table(self, data_path, table_path):
        """
        创建Delta表
        """
        # 读取数据
        df = self.spark.read.parquet(data_path)
        
        # 写入Delta表
        df.write \
            .format("delta") \
            .mode("overwrite") \
            .option("mergeSchema", "true") \
            .save(table_path)
        
        print(f"Delta表创建完成: {table_path}")
    
    def upsert_data(self, table_path, new_data_path):
        """
        数据更新插入（Upsert）
        """
        # 加载Delta表
        delta_table = DeltaTable.forPath(self.spark, table_path)
        
        # 读取新数据
        new_data = self.spark.read.parquet(new_data_path)
        
        # 执行Merge操作
        delta_table.alias("target").merge(
            new_data.alias("source"),
            "target.id = source.id"
        ).whenMatchedUpdateAll() \
         .whenNotMatchedInsertAll() \
         .execute()
        
        print("数据更新插入完成")
    
    def time_travel_query(self, table_path, version=None, timestamp=None):
        """
        时间旅行查询
        """
        if version is not None:
            df = self.spark.read.format("delta").option("versionAsOf", version).load(table_path)
            print(f"查询版本 {version} 的数据")
        elif timestamp is not None:
            df = self.spark.read.format("delta").option("timestampAsOf", timestamp).load(table_path)
            print(f"查询时间点 {timestamp} 的数据")
        else:
            df = self.spark.read.format("delta").load(table_path)
            print("查询最新版本的数据")
        
        return df
    
    def optimize_table(self, table_path):
        """
        表优化
        """
        delta_table = DeltaTable.forPath(self.spark, table_path)
        
        # 压缩小文件
        delta_table.optimize().executeCompaction()
        
        # Z-Order优化（按指定列排序）
        delta_table.optimize().executeZOrderBy("user_id", "timestamp")
        
        print("表优化完成")
    
    def vacuum_table(self, table_path, retention_hours=168):
        """
        清理旧版本文件
        """
        delta_table = DeltaTable.forPath(self.spark, table_path)
        delta_table.vacuum(retention_hours)
        
        print(f"清理 {retention_hours} 小时前的文件")
```

## 数据仓库 vs 数据湖对比

| 特性 | 数据仓库 | 数据湖 |
|------|----------|--------|
| **数据结构** | 结构化数据 | 结构化、半结构化、非结构化 |
| **模式** | 写时模式（Schema on Write） | 读时模式（Schema on Read） |
| **存储成本** | 高 | 低 |
| **查询性能** | 高（预处理） | 中等（按需处理） |
| **数据质量** | 高（ETL保证） | 需要额外处理 |
| **灵活性** | 低（固定模式） | 高（灵活模式） |
| **处理延迟** | 高（批处理） | 低（实时处理） |
| **技术复杂度** | 中等 | 高 |
| **适用场景** | BI报表、历史分析 | 机器学习、实时分析 |

## 最佳实践

### 1. 数据仓库最佳实践

- **维度建模**：合理设计星型或雪花模型
- **ETL优化**：增量更新、并行处理、错误处理
- **性能调优**：分区、索引、物化视图
- **数据质量**：数据验证、清洗规则、监控告警

### 2. 数据湖最佳实践

- **分层架构**：原始层、清洗层、建模层、应用层
- **元数据管理**：数据目录、血缘关系、质量评分
- **安全控制**：访问控制、数据加密、审计日志
- **成本优化**：生命周期管理、存储分层、计算优化

### 3. 混合架构（Lakehouse）

- **统一存储**：使用对象存储作为统一底座
- **ACID事务**：支持数据一致性和并发控制
- **实时处理**：流批一体化处理能力
- **多引擎支持**：支持多种计算引擎访问

## 总结

数据仓库和数据湖各有优势，在实际应用中需要根据业务需求选择合适的架构。现代企业越来越倾向于采用Lakehouse架构，结合两者的优势，构建统一的数据平台。关键是要做好数据治理，确保数据质量和安全性，同时提供灵活的数据处理和分析能力。