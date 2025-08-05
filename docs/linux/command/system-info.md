# 系统信息命令

## 概述

系统信息命令用于查看和监控Linux系统的各种状态信息，包括系统资源使用情况、进程状态、网络连接、硬件信息等。这些命令对于系统管理、性能调优、故障诊断等工作至关重要。

## 系统基本信息命令

### uname - 系统信息

**功能**：显示系统基本信息。

**语法**：
```bash
uname [选项]
```

**常用选项**：
- `-a`：显示所有信息
- `-s`：显示内核名称（默认）
- `-n`：显示主机名
- `-r`：显示内核版本
- `-v`：显示内核版本详细信息
- `-m`：显示机器硬件架构
- `-p`：显示处理器类型
- `-i`：显示硬件平台
- `-o`：显示操作系统

**示例**：
```bash
# 显示所有系统信息
uname -a
# 输出：Linux hostname 5.4.0-42-generic #46-Ubuntu SMP Fri Jul 10 00:24:02 UTC 2020 x86_64 x86_64 x86_64 GNU/Linux

# 显示内核版本
uname -r
# 输出：5.4.0-42-generic

# 显示主机名
uname -n
hostname  # 等同命令

# 显示硬件架构
uname -m
# 输出：x86_64

# 显示操作系统
uname -o
# 输出：GNU/Linux
```

### whoami/who/w - 用户信息

#### whoami - 当前用户

**功能**：显示当前登录的用户名。

```bash
whoami
# 输出：username

# 等同于
echo $USER
id -un
```

#### who - 登录用户

**功能**：显示当前登录到系统的用户。

**语法**：
```bash
who [选项] [文件]
```

**常用选项**：
- `-a`：显示所有信息
- `-b`：显示系统启动时间
- `-r`：显示运行级别
- `-u`：显示用户空闲时间
- `-H`：显示列标题

**示例**：
```bash
# 显示登录用户
who
# 输出：
# user1    pts/0        2024-01-15 10:30 (192.168.1.100)
# user2    pts/1        2024-01-15 11:00 (192.168.1.101)

# 显示详细信息
who -a

# 显示系统启动时间
who -b
# 输出：system boot  2024-01-15 09:00

# 显示运行级别
who -r
# 输出：run-level 5  2024-01-15 09:00
```

#### w - 详细用户信息

**功能**：显示当前登录用户及其活动。

**语法**：
```bash
w [选项] [用户]
```

**示例**：
```bash
# 显示所有用户活动
w
# 输出：
#  11:30:25 up 2:30,  2 users,  load average: 0.15, 0.10, 0.05
# USER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT
# user1    pts/0    192.168.1.100    10:30    0.00s  0.04s  0.00s w
# user2    pts/1    192.168.1.101    11:00    5:00   0.02s  0.02s vim file.txt

# 显示特定用户
w user1

# 简化输出
w -s
```

### uptime - 系统运行时间

**功能**：显示系统运行时间和负载。

**语法**：
```bash
uptime [选项]
```

**常用选项**：
- `-p`：以友好格式显示运行时间
- `-s`：显示系统启动时间

**示例**：
```bash
# 显示系统运行时间和负载
uptime
# 输出：11:30:25 up 2:30, 2 users, load average: 0.15, 0.10, 0.05
#       当前时间  运行时间 用户数  1分钟 5分钟 15分钟平均负载

# 友好格式显示
uptime -p
# 输出：up 2 hours, 30 minutes

# 显示启动时间
uptime -s
# 输出：2024-01-15 09:00:25
```

## 进程管理命令

### ps - 进程状态

**功能**：显示当前运行的进程。

**语法**：
```bash
ps [选项]
```

**常用选项**：
- `aux`：显示所有进程详细信息
- `ef`：显示所有进程及其命令行
- `-u 用户`：显示指定用户的进程
- `-p PID`：显示指定PID的进程
- `--forest`：以树形结构显示进程

