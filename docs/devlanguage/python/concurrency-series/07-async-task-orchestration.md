# 异步任务编排：成功、失败、超时和取消怎么收敛

> 对应视频：EP07《异步任务编排》  
> 视频入口：[B站 EP07](https://www.bilibili.com/video/BV1UJu76REqA)。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。

视频讲异步任务生命周期。文章补充 `gather`、`as_completed`、`timeout` 和任务状态记录的实战模板。

![异步任务编排状态机](/python/concurrency/ep07-async-task-state-machine.svg)

这张图把异步任务看成状态机：启动只是开始，成功、失败、超时、取消都要进入可追踪状态。

## 任务状态模型

| 状态 | 含义 |
| --- | --- |
| pending | 业务任务等待调度 |
| running | 业务操作进行中 |
| success | 成功拿到结果并完成约定保存 |
| failed | 抛出业务或程序异常 |
| timeout | 超过允许时间 |
| cancelled | 被主动取消 |

## 编排方式对照

| 方式 | 适合 | 注意 |
| --- | --- | --- |
| `gather` | 保留输入顺序聚合 | 默认传播首个异常，其余任务继续运行 |
| `as_completed` | 先完成先处理 | 适合流式写入结果 |
| `TaskGroup`（3.11+） | 整组共同收尾 | 一个普通异常会取消其余子任务 |
| `wait_for` / timeout | 防止永久挂起 | 超时后要记录任务状态 |

## 失败传播与取消

下方模拟a成功、bad业务失败、slow超时，并将三种结果逐个输出。外部取消另行捕获CancelledError，用于记录后继续抛出，保证上层还能停止整组任务；不能把取消伪装成普通失败返回。wait_for等待取消清理，实际返回时刻可能超过设置的超时值。

gather默认在首个异常时向等待方传播，但不会因此自动取消其余任务。TaskGroup会在某个子任务发生普通异常时取消其他子任务，并在退出时等待收尾、抛出异常组；它适合整组共同成功的操作。批量独立文件应在子任务内部记录可预期的单项失败，保留其他成功结果。

## 常见失败模式

| 错误写法 | 现象 | 修正 |
| --- | --- | --- |
| create_task 后不收集 | 异常丢失或后台警告 | 保存 Task 并 await |
| 所有失败都全局中断 | 批量任务浪费已成功结果 | 记录单任务状态 |
| 没有超时 | 少数任务永久挂起 | 每个外部调用设置 timeout |
| 取消后不清理资源 | 连接或文件句柄泄漏 | 使用 finally 清理 |

## 实战检查清单

- 每个 Task 是否都有归宿。
- 是否区分失败、超时和取消。
- 部分成功结果是否会保存。
- 一项失败是否应该影响整组任务。
- 是否有重试前的状态记录。

## 读完之后能完成什么

- 能组织一组异步任务并收敛结果。
- 能为批量 ASR/TTS 调用设计状态模型。
- 能根据业务语义选择 gather、as_completed 或 TaskGroup。

## 运行示例

示例保存为`examples/ep07/async_task_orchestration.py`；目录和文件名由本地自行创建。

```python
import asyncio

async def call_service(item):
    await asyncio.sleep(0.2 if item == "slow" else 0.01)
    if item == "bad":
        raise ValueError("bad input")
    return f"{item}:ok"

async def run_one(item):
    try:
        result = await asyncio.wait_for(call_service(item), timeout=0.05)
        return item, "success", result
    except TimeoutError:
        return item, "timeout", ""
    except asyncio.CancelledError:
        print(item, "cancelled")
        raise
    except Exception as exc:
        return item, "failed", repr(exc)

async def main():
    tasks = [asyncio.create_task(run_one(x)) for x in ["a", "bad", "slow"]]
    for task in asyncio.as_completed(tasks):
        print(await task)

if __name__ == "__main__":
    asyncio.run(main())
```

