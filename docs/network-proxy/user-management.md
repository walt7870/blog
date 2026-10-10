# 用户管理与常用变更

这一页只处理一件事：服务已经跑起来以后，怎么安全地新增用户、改密码、停用旧用户、同步客户端，并且在出错时能回滚。

这里的“用户”指的是服务端配置里的 `users` 项，不是系统账号，也不是 Docker 账号。

## 先认清这件事

在 `sing-box` 的 Trojan 入站里，`users` 里的每一项通常包含：

- `name`：标签，方便你识别这是谁的配置。
- `password`：真正参与认证的密钥。

所以：

- 新增 `user31` 这种名字，本身没有问题；
- 真正关键的是密码是否唯一、配置是否正确、客户端是否同步；
- 如果只是改了服务端，没有让客户端更新，现象就是“服务端看起来正常，但客户端连不上”。

## 变更前先做的事

不管你走 `systemd` 还是 Docker，先做三个动作：

1. 备份当前配置。
2. 生成新密码。
3. 先检查，再生效。

### 备份

`systemd` 方案：

```bash
sudo cp /etc/sing-box/config.json /opt/network-proxy/backup/config.json.$(date +%Y%m%d%H%M%S)
```

Docker 方案：

```bash
cp /opt/network-proxy/config/config.json /opt/network-proxy/backup/config.json.$(date +%Y%m%d%H%M%S)
```

### 生成密码

建议用随机密码，不要手工编。

```bash
openssl rand -base64 24
```

如果你要自己保存，也可以：

```bash
openssl rand -hex 16
```

## 新增用户的标准步骤

### 1. 找到 `users` 数组

`systemd` 方案一般在：

```bash
/etc/sing-box/config.json
```

Docker 方案一般在：

```bash
/opt/network-proxy/config/config.json
```

### 2. 在 `users` 里新增一项

示例：

```json
{
  "name": "user31",
  "password": "REPLACE_WITH_RANDOM_PASSWORD"
}
```

建议命名规则：

- `user31`、`user32` 这类按编号；
- 或者 `macbook-niu`、`iphone-niu` 这类按设备；
- 但不要多个客户端共用同一个 `password`。

### 3. 检查配置

`systemd` 方案：

```bash
sudo sing-box check -D /var/lib/sing-box -C /etc/sing-box
```

Docker 方案：

```bash
docker compose -f /opt/network-proxy/compose.yml run --rm sing-box \
  -D /var/lib/sing-box -C /etc/sing-box check
```

检查不通过时，先看这几类问题：

- JSON 少了逗号或括号；
- `users` 结构写错；
- 证书路径不对；
- 端口冲突；
- 修改了文件但改错了目录。

### 4. 让变更生效

`systemd` 方案：

```bash
sudo systemctl restart sing-box
```

Docker 方案：

```bash
docker compose -f /opt/network-proxy/compose.yml restart sing-box
```

如果你改的是证书或者镜像，不只改用户，也按同样方式重启一次。

### 5. 验证服务

`systemd` 方案：

```bash
sudo systemctl status sing-box --no-pager
journalctl -u sing-box -f
```

Docker 方案：

```bash
docker compose -f /opt/network-proxy/compose.yml ps
docker compose -f /opt/network-proxy/compose.yml logs -f sing-box
```

再补一条通用检查：

```bash
ss -lntp | grep ':443'
```

## 改密码怎么做

改密码和新增用户一样，本质是“把旧密码换成新密码”。

推荐流程：

1. 先备份配置。
2. 只改一个用户的 `password`。
3. 先 `check`。
4. 再重启服务。
5. 立刻更新客户端。

如果你想避免旧客户端立刻失效，可以短时间内保留旧用户和新用户两项，让客户端慢慢迁移。等旧客户端全部切走，再删旧项。

## 停用用户怎么做

有两种方式：

### 直接删除

从 `users` 里删掉这一项，然后检查、重启。

适合：

- 这个账号已经不用了；
- 不需要保留回滚窗口。

### 先改密码再观察

先把原密码换掉，再观察一段时间。

适合：

- 怀疑账号被泄露；
- 但还想确认哪些客户端还在用。

## 回滚怎么做

如果改完后客户端大面积连不上，先回滚到上一版配置。

### systemd 回滚

```bash
sudo cp /opt/network-proxy/backup/config.json.YYYYMMDDHHMMSS /etc/sing-box/config.json
sudo sing-box check -D /var/lib/sing-box -C /etc/sing-box
sudo systemctl restart sing-box
```

### Docker 回滚

```bash
cp /opt/network-proxy/backup/config.json.YYYYMMDDHHMMSS /opt/network-proxy/config/config.json
docker compose -f /opt/network-proxy/compose.yml run --rm sing-box -D /var/lib/sing-box -C /etc/sing-box check
docker compose -f /opt/network-proxy/compose.yml restart sing-box
```

## 客户端怎么同步

服务端新增用户后，客户端要做两件事：

1. 更新订阅或本地配置。
2. 切到新节点或新用户对应的配置。

### Clash Verge

如果你用 Clash Verge：

- 导入新的订阅；
- 或者替换本地配置文件；
- 然后在“代理”页选择对应节点；
- 再去“连接”页看是否真的连上。

### 直接改本地 YAML

如果你维护的是本地 YAML，修改完后要重新导入或重载配置，不然客户端还在用旧值。

## 常用命令

### systemd

| 操作 | 命令 |
| --- | --- |
| 检查配置 | `sudo sing-box check -D /var/lib/sing-box -C /etc/sing-box` |
| 启动 | `sudo systemctl start sing-box` |
| 停止 | `sudo systemctl stop sing-box` |
| 重启 | `sudo systemctl restart sing-box` |
| 查看状态 | `sudo systemctl status sing-box --no-pager` |
| 看日志 | `journalctl -u sing-box -f` |
| 开机自启 | `sudo systemctl enable sing-box` |
| 取消自启 | `sudo systemctl disable sing-box` |

### Docker

| 操作 | 命令 |
| --- | --- |
| 检查配置 | `docker compose -f /opt/network-proxy/compose.yml run --rm sing-box -D /var/lib/sing-box -C /etc/sing-box check` |
| 启动 | `docker compose -f /opt/network-proxy/compose.yml up -d` |
| 停止 | `docker compose -f /opt/network-proxy/compose.yml down` |
| 重启 | `docker compose -f /opt/network-proxy/compose.yml restart sing-box` |
| 查看状态 | `docker compose -f /opt/network-proxy/compose.yml ps` |
| 看日志 | `docker compose -f /opt/network-proxy/compose.yml logs -f sing-box` |
| 更新镜像 | `docker compose -f /opt/network-proxy/compose.yml pull && docker compose -f /opt/network-proxy/compose.yml up -d` |

## 你最该记住的顺序

无论新增用户、改密码还是停用用户，顺序都一样：

1. 备份。
2. 改一处。
3. `check`。
4. 重启。
5. 看状态和日志。
6. 更新客户端。
7. 需要的话再回滚。

## 总结

用户管理不是“改个名字就完了”。真正的安全边界是：配置备份、密码唯一、先检查再生效、客户端同步、出问题能回滚。把这五步做顺，账号增删改就不会把整条链路带崩。
