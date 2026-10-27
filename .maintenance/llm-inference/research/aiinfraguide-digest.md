# AIInfraGuide 模块四（推理优化）研读摘要

- 来源：`caomaolufei/AIInfraGuide`，`docs/guides/模块四-推理优化/`，2026-10-26 通过 GitHub API 抓取 HEAD。
- 原文保存在 `research/aiinfraguide/`，文件名与原文一致。另外顺带保存了 1.1 和各章概览文件，第 3 章（nano-vllm）未下载。
- 用途：只用于核对系列文章的覆盖范围。下文"原文"引文逐字摘录，便于定位；正文写作不要照搬。
- 核查方法：
  - vLLM 的默认值直接读对应 tag 的源码（`gh api .../contents/...?ref=v0.19.0|v0.32.0`），再对照官方文档。
  - 论文数字以 arXiv 摘要为准。
  - 书中的手算例子都用 Python 重新跑过，结果全部一致，见文末"已验证无误的数值"。

## 整体结构与版本基线

| 章 | 实际状态 | vLLM 版本基线 |
|---|---|---|
| 1.2 vLLM 快速入门 | 完整正文（2026-04-15） | v0.19.0（"截至 v0.19.0（2026 年 4 月）"） |
| 第 2 章 2.1–2.5 | 完整正文（2026-07） | "main 分支"，未固定版本 |
| 第 4 章 4.1–4.6 | 完整正文（2026-10-06/07），质量最高 | v0.19.0 文档 |
| 第 5 章 5.1–5.5 | 完整正文（2026-10-26 更新） | v0.32.0（"2026-10-18 发布"，已核实 Release 页日期为 10 月 18 日） |
| 第 6、7、8、9 章 | **只有章节概览（约 2KB），没有小节正文** | — |
| 第 10 章 10.1 端侧 | 完整正文（2026-09-14） | ExecuTorch 1.3 |

章节编号有错乱，引用时需留意：
- 文件 `第8章-性能分析与Benchmark.md` 的标题是"第9章"，小节编号为 9.x。
- 文件 `第9章-生产部署与运维.md` 的标题是"第10章"，小节为 10.x。
- `第10章-端侧推理.md` 的小节写成"12.1"。
- 第 1 章概览列出的 1.1–1.5 小节（自回归、KV Cache、指标、Roofline、链路）与实际文件（1.1 LLM 推理基础、1.2 vLLM 快速入门）对不上。
- 2.2 提到"第 3 章 vLLM 调度器源码导读"，2.4 提到"第 3 章 vLLM 关键配置调优"，但第 3 章实际是 nano-vllm，属于过时的交叉引用。

---

## 1.2 vLLM 快速入门

### 主题与机制
- vLLM 的定位与核心优势：PagedAttention、Continuous Batching、OpenAI 兼容 API、多模型、多硬件、多种量化。
- 传统 KV Cache 的三个问题：内部碎片、外部碎片、无法共享。PagedAttention 与操作系统概念的对照表（页 ↔ KV Block、页表 ↔ Block Table、按需分页、CoW ↔ Beam Search 共享前缀）。
- 安装：uv（`--torch-backend=auto`）、conda + pip、ROCm、验证安装。
- 离线推理：`LLM` 与 `SamplingParams`，`llm.generate` 与 `llm.chat` 的区别（generate 不套 Chat Template），HF `generation_config.json` 会覆盖默认采样参数。
- 在线服务：`vllm serve`、Chat/Completions API、API Key、端点列表（`/v1/models`、`/v1/completions`、`/v1/chat/completions`、`/health`）。
- 参数调优：采样参数表、引擎参数表、显存分配公式、Attention Backend 选择。
- 多 GPU：TP 用法、模型规模与 GPU 配置表、五种并行（TP/PP/DP/EP/CP）。
- 排错：OOM、Chat 输出乱码、ModelScope（`VLLM_USE_MODELSCOPE=True`）、`--trust-remote-code`。

### 定量内容（原文逐字）
- §1："截至 v0.19.0（2026 年 4 月），项目在 GitHub 上已获得超过 76,000 星标，拥有 2,000+ 贡献者"
- §1.1："200+ 模型支持"
- §2.1："对于一个 13B 参数的模型，单个请求的 KV Cache 在最大序列长度下可能占用数 GB 显存"
- §2.2："如 16 个 token 为一个 Block"
- §3.1 系统要求："Python | 3.10 ~ 3.13"；"CUDA | 12.x"；"GPU | Compute Capability 7.0+（Volta 及以上）"；"Linux（推荐 Ubuntu 20.04+）"
- §3.4："目前 ROCm 支持 Python 3.12、ROCm 7.0，要求 `glibc >= 2.35`"；`--extra-index-url https://wheels.vllm.ai/rocm/`
- §4.1："默认情况下 vLLM 会使用 90% 的可用 GPU 显存"
- §4.3：`generation_config="vllm"`；§5.1：`--generation-config vllm`，"默认监听 `http://localhost:8000`"
- §5.4：`--api-key`、`VLLM_API_KEY`
- §6.1 采样默认值：temperature 1.0、top_p 1.0、"top_k | -1（不限制）"、"max_tokens | 16"、repetition_penalty 1.0、stop None、n 1、seed None；"推荐 `temperature=0.7, top_p=0.9` 作为起点"
- §6.2 引擎参数："`--gpu-memory-utilization` | 0.9（默认）"；"`--max-num-seqs` | 最大并发序列数 | 256"；`--dtype auto`；`--enforce-eager`（禁用 CUDA Graph）
- §6.3："总 GPU 显存 × gpu_memory_utilization = 模型权重 + KV Cache + 临时缓冲区"；示例 `--gpu-memory-utilization 0.85`、`--max-model-len 4096`
- §6.4：`--attention-backend FLASH_ATTN` / `FLASHINFER`；ROCm 用 `TRITON_ATTN`、`ROCM_ATTN`
- §7.2 显存表："7B | ~14 GB | 1× A100 80G / 1× L40S 48G"；"13B | ~26 GB | 1× A100 80G"；"34B | ~68 GB | 1× A100 80G（需降低 max_model_len）或 2× A100"；"70B | ~140 GB | 2× A100 80G"；"405B | ~810 GB | 16× A100 80G 或 8× H100 80G"
- §7.2："使用量化（如 AWQ INT4）可以将权重大小缩减约 4 倍"
- §8.1 OOM 示例：`--gpu-memory-utilization 0.8`、`--max-model-len 2048`、`--quantization awq`

### 类比与教学手段
- 餐厅包房：每桌独占一间包房，类比连续预分配。
- OS 虚拟内存对照表。

### 存疑与过时
1. **"405B ~810 GB … 或 8× H100 80G"有误**（把握很高）。8×80 GB = 640 GB，装不下 810 GB 的 FP16/BF16 权重。8×H100 跑 405B 需要 FP8 权重（约 405 GB），常见方案是 Meta 官方的 FP8 检查点。原文表头写的是 FP16，这一行自相矛盾。70B 用 2×80G 同样很紧：140 GB 权重放进 160 GB 后，KV 只剩约 4–10 GB，实际常用 4 卡。
2. **`gpu_memory_utilization` 默认值已改变**（把握很高）。v0.19.0 源码 `Field(default=0.9)`；v0.32.0 `vllm/config/cache.py` 为 `Field(default=0.92, gt=0, le=1)`，latest 文档写"If unspecified, will use the default value of 0.92"。按 v0.19 写 0.9 没错，新系列应写 0.92 或注明版本。https://docs.vllm.ai/en/latest/configuration/engine_args/
3. **`--max-num-seqs` 默认 256 只在部分条件下成立**（把握很高）。v0.19 与 v0.32 源码的 `get_batch_defaults` 中：
   - 普通 GPU：256。
   - 显存 ≥70 GiB 且不是 A100（H100/H200）：1024。
   - 显存 ≥160 GiB（B200/B300，仅 v0.32）：1024。
   - CPU：LLM 类 256×world_size，API Server 128×world_size。
   `max_num_batched_tokens` 也按 UsageContext 区分：普通 GPU 为 LLM 8192 / API 2048；H100 为 LLM 16384 / API 8192。
4. **Compute Capability 与 Python 版本已变化**（把握很高）。v0.19 文档写"Python: 3.10 -- 3.13""compute capability 7.0 or higher"，与原文一致。latest 文档改为"Python: 3.11 -- 3.14""compute capability 7.5 or higher"，Volta 已不在支持列表；v0.32.0 的 pyproject 为 `requires-python = ">=3.11,<3.15"`。latest 安装流程还多了 `vllm download-kernels`。ROCm 现有 rocm700/rocm721/rocm72/rocm100 多种 wheel，其中 rocm72 要求 glibc ≥ 2.39。https://docs.vllm.ai/en/latest/getting_started/installation/gpu/
5. **`top_k` 默认值**（把握中高）。v0.32 源码 `top_k: int = 0`（0 表示不限制）；早期版本是 -1，现在仍作为"禁用"被接受。另外，`max_tokens=16` 只是离线 `SamplingParams` 的默认值；OpenAI 兼容服务不传 `max_tokens` 时，默认生成到上下文用完，原文没有区分这两种情况。
6. **星标数字**无法回溯核实。2026-10-26 实测为 95,633。2026 年 4 月约 76k 是合理量级，建议写成"约"并注明日期。
7. **`--attention-backend`**：v0.19 文档确认存在（"auto"/None 为自动选择），没有问题。更早版本使用环境变量 `VLLM_ATTENTION_BACKEND`，新系列如需兼容旧版可以提一句。

---

## 2.1 PagedAttention

