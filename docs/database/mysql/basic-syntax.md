# MySQL 基础语法

查询“十月支付超过 60 元的客户”，需要先筛选十月已支付订单，再按客户汇总，最后筛选合计金额。把 `HAVING SUM(amount)>60` 改成 `WHERE amount>60`，并不是另一种写法：两笔 50 元和 39.90 元的订单会被提前丢掉。

本文以 MySQL 8.4、InnoDB 为基线，用同一套客户、订单和明细表串联语法。可在[MySQL 总览](./index.md)的独立练习实例连接后按顺序执行；库名 `syntax_demo` 专供练习，不要替换为生产库。字段设计、索引、事务与权限的深入机制分别见[数据类型设计](./data-types-design.md)、[索引系统](./index-system.md)、[事务系统](./transaction-system.md)和[安全权限](./security-permissions.md)。

## 建立一致的练习数据

SQL 是声明式语言：描述结果与约束，优化器决定访问路径。DDL 管结构，INSERT/UPDATE/DELETE 操作数据，SELECT 查询结果，GRANT/REVOKE 管权限，事务语句控制提交边界；这些分类用于组织职责，不代表同一类语句有完全相同的锁或回滚语义。

```sql
CREATE DATABASE syntax_demo
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE syntax_demo;

CREATE TABLE customers (
  id BIGINT UNSIGNED PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  email VARCHAR(120) NULL
) ENGINE=InnoDB;

CREATE TABLE orders (
  id BIGINT UNSIGNED PRIMARY KEY,
  customer_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  status VARCHAR(16) NOT NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_order_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id),
  INDEX idx_customer_time (customer_id, created_at, id)
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id BIGINT UNSIGNED PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  product_name VARCHAR(80) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
  CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB;

INSERT INTO customers (id, name, email) VALUES
  (1, '小林', NULL), (2, '小周', 'c2@example.com'), (3, '小许', NULL);
INSERT INTO orders (id, customer_id, amount, status, created_at) VALUES
  (101, 1, 50.00, 'paid', '2026-10-02 10:00:00'),
  (102, 1, 30.00, 'pending', '2026-10-02 10:00:00'),
  (103, 1, 39.90, 'paid', '2026-10-03 11:00:00'),
  (104, 2, 20.00, 'cancelled', '2026-09-30 23:59:59');
INSERT INTO order_items
  (id, order_id, product_name, quantity, unit_price) VALUES
  (1, 101, '笔记本', 1, 20.00),
  (2, 101, '收纳袋', 1, 30.00),
  (3, 103, '台灯', 1, 39.90);
```

客户可以有多笔订单，一笔订单可以有多条明细；外键避免引用不存在的父记录，但不会代替完整业务授权、订单状态机或跨服务一致性。显式列出 INSERT 列名，能避免表新增字段后按列位置插错。金额保留 DECIMAL，订单金额与商品小计在有优惠、运费时可以不同。

重复执行初始化会报库或表已存在。先确认连接的是可丢弃练习实例，再决定是否清理；不要用一串 `IF NOT EXISTS` 掩盖旧表结构与当前示例不一致。可用 `SELECT DATABASE()`、`SHOW CREATE TABLE orders` 核对当前库与真实定义。

## 行过滤、分组与排序各做什么

![订单查询从关联行、WHERE、GROUP BY、HAVING到投影和分页的逻辑关系](/database/mysql-sql-logical-flow.svg)

图示是理解结果的逻辑模型，**不是数据库必须照此执行的物理时间轴**。优化器可以调整连接顺序、下推条件、使用索引或物化中间结果，只要保持语义。窗口函数发生在行/分组过滤之后，不能在同层 WHERE 中直接引用其结果。

先查询十月已支付订单：

```sql
USE syntax_demo;
SELECT id, customer_id, amount, created_at
FROM orders
WHERE status='paid'
  AND created_at >= '2026-10-01'
  AND created_at < '2026-11-01'
ORDER BY created_at DESC, id DESC;
```

返回 103、101。半开时间范围包含整个十月，也不会把十一月第一秒算进来。`BETWEEN` 包含两端；将结束时间写成 `'2026-10-31'` 只到当天零点。涉及 TIMESTAMP、连接时区和业务时区时，应先明确边界换算，不能仅替换日期字符串。

把筛选后的订单按客户汇总：

```sql
SELECT customer_id, COUNT(*) AS paid_orders, SUM(amount) AS paid_amount
FROM orders
WHERE status='paid'
  AND created_at >= '2026-10-01'
  AND created_at < '2026-11-01'
GROUP BY customer_id
HAVING SUM(amount) > 60
ORDER BY paid_amount DESC, customer_id
LIMIT 10;
```

