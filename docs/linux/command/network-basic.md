# 网络工具速查

先确定要回答的问题，再选命令。接口、路由、端口、TLS和业务响应是不同层次的证据；完整排查路线与本地HTTP实验见[网络请求排查](./network.md)，持久化地址、DNS和防火墙变更见[网络配置](./network-config.md)。

![网络请求从名字解析到业务验收的证据链](/linux/network-request-evidence.svg)

## 本机状态与目标路径

```bash
ip -br link
ip -br address
ip route show
ip -6 route show
ip rule show
ss -s
ss -lnt 'sport = :8080'
getent ahosts localhost
```

`ip`与`ss`属于iproute2。老环境中的`ifconfig`、`route`、`netstat`仍可能可用，但新示例优先使用iproute2；工具是否存在取决于安装的软件包，不等于内核是否支持网络。`ip route get 目标IP`检查该目标的路由选择，不能用默认路由的存在替代实际目的地址判断。

`ss -lntp 'sport = :443'`查TCP监听与可见进程，`ss -nt`查TCP连接，`ss -lun`查UDP绑定；UDP绑定不等于完成对端握手。需要关联指定进程时，`lsof -a -p 进程号 -iTCP`按AND组合筛选，`-p`与`-i`默认组合可能扩大结果。所有归属判断都要注意权限与namespace。

## 按失败现象选择探测

| 现象 | 入口与判断 |
| --- | --- |
| 应用报名字解析失败 | `getent ahosts`核对NSS路径；自带解析器另查应用配置 |
| DNS服务器结果不同 | 分别查询A、AAAA及指定服务器，比较缓存和分域配置 |
| 建连被拒绝或超时 | 核对目的地址、精确监听、路由和过滤策略，记录错误类型 |
| TLS报证书错误 | 核对URL域名、SNI、证书链、时间与信任库 |
| HTTP返回4xx/5xx | 保留状态与响应体，继续查网关、鉴权和应用日志 |
| 请求很慢 | 对齐解析、连接、首字节与总耗时，再关联系统和后端证据 |

常用模板如下，域名和目标都需替换成允许探测的实际对象：

```text
dig example.com A
dig example.com AAAA
nc -vz -w 3 api.example.com 443
curl --connect-timeout 3 --max-time 10 --fail-with-body https://api.example.com/health
curl --resolve api.example.com:443:192.0.2.10 https://api.example.com/health
```

`dig`不完整模拟hosts/NSS；`ANY`不保证列出所有记录。netcat各实现选项不同，先查`nc -h`，TCP连接成功不能代替TLS与HTTP检查。`curl --resolve`用于指定地址对照，保留域名对应的SNI与证书校验；保留地址`192.0.2.10`没有测试服务。`--fail-with-body`需curl 7.76.0及以上。

## 路径与流量工具的边界

`ping -c 4 目标`测试有限次数ICMP；被过滤或限速时，即使HTTPS正常也可能不回复。`tracepath`、`traceroute`与`mtr`用于路径线索，中间跳不回包不是业务丢包的充分证据，路径还可能不对称。

流量先看接口，再看连接，最后关联进程。`ip -s link`看接口计数，iftop、nload、nethogs分别侧重连接、接口和进程；计数增长要结合采样间隔，不能把累计字节当实时速率。iftop的`-n`与`-N`分别关闭主机名、服务名解析。抓包应限定接口、目标、时间与包数，详细示例见[网络请求排查](./network.md)。

`wget`适合下载，`curl`便于请求、响应与计时。下载成功后仍需校验发布方提供的摘要或签名，不把通过明文HTTP或netcat收到文件视为完整性验证。登录与文件传输优先使用SSH、SFTP或SCP等已建立信任的加密通道；首次连接核对主机密钥，避免为消除告警直接关闭校验。

## 操作前保留回退入口

只读探测与网络修改应分开。远程登录时不要用清空防火墙、删除默认路由、关闭当前接口来试错。确认配置管理者，备份持久配置，准备控制台与回退办法，再按[网络配置](./network-config.md)做单项变更；最后从新的连接验证SSH与业务均可用。