**示例**：
```bash
# 显示所有进程
ps aux
# 输出：
# USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
# root         1  0.0  0.1  19696  1234 ?        Ss   09:00   0:01 /sbin/init
# user      1234  1.5  2.3  45678  5678 pts/0    S+   10:30   0:05 python script.py

# 显示进程树
ps aux --forest
ps -ef --forest

# 显示特定用户进程
ps -u username

# 显示特定进程
ps -p 1234

# 自定义输出格式
ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%cpu

# 实时监控（结合watch）
watch -n 1 'ps aux --sort=-%cpu | head -10'

# 查找特定进程
ps aux | grep apache
ps aux | grep -v grep | grep apache  # 排除grep自身
```

**进程状态说明**：
- `R`：运行中
- `S`：可中断睡眠
- `D`：不可中断睡眠
- `T`：停止
- `Z`：僵尸进程
- `<`：高优先级
- `N`：低优先级
- `+`：前台进程组
- `s`：会话领导者
- `l`：多线程

### top - 实时进程监控

**功能**：实时显示系统进程信息。

**语法**：
```bash
top [选项]
```

**常用选项**：
- `-d 秒数`：设置刷新间隔
- `-p PID`：只监控指定进程
- `-u 用户`：只显示指定用户的进程
- `-n 次数`：运行指定次数后退出
- `-b`：批处理模式

**交互命令**：
- `q`：退出
- `h`：帮助
- `k`：杀死进程
- `r`：重新设置进程优先级
- `M`：按内存使用排序
- `P`：按CPU使用排序
- `T`：按运行时间排序
- `u`：显示指定用户进程
- `1`：显示所有CPU核心
- `f`：选择显示字段
- `o`：改变排序字段

**示例**：
```bash
# 基本使用
top

# 设置刷新间隔为2秒
top -d 2

# 只监控特定进程
top -p 1234

# 只显示特定用户进程
top -u username

# 批处理模式（适合脚本）
top -b -n 1

# 监控特定进程并输出到文件
top -b -n 1 -p 1234 > process_info.txt
```

**输出解释**：
```
top - 11:30:25 up 2:30,  2 users,  load average: 0.15, 0.10, 0.05
Tasks: 123 total,   1 running, 122 sleeping,   0 stopped,   0 zombie
%Cpu(s):  2.3 us,  1.2 sy,  0.0 ni, 96.5 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
MiB Mem :   8192.0 total,   6144.0 free,   1536.0 used,    512.0 buff/cache
MiB Swap:   2048.0 total,   2048.0 free,      0.0 used.   6400.0 avail Mem

  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
 1234 user      20   0  123456   7890   1234 S   5.3   0.1   0:05.67 python
```

### htop - 增强版top

**功能**：更友好的进程监控工具（需要安装）。

**安装**：
```bash
# Ubuntu/Debian
sudo apt install htop

# CentOS/RHEL
sudo yum install htop
# 或
sudo dnf install htop

# macOS
brew install htop
```

**特点**：
- 彩色显示
- 支持鼠标操作
- 可视化CPU和内存使用
- 更直观的进程树
- 更多的排序选项

### jobs/bg/fg - 作业控制

#### jobs - 显示作业

**功能**：显示当前shell的作业列表。

```bash
# 显示作业列表
jobs
# 输出：
# [1]+  Running                 sleep 100 &
# [2]-  Stopped                 vim file.txt

# 显示作业PID
jobs -l
# 输出：
# [1]+ 12345 Running                 sleep 100 &
# [2]- 12346 Stopped                 vim file.txt
```

#### bg - 后台运行

**功能**：将作业放到后台运行。

```bash
# 将当前作业放到后台
# Ctrl+Z 暂停当前作业
bg

# 将指定作业放到后台
bg %1
bg %2
```

#### fg - 前台运行

**功能**：将后台作业调到前台。

```bash
# 将最近的作业调到前台
fg

# 将指定作业调到前台
fg %1
fg %2
```

**作业控制示例**：
```bash
# 启动一个长时间运行的命令
sleep 100

# 按Ctrl+Z暂停
# [1]+  Stopped                 sleep 100

# 查看作业
jobs
# [1]+  Stopped                 sleep 100

# 放到后台继续运行
bg %1
# [1]+ sleep 100 &

# 直接在后台启动
sleep 200 &
# [2] 12347

# 调回前台
fg %1
```

## 系统资源监控命令

### free - 内存使用情况

**功能**：显示系统内存使用情况。

**语法**：
```bash
free [选项]
```

