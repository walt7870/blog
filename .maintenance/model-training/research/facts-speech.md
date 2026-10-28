# 事实核对：speech 组（第 14、15、16 篇）

核对日期：2026-10-27。结论列：✅ 与一手来源一致；⚠️ 有差异或只能部分确认，正文已按核对结果写；✏️ 正文的推导或估算（非外部事实）。

## 第 14 篇 语音识别怎样训练

| 事实 | 正文写法 | 来源 | 结论 |
| --- | --- | --- | --- |
| Whisper 预处理：16 kHz 重采样，80 通道 log-Mel，25 ms 窗、10 ms 步长，30 秒切段 | 同 | https://arxiv.org/abs/2212.04356（ar5iv 全文 2.2 节、2.1 节） | ✅ |
| Whisper 编码器入口两层卷积，第二层步长 2 | 编码器每秒 50 帧 | 同上 2.2 节 | ✅ |
| Whisper 训练数据 680,000 小时，多语言多任务；其中 117,000 小时覆盖 96 种其他语言，125,000 小时 X→英翻译 | 同 | 同上摘要与 2.1 节 | ✅ |
| Whisper 用启发式规则剔除机器生成字幕 | 同 | 同上 2.1 节 | ✅ |
| Whisper 论文标题含 Large-Scale Weak Supervision，2022-12-06 提交 | 写“2022 年” | 同上 | ✅ |
| 各语言（中文）训练小时数 | 正文不写具体数 | 论文附录 E 只有图，文字版无表 | ⚠️ 未核到文字数据，不写 |
| Whisper large-v3：100 万小时弱标注 + 400 万小时由 large-v2 生成的伪标注；128 个 Mel 频带；15.5 亿参数（1550M）；相比 large-v2 错误降低 10%—20% | 同 | https://huggingface.co/openai/whisper-large-v3 | ✅ |
| CTC：Graves, Fernández, Gomez, Schmidhuber，ICML 2006，不需要预先切分的训练数据 | 同 | https://mlanthology.org/icml/2006/graves2006icml-connectionist ；DOI 10.1145/1143844.1143891 | ✅ |
| RNN Transducer：Graves 2012，arXiv 1211.3711，“Sequence Transduction with Recurrent Neural Networks” | 写“2012 年提出” | https://arxiv.org/abs/1211.3711 | ✅ |
| Conformer：卷积 + Transformer，同时建模局部与全局依赖；LibriSpeech test/test-other 无 LM 2.1%/4.3%，2020 | 只写结构思想和年份 | https://arxiv.org/abs/2005.08100 | ✅ |
| Paraformer：非自回归，CIF 预测输出 token 数，GLM 采样器；AISHELL-1/2 与 2 万小时工业数据；比自回归 Transformer 快 10 倍以上、精度接近；Interspeech 2022 | 同 | https://arxiv.org/abs/2206.08317 | ✅ |
| FunASR 模型库：paraformer-zh 220M 参数，zh/en，带时间戳；有流式版本；Python 示例支持 hotword 参数；模型权重许可证另见各模型卡 | 只写“FunASR 开源，提供中文 Paraformer 和流式版本” | https://github.com/modelscope/FunASR | ✅（训练小时数 README 未写，正文不写） |
| wav2vec 2.0：在隐空间掩码，在量化后的隐表示上做对比任务；5.3 万小时无标注预训练 + 10 分钟有标注，LibriSpeech test-clean/test-other WER 4.8/8.2；1 小时有标注超过此前 100 小时子集最佳结果；2020 | 同 | https://arxiv.org/abs/2006.11477 | ✅ |
| WenetSpeech：10,000+ 小时高质量标注 + 2,400+ 小时弱标注 + 约 10,000 小时无标注，总计 22,400+ 小时；来自 YouTube 与播客，YouTube 用 OCR 字幕对齐 | 同 | https://arxiv.org/abs/2110.03370 | ✅ |
| AISHELL-1：400 名来自不同口音地区的说话人，安静室内高保真麦克风，16 kHz | 只作对照提及“安静室内录制” | https://www.openslr.org/33/ | ✅（小时数页面未写，不写） |
| 每秒帧数：(16000 − 400)/160 + 1 = 98.5 → 实现常补边到 100 帧/秒；5 秒 = 80,000 采样点 → 约 500 帧 × 80 = 40,000 个数；Whisper 编码器降采样后 250 帧 | 正文写推导 | 推导 | ✏️ |
| Transducer 联合网络在训练时要对每个 (帧 t, 已输出 u) 组合算一次词表分布，张量为 T×U×V | 正文写机制与数值示例 | 推导（由 RNN-T 定义） | ✏️ |

## 第 15 篇 语音识别微调

