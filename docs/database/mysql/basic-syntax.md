# MySQL 基础语法

## SQL 语言概述

SQL（Structured Query Language，结构化查询语言）是用于管理关系型数据库的标准语言。MySQL 实现了 SQL 标准的大部分功能，并在此基础上增加了一些扩展特性。

### SQL 语言的特点

1. **声明式语言**：你只需要描述想要什么结果，而不需要指定如何获得结果
   ```sql
   -- 声明式：告诉数据库你要什么
   SELECT name, age FROM users WHERE age > 18;
   
   -- 而不是过程式：告诉数据库怎么做
   -- 打开用户表
   -- 逐行检查年龄
   -- 如果年龄大于18，则返回姓名和年龄
   ```

2. **标准化**：遵循国际标准，具有良好的可移植性
   ```sql
   -- 这个查询在大多数数据库系统中都能运行
   SELECT COUNT(*) FROM products WHERE price > 100;
   ```

3. **简洁性**：语法相对简单，易于学习和使用
   ```sql
   -- 简单的查询语句就能完成复杂的数据检索
   SELECT u.name, COUNT(o.id) as order_count
   FROM users u
   LEFT JOIN orders o ON u.id = o.user_id
   GROUP BY u.id;
   ```

4. **功能强大**：能够处理复杂的数据操作和查询需求
   ```sql
   -- 复杂的业务逻辑可以通过SQL表达
   SELECT 
       product_name,
       price,
       CASE 
           WHEN price < 100 THEN '低价'
           WHEN price BETWEEN 100 AND 500 THEN '中价'
           ELSE '高价'
       END as price_category,
       ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY price DESC) as rank_in_category
   FROM products;
   ```

5. **集合操作**：基于集合理论，能够高效处理大量数据
   ```sql
   -- 集合运算：并集
   SELECT user_id FROM orders WHERE order_date >= '2023-01-01'
   UNION
   SELECT user_id FROM reviews WHERE review_date >= '2023-01-01';
   
   -- 集合运算：交集（MySQL 8.0+）
   SELECT user_id FROM orders WHERE order_date >= '2023-01-01'
   INTERSECT
   SELECT user_id FROM reviews WHERE review_date >= '2023-01-01';
   ```

## SQL 语言分类

SQL 语言按功能可以分为五大类：

### 1. 数据定义语言（DDL - Data Definition Language）

DDL 用于定义和管理数据库结构，包括数据库、表、索引、视图等对象的创建、修改和删除。

#### 主要特点：
- **结构性操作**：主要处理数据库对象的结构定义
- **持久性影响**：DDL 操作会永久改变数据库结构
- **自动提交**：大多数 DDL 操作会自动提交事务
- **权限要求**：通常需要较高的数据库权限

#### 核心命令详解：

##### CREATE - 创建数据库对象

**创建数据库：**
```sql
-- 创建数据库
CREATE DATABASE ecommerce 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS ecommerce;
```

**创建表：**
```sql
-- 创建用户表
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    birth_date DATE,
    gender ENUM('M', 'F', 'Other'),
    status TINYINT DEFAULT 1 COMMENT '1-活跃, 0-禁用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 索引定义
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 创建订单表
CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(32) NOT NULL UNIQUE,
    user_id INT UNSIGNED NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status ENUM('pending', 'paid', 'shipped', 'completed', 'cancelled') DEFAULT 'pending',
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 外键约束
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    
    -- 复合索引
    INDEX idx_user_status (user_id, status),
    INDEX idx_order_date (order_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';
```

**创建索引：**
```sql
-- 创建普通索引
CREATE INDEX idx_username ON users(username);

-- 创建唯一索引
CREATE UNIQUE INDEX uk_email ON users(email);

-- 创建复合索引
CREATE INDEX idx_name_age ON users(full_name, birth_date);

-- 创建前缀索引
CREATE INDEX idx_email_prefix ON users(email(10));

-- 创建全文索引
CREATE FULLTEXT INDEX ft_content ON articles(title, content);
```

**创建视图：**
```sql
-- 创建用户订单统计视图
CREATE VIEW user_order_stats AS
SELECT 
    u.id,
    u.username,
    u.email,
    COUNT(o.id) as total_orders,
    COALESCE(SUM(o.total_amount), 0) as total_spent,
    MAX(o.order_date) as last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.username, u.email;
```

##### ALTER - 修改数据库对象结构

**修改表结构：**
```sql
-- 添加列
ALTER TABLE users 
ADD COLUMN avatar_url VARCHAR(500) AFTER email,
ADD COLUMN last_login_at TIMESTAMP NULL;

-- 修改列定义
ALTER TABLE users 
MODIFY COLUMN phone VARCHAR(30),
CHANGE COLUMN full_name real_name VARCHAR(120);

-- 删除列
ALTER TABLE users 
DROP COLUMN avatar_url;

-- 添加索引
ALTER TABLE users 
ADD INDEX idx_phone (phone),
ADD UNIQUE KEY uk_username (username);

-- 删除索引
ALTER TABLE users 
DROP INDEX idx_phone;

-- 添加外键约束
ALTER TABLE orders 
ADD CONSTRAINT fk_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) 
ON DELETE RESTRICT ON UPDATE CASCADE;

-- 删除外键约束
ALTER TABLE orders 
DROP FOREIGN KEY fk_user_id;
```

**修改表选项：**
```sql
-- 修改表引擎
ALTER TABLE users ENGINE=MyISAM;

-- 修改字符集
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 修改表注释
ALTER TABLE users COMMENT='用户基础信息表';

-- 重置自增值
ALTER TABLE users AUTO_INCREMENT=1000;
```

##### DROP - 删除数据库对象

```sql
-- 删除索引
DROP INDEX idx_email ON users;

-- 删除视图
DROP VIEW IF EXISTS user_order_stats;

-- 删除表
DROP TABLE IF EXISTS temp_table;

-- 删除数据库
DROP DATABASE IF EXISTS old_database;
```

##### TRUNCATE - 快速清空表数据

```sql
-- 清空表数据（保留表结构）
TRUNCATE TABLE log_table;

-- TRUNCATE vs DELETE 的区别：
-- TRUNCATE: 更快，重置自增值，不能回滚，不触发触发器
-- DELETE: 较慢，保持自增值，可以回滚，触发触发器
```

#### 设计原则：
1. **命名规范**：使用有意义的名称，遵循一致的命名约定
   ```sql
   -- 好的命名
   CREATE TABLE user_profiles (
       user_id INT,
       profile_image_url VARCHAR(500),
       created_at TIMESTAMP
   );
   
   -- 避免的命名
   CREATE TABLE t1 (
       col1 INT,
       col2 VARCHAR(500),
       col3 TIMESTAMP
   );
   ```

2. **数据类型选择**：根据数据特点选择合适的数据类型
   ```sql
   CREATE TABLE products (
       id INT UNSIGNED,              -- 正整数用UNSIGNED
       price DECIMAL(10,2),          -- 金额用DECIMAL保证精度
       description TEXT,             -- 长文本用TEXT
       is_active BOOLEAN,            -- 布尔值用BOOLEAN
       category_id TINYINT UNSIGNED, -- 小范围整数用TINYINT
       created_at TIMESTAMP          -- 时间戳用TIMESTAMP
   );
   ```

3. **约束设计**：合理使用主键、外键、唯一约束等
   ```sql
   CREATE TABLE order_items (
       id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
       order_id BIGINT UNSIGNED NOT NULL,
       product_id INT UNSIGNED NOT NULL,
       quantity SMALLINT UNSIGNED NOT NULL CHECK (quantity > 0),
       unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
       
       UNIQUE KEY uk_order_product (order_id, product_id),
       FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
       FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
   );
   ```

4. **索引策略**：在创建表时考虑索引需求
   ```sql
   CREATE TABLE user_activities (
       id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
       user_id INT UNSIGNED NOT NULL,
       activity_type VARCHAR(50) NOT NULL,
       activity_data JSON,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       
       -- 为常用查询创建索引
       INDEX idx_user_id (user_id),
       INDEX idx_activity_type (activity_type),
       INDEX idx_created_at (created_at),
       INDEX idx_user_type_time (user_id, activity_type, created_at)
   );
   ```

### 2. 数据操作语言（DML - Data Manipulation Language）

DML 用于对数据库中的数据进行增删改操作，是日常数据库操作中使用最频繁的语言类型。

#### 主要特点：
- **数据操作**：专注于数据内容的处理，不涉及结构变更
- **事务性**：DML 操作通常在事务中执行，支持回滚
- **性能敏感**：大量数据操作时需要考虑性能优化
- **并发控制**：需要处理多用户同时操作的并发问题

#### 核心命令详解：

##### INSERT - 插入数据

**基本插入：**
```sql
-- 插入单条记录
INSERT INTO users (username, email, password_hash, full_name) 
VALUES ('john_doe', 'john@example.com', 'hashed_password', 'John Doe');

-- 插入多条记录（批量插入）
INSERT INTO users (username, email, password_hash, full_name) 
VALUES 
    ('alice', 'alice@example.com', 'hash1', 'Alice Smith'),
    ('bob', 'bob@example.com', 'hash2', 'Bob Johnson'),
    ('charlie', 'charlie@example.com', 'hash3', 'Charlie Brown');

-- 插入所有列（按表结构顺序）
INSERT INTO users 
VALUES (NULL, 'david', 'david@example.com', 'hash4', 'David Wilson', 
        '1990-05-15', 'M', 1, NOW(), NOW());
```

