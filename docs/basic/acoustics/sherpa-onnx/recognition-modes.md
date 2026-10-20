---
title: sherpa-onnx 识别运行模式
author: Walt
date: 2026-09-01
---

# sherpa-onnx 识别运行模式

sherpa-onnx 的识别 API 使用 `OnlineRecognizer` 和 `OfflineRecognizer` 区分流式与非流式处理。这里的 Online/Offline 描述音频处理方式，不描述网络连接：两种识别器都可以只在本地运行。

选型时先回答“什么时候需要结果”和“音频什么时候完整”，再选择 API。仅凭产品界面看起来是否实时，很容易选错模型和运行模式。

![流式、VAD 加非流式与文件批处理](/acoustics/sherpa-onnx-recognition-modes.svg)

## 三种常见链路

### 流式识别

音频每到一小块就送入识别流，模型逐步产生临时文本，端点出现后固化最终结果。

```text
麦克风 -> 10～100 ms 音频块 -> OnlineRecognizer
       -> 临时结果 -> 端点检测 -> 最终结果 -> reset
```

它适合实时字幕、语音助手和电话转写。代价是中间结果可能修正，模型结构和解码状态更复杂，界面与业务不能把每次临时文本都当成最终事实。

### VAD 加非流式识别

VAD 持续判断语音活动，收集到完整语音段后交给 `OfflineRecognizer` 一次解码。

```text
麦克风 -> VAD -> 完整语音段 -> OfflineRecognizer -> 最终结果
```

这种链路在交互上也可以接近实时，同时能使用更多非流式模型。它适合短句交互、会议切段和本地录音转写，但首个文本通常要等到语音段结束后才出现。

### 文件或批量识别

应用拿到完整文件后创建一个或多个 Stream，再批量解码。它适合字幕生成、录音质检、离线转写和模型回归测试，不需要为临时结果和端点状态付出复杂度。

## VAD 与端点检测

VAD 和端点检测经常一起出现，但回答的问题不同。

| 机制 | 回答的问题 | 典型输出 |
| --- | --- | --- |
| VAD | 当前时间范围内是否存在语音 | 语音段起止点 |
| 端点检测 | 当前这句话是否应该结束 | 是否结束当前 Stream |

VAD 更像音频切段器，可以独立于 ASR 使用。端点检测通常结合识别流中的非静音状态、尾部静音和最长句长决定是否结束当前句子。

VAD 的概率平滑、前后缓存、参数评估与流式状态管理见 [VAD 语音活动检测](../vad/)；Silero 模型的固定帧长和部署约束见 [Silero VAD 工程实践](../vad/silero-vad.md)。

尾部静音阈值过短，一句话会被切碎；阈值过长，说完后的等待会拖慢交互。生产环境应按命令词、自由对话、会议长句分别配置，而不是所有场景共用一组参数。

## 核心对象关系

不同语言的命名会有少量差异，但核心关系稳定：

```text
Config
  -> Recognizer
       -> Stream
            -> accept_waveform()
       -> decode_stream() / decode_streams()
            -> Result
```

### Config

配置模型路径、词表、线程数、推理后端、采样率、特征维度和解码方式。配置必须与模型导出条件匹配，尤其不能随意复制其他模型的 `feature_dim`。

### Recognizer

Recognizer 持有模型和解码器，是较重的对象。应用通常在服务或页面生命周期内复用它，不应为每句话重新加载模型。

### Stream

Stream 保存一段独立语音或一次会话的解码状态。非流式任务通常每个音频片段创建一个 Stream；流式任务在端点后重置或新建 Stream，不能把不同用户或不相关句子的状态混在一起。

### Result

结果至少可以包含文本，具体模型还可能提供 token、时间戳、语言、情感、音频事件或分段信息。调用方必须按实际模型检查字段，而不是假设所有结果结构一致。

## 非流式 Python 入口

CPU 版 Python 包的安装入口是：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install sherpa-onnx sherpa-onnx-bin soundfile
```

安装后先验证导入和命令行：

```bash
python -c "import sherpa_onnx; print(sherpa_onnx.__file__)"
sherpa-onnx --help
```

下面以 SenseVoice 为例说明对象生命周期。模型文件名仅表示接口形态，实际路径应使用同一个官方模型包中的模型和词表。

```python
import soundfile as sf
import sherpa_onnx

recognizer = sherpa_onnx.OfflineRecognizer.from_sense_voice(
    model="./model/model.int8.onnx",
    tokens="./model/tokens.txt",
    use_itn=True,
)

samples, sample_rate = sf.read(
    "test.wav",
    dtype="float32",
    always_2d=True,
)
samples = samples[:, 0]

stream = recognizer.create_stream()
stream.accept_waveform(sample_rate, samples)
recognizer.decode_stream(stream)

print(stream.result.text)
```

这段代码有四个工程约束：

1. `samples` 是一维、归一化到 `[-1, 1]` 的 `float32`。
2. 多声道文件显式选择了第一个声道；真实产品应按录音定义选择或混音。
3. Recognizer 在多段识别之间复用，每段语音单独创建 Stream。
4. 输入采样率可以传给框架重采样，但仍要验证重采样前的音质和声道。

批处理多个文件时，可以先创建多个 Stream，再使用 `decode_streams()`。这样便于统一统计总音频时长和 RTF，也能减少调用层循环开销。

## 流式循环

流式识别的核心不是重复调用 `accept_waveform()`，而是正确处理“输入、可解码、临时结果、端点、EOF 和重置”。下面是生命周期骨架，回调由应用实现；必须另建 `OnlineRecognizer` 并加载配套流式模型，不能复用上一节 SenseVoice 的 `OfflineRecognizer`。

```python
import numpy as np

