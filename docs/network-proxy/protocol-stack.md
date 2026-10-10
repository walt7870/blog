# 协议、插件与传输

这一页专门整理 `sing-box`、`Shadowsocks`、`v2ray-plugin`、`WebSocket`、`TLS` 之间的关系。

它们不在同一层：

- `sing-box` 是代理核心 / 引擎
- `Shadowsocks` 是代理协议
- `v2ray-plugin` 是给 Shadowsocks 用的 SIP003 插件
- `WebSocket` 是一种传输承载方式
- `TLS` 是加密和证书校验层

## 一张图先看懂

![协议、插件与传输关系](/network-proxy/protocol-stack.svg)

## 分层关系

| 层级 | 例子 | 做什么 | 是否必需 |
| --- | --- | --- | --- |
| 工具层 | `sing-box`、`Clash Verge`、`systemd`、`Docker` | 提供运行、管理、UI、进程托管 | 需要 |
| 协议层 | `Shadowsocks`、`Trojan` | 定义认证、加密和代理语义 | 需要其一 |
| 插件层 | `v2ray-plugin` | 给 Shadowsocks 增加 SIP003 插件能力 | 可选 |
| 传输层 | `TCP`、`WebSocket`、`HTTPUpgrade`、`gRPC`、`QUIC` | 决定流量怎么跑在网络上 | 可选，视协议而定 |
| 安全层 | `TLS` | 做证书校验和加密外壳 | 视协议而定 |

## 这几个词分别是什么

### sing-box

`sing-box` 是一个通用代理平台，可以作为客户端、服务端、TUN 接管器、路由器和 DNS 处理器。它本身不是“协议名”，也不是“插件名”，而是运行这些能力的核心程序。

它能直接实现很多协议和承载方式，所以你经常会看到它既出现在服务器上，也出现在客户端上。

### Shadowsocks

`Shadowsocks` 是代理协议本身。它负责把流量加密、认证后转发到远端。

你可以把它理解成“核心协议”，它决定这条连接怎么认证、怎么封装、怎么在客户端和服务端之间建立代理语义。

### v2ray-plugin

`v2ray-plugin` 是给 Shadowsocks 用的 SIP003 插件。最常见的用法是把 Shadowsocks 再包一层 `WebSocket` 或类似的 HTTP 形态传输。

它不是 Shadowsocks 本身，也不是 WebSocket 本身，而是“把 Shadowsocks 流量接到某种传输外壳上”的插件层。

sing-box 官方文档里明确写了：Shadowsocks 的插件是内置实现的，支持的只有 `obfs-local` 和 `v2ray-plugin`。也就是说，sing-box 可以直接用这个插件，但不是每个场景都必须靠它。

### WebSocket

`WebSocket` 是一种承载方式，不是代理协议。它的作用是让代理流量看起来像一条常规 WebSocket 连接，常用于穿过 HTTP 入口或统一 443 端口。

当你用 `WebSocket` 时，`host`、`path`、`TLS` 往往都要和服务端一致。这个层面的问题通常不是“协议错了”，而是“路径或域名没对上”。

### TLS

`TLS` 负责证书校验和加密外壳。它不是代理协议，但很多代理方案都会把代理流量包在 TLS 里面。

有了 TLS，客户端就会校验证书和 `SNI`；没有对上证书域名或私钥路径，连接就会失败。

## 三种常见组合

### 1. Shadowsocks 直连

```text
Clash Verge / sing-box client
  -> Shadowsocks
  -> 远端代理服务
  -> 目标站点
```

特点是简单，适合基础代理和学习。

### 2. Shadowsocks + v2ray-plugin + WebSocket

```text
Clash Verge / sing-box client
  -> Shadowsocks
  -> v2ray-plugin
  -> WebSocket
  -> 远端代理服务
  -> 目标站点
```

特点是多了一层传输伪装。它常见，但也多了一层配置项，`path`、`host`、`TLS` 都要一致。

### 3. Trojan + TLS

```text
Clash Verge / sing-box client
  -> Trojan
  -> TLS
  -> 远端代理服务
  -> 目标站点
```

特点是协议本身就已经和 TLS 绑定，部署通常比“Shadowsocks + 插件”更直接。

## sing-box 在这里扮演什么

`sing-box` 可以同时充当：

- 客户端核心
- 服务端核心
- 规则引擎
- DNS 处理器
- TUN 接管器

所以它不是“把所有组件都替你装好”的一体机，而是一个统一的代理引擎。  
证书、进程托管、入口网关、DNS 服务商账号、订阅分发，这些仍然是外部组件。

## 怎么记最稳

| 词 | 记法 |
| --- | --- |
| `sing-box` | 引擎 / 核心 |
| `Shadowsocks` | 协议 |
| `v2ray-plugin` | 插件 |
| `WebSocket` | 传输外壳 |
| `TLS` | 加密和证书层 |
| `Clash Verge` | 图形客户端 |
| `systemd` / `Docker` | 进程托管 |

## 总结

如果只记一句话：`Shadowsocks` 负责“怎么代理”，`v2ray-plugin` 负责“怎么套一层外壳”，`WebSocket` 是那层外壳的常见形态，`sing-box` 是把这些能力运行起来的代理核心。
