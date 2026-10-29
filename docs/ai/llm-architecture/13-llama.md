# 13. Llama 家族：七代模型改了什么

前面十二篇把一个解码器层拆开讲完了：注意力和 KV 头、FFN、残差与归一化、RoPE、MoE、长上下文和混合架构。从这一篇开始换个方向，拿真实的模型家族对照这些部件，看每一代到底选了哪些、改了哪些。Llama 排在第一个，是因为 Transformers 里的 `modeling_llama.py` 已经成了开源大模型的“样板”：同一版源码里有 111 个模型的 modular 定义文件直接从它导入类，Qwen2、Qwen3、Mistral 都在其中。读懂 Llama 一层的代码，再看其他模型时，主要就是在找它和 Llama 的差别。

这一篇沿着 Llama 1 到 Llama 4 七次发布，回答三件事：每一代在结构上改了什么、为什么改；一层 `LlamaDecoderLayer` 的前向代码怎样对照形状读；Llama 许可证对使用有哪些实际限制。读完应能拿到任意一个 Llama 系模型的 `config.json`，判断它属于哪一代、KV Cache 有多大、能不能直接处理资料助手的长文档。各代配置以 2026 年 10 月下旬从 Hugging Face 读到的 `config.json` 为准（Meta 官方仓库需登录，配置从 unsloth 等镜像读取），源码对照 Transformers 5.21.0。

## 七次发布，真正改结构的只有四次

先看整体。下面这张时间线把每一代的结构变化和规格放在一起：

![Llama 1 定下 RMSNorm、SwiGLU、RoPE 的配方；Llama 2 在 70B 上引入 GQA；Llama 3 换 128K 词表并全面 GQA；Llama 3.1 用 llama3 RoPE 缩放扩到 128K；Llama 3.2 有剪枝蒸馏的小模型和交叉注意力视觉模型；Llama 3.3 结构不变；Llama 4 改为 MoE、iRoPE 和早期融合多模态](/ai/llm-architecture/llama-timeline.svg)

从 Llama 1 到 Llama 3.3，Transformers 里一直是同一个类 `LlamaForCausalLM`，代际差别全部体现在 `config.json` 的几个字段上：`num_key_value_heads`（GQA）、`vocab_size`、`rope_theta`、`rope_scaling`、`max_position_embeddings`、`tie_word_embeddings`。真正需要新代码的只有 Llama 3.2 Vision（另一个类 `MllamaForConditionalGeneration`）和 Llama 4（`Llama4ForConditionalGeneration`）。这件事本身就说明了 Llama 的演进思路：结构尽量不动，把投入放在数据量、分词器和上下文长度上，只有当某个瓶颈靠配置解决不了时才改结构。

## Llama 1：把“现代配方”固定下来

2023 年 2 月的 Llama 1（7B 到 65B）没有发明新部件，它的贡献是把几项已经被验证过的改动组合起来，并公开了权重：

- **Pre-Norm + RMSNorm**：每个子层之前先归一化，而不是之后；RMSNorm 只按均方根缩放，不减均值、没有偏置（[第 06 篇](./06-residual-norm.md)）。
- **SwiGLU**：FFN 从“两层线性 + 激活”换成门控的三个矩阵 `gate`、`up`、`down`（[第 05 篇](./05-ffn.md)）。
- **RoPE**：不再给输入加位置向量，而是在每层注意力里旋转 Q 和 K（[第 07 篇](./07-position.md)）。
- **线性层不带偏置**。

FFN 的中间维度来自一个简单的换算。原始 Transformer 的 FFN 中间维是隐藏维的 4 倍，SwiGLU 多了一个矩阵，为了让参数量和原来持平，把中间维缩到三分之二：

```text
中间维 ≈ 2/3 × 4 × d = 2/3 × 4 × 4096 = 10,922.7
向上取整到 256 的倍数 → 11,008（Llama 1 7B 的 intermediate_size）
```

注意力仍是标准多头注意力（MHA）：32 个头各有自己的 K、V。词表是 SentencePiece 训练的 32,000 个 token，上下文 2,048。许可证只允许研究使用。这套配方后来被几乎所有开源模型沿用，[第 09 篇](./09-transformer-family.md)讲了它和 GPT-2 相比改了哪些。

