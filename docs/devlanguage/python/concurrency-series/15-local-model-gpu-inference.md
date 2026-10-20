# 本地模型/GPU 推理并发：管理 batch、显存和等待队列，而不是盲目多开 worker

> 对应视频：EP15《本地模型/GPU 推理并发》  
> 视频入口：[B站 EP15](https://www.bilibili.com/video/BV1XVu76fEqH)。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。

![GPU 推理 batch 队列图](/python/concurrency/ep15-gpu-batch-queue.svg)

这张图把 GPU 推理拆成入口队列、batcher、模型执行和指标反馈；并发管理的是 batch、显存和等待，而不是线程数量。

## 这篇解决什么问题

本地模型推理的并发核心是调度 GPU，而不是复制模型或无限排队。

## Batch 策略

增大batch_size可能提高吞吐，也可能OOM或拖慢尾延迟；max_wait_ms只约束组批等待，不等于端到端超时。还需单独限制入口排队、推理时间和结果返回时间。

## 排查链路

看 gpu_util、memory、queue_wait_ms、batch_size、P95 和 OOM。

## 调度示例的范围

下方run_model用sleep模拟模型，只演示有界入口、最大批量和首项到达后的最大组批等待。它不测GPU显存，也不保证真实模型可以异步调用。把同步推理函数直接放进async函数仍会阻塞循环，需由专用推理worker承接。

20项输入在batch_size=8时形成不超过8项的若干批，每项只能出现一次。TaskGroup监督batcher：模型异常会让整组失败并取消join等待，避免worker已死但主任务永久等队列归零。成功后显式取消并等待空闲worker。生产环境还需把每个请求结果或错误送回对应Future，检查deadline和取消状态；task_done仅代表队列记账完成。

## 实战检查清单

- 组批上限、组批等待、入口容量与端到端截止时间是否分开。
- 模型是否复用，输入字节、时长与显存是否有预算。
- 模型失败会否让等待方收到错误，join是否能退出。
- 每项请求结果是否按编号回传，取消和过期请求是否收尾。

## 运行示例

示例保存为`examples/ep15/gpu_batch_queue.py`；目录和文件名由本地自行创建。

```python
import asyncio

async def run_model(batch):
    await asyncio.sleep(0.01)
    return [f"result:{item}" for item in batch]

async def batcher(queue, results, batch_size=8, max_wait_ms=25):
    if batch_size < 1 or max_wait_ms < 0:
        raise ValueError("非法组批参数")
    loop = asyncio.get_running_loop()
    while True:
        batch = [await queue.get()]
        try:
            deadline = loop.time() + max_wait_ms / 1000
            while len(batch) < batch_size:
                remaining = deadline - loop.time()
                if remaining <= 0:
                    break
                try:
                    batch.append(await asyncio.wait_for(queue.get(), remaining))
                except TimeoutError:
                    break
            output = await run_model(batch)
            if len(output) != len(batch):
                raise ValueError("模型结果数与输入不一致")
            results.extend(zip(batch, output))
        finally:
            for _ in batch:
                queue.task_done()

async def main():
    queue, results = asyncio.Queue(maxsize=16), []
    async with asyncio.TaskGroup() as group:
        worker = group.create_task(batcher(queue, results))
        for item in range(20):
            await queue.put(item)
        await queue.join()
        worker.cancel()
    return results

if __name__ == "__main__":
    print(asyncio.run(main()))
```