**高级插入技巧：**
```sql
-- INSERT IGNORE：忽略重复键错误
INSERT IGNORE INTO users (username, email, password_hash) 
VALUES ('existing_user', 'existing@example.com', 'hash');

-- ON DUPLICATE KEY UPDATE：遇到重复键时更新
INSERT INTO users (username, email, password_hash, full_name) 
VALUES ('john_doe', 'john@example.com', 'new_hash', 'John Doe Updated')
ON DUPLICATE KEY UPDATE 
    password_hash = VALUES(password_hash),
    full_name = VALUES(full_name),
    updated_at = NOW();

-- 从查询结果插入
INSERT INTO user_backup (id, username, email, created_at)
SELECT id, username, email, created_at 
FROM users 
WHERE created_at < '2023-01-01';

-- 使用SET语法插入
INSERT INTO users 
SET username = 'emma', 
    email = 'emma@example.com', 
    password_hash = 'hash5',
    created_at = NOW();
```

##### UPDATE - 更新数据

**基本更新：**
```sql
-- 更新单个字段
UPDATE users 
SET full_name = 'John Smith' 
WHERE username = 'john_doe';

-- 更新多个字段
UPDATE users 
SET 
    full_name = 'Alice Johnson',
    phone = '+1-555-0123',
    updated_at = NOW()
WHERE id = 2;

-- 条件更新
UPDATE users 
SET status = 0 
WHERE last_login_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);
```

**高级更新技巧：**
```sql
-- 使用表达式更新
UPDATE orders 
SET total_amount = total_amount * 1.1 
WHERE status = 'pending' AND created_at > '2024-01-01';

-- 多表关联更新
UPDATE users u
INNER JOIN (
    SELECT user_id, COUNT(*) as order_count
    FROM orders 
    GROUP BY user_id
) o ON u.id = o.user_id
SET u.total_orders = o.order_count;

-- 使用CASE WHEN进行条件更新
UPDATE users 
SET status = CASE 
    WHEN last_login_at > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1
    WHEN last_login_at > DATE_SUB(NOW(), INTERVAL 90 DAY) THEN 2
    ELSE 0
END;

-- 限制更新行数
UPDATE users 
SET status = 1 
WHERE status = 0 
ORDER BY last_login_at DESC 
LIMIT 100;
```

##### DELETE - 删除数据

**基本删除：**
```sql
-- 删除特定记录
DELETE FROM users 
WHERE username = 'john_doe';

-- 条件删除
DELETE FROM users 
WHERE status = 0 AND created_at < '2023-01-01';

-- 删除所有记录（保留表结构）
DELETE FROM temp_table;
```

**高级删除技巧：**
```sql
-- 多表关联删除
DELETE u, o 
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE u.status = 0;

-- 使用子查询删除
DELETE FROM users 
WHERE id IN (
    SELECT user_id 
    FROM (
        SELECT user_id 
        FROM orders 
        WHERE status = 'cancelled' 
        GROUP BY user_id 
        HAVING COUNT(*) > 5
    ) AS subquery
);

-- 限制删除行数
DELETE FROM log_table 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY created_at 
LIMIT 1000;
```

##### REPLACE - 替换数据（MySQL特有）

```sql
-- REPLACE：如果存在则删除后插入，不存在则直接插入
REPLACE INTO users (id, username, email, password_hash) 
VALUES (1, 'john_doe', 'john@example.com', 'new_hash');

-- 批量REPLACE
REPLACE INTO users (username, email, password_hash) 
VALUES 
    ('user1', 'user1@example.com', 'hash1'),
    ('user2', 'user2@example.com', 'hash2');
```

#### 操作策略与最佳实践：

1. **批量操作**：尽量使用批量插入、更新来提高效率
   ```sql
   -- 好的做法：批量插入
   INSERT INTO products (name, price, category_id) VALUES
       ('Product A', 19.99, 1),
       ('Product B', 29.99, 1),
       ('Product C', 39.99, 2);
   
   -- 避免：逐条插入
   INSERT INTO products (name, price, category_id) VALUES ('Product A', 19.99, 1);
   INSERT INTO products (name, price, category_id) VALUES ('Product B', 29.99, 1);
   INSERT INTO products (name, price, category_id) VALUES ('Product C', 39.99, 2);
   ```

2. **条件精确**：UPDATE 和 DELETE 操作必须使用精确的 WHERE 条件
   ```sql
   -- 危险：可能影响所有记录
   UPDATE users SET status = 0;
   
   -- 安全：使用明确条件
   UPDATE users SET status = 0 WHERE last_login_at < '2023-01-01';
   
   -- 更安全：先查询确认影响范围
   SELECT COUNT(*) FROM users WHERE last_login_at < '2023-01-01';
   UPDATE users SET status = 0 WHERE last_login_at < '2023-01-01';
   ```

3. **事务管理**：重要操作应该在事务中进行
   ```sql
   START TRANSACTION;
   
   -- 转账操作示例
   UPDATE accounts SET balance = balance - 100 WHERE id = 1;
   UPDATE accounts SET balance = balance + 100 WHERE id = 2;
   
   -- 检查操作结果
   SELECT balance FROM accounts WHERE id IN (1, 2);
   
   -- 确认无误后提交
   COMMIT;
   -- 或者发现问题时回滚
   -- ROLLBACK;
   ```

4. **性能监控**：关注操作对数据库性能的影响
   ```sql
   -- 使用EXPLAIN分析更新语句
   EXPLAIN UPDATE users SET status = 1 WHERE created_at > '2024-01-01';
   
   -- 对于大量数据操作，分批处理
   UPDATE users SET status = 1 
   WHERE created_at > '2024-01-01' 
   AND id BETWEEN 1 AND 1000;
   
   UPDATE users SET status = 1 
   WHERE created_at > '2024-01-01' 
   AND id BETWEEN 1001 AND 2000;
   ```

5. **数据完整性**：确保操作不破坏数据完整性
   ```sql
   -- 使用约束确保数据有效性
   INSERT INTO orders (user_id, total_amount, status) 
   VALUES (1, 99.99, 'pending');
   
   -- 在删除前检查依赖关系
   SELECT COUNT(*) FROM orders WHERE user_id = 1;
   -- 如果有订单，可能需要先处理订单或使用软删除
   UPDATE users SET status = 0, deleted_at = NOW() WHERE id = 1;
   ```

### 3. 数据查询语言（DQL - Data Query Language）

DQL 专门用于从数据库中检索数据，是 SQL 中最复杂也是最强大的部分。

#### 主要特点：
- **只读操作**：不会修改数据库中的数据
- **灵活性强**：支持复杂的查询条件和数据处理
- **性能关键**：查询性能直接影响应用响应速度
- **结果集处理**：可以对查询结果进行排序、分组、聚合等操作

#### 核心查询详解：

##### 基本SELECT查询

**简单查询：**
```sql
-- 查询所有列
SELECT * FROM users;

-- 查询指定列
SELECT username, email, created_at FROM users;

-- 使用别名
SELECT 
    username AS '用户名',
    email AS '邮箱地址',
    created_at AS '注册时间'
FROM users;

-- 查询常量和表达式
SELECT 
    username,
    'VIP' AS user_type,
    YEAR(created_at) AS register_year,
    DATEDIFF(NOW(), created_at) AS days_since_register
FROM users;
```

**去重查询：**
```sql
-- 去除重复记录
SELECT DISTINCT status FROM users;

-- 多列去重
SELECT DISTINCT status, gender FROM users;

-- 统计不重复值的数量
SELECT COUNT(DISTINCT email) AS unique_emails FROM users;
```

##### WHERE条件查询

**基本条件：**
```sql
-- 等值查询
SELECT * FROM users WHERE status = 1;

-- 不等值查询
SELECT * FROM users WHERE status != 0;
SELECT * FROM users WHERE status <> 0;

-- 范围查询
SELECT * FROM orders WHERE total_amount BETWEEN 100 AND 500;
SELECT * FROM users WHERE created_at >= '2024-01-01';

-- NULL值查询
SELECT * FROM users WHERE phone IS NULL;
SELECT * FROM users WHERE phone IS NOT NULL;
```

**模糊查询：**
```sql
-- LIKE模糊匹配
SELECT * FROM users WHERE username LIKE 'john%';     -- 以john开头
SELECT * FROM users WHERE username LIKE '%smith';   -- 以smith结尾
SELECT * FROM users WHERE username LIKE '%admin%';  -- 包含admin
SELECT * FROM users WHERE username LIKE 'user_';    -- user_后跟一个字符

-- 正则表达式匹配
SELECT * FROM users WHERE username REGEXP '^[a-z]+[0-9]+$';

-- 全文搜索（需要全文索引）
SELECT * FROM articles 
WHERE MATCH(title, content) AGAINST('MySQL 教程' IN NATURAL LANGUAGE MODE);
```

**逻辑条件：**
```sql
-- AND条件
SELECT * FROM users 
WHERE status = 1 AND gender = 'M' AND created_at > '2024-01-01';

-- OR条件
SELECT * FROM users 
WHERE status = 0 OR last_login_at < '2023-01-01';

-- 复合条件
SELECT * FROM users 
WHERE (status = 1 OR status = 2) AND gender = 'F';

-- IN条件
SELECT * FROM users WHERE id IN (1, 3, 5, 7, 9);
SELECT * FROM users WHERE status IN ('active', 'pending');

-- NOT IN条件
SELECT * FROM users WHERE id NOT IN (1, 2, 3);
```

