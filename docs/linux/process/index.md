# Linux 进程管理详解

## 概述

Linux 系统中运行着众多进程，这些进程可以分为两大类：内核进程和用户进程。理解这些进程的功能、特点和管理方法，对于系统管理员和开发者来说至关重要。本文档系统将详细介绍 Linux 系统中的各类进程及其管理方法。

## 文档导航

### 核心进程文档

- **[systemd - 现代初始化系统](./systemd.md)**
  - systemd 架构和组件
  - systemctl 命令详解
  - 服务单元文件配置
  - 实际应用示例和最佳实践

- **[内核线程详解](./kernel-threads.md)**
  - 内核线程的特点和功能
  - 主要内核线程介绍（kthreadd、ksoftirqd、migration 等）
  - 内核线程监控和性能优化
  - 故障排除和调优建议

- **[Init 进程详解](./init-process.md)**
  - Init 进程的作用和特点
  - Init 系统的演进（SysV、Upstart、systemd）
  - 系统启动过程和管理
  - 故障排除和性能优化

- **[用户进程管理](./user-processes.md)**
  - 用户进程的生命周期
  - 进程管理命令和工具
  - 进程监控和性能分析
  - 进程间通信和调试技术

## 进程层次结构

### 进程树概念

在 Linux 系统中，所有进程都形成一个树状结构：

```bash
# 查看进程树
pstree -p
# 或者
ps --forest
```

### PID 1 - 初始化进程

**传统的 init 系统：**
- PID 1 是系统启动后的第一个用户空间进程
- 负责启动其他系统服务
- 管理孤儿进程
- 处理系统关闭

## systemd - 现代初始化系统

### systemd 概述

systemd 是现代 Linux 发行版中广泛使用的初始化系统和服务管理器，取代了传统的 SysV init。

**主要特点：**
- 并行启动服务，提高启动速度
- 基于依赖关系的服务管理
- 统一的日志管理
- 支持按需启动服务
- 提供丰富的管理工具

### systemd 核心组件

#### 1. systemd (PID 1)

```bash
# 查看 systemd 状态
systemctl status

# 查看 systemd 版本
systemctl --version

# 查看启动时间
systemd-analyze
```

**主要职责：**
- 系统和服务管理
- 挂载文件系统
- 启动和监控服务
- 处理系统事件

#### 2. systemd-journald

```bash
# 查看系统日志
journalctl

# 查看特定服务日志
journalctl -u nginx

# 实时查看日志
journalctl -f

# 查看启动日志
journalctl -b
```

**功能：**
- 收集和存储日志
- 提供结构化日志
- 支持日志轮转
- 集中日志管理

#### 3. systemd-logind

```bash
# 查看登录会话
loginctl list-sessions

# 查看用户状态
loginctl show-user username

# 查看座位信息
loginctl list-seats
```

**功能：**
- 管理用户登录会话
- 处理电源管理事件
- 管理设备访问权限
- 处理用户切换

#### 4. systemd-networkd

```bash
# 查看网络状态
networkctl status

# 查看网络配置
networkctl list
```

**功能：**
- 网络配置管理
- DHCP 客户端
- 静态网络配置
- 网络设备管理

#### 5. systemd-resolved

```bash
# 查看 DNS 状态
resolvectl status

# 查询域名
resolvectl query example.com
```

**功能：**
- DNS 解析服务
- 本地 DNS 缓存
- mDNS 和 LLMNR 支持

### systemd 服务管理

#### 服务单元文件

**位置：**
- `/etc/systemd/system/` - 系统管理员创建的单元
- `/usr/lib/systemd/system/` - 软件包安装的单元
- `/run/systemd/system/` - 运行时单元

**示例服务文件：**

```ini
[Unit]
Description=My Custom Service
After=network.target
Requires=network.target

[Service]
Type=simple
User=myuser
WorkingDirectory=/opt/myapp
ExecStart=/opt/myapp/start.sh
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

#### 常用 systemctl 命令

```bash
# 启动服务
systemctl start service_name

# 停止服务
systemctl stop service_name

# 重启服务
systemctl restart service_name

# 重新加载配置
systemctl reload service_name

# 查看服务状态
systemctl status service_name

# 启用服务（开机自启）
systemctl enable service_name

# 禁用服务
systemctl disable service_name

# 查看所有服务
systemctl list-units --type=service

# 查看失败的服务
systemctl --failed
```

## 其他重要核心进程

### 1. kthreadd (PID 2)

```bash
# 查看内核线程
ps aux | grep "\[.*\]"
```

**功能：**
- 内核线程的父进程
- 管理所有内核线程
- 负责创建其他内核线程

### 2. ksoftirqd

```bash
# 查看软中断统计
cat /proc/softirqs

# 查看中断统计
cat /proc/interrupts
```

**功能：**
- 处理软中断
- 每个 CPU 核心一个实例
- 处理网络、块设备等软中断

### 3. migration 进程

```bash
# 查看 CPU 信息
lscpu

