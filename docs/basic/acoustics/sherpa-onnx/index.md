---
title: sherpa-onnx 端侧语音推理框架
author: Walt
date: 2026-09-01
---

# sherpa-onnx 端侧语音推理框架

sherpa-onnx 不是一个固定的语音识别模型，而是一套面向本地设备的语音推理与跨平台部署框架。模型决定语言、准确率、延迟和资源消耗，sherpa-onnx 负责把 ONNX 模型、音频特征、推理运行时、解码、流管理和多语言 API 组织成可落地的工程链路。

它适合把 ASR、TTS、VAD、关键词检测、说话人识别、标点恢复、语音增强等能力部署到 Linux、macOS、Windows、Android、iOS、HarmonyOS、WebAssembly 和嵌入式设备。本文重点讨论 ASR，因为识别链路最能说明 sherpa-onnx 的边界和使用方式。

![sherpa-onnx 架构与职责边界](/acoustics/sherpa-onnx-architecture.svg)

## 它解决的问题

训练好的 PyTorch 语音模型如果直接进入 Android、iOS 或嵌入式产品，通常还缺少一整套部署能力：

- 模型如何转换成设备可执行的格式。
- 麦克风 PCM 如何转换为模型需要的特征。
- 流式音频的缓存、状态和端点如何管理。
- token 概率如何解码成文本和时间戳。
- C++ 核心如何暴露给 Java、Kotlin、Swift、Dart 或 JavaScript。
- 同一套能力如何在 CPU、GPU 或特定 NPU 上验证和发布。

sherpa-onnx 把这些工作收敛到统一配置和 API 中。推理阶段由 ONNX Runtime 或受支持的设备后端执行神经网络，sherpa-onnx 在其上组织语音处理和模型适配。语音数据可以完全在本地处理，不需要为了识别而上传到云端。

## 四层边界

理解 sherpa-onnx 时，应把训练、模型、推理运行时和框架分开。

| 层级 | 负责什么 | 常见对象 |
| --- | --- | --- |
| 训练与导出 | 准备数据、训练模型、量化并导出 ONNX | icefall、FunASR、NeMo、Whisper 相关工具 |
| 模型资产 | 定义语言、结构、词表、精度和资源消耗 | `model.onnx`、`tokens.txt`、encoder/decoder/joiner |
| 推理运行时 | 执行计算图和算子 | ONNX Runtime 及其 CPU/CUDA 等 Execution Provider；部分设备使用专用后端 |
| sherpa-onnx | 特征、模型适配、解码、流、VAD、端点和多语言 API | Config、Recognizer、Stream、Result |

准确率问题首先属于模型和数据，部署崩溃、输入格式、流状态、解码配置和跨平台封装问题才更可能属于框架集成。把这两类问题混在一起，会出现“换框架解决模型精度”或“换模型解决音频输入错误”的无效尝试。

## 典型处理链路

以本地语音识别为例，数据依次经过：

```text
麦克风或音频文件
  -> 单声道浮点 PCM
  -> 必要时重采样
  -> Filterbank 等声学特征
  -> ONNX 模型推理
  -> CTC / Transducer / Paraformer 等解码
  -> 文本、token、时间戳和附加信息
```

框架能够在输入采样率与模型采样率不一致时执行重采样，但这不代表生产链路可以忽略音频质量。多声道选择错误、削顶、丢帧、增益突变或过度降噪仍会直接影响识别结果。

## 不只提供 ASR

sherpa-onnx 的能力范围已经覆盖多类本地语音任务：

| 能力 | 典型场景 |
| --- | --- |
| 流式与非流式 ASR | 实时字幕、语音助手、文件转写 |
| TTS | 本地播报、弱网降级、隐私敏感设备 |
| VAD | 长录音切段、麦克风收音控制 |
| 关键词检测 | 离线唤醒、固定命令词 |
| 说话人识别与分离 | 会议、门禁、个性化设备 |
| 语音增强 | ASR 前降噪、通话和录音改善 |
| 标点恢复与音频事件识别 | 转写后处理、声音场景识别 |

不要因为框架支持某项能力，就默认任何模型都支持对应输出。例如热词、时间戳、语言识别和情感信息都与具体模型结构及配置有关。

## 仓库阅读顺序

官方仓库规模较大，直接进入核心 C++ 容易失去主线。更有效的阅读顺序是：