recognizer = sherpa_onnx.OnlineRecognizer.from_transducer(
    tokens="./streaming-model/tokens.txt",
    encoder="./streaming-model/encoder.onnx",
    decoder="./streaming-model/decoder.onnx",
    joiner="./streaming-model/joiner.onnx",
    sample_rate=16_000,
    feature_dim=80,  # 必须与该发布包一致
    enable_endpoint_detection=True,
)
sample_rate = 16_000
stream = recognizer.create_stream()
segment_has_audio = False

while microphone_is_open:
    samples = read_audio_chunk()
    if len(samples) == 0:
        break  # 上层明确约定空块表示 EOF
    stream.accept_waveform(sample_rate, samples)
    segment_has_audio = True

    while recognizer.is_ready(stream):
        recognizer.decode_stream(stream)

    text = recognizer.get_result(stream)
    update_temporary_text(text)

    if recognizer.is_endpoint(stream):
        commit_final_text(text)
        recognizer.reset(stream)
        segment_has_audio = False

# 此 Transducer 示例采用官方文件示例的尾部补齐；其他模型按配套说明确定。
if segment_has_audio:
    stream.accept_waveform(
        sample_rate, np.zeros(int(0.66 * sample_rate), dtype=np.float32)
    )
stream.input_finished()
while recognizer.is_ready(stream):
    recognizer.decode_stream(stream)
if segment_has_audio:
    commit_final_text(recognizer.get_result(stream))
```

尾部补齐仅在输入真正结束时执行一次，并且应从原音频时长统计中剔除。EOF 之后先排空可解码状态，再提交尚未在端点处提交的尾段；不能先 `reset()`，否则会丢掉尾字。实际服务还应按段号保证最终事件只提交一次，区分正常 EOF、取消和异常断开，并用文件末尾无静音的样本验证收尾。

代码进入产品后还要补齐：

- 麦克风回调与识别线程之间的有界缓冲。
- 页面退出、权限撤销和音频设备切换时的资源释放。
- 临时文本与最终文本的不同展示样式。
- 关键业务只使用最终结果或经过确认的结果。
- 长时间无语音、最长句长和模型错误的恢复策略。

## 音频块大小

音频块太小会增加回调、线程切换和语言绑定开销；太大则会增加可见延迟。官方麦克风示例使用 100 ms 音频块演示流程，这不是所有设备的固定最优值。

选择块大小时同时测量：

| 指标 | 说明 |
| --- | --- |
| 首字延迟 | 开始说话到首次出现有效文本 |
| 解码调度频率 | 每秒进入解码循环的次数 |
| 缓冲积压 | 识别速度跟不上采集速度时的排队长度 |
| CPU 波动 | 小块高频调用可能造成更多调度抖动 |
| 终句延迟 | 说完到端点确认和最终文本提交的时间 |

## 热词和解码方式

本文讨论截至 2026 年 10 月官方文档中的 Transducer 热词偏置机制，要求 `modified_beam_search`。默认的 `greedy_search` 以及其他模型结构不能直接套用这套配置；某些模型的提示词或其他上下文接口应独立核对，不能据此推导为同一热词机制。

```text
Transducer + modified_beam_search -> 支持 sherpa-onnx 热词
Transducer + greedy_search        -> 不支持这套热词
其他模型结构                       -> 不能假设支持
```

热词分数不是越高越好。分数过低没有提升，过高会把普通发音拉向业务词。评估时要同时统计热词命中率和误命中率，并使用联系人、设备名、商品型号等真实动态词表测试。

## 运行问题定位

| 现象 | 优先检查 | 验证方法 |
| --- | --- | --- |
| 输出为空 | 模型路径、词表、音频幅度、声道 | 用官方测试 WAV 跑同一配置 |
| 开头漏字 | VAD 起点、前置缓存、Stream 创建时机 | 保存进入识别器前的 PCM |
| 结尾漏字 | 尾部静音、端点阈值、提前停止采集 | 延长尾部输入并对比结果 |
| 中间文本抖动 | 流式模型上下文、UI 提交策略 | 区分临时与最终文本 |
| 一句话被切碎 | VAD/端点阈值太激进 | 回放固定长句调整阈值 |
| 延迟越来越大 | 音频缓冲积压、RTF 大于 1 | 记录输入时长和解码耗时 |
| 首次识别卡顿 | 每句重新创建 Recognizer | 记录模型加载与单句耗时 |
| 自定义词无提升 | 模型结构或解码方式不支持热词 | 检查 Transducer 与 `modified_beam_search` |

## 验收清单

- 官方测试音频和自有音频都能稳定识别。
- 录入 Recognizer 创建时间、单段解码时间和 RTF。
- 流式界面能区分临时结果与最终结果。
- VAD 起点不会吞字，端点不会频繁切碎长句。
- 连续运行时音频队列不会无限增长。
- 切换页面、设备或权限后资源能够释放。
- 多会话之间没有复用错误的 Stream 状态。

## 总结

运行模式决定系统何时得到结果、需要维护多少状态以及可使用哪些模型。文件转写优先非流式，实时字幕优先流式，短句交互和长录音切段可以先验证 VAD 加非流式。无论选择哪种模式，Recognizer 复用、Stream 隔离和音频输入契约都是稳定性的基础。
