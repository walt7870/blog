# 进程池与 CPU 密集任务：什么时候绕开线程

> 对应视频：EP09《进程池与 CPU 密集任务》  
> 视频入口：[B站 EP09](https://www.bilibili.com/video/BV1QEu76xEFi)。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。

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

## 和音频处理的关系

| 音频任务 | 推荐方向 | 原因 |
| --- | --- | --- |
| ffmpeg 转码 | 有界外部命令池 | 主要工作在外部进程 |
| 纯 Python 特征计算 | 进程池 | CPU 密集且可拆分 |
| NumPy 特征计算 | 先测量 | 底层可能已有原生并行 |
| PyTorch 推理 | GPU 队列或 batch | 瓶颈可能在 GPU/显存 |
| 大模型重复加载 | 谨慎多进程 | 内存可能放大 |

## 启动方式与示例输出

下方显式使用spawn上下文，以便在Linux、macOS和Windows上讲解相同的模块导入边界。入口必须放在__main__守卫内，worker函数位于模块顶层；在交互式终端定义的函数可能无法被子进程导入。Python3.14中默认启动方式发生变化，不应依赖旧的隐式fork行为。

四项结果应依次为41666541666750000、71999820000100000、114333088333450000、170666346666800000。map按输入顺序返回，因此一个慢任务可能阻止后面的已完成结果被消费；需要完成即处理时使用as_completed。这个小例子验证结果，不能用一次运行证明多进程更快。

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

## 运行示例

示例保存为`examples/ep09/processpool_cpu_template.py`；目录和文件名由本地自行创建。

```python
from concurrent.futures import ProcessPoolExecutor
from multiprocessing import get_context

def cpu_heavy(n: int) -> int:
    total = 0
    for value in range(n):
        total += value * value
    return total

def main() -> None:
    inputs = [500_000, 600_000, 700_000, 800_000]
    with ProcessPoolExecutor(max_workers=4, mp_context=get_context("spawn")) as pool:
        for result in pool.map(cpu_heavy, inputs):
            print(result)

if __name__ == "__main__":
    main()
```

