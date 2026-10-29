# 18. 其他主流开源模型：Mistral、Gemma、GLM、Kimi、gpt-oss 与 MiniMax

上一篇看到 DeepSeek 一家把 MLA、细粒度 MoE、MTP 和稀疏注意力一路做下来。其他开源模型面对的是同一组问题：KV Cache 太大、长上下文太贵、大模型训练不稳、MoE 路由怎样均衡。它们给出的答案各不相同。这一篇按家族读 Mistral、Gemma、GLM、Kimi、gpt-oss 和 MiniMax 的 `config.json` 与 Transformers 源码，每家只讲架构上与众不同的选择，最后用一张规格表对齐，并说明 GPT、Claude、Gemini 这些闭源模型官方公开过什么。

读完你应该能拿到其中任何一个模型的配置，说出它在注意力、FFN 和稳定性上各选了哪条路线，并算出资料助手把一整本 10 万 token 的员工手册放进上下文时它要存多少 KV。各模型的配置以 2026 年 10 月下旬 Hugging Face 上的 `config.json` 为准。

## 各家把“看全文”的层放在哪里

几十层注意力并不都要看完整的上下文。最直观的差别是：哪些层看全部历史，哪些层只看附近，哪些层干脆不存 KV、只保留一个固定大小的状态。

![七个模型前 24 层的注意力类型：Mistral 7B 全部滑动窗口，Gemma 2 局部全局 1:1，Gemma 3 为 5:1，gpt-oss 窗口 128 与全局交替，MiniMax-Text-01 七层闪电注意力接一层 softmax，Kimi Linear 三层 KDA 接一层 MLA，MiniMax-M2 全部完整注意力](/ai/llm-architecture/open-layer-patterns.svg)

只有蓝色和黄色的层需要为每个历史 token 存 KV，它们决定了长上下文的显存账。同样放进 10 万 token 的手册，右侧每 token 的数字乘以 10 万：MiniMax-M2 约 25 GB，Gemma 2 27B 约 19 GB，Gemma 3 27B 约 8.2 GB，gpt-oss-120b 约 3.7 GB，Kimi Linear 只有约 0.8 GB。绿色的局部层另占一块固定大小的显存（窗口长度 × 每层每 token 的字节数），紫色的线性注意力层每层保留一个大小不变的状态矩阵，都不随手册变长而增长。代价在于局部层和线性层都看不到或记不清远处的原文，模型要靠少数全局层完成“回到第 37 页找年假规定”这类精确召回。滑动窗口与汇聚的一般机制见[第 12 篇](./12-efficient-attention.md)，线性注意力为什么召回差见[第 13 篇](./13-linear-hybrid.md)。

## Mistral：从滑动窗口走到 MLA

**Mistral 7B v0.1**（2023 年 9 月，Apache 2.0）在结构上就是 Llama 加一个滑动窗口：32 层、隐藏维度 4096、32 个 Q 头配 8 个 KV 头，`sliding_window` = 4096。Transformers 的 `modeling_mistral.py` 里，和 Llama 唯一的区别就是有窗口时改用 `create_sliding_window_causal_mask`。每层只看最近 4096 个 token，KV Cache 可以做成循环缓冲区，最多存 4096 个位置；信息想传得更远，只能一层层接力，32 层理论上能覆盖 32 × 4096 个位置，但这是感受野的上限，不代表远处的细节能被准确取回。之后的 Mistral 7B v0.2、v0.3 的配置里 `sliding_window` 都是 `null`，改成 32K 的完整注意力、`rope_theta` 从 1 万调到 100 万，滑动窗口没有被沿用。

**Mixtral 8x7B**（2023 年 12 月）和 **Mixtral 8x22B**（2024 年 4 月）把每层 FFN 换成 8 个专家、每个 token 选 2 个，注意力不变，也没有共享专家。路由在 `MixtralTopKRouter` 里是先对 8 个分数做 softmax，取最高的 2 个再重新归一化。按配置复算，8x7B 总参数 467.0 亿、激活 128.8 亿，8x22B 总参数 1406.2 亿、激活 391.5 亿。这是“粗粒度专家”路线：专家少而大，每个专家的中间维度和一个完整的密集 FFN 一样（14336、16384），与 DeepSeek 拆成上百个小专家的做法正好相反，两者的对比见[第 11 篇](./11-moe.md)。

