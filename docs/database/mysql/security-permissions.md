# MySQL 安全与权限管理

订单客服需要查询订单状态，却不应顺带导出手机号、修改金额或删除表。把连接密码交给客服，再授予整个数据库的 `ALL PRIVILEGES`，会把这些不同能力捆在一起。安全配置要把“谁能连上、连接的是谁、允许操作什么、操作能否追溯”分别落实。

本文以 MySQL 8.4 LTS 为基线。数据库连接账号与应用注册用户是两套身份：前者由 MySQL 认证，后者由应用认证并决定租户、订单归属。共享一个数据库账号的多个应用用户，在 MySQL 看来通常仍是同一个主体。

## 从连接到数据的边界

![网络、TLS、账号与角色各自控制不同的访问边界](/database/mysql-security-boundaries.svg)

防火墙限制哪些来源能到达数据库端口，TLS 防止传输途中被读取和篡改，账号认证确认连接身份，角色和对象权限约束 SQL。前一关通过，不代表后一关自动通过；拥有 `SELECT` 也不意味着应用用户可以查询任意租户的数据。

例如，客服接口即使使用只读数据库账号，仍须绑定当前客服负责的店铺，再构造参数化查询。列级权限可以隐藏手机号，却不能自动实现“只读本店订单”的行级规则。需要通过受控查询、视图或服务边界实现该规则，并验证所有入口；不能让客户端自由传入店铺编号就算完成授权。

## 账号是用户名与来源的组合

`'support'@'localhost'` 与 `'support'@'192.0.2.10'` 是不同账号。服务端根据实际连接来源选择匹配记录，再校验凭据；不是先把所有同名账户的权限合并。精确地址、网段和通配模式有专门排序规则，不能仅按字符串长度推断命中了谁。

排查时，在发生问题的连接里执行：

```sql
SELECT USER() AS client_identity,
       CURRENT_USER() AS matched_account,
       CURRENT_ROLE() AS active_roles;
SHOW GRANTS;
```

`USER()` 反映客户端提交的用户名与连接来源，`CURRENT_USER()` 通常反映用于权限检查的匹配账号；在带 `DEFINER` 的存储对象上下文中还要考虑执行身份。经代理、容器或 NAT 连接时，服务端看到的地址可能不是开发机地址。Unix socket 与 TCP 也不能混作一种来源测试。

生产账号优先使用明确来源或受控网段，网络层同步限制访问。MySQL 8.4 中主机名里的 `%`、`_` 通配形式已弃用，不宜继续扩大依赖。启用 `skip_name_resolve` 时须检查基于主机名的授权是否仍匹配，不能改完后只验证本地 root。

8.4 默认认证插件是 `caching_sha2_password`；`mysql_native_password` 默认禁用，老驱动连接失败时优先升级驱动并检查 TLS。认证插件负责连接握手，`validate_password` 组件负责密码规则，两者职责不同。不要直接更新 `mysql.user` 保存密码或授权。

## 练习：客服只读，临时修改状态

以下在独立练习实例中由管理员初始化。`security_demo` 是示例库，不指向生产订单。生成的随机密码只在创建结果中交付给对应账号的凭据管理流程，不写进 SQL 文件、代码仓库或终端历史。

```sql
CREATE DATABASE security_demo;
CREATE TABLE security_demo.orders (
    id BIGINT UNSIGNED PRIMARY KEY,
    status VARCHAR(20) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    phone VARCHAR(20) NOT NULL
) ENGINE=InnoDB;
INSERT INTO security_demo.orders VALUES (1001, 'PENDING', 39.90, '示例号码');

CREATE ROLE 'support_read'@'localhost', 'support_status'@'localhost';
GRANT SELECT (id, status) ON security_demo.orders
    TO 'support_read'@'localhost';
GRANT UPDATE (status) ON security_demo.orders
    TO 'support_status'@'localhost';

CREATE USER 'support_demo'@'localhost' IDENTIFIED BY RANDOM PASSWORD;
GRANT 'support_read'@'localhost', 'support_status'@'localhost'
    TO 'support_demo'@'localhost';
SET DEFAULT ROLE 'support_read'@'localhost'
    TO 'support_demo'@'localhost';
```

随后使用新账号重新连接。在默认 `activate_all_roles_on_login=OFF` 的实例里，只读角色随登录激活，状态修改角色仅被授予，还没有激活。如果实例开启了该开关，登录激活范围会不同，不能直接照预期判断。

```sql
SELECT CURRENT_ROLE();
SELECT id, status FROM security_demo.orders;
```

这时应该能读到 `1001 / PENDING`；查询 `amount`、`phone` 或 `SELECT *` 应被拒绝。`UPDATE ... SET status=...` 与 `DROP TABLE` 同样不应成功。拒绝测试要单独执行，避免第一个错误中断后续测试后被误报为全部通过。

