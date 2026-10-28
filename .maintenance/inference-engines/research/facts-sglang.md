# SGLang 篇核对记录（facts-sglang）

- 核查日期：2026-10-27
- 源码：`sgl-project/sglang` tag `v0.5.22`（commit `baa9befa`，提交时间 2026-10-13），检出在 scratchpad `src/sglang`。下文路径相对仓库根目录，`srt/` 指 `python/sglang/srt/`。
- 发布：`gh release list -R sgl-project/sglang` → v0.5.22 Latest，发布于 2026-10-19T02:55Z；v0.5.21 2026-10-02；v0.5.20 2026-09-18；v0.5.19 2026-09-05。✅ 与简报一致。
- 标记：✅ 已核实；⚠️ 已核实但有坑；❌ 与常见说法或站内现有说法不符；❓ 未能核实。
- 本篇所有 GPU 命令未在 GPU 上运行；本机是 Apple Silicon，未安装 SGLang。

## 1. 版本、安装、依赖

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| `requires-python = ">=3.11"` | `python/pyproject.toml:16` | ✅ |
| 依赖钉死 `torch==2.14.1`、`flashinfer_python[cu13]==0.7.1`、`sglang-kernel==0.4.9`、`transformers==5.19.0`、`xgrammar==0.2.7` | `python/pyproject.toml:89,42,81,95,99` | ✅ |
| `all` extra = `diffusion` + `fastokens` + `http2` + `tracing` | `python/pyproject.toml:198-203` | ⚠️ 第 18 篇写 `pip install 'sglang[all]==0.5.22'`，可用但会装 Diffusion 依赖；官方文档推荐 `uv pip install --prerelease=allow sglang` |
| 官方安装：`uv pip install --prerelease=allow sglang`；“Some of SGLang's dependencies only publish pre-releases on PyPI, so without `--prerelease=allow` uv older than 0.12.0 silently installs SGLang 0.5.9” | `docs/docs/get-started/install.mdx:91` 及其折叠说明 | ✅ |
| SGLang 需要 CUDA 13；0.5.19 是最后一个带 CUDA 12 的版本；`lmsysorg/sglang:v0.5.19-cu129` 是最后一个 CUDA 12 镜像 | `install.mdx`（Docker 与 pip 两节）、v0.5.20 release notes “Dependencies and images” | ✅ |
| 新 CLI：`sglang serve MODEL_PATH --host 0.0.0.0 --port 30000`；`python -m sglang.launch_server --model-path ...` 仍可用 | `install.mdx`；`python/sglang/cli/main.py:28-51`、`cli/serve.py:56-59`（位置参数转成 `--model-path`） | ✅ |
| Docker：`lmsysorg/sglang:latest`（稳定版）、`latest-runtime`；版本标签 `v0.5.22`、`v0.5.22-rocm10-mi35x`、`-rocm10-mi30x`、`-xpu`、`-xeon` | `install.mdx`；v0.5.22 release notes “To upgrade” | ✅ |
| v0.5.22 release notes：“SGLang now requires Python 3.11 or newer.”；新增 Apple Silicon 上标准 PyTorch 后端（#36780）；InstantTensor 加载器；PD 长提示吞吐 +27%；修复混合线性模型在投机解码 + 结构化输出组合时恢复错误 mamba 状态（#43029） | `gh release view v0.5.22` | ✅ |
| v0.5.21：PD 实例可在线切换 prefill/decode（#28403）；前缀缓存默认跑在 Rust 核心上（#39627）；`/v1/decisions`、`/v1/score` | `gh release view v0.5.21` | ✅ |
| v0.5.20：Responses API 存储改为 opt-in `--enable-response-store`；CUDA 12 lane 退役；Intel XPU 版本镜像；SGLang Simulator；prefill CP v1 删除 | `gh release view v0.5.20` | ✅ |

