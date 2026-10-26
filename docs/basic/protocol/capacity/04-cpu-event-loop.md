---
title: 连得上之后：心跳、重连风暴与事件模型
author: Walt
date: 2026-10-26
---

# 连得上之后：心跳、重连风暴与事件模型

前三篇解决的是“连得上、存得下”：[端口](./01-ports.md)能区分连接，[文件描述符](./02-file-descriptors.md)够用，[内存](./03-memory.md)放得下。这一篇看第四道关卡：这些连接能不能被及时处理。读完后，你应该能估算长连接服务的日常 CPU 负载，知道为什么一连接一线程撑不住大量连接，以及服务重启时最危险的那一刻在哪里。

## 空闲连接不耗 CPU，心跳会

一条什么都不发的连接，几乎不占 CPU，内核不会去轮询它。推送网关的 CPU 花在三件事上：处理心跳、推送消息、接受新连接。

心跳是最容易被低估的一项。它看起来很小，但次数等于连接数除以心跳间隔：

```text
100 万条连接 ÷ 30 秒一次心跳 ≈ 每秒 3.3 万次心跳
```

每次心跳都要经历一次网卡中断、内核协议栈收包、唤醒应用、读数据、回一个响应，再加上双方的 ACK 报文。这是不管有没有业务消息都要付出的底噪。心跳间隔从 30 秒改成 10 秒，底噪直接翻三倍。所以心跳间隔要按 NAT 和运营商网络的空闲超时来定，不是越短越好；移动端还要考虑耗电。

## 一连接一线程和事件循环

处理这些连接的方式，决定了 CPU 和内存花在哪里。最直观的写法是一连接一线程：每接受一条连接，就开一个线程，在里面阻塞地读数据。另一种是事件循环：少量线程通过 `epoll` 同时登记所有连接，内核只把有数据可读的连接告诉程序，程序逐个处理。

下面的实验用两种方式各保持 5000 条空闲连接，比较线程数和内存。保存为 `threads.py`：

```python
import os, selectors, socket, sys, threading, time

MODE, N = sys.argv[1], 5000
srv = socket.create_server(("127.0.0.1", 9000), backlog=4096)
held = []

def per_thread():
    while True:
        conn, _ = srv.accept()
        held.append(conn)
        threading.Thread(target=lambda c=conn: c.recv(64), daemon=True).start()

def event_loop():
    sel = selectors.DefaultSelector()          # Linux 上是 epoll
    srv.setblocking(False)
    sel.register(srv, selectors.EVENT_READ)
    while True:
        for key, _ in sel.select():
            conn, _ = srv.accept()
            conn.setblocking(False)
            held.append(conn)
            sel.register(conn, selectors.EVENT_READ)

threading.Thread(target=per_thread if MODE == "thread" else event_loop, daemon=True).start()
clients = [socket.create_connection(("127.0.0.1", 9000)) for _ in range(N)]
time.sleep(3)
status = dict(l.split(":", 1) for l in open(f"/proc/{os.getpid()}/status"))
print(f"{MODE}：{N} 条连接，线程 {status['Threads'].strip()} 个，"
      f"常驻内存 {int(status['VmRSS'].split()[0]) / 1024:.0f} MiB，"
      f"虚拟地址空间 {int(status['VmSize'].split()[0]) / 2**20:.1f} GiB")
```

分别运行两种模式：

```bash
docker run --rm -i --ulimit nofile=65536 capacity-lab python - thread < threads.py
docker run --rm -i --ulimit nofile=65536 capacity-lab python - event < threads.py
```

实际输出：

```text
thread：5000 条连接，线程 5002 个，常驻内存 114 MiB，虚拟地址空间 44.4 GiB
event：5000 条连接，线程 2 个，常驻内存 16 MiB，虚拟地址空间 0.1 GiB
```

![一连接一线程，和一个线程等所有连接](/protocol/capacity/thread-vs-eventloop.svg)

5000 条连接，线程模型开了 5002 个线程，每个线程都预留了一段栈空间（Linux 默认按 `ulimit -s` 预留 8 MiB 虚拟地址），所以虚拟地址空间到了 44 GiB，实际常驻内存也是事件循环的七倍。连接到了几十万，线程数会先撞上系统的线程上限（`kernel.threads-max`、`kernel.pid_max`）或容器的进程数限制；即使没撞上，几十万个线程的调度切换也会把 CPU 消耗在“切换”本身。

