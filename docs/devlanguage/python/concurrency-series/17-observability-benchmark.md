# 性能观测与压测：别只看平均耗时，用证据证明并发真的变好

> 对应视频：EP17《性能观测与压测》  
> 视频入口：[B站 EP17](https://www.bilibili.com/video/BV1VGu76hEvU)。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。

![并发压测证据闭环图](/python/concurrency/ep17-benchmark-evidence-loop.svg)

这张图强调证据闭环：先建 baseline，再做单变量实验，采集指标和资源曲线，最后留下可复现结论。

## 这篇解决什么问题

并发优化需要证据闭环。平均耗时下降不够，必须同时看尾延迟、错误率和资源水位。

## Benchmark 模板

固定输入、建立 baseline、重复运行、记录 throughput、P95/P99、error_rate、资源占用。

## 排查链路

把指标翻译成动作：降并发、限流、拆阶段、调 batch、扩容或优化下游。

## 统计口径与到达模型

下方真正使用ThreadPoolExecutor，比较1与4个worker。模拟工作每项睡眠5毫秒，每37项确定失败一次，因此100项始终是97成功、3失败；这只演示统计与并发，不代表网络或模型压测。延迟从提交开始计时，包含等待线程的排队，不能只统计worker内部的sleep。

throughput同时给出完成吞吐和成功吞吐，错误率分母是全部100次请求；P95采用最近秩法ceil(0.95N)，不在失败请求上静默删样本。小样本的P99波动很大，要记录样本数。线程池不断补工作属于闭环负载，不能直接证明固定外部到达率下的容量；线上还需按目标到达率发压并统计拒绝、超时与未完成请求。

## 实战检查清单

- 实际执行是否使用并发参数，输入和环境是否固定。
- 延迟是否包含排队，失败和拒绝是否进入统计分母。
- P95/P99算法、样本数、完成吞吐和成功吞吐是否明确。
- 负载是闭环还是固定到达率，结论是否限定到相同条件。

## 运行示例

示例保存为`examples/ep17/concurrency_benchmark.py`；目录和文件名由本地自行创建。

```python
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from math import ceil
import statistics
import time

@dataclass
class Result:
    latency: float
    failed: bool

def percentile(values, p):
    if not values or not 0 < p <= 100:
        raise ValueError("需要非空样本，且0 < p <= 100")
    values = sorted(values)
    return values[ceil(len(values) * p / 100) - 1]

def work(index, submitted_at):
    time.sleep(0.005)
    return Result(time.perf_counter() - submitted_at, index % 37 == 0)

def execute(worker_count):
    with ThreadPoolExecutor(max_workers=worker_count) as pool:
        futures = [pool.submit(work, i, time.perf_counter()) for i in range(100)]
        return [future.result() for future in futures]

def run_case(worker_count):
    started = time.perf_counter()
    results = execute(worker_count)
    elapsed = time.perf_counter() - started
    errors = sum(result.failed for result in results)
    latencies = [result.latency for result in results]
    return {"workers": worker_count, "count": len(results), "elapsed": elapsed,
            "completed_per_second": len(results) / elapsed,
            "success_per_second": (len(results) - errors) / elapsed,
            "avg": statistics.mean(latencies), "p95": percentile(latencies, 95),
            "errors": errors, "error_rate": errors / len(results)}

if __name__ == "__main__":
    for workers in (1, 4):
        print(run_case(workers))
```

