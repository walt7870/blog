# LLM 推理优化系列：事实核查表（facts sheet）

- 核查日期：2026-10-26（下文所有条目“checked”均为该日，除非另注）
- 方法：厂商官方页面 / arXiv 原文（PDF 全文检索）/ 官方文档 / GitHub 源码（vLLM `v0.32.0`、SGLang `v0.5.22` 按 tag 浅克隆后 grep）/ `gh api` 查 release。
- 标记：✅ 已核实；⚠️ 已核实但有坑；❌ 与常见说法不符；❓ 未能核实。

---

## 1. GPU 规格

NVIDIA 数据中心产品页的 Tensor Core 数字**默认带稀疏（2:4 structured sparsity）**，需要除以 2 得到 dense。各页脚注原文已逐一确认。

| GPU | BF16/FP16 dense TFLOPS | FP8 dense TFLOPS | 显存 | 带宽 | BF16 dense ridge point (FLOP/Byte) | 官方页写法 |
|---|---|---|---|---|---|---|
| A100 80GB SXM | 312 | 不支持 FP8 | 80 GB HBM2e | 2,039 GB/s | 312e12 / 2.039e12 ≈ **153** | "312 TFLOPS \| 624 TFLOPS*"，"* With sparsity"（dense 和 sparse 都列了） |
| H100 SXM | ≈989（1,979/2） | ≈1,979（3,958/2） | 80 GB | 3.35 TB/s | 989 / 3.35 ≈ **295** | 只列 "1,979 teraFLOPS*"，"* With sparsity" |
| H200 SXM | ≈989（1,979/2） | ≈1,979（3,958/2） | 141 GB | 4.8 TB/s | 989 / 4.8 ≈ **206** | 只列 "1,979 TFLOPS²"，"With sparsity." |
| B200（HGX B200 ÷ 8） | ≈2,250（36 PF/8 = 4.5 PF 稀疏，/2） | ≈4,500（72 PF/8 = 9 PF 稀疏，/2） | 180 GB（1,440 GB/8） | 8 TB/s（64 TB/s/8） | 2,250 / 8 ≈ **281** | "Specification in Sparse. Dense is ½ sparse spec shown." |
| L40S | 362.05 | 733 | 48 GB GDDR6 ECC | 864 GB/s | 362.05 / 0.864 ≈ **419** | "362.05 I 733*"，"*With Sparsity"（dense 在前） |
| RTX 4090 | **165.2**（BF16/FP16，FP32 累加）；FP16 用 FP16 累加时 330.3 | 330.3（FP32 累加）；660.6（FP16 累加） | 24 GB GDDR6X | 1,008 GB/s | 165.2 / 1.008 ≈ **164**（FP16 累加则 ≈328） | 白皮书写成 "165.2/330.4²"，脚注 2 = "Effective TOPS / TFLOPS using the new Sparsity Feature" |

Ridge point = 峰值 dense BF16 FLOP/s ÷ 显存带宽 B/s。它只是 roofline 上的理论拐点，实际 GEMM 达不到峰值。

来源（均为 2026-10-26 checked）：
- A100: https://www.nvidia.com/en-us/data-center/a100/ ✅
- H100: https://www.nvidia.com/en-us/data-center/h100/ ✅（页面只给稀疏值；989 是 1,979/2 推出来的，官方页未直接写 dense）
- H200: https://www.nvidia.com/en-us/data-center/h200/ ✅（同上）
- B200: https://www.nvidia.com/en-us/data-center/hgx/ （HGX B200：FP16/BF16 "36 PFLOPS"，FP8/FP6 "72 PFLOPS"，FP4 "144 PFLOPS | 72 PFLOPS"）；https://www.nvidia.com/en-us/data-center/dgx-b200/ （"1,440 GB total"、"64 TB/s HBM3e bandwidth"） ⚠️
- L40S: https://www.nvidia.com/en-us/data-center/l40s/ ✅
- RTX 4090: NVIDIA Ada GPU Architecture 白皮书 Appendix A，https://images.nvidia.com/aem-dam/Solutions/geforce/ada/nvidia-ada-gpu-architecture.pdf ✅

注意事项：
- ⚠️ B200 没有找到单卡官方 datasheet 数字，表中按 HGX/DGX B200 八卡总数 ÷ 8 推算。单卡显存 180 GB 是 DGX 配置下的值（常见说法“192 GB”是 HBM 物理容量，官方 DGX/HGX 页写 1,440 GB / 8 卡）。B200 的 TDP 和频率因 OEM 而异，单卡 dense BF16 有时被写成 2.2 PF 左右。
- ⚠️ RTX 4090 常被说成“330 TFLOPS FP16”，那是 **FP16 输入、FP16 累加** 的 dense 值。训练和推理框架里常用的 BF16/FP16 输入、FP32 累加是 **165.2 TFLOPS dense**。GeForce 卡的 FP32 累加被限速一半，算 ridge point 时要说明用的是哪一个。
- ⚠️ 示例中的“H100 SXM 1,979 TFLOPS BF16 是稀疏值，dense 约 989”✅ 成立（989.4 来自 H100 白皮书，官方产品页只写 1,979*）。
- H100 PCIe/NVL 和 SXM 的数字不同，这里只给 SXM。

---

## 2. 模型配置（HF `config.json`）与 KV cache 大小

KV bytes/token（BF16，2 字节）= 2（K 和 V）× num_hidden_layers × num_key_value_heads × head_dim × 2

