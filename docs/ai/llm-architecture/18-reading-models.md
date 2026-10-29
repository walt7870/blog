<script setup>
import { withBase } from 'vitepress'
</script>

# 18. 读懂 config 与源码：从配置算出参数、计算和显存

上一篇看到，多模态模型的视觉和语音部分都写在 `config.json` 的几个子配置和对应的 `modeling_*.py` 里。其实整个系列讲过的东西都是这样落地的：一个模型发布时，真正描述它结构的只有两样东西，一个几十行的 `config.json`，和 Transformers 里的一个模型目录。这一篇是工具篇：逐字段读 Llama-3.1-8B 和两个 MoE 模型的配置；用一个不依赖 torch 的小脚本，只读 `config.json` 就算出参数量、每 token 的计算量和 KV Cache，并和官方公布的数字对照；再看 Transformers 的类是怎样一层套一层的，以及拿到一个新模型时先看哪里。读完以后，你应该能在不下载权重的情况下，花十几分钟判断一个新模型“和谁像、改了哪里、跑起来要多少显存”。

## Llama-3.1-8B 的 config.json，逐字段读

下面是 Llama-3.1-8B 的配置（取自 unsloth 的镜像仓库，Meta 官方仓库需要登录，内容相同）。字段可以分成五类，先看决定形状的那一类。

| 字段 | 值 | 决定什么 |
| --- | --- | --- |
| `hidden_size` | 4096 | 残差流的宽度，几乎所有矩阵的一条边 |
| `num_hidden_layers` | 32 | 解码器层重复几次 |
| `num_attention_heads` | 32 | Q 的头数；`q_proj` 输出 32 × 128 = 4096 |
| `num_key_value_heads` | 8 | K、V 的头数（GQA，见[第 04 篇](./04-multi-head.md)）；`k_proj`、`v_proj` 输出 8 × 128 = 1024 |
| `head_dim` | 128 | 每个头的维度；没写时默认 `hidden_size / num_attention_heads` |
| `intermediate_size` | 14336 | FFN 中间层宽度（见[第 05 篇](./05-ffn.md)），是 `hidden_size` 的 3.5 倍 |
| `vocab_size` | 128256 | 词嵌入和输出层的行数（见[第 02 篇](./02-tokenizer-embedding.md)） |
| `tie_word_embeddings` | false | 输出层是否和词嵌入共用一个矩阵 |

第二类是计算方式：`hidden_act` 为 `silu`，说明 FFN 用 SwiGLU；`attention_bias`、`mlp_bias` 为 false，说明线性层没有偏置；`rms_norm_eps` 1e-5 是 RMSNorm 防止除零的小常数（见[第 06 篇](./06-residual-norm.md)）。第三类是位置：`rope_theta` 500000 是 RoPE 的基频，`rope_scaling` 里的 `rope_type: llama3`、`factor` 8、`original_max_position_embeddings` 8192 说明这是从 8K 扩到 128K 的分频缩放，`max_position_embeddings` 131072 是扩展后的长度（见[第 07 篇](./07-position.md)）。第四类是特殊 token 的编号：`bos_token_id` 128000、`eos_token_id` 128001。剩下的是运行和存档信息：`torch_dtype` 是权重存储的精度，`use_cache` 控制生成时是否用 KV Cache，`initializer_range`、`attention_dropout` 只在从头训练时有用，`pretraining_tp` 是早期 Meta 实现留下的张量并行切分数，`transformers_version` 只说明生成这个文件的库版本。

形状类字段和权重矩阵的对应关系，画出来是下面这样：

![Llama-3.1-8B 的 vocab_size 和 hidden_size 决定词嵌入 [128256, 4096]，头数乘头维度决定 q_proj 和 o_proj，KV 头数决定 k_proj、v_proj 为 [4096, 1024]，intermediate_size 决定 FFN 三个矩阵，num_hidden_layers 决定重复 32 份，tie_word_embeddings 为 false 时输出层单独一份](/ai/llm-architecture/reading-config-map.svg)