### 主题与机制
- 连续分配 + 按最大长度预留造成内部碎片和外部碎片。
- 虚拟内存分页类比；KV Block 与 CUDA thread block 是两回事。
- Block Table 示例：block_size=4、9 个 Token，⌈9/4⌉=3 个逻辑块，映射到物理块 #7/#2/#5；Decode 阶段按需追加新块。
- 分页如何消除两类碎片，浪费上限不到一个块。
- Kernel 视角：`physical_block_number` × 块跨度 + 头偏移 + 块内偏移；一个 Warp 逐块推进。原文注明 V0 Kernel 文档是"历史文档"。
- 内存共享：跨请求共享只读前缀；n>1 和 Beam Search 的块内分叉需要 Copy-on-Write 与 ref_cnt（类比 Linux `fork()`）。
- 抢占：Swapping（换出到 CPU）与 Recomputation（重新 Prefill）的对比表。
- 参数：`gpu_memory_utilization`、`block_size`、`enable_prefix_caching`、`max_num_seqs`。
- V1 源码：`KVCacheManager`（`get_computed_blocks`、`allocate_slots` 返回 None 时触发抢占、`free` 逆序释放）与 `BlockPool`。
- 空闲块用双向链表 `FreeKVCacheBlockQueue`，支持 `popleft_n` 和 O(1) 的中间删除 `remove`。
- 伪代码 `get_new_blocks`/`free_blocks`/`touch`；释放不清空内容；带哈希的块放在链表尾部，近似 LRU。
- **V1 没有 CoW**：只共享写满的块，n>1 拆成独立子请求（`parallel_sampling.py` 中的 `ParentRequest`）。V0 的 `cow_block_if_not_appendable` 已移除。
- 代价：间接寻址开销；`block_size` 过大或过小的权衡。

### 定量内容
- §1："最大可能生成 2048 个 Token … 实际可能只生成了 100 个 … 剩下 1948 个 Token 的空间"
- §2："`block_size` … vLLM 中常见取值为 16"
- §4："`block_size=16` 时最多浪费 15 个 Token 的空间"
- §5："一个 Warp（32 个线程组成的执行单元）"
- §8："`gpu_memory_utilization` … 官方文档给出的默认值约为 `0.9`"；代码示例 `block_size=16`、`max_num_seqs=256`
- 开头："实际利用率可能只有两三成"

### 类比
十人桌餐厅（内外碎片）、OS 分页、Linux fork 的 CoW、"收进抽屉 vs 把草稿扔了"（swap 与 recompute）。

### 存疑与过时
1. **"Kernel 文档是历史文档"**：已核实（把握很高）。v0.32 的 `docs/design/paged_attention.md` 写道："This is a historical document based on the original paper … It no longer describes the code used in vLLM today."
2. **抢占的两种方式**：§7 和 §10 把 Swapping 列为 vLLM 现有手段，但 V1 调度器只做 recompute（2.2 §6.3 也写了 `num_computed_tokens` 归零）。V0 移除后 swap 路径已不存在（把握高）。新系列应写明"swap 是论文和 V0 时代的方案"。KV offload 到 CPU 是另一套 connector/offloading 机制，不属于抢占。
3. **`block_size` 默认 16**：CUDA 上的常规 Attention 后端仍以 16 为主，但 v0.19 和 v0.32 的配置默认是 None（"use default"），由平台和后端决定。MLA 后端（如 FlashMLA）用 64，混合/Mamba 模型会放大块尺寸。写"常见 16"可以，写"默认 16"不严谨（把握中高）。
4. "利用率两三成"引自 vLLM 论文：现有系统 KV 有效利用率 20.4%–38.2%。原文没有标出处，可以接受。

---

## 2.2 Continuous Batching

### 主题与机制
- 批处理的价值：Decode 受访存限制，一次搬权重服务多个请求。
- Static Batching 的问题：批内请求互相拖累。
- Iteration-level Scheduling（Orca）：完成即退出，随时补入新请求。
- 每步调度循环：收请求 → 调度 → 前向 → 处理输出 → 释放块。
- 与 PagedAttention 的协同关系。
- V1 Scheduler：`running` 列表与 `waiting` 优先级队列（FCFS/PRIORITY），另有 `skipped_waiting`。
  - `schedule()` 先满足正在运行的请求，再接纳新请求，单步受 `token_budget = max_num_batched_tokens` 约束。
  - `update_from_output()` 追加 Token 并检查停止条件。
  - 抢占：FCFS 踢掉最后一个请求，PRIORITY 踢优先级最低的；`_preempt_request` 释放 KV 块，`num_computed_tokens` 归零，请求回到 waiting 队头，即默认 recompute。
- V1 源码注释"no 'decoding phase' nor 'prefill phase'"；`num_computed_tokens` 逐步追上 `num_tokens_with_spec`。
- 权衡：吞吐与延迟、Prefill 与 Decode 争抢、公平与效率；负载越高尾延迟越差。

### 定量内容
- §2："请求 A 可能生成 20 个 Token … 请求 B 却要生成 500 个"；"480 步"
- §2："Static Batching 下，GPU 利用率经常只有 **30% 左右**"
- §3："Continuous Batching 把 GPU 利用率从约 30% 拉到 **80% 以上**"

### 类比
通勤班车（批处理）、拼车要等所有人到站才能下车（Static）、招手即停的公交（Continuous）。

### 存疑与过时
1. **"30% → 80%+ GPU 利用率"没有出处**（把握中）。Orca 和 vLLM 论文报告的是吞吐倍数，不是这组利用率百分比。这个数字流传于一些博客，无法从主要文献核实，"GPU 利用率"的口径也没定义。建议不用，或改用论文数据：vLLM 论文称相对 FasterTransformer/Orca 吞吐提升 2–4×（https://arxiv.org/abs/2309.06180）。
2. §1 说批处理"几乎不牺牲单请求延迟"，只在 Decode 受访存限制时近似成立；Batch 变大后 TPOT 会上升，原文 §7 自己也提到了这一点。

---

## 2.3 Prefix Cache 与 RadixAttention

### 主题与机制
- 浪费来源：System Prompt、Few-shot、多轮对话。因果性保证相同前缀算出的 KV 相同。
- Prefix Cache 是 PagedAttention 块共享在时间维度上的延伸（空间维度对应并存请求，时间维度对应先后请求）。
- APC 块哈希：Hash(parent_hash, block_tokens, extra)，extra 包括 LoRA ID、多模态哈希、cache_salt；第一个块的父哈希是 `NONE_HASH`；只对写满的块计算哈希，因此命中总是按块对齐。
- 匹配流程：命中则跳过这部分 Prefill，主要改善 TTFT。
- V1 的"几乎免费的午餐"：预分配块池 + 双向链表实现 O(1) 操作，默认开启。
- 淘汰策略：ref_cnt>0 的块受保护；空闲块按 LRU；释放时逆序入队，尾块（最难被复用）优先淘汰。
- SGLang RadixAttention：Radix Tree 上做最长前缀匹配，淘汰也基于树的 LRU；与 vLLM 的对比表。
- 源码：块池、空闲链表、hash→block 表、request→blocks 表四种结构；V1 块表只追加，重复块会短暂共存。
- 适用场景：公共内容放在 Prompt 前部；收益有限的场景；多租户用 `cache_salt` 隔离。

### 定量内容
- §1："800 Token 的角色设定"；"相同的 10 个示例"
- §3.1："vLLM 自 v0.11 起默认使用 `sha256` 作为哈希算法，也可通过 `--prefix-caching-hash-algo` 切换为 `sha256_cbor`（跨语言可复现）、`xxhash`、`xxhash_cbor`"
- §3.3："即使命中率为 0% 性能也几乎不退化"

### 类比
标准合同模板。

### 存疑与过时
1. **"自 v0.11 起默认 sha256"不准确**（把握很高）。源码显示 v0.9.2、v0.10.0、v0.10.1 的默认值都是 `"builtin"`，**v0.10.2 已改为 `"sha256"`**。应写"自 v0.10.2 起"。可选值的说法与 latest 文档一致（sha256、sha256_cbor、xxhash、xxhash_cbor）。
2. "0% 命中率几乎不退化"、"V1 默认开启"：已核实（把握很高）。V1 Alpha 博客原文："less than 1% decrease in throughput even when the cache hit rate is 0%"，"we now enable prefix caching by default in V1"。v0.32 源码中默认值取 `model_config.is_prefix_caching_supported`，即只对支持的模型默认开启，pooling 等模型例外。https://vllm.ai/blog/2025-01-27-v1-alpha-release
3. vLLM 与 SGLang 的对比表偏简化。vLLM 的哈希链实际上也能处理树状共享，因为不同分支共享前缀块的哈希；区别主要在粒度（块对齐还是 Token 级）和淘汰策略。原文 §5 的"⚠️ 不要对立"段落已有所缓和，可以接受。

---

## 2.4 Chunked Prefill 与统一调度

### 主题与机制
- 长 Prefill 与 Decode 挤在同一步时，TPOT 出现尖刺（P99 抖动）。
- Chunked Prefill：把长 Prompt 切成多块分摊到多步，代价是长请求的 TTFT 略增（原文引用 SARATHI）。
- Token Budget 作为统一的调度单位：Decode 每请求占 1，Prefill 占 chunk 长度，总和不超过 token_budget。
- V1 统一调度器用 `{request_id: num_tokens}` 一种表示，同时覆盖 Chunked Prefill、Prefix Cache 和 Spec Decode。
- 源码："切块"其实就是 `min(need, token_budget)` 截断的自然结果，靠 `num_computed_tokens` 记账续块。
- 参数：`max_num_batched_tokens`（调大吞吐、调小 TPOT 更稳）与 `max_num_seqs`。
- 适用场景，以及与 Prefix Cache 叠加使用。

### 定量内容
- §1："4000 Token 的长 Prompt"、"Decode×8"
- §2："切成每块 512 Token，就分成 8 个 Chunk"
- §3："这一步最多处理 2048 个 Token"
- §5："若这一步只剩 512 预算，就只 Prefill 512，剩下 3488 留到后续步"
- 公式：∑Decode（每个 1 token）+ ∑Prefill Chunk ≤ token_budget

