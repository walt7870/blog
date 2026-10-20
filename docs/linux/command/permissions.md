# 访问权限诊断与 ACL

订单服务能启动，却不能读取配置；同一命令在管理员终端可以成功。差别常在有效身份、路径搜索、ACL、挂载或服务隔离。排查目标是找出哪一层拒绝了具体操作，再用最小范围修改，并由实际服务复验。

传统rwx、目录与文件语义、umask计算见 [文件权限](./file-permissions.md)。用户创建与组维护见 [用户管理](./user-management.md)，本页集中处理访问判断与ACL。

## 先确定身份和实际路径

![路径访问、身份权限与额外约束共同决定结果](/linux/access-check-layers.svg)

```bash
id
namei -l -- /opt/order-api/config/app.conf
stat -c '%A %a %U:%G %n' -- /opt/order-api/config/app.conf
getfacl -- /opt/order-api/config/app.conf
findmnt -T /opt/order-api/config/app.conf -o TARGET,SOURCE,FSTYPE,OPTIONS
```

这是Linux/GNU、util-linux与acl工具的只读入口。服务的用户、组、补充组、根目录、挂载命名空间可能与当前终端不同；由systemd运行时，还需检查有效unit与drop-in，以及User、Group、SupplementaryGroups、ProtectSystem、ReadWritePaths等约束。

`sudo -u app -- test -r 路径` 可作为身份线索，但不会完整复刻正在运行服务的namespace、capability、LSM标签或组状态。最终需要由真实服务完成相同打开、写入或改名动作。新增组成员后，已有进程的补充组通常不会自动刷新。

## ACL为何显示允许却仍被拒绝

Linux常见POSIX访问ACL含owner、命名用户、所属组、命名组、mask与other。mask限制命名用户及组类别的有效权限，不限制owner和other；ls的组权限位在有扩展ACL时对应mask，不能只看它判断所属组条目。

```text
user::rw-
user:exporter:rw-         #effective:r--
group::---
mask::r--
other::---
```

exporter条目写着rw，mask只有r，实际仍不可写。算法也不按所有条目简单求和：owner匹配后使用owner；命名用户匹配后受mask限制；组类别逐项检查匹配条目是否覆盖所请求的权限，并受mask限制；相应类别已匹配但不足时，不能退到other绕过。

## 有限实验：修改mask再复验

在Linux已安装acl工具的环境，新建一个当前用户可读的实验文件。用数字UID42420作为ACL条目，不要求系统已有该账号；这个UID只是演示ACL元数据，不用于验证用户登录。

```bash
acl_lab_dir=$(mktemp -d)
printf 'order_id,total\n2048,5970\n' > "$acl_lab_dir/orders.csv"
chmod 600 -- "$acl_lab_dir/orders.csv"
setfacl -m u:42420:rw-,m::r-- -- "$acl_lab_dir/orders.csv"
getfacl -n -- "$acl_lab_dir/orders.csv"
setfacl -m m::rw- -- "$acl_lab_dir/orders.csv"
getfacl -n -- "$acl_lab_dir/orders.csv"
```

第一次应显示42420条目的effective:r--，第二次mask允许rw后该条目不再被mask裁掉写权限。通常setfacl会重新计算mask，因此需要限制mask时应显式给出；使用-n禁止重算也要说明目的。此实验检查元数据变化，实际访问还取决于UID、父目录和其他约束。

## 默认ACL只影响后续创建

访问ACL决定当前对象访问；目录的默认ACL作为新建子项的继承模板，不自动追溯已有文件，也不意味着新普通文件都获得执行位。

```bash
mkdir -- "$acl_lab_dir/shared"
setfacl -m u:42420:rwx -- "$acl_lab_dir/shared"
setfacl -d -m u::rwx,u:42420:rwx,g::---,m::rwx,o::--- -- "$acl_lab_dir/shared"
(
    umask 077
    touch -- "$acl_lab_dir/shared/new.csv"
)
getfacl -n -- "$acl_lab_dir/shared/new.csv"
```

普通touch通常请求0666，继承结果会去掉有效执行权限；即使umask为077，默认ACL仍可能为命名用户保留读写权限。应用主动请求0600、之后chmod、不同文件系统行为都会影响结果，需要看实际创建方式。

chmod修改组位也会改变ACL mask，可能影响多个命名条目的有效权限；不要以为它只改了group::。`setfacl -x u:42420` 删除一个命名条目，`-b` 移除扩展访问ACL，目录默认ACL另用-k管理，二者不要混淆。

## 订单目录按职责赋权

代码和配置通常由部署身份维护，运行身份只读；导出临时目录、日志与上传目录才按需要可写。对整个应用树chown给运行账号，会让服务同时拥有修改自身代码的能力。

| 对象 | 需要证明的操作 |
| --- | --- |
| 配置文件 | 服务可读，非授权身份不可读敏感内容 |
| 产物与脚本 | 运行身份可执行/读取，部署身份控制替换 |
| 导出目录 | 可创建临时文件、写入、同目录改名及按策略清理 |
| 共享目录 | 组继承、ACL mask与新文件创建模式符合协作要求 |

例如服务要发布CSV，先写同目录临时文件再改名；仅授予现存CSV写权限，可能不足以完成创建和rename。setgid只帮助组继承，不能代替目录写权限、默认ACL和应用mode。

## 保存与恢复权限

在确定文件树和授权后，可把ACL快照写到树外的受保护位置：

```bash
getfacl -R -p -- /实际业务目录 > /受保护备份目录/order.acl
setfacl --test --restore=/受保护备份目录/order.acl
```

恢复是另一个有影响的操作，检查预演结果后才执行 `setfacl --restore=...`，再逐项复验。快照不是文件内容备份，也不完整覆盖xattr、SELinux标签、capability与所有文件系统标志；恢复身份和现存路径也要核对。不要用空格分隔的自制列表恢复任意文件名。

## 失败类型与闭环

Permission denied先看目录搜索、身份和ACL；Operation not permitted还可能涉及所有权、capability或不可变标志；Read-only file system指向挂载边界；脚本执行失败要查shebang、解释器、换行格式、noexec与安全策略。单纯添加x位不能解决所有情况。

Linux上的安全策略拒绝应从对应审计日志取证，再调整正确标签或规则；不要直接关闭策略或扩大所有人权限。修改后由同一服务身份完成读取、创建、写入、rename或删除的原始流程，核对错误日志与最终订单结果。
