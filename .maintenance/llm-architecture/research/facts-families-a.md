# facts-families-a：13 Llama 家族、14 Qwen 家族核对记录

核对日期：2026-10-28。Transformers 源码版本 5.21.0（`scratchpad/venv-mlx/lib/python3.12/site-packages/transformers/models/`）。config.json 原始文件存于 scratch `arch/families-a/cfg/`，模型卡存于 `arch/families-a/cards/`。

## 来源说明

- Meta 官方 `meta-llama/*` 仓库需要登录，Llama 配置从镜像读取：Llama 1 `huggyllama/llama-7b`、`huggyllama/llama-65b`（社区转换，非 Meta 发布）；Llama 2 `unsloth/llama-2-7b`、`NousResearch/Llama-2-70b-hf`；Llama 3 `unsloth/llama-3-8b`、`NousResearch/Meta-Llama-3-70B`；Llama 3.1 `unsloth/Meta-Llama-3.1-8B`、`unsloth/Meta-Llama-3.1-70B`、`unsloth/Meta-Llama-3.1-405B-Instruct-bnb-4bit`（只读结构字段）；Llama 3.2 `unsloth/Llama-3.2-1B`、`-3B`、`-11B-Vision-Instruct`；Llama 3.3 `unsloth/Llama-3.3-70B-Instruct`；Llama 4 `unsloth/Llama-4-Scout-17B-16E-Instruct`、`unsloth/Llama-4-Maverick-17B-128E-Instruct-FP8`，交叉核对 `RedHatAI/Llama-4-Maverick-17B-128E-Instruct-FP8`。
- Meta 模型卡与许可证：`https://raw.githubusercontent.com/meta-llama/llama-models/main/models/{llama3,llama3_1,llama3_2,llama4}/{MODEL_CARD.md,LICENSE,USE_POLICY.md}`，以及 unsloth 镜像中的 LICENSE/README。
- Qwen 配置与模型卡：`https://huggingface.co/Qwen/<repo>/resolve/main/{config.json,README.md,LICENSE}`，均为官方组织仓库。

## Llama 家族