| 模型 | layers | attn heads | KV heads | head_dim | hidden_size | max_position_embeddings | KV bytes/token（BF16） |
|---|---|---|---|---|---|---|---|
| Llama-3.1-8B | 32 | 32 | 8 | 128（4096/32） | 4096 | 131072 | 2·32·8·128·2 = **131,072 B = 128 KiB** |
| Llama-3.1-70B | 80 | 64 | 8 | 128（8192/64） | 8192 | 131072 | 2·80·8·128·2 = **327,680 B = 320 KiB** |
| Qwen3-8B | 36 | 32 | 8 | **128（显式字段）** | 4096 | 40960 | 2·36·8·128·2 = **147,456 B = 144 KiB** |
| Qwen3-32B | 64 | 64 | 8 | **128（显式字段）** | 5120 | 40960 | 2·64·8·128·2 = **262,144 B = 256 KiB** |
| DeepSeek-V3 | 61 | 128 | 128（MLA 下没有实际意义） | qk_nope 128 + qk_rope 64，v 128 | 7168 | 163840 | MLA：(512+64)·61·2 = **70,272 B ≈ 68.6 KiB** |

来源：
- Qwen3-8B: https://huggingface.co/Qwen/Qwen3-8B/blob/main/config.json ✅
- Qwen3-32B: https://huggingface.co/Qwen/Qwen3-32B/blob/main/config.json ✅
- DeepSeek-V3: https://huggingface.co/deepseek-ai/DeepSeek-V3/blob/main/config.json ✅
- Llama-3.1-8B/70B: 官方 `meta-llama/Llama-3.1-8B` 的 config.json 是 **gated**，未登录拿不到（HF API 只返回 `architectures`）⚠️。改用以下两处交叉核对：
  - Meta 官方仓库 `llama-models/models/sku_list.py`：8B `dim 4096, n_layers 32, n_heads 32, n_kv_heads 8`；70B `dim 8192, n_layers 80, n_heads 64, n_kv_heads 8`。https://github.com/meta-llama/llama-models/blob/main/models/sku_list.py ✅
  - 社区镜像 config：https://huggingface.co/unsloth/Meta-Llama-3.1-8B/blob/main/config.json （包含 `head_dim: 128`、`max_position_embeddings: 131072`、rope_scaling llama3 factor 8）；https://huggingface.co/NousResearch/Meta-Llama-3.1-70B/blob/main/config.json （没有 head_dim 字段）。max_position_embeddings 来自镜像，不是官方文件 ⚠️

注意事项：
- ❌/⚠️ **Qwen3-32B 的 head_dim ≠ hidden_size / num_attention_heads**：5120/64 = 80，但 config 里显式写的是 `head_dim: 128`。按 hidden/heads 算会把 KV 低估 37.5%。Qwen3 系列必须读 `head_dim` 字段。
- ⚠️ Qwen3 的 `max_position_embeddings = 40960` 不是“原生上下文”。模型卡原文："Context Length: 32,768 natively and 131,072 tokens with YaRN"，"The default `max_position_embeddings` in `config.json` is set to 40,960. This allocation includes reserving 32,768 tokens for outputs and 8,192 tokens for typical prompts"。https://huggingface.co/Qwen/Qwen3-8B
- DeepSeek-V3 MLA 相关参数：`kv_lora_rank: 512`，`qk_rope_head_dim: 64`，`qk_nope_head_dim: 128`，`v_head_dim: 128`，`q_lora_rank: 1536`，`num_nextn_predict_layers: 1`。config 里还带 `quantization_config: fp8 e4m3, weight_block_size [128,128]`，说明官方权重本身就是 FP8。
  - 每 token 每层只缓存压缩后的 latent c_KV（kv_lora_rank = 512）和解耦的 RoPE key k^R（qk_rope_head_dim = 64，所有 head 共享），共 576 个元素。论文原文："for MLA, only the blue-boxed vectors (i.e., c^KV_t and k^R_t) need to be cached during generation"（arXiv 2412.19437 §2.1.1）✅
  - BF16：576 × 2 B × 61 层 = 70,272 B/token。如果把 MTP 模块（第 62 层）也算进去，是 71,424 B。
  - 对照：同尺寸的标准 MHA（128 heads，K 维 192、V 维 128）是 (192+128)·128·61·2 ≈ 4.77 MiB/token，约为 MLA 的 71 倍。
  - vLLM 实现中 MLA 的 KV head 大小就是 `kv_lora_rank + qk_rope_head_dim`（`vllm/model_executor/layers/mla.py`、`models/deepseek_v2.py`，tag v0.32.0）✅
  - vLLM 的 `fp8_ds_mla` 格式（DeepSeek V3.2 / FlashMLA sparse）每 token 每层 656 B：512 B FP8 NoPE + 16 B（4 个 fp32 scale）+ 128 B BF16 RoPE。https://github.com/vllm-project/vllm/blob/v0.32.0/vllm/v1/attention/backends/mla/flashmla_sparse.py ✅

---

## 3. 量化格式与方法

### FP8 E4M3 / E5M2 ✅
- 来源：Micikevicius et al., "FP8 Formats for Deep Learning", arXiv 2209.05433，Table 1。https://arxiv.org/abs/2209.05433
- E4M3：bias 7；最大正规数 1.75×2^8 = **448**；最小正规数 2^-6；最小次正规数 2^-9；**没有 Inf**，只有一种 NaN 位模式（S.1111.111）。
- E5M2：bias 15；最大正规数 1.75×2^15 = **57,344**；最小正规数 2^-14；最小次正规数 2^-16；遵循 IEEE 规则，有 Inf 和 NaN。
- 论文说明：如果 E4M3 不做这个修改，最大值只有 240。（PyTorch 中对应 `float8_e4m3fn`，“fn” 表示 finite + NaN。）

