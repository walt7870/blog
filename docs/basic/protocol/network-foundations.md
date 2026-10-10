---
title: 分层、寻址与路由
author: Walt
date: 2026-07-12
---

# 分层、寻址与路由

网络层以下解决的是“数据怎样离开本机、经过多个网络并到达目标主机”。这条路径由链路帧、IP 数据包、路由表、邻居缓存和路径 MTU 共同组成。

## 封装与解封装

应用发送一段数据时，协议栈逐层增加控制信息：

```text
HTTP Message
└── TLS Record
    └── TCP Segment / QUIC Packet
        └── IP Packet
            └── Ethernet Frame
```

接收端先校验 Frame，再根据 EtherType 交给 IPv4 或 IPv6；IP 根据 Protocol 或 Next Header 交给 TCP、UDP 或 ICMP；传输层根据端口和连接标识找到 Socket；应用最后解释 HTTP、DNS 或自定义消息。

一次 `send()` 不对应一个 TCP Segment，一次 `recv()` 也不对应一条应用消息。应用写入的是字节流，分段由 MSS、拥塞窗口、网卡卸载和调度共同决定。

## Ethernet、MAC 与交换机

以太网负责当前广播域中的一跳交付。Frame 的关键字段包括：

| 字段 | 作用 |
|---|---|
| Destination MAC | 当前一跳接收接口 |
| Source MAC | 当前一跳发送接口 |
| EtherType | Payload 是 IPv4、IPv6、ARP 或其他协议 |
| Payload | 上层数据，常见最大值为 1500 字节 |
| FCS | 用 CRC 检测链路比特错误 |

交换机从收到 Frame 的源 MAC 学习“地址位于哪个端口”，再按目的 MAC 转发。目的地址未知时会在同一 VLAN 内泛洪。广播和未知单播不会跨越三层路由边界。

### VLAN

VLAN 在同一套交换设备上划分多个广播域。Access 端口通常属于一个 VLAN，Trunk 链路通过 802.1Q 标签携带多个 VLAN。不同 VLAN 间通信必须经过路由或三层交换。

VLAN 提供的是链路隔离边界，不自动等于安全边界。访问控制仍需要防火墙、ACL 和身份认证。

## ARP 与 IPv6 NDP

路由表给出下一跳 IP，但 Ethernet Frame 还需要目的 MAC。IPv4 使用 ARP，IPv6 使用 NDP 完成邻居解析。

访问同网段主机时，ARP 查询目标主机；访问远端网络时，ARP 查询默认网关。远端服务器的 MAC 不会跨路由器传回来，因为路由器每一跳都会重新构造链路帧。

```bash
ip route get 203.0.113.20
ip neigh show
sudo tcpdump -i eth0 -enn 'arp or icmp6'
```

Linux 邻居缓存包含 `REACHABLE`、`STALE`、`PROBE`、`FAILED` 等状态。`FAILED` 表示本机无法获得下一跳链路地址，重点应检查 VLAN、网关、无线隔离和地址冲突，而不是继续调应用超时。

IPv6 NDP 使用 ICMPv6 Neighbor Solicitation 与 Advertisement，还承担路由器发现、前缀通告、重复地址检测和邻居不可达检测。无差别屏蔽 ICMPv6 会破坏 IPv6 的基础运行机制。

## DHCP：配置从哪里来

主机要正常访问外部网络，至少需要地址、前缀、默认网关和 DNS。DHCP 的首次获取通常经历 DORA：

1. **Discover**：客户端尚无地址，通过广播寻找服务器。
2. **Offer**：服务器给出候选地址和租约参数。
3. **Request**：客户端声明选择的服务器和地址。
4. **ACK**：服务器确认租约生效。

广播不会跨路由器。多个 VLAN 共用集中 DHCP 时，网关上的 Relay 接收本地广播，填写来源网段信息后转成单播。

租约到达 T1 后优先向原服务器续租；到达 T2 后可向其他服务器广播重绑定；真正过期后必须停止使用地址。静态地址若落入 DHCP 动态池，可能造成间歇性地址冲突。

## IPv4、前缀与 CIDR

IPv4 地址共 32 位。`192.168.10.42/24` 表示前 24 位是网络前缀，后 8 位用于该网段内寻址。

```text
IP:       192.168.10.42
Mask:     255.255.255.0
Network:  192.168.10.0
Broadcast:192.168.10.255
```

前缀长度增加一位，地址块大小减半。`/26` 每个块 64 个地址，边界依次为 `.0`、`.64`、`.128`、`.192`。

