# 服务端部署（systemd）

这条路线在 Linux 宿主机直接运行 sing-box，由 systemd 管理进程。示例使用 Trojan 加 TLS，公网 TCP 443 进入该进程，认证通过后由主机出口连接目标。已有 Nginx 占用 443 时，先选择独立端口验证，不能把两套服务同时绑定到同一地址和端口。

## 进程与文件边界

![systemd代理部署的进程文件与网络边界](/network-proxy/systemd-deployment.svg)

unit 决定实际执行的程序、参数和身份，配置文件只描述代理服务本身。把 JSON 放到 `/etc/sing-box/` 但 unit 读取另一目录，重启多少次都不会应用这份配置。先检查 unit，再确定目录和检查命令。

## 安装并核对 unit

从官方安装入口下载脚本，审阅后安装选定版本。下面是 Debian/RPM 等受脚本支持的系统示例，不适用于没有 systemd 的容器或发行版。

```bash
curl -fL https://sing-box.app/install.sh -o /tmp/sing-box-install.sh
less /tmp/sing-box-install.sh
SING_BOX_VERSION='替换为选定的发行版本号'
sudo sh /tmp/sing-box-install.sh --version "$SING_BOX_VERSION"
sing-box version
systemctl cat sing-box
systemctl show sing-box -p User -p Group -p ExecStart -p WorkingDirectory
sudo ss -lntp '( sport = :443 )'
```

记录版本、`ExecStart`、`User`、`Group` 和 drop-in 覆盖。系统级服务未指定 `User` 时通常以 root 运行，但仍要核对 unit 的限制、权限和实际进程。本文后续假设程序为 `/usr/bin/sing-box`，参数读取 `-D /var/lib/sing-box -C /etc/sing-box`；不一致时按本机 unit 调整，不要同时保留两套冲突的路径。

## 目录与证书权限

```bash
sudo install -d -m 700 /etc/sing-box /etc/sing-box/certs
sudo install -d -m 750 /var/lib/sing-box
sudo install -d -m 700 /opt/network-proxy/backup
```

| 路径 | 职责 |
| --- | --- |
| `/etc/sing-box/config.json` | 带账号凭据的运行配置，root 管理 |
| `/etc/sing-box/certs/` | 安装后的证书与私钥 |
| `/var/lib/sing-box/` | 程序工作目录，有状态功能按需写入 |
| `/opt/network-proxy/backup/` | 受限访问的配置备份 |

按 [证书申请与续期](./certificate.md) 安装证书。以上 `700` 目录适用于 root 读取。若 unit 使用专用用户，要让该服务组能遍历配置目录和读取配置、私钥，同时只给确实需要写入的工作目录写权限。用 `namei -l /etc/sing-box/certs/privkey.pem` 逐级看父目录，再以服务身份验证读取；主机上的 sudo 检查通过，不能证明受限 unit 一定能访问。

## 最小服务配置

编辑 `/etc/sing-box/config.json`，替换域名和密码。密码应单独随机生成；每个使用者独立凭据，不把下面的占位值投入使用。

```json
{
  "log": { "level": "info", "timestamp": true },
  "inbounds": [{
    "type": "trojan",
    "tag": "trojan-in",
    "listen": "0.0.0.0",
    "listen_port": 443,
    "users": [{ "name": "user01", "password": "REPLACE_WITH_RANDOM_PASSWORD" }],
    "tls": {
      "enabled": true,
      "server_name": "proxy.example.com",
      "certificate_path": "/etc/sing-box/certs/fullchain.pem",
      "key_path": "/etc/sing-box/certs/privkey.pem"
    }
  }],
  "outbounds": [{ "type": "direct", "tag": "direct" }],
  "route": { "final": "direct" }
}
```

这里的 `direct` 是远端主机访问目标的出口，不是客户端直连。示例仅监听 IPv4；需要 IPv6 时须一起核对监听地址、DNS AAAA、安全组和出口能力。TCP 443 放行只允许连接进入，还应评估远端可访问的目标范围，避免账号滥用访问不应开放的内网资源。

## 检查、启动与验收

```bash
sudo /usr/bin/sing-box check -D /var/lib/sing-box -C /etc/sing-box
sudo systemctl enable --now sing-box
sudo systemctl status sing-box --no-pager
sudo journalctl -u sing-box --since '-10 min' --no-pager
sudo ss -lntp '( sport = :443 )'
```

先确认检查命令成功，再执行启动。`check` 可以发现配置语法与部分初始化错误，不能证明端口可绑定、公网可达、凭据有效或目标访问成功。`daemon-reload` 只在 unit 或 drop-in 变化后需要，单改 JSON 不需要。

从客户端所在网络检查 TLS 名称与信任：

```bash
openssl s_client -connect proxy.example.com:443 \
  -servername proxy.example.com -verify_hostname proxy.example.com \
  -verify_return_error </dev/null
```

然后使用 [客户端页](./clash-verge.md) 的最小配置，经本机显式代理访问可控目标，核对命中节点、远端认证与最终响应，再用错误密码确认新连接被拒绝。最后重启服务，重新验证证书加载和业务访问。不能用 TLS 握手或进程 `active` 单独替代这些步骤。

## 修改配置与恢复

账号新增、轮换、停用和备份权限统一见 [用户管理](./user-management.md)。常规变更先留存已知可用配置，再编辑、检查、重启并重复业务验收：

```bash
sudo /usr/bin/sing-box check -D /var/lib/sing-box -C /etc/sing-box
# 上一步成功后执行
sudo systemctl restart sing-box
sudo systemctl status sing-box --no-pager
sudo journalctl -u sing-box --since '-5 min' --no-pager
```

如果检查通过而启动失败，按日志区分端口占用、目录权限、unit 沙箱限制和证书读取错误；不要只修改 JSON 字段。新版本出现不兼容时，恢复对应版本和兼容配置再验收；恢复备份不得重新启用已经泄漏或撤销的凭据。证书续期的加载命令应在这条部署链路稳定后登记。
