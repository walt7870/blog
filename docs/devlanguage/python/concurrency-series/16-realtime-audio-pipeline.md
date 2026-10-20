# 实时语音流水线：把录音、VAD、上传、识别放进延迟预算

> 对应视频：EP16《实时语音流水线》  
> 视频入口：[B站 EP16](https://www.bilibili.com/video/BV19Vu76fETw)。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。

![实时语音流水线延迟预算图](/python/concurrency/ep16-realtime-latency-budget.svg)

这张图把实时语音拆成每一段延迟预算：采集、VAD、上传、识别、回写任何一段超预算都会影响体验。

## 这篇解决什么问题

实时语音的核心是延迟预算。任务不能无限排队，因为等待本身就是失败。

## 流水线结构

真实系统可用采集线程、受限桥接入口、模型要求的分段器、上传连接与结果汇聚。partial可覆盖同一句的旧草稿，final应按句段标识保存，不能只保留整场会话的最后一次结果。

## 排查链路

看 E2E P95、分段延迟、queue_wait、drop_count 和 partial_delay。

## 先区分实时传输与语音切段

ASR流式协议可能需要连续音频、静音上下文或明确的结束标志，不能把所有无声帧直接丢弃。断网或过载时也不能随意降采样后仍沿用原格式声明。需要无损转写时，应停止会话并记录缺口，或先落盘稍后补传；允许丢旧帧的交互模式必须告知下游序号缺失并重置受影响状态。

下方只模拟20毫秒一帧的采集、顺序队列和上传，不是真实麦克风、ring buffer或VAD实现。每帧带递增序号与单调时间戳，截止时间从采集时刻计算，而不是填一个从未判断的deadline字段。单调时钟只在当前进程内比较，跨主机观测用各段耗时和对齐后的时间信息。

## 实战检查清单

- 音频格式、序号、时间基准与协议EOF是否一致。
- 采集桥接与队列是否受限，过载是否留下明确缺口。
- 每帧截止时间是否从采集计算，是否真的判断过期。
- partial是否只覆盖对应句段，final是否完整保存。

## 运行示例

示例保存为`examples/ep16/realtime_audio_pipeline.py`；目录和文件名由本地自行创建。

```python
import asyncio

async def capture(queue, chunks=12):
    loop = asyncio.get_running_loop()
    for sequence in range(chunks):
        captured_at = loop.time()
        await queue.put({"sequence": sequence, "captured_at": captured_at,
                         "deadline": captured_at + 0.5})
        await asyncio.sleep(0.02)
    await queue.put(None)

async def uploader(queue, observed):
    loop = asyncio.get_running_loop()
    expected = 0
    while True:
        item = await queue.get()
        try:
            if item is None:
                return
            if item["sequence"] != expected:
                raise ValueError("音频序号不连续")
            if loop.time() >= item["deadline"]:
                raise TimeoutError("音频在上传前已过期")
            await asyncio.sleep(0.005)
            if loop.time() >= item["deadline"]:
                raise TimeoutError("上传结果超过截止时间")
            observed.append(item["sequence"])
            expected += 1
        finally:
            queue.task_done()

async def main():
    queue, observed = asyncio.Queue(maxsize=4), []
    async with asyncio.TaskGroup() as group:
        group.create_task(capture(queue))
        group.create_task(uploader(queue, observed))
    await queue.join()
    return observed

if __name__ == "__main__":
    print(asyncio.run(main()))
```