## Llama 2 与 Llama 3：先省 KV，再换分词器

2023 年 7 月的 Llama 2 结构几乎没变：上下文翻倍到 4,096，训练数据从 1.4T 增加到 2T token。唯一的结构改动是 34B 和 70B 改用 **GQA**（分组查询注意力，[第 04 篇](./04-multi-head.md)）：64 个 Q 头共用 8 组 K、V。7B 和 13B 仍然是 MHA。

为什么只在大模型上用？算一下每个 token 在 BF16 下的 KV Cache（2 是 K 和 V，最后的 2 是每个数 2 字节）：

```text
KV/token = 2 × 层数 × KV 头数 × head_dim × 2 字节
Llama 2 7B（MHA）： 2 × 32 × 32 × 128 × 2 = 524,288 B = 512 KiB
Llama 2 70B（GQA）：2 × 80 ×  8 × 128 × 2 = 327,680 B = 320 KiB
如果 70B 用 MHA：  2 × 80 × 64 × 128 × 2 = 2,621,440 B = 2.5 MiB
```

70B 用 MHA 时每个 token 要 2.5 MiB，GQA 把它压到 1/8。7B 的 512 KiB 在当时 4K 上下文下还能接受，所以没动。

2024 年 4 月的 Llama 3 把 GQA 推广到所有尺寸。Llama 3 8B 和 Llama 2 7B 层数、隐藏维都一样，KV 头从 32 降到 8，每 token KV 从 512 KiB 降到 128 KiB。放到资料助手里：把员工手册里 8,000 个 token 的“休假制度”一章塞进上下文，Llama 2 7B 要 8,000 × 512 KiB ≈ 3.9 GiB 的 KV Cache，Llama 3 8B 只要约 0.98 GiB。代价是每组 K、V 被 4 个 Q 头共用，表达能力略降，Meta 的取舍是用更多训练数据补回来。

Llama 3 的另一处大改是**分词器**。词表从 32,000 扩到 128,256（约 10 万来自 tiktoken，再加 2.8 万个非英语 token），技术报告给出的英文压缩率从每 token 3.17 个字符提高到 3.94 个。同一段文字切出的 token 少了约 20%，等于上下文窗口和生成速度都变“长”了。代价落在参数上：词嵌入和输出层各是 `128,256 × 4,096 = 525,336,576` 个参数，两张表合计占 8B 模型的 13.1%，而 Llama 2 7B 的两张表一共只有 2.6 亿（[第 02 篇](./02-tokenizer-embedding.md)讲词表大小的取舍）。

同时，`rope_theta` 从 10,000 调到 500,000，让 RoPE 最慢的那几个维度转得更慢，为长上下文留余量；训练时还加了跨文档注意力掩码，把拼在同一条训练序列里的不同文档隔开。Llama 3 刚发布时上下文只有 8,192，这个限制在下一个版本才解除。

## Llama 3.1 到 3.3：结构不动，改位置缩放和训练方法

2024 年 7 月的 Llama 3.1 把上下文扩到 131,072，结构一行没改，只在 config 里加了一段：

```text
"rope_scaling": {"rope_type": "llama3", "factor": 8.0,
                 "low_freq_factor": 1.0, "high_freq_factor": 4.0,
                 "original_max_position_embeddings": 8192}
```

Transformers 的 `_compute_llama3_parameters` 按每个 RoPE 维度的波长（转一圈要多少个位置）分三段处理：波长短于 `8192 / 4 = 2048` 的高频维度保持不变，它们负责相邻 token 的细粒度位置；波长长于 `8192 / 1 = 8192` 的低频维度频率除以 8，相当于把位置“压扁”8 倍；中间一段平滑过渡。[第 07 篇](./07-position.md)详细比较了这种分频缩放和位置插值、NTK、YaRN。

