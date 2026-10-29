# facts-families-b：15-deepseek.md、16-open-models.md 核对记录

核对日期 2026-10-28。Transformers 源码指本机 5.21.0：`<scratch>/venv-mlx/lib/python3.12/site-packages/transformers/models/`（下文简写为 `T/`）。配置用 `curl -sL https://huggingface.co/<repo>/raw/main/config.json` 下载，复算脚本在 scratch 目录 `arch/families-b/scripts/`（`ds_params.py`、`v4_params.py`），没有 torch，参数量按 config 字段和源码里各模块的形状手写公式。

## 15. DeepSeek

### 发布日期与许可证

| 事实 | 值 | 来源 | 结论 |
| --- | --- | --- | --- |
| V2 发布 | 2024-05（HF 仓库 2024-04-22 创建，论文 arXiv 2405.04434） | https://huggingface.co/api/models/deepseek-ai/DeepSeek-V2 | 正文写 2024 年 5 月 |
| V2 许可证 | license: other / deepseek（模型许可），代码 MIT | V2 README front matter | 一致 |
| V3 发布 | 2024-12（HF 2024-12-25 创建，论文 2412.19437） | HF API | 一致 |
| V3 许可证 | 代码 MIT，模型 Model Agreement | V3 README 徽章 | 一致；V3-0324 的 MIT 未能用 API 核对，正文不写 |
| R1 发布 | 2025-01-20，MIT | https://api-docs.deepseek.com/news（新闻列表）；HF API license mit | 一致 |
| V3.1 发布 | 2025-08-21；V3.1 Update（Terminus）2025-09-22 | DeepSeek 新闻列表；HF API | 一致 |
| V3.2-Exp / V3.2 | 2025-09-29 / 2025-12-01，MIT；技术报告 arXiv 2512.02556（2025-12-02） | 新闻列表、HF API、arXiv | 一致 |
| V4 预览 | 2026-04-24；技术报告 arXiv 2606.19348（2026-04-26 提交）；MIT | 新闻列表 news260424、HF README、arXiv 摘要 | 一致 |
| V4-Pro 正式版 | 2026-08-13，页面未提结构变化 | https://api-docs.deepseek.com/news/news260813 | 正文只写正式上线 |
| V4.1-Flash | 2026-09-10 发布，MIT，模型卡描述 CED、CSA2、Engram、DSpark；`model_type: deepseek_v41` | 新闻列表、HF README、config | 本机 Transformers 5.21.0 无 `deepseek_v41` 目录，正文只一句带过 |

### 配置差异（逐项 diff）

- R1 与 V3 的 config.json：除 transformers_version / auto_map 外**完全相同**（脚本 diff 结果 `{}`）。
- V3.1 与 V3：只有 `quantization_config.scale_fmt: ue8m0`。V3.1 README：32K 扩展阶段 630B token（10 倍），128K 阶段 209B token（3.3 倍）；混合思考靠对话模板，非思考在 Assistant 后直接放 `</think>`。
- V3.1-Terminus：多一个空列表 `attn_module_list_cfg`。
- V3.2-Exp / V3.2：新增 `index_head_dim` 128、`index_n_heads` 64、`index_topk` 2048，`model_type` deepseek_v32，scale_fmt ue8m0；其余同 V3。

### V2 / V3 关键字段

| 字段 | V2 | V3 |
| --- | --- | --- |
| hidden_size / layers / heads | 5120 / 60 / 128 | 7168 / 61 / 128 |
| kv_lora_rank / q_lora_rank / qk_rope / qk_nope / v_head | 512 / 1536 / 64 / 128 / 128 | 同 |
| n_routed / n_shared / top-k | 160 / 2 / 6 | 256 / 1 / 8 |
| moe_intermediate / intermediate | 1536 / 12288 | 2048 / 18432 |
| first_k_dense_replace | 1 | 3 |
| scoring / topk_method | softmax / group_limited_greedy | sigmoid / noaux_tc |
| n_group / topk_group | 8 / 3 | 8 / 4 |
| routed_scaling_factor | 16.0 | 2.5 |
| vocab | 102400 | 129280 |
| num_nextn_predict_layers | 无 | 1 |
| quantization_config | 无（BF16） | fp8 e4m3，block 128×128 |

