---
title: 现代应用与实时协议
author: Walt
date: 2026-07-12
---

# 现代应用与实时协议

应用层协议定义消息结构、交互顺序和错误语义。选择协议时，不能只比较名称，还要明确传输基础、消息方向、可靠性、恢复能力和基础设施兼容性。

## TLS 1.3：安全通道

TLS 同时解决三个问题：

- **机密性**：旁观者不能直接读取内容。
- **完整性**：报文被篡改时能够被检测。
- **身份认证**：证书把域名与公钥身份绑定。

TLS 保护两端之间的传输，不能证明服务器业务逻辑安全，也不能阻止已控制终端或服务器的攻击者读取明文。

### 握手主线

1. 客户端发送 `ClientHello`，包含版本、算法、随机数、SNI、ALPN 和临时密钥共享。
2. 服务器返回 `ServerHello` 并选择参数。
3. 双方使用临时密钥交换材料计算相同共享秘密。
4. 服务器发送证书链和握手签名，证明持有证书私钥。
5. 客户端验证域名、有效期、用途、签名链和本地信任根。
6. 双方确认握手 transcript，开始传输加密应用数据。

SNI 让同一 IP 上的服务器选择正确证书；ALPN 用于协商 `http/1.1`、`h2` 等应用协议。临时密钥交换提供前向保密，即使证书私钥以后泄漏，过去抓取的会话也不应被直接解密。

```bash
openssl s_client -connect example.com:443 \
  -servername example.com \
  -alpn h2 -showcerts
```

证书过期、系统时间错误、证书链缺少中间证书、SNI 不匹配和算法不兼容都会导致握手失败。

## HTTP/1.1：消息与连接复用

HTTP/1.1 请求由请求行、Header、空行和可选 Body 组成。响应由状态行、Header、空行和 Body 组成。

```http
POST /orders HTTP/1.1
Host: api.example.com
Content-Type: application/json
Content-Length: 24

{"sku":"A100","count":2}
```

这里 Body 按所示 ASCII 字节为 24 字节，不含展示代码块的末尾换行。实际客户端应让 HTTP 库计算长度，避免修改正文后遗漏长度字段。

TCP 没有消息边界，HTTP 必须自己判断 Body 在哪里结束。常见方式包括 `Content-Length`、`Transfer-Encoding: chunked`、无 Body 状态码，以及连接关闭。

代理链前后若对冲突的长度字段采用不同解释，可能形成 Request Smuggling。因此网关应拒绝歧义消息，而不是猜测客户端意图。

### 长连接与队头阻塞

HTTP/1.1 默认可以复用 TCP 连接，避免每个请求重新握手。Pipeline 理论上允许连续发请求，但响应必须按顺序返回，一个慢响应会阻塞后续响应。客户端通常建立多个连接，或升级到 HTTP/2。

### 缓存

`Cache-Control` 决定缓存策略，`ETag` 与 `If-None-Match` 用于验证内容是否变化。共享缓存必须正确处理 `Vary`、身份信息和私有响应，否则可能把一个用户的数据返回给另一个用户。

## HTTP/2：Frame 与 Stream

HTTP/2 保留方法、状态码和缓存语义，改变线上表达：消息被拆成二进制 Frame，每个请求响应占用一个 Stream。

| Frame | 作用 |
|---|---|
| HEADERS | 携带压缩后的 Header Block |
| DATA | 携带消息 Body |
| SETTINGS | 声明并发流、窗口和帧大小等参数 |
| WINDOW_UPDATE | 增加连接或 Stream 的流控窗口 |
| RST_STREAM | 终止单条 Stream |
| GOAWAY | 优雅停止创建新 Stream |

不同 Stream 的 Frame 可以交错传输，接收端按 Stream ID 重组。HPACK 通过静态表、动态表和索引减少重复 Header。

HTTP/2 在连接与 Stream 两级维护流量控制窗口。但所有 Frame 最终仍位于一条 TCP 字节流中；底层 TCP Segment 丢失时，后续所有 Stream 的字节都要等待缺口补齐。

```bash
curl -v --http2 https://example.com/
nghttp -nv https://example.com/
```

## QUIC 与 HTTP/3

HTTP/3 保留 HTTP 语义，使用 QUIC 取代 TCP。QUIC 在 UDP 之上实现安全连接、可靠传输、多路 Stream、拥塞控制和连接迁移。

