# 同步库与异步系统的边界：警惕伪异步

> 对应视频：EP08《同步库与异步系统的边界》  
> 视频入口：[B站 EP08 定时稿](https://www.bilibili.com/video/BV1UJu76REeS)（计划公开：2026-08-13 11:34）。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。
> 本文为视频的工程展开版，补充代码模板、排查链路、状态字段和检查清单。
> 最后核验：2026/08/09 08:26:33

视频解释为什么 `async def` 里放同步阻塞函数会拖住事件循环。文章给出识别清单和隔离模板。

![同步阻塞函数进入异步系统的隔离边界](/python/concurrency/ep08-sync-blocking-boundary.svg)

这张图把同步阻塞函数隔离到边界外：异步主流程负责调度，阻塞 I/O、CPU 计算和模型推理由专门池或队列承接。

## 阻塞来源

| 来源 | 风险 | 处理方式 |
| --- | --- | --- |
| 同步 HTTP 客户端 | 网络等待堵住事件循环 | 换异步客户端或 `to_thread` |
| 大文件同步读写 | 文件 I/O 堵住事件循环 | 分块、线程池、队列 |
| CPU 计算 | 长时间不让出控制权 | 进程池或原生库 |
| ffmpeg 调用 | 外部进程等待 | 有界命令池 |
| 本地模型推理 | CPU/GPU 资源排队 | 有界队列和 batch |

## 隔离同步函数

```python
import asyncio
from time import sleep


def blocking_call(item: str) -> str:
    sleep(0.2)
    return f"{item}:done"


async def run_one(item: str) -> str:
    return await asyncio.to_thread(blocking_call, item)


async def main() -> None:
    results = await asyncio.gather(*(run_one(item) for item in ["a", "b", "c"]))
    print(results)


if __name__ == "__main__":
    asyncio.run(main())
```

`to_thread` 适合隔离等待型同步函数。CPU 密集任务需要另行判断。


<!-- concurrency-series-engineering-supplement:start -->
## 工程补充：怎么把这篇用到项目里

**读图方式**

- 判断一个函数是否适合留在事件循环里，看它是否会长时间不让出控制权。
- 同步 SDK、文件阻塞调用可以用 `asyncio.to_thread` 隔离，CPU 计算更适合进程池或原生库。
- GPU 推理不是简单丢到线程池，通常要用有界队列、batch 和显存水位控制。

**排查路径**

- 开启 asyncio debug 或记录慢回调，找出事件循环被阻塞的时间段。
- 在同步函数前后记录 elapsed，超过几十毫秒的路径都要评估隔离。
- 如果隔离后线程池被打满，继续查连接池、磁盘、CPU 或 GPU，而不是无限加线程。

**问题、证据和解决动作**

| 问题现场 | 先查什么 | 解决动作 |
| --- | --- | --- |
| 事件循环突然卡住 | 慢回调日志、同步函数耗时 | `asyncio.to_thread` 或换异步库 |
| CPU 函数拖慢所有请求 | CPU util、函数热点 | `ProcessPoolExecutor` 或原生库 |
| 同步 SDK 无法取消 | timeout 是否真正生效 | 在线程边界加超时和状态回收 |
| 模型推理请求排队爆炸 | queue_wait、显存、batch_size | 有界队列 + batcher + 拒绝策略 |

**落地边界**

- 不要因为函数声明成 async 就默认它安全，关键看内部有没有阻塞调用。
- 隔离边界也要有限流，否则只是把阻塞从事件循环转移到另一个池里。
<!-- concurrency-series-engineering-supplement:end -->

## 常见失败模式

| 错误写法 | 现象 | 修正 |
| --- | --- | --- |
| async 函数里直接 `requests.get` | 所有协程一起变慢 | 用异步 HTTP 客户端 |
| async 函数里跑长循环 | 事件循环无响应 | 放进进程池 |
| 不区分等待和计算 | 模型选择混乱 | 回到瓶颈判断 |
| 阻塞任务无限丢给线程 | 线程数和内存上涨 | 有界池和队列 |

## 实战检查清单

- 是否知道每个 `await` 具体等待什么。
- 是否检查过同步库是否支持异步替代。
- 是否把阻塞函数隔离出事件循环。
- 是否限制了隔离池的并发数。
- 是否区分 I/O 阻塞和 CPU 计算。

## 读完之后能完成什么

- 能识别伪异步。
- 能把等待型同步函数隔离到线程。
- 能判断何时需要进入进程池或外部命令池。

## 配套示例代码

源码文件：`examples/ep08/async_to_thread_boundary.py`

```python
import asyncio
from time import sleep


def blocking_call(item: str) -> str:
    sleep(0.2)
    return f"{item}:done"


async def run_one(item: str) -> str:
    return await asyncio.to_thread(blocking_call, item)


async def main() -> None:
    results = await asyncio.gather(*(run_one(item) for item in ["a", "b", "c"]))
    print(results)


if __name__ == "__main__":
    asyncio.run(main())
```

