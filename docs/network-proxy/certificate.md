# 证书申请与续期

证书链路包含四件事：证明域名控制权、签发证书、安装到服务可读的位置、让正在运行的服务加载新证书。客户端连接的地址可以是 IP，但用于 TLS 名称校验的 `sni` 必须与证书覆盖的名称匹配，不能靠关闭验证解决不一致。

## 签发与加载的边界

![证书签发安装与服务加载闭环](/network-proxy/certificate-lifecycle.svg)

例如证书已经续期，但客户端仍看到旧的到期时间：先比较安装路径的证书和线上实际返回的证书，再检查加载动作。反复签发不会修复错误的挂载路径，也不会让未重启的进程自动使用新文件。

本页以 Linux 主机上由 root 管理 acme.sh、安装目录和续期任务为例。root 负责写证书，服务进程只需读取。若已有非 root 的证书管理体系，应沿用它并配置受控安装权限，不要再建一套重复续期任务。证书与私钥都不放进 Git、订阅或客户端下载文件。

## 安装与签发账户

从 acme.sh 官方仓库选择一个已审查的 release，在专用目录检出并审阅安装脚本后执行。下面的版本变量必须替换成选定的标签；安装需要 `curl`、`openssl`、`cron` 等环境依赖。

```bash
ACME_RELEASE='替换为选定的release标签'
git clone --branch "$ACME_RELEASE" --depth 1 \
  https://github.com/acmesh-official/acme.sh.git acme-sh-src
cd acme-sh-src
less acme.sh
sudo -H ./acme.sh --install -m admin@example.com
sudo /root/.acme.sh/acme.sh --version
```

本页显式选择 Let's Encrypt，避免把安装时的默认 CA 当成固定合同。邮箱替换为可接收续期通知的地址，账户目录 `/root/.acme.sh/` 同样包含敏感材料。

```bash
sudo /root/.acme.sh/acme.sh --register-account \
  --server letsencrypt -m admin@example.com
```

## 选择域名验证方式

DNS-01 不要求开放 80 端口，适合不运行网站入口的代理服务，但依赖 DNS 的控制权和正确的权威记录。HTTP-01 则需要 CA 能通过公网 HTTP 到达挑战文件；Standalone 会临时监听端口，不能与已有服务争用。

| 方式 | 输入与边界 | 续期方式 |
| --- | --- | --- |
| DNS API | 插件名、DNS API 凭据、对应域名的写权限 | 可自动续期，凭据必须持续有效 |
| 手工 DNS TXT | 每次挑战时人工添加指定记录 | 每次续期都要人工参与 |
| Webroot / HTTP Standalone | 公网 80 可达，文件路径或临时监听正确 | 需要持续保留验证入口 |

下面用 DNS API。先按 DNS 服务商的插件合同，在 root 的受控会话中配置该插件要求的环境变量；每家变量名不同，不能只替换插件名而遗漏凭据。优先使用仅可修改所需区域 TXT 记录的权限，并核对插件会保存哪些变量。不要把真实 token 放进命令历史、工单或代码块。

```bash
DNS_PLUGIN='替换为服务商插件名'
sudo --preserve-env /root/.acme.sh/acme.sh --issue \
  --server letsencrypt --dns "$DNS_PLUGIN" \
  --keylength ec-256 -d proxy.example.com
```

这里假设管理员已在当前会话导出插件要求的变量，且 sudo 策略允许保留；更严格的环境可在 root 专用会话设置它们。不要为执行此命令全局放宽 sudo 环境策略。只需单域名就不申请通配符；确需通配符时，额外增加 `-d '*.proxy.example.com'`，并验证每条挑战记录。

## 安装到服务路径

acme.sh 内部证书目录由工具维护，服务应读取 `--install-cert` 管理的固定路径。先根据部署路线选一个目标，以下命令不要两组同时执行。

```bash
# systemd 路线
CERT_DIR=/etc/sing-box/certs
# Docker 路线则改成 /opt/network-proxy/certs
sudo install -d -m 700 "$CERT_DIR"
sudo touch "$CERT_DIR/fullchain.pem" "$CERT_DIR/privkey.pem"
sudo chmod 600 "$CERT_DIR/fullchain.pem" "$CERT_DIR/privkey.pem"
sudo /root/.acme.sh/acme.sh --install-cert --ecc -d proxy.example.com \
  --fullchain-file "$CERT_DIR/fullchain.pem" \
  --key-file "$CERT_DIR/privkey.pem"
```

