# vLLM 篇核对记录（01-vllm.md）

- 核对日期：2026-10-27
- 源码：`vllm-project/vllm` tag `v0.32.0`（commit 5df63a7203cd，2026-10-17），本地浅克隆于 scratchpad `src/vllm`。下文“文件:行号”均指该 tag。
- 发布页：`gh release list -R vllm-project/vllm`、`gh release view v0.32.0`（正文存 scratchpad `vllm-notes/rel-0.32.0.md`）。
- 未在 GPU 上运行任何命令；本机为 Apple Silicon，无 CUDA。

## 版本与历史

| 事实 | 结论 | 来源 |
| --- | --- | --- |
| 最新正式版 | v0.32.0，2026-10-18T06:50:48Z；之前 0.31.0（10-05）、0.30.0（09-22）、0.29.0（09-09）、0.28.0（08-26），约两周一版 | `gh release list -R vllm-project/vllm -L 12` |
| 首个发布 | v0.1.0，2023-06-20，与 vLLM 博客同日 | `gh release view v0.1.0` |
| 论文 | Kwon et al., SOSP 2023, arXiv 2309.06180；README 写“Originally developed in the Sky Computing Lab at UC Berkeley” | README.md |
| V1 alpha | v0.7.0（2025-01-27）：`VLLM_USE_V1=1` 打开，torch.compile 在 V1 默认启用 | v0.7.0 release |
| V1 默认 | v0.8.0（2025-03-18）“enabled V1 engine by default for supported use cases” | v0.8.0 release |
| V0 清理 | v0.10.0（2025-07-24）开始删除 V0；v0.11.0（2025-10-02）“completes the removal of V0 engine… V1 is the only engine” | 对应 release |
| 旧类名 | `vllm/engine/llm_engine.py` 与 `async_llm_engine.py` 只剩别名：`LLMEngine = V1LLMEngine`、`AsyncLLMEngine = AsyncLLM` | 两文件全文 |
| MRV2 推广 | v0.23.0 Llama/Mistral 稠密模型默认；v0.24.0 量化模型默认；v0.25.0 所有稠密模型默认；v0.29.0 “default for all models”，并宣布 MRV1 弃用、目标 v0.32 移除 | 对应 release |
| MRV2 在 0.32.0 | 仍保留 MRV1 作为回退：`use_v2_model_runner` 未显式设置时，无 Triton 或遇到不支持特性则回退 V1（`vllm/config/vllm.py:703-738`）；不支持项含投机方法 suffix/medusa/mlp_speculator/custom_class、EAGLE 并行起草、异构词表草稿模型、external_launcher+PP（`vllm/config/vllm.py:2914-2952`）；PCP、PP+异步调度只有 MRV2 支持（2954-2972）。0.32.0 还让 ROCm 默认 MRV2 | 源码 + 0.32.0 release |
| MRV2 开关 | `VLLM_USE_V2_MODEL_RUNNER`（`vllm/envs.py:311, 2151`）；Worker 在 `_make_model_runner` 中选择 `vllm/v1/worker/gpu/model_runner.py` 或 `gpu_model_runner.py`（`vllm/v1/worker/gpu_worker.py:563-579`） | 源码 |
| MRV2 设计 | 持久状态与每步输入解耦、默认异步、去掉 async barrier、`StagedWriteTensor` 增量写块表；文档自述 “not yet feature-complete, not rigorously tested” | `docs/design/model_runner_v2.md:5-120` |

## 进程架构与请求路径

