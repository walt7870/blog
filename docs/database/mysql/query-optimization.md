# MySQL 查询优化

## 查询优化概述

查询优化是 MySQL 数据库性能调优的核心环节，涉及 SQL 语句的编写、索引的设计、查询执行计划的分析以及数据库配置的调整。优秀的查询优化能够显著提升数据库的响应速度和吞吐量，是构建高性能数据库系统的关键技能。

### 查询优化的重要性

1. **性能提升**：优化后的查询可以将执行时间从秒级降低到毫秒级
2. **资源节约**：减少 CPU、内存和 I/O 资源的消耗
3. **并发能力**：提高数据库的并发处理能力
4. **用户体验**：改善应用程序的响应速度
5. **成本控制**：减少硬件资源需求，降低运营成本

#### 真实案例：电商平台订单查询优化

**业务场景**：某电商平台用户订单查询页面响应缓慢，用户投诉频繁。

**问题分析**：
```sql
-- 原始查询（性能差）
SELECT o.*, u.username, p.product_name, p.price
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.user_id = 12345
AND o.created_at >= '2023-01-01'
ORDER BY o.created_at DESC;
```

**性能问题**：
- 执行时间：2.3秒
- 扫描行数：850万行
- 临时表：使用了临时表和文件排序
- 索引：未充分利用索引

**优化后查询**：
```sql
-- 优化后查询
SELECT o.id, o.order_no, o.total_amount, o.status, o.created_at,
       u.username,
       GROUP_CONCAT(CONCAT(p.product_name, '×', oi.quantity) SEPARATOR '; ') as products
FROM orders o
INNER JOIN users u ON o.user_id = u.id
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN products p ON oi.product_id = p.id
WHERE o.user_id = 12345
AND o.created_at >= '2023-01-01'
GROUP BY o.id, o.order_no, o.total_amount, o.status, o.created_at, u.username
ORDER BY o.created_at DESC
LIMIT 20;

-- 添加的索引
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX idx_order_items_order_product ON order_items(order_id, product_id);
```

**优化效果**：
- 执行时间：45毫秒（提升98%）
- 扫描行数：156行（减少99.98%）
- 内存使用：减少85%
- 用户满意度：投诉减少95%

### 查询优化的层次

1. **SQL 语句层面**：编写高效的 SQL 语句
2. **索引层面**：设计合适的索引策略
3. **表结构层面**：优化表设计和数据类型选择
4. **配置层面**：调整数据库参数配置
5. **硬件层面**：优化硬件配置和部署架构

## MySQL 查询优化器工作原理

MySQL 查询优化器是数据库系统的核心组件，负责将 SQL 语句转换为最优的执行计划。理解优化器的工作原理有助于编写更高效的查询语句。

### 优化器架构

#### 基于成本的优化（CBO）

**成本模型**：
- MySQL 使用基于成本的优化器
- 为每种操作定义成本计算公式
- 比较不同执行计划的总成本
- 选择成本最低的执行计划

**成本因素**：
- **I/O 成本**：磁盘读取操作的成本
- **CPU 成本**：数据处理和比较的成本
- **内存成本**：内存访问和缓存的成本
- **网络成本**：数据传输的成本（分布式环境）

**成本计算**：
- 基于统计信息估算成本
- 考虑数据分布和选择性
- 评估不同访问路径的效率
- 动态调整成本参数

#### 统计信息收集

**表统计信息**：
- **行数统计**：表中的总行数
- **数据长度**：平均行长度和总数据量
- **更新频率**：数据修改的频率
- **数据分布**：数据在不同值上的分布情况

**索引统计信息**：
- **基数（Cardinality）**：索引中不同值的数量
- **选择性**：索引的过滤效果
- **深度**：B+ 树的层数
- **叶子页数量**：索引叶子节点的数量

**统计信息更新**：
- 自动更新机制
- 手动更新命令（ANALYZE TABLE）
- 更新触发条件
- 统计信息的持久化

### 查询解析过程

#### 词法分析和语法分析

**词法分析**：
- 将 SQL 语句分解为词法单元（Token）
- 识别关键字、标识符、常量等
- 检查基本的语法错误
- 生成词法分析树

**语法分析**：
- 根据 SQL 语法规则构建语法树
- 验证 SQL 语句的语法正确性
- 识别查询的基本结构
- 为后续优化做准备

**语义分析**：
- 检查表名、列名的有效性
- 验证数据类型的兼容性
- 解析表达式和函数调用
- 处理别名和引用关系

#### 查询重写

**常量折叠**：
- 计算常量表达式的值
- 简化复杂的数学运算
- 优化条件判断
- 减少运行时计算

**谓词下推**：
- 将过滤条件尽早应用
- 减少中间结果集的大小
- 提高查询执行效率
- 优化子查询和连接操作

**子查询优化**：
- 将相关子查询转换为连接
- 优化 EXISTS 和 IN 子查询
- 消除不必要的子查询
- 改善查询执行计划

**连接重排序**：
- 调整多表连接的顺序
- 选择最优的连接算法
- 考虑索引的可用性
- 最小化中间结果集

### 执行计划生成

#### 访问路径选择

**全表扫描**：
- 适用于小表或大部分数据需要访问的情况
- 顺序读取，I/O 效率较高
- 不需要索引支持
- 成本相对固定

**索引扫描**：
- **索引范围扫描**：根据范围条件扫描索引
- **索引唯一扫描**：通过唯一索引精确定位
- **索引全扫描**：扫描整个索引
- **索引快速全扫描**：并行扫描索引

**索引查找**：
- 通过索引快速定位数据
- 适用于高选择性的查询条件
- 减少数据访问量
- 提高查询效率

#### 连接算法选择

**嵌套循环连接（NLJ）**：
- 简单的连接算法
- 外表的每一行与内表进行匹配
- 适用于小表连接
- 可以利用索引优化

**块嵌套循环连接（BNL）**：
- 批量处理外表数据
- 减少内表的扫描次数
- 提高缓存利用率
- 适用于中等大小的表连接

**哈希连接**：
- MySQL 8.0 引入的新算法
- 构建哈希表进行连接
- 适用于大表连接
- 内存需求较大

**排序合并连接**：
- 对两个表进行排序后合并
- 适用于大表连接
- 需要额外的排序开销
- 可以利用已有的排序

#### 排序和分组优化

**索引排序**：
- 利用索引的有序性避免排序
- 选择合适的索引顺序
- 考虑复合索引的使用
- 优化 ORDER BY 子句

**内存排序**：
- 在内存中进行快速排序
- 适用于小数据集
- 配置 sort_buffer_size 参数
- 避免磁盘临时文件

**外部排序**：
- 数据量超过内存时使用
- 分块排序后合并
- 使用临时文件存储中间结果
- 优化 I/O 操作

**分组优化**：
- 利用索引进行分组
- 优化 GROUP BY 子句
- 选择合适的聚合算法
- 考虑松散索引扫描

## 执行计划分析

执行计划是查询优化的重要工具，通过分析执行计划可以了解查询的执行过程，识别性能瓶颈，制定优化策略。

### 实战案例：分析慢查询的执行计划

**业务场景**：社交媒体平台的用户动态查询性能问题

**问题查询**：
```sql
SELECT p.*, u.username, u.avatar,
       (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) as like_count,
       (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
AND u.status = 'active'
ORDER BY p.created_at DESC
LIMIT 20;
```

**执行计划分析**：
```sql
EXPLAIN FORMAT=JSON SELECT p.*, u.username, u.avatar,
       (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) as like_count,
       (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
AND u.status = 'active'
ORDER BY p.created_at DESC
LIMIT 20;
```

**问题分析结果**：
```
+----+-------------+-------+------+---------------+------+---------+------+--------+-----------------------------+
| id | select_type | table | type | possible_keys | key  | key_len | ref  | rows   | Extra                       |
+----+-------------+-------+------+---------------+------+---------+------+--------+-----------------------------+
|  1 | PRIMARY     | p     | ALL  | NULL          | NULL | NULL    | NULL | 125000 | Using where; Using filesort |
|  1 | PRIMARY     | u     | ALL  | NULL          | NULL | NULL    | NULL | 50000  | Using where; Using join buffer|
|  3 | SUBQUERY    | l     | ALL  | NULL          | NULL | NULL    | NULL | 800000 | Using where                 |
|  2 | SUBQUERY    | c     | ALL  | NULL          | NULL | NULL    | NULL | 300000 | Using where                 |
+----+-------------+-------+------+---------------+------+---------+------+--------+-----------------------------+
```

**性能问题识别**：
1. **全表扫描**：posts表和users表都是ALL类型，扫描全表
2. **子查询性能差**：每个子查询都是全表扫描
3. **文件排序**：使用了filesort，没有利用索引排序
4. **连接缓冲区**：使用了join buffer，说明连接效率低

**优化方案**：
```sql
-- 1. 创建必要的索引
CREATE INDEX idx_posts_created_user ON posts(created_at DESC, user_id);
CREATE INDEX idx_users_status ON users(status, id);
CREATE INDEX idx_likes_post ON likes(post_id);
CREATE INDEX idx_comments_post ON comments(post_id);

-- 2. 优化后的查询
SELECT p.id, p.content, p.created_at, p.user_id,
       u.username, u.avatar,
       COALESCE(l.like_count, 0) as like_count,
       COALESCE(c.comment_count, 0) as comment_count
FROM posts p
INNER JOIN users u ON p.user_id = u.id AND u.status = 'active'
LEFT JOIN (
    SELECT post_id, COUNT(*) as like_count
    FROM likes
    GROUP BY post_id
) l ON p.id = l.post_id
LEFT JOIN (
    SELECT post_id, COUNT(*) as comment_count
    FROM comments
    GROUP BY post_id
) c ON p.id = c.post_id
WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY p.created_at DESC
LIMIT 20;
```

**优化后执行计划**：
```
+----+-------------+-------+-------+------------------+------------------+---------+------+------+-------------+
| id | select_type | table | type  | possible_keys    | key              | key_len | ref  | rows | Extra       |
+----+-------------+-------+-------+------------------+------------------+---------+------+------+-------------+
|  1 | PRIMARY     | p     | range | idx_posts_created| idx_posts_created| 8       | NULL | 1500 | Using where |
|  1 | PRIMARY     | u     | ref   | idx_users_status | idx_users_status | 5       | p.user_id| 1 | Using index|
|  1 | PRIMARY     | l     | ref   | idx_likes_post   | idx_likes_post   | 4       | p.id | 5    | Using index|
|  1 | PRIMARY     | c     | ref   | idx_comments_post| idx_comments_post| 4       | p.id | 3    | Using index|
+----+-------------+-------+-------+------------------+------------------+---------+------+------+-------------+
```

**性能提升效果**：
- 执行时间：从3.2秒降低到85毫秒
- 扫描行数：从127万行降低到1509行
- CPU使用率：降低90%
- 并发能力：提升15倍

### EXPLAIN 语句详解

#### 基本用法

**EXPLAIN 语法**：
- `EXPLAIN SELECT ...`：显示查询的执行计划
- `EXPLAIN FORMAT=JSON SELECT ...`：以 JSON 格式显示
- `EXPLAIN ANALYZE SELECT ...`：显示实际执行统计信息
- `EXPLAIN FOR CONNECTION connection_id`：显示指定连接的执行计划

**输出格式**：
- **传统格式**：表格形式，易于阅读
- **JSON 格式**：结构化数据，包含更多信息
- **TREE 格式**：树形结构，显示操作层次
- **可视化工具**：图形化显示执行计划

#### 执行计划字段解析

**id 字段**：
- 查询的标识符
- 数字越大越先执行
- 相同 id 从上到下执行
- NULL 表示结果集

**select_type 字段**：
- **SIMPLE**：简单查询，不包含子查询或 UNION
- **PRIMARY**：最外层的查询
- **SUBQUERY**：子查询中的第一个 SELECT
- **DERIVED**：派生表的 SELECT
- **UNION**：UNION 中的第二个或后续 SELECT
- **UNION RESULT**：UNION 的结果

**table 字段**：
- 查询涉及的表名
- 可能是实际表名或别名
- 派生表显示为 `<derivedN>`
- 子查询显示为 `<subqueryN>`

**partitions 字段**：
- 查询涉及的分区
- 显示分区裁剪的效果
- 帮助优化分区查询
- NULL 表示非分区表

**type 字段（访问类型）**：
- **system**：表只有一行（系统表）
- **const**：通过主键或唯一索引访问，最多返回一行
- **eq_ref**：对于前表的每一行，在此表中只查询一条记录
- **ref**：非唯一索引访问，返回匹配某个单独值的所有行
- **fulltext**：全文索引检索
- **ref_or_null**：类似 ref，但包含 NULL 值的查询
- **index_merge**：使用索引合并优化
- **unique_subquery**：IN 子查询中的唯一索引查找
- **index_subquery**：IN 子查询中的非唯一索引查找
- **range**：索引范围扫描
- **index**：全索引扫描
- **ALL**：全表扫描

