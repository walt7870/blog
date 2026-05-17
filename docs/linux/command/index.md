# Linux 常用命令概览

Linux 命令不是一堆孤立的速查表，而是一套和系统交互的工具箱。日常工作里最常见的动作可以归成几类：找文件、看内容、处理文本、查系统状态、排网络问题、改权限、装软件、打包传输。

![Linux 命令学习地图](/linux/linux-command-map.svg)

## 阅读路径

| 目标 | 先看 | 解决的问题 |
| --- | --- | --- |
| 熟悉目录、复制、移动、删除 | [文件基础操作](./file-basic.md) | 文件和目录如何组织 |
| 查看日志、搜索关键字、处理文本 | [文本处理命令](./text-processing.md) | 从文本里提取有效信息 |
| 查进程、负载、内存、磁盘 | [系统信息命令](./system-info.md) / [系统监控](./system-monitoring.md) | 系统是否健康 |
| 查端口、DNS、网络连通性 | [网络命令](./network.md) / [网络配置和诊断](./network-config.md) | 请求为什么不通 |
| 改权限、用户、sudo | [权限管理](./permissions.md) / [用户管理](./user-management.md) | 谁能读写和执行 |
| 压缩、解压、备份 | [压缩归档](./archive.md) | 文件如何打包传输 |
| 安装和排查软件包 | [软件包管理](./package.md) | 命令从哪里来、依赖怎么装 |

## 命令的基本结构

一条命令通常由三部分组成：

```bash
命令 [选项] [对象]
```

例如：

```bash
ls -lh /var/log
```

- `ls` 是命令，表示列出目录内容。
- `-lh` 是选项，表示长格式和人类可读大小。
- `/var/log` 是对象，表示要查看的目录。

读命令时先看动词，再看选项，最后看作用对象。写命令时也按这个顺序思考，可以减少误操作。

## 高频工作流

### 查一个服务为什么不通

1. 用 `systemctl status` 看服务是否运行。
2. 用 `ss -lntp` 看端口是否监听。
3. 用 `curl -v` 看 HTTP 响应。
4. 用 `journalctl -u` 或日志文件看错误。
5. 用 `ip route`、`ping`、`traceroute` 排查网络路径。

相关页面：

- [网络命令](./network.md)
- [网络配置和诊断](./network-config.md)
- [系统监控](./system-monitoring.md)

### 查磁盘为什么满了

1. `df -h` 看哪个挂载点满。
2. `du -sh *` 找当前目录下的大目录。
3. `find` 查大文件或旧文件。
4. 确认是否日志、缓存、备份、容器镜像占用。
5. 删除前确认文件是否仍被进程占用。

相关页面：

- [系统信息命令](./system-info.md)
- [文件查找和定位](./file-search.md)
- [文件基础操作](./file-basic.md)

### 查日志里的异常

1. `tail -f` 观察实时日志。
2. `grep` 搜索错误关键字。
3. `grep -n` 带行号定位上下文。
4. `awk` 或 `cut` 提取字段。
5. `sort | uniq -c | sort -nr` 统计频率。

相关页面：

- [文本处理命令](./text-processing.md)
- [文本比较和合并](./text-compare.md)

## 分类导航

### 文件与目录

- [文件基础操作](./file-basic.md)：`pwd`、`cd`、`ls`、`mkdir`、`cp`、`mv`、`ln`、`rm`
- [文件查看与编辑](./file-view-edit.md)：文件查看、分页、编辑器入口
- [文件查找和定位](./file-search.md)：`find`、`locate`、`which`、`whereis`
- [文件权限和属性](./file-permissions.md)：`chmod`、`chown`、`umask`、`stat`

### 文本处理

- [文本处理命令](./text-processing.md)：`cat`、`less`、`head`、`tail`、`grep`、`sed`、`awk`、`sort`、`uniq`
- [文本比较和合并](./text-compare.md)：`diff`、`comm`、`join`、`paste`

### 系统、进程和监控

- [系统信息命令](./system-info.md)：系统、CPU、内存、磁盘、登录用户等信息
- [系统监控](./system-monitoring.md)：`top`、`htop`、`vmstat`、`iostat`、`free`、`df`
- [进程管理命令](./process.md)：`ps`、`top`、`kill`、`nohup`、`screen`、`tmux`
- [进程管理速查](./process-management.md)：常见进程操作的轻量入口

### 网络

- [网络命令](./network.md)：网络接口、连接、DNS、抓包等完整说明
- [网络基础命令](./network-basic.md)：`ping`、`curl`、`wget`、`ssh`、`scp`
- [网络配置和诊断](./network-config.md)：IP、路由、DNS、防火墙和诊断流程

### 权限、用户和环境

- [权限管理](./permissions.md)：文件权限、ACL、sudo、特殊权限位
- [用户和权限管理](./user-management.md)：用户、组、sudo、身份切换
- [环境变量和配置](./environment.md)：`PATH`、`alias`、`history`、shell 配置

### 归档和软件包

- [压缩归档命令](./archive.md)：`tar`、`gzip`、`zip`、`7z` 及备份场景
- [压缩和解压速查](./archive-compress.md)：压缩工具的轻量入口
- [软件包管理](./package.md)：`apt`、`yum`、`dnf`、`pacman`、`zypper`

## grep 和正则速记

早期 `commond.md` 里的 grep 笔记已经合并到这里。常用选项：

| 选项 | 含义 |
| --- | --- |
| `-c` | 只统计匹配行数 |
| `-n` | 显示行号 |
| `-o` | 只输出匹配到的内容 |
| `-E` | 使用扩展正则表达式 |
| `-r` | 递归搜索目录 |
| `-i` | 忽略大小写 |
| `-v` | 反向匹配 |

常用正则：

| 写法 | 含义 | 示例 |
| --- | --- | --- |
| `?` | 前一个字符出现 0 次或 1 次 | `colou?r` |
| `+` | 前一个字符出现 1 次或多次，需配合 `grep -E` | `grep -E 'l+' file` |
| `|` | 或，需配合 `grep -E` | `grep -E 'error|warn' app.log` |
| `()` | 分组，需配合 `grep -E` | `grep -E 'g(oo|la)d' file` |
| `[^0-5]` | 不在 0 到 5 范围内的字符 | `grep '[^0-5]' file` |
| `^$` | 空行 | `grep '^$' file` |
| `^#` | 以 `#` 开头的行 | `grep '^#' file` |
| `\.$` | 以 `.` 结尾的行 | `grep '\.$' file` |

排查日志时常用组合：

```bash
grep -nE 'error|exception|timeout' app.log
grep -rni 'listen' /etc/nginx
grep -v '^#' nginx.conf | grep -v '^$'
```

## 安全边界

Linux 命令直接操作系统状态，以下命令要先确认作用范围：

- `rm -rf`：递归删除，不可恢复。
- `dd`：直接读写块设备，目标写错会破坏磁盘。
- `chmod -R`、`chown -R`：递归改权限，可能影响服务运行。
- `kill -9`：强制终止进程，可能导致数据未落盘。
- `iptables`、`firewall-cmd`：可能把自己挡在服务器外。

执行高风险命令前，先用 `pwd`、`ls`、`find ... -print`、`echo` 或 dry-run 模式确认目标。

## 总结

Linux 命令学习应围绕真实任务组织：文件在哪里、内容是什么、服务是否运行、网络是否通、权限是否正确、包是否安装。旧的 `commond.md` 内容已合并到本入口，后续统一从 `docs/linux/command/` 维护命令文档。
