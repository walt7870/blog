# 实时语音流水线：把录音、VAD、上传、识别放进延迟预算

> 对应视频：EP16《实时语音流水线》  
> 视频入口：[B站 EP16 定时稿](https://www.bilibili.com/video/BV19Vu76fETw)（计划公开：2026-08-17 10:14）。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。
> 本文为视频的工程展开版，补充代码模板、排查链路、状态字段和检查清单。
> 最后核验：2026/08/09 08:26:33

这篇文章是视频的工程展开版。视频负责建立问题现场、工具选择和排查链路；文章补充代码模板、状态字段、指标口径和落地检查清单。

![实时语音流水线延迟预算图](/python/concurrency/ep16-realtime-latency-budget.svg)

这张图把实时语音拆成每一段延迟预算：采集、VAD、上传、识别、回写任何一段超预算都会影响体验。

## 这篇解决什么问题

实时语音的核心是延迟预算。任务不能无限排队，因为等待本身就是失败。

## 流水线结构

采集线程写 ring buffer，VAD 分片，async 上传，ASR 返回增量结果，UI 回写只保留最新状态。

## 排查链路

看 E2E P95、分段延迟、queue_wait、drop_count 和 partial_delay。

## 示例代码

下方保留可直接阅读的示例代码。

## 问题、解决方式和工具

| 问题 | 解决方式 | 工具 |
| --- | --- | --- |
| 每个阶段都只能占用一小段预算 | 实时语音的问题不是总耗时，而是每一片音频能不能及时通过。 | 采集 / VAD / 上传 / 识别 / 回写 |
| VAD 决定什么时候把声音变成任务 | VAD 解决的是减少无效上传和控制切片边界。 | speech start / speech end / silence |
| 实时队列满了，不能只等 | 实时背压要有降级策略，因为无限等待本身就是失败。 | drop old / 降采样 / 暂停上传 |
| 实时语音通常混合线程、协程和队列 | 不同阶段选不同工具，目标是延迟预算稳定。 | 线程采集 / async 上传 / 模型队列 |


<!-- concurrency-series-engineering-supplement:start -->
## 工程补充：怎么把这篇用到项目里

**读图方式**

- 实时系统要看每片音频的流动，不只看整段录音最终多久完成。
- 采集线程要保护实时性，网络和 ASR 可以异步，模型推理要用有界队列控制等待。
- partial 结果和 final 结果的延迟要分开观察，它们对应不同的用户感知。

**排查路径**

- 为每个 chunk 记录 capture_ts、vad_ts、send_ts、asr_ts、emit_ts。
- 观察 E2E p95、drop_count、queue_wait、partial_delay 和 final_delay。
- 如果延迟周期性抖动，检查 batch、网络拥塞、GC、CPU 抢占和音频缓冲区。

**问题、证据和解决动作**

| 问题现场 | 先查什么 | 解决动作 |
| --- | --- | --- |
| 识别结果总是慢半拍 | partial_delay、queue_wait | 缩短 batch 等待，优化上传和 ASR 窗口 |
| 音频丢帧或卡顿 | drop_count、capture buffer | 采集线程独立，降低下游反压影响 |
| 无声片段消耗资源 | VAD 命中率、上传字节数 | VAD 过滤和静音跳过 |
| 尾延迟偶发很高 | p99、网络 timeout、队列峰值 | 限流、降级或分离实时/批处理通道 |

**落地边界**

- 实时语音不能用批处理思维无限排队，过期结果即使最终返回也没有价值。
- 每一段延迟预算都要可观测，否则只能凭感觉调参数。
<!-- concurrency-series-engineering-supplement:end -->

## 实战检查清单

- 入口是否有容量边界，而不是无限提交。
- 任务是否有状态字段，失败是否能恢复。
- 每个重试是否有上限、退避和幂等保护。
- 是否记录吞吐、P95、错误率、队列长度和关键资源水位。
- 排查结果是否能指向具体动作：降并发、拆阶段、调 batch、隔离坏文件或回退方案。

## 结尾总结

最后把这一集收回来。

实时语音不是离线文件处理的加速版，而是多阶段在延迟预算内协作。

采集线程保持轻量，ring buffer 保存短窗口；VAD 把声音变成片段；上传和识别通过有界队列推进；过载时要丢旧片、降级或暂停非关键任务。

排查时看 E2E P95、queue_wait、drop_count 和 partial_delay，才能判断体验问题来自哪一段。

## 配套示例代码

源码文件：`examples/ep16/realtime_audio_pipeline.py`

```python
import asyncio
from collections import deque

class RingBuffer:
    def __init__(self, max_frames=100):
        self.frames = deque(maxlen=max_frames)
    def push(self, frame):
        self.frames.append(frame)
    def read_latest(self, n):
        return list(self.frames)[-n:]

async def capture(buffer, chunks):
    for i in range(chunks):
        await asyncio.sleep(0.02)
        buffer.push(f'frame-{i}')

async def vad(buffer, out_q):
    for _ in range(10):
        await asyncio.sleep(0.1)
        chunk = buffer.read_latest(5)
        if chunk:
            await out_q.put({'audio': chunk, 'deadline_ms': 500})

async def uploader(in_q):
    while True:
        item = await in_q.get()
        await asyncio.sleep(0.05)
        print('partial result', item['audio'][-1])
        in_q.task_done()

async def main():
    buffer = RingBuffer()
    q = asyncio.Queue(maxsize=4)
    worker = asyncio.create_task(uploader(q))
    await asyncio.gather(capture(buffer, 60), vad(buffer, q))
    await q.join()
    worker.cancel()

asyncio.run(main())
```

