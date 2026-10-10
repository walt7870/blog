# 性能观测与压测：别只看平均耗时，用证据证明并发真的变好

> 对应视频：EP17《性能观测与压测》  
> 视频入口：[B站 EP17 定时稿](https://www.bilibili.com/video/BV1VGu76hEvU)（计划公开：2026-08-17 19:08）。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。
> 本文为视频的工程展开版，补充代码模板、排查链路、状态字段和检查清单。
> 最后核验：2026/08/09 08:26:33

这篇文章是视频的工程展开版。视频负责建立问题现场、工具选择和排查链路；文章补充代码模板、状态字段、指标口径和落地检查清单。

![并发压测证据闭环图](/python/concurrency/ep17-benchmark-evidence-loop.svg)

这张图强调证据闭环：先建 baseline，再做单变量实验，采集指标和资源曲线，最后留下可复现结论。

## 这篇解决什么问题

并发优化需要证据闭环。平均耗时下降不够，必须同时看尾延迟、错误率和资源水位。

## Benchmark 模板

固定输入、建立 baseline、重复运行、记录 throughput、P95/P99、error_rate、资源占用。

## 排查链路

把指标翻译成动作：降并发、限流、拆阶段、调 batch、扩容或优化下游。

## 示例代码

下方保留可直接阅读的示例代码。

## 问题、解决方式和工具

| 问题 | 解决方式 | 工具 |
| --- | --- | --- |
| 平均耗时下降，P95 和错误率可能变差 | 单一指标会隐藏尾部延迟、失败和资源占用。 | avg / P95 / errors / CPU/RSS |
| 吞吐、尾延迟、错误率要一起看 | 指标口径解决的是判断标准：快、稳、省资源必须同时成立。 | 吞吐 / P95/P99 / 错误率 / 队列长度 |
| 系统资源告诉你瓶颈有没有被转移 | 资源观测解决的是并发优化有没有把压力推到别处。 | CPU / RSS / disk I/O / network / GPU |
| 每次只改一个关键参数 | 对照实验解决的是因果判断，避免同时改太多无法解释。 | max_workers / queue_size / timeout / batch_size |


<!-- concurrency-series-engineering-supplement:start -->
## 工程补充：怎么把这篇用到项目里

**读图方式**

- 压测不是把并发调到最大，而是找出吞吐、延迟、错误率和成本之间的拐点。
- 每次只改一个变量，例如 `max_workers`、batch_size、timeout 或重试预算。
- 实验结论必须带输入数据、环境、参数、指标和回滚建议。

**排查路径**

- 基础指标至少包括 throughput、avg latency、p95/p99、error_rate、qsize、CPU/RSS/GPU。
- 如果平均值变好但 p99 变差，要优先解释尾部任务为什么变慢。
- 如果吞吐到某点不再提升，同时错误率上升，这个点就是并发上限附近。

**问题、证据和解决动作**

| 问题现场 | 先查什么 | 解决动作 |
| --- | --- | --- |
| 只看总耗时 | 吞吐、p95/p99、错误率 | 建立多指标报告 |
| 每次改多个参数 | 实验记录、diff | 单变量实验，保留 baseline |
| 压测无法复现 | 数据集、随机种子、环境 | 固定输入和运行环境 |
| 优化后线上更不稳 | 资源曲线、队列峰值 | 用 canary 和回滚阈值上线 |

**落地边界**

- 没有记录的优化等于没有发生，因为无法复盘也无法回滚。
- 压测数据要和真实任务形态接近，不能只用过小或过干净的样本。
<!-- concurrency-series-engineering-supplement:end -->

## 实战检查清单

- 入口是否有容量边界，而不是无限提交。
- 任务是否有状态字段，失败是否能恢复。
- 每个重试是否有上限、退避和幂等保护。
- 是否记录吞吐、P95、错误率、队列长度和关键资源水位。
- 排查结果是否能指向具体动作：降并发、拆阶段、调 batch、隔离坏文件或回退方案。

## 结尾总结

最后把这一集收回来。

并发优化不是改完代码就结束，而是用证据证明系统更快、更稳。

先建立 baseline，再固定输入做对照实验；同时看 throughput、P95/P99、error_rate、qsize、CPU、RSS、磁盘、网络和 GPU。

结果必须能指向动作：降并发、加背压、拆阶段、调 batch，或者承认瓶颈在外部服务。

## 配套示例代码

源码文件：`examples/ep17/concurrency_benchmark.py`

```python
import statistics
import time
from dataclasses import dataclass

@dataclass
class Result:
    latency: float
    failed: bool = False

def percentile(values, p):
    values = sorted(values)
    index = int((len(values) - 1) * p / 100)
    return values[index]

def execute(worker_count):
    results = []
    for i in range(100):
        started = time.perf_counter()
        time.sleep(0.001)
        results.append(Result(time.perf_counter() - started, failed=(i % 37 == 0)))
    return results

def run_case(name, worker_count):
    started = time.perf_counter()
    results = execute(worker_count)
    elapsed = time.perf_counter() - started
    latencies = [r.latency for r in results]
    return {
        'name': name,
        'throughput': len(results) / elapsed,
        'avg': statistics.mean(latencies),
        'p95': percentile(latencies, 95),
        'errors': sum(r.failed for r in results),
    }

print(run_case('baseline', 1))
```

