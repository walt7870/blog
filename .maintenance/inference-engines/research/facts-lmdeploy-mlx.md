# 核对记录：LMDeploy 与 MLX-LM/端侧（第 06、07 篇）

查询日期 2026-10-27。源码只读检出在
`/private/tmp/claude-501/-Users-waltniu-project-blog/ab2dea5d-ac09-4d96-a1ed-1bc537d34308/scratchpad/src/`：

- `lmdeploy`：`git clone --depth 1 --branch v0.18.0`，提交 `110965c7706b`（2026-09-28）。下文 `L/` 指该目录。
- `mlx-lm`：`git clone --depth 1 --branch v0.32.2`。下文 `M/` 指该目录。

## 版本

| 项目 | 结论 | 来源 |
| --- | --- | --- |
| LMDeploy | 最新正式版 v0.18.0，2026-09-28；之前 0.17.0（09-01）、0.16.0（08-19）、0.15.0（07-31）、0.14.0（06-24），0.14.0a2 为预发布 | `gh release list -R InternLM/lmdeploy` |
| LMDeploy PyPI | 0.18.0 有 cp310–cp314 的 manylinux_2_28 x86_64 与 win_amd64 轮子，无 macOS 轮子 | `https://pypi.org/pypi/lmdeploy/0.18.0/json` |
| LMDeploy 版本号 | `L/lmdeploy/version.py:3` `__version__ = '0.18.0'` | 源码 |
| LMDeploy Python | README 写 conda 环境 python 3.10–3.13；`setup.py:190-193` 分类器 3.10–3.13；PyPI 另有 cp314 轮子 | README、setup.py、PyPI |
| LMDeploy CUDA | README：自 v0.13.0 起 PyPI 默认轮子基于 CUDA 12.8（含 RTX 50 系列）；`docker/Dockerfile:3` 默认 `CUDA_VERSION=cu128`，另有 cu130 阶段 | README、Dockerfile |
| MLX-LM | 最新正式版 v0.32.2，2026-10-16；v0.32.1、v0.32.0 均为 10-15；上一组 0.31.3（04-22） | `gh release list -R ml-explore/mlx-lm` |
| MLX | 最新 v0.32.4，2026-10-14 | `gh release list -R ml-explore/mlx` |
| mlx-lm Python | `requires-python = ">=3.11"`；依赖 `mlx>=0.32.2`（仅 Darwin）、`transformers>=5.7.0`；可选 `cuda12`/`cuda13`/`cpu` extras | `M/pyproject.toml:12,25-27,39-46` |
| ExecuTorch | v1.5.1，2026-09-23 | `gh release list -R pytorch/executorch` |
| MLC-LLM | GitHub 无正式发布（只有 2023 年的 v0.1.dev0 预发布），tag 到 v0.26.dev0；仓库未归档，最近提交 2026-10-06 | gh api |
| mlx-vlm | 独立项目 Blaizzy/mlx-vlm，v0.7.10（2026-10-21） | gh |
| vllm-metal | vllm-project/vllm-metal 存在，近期仍有推送 | gh api |

## LMDeploy：引擎选择