### 参数复算（`ds_params.py`）

- V2 总参数 235,741,434,880 —— 与 HF API `safetensors.total` 235,741,434,880 **完全相同**，验证了公式。
- V3 主模型总参数 671,026,404,352；激活 37,552,282,624（含词嵌入和输出层），去掉输入词嵌入 36,625,603,584。
  - 每层 MLA 187,107,328；每个专家 44,040,192；路由专家合计 653,908,770,816（97.4%）；3 层密集 FFN 1,189,085,184；词嵌入+输出层 1,853,358,080；共享专家激活 2,554,331,136；8 个路由专家激活 20,434,649,088。
  - MTP 模块（enorm、hnorm、eh_proj 2h→h、一个 MLA+MoE 块、norm）11,610,067,968；HF 总数 684,489,845,504 = 主模型 + MTP 模块 + 检查点里 MTP 单独存的一份 embed/head（2×926,679,040）+ 59 个 MoE 层的 FP32 偏置 15,104（59×256）。逐项相加与 HF 总数完全一致。
  - 官方口径：技术报告 671B / 37B；README_WEIGHTS.md 写主模型激活 36.7B（含 0.9B 词嵌入和 0.9B 输出头）、MTP 11.5B unique；README 写 HF 总量 685B = 671B + 14B MTP。复算激活 37.55B 与 36.7B 相差约 0.85B，**未能确定官方具体口径**，正文写“差几亿，来自统计口径”。
- V3.2：每层多一个索引器 13,959,424，总 671,877,929,216。HF 总 685,355,329,792。

### MLA KV Cache

- V3：61 × (512+64) × 2 = 70,272 B = 68.625 KiB/token；V2：60 × 576 × 2 = 69,120 B。
- 同结构的 MHA（K 192、V 128，128 头）：61 × 128 × 320 × 2 = 4,997,120 B；GQA-8（128+128）：61 × 2 × 8 × 128 × 2 = 249,856 B；Llama-3.1-8B 131,072 B。
- 10 万 token：MLA 7.03 GB（6.54 GiB）；MHA 499.7 GB（465 GiB）；GQA-8 25.0 GB（23.3 GiB）；Llama 13.1 GB（12.2 GiB）。
- 2.25 组 GQA：(512+64)/(2×128) = 2.25；V2 论文摘要：KV Cache 减少 93.3%、最大生成吞吐 5.76 倍（对比 DeepSeek 67B）。
- 吸收形式解码计算（估算）：每层每历史位置 2×128×(576+512) = 278,528 FLOPs，读 1,152 B → 242 FLOPs/B；Llama GQA 2×32×256 = 16,384 FLOPs，读 4,096 B → 4 FLOPs/B。H800 BF16 稠密约 989 TFLOPS、带宽 3.35 TB/s，比值约 295。属估算，正文已标明。

### V3 路由、均衡、MTP、FP8（论文 arXiv 2412.19437v2）

- 源码 `T/deepseek_v3/modular_deepseek_v3.py` `DeepseekV3TopkRouter.forward`：sigmoid 打分 → 加 `e_score_correction_bias` → 组分 = 组内 top-2 之和 → 留 topk_group 组 → top-8 → 权重取原始 scores 归一化 × routed_scaling_factor。偏置 `_keep_in_fp32_modules_strict`。
- 节点限制：“each token will be sent to at most 4 nodes (M=4)”。
- 偏置更新速度 γ：前 14.3T token 0.001，最后 500B token 0.0。序列级平衡损失 α = 0.0001。
- 消融：1B 模型验证损失 2.253（无辅助损失）对 2.258（序列级辅助损失）；3B 两者都是 2.080（与 batch-wise 对比）；“auxiliary-loss-free strategy consistently achieves better model performance on most of the evaluation benchmarks”。
- MTP：D = 1；λ 前 10T token 0.3，后 4.8T 0.1；第二个 token 接受率 85%—90%，1.8 倍 TPS（5.4.3 节）。
- MTP 权重：README_WEIGHTS.md：`model.layers.61`、embed_tokens 与 shared_head 共享主模型；Transformers `_keys_to_ignore_on_load_unexpected = [r"model\.layers\.61.*"]`。
- FP8：激活 1×128 tile、权重 128×128 block；预训练 14.8T token 2.664M H800 GPU 小时，全部训练 2.788M。

