# Linux 进程管理命令详解

## 概述

进程管理是Linux系统管理的核心内容之一。Linux系统中的每个运行程序都是一个进程，掌握进程管理命令对于系统监控、性能优化和故障排除至关重要。本文档详细介绍Linux中常用的进程管理命令及其应用场景。

## 进程基础概念

### 进程状态

- **R (Running)**：正在运行或等待运行
- **S (Sleeping)**：可中断睡眠状态
- **D (Uninterruptible Sleep)**：不可中断睡眠状态
- **T (Stopped)**：已停止的进程
- **Z (Zombie)**：僵尸进程
- **X (Dead)**：已死亡的进程

### 进程优先级

- **PRI**：进程优先级（内核计算）
- **NI**：Nice值（-20到19，值越小优先级越高）
- **实时优先级**：0-99（数值越大优先级越高）

### 进程关系

- **PID**：进程ID
- **PPID**：父进程ID
- **PGID**：进程组ID
- **SID**：会话ID

## 进程查看命令

### ps - 进程状态查看

**基本语法**：
```bash
ps [options]
```

**常用选项**：
```bash
# 显示当前用户的进程
ps

# 显示所有进程
ps -e
ps -A
ps aux

# 显示详细信息
ps -f
ps -l

# 显示进程树
ps -ejH
ps --forest

# 自定义输出格式
ps -eo pid,ppid,cmd,pcpu,pmem
ps -eo pid,user,cmd --sort=-pcpu

# 查找特定进程
ps aux | grep nginx
ps -C nginx
ps -p 1234

# 显示线程信息
ps -eLf
ps -T

# 实时更新（类似top）
ps aux --sort=-pcpu | head -10
```

**输出字段说明**：
- **PID**：进程ID
- **PPID**：父进程ID
- **USER**：进程所有者
- **%CPU**：CPU使用率
- **%MEM**：内存使用率
- **VSZ**：虚拟内存大小
- **RSS**：物理内存大小
- **TTY**：终端类型
- **STAT**：进程状态
- **START**：启动时间
- **TIME**：累计CPU时间
- **COMMAND**：命令行

### top - 实时进程监控

**基本使用**：
```bash
# 启动top
top

# 指定刷新间隔
top -d 2

# 显示特定用户的进程
top -u username

# 显示特定进程
top -p 1234,5678

# 批处理模式
top -b -n 1

# 显示线程
top -H
```

**交互式按键**：
- **h**：显示帮助
- **q**：退出
- **k**：终止进程
- **r**：重新设置进程优先级
- **u**：显示特定用户进程
- **M**：按内存使用排序
- **P**：按CPU使用排序
- **T**：按运行时间排序
- **1**：显示所有CPU核心
- **f**：选择显示字段
- **o**：改变排序字段
- **W**：保存配置

**输出解释**：
```bash
# 系统信息行
top - 14:30:25 up 5 days,  2:15,  3 users,  load average: 0.15, 0.25, 0.30
# 时间 运行时间 用户数 负载平均值（1分钟，5分钟，15分钟）

# 任务信息
Tasks: 245 total,   1 running, 244 sleeping,   0 stopped,   0 zombie

# CPU使用率
%Cpu(s):  2.3 us,  1.2 sy,  0.0 ni, 96.2 id,  0.3 wa,  0.0 hi,  0.0 si,  0.0 st
# us: 用户空间 sy: 系统空间 ni: nice进程 id: 空闲 wa: 等待IO

# 内存使用
KiB Mem :  8174332 total,  1234567 free,  2345678 used,  4594087 buff/cache
KiB Swap:  2097148 total,  2097148 free,        0 used.  5456789 avail Mem
```

### htop - 增强版进程监控

**安装**：
```bash
# Ubuntu/Debian
sudo apt install htop

# CentOS/RHEL
sudo yum install htop
```

**使用**：
```bash
# 启动htop
htop

# 显示进程树
htop -t

# 显示特定用户进程
htop -u username
```

