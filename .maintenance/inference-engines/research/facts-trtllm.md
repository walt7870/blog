# TensorRT-LLM 篇核对记录（2026-10-27）

源码：`git clone --depth 1 --branch v1.2.1 https://github.com/NVIDIA/TensorRT-LLM.git`（GIT_LFS_SKIP_SMUDGE=1），位于 scratchpad `src/trtllm`。下文路径相对该目录。

## 版本

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| 最新正式版 v1.2.1，2026-04-20T11:51:33Z | `gh api repos/NVIDIA/TensorRT-LLM/releases/latest` | 与简报一致 |
| 正式版序列：0.5.0（2023-10-19）…0.21.0（2025-08-04）、1.0.0（2025-09-24）、1.1.0（2025-12-19）、1.2.0（2026-03-12）、1.2.1（2026-04-20） | `gh release list --exclude-pre-releases` | 1.3.0 没有正式版 |
| 最新预发布 v1.4.0rc1，2026-10-22；1.4.0rc0 2026-10-14；1.3.0rc29 2026-09-29 | `gh release list -L 15` | 与简报一致 |
| `tensorrt_llm/version.py` = "1.2.1" | 源码 | |
| PyPI `tensorrt-llm` 1.2.1 只有 10 KB sdist；实际 wheel 在 pypi.nvidia.com：cp310 x86_64、cp312 x86_64、cp312 aarch64 | pypi.org JSON、`https://pypi.nvidia.com/tensorrt-llm/` | 仅 Linux；Python 3.10/3.12 |
| NGC 镜像 `nvcr.io/nvidia/tensorrt-llm/release:1.2.1` 存在；另有 1.4.0rc1、1.4.0rc2 及大量 .dev 标签 | nvcr.io v2 tags/list（匿名 token） | 1.4.0rc2 镜像已存在但 GitHub 尚未发布 rc2 |
| 1.2.1 依赖：CUDA 13.1、torch 2.9.1、基础镜像 `nvcr.io/nvidia/pytorch:25.12-py3`、Triton 后端基础镜像 tritonserver:25.12 | README 徽章；`docs/source/release-notes.md` 1.2 节；`docs/source/installation/linux.md` | |
| 1.2.1 发布说明：修复 KV cache 损坏问题 (#12770)；升级 xgrammar、flashinfer | release-notes.md 第 7—15 行 | |

## PyTorch 后端与 TensorRT 后端

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| 1.0：“PyTorch-based architecture is now stable and the default experience, and the LLM API is now stable”；BREAKING：PyTorch 成为 LLM 默认后端，trtllm-serve 默认后端改 PyTorch；删除 TensorRT 流程旧文档 | release-notes.md 第 195—300 行 | |
| 1.2.1 `LLM` 类继承 `_TorchLLM`；传入 TrtLlmArgs 专有参数会报错并提示用 `from tensorrt_llm._tensorrt_engine import LLM` | `tensorrt_llm/llmapi/llm.py` 1063—1205 行 | 1.2.1 中 TRT 后端仍存在 |
| `tensorrt_llm/_tensorrt_engine/__init__.py`：`from tensorrt_llm.llmapi.llm import _TrtLLM as LLM` | 源码 | |
| trtllm-serve `--backend` 选项 `pytorch`/`tensorrt`（别名 `trt`）/`_autodeploy`，默认 pytorch | `tensorrt_llm/commands/serve.py` 295—302 行 | |
| 入口脚本：trtllm-build、trtllm-prune、trtllm-refit、trtllm-bench、trtllm-serve、trtllm-eval、trtllm-llmapi-launch | `setup.py` 345—353 行 | 1.2.1 仍带 trtllm-build |
| 1.3.0rc20（2026-06-30）发布说明：“This RC version will be the last one supporting the TensorRT backend” | `gh release view v1.3.0rc20` | |
| 1.3.0rc21（2026-07-15）：BREAKING 删除旧 TensorRT 后端 Python 模块 (#15918)；删除旧 TRT 文档并加迁移指南 (#15767)；删除 TRT 示例、TRT 后端测试和 TensorRT 引擎版 Triton 后端 (#15763, #15810, #15907)；AutoDeploy 进入弃用 | `gh release view v1.3.0rc21` | |
| 1.3.0rc29：BREAKING 删除 AutoDeploy (#19028) | `gh release view v1.3.0rc29` | |
| 在线文档迁移页“TensorRT Backend Removed”：`LLM(backend="tensorrt")` 抛 ValueError；删除 TrtLlmArgs、`_tensorrt_engine.LLM`、trtllm-build/refit/prune、convert_checkpoint.py、`--backend tensorrt`、tensorrt pip 依赖；“PyTorch is now the sole execution backend” | https://nvidia.github.io/TensorRT-LLM/legacy/tensorrt-backend-removal.html | 在线文档跟随 main（页脚：commit b96ba43，2026-10-26 更新），不等于 1.2.1 |

## 架构

| 事实 | 来源 |
| --- | --- |
| LLM 在每个 rank 创建 PyExecutor(Worker) 进程；组件 Scheduler、KVCacheManager、ModelEngine、Sampler；循环：取请求、调度、准备资源、前向、处理输出 | `docs/source/developer-guide/overview.md` |
| 主进程 GenerationExecutorProxy 经 zmq IPC 与 MPI 工作进程通信 | `tensorrt_llm/executor/proxy.py` 1—60 行 |
| `orchestrator_type: Literal["rpc","ray"]`，默认 None=MPI，prototype | `llmapi/llm_args.py` 2129 行 |
| 调度器、KV 管理调用 C++ 绑定：`tb_internal.algorithms.CapacityScheduler`、`tensorrt_llm.bindings.internal.batch_manager.KVCacheManager` | `_torch/pyexecutor/scheduler.py` 137—165 行；`resource_manager.py` 33—35 行 |
| 重叠调度默认开启（`disable_overlap_scheduler=False`），多一步解码换吞吐 | `llm_args.py` 2792 行；`docs/source/features/overlap-scheduler.md` |
| CUDA Graph 默认开启；`cuda_graph_config` 默认 `CudaGraphConfig()`，`max_batch_size=0` 时取 128；`enable_padding` 默认 False；无 padding 时批大小列表为 1—31、32、64、128（再加不超过上限的 2 的幂） | `llm_args.py` 107—165、2777、3150—3165 行 |
| `attn_backend` 默认 'TRTLLM'，可选 VANILLA、FLASHINFER 等 | `llm_args.py` 2806 行；`_torch/attention_backend/utils.py` |
| `sampler_type` 默认 auto：除束搜索外用 TorchSampler；1.2 起 FlashInfer 采样默认 | `llm_args.py` 2810 行；release-notes 1.2 API Changes |

## 默认值（1.2.1）

| 参数 | 默认 | 来源 |
| --- | --- | --- |
| `max_num_tokens` | 8192 | `llm_args.py` 2068 行；`builder.py` 472—474 行 |
| `max_batch_size` | LLM API 中为 None 后在 TorchLlmArgs 校验里设成 2048；trtllm-serve 选项默认取 BuildConfig 的 2048 | `llm_args.py` 3035—3036 行；`builder.py` 468—469 行；`serve.py` 323—327 行 |
| `max_seq_len` | 未设时从模型配置推导 | `serve.py` 336—342 行 |
| `enable_chunked_prefill` | False（LLM 与 trtllm-serve 均是） | `llm_args.py` 2006 行；`serve.py` 458—462 行 |
| 不开分块预填充时 prompt 长度 + query 长度 > max_num_tokens 直接 RequestError | `llmapi/llm.py` 695—707 行 |
| `kv_cache_config.free_gpu_memory_fraction` | 0.9 | `llm_args.py` 1650—1654 行；`serve.py` 380—386（`--free_gpu_memory_fraction` 与别名 `--kv_cache_free_gpu_memory_fraction`） |
| KV 可用显存公式 | `(total_gpu_memory − peak_memory + allocated_bytes) × fraction`，peak 为加载权重后试跑的峰值（torch 内 + 外） | `_torch/pyexecutor/_util.py` 116—132、334—436 行 |
| `enable_block_reuse` | True | `llm_args.py` 1632—1635 行 |
| `enable_partial_reuse` / `copy_on_partial_reuse` | True / True | `llm_args.py` 1682—1690 行 |
| `tokens_per_block` | 32 | `llm_args.py` 1711 行 |
| `kv_cache_config.dtype` | "auto"；可设 'fp8'、'nvfp4' | `llm_args.py`；`docs/source/features/quantization.md` |
| `host_cache_size` | None（文档写默认 0）；`secondary_offload_min_priority` 文档写默认 35 | `llm_args.py` 1655 行；`docs/source/features/kvcache.md` |
| `capacity_scheduler_policy` | GUARANTEED_NO_EVICT；另有 MAX_UTILIZATION、STATIC_BATCH | `llm_args.py` 1420—1470 行；legacy useful-runtime-flags.md |
| `guided_decoding_backend` | None，需显式设 xgrammar 或 llguidance | `llm_args.py` 2009 行；features/guided-decoding.md |
| `cache_transceiver_config.backend` | DEFAULT→NIXL；可选 UCX、NIXL、MOONCAKE、MPI（MPI 已弃用提示） | `llm_args.py` 1812—1815 行；`_torch/pyexecutor/kv_cache_transceiver.py` 39—57 行 |
| `moe_config.backend` | CUTLASS；可选 CUTEDSL、WIDEEP、TRTLLM、DEEPGEMM、VANILLA、TRITON | `llm_args.py` 447—450 行 |
| `enable_attention_dp` | False | `llm_args.py` 1965 行 |
| trtllm-serve `--host` / `--port` | localhost / 8000 | `serve.py` 286—294 行 |
| trtllm-serve 无 API key 选项 | grep `api_key` 在 serve.py、openai_server.py 无结果 | 需网关鉴权 |

## trtllm-serve 接口

| 事实 | 来源 |
| --- | --- |
| 路由：/health、/health_generate、/version、/v1/models、/metrics、/perf_metrics、/kv_cache_events、/v1/completions、/v1/chat/completions、/v1/responses（GET/DELETE /v1/responses/{id}）、/release_memory、/resume_memory、/update_weights | `serve/openai_server.py` 255—292 行 |
| `/metrics` 返回 JSON 迭代统计（取出即删除），PyTorch 后端需 `enable_iter_perf_stats: true`；Prometheus 指标在 `/prometheus/metrics`，仅在 `return_perf_metrics` 为真时挂载，指标前缀 `trtllm_`（request_success_total、e2e_request_latency_seconds、time_to_first_token_seconds、time_per_output_token_seconds、request_queue_time_seconds） | openai_server.py 292—318、386—390 行；`metrics/collector.py`；docs commands/trtllm-serve/trtllm-serve.rst |
| `--config` 与 `--extra_llm_api_options` 同义，YAML 覆盖命令行，内容即 TorchLlmArgs 字段 | serve.py 404—413 行；trtllm-serve.rst |
| 推理解析器：deepseek-r1、qwen3、nano-v3；工具解析器：qwen3、qwen3_coder、kimi_k2、deepseek_v3、deepseek_v31、deepseek_v32 | `llmapi/reasoning_parser.py` 109—113 行；`serve/tool_parser/tool_parser_factory.py` 12—20 行 |
| 多模态服务需要关闭 block reuse，只支持 Chat API | trtllm-serve.rst Multimodal Serving |
| 子命令 `disaggregated`；多机用 `trtllm-llmapi-launch` + srun | serve.py；trtllm-serve.rst |

## trtllm-bench

| 事实 | 来源 |
| --- | --- |
| 子命令 build、throughput、latency、prepare-dataset；throughput 的 `--backend` 默认 pytorch；选项含 `--config`、`--max_batch_size`、`--max_num_tokens`、`--kv_cache_free_gpu_mem_fraction`、`--concurrency`、`--streaming`、`--tp/--pp/--ep` 等 | `commands/bench.py` 80—83 行；`bench/benchmark/throughput.py` |
| 量化模式只配置 FP8、NVFP4 | developer-guide/perf-benchmarking.md |
| 数据集 JSON Lines：task_id、prompt 或 input_ids、output_tokens | 同上 |

## 量化

| 事实 | 来源 |
| --- | --- |
| 配方：FP4、FP8 per tensor、FP8 block scaling、FP8 rowwise、FP8 KV、NVFP4 KV、W4A16/W4A8 GPTQ、W4A16/W4A8 AWQ（模型表另有 MXFP4，用于 GPT-OSS） | `docs/source/features/quantization.md` |
| 硬件表：sm120 支持 NVFP4、MXFP4、FP8 per tensor、FP8 KV；sm100/103 全部；Hopper 不支持 NVFP4/MXFP4/NVFP4 KV，其余支持；Ada 支持 FP8 per tensor、FP8 KV、W4A8/W4A16 AWQ/GPTQ；Ampere 只有 FP8 KV、W4A16 AWQ/GPTQ | 同上 |
| sm100/103 的 FP8 block scaling 实际用 MXFP8 配方 | 同上 note |
| 离线量化：克隆 NVIDIA/Model-Optimizer，`examples/llm_ptq/scripts/huggingface_example.sh --model … --quant fp8`；NVFP4 KV 需 `--kv_cache_quant nvfp4` 且权重须 FP8 | 同上（文档中第二段的 `cd TensorRT-Model-Optimizer/...` 与克隆目录名不一致，正文按 Model-Optimizer 写） |
| `nvidia/Qwen3-8B-FP8`：线性层权重和激活 FP8，ModelOpt 0.35.0 量化，模型卡标 Blackwell、在 B200 测试 | huggingface.co/nvidia/Qwen3-8B-FP8（WebFetch） |
| Qwen3-8B 配置：36 层、32 个注意力头、8 个 KV 头、head_dim 128、max_position_embeddings 40960、bfloat16 | huggingface.co/Qwen/Qwen3-8B/raw/main/config.json |

## 投机解码

| 事实 | 来源 |
| --- | --- |
| one-model：EAGLE 3（Llama 4 Maverick）、MTP、EAGLE-style MTP（DeepSeek V3/R1）；two-model：EAGLE 3（Llama 4 Maverick、Llama 3.1 8B、Llama 3.3 70B）、Draft/target、NGram、User-provided | features/speculative-decoding.md |
| 文档：每个请求一条长度 max_draft_len 的草稿；不支持树形；加速只在低批量可见 | 同上 |
| two-model 不支持重叠调度，自动关闭 | 同上 |
| `EagleDecodingConfig.eagle3_one_model` 默认 True；文档示例设 False 并要求 `disable_overlap_scheduler=True` | `llm_args.py` 862 行 |
| decoding_type 映射：MTP、Medusa、Eagle、Lookahead、NGram、DraftTarget、SaveState、UserProvided、AUTO | `llm_args.py` 764—778 行 |
| Medusa、Lookahead `supports_backend` 返回 backend 不是 pytorch/_autodeploy，即只在 TRT 后端 | `llm_args.py` 844—847、1600—1605 行 |
| AUTO：自动选无草稿模型的方法，仅 pytorch | `llm_args.py` 1170—1192 行 |
| 1.0 发布说明：Auto-enable ngram with concurrency <= 32 | release-notes 1.0 |
| 1.3.0rc25：BREAKING，two-model 投机解码强制回退到 one-model (#17366) | `gh release view v1.3.0rc25` |

## 并行、P/D、Triton、Dynamo

| 事实 | 来源 |
| --- | --- |
| TP、PP、DP、EP、CP、Wide-EP；注意力层 TP 或 DP（`enable_attention_dp`）；MoE 层 TP/EP/混合，`moe_tensor_parallel_size × moe_expert_parallel_size = tensor_parallel_size` | features/parallel-strategy.md |
| Wide-EP：专家槽位、EPLB 离线/在线、为 GB200 MNNVL 优化的通信内核 | 同上 |
| 1.2 新增 Helix 并行、Ray 编排器、DGX Spark beta、NIXL-LibFabric、Mooncake 作为 cache transceiver 后端、服务发现动态扩缩 | release-notes 1.2 |
| 1.2 已知问题：P/D 中 context PP + generation TP 组合可能卡住 | release-notes 1.2 Known Issues |
| P/D：context/generation 两类 trtllm-serve + `trtllm-serve disaggregated -c disagg_config.yaml`；context-only / generation-only 标记；ctx_params；`max_tokens_in_buffer` 建议 ≥ 最大输入长度；示例 context 服务设 `disable_overlap_scheduler: True` | features/disagg-serving.md |
| 环境变量 TRTLLM_NIXL_KVCACHE_BACKEND（UCX 默认，LIBFABRIC）、TRTLLM_KVCACHE_TRANSFER_BUFFER_SIZE 默认 512MB 等 | 同上 |
| Triton：仓库内 `triton_backend/all_models/inflight_batcher_llm`（C++，TRT 引擎）与 `all_models/llmapi/tensorrt_llm`（Python 后端，model.yaml 里 backend: pytorch，triton_config.max_batch_size: 0，注释说明暂不支持批处理） | 源码 |
| DeepSeek V3 README：Triton 的 PyTorch 路径是 Prototype | `examples/models/core/deepseek_v3/README.md` 477—494 行 |
| triton-inference-server/tensorrtllm_backend 仓库未归档，README 说明源码已迁入 TensorRT-LLM 的 triton_backend | `gh api repos/triton-inference-server/tensorrtllm_backend` |
| 1.0：删除 Triton 中 “llmapi + TRT backend” 组合 | release-notes 1.0 |
| Dynamo v1.6.1（2026-10-27）`components/src/dynamo/trtllm` 存在；示例 `python3 -m dynamo.frontend` + `python3 -m dynamo.trtllm --model-path … --extra-engine-args <yaml> --disaggregation-mode prefill|decode` | ai-dynamo/dynamo v1.6.1 `examples/backends/trtllm/launch/disagg.sh` |

## 模型与硬件

| 事实 | 来源 |
| --- | --- |
| 支持硬件页：Blackwell B200、GB200、B300、GB300、DGX Spark；Hopper H100、H200、GH200；Ada L20、L40/L40S；Ampere A100 | docs/source/supported-hardware.md |
| 文本模型表（PyTorch 后端）约 23 个架构：DeepSeek-V3/V3.2、GPT-OSS、Llama 2/3/3.1/4、Qwen2/3/3MoE/3Next、Gemma 3、Phi-4、Mistral/Mixtral、Nemotron 系列、EXAONE 4.0、MiniMax M2 等；另有多模态表 | docs/source/models/supported-models.md |
| 特性组合：LoRA 与 CUDA Graph 为 No；MTP/EAGLE-3 与 PP 为 No | docs/source/features/feature-combination-matrix.md |
| Windows 自 0.18.0 弃用 | release-notes 0.18.0 |

## 与简报/推理系列的差异

- 简报版本信息一致。
- 第 18 篇说 TensorRT-LLM 是“固定模型与硬件的深度优化、适配成本较高”：在 1.0 之后，“固定硬件、需编译引擎”的成本主要属于旧 TensorRT 流程；默认 PyTorch 后端直接加载 HF 检查点，成本更多来自模型覆盖、只支持 NVIDIA/Linux、参数与特性组合矩阵。建议第 18 篇改述为“NVIDIA GPU 专用，深度优化新架构与低精度；默认已是 PyTorch 后端”。
- `free_gpu_memory_fraction` 是“加载与试跑后剩余显存”的比例，和 vLLM 按总显存计的 `gpu_memory_utilization` 口径不同，对比篇不要直接对比 0.9 与 0.92。
- 在线文档跟随 main（已删除 TRT 后端），读 1.2.1 时要切到对应版本文档或看源码。

## 正文中的估算与未确认项

- 显存账（正文“启动日志里的显存账”）：H100 按 79.6 GiB、Qwen3-8B 权重 8.2B×2 B≈15.3 GiB、试跑激活与 PyTorch 外开销按 4 GiB 估计，(79.6−19.3)×0.85≈51 GiB，÷144 KiB≈37 万 token、≈1.16 万块。教学估算，未在 GPU 上运行。
- 失败案例报错文本由 `llmapi/llm.py` 705—707 行的格式串推出（prompt_len/cp_size 打印为浮点 12000.0），未实际运行。
- 未确认：官方 curated YAML（`examples/configs/curated/*.yaml`）把 `kv_cache_free_gpu_memory_fraction` 写在顶层，而 TorchLlmArgs 是 `extra="forbid"`，1.2.1 的 `update_llm_args_with_extra_dict` 里没有找到这个别名的转换；正文改用确定有效的 `kv_cache_config.free_gpu_memory_fraction` 嵌套写法。
- 未确认：未设 `guided_decoding_backend` 时请求带 `response_format` 是报错还是忽略，正文只写“要先在启动时设置”。
- 未确认：`nvidia/Qwen3-8B-FP8` 在 H100 上的精度表现（模型卡只列 Blackwell）；FP8 per-tensor 按硬件表 Hopper 支持。
- 未实测：本篇所有命令均未在 GPU 上运行；本机为 Apple Silicon，TensorRT-LLM 不支持。
- 文档内部不一致：`docs/source/features/speculative-decoding.md` 的 EAGLE-3 示例 `eagle3_one_model=False`，源码默认 True；`kvcache.md` 说 host_cache_size 默认 0，源码默认 None（效果相同，均不启用）。

## 审校更正（2026-10-28）

- Dynamo v1.6.1 `pyproject.toml:56` 锁定 `tensorrt-llm==1.3.0rc29`（预发布），正文 Dynamo 一节补充这一点。
- 章节重编号：不适用场景里“看第 04、07 篇”改为“昇腾看第 04 篇 LMDeploy，本地 Mac 看第 05—07 篇”。