### V3.2 DSA（源码 `T/deepseek_v32/modular_deepseek_v32.py`，报告 arXiv 2512.02556）

- `DeepseekV32Indexer`：`wq_b` q_lora_rank → 64×128；`wk` hidden → 128 + LayerNorm（单个键，共享）；`weights_proj` hidden → 64；score = Σ_h w·ReLU(q·k)·scale；topk 2048。索引键单独缓存（`update_indexer`）。
- 训练：dense warm-up 冻结主模型只训索引器，KL 对齐主注意力各头分数之和（L1 归一化），1000 步 × 16 × 128K ≈ 2.1B token；sparse 阶段 15000 步 × 480 × 128K ≈ 943.7B token，top-k 2048；从 V3.1-Terminus 继续训练。
- DSA 基于 MLA 的 MQA 模式；索引器可 FP8；核心注意力 O(L²)→O(Lk)，索引器仍 O(L²)。
- 2025-11-17 README 更新：索引器 RoPE 需非交错布局，MLA 用交错布局，旧 demo 代码有误会降表现。

### V4（源码 `T/deepseek_v4/`，config V4-Flash / V4-Pro，README，arXiv 2606.19348）

- README：Pro 1.6T/49B，Flash 284B/13B，1M 上下文；1M 时 Pro 单 token 推理 FLOPs 为 V3.2 的 27%、KV Cache 为 10%；mHC；Muon；预训练 32T+ token；专家 FP4、其余多为 FP8。
- `DeepseekV4Attention` docstring：Shared-KV MQA（num_key_value_heads=1，K=V）、partial RoPE（尾部 64 维，输出再用 -sin 反转）、per-head sinks（同 gpt-oss）、grouped low-rank output projection（o_groups、o_lora_rank）、三种缓存（sliding、sliding+CSA、sliding+HCA）。
- CSA：compress rate 4，Ca/Cb 两路，窗口宽 2m、步长 m（重叠）；Lightning Indexer top-k = `index_topk`（Flash 512、Pro 1024），index_n_heads 64、index_head_dim 128。HCA：rate 128，不重叠，无索引器。sliding_window 128。
- `compress_ratios`（长度 = 层数 + 1，最后一项对应 MTP 层）：Flash 前 43 项 [0,0,4,128,...,4]：2 层纯滑动、21 CSA、20 HCA；Pro 前 61 项 [128,128,4,128,...]：31 HCA、30 CSA。与 config 源码默认（2×HCA + 交替）一致于 Pro。
- MoE：`DeepseekV4DecoderLayer` 每层都是 `DeepseekV4SparseMoeBlock`（无密集层）；前 3 层 `hash_moe`（`tid2eid[input_ids]` 固定表）；`scoring_func: sqrtsoftplus`（`T/../activations.py` 有 `SqrtSoftplusActivation`）；router 有 `e_score_correction_bias`，无分组；swiglu_limit 10 clamp。Flash 256 专家 top-6，Pro 384 专家 top-6，各 1 共享。
- mHC：`DeepseekV4HyperConnection`，hc_mult 4，Sinkhorn-Knopp 20 次迭代投到双随机矩阵。
- MTP：num_nextn_predict_layers 1，config docstring “MTP layer count in the upstream checkpoint (not instantiated here)”。
- 复算（`v4_params.py`）：Flash 总 284,332,230,231、激活 13,799,622,231（不含词嵌入和输出层 12,740,560,471）；Pro 总 1,572,997,179,491、激活 49,779,058,787。与官方 284B/13B、1.6T/49B 一致（取整）。HF API 统计因 FP4 打包为 I8 不可直接比较。
- KV 粗算（元素数，不计精度差别）：V3.2 61×(576+128) = 42,944；V4-Pro 30×(128+32) + 31×4 = 4,924；比 11.5%，与官方 10% 同量级。正文标明为估算。

## 16. 其他主流开源模型

