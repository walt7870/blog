---
title: 握手完成还要排队：accept 队列
author: Walt
date: 2026-10-26
---

# 握手完成还要排队：accept 队列

[上一篇](./04-cpu-event-loop.md)讲了连接建好以后怎么被及时处理。这一篇往前看一步：连接在交给应用之前，要先在内核里排队。这道关卡的表现很迷惑，客户端偶尔建连超时，服务器的 CPU、内存和连接数却都不高。读完后，你应该能用两条命令判断是不是队列溢出，并知道该调哪两个参数。

[第 02 篇](./02-file-descriptors.md)的实验里已经见过这个队列：fd 用完后，40 条连接停在监听 Socket 的 `Recv-Q` 里。这一篇专门看它满了会怎样。

## 两段队列

服务端调用 `listen()` 之后，内核就开始替它完成三次握手。一条新连接要经过两段排队：

![握手的两段排队：SYN 队列和 accept 队列](/protocol/capacity/accept-queue.svg)

- **SYN 队列。** 收到客户端的 SYN、回了 SYN+ACK，正在等第三次握手的连接，也叫半连接。长度和 `net.ipv4.tcp_max_syn_backlog` 有关。
- **accept 队列。** 三次握手已经完成，等应用调用 `accept()` 取走的连接。长度取应用传给 `listen()` 的 `backlog` 与 `net.core.somaxconn` 中较小的那个。

应用取得快，accept 队列几乎总是空的。应用来不及取，比如事件循环被一个慢操作卡住、所有工作线程都在忙，或者像第 02 篇那样 fd 用完了，连接就在这里堆积。队列满了以后，内核默认的做法是直接丢掉新来的 SYN，不回任何报文。

## 把队列设成 4，看第 6 个客户端遇到什么

下面的实验让服务端以 `backlog=4` 监听，但永远不调用 `accept()`，然后依次来 12 个客户端，每个最多等 2 秒。保存为 `backlog.py`：

```python
import socket, subprocess, time

def overflows():
    rows = [l.split() for l in open("/proc/net/netstat") if l.startswith("TcpExt:")]
    return int(rows[1][rows[0].index("ListenOverflows")])

srv = socket.create_server(("127.0.0.1", 9000), backlog=4)   # 永远不调用 accept()
before = overflows()
for i in range(1, 13):
    c = socket.socket()
    c.settimeout(2)
    t = time.monotonic()
    try:
        c.connect(("127.0.0.1", 9000))
        print(f"客户端 {i:2d}：连接成功")
    except OSError as e:
        print(f"客户端 {i:2d}：{e}，等了 {time.monotonic() - t:.1f} 秒")
print(subprocess.run(["ss", "-lnt", "sport = :9000"], capture_output=True, text=True).stdout)
print(f"ListenOverflows 增加 {overflows() - before}")
```

```bash
docker run --rm -i capacity-lab python - < backlog.py
```

实际输出：

```text
客户端  1：连接成功
客户端  2：连接成功
客户端  3：连接成功
客户端  4：连接成功
客户端  5：连接成功
客户端  6：timed out，等了 2.0 秒
客户端  7：timed out，等了 2.0 秒
客户端  8：timed out，等了 2.0 秒
客户端  9：timed out，等了 2.0 秒
客户端 10：timed out，等了 2.0 秒
客户端 11：timed out，等了 2.0 秒
客户端 12：timed out，等了 2.0 秒
State  Recv-Q Send-Q Local Address:Port Peer Address:Port
LISTEN 5      4          127.0.0.1:9000      0.0.0.0:*

ListenOverflows 增加 14
```

前 5 个客户端立刻连上，Linux 的 accept 队列能放 `backlog + 1` 条。从第 6 个开始，客户端发出的 SYN 被直接丢弃，它收不到任何回应，只能按超时重传：Linux 第一次重传 SYN 在 1 秒后，之后间隔翻倍。实验里每个客户端只等 2 秒，所以在超时前发了 2 次 SYN，7 个客户端一共 14 次，正好对上 `ListenOverflows` 增加的 14。

真实客户端通常会等更久。默认会重传 6 次 SYN，间隔 1、2、4、8、16、32 秒，所以队列短暂溢出时，用户感受到的是“偶尔要等 1 秒或 3 秒才连上”；持续溢出，就是一两分钟后的连接超时。

## 在服务器上判断是不是队列溢出

两条命令就够了：

```bash
ss -lnt
nstat -az TcpExtListenOverflows TcpExtListenDrops
```

对监听状态的 Socket，`ss` 的两列含义和普通连接不同：`Recv-Q` 是 accept 队列里当前排着的连接数，`Send-Q` 是队列上限。`Recv-Q` 经常接近 `Send-Q`，说明应用取连接跟不上。`nstat` 的两个计数器是开机以来的累计值，隔一段时间再看一次，持续增长就是在丢握手。

这两个计数器是整台机器的累计值，不区分端口。需要定位到具体服务时，结合 `ss -lnt` 里哪个端口的 `Recv-Q` 偏高来判断。

## 调队列长度，也要找取得慢的原因

队列长度由两个值共同决定，两个都要调：

```ini
# /etc/sysctl.d/90-gateway.conf
net.core.somaxconn = 8192
net.ipv4.tcp_max_syn_backlog = 8192
```

```bash
sudo sysctl --system
sysctl net.core.somaxconn net.ipv4.tcp_max_syn_backlog
```

`somaxconn` 从 Linux 5.4 起默认 4096，之前是 128，老系统上值得先看一眼。光调内核参数还不够，应用自己传给 `listen()` 的 backlog 也要调大，例如 Nginx 在 Linux 上默认是 511，要在 `listen 443 ssl backlog=8192;` 里显式写出；Java、Go 等运行时也各有默认值。改完后用 `ss -lnt` 看 `Send-Q`，确认上限真的变了。

不过队列只是缓冲。队列长了，能吸收的是短暂的尖峰，比如上一篇的重连风暴里那一两秒的集中建连；如果应用长期取得比连接来得慢，再长的队列也会被填满，只是把超时推迟了。所以看到 `ListenOverflows` 增长，还要回头查应用为什么取得慢：事件循环里有没有阻塞调用，工作线程是不是都卡在下游，fd 是否已经用完。

到这里，一条连接从区分、拿到、存下、处理到排队，五道关卡都走完了。但连接数只是容量的一个维度。推送网关真正的工作是推消息：一条订单消息要推给多少人，推得出去吗，读得慢的手机会把什么堆起来？这些问题和连接数无关，却同样会把服务压垮。最后一篇：[06 连接之外：吞吐、扇出与背压](./06-throughput-backpressure.md)。
