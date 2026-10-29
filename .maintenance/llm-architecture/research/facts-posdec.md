# facts-posdec：07 位置编码、08 输出层与解码、09 Transformer 家族

核对日期：2026-10-28。脚本与下载的配置在 scratch 目录 `<scratch>/arch/posdec/`（`rope.py`、`tfcheck.py`、`samp.py`、`tmpl.py`、`cfg/`）。Transformers 源码版本 5.21.0（`venv-mlx` 与 `lora/.venv` 两份安装版本相同）。

## 配置（HF config.json）

| 事实 | 值 | 来源 | 结论 |
| --- | --- | --- | --- |
| Llama-3.1-8B rope_theta / rope_scaling | 500000；llama3，factor 8、low_freq_factor 1、high_freq_factor 4、original 8192；max_position_embeddings 131072；head_dim 128 | https://huggingface.co/unsloth/Meta-Llama-3.1-8B/raw/main/config.json（unsloth 镜像，Meta 官方仓库需登录） | 与简报一致 |
| Llama-2-7B | rope_theta 10000，max_position_embeddings 4096，无 rope_scaling，KV 头 32 | https://huggingface.co/unsloth/llama-2-7b/raw/main/config.json | 用作 theta 对照 |
| Llama 4 Scout text_config | rope_theta 500000；rope_scaling llama3 factor 16、low=high=1.0、original 8192；no_rope_layers 48 项中 12 个 0（每第 4 层）；attention_chunk_size 8192；attn_temperature_tuning true、floor_scale 8192、attn_scale 0.1；use_qk_norm true；max_position_embeddings 10485760 | https://huggingface.co/unsloth/Llama-4-Scout-17B-16E-Instruct/raw/main/config.json | 已核对 |
| Llama 4 Maverick text_config | rope_scaling null；no_rope_layers 同样 12 个 0；attention_chunk_size 8192；use_qk_norm false；max_position_embeddings 1048576 | https://huggingface.co/unsloth/Llama-4-Maverick-17B-128E-Instruct/raw/main/config.json | 源码注释“the 16E model skips rope”与配置不完全吻合：两个模型的配置都有 NoPE 层。正文按配置写 |
| Llama 4 上下文 | Scout 10M、Maverick 1M（模型卡表格）；Scout 预训练与后训练都用 256K 长度（Meta 博客） | 模型卡 README（unsloth 镜像）；https://ai.meta.com/blog/llama-4-multimodal-intelligence/ | 已核对 |
| Llama 4 iRoPE 说法 | 博客：“i” 指 interleaved 注意力层，这些层不用位置编码；多数层用 RoPE；推理时对注意力做温度缩放以改善长度泛化 | Meta 博客 | 已核对 |
| Qwen3-8B | rope_theta 1000000，max_position_embeddings 40960，rope_scaling null；模型卡：原生 32,768，YaRN factor 4 可到 131,072；40960 = 32768 输出 + 8192 提示；静态 YaRN 可能影响短文本，建议只在需要时开启、按实际长度调 factor（例如 65,536 用 2.0） | https://huggingface.co/Qwen/Qwen3-8B/raw/main/config.json、README | 已核对 |
| Qwen2.5-7B-Instruct | rope_theta 1e6，max_position_embeddings 32768；模型卡：超过 32,768 时加 `{"factor":4.0,"original_max_position_embeddings":32768,"type":"yarn"}`；vLLM 只支持静态 YaRN | https://huggingface.co/Qwen/Qwen2.5-7B-Instruct README | 已核对 |
| Qwen3-235B-A22B-Instruct-2507 | rope_theta 5000000，max_position_embeddings 262144 | 对应 config.json | 只作 theta 对照，正文未必使用 |
| GPT-2 small | n_layer 12、n_embd 768、n_head 12、n_positions 1024、vocab 50257、attn/resid/embd dropout 0.1、activation gelu_new | https://huggingface.co/openai-community/gpt2/raw/main/config.json | 已核对；参数量脚本复算 124,439,808 |
| BERT-base | 12 层、768、12 头、FFN 3072、max_position 512、vocab 30522、dropout 0.1、position_embedding_type absolute | google-bert/bert-base-uncased config.json | 已核对 |
| T5-base | 编码器 12 层 + 解码器 12 层，d_model 768、d_ff 3072、12 头、d_kv 64、relative_attention_num_buckets 32、dropout 0.1 | google-t5/t5-base config.json；`models/t5/configuration_t5.py`（max_distance 默认 128） | 已核对 |
| Llama-3.1-8B-Instruct generation_config | do_sample true、temperature 0.6、top_p 0.9、eos_token_id [128001, 128008, 128009] | https://huggingface.co/unsloth/Meta-Llama-3.1-8B-Instruct/raw/main/generation_config.json | 已核对 |
| Llama 3.1 特殊 token | 128000 `<|begin_of_text|>`、128001 `<|end_of_text|>`、128006/128007 header、128008 `<|eom_id|>`、128009 `<|eot_id|>` | 同仓库 tokenizer_config.json | 已核对 |
| Qwen2.5-0.5B-Instruct generation_config | temperature 0.7、top_p 0.8、top_k 20、repetition_penalty 1.1、eos [151645, 151643] | 对应 generation_config.json | 已核对（推理系列 vllm-quickstart 写的是 7B 的 1.05，两者不同模型，不冲突） |

