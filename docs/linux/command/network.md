# 网络请求排查

订单服务调用支付接口超时，可能卡在解析、路由、连接、TLS、HTTP，也可能是请求已到达但业务处理过慢。先记录发生请求的进程、网络命名空间、目标域名、端口、时间和错误，再沿请求链查证。工具选项见[网络速查](./network-basic.md)，需要修改配置时看[网络配置](./network-config.md)。

![一次HTTPS请求的证据边界](/linux/network-request-evidence.svg)

## 先还原应用真正访问的路径

`curl`、浏览器和订单服务可能使用不同代理、解析器、证书库与地址族。宿主机能访问，不证明容器内也能访问；交互shell能访问，也不证明systemd服务继承了相同环境。先核对应用配置、代理变量、容器网络、服务身份及实际目的地址，再选择同一环境中的诊断入口。

IP地址属于特定网络范围内的接口或服务寻址信息，不是设备永久唯一身份。一个接口可以有多个地址，同一私有地址也能出现在不同网络中。容器的回环地址只指向该网络命名空间本身；容器里访问`127.0.0.1`不会自动到达宿主机。

```bash
ip -br link
ip -br address
ip route show
ip -6 route show
```

这些是当前运行状态。接口显示UP不等于有正确地址或默认路由，存在默认路由也不证明对端可达。策略路由还需要结合`ip rule show`及相应路由表。排查指定目的地址时用`ip route get 192.0.2.10`查看内核选出的出口、源地址和下一跳；这里的地址是文档保留地址，只用于说明查询方式，不是可连接的测试服务。

## 名字解析：应用视角与DNS查询分开

Linux上的许多应用通过libc与NSS获取地址，可能经过`/etc/hosts`、DNS、systemd-resolved或其他模块；`/etc/nsswitch.conf`决定相关顺序。`getent ahosts 域名`更接近这类应用的查询入口，但使用自带解析器、DoH或缓存的应用仍可能不同。

```bash
getent ahosts localhost
cat /etc/nsswitch.conf
ls -l /etc/resolv.conf
```

`dig example.com A`和`dig example.com AAAA`分别查询指定DNS记录，`dig @服务器 域名 A`用于对比某个解析服务器。它们不会完整模拟NSS与应用缓存。`dig ANY`也不保证返回全部记录，`dig +trace`追踪DNS委派过程，不等同于企业内网的分域解析路径。

例如办公室电脑得到私网地址，容器却得到公网地址，应先比较解析器、搜索域和分域配置，而不是立刻把域名固定进hosts。临时验证某个地址上的HTTPS服务可用`curl --resolve`，它保留URL域名对应的Host、SNI和证书校验；验证结束后仍要修复正式解析链。

## 路由与连接：探测失败不只有“端口关闭”

`ping`测试ICMP响应，可能被防火墙或限速策略丢弃；失败不能单独证明HTTPS不可达。`traceroute`、`tracepath`和`mtr`的中间跳也可能不回复探测包。中间节点丢包而后续和终点正常时，不能直接认定该节点丢弃业务流量；要结合终点、协议及持续测量。

TCP连接失败需要区分立即拒绝、超时、无路由等现象。`nc -vz -w 3 主机 443`只测试TCP建连，不能验证TLS、HTTP鉴权或支付成功。不同netcat实现的`-z`、`-w`和监听语法有差异，先看本机`nc -h`。UDP没有TCP式握手，UDP探测没有回应也不能直接判端口开放或关闭。

服务端检查监听时精确筛选，避免`grep :80`混入8080：

```bash
ss -lntp 'sport = :8080'
ss -s
```

监听在`127.0.0.1:8080`通常只供本命名空间本地访问，`0.0.0.0`与`[::]`的实际接收范围还受地址族设置、防火墙和网络边界影响。`ss -p`受权限限制，未显示进程不代表没有进程。`lsof -a -p 进程号 -iTCP`才是进程与TCP条件取交集；省略`-a`时多个筛选条件可能按OR组合。

## TLS与HTTP：以真实方法、域名和响应验收

