# MySQL 数据类型与字段设计

字段类型首先表达业务允许什么值，其次才是省多少空间。一笔订单的金额不能近似，支付时间在付款前确实未知，手机号不能因为“只有数字”就丢掉加号与前导零。把这些含义定下来，类型、精度、空值、排序规则和约束才有选择依据。以下面向 MySQL 8.4 LTS、InnoDB。

## 从订单值确定字段合同

![用户和订单字段的类型、唯一性与引用约束](/database/mysql-field-contract.svg)

图中只展示与字段合同有关的列，完整建表见后面的实验。订单引用用户，但金额、币种和支付时间属于订单本身；它们不能依赖用户资料或商品当前价格重新推算。类型检查也不等于业务检查：`TINYINT` 可以容纳状态 `9`，却不能说明系统是否支持该状态。

| 业务值 | 常用表达 | 必须确定的边界 |
| --- | --- | --- |
| 订单编号 | `BIGINT` 或具有明确排序规则的字符串 | 生成方式、最大范围、唯一性；是否通过 JSON/JavaScript 传输 |
| 件数 | 整数、`NOT NULL`、正数检查 | 允许零吗，最大单量是多少，扣减是否可能下溢 |
| 金额 | `DECIMAL(p,s)` 或整数最小货币单位 | 币种、精度、舍入时点、税费与退款范围 |
| 手机号、邮编、外部编码 | `VARCHAR` | 规范化、前导零、国际格式和比较方式 |
| 生日、结算日期 | `DATE` | 这是哪一个业务地区的日期 |
| 支付时刻 | `DATETIME(fsp)` 或 `TIMESTAMP(fsp)` | 会话时区、UTC 合同、2038 边界、精度 |
| 可扩展商品属性 | `JSON` | 对象结构、必填项、大小、查询路径和结构版本 |
| 哈希、UUID、网络地址 | `BINARY` / `VARBINARY` 或文本 | 字节数、编码、UUID 版本和转换方式 |

## 数值：准确性、范围和传输

有符号 `TINYINT/SMALLINT/MEDIUMINT/INT/BIGINT` 分别用 `1/2/3/4/8` 字节，范围分别是 `-2^7…2^7-1`、`-2^15…2^15-1`、`-2^23…2^23-1`、`-2^31…2^31-1`、`-2^63…2^63-1`。整数 `UNSIGNED` 把范围改为 `0…2^n-1`，不会让存储变小。选型要留增长余量，关联列的类型与符号必须匹配；自增值可能有空洞，耗尽后不会自动回绕成安全的新编号。

大整数进入 JavaScript 时，超出 `Number.MAX_SAFE_INTEGER` 的值可能在数据库之外丢精度。可在 API 用十进制字符串传输，客户端按约定处理；不要只验证数据库能插入就认定整条链路准确。`BOOLEAN` 是 `TINYINT(1)` 的同义表达，单靠它仍能存 `2`，需要 `CHECK` 才能限制为 `0/1`。

`FLOAT` 和 `DOUBLE` 是近似数，适合传感器测量和允许误差的计算。`DECIMAL` 表达精确的十进制值，但写入超过小数位的输入仍会舍入，除法和中间结果也受精度规则限制。MySQL 的 `0.1` 是精确数值字面量；用它证明二进制浮点误差是不成立的。下面分别使用普通小数与科学记数法，后者进入近似计算：

```sql
SELECT 0.1 + 0.2 = 0.3 AS exact_equal,
       0.1E0 + 0.2E0 = 0.3E0 AS approximate_equal;
SELECT CAST(19.995 AS DECIMAL(10,2)) AS rounded_amount;
```

结果依次为 `1、0`，金额转换为 `20.00`。`DECIMAL(12,2)` 总共十二位，其中两位是小数，最大正值为 `9,999,999,999.99`；负数是否允许由业务决定。`DECIMAL(5,4)` 最大为 `9.9999`，存比例 `0.9999` 与存百分数 `99.99` 是不同的单位合同。先规定币种和单位，再规定精度；并非所有币种都采用两位小数。

