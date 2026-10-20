# 网络配置与回退

网络配置需要同时回答三个问题：当前内核用了什么、谁负责生成这些状态、重连或重启后会恢复成什么。`ip addr add`立即生效，却可能在DHCP续租或管理器重新应用时消失；编辑了配置文件，也不等于当前连接已使用它。先识别管理者，再选择变更入口。

![持久配置、管理器和内核运行状态的关系](/linux/network-config-ownership.svg)

## 识别当前配置的所有者

发行版名称不能单独决定配置文件位置。桌面或服务器可能使用NetworkManager、systemd-networkd、Netplan或ifupdown；Netplan还会把声明转换给后端。容器网络通常由运行时或编排系统管理，不应在容器内照搬宿主机网络重启命令。

下面是只读检查入口，某些工具未安装或管理器未运行是正常分支，不能据此同时启动多套管理器：

```text
ip -br address
ip route show
ip rule show
systemctl is-active NetworkManager systemd-networkd
nmcli connection show --active
nmcli device status
networkctl status
ls -l /etc/resolv.conf
resolvectl status
```

再检查实际存在的`/etc/netplan/`、`/etc/NetworkManager/system-connections/`、`/etc/systemd/network/`或`/etc/network/interfaces`及其包含文件。传统ifcfg也可能只适用于特定发行版与插件版本，不作为所有RHEL系统的统一入口。云主机还可能由cloud-init生成配置，直接改生成文件会在后续初始化中被覆盖。

## 临时试验不等于持久配置

下面只在已授权的测试机、空闲测试接口或隔离网络命名空间中演示，`lab0`不是实际接口，保留地址不能用于公网业务。操作前确认测试范围；不在当前SSH依赖的接口上直接执行。

```text
ip address add 192.0.2.20/24 dev lab0
ip route get 192.0.2.30
ip address del 192.0.2.20/24 dev lab0
```

删除只对应本次添加的地址，不清空接口全部地址。临时路由也应记录原路由并精确回退，不能用`ip route del default`作为通用排错步骤。测试后还要确认管理器重新应用、续租或重启时的预期行为。

远程修改前，记录当前地址、路由、规则、活动连接与DNS，保留配置备份，准备云控制台或带外入口。回退计时器应在变更前就绪，并确认它不依赖被修改的连接；若工具支持带超时确认的事务或检查点，按当前版本语法使用。验证应从新的远程连接发起，原SSH存活可能只是已有连接被保留。

## 持久配置只走对应管理器

NetworkManager要修改的是连接配置，不是把设备名机械当作连接名。先用`nmcli connection show`确认UUID、绑定设备与活动配置，再修改目标连接。测试机中静态IPv4示意如下：

```text
nmcli connection modify lab-static \
  ipv4.method manual \
  ipv4.addresses 192.0.2.20/24 \
  ipv4.gateway 192.0.2.1 \
  ipv4.dns 192.0.2.53
```

示例只修改持久配置，不自动激活；网关与DNS均为占位。应用前确认网关在实际链路上可达、DNS可用、IPv6策略与多网卡路由优先级明确。`nmcli connection up`可能重建连接，不能在无回退的远程会话中盲目执行。恢复DHCP时要同时核对并清除不再需要的静态地址、网关和手动DNS设置，不只改一个`method`字段。

systemd-networkd使用`.network`等配置；下面是独立测试接口的片段，不是可覆盖整机的完整配置：

```ini
[Match]
Name=lab0

[Network]
Address=192.0.2.20/24
Gateway=192.0.2.1
DNS=192.0.2.53
```

networkd中的DNS声明需要解析服务等配套才能供应用使用，不能仅凭文件有`DNS=`就认为`/etc/resolv.conf`已经更新。使用Netplan时核对`renderer`及现有YAML合并关系，先做语法生成检查，再按当前版本的试应用与回退流程操作；`netplan try`也需要实际确认回滚结果。不要同时编辑Netplan声明和它生成的后端文件。

## DNS文件的管理权要保持一致

`/etc/resolv.conf`可能是普通文件，也可能链接到systemd-resolved或其他服务生成的文件。直接用`tee`覆盖会破坏管理关系，稍后又可能被DHCP重写。先查看链接、解析服务状态和每条链路的DNS，再在实际管理器中设置服务器与域。

systemd-resolved的`resolvectl dns 接口 服务器`、`resolvectl domain`可用于当前链路配置，但持久化通常要回到NetworkManager、networkd等来源。`resolvectl revert 接口`撤销该接口通过相应接口设置的运行时配置，不是通用的持久备份恢复。分域解析涉及搜索域与路由域，企业VPN场景不能简单把所有请求改发公共DNS。

变更后分别验证应用使用的NSS入口、需要的A/AAAA记录、内部域与外部域，再验证真实HTTPS入口。仅`dig`得到地址不能证明应用按相同路径解析；排查方式见[网络请求排查](./network.md)。

## 防火墙按规则来源与作用范围修改

先确认当前由nftables、iptables兼容层、firewalld、UFW还是云安全组控制；主机规则、容器转发链和云边界可能同时存在。`iptables`命令可能使用nft后端，不能按命令名认定是独立旧栈。查看现有规则与计数，确认流量经过INPUT、OUTPUT还是FORWARD，再修改准确位置；容器发布端口尤其不能只盯主机INPUT。

远程变更应先保证当前管理来源到实际SSH端口的允许规则，再考虑启用或收紧策略，并从第二个连接验证。UFW不应先`enable`再补SSH例外；firewalld要核对接口/来源所在zone，运行时规则和`--permanent`持久规则分别管理，永久修改不会自动改变当前状态，reload还可能重置未持久化的运行时修改。

`iptables-save`能导出规则，但保存位置和加载服务取决于系统。`sudo iptables-save > 文件`的重定向由当前shell执行，不会因为前一个命令有sudo而获得写权限；需要时使用受控的提权写入流程，并保护备份内容。恢复整套规则可能影响容器、VPN和其他管理器，不作为普通端口排查的第一步。

不要用`iptables -F`、清空nft规则集或关闭防火墙测试“是否网络问题”。优先查看规则命中、有限日志或抓包，用窄范围的临时规则验证明确假设，验证后精确撤销本次规则。连接跟踪可能保留旧会话，因此要以新连接和业务请求再次确认。

## 变更验收与性能调整

每次只改一个可解释的配置集合，保留变更前后地址、目标路由、解析结果与新连接证据。确认当前业务可用后，还要验证管理器重新应用或维护窗口重启后的持久状态；失败则从配置来源恢复并重新验收，不只把内核临时状态改回去。

高延迟不自动需要扩大TCP缓冲、端口范围或连接队列。先确认丢包、重传、握手、应用并发与内存预算；`sysctl -w`是运行时修改，持久文件可能有加载顺序和覆盖关系。未经测量不要追加整套“网络优化参数”，否则可能增加内存压力、掩盖应用连接泄漏。性能证据链见[系统监控](./system-monitoring.md)。
