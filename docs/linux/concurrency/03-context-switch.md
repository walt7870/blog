---
title: 线程越多越快吗：上下文切换与调度
author: Walt
date: 2026-10-26
---

# 线程越多越快吗：上下文切换与调度

[上一篇](./02-concurrency-vs-parallelism.md)看到，等待型任务靠并发就能加速，计算型任务要靠多个 CPU 核并行。那么，如果线程数比 CPU 核多很多，会怎样？订单服务的签名计算放在一个工作池里，有人把池子从 4 个线程调到 64 个，希望“算得更快”。这一篇用实验回答这个问题，并解释操作系统在多个线程之间来回切换时做了什么。读完后，你应该能判断线程是不是开多了，并会用 `vmstat` 和 `pidstat` 观察切换和排队。

## 实验：一个 CPU，1 个进程和 16 个进程分同一份活

下面的实验把容器限制在 1 个 CPU 上，做两件事。第一件：两个进程通过管道互相传一个字节，传 10 万个来回，测一次往返要多久。每次往返，CPU 都要从一个进程切到另一个，再切回来。第二件：准备 16 份同样的计算，分别交给 1 个、4 个和 16 个进程去做，记录每一份计算完成的时刻。保存为 `switch.py`：

```python
import os, time

def ctx(pid):
    v = n = 0
    for line in open(f"/proc/{pid}/status"):
        if line.startswith("voluntary_ctxt_switches"):
            v = int(line.split()[1])
        elif line.startswith("nonvoluntary_ctxt_switches"):
            n = int(line.split()[1])
    return v, n

# 实验一：两个进程用管道来回传一个字节，每一轮都要切换两次
ROUNDS = 100_000
a_r, a_w = os.pipe()
b_r, b_w = os.pipe()
pid = os.fork()
if pid == 0:
    for _ in range(ROUNDS):
        os.read(a_r, 1)
        os.write(b_w, b"x")
    os._exit(0)
t0 = time.perf_counter()
for _ in range(ROUNDS):
    os.write(a_w, b"x")
    os.read(b_r, 1)
dt = time.perf_counter() - t0
v, n = ctx("self")
os.waitpid(pid, 0)
print(f"管道往返 {ROUNDS} 次：{dt:.2f} 秒，每次往返 {dt / ROUNDS * 1e6:.1f} µs，父进程切换 {v + n} 次")

# 实验二：16 份同样的计算，交给 1 个进程排队做，或者开 16 个进程一起抢 CPU
TASKS, WORK = 16, 3_000_000
def burn(n):
    x = 0
    for i in range(n):
        x += i

def run(workers):
    r, w = os.pipe()
    t0 = time.perf_counter()
    for k in range(workers):
        if os.fork() == 0:
            done = []
            for _ in range(TASKS // workers):
                burn(WORK)
                done.append(time.perf_counter() - t0)    # 每份计算完成的时刻
            v, n = ctx("self")
            os.write(w, (" ".join(f"{d:.4f}" for d in done) + f" | {v} {n}\n").encode())
            os._exit(0)
    os.close(w)
    lines = os.fdopen(r).read().splitlines()
    for _ in range(workers):
        os.wait()
    finish = sorted(float(x) for l in lines for x in l.split(" | ")[0].split())
    sw = sum(sum(map(int, l.split(" | ")[1].split())) for l in lines)
    print(f"{workers:3d} 个进程：全部完成 {finish[-1]:.2f} 秒，第一份完成 {finish[0]:.2f} 秒，"
          f"平均每份等到 {sum(finish) / len(finish):.2f} 秒，上下文切换 {sw} 次")

for workers in (1, 4, 16):
    run(workers)
```

```bash
docker run --rm --cpuset-cpus 0 -v "$PWD":/lab -w /lab capacity-lab python switch.py
```

实际输出：

```text
管道往返 100000 次：0.21 秒，每次往返 2.1 µs，父进程切换 100083 次
  1 个进程：全部完成 0.90 秒，第一份完成 0.09 秒，平均每份等到 0.48 秒，上下文切换 7 次
  4 个进程：全部完成 0.92 秒，第一份完成 0.24 秒，平均每份等到 0.58 秒，上下文切换 315 次
 16 个进程：全部完成 1.08 秒，第一份完成 0.83 秒，平均每份等到 1.03 秒，上下文切换 370 次
```

这里用进程而不用线程，是为了绕开 Python 的 GIL，让每个执行者都真正地去抢 CPU；换成 Java 或 Go 的线程，结果相同。实验跑了三次，“全部完成”在 0.82–1.14 秒之间波动，但三组之间的关系每次都一样。

第一行说明，一次切换本身很快：一次往返包含两次切换和四次系统调用，总共约 2 微秒。后三行是重点：16 份计算，无论交给几个进程，全部完成的时间都差不多，因为只有一个 CPU，总工作量没变。但 1 个进程时，第一份计算 0.09 秒就交付了，平均每份等 0.48 秒；16 个进程时，第一份要等到 0.83 秒，平均每份等 1.03 秒，几乎每一份都拖到了最后。

## 上下文切换做了什么