**常用选项**：
- `-h`：人性化显示（KB, MB, GB）
- `-m`：以MB为单位显示
- `-g`：以GB为单位显示
- `-s 秒数`：每隔指定秒数刷新
- `-c 次数`：显示指定次数后退出
- `-t`：显示总计行

**示例**：
```bash
# 基本显示
free
# 输出：
#               total        used        free      shared  buff/cache   available
# Mem:        8388608     1572864     5242880       65536     1572864     6291456
# Swap:       2097152           0     2097152

# 人性化显示
free -h
# 输出：
#               total        used        free      shared  buff/cache   available
# Mem:           8.0G        1.5G        5.0G         64M        1.5G        6.0G
# Swap:          2.0G          0B        2.0G

# 以MB显示
free -m

# 每2秒刷新一次
free -h -s 2

# 显示5次后退出
free -h -c 5

# 显示总计
free -h -t
```

**字段说明**：
- `total`：总内存
- `used`：已使用内存
- `free`：空闲内存
- `shared`：共享内存
- `buff/cache`：缓冲区和缓存
- `available`：可用内存（包括可释放的缓存）

### df - 磁盘使用情况

**功能**：显示文件系统磁盘使用情况。

**语法**：
```bash
df [选项] [文件系统...]
```

**常用选项**：
- `-h`：人性化显示
- `-T`：显示文件系统类型
- `-i`：显示inode使用情况
- `-x 类型`：排除指定文件系统类型
- `-t 类型`：只显示指定文件系统类型
- `--total`：显示总计

**示例**：
```bash
# 基本显示
df
# 输出：
# Filesystem     1K-blocks    Used Available Use% Mounted on
# /dev/sda1       20971520 5242880  15728640  26% /
# /dev/sda2       10485760 1048576   9437184  11% /home

# 人性化显示
df -h
# 输出：
# Filesystem      Size  Used Avail Use% Mounted on
# /dev/sda1        20G  5.0G   15G  26% /
# /dev/sda2        10G  1.0G  9.0G  11% /home

# 显示文件系统类型
df -hT
# 输出：
# Filesystem     Type      Size  Used Avail Use% Mounted on
# /dev/sda1      ext4       20G  5.0G   15G  26% /
# /dev/sda2      ext4       10G  1.0G  9.0G  11% /home

# 显示inode使用情况
df -hi

# 只显示本地文件系统
df -h -x tmpfs -x devtmpfs

# 显示特定目录所在的文件系统
df -h /home

# 显示总计
df -h --total
```

### du - 目录使用情况

**功能**：显示目录或文件的磁盘使用情况。

**语法**：
```bash
du [选项] [目录或文件...]
```

**常用选项**：
- `-h`：人性化显示
- `-s`：只显示总计
- `-a`：显示所有文件和目录
- `-d 深度`：限制显示深度
- `--max-depth=深度`：同-d
- `-c`：显示总计
- `-x`：不跨越文件系统边界
- `--exclude=模式`：排除匹配的文件

**示例**：
```bash
# 显示当前目录使用情况
du -h

# 只显示当前目录总计
du -sh
# 输出：1.5G    .

# 显示指定目录总计
du -sh /home/user
# 输出：2.3G    /home/user

# 显示一级子目录大小
du -h --max-depth=1
du -h -d 1  # 简写

# 显示所有文件和目录
du -ah

# 排序显示（结合sort）
du -h | sort -hr
du -h --max-depth=1 | sort -hr

# 查找大文件/目录
du -ah | sort -hr | head -20

# 排除特定文件
du -h --exclude="*.log" --exclude="*.tmp"

# 显示多个目录
du -sh /home /var /tmp

# 实用示例
# 查找占用空间最大的目录
du -h --max-depth=1 /home | sort -hr | head -10

# 查找大于100MB的目录
du -h --max-depth=2 | awk '$1 ~ /[0-9]+G/ || ($1 ~ /[0-9]+M/ && $1+0 > 100)'
```

### iostat - I/O统计

**功能**：显示CPU和I/O统计信息（需要安装sysstat包）。

**安装**：
```bash
# Ubuntu/Debian
sudo apt install sysstat

# CentOS/RHEL
sudo yum install sysstat
```

