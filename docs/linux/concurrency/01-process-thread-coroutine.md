---
title: 进程、线程和协程：谁在替请求干活
author: Walt
date: 2026-10-26
---

# 进程、线程和协程：谁在替请求干活

订单服务同时收到一千个请求，总得有“人”去执行它们。这个“人”可以是一个进程、一个线程，也可以是一个协程。三个词经常被混着用，但它们在内存里的样子、创建的代价和出问题时的影响范围差别很大。读完这一篇，你应该能说清三者分别是什么、彼此是什么关系，并能在 Linux 上数出一个服务实际有几个进程和线程。

## 先看实验：同样扣一次库存，结果不一样

下面的实验做两件事。第一件：一个全局变量 `stock = 100`，分别让一个线程和一个子进程把它减 1，看主程序事后看到多少。第二件：分别创建一批进程、线程和协程，让它们都停在“等待”状态，比较创建一个要花多久、占多少内存。保存为 `workers.py`：

```python
import asyncio, os, threading, time

def rss_kib():
    for line in open("/proc/self/status"):
        if line.startswith("VmRSS:"):
            return int(line.split()[1])

def smaps(pid):
    fields = dict(line.split(":", 1) for line in open(f"/proc/{pid}/smaps_rollup") if ":" in line and not line.startswith(("0", "a", "f")))
    kib = lambda k: int(fields[k].split()[0])
    return kib("Rss"), kib("Private_Clean") + kib("Private_Dirty")

stock = 100

def sell_one():
    global stock
    stock -= 1

t = threading.Thread(target=sell_one); t.start(); t.join()
print(f"线程扣减一次后，主程序看到 stock = {stock}")
pid = os.fork()
if pid == 0:
    sell_one()
    os._exit(0)
os.waitpid(pid, 0)
print(f"子进程扣减一次后，主程序看到 stock = {stock}")

N = 200
r, w = os.pipe()
t0 = time.perf_counter()
children = []
for _ in range(N):
    pid = os.fork()
    if pid == 0:
        os.close(w)
        os.read(r, 1)          # 等父进程关掉写端
        os._exit(0)
    children.append(pid)
cost = (time.perf_counter() - t0) / N * 1e6
time.sleep(1)
rss, private = (sum(v) / N for v in zip(*(smaps(p) for p in children)))
print(f"进程   ×{N}：创建 {cost:6.0f} µs/个，RSS {rss:6.0f} KiB/个，其中独占 {private:4.0f} KiB/个")
os.close(w)
for p in children:
    os.waitpid(p, 0)

N = 1000
base, done = rss_kib(), threading.Event()
t0 = time.perf_counter()
threads = [threading.Thread(target=done.wait) for _ in range(N)]
for t in threads:
    t.start()
cost = (time.perf_counter() - t0) / N * 1e6
print(f"线程   ×{N}：创建 {cost:6.0f} µs/个，内存 {(rss_kib() - base) / N:5.1f} KiB/个，"
      f"/proc/self/task 有 {len(os.listdir('/proc/self/task'))} 项")
done.set()
for t in threads:
    t.join()

async def coroutines(n):
    gate = asyncio.Event()
    base = rss_kib()
    t0 = time.perf_counter()
    tasks = [asyncio.create_task(gate.wait()) for _ in range(n)]
    await asyncio.sleep(0)
    cost = (time.perf_counter() - t0) / n * 1e6
    print(f"协程 ×{n}：创建 {cost:6.1f} µs/个，内存 {(rss_kib() - base) / n:5.1f} KiB/个，"
          f"线程仍是 {len(os.listdir('/proc/self/task'))} 个")
    gate.set()
    await asyncio.gather(*tasks)

asyncio.run(coroutines(100_000))
```

```bash
docker run --rm -v "$PWD":/lab -w /lab capacity-lab python workers.py
```

实际输出：

```text
线程扣减一次后，主程序看到 stock = 99
子进程扣减一次后，主程序看到 stock = 99
进程   ×200：创建    188 µs/个，RSS  21176 KiB/个，其中独占  663 KiB/个
线程   ×1000：创建     60 µs/个，内存  17.6 KiB/个，/proc/self/task 有 1001 项
协程 ×100000：创建    2.0 µs/个，内存   0.9 KiB/个，线程仍是 1 个
```

前两行最值得注意。线程把 `stock` 从 100 减到 99，主程序看到了 99；子进程又减了一次，主程序看到的还是 99，子进程改的是它自己的那一份。后三行是代价：一个进程的创建时间是线程的三倍左右，独占内存是线程的三十多倍；协程又比线程便宜一个数量级以上，十万个协程只占了一个线程。这个实验跑了三次，进程创建在 188–278 微秒、线程在 55–94 微秒之间波动，内存数字三次一致。

## 进程：一个独立的工作间

![进程、线程和协程在内存中的关系](/linux/concurrency/process-thread-coroutine.svg)

进程是一个正在运行的程序，加上操作系统分给它的全部资源：一块独立的虚拟地址空间（代码、全局变量、堆）、打开的文件和 Socket、当前目录、用户身份。可以把它想成一个独立的工作间，里面的东西别的工作间看不见、碰不到。

子进程刚 `fork()` 出来时，它的地址空间是父进程的一份副本。Linux 并不立刻复制内存，而是让父子共用同一批物理页，谁要改某一页，才给谁复制一份，这叫写时复制。所以实验里每个子进程的 RSS 有 21 MiB，但其中真正独占的只有约 660 KiB，其余都和父进程共用。子进程执行 `stock -= 1` 时，被改的那一页复制了一份，父进程那一页不受影响，于是主程序看到的还是 99。