| 事实 | 正文写法 | 来源 | 结论 |
| --- | --- | --- | --- |
| openai/whisper `transcribe()` 的 `initial_prompt`：给第一个窗口提供提示，可用于自定义词汇、专有名词 | 同 | https://github.com/openai/whisper/blob/main/whisper/transcribe.py | ✅ |
| `condition_on_previous_text` 关掉后不易陷入重复循环；`hallucination_silence_threshold`（需 word_timestamps）在检测到可能幻觉时跳过长静音 | 同 | 同上 | ✅ |
| `no_speech_threshold` 默认 0.6、`logprob_threshold` 默认 −1.0；论文称仅靠 nospeech 概率不足以判断无语音，两者结合更可靠 | 同 | 同上；论文 ar5iv 4.5/附录 | ✅ |
| Whisper 论文局限一节：完全幻觉（输出与音频无关的文本）、重复循环 | 同 | https://arxiv.org/abs/2212.04356 | ✅ |
| Whisper large-v3 模型卡：预测可能包含音频中没说的内容（幻觉）；序列到序列结构容易生成重复文本 | 同 | https://huggingface.co/openai/whisper-large-v3 | ✅ |
| Careless Whisper（Koenecke 等，2024，arXiv 2402.08021，FAccT 2024）：约 1% 转写含整句幻觉，且更多发生在非语音时长占比较高的说话人（失语症组） | 同 | https://arxiv.org/abs/2402.08021 | ✅ |
| large-v3 模型卡提到可通过微调提升特定语言与任务，并链接一篇“少至 5 小时标注数据”的微调指南 | 正文写“官方模型卡给出的微调指南只用了 5 小时数据做演示，所需数据量取决于差距” | 同上 | ✅；简报里的“10—100 小时经验值”未找到一手依据，正文不写此区间 |
| Hugging Face PEFT 指南：Whisper large-v2 8-bit 加载 + LoRA，r=32、alpha=64、target_modules=q_proj,v_proj，可训练参数 15,728,640 / 1,559,033,600 ≈ 1.01% | 同 | https://huggingface.co/docs/peft/main/en/task_guides/int8-asr | ✅ |
| LoRA 参数验算：Whisper large 共 32 层编码器 + 32 层解码器，d=1280；编码器 32 个自注意力，解码器 32 个自注意力 + 32 个交叉注意力 = 96 个注意力块 × 2 个投影 × r(1280+1280) = 96×2×32×2560 = 15,728,640 | 正文写推导 | 推导，与指南输出一致 | ✏️ ✅ |
| 速度扰动：Ko、Peddinti、Povey、Khudanpur，Interspeech 2015，0.9/1.0/1.1 三份，四个任务平均相对提升 4.3% | 同 | https://www.isca-archive.org/interspeech_2015/ko15_interspeech.html | ✅ |
| SpecAugment：直接作用在滤波器组特征上，特征扭曲、频带掩码、时间块掩码；LibriSpeech 960h test-other 无 LM 6.8% WER；Interspeech 2019 | 同 | https://arxiv.org/abs/1904.08779 | ✅ |
| Whisper 文本规范化：WER 会惩罚无害的格式差异，论文附录 C 做了规范器 | 同 | 论文 3.2 节与附录 C | ✅ |

## 第 16 篇 语音合成怎样训练

