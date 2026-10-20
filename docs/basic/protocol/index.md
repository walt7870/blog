---
title: 计算机网络与通信协议
author: Walt
date: 2026-07-12
---

# 计算机网络与通信协议

计算机网络解决的不是“把一段文本发出去”这么单一的问题，而是让不同设备、不同操作系统和不同链路上的程序，能够找到彼此、建立通信、控制发送速度、发现错误，并用双方都理解的格式交换数据。

以新建连接访问订单接口为例，请求涉及域名解析、路由与邻居解析、链路传输、安全连接和 HTTP 消息处理；中间还可能经过代理。DNS 与连接可以复用缓存或现有状态，QUIC 则把 TLS 1.3 集成在连接建立过程中。这些步骤并非每次请求都会重新执行，排障时要区分观察的是新连接还是复用请求。

![一条请求穿过网络的完整路径](/protocol/full-request-path.svg)

## 学习路线

| 阶段 | 需要回答的问题 | 对应内容 |
|---|---|---|
| 1. 建立全局模型 | 数据为什么要分层？Frame、Packet、Segment 有何区别？ | [分层、寻址与路由](./network-foundations.md) |
| 2. 理解可靠传输 | TCP 如何确认、重传、控流和控制拥塞？UDP 为什么仍然重要？ | [TCP、UDP 与 Socket](./transport-socket.md) |
| 3. 理解应用协议 | TLS、HTTP/2、HTTP/3、WebSocket、gRPC 如何工作？ | [现代应用与实时协议](./application-realtime.md) |
| 4. 建立容量意识 | 一台主机能维持多少连接？瓶颈为何不只是端口？ | [容量、并发与性能](./capacity-performance.md) |
| 5. 形成排障方法 | DNS 正常为何仍打不开？小包正常、大包为何卡住？ | [网络排障方法与案例](./troubleshooting.md) |
| 6. 扩展特殊网络 | MCU、工业现场和低功耗设备使用哪些协议？ | [嵌入式与工业通信协议](./embedded-protocols.md) |

## 分层模型

OSI 七层模型适合描述职责，TCP/IP 模型更贴近互联网实现。工程排障通常使用五层表达：应用层、传输层、网络层、链路层和物理层。

![OSI 与 TCP/IP 分层](/protocol/osi-tcpip-layers.svg)

| 工程层次 | 主要对象 | 关键职责 | 常见协议与技术 |
|---|---|---|---|
| 应用层 | Message、Frame、RPC | 业务语义、认证、缓存、消息边界 | HTTP、DNS、WebSocket、SSE、gRPC、MQTT |
| 安全与会话 | Record、Session | 身份认证、机密性、完整性、会话恢复 | TLS 1.3、DTLS |
| 传输层 | Segment、Datagram、Stream | 端到端交付、顺序、重传、流控、拥塞控制 | TCP、UDP、QUIC |
| 网络层 | Packet | 跨网寻址、路由选择、逐跳转发 | IPv4、IPv6、ICMP、OSPF、BGP |
| 链路层 | Frame | 当前链路的一跳交付 | Ethernet、Wi-Fi、ARP、VLAN |
| 物理层 | Bit、Signal | 电气、光学或无线信号传输 | 双绞线、光纤、射频 |

发送端从上向下逐层添加头部，接收端按相反方向解封装。每层只解释自己的头部，并把 Payload 交给上层。HTTP 不需要知道 Wi-Fi 的调制方式，交换机也不需要理解 JSON 字段。

表中的“安全与会话”是工程职责，并非额外增加一层 TCP/IP 标准层。NDP 虽然服务于本地链路邻居发现，实际承载在 ICMPv6 中；QUIC 在 UDP 之上同时实现传输与安全能力，也不能机械套进 OSI 的单独一格。

## 一次请求的最小心智模型

假设浏览器访问 `https://api.example.com/orders`：

