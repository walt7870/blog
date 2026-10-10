# 异步任务编排：成功、失败、超时和取消怎么收敛

> 对应视频：EP07《异步任务编排》  
> 视频入口：[B站 EP07 定时稿](https://www.bilibili.com/video/BV1UJu76REqA)（计划公开：2026-08-12 20:56）。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。
> 本文为视频的工程展开版，补充代码模板、排查链路、状态字段和检查清单。
> 最后核验：2026/08/09 08:26:33

视频讲异步任务生命周期。文章补充 `gather`、`as_completed`、`timeout` 和任务状态记录的实战模板。

![异步任务编排状态机](/python/concurrency/ep07-async-task-state-machine.svg)

这张图把异步任务看成状态机：启动只是开始，成功、失败、超时、取消都要进入可追踪状态。

## 任务状态模型

| 状态 | 含义 |
| --- | --- |
| pending | 已创建，未完成 |
| success | 成功拿到结果 |
| failed | 抛出业务或程序异常 |
| timeout | 超过允许时间 |
| cancelled | 被主动取消 |

## 最小编排模板

```python
import asyncio


async def call_service(item: str) -> str:
    await asyncio.sleep(0.1)
    if item == "bad":
        raise ValueError("bad input")
    return f"{item}:ok"


async def run_one(item: str) -> tuple[str, str, str]:
    try:
        result = await asyncio.wait_for(call_service(item), timeout=1.0)
        return item, "success", result
    except TimeoutError:
        return item, "timeout", ""
    except Exception as exc:
        return item, "failed", repr(exc)


async def main() -> None:
    tasks = [asyncio.create_task(run_one(item)) for item in ["a", "bad", "c"]]
    for task in asyncio.as_completed(tasks):
        print(await task)


if __name__ == "__main__":
    asyncio.run(main())
```

## 编排方式对照

| 方式 | 适合 | 注意 |
| --- | --- | --- |
| `gather` | 等所有任务完成后统一处理 | 默认异常传播可能中断结果收集 |
| `as_completed` | 先完成先处理 | 适合流式写入结果 |
| `TaskGroup` | 结构化并发 | 适合同生命周期任务组 |
| `wait_for` / timeout | 防止永久挂起 | 超时后要记录任务状态 |


<!-- concurrency-series-engineering-supplement:start -->
## 工程补充：怎么把这篇用到项目里

**读图方式**

- 每个 Task 都应该有输入 id、attempt、timeout、状态和最后错误，方便恢复和复盘。
- `TaskGroup` 适合结构化并发，能让一组相关任务更容易一起收束。
- `gather`、`as_completed`、队列 Consumer 的选择取决于你要批量等待、逐个消费还是持续处理。

**排查路径**

- 先看 pending、running、failed、cancelled 的数量，而不是只看总任务数。
- 如果失败率上升，区分 timeout、429、网络错误、业务错误，不同错误走不同策略。
- 如果任务取消后还有外部副作用，检查 finally、幂等键和状态表更新顺序。

**问题、证据和解决动作**

| 问题现场 | 先查什么 | 解决动作 |
| --- | --- | --- |
| 一个任务失败导致结果丢失 | 异常收敛方式 | 用 `TaskGroup` 或显式结果表收束 |
| 超时任务反复重试 | attempt、next_retry_at | 重试预算 + 指数退避 |
| 取消后仍占连接 | finally 是否释放资源 | 在 finally 里关闭连接和临时文件 |
| 结果顺序错乱 | 任务 id 和结果映射 | 按 item_id 写状态，不依赖完成顺序 |

**落地边界**

- 异步编排不能只写快乐路径；失败路径才决定系统能不能长期跑。
- 状态表字段要比日志更可靠，因为日志很难作为恢复依据。
<!-- concurrency-series-engineering-supplement:end -->

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

## 配套示例代码

源码文件：`examples/ep07/async_task_orchestration.py`

```python
import asyncio


async def call_service(item: str) -> str:
    await asyncio.sleep(0.1)
    if item == "bad":
        raise ValueError("bad input")
    return f"{item}:ok"


async def run_one(item: str) -> tuple[str, str, str]:
    try:
        result = await asyncio.wait_for(call_service(item), timeout=1.0)
        return item, "success", result
    except TimeoutError:
        return item, "timeout", ""
    except Exception as exc:
        return item, "failed", repr(exc)


async def main() -> None:
    tasks = [asyncio.create_task(run_one(item)) for item in ["a", "bad", "c"]]
    for task in asyncio.as_completed(tasks):
        print(await task)


if __name__ == "__main__":
    asyncio.run(main())
```