- `--backend` 默认值 `turbomind`，可选 `pytorch`/`turbomind`：`L/lmdeploy/cli/utils.py:394-400`。
- 但 `api_server` 里只要不是 `pytorch` 就走自动选择：`L/lmdeploy/cli/serve.py:237-240` 调 `autoget_backend`。所以“默认 turbomind”实际含义是“优先 TurboMind，不支持就回退 PyTorch”。
- `autoget_backend`：TurboMind 未编译 → 回退 PyTorch 并打印 `Fallback to pytorch engine because turbomind is not built.`；架构不在支持表 → 打印 `Fallback to pytorch engine because ... not supported by turbomind engine.`：`L/lmdeploy/archs.py:10-42`。
- 管道 API 传入 `PytorchEngineConfig` 直接用 PyTorch：`archs.py:63-64`。
- TurboMind 支持判定 `L/lmdeploy/turbomind/supported_models.py:7-76`：有 `triton_models` 目录（旧 convert 产物）→ 支持；`quant_method == 'smooth_quant'` → 不支持；架构在 `SUPPORTED_ARCHS` 中才支持。0.18.0 的表：Qwen2ForCausalLM、Qwen2MoeForCausalLM、Qwen2VL/Qwen2_5_VL、Qwen3ForCausalLM、Qwen3MoeForCausalLM、Qwen3_5(Moe)ForConditionalGeneration、InternS2Preview、InternS2Mobius、InternVLChatModel、InternVLForConditionalGeneration、InternS1ForConditionalGeneration、LlamaForCausalLM、InternLM2ForCausalLM、InternLM3ForCausalLM、Glm4MoeLiteForCausalLM（带 vision_config 时不支持）、GptOssForCausalLM、MixtralForCausalLM。
- `L/lmdeploy/turbomind/models/` 只有 glm4_moe_lite、gpt_oss、internlm2、interns2_mobius、internvl、llama、mixtral、qwen2_vl、qwen2、qwen3_5、qwen3 共 11 个实现文件。
- 0.14.0 发布说明 “Update turbomind modeling infrastructure”“Bring MixtralForCausalLM back to Turbomind”；0.15.0 “chore: remove deprecated model support”。说明 TurboMind 覆盖面在 0.14–0.15 收窄过。
- 是否 VLM：`archs.py:84-113` 的 `check_vl_llm`，按架构名判定；`get_task` 返回 `VLAsyncEngine`。

## LMDeploy：进程与模块

- `api_server` 对 PyTorch 引擎强制 `enable_mp_engine = True`：`L/lmdeploy/serve/openai/api_server.py:366-367`；`mp_engine_backend` 默认 `'mp'`（`messages.py:579`），`mp` → `ZMQMPEngine`，`ray` → `RayMPEngine`：`L/lmdeploy/pytorch/engine/mp_engine/__init__.py:8-12`；`engine.py:279-288`。即 PyTorch 引擎在独立进程中，经 ZMQ RPC 与 API 进程通信。
- TurboMind 由 `AsyncEngine._build_turbomind` 在 API 进程内构建（C++ 扩展）：`L/lmdeploy/serve/core/async_engine.py:151-160,201-216`。
- TurboMind 与投机解码：`async_engine.py:148-149` 打印 `speculative decoding is not supported by turbomind`。
- 视觉编码器：`L/lmdeploy/vl/engine.py:73-97` `ImageEncoder` 用单线程 `ThreadPoolExecutor(max_workers=1)` 做预处理和前向；`--vision-max-batch-size` 默认 1：`cli/utils.py:678`。
- 0.16.0 发布说明：“Add TurboMind ViT support for InternVL and Qwen VL models”。`L/lmdeploy/turbomind/models/qwen3_5.py:9-17,356` 有 `Qwen3_5VisionModel`。
- PyTorch 引擎模块（文档 `docs/en/inference/pytorch.md`）：EngineInstance → RequestManager → Scheduler → ModelAgent（patched model + cache_engine），循环五步；S-LoRA 多适配器。
- `session_len` 不设时取模型配置的最大长度（`max_position_embeddings` 等）：`async_engine.py:145-147`，`L/lmdeploy/utils.py` `_get_and_verify_max_len`。Qwen3-8B 的 `max_position_embeddings` = 40960（HF config.json）。

## LMDeploy：参数默认值（0.18.0）

