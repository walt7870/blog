# 本地模型/GPU 推理并发：管理 batch、显存和等待队列，而不是盲目多开 worker

> 对应视频：EP15《本地模型/GPU 推理并发》  
> 视频入口：[B站 EP15 定时稿](https://www.bilibili.com/video/BV1XVu76fEqH)（计划公开：2026-08-16 20:23）。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。
> 本文为视频的工程展开版，补充代码模板、排查链路、状态字段和检查清单。
> 最后核验：2026/08/09 08:26:33

这篇文章是视频的工程展开版。视频负责建立问题现场、工具选择和排查链路；文章补充代码模板、状态字段、指标口径和落地检查清单。

![GPU 推理 batch 队列图](/python/concurrency/ep15-gpu-batch-queue.svg)

这张图把 GPU 推理拆成入口队列、batcher、模型执行和指标反馈；并发管理的是 batch、显存和等待，而不是线程数量。

## 这篇解决什么问题

本地模型推理的并发核心是调度 GPU，而不是复制模型或无限排队。

## Batch 策略

batch_size 提高吞吐，max_wait_ms 守住延迟，显存水位决定上限。离线和在线策略不同。

## 排查链路

看 gpu_util、memory、queue_wait_ms、batch_size、P95 和 OOM。

## 示例代码

下方保留可直接阅读的示例代码。

## 问题、解决方式和工具

| 问题 | 解决方式 | 工具 |
| --- | --- | --- |
| GPU 利用率不稳，显存却接近满载 | 多开 worker 不一定提高吞吐，可能只是复制模型和放大显存。 | 显存满 / 请求排队 / 延迟上升 |
| 有界队列保护显存和延迟 | 请求队列解决入口压力，batcher 解决 GPU 吞吐。 | maxsize / drop/slowdown / priority |
| 显存决定 batch 上限，也决定是否能多模型共存 | 显存监控解决 OOM 风险和模型加载成本判断。 | nvidia-smi / reserved / allocated |
| 离线追吞吐，在线守延迟 | 目标不同，队列和 batch 策略也不同。 | offline / online / deadline |


<!-- concurrency-series-engineering-supplement:start -->
## 工程补充：怎么把这篇用到项目里

**读图方式**

- 本地模型通常应该少量常驻 worker 复用模型，而不是为每个请求复制一份模型。
- batch_size 提高吞吐，max_wait_ms 控制等待，二者共同决定延迟和 GPU 利用率。
- 队列长度和显存水位决定是否继续接收任务、降 batch 或拒绝请求。

**排查路径**

- 用 `nvidia-smi`、框架内存指标、queue_wait、infer_time、p95 延迟一起看。
- GPU 利用率低但 queue_wait 高，可能是 batcher、前处理或锁在阻塞。
- 显存接近上限时，不要加 worker，先看模型份数、batch_size 和缓存释放。

**问题、证据和解决动作**

| 问题现场 | 先查什么 | 解决动作 |
| --- | --- | --- |
| 多开 worker 后 OOM | 显存、模型实例数 | 复用模型，减少 worker，限制 batch |
| GPU 利用率低 | preprocess_time、batch_wait | 合并 batch，优化前处理 |
| 延迟突然变高 | queue_wait、batch_size、max_wait_ms | 按延迟预算调 batcher |
| 吞吐高但体验差 | p95/p99、超时率 | 设置最大排队时间和拒绝策略 |

**落地边界**

- GPU 并发的目标是稳定吞吐和可控延迟，不是让所有请求同时进入模型。
- 显存水位要作为硬边界，不能等 OOM 后再靠重启恢复。
<!-- concurrency-series-engineering-supplement:end -->

## 实战检查清单

- 入口是否有容量边界，而不是无限提交。
- 任务是否有状态字段，失败是否能恢复。
- 每个重试是否有上限、退避和幂等保护。
- 是否记录吞吐、P95、错误率、队列长度和关键资源水位。
- 排查结果是否能指向具体动作：降并发、拆阶段、调 batch、隔离坏文件或回退方案。

## 结尾总结

最后把这一集收回来。

本地模型并发先要承认 GPU 和显存是硬边界。

入口用有界队列保护系统，batcher 用 batch_size 和 max_wait_ms 平衡吞吐与延迟，显存水位决定能不能继续加 batch 或多开模型。

排查时看 gpu_util、memory、queue_wait、batch_size 和 P95，才能知道问题在入口、预处理、batch 还是显存。

## 配套示例代码

源码文件：`examples/ep15/gpu_batch_queue.py`

```python
import asyncio
import time

async def run_model(batch):
    await asyncio.sleep(0.03 + 0.005 * len(batch))
    return [f'result:{x}' for x in batch]

async def batcher(queue, batch_size=8, max_wait_ms=25):
    while True:
        item = await queue.get()
        batch = [item]
        deadline = time.perf_counter() + max_wait_ms / 1000
        while len(batch) < batch_size:
            timeout = max(0, deadline - time.perf_counter())
            if timeout == 0:
                break
            try:
                batch.append(await asyncio.wait_for(queue.get(), timeout))
            except asyncio.TimeoutError:
                break
        print(await run_model(batch))
        for _ in batch:
            queue.task_done()

async def main():
    queue = asyncio.Queue(maxsize=64)
    worker = asyncio.create_task(batcher(queue))
    for i in range(20):
        await queue.put(i)
    await queue.join()
    worker.cancel()

asyncio.run(main())
```

