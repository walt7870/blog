# 协议、插件与传输

这一页专门整理 `sing-box`、`Shadowsocks`、`v2ray-plugin`、`WebSocket`、`TLS` 之间的关系。

它们不在同一层：

- `sing-box` 是代理核心 / 引擎
- `Shadowsocks` 是代理协议
- `v2ray-plugin` 是给 Shadowsocks 用的 SIP003 插件
- `WebSocket` 是一种传输承载方式
- `TLS` 是加密和证书校验层

## 实现与封装关系

![协议、插件与传输关系](/network-proxy/protocol-stack.svg)

## 分层关系

| 层级 | 例子 | 做什么 | 是否必需 |
| --- | --- | --- | --- |
| 实现与管理 | `sing-box`、`Clash Verge`、`systemd`、`Docker` | 内核实现协议，GUI管理配置，托管工具运行进程 | 需要内核；GUI与托管方式可选 |
| 协议层 | `Shadowsocks`、`Trojan` | 定义认证、加密和代理语义 | 需要其一 |
| 插件层 | `v2ray-plugin` | 给 Shadowsocks 增加 SIP003 插件能力 | 可选 |
| 承载机制 | `TCP`、`WebSocket`、`HTTPUpgrade`、`gRPC`、`QUIC` | 由基础传输及可选的应用封装承载数据 | 基础传输必需，额外封装可选 |
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

sing-box 的 Shadowsocks **出站**配置提供内置 SIP003 兼容实现，支持 `obfs-local` 和 `v2ray-plugin`；这不表示它会任意启动外部插件，也不能据此假设 Shadowsocks 入站具有同样字段。服务端必须另有匹配实现，部署前分别检查两端配置。

### WebSocket

`WebSocket` 是一种承载方式，不是代理协议。它的作用是让代理流量看起来像一条常规 WebSocket 连接，常用于穿过 HTTP 入口或统一 443 端口。

使用 `WebSocket` 时，需要分别核对 HTTP Host、路径、TLS 是否启用，以及网关转发到哪个后端。启用 WebSocket 只说明采用了这种消息承载，不保证流量无法被识别，也不会自动获得端到端保密性。

### TLS

`TLS` 负责证书校验和加密外壳。它不是代理协议，但很多代理方案都会把代理流量包在 TLS 里面。

TLS 客户端应校验证书信任链和连接使用的服务器名称；`SNI` 是握手中用于选择服务的名称，不等于校验动作本身。私钥和证书路径属于终止 TLS 的服务端配置。如果网关先解密 WSS，再用明文 WebSocket 连接后端，外层 TLS 只保护到网关这一段，需要另行保护后端链路。

## 四种常见组合

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

这种组合增加 WebSocket 封装；若使用 WSS，还会叠加 TLS，再由 TCP 承载。服务端应按反向顺序解包。SIP003 流式插件也不表示 UDP 会自动获得相同的封装能力，需按实现验证。

### 3. Trojan + TLS

```text
Clash Verge / sing-box client
  -> Trojan
  -> TLS
  -> 远端代理服务
  -> 目标站点
```

特点是协议本身就已经和 TLS 绑定，部署通常比“Shadowsocks + 插件”更直接。

### 4. Hysteria2 + QUIC

```text
Clash Verge / Mihomo client
  -> Hysteria2
  -> QUIC (UDP)
  -> 远端代理服务
  -> 目标站点
```

Hysteria2 在 UDP 上使用 QUIC，TCP 代理连接可分配到不同 Stream，UDP 代理则使用数据报机制。独立流避免 TCP 层跨流有序等待，但仍共享路径、连接级资源和拥塞状态，不能理解为“某条流丢包，其他流完全不受影响”。

拥塞控制也不是统一的固定速率：截至 2026-10-20，官方客户端文档按方向通过带宽参数选择 Brutal；未选择时可使用配置的 BBR 或 Reno，服务端上限和 `ignoreClientBandwidth` 还会影响协商。其他内核的字段与默认行为要单独核对。过高带宽值会增加排队和不稳定，不能通过夸大数值获得额外链路容量。

部署要放行相应 UDP 端口，两端实现都需支持 Hysteria2。UDP 受限时可另外配置 TCP 代理节点作为兜底，这不是同一条 QUIC 连接自动退化为 TCP。落地与排障见 [Hysteria2 落地与订阅编排](./hysteria2-practice.md)，选择依据见 [跨境链路慢与不稳定的诊断](./cross-border-diagnosis.md)。

## 组合不匹配时怎样定位

以下载 API 走 `Shadowsocks → WebSocket → TLS → TCP` 为例，TLS 握手失败先核对证书名称和信任链；TLS 成功但 HTTP 返回 404，检查 WebSocket 路径与网关转发；升级成功后代理认证失败，再核对 Shadowsocks 方法与密码。三者都成功而目标仍不可达，继续查远端 DNS 和出口。逐层保留失败证据，避免一次同时改密码、证书和路径，导致无法判断哪项修改有效。

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

归纳起来：`Shadowsocks` 负责“怎么代理”，`v2ray-plugin` 负责“怎么套一层外壳”，`WebSocket` 是那层外壳的常见形态，`sing-box` 是把这些能力运行起来的代理核心。
