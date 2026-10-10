---
title: 网络排障方法与案例
author: Walt
date: 2026-07-12
---

# 网络排障方法与案例

网络排障不是从命令列表中随机尝试，而是把模糊现象改写成可测量事实，再按协议层次收集证据。每一个结论都应回答：观察到了什么、哪种机制可以解释、怎样验证、什么证据能够反驳。

![网络分层排障流程](/protocol/network-troubleshooting-flow.svg)

## 第一步：定义故障

“访问不了”至少要拆成以下信息：

| 维度 | 需要确认的事实 |
|---|---|
| 对象 | 域名、IP、端口、URL、接口或消息 Topic |
| 范围 | 全部用户、某地区、某运营商、某实例或单台设备 |
| 时间 | 持续、间歇、发布后开始、每天固定时段 |
| 错误 | 解析失败、拒绝、超时、TLS 错误、HTTP 状态或业务错误 |
| 对照 | 哪个环境、地址、实例或时间点是正常的 |

固定一条失败请求和准确时间戳，再寻找成功样本。没有对照时，很容易把正常现象误判为异常。

## 第二步：拆分耗时

一次 HTTPS 请求可以拆成 DNS、TCP Connect、TLS、等待首字节和下载：

```bash
curl -sS -o /dev/null \
  -w 'dns=%{time_namelookup}\nconnect=%{time_connect}\ntls=%{time_appconnect}\nttfb=%{time_starttransfer}\ntotal=%{time_total}\n' \
  https://example.com/
```

| 异常阶段 | 优先方向 |
|---|---|
| DNS | 递归解析器、权威记录、缓存、网络 |
| Connect | 路由、防火墙、监听端口、回程路径 |
| TLS | 证书链、SNI、时间、协议与算法 |
| TTFB | 代理排队、连接池、应用与下游 |
| Body | 带宽、丢包、流控、慢客户端 |

总耗时正常不代表尾延迟正常。间歇故障应连续采样并保留 P95、P99 与失败请求。

## 第三步：逐层验证

### 1. DNS

```bash
dig example.com A
dig example.com AAAA
dig example.com @1.1.1.1
dig +trace example.com
```

检查响应状态、Answer、TTL、实际解析器和 IPv4/IPv6 差异。

- `NXDOMAIN`：名称不存在。
- `SERVFAIL`：可能是上游超时、DNSSEC 或权威故障。
- 有答案但地址错误：检查缓存、发布记录和分流策略。
- 解析正常但连接失败：进入路由与端口，不再停留在 DNS。

### 2. 本机地址、路由与邻居

```bash
ip addr
ip route
ip route get 203.0.113.20
ip neigh show
```

确认内核实际选择的源地址、出口和下一跳。邻居状态为 `FAILED` 时，检查 VLAN、网关、无线隔离和地址冲突。

### 3. 端口与传输层

```bash
nc -vz example.com 443
ss -tanp
sudo tcpdump -i any -nn host 203.0.113.20
```

抓包中的典型模式：

| 现象 | 可能含义 |
|---|---|
| SYN 反复重传 | 路径静默丢弃、地址错误或服务不可达 |
| 立即收到 RST | 端口未监听或设备主动拒绝 |
| 服务端见到 SYN，客户端收不到 SYN-ACK | 回程路由或中间策略异常 |
| 重复 ACK 与重传 | 丢包、重排序、接收压力或 MTU |
| Zero Window | 接收应用消费不足 |

Ping 失败不能证明 TCP 服务不可用，Ping 成功也不能证明目标端口或应用正常。

### 4. TLS

```bash
openssl s_client -connect example.com:443 \
  -servername example.com \
  -alpn h2 -showcerts
```

检查证书域名、有效期、签发链、ALPN 和握手 Alert。使用 IP 直连时仍要提供正确 SNI，否则多域名服务器可能返回另一张证书。

### 5. HTTP 与代理

```bash
curl -v --trace-time https://example.com/api/health
curl -I https://example.com/static/app.js
```

记录状态码、响应 Header、缓存状态、Via、重定向和 Trace ID。`502` 通常表示代理无法从上游获得合法响应，`504` 常表示上游等待超时，但具体语义仍取决于代理产品。

### 6. 服务端资源

```bash
ss -s
cat /proc/net/sockstat
top
pidstat -t -p PID 1
sar -n DEV,TCP,ETCP 1
```

检查监听、队列、fd、Socket 内存、CPU、线程池、连接池和下游依赖。服务进程存在不代表已经监听正确地址，健康接口返回 200 也不代表核心依赖可用。

## 案例一：小请求正常，大响应卡住

### 现象

- TCP 三次握手成功。
- 小型健康检查正常。
- TLS 证书或较大响应开始后长时间停住。
- 抓包显示相同大小的 TCP Segment 重复发送。

### 推理

握手报文较小，可以通过路径；大 Segment 超过某段隧道 MTU。路由器丢包后发出的 ICMP 尺寸反馈又被屏蔽，发送端无法降低 Packet 大小。

