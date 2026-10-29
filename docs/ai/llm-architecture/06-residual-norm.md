# 06. 残差连接与归一化

前两篇讲完了一层里的两个主要部件：注意力在位置之间搬运信息，FFN 在每个位置内部加工。两处都说结果要“加回残差流”，但没讲这条“流”是什么，也没讲每个部件前面那个 RMSNorm 在做什么。这两样东西几乎不占参数（Llama-3.1-8B 的 65 个 RMSNorm 一共 266,240 个参数，占 0.003%），却决定了 32 层能不能叠起来、训练会不会中途崩掉。这一篇回答：残差流是什么，为什么深网络离不开它；LayerNorm 和 RMSNorm 怎样算、差在哪；归一化放在子层前面还是后面，为什么从 Post-Norm 换到了 Pre-Norm；QK-Norm、logit soft-capping 这些稳定性技巧各防的是什么。读完你应该能看懂任意模型 `DecoderLayer.forward` 的那十几行，判断它用的是哪种结构，并认出 `config.json` 里和数值稳定有关的字段。

## 残差流：32 层共用的一条主干

跟着“年假怎么申请？”里的“申请”走一遍。它先查词嵌入表，得到一个 4096 维向量 h。之后每一层对 h 做两次同样形式的更新：

```text
h ← h + Attention(RMSNorm(h))       注意力的结果加回 h
h ← h + FFN(RMSNorm(h))             FFN 的结果加回 h
```

32 层之后，h 再经过最后一个 RMSNorm，交给输出层算 128256 个词的分数。把加法展开，最终的向量就是：

```text
h_最终 = 词嵌入 + 注意力₁ + FFN₁ + 注意力₂ + FFN₂ + … + 注意力₃₂ + FFN₃₂      共 64 个增量
```

这条从词嵌入一路加到最后的向量通路叫**残差流**（residual stream），每个子层的输出叫一次**残差**（residual），即在原值基础上的“修正量”。形状自始至终是 [n, 4096]：子层从主干上读一份副本，先归一化，算完后把结果加回主干，主干本身从不被替换。

![残差流是贯穿 32 层的主干，形状始终为 [n,4096]；每个注意力和 FFN 子层先对主干做 RMSNorm 得到副本，计算后把结果加回主干；32 层后经最终 Norm 送入输出层](/ai/llm-architecture/norm-residual-stream.svg)

这个视角有一个直接推论：所有层都在同一个 4096 维空间里读写。第 3 层写进去的信息，第 30 层可以直接读到，中间各层不需要专门“转交”。可解释性研究常把中间层的 h 直接送进最终 Norm 和输出层，看模型“此时倾向于说什么”（logit lens），能这样做也是因为各层共享这个空间；不过中间层的向量本来不是为输出层准备的，前几层这样读出来的词往往没有意义。

在小模型上可以看到这条主干怎样变化。用 Qwen2.5-0.5B-Instruct（24 层、隐藏维度 896，本机 CPU、FP32）读“年假怎么申请？”，看最后一个位置“？”的残差流长度（L2 范数）：词嵌入只有 0.47，第 0 层（从 0 数起）之后 4.8，中间各层缓慢增长到 15—20，最后几层快速增大，第 22 层之后达到 76.1，最后一层之后回落到 58.1；而每个子层加进去的增量多数在 1—15 之间，只有最后一层的 FFN 输出达到 77。也就是说，每一层只是在已有向量上做一次相对不大的修改。带完整对话模板的逐层测量见[实践篇](./layer-practice.md)。

## 为什么深网络离不开残差

假设没有残差，每层直接替换 h：`h ← f(h)`。训练时梯度要从输出一路乘回第一层，每经过一层乘一次这一层的导数（雅可比矩阵）。如果每层把梯度平均缩到 0.8 倍，32 层后剩 0.8³² ≈ 0.0008，前面的层几乎学不到东西；如果每层放大到 1.2 倍，32 层后是 342 倍，训练直接发散。这是一个示意的数，但它说明了深层堆叠的根本难处：误差按层数指数地累积。

残差把每层变成 `h ← h + f(h)`，这一层对输入的导数是 `I + f 的导数`，其中 I 是单位矩阵。梯度总有一条不经过任何子层、原样传回去的直通路径，f 的导数只是在它上面做修正。这个结构来自 2015 年的 ResNet，Transformer 从第一版起就用它。

残差还带来一个好处：如果某个子层的输出接近 0，这一层就接近什么都不做。训练初期让子层输出很小，32 层的网络一开始就像一个浅网络，容易训练，之后各层再逐步学到有用的修正。

## 归一化：把向量的尺度拉回来

