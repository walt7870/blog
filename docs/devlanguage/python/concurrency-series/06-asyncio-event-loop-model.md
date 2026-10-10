# asyncio 的事件循环模型：速度来自让出控制权

> 对应视频：EP06《asyncio 的事件循环模型》  
> 视频入口：[B站 EP06 定时稿](https://www.bilibili.com/video/BV1QLu76tEK1)（计划公开：2026-08-12 10:21）。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。
> 本文为视频的工程展开版，补充代码模板、排查链路、状态字段和检查清单。
> 最后核验：2026/08/09 08:26:33

视频建立事件循环心智模型。文章补充最小代码和边界判断，帮助你识别什么是真异步，什么只是写了 `async`。

![asyncio 事件循环模型图](/python/concurrency/ep06-event-loop-model.svg)

这张图说明 asyncio 的速度来自等待时让出控制权；它不是让 CPU 计算变快，而是让大量 I/O 等待可以交错推进。

## 最小模型

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

`asyncio.sleep` 代表一个非阻塞等待。真实项目里，它可以换成异步 HTTP 请求、异步数据库调用或流式 I/O。

## 关键对象

| 对象 | 作用 |
| --- | --- |
| coroutine | 可暂停、可恢复的执行过程 |
| Task | 被事件循环调度的协程 |
| event loop | 推进所有已就绪任务 |
| await | 当前协程让出控制权的位置 |

## 判断真异步

| 问题 | 如果答案是“否” |
| --- | --- |
| 使用的库是否提供异步 API | 可能只是同步阻塞 |
| 等待时是否能让出事件循环 | 其它任务会被拖住 |
| CPU 计算是否被隔离出去 | 长计算会阻塞所有协程 |
| 是否处理超时和取消 | 任务可能永久挂起 |


<!-- concurrency-series-engineering-supplement:start -->
## 工程补充：怎么把这篇用到项目里

**读图方式**

- Task 运行到 `await` 时才会把控制权还给事件循环，所以 await 点就是异步系统的调度边界。
- 如果 await 后面包的是同步阻塞函数，事件循环仍然会被占住，代码只是长得像异步。
- 事件循环要配合 timeout、取消、Semaphore 和连接池一起设计，不能只靠 `gather`。

**排查路径**

- 如果异步任务一批一批完成，优先怀疑中间有同步阻塞调用。
- 记录每个请求的 start、await_before、response、done 时间，找出真正等待和卡住的位置。
- 用 `asyncio.all_tasks()`、慢回调日志和 HTTP 客户端连接池指标定位排队。

**问题、证据和解决动作**

| 问题现场 | 先查什么 | 解决动作 |
| --- | --- | --- |
| async 后吞吐没有提升 | 是否使用同步 SDK、`time.sleep`、阻塞文件调用 | 换异步库或 `asyncio.to_thread` 隔离 |
| 任务全部堆在 gather | in-flight、连接池大小 | 加 `Semaphore` 和连接池上限 |
| 少数请求拖住整体 | 单请求 elapsed、timeout 缺失 | 每个 await 边界设置 timeout |
| 取消后资源没释放 | finally、连接关闭、临时文件 | 用 `try/finally` 收束资源 |

**落地边界**

- 不要在事件循环里做长 CPU 计算；这会让所有协程都失去调度机会。
- 异步系统的排查要保留时间线日志，否则很难看出等待和执行的区别。
<!-- concurrency-series-engineering-supplement:end -->

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

## 配套示例代码

源码文件：`examples/ep06/asyncio_event_loop_demo.py`

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