2025 年 12 月的 **Mistral 3** 一代转向了 DeepSeek 式结构。Transformers 里的 `mistral3` 只是多模态外壳（视觉编码器 + 投影层 + 语言模型），真正的语言模型看 `text_config.model_type`：

- **Mistral Large 3**（6750 亿总参数、激活 410 亿，Apache 2.0）的仓库只有 Mistral 自己格式的 `params.json`：61 层、128 个头，`kv_lora_rank` 512、`qk_rope_head_dim` 64 的 MLA，128 个路由专家选 4 个加 1 个共享专家，前 3 层密集。形状几乎就是 DeepSeek-V3，只是专家数减半、每 token 选得更少、每个专家更大（中间维度 4096）。
- **Ministral 3**（3B/8B/14B）是密集的 GQA 模型，`ministral3` 唯一的特别之处是 `get_llama_4_attn_scale`：查询向量乘以 `1 + β·log(1 + ⌊位置 / 原始长度⌋)`（β = 0.1），位置越靠后注意力越“尖”，用来缓解超长上下文里注意力被摊薄的问题，做法来自 Llama 4。
- **Mistral Small 4**（2026 年 3 月，1190 亿总参数、激活 65 亿，Apache 2.0）对应 `mistral4`：`Mistral4Attention` 直接继承 `DeepseekV3Attention`，是 MLA（潜向量只有 256 维）；36 层全是 MoE，128 个专家选 4 个加 1 个共享专家。和 DeepSeek 不同的是路由仍用 softmax 而不是 sigmoid 加偏置。

许可证也要逐个看：Mistral Medium 3.5（1280 亿，密集）用的是附加条款的修改版 MIT，不是 Apache 2.0。

## Gemma：局部与全局交替，再加三道稳定措施

Gemma 系列从第 2 代起一直用局部、全局两种层交替，变化的是比例和细节。

**Gemma 2**（2024 年 6 月）局部、全局 1:1 交替，窗口 4096，上下文 8K。它有三处和 Llama 明显不同的稳定措施：

- **夹心归一化**：`Gemma2DecoderLayer` 每层有 4 个 RMSNorm，`input_layernorm`、`post_attention_layernorm` 包住注意力，`pre_feedforward_layernorm`、`post_feedforward_layernorm` 包住 FFN，子层输出先归一化再加回残差流；
- **logit 软截断**（soft-capping）：注意力分数和最终输出 logits 都过一次 `cap · tanh(x / cap)`，注意力的上限 50、输出的上限 30。代入几个数：x = 10 时 50 · tanh(0.2) ≈ 9.87，几乎不变；x = 80 时 50 · tanh(1.6) ≈ 46.1，被压到上限以内。这能防止个别分数失控，代价是它在 softmax 之前插入了一步逐元素运算，当时的 FlashAttention 和 SDPA 都不支持，Transformers 的 Gemma 2 至今写着 `_supports_sdpa = False`；
- **词嵌入乘 √hidden_size**，注意力缩放用 `query_pre_attn_scalar` 而不是头维度，输出层与词嵌入共享，词表 256K。

**Gemma 3**（2025 年 3 月）把比例改成 5 个局部层接 1 个全局层，窗口缩到 1024（1B 为 512），上下文 128K。两个软截断在配置里都变成了 `null`，改用 QK-Norm（`q_norm`、`k_norm`），注意力又能走高效算子。局部层和全局层还用不同的 RoPE 底数：局部 1 万，全局 100 万。比例从 1:1 到 5:1 的效果，在显存上很直观：27B 的 62 层里只有 10 层全局，每 token 的增长部分是 10 × 2 × 16 × 128 × 2 B = 80 KiB，如果 62 层都是全局层要 496 KiB。

**Gemma 4**（2026 年 4 月）是第一个用 Apache 2.0 发布的 Gemma，首批有 E2B、E4B、26B-A4B（MoE）和 31B 四个尺寸，6 月又补充了不带视觉、音频编码器的 12B（结构见[第 14 篇](./14-multimodal.md)）。它在局部、全局交替的基础上，把两种层做得更不一样：

![Gemma 4 31B 的 50 个局部层用 16 个 256 维的 KV 头、窗口 1024；10 个全局层只有 4 个 512 维的 KV 头，V 复用 K 的投影，用只旋转四分之一维度的 p-RoPE](/ai/llm-architecture/open-gemma4-layers.svg)

