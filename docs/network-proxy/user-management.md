# 用户管理与常用变更

这里的用户是 Trojan 入站 `users` 中的凭据项，与 Linux 账号、Docker 用户无关。`name` 是识别标签，真正参与认证的是 `password`。只改名字不会撤销密码；只改服务端而不更新客户端，会使客户端继续用旧凭据连接。

## 计划轮换与紧急撤销

![代理账号计划轮换与泄漏撤销两条路径](/network-proxy/credential-change.svg)

例如计划给开发机换密码，可以短时间同时保留 `user01-old` 与 `user01-new`，让客户端迁移后删除旧项。若旧密码已经泄漏，应先撤销旧项并验证失效，再向受影响使用者发放新凭据；这时的目标是阻止继续使用旧密码，不能等待“所有客户端都迁完”。

## 变更输入与备份

| 部署方式 | 主配置位置 | 生效进程 |
| --- | --- | --- |
| systemd | `/etc/sing-box/config.json` | 本机 unit 指定的 sing-box |
| Docker | `/opt/network-proxy/config/config.json` | Compose 管理的 sing-box 容器 |

先核对实际运行参数与挂载，不能根据文件名推断服务一定读取它。备份与原配置一样包含密码，须放在受限目录；不要复制到订阅发布目录或公开对象存储。

```bash
sudo install -d -m 700 /opt/network-proxy/backup
PROXY_BACKUP="/opt/network-proxy/backup/config.json.$(date +%Y%m%d%H%M%S)"
# systemd 路线；Docker 路线改为 /opt/network-proxy/config/config.json
sudo install -m 600 /etc/sing-box/config.json "$PROXY_BACKUP"
openssl rand -base64 24
```

最后一行会在当前终端输出新密码，只在受控会话执行并存入密码管理器；不要录屏、重定向到公共日志或粘贴进 Git。需要服务组读取配置时，应用文件也要按服务身份设置属组与最小读取权限。

## 新增与同步

在目标入站的 `users` 数组追加一项，注意数组逗号。下面是单项示例，不是完整配置：

```json
{
  "name": "user02",
  "password": "REPLACE_WITH_UNIQUE_RANDOM_PASSWORD"
}
```

多个设备分别使用独立凭据，便于单独撤销。不要把真实人员姓名或设备资产编号写进对外示例。检查配置后应用变更，两种部署方式选一组执行：

```bash
# systemd：参数需与实际 unit 一致
sudo sing-box check -D /var/lib/sing-box -C /etc/sing-box
# 检查成功后执行
sudo systemctl restart sing-box
sudo systemctl status sing-box --no-pager
sudo journalctl -u sing-box --since '-5 min' --no-pager
```

```bash
# Docker：临时容器不发布端口，不能用它排除端口冲突
sudo docker compose -f /opt/network-proxy/compose.yml run --rm sing-box \
  -D /var/lib/sing-box -C /etc/sing-box check
# 检查成功后执行
sudo docker compose -f /opt/network-proxy/compose.yml restart sing-box
sudo docker compose -f /opt/network-proxy/compose.yml logs --tail=100 sing-box
```

检查可以发现 JSON、字段及部分初始化问题；还要在启动日志中检查权限和监听错误。只有 JSON 或挂载证书变化时，重启现有进程才是这里的应用方式；镜像、端口或环境变量变化应按 [Docker 部署](./server-docker.md#变更与回滚) 重建。

随后在客户端修改对应节点密码、重载本地文件或更新订阅，再实际选择该节点发起一条新连接。先确认新凭据能访问可控目标，再检查另一使用者的节点仍正常。订阅更新成功只证明配置被获取，不证明运行内核已经切换。

## 计划轮换的收尾

计划轮换可以先新增替代项，保留一个有截止时间的迁移窗口。验证新密码后删除旧项，重新检查、应用，并从独立测试配置用旧密码发起新连接，确认认证失败。仅观察“最近没有旧用户日志”不能证明旧凭据已失效。

长期连接是否继续存活取决于加载方式和实现。本文使用进程重启，会中断该进程承载的连接；实际有多节点、多副本或热加载时，必须确认每个副本都移除旧凭据，并另验已有连接的撤销要求。不要假定配置一改就完成全局撤销。

## 凭据泄漏与停用

泄漏时先删除或替换旧密码并应用到所有入口，确认旧密码无法建立新连接，必要时终止仍存活的旧连接。订阅 URL token 泄漏还需撤销分发入口，并轮换其暴露过的节点密码：删除 URL 本身无法收回已经下载的配置。

认证失败日志只能说明某次认证未通过，通常不足以可靠识别使用旧密码的具体客户端。应结合受控客户端的测试时间与连接信息排查，不靠日志里的失败次数认定“哪些人仍在使用”。正常停用同样需要撤销验证，不只是删掉订阅页面上的节点名称。

## 恢复与验收

普通配置错误可以恢复已知可用文件，但恢复前必须排除已撤销、已泄漏的密码。选择正确备份后先比较配置差异，不把包含密码的完整 JSON 输出到共享终端；确认后再覆盖、检查和应用。

```bash
PROXY_BACKUP='/opt/network-proxy/backup/config.json.替换为选定时间戳'
sudo test -f "$PROXY_BACKUP"
# 确认该版本不会恢复已泄漏的凭据后，systemd路线执行
sudo install -m 600 "$PROXY_BACKUP" /etc/sing-box/config.json
sudo sing-box check -D /var/lib/sing-box -C /etc/sing-box
```

上面只演示 root 读取的 systemd 路线；专用用户需保持相应属组，Docker 路线替换为挂载源文件，再执行对应检查。检查成功后按前述方式重启，最后完成三项验收：新凭据访问成功、撤销凭据的新连接失败、其他有效凭据不受影响。备份应有保留周期和受限恢复入口，避免长期积累旧密码。
