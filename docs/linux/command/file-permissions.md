# 文件权限与属性

订单服务能读CSV却不能删除它，并不矛盾：读取看文件及路径权限，删除主要修改父目录中的名称。先明确操作对象，再看有效身份、传统权限与额外限制，不能用“全部改755”解决所有访问失败。

本页解释Linux普通文件权限与创建掩码；ACL、服务身份诊断和受控修改见 [访问权限诊断](./permissions.md)。

## 文件权限与目录权限不同

![访问路径需要目录搜索权限，读取和删除落在不同对象](/linux/path-permission-boundary.svg)

| 权限 | 普通文件 | 目录 |
| --- | --- | --- |
| r | 读取内容 | 读取目录项名称 |
| w | 修改或截断内容 | 配合x创建、删除或改名目录项 |
| x | 允许尝试执行，仍受格式与其他机制约束 | 搜索、遍历已知名称，是路径访问的重要条件 |

目录有r但没有x时，可能列出名称却不能获取完整属性或访问其下文件。删除一个只读文件仍可能成功，只要父目录允许且没有sticky等额外限制；文件可写也不表示能删除它。

`ls -l` 首字符表示类型，后九位是owner/group/other。owner按当前inode的UID确定，不一定是最初创建者；文件组也不等于用户唯一的主组。进程有有效身份和补充组，服务身份需单独核对。

## 传统权限如何选择类别

在没有扩展ACL的简化场景，先匹配owner，再匹配组，最后other；不是把三类权限相加。owner匹配但owner读位关闭，不会因为other可读就自动降级使用other。Linux capability、root权限、SELinux/AppArmor和只读挂载等还会改变或进一步限制结果。

```bash
id
ls -ld -- /opt /opt/order-api /opt/order-api/config
stat -c '%A %a %U:%G %u:%g %n' -- /opt/order-api/config/app.conf
namei -l -- /opt/order-api/config/app.conf
```

stat -c是GNU用法；namei来自util-linux。这些只读输出用于定位路径和身份，不能替代以服务实际凭据打开文件。符号链接本身的模式通常不控制目标内容访问，还要沿目标路径检查。

## chmod、chown与组

```bash
chmod u=rw,g=r,o= -- app.conf
chmod u+x -- export.sh
chgrp -- exporters shared/
chmod g+s -- shared/
```

示例假定对象已存在且账号/组已配置。第一条为640，只改权限，不改身份；chgrp需具备相应资格。chown通常需要特权；它可能清除set-ID位或文件capability，修改后应重新核对，不能把权限当永久不变。

符号模式显式写u/g/o更清楚；省略类别时，umask会影响哪些位可改变，所以 `chmod +x` 不总与 `chmod a+x` 等价。递归给所有文件755会把数据文件也加执行位，还会破坏原本更严格的模式；应先按对象职责建立清单。

## umask是位屏蔽，不是算术减法

没有默认ACL时，新对象权限可简化为 `requested_mode & ~umask`。普通创建常请求0666，目录常请求0777；应用也可能主动只请求0600。umask不能替对象添加请求中没有的执行位，也不会追溯修改已有文件。

```bash
mode_lab_dir=$(mktemp -d)
(
    cd -- "$mode_lab_dir"
    umask 027
    touch -- orders.csv
    mkdir -- exports
    stat -c '%a %n' -- orders.csv exports
    umask 003
    touch -- masked.csv
    stat -c '%a %n' -- masked.csv
)
```

预期为640 orders.csv、750 exports和664 masked.csv。最后一项说明不能算成666-003=663。子shell括号把掩码改动限制在实验中；服务通常要检查其自身启动环境或systemd的UMask。

父目录存在默认ACL时，会继承ACL并由创建请求的mode限制，不能再机械套用上述umask公式。已存在文件被touch只更新时间，不是重新创建；实验需新目录。

## 特殊位与属性的边界

| 机制 | 用途与边界 |
| --- | --- |
| setuid / setgid可执行文件 | 可改变有效UID/GID；脚本、nosuid、no_new_privs等有约束，不自动等于root |
| setgid目录 | 新建对象继承目录组，子目录通常也保留setgid；不保证组可写 |
| sticky目录 | 删除/改名通常限文件所有者、目录所有者或有特权者，还需基本目录权限 |
| immutable / append-only | chattr/lsattr管理的文件系统标志，支持及修改权限依环境而异 |
| 扩展属性xattr | 名值元数据，用getfattr/setfattr等工具；不等同于chattr标志 |

不要直接给系统二进制补setuid，或通过移除immutable来绕过未知限制。先确认它为何存在、哪个机制拒绝访问，再作范围明确的修改。

## 验证应回到原操作

先检查父路径，再核对有效身份和组、模式及ACL；权限看似允许时，再查挂载、文件系统标志、安全策略和服务沙箱。读操作成功不证明写、改名和删除也成功。复杂场景按 [访问权限诊断](./permissions.md) 以相同身份完成实际操作并复验。