| 事实 | 来源 |
| --- | --- |
| 进程：API server（HTTP、分词、多模态加载、流式返回，经 ZMQ 与引擎通信）、每个 DP rank 一个 EngineCore、每 GPU 一个 Worker、DP>1 时一个 DP Coordinator；总数 `A + DP + N (+1)`；例：`-tp=4` 共 6 个进程，`-tp=2 -dp=4` 共 17 个 | `docs/design/arch_overview.md:67-125` |
| api_server_count 默认：内部负载均衡时等于 DP 大小；外部 LB、多端口、Rust 前端为 1；单 API server 时就在 `vllm serve` 主进程里运行 | `vllm/entrypoints/cli/serve.py:107-157` |
| CPU：至少 `2 + N` 个物理核；EngineCore 是忙循环，对 CPU 争抢敏感；超线程下 vCPU 翻倍 | `docs/configuration/optimization.md`“CPU Resources for GPU Deployments” |
| `VLLM_ENABLE_V1_MULTIPROCESSING` 默认 1；异步模式必须多进程 | `vllm/envs.py:165, 1463`；`vllm/v1/engine/core_client.py:111-118` |
| 客户端：`AsyncMPClient`；DP>1 时 `DPAsyncMPClient`（外部 LB）/`DPLBAsyncMPClient`（内部 LB）；前端用 ZMQ ROUTER 发、PULL 收 | `core_client.py:137-162, 642-668, 1106, 1419, 1603` |
| EngineCore 用两个后台线程把 ZMQ socket 与队列对接（“overlap ZMQ socket IO with GPU since they release the GIL”），消息用 msgpack（msgspec） | `vllm/v1/engine/core.py:20, 1147-1240` |
| 忙循环：处理输入队列 → `step`；`step` = `scheduler.schedule` → `executor.execute_model(non_block=True)` → 取结构化输出 bitmask → `sample_tokens` → `scheduler.update_from_output` | `core.py:657-688, 1547-1557` |
| 批队列：`max_concurrent_batches > 1`（PP）时用 `step_with_batch_queue` | `core.py:220-243, 698` |
| AsyncLLM：`input_processor.process_inputs` → `output_processor.add_request` → `engine_core.add_request_async`；后台 `output_handler` 拉取输出、分块处理（`VLLM_V1_OUTPUT_PROC_CHUNK_SIZE`）、反分词 | `vllm/v1/engine/async_llm.py:474-575, 825-907` |
| 停止条件分两处：EOS、`max_tokens`、`max_model_len` 在 EngineCore（`vllm/v1/core/sched/utils.py:98-116`）；停止字符串在前端反分词器（`vllm/v1/engine/detokenizer.py:83-133`），命中后前端向引擎发 abort（`async_llm.py:889`） | 源码 |
| 请求状态：WAITING、WAITING_FOR_STRUCTURED_OUTPUT_GRAMMAR、WAITING_FOR_REMOTE_KVS、WAITING_FOR_STREAMING_REQ、RUNNING、PREEMPTED、FINISHED_{STOPPED,LENGTH_CAPPED,ABORTED,IGNORED,ERROR,REPETITION} | `vllm/v1/request.py:370-386` |
| MultiprocExecutor 用共享内存 `MessageQueue` 广播 SchedulerOutput 给各 Worker | `vllm/v1/executor/multiproc_executor.py:31, 144-171` |
| Rust 前端：`rust/` 下的实验性替代前端（axum HTTP、模板、解析、ZMQ+MessagePack 客户端），`VLLM_USE_RUST_FRONTEND=1` 打开，“experimental, and is not feature-complete” | `rust/README.md:1-40`；`vllm/envs.py:170-172` |

## 调度器

