# facts-basics：第 01—03 篇事实核对

核对日期 2026-10-27。计算脚本在会话 scratch 中用 Python 3 标准库运行，关键算式抄在下面，可独立复算。

## Llama-3.1-8B 配置与参数量

- 来源：Hugging Face `config.json`（镜像 unsloth/Meta-Llama-3.1-8B，`_name_or_path` 为 meta-llama/meta-Llama-3.1-8B；官方仓库需登录）https://huggingface.co/unsloth/Meta-Llama-3.1-8B/raw/main/config.json
- `hidden_size` 4096、`intermediate_size` 14336、`num_hidden_layers` 32、`num_attention_heads` 32、`num_key_value_heads` 8、`head_dim` 128、`vocab_size` 128256、`tie_word_embeddings` false、`max_position_embeddings` 131072、`torch_dtype` bfloat16。✅ 与简报一致。
- 参数量按配置逐项复算：
  - 词嵌入 = 输出层 = 128256 × 4096 = 525,336,576；
  - 每层线性层 q 4096×4096、k/v 各 4096×1024、o 4096×4096、gate/up 各 4096×14336、down 14336×4096，合计 218,103,808；加两个 RMSNorm 8192；
  - 32 层线性层合计 6,979,321,856；
  - 总计 2×525,336,576 + 32×218,112,000 + 4096（最终 norm）= **8,030,261,248**。✅ 约 80.3 亿。
- 16 字节/参数：8,030,261,248 × 16 = **128.48 GB = 119.7 GiB**。✅ 简报“约 128.5 GB”正确。BF16 权重 16.06 GB。

## Llama 3.1 训练资源（模型卡）

- https://raw.githubusercontent.com/meta-llama/llama-models/main/models/llama3_1/MODEL_CARD.md
- 8B 1.46M、70B 7.0M、405B 30.84M H100-80GB GPU 小时，合计 39.3M。✅ 简报一致。
- “pretrained on ~15 trillion tokens”，表格写 15T+；预训练数据截止 2023 年 12 月。✅
- 模型卡：指令版用 SFT 和 RLHF 对齐。Llama 3 论文（arXiv 2407.21783）§4：每轮后训练为 SFT 后接 DPO，含拒绝采样（RS），先训练奖励模型，进行多轮。✅
- Llama 3 论文 Table 3：8B 峰值学习率 3×10⁻⁴（70B 1.5×10⁻⁴，405B 8×10⁻⁵）；405B 用 AdamW，线性 warmup 8,000 步，余弦衰减到 8×10⁻⁷，共 1,200,000 步；初始 batch 4M token、序列 4096，后加倍到 8M token、序列 8192，再到 16M。405B 训练 BF16 MFU 38—43%。✅
- 6ND：6 × 8.03×10⁹ × 15×10¹² ≈ 7.2×10²³ FLOPs ✅；按 989 TFLOPS 满载折约 20.3 万 GPU 小时，模型卡 146 万 GPU 小时远大于此（还含有效利用率不到满载、以及模型卡统计口径可能包含的额外训练），第 01 篇只引用 146 万这一官方数，不做利用率推断（留给第 04 篇）。

## ZeRO（arXiv 1910.02054）

- https://arxiv.org/abs/1910.02054 PDF §3.1：混合精度 Adam 需 fp16 参数 2Ψ、fp16 梯度 2Ψ，优化器状态 fp32 参数副本、momentum、variance 各 4Ψ，K=12，合计 16Ψ 字节；1.5B GPT-2 至少 24 GB。✅ 论文用 fp16，现代训练常用 BF16，字节数相同。
- §3.2：1.5B GPT-2，序列 1K、batch 32，激活约 60 GB；激活检查点约降到平方根量级、代价约 33% 重计算，降到约 8 GB。脚注：GPT-2 类结构激活总量约 12 × hidden × batch × seq × layers（个数）。临时缓冲区、显存碎片（极端情况下仍有 30% 以上空闲却 OOM）。✅
- ZeRO-DP 三阶段：Pos 4Ψ+12Ψ/Nd、Pos+g 2Ψ+14Ψ/Nd、Pos+g+p 16Ψ/Nd；7.5B、Nd=64 时 120 GB → 1.9 GB。✅（第 03 篇只点到“切分到多卡”，细节留第 08 篇）

## 激活显存（Megatron，arXiv 2205.05198）

- Korthikanti et al. “Reducing Activation Recomputation in Large Transformer Models”：每层激活（16 位，无并行）= sbh(34 + 5as/h) 字节，s 序列长度、b 微批大小、h 隐藏维度、a 头数；全量重计算每层只存输入 2sbh；观测到全量重计算 30—40% 执行时间开销。✅
- 该公式针对 GPT 类结构（4h MLP、含 dropout、注意力分数矩阵显式保存）。Llama 用 SwiGLU（3.5h、三个矩阵）、GQA、无 dropout，配合 FlashAttention 时 5as/h 项不再存储。正文明确写成“量级估算”，系数 34 只作直觉。
- 代入 8B、s=2048、b=1：34 × 2048 × 4096 × 32 = 9.13 GB；全量重计算的层输入 2sbhL = 0.54 GB，单层重算峰值 34sbh = 0.29 GB；logits 2048 × 128256 × 4 字节（FP32）= 1.05 GB，BF16 0.53 GB。均为估算。
- 重计算代价：前向 1 份、反向约 2 份，多做一次前向 → 约多 1/3 计算，与 ZeRO 论文 33%、Megatron 实测 30—40% 一致。✅