残差流越加越长，实测里从 0.47 涨到了 76。子层的权重是固定的，如果输入的尺度一会儿是 5、一会儿是 70，同一个矩阵乘出来的结果尺度也跟着变，softmax 和激活函数的行为会完全不同。**归一化**（normalization）在每个子层的入口把向量缩放到固定尺度，子层看到的输入就稳定了。

原始 Transformer 用 **LayerNorm**：减去均值、除以标准差，再乘一个可学习的缩放 γ、加一个偏移 β。Llama、Qwen、DeepSeek、Mistral、Gemma 都换成了更简单的 **RMSNorm**（Zhang 与 Sennrich，2019）：不减均值、没有偏移，只除以均方根（root mean square）：

```text
LayerNorm(x) = (x - mean(x)) / sqrt(var(x) + ε) · γ + β
RMSNorm(x)   = x / sqrt(mean(x²) + ε) · g

x：一个位置的向量（Llama 为 4096 维）
g、γ、β：可学习的逐维参数，各 4096 个；RMSNorm 只有 g
ε：防止除以 0 的小数，Llama-3.1 的 rms_norm_eps 为 1e-5，Qwen 为 1e-6
```

用 4 维的 x = [2, -1, 3, 0] 手算一次（g 全为 1）：

```text
RMSNorm：mean(x²) = (4 + 1 + 9 + 0) / 4 = 3.5    sqrt(3.5) = 1.871
         输出 = [2, -1, 3, 0] / 1.871 = [1.069, -0.535, 1.604, 0]

LayerNorm：mean = 1    x - mean = [1, -2, 2, -1]    var = (1 + 4 + 4 + 1) / 4 = 2.5    sqrt(2.5) = 1.581
           输出 = [0.632, -1.265, 1.265, -0.632]
```

两者都让输出的尺度固定：RMSNorm 的输出均方为 1，LayerNorm 的输出均值为 0、方差为 1。把 x 整体乘 10 变成 [20, -10, 30, 0]，RMSNorm 的输出仍是 [1.069, -0.535, 1.604, 0]，它只保留方向、丢掉长度，长度再由可学习的 g 逐维重新设定。RMSNorm 少算一次均值、没有偏置，论文报告质量与 LayerNorm 相当而计算更省，这些年基本成了默认。

Transformers 里的 `LlamaRMSNorm`（`modeling_llama.py`）就是这几步，并且固定在 float32 里算：

```python
def forward(self, x):                          # x: [n, 4096]，通常是 BF16
    dtype = x.dtype
    x = x.to(torch.float32)                    # 平方求均值在 BF16 下误差大，先转 FP32
    x = x * torch.rsqrt(x.pow(2).mean(-1, keepdim=True) + self.variance_epsilon)
    return self.weight * x.to(dtype)           # weight 即 g，初始化为全 1
```

读代码时有一个容易踩的细节：Gemma 2 和 Gemma 3 的 RMSNorm（`modeling_gemma2.py`、`modeling_gemma3.py`）把 weight 初始化为 0，输出乘的是 `(1 + weight)`；Gemma 4 又改回了直接乘 weight。同样一组检查点，如果按 Llama 的写法直接乘 weight，每个 Norm 的输出都差了一截，模型会输出乱码。转换格式、移植到别的推理框架时，Norm 的写法要逐个核对。BF16 为什么怕平方求和，见[混合精度怎样计算](../precision/04-mixed-precision.md)。

## Post-Norm 到 Pre-Norm

归一化放在哪里，有三种常见做法：

![Post-Norm 先做子层再与输入相加，然后归一化；Pre-Norm 先对输入做 RMSNorm 再进子层，结果直接加回主干；Gemma 的三明治结构在子层前后各做一次 RMSNorm 再加回主干](/ai/llm-architecture/norm-pre-post.svg)

**Post-Norm** 是 2017 年原始 Transformer 和 BERT 的写法：`x ← LayerNorm(x + Sublayer(x))`。归一化作用在加法之后，主干本身每层都被重新归一化一次。问题出在训练上：Xiong 等（2020）分析发现，Post-Norm 在初始化时靠近输出的几层梯度很大，必须用很小的学习率预热一段，否则容易发散；层数越多越难训。

**Pre-Norm** 把归一化移到子层入口：`x ← x + Sublayer(Norm(x))`，并在最后一层之后补一个 Norm。GPT-2 就这样改了，今天的 Llama、Qwen、DeepSeek、Mistral 都是这种结构。主干上只有加法，梯度有完整的直通路径，训练稳定得多，Xiong 等的实验里可以去掉学习率预热。最后那个 Norm 必不可少，因为主干从头到尾没有被归一化过，送进输出层之前要拉回尺度。