| 事实 | 来源 |
| --- | --- |
| “There's no decoding phase nor prefill phase”，每个请求只追 `num_computed_tokens` → `num_tokens_with_spec`，覆盖分块预填充、前缀缓存、投机解码 | `vllm/v1/core/sched/scheduler.py:593-602` |
| 每步预算 `token_budget = max_num_scheduled_tokens`（默认等于 max_num_batched_tokens）；先排 RUNNING，再排 WAITING | `scheduler.py:611, 657, 899`；`vllm/config/scheduler.py:55-60` |
| 抢占：分配不到块时，FCFS 抢占 running 队尾，priority 策略抢占 (priority, arrival_time) 最大者；被抢占请求释放块、`num_computed_tokens=0`、放回 waiting 队首（重算，无 swap） | `scheduler.py:796-803, 1571-1615` |
| `--swap-space` 已不存在 | arg_utils/cli_args 中无此参数 |
| SchedulerConfig 字段：`long_prefill_token_threshold=0`、`max_num_queued_reqs/tokens=None`（API server 进程内执行，超限 503）、`enable_chunked_prefill=True`、`policy="fcfs"`（或 priority）、`scheduler_reserve_full_isl=True`、`watermark=0.0`、`async_scheduling=None`、`stream_interval=1`、`max_num_active_seqs=None` | `vllm/config/scheduler.py:40-213` |
| 异步调度默认打开，除非：池化模型、非 EAGLE/MTP/ngram_gpu/draft_model/dspark/dflash 的投机方法、`disable_padded_drafter_batch`、执行器不支持、ROCm DeepEP HT DBO、PP 且 MRV1 | `vllm/config/vllm.py:1585-1644` |
| 生成模型默认开分块预填充和前缀缓存；手动关闭分块预填充会警告“does not officially support disabling chunked prefill… may cause the engine to crash” | `vllm/engine/arg_utils.py:2987-3036` |
| `--performance-mode {balanced,interactivity,throughput}`，默认 balanced；throughput 把未显式设置的 max_num_batched_tokens、max_num_seqs 翻倍；interactivity 捕获 1..32 每个批大小的 CUDA Graph | `vllm/config/vllm.py:139, 433`；`arg_utils.py:3129-3133`；`vllm.py:2465-2470` |

## 默认值（引擎参数）

| 参数 | 默认 | 来源 |
| --- | --- | --- |
| max_num_batched_tokens / max_num_seqs | 显存 ≥160 GiB：16384/1024（离线与服务相同）；≥70 GiB 且非 A100：离线 16384、服务 8192，seqs 1024；其他：离线 8192、服务 2048，seqs 256；TPU、CPU 另有值 | `vllm/engine/arg_utils.py:2920-2985` |
| SchedulerConfig 类默认（测试用） | 2048 / 128 | `vllm/config/scheduler.py:40-42` |
| gpu_memory_utilization | 0.92 | `vllm/config/cache.py:102` |
| block_size | 16（DEFAULT_BLOCK_SIZE） | `cache.py:72` |
| kv cache dtype | auto；可选 fp8/fp8_e4m3/fp8_e5m2/fp8_inc/fp8_ds_mla/nvfp4_ds_mla/turboquant_*/ultraquant_4bit/int4/int8/fp8_per_token_head/nvfp4/nvfp4_4over6 | `cache.py:39-58, 122` |
| enable_prefix_caching | True；哈希 sha256（可选 sha256_cbor/xxhash/xxhash_cbor） | `cache.py:64, 141-143` |
| kv_cache_memory_bytes | None；设置后忽略 gpu_memory_utilization | `cache.py:257-264` |
| kv_offloading_size / backend | None / native（或 lmcache） | `cache.py:266-276` |
| cpu_offload_gb | 0 | `vllm/config/offload.py:23` |
| max_model_len | 取模型配置；可 auto/-1 | `vllm/config/model.py:245` |
| enforce_eager | False | `model.py:272` |
| optimization_level | O2（`-O0`…`-O3`）；O2 = VLLM_COMPILE + FULL_AND_PIECEWISE | `vllm/config/vllm.py:124-130, 427`；`docs/design/optimization_levels.md` |
| CUDA Graph 最大捕获 | 未设置时 `min(max_num_seqs × decode_query_len × 2, 512)`，SM100 族上限 1024，再与 max_num_batched_tokens 取小 | `vllm/config/vllm.py:2354-2446` |
| 端口 / 主机 | 8000；host 默认 None，绑定 `(args.host or "", port)`，即所有网卡 | `vllm/entrypoints/launchers/cli_args.py:283-285`；`launcher.py:397` |
| CORS | `allowed_origins` 默认空列表（“Cross-origin browser access is disabled by default”）；0.32.0 起 | `cli_args.py:319-320`；release |
| api_key | 只检查前缀 `/v1`、`/v2`、`/inference`、`/cohere` | `vllm/entrypoints/serve/middleware/authenticate.py:11` |
| 开发接口 | `/sleep`、`/wake_up`、`/reset_prefix_cache`、`/collective_rpc` 等只有 `VLLM_SERVER_DEV_MODE=1` 才注册 | `vllm/entrypoints/launchers/api_server/routers.py:40-48`；`serve/dev/cache/api_router.py:20` |
| mm_processor_cache_gb | 4 | `vllm/config/multimodal.py:357` |
| LoRA | `max_loras=1`，`max_lora_rank=16`（可选 1/8/16/32/64/128/256/320/512），`max_cpu_loras=None` | `vllm/config/lora.py:26-42` |