### 类比
流水线上的小包裹与集装箱，拆成标准箱逐个过检。

### 存疑与过时
1. **"V1 默认开启 Chunked Prefill"正确**（把握很高）。v0.32 源码 `_set_default_chunked_prefill_and_prefix_caching_args` 在 `enable_chunked_prefill is None` 时取 `model_config.is_chunked_prefill_supported`；对生成模型手动关闭会警告"does not officially support disabling chunked prefill"。新系列可以写"对生成模型默认开启且不建议关闭"。
2. §7 说离线纯吞吐场景"切块带来的调度开销未必划算"：在 V1 里切块无法关闭，也几乎没有额外开销，这句建议对 V1 已不适用（把握中高）。
3. §6 没有给出 `max_num_batched_tokens` 的默认值。实际默认值见 1.2 第 3 条（普通 GPU API Server 2048、H100 为 8192 等），新系列应补上。

---

## 2.5 Attention 后端与图优化

### 主题与机制
- Decode 的两重等待：等数据（受访存限制）和等指令（CPU launch 开销）。
- 可插拔 Attention 后端：FlashAttention（到 FA3）、FlashInfer、FlashMLA（MLA 模型）、Triton（可移植的兜底）；各后端数学上等价，工程实现不同。
- V1 统一调度需要后端支持 Prefill/Decode 混合批次（FA3）。
- CUDA Graph 先录制再重放，要求形状固定，只为一组预设 batch size 捕获（`cudagraph_capture_sizes`）。
- torch.compile 做算子融合，在服务开始前完成编译。
- Piecewise CUDA Graph：在 Attention 处切开计算图，Attention 部分走 eager。
- Full CUDA Graph 被描述为"进阶选项"。
- 源码：Attention 注册为不透明算子 `torch.ops.vllm.unified_attention_with_output`，按 `splitting_ops` 切成三种子图（首层、中间重复层、末层）；`compile_sizes` 触发 Inductor 自动调优，默认关闭。
- 编译缓存可拷贝复用；`VLLM_DISABLE_COMPILE_CACHE=1` 关闭缓存。
- 代价：启动变慢、额外显存、调试困难；排查问题时可用 eager 模式对比。

### 定量内容
- §1："每次启动本身有固定的 CPU 开销 … 量级在微秒级"；"每个 GPU Kernel 一跑就是几百微秒甚至毫秒"
- §6.3 代码：`cudagraph_capture_sizes=[1, 2, 4, 8, 16, 32]`、`compile_sizes=[1, 2, 4, 8]`

### 类比
秘书逐句传话与提前录好讲稿按播放键（CUDA Graph）。

### 存疑与过时
1. **"Piecewise 是通用的默认，Full 是特定场景的进阶选项"已过时**（把握很高）。vLLM 源码 v0.10.2 注释为"PIECEWISE. (v1 default)"，**v0.11.0 起改为"FULL_AND_PIECEWISE. (v1 default)"**，v0.32 同样如此。具体做法是：Decode 批次捕获 Full Graph（Attention 也在图内），混合或 Prefill 批次用 Piecewise。官方设计文档："If you're on v1 with piecewise compilation, we default to `FULL_AND_PIECEWISE` … (for pooling models, it's still `PIECEWISE`)"。§4"收益主要体现在 Decode、Prefill 难以套用"的叙述需要按此更新。https://docs.vllm.ai/en/latest/design/cuda_graphs/
2. `unified_attention_with_output` 作为 splitting op：已核实，v0.32 `compilation.py` 中有 `"vllm::unified_attention_with_output"`（把握很高）。
3. **"只有命中捕获尺寸才走重放，否则回退逐 Kernel 启动"不准确**（把握中高）。vLLM 会把 batch 填充到不小于实际大小的最近捕获尺寸再重放，只有超过最大捕获尺寸时才走 eager。原文漏掉了 padding 机制。
4. FA3 支持混合批次、V1 引入 Piecewise CUDA Graph、V1 相对 V0"up to 1.7x higher throughput"，均与 V1 Alpha 博客一致。

---

## 第 4 章 量化（4.1–4.6）

本章写得严谨，大量使用"取决于实现、需实测"的措辞，手算例子全部正确。

### 4.1 量化基础
**主题**
- 量化对象：权重、激活、KV；W4A16/W8A8 记号只说明权重和激活的位宽。
- 仿射量化公式（clip、round、scale、zero-point），区分量化与反量化。
- 对称（INT8 [-127,127]，不用 -128）与非对称。
- 8/4/2-bit 的编码数与误差。
- 张量轴约定 Y=XW（行为 Token，列为通道）。
- 粒度：per-tensor、per-channel、per-group、per-token。
- 校准；静态量化与动态量化。
- PTQ 与 QAT（Fake Quant、STE）。
- 纯 Python 离群值实验。

**定量内容**
- "7B … 16-bit 的纯数据约为 14 GB，4-bit 约为 3.5 GB"
- "令 $s=0.1,z=0$，$x=0.26$ 会被记录为 $q=3$，读回来得到 $\hat{x}=0.3$"；"若 $s=1/16$ … 编码为 4，再还原为 0.25"
- "$s=\frac{\max |x|}{127}$"；"使用 UINT8 的 $[0,255]$ 时，可以令 $s=6/255,z=0$"
- "$[a,b]=[-1,3]$，编码范围取 $[0,15]$，则 $s=4/15,z=4$。$x=1$ 对应 $q=8$，反量化为约 $1.067$"
- 位宽表："8-bit | 256 | $1/255\approx0.00392$ | 约 0.00196"；"4-bit | 16 | $1/15\approx0.06667$ | 约 0.03333"；"2-bit | 4 | $1/3\approx0.33333$ | 约 0.16667"；"4-bit 的间隔约为 8-bit 的 17 倍"
- "例如每 128 个权重一组"
- 实验："覆盖全部时，Scale 约为 $0.15748$ … 截断到 1 后 … 误差达到 19"
- 引用 ONNX QuantizeLinear："使用最近偶数舍入"

**类比**：基本没有类比，以数轴图和手算为主。

**存疑**：未发现问题。

### 4.2 W8A8 与 SmoothQuant
**主题**
- 激活通道离群值；per-token 量化无法消除 Token 内的通道差异。
- 等价变换 Y=(XS⁻¹)(SW)。
- α 迁移强度；平滑系数与量化 scale 是两个不同概念。
- 离线流程：统计 → 平滑 → 折叠进前置 LayerNorm（需处理 QKV 多个消费者）→ 量化导出。
- 运行时：INT8 输入、INT32 累加，再乘 a_t·b_k。
- 额外开销与适用条件；手算例子。

**定量内容**
- "某个通道却达到 80 … $s=80/127\approx0.63$"
- "$s_j=(\max_t|X_{tj}|)^\alpha/(\max_k|W_{jk}|)^{1-\alpha}$"；"$\alpha=0.5$ 可以作为理解公式的起点"
- "$[1,1,16]$ 与 $[2,2,0.5]$ 内积为 12 … 变成 $[1,1,2]$ 与 $[2,2,4]$"
- "直接量化得到约 12.094488，缩放后再量化得到约 12.063240"（已复算一致）

**存疑**：无。说明：α=0.5 是 SmoothQuant 论文对多数模型的默认值，GLM-130B 等模型用 0.75–0.85，原文写"起点"是对的。

### 4.3 Weight-only INT4（GPTQ / AWQ / Marlin）
**主题**
- W4A16 的存储与计算：打包（32-bit 容器装 8 个 INT4），在 Tile 内反量化后做 FP16 乘法。
- GPTQ：层输出重建目标、H=2XᵀX、二阶补偿公式、阻尼、Cholesky、更新块与 group size 的区别。
- AWQ：用激活统计找出敏感通道，配对缩放并搜索缩放系数，与 SmoothQuant 对比。
- Marlin：权重重排，在片上完成解包、反量化和 Tensor Core 计算，流水线预取。
- 比较框架：方法、格式、粒度、Kernel 分开看；排查顺序。

**定量内容**
- "一个 32-bit 容器放 8 个 4-bit 编码"
- "$\frac{4}{8}+\frac{2}{128}=0.515625\ \text{byte}$"（每 128 个权重共享一个 FP16 scale）
- "$E=\delta^\mathsf TX^\mathsf TX\delta,\ H=2X^\mathsf TX$"；"$\Delta w_F=-\frac{w_i-\widehat w_i}{[H_F^{-1}]_{ii}}[H_F^{-1}]_{:,i}$"
- 两维例子："$w_1=0.26$ 对应的重建值为 0.30，相当于多了 0.04 … 让它减少约 0.04"
- "Group Size 128"

**类比**：无，以概念区分为主。

**存疑**：无。GPTQ 补偿公式与 OBQ/GPTQ 论文一致。

### 4.4 KV Cache 量化
**主题**
- KV 显存公式；KV 量化与分页可以叠加；weight-only 量化不改变 KV 的字节数 b。
- 流式约束；K 误差先经过 softmax、V 误差进入 PV。
- KIVI：Key 按通道、Value 按 Token 分组，近期 Token 留在高精度 Residual Cache。
- FP8 KV：scale、校准路径、`calculate_kv_scales`、存储精度与计算路径的区别。
- 验证方法表；判断收益时看 KV Token 容量，而不是 nvidia-smi 的显存读数。

**定量内容**
- "$M_{\text{KV}}=2LBTH_{\text{KV}}db$"；"$L=32,H_{\text{KV}}=8,d=128$，单请求缓存 32768 个 Token … $2\times32\times32768\times8\times128\times2=4\ \text{GiB}$"；"改成 8-bit，纯数据约为 2 GiB；改成 2-bit，纯数据约为 0.5 GiB"（已复算）
- "每组最多只有四种编码"（2-bit）；"16-bit 降到 2-bit 的 8 倍"
- "`calculate_kv_scales=True` 在预热阶段用随机 Token 批次估计后固定 Scale"；"这个参数在 v0.19.0 启动时已带废弃告警，并在后续版本中移除"；"`kv_cache_dtype="fp8"` 在检查点没有 Scale 时会回落到 1.0"
- 代码：`kv_cache_dtype="fp8"`、`max_model_len=4096`

