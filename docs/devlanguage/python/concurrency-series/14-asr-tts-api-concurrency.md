# ASR/TTS API 并发实战：把服务端配额当成系统的一部分

> 对应视频：EP14《ASR/TTS API 并发实战》  
> 视频入口：[B站 EP14](https://www.bilibili.com/video/BV1duu76aE3i)。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。

![ASR/TTS API 并发配额账本图](/python/concurrency/ep14-api-quota-ledger.svg)

这张图把 ASR/TTS API 当成有配额和费用边界的外部系统：并发窗口、重试预算和费用账本缺一不可。

## 这篇解决什么问题

ASR/TTS API 并发要同时处理配额、错误恢复、幂等和成本。外部服务容量是系统的一部分。

## 任务状态表

执行状态和费用状态分别存储，记录attempt、provider_request_id、幂等键和结果路径。未知费用保留unknown；金额未确认时不填0。状态表需持久化后才具备重启恢复能力。

## 排查链路

同时看成功率、错误分类、P95/P99、429、duplicate、charged_failed 和 cost_total。

## 超时不等于未收费

幂等键只有在服务端承诺识别并复用同一操作时才有效；本地结果去重不能阻止服务端重复计费。请求超时后，应把执行状态与费用状态分别标记为unknown，优先用provider_request_id或幂等键查询，不能直接写charged=False。

下方是内存任务表与假API，只验证pending、running、done、unknown和cancelled的流转，不连接提供方、不执行真实账单对账。真实应用还需持久化提交前的任务身份、完整请求合同与提供方回执，金额使用Decimal或整数最小货币单位，费用由账单确认，不由“收到文本”推断。

## 实战检查清单

- 提供方是否真正支持当前幂等键与查询接口。
- 提交前的任务身份是否持久化，回执能否关联具体尝试。
- 超时后的执行与费用是否保留unknown，避免误记成未收费。
- 配额、费用预算、重复调用与账单差异是否分别观察。

## 运行示例

示例保存为`examples/ep14/asr_api_task_table.py`；目录和文件名由本地自行创建。

```python
import asyncio
from dataclasses import dataclass, asdict
from decimal import Decimal

@dataclass
class Task:
    id: str
    path: str
    attempt: int = 0
    status: str = "pending"
    billing: str = "unknown"
    cost: Decimal | None = None
    provider_request_id: str | None = None

async def fake_api(task):
    await asyncio.sleep(0.2 if task.id == "slow" else 0.01)
    return {"text": f"模拟:{task.path}", "cost": Decimal("0.01"),
            "request_id": f"fake-{task.id}"}

async def transcribe(task, sem):
    if task.status == "done":
        return task
    task.status = "pending"
    try:
        async with sem:
            task.status = "running"
            task.attempt += 1
            async with asyncio.timeout(0.05):
                result = await fake_api(task)
            task.status = "done"
            task.billing = "confirmed"
            task.cost = result["cost"]
            task.provider_request_id = result["request_id"]
    except asyncio.CancelledError:
        task.status = "cancelled"
        raise
    except TimeoutError:
        task.status = "unknown"
    except Exception:
        task.status = "failed"
    return task

async def main():
    sem = asyncio.Semaphore(2)
    tasks = [Task("a", "a.wav"), Task("slow", "slow.wav")]
    await asyncio.gather(*(transcribe(task, sem) for task in tasks))
    for task in tasks:
        print(asdict(task))

if __name__ == "__main__":
    asyncio.run(main())
```

