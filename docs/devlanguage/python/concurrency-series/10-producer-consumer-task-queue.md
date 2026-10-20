# Python 队列与流水线：让多阶段任务稳定推进

> 对应视频：EP10《生产者-消费者与任务队列》  
> 视频入口：[B站 EP10](https://www.bilibili.com/video/BV1uEu764EYA)。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。

![有界队列流水线结构图](/python/concurrency/ep10-bounded-pipeline.svg)

这张图把有界队列放在阶段之间：队列既传递任务，也传递压力，下游慢时上游必须感知并停下来。

## 这篇解决什么问题

队列在并发工程里不是简单的“列表”。它更常见的作用，是把一个多阶段任务拆成几个稳定边界：上游生产任务，下游消费任务，中间用队列传递数据和压力。

批量语音处理通常不是一个动作，而是一条链路：

```text
扫描文件 -> 转码/预处理 -> ASR 调用 -> 结果写入
```

这些阶段的瓶颈不一样。扫描可能卡磁盘，转码可能卡 CPU 和外部命令，ASR 可能卡网络和配额，写入关心顺序、幂等和 checkpoint。

如果把所有阶段丢进同一个线程池，程序看起来并发了，但压力没有边界。最快的阶段会不断制造任务，最慢的阶段会让内存、重试和失败记录一起堆起来。

## 视频核心判断

多阶段任务不能只靠一个并发池。要用有界队列把阶段拆开，让每个阶段有自己的 worker 数、失败处理和观测指标。

## 机制展开

| 元素 | 作用 | 工程意义 |
| --- | --- | --- |
| Producer | 扫描文件、读取任务表、产生任务 | 不直接做重活，只负责稳定产出 |
| Queue | 连接两个阶段 | 阶段边界，也是压力信号 |
| Consumer | 从队列取任务并处理 | 可以按阶段配置 worker 数 |
| Bounded queue | 限制队列容量 | 下游变慢时让上游等待 |
| Sentinel | 停止信号 | 保证 worker 能退出 |
| Writer | 单独写结果 | 集中处理幂等、checkpoint 和失败记录 |

## 队列容量

完整示例在本页末尾，三个队列分别限制阶段间积压。

关键结构是三段队列：

```python
scan_to_transcode = queue.Queue(maxsize=3)
transcode_to_asr = queue.Queue(maxsize=2)
asr_to_write = queue.Queue(maxsize=8)
```

`maxsize` 不是随便填的，它代表阶段之间允许积压多少任务。ASR 如果有限流，`transcode_to_asr` 就不应该无限增长。

## 停止信号

队列流水线最容易卡死在停止阶段。

| 错误写法 | 现象 | 根因 | 修正 |
| --- | --- | --- | --- |
| 不发送停止信号 | worker一直阻塞 | 不知道上游已结束 | 上一阶段全部退出后由监督者发送 |
| 多worker只收到一个sentinel | 只有一个退出 | 信号数量不足 | 监督者按本阶段worker数发送 |
| 异常后不 `task_done` | `join` 永远不返回 | 队列计数没有归还 | 在 `finally` 里调用 |
| writer 多处写文件 | 结果缺行或乱序 | 写入状态分散 | 单写入者集中落盘 |

## 失败消息与停止协议

示例只模拟转码和识别，不创建音频文件、不写持久checkpoint。成功输出和失败输出都由writer打印；StageResult到达下一阶段时直接传下去，不再当成AudioJob识别。这样转码失败不会被另一个阶段误判为成功。

停止信号由main监督者在上一阶段所有worker退出后发往下一阶段，每个下游worker各收到一个。不能让每个转码worker自行发送ASR停止信号：第一个worker结束时，另一个可能还没产出最后一个结果。示例模拟的handler错误可隔离；writer存储失败、线程意外退出仍需全局中止协议，不能把打印示例当作生产故障恢复器。

## 常见失败模式

| 错误写法 | 现象 | 根因 | 修正 |
| --- | --- | --- | --- |
| 无界队列 | 内存持续上涨 | 下游压力被隐藏 | 使用有界队列 |
| 一个池跑所有阶段 | 某阶段拖垮全局 | 不同资源混在一起抢 worker | 按阶段拆 worker |
| 失败直接抛出 | 一条坏文件中断全局 | 错误没有任务级隔离 | 转成失败结果进入状态表 |
| 不记录队列长度 | 只知道慢，不知道哪里慢 | 缺少阶段指标 | 定时记录 `qsize` |
| 重跑时从头开始 | 成本和时间浪费 | 没有 checkpoint | writer 维护状态表 |

## 实战检查清单

- 每个阶段的主要瓶颈是否写清楚。
- 每个队列是否有 `maxsize`。
- 每个 worker 是否能收到停止信号。
- 异常是否被转成任务状态，而不是直接杀掉进程。
- 是否有单独 writer 负责结果、失败和 checkpoint。
- 是否记录队列长度、成功数、失败数和阶段耗时。
- 是否能从 failed 状态恢复，而不是从头重跑。

## 读完之后能完成什么

- 能把一个大循环拆成生产者-消费者流水线。
- 能写出有界队列、停止信号和单写入者模板。
- 能通过队列长度判断哪个阶段正在成为瓶颈。
- 能为后续限流、背压和重试打好结构基础。

## 运行示例

示例保存为`examples/ep10/bounded_pipeline.py`；目录和文件名由本地自行创建。

```python
import queue
import threading
import time
from dataclasses import dataclass
from pathlib import Path

STOP = object()

@dataclass(frozen=True)
class AudioJob:
    path: Path

@dataclass(frozen=True)
class StageResult:
    path: Path
    status: str
    detail: str

def worker(source, target, handler):
    while True:
        item = source.get()
        try:
            if item is STOP:
                return
            if isinstance(item, StageResult):
                result = item
            else:
                try:
                    result = handler(item)
                except Exception as exc:
                    result = StageResult(item.path, "failed", repr(exc))
            target.put(result)
        finally:
            source.task_done()

def transcode(job):
    time.sleep(0.01)
    if "broken" in job.path.name:
        raise ValueError("转码输入损坏")
    return AudioJob(job.path.with_suffix(".wav"))

def call_asr(job):
    time.sleep(0.02)
    if "bad" in job.path.name:
        raise ValueError("识别输入被拒绝")
    return StageResult(job.path, "success", "模拟文本")

def writer(source, results):
    while True:
        item = source.get()
        try:
            if item is STOP:
                return
            results.append(item)
        finally:
            source.task_done()

def run(paths):
    q1, q2, q3 = (queue.Queue(maxsize=n) for n in (3, 2, 8))
    results = []
    transcoders = [threading.Thread(target=worker, args=(q1, q2, transcode))
                   for _ in range(2)]
    recognizers = [threading.Thread(target=worker, args=(q2, q3, call_asr))
                   for _ in range(2)]
    output = threading.Thread(target=writer, args=(q3, results))
    for thread in [*transcoders, *recognizers, output]:
        thread.start()
    for path in paths:
        q1.put(AudioJob(Path(path)))
    # 上一阶段全部退出后，才关闭下一阶段。
    for _ in transcoders:
        q1.put(STOP)
    for thread in transcoders:
        thread.join()
    for _ in recognizers:
        q2.put(STOP)
    for thread in recognizers:
        thread.join()
    q3.put(STOP)
    output.join()
    return results

if __name__ == "__main__":
    for result in run(["a.mp3", "broken.mp3", "bad.mp3", "b.mp3"]):
        print(result.status, result.path.name, result.detail)
```

