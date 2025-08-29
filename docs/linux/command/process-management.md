# Linux 进程管理

## 概述

进程管理是 Linux 系统管理的核心技能之一。Linux 提供了丰富的进程管理工具，可以用于查看进程状态、控制进程执行、管理进程优先级等。

## 进程查看工具

### ps - 进程状态查看

```bash
# 显示所有进程
ps aux

# 显示所有进程（BSD 格式）
ps -ef

# 显示当前用户的进程
ps ux

# 自定义输出格式
ps -eo pid,user,%cpu,%mem,comm

# 查找特定进程
ps aux | grep nginx
```

### top - 实时进程监控

```bash
# 启动 top
top

# 每 2 秒刷新一次
top -d 2

# 监控特定进程
top -p 1234,5678

# 批处理模式
top -b -n 1
```

### htop - 增强版进程监控

```bash
# 启动 htop
htop

# 显示进程树
htop -t
```

## 进程控制工具

### kill - 发送信号给进程

```bash
# 正常终止进程
kill 1234

# 强制终止进程
kill -9 1234

# 发送 SIGHUP 信号
kill -HUP 1234
```

### killall - 按名称终止进程

```bash
# 终止所有 nginx 进程
killall nginx

# 强制终止所有 python 进程
killall -9 python
```

### pkill - 按模式终止进程

```bash
# 终止匹配模式的进程
pkill python

# 匹配完整命令行
pkill -f "python script.py"
```

## 作业控制

### jobs - 显示作业列表

```bash
# 显示所有作业
jobs

# 显示详细信息
jobs -l
```

### bg/fg - 后台/前台作业

```bash
# 将当前作业放到后台
bg

# 将指定作业放到前台
fg %1
```

### nohup - 忽略挂起信号

```bash
# 后台运行命令
nohup command &

# 指定输出文件
nohup command > output.log 2>&1 &
```

## 进程优先级管理

### nice - 设置进程优先级

```bash
# 以较低优先级运行命令
nice -n 10 command

# 以较高优先级运行命令
nice -n -10 command
```

### renice - 修改运行中进程的优先级

```bash
# 修改进程优先级
renice 10 1234

# 修改用户所有进程的优先级
renice 10 -u username
```

## 网络连接管理

### ss - 查看网络连接

```bash
# 显示所有连接
ss -a

# 显示 TCP 连接
ss -t

# 显示 UDP 连接
ss -u

# 显示监听端口
ss -l

# 显示进程信息
ss -p

# 显示数字地址
ss -n

# 组合使用
ss -tulpn
```

### netstat - 网络状态查看

```bash
# 显示所有连接
netstat -a

# 显示 TCP 连接
netstat -t

# 显示监听端口
netstat -l

# 显示进程信息
netstat -p

# 显示路由表
netstat -r

# 显示网络接口统计
netstat -i

# 组合使用
netstat -tulpn
```

## 文件和进程关联

### lsof - 列出打开的文件

```bash
# 显示所有打开的文件
lsof

# 显示特定进程打开的文件
lsof -p 1234

# 显示特定用户打开的文件
lsof -u username

# 显示特定文件被哪些进程打开
lsof /path/to/file

# 显示特定端口的进程
lsof -i :80

# 显示网络连接
lsof -i

# 显示 TCP 连接
lsof -i tcp

# 显示 UDP 连接
lsof -i udp
```

### fuser - 显示使用文件的进程

```bash
# 显示使用文件的进程
fuser /path/to/file

# 显示使用端口的进程
fuser 80/tcp

# 终止使用文件的进程
fuser -k /path/to/file

# 显示详细信息
fuser -v /path/to/file
```

## 系统资源监控

### iostat - I/O 统计

```bash
# 显示 CPU 和 I/O 统计
iostat

# 每 2 秒刷新一次
iostat 2

# 显示扩展统计
iostat -x

# 显示设备统计
iostat -d
```

### vmstat - 虚拟内存统计

```bash
# 显示系统统计
vmstat

# 每 2 秒刷新一次
vmstat 2

# 显示内存统计
vmstat -s

# 显示磁盘统计
vmstat -d
```

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

# 每 2 秒采样一次，共 5 次
sar -u 2 5
```

## 系统服务管理

### systemctl - 系统服务控制

```bash
# 启动服务
sudo systemctl start nginx

# 停止服务
sudo systemctl stop nginx

# 重启服务
sudo systemctl restart nginx

# 查看服务状态
sudo systemctl status nginx

# 启用服务
sudo systemctl enable nginx

# 禁用服务
sudo systemctl disable nginx

# 重新加载配置
sudo systemctl reload nginx

# 查看所有服务
sudo systemctl list-units --type=service
```

## 常见问题

```bash
# 进程无法终止
kill -9 进程ID

# 查看系统负载
uptime

# 查看高 CPU 进程
top -b -n 1 | head -20

# 查看高内存进程
ps aux --sort=-%mem | head -10
```

## 最佳实践

1. **定期监控**：使用 top 或 htop 定期监控系统
2. **合理设置优先级**：重要进程设置较高优先级
3. **及时清理**：定期清理僵尸进程和孤儿进程
4. **使用服务管理**：系统服务使用 systemctl 管理
5. **系统监控**：定期使用 `iostat`、`vmstat`、`sar` 监控系统资源
6. **网络诊断**：使用 `ss` 替代 `netstat` 获得更好的性能
7. **文件追踪**：使用 `lsof` 诊断文件占用问题
8. **端口检查**：使用 `lsof -i :端口号` 快速查找端口占用