**存疑**
1. `calculate_kv_scales` 的废弃状态：已核实（把握高）。v0.19 文档写"will be removed in v0.19"，默认 False；latest engine args 页面已找不到该参数。原文"带废弃告警、后续移除"的说法正确。
2. **新系列需要补充的内容**：latest 文档的 `--kv-cache-dtype` 已经远不止 fp8。可选值包括 `fp8_e4m3`、`fp8_e5m2`、`fp8_per_token_head`、`int8_per_token_head`、`int4_per_token_head`、`nvfp4`、`fp8_ds_mla`、`turboquant_*` 等。原文按 v0.19 只讲 FP8，对写作时间点而言已偏窄。

### 4.5 FP8 与 NVFP4/MXFP4
**主题**
- 同一位模式按 INT 与 FP 解读结果不同。
- E4M3 与 E5M2 的取舍；浮点数间距随指数变化。
- FP8 同样需要 scale，不能用 round 模拟 FP8。
- Hopper 和 Ada 原生支持 FP8，旧卡只有 weight-only FP8 路径。
- E2M1 的可表示值；微块缩放；per-group 与 block-wise 的命名混乱。
- MXFP4 与 NVFP4 对比；元数据开销；硬件能力转化为收益的三个条件。

**定量内容**
- "`00111000` 按有符号 INT8 解释为 56 … 按常见 E4M3 … 表示 1.0"
- "E4M3 | 1 / 4 / 3 | 448"；"E5M2 | 1 / 5 / 2 | 57344"
- "在 $[1,2)$ 内，相邻值的间隔为 $1/8=0.125$；在 $[8,16)$ 内，间隔扩大为 1"
- "E4M3 可以精确表示 1.375 … INT8 选择 $s=0.125$ … 最大重建值随之降到 $127\times0.125=15.875$"
- E2M1："$0,\ 0.5,\ 1,\ 1.5,\ 2,\ 3,\ 4,\ 6$"；"0.5 是次正规数；上限是 6 … 最大正规数为 $2^2\times1.5$"
- "$W_{\text{torch}}\in\mathbb{R}^{256\times512}$ … Per-group，$G=128$ … 1024"；"二维 Block-wise，$128\times128$ … 8"
- "$10=1.25\times2^3$"（E8M0 只能表示 2 的幂，表示不了 10；E4M3 可以）
- 对比表："每个微块的元素数 | 32 | 16"；"微块 Scale | E8M0 … | E4M3"；"OCP MX 规范只定义微块 Scale，没有张量级 Scale | 通常再配一个张量级 FP32 Scale"
- "$\widehat x_i=s_{\text{tensor}}\,s_{\text{block}}\,q_i$"
- "MXFP4 每元素平均是 $4+8/32=4.25$ bit；NVFP4 是 $4+8/16=4.5$ bit"

**类比**：无。

**存疑**
- **NVFP4/MXFP4 细节全部正确**（把握很高）。NVIDIA 博客原文："each 16-value micro-block"；scale 用 "E4M3 FP8 … non-power-of-two scaling factors"；"a second-level FP32 scalar per tensor"；MXFP4 为 "1 shared power-of-two scale per 32 value block"、E8M0；"4.5 bits per value"。https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/ ；OCP MX v1.0 spec：https://www.opencompute.org/documents/ocp-microscaling-formats-mx-v1-0-spec-final-pdf
- E4M3 最大值 448 与 E5M2 最大值 57344：与 FP8 Formats 论文（arXiv 2209.05433）一致。
- 一处小的可补充点：MXFP4 的 E8M0 有一个 NaN 编码，原文已提到；NVFP4 block scale 用的是无符号使用的 E4M3。原文没写，不算错误。

### 4.6 量化选型与 vLLM 实战
**主题**
- 按瓶颈选择量化方案的决策树和表格。
- 方法、格式、数值类型、Kernel 四层分开看。
- `--quantization` 的作用；显式指定 awq 会锁死在慢路径上。
- 在线 FP8（Online Dynamic Quantization）。
- 实验：FP16 与 AWQ 对照的 serve 命令、离线吞吐脚本、质量冒烟测试、结果记录表、排错表。

**定量内容与 CLI**
- 启动参数：`--dtype half --max-model-len 4096 --max-num-seqs 32 --gpu-memory-utilization 0.9 --generation-config vllm --no-enable-prefix-caching`
- 脚本默认值："--num-prompts 64"、"--input-len 512"、"--output-len 256"、`max_num_batched_tokens=2048`、"测量三轮"、"输入与输出之和不能超过 … 4096"
- "显式写 `--quantization awq` 会关闭 vLLM 的 Kernel 自动升级 … 打印类似'you specified quantization=awq explicitly, so forcing awq'"
- 在线 FP8："除 `lm_head` 外的线性层权重转成 FP8 E4M3 并使用 Per-tensor Scale，激活在每次前向动态缩放"
- 算术冒烟题："$17\times24-89=319$"
- 工具：LLM Compressor、GPTQModel、NVIDIA Model Optimizer

**存疑**
1. awq 强制日志：已核实（把握很高）。v0.19 `awq_marlin.py` 中有 "however you specified quantization=awq explicitly, so forcing awq. Use quantization=awq_marlin for …"。
2. 在线 FP8 描述与 vLLM FP8 文档一致。
3. 全章使用 v0.19 基线，作者已多次提示版本问题，没有发现明显错误。

---

## 第 5 章 Speculative Decoding（5.1–5.5）

### 5.1 核心原理
**主题**
- 串行瓶颈；Draft + Verify 流程；Target 用类似 Teacher Forcing 的方式一次算出 γ+1 个分布。
- 贪心验收与随机验收：min(1,p/q)，拒绝后从残差 [p−q]₊ 采样。
- one-hot Draft（N-gram，以及 vLLM 的 `draft_sample_method="greedy"`）。
- 无损证明：接受路径 min(p,q) 加拒绝路径 [p−q]₊ 等于 p；接受率 A = 1 − TV(p,q)。
- 序列归纳；首个拒绝后必须停；额外 Token 的来源。
- KV 状态表（已提交、已接受、被拒、修正 Token 的 KV 需在下一轮计算）。
- 错误重采样实验；"无损"的边界（量化 Target、seed、近似验收、logits processor）。

**定量内容**
- "一轮实际会算出 $p_1,\ldots,p_{\gamma+1}$ 共 $\gamma+1$ 个分布"
- "每轮至少前进 1 个、至多 $\gamma+1$ 个 Token"
- 例子："Draft 猜了 4 个 Token，前 2 个通过 … 如果 4 个全部通过 … 一共前进 5 个 Token"
- "$A=1-\operatorname{TV}(p,q)$"；"$\beta=\sum_x[p(x)-q(x)]_+$"
- 实验 p=[0.6,0.3,0.1]、q=[0.2,0.5,0.3]："接受路径贡献 $[0.2,0.3,0.1]$，拒绝概率 0.4"；"错误规则得到 $[0.44,0.42,0.14]$：第二个 Token 被高估了 40%"；"one-hot Draft 的接受率只有 0.3"；"蒙特卡洛 100_000 次"
- vLLM：`draft_sample_method="greedy"`（默认）与 `"probabilistic"`

**类比**：主编与助手（助手先写草稿，主编批量审阅）。贯穿全章。

**存疑**：无。`draft_sample_method` 默认 greedy 已在 v0.32 源码核实。无损三层表述与 vLLM 文档一致（"theoretically lossless up to the precision limits of hardware numerics"、不保证 logprob 稳定）。

### 5.2 Draft 模型与无模型方案
**主题**
- 好 Proposer 的三个标准：便宜、准、能接上。
- 独立小模型：Draft 的成本看层数等结构，不只看参数量；一致性比基准分数重要；PARD 并行 Draft；额外显存挤占 KV。
- Tokenizer 兼容：映射、特殊 Token、模板；TLI 处理异构词表；Draft 的 `max_model_len` 要对齐。
- N-gram：查找窗口与提议长度是两个参数；vLLM 取最长且最早的匹配；KMP 变体；`ngram_gpu`。
- Suffix Decoding：后缀树、频次、prompt 树与全局树、动态长度、arctic-inference 依赖、多租户隐私。
- Prefix Cache 复用的是已算好的 KV，N-gram 提议的是候选 Token，两者不同。
- 指标口径：接受率 C/D、平均接受长度 1+C/R、候选覆盖率。
- 选型表。

**定量内容与 CLI**
- "`Qwen/Qwen3-8B` 搭配 `Qwen/Qwen3-0.6B`"
- PARD："`"parallel_drafting": true` 启用，官方示例给 `amd/PARD-Qwen3-0.6B` 配了 12 个候选"
- "`use_heterogeneous_vocab: true` … 只能用于 `draft_model` 方法，并且只支持默认的 `draft_sample_method="greedy"`"
- "`prompt_lookup_min` 和 `prompt_lookup_max`。两者都不设时默认为 5；只设一个时，另一个取同样的值"
- "该版本还新增了 `ngram_gpu` 方法"
- "`suffix_decoding_min_token_prob`（默认 0.1）"；"`suffix_decoding_max_cached_requests`（默认 10000），设为 0 即关闭"；"`num_speculative_tokens` … 文档建议设到 16 或 32"；"`pip install arctic-inference`"
- 公式：Acceptance Rate = C/D；Mean Acceptance Length = 1 + C/R；固定长度时 D = γR
- 指标名：`vllm:spec_decode_num_accepted_tokens_per_pos`
- 例子：`return` 出现 20 次、`raise` 出现 2 次

