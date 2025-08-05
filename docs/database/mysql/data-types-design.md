# MySQL 数据类型与字段设计

## 概述

数据类型与字段设计是 MySQL 数据库设计的基础，直接影响数据存储效率、查询性能、存储空间占用以及数据完整性。合理的数据类型选择和字段设计不仅能够优化存储空间，还能提高查询效率，确保数据的准确性和一致性。

### 数据类型的重要性

**存储效率**：
- 不同数据类型占用的存储空间差异巨大
- 合适的数据类型可以显著减少存储开销
- 存储空间的优化直接影响 I/O 性能和缓存效率

**查询性能**：
- 数据类型影响索引的效率和大小
- 类型转换会增加 CPU 开销
- 合适的数据类型有助于查询优化器生成更好的执行计划

**数据完整性**：
- 严格的数据类型约束可以防止无效数据的插入
- 合理的长度限制避免数据溢出
- 类型检查是数据质量保证的第一道防线

**应用兼容性**：
- 数据类型的选择影响应用程序的开发复杂度
- 不同编程语言对 MySQL 数据类型的支持程度不同
- 合理的类型选择有助于跨平台兼容性

## 数值类型详解

### 整数类型

**类型特征与选择**：

MySQL 提供了多种整数类型，每种类型都有其特定的存储范围和空间占用：

- **TINYINT**：1字节存储，范围 -128 到 127（有符号）或 0 到 255（无符号）
- **SMALLINT**：2字节存储，范围 -32,768 到 32,767（有符号）或 0 到 65,535（无符号）
- **MEDIUMINT**：3字节存储，范围 -8,388,608 到 8,388,607（有符号）或 0 到 16,777,215（无符号）
- **INT/INTEGER**：4字节存储，范围 -2,147,483,648 到 2,147,483,647（有符号）或 0 到 4,294,967,295（无符号）
- **BIGINT**：8字节存储，范围 -9,223,372,036,854,775,808 到 9,223,372,036,854,775,807（有符号）

**选择原则**：

1. **最小够用原则**：选择能够满足业务需求的最小数据类型
2. **增长预期**：考虑数据的未来增长，留有适当余量
3. **业务语义**：根据字段的业务含义选择合适的类型
4. **性能考虑**：较小的数据类型通常有更好的性能表现

**实际应用场景**：

- **用户ID**：如果用户数量预期在千万级别，使用 INT UNSIGNED；如果可能超过42亿，使用 BIGINT
- **状态字段**：如订单状态、用户状态等，通常使用 TINYINT 即可
- **计数器**：如点击量、访问量等，根据预期最大值选择 INT 或 BIGINT
- **年龄字段**：使用 TINYINT UNSIGNED，范围 0-255 完全满足需求
- **价格分**：如果以分为单位存储价格，INT 可以表示到千万级别的金额

**UNSIGNED 属性的使用**：

无符号整数类型可以将正数范围扩大一倍，适用于永远不会为负数的字段：
- 主键 ID
- 计数器
- 年龄、数量等自然数
- 时间戳（UNIX 时间戳）

**AUTO_INCREMENT 的设计考虑**：

自增字段的设计需要考虑以下因素：
- **类型选择**：根据预期的记录数量选择合适的整数类型
- **起始值设置**：可以通过 AUTO_INCREMENT = n 设置起始值
- **步长控制**：通过 auto_increment_increment 控制步长
- **回绕处理**：当达到类型最大值时的处理策略

### 浮点数类型

**FLOAT 与 DOUBLE**：

- **FLOAT**：4字节，单精度浮点数，大约7位有效数字
- **DOUBLE**：8字节，双精度浮点数，大约15位有效数字

**精度问题与解决方案**：

浮点数存在精度问题，不适合存储需要精确计算的数值：

```sql
-- 浮点数精度问题示例
SELECT 0.1 + 0.2;  -- 结果可能不是精确的 0.3
```

**适用场景**：
- 科学计算中的近似值
- 地理坐标（经纬度）
- 统计数据的平均值、比率等
- 对精度要求不高的测量数据

**不适用场景**：
- 货币金额
- 需要精确计算的财务数据
- 库存数量等需要精确计数的场景

### 定点数类型

**DECIMAL/NUMERIC**：

DECIMAL 类型提供精确的数值存储，适合财务计算：

