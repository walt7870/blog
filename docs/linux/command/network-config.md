# Linux 网络配置和诊断

## 概述

网络配置和诊断是 Linux 系统管理的重要技能，涉及网络接口配置、路由设置、防火墙配置、网络故障排除等。掌握这些技能对于维护网络连接和解决网络问题至关重要。

## 网络接口配置

### 静态 IP 配置

#### 使用 ifconfig
```bash
# 配置 IP 地址
sudo ifconfig eth0 192.168.1.100 netmask 255.255.255.0

# 配置网关
sudo route add default gw 192.168.1.1

# 配置 DNS
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
```

#### 使用 ip 命令
```bash
# 配置 IP 地址
sudo ip addr add 192.168.1.100/24 dev eth0

# 配置网关
sudo ip route add default via 192.168.1.1

# 启用接口
sudo ip link set eth0 up
```

### 动态 IP 配置 (DHCP)

```bash
# 使用 dhclient 获取 IP
sudo dhclient eth0

# 释放 IP 地址
sudo dhclient -r eth0

# 重新获取 IP
sudo dhclient eth0
```

### 网络配置文件

#### Ubuntu/Debian (/etc/network/interfaces)
```bash
# 编辑网络配置
sudo nano /etc/network/interfaces

# 静态配置示例
auto eth0
iface eth0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    dns-nameservers 8.8.8.8 8.8.4.4

# DHCP 配置示例
auto eth0
iface eth0 inet dhcp
```

#### CentOS/RHEL (/etc/sysconfig/network-scripts/)
```bash
# 编辑网络配置
sudo nano /etc/sysconfig/network-scripts/ifcfg-eth0

# 静态配置示例
DEVICE=eth0
BOOTPROTO=static
IPADDR=192.168.1.100
NETMASK=255.255.255.0
GATEWAY=192.168.1.1
DNS1=8.8.8.8
ONBOOT=yes

# DHCP 配置示例
DEVICE=eth0
BOOTPROTO=dhcp
ONBOOT=yes
```

## NetworkManager 配置

### nmcli 命令

```bash
# 显示连接
nmcli connection show

# 显示设备
nmcli device status

# 创建新连接
nmcli connection add type ethernet con-name "my-connection" ifname eth0

# 配置静态 IP
nmcli connection modify "my-connection" ipv4.addresses 192.168.1.100/24
nmcli connection modify "my-connection" ipv4.gateway 192.168.1.1
nmcli connection modify "my-connection" ipv4.dns 8.8.8.8

# 启用连接
nmcli connection up "my-connection"

# 禁用连接
nmcli connection down "my-connection"
```

### nmtui 交互式配置

```bash
# 启动交互式配置
nmtui
```

## 路由配置

### 静态路由

```bash
# 添加静态路由
sudo ip route add 192.168.2.0/24 via 192.168.1.1

# 添加默认路由
sudo ip route add default via 192.168.1.1

# 删除路由
sudo ip route del 192.168.2.0/24

# 显示路由表
ip route show
```

### 路由配置文件

```bash
# 编辑路由配置
sudo nano /etc/sysconfig/network-scripts/route-eth0

# 添加静态路由
192.168.2.0/24 via 192.168.1.1
```

## DNS 配置

### resolv.conf 配置

```bash
# 编辑 DNS 配置
sudo nano /etc/resolv.conf

# 配置示例
nameserver 8.8.8.8
nameserver 8.8.4.4
search example.com
```

### systemd-resolved 配置

```bash
# 启用 systemd-resolved
sudo systemctl enable systemd-resolved
sudo systemctl start systemd-resolved

# 配置 DNS
sudo systemd-resolve --set-dns=8.8.8.8 --interface=eth0
```

## 防火墙配置

### iptables 配置

```bash
# 显示防火墙规则
sudo iptables -L

# 允许 SSH 连接
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# 允许 HTTP 连接
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT

# 允许 HTTPS 连接
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# 保存规则
sudo iptables-save > /etc/iptables/rules.v4
```

### ufw 配置 (Ubuntu)

```bash
# 启用 ufw
sudo ufw enable

# 允许 SSH
sudo ufw allow ssh

# 允许 HTTP
sudo ufw allow 80

# 允许 HTTPS
sudo ufw allow 443

# 查看状态
sudo ufw status
```

### firewalld 配置 (CentOS/RHEL)

```bash
# 启动 firewalld
sudo systemctl start firewalld
sudo systemctl enable firewalld

# 允许服务
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# 允许端口
sudo firewall-cmd --permanent --add-port=8080/tcp

# 重新加载配置
sudo firewall-cmd --reload
```

## 网络诊断工具

### 连接测试

```bash
# 测试网络连通性
ping -c 4 google.com

# 测试端口连接
telnet google.com 80

# 使用 nc 测试端口
nc -zv google.com 80

# 使用 curl 测试 HTTP
curl -I http://google.com
```

### 路由诊断

```bash
# 跟踪路由
traceroute google.com

# 使用 mtr 诊断
mtr google.com

# 显示路由表
ip route show

# 测试路由
ping -I eth0 8.8.8.8
```

### DNS 诊断

```bash
# 测试 DNS 解析
nslookup google.com

# 使用 dig 查询
dig google.com

# 测试反向解析
dig -x 8.8.8.8

# 查看 DNS 配置
cat /etc/resolv.conf
```

### 网络接口诊断

```bash
# 显示接口状态
ip addr show

# 显示接口统计
cat /proc/net/dev

# 测试接口
ping -I eth0 8.8.8.8

# 查看接口详细信息
ethtool eth0
```

## 网络性能优化

### 网络参数调优

```bash
# 查看网络参数
sysctl -a | grep net

# 优化 TCP 参数
echo 'net.core.rmem_max = 16777216' | sudo tee -a /etc/sysctl.conf
echo 'net.core.wmem_max = 16777216' | sudo tee -a /etc/sysctl.conf
echo 'net.ipv4.tcp_rmem = 4096 87380 16777216' | sudo tee -a /etc/sysctl.conf
echo 'net.ipv4.tcp_wmem = 4096 65536 16777216' | sudo tee -a /etc/sysctl.conf

# 应用参数
sudo sysctl -p
```

### 网络监控

```bash
# 监控网络流量
iftop -i eth0

# 监控网络连接
netstat -tulpn

# 监控网络接口
watch -n 1 "cat /proc/net/dev"
```

## 故障排除

### 常见网络问题

#### 网络接口问题
```bash
# 检查接口状态
ip link show

# 重启网络接口
sudo ip link set eth0 down
sudo ip link set eth0 up

# 检查接口配置
ip addr show eth0
```

#### DNS 问题
```bash
# 测试 DNS 解析
nslookup google.com

# 使用不同 DNS 服务器
nslookup google.com 8.8.8.8

# 检查 DNS 配置
cat /etc/resolv.conf
```

#### 路由问题
```bash
# 检查路由表
ip route show

# 添加默认路由
sudo ip route add default via 192.168.1.1

# 删除错误路由
sudo ip route del default
```

#### 防火墙问题
```bash
# 检查防火墙状态
sudo iptables -L

# 临时禁用防火墙
sudo iptables -F

# 检查服务端口
netstat -tulpn | grep :80
```

## 最佳实践

1. **配置备份**：定期备份网络配置文件
2. **文档记录**：记录网络配置和变更
3. **测试验证**：配置后测试网络连接
4. **安全配置**：正确配置防火墙和安全策略
5. **监控告警**：设置网络监控和故障告警
6. **性能优化**：根据网络环境优化参数