配置原件与模型卡保存在 scratch `arch/families-b/configs/`、`cards/`；Gemma 2/3 官方仓库需登录，用 unsloth 镜像（字段与官方一致性未逐项对比，仅作为结构来源）。发布日期：能找到官方页面的写到日，只有 HF 仓库创建日期或二手来源的只写到月。

### Mistral

| 事实 | 值 | 来源 | 结论 |
| --- | --- | --- | --- |
| Mistral 7B v0.1 | 32 层、4096、32/8 头、sliding_window 4096、rope 1e4、max_pos 32768、Apache 2.0；2023-09（HF 2023-09-20，具体发布日未核对） | config；`T/mistral/modeling_mistral.py`（`create_sliding_window_causal_mask`，注释 main diff with Llama） | 一致 |
| v0.2 / v0.3 | sliding_window null、rope_theta 1e6、max_pos 32768 | mistralai/Mistral-7B-Instruct-v0.2、Mistral-7B-v0.3 config | 正文写“滑动窗口未被沿用” |
| Mixtral 8x7B / 8x22B | 8 专家 top-2，sliding_window null；8x22B 56 层、6144、48/8、max_pos 65536 | config；`MixtralTopKRouter`（softmax → topk → 归一化） | 一致 |
| Mixtral 参数复算 | 8x7B 46,702,792,704 / 12,879,925,248；8x22B 140,620,634,112 / 39,152,031,744 | 复算脚本 | 与常见官方 46.7B/12.9B、141B/39B 一致（官方页面本次未打开） |
| Mistral Large 3 | 675B/41B，Apache 2.0，2025-12；仅 params.json：61 层、128 头、kv_lora 512、rope 64、128 专家 top-4 + 1 共享、前 3 层密集、expert_hidden 4096、256K | 模型卡、params.json；Transformers 无对应类 | 正文只引 params.json |
| Ministral 3 | 密集 GQA，`get_llama_4_attn_scale` = 1 + β·log(1+⌊pos/max⌋)，β 0.1 | `T/ministral3/modular_ministral3.py`，config llama_4_scaling_beta 0.1 | 一致 |
| Mistral Small 4 | 119B/6.5B，Apache 2.0，2026-03-16（官方 news 页，搜索摘要）；`mistral4`：MLA kv_lora 256、36 层全 MoE、128 top-4 + 1 共享、softmax 路由 | `T/mistral4/modular_mistral4.py`（`Mistral4Attention(DeepseekV3Attention)`、`Mistral4TopkRouter(DeepseekV2TopkRouter)`）、config、模型卡 | 一致 |
| Mistral Medium 3.5 | 128B 密集，Modified MIT | 模型卡 | 一致 |

### Gemma

- Gemma 2：1:1（`configuration_gemma2.py` `(i+1)%2`，局部在前）、窗口 4096、attn softcap 50、final 30（`eager_attention_forward` tanh 截断；`_supports_sdpa = False`）、4 个 RMSNorm（`Gemma2DecoderLayer`）、embed × √hidden、`query_pre_attn_scalar`、词表 256000、max_pos 8192、`tie_word_embeddings` 默认 True（配置类第 83 行）。软截断算例：50·tanh(0.2)=9.87，50·tanh(1.6)=46.1。
- Gemma 3：5:1（`sliding_window_pattern` 6）、窗口 1024（1B 为 512）、softcap 均为 null、新增 `q_norm`/`k_norm`、局部 rope 1e4、全局 1e6（4B 起 linear ×8）、128K。27B：62 层，全局层 i=5,11,…,59 共 10 层，16 KV 头 ×128 → 每层每 token 8192 B，增长部分 81,920 B = 80 KiB；全为全局时 507,904 B = 496 KiB。
- Gemma 2 27B：46 层 23 层全局 ×8192 B = 188,416 B ≈ 184 KiB。
- Gemma 4（Apache 2.0；Google 开发者论坛发布帖 2026-04-02，Google 官方博客未直接打开）：31B config：60 层、5376、32 头、局部 16 KV × 256、全局 4 KV × 512（`num_global_key_value_heads`、`global_head_dim`）、`attention_k_eq_v` true、窗口 1024、full 层 [5,11,…,59]、rope full {proportional, 1e6, partial 0.25}、sliding {1e4}、final softcap 30、tie true、256K。源码 `T/gemma4/modular_gemma4.py`：k_eq_v 时 `v_proj=None`、`value_states = key_states`（V 另做 `v_norm`，K 做 `k_norm`+RoPE，缓存 K、V 分开存）；`scaling = 1.0`；E2B/E4B `num_kv_shared_layers` 20/18；PLE 256；26B-A4B 密集 MLP 与 128 专家 top-8 并联，softmax + per_expert_scale；`Gemma4TextScaledWordEmbedding` 保留 √hidden 缩放。全局层每层每 token 2×4×512×2 = 8 KiB，局部 2×16×256×2 = 16 KiB。

