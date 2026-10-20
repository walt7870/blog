# 用户、用户组与运行身份

给订单服务创建账号，主要目的是分离部署和运行权限。账号名称便于人阅读，文件与进程的访问判断主要使用数值 UID、GID 和补充组；改名不等于把所有文件重新归属，新增组成员也不会自动更新已经运行的服务。

## 账号数据库与进程凭据不同

![账号配置在登录或服务启动时转成进程凭据，后续组修改不会自动更新已有进程](/linux/identity-group-lifecycle.svg)

`/etc/passwd` 与 `/etc/group` 是本地信息来源之一，NSS 还可能连接 LDAP、SSSD 等。用 `getent` 按系统实际解析规则查询，而不是把 `cat /etc/passwd` 的结果称为“所有用户”。`getent passwd` 的枚举范围也可能受目录服务配置限制；已知账号优先按名称查询。

```bash
id
getent passwd root
getent group root
id root
```

`id` 不带账号时报告当前进程凭据；`id 用户名` 查询该用户的账号与组信息，可能已经与老会话不同。`whoami` 报告有效用户名，不能显示全部补充组。`who`、`w`、`last` 依赖会话记录和日志，不覆盖所有非交互服务，也不能单独作为完整安全审计。

## 创建账号前明确用途

| 类型 | 通常需要 | 需要避免 |
| --- | --- | --- |
| 人员登录账号 | 家目录、已安装的登录 shell、明确认证与 sudo 策略 | 共用账号导致操作归属不清 |
| 订单运行账号 | 稳定 UID/GID、只读程序与配置、指定可写数据目录 | 默认拥有部署目录写权限 |
| 临时构建账号或容器身份 | 与卷挂载对应的数值身份、明确生命周期 | 假定同名用户在容器内外 UID 一样 |

Linux shadow-utils 中 `useradd` 的默认家目录创建、私有组和 shell 受发行版及 `/etc/default/useradd`、`/etc/login.defs` 影响；`adduser` 在不同发行版也不是同一个接口。先查询现状与本机手册，再选择参数。下面是 Debian 类环境中在隔离实验机执行的服务账号示例：

```bash
groupadd --system blog-order-lab
useradd --system --gid blog-order-lab --no-create-home \
  --home-dir /nonexistent --shell /usr/sbin/nologin blog-order-lab
id blog-order-lab
getent passwd blog-order-lab
```

示例需要管理员权限，并要求同名用户和组不存在、`/usr/sbin/nologin` 已安装。`--system` 选择系统账号分配范围，不代表具备 root 权限；nologin 主要阻止经该 shell 的交互登录，不阻止 root 或服务管理器按该 UID 启动程序。服务可写目录应另行规划和赋权，不能通过给整个 `/opt/order-api` 改属主代替。

## 补充组变更要重新建立凭据

`usermod -aG exporters 账号` 将账号追加到补充组；省略 `-a` 的 `-G` 会替换补充组列表，可能移除既有资格。主组由 `-g` 管理，与补充组不同。`gpasswd -a` 与 `gpasswd -d` 管理指定组成员，也不会修改已有进程的内核凭据。

修改后先用 `id 账号` 核对数据库状态，再新建登录会话或按发布流程重启目标服务，最后在新进程里运行 `id` 并完成实际文件操作。`newgrp` 可以建立采用新组的 shell，但不等于全系统会话刷新。容器还需核对 user namespace、宿主卷的数值属主和运行时附加组配置。

## su、sudo 与服务启动

`su - 账号` 尝试建立登录式环境，`su 账号` 保留环境的规则不同；两者仍受 PAM 和本机配置影响。`sudo -u 账号 -- 命令` 按 sudo 策略切换身份，环境可能被清理，不能假设继承当前 PATH 或 HOME。要检查可用授权可用 `sudo -l`，无需通过执行未知管理命令来试权限。

```bash
sudo -u order-api -- test -r /etc/order-api/app.conf
```

这是账号已配置时的读取线索，不完整复刻 systemd 的 namespace、LSM 标签、能力集合或文件系统沙箱。真正的验收是运行中的服务能打开配置、写入导出临时文件并完成请求。sudoers 用 `visudo` 编辑和校验；授权应限定目标命令与可控参数，文本编辑器、任意脚本或通配参数可能扩大实际执行能力。

## 修改与停用要考虑遗留对象

| 操作 | 需要核对 |
| --- | --- |
| `usermod -l 新名 旧名` | 数值 UID 通常保留，家目录、组名、unit 和外部引用需另查 |
| `usermod -d 新目录 -m 账号` | `-d` 单独改记录，`-m` 才请求移动内容；先停止相关写入并备份 |
| `passwd -l 账号` | 锁定口令不等于撤销 SSH key、活动会话、令牌或 sudo 资格 |
| `userdel 账号` | 不自动停止所有进程或处理全部文件 |
| `userdel -r 账号` | 会删除家目录与邮件等对象，但不代表全盘业务文件都已清理 |

停用前先盘点进程、定时任务、服务、认证方式、文件数值属主和业务数据保留要求，再撤销入口、停止任务、迁移对象，最后决定删除。UID 被复用后，未迁移文件可能归新账号访问；不要仅凭账号名消失就认定权限已回收。

`passwd` 交互修改口令，不能把明文口令写在命令参数或脚本正文；也不把固定周期改密当成解决凭据泄露的替代措施。系统账号文件含敏感信息，备份应限制读取并遵守恢复流程，不直接在多台机器覆盖 `/etc/passwd` 和 `/etc/shadow`。

文件权限、ACL 与目录访问的判断分别见 [文件权限](./file-permissions.md) 和 [访问权限诊断](./permissions.md)。账号存在、组信息正确、服务实际操作成功，是三个不同的检查点。
