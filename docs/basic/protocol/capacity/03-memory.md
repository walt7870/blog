---
title: 一条连接到底占多少内存
author: Walt
date: 2026-10-26
---

# 一条连接到底占多少内存

[上一篇](./02-file-descriptors.md)把文件描述符的额度放开以后，推送网关的连接数终于能往上涨了。这一篇看第三道关卡：内存。常见的估算是“每条连接几 KB，16 GB 内存能撑几百万条”，这个算法对了一半。读完后，你应该能分清哪种连接便宜、哪种连接贵，并用实测值估算一台机器的连接容量。

## 一条连接由哪些部分组成

一条 TCP 连接在服务器上占用的内存，大致分三块：

- **内核里的固定对象。** Socket 结构、TCP 控制块（记录序号、窗口、定时器等状态）、文件和目录项对象。连接建立就分配，大小基本固定。
- **内核里的收发缓冲。** 已经发出但对方还没确认的数据、对方发来但应用还没读走的数据，都放在这里。按需分配，没有数据时几乎为零。
- **应用自己的状态。** 用户会话、TLS 加密状态、读写缓冲、待推送的消息队列。大小由程序决定。

前两块可以直接测出来。

## 实测：一万条空闲连接，再让一千条积压数据

下面的实验先建立一万条连接，什么都不发，比较前后内核 Slab（内核小对象的内存池）的增量；然后挑一千条，让客户端不读数据，服务端一直写，直到写不动为止。

保存为 `memory.py`：

```python
import socket, subprocess, time

N, SLOW = 10000, 1000

def slab_kib():
    for line in open("/proc/meminfo"):
        if line.startswith("Slab:"):
            return int(line.split()[1])

def tcp_pages():
    for line in open("/proc/net/sockstat"):
        if line.startswith("TCP:"):
            f = line.split()
            return int(f[f.index("mem") + 1])

srv = socket.create_server(("127.0.0.1", 9000), backlog=4096)
time.sleep(1)
slab0, pages0 = slab_kib(), tcp_pages()
clients, accepted = [], []
for _ in range(N):
    clients.append(socket.create_connection(("127.0.0.1", 9000)))
    accepted.append(srv.accept()[0])
time.sleep(2)
slab1, pages1 = slab_kib(), tcp_pages()
per_socket = (slab1 - slab0) / (2 * N)
print(f"{N} 条空闲连接，两端共 {2 * N} 个 Socket")
print(f"内核 Slab 增加 {(slab1 - slab0) / 1024:.1f} MiB，约每个 Socket {per_socket:.2f} KiB")
print(f"TCP 收发缓冲：{pages0} → {pages1} 页")

for conn in accepted[:SLOW]:          # 这 1000 条的客户端从不读
    conn.setblocking(False)
    try:
        while True:
            conn.send(b"x" * 65536)
    except BlockingIOError:
        pass
time.sleep(2)
pages2 = tcp_pages()
lines = subprocess.run(["ss", "-tnH", "sport = :9000"], capture_output=True, text=True).stdout.splitlines()
queued = sum(int(l.split()[2]) for l in lines)
print(f"{SLOW} 条连接的客户端不读：TCP 缓冲 {pages2} 页，约 {(pages2 - pages1) * 4 / 1024:.0f} MiB")
print(f"服务端发送队列平均每条 {queued / SLOW / 1024:.0f} KiB")
```

客户端和服务端在同一个进程里，两万个 Socket 需要更大的 fd 额度：

```bash
docker run --rm -i --ulimit nofile=65536 capacity-lab python - < memory.py
```

实际输出：

```text
10000 条空闲连接，两端共 20000 个 Socket
内核 Slab 增加 71.8 MiB，约每个 Socket 3.68 KiB
TCP 收发缓冲：253 → 253 页
1000 条连接的客户端不读：TCP 缓冲 139235 页，约 543 MiB
服务端发送队列平均每条 492 KiB
```

