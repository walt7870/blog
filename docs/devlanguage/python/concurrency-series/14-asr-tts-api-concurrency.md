# ASR/TTS API 并发实战：把服务端配额当成系统的一部分

> 对应视频：EP14《ASR/TTS API 并发实战》  
> 视频入口：[B站 EP14 定时稿](https://www.bilibili.com/video/BV1duu76aE3i)（计划公开：2026-08-16 11:19）。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。
> 本文为视频的工程展开版，补充代码模板、排查链路、状态字段和检查清单。
> 最后核验：2026/08/09 08:26:33

这篇文章是视频的工程展开版。视频负责建立问题现场、工具选择和排查链路；文章补充代码模板、状态字段、指标口径和落地检查清单。

![ASR/TTS API 并发配额账本图](/python/concurrency/ep14-api-quota-ledger.svg)

这张图把 ASR/TTS API 当成有配额和费用边界的外部系统：并发窗口、重试预算和费用账本缺一不可。

## 这篇解决什么问题

ASR/TTS API 并发要同时处理配额、错误恢复、幂等和成本。外部服务容量是系统的一部分。

## 任务状态表

记录 status、attempt、charged、cost、idempotency_key 和结果路径。这样可以恢复，也能查重复扣费。

## 排查链路

同时看成功率、错误分类、P95/P99、429、duplicate、charged_failed 和 cost_total。

## 示例代码

下方保留可直接阅读的示例代码。

## 问题、解决方式和工具

| 问题 | 解决方式 | 工具 |
| --- | --- | --- |
| 错误率上升，可能是客户端没有控制节奏 | API 变慢时，客户端如果继续加压，错误会被自己放大。 | timeout / 429 / 重复生成 |
| 状态表让部分失败可以继续恢复 | 状态表解决的是断点恢复和重复调用防护。 | pending / running / done / failed / charged |
| 重试要按错误分类，不按情绪分类 | 恢复策略解决的是哪些任务能再试，哪些任务必须人工处理。 | 429 backoff / timeout retry / bad audio failed |
| 费用账本也是并发控制的一部分 | 成本控制解决的是批量任务在失败和重试中继续可控。 | 预算 / token/seconds / 重复调用 |


<!-- concurrency-series-engineering-supplement:start -->
## 工程补充：怎么把这篇用到项目里

**读图方式**

- 入口先做去重和幂等键，避免同一音频片段被重复提交和重复扣费。
- 并发窗口控制 in-flight，QPS 控制单位时间请求量，timeout 控制单次等待边界。
- 费用账本要区分成功收费、失败收费、重试收费和重复请求。

**排查路径**

- 记录 item_id、attempt、provider_request_id、status、latency、cost、error_type。
- 429 上升时先看 QPS 和 in-flight；timeout 上升时再看音频时长、服务端耗时和网络。
- 对比 success_rate、p95、cost_total，避免用更高成本换来不稳定吞吐。

**问题、证据和解决动作**

| 问题现场 | 先查什么 | 解决动作 |
| --- | --- | --- |
| 请求越多失败越多 | 429、QPS、in-flight | 降并发，按配额限流 |
| 超时后不知道是否收费 | provider_request_id、账单字段 | 状态表 + 费用账本 |
| 重试产生重复结果 | idempotency_key、item_id | 去重写入，重试前查状态 |
| 长音频拖住窗口 | duration、latency p95 | 切片、分级队列或单独限流 |

**落地边界**

- 外部 API 的并发上限不是客户端自己决定的，必须以服务端配额和错误反馈为准。
- 任何会扣费的调用都要先设计幂等和账本。
<!-- concurrency-series-engineering-supplement:end -->

## 实战检查清单

- 入口是否有容量边界，而不是无限提交。
- 任务是否有状态字段，失败是否能恢复。
- 每个重试是否有上限、退避和幂等保护。
- 是否记录吞吐、P95、错误率、队列长度和关键资源水位。
- 排查结果是否能指向具体动作：降并发、拆阶段、调 batch、隔离坏文件或回退方案。

## 结尾总结

最后把这一集收回来。

ASR/TTS API 并发不能只看请求数量。

先用 Semaphore 和 timeout 控制请求边界，再用 backoff、retry budget 和错误分类控制恢复，接着用状态表、幂等键和缓存避免重复副作用。

上线前要用成功率、429、P95、duplicate、charged_failed 和 cost_total 验证系统是否真的稳定。

## 配套示例代码

源码文件：`examples/ep14/asr_api_task_table.py`

```python
import asyncio
from dataclasses import dataclass, asdict

@dataclass
class Task:
    id: str
    path: str
    attempt: int = 0
    status: str = 'pending'
    charged: bool = False
    cost: float = 0.0

async def fake_api(task):
    await asyncio.sleep(0.05)
    return {'text': f'transcript for {task.path}', 'cost': 0.01}

async def transcribe(task, sem):
    task.attempt += 1
    task.status = 'running'
    try:
        async with sem:
            async with asyncio.timeout(2):
                result = await fake_api(task)
        task.status = 'done'
        task.charged = True
        task.cost += result['cost']
    except Exception:
        task.status = 'failed'
    return task

async def main():
    sem = asyncio.Semaphore(5)
    tasks = [Task(str(i), f'audio-{i}.wav') for i in range(20)]
    done = await asyncio.gather(*(transcribe(t, sem) for t in tasks))
    print([asdict(x) for x in done[:3]])

asyncio.run(main())
```

