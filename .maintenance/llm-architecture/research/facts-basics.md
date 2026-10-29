# facts-basics：01 全景、02 分词与词嵌入、03 注意力

核对日期 2026-10-28。脚本与下载文件在会话 scratch 目录 `<scratch>/arch/basics/`（`scripts/`、`dl/`），运行环境 Python 3.12 venv-mlx，`tokenizers` 0.23.3、`transformers` 5.21.0（无 PyTorch，只用分词器）。

## 模型配置

| 事实 | 数值 | 来源 | 结论 |
| --- | --- | --- | --- |
| Llama-3.1-8B config | hidden 4096、32 层、32 Q 头、8 KV 头、head_dim 128、intermediate 14336、vocab 128256、silu、rms_norm_eps 1e-5、rope_theta 500000、rope_scaling llama3（factor 8、original 8192、low/high_freq_factor 1/4）、max_position 131072、tie false、attention_bias false、mlp_bias false、bos 128000、eos 128001 | https://huggingface.co/unsloth/Meta-Llama-3.1-8B/raw/main/config.json （unsloth 镜像，Meta 官方仓库需登录） | 与简报一致 |
| Qwen2.5-0.5B-Instruct config | hidden 896、24 层、14 Q 头、2 KV 头、intermediate 4864、vocab 151936、tie true、rope_theta 1e6 | https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct/raw/main/config.json | 与简报一致 |
| Llama-3.2-1B config | hidden 2048、16 层、32/8 头、head_dim 64、intermediate 8192、vocab 128256、tie true | https://huggingface.co/unsloth/Llama-3.2-1B/raw/main/config.json | 用于共享词嵌入占比 |
| Llama-3.2-3B、Qwen3-0.6B tie true；Qwen3-8B tie false | 见 config | unsloth/Llama-3.2-3B、Qwen/Qwen3-0.6B、Qwen/Qwen3-8B 的 config.json | 正文只举 Llama-3.2-1B 和 Qwen2.5-0.5B |

## 参数分解（脚本 `scripts/numbers.py` 复算）

| 项 | 数值 | 结论 |
| --- | --- | --- |
| Llama-3.1-8B 每层 q/k/v/o | 16,777,216 / 4,194,304 / 4,194,304 / 16,777,216，合计 41,943,040 | 与简报一致 |
| 每层 FFN | 3 × 4096 × 14336 = 176,160,768 | 一致 |
| 每层 RMSNorm | 2 × 4096 = 8,192；每层合计 218,112,000 | 一致 |
| 32 层 | 6,979,584,000 | 一致 |
| 词嵌入、输出层 | 各 525,336,576 | 一致 |
| 总计 | 8,030,261,248；FFN 70.2%、注意力 16.7%、词嵌入+输出层 13.1%、norm 合计 266,240（0.003%） | 一致 |
| 单层内部比例 | 注意力 41,943,040 / 218,112,000 = 19.2%，FFN 80.8% | 本组补充 |
| Qwen2.5-0.5B 总参数 | 494,032,768（含 q/k/v bias 每层 1,152）；词嵌入 136,134,656 占 27.6%；非嵌入 357,898,112 | 模型卡写 0.49B、非嵌入 0.36B，一致 |
| Llama-3.2-1B | 总 1,235,814,400，词嵌入 262,668,288 占 21.3% | 官方称 1.23B/1.24B 级别，一致 |

## 计算量口径

| 项 | 数值 | 结论 |
| --- | --- | --- |
| 每 token 前向 ≈ 2 × 参数量 | 2 × 8.03B = 16.06 GFLOPs（简报口径） | 更精确：词嵌入是查表不做乘法，参与矩阵乘的参数 7,504,658,432，2× = 15.0 GFLOPs。正文写“约 15 GFLOPs（2 × 参与矩阵乘的 75 亿参数；粗算按全部 80 亿记为 16）”。与简报差别是口径，不是错误 |
| 其中输出层 | 2 × 4096 × 128256 = 1.05 GFLOPs | 本组补充 |
| 每层每 token 线性部分 | 注意力投影 83.9 MFLOPs，FFN 352.3 MFLOPs | 本组补充 |
| 注意力随上下文的部分 | 每层每 token 约 4 × n × 4096（QKᵀ 2·n·128·32 + 加权 V 同量）；32 层：n=8192 时 4.29 GFLOPs、32768 时 17.2、131072 时 68.7 | 与简报口径一致；这是第 n 个位置的量，整段因果 Prefill 平均约一半 |
| 分数矩阵理论大小 | 每层 32 头 × n² × 2 字节：8K 4 GiB、32K 64 GiB、128K 1024 GiB；单头 8K 128 MiB | 本组计算；FlashAttention 不物化整张矩阵（arXiv 2205.14135） |
| KV Cache | 2 × 32 × 8 × 128 × 2 = 131,072 字节/token | 与简报一致 |

## Transformers 源码（本机 transformers 5.21.0）

路径 `.../site-packages/transformers/models/llama/modeling_llama.py`：