## 2. 默认监听与安全

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| `host` 默认 `127.0.0.1`，`port` 默认 `30000` | `srt/arg_groups/fields/serving.py:65-66` | ✅ 容器里必须加 `--host 0.0.0.0` |
| `api_key` 默认 None；只有设置 `api_key`/`admin_api_key` 或存在 admin-force 端点时才挂鉴权中间件 | `serving.py:154,158`；`srt/entrypoints/http_server.py:2666-2683` | ⚠️ 默认无鉴权 |
| `/health*`、`/ready*`、`/metrics*` 始终免鉴权 | `srt/utils/auth.py:101-106` | ✅ |
| 多 tokenizer 进程模式不支持 API key（assert） | `http_server.py:247-250` | ⚠️ `--tokenizer-worker-num > 1` 与 `--api-key` 不能同时用 |
| `/flush_cache`、`/update_weights_from_disk`、`/load_lora_adapter`、`/start_profile` 等管理端点与推理端点在同一端口 | `http_server.py:1009,1265,1617,1186` | ⚠️ 不设 key 时任何能连上端口的人都能调用 |
| 兼容接口：`/v1/chat/completions`、`/v1/completions`、`/v1/embeddings`、`/v1/rerank`、`/v1/responses`、`/v1/score`、`/v1/decisions`、Anthropic `/v1/messages`、Ollama `/api/chat` 等；原生 `/generate` | `http_server.py:1793-1862,2035,1983-1999,2093,2064,913` | ✅ |
| Prometheus：`--enable-metrics` 默认 False；挂载 `/metrics` | `fields/observability.py:70`；`srt/utils/common.py:2797-2808` | ✅ |

## 3. 进程架构与 IPC

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| “Launch the TokenizerManager in the main process, the Scheduler in a subprocess, and the DetokenizerManager in another subprocess.” | `srt/entrypoints/engine.py:1137`（`_launch_subprocesses` docstring） | ✅ |
| 每个 (pp_rank, tp_rank) 启一个 Scheduler 进程，按 `base_gpu_id + ... * gpu_id_step` 选卡；`num_dp_ranks > 1` 时先启 `DataParallelController` 进程 | `engine.py:889-990` | ✅ |
| Scheduler 进程内创建 `TpModelWorker`，后者创建 `ModelRunner` | `srt/managers/scheduler.py:1005-1009`；`srt/managers/tp_worker.py:279,480` | ✅ Scheduler 与模型执行在同一进程 |
| IPC 用 ZeroMQ：TokenizerManager PUSH → `scheduler_input_ipc_name`；rank 0 Scheduler PULL 接收，再 PUSH 到 `detokenizer_ipc_name`；Detokenizer PUSH 回 `tokenizer_ipc_name` | `srt/managers/scheduler_components/ipc_channels.py:36-65`；`tokenizer_manager.py:661-672`；`detokenizer_manager.py:125-134`；`server_args.py:719-745`（PortArgs） | ✅ |
| 只有 TP rank 0 从 tokenizer 收请求，再 `broadcast_pyobj` 给其他 rank | `scheduler_components/request_receiver.py:83-101` | ✅ |
| `skip_tokenizer_init` 时 Scheduler 直接把输出发给 tokenizer 侧，跳过 Detokenizer | `ipc_channels.py:55-60` | ✅ |
| `tokenizer_worker_num` / `detokenizer_worker_num` 默认 1 | `serving.py:50,54` | ✅ |
| 非 0 号节点不跑 tokenizer 进程 | `engine.py` `_launch_subprocesses` 中 `node_rank >= 1` 分支 | ✅ |