### GLM

- GLM-4.5（MIT，355B/32B，2025-07，HF 2025-07-20；具体发布日未核对）：92 层（+1 MTP）、5120、96/8 头 × 128、partial_rotary 0.5、attention_bias true、use_qk_norm true（Air false）、160+1 top-8、first_k_dense 3、sigmoid + `e_score_correction_bias`（`Glm4MoeTopkRouter(DeepseekV3TopkRouter)`）。4.6/4.7 max_pos 202752。
- GLM-5（MIT，744B/40B，2026-02）：`GlmMoeDsaConfig(DeepseekV32Config)`；78 层、64 头、MLA q_lora 2048 / kv_lora 512 / qk_nope 192 / rope 64 / v 256；索引器 32 头 × 128、top-2048；256+1 top-8；max_pos 202752。
- GLM-5.2（2026-06）：`indexer_types` full 21 层、其余 shared；模型卡 IndexShare（arXiv 2603.12201），1M 时每 token FLOPs 降 2.9 倍；max_pos 1,048,576。GLM-5.3：同一基础模型，许可证 other（glm-5.3）。
- GLM-5.3-Flash（`glm5_next`，MIT，320B/18B，2026-08）：45 层 = 34 KDA + 11 DSA（idx 3,7,…,43），qk_rope 0（`mla_use_nope`），mhc hc_mult 4，288+1 top-8；`Glm5NextTextLinearAttention` 注释 “Kimi-style KDA”，`Glm5NextTextHyperConnection(DeepseekV4HyperConnection)`。

### Kimi

- K2（修改版 MIT，1T/32B，2025-07）：`architectures: DeepseekV3ForCausalLM`；64 头、384+1 top-8、first_k_dense 1、MLA 同 V3、vocab 163840、num_nextn_predict_layers 0、routed_scaling 2.827、128K。KV 61×576×2 = 70,272 B。MuonClip 为优化器（模型卡）。
- K2-Thinking（2025-11）：INT4 QAT、256K。K2.5（2026-01，arXiv 2602.02276）/K2.6（2026-04）：`kimi_k25`，MoonViT 400M，约 15T 图文 token 继续预训练。
- Kimi Linear（MIT，48B/3B，2025-10）：27 层，full_attn_layers 1-indexed [4,8,…,24,27] → 7 MLA + 20 KDA；KDA 32 头 × 128；`KimiLinearDeltaAttention` 注释“decay is per-channel instead of per-token”；modeling 文件无 rotary（MLA 为 NoPE）；1M。KV 7×576×2 = 8,064 B。
- Kimi K3：模型卡 2.8T/104B、69 KDA + 24 门控 MLA；Transformers 5.21.0 无 kimi_k3，正文不展开。

### gpt-oss