同样的实验跑了四次，每个 Socket 的增量在 3.68–3.82 KiB 之间。Slab 是整台虚拟机共用的，其他进程的活动会带来一点误差，所以记作“约 3.7 KiB”。

## 空闲连接便宜，积压数据的连接贵

![同一条连接，空闲和积压的内存成本相差上百倍](/protocol/capacity/connection-memory.svg)

第一组数字说明，空闲连接只占固定对象，约 3.7 KiB，收发缓冲一页都没有多占。内核不会为每条连接预先分配缓冲，有数据时才分配，数据被确认或读走后就释放。

第二组数字差了两个数量级。客户端不读，服务端写出的数据就只能留在服务端的发送队列里，平均每条连接积压 492 KiB，一千条就是近 500 MiB；算上客户端那一侧的接收队列，TCP 缓冲一共多占了 543 MiB。单条连接最多能积压多少，由 `net.ipv4.tcp_wmem` 的上限（实验环境是 4 MiB）和对方的接收窗口共同决定。

用 8 GiB 内存算一笔账，差别就很直观：

```text
空闲连接：8 GiB ÷ 3.7 KiB      ≈ 227 万条（只算服务端一侧的内核对象）
积压连接：8 GiB ÷ 492 KiB      ≈ 1.7 万条
```

真实的推送网关介于两者之间。大部分 App 在后台挂着，连接是空闲的；少数手机网络差或者被系统冻结，推下去的消息读不走，就会积压。容量规划要估的是“有多少连接会积压、每条积压多少”，而不只是连接总数乘以一个固定值。

## 应用层的开销往往比内核大

实验只测了内核。应用为每条连接保存的东西，通常比 3.7 KiB 大得多：一个 TLS 连接的加密状态和缓冲、一个用户会话对象、一个待推送消息队列，加起来几十 KiB 很常见。用 Go 这类为每条连接启动一个协程的语言，还要算上协程栈。

所以估算公式要把两部分都放进去，并且都用实测值：

```text
总内存 ≈ 连接数 × (内核每连接 + 应用每连接) + 积压连接数 × 平均积压量 + 进程固定开销
```

测应用层的方法和上面的实验一样：先记下服务进程的常驻内存（`/proc/PID/status` 里的 `VmRSS`），用压测工具建立一万条空闲连接，再看增量；然后让一部分连接持续收发，看增长。

## 在服务器上观察和限制

内核侧的 TCP 内存，看 `/proc/net/sockstat`：

```bash
cat /proc/net/sockstat
sysctl net.ipv4.tcp_mem net.ipv4.tcp_wmem net.ipv4.tcp_rmem
ss -tm state established | head
```

`sockstat` 里 `TCP: ... mem` 是整台机器 TCP 缓冲占用的页数（通常一页 4 KiB）。`tcp_mem` 是三个以页为单位的阈值：超过第二个值，内核进入内存压力模式，开始收紧每条连接的缓冲；超过第三个值，新的数据会被丢弃。`tcp_mem` 是整台机器共用的，在容器里看不到，要在宿主机上查。`ss -tm` 能看到每条连接的缓冲明细，找出积压最多的连接。

防止积压吃光内存，关键在应用层：

- 每条连接的待发送队列要有上限，超过上限就合并旧消息、丢弃过期状态，或者断开读不动的客户端。
- 不要因为 `send()` 暂时写不进去，就把数据无限追加到内存队列里。
- 必要时用 `SO_SNDBUF` 给单条连接的内核发送缓冲设上限，让积压更早暴露给应用。

具体的取舍要看数据能不能丢，[06 连接之外：吞吐、扇出与背压](./06-throughput-backpressure.md)会专门讨论。

内存够用以后，连接还要被及时处理：每条连接的心跳要回、消息要推、新连接要握手。连接数到了几十万，这些工作压在 CPU 上，处理模型选错了，CPU 会比内存先撑不住。下一篇：[04 连得上之后：心跳、重连风暴与事件模型](./04-cpu-event-loop.md)。