## 4. 调度循环、重叠调度、分块预填充

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| `event_loop_normal`：收请求 → `get_next_batch_to_run` → `run_batch` → `process_batch_result` | `scheduler.py:1940-1972` | ✅ |
| `event_loop_overlap`：本批 `run_batch` 发射后先把上一批结果出队处理，再为本批启动采样（采样依赖上一批的语法状态） | `scheduler.py:1975-2047` | ✅ |
| 连续两个 prefill 批时可关闭重叠以改善首批 TTFT，由环境变量 `SGLANG_DISABLE_CONSECUTIVE_PREFILL_OVERLAP`（默认 False）控制 | `scheduler.py:2049-2070`；`srt/environ.py:642` | ✅ |
| 跨步依赖通过 `FutureMap` 在 GPU 上传递上一步的输出 token | `srt/managers/overlap_utils.py:255-258` | ✅ |
| `disable_overlap_schedule` 默认 False；`enable_overlap = not disable_overlap_schedule and not use_mlx()` | `fields/schedule.py:187`；`scheduler.py:495-500` | ✅ 默认开启 |
| 自动关闭重叠：PP>1、扩散语言模型、mamba no_buffer、MPS 非 MLX、CPU 上投机解码 | `srt/arg_groups/overrides.py:1576-1580`（PP）、`:1667-1674`（扩散 LLM）、`:450-462`（mamba）；`platform_hook.py:43-48`；`speculative_hook.py:65-73` | ✅ |
| 先 prefill 后 decode：`get_new_batch_prefill` 有结果就跑 prefill，否则 `update_running_batch` 做 decode | `scheduler.py:3854-3880` | ✅ |
| `enable_mixed_chunk` 默认 False（混合 prefill 与 decode） | `schedule.py:202` | ✅ |
| `chunked_prefill_size` 默认 None，按显存档位解析：<20GB 2048；<35GB 4096；<60GB 4096；<90GB（H100 80GB）8192；<160GB 8192；更大 16384；`-1` 关闭 | `srt/arg_groups/memory_hook.py:87-180`；`schedule.py:52` | ✅ |
| decode CUDA Graph `max_bs`：H100 档 TP<4 为 256、TP≥4 为 512；若设置了 `max_running_requests` 且更小则截到它 | `memory_hook.py:127-140,182-189` | ✅ |
| `mem_fraction_static` 默认 None，按 `(gpu_mem - reserved)/gpu_mem` 计算；reserved = 512 + max(chunked_prefill,2048)*1.5 + tp*pp/8*1024 + 图预留 [+ DeepEP]；显存 >60GB 时 reserved 至少 10 GiB；单位 MiB | `memory_hook.py:283-345,351-390` | ✅ |
| 手算：H100 80GB（约 81559 MiB）、Qwen3-8B、TP=1：reserved ≈ 512+12288+128+256×2+58×8 ≈ 13904 MiB → mem_fraction_static ≈ 0.83；KV ≈ 0.83×79.6 GiB − 15.3 GiB 权重 ≈ 51 GiB；Qwen3-8B 每 token KV = 2×36×8×128×2 B = 144 KiB → 约 37 万 token | 本条为手算，prefill 图档位数 58 来自 `cuda_graph_hook.py:442-459` | ⚠️ 估计，未实测 |
| `max_running_requests` 默认：`min(clamp(容量/context_len×512, 2048, 4096), 容量//2)` | `srt/mem_cache/kv_cache_configurator.py:2800-2812` | ✅ |
| `max_prefill_tokens` 默认 16384；`schedule_conservativeness` 1.0；`num_continuous_decode_steps` 1；`retraction_policy` "length" | `schedule.py:67,135,194,122` | ✅ |
| `page_size` 默认 None → 解析为 1（MUSA 为 64；部分注意力后端强制 32/64/128） | `overrides.py:1303-1325,1085-1150,1240-1260` | ✅ 基数树按 token 粒度 |