结果为客户 1、两单、89.90 元。WHERE 判断原始行，HAVING 判断分组结果；把条件写成 `WHERE amount>60` 会得到空集。启用默认 `ONLY_FULL_GROUP_BY` 时，非聚合列必须满足分组或可证明的函数依赖，不能为了让不确定的查询运行而全局关闭它。MySQL 允许在 HAVING、ORDER BY 等位置引用部分 SELECT 别名，但通常不能在同层 WHERE 中引用 SELECT 新定义的别名。

没有 ORDER BY 就没有承诺的返回顺序；只有 `ORDER BY created_at` 时，相同时间的 101、102 仍可能交换。为分页加唯一编号作为稳定排序键。`LIMIT 2 OFFSET 2` 与 MySQL 的 `LIMIT 2, 2` 在此都是跳过两行再取两行；大偏移与跨请求数据变化的处理见[查询优化](./query-optimization.md)。

## NULL、匹配与布尔条件

NULL 表示缺失或未知，不是空字符串或零。与 NULL 用 `=`、`<>` 比较通常得到 UNKNOWN，WHERE 只保留 TRUE；查缺失要用 `IS NULL`。`COUNT(*)` 数行，`COUNT(email)` 只数非 NULL，其他常见聚合也有各自的空值规则。

```sql
SELECT id, name, COALESCE(email, '未提供') AS display_email
FROM customers WHERE email IS NULL ORDER BY id;
SELECT COUNT(*) AS customer_count, COUNT(email) AS known_email_count
FROM customers;
SELECT NULL = NULL AS ordinary_equal, NULL <=> NULL AS null_safe_equal;
SELECT 'VIP_会员' LIKE 'VIP!_%' ESCAPE '!' AS literal_underscore,
       'userA' LIKE 'user_' AS one_character;
```

第一项返回小林、小许，第二项为 3 与 1，第三项为 NULL 与 1。MySQL 的 `<=>` 是 NULL 安全相等比较。LIKE 中 `%` 表示零个或多个字符，`_` 表示一个字符；最后一项的 `!_` 用显式 ESCAPE 匹配字面下划线。用户输入作为搜索内容时，参数化不会自动把 `%/_` 变为普通字符，仍需按产品约定转义通配符。

AND 的优先级高于 OR，涉及“本租户且满足状态 A 或 B”时写成 `tenant_id=? AND (status=? OR status=?)`，避免 OR 分支越过租户约束。`NOT IN` 的集合包含 NULL 时有三值逻辑陷阱；判断“没有匹配订单”可用 NOT EXISTS，但两者不能无条件互换。

## 关联数量与外连接边界

以下查询保留所有客户，只统计十月已支付订单。日期与状态条件放在 ON 中，使“没有满足条件的订单”仍保留客户：

```sql
SELECT c.id, c.name, COUNT(o.id) AS paid_orders,
       COALESCE(SUM(o.amount), 0) AS paid_amount
FROM customers c
LEFT JOIN orders o
  ON o.customer_id=c.id
 AND o.status='paid'
 AND o.created_at >= '2026-10-01'
 AND o.created_at < '2026-11-01'
GROUP BY c.id, c.name
ORDER BY c.id;

SELECT c.id, c.name
FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM orders o WHERE o.customer_id=c.id
)
ORDER BY c.id;
```

汇总结果依次为小林 `2/89.90`、小周 `0/0`、小许 `0/0`；第二项只有小许。外连接给零匹配客户补出一行右侧为 NULL 的记录，因此这里必须数 `o.id`；`COUNT(*)` 会把这行也算成一单。如果将 `o.status='paid'` 移到 WHERE，零匹配客户就被过滤，结果含义发生变化。

| 写法 | 结果合同 | 常见边界 |
| --- | --- | --- |
| INNER JOIN | 只保留匹配组合 | 一对多会让父记录重复，不等于自动去重 |
| LEFT JOIN | 保留左侧及匹配右侧，零匹配补 NULL | ON 与 WHERE 的右侧条件会影响保留范围 |
| RIGHT JOIN | 保留右侧及匹配左侧 | 常可交换表后写成 LEFT JOIN，便于统一阅读 |
| CROSS JOIN | 产生所有组合 | 例如尺寸 × 颜色；行数为两集合行数之积 |
| 自连接 | 同表的两个别名按条件关联 | 例如员工与上级；仍遵守内/外连接规则 |
| 全外连接模拟 | 左连接结果，加右侧未匹配部分 | MySQL 8.4 无直接 FULL OUTER JOIN；用 UNION ALL 并保证第二部分只取未匹配行 |

订单关联商品后，一笔订单有多行是正常的。若再直接关联另一组包裹明细，会交叉放大计数与金额，不能随手 `SUM(DISTINCT amount)` 补救，完整反例见[查询优化](./query-optimization.md)。标量子查询要求最多一行；相关子查询不等于必然逐行全表扫描，是否改 JOIN 要看语义和计划。