## 源码（Transformers 5.21.0）

- `modeling_rope_utils.py::_compute_llama3_parameters`：wavelen = 2π/inv_freq；wavelen < original/high_freq_factor（2048）不变；> original/low_freq_factor（8192）除以 factor；中间按 smooth = (8192/wavelen − 1)/(4 − 1) 在两者间插值；attention_factor 恒为 1。脚本用 Transformers 函数实算：64 个频率对中 29 个不变、29 个除以 8、6 个（下标 29–34，波长 2402–6695）缩放 1.207–5.257 倍。
- `_compute_yarn_parameters`：beta_fast 32、beta_slow 1 默认；用 original 长度内转的圈数找校正维度区间，线性斜坡混合“插值频率（除以 factor）”和“原频率”；attention_factor 默认 0.1·ln(factor)+1，乘在 cos/sin 上。Qwen3-8B（theta 1e6、d 128、factor 4、orig 32768）实算：下标 0–23 不变，24–39 渐变 1.046–3.400 倍，40–63 除以 4；attention_factor 1.1386（q、k 各乘一次，分数放大约 1.296 倍）。
- `_compute_dynamic_ntk_parameters`：base' = base·((factor·seq_len/max_pos) − (factor−1))^(d/(d−2))，只在 seq_len 超过 max_position_embeddings 时生效。
- `models/llama/modeling_llama.py`：`rotate_half` 把前一半和后一半配对（不是相邻两维），`LlamaRotaryEmbedding.forward` 用 `cat(freqs, freqs)` 再 cos/sin，乘 attention_scaling；`lm_head = nn.Linear(hidden, vocab, bias=False)`，forward 有 `logits_to_keep`，生成时只算最后位置。
- `models/llama4/modeling_llama4.py`：`self.use_rope = config.no_rope_layers[layer_idx]`；NoPE 层且 `attn_temperature_tuning` 时 q 乘 `log1p(floor((pos+1)/floor_scale))·attn_scale + 1`；注释引用 arXiv 2501.19399。复算：位置 0–8190 为 1.0，8191 为 1.069，131071 为 1.283，1048575 为 1.486，10485759 为 1.716。RoPE 用复数乘法实现（view_as_complex，相邻两维配对）。
- `configuration_llama4.py`：layer_types 默认 RoPE 层为 `chunked_attention`，NoPE 层为 `full_attention`；`masking_utils.chunked_overlay` 是块对角（同一 8192 块内因果），不是滑动窗口。
- `generation/utils.py::_get_logits_processor`：先 repetition_penalty 等 processor，再按 temperature → top_k → top_p → min_p 顺序追加 warper；min_p 注释说明放在温度之后。
- `logits_process.py`：RepetitionPenalty 对出现过的 token（含提示）分数为正时除以 penalty、为负时乘以 penalty；TopP 按升序累积，去掉累计 ≤ 1−p 的部分；MinP 阈值 = min_p × 最大概率。
- `models/gpt2/modeling_gpt2.py`：ln_1 在注意力前、ln_2 在 MLP 前、最终 ln_f（Pre-Norm）；wpe 学习式绝对位置；lm_head 与 wte 共享。
- `models/t5/modeling_t5.py::T5LayerNorm`：无 bias、不减均值（RMSNorm 形式）。
- Transformers 中存在 `t5gemma`、`t5gemma2`、`modernbert`、`whisper` 目录。

## 脚本算例