| 事实 | 数值 / 结论 | 来源 | 结论 |
| --- | --- | --- | --- |
| Llama 1 7B 结构 | 32 层、4096、32 头（无 num_key_value_heads → MHA）、FFN 11008、词表 32000、max_pos 2048、rms_eps 1e-6、不共享 | huggyllama/llama-7b config | 一致；LLaMA 论文 arXiv 2302.13971：Pre-Norm RMSNorm、SwiGLU（2/3·4d）、RoPE、2K 上下文、1.0T/1.4T token |
| Llama 1 65B | 80 层、8192、64 头 MHA、FFN 22016 | huggyllama/llama-65b | 一致 |
| Llama 1 许可 | 非商业研究许可 | 论文发布说明（2023-02） | 常识级，正文只写“仅限研究” |
| Llama 2 7B | 32 层、4096、32/32 头（MHA）、FFN 11008、词表 32000、4096 上下文、θ 10000 | unsloth/llama-2-7b | 一致 |
| Llama 2 70B | 80 层、8192、64/8 头（GQA）、FFN 28672 | NousResearch/Llama-2-70b-hf | 一致；Llama 2 论文 2307.09288：34B/70B 用 GQA，2T token |
| Llama 2 许可 | Release Date July 18, 2023；7 亿月活条款；禁止用输出改进其他 LLM | NousResearch LICENSE.txt | 一致 |
| Llama 3 8B | 32 层、4096、32/8、FFN 14336、词表 128256、8192 上下文、θ 500000、无 rope_scaling | unsloth/llama-3-8b | 一致 |
| Llama 3 70B | 80 层、8192、64/8、FFN 28672、8192 上下文 | NousResearch/Meta-Llama-3-70B | 一致 |
| Llama 3 设计 | 密集而非 MoE（训练稳定）；8 KV 头；跨文档注意力掩码；128K 词表 = tiktoken 100K + 28K；英文压缩率 3.17→3.94 字符/token；θ 500000 | arXiv 2407.21783 §3.2 | 一致 |
| Llama 3 发布 | 2024-04-18，15T+ token | llama3/MODEL_CARD.md | 一致 |
| Llama 3 许可 | “Built with Meta Llama 3”；派生模型名以 “Llama 3” 开头；禁止用输出改进其他 LLM | llama3/LICENSE | 一致 |
| Llama 3.1 | 2024-07-23；~15T token；rope_scaling {rope_type llama3, factor 8, low 1, high 4, original 8192}；max_pos 131072 | llama3_1/MODEL_CARD.md；3.1-8B/70B config | 一致；简报主算例数字一致 |
| Llama 3.1 405B | 126 层、16384、128/8、FFN 53248；按 config 计算 405.85B | 405B bnb config（结构字段）；论文 Table 3 | 一致 |
| Llama 3.1 许可 | “Built with Llama”；派生模型名以 “Llama” 开头；允许用输出训练、微调其他模型；7 亿月活条款 | llama3_1/LICENSE | 一致；3.3 模型卡明确写“supports leveraging outputs to improve other models” |
| Llama 3.2 1B | 16 层、2048、32/8、head_dim 64、FFN 8192、tie true、rope factor 32 | unsloth/Llama-3.2-1B | 一致；按 config 计算 1,235,814,400 |
| Llama 3.2 3B | 28 层、3072、24/8、FFN 8192、tie true、factor 32 | unsloth/Llama-3.2-3B | 一致；3.213B |
| Llama 3.2 1B/3B 训练 | 用 3.1 8B/70B 的 logits 作为 token 级目标；剪枝后知识蒸馏恢复性能；最多 9T token | llama3_2/MODEL_CARD.md | 一致（模型卡未写明从哪个模型剪枝，正文不写来源模型） |
| Llama 3.2 Vision | 基于 3.1 文本模型，单独训练的视觉 adapter 由一串交叉注意力层组成；11B config 40 层，cross_attention_layers [3,8,…,38] | MODEL_CARD_VISION.md；11B config | 一致 |
| Llama 3.2 发布 | 2024-09-25 | 模型卡 | 一致 |
| Llama 3.2/4 欧盟条款 | 多模态模型的许可权利不授予住所在欧盟的个人或主营地在欧盟的公司；不影响终端用户 | llama3_2/USE_POLICY.md、llama4/USE_POLICY.md | 一致 |
| Llama 3.3 | 只有 70B Instruct，2024-12-06；config 与 3.1-70B 结构字段相同 | unsloth/Llama-3.3-70B-Instruct config、README | 一致 |
| Llama 4 发布 | 2025-04-05（License Effective Date 同日） | Scout README、LICENSE | 一致 |
| Llama 4 Scout | 48 层、5120、40/8、head 128、专家 FFN 8192、16 专家 top-1、每层 MoE（interleave 1）、词表 202048、max_pos 10,485,760、rope_scaling llama3 factor 16（low=high=1）、use_qk_norm true、no_rope_layers 每 4 层一个 0、attention_chunk_size 8192、attn_temperature_tuning true、floor_scale 8192、attn_scale 0.1、tie false | unsloth Scout config | 一致 |
| Llama 4 Maverick | 同 48 层/5120/40/8；128 专家 top-1；interleave 2 → moe_layers 1,3,…,47；密集层 intermediate_size_mlp 16384；max_pos 1,048,576；无 rope_scaling；use_qk_norm false | unsloth/RedHat Maverick FP8 config | 一致 |
| Llama 4 参数 | 按 config 计算：Scout 文本 107.77B、激活 17.17B（含两张词表）；Maverick 文本 400.71B、激活 17.18B；视觉编码器另计（34 层、1408 维） | 本地计算 | 与官方 109B/17B、400B/17B 吻合（Scout 差值为视觉编码器与投影层） |
| Llama 4 官方描述 | 交替密集与 MoE 层；MoE 层 128 个路由专家 + 1 个共享专家；iRoPE = 不带位置编码的交错注意力层 + 推理时注意力温度缩放；早期融合；视觉编码器基于 MetaCLIP；FP8 训练；Scout 预训练和后训练都用 256K 上下文；Scout Int4 可放进单张 H100；Behemoth 288B 激活/近 2T 总参数，未发布 | ai.meta.com/blog/llama-4-multimodal-intelligence/ | 一致 |
| Llama 4 训练量 | Scout ~40T、Maverick ~22T 多模态 token；知识截止 2024-08 | llama4/MODEL_CARD.md | 一致 |
| Llama 4 源码 | `Llama4Router`：线性层 → topk → 未选中置 -inf → sigmoid；`Llama4TextMoe`：输入乘以路由分数后进专家，再加共享专家输出；`no_rope_layers[i]==1` 表示使用 RoPE；`layer_types`：用 RoPE 的层为 `chunked_attention`，NoPE 层为 `full_attention`；`qk_norm` 为无权重 L2Norm，只在 RoPE 层且 use_qk_norm 时启用；温度缩放 `scale = log1p(floor((pos+1)/floor_scale))*attn_scale + 1` 只作用于 NoPE 层的 Q | modeling_llama4.py 54–443 行、configuration_llama4.py 175–205 行 | 已读源码 |
| 温度缩放算例 | pos=100,000：floor(100001/8192)=12，ln(13)=2.565，×0.1+1=1.256；pos<8191 时为 1 | 本地计算 | 正确 |
| Llama 4 之后 | 截至 2026-10-28，HF `meta-llama` 组织按创建时间最新的模型是 Llama-Prompt-Guard-2（2025-04-28）、Llama-Guard-4-12B（2025-04-23）、Llama 4 系列（2025-04）；无新的 Llama 基础模型 | `https://huggingface.co/api/models?author=meta-llama&sort=createdAt` | 网络检索到的第三方博客提到 Meta 其他品牌模型，均未在 Meta 官方仓库核实，正文不写 |
| LlamaDecoderLayer 前向 | residual → input_layernorm → self_attn → 加残差 → post_attention_layernorm → mlp → 加残差；`LlamaMLP`: down(act(gate(x))*up(x))；`repeat_kv` 把 KV 头扩展到 Q 头数；RoPE 只作用于 Q、K | modeling_llama.py | 已读源码 |
| KV/token（BF16） | Llama1-7B/2-7B 512 KiB；Llama1-65B 2.5 MiB；Llama2-70B/3.1-70B 320 KiB；3.1-8B 128 KiB；3.2-1B 32 KiB；405B 504 KiB | 公式 2×层×KV头×head_dim×2 | 本地计算 |