**possible_keys 字段**：
- 可能使用的索引
- 优化器考虑的候选索引
- NULL 表示没有相关索引
- 不一定是最终选择的索引

**key 字段**：
- 实际使用的索引
- NULL 表示没有使用索引
- 可能与 possible_keys 不同
- 显示优化器的最终选择

**key_len 字段**：
- 使用索引的长度
- 字节数，不是字符数
- 帮助判断索引的使用程度
- 复合索引的前缀长度

**ref 字段**：
- 与索引比较的列或常量
- 显示索引查找的条件
- const 表示常量
- 列名表示列比较

**rows 字段**：
- 估计需要扫描的行数
- 基于统计信息的估算
- 不是精确值
- 用于成本计算

**filtered 字段**：
- 按表条件过滤的行百分比
- 显示过滤效果
- 100% 表示没有过滤
- 帮助评估查询效率

**Extra 字段**：
- **Using index**：覆盖索引，不需要回表
- **Using where**：使用 WHERE 子句过滤
- **Using temporary**：使用临时表
- **Using filesort**：使用文件排序
- **Using index condition**：索引条件下推
- **Using MRR**：多范围读取优化
- **Using join buffer**：使用连接缓冲区
- **Impossible WHERE**：WHERE 条件总是 false
- **Select tables optimized away**：优化器优化掉了查询

### 性能指标分析

#### 关键性能指标

**执行时间**：
- 查询的总执行时间
- 各个阶段的耗时分布
- 网络传输时间
- 客户端处理时间

**资源消耗**：
- CPU 使用率
- 内存使用量
- I/O 操作次数
- 网络流量

**数据访问量**：
- 扫描的行数
- 返回的行数
- 读取的数据量
- 索引使用情况

#### 性能瓶颈识别

**I/O 瓶颈**：
- 大量的全表扫描
- 频繁的磁盘读取
- 临时文件的使用
- 缓冲池命中率低

**CPU 瓶颈**：
- 复杂的计算和函数调用
- 大量的数据比较和排序
- 正则表达式匹配
- 数据类型转换

**内存瓶颈**：
- 大量的临时表使用
- 排序缓冲区不足
- 连接缓冲区不足
- 缓存命中率低

**锁竞争**：
- 长时间的锁等待
- 死锁的发生
- 锁升级
- 并发冲突

## SQL 优化技巧

### WHERE 子句优化

#### 索引友好的条件编写

**使用索引列**：
- 在 WHERE 子句中使用有索引的列
- 避免在索引列上使用函数
- 保持索引列的原始数据类型
- 考虑复合索引的列顺序

**避免索引失效**：
- 不要在索引列上使用函数：`WHERE YEAR(date_col) = 2023` → `WHERE date_col >= '2023-01-01' AND date_col < '2024-01-01'`
- 避免隐式类型转换：`WHERE id = '123'` → `WHERE id = 123`
- 不要使用 NOT、!=、<> 操作符
- 避免 OR 条件，使用 UNION 替代

**范围查询优化**：
- 使用 BETWEEN 而不是 >= AND <=
- 合理使用 IN 和 EXISTS
- 优化 LIKE 查询的通配符位置
- 考虑使用覆盖索引

#### 条件顺序优化

**选择性原则**：
- 将选择性高的条件放在前面
- 优先使用能够大幅减少结果集的条件
- 考虑短路求值的特性
- 平衡计算成本和过滤效果

**索引利用**：
- 按照复合索引的列顺序编写条件
- 确保最左前缀匹配
- 避免跳跃使用索引列
- 考虑索引覆盖的可能性

#### 实战案例：金融系统交易记录查询优化

**业务场景**：银行交易系统的历史交易查询功能性能问题

**原始问题查询**：
```sql
-- 查询用户近30天的交易记录（性能差）
SELECT 
    t.transaction_id,
    t.amount,
    t.transaction_type,
    t.create_time,
    a.account_number,
    u.username
FROM transactions t
JOIN accounts a ON t.account_id = a.account_id
JOIN users u ON a.user_id = u.user_id
WHERE YEAR(t.create_time) = 2023
AND MONTH(t.create_time) >= 11
AND t.amount > '1000'  -- 字符串类型
AND (t.transaction_type = 'transfer' OR t.transaction_type = 'payment')
AND u.status != 'inactive'
ORDER BY t.create_time DESC;
```

**性能问题分析**：
```sql
-- 执行计划分析
EXPLAIN FORMAT=JSON [上述查询];

-- 问题发现：
-- 1. 在索引列create_time上使用了函数YEAR()和MONTH()
-- 2. amount字段发生隐式类型转换
-- 3. 使用了OR条件
-- 4. 使用了!=操作符
-- 5. 连接顺序不合理

-- 性能测试结果：
-- 执行时间：4.8秒
-- 扫描行数：2,300,000行
-- 临时表：使用
-- 文件排序：是
```

**数据量和索引分析**：
```sql
-- 查看表数据量
SELECT 
    'transactions' as table_name, COUNT(*) as row_count,
    MIN(create_time) as min_date, MAX(create_time) as max_date
FROM transactions
UNION ALL
SELECT 'accounts', COUNT(*), NULL, NULL FROM accounts
UNION ALL
SELECT 'users', COUNT(*), NULL, NULL FROM users;

-- 结果：
-- transactions: 2,500,000行 (2020-01-01 到 2023-12-31)
-- accounts: 150,000行
-- users: 120,000行

-- 查看现有索引
SHOW INDEX FROM transactions;
SHOW INDEX FROM accounts;
SHOW INDEX FROM users;
```

**优化方案实施**：

**第一步：修复索引失效问题**
```sql
-- 优化后的查询
SELECT 
    t.transaction_id,
    t.amount,
    t.transaction_type,
    t.create_time,
    a.account_number,
    u.username
FROM transactions t
INNER JOIN accounts a ON t.account_id = a.account_id
INNER JOIN users u ON a.user_id = u.user_id
WHERE t.create_time >= '2023-11-01'  -- 避免函数使用
AND t.create_time < '2024-01-01'
AND t.amount > 1000  -- 修复类型转换
AND t.transaction_type IN ('transfer', 'payment')  -- 替换OR
AND u.status = 'active'  -- 替换!=
ORDER BY t.create_time DESC
LIMIT 100;
```

**第二步：创建优化索引**
```sql
-- 分析查询条件的选择性
SELECT 
    COUNT(*) as total_rows,
    COUNT(DISTINCT create_time) as date_cardinality,
    COUNT(DISTINCT amount) as amount_cardinality,
    COUNT(DISTINCT transaction_type) as type_cardinality,
    COUNT(DISTINCT account_id) as account_cardinality
FROM transactions
WHERE create_time >= '2023-11-01';

-- 结果分析：
-- total_rows: 156,000
-- date_cardinality: 61 (选择性低)
-- amount_cardinality: 89,000 (选择性高)
-- type_cardinality: 8 (选择性低)
-- account_cardinality: 45,000 (选择性中等)

-- 创建复合索引（按选择性排序）
CREATE INDEX idx_transactions_optimized ON transactions(
    create_time,  -- 范围查询放在前面
    transaction_type,
    amount,
    account_id
);

-- 为关联表创建索引
CREATE INDEX idx_accounts_user ON accounts(user_id, account_id);
CREATE INDEX idx_users_status ON users(status, user_id);
```

**第三步：进一步优化查询结构**
```sql
-- 方案1：子查询优化
SELECT 
    t.transaction_id,
    t.amount,
    t.transaction_type,
    t.create_time,
    a.account_number,
    u.username
FROM (
    SELECT 
        transaction_id,
        amount,
        transaction_type,
        create_time,
        account_id
    FROM transactions
    WHERE create_time >= '2023-11-01'
    AND create_time < '2024-01-01'
    AND transaction_type IN ('transfer', 'payment')
    AND amount > 1000
    ORDER BY create_time DESC
    LIMIT 100
) t
INNER JOIN accounts a ON t.account_id = a.account_id
INNER JOIN users u ON a.user_id = u.user_id AND u.status = 'active'
ORDER BY t.create_time DESC;

-- 方案2：EXISTS优化（适用于大表关联）
SELECT 
    t.transaction_id,
    t.amount,
    t.transaction_type,
    t.create_time,
    a.account_number,
    u.username
FROM transactions t
INNER JOIN accounts a ON t.account_id = a.account_id
INNER JOIN users u ON a.user_id = u.user_id
WHERE t.create_time >= '2023-11-01'
AND t.create_time < '2024-01-01'
AND t.amount > 1000
AND t.transaction_type IN ('transfer', 'payment')
AND EXISTS (
    SELECT 1 FROM users u2 
    WHERE u2.user_id = u.user_id 
    AND u2.status = 'active'
)
ORDER BY t.create_time DESC
LIMIT 100;
```

**第四步：性能测试和对比**
```sql
-- 性能测试
SET profiling = 1;

-- 测试原始查询
[执行原始查询]

-- 测试优化查询
[执行优化查询]

SHOW PROFILES;

-- 执行计划对比
EXPLAIN FORMAT=JSON [优化后查询];
```

**优化效果**：
```
-- 性能对比结果：
-- 原始查询：
--   执行时间：4.8秒
--   扫描行数：2,300,000行
--   索引使用：无
--   临时表：是

-- 优化后查询：
--   执行时间：85毫秒
--   扫描行数：1,200行
--   索引使用：idx_transactions_optimized
--   临时表：否

-- 性能提升：98.2%
-- 扫描行数减少：99.95%
```

**业务价值**：
- 用户查询响应时间从4.8秒降低到85毫秒
- 系统并发能力提升56倍
- 数据库CPU使用率降低92%
- 用户体验显著改善，投诉减少98%
- 支持更高的业务增长需求

**维护建议**：
```sql
-- 定期监控索引使用情况
SELECT 
    OBJECT_NAME,
    INDEX_NAME,
    COUNT_FETCH,
    COUNT_INSERT,
    COUNT_UPDATE,
    COUNT_DELETE
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE OBJECT_SCHEMA = 'banking_system'
AND OBJECT_NAME = 'transactions'
ORDER BY COUNT_FETCH DESC;

-- 定期更新统计信息
ANALYZE TABLE transactions;

-- 监控查询性能
SELECT 
    DIGEST_TEXT,
    COUNT_STAR,
    ROUND(AVG_TIMER_WAIT/1000000000000, 3) as avg_time_sec
FROM performance_schema.events_statements_summary_by_digest
WHERE DIGEST_TEXT LIKE '%transactions%'
ORDER BY AVG_TIMER_WAIT DESC;
```

### JOIN 优化策略

#### 连接类型选择

**INNER JOIN**：
- 只返回匹配的记录
- 性能通常最好
- 可以自由调整表的连接顺序
- 支持各种优化算法

**LEFT/RIGHT JOIN**：
- 保留左表/右表的所有记录
- 限制了连接顺序的优化
- 注意 NULL 值的处理
- 可能产生更多的结果行

**连接条件优化**：
- 在连接列上建立索引
- 确保连接列的数据类型一致
- 避免在连接条件中使用函数
- 考虑使用复合索引

#### 连接顺序优化

**小表驱动大表**：
- 将小表作为驱动表
- 减少嵌套循环的次数
- 提高缓存命中率
- 降低总体成本

**索引利用**：
- 确保被驱动表的连接列有索引
- 考虑索引的选择性
- 利用唯一索引的优势
- 避免索引失效

**统计信息**：
- 保持统计信息的准确性
- 定期更新表统计信息
- 考虑数据分布的变化
- 监控优化器的选择

### 实战案例：电商平台多表连接查询优化

**业务场景**：电商平台订单详情页面查询优化

**原始查询问题**：
```sql
-- 问题查询：获取用户订单详情（包含商品信息、优惠券、物流信息）
SELECT 
    o.order_id,
    o.order_no,
    o.total_amount,
    o.create_time,
    u.username,
    u.email,
    oi.product_id,
    p.product_name,
    p.price,
    oi.quantity,
    c.coupon_code,
    c.discount_amount,
    l.logistics_company,
    l.tracking_number,
    l.status as logistics_status
FROM orders o
LEFT JOIN users u ON o.user_id = u.user_id
LEFT JOIN order_items oi ON o.order_id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.product_id
LEFT JOIN order_coupons oc ON o.order_id = oc.order_id
LEFT JOIN coupons c ON oc.coupon_id = c.coupon_id
LEFT JOIN logistics l ON o.order_id = l.order_id
WHERE o.user_id = 12345
AND o.create_time >= '2023-01-01'
ORDER BY o.create_time DESC;
```

**性能问题分析**：
```sql
-- 执行计划分析
EXPLAIN FORMAT=JSON [上述查询];

-- 问题发现：
-- 1. 多个LEFT JOIN导致笛卡尔积
-- 2. 连接顺序不合理（大表驱动小表）
-- 3. 缺少合适的复合索引
-- 4. 排序操作使用filesort

-- 性能测试结果
-- 执行时间：2.8秒
-- 扫描行数：850,000行
-- 临时表：使用
-- 文件排序：是
```