地址规划不能只看当前主机数，还要为网关、高可用地址、扩容、容器和云网络留空间，并避免办公网、VPC、VPN 与 Pod 网段重叠。

## IPv6 的变化

IPv6 使用 128 位地址，解决的不只是地址数量：

- 路由器不再替主机分片。
- Neighbor Discovery 取代 ARP。
- Link-local 地址承担邻居和路由器通信。
- SLAAC 可以根据路由器通告自动配置地址。
- 扩展头把可选能力移出固定基础头。

双栈环境中，主机可能同时拥有 A 与 AAAA 记录。客户端会在 IPv4 和 IPv6 路径之间竞争或回退，因此“只有部分用户慢”可能来自其中一条地址族路径异常。

## 路由表与最长前缀匹配

路由表中的一项通常包括目的前缀、下一跳、出口接口和度量。内核选择能够匹配目标地址且前缀最长的一项。

```text
0.0.0.0/0        via 10.0.0.1
10.10.0.0/16     via 10.0.0.2
10.10.20.0/24    dev eth1
```

目标 `10.10.20.8` 同时匹配三项，最终选择 `/24`。默认路由只在没有更具体前缀时使用。

```bash
ip route
ip route get 10.10.20.8
traceroute 10.10.20.8
```

OSPF 主要在一个管理域内部传播链路状态并计算路径；BGP 在自治系统之间传播可达前缀和策略属性。互联网路由优先表达策略，不保证物理距离最短。

## NAT 与连接跟踪

NAT 修改地址或端口，并在连接跟踪表中维护双向映射。家庭网关常把多个内网连接映射到一个公网地址的不同源端口。

NAT 不是防火墙，但没有映射的入站流量通常找不到内部目标。状态防火墙会进一步依据 TCP 标志、超时和连接方向决定是否放行。

```bash
sudo conntrack -L
sudo nft list ruleset
ss -tan
```

连接经过多层 NAT、负载均衡和防火墙时，任一连接跟踪表耗尽都可能阻止新连接，即使服务器仍有充足资源。

## MTU、MSS 与路径 MTU

MTU 是单段链路可承载的最大 IP Packet。端到端无需分片的上限由路径上最小 MTU 决定。隧道增加额外头部，常让有效 MTU 小于 1500。

TCP MSS 只计算 TCP Payload。常见 IPv4 路径中：

```text
1500 MTU - 20 IPv4 Header - 20 TCP Header = 1460 MSS
```

路径 MTU 发现依赖 ICMP `Fragmentation Needed` 或 IPv6 `Packet Too Big`。如果中间设备屏蔽这些反馈，握手和小请求可能正常，大响应却反复重传，形成 PMTU 黑洞。

```bash
ping -D -s 1472 203.0.113.20
tracepath 203.0.113.20
sudo tcpdump -nn 'icmp or icmp6'
```

修复方向是允许必要 ICMP、修正隧道 MTU，或在明确边界上实施 MSS Clamping，而不是无限增加应用超时。

## DNS：从名称到地址

应用通常把域名交给系统 Stub Resolver，再由递归解析器寻找最终权威答案。缓存未命中时，递归解析器依次访问根、顶级域和权威服务器。

| 记录 | 用途 |
|---|---|
| A / AAAA | IPv4 / IPv6 地址 |
| CNAME | 名称别名 |
| NS | 区域权威服务器 |
| MX | 邮件交换服务器 |
| TXT | 验证信息与策略文本 |
| SRV | 服务、协议、端口和优先级 |

TTL 决定答案可以缓存多久。降低 TTL 只影响之后获得的新答案，无法远程清除已经缓存的旧 TTL。

```bash
dig example.com A
dig example.com AAAA
dig +trace example.com
dig +tcp example.com
```

`NXDOMAIN` 表示名称不存在，`SERVFAIL` 常与上游超时、DNSSEC 验证或权威故障有关。DNS 返回地址后连接仍失败，应转向路由、端口和 TLS，不要继续把所有问题归为 DNS。

## 本章检查点

- 能解释 Frame、Packet、Segment 与应用消息的边界。
- 能判断访问远端地址时 ARP 查询的是谁。
- 能用 CIDR 计算网段，并解释最长前缀匹配。
- 能解释小包正常、大包卡住的 MTU 故障。
- 能区分 DNS 解析成功与服务可用。

下一步进入 [TCP、UDP 与 Socket](./transport-socket.md)，观察端到端连接如何建立并保证交付。