## Qwen 家族

| 事实 | 数值 / 结论 | 来源 | 结论 |
| --- | --- | --- | --- |
| Qwen（2023）设计 | 除 QKV 外去掉偏置，保留 QKV 偏置“to enhance the extrapolation ability”；不共享词嵌入（换性能、付显存）；RoPE 逆频率用 FP32；Pre-Norm RMSNorm；SwiGLU，FFN 为 8/3 隐藏维；词表约 152K；长文本 NTK 插值、LogN-Scaling、窗口注意力 | arXiv 2309.16609v1 §2.2–2.5 | 一致 |
| Qwen1.5-7B | qwen2 model_type；32 层、4096、32/32（MHA）、FFN 11008、词表 151936、32K、θ 1e6、不共享 | Qwen/Qwen1.5-7B config | 一致 |
| Qwen1.5-0.5B | 24 层、1024、16/16、tie true | config | 一致 |
| Qwen1.5-MoE-A2.7B | 24 层、2048、60 专家 top-4、专家 FFN 1408、共享专家 FFN 5632、norm_topk_prob false | config | 一致 |
| Qwen1.5 许可 | tongyi-qianwen | README 元数据 | 一致 |
| Qwen2 设计 | 全尺寸 GQA；DCA + YaRN；QKV bias；7T token（0.5B 为 12T）；预训练末段 4K→32K，θ 10000→1e6，可处理 131,072；0.5B/1.5B tie；57B-A14B：64 路由专家选 8 + 共享专家，由 Qwen2-7B 升级（upcycling），每个细粒度专家 50% 参数重新初始化；词表 151,643 + 3 控制 token | arXiv 2407.10671 | 一致 |
| Qwen2-7B | 28 层、3584、28/4、FFN 18944、词表 152064、max_pos 131072、θ 1e6 | config | 一致；KV/token 56 KiB |
| Qwen2-0.5B | 24 层、896、14/2、FFN 4864、tie true | config | 一致 |
| Qwen2-57B-A14B | 28 层、3584、28/4、64 专家 top-8、专家 FFN 2560、shared_expert_intermediate_size 20480（=8×2560） | config | 一致 |
| Qwen2 许可 | 72B tongyi-qianwen，其余 Apache 2.0 | HF API cardData | 一致 |
| Qwen2.5-0.5B-Instruct | 24 层、896、14/2、FFN 4864、词表 151936、max_pos 32768、tie true、θ 1e6 | config | 与简报一致；参数 494,032,768（含 QKV 偏置），词嵌入 136,134,656 占 27.6%；若不共享为 630,167,424，两表占 43.2% |
| Qwen2.5-7B/72B | 与 Qwen2-7B/72B 结构字段相同（72B：80 层、8192、64/8、FFN 29568） | config | 一致 |
| Qwen2.5 小模型 tie | 0.5B、1.5B、3B tie true；14B/32B false | config | 一致 |
| Qwen2.5 许可 | 3B qwen-research，72B qwen（Release Date September 19, 2024；超过 1 亿月活需申请），其余 Apache 2.0 | README、LICENSE | 一致 |
| Qwen2.5-7B-Instruct-1M | θ 1e7、max_pos 1,010,000、dual_chunk_attention_config {chunk_size 262144, local_size 8192, original 262144} | config | 一致 |
| Qwen3 设计 | 去掉 Qwen2 的 QKV-bias，引入 QK-Norm；MoE 128 专家选 8，不设共享专家，全局批负载均衡损失；词表 151,669；36T token、119 种语言；0.6B/1.7B/4B tie；思考模式融合（继续 SFT + 对话模板，/think、/no_think），思考预算 | arXiv 2505.09388 | 一致 |
| Qwen3 源码 | `q_norm`/`k_norm` = 对 head_dim 的 RMSNorm，在 RoPE 前；attention_bias false | modeling_qwen3.py 229–245 | 已读 |
| Qwen3-MoE 路由 | softmax → topk → norm_topk_prob 时归一化 | modeling_qwen3_moe.py 253–262 | 已读 |
| Qwen3-0.6B | 28 层、1024、16/8、head 128（16×128=2048≠1024）、FFN 3072、tie true、max_pos 40960 | config | 一致；参数 596,049,920，词嵌入 26.1% |
| Qwen3-8B | 36 层、4096、32/8、FFN 12288、不共享；模型卡 8.2B、非嵌入 6.95B；原生 32,768，YaRN 131,072 | config、README | 一致；本地计算 8,190,735,360；KV/token 144 KiB |
| Qwen3-32B | 64 层、5120、64/8、FFN 25600 | config | 一致 |
| Qwen3-30B-A3B | 48 层、2048、32/4、128 专家 top-8、专家 FFN 768 | config | 计算 30.53B / 3.35B 激活 |
| Qwen3-235B-A22B | 94 层、4096、64/4、128 专家 top-8、专家 FFN 1536 | config | 计算 235.09B / 22.19B |
| Qwen3 2507 | Instruct-2507 / Thinking-2507 分开发布；max_pos 262144；θ 30B 1e7、235B 5e6 | config | 30B-A3B Instruct 与 Thinking config.json 完全相同（diff 无差异） |
| Qwen3 思考开关 | chat template：enable_thinking=False 时在 assistant 开头插入空 `<think>\n\n</think>\n\n`；默认 True | Qwen3-8B tokenizer_config.json | 已读模板 |
| Qwen3-Next-80B-A3B | 48 层、2048；12×(3×(Gated DeltaNet→MoE)+1×(Gated Attention→MoE))；注意力 16/2、head 256、RoPE 维 64（partial 0.25）；GDN V 头 32、QK 头 16、head 128；512 专家、10 激活 + 1 共享、专家 FFN 512；15T token；262,144 原生、可扩到 1,010,000；零中心带权重衰减 LayerNorm；MTP；Instruct 只支持非思考 | README、config | 一致 |
| Qwen3-Next 源码 | `Qwen3NextRMSNorm` 乘 (1+weight)；注意力 q_proj 输出 2×head_dim，拆成 Q 和 gate，输出乘 sigmoid(gate)；仍有 q_norm/k_norm；共享专家输出乘 sigmoid(shared_expert_gate)；`_keys_to_ignore_on_load_unexpected = ["^mtp.*"]`（Transformers 不加载 MTP 权重） | modeling_qwen3_next.py 126–139、229–300、842–857、940 | 已读 |
| Qwen3-Next KV | 12 层全注意力 ×2 KV 头 ×256 ×2×2 B = 24,576 B/token；36 层 GDN 状态 32×128×128 = 524,288 元素/层，共 18,874,368 元素，与长度无关 | 本地计算 | 状态的存储精度由实现决定（config mamba_ssm_dtype 只出现在 3.5），正文只写元素数 |
| Qwen3-Next Instruct vs Thinking | config.json 完全相同 | diff | 一致 |
| Qwen3.5 发布 | 2026-02（397B-A17B 仓库 2026-02-16 创建；小尺寸 2-24 至 2-28） | HF API | 正文写“2026 年 2 月” |
| Qwen3.5 结构 | model_type qwen3_5 / qwen3_5_moe；`Qwen3_5GatedDeltaNet` 继承 Qwen3Next，只是把合并投影拆成 in_proj_qkv / z / b / a；注意力、MLP、RMSNorm 直接继承 Qwen3Next；视觉部分继承 Qwen3-VL；MoE 路由用 Qwen3VLMoe 的 softmax-topk-归一化 | modular_qwen3_5.py、modular_qwen3_5_moe.py | 已读 |
| Qwen3.5-397B-A17B | 60 层 = 15×(3 GDN + 1 Gated Attention)；4096；注意力 32/2、head 256、RoPE 维 64；GDN V 64、QK 16；512 专家 10+1 共享、专家 FFN 1024；词表 248320；262,144 原生、可扩到 1,010,000；MTP；早期融合多模态；201 种语言；默认思考模式，不支持 /think /nothink 软开关 | README、config | 一致；KV/token 30 KiB |
| Qwen3.5 其余 | 0.8B（24 层、1024、8/2、FFN 3584、tie true）、2B（tie true）、4B（tie true）、9B（32 层、4096、16/4）、27B（64 层、5120、24/4、FFN 17408）、35B-A3B（40 层、256 专家 8+1）、122B-A10B（48 层、256 专家 8+1） | config | 一致；0.8B 词嵌入 248320×1024 = 254,279,680 |
| Qwen3.6 | 2026-04；27B、35B-A3B，model_type 仍是 qwen3_5 / qwen3_5_moe，结构字段与 3.5 同尺寸一致；新增“思考保留”选项 | config、README | 一致 |
| Qwen3.8 | 2026-08；27B（qwen3_5，Apache 2.0）、2.4T-A95B（qwen3_5_moe_text，纯文本，92 层 = 23×4，8192 维，512 专家 10+1，专家 FFN 2048，许可 Qwen3.8-Max License）；reasoning_effort、preserve_thinking | config、README、LICENSE | 一致 |
| Qwen3.8-Flash-Next | 2026-08；model_type qwen4_exp；125B 总 / 6B 激活，另有 51B n-gram 嵌入和 4B MTP；48 层 = 12×(3 GDN + 1 QSA)；2560 维；QSA：注意力 24/2、head 256；索引器 4 个查询头 + 1 个共享键头、head 128，预算 512 块或 2048 token（compress_ratio 4）；512 专家 10+1、专家 FFN 640；Gated Residual 4 路、瓶颈 320；n-gram 嵌入 2/3-gram，第 2 层；Muon + AdamW；许可 Qwen Community License 1.0（超过 1 亿月活或 2000 万美元月收入须在界面显示模型名；做 MaaS 或 AI 工作助手业务需另行授权） | README、config、LICENSE | 一致 |
| qwen4_exp 源码 | `Qwen4ExpTextQSAIndexer`：对可见 token 每 4 个取键平均成块、RMSNorm、按块首位置加 RoPE，与查询点积后 ReLU 求和打分，选 top 块（budget/compress_ratio=512），尾部不满一块的 token 全保留，结果转成掩码与因果掩码相与；`Qwen4ExpTextGatedResidual`：残差流宽度 hc_count×hidden（4×2560），sigmoid 读门混合 4 路输入、2·sigmoid 写门把子层输出注入 4 路；解码器层没有单独的 input_layernorm；`Qwen4ExpTextNGramEmbedding`：前 2 个 token 与当前 token 组成 2/3-gram，用乘法 + 异或哈希到素数大小的表，每个 n-gram 阶 8 个哈希头；`Qwen4ExpTextPLELayer` 用 n-gram 嵌入与隐藏状态的点积做门控再加回 | modular_qwen4_exp.py 368–845 | 已读；正文只写到机制层面 |
| 是否“Qwen4” | transformers 目录名为 qwen4_exp，docstring checkpoint 写 `Qwen/Qwen4-Exp`；官方发布的唯一权重名为 Qwen3.8-Flash-Next，README 称其为“the first open-weight release under this architecture” | 源码、README | 正文不推断“Qwen4”发布计划 |