| 事实 | 正文写法 | 来源 | 结论 |
| --- | --- | --- | --- |
| Tacotron 2：循环序列到序列 + 注意力，字符 → Mel 频谱，改进的 WaveNet 声码器；MOS 4.53 对专业录音 4.58；ICASSP 2018 | 同 | https://arxiv.org/abs/1712.05884 | ✅ |
| FastSpeech 2：用真实目标而非教师输出训练；训练时输入提取的时长、音高、能量，推理时用预测值；训练比 FastSpeech 快 3 倍；ICLR 2021 | 同 | https://arxiv.org/abs/2006.04558 | ✅ |
| HiFi-GAN：建模音频周期模式是关键；单张 V100 上生成 22.05 kHz 音频比实时快 167.9 倍；NeurIPS 2020 | 同 | https://arxiv.org/abs/2010.05646 | ✅ |
| VITS：条件 VAE + 归一化流 + 对抗训练，随机时长预测器；LJ Speech 上 MOS 接近真人录音；ICML 2021 | 同 | https://arxiv.org/abs/2106.06103 | ✅ |
| LJ Speech：13,100 条，约 24 小时，单一说话人，22,050 Hz，公有领域 | 同 | https://keithito.com/LJ-Speech-Dataset/ | ✅ |
| SoundStream：全卷积编解码 + 残差向量量化，单模型 3—18 kbps，量化器 dropout；2021 | 同 | https://arxiv.org/abs/2107.03312 | ✅ |
| EnCodec：流式编解码 + 量化隐空间，24 kHz 单声道 / 48 kHz 立体声；README：残差向量量化，24 kHz 模型 1.5/3/6/12/24 kbps 对应 2/4/8/16/32 个码本 | 同 | https://arxiv.org/abs/2210.13438 ；https://github.com/facebookresearch/encodec | ✅ |
| VALL-E：EnCodec 6 kbps，8 个残差量化器、每个 1024 项，24 kHz 输入 75 Hz 帧率；LibriLight 约 6 万小时、约 7000 名说话人，文本由 ASR 生成；自回归预测第 1 层码本 + 非自回归预测第 2—8 层；3 秒注册录音作声学提示；论文提到可能被用于冒充并提出构建检测模型；2023-01 | 同 | https://arxiv.org/abs/2301.02111（HTML 全文） | ✅ |
| 码率验算：75 帧/秒 × 8 码本 × log2(1024)=10 bit = 6000 bit/s = 6 kbps；每秒 600 个 token | 正文推导 | 推导，与论文一致 | ✏️ ✅ |
| CosyVoice（2024-07）：多语言 ASR 编码器中插入向量量化得到监督语义 token（单码本 4096）；LLM 文本→token；最优传输条件流匹配 token→Mel；HiFi-GAN 声码器；说话人向量来自预训练声纹模型；训练数据中文 13 万、英文 3 万、粤语 5000、日语 4600、韩语 2200 小时，合计约 17.18 万小时 | 正文写“约 17 万小时，中文约 13 万” | https://arxiv.org/abs/2407.05407（HTML 全文） | ✅（token 帧率论文未写，正文不写） |
| 《互联网信息服务深度合成管理规定》第十四条：提供人声等生物识别信息编辑功能的，应提示使用者依法告知被编辑的个人并取得其单独同意；第十六、十七条：添加不影响使用的标识、对合成人声/仿声等可能导致混淆的显著标识；2023-01-10 施行 | 同 | https://www.cac.gov.cn/2022-12/11/c_1672221949354811.htm | ✅ |
| 《人工智能生成合成内容标识办法》2025-09-01 施行，显式标识（文字、声音、图形等）与隐式标识（元数据，鼓励数字水印）；配套 GB 45438—2025 | 同 | 新华网 2025-03-14 报道 https://www.news.cn/politics/20250314/b7a24028f2924b7681e6ed1bfbd8fade/c.html | ⚠️ 未取到网信办原文页面，只用到发布机构转载的条款概要；正文只写两类标识及施行日期 |
| AudioSeal（Meta，arXiv 2401.17264，ICML 2024）：面向局部检测的音频水印，样本级定位，对常见音频处理鲁棒，检测速度比此前方法快至两个数量级 | 同，作为“水印怎样工作”的例子 | https://arxiv.org/abs/2401.17264 | ✅ |

## 补充（推导与机构）

| 事实 | 正文写法 | 来源 | 结论 |
| --- | --- | --- | --- |
| Tacotron 2 作者来自 Google；FastSpeech 2 作者来自浙江大学与微软；VALL-E 来自微软；Paraformer 作者来自阿里巴巴达摩院；CosyVoice 来自阿里巴巴 | 同 | 各论文 arXiv 页面作者信息 | ⚠️ 机构按论文署名常识写，未逐篇打开 PDF 首页核对单位 |
| 22.05 kHz、hop 256 为 HiFi-GAN/LJ Speech 常见配置，3 秒 ≈ 258 帧 | 正文写“常见配置” | https://github.com/jik876/hifi-gan config_v1.json（hop_size 256） | ✏️ 示意 |
| HiFi-GAN 167.9 倍实时 → RTF ≈ 1/167.9 ≈ 0.006（仅声码器、V100） | 同 | 推导 | ✏️ |
| VALL-E 设定下 3 秒 = 75 × 8 × 3 = 1800 个 token | 同 | 推导 | ✏️ |
| Whisper 全参数训练状态 15.5 亿 × 16 字节 ≈ 24.8 GB | 同 | 推导（简报 16 字节口径） | ✏️ |
| CER 例：“钉钉审批怎么走”→“盯盯审批怎么走”，2/7 ≈ 28.6% | 同 | 推导 | ✏️ |
| Transducer joiner 张量示例：250 × 7 × 5000 ≈ 875 万；×32 条 ×4 字节 ≈ 1.1 GB | 同，标“示意值” | 推导 | ✏️ |
| ASR 回环查不出多音字误读 | 写“大概率”，作为评估盲区 | 推理（识别模型依上下文出字） | ✏️ 未做实测 |
| 微调所需小时数、学习率比例 | 正文不给具体数，只写“取决于差距”“比预训练小得多” | 未找到一手依据 | ⚠️ |

## 与简报的差异

- 简报提到“10–100 小时经验值仅在有依据时使用”：未找到一手来源支持该区间，第 15 篇改为“取决于差距”，只引用模型卡微调指南的 5 小时演示。
- 简报其余数字（Whisper 680,000 小时；large-v3 100 万 + 400 万小时）核对一致。
