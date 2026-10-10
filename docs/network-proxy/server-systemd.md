# 服务端部署（systemd）

这一页讲的是 Linux 宿主机上的标准部署方式：直接安装 `sing-box`，把配置放到 `/etc/sing-box/`，由 `systemd` 管理进程。

这条路线适合：

- 服务器本来就跑着 systemd。
- 想要原生自启动、原生日志、少一层容器。
- 想让配置和进程状态更容易在宿主机上排障。

## 安装 sing-box

官方安装脚本会安装适合当前发行版的包：

```bash
curl -fsSL https://sing-box.app/install.sh | sudo sh
```

如果想安装测试版或指定版本，可以改成：

```bash
curl -fsSL https://sing-box.app/install.sh | sudo sh -s -- --beta
```

```bash
curl -fsSL https://sing-box.app/install.sh | sudo sh -s -- --version <version>
```

安装完成后先做三件事：

1. 确认命令存在。
2. 确认 systemd unit 已经安装。
3. 确认服务不会和现有 443 端口冲突。

```bash
sing-box version
systemctl cat sing-box
ss -lntp | grep ' :443' || true
```

如果 `systemctl cat sing-box` 能看到服务定义，说明包已经把 service 文件装好了；后面只需要放配置、启服务。

## 准备目录

```bash
sudo mkdir -p /etc/sing-box/{certs,config.d}
sudo mkdir -p /opt/network-proxy/{subscriptions,backup}
```

这里的思路是把“服务端运行配置”和“客户端订阅模板”分开：

- `/etc/sing-box/` 只放服务端运行所需文件。
- `/opt/network-proxy/` 放你自己维护的模板、备份和导出文件。

推荐放法：

| 路径 | 用途 |
| --- | --- |
| `/etc/sing-box/config.json` | 主配置文件 |
| `/etc/sing-box/certs/` | TLS 证书和私钥 |
| `/opt/network-proxy/subscriptions/` | 客户端订阅模板 |
| `/opt/network-proxy/backup/` | 配置备份 |

## 放置证书

把证书和私钥复制到固定路径：

```bash
sudo cp /path/to/fullchain.pem /etc/sing-box/certs/fullchain.pem
sudo cp /path/to/privkey.pem /etc/sing-box/certs/privkey.pem
sudo chmod 600 /etc/sing-box/certs/privkey.pem
```

这一步的目标是让 `systemd` 管理的 sing-box 能直接读到证书文件。

验证证书文件：

```bash
openssl x509 -in /etc/sing-box/certs/fullchain.pem -noout -subject -issuer -dates
```

如果后面要让非 root 用户读取证书，再额外调整 `/etc/sing-box/certs` 目录权限；如果服务以 root 运行，先保持最小权限即可。

## 编写配置

创建 `/etc/sing-box/config.json`：

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

你要替换的只有三项：

| 字段 | 替换内容 |
| --- | --- |
| `proxy.example.com` | 你的域名 |
| `CHANGE_ME_TO_RANDOM_PASSWORD` | 自己生成的随机密码 |
| `listen_port` | 对外端口，主线方案用 `443` |

这份配置的作用是：`sing-box` 作为 Trojan 服务端监听 443，客户端连进来后走 `direct` 出口访问目标服务。

## 先检查，再启动

`sing-box` 的配置是 JSON，先做语法检查：

```bash
sudo sing-box check -D /var/lib/sing-box -C /etc/sing-box
```

`check` 通过以后，再启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now sing-box
```

如果 `enable --now` 执行后服务没起来，立刻看状态和日志：

```bash
sudo systemctl status sing-box --no-pager
journalctl -u sing-box -f
```

如果检查不通过，先修正：

- JSON 语法
- 证书路径
- 密码字段
- 端口冲突

这一步不要跳过。配置没过检查时直接重启，只会把错误状态重复一遍。

## 怎么生效

改完 `config.json` 后，按这个顺序来：

1. 先检查配置。
2. 再重启服务。
3. 最后看状态和日志。

```bash
sudo sing-box check -D /var/lib/sing-box -C /etc/sing-box
sudo systemctl restart sing-box
sudo systemctl status sing-box --no-pager
```

如果只是证书更新，也一样重启服务让它重新加载证书文件。

## 怎么验证

看端口是否在监听：

```bash
ss -lntp | grep ':443'
```

看 TLS 证书是否对外可见：

```bash
openssl s_client -servername proxy.example.com -connect proxy.example.com:443 </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates
```

如果这一步失败：

1. 检查 DNS 是否指向这台机器。
2. 检查安全组和防火墙。
3. 检查 `sing-box` 是否在运行。
4. 检查证书文件权限。
5. 检查 443 是否被别的服务占用。

## 新增用户

标准做法是“先备份，再新增，再检查，再生效，再验证”。

### 1. 先备份当前配置

```bash
sudo cp /etc/sing-box/config.json /opt/network-proxy/backup/config.json.$(date +%Y%m%d%H%M%S)
```

### 2. 生成新密码

```bash
openssl rand -base64 24
```

把结果记下来，替换到新用户里。

### 3. 修改 `users` 数组

在 `users` 里新增一项：

```json
{
  "name": "user-b",
  "password": "ANOTHER_RANDOM_PASSWORD"
}
```

建议遵守这两个习惯：

- 每个用户一个独立密码。
- `name` 用来识别设备或用途，不要复用旧名字。

### 4. 检查配置

```bash
sudo sing-box check -D /var/lib/sing-box -C /etc/sing-box
```

如果检查失败，先不要重启，回去修 JSON 或密码字段。

### 5. 生效

```bash
sudo systemctl restart sing-box
```

### 6. 验证

先看服务状态，再看日志：

```bash
sudo systemctl status sing-box --no-pager
journalctl -u sing-box -f
```

然后用新用户对应的客户端配置重新导入或更新订阅，确认：

1. 节点能连上。
2. 连接页有记录。
3. 目标网站或 API 可访问。

## 常用命令

这组命令最常用，建议先记住它们的作用：

| 操作 | 命令 | 什么时候用 |
| --- | --- | --- |
| 检查配置 | `sudo sing-box check -D /var/lib/sing-box -C /etc/sing-box` | 改配置后，重启前 |
| 启动 | `sudo systemctl start sing-box` | 服务没起来时 |
| 停止 | `sudo systemctl stop sing-box` | 临时下线时 |
| 重启 | `sudo systemctl restart sing-box` | 改配置或证书后 |
| 查看状态 | `sudo systemctl status sing-box --no-pager` | 确认是否活着 |
| 看日志 | `journalctl -u sing-box -f` | 排查错误时 |
| 开机自启 | `sudo systemctl enable sing-box` | 确认下次开机自动起 |
| 取消自启 | `sudo systemctl disable sing-box` | 临时关闭自动启动 |

## 总结

systemd 方式的关键是：安装后先确认服务文件，再放配置，再 `check`，最后 `enable --now`。配置改动后靠 `restart` 生效，日志用 `journalctl` 看，端口和证书用 `ss` 和 `openssl s_client` 验证。