## 编译、CUDA Graph、注意力后端

- `CompilationMode`：NONE、STOCK_TORCH_COMPILE、DYNAMO_TRACE_ONCE、VLLM_COMPILE（`vllm/config/compilation.py:41-48`）。
- `CUDAGraphMode`：NONE、PIECEWISE、FULL、FULL_DECODE_ONLY、FULL_AND_PIECEWISE（`compilation.py:53-63`）。
- 编译缓存 `VLLM_CACHE_ROOT` 默认 `~/.cache/vllm`，容器内挂卷可复用（`docs/deployment/docker.md`“Persist the compile cache”）。
- 非 MLA 注意力后端优先级：SM100 为 FLASHINFER > FLASH_ATTN > TRITON_ATTN > FLEX_ATTENTION；其他 CUDA 架构为 FLASH_ATTN > FLASHINFER > TRITON_ATTN > FLEX_ATTENTION（`vllm/platforms/cuda.py:158-177`）。枚举见 `vllm/v1/attention/backends/registry.py:44-154`（另有 ROCM_*、各 MLA、TORCH_SDPA、TURBOQUANT 等）。
- 0.32.0 删除 cascade attention，`--disable-cascade-attn` 只警告（release）。

## 量化

- `QuantizationMethods`：awq、auto_awq、fp8、fbgemm_fp8、fp_quant、modelopt、modelopt_fp4、modelopt_mxfp8、modelopt_mixed、auto_gptq、gptq、gptq_marlin、awq_marlin、humming、compressed-tensors、experts_int8、quark、moe_wna16、torchao、inc、mxfp4、gpt_oss_mxfp4、deepseek_v4_fp8、online，以及在线简写 fp8_per_tensor、fp8_per_block、fp8_per_channel、int8_per_channel_weight_only、nvfp4_per_token、mxfp8；弃用 fbgemm_fp8、fp_quant（`vllm/model_executor/layers/quantization/__init__.py:15-55`）。
- ⚠️ **GGUF 与 bitsandbytes 已移到树外插件**：`vllm-gguf-plugin`、`vllm-bnb-plugin`（`docs/features/quantization/gguf.md:1-12`、`bnb.md:1-12`），主包 QuantizationMethods 中已无 `gguf`、`bitsandbytes`。README 仍把 GGUF 列在量化格式里。实践篇“支持 FP8、AWQ、GPTQ、GGUF 等多种格式”需补“GGUF 需装插件”。
- 在线量化：`--quantization fp8_per_tensor|fp8_per_block|mxfp8|mxfp4…`（`docs/features/quantization/online.md`）；0.32.0 新增 `--quantization-config.linear fp8_per_channel` 在线重量化。

## 功能逐项