**类比**：招助手（工资、稿子质量、文件格式能不能打开）。

**存疑**
1. 以下各项已用 v0.32.0 `vllm/config/speculative.py` 核实（把握很高）：prompt_lookup 默认 5（源码注释为"arbitrarily chosen"）、suffix 0.1 与 10000、`use_heterogeneous_vocab` 只支持 draft_model + greedy、`parallel_drafting`（"Only compatible with EAGLE and draft model methods"）。https://github.com/vllm-project/vllm/blob/v0.32.0/vllm/config/speculative.py
2. **"v0.32 新增 `ngram_gpu`"不准确**（把握中高）。v0.19.0 的 `speculative.py` 中已有 6 处 `ngram_gpu`，说明这个方法至少从 v0.19 就存在，不是 v0.32 新增的。
3. PARD 的 12 个候选、`amd/PARD-Qwen3-0.6B` 未逐项核对官方示例，属于低风险细节。

### 5.3 Medusa、EAGLE 与 MTP
**主题**
- Self-Draft 方法对比表。
- Medusa：K 个残差单层 FFN 头，第 k 个头预测 t+k+1；稀疏候选树；Medusa-1（冻结骨干）与 Medusa-2（联合训练，相当于得到一个新的 Target）。
- Tree Attention：每个节点只看祖先；Position ID 按深度编号；最后只提交一条路径。
- EAGLE：基于 second-to-top-layer feature，加上"提前一步的 Token"，用 FC + 1 层 Decoder 构成草稿网络，权重与特定 Target 绑定。
- EAGLE-2：用置信度动态扩展和剪枝候选树，节点价值取路径上置信度的乘积，置信度只用于分配预算。
- EAGLE-3：去掉特征预测损失，融合低中高三层特征，Training-time Test。
- MTP（DeepSeek-V3）：顺序预测，h′ = M_k[RMSNorm(h); RMSNorm(Emb)]，共享 Embedding 与输出头。
- vLLM `method="mtp"`；DFlash 块扩散草稿。
- 树形 Mask 实验。
- Typical Acceptance（近似，不保分布）与 Block Verification（保分布）；vLLM 与 SGLang 对树的支持差异。

**定量内容与 CLI**
- Medusa："节点数是 $b^d$ 量级"
- EAGLE-2："$v(u)\approx\prod_{j\in\operatorname{path}(u)}c_j$"
- DeepSeek-V3："训练时只预测一个额外 Token（深度 $D=1$）… 第二个 Token 的接受率在 85%–90% 之间，解码速度（TPS）达到原来的 1.8 倍"
- vLLM："`deepseek_mtp`、`qwen3_5_mtp` 等模型专用名称已被废弃并自动改写为 `mtp`"；示例 `XiaomiMiMo/MiMo-7B-Base`、Gemma 4 assistant；"官方建议从 `num_speculative_tokens: 1` 开始调"
- DFlash："6 倍以上的无损加速，最高比 EAGLE-3 再快 2.5 倍"；`"method": "dflash"`
- Block Verification：`"rejection_sample_method": "block"`
- "vLLM v0.32.0：`eagle`、`eagle3`、`mtp` 都按**线性链**出草稿，没有树形验证"
- SGLang："`--speculative-eagle-topk` 大于 1 时构建草稿树 … `--speculative-num-steps` … `--speculative-num-draft-tokens` … V2 Overlap Scheduler 只支持 `topk=1`"

**类比**：只给主编配助手，还是连主编的写作习惯一起重训（Medusa-1 与 Medusa-2）；临摹主编脑中的草图，还是直接写出主编会写的字（EAGLE 与 EAGLE-3）。

**存疑**
1. **EAGLE-3 的三处改动正确**（把握很高）。arXiv 摘要："abandons feature prediction in favor of direct token prediction and replaces reliance on top-layer features with multi-layer feature fusion via a technique named training-time test"。原文没有给出 EAGLE-3 的加速数字；论文给的是"up to 6.5x, with about 1.4x improvement over EAGLE-2"，以及在 SGLang 中 batch 64 时吞吐提升 1.38x。新系列如引用数字可以用这两个。https://arxiv.org/abs/2503.01840
   - 需要指出一处细节：摘要说多层融合是"via training-time test"实现的，原文把 TTT 列为与融合并列的第三项改动。从论文正文看，TTT 是让去掉特征损失之后能够训练的机制，两种说法都说得通，不算错误。
2. DFlash：已核实（把握高）。arXiv 2602.06036，Chen、Liang、Liu，2026-02-05 提交，2026-05-28 更新 v2，ICML 2026；"over 6x lossless acceleration"，"up to 2.5x over EAGLE-3"。https://arxiv.org/abs/2602.06036
3. DeepSeek-V3 的 MTP 数字（85%–90%，1.8x TPS）与技术报告 §5.4.3 一致（把握高，凭记忆，未现场抓取）。https://arxiv.org/abs/2412.19437
4. **vLLM 树形草稿的历史需要补充**（把握高）。v0.11.0 与 v0.19.0 的 `speculative.py` 有 `speculative_token_tree` 参数，也有 `vllm/v1/attention/backends/tree_attn.py`（TREE_ATTN 后端），是实验性的 EAGLE 树形草稿。v0.32.0 中两者都已不存在。所以"v0.32 只有线性链"成立，但旧版本曾经支持过实验性树形草稿。新系列如写 vLLM 的树支持，应注明版本。
5. SGLang 参数：已核实（把握高）。文档原文："The overlap scheduler currently only supports `--speculative-eagle-topk 1`"，默认开启 overlap；显式设置 topk>1 会报错，需要用 `--disable-overlap-schedule`。另外，自动调参对 Llama/Grok 默认 topk=4、steps=5、draft tokens=8，其他模型多为 1/3/4，原文没写。https://docs.sglang.io/advanced_features/speculative_decoding.html
6. `rejection_sample_method` 的取值：v0.32 源码为 `Literal["standard","synthetic","block"]`；latest 文档还列出了有损的 `fly`（FLy Verification）。原文未提 FLy，新系列可以补上。
7. Block Verification 引用 arXiv 2403.10444（Sun et al.）正确。

### 5.4 收益边界与限制
**主题**
- 每轮提交 L = K+1；E[L] 用尾概率公式计算，不需要独立假设。
- 加速比 S ≈ T₀·E[L]/E[T_round]；验证不是免费的。
- 边际收益 a^(γ+1)；深度与宽度是两种预算。
- Dynamic SD 按并发分段设置投机长度；Adaptive Verification。
- 任务标签不等于性能结论。
- 高并发会占用原本空闲的算力，vLLM 的定性选择表；长上下文时候选 KV 的额外占用；抢占。
- 量化 Draft 与量化 Target 的区别，两种加速比不能直接相乘。
- 调度与流式输出：TPOT、ITL、TTFT；停止条件与结构化输出。
- 成本模型实验；上线前的四道门槛。

**定量内容与 CLI**
- "$\mathbb E[L]=1+\sum_{i=1}^{\gamma}\Pr(K\ge i)$"；"$\frac{1-a^{\gamma+1}}{1-a}$"；"$a=1$ 时取极限 $\gamma+1$"
- "$S\approx\frac{T_0\cdot\mathbb E[L]}{\mathbb E[T_{\text{round}}]}$"
- "$\Delta\mathbb E[L]=a^{\gamma+1}$"；"$a=0.8$ 时，第 1 个候选能带来 0.8 个预期 Token，第 8 个只能带来约 0.168 个"
- "`num_speculative_tokens_per_batch_size` … `[[1, 64, 3], [65, 128, 1], [129, 512, 0]]`"；"验证的有效 Batch 是 $B\times K$"
- "v0.32.0 中该功能在 EAGLE、EAGLE-3 和 DFlash 上测过，开启 Data Parallel 时会自动退回固定长度"；"Adaptive Verification … 目前只支持 DSpark"；"Dynamic SD 在 v0.32.0 中只有 V2 Model Runner 支持完整 CUDA Graph"
- "$M_{\text{candidate}}\approx B\cdot\gamma\cdot m_{\text{KV/token}}$"
- vLLM 定性表："EAGLE、MTP 在低 QPS 下收益高、高 QPS 下中到高；N-gram 和 Suffix 在低 QPS 下收益低到中"
- "v0.32.0 的发布说明里就修复过 DeepSeek-V4 系列 NVFP4 检查点上 Draft 接受率为 0% 的问题"
- 成本模型实验："便宜的那组在 $\gamma=4$ 时达到约 2.3 倍，到 $\gamma=8$ 反而回落；昂贵的那组只在 $\gamma\le2$ 时略快"。已复算：便宜组 γ=1/2/4/8 为 1.667/2.068/2.334/1.968，昂贵组为 1.139/1.052/0.785/0.428。
- 反例："量化快 1.5 倍、投机快 2 倍"推不出 3 倍

**类比**：主编审稿（审十页不可能和审一句一样快）。

**存疑**
1. DeepSeek-V4 NVFP4 0% 接受率的修复：已核实（把握高）。Release 页原文"fixes for NVFP4 checkpoints with 0% draft acceptance (#59655)"。https://github.com/vllm-project/vllm/releases/tag/v0.32.0
2. vLLM 定性选择表：已核实（把握高）。文档写"EAGLE and MTP … high gain at low QPS and medium to high gain at high QPS"，并注明"Real gains depend on…"。
3. `num_speculative_tokens_per_batch_size` 的结构为 (start, end, k) 闭区间：已核实。"仅在 EAGLE/EAGLE-3/DFlash 上测过""DP 时退回""V2 runner"等细节没有逐条核对。Release notes 里 Dynamic SD 相关条目叫"dynamic K in autoregressive speculators (#57053)"，归在 Model Runner V2 下，与原文"V2 runner"的说法大体吻合（把握中）。