全局层少而宽：头维度从 256 翻倍到 512，KV 头从 16 个减到 4 个，`attention_k_eq_v` 让 V 直接复用 K 的投影（省掉 `v_proj`，但缓存里 K、V 仍分开存，因为 K 还要做 RoPE 和归一化），位置编码改成只旋转 25% 维度、底数 100 万的 p-RoPE。所有层的 Q、K、V 都做归一化，注意力缩放系数取 1.0；最终 logits 的软截断 30 又回来了。小尺寸还有两项为端侧设计的改动：E2B/E4B 的后 20/18 层不再计算自己的 K、V，直接复用前面同类层的结果；每层额外加一个 256 维的“逐层词嵌入”（PLE，来自 Gemma 3n），这部分参数按 token 查表、不参与矩阵乘，模型卡把它和“有效参数”分开统计（E2B 有效 2.3B、含嵌入 5.1B）。26B-A4B 的 MoE 层是一个小的密集 MLP 与 128 个专家（选 8 个）并联，模型卡说的“1 个共享专家”就是这个密集 MLP；路由用 softmax，再乘每个专家各自的缩放系数。

Gemma 这三代的取舍可以连起来看：软截断稳定但拖慢算子，于是换成 QK-Norm；全局层越少越省显存，但全局层是唯一能精确回看远处的地方，于是 Gemma 4 让全局层的头更宽、位置编码更适合长距离。归一化和软截断的一般原理见[第 08 篇](./08-residual-norm.md)。

## GLM：从深而窄的 GQA 到 DeepSeek 式稀疏注意力

**GLM-4.5**（2025 年 7 月，MIT，3550 亿总参数、激活 320 亿）在 `glm4_moe` 里有几处少见的选择：92 层、隐藏维度只有 5120，却有 96 个 128 维的 Q 头，注意力内部宽 12288，比残差流宽一倍多；GQA 8 个 KV 头；只对一半的头维度做 RoPE（`partial_rotary_factor` 0.5）；Q、K、V 投影带偏置，并开启 QK-Norm（GLM-4.5-Air 的配置里 `use_qk_norm` 是 `false`）。MoE 部分照搬 DeepSeek-V3 的做法：160 个路由专家选 8 个加 1 个共享专家，前 3 层密集，`Glm4MoeTopkRouter` 继承自 `DeepseekV3TopkRouter`，sigmoid 打分加无辅助损失偏置，还带 1 层 MTP。GLM-4.6、4.7 结构相同，上下文从 128K 扩到约 200K。

**GLM-5**（2026 年 2 月，MIT，7440 亿总参数、激活 400 亿）的 `glm_moe_dsa` 直接继承 `DeepseekV32Config`：MLA（潜向量 512、RoPE 64 维，每头 Q/K 共 256 维、V 256 维，比 DeepSeek 的 192/128 宽）加 DeepSeek Sparse Attention 的闪电索引器（每个查询选 2048 个位置），78 层、256 个专家选 8 个。GLM-5.2（2026 年 6 月）在此基础上提出跨层共享索引器：78 层里只有 21 层自己跑索引器，其余层直接复用前面算出的 top-k 位置，模型卡报告在 100 万 token 时每 token 计算量降为 1/2.9，上下文扩到 1M。GLM-5.3 与 5.2 用同一个基础模型，只改后训练，许可证却从 MIT 换成了自定义的 GLM-5.3 许可。

**GLM-5.3-Flash**（2026 年 8 月，MIT，3200 亿总参数、激活 180 亿）对应 `glm5_next`，是 GLM 第一次用线性注意力的混合结构：45 层里 34 层是 Kimi 式的 KDA 线性注意力，11 层是 MLA + 稀疏索引，比例 3:1；这些 MLA 层完全不用 RoPE（`qk_rope_head_dim` 为 0），残差连接用和 DeepSeek-V4 同类的 mHC（4 条残差流）。一个模型里同时能看到 Kimi Linear 和 DeepSeek-V4 的设计，这是 2026 年开源架构互相借鉴的典型例子。

## Kimi：放大 DeepSeek-V3，再换成线性注意力