##### 排序和分页

**ORDER BY排序：**
```sql
-- 单列排序
SELECT * FROM users ORDER BY created_at DESC;
SELECT * FROM users ORDER BY username ASC;

-- 多列排序
SELECT * FROM users 
ORDER BY status DESC, created_at ASC;

-- 使用表达式排序
SELECT username, email, created_at
FROM users 
ORDER BY CHAR_LENGTH(username), created_at DESC;

-- 自定义排序
SELECT * FROM orders 
ORDER BY FIELD(status, 'pending', 'paid', 'shipped', 'completed');
```

**LIMIT分页：**
```sql
-- 限制结果数量
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;

-- 分页查询
SELECT * FROM users ORDER BY id LIMIT 20 OFFSET 40;  -- 第3页，每页20条
SELECT * FROM users ORDER BY id LIMIT 40, 20;       -- MySQL特有语法

-- 获取最新的5个用户
SELECT * FROM users ORDER BY created_at DESC LIMIT 5;
```

##### 聚合函数和分组

**聚合函数：**
```sql
-- 基本聚合函数
SELECT 
    COUNT(*) AS total_users,
    COUNT(phone) AS users_with_phone,
    AVG(YEAR(NOW()) - YEAR(birth_date)) AS avg_age,
    MIN(created_at) AS first_register,
    MAX(created_at) AS last_register
FROM users;

-- 条件聚合
SELECT 
    COUNT(CASE WHEN status = 1 THEN 1 END) AS active_users,
    COUNT(CASE WHEN status = 0 THEN 1 END) AS inactive_users,
    SUM(CASE WHEN gender = 'M' THEN 1 ELSE 0 END) AS male_count
FROM users;
```

**GROUP BY分组：**
```sql
-- 基本分组
SELECT status, COUNT(*) AS user_count
FROM users 
GROUP BY status;

-- 多列分组
SELECT status, gender, COUNT(*) AS count
FROM users 
GROUP BY status, gender
ORDER BY status, gender;

-- 分组后排序
SELECT 
    YEAR(created_at) AS register_year,
    COUNT(*) AS user_count
FROM users 
GROUP BY YEAR(created_at)
ORDER BY register_year DESC;
```

**HAVING条件：**
```sql
-- 分组后筛选
SELECT status, COUNT(*) AS user_count
FROM users 
GROUP BY status
HAVING COUNT(*) > 100;

-- 复杂HAVING条件
SELECT 
    user_id,
    COUNT(*) AS order_count,
    SUM(total_amount) AS total_spent
FROM orders 
GROUP BY user_id
HAVING COUNT(*) >= 5 AND SUM(total_amount) > 1000
ORDER BY total_spent DESC;
```

## 查询组件详解

### WHERE 子句

WHERE 子句用于过滤记录，只返回满足条件的行。

#### 比较操作符详解：

**基本比较操作：**
```sql
-- 等于
SELECT * FROM users WHERE age = 25;
SELECT * FROM products WHERE status = 'active';

-- 不等于
SELECT * FROM users WHERE age != 25;
SELECT * FROM users WHERE age <> 25;

-- 大小比较
SELECT * FROM products WHERE price > 100;
SELECT * FROM users WHERE created_at >= '2024-01-01';
SELECT * FROM orders WHERE total_amount <= 1000;
```

**范围和列表操作：**
```sql
-- BETWEEN：范围查询
SELECT * FROM users WHERE age BETWEEN 18 AND 65;
SELECT * FROM orders WHERE order_date BETWEEN '2024-01-01' AND '2024-12-31';
SELECT * FROM products WHERE price BETWEEN 50.00 AND 200.00;

-- IN：列表匹配
SELECT * FROM users WHERE city IN ('北京', '上海', '广州', '深圳');
SELECT * FROM products WHERE category_id IN (1, 3, 5, 7);
SELECT * FROM orders WHERE status IN ('pending', 'processing', 'shipped');

-- NOT IN：排除列表
SELECT * FROM users WHERE city NOT IN ('北京', '上海');
SELECT * FROM products WHERE id NOT IN (SELECT product_id FROM discontinued_products);
```

**模式匹配：**
```sql
-- LIKE：模式匹配
SELECT * FROM users WHERE username LIKE 'admin%';     -- 以admin开头
SELECT * FROM users WHERE email LIKE '%@gmail.com';  -- 以@gmail.com结尾
SELECT * FROM products WHERE name LIKE '%手机%';      -- 包含"手机"
SELECT * FROM users WHERE phone LIKE '138________';  -- 138开头的11位号码

-- REGEXP：正则表达式匹配
SELECT * FROM users WHERE email REGEXP '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$';
SELECT * FROM products WHERE sku REGEXP '^[A-Z]{2}[0-9]{4}$';
```

**空值处理：**
```sql
-- IS NULL：查找空值
SELECT * FROM users WHERE phone IS NULL;
SELECT * FROM orders WHERE shipped_date IS NULL;

-- IS NOT NULL：查找非空值
SELECT * FROM users WHERE email IS NOT NULL;
SELECT * FROM products WHERE description IS NOT NULL;

-- COALESCE：处理空值
SELECT username, COALESCE(phone, '未提供') as phone_display FROM users;
```

#### 逻辑操作符详解：

```sql
-- AND：所有条件都必须满足
SELECT * FROM users 
WHERE age >= 18 
  AND city = '北京' 
  AND status = 'active';

-- OR：任一条件满足即可
SELECT * FROM products 
WHERE category = '电子产品' 
   OR category = '数码配件' 
   OR price < 100;

-- NOT：否定条件
SELECT * FROM users WHERE NOT (age < 18 OR status = 'inactive');

-- 复杂逻辑组合
SELECT * FROM orders 
WHERE (status = 'pending' OR status = 'processing') 
  AND total_amount > 500 
  AND (payment_method = '支付宝' OR payment_method = '微信支付');

-- 使用括号控制优先级
SELECT * FROM products 
WHERE (category = '服装' AND price > 200) 
   OR (category = '鞋类' AND price > 300);
```

### ORDER BY 子句

ORDER BY 用于对结果集进行排序。

#### 基本排序：

```sql
-- 单字段排序
SELECT * FROM users ORDER BY age;           -- 默认升序
SELECT * FROM users ORDER BY age ASC;       -- 明确指定升序
SELECT * FROM users ORDER BY age DESC;      -- 降序
SELECT * FROM products ORDER BY price DESC; -- 按价格降序

-- 多字段排序
SELECT * FROM users 
ORDER BY city ASC, age DESC, username ASC;

SELECT * FROM orders 
ORDER BY status, order_date DESC, total_amount DESC;
```

#### 高级排序：

```sql
-- 按表达式排序
SELECT *, (price * discount) as final_price 
FROM products 
ORDER BY final_price DESC;

-- 按函数结果排序
SELECT * FROM users ORDER BY CHAR_LENGTH(username) DESC;
SELECT * FROM orders ORDER BY YEAR(order_date), MONTH(order_date);

-- 条件排序（CASE WHEN）
SELECT * FROM orders 
ORDER BY 
  CASE status 
    WHEN 'urgent' THEN 1
    WHEN 'processing' THEN 2
    WHEN 'pending' THEN 3
    ELSE 4
  END,
  order_date DESC;

-- 自定义排序顺序
SELECT * FROM products 
ORDER BY FIELD(category, '热销', '新品', '促销', '普通');

-- NULL值排序控制
SELECT * FROM users ORDER BY phone IS NULL, phone;  -- NULL值排在最后
SELECT * FROM users ORDER BY phone IS NOT NULL DESC, phone; -- NULL值排在最前
```

### GROUP BY 子句

GROUP BY 用于将结果集按一个或多个字段进行分组。

#### 基本分组：

```sql
-- 单字段分组
SELECT city, COUNT(*) as user_count 
FROM users 
GROUP BY city;

SELECT category, AVG(price) as avg_price 
FROM products 
GROUP BY category;

-- 多字段分组
SELECT city, gender, COUNT(*) as count 
FROM users 
GROUP BY city, gender;

SELECT 
  YEAR(order_date) as year,
  MONTH(order_date) as month,
  COUNT(*) as order_count,
  SUM(total_amount) as total_sales
FROM orders 
GROUP BY YEAR(order_date), MONTH(order_date);
```

#### 聚合函数应用：

```sql
-- 常用聚合函数
SELECT 
  category,
  COUNT(*) as product_count,           -- 计数
  AVG(price) as avg_price,            -- 平均值
  MIN(price) as min_price,            -- 最小值
  MAX(price) as max_price,            -- 最大值
  SUM(stock) as total_stock,          -- 求和
  STDDEV(price) as price_stddev       -- 标准差
FROM products 
GROUP BY category;

-- 字符串聚合
SELECT 
  category,
  GROUP_CONCAT(name ORDER BY price DESC SEPARATOR '; ') as products
FROM products 
GROUP BY category;

-- 条件聚合
SELECT 
  city,
  COUNT(*) as total_users,
  COUNT(CASE WHEN age >= 18 THEN 1 END) as adult_users,
  COUNT(CASE WHEN gender = 'M' THEN 1 END) as male_users,
  AVG(CASE WHEN status = 'active' THEN age END) as avg_active_age
FROM users 
GROUP BY city;
```