### 5.5 vLLM 投机解码实战
**主题**
- 固定环境：`vllm[bench]==0.32.0`，保存 help 输出存档。
- 对照变量表（Target 统一为 Qwen3-8B，BF16，TP=1，KV auto，关闭 Prefix Cache，关闭 Thinking）。
- 代码组和对话组各 64 条 JSONL。
- 四组服务（baseline、ngram、draft_model、eagle3）。
- Suffix 与 MTP 的接入；`synthetic` 模式只能用于压测。
- 逐请求接受指标的字段；采集脚本（先加总 C、D、R 再求比值，D=0 时为 None）。
- `/metrics` 计数器取前后快照差值。
- `vllm bench serve` 的参数矩阵（task × 并发 1/8）；`--ignore-eos` 只用于性能测试。
- 质量对比；四种常见结果的解读；排错表；调参顺序。

**定量内容与 CLI**
- 公共参数：`--dtype bfloat16 --tensor-parallel-size 1 --kv-cache-dtype auto --max-model-len 4096 --max-num-seqs 16 --max-num-batched-tokens 4096 --gpu-memory-utilization 0.85 --no-enable-prefix-caching --generation-config vllm --seed 42 --per-request-spec-decode-metrics summary`
- N-gram：`{"method":"ngram","num_speculative_tokens":4,"prompt_lookup_min":2,"prompt_lookup_max":4}`
- Draft：`{"method":"draft_model","model":"Qwen/Qwen3-0.6B","num_speculative_tokens":4}`（"官方示例用的是 5 个候选"）
- EAGLE-3：`{"method":"eagle3","model":"RedHatAI/Qwen3-8B-speculator.eagle3","num_speculative_tokens":3}`
- Suffix：`{"method":"suffix","num_speculative_tokens":16,"suffix_decoding_max_cached_requests":0}`
- MTP：`XiaomiMiMo/MiMo-7B-Base`，`{"method":"mtp","num_speculative_tokens":1}`
- 指标字段：`num_spec_steps`、`num_draft_tokens`、`num_accepted_draft_tokens`、`acceptance_histogram`（长度 k+1）、`mean_acceptance_length`；`detailed` 模式额外有 `per_step_accepted`/`per_step_drafted`
- Prometheus：`vllm:spec_decode_num_drafts_total`、`..._num_draft_tokens_total`、`..._num_accepted_tokens_total`、`..._num_accepted_tokens_per_pos`
- 流式请求需要 `stream_options.include_usage: true` 或 `--enable-force-include-usage`
- bench：`--dataset-name custom --custom-output-len 128 --num-prompts 64 --num-warmups 4 --max-concurrency 1|8 --request-rate inf --ignore-eos --percentile-metrics ttft,tpot,itl --metric-percentiles 50,95,99`
- "旧的 `--speculative-model` 参数也已废弃"

**类比**：无新增类比。

**存疑**
1. `--per-request-spec-decode-metrics` 及其取值（detailed/none/summary，默认 none）：已核实（把握很高），见 latest engine args。
2. `--speculative-model` 早在 V0 移除时就已废弃（约 v0.9–0.10 期间），说"已废弃"没有问题。新系列只介绍 `--speculative-config` JSON 即可。
3. "`vllm[bench]` extra"、custom 数据集会在客户端套用 Chat Template 等实现细节未逐条核对，属于版本细节，低风险。

---

## 第 6 章 分布式推理（只有概览）

### 主题（计划中，无正文）
- 推理并行与训练并行的目标不同：推理关注显存、TTFT/TPOT 和吞吐。
- TP：按行/列切分权重，AllReduce，依赖 NVLink，通常不跨节点。
- PP：按层切分，适合跨节点；推理中的 Bubble 与 Micro-batch；TP×PP 组合。
- DP 复制多个引擎；EP 用 All-to-All 路由 MoE Token。
- Ray 多节点：Placement Group，TP/PP 在节点内外的映射，排错。
- vLLM 实战：`tensor-parallel-size`、`pipeline-parallel-size`、`data-parallel-size`。

### 定量内容
没有数字，只有 CLI 名称。

### 存疑
- 只有大纲。vLLM 现在也支持不依赖 Ray 的多节点方式（`--data-parallel-*` 的多节点参数、mp/external launcher 后端），大纲把多节点等同于 Ray，偏旧（把握中）。

---

## 第 7 章 PD 解耦架构（只有概览）

### 主题（计划中）
- 混合 Batching 的问题：Prefill 干扰 Decode。
- DistServe（OSDI'24）、Splitwise（ISCA'24）、TaiChi（聚合与解耦统一）、MLC Microserving。
- KV 传输：vLLM KV Connector 抽象，NIXL/NCCL 后端，带宽影响。
- Goodput 与 SLO 感知调度。
- P/D 资源池配比；何时该用、何时不该用解耦。
- vLLM Disaggregated Prefill 实战。

### 定量内容
- "**混合 Batching 的问题**定量分析 Prefill 对 Decode 的干扰：Decode P95 TPOT 可被拖慢 3-5 倍。"

### 存疑
1. **"P95 TPOT 拖慢 3–5 倍"没有出处**（把握中）。干扰程度取决于 Prompt 长度、是否开启 chunked prefill、batch 大小等，可以从接近 1 倍到 10 倍以上。DistServe 论文里有"单个 prefill 让 decode 延迟显著增加"的图，但没有"3–5×"这个通用结论。不要当成定论引用。
2. **DistServe 的论文数字**（把握很高）："7.4x more requests or 12.6x tighter SLO, compared to state-of-the-art systems"，OSDI 2024。https://arxiv.org/abs/2401.09670 。概览没有引用这些数字，新系列可以用。
3. **Mooncake**：模块四中没有出现（全文 grep 无结果）。Kimi 的 Mooncake（KVCache-centric 解耦，FAST'25 最佳论文）和 LMCache、llm-d、Dynamo 都属于这个主题，原文没有覆盖，是需要补的空白。
4. Splitwise 为 ISCA'24：正确。

---

## 第 8 章（文件名）/"第 9 章"（标题）性能分析与 Benchmark（只有概览）

### 主题（计划中）
- 指标体系：QPS、TTFT（P50/P95）、TPOT（P50/P95）、Throughput、显存峰值、GPU 利用率。
- 工具：`vllm bench serve` / `latency` / `throughput`、GenAI-Perf、Triton Perf Analyzer，自定义压测脚本，可复现的配置管理。
- 剖析工具：torch.profiler、Nsight Systems、Nsight Compute。
- 权威基准：MLPerf Inference（Datacenter）。
- 回归门禁："如 TPOT P95 退化 > 5% 则 Block Merge"，以及 CI、git bisect + Nsight 定位。
- 动手实验：用 bench 生成报告，模拟性能退化后用 nsys 定位。

### 定量内容
- "TPOT P95 退化 > 5% 则 Block Merge"（示例阈值，不是事实陈述）

### 存疑
- GenAI-Perf 已被 NVIDIA 并入/更名为 AIPerf（2025 年下半年起，原 GenAI-Perf 仓库指向 AIPerf）。把握中，建议写作前再核实一次。

---

## 第 9 章（文件名）/"第 10 章"（标题）生产部署与运维（只有概览）

### 主题（计划中）
- 容器化与 K8s：GPU 资源请求；模型加载慢，探针阈值要放宽；镜像与权重拉取策略；vLLM Production Stack、KServe。
- 可观测性：Prometheus 指标（TTFT、TPOT、running/waiting、KV 利用率、抢占）、Grafana、结构化日志。
- 扩缩容与负载均衡：按 QPS、队列长度、KV 利用率做 HPA；前缀感知路由。
- 安全："vLLM 的 OpenAI 兼容服务默认不做认证"，需要在网关层加 API Key、TLS 和网络隔离。
- 容量规划：根据 SLO、峰值 QPS、单副本吞吐、显存和冗余系数推算 GPU 数量。

### 定量内容
无。

### 存疑
- 大纲未提及 llm-d、NVIDIA Dynamo、AIBrix 等较新的 K8s 推理编排方案，也未提及 Gateway API Inference Extension，可以作为补充方向。

---

## 第 10 章 10.1 端侧推理基础

### 主题与机制
- 端侧、边缘、云的区别；端侧部署的四个动机（延迟、离线、隐私、成本）。
- 四类约束：内存与存储（单个 App 的内存上限）、功耗与散热（降频，关注稳态性能）、硬件碎片化、App 生命周期。
- 部署链路：训练框架 → 导出（torch.export/ONNX）→ 图变换 → 后端编译/委托 → 端侧程序（.pte/.onnx/.tflite/.mlpackage）→ Runtime → App。区分格式/IR、Runtime、Backend/Delegate 三个层次；图分区与委托。
- CPU（NEON/SVE、大小核调度、XNNPACK）、GPU（Vulkan/Metal/OpenCL，搬运成本）、NPU（算子边界严格）、DSP（常驻低功耗任务）。
- 运行时对比表：ExecuTorch、ORT Mobile、LiteRT、Core ML、ncnn、MNN、llama.cpp、MLC LLM。
- 优化四个方面：压缩（剪枝、蒸馏、低秩分解）、量化（PTQ/QAT/weight-only/per-channel，"不一定加速"）、图优化（常量折叠、Conv-BN 融合、Layout、静态形状）、内存规划（Buffer 复用、mmap、KV 精度）。
- 可复现的 Benchmark：环境、指标（冷启动、P50/P90/P99、峰值内存、包体积、功耗与温度；LLM 还要看 TTFT、TPOT、Prefill/Decode tok/s、最大上下文）、8 步实验协议、YAML 记录模板。
- ExecuTorch + XNNPACK 最小例子：`torch.export.export` → `to_edge_transform_and_lower(partitioner=[XnnpackPartitioner()])` → `to_executorch()` → `.pte`。
- 排错：导出失败、精度对不上（RGB/BGR、归一化、NCHW/NHWC）、NPU 比 CPU 慢、首次运行慢、持续运行变慢。
- 选型流程图。

