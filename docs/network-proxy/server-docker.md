# 服务端部署（Docker）

这一页讲 Docker Compose 方式。它适合把服务端配置、证书和进程都放在一个目录里，迁移和回滚都比较直观。

## 安装 Docker

如果服务器还没有 Docker，先安装 Docker Engine 和 Compose 插件。不同发行版命令不同，最稳妥的做法是按照发行版官方文档安装；安装后先确认两件事：

```bash
docker version
docker compose version
```

如果这两个命令都能正常输出，说明基础运行环境就绪。

## 准备目录

```bash
sudo mkdir -p /opt/network-proxy/{config,certs,subscriptions,backup}
sudo chown -R "$USER":"$USER" /opt/network-proxy
cd /opt/network-proxy
```

这一步是在宿主机上固定一个工作目录。后面配置、证书、订阅和备份都放在这里，比较好迁移和回滚。

目录用途：

| 路径 | 用途 |
| --- | --- |
| `/opt/network-proxy/config/` | sing-box 配置 |
| `/opt/network-proxy/certs/` | 证书和私钥 |
| `/opt/network-proxy/subscriptions/` | 客户端订阅模板 |
| `/opt/network-proxy/backup/` | 备份 |

## 放证书

```bash
cp /path/to/fullchain.pem /opt/network-proxy/certs/fullchain.pem
cp /path/to/privkey.pem /opt/network-proxy/certs/privkey.pem
chmod 600 /opt/network-proxy/certs/privkey.pem
```

这里的目标是让容器可以只读挂载证书目录，私钥只给 sing-box 进程读。

## 写配置

`/opt/network-proxy/config/config.json` 内容可以和 systemd 方案完全一样。

这里是 Docker 方式的核心输入。

```json
{
  "log": {
    "level": "info",
    "timestamp": true
  },
  "inbounds": [
    {
      "type": "trojan",
      "tag": "trojan-in",
      "listen": "0.0.0.0",
      "listen_port": 443,
      "users": [
        {
          "name": "user-a",
          "password": "CHANGE_ME_TO_RANDOM_PASSWORD"
        }
      ],
      "tls": {
        "enabled": true,
        "server_name": "proxy.example.com",
        "certificate_path": "/etc/sing-box/certs/fullchain.pem",
        "key_path": "/etc/sing-box/certs/privkey.pem"
      }
    }
  ],
  "outbounds": [
    {
      "type": "direct",
      "tag": "direct"
    }
  ],
  "route": {
    "final": "direct"
  }
}
```

## 写 compose

`/opt/network-proxy/compose.yml`：

Compose 文件的作用是把镜像、端口、卷挂载、日志策略和重启策略固定下来。

```yaml
services:
  sing-box:
    image: ghcr.io/sagernet/sing-box:latest
    container_name: network-proxy-sing-box
    restart: unless-stopped
    ports:
      - "443:443/tcp"
    volumes:
      - ./config:/etc/sing-box:ro
      - ./certs:/etc/sing-box/certs:ro
    command: -D /var/lib/sing-box -C /etc/sing-box run
    logging:
      driver: json-file
      options:
        max-size: "20m"
        max-file: "5"
```

如果 443 已被占用，先临时改成：

```yaml
ports:
  - "8443:443/tcp"
```

这样客户端也要跟着用 `8443`。跑通后再决定要不要迁回 443。

## 启动前检查

```bash
docker compose -f /opt/network-proxy/compose.yml run --rm sing-box \
  -D /var/lib/sing-box -C /etc/sing-box check
```

这一步会临时起一个容器，专门检查 JSON 和证书路径。

如果检查失败，先修配置，不要直接启动。

## 启动和验证

```bash
docker compose -f /opt/network-proxy/compose.yml up -d
docker compose -f /opt/network-proxy/compose.yml ps
docker compose -f /opt/network-proxy/compose.yml logs --tail=100 sing-box
```

先确认容器是 `Up` 状态，再看日志里有没有端口冲突、证书路径错误或认证错误。

启动后先看状态，再看日志，不要一上来就改配置。

验证端口：

```bash
ss -lntp | grep ':443'
```

验证证书：

```bash
openssl s_client -servername proxy.example.com -connect proxy.example.com:443 </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates
```

## 怎么生效

改完 `config.json` 或证书后，先检查，再重启：

```bash
docker compose -f /opt/network-proxy/compose.yml run --rm sing-box \
  -D /var/lib/sing-box -C /etc/sing-box check
docker compose -f /opt/network-proxy/compose.yml restart sing-box
```

如果只是更新镜像：

```bash
docker compose -f /opt/network-proxy/compose.yml pull
docker compose -f /opt/network-proxy/compose.yml up -d
```

## 常用命令

| 操作 | 命令 | 什么时候用 |
| --- | --- | --- |
| 检查配置 | `docker compose -f /opt/network-proxy/compose.yml run --rm sing-box -D /var/lib/sing-box -C /etc/sing-box check` | 改配置后、重启前 |
| 查看状态 | `docker compose -f /opt/network-proxy/compose.yml ps` | 先确认容器是否起来 |
| 查看日志 | `docker compose -f /opt/network-proxy/compose.yml logs -f sing-box` | 排查报错时 |
| 重启 | `docker compose -f /opt/network-proxy/compose.yml restart sing-box` | 配置或证书变更后 |
| 停止 | `docker compose -f /opt/network-proxy/compose.yml down` | 临时下线时 |
| 更新镜像 | `docker compose -f /opt/network-proxy/compose.yml pull && docker compose -f /opt/network-proxy/compose.yml up -d` | 升级版本时 |

## 总结

Docker 方式的关键是目录和卷挂载：配置、证书、日志和订阅都落在 `/opt/network-proxy/`，容器里只负责跑 `sing-box`。改配置后先 `check`，再 `restart`，日志和状态都在 `docker compose` 里看。