![一个 CPU 上 1 个进程排队与 16 个进程轮转的时间线](/linux/concurrency/context-switch.svg)

一个 CPU 核同一时刻只能执行一个线程。当可运行的线程比核多，内核的调度器就让它们轮流执行，每个线程执行一小段时间（通常是几毫秒）后被换下，换另一个上来。换人的过程叫上下文切换：把当前线程的寄存器、程序计数器和栈指针保存起来，把下一个线程的这些状态装回 CPU；如果两个线程属于不同进程，还要切换内存地址映射。

`/proc/PID/status` 里把切换分成两种。`voluntary_ctxt_switches` 是主动切换，线程要等 I/O、等锁、等定时器，自己让出了 CPU，管道实验里的十万次切换都属于这一类。`nonvoluntary_ctxt_switches` 是被动切换，线程还想继续算，但时间片用完了，被调度器换下。16 个进程算数时，切换几乎全是被动的。

切换的直接代价是微秒级，实验里一次往返连同四次系统调用才 2 微秒，单次切换不到 1 微秒。间接代价更大：新换上来的线程要用的数据多半不在 CPU 缓存里，要重新从内存加载，这部分开销取决于程序访问内存的方式，很难单独测量。对于时间片长达几毫秒的计算任务，切换的总开销只占百分之几，实验里 16 个进程比 1 个进程只多花了一点时间，就是这个原因。

所以，线程开多了，真正的损失往往不是切换本身耗掉的 CPU，而是每个任务的完成时间被拉长了。16 个进程平分一个 CPU，每个都只能以十六分之一的速度前进，谁也不能先完成。对订单服务来说，这意味着每个请求都变慢，而总吞吐量没有任何提高。

## 什么时候线程多是合理的

上面的结论针对计算型任务。对于等待型任务，线程大部分时间在睡眠，不占 CPU，也不参与时间片轮转，所以一个核上跑几百个线程是正常的；订单服务里一个请求 40 毫秒中只有一两毫秒在算，这时线程数可以远多于核数。具体多少合适，要用下一篇讲到的排队关系来算。

但等待型线程也不是没有代价。每个线程都占一段栈内存（[第 01 篇](./01-process-thread-coroutine.md)测得约 17 KiB 实际占用和 8 MiB 预留地址）；每次 I/O 返回、线程被唤醒，都是一次主动切换。每秒十万次请求，每个请求经历几次唤醒，就是每秒几十万次切换，这时切换开销会占到可观的 CPU。这也是高并发网络服务转向事件循环和协程的原因：一个线程管理大量连接，有数据时处理，没数据时也不必唤醒，[连接容量系列](../../basic/protocol/capacity/04-cpu-event-loop.md)里有一组线程模型和事件循环的对比实验。

经验上，可以这样确定工作线程的数量：

| 任务类型 | 线程数从哪里开始 |
|---|---|
| 纯计算 | 等于可用的 CPU 核数 |
| 等待为主 | 由到达速率和每个请求的耗时决定，见[第 05 篇](./05-pool-size-and-queueing.md) |
| 事件循环 | 每个核一个循环，循环里不做阻塞操作 |

“可用的 CPU 核数”在容器里要格外小心。同一个实验镜像里，`--cpus 2` 限额下 `os.cpu_count()` 和 `os.process_cpu_count()` 都返回 10，看到的是虚拟机的全部 CPU；`--cpuset-cpus 0-1` 时，`os.process_cpu_count()` 才返回 2。按 10 个核开 10 个计算线程，在只有 2 个核限额的容器里，结果就是上面 16 个进程抢一个 CPU 的情形，还会因为用完限额被强制暂停。部分运行时已经能识别容器限额，例如 Go 从 1.25 起（`go.mod` 里的 go 版本不低于 1.25 时）会按 cgroup 的 CPU 限额设置默认的 `GOMAXPROCS`；其他情况下，最好在配置里显式写出线程数。

## 在服务器上观察

判断 CPU 是否不够用，看“排队等 CPU 的线程数”：

```bash
vmstat 1                 # r：正在运行和等着运行的线程数；cs：每秒上下文切换次数
pidstat -w -p PID 1      # cswch/s：主动切换；nvcswch/s：被动切换
cat /sys/fs/cgroup/cpu.stat   # 容器里：nr_throttled、throttled_usec 是因用完限额被暂停的次数和时长
```

`vmstat` 的 `r` 列长期大于 CPU 核数，说明有线程在排队等 CPU，这时增加线程只会让队伍更长。某个服务的 `nvcswch/s` 很高，说明它的线程经常还没做完就被换下，多半是计算线程比核多。`cswch/s` 很高而 CPU 使用率也高，可能是线程之间频繁互相唤醒，比如锁竞争激烈，或者每个小任务都要在线程之间传递。容器里的 `nr_throttled` 持续增长，说明进程用完了 CPU 限额，在每个调度周期的剩余时间里被暂停，表现为请求耗时周期性地变长。

线程多了会互相抢 CPU，也会互相抢数据。订单服务的多个线程同时扣同一件商品的库存时，会发生什么？下一篇：[04 共享状态：竞态、锁与死锁](./04-race-lock-deadlock.md)。