### 定量内容
- "$M_{weights} \approx P \times \frac{b}{8}$"；"3B 模型 … FP16/BF16 | 6 GB；INT8 | 3 GB；INT4 | 1.5 GB"
- "$M_{KV} \approx 2 \times L \times B \times T \times H_{kv} \times D \times s$"
- "物理内存有 8 GB 并不代表模型可以使用全部 8 GB"
- YAML 模板：`threads: 4`、`warmup_runs: 10`、`measured_runs: 100`
- 示例模型输入 `torch.randn(1, 3, 224, 224)`，Conv 3→8→16，Linear 16→10
- "基于 ExecuTorch 1.3 文档所展示的导出接口"

### 类比
无，以表格和流程图为主。

### 存疑
1. ExecuTorch 1.3：已核实存在（1.3.0 仅发布到 Maven，1.3.1 于 2026-05-28/29 广泛发布），之后已有 1.4.0（把握中高）。https://newreleases.io/project/pypi/executorch/release/1.3.1 ；https://newreleases.io/project/pypi/executorch/release/1.4.0 。新系列应以 1.4 为基线，重新核对 API。
2. 本节的 LLM 内容很少，主体是通用的端侧 CV/分类部署。没有讲端侧 LLM 的具体技术：GGUF 量化类型（Q4_K_M 等）、Prefill/Decode 在手机 SoC 上的瓶颈、内存带宽决定的 tok/s 上限、投机解码在端侧的应用、Apple Foundation Models / Gemini Nano 等系统级模型。如果系列要讲端侧 LLM，需要另外找资料。

---

## 已验证无误的数值（Python 复算）

- 4.2 SmoothQuant：12.0 / 12.0 / 12.094488 / 12.06324
- 4.1：非对称例子 s=4/15、z=4、q=8、反量化约 1.0667；位宽间隔比 17；Scale 20/127 ≈ 0.15748
- 4.3：0.515625 byte；4.4：4 GiB；4.5：E4M3 位模式、1.375、15.875、4.25/4.5 bit、Scale 数量 1024/8
- 5.1：[0.44, 0.42, 0.14]，one-hot 接受率 0.3
- 5.4：E[L] 在 γ=1/2/4/8 时为 1.8/2.44/3.362/4.329；0.8⁸ ≈ 0.168；成本模型数字同上

## 主要更正汇总

| # | 位置 | 原文说法 | 实际情况 | 把握 |
|---|---|---|---|---|
| 1 | 1.2 §7.2 | 405B FP16 约 810 GB，可用 8×H100 80G | 640 GB 装不下，需要 FP8 | 很高 |
| 2 | 1.2 §6.2、2.1 §8 | `gpu_memory_utilization` 默认 0.9 | v0.19 是 0.9，v0.32 是 0.92 | 很高 |
| 3 | 1.2 §6.2 | `max_num_seqs` 默认 256 | 按硬件和 UsageContext 区分：H100/H200/B200 为 1024，CPU API 为 128×ws | 很高 |
| 4 | 1.2 §3.1 | Python 3.10–3.13，CC 7.0+ | 对 v0.19 成立；latest 为 Python 3.11–3.14、CC 7.5+ | 很高 |
| 5 | 1.2 §6.1 | top_k 默认 -1 | v0.32 默认 0（同样表示禁用）；在线 API 的 max_tokens 默认不是 16 | 中高 |
| 6 | 2.1 §7/§10 | 抢占可以选 swap | V1 只做 recompute | 高 |
| 7 | 2.2 | GPU 利用率 30% → 80%+ | 无主要文献出处 | 中 |
| 8 | 2.3 §3.1 | 自 v0.11 起默认 sha256 | 自 v0.10.2 起（v0.10.1 及以前是 builtin） | 很高 |
| 9 | 2.5 §5 | 默认 Piecewise，Full 是进阶选项 | v0.11 起默认 FULL_AND_PIECEWISE | 很高 |
| 10 | 2.5 §4 | 未命中捕获尺寸就回退 eager | 填充到最近的捕获尺寸，只有超过最大尺寸才走 eager | 中高 |
| 11 | 2.4 §7 | 离线场景切块未必划算 | V1 无法关闭切块，开销可以忽略 | 中高 |
| 12 | 5.2 §4.1 | v0.32 新增 ngram_gpu | v0.19 已经存在 | 中高 |
| 13 | 5.3 §9.3 | vLLM 只有线性链 | v0.32 成立；v0.11–v0.19 曾有实验性的 `speculative_token_tree` 和 TREE_ATTN | 高 |
| 14 | 第 7 章概览 | P95 TPOT 被拖慢 3–5 倍 | 无出处，强依赖负载 | 中 |
| 15 | 第 7 章 | （未提 Mooncake） | 覆盖空白 | — |
| 16 | 4.4 | 只讲 FP8 KV | latest 已支持 int8/int4 per-token-head、nvfp4 等多种 KV dtype | 很高 |

其余核对过的点确认无误：V1 Prefix Cache 默认开启且 0% 命中时吞吐下降不到 1%；V1 Chunked Prefill 默认开启；NVFP4 为 16 元素、E4M3 block scale 加 FP32 tensor scale、4.5 bit；MXFP4 为 32 元素、E8M0；E4M3/E5M2 最大值为 448/57344；EAGLE-3 的三处改动；DFlash 的 6×/2.5×；DistServe OSDI'24；SGLang overlap 只支持 topk=1；vLLM 投机解码的各项默认值（prompt_lookup 5、suffix 0.1/10000、greedy、standard/synthetic/block）；awq 强制日志；`calculate_kv_scales` 已废弃；PagedAttention Kernel 文档为历史文档；`unified_attention_with_output` 作为 splitting op。

---

## 覆盖清单

**1.2 vLLM 入门**
- vLLM 的定位与核心特性（PagedAttention、Continuous Batching、OpenAI API、多硬件、多量化格式）
- 传统 KV Cache 的三个问题：内部碎片、外部碎片、无法共享
- 安装：uv `--torch-backend=auto`、conda、ROCm wheel、版本验证
- 离线推理：`LLM` 与 `SamplingParams`
- `llm.chat` 与 `llm.generate` 的区别，Chat Template 的重要性
- HF `generation_config.json` 覆盖默认值，`--generation-config vllm`
- `vllm serve` 与 OpenAI 兼容 API（Chat/Completions/models/health）
- API Key 认证（`--api-key`、`VLLM_API_KEY`）
- 采样参数及其默认值（temperature、top_p、top_k、max_tokens、repetition_penalty、stop、n、seed）
- 引擎参数（gpu-memory-utilization、max-model-len、dtype、quantization、max-num-seqs、enforce-eager）
- 显存分配公式：权重 + KV + 临时缓冲
- Attention Backend 的手动选择（`--attention-backend`）
- 张量并行的使用；模型规模与 GPU 数量的估算
- vLLM 五种并行方式（TP/PP/DP/EP/CP）概述
- 常见排错：OOM、乱码、ModelScope、trust-remote-code

**2.1 PagedAttention**
- 连续分配 + 按最大长度预留导致的碎片
- OS 虚拟内存分页类比
- Block Table：逻辑块到物理块的映射与按需分配
- 分页消除内部和外部碎片，浪费上限不到一个块
- Kernel 寻址：physical_block_number 与 offset
- 跨请求只读共享前缀，引用计数
- Copy-on-Write（论文和 V0），并行采样与 Beam Search 的分叉
- 抢占：swap 与 recompute
- 相关参数：gpu_memory_utilization、block_size、enable_prefix_caching、max_num_seqs
- V1 的 KVCacheManager 与 BlockPool 分工
- 空闲块双向链表（O(1) 中间删除）
- ref_cnt、touch，释放后内容保留，近似 LRU
- V1 为什么不需要 CoW（只共享满块，n>1 拆成子请求）
- block_size 的权衡与间接寻址的代价

**2.2 Continuous Batching**
- 批处理摊薄权重搬运（Decode 受访存限制）
- Static Batching 的批内拖累
- Iteration-level Scheduling（Orca）：完成即退出，随时补入
- 每步调度循环
- Continuous Batching 与 PagedAttention 的协同
- V1 Scheduler：waiting/running 队列，FCFS/PRIORITY 策略
- token_budget 与运行中请求优先
- 抢占受害者的选择，V1 默认 recompute（num_computed_tokens 归零）
- 调度权衡：吞吐与延迟、Prefill 与 Decode 争抢、公平性；负载敏感的尾延迟

**2.3 Prefix Cache**
- 共享前缀场景：System Prompt、Few-shot、多轮对话
- 因果性保证相同前缀的 KV 相同
- Prefix Cache 是块共享在时间维度上的延伸
- APC 链式块哈希（parent hash、tokens、extra：LoRA、多模态、cache_salt）
- 只对满块计算哈希，命中按块对齐
- 哈希算法选择（sha256、sha256_cbor、xxhash）
- 命中跳过 Prefill，主要降低 TTFT
- V1 零开销前缀缓存且默认开启
- LRU 与引用计数淘汰；逆序释放让尾块先被淘汰
- SGLang RadixAttention（Radix Tree 最长前缀匹配）及其与 APC 的对比
- 块池、空闲链表、hash 表、request 表四种结构；只追加块表下的重复块
- 把公共内容放到 Prompt 前部
- 多租户缓存隔离（cache_salt）

**2.4 Chunked Prefill**
- 长 Prefill 拖慢同批 Decode（TPOT 尖刺）
- Chunked Prefill 的切块机制及其 TTFT 代价（SARATHI）
- Token Budget 作为统一调度单位
- V1 统一调度 `{request_id: num_tokens}`，同时覆盖 chunked、prefix、spec
- min(need, budget) 截断即切块，num_computed_tokens 续块
- max_num_batched_tokens 与 max_num_seqs 的调优权衡
- Chunked Prefill 与 Prefix Cache 叠加

