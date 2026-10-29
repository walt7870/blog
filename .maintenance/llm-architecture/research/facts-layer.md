# facts-layer：04 多头注意力、05 FFN、06 残差与归一化

核对日期：2026-10-28。数值脚本：scratch `arch/layer/calc.py`（本机 python3）；实测脚本：scratch `arch/layer/probe2.py`（torch 2.14.1、Transformers 5.21.0、CPU、FP32）。scratch 根目录：`<scratch>/arch/layer/`。Transformers 源码路径前缀 `T = <scratch>/venv-mlx/lib/python3.12/site-packages/transformers/models`（版本 5.21.0）。

## 模型配置（HF config.json，2026-10-28 读取）

| 模型 | 来源 | 关键字段 | 结论 |
| --- | --- | --- | --- |
| Llama-3.1-8B | https://huggingface.co/unsloth/Meta-Llama-3.1-8B/raw/main/config.json（Meta 官方仓库需登录，用 unsloth 镜像） | hidden 4096、32 层、32 头、8 KV 头、head_dim 128、intermediate 14336、vocab 128256、rms_norm_eps 1e-5、silu、tie false | 与简报一致 |
| Llama-3.3-70B | https://huggingface.co/unsloth/Llama-3.3-70B-Instruct/raw/main/config.json | hidden 8192、80 层、64 头、8 KV 头、intermediate 28672 | 用于 70B 中间维度验算 |
| Llama-2-7B | https://huggingface.co/NousResearch/Llama-2-7b-hf/raw/main/config.json（镜像） | hidden 4096、intermediate 11008、num_key_value_heads 32 | Llama 2 7B 是 MHA；11008 由 8/3 规则得出 |
| DeepSeek-V3 | https://huggingface.co/deepseek-ai/DeepSeek-V3/raw/main/config.json | hidden 7168、61 层、128 头、kv_lora_rank 512、q_lora_rank 1536、qk_rope_head_dim 64、qk_nope_head_dim 128、v_head_dim 128、intermediate 18432、moe_intermediate 2048、n_routed_experts 256、first_k_dense_replace 3 | 已核对任务要求的 kv_lora_rank、qk_rope_head_dim |
| Kimi-K2-Instruct | https://huggingface.co/moonshotai/Kimi-K2-Instruct/raw/main/config.json | DeepseekV3ForCausalLM、61 层、64 头、kv_lora_rank 512、qk_rope 64 | MLA，头数是 V3 的一半 |
| GLM-5 | https://huggingface.co/zai-org/GLM-5/raw/main/config.json | model_type glm_moe_dsa、78 层、64 头、kv_lora_rank 512、qk_rope 64、qk_nope 192、v_head_dim 256、q_lora_rank 2048、index_topk 2048 | MLA（另有稀疏注意力索引） |
| Mistral-Small-4-119B-2603 | https://huggingface.co/mistralai/Mistral-Small-4-119B-2603/raw/main/config.json | model_type mistral4、36 层、32 头、kv_lora_rank 256、qk_rope 64 | MLA |
| MiniCPM3-4B | https://huggingface.co/openbmb/MiniCPM3-4B/raw/main/config.json | 62 层、40 头、kv_lora_rank 256、qk_rope 32 | MLA |
| Qwen3-8B | https://huggingface.co/Qwen/Qwen3-8B/raw/main/config.json | hidden 4096、36 层、32 头、8 KV 头、head_dim 128、intermediate 12288 | GQA；12288 = 3×4096 |
| Qwen2.5-0.5B-Instruct | https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct/raw/main/config.json | 896、24 层、14 头、2 KV 头、intermediate 4864、tie true | 与简报一致；head_dim = 896/14 = 64 |
| Qwen2.5-7B-Instruct | https://huggingface.co/Qwen/Qwen2.5-7B-Instruct/raw/main/config.json | 3584、28 层、28 头、4 KV 头、intermediate 18944 | 未在正文使用 |
| Mistral-7B-v0.1 | https://huggingface.co/mistralai/Mistral-7B-v0.1/raw/main/config.json | 4096、32 层、32 头、8 KV 头、intermediate 14336、sliding_window 4096 | GQA |
| Falcon-7B | https://huggingface.co/tiiuae/falcon-7b/raw/main/config.json | hidden 4544、71 头、multi_query true、32 层 | MQA；head_dim 64 |
| gpt-oss-20b | https://huggingface.co/openai/gpt-oss-20b/raw/main/config.json | 2880、24 层、64 头、8 KV 头、head_dim 64、sliding_window 128 | GQA |
| Gemma-2-9B | https://huggingface.co/unsloth/gemma-2-9b/raw/main/config.json（google 仓库需登录） | 3584、42 层、16 头、8 KV 头、head_dim 256、intermediate 14336、attn_logit_softcapping 50、final_logit_softcapping 30、gelu_pytorch_tanh | 与 Gemma 2 报告一致 |
| Gemma-3-12B-it | https://huggingface.co/unsloth/gemma-3-12b-it/raw/main/config.json（google 仓库需登录） | attn_logit_softcapping null、final_logit_softcapping null、intermediate 15360 | Gemma 3 不用 soft-capping |
| Gemma-4-31B-it | https://huggingface.co/google/gemma-4-31B-it/raw/main/config.json（公开） | final_logit_softcapping 30.0、hidden 5376、60 层、head_dim 256、num_key_value_heads 16、num_global_key_value_heads 4、sliding_window 1024 | Gemma 4 又在输出层用了 soft-capping，注意力层没有 |