有了这张对应表，参数量就是把每个矩阵的行乘列加起来：每层注意力 41,943,040，FFN 176,160,768，两个 RMSNorm 8192，共 218,112,000；乘 32 层再加词嵌入、输出层各 525,336,576 和最终 norm 4096，得 8,030,261,248，这就是[第 01 篇](./01-overview.md)那张参数分解表的来源。

## MoE 模型多出来的字段

Qwen3-30B-A3B 的配置看起来很像，但有几处一眼读错就会算错。

| 字段 | 值 | 读法 |
| --- | --- | --- |
| `hidden_size` / `num_attention_heads` / `head_dim` | 2048 / 32 / 128 | 32 × 128 = 4096，**不等于** 2048：`q_proj` 是 [2048 → 4096]，`o_proj` 是 [4096 → 2048] |
| `num_key_value_heads` | 4 | KV 只有 4 个头，KV Cache 每层每 token 2 × 4 × 128 个数 |
| `num_experts` / `num_experts_per_tok` | 128 / 8 | 每层 128 个专家，每个 token 选 8 个（见[第 10 篇](./10-moe.md)） |
| `moe_intermediate_size` | 768 | 每个专家的 FFN 中间宽度，只有 `hidden_size` 的 0.375 倍 |
| `intermediate_size` | 6144 | 只给不走 MoE 的稠密层用；本模型 `mlp_only_layers` 为空、`decoder_sparse_step` 为 1，48 层全是 MoE，这个字段**没有用到** |
| `norm_topk_prob` | true | 选出的 8 个专家权重再归一化到和为 1 |
| `router_aux_loss_coef` | 0.001 | 负载均衡辅助损失的系数，只影响训练 |
| `sliding_window` / `max_window_layers` | null / 48 | `use_sliding_window` 为 false，都不生效 |

DeepSeek-V3 的配置字段更多，几处关键的读法是：`q_lora_rank` 1536、`kv_lora_rank` 512 是 MLA 的压缩维度，`qk_nope_head_dim` 128 + `qk_rope_head_dim` 64 是每个头 Q、K 的 192 维，`v_head_dim` 128；`num_key_value_heads` 写着 128，但在 MLA 里 KV 先压成一个 512 维向量，这个字段并不代表要缓存 128 个头（见[第 15 篇](./15-deepseek.md)）。`first_k_dense_replace` 3 表示前 3 层用稠密 FFN（`intermediate_size` 18432），之后 58 层是 MoE：`n_routed_experts` 256 个路由专家选 8 个，加 `n_shared_experts` 1 个共享专家；`n_group` 8、`topk_group` 4 是先选 4 个专家组再在组内选；`scoring_func` 为 sigmoid、`topk_method` 为 `noaux_tc`，就是无辅助损失的偏置负载均衡；`num_nextn_predict_layers` 1 是一个 MTP 模块；`quantization_config` 说明权重以 128×128 分块的 FP8（E4M3）发布。

这三个配置也说明了读 `config.json` 的一个边界：**字段的含义由 modeling 代码决定，不由名字决定。** 同一个“专家数”，Qwen 叫 `num_experts`，DeepSeek 叫 `n_routed_experts`，gpt-oss 和 Mixtral 叫 `num_local_experts`；Transformers 5 起新模型把 `rope_theta`、`rope_scaling` 合并成 `rope_parameters`；`intermediate_size` 在稠密模型里是 FFN 宽度，在全 MoE 的模型里可能根本没用。拿不准时，到 `configuration_<名字>.py` 找默认值和 `attribute_map`，再到 `modeling_<名字>.py` 看它在哪里被读取。

## 只读 config.json 算参数量、FLOPs 和 KV Cache