# 查看进程 CPU 亲和性
taskset -p PID
```

**功能：**
- 负载均衡
- 进程在 CPU 间迁移
- 每个 CPU 核心一个实例

### 4. rcu_* 进程

```bash
# 查看 RCU 统计信息
cat /proc/rcu/*
```

**功能：**
- Read-Copy-Update 机制
- 内核同步原语
- 提高并发性能

### 5. watchdog 进程

```bash
# 查看看门狗状态
cat /proc/sys/kernel/watchdog

# 查看硬件看门狗
ls /dev/watchdog*
```

**功能：**
- 系统监控
- 检测系统死锁
- 硬件看门狗管理

## 进程监控和管理

### 查看核心进程

```bash
# 查看所有进程
ps aux

# 查看进程树
pstree -p

# 查看内核线程
ps -eo pid,ppid,cmd | grep "\[.*\]"

# 查看 systemd 管理的服务
systemctl list-units

# 查看进程资源使用
top -p 1
htop
```

### 进程优先级管理

```bash
# 查看进程优先级
ps -eo pid,ni,cmd

# 修改进程优先级
renice -n 10 -p PID

# 启动时设置优先级
nice -n 10 command
```

### 进程信号管理

```bash
# 发送信号给进程
kill -SIGNAL PID

# 常用信号
kill -TERM PID    # 正常终止
kill -KILL PID    # 强制终止
kill -HUP PID     # 重新加载配置
kill -USR1 PID    # 用户定义信号
```

## 系统启动过程

### 启动阶段

1. **BIOS/UEFI**
   - 硬件初始化
   - 引导加载器定位

2. **引导加载器 (GRUB)**
   - 加载内核
   - 传递内核参数

3. **内核初始化**
   - 硬件检测
   - 驱动加载
   - 文件系统挂载

4. **systemd 启动**
   - 执行 default.target
   - 启动必要服务
   - 用户空间初始化

### 启动目标 (Targets)

```bash
# 查看当前目标
systemctl get-default

# 设置默认目标
systemctl set-default multi-user.target

# 切换到不同目标
systemctl isolate rescue.target

# 查看所有目标
systemctl list-units --type=target
```

**常用目标：**
- `poweroff.target` - 关机
- `rescue.target` - 救援模式
- `multi-user.target` - 多用户模式
- `graphical.target` - 图形界面模式
- `reboot.target` - 重启

## 故障排除

### 常见问题诊断

#### 1. 服务启动失败

```bash
# 查看服务状态
systemctl status service_name

# 查看详细日志
journalctl -u service_name

# 查看最近的错误
journalctl -p err -b
```

#### 2. 系统启动缓慢

```bash
# 分析启动时间
systemd-analyze

# 查看服务启动时间
systemd-analyze blame

# 生成启动图表
systemd-analyze plot > boot.svg
```

#### 3. 进程异常

```bash
# 查看进程状态
ps aux | grep process_name

# 查看进程文件描述符
lsof -p PID

# 查看进程内存映射
cat /proc/PID/maps

# 查看进程系统调用
strace -p PID
```

### 系统恢复

#### 救援模式

```bash
# 进入救援模式
systemctl rescue

# 进入紧急模式
systemctl emergency
```

#### 服务重置

```bash
# 重新加载 systemd 配置
systemctl daemon-reload

# 重置失败的服务
systemctl reset-failed

# 重启 systemd（谨慎使用）
systemctl daemon-reexec
```

## 性能优化

### 启动优化

```bash
# 禁用不必要的服务
systemctl disable service_name

# 延迟启动非关键服务
# 在服务文件中添加：
# [Unit]
# After=graphical-session.target
```

### 资源限制

```bash
# 设置服务资源限制
# 在服务文件中添加：
# [Service]
# MemoryLimit=512M
# CPUQuota=50%
# TasksMax=100
```

### 监控脚本

```bash
#!/bin/bash
# 核心进程监控脚本

echo "=== 系统核心进程状态 ==="
echo "systemd 状态:"
systemctl is-active systemd

echo "\n关键服务状态:"
for service in systemd-journald systemd-logind systemd-networkd; do
    echo "$service: $(systemctl is-active $service)"
done

echo "\n内核线程数量:"
ps aux | grep -c "\[.*\]"

echo "\n系统负载:"
uptime

echo "\n内存使用:"
free -h
```

## 最佳实践

### 服务管理

1. **使用 systemd 服务**
   - 避免直接运行后台进程
   - 利用 systemd 的监控和重启功能
   - 正确配置服务依赖关系

2. **日志管理**
   - 定期清理日志文件
   - 配置合适的日志级别
   - 使用结构化日志

3. **资源控制**
   - 为服务设置资源限制
   - 监控系统资源使用
   - 及时处理资源泄漏

### 安全考虑

1. **权限控制**
   - 使用最小权限原则
   - 避免以 root 运行服务
   - 正确配置文件权限

2. **服务隔离**
   - 使用 systemd 的安全特性
   - 配置服务沙箱
   - 限制服务网络访问

## 总结

Linux 核心进程是系统稳定运行的基础，其中 systemd 作为现代初始化系统，提供了强大的服务管理功能。理解这些核心进程的作用和管理方法，对于系统管理员来说至关重要。

**关键要点：**

1. **systemd 是现代 Linux 的核心**
   - 统一的服务管理
   - 并行启动提高效率
   - 丰富的管理工具

2. **内核线程负责底层功能**
   - 中断处理
   - 进程调度
   - 系统监控

3. **正确的监控和管理**
   - 定期检查服务状态
   - 分析系统性能
   - 及时处理异常

4. **持续学习和实践**
   - 了解新特性
   - 实践最佳实践
   - 建立监控体系

通过深入理解 Linux 核心进程，可以更好地管理和优化系统，确保系统的稳定性和性能。