## 补充核对

| 事实 | 数值 / 结论 | 来源 | 结论 |
| --- | --- | --- | --- |
| 复用 Llama 的模型数 | 111 个 `models/*/modular_*.py` 含 `from ..llama.modeling_llama import`（含 qwen2、qwen3、mistral） | `grep -rl` Transformers 5.21.0 | 已核对 |
| llama3 RoPE 缩放算法 | 波长 > original/low_freq_factor（8192）→ inv_freq/factor；波长 < original/high_freq_factor（2048）不变；中间按 smooth_factor 线性插值 | modeling_rope_utils.py 649–660 行 | 已读源码 |
| Qwen1.5-MoE-A2.7B 参数 | 按 config 计算 14.32B 总 / 2.69B 激活 | 本地计算 | 与官方 14.3B/2.7B 一致 |
| Qwen3-30B-A3B 专家占比 | 每专家 4,718,592；每层 6.04 亿；48 层 290 亿，占 30.5B 的 95% | 本地计算 | 正确 |
| Qwen3NextRMSNorm 初始化 | weight 初始化为 zeros，输出乘 (1+weight) | modeling_qwen3_next.py 126–139 | 已读 |
| Qwen3-Next MTP 使用 | 模型卡：MTP 在 Transformers 中不可用；给出 SGLang `--speculative-algo NEXTN` 与 vLLM 投机解码命令 | Qwen3-Next-80B-A3B-Instruct README | 一致 |
| Qwen3 思考历史 | 多轮历史只保留最终输出、不含思考内容，官方模板已实现；思考模式勿用贪心解码 | Qwen3-8B README | 一致 |
| Qwen3.6 preserve_thinking | “additionally trained to preserve and leverage thinking traces from historical messages” | Qwen3.6-27B README | 一致 |
| 资料助手算例 | 32K token：Qwen2-7B 32768×57,344 B = 1.75 GiB，Qwen3-8B 32768×147,456 B = 4.5 GiB；10 万 token：Qwen3-8B 13.7 GiB、Qwen3-Next 全局层 2.29 GiB、Llama-3.1-8B 12.2 GiB、Llama 4 全局层 4.58 GiB + 块内层上限 8192×147,456 B = 1.125 GiB；8,000 token：Llama 2 7B 3.9 GiB、Llama 3 8B 0.98 GiB | 本地计算 | 正确 |
| 词嵌入占比 | Qwen2.5-0.5B 27.6%（不共享时两表 43.2%，总 630,167,424）；Qwen3-0.6B 26.1%；Llama-3.2-1B 21.3%（不共享时两表 35.1%）；Qwen3-8B 每表 7.6%；Qwen2.5-0.5B 非嵌入参数 357,898,112，输出层约占每 token 计算 27.6% | 本地计算 | 正确 |

## 与简报的差异

- 简报数字（Llama-3.1-8B 配置、Qwen2.5-0.5B 配置）全部核对一致。
- 简报章节表 14 篇写“Qwen2/2.5/3/3-MoE/3-Next/3.5”，实际官方已发布到 Qwen3.6（2026-04）和 Qwen3.8（2026-08），且 `qwen4_exp` 对应已发布的 Qwen3.8-Flash-Next；正文按实际发布写。

## 未写或保留的点

- 第三方博客提及 Meta 2026 年其他品牌模型，未在官方仓库或 Meta 官方页面核实，不写。
- Llama 4 MoE 的负载均衡训练方式（config 有 router_aux_loss_coef 0.001，但官方未说明训练是否使用）不写。
- Qwen2→Qwen3 KV 头从 4 增到 8 的原因，官方报告未解释，正文只陈述事实与代价。
- Qwen3.5/3.8 视觉编码器细节归 17 篇，本篇只点到“早期融合 + Qwen3-VL 编码器”。