- **语法**：DECIMAL(M, D)，其中 M 是总位数，D 是小数位数
- **存储**：每9位十进制数字使用4字节存储
- **精度**：完全精确，无舍入误差
- **范围**：M 最大为65，D 最大为30

**存储空间计算**：

DECIMAL 的存储空间计算相对复杂：
- 整数部分和小数部分分别计算
- 每9位数字占用4字节
- 剩余位数按比例占用空间

**应用场景**：
- **货币金额**：DECIMAL(10,2) 可以存储最大99,999,999.99的金额
- **汇率**：DECIMAL(10,6) 可以存储精确到6位小数的汇率
- **百分比**：DECIMAL(5,4) 可以存储如99.9999%的精确百分比
- **财务计算**：所有涉及精确计算的财务数据

**性能考虑**：
- DECIMAL 的计算性能低于浮点数
- 存储空间通常大于等价的浮点数
- 在不需要精确计算的场景下，可以考虑使用整数存储（如以分为单位存储金额）

## 字符串类型详解

### 定长字符串类型

**CHAR 类型特征**：

- **固定长度**：无论实际存储多少字符，都占用指定的空间
- **空间填充**：不足长度的部分用空格填充
- **检索时处理**：检索时会自动去除尾部空格
- **最大长度**：255个字符

**CHAR 的优势**：

1. **存储效率**：对于长度固定或变化很小的数据，存储效率高
2. **查询性能**：由于长度固定，某些操作的性能更好
3. **内存对齐**：有利于内存对齐，提高访问效率

**适用场景**：
- **固定长度编码**：如国家代码（CN、US）、货币代码（CNY、USD）
- **状态标识**：如性别（M、F）、是否标志（Y、N）
- **固定格式ID**：如员工工号、产品编码等
- **MD5哈希值**：32位固定长度的哈希值

### 变长字符串类型

**VARCHAR 类型特征**：

- **变长存储**：根据实际内容长度存储，节省空间
- **长度前缀**：使用1-2字节存储实际长度信息
- **最大长度**：65,535个字符（受行大小限制）
- **字符集影响**：实际可存储字符数受字符集影响

**长度选择策略**：

1. **业务需求分析**：分析字段的实际使用情况
2. **预留空间**：为未来可能的需求变化预留适当空间
3. **性能平衡**：过长的 VARCHAR 可能影响性能
4. **索引考虑**：VARCHAR 字段的索引长度限制

**常见长度设计**：
- **用户名**：VARCHAR(50) - 通常足够，也便于显示
- **邮箱地址**：VARCHAR(255) - 符合邮箱标准的最大长度
- **手机号码**：VARCHAR(20) - 考虑国际号码格式
- **地址信息**：VARCHAR(500) - 详细地址通常需要较长空间
- **商品名称**：VARCHAR(200) - 平衡SEO需求和存储效率

**VARCHAR vs CHAR 选择原则**：

- 长度固定且较短（<10字符）：优先考虑 CHAR
- 长度变化较大：使用 VARCHAR
- 频繁更新且长度变化大：VARCHAR 可能产生碎片
- 对存储空间敏感：使用 VARCHAR

### 大文本类型

**TEXT 类型家族**：

- **TINYTEXT**：最大255字节
- **TEXT**：最大65,535字节（约64KB）
- **MEDIUMTEXT**：最大16,777,215字节（约16MB）
- **LONGTEXT**：最大4,294,967,295字节（约4GB）

**TEXT 类型的特点**：

1. **存储方式**：TEXT 数据存储在行外，表中只存储指针
2. **排序限制**：排序时只使用前 max_sort_length 字节
3. **索引限制**：只能对前缀创建索引
4. **默认值限制**：不能有默认值

**使用场景与注意事项**：

**适用场景**：
- **文章内容**：博客文章、新闻内容等
- **商品描述**：详细的商品描述信息
- **用户评论**：长篇用户评论或反馈
- **日志记录**：详细的操作日志或错误信息
- **配置信息**：JSON格式的配置数据

**性能考虑**：
- TEXT 字段会影响临时表的创建（可能强制使用磁盘临时表）
- 大量 TEXT 字段的查询可能影响内存使用
- 考虑将 TEXT 字段分离到单独的表中