| 功能 | 结论 | 来源 |
| --- | --- | --- |
| 结构化输出后端 | auto（默认）、xgrammar、guidance、outlines、lm-format-enforcer；auto 先试 xgrammar，不支持的 schema 退到 guidance，再退到 outlines；Tekken Mistral 的 Lark 语法走 guidance | `vllm/config/structured_outputs.py:11-41`；`vllm/sampling_params.py:1372-1420` |
| 请求参数 | `structured_outputs` 中 choice/regex/json/grammar/structural_tag，及 `response_format` | `docs/features/structured_outputs.md:20-40` |
| 工具调用 | `--enable-auto-tool-choice --tool-call-parser <name>`；注册 54 个名字（含 `hermes`、`hf`、`llama3_json`、`mistral`、`qwen3_coder`/`qwen3_xml`/`qwen3_json`、`deepseek_v3x`、`openai` 等）；`qwen3_json` 目前是 hermes 解析器的别名 | `vllm/tool_parsers/__init__.py`（197-207）；`docs/features/tool_calling.md:163` |
| 推理解析 | `--reasoning-parser`，注册 38 个（`qwen3`、`deepseek_r1`、`openai_gptoss`、`hf`…）；Qwen3 默认思考，可 `--default-chat-template-kwargs '{"enable_thinking": false}'`；`thinking_token_budget` | `vllm/reasoning/__init__.py`；`docs/features/reasoning_outputs.md:215-262` |
| 0.32.0 `hf` 解析器 | 读取模型自带 `response_template`，免写专用解析器 | release |
| 多 LoRA | `--enable-lora --max-loras --max-lora-rank --max-cpu-loras --lora-modules`；动态加载 `/v1/load_lora_adapter` 需 `VLLM_ALLOW_RUNTIME_LORA_UPDATING=True` | `docs/features/lora.md:112-142`；`vllm/entrypoints/serve/lora/api_router.py:63,82` |
| 池化 | runner `generate/pooling/draft`，convert `none/embed/classify`；任务 embed、classify、token_embed、token_classify、plugin；端点 `/v1/embeddings`、`/pooling`、`/classify`、`/score` `/v1/score`、`/rerank` `/v1/rerank` `/v2/rerank`、`/v2/embed`；池化模型默认关异步调度 | `vllm/config/scheduler.py:20`；`vllm/config/model.py:86-88,162-165`；`vllm/tasks.py:10-17`；路由 grep |
| 多模态 | 模型注册表 `_MULTIMODAL_MODELS` 约 120 项；`--limit-mm-per-prompt`；前端多模态处理缓存 4 GiB/进程；`--allowed-media-domains` 防 SSRF | `vllm/model_executor/models/registry.py:339`；`multimodal.py:307,357`；`docs/usage/security.md:63-75` |
| 模型覆盖 | README “200+ model architectures”；`--model-impl auto/vllm/transformers/terratorch` | README；`model.py:108,394` |
| 投机解码 | 方法：ngram、ngram_gpu、medusa、mlp_speculator、draft_model、suffix、custom_class、eagle、eagle3、extract_hidden_states、mtp（各 *_mtp 已弃用并归一为 mtp）、dflash、dspark；配置 `--speculative-config` JSON | `vllm/config/speculative.py:38-84, 1141-1145`；`docs/features/speculative_decoding/README.md` |
| 睡眠模式 | `--enable-sleep-mode`（默认 False，`model.py:366`）；level 1 权重卸到 CPU、丢 KV；level 2 都丢；`wake_up(tags=["weights"/"kv_cache"])`；CUDA 与 ROCm；HTTP 端点需 dev mode | `docs/features/sleep_mode.md`；`routers.py:40` |
| KV 连接器 | 注册：ExampleConnector、ExampleHiddenStatesConnector、LMCacheConnectorV1、LMCacheMPConnector、NixlConnector、NixlPullConnector、NixlPushConnector、MultiConnector、HiSparseConnector、MoRIIOConnector、OffloadingConnector、DecodeBenchConnector、MooncakeConnector、MooncakeStoreConnector、FlexKVConnectorV1、SimpleCPUOffloadConnector、HF3FSKVConnector | `vllm/distributed/kv_transfer/kv_connector/factory.py` |
| KVTransferConfig | `kv_role` ∈ kv_producer/kv_consumer/kv_both；`kv_port=14579`；`kv_load_failure_policy="fail"`（或 recompute） | `vllm/config/kv_transfer.py:11-13, 60-88` |
| P/D 文档 | “experimental”；动机为分别调 TTFT/ITL、控制尾部 ITL；“Disaggregated prefill DOES NOT improve throughput” | `docs/features/disagg_prefill.md` |
| NIXL | 默认 UCX；`VLLM_NIXL_SIDE_CHANNEL_PORT` 默认 5600；`kv_lease_duration` 默认 30 s；示例代理 `tests/v1/kv_connector/nixl_integration/toy_proxy_server.py` | `docs/features/nixl_connector_usage.md` |

