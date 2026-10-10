# 并发控制：限流、背压、重试：让系统稳定推进，而不是瞬间冲垮下游

> 对应视频：EP11《并发控制：限流、背压、重试》  
> 视频入口：[B站 EP11 定时稿](https://www.bilibili.com/video/BV193u76cEVb)（计划公开：2026-08-14 21:12）。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。
> 本文为视频的工程展开版，补充代码模板、排查链路、状态字段和检查清单。
> 最后核验：2026/08/09 08:26:33

这篇文章是视频的工程展开版。视频负责建立问题现场、工具选择和排查链路；文章补充代码模板、状态字段、指标口径和落地检查清单。

![限流背压重试控制层图](/python/concurrency/ep11-control-layer.svg)

这张图把限流、背压、重试分成三层控制：入口承认配额，中间承认容量，失败路径承认可恢复边界。

## 这篇解决什么问题

并发控制不是让程序保守，而是把下游配额、队列容量和失败恢复变成明确规则。没有这些规则，任务越多，错误越集中，重试越容易变成新的流量。

## 工具分层

Semaphore 管同时在路上的请求；有界 Queue 管排队容量和背压；timeout 管等待边界；backoff 管可恢复错误；幂等键和状态表管重复副作用。

## 排查链路

先看 in-flight 和 qps，再看 429、timeout、retry_count、qsize。指标同时上涨时，先降并发或拉长退避，不要继续加 worker。

## 示例代码

下方保留可直接阅读的示例代码。

## 问题、解决方式和工具

| 问题 | 解决方式 | 工具 |
| --- | --- | --- |
| 一秒提交五百个任务，配额只有每分钟六十个 | 429、timeout 和重试风暴，常常来自客户端没有承认配额存在。 | 请求太快 / 失败集中出现 / 重试继续放大压力 |
| 有界队列让上游知道下游已经慢了 | 背压解决的是排队失控：队列满时，上游等待，而不是继续制造任务。 | maxsize 是容量预算 / put 等待是保护 / qsize 是压力信号 |
| 重试只应该处理可恢复错误 | 重试解决的是瞬时失败，不是业务错误，也不是无限试探。 | 错误分类 / 指数退避 / 重试预算 |
| 幂等键让重试不会变成重复副作用 | 状态表解决的是恢复和去重：每次调用都要能被追踪。 | item_id / attempt / next_retry_at |


<!-- concurrency-series-engineering-supplement:start -->
## 工程补充：怎么把这篇用到项目里

**读图方式**

- 限流控制的是进入下游的速度和并发窗口，常用 `Semaphore`、token bucket 或连接池上限。
- 背压控制的是排队容量，有界 Queue 满时让上游等待，而不是继续制造任务。
- 重试只处理可恢复错误，并且必须有退避、预算和幂等保护。

**排查路径**

- 先看 QPS、in-flight、429、timeout、retry_count 是否一起上涨。
- 如果队列长度持续增长，先找最慢下游，不要把重试当作吞吐优化。
- 重试后结果重复时，检查 idempotency_key、任务状态表和写入事务。

**问题、证据和解决动作**

| 问题现场 | 先查什么 | 解决动作 |
| --- | --- | --- |
| 一加并发就 429 | QPS、服务端配额、in-flight | Semaphore/token bucket 限流 |
| 下游慢导致内存堆积 | qsize、put_wait、RSS | 有界 Queue 传递背压 |
| 失败任务立刻大量重试 | retry_count、错误分类 | 指数退避 + retry budget |
| 重复扣费或重复写入 | idempotency_key、状态表 | 幂等键 + 结果去重 |

**落地边界**

- 限流不是保守，而是把服务端边界纳入客户端设计。
- 背压和重试要一起看，否则重试会绕过背压制造新压力。
<!-- concurrency-series-engineering-supplement:end -->

## 实战检查清单

- 入口是否有容量边界，而不是无限提交。
- 任务是否有状态字段，失败是否能恢复。
- 每个重试是否有上限、退避和幂等保护。
- 是否记录吞吐、P95、错误率、队列长度和关键资源水位。
- 排查结果是否能指向具体动作：降并发、拆阶段、调 batch、隔离坏文件或回退方案。

## 结尾总结

最后把这一集收回来。

我们先看到问题：并发请求打爆配额后，429、timeout 和重试会互相放大。

解决时分层处理：Semaphore 控制并发窗口，有界 Queue 传递背压，timeout 切断等待，backoff 和 retry budget 控制重试，idempotency_key 避免重复副作用。

真正上线前，要用 in-flight、qps、429、timeout、qsize 和 retry_count 验证系统是不是稳定推进。

## 配套示例代码

源码文件：`examples/ep11/async_rate_limit_retry.py`

```python
import asyncio
import random

class Retryable(Exception):
    pass

async def fake_call(item):
    await asyncio.sleep(0.05)
    if random.random() < 0.15:
        raise Retryable('429 or timeout')
    return {'id': item, 'status': 'done'}

async def call_with_retry(item, sem, attempts=3):
    for attempt in range(1, attempts + 1):
        try:
            async with sem:
                async with asyncio.timeout(1):
                    return await fake_call(item)
        except Retryable as exc:
            if attempt == attempts:
                return {'id': item, 'status': 'failed', 'error': str(exc), 'attempt': attempt}
            await asyncio.sleep(0.1 * 2 ** (attempt - 1))

async def main():
    sem = asyncio.Semaphore(8)
    results = await asyncio.gather(*(call_with_retry(i, sem) for i in range(30)))
    print(results[:5], '...', len(results))

asyncio.run(main())
```