**2.5 Attention 后端与图优化**
- CPU kernel launch 开销成为 Decode 瓶颈
- 可插拔 Attention 后端（FA/FA3、FlashInfer、FlashMLA、Triton）
- 混合 Prefill/Decode 批次需要后端支持
- CUDA Graph 录制与重放，形状固定，按 batch size 捕获
- torch.compile 算子融合，服务前预编译
- Piecewise CUDA Graph（在 Attention 处切图）
- Full CUDA Graph
- 不透明算子 unified_attention_with_output 与 splitting_ops
- 三种子图（首层、中间重复层、末层）
- cudagraph_capture_sizes 与 compile_sizes（Inductor 自动调优）
- 编译缓存与 VLLM_DISABLE_COMPILE_CACHE
- 图优化的代价：启动时间、显存、调试；用 eager 模式对照

**4.1 量化基础**
- 量化对象：权重、激活、KV；W/A 记号的含义
- 仿射量化与反量化公式，scale 与 zero-point
- 舍入误差与截断误差
- 对称量化（INT8 用 [-127,127]）
- 非对称量化与零点
- 位宽与编码数、误差（8/4/2-bit）
- 张量轴约定（Token 行、通道列）
- 量化粒度：per-tensor、per-channel、per-group、per-token
- 校准与校准集的代表性
- 静态激活量化与动态激活量化
- PTQ 与 QAT（Fake Quant、STE）
- 离群值对共享 scale 的影响

**4.2 SmoothQuant**
- INT8 W8A8 与激活通道离群值
- 等价变换 XW = (XS⁻¹)(SW)
- 平滑系数 α
- 平滑系数与量化 scale 的区别
- 折叠进前置算子（多个消费者需一致处理）
- INT8 GEMM 用 INT32 累加，再乘回 scale
- W8A8 的额外开销与适用条件

**4.3 Weight-only INT4**
- W4A16 的打包存储，Tile 内反量化
- group scale 的存储开销
- GPTQ：层输出重建目标与 Hessian H = 2XᵀX
- GPTQ 二阶误差补偿、阻尼、Cholesky、分块
- 更新块与 group size 的区别
- AWQ：激活感知的敏感通道与缩放搜索
- AWQ 与 SmoothQuant 的对比
- Marlin kernel：重排、片上解包、流水线
- 方法、格式、粒度、Kernel 四层分开看；公平对比与排查流程

**4.4 KV Cache 量化**
- KV 显存公式与压缩收益计算
- KV 量化与分页叠加；weight-only 量化不影响 KV
- 流式写入约束；K 和 V 误差的传播路径不同
- KIVI：Key 按通道、Value 按 Token 分组
- KIVI 的 Residual Cache 与实际压缩比
- FP8 KV Cache 及其 scale 与校准（calculate_kv_scales）
- 存储精度与 Attention 计算精度的区别
- 长上下文收益的验证方法（KV Token 容量，而非显存读数）

**4.5 FP8 / NVFP4 / MXFP4**
- 整数编码与浮点编码的区别
- E4M3 与 E5M2（范围与精度）
- FP8 非均匀的数值间距
- FP8 同样需要 scale
- Hopper/Ada 原生 FP8 与旧卡的 weight-only FP8
- FP4 E2M1 的可表示值
- 微块缩放（micro-block scaling）
- per-group、1D block、2D block 的命名与形状
- MXFP4（32 元素、E8M0 scale）
- NVFP4（16 元素、E4M3 scale、FP32 tensor scale）
- 元数据开销（4.25 与 4.5 bit）
- 硬件、格式、Kernel、负载四个条件缺一不可

**4.6 量化选型与 vLLM 实战**
- 按瓶颈选择量化的决策树
- vLLM 识别量化检查点（compressed-tensors、GPTQ、AWQ、FP8、NVFP4）
- `--quantization awq` 会锁定在慢路径（awq_marlin 自动升级）
- 在线动态 FP8 量化
- 离线量化工具（LLM Compressor、GPTQModel、Model Optimizer）
- FP16 与 AWQ 对照实验设计（控制变量、离线吞吐、记录 Kernel）
- 质量评测：冒烟测试与正式任务集，PPL 的局限
- 结果解读与常见问题

**5.1 投机解码原理**
- 串行瓶颈与 Draft + Verify 流程
- 用一次 Target 前向并行验证（Teacher Forcing）
- 贪心验收
- 随机验收：min(1, p/q) 与残差分布
- one-hot Draft 的验收
- 无损证明；接受率 = 1 − TV
- 首个拒绝后停止，额外 Token 的来源
- KV 回退与状态管理（已提交、已计算、临时）
- "无损"的边界（量化 Target、seed、近似验收、logits processor）

**5.2 Draft 与无模型方案**
- Proposer 的三个标准：便宜、准、能接上
- 独立 Draft 模型的选择（一致性优先，层数影响延迟）
- PARD 并行 Draft
- 额外 Draft 占用显存、挤压 KV 容量
- Tokenizer、模板、上下文长度的兼容性；异构词表 TLI
- N-gram / Prompt Lookup（窗口与提议长度，最长且最早匹配）
- ngram_gpu
- Suffix Decoding（后缀树、频次、动态长度、全局树隔离）
- Prefix Cache 与 Token 提议的区别
- 指标口径：接受率 C/D、平均接受长度 1+C/R、候选覆盖、位置接受率

**5.3 Medusa / EAGLE / MTP**
- Self-Draft 的思路（复用 Target 表示）
- Medusa 多头与稀疏候选树；Medusa-1 与 Medusa-2
- Tree Attention 的 Mask 与 Position ID
- EAGLE：特征 + 提前一步的 Token
- EAGLE-2 动态树（路径置信度乘积）
- EAGLE-3（去掉特征损失、多层融合、Training-time Test）
- MTP（DeepSeek-V3 顺序 MTP 模块）及 vLLM `method=mtp`
- DFlash 块扩散草稿
- Typical Acceptance（有损）
- Block Verification（保分布）
- 框架实现差异（vLLM 线性链，SGLang 树与 topk）

**5.4 收益边界**
- 每轮提交长度与 E[L] 尾概率公式
- 加速条件与完整的单轮耗时
- 验证成本随候选数增长
- 投机长度的边际收益 a^(γ+1)；深度与宽度两种预算
- Dynamic Speculative Decoding（按并发分段）
- Adaptive Verification
- 任务类型与重复结构
- 高并发下收益下降（vLLM 定位于中低 QPS）
- 长上下文下候选 KV 的开销与抢占
- 投机与量化叠加（量化 Draft 与量化 Target 的区别，加速比不可直接相乘）
- 调度交互与流式输出（TPOT、ITL、TTFT）
- 停止条件与结构化输出
- 上线前的四道门槛

**5.5 vLLM 投机实战**
- 环境与版本存档
- 对照实验的变量控制
- 构造代码组与对话组工作负载
- `--speculative-config`：ngram、draft_model、eagle3、suffix、mtp
- synthetic 模式只用于压测
- 逐请求接受指标（`--per-request-spec-decode-metrics`）
- 先加总再求比值的汇总方式
- Prometheus spec_decode 计数器与快照差值
- 用 `vllm bench serve` 做投机解码的性能对照（ignore-eos、并发矩阵）
- 质量对照与结果解读
- 排错表与调参顺序

**第 6 章 分布式推理（大纲）**
- 推理并行与训练并行的目标差异
- 张量并行推理（AllReduce、NVLink、不跨节点）
- 流水线并行推理（跨节点、Bubble、Micro-batch、TP×PP）
- 数据并行
- 专家并行（MoE All-to-All）
- Ray 多节点部署（Placement Group、并行度映射）
- vLLM TP/PP/DP 部署实战

**第 7 章 PD 解耦（大纲）**
- Prefill 与 Decode 混合批次的互相干扰
- DistServe
- Splitwise
- TaiChi（聚合与解耦统一）
- MLC Microserving
- KV Cache 传输与 vLLM KV Connector（NIXL/NCCL）
- Goodput 与 SLO 感知调度
- P/D 资源池配比与适用条件
- vLLM Disaggregated Prefill 实战

**第 8/9 章 性能分析与 Benchmark（大纲）**
- 推理指标体系（QPS、TTFT、TPOT、吞吐、显存、利用率）
- vllm bench serve / latency / throughput
- GenAI-Perf 与 Triton Perf Analyzer
- 可复现的压测配置
- torch.profiler
- Nsight Systems 与 Nsight Compute
- MLPerf Inference
- 性能回归门禁与 CI、bisect 定位

**第 9/10 章 生产部署与运维（大纲）**
- 容器化与 K8s（GPU 请求、探针、权重拉取）
- vLLM Production Stack 与 KServe
- Prometheus 指标与 Grafana
- 基于 QPS、队列、KV 利用率的 HPA 自动扩缩容
- 前缀感知路由
- 认证与安全（默认无认证，需网关、TLS、隔离）
- 容量规划（从 SLO 和 QPS 推算 GPU 数）

**10.1 端侧推理**
- 端侧、边缘、云的区别与端侧部署动机
- 端侧约束：内存、功耗与散热、碎片化、App 生命周期
- 端侧权重与 KV 显存估算
- 导出链路（torch.export/ONNX → .pte/.onnx/.tflite/.mlpackage）
- 格式、Runtime、Backend/Delegate 三层；图分区与回退
- CPU、GPU、NPU、DSP 各自的特点
- 端侧运行时对比（ExecuTorch、ORT Mobile、LiteRT、Core ML、ncnn、MNN、llama.cpp、MLC LLM）
- 端侧优化：压缩、量化、图优化、内存规划
- 可复现的端侧 Benchmark（冷启动、尾延迟、功耗与温度、LLM 指标、记录模板）
- ExecuTorch + XNNPACK 导出 .pte 示例
- 端侧常见问题与排查（精度对不上、NPU 慢、冷启动、降频）
- 端侧运行时选型流程