## 5. RadixAttention 与调度策略

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| 论文：Zheng et al., "SGLang: Efficient Execution of Structured Language Model Programs"，arXiv 2312.07104（NeurIPS 2024）；摘要提出 RadixAttention 与压缩有限状态机，"up to 6.4x higher throughput" | 已在 `.maintenance/llm-inference/research/facts.md` 核实 | ✅ |
| `schedule_policy` 默认 `"fcfs"`；choices `lpm, random, fcfs, dfs-weight, lof, priority, routing-key, hrrn, shortest-prefill-first` | `fields/schedule.py:82-97` | ✅ |
| 枚举：CacheAware = lpm、dfs-weight、hrrn、shortest-prefill-first；CacheAgnostic = fcfs、lof、random、routing-key | `srt/managers/schedule_policy.py:168-183` | ✅ |
| ⚠️ `priority` 在 CLI choices 里，但两个枚举都没有它，`_validate_and_adjust_policy` 会抛 `Unknown schedule_policy`；优先级调度实际用 `--enable-priority-scheduling`，且要求策略是 fcfs 或 lof | `schedule_policy.py:320-340`；`srt/arg_groups/validation_hook.py:280-286` | ⚠️ 按源码推断，未运行验证 |
| 前缀缓存关闭（`disable` 为真）时，cache-aware 策略回退为 FCFS；`shortest-prefill-first` 则直接报错 | `schedule_policy.py:320-335` | ✅ |
| lpm、hrrn 在等待队列 > 128（`WAITING_QUEUE_PREFIX_MATCH_MAX`）时本轮退化为 FCFS | `schedule_policy.py:133,300-311` | ✅ dfs-weight、shortest-prefill-first 不受此限 |
| lpm：按 `-num_matched_prefix_tokens` 排序；队列内“共享前缀去重”：命中缓存 ≤ 32 token（`IN_BATCH_PREFIX_CACHING_CHECK_THRESHOLD`）的请求再去一棵模拟的等待队列基数树里匹配，若与队列中已有请求共享 ≥ 32 token（`..._DEPRIORITIZE_THRESHOLD`）就暂时降级到队尾 | `schedule_policy.py:104-114,342-393,437-447` | ✅ 两阈值可由同名环境变量改 |
| hrrn：按 `等待期间处理的 prefill token 数 / 未命中长度` 的比值降序 | `schedule_policy.py:456-490` | ✅ |
| dfs-weight：按树上 DFS 权重顺序 | `schedule_policy.py:492-498` | ✅ |
| lof：按 `max_new_tokens` 降序（开启优先级时先按优先级） | `schedule_policy.py:500-515` | ✅ |
| routing-key：运行批里出现次数多的 routing key 优先 | `schedule_policy.py:534-565` | ✅ |
| fcfs 且开启优先级调度：按 (priority×sign, 入队时间) 排序 | `schedule_policy.py:227-231,522-532` | ✅ |
| 基数树键 `RadixKey` 含 token、`extra_key`、`cache_salt` | `srt/mem_cache/radix_cache.py:59`；`schedule_policy.py:364-372` | ✅ |
| 回收策略 `--radix-eviction-policy` 默认 lru，可选 lru/lfu/slru/priority/tlru；只回收未加锁的叶子，叶子回收后父节点再成为候选 | `fields/memory.py:25`；`choices.py:187`；`docs/docs/advanced_features/radix_eviction_policy.mdx` | ✅ |
| `--disable-radix-cache` 默认 False | `fields/memory.py:64` | ✅ |
| 默认缓存实现为 `UnifiedRadixCache`；`--enable-lmcache`、`--enable-flexkv` 可换实现 | `srt/mem_cache/registry.py:85-140`；`fields/memory.py:237,248` | ✅ |

## 6. CUDA Graph、torch.compile、注意力后端

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| CUDA 上默认：decode 阶段 `full` 图，prefill 阶段 `breakable` 图；其他平台 prefill 默认 disabled | `srt/model_executor/cuda_graph_config.py:90-97,119-123,146-154` | ✅ |
| PP>1 时默认关闭 breakable prefill 图 | `srt/arg_groups/cuda_graph_hook.py:104-130` | ✅ |
| 新参数：`--cuda-graph-config` JSON、`--cuda-graph-backend-{decode,prefill}`、`--cuda-graph-max-bs-{decode,prefill}`、`--disable-{prefill,decode}-cuda-graph` | `fields/exec_.py:544-605` | ✅ 旧的 `--cuda-graph-max-bs` 等未在 v0.5.22 fields 中出现，属于“legacy flags”路径（`cuda_graph_hook.py:54-66`） |
| prefill 图默认 max_bs = chunked_prefill_size（MLA 为 2048） | `memory_hook.py:233-245` | ✅ |
| `enable_torch_compile` 默认 False，`torch_compile_max_bs` 32 | `fields/exec_.py:629,636` | ✅ |
| 注意力后端默认选择：MHA 在 Hopper（CUDA≥12.3）且无投机或 topk=1 → `fa3`；SM100 → `trtllm_mha`（K/V 维度不等时 `fa4`）；ROCm → `aiter`；MPS → `torch_native`；其余有 FlashInfer 且无 attention sink → `flashinfer`，否则 `triton`；MLA：Hopper `fa3`，SM100 `flashinfer`，ROCm `aiter`/`triton` | `srt/arg_groups/model_override_base.py:268-340` | ✅ docstring 写了“page_size>1 时不用 fa3”，代码没检查 page_size |
| 注意力后端 choices 含 triton、torch_native、flex_attention、fa3、fa4、flashinfer、flashmla、trtllm_mla、cutedsl_mla、trtllm_mha、aiter、wave、intel_amx、ascend、intel_xpu 等 | `choices.py:69-96` | ✅ |
| 可分别设置 `--prefill-attention-backend`、`--decode-attention-backend` | `fields/exec_.py:173,185` | ✅ |