### NVFP4 ✅
- 来源：NVIDIA 技术博客 "Introducing NVFP4 for Efficient and Accurate Low-Precision Inference"（2025-06-24）。https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/
- 元素格式为 FP4 E2M1；"applies a fine-grained E4M3 scaling factor to each 16-value micro-block"；"This second-level scaling factor is done at a per-tensor level with FP32"。
- 所以“块大小 16 + FP8 E4M3 块 scale + FP32 张量级 scale”**成立**。

### MXFP4 ✅
- 来源：OCP Microscaling Formats (MX) Specification v1.0，Table 1：`MXFP4 | FP4 (E2M1) | 4 bits | k = 32 | E8M0 | 8 bits`。https://www.opencompute.org/documents/ocp-microscaling-formats-mx-v1-0-spec-final-pdf
- 配套论文：Rouhani et al., "Microscaling Data Formats for Deep Learning", arXiv 2310.10537。原文："All concrete MX formats use E8M0 (an 8-bit exponent) as the format for the shared scale"。https://arxiv.org/abs/2310.10537
- 块大小 32、E8M0（只能表示 2 的幂）scale **成立**。MXFP8/MXFP6/MXINT8 的块大小也都是 32。

### GPTQ / AWQ / SmoothQuant ✅
- **GPTQ**（Frantar et al., ICLR 2023，arXiv 2210.17323）：一次性的 weight-only PTQ，利用近似二阶（Hessian）信息逐列量化，并补偿剩余列的误差。175B 模型约 4 GPU 小时可量化到 3–4 bit。https://arxiv.org/abs/2210.17323
- **AWQ**（Lin et al., MLSys 2024 Best Paper，arXiv 2306.00978）：weight-only 量化，按**激活**分布找出约 1% 的显著权重通道，用等价的逐通道缩放保护它们。不做反向传播或重建。https://arxiv.org/abs/2306.00978
- **SmoothQuant**（Xiao et al., ICML 2023，arXiv 2211.10438）：W8A8，通过数学等价变换把激活中的离群值“平滑”到权重上，离线把量化难度从激活转移到权重。论文称最高 1.56× 加速、2× 显存节省。https://arxiv.org/abs/2211.10438

### vLLM FP8 KV cache ✅
- 参数是 `--kv-cache-dtype fp8`（Python 写法 `kv_cache_dtype="fp8"`）。可选值（v0.32.0 `CacheDType`）：`auto, float16, bfloat16, fp8, fp8_e4m3, fp8_e5m2, fp8_inc, fp8_ds_mla, nvfp4_ds_mla, turboquant_*` 等。源码 docstring："CUDA 11.8+ supports fp8 (=fp8_e4m3) and fp8_e5m2"。
  - https://github.com/vllm-project/vllm/blob/v0.32.0/vllm/config/cache.py
  - https://github.com/vllm-project/vllm/blob/v0.32.0/docs/features/quantization/quantized_kvcache.md
- ⚠️ 不做校准时 scale 默认为 1.0。文档推荐用 llm-compressor 做校准。使用 FA3 后端加 FP8 KV 时，Q 也会被量化成 FP8。
- ⚠️ 文档说明部分模型（如 DeepSeek V3.2）**默认**就使用 fp8 KV。

---

## 4. 投机解码（Speculative decoding）

### Leviathan et al. 2023 ✅
- "Fast Inference from Transformers via Speculative Decoding"，ICML 2023 Oral，arXiv 2211.17192。https://arxiv.org/abs/2211.17192
- 接受规则（论文 §3，记号中 p 为目标模型，q 为草稿模型）："sample x∼q(x), keeping it if q(x) ≤ p(x), and in case q(x) > p(x) we reject the sample with probability 1−p(x)/q(x) and sample x again from an adjusted distribution p′(x) = norm(max(0, p(x)−q(x)))"。等价于以 min(1, p(x)/q(x)) 的概率接受。全部 γ 个都被接受时，再从 p 额外采样 1 个 token。
- 结果：T5-XXL 上 2X–3X 加速，"with identical outputs"。

### Chen et al. 2023（DeepMind） ✅
- "Accelerating Large Language Model Decoding with Speculative Sampling"，arXiv 2302.01318。https://arxiv.org/abs/2302.01318
- "modified rejection sampling"：以 min(1, q(x̃)/p(x̃)) 的概率接受。⚠️ **记号与 Leviathan 相反**：Chen 用 q 表示**目标**模型、p 表示**草稿**模型。拒绝后从 (q − p)+ 归一化后的分布重采样。
- 结果：Chinchilla 70B 在分布式设置下解码加速 2–2.5×。

### Medusa ✅
- arXiv 2401.10774。https://arxiv.org/abs/2401.10774
- 改动：在 backbone 上加多个 decoding head，并行预测后续多个 token，用 tree attention 一次验证多个候选。不需要独立的草稿模型。Medusa-1 冻结 backbone（无损）；Medusa-2 和 backbone 联合微调。另有 typical acceptance 方案（非贪心时**不严格无损**）。
- 论文声称：Medusa-1 "over 2.2x"，Medusa-2 "2.3-3.6x"。条件："primarily focus on scenarios with a batch size of one"。

