# Nginx 自动证书续期

HTTPS 证书不是一次配置就永久有效。以 Let's Encrypt 为例，免费证书通常有效期为 90 天，如果没有自动续期，网站会在证书过期后出现“不安全”“证书无效”等提示。

本文以 Ubuntu 22.04、Nginx 或 OpenResty、阿里云 DNS 为例，使用 `acme.sh` 完成证书申请、部署和自动续期。配置完成后，服务器会定期检查证书有效期，在快到期时自动续期，并在续期成功后自动重载 Web 服务。

## 1. 自动续期的基本原理

自动续期并不是 Nginx 自己完成的，而是由证书客户端负责。完整链路如下：

1. `acme.sh` 向 Let's Encrypt 发起证书申请或续期。
2. Let's Encrypt 要求证明你拥有这个域名。
3. `acme.sh` 通过阿里云 DNS API 自动添加一条 `_acme-challenge` TXT 记录。
4. Let's Encrypt 校验 DNS 记录，确认域名归属。
5. 校验通过后签发新证书。
6. `acme.sh` 把证书复制到 Nginx 使用的目录。
7. `acme.sh` 执行 reload 命令，让 Nginx 或 OpenResty 加载新证书。

DNS 验证方式的优点是：不依赖 80 端口、不要求网站目录可写、支持泛域名证书，例如 `*.example.com`。

## 2. 准备条件

开始前需要准备：

- 一台 Ubuntu 22.04 服务器。
- 已安装 Nginx 或 OpenResty。
- 域名 DNS 托管在阿里云。
- 一个用于 DNS API 的阿里云 RAM 子账号。
- 服务器时间准确，建议启用 NTP。

安装常用依赖：

```bash
sudo apt update
sudo apt install -y git curl cron socat ca-certificates
```

检查时间同步：

```bash
timedatectl
```

如果时间不准，先启用时间同步：

```bash
sudo timedatectl set-ntp true
```

## 3. 安装 acme.sh

`acme.sh` 是一个轻量级 ACME 客户端，可以申请 Let's Encrypt、ZeroSSL 等 CA 的证书。国内服务器访问 GitHub 不稳定时，可以优先使用 Gitee 镜像安装。

```bash
curl https://gitee.com/neilpang/acme.sh/raw/master/acme.sh | sh -s email=your_email@example.com
```

如果网络可以正常访问 GitHub，也可以使用官方仓库安装：

```bash
git clone https://github.com/acmesh-official/acme.sh.git
cd acme.sh
./acme.sh --install -m your_email@example.com
```

安装完成后重新加载 Shell 环境：

```bash
source ~/.bashrc
```

验证安装结果：

```bash
~/.acme.sh/acme.sh --version
```

建议设置默认 CA 为 Let's Encrypt：

```bash
~/.acme.sh/acme.sh --set-default-ca --server letsencrypt
```

也可以开启 `acme.sh` 自身自动升级：

```bash
~/.acme.sh/acme.sh --upgrade --auto-upgrade
```

## 4. 配置阿里云 DNS API

### 4.1 创建 RAM 子账号

不建议直接使用阿里云主账号 AccessKey。更稳妥的做法是创建一个只用于 DNS 自动验证的 RAM 子账号。

操作步骤：

1. 登录阿里云控制台。
2. 进入“访问控制 RAM”。
3. 创建用户，例如 `acme-dns`。
4. 访问方式选择“OpenAPI 调用访问”。
5. 创建后保存 `AccessKey ID` 和 `AccessKey Secret`。

### 4.2 授予 DNS 权限

给这个 RAM 用户添加 DNS 管理权限：

```text
AliyunDNSFullAccess
```

如果你希望更严格，可以后续改成自定义最小权限策略，只允许管理指定域名的解析记录。

### 4.3 写入 acme.sh 配置

`acme.sh` 的 DNS API 变量名固定为 `Ali_Key` 和 `Ali_Secret`。推荐写入 `~/.acme.sh/account.conf`，这样后续自动续期时也能读取到。

```bash
echo 'export Ali_Key="你的AccessKeyId"' >> ~/.acme.sh/account.conf
echo 'export Ali_Secret="你的AccessKeySecret"' >> ~/.acme.sh/account.conf
```

注意：`account.conf` 里包含密钥，不要提交到 Git 仓库，也不要把内容贴到公开文档中。

## 5. 申请证书

下面以 `example.com` 为例。请把它替换成自己的域名。

### 5.1 先用测试环境验证

