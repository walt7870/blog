---
title: 06. Silero VAD 工程实践
author: Walt
date: 2026-10-28
---

# 06. Silero VAD 工程实践

Silero VAD 是一个开源神经网络语音活动检测器，支持流式推理，可通过 PyTorch JIT 或 ONNX Runtime 部署。它为音频帧输出语音概率，时间戳切分仍由阈值、静音时长、语音时长和前后 padding 共同决定。

截至 2026 年 10 月，最新版本是 v6.2.3（2026-09-23）；v6.0（2025-08-26）重新训练了模型，噪声场景更稳。模型支持 8 kHz 和 16 kHz 输入，官方没有公布参数量。JIT 文件约 2 MB，同时打包了 8 kHz 和 16 kHz 两个模型；ONNX、量化版本大小不同，不要把某个文件大小当作固定结论。版本与格式以 [Silero 官方版本记录](https://github.com/snakers4/silero-vad/wiki/Version-history-and-Available-Models) 为准。

![Silero VAD 流式推理](/acoustics/silero-vad-streaming.svg)

## 输入契约

Silero VAD 是有状态模型。同一会话的音频块必须按时间顺序输入，模型会利用上一个块的状态和上下文判断当前块。当前官方实现的基础帧约为 32 ms：

| 采样率 | 单次样本数 | 单帧时长 | 常见场景 |
| --- | ---: | ---: | --- |
| 8 kHz | 256 | 32 ms | 电话窄带语音 |
| 16 kHz | 512 | 32 ms | ASR、会议、端侧语音交互 |

48 kHz、44.1 kHz 等输入应在音频链路中明确重采样到 16 kHz。官方 JIT 封装会处理部分 16 kHz 整数倍采样率，但生产系统显式重采样更容易控制滤波质量、时间戳和跨语言实现的一致性。

输入还应满足以下条件：

- PCM 已转换成模型要求的单声道浮点样本，幅度范围和声道混合方式保持一致。
- 同一流不能跳帧、重帧或乱序；出现中断后应决定补静音还是重置会话。
- 每个并发会话使用独立的模型状态或独立封装实例。
- 文件、通话或采样率切换时调用 `reset_states()`，不能沿用上一路音频的历史。

## 文件切片

Python 包提供了读取音频和生成语音时间戳的封装。先安装运行依赖：

```bash
python -m pip install silero-vad onnxruntime soundfile
```

```python
import soundfile as sf
import torch
from silero_vad import (
    collect_chunks,
    get_speech_timestamps,
    load_silero_vad,
)

SAMPLE_RATE = 16_000

model = load_silero_vad(onnx=True)
samples, rate = sf.read("meeting.wav", dtype="float32", always_2d=True)
if rate != SAMPLE_RATE:
    raise ValueError("先用带抗混叠滤波的重采样器转换到 16 kHz")
wav = torch.from_numpy(samples[:, 0].copy())  # 示例明确取第一声道

segments = get_speech_timestamps(
    wav,
    model,
    sampling_rate=SAMPLE_RATE,
    threshold=0.5,
    min_speech_duration_ms=250,
    min_silence_duration_ms=300,
    speech_pad_ms=80,
    time_resolution=2,
    return_seconds=True,
)

print(segments)
```

输出形如：

```python
[
    {"start": 1.12, "end": 4.86},
    {"start": 6.40, "end": 9.18},
]
```

如果要生成只保留语音的音频，不要直接按秒数截取，优先保留采样点时间戳，避免浮点换算造成边界偏移：

```python
sample_segments = get_speech_timestamps(
    wav,
    model,
    sampling_rate=SAMPLE_RATE,
    return_seconds=False,
)

speech_only = collect_chunks(sample_segments, wav)
if speech_only.numel():
    sf.write("speech-only.wav", speech_only.numpy(), SAMPLE_RATE, subtype="PCM_16")
```

把各段直接拼接会丢失原始时间轴，也可能破坏说话人分离和字幕同步。录音质检或会议转写通常应保留原时间戳，仅在送入 ASR 时生成临时片段。

## 流式事件

`VADIterator` 封装了模型状态与开始、结束事件。16 kHz 输入每次送入 512 个样本；持续收音时，不足一帧的部分缓存到下一次。真正 EOF 没有下一块，应只补齐一次末帧，并保存补零前的真实总样本数。

```python
from silero_vad import VADIterator, load_silero_vad

SAMPLE_RATE = 16_000
FRAME_SAMPLES = 512

model = load_silero_vad(onnx=True)
iterator = VADIterator(
    model,
    sampling_rate=SAMPLE_RATE,
    threshold=0.5,
    min_silence_duration_ms=300,
    speech_pad_ms=80,
)

def accept_frame(frame):
    if len(frame) != FRAME_SAMPLES:
        raise ValueError("frame 必须由上层缓冲为 512 个样本")

    event = iterator(frame, return_seconds=False)
    if event is not None:
        print(event)  # {"start": ...} 或 {"end": ...}

try:
    for frame in audio_frames:
        accept_frame(frame)
finally:
    iterator.reset_states()
```

上面的循环只演示完整帧调用，`audio_frames` 由应用提供。文件结束还需应用层封口：处理仅一次补齐的末帧，把事件边界裁到 `[0, real_samples]`；如果已收到开始而没有结束事件，以真实 EOF 关闭当前段，再重置。`VADIterator` 没有独立 `flush()`，`reset_states()` 也不会补发结束事件。不要反复把同一个末帧补零提交以等待结束，否则重复音频会污染状态。时间戳保留采样点，展示时再除以采样率。

例如输入 1000 个样本，第一帧提交 512 个，余下 488 个只补 24 个零后提交一次；真实结束仍是第 1000 个样本，不是 1024。EOF、正常静音结束和连接异常分别记录，避免把强制封口伪装成模型检测到的静音。

真实服务不能把一个全局 `iterator` 共享给所有 WebSocket。可以按 `session_id` 建立会话对象，并在断开连接、超时或输入格式变化时销毁：

```python
class VadSession:
    def __init__(self):
        # 示例采用会话独立封装；高并发服务可改成经过验证的状态隔离池。
        self.model = load_silero_vad(onnx=True)
        self.iterator = VADIterator(self.model, sampling_rate=16_000)
        self.pending = bytearray()
        self.absolute_samples = 0

    def close(self):
        self.iterator.reset_states()
        self.pending.clear()
```

模型对象能否跨线程共享取决于所用封装和运行时；Silero 封装中的模型状态、分段状态与输入缓冲无论如何都必须按会话隔离。高并发服务可使用显式传入状态的封装或实例池，但要先证明状态不会串线。上线前要用并发压测验证线程安全，而不是只验证单文件脚本。

## 参数如何调整

Silero 官方建议先绘制语音概率，再调整阈值和时长参数。不要一次改动所有参数，否则很难判断收益来自哪里。

| 参数 | 接口范围 | 调整建议 |
| --- | --- | --- |
| `threshold` | 文件函数与迭代器 | 从默认值建立基线，结合目标设备概率分布调整 |
| `neg_threshold` | 当前文件函数与迭代器；旧包需核对签名 | 低于起始阈值形成滞回，避免边界抖动 |
| `min_speech_duration_ms` | `get_speech_timestamps` | 迭代器需应用自行过滤；命令词场景保留“开”“停” |
| `min_silence_duration_ms` | 文件函数与迭代器 | 降低可缩短延迟，但会增加碎片 |
| `speech_pad_ms` | 文件函数与迭代器 | 保护字头和尾音；边界仍需对应真实缓存 |
| `max_speech_duration_s` | `get_speech_timestamps` | 迭代器需应用自行限制最长段与缓存 |

这里按 2026 年 10 月核对的上游接口区分。部署时锁定实际包版本，并用 `inspect.signature(VADIterator)` 检查参数；文件函数能用的配置不能直接传给迭代器。

推荐的调参顺序：

1. 固定采集、AEC、降噪、重采样和输入幅度，保存逐帧概率。
2. 用安静、设备播放、背景人声和目标轻声确定 `threshold`。
3. 用短词和短噪声确定 `min_speech_duration_ms`。
4. 用自然停顿和连续长句确定 `min_silence_duration_ms`。
5. 最后调整 `speech_pad_ms`，检查首字和尾音，而不是靠 padding 掩盖模型误判。

## ONNX 部署

ONNX 适合 C++、Java、Android、ARM 和跨平台服务，但导出模型不是一个无状态的 `audio -> probability` 函数。直接调用 ONNX 时通常还要维护隐藏状态和上下文，并把新的状态回送到下一帧。使用官方或经过验证的封装可以降低状态维度、采样率和上下文拼接出错的风险。

部署时记录以下元数据：

```text
model_version: silero-vad-v6.x
model_format: onnx-opset-16
sample_rate: 16000
frame_samples: 512
threshold: 0.50
min_silence_ms: 300
speech_pad_ms: 80
runtime: onnxruntime-x.y.z
```

模型文件与参数必须一起版本化。只更新 ONNX 文件而沿用旧封装，可能因输入、状态或算子集变化导致加载失败，或出现更隐蔽的概率偏移。

官方仓库采用 [MIT License](https://github.com/snakers4/silero-vad/blob/master/LICENSE)。产品交付仍应保留许可证文本，并核对模型来源、运行时和其他依赖各自的许可证。

## 与 sherpa-onnx 集成

sherpa-onnx 提供了 Silero VAD 的 C/C++、Python、Android、WebAssembly 等封装和已导出的模型包。它适合已经采用 sherpa-onnx 做 ASR 的项目，但要注意两套版本概念：

- Silero 上游目前是 v6.2.x。
- sherpa-onnx 的 [Silero VAD 文档](https://k2-fsa.github.io/sherpa/onnx/vad/silero-vad.html) 当前主要列出 v4、v5 模型包和量化变体。

因此不能从上游下载任意新版 ONNX 后直接替换 sherpa 模型。应选择文档明确支持的包，核对采样率和配置字段，再用同一测试集比较概率、边界和性能。ASR 的模式选择与端点关系见 [sherpa-onnx 识别运行模式](../sherpa-onnx/recognition-modes.md)。

## 性能验证

Silero 官方在其测试环境中给出的处理速度低于每帧 1 ms，但这不是目标设备保证值。移动端、低功耗 ARM、容器限频和多路并发都可能改变结果。至少记录：

| 指标 | 测量方式 |
| --- | --- |
| 单帧 P50 / P95 / P99 | 预热后分别统计，不把模型加载混入推理 |
| RTF | 总推理时间除以音频时长 |
| 首帧耗时 | 单独记录模型初始化与首次运行 |
| 并发吞吐 | 按实际会话数、线程数和 CPU 配额压测 |
| 内存 | 区分模型常驻、每会话状态和音频缓存 |
| 功耗与温升 | 在目标移动或嵌入式设备持续运行验证 |

批处理可以提高离线吞吐，却不能替代流式延迟测试。同一会话的有状态帧仍需按顺序处理。

## 常见问题

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 第二个文件开头误判 | 没有重置模型状态 | 每个文件或会话结束后重置 |
| 16 kHz 下推理报帧长错误 | 回调块未整理为 512 个样本 | 增加上层样本缓冲 |
| 48 kHz 时间戳错位 | 隐式降采样与原始时间轴换算不一致 | 显式重采样并用采样点换算 |
| 多路请求互相触发 | 共享了迭代器或状态张量 | 每会话独立维护状态 |
| 短回答总被丢弃 | 最短语音时长过大 | 用真实短词集调整参数 |
| 电视人声误触发 | VAD 本身无法判断说话对象 | 结合 AEC、唤醒、方向或声纹信息 |
| 离线效果好、实时效果差 | 丢帧、乱序、块长或重置逻辑不同 | 对比两条链路的 PCM 与概率日志 |

## 验收清单

- 输入采样率、声道、样本格式和帧长都有断言与监控。
- 每路会话的模型状态、分段状态和缓存相互隔离。
- 概率、开始、结束、重置原因和采样点时间戳可追踪。
- 测试集覆盖目标设备的噪声、播放、距离、人群和说话方式。
- 同时评估误触发、漏检、边界、碎片、WER 和端到端延迟。
- 模型、运行时、封装、阈值和时长参数可以整体回滚。

## 总结

Silero VAD 的接入难点不在单次模型调用，而在固定输入契约、按序维护状态、把概率转换成稳定事件，并在目标设备上完成参数和性能验证。先用官方 Python 封装建立可复现基线，再迁移到 ONNX 或 sherpa-onnx，可以减少模型效果与工程实现相互干扰。

下一篇：[07. 语音唤醒](../wake-word.md)。