1. DNS 把域名解析为 IPv4 或 IPv6 地址。
2. 操作系统查询路由表，决定出口接口和下一跳。
3. ARP 或 NDP 把下一跳 IP 映射为链路地址。
4. HTTP/1.1 与 HTTP/2 的 HTTPS 连接先建立 TCP，再进行 TLS 握手，验证证书并协商密钥。
5. HTTP/3 使用 QUIC，在 UDP 之上集成 TLS 1.3 握手；它与上一步是两条备选路径。
6. HTTP 发送方法、路径、Header 和 Body。
7. CDN、负载均衡与反向代理可能终止连接并建立新的上游连接。
8. 应用处理请求，响应沿协议栈反向返回。

这条链路说明两个重要边界：

- **连接成功不等于请求成功**：TCP 建立只证明端口可达，不能证明 TLS、HTTP 或业务正常。
- **应用慢不一定是代码慢**：DNS、重传、代理排队、连接池和下游服务都可能增加首字节时间。

## 核心对象速查

| 对象 | 解决的问题 | 容易混淆的边界 |
|---|---|---|
| MAC 地址 | 当前二层网络中的接口寻址 | 不会跨路由器端到端传递 |
| IP 地址 | 网络层主机或接口寻址 | 地址可达不代表端口开放 |
| Port | 区分主机上的传输层端点 | 服务端一个端口可承载大量连接 |
| Socket | 应用与内核协议栈之间的状态接口 | 不是一根物理连接，也不等同于 TCP |
| TCP 连接 | 可靠、有序的双向字节流 | 没有应用消息边界 |
| UDP 数据报 | 保留边界的无连接消息 | 不承诺到达、顺序和去重 |
| QUIC Stream | QUIC 连接中的独立可靠字节流 | 共享连接级拥塞控制 |
| HTTP Request | 一次应用层请求 | 可能复用既有连接或 Stream |

## 协议不是孤立选项

协议选型要同时考虑数据方向、可靠性、时延、网络环境和部署能力。

| 需求 | 常见选择 | 设计重点 |
|---|---|---|
| 普通 Web API | HTTPS + HTTP/2 或 HTTP/3 | 幂等、缓存、超时、连接池 |
| 服务端单向事件流 | SSE | 事件 ID、代理缓冲、断线补发 |
| 浏览器双向消息 | WebSocket | 心跳、背压、重连、业务确认 |
| 微服务 RPC | gRPC | Protobuf 兼容、Deadline、重试预算 |
| 实时音视频 | WebRTC | ICE、TURN、码率控制、抖动缓冲 |
| 设备遥测与控制 | MQTT、CoAP | QoS、会话、离线队列、设备身份 |
| 高频可丢状态 | UDP 或 QUIC Datagram | 序号、过期策略、应用层限速 |

## 学习完成后的验证

只记住协议定义还不足以理解网络。至少应能够完成以下验证：

```bash
# 域名解析与权威链路
dig example.com
dig +trace example.com

# 路由与邻居
ip route get 1.1.1.1
ip neigh show

# 从请求开始累计的各时间点，适用于这里的新建直连 HTTPS 请求
curl -sS -o /dev/null \
  -w 'dns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer} total=%{time_total}\n' \
  https://example.com/

# Socket 与 TCP 状态
ss -s
ss -tanp

# Linux：限定目标、端口和报文数，保留完整报文
sudo tcpdump -i any -nn -s 0 -c 500 \
  -w network.pcap 'host 203.0.113.20 and tcp port 443'
```

后续页面会围绕这些命令建立完整解释：命令观察的是哪一层、结果说明什么、不能说明什么，以及下一步应收集哪项证据。

`ip`、`ss` 和 `-i any` 是这里的 Linux 用法；macOS 可分别用 `route -n get`、`netstat`，抓包用实际接口。`203.0.113.20` 是保留的示例地址，实验需替换成被测服务地址。`curl` 的 `time_*` 是累计时间点，不能直接当作各阶段独立耗时，差值算法见 [耗时拆分](./troubleshooting.md#第二步-拆分耗时)。

## 相关专题

- [HTTP 与 WebSocket 的区别](./http-vs-websocket.md)
- [嵌入式与工业通信协议](./embedded-protocols.md)