- `LlamaDecoderLayer.forward`：`residual = h; h = input_layernorm(h); h = self_attn(h); h = residual + h; residual = h; h = post_attention_layernorm(h); h = mlp(h); h = residual + h`。Pre-Norm 结构确认。
- `LlamaMLP.forward`：`down_proj(act_fn(gate_proj(x)) * up_proj(x))`，无 bias（`mlp_bias` false）。
- `LlamaAttention`：`scaling = head_dim ** -0.5`；`q_proj` 输出 `num_attention_heads × head_dim`，`k_proj`/`v_proj` 输出 `num_key_value_heads × head_dim`；先 RoPE 再写 KV Cache；`eager_attention_forward` 里 `matmul(q, kᵀ) * scaling + attention_mask`，softmax 用 float32 再转回。
- `LlamaModel`：`embed_tokens = nn.Embedding(vocab, hidden)`，最后 `self.norm = LlamaRMSNorm`；`create_causal_mask` 生成因果掩码。
- `LlamaForCausalLM`：`lm_head = nn.Linear(hidden, vocab, bias=False)`；`_tied_weights_keys` 指向 `model.embed_tokens.weight`，是否共享由 `tie_word_embeddings` 决定；`logits_to_keep` 参数可只算最后若干位置的 logits。
- `qwen2/modeling_qwen2.py`：q/k/v_proj `bias=True`，o_proj 无 bias。

## 分词实测（脚本 `scripts/tok.py`、`scripts/tok2.py`）

分词器文件：Llama 3.1 `tokenizer.json` 从 https://huggingface.co/unsloth/Meta-Llama-3.1-8B/resolve/main/tokenizer.json 下载（官方仓库需登录，用 unsloth 镜像）；聊天模板用 unsloth/Meta-Llama-3.1-8B-Instruct 的 `tokenizer_config.json`。Qwen2.5 用本机缓存 `~/.cache/huggingface/hub/models--Qwen--Qwen2.5-0.5B-Instruct/snapshots/7ae5576.../tokenizer.json`。用 `tokenizers.Tokenizer.from_file` 加载，`add_special_tokens=False`。

| 输入 | Llama 3.1 | Qwen2.5 |
| --- | --- | --- |
| 年假怎么申请？ | 5 个：年 8107、假 107099、怎么 104237、申请 112838、？ 11571 | 5 个：年 7948、假 99436、怎么 99494、申请 101915、？ 11319 |
| 年假怎么申请？根据 | 6 个（根据 110747） | 6 个（根据 100345） |
| How do I apply for annual leave? | 8 个 | 8 个 |
| 钉钉审批 | 6 个：“钉”拆成 38572（字节 E9 92）+ 231（字节 89），两次；审、批 | 3 个：钉、钉、审批 |
| 我想请5天年假 | 7 个 | 6 个（“我想”一个 token） |
| 𠮷（4 字节） | 4 个字节 token | 1 个 |
| 请问年假怎么申请？ | 7 个 | 6 个（“请问”一个 token） |
| 词表 | `get_vocab_size(True)` 128,256 = 128,000 普通 + 256 特殊 | 151,665 = 151,643 普通 + 22 特殊；config 的 vocab_size 151,936，多出 271 行不对应 token（151,936 = 128 × 1,187） |
| 预切分正则 | 数字 `\p{N}{1,3}`（最多 3 位一组） | 数字 `\p{N}`（单个数字） |
| BPE 模型 | `type` BPE、`byte_fallback` false、ByteLevel 预处理 | 同 |
| 特殊 token | `<|begin_of_text|>` 128000、`<|eot_id|>` 128009 | `<|endoftext|>` 151643、`<|im_start|>` 151644、`<|im_end|>` 151645 |
| 套聊天模板后 | 40 个 token（模板自动插入 “Cutting Knowledge Date: December 2023 / Today Date: 26 Jul 2024” 系统段） | 34 个 token（默认系统提示 “You are Qwen, created by Alibaba Cloud...”） |

UTF-8 字节：年 E5 B9 B4、假 E5 81 87、怎 E6 80 8E、么 E4 B9 88、申 E7 94 B3、请 E8 AF B7、？ EF BC 9F、钉 E9 92 89，共 21 字节（“年假怎么申请？”）。

结论：实测，正文标“实测”，说明是单句样例。

## 分词与嵌入相关论文

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| BPE 用于神经机器翻译的子词切分 | Sennrich 等 2016，arXiv 1508.07909 | 一致 |
| GPT-2 字节级 BPE，以 256 个字节为基础词表，避免未知字符 | GPT-2 论文 “Language Models are Unsupervised Multitask Learners”（2019）2.2 节 | 一致 |
| Llama 3 词表 128K = tiktoken 100K + 28K 非英语 token；英文压缩率 3.17→3.94 字符/token | arXiv 2407.21783 3.2 节；训练系列 facts-pretrain.md 已核对 | 一致 |
| 共享输入输出嵌入（weight tying）能减少参数并改善语言模型困惑度 | Press & Wolf 2017，arXiv 1608.05859；原始 Transformer（arXiv 1706.03762 3.4 节）也共享两个嵌入层与 softmax 前的线性层 | 一致 |
| Llama 2 SentencePiece 32K、字节回退 | arXiv 2307.09288；训练系列已核对 | 一致，02 只链接训练系列第 06 篇 |