### EAGLE / EAGLE-2 / EAGLE-3 ✅
- **EAGLE**（arXiv 2401.15077）：在**特征层**（倒数第二层 hidden state）做自回归，并把前移一步的 token 序列作为输入，以消除特征层的不确定性。草稿头约为一个 decoder layer。LLaMA2-Chat 70B 上 "latency speedup ratio of 2.7x-3.5x, doubled throughput"，保持输出分布不变。https://arxiv.org/abs/2401.15077
- **EAGLE-2**（arXiv 2406.16858）：把 EAGLE 的静态草稿树换成**上下文感知的动态草稿树**，用草稿模型的置信度近似接受率来扩展和重排树。"speedup ratios 3.05x-4.26x, which is 20%-40% faster than EAGLE-1"，无损。条件：主要数字来自 temperature=0、batch size 1（MT-bench 等 6 个任务）。https://arxiv.org/abs/2406.16858
- **EAGLE-3**（arXiv 2503.01840）：放弃特征预测，改为**直接预测 token**；用 "training-time test" 融合**多层特征**（low/mid/high），不再只依赖顶层特征。这样增加训练数据就能持续带来收益。"speedup ratio up to 6.5x, with about 1.4x improvement over EAGLE-2"；"approximately 3.0x-6.5x"。最高的 6.5x（表中 6.47x）出现在 **Vicuna-13B、HumanEval、temperature=0**。SGLang（v0.4.4，单张 H100，LLaMA-3.1-8B-Instruct，MT-Bench，链长 3、不用树）上 batch 64 时吞吐提升 1.38x；EAGLE-1 在 batch 24 时反而降到 0.93x。https://arxiv.org/abs/2503.01840

### n-gram / prompt lookup ✅
- vLLM：`speculative_config={"method": "ngram", "num_speculative_tokens": 5, "prompt_lookup_max": 4}`，从 prompt 中匹配 n-gram 生成提案，无需草稿模型。文档出处为 X 上的帖子（Joao Gante，HF transformers 的 prompt lookup decoding），**没有正式论文**。https://github.com/vllm-project/vllm/blob/v0.32.0/docs/features/speculative_decoding/n_gram.md
- vLLM v0.32.0 的 `SpeculativeMethod` 包含：`ngram, medusa, mlp_speculator, draft_model, suffix, custom_class, eagle, eagle3, extract_hidden_states, <各种 *_mtp>, dflash, ngram_gpu...` https://github.com/vllm-project/vllm/blob/v0.32.0/vllm/config/speculative.py
- EAGLE-3 论文表中 PLD（prompt lookup decoding）在 Vicuna-13B、T=0 下平均为 1.74x，作对照用。

### DeepSeek-V3 MTP ✅
- arXiv 2412.19437 §5.4.3 / §2.2。https://arxiv.org/abs/2412.19437
- MTP 主要是**训练目标**；推理时可以丢弃 MTP 模块，也可以把它拿来做投机解码。原文："the acceptance rate of the second token prediction ranges between 85% and 90% across various generation topics … delivering 1.8 times TPS (Tokens Per Second)"。config 中 `num_nextn_predict_layers: 1`（只预测 1 个额外 token）。

---

## 5. 推理引擎

### 最新 release（`gh api repos/<repo>/releases`，2026-10-26 查询）

| 项目 | 最新正式版 | 发布时间（UTC） | 备注 |
|---|---|---|---|
| vLLM | **v0.32.0** | 2026-10-18 | ✅ 与本地快照一致 |
| SGLang | **v0.5.22** | 2026-10-19 | ✅ 与本地快照一致 |
| TensorRT-LLM | **v1.2.1**（GitHub 标为 latest 的正式版） | 2026-04-20 | ⚠️ 之后只有预发布：v1.3.0rc0…rc29（最后 2026-09-29），**v1.4.0rc1（2026-10-22）** 是最新 prerelease |
| llama.cpp | **v0.7.0**（semver，标为 latest） | 2026-10-15 | ⚠️ llama.cpp 现在同时有语义化版本（v0.1.0…v0.7.0）和滚动构建 `bNNNNN`（全部标为 prerelease，最新 **b11913**，2026-10-27T00:19Z）。v0.7.0 release notes 提到默认 server 端口改为 9931 |
| MLC-LLM | **没有正式 GitHub release** | — | ❓ GitHub 上只有 2023 年的 `v0.1.dev0`。tags 顺序混乱（v0.20.0 打在 2026-07-07，v0.26.dev0 打在 2026-06-28）。最近一次提交在 2026-10-06。无法给出可信的“最新版本号” |
| ExecuTorch | **v1.5.1** | 2026-09-23 | ✅ |
| Ollama | **v0.40.11** | 2026-10-24 | v0.40.12-rc0 预发布（2026-10-27T00:07Z） |
| LMDeploy | **v0.18.0** | 2026-09-28 | ✅ |
| （附）MLX | v0.32.4 | 2026-10-14 | |

来源：`https://github.com/<repo>/releases`，例如 https://github.com/vllm-project/vllm/releases/tag/v0.32.0 、https://github.com/sgl-project/sglang/releases/tag/v0.5.22 、https://github.com/NVIDIA/TensorRT-LLM/releases 、https://github.com/ggml-org/llama.cpp/releases/tag/v0.7.0 、https://github.com/pytorch/executorch/releases/tag/v1.5.1 、https://github.com/ollama/ollama/releases/tag/v0.40.11 、https://github.com/InternLM/lmdeploy/releases/tag/v0.18.0

### vLLM V1（以 v0.32.0 源码为准） ✅

- **chunked prefill 和 prefix caching 默认都开启**。`SchedulerConfig.enable_chunked_prefill: bool = True`，`CacheConfig.enable_prefix_caching: bool = True`。EngineArgs 中两者默认为 None，再按 `model_config.is_chunked_prefill_supported / is_prefix_caching_supported` 决定，生成类模型通常为 True。RISC-V CPU 上会强制关闭。pooling 模型可能不同。
  - https://github.com/vllm-project/vllm/blob/v0.32.0/vllm/config/scheduler.py
  - https://github.com/vllm-project/vllm/blob/v0.32.0/vllm/config/cache.py
  - https://github.com/vllm-project/vllm/blob/v0.32.0/vllm/engine/arg_utils.py （`_set_default_chunked_prefill_and_prefix_caching_args`）
