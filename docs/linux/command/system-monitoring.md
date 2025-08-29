# Linux 系统监控

## 概述

系统监控是 Linux 系统管理的重要组成部分，通过监控系统资源使用情况，可以及时发现性能瓶颈、预防系统故障。Linux 提供了多种强大的系统监控工具。

## 系统资源监控

### top - 实时系统监控

```bash
# 启动 top
top

# 每 2 秒刷新一次
top -d 2

# 批处理模式
top -b -n 1

# 监控特定用户
top -u username
```

### htop - 增强版系统监控

```bash
# 启动 htop
htop

# 显示进程树
htop -t

# 每 1 秒刷新
htop -d 1
```

### vmstat - 虚拟内存统计

```bash
# 显示一次统计信息
vmstat

# 每 2 秒显示一次，共显示 5 次
vmstat 2 5

# 显示详细信息
vmstat -w
```

### iostat - I/O 统计

```bash
# 显示 I/O 统计信息
iostat

# 每 2 秒显示一次，共显示 5 次
iostat 2 5

# 显示详细信息
iostat -x
```

### free - 内存使用情况

```bash
# 显示内存使用情况
free

# 以人类可读格式显示
free -h

# 显示详细信息
free -m
```

### df - 磁盘空间使用

```bash
# 显示磁盘使用情况
df

# 以人类可读格式显示
df -h

# 显示文件系统类型
df -T
```

### du - 目录空间使用

```bash
# 显示目录大小
du /path/to/directory

# 以人类可读格式显示
du -h /path/to/directory

# 显示总计
du -sh /path/to/directory

# 按大小排序
du -h /path/to/directory | sort -hr
```

## 网络监控

### netstat - 网络统计

```bash
# 显示所有连接
netstat -an

# 显示监听端口
netstat -ln

# 显示进程信息
netstat -tulpn

# 显示路由表
netstat -r
```

### ss - Socket 统计

```bash
# 显示所有连接
ss -an

# 显示监听端口
ss -ln

# 显示进程信息
ss -tulpn

# 显示详细信息
ss -i
```

### iftop - 实时网络流量

```bash
# 启动 iftop
sudo iftop

# 指定网络接口
sudo iftop -i eth0

# 显示端口信息
sudo iftop -P
```

### nethogs - 按进程显示网络使用

```bash
# 启动 nethogs
sudo nethogs

# 指定网络接口
sudo nethogs eth0

# 刷新间隔
sudo nethogs -t
```

## 进程监控

### ps - 进程状态

```bash
# 显示所有进程
ps aux

# 按 CPU 使用率排序
ps aux --sort=-%cpu

# 按内存使用率排序
ps aux --sort=-%mem

# 显示进程树
ps -ejH
```

### lsof - 打开的文件

```bash
# 显示所有打开的文件
lsof

# 显示特定进程打开的文件
lsof -p 1234

# 显示特定端口
lsof -i :80

# 显示特定用户
lsof -u username
```

## 系统负载监控

### uptime - 系统运行时间

```bash
# 显示系统运行时间和负载
uptime

# 显示详细信息
uptime -p
```

### w - 当前登录用户

```bash
# 显示当前登录用户
w

# 显示详细信息
w -h
```

### who - 登录用户

```bash
# 显示登录用户
who

# 显示详细信息
who -a
```

## 日志监控

### tail - 实时查看日志

```bash
# 实时查看日志文件
tail -f /var/log/syslog

# 显示最后 100 行
tail -n 100 /var/log/syslog

# 显示多个日志文件
tail -f /var/log/nginx/access.log /var/log/nginx/error.log
```

### journalctl - 系统日志

```bash
# 显示系统日志
journalctl

# 实时显示日志
journalctl -f

# 显示特定服务的日志
journalctl -u nginx

# 显示特定时间段的日志
journalctl --since "2023-01-01" --until "2023-01-02"
```

## 性能分析工具

### sar - 系统活动报告

```bash
# 显示 CPU 使用率
sar -u

# 显示内存使用率
sar -r

# 显示 I/O 统计
sar -b

# 显示网络统计
sar -n DEV
```

### dstat - 多功能统计工具

```bash
# 启动 dstat
dstat

# 每 2 秒显示一次
dstat 2

# 显示 CPU、内存、磁盘、网络
dstat -cdngy
```

### iotop - I/O 监控

```bash
# 启动 iotop
sudo iotop

# 只显示有 I/O 活动的进程
sudo iotop -o

# 批处理模式
sudo iotop -b
```

## 监控脚本

### 系统资源监控脚本

```bash
#!/bin/bash
# 监控系统资源使用情况
echo "=== 系统负载 ==="
uptime

echo "=== 内存使用 ==="
free -h

echo "=== 磁盘使用 ==="
df -h

echo "=== 高 CPU 进程 ==="
ps aux --sort=-%cpu | head -5

echo "=== 高内存进程 ==="
ps aux --sort=-%mem | head -5
```

### 网络连接监控脚本

```bash
#!/bin/bash
# 监控网络连接
echo "=== 监听端口 ==="
netstat -tulpn | grep LISTEN

echo "=== 活跃连接 ==="
netstat -an | grep ESTABLISHED | wc -l

echo "=== 网络接口统计 ==="
cat /proc/net/dev
```

## 故障排除

### 常见问题

```bash
# 系统负载过高
uptime
top -b -n 1 | head -20

# 内存不足
free -h
ps aux --sort=-%mem | head -10

# 磁盘空间不足
df -h
du -sh /* | sort -hr

# 网络连接问题
netstat -tulpn
ping google.com
```

## 最佳实践

1. **定期监控**：设置定时任务定期检查系统状态
2. **设置告警**：配置监控工具在资源使用过高时告警
3. **日志分析**：定期分析系统日志发现潜在问题
4. **性能基准**：建立系统性能基准，便于对比分析
5. **工具组合**：结合多种监控工具获得全面信息