#### WITH ROLLUP：

```sql
-- 生成小计和总计
SELECT 
  category,
  subcategory,
  COUNT(*) as product_count,
  SUM(price) as total_value
FROM products 
GROUP BY category, subcategory WITH ROLLUP;

-- 销售报表示例
SELECT 
  YEAR(order_date) as year,
  QUARTER(order_date) as quarter,
  SUM(total_amount) as sales
FROM orders 
GROUP BY YEAR(order_date), QUARTER(order_date) WITH ROLLUP;
```

### HAVING 子句

HAVING 用于过滤分组后的结果，类似于 WHERE，但作用于分组。

#### 基本用法：

```sql
-- 过滤分组结果
SELECT city, COUNT(*) as user_count 
FROM users 
GROUP BY city 
HAVING COUNT(*) > 100;  -- 只显示用户数超过100的城市

SELECT category, AVG(price) as avg_price 
FROM products 
GROUP BY category 
HAVING AVG(price) > 500;  -- 只显示平均价格超过500的分类
```

#### 复杂HAVING条件：

```sql
-- 多个聚合条件
SELECT 
  category,
  COUNT(*) as product_count,
  AVG(price) as avg_price,
  MAX(price) as max_price
FROM products 
GROUP BY category 
HAVING COUNT(*) >= 5 
   AND AVG(price) > 100 
   AND MAX(price) < 1000;

-- 使用逻辑操作符
SELECT 
  city,
  COUNT(*) as user_count,
  AVG(age) as avg_age
FROM users 
GROUP BY city 
HAVING (COUNT(*) > 50 AND AVG(age) > 25) 
    OR (COUNT(*) > 100);

-- 结合WHERE和HAVING
SELECT 
  category,
  COUNT(*) as active_product_count,
  AVG(price) as avg_price
FROM products 
WHERE status = 'active'  -- 先过滤记录
GROUP BY category 
HAVING COUNT(*) > 10     -- 再过滤分组
   AND AVG(price) BETWEEN 100 AND 1000;
```

#### 执行顺序说明：

```sql
-- SQL执行顺序示例
SELECT 
  category,                    -- 5. 选择字段
  COUNT(*) as product_count,   -- 5. 计算聚合
  AVG(price) as avg_price      -- 5. 计算聚合
FROM products                  -- 1. 确定数据源
WHERE status = 'active'        -- 2. 过滤行
GROUP BY category              -- 3. 分组
HAVING COUNT(*) > 5            -- 4. 过滤分组
ORDER BY avg_price DESC        -- 6. 排序
LIMIT 10;                      -- 7. 限制结果数量

/*
执行顺序：
1. FROM - 确定数据源
2. WHERE - 过滤原始数据行
3. GROUP BY - 对数据进行分组
4. HAVING - 过滤分组后的结果
5. SELECT - 选择和计算字段
6. ORDER BY - 对结果排序
7. LIMIT - 限制返回的行数
*/
```

## 连接查询详解

连接查询用于从多个表中获取相关数据，是SQL中最重要的功能之一。

### 内连接（INNER JOIN）

内连接只返回两个表中都存在匹配的记录，是最常用的连接类型。

#### 基本语法：

```sql
-- 标准语法
SELECT columns
FROM table1
INNER JOIN table2 ON table1.column = table2.column;

-- 简化语法（隐式连接）
SELECT columns
FROM table1, table2
WHERE table1.column = table2.column;
```

#### 实际应用示例：

```sql
-- 查询用户及其订单信息
SELECT 
    u.username,
    u.email,
    o.order_id,
    o.total_amount,
    o.order_date
FROM users u
INNER JOIN orders o ON u.user_id = o.user_id;

-- 查询商品及其分类信息
SELECT 
    p.product_name,
    p.price,
    c.category_name,
    c.description as category_desc
FROM products p
INNER JOIN categories c ON p.category_id = c.category_id
WHERE p.status = 'active';

-- 多表连接
SELECT 
    u.username,
    o.order_id,
    oi.product_id,
    p.product_name,
    oi.quantity,
    oi.unit_price
FROM users u
INNER JOIN orders o ON u.user_id = o.user_id
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
WHERE o.order_date >= '2024-01-01';
```

### 左外连接（LEFT JOIN）

左外连接返回左表的所有记录，以及右表中匹配的记录。如果右表没有匹配，则显示 NULL。

```sql
-- 查询所有用户及其订单（包括没有订单的用户）
SELECT 
    u.user_id,
    u.username,
    u.email,
    o.order_id,
    o.total_amount,
    o.order_date
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id;

-- 查询所有分类及其商品数量（包括没有商品的分类）
SELECT 
    c.category_name,
    COUNT(p.product_id) as product_count,
    COALESCE(AVG(p.price), 0) as avg_price
FROM categories c
LEFT JOIN products p ON c.category_id = p.category_id
GROUP BY c.category_id, c.category_name;

-- 查找没有订单的用户
SELECT 
    u.user_id,
    u.username,
    u.email
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
WHERE o.order_id IS NULL;
```

### 右外连接（RIGHT JOIN）

右外连接返回右表的所有记录，以及左表中匹配的记录。如果左表没有匹配，则显示 NULL。

```sql
-- 查询所有订单及其用户信息（包括可能的孤立订单）
SELECT 
    u.username,
    u.email,
    o.order_id,
    o.total_amount,
    o.order_date
FROM users u
RIGHT JOIN orders o ON u.user_id = o.user_id;

-- 查询所有商品及其分类（包括可能的孤立商品）
SELECT 
    p.product_name,
    p.price,
    c.category_name
FROM categories c
RIGHT JOIN products p ON c.category_id = p.category_id;
```

### 全外连接（FULL OUTER JOIN）

MySQL 不直接支持 FULL OUTER JOIN，但可以通过 UNION 实现。

```sql
-- 使用UNION模拟全外连接
SELECT 
    u.user_id,
    u.username,
    o.order_id,
    o.total_amount
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id

UNION

SELECT 
    u.user_id,
    u.username,
    o.order_id,
    o.total_amount
FROM users u
RIGHT JOIN orders o ON u.user_id = o.user_id
WHERE u.user_id IS NULL;

-- 更简洁的写法（MySQL 8.0+）
SELECT 
    COALESCE(u.user_id, o.user_id) as user_id,
    u.username,
    o.order_id,
    o.total_amount
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id

UNION ALL

SELECT 
    o.user_id,
    NULL as username,
    o.order_id,
    o.total_amount
FROM orders o
LEFT JOIN users u ON o.user_id = u.user_id
WHERE u.user_id IS NULL;
```

### 交叉连接（CROSS JOIN）

交叉连接返回两个表的笛卡尔积，每个左表记录与每个右表记录组合。

```sql
-- 基本交叉连接
SELECT 
    u.username,
    p.product_name,
    p.price
FROM users u
CROSS JOIN products p
WHERE u.city = '北京' AND p.category_id = 1;

-- 生成所有可能的组合
SELECT 
    s.size_name,
    c.color_name,
    CONCAT(s.size_name, '-', c.color_name) as variant
FROM sizes s
CROSS JOIN colors c;

-- 生成日期序列与产品的组合
SELECT 
    d.date,
    p.product_id,
    p.product_name
FROM (
    SELECT DATE('2024-01-01') + INTERVAL n DAY as date
    FROM (
        SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
        UNION SELECT 4 UNION SELECT 5 UNION SELECT 6
    ) numbers
) d
CROSS JOIN products p
WHERE p.status = 'active';
```

### 自连接（Self JOIN）

自连接是表与自身进行连接，通常用于处理层次结构数据。

```sql
-- 查询员工及其直接上级
SELECT 
    e1.employee_id,
    e1.employee_name,
    e1.position,
    e2.employee_name as manager_name,
    e2.position as manager_position
FROM employees e1
LEFT JOIN employees e2 ON e1.manager_id = e2.employee_id;

-- 查询同一部门的员工对比
SELECT 
    e1.employee_name as employee1,
    e2.employee_name as employee2,
    e1.department,
    e1.salary as salary1,
    e2.salary as salary2
FROM employees e1
INNER JOIN employees e2 ON e1.department = e2.department
WHERE e1.employee_id < e2.employee_id  -- 避免重复和自己与自己比较
  AND ABS(e1.salary - e2.salary) < 5000;

-- 查询分类的层次结构
SELECT 
    c1.category_id,
    c1.category_name,
    c1.level,
    c2.category_name as parent_category
FROM categories c1
LEFT JOIN categories c2 ON c1.parent_id = c2.category_id
ORDER BY c1.level, c1.category_name;

-- 查找相似价格的商品
SELECT 
    p1.product_name as product1,
    p1.price as price1,
    p2.product_name as product2,
    p2.price as price2,
    ABS(p1.price - p2.price) as price_diff
FROM products p1
INNER JOIN products p2 ON p1.category_id = p2.category_id
WHERE p1.product_id < p2.product_id
  AND ABS(p1.price - p2.price) <= 50
ORDER BY price_diff;
```

### 复杂连接查询示例

#### 1. 电商订单分析