- **参数名**：`--max-num-batched-tokens`、`--max-num-seqs`、`--gpu-memory-utilization`、`--speculative-config`（短名 `-sc`，JSON 格式）、`--kv-cache-dtype`、`--enable-prefix-caching`、`--prefix-caching-hash-algo`、`--kv-transfer-config`、`--compilation-config`（`-cc`）、`--attention-backend`。
- ⚠️ **默认值（GPU，按设备区分）**：
  - 显存 ≥160 GiB（B200/B300 等）：max_num_batched_tokens 16384（LLM 类与 API server 相同），max_num_seqs 1024
  - 显存 ≥70 GiB 且名称中不含 "a100"（H100/H200）：LLM 类 16384 / API server **8192**；max_num_seqs 1024
  - 其他 GPU（含 A100）：LLM 类 8192 / API server **2048**；max_num_seqs 256
- ❌ **`gpu_memory_utilization` 默认值是 0.92，不是常说的 0.9**（`Field(default=0.92, gt=0, le=1)`）。逐个 tag 查：v0.15.0 时还是 0.9，v0.20.0 及之后是 0.92。
- **Benchmark CLI**：`vllm bench serve`（子命令 `bench` → `serve`；另有 `vllm bench latency / throughput / startup / sweep / mm_processor`）。https://github.com/vllm-project/vllm/tree/v0.32.0/vllm/entrypoints/cli/benchmark
- **输出指标**（`vllm/benchmarks/serve.py`）：
  - `TTFT`（"Time to First Token"）
  - `TPOT`（"Time per Output Token (excl. 1st token)"，单请求计算为 `(latency − ttft) / (output_len − 1)`）
  - `ITL`（"Inter-token Latency"，每次流式 chunk 之间的间隔，汇总所有请求的所有间隔）
  - `E2EL`（"End-to-end Latency"）
  - 默认百分位指标：生成任务为 `ttft,tpot,itl`。`--goodput` 接受 `ttft/tpot/e2el:<ms>` 形式的 SLO，并在帮助文本中直接引用 DistServe 论文。
  - https://github.com/vllm-project/vllm/blob/v0.32.0/vllm/benchmarks/serve.py
- **Prefix caching 的 hash 设计**：`hash_block_tokens(hash_function, parent_block_hash, curr_block_token_ids, extra_keys)` 返回 `hash_function((parent_block_hash, tuple(block_tokens), extra_keys))`，首块的 parent 为 `NONE_HASH`（带 seed）。`extra_keys` 由 LoRA 名称 + 多模态输入的 hash 与 offset + `cache_salt`（只放在第 0 块）+ prompt embeds 摘要组成。**只缓存满块**。默认算法为 `sha256`（文档称自 v0.11 起）；可选 `sha256_cbor / xxhash / xxhash_cbor`。驱逐策略为 LRU。块大小默认 16 tokens。✅
  - https://github.com/vllm-project/vllm/blob/v0.32.0/vllm/v1/core/kv_cache_utils.py
  - https://github.com/vllm-project/vllm/blob/v0.32.0/docs/design/prefix_caching.md
- **CUDA graph 模式**（`CUDAGraphMode`）：`NONE`、`PIECEWISE`、`FULL`、`FULL_DECODE_ONLY`、`FULL_AND_PIECEWISE`。docstring 写明 **`FULL_AND_PIECEWISE` 是 V1 默认**：decode batch 用 full graph，prefill 和混合 batch 用 piecewise graph。`FULL_DECODE_ONLY` 适合 P/D 中的 decode 实例。✅ https://github.com/vllm-project/vllm/blob/v0.32.0/vllm/config/compilation.py
- **Attention backend**（`AttentionBackendEnum`，v0.32.0）：`FLASH_ATTN`、`FLASHINFER`、`TRITON_ATTN`、`FLEX_ATTENTION`、`TORCH_SDPA`、`TURBOQUANT`、ROCm 系列（`ROCM_ATTN`、`ROCM_AITER_FA`…），MLA 系列（`FLASHMLA`、`FLASHMLA_SPARSE`、`FLASHINFER_MLA`、`CUTLASS_MLA`、`TRITON_MLA`、`FLASH_ATTN_MLA`、`TOKENSPEED_MLA`…）等。
  - 非 MLA 模型在 CUDA 上的默认优先级：**SM100（Blackwell）为 FLASHINFER > FLASH_ATTN > TRITON_ATTN > FLEX_ATTENTION**；**其他架构（含 Hopper/Ampere）为 FLASH_ATTN > FLASHINFER > TRITON_ATTN > FLEX_ATTENTION**。
  - MLA 在 SM100 上优先 FLASHINFER_MLA；SM90 上优先 FLASH_ATTN_MLA、FLASHMLA。
  - https://github.com/vllm-project/vllm/blob/v0.32.0/vllm/v1/attention/backends/registry.py ，https://github.com/vllm-project/vllm/blob/v0.32.0/vllm/platforms/cuda.py