这种隔离是进程最大的价值：一个进程崩溃、内存越界或者泄漏，不会直接破坏其他进程。代价是进程之间交换数据必须经过操作系统，比如管道、Socket、共享内存或者消息队列，不能像改变量那样直接改。

实验里的进程是从一个已经运行的 Python 进程 `fork()` 出来的，所以很快。如果是从头启动一个新程序，还要加载可执行文件和库、初始化运行时。同样的镜像里，启动一个全新的 Python 解释器约需 6 毫秒，是 `fork()` 的三十倍；Java 这类运行时启动更慢。所以服务通常在启动时一次性创建好进程，而不是每来一个请求开一个。

## 线程：同一个工作间里的几个人

线程是进程里的一条执行路线。同一个进程里的所有线程共用地址空间、打开的文件和全局变量，每个线程只自己保存执行到哪一行（寄存器和程序计数器）和一段调用栈。所以线程改的 `stock`，主程序马上能看到。

在 Linux 内核眼里，线程和进程都是“任务”（task），用同一个 `clone()` 系统调用创建，区别只在于共享多少东西。调度器以线程为单位分配 CPU。实验里 `/proc/self/task` 下有 1001 项，就是 1000 个线程加主线程，每一项是一个内核能独立调度的任务。

线程比进程便宜，因为不用复制地址空间的映射关系，只要分配一段栈和内核的任务结构。实验里每个线程实际占用约 17.6 KiB 内存；它的栈预留了 8 MiB 虚拟地址（由 `ulimit -s` 决定），但只有真正用到的部分才占物理内存。

共享内存让线程之间协作很方便，也带来了问题：两个线程同时改同一个变量，结果可能出错。这会在[第 04 篇](./04-race-lock-deadlock.md)专门讨论。另外，一个线程的严重错误，比如空指针导致的段错误，会让整个进程连同所有线程一起退出。

## 协程：一个人手上的好几件事

协程是可以在中途暂停、之后再从暂停处继续的函数。它不由内核调度，而是由程序自己的事件循环管理：协程执行到 `await`，比如在等数据库返回，就把控制权交回事件循环，事件循环挑一个已经可以继续的协程接着执行。整个过程都在一个线程里完成，内核根本不知道协程的存在，所以实验里十万个协程之后线程数还是 1。

协程便宜，是因为暂停时只需要保存这个函数自己的局部状态，不需要内核参与，也不需要单独的栈（Python 的协程如此；Go 的 goroutine 有自己的小栈，起始只有几 KiB）。代价是协作式的：协程只在 `await` 处让出。如果一个协程执行了一段很长的计算，或者调用了一个会阻塞的同步函数，整个事件循环上的所有协程都要等它。Python 里的具体表现和处理方法，见 [asyncio 的事件循环模型](../../devlanguage/python/concurrency-series/06-asyncio-event-loop-model.md) 和 [同步库与异步系统的边界](../../devlanguage/python/concurrency-series/08-sync-blocking-in-async-system.md)。

## 三者对比

| | 进程 | 线程 | 协程 |
|---|---|---|---|
| 谁来调度 | 内核 | 内核 | 程序里的事件循环或运行时 |
| 内存 | 独立地址空间 | 共用进程的地址空间，各有一段栈 | 共用线程，只保存自己的局部状态 |
| 实验里的创建代价 | 约 0.2 ms（fork），启动新程序约 6 ms | 约 0.06 ms | 约 0.002 ms |
| 实验里的独占内存 | 约 660 KiB | 约 17.6 KiB | 约 0.9 KiB |
| 一个出错影响谁 | 只有自己 | 整个进程 | 整个线程上的所有协程 |
| 什么时候切换 | 内核决定 | 内核决定 | 只在 `await` 处 |

真实的服务往往把三者组合起来用。Nginx 启动几个工作进程，每个进程里一个事件循环管理成千上万条连接；Java 的 Tomcat 在一个进程里用线程池，一个请求占一个线程；Go 运行时把大量 goroutine 分配到少量系统线程上；Node.js 主要靠单线程事件循环，再用少量后台线程处理文件读写等操作。选择哪种组合，取决于请求是在等待还是在计算，这是下一篇的主题。

## 在服务器上数一数

在 Linux 上，下面几条命令能看到一个服务实际有几个进程、几个线程（把 `PID` 换成服务的进程号）：

```bash
ps -eo pid,ppid,nlwp,rss,comm --forest | head -30   # nlwp 是每个进程的线程数
ps -L -p PID -o pid,lwp,stat,pcpu,comm              # 列出一个进程里的每个线程
grep Threads /proc/PID/status
top -H -p PID                                        # 按线程看 CPU
```

`ps` 里的 `LWP` 就是线程 ID。看到一个 Java 服务有两三百个线程，通常是线程池、垃圾回收和 JIT 编译线程加在一起，属于正常；如果线程数随时间一直上涨，多半是某处在不断创建线程而不回收。协程在这些命令里看不到，要用语言自己的工具，例如 Go 的 `pprof` 或 Python 的 `asyncio.all_tasks()`。

进程和线程的父子关系、状态和退出回收，在 [Linux 进程管理](../process/index.md) 里有更详细的说明。

现在知道了谁在干活。下一个问题是：开了更多的线程，事情就能做得更快吗？答案取决于它们是在等待还是在计算。下一篇：[02 并发和并行：等待型任务与计算型任务](./02-concurrency-vs-parallelism.md)。
