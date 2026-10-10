# 进程池与 CPU 密集任务：什么时候绕开线程

> 对应视频：EP09《进程池与 CPU 密集任务》  
> 视频入口：[B站 EP09 定时稿](https://www.bilibili.com/video/BV1QEu76xEFi)（计划公开：2026-08-13 18:49）。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。
> 本文为视频的工程展开版，补充代码模板、排查链路、状态字段和检查清单。
> 最后核验：2026/08/09 08:26:33

视频解释进程池为什么适合一部分 CPU 密集任务。文章补充成本判断、任务粒度和音频处理里的边界。

![进程池成本模型图](/python/concurrency/ep09-processpool-cost-model.svg)

这张图提醒你同时计算收益和成本：进程池能利用多核，但启动、序列化和内存放大都可能吃掉收益。

## 适用判断

| 问题 | 如果答案是“是” |
| --- | --- |
| 任务主要是纯 Python CPU 计算吗 | 进程池可能有效 |
| 任务能拆成相互独立的小批次吗 | 适合并行分发 |
| 参数和结果容易序列化吗 | 进程间传输成本可控 |
| 每个任务耗时足够长吗 | 能覆盖调度和序列化开销 |
| 是否需要共享巨大模型或缓存 | 小心内存放大 |

## 最小模板

```python
from concurrent.futures import ProcessPoolExecutor


def cpu_heavy(n: int) -> int:
    total = 0
    for value in range(n):
        total += value * value
    return total


def main() -> None:
    inputs = [500_000, 600_000, 700_000, 800_000]
    with ProcessPoolExecutor(max_workers=4) as pool:
        for result in pool.map(cpu_heavy, inputs):
            print(result)


if __name__ == "__main__":
    main()
```

## 和音频处理的关系

| 音频任务 | 推荐方向 | 原因 |
| --- | --- | --- |
| ffmpeg 转码 | 有界外部命令池 | 主要工作在外部进程 |
| 纯 Python 特征计算 | 进程池 | CPU 密集且可拆分 |
| NumPy 特征计算 | 先测量 | 底层可能已有原生并行 |
| PyTorch 推理 | GPU 队列或 batch | 瓶颈可能在 GPU/显存 |
| 大模型重复加载 | 谨慎多进程 | 内存可能放大 |


<!-- concurrency-series-engineering-supplement:start -->
## 工程补充：怎么把这篇用到项目里

**读图方式**

- 进程池适合大粒度 CPU 任务，任务太小时，序列化和调度成本可能比计算本身还高。
- 如果每个进程都加载大模型或大缓存，RSS 会被放大，机器可能先被内存打满。
- 音频特征提取、波形计算、CPU 转码前处理可以试进程池；GPU 推理通常要谨慎。

**排查路径**

- 先用 `cProfile` 或 `py-spy` 确认瓶颈真在 CPU 计算，而不是磁盘或 API 等待。
- 比较不同 `max_workers` 和 `chunksize`，记录吞吐、CPU util、RSS 和单任务耗时。
- 如果 worker 启动慢，考虑 initializer 预加载；如果参数太大，考虑传路径而不是传大对象。

**问题、证据和解决动作**

| 问题现场 | 先查什么 | 解决动作 |
| --- | --- | --- |
| 小任务提交特别多 | 单任务耗时、pickle 时间 | 合并任务或设置 `chunksize` |
| 内存突然翻倍 | 每进程 RSS、模型加载次数 | 减少 worker、共享只读文件或预加载策略 |
| CPU 没跑满 | 磁盘 util、输入读取耗时 | 先优化 I/O 或批量读取 |
| 结果回传很慢 | 返回对象大小 | 结果落盘传路径，避免大对象跨进程 |

**落地边界**

- 进程池不是线程池的高级版，它是为 CPU 密集和隔离准备的。
- 生产环境要考虑进程退出、异常重启和中间结果恢复。
<!-- concurrency-series-engineering-supplement:end -->

## 常见失败模式

| 错误写法 | 现象 | 修正 |
| --- | --- | --- |
| 小任务大量丢进进程池 | 反而变慢 | 增大任务粒度 |
| 传输巨大对象 | 序列化耗时高 | 传路径、ID 或小参数 |
| 每个进程加载大模型 | 内存爆涨 | 重新设计 worker 或 batch |
| 不测原生库行为 | 重复并行导致过度抢 CPU | 控制底层线程数并压测 |

## 实战检查清单

- 是否确认任务是 CPU 密集，而不是 I/O 等待。
- 是否知道参数和结果如何序列化。
- 是否测过不同任务粒度。
- 是否观察了总 CPU、内存和进程数。
- 是否比较了线程池、进程池和顺序版本。

## 读完之后能完成什么

- 能判断 CPU 密集任务是否适合进程池。
- 能说出进程池的启动、序列化和内存成本。
- 能为音频转码、特征提取、本地推理选择不同执行模型。

## 配套示例代码

源码文件：`examples/ep09/processpool_cpu_template.py`

```python
from concurrent.futures import ProcessPoolExecutor


def cpu_heavy(n: int) -> int:
    total = 0
    for value in range(n):
        total += value * value
    return total


def main() -> None:
    inputs = [500_000, 600_000, 700_000, 800_000]
    with ProcessPoolExecutor(max_workers=4) as pool:
        for result in pool.map(cpu_heavy, inputs):
            print(result)


if __name__ == "__main__":
    main()
```

