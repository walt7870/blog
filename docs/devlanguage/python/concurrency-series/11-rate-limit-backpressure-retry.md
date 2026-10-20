# 并发控制：限流、背压、重试：让系统稳定推进，而不是瞬间冲垮下游

> 对应视频：EP11《并发控制：限流、背压、重试》  
> 视频入口：[B站 EP11](https://www.bilibili.com/video/BV193u76cEVb)。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。

![限流背压重试控制层图](/python/concurrency/ep11-control-layer.svg)

这张图把限流、背压、重试分成三层控制：入口承认配额，中间承认容量，失败路径承认可恢复边界。

## 这篇解决什么问题

并发控制不是让程序保守，而是把下游配额、队列容量和失败恢复变成明确规则。没有这些规则，任务越多，错误越集中，重试越容易变成新的流量。

## 工具分层

Semaphore限制同时在途，Pacer或令牌桶限制请求开始速率；有界Queue限制排队量，timeout约束等待。重试还需错误分类、退避、次数与总截止时间，服务端幂等合同决定副作用能否安全重放。

## 排查链路

先看 in-flight 和 qps，再看 429、timeout、retry_count、qsize。指标同时上涨时，先降并发或拉长退避，不要继续加 worker。

## 同时在途与请求速率

同时最多8个请求、每个请求50毫秒，理想情况下可产生约160次/秒，远高于每分钟60次的配额。Semaphore无法独自实现每分钟配额。下方Pacer用单调时钟把请求开始时间按间隔排开，再用Semaphore限制在途；它适用于单进程、单事件循环的教学场景。

每次重试重新经过Pacer，等待退避时释放Semaphore。示例把超时与模拟临时错误纳入有限重试，但真实服务超时可能已经产生副作用，必须先判断幂等或查状态。429若带Retry-After，应遵循提供方规则；多进程或多机需要共享配额，不能各自按总配额发送。

## 实战检查清单

- 在途上限、每分钟或每秒速率、队列容量是否分别配置。
- 重试是否重新经过速率门，退避期间是否释放请求槽。
- 429是否遵循提供方Retry-After，超时是否先查询副作用。
- 是否同时限定尝试次数、总截止时间和多实例共享配额。

## 运行示例

示例保存为`examples/ep11/async_rate_limit_retry.py`；目录和文件名由本地自行创建。

```python
import asyncio

class Retryable(Exception):
    pass

class Pacer:
    def __init__(self, rate):
        if rate <= 0:
            raise ValueError("rate必须大于0")
        self.interval = 1 / rate
        self.next_start = 0.0
        self.lock = asyncio.Lock()

    async def wait(self):
        async with self.lock:
            loop = asyncio.get_running_loop()
            await asyncio.sleep(max(0, self.next_start - loop.time()))
            self.next_start = loop.time() + self.interval

async def fake_call(item, attempt):
    await asyncio.sleep(0.01)
    if item % 3 == 0 and attempt == 1:
        raise Retryable("模拟临时错误")
    return {"id": item, "status": "done", "attempt": attempt}

async def call_with_retry(item, sem, pacer, attempts=3):
    if attempts < 1:
        raise ValueError("attempts必须大于0")
    for attempt in range(1, attempts + 1):
        try:
            async with sem:
                await pacer.wait()
                async with asyncio.timeout(1):
                    return await fake_call(item, attempt)
        except (Retryable, TimeoutError) as exc:
            if attempt == attempts:
                return {"id": item, "status": "failed",
                        "error": type(exc).__name__, "attempt": attempt}
            await asyncio.sleep(0.02 * 2 ** (attempt - 1))

async def main():
    sem, pacer = asyncio.Semaphore(2), Pacer(rate=50)
    results = await asyncio.gather(
        *(call_with_retry(i, sem, pacer) for i in range(6)))
    print(results)

if __name__ == "__main__":
    asyncio.run(main())
```