这里能看到一个典型的外推失败。原始 Llama 3 8B 的 `max_position_embeddings` 是 8192、没有 `rope_scaling`，训练时从没见过 8,192 之后的位置。把一本 6 万 token 的员工手册整本放进去，超过 8K 的部分在低频维度上会出现训练中没见过的旋转角，模型的困惑度会明显上升，常见表现是回答开始重复或胡乱拼接。判断方法很直接：看 config 里的这两个字段，再用超过该长度的文档做一次“在第 N 页找一句话”的检索测试。Llama 3.1 的缩放让模型“能读”128K，但能不能“读得好”仍要测，[第 11 篇](./11-efficient-attention.md)专门讲这两者的区别。

3.1 同时发布了 405B（126 层、隐藏维 16,384、128 个 Q 头、8 个 KV 头），仍然是密集模型。技术报告给出的理由是训练稳定性：在这个规模上，他们选择了更容易训练的密集结构而不是 MoE。

2024 年 9 月的 Llama 3.2 分成两条线。1B 和 3B 面向手机等端侧设备，模型卡说明它们在预训练中使用了 Llama 3.1 8B 和 70B 的 logits 作为 token 级目标，剪枝后再用知识蒸馏恢复性能（[训练系列第 13 篇](../model-training/13-distill-merge.md)讲蒸馏）。结构上的变化是 `tie_word_embeddings: true`：1B 的词嵌入有 2.63 亿参数，占全模型 21.3%，如果输出层再单独存一份就要占 35% 以上。共享词嵌入的取舍在下一篇 Qwen 里展开。11B 和 90B Vision 则是在 3.1 文本模型旁边插入一串交叉注意力层（11B 共 40 层，其中第 3、8、13……38 层是交叉注意力），让文本 token 去“看”图像编码器的输出，文本部分的权重保持 3.1 原样，[第 17 篇](./17-multimodal.md)对比了这种外挂方式和原生多模态。

2024 年 12 月的 Llama 3.3 只发布了 70B Instruct，config 的结构字段和 3.1 70B 完全相同，改进都来自后训练。

## 读一层 LlamaDecoderLayer

Llama 1 到 3.3 的每一层都是同一段代码。下面这张图把 Llama-3.1-8B 一层里的模块名和张量形状画在一起，模块名就是权重文件里的参数名，例如 `model.layers.0.self_attn.k_proj.weight`：

![LlamaDecoderLayer 一层的数据流：input_layernorm 之后 q_proj、k_proj、v_proj 分别得到 32 个 Q 头和 8 个 KV 头，Q、K 经 RoPE 旋转，repeat_kv 后做因果注意力，o_proj 投回 4096 维并加回残差流；post_attention_layernorm 之后 gate_proj 经 SiLU 与 up_proj 相乘，down_proj 投回 4096 维再加回残差流](/ai/llm-architecture/llama-decoder-layer.svg)

把 `modeling_llama.py` 里 `LlamaDecoderLayer`、`LlamaAttention`、`LlamaMLP` 三个类的 `forward` 去掉缓存、掩码和分支后，剩下的主干是这样（L 是序列长度）：

```python
def decoder_layer(x, cos, sin):                 # x: [L, 4096]
    h = input_layernorm(x)                      # RMSNorm，形状不变
    q = q_proj(h).view(L, 32, 128)              # [L, 4096] → [L, 32, 128]
    k = k_proj(h).view(L, 8, 128)               # [L, 4096] → [L, 8, 128]
    v = v_proj(h).view(L, 8, 128)
    q, k = apply_rotary_pos_emb(q, k, cos, sin) # 只旋转 Q、K，V 不动
    k, v = repeat_kv(k, 4), repeat_kv(v, 4)     # 8 组复制成 32 组
    a = softmax(q @ k.T / sqrt(128) + causal_mask) @ v   # [L, 32, 128]
    x = x + o_proj(a.reshape(L, 4096))          # 第一次加回残差
    h = post_attention_layernorm(x)
    x = x + down_proj(silu(gate_proj(h)) * up_proj(h))   # [L,4096]→[L,14336]→[L,4096]
    return x                                    # [L, 4096]，交给下一层
```

对照源码时有几处值得注意：

