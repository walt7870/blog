# 同步库与异步系统的边界：警惕伪异步

> 对应视频：EP08《同步库与异步系统的边界》  
> 视频入口：[B站 EP08](https://www.bilibili.com/video/BV1UJu76REeS)。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。

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

`to_thread`适合隔离等待型同步函数；这里只运行三个模拟任务，未实现持续输入的提交背压。

## 超时与实际停止的边界

to_thread使同步函数在默认线程池运行，让事件循环继续调度；它没有把同步SDK变成支持取消的SDK。外层wait_for超时只会停止等待，已启动的线程可能继续请求和写入，因此重试前需核对外部状态。

例如客户端等待1秒后放弃，但同步转写实际第3秒成功并扣费，立刻重试可能产生两次调用。为SDK配置其自身连接与读取超时，限制待执行工作量，使用服务端支持的幂等键。无法协作停止、又必须强制终止的工作应放在独立进程或外部任务系统里，并评估终止后的副作用。

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

## 运行示例

示例保存为`examples/ep08/async_to_thread_boundary.py`；目录和文件名由本地自行创建。

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