首次配置建议先加 `--test`，使用 Let's Encrypt 的 staging 环境，避免因为配置错误触发正式环境的失败次数限制。

```bash
~/.acme.sh/acme.sh --issue --dns dns_ali \
  -d example.com \
  -d '*.example.com' \
  --keylength ec-256 \
  --dnssleep 60 \
  --test
```

参数说明：

| 参数 | 说明 |
| --- | --- |
| `--dns dns_ali` | 使用阿里云 DNS API 自动验证域名 |
| `-d example.com` | 申请主域名证书 |
| `-d '*.example.com'` | 同时申请泛域名证书 |
| `--keylength ec-256` | 使用 ECC 证书，体积小、性能好 |
| `--dnssleep 60` | 等待 DNS 记录生效，国内环境建议稍微加长 |
| `--test` | 使用测试环境，不签发正式可用证书 |

测试成功后，去掉 `--test` 重新申请正式证书：

```bash
~/.acme.sh/acme.sh --issue --dns dns_ali \
  -d example.com \
  -d '*.example.com' \
  --keylength ec-256 \
  --dnssleep 60
```

如果成功，会看到类似输出：

```text
Your cert is in: /root/.acme.sh/example.com_ecc/example.com.cer
Your cert key is in: /root/.acme.sh/example.com_ecc/example.com.key
The intermediate CA cert is in: /root/.acme.sh/example.com_ecc/ca.cer
And the full-chain cert is in: /root/.acme.sh/example.com_ecc/fullchain.cer
```

这些是 `acme.sh` 的内部存储路径，不建议让 Nginx 直接读取这里的文件。正确做法是使用 `--install-cert` 部署到固定目录。

## 6. 部署证书到 Nginx

创建证书目录：

```bash
sudo mkdir -p /etc/nginx/ssl
sudo chmod 755 /etc/nginx/ssl
```

部署证书：

```bash
~/.acme.sh/acme.sh --install-cert -d example.com --ecc \
  --key-file       /etc/nginx/ssl/example.com.key \
  --fullchain-file /etc/nginx/ssl/example.com.crt \
  --reloadcmd      "systemctl reload nginx"
```

这里有几个关键点：

- `--install-cert` 会把证书复制到指定路径，并记录这些路径。
- `--ecc` 必须和申请证书时的 `--keylength ec-256` 对应。
- `--reloadcmd` 会在证书安装或续期成功后执行。
- 后续自动续期时，`acme.sh` 会复用这次记录的安装路径和 reload 命令。

## 7. 配置 Nginx 使用证书

示例配置：

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name example.com *.example.com;

    ssl_certificate     /etc/nginx/ssl/example.com.crt;
    ssl_certificate_key /etc/nginx/ssl/example.com.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name example.com *.example.com;
    return 301 https://$host$request_uri;
}
```

验证并重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

如果你的服务不是系统自带 Nginx，而是 OpenResty，配置文件可能在 `/usr/local/openresty/nginx/conf/`，服务名也可能是 `openresty`。这时不要使用 `systemctl reload nginx`，要改成实际可用的 reload 命令。

常见 OpenResty 命令：

```bash
sudo systemctl status openresty
sudo systemctl reload openresty
```

如果 OpenResty 没有 systemd 服务，可以使用二进制命令：

```bash
sudo /usr/local/openresty/nginx/sbin/nginx -t
sudo /usr/local/openresty/nginx/sbin/nginx -s reload
```

## 8. 理解自动续期

`acme.sh` 安装时会自动创建定时任务，每天检查证书是否需要续期。证书不会每天都重新签发，通常只有接近过期时才会续期。

查看定时任务：

```bash
crontab -l | grep acme
```

常见输出类似：

```text
15 4 * * * "/root/.acme.sh"/acme.sh --cron --home "/root/.acme.sh" > /dev/null
```

这表示每天 4:15 执行一次检查。真正续期成功后，会自动执行前面 `--install-cert` 记录的 `--reloadcmd`。

也就是说，自动续期能不能完整闭环，关键不只是证书能否签发，还包括：

- DNS API 密钥仍然有效。
- `crontab` 任务存在。
- `--install-cert` 记录的证书路径正确。
- `--reloadcmd` 在当前服务器上能成功执行。

## 9. 测试自动续期流程

查看 `acme.sh` 管理的证书：

```bash
~/.acme.sh/acme.sh --list
```

手动执行一次 cron 检查：

```bash
~/.acme.sh/acme.sh --cron --home ~/.acme.sh
```

强制续期测试：

```bash
~/.acme.sh/acme.sh --renew -d example.com --ecc --force
```

如果要确认 reload 命令是否正确，可以单独执行：

```bash
sudo systemctl reload nginx
```

OpenResty 则执行：

```bash
sudo systemctl reload openresty
```

如果发现之前把 reload 命令写错了，例如服务器实际运行的是 OpenResty，却写成了 `systemctl reload nginx`，可以重新写入部署配置：

```bash
~/.acme.sh/acme.sh --install-cert -d example.com --ecc \
  --key-file       /etc/nginx/ssl/example.com.key \
  --fullchain-file /etc/nginx/ssl/example.com.crt \
  --reloadcmd      "systemctl reload openresty"