- `LlamaRMSNorm.forward` 先把输入转成 FP32 算均方根，再转回原精度乘权重。BF16 只有 7 位尾数，4096 个数平方后求平均容易丢精度，所以这一步单独用 FP32 算；[数值精度系列第 04 篇](../precision/04-mixed-precision.md)讲混合精度里哪些运算要保留高精度。
- `repeat_kv` 在朴素实现 `eager_attention_forward` 里把 8 组 K、V 显式复制成 32 组；FlashAttention 这类算子原生支持 GQA，按组读取即可。无论哪种实现，KV Cache 里存的始终是 8 个头。
- `past_key_values.update(...)` 发生在 RoPE 之后，所以缓存里存的是已经旋转过的 K（[推理系列第 03 篇](../llm-inference/03-kv-cache.md)）。
- 偏置由 `config.attention_bias`、`config.mlp_bias` 控制，`head_dim` 也可以在 config 里单独指定。这几个开关让很多模型能直接复用这份代码：Qwen2 只需打开 QKV 偏置，Llama 3.2 1B 只需把 `head_dim` 设成 64。

每层参数是注意力 41,943,040 加 MLP 176,160,768 加两个 RMSNorm 8,192，共 218,112,000；这和[第 01 篇](./01-overview.md)的 8B 参数分解表是同一组数字。

## Llama 4：MoE、iRoPE 与原生多模态

2025 年 4 月 5 日发布的 Llama 4 是第一次大改：从密集模型换成 MoE，换了位置编码方案，图像从训练一开始就和文本一起进入主干。这一代有两个公开权重的模型，Scout 和 Maverick；更大的 Behemoth（官方介绍为 2880 亿激活、近 2 万亿总参数）在发布时只做了预告，截至 2026 年 10 月 28 日没有公开权重，Meta 官方 Hugging Face 组织里也没有出现 Llama 4 之后的新 Llama 基础模型。

两个模型的主干形状完全一样：48 层、隐藏维 5,120、40 个 Q 头、8 个 KV 头、词表 202,048。差别在 FFN 怎样安排，下面这张图用 48 个小格表示 48 层：

![Llama 4 Scout 每层都是 MoE，Maverick 奇数层是 MoE、偶数层是密集 FFN；每第 4 层是不用 RoPE、看完整上下文的 NoPE 层。MoE 层里 token 同时进入共享专家和路由器，路由器选 1 个专家，两路输出相加](/ai/llm-architecture/llama4-layout.svg)

**MoE 怎样配置。** 每个专家是一个中间维 8,192 的 SwiGLU，参数 `3 × 5120 × 8192 = 125,829,120`。MoE 层里每个 token 走两个专家：一个人人都走的**共享专家**，加上路由器从 16 个（Scout）或 128 个（Maverick）里选出的 1 个**路由专家**。源码 `Llama4Router` 先算每个专家的分数，取 top-1，再对这个分数取 sigmoid；`Llama4TextMoe` 把输入先乘以这个门控值再送进专家，最后和共享专家的输出相加。这和 Mixtral、DeepSeek 那种“在输出端按权重加和”的写法不同，[第 10 篇](./10-moe.md)比较了各家的路由方式。

总参数和激活参数可以按 config 手算（只算文本部分）：

```text
每层注意力：5120×5120×2 + 5120×1024×2 = 62,914,560
Scout：48 层全是 MoE，每层 16 + 1 个专家
  总参数 ≈ 48 × (0.063 + 17 × 0.126)B + 两张词表 2.07B ≈ 107.8B
Maverick：24 层 MoE（128 + 1 个专家），24 层密集 FFN（中间维 16384，0.252B）
  总参数 ≈ 24 × (0.063 + 129 × 0.126)B + 24 × (0.063 + 0.252)B + 2.07B ≈ 400.7B
激活参数：两者每层都只算注意力 + 2 个专家（或 1 个密集 FFN），都约 17.2B
```

官方给出的 109B 和 400B 包含视觉编码器，和这里的文本部分对得上。两个模型激活参数相同、每 token 计算量相近，Maverick 用 3.7 倍的总参数换更多“知识容量”，代价是显存：BF16 下光权重就要约 800 GB，必须多卡部署；Scout 官方说明 Int4 量化后能放进一张 H100。