## 注意力

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| Attention(Q,K,V)=softmax(QKᵀ/√d_k)V；除以 √d_k 的理由：d_k 大时点积量级变大，softmax 进入梯度极小的区域 | Vaswani 等 2017，arXiv 1706.03762 3.2.1 节（脚注：分量独立、均值 0 方差 1 时点积方差为 d_k） | 一致 |
| 模拟：分量独立标准正态时点积标准差 d=2 约 1.42、d=16 约 4.01、d=128 约 11.26；除以 √d 后约 1。5 个 key、d=128，不缩放时 softmax 最大权重平均 0.93，缩放后 0.46（2000 次随机） | `scripts/attn.py`，numpy 随机种子 0 | 模拟，正文标“随机数模拟” |
| 手算例：X、W_Q、W_K、W_V 见 diagrams-basics.mjs；Q=[[1,1],[0,2],[1,0],[2,0]]，K=[[1,0],[2,0],[0,1],[0,0]]，V=[[1,0],[2,0],[0,1],[0,1]]；QKᵀ=[[1,2,1,0],[0,0,2,0],[1,2,0,0],[2,4,0,0]]；掩码后 softmax 行：[1]、[0.5,0.5]、[0.284,0.576,0.140]、[0.179,0.735,0.043,0.043]；输出 O：[1,0]、[1.5,0]、[1.436,0.140]、[1.648,0.087]；无掩码时“假”行给“怎么” 0.578；e^1.414=4.113、e^2.828=16.919、和 23.032 | `scripts/attn.py` | 教学数据，脚本复算 |
| FlashAttention 分块计算、不物化 n×n 矩阵，结果与标准注意力一致（精确注意力），显存随长度线性 | arXiv 2205.14135 | 一致 |
| Prefill 整段注意力 | 因果掩码下每 token 平均看 n/2 个位置，总量约 2 × n² × 4096 × 32：8K 17.6 TFLOPs（固定部分 15.0 GFLOPs × n = 122.9 TFLOPs 的 14%）、32K 281 TFLOPs（57%）、128K 4504 TFLOPs（2.3 倍） | 本组估算，正文标“估算” |
| 不缩放时“申请”对“假”的权重 | 0.853（缩放后 0.735） | `scripts/attn.py` |
| 注意力汇聚（attention sink）：大量注意力分数落在初始 token 上，即使其语义不重要；窗口注意力把初始 token 逐出后效果崩溃 | Xiao 等 2023，StreamingLLM，arXiv 2309.17453 | 一致，正文只作定性描述 |
| 注意力权重是否构成解释的争论 | Jain & Wallace 2019 “Attention is not Explanation”（arXiv 1902.10186）；Wiegreffe & Pinter 2019 “Attention is not not Explanation”（arXiv 1908.04626） | 正文写“提供线索，不能单独当作解释，需要干预实验” |
| 128K 上下文 KV Cache | 131,072 × 128 KiB = 16 GiB | 计算 |
| Llama 3 长上下文训练推迟到后期，原因是自注意力计算随长度平方增长 | arXiv 2407.21783 3.4.2；训练系列已核对 | 一致 |

## 第 01 篇其他事实

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| DeepSeek-V3 总参数 671B、每 token 激活 37B | 简报；DeepSeek-V3 技术报告 arXiv 2412.19437 摘要 | 一致 |
| MoE / 混合层 / MLA 在 config 里的字段名 | 本机 transformers：mixtral `num_local_experts`（attribute_map num_experts）、qwen3_moe `num_experts`、deepseek_v3 `n_routed_experts`、`kv_lora_rank`；gemma3、gpt_oss、qwen3_next 的 `layer_types`（gemma3 混合 `sliding_attention`/`full_attention`）；注意 dense 的 qwen3 也有 `layer_types`（全部 full_attention），所以正文写“按层类型不全相同” | 一致 |
| Llama 3.1 对话模板套“年假怎么申请？”后 40 token | `scripts/tok2.py` | 实测 |
| BF16 权重 8,030,261,248 × 2 = 16.06 GB = 14.96 GiB | 计算 | 一致 |
| 分词器“2026” | Llama 3：202 / 6；Qwen2.5：2 / 0 / 2 / 6 | 实测 |

## 与简报不同或补充

- 每 token 计算量：简报写“约 2×参数量 ≈ 16 GFLOPs”；按只计矩阵乘的口径是 15.0 GFLOPs（词嵌入查表不算乘法）。正文同时给出两种口径。
- 简报其余数字（参数分解、KV Cache）复算一致。

## 仍不确定、正文回避的说法

- “申请”在真实 Llama 某一层是否真的主要注意“假”：没有跑模型权重，正文只用教学数字说明机制，不声称真实模型的注意力分布。
- 贯穿案例中下一个 token 是“根据”：没有在 Llama-3.1-8B 上实测，正文和图都标“示意”。