### SGLang
- RadixAttention 论文：Zheng et al., "SGLang: Efficient Execution of Structured Language Model Programs"，arXiv 2312.07104。原文："maintains an LRU cache of the KV cache for all requests within a radix tree"，以及 "up to 6.4x higher throughput"。https://arxiv.org/abs/2312.07104 ✅
- ❌ **默认调度策略是 `fcfs`，不是 `lpm`**。v0.5.22 `arg_groups/fields/schedule.py` 中写的是 `schedule_policy … = "fcfs"`，官方 server_arguments 文档的默认值也是 `fcfs`。可选值：`lpm, random, fcfs, dfs-weight, lof, priority, routing-key, hrrn, shortest-prefill-first`。v0.5.5、v0.5.10 时默认也已是 fcfs。另外两条规则：
  - 使用 `lpm`/`hrrn` 时，等待队列超过 128（`WAITING_QUEUE_PREFIX_MATCH_MAX`）会临时退化为 FCFS；
  - radix cache 关闭时，cache-aware 策略一律回退为 FCFS。
  - https://github.com/sgl-project/sglang/blob/v0.5.22/python/sglang/srt/arg_groups/fields/schedule.py
  - https://github.com/sgl-project/sglang/blob/v0.5.22/python/sglang/srt/managers/schedule_policy.py
  - https://github.com/sgl-project/sglang/blob/v0.5.22/docs/docs/advanced_features/server_arguments.mdx

---

## 6. P/D 分离（Prefill/Decode disaggregation）

- **DistServe**（Zhong et al., OSDI 2024，arXiv 2401.09670）✅ https://arxiv.org/abs/2401.09670
  - 核心论点：prefill 和 decode 放在一起会产生强烈的相互干扰，而且两个阶段的资源分配和并行策略被绑死。把两阶段放到不同 GPU 上，并针对 TTFT/TPOT 分别优化资源和并行度，再按集群带宽决定放置位置。
  - 论文声称："serve 7.4x more requests or 12.6x tighter SLO … within latency constraints for > 90% of requests"。
  - **goodput 定义（原文）**："per-GPU goodput, defined as the maximum request rate that can be served adhering to the SLO attainment goal (say, 90%) for each GPU provisioned"。
- **Splitwise**（Patel et al., ISCA 2024，arXiv 2311.18677；Microsoft Research 页面标注 "ISCA, June 2024"）✅ https://arxiv.org/abs/2311.18677
  - 核心论点：prompt 阶段计算密集，token 生成阶段访存密集且算力利用率低，可以放到更便宜、功耗更低的硬件上。按阶段拆到不同机器，通过高速背板传输 KV 状态。
  - 论文声称："1.4x higher throughput at 20% lower cost"，或 "2.35x more throughput with the same cost and power budgets"。
- **Mooncake**（Moonshot AI / 清华；**FAST '25 Best Paper**）✅
  - FAST 版标题为 "Mooncake: Trading More Storage for Less Computation — A KVCache-centric Architecture for Serving LLM Chatbot"。https://www.usenix.org/conference/fast25/presentation/qin
  - 核心论点：以 KVCache 为中心的分离架构（P/D 集群分离），利用 GPU 集群中闲置的 CPU/DRAM/SSD/NIC 构建全局 KVCache 池；调度器在满足 SLO 的前提下最大化吞吐；过载时采用基于预测的提前拒绝。
  - ⚠️ **两个版本的数字不同**：
    - FAST'25 摘要："increases the effective request capacity by 59%~498%"，生产环境中让 Kimi 在 A800 / H800 集群上分别 "handle 115% and 107% more requests"，"processing over 100 billion tokens daily"。
    - arXiv 2407.00079 摘要："up to a 525% increase in throughput in certain simulated scenarios"，"handle 75% more requests"。引用时请写明版本。https://arxiv.org/abs/2407.00079
- **vLLM KV connector / NIXL** ✅
  - 通过 `--kv-transfer-config` 配置，如 `{"kv_connector":"NixlConnector","kv_role":"kv_producer", "kv_connector_extra_config":{"backends":["LIBFABRIC"]}}`。NIXL 来自 https://github.com/ai-dynamo/nixl ，默认传输层为 UCX。
  - v0.32.0 中已注册的 connector：`NixlConnector, NixlPullConnector, NixlPushConnector, LMCacheConnectorV1, LMCacheMPConnector, MooncakeConnector, MooncakeStoreConnector, MoRIIOConnector(ROCm), MultiConnector, OffloadingConnector, SimpleCPUOffloadConnector, FlexKVConnectorV1, HF3FSKVConnector, ExampleConnector…`
  - 文档列出的 P/D 好处：分别调优 TTFT 与 ITL、控制尾部 ITL。
  - https://github.com/vllm-project/vllm/blob/v0.32.0/docs/features/disagg_prefill.md ，https://github.com/vllm-project/vllm/blob/v0.32.0/docs/features/nixl_connector_usage.md
- **SGLang P/D** ✅
  - `--disaggregation-mode {null,prefill,decode}`；`--disaggregation-transfer-backend` 默认为 **mooncake**，可选 `mooncake, nixl, ascend, …`。
  - 文档原文："Currently, we support Mooncake and NIXL as the transfer engine"。文档给出的动机是 prefill 打断 decode，以及 DP attention 下的负载不均。
  - https://github.com/sgl-project/sglang/blob/v0.5.22/docs/docs/advanced_features/pd_disaggregation.mdx ，https://github.com/sgl-project/sglang/blob/v0.5.22/python/sglang/srt/arg_groups/fields/disagg.py

---

## 7. 指标定义

- **NVIDIA NIM LLM Benchmarking 文档**（现在以 **AIPerf** 为准）✅ https://docs.nvidia.com/nim/benchmarking/llm/latest/metrics.html
  - TTFT："measures how long you wait before seeing the model's output"。第一个响应为空时不计入。
  - E2E request latency："how long it takes from submitting a query to receiving the full response"；e2e_latency = TTFT + Generation_time。
  - ITL："the average time between consecutive tokens"；**ITL = (e2e_latency − TTFT) / (Total_output_tokens − 1)**；**不包含第一个 token**。
  - ⚠️ NIM 文档说 ITL "is also known as time per output token (TPOT)"，即把 ITL 和 TPOT **视为同一个指标**。
