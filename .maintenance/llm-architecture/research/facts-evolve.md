# facts-evolve：10 MoE / 11 长上下文与高效注意力 / 12 线性注意力与混合架构

核对日期：2026-10-28。Transformers 源码：本机 `scratchpad/venv-mlx/.../transformers`，`__version__ = "5.21.0"`（下称 TF）。config 用 `curl -sL https://huggingface.co/<repo>/resolve/main/config.json` 拉取，原件在 scratch `arch/evolve/cfg/`。数值脚本：scratch `arch/evolve/calc_moe.py`、`calc_toy.py`、`calc_bias.py`、`calc_long.py`、`calc_hybrid.py`、`calc_linear.py`（输出见下）。

## 10. MoE

| 事实 | 数值 | 来源 | 结论 |
| --- | --- | --- | --- |
| Mixtral-8x7B config | hidden 4096、32 层、32 Q 头 / 8 KV 头、intermediate 14336、8 专家选 2、vocab 32000、router_aux_loss_coef 0.02、max_position 32768、不共享词嵌入 | mistralai/Mixtral-8x7B-v0.1 config.json | 已核 |
| Mixtral 总参数 | 46,702,792,704（手算）；checkpoint index total_size 93,405,585,408 字节 /2 = 46,702,792,704 | calc_moe.py；model.safetensors.index.json | 完全一致 |
| Mixtral 激活参数 | 12,879,925,248（含词嵌入、输出层）；论文口径 47B/13B | calc_moe.py；arXiv 2401.04088 摘要 | 一致 |
| Mixtral 每层注意力 / 每专家 | 41,943,040 / 176,160,768（与 Llama-3.1-8B 每层 FFN 相同） | calc_moe.py | 已核 |
| Mixtral 路由 | `MixtralTopKRouter`：线性层 → softmax(全部 8 个) → topk → 除以 top-k 之和 | TF mixtral/modeling_mixtral.py L95-110 | 已核 |
| 辅助损失实现 | `load_balancing_loss_func`：N × Σ f_i·P_i（Switch 公式） | TF mixtral L474-541 | 已核 |
| Mixtral 路由分析 | 按主题（arXiv、PubMed、PhilPapers）未见明显专家分工，DM Mathematics 略有差异；更贴近句法；高层连续 token 重复分配到同一专家的比例显著高于随机，作者指出这会在专家并行时造成过载 | arXiv 2401.04088 HTML 第 5 节 | 已核 |
| DeepSeek-V3 config | hidden 7168、61 层、前 3 层稠密（first_k_dense_replace 3，intermediate 18432）、256 路由专家 + 1 共享、选 8、moe_intermediate 2048、scoring_func sigmoid、topk_method noaux_tc、n_group 8、topk_group 4、norm_topk_prob true、routed_scaling_factor 2.5、vocab 129280、q_lora 1536、kv_lora 512、rope 64 | deepseek-ai/DeepSeek-V3 config.json | 已核 |
| DeepSeek-V3 总参数 | 671,026,404,352（不含 MTP；路由器 e_score_correction_bias 是 buffer，不计入，与 15 篇口径一致） | calc_moe.py | 与官方 671B 一致 |
| DeepSeek-V3 激活参数 | 37,552,282,624（含词嵌入和输出层各 926,679,040）；不含则 35,698,924,544 | calc_moe.py | 与官方 37B 一致 |
| DeepSeek-V3 分解 | 注意力合计 11.41B、激活路由专家 20.43B、共享专家 2.55B、稠密 FFN 1.19B；路由专家总 653.9B（占 97.4%） | calc_moe.py | 估算口径已注明 |
| DeepSeek-V3 路由实现 | `DeepseekV3TopkRouter`：sigmoid → 加 e_score_correction_bias 仅用于选择 → 分 8 组、每组取 top-2 之和选 4 组 → 组内 topk 8 → 权重取原始 sigmoid 分数、归一化、×2.5；共享专家输出直接相加 | TF deepseek_v3/modeling_deepseek_v3.py L120-158、L201-221 | 已核 |
| 无辅助损失均衡 | 偏置只用于路由选择，门控值用原分数；每步按负载 ±γ；γ=0.001（前 14.3T token），最后 500B token 为 0；补充序列级平衡损失 α=0.0001；每 token 最多发往 M=4 个节点；路由专家分布在 8 节点 64 卡；训练不丢 token，推理部署也保证不丢 | arXiv 2412.19437 HTML | 已核 |
| Loss-Free Balancing | Wang 等，arXiv 2408.15664（2024-08），专家级偏置加在 top-K 前，按近期负载更新；大辅助损失的梯度干扰训练 | arXiv 摘要 | 已核 |
| DeepSeekMoE | 细粒度切分（mN 个专家选 mK）+ 共享专家隔离（K_s 个常开）；arXiv 2401.06066 | 摘要 | 已核；正文 16 选 2=120 种、64 选 8=4,426,165,368 种组合由 calc_toy.py 计算 |
| Qwen3-235B-A22B config | hidden 4096、94 层、64 Q 头 / 4 KV 头、head_dim 128、128 专家选 8、moe_intermediate 1536、无共享专家、norm_topk_prob true、router_aux_loss_coef 0.001、vocab 151936、不共享词嵌入 | Qwen/Qwen3-235B-A22B config.json | 已核 |
| Qwen3-235B 参数 | 总 235,093,634,560（与 index total_size/2 完全一致）；激活 22,190,763,520 | calc_moe.py | 一致 |
| Qwen3 MoE 设计 | 128 专家激活 8；不用共享专家（区别于 Qwen2.5-MoE）；global-batch 负载均衡损失 | arXiv 2505.09388 | 已核 |
| Qwen3.5-397B-A17B config | text_config：60 层（45 linear_attention + 15 full_attention，full_attention_interval 4）、hidden 4096、512 专家选 10、moe_intermediate 1024、shared_expert_intermediate 1024、router_aux_loss_coef 0.001、vocab 248320、注意力 32 Q / 2 KV、head_dim 256、attn_output_gate true、partial_rotary 0.25、mamba_ssm_dtype float32、max_position 262144 | Qwen/Qwen3.5-397B-A17B config.json | 已核 |
| Qwen3.5-397B 参数 | 文本部分总 396,346,350,336、激活 17,349,040,896（不含视觉编码器、MTP）；checkpoint 403,397,937,584（含视觉和 MTP） | calc_moe.py；index total_size | 与 397B/17B 一致 |
| Qwen3.5 模型卡 | 15 × (3 × (Gated DeltaNet → MoE) → 1 × (Gated Attention → MoE))；512 专家，10 路由 + 1 共享；原生 262,144，可扩到 1,010,000；带视觉编码器；引用条目 2026 年 2 月 | huggingface.co/Qwen/Qwen3.5-397B-A17B | 已核 |
| Qwen3.5 路由 | `Qwen3_5MoeTopKRouter` softmax → topk → 归一化；共享专家输出乘 sigmoid(shared_expert_gate(x)) 后相加 | TF qwen3_5_moe/modeling_qwen3_5_moe.py L872-911 | 已核 |
| 专家容量与丢 token | 容量 = 每批 token / 专家数 × 容量因子；溢出 token 跳过计算经残差传到下一层；辅助损失 α·N·Σf_i·P_i，α=10⁻² | Switch Transformer arXiv 2101.03961 | 已核 |
| 路由坍缩 | 门控网络倾向于总给同几个专家大权重，且自我强化（被偏爱的专家训练得更快） | Shazeer 等 arXiv 1701.06538 第 4 节 | 已核 |
| 玩具算例 | logits [2,1,0.5,-1]：softmax [0.609,0.224,0.136,0.030]，top-2 归一化 [0.731,0.269]；sigmoid [0.881,0.731,0.622,0.269]，归一化 [0.546,0.454]，×2.5 → [1.366,1.134]；容量：8 token 选择 [E1,E1,E1,E2,E1,E3,E1,E4]，因子 1.0 丢 t3/t5/t7，1.25（容量 3）丢 t5/t7；辅助损失项均衡 1.0、偏斜 1.6、全坍缩 4 | calc_toy.py | 教学数据 |
| 偏置调整模拟 | γ=0.05，负载 [7,1,0,0] → [3,3,1,1] → [3,2,2,1]，此后在均衡附近摆动 | calc_bias.py | 教学数据 |
| 批内触及的专家比例 | 假设路由均匀独立：DeepSeek-V3 每层批 8 / 32 / 64 个 token 时约 22.4% / 63.8% / 86.9% 的专家被用到；Mixtral 批 8 时 90% | python 一行计算 | 估算，非实测 |
| 权重体积 | Mixtral BF16 93.4 GB（87.0 GiB）；Qwen3-235B BF16 470.2 GB；DeepSeek-V3 FP8 约 671 GB（每参数 1 字节估算，不含缩放因子） | 计算 | 估算 |