## 源码核对

- `T/llama/modeling_llama.py`：`LlamaMLP.forward = down_proj(act_fn(gate_proj(x)) * up_proj(x))`；`LlamaRMSNorm` 在 float32 下算 `x * rsqrt(mean(x²) + eps)` 再乘 weight（weight 初始化为 1）；`LlamaDecoderLayer` 为 Pre-Norm：`residual + self_attn(input_layernorm(h))`、`residual + mlp(post_attention_layernorm(h))`。注意 `post_attention_layernorm` 名字里有 post，但它位于 FFN 之前，是 Pre-Norm。
- `T/qwen3/modeling_qwen3.py` 229–245 行：`q_norm`、`k_norm` 为 RMSNorm(head_dim)，在 `q_proj/k_proj` 后、RoPE 之前，对每个头的 128 维各自归一化。
- `T/gemma2/modeling_gemma2.py`：`Gemma2RMSNorm` weight 初始化为 0，输出乘 `(1 + weight)`；解码层有 `input_layernorm`、`post_attention_layernorm`、`pre_feedforward_layernorm`、`post_feedforward_layernorm` 四个 Norm，注意力输出先 `post_attention_layernorm` 再加残差（三明治）；注意力分数 `softcap·tanh(score/softcap)`，在加掩码之前；输出层 `logits = cap·tanh(logits/cap)`；`_supports_sdpa = False  # sdpa does not support softcapping`。
- `T/gemma3/modeling_gemma3.py`：同样四个 Norm；增加 `q_norm`、`k_norm`；softcap 代码保留但配置为 null。
- `T/gemma4/modeling_gemma4.py`：解码层四个 Norm；`q_norm`、`k_norm`，另有 `v_norm`（with_scale=False）；Gemma4RMSNorm weight 初始化为 1（与 Gemma 2/3 的 1+w 写法不同）。正文只写“四个 Norm + QK-Norm + 输出层 soft-capping 30”。
- `T/deepseek_v3/modeling_deepseek_v3.py` 349–482 行：`q_a_proj(7168→1536) → q_a_layernorm → q_b_proj(1536→128×192)`；`kv_a_proj_with_mqa(7168→512+64)`，拆为 kv_nope（经 kv_a_layernorm）与 k_rot；k_rot 视为单头、加 RoPE；**缓存写入的是压缩后的 kv_nope(512) 与 k_rot(64)**（注释“Cache read / write is performed while latent KV is still compressed”）；之后 `expand_kv` 用 `kv_b_proj(512→128×(128+128))` 展开再做普通注意力——Transformers 版本缓存压缩向量但不做矩阵吸收。
- DeepSeek 官方推理代码 https://raw.githubusercontent.com/deepseek-ai/DeepSeek-V3/main/inference/model.py：`attn_impl` 默认 `"absorb"`；absorb 分支把 `wkv_b` 的 K 部分用 einsum 乘进 `q_nope`（得到每头 512 维），直接与 `kv_cache`(512) 点积，再加 `q_pe·pe_cache`；加权求和在 512 维上做，最后乘 `wkv_b` 的 V 部分。正文的“矩阵吸收”以此为准。
- 第一个稠密层：DeepSeek-V3 前 3 层（first_k_dense_replace 3）用稠密 MLP（intermediate 18432），其余为 MoE。

