---
title: 共享状态：竞态、锁与死锁
author: Walt
date: 2026-10-26
---

# 共享状态：竞态、锁与死锁

[上一篇](./03-context-switch.md)看到，多个线程会轮流使用 CPU，什么时候被换下由调度器决定，程序自己控制不了。只要线程之间互不相干，这没有问题。可订单服务的下单接口要扣库存，几百个请求同时扣同一件商品，它们读写的是同一个数字。这一篇看共享数据在并发下怎样出错、锁怎样修复它，以及锁用错时为什么会让服务卡死。读完后，你应该能识别“先查后改”的竞态，知道锁要加在哪里，以及服务卡住时怎样确认是不是死锁。

## 实验：100 件库存卖出了 182 件

下面的实验模拟秒杀：库存 100 件，200 个线程同时下单。每个线程先检查库存是否大于 0，再减 1；检查和扣减之间用 `sleep(0.001)` 模拟一次数据库往返。先不加锁跑一次，再加锁跑一次。后半段让两个线程按相反的顺序拿两把锁，模拟两笔方向相反的转账。保存为 `race.py`：

```python
import threading, time

# 实验一：先查库存再扣减，100 件库存，200 个请求同时下单
def sale(use_lock):
    stock, sold = 100, 0
    lock = threading.Lock()
    start = threading.Barrier(200)
    def buy():
        nonlocal stock, sold
        start.wait()
        if use_lock:
            lock.acquire()
        if stock > 0:            # 查
            time.sleep(0.001)    # 模拟查完库存到写回之间的一次数据库往返
            stock -= 1           # 改
            sold += 1
        if use_lock:
            lock.release()
    ts = [threading.Thread(target=buy) for _ in range(200)]
    t0 = time.perf_counter()
    for t in ts: t.start()
    for t in ts: t.join()
    print(f"{'加锁' if use_lock else '不加锁'}：卖出 {sold} 件，库存剩 {stock}，耗时 {time.perf_counter() - t0:.2f} 秒")

sale(False)
sale(True)

# 实验二：count += 1 看起来是一行，实际是读、加、写三步
import dis
ops = [i.opname for i in dis.get_instructions("count += 1")]
print("count += 1 的字节码：", " ".join(o for o in ops if o not in ("RESUME", "RETURN_CONST", "RETURN_VALUE")))

# 实验三：两笔转账按相反顺序加锁
a, b = threading.Lock(), threading.Lock()
def transfer(name, first, second):
    with first:
        time.sleep(0.1)
        if second.acquire(timeout=2):
            second.release()
            print(f"{name}：转账完成")
        else:
            print(f"{name}：拿着一把锁，等另一把等了 2 秒，放弃")
t1 = threading.Thread(target=transfer, args=("A→B", a, b))
t2 = threading.Thread(target=transfer, args=("B→A", b, a))
t1.start(); t2.start(); t1.join(); t2.join()

def ordered(name, x, y):
    first, second = sorted((x, y), key=id)     # 所有人都按同一顺序加锁
    transfer(name, first, second)
t1 = threading.Thread(target=ordered, args=("A→B", a, b))
t2 = threading.Thread(target=ordered, args=("B→A", b, a))
t1.start(); t2.start(); t1.join(); t2.join()
```

```bash
docker run --rm -v "$PWD":/lab -w /lab capacity-lab python race.py
```

实际输出：

```text
不加锁：卖出 182 件，库存剩 -82，耗时 0.03 秒
加锁：卖出 100 件，库存剩 0，耗时 0.14 秒
count += 1 的字节码： LOAD_NAME LOAD_CONST BINARY_OP STORE_NAME
B→A：拿着一把锁，等另一把等了 2 秒，放弃
A→B：转账完成
A→B：转账完成
B→A：转账完成
```

不加锁时，100 件库存卖出了 182 件，库存变成 -82。实验跑了五次，超卖数量在 72 到 86 件之间，每次都不同，但每次都超卖。加锁后正好卖出 100 件，耗时从 0.03 秒变成 0.14 秒。

## 竞态：查和改之间被别人插了队

![两个线程交错执行“先查后改”导致超卖](/linux/concurrency/race-and-deadlock.svg)

问题出在“查”和“改”之间的那段空隙。线程甲查到库存还有 1 件，去做数据库往返；还没等它扣减，线程乙也来查，库存仍然是 1，于是也决定卖。两个线程各减一次，同一件商品卖给了两个人。200 个线程几乎同时开始，大量线程在库存被扣到 0 之前都通过了检查，就超卖了 82 件。

这种结果取决于线程执行先后顺序的错误，叫竞态条件（race condition）。它的麻烦在于不稳定：线程少、请求不密集时几乎不出现，测试环境里跑一百遍都正常，到了大促才冒出来，而且每次错得不一样。

要消除竞态，关键是让“查和改”成为一个不可分割的整体：别的线程要么看到操作之前的状态，要么看到操作之后的状态，看不到中间状态。这个性质叫原子性。

有些操作看起来只有一步，其实不是原子的。实验第二部分打印了 `count += 1` 的字节码：读出 `count`、读出常量 1、相加、写回，一共四步，线程可能在任意两步之间被换下。Java 的 `i++`、C 的 `counter++` 同样是“读、改、写”三步。单个变量的计数可以用语言提供的原子类型（Java 的 `AtomicLong`、Go 的 `sync/atomic`、C++ 的 `std::atomic`），它们借助 CPU 的原子指令一步完成读改写；像“库存大于 0 才扣减”这种包含判断的复合操作，就要用锁。