把上面的读法写成代码，就是一个一百多行、只用 Python 标准库的脚本：<a :href="withBase('/ai/llm-architecture/tools/arch_calc.py')" download>arch_calc.py</a>。它不需要 torch，也不下载权重，逐项按源码里每个 `nn.Linear`、`nn.Parameter`、RMSNorm 的形状相加。支持 Llama、Mistral、Qwen2/Qwen3 一类稠密模型，Qwen2-MoE/Qwen3-MoE，DeepSeek-V2/V3（MLA、共享专家、MTP），以及 gpt-oss（带偏置的专家、注意力汇聚、滑动窗口层）；多模态模型只算 `text_config` 里的语言模型。三个量的口径是：

```text
参数量     = 词嵌入 + 输出层（共享时只算一次）+ Σ每层（注意力 + FFN 或 MoE + 2 个 norm）+ 最终 norm
激活参数   = 同上，但 MoE 层只算被选中的 top-k 个专家、共享专家和路由器
每 token 前向 FLOPs = 2 × 参与计算的矩阵参数（含输出层，不含词嵌入查表）
                    + 每层 2 × 上下文长度 × (Q 头数 × QK 维度) + 2 × 上下文长度 × (Q 头数 × V 维度)
KV Cache 每 token  = 全注意力层数 × 2（K、V）× KV 头数 × head_dim × 每个数的字节数
                     MLA 改为 层数 × (kv_lora_rank + qk_rope_head_dim) × 字节数
                     滑动窗口层最多缓存 sliding_window 个 token
```

第一项“2 × 参数”是因为每个参数在矩阵乘法里贡献一次乘法和一次加法；第二项是注意力里 QKᵀ 和加权求和 V 两次矩阵乘法，随上下文增长，和训练系列[计算量与规模](../model-training/04-compute-scaling.md)的口径一致。代入 Llama-3.1-8B：固定部分 2 × (8,030,261,248 − 525,336,576 − 266,240) ≈ 15.01 GFLOPs；8192 上下文时注意力部分 32 × 4 × 8192 × 4096 ≈ 4.29 GFLOPs。系列里常说的“约 16 GFLOPs”是 2 × 总参数的粗算，把词嵌入查表也算成了矩阵乘法。

运行方式：把模型仓库里的 `config.json` 下载到本地（`curl -sL https://huggingface.co/<组织>/<仓库>/raw/main/config.json -o config.json`），在脚本所在目录执行：

```bash
python3 arch_calc.py config.json --ctx 8192 --kv-bytes 2
```

`--ctx` 是算注意力 FLOPs 和 KV 总量用的上下文长度，`--kv-bytes` 是 KV 每个数的字节数（BF16 为 2，FP8 为 1）。Llama-3.1-8B 的输出是：

```text
== configs/unsloth_Meta-Llama-3.1-8B.json
  结构        llama，32 层，hidden 4096，头 32Q/8KV
  总参数      8,030,261,248（8.030 B）
    词嵌入    525,336,576   输出层 525,336,576
    非嵌入    6,979,588,096（6.980 B）
  每 token 前向 FLOPs：固定部分 15.01 G + 注意力@8192 4.29 G = 19.30 G
  KV Cache    每 token 131,072 字节（32 个全注意力层，2 字节/数）
              8192 token 合计 1.000 GiB（滑动窗口层已按窗口封顶）
```

每 token 131,072 字节就是推理系列[第 03 篇](../llm-inference/03-kv-cache.md)和[第 04 篇](../llm-inference/04-memory-budget.md)用的 128 KiB。下表是 2026 年 10 月 28 日在 macOS 26.6（arm64）、Python 3.14.7 上对当天下载的官方 `config.json` 实际运行的结果，和模型卡公布的数字、Hugging Face 页面按 safetensors 统计的总参数对照：