- 2025-08-05、Apache 2.0（OpenAI 发布页，搜索摘要；HF 2025-08-04）；模型卡 arXiv 2508.10925：120b 116.8B/5.1B、36 层、128 专家；20b 20.9B/3.6B、24 层、32 专家；top-4；64 Q 头 × 64、8 KV；带状窗口 128 与稠密交替；softmax 分母的可学习偏置；YaRN 131,072；o200k_harmony 201,088；MXFP4 约 4.25 bit/参数；120b 可放 80 GB 单卡。
- config：hidden 2880、rope_theta 150000、yarn factor 32 from 4096、swiglu_limit 7.0、mxfp4 排除 self_attn/router/embed/lm_head。
- 源码 `T/gpt_oss/modeling_gpt_oss.py`：`self.sinks`（每头一个）、`eager_attention_forward` 拼接 sinks 列 softmax 后丢弃；`_apply_gate`：gate clamp(max=limit)、up clamp(±limit)、`gate*sigmoid(gate*1.702)`、`(up+1)*glu`；`GptOssTopKRouter` 先 topk 再 softmax。
- 汇聚算例（示意数字）：e^1.0=2.718、e^0.2=1.221、e^2.0=7.389、e^0.5=1.649、和 12.977；e^1.5=4.482；权重 0.156/0.070/0.423/0.094，合计 0.743。
- KV：18 全局层 ×2×8×64×2 = 36,864 B；18 窗口层 ×128×2048 B = 4,718,592 B = 4.5 MiB。

### MiniMax

- Text-01（2025-01，456B/45.9B，许可 minimax，arXiv 2501.08313）：80 层，softmax 层 idx 7,15,…,79（7:1），32 专家 top-2，无共享；`MiniMaxDecoderLayer` 残差 × attn_alpha_factor 3.5566（≈160^0.25）后归一化写法；KV 10×2×8×128×2 = 40,960 B。模型卡：训练 1M、推理至 4M（未复核）。
- M2（2025-10，230B/10B）：62 层 attn_type 全 1（完整注意力）、48/8 头、rotary 64/128、QK-Norm per_layer（`MiniMaxM2Attention(FlexOlmoAttention)`）、256 专家 top-8、sigmoid + bias、max_pos 196608。KV 62×4096 B = 253,952 B。许可证：M2 仓库标签未核对，正文写“见仓库”。
- 回到完整注意力的原因：MiniMax 官方博客 https://www.minimax.io/news/why-did-m2-end-up-as-a-full-attention-model 与 HF 博客：小规模与常规榜单看不出差距，放大后复杂多跳推理有缺陷，需要专门代理指标；未找到稳定追平完整注意力的高效变体（M2 技术报告 arXiv 2605.26494 摘要同义，经搜索摘要核对）。
- M3（2026-06，约 428B/23B，minimax-community，arXiv 2606.13392）：`MiniMaxM3VLIndexer` 128 token 块最大池化、每 GQA 组选 top-16 块 + 局部 1 块；KV 4 头；前 3 层完整注意力；swigluoai alpha 1.702 limit 7；1M。

### 闭源模型

- GPT-4 技术报告 arXiv 2303.08774：“Transformer-based model pre-trained to predict the next token”；“this report contains no further details about the architecture (including model size), hardware, training compute, dataset construction, training method, or similar”（原文 PDF 本次未抽取，引文经二手引用与既有认知核对）。
- Gemini 1.5（arXiv 2403.05530 §3.1/3.2）：1.5 Pro 稀疏 MoE Transformer；1.5 Flash 为 Transformer 解码器、从 Pro 在线蒸馏。Gemini 2.5（arXiv 2507.06261 §2.1）：稀疏 MoE Transformer，原生文本、视觉、音频输入。Gemini 3 未核对。
- Claude：未找到 Anthropic 公开的架构信息 → 未公开。

## 与简报不同或需注意的事实

- 简报说 V4 “查不到正式发布就不写”：V4 预览 2026-04-24、V4-Pro 正式 2026-08-13 均有官方新闻，已写。V4 的注意力不再是 MLA（共享 KV 的 MQA + CSA/HCA 压缩），与“MLA 一路沿用”的印象不同。
- V4 每层都是 MoE（无密集层），前 3 层为哈希路由，不是 V3 的“前 3 层密集”。
- DeepSeek-V3 激活参数按 config 复算 37.55B，官方权重文档 36.7B，差约 0.85B，口径未能确定。
- Gemma 3 已取消注意力 soft-capping（改 QK-Norm）；Gemma 4 又恢复最终 logits soft-capping 30。
- MiniMax-M2 是全部完整注意力，不是 Text-01 的线性混合。
- mistral3 在 Transformers 里只是多模态外壳；Mistral Large 3 没有 config.json。
