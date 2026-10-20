# Nginx 证书续期与生效验证

订单域名的证书即使已经签发，用户仍可能看到旧证书：文件没有复制到Nginx读取位置、定时账户无权reload，或者公网TLS实际终止在CDN。Nginx负责加载证书，ACME客户端负责申请和续期，DNS平台负责域名校验；三者的成功信号需要分别检查。

![ACME校验、证书部署、Nginx加载与公网握手的续期闭环](/nginx/cert-renewal-flow.svg)

下面以`acme.sh`、DNS-01和Let's Encrypt为模板，域名与路径均需替换。签发会联系真实CA和DNS API，不是本地无副作用实验。先在独立测试目录验证，再建立正式定时任务；正式证书不会因为删掉一个`--staging`参数就自然拥有正确部署链。

## 固定客户端、CA与执行身份

从官方发布或可信软件分发流程安装客户端，记录版本与来源；不要让文档中的下载管道自动替你执行未审查脚本。直接用实际脚本绝对路径，避免cron依赖交互shell的alias或`source ~/.bashrc`。客户端更新也应受控验证。

明确选择CA，不依赖客户端默认值。此处测试端点为`https://acme-staging-v02.api.letsencrypt.org/directory`，正式端点为`https://acme-v02.api.letsencrypt.org/directory`。测试与正式账户、证书状态分开；测试CA签出的证书不受普通浏览器信任，不能装到正式入口。

DNS API凭据交给专用身份，权限限定到所需域名/区域和记录操作，不用主账号密钥。`dns_ali`使用`Ali_Key`、`Ali_Secret`等插件约定；凭据可能被持久化到客户端账户或域名配置，需限制目录权限并纳入秘密管理，不写进命令历史、仓库、截图或公共日志。DNS-01支持泛域名，`*.example.com`不覆盖裸域`example.com`，也不覆盖更深层`a.b.example.com`。

## 测试签发和正式签发分开

以下是已安装客户端、已按插件配置凭据后的Bash操作模板。测试home、配置和证书目录均独立；示例显式选择ECC，后续部署使用对应`--ecc`证书。先核对本机`--help`，并按CA要求完成账户注册及条款确认。

```text
~/.acme.sh/acme.sh --issue \
  --home ~/.acme-staging \
  --config-home ~/.acme-staging \
  --cert-home ~/.acme-staging/certs \
  --server https://acme-staging-v02.api.letsencrypt.org/directory \
  --dns dns_ali --keylength ec-256 \
  -d example.com -d '*.example.com'
```

确认TXT写入和清理、权威DNS可见性、客户端返回状态后，再在正式home签发：

```text
~/.acme.sh/acme.sh --issue \
  --home ~/.acme.sh \
  --server https://acme-v02.api.letsencrypt.org/directory \
  --dns dns_ali --keylength ec-256 \
  -d example.com -d '*.example.com'
```

两套配置都需要正确获取凭据；测试成功不意味着正式home已有账户或插件状态。DNS传播应查权威服务器，不能只看本机缓存。多个域名并行签发可能共享挑战名称，不能粗暴清空其他任务的TXT记录。时钟、代理、DNS API和CA访问各自可能失败，保留具体阶段再重试。

## 证书部署路径与reload属于另一段合同

不要让Nginx引用`~/.acme.sh/`的内部文件。用`--install-cert`把证书与私钥复制到固定目录，预建目标文件并设置所有者与权限：私钥仅对必要身份可读，目录允许对应进程遍历。客户端是否有复制权限、Nginx master是否能读，按实际systemd、容器或普通用户运行方式确定。

```text
~/.acme.sh/acme.sh --install-cert --ecc -d example.com \
  --home ~/.acme.sh \
  --key-file /etc/nginx/ssl/example.com.key \
  --fullchain-file /etc/nginx/ssl/example.com.crt \
  --reloadcmd '/usr/local/sbin/reload-order-nginx'
```

客户端会记住安装位置和reload命令，续期后再次执行。hook应由管理员控制并固定真实二进制、主配置和服务名，先配置测试再reload；例如以拥有对应权限的身份执行以下脚本内容：

```sh
#!/bin/sh
set -eu
/usr/sbin/nginx -t -c /etc/nginx/nginx.conf
/usr/bin/systemctl reload nginx.service
```

这里的路径和unit只是常见发行包示例；OpenResty、手工编译或容器要替换为实际控制入口。定时任务不能等待交互sudo密码，不为方便给任意脚本无范围的管理权限。复制成功但hook失败时，磁盘可能已是新证书、运行进程仍用旧证书；应告警、修复并重新验收，不能仅凭文件日期宣称生效。

## 配置指向fullchain与对应私钥

```nginx
server {
    listen 443 ssl;
    server_name example.com;
    ssl_certificate /etc/nginx/ssl/example.com.crt;
    ssl_certificate_key /etc/nginx/ssl/example.com.key;

    location / {
        proxy_pass http://127.0.0.1:8080;
    }
}
```

此模板先用HTTPS基础监听，避免把HTTP/2语法与证书续期混在一起。需要HTTP/2时，Nginx 1.25.1起可使用`http2 on;`并要求对应模块；更旧安装通常使用`listen ... http2`形式，必须按版本验证。fullchain含站点证书及需要发送的中间链，私钥必须与站点证书匹配。

`nginx -t`通过后重载，再用新TLS连接验收。尚未过期的旧证书也可能让请求成功，所以必须同时比较证书指纹与有效期。

## 定时执行与公网验收

安装流程可能为安装用户创建cron，也可能由运维统一改用systemd timer。确认实际执行用户、绝对路径、home、环境、日志与退出状态，而不是只确认当前shell的`crontab -l`有一行。定时调用通常是`acme.sh --cron --home 实际目录`，客户端判断是否需要续期；别用频繁的`--force`测试生产签发，它会产生真实申请并可能触发频率限制。

本地查看已部署证书：

```text
openssl x509 -in /etc/nginx/ssl/example.com.crt \
  -noout -subject -issuer -dates -fingerprint -sha256
```

在Bash中取一次**新连接**的线上叶证书，保留握手错误与验证失败，不把`2>/dev/null`当验收方式：

```text
set -o pipefail
openssl s_client -connect example.com:443 -servername example.com \
  -verify_hostname example.com -verify_return_error </dev/null \
  | openssl x509 -noout -subject -issuer -dates -fingerprint -sha256
```

需要本机可信CA库正确、TLS端点可达，并检查整条管道退出状态。SNI与主机名验证都保留，不能只比较日期或只看`openssl x509`最后一段成功。多IP、多副本或RSA/ECC双证书部署需覆盖实际端点和证书选择；有CDN时公网看到的是CDN证书，源站要另用正确SNI连接源站地址检查，不能要求两层指纹必然相同。

续期监控应同时覆盖最近任务是否成功、部署hook是否成功，以及各TLS终止层的到期余量。不要把固定“90天证书、某一天续期”写死为永远成立的合同；有效期和建议续期窗口跟随CA与客户端策略。失败先区分DNS授权、签发、复制、配置检查、reload和公网连接六段，再修对应问题；保留上一次可用证书、配置与恢复方法。