**Kimi K2**（2025 年 7 月，修改版 MIT，1 万亿总参数、激活 320 亿）的 `config.json` 里写着 `architectures: DeepseekV3ForCausalLM`，结构就是 DeepSeek-V3，改的是几个配置：注意力头从 128 减到 64，路由专家从 256 加到 384（仍选 8 个），密集层从 3 层减到 1 层，词表 163,840，没有发布 MTP 权重。MLA 配置和层数与 V3 相同，所以每 token 的 KV 也是 68.6 KiB。头数减半直接减少解码时吸收后 MLA 的计算（上一篇算过，它和头数成正比）；专家加多让总参数涨到 1 万亿，每 token 的激活量却和 V3 差不多。模型卡里着重介绍的 MuonClip 是优化器，属于训练配方。之后的 K2-Thinking（2025 年 11 月）结构不变，用量化感知训练把专家权重做成 INT4，上下文 256K；K2.5（2026 年 1 月）和 K2.6（2026 年 4 月）对应 `kimi_k25`，在 K2 的语言模型前接上 4 亿参数的 MoonViT 视觉编码器，并在 K2-Base 上用约 15T 图文混合 token 继续预训练，接法见[第 14 篇](./14-multimodal.md)。

**Kimi Linear**（2025 年 10 月，MIT，480 亿总参数、激活 30 亿）是另一条路：27 层里 20 层是 KDA（Kimi Delta Attention），7 层是 MLA，比例 3:1，上下文 1M。KDA 是门控 DeltaNet 的变体，源码 `KimiLinearDeltaAttention` 的注释说明差别在于衰减按通道而不是按 token 计算；每层只保留一个 32 头 × 128 × 128 的状态矩阵，不随长度增长。源码里完全没有 RoPE，那 7 层 MLA 是不带位置编码的（NoPE），顺序信息由按顺序更新状态的 KDA 层提供。随长度增长的只有 7 层 MLA：7 × 576 × 2 B = 8,064 B，约 7.9 KiB，是 Kimi K2 的九分之一。

2026 年 7 月的 Kimi K3（模型卡写 2.8 万亿总参数、69 层 KDA + 24 层门控 MLA）在 Transformers 5.21.0 里还没有实现，这里不展开。

## gpt-oss：注意力汇聚、窄窗口与 MXFP4

**gpt-oss**（2025 年 8 月 5 日，Apache 2.0）是 OpenAI 公开结构的模型。gpt-oss-120b 总参数 1168 亿、激活 51 亿，36 层；gpt-oss-20b 总参数 209 亿、激活 36 亿，24 层。两者隐藏维度都是 2880，64 个 Q 头、每头只有 64 维，8 个 KV 头；带状窗口 128 的局部层与完整注意力层 1:1 交替；完整层用 YaRN 把上下文从 4096 扩到 131,072。

窗口只有 128 是很激进的选择：一半的层只能看到最近一两句话，第一个 token 早就滑出窗口，模型没法像普通模型那样把“没处放”的注意力权重堆在开头的 token 上（注意力汇聚，[第 12 篇](./12-efficient-attention.md)讲了原理和源码写法）。gpt-oss 给每个头加了一个可学习的汇聚分数，它参与 softmax 的归一化，但不对应任何 token：

![gpt-oss 在 softmax 的分母里加一个可学习的汇聚分数，四个真实 token 的权重按比例缩小、合计约 0.74，剩下约 0.26 不分给任何 token](/ai/llm-architecture/open-attention-sink.svg)

按图里的数字，“？”对前面 4 个 token 的分数是 1.0、0.2、2.0、0.5，汇聚分数 1.5：

```text
普通 softmax：e^1.0 : e^0.2 : e^2.0 : e^0.5 = 2.718 : 1.221 : 7.389 : 1.649，和 12.977
              权重 0.209、0.094、0.569、0.127，合计 1
加汇聚项：    分母变成 12.977 + e^1.5 = 12.977 + 4.482 = 17.459
              权重 0.156、0.070、0.423、0.094，合计 0.743
```

相对大小不变，只是整体可以小于 1，头可以“少看一点”而不必硬塞给某个 token。这个参数不对应任何 token，也不占 KV Cache。DeepSeek-V4 用了同样的设计。

FFN 部分也有几处细节：128 个专家（20b 为 32 个）选 4 个，`GptOssTopKRouter` 先取最大的 4 个 logits 再对这 4 个做 softmax；专家带偏置；激活是带截断的 SwiGLU，门控分支的上限截断在 7、线性分支截断在 ±7，门控用 `x · sigmoid(1.702 x)`，输出为 `(up + 1) · glu`。发布的 MoE 权重是 **MXFP4** 格式：每 32 个数共享一个 8 位的 2 的幂缩放因子，每个数 4 位，平均约 4.25 位；注意力、路由器、词嵌入和输出层仍是 BF16。正因为 MoE 权重占了绝大部分参数，120b 能放进一张 80 GB 的 GPU。MXFP4 的位格式见[数值精度第 05 篇](../precision/05-quantization.md)。分词器是 o200k_harmony，词表 201,088，对话必须使用 harmony 格式。

