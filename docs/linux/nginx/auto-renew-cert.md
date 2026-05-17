# Nginx 自动证书续期

HTTPS 证书不是 Nginx 自动续期的。Nginx 只负责加载证书文件；申请、校验、续期和复制证书通常由证书客户端完成。这里以 `acme.sh`、DNS API、Nginx 或 OpenResty 为例说明完整闭环。

![Nginx 证书自动续期链路](/nginx/cert-renewal-flow.svg)

## 基本链路

自动续期包含几个角色：

| 角色 | 作用 |
| --- | --- |
| `acme.sh` | 申请证书、定期检查有效期、续期后执行部署命令 |
| Let's Encrypt | 签发证书并校验域名所有权 |
| DNS API | 写入 `_acme-challenge` TXT 记录完成 DNS 校验 |
| Nginx / OpenResty | 读取证书文件并提供 HTTPS 服务 |
| reload 命令 | 让 Web 服务加载新证书 |

正确闭环是：`acme.sh` 申请证书 -> DNS 校验通过 -> 证书签发 -> 复制到固定目录 -> `nginx -t` 或 reload -> 线上服务使用新证书。

## 准备条件

- 域名 DNS 在可通过 API 管理的平台。
- 服务器能访问 Let's Encrypt。
- 已安装 Nginx 或 OpenResty。
- 知道实际配置文件路径和 reload 命令。
- 有 DNS API 的最小权限账号。

不要用主账号 AccessKey。给证书续期创建单独 RAM 子账号或等价权限账号，只授予 DNS 记录管理所需权限。

## 安装 acme.sh

```bash
curl https://get.acme.sh | sh
```

安装后重新加载 shell：

```bash
source ~/.bashrc
```

确认命令可用：

```bash
~/.acme.sh/acme.sh --version
```

## 配置 DNS API

以阿里云 DNS 为例，写入环境变量：

```bash
export Ali_Key="你的 AccessKeyId"
export Ali_Secret="你的 AccessKeySecret"
```

`acme.sh` 会把这些值保存到自己的配置中。注意不要把密钥写进仓库、截图或公开文档。

## 申请证书

先用测试环境验证流程，避免触发正式环境频率限制：

```bash
~/.acme.sh/acme.sh --issue \
  --dns dns_ali \
  -d example.com \
  -d '*.example.com' \
  --staging
```

测试通过后申请正式证书：

```bash
~/.acme.sh/acme.sh --issue \
  --dns dns_ali \
  -d example.com \
  -d '*.example.com'
```

DNS 校验适合泛域名证书，也不要求 Nginx 暴露 `.well-known` 路径。它的关键风险是 DNS API 权限和本机时间。

## 部署证书到固定目录

不要让 Nginx 直接读取 `~/.acme.sh/` 内部目录。更稳妥的方式是把证书安装到固定路径：

```bash
sudo mkdir -p /etc/nginx/ssl
sudo chmod 755 /etc/nginx/ssl
```

```bash
~/.acme.sh/acme.sh --install-cert -d example.com \
  --key-file       /etc/nginx/ssl/example.com.key \
  --fullchain-file /etc/nginx/ssl/example.com.crt \
  --reloadcmd      "sudo systemctl reload nginx"
```

`--install-cert` 不只是复制一次文件，它还会记录部署路径和 reload 命令，后续续期成功后会自动执行。

如果使用 OpenResty，reload 命令要改成实际服务：

```bash
~/.acme.sh/acme.sh --install-cert -d example.com \
  --key-file       /etc/nginx/ssl/example.com.key \
  --fullchain-file /etc/nginx/ssl/example.com.crt \
  --reloadcmd      "sudo systemctl reload openresty"
```

手动编译安装的 OpenResty 可能没有 systemd 服务，需要使用实际二进制：

```bash
sudo /usr/local/openresty/nginx/sbin/nginx -t
sudo /usr/local/openresty/nginx/sbin/nginx -s reload
```

## 配置 Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate     /etc/nginx/ssl/example.com.crt;
    ssl_certificate_key /etc/nginx/ssl/example.com.key;

    location / {
        proxy_pass http://127.0.0.1:8080;
    }
}

server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}
```

检查并重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

如果证书文件路径和 Nginx 配置不一致，续期成功也不会生效。

## 验证自动续期

查看定时任务：

```bash
crontab -l
```

手动模拟续期流程：

```bash
~/.acme.sh/acme.sh --renew -d example.com --force
```

查看证书到期时间：

```bash
openssl x509 -in /etc/nginx/ssl/example.com.crt -noout -dates
```

查看线上证书：

```bash
echo | openssl s_client -servername example.com -connect example.com:443 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates
```

线上证书和本地文件都要看。只看本地文件存在，不能证明 Nginx 已经加载了新证书。

## 常见问题

### `Unit nginx.service not found`

说明系统里没有名为 `nginx` 的 systemd 服务。可能使用的是 OpenResty、容器 Nginx 或手动编译版本。

处理方式：

1. 用 `ps -ef | grep nginx` 找实际进程。
2. 用 `systemctl list-units | grep -E 'nginx|openresty'` 找服务名。
3. 重新执行 `--install-cert`，把 `--reloadcmd` 改成真实命令。

### `InvalidTimeStamp.Expired`

通常是服务器时间不准，DNS API 签名过期。

检查：

```bash
timedatectl
```

修复时间同步后再重试。

### `Pending authorization`

说明域名校验没有完成。常见原因：

- DNS API 权限不足。
- TXT 记录没有生效。
- DNS 解析传播慢。
- 域名写错或托管平台不一致。

### `rateLimit exceeded`

正式环境申请过于频繁。测试流程先使用 `--staging`，正式环境只在配置确认后执行。

### 浏览器仍显示旧证书

检查顺序：

1. `acme.sh` 是否续期成功。
2. `/etc/nginx/ssl/` 下证书是否更新。
3. Nginx 配置是否指向这个文件。
4. reload 命令是否成功。
5. 前面是否还有 CDN、负载均衡或其他 TLS 终止层。

## 路径速查

| 内容 | 常见路径 |
| --- | --- |
| acme.sh 主目录 | `~/.acme.sh/` |
| 部署证书 | `/etc/nginx/ssl/example.com.crt` |
| 部署私钥 | `/etc/nginx/ssl/example.com.key` |
| Nginx 主配置 | `/etc/nginx/nginx.conf` |
| Nginx 站点配置 | `/etc/nginx/sites-available/`、`/etc/nginx/conf.d/` |
| OpenResty 配置 | `/usr/local/openresty/nginx/conf/` |

## 最小闭环

上线前确认：

- DNS API 使用最小权限账号。
- 测试环境签发流程通过。
- 正式证书已部署到固定目录。
- Nginx 配置指向 `fullchain` 和私钥文件。
- `nginx -t` 通过。
- reload 命令能成功执行。
- 线上 `openssl s_client` 查到的是新证书。
- `crontab -l` 中存在自动续期任务。

## 总结

证书自动续期的关键不是某一条命令，而是闭环完整：DNS 校验能通过，证书能部署到 Nginx 实际读取的路径，reload 命令能成功执行，线上服务确实加载新证书。排查时沿着“签发 -> 部署 -> 配置 -> reload -> 线上验证”逐段确认。