## Llama 中间维度 14336 的来历（Meta 源码）

- https://raw.githubusercontent.com/meta-llama/llama3/main/llama/model.py 与 https://raw.githubusercontent.com/meta-llama/llama-models/main/models/llama3/model.py：`FeedForward(dim, hidden_dim=4*dim, multiple_of, ffn_dim_multiplier)`；`hidden_dim = int(2*hidden_dim/3)`；`if ffn_dim_multiplier: hidden_dim = int(ffn_dim_multiplier*hidden_dim)`；`hidden_dim = multiple_of * ceil(hidden_dim/multiple_of)`。
- https://raw.githubusercontent.com/meta-llama/llama-models/main/models/sku_list.py：Llama 3 / 3.1 8B `ffn_dim_multiplier 1.3, multiple_of 1024`；70B `1.3, 4096`。
- 计算：4×4096 = 16384 → ×2/3 取整 10922 → ×1.3 取整 14198 → 向上取 1024 的倍数 14336（=3.5×4096）。70B：32768 → 21845 → 28398 → 28672。Llama 2 7B 无 multiplier、multiple_of 256：10922 → 11008。
- **与任务说明的差异**：14336 不是“约 8/3×4096 再取整”。8/3×4096 = 10922.7，取整到 256 的倍数是 11008（Llama 2 7B）；Llama 3 系列另乘了 ffn_dim_multiplier 1.3，比例到 3.5。正文按源码写。
- sku_list.py 里 Llama 2 条目写着 n_kv_heads 8、rope_theta 500000，与 Llama 2 HF config 不符（疑似复制错误），正文不引用它的 Llama 2 条目。

## 复算数值（calc.py）

- 参数：每层注意力 41,943,040；FFN 176,160,768；两个 RMSNorm 8,192；每层 218,112,000；总计 8,030,261,248。FFN 70.20%、注意力 16.71%、词嵌入+输出层 13.08%、Norm 0.003%。32 层 FFN 共 5,637,144,576；注意力 1,342,177,280。与简报一致。
- 等参数对照：ReLU FFN 4d 两矩阵 2×4096×16384 = 134,217,728；SwiGLU 取 8/3（10922）三矩阵 134,209,536；实际 14336 三矩阵 176,160,768（比等参数版多约 31%）。
- 每 token 矩阵乘计算（每乘加 2 FLOPs，只计矩阵乘；注意力分数每层 4×上下文×4096）：上下文 1：15.01 GFLOPs，FFN 75.1%、投影 17.9%、输出层 7.0%；8192：19.30，FFN 58.4%、分数 22.2%；32768：32.19，FFN 35.0%、分数 53.4%；131072：83.73，FFN 13.5%、分数 82.1%。简报“2×参数量 ≈ 16 GFLOPs”包含词嵌入查表（并非矩阵乘），只计矩阵乘为 15.0 GFLOPs；正文同时说明两种口径。
- KV Cache（BF16）：Llama-3.1-8B MHA 524,288 B（512 KiB）、GQA 131,072（128 KiB）、MQA 16,384（16 KiB）；DeepSeek-V3 MLA 61×576×2 = 70,272 B（68.625 KiB）；DeepSeek-V3 若 128 头 MHA（K 192 维、V 128 维）61×128×320×2 = 4,997,120 B（4.77 MiB，4880 KiB），为 MLA 的 71.1 倍；MLA 每层 576 个数相当于 2.25 组 128 维 KV 头的 K+V。32K 上下文：MHA 16 GiB、GQA 4 GiB、MQA 0.5 GiB、MLA 2.14 GiB。
- 其他模型每 token KV（不计滑动窗口和 MTP 层）：Llama-3.3-70B 320 KiB、Qwen3-8B 144 KiB、Qwen2.5-0.5B 12 KiB、Mistral-7B 128 KiB、Gemma-2-9B 336 KiB、gpt-oss-20b 48 KiB、Falcon-7B 8 KiB、Kimi K2 68.6 KiB、GLM-5 87.75 KiB、Mistral Small 4 22.5 KiB、MiniCPM3-4B 34.9 KiB。
- DeepSeek-V3 每层 MLA 参数 187,107,328（q_a 11.0M、q_b 37.7M、kv_a 4.1M、kv_b 16.8M、o 117.4M、两个 norm）。
- SwiGLU 手算：x=[1,2]；W_g=[[1,0,1],[0,1,-1]]，W_u=[[1,0.5,0],[1,0,2]]，W_d=[[1,0],[0,1],[1,-1]]；gate=[1,2,-1]，SiLU=[0.7311,1.7616,-0.2689]，up=[3,0.5,4]，h=[2.1932,0.8808,-1.0758]，y=[1.1174,1.9566]。
- 激活值：SiLU(-1)=-0.2689、SiLU(-3)=-0.1423、SiLU(1)=0.7311；GELU(tanh 近似)(-1)=-0.1588、(1)=0.8412。SiLU 最小值约 -0.278（z≈-1.28），正文写“约 -0.28”。
- RMSNorm 手算：x=[2,-1,3,0]，均方 3.5，RMS 1.8708（eps 1e-5 影响在第 6 位），输出 [1.069,-0.5345,1.6036,0]；x×10 输出相同。LayerNorm：均值 1、方差 2.5，输出 [0.6325,-1.2649,1.2649,-0.6325]。
- soft-capping：cap 30：10→9.645、30→22.848、60→28.921、200→30.000；cap 50：100→48.201。

