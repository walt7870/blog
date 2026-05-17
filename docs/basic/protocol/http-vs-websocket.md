---
title: HTTP 与 WebSocket 的区别
author: Walt
date: 2026-05-17
---

# HTTP 与 WebSocket 的区别

HTTP 和 WebSocket 都是应用层协议，都跑在 TCP 之上，浏览器都原生支持。看上去亲缘很近，实际定位完全不同：HTTP 解决"客户端拉取资源"，WebSocket 解决"服务端和客户端持续双向通信"。

## 一、通信模型对比

```
HTTP（短连接 / 请求-响应）
  Client ──请求──▶ Server
  Client ◀─响应── Server
  Client ──请求──▶ Server
  Client ◀─响应── Server
  ...每次都要发起新的请求

WebSocket（长连接 / 全双工）
  Client ──HTTP Upgrade──▶ Server   （握手）
  Client ◀─101 Switching── Server
  Client ◀──── 帧 ────▶ Server      （任意一方都可以主动发）
  Client ◀──── 帧 ────▶ Server
  Client ──── 帧 ────▶ Server
  ...直到任意一方关闭
```

## 二、协议层面的差异

| 维度       | HTTP                      | WebSocket                                      |
| -------- | ------------------------- | ---------------------------------------------- |
| 通信方向     | 半双工，客户端先发                 | 全双工，握手后双方对等                                    |
| 连接模型     | 一问一答，HTTP/1.1 起支持长连接但仍是请求-响应 | 一次握手，长连接保持                                     |
| 协议状态     | 无状态                       | 有状态，连接本身代表会话                                   |
| 数据格式     | 文本头 + 任意 body              | 二进制帧（文本帧、二进制帧、控制帧）                             |
| 头部开销     | 每次请求都带完整头部，几百字节~几 KB     | 握手后帧头最小 2 字节                                   |
| URL Scheme | `http://` / `https://`   | `ws://` / `wss://`                             |
| 端口       | 80 / 443                  | 80 / 443（与 HTTP 复用）                            |
| 服务端推送    | 不支持（HTTP/2 Server Push 已被废弃；SSE 是单向推） | 原生支持                                          |
| 跨域机制     | CORS                      | 没有 CORS 概念，靠 `Origin` 头 + 服务端校验               |

## 三、握手过程

WebSocket 借用 HTTP 完成握手，握手完成后协议切换。

![WebSocket 握手与帧通信时序](/protocol/websocket-handshake.svg)

**客户端请求**

```http
GET /chat HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Origin: https://example.com
```

**服务端响应**

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

要点：

- `101 Switching Protocols` 是协议升级的关键信号
- `Sec-WebSocket-Key` 由客户端随机生成，服务端拼接固定 GUID 后取 SHA-1 再 Base64，作为 `Sec-WebSocket-Accept` 返回，证明对方是真的 WebSocket 服务端，不是被中间设备瞎转发的
- 握手走的是 HTTP，所以可以复用现有的反向代理、鉴权、负载均衡

握手完成之后，TCP 连接还是同一条，但应用层协议变成 WebSocket 帧协议，HTTP 不再参与。

## 四、帧格式

WebSocket 是二进制帧协议，帧头最小 2 字节：

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-------+-+-------------+-------------------------------+
|F|R|R|R| opcode|M| Payload len |    Extended payload length    |
|I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
|N|V|V|V|       |S|             |   (if payload len==126/127)   |
| |1|2|3|       |K|             |                               |
+-+-+-+-+-------+-+-------------+-------------------------------+
```

- `FIN`：是不是最后一帧（支持分片）
- `opcode`：0x1 文本、0x2 二进制、0x8 关闭、0x9 ping、0xA pong
- `MASK`：客户端发往服务端的帧必须掩码（防代理缓存攻击）
- `Payload len`：负载长度，开销远小于 HTTP 头

对比 HTTP/1.1 每次请求几百字节甚至几 KB 的头部，WebSocket 在高频小消息场景下带宽优势非常明显。

## 五、性能与开销对比

假设每秒 10 条消息，每条 100 字节：

| 协议        | 单条总字节（含头）       | 每秒带宽       | 备注                                |
| --------- | --------------- | ---------- | --------------------------------- |
| HTTP 轮询    | ~700 字节         | ~7 KB/s    | 每次都重建请求头、走完整请求-响应                |
| HTTP 长轮询   | ~700 字节         | ~7 KB/s    | 减少了无效请求，但每次响应仍带完整头              |
| SSE       | ~150 字节         | ~1.5 KB/s  | 一次连接持续推，仅推方向                     |
| WebSocket | 102~106 字节      | ~1 KB/s    | 帧头最小 2 字节，双向                    |

延迟方面：HTTP 轮询的延迟取决于轮询间隔，WebSocket 是 TCP 单程延迟，量级差很多。

## 六、什么时候用哪个

**用 HTTP**

- 资源型接口：CRUD、文件上传下载
- 一次性请求或低频请求
- 需要 CDN、缓存、SEO 友好
- 调试简单、生态成熟

**用 WebSocket**

- 实时聊天、客服系统
- 多人协同编辑（飞书文档、Figma）
- 实时行情、撮合推送
- 在线游戏、实时对战
- IoT 设备双向控制

**用 SSE 而不是 WebSocket**

- 只要服务端推、不要客户端反向高频发送
- 想完整复用 HTTP/2、HTTP 鉴权、CDN
- 不想自己实现重连、心跳

**别用 WebSocket 的场景**

- 接口本身就是请求-响应模型，硬塞 WS 反而增加复杂度
- 后端是 Serverless / FaaS，长连接计费和扩缩容都是坑
- 中间链路有不支持 WS 的代理（部分老旧反向代理）

## 七、工程实践注意事项

- **心跳**：WebSocket 自身有 ping/pong 控制帧，但浏览器端不能主动发 ping，需要应用层定时发业务心跳，防止中间设备静默断连。常见间隔 15~30 秒
- **重连**：客户端要做指数退避重连。SSE 浏览器自带重连，WebSocket 要自己实现
- **鉴权**：WebSocket 握手是 HTTP 请求，可以带 Cookie 或 `Authorization` 头。Token 放 query string 简单但有日志泄露风险，更稳妥是握手后用第一帧做鉴权
- **跨域**：浏览器对 WS 不发 CORS 预检，但会带 `Origin` 头，服务端必须校验，否则就是 CSRF
- **反向代理**：Nginx 需要显式开启 Upgrade

  ```nginx
  location /ws/ {
      proxy_pass http://backend;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_read_timeout 3600s;
  }
  ```

- **负载均衡**：长连接对负载均衡器不友好，扩容时存量连接不会重新分配。考虑用 sticky session 或在应用层做连接迁移
- **消息可靠性**：WebSocket 协议本身不保证消息已被对端处理，业务层要自己做 ack 和去重
- **背压**：高频推送下要做发送队列限流，否则会撑爆服务端内存

## 八、总结

> HTTP 是"你问我答"，WebSocket 是"打开电话不挂"。前者适合拿数据，后者适合实时交互。

相关阅读：[通信协议概览](./index.md)