| 模型 | 脚本：总参数（实测） | 脚本：每 token 激活 | 模型卡 | Hugging Face 统计 |
| --- | --- | --- | --- | --- |
| Llama-3.1-8B | 8,030,261,248 | — | 8B | 8,030,261,248 |
| Qwen3-30B-A3B | 30,532,122,624 | 3.353 B | 总 30.5B，激活 3.3B | 30,532,122,624 |
| DeepSeek-V3 | 671,026,419,200，另有 MTP 13,463,426,304 | 37.552 B | 总 671B，激活 37B；主模型加 MTP 共 685B | 684,489,845,504 |
| gpt-oss-20b | 20,914,757,184 | 4.187 B（不含词嵌入 3.608 B） | 总 21B，激活 3.6B | 20,914,757,184 |

四个总参数都和权重文件逐位一致，DeepSeek-V3 要把 MTP 模块加上（671,026,419,200 + 13,463,426,304 = 684,489,845,504；Transformers 加载时会跳过第 61 层，也就是 MTP 的权重）。脚本的 671,026,419,200 比[第 15 篇](./15-deepseek.md)的 671,026,404,352 多 14,848，是 58 个 MoE 层各 256 个负载均衡偏置 `e_score_correction_bias`，它们存在权重文件里，但按规则调整、不经梯度训练；脚本的 MTP 一项也包含检查点里为 MTP 单独存的一份词嵌入和输出头。激活参数要注意**各家口径不同**：Qwen 和 DeepSeek 的数字接近“含词嵌入”的算法，gpt-oss 的 3.6B 对上的是“不含词嵌入、含输出层”的 3.608B。比较两个 MoE 模型的激活参数前，先确认它们是不是同一个口径。

每 token 前向那一栏也能看出 MoE 的特点：Qwen3-30B-A3B 固定部分只有 6.08 GFLOPs，比 8B 稠密模型还少，但 8192 上下文时注意力部分 6.44 GFLOPs 已经超过了它，因为注意力的宽度（32 个 Q 头 × 128 = 4096）是 `hidden_size` 的两倍，而这一部分不会因为稀疏而变小。

**脚本算错的时候怎样发现。** 它只认识写进代码的结构，遇到新字段会悄悄漏算。对 Gemma 4 E2B 运行，它给出 16.4 亿，而模型卡写的是“含嵌入 5.1B”，Hugging Face 统计 5,123,178,051。差在哪里，脚本最后一行已经列出：`hidden_size_per_layer_input`、`vocab_size_per_layer_input`（每层一张 262144 × 256 的逐层嵌入表，35 层合计约 23.5 亿）、`use_double_wide_mlp`、`global_head_dim`、`num_kv_shared_layers`，再加上配置里另算的视觉和音频编码器。所以用脚本的规矩是：**先和 Hugging Face 页面的参数统计对一下**，对不上就说明有脚本不认识的结构，回到 modeling 源码逐项补。对于 FP8、MXFP4 这类量化发布的仓库，页面统计的是存储张量的元素数，可能和真实参数量有出入，要看 `quantization_config` 再判断。

## Transformers 里的类怎样一层套一层

Transformers 给每个模型一个目录 `transformers/models/<model_type>/`，`config.json` 里的 `model_type` 就是目录名，`architectures` 是要实例化的顶层类。目录里通常有 `configuration_<名字>.py`（配置类）和 `modeling_<名字>.py`（模型类），较新的模型还有 `modular_<名字>.py`。以 Llama 为例，类的嵌套关系是：

![LlamaForCausalLM 包含 LlamaModel 和 lm_head；LlamaModel 包含 embed_tokens、rotary_emb、norm 和 32 个 LlamaDecoderLayer；每层包含 LlamaAttention 和 LlamaMLP 以及两个 RMSNorm；右侧 modular_qwen3.py 由转换脚本生成 modeling_qwen3.py](/ai/llm-architecture/reading-class-tree.svg)