KV 方面，18 个完整层每 token 存 18 × 2 × 8 × 64 × 2 B = 36 KiB；18 个窗口层每层最多存 128 个位置，总共约 4.5 MiB，与上下文长度无关。

## MiniMax：线性注意力、回到完整注意力、再到块稀疏

MiniMax 三代模型在注意力上走了一个来回，正好是“高效注意力在什么情况下不适用”的实例。

**MiniMax-Text-01**（2025 年 1 月，4560 亿总参数、激活 459 亿）80 层里每 7 层闪电注意力（lightning attention，一种分块计算、带指数衰减的线性注意力）接 1 层完整 softmax 注意力，MoE 有 32 个专家选 2 个，模型卡写训练上下文 1M、推理可外推到 4M。它还用后归一化加残差缩放（残差乘 3.56，约为 (2 × 80)^0.25），和主流的 Pre-Norm 不同。

**MiniMax-M2**（2025 年 10 月，2300 亿总参数、激活 100 亿）反过来，62 层全部是完整 softmax 注意力：GQA 8 个 KV 头、只对一半维度做 RoPE、QK-Norm 作用在整个投影上而不是每个头；MoE 换成 256 个专家选 8 个、sigmoid 打分加偏置。MiniMax 官方博客《Why Did M2 End Up as a Full Attention Model?》解释了原因：混合线性注意力在小规模和常规排行榜上看不出差距，放大以后在复杂的多跳推理上出现明显缺陷，而常规评测测不出来，要专门设计代理指标才能发现；在推理、代码、智能体任务上，他们没有找到稳定追平完整注意力的高效变体。代价就是显存：每 token 248 KiB，10 万 token 的手册要约 25 GB KV。

**MiniMax-M3**（2026 年 6 月，约 4280 亿总参数、激活 230 亿，原生多模态，1M 上下文）又换成了稀疏注意力 MSA，但选的单位和 DeepSeek 不同：`MiniMaxM3VLIndexer` 把键按 128 个 token 一块做最大值池化，每个 GQA 组为每个查询挑 16 块，再加上紧挨着查询的一块；KV 头减到 4 个，前 3 层保持完整注意力。按块选比按 token 选更适合 GPU 成块读取显存，代价是一块里只有几个 token 有用时也要整块读进来。M3 还用了和 gpt-oss 相同的截断 SwiGLU。

## 闭源模型公开了什么

GPT、Claude、Gemini 的旗舰模型都没有公开权重，结构信息只能以官方技术报告为准：

| 厂商 | 官方公开过的结构信息 | 未公开 |
| --- | --- | --- |
| OpenAI | GPT-4 技术报告只说它是基于 Transformer、预测下一个 token 的预训练模型，并明确写明不提供架构、模型大小、硬件、训练算力、数据和训练方法的细节；完整公开结构的是开源权重的 gpt-oss | GPT-4 及之后旗舰模型的层数、参数量、是否 MoE |
| Google | Gemini 1.5 Pro 是稀疏 MoE Transformer，1.5 Flash 是从 Pro 在线蒸馏的 Transformer 解码器；Gemini 2.5 系列是原生支持文本、图像、音频输入的稀疏 MoE Transformer | 参数量、层数、专家数、注意力结构 |
| Anthropic | 未公开 Claude 的架构 | 全部结构信息 |

网上流传的闭源模型参数量、专家数，大多来自推测或泄露，没有官方来源，不能当作事实引用。开源模型里同一家族的结构（例如 gpt-oss 之于 OpenAI、Gemma 之于 Gemini）可以作为参照，但官方从未说过它们与旗舰模型结构相同。

## 规格对比