## 11. 长上下文与高效注意力

| 事实 | 数值 | 来源 | 结论 |
| --- | --- | --- | --- |
| Llama-3.1-8B 注意力 FLOPs | 每 token 每层 4 × L × 4096；32 层：8K 4.29 G，128K 68.72 G；权重部分 2 × 8,030,261,248 = 16.06 G | calc_long.py，口径按简报 | 估算 |
| 128K Prefill | 权重部分 2.105 PFLOPs，注意力（因果、下三角）4.504 PFLOPs，占 68.1%；8K 时注意力占 11.8% | calc_long.py | 估算 |
| KV | 8K 1 GiB，128K 16 GiB（128 KiB/token） | 简报 + calc_long.py | 一致 |
| 单头分数矩阵 | 128K 时 131072² × 2 字节 = 32 GiB | calc_long.py | 估算 |
| FlashAttention | 不改数学、在线 softmax、不写出 N×N 矩阵；细节在 ../llm-inference/12-attention-kernels.md | 站内已有页 | 链接 |
| Mistral 7B 滑动窗口 | v0.1 config sliding_window 4096；v0.2、v0.3 为 null（max_position 32768） | unsloth/mistral-7b（镜像）、mistralai/Mistral-7B-Instruct-v0.1/v0.2/v0.3 config | 已核；Mistral 官方 v0.1 base 仓库需登录，用镜像 |
| Mistral 理论感受野 | 32 层 × 4096 = 131,072；滚动缓冲 512 MiB | 计算 | 估算 |
| Gemma 3 27B | 62 层、sliding_window 1024、sliding_window_pattern 6（(i+1)%6==0 为全局），16 KV 头 × 128、全局 rope_theta 1e6、局部 rope_local_base_freq 1e4、128K | unsloth/gemma-3-27b-it config.json（Google 官方仓库需登录）；TF gemma3/configuration_gemma3.py L106-111 | 已核 |
| Gemma 3 报告 | 5:1 局部/全局、窗口 1024；全局-only 时 KV 约 60% 额外开销，1:3 + 1024 窗口时低于 15%（这是消融设置，不是最终 5:1）；7:1 对困惑度影响也很小 | arXiv 2503.19786 | 已核 |
| Gemma 3 27B KV | 128K：10 全局层 10.0 GiB + 52 局部层 0.41 GiB = 10.41 GiB；全部全局 62 GiB（16.8%）；8K：1.03 vs 3.88 GiB | calc_long.py | 估算 |
| gpt-oss | 120b：36 层、20b：24 层；layer_types 奇偶交替 sliding/full；sliding_window 128；8 KV 头 × 64；rope yarn factor 32、原始 4096 | openai/gpt-oss-120b、20b config.json | 已核 |
| gpt-oss sinks | 每个注意力头一个可学习参数 `sinks`，拼到注意力 logits 后做 softmax，再丢掉这一列 | TF gpt_oss/modeling_gpt_oss.py L243-251、L285 | 已核 |
| gpt-oss-120b KV | 128K：18 全局层 4.5 GiB + 18 窗口层 4.5 MiB；全部全局 9 GiB | calc_long.py | 估算 |
| StreamingLLM | 初始 token 获得很强注意力，成为“汇聚”；窗口注意力淘汰开头后失效，保留开头 token 的 KV 可恢复；可稳定处理 400 万 token 以上；比滑动窗口重算快至 22.2 倍；预训练加占位汇聚 token 更好 | arXiv 2309.17453 摘要 | 已核（摘要未给“4 个”具体数，正文不写数量） |
| NSA | DeepSeek-AI 与北大等，arXiv 2502.11089；三分支压缩/选择/滑动窗口，sigmoid 门控组合；l=32、d=16、l'=64、n=16（含 1 个开头块、2 个本地块）、w=512；64K 时前向至 9.0×、反向 6.0×、解码 11.6×（解码为按访存量的预期值） | arXiv HTML | 已核 |
| DSA 机制 | 索引分数 I_{t,s} = Σ_j w_{t,j}·ReLU(q_{t,j}·k_s)；每个查询选 2048 个；核心注意力 O(L²)→O(Lk)，索引器仍 O(L²) 但头少、可 FP8；基于 MLA 的 MQA 模式；训练：稠密预热只训索引器 1000 步 ×16×128K ≈ 2.1B token（KL 对齐主注意力），再稀疏训练 15000 步 × 480 × 128K ≈ 943.7B token | arXiv 2512.02556 HTML | 已核 |
| DSA 源码 | `DeepseekV32Indexer`：wq_b 从 q_lora 残差投影、wk 单头 key + LayerNorm、weights_proj 每头权重；score = ReLU(q·k)×scale，按头加权求和，因果掩码后 topk；indexer 有自己的 key 缓存（update_indexer）；HF 实现用 BF16 计算，官方实现有 Hadamard 和 FP8 | TF deepseek_v32/modeling_deepseek_v32.py L147-270 | 已核 |
| V3.2 config | index_n_heads 64、index_head_dim 128、index_topk 2048、max_position 163840；V3.2-Exp 相同 | deepseek-ai/DeepSeek-V3.2、-Exp config.json | 已核 |
| V3.2-Exp | 在 V3.1-Terminus 基础上，训练配置对齐；基准与 V3.1-Terminus 持平（个别高低） | github.com/deepseek-ai/DeepSeek-V3.2-Exp | 已核 |
| DSA 成本估算 | 每查询每层：稠密 MLA（吸收后 128 头 × (576+512)）128K 时 36.5 GFLOPs；索引器 64 头 × 128 维 2.15 G + 稀疏核心 0.57 G = 2.72 G，约 13×；8K 时约 3.2× | calc_long.py | 估算，不是官方实测 |
| 后续采用 | TF 中 glm_moe_dsa、glm5_next（配置有 index_topk/index_n_heads）和 deepseek_v4（sliding / compressed_sparse / heavily_compressed 三种层，含 Indexer）也用了索引器式稀疏注意力 | TF 源码类名与配置 docstring | 只在正文一句带过，细节交 15、16 篇 |
| DeepSeek-V4-Flash-Base config | compress_ratios：0（滑动窗口）×3、4（compressed_sparse）×21、128（heavily_compressed）×20；sliding_window 128、index_topk 512；num_hidden_layers 43（compress_ratios 共 44 项，推测含 MTP 层） | deepseek-ai/DeepSeek-V4-Flash-Base config.json；TF deepseek_v4/configuration_deepseek_v4.py | 只在 11 篇一句带过 |
| GLM-5 config | glm_moe_dsa、index_topk 2048、index_n_heads 32、index_head_dim 128 | zai-org/GLM-5 config.json | 已核 |
| RULER | 原版 NIAH 只测表层检索；13 个任务，新增多跳追踪与聚合；17 个模型声称 ≥32K，只有约一半在 32K 保持满意表现 | arXiv 2404.06654 | 已核 |
| Lost in the Middle | 相关信息在开头或结尾时最好，在中间显著变差（U 形）；多文档问答与键值检索 | arXiv 2307.03172 | 已核 |