## 并行、多机、硬件

| 事实 | 来源 |
| --- | --- |
| 执行器后端 ray/mp/uni/external_launcher；单机默认 mp，CUDA 上 `--nnodes>1` 也用 mp；在 Ray placement group 内或 `data_parallel_backend=ray` 时用 ray | `vllm/config/parallel.py:37, 1035-1080` |
| Ray 是可选依赖（requirements/cuda.txt、common.txt 无 ray），文档用 `pip install "ray[cgraph]"` | `docs/serving/parallelism_scaling.md` |
| mp 多机：`--nnodes 2 --node-rank 0 --master-addr`，其他节点加 `--headless` | 同上 |
| DP：内部 LB 单入口、外部 LB 每 rank 一个、混合 LB；多机 `--data-parallel-size-local --data-parallel-start-rank --data-parallel-address --data-parallel-rpc-port --headless`；MoE 时各 rank 要对齐前向，空 rank 跑 dummy | `docs/serving/data_parallel_deployment.md` |
| EP：`--enable-expert-parallel`，EP = TP × DP；`--all2all-backend` 默认 allgather_reducescatter，另有 deepep_high_throughput、deepep_low_latency、flashinfer_nvlink_one_sided/two_sided；`--enable-eplb` | `docs/serving/expert_parallel_deployment.md`；`arg_utils.py:1273,1286,1320` |
| 节点间通信默认不加密，需隔离网络；`--kv-port` 默认 14579、DP master 29500 | `docs/usage/security.md:3-30` |
| 主仓平台：cuda、rocm、xpu、cpu、zen_cpu、tpu（tpu.py 只是转到 `tpu_inference` 包） | `vllm/platforms/`；`tpu.py`；`platforms/__init__.py:33-53` |
| 平台插件入口组 `vllm.platform_plugins`；官方插件 vllm-ascend、vllm-spyre、vllm-gaudi、vllm-neuron、vllm-metal；非官方 vllm-metax、vllm-kunlun、vllm-musa | `docs/design/plugin_system.md:48-50`；`docs/design/custom_op.md:265-266` |
| 插件版本：vllm-ascend 最新正式 v0.23.0.post1（2026-09-22），之后 v0.30.0rc2 预发布；tpu-inference v0.32.0（2026-10-23）；vllm-metal v0.32.0（2026-10-21） | `gh api .../releases/latest`、`gh release list` |
| PyPI 0.32.0 轮子为 CUDA 13.0（`VLLM_MAIN_CUDA_VERSION` 默认 "13.0"，`vllm/envs.py:92`；`docker/Dockerfile:25` CUDA 13.0.3；PyPI 依赖 `nvidia-cutlass-dsl[cu13]`；release 表 “PyPI (CUDA 13.0)”）；另有 cu129 镜像 `v0.32.0-cu129`；CUDA 13 需 R580+ 驱动（兼容模式支持 R535/R570） | 源码、PyPI JSON、`docs/getting_started/installation/gpu.cuda.inc.md:340` |
| ⚠️ 安装文档 `gpu.cuda.inc.md:53` 仍写 “compiled with CUDA 12.9 by default”，与 release 和 envs 不一致；以 release 与源码为准 | — |
| torch==2.13.0；Python 3.11–3.14（`pyproject.toml:34` `>=3.11,<3.15`） | `requirements/cuda.txt:7` |

## 可观测性