TLS失败应核对域名、SNI、证书链、主机时间和客户端信任库。不要用`curl -k`作为修复；它跳过证书验证，不能证明正式客户端可用。用IP替换URL里的域名还会改变SNI与证书匹配，容易把正确服务测成错误。

下面是只读GET的诊断模板，替换成已授权的真实服务与只读路径后使用：

```text
curl --connect-timeout 3 --max-time 10 --fail-with-body \
  --output /tmp/order-health.json \
  --write-out 'ip=%{remote_ip} http=%{http_code} dns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} first=%{time_starttransfer} total=%{time_total}\n' \
  https://api.example.com/health
```

时间字段多数是从请求开始累计：`time_connect`不是纯TCP耗时，`time_starttransfer`也不是纯服务计算时间。代理、重定向与连接复用会影响解释。`--fail-with-body`需要curl 7.76.0及以上，对HTTP错误返回失败状态并保留响应体；旧版本先检查版本，再显式判断状态码。不要依赖“curl退出0”推断HTTP业务成功。

`curl -I`发送HEAD，某些服务对HEAD与GET实现不同。GET `/health`成功只证明该入口响应；支付请求还要检查鉴权、业务字段、订单状态、幂等键和对账结果。不要对有写入副作用的接口反复“重试探测”。开启`-v`或抓包前考虑请求头、Cookie、URL与响应中的秘密，分享日志时只保留定位所需字段。

## 本地实验：连接成功与HTTP成功是两回事

以下Bash实验依赖Python 3、curl和iproute2，在当前环境的回环地址上启动临时文件服务器。若8080已被占用，改用空闲端口；不对已有监听进程执行终止操作。

```bash
blog_net_dir=$(mktemp -d)
printf '{"status":"ready"}\n' > "$blog_net_dir/health.json"
python3 -m http.server 8080 --bind 127.0.0.1 \
  --directory "$blog_net_dir" > "$blog_net_dir/server.log" 2>&1 &
blog_net_pid=$!
trap 'kill "$blog_net_pid" 2>/dev/null || true; wait "$blog_net_pid" 2>/dev/null || true; rm -rf -- "$blog_net_dir"' EXIT
blog_net_ready=0
for blog_attempt in 1 2 3 4 5; do
  if curl --noproxy '*' --silent --fail http://127.0.0.1:8080/health.json; then
    blog_net_ready=1
    break
  fi
  sleep 0.2
done
test "$blog_net_ready" -eq 1
kill -0 "$blog_net_pid"
ss -lnt 'sport = :8080'
curl --noproxy '*' --silent --output /dev/null \
  --write-out 'missing_http=%{http_code}\n' http://127.0.0.1:8080/missing
if curl --noproxy '*' --silent --fail --output /dev/null \
  http://127.0.0.1:8080/missing; then
  printf 'unexpected_success\n'
else
  printf 'curl_exit=%s\n' "$?"
fi
```

能看到监听、健康文件内容、`missing_http=404`和`curl_exit=22`。404时TCP已连接、HTTP服务器已回复，但请求资源不存在；只测端口会漏掉这一差别。此实验没有TLS、代理、跨主机防火墙或真实业务，不能代替这些环节的验证。

## 抓包与性能：围绕一个假设取证

需要确认请求是否离开客户端、是否收到回复时，可在正确接口与命名空间中做有限抓包，例如`tcpdump -ni 接口 -c 50 'host 目标IP and tcp port 443'`。HTTPS载荷通常加密，抓到握手和数据包不代表看到了业务结果。抓包受权限、隐私、存储和运行开销限制，先限定目标、包数和时间；不要无限抓取全网流量。

`iftop`看连接流量，`nload`看接口吞吐，`nethogs`尝试按进程归属流量；它们的统计范围和权限不同。iftop的`-n`禁止主机名解析、`-N`禁止端口服务名解析，后者不是“隐藏端口”。高吞吐不自动是瓶颈，低吞吐也可能是在等待后端。

订单调用从2秒变成20秒时，先比较相同窗口的解析、建连、首字节与总时间，再和服务日志、重传、CPU限流、连接池排队一起判断。只调整有证据支持的一项，随后用相同输入复验延迟、错误率和订单结果；系统采样方法见[系统监控](./system-monitoring.md)。