```sql
-- 查询用户的完整订单信息
SELECT 
    u.username,
    u.email,
    o.order_id,
    o.order_date,
    o.status as order_status,
    COUNT(oi.item_id) as item_count,
    SUM(oi.quantity * oi.unit_price) as calculated_total,
    o.total_amount,
    GROUP_CONCAT(
        CONCAT(p.product_name, '(', oi.quantity, ')')
        ORDER BY oi.item_id
        SEPARATOR ', '
    ) as order_items
FROM users u
INNER JOIN orders o ON u.user_id = o.user_id
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
WHERE o.order_date >= '2024-01-01'
GROUP BY u.user_id, o.order_id
HAVING item_count > 1
ORDER BY o.order_date DESC;
```

#### 2. 库存和销售分析

```sql
-- 分析商品的库存和销售情况
SELECT 
    c.category_name,
    p.product_name,
    p.stock as current_stock,
    COALESCE(sales.total_sold, 0) as total_sold,
    COALESCE(sales.total_revenue, 0) as total_revenue,
    COALESCE(sales.avg_price, p.price) as avg_selling_price,
    p.price as current_price,
    CASE 
        WHEN p.stock = 0 THEN '缺货'
        WHEN p.stock < 10 THEN '库存不足'
        WHEN p.stock < 50 THEN '库存正常'
        ELSE '库存充足'
    END as stock_status
FROM categories c
INNER JOIN products p ON c.category_id = p.category_id
LEFT JOIN (
    SELECT 
        oi.product_id,
        SUM(oi.quantity) as total_sold,
        SUM(oi.quantity * oi.unit_price) as total_revenue,
        AVG(oi.unit_price) as avg_price
    FROM order_items oi
    INNER JOIN orders o ON oi.order_id = o.order_id
    WHERE o.status = 'completed'
      AND o.order_date >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
    GROUP BY oi.product_id
) sales ON p.product_id = sales.product_id
WHERE p.status = 'active'
ORDER BY c.category_name, total_revenue DESC;
```

#### 3. 用户行为分析

```sql
-- 分析用户的购买行为和偏好
SELECT 
    u.user_id,
    u.username,
    u.registration_date,
    profile.order_count,
    profile.total_spent,
    profile.avg_order_value,
    profile.favorite_category,
    profile.last_order_date,
    DATEDIFF(NOW(), profile.last_order_date) as days_since_last_order,
    CASE 
        WHEN profile.total_spent > 10000 THEN 'VIP客户'
        WHEN profile.total_spent > 5000 THEN '重要客户'
        WHEN profile.total_spent > 1000 THEN '普通客户'
        ELSE '新客户'
    END as customer_level
FROM users u
LEFT JOIN (
    SELECT 
        o.user_id,
        COUNT(o.order_id) as order_count,
        SUM(o.total_amount) as total_spent,
        AVG(o.total_amount) as avg_order_value,
        MAX(o.order_date) as last_order_date,
        (
            SELECT c.category_name
            FROM order_items oi2
            INNER JOIN orders o2 ON oi2.order_id = o2.order_id
            INNER JOIN products p2 ON oi2.product_id = p2.product_id
            INNER JOIN categories c ON p2.category_id = c.category_id
            WHERE o2.user_id = o.user_id
            GROUP BY c.category_id
            ORDER BY SUM(oi2.quantity) DESC
            LIMIT 1
        ) as favorite_category
    FROM orders o
    WHERE o.status = 'completed'
    GROUP BY o.user_id
) profile ON u.user_id = profile.user_id
ORDER BY profile.total_spent DESC;
```

### 连接查询优化技巧

#### 1. 使用适当的索引

```sql
-- 确保连接字段有索引
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- 复合索引优化多字段连接
CREATE INDEX idx_orders_user_date ON orders(user_id, order_date);
```

#### 2. 使用表别名简化查询

```sql
-- 使用有意义的别名
SELECT 
    usr.username,
    ord.order_date,
    prd.product_name
FROM users usr
INNER JOIN orders ord ON usr.user_id = ord.user_id
INNER JOIN order_items itm ON ord.order_id = itm.order_id
INNER JOIN products prd ON itm.product_id = prd.product_id;
```

#### 3. 合理使用WHERE条件

```sql
-- 在连接前过滤数据
SELECT 
    u.username,
    o.order_id,
    o.total_amount
FROM users u
INNER JOIN (
    SELECT * FROM orders 
    WHERE order_date >= '2024-01-01' 
      AND status = 'completed'
) o ON u.user_id = o.user_id
WHERE u.status = 'active';
```

##### 子查询

**标量子查询：**
```sql
-- 返回单个值的子查询
SELECT username, email
FROM users 
WHERE created_at = (SELECT MAX(created_at) FROM users);

-- 在SELECT中使用子查询
SELECT 
    username,
    email,
    (SELECT COUNT(*) FROM orders WHERE user_id = users.id) AS order_count
FROM users;
```

**列表子查询：**
```sql
-- IN子查询
SELECT * FROM users 
WHERE id IN (
    SELECT DISTINCT user_id 
    FROM orders 
    WHERE total_amount > 500
);

-- EXISTS子查询
SELECT * FROM users u
WHERE EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.user_id = u.id AND o.status = 'completed'
);

-- NOT EXISTS子查询
SELECT * FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.user_id = u.id
);
```

**表子查询：**
```sql
-- 在FROM中使用子查询
SELECT 
    avg_order.user_id,
    avg_order.avg_amount,
    u.username
FROM (
    SELECT 
        user_id, 
        AVG(total_amount) AS avg_amount
    FROM orders 
    GROUP BY user_id
    HAVING AVG(total_amount) > 200
) AS avg_order
JOIN users u ON avg_order.user_id = u.id;
```

##### 窗口函数（MySQL 8.0+）

```sql
-- ROW_NUMBER：行号
SELECT 
    username,
    created_at,
    ROW_NUMBER() OVER (ORDER BY created_at) AS row_num
FROM users;

-- RANK：排名
SELECT 
    user_id,
    total_amount,
    RANK() OVER (ORDER BY total_amount DESC) AS amount_rank
FROM orders;

-- 分区窗口函数
SELECT 
    user_id,
    order_date,
    total_amount,
    SUM(total_amount) OVER (
        PARTITION BY user_id 
        ORDER BY order_date 
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
FROM orders;
```

##### 集合操作

**UNION：**
```sql
-- 合并查询结果
SELECT username, email FROM users WHERE status = 1
UNION
SELECT username, email FROM users WHERE created_at > '2024-01-01';

-- UNION ALL：包含重复记录
SELECT user_id FROM orders WHERE order_date >= '2024-01-01'
UNION ALL
SELECT user_id FROM reviews WHERE review_date >= '2024-01-01';
```

#### 查询优化策略：

1. **索引优化**：确保查询条件能够有效使用索引
   ```sql
   -- 好的做法：使用索引列作为查询条件
   SELECT * FROM users WHERE email = 'john@example.com';
   
   -- 避免：在索引列上使用函数
   SELECT * FROM users WHERE UPPER(email) = 'JOHN@EXAMPLE.COM';
   
   -- 改进：使用函数索引或调整查询
   SELECT * FROM users WHERE email = LOWER('JOHN@EXAMPLE.COM');
   ```

2. **条件优化**：将选择性高的条件放在前面
   ```sql
   -- 好的做法：选择性高的条件在前
   SELECT * FROM users 
   WHERE email = 'specific@example.com' AND status = 1;
   
   -- 避免：选择性低的条件在前
   SELECT * FROM users 
   WHERE status = 1 AND email = 'specific@example.com';
   ```

3. **字段选择**：只查询需要的字段，避免使用 SELECT *
   ```sql
   -- 好的做法：明确指定需要的字段
   SELECT id, username, email FROM users WHERE status = 1;
   
   -- 避免：查询所有字段
   SELECT * FROM users WHERE status = 1;
   ```

4. **连接优化**：合理使用不同类型的 JOIN
   ```sql
   -- 使用适当的JOIN类型
   SELECT u.username, COUNT(o.id) as order_count
   FROM users u
   LEFT JOIN orders o ON u.id = o.user_id
   GROUP BY u.id, u.username;
   
   -- 避免笛卡尔积
   SELECT u.username, o.order_no
   FROM users u, orders o
   WHERE u.id = o.user_id;  -- 确保有连接条件
   ```

### 4. 数据控制语言（DCL - Data Control Language）

DCL 用于控制数据库的访问权限和安全性，主要涉及用户权限的管理。

#### 主要特点：
- **安全管理**：控制用户对数据库对象的访问权限
- **权限粒度**：可以精细控制到表、列、操作级别
- **用户管理**：创建和管理数据库用户
- **即时生效**：权限变更通常立即生效

#### 核心命令详解：

##### 用户管理

**创建用户：**
```sql
-- 创建基本用户
CREATE USER 'username'@'localhost' IDENTIFIED BY 'password';

-- 创建用户并指定认证插件
CREATE USER 'username'@'192.168.1.%' IDENTIFIED WITH mysql_native_password BY 'password';

-- 创建用户并设置密码过期策略
CREATE USER 'username'@'%' 
IDENTIFIED BY 'password' 
PASSWORD EXPIRE INTERVAL 90 DAY;

-- 创建用户并设置账户锁定策略
CREATE USER 'username'@'localhost' 
IDENTIFIED BY 'password' 
ACCOUNT LOCK;
```

**修改用户：**
```sql
-- 修改用户密码
ALTER USER 'username'@'localhost' IDENTIFIED BY 'new_password';

-- 修改用户认证插件
ALTER USER 'username'@'localhost' IDENTIFIED WITH caching_sha2_password BY 'password';

-- 解锁用户账户
ALTER USER 'username'@'localhost' ACCOUNT UNLOCK;

-- 重命名用户
RENAME USER 'old_username'@'localhost' TO 'new_username'@'localhost';
```