**数据量分析**：
```sql
-- 查看各表数据量
SELECT 
    'orders' as table_name, COUNT(*) as row_count FROM orders
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'coupons', COUNT(*) FROM coupons
UNION ALL
SELECT 'logistics', COUNT(*) FROM logistics;

-- 结果：
-- orders: 2,500,000行
-- users: 500,000行
-- order_items: 8,000,000行
-- products: 100,000行
-- coupons: 50,000行
-- logistics: 2,200,000行
```

**优化方案一：索引优化**
```sql
-- 创建复合索引
CREATE INDEX idx_orders_user_time ON orders(user_id, create_time DESC, order_id);
CREATE INDEX idx_order_items_order ON order_items(order_id, product_id);
CREATE INDEX idx_order_coupons_order ON order_coupons(order_id, coupon_id);
CREATE INDEX idx_logistics_order ON logistics(order_id);

-- 确保连接字段有索引
SHOW INDEX FROM orders WHERE Key_name LIKE '%user_id%';
SHOW INDEX FROM order_items WHERE Key_name LIKE '%order_id%';
```

**优化方案二：查询重构**
```sql
-- 方法1：分步查询，减少连接复杂度
-- 第一步：获取基础订单信息
SELECT 
    o.order_id,
    o.order_no,
    o.total_amount,
    o.create_time,
    u.username,
    u.email
FROM orders o
INNER JOIN users u ON o.user_id = u.user_id
WHERE o.user_id = 12345
AND o.create_time >= '2023-01-01'
ORDER BY o.create_time DESC
LIMIT 20;

-- 第二步：根据订单ID获取商品信息
SELECT 
    oi.order_id,
    oi.product_id,
    p.product_name,
    p.price,
    oi.quantity
FROM order_items oi
INNER JOIN products p ON oi.product_id = p.product_id
WHERE oi.order_id IN (订单ID列表);

-- 第三步：获取优惠券信息
SELECT 
    oc.order_id,
    c.coupon_code,
    c.discount_amount
FROM order_coupons oc
INNER JOIN coupons c ON oc.coupon_id = c.coupon_id
WHERE oc.order_id IN (订单ID列表);

-- 第四步：获取物流信息
SELECT 
    order_id,
    logistics_company,
    tracking_number,
    status as logistics_status
FROM logistics
WHERE order_id IN (订单ID列表);
```

**优化方案三：连接顺序优化**
```sql
-- 使用STRAIGHT_JOIN强制连接顺序（小表驱动大表）
SELECT STRAIGHT_JOIN
    o.order_id,
    o.order_no,
    o.total_amount,
    o.create_time,
    u.username,
    u.email,
    oi.product_id,
    p.product_name,
    p.price,
    oi.quantity,
    c.coupon_code,
    c.discount_amount,
    l.logistics_company,
    l.tracking_number,
    l.status as logistics_status
FROM orders o
INNER JOIN users u ON o.user_id = u.user_id
LEFT JOIN order_items oi ON o.order_id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.product_id
LEFT JOIN order_coupons oc ON o.order_id = oc.order_id
LEFT JOIN coupons c ON oc.coupon_id = c.coupon_id
LEFT JOIN logistics l ON o.order_id = l.order_id
WHERE o.user_id = 12345
AND o.create_time >= '2023-01-01'
ORDER BY o.create_time DESC
LIMIT 20;
```

**优化方案四：使用子查询优化**
```sql
-- 先过滤再连接
SELECT 
    o.order_id,
    o.order_no,
    o.total_amount,
    o.create_time,
    u.username,
    u.email,
    oi.product_id,
    p.product_name,
    p.price,
    oi.quantity,
    coupon_info.coupon_code,
    coupon_info.discount_amount,
    l.logistics_company,
    l.tracking_number,
    l.status as logistics_status
FROM (
    SELECT order_id, order_no, total_amount, create_time, user_id
    FROM orders 
    WHERE user_id = 12345 
    AND create_time >= '2023-01-01'
    ORDER BY create_time DESC
    LIMIT 20
) o
INNER JOIN users u ON o.user_id = u.user_id
LEFT JOIN order_items oi ON o.order_id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.product_id
LEFT JOIN (
    SELECT 
        oc.order_id,
        c.coupon_code,
        c.discount_amount
    FROM order_coupons oc
    INNER JOIN coupons c ON oc.coupon_id = c.coupon_id
) coupon_info ON o.order_id = coupon_info.order_id
LEFT JOIN logistics l ON o.order_id = l.order_id
ORDER BY o.create_time DESC;
```

**性能对比测试**：
```sql
-- 测试各种优化方案
SET profiling = 1;

-- 原始查询
[执行原始查询]

-- 优化方案1（索引优化）
[执行优化查询1]

-- 优化方案2（分步查询）
[执行优化查询2]

-- 优化方案3（连接顺序优化）
[执行优化查询3]

-- 优化方案4（子查询优化）
[执行优化查询4]

SHOW PROFILES;

-- 性能对比结果：
-- 原始查询：2.8秒，扫描850,000行
-- 索引优化：1.2秒，扫描120,000行
-- 分步查询：0.3秒，总扫描15,000行
-- 连接顺序优化：0.8秒，扫描80,000行
-- 子查询优化：0.4秒，扫描25,000行
```

**最终优化方案**：
```sql
-- 结合多种优化技术的最终方案
SELECT 
    base.order_id,
    base.order_no,
    base.total_amount,
    base.create_time,
    base.username,
    base.email,
    COALESCE(items.items_json, '[]') as order_items,
    COALESCE(coupon.coupon_info, '{}') as coupon_info,
    COALESCE(logistics.logistics_info, '{}') as logistics_info
FROM (
    SELECT 
        o.order_id,
        o.order_no,
        o.total_amount,
        o.create_time,
        u.username,
        u.email
    FROM orders o
    INNER JOIN users u ON o.user_id = u.user_id
    WHERE o.user_id = 12345
    AND o.create_time >= '2023-01-01'
    ORDER BY o.create_time DESC
    LIMIT 20
) base
LEFT JOIN (
    SELECT 
        oi.order_id,
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'product_id', oi.product_id,
                'product_name', p.product_name,
                'price', p.price,
                'quantity', oi.quantity
            )
        ) as items_json
    FROM order_items oi
    INNER JOIN products p ON oi.product_id = p.product_id
    WHERE oi.order_id IN (
        SELECT order_id FROM orders 
        WHERE user_id = 12345 
        AND create_time >= '2023-01-01'
        ORDER BY create_time DESC LIMIT 20
    )
    GROUP BY oi.order_id
) items ON base.order_id = items.order_id
LEFT JOIN (
    SELECT 
        oc.order_id,
        JSON_OBJECT(
            'coupon_code', c.coupon_code,
            'discount_amount', c.discount_amount
        ) as coupon_info
    FROM order_coupons oc
    INNER JOIN coupons c ON oc.coupon_id = c.coupon_id
    WHERE oc.order_id IN (
        SELECT order_id FROM orders 
        WHERE user_id = 12345 
        AND create_time >= '2023-01-01'
        ORDER BY create_time DESC LIMIT 20
    )
) coupon ON base.order_id = coupon.order_id
LEFT JOIN (
    SELECT 
        order_id,
        JSON_OBJECT(
            'logistics_company', logistics_company,
            'tracking_number', tracking_number,
            'status', status
        ) as logistics_info
    FROM logistics
    WHERE order_id IN (
        SELECT order_id FROM orders 
        WHERE user_id = 12345 
        AND create_time >= '2023-01-01'
        ORDER BY create_time DESC LIMIT 20
    )
) logistics ON base.order_id = logistics.order_id
ORDER BY base.create_time DESC;
```

**优化效果总结**：
- **查询时间**：从2.8秒优化到0.15秒，提升94.6%
- **扫描行数**：从850,000行减少到8,000行，减少99.1%
- **内存使用**：减少临时表使用，内存占用降低80%
- **并发性能**：支持并发查询数从50提升到500
- **用户体验**：页面加载时间从5秒降低到0.5秒

### 子查询优化

#### 子查询类型分析

**相关子查询**：
- 子查询引用外层查询的列
- 每行都需要执行子查询
- 性能通常较差
- 考虑转换为连接

**非相关子查询**：
- 子查询独立于外层查询
- 只需要执行一次
- 可以被优化器缓存
- 性能相对较好

**标量子查询**：
- 返回单个值
- 可以在 SELECT、WHERE、HAVING 中使用
- 注意返回多行的错误
- 考虑使用连接替代

#### 子查询转换技巧

**EXISTS 转 JOIN**：
```sql
-- 原查询
SELECT * FROM customers c 
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);

-- 优化后
SELECT DISTINCT c.* FROM customers c 
INNER JOIN orders o ON o.customer_id = c.id;
```

**IN 转 JOIN**：
```sql
-- 原查询
SELECT * FROM customers 
WHERE id IN (SELECT customer_id FROM orders WHERE order_date > '2023-01-01');

-- 优化后
SELECT DISTINCT c.* FROM customers c 
INNER JOIN orders o ON o.customer_id = c.id 
WHERE o.order_date > '2023-01-01';
```

**标量子查询转 LEFT JOIN**：
```sql
-- 原查询
SELECT c.*, 
       (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) as order_count
FROM customers c;

-- 优化后
SELECT c.*, COALESCE(o.order_count, 0) as order_count
FROM customers c
LEFT JOIN (
    SELECT customer_id, COUNT(*) as order_count 
    FROM orders 
    GROUP BY customer_id
) o ON o.customer_id = c.id;
```

### 实战案例：社交媒体平台复杂子查询优化

**业务场景**：社交媒体平台用户动态推荐系统

**原始问题查询**：
```sql
-- 查询用户关注的人发布的动态，包含点赞数、评论数、是否已点赞
SELECT 
    p.post_id,
    p.content,
    p.create_time,
    u.username,
    u.avatar,
    -- 子查询1：获取点赞数
    (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.post_id) as like_count,
    -- 子查询2：获取评论数
    (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.post_id) as comment_count,
    -- 子查询3：检查当前用户是否已点赞
    (SELECT COUNT(*) FROM post_likes pl2 
     WHERE pl2.post_id = p.post_id AND pl2.user_id = 12345) as is_liked,
    -- 子查询4：获取最新评论
    (SELECT content FROM post_comments pc2 
     WHERE pc2.post_id = p.post_id 
     ORDER BY pc2.create_time DESC LIMIT 1) as latest_comment
FROM posts p
INNER JOIN users u ON p.user_id = u.user_id
WHERE p.user_id IN (
    -- 子查询5：获取关注的用户ID
    SELECT followed_user_id 
    FROM user_follows 
    WHERE follower_user_id = 12345
)
AND p.create_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY p.create_time DESC
LIMIT 50;
```

**性能问题分析**：
```sql
-- 执行计划分析
EXPLAIN FORMAT=JSON [上述查询];

-- 问题发现：
-- 1. 多个相关子查询导致N+1查询问题
-- 2. 每个动态都要执行4次子查询
-- 3. IN子查询可能导致全表扫描
-- 4. 缺少合适的索引支持

-- 性能测试结果
SET profiling = 1;
[执行原始查询]
SHOW PROFILES;

-- 执行时间：4.2秒
-- 扫描行数：1,200,000行
-- 子查询执行次数：200次（50个动态 × 4个子查询）
```

**数据量分析**：
```sql
-- 查看各表数据量和索引情况
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    ROUND(DATA_LENGTH/1024/1024, 2) AS 'Data Size (MB)',
    ROUND(INDEX_LENGTH/1024/1024, 2) AS 'Index Size (MB)'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'social_media'
AND TABLE_NAME IN ('posts', 'users', 'post_likes', 'post_comments', 'user_follows');

-- 结果：
-- posts: 5,000,000行, 数据1200MB, 索引180MB
-- users: 1,000,000行, 数据150MB, 索引45MB
-- post_likes: 50,000,000行, 数据800MB, 索引600MB
-- post_comments: 20,000,000行, 数据2000MB, 索引400MB
-- user_follows: 10,000,000行, 数据200MB, 索引150MB
```