```

如果只是想更新已记录的 reload 命令，也可以使用：

```bash
~/.acme.sh/acme.sh --reloadcmd "systemctl reload openresty" -d example.com --ecc
```

## 10. 验证线上证书

检查 HTTPS 响应：

```bash
curl -I https://example.com
```

查看证书有效期：

```bash
echo | openssl s_client -servername example.com -connect example.com:443 2>/dev/null \
  | openssl x509 -noout -dates
```

查看证书颁发者：

```bash
echo | openssl s_client -servername example.com -connect example.com:443 2>/dev/null \
  | openssl x509 -noout -issuer -subject
```

如果浏览器仍提示证书异常，优先检查：

- Nginx 配置里的 `ssl_certificate` 是否指向 `fullchain` 文件。
- `server_name` 是否包含当前访问的域名。
- 是否已经 reload 成功。
- 是否访问到了正确的服务器 IP。

## 11. 常见问题

### 11.1 `Failed to reload nginx.service: Unit nginx.service not found`

说明系统里没有名为 `nginx` 的 systemd 服务。常见原因是你安装的是 OpenResty，或者 Nginx 是手动编译安装的。

处理方法：

```bash
systemctl status openresty
```

如果服务名是 `openresty`，重新写入证书部署命令：

```bash
~/.acme.sh/acme.sh --install-cert -d example.com --ecc \
  --key-file       /etc/nginx/ssl/example.com.key \
  --fullchain-file /etc/nginx/ssl/example.com.crt \
  --reloadcmd      "systemctl reload openresty"
```

### 11.2 `InvalidTimeStamp.Expired`

这是阿里云 API 常见错误，通常是服务器时间不准。

```bash
timedatectl
sudo timedatectl set-ntp true
```

### 11.3 `Pending authorization`

通常是 DNS TXT 记录还没有生效。可以把 `--dnssleep 30` 改成 `--dnssleep 60` 或更高。

也可以手动查询 TXT 记录：

```bash
dig TXT _acme-challenge.example.com
```

### 11.4 `rateLimit exceeded`

说明短时间内失败次数过多。处理方式：

- 暂停一段时间再申请。
- 首次调试先加 `--test`。
- 确认 DNS API 密钥、域名和解析服务商都正确后再申请正式证书。

### 11.5 证书文件存在，但浏览器仍显示旧证书

常见原因是 Web 服务没有 reload 成功。

检查命令：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

OpenResty：

```bash
sudo /usr/local/openresty/nginx/sbin/nginx -t
sudo systemctl reload openresty
```

## 12. 路径速查

| 内容 | 常见路径 |
| --- | --- |
| `acme.sh` 主程序 | `~/.acme.sh/acme.sh` |
| 账号配置和 DNS 密钥 | `~/.acme.sh/account.conf` |
| ECC 证书内部目录 | `~/.acme.sh/example.com_ecc/` |
| Nginx 证书文件 | `/etc/nginx/ssl/example.com.crt` |
| Nginx 私钥文件 | `/etc/nginx/ssl/example.com.key` |
| Nginx 站点配置 | `/etc/nginx/sites-available/` |
| OpenResty 配置 | `/usr/local/openresty/nginx/conf/` |

## 13. 最小闭环检查清单

完成配置后，至少检查这几项：

- `~/.acme.sh/acme.sh --list` 能看到证书。
- `/etc/nginx/ssl/example.com.crt` 和 `/etc/nginx/ssl/example.com.key` 存在。
- Nginx 或 OpenResty 配置中的证书路径与实际路径一致。
- `crontab -l | grep acme` 能看到自动任务。
- `systemctl reload nginx` 或 `systemctl reload openresty` 能成功执行。
- `openssl` 查询到的证书有效期是新证书的有效期。

只要这几个环节都正常，后续证书续期就是无人值守流程：定时任务检查证书，到期前自动续期，续期成功后自动部署并重载 Web 服务。