**删除用户：**
```sql
-- 删除单个用户
DROP USER 'username'@'localhost';

-- 删除多个用户
DROP USER 'user1'@'localhost', 'user2'@'%';
```

##### 权限管理

**授予权限：**
```sql
-- 授予特定表的权限
GRANT SELECT, INSERT, UPDATE ON database_name.table_name TO 'username'@'localhost';

-- 授予特定数据库的所有权限
GRANT ALL PRIVILEGES ON database_name.* TO 'username'@'localhost';

-- 授予所有数据库的所有权限（超级用户）
GRANT ALL PRIVILEGES ON *.* TO 'admin'@'localhost' WITH GRANT OPTION;

-- 授予特定列的权限
GRANT SELECT (id, username, email), UPDATE (email, phone) 
ON database_name.users TO 'username'@'localhost';

-- 授予存储过程的执行权限
GRANT EXECUTE ON PROCEDURE database_name.procedure_name TO 'username'@'localhost';
```

**撤销权限：**
```sql
-- 撤销特定表的权限
REVOKE INSERT, UPDATE ON database_name.table_name FROM 'username'@'localhost';

-- 撤销特定数据库的所有权限
REVOKE ALL PRIVILEGES ON database_name.* FROM 'username'@'localhost';

-- 撤销授权权限
REVOKE GRANT OPTION ON database_name.* FROM 'username'@'localhost';
```

**查看权限：**
```sql
-- 查看当前用户权限
SHOW GRANTS;

-- 查看特定用户权限
SHOW GRANTS FOR 'username'@'localhost';

-- 查看所有用户
SELECT user, host FROM mysql.user;

-- 查看权限详情
SELECT * FROM information_schema.user_privileges WHERE grantee LIKE "'username'%";
```

##### 角色管理（MySQL 8.0+）

```sql
-- 创建角色
CREATE ROLE 'app_read', 'app_write', 'app_admin';

-- 为角色授权
GRANT SELECT ON app_db.* TO 'app_read';
GRANT INSERT, UPDATE, DELETE ON app_db.* TO 'app_write';
GRANT ALL PRIVILEGES ON app_db.* TO 'app_admin';

-- 将角色分配给用户
GRANT 'app_read' TO 'reader'@'localhost';
GRANT 'app_write', 'app_read' TO 'editor'@'localhost';
GRANT 'app_admin' TO 'admin'@'localhost';

-- 激活角色
SET ROLE 'app_read';
SET ROLE ALL;  -- 激活所有被授予的角色

-- 设置默认角色
SET DEFAULT ROLE 'app_read' TO 'reader'@'localhost';
SET DEFAULT ROLE ALL TO 'editor'@'localhost';

-- 撤销角色
REVOKE 'app_write' FROM 'editor'@'localhost';

-- 删除角色
DROP ROLE 'app_read', 'app_write', 'app_admin';
```

#### 权限管理策略与最佳实践：

1. **最小权限原则**：只授予必要的权限
   ```sql
   -- 好的做法：只授予应用所需的最小权限
   CREATE USER 'app_user'@'%' IDENTIFIED BY 'password';
   GRANT SELECT, INSERT, UPDATE ON app_db.users TO 'app_user'@'%';
   GRANT SELECT ON app_db.products TO 'app_user'@'%';
   
   -- 避免：授予过多权限
   GRANT ALL PRIVILEGES ON app_db.* TO 'app_user'@'%';
   ```

2. **角色分离**：不同角色使用不同账户
   ```sql
   -- 创建只读用户
   CREATE USER 'app_readonly'@'%' IDENTIFIED BY 'password';
   GRANT SELECT ON app_db.* TO 'app_readonly'@'%';
   
   -- 创建读写用户
   CREATE USER 'app_readwrite'@'%' IDENTIFIED BY 'password';
   GRANT SELECT, INSERT, UPDATE, DELETE ON app_db.* TO 'app_readwrite'@'%';
   
   -- 创建管理员用户
   CREATE USER 'app_admin'@'localhost' IDENTIFIED BY 'password';
   GRANT ALL PRIVILEGES ON app_db.* TO 'app_admin'@'localhost';
   ```

3. **定期审计**：定期检查和更新权限设置
   ```sql
   -- 查看所有用户及其权限
   SELECT user, host FROM mysql.user;
   
   -- 对每个用户执行
   SHOW GRANTS FOR 'username'@'host';
   
   -- 撤销不必要的权限
   REVOKE INSERT, UPDATE, DELETE ON app_db.logs FROM 'app_user'@'%';
   ```

4. **密码策略**：实施强密码策略
   ```sql
   -- 设置密码过期策略
   ALTER USER 'username'@'localhost' PASSWORD EXPIRE INTERVAL 90 DAY;
   
   -- 设置密码历史策略
   ALTER USER 'username'@'localhost' PASSWORD HISTORY 5;
   
   -- 设置密码重用策略
   ALTER USER 'username'@'localhost' PASSWORD REUSE INTERVAL 365 DAY;
   
   -- 设置密码强度策略
   ALTER USER 'username'@'localhost' 
   IDENTIFIED BY 'StrongP@ssw0rd' 
   PASSWORD REQUIRE CURRENT;
   ```

5. **网络安全**：限制连接来源
   ```sql
   -- 限制用户只能从特定IP连接
   CREATE USER 'app_user'@'192.168.1.10' IDENTIFIED BY 'password';
   
   -- 限制用户只能从特定网段连接
   CREATE USER 'app_user'@'192.168.1.%' IDENTIFIED BY 'password';
   
   -- 限制用户只能从本地连接
   CREATE USER 'admin'@'localhost' IDENTIFIED BY 'password';
   ```

### 5. 事务控制语言（TCL - Transaction Control Language）

TCL 用于管理数据库事务，确保数据的一致性和完整性。

#### 主要特点：
- **原子性**：事务中的操作要么全部成功，要么全部失败
- **一致性**：事务执行前后数据库状态保持一致
- **隔离性**：并发事务之间相互隔离
- **持久性**：已提交的事务永久保存

#### 核心命令详解：

##### 基本事务控制

**开始事务：**
```sql
-- 方式1：使用START TRANSACTION
START TRANSACTION;

-- 方式2：使用BEGIN
BEGIN;

-- 方式3：设置事务特性
START TRANSACTION READ WRITE;
START TRANSACTION READ ONLY;
START TRANSACTION WITH CONSISTENT SNAPSHOT;
```

**提交事务：**
```sql
-- 提交当前事务
COMMIT;

-- 提交并开始新事务（MySQL特有）
COMMIT AND CHAIN;
```

**回滚事务：**
```sql
-- 回滚当前事务
ROLLBACK;

-- 回滚并开始新事务
ROLLBACK AND CHAIN;
```

##### 保存点管理

```sql
-- 设置保存点
START TRANSACTION;
INSERT INTO users (username, email) VALUES ('user1', 'user1@example.com');
SAVEPOINT sp1;

INSERT INTO users (username, email) VALUES ('user2', 'user2@example.com');
SAVEPOINT sp2;

UPDATE users SET email = 'newemail@example.com' WHERE username = 'user1';

-- 回滚到保存点
ROLLBACK TO SAVEPOINT sp2;  -- 只回滚UPDATE操作

-- 释放保存点
RELEASE SAVEPOINT sp1;

-- 提交事务
COMMIT;
```

##### 事务隔离级别

```sql
-- 查看当前隔离级别
SELECT @@transaction_isolation;

-- 设置会话级隔离级别
SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SET SESSION TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- 设置全局隔离级别
SET GLOBAL TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- 为下一个事务设置隔离级别
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
START TRANSACTION;
-- 事务操作
COMMIT;
```

##### 自动提交控制

```sql
-- 查看自动提交状态
SELECT @@autocommit;

-- 关闭自动提交
SET autocommit = 0;

-- 开启自动提交
SET autocommit = 1;

-- 在关闭自动提交模式下的操作
SET autocommit = 0;
INSERT INTO users (username, email) VALUES ('user3', 'user3@example.com');
UPDATE users SET status = 1 WHERE username = 'user3';
COMMIT;  -- 手动提交
```

#### 事务应用场景与示例：

##### 1. 银行转账事务

```sql
START TRANSACTION;

-- 检查账户余额
SELECT balance FROM accounts WHERE account_id = 'A001' FOR UPDATE;
SELECT balance FROM accounts WHERE account_id = 'A002' FOR UPDATE;

-- 转账操作
UPDATE accounts 
SET balance = balance - 1000 
WHERE account_id = 'A001' AND balance >= 1000;

-- 检查是否成功扣款
IF ROW_COUNT() = 0 THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '余额不足';
END IF;

-- 增加目标账户余额
UPDATE accounts 
SET balance = balance + 1000 
WHERE account_id = 'A002';

-- 记录转账日志
INSERT INTO transfer_log (from_account, to_account, amount, transfer_time)
VALUES ('A001', 'A002', 1000, NOW());

COMMIT;
```

##### 2. 订单处理事务