DECIMAL 整数和小数部分分别按每九位四字节、余数按分组字节数编码，不是简单“位数乘固定比例”。精确金额通过字符串或十进制库进入驱动，避免先变成浮点数。整数分方案同样要控制乘数量、累加和转换时的范围，不能因为不用 DECIMAL 就省略溢出检查。

## 字符串：字符数、字节和比较规则

`CHAR(n)` 和 `VARCHAR(n)` 的 `n` 是字符数，二进制类型长度按字节。`utf8mb4` 每字符最多四字节，`VARCHAR(255)` 不是最多 255 字节。VARCHAR 长度前缀为一或两字节，受最大字节长度影响；MySQL 逻辑行上限 65,535 字节还要计入其他列和开销，InnoDB 页内记录另有限制，不能把它误写成“VARCHAR 最多 65,535 个字符”。

`CHAR` 适合固定长度的代码，但取值通常会去掉尾随空格，物理占用还受字符集、行格式和引擎影响，不存在“小于十字符就一定更快”的规则。`VARCHAR` 是否把尾空格视为相同，取决于排序规则的 PAD 属性。`utf8mb4_0900_ai_ci` 忽略重音和大小写；需要区分的业务编码应选择合适的二进制排序规则或二进制列，不应无意中继承默认比较语义。

邮箱不能只靠 `VARCHAR(255)` 就声称满足全部标准；还要明确国际化邮箱、域名规范化、本地部分比较政策与应用长度校验。手机号保留国际格式，生日用日期而不是不断过期的年龄。密码字段保存密码库生成的完整编码串，例如包含算法、参数和盐的结果，长度按所用库预留；不要把所有密码算法都限定为 `CHAR(60)`，也不要用 MD5/SHA1 替代密码哈希。

`TEXT` 家族上限分别为 255、65,535、16,777,215、4,294,967,295 **字节**，实际还受包大小、内存和应用限制。大列是否在行外取决于行格式与值大小，不能一律描述为“表里只剩指针”；BLOB/TEXT 对行大小计算仍有描述符等开销。8.4 可以用表达式默认值，如 `TEXT DEFAULT ('')`，不是完全禁止默认值。普通索引通常需要前缀，全文搜索另看 FULLTEXT 的分词与长度限制；前缀索引不等于全文搜索。

二进制内容用 BLOB，文本用 TEXT；原生 JSON 比把对象当 TEXT 多了格式验证与路径操作。大附件放对象存储时，要处理对象与数据库记录之间的失败补偿、权限、保留和孤儿清理，存一个 URL 并不自动解决一致性。列表页避免无条件加载大列，是否拆表需看访问频率与事务边界。

`BINARY(n)` 不足长度会补零字节，`VARBINARY(n)` 保留实际字节长度；UUID 的 16 字节与 36 字符文本是两种表示。使用 `UUID_TO_BIN` 的交换参数时要匹配 UUID 版本及反向转换，不能把针对时间型 UUID 的重排当成所有 UUID 的优化。IPv4/IPv6 可用 `INET6_ATON` 和 `INET6_NTOA` 转换，字段长度与地址格式按接口合同验证。

`ENUM` 适合变动少、集合明确的值，比较和默认排序涉及内部枚举序号，不能把数字写入时的序号解释与字符串业务码混用。频繁变化的订单状态可用整数加检查约束或引用字典表；状态是否合法与状态能否从“取消”转为“已支付”是两项约束，后者仍需要状态机和事务。`SET` 表达有限集合的组合，但不适合替代需要单项属性、关联查询与独立演进的关系表。

## 时间：日期、墙上时间和时刻

| 类型 | 用途与范围 | 时区及存储边界 |
| --- | --- | --- |
| `DATE` | 1000-01-01 至 9999-12-31 的日期 | 不做时区转换，3 字节 |
| `TIME(fsp)` | 一天内时间或约 ±838 小时的时长 | 不是任意长的持续时间容器，基础 3 字节 |
| `DATETIME(fsp)` | 1000 至 9999 年的日期时间 | 保存字面时间，不自动转换，基础 5 字节 |
| `TIMESTAMP(fsp)` | UTC 1970-01-01 00:00:01 至 2038-01-19 03:14:07 | 写入/读取按会话时区转换，基础 4 字节 |
| `YEAR` | 1901 至 2155，以及特殊零值 | 只用于确实只有年份的值 |