## CTE、窗口函数与集合操作

GROUP BY 把多行变成分组结果；窗口函数保留明细行并增加组内计算。查询每个客户最新一笔订单，可先编号，再在外层筛选：

```sql
WITH ranked AS (
  SELECT id, customer_id, amount, created_at,
         ROW_NUMBER() OVER (
           PARTITION BY customer_id ORDER BY created_at DESC, id DESC
         ) AS rn,
         SUM(amount) OVER (
           PARTITION BY customer_id ORDER BY created_at, id
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
         ) AS running_amount
  FROM orders
)
SELECT id, customer_id, amount, running_amount
FROM ranked WHERE rn=1 ORDER BY customer_id;
```

返回客户 1 的 103（累计 119.90）和客户 2 的 104（累计 20.00）。这次明确累计所有状态，不等于支付金额报表。`ROW_NUMBER` 为每行编号；`RANK`、`DENSE_RANK` 对并列排名处理不同。ROWS 窗口按所定义的行序列累计，不能省掉稳定排序后假定同时间记录有固定先后。CTE 只帮助组织查询，不承诺物化，也不天然提升性能。

```sql
SELECT customer_id FROM orders WHERE status='paid'
UNION
SELECT id FROM customers WHERE id=1;

SELECT customer_id FROM orders WHERE status='paid'
UNION ALL
SELECT id FROM customers WHERE id=1;

SELECT id FROM customers
INTERSECT
SELECT customer_id FROM orders WHERE status='paid';

SELECT id FROM customers
EXCEPT
SELECT customer_id FROM orders WHERE status='paid';
```

UNION 对整个结果行去重，第一项只有一个 `1`；UNION ALL 保留三个 `1`。INTERSECT 返回交集客户 1，EXCEPT 返回客户 2、3（未写排序时不承诺先后）。MySQL 在 **8.0.31** 才加入 INTERSECT、EXCEPT，不能写成所有 8.0 都支持。集合各分支需有相同列数和兼容类型，列名由首个查询决定。

## 修改数据与事务边界

UPDATE、DELETE 必须先明确目标集合与并发条件；先 SELECT 看一遍并不能锁住其后不变。将订单从 pending 改为 paid 时，把旧状态放入 UPDATE 条件，立即检查影响行数，再按业务决定提交或回滚。

下面在练习库演示状态更新与保存点，执行前 102 为 pending：

```sql
START TRANSACTION;
UPDATE orders SET status='paid' WHERE id=102 AND status='pending';
SELECT ROW_COUNT() AS transitioned_rows;
SAVEPOINT before_amount_change;
UPDATE orders SET amount=999 WHERE id=102;
ROLLBACK TO SAVEPOINT before_amount_change;
SELECT id, status, amount FROM orders WHERE id=102;
COMMIT;
```

第一次转换应影响一行，保存点回滚后仍是 `102/paid/30.00`；再次运行时转换行数为零。应用应在每次操作后立即取得驱动返回的影响行数，并区分“已处理、状态冲突、对象不存在”；后续其他语句会改变 `ROW_COUNT()` 的观察对象。完整支付流程还需要支付凭证、金额核对和幂等，不能只改一个状态就算完成支付。

普通 SQL 会话不能直接执行存储程序的 `IF ... THEN ... END IF`。在应用代码中检查影响行数后调用同一连接的 commit/rollback，或在定义完整的存储过程中处理分支及异常。`UPDATE stock=stock-? WHERE stock>=?` 返回零行时，库存未变成负数，但扣减仍然失败；不能用“查不到负库存”证明订单可以提交。

删除演示放在独立的清理练习表中，避免改变订单练习基线：

```sql
CREATE TABLE cleanup_demo (id INT PRIMARY KEY, expired TINYINT NOT NULL);
INSERT INTO cleanup_demo VALUES (1,1),(2,1),(3,0);
START TRANSACTION;
DELETE FROM cleanup_demo WHERE expired=1 ORDER BY id LIMIT 1;
SELECT ROW_COUNT() AS deleted_rows;
ROLLBACK;
SELECT COUNT(*) AS remaining_rows FROM cleanup_demo;
DROP TABLE cleanup_demo;
```

回滚后仍有三行。DELETE 在可回滚的 InnoDB 事务内可撤销；自动提交后就不能再靠 ROLLBACK 找回。TRUNCATE 是 DDL，会隐式提交，通常重置自增值且不触发逐行 DELETE 触发器；有外键引用等限制，不是可回滚批量 DELETE 的通用替代。