**优化方案一：子查询转JOIN**
```sql
-- 将所有子查询转换为LEFT JOIN
SELECT 
    p.post_id,
    p.content,
    p.create_time,
    u.username,
    u.avatar,
    COALESCE(like_stats.like_count, 0) as like_count,
    COALESCE(comment_stats.comment_count, 0) as comment_count,
    CASE WHEN user_like.post_id IS NOT NULL THEN 1 ELSE 0 END as is_liked,
    latest_comment.content as latest_comment
FROM posts p
INNER JOIN users u ON p.user_id = u.user_id
INNER JOIN (
    SELECT followed_user_id 
    FROM user_follows 
    WHERE follower_user_id = 12345
) follows ON p.user_id = follows.followed_user_id
LEFT JOIN (
    SELECT 
        post_id,
        COUNT(*) as like_count
    FROM post_likes
    GROUP BY post_id
) like_stats ON p.post_id = like_stats.post_id
LEFT JOIN (
    SELECT 
        post_id,
        COUNT(*) as comment_count
    FROM post_comments
    GROUP BY post_id
) comment_stats ON p.post_id = comment_stats.post_id
LEFT JOIN (
    SELECT DISTINCT post_id
    FROM post_likes
    WHERE user_id = 12345
) user_like ON p.post_id = user_like.post_id
LEFT JOIN (
    SELECT 
        pc1.post_id,
        pc1.content
    FROM post_comments pc1
    INNER JOIN (
        SELECT 
            post_id,
            MAX(create_time) as max_time
        FROM post_comments
        GROUP BY post_id
    ) pc2 ON pc1.post_id = pc2.post_id AND pc1.create_time = pc2.max_time
) latest_comment ON p.post_id = latest_comment.post_id
WHERE p.create_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY p.create_time DESC
LIMIT 50;
```

**优化方案二：使用窗口函数**
```sql
-- 利用窗口函数优化聚合查询
SELECT 
    post_id,
    content,
    create_time,
    username,
    avatar,
    like_count,
    comment_count,
    is_liked,
    latest_comment
FROM (
    SELECT 
        p.post_id,
        p.content,
        p.create_time,
        u.username,
        u.avatar,
        COUNT(DISTINCT pl.like_id) as like_count,
        COUNT(DISTINCT pc.comment_id) as comment_count,
        MAX(CASE WHEN pl.user_id = 12345 THEN 1 ELSE 0 END) as is_liked,
        FIRST_VALUE(pc.content) OVER (
            PARTITION BY p.post_id 
            ORDER BY pc.create_time DESC
        ) as latest_comment,
        ROW_NUMBER() OVER (ORDER BY p.create_time DESC) as rn
    FROM posts p
    INNER JOIN users u ON p.user_id = u.user_id
    INNER JOIN user_follows uf ON p.user_id = uf.followed_user_id
    LEFT JOIN post_likes pl ON p.post_id = pl.post_id
    LEFT JOIN post_comments pc ON p.post_id = pc.post_id
    WHERE uf.follower_user_id = 12345
    AND p.create_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY p.post_id, p.content, p.create_time, u.username, u.avatar
    ORDER BY p.create_time DESC
) ranked_posts
WHERE rn <= 50;
```

**优化方案三：预计算统计数据**
```sql
-- 创建统计表存储预计算结果
CREATE TABLE post_statistics (
    post_id BIGINT PRIMARY KEY,
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    latest_comment_id BIGINT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_updated_at (updated_at)
);

-- 创建触发器维护统计数据
DELIMITER //
CREATE TRIGGER update_post_like_stats
AFTER INSERT ON post_likes
FOR EACH ROW
BEGIN
    INSERT INTO post_statistics (post_id, like_count)
    VALUES (NEW.post_id, 1)
    ON DUPLICATE KEY UPDATE 
        like_count = like_count + 1,
        updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER update_post_comment_stats
AFTER INSERT ON post_comments
FOR EACH ROW
BEGIN
    INSERT INTO post_statistics (post_id, comment_count, latest_comment_id)
    VALUES (NEW.post_id, 1, NEW.comment_id)
    ON DUPLICATE KEY UPDATE 
        comment_count = comment_count + 1,
        latest_comment_id = NEW.comment_id,
        updated_at = CURRENT_TIMESTAMP;
END//
DELIMITER ;

-- 优化后的查询
SELECT 
    p.post_id,
    p.content,
    p.create_time,
    u.username,
    u.avatar,
    COALESCE(ps.like_count, 0) as like_count,
    COALESCE(ps.comment_count, 0) as comment_count,
    CASE WHEN ul.post_id IS NOT NULL THEN 1 ELSE 0 END as is_liked,
    lc.content as latest_comment
FROM posts p
INNER JOIN users u ON p.user_id = u.user_id
INNER JOIN user_follows uf ON p.user_id = uf.followed_user_id
LEFT JOIN post_statistics ps ON p.post_id = ps.post_id
LEFT JOIN post_likes ul ON p.post_id = ul.post_id AND ul.user_id = 12345
LEFT JOIN post_comments lc ON ps.latest_comment_id = lc.comment_id
WHERE uf.follower_user_id = 12345
AND p.create_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY p.create_time DESC
LIMIT 50;
```

**优化方案四：分步查询策略**
```sql
-- 第一步：获取基础动态信息
SELECT 
    p.post_id,
    p.content,
    p.create_time,
    u.username,
    u.avatar
FROM posts p
INNER JOIN users u ON p.user_id = u.user_id
WHERE p.user_id IN (
    SELECT followed_user_id 
    FROM user_follows 
    WHERE follower_user_id = 12345
)
AND p.create_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY p.create_time DESC
LIMIT 50;

-- 第二步：批量获取统计信息
SELECT 
    post_id,
    COUNT(*) as like_count
FROM post_likes
WHERE post_id IN (动态ID列表)
GROUP BY post_id;

SELECT 
    post_id,
    COUNT(*) as comment_count
FROM post_comments
WHERE post_id IN (动态ID列表)
GROUP BY post_id;

-- 第三步：检查用户点赞状态
SELECT DISTINCT post_id
FROM post_likes
WHERE post_id IN (动态ID列表)
AND user_id = 12345;

-- 第四步：获取最新评论
SELECT 
    pc1.post_id,
    pc1.content
FROM post_comments pc1
INNER JOIN (
    SELECT 
        post_id,
        MAX(create_time) as max_time
    FROM post_comments
    WHERE post_id IN (动态ID列表)
    GROUP BY post_id
) pc2 ON pc1.post_id = pc2.post_id AND pc1.create_time = pc2.max_time;
```

**索引优化**：
```sql
-- 创建必要的复合索引
CREATE INDEX idx_posts_user_time ON posts(user_id, create_time DESC);
CREATE INDEX idx_user_follows_follower ON user_follows(follower_user_id, followed_user_id);
CREATE INDEX idx_post_likes_post_user ON post_likes(post_id, user_id);
CREATE INDEX idx_post_comments_post_time ON post_comments(post_id, create_time DESC);
CREATE INDEX idx_posts_time_id ON posts(create_time DESC, post_id);

-- 分析索引使用情况
EXPLAIN FORMAT=JSON [优化后的查询];
```

**性能对比测试**：
```sql
-- 测试各种优化方案
SET profiling = 1;

-- 原始查询（子查询版本）
[执行原始查询]

-- 优化方案1（JOIN版本）
[执行JOIN优化查询]

-- 优化方案2（窗口函数版本）
[执行窗口函数查询]

-- 优化方案3（预计算版本）
[执行预计算查询]

-- 优化方案4（分步查询版本）
[执行分步查询]

SHOW PROFILES;

-- 性能对比结果：
-- 原始查询：4.2秒，扫描1,200,000行
-- JOIN优化：0.8秒，扫描150,000行
-- 窗口函数：0.6秒，扫描120,000行
-- 预计算：0.1秒，扫描5,000行
-- 分步查询：0.3秒，总扫描80,000行
```

**最终推荐方案**：
```sql
-- 结合预计算和适当JOIN的混合方案
SELECT 
    p.post_id,
    p.content,
    p.create_time,
    u.username,
    u.avatar,
    COALESCE(ps.like_count, 0) as like_count,
    COALESCE(ps.comment_count, 0) as comment_count,
    CASE WHEN ul.user_id IS NOT NULL THEN 1 ELSE 0 END as is_liked,
    lc.content as latest_comment
FROM (
    SELECT 
        p.post_id,
        p.content,
        p.create_time,
        p.user_id
    FROM posts p
    INNER JOIN user_follows uf ON p.user_id = uf.followed_user_id
    WHERE uf.follower_user_id = 12345
    AND p.create_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ORDER BY p.create_time DESC
    LIMIT 50
) p
INNER JOIN users u ON p.user_id = u.user_id
LEFT JOIN post_statistics ps ON p.post_id = ps.post_id
LEFT JOIN post_likes ul ON p.post_id = ul.post_id AND ul.user_id = 12345
LEFT JOIN post_comments lc ON ps.latest_comment_id = lc.comment_id
ORDER BY p.create_time DESC;
```

**优化效果总结**：
- **查询时间**：从4.2秒优化到0.1秒，提升97.6%
- **扫描行数**：从1,200,000行减少到5,000行，减少99.6%
- **子查询消除**：从200次子查询减少到0次
- **并发性能**：支持并发查询数从20提升到500
- **系统负载**：数据库CPU使用率从85%降低到10%

### 聚合查询优化

#### GROUP BY 优化

**索引利用**：
- 在 GROUP BY 列上建立索引
- 考虑复合索引的列顺序
- 利用索引的有序性避免排序
- 使用覆盖索引减少回表

**松散索引扫描**：
- 利用索引的稀疏性
- 跳过不需要的索引项
- 适用于 GROUP BY 的前缀列
- 显著提高聚合查询性能

**分组条件优化**：
- 将过滤条件放在 WHERE 而不是 HAVING
- 减少分组前的数据量
- 避免在 GROUP BY 中使用表达式
- 考虑预聚合的可能性

#### ORDER BY 优化

**索引排序**：
- 利用索引的有序性
- 避免额外的排序操作
- 考虑复合索引的列顺序
- 注意 ASC/DESC 的混合使用

**LIMIT 优化**：
- 结合 LIMIT 使用索引
- 避免大偏移量的分页
- 考虑游标分页
- 使用覆盖索引优化

**排序缓冲区**：
- 调整 sort_buffer_size 参数
- 避免使用临时文件
- 监控排序操作的性能
- 考虑内存和 I/O 的平衡

#### 实战案例：电商平台销售数据统计优化

**业务场景**：电商平台需要生成各种销售统计报表，包括按商品类别、时间维度的销售汇总

**原始问题查询**：
```sql
-- 生成月度销售报表（性能差）
SELECT 
    YEAR(o.create_time) as year,
    MONTH(o.create_time) as month,
    c.category_name,
    COUNT(DISTINCT o.order_id) as order_count,
    COUNT(oi.item_id) as item_count,
    SUM(oi.quantity * oi.price) as total_amount,
    AVG(oi.quantity * oi.price) as avg_amount,
    MAX(oi.quantity * oi.price) as max_amount
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id
JOIN categories c ON p.category_id = c.category_id
WHERE o.create_time >= '2023-01-01'
AND o.status = 'completed'
GROUP BY YEAR(o.create_time), MONTH(o.create_time), c.category_id, c.category_name
HAVING SUM(oi.quantity * oi.price) > 10000
ORDER BY year DESC, month DESC, total_amount DESC;
```

**性能问题分析**：
```sql
-- 执行计划分析
EXPLAIN FORMAT=JSON [上述查询];

-- 问题发现：
-- 1. GROUP BY中使用了函数YEAR()和MONTH()
-- 2. 多次计算表达式oi.quantity * oi.price
-- 3. HAVING条件应该在WHERE中处理
-- 4. 缺少合适的复合索引
-- 5. 大量的表连接和聚合计算

-- 性能测试结果：
-- 执行时间：8.5秒
-- 扫描行数：3,200,000行
-- 临时表：使用大型临时表
-- 文件排序：是
-- 内存使用：超过sort_buffer_size
```

**数据量分析**：
```sql
-- 查看各表数据量
SELECT 
    'orders' as table_name, COUNT(*) as row_count,
    MIN(create_time) as min_date, MAX(create_time) as max_date
FROM orders
UNION ALL
SELECT 'order_items', COUNT(*), NULL, NULL FROM order_items
UNION ALL
SELECT 'products', COUNT(*), NULL, NULL FROM products
UNION ALL
SELECT 'categories', COUNT(*), NULL, NULL FROM categories;

-- 结果：
-- orders: 800,000行 (2020-01-01 到 2023-12-31)
-- order_items: 3,200,000行
-- products: 50,000行
-- categories: 200行

-- 分析聚合数据分布
SELECT 
    DATE_FORMAT(create_time, '%Y-%m') as month,
    COUNT(*) as order_count
FROM orders
WHERE create_time >= '2023-01-01'
AND status = 'completed'
GROUP BY DATE_FORMAT(create_time, '%Y-%m')
ORDER BY month;
```

**优化方案实施**：