Llama 的代码里有个命名陷阱：解码层的两个 Norm 叫 `input_layernorm` 和 `post_attention_layernorm`。后者名字里有 post，但它在 FFN 之前，意思是“注意力之后、FFN 之前”，整体仍是 Pre-Norm：

```python
# 简化自 transformers/models/llama/modeling_llama.py 的 LlamaDecoderLayer.forward
h = h + self.self_attn(self.input_layernorm(h))
h = h + self.mlp(self.post_attention_layernorm(h))
```

Pre-Norm 也有代价。主干不被归一化，就会随层数一路变长；每个子层的输入被归一化了，输出的尺度却大致固定，于是越往深层，一次增量相对于主干就越小，后面的层越来越像“只做一点微调”。有研究报告，在 Pre-Norm 的大模型里相当一部分深层接近恒等变换，删掉影响很小（Sun 等，2025），这可以看作 Pre-Norm 的深度利用率问题。也有工作走另一条路，用特殊的缩放和初始化让 Post-Norm 训到 1000 层（DeepNet，2022），但主流大模型没有回到 Post-Norm。

**三明治结构**（sandwich norm）是 Gemma 2、3、4 的做法：每个子层前后各一个 RMSNorm，输出先归一化再加回主干，一层共 4 个 Norm（源码里是 `input_layernorm`、`post_attention_layernorm`、`pre_feedforward_layernorm`、`post_feedforward_layernorm`，这里的 post 才真的在子层之后）。子层输出先被拉到固定尺度，每次增量的大小就由 Norm 的可学习参数控制，不会因为某一层输出异常大而冲乱主干。OLMo 2 则只保留子层之后的 Norm：`h ← h + Norm(Sublayer(h))`。

## QK-Norm：给注意力分数上保险

归一化管住了子层的输入，注意力内部还有一个容易失控的地方：分数 `q·k / √128`。训练中如果 `q_proj`、`k_proj` 的权重持续变大，q 和 k 的长度一起增长，点积按两者长度的乘积增长，softmax 会变成几乎只有一个位置是 1、其余都是 0 的分布，梯度消失，loss 出现尖峰甚至发散。ViT-22B（Dehghani 等，2023）和 Wortsman 等（2023）都把这种“注意力 logit 增长”列为大模型训练不稳定的主要原因之一，并用对 q、k 做归一化来缓解。

**QK-Norm** 就是在算分数之前，对每个头的 q 和 k 各做一次 RMSNorm。Qwen3 的实现（`modeling_qwen3.py`）在 `q_proj`、`k_proj` 之后、RoPE 之前，对每个头的 128 维单独归一化：

```python
q = self.q_norm(self.q_proj(x).view(n, 32, 128))   # q_norm = RMSNorm(128)
k = self.k_norm(self.k_proj(x).view(n, 8, 128))    # k_norm = RMSNorm(128)
q, k = apply_rope(q, k, pos)                       # 之后照常加位置编码、算注意力
```

归一化之后分数就有了上界。RMSNorm 让每个 128 维向量的均方为 1，长度为 √128 ≈ 11.3（再乘上可学习的 g）。点积不超过两个长度之积 128，除以 √128 后，在 g 全为 1 时分数不超过 11.3。分数再也不会因为权重变大而无限增长，只能靠 g 慢慢调整，而 g 的变化是训练里看得见的。

Qwen3 技术报告写明，它去掉了 Qwen2 的 QKV 偏置，引入 QK-Norm 来保证训练稳定；Gemma 3 用 QK-Norm 取代了 Gemma 2 的 soft-capping；OLMo 2 也用了 QK-Norm（预训练里的其他稳定手段见[训练系列第 07 篇](../model-training/07-pretraining.md)）。看配置判断不了有没有 QK-Norm，要读 `modeling_*.py` 里注意力类有没有 `q_norm`、`k_norm`。

## soft-capping：把 logit 压进上限

另一种办法不改 q、k，直接限制分数本身。**logit soft-capping** 把分数 x 换成：

```text
softcap(x) = cap · tanh(x / cap)

cap = 30：  10 → 9.6    30 → 22.8    60 → 28.9    200 → 30.0
cap = 50：  100 → 48.2
```

tanh 在 0 附近接近直线，所以小的分数几乎不变；大的分数被平滑地压向 ±cap，永远不会超过。和直接截断（超过就等于 cap）相比，它处处可导，被压住的分数仍有梯度。

![soft-capping 把 logit x 换成 cap·tanh(x/cap)：cap 为 30 时 10 变成 9.6、60 变成 28.9，再大也不超过 30；cap 为 50 的曲线更晚弯折](/ai/llm-architecture/norm-softcap.svg)