**语法**：
```bash
iostat [选项] [间隔] [次数]
```

**常用选项**：
- `-x`：显示扩展统计
- `-d`：只显示设备统计
- `-c`：只显示CPU统计
- `-h`：人性化显示
- `-m`：以MB/s显示
- `-k`：以KB/s显示

**示例**：
```bash
# 基本显示
iostat

# 显示扩展统计
iostat -x

# 每2秒显示一次，共5次
iostat -x 2 5

# 只显示磁盘统计
iostat -d

# 人性化显示
iostat -h

# 监控特定设备
iostat -x sda 2
```

## 网络信息命令

### netstat - 网络连接

**功能**：显示网络连接、路由表、接口统计等。

**语法**：
```bash
netstat [选项]
```

**常用选项**：
- `-a`：显示所有连接
- `-t`：显示TCP连接
- `-u`：显示UDP连接
- `-l`：只显示监听端口
- `-n`：以数字形式显示地址和端口
- `-p`：显示进程ID和名称
- `-r`：显示路由表
- `-i`：显示网络接口
- `-s`：显示统计信息

**示例**：
```bash
# 显示所有连接
netstat -a

# 显示TCP监听端口
netstat -tln
# 输出：
# Proto Recv-Q Send-Q Local Address           Foreign Address         State
# tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN
# tcp        0      0 127.0.0.1:3306          0.0.0.0:*               LISTEN

# 显示UDP端口
netstat -uln

# 显示进程信息
netstat -tlnp
# 输出：
# Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name
# tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      1234/sshd

# 显示所有TCP连接
netstat -tan

# 显示路由表
netstat -rn

# 显示网络接口统计
netstat -i

# 显示网络统计
netstat -s

# 实用示例
# 查看特定端口
netstat -tln | grep :80
netstat -tlnp | grep :3306

# 统计连接状态
netstat -tan | awk '{print $6}' | sort | uniq -c

# 查看连接数最多的IP
netstat -tan | grep ESTABLISHED | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -nr
```

### ss - 现代网络工具

**功能**：netstat的现代替代品，更快更强大。

**语法**：
```bash
ss [选项] [过滤器]
```

**常用选项**：
- `-a`：显示所有套接字
- `-t`：显示TCP套接字
- `-u`：显示UDP套接字
- `-l`：显示监听套接字
- `-n`：不解析服务名
- `-p`：显示进程信息
- `-s`：显示统计信息
- `-4`：只显示IPv4
- `-6`：只显示IPv6

**示例**：
```bash
# 显示所有TCP连接
ss -ta

# 显示监听端口
ss -tln

# 显示进程信息
ss -tlnp

# 显示统计信息
ss -s

# 过滤特定端口
ss -tln sport = :80
ss -tln dport = :3306

# 过滤特定状态
ss -t state established
ss -t state listening

# 显示特定进程的连接
ss -tlnp | grep nginx

# 实用示例
# 查看连接数
ss -s

# 查看特定端口连接
ss -tn dst :80

# 统计连接状态
ss -tan | awk 'NR>1 {print $1}' | sort | uniq -c
```

### lsof - 列出打开文件

**功能**：列出系统中打开的文件和网络连接。

**语法**：
```bash
lsof [选项] [文件]
```

**常用选项**：
- `-i`：显示网络连接
- `-p PID`：显示指定进程打开的文件
- `-u 用户`：显示指定用户打开的文件
- `-c 命令`：显示指定命令打开的文件
- `-t`：只显示PID
- `+D 目录`：显示目录下所有打开的文件

**示例**：
```bash
# 显示所有打开的文件
lsof

# 显示网络连接
lsof -i

# 显示特定端口
lsof -i :80
lsof -i :22

# 显示TCP连接
lsof -i tcp

# 显示UDP连接
lsof -i udp

# 显示特定进程打开的文件
lsof -p 1234

# 显示特定用户打开的文件
lsof -u username

# 显示特定命令打开的文件
lsof -c nginx
lsof -c mysql

# 显示打开特定文件的进程
lsof /var/log/syslog

# 显示目录下打开的文件
lsof +D /home/user

# 实用示例
# 查看端口被哪个进程占用
lsof -i :8080

# 查看文件被哪个进程打开
lsof /path/to/file

# 杀死占用文件的进程
lsof -t /path/to/file | xargs kill

# 查看删除但未释放的文件
lsof | grep deleted
```