**第一步：查询重构**
```sql
-- 优化后的查询
SELECT 
    DATE_FORMAT(o.create_time, '%Y') as year,
    DATE_FORMAT(o.create_time, '%m') as month,
    c.category_name,
    COUNT(DISTINCT o.order_id) as order_count,
    COUNT(oi.item_id) as item_count,
    SUM(oi.total_price) as total_amount,
    AVG(oi.total_price) as avg_amount,
    MAX(oi.total_price) as max_amount
FROM orders o
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
INNER JOIN categories c ON p.category_id = c.category_id
WHERE o.create_time >= '2023-01-01'
AND o.status = 'completed'
AND oi.total_price > 0  -- 预过滤
GROUP BY 
    DATE_FORMAT(o.create_time, '%Y-%m'),
    c.category_id,
    c.category_name
HAVING total_amount > 10000
ORDER BY year DESC, month DESC, total_amount DESC;
```

**第二步：添加计算列优化**
```sql
-- 为order_items表添加计算列
ALTER TABLE order_items 
ADD COLUMN total_price DECIMAL(10,2) 
GENERATED ALWAYS AS (quantity * price) STORED;

-- 为orders表添加日期相关列
ALTER TABLE orders 
ADD COLUMN year_month VARCHAR(7) 
GENERATED ALWAYS AS (DATE_FORMAT(create_time, '%Y-%m')) STORED;

-- 创建优化索引
CREATE INDEX idx_orders_yearmonth_status ON orders(year_month, status, order_id);
CREATE INDEX idx_order_items_order_total ON order_items(order_id, total_price);
CREATE INDEX idx_products_category ON products(category_id, product_id);
```

**第三步：使用计算列的优化查询**
```sql
-- 最终优化查询
SELECT 
    SUBSTRING(o.year_month, 1, 4) as year,
    SUBSTRING(o.year_month, 6, 2) as month,
    c.category_name,
    COUNT(DISTINCT o.order_id) as order_count,
    COUNT(oi.item_id) as item_count,
    SUM(oi.total_price) as total_amount,
    AVG(oi.total_price) as avg_amount,
    MAX(oi.total_price) as max_amount
FROM orders o
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
INNER JOIN categories c ON p.category_id = c.category_id
WHERE o.year_month >= '2023-01'
AND o.status = 'completed'
AND oi.total_price > 0
GROUP BY o.year_month, c.category_id, c.category_name
HAVING total_amount > 10000
ORDER BY year DESC, month DESC, total_amount DESC;
```

**第四步：预聚合表优化**
```sql
-- 创建预聚合表
CREATE TABLE sales_summary_monthly (
    year_month VARCHAR(7),
    category_id INT,
    category_name VARCHAR(100),
    order_count INT,
    item_count INT,
    total_amount DECIMAL(15,2),
    avg_amount DECIMAL(10,2),
    max_amount DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (year_month, category_id),
    INDEX idx_amount (total_amount DESC),
    INDEX idx_yearmonth (year_month DESC)
);

-- 创建聚合数据的存储过程
DELIMITER //
CREATE PROCEDURE UpdateMonthlySalesSummary(IN target_month VARCHAR(7))
BEGIN
    -- 删除已存在的数据
    DELETE FROM sales_summary_monthly WHERE year_month = target_month;
    
    -- 插入新的聚合数据
    INSERT INTO sales_summary_monthly (
        year_month, category_id, category_name,
        order_count, item_count, total_amount, avg_amount, max_amount
    )
    SELECT 
        o.year_month,
        c.category_id,
        c.category_name,
        COUNT(DISTINCT o.order_id),
        COUNT(oi.item_id),
        SUM(oi.total_price),
        AVG(oi.total_price),
        MAX(oi.total_price)
    FROM orders o
    INNER JOIN order_items oi ON o.order_id = oi.order_id
    INNER JOIN products p ON oi.product_id = p.product_id
    INNER JOIN categories c ON p.category_id = c.category_id
    WHERE o.year_month = target_month
    AND o.status = 'completed'
    AND oi.total_price > 0
    GROUP BY o.year_month, c.category_id, c.category_name;
END //
DELIMITER ;

-- 使用预聚合表的查询
SELECT 
    SUBSTRING(year_month, 1, 4) as year,
    SUBSTRING(year_month, 6, 2) as month,
    category_name,
    order_count,
    item_count,
    total_amount,
    avg_amount,
    max_amount
FROM sales_summary_monthly
WHERE year_month >= '2023-01'
AND total_amount > 10000
ORDER BY year_month DESC, total_amount DESC;
```

**性能测试对比**：
```sql
-- 性能测试
SET profiling = 1;

-- 原始查询
[执行原始查询]

-- 优化查询（使用计算列）
[执行优化查询]

-- 预聚合查询
[执行预聚合查询]

SHOW PROFILES;
```

**优化效果总结**：
```
-- 性能对比结果：
-- 原始查询：
--   执行时间：8.5秒
--   扫描行数：3,200,000行
--   临时表：大型临时表
--   内存使用：512MB

-- 计算列优化：
--   执行时间：1.2秒
--   扫描行数：800,000行
--   临时表：中型临时表
--   内存使用：128MB

-- 预聚合优化：
--   执行时间：15毫秒
--   扫描行数：240行
--   临时表：无
--   内存使用：2MB

-- 最终性能提升：99.8%
-- 扫描行数减少：99.99%
```

**业务价值**：
- 报表生成时间从8.5秒降低到15毫秒
- 支持实时报表查询需求
- 数据库负载降低95%
- 支持更复杂的多维度分析
- 为BI系统提供高性能数据源

**维护策略**：
```sql
-- 创建定时任务更新预聚合数据
CREATE EVENT update_monthly_sales
ON SCHEDULE EVERY 1 DAY
STARTS '2023-01-01 02:00:00'
DO
  CALL UpdateMonthlySalesSummary(DATE_FORMAT(CURDATE(), '%Y-%m'));

-- 监控聚合表数据质量
SELECT 
    year_month,
    COUNT(*) as category_count,
    SUM(total_amount) as month_total,
    MAX(updated_at) as last_update
FROM sales_summary_monthly
GROUP BY year_month
ORDER BY year_month DESC;
```

## 索引优化策略

### 索引设计原则

#### 选择性分析

**高选择性列**：
- 优先为高选择性的列建立索引
- 选择性 = 不同值的数量 / 总行数
- 选择性越高，索引效果越好
- 考虑数据分布的均匀性

**复合索引设计**：
- 将选择性高的列放在前面
- 考虑查询条件的组合
- 遵循最左前缀匹配原则
- 平衡索引的大小和效果

**索引长度控制**：
- 使用前缀索引减少索引大小
- 平衡索引长度和选择性
- 考虑字符集和排序规则的影响
- 监控索引的使用效果

#### 索引维护策略

**索引监控**：
- 定期检查索引的使用情况
- 识别未使用的索引
- 监控索引的选择性变化
- 分析索引的维护成本

**索引重建**：
- 定期重建碎片化的索引
- 使用 OPTIMIZE TABLE 整理表
- 考虑在线重建的影响
- 制定索引维护计划

**索引删除**：
- 删除重复和冗余的索引
- 清理未使用的索引
- 考虑索引对写性能的影响
- 保留必要的约束索引

### 覆盖索引应用

#### 覆盖索引原理

**定义**：
- 索引包含查询所需的所有列
- 不需要回表查询数据行
- 直接从索引获取结果
- 显著提高查询性能

**优势**：
- 减少 I/O 操作
- 提高缓存命中率
- 降低锁竞争
- 改善并发性能

**设计考虑**：
- 平衡索引大小和覆盖范围
- 考虑查询模式的变化
- 评估维护成本
- 监控使用效果

#### 覆盖索引实践

**查询分析**：
- 识别频繁执行的查询
- 分析查询涉及的列
- 评估覆盖索引的可行性
- 考虑查询的变化趋势

**索引设计**：
- 将查询条件列放在前面
- 添加 SELECT 列到索引末尾
- 考虑列的大小和类型
- 评估索引的总体大小

**效果验证**：
- 使用 EXPLAIN 验证索引使用
- 监控查询性能的改善
- 检查 Extra 字段的 "Using index"
- 测试不同查询模式的效果

### 实战案例：电商商品搜索索引优化

**业务场景**：电商平台商品搜索功能性能优化

**原始查询性能问题**：
```sql
-- 商品搜索查询（性能差）
SELECT id, name, price, category_id, brand_id, stock, rating
FROM products
WHERE category_id = 123
AND price BETWEEN 100 AND 500
AND stock > 0
AND status = 'active'
ORDER BY rating DESC, price ASC
LIMIT 20;
```

**原始执行计划**：
```
+----+-------------+----------+------+---------------+------+---------+------+--------+-----------------------------+
| id | select_type | table    | type | possible_keys | key  | key_len | ref  | rows   | Extra                       |
+----+-------------+----------+------+---------------+------+---------+------+--------+-----------------------------+
|  1 | SIMPLE      | products | ALL  | NULL          | NULL | NULL    | NULL | 500000 | Using where; Using filesort |
+----+-------------+----------+------+---------------+------+---------+------+--------+-----------------------------+
```

**性能问题**：
- 执行时间：1.8秒
- 扫描行数：50万行
- 使用文件排序
- 无索引支持

**索引优化策略**：

**第一步：基础索引创建**
```sql
-- 创建基础复合索引
CREATE INDEX idx_products_search_v1 ON products(
    category_id, 
    status, 
    price, 
    stock
);
```

**测试结果v1**：
- 执行时间：450毫秒
- 扫描行数：8500行
- 仍需要文件排序

**第二步：优化排序**
```sql
-- 优化排序的复合索引
CREATE INDEX idx_products_search_v2 ON products(
    category_id, 
    status, 
    rating DESC,
    price ASC,
    stock
);
```

**测试结果v2**：
- 执行时间：180毫秒
- 扫描行数：2100行
- 避免了文件排序

**第三步：覆盖索引优化**
```sql
-- 创建覆盖索引（包含所有查询列）
CREATE INDEX idx_products_search_covering ON products(
    category_id, 
    status, 
    rating DESC,
    price ASC,
    stock,
    -- 添加SELECT列到索引中
    id,
    name,
    brand_id
);
```

**最终执行计划**：
```
+----+-------------+----------+-------+-------------------------+-------------------------+---------+------+------+-------------+
| id | select_type | table    | type  | possible_keys           | key                     | key_len | ref  | rows | Extra       |
+----+-------------+----------+-------+-------------------------+-------------------------+---------+------+------+-------------+
|  1 | SIMPLE      | products | range | idx_products_search_covering | idx_products_search_covering | 12      | NULL | 156  | Using index |
+----+-------------+----------+-------+-------------------------+-------------------------+---------+------+------+-------------+
```

**最终性能效果**：
- 执行时间：12毫秒（提升99.3%）
- 扫描行数：156行（减少99.97%）
- 完全避免回表查询（Using index）
- 无需文件排序
- 内存使用减少95%

**索引大小对比**：
```sql
-- 查看索引大小
SELECT 
    INDEX_NAME,
    ROUND(STAT_VALUE * @@innodb_page_size / 1024 / 1024, 2) AS 'Size (MB)'
FROM mysql.innodb_index_stats 
WHERE TABLE_NAME = 'products' 
AND STAT_NAME = 'size'
ORDER BY STAT_VALUE DESC;

-- 结果
-- idx_products_search_covering: 45.2 MB
-- idx_products_search_v2: 28.1 MB
-- idx_products_search_v1: 22.3 MB
```

**业务价值**：
- 搜索响应时间从1.8秒降低到12毫秒
- 用户体验显著提升
- 服务器并发能力提升150倍
- 减少了99%的I/O操作
- 降低了服务器资源消耗

**索引维护策略**：
```sql
-- 定期监控索引使用情况
SELECT 
    OBJECT_SCHEMA,
    OBJECT_NAME,
    INDEX_NAME,
    COUNT_FETCH,
    COUNT_INSERT,
    COUNT_UPDATE,
    COUNT_DELETE
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE OBJECT_SCHEMA = 'ecommerce'
AND OBJECT_NAME = 'products'
ORDER BY COUNT_FETCH DESC;

-- 定期更新统计信息
ANALYZE TABLE products;

-- 监控索引碎片
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    ROUND(DATA_LENGTH/1024/1024, 2) AS 'Data Size (MB)',
    ROUND(INDEX_LENGTH/1024/1024, 2) AS 'Index Size (MB)',
    ROUND(DATA_FREE/1024/1024, 2) AS 'Free Space (MB)'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'ecommerce'
AND TABLE_NAME = 'products';
```

## 查询缓存优化

### 查询缓存机制

#### 缓存原理

**缓存过程**：
- 查询执行前检查缓存
- 缓存命中直接返回结果
- 缓存未命中执行查询并缓存结果
- 表数据变化时清除相关缓存

**缓存键值**：
- 基于完整的 SQL 语句
- 包括查询字符串、数据库、协议版本等
- 大小写敏感
- 空格和注释影响缓存键

**缓存失效**：
- 表结构变化
- 表数据修改
- 权限变化
- 系统变量修改

#### 缓存配置

**启用查询缓存**：
- 设置 query_cache_type 参数
- 配置 query_cache_size 大小
- 调整 query_cache_limit 限制
- 监控缓存使用情况

