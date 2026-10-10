# 线程安全与共享状态：别让任务完成但结果写错

> 对应视频：EP05《线程安全与共享状态》  
> 视频入口：[B站 EP05 定时稿](https://www.bilibili.com/video/BV1QLu76tEfa)（计划公开：2026-08-11 16:27）。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。
> 本文为视频的工程展开版，补充代码模板、排查链路、状态字段和检查清单。
> 最后核验：2026/08/09 08:26:33

视频讲共享状态为什么会让线程池结果不稳定。文章给出三种实战策略：避免共享、队列汇聚、必要时加锁。

![线程安全共享状态策略图](/python/concurrency/ep05-shared-state-strategies.svg)

这张图的核心是先减少共享，再考虑加锁；共享状态越少，线程安全问题越容易定位和复现。

## 三种策略

| 策略 | 适合场景 | 优先级 |
| --- | --- | --- |
| 避免共享 | 每个任务能独立返回结果 | 最高 |
| 队列汇聚 | 多 worker，单写入者落盘 | 高 |
| Lock | 必须修改共享对象 | 谨慎使用 |

## 单写入者模板

```python
from queue import Queue
from threading import Thread

STOP = object()


def writer(results: Queue, output: list[str]) -> None:
    while True:
        item = results.get()
        try:
            if item is STOP:
                return
            output.append(item)
        finally:
            results.task_done()


def main() -> list[str]:
    results: Queue = Queue()
    output: list[str] = []
    thread = Thread(target=writer, args=(results, output))
    thread.start()

    for item in ["a", "b", "c"]:
        results.put(f"processed:{item}")

    results.put(STOP)
    results.join()
    thread.join()
    return output
```

生产环境里，`output.append` 可以换成写 JSONL、写数据库或写任务状态表。


<!-- concurrency-series-engineering-supplement:start -->
## 工程补充：怎么把这篇用到项目里

**读图方式**

- 优先让 worker 返回结果，由主线程统一合并，这是最容易测试的方案。
- 需要写文件或数据库时，尽量设计单写入者，让多个 worker 只负责生产消息。
- 必须共享计数器或缓存时，再用 `Lock` 保护最小临界区，并记录锁等待时间。

**排查路径**

- 如果结果偶发缺失或重复，先查共享列表、共享 dict、文件追加和数据库写入。
- 用小数据集重复跑几百次，比用大数据跑一次更容易复现竞态。
- 遇到死锁时记录线程名、锁获取顺序和任务输入，必要时用 `faulthandler.dump_traceback_later`。

**问题、证据和解决动作**

| 问题现场 | 先查什么 | 解决动作 |
| --- | --- | --- |
| 结果数量偶尔不对 | 共享容器写入位置 | 改为 worker 返回值，主线程合并 |
| 日志或结果文件互相覆盖 | 写文件路径、打开模式 | 单写入者 Queue + writer 线程 |
| 加锁后吞吐下降明显 | 锁保护范围、锁等待时间 | 缩小临界区或拆分状态 |
| 任务互相等待不结束 | 锁顺序、线程栈 | 统一加锁顺序，避免锁内调用外部函数 |

**落地边界**

- 锁是最后一层保护，不是共享状态设计的借口。
- 越靠近业务结果的写入，越要保持幂等和可重放。
<!-- concurrency-series-engineering-supplement:end -->

## 常见失败模式

| 错误写法 | 现象 | 修正 |
| --- | --- | --- |
| worker 同时写一个文件 | 丢行、乱序、文件损坏 | 单写入者 |
| 共享计数器无锁自增 | 统计不准确 | 主线程汇总或 Lock |
| 多线程共享数据库连接 | 偶发事务和连接错误 | 每线程连接或连接池 |
| 到处加锁 | 程序变慢，甚至死锁 | 重新设计数据流 |

## 实战检查清单

- worker 是否只返回结果，不直接改全局状态。
- 是否只有一个组件负责结果落盘。
- Queue 是否有停止信号。
- 写入失败是否能记录并恢复。
- 锁保护的代码块是否足够小。

## 读完之后能完成什么

- 能识别线程池中的共享状态风险。
- 能用 Queue 设计单写入者结果收集。
- 能判断什么时候该避免共享，什么时候才需要锁。

## 配套示例代码

源码文件：`examples/ep05/single_writer.py`

```python
from queue import Queue
from threading import Thread

STOP = object()


def writer(results: Queue, output: list[str]) -> None:
    while True:
        item = results.get()
        try:
            if item is STOP:
                return
            output.append(item)
        finally:
            results.task_done()


def main() -> list[str]:
    results: Queue = Queue()
    output: list[str] = []
    thread = Thread(target=writer, args=(results, output))
    thread.start()

    for item in ["a", "b", "c"]:
        results.put(f"processed:{item}")

    results.put(STOP)
    results.join()
    thread.join()
    return output


if __name__ == "__main__":
    print(main())
```