**设计建议**：
- 评估是否真的需要 TEXT 类型
- 考虑使用 VARCHAR 替代较短的 TEXT
- 对于超大文本，考虑存储到文件系统，数据库只存储路径
- 建立合适的前缀索引以支持搜索需求

## 日期时间类型详解

### 日期时间类型概览

**MySQL 日期时间类型**：

- **DATE**：日期，格式 YYYY-MM-DD，范围 1000-01-01 到 9999-12-31
- **TIME**：时间，格式 HH:MM:SS，范围 -838:59:59 到 838:59:59
- **DATETIME**：日期时间，格式 YYYY-MM-DD HH:MM:SS，范围 1000-01-01 00:00:00 到 9999-12-31 23:59:59
- **TIMESTAMP**：时间戳，格式同 DATETIME，但范围 1970-01-01 00:00:01 到 2038-01-19 03:14:07
- **YEAR**：年份，格式 YYYY，范围 1901 到 2155

### DATETIME vs TIMESTAMP

**存储空间对比**：
- **DATETIME**：8字节，不受时区影响
- **TIMESTAMP**：4字节，自动时区转换

**时区处理**：

**DATETIME 特点**：
- 存储的是字面值，不进行时区转换
- 适合存储与时区无关的时间（如生日、纪念日）
- 跨时区应用需要应用层处理时区转换

**TIMESTAMP 特点**：
- 存储时转换为 UTC，检索时转换为当前时区
- 自动处理时区转换，适合全球化应用
- 受系统时区设置影响
- 2038年问题：最大值为2038-01-19 03:14:07 UTC

**选择建议**：

1. **全球化应用**：优先使用 TIMESTAMP，利用其自动时区转换特性
2. **本地化应用**：可以使用 DATETIME，简化时区处理
3. **历史数据**：对于1970年之前或2038年之后的数据，必须使用 DATETIME
4. **存储空间敏感**：TIMESTAMP 占用空间更小

### 时间精度与微秒

**微秒精度支持**：

MySQL 5.6.4 开始支持微秒精度：

```sql
-- 支持微秒精度的类型定义
DATETIME(6)    -- 精确到微秒
TIMESTAMP(3)   -- 精确到毫秒
TIME(6)        -- 精确到微秒
```

**精度选择考虑**：
- **业务需求**：根据实际业务对时间精度的要求
- **存储开销**：更高精度需要更多存储空间
- **性能影响**：高精度时间的比较和计算开销更大
- **应用兼容性**：确保应用程序支持相应精度

**常见精度应用**：
- **秒级精度**：一般业务记录，如用户注册时间、订单创建时间
- **毫秒精度**：需要较高时间精度的业务，如交易记录、日志记录
- **微秒精度**：高频交易、性能监控、科学计算等场景

### 自动时间戳功能

**DEFAULT CURRENT_TIMESTAMP**：

自动设置创建时间：