## LoRA r=16 全部 7 种线性层

- 每层 (in+out)×r：q (4096+4096)×16=131,072；k、v 各 (4096+1024)×16=81,920；o 131,072；gate、up、down 各 (4096+14336)×16=294,912；合计 **1,310,720** ✅；32 层 41,943,040（约 4194 万）✅；占 8,030,261,248 的 0.522% ✅；×16 字节 = 0.671 GB ✅。

## QLoRA（arXiv 2305.14314）与 bitsandbytes

- 论文：NF4、Double Quantization、Paged Optimizers；65B 微调从 >780 GB 降到 <48 GB。✅
- 一级量化 blocksize 64，32 位常数 → 32/64 = 0.5 bit/参数；双重量化后 8/64 + 32/(64×256) = 0.127 bit/参数。✅ 原文。
- 论文 7B LLaMA 示例：4 bit 底座 5,048 MB；LoRA 参数 26 MB，batch 1 时 LoRA 输入梯度 567 MB，用梯度检查点降到平均每序列 18 MB；附录 G：7B 总占用 6.9 GB（batch 1、序列 512、梯度检查点）。✅
- bitsandbytes `Params4bit` 默认 `blocksize=64`、`compress_statistics=True`（即双重量化）：https://raw.githubusercontent.com/bitsandbytes-foundation/bitsandbytes/main/bitsandbytes/nn/modules.py ✅
- transformers bitsandbytes 集成只替换 `nn.Linear`，`lm_head` 等输出层默认不转换（`llm_int8_skip_modules` / keys-to-not-convert），词嵌入是 `nn.Embedding` 不被量化。✅（源码 src/transformers/integrations/bitsandbytes.py）
- 复算 8B 底座：线性层 6,979,321,856 × (4 + 0.127)/8 = 3.60 GB；词嵌入 + 输出层 BF16 1,050,673,152 × 2 = 2.10 GB；norm 约 0.5 MB。合计 **约 5.70 GB（5.31 GiB）**；不开双重量化为 6.03 GB。✅ 简报 5.5—6 GB 成立，正文写“约 5.7 GB”。

## PyTorch AdamW

- 源码 https://raw.githubusercontent.com/pytorch/pytorch/main/torch/optim/adamw.py：默认 lr=1e-3，betas=(0.9, 0.999)，eps=1e-8，weight_decay=1e-2。✅
- adam.py：`decoupled_weight_decay` 时先 `param.mul_(1 - lr * weight_decay)`，再做 Adam 更新；普通 Adam 的 weight_decay 是把 λθ 加进梯度（L2）。✅ 文档页 https://docs.pytorch.org/docs/stable/generated/torch.optim.AdamW.html（抓取失败，按源码核对）。
- 正文手算（lr=1e-4、λ=0.1、θ=0.5、g₁=-0.39、g₂=-0.20）：第 1 步 m=-0.039、v=0.0001521、m̂=-0.39、v̂=0.1521、比值 -1.000，θ 0.5 → 0.500095；第 2 步 m=-0.0551、v=0.00019195、m̂=-0.290、v̂=0.0960、比值 -0.936，θ → 0.5001836。

## Hugging Face Trainer 默认与梯度累积

- training_args.py：learning_rate 5e-5，max_grad_norm 1.0。✅
- https://huggingface.co/blog/gradient_accumulation（2024-10-16）：梯度累积在 token 级损失上应“全部 micro-batch 总损失 ÷ 全部非 padding token 数”，与“各 micro-batch 平均损失再平均”不同；Trainer 当时有此问题并修复。✅ 正文只讲机制和年份。

## 其他模态（第 01 篇）

- Whisper（arXiv 2212.04356）：680,000 小时多语言弱监督数据。✅
- CLIP（arXiv 2103.00020）：4 亿图文对。✅

## 数值格式

- BF16 有 7 位显式尾数，在 [0.5, 1) 区间相邻可表示数间隔 2⁻⁸ = 0.0039；FP32 为 2⁻²⁴ ≈ 6×10⁻⁸。0.5 加 1×10⁻⁴ 在 BF16 中舍入回 0.5。✅（按格式定义计算）
- H100 SXM BF16 稠密约 989 TFLOPS、80 GB、3.35 TB/s：沿用 .maintenance/llm-inference/research/facts.md 的核对。

## 交叉熵手算

- 4 个候选 logits 2.0/1.0/0.5/-1.0：exp 7.389/2.718/1.649/0.368，和 12.124，概率 0.6095/0.2242/0.1360/0.0303；正确 token“三天”损失 -ln 0.6095 = 0.495；对 logits 梯度 = p − one-hot = -0.3905/0.2242/0.1360/0.0303。
- 均匀猜 128,256 个 token：ln 128256 = 11.76，作为随机初始化模型的起点量级。

## 与简报不同之处

- 无数值错误。简报中 QLoRA“5.5—6 GB”收窄为约 5.7 GB（双重量化）/6.0 GB（不开）。
- 简报说 8 KV 头的 k/v 投影维度未直说，按 8×128=1024 计算。

## Llama 2 预训练超参（第 02 篇引用）

- Llama 2 论文 arXiv 2307.09288 §2.2：AdamW β1=0.9、β2=0.95、eps=1e-5；余弦学习率，warmup 2000 步，衰减到峰值的 10%；weight decay 0.1；梯度裁剪 1.0。✅（PDF 第 5 页）