| 参数 | 默认 | 来源 |
| --- | --- | --- |
| `--server-name` | `0.0.0.0` | `cli/serve.py:46` |
| `--server-port` | 未设时 23333 | `cli/serve.py:47-52,332` |
| `--allow-origins/methods/headers` | `['*']` | `cli/serve.py:53-68` |
| `--api-keys` | None | `cli/utils.py:373-377` |
| `--max-batch-size` | None → 按设备：A100/A800 384；H100/H800/H200/L20Y 1024；其他 CUDA 卡 128；ascend/maca/camb 256 | `cli/utils.py:250-257`、`L/lmdeploy/utils.py:404-427` |
| `--cache-max-entry-count` | 0.8，“空闲显存中 KV 所占比例，不含权重” | `cli/utils.py:526-533`、`messages.py:398,555` |
| TurboMind 对该值的约束 | C++ 要求 0 < ratio < 1，“object-cache path no longer accepts cache_max_block_count as a block count”；预算 = `cudaMemGetInfo` 空闲字节（TP 组取最小）× ratio，日志 `Object cache budget: ... MB from free ... MB and ratio ...` | `L/src/turbomind/turbomind.cc:326-340`；`lmdeploy/turbomind/turbomind.py:248` |
| `--num-gpu-blocks` | 0（PyTorch 引擎，0 表示按比例自动） | `cli/utils.py:536-543` |
| `--cache-block-seq-len` | 64；TurboMind 在 sm≥80 时须为 32 的倍数，否则 64 的倍数；PyTorch 指定 LoRA 时忽略 | `cli/utils.py:568-579` |
| `--enable-prefix-caching` | False（store_true） | `cli/utils.py:595-600`、`messages.py:401,565` |
| `--max-prefill-token-num` | 8192 | `cli/utils.py:652-655`、`messages.py:411,562` |
| `--num-tokens-per-iter` / `--max-prefill-iters` | 0 / 1（TurboMind，配合实现类 Dynamic SplitFuse） | `cli/utils.py:628-640`、`messages.py:412-413,356-361` |
| `--async` | 1（TurboMind 异步执行） | `cli/utils.py:642-647` |
| `--quant-policy` | 0；可写 none/int4/int8/fp8/fp8_e5m2/turbo_quant 或 0/4/8/16/17/42 | `cli/utils.py:260-282`、`messages.py:20-27` |
| `--model-format` | None（自动从模型读取）；可选 hf/awq/gptq/compressed-tensors/fp8/mxfp4 | `cli/utils.py:144-150` |
| `--dtype` | auto；auto/float16/bfloat16 | `cli/utils.py:123-128` |
| `--tp`/`--dp`/`--ep`/`--cp` | 1/1/1/1；`--cp` 仅 TurboMind，tp 须为 cp 的倍数 | `cli/utils.py:173-203` |
| `--device` | cuda；可选 cuda/ascend/maca/camb（PyTorch 引擎参数组） | `cli/utils.py:461-468` |
| `--eager-mode` | False（即默认用 CUDA Graph） | `cli/utils.py:698-701` |
| `--communicator` | nccl；nccl/native/cuda-ipc（TurboMind） | `cli/utils.py:718-724` |
| `--role` | Hybrid；Hybrid/Prefill/Decode | `cli/utils.py:759-765` |
| `--migration-backend` | DLSlime；DLSlime/Mooncake | `cli/utils.py:769-775` |
| `--speculative-algorithm` | None；eagle/eagle3/deepseek_mtp/hy3_mtp/qwen3_5_mtp/dflash；`--speculative-num-draft-tokens` 默认 1 | `cli/utils.py:835-856` |
| `--kv-transfer-config` | 只有 PyTorch 引擎支持，否则报错 | `cli/serve.py:242-245` |
| `PytorchEngineConfig.prefill_interval` | 16 | `messages.py:556` |
| `TurbomindEngineConfig.cache_checkpoint_interval` | 4096；`cache_prompt`/`cache_generation` 默认 auto（需开启前缀缓存） | `messages.py:402-405,320-343` |

文档与代码不一致：`messages.py:305-314` 的 docstring 仍写“整数表示 KV 块数”，C++ 在 0.18.0 已拒绝 ≥1 的值。

## LMDeploy：服务与代理