- 二维 RoPE（rope.py）：q=(1,0)、k=(0,1)、θ=0.5 rad/位置。未旋转点积 0；q₃=(0.0707,0.9975)、k₁=(−0.4794,0.8776)；(m,n)=(3,1)、(5,3)、(12,10) 点积都 0.8415 = sin(2·0.5)；(3,3) 为 0；(1,3) 为 −0.8415。128 维、theta 500000、随机向量：(10,7)、(1003,1000)、(100003,100000) 点积都 4.422094，(7,10) 为 −6.585006。
- 波长（theta 500000，d 128）：第 0 对 6.3、第 8 对 32.4、第 16 对 167、第 24 对 862、第 32 对 4443、第 40 对 22911、第 48 对 118143、第 63 对约 256 万；theta 10000 时最长波长约 54410，theta 1e6 时约 506 万。llama3 缩放后最长波长约 2047 万。
- NTK-aware（theta 10000、d 128、s 4）：base' = 10000·4^(128/126) ≈ 40890；最高频不变、最低频正好慢 4 倍。
- 采样（samp.py），教学 logits 根据 5.0、您 4.0、申请 3.0、首先 2.5、请 1.5、好 0.0（只假设 6 个候选）：T=1 概率 0.616/0.227/0.083/0.051/0.019/0.004（e^x 和 240.761）；T=0.7 根据 0.750；T=0.5 根据 0.861；T=1.5 根据 0.477、好 0.017；T=0.6 根据 0.804、您 0.152，top-p 0.9 只留 2 个（累计 0.956）。top-k 3 重归一 0.665/0.245/0.090；top-p 0.9 累计 0.616→0.843→0.927 留 3 个；min-p 0.1 阈值 0.0616 留 3 个。平坦分布 [2.0,1.9,1.8,1.8,1.7,1.6] 概率 0.202…0.135，top-p 0.9 与 min-p 0.1 都留 6 个。长尾例（0.5 + 50 个 0.01）手算：top-p 0.9 留 41 个，min-p 0.1 阈值 0.05 留 1 个。重复惩罚 1.1 作用于“申请”（出现在提示中）：3.0 → 2.727，概率 0.083 → 0.065。
- 输出层：4096 × 128256 = 525,336,576 参数，BF16 1,050,673,152 字节（约 1.05 GB / 0.98 GiB），每 token 约 1.05 GFLOPs，占 8B 总参数和每 token 前向计算的 6.5%；一个位置的 FP32 logits 513,024 字节（501 KiB）；53 个位置全算约 25.9 MiB。
- Qwen2.5-0.5B 共享词嵌入 151936×896 = 136,134,656 参数，按总参数 494,032,768 计约 27.6%（正文写“四分之一以上”）。
- 输出层与注意力位置：原始训练长度 8192 落在第 34（波长 6695）与第 35 对（8219）之间；131072 落在第 48（118143）与第 49 对之间；第 40 对 22911，8192 内转 0.357 圈。
- 对话模板（tmpl.py，transformers 5.21.0 apply_chat_template）：资料助手 system + “年假怎么申请？”在 Llama 3.1 Instruct 模板下 53 个 token（含自动插入的 Cutting Knowledge Date / Today Date 26 Jul 2024），Qwen2.5-0.5B-Instruct 下 29 个；Llama 3 分词器中“根据”是单个 token 110747，“年假”切成 年(8107)+假(107099)。

