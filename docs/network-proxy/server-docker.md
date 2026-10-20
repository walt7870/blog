# 服务端部署（Docker）

Docker Compose 把运行镜像、端口映射、挂载和日志上限固定在同一份部署配置中。证书仍由宿主机续期，容器只读加载；Docker 不会自动解决证书权限、账号管理或公网放行。

## 宿主机与容器边界

![Docker代理部署的端口映射与只读挂载](/network-proxy/docker-deployment.svg)

例如主机 `8443` 映射到容器 `443` 时，客户端填写 `8443`，sing-box 配置仍监听 `443`。证书里的名称与端口无关，仍校验 `proxy.example.com`。混淆这两个端口会出现“容器启动正常，但客户端一直连接超时”。

## 准备运行环境与目录

已安装 Docker Engine 和 Compose 插件后确认版本。安装、存储和网络机制可参见 [Docker 专题](/docs/container/docker/)。本页部署目录由 root 管理，后续统一用 sudo，不递归改变已有目录的所有者。

```bash
docker version
docker compose version
sudo install -d -m 700 /opt/network-proxy
sudo install -d -m 700 /opt/network-proxy/config \
  /opt/network-proxy/certs /opt/network-proxy/backup
```

目录含带凭据的配置与私钥，不是公共静态站点目录。按 [证书页](./certificate.md) 把证书安装到宿主机 `/opt/network-proxy/certs/`。本例不启用缓存数据库等持久状态功能，因此没有数据卷；后续启用时须为实际状态目录增加独立持久卷和恢复方案。

## 固定镜像与进程身份

在 `/opt/network-proxy/.env` 写入选定的已发布标签，不能照搬占位值，也不要使用浮动 `latest` 作为版本记录：

```dotenv
SING_BOX_IMAGE=ghcr.io/sagernet/sing-box:REPLACE_WITH_RELEASE_TAG
```

先拉取该镜像，核对配置的用户、入口和镜像摘要；这些检查在改为派生镜像后也要重做。以下 shell 中的值应与 `.env` 一致：

```bash
SING_BOX_IMAGE='ghcr.io/sagernet/sing-box:替换为选定标签'
sudo docker pull "$SING_BOX_IMAGE"
sudo docker image inspect "$SING_BOX_IMAGE" \
  --format 'User={{json .Config.User}} Entrypoint={{json .Config.Entrypoint}} Digests={{json .RepoDigests}}'
```

本页 Compose 假设官方镜像入口执行 sing-box，且有效 UID 为 root；这样才能读取 root 拥有的 `700` 目录与 `600` 私钥。检查结果为其他身份时应先按该 UID/GID 配置文件和父目录权限，再部署。不要用 `chmod 777` 修复。实际发布可将已核对的 `RepoDigest` 固定为 `ghcr.io/sagernet/sing-box@sha256:…`，把回滚指向明确的不可变镜像。

## 配置文件与 Compose

在 `/opt/network-proxy/config/config.json` 放置 [systemd 页的最小 Trojan 配置](./server-systemd.md#最小服务配置)。其中的证书路径是容器内部路径 `/etc/sing-box/certs/`，不是宿主机 `/opt/network-proxy/certs/`。账号名称、随机密码、证书域名与客户端配置保持一致。

`/opt/network-proxy/compose.yml`：

```yaml
services:
  sing-box:
    image: ${SING_BOX_IMAGE:?必须在.env设置已核对的镜像标签或摘要}
    restart: unless-stopped
    ports:
      - "443:443/tcp"
    volumes:
      - ./config:/etc/sing-box:ro
      - ./certs:/etc/sing-box/certs:ro
    command: ["-D", "/var/lib/sing-box", "-C", "/etc/sing-box", "run"]
    logging:
      driver: json-file
      options:
        max-size: "20m"
        max-file: "5"
```

第二个挂载在容器配置目录下覆盖 `certs` 子目录，两个源目录都必须存在。只读挂载目录能在续期替换文件后重新读取；若只挂载单个文件，要额外核对替换 inode 后容器是否仍看到旧文件。日志由 Docker daemon 管理，`json-file` 的存储通常不在本项目目录，迁移配置目录不会自动迁移日志。

如果主机 443 已占用，可把映射改成 `8443:443/tcp` 并相应调整客户端和防火墙。此示例只发布 TCP，不能据此宣称远端 UDP 代理已可用；有 UDP 需求时需核对协议、内核和额外网络配置。

## 检查、启动与验收

```bash
sudo docker compose -f /opt/network-proxy/compose.yml config --quiet
sudo docker compose -f /opt/network-proxy/compose.yml run --rm sing-box \
  -D /var/lib/sing-box -C /etc/sing-box check
# 两项检查成功后执行
sudo docker compose -f /opt/network-proxy/compose.yml up -d
sudo docker compose -f /opt/network-proxy/compose.yml ps
sudo docker compose -f /opt/network-proxy/compose.yml logs --tail=100 sing-box
sudo docker compose -f /opt/network-proxy/compose.yml port sing-box 443
```

临时检查容器默认不发布服务端口，因此 `check` 通过不能排除正式启动时的端口冲突。端口映射由 Docker 网络实现，宿主机 `ss` 不一定能看到单独监听进程；应结合 Compose 映射和来自客户端网络的真实连接验证。

```bash
openssl s_client -connect proxy.example.com:443 \
  -servername proxy.example.com -verify_hostname proxy.example.com \
  -verify_return_error </dev/null
```

若映射使用 8443，修改 `-connect` 的端口。TLS 通过后按 [客户端页](./clash-verge.md) 验证正确密码访问目标、错误密码被拒绝、内网域名仍直连。重启容器后重复测试，确认读到当前证书与配置。全过程不需要把 Docker socket 暴露给 sing-box 容器。

## 变更与回滚

| 变化 | 应用方式 | 验证重点 |
| --- | --- | --- |
| bind mount 中的 JSON 或证书 | 临时容器 `check` 成功后 `restart sing-box` | 当前进程重新读取文件，业务新连接正常 |
| 镜像、端口、环境变量、挂载等 Compose 定义 | `pull` 后 `up -d` 重建，必要时明确强制重建 | 镜像摘要、实际映射和容器配置已更新 |
| unit、宿主防火墙或 DNS | 在对应管理系统应用 | 不能靠容器重启替代外部配置变更 |

```bash
sudo docker compose -f /opt/network-proxy/compose.yml pull
sudo docker compose -f /opt/network-proxy/compose.yml run --rm sing-box \
  -D /var/lib/sing-box -C /etc/sing-box check
# 检查成功后按新的Compose定义创建或更新服务
sudo docker compose -f /opt/network-proxy/compose.yml up -d
```

`restart` 不会应用新的镜像标签、端口或环境变量。升级前保存旧镜像摘要、Compose 和受保护的配置备份；失败时恢复兼容组合，重建后再做业务验证。账号轮换和泄漏撤销见 [用户管理](./user-management.md)，不能为了恢复服务重新启用已泄漏的旧密码。