**缓存优化**：
- 合理设置缓存大小
- 避免缓存碎片
- 监控缓存命中率
- 定期清理缓存

**注意事项**：
- MySQL 8.0 已移除查询缓存
- 高并发写入场景下效果有限
- 考虑应用层缓存替代
- 评估缓存的维护成本

### 应用层缓存策略

#### 缓存设计

**缓存层次**：
- 应用程序缓存
- 分布式缓存（Redis、Memcached）
- 数据库查询缓存
- 操作系统缓存

**缓存策略**：
- **Cache-Aside**：应用程序管理缓存
- **Write-Through**：写入时同步更新缓存
- **Write-Behind**：异步更新缓存
- **Refresh-Ahead**：预先刷新缓存

**缓存键设计**：
- 使用有意义的键名
- 包含版本信息
- 考虑键的过期策略
- 避免键冲突

#### 缓存实践

**缓存粒度**：
- 页面级缓存
- 查询结果缓存
- 对象级缓存
- 片段缓存

**缓存更新**：
- 基于时间的过期
- 基于事件的失效
- 手动刷新机制
- 版本控制策略

**缓存监控**：
- 缓存命中率统计
- 缓存大小监控
- 缓存性能分析
- 缓存异常处理

#### 实战案例：社交媒体平台多级缓存架构优化

**业务场景**：社交媒体平台用户动态流（Timeline）性能优化

**原始架构问题**：
```sql
-- 用户动态流查询（高频访问）
SELECT 
    p.post_id,
    p.content,
    p.created_at,
    p.like_count,
    p.comment_count,
    u.username,
    u.avatar_url,
    GROUP_CONCAT(t.tag_name) as tags
FROM posts p
JOIN users u ON p.user_id = u.user_id
JOIN user_follows f ON p.user_id = f.followed_user_id
LEFT JOIN post_tags pt ON p.post_id = pt.post_id
LEFT JOIN tags t ON pt.tag_id = t.tag_id
WHERE f.follower_user_id = ?
AND p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
AND p.status = 'published'
GROUP BY p.post_id
ORDER BY p.created_at DESC
LIMIT 20;

-- 性能问题：
-- 1. 复杂的多表连接
-- 2. 每次请求都查询数据库
-- 3. 高并发时数据库压力巨大
-- 4. 响应时间不稳定

-- 当前性能指标：
-- 平均响应时间：800ms
-- 95%响应时间：1.5s
-- QPS：1000次/秒
-- 数据库CPU使用率：90%
-- 数据库连接数：300+
```

**多级缓存架构设计**：

**第一级：应用内存缓存（L1 Cache）**
```java
// Java应用内存缓存实现
@Component
public class TimelineL1Cache {
    private final Cache<String, List<PostDTO>> cache;
    
    public TimelineL1Cache() {
        this.cache = Caffeine.newBuilder()
            .maximumSize(10000)  // 最大缓存条目数
            .expireAfterWrite(Duration.ofMinutes(5))  // 5分钟过期
            .recordStats()  // 启用统计
            .build();
    }
    
    public List<PostDTO> getTimeline(Long userId) {
        String cacheKey = "timeline:" + userId;
        return cache.getIfPresent(cacheKey);
    }
    
    public void putTimeline(Long userId, List<PostDTO> timeline) {
        String cacheKey = "timeline:" + userId;
        cache.put(cacheKey, timeline);
    }
    
    public void invalidateUser(Long userId) {
        String cacheKey = "timeline:" + userId;
        cache.invalidate(cacheKey);
    }
    
    // 缓存统计
    public CacheStats getStats() {
        return cache.stats();
    }
}
```

**第二级：分布式缓存（L2 Cache - Redis）**
```java
@Service
public class TimelineL2Cache {
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    private static final int CACHE_TTL = 1800; // 30分钟
    private static final String CACHE_PREFIX = "timeline:v2:";
    
    public List<PostDTO> getTimeline(Long userId) {
        String cacheKey = CACHE_PREFIX + userId;
        try {
            Object cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return (List<PostDTO>) cached;
            }
        } catch (Exception e) {
            log.warn("Redis cache get failed for user: {}", userId, e);
        }
        return null;
    }
    
    public void putTimeline(Long userId, List<PostDTO> timeline) {
        String cacheKey = CACHE_PREFIX + userId;
        try {
            redisTemplate.opsForValue().set(cacheKey, timeline, CACHE_TTL, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.warn("Redis cache put failed for user: {}", userId, e);
        }
    }
    
    public void invalidateUser(Long userId) {
        String cacheKey = CACHE_PREFIX + userId;
        try {
            redisTemplate.delete(cacheKey);
        } catch (Exception e) {
            log.warn("Redis cache invalidate failed for user: {}", userId, e);
        }
    }
    
    // 批量失效（当用户发布新动态时）
    public void invalidateFollowers(Long userId) {
        try {
            // 获取关注者列表
            List<Long> followers = getFollowers(userId);
            
            // 批量删除关注者的时间线缓存
            List<String> keysToDelete = followers.stream()
                .map(followerId -> CACHE_PREFIX + followerId)
                .collect(Collectors.toList());
                
            if (!keysToDelete.isEmpty()) {
                redisTemplate.delete(keysToDelete);
            }
        } catch (Exception e) {
            log.warn("Batch cache invalidation failed for user: {}", userId, e);
        }
    }
}
```

**第三级：数据库查询优化**
```sql
-- 优化后的查询（减少JOIN）
-- 第一步：获取用户关注的动态ID列表
SELECT p.post_id, p.created_at
FROM posts p
JOIN user_follows f ON p.user_id = f.followed_user_id
WHERE f.follower_user_id = ?
AND p.created_at >= ?
AND p.status = 'published'
ORDER BY p.created_at DESC
LIMIT 20;

-- 第二步：批量获取动态详情
SELECT 
    p.post_id,
    p.content,
    p.created_at,
    p.like_count,
    p.comment_count,
    p.user_id
FROM posts p
WHERE p.post_id IN (?, ?, ?, ...)
ORDER BY p.created_at DESC;

-- 第三步：批量获取用户信息
SELECT user_id, username, avatar_url
FROM users
WHERE user_id IN (?, ?, ?, ...);

-- 第四步：批量获取标签信息
SELECT 
    pt.post_id,
    GROUP_CONCAT(t.tag_name) as tags
FROM post_tags pt
JOIN tags t ON pt.tag_id = t.tag_id
WHERE pt.post_id IN (?, ?, ?, ...)
GROUP BY pt.post_id;
```

**缓存服务整合**：
```java
@Service
public class TimelineService {
    @Autowired
    private TimelineL1Cache l1Cache;
    
    @Autowired
    private TimelineL2Cache l2Cache;
    
    @Autowired
    private TimelineRepository repository;
    
    public List<PostDTO> getUserTimeline(Long userId) {
        // L1缓存查询
        List<PostDTO> timeline = l1Cache.getTimeline(userId);
        if (timeline != null) {
            recordCacheHit("L1", userId);
            return timeline;
        }
        
        // L2缓存查询
        timeline = l2Cache.getTimeline(userId);
        if (timeline != null) {
            recordCacheHit("L2", userId);
            // 回填L1缓存
            l1Cache.putTimeline(userId, timeline);
            return timeline;
        }
        
        // 数据库查询
        recordCacheMiss(userId);
        timeline = repository.getUserTimeline(userId);
        
        // 回填缓存
        if (timeline != null && !timeline.isEmpty()) {
            l2Cache.putTimeline(userId, timeline);
            l1Cache.putTimeline(userId, timeline);
        }
        
        return timeline;
    }
    
    // 发布新动态时的缓存失效
    @Async
    public void onPostPublished(Long userId, Long postId) {
        // 异步失效相关缓存
        CompletableFuture.runAsync(() -> {
            // 失效发布者的关注者缓存
            l2Cache.invalidateFollowers(userId);
            
            // 预热热门用户的缓存
            if (isHotUser(userId)) {
                preWarmFollowersCache(userId);
            }
        });
    }
    
    // 缓存预热
    @Async
    public void preWarmFollowersCache(Long userId) {
        List<Long> activeFollowers = getActiveFollowers(userId);
        
        activeFollowers.parallelStream()
            .limit(100)  // 限制预热数量
            .forEach(followerId -> {
                try {
                    // 异步预热缓存
                    getUserTimeline(followerId);
                } catch (Exception e) {
                    log.warn("Cache pre-warm failed for user: {}", followerId, e);
                }
            });
    }
}
```

**缓存监控和指标**：
```java
@Component
public class CacheMetrics {
    private final MeterRegistry meterRegistry;
    private final Counter l1Hits;
    private final Counter l2Hits;
    private final Counter cacheMisses;
    private final Timer queryTimer;
    
    public CacheMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.l1Hits = Counter.builder("cache.hits")
            .tag("level", "L1")
            .register(meterRegistry);
        this.l2Hits = Counter.builder("cache.hits")
            .tag("level", "L2")
            .register(meterRegistry);
        this.cacheMisses = Counter.builder("cache.misses")
            .register(meterRegistry);
        this.queryTimer = Timer.builder("timeline.query.duration")
            .register(meterRegistry);
    }
    
    public void recordL1Hit() {
        l1Hits.increment();
    }
    
    public void recordL2Hit() {
        l2Hits.increment();
    }
    
    public void recordCacheMiss() {
        cacheMisses.increment();
    }
    
    // 计算缓存命中率
    @Scheduled(fixedRate = 60000) // 每分钟计算一次
    public void calculateHitRates() {
        double l1HitRate = l1Hits.count() / (l1Hits.count() + l2Hits.count() + cacheMisses.count());
        double l2HitRate = l2Hits.count() / (l2Hits.count() + cacheMisses.count());
        double totalHitRate = (l1Hits.count() + l2Hits.count()) / 
            (l1Hits.count() + l2Hits.count() + cacheMisses.count());
        
        Gauge.builder("cache.hit.rate")
            .tag("level", "L1")
            .register(meterRegistry, () -> l1HitRate);
        
        Gauge.builder("cache.hit.rate")
            .tag("level", "L2")
            .register(meterRegistry, () -> l2HitRate);
            
        Gauge.builder("cache.hit.rate")
            .tag("level", "total")
            .register(meterRegistry, () -> totalHitRate);
    }
}
```

**缓存配置优化**：
```yaml
# application.yml
spring:
  redis:
    host: redis-cluster.internal
    port: 6379
    password: ${REDIS_PASSWORD}
    timeout: 2000ms
    lettuce:
      pool:
        max-active: 200
        max-idle: 20
        min-idle: 5
        max-wait: 1000ms

# 缓存配置
cache:
  l1:
    max-size: 10000
    expire-after-write: 5m
    record-stats: true
  l2:
    ttl: 30m
    max-memory: 2gb
    eviction-policy: allkeys-lru

# 监控配置
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,prometheus
  metrics:
    export:
      prometheus:
        enabled: true
```

**性能测试结果**：
```
-- 优化前：
-- 平均响应时间：800ms
-- 95%响应时间：1.5s
-- QPS：1000次/秒
-- 数据库CPU使用率：90%
-- 数据库连接数：300+
-- 缓存命中率：0%

-- 优化后（多级缓存）：
-- 平均响应时间：45ms
-- 95%响应时间：120ms
-- QPS：8000次/秒
-- 数据库CPU使用率：25%
-- 数据库连接数：50+
-- L1缓存命中率：75%
-- L2缓存命中率：20%
-- 总缓存命中率：95%

-- 性能提升：
-- 响应时间提升：94.4%
-- 吞吐量提升：700%
-- 数据库负载降低：72%
```

**业务价值**：
- 用户体验显著提升，页面加载速度提升94%
- 系统并发能力提升8倍
- 数据库资源成本降低70%
- 系统稳定性和可用性大幅提升
- 支持业务快速增长和流量突发

**运维和监控**：
```bash
# Redis监控脚本
#!/bin/bash
# redis_monitor.sh

REDIS_CLI="redis-cli -h redis-cluster.internal -p 6379"

echo "=== Redis Cache Statistics ==="
echo "Memory Usage:"
$REDIS_CLI info memory | grep used_memory_human

echo "\nHit Rate:"
$REDIS_CLI info stats | grep keyspace_hits
$REDIS_CLI info stats | grep keyspace_misses

echo "\nConnected Clients:"
$REDIS_CLI info clients | grep connected_clients

echo "\nCache Keys Count:"
$REDIS_CLI eval "return #redis.call('keys', 'timeline:*')" 0

# 应用缓存监控
echo "\n=== Application Cache Statistics ==="
curl -s http://localhost:8080/actuator/metrics/cache.hits | jq '.measurements[0].value'
curl -s http://localhost:8080/actuator/metrics/cache.misses | jq '.measurements[0].value'
```

