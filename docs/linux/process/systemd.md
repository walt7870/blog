# systemd - 现代 Linux 初始化系统

## 什么是 systemd

systemd 是现代 Linux 发行版中广泛使用的系统和服务管理器，它作为 PID 1 进程运行，是系统启动后的第一个用户空间进程。systemd 取代了传统的 SysV init 系统，提供了更强大、更灵活的系统管理功能。

### 核心特性

- **并行启动**：同时启动多个服务，显著提高系统启动速度
- **依赖管理**：基于依赖关系的智能服务启动顺序
- **按需启动**：只在需要时启动服务，节省系统资源
- **统一管理**：统一的服务、挂载点、设备、套接字管理
- **日志集成**：内置的日志系统，提供结构化日志
- **资源控制**：通过 cgroups 实现精细的资源管理

### systemd 的优势

| 特性 | 传统 init | systemd |
|------|-----------|----------|
| 启动方式 | 串行启动 | 并行启动 |
| 配置文件 | Shell 脚本 | 声明式配置 |
| 依赖管理 | 手动管理 | 自动解析 |
| 日志系统 | 分散管理 | 统一管理 |
| 资源控制 | 有限支持 | 完整支持 |
| 服务监控 | 基础功能 | 高级监控 |

## systemd 架构组件

### 核心守护进程

#### 1. systemd (PID 1)
主进程，负责系统和服务管理：

```bash
# 查看 systemd 状态
sudo systemctl status

# 查看 systemd 版本
systemctl --version

# 分析启动时间
systemd-analyze

# 查看启动链
systemd-analyze critical-chain
```

#### 2. systemd-journald
日志管理守护进程：

```bash
# 查看所有日志
journalctl

# 查看特定服务日志
journalctl -u nginx.service

# 实时查看日志
journalctl -f

# 查看启动日志
journalctl -b

# 查看错误日志
journalctl -p err

# 查看特定时间范围的日志
journalctl --since "2024-01-01" --until "2024-01-02"
```

#### 3. systemd-logind
登录会话管理：

```bash
# 查看当前登录会话
loginctl list-sessions

# 查看用户状态
loginctl show-user $USER

# 查看座位信息
loginctl list-seats

# 终止用户会话
sudo loginctl terminate-user username
```

#### 4. systemd-networkd
网络配置管理：

```bash
# 查看网络状态
networkctl status

# 查看网络接口
networkctl list

# 重新配置网络
sudo networkctl reload

# 查看特定接口状态
networkctl status eth0
```

#### 5. systemd-resolved
DNS 解析服务：

```bash
# 查看 DNS 状态
resolvectl status

# 查询域名
resolvectl query google.com

# 清除 DNS 缓存
sudo resolvectl flush-caches

# 查看 DNS 统计
resolvectl statistics
```

## systemctl 命令详解

### 基本服务管理

```bash
# 启动服务
sudo systemctl start nginx

# 停止服务
sudo systemctl stop nginx

# 重启服务
sudo systemctl restart nginx

# 重新加载配置（不重启服务）
sudo systemctl reload nginx

# 查看服务状态
systemctl status nginx

# 检查服务是否运行
systemctl is-active nginx

# 检查服务是否启用
systemctl is-enabled nginx
```

### 服务开机管理

```bash
# 启用服务（开机自启）
sudo systemctl enable nginx

# 禁用服务
sudo systemctl disable nginx

# 启用并立即启动
sudo systemctl enable --now nginx

# 禁用并立即停止
sudo systemctl disable --now nginx

# 屏蔽服务（完全禁用）
sudo systemctl mask nginx

# 取消屏蔽
sudo systemctl unmask nginx
```

### 系统状态查看

```bash
# 查看所有服务状态
systemctl list-units --type=service

# 查看失败的服务
systemctl --failed

# 查看所有已安装的单元文件
systemctl list-unit-files

# 查看依赖关系
systemctl list-dependencies nginx

# 查看服务树
systemctl status --all
```

## 服务单元文件详解

### 单元文件位置

```bash
# 系统单元文件
/usr/lib/systemd/system/     # 软件包安装的单元
/etc/systemd/system/         # 系统管理员创建的单元
/run/systemd/system/         # 运行时单元

# 用户单元文件
~/.config/systemd/user/      # 用户自定义单元
/usr/lib/systemd/user/       # 系统提供的用户单元
```