Gemma 2 用了两处（`config.json` 的 `attn_logit_softcapping: 50.0`、`final_logit_softcapping: 30.0`）：注意力分数在加掩码之前做一次 cap 50，最终输出层的 logits 做一次 cap 30。后者在[第 08 篇](./08-output-decoding.md)讲 logits 时还会碰到。

它的代价是注意力算子要多一步。标准的融合注意力算子直接从 `q·k` 算到 softmax，中间没有插 tanh 的位置；Transformers 的 Gemma 2 实现因此写着 `_supports_sdpa = False  # sdpa does not support softcapping`，不能走 PyTorch 自带的高效注意力路径。推理引擎如果不支持而悄悄跳过这一步，模型算的就不再是训练时的那个函数，常见的现象是输出质量下降，长上下文时尤其明显。Gemma 3 的配置里两项都是 `null`，改用 QK-Norm；Gemma 4 31B 的配置又在输出层用了 `final_logit_softcapping: 30.0`，注意力里没有。拿到 Gemma 系列模型，先看这两个字段，再确认推理框架是否实现了它们。

## 各模型的选择

| 模型 | 归一化 | 位置 | 每层 Norm 数 | 其他稳定性设计 |
| --- | --- | --- | ---: | --- |
| 原始 Transformer、BERT | LayerNorm | Post-Norm | 2 | — |
| GPT-2 | LayerNorm | Pre-Norm + 最终 Norm | 2 | 残差层初始化按 1/√N 缩放 |
| Llama-3.1-8B | RMSNorm，ε 1e-5 | Pre-Norm | 2 | — |
| Qwen3-8B | RMSNorm，ε 1e-6 | Pre-Norm | 2（另有 q/k Norm） | QK-Norm，去掉 QKV 偏置 |
| DeepSeek-V3 | RMSNorm | Pre-Norm | 2（MLA 内部另有 2 个） | MLA 的压缩向量 c_q、c_kv 各过一次 RMSNorm |
| OLMo 2 | RMSNorm | 子层输出后 Norm | 2（另有 q/k Norm） | QK-Norm |
| Gemma 2 | RMSNorm（1 + w） | 三明治 | 4 | 注意力 soft-cap 50，输出 soft-cap 30 |
| Gemma 3 | RMSNorm（1 + w） | 三明治 | 4（另有 q/k Norm） | QK-Norm，不用 soft-capping |
| Gemma 4 31B | RMSNorm | 三明治 | 4（另有 q/k/v Norm） | QK-Norm，输出 soft-cap 30 |

表中结构以 Transformers 5.21 的 `modeling_*.py` 和 2026 年 10 月时 Hugging Face 上的 `config.json` 为准。

## 初始化与深度

预训练模型的权重是训练出来的，初始化只在从零训练时起作用，但它和残差流直接相关。主干是 64 个增量之和，如果每个增量的方差差不多，相互独立时主干的方差随增量个数线性增长。GPT-2 的做法是把写回残差流的那些矩阵（注意力的 `o_proj`、FFN 的 `down_proj`）初始化时乘以 1/√N，N 是残差层数：每个增量的方差缩小为 1/N，N 个相加后总方差保持在 1 左右，层数加倍也不会让初始输出变大。Transformers 里 Llama 的默认初始化是标准差 0.02 的正态分布（`initializer_range: 0.02`），不同训练框架对残差投影还有各自的缩放规则。

深度本身也是取舍。同样的参数量，层数多、宽度窄的模型串行步骤更多，推理时每个 token 要依次走过更多层，延迟更高；归一化和残差解决的是“能不能训”，不保证“越深越好”。层数、宽度、头维度怎样搭配，在[第 18 篇](./18-reading-models.md)读配置时再讨论。

残差流是一条从词嵌入贯穿到输出层的主干，每个子层读一份归一化后的副本、把结果加回去，加法给梯度留了直通路径，深层网络因此能训；RMSNorm 只按均方根缩放，比 LayerNorm 少算均值和偏置；Pre-Norm 让训练稳定，代价是主干越来越长、深层增量相对变小，Gemma 用前后两个 Norm 夹住子层；QK-Norm 给注意力分数设了上界，soft-capping 用 tanh 把分数压进上限，后者需要推理框架专门支持。到这里，一层里的部件只差一样：注意力对顺序是盲的，“年假怎么申请”和“申请怎么年假”在它眼里是同一组向量。下一篇讲模型怎样知道 token 的位置：[07. 位置编码：RoPE 与长上下文](./07-position.md)。