- 端点：`/v1/chat/completions`、`/v1/completions`、`/v1/models`、`/v1/responses`、Anthropic `/v1/messages`、`/v1/messages/count_tokens`、`/generate`、`/health`、`/terminate`、`/sleep`、`/wakeup`、`/update_weights*`、`/abort_request`、`/distserve/*`、`/pooling`、`/get_ppl`、`/v1/encode`；`/v1/embeddings` 标注 unsupported，直接返回 400 “Unsupported by turbomind.”：`L/lmdeploy/serve/openai/endpoints/*.py`、`auxiliary.py:22-27`。
- `/metrics` 默认挂载（`enable_metrics=True`，`--disable-metrics` 关闭）：`api_server.py:195-208`、`messages.py:421,581`。指标前缀 `lmdeploy:`，`lmdeploy:gpu_cache_usage_perc` 两种引擎口径不同；TurboMind DP>1 时暂不报调度指标：`docs/en/advance/metrics.md:5-14`。`lmdeploy/monitoring` 提供 Prometheus+Grafana compose。
- 认证：只有传 `--api-keys` 才加 `AuthenticationMiddleware`：`api_server.py:414-415`。中间件实际跳过 `/health`、`/docs`、`/redoc`、`/nodes` 前缀和 OPTIONS，其余路径都要 Bearer：`L/lmdeploy/serve/utils/server_utils.py:88-140`（docstring 写“非 /v1 路径跳过”，与代码不符，以代码为准）。
- 媒体 URL：`allowed_media_domains` 默认 None 即不限制；`load_from_url` 支持 http(s)、data URL、file URL 及服务器上存在的本地路径：`L/lmdeploy/vl/media/connection.py:58-77,125-140`。
- proxy：`lmdeploy serve proxy` 默认 `--server-name 0.0.0.0`、`--server-port 8000`、`--serving-strategy Hybrid`（或 DistServe）、`--routing-strategy min_expected_latency`（或 random、min_observed_latency）、`--migration-protocol RDMA`（或 NVLINK）、`--link-type RoCE`：`cli/serve.py:191-228`。节点用 `api_server --proxy-url` 自动注册，或 `/nodes/add`、`/nodes/remove`、`/nodes/status`：`L/lmdeploy/serve/proxy/proxy.py:474-573`、`docs/en/llm/proxy_server.md`。
- P/D 分离：proxy `--serving-strategy DistServe` + api_server `--role Prefill/Decode --backend pytorch`；“By now, only Pytorch backend supports PD Disaggregation”；依赖 dlslime；默认 RDMA：`L/lmdeploy/pytorch/disagg/README.md`。
- Docker：`openmmlab/lmdeploy:latest`（文档示例）；`k8s/deployment.yaml` 示例 containerPort 23333，含 readiness/liveness 探针。

## LMDeploy：量化

- KV 在线量化自 v0.4.0：int4/int8，非对称、per-head per-token，无需校准；原离线 KV 量化已移除；文档列出 sm70–sm90；`docs/en/quantization/kv_quant.md`。
- TurboQuant（`quant_policy=42`）：K 4bit + V 2bit；只支持 PyTorch 引擎，不支持 MLA、不支持投机解码，head_dim 需为 2 的幂；H200 + Qwen3-30B-A3B 上吞吐约 −7.3%（文档数据）。
- TurboMind KV 量化限制：head_dim ≠ 128 的模型（如 Llama3.2-1B、Qwen2-0.5B、InternVL2-1B）不支持 KV 4/8bit；滑动窗口注意力模型应改用 PyTorch：`docs/en/supported_models/supported_models.md` 注 [1][2]。
- W4A16：`lmdeploy lite auto_awq`，默认 `--calib-dataset wikitext2`、`--calib-samples 128`、`--calib-seqlen 2048`、`--batch-size 1`、`--w-bits 4`、`--w-group-size 128`、`--search-scale` 关闭、`--work-dir ./work_dir`：`cli/lite.py:18-45`、`cli/utils.py:405-440`。TurboMind 可推理 AWQ 与 GPTQ 4bit，但量化工具只做 AWQ；`docs/en/quantization/w4a16.md` 列 sm70–sm89。0.18.0 发布说明 “Expand SM90 quantized GEMMs”“prototype TurboMind W4A16 backend for AWQ linear”（PyTorch 侧）。
- W8A8：`lmdeploy lite smooth_quant --quant-dtype int8|fp8`，推理用 PyTorch 引擎；TurboMind 遇 `smooth_quant` 直接判不支持：`docs/en/quantization/w8a8.md`、`turbomind/supported_models.py:66-68`。
- llm-compressor 4bit 对称/非对称（2026-02 起）：README。