**功能键**：
- **F1**：帮助
- **F2**：设置
- **F3**：搜索
- **F4**：过滤
- **F5**：树形显示
- **F6**：排序
- **F9**：终止进程
- **F10**：退出

### pstree - 进程树显示

```bash
# 显示进程树
pstree

# 显示PID
pstree -p

# 显示用户
pstree -u

# 显示特定进程的子进程
pstree 1234
pstree -p nginx

# 显示线程
pstree -t

# 紧凑显示
pstree -c
```

## 进程控制命令

### kill - 终止进程

**基本语法**：
```bash
kill [signal] PID
```

**常用信号**：
```bash
# 查看所有信号
kill -l

# 常用信号
kill -1 PID   # SIGHUP，重新加载配置
kill -2 PID   # SIGINT，中断（Ctrl+C）
kill -9 PID   # SIGKILL，强制终止
kill -15 PID  # SIGTERM，正常终止（默认）
kill -18 PID  # SIGCONT，继续执行
kill -19 PID  # SIGSTOP，暂停执行

# 按名称终止进程
killall nginx
killall -9 firefox

# 按模式终止进程
pkill -f "python.*script.py"
pkill -u username
pkill -9 -f "java.*tomcat"
```

### nohup - 后台运行

```bash
# 后台运行命令
nohup command &

# 重定向输出
nohup command > output.log 2>&1 &

# 查看后台任务
jobs

# 将任务放到后台
bg %1

# 将任务调到前台
fg %1

# 脱离终端运行
disown %1
```

### screen - 会话管理

```bash
# 创建新会话
screen
screen -S session_name

# 列出会话
screen -ls

# 恢复会话
screen -r
screen -r session_name

# 分离会话（在screen内）
Ctrl+A, D

# 终止会话
screen -X -S session_name quit

# 共享会话
screen -x session_name
```

### tmux - 终端复用器

```bash
# 创建新会话
tmux
tmux new -s session_name

# 列出会话
tmux ls

# 连接会话
tmux attach -t session_name
tmux a -t session_name

# 分离会话
Ctrl+B, D

# 终止会话
tmux kill-session -t session_name

# 窗口管理
Ctrl+B, C    # 创建新窗口
Ctrl+B, N    # 下一个窗口
Ctrl+B, P    # 上一个窗口
Ctrl+B, 0-9  # 切换到指定窗口

# 面板管理
Ctrl+B, %    # 垂直分割
Ctrl+B, "    # 水平分割
Ctrl+B, 方向键 # 切换面板
```

## 进程优先级管理

### nice - 设置进程优先级

```bash
# 以指定优先级运行命令
nice -n 10 command
nice --adjustment=10 command

# 最高优先级（需要root权限）
sudo nice -n -20 command

# 最低优先级
nice -n 19 command

# 查看nice值
ps -eo pid,ni,cmd
```

### renice - 修改运行中进程的优先级

```bash
# 修改进程优先级
sudo renice -n -5 -p 1234
renice 10 1234

# 修改用户所有进程优先级
sudo renice -n 5 -u username

# 修改进程组优先级
sudo renice -n 0 -g 1000
```

## 系统资源监控

### iostat - I/O统计

```bash
# 基本使用
iostat

# 指定间隔和次数
iostat 2 5

# 显示扩展统计
iostat -x

# 显示特定设备
iostat -x sda

# 以MB为单位显示
iostat -m
```

### vmstat - 虚拟内存统计

```bash
# 基本使用
vmstat

# 指定间隔
vmstat 2
vmstat 2 5

# 显示磁盘统计
vmstat -d

# 显示内存统计
vmstat -s

# 显示分区统计
vmstat -p /dev/sda1
```

### sar - 系统活动报告

```bash
# CPU使用率
sar -u 2 5

# 内存使用率
sar -r 2 5

# I/O统计
sar -b 2 5

# 网络统计
sar -n DEV 2 5

# 查看历史数据
sar -u -f /var/log/sysstat/saXX

# 生成报告
sar -A > system_report.txt
```