临时处理任务时，在该账号会话中显式激活两个角色：

```sql
SET ROLE 'support_read'@'localhost', 'support_status'@'localhost';
UPDATE security_demo.orders SET status='PROCESSING' WHERE id=1001;
SELECT id, status FROM security_demo.orders;
SET ROLE DEFAULT;
SELECT CURRENT_ROLE();
```

修改 `status` 应成功，修改 `amount` 仍应被拒绝。这里验证的是列范围，**没有实现业务状态机**：仅有 `UPDATE(status)` 的账号仍可能把状态写为其他字符串，应用应验证合法迁移，必要时只授予受控存储过程的 `EXECUTE`。

同样，`SET ROLE` 只是会话内的权限开关。账号已经持有该角色时，可以自行再次激活；真正的限时授权需要管理员按任务授予、到期撤销，并核查连接池，不应把“默认没激活”当成审批制度。

## 回收权限与终止访问

管理员可以查看角色本身与账号经角色获得的权限：

```sql
SHOW GRANTS FOR 'support_read'@'localhost';
SHOW GRANTS FOR 'support_demo'@'localhost'
    USING 'support_read'@'localhost', 'support_status'@'localhost';

REVOKE 'support_status'@'localhost' FROM 'support_demo'@'localhost';
ALTER USER 'support_demo'@'localhost' ACCOUNT LOCK;
```

撤销后应在既有连接和新连接分别测试。账号锁定拒绝新登录，但不等于已经终止全部旧连接。紧急回收时还要定位该账号的连接，核对连接编号后由有权限的管理会话执行 `KILL CONNECTION`，并检查后台任务、连接池重连和其他同名来源账号。

`GRANT`、`REVOKE` 等账号管理语句会让服务端重载相应授权信息，正常操作不需要额外 `FLUSH PRIVILEGES`。对既有会话，权限层级影响生效时点：

| 变化 | 既有连接的处理边界 |
| --- | --- |
| 表、列权限 | 下一次请求使用更新后的权限 |
| 数据库级权限 | 下次实际执行 `USE 数据库` 时更新；驱动可能缓存库名 |
| 静态全局权限、密码 | 既有连接不受这类变化影响，新连接使用新状态 |
| 动态全局权限 | 立即应用变化 |
| 会话内 `SET ROLE` | 立即影响该会话，不改变其他会话的激活角色 |

因此不能笼统写成“撤销立即切断访问”或“一律必须重连才有效”。权限与账号管理还可能隐式提交，必须使用独立管理会话，不夹在业务事务里期望 `ROLLBACK` 撤销授权。删除账号前检查视图、触发器和存储程序的 `DEFINER`，这些对象不会因为删账号就自动消失。

权限范围优先缩小到库、表、列或特定过程。应用账号不持有 `GRANT OPTION`、`FILE`、账号管理或关闭服务器权限；监控、迁移、备份各自使用专用账号。`ALL PRIVILEGES` 的含义取决于授予层级，也不自动包含 `GRANT OPTION`，不能当成统一的“管理员模板”。

## TLS：加密与身份验证要同时成立

下面是已签发证书环境的配置模板，文件必须存在、可由 mysqld 读取，私钥仅允许必要的系统身份访问。地址使用保留示例地址，按实际私网接口替换；防火墙同时限制来源。

```ini
[mysqld]
bind_address=192.0.2.20
ssl_ca=/etc/mysql/tls/ca.pem
ssl_cert=/etc/mysql/tls/server-cert.pem
ssl_key=/etc/mysql/tls/server-key.pem
tls_version=TLSv1.2,TLSv1.3
require_secure_transport=ON
```

`require_secure_transport` 允许 TLS TCP，也允许 Unix socket 等安全传输；它不是“所有连接都有 TLS”。针对远程服务账号还可设置 `REQUIRE SSL`，要求其使用加密连接；需要客户端证书时再选择 `REQUIRE X509` 等约束。

客户端需使用与证书名称相符的主机名，并校验受信 CA 与服务端身份：

```bash
mysql --host=db.example.test --user=order_app --password \
  --ssl-mode=VERIFY_IDENTITY --ssl-ca=/etc/app/tls/mysql-ca.pem
```

`REQUIRED` 只要求加密，`VERIFY_CA` 进一步验证证书链，`VERIFY_IDENTITY` 还校验主机身份。`REQUIRE SSL` 不会替客户端启用主机身份校验，服务端自动生成的证书也不一定含有可匹配的名称。连接后执行：

```sql
SHOW SESSION STATUS LIKE 'Ssl_version';
SHOW SESSION STATUS LIKE 'Ssl_cipher';
```

非空值能证明当前会话协商了 TLS，不能单独证明客户端使用了 `VERIFY_IDENTITY`。验收还需反向测试：错误 CA、错误主机名应失败，禁用 TLS 的远程连接应失败。证书轮换时检查有效期、名称和链，使用支持的 TLS 重载流程，再以**新连接**确认；旧连接不会自动重新握手。