### 服务单元文件结构

```ini
[Unit]
# 单元描述和依赖关系
Description=My Web Application
Documentation=https://example.com/docs
After=network.target
Requires=network.target
Wants=redis.service
Conflicts=apache2.service

[Service]
# 服务配置
Type=simple
User=webapp
Group=webapp
WorkingDirectory=/opt/webapp
Environment=NODE_ENV=production
EnvironmentFile=/etc/webapp/config
ExecStartPre=/opt/webapp/scripts/pre-start.sh
ExecStart=/opt/webapp/bin/server
ExecReload=/bin/kill -HUP $MAINPID
ExecStop=/opt/webapp/scripts/stop.sh
Restart=always
RestartSec=5
TimeoutStartSec=30
TimeoutStopSec=30

# 安全设置
PrivateTmp=true
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/webapp

# 资源限制
MemoryLimit=512M
CPUQuota=50%
TasksMax=100

[Install]
# 安装配置
WantedBy=multi-user.target
Also=webapp-worker.service
```

### 服务类型说明

| Type | 说明 | 适用场景 |
|------|------|----------|
| simple | 默认类型，ExecStart 进程为主进程 | 前台运行的服务 |
| forking | 服务会 fork 子进程，父进程退出 | 传统守护进程 |
| oneshot | 执行一次性任务后退出 | 初始化脚本 |
| notify | 服务启动后会通知 systemd | 支持 sd_notify 的服务 |
| idle | 延迟启动直到其他任务完成 | 避免输出混乱 |

## 实际应用示例

### 示例 1：创建自定义 Web 服务

```bash
# 1. 创建服务文件
sudo vim /etc/systemd/system/myapp.service
```

```ini
[Unit]
Description=My Node.js Application
After=network.target

[Service]
Type=simple
User=nodejs
WorkingDirectory=/opt/myapp
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# 2. 重新加载 systemd 配置
sudo systemctl daemon-reload

# 3. 启用并启动服务
sudo systemctl enable --now myapp

# 4. 查看服务状态
systemctl status myapp
```

### 示例 2：创建定时任务服务

```bash
# 创建服务文件
sudo vim /etc/systemd/system/backup.service
```

```ini
[Unit]
Description=Database Backup Service

[Service]
Type=oneshot
User=backup
ExecStart=/opt/scripts/backup-database.sh
```

```bash
# 创建定时器文件
sudo vim /etc/systemd/system/backup.timer
```

```ini
[Unit]
Description=Run backup daily
Requires=backup.service

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
# 启用定时器
sudo systemctl enable --now backup.timer

# 查看定时器状态
systemctl list-timers
```

### 示例 3：服务依赖管理

```bash
# 创建数据库服务
sudo vim /etc/systemd/system/mydb.service
```

```ini
[Unit]
Description=My Database Service
After=network.target

[Service]
Type=forking
User=database
ExecStart=/opt/database/bin/start
PIDFile=/var/run/mydb.pid

[Install]
WantedBy=multi-user.target
```

```bash
# 创建依赖数据库的应用服务
sudo vim /etc/systemd/system/webapp.service
```

```ini
[Unit]
Description=Web Application
After=network.target mydb.service
Requires=mydb.service

[Service]
Type=simple
User=webapp
ExecStart=/opt/webapp/start
Restart=always

[Install]
WantedBy=multi-user.target
```

## 高级功能

### 1. 资源控制 (cgroups)

```bash
# 在服务文件中添加资源限制
[Service]
# 内存限制
MemoryLimit=1G
MemoryHigh=800M

# CPU 限制
CPUQuota=50%
CPUWeight=100

# I/O 限制
IOWeight=100
IOReadBandwidthMax=/dev/sda 10M
IOWriteBandwidthMax=/dev/sda 5M

# 进程数限制
TasksMax=50

# 文件描述符限制
LimitNOFILE=1024
```

### 2. 安全特性

```bash
[Service]
# 私有临时目录
PrivateTmp=true

# 只读文件系统
ProtectSystem=strict
ReadWritePaths=/var/log/myapp

# 隐藏 /home 目录
ProtectHome=true

# 禁止新权限
NoNewPrivileges=true

# 系统调用过滤
SystemCallFilter=@system-service
SystemCallErrorNumber=EPERM

# 网络命名空间
PrivateNetwork=true

# 设备访问控制
PrivateDevices=true
DevicePolicy=closed
```

