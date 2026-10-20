# Python 并发实战：从基础模型到语音工程

这是一套面向有一定 Python 基础、想深入学习并发实战的系列文章。视频负责建立直观判断，博客保留更完整的代码模板、排查链路、状态字段和检查清单。

系列不从“线程、协程、进程谁更快”开始，而是先回到真实任务：批量文件处理、语音转码、ASR/TTS API、GPU 推理、实时语音链路和性能压测。每篇都按同一条工程链路展开：先看问题，再判断瓶颈，然后选择工具，最后用指标验证。

> 配套视频：[Python 并发实战合集](https://space.bilibili.com/181407346/lists/8787437?type=season)。
> 示例运行环境：Python3.11及以上；运行时选型以Python3.14说明为准。

![Python并发诊断与选型](/python/concurrency/concurrency-diagnosis-decision-flow.svg)

以批量录音为例：转码占CPU，接口转写等待网络，结果写入需要可恢复的状态。三个阶段分别限容量，才能避免API变慢时把全部录音堆进内存。先沿总图定位瓶颈，再进入下表对应章节；代码中的sleep和fake_api均为本地模拟，不调用真实识别服务。

## 阅读路线

| 篇目 | 主题 |
| --- | --- |
| 00 | [Python 并发工程全景图：从任务瓶颈到工程流水线](./00-python-concurrency-engineering-map.md) |
| 01 | [先判断瓶颈：I/O、CPU、API、GPU、内存](./01-find-the-bottleneck-before-concurrency.md) |
| 02 | [并发、并行、异步、流水线：四个词不要混着用](./02-concurrency-parallelism-async-pipeline.md) |
| 03 | [Python 并发工具地图：线程、协程、进程、队列怎么选](./03-python-concurrency-tool-map.md) |
| 04 | [线程与线程池实战：把等待时间叠起来](./04-threadpool-practice.md) |
| 05 | [线程安全与共享状态：别让任务完成但结果写错](./05-thread-safety-shared-state.md) |
| 06 | [asyncio 的事件循环模型：速度来自让出控制权](./06-asyncio-event-loop-model.md) |
| 07 | [异步任务编排：成功、失败、超时和取消怎么收敛](./07-async-task-orchestration.md) |
| 08 | [同步库与异步系统的边界：警惕伪异步](./08-sync-blocking-in-async-system.md) |
| 09 | [进程池与 CPU 密集任务：什么时候绕开线程](./09-processpool-cpu-bound-work.md) |
| 10 | [Python 队列与流水线：让多阶段任务稳定推进](./10-producer-consumer-task-queue.md) |
| 11 | [并发控制：限流、背压、重试：让系统稳定推进，而不是瞬间冲垮下游](./11-rate-limit-backpressure-retry.md) |
| 12 | [批量文件处理实战：跑几个小时，也要能恢复、能跳过、能定位坏文件](./12-file-batch-checkpoint.md) |
| 13 | [批量语音转码与预处理：用 ffmpeg 有界命令池，把输入先标准化](./13-audio-transcode-preprocess.md) |
| 14 | [ASR/TTS API 并发实战：把服务端配额当成系统的一部分](./14-asr-tts-api-concurrency.md) |
| 15 | [本地模型/GPU 推理并发：管理 batch、显存和等待队列，而不是盲目多开 worker](./15-local-model-gpu-inference.md) |
| 16 | [实时语音流水线：把录音、VAD、上传、识别放进延迟预算](./16-realtime-audio-pipeline.md) |
| 17 | [性能观测与压测：别只看平均耗时，用证据证明并发真的变好](./17-observability-benchmark.md) |
| 18 | [GIL、free-threading 与未来选型：运行时会变，工程判断顺序不会变](./18-gil-free-threading-future.md) |

## 学习方式

如果刚开始系统补并发知识，建议按 00 到 18 顺序阅读。00 到 03 建立总览、瓶颈判断和工具地图；04 到 10 进入线程池、共享状态、asyncio、进程池和队列流水线；11 到 18 聚焦限流背压、批量文件、语音预处理、ASR/TTS API、GPU 推理、实时语音、压测和 GIL/free-threading。

如果已经有工程问题，可以直接按症状进入：

| 症状 | 优先阅读 |
| --- | --- |
| 程序变慢但不知道卡哪里 | 01、17 |
| 线程池越加越乱 | 04、05、10 |
| 写了 async 但没有变快 | 06、07、08 |
| CPU 任务没有吃满多核 | 09、18 |
| 批量文件跑几个小时后难恢复 | 12 |
| 音频转码、ASR/TTS 或实时语音链路不稳定 | 13、14、16 |
| GPU 利用率、显存和排队时间互相冲突 | 15 |
| 下游 API 被打爆、429 和重试风暴 | 11 |

## 核心判断

Python 并发实战不是“多开任务”，而是资源协作：网络、磁盘、CPU、GPU、外部 API、内存和状态恢复都有自己的边界。工具选择要服从瓶颈判断，工程控制要覆盖超时、取消、重试、限流、背压、checkpoint 和观测指标。