```sql
START TRANSACTION;

-- 创建订单
INSERT INTO orders (user_id, total_amount, status) 
VALUES (1, 299.99, 'pending');

SET @order_id = LAST_INSERT_ID();

-- 添加订单项
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
VALUES 
    (@order_id, 101, 2, 99.99),
    (@order_id, 102, 1, 99.99);

-- 更新库存
UPDATE products SET stock = stock - 2 WHERE id = 101 AND stock >= 2;
UPDATE products SET stock = stock - 1 WHERE id = 102 AND stock >= 1;

-- 检查库存更新是否成功
IF (SELECT COUNT(*) FROM products WHERE id IN (101, 102) AND stock < 0) > 0 THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '库存不足';
END IF;

-- 更新用户积分
UPDATE users SET points = points + 30 WHERE id = 1;

COMMIT;
```

##### 3. 批量数据处理事务

```sql
START TRANSACTION;

-- 设置保存点
SAVEPOINT batch_start;

-- 批量插入用户数据
INSERT INTO users (username, email, created_at)
SELECT 
    CONCAT('user_', id),
    CONCAT('user_', id, '@example.com'),
    NOW()
FROM temp_user_data;

-- 检查插入结果
IF ROW_COUNT() != (SELECT COUNT(*) FROM temp_user_data) THEN
    ROLLBACK TO SAVEPOINT batch_start;
    -- 处理错误或重试
END IF;

-- 批量更新用户状态
UPDATE users SET status = 1 
WHERE username LIKE 'user_%' AND created_at >= CURDATE();

-- 清理临时数据
DELETE FROM temp_user_data;

COMMIT;
```

#### 事务管理策略与最佳实践：

1. **事务边界**：明确定义事务的开始和结束
   ```sql
   -- 好的做法：明确的事务边界
   START TRANSACTION;
   -- 相关的业务操作
   INSERT INTO orders (...);
   INSERT INTO order_items (...);
   UPDATE inventory (...);
   COMMIT;
   
   -- 避免：事务范围过大
   START TRANSACTION;
   -- 大量不相关的操作
   -- 长时间运行的查询
   COMMIT;
   ```

2. **错误处理**：合理处理事务中的错误情况
   ```sql
   START TRANSACTION;
   
   -- 使用条件检查
   IF (SELECT COUNT(*) FROM users WHERE id = @user_id) = 0 THEN
       ROLLBACK;
       SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '用户不存在';
   END IF;
   
   -- 检查操作结果
   UPDATE accounts SET balance = balance - @amount WHERE id = @account_id;
   IF ROW_COUNT() = 0 THEN
       ROLLBACK;
       SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '账户更新失败';
   END IF;
   
   COMMIT;
   ```

3. **锁管理**：避免长时间持有锁
   ```sql
   -- 好的做法：尽快释放锁
   START TRANSACTION;
   SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
   -- 快速处理
   UPDATE accounts SET balance = balance - 100 WHERE id = 1;
   COMMIT;
   
   -- 避免：长时间持有锁
   START TRANSACTION;
   SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
   -- 复杂的业务逻辑处理
   -- 网络调用
   -- 用户交互
   UPDATE accounts SET balance = balance - 100 WHERE id = 1;
   COMMIT;
   ```

4. **隔离级别选择**：根据需要选择合适的隔离级别
   ```sql
   -- 对于报表查询，可以使用较低的隔离级别
   SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
   START TRANSACTION;
   SELECT COUNT(*), AVG(amount) FROM orders WHERE date >= '2024-01-01';
   COMMIT;
   
   -- 对于关键业务操作，使用较高的隔离级别
   SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
   START TRANSACTION;
   -- 关键的金融操作
   COMMIT;
   ```

5. **死锁预防**：避免死锁的发生
   ```sql
   -- 好的做法：按固定顺序访问资源
   START TRANSACTION;
   SELECT * FROM accounts WHERE id = LEAST(@id1, @id2) FOR UPDATE;
   SELECT * FROM accounts WHERE id = GREATEST(@id1, @id2) FOR UPDATE;
   -- 处理转账
   COMMIT;
   
   -- 避免：不同顺序访问资源
   -- 事务1：先锁定账户A，再锁定账户B
   -- 事务2：先锁定账户B，再锁定账户A
   -- 可能导致死锁
   ```

## MySQL 语法特性

### 1. 大小写敏感性

MySQL 的大小写敏感性规则比较复杂，需要根据不同的对象类型和操作系统来判断。

#### 关键字大小写

```sql
-- 以下写法都是等效的
SELECT * FROM users;
select * from users;
Select * From Users;
SeLeCt * FrOm UsErS;
```

#### 数据库名和表名大小写

```sql
-- 在 Linux/Unix 系统上，以下是不同的数据库
CREATE DATABASE MyApp;
CREATE DATABASE myapp;
CREATE DATABASE MYAPP;

-- 在 Windows 系统上，以下被视为同一个数据库
CREATE DATABASE MyApp;  -- 会报错，因为 myapp 已存在
CREATE DATABASE myapp;

-- 查看系统变量
SHOW VARIABLES LIKE 'lower_case_table_names';
-- 0: 区分大小写（Linux/Unix 默认）
-- 1: 不区分大小写（Windows 默认）
-- 2: 存储时保持原样，比较时转为小写（macOS 默认）
```

#### 列名大小写

```sql
-- 列名通常不区分大小写
CREATE TABLE users (
    ID int,
    UserName varchar(50),
    email VARCHAR(100)
);

-- 以下查询都是有效的
SELECT id, username, EMAIL FROM users;
SELECT ID, UserName, email FROM users;
SELECT Id, USERNAME, Email FROM users;
```

#### 字符串值大小写

```sql
-- 字符串值默认区分大小写
SELECT * FROM users WHERE username = 'John';     -- 只匹配 'John'
SELECT * FROM users WHERE username = 'john';     -- 只匹配 'john'
SELECT * FROM users WHERE username = 'JOHN';     -- 只匹配 'JOHN'

-- 使用 COLLATE 进行不区分大小写的比较
SELECT * FROM users WHERE username COLLATE utf8mb4_general_ci = 'john';

-- 使用函数进行大小写转换
SELECT * FROM users WHERE LOWER(username) = LOWER('John');
SELECT * FROM users WHERE UPPER(username) = 'JOHN';

-- 创建表时指定排序规则
CREATE TABLE users (
    id INT PRIMARY KEY,
    username VARCHAR(50) COLLATE utf8mb4_general_ci,  -- 不区分大小写
    email VARCHAR(100) COLLATE utf8mb4_bin             -- 区分大小写
);
```

### 2. 标识符规则

MySQL 标识符（数据库名、表名、列名等）有特定的命名规则和限制。

#### 基本命名规则

```sql
-- 有效的标识符
CREATE TABLE user_profiles (          -- 下划线分隔
    user_id INT,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    created_at TIMESTAMP
);

CREATE TABLE UserProfiles (           -- 驼峰命名
    UserId INT,
    FirstName VARCHAR(50),
    LastName VARCHAR(50),
    CreatedAt TIMESTAMP
);

CREATE TABLE users2024 (              -- 包含数字
    id INT,
    name VARCHAR(50)
);

CREATE TABLE `order` (                -- 使用反引号包围保留字
    id INT,
    amount DECIMAL(10,2)
);
```

#### 长度限制示例

```sql
-- 标识符最长 64 个字符
CREATE TABLE very_long_table_name_that_describes_user_activity_logs_2024 (
    id INT,
    activity_description TEXT
);

-- 超过 64 字符会报错
-- CREATE TABLE this_table_name_is_way_too_long_and_exceeds_the_maximum_allowed_length_limit (
--     id INT
-- );
```

#### 特殊字符和保留字处理

```sql
-- 使用反引号处理特殊字符
CREATE TABLE `user-profiles` (        -- 包含连字符
    `user-id` INT,
    `first name` VARCHAR(50),         -- 包含空格
    `@email` VARCHAR(100)             -- 包含特殊字符
);

-- 保留字作为标识符
CREATE TABLE `select` (
    `from` INT,
    `where` VARCHAR(50),
    `order` TEXT
);

-- 查询时也需要使用反引号
SELECT `from`, `where` FROM `select` WHERE `order` = 'test';

-- 查看所有保留字
SHOW KEYWORDS;
```

#### 标识符最佳实践

```sql
-- 推荐的命名风格
CREATE TABLE user_accounts (          -- 使用下划线分隔
    account_id INT PRIMARY KEY,       -- 主键明确标识
    user_name VARCHAR(50) NOT NULL,   -- 描述性名称
    email_address VARCHAR(100),       -- 完整描述
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE    -- 布尔值使用 is_ 前缀
);

-- 避免的命名方式
CREATE TABLE t1 (                     -- 避免：无意义的名称
    c1 INT,                           -- 避免：无意义的列名
    `select` VARCHAR(50),             -- 避免：使用保留字
    `user name` VARCHAR(50)           -- 避免：包含空格
);
```

### 3. 注释语法

MySQL 支持多种注释语法，用于代码文档化和临时禁用代码。

#### 单行注释

```sql
-- 这是单行注释（标准 SQL 风格）
SELECT * FROM users; -- 查询所有用户

# 这也是单行注释（MySQL 特有风格）
SELECT * FROM products; # 查询所有产品

-- 注释可以用于解释复杂逻辑
SELECT 
    u.username,
    COUNT(o.id) as order_count,  -- 计算订单数量
    SUM(o.total_amount) as total_spent  -- 计算总消费金额
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
-- 只统计最近一年的数据
WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
GROUP BY u.id, u.username;
```

