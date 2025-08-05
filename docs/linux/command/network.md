# Linux 网络命令详解

## 概述

Linux网络命令是系统管理员和开发人员必须掌握的重要工具。这些命令用于配置网络接口、诊断网络问题、监控网络流量和管理网络连接。本文档详细介绍了Linux中最常用的网络命令及其应用场景。

## 网络基础概念

### 网络模型

1. **物理层**：网络硬件设备
2. **数据链路层**：MAC地址、以太网帧
3. **网络层**：IP地址、路由
4. **传输层**：TCP、UDP协议
5. **应用层**：HTTP、SSH、FTP等协议

### 重要概念

- **IP地址**：网络中设备的唯一标识
- **子网掩码**：定义网络和主机部分
- **网关**：连接不同网络的设备
- **DNS**：域名解析服务
- **端口**：应用程序的网络接口

## 网络配置命令

### ifconfig - 网络接口配置（传统）

**基本语法**：
```bash
ifconfig [interface] [options]
```

**常用操作**：
```bash
# 查看所有网络接口
ifconfig

# 查看特定接口
ifconfig eth0

# 配置IP地址
sudo ifconfig eth0 192.168.1.100 netmask 255.255.255.0

# 启用/禁用接口
sudo ifconfig eth0 up
sudo ifconfig eth0 down

# 配置别名接口
sudo ifconfig eth0:1 192.168.1.101 netmask 255.255.255.0
```

### ip - 现代网络配置工具

**基本语法**：
```bash
ip [options] object command
```

**常用操作**：
```bash
# 查看所有接口
ip addr show
ip a  # 简写

# 查看特定接口
ip addr show eth0

# 添加IP地址
sudo ip addr add 192.168.1.100/24 dev eth0

# 删除IP地址
sudo ip addr del 192.168.1.100/24 dev eth0

# 启用/禁用接口
sudo ip link set eth0 up
sudo ip link set eth0 down

# 查看路由表
ip route show
ip r  # 简写

# 添加路由
sudo ip route add 192.168.2.0/24 via 192.168.1.1

# 删除路由
sudo ip route del 192.168.2.0/24

# 添加默认网关
sudo ip route add default via 192.168.1.1
```

### hostname - 主机名管理

```bash
# 查看主机名
hostname

# 查看FQDN
hostname -f

# 查看IP地址
hostname -I

# 临时设置主机名
sudo hostname new-hostname

# 永久设置主机名
sudo hostnamectl set-hostname new-hostname
```

## 网络连接测试命令

### ping - 连通性测试

```bash
# 基本ping测试
ping google.com

# 指定次数
ping -c 4 google.com

# 指定间隔
ping -i 2 google.com

# 指定包大小
ping -s 1024 google.com

# 静默模式（只显示统计）
ping -q -c 10 google.com

# IPv6 ping
ping6 ipv6.google.com
```

### traceroute/tracepath - 路由跟踪

```bash
# 跟踪到目标的路由
traceroute google.com

# 使用UDP（默认）
traceroute -U google.com

# 使用ICMP
traceroute -I google.com

# 使用TCP
traceroute -T -p 80 google.com

# tracepath（不需要root权限）
tracepath google.com
```

### telnet - 端口连接测试

```bash
# 测试端口连通性
telnet google.com 80
telnet 192.168.1.1 22

# 测试本地端口
telnet localhost 3306
```

### nc (netcat) - 网络瑞士军刀

```bash
# 端口扫描
nc -zv google.com 80-90

# 监听端口
nc -l 8080

# 连接到端口
nc google.com 80

# 文件传输（接收端）
nc -l 8080 > received_file

# 文件传输（发送端）
nc target_ip 8080 < file_to_send

# 简单聊天服务器
nc -l 8080

# UDP模式
nc -u target_ip 53
```

## 网络信息查看命令

### netstat - 网络连接状态（传统）

```bash
# 显示所有连接
netstat -a

# 显示TCP连接
netstat -t

# 显示UDP连接
netstat -u

# 显示监听端口
netstat -l

# 显示进程信息
netstat -p

# 不解析主机名
netstat -n

# 常用组合
netstat -tulnp  # TCP/UDP监听端口，数字显示，显示进程
netstat -anp | grep :80  # 查看80端口相关连接
```

### ss - 现代网络连接查看工具