- **`LlamaConfig`**：读 `config.json`，给缺省字段填默认值，每个模块的 `__init__` 都接收它。
- **`LlamaAttention`**：`q_proj`、`k_proj`、`v_proj`、`o_proj` 四个线性层，`forward` 里做 RoPE、写入和读取 `past_key_values`（KV Cache），再按 `_attn_implementation` 调用 eager、SDPA 或 FlashAttention 实现。
- **`LlamaMLP`**：`gate_proj`、`up_proj`、`down_proj`，计算 `down(act(gate(x)) * up(x))`。
- **`LlamaDecoderLayer`**：把一个注意力、一个 MLP、两个 RMSNorm 按 Pre-Norm 加残差接起来。
- **`LlamaModel`**：词嵌入、`ModuleList` 里的 32 层、最终 norm，并在进入各层前统一算好因果掩码和 RoPE 的 cos/sin。
- **`LlamaForCausalLM`**：在 `LlamaModel` 外面加 `lm_head`，算 logits 和训练损失，并通过 `GenerationMixin` 提供 `generate()`。多模态模型的顶层类通常叫 `XxxForConditionalGeneration`，里面再分出视觉塔和语言模型。

`LlamaDecoderLayer.forward` 简化后只有几行，整个系列讲的“一层”就是它：

```python
# 对应 transformers/models/llama/modeling_llama.py 的 LlamaDecoderLayer.forward（简化）
def forward(self, x, position_embeddings, attention_mask, past_key_values=None):
    h = self.input_layernorm(x)                    # [L, 4096]
    h, _ = self.self_attn(h, position_embeddings, attention_mask, past_key_values)
    x = x + h                                      # 残差
    h = self.post_attention_layernorm(x)
    x = x + self.mlp(h)                            # [L, 4096] → [L, 14336] → [L, 4096]
    return x
```

属性名就是权重文件里的键名：`model.layers.0.self_attn.q_proj.weight` 对应 `LlamaForCausalLM.model.layers[0].self_attn.q_proj`。所以不下载权重也能核对结构：仓库里的 `model.safetensors.index.json` 列出了每个张量的名字和所在分片，看一眼就知道有没有 `q_norm`、有没有偏置、MoE 专家怎样存放。

## modular 文件：只写和父类不同的地方

主流模型大多是在前人基础上改几处。Transformers 的做法是让每个 `modeling_<名字>.py` 自成一体、可以单独读懂，代价是大量重复代码；为了不手工维护这些重复，较新的模型改为编写 `modular_<名字>.py`：从其他模型继承类，只写改动的部分，再由仓库里的转换脚本展开成完整的 `modeling_<名字>.py`。生成文件的开头有一段醒目的警告，说明它由 modular 文件自动生成、不要手改。

Qwen3 是一个好例子。`modular_qwen3.py` 只有 156 行，生成的 `modeling_qwen3.py` 有 515 行。打开 modular 文件，导入部分已经说明了血缘：`GemmaMLP`、`LlamaAttention` 和一串 Qwen2 的类。真正写了代码的地方只有 `Qwen3Attention(LlamaAttention)`：在 `__init__` 里加上 `q_norm`、`k_norm` 两个只作用在 `head_dim` 上的 RMSNorm，在 `forward` 里先对 Q、K 做归一化再旋转，并把 `sliding_window` 传给注意力实现。这一个类就是 Qwen3 相对 Qwen2 的结构差别（QK-Norm、去掉 QKV 偏置），其余类要么是 `pass`，要么只换了文档示例。

## 拿到新模型：先 diff 配置，再 diff modular

有了上面两样工具，读一个新模型可以按固定顺序来：

1. **看 `architectures` 和 `model_type`**，找到 Transformers 里的目录。Transformers 还没合入时，仓库会在 `auto_map` 里指向自带的 `modeling_*.py`，读法相同，但要先审查代码再决定是否 `trust_remote_code`。
2. **找一个最像的前辈，逐字段 diff `config.json`**。值变了的字段说明规模和比例怎样调整，新出现的字段几乎一定对应新结构。
3. **读 `modular_<名字>.py` 的导入和类定义**。父类说明骨架来自谁，`pass` 的类原样继承，只读改写了方法的那几个类。
4. **用脚本算参数量，对照模型卡和 Hugging Face 统计**。对不上就回到第 3 步找漏掉的结构。
5. **补看配置之外的文件**：`generation_config.json`（默认采样参数和停止 token）、`tokenizer_config.json` 里的对话模板，这些不改结构，却决定了模型能否被正确调用（见[第 08 篇](./08-output-decoding.md)）。