## 磁盘、日志与备份的加密范围

表空间加密防护的是存储介质被取得后的部分风险，正常获授权的查询仍能读到明文。它不能补救过宽的 `SELECT` 或应用越权。

MySQL 8.4 使用 keyring 组件或支持的 keyring 插件管理密钥。社区版可使用 `component_keyring_file`，其本地文件必须独立保护；企业版还有其他后端能力。不要继续照搬旧版 `early-plugin-load=keyring_file.so`。InnoDB 在启动早期就可能需要密钥，应通过部署包对应的 `mysqld.my` 清单和组件配置文件完成早期加载，核对组件库路径、keyring 路径、系统权限与启动日志；不能把运行后执行一条 `INSTALL COMPONENT` 当成完整加密部署。

| 对象 | 需要单独核实的配置与恢复输入 |
| --- | --- |
| InnoDB 表空间 | 表空间加密状态、keyring、主密钥版本及恢复兼容性 |
| redo、undo | 各自的加密配置；不随 binlog 开关自动覆盖 |
| binlog、relay log | `binlog_encryption` 与对应 keyring 密钥；已有文件与新文件的生效范围 |
| 逻辑导出、归档、异地副本 | 备份工具/存储加密、访问控制、密钥与独立恢复演练 |

备份仅有密文文件、却丢失密钥，同样无法恢复。数据和密钥分别控制访问，但必须有可配对、可验证的恢复版本。详细恢复流程见[备份与恢复](./backup-recovery.md)。本地 keyring 文件不自动等价于合规密钥托管，不能仅因“开启加密”就宣称满足某法规。

对于身份证件等需在应用边界保护的字段，可在应用侧使用成熟库完成带认证的加密，例如 AEAD，并由 KMS 管理密钥。保存密文、nonce、密钥版本等必要元数据，保证 nonce 使用规则和轮换策略；精确查询、排序及去重能力也要重新设计。不要把密钥硬编码在 `AES_ENCRYPT` SQL 中，SQL 日志、备份或诊断记录可能扩大泄露范围。

## 应用用户的密码不能交给 SHA2

`SHA2(password, 256)` 是快速摘要，不适合直接保存应用注册用户的密码。数据库泄露后，攻击者可以高速试猜；加盐也不能替代专门的密码派生成本。

使用成熟认证库的 Argon2id、scrypt、bcrypt 或符合要求的 PBKDF2 实现，按库的参数和硬件预算评估。数据库只保存包含算法、参数、盐和结果的完整编码，由库的验证函数核验；不要在 SQL 中重算普通摘要来登录。编码字段长度应覆盖选用格式和后续升级，不能为所有算法固定为 64 字符。

数据库连接密码则由账号认证插件管理。应用通过凭据系统注入连接信息，避免命令行明文参数和源码内常量；轮换时验证新旧凭据切换、连接池续连及回滚路径。密码复杂度组件和账号失败锁定规则需要按实际风险配置，不应替代泄露后立即吊销与隔离。

## 审计与故障排查

MySQL Enterprise Audit 是有版本与许可边界的能力，不是社区版默认自带。使用它时按对应版本配置过滤器并分配给账号，验证成功登录、失败登录、授权修改、敏感读取和失败操作分别留下什么记录；不能设置一个并不存在的通用 `audit_log_filter` 变量就算启用。

社区环境可以结合代理、应用审计和受支持的审计扩展，但要核实是否存在绕过入口。general log、slow log、binlog 分别面向请求记录、慢查询和变更恢复，覆盖范围不同，不是可互换的完整安全审计。SQL 和导出文件本身也可能含隐私，需限制读取、保留周期并防止日志被同一业务账号篡改。

排查按下列顺序收敛，避免一遇到拒绝就授予全库权限：

1. **连接不到**：核对监听接口、实际来源、路由、防火墙和端口。改成非默认端口不能代替访问控制。
2. **TLS 失败**：核对客户端模式、CA、证书名称/期限和驱动支持，保留原验证错误。
3. **认证失败**：检查匹配账号、认证插件、账号锁定/密码过期与连接池旧凭据。
4. **连接成功但 SQL 拒绝**：查看 `CURRENT_USER()`、`CURRENT_ROLE()` 和对象/列权限，再检查视图或过程的执行身份。
5. **疑似泄露**：保存证据，锁定对应来源账号、按需终止旧会话、轮换凭据，复查其他入口与备份访问，最后验证业务和审计链路恢复。

完成练习后，由管理员在独立实例清理示例对象：

```sql
DROP USER 'support_demo'@'localhost';
DROP ROLE 'support_read'@'localhost', 'support_status'@'localhost';
DROP DATABASE security_demo;
```