```bash
# 显示所有连接
ss -a

# 显示TCP连接
ss -t

# 显示UDP连接
ss -u

# 显示监听端口
ss -l

# 显示进程信息
ss -p

# 常用组合
ss -tulnp  # TCP/UDP监听端口，数字显示，显示进程
ss -anp | grep :80  # 查看80端口相关连接

# 显示统计信息
ss -s

# 过滤特定状态
ss -t state established
ss -t state listening
```

### lsof - 列出打开的文件和网络连接

```bash
# 查看网络连接
lsof -i

# 查看特定端口
lsof -i :80
lsof -i :22

# 查看特定协议
lsof -i tcp
lsof -i udp

# 查看特定主机连接
lsof -i @192.168.1.1

# 查看特定进程的网络连接
lsof -p PID -i

# 查看特定用户的网络连接
lsof -u username -i
```

## DNS查询命令

### nslookup - DNS查询工具

```bash
# 基本查询
nslookup google.com

# 指定DNS服务器
nslookup google.com 8.8.8.8

# 查询特定记录类型
nslookup -type=MX google.com
nslookup -type=NS google.com
nslookup -type=A google.com

# 反向查询
nslookup 8.8.8.8

# 交互模式
nslookup
> set type=MX
> google.com
> exit
```

### dig - 强大的DNS查询工具

```bash
# 基本查询
dig google.com

# 简洁输出
dig +short google.com

# 查询特定记录类型
dig google.com MX
dig google.com NS
dig google.com AAAA

# 指定DNS服务器
dig @8.8.8.8 google.com

# 反向查询
dig -x 8.8.8.8

# 跟踪查询过程
dig +trace google.com

# 查询所有记录
dig google.com ANY
```

### host - 简单DNS查询

```bash
# 基本查询
host google.com

# 查询特定记录类型
host -t MX google.com
host -t NS google.com

# 反向查询
host 8.8.8.8

# 详细输出
host -v google.com
```

## 网络监控和诊断命令

### iftop - 实时网络流量监控

```bash
# 基本使用
sudo iftop

# 指定接口
sudo iftop -i eth0

# 不解析主机名
sudo iftop -n

# 不显示端口
sudo iftop -N

# 按键操作：
# h - 帮助
# n - 切换主机名解析
# s - 切换源主机显示
# d - 切换目标主机显示
# p - 切换端口显示
# q - 退出
```

### nethogs - 按进程显示网络使用情况

```bash
# 基本使用
sudo nethogs

# 指定接口
sudo nethogs eth0

# 指定刷新间隔
sudo nethogs -d 5

# 按键操作：
# m - 切换单位（KB/s, MB/s等）
# r - 按接收流量排序
# s - 按发送流量排序
# q - 退出
```

### tcpdump - 网络包捕获和分析

```bash
# 基本捕获
sudo tcpdump

# 指定接口
sudo tcpdump -i eth0

# 捕获特定主机
sudo tcpdump host 192.168.1.1

# 捕获特定端口
sudo tcpdump port 80

# 捕获特定协议
sudo tcpdump tcp
sudo tcpdump udp
sudo tcpdump icmp

# 组合条件
sudo tcpdump host 192.168.1.1 and port 80
sudo tcpdump src 192.168.1.1 or dst 192.168.1.1

# 保存到文件
sudo tcpdump -w capture.pcap

# 从文件读取
tcpdump -r capture.pcap

# 显示详细信息
sudo tcpdump -v
sudo tcpdump -vv
sudo tcpdump -vvv

# 显示ASCII内容
sudo tcpdump -A

# 显示十六进制内容
sudo tcpdump -X
```

### wireshark - 图形化网络分析工具

```bash
# 启动Wireshark
wireshark

# 命令行版本
tshark

# 捕获特定接口
tshark -i eth0

# 应用过滤器
tshark -f "host 192.168.1.1"

# 保存捕获
tshark -w capture.pcap

# 分析捕获文件
tshark -r capture.pcap
```

## 实用技巧和脚本

### 网络连通性检查脚本

```bash
#!/bin/bash
# 网络连通性检查脚本

HOSTS=("google.com" "github.com" "stackoverflow.com")
PORTS=(80 443 22)

echo "=== 网络连通性检查 ==="

# 检查主机连通性
for host in "${HOSTS[@]}"; do
    if ping -c 1 "$host" &> /dev/null; then
        echo "✓ $host 可达"
    else
        echo "✗ $host 不可达"
    fi
done

# 检查端口连通性
echo -e "\n=== 端口连通性检查 ==="
for port in "${PORTS[@]}"; do
    if nc -z google.com "$port" 2>/dev/null; then
        echo "✓ google.com:$port 开放"
    else
        echo "✗ google.com:$port 关闭"
    fi
done
```