## 实用脚本和技巧

### 进程监控脚本

```bash
#!/bin/bash
# 进程监控脚本

monitor_process() {
    local process_name=$1
    local threshold_cpu=${2:-80}
    local threshold_mem=${3:-80}
    
    echo "监控进程: $process_name"
    echo "CPU阈值: $threshold_cpu%"
    echo "内存阈值: $threshold_mem%"
    echo "开始时间: $(date)"
    echo
    
    while true; do
        # 获取进程信息
        process_info=$(ps aux | grep "$process_name" | grep -v grep)
        
        if [ -z "$process_info" ]; then
            echo "$(date): 进程 $process_name 未运行"
        else
            echo "$process_info" | while read line; do
                pid=$(echo $line | awk '{print $2}')
                cpu=$(echo $line | awk '{print $3}')
                mem=$(echo $line | awk '{print $4}')
                cmd=$(echo $line | awk '{for(i=11;i<=NF;i++) printf "%s ", $i; print ""}')
                
                # 检查CPU使用率
                if (( $(echo "$cpu > $threshold_cpu" | bc -l) )); then
                    echo "$(date): 警告 - 进程 $pid CPU使用率过高: $cpu%"
                fi
                
                # 检查内存使用率
                if (( $(echo "$mem > $threshold_mem" | bc -l) )); then
                    echo "$(date): 警告 - 进程 $pid 内存使用率过高: $mem%"
                fi
                
                echo "$(date): PID=$pid CPU=$cpu% MEM=$mem% CMD=$cmd"
            done
        fi
        
        sleep 10
    done
}

# 使用示例
monitor_process "nginx" 70 60
```

### 系统负载监控脚本

```bash
#!/bin/bash
# 系统负载监控脚本

load_monitor() {
    local threshold=${1:-2.0}
    
    echo "系统负载监控 - 阈值: $threshold"
    echo "开始时间: $(date)"
    echo
    
    while true; do
        # 获取负载信息
        load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
        
        # 获取CPU核心数
        cpu_cores=$(nproc)
        
        # 计算负载百分比
        load_percent=$(echo "scale=2; $load_avg / $cpu_cores * 100" | bc)
        
        echo "$(date): 负载=$load_avg CPU核心=$cpu_cores 负载率=${load_percent}%"
        
        # 检查是否超过阈值
        if (( $(echo "$load_avg > $threshold" | bc -l) )); then
            echo "$(date): 警告 - 系统负载过高: $load_avg"
            
            # 显示占用CPU最多的进程
            echo "CPU使用率最高的进程:"
            ps aux --sort=-pcpu | head -6
            echo
        fi
        
        sleep 30
    done
}

# 使用示例
load_monitor 1.5
```

### 内存使用监控脚本

```bash
#!/bin/bash
# 内存使用监控脚本

memory_monitor() {
    local threshold=${1:-80}
    
    echo "内存使用监控 - 阈值: $threshold%"
    echo "开始时间: $(date)"
    echo
    
    while true; do
        # 获取内存信息
        mem_info=$(free | grep Mem:)
        total=$(echo $mem_info | awk '{print $2}')
        used=$(echo $mem_info | awk '{print $3}')
        available=$(echo $mem_info | awk '{print $7}')
        
        # 计算使用百分比
        used_percent=$(echo "scale=2; $used / $total * 100" | bc)
        available_percent=$(echo "scale=2; $available / $total * 100" | bc)
        
        echo "$(date): 内存使用率=${used_percent}% 可用=${available_percent}%"
        
        # 检查是否超过阈值
        if (( $(echo "$used_percent > $threshold" | bc -l) )); then
            echo "$(date): 警告 - 内存使用率过高: ${used_percent}%"
            
            # 显示内存使用最多的进程
            echo "内存使用最多的进程:"
            ps aux --sort=-pmem | head -6
            echo
        fi
        
        sleep 60
    done
}

# 使用示例
memory_monitor 85
```