## 论文与官方资料

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| 原始 Transformer：编码器、解码器各 6 层，d_model 512、FFN 2048、8 头、dropout 0.1、正弦位置编码、残差后接 LayerNorm（Post-Norm）、ReLU、嵌入与 softmax 前线性层共享；base 约 65M，big 约 213M；WMT 翻译 | arXiv 1706.03762 | 已核对 |
| RoFormer / RoPE | arXiv 2104.09864（Su et al. 2021） | 已核对 |
| ALiBi：按距离线性扣分、各头斜率几何级数，训练短测长 | arXiv 2108.12409（Press et al. 2021） | 已核对；8 头斜率 1/2…1/256 |
| 位置插值 PI：把位置乘 L/L' 压回训练范围，LLaMA 7B–65B 微调约 1000 步扩到 32768 | arXiv 2306.15595（Chen et al. 2023） | 已核对 |
| NTK-aware 缩放：社区方法（Reddit bloc97 2023），无正式论文；Transformers 的 dynamic 函数注释致谢 /u/bloc97 和 /u/emozilla | 源码注释 | 正文不写论文出处 |
| YaRN | arXiv 2309.00071（Peng et al. 2023） | 已核对 |
| NoPE：因果解码器不加位置编码也能从因果掩码推断位置 | arXiv 2305.19466（Kazemnejad et al. 2023） | 已核对；正文说明是小模型实验 |
| Llama 3：RoPE base 提到 500,000；长上下文分六个阶段从 8K 到 128K，约 800B token；每阶段检查短文本恢复和大海捞针 | arXiv 2407.21783 | 已核对；报告没有展开 llama3 rope_scaling 公式，正文不写“训练中如何使用该缩放”的细节 |
| BERT：base 12/768/12 约 110M，large 24/1024/16 约 340M；MLM 掩 15% + NSP | arXiv 1810.04805 | 已核对 |
| T5：编解码、span corruption、相对位置偏置、简化 LayerNorm；最大 11B | arXiv 1910.10683 | 已核对 |
| GPT-1：12 层、768、12 头、FFN 3072、上下文 512、学习式位置、GELU，约 117M；预训练 + 任务微调 | Radford et al. 2018（OpenAI 技术报告） | 已核对 |
| GPT-2：LayerNorm 移到子层输入、最后加一层 LayerNorm、残差层初始化按 1/√N 缩放；上下文 1024、词表 50257；最大 1.5B（48 层、1600 维） | Radford et al. 2019 | 已核对 |
| GPT-3：175B，96 层、d_model 12288、96 头、上下文 2048；层间交替稠密与局部带状稀疏注意力；few-shot 上下文学习 | arXiv 2005.14165 | 已核对 |
| PaLM：dense 层与 LayerNorm 不用 bias，报告称提升大模型训练稳定性；SwiGLU、并行层、MQA、RoPE、共享输入输出嵌入 | arXiv 2204.02311 | 已核对 |
| Llama 1：pre-normalization（RMSNorm）、SwiGLU（隐藏维 2/3·4d）、RoPE | arXiv 2302.13971 | 已核对 |
| RMSNorm | arXiv 1910.07467 | 已核对 |
| SwiGLU / GLU 变体 | arXiv 2002.05202（Shazeer 2020） | 已核对 |
| Pre-Norm 分析 | arXiv 2002.04745（Xiong et al. 2020） | 已核对 |
| GQA：由 MHA 检查点用约 5% 预训练算力上训 | arXiv 2305.13245 | 已核对 |
| 架构与目标对零样本泛化：只做无监督预训练时，因果 decoder-only + 自回归目标零样本最好；加多任务提示微调后，非因果（编解码 / 前缀）+ MLM 目标最好；架构之间可互相改造 | arXiv 2204.05832（Wang et al. 2022），5B 级模型、170B token | 已核对；正文按这一边界写 |
| UL2：目标函数混合比单一架构选择影响更大 | arXiv 2205.05131 | 正文只作“目标比结构更关键”的佐证，口径保守 |
| T5Gemma：把预训练 decoder-only Gemma 2 改造成编解码，报告质量—效率取舍更好；T5Gemma 2 基于 Gemma 3 | arXiv 2504.06225；Google Developers Blog；arXiv 2512.14856 | 已核对，作为“编解码仍有用”的边界 |
| min-p 采样 | arXiv 2407.01082（Nguyen et al. 2024） | 已核对 |
| 核采样 top-p | arXiv 1904.09751（Holtzman et al. 2019） | 已核对 |
| 重复惩罚出处 | CTRL，arXiv 1909.05858（Transformers 源码注释） | 已核对 |

## 与简报的差异 / 不确定

- 简报数字未发现错误。
- Llama 4：源码注释只说 16E 跳过 RoPE，但 Maverick（128E）配置同样有 12 个 NoPE 层；正文按配置写“两者配置都每 4 层一层 NoPE”。
- Llama 3.1 的 llama3 缩放在长上下文继续预训练中具体如何使用，技术报告没有公式说明；正文只写“配置和代码怎样算频率”以及“长上下文靠继续训练”，不推断训练细节。
- “decoder-only 成为主流”的工程与生态原因（KV 复用、一个模型通吃任务、规模定律研究主要基于 decoder-only）属于机制推理与行业观察，正文标明不是对照实验结论。
- dropout 去掉：Llama 配置 attention_dropout 0.0、残差无 dropout 是源码事实；“海量数据单轮训练不需要正则”是常见解释，正文标明为解释而非实验结论。