## LMDeploy：硬件

- `--device` 可选 cuda/ascend/maca/camb；非 CUDA 只走 PyTorch 引擎，经 dlinfer：`requirements/runtime_ascend.txt`（dlinfer-ascend>=0.2.5、torch-npu）。
- 昇腾：Atlas 800T A3、Atlas 800T A2、Atlas 300I Duo；A3 当前只支持 Qwen 系列 eager 模式；300I Duo 只支持 graph 模式；`docs/en/get_started/ascend/get_started.md`。支持表见 `supported_models.md` “PyTorchEngine on Other Platforms”（Atlas 800T A2 eager/graph、W8A8 graph、W4A16 eager；Maca C500；Cambricon）。
- ROCm：`LMDEPLOY_TARGET_DEVICE=rocm` 从源码安装：`docs/en/get_started/installation.md`。
- 安装文档 GPU 列表只到 Ada（sm89），kv_quant/w8a8 文档含 Hopper；README 提到 RTX 50 系列。
- Jetson：README 第三方项目 LMDeploy-Jetson；仓库有 `docker/Dockerfile.jetson`。

## LMDeploy：文档与代码不一致（以代码为准）

1. `supported_models.md` 的 TurboMind 表列出 Mistral、DeepSeek-V2/V2.5、DeepSeek-VL、LLaVA、MiniCPM-V、GLM4、CodeGeeX4、Molmo 等，但 0.18.0 的 `SUPPORTED_ARCHS` 不含 MistralForCausalLM、DeepseekV2ForCausalLM、ChatGLM、MiniCPMV、Llava*、Molmo 等，这些模型会自动回退 PyTorch。
2. `supported_models.md` 注 [3] 说 TurboMind 不支持 Qwen3.5 视觉编码器；0.14.0 发布说明与 `turbomind/models/qwen3_5.py` 已有视觉子模型。
3. `cache_max_entry_count` 的整数=块数语义在 TurboMind 0.18.0 已失效。
4. 认证中间件 docstring 与实际跳过路径不符。
5. `lmdeploy convert` 命令已不存在（CLI 子命令只剩 chat、check_env、lite、serve），但 `api_server` 帮助文字仍提到它。0.15.0 “Remove interactive chat and make inference stateless”。

## 与推理系列现有说法

- 第 18 篇版本表 LMDeploy 0.18.0（2026-09-28）正确。第 18 篇“LMDeploy：已有成熟适配的模型与多模态；两条引擎路线的支持范围不同”与核对一致。
- 第 22 篇运行时表 “MLX / mlx-lm … Mac 上的本地推理与实验” 一致；补充：mlx-lm 0.32 有 CUDA extras，可在 Linux+CUDA 上运行（第 07 篇说明，第 22 篇不必改）。
- `vllm-quickstart.md` 提到 “vLLM-Metal 项目” —— 仓库 vllm-project/vllm-metal 存在。

## MLX-LM