**最佳实践总结**：
1. **分层缓存**：L1本地缓存 + L2分布式缓存 + 数据库优化
2. **缓存策略**：根据数据特性选择合适的缓存策略
3. **失效机制**：建立完善的缓存失效和更新机制
4. **监控告警**：实时监控缓存性能和命中率
5. **容错设计**：缓存故障时的降级和恢复机制
6. **容量规划**：根据业务增长合理规划缓存容量
7. **预热策略**：关键数据的缓存预热机制

## 性能监控与诊断

### 性能指标监控

#### 关键性能指标

**查询性能指标**：
- 查询响应时间
- 查询吞吐量（QPS）
- 慢查询数量和比例
- 查询错误率

**资源使用指标**：
- CPU 使用率
- 内存使用率
- I/O 使用率
- 网络使用率

**数据库内部指标**：
- 缓冲池命中率
- 索引使用情况
- 锁等待时间
- 连接数和并发度

#### 监控工具

**MySQL 内置工具**：
- Performance Schema
- Information Schema
- SHOW STATUS 命令
- 慢查询日志

**第三方监控工具**：
- Percona Monitoring and Management (PMM)
- MySQL Enterprise Monitor
- Zabbix
- Prometheus + Grafana

**系统监控工具**：
- top、htop
- iostat、iotop
- vmstat
- netstat

#### 实战案例：电商平台数据库性能监控体系建设

**业务背景**：某大型电商平台需要建立完善的数据库性能监控体系，确保系统稳定运行

**监控需求**：
- 实时监控数据库性能指标
- 及时发现和预警性能问题
- 提供详细的性能分析报告
- 支持历史数据分析和趋势预测

**监控架构设计**：

**第一层：数据采集层**
```sql
-- 1. 启用Performance Schema
SET GLOBAL performance_schema = ON;

-- 2. 配置关键监控项
UPDATE performance_schema.setup_instruments 
SET ENABLED = 'YES', TIMED = 'YES' 
WHERE NAME LIKE '%statement/%' 
   OR NAME LIKE '%stage/%'
   OR NAME LIKE '%wait/io/%'
   OR NAME LIKE '%wait/lock/%';

-- 3. 启用关键监控表
UPDATE performance_schema.setup_consumers 
SET ENABLED = 'YES' 
WHERE NAME IN (
    'events_statements_current',
    'events_statements_history',
    'events_statements_history_long',
    'events_waits_current',
    'events_waits_history',
    'events_waits_history_long'
);

-- 4. 配置慢查询日志
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 0.5;
SET GLOBAL log_queries_not_using_indexes = 'ON';
SET GLOBAL log_slow_admin_statements = 'ON';
SET GLOBAL log_slow_slave_statements = 'ON';
```

**第二层：指标计算层**
```python
# Python监控脚本
import pymysql
import time
import json
from datetime import datetime
import redis

class MySQLMonitor:
    def __init__(self, host, port, user, password, database):
        self.connection = pymysql.connect(
            host=host, port=port, user=user, 
            password=password, database=database
        )
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0)
        
    def collect_performance_metrics(self):
        """收集性能指标"""
        metrics = {}
        
        # 1. 基础性能指标
        basic_metrics = self._get_basic_metrics()
        metrics.update(basic_metrics)
        
        # 2. 查询性能指标
        query_metrics = self._get_query_metrics()
        metrics.update(query_metrics)
        
        # 3. 资源使用指标
        resource_metrics = self._get_resource_metrics()
        metrics.update(resource_metrics)
        
        # 4. 锁和等待指标
        lock_metrics = self._get_lock_metrics()
        metrics.update(lock_metrics)
        
        return metrics
    
    def _get_basic_metrics(self):
        """获取基础指标"""
        cursor = self.connection.cursor()
        
        # QPS和TPS
        cursor.execute("""
            SELECT 
                VARIABLE_NAME, 
                VARIABLE_VALUE 
            FROM performance_schema.global_status 
            WHERE VARIABLE_NAME IN (
                'Queries', 'Com_select', 'Com_insert', 
                'Com_update', 'Com_delete', 'Connections',
                'Threads_connected', 'Threads_running'
            )
        """)
        
        status_vars = dict(cursor.fetchall())
        
        # 计算QPS（需要与上次采集时间对比）
        current_time = time.time()
        current_queries = int(status_vars.get('Queries', 0))
        
        last_time = self.redis_client.get('last_collect_time')
        last_queries = self.redis_client.get('last_queries')
        
        qps = 0
        if last_time and last_queries:
            time_diff = current_time - float(last_time)
            query_diff = current_queries - int(last_queries)
            qps = query_diff / time_diff if time_diff > 0 else 0
        
        # 保存当前值
        self.redis_client.set('last_collect_time', current_time)
        self.redis_client.set('last_queries', current_queries)
        
        return {
            'qps': round(qps, 2),
            'connections': int(status_vars.get('Connections', 0)),
            'threads_connected': int(status_vars.get('Threads_connected', 0)),
            'threads_running': int(status_vars.get('Threads_running', 0))
        }
    
    def _get_query_metrics(self):
        """获取查询性能指标"""
        cursor = self.connection.cursor()
        
        # 慢查询统计
        cursor.execute("""
            SELECT 
                COUNT(*) as slow_query_count,
                AVG(TIMER_WAIT/1000000000) as avg_duration,
                MAX(TIMER_WAIT/1000000000) as max_duration
            FROM performance_schema.events_statements_history_long 
            WHERE TIMER_WAIT > 500000000  -- 0.5秒
            AND EVENT_NAME LIKE 'statement/sql/%'
        """)
        
        slow_query_result = cursor.fetchone()
        
        # 查询类型分布
        cursor.execute("""
            SELECT 
                SQL_TEXT,
                COUNT(*) as execution_count,
                AVG(TIMER_WAIT/1000000000) as avg_duration,
                SUM(TIMER_WAIT/1000000000) as total_duration
            FROM performance_schema.events_statements_history_long 
            WHERE EVENT_NAME LIKE 'statement/sql/%'
            GROUP BY LEFT(SQL_TEXT, 100)
            ORDER BY total_duration DESC
            LIMIT 10
        """)
        
        top_queries = cursor.fetchall()
        
        return {
            'slow_query_count': slow_query_result[0] or 0,
            'avg_query_duration': round(slow_query_result[1] or 0, 3),
            'max_query_duration': round(slow_query_result[2] or 0, 3),
            'top_queries': list(top_queries)
        }
    
    def _get_resource_metrics(self):
        """获取资源使用指标"""
        cursor = self.connection.cursor()
        
        # InnoDB缓冲池命中率
        cursor.execute("""
            SELECT 
                VARIABLE_NAME, 
                VARIABLE_VALUE 
            FROM performance_schema.global_status 
            WHERE VARIABLE_NAME IN (
                'Innodb_buffer_pool_read_requests',
                'Innodb_buffer_pool_reads',
                'Innodb_buffer_pool_pages_total',
                'Innodb_buffer_pool_pages_free',
                'Innodb_buffer_pool_pages_dirty'
            )
        """)
        
        innodb_vars = dict(cursor.fetchall())
        
        # 计算缓冲池命中率
        read_requests = int(innodb_vars.get('Innodb_buffer_pool_read_requests', 0))
        reads = int(innodb_vars.get('Innodb_buffer_pool_reads', 0))
        hit_rate = (1 - reads / read_requests) * 100 if read_requests > 0 else 0
        
        # 缓冲池使用率
        total_pages = int(innodb_vars.get('Innodb_buffer_pool_pages_total', 0))
        free_pages = int(innodb_vars.get('Innodb_buffer_pool_pages_free', 0))
        dirty_pages = int(innodb_vars.get('Innodb_buffer_pool_pages_dirty', 0))
        
        used_pages = total_pages - free_pages
        usage_rate = (used_pages / total_pages) * 100 if total_pages > 0 else 0
        dirty_rate = (dirty_pages / total_pages) * 100 if total_pages > 0 else 0
        
        return {
            'buffer_pool_hit_rate': round(hit_rate, 2),
            'buffer_pool_usage_rate': round(usage_rate, 2),
            'buffer_pool_dirty_rate': round(dirty_rate, 2)
        }
    
    def _get_lock_metrics(self):
        """获取锁等待指标"""
        cursor = self.connection.cursor()
        
        # 当前锁等待
        cursor.execute("""
            SELECT 
                COUNT(*) as lock_waits,
                AVG(TIMER_WAIT/1000000000) as avg_wait_time
            FROM performance_schema.events_waits_current 
            WHERE EVENT_NAME LIKE 'wait/lock/%'
            AND TIMER_WAIT IS NOT NULL
        """)
        
        lock_result = cursor.fetchone()
        
        # 死锁统计
        cursor.execute("""
            SELECT VARIABLE_VALUE 
            FROM performance_schema.global_status 
            WHERE VARIABLE_NAME = 'Innodb_deadlocks'
        """)
        
        deadlocks = cursor.fetchone()
        
        return {
            'current_lock_waits': lock_result[0] or 0,
            'avg_lock_wait_time': round(lock_result[1] or 0, 3),
            'total_deadlocks': int(deadlocks[0]) if deadlocks else 0
        }
    
    def generate_alert(self, metrics):
        """生成告警"""
        alerts = []
        
        # QPS异常告警
        if metrics['qps'] > 5000:
            alerts.append({
                'level': 'warning',
                'metric': 'qps',
                'value': metrics['qps'],
                'threshold': 5000,
                'message': 'QPS过高，可能影响系统性能'
            })
        
        # 缓冲池命中率告警
        if metrics['buffer_pool_hit_rate'] < 95:
            alerts.append({
                'level': 'critical',
                'metric': 'buffer_pool_hit_rate',
                'value': metrics['buffer_pool_hit_rate'],
                'threshold': 95,
                'message': '缓冲池命中率过低，需要优化查询或增加内存'
            })
        
        # 慢查询告警
        if metrics['slow_query_count'] > 100:
            alerts.append({
                'level': 'warning',
                'metric': 'slow_query_count',
                'value': metrics['slow_query_count'],
                'threshold': 100,
                'message': '慢查询数量过多，需要优化SQL'
            })
        
        # 连接数告警
        if metrics['threads_connected'] > 200:
            alerts.append({
                'level': 'warning',
                'metric': 'threads_connected',
                'value': metrics['threads_connected'],
                'threshold': 200,
                'message': '数据库连接数过多'
            })
        
        return alerts

# 监控主程序
def main():
    monitor = MySQLMonitor(
        host='localhost',
        port=3306,
        user='monitor_user',
        password='monitor_password',
        database='performance_schema'
    )
    
    while True:
        try:
            # 收集指标
            metrics = monitor.collect_performance_metrics()
            metrics['timestamp'] = datetime.now().isoformat()
            
            # 生成告警
            alerts = monitor.generate_alert(metrics)
            
            # 输出结果
            print(f"Metrics: {json.dumps(metrics, indent=2)}")
            if alerts:
                print(f"Alerts: {json.dumps(alerts, indent=2)}")
            
            # 存储到时序数据库（如InfluxDB）
            # store_to_influxdb(metrics)
            
            # 发送告警（如钉钉、邮件等）
            # send_alerts(alerts)
            
            time.sleep(60)  # 每分钟采集一次
            
        except Exception as e:
            print(f"监控异常: {e}")
            time.sleep(10)

if __name__ == '__main__':
    main()
```

**第三层：可视化展示层**
```yaml
# Grafana Dashboard配置
apiVersion: 1
datasources:
  - name: MySQL-Performance
    type: mysql
    url: mysql://monitor_user:password@localhost:3306/performance_schema
    access: proxy
    
  - name: InfluxDB-Metrics
    type: influxdb
    url: http://localhost:8086
    database: mysql_metrics
    access: proxy

dashboards:
  - title: "MySQL性能监控大盘"
    panels:
      - title: "QPS趋势"
        type: graph
        targets:
          - expr: "mysql_qps"
            legendFormat: "QPS"
        
      - title: "缓冲池命中率"
        type: singlestat
        targets:
          - expr: "mysql_buffer_pool_hit_rate"
        thresholds: "90,95"
        
      - title: "慢查询Top10"
        type: table
        targets:
          - expr: "mysql_slow_queries"
        
      - title: "连接数监控"
        type: graph
        targets:
          - expr: "mysql_threads_connected"
            legendFormat: "已连接"
          - expr: "mysql_threads_running"
            legendFormat: "运行中"
```