## 7. 结构化输出

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| `grammar_backend` 默认 None → 解析为 `xgrammar`；choices `xgrammar, outlines, llguidance, none` | `fields/exec_.py:216`；`srt/arg_groups/serving_hook.py:232-237`；`choices.py:131` | ✅ |
| XGrammar 支持 JSON schema / regex / EBNF；Outlines 支持 JSON schema / regex；llguidance 三者都支持；每个请求只能给一种约束 | `docs/docs/advanced_features/structured_outputs.mdx` | ✅ |
| 推理模型：用 `--reasoning-parser` 让 `<think>` 段内不受语法约束 | `structured_outputs_for_reasoning_models.mdx`；`srt/constrained/reasoner_grammar_backend.py` | ✅ |

## 8. 投机解码

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| 内置算法：EAGLE、EAGLE3、NEXTN（别名，映射到 EAGLE）、STANDALONE、NGRAM、DFLASH、DSPARK、UNO；另有 FROZEN_KV_MTP 枚举，可插件注册 | `fields/spec.py:31-34`；`srt/speculative/spec_info.py:32-65`；`spec_registry.py:183` | ✅ |
| 官方建议：最佳用 EAGLE3；无草稿模型用 NGRAM（仅 CUDA）；MTP 模型用 `--speculative-algorithm EAGLE` + 小步数 | `docs/docs/advanced_features/speculative_decoding.mdx:28-38,434-450` | ✅ |
| 三个参数 `--speculative-num-steps/--speculative-eagle-topk/--speculative-num-draft-tokens` 要么都不设（自动调），要么都设 | 同上 :239 | ✅ |
| 投机解码默认走 V2 worker + 重叠调度；重叠调度只支持 topk=1，显式设 topk>1 报错 | 同上 :743-750 | ⚠️ |
| EAGLE 家族未设 `max_running_requests` 时自动设为 48 | `srt/arg_groups/speculative_hook.py:995-1003`（STANDALONE 等在 :425、:781、:918、:1208 同理） | ⚠️ 高并发时要手动调大 |
| `speculative_ngram_*` 默认：min/max BFS breadth 1/10、trie 深度 18 | `fields/spec.py:255-271` | ✅ |
| 指标 `sglang:spec_accept_length`、`sglang:spec_accept_rate` | `srt/observability/metrics_collector.py:504-515` | ✅ |

## 9. 并行

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| `--tp-size`（别名 `--tensor-parallel-size`，常用 `--tp`）、`--pp-size`、`--dp-size`、`--attn-dp-size`、`--ep-size`（别名 `--ep`）、`--nnodes`、`--node-rank`、`--dist-init-addr` | `fields/parallel.py:32-121,269-275` | ✅ |
| ❌/⚠️ `--enable-dp-attention` 已废弃：`--dp-size N --enable-dp-attention` 解析为 `--attn-dp-size N --dp-size 1` 并告警，2026-12-31 后移除 | `parallel.py:190-194`；`server_args.py:330,418-422`；`docs/docs/advanced_features/dp_dpa_smg_guide.mdx:123` | ⚠️ 旧教程写法要改 |
| DPA 约束 `tp_size % attn_dp_size == 0`；DPA 与 `--dp-size > 1` 不能组合 | `dp_dpa_smg_guide.mdx:121` | ✅ |
| 原生 `--dp-size` 由 DataParallelController 管理，文档称“highly not recommended”，推荐 SMG | `dp_dpa_smg_guide.mdx:157-190` | ✅ |
| DeepSeek 推荐：`--tp 8 --attn-dp-size 8 --ep 8 --moe-a2a-backend deepep --moe-runner-backend deep_gemm` | `dp_dpa_smg_guide.mdx:77-87` | ✅ |
| `moe_a2a_backend` 默认 none；可选 deepep、mooncake、nixl、mori、flashinfer、ascend_fuseep 等；`enable_eplb` 默认 False；`enable_two_batch_overlap` 默认 False | `fields/exec_.py:773,859,967`；`expert_parallelism.mdx` | ✅ |
| 多机：`--tp 16 --dist-init-addr IP:PORT --nnodes 2 --node-rank {0,1}` | `docs/docs/references/multi_node_deployment/multi_node.mdx:11-25` | ✅ |
| PP>1 与重叠调度不兼容（自动关闭） | `overrides.py:1576-1580` | ✅ |

