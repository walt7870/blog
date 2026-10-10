# GIL、free-threading 与未来选型：运行时会变，工程判断顺序不会变

> 对应视频：EP18《GIL、free-threading 与未来选型》  
> 视频入口：[B站 EP18 定时稿](https://www.bilibili.com/video/BV1QGu768Ed4)（计划公开：2026-08-18 11:06）。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。
> 本文为视频的工程展开版，补充代码模板、排查链路、状态字段和检查清单。
> 最后核验：2026/08/09 08:26:33

这篇文章是视频的工程展开版。视频负责建立问题现场、工具选择和排查链路；文章补充代码模板、状态字段、指标口径和落地检查清单。

![GIL 与 free-threading 选型顺序图](/python/concurrency/ep18-runtime-selection-future.svg)

这张图把 GIL 和 free-threading 放回工程选型顺序里：运行时会变化，但瓶颈诊断、兼容验证和渐进迁移不会消失。

## 这篇解决什么问题

GIL 和 free-threading 容易被口号化。文章把它放回工程选型：先看任务瓶颈，再看库生态和运行时边界。

## 选型顺序

I/O 等待优先考虑 asyncio 或线程池；纯 Python CPU 任务考虑进程池或 free-threaded 验证；GPU 推理考虑 batch queue。

## 迁移验证

建立 baseline，小范围 canary，检查扩展兼容、线程安全、speedup、P95 和错误率。

## 示例代码

下方保留可直接阅读的示例代码。

## 问题、解决方式和工具

| 问题 | 解决方式 | 工具 |
| --- | --- | --- |
| 默认 CPython 下，纯 Python CPU 线程通常不能多核并行 | GIL 影响的是 Python 字节码执行，不等于线程在所有场景都没用。 | I/O thread / CPU Python / C extension |
| 很多性能来自原生库，不来自 Python 线程本身 | 释放 GIL 的库要实测，因为不同函数行为不同。 | NumPy / PyTorch / ffmpeg / native code |
| free-threaded 构建提高上限，也带来兼容边界 | free-threading 解决一部分线程并行限制，但不替代工程控制。 | Python 3.13+ / experimental / compatibility |
| 新运行时要小范围验证，不要全局赌一把 | 迁移策略解决的是兼容风险和收益验证。 | baseline / canary / fallback / compat |


<!-- concurrency-series-engineering-supplement:start -->
## 工程补充：怎么把这篇用到项目里

**读图方式**

- 先确认瓶颈属于 I/O、CPU、GPU、API 还是内存，再讨论 free-threaded Python 是否有帮助。
- free-threading 可能提高部分多线程 CPU 场景上限，但也会暴露依赖库和共享状态的线程安全问题。
- 迁移必须小范围验证，保留 fallback，不要把运行时升级当成并发控制的替代品。

**排查路径**

- 用 baseline 比较默认运行时和 free-threaded 运行时的吞吐、延迟、错误率和资源占用。
- 重点检查 C 扩展、科学计算库、模型库、数据库驱动和 SDK 的兼容状态。
- 对共享状态密集代码做竞态测试和压力测试，观察偶发错误是否增加。

**问题、证据和解决动作**

| 问题现场 | 先查什么 | 解决动作 |
| --- | --- | --- |
| 以为升级运行时就能提速 | 瓶颈分类、CPU util | 先确认是否 CPU 线程并行受限 |
| 依赖库不兼容 | 安装和运行错误、官方支持状态 | 建立兼容清单和 fallback |
| 线程安全问题增多 | 竞态复现、共享状态 | 减少共享、加锁或改为单写入者 |
| 收益不稳定 | 多轮 benchmark、p95/p99 | canary 验证，达标再扩大 |

**落地边界**

- free-threading 是新的工程选项，不是所有并发问题的统一答案。
- 越接近生产，越要保守地验证依赖、状态和回滚路径。
<!-- concurrency-series-engineering-supplement:end -->

## 实战检查清单

- 入口是否有容量边界，而不是无限提交。
- 任务是否有状态字段，失败是否能恢复。
- 每个重试是否有上限、退避和幂等保护。
- 是否记录吞吐、P95、错误率、队列长度和关键资源水位。
- 排查结果是否能指向具体动作：降并发、拆阶段、调 batch、隔离坏文件或回退方案。

## 结尾总结

最后把整个系列收回来。

GIL、free-threading、子解释器和第三方库都会影响 Python 并发的上限。

但工程判断的顺序不会变：先看瓶颈，再选模型，再限制压力，再验证结果。

能把这个顺序走完整，线程、协程、进程、队列、语音流水线和压测指标，就不再是一堆分散技巧，而是一套可以迁移到真实项目里的调度能力。

## 配套示例代码

源码文件：`examples/ep18/runtime_decision_table.py`

```python
def choose_model(task):
    if task.get('waits_on_network'):
        return 'asyncio + Semaphore + timeout'
    if task.get('waits_on_files_or_commands'):
        return 'ThreadPoolExecutor or command pool + Queue'
    if task.get('cpu_python_heavy'):
        return 'ProcessPoolExecutor or free-threaded CPython experiment'
    if task.get('native_library'):
        return 'measure GIL release and internal thread pool first'
    if task.get('gpu_inference'):
        return 'batch queue + GPU metrics'
    return 'measure bottleneck before choosing'

cases = [
    {'waits_on_network': True},
    {'cpu_python_heavy': True},
    {'gpu_inference': True},
]
for case in cases:
    print(case, '=>', choose_model(case))
```