用 Mistral Small 4（`mistralai/Mistral-Small-4-119B-2603`，Transformers 里的 `mistral4`）走一遍。它的 `text_config` 和 DeepSeek-V3 比，字段几乎一一对应，值不同：

| 字段 | DeepSeek-V3 | Mistral Small 4 |
| --- | --- | --- |
| `hidden_size` / `num_hidden_layers` | 7168 / 61 | 4096 / 36 |
| `q_lora_rank` / `kv_lora_rank` | 1536 / 512 | 1024 / 256 |
| `qk_nope_head_dim` / `qk_rope_head_dim` / `v_head_dim` | 128 / 64 / 128 | 64 / 64 / 128 |
| 路由专家 / 每 token 选 / 共享专家 | 256 / 8 / 1 | 128 / 4 / 1 |
| `first_k_dense_replace` | 3 | 0（全部是 MoE） |
| `n_group` / `topk_group` / `routed_scaling_factor` | 8 / 4 / 2.5 | 1 / 1 / 1.0（不分组） |
| 位置 | YaRN，factor 40，原始 4096 | YaRN，factor 128，原始 8192，另有 `llama_4_scaling_beta` 0.1 |
| `vocab_size` | 129280 | 131072 |

只看配置已经能判断：这是一个缩小版的 MLA + MoE 骨架，压缩维度减半，专家更少但不分组，上下文目标更长（`max_position_embeddings` 1,048,576），而 `llama_4_scaling_beta` 是 DeepSeek-V3 没有的新字段。再打开 `modular_mistral4.py`：

![modular_mistral4.py 中 RMSNorm、旋转编码继承 Llama，MLP 继承 Qwen2-MoE，专家、MoE、解码器层、模型继承 DeepSeek-V3，原样继承；路由器继承 DeepSeek-V2 并改为 softmax 打分，注意力继承 DeepSeek-V3 并加入按位置的 query 缩放](/ai/llm-architecture/reading-modular-diff.svg)

改写了 `forward` 的只有两个类（`Mistral4DecoderLayer` 只重写 `__init__`，把子模块换成本模型的类）。`Mistral4TopkRouter` 的 `forward` 用 softmax 给专家打分，而 DeepSeek-V3 用 sigmoid 加偏置；`Mistral4Attention` 的 `forward` 在 RoPE 之后把 query 乘上 `get_llama_4_attn_scale` 给出的系数：

```text
scale = 1 + β × ln(1 + floor(位置 / original_max_position_embeddings))
β = 0.1，original = 8192：位置 8191 以内 scale = 1；位置 100000 时 floor = 12，scale = 1 + 0.1 × ln 13 ≈ 1.26
```

也就是越靠后的位置，query 乘的系数越大，注意力分布越“尖”。函数名说明了来源：Meta 发布 Llama 4 时把它称为推理时的注意力温度缩放，用来改善长度泛化。脚本对它的配置给出总参数 118,972,826,624、每 token 激活 6.63B，模型卡写的是 119B 和 6.5B；总数吻合，激活数差约 0.13B，模型卡没有说明它的口径。整个过程不需要下载一个权重文件。

这个方法的边界是：modular 文件只在模型被 Transformers 合入后才有；改动如果藏在没有被改写的共享工具函数里，或者训练方法变了而结构没变（例如 DeepSeek-R1 和 V3 结构完全相同），diff 会显示“没有变化”。这时就要看技术报告。

## 深度、宽度、头维度、词表：这些数字怎样取

配置里的几个形状数字，各家的取值差别很大：