1. 从 `python-api-examples/` 跑通一个文件识别示例。
2. 理解 `Config -> Recognizer -> Stream -> Result` 的对象关系。
3. 对比在线和非流式示例中的流生命周期。
4. 查看 C API，理解各语言绑定的稳定边界。
5. 再进入 `sherpa-onnx/csrc/` 跟踪模型适配、特征和解码实现。
6. 最后研究 Android、iOS、HarmonyOS、Flutter 或 WebAssembly 的打包方式。

官方仓库中常用目录的职责如下：

```text
sherpa-onnx/
├── sherpa-onnx/csrc/       核心 C++ 实现
├── sherpa-onnx/c-api/      公共 C API
├── python-api-examples/    Python 示例
├── cxx-api-examples/       C++ 示例
├── c-api-examples/         C 示例
├── java-api-examples/      Java 示例
├── kotlin-api-examples/    Kotlin 示例
├── android/                Android 应用与构建
├── harmony-os/             HarmonyOS 示例
├── ios-swift/              iOS 与 Swift 示例
├── flutter/                Dart / Flutter 封装
└── wasm/                   WebAssembly 示例
```

目录会随版本演进，实际使用时应以[官方仓库](https://github.com/k2-fsa/sherpa-onnx)为准，不要依赖文章中的目录清单编写构建脚本。

## 适用场景

sherpa-onnx 更适合以下条件：

- 音频不能上传，识别必须在设备或内网完成。
- 产品需要弱网、断网可用或确定的本地延迟。
- 同一模型需要覆盖多个操作系统和编程语言。
- 团队愿意自己验证模型、音频链路、包体和硬件性能。
- 需要把 ASR、VAD、KWS、TTS 等能力放进统一的本地语音架构。

下面的需求不能仅靠接入 sherpa-onnx 解决：

- 没有训练数据却要求模型立即适应特殊口音和领域词。
- 设备算力和内存不足，却选择超出预算的大模型。
- 原始录音存在削顶、丢帧或严重回声，希望框架自动修复。
- 需要云端模型持续更新、统一计费和托管运维，却没有本地部署诉求。
- 产品要求特定热词能力，但选择的模型结构不支持。

## 学习与落地路线

### 文件识别

先用 Python、CPU 和官方预训练模型识别一段 WAV，确认模型文件、词表、输入音频和 API 调用都正确。这个阶段只关心链路能否闭环，不急于量化和跨平台。

### VAD 加非流式识别

把一段长录音切成多个语音段，再逐段识别并恢复到原始时间轴。会议转写、录音质检和接近实时的短句识别都常用这条路线。

### 真正的流式识别

持续送入短音频块，循环解码中间结果，用端点检测决定何时固化一句话。重点测首字延迟、中间结果抖动和终句延迟。

### 模型与硬件评估

使用自己的录音集对比模型、线程数、FP32/INT8 和目标硬件，记录 CER/WER、RTF、延迟、峰值内存、包体和功耗。

### 原生平台集成

最后进入 Java/Kotlin、Swift、C/C++、Dart 或 JavaScript。此时应保持与 Python 验证完全相同的模型和音频样本，避免把模型差异误判为平台适配问题。

## 项目启动检查

- 目标是流式、非流式，还是 VAD 加非流式。
- 输入采样率、声道、PCM 格式和音频块大小是否明确。
- 模型、词表和附加文件是否来自同一发布包。
- 目标语言、热词、时间戳和标点能力是否经过模型级确认。
- CPU、内存、包体、功耗和发热预算是否有上限。
- 是否有真实设备、噪声、距离和口音测试集。
- 模型许可证是否允许目标产品使用和分发。
- 线上是否能记录模型版本、音频摘要和分段耗时。

## 后续阅读

- [识别运行模式](./recognition-modes.md)：理解流式、非流式、VAD、端点检测和核心 API。
- [模型与部署选型](./model-selection-deployment.md)：根据语言、实时性、热词、硬件和交付方式选择方案。
- [语音识别](../speech-recognition.md)：回到 ASR 的通用模型、解码、热词和评估机制。

## 总结

sherpa-onnx 的价值不是提供一个固定准确率，而是把本地语音模型变成可配置、可跨平台、可测量的工程能力。正确的落地顺序是先固定模型和音频输入，再验证 Recognizer/Stream 生命周期，之后才进入量化、硬件加速和产品封装。
