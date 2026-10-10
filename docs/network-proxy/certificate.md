# 证书申请与续期

这页只讲一件事：把 `proxy.example.com` 的证书签出来、放到固定路径、让服务端加载它，并在续期后自动生效。

## 为什么要单独写一页

代理服务的 TLS 证书不是“顺手拿个 cert 就行”。

- 证书域名要和客户端 `server` / `sni` 一致。
- 证书要放到 sing-box 或容器能读的固定目录。
- 续期后要让服务重新加载证书。
- 如果证书放错位置，客户端看起来像“节点不通”，其实是 TLS 失败。

## 安装 acme.sh

```bash
curl https://get.acme.sh | sh
```

安装后重新打开 shell，或者直接调用：

```bash
~/.acme.sh/acme.sh --version
```

acme.sh 会把脚本放在 `~/.acme.sh/`，证书也默认在这个目录下生成。但生产环境不要直接让服务端读取这个目录里的内部文件，要复制到固定路径。

## 选择签发方式

最稳妥的是 DNS-01，因为它不要求 80 或 443 空闲，也不依赖网站根目录。

| 方式 | 适合场景 |
| --- | --- |
| DNS API | 你的 DNS 服务商有 API |
| 手工 TXT | 没有 API，但能手工改 DNS |
| Webroot / Nginx / Standalone | 已经有网站入口并且愿意占用端口 |

本专题建议优先用 DNS API。只有在你的 DNS 服务商不支持 API 时，才考虑手工 TXT。

## DNS API 签发

具体插件名取决于 DNS 服务商。命令结构是：

```bash
~/.acme.sh/acme.sh --issue \
  --dns dns_<provider> \
  -d proxy.example.com \
  -d '*.proxy.example.com'
```

如果你的证书只需要单域名，就只写一条 `-d proxy.example.com`。

签发后，证书会在 acme.sh 的内部目录里生成。不要直接把那个内部目录当生产路径。

## 安装到固定路径

systemd 路线可以放到：

```bash
sudo mkdir -p /etc/sing-box/certs
```

然后安装证书：

```bash
~/.acme.sh/acme.sh --install-cert -d proxy.example.com \
  --fullchain-file /etc/sing-box/certs/fullchain.pem \
  --key-file /etc/sing-box/certs/privkey.pem \
  --reloadcmd "sudo systemctl restart sing-box"
```

如果你走 Docker Compose，把路径改成：

```bash
~/.acme.sh/acme.sh --install-cert -d proxy.example.com \
  --fullchain-file /opt/network-proxy/certs/fullchain.pem \
  --key-file /opt/network-proxy/certs/privkey.pem \
  --reloadcmd "docker compose -f /opt/network-proxy/compose.yml restart sing-box"
```

这里最重要的是 `--reloadcmd`。证书更新成功后，它会把服务重启掉，让新证书真正生效。

## 验证证书

```bash
openssl x509 -in /etc/sing-box/certs/fullchain.pem -noout -subject -issuer -dates
```

线上验证：

```bash
openssl s_client -servername proxy.example.com -connect proxy.example.com:443 </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates
```

如果证书文件已经更新，但线上还是老证书，说明服务没有重启或没读到新文件。

## 自动续期

acme.sh 会通过 cron 定期检查和续期。你只需要确认：

1. 能正常签发。
2. `--install-cert` 配好了。
3. `--reloadcmd` 写对了。

之后续期成功会自动触发服务重启。

## 手工 TXT 方式

如果 DNS 服务商没有 API，只能手工加 TXT：

```bash
~/.acme.sh/acme.sh --issue --dns -d proxy.example.com
```

它会提示你添加 `_acme-challenge` 的 TXT 记录。记录生效后，再重新执行同样命令，或者按提示续期。

## 总结

证书页的核心是三步：签发、安装、重载。只要证书域名、固定路径和 reload 命令都写对，后面的服务端和客户端就能直接复用。