![HTTPS 在 TCP 与 QUIC 上的封装关系](/protocol/https-encapsulation.svg)

### QUIC Packet 与 Stream

一个 UDP Datagram 可以包含多个 QUIC Packet，一个 QUIC Packet 可以包含多个 Frame。`STREAM` Frame 携带 Stream ID、Offset 和数据。

每条 Stream 有自己的有序字节空间。某条 Stream 丢失数据时，QUIC 只在该 Stream 内等待缺口补齐，其他 Stream 可以继续交付。所有 Stream 仍共享连接级拥塞控制；HTTP/3 的 QPACK 动态表依赖也可能让特定请求暂缓解码。因此它消除的是 TCP 造成的跨流交付阻塞，并非所有层面的等待。

### 握手与恢复

QUIC 把 TLS 1.3 握手放在 CRYPTO Frame 中，首次连接通常约 1-RTT 建立安全通道。恢复会话可以发送 0-RTT 数据，但零往返数据可能被重放，需要按操作的实际重放后果限制使用。查询库存一般比创建订单更容易满足条件；即使接口声明幂等，也要确认扣费、通知和审计等副作用能承受重复执行。

### 连接迁移

QUIC 使用 Connection ID 维持连接身份。客户端从 Wi-Fi 切换到蜂窝网络后，可以验证新路径并继续已有连接，不必只依赖固定四元组。

```bash
curl -I --http3 https://example.com/
sudo tcpdump -nn 'udp port 443'
```

HTTP/3 依赖 UDP 可达。UDP 被阻断时，客户端通常回退 HTTP/2。验证服务是否真正使用 HTTP/3，要检查 ALPN、Alt-Svc 和实际 UDP 流量，不能只看服务器配置文件。

## WebSocket：全双工消息

WebSocket 在 HTTP/1.1 下通过 Upgrade 握手：

```http
GET /socket HTTP/1.1
Host: example.com
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

服务器接受后返回 `101 Switching Protocols`。此后同一 TCP 连接按 WebSocket Frame 传输，不再是普通 HTTP 消息。

HTTP/2 与 HTTP/3 也有基于扩展 CONNECT 的 WebSocket 建连机制，不使用上述 `101` 路径；是否可用取决于浏览器与整条代理链。排障应记录实际 HTTP 版本，不把缺少 Upgrade 头直接当作所有 WebSocket 连接失败的原因。

Frame 包含 FIN、Opcode、Mask、Payload Length 和可选 Masking Key。Text 与 Binary 表示消息类型，Continuation 用于分片。客户端到服务器的 Frame 必须 Mask，但 Mask 不是加密；WSS 的安全性来自 TLS。

### 生产设计

- Ping/Pong 检测应用层通道活性。
- 发送队列必须有界，慢客户端不能无限积压内存。
- 断线重连应带最后确认序号，由服务器补发可恢复事件。
- 多节点网关需要通过 Broker 把消息投递到用户实际连接的节点。
- 代理要支持 Upgrade，并设置合理空闲超时。

WebSocket 只保证 TCP 字节到达，不保证业务事件已经落库或处理。业务层仍需要消息 ID、ACK、幂等和去重。

详细对照见 [HTTP 与 WebSocket 的区别](./http-vs-websocket.md)。

## SSE 与长轮询

SSE 使用 `text/event-stream` 持续发送 UTF-8 事件：

```text
event: order-updated
id: 1842
retry: 3000
data: {"status":"paid"}

