# asyncio 的事件循环模型：速度来自让出控制权

> 对应视频：EP06《asyncio 的事件循环模型》  
> 视频入口：[B站 EP06](https://www.bilibili.com/video/BV1QLu76tEK1)。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。

视频建立事件循环心智模型。文章补充最小代码和边界判断，帮助你识别什么是真异步，什么只是写了 `async`。

![asyncio 事件循环模型图](/python/concurrency/ep06-event-loop-model.svg)

这张图说明 asyncio 的速度来自等待时让出控制权；它不是让 CPU 计算变快，而是让大量 I/O 等待可以交错推进。

## 最小模型

`asyncio.sleep` 代表一个非阻塞等待。真实项目里，它可以换成异步 HTTP 请求、异步数据库调用或流式 I/O。

## 关键对象

| 对象 | 作用 |
| --- | --- |
| coroutine | 可暂停、可恢复的执行过程 |
| Task | 被事件循环调度的协程 |
| event loop | 推进所有已就绪任务 |
| await | 等待可等待对象；尚未就绪时暂停当前协程 |

## 判断真异步

| 问题 | 如果答案是“否” |
| --- | --- |
| 使用的库是否提供异步 API | 可能只是同步阻塞 |
| 等待时是否能让出事件循环 | 其它任务会被拖住 |
| CPU 计算是否被隔离出去 | 长计算会阻塞所有协程 |
| 是否处理超时和取消 | 任务可能永久挂起 |

## await不总是发生切换

协程对象被创建后不会自动运行，需await它或创建Task。Task被调度后会持续执行，直到遇到真正尚未完成的等待，才允许其他任务推进；await一个立即返回的协程或已完成Future可能不会切换。

示例用0.1、0.2、0.3秒定时器模拟I/O，通常先打印b，再c，再a；调度和系统负载会影响实际时间，不应把精确耗时写成验收值。异步HTTP替换sleep时，还要复用客户端连接池，并设置连接、读取和整体截止时间。

## 常见失败模式

| 错误写法 | 现象 | 修正 |
| --- | --- | --- |
| `async def` 里调用同步 requests | 事件循环卡住 | 换异步 HTTP 客户端或用线程隔离 |
| 协程里跑长 CPU 循环 | 所有任务延迟上升 | 放进进程池或优化计算 |
| 创建协程但不 await | 任务没有真正执行或异常丢失 | create_task 后统一收集 |
| 没有超时 | 某个请求永久挂起 | 使用 timeout 控制生命周期 |

## 实战检查清单

- 是否确认 I/O 库支持异步。
- 是否能指出每个 `await` 在等什么。
- 是否有超时和取消策略。
- 是否避免 CPU 密集代码进入事件循环。
- 是否收集了每个 Task 的结果或异常。

## 读完之后能完成什么

- 能解释事件循环如何推进多个等待中的任务。
- 能识别伪异步。
- 能为 ASR/TTS API 并发打下心智模型。

## 运行示例

示例保存为`examples/ep06/asyncio_event_loop_demo.py`；目录和文件名由本地自行创建。

```python
import asyncio

async def call_api(name: str, delay: float) -> str:
    await asyncio.sleep(delay)
    return f"{name}:done"

async def main() -> None:
    tasks = [
        asyncio.create_task(call_api("a", 0.3)),
        asyncio.create_task(call_api("b", 0.1)),
        asyncio.create_task(call_api("c", 0.2)),
    ]

    for task in asyncio.as_completed(tasks):
        print(await task)

if __name__ == "__main__":
    asyncio.run(main())
```

