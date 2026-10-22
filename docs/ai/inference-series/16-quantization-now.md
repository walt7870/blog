# 16. FP8、FP4 与 INT 量化的当前实践

小林准备把资料助手放到一张显存有限的 GPU 上。权重能装下，长文档与多人对话却把 KV 缓存挤满了。这时，先压缩权重还是先缩小缓存，要由实际占用决定。

前两篇解释了浮点格式和混合精度，本篇沿着这个部署问题，读懂 W4A16 等配置，比较权重、激活和 KV 的量化路线，再建立可回退的对照实验。

## 先读懂 W/A/KV 记法

| 写法 | 量化对象 | 还需单独确认 |
| --- | --- | --- |
| W4A16 | 权重 4 bit，激活 16 bit | KV 格式、scale 与分组 |
| W8A8 | 权重和激活都 8 bit | 累加、输出与 KV 格式 |
| FP8 weight-only | 权重用 FP8 | 激活、KV 和后处理仍可能是 BF16/FP32 |
| KV8 / FP8 KV | KV cache 用 FP8 | 权重与激活格式 |
| INT4 / FP4 | 整数或浮点低位表示 | 两者的 scale、分布和 kernel 不同 |

把对象拆开后，显存收益才容易估算。BF16 权重每个值 2 字节，裸 FP8 约 1 字节，裸 INT4/FP4 约 0.5 字节；scale、零点、未量化层、对齐和临时 workspace 会把实际占用抬高。KV cache 还会随上下文和并发增长，所以长上下文服务可能优先量化 KV，而不是先量化权重。

## 量化有三条常见路线

**权重量化**只改变模型参数，激活仍可用 BF16/FP16。W4A16 常见于显存受限的单卡推理，反量化和矩阵乘法是否融合决定了实际速度。

**权重与激活量化**让矩阵乘法两侧都进入 INT8 或 FP8，带宽和 Tensor Core 利用率可能更好，但要处理动态范围和校准。FP8 的 E4M3/E5M2 选择、per-tensor/per-channel/per-token scale 和异常值处理都会影响质量。

**KV cache 量化**主要扩大可缓存 token 数。vLLM 当前文档支持 FP8 KV cache，并区分 per-tensor、per-attention-head 和是否经过校准；SGLang 文档还列出了 FP4 KV cache 的实验路径，同时提醒没有融合反量化的 attention backend 可能因为额外转换而变慢。

## 离线和在线量化不要混用

离线量化先用校准数据生成 checkpoint，部署时直接读取量化配置。它启动更快，量化结果可以在上线前固定验收。在线量化则在服务启动时读取 BF16/FP16 权重并计算 scale，方便试验，但会增加启动时间和显存峰值。

SGLang 的[量化文档](https://docs.sglang.ai/advanced_features/quantization.html)明确建议：已经离线量化的模型不要再额外打开在线 `--quantization`；vLLM 的[量化文档](https://docs.vllm.ai/en/latest/features/quantization/)也按量化配置和后端分发到不同的实现。遇到“能加载但速度变慢”时，先确认是否走了 fallback 或重复量化路径。

## 当前工具链的事实边界

以下按 **2026-10-21** 查阅的开发分支文档整理；当时的正式发布为 vLLM `0.32.0`、SGLang `0.5.22`。开发文档可能包含尚未进入正式版的能力，部署时需要查目标 tag 的实现与支持矩阵。

| 组件 | 当前文档可见能力 | 需要现场确认 |
| --- | --- | --- |
| vLLM 开发文档 | FP8、INT8、INT4、量化 KV cache、NVFP4 后端项 | 发布 tag、GPU 架构、Marlin/CUTLASS/FlashInfer 路径、模型配置 |
| SGLang 开发文档 | FP8、ModelOpt FP4、NVFP4、MXFP 及量化 KV cache | 发布 tag、Blackwell 原生路径、AMD/Ascend 后端、实验性限制 |
| Hugging Face [bitsandbytes](https://huggingface.co/docs/transformers/main/en/quantization/bitsandbytes) | LLM.int8、4-bit/NF4、QLoRA 相关加载 | 设备、版本、只训练额外参数的限制 |
| PyTorch AMP | `torch.autocast`、FP16/BF16 混合精度、GradScaler | 算子白名单、编译路径和后端数值设置 |

找到候选路线后，要把格式名与 block size、scale 类型、模型配置和目标 GPU 一起记录。尤其是 FP4、MXFP4、NVFP4，完整配置才能确定能否加载，以及实际使用哪个 kernel。

## 一个可回退的部署对照

先用 BF16 建立基线，观察权重、KV 与工作区各占多少，再选择一个主要变量做对照：

```text
基线：BF16 权重 / BF16 激活 / BF16 KV

KV 随长文档和并发增长 → 仅将 KV 改为 FP8
权重占据主要容量     → 评估 FP8 weight-only 或 W4A16
矩阵计算成为瓶颈     → 评估受硬件支持的 W8A8 / FP8 路径
目标硬件原生支持 FP4 → 单独比较匹配的 NVFP4 / MXFP4 方案
```

对小林的长文档助手，可以先测试 FP8 KV；如果换成权重本身就放不下的大模型，权重量化可能更优先。不同对象的风险由任务和实现决定，每轮保留基线 checkpoint 与启动参数，遇到退化时用同一输入回到基线定位。

## 验收清单

部署前至少固定以下条件：

- 模型 revision、量化配置、scale 来源和未量化层；
- GPU 型号、驱动、CUDA/ROCm、框架版本和 attention backend；
- prompt、音频样例、采样参数、上下文长度、并发和输出上限；
- 峰值显存、权重加载时间、TTFT、decode/RTF、吞吐和排队；
- 文本准确性、结构化输出、ASR CER/WER、TTS 音质、说话人相似度和阈值翻转；
- `NaN/Inf`、溢出、服务重启、长上下文和混批行为。

不要用“文件变小”替代“服务变快”，也不要用短问答通过替代长上下文、音频质量和阈值附近样本通过。对分类或检测模型，分数分布和决策阈值必须与 FP32/BF16 基线并列保存。

小林的选择最终取决于哪部分占空间、哪段计算慢，以及量化后还能否完成原来的任务。W/A/KV 帮助定位对象，格式和 scale 决定表示方式，kernel 决定执行路径，质量与服务指标决定是否采用。

这一组精度文章到这里收束。可以带着选好的配置回到[部署、压测与排错](./13-practice.md)，做一次同条件实验；遇到新的格式，也沿着这几个问题逐项确认。