| 模型 | 层数 | hidden | Q 头 × head_dim | FFN 或单专家宽度 / hidden | 词表 |
| --- | --- | --- | --- | --- | --- |
| Qwen2.5-0.5B | 24 | 896 | 14 × 64 | 4864（5.4 倍） | 151936，共享 |
| Llama-3.1-8B | 32 | 4096 | 32 × 128 | 14336（3.5 倍） | 128256 |
| Qwen3-8B | 36 | 4096 | 32 × 128 | 12288（3.0 倍） | 151936 |
| Qwen3-30B-A3B | 48 | 2048 | 32 × 128 | 768（0.375 倍）× 8 个 | 151936 |
| gpt-oss-20b | 24 | 2880 | 64 × 64 | 2880（1.0 倍）× 4 个 | 201088 |
| Gemma 4 31B | 60 | 5376 | 32 × 256（全局层 512） | 21504（4.0 倍） | 262144，共享 |
| DeepSeek-V3 | 61 | 7168 | 128 × 192 | 2048（0.29 倍）× 8 + 1 个共享 | 129280 |

**深度和宽度。** Kaplan 等人 2020 年的缩放定律实验发现，在非嵌入参数量固定时，层数与宽度的比例在很大范围内变化，损失只差几个百分点，规模远比形状重要。但这不等于随便取：Levine 等人 2020 年从理论和实验上给出，宽度固定时加深到一定程度后收益递减，最优深度大致随宽度的对数增长；MobileLLM（2024）在 1 亿到 3.5 亿参数的范围内发现“深而窄”比“浅而宽”好。工程上还有一层考虑：生成时各层只能依次计算，层数直接决定每个 token 的串行步数；宽度大则单次矩阵乘法大，更容易把 GPU 用满。这些结论都有各自的规模范围，不能直接外推到别的参数量。

**头维度。** Bhojanapalli 等人 2020 年指出，`head_dim = hidden_size / 头数` 的惯例会让头数多时每个头维度太小，形成低秩瓶颈，建议把头维度和头数分开设。今天的配置正是这样：Qwen3-30B-A3B 的 32 × 128 是 hidden 的两倍，Gemma 用 256 甚至 512，gpt-oss 用 64 但配了 64 个头。128 最常见；头维度也受注意力内核限制，FlashAttention 这类内核只支持到一定上限的几档常用维度。

**词表。** Tao 等人 2024 年的词表缩放研究认为大模型应配更大的词表，按他们的拟合，Llama 2 70B 的最优词表应在 21.6 万以上，而它实际只有 3.2 万。近两年词表从 3.2 万涨到 12.8 万、15 万、26 万，和这个方向一致。代价落在小模型上：Qwen2.5-0.5B 的 1.36 亿词嵌入占了全部 4.94 亿参数的 27.6%，所以小模型普遍共享词嵌入和输出层。另一个细节是词表通常补齐到 128 的倍数以便矩阵乘法对齐：Qwen3 实际用到的 token 编号只到 151668，`vocab_size` 却是 151936 = 128 × 1187，多出的 267 行从不被使用；128256、129280、201088 也都是 128 的倍数。

**FFN 比例。** SwiGLU 有三个矩阵，为了和两矩阵的 FFN 参数持平，原论文把中间宽度设为 4 × 2/3 ≈ 2.67 倍，各家再按需要放大并取整，于是有 3.0、3.5、4.0 倍这些值（推导见[第 05 篇](./05-ffn.md)）。MoE 模型的单个专家则窄得多，DeepSeek-V3 每个专家只有 0.29 倍，靠“细粒度专家、一次选 8 个”保持总容量。

一个模型的结构几乎全部写在 `config.json` 的形状字段和 modeling 源码里：字段决定每个矩阵的形状，形状决定参数、计算和 KV Cache，modular 文件告诉你它从谁继承、改了哪几个方法。脚本能把前一半变成几秒钟的计算，后一半仍要靠读源码和技术报告；算出来的数先和权重统计对上，再拿去估显存和成本。下一篇[主流架构对比与演进趋势](./19-comparison.md)用同样的方法，把系列里拆过的模型放进一张表，看这几年的架构选择往哪里走。