### 验证

```bash
ping -D -s 1472 203.0.113.20
tracepath 203.0.113.20
sudo tcpdump -nn 'icmp or icmp6 or host 203.0.113.20'
```

逐步降低 Payload，找出能够通过的上限，并检查是否收到 `Fragmentation Needed` 或 `Packet Too Big`。

### 修复

- 允许必要 ICMP/ICMPv6。
- 修正 VPN、隧道或云接口 MTU。
- 在明确边界实施 MSS Clamping。
- 不用增加应用超时掩盖持续重传。

## 案例二：同一接口间歇返回 502

### 现象

同一域名和请求有时成功、有时 502。客户端到边缘的连接始终正常。

### 收敛

按代理选择的后端实例聚合：

| Edge | Upstream | Result |
|---|---|---|
| edge-a | app-1 | 200 / 12 ms |
| edge-a | app-2 | 502 / connection refused |
| edge-b | app-1 | 200 / 15 ms |
| edge-b | app-2 | 502 / timeout |

失败只与 `app-2` 相关，排查范围从整个公网链路收敛到该实例及其网络。

### 根因方向

- 进程未监听或监听错误地址。
- 发布时实例过早进入负载均衡。
- 健康检查只检查静态页面，没有覆盖核心依赖。
- 安全组、节点路由或容器网络异常。

### 防止复发

- Readiness 在真正可接流量后再通过。
- 发布时先摘流并等待连接排空。
- 日志记录上游实例、连接错误和每次重试 Attempt。
- 按实例和可用区建立错误率告警。

## 案例三：只有部分移动用户失败

### 现象

固定宽带正常，部分移动网络连接慢或失败；域名同时存在 A 和 AAAA。

### 分析顺序

1. 分别强制 IPv4 和 IPv6 请求。
2. 对比两个地址族的 DNS、Connect 与 TLS 时间。
3. 检查 IPv6 回程路由、MTU 和防火墙。
4. 确认客户端的 Happy Eyeballs 回退是否及时。

```bash
curl -4 -v https://example.com/
curl -6 -v https://example.com/
dig example.com A
dig example.com AAAA
```

双栈发布不能只验证 DNS 有 AAAA，还要验证真实 IPv6 路径、证书、代理和监控。

## 案例四：WebSocket 定时断开

### 现象

连接建立成功，约一分钟没有消息后被关闭；持续发送消息时正常。

### 可能机制

- 反向代理或负载均衡的空闲超时。
- NAT 映射老化。
- 应用 Ping/Pong 没有真正穿过完整链路。
- 事件循环阻塞，无法及时处理心跳。

### 验证

- 记录断开间隔是否稳定。
- 查看 Close Frame 和状态码；无合法 Close 常表现为 1006。
- 同时抓客户端、代理和服务端。
- 调整心跳频率做单变量实验。

修复时应让心跳间隔小于链路最短空闲超时，并保留重连退避和业务游标。不能只把代理超时改成无限大。

## 案例五：连接数高但吞吐很低

### 现象

服务器保持大量连接，CPU 不高，但消息延迟持续增加。

### 检查链路

```text
业务生产速率
→ 每连接应用队列
→ Socket 发送缓冲
→ TCP 窗口
→ 客户端消费速度
```

重点查看发送队列、零窗口、慢消费者比例和消息扇出。大量空闲连接与大量活跃慢连接是完全不同的容量模型。

## 抓包边界

抓包结果受位置影响：

- 网卡卸载可能让主机抓包看到尚未在线路上分段的大 Segment。
- NAT 或代理前后地址和端口不同。
- TLS 加密后无法直接查看 HTTP 内容。
- 镜像口丢包可能制造伪重传判断。

报告必须说明抓包点、方向、时间范围和过滤条件。

## 故障报告模板

```text
现象：谁在何时访问什么，出现什么错误
范围：地区、网络、版本、实例、比例
时间线：DNS / Connect / TLS / TTFB / Body
证据：日志、指标、抓包、配置与成功对照
根因：能够解释全部现象的具体机制
修复：改变了哪个环节，为什么有效
验证：故障样本恢复，回归与压力测试结果
预防：监控、容量、发布或配置防线
```

一次重启后的恢复不等于找到根因。重启会同时清空连接、队列、缓存和进程状态，能够暂时掩盖多种故障。可靠结论必须有可复现证据和反证过程。

## 固定排障顺序

1. 固定故障请求、范围和时间。
2. 分解 DNS、连接、TLS、首字节和下载耗时。
3. 检查地址、路由、邻居和目标端口。
4. 双端抓包确认报文消失在哪一段。
5. 检查代理、重试、连接池与应用日志。
6. 检查队列、CPU、内存、fd、Socket 和下游。
7. 用单变量实验验证假设。
8. 修复后补充告警、容量余量与回归测试。

返回 [计算机网络与通信协议](./index.md) 可按完整学习路径继续查阅各层机制。
