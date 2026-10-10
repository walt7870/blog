# 线程与线程池实战：把等待时间叠起来

> 对应视频：EP04《线程与线程池实战》  
> 视频入口：[B站 EP04 定时稿](https://www.bilibili.com/video/BV1Dju76oEu9)（计划公开：2026-08-11 09:54）。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。
> 本文为视频的工程展开版，补充代码模板、排查链路、状态字段和检查清单。
> 最后核验：2026/08/09 08:26:33

视频解释线程池适合等待型任务。文章给出 `ThreadPoolExecutor` 的实战模板：控制并发数、收集结果、处理异常，避免无限提交。

![线程池任务生命周期](/python/concurrency/ep04-threadpool-lifecycle.svg)

这张图把线程池拆成提交、等待、收敛、异常和复盘五步；线程池的难点不在启动线程，而在受控地结束每个任务。

## 最小模板

```python
from concurrent.futures import ThreadPoolExecutor, as_completed


def handle_one(item: str) -> tuple[str, int]:
    # 替换成真实 I/O：请求接口、读取文件、调用外部服务等。
    return item, len(item)


def run_batch(items: list[str], max_workers: int = 8) -> list[tuple[str, int]]:
    results: list[tuple[str, int]] = []
    errors: list[tuple[str, Exception]] = []

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        future_to_item = {pool.submit(handle_one, item): item for item in items}

        for future in as_completed(future_to_item):
            item = future_to_item[future]
            try:
                results.append(future.result())
            except Exception as exc:
                errors.append((item, exc))

    if errors:
        for item, exc in errors[:5]:
            print(f"failed: {item}: {exc}")
        raise RuntimeError(f"{len(errors)} tasks failed")

    return results
```

## 什么时候适合线程池

| 场景 | 是否适合 | 说明 |
| --- | --- | --- |
| 批量请求 HTTP 接口 | 适合 | 等网络，线程可推进其它任务 |
| 读取大量小文件 | 适合但要限并发 | 受磁盘能力影响 |
| 调用外部命令并等待 | 适合但要限并发 | 同时受 CPU、磁盘和进程数影响 |
| 纯 Python 计算 | 通常不适合 | 默认 CPython 下会受 GIL 影响 |
| 写同一个结果文件 | 不直接适合 | 需要单写入者或锁 |


<!-- concurrency-series-engineering-supplement:start -->
## 工程补充：怎么把这篇用到项目里

**读图方式**

- 提交任务前先确定输入规模和 `max_workers`，不要把几十万任务一次性 `submit` 进内存。
- 用 `as_completed` 逐个收敛结果，这样失败可以早发现、早归档。
- 线程池结束后一定复盘吞吐、错误率、资源水位，再决定是否调大或调小并发。

**排查路径**

- 用 1、4、8、16 个 worker 跑同一批输入，观察吞吐是否线性提升、错误是否集中出现。
- 如果 CPU 低但吞吐提升明显，说明等待可叠加；如果 CPU 或连接数先满，要停下来加限制。
- 失败任务要记录输入、异常类型和 traceback，避免只在控制台看到一堆 Future 报错。

**问题、证据和解决动作**

| 问题现场 | 先查什么 | 解决动作 |
| --- | --- | --- |
| 一次性提交全量文件 | RSS、pending future 数 | 分批 submit 或用有界队列 |
| 某个请求永久卡住 | 单任务 elapsed、无 timeout | 给外部调用加 timeout |
| 异常被吞掉 | 结果数量少但程序正常退出 | 调用 `future.result()` 并记录 `future.exception()` |
| 线程越多越慢 | 连接池、磁盘 util、错误率 | 降低 `max_workers`，按资源拆池 |

**落地边界**

- 线程池适合等待型任务，不适合拿来加速纯 Python CPU 密集循环。
- 所有外部调用都要有超时，否则一个 worker 可以无限占住池容量。
<!-- concurrency-series-engineering-supplement:end -->

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

## 配套示例代码

源码文件：`examples/ep04/threadpool_template.py`

```python
from concurrent.futures import ThreadPoolExecutor, as_completed


def handle_one(item: str) -> tuple[str, int]:
    return item, len(item)


def run_batch(items: list[str], max_workers: int = 8) -> list[tuple[str, int]]:
    results: list[tuple[str, int]] = []
    errors: list[tuple[str, Exception]] = []

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        future_to_item = {pool.submit(handle_one, item): item for item in items}

        for future in as_completed(future_to_item):
            item = future_to_item[future]
            try:
                results.append(future.result())
            except Exception as exc:
                errors.append((item, exc))

    if errors:
        for item, exc in errors[:5]:
            print(f"failed: {item}: {exc}")
        raise RuntimeError(f"{len(errors)} tasks failed")

    return results


if __name__ == "__main__":
    print(run_batch(["a.wav", "b.wav", "c.wav"], max_workers=2))
```