#### 多行注释

```sql
/*
这是多行注释
可以跨越多行
用于详细说明
*/
SELECT * FROM users;

/*
复杂查询说明：
1. 连接用户表和订单表
2. 计算每个用户的订单统计
3. 按消费金额排序
4. 只返回前10名用户
*/
SELECT 
    u.username,
    COUNT(o.id) as order_count,
    SUM(o.total_amount) as total_spent
FROM users u
INNER JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.username
ORDER BY total_spent DESC
LIMIT 10;

/* 临时禁用某些列
SELECT 
    username,
    email,
    -- phone,
    -- address
FROM users;
*/
```

#### MySQL 特有注释

```sql
/*! MySQL 特有语法注释 */
/*! 这些注释中的代码只在 MySQL 中执行 */

-- 版本特定注释
CREATE TABLE users (
    id INT PRIMARY KEY,
    username VARCHAR(50),
    /*! 50000 password VARCHAR(255) */,  -- MySQL 5.0.0+ 才执行
    /*! 80000 json_data JSON */          -- MySQL 8.0.0+ 才执行
);

-- 引擎特定注释
CREATE TABLE logs (
    id INT PRIMARY KEY,
    message TEXT,
    created_at TIMESTAMP
) /*! ENGINE=InnoDB */;  -- 指定存储引擎

-- 索引提示注释
SELECT /*! USE INDEX (idx_username) */ * 
FROM users 
WHERE username = 'john';

-- 优化器提示注释
SELECT /*+ USE_INDEX(users idx_email) */ *
FROM users 
WHERE email = 'john@example.com';
```

### 4. 字符串处理

MySQL 提供了丰富的字符串处理功能，包括不同的引号类型、转义字符和字符集支持。

#### 引号使用

```sql
-- 单引号和双引号都可以用于字符串
SELECT 'Hello World' as greeting1;
SELECT "Hello World" as greeting2;

-- 在字符串中包含引号
SELECT 'It\'s a beautiful day' as message1;        -- 转义单引号
SELECT "He said \"Hello\"" as message2;            -- 转义双引号
SELECT 'He said "Hello"' as message3;             -- 单引号中包含双引号
SELECT "It's a beautiful day" as message4;        -- 双引号中包含单引号

-- 使用 QUOTE 函数自动处理引号
SELECT QUOTE('It\'s a "test" string') as quoted_string;
```

#### 转义字符

```sql
-- 常用转义字符
SELECT 'Line 1\nLine 2' as multiline;              -- \n 换行符
SELECT 'Column1\tColumn2' as tabbed;               -- \t 制表符
SELECT 'Path: C:\\Users\\John' as windows_path;     -- \\ 反斜杠
SELECT 'Quote: \'Hello\'' as quoted;               -- \' 单引号
SELECT "Quote: \"Hello\"" as double_quoted;        -- \" 双引号
SELECT 'Backspace: \b' as backspace;               -- \b 退格符
SELECT 'Carriage Return: \r' as carriage_return;   -- \r 回车符

-- 使用十六进制和八进制
SELECT '\x41\x42\x43' as hex_abc;                  -- 十六进制 ABC
SELECT '\101\102\103' as octal_abc;                -- 八进制 ABC

-- Unicode 字符
SELECT '\u4E2D\u6587' as chinese;                  -- Unicode 中文
```

#### 字符集和排序规则

```sql
-- 查看支持的字符集
SHOW CHARACTER SET;
SHOW CHARACTER SET LIKE 'utf8%';

-- 查看排序规则
SHOW COLLATION;
SHOW COLLATION WHERE Charset = 'utf8mb4';

-- 设置字符集和排序规则
CREATE DATABASE myapp 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

CREATE TABLE users (
    id INT PRIMARY KEY,
    username VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
    email VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
    description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
);

-- 在查询中指定排序规则
SELECT * FROM users 
WHERE username COLLATE utf8mb4_general_ci = 'John';

-- 转换字符集
SELECT CONVERT('Hello' USING utf8mb4) as converted;
SELECT CAST('Hello' AS CHAR CHARACTER SET utf8mb4) as casted;
```

#### 字符串函数示例

```sql
-- 字符串长度和字节长度
SELECT 
    CHAR_LENGTH('Hello 世界') as char_len,    -- 字符长度：8
    LENGTH('Hello 世界') as byte_len;         -- 字节长度：11（UTF-8）

-- 字符串连接
SELECT 
    CONCAT('Hello', ' ', 'World') as concat1,
    CONCAT_WS(' ', 'Hello', 'Beautiful', 'World') as concat2;

-- 字符串截取
SELECT 
    LEFT('Hello World', 5) as left_part,      -- 'Hello'
    RIGHT('Hello World', 5) as right_part,    -- 'World'
    SUBSTRING('Hello World', 7, 5) as mid_part, -- 'World'
    SUBSTRING('Hello World', 7) as from_pos;   -- 'World'

-- 字符串查找和替换
SELECT 
    LOCATE('World', 'Hello World') as position,  -- 7
    REPLACE('Hello World', 'World', 'MySQL') as replaced,
    INSERT('Hello World', 7, 5, 'MySQL') as inserted;

-- 大小写转换
SELECT 
    UPPER('Hello World') as uppercase,
    LOWER('Hello World') as lowercase,
    INITCAP('hello world') as title_case;  -- MySQL 8.0+

-- 字符串修剪
SELECT 
    TRIM('  Hello World  ') as trimmed,
    LTRIM('  Hello World  ') as left_trimmed,
    RTRIM('  Hello World  ') as right_trimmed,
    TRIM('x' FROM 'xxxHello Worldxxx') as custom_trimmed;

-- 字符串填充
SELECT 
    LPAD('123', 6, '0') as left_padded,    -- '000123'
    RPAD('123', 6, '0') as right_padded;   -- '123000'
```

### 5. 数值和日期处理

#### 数值处理

```sql
-- 数值格式化
SELECT 
    FORMAT(1234567.89, 2) as formatted,        -- '1,234,567.89'
    FORMAT(1234567.89, 0) as no_decimal;       -- '1,234,568'

-- 数值函数
SELECT 
    ROUND(123.456, 2) as rounded,              -- 123.46
    CEIL(123.456) as ceiling,                  -- 124
    FLOOR(123.456) as floor,                   -- 123
    TRUNCATE(123.456, 1) as truncated;         -- 123.4

-- 数学函数
SELECT 
    ABS(-123) as absolute,                     -- 123
    POWER(2, 3) as power,                      -- 8
    SQRT(16) as square_root,                   -- 4
    MOD(10, 3) as modulo;                      -- 1
```

#### 日期时间处理

```sql
-- 当前日期时间
SELECT 
    NOW() as current_datetime,
    CURDATE() as current_date,
    CURTIME() as current_time,
    UNIX_TIMESTAMP() as unix_timestamp;

-- 日期格式化
SELECT 
    DATE_FORMAT(NOW(), '%Y-%m-%d') as date_only,
    DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s') as datetime,
    DATE_FORMAT(NOW(), '%W, %M %D, %Y') as readable_date;

-- 日期计算
SELECT 
    DATE_ADD(NOW(), INTERVAL 1 DAY) as tomorrow,
    DATE_SUB(NOW(), INTERVAL 1 WEEK) as last_week,
    DATEDIFF('2024-12-31', NOW()) as days_to_new_year;

-- 日期提取
SELECT 
    YEAR(NOW()) as current_year,
    MONTH(NOW()) as current_month,
    DAY(NOW()) as current_day,
    DAYOFWEEK(NOW()) as day_of_week,
    WEEKDAY(NOW()) as weekday;
```

## 最佳实践建议

### 1. 代码风格

- **关键字大写**：虽然不强制，但建议关键字使用大写
- **缩进对齐**：使用适当的缩进提高可读性
- **换行规则**：复杂查询适当换行
- **别名使用**：为表和列使用有意义的别名

### 2. 性能考虑

- **索引利用**：编写能够有效利用索引的查询
- **避免全表扫描**：使用适当的 WHERE 条件
- **限制结果集**：使用 LIMIT 限制返回数据量
- **子查询优化**：考虑将子查询改写为连接查询

### 3. 安全性

- **参数化查询**：避免 SQL 注入攻击
- **权限最小化**：只授予必要的权限
- **敏感数据保护**：对敏感数据进行加密
- **审计日志**：启用适当的审计功能

### 4. 可维护性

- **文档化**：为复杂查询添加注释
- **模块化**：将复杂逻辑分解为多个步骤
- **版本控制**：对数据库结构变更进行版本管理
- **测试验证**：在生产环境前充分测试

## 学习建议

### 初学者阶段
1. 从简单的 SELECT 查询开始
2. 逐步学习 WHERE 条件的使用
3. 掌握基本的 INSERT、UPDATE、DELETE 操作
4. 理解表的创建和基本约束

### 进阶阶段
1. 深入学习连接查询
2. 掌握聚合函数和分组查询
3. 学习子查询和复杂查询
4. 理解索引对查询性能的影响

### 高级阶段
1. 学习查询优化技巧
2. 掌握存储过程和函数
3. 理解事务和锁机制
4. 学习数据库设计原则

MySQL 基础语法是数据库操作的基础，掌握这些概念和原理对于后续的深入学习至关重要。建议通过大量的实践来加深理解，同时关注性能和安全性方面的最佳实践。