```sql
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_no VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**ON UPDATE CURRENT_TIMESTAMP**：

自动更新修改时间，适用于需要跟踪记录最后修改时间的场景。

**设计模式**：

1. **创建时间 + 更新时间**：最常见的模式，便于审计和调试
2. **仅创建时间**：对于不可变记录，如日志、历史记录
3. **版本控制**：结合版本号字段，实现乐观锁机制

**注意事项**：
- ON UPDATE CURRENT_TIMESTAMP 在任何字段更新时都会触发
- 批量更新时需要注意时间戳的变化
- 在数据迁移时可能需要特殊处理

## 二进制类型详解

### 二进制字符串类型

**BINARY 和 VARBINARY**：

- **BINARY(M)**：固定长度二进制字符串，类似于 CHAR
- **VARBINARY(M)**：变长二进制字符串，类似于 VARCHAR
- **存储特点**：按字节存储，不受字符集影响
- **填充方式**：BINARY 用 \0 填充，而不是空格

**应用场景**：
- **哈希值存储**：MD5、SHA1等哈希值的二进制存储
- **加密数据**：加密后的二进制数据
- **二进制标识符**：UUID的二进制表示
- **网络地址**：IP地址的二进制存储

### BLOB 类型家族

**BLOB 类型分类**：

- **TINYBLOB**：最大255字节
- **BLOB**：最大65,535字节
- **MEDIUMBLOB**：最大16,777,215字节
- **LONGBLOB**：最大4,294,967,295字节

**BLOB vs TEXT 对比**：

| 特性 | BLOB | TEXT |
|------|------|------|
| 数据类型 | 二进制数据 | 文本数据 |
| 字符集 | 无关 | 相关 |
| 排序规则 | 按字节值 | 按字符集规则 |
| 大小写敏感 | 是 | 取决于排序规则 |

**使用场景**：

**适合 BLOB 的场景**：
- **图片存储**：小图片、图标、头像等
- **文档存储**：PDF、Word文档等二进制文件
- **音频视频**：短音频片段、小视频文件
- **序列化数据**：对象序列化后的二进制数据

**不适合 BLOB 的场景**：
- **大文件存储**：建议存储到文件系统，数据库只存储路径
- **频繁访问的大数据**：会影响查询性能和内存使用
- **需要全文搜索的内容**：应该使用 TEXT 类型

**性能优化建议**：

1. **分离存储**：将 BLOB 字段分离到单独的表
2. **延迟加载**：只在需要时才查询 BLOB 字段
3. **压缩存储**：对于可压缩的数据，先压缩再存储
4. **缓存策略**：对频繁访问的 BLOB 数据建立缓存

## JSON 类型详解

### JSON 类型特性

MySQL 5.7 引入了原生 JSON 数据类型，提供了高效的 JSON 数据存储和操作能力。

**JSON 类型优势**：

1. **自动验证**：插入时自动验证 JSON 格式的有效性
2. **高效存储**：使用二进制格式存储，比 TEXT 存储 JSON 更高效
3. **快速访问**：支持通过路径快速访问 JSON 文档的特定部分
4. **丰富函数**：提供大量 JSON 操作函数
5. **索引支持**：支持对 JSON 文档的特定路径创建索引

**存储格式**：

JSON 类型使用二进制格式存储，具有以下特点：
- 自动去除多余空格
- 键值对可能重新排序
- 重复键会被去除（保留最后一个）

### JSON 操作与函数

**基本操作函数**：

1. **JSON_EXTRACT()**：提取 JSON 文档中的数据
2. **JSON_SET()**：设置 JSON 文档中的值
3. **JSON_INSERT()**：插入新的键值对
4. **JSON_REPLACE()**：替换现有的值
5. **JSON_REMOVE()**：删除指定路径的数据

**查询优化**：

```sql
-- 创建虚拟列和索引以优化 JSON 查询
ALTER TABLE products 
ADD COLUMN price_virtual DECIMAL(10,2) 
GENERATED ALWAYS AS (JSON_EXTRACT(attributes, '$.price')) STORED,
ADD INDEX idx_price (price_virtual);
```

**适用场景**：

1. **配置存储**：应用配置、用户偏好设置
2. **属性存储**：商品属性、用户扩展属性
3. **日志记录**：结构化日志数据
4. **API 数据**：来自第三方 API 的 JSON 响应
5. **灵活字段**：需要动态字段的业务场景

**设计注意事项**：

1. **避免过度使用**：不要将所有数据都存储为 JSON
2. **索引策略**：为常用查询路径创建虚拟列和索引
3. **数据验证**：在应用层进行额外的数据验证
4. **版本兼容**：考虑 JSON 结构变化的向后兼容性

## 字段设计最佳实践

### 命名规范

**字段命名原则**：

1. **语义明确**：字段名应该清楚表达其含义
2. **一致性**：在整个数据库中保持命名风格一致
3. **简洁性**：避免过长的字段名，但不能牺牲可读性
4. **避免关键字**：不使用 MySQL 保留关键字作为字段名

**常用命名约定**：

- **下划线分隔**：user_name, created_at, order_status
- **驼峰命名**：userName, createdAt, orderStatus
- **前缀约定**：is_active, has_permission, can_edit
- **后缀约定**：_id, _at, _count, _flag

**特殊字段命名**：

- **主键**：id 或 {table_name}_id
- **外键**：{referenced_table}_id
- **时间字段**：created_at, updated_at, deleted_at
- **状态字段**：status, state, is_active
- **计数字段**：{item}_count, total_{item}

### NULL 值处理

**NULL 的含义与影响**：

NULL 表示"未知"或"不适用"，与空字符串或0不同：

- **存储空间**：NULL 值需要额外的存储空间来标记
- **索引影响**：NULL 值不会被包含在大多数索引中
- **查询复杂性**：需要使用 IS NULL 或 IS NOT NULL 进行查询
- **聚合函数**：大多数聚合函数会忽略 NULL 值

**NULL vs NOT NULL 选择**：

**使用 NULL 的场景**：
- 字段在业务逻辑上确实可能为空
- 可选的用户信息字段
- 外键字段（表示关联关系可能不存在）
- 计算字段（可能无法计算出结果）

**使用 NOT NULL 的场景**：
- 主键字段（必须非空）
- 业务上必须有值的字段
- 状态字段（可以用默认值表示初始状态）
- 计数器字段（可以默认为0）

**NULL 值的替代方案**：

1. **使用默认值**：为字段设置合理的默认值
2. **使用特殊值**：如用-1表示无效ID，用空字符串表示未填写
3. **分离可选字段**：将可选字段放到单独的表中

### 默认值设计

**默认值的作用**：

1. **简化插入操作**：减少必须指定的字段
2. **保证数据一致性**：确保字段有合理的初始值
3. **提高查询效率**：避免 NULL 值带来的复杂性
4. **业务逻辑支持**：体现业务规则和约定

**常见默认值设计**：

```sql
-- 状态字段默认值
status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1-正常，0-禁用',