## 硬件信息命令

### lscpu - CPU信息

**功能**：显示CPU架构信息。

```bash
# 显示CPU信息
lscpu
# 输出：
# Architecture:        x86_64
# CPU op-mode(s):      32-bit, 64-bit
# Byte Order:          Little Endian
# CPU(s):              4
# On-line CPU(s) list: 0-3
# Thread(s) per core:  2
# Core(s) per socket:  2
# Socket(s):           1
# Model name:          Intel(R) Core(TM) i5-8250U CPU @ 1.60GHz

# 只显示在线CPU
lscpu --online

# 解析特定字段
lscpu | grep "Model name"
lscpu | grep "CPU(s):"
```

### lsmem - 内存信息

**功能**：显示内存块信息。

```bash
# 显示内存信息
lsmem

# 显示摘要
lsmem --summary

# 以不同单位显示
lsmem --output-all
```

### lsblk - 块设备信息

**功能**：以树形结构显示块设备。

**语法**：
```bash
lsblk [选项] [设备]
```

**常用选项**：
- `-f`：显示文件系统信息
- `-m`：显示权限信息
- `-t`：显示拓扑信息
- `-S`：只显示SCSI设备
- `-d`：不显示从设备

**示例**：
```bash
# 显示所有块设备
lsblk
# 输出：
# NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
# sda      8:0    0   20G  0 disk
# ├─sda1   8:1    0   19G  0 part /
# └─sda2   8:2    0    1G  0 part [SWAP]

# 显示文件系统信息
lsblk -f
# 输出：
# NAME   FSTYPE LABEL UUID                                 MOUNTPOINT
# sda
# ├─sda1 ext4         12345678-1234-1234-1234-123456789012 /
# └─sda2 swap         87654321-4321-4321-4321-210987654321 [SWAP]

# 显示权限信息
lsblk -m

# 显示特定设备
lsblk /dev/sda
```

### lspci - PCI设备

**功能**：显示PCI设备信息。

**语法**：
```bash
lspci [选项]
```

**常用选项**：
- `-v`：详细信息
- `-vv`：更详细信息
- `-t`：树形显示
- `-k`：显示内核驱动
- `-n`：显示数字ID

**示例**：
```bash
# 显示所有PCI设备
lspci

# 显示详细信息
lspci -v

# 树形显示
lspci -t

# 显示内核驱动
lspci -k

# 查找特定设备
lspci | grep -i network
lspci | grep -i vga
lspci | grep -i audio
```

### lsusb - USB设备

**功能**：显示USB设备信息。

```bash
# 显示USB设备
lsusb
# 输出：
# Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
# Bus 001 Device 002: ID 0123:4567 Example Corp. USB Device

# 显示详细信息
lsusb -v

# 显示树形结构
lsusb -t

# 显示特定设备
lsusb -d 0123:4567
```

## 实用技巧和最佳实践

### 1. 系统监控脚本

```bash
#!/bin/bash
# 系统监控脚本

echo "=== 系统基本信息 ==="
uname -a
echo

echo "=== 系统运行时间和负载 ==="
uptime
echo

echo "=== 内存使用情况 ==="
free -h
echo

echo "=== 磁盘使用情况 ==="
df -h
echo

echo "=== CPU使用率最高的进程 ==="
ps aux --sort=-%cpu | head -6
echo

echo "=== 内存使用率最高的进程 ==="
ps aux --sort=-%mem | head -6
echo

echo "=== 网络连接统计 ==="
ss -s
```

### 2. 性能监控组合

```bash
# 实时监控系统资源
watch -n 1 'echo "=== CPU和内存 ===" && free -h && echo && echo "=== 磁盘I/O ===" && iostat -x 1 1 | tail -n +4'

# 监控特定进程
watch -n 2 'ps aux | grep -E "(apache|mysql|nginx)" | grep -v grep'

# 监控网络连接
watch -n 5 'ss -tuln | grep LISTEN'
```

### 3. 故障诊断技巧