**第四层：告警通知层**
```python
# 告警通知服务
import requests
import json
from datetime import datetime

class AlertManager:
    def __init__(self):
        self.dingtalk_webhook = "https://oapi.dingtalk.com/robot/send?access_token=xxx"
        self.email_api = "http://internal-email-service/send"
    
    def send_dingtalk_alert(self, alerts):
        """发送钉钉告警"""
        if not alerts:
            return
        
        message = "🚨 MySQL数据库告警\n\n"
        for alert in alerts:
            level_emoji = "🔴" if alert['level'] == 'critical' else "🟡"
            message += f"{level_emoji} {alert['message']}\n"
            message += f"   指标: {alert['metric']}\n"
            message += f"   当前值: {alert['value']}\n"
            message += f"   阈值: {alert['threshold']}\n\n"
        
        message += f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        
        payload = {
            "msgtype": "text",
            "text": {
                "content": message
            }
        }
        
        try:
            response = requests.post(
                self.dingtalk_webhook,
                json=payload,
                timeout=10
            )
            print(f"钉钉告警发送结果: {response.status_code}")
        except Exception as e:
            print(f"钉钉告警发送失败: {e}")
    
    def send_email_alert(self, alerts):
        """发送邮件告警"""
        if not alerts:
            return
        
        critical_alerts = [a for a in alerts if a['level'] == 'critical']
        if not critical_alerts:
            return
        
        subject = f"[CRITICAL] MySQL数据库严重告警 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        
        body = "<h2>MySQL数据库严重告警</h2>\n"
        body += "<table border='1'>\n"
        body += "<tr><th>指标</th><th>当前值</th><th>阈值</th><th>描述</th></tr>\n"
        
        for alert in critical_alerts:
            body += f"<tr>"
            body += f"<td>{alert['metric']}</td>"
            body += f"<td>{alert['value']}</td>"
            body += f"<td>{alert['threshold']}</td>"
            body += f"<td>{alert['message']}</td>"
            body += f"</tr>\n"
        
        body += "</table>\n"
        
        payload = {
            "to": ["dba@company.com", "ops@company.com"],
            "subject": subject,
            "body": body,
            "type": "html"
        }
        
        try:
            response = requests.post(
                self.email_api,
                json=payload,
                timeout=10
            )
            print(f"邮件告警发送结果: {response.status_code}")
        except Exception as e:
            print(f"邮件告警发送失败: {e}")
```

**监控效果验证**：
```sql
-- 验证监控系统效果
-- 1. 模拟慢查询
SELECT SLEEP(2), COUNT(*) FROM orders WHERE create_time > '2023-01-01';

-- 2. 模拟高并发连接
-- 使用压测工具创建大量连接

-- 3. 查看监控数据
SELECT 
    EVENT_NAME,
    SQL_TEXT,
    TIMER_WAIT/1000000000 as duration_seconds
FROM performance_schema.events_statements_history_long 
WHERE TIMER_WAIT > 1000000000  -- 1秒以上
ORDER BY TIMER_WAIT DESC
LIMIT 10;

-- 4. 验证告警触发
-- 检查告警日志和通知记录
```

**监控体系价值**：
```
-- 监控覆盖率：
-- 性能指标覆盖率：95%
-- 告警准确率：92%
-- 故障发现时间：平均2分钟
-- 误报率：<5%

-- 业务价值：
-- 故障发现时间缩短80%
-- 系统可用性提升到99.9%
-- 运维效率提升60%
-- 避免了多次重大故障
-- 为容量规划提供数据支撑
```

**最佳实践总结**：
1. **分层监控**：数据采集、指标计算、可视化展示、告警通知
2. **关键指标**：QPS、响应时间、缓冲池命中率、慢查询、连接数
3. **实时告警**：设置合理的告警阈值，避免误报和漏报
4. **历史分析**：保留历史数据，支持趋势分析和容量规划
5. **自动化运维**：结合监控数据实现自动化运维操作
6. **持续优化**：根据监控数据持续优化数据库性能

### 慢查询分析

#### 慢查询日志

**配置慢查询日志**：
- 启用 slow_query_log
- 设置 long_query_time 阈值
- 配置 log_queries_not_using_indexes
- 设置日志文件路径

**日志分析**：
- 使用 mysqldumpslow 工具
- 分析查询模式和频率
- 识别性能瓶颈
- 制定优化计划

**日志管理**：
- 定期轮转日志文件
- 控制日志文件大小
- 备份重要的日志数据
- 自动化日志分析

### 实战案例：生产环境慢查询诊断与优化

**业务背景**：某在线教育平台学生成绩查询系统性能问题

**问题现象**：
- 用户反馈成绩查询页面加载缓慢
- 数据库CPU使用率持续90%以上
- 应用服务器连接池经常耗尽
- 高峰期系统响应超时

**第一步：启用慢查询日志**
```sql
-- 配置慢查询日志
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
SET GLOBAL log_queries_not_using_indexes = 'ON';
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';

-- 查看当前配置
SHOW VARIABLES LIKE '%slow%';
```

**第二步：分析慢查询日志**
```bash
# 使用mysqldumpslow分析慢查询
mysqldumpslow -s c -t 10 /var/log/mysql/slow.log

# 输出结果（前3个最频繁的慢查询）
# Count: 2847  Time=3.21s (9140s)  Lock=0.00s (0s)  Rows=156.3 (444891)
# SELECT s.student_id, s.student_name, c.course_name, sc.score, sc.exam_date 
# FROM student_scores sc 
# JOIN students s ON sc.student_id = s.id 
# JOIN courses c ON sc.course_id = c.id 
# WHERE s.class_id = N AND sc.exam_date >= 'S' 
# ORDER BY sc.exam_date DESC, sc.score DESC

# Count: 1923  Time=2.87s (5518s)  Lock=0.00s (0s)  Rows=89.2 (171476)
# SELECT AVG(score) as avg_score, COUNT(*) as total_count 
# FROM student_scores 
# WHERE course_id = N AND exam_date BETWEEN 'S' AND 'S'

# Count: 1456  Time=4.12s (5999s)  Lock=0.00s (0s)  Rows=234.1 (340849)
# SELECT * FROM student_scores WHERE student_id IN (N,N,N...)
```

**第三步：详细分析问题查询**
```sql
-- 分析第一个慢查询
EXPLAIN FORMAT=JSON 
SELECT s.student_id, s.student_name, c.course_name, sc.score, sc.exam_date 
FROM student_scores sc 
JOIN students s ON sc.student_id = s.id 
JOIN courses c ON sc.course_id = c.id 
WHERE s.class_id = 101 
AND sc.exam_date >= '2023-01-01' 
ORDER BY sc.exam_date DESC, sc.score DESC;

-- 执行计划显示问题
{
  "query_block": {
    "select_id": 1,
    "cost_info": {
      "query_cost": "89234.56"
    },
    "ordering_operation": {
      "using_filesort": true,
      "cost_info": {
        "sort_cost": "12456.78"
      },
      "nested_loop": [
        {
          "table": {
            "table_name": "sc",
            "access_type": "ALL",
            "rows_examined_per_scan": 450000,
            "filtered": "11.11"
          }
        }
      ]
    }
  }
}
```

**第四步：性能监控分析**
```sql
-- 查看当前运行的查询
SELECT 
    ID,
    USER,
    HOST,
    DB,
    COMMAND,
    TIME,
    STATE,
    LEFT(INFO, 100) as QUERY_PREVIEW
FROM INFORMATION_SCHEMA.PROCESSLIST
WHERE COMMAND != 'Sleep'
AND TIME > 1
ORDER BY TIME DESC;

-- 查看表的统计信息
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    ROUND(DATA_LENGTH/1024/1024, 2) AS 'Data Size (MB)',
    ROUND(INDEX_LENGTH/1024/1024, 2) AS 'Index Size (MB)',
    ROUND((DATA_LENGTH + INDEX_LENGTH)/1024/1024, 2) AS 'Total Size (MB)'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'education_system'
ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC;

-- 结果显示
-- student_scores: 450,000行, 数据85MB, 索引12MB
-- students: 15,000行, 数据3.2MB, 索引1.8MB  
-- courses: 500行, 数据0.1MB, 索引0.05MB
```

**第五步：索引优化方案**
```sql
-- 分析现有索引
SHOW INDEX FROM student_scores;
SHOW INDEX FROM students;
SHOW INDEX FROM courses;

-- 创建优化索引
-- 1. 为student_scores表创建复合索引
CREATE INDEX idx_scores_student_date ON student_scores(student_id, exam_date DESC, score DESC);

-- 2. 为students表创建复合索引
CREATE INDEX idx_students_class ON students(class_id, id);

-- 3. 优化查询语句
SELECT s.student_id, s.student_name, c.course_name, sc.score, sc.exam_date 
FROM students s
INNER JOIN student_scores sc ON s.id = sc.student_id 
INNER JOIN courses c ON sc.course_id = c.id 
WHERE s.class_id = 101 
AND sc.exam_date >= '2023-01-01' 
ORDER BY sc.exam_date DESC, sc.score DESC
LIMIT 50;
```

**第六步：优化效果验证**
```sql
-- 优化后的执行计划
EXPLAIN FORMAT=JSON [优化后的查询];

-- 性能对比测试
SET profiling = 1;
[执行优化后的查询]
SHOW PROFILES;
SHOW PROFILE FOR QUERY 1;

-- 结果对比
-- 优化前：执行时间3.21秒，扫描45万行
-- 优化后：执行时间45毫秒，扫描156行
-- 性能提升：98.6%
```

**第七步：监控和维护**
```sql
-- 创建性能监控视图
CREATE VIEW slow_query_summary AS
SELECT 
    DIGEST_TEXT,
    COUNT_STAR as exec_count,
    ROUND(AVG_TIMER_WAIT/1000000000000, 3) as avg_time_sec,
    ROUND(MAX_TIMER_WAIT/1000000000000, 3) as max_time_sec,
    ROUND(SUM_TIMER_WAIT/1000000000000, 3) as total_time_sec,
    ROUND(AVG_ROWS_EXAMINED, 0) as avg_rows_examined
FROM performance_schema.events_statements_summary_by_digest
WHERE AVG_TIMER_WAIT > 1000000000  -- 大于1秒的查询
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 20;

-- 定期检查慢查询
SELECT * FROM slow_query_summary;

-- 自动化监控脚本
#!/bin/bash
# slow_query_monitor.sh
MYSQL_USER="monitor"
MYSQL_PASS="password"
MYSQL_HOST="localhost"
LOG_FILE="/var/log/mysql_monitor.log"

# 检查慢查询数量
SLOW_COUNT=$(mysql -u$MYSQL_USER -p$MYSQL_PASS -h$MYSQL_HOST -e \
"SELECT COUNT(*) FROM performance_schema.events_statements_summary_by_digest 
WHERE AVG_TIMER_WAIT > 2000000000;" -N)

if [ $SLOW_COUNT -gt 10 ]; then
    echo "$(date): Warning - $SLOW_COUNT slow queries detected" >> $LOG_FILE
    # 发送告警邮件或钉钉通知
fi
```

**优化成果总结**：
- **查询性能**：平均响应时间从3.2秒降低到45毫秒
- **系统负载**：数据库CPU使用率从90%降低到15%
- **并发能力**：支持并发用户数从500提升到5000
- **用户体验**：页面加载时间从8秒降低到1秒
- **资源成本**：避免了硬件升级，节省成本30万元

#### 实时性能分析

**Performance Schema**：
- 实时监控查询执行
- 分析等待事件
- 跟踪资源使用
- 诊断性能问题

**SHOW PROCESSLIST**：
- 查看当前执行的查询
- 识别长时间运行的查询
- 分析锁等待情况
- 监控连接状态

**EXPLAIN ANALYZE**：
- 获取实际执行统计
- 比较估算和实际值
- 分析执行时间分布
- 识别性能瓶颈

### 问题诊断方法

#### 性能问题分类

**查询性能问题**：
- 慢查询识别和优化
- 索引使用分析
- 执行计划优化
- SQL 语句重写

**并发性能问题**：
- 锁竞争分析
- 死锁检测和处理
- 连接池配置优化
- 事务设计优化

**资源瓶颈问题**：
- I/O 瓶颈诊断
- 内存使用优化
- CPU 使用分析
- 网络性能优化

#### 诊断流程

**问题定位**：
1. 收集性能指标和日志
2. 识别性能瓶颈的类型
3. 分析问题的根本原因
4. 制定解决方案

**解决方案实施**：
1. 制定详细的优化计划
2. 在测试环境验证方案
3. 逐步在生产环境实施
4. 监控优化效果

**效果评估**：
1. 对比优化前后的性能指标
2. 验证问题是否得到解决
3. 评估优化的副作用
4. 总结经验和教训

## 总结

MySQL 查询优化是一个系统性的工程，需要从多个层面进行综合考虑：

1. **理解原理**：深入了解查询优化器的工作机制
2. **分析执行计划**：熟练使用 EXPLAIN 等工具
3. **优化 SQL 语句**：掌握各种 SQL 优化技巧
4. **设计合适的索引**：根据查询模式设计索引策略
5. **监控和诊断**：建立完善的性能监控体系

**最佳实践建议**：
- 在设计阶段就考虑性能因素
- 建立性能基准和监控体系
- 定期进行性能审查和优化
- 保持对新特性和工具的学习
- 结合业务需求制定优化策略

查询优化是一个持续的过程，需要根据业务发展和数据增长不断调整和改进。通过系统性的学习和实践，可以构建高性能、高可靠的数据库系统。