### 僵尸进程清理脚本

```bash
#!/bin/bash
# 僵尸进程清理脚本

clean_zombies() {
    echo "检查僵尸进程..."
    
    # 查找僵尸进程
    zombies=$(ps aux | awk '$8 ~ /^Z/ {print $2}')
    
    if [ -z "$zombies" ]; then
        echo "没有发现僵尸进程"
        return 0
    fi
    
    echo "发现僵尸进程:"
    ps aux | awk '$8 ~ /^Z/ {print $2, $11}'
    
    # 尝试清理僵尸进程
    for zombie_pid in $zombies; do
        # 获取父进程ID
        ppid=$(ps -o ppid= -p $zombie_pid 2>/dev/null | tr -d ' ')
        
        if [ -n "$ppid" ] && [ "$ppid" != "1" ]; then
            echo "尝试重启父进程 $ppid 以清理僵尸进程 $zombie_pid"
            
            # 发送SIGCHLD信号给父进程
            kill -CHLD $ppid 2>/dev/null
            
            sleep 2
            
            # 检查僵尸进程是否仍然存在
            if ps -p $zombie_pid > /dev/null 2>&1; then
                echo "僵尸进程 $zombie_pid 仍然存在，可能需要重启父进程"
            else
                echo "僵尸进程 $zombie_pid 已清理"
            fi
        fi
    done
}

# 定期检查
while true; do
    clean_zombies
    echo "等待5分钟后再次检查..."
    sleep 300
done
```

## 性能调优技巧

### CPU密集型任务优化

```bash
# 使用taskset绑定CPU核心
taskset -c 0,1 command
taskset -p 0x3 PID

# 查看CPU亲和性
taskset -p PID

# 使用ionice设置I/O优先级
ionice -c 1 -n 4 command  # 实时调度，优先级4
ionice -c 2 -n 7 command  # 最佳努力，优先级7
ionice -c 3 command       # 空闲调度

# 查看I/O优先级
ionice -p PID
```

### 内存优化

```bash
# 清理页面缓存
sudo sync
sudo echo 1 > /proc/sys/vm/drop_caches

# 清理目录项和inode缓存
sudo echo 2 > /proc/sys/vm/drop_caches

# 清理所有缓存
sudo echo 3 > /proc/sys/vm/drop_caches

# 查看内存详细信息
cat /proc/meminfo

# 查看进程内存映射
pmap PID
cat /proc/PID/maps
```

## 故障排除

### 高CPU使用率问题

```bash
# 找出CPU使用率最高的进程
top -bn1 | head -20
ps aux --sort=-pcpu | head -10

# 分析进程CPU使用情况
strace -p PID
perf top -p PID

# 查看进程线程
ps -eLf | grep PID
top -H -p PID
```

### 内存泄漏问题

```bash
# 监控进程内存使用
watch -n 1 'ps aux --sort=-pmem | head -10'

# 查看进程内存详情
cat /proc/PID/status
cat /proc/PID/smaps

# 使用valgrind检测内存泄漏
valgrind --leak-check=full command
```

### 进程无响应问题

```bash
# 查看进程状态
ps aux | grep PID
cat /proc/PID/stat

# 查看进程调用栈
sudo gdb -p PID
(gdb) bt
(gdb) quit

# 查看系统调用
strace -p PID
```

## 总结

进程管理是Linux系统管理的核心技能，掌握这些命令对于系统监控、性能优化和故障排除至关重要：

### 核心命令分类

1. **进程查看**：`ps`、`top`、`htop`、`pstree` - 查看进程状态和信息
2. **进程控制**：`kill`、`killall`、`pkill`、`nohup` - 控制进程生命周期
3. **会话管理**：`screen`、`tmux` - 管理终端会话
4. **优先级管理**：`nice`、`renice` - 调整进程优先级
5. **系统监控**：`iostat`、`vmstat`、`sar` - 监控系统资源