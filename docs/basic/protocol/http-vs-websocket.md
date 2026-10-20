---
title: HTTP 与 WebSocket 的区别
author: Walt
date: 2026-05-17
---

# HTTP 与 WebSocket 的区别

订单详情页需要查询当前状态，适合用 HTTP；客服聊天需要双方随时发送消息，适合 WebSocket；只接收订单状态或生成式文本，可以先考虑 SSE。选择依据是消息方向、频率和恢复方式，不能把 HTTP 等同于短连接，也不能把 WebSocket 等同于业务可靠队列。

## 通信模型

HTTP 用请求和响应表达方法、资源、状态和缓存语义。HTTP/1.1 默认支持持久连接，HTTP/2 和 HTTP/3 还能在同一连接中并发多个请求；响应正文也可以持续流式发送。因此请求响应模型不等于物理链路半双工。

WebSocket 在建立会话后交换文本、二进制和控制帧，任意一方都可主动发送。协议提供消息边界，但不规定订单事件、登录态或聊天记录如何持久化。这些仍属于应用合同。

| 维度 | HTTP | WebSocket |
|---|---|---|
| 交互单位 | 请求与响应，可流式传输 | 会话中的双向消息 |
| 连接 | 可复用；HTTP/2、HTTP/3 支持多路复用 | 长期保持，断开后需要重新建连 |
| 表达格式 | HTTP/1.1 文本头；HTTP/2、HTTP/3 二进制分帧并压缩头部 | 文本、二进制与控制帧 |
| 状态 | 请求语义可独立；Cookie 等可承载业务会话 | 连接有状态，业务会话仍由应用管理 |
| 服务端事件 | SSE 或流式响应，在客户端已发起的请求上持续返回 | 建连后可随时发送 |
| 默认端口 | HTTP 80、HTTPS 443，也可配置其他端口 | WS 80、WSS 443，也可配置其他端口 |
| 浏览器安全边界 | Fetch 等受同源策略与 CORS 约束 | 不使用 Fetch 的 CORS 预检；服务端仍需校验 Origin 和身份 |

HTTP/2 Server Push 是向客户端提前发送资源的机制，与聊天消息推送不同。即使浏览器不支持它，也不影响 SSE 或其他流式响应。

## HTTP/1.1 握手与帧

![WebSocket 在 HTTP/1.1 上握手与通信](/protocol/websocket-handshake.svg)

客户端请求：

```http
GET /chat HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Origin: https://example.com
```

服务端接受后响应：

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

`Sec-WebSocket-Accept` 是 Key 与固定 GUID 拼接后计算 SHA-1、Base64 的结果，用于检查握手协议是否匹配，不能证明服务器身份或授权用户。WSS 的证书验证提供传输身份，应用鉴权决定该用户能订阅什么。

上述路径在同一 TCP 连接上切换为 WebSocket 帧。HTTP/2 和 HTTP/3 另有扩展 CONNECT 机制，使用一条 Stream 承载会话，不走 `101`；需要浏览器、代理与服务端共同支持。

帧中的 `FIN` 表示是否为消息最后一个分片，`opcode` 区分文本、二进制、继续帧、Ping、Pong 和 Close。客户端发往服务端的帧必须带掩码，掩码不是加密，也不代替 WSS。

## 开销怎样比较

假设不压缩、不分片，每条消息正文是 100 字节，WebSocket 服务端帧为 `2 + 100 = 102` 字节，客户端帧多 4 字节掩码，为 106 字节。这个数字只计算 WebSocket 层，不含 TCP/IP、TLS、确认和心跳。

HTTP 轮询的成本还取决于请求头、响应头、空轮询频率和缓存。SSE 在同一个响应里持续发送 `data:` 等事件字段，HTTP/2、HTTP/3 又能压缩重复头部，所以不能为所有 HTTP 请求固定加上“700 字节”，也不能据此宣称固定性能倍数。

每 5 秒轮询一次订单，在订单随机变化的理想模型下平均多等约 2.5 秒；改用 SSE 或 WebSocket 能消除这段轮询等待，但代理缓冲、服务端排队和网络时延仍然存在。比较时应测量“状态提交到页面显示”的端到端延迟。

## 选型与恢复

| 场景 | 起点 | 恢复合同 |
|---|---|---|
| 查询订单、文件、配置 | HTTP | 超时、缓存与幂等重试 |
| 订单状态、日志、文本流 | SSE | 事件 ID、保留窗口、游标过期后全量同步 |
| 客服聊天、协作编辑、游戏指令 | WebSocket | 消息 ID、ACK、重连游标、去重和背压 |

SSE 的浏览器 `EventSource` 自带重连，但服务端仍要处理心跳和历史补发，代理也要支持及时刷新响应。单向更新不需要为双向会话额外维护一套消息路由。低频操作则常用 HTTP 更容易复用缓存、审计与限流。

Serverless 场景要先检查产品是否支持持久连接、连接计费和扩缩容规则。有专用 WebSocket 网关的托管平台可以使用；仅支持短时函数调用的平台需要由其他服务持有连接。

## 工程边界

浏览器 `new WebSocket(url, protocols)` 不支持任意设置 `Authorization` 请求头。可以使用受保护的会话 Cookie，或先经 HTTPS 获取短期、一次性连接凭据；如果在首条消息认证，服务器必须在认证前禁止订阅与业务动作，并限制等待时长和未认证连接数。URL 中的凭据可能进入访问日志，需要严格控制有效期和日志内容。

浏览器会带 `Origin`，服务端应匹配允许的来源，并单独验证身份和权限，防止携带 Cookie 的跨站 WebSocket 劫持。非浏览器客户端可以伪造 Origin，因而它不能替代鉴权。

浏览器脚本不能直接发送协议 Ping，也看不到 Pong；服务器可以发送 Ping，由浏览器协议栈自动回应。页面需要测量业务链路活性时，可增加应用层心跳。心跳间隔应小于整条链路最短空闲超时，并容纳后台页面定时器节流；断线重连使用带抖动的退避。

HTTP/1.1 上游的 Nginx 示例：

```nginx
location /ws/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 75s;
}
```

这段配置限定在 WebSocket 路径。`proxy_read_timeout` 是两次上游读取之间的超时，服务端心跳应在该窗口内产生流量；只调大超时无法处理进程阻塞或网络切换。

一条已建立的连接自然固定在当前网关节点；扩容不会自动搬走旧连接。重连可以落到其他节点，消息路由应按用户连接位置投递，恢复状态放在共享存储或事件日志中。只有状态确实绑在节点且无法共享时才考虑粘性会话，并仍要处理节点故障。

## 订单通知验收

支付完成后先提交订单状态和可恢复事件，再向在线连接发送带事件 ID 的更新。若客户端在收到后、确认前断开，重连会再次收到同一事件，页面按 ID 去重并查询最新订单状态，不能重复触发支付动作。

验收时分别测试：无消息时跨越代理空闲窗口、断线期间产生事件、收到消息后立即断开、客户端消费速度下降、连接节点重启。检查心跳、补发范围、重复事件和队列上限，而不只验证“握手返回 101”。

相关阅读：[通信协议概览](./index.md)、[容量、并发与性能](./capacity-performance.md)、[网络排障方法与案例](./troubleshooting.md)。