## 12. 线性注意力、SSM 与混合架构

| 事实 | 数值 | 来源 | 结论 |
| --- | --- | --- | --- |
| 玩具矩阵 | K=[1,0],[0,1],[0.6,0.8]；V=[5,1],[2,4],[0,6]；S=Σv·kᵀ；两步后 S=[[5,2],[1,4]] 读回精确；三步后 S=[[5,2],[4.6,8.8]]，读回 [5,4.6]、[2,8.8]、[4.6,9.8]；delta 规则（β=1）三步后读回 k3 精确 [0,6]，k1→[2.24,2.32]、k2→[-1.68,5.76] | calc_linear.py | 教学数据 |
| Mamba | Gu & Dao，arXiv 2312.00752（2023-12）：SSM 参数随输入变化（选择性）；推理吞吐约 5×；线性随长度；3B 与两倍大小 Transformer 相当 | 摘要 | 已核 |
| Mamba-2 | Dao & Gu，arXiv 2405.21060（2024-05，ICML 2024）：SSD 框架把 SSM 和注意力变体统一为半可分矩阵的分解；核心层快 2—8× | 摘要 | 已核 |
| Gated DeltaNet | Yang、Kautz、Hatamizadeh，arXiv 2412.06464（ICLR 2025）：门控快速擦除 + delta 规则精确更新；优于 Mamba2、DeltaNet；可与滑动窗口或 Mamba2 混合 | 摘要 | 已核 |
| GDN 源码 | `Qwen3_5MoeGatedDeltaNet`：in_proj_qkv、z、b（β=sigmoid）、a（g=-exp(A_log)·softplus(a+dt_bias)）；短卷积 kernel 4；q/k L2 归一化；递归：S←S·exp(g)，kv_mem=S·k，delta=(v−kv_mem)·β，S←S+k⊗delta；状态形状 [batch, v_heads, k_dim, v_dim] | TF qwen3_5_moe L492-640、torch_recurrent_gated_delta_rule | 已核 |
| 纯线性召回弱 | Jelassi 等 arXiv 2402.01032：两层 Transformer 可复制指数长度串，GSSM 受固定状态限制；预训练模型中 Transformer 在复制和检索上远强 | 摘要 | 已核 |
| Zoology | Arora 等 arXiv 2312.04927：门控卷积与注意力的困惑度差最多 2.1，其中 82% 由关联召回解释；70M 注意力模型在召回上胜过 1.4B 门控卷积；输入相关稀疏注意力的混合能补上 97.4% 的差距 | 摘要 | 已核 |
| Jamba v0.1 config | 32 层、attn_layer_period 8、offset 4（第 4、12、20、28 层，0 起）、expert_layer_period 2 offset 1（16 层 MoE）、16 专家选 2、8 KV 头、mamba_d_state 16、d_conv 4、expand 2、max_position 262144 | ai21labs/Jamba-v0.1 config.json；TF jamba/configuration_jamba.py L109-117 | 已核 |
| Jamba 论文 | 注意力:Mamba = 1:7；每 2 层一个 MoE（16 选 2）；52B 总 / 12B 激活；单张 80GB 卡；256K 时 KV：Llama-2 128GB、Mistral 32GB、Mixtral 32GB、Jamba 4GB；纯 Mamba 在 IMDB 少样本格式上失败（48.8 vs 注意力 84.1、混合 90.9），作者称是 anecdotal 证据 | arXiv 2403.19887 HTML | 已核；我们按 config 算 256K 为 4.0 GiB KV，与论文一致 |
| Nemotron-H | hybrid_override_pattern：M=Mamba2（TF 映射为 linear_attention → NemotronHMamba2Mixer）、*=注意力、-=MLP、E=MoE；每个字符是独立块 | TF nemotron_h/configuration_nemotron_h.py L169-281、modeling L923-954 | 已核 |
| Nemotron-H-8B-Base-8K | 52 块：24 M + 4 * + 24 -；mamba 128 头 × 64、state 128、8 组；max_position 8192 | config.json | 已核；128K 只做假设性对比，正文改用 Nano-9B-v2 |
| Nemotron-H-56B | 118 块：54 M + 10 * + 54 - | config.json | 已核 |
| NVIDIA-Nemotron-Nano-9B-v2 | 56 块：27 M + 4 * + 25 -；max_position 131072；8 KV 头 × 128 | config.json | 已核 |
| Nemotron-3-Nano-30B-A3B | 52 块：23 M + 6 * + 23 E；128 路由专家选 6 + 1 共享；max_position 262144；mamba_ssm_cache_dtype float32 | nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16 config.json | 已核 |
| Nemotron-H 论文 | 多数注意力换成 Mamba；8B、56B、47B（MiniPuzzle 压缩）；推理最多快 3×（作者口径）；与 Qwen-2.5、Llama-3.1 同级 | arXiv 2504.03624 摘要 | 已核 |
| Kimi Linear config | 27 层；full_attn_layers（1 起）[4,8,12,16,20,24,27] 共 7 层 MLA（kv_lora 512、rope 64、mla_use_nope）；kda_layers 20 层；KDA 32 头 × 128、short_conv 4；256 专家选 8 + 1 共享、sigmoid；first_k_dense_replace 1；model_max_length 1048576 | moonshotai/Kimi-Linear-48B-A3B-Instruct config.json；TF kimi_linear/configuration_kimi_linear.py L129-136（1 起转 0 起） | 已核 |
| KDA 源码 | 注释：与 GDN 基本相同，但衰减按通道（每维一个）而不是每头一个标量；`KimiLinearForgetGate` 输出 qkv_dim 维；全注意力层是带 NoPE 的 MLA | TF kimi_linear/modeling_kimi_linear.py L190-192、L316-340、L569-572 | 已核 |
| Kimi Linear 论文 | 48B 总 / 3B 激活；KV 最多减 75%；1M 上下文解码吞吐最多 6×；同训练配方下全面优于全 MLA（作者口径） | arXiv 2510.26692 摘要 | 已核；3:1 比例来自 config 计数（20:7） |
| Qwen3-Next-80B-A3B | 48 层，full_attention_interval 4（36 GDN + 12 门控注意力），512 专家选 10 + 1 共享，16 Q / 2 KV × 256；官方博客：3:1，80B/3B，32K 以上吞吐约 10× | config.json；Qwen 官方博客 | 已核 |
| Qwen3.5-35B-A3B | 40 层 = 30 GDN + 10 full；GDN 16 K 头 / 32 V 头 × 128；2 KV × 256 | config.json | 已核 |
| 缓存估算（单请求） | 状态按 FP32、卷积缓存按 BF16、KV 按 BF16：Llama-3.1-8B 128K 16.00 GiB；Qwen3.5-35B-A3B 20 KiB/token、状态 61.9 MiB，128K 2.56 GiB；Qwen3.5-397B 30 KiB/token、状态 184.2 MiB，128K 3.93 GiB；Qwen3-Next 24 KiB/token、74.2 MiB，3.07 GiB；Kimi Linear 7.88 KiB/token、41.9 MiB，1.03 GiB；Jamba 16 KiB/token、15.8 MiB，2.02 GiB（256K 4.02 GiB）；Nano-9B-v2 16 KiB/token、137.5 MiB，2.13 GiB | calc_hybrid.py | 估算；状态 dtype 各实现不同（Qwen3.5 config mamba_ssm_dtype=float32），BF16 存时状态减半 |
| 每层 GDN 状态 | Qwen3.5-397B：64 V 头 × 128 × 128 × 4 字节 = 4 MiB；35B-A3B：32 头 → 2 MiB | calc_hybrid.py | 估算 |
| 新模型 | TF 中还有 olmo_hybrid（GatedDeltaNet + 注意力）、qwen4_exp（GatedDeltaNet + QSA Indexer）、glm5_next（线性注意力 + DSA 索引器）等混合实现 | TF 源码类名 | 仅存在性确认，正文不展开 |

## 与简报的差异

- 简报数字未发现错误。Llama-3.1-8B 每 token 注意力 4×L×4096 FLOPs/层的口径照用。
- Nemotron-H-8B-Base-8K 的上下文只有 8K，显存对比改用 NVIDIA-Nemotron-Nano-9B-v2（128K）。
- Mistral 滑动窗口只在 7B v0.1 上启用，v0.2 起关闭，正文写明版本。

## 仍不确定

- DSA 的端到端加速只有官方“显著加速”和成本曲线，正文不给具体倍数；文中 13× 为按 FLOPs 的估算。
- 线性层状态的存储精度随推理引擎设置不同，正文按 FP32 估算并注明。
- Qwen3.5 激活参数按 config 手算 17.35B（文本部分），视觉编码器在图像输入时另算。