### 3. 环境变量管理

```bash
# 在服务文件中设置环境变量
[Service]
# 直接设置
Environment=NODE_ENV=production
Environment=PORT=3000

# 从文件读取
EnvironmentFile=/etc/myapp/config
EnvironmentFile=-/etc/myapp/optional-config
```

```bash
# 环境变量文件示例 (/etc/myapp/config)
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=5432
```

## 故障排除

### 常见问题诊断

```bash
# 1. 服务启动失败
systemctl status myapp.service
journalctl -u myapp.service
journalctl -u myapp.service --since "1 hour ago"

# 2. 查看详细错误信息
journalctl -u myapp.service -n 50
journalctl -u myapp.service -f

# 3. 检查配置文件语法
sudo systemd-analyze verify /etc/systemd/system/myapp.service

# 4. 重新加载配置
sudo systemctl daemon-reload

# 5. 重置失败状态
sudo systemctl reset-failed myapp.service
```

### 性能分析

```bash
# 分析启动时间
systemd-analyze
systemd-analyze blame
systemd-analyze critical-chain

# 生成启动图表
systemd-analyze plot > boot.svg

# 分析特定服务
systemd-analyze critical-chain nginx.service
```

### 系统恢复

```bash
# 进入救援模式
sudo systemctl rescue

# 进入紧急模式
sudo systemctl emergency

# 切换到多用户模式
sudo systemctl isolate multi-user.target

# 切换到图形模式
sudo systemctl isolate graphical.target
```

## 最佳实践

### 1. 服务设计原则

- **单一职责**：每个服务只负责一个功能
- **无状态设计**：避免依赖本地状态
- **优雅关闭**：正确处理 SIGTERM 信号
- **健康检查**：提供服务健康状态检查
- **日志规范**：使用结构化日志格式

### 2. 安全配置

```bash
# 最小权限原则
[Service]
User=myapp
Group=myapp
SupplementaryGroups=

# 文件系统保护
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
PrivateDevices=true

# 网络安全
IPAddressDeny=any
IPAddressAllow=localhost
IPAddressAllow=10.0.0.0/8

# 系统调用限制
SystemCallFilter=@system-service
SystemCallErrorNumber=EPERM
```

### 3. 监控和维护

```bash
#!/bin/bash
# 服务健康检查脚本

services=("nginx" "mysql" "redis")

for service in "${services[@]}"; do
    if systemctl is-active --quiet "$service"; then
        echo "✓ $service is running"
    else
        echo "✗ $service is not running"
        # 发送告警或自动重启
        sudo systemctl start "$service"
    fi
done

# 检查失败的服务
failed_services=$(systemctl --failed --no-legend | wc -l)
if [ "$failed_services" -gt 0 ]; then
    echo "Warning: $failed_services services have failed"
    systemctl --failed
fi
```

### 4. 日志管理

```bash
# 配置日志轮转
sudo vim /etc/systemd/journald.conf
```

```ini
[Journal]
# 限制日志大小
SystemMaxUse=1G
SystemKeepFree=2G
SystemMaxFileSize=100M

# 日志保留时间
MaxRetentionSec=1month

# 日志压缩
Compress=yes

# 转发到 syslog
ForwardToSyslog=yes
```

## 总结

systemd 作为现代 Linux 系统的核心组件，提供了强大而灵活的系统管理功能。通过理解其架构、掌握 systemctl 命令、学会编写服务单元文件，可以有效地管理和维护 Linux 系统。

**关键要点：**

1. **统一管理**：systemd 提供了统一的服务、日志、网络管理接口
2. **并行启动**：显著提高系统启动速度和效率
3. **依赖管理**：自动处理服务间的依赖关系
4. **资源控制**：通过 cgroups 实现精细的资源管理
5. **安全特性**：提供多层次的安全保护机制
6. **故障恢复**：强大的故障诊断和恢复功能

掌握 systemd 是现代 Linux 系统管理的必备技能，它不仅简化了系统管理工作，还提供了更好的系统可靠性和安全性。