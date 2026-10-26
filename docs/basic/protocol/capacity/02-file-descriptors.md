---
title: 为什么一千多条就报 Too many open files
author: Walt
date: 2026-10-26
---

# 为什么一千多条就报 Too many open files

[上一篇](./01-ports.md)说明了服务端的端口几乎不会用完。这一篇看第二道关卡：文件描述符。它解释了一个很常见的现象，一台配置不低的服务器，连接到一千条左右就开始报 `Too many open files`，而 CPU 和内存几乎是空的。读完后，你应该能找到进程实际拿到的额度，并把它调到合适的值。

推送网关第一次上线时就是这样：灰度到一千多个用户，日志里开始刷 `accept: Too many open files`，新用户连不上，监控上 CPU 不到 5%。

## 每条连接都要占一个文件描述符

Linux 把网络连接也当作文件来管理。进程每打开一个文件、一个管道或者一条 Socket，内核就给它一个整数编号，叫文件描述符（file descriptor，简称 fd），之后读写都通过这个编号进行。推送网关每接受一条连接，就占用一个 fd。

fd 不是无限的。每个进程都有一个额度，叫 `RLIMIT_NOFILE`，分软限制和硬限制两个值。软限制是实际生效的额度，进程可以自己把它调高，但不能超过硬限制。很多发行版和 systemd 给进程的软限制默认是 1024。

1024 这个默认值有历史原因：老的 `select()` 接口用固定大小的位图记录 fd，处理不了编号大于等于 1024 的 fd。为了不让还在用 `select()` 的老程序出错，软限制一直保留在 1024，需要更多连接的服务要自己调高。

推送网关用默认配置启动，额度 1024 里还要扣掉标准输入输出、日志文件、监听 Socket 和到上游的连接，能留给客户端的就是一千条左右。

## 把额度设成 64，看连接堆在哪里

下面的实验把服务端的额度限制为 64，然后让客户端连 100 次。服务端一直 `accept()`，直到失败为止。

服务端脚本保存为 `fd_server.py`：

```python
import resource, socket, time

soft, _ = resource.getrlimit(resource.RLIMIT_NOFILE)
print(f"服务端 fd 额度：软限制 {soft}")
srv = socket.create_server(("127.0.0.1", 9000), backlog=1024)
accepted = []
while True:
    try:
        accepted.append(srv.accept()[0])
    except OSError as e:
        print(f"accept 第 {len(accepted) + 1} 条时失败：{e}")
        break
time.sleep(3)
```

客户端脚本保存为 `fd_client.py`，它的额度不受限制，连完以后用 `ss` 查看监听 Socket：

```python
import socket, subprocess, time

conns = [socket.create_connection(("127.0.0.1", 9000)) for _ in range(100)]
print("客户端：100 条 connect() 全部成功")
time.sleep(1)
print(subprocess.run(["ss", "-lnt", "sport = :9000"], capture_output=True, text=True).stdout)
```

两个脚本要同时运行，所以把当前目录挂进容器。`ulimit -n 64` 写在括号里，只作用于服务端进程：

```bash
docker run --rm -v "$PWD":/lab -w /lab capacity-lab sh -c \
  "(ulimit -n 64; exec python -u fd_server.py) & sleep 1; python fd_client.py; wait"
```

实际输出：

```text
服务端 fd 额度：软限制 64
accept 第 61 条时失败：[Errno 24] Too many open files
客户端：100 条 connect() 全部成功
State  Recv-Q Send-Q Local Address:Port Peer Address:Port
LISTEN 40     1024       127.0.0.1:9000      0.0.0.0:*
```

服务端在第 61 条失败，64 个 fd 里有 3 个是标准输入、输出和错误输出，1 个是监听 Socket。更值得注意的是另外两行：客户端的 100 条连接全部“成功”了，而监听 Socket 的 `Recv-Q` 是 40。

## 连接已经建好，只是没人去拿

这个结果说明了连接建立的分工。三次握手由内核完成，不需要应用参与；握手完成的连接先放进监听 Socket 的 accept 队列，等应用调用 `accept()` 时，内核才为它分配一个 fd 交给应用。

![fd 用完时，握手照样完成，连接堆在 accept 队列](/protocol/capacity/fd-accept.svg)

所以 fd 用完时，客户端看不到任何错误。它的 `connect()` 已经返回成功，发出的数据也会被内核收下，只是服务端程序永远不会读到。实验里那 40 条连接就处在这种状态。对推送网关来说，新用户的 App 显示“已连接”，却收不到任何推送，直到心跳超时才断开重连，然后再次卡在同一个地方。

这也是排查时容易走偏的地方：客户端看起来连上了，问题却在服务端。看到服务端日志里有 `EMFILE` 或 `Too many open files`，或者 `ss -lnt` 显示监听 Socket 的 `Recv-Q` 一直不为 0，就该检查 fd 额度。

## 三层额度，各管一段

fd 的限制分三层，排查时要逐层确认：

| 层级 | 在哪里看 | 常见默认 | 超出时 |
|---|---|---|---|
| 进程软限制 | `ulimit -Sn`，或 systemd 的 `LimitNOFILE=` | 1024 | `EMFILE`：Too many open files |
| 进程硬限制 | `ulimit -Hn` | systemd 240 起启动的服务为 524288 | 软限制无法再调高 |
| 硬限制的上限 | `sysctl fs.nr_open` | 1048576 | 硬限制无法设得更高 |
| 整个系统 | `sysctl fs.file-max` | 按内存大小自动计算 | `ENFILE`：Too many open files in system |

最可靠的是直接看正在运行的进程拿到了多少额度，把 `PID` 换成服务的进程号：

```bash
grep 'open files' /proc/PID/limits
ls /proc/PID/fd | wc -l
```

第一条显示软、硬限制，第二条是当前已经打开的 fd 数量。两者接近，就是这道关卡到了。

## 在 systemd 服务上调高额度

在终端里执行 `ulimit -n 100000` 只影响当前 Shell 和它启动的程序，对 systemd 启动的服务不起作用。服务的额度要写在服务配置里。以服务名 `gateway` 为例，创建覆盖文件：

```ini
# /etc/systemd/system/gateway.service.d/limits.conf
[Service]
LimitNOFILE=1048576
```

让配置生效并确认：

```bash
sudo systemctl daemon-reload
sudo systemctl restart gateway
grep 'open files' /proc/$(systemctl show -p MainPID --value gateway)/limits
```

最后一行应该显示软、硬限制都是 1048576。如果还是 1024，检查覆盖文件的路径和服务名是否对应。`LimitNOFILE` 不能超过 `fs.nr_open`，需要更高时先调大 `fs.nr_open`。容器里运行的服务，额度由容器运行时决定，例如 `docker run --ulimit nofile=1048576`，或 Kubernetes 节点上容器运行时的默认配置。

还有一种情况，额度调高了，fd 数量却一直涨，最后还是报错。这通常是连接泄漏：连接断开后程序没有关闭 Socket。`ls -l /proc/PID/fd` 能看到每个 fd 指向什么，`ss -tanp` 里大量 `CLOSE_WAIT` 状态的连接，往往就是程序忘了关闭。这种问题调额度只能推迟报错。

## 放开以后，瓶颈去了哪里

把额度调到百万级，推送网关的连接数就不再停在一千左右了。但 fd 只是一个编号，每条连接背后真正占资源的是内核里的 Socket 对象和收发缓冲，还有应用自己为每个用户保存的状态。连接一多，这些开销加起来就是下一道关卡：[03 一条连接到底占多少内存](./03-memory.md)。