| 模型 | 发布 | 总 / 激活 | 层数 | 注意力 | 局部 : 全局 | 专家（路由 / 共享 / 选） | 路由 | 上下文 | 许可证 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mistral 7B v0.1 | 2023-09 | 7.2B 密集 | 32 | GQA 32/8 | 全部窗口 4096 | — | — | 32K（config） | Apache 2.0 |
| Mixtral 8x22B | 2024-04 | 141B / 39B | 56 | GQA 48/8 | 无窗口 | 8 / 0 / 2 | softmax | 64K | Apache 2.0 |
| Mistral Large 3 | 2025-12 | 675B / 41B | 61 | MLA 128 头 | 无 | 128 / 1 / 4 | softmax | 256K | Apache 2.0 |
| Mistral Small 4 | 2026-03 | 119B / 6.5B | 36 | MLA 32 头 | 无 | 128 / 1 / 4 | softmax | 256K | Apache 2.0 |
| Gemma 2 27B | 2024-06 | 27B 密集 | 46 | GQA 32/16 | 1:1，窗口 4096 | — | — | 8K | Gemma 条款 |
| Gemma 3 27B | 2025-03 | 27B 密集 | 62 | GQA 32/16 + QK-Norm | 5:1，窗口 1024 | — | — | 128K | Gemma 条款 |
| Gemma 4 31B | 2026-04 | 30.7B 密集 | 60 | 局部 GQA 32/16，全局 4 头 × 512 | 5:1，窗口 1024 | — | — | 256K | Apache 2.0 |
| GLM-4.5 | 2025-07 | 355B / 32B | 92 | GQA 96/8 + QK-Norm | 无 | 160 / 1 / 8 | sigmoid + 偏置 | 128K | MIT |
| GLM-5 | 2026-02 | 744B / 40B | 78 | MLA + 索引器 | 无 | 256 / 1 / 8 | sigmoid + 偏置 | 约 200K | MIT |
| GLM-5.3-Flash | 2026-08 | 320B / 18B | 45 | KDA : MLA 稀疏 = 3:1 | — | 288 / 1 / 8 | sigmoid + 偏置 | 1M | MIT |
| Kimi K2 | 2025-07 | 1T / 32B | 61 | MLA 64 头 | 无 | 384 / 1 / 8 | sigmoid + 偏置 | 128K | 修改版 MIT |
| Kimi Linear | 2025-10 | 48B / 3B | 27 | KDA : MLA = 3:1 | — | 256 / 1 / 8 | sigmoid + 偏置 | 1M | MIT |
| gpt-oss-120b | 2025-08 | 117B / 5.1B | 36 | GQA 64/8 + 汇聚 | 1:1，窗口 128 | 128 / 0 / 4 | top-4 后 softmax | 128K | Apache 2.0 |
| MiniMax-Text-01 | 2025-01 | 456B / 45.9B | 80 | 闪电 : softmax = 7:1 | — | 32 / 0 / 2 | softmax | 1M（训练） | MiniMax 许可 |
| MiniMax-M2 | 2025-10 | 230B / 10B | 62 | 全部完整 GQA 48/8 | 无 | 256 / 0 / 8 | sigmoid + 偏置 | 约 196K | 修改版 MIT |
| MiniMax-M3 | 2026-06 | 约 428B / 23B | 60 | 块稀疏 GQA 64/4 | — | 128 / 1 / 4 | sigmoid + 偏置 | 1M | MiniMax 社区许可 |

“GQA 32/8”表示 32 个 Q 头、8 个 KV 头。参数量取官方公布的数字，Mixtral 按配置复算。

把这几家放在一起看，注意力上有三条路线：Mistral 早期和 Gemma、gpt-oss 用局部层加少量全局层压低 KV；MiniMax-Text-01、Kimi Linear、GLM-5.3-Flash 用线性注意力层替换大部分层；Mistral 3、GLM-5、Kimi K2 则直接采用 DeepSeek 的 MLA，GLM-5 和 MiniMax-M3 再加上按 token 或按块挑选的稀疏注意力。MoE 路由上，sigmoid 加无辅助损失偏置已经成为 GLM、Kimi、MiniMax 的默认选择，Mistral 和 gpt-oss 仍用 softmax。稳定性上，Gemma 从软截断换到 QK-Norm、又在输出端保留软截断，gpt-oss 用汇聚项和截断 SwiGLU。MiniMax-M2 的回撤提醒读者，高效注意力的收益要在目标任务上用专门的召回和多跳推理评测验证。这四篇里的每一个数字，都是从各模型的 `config.json` 和源码里读出来的。下一篇[读懂 config 与源码](./19-reading-models.md)把这套读法系统化：逐字段读真实配置，用一个小脚本只读配置就算出参数量、计算量和 KV Cache，并给出拿到新模型时的阅读顺序。