## 本机实测（Qwen2.5-0.5B-Instruct，CPU FP32，HF 缓存权重）

- 输入“年假怎么申请？”（无对话模板，5 个 token：年/假/怎么/申请/？），最后位置残差流 L2 范数：词嵌入 0.47，层 0—23（从 0 数）之后依次 4.8、8.7、7.9、9.2 … 层 20 52.2、层 21 72.6、层 22 76.1、层 23 58.1；最终 RMSNorm 后 312.3（norm weight 平均 7.14）。注意力输出范数 0.4—13.4；FFN 输出 3.0—18.8，层 23 为 77.1。Gemma 2/3 RMSNorm 为 (1+w)、w 初始化 0；Gemma 4 为 w、初始化 1（`T/gemma3/modeling_gemma3.py` 139/148 行，`T/gemma4/modeling_gemma4.py` 206–212 行）。OLMo 2（`T/olmo2/modeling_olmo2.py`）：无子层前 Norm，`h + post_attention_layernorm(attn(h))`、`h + post_feedforward_layernorm(mlp(h))`，q_norm/k_norm 作用于整个投影。实践篇（主编）用带对话模板的 25 token 输入测了同类曲线，正文链接实践篇，不重复画图。
- 事实提示“法国的首都是巴黎，中国的首都是”：基线 P(北京)=0.777。逐层把 FFN 输出清零：第 0 层→0.000（预测变成“&”）、第 2 层→0.001（预测“巴黎”）、第 23 层→0.006；第 11 层 0.161、第 12 层 0.366、第 18 层 0.395；其余多在 0.45—0.95，第 4、14 层反而升到 0.95、0.93。第二个提示“日本的首都是东京，中国的首都是”趋势相同（基线 0.870）。只测一个模型、两个提示；清零会把激活推离训练分布。正文作为“单层定位不了知识”的示例，并注明条件。

## 论文与官方资料（结论与边界）

