# 网络代理实施总览

如果目标是“照着文档搭出一套能用的环境”，先不要一口气看所有内容。最稳的阅读顺序是：

1. 先准备证书。
2. 再部署服务端。
3. 再配置客户端。
4. 最后做验证和排障。

这几步对应到本专题的组件文档：

| 页面 | 内容 |
| --- | --- |
| [证书申请与续期](./certificate.md) | 用 `acme.sh` 申请、安装和续期 TLS 证书 |
| [服务端部署（systemd）](./server-systemd.md) | 在 Linux 宿主机上安装 sing-box、写配置、启服务 |
| [服务端部署（Docker）](./server-docker.md) | 用 Docker Compose 拉起同一套 sing-box 服务 |
| [新增用户与常用命令](./user-management.md) | 新增账号、改密码、停用账号、回滚和客户端同步 |
| [Clash Verge 客户端](./clash-verge.md) | 导入配置、选节点、开系统代理或 TUN |
| [运维与排查](./operations.md) | 看日志、查端口、处理失效和变更 |

## 推荐主线

如果你的服务器环境更接近常规 Linux 宿主机，建议先看 `systemd` 方案，再看证书和客户端。  
如果你的服务器环境已经以容器为主，就先看 Docker 方案，再看证书和客户端。

## 这套链路长什么样

```text
证书
  -> 服务端 sing-box
  -> Clash Verge / Mihomo
  -> 目标网站 / API
```

本专题默认主线是 `sing-box + Trojan over TLS + Clash Verge / Mihomo`。如果你后续还想加 Nginx、WebSocket、自动测速或多节点，先把这条主线跑通再扩展。

## 先看什么，后看什么

- 只想搭出一套可用环境：先看 [证书](./certificate.md)，再看 [服务端（systemd）](./server-systemd.md)，最后看 [客户端](./clash-verge.md)。
- 已经有证书，只想把服务端跑起来：直接看 [服务端（systemd）](./server-systemd.md)。
- 已经在用 Docker：看 [服务端（Docker）](./server-docker.md)。
- 跑通后想知道为什么会失败：看 [运维与排查](./operations.md)。

## 总结

实施部分不再讲概念，后面的页面都按“安装 -> 配置 -> 生效 -> 验证”的顺序写。读者照着一步步做，能够落到和当前专题一致的代理链路。