## 10. HiCache

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| `--enable-hierarchical-cache` 默认 False；L1 GPU、L2 主机内存、L3 存储后端 | `fields/memory.py:98`；`hicache_design.mdx` | ✅ |
| L2 是实例私有，跨实例共享只能靠 L3 | `hicache_design.mdx` “Tier Sharing Scope” | ✅ |
| `hicache_ratio` 默认 None（cache 模式解析为 2.0）；`hicache_size` 0；`hicache_write_policy` write_through；`hicache_io_backend` kernel；`hicache_mem_layout` page_first；`hicache_storage_prefetch_policy` timeout；`hicache_host_memory_fraction` 0.8 | `fields/memory.py:99-175` | ✅ |
| L3 后端：file、mooncake、hf3fs、nixl、aibrix、eic、simm、mori、shm、tensorcast、seaweedfs、npu_memcache、dynamic 等 | `fields/memory.py:145-165` | ✅ |
| 预取超时 = min(max, base + per_ki_token × n/1024)，默认 2 s、0.1 s、30 s；L3 命中超过 256 token 才触发预取 | `hicache_design.mdx` | ✅ 文档值 |

## 11. P/D 分离

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| `--disaggregation-mode` 默认 null；`--disaggregation-transfer-backend` 默认 mooncake；choices mooncake、nixl、ascend、fake、mori、mooncake_tcp | `fields/disagg.py:55,65`；`choices.py:122-129` | ✅ |
| `--disaggregation-bootstrap-port` 默认 8998；`--disaggregation-decode-enable-radix-cache` 默认 False；`num_reserved_decode_tokens` 512；`disaggregation_decode_allocation_policy` early | `disagg.py:78,85,106,59` | ✅ decode 侧默认不保留前缀缓存 |
| 单机示例：prefill `--port 30000`、decode `--port 30001 --base-gpu-id 1`，加 `--disaggregation-ib-device`；路由：`python -m sglang_router.launch_router --pd-disaggregation --prefill http://127.0.0.1:30000 --decode http://127.0.0.1:30001 --host 0.0.0.0 --port 8000` | `pd_disaggregation.mdx:157-172` | ✅ |
| 文档动机：prefill 打断 decode；DP attention 下负载不均；“Currently, we support Mooncake and NIXL as the transfer engine” | `pd_disaggregation.mdx` 开头 | ✅ |
| PD 下不支持有状态 Responses（store、previous_response_id、background） | `pd_disaggregation.mdx` “Responses API under HTTP PD” | ✅ |

## 12. Router / SGLang Model Gateway

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| `sgl-model-gateway/` 是 Rust 项目，Cargo 版本 0.3.2；Python 包 `sglang-router` 0.3.2；CLI `smg`、`python -m sglang_router.launch_router` | `sgl-model-gateway/Cargo.toml`；`bindings/python/pyproject.toml:7`；`sgl_model_gateway.mdx:1708-1722` | ✅ |
| 主 README 的生态表把 SMG 链接到 `github.com/smg-project/smg` | `README.md:70` | ⚠️ 网关开发可能已迁往独立仓库；本篇只按 v0.5.22 仓库内的代码与文档写 |
| 默认 `--policy cache_aware`，`--cache-threshold 0.3`，`--balance-abs-threshold 64`，`--balance-rel-threshold 1.5`，`--eviction-interval 120`，`--max-tree-size 67108864`；host 0.0.0.0、port 30000 | `sgl-model-gateway/src/main.rs:136-170`；`bindings/python/src/sglang_router/router_args.py:41-60` | ✅ 与 SGLang 服务默认端口相同，同机部署要改 |
| Python 侧策略：random、round_robin、cache_aware、power_of_two、bucket、manual、consistent_hashing、prefix_hash；Rust 独立二进制只接受其中子集（无 bucket、consistent_hashing） | `router_args.py:25-34`；`main.rs:150` | ⚠️ |
| SMG 版 DP：`python -m sglang_router.launch_server --model-path ... --dp-size 4` | `dp_dpa_smg_guide.mdx:178-190` | ✅ |
| 网关 Prometheus 默认 `0.0.0.0:29000`；默认无鉴权 | `sgl_model_gateway.mdx:1885,1993` | ✅ |