这是首次安装，尚不触发服务重启。预创建文件的所有者和权限会被 acme.sh 保留；已有文件不要截断。这里的 root 私钥 `600` 仅适用于实际读取者也是 root 的部署。若服务以专用用户运行，应让私钥属于 `root:服务组`、文件 `640`、父目录允许该组进入，并逐级核对路径；不要直接把私钥改为所有人可读。

## 注册加载动作

先完成 [systemd 部署](./server-systemd.md) 或 [Docker 部署](./server-docker.md)，确认配置和业务验收通过，再重新执行安装命令登记加载动作。以下是 systemd 示例，检查失败时不会继续重启：

```bash
sudo /root/.acme.sh/acme.sh --install-cert --ecc -d proxy.example.com \
  --fullchain-file /etc/sing-box/certs/fullchain.pem \
  --key-file /etc/sing-box/certs/privkey.pem \
  --reloadcmd '/usr/bin/sing-box check -D /var/lib/sing-box -C /etc/sing-box && /usr/bin/systemctl restart sing-box'
```

`sing-box` 的路径和参数必须与本机实际 unit 一致，先用 `command -v sing-box`、`systemctl cat sing-box` 确认。Docker 路线使用绝对路径，先临时容器检查再重启现有容器：

```bash
sudo /root/.acme.sh/acme.sh --install-cert --ecc -d proxy.example.com \
  --fullchain-file /opt/network-proxy/certs/fullchain.pem \
  --key-file /opt/network-proxy/certs/privkey.pem \
  --reloadcmd '/usr/bin/docker compose -f /opt/network-proxy/compose.yml run --rm sing-box -D /var/lib/sing-box -C /etc/sing-box check && /usr/bin/docker compose -f /opt/network-proxy/compose.yml restart sing-box'
```

root 的 cron 必须能找到 Docker CLI 和 Compose 插件；先核对 `/usr/bin/docker` 是否为实际路径。在 root 身份下手动执行一次相同的检查与重启链，确认不依赖交互 sudo、当前工作目录或个人 shell 环境。重启可能中断已有连接，需结合业务重试和维护窗口安排。

## 验证文件、信任与线上加载

```bash
sudo openssl x509 -in /etc/sing-box/certs/fullchain.pem \
  -noout -subject -issuer -dates -fingerprint -sha256
openssl s_client -connect proxy.example.com:443 \
  -servername proxy.example.com -verify_hostname proxy.example.com \
  -verify_return_error -showcerts </dev/null
```

Docker 路线将本地路径换成 `/opt/network-proxy/certs/fullchain.pem`。OpenSSL 需支持这些选项并具有正确的信任库；如果系统未配置 CA，先修复信任库。不要隐藏 stderr，也不要用仅输出 `x509 -dates` 的管道充当信任验证。确认握手验证成功后，再比较线上叶证书的序列号、指纹和到期时间与安装文件是否一致；TLS 成功仍需另验代理认证和目标访问。

## 续期与故障恢复

```bash
sudo crontab -l
sudo /root/.acme.sh/acme.sh --info --ecc -d proxy.example.com
```

安装器通常登记每日检查任务，但仍要核对 root crontab、cron 服务是否运行、下一次续期时间和失败通知。自动检查不等于每次都会签发，续期时间还受证书和 CA 策略影响。续期成功但加载失败时，应保留日志，修复权限、挂载或加载命令，再安装并加载已经签出的证书；不要连续强制签发触发 CA 限流。

手工 DNS 模式不具备无人值守续期能力。首次请求获得 TXT 值后，添加到指定权威记录，再以 `--renew` 继续；后续续期也要重新处理挑战：

```bash
sudo /root/.acme.sh/acme.sh --issue --server letsencrypt \
  --dns --keylength ec-256 -d proxy.example.com \
  --yes-I-know-dns-manual-mode-enough-go-ahead-please
# 添加本次提示的TXT记录，确认传播后继续
sudo /root/.acme.sh/acme.sh --renew --ecc -d proxy.example.com \
  --yes-I-know-dns-manual-mode-enough-go-ahead-please
```

证书已过期、私钥泄漏和加载失败是不同事件。加载失败可以恢复正确路径与可用证书；私钥泄漏应更换密钥、重新签发并按 CA 流程撤销旧证书，不能把旧私钥当作普通回滚材料继续使用。
