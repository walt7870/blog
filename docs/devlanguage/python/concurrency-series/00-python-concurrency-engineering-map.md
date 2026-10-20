# Python 并发工程全景图：从任务瓶颈到工程流水线

> 对应视频：EP00《Python 并发工程全景图》  
> 视频入口：[B站 EP00](https://www.bilibili.com/video/BV1ueu56UEFd)。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。

## 这篇解决什么问题

这篇解决的是一个入口问题：Python 并发实战到底在讲什么，为什么不能只从 API 开始学。

很多 Python 并发教程从 API 开始：先讲 `threading`，再讲 `asyncio`，再讲 `multiprocessing`。这种顺序适合查语法，却不适合做工程选型。

真实任务里，程序变慢的原因可能完全不同：

- 等网络请求返回。
- 等磁盘读写。
- 等外部 API 配额。
- CPU 正在做解码、压缩、特征提取。
- GPU 正在排队推理。
- 内存被过多待处理任务撑高。

这些问题看起来都叫“慢”，但对应的并发模型不同。线程池、协程、进程池、队列和流水线不是一组性能排行榜，而是面向不同瓶颈的工具。

所以这个系列先建立一张地图：**先判断瓶颈，再选择模型，再控制压力，最后用数据验证。**

## 阅读路线

1. **先看任务形态**：不要把所有慢任务都叫并发问题，先看它在真实业务里做什么。
2. **再看资源瓶颈**：判断网络、磁盘、CPU、GPU、API 限流、内存哪个先到上限。
3. **然后选并发模型**：线程池、`asyncio`、进程池、队列和流水线各有边界。
4. **接着加工程控制**：超时、取消、重试、限流、背压、checkpoint 决定系统能不能长期跑。
5. **最后验证结果**：用吞吐、延迟、错误率和资源占用证明方案有效。

## 视频核心判断

视频里用批量语音处理任务做入口：

```text
扫描文件
  → 音频校验
  → 转码 / 重采样
  → 切片
  → ASR 转写
  → 文本后处理
  → 结果落盘
  → 失败任务重试
```

这条流水线里，每一步的瓶颈都不一样。扫描目录可能卡在磁盘；转码可能卡在 CPU 和外部命令；ASR/TTS API 可能卡在网络、配额和费用；本地模型可能卡在 GPU 和显存；结果写入可能卡在一致性和幂等。

因此，Python 并发实战的核心不是“多开多少任务”，而是“不同阶段怎样围绕资源边界协作”。

## 五层工程地图

![Python 并发诊断与选型流程图](/python/concurrency/concurrency-diagnosis-decision-flow.svg)

这张图可以当作全系列的总入口：先把问题写成真实任务，再用指标判断瓶颈，然后根据资源边界选择并发模型，最后把超时、重试、限流、背压、checkpoint 和幂等补进来，用吞吐、延迟、错误率和成本做闭环验证。

### 第一层：真实任务

不要一开始就说“我要用异步”。先把任务写成业务动作。

例如：

- 批量下载 10 万张图片。
- 扫描目录并上传新增文件。
- 把一批录音统一转成 16kHz 单声道 wav。
- 调用 ASR API 转写音频。
- 用本地模型批量推理。
- 实时采集麦克风音频并返回识别结果。

任务描述越具体，后面的瓶颈越容易判断。

### 第二层：瓶颈判断

| 主要瓶颈 | 典型现象 | 初步方向 |
| --- | --- | --- |
| 网络 I/O | CPU 很低，大量时间在等响应 | 线程池或 `asyncio` |
| 磁盘 I/O | 读写抖动，任务越多越慢 | 有界线程池、分批处理 |
| CPU 计算 | 单核或多核 CPU 被打满 | 进程池、外部工具、释放 GIL 的库 |
| API限流 | 429、超时、失败率随并发上升 | 在途上限、速率配额与重试退避 |
| GPU/显存 | GPU 利用率波动，显存接近满载 | 有界队列、batch、显存水位控制 |
| 内存 | 待处理任务堆积，进程占用持续上涨 | 有界队列、流式处理、checkpoint |

一个任务可能同时有多个瓶颈，但通常会有一个最先决定系统上限。

### 第三层：并发模型

| 模型 | 适合 | 不适合 |
| --- | --- | --- |
| 线程池 | 网络请求、文件 I/O、等待外部命令、少量阻塞库调用 | 纯 Python CPU 密集计算、无限任务提交 |
| `asyncio` | 高并发网络 I/O、API 调用、流式连接、需要大量等待的任务 | 同步阻塞库、CPU 密集计算、团队完全没有异步经验的复杂业务 |
| 进程池 | CPU 密集任务、可拆分的大块计算、需要绕开默认 CPython GIL 限制的场景 | 小粒度任务、需要共享大量对象、启动和序列化成本敏感的场景 |
| 队列 | 生产者-消费者、多阶段流水线、需要背压的任务 | 单阶段短任务、没有状态和压力控制需求的简单脚本 |
| 外部命令池 | ffmpeg、压缩、转码、系统工具 | 无退出码检查、临时文件不可控、并发数无限 |

选型不是一次性动作。一个语音处理系统里，可能同时出现线程池、进程池、`asyncio` 和队列。

### 第四层：工程控制

能启动并发任务，只说明程序进入了并发状态；能长期稳定运行，靠的是控制机制。

| 控制机制 | 解决什么问题 |
| --- | --- |
| 超时 | 防止单个任务永久占住资源 |
| 取消 | 当任务已经无意义时及时释放资源 |
| 重试 | 处理临时网络抖动、服务端短暂失败 |
| 退避 | 防止大量失败任务立刻重试，制造二次压力 |
| 限流 | 尊重 API 配额、GPU batch、磁盘能力 |
| 背压 | 下游变慢时，让上游停止无限生产任务 |
| checkpoint | 长任务中断后可以继续，而不是从头开始 |
| 幂等 | 重试不会重复扣费、重复写入或重复生成 |

### 第五层：结果验证

并发优化不能只看“总耗时下降”。一个方案可能平均耗时更好，但 P95 延迟、失败率和成本更差。

最低限度要观察：

- 总吞吐：单位时间完成多少任务。
- 平均延迟：一个任务平均多久完成。
- P95/P99 延迟：慢任务有多慢。
- 错误率：超时、429、外部命令失败、坏文件比例。
- 队列长度：是否持续堆积。
- CPU、内存、磁盘、网络、GPU 利用率。
- 成本：外部 API 调用次数、重复任务、GPU 空转时间。

## 一个最小决策函数

下面的代码不是生产调度器，而是把选型思路压成一个可读的模型。它适合作为博客读者自查：当前任务到底先落在哪类并发模型上。

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class TaskProfile:
    name: str
    waits_for_network: bool = False
    waits_for_disk: bool = False
    calls_rate_limited_api: bool = False
    cpu_heavy: bool = False
    gpu_heavy: bool = False
    many_pipeline_stages: bool = False
    needs_recovery: bool = False

def recommend(profile: TaskProfile) -> list[str]:
    choices: list[str] = []

    if profile.calls_rate_limited_api:
        choices.append("asyncio + Semaphore + timeout + retry backoff")
    elif profile.waits_for_network:
        choices.append("ThreadPoolExecutor or asyncio, depending on library support")

    if profile.waits_for_disk:
        choices.append("bounded ThreadPoolExecutor with batch scanning")

    if profile.cpu_heavy:
        choices.append("ProcessPoolExecutor, external command pool, or native library that releases the GIL")

    if profile.gpu_heavy:
        choices.append("bounded queue + batch scheduling + GPU memory guard")

    if profile.many_pipeline_stages:
        choices.append("producer-consumer pipeline with bounded queues")

    if profile.needs_recovery:
        choices.append("checkpoint + idempotent result writes + failed-task table")

    if not choices:
        choices.append("start with simple sequential code and measure before adding concurrency")

    return choices

if __name__ == "__main__":
    speech_pipeline = TaskProfile(
        name="batch speech transcription",
        waits_for_disk=True,
        calls_rate_limited_api=True,
        cpu_heavy=True,
        many_pipeline_stages=True,
        needs_recovery=True,
    )

    for item in recommend(speech_pipeline):
        print("-", item)
```

预期输出：

```text
- asyncio + Semaphore + timeout + retry backoff
- bounded ThreadPoolExecutor with batch scanning
- ProcessPoolExecutor, external command pool, or native library that releases the GIL
- producer-consumer pipeline with bounded queues
- checkpoint + idempotent result writes + failed-task table
```

这个输出看起来“不唯一”，这正是真实系统的特点。批量语音处理不是一个单模型问题，而是多阶段协作问题。

## 分阶段配置的例子

处理1000份录音时，可以让扫描器只传路径，2个转码进程生成标准音频，4个API请求等待识别，1个写入者落盘。这里的2和4只是起始实验参数，不代表硬件容量。若API平均2秒且同时最多4个请求，忽略其他开销时吞吐上限约2份/秒；提高扫描速度不能突破这个上限。

队列还要有字节预算：100条路径只占少量内存，100段完整PCM可能占数百MB。checkpoint解决重新启动后的进度恢复，不会降低当前进程里已经堆积的任务数量。

## 常见失败模式

| 错误写法 | 现象 | 根因 | 修正 |
| --- | --- | --- | --- |
| 慢了就无限加线程 | CPU、内存、磁盘或 API 错误率上升 | 没有判断真实瓶颈 | 先采集资源指标，再限制并发数 |
| 用 `asyncio` 包住同步阻塞库 | 代码看起来异步，实际一批一批卡住 | 阻塞函数没有让出事件循环 | 换异步库，或隔离到线程池/进程池 |
| 把转码和 API 调用放同一个池 | 某一类任务拖慢另一类任务 | 不同阶段瓶颈不同 | 按阶段拆池，用队列连接 |
| 所有任务一次性提交 | 内存持续上涨，失败后难恢复 | 没有批处理和背压 | 使用有界队列、分批提交、checkpoint |
| 失败后立即全量重试 | API 限流更严重，成本上升 | 重试没有退避和幂等 | 分类错误、指数退避、记录任务状态 |
| 只看平均耗时 | 少数任务非常慢，线上体验差 | 没有观察尾延迟和错误率 | 同时看 P95/P99、队列长度、失败率 |

## 实战检查清单

- 任务是否已经被拆成明确阶段，而不是一个巨大的 `for` 循环。
- 每个阶段的主要瓶颈是否写清楚：网络、磁盘、CPU、GPU、API、内存。
- 每个阶段的并发数是否有上限。
- 是否有超时，避免任务永久挂住。
- 是否有取消策略，避免无意义任务继续消耗资源。
- 是否有重试退避，避免失败风暴。
- 是否有 checkpoint，保证长任务中断后可以继续。
- 结果写入是否幂等，避免重复写入、重复扣费或重复生成。
- 是否记录队列长度、错误率、资源占用和耗时分布。
- 是否保留顺序版本作为基准，证明并发方案真的改善了结果。

## 读完之后能完成什么

- 能把一个慢任务拆成真实任务、资源瓶颈、并发模型、控制机制和验证指标五层。
- 能初步判断线程池、`asyncio`、进程池、队列和流水线分别适合哪里。
- 能识别“盲目加并发”“伪异步”“无限重试”“只看平均耗时”等常见误区。
- 能为批量语音处理、批量文件处理或 API 调用任务画出第一版并发架构图。

如果只能说出某个 API 的名字，却不能判断瓶颈和控制压力，说明还没有进入并发实战。这个系列后面的每一集，都会围绕这张地图补全一个工程能力。