## 13. 量化、LoRA、多模态、嵌入

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| `--quantization` choices 含 awq、fp8、mxfp8、gptq、gptq_marlin、awq_marlin、bitsandbytes、gguf、modelopt_fp8、modelopt_fp4、w8a8_int8、w8a8_fp8、w4afp8、mxfp4、auto-round、compressed-tensors、modelslim（NPU）、quark、mlx_q4/q8 等 | `choices.py:32-67` | ✅ |
| 文档：推荐离线量化；已量化的模型不要再加 `--quantization` | `quantization.mdx` | ✅ |
| `--kv-cache-dtype` 默认 auto；可选 fp8_e5m2、fp8_e4m3、mxfp8、bf16、nvfp4、fp4_mx_block16 | `fields/model.py:191-215` | ✅ |
| LoRA：`max_loras_per_batch` 8；`lora_backend` csgmv；`lora_eviction_policy` lru；动态 `/load_lora_adapter`、`/unload_lora_adapter`；OpenAI 接口用 `model:adapter` 语法 | `fields/lora.py:66,70,77`；`http_server.py:1617,1641`；`lora.mdx` | ✅ |
| `--is-embedding` 默认 False；支持文档分类：embedding、rerank、reward、classify、decision、multimodal、diffusion LM、transformers fallback（`--model-impl` 默认 auto） | `fields/model.py:112,120`；`docs/docs/supported-models/` | ✅ |
| 多模态：`--enable-multimodal`、`--mm-attention-backend`、`--enable-prefix-mm-cache` 等 | `fields/mm.py:27-138` | ✅ |

## 14. 硬件

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| README 支持表：NVIDIA（B200/B300/GB200/GB300、H100/H200/H800/H20、A100、RTX 30/40/50、Jetson Orin、DGX Spark）、AMD Instinct MI300X/MI325X/MI350X/MI355X、Google TPU v6e/v7（经 SGL-JAX）、Intel Arc GPU 与 Xeon CPU、Apple Silicon（Metal/MLX）、华为昇腾 A2/A3/950PR/DT、摩尔线程 MTT S5000 | `README.md` Supported Hardware | ✅ |
| TPU 走独立仓库 `sgl-project/sglang-jax` | `docs/docs/hardware-platforms/tpu.mdx` | ✅ |
| Apple：`SGLANG_USE_MLX=1` 启用 MLX 后端，否则回落到 `torch.mps`（支持更少）；需 macOS 14+ | `apple_metal.mdx:9-20,62-70` | ✅ 未在本机实测 |
| 平台实现：`srt/platforms/{cuda,rocm,npu,xpu,cpu,mps,musa}.py` | 目录 | ✅ |

## 15. 部署与可观测性

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| Docker 运行：`--gpus all --shm-size 32g -p 30000:30000 -v $HF_CACHE_DIR:/root/.cache/huggingface --ipc=host` | `install.mdx` | ✅ |
| K8s：`docker/k8s-sglang-service.yaml`（单机，liveness `/health`、readiness `/health_generate`，initialDelay 120 s）、`docker/k8s-sglang-distributed-sts.yaml`；推荐 OME operator；多机用 LWS；PD 有 RBG 示例 | `docker/k8s-sglang-service.yaml`；`install.mdx`；`multi_node_index.mdx`；`deploy_on_k8s.mdx` | ✅ |
| README 生态表：SMG、RBG、llm-d、Ray Serve、NVIDIA Dynamo 用于部署编排 | `README.md:70` | ✅ |
| 指标：`sglang:num_running_reqs`、`num_queue_reqs`、`gen_throughput`、`cache_hit_rate`、`token_usage`（最紧的池的占用率）、`time_to_first_token_seconds`、`inter_token_latency_seconds`、`e2e_request_latency_seconds`、`num_retracted_reqs`、`spec_accept_length` | `metrics_collector.py:357-397,504,545,1976-2003`；`production_metrics.mdx` | ✅ |
| OpenTelemetry：`--enable-trace`、`--otlp-traces-endpoint` 默认 localhost:4317 | `fields/observability.py:164,169` | ✅ |