- **GenAI-Perf** ⚠️ https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/perf_analyzer/genai-perf/README.html
  - 页面顶部写着 **"GenAI-Perf is being phased out"**，新需求请使用 AIPerf（https://github.com/ai-dynamo/aiperf）。
  - 它的 ITL 定义："Time between intermediate responses for a single request divided by the number of generated tokens of the latter response"，按每个响应计算，只覆盖中间响应，因此隐含排除首个响应。另有 Time to Second Token 指标。
- **vLLM 的区分不同**：`TPOT` 是单请求的 (E2EL − TTFT)/(N − 1)；`ITL` 是逐个 chunk 的间隔，所有请求汇总后再求分布（见第 5 节）。两者的均值和分位数一般不相等。
- **E2E ≈ TTFT + TPOT × (output_len − 1)**：对**单个请求**，在 vLLM 和 NIM 的定义下这是**恒等式**（TPOT 就是这样定义出来的）。⚠️ 对聚合统计**不成立**：mean(E2E) ≠ mean(TTFT) + mean(TPOT)·(mean(N) − 1)，P99 更不能相加。按 token 加权的 ITL 均值和按请求平均的 TPOT 也会不同。

---

## 8. FlashAttention 与 PagedAttention

- **FlashAttention-1**（Dao et al., NeurIPS 2022，arXiv 2205.14135）✅：IO-aware 的精确 attention，用 tiling 减少 HBM 与片上 SRAM 之间的读写，配合 online softmax（softmax 分块重缩放）和反向重计算，不需要实例化 N×N 矩阵。论文证明 HBM 访问量对一定范围的 SRAM 大小是最优的。https://arxiv.org/abs/2205.14135
- **FlashAttention-2**（arXiv 2307.08691）✅：减少非 matmul FLOPs；在序列维度上并行，单个 head 也能跨 thread block；改进 warp 间的工作划分。约为 FA1 的 2×，A100 上达到理论峰值的 **50–73%**。FA1 只有 25–40%。https://arxiv.org/abs/2307.08691
- **FlashAttention-3**（arXiv 2407.08608）✅：针对 Hopper，利用 warp specialization 和 TMA 让计算与数据搬运异步重叠，matmul 与 softmax 交错执行，并支持 FP8 块量化加 incoherent processing。原文："FA2 achieving only 35% utilization on the H100"；FA3 "speedup on H100 GPUs by 1.5-2.0× with FP16 reaching up to 740 TFLOPs/s (75% utilization), and with FP8 reaching close to 1.2 PFLOPs/s"。（740/989 ≈ 75%，即以 **dense** 峰值为分母。）https://arxiv.org/abs/2407.08608
- **PagedAttention / vLLM**（Kwon et al., SOSP 2023，arXiv 2309.06180）⚠️ https://arxiv.org/abs/2309.06180
  - **论文原文**没有 "60%–80%" 和 "<4%" 这两种写法：
    - "only **20.4% - 38.2%** of the KV cache memory is used to store the actual token states in the existing systems"（Fig. 2，换算成浪费即 61.8%–79.6%）；
    - Fig. 2 中 vLLM 的 token states 占 **96.3%**（换算浪费约 3.7%）；
    - 摘要写的是 "near-zero waste in KV cache memory"；
    - 吞吐："improves the throughput of popular LLMs by **2-4×** with the same level of latency compared to … FasterTransformer and Orca"。
  - "60%–80%" 和 "under 4%" 出自 **vLLM 官方博客**（2023-06-20）："existing systems waste 60% – 80% of memory due to fragmentation and over-reservation"；"near-optimal memory usage, with a mere waste of under 4%"。博客中的 "up to 24x vs HF, up to 3.5x vs TGI" 是另一组对比（LLaMA-7B/A10G、LLaMA-13B/A100-40GB，ShareGPT），不是论文的 2–4× 结论。https://vllm.ai/blog/2023-06-20-vllm （原 blog.vllm.ai 地址已 301 跳转到这里）

---

## 9. 端侧推理

- **llama.cpp GGUF 量化类型** ✅：K-quants（`Q2_K … Q6_K`，含 `_S/_M/_L` 混合变体）是按 super-block 分组的整数量化；`_M` 变体在 Q4_K 之外给部分张量用更高位宽（所以 bpw 高于 4.5；“具体哪些张量用 Q6_K”这次没逐行核对源码 ❓）。官方表（Llama-3.1-8B）：Q4_K_M = **4.8944 bpw / 4.58 GiB**；Q4_K_S = 4.6672 bpw；Q8_0 = 8.5008 bpw；F16 = 16.0005 bpw。`quantize.cpp` 中 `Q4_K` 是 `Q4_K_M` 的别名，"+0.1754 ppl @ Llama-3-8B"。另有 IQ 系列（基于 importance matrix）和 `MXFP4_MOE`。https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md ，https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/quantize.cpp
- **MLC-LLM** ✅：基于 Apache TVM 的机器学习编译 + 部署引擎（"Universal LLM Deployment Engine with ML Compilation"），一份模型编译到 CUDA/ROCm/Vulkan/Metal/WebGPU（WebLLM）/iOS/Android。https://github.com/mlc-ai/mlc-llm （⚠️ 没有正式 release，见第 5 节）
- **ExecuTorch** ✅：PyTorch 官方端侧运行时，流程为 `torch.export` 导出 → 针对后端 lower 成 `.pte` → 用 C++/Swift/Kotlin/JS 运行。后端有 XNNPACK、Core ML/MPS（apple）、Qualcomm、MediaTek、Arm、Vulkan、Samsung、MLX、WebGPU 等。https://github.com/pytorch/executorch
- **MLX** ✅：Apple 机器学习研究团队为 Apple silicon 做的数组框架，NumPy 风格 API，惰性求值，基于统一内存（不需要 CPU/GPU 拷贝）。LLM 推理通常用 `mlx-lm`。https://github.com/ml-explore/mlx
- **Apple 统一内存带宽** ✅
  - M4 Pro **273 GB/s**（最大 64 GB）；M4 Max **最高 546 GB/s**（最大 128 GB）——Apple Newsroom 2024-10-30：https://www.apple.com/newsroom/2024/10/apple-introduces-m4-pro-and-m4-max/
  - ⚠️ 截至 2026-10 的现款：M5 **153 GB/s**；M5 Pro **307 GB/s**；M5 Max 32 核 GPU 版 460 GB/s、40 核 GPU 版 **614 GB/s**（最大 128 GB）；M5 Ultra **1.2 TB/s**（最大 512 GB）。来源：https://www.apple.com/macbook-pro/specs/ ，https://www.apple.com/mac-studio/specs/ ，https://www.apple.com/newsroom/2026/03/apple-debuts-m5-pro-and-m5-max-to-supercharge-the-most-demanding-pro-workflows/
  - ⚠️ “M4 Max 546 GB/s”是**最高配**（40 核 GPU）。14 核 CPU / 32 核 GPU 的 M4 Max 低于此值（本次只核实了 Apple 写的 "up to 546GB/s"，低配具体数字未核实）。M5 Max 同理，有 460 和 614 两档。