-- 计数器默认值
view_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '浏览次数',

-- 布尔字段默认值
is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否激活',

-- 时间字段默认值
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

-- 字符串字段默认值
country VARCHAR(10) NOT NULL DEFAULT 'CN' COMMENT '国家代码',

-- 数值字段默认值
sort_order INT NOT NULL DEFAULT 0 COMMENT '排序序号'
```

**默认值设计原则**：

1. **业务合理性**：默认值应该符合业务逻辑
2. **类型匹配**：默认值必须与字段类型匹配
3. **避免歧义**：默认值不应该与有效业务值产生歧义
4. **便于查询**：选择便于查询和统计的默认值

### 约束设计

**主键约束**：

主键的选择对表的性能和设计有重要影响：

1. **自增整数主键**：
   - 优点：简单、高效、聚簇索引友好
   - 缺点：可能暴露业务信息、分布式环境下可能冲突

2. **UUID 主键**：
   - 优点：全局唯一、不暴露业务信息
   - 缺点：存储空间大、随机性影响插入性能

3. **业务主键**：
   - 优点：有业务含义、便于理解
   - 缺点：可能变化、复合主键复杂

**外键约束**：

外键约束可以保证引用完整性，但也带来性能开销：

**使用外键的优势**：
- 自动保证引用完整性
- 防止孤儿记录的产生
- 提供清晰的表关系文档

**不使用外键的考虑**：
- 提高插入和删除性能
- 避免锁竞争
- 便于数据库分片
- 应用层控制更灵活

**唯一约束**：

唯一约束用于保证字段值的唯一性：

```sql
-- 单字段唯一约束
ALTER TABLE users ADD UNIQUE KEY uk_email (email);

-- 复合唯一约束
ALTER TABLE user_roles ADD UNIQUE KEY uk_user_role (user_id, role_id);

-- 条件唯一约束（MySQL 8.0+）
CREATE UNIQUE INDEX uk_active_username ON users (username) WHERE is_active = 1;
```

**检查约束**：

MySQL 8.0.16 开始支持检查约束：

```sql
-- 年龄检查约束
ALTER TABLE users ADD CONSTRAINT chk_age CHECK (age >= 0 AND age <= 150);

-- 状态检查约束
ALTER TABLE orders ADD CONSTRAINT chk_status CHECK (status IN ('pending', 'paid', 'shipped', 'completed', 'cancelled'));

-- 日期检查约束
ALTER TABLE events ADD CONSTRAINT chk_dates CHECK (end_date >= start_date);
```

## 性能优化考虑

### 存储空间优化

**数据类型选择对存储的影响**：

不同数据类型的存储空间差异巨大，合理选择可以显著减少存储开销：

```sql
-- 存储空间对比示例
-- 方案1：使用较大的数据类型
CREATE TABLE users_large (
    id BIGINT,                    -- 8字节
    age INT,                      -- 4字节
    status VARCHAR(255),          -- 最多255字节 + 长度信息
    balance DOUBLE,               -- 8字节
    created_at DATETIME(6)        -- 8字节
);  -- 总计：最多283字节