- 命令入口（`M/pyproject.toml:48-66`）：`mlx_lm`、`mlx_lm.generate`、`.chat`、`.server`、`.convert`、`.lora`、`.fuse`、`.cache_prompt`、`.benchmark`、`.evaluate`、`.perplexity`、`.awq`、`.dwq`、`.gptq`、`.dynamic_quant`、`.manage`、`.share`、`.upload`。
- generate 默认（`M/mlx_lm/generate.py:38-50`）：模型 `mlx-community/Llama-3.2-3B-Instruct-4bit`，`max_tokens` 100，`temp` 0.0，`top_p` 1.0，`top_k` 0，`quantized_kv_start` 5000，`prefill_step_size` 2048；`--kv-group-size` 64，`--num-draft-tokens` 3（`generate.py:209,228`）。
- `wired_limit`：生成时把 wired limit 设为 `max_recommended_working_set_size`，模型字节数超过其 90% 时警告 “Generating with a model that requires ... MB which is close to the maximum recommended size”：`generate.py:238-272`、`utils.py:74-83`。README：需要 macOS 15+；可 `sudo sysctl iogpu.wired_limit_mb=N` 提高上限。
- 本机 `mx.device_info()`：Apple M4，`memory_size` 25769803776（24 GiB），`max_recommended_working_set_size` 19069665280（约 17.8 GiB，约 74%），`max_buffer_length` 14302248960；`iogpu.wired_limit_mb: 0`（系统默认）。
- server 默认（`M/mlx_lm/server.py:1925-2080`）：`--host 127.0.0.1`、`--port 8080`、`--allowed-origins *`、`--max-tokens 512`、`--temp 0.0`、`--decode-concurrency 32`、`--prompt-concurrency 8`、`--prefill-step-size 2048`、`--prompt-cache-size 10`、`--kv-bits` None、`--kv-group-size 64`、`--quantized-kv-start 5000`、`--pipeline`（分布式时用流水线而非张量并行）。端点 `/v1/completions`、`/v1/chat/completions`、`/v1/models`、`/health`：`server.py:1239-1245,1787-1802`。
- 可批处理条件：无草稿模型、所有 cache 支持 merge（`server.py:459-471`），且请求未设 seed、未开 `--kv-bits`（`server.py:768-773`），带图片的请求顺序处理（`server.py:816-820`）。SERVER.md：“not recommended for production as it only implements basic security checks”；量化 KV 不支持批处理。
- convert：`--q-mode` 默认 affine，可选 affine/mxfp4/nvfp4/mxfp8；默认 (group_size, bits)：affine (64,4)、mxfp4 (32,4)、nvfp4 (16,4)、mxfp8 (32,8)：`M/mlx_lm/utils.py:1034-1042`、`convert.py:200-230`；混合位宽方案 mixed_2_6/3_4/3_6/4_6：`convert.py:80`；`--mlx-path` 默认 `mlx_model`，目录已存在则报错：`convert.py:85-108`。
- lora 默认（`M/mlx_lm/lora.py:46-81`）：fine_tune_type lora（另有 dora、full），optimizer adam，num_layers 16，batch_size 4，iters 1000，learning_rate 1e-5，max_seq_length 2048，lora rank 8、scale 20.0、dropout 0，adapter_path `adapters`，save_every 100。模型为量化模型时即 QLoRA；`pip install "mlx-lm[train]"`；数据 `train.jsonl`/`valid.jsonl`/`test.jsonl`，格式 chat/tools/completions/text：`M/mlx_lm/LORA.md`。
- 视觉：`load_processor` 只在配置有 `vision_config` 且注册了处理器时返回（目前只有 muse_spark）：`M/mlx_lm/processors/__init__.py:15-22`；qwen3_vl 等加载时丢弃 `vision_tower` 权重（`models/qwen3_vl.py:46`），即按纯文本模型运行。多模态用 mlx-vlm。
- 模型实现文件 137 个（`ls M/mlx_lm/models | wc -l`，含工具文件）。

## 本机实测（MLX-LM）

环境：Apple M4，24 GB 统一内存，macOS 26.6.2；Python 3.12 venv（scratchpad/venv-mlx），`mlx-lm==0.32.2`、`mlx==0.32.4`；模型 `mlx-community/Qwen3-0.6B-4bit`（affine 4bit、group 64，下载约 335 MB）。

第一轮（2026-10-27 23:2x）：机器上同时有别的代理在跑 llama-bench 和训练脚本，load average 112–187，结果不具代表性，只记录：生成 256 token 时 12.1 和 25.2 tok/s，峰值内存 0.48/0.43 GB。正式数据见下方第二轮。

第二轮（23:41–23:55，load average 仍在 25–150 之间波动，同机有 llama-bench、训练脚本、IDE 等）。所有数字只代表“有干扰的 M4”，正文写范围并注明。