事件循环只用了 2 个线程（主线程和事件循环线程）。连接空闲时，这个线程阻塞在 `epoll_wait()` 里，不占 CPU；有连接收到心跳，内核把它放进就绪列表，线程醒来只处理这一条。Nginx、Netty、Go 的网络库、Node.js 都是这种模型。阻塞、非阻塞和事件循环的细节见 [TCP、UDP 与 Socket](../transport-socket.md#阻塞、非阻塞与事件循环)。

事件循环也有自己的边界：一个循环只能用一个 CPU 核。要用满多核，通常每个核跑一个事件循环，再用 `SO_REUSEPORT` 让内核把新连接分到各个循环；循环里也不能做耗时的阻塞操作，比如同步查数据库，否则这个线程上所有连接都要排队等。

## 最危险的时刻：重启后的重连风暴

日常的心跳负载可以平稳估算，真正把 CPU 打满的往往是一个瞬间。推送网关发布新版本时重启，100 万个 App 同时发现连接断了，都立刻重连。如果它们在 60 秒内连回来：

```text
100 万次重连 ÷ 60 秒 ≈ 每秒 1.7 万次新建连接
```

每次新建都是一次 TCP 握手加一次 TLS 握手，而 TLS 握手要做非对称加密运算，比处理一次心跳贵得多。可以在实验镜像里测一下这台机器单线程能做多少次 TLS 握手：

```bash
docker run --rm --cpus 2 capacity-lab sh -c '
  openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes \
    -keyout k.pem -out c.pem -days 1 -subj /CN=lab 2>/dev/null
  openssl s_server -quiet -accept 9443 -cert c.pem -key k.pem -www >/dev/null 2>&1 &
  sleep 1
  openssl s_time -connect 127.0.0.1:9443 -new -time 10 | grep "real seconds"'
```

实际输出：

```text
25012 connections in 11 real seconds, 0 bytes read per connection
```

也就是单线程的 `s_server` 每秒完成约 2,300 次全新的 TLS 1.3 握手（ECDSA P-256 证书）；再跑一次是 24733 次，结果稳定在每秒 2,200–2,300 次。这个测试把服务端和压测端放在同一个容器里，只能当数量级参考，但足以说明问题：每秒 1.7 万次握手，需要好几个核专门做握手，而网关平时的 CPU 是按心跳负载配的。握手排不上队的客户端超时后再次重试，风暴还会自我放大。

应对重连风暴，要从两端一起入手：

- **客户端重连加随机抖动和指数退避。** 第一次在 0–30 秒内随机挑一个时刻重连，失败后等待时间翻倍，把一个尖峰摊平成一段缓坡。
- **服务端分批重启。** 先停止接受新连接，再分批关闭旧连接，让客户端分批迁移到新实例，而不是一次断开全部。
- **限制新建速率。** 超过处理能力的新连接尽早拒绝，比接下来再超时更省资源。
- **TLS 会话恢复。** 让重连的客户端用上次的会话票据恢复，跳过最贵的那部分运算。

## 在服务器上看 CPU 花在哪里

```bash
top -H -p PID                 # 按线程看，是不是只有一个事件循环线程在 100%
mpstat -P ALL 1               # %soft 高说明网络软中断占了大量 CPU
ss -s                         # 连接总数和各状态数量
nstat -az TcpPassiveOpens     # 被动打开的连接累计数，两次相减得到每秒新建数
```

`mpstat` 来自 sysstat 包。单个线程 100% 而其他核空闲，说明事件循环数量不够或者循环里有阻塞操作；`%soft` 集中在一个核上，往往是网卡队列没有分散到多个核。

到这里，连接能建立、能保存、能处理。还剩一个环节常被忽略：连接在交给应用之前，要在内核里排一次队。这个队列满了，客户端会在握手阶段就超时，而服务器的 CPU 和内存可能都还很空。下一篇：[05 握手完成还要排队：accept 队列](./05-accept-queue.md)。