-- 方案2：优化后的数据类型
CREATE TABLE users_optimized (
    id INT UNSIGNED,              -- 4字节
    age TINYINT UNSIGNED,         -- 1字节
    status TINYINT,               -- 1字节
    balance DECIMAL(10,2),        -- 5字节
    created_at TIMESTAMP          -- 4字节
);  -- 总计：15字节
```

**行大小限制**：

MySQL 的行大小限制为65,535字节，需要合理设计：

- **VARCHAR 字段总长度限制**：所有 VARCHAR 字段的最大长度总和不能超过65,535字节
- **TEXT/BLOB 字段**：不计入行大小限制，但会影响性能
- **字符集影响**：UTF8MB4 字符集中，一个字符最多占用4字节

**存储引擎差异**：

不同存储引擎对数据类型的处理有所不同：

- **InnoDB**：支持行压缩，对大字段有优化
- **MyISAM**：固定长度记录格式性能更好
- **Memory**：所有数据存储在内存中，类型选择影响内存使用

### 索引效率优化

**数据类型对索引的影响**：

1. **索引大小**：较小的数据类型创建的索引更小，查询更快
2. **比较效率**：整数比较比字符串比较更快
3. **排序性能**：数值类型的排序比字符串排序更高效

**前缀索引设计**：

对于长字符串字段，可以使用前缀索引：

```sql
-- 分析前缀长度的选择性
SELECT 
    COUNT(DISTINCT LEFT(email, 5)) / COUNT(*) AS prefix_5,
    COUNT(DISTINCT LEFT(email, 10)) / COUNT(*) AS prefix_10,
    COUNT(DISTINCT LEFT(email, 15)) / COUNT(*) AS prefix_15,
    COUNT(DISTINCT email) / COUNT(*) AS full_column
FROM users;

-- 创建前缀索引
CREATE INDEX idx_email_prefix ON users (email(10));
```

**复合索引中的字段顺序**：

字段的数据类型和选择性影响复合索引中的字段顺序：

1. **选择性高的字段在前**：能够更快过滤数据
2. **查询频率高的字段在前**：匹配更多查询模式
3. **数据类型考虑**：整数类型的比较通常比字符串快

### 查询性能优化

**类型转换的性能影响**：

隐式类型转换会影响查询性能：

```sql
-- 避免隐式类型转换
-- 不好的例子：字符串字段与数字比较
SELECT * FROM users WHERE user_id = '123';  -- 如果user_id是INT类型

-- 好的例子：类型匹配
SELECT * FROM users WHERE user_id = 123;

-- 避免在索引字段上使用函数
-- 不好的例子
SELECT * FROM orders WHERE YEAR(created_at) = 2023;

-- 好的例子
SELECT * FROM orders WHERE created_at >= '2023-01-01' AND created_at < '2024-01-01';
```

**范围查询优化**：

不同数据类型的范围查询性能差异：

1. **整数范围查询**：性能最好，索引利用率高
2. **日期范围查询**：性能良好，注意时区处理
3. **字符串范围查询**：性能相对较差，考虑前缀索引

**聚合查询优化**：

数据类型影响聚合函数的性能：

```sql
-- 数值类型的聚合查询性能更好
SELECT AVG(price) FROM products;  -- DECIMAL类型

-- 避免对字符串类型进行数值聚合
-- 不好的例子
SELECT AVG(CAST(price_str AS DECIMAL)) FROM products;