```bash
# 查找占用CPU最多的进程
ps aux --sort=-%cpu | head -10

# 查找占用内存最多的进程
ps aux --sort=-%mem | head -10

# 查找僵尸进程
ps aux | awk '$8 ~ /^Z/ {print $2}'

# 查找占用磁盘空间最多的目录
du -h --max-depth=1 / 2>/dev/null | sort -hr | head -10

# 查找打开文件数最多的进程
lsof | awk '{print $2}' | sort | uniq -c | sort -nr | head -10

# 查看系统负载历史
sar -u 1 10  # 需要sysstat包
```

### 4. 自动化监控

```bash
# 设置阈值监控
#!/bin/bash
# 内存使用率监控
MEM_USAGE=$(free | awk 'NR==2{printf "%.2f", $3*100/$2}')
if (( $(echo "$MEM_USAGE > 80" | bc -l) )); then
    echo "警告：内存使用率过高 ${MEM_USAGE}%"
fi

# 磁盘使用率监控
DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "警告：磁盘使用率过高 ${DISK_USAGE}%"
fi

# CPU负载监控
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
if (( $(echo "$LOAD_AVG > 2.0" | bc -l) )); then
    echo "警告：系统负载过高 $LOAD_AVG"
fi
```

## 常见问题和解决方案

### 1. 进程无法杀死

**问题**：kill命令无法终止进程

**解决方案**：
```bash
# 查看进程状态
ps aux | grep process_name

# 尝试不同的信号
kill -TERM PID    # 正常终止
kill -KILL PID    # 强制终止
kill -9 PID       # 强制终止（简写）

# 如果是僵尸进程，需要杀死父进程
ps -eo pid,ppid,state,comm | grep Z
kill parent_pid
```

### 2. 系统负载过高

**问题**：系统响应缓慢，负载过高

**诊断步骤**：
```bash
# 1. 查看负载
uptime

# 2. 查看CPU使用情况
top
htop

# 3. 查看I/O等待
iostat -x 1

# 4. 查看进程状态
ps aux --sort=-%cpu

# 5. 查看内存使用
free -h

# 6. 查看磁盘使用
df -h
du -h --max-depth=1 /
```

### 3. 内存不足

**问题**：系统内存不足

**解决方案**：
```bash
# 查看内存使用详情
free -h
cat /proc/meminfo

# 查看占用内存最多的进程
ps aux --sort=-%mem | head -10

# 清理缓存（谨慎使用）
sync
echo 3 > /proc/sys/vm/drop_caches

# 查看交换分区使用
swapon -s

# 添加交换文件
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 4. 磁盘空间不足

**问题**：磁盘空间不足

**解决方案**：
```bash
# 查看磁盘使用情况
df -h

# 查找大文件
find / -type f -size +100M 2>/dev/null | head -20

# 查找占用空间最大的目录
du -h --max-depth=1 / 2>/dev/null | sort -hr | head -10

# 清理日志文件
sudo find /var/log -name "*.log" -type f -size +100M
sudo truncate -s 0 /var/log/large.log

# 清理临时文件
sudo rm -rf /tmp/*
sudo rm -rf /var/tmp/*

# 清理包缓存
sudo apt clean  # Ubuntu/Debian
sudo yum clean all  # CentOS/RHEL
```

## 总结

系统信息命令是Linux系统管理的基础工具，掌握这些命令对于系统监控、性能调优、故障诊断等工作至关重要：

1. **基本信息**：`uname`、`whoami`、`who`、`w`、`uptime` - 了解系统基本状态
2. **进程管理**：`ps`、`top`、`htop`、`jobs`、`bg`、`fg` - 监控和管理进程
3. **资源监控**：`free`、`df`、`du`、`iostat` - 监控系统资源使用
4. **网络信息**：`netstat`、`ss`、`lsof` - 查看网络连接和文件使用
5. **硬件信息**：`lscpu`、`lsmem`、`lsblk`、`lspci`、`lsusb` - 了解硬件配置

**学习建议**：
- 从基本的信息查看命令开始学习
- 多练习组合使用不同命令进行系统诊断
- 学会编写监控脚本自动化日常检查
- 在实际工作中多应用，积累故障诊断经验
- 关注系统性能指标的正常范围和异常表现

这些系统信息命令的熟练掌握将大大提高Linux系统管理和故障处理的效率。