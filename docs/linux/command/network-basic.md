# Linux 网络基础命令

## 概述

网络基础命令是 Linux 系统管理的重要组成部分，用于网络配置、连接测试、故障排除等。掌握这些命令对于网络管理和问题诊断至关重要。

## 网络配置命令

### ifconfig - 网络接口配置

```bash
# 显示所有网络接口
ifconfig

# 显示特定接口
ifconfig eth0

# 启用网络接口
sudo ifconfig eth0 up

# 禁用网络接口
sudo ifconfig eth0 down

# 配置 IP 地址
sudo ifconfig eth0 192.168.1.100 netmask 255.255.255.0
```

### ip - 现代网络配置工具

```bash
# 显示网络接口
ip addr show

# 显示路由表
ip route show

# 添加 IP 地址
sudo ip addr add 192.168.1.100/24 dev eth0

# 删除 IP 地址
sudo ip addr del 192.168.1.100/24 dev eth0

# 启用接口
sudo ip link set eth0 up

# 禁用接口
sudo ip link set eth0 down
```

### route - 路由管理

```bash
# 显示路由表
route -n

# 添加默认网关
sudo route add default gw 192.168.1.1

# 添加静态路由
sudo route add -net 192.168.2.0 netmask 255.255.255.0 gw 192.168.1.1

# 删除路由
sudo route del default
```

## 网络连接测试

### ping - 网络连通性测试

```bash
# 测试网络连通性
ping google.com

# 指定发送次数
ping -c 4 google.com

# 指定间隔时间
ping -i 2 google.com

# 指定数据包大小
ping -s 1000 google.com

# 显示详细统计
ping -v google.com
```

### traceroute - 路由跟踪

```bash
# 跟踪路由路径
traceroute google.com

# 指定最大跳数
traceroute -m 15 google.com

# 使用 TCP 协议
traceroute -T google.com

# 使用 UDP 协议
traceroute -U google.com
```

### mtr - 网络诊断工具

```bash
# 启动 mtr
mtr google.com

# 批处理模式
mtr -r -c 10 google.com

# 显示 IP 地址
mtr -n google.com
```

## 网络连接查看

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

# 显示网络接口统计
netstat -i
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

# 显示 TCP 连接
ss -t
```

### lsof - 打开的文件和网络连接

```bash
# 显示网络连接
lsof -i

# 显示特定端口
lsof -i :80

# 显示特定协议
lsof -i tcp

# 显示特定进程的网络连接
lsof -i -p 1234
```

## 网络服务测试

### telnet - 远程登录测试

```bash
# 测试端口连接
telnet google.com 80

# 测试本地端口
telnet localhost 22
```

### nc (netcat) - 网络工具

```bash
# 测试端口连接
nc -zv google.com 80

# 监听端口
nc -l 8080

# 发送数据
echo "test" | nc localhost 8080

# 扫描端口范围
nc -zv localhost 20-30
```

### curl - 数据传输工具

```bash
# 获取网页内容
curl http://example.com

# 显示响应头
curl -I http://example.com

# 下载文件
curl -O http://example.com/file.txt

# 发送 POST 请求
curl -X POST -d "data=value" http://example.com
```

### wget - 文件下载工具

```bash
# 下载文件
wget http://example.com/file.txt

# 后台下载
wget -b http://example.com/file.txt

# 断点续传
wget -c http://example.com/file.txt

# 递归下载
wget -r http://example.com
```

## 网络配置管理

### hostname - 主机名管理

```bash
# 显示主机名
hostname

# 设置主机名
sudo hostname newhostname

# 显示完整主机名
hostname -f
```

### hostnamectl - 系统主机名管理

```bash
# 显示主机名信息
hostnamectl

# 设置主机名
sudo hostnamectl set-hostname newhostname

# 设置图标名称
sudo hostnamectl set-icon-name server
```

### nmcli - NetworkManager 命令行工具

```bash
# 显示连接状态
nmcli connection show

# 显示设备状态
nmcli device status

# 启用连接
nmcli connection up "connection-name"

# 禁用连接
nmcli connection down "connection-name"
```

## 网络故障排除

### 常见网络问题诊断

```bash
# 检查网络接口状态
ip addr show

# 检查路由表
ip route show

# 测试 DNS 解析
nslookup google.com

# 检查 DNS 配置
cat /etc/resolv.conf

# 检查防火墙规则
iptables -L

# 检查网络服务状态
systemctl status network
```

### 网络性能测试

```bash
# 测试网络延迟
ping -c 10 google.com

# 测试网络带宽
iperf3 -c server_ip

# 测试网络吞吐量
iperf3 -s  # 服务器端
iperf3 -c server_ip  # 客户端
```

## 网络监控

### 实时网络监控

```bash
# 监控网络接口
watch -n 1 "cat /proc/net/dev"

# 监控网络连接
watch -n 1 "netstat -an | grep ESTABLISHED"

# 监控网络流量
iftop -i eth0
```

## 最佳实践

1. **网络配置备份**：定期备份网络配置文件
2. **监控网络状态**：设置网络监控和告警
3. **安全配置**：正确配置防火墙和网络安全
4. **性能优化**：根据网络环境优化网络参数
5. **故障排除**：建立网络故障排除流程