## 锁：把一段代码变成一次只能进一个人

锁（互斥锁，mutex）保证同一时刻只有一个线程能执行被它保护的代码，这段代码叫临界区。实验里加锁之后，“查库存、往返、扣减”整段只能一个线程一个线程地走，所以结果正确。

正确性的代价是并发度。加锁版本的 200 个线程，在临界区里实际上是排队执行的，每个有库存的线程都要占锁一毫秒多，所以 100 次扣减花了 0.14 秒，而不加锁只要 0.03 秒。临界区越长，锁的竞争越激烈，排队的线程越多，第 03 篇看到的切换和等待也越多。所以加锁有两条基本原则：临界区只包含必须原子执行的那几步，不在持锁时做网络请求、磁盘读写这类慢操作；能不共享的数据就不共享，比如每个线程各自累计，最后再汇总。

实验里的锁还有一个前提：它只在一个进程内有效。订单服务部署了四个实例，每个实例里的锁只管得住自己的线程，四个实例之间照样会超卖。真实系统里，库存这样的数据放在数据库中，原子性要交给数据库来保证，最常见的做法是把判断写进更新语句：

```sql
UPDATE product_stock SET stock = stock - 1 WHERE product_id = 42 AND stock >= 1;
```

数据库会对这一行加锁，判断和扣减在一条语句里完成。应用检查受影响的行数，为 1 表示扣减成功，为 0 表示库存不足。事务、行锁和隔离级别的细节，见 [MySQL 事务处理机制](../../database/mysql/transaction-system.md#一个可运行的扣库存事务)。

## 死锁：两个人各拿一把钥匙，都在等对方

锁能解决竞态，用错了又会带来新问题。实验第三部分模拟两笔转账：A 给 B 转账，先锁 A 的账户再锁 B 的；同时 B 给 A 转账，先锁 B 再锁 A。两个线程各拿到了第一把锁，然后都去等对方手里的那一把，谁也不会先放手。这种互相等待、永远无法推进的状态叫死锁。

死锁的发生需要几个条件同时成立：锁是独占的；线程拿着一把锁的同时去等另一把；锁不能被强行抢走；等待关系形成了一个环。破坏其中任何一条，死锁就不会发生。实际最常用的是打破环：规定所有线程都按同一个顺序加锁，比如按账户 ID 从小到大。实验里的 `ordered()` 就是这样做的，两笔转账都先锁同一个账户，后来的线程在第一把锁上等待，不会形成环，所以都顺利完成了。

另一个办法是给等锁设超时，就是实验里的 `acquire(timeout=2)`：等不到就放弃，释放已经拿到的锁，记录日志后重试或报错。它不能防止死锁形成，但能让服务从死锁里恢复，而不是永远卡住。数据库也是类似的思路：MySQL 的 InnoDB 会主动检测等待环，选择一个事务回滚，应用会收到死锁错误（错误码 1213），需要重试这个事务，详见 [锁的作用范围与死锁](../../database/mysql/transaction-system.md#锁的作用范围与死锁)。

## 服务卡住时，确认是不是死锁

死锁在监控上的表现很特别：请求超时、处理线程数不降，但 CPU 几乎为零，因为卡住的线程都在睡眠。下面的脚本去掉了超时，让两个线程真正死锁，然后从 `/proc` 里读出每个线程的状态。保存为 `deadlock.py`：

```python
import glob, os, threading, time

a, b = threading.Lock(), threading.Lock()
def transfer(first, second):
    with first:
        time.sleep(0.1)
        with second:          # 不设超时，一直等下去
            pass

threading.Thread(target=transfer, args=(a, b), daemon=True).start()
threading.Thread(target=transfer, args=(b, a), daemon=True).start()
time.sleep(1)
for task in sorted(glob.glob("/proc/self/task/*")):
    state = open(task + "/stat").read().split(") ")[1].split()[0]
    wchan = open(task + "/wchan").read()
    print(f"线程 {os.path.basename(task)}  状态 {state}  在等 {wchan if wchan != '0' else '-'}")
```

```bash
docker run --rm -v "$PWD":/lab -w /lab capacity-lab python deadlock.py
```

实际输出：

```text
线程 1  状态 R  在等 -
线程 7  状态 S  在等 futex_do_wait
线程 8  状态 S  在等 futex_do_wait
```

两个转账线程的状态都是 `S`（睡眠），都停在 `futex_do_wait`，也就是在等一把用户态锁。正在执行这段检查的主线程是 `R`。在服务器上，可以用 procps 的 `ps` 得到同样的信息：

```bash
ps -L -p PID -o lwp,stat,wchan:20,comm
```

很多线程长时间停在 `futex` 上，只能说明它们在等锁或条件变量，还要看清楚在等哪把锁、锁在谁手里，这需要语言自己的工具。Java 用 `jstack PID`，它会直接打印 “Found one Java-level deadlock” 并列出环上的线程；Python 可以用 `py-spy dump --pid PID` 打印每个线程的调用栈；Go 程序可以通过 `pprof` 的 goroutine 页面查看。找到环以后，修复方法就是上面两条：统一加锁顺序，或者给等锁设超时。

共享状态的问题解决了，订单服务的线程都在正确地干活。剩下的问题是数量：线程池到底开多大？为什么 CPU 才用到七成，响应时间就开始往上涨？下一篇：[05 线程池开多大：排队、利用率与 Little 定律](./05-pool-size-and-queueing.md)。