| 测试 | 命令 | 结果 |
| --- | --- | --- |
| 短提示生成 ×3 | `mlx_lm.generate --model mlx-community/Qwen3-0.6B-4bit --prompt "用三句话说明年假怎么申请。" --max-tokens 256` | Prompt 17 tok；Generation 122.6 / 120.0 / 91.6 tok/s；Peak 0.486 GB |
| benchmark 批 1 | `mlx_lm.benchmark ... -p 2048 -g 256 -n 3`（两轮） | prompt_tps 668–955；generation_tps 17–74（第二轮 73.0、74.3、34.0）；peak 1.237 GB |
| benchmark 批 8 | `... -b 8 -n 3` 与 `-n 2` | prompt_tps 704–871；generation_tps（批合计，`generate.py:1821` 每步按序列数累加）45.8、87.4、80.2、115.6、89.8；peak 2.908 GB |
| server | `mlx_lm.server --model ... --chat-template-args '{"enable_thinking":false}'` | 监听 127.0.0.1:8080（lsof 确认）；`/health` → `{"status": "ok"}`；回答“年假申请通常需要提供工作证明和身份证……”（编造）；`system_fingerprint` `0.32.2-0.32.4-macOS-26.6.2-arm64-arm-64bit-applegpu_g16g`；单个 200 token 请求 1.65/2.24/4.34 s，4 个并发 5.28/6.77/8.90 s；启动时 UserWarning “not recommended for production”。测完 pkill，端口确认已释放 |
| LoRA | `mlx_lm.lora --model mlx-community/Qwen3-0.6B-4bit --train --data lora-data --iters 50 --batch-size 4 --steps-per-eval 25` | 32 条训练、8 条验证（5 个问答循环复制，验证集与训练集同分布同内容）；Trainable 0.484%（2.884M/596.050M）；val loss 6.936 → 0.175（25 步）→ 0.042（50 步）；约 200 tok/s；耗时约 58 s，max RSS 0.70 GB；adapters.safetensors 11.6 MB |
| LoRA 后生成 | `--adapter-path adapters --system-prompt "你是公司资料助手。"` | “年假怎么申请？”→ 训练原文；“产假有几天？”（训练集没有）→“产假为十天，需在领证后一年内休完。”（套用婚假答案） |

推导数字：Qwen3-0.6B（28 层、8 KV 头、head_dim 128）每 token KV 112 KiB，8K 约 0.875 GiB，2048 token 约 224 MiB；Qwen3-8B 每 token 144 KiB，8K 约 1.125 GiB；4 位 affine group 64 平均约 4.5 bit/参数；M4 内存带宽 120 GB/s（Apple 规格）。

## 补充：TurboMind KV 量化只有 INT8/INT4

`L/src/turbomind/kernels/attention/decoding.cu:17-23` 只判断 `kCacheKVInt8`、`kCacheKVInt4`；FP8 KV（16/17）与 TurboQuant（42）在 PyTorch 引擎。

## 本组手算（LMDeploy，未在 GPU 运行）

Qwen3-8B BF16 权重约 16.4 GB（15.3 GiB）；H100 加载后空闲约 63 GiB × 0.8 ≈ 50 GiB KV 预算；每 token 144 KiB → 约 36 万 token；2000 token/请求约 180 并发；`max_batch_size` 默认 1024，故 KV 先成为瓶颈。

## 审校更正（2026-10-28）

- Python 版本：安装文档写 3.10–3.13（`docs/en/get_started/installation.md:15`，`setup.py:190-193`），而 `.github/workflows/pypi.yml:16,64` 构建 3.10–3.14 轮子。正文两处原本不一致，统一为“文档推荐 3.10–3.13，PyPI 另有 3.14 轮子”。
- 章节重编号后，“Apple 芯片请看下一篇”改为链接 05/06/07 三篇。
- `lmdeploy-proxy` 图 DistServe 代理框原文字 `--serving-strategy` 被拆行，改为中文说明（`diagrams-lmdeploy-mlx.mjs:92`）。

## 审校补记（2026-10-28）

- 第 07 篇批 1 benchmark 表原写 Prefill 720–950、Decode 34–74，与上方记录（prompt_tps 668–955，generation_tps 17–74）不符，已改为约 670–950、约 17–74。
- server 4 并发结果（5.3–8.9 s）只能说“大致短于逐个处理”，正文已弱化“确实合并成批”的结论。