### 网络信息收集脚本

```bash
#!/bin/bash
# 网络信息收集脚本

echo "=== 网络接口信息 ==="
ip addr show

echo -e "\n=== 路由表 ==="
ip route show

echo -e "\n=== DNS配置 ==="
cat /etc/resolv.conf

echo -e "\n=== 活动连接 ==="
ss -tulnp

echo -e "\n=== 网络统计 ==="
ss -s
```

### 端口扫描脚本

```bash
#!/bin/bash
# 简单端口扫描脚本

if [ $# -ne 2 ]; then
    echo "用法: $0 <主机> <端口范围>"
    echo "示例: $0 192.168.1.1 1-1000"
    exit 1
fi

HOST=$1
PORT_RANGE=$2

echo "扫描主机: $HOST"
echo "端口范围: $PORT_RANGE"
echo "开放端口:"

nc -zv "$HOST" $PORT_RANGE 2>&1 | grep succeeded
```

## 网络故障诊断

### 1. 网络连接问题

**问题**：无法连接到网络

**诊断步骤**：
```bash
# 1. 检查网络接口状态
ip link show

# 2. 检查IP配置
ip addr show

# 3. 检查路由表
ip route show

# 4. 测试本地连通性
ping 127.0.0.1

# 5. 测试网关连通性
ping $(ip route | grep default | awk '{print $3}')

# 6. 测试外网连通性
ping 8.8.8.8
```

**解决方案**：
```bash
# 重启网络服务
sudo systemctl restart networking
sudo systemctl restart NetworkManager

# 重新配置网络接口
sudo ifconfig eth0 down
sudo ifconfig eth0 up

# 或使用ip命令
sudo ip link set eth0 down
sudo ip link set eth0 up

# 重新获取DHCP地址
sudo dhclient eth0
```

### 2. DNS解析问题

**问题**：域名无法解析

**诊断步骤**：
```bash
# 1. 检查DNS配置
cat /etc/resolv.conf

# 2. 测试DNS服务器连通性
ping 8.8.8.8

# 3. 测试DNS查询
nslookup google.com
dig google.com

# 4. 清除DNS缓存
sudo systemctl restart systemd-resolved
```

**解决方案**：
```bash
# 临时修改DNS
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
echo "nameserver 1.1.1.1" | sudo tee -a /etc/resolv.conf
```

### 3. 端口被占用

**问题**：端口已被其他进程占用

**诊断和解决**：
```bash
# 查找占用端口的进程
lsof -i :8080
ss -tlnp | grep :8080
netstat -tlnp | grep :8080

# 终止占用端口的进程
sudo kill -9 PID

# 或使用fuser
sudo fuser -k 8080/tcp
```

## 总结

网络命令是Linux系统管理的重要组成部分，掌握这些命令对于网络故障诊断和性能优化至关重要：

### 核心命令分类

1. **网络配置**：`ip`、`ifconfig`、`hostname` - 配置和管理网络接口
2. **连通性测试**：`ping`、`traceroute`、`telnet`、`nc` - 测试网络连接
3. **信息查看**：`netstat`、`ss`、`lsof` - 查看网络连接状态
4. **DNS查询**：`nslookup`、`dig`、`host` - 域名解析和DNS诊断
5. **网络监控**：`iftop`、`nethogs`、`tcpdump` - 网络流量监控和包分析

### 最佳实践

1. **优先使用现代工具**：`ip`替代`ifconfig`，`ss`替代`netstat`
2. **系统化诊断**：从物理层到应用层逐步排查
3. **安全意识**：使用网络工具时注意权限和安全影响
4. **文档记录**：记录网络配置和故障处理过程
5. **监控自动化**：使用脚本自动化网络监控和故障检测

### 学习建议

1. **理解网络基础**：掌握TCP/IP协议栈和网络模型
2. **实践操作**：在测试环境中练习各种网络命令
3. **故障排查**：学会系统化的网络故障诊断方法
4. **工具组合**：学会组合使用多个工具进行复杂诊断
5. **持续学习**：关注新的网络工具和技术发展

网络命令的熟练掌握将大大提高网络问题的诊断和解决效率，是Linux系统管理员必备的技能。