## 16. 与站内现有说法的对照

1. 第 18 篇安装命令 `python -m pip install 'sglang[all]==0.5.22'`：`all` extra 现在包含 Diffusion 等可选依赖；官方安装方式是 `uv pip install --prerelease=allow sglang==0.5.22`，并且需要 CUDA 13 驱动环境。⚠️ 建议在第 18 篇改用官方写法或注明。
2. 第 18 篇启动示例用 `--port 8000`：可用，但默认端口是 30000，且默认只监听 127.0.0.1。✅ 无需更正，可补一句。
3. 第 18 篇、第 10 篇“默认先来先服务，可选前缀匹配优先” ✅ 与源码一致。
4. 第 18 篇表格“投机解码支持树形草稿” ✅，但 v0.5.22 默认的重叠调度只支持 topk=1，树形草稿（topk>1）需要 `--disable-overlap-schedule`。
5. 第 18 篇“P/D 分离内置，默认 Mooncake 传输” ✅。
6. 第 18 篇对重叠调度的描述 ✅。

## 17. 仍不确定

- `schedule_policy=priority` 在 CLI 中可选却会在 Scheduler 初始化时报错：依据源码阅读推断，未实际运行。
- SMG 是否已整体迁往 `smg-project/smg`：仓库内仍有 `sgl-model-gateway/`，README 生态表指向新仓库，未进一步核实新仓库版本。
- pip（非 uv）在不加预发布开关时能否解析出 0.5.22：未验证，正文按官方文档推荐 uv。
- 手算的 mem_fraction_static≈0.83 和约 37 万 token KV 容量依赖 torch 报告的显存总量与权重实际大小，未在 GPU 上验证。

## 18. 写作中补充核对

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| SMG `cache_aware`：负载差 > `balance_abs_threshold` 且 max > min × `balance_rel_threshold` 时发往最小负载；否则命中率 > `cache_threshold` 发往命中最多的实例，否则发往树最小的实例；近似树存原始字符、不分词、不查询实例缓存 | `sgl-model-gateway/src/policies/cache_aware.rs:20-30,410-416` | ✅ |
| `/health_generate` 空闲时生成 1 个 token；`/health` 默认直接 200（除非 `SGLANG_ENABLE_HEALTH_ENDPOINT_GENERATION`） | `srt/entrypoints/http_server.py:704-730` | ✅ |
| 重叠调度下按长度上限结束的请求会跳过多余的一步（`_reqs_finishing_inflight`），按结束符停止的请求可能多算一步 | `srt/managers/scheduler.py:1977,4320-4333` | ✅（后半句为按机制推断） |
| `/pd_role_switch` 需要 `--enable-pd-role-switch` | `fields/disagg.py:118`；`http_server.py:1600` | ✅ |
| MLA 在非 Hopper/SM100/ROCm/MPS 的 CUDA 卡上默认 `triton` | `model_override_base.py:327-341` | ✅ |
| 多模态文档列出 Qwen-VL、DeepSeek-VL2、Gemma 3、Llama 3.2 Vision、Kimi-VL、GLM-4.5V、MiniCPM-V 等；未列 InternVL、Llama 4 | `docs/docs/supported-models/multimodal_language_models.mdx` | ✅ |
| Qwen 系列工具调用解析器 `qwen`（Qwen3-Coder 用 `qwen3_coder`）；推理解析器 `qwen3`；请求可带 `chat_template_kwargs` | `docs/docs/advanced_features/tool_parser.mdx:81-84`；`srt/parser/reasoning_parser.py:2275`；`srt/entrypoints/openai/protocol.py:960` | ✅ |
| 官方 Dockerfile 最终 `CMD ["/bin/bash"]`，无 ENTRYPOINT，`docker run ... 镜像 sglang serve ...` 可直接覆盖命令 | `docker/Dockerfile:810` | ✅ |
| `model_impl` 默认 auto：有 SGLang 实现用之，否则回落 Transformers | `fields/model.py:120-134` | ✅ |