- **Qualcomm / Android NPU 路径** ✅：Qualcomm AI Engine Direct SDK（源码中常称 **QNN**，属于 QAIRT 工具链）调用 Hexagon NPU。PyTorch 侧通过 ExecuTorch 的 Qualcomm backend 把模型 lower 成 QNN context binary，也可以走 Qualcomm AI Hub / Genie 等官方工具。ExecuTorch README 说明该后端 "implemented on the top of Qualcomm AI Engine Direct SDK"，并声明 "we do not offer any backward compatibility guarantees"。https://github.com/pytorch/executorch/blob/main/backends/qualcomm/README.md

---

## 10. 与常见说法不符 / 需要更正的点

1. ❌ **SGLang 默认调度策略是 `fcfs`，不是 `lpm`**（v0.5.22 源码和官方文档一致）。LPM 需要显式设置 `--schedule-policy lpm`；即使设置了，等待队列超过 128 时也会退化为 FCFS。
2. ❌ **vLLM `gpu_memory_utilization` 默认是 0.92**（v0.20.0 起；v0.15.0 时还是 0.9）。
3. ⚠️ vLLM `max_num_seqs` 不再一律是 256：H100/H200/B200 这类大显存卡上默认为 1024；`max_num_batched_tokens` 在 API server 场景下为 2048 / 8192 / 16384，按卡区分（A100 被特意排除在大默认值之外）。
4. ⚠️ **PagedAttention 的 "60–80% 浪费 / <4% 浪费" 出自 vLLM 博客，不是 SOSP 论文**。论文原文是 "only 20.4%–38.2% … used to store the actual token states"、vLLM 96.3%、"near-zero waste"、"2–4×"。"24× vs HF" 也只出现在博客里。
5. ⚠️ **RTX 4090 "330 TFLOPS FP16" 是 FP16 累加的值**；BF16 或 FP16 配 FP32 累加的 dense 值是 165.2 TFLOPS。660/1321 是 FP8 dense/稀疏值。
6. ⚠️ **Qwen3-32B 的 head_dim = 128 ≠ hidden_size/heads = 80**，用后者算 KV cache 会低估。Qwen3 的 max_position_embeddings 40960 也不是“原生上下文长度”。
7. ⚠️ **Mooncake 的 FAST'25 数字（59%–498%，+115%/+107% 请求量）与 arXiv 版（525%，+75%）不同**。
8. ⚠️ **TensorRT-LLM 最新正式版仍是 v1.2.1（2026-04-20）**，之后半年都是 rc（当前 v1.4.0rc1）。如果写“TRT-LLM 1.3/1.4”，需要标注为预发布。
9. ⚠️ **llama.cpp 已经有语义化版本**（最新 v0.7.0，2026-10-15），不再只有 `bNNNN` 构建号。v0.7.0 把 server 默认端口改为 9931（依据 release notes），旧教程里的 8080 可能失效。
10. ⚠️ MLC-LLM 没有可用的 GitHub release / 可信的最新版本号。
11. ⚠️ **NIM/AIPerf 把 ITL 和 TPOT 当成同义词**，vLLM bench 则把 ITL（逐 chunk 间隔）和 TPOT（单请求平均）分开统计，写文章时需要说明采用哪套定义。GenAI-Perf 已在淘汰中，由 AIPerf 接替。
12. ⚠️ **Chen et al. 的接受规则中 q/p 记号与 Leviathan 相反**（Chen：q = target，p = draft）。直接抄公式容易写反。
13. ⚠️ 官方 `meta-llama/Llama-3.1-*` 的 config.json 需要登录才能下载。表中数值来自 Meta `llama-models` 仓库和社区镜像，max_position_embeddings 只在镜像中核实过。
14. ⚠️ H100/H200 产品页**只列稀疏值**，989 TFLOPS 是除以 2 推出来的；B200 的单卡数字由 HGX 八卡总数 ÷ 8 推出。

## 未能核实 / 有保留的条目（❓）
- B200 单卡官方 datasheet 数字（只有 HGX/DGX 八卡汇总）。
- M4 Max 低配（32 核 GPU）的具体带宽。
- MLC-LLM 当前“最新版本”。
- Llama-3.1 官方 config.json 原文（gated）。