-- 好的例子：使用合适的数据类型存储
SELECT AVG(price) FROM products;  -- price字段本身就是DECIMAL类型
```

## 实际应用案例

### 用户表设计

**基础用户表设计**：

```sql
CREATE TABLE users (
    -- 主键：使用自增整数，便于性能和分页
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    
    -- 用户名：变长字符串，考虑国际化
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    
    -- 邮箱：标准长度，用于登录和通知
    email VARCHAR(255) NOT NULL UNIQUE COMMENT '邮箱地址',
    
    -- 密码哈希：固定长度，存储哈希值
    password_hash CHAR(60) NOT NULL COMMENT '密码哈希值',
    
    -- 手机号：考虑国际格式
    phone VARCHAR(20) NULL COMMENT '手机号码',
    
    -- 姓名：支持多语言字符
    full_name VARCHAR(100) NULL COMMENT '真实姓名',
    
    -- 性别：使用枚举值，节省空间
    gender ENUM('M', 'F', 'O') NULL COMMENT '性别：M-男，F-女，O-其他',
    
    -- 生日：只需要日期，不需要时间
    birth_date DATE NULL COMMENT '出生日期',
    
    -- 头像：存储文件路径，而不是二进制数据
    avatar_url VARCHAR(500) NULL COMMENT '头像URL',
    
    -- 状态：使用小整数，便于扩展
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1-正常，0-禁用，2-待验证',
    
    -- 是否验证邮箱：布尔值
    email_verified BOOLEAN NOT NULL DEFAULT FALSE COMMENT '邮箱是否已验证',
    
    -- 最后登录时间：使用TIMESTAMP自动处理时区
    last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
    
    -- 创建和更新时间：标准的审计字段
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 索引设计
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户基础信息表';
```

**设计要点说明**：

1. **主键选择**：使用自增整数主键，简单高效
2. **字符集选择**：utf8mb4 支持完整的 Unicode 字符集
3. **长度设计**：根据实际需求和标准规范确定字段长度
4. **NULL 处理**：必填字段设为 NOT NULL，可选字段允许 NULL
5. **默认值**：为状态字段设置合理默认值
6. **索引策略**：为常用查询字段创建索引

### 订单表设计

**订单主表设计**：

```sql
CREATE TABLE orders (
    -- 主键：使用自增整数
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    
    -- 订单号：业务唯一标识，便于用户查询
    order_no VARCHAR(32) NOT NULL UNIQUE COMMENT '订单号',
    
    -- 用户ID：外键关联
    user_id INT UNSIGNED NOT NULL COMMENT '用户ID',
    
    -- 订单状态：使用小整数，便于扩展和查询
    status TINYINT NOT NULL DEFAULT 1 COMMENT '订单状态：1-待付款，2-已付款，3-已发货，4-已完成，5-已取消',
    
    -- 订单类型：区分不同业务类型
    order_type TINYINT NOT NULL DEFAULT 1 COMMENT '订单类型：1-普通订单，2-预售订单，3-团购订单',
    
    -- 金额字段：使用DECIMAL确保精度
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '订单总金额',
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '优惠金额',
    shipping_fee DECIMAL(8,2) NOT NULL DEFAULT 0.00 COMMENT '运费',
    actual_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '实付金额',
    
    -- 收货信息：考虑长度和实际使用
    receiver_name VARCHAR(50) NOT NULL COMMENT '收货人姓名',
    receiver_phone VARCHAR(20) NOT NULL COMMENT '收货人电话',
    receiver_address VARCHAR(500) NOT NULL COMMENT '收货地址',
    receiver_zipcode VARCHAR(10) NULL COMMENT '邮政编码',
    
    -- 备注信息：使用TEXT存储较长文本
    buyer_note TEXT NULL COMMENT '买家备注',
    seller_note TEXT NULL COMMENT '卖家备注',
    
    -- 时间字段：记录订单生命周期
    paid_at TIMESTAMP NULL COMMENT '付款时间',
    shipped_at TIMESTAMP NULL COMMENT '发货时间',
    completed_at TIMESTAMP NULL COMMENT '完成时间',
    cancelled_at TIMESTAMP NULL COMMENT '取消时间',
    
    -- 审计字段
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 索引设计
    INDEX idx_order_no (order_no),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_user_status (user_id, status),
    
    -- 外键约束（可选）
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单主表';
```

**订单商品明细表**：

```sql
CREATE TABLE order_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    
    -- 关联订单
    order_id BIGINT UNSIGNED NOT NULL COMMENT '订单ID',
    
    -- 商品信息：冗余存储，避免商品信息变更影响历史订单
    product_id INT UNSIGNED NOT NULL COMMENT '商品ID',
    product_name VARCHAR(200) NOT NULL COMMENT '商品名称',
    product_sku VARCHAR(100) NOT NULL COMMENT '商品SKU',
    product_image VARCHAR(500) NULL COMMENT '商品图片',
    
    -- 价格和数量：使用合适的精度
    unit_price DECIMAL(10,2) NOT NULL COMMENT '单价',
    quantity SMALLINT UNSIGNED NOT NULL COMMENT '数量',
    total_price DECIMAL(10,2) NOT NULL COMMENT '小计金额',
    
    -- 商品规格：使用JSON存储灵活的规格信息
    product_specs JSON NULL COMMENT '商品规格信息',
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引设计
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id),
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单商品明细表';
```

### 商品表设计

**商品基础信息表**：

```sql
CREATE TABLE products (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    
    -- 商品编码：业务标识
    product_code VARCHAR(50) NOT NULL UNIQUE COMMENT '商品编码',
    
    -- 基础信息
    name VARCHAR(200) NOT NULL COMMENT '商品名称',
    subtitle VARCHAR(500) NULL COMMENT '商品副标题',
    description TEXT NULL COMMENT '商品描述',
    
    -- 分类信息
    category_id INT UNSIGNED NOT NULL COMMENT '分类ID',
    brand_id INT UNSIGNED NULL COMMENT '品牌ID',
    
    -- 价格信息：支持多种价格类型
    market_price DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '市场价',
    selling_price DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '销售价',
    cost_price DECIMAL(10,2) NULL COMMENT '成本价',
    
    -- 库存信息
    stock_quantity INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '库存数量',
    warning_stock INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '库存预警值',
    
    -- 商品属性：使用JSON存储灵活的属性信息
    attributes JSON NULL COMMENT '商品属性',
    
    -- 图片信息：存储多张图片的URL
    images JSON NULL COMMENT '商品图片列表',
    
    -- 重量和尺寸：用于物流计算
    weight DECIMAL(8,3) NULL COMMENT '重量(kg)',
    length DECIMAL(8,2) NULL COMMENT '长度(cm)',
    width DECIMAL(8,2) NULL COMMENT '宽度(cm)',
    height DECIMAL(8,2) NULL COMMENT '高度(cm)',
    
    -- 状态信息
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1-正常，0-下架，2-缺货',
    is_featured BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否推荐',
    
    -- 统计信息
    view_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '浏览次数',
    sale_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '销售数量',
    
    -- SEO信息
    seo_title VARCHAR(200) NULL COMMENT 'SEO标题',
    seo_keywords VARCHAR(500) NULL COMMENT 'SEO关键词',
    seo_description VARCHAR(1000) NULL COMMENT 'SEO描述',
    
    -- 时间信息
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 索引设计
    INDEX idx_product_code (product_code),
    INDEX idx_category_id (category_id),
    INDEX idx_brand_id (brand_id),
    INDEX idx_status (status),
    INDEX idx_price (selling_price),
    INDEX idx_stock (stock_quantity),
    INDEX idx_featured (is_featured),
    INDEX idx_created_at (created_at),
    
    -- 复合索引
    INDEX idx_category_status (category_id, status),
    INDEX idx_status_featured (status, is_featured),
    
    -- 全文索引（用于商品搜索）
    FULLTEXT INDEX ft_search (name, subtitle, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品基础信息表';
```

**设计亮点**：

1. **JSON 字段应用**：商品属性和图片列表使用 JSON 存储，提供灵活性
2. **价格精度**：使用 DECIMAL 确保价格计算的准确性
3. **库存管理**：包含库存数量和预警值，支持库存管理
4. **SEO 支持**：包含 SEO 相关字段，支持搜索引擎优化
5. **统计信息**：内置浏览和销售统计，便于数据分析
6. **全文索引**：支持商品名称和描述的全文搜索

## 总结

MySQL 数据类型与字段设计是数据库设计的基础，需要综合考虑业务需求、性能要求、存储效率和维护成本。

**关键设计原则**：

1. **合适性原则**：选择最适合业务需求的数据类型，避免过度设计
2. **效率原则**：在满足需求的前提下，选择存储空间最小、性能最好的类型
3. **扩展性原则**：考虑未来业务发展，为数据增长预留适当空间
4. **一致性原则**：在整个系统中保持数据类型使用的一致性
5. **可维护性原则**：选择便于理解和维护的设计方案

**实践建议**：

1. **深入理解业务**：充分了解业务需求和数据特征
2. **性能测试**：对关键字段进行性能测试，验证设计选择
3. **监控优化**：持续监控数据库性能，根据实际情况调整设计
4. **文档维护**：维护详细的数据字典和设计文档
5. **版本管理**：建立数据库结构变更的版本管理机制

通过合理的数据类型选择和字段设计，可以构建高效、稳定、可扩展的 MySQL 数据库系统，为业务发展提供坚实的数据基础。