**iRoPE：每 4 层 1 层不用位置编码。** config 里的 `no_rope_layers` 是一串 0 和 1（名字容易误读，1 表示“使用 RoPE”），每第 4 层是 0。源码据此把层分成两类：36 个用 RoPE 的层只在 8,192 个 token 的块内做注意力（`chunked_attention`），12 个不用 RoPE 的 NoPE 层看完整上下文（`full_attention`）。Meta 把这种交错叫作 iRoPE。思路是让局部层负责有位置感的近距离关系，全局层不受 RoPE 外推问题的约束，只靠因果掩码隐含的顺序信息去全文检索（[第 07 篇](./07-position.md)讲 NoPE 为什么可行）。

NoPE 层还有一个推理时的**注意力温度缩放**：位置越靠后，Q 乘上的系数越大，抵消上下文变长后注意力分数被摊薄的问题。

```text
scale = log(1 + floor((位置 + 1) / 8192)) × 0.1 + 1
位置 5,000：floor(5001/8192) = 0 → scale = 1
位置 100,000：floor(100001/8192) = 12 → log(13) = 2.565 → scale ≈ 1.256
```

此外 Scout 在 RoPE 层上对 Q、K 做无参数的 L2 归一化（`use_qk_norm: true`），Maverick 关掉了这一项；Scout 的 `rope_scaling` 仍是 llama3 类型，factor 16。

这套结构对 KV Cache 的影响可以用资料助手算一笔：把一份 10 万 token 的员工手册放进上下文。12 个全局层每 token 要存 `2 × 12 × 8 × 128 × 2 = 49,152 B`（48 KiB），10 万 token 约 4.6 GiB；36 个块内层理论上最多只需保留当前块的 8,192 个 token，约 1.1 GiB。作为对照，Llama-3.1-8B 每层都是全局注意力，10 万 token 要约 12.2 GiB。块内层能不能真的只留一个块，取决于推理引擎是否针对这种掩码做了缓存回收。

Scout 标称的 1000 万 token 上下文也要按这个结构理解：Meta 说明 Scout 的预训练和后训练都用 256K 长度，更长的部分靠 NoPE 层和温度缩放外推；而 4 层里有 3 层只看块内 8K。实际文档要用自己的长文档做检索测试，不要只看 `max_position_embeddings`。

**早期融合。** Llama 3.2 Vision 是在训练好的文本模型旁边接交叉注意力；Llama 4 则让图像经视觉编码器（官方介绍基于 MetaCLIP，与冻结的 Llama 一起单独训练过）变成 token，从预训练一开始就和文本 token 一起进入同一个主干。训练数据也是多模态的：Scout 约 40T token、Maverick 约 22T token。资料助手要读报销单截图时，Llama 4 不需要额外的视觉分支，[第 17 篇](./17-multimodal.md)讲两种做法在结构和训练上的差别。

## 许可证：开放权重，但不是开源许可

Llama 的权重可以下载，但每一代都用 Meta 自己的社区许可证，不是 Apache 2.0、MIT 这类开源许可。实际使用前要看清几条：

| 版本 | 能否商用 | 需要注意的条款 |
| --- | --- | --- |
| Llama 1 | 否 | 仅限研究用途 |
| Llama 2 | 可以 | 发布当月月活超过 7 亿的公司须单独向 Meta 申请；不得用模型输出改进其他大模型 |
| Llama 3 | 可以 | 同上 7 亿月活条款；分发时显著标注“Built with Meta Llama 3”，派生模型名以“Llama 3”开头；仍禁止用输出改进其他大模型 |
| Llama 3.1 / 3.2 / 3.3 | 可以 | 改为“Built with Llama”、派生模型名以“Llama”开头；允许用输出做合成数据和蒸馏训练其他模型 |
| Llama 3.2 多模态、Llama 4 | 可以 | 可接受使用政策规定：多模态模型的许可权利不授予住所在欧盟的个人或主营地在欧盟的公司（使用集成了这些模型的产品的终端用户不受影响） |

所有版本还附带可接受使用政策（AUP），列出禁止的用途。在企业内部部署资料助手，常见的检查项是：公司规模是否触及 7 亿月活条款、对外发布的微调模型命名是否合规、如果团队主体在欧盟能否使用多模态版本。法律判断以 Meta 官方许可证原文为准；下一篇的 Qwen 大部分版本用 Apache 2.0，可以对照。