- MQA：Shazeer 2019，arXiv 1911.02150，提出所有头共享一组 K、V，增量解码显存读取大减，质量略降。
- GQA：Ainslie 等 2023，arXiv 2305.13245：用原预训练约 5% 的算力把 MHA 检查点“上训”为 GQA；GQA 质量接近 MHA、速度接近 MQA；MQA 有质量下降与训练不稳定。
- Llama 2 论文（arXiv 2307.09288）附录：30B 规模消融中 GQA 与 MHA 大多数任务相当、平均好于 MQA；34B 与 70B 采用 GQA。
- MLA：DeepSeek-V2 技术报告 arXiv 2405.04434：低秩联合压缩 KV、解耦 RoPE（RoPE 与位置相关，挡住了把 W_UK 吸收进 W_Q 的路，所以另开 64 维带 RoPE 的 q/k，k 部分所有头共享）、推理时吸收；附录对比实验报告 MLA 效果优于 MHA（DeepSeek 自报，未见独立大规模复现，正文写“报告”）。
- 头的分工与冗余：Voita 等 2019，arXiv 1905.09418（少数专门化的头承担主要作用，其余可剪）；Michel 等 2019，arXiv 1905.10650（测试时去掉大量头影响很小）；Olsson 等 2022，arXiv 2209.11895（induction heads）。
- GLU 变体：Shazeer 2020，arXiv 2002.05202：GEGLU/SwiGLU 等在 T5 上困惑度更低；为保持参数和计算不变把 d_ff 缩为 2/3（3072→2048）；论文没有给出为何有效的理论解释。
- LLaMA 1（arXiv 2302.13971）：采用 SwiGLU，维度用 2/3·4d 而非 PaLM 的 4d。
- 键值记忆：Geva 等 2021（EMNLP），arXiv 2012.14913：在 WikiText-103 上训练的 16 层语言模型里，键与可读的输入模式相关（低层偏表层模式、高层偏语义），高层值向量的输出分布与触发样本的下一个词吻合；FFN 输出是多个记忆的组合，再与残差合成。后续 arXiv 2203.14680（2022）在词表空间解释 FFN 更新。
- 知识神经元：Dai 等 2022（ACL），arXiv 2104.08696：在 BERT 上用积分梯度定位与事实相关的 FFN 中间单元，抑制/增强会改变事实概率。
- ROME：Meng 等 2022，arXiv 2202.05262：GPT-2 XL、GPT-J 上因果追踪显示主语最后一个 token 处的中间层 MLP 对事实回忆影响大；秩一编辑可改写单条事实。
- 局限：Hase 等 2023（NeurIPS），arXiv 2301.04213：因果追踪定位到的层与编辑效果最好的层基本无关；Niu 等 2024（ICLR），arXiv 2405.02421：知识神经元论题过度简化；Cohen 等 2023，arXiv 2307.12976：编辑后相关事实（连锁影响）常不同步；Geva 等 2023，arXiv 2304.14767：事实回忆中注意力负责从主语位置提取属性，FFN 并非唯一参与者；Elhage 等 2022 “Toy Models of Superposition”：单个神经元常多义。
- Pre-LN：Xiong 等 2020，arXiv 2002.04745：Post-LN 初始化时靠近输出层梯度大，需要学习率预热；Pre-LN 梯度随层更均匀，可去掉预热。GPT-2 报告把 LayerNorm 移到每个子块输入，并在最后加一个 LayerNorm；残差层初始化按 1/√N 缩放（N 为残差层数）。
- DeepNet：Wang 等 2022，arXiv 2203.00555：DeepNorm 让 Post-LN 训到 1000 层。
- 深层贡献变小：Sun 等 2025 “The Curse of Depth in Large Language Models”，arXiv 2502.05795：Pre-LN 下深层输出方差增长，导致很多深层接近恒等；正文只写“有研究报告”，不作定论。
- RMSNorm：Zhang & Sennrich 2019，arXiv 1910.07467：去掉减均值，只按均方根缩放，效果与 LayerNorm 相当、计算更省。
- QK-Norm：Dehghani 等 2023（ViT-22B），arXiv 2302.05442；Wortsman 等 2023，arXiv 2309.14322（注意力 logit 增长导致发散，qk-layernorm 缓解）；Qwen3 技术报告 arXiv 2505.09388：去掉 Qwen2 的 QKV bias，引入 QK-Norm 保证训练稳定。
- Gemma 2 报告 arXiv 2408.00118：注意力 soft-cap 50、最终 30，前后都做 RMSNorm；Gemma 3 报告 arXiv 2503.19786：用 QK-norm 替代 Gemma 2 的 soft-capping。

## 不确定或未写入正文

- MLA 与 MHA 的质量对比只有 DeepSeek 自报；正文用“报告”。
- Gemma 4 的 v_norm、K=V 共享（attention_k_eq_v）等新设计未展开，留给第 16 篇。
- FlashAttention 后来支持 softcap 参数（2.6 版起，凭记忆未核对一手），正文只写 Transformers 源码中 SDPA 不支持 soft-capping 这一可核对事实。