```

浏览器 `EventSource` 会自动重连，并通过 `Last-Event-ID` 携带恢复位置。SSE 适合通知、日志和生成式文本流。客户端上行仍使用普通 HTTP。

自动重连不等于自动补发。服务器需要保存事件、按 ID 查找游标，并定义游标过期后重新获取全量状态的方式；否则浏览器虽然重新连上，断线期间的订单状态仍可能漏掉。

反向代理必须关闭或缩短响应缓冲，否则服务器已经发送的事件会被攒成大块。服务端还要定期发送注释心跳，避免中间设备按空闲连接关闭通道。

长轮询则把一个普通 HTTP 请求挂起，直到有事件或超时，返回后立即创建下一次请求。它兼容性强，但每轮都有 Header 和重建窗口。

## WebTransport

WebTransport 基于 HTTP/3，在一个会话中同时提供：

- 可靠双向 Stream。
- 可靠单向 Stream。
- 不保证可靠和顺序的 Datagram。

命令和关键状态可以走 Stream，过期即无价值的位置更新可以走 Datagram。它适合需要多条独立流和低延迟消息的浏览器应用，但部署前必须确认浏览器、网关和 UDP 网络支持。

## gRPC

gRPC 使用 `.proto` 定义服务与消息，生成客户端 Stub 和服务端接口。Protobuf 在线上依赖字段编号而不是字段名；删除字段后不得复用旧编号。

一次 RPC 通常对应一条 HTTP/2 Stream：

```text
HEADERS  :path=/package.Service/Method
DATA     compressed-flag + length + protobuf
TRAILERS grpc-status + grpc-message
```

HTTP 状态为 200 不代表 RPC 成功，最终状态通常位于 Trailers。

### 四种调用

| 类型 | 请求 | 响应 | 场景 |
|---|---:|---:|---|
| Unary | 1 | 1 | 普通查询与命令 |
| Server Streaming | 1 | 多条 | 持续订阅 |
| Client Streaming | 多条 | 1 | 批量上传 |
| Bidirectional | 多条 | 多条 | 双向实时协作 |

每次调用应设置 Deadline，并把剩余预算向下游传播。自动重试只能用于幂等操作，并受总时间、次数和并发预算限制。客户端、网关和 SDK 同时重试会形成流量放大。

```bash
# 仅本机未启用 TLS 的实验服务；list 需要开启反射
grpcurl -plaintext localhost:50051 list
grpcurl -plaintext -d '{"id":1}' localhost:50051 demo.User/Get
```

生产连接应使用服务实际配置的 TLS。服务未启用反射时，通过 `-import-path` 和 `-proto` 提供合同，不能据 `list` 失败断言 gRPC 服务不可达。

## WebRTC

WebRTC 是一组实时通信机制，而不是单一协议：

1. 业务信令交换 SDP Offer、Answer 和 ICE Candidate。
2. ICE 收集 Host、STUN 反射和 TURN 中继 Candidate。
3. 连通检测选择真正可用的 Candidate Pair。
4. DTLS 协商密钥，SRTP 加密音视频 RTP。
5. RTCP 反馈丢包、抖动和带宽估计。

STUN 帮助端点观察 NAT 映射，却不能保证所有 NAT 都能打洞。直连失败时，TURN 承担完整上下行中继流量，需要监控 Relay 占比、地区带宽和分配失败。

实时媒体不会无限等待重传。接收端使用抖动缓冲，发送端根据 NACK、PLI 和带宽估计调整重传、关键帧、码率、分辨率与帧率。

多人会议通常使用 SFU：每个端点上传一路，服务器按订阅和带宽选择性转发。排查时应查看 Candidate 类型、RTT、丢包、Jitter、发送码率和解码帧率。

## MQTT 与 CoAP

MQTT 通过 Broker 在 Publisher 与 Subscriber 之间路由 Topic。QoS 描述协议交付尝试：

| QoS | 语义 | 代价 |
|---|---|---|
| 0 | 至多一次 | 无确认，可能丢失 |
| 1 | 至少一次 | 需要确认，可能重复 |
| 2 | 协议会话内恰好一次流程 | 状态和交互最多 |

业务副作用仍需幂等。Retained Message 保存 Topic 最新值，不是历史消息队列；Will Message 用于异常离线通知；Session Expiry 决定断线后保留订阅和未确认消息多久。

CoAP 在 UDP 上提供紧凑的 REST 语义，支持 Confirmable 消息、Observe 和 Block-Wise 分块，适合资源受限设备。设备网常通过边缘网关聚合、缓存并转换为 MQTT 或 HTTPS 上云。

## 选型矩阵

| 需求 | 首选方向 | 必须补充的工程机制 |
|---|---|---|
| REST API | HTTP/2 或 HTTP/3 | 超时、幂等、缓存、限流 |
| 单向事件 | SSE | 事件 ID、补发、代理缓冲 |
| 双向业务消息 | WebSocket | 心跳、背压、重连、ACK |
| 多流与低延迟 Datagram | WebTransport | 能力探测、UDP 回退 |
| 内部 RPC | gRPC | Deadline、兼容、重试预算 |
| 音视频 | WebRTC | TURN、拥塞控制、媒体指标 |
| 设备遥测 | MQTT | 会话、QoS、设备身份 |

选择协议后还要进入 [连接容量](./capacity/index.md)，把连接、消息和资源消耗转化为可验证模型。