大多数普通 DDL 有隐式提交，不能与业务修改混在一起再指望整体回滚。只在练习实例执行以下边界反例：

```sql
CREATE TABLE ddl_demo (id INT PRIMARY KEY);
START TRANSACTION;
INSERT INTO ddl_demo VALUES (1);
ALTER TABLE ddl_demo ADD COLUMN note VARCHAR(40) NULL;
ROLLBACK;
SELECT COUNT(*) AS rows_after_rollback FROM ddl_demo;
DROP TABLE ddl_demo;
```

结果仍为一行。MySQL 的原子 DDL 不等于用户可撤销的事务 DDL。临时表等语句有特殊边界；结构迁移要单独评估锁、空间、兼容与回退。事务失败后也不是一律全部自动回滚，应用必须按错误类型结束事务并处理重试，机制见[事务系统](./transaction-system.md)。

`REPLACE` 有删除旧行再插入的语义，会影响外键、触发器和未提供列，不能当成普通 UPDATE。`INSERT IGNORE` 也不只忽略重复键，可能将其他问题转成警告；`ON DUPLICATE KEY UPDATE` 则要核对到底触发了哪个唯一键、更新规则和影响行数。不要把它们直接作为支付幂等的完整实现。

## 字符串、标识符与参数化

字符串值统一使用单引号，标识符需要引用时使用反引号。`ANSI_QUOTES` 会让双引号表示标识符，`NO_BACKSLASH_ESCAPES` 会改变反斜杠转义；先核对 `@@sql_mode`，不要把应用语言的转义写法当成 MySQL 字符串语法。

```sql
SELECT @@sql_mode, @@lower_case_table_names;
SELECT 'It''s ready' AS message,
       CHAR_LENGTH('Hello 世界') AS characters_count,
       LENGTH('Hello 世界') AS bytes_count;
SELECT CONVERT(X'E4B8ADE69687' USING utf8mb4) AS decoded_text;
SELECT _utf8mb4'John' COLLATE utf8mb4_0900_ai_ci = _utf8mb4'john' AS ci_equal,
       _utf8mb4'John' COLLATE utf8mb4_0900_as_cs = _utf8mb4'john' AS cs_equal;
SELECT WORD FROM information_schema.KEYWORDS WHERE RESERVED=1 ORDER BY WORD LIMIT 5;
```

字符数为 8，utf8mb4 下字节数为 12，十六进制字节转换为“中文”；比较结果分别为 1 与 0。字符串比较由字符集、排序规则和比较上下文决定，不是“默认总区分大小写”。MySQL 普通字符串不把 `\u4E2D`、`\x41`、八进制写法当作应用语言那样解码；也没有内置 `INITCAP`，保留字查询入口是 `information_schema.KEYWORDS`，不是 `SHOW KEYWORDS`。

关键字大小写与表名大小写是两件事。表和库名受 `lower_case_table_names`、文件系统及初始化配置影响；不能在 Linux 上把 `users`、`Users` 当成总等价写法，也不应在实例初始化后任意修改该设置。表、列等许多标识符上限为 64 字符，但并非所有对象都同一上限；为可移植性使用简短、统一的小写下划线命名。

参数化将**数据值**与 SQL 结构分开。以下使用 MySQL 服务端预处理语句演示绑定，不通过手工拼接引号构造 SQL：

```sql
USE syntax_demo;
PREPARE find_orders FROM
  'SELECT id, amount FROM orders WHERE customer_id=? AND amount>=? ORDER BY id';
SET @customer_id=1, @minimum_amount=40;
EXECUTE find_orders USING @customer_id, @minimum_amount;
DEALLOCATE PREPARE find_orders;
```

结果只有 `101/50.00`。应用使用相应驱动的参数绑定 API；`?` 不能绑定表名、列名、ASC/DESC 等 SQL 结构。动态排序通过白名单将外部选择映射到固定片段，再单独绑定数据值；把用户输入传给 `QUOTE()` 或替换单引号，不能替代完整的参数化和授权校验。

## 练习验收与排错

能独立创建三张表并解释一对多关联，得到正确的支付汇总、保留零订单客户、稳定选择最新订单，再说明保存点与 DDL 回滚差异，才算掌握本页的基本合同。不要只以“语法没报错”为通过：重复行、漏行、错误金额和越权读取也可能生成合法 SQL。

遇到问题先检查 `SELECT DATABASE()`、`SHOW CREATE TABLE`、版本与 `@@sql_mode`；列不存在时先核对实际建表，不随手增加另一组同义字段。聚合失败查分组与函数依赖，结果少行查 NULL/外连接条件/时间边界，修改零行查旧状态和授权范围。查询正确后再通过实际计划分析成本，不依赖 WHERE 条件书写顺序、是否出现子查询或 SQL 长短来判断快慢。