小数秒精度 `fsp` 为 0～6，每 1～2、3～4、5～6 位分别额外占 1、2、3 字节。`DATETIME(6)` 因而是 8 字节，不能把所有 DATETIME 都写成 8 字节。零日期等特殊值受 SQL mode 约束，生产接口应拒绝不合法日期。

全球化应用既可以用 TIMESTAMP，也可以约定 DATETIME 存 UTC。关键是驱动与会话时区一致、API 带清楚的时间含义、显示时转换，并用真实驱动做往返验证。预约“某地区每天九点”还需要地区时区标识及夏令时政策，只有一个 UTC 时间值不足以表达重复规则。以下比较同一记录在两个会话时区下的读取：

```sql
CREATE DATABASE field_demo CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE field_demo;
SET time_zone = '+00:00';
CREATE TABLE clock_probe (wall_time DATETIME, instant TIMESTAMP);
INSERT INTO clock_probe VALUES ('2026-10-01 00:00:00', '2026-10-01 00:00:00');
SET time_zone = '+08:00';
SELECT wall_time, instant FROM clock_probe;
SET time_zone = '+00:00';
```

结果分别是 `00:00:00` 与 `08:00:00`。支付时间尚未知时允许 NULL，不用零日期冒充；支付状态变更与支付时间应在同一事务维护。`ON UPDATE CURRENT_TIMESTAMP` 只在其他列的值实际变化等条件下自动更新，无变化赋值不一定刷新；它不是完整审计日志，也不是并发控制版本号。

## NULL、约束和 JSON 的职责

NULL 表示未知或不适用，不能用 `= NULL` 比较；`COUNT(*)` 数记录，`COUNT(paid_at)` 只数非空支付时间。InnoDB 普通索引包含 NULL，`IS NULL` 可以使用索引，唯一键通常允许多个 NULL。`CHECK` 在表达式为 TRUE 或 UNKNOWN 时通过，因此“必须大于零”要配合 `NOT NULL`，不能只写 `CHECK(quantity > 0)`。

不要为了避免 NULL 而塞入假手机号、`-1` 用户编号或空支付日期。默认值也表达业务决定：订单缺了金额应报错时，不应默认为零；可选备注默认为空对象或空文本，则应清楚说明它与未知值的差别。严格模式下仍需检查驱动错误和告警，不能依靠静默截断纠正输入。

JSON 验证语法，不自动保证对象中有正确类型的币种和价格。稳定、经常参与关联或约束的字段应独立成列；灵活属性可用 JSON，并在应用或适当的数据库检查中验证结构。JSON 数字、字符串、JSON null、SQL NULL 是不同值。存储可能规范化键顺序、处理重复键，不能把 JSON 列当作保留原始签名报文的容器。

对 JSON 路径查询可用生成列或符合限制的函数索引；生成列要先规定类型、缺失值和转换失败策略。`STORED` 是存储生成列，`VIRTUAL` 是虚拟生成列，二者不要混称。下面用有界字符串属性建索引，不把金额藏进 JSON 再勉强转换。

## 可运行的用户与订单实验

在前面的 `field_demo` 中继续执行。这里采用“只有活跃用户名必须唯一”的规则，大小写是否相同由生成列的排序规则决定；外键限制误删用户。示例金额按 CNY 的两位小数设计，不是通用多币种账务模型。

