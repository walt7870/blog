# 线程与线程池实战：把等待时间叠起来

> 对应视频：EP04《线程与线程池实战》  
> 视频入口：[B站 EP04](https://www.bilibili.com/video/BV1Dju76oEu9)。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。

视频解释线程池适合等待型任务。文章给出 `ThreadPoolExecutor` 的实战模板：限制线程数和待执行窗口，收集结果与异常。

![线程池任务生命周期](/python/concurrency/ep04-threadpool-lifecycle.svg)

这张图把线程池拆成提交、等待、收敛、异常和复盘五步；线程池的难点不在启动线程，而在受控地结束每个任务。

## 什么时候适合线程池

| 场景 | 是否适合 | 说明 |
| --- | --- | --- |
| 批量请求 HTTP 接口 | 适合 | 等网络，线程可推进其它任务 |
| 读取大量小文件 | 适合但要限并发 | 受磁盘能力影响 |
| 调用外部命令并等待 | 适合但要限并发 | 同时受 CPU、磁盘和进程数影响 |
| 纯 Python 计算 | 通常不适合 | 默认 CPython 下会受 GIL 影响 |
| 写同一个结果文件 | 不直接适合 | 需要单写入者或锁 |

## 提交窗口与线程数是两个上限

max_workers=2只限制运行线程，未执行的Future仍可能堆满内存。下方模板每次至多提交两倍worker数，完成一批再接收下一批；这是分批背压，会等待当前批最慢任务，吞吐未必最优，但不会持有全量Future。

示例按完成顺序返回，不保证输入顺序；需要稳定排序时同时返回输入编号。results仍保存全部结果，超大输出应改成单写入者逐条落盘。future.result的超时、Future.cancel都不能强制停止已经运行的线程，with退出还会等待它；真正的请求超时必须配置在HTTP/SDK调用内部。

## 常见失败模式

| 错误写法 | 现象 | 修正 |
| --- | --- | --- |
| 不读取 `future.result()` | 异常被藏在 Future 里 | 用 `as_completed` 收集结果和异常 |
| `max_workers` 随便开很大 | 内存、连接数、磁盘压力上升 | 从小并发压测，观察瓶颈 |
| 所有任务一次性提交 | 大批任务常驻内存 | 分批提交或使用队列 |
| 多线程直接写同一文件 | 结果错乱或丢行 | 单写入者模式 |

## 实战检查清单

- 是否有 `max_workers` 上限。
- 是否读取了每个 Future 的结果。
- 是否记录失败任务。
- 是否避免多个线程直接写同一份结果。
- 是否用顺序版本做过基准对照。

## 读完之后能完成什么

- 能写出可收集异常的线程池模板。
- 能判断线程池适不适合当前任务。
- 能避免把线程池当作无限加速按钮。

## 运行示例

示例保存为`examples/ep04/threadpool_template.py`；目录和文件名由本地自行创建。

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
from itertools import islice

def handle_one(item: str) -> tuple[str, int]:
    return item, len(item)

def run_batch(items, max_workers=8):
    if max_workers < 1:
        raise ValueError("max_workers必须大于0")
    results, errors = [], []
    source = iter(items)
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        while batch := list(islice(source, max_workers * 2)):
            futures = {pool.submit(handle_one, item): item for item in batch}
            for future in as_completed(futures):
                try:
                    results.append(future.result())
                except Exception as exc:
                    errors.append((futures[future], repr(exc)))
    if errors:
        raise RuntimeError(f"失败任务: {errors[:5]}")
    return results

if __name__ == "__main__":
    print(run_batch(["a.wav", "b.wav", "c.wav"], max_workers=2))
```

