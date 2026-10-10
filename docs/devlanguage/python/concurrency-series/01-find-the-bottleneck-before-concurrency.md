# 先判断瓶颈：I/O、CPU、API、GPU、内存

> 对应视频：EP01《先判断瓶颈》  
> 视频入口：[B站 EP01 定时稿](https://www.bilibili.com/video/BV1uYu56JErn)（计划公开：2026-08-09 20:18）。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。
> 本文为视频的工程展开版，补充代码模板、排查链路、状态字段和检查清单。
> 最后核验：2026/08/09 08:26:33
> 示例代码：`examples/ep01/diagnostic_probe.py`  
> 最后核验：2026-08-01

视频负责建立主线：并发选型之前，先跑一条诊断证据链。文章在视频基础上补全工具、命令、指标解释和排查分支，让你能把这套方法用到批量文件、语音转码、ASR/TTS、本地模型推理等任务里。

![并发选型前的瓶颈证据链](/python/concurrency/ep01-bottleneck-evidence-chain.svg)

这张图强调的是证据链：先让慢任务可复现，再拆阶段、采指标、看日志，最后才把结论翻译成线程池、协程、进程池或队列。

## 这篇解决什么问题

这篇解决的是并发选型之前的诊断问题：同样叫“慢”，到底是 I/O 等待、CPU 计算、API 限流、GPU 排队，还是内存堆积。

原来的理论判断仍然成立：

- 等网络或外部服务，可能适合线程池或 `asyncio`。
- 等磁盘，通常要控制批大小和文件并发。
- CPU 正在计算，默认 CPython 下不能指望线程池自动提速。
- API 被限流，关键是限流、退避和幂等，而不是继续加 worker。
- GPU、显存或内存排队，关键是 batch、有界队列和水位控制。

但实战不能只停在分类。你需要回答三个更具体的问题：

1. 证据从哪里来？
2. 看到某种现象后，下一步查什么？
3. 查完之后，怎么把证据翻译成并发模型？

## 一条可复用的排查链路

建议把排查顺序固定成五步：

```text
baseline
  → stage probe
  → system metrics
  → Python profiler / API logs
  → one-change concurrency experiment
```

### 1. baseline：先让问题可复现

不要一上来调线程数。先固定三件事：

- 固定输入数据：同一批文件、同一批接口请求、同一批模型输入。
- 固定并发参数：worker 数、队列长度、batch size、重试次数都先不要变。
- 固定运行环境：同一台机器、同一套依赖、同一个外部服务配额窗口。

然后至少跑三组：

| 版本 | 目的 |
| --- | --- |
| 顺序版本 | 确认没有并发干扰时每个阶段多慢 |
| 低并发版本 | 看并发是否开始带来收益 |
| 当前版本 | 对比瓶颈是否已经转移 |

### 2. stage probe：先定位到阶段

只看总耗时太粗。批量语音任务至少要拆成：

```text
扫描目录 → 读取文件 → 转码/切片 → ASR/TTS 调用 → 结果写入
```

每个阶段先记录：

- 阶段耗时：`perf_counter`
- 成功数和失败数
- 错误类型、HTTP 状态码、重试次数
- RSS 内存水位
- 队列长度：如果已经用了 `Queue`

最小探针代码：

```python
from contextlib import contextmanager
from dataclasses import dataclass
from time import perf_counter
import os
import resource


@dataclass
class StageStat:
    name: str
    elapsed: float
    rss_mb: float
    ok: bool
    error: str | None = None


def rss_mb() -> float:
    usage = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    if os.uname().sysname == "Darwin":
        return usage / 1024 / 1024
    return usage / 1024


@contextmanager
def probe(stage: str, sink: list[StageStat]):
    start = perf_counter()
    try:
        yield
    except Exception as exc:
        sink.append(StageStat(stage, perf_counter() - start, rss_mb(), False, type(exc).__name__))
        raise
    else:
        sink.append(StageStat(stage, perf_counter() - start, rss_mb(), True))
```

这不是完整监控，但足够把“慢”定位到某个阶段。

### 3. system metrics：再看资源是否到上限

阶段耗时告诉你慢在哪，系统指标告诉你为什么慢。

| 怀疑对象 | 常用工具 | 重点看什么 | 下一步 |
| --- | --- | --- | --- |
| CPU | `top`、`htop`、活动监视器 | 核心是否打满，是否只有单核高 | CPU 高再看 profiler |
| 磁盘 | `iostat`、`dstat` | 吞吐、等待、读写是否抖动 | 降低文件并发，分批扫描 |
| 内存 | `ps`、`vmstat`、活动监视器 | RSS 是否随任务数持续上涨 | 查队列、缓存、中间结果 |
| 网络 | 接口耗时、连接数、超时率 | 是否大量等待外部响应 | 线程池/`asyncio`/连接池 |
| GPU | `nvidia-smi`、框架日志 | 显存、利用率、batch 耗时 | 调 batch、预处理和队列 |

常用命令示例：

```bash
top -o cpu
ps -o pid,ppid,%cpu,%mem,rss,command -p <PID>
iostat 1
vmstat 1
nvidia-smi dmon -s pucm
```

macOS 上没有默认 `iostat -xz` 和 `nvidia-smi`，可以先用活动监视器、`top`、`iostat 1`、`powermetrics` 或具体框架的 GPU/Metal 日志替代。

### 4. profiler / API logs：进入具体证据

#### CPU 高：用 profiler

离线脚本：

```bash
python -m cProfile -o out.prof job.py
python -m pstats out.prof
```

看这些字段：

- `cumtime`：函数及其子调用累计耗时。
- `tottime`：函数自身耗时。
- `ncalls`：调用次数是否异常。

运行中的长任务：

```bash
py-spy top --pid <PID>
py-spy record -o flame.svg --pid <PID>
```

内存分配：

```bash
python -X tracemalloc job.py
```

如果 CPU 并不高，不要急着用 profiler 找 Python 函数热点；问题可能在 I/O、外部命令、API 或下游队列。

#### API 慢：拆状态码和重试

ASR/TTS 这类外部 API，要分开记录：

- 首次请求耗时
- 重试后耗时
- `2xx`、`4xx`、`429`、`5xx` 数量
- 超时数量
- `Retry-After`
- 每分钟请求数和失败率

如果并发升高以后 `429` 和重试次数一起升高，通常不是客户端不够快，而是服务端在告诉你降速。正确方向是：

- `asyncio.Semaphore` 或令牌桶限流
- 指数退避
- 幂等写入
- 失败任务状态表

#### 队列和内存：看是否堆积

多阶段任务要记录每个队列的：

- `qsize`
- 入队速率
- 出队速率
- 每个阶段 worker 数
- 队列满时等待次数

判断方式：

| 现象 | 判断 | 动作 |
| --- | --- | --- |
| 某队列持续上涨 | 下游处理不过来 | 降上游、加下游、拆阶段 |
| 队列长期为空 | 上游供给不足或 worker 过多 | 查上游瓶颈 |
| RSS 跟队列一起涨 | 任务对象或中间结果堆积 | 有界队列、流式处理 |
| 重试队列暴涨 | 失败风暴 | 限流、退避、熔断 |

## 理论分类与工具证据怎么对应

| 瓶颈 | 典型现象 | 证据来源 | 初步模型 |
| --- | --- | --- | --- |
| 网络 I/O | CPU 低，请求等待长 | 阶段耗时、超时率、连接数 | 线程池或 `asyncio` |
| 磁盘 I/O | 并发越高读写越抖 | `iostat`、阶段耗时、队列长度 | 有界线程池、分批 |
| CPU | 核心持续高占用 | `top`、`cProfile`、`py-spy` | 进程池、原生库、外部工具 |
| API 限流 | `429`、超时、重试增加 | 状态码、`Retry-After`、重试表 | `asyncio` + 限流 |
| GPU | 显存接近满载，请求排队 | `nvidia-smi`、batch 耗时 | 有界队列 + batch |
| 内存 | 任务越跑占用越高 | RSS、`tracemalloc`、`qsize` | 流式处理、背压、checkpoint |

## 从证据到选型

| 看到的证据 | 判断 | 推荐动作 |
| --- | --- | --- |
| CPU 低、请求耗时高 | I/O 等待 | 线程池或 `asyncio`，再看库是否支持异步 |
| CPU 核心打满，热点在 Python 函数 | CPU 计算瓶颈 | 进程池、C 扩展、NumPy、外部命令 |
| CPU 低，磁盘等待高 | 磁盘 I/O 瓶颈 | 降文件并发、分批扫描、避免一次性读入 |
| `429` 随并发升高 | API 配额瓶颈 | 限流、退避、任务状态表 |
| 队列持续上涨 | 下游吞吐不足 | 调整阶段 worker、有界队列、背压 |
| RSS 持续上涨 | 内存或任务堆积 | 流式处理、减少缓存、checkpoint |
| GPU 利用率低但总耗时高 | 数据供给或预处理不足 | 查 CPU/磁盘/预处理队列 |
| GPU 显存满 | batch 或模型并发过高 | 降 batch、复用模型、控制并发 |


<!-- concurrency-series-engineering-supplement:start -->
## 工程补充：怎么把这篇用到项目里

**读图方式**

- 从左到右读：baseline 解决“到底有多慢”，stage probe 解决“慢在哪一步”，system metrics 解决“哪个资源先满”。
- profiler 和日志不是替代关系：`py-spy` 看 Python 在干什么，API 日志看外部服务是否把你挡住。
- 模型选择只在证据之后发生；没有证据时增加并发数，通常只是把失败更快地制造出来。

**排查路径**

- 先跑 1 worker、2 workers、4 workers 三组小实验，记录每阶段耗时和失败率。
- CPU 低但耗时高，优先查网络、磁盘、API 等待；CPU 高且单函数占比高，再考虑进程池或原生库。
- 如果 p95/p99 上涨快于平均值，说明系统已经出现排队或尾部阻塞。

**问题、证据和解决动作**

| 问题现场 | 先查什么 | 解决动作 |
| --- | --- | --- |
| CPU 很低，总耗时很长 | per-stage elapsed、socket/API 等待 | 线程池或 `asyncio`，并加 timeout |
| CPU 打满，加线程没收益 | `py-spy top`、`cProfile` 热点 | 进程池、外部命令或向量化库 |
| 并发一上去就 429 | QPS、in-flight、429 频率 | `asyncio.Semaphore`、退避、配额账本 |
| GPU 利用率忽高忽低 | `nvidia-smi`、queue_wait、batch_size | 有界队列、batcher、显存水位保护 |

**落地边界**

- 诊断脚本要固定输入数据，否则每次实验不具备可比性。
- 不要只看单次最快结果，要看多次运行的中位数和尾延迟。
<!-- concurrency-series-engineering-supplement:end -->

## 常见失败模式

| 错误写法 | 现象 | 根因 | 修正 |
| --- | --- | --- | --- |
| 只看总耗时 | 不知道慢在哪一段 | 没有分阶段计时 | 为扫描、转码、API、写入分别记录耗时 |
| 看到慢就加线程 | CPU、内存、磁盘或错误率上升 | 没有确认资源瓶颈 | 先跑 baseline 和系统指标 |
| CPU 任务用线程池硬堆 | 任务很多但不提速 | 默认 CPython GIL 和计算瓶颈 | 改进程池、外部工具或原生库 |
| API 任务无限并发 | `429` 和超时越来越多 | 服务端配额被当成无限资源 | Semaphore、退避、任务状态表 |
| 一次加载所有文件 | 内存持续上涨 | 没有流式处理和批次边界 | 分批扫描、有界队列、checkpoint |
| profiler 一上来就用 | 热点看起来很多但方向不清 | 没有先定位阶段和资源 | 先做阶段探针和系统观测 |

## 实战检查清单

- 是否保留顺序版本作为 baseline。
- 是否按阶段记录耗时，而不是只记录总耗时。
- 是否记录错误率、状态码和重试次数。
- 是否记录队列长度和 RSS。
- 是否用系统工具确认 CPU、磁盘、内存、GPU 哪个先到上限。
- CPU 高时，是否用 `cProfile` 或 `py-spy` 找函数级证据。
- 内存上涨时，是否用 `tracemalloc` 或对象统计定位来源。
- API 失败时，是否区分首请求、重试、`429`、超时和 `5xx`。
- 每次调参是否只改一个变量。
- 是否同时看吞吐、P95、错误率和资源曲线。

## 读完之后能完成什么

- 能把慢任务拆成阶段并标出主要资源。
- 能用工具拿到 I/O、CPU、API、GPU、内存瓶颈的证据。
- 能区分等待型、计算型、限流型和堆积型问题。
- 能在写并发代码前给出初步选型理由。

线程数不是第一个该调的旋钮。先跑证据链，再做模型选择。

## 配套示例代码

源码文件：`examples/ep01/diagnostic_probe.py`

```python
from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass
from time import perf_counter, sleep
import os
import resource


@dataclass
class StageStat:
    name: str
    elapsed: float
    rss_mb: float
    ok: bool
    error: str | None = None


def rss_mb() -> float:
    usage = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    if os.uname().sysname == "Darwin":
        return usage / 1024 / 1024
    return usage / 1024


@contextmanager
def probe(stage: str, sink: list[StageStat]):
    start = perf_counter()
    try:
        yield
    except Exception as exc:
        sink.append(StageStat(stage, perf_counter() - start, rss_mb(), False, type(exc).__name__))
        raise
    else:
        sink.append(StageStat(stage, perf_counter() - start, rss_mb(), True))


def process_one_audio(stats: list[StageStat]) -> None:
    with probe("read", stats):
        sleep(0.03)

    with probe("transcode", stats):
        sum(i * i for i in range(150_000))

    with probe("asr", stats):
        sleep(0.08)

    with probe("write", stats):
        sleep(0.01)


if __name__ == "__main__":
    stats: list[StageStat] = []
    for _ in range(3):
        process_one_audio(stats)

    for item in stats:
        status = "ok" if item.ok else f"failed:{item.error}"
        print(f"{item.name:10s} {item.elapsed:8.4f}s rss={item.rss_mb:7.1f}MB {status}")
```