```sql
USE field_demo;
SET time_zone = '+00:00';
CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    active_username VARCHAR(50)
      GENERATED ALWAYS AS (CASE WHEN is_active = 1 THEN username ELSE NULL END) VIRTUAL,
    phone VARCHAR(20) NULL,
    birth_date DATE NULL,
    CONSTRAINT chk_active CHECK (is_active IN (0, 1)),
    UNIQUE KEY uk_active_username (active_username)
) ENGINE=InnoDB;

CREATE TABLE orders (
    id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    order_no VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    currency CHAR(3) CHARACTER SET ascii NOT NULL DEFAULT 'CNY',
    amount DECIMAL(12,2) NOT NULL,
    paid_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
      ON UPDATE CURRENT_TIMESTAMP(6),
    version INT UNSIGNED NOT NULL DEFAULT 0,
    metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
    channel VARCHAR(20) GENERATED ALWAYS AS
      (JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.channel'))) VIRTUAL,
    UNIQUE KEY uk_order_no (order_no),
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_channel (channel),
    CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_amount CHECK (amount >= 0),
    CONSTRAINT chk_currency CHECK (currency = 'CNY'),
    CONSTRAINT chk_metadata CHECK (JSON_TYPE(metadata) = 'OBJECT')
) ENGINE=InnoDB;

INSERT INTO users (id, username, is_active) VALUES
(1, 'alice', 1), (2, 'alice', 0), (3, 'alice', 0);
INSERT INTO orders (id, order_no, user_id, amount, metadata) VALUES
(101, 'O20261001001', 1, 39.90, JSON_OBJECT('channel', 'web')),
(102, 'O20261001002', 1, 20.00, JSON_OBJECT());
SELECT COUNT(*) AS orders_count, COUNT(paid_at) AS paid_count FROM orders;
SELECT id, channel FROM orders WHERE channel = 'web';
```

订单总数为 `2`、已知支付时间数量为 `0`，渠道查询返回 `101、web`。非活跃的两个 alice 对应生成列 NULL，因此可以共存；再创建一个活跃 alice，或把编号 2 激活，会触发唯一键冲突。MySQL 没有通用的 `CREATE UNIQUE INDEX ... WHERE ...` 语法，这种条件唯一性通过受约束的生成列来表达。

JSON 示例只强制对象形状，未限制所有可用键，也没有证明整个 JSON 文档符合业务 schema；`channel` 超长、错误类型和 null 的处理要在正式接口中明确。`currency` 比较仍受该列排序规则影响，若要求原始输入严格大写，应用层也应校验规范化后的值。

```sql
UPDATE field_demo.orders
SET paid_at = '2026-10-01 10:30:00.123456', version = version + 1
WHERE id = 101 AND version = 0 AND paid_at IS NULL;
SELECT ROW_COUNT() AS changed_rows;

UPDATE field_demo.orders
SET paid_at = '2026-10-01 10:30:00.123456', version = version + 1
WHERE id = 101 AND version = 0 AND paid_at IS NULL;
SELECT ROW_COUNT() AS changed_rows;
```

结果为 `1`、`0`。版本列表达乐观并发条件，调用方必须检查影响行数；更新时间精度再高也不能保证每次更新值都不同。这个实验只表达支付字段更新，完整支付还需要订单状态、支付流水唯一键、回调幂等和同一事务的不变量，见[事务系统](./transaction-system.md)。订单明细应保存成交时商品名称、单价与规格快照，单价乘数量的行内约束和跨行总额对账要分别处理。

## 结构演进与验收

新增字段先确认旧代码能否读写，再决定允许 NULL、回填与 NOT NULL 的顺序；改变精度、长度或排序规则之前，统计超界值和规范化后冲突。把金额从 DOUBLE 改成 DECIMAL 不能恢复已经丢失的精度，需从权威账务记录重建或对账。DDL 是否重建、锁表或可立即完成取决于具体操作，先在同版本副本验证，评估空间、锁等待和复制影响。

验收至少覆盖最小/最大值、超界、小数舍入、空值、大小写与尾空格、重复并发写入、外键拒绝、时间跨会话读取和 API 往返。实验表应拒绝负金额、非布尔活跃值、孤儿用户编号和重复活跃用户名；修改 SQL mode 后重新检查错误行为。索引顺序按查询的等值、范围和排序需求确定，不机械按“选择性最高放前面”排列，细节见[索引系统](./index-system.md)。