## 规格表

下表逐项取自各模型的 `config.json`（Meta 官方仓库需登录，读取的是 unsloth、NousResearch、huggyllama 等镜像；Llama 1 是社区转换版）。Q/KV 头数相等即为 MHA；KV/token 按 BF16 计算。

| 模型 | 层数 | 隐藏维 | Q / KV 头 | FFN 中间维 | 词表 | 上下文 | RoPE | 共享嵌入 | KV/token |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Llama 1 7B | 32 | 4096 | 32 / 32 | 11008 | 32,000 | 2,048 | θ 1e4 | 否 | 512 KiB |
| Llama 1 65B | 80 | 8192 | 64 / 64 | 22016 | 32,000 | 2,048 | θ 1e4 | 否 | 2.5 MiB |
| Llama 2 7B | 32 | 4096 | 32 / 32 | 11008 | 32,000 | 4,096 | θ 1e4 | 否 | 512 KiB |
| Llama 2 70B | 80 | 8192 | 64 / 8 | 28672 | 32,000 | 4,096 | θ 1e4 | 否 | 320 KiB |
| Llama 3 8B | 32 | 4096 | 32 / 8 | 14336 | 128,256 | 8,192 | θ 5e5 | 否 | 128 KiB |
| Llama 3 70B | 80 | 8192 | 64 / 8 | 28672 | 128,256 | 8,192 | θ 5e5 | 否 | 320 KiB |
| Llama 3.1 8B | 32 | 4096 | 32 / 8 | 14336 | 128,256 | 131,072 | θ 5e5，llama3 ×8 | 否 | 128 KiB |
| Llama 3.1 70B | 80 | 8192 | 64 / 8 | 28672 | 128,256 | 131,072 | θ 5e5，llama3 ×8 | 否 | 320 KiB |
| Llama 3.1 405B | 126 | 16384 | 128 / 8 | 53248 | 128,256 | 131,072 | θ 5e5，llama3 ×8 | 否 | 504 KiB |
| Llama 3.2 1B | 16 | 2048 | 32 / 8（head 64） | 8192 | 128,256 | 131,072 | θ 5e5，llama3 ×32 | 是 | 32 KiB |
| Llama 3.2 3B | 28 | 3072 | 24 / 8 | 8192 | 128,256 | 131,072 | θ 5e5，llama3 ×32 | 是 | 112 KiB |
| Llama 3.3 70B | 80 | 8192 | 64 / 8 | 28672 | 128,256 | 131,072 | θ 5e5，llama3 ×8 | 否 | 320 KiB |
| Llama 4 Scout | 48 | 5120 | 40 / 8 | 专家 8192：16 选 1 + 共享，每层 MoE | 202,048 | 10,485,760 | θ 5e5，llama3 ×16；每 4 层 1 层 NoPE | 否 | 全局层 48 KiB |
| Llama 4 Maverick | 48 | 5120 | 40 / 8 | 专家 8192：128 选 1 + 共享，隔层 MoE；密集层 16384 | 202,048 | 1,048,576 | θ 5e5；每 4 层 1 层 NoPE | 否 | 全局层 48 KiB |

许可证按版本对应上一节：Llama 1 研究许可，Llama 2、3、3.1、3.2、3.3、4 各自的社区许可证。

从这张表能读出 Llama 的演进主线：Llama 1 到 3.3 是同一个结构，靠 GQA 把每 token KV 压到 128 KiB，靠更大的词表提高编码效率，靠 RoPE 基频和分频缩放把上下文从 2K 拉到 128K；Llama 4 才在结构上动刀，用 MoE 把激活参数控制在 17B，用交错的局部 RoPE 层和全局 NoPE 层处理超长上下文，并把图像直接放进主干。读 `modeling_llama.py` 一层的 `forward`，就掌握了后面大多数模型的骨架。下一篇看 [Qwen 家族](./14-qwen.md)：它从 Llama 的配方出发，在 QKV 偏置、QK-Norm、共享词嵌入和混合注意力上做了一串不同的选择。
