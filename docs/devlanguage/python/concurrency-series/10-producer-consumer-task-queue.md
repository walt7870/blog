# Python 队列与流水线：让多阶段任务稳定推进

> 对应视频：EP10《生产者-消费者与任务队列》  
> 视频入口：[B站 EP10 定时稿](https://www.bilibili.com/video/BV1uEu764EYA)（计划公开：2026-08-14 09:47）。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。
> 本文为视频的工程展开版，补充代码模板、排查链路、状态字段和检查清单。
> 最后核验：2026/08/09 08:26:33

这篇文章是视频的工程展开版。视频先说明队列是什么、为什么需要它，再进入批量语音处理示例。文章补充完整模板、停止信号、失败隔离和检查清单。

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

## 最小工程代码

下方保留可直接阅读的示例代码。

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
| 不发送停止信号 | worker 一直阻塞 | 消费者不知道上游结束 | 生产者结束后发送 sentinel |
| 多个 worker 只发一个 sentinel | 只有一个 worker 退出 | 停止信号数量不足 | 按下游 worker 数传播 |
| 异常后不 `task_done` | `join` 永远不返回 | 队列计数没有归还 | 在 `finally` 里调用 |
| writer 多处写文件 | 结果缺行或乱序 | 写入状态分散 | 单写入者集中落盘 |


<!-- concurrency-series-engineering-supplement:start -->
## 工程补充：怎么把这篇用到项目里

**读图方式**

- 扫描、转码、ASR、写入最好拆成不同阶段，因为每个阶段的瓶颈和并发上限不同。
- `Queue(maxsize)` 是容量预算，不是随手填的数字；它决定系统能承受多少排队。
- sentinel、状态表和 checkpoint 决定流水线能不能优雅停止和恢复。

**排查路径**

- 持续记录每个队列的 `qsize`、put 等待时间、get 等待时间和每阶段吞吐。
- 如果某个队列持续增长，下游就是瓶颈；如果上游频繁 put 等待，背压已经生效。
- 中断恢复时核对状态表：DONE 跳过、FAILED 重试或隔离、PROCESSING 超时回收。

**问题、证据和解决动作**

| 问题现场 | 先查什么 | 解决动作 |
| --- | --- | --- |
| 扫描太快撑爆内存 | 待处理任务数、RSS | 有界队列 + 分批扫描 |
| 转码慢拖住 ASR | 转码队列长度、CPU/磁盘 util | 拆独立 worker 池，限制转码并发 |
| 写入重复或漏写 | 状态表、输出文件校验 | 单写入者 + 幂等写入 |
| 停止时丢任务 | sentinel 数量、未完成计数 | `task_done` / `join` / checkpoint |

**落地边界**

- 队列不是越大越好；队列过大只会把问题延迟暴露并放大恢复成本。
- 每个阶段都要能独立降并发、暂停和重试。
<!-- concurrency-series-engineering-supplement:end -->

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

## 结尾总结

这一集真正要留下的不是一个 `Queue` API，而是一种组织并发系统的方式。

先看问题：批量音频处理里，扫描、转码、ASR 和写入的瓶颈不同。它们如果挤进同一个并发池，资源竞争、错误传播和重试压力会混在一起。

再看结构：用 `Queue` 把阶段拆开，队列既是边界，也是压力信号。下游变慢时，队列长度通常比总耗时更早暴露问题；有界队列还能把压力传回上游。

最后看工程落地：worker 固定做“取任务、处理、交给下一段”，单独 writer 收敛结果、失败和 checkpoint。停止阶段要处理好 sentinel、`task_done` 和 `join`；失败阶段要把错误变成任务状态；运行阶段要持续观察 `qsize`、成功数、失败数、平均耗时和 P95。

当这些结构稳定以后，下一步才是限流、背压、重试和更细的调参。

## 配套示例代码

源码文件：`examples/ep10/bounded_pipeline.py`

```python
from __future__ import annotations

import queue
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable


SENTINEL = object()


@dataclass(frozen=True)
class AudioJob:
    path: Path
    attempt: int = 1


@dataclass(frozen=True)
class StageResult:
    path: Path
    status: str
    detail: str


def scan_files(paths: Iterable[Path], output: queue.Queue[AudioJob | object]) -> None:
    for path in paths:
        output.put(AudioJob(path))
    output.put(SENTINEL)


def worker(
    name: str,
    input_queue: queue.Queue[AudioJob | object],
    output_queue: queue.Queue[AudioJob | StageResult | object],
    handler: Callable[[AudioJob], AudioJob | StageResult],
    worker_count_next: int = 1,
) -> None:
    while True:
        item = input_queue.get()
        try:
            if item is SENTINEL:
                for _ in range(worker_count_next):
                    output_queue.put(SENTINEL)
                return
            result = handler(item)
            output_queue.put(result)
        except Exception as exc:
            output_queue.put(StageResult(item.path, "failed", f"{name}: {exc!r}"))
        finally:
            input_queue.task_done()


def transcode(job: AudioJob) -> AudioJob:
    time.sleep(0.05)
    return AudioJob(job.path.with_suffix(".wav"), job.attempt)


def call_asr(job: AudioJob) -> StageResult:
    time.sleep(0.08)
    if "bad" in job.path.name:
        return StageResult(job.path, "failed", "asr rejected bad audio")
    return StageResult(job.path, "success", "transcript-id")


def writer(input_queue: queue.Queue[StageResult | object], stop_count: int) -> None:
    stopped = 0
    while True:
        item = input_queue.get()
        try:
            if item is SENTINEL:
                stopped += 1
                if stopped >= stop_count:
                    return
                continue
            print(f"{item.status:7s} {item.path.name:14s} {item.detail}")
        finally:
            input_queue.task_done()


def main() -> None:
    source_files = [Path(f"audio_{index}.mp3") for index in range(6)] + [Path("bad_audio.mp3")]

    scan_to_transcode: queue.Queue[AudioJob | object] = queue.Queue(maxsize=3)
    transcode_to_asr: queue.Queue[AudioJob | StageResult | object] = queue.Queue(maxsize=2)
    asr_to_write: queue.Queue[StageResult | object] = queue.Queue(maxsize=8)

    threads = [
        threading.Thread(target=scan_files, args=(source_files, scan_to_transcode), name="scanner"),
        threading.Thread(
            target=worker,
            args=("transcode", scan_to_transcode, transcode_to_asr, transcode, 2),
            name="transcode-0",
        ),
        threading.Thread(target=worker, args=("asr", transcode_to_asr, asr_to_write, call_asr), name="asr-0"),
        threading.Thread(target=worker, args=("asr", transcode_to_asr, asr_to_write, call_asr), name="asr-1"),
        threading.Thread(target=writer, args=(asr_to_write, 2), name="writer"),
    ]

    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()


if __name__ == "__main__":
    main()
```