指标名（`vllm/v1/metrics/loggers.py`，行号）：`vllm:num_requests_running`(528)、`num_requests_waiting`(538)、`num_requests_waiting_by_reason`(548)、`kv_cache_usage_perc`(620)、`prefix_cache_queries`/`hits`(662/673)、`external_prefix_cache_*`(686/698)、`num_preemptions`(739)、`prompt_tokens`(748)、`prompt_tokens_cached`(773)、`generation_tokens`(799)、`request_success`(809)、`admission_rejections`(848)、`iteration_tokens_total`(888)、`time_to_first_token_seconds`(931)、`inter_token_latency_seconds`(941)、`request_time_per_output_token_seconds`(951)、`e2e_request_latency_seconds`(961)、`request_queue_time_seconds`(971)、`request_prefill_time_seconds`(991)、`request_decode_time_seconds`(1001)、`kv_block_lifetime_seconds`(1042)、`lora_requests_info`(1104)；投机 `vllm:spec_decode_num_accepted_tokens_per_pos`（`vllm/v1/spec_decode/metrics.py:255`）。Counter 在暴露时加 `_total`（`docs/design/metrics.md:30-32`）。OpenTelemetry：`--otlp-traces-endpoint`（`arg_utils.py:1650`）；KV 事件 `--kv-events-config`（1845）。

## 部署

- 镜像 `vllm/vllm-openai:v0.32.0`（CUDA 13.0）、`-cu129`、`-ubuntu2404`、ROCm `vllm/vllm-openai-rocm`、CPU、XPU（release）。
- Docker 需 `--ipc=host` 或 `--shm-size`（`gpu.cuda.inc.md:305-308`）；挂 `~/.cache/vllm` 复用编译缓存。
- K8s 原生示例：`/dev/shm` 用 `emptyDir medium: Memory`，liveness/readiness 探针 `/health`，initialDelaySeconds 60（`docs/deployment/k8s.md`）。
- 集成：production-stack（Helm + 路由 + Grafana + LMCache）、llm-d（CNCF Sandbox，K8s 原生，KV 事件前缀感知路由）、Dynamo、AIBrix、KServe（可用 llm-d 的 LLMInferenceService）、KubeRay、LWS 等（`docs/deployment/integrations/*.md`、`k8s.md`）。production-stack 最新 chart vllm-stack-0.1.13（2026-09-29）；llm-d v1.0.0（2026-10-20）。

## 与推理系列现有说法的不一致

1. ❌ 实践篇“环境要求”写“官方预编译包使用 CUDA 12.9”。0.32.0 的 PyPI 轮子与默认镜像是 CUDA 13.0（需 R580+ 驱动），CUDA 12.9 是单独的 `-cu129` 镜像/轮子。依据见上。
2. ❌ 实践篇“默认监听 `http://localhost:8000`，要让别的机器访问加 `--host 0.0.0.0`”。源码 `launcher.py:397` 绑定 `(args.host or "", port)`，默认监听所有网卡；要只对本机开放需显式 `--host 127.0.0.1`。这是安全相关的更正。
3. ⚠️ 实践篇特点表“量化：支持 FP8、AWQ、GPTQ、GGUF 等”。GGUF（及 bitsandbytes）已移至树外插件 `vllm-gguf-plugin`/`vllm-bnb-plugin`，需单独安装。
4. ⚠️ 第 18 篇“CUDA Graph 默认对纯 Decode 批录制完整图、对混合批分段录制”：与 `FULL_AND_PIECEWISE` 默认一致 ✅；但这是 `-O2`（默认优化级别）下的行为，`-O1` 只有 PIECEWISE，`-O0`/`--enforce-eager` 无图。
5. ✅ 第 18 篇与实践篇的 0.92、max_num_seqs、max_num_batched_tokens、API key 前缀、`max_tokens` 新语义、CORS 收紧等均与源码一致。
6. 说明：MRV2 自 0.29.0 起默认用于所有模型，0.32.0 仍保留 MRV1 作回退（原计划 0.32 移除未完成）。第 18 篇“MRV2 是 V1 引擎里模型执行器的新实现”✅。
