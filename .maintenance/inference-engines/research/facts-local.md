# 核对记录：local 组（05-llama-cpp.md、06-ollama.md）

查询日期 2026-10-27（本机时区；GitHub 时间为 UTC，部分已是 10-28）。源码只读检出在
`/private/tmp/claude-501/-Users-waltniu-project-blog/ab2dea5d-ac09-4d96-a1ed-1bc537d34308/scratchpad/src/`：
`llama.cpp`（tag v0.7.0，commit 620d2225c）、`ollama`（tag v0.40.12，commit f067033f9）。下文路径相对各自仓库根目录。

## 版本

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| llama.cpp 最新正式版 v0.7.0，2026-10-15T17:13Z | `gh api repos/ggml-org/llama.cpp/releases/latest` | 与简报一致 |
| `b[NUM]` 标签全部标为 Pre-release（当日最新 b11946），是夜间构建 | `gh release list -R ggml-org/llama.cpp -L 10` | 正文写“b 标签是夜间版” |
| v0.7.0 发布页本身无二进制，注明对应 nightly 为 b11669；macOS arm64 包 `llama-b11669-bin-macos-arm64.tar.gz` | `gh release view v0.7.0` / `b11669` | 本机实测用 b11669 |
| b11669 二进制 `--version` 打印 `0.7.0-dev (build 11669, commit 620d2225c)` | 实测 | 夜间包版本串带 `-dev`，与 tag 同一提交 |
| 语义化版本**不是从 0.7.0 开始**：tag v0.1.0（提交日期 2026-08-17，无 release 页）、v0.1.2（2026-08-18）、v0.2.0（2026-08-21，发布说明写 “This version marks the beginning of consistent semantic versioning”）、v0.3.0 08-25、v0.4.0 09-04、v0.5.0 09-23、v0.6.0 10-05、v0.7.0 10-15 | `git ls-remote --tags`、`gh api .../releases/tags/v0.2.0` | **推理系列第 18 篇版本表“0.7.0 开始使用语义化版本号”需更正**为“2026 年 8 月起（v0.1/v0.2）改用语义化版本，0.7.0 把服务默认端口改为 9931” |
| 默认端口 9931 自 v0.7.0（PR #30159）；Docker 镜像内仍是 8080 | v0.7.0 发布说明 “API changes”；`common/common.h:630` `int32_t port = 9931;`；`.devops/cpu.Dockerfile:116-117`、`cuda.Dockerfile:125-126` `ENV LLAMA_ARG_HOST=0.0.0.0` `ENV LLAMA_ARG_PORT=8080` | 一致；正文强调容器内 8080 且监听 0.0.0.0 |
| 版本号定义 | `CMakeLists.txt:6-9` LLAMA_VERSION 0.7.0 | |
| ggml 随 v0.7.0 升到 v0.27.0；RPC 协议 v8 | v0.7.0 发布说明 | |
| Ollama 最新正式版 **v0.40.12，2026-10-27T00:07Z**；v0.40.11 为 10-24 | `gh release list -R ollama/ollama` | 简报/第 18 篇写 0.40.11，已过时一版；正文以 0.40.12 为准 |
| Ollama 0.40.12 内置 llama.cpp 版本 `b11901`（0.7.0 之后的夜间版），发布包自带 `llama-server`、`llama-quantize`、`libllama.0.7.0.dylib`、`libggml.0.27.0.dylib`、MLX `mlx_metal_v3/v4` | `LLAMA_CPP_VERSION:1`；解包 `ollama-darwin.tgz` 文件列表 | |
| `ollama-darwin.tgz` sha256 `1d1b4c2c…55d2` 与 `sha256sum.txt` 一致 | 实测 | |

## llama.cpp 源码事实

| 事实 | 来源 |
| --- | --- |
| 统一入口 `llama <command>`：serve / cli / download / version；README 快速开始用 `llama cli -hf …`、`llama serve -hf …`；安装脚本 `https://llama.app/install.sh` | `README.md:22-45`，实测 `llama --help` |
| 后端表：BLAS、BLIS、CANN（昇腾）、CUDA、HIP、Hexagon、zDNN、MUSA、Metal、OpenCL（Adreno）、OpenVINO（进行中）、RPC、SYCL、VirtGPU、Vulkan、WebGPU、ZenDNN | `README.md:76-96` |
| CPU：ARM NEON/Accelerate/Metal、x86 AVX/AVX2/AVX512/AMX、RISC-V RVV；1.5–8 bit 量化；CPU+GPU 混合 | `README.md:60-70` |
| GGUF 结构：magic "GGUF"、version(uint32)、张量数(int64)、KV 数(int64)、KV 对、张量信息（名、维数、各维大小、类型、偏移）、对齐的数据区；`GGUF_VERSION 3`，默认对齐 32，可用 `general.alignment` 覆盖 | `ggml/include/gguf.h:1-30, 41-46` |
| q4_0 块：32 元素 + 一个 fp16 scale（4.5 bit/权重）；QK_K=256 超级块；q4_K：256 元素，8 个 32 子块，6 bit 量化的 scale/min，“Effectively 4.5 bits per weight” | `ggml/src/ggml-common.h:89, 193-198, 322-337` |
| `llama-quantize` 类型表（含 Q4_K_M “4.58G, +0.1754 ppl @ Llama-3-8B”、Q8_0 7.96G、Q6_K 6.14G、Q5_K_M 5.33G、IQ4_XS 4.25 bpw、IQ2_XXS 2.06 bpw、IQ1_S 1.56 bpw、TQ1_0、MXFP4_MOE、Q1_0、Q2_0 等）；Q4_K 是 Q4_K_M 的别名 | `tools/quantize/quantize.cpp:34-75` |
| 必须 imatrix 的目标类型：IQ3_XXS、IQ2_XXS/XS/S、IQ1_M/S；Q2_K 仅在 Q2_K_S 文件中需要；token_embd/output 除外；缺失时报 “this quantization requires an importance matrix!” | `src/llama-quant.cpp:861-880, 1138-1148` |
| quantize 选项 `--allow-requantize --leave-output-tensor --pure --imatrix --output-tensor-type --token-embedding-type --tensor-type --dry-run` | `tools/quantize/quantize.cpp:123-150` |
| `llama-imatrix -m … -f text -o imatrix.gguf`，默认输出名 imatrix.gguf | `tools/imatrix/README.md:10, 21, 46` |
| `convert_hf_to_gguf.py --outtype {f32,f16,bf16,q8_0,tq1_0,tq2_0,auto}`，默认 auto | `convert_hf_to_gguf.py:60-61` |
| 默认值：`n_ctx=0`（取模型训练长度）、`n_batch=2048`、`n_ubatch=512`、`n_predict=-1`、`n_gpu_layers=-1`(auto)、`flash_attn=auto`、`cont_batching=true`、`ctx_shift=false`、`fit_params=true` | `common/common.h:456-483, 506, 575-580` |
| `-ngl` 接受数字/auto/all，默认 auto；`--fit on|off` 默认 on（自动把未指定参数适配到设备内存） | `common/arg.cpp:2803-2818, 2882-2894` |
| server：`-np` 默认 -1=auto；auto 时 server 设为 4 槽并开启 kv_unified | `common/arg.cpp:1405-1406, 2548-2556`；`tools/server/server.cpp:168-173` |
| `n_ctx_seq`：kv_unified 时等于 n_ctx（所有槽共享一个池），否则 n_ctx / n_seq_max（再按 256 对齐） | `src/llama-context.cpp:378-391` |
| `--kv-unified-per-slot N`：未给 -c 时池大小 = np×N | `common/arg.cpp:1652-1659`；`server.cpp:176-185` |
| KV 类型可选 f32/f16/bf16/q8_0/q4_0/q4_1/iq4_nl/q5_0/q5_1，默认 f16；量化 V 需要 flash attention，auto 时自动开启 | `common/arg.cpp:304-314, 2440-2460`；`src/llama-context.cpp:559, 4065-4069` |
| server 参数默认：host 127.0.0.1、CORS origins `*`、`use_jinja=true`、`cache_ram_mib=8192`、`n_ctx_checkpoints=32`、`endpoint_slots=true`、`endpoint_metrics=false`、`endpoint_props=false`、`models_max=4`、`timeout_read=3600` | `common/common.h:630-697` |
| `--api-key` 支持逗号分隔多个；`/health` 不检查 key | `common/arg.cpp:3513-3520`；`tools/server/server.cpp:263-264` |
| 路由：`/v1/chat/completions`、`/v1/completions`、`/v1/responses`、`/v1/embeddings`、`/v1/rerank`、`/v1/messages`（Anthropic）、`/v1/audio/transcriptions`、`/infill`、`/tokenize`、`/slots`、`/metrics`、`/lora-adapters`；router 模式 `/models/load`、`/models/unload` | `tools/server/server.cpp:256-304` |
| `--models-dir`、`--models-preset`、`--models-max`（默认 4） | `common/arg.cpp:3663-3690`；`common/common.h:693-697` |
| 投机：`--spec-type` 可选 none、draft-simple、draft-eagle3、draft-mtp、draft-dflash、draft-dspark、ngram-simple、ngram-map-k、ngram-map-k4v、ngram-mod、ngram-cache，默认 none；`-md/--spec-draft-model`；`--spec-draft-n-max` 默认 3；旧 `--draft/--draft-max/--draft-min` 已移除，报错 | `common/speculative.cpp:73-83`；`common/arg.cpp:4287-4300, 4430-4445`；`common/common.h:327-349`；`tools/server/README.md:262-287` |
| 语法约束：`--grammar`、`--grammar-file`、`-j/--json-schema`、`-jf`；`grammars/*.gbnf` | `common/arg.cpp:2272-2297` |
| 多模态：`-mm/--mmproj`、`--mmproj-auto` 默认开启，`-hf` 会自动下载 mmproj | `common/arg.cpp:2582-2612, 3074-3078` |
| `-hf <user>/<model>[:quant]`，未给量化默认 Q4_K_M | `common/arg.cpp:3074-3078` |
| `--rpc host:port`；`ggml-rpc-server` 默认端口 50052；README 警告 “Never run the RPC server on an open network” | `common/arg.cpp:2684`；`tools/rpc/rpc-server.cpp:96`；`tools/rpc/README.md:5, 62-80` |
| `-sm none|layer|row|tensor`，layer 默认，tensor 实验性 | `common/arg.cpp:2821-2830` |
| `--mlock`、`--no-mmap` 在 0.7.0 的参数表中已不存在，改为 `-lm/--load-mode {auto,none,mmap,mlock,mmap+mlock,dio}` | `tools/cli/README.md`（参数表），grep `common/arg.cpp` 无 `"--mlock"` |
| `-ot/--override-tensor`、`-cmoe/--cpu-moe`、`-ncmoe/--n-cpu-moe`、`--moe-cache-mib`（0.7.0 新增） | `common/arg.cpp:2758-2790`；v0.7.0 发布说明 |
| Docker 镜像 `ghcr.io/ggml-org/llama.cpp:server`、`:server-cuda`（CUDA 12）、`:server-cuda13`、`:server-rocm`、`:server-musa` 等 | `docs/docker.md:10-27` |
| 模型缓存：`LLAMA_CACHE`，并兼容 HF hub 缓存 `~/.cache/huggingface/hub` | `common/hf-cache.cpp:39-55` |

## Ollama 源码事实（v0.40.12）

| 事实 | 来源 |
| --- | --- |
| `OLLAMA_HOST` 默认 `127.0.0.1:11434` | `envconfig/config.go:21-31, 324`；实测日志 `Listening on 127.0.0.1:11435`（我们改了端口） |
| `OLLAMA_ORIGINS` 追加到内置列表（localhost/127.0.0.1/0.0.0.0 的 http/https、app://、file://、tauri://、vscode-webview:// 等） | `envconfig/config.go:86-108` |
| `OLLAMA_MODELS` 默认 `$HOME/.ollama/models` | `envconfig/config.go:112, 123` |
| `OLLAMA_KEEP_ALIVE` 默认 5m；负数常驻，0 立即卸载 | `envconfig/config.go:127-140` |
| `OLLAMA_LOAD_TIMEOUT` 默认 5m | `envconfig/config.go:148-150` |
| `OLLAMA_CONTEXT_LENGTH` 默认 0=自动；自动值按总 VRAM：≥47 GiB→262144，≥23 GiB→32768，否则 4096 | `envconfig/config.go:230, 338`；`server/routes.go:2567-2583` |
| 实测 24 GB M4：Metal 可用 17.8 GiB → `default_num_ctx=4096` | 实测日志 `msg="vram-based default context" total_vram="17.8 GiB" default_num_ctx=4096` |
| 加载 OOM 时依次退到 32768、4096；不超过模型训练上下文；视觉模型下限 2048 | `server/sched.go:204-220, 953-962` |
| `OLLAMA_NUM_PARALLEL` 默认 1；嵌入模型强制 1；mllama、qwen3vl、qwen35、qwen3next、lfm2、nemotron_h 等架构强制 1 | `envconfig/config.go:277`；`server/sched.go:540-553` |
| `OLLAMA_MAX_LOADED_MODELS` 默认 0=自动，3×GPU 数（无 GPU 时 3） | `envconfig/config.go:279`；`server/sched.go:121, 324-331` |
| `OLLAMA_MAX_QUEUE` 默认 512，满了返回 503 “server busy… maximum pending requests exceeded” | `envconfig/config.go:281`；`server/sched.go:123, 248-250`；`server/routes.go:3637-3638` |
| 内存估算 = 上下文 × 并行数；传给 llama-server `-c NumCtx*numParallel -np numParallel` | `server/sched.go:847-848`；`llm/llama_server.go:384-400` |
| 新模型预计超过空闲内存 80% 时先驱逐 | `server/sched.go:588-604` |
| `OLLAMA_FLASH_ATTENTION`、`OLLAMA_KV_CACHE_TYPE`（f16 默认，q8_0、q4_0）、`OLLAMA_GPU_OVERHEAD`（0）、`OLLAMA_SCHED_SPREAD`、`OLLAMA_NOPRUNE` | `envconfig/config.go:216-228, 305, 318-337`；`docs/faq.mdx:346-362` |
| `OLLAMA_AUTH` 只让客户端对请求签名；服务端没有 API Key 校验 | `envconfig/config.go:231-232`；`api/client.go:119, 184` |
| `allowedHostsMiddleware`：绑定回环地址时只接受回环/私有/本地 Host 头（防 DNS rebinding） | `server/routes.go:2309-2340` |
| 推理执行：`llm/llama_server.go` 把上游 `llama-server` 作为子进程启动，参数 `--host 127.0.0.1 --no-webui --offline -c … -np …`；GPU 层数、线程、flash attention 交给 llama-server 自动探测 | `llm/llama_server.go:1-15, 357, 384-400, 447, 644-650` |
| 两条聊天路径：有 Ollama renderer/parser、Harmony、MLX 或 Go TEMPLATE 的模型在 Go 里渲染后调 `/completion`；其余 GGUF 用 llama-server 自己的 chat_template 和 `/v1/chat/completions` | `llm/llama_server.go:3-6` |
| 引擎由权重格式决定：GGUF → llama-server；safetensors（`IsMLX()`）→ MLX runner（`ollama runner --model … --port …` 子进程） | `server/sched.go:568, 624, 631-633`；`server/images.go:101-102`；`mlxrunner/client.go:438-439` |
| darwin/arm64 多份清单时优先 mlx，再 llamacpp、ggml；其他平台 llamacpp、ggml、mlx | `manifest/manifest.go:854-860` |
| 旧的 Go 自研引擎（ollamarunner、`OLLAMA_NEW_ENGINE`）在 0.40.12 已无代码；`model/` 只剩 parsers 和 renderers | 目录检查，grep 无匹配 |
| 实测：`qwen3:0.6b` 由 llama-server 运行，`ollama ps` RUNNER 列显示 `llamacpp`；子进程命令行含 `--no-jinja --chat-template chatml --flash-attn auto -b 512 -ub 512 --context-shift --keep 4` | 实测 `ps`、日志 `using llama-server for model` |
| 原生 API：`/api/generate`、`/api/chat`、`/api/embed`、`/api/embeddings`、`/api/pull`、`/api/push`、`/api/create`、`/api/show`、`/api/copy`、`/api/delete`、`/api/tags`、`/api/ps`、`/api/version`、`/api/blobs/:digest` | `server/routes.go:2388-2427` |
| OpenAI 兼容：`/v1/chat/completions`、`/v1/completions`、`/v1/embeddings`、`/v1/models`、`/v1/responses`、`/v1/audio/*`；Anthropic 兼容 `/v1/messages` | `server/routes.go:2433-2446` |
| 默认 Options：num_predict -1、temperature 0.8、top_k 40、top_p 0.9、num_batch 512、num_gpu -1；模型自带 params 会覆盖（qwen3:0.6b 为 temperature 0.6、top_k 20、top_p 0.95） | `api/types.go:1220-1243`；实测 `ollama show` |
| 存储：`manifests/registry.ollama.ai/library/<name>/<tag>` 与新的 `manifests-v2/ollama.com/...`；`blobs/sha256-<hex>`；默认 host/namespace/tag 为 registry.ollama.ai/library/latest | `manifest/paths.go:23-31, 51, 409`；`types/model/name.go:39-41`；实测目录 |
| 实测 qwen3:0.6b 清单层：model 522,640,096 B（Q4_K_M）、template、license、params、config；`ollama list` 522 MB | 实测 |
| Modelfile 指令（parser）：from、license、template、system、adapter、draft、renderer、parser、parameter、message、requires、capability；文档表只列 FROM、PARAMETER、TEMPLATE、SYSTEM、LICENSE、MESSAGE、REQUIRES、CAPABILITY；LoRA adapter 标为 deprecated | `parser/parser.go:732`；`docs/modelfile.mdx:35-44`；`llm/llama_server.go:410` |
| `ollama create --quantize` 只对 safetensors 导入（MLX）：int4/int8/nvfp4/mxfp4/mxfp8；GGUF 不在导入时量化 | `cmd/cmd.go:2585`；`create/create.go:124-140`；`docs/import.mdx:35`；实测报错 `create-time quantization is only supported for safetensors imports; quantize GGUF models before importing` |
| GPU：NVIDIA CC 5.0+、驱动 550+（5.0–6.2 需 570+）；AMD ROCm v7（Linux/Windows）；Vulkan 默认开启（非 macOS）；macOS 14+，Apple M 系列走 GPU，Intel Mac 只有 CPU | `docs/gpu.mdx:6-7, 60-145`；`docs/macos.mdx:7-8` |
| 云模型：`:cloud` 后缀、`OLLAMA_API_KEY`、`OLLAMA_NO_CLOUD` 或 `~/.ollama/server.json` 关闭 | `docs/cloud.mdx:10-20, 78`；`envconfig/config.go:238, 384-449`；`docs/faq.mdx:163-181` |
| `ollama launch` 配置并启动外部编码工具 | `docs/cli.mdx:14-24` |

### Ollama 文档与代码不一致（正文以代码为准）

- `docs/faq.mdx:25` 写默认上下文 4096 —— 代码按 VRAM 分档（`docs/context-length.mdx:8-11` 与代码一致）。
- `docs/modelfile.mdx:148` 写 num_ctx 默认 2048 —— 过时。
- `docs/modelfile.mdx` seed 默认 0 —— 代码 `Seed: -1`。

## 本机实测（Apple M4，4 性能核 + 6 能效核，24 GB 统一内存，Darwin 25.6）

**环境限制：测量期间本机有其他重负载进程（DevEco Studio、虚拟机、bfs 等），load average 在 22—156 之间波动，吞吐数字方差很大，只能作定性参考，正文不能把它们当基准。**

1. 下载 `Qwen/Qwen3-0.6B-GGUF` 的 `Qwen3-0.6B-Q8_0.gguf`（639,446,688 B）。
2. `llama-quantize --allow-requantize Qwen3-0.6B-Q8_0.gguf Qwen3-0.6B-Q4_K_M.gguf Q4_K_M`：
   `model size = 604.15 MiB (8.50 BPW)` → `quant size = 372.65 MiB (5.24 BPW)`，耗时 26.7 s，峰值内存约 0.99 GB；
   结果张量 f32 113、q4_K 168、q6_K 29；`token_embd.weight` 为 q6_K、121.71 MiB；`attn_v`、`ffn_down` 为 q6_K。
   元数据 28 个 KV：`general.architecture=qwen3`、`qwen3.block_count=28`、`qwen3.context_length=40960`、`head_count=16`、`head_count_kv=8`、`key_length=128`、`tokenizer.chat_template`、`general.file_type=15` 等。
   从 Q8_0 再量化会叠加误差，正文说明正式流程应从 BF16/F16 开始。
3. `llama-bench -p 512 -n 128 -r 3`（t/s，均值±标准差；三轮负载不同）：

   | 模型 | 后端 | pp512 第 2 轮 | tg128 第 2 轮 | 第 3 轮（仅 Q4_K_M） |
   | --- | --- | --- | --- | --- |
   | Q8_0 | CPU（-ngl 0） | 404±78 | 64±34 | |
   | Q8_0 | Metal（-ngl 99） | 1412±133 | 57±6 | |
   | Q4_K_M | CPU | 199±38 | 100±6 | pp 119±94，tg 19±21 |
   | Q4_K_M | Metal | 1220±60 | 74±15 | pp 594±15，tg 19±2 |

   第 1 轮（load ~145）Metal pp512 774/506，tg 12—18。稳定结论只有：Metal 的 Prompt 处理比 CPU 快数倍；Decode 在这台机器上 CPU 与 Metal 差距不明显且受负载影响大（同一块统一内存，带宽受限）。
4. `llama-cli -m Qwen3-0.6B-Q4_K_M.gguf -c 4096 -st -p "用一句话解释什么是 GGUF。" -rea off`：
   输出 `GGUF 是一种用于提升图像质量的算法……`（**答错**），`[ Prompt: 147.9 t/s | Generation: 133.4 t/s ]`。
5. `llama-server -m Qwen3-0.6B-Q4_K_M.gguf -c 16384`（不写 -np）：日志 `security: no API key is set and CORS allows all origins`；`initializing, n_slots = 4, n_ctx_slot = 16384, kv_unified = 'true'`；`listening on http://127.0.0.1:9931`（`lsof` 确认 127.0.0.1:9931）。
   `-lv 4` 日志：`offloaded 29/29 layers to GPU`、`CPU_Mapped model buffer size = 121.71 MiB`、`MTL0_Mapped model buffer size = 372.65 MiB`、`llama_kv_cache: size = 1792.00 MiB (16384 cells, 28 layers, 4/1 seqs), K (f16): 896.00 MiB, V (f16): 896.00 MiB`、`MTL0 compute buffer size = 112.22 MiB`；进程 phys_footprint 1916 MB。
   手算：每 token KV = 28 层 × 2 × 8 头 × 128 × 2 B = 112 KiB；× 16384 = 1792 MiB，与日志一致。
6. `-ctk q8_0 -ctv q8_0`：日志 `enabling flash_attn since it is required for quantized V cache`，KV 952.00 MiB（K/V 各 476），phys_footprint 1072 MB。
7. 显式 `-c 16384 -np 4`：`n_ctx_seq = 4096`、`kv_unified = 'false'`、`n_ctx_slot = 4096`，KV 仍 1792 MiB（4/4 seqs）。
8. 接口：`/v1/chat/completions` 返回 `timings`；`response_format: json_schema` 输出 `{"amount": 320, "category": "交通"}`；`/metrics` 未开 `--metrics` 时返回 HTTP 501；`/slots` 默认开放（返回每槽采样参数等）。
9. 并发（每请求 max_tokens 128，temperature 0，关闭思考）：n=1 18.1 tok/s；n=4 总 90.1 tok/s，四个请求都在 5.7 s 完成；n=8 总 92.6 tok/s，前 4 个 5.9 s、后 4 个 11.0 s（第二批排队等槽位）。
10. Ollama 0.40.12（解包 `ollama-darwin.tgz` 到 scratchpad，`HOME`、`OLLAMA_MODELS` 指向 scratchpad，`OLLAMA_HOST=127.0.0.1:11435`）：
    - `ollama pull qwen3:0.6b`，`ollama list` 522 MB；`ollama show` 显示 quantization Q4_K_M、context length 40960、capabilities completion/tools/thinking。
    - 默认（NUM_PARALLEL=1）：`ollama ps` → `826 MB  100% GPU  4096  llamacpp`；子进程 `-c 4096 -np 1`。`/api/generate` 256 token：eval 54.4 tok/s，prompt 243.7 tok/s。并发 4 个请求：延迟 4.25/8.05/12.37/16.37 s（串行排队），总 31.3 tok/s。
    - `OLLAMA_NUM_PARALLEL=4` 重启：子进程 `-c 16384 -np 4 -b 1024 -ub 1024`；`ollama ps` 2.3 GB；并发 4：四个都 6.5 s，总 78.7 tok/s。
    - Modelfile（FROM 本地 GGUF、`PARAMETER num_ctx 8192`、`SYSTEM 只根据资料回答，没有就说不知道`）`ollama create` 成功；同时加载后 `ollama ps` 4.4 GB / CONTEXT 8192。问“差旅住宿标准是多少？”模型回答“每人每天200元”——**编造**，SYSTEM 提示不是护栏。
    - `keep_alive: 0` → `done_reason: "unload"`，`ollama ps` 中该模型消失。
    - `ollama create … --quantize q4_K_M`（GGUF 源）报错，见上。
11. 进程均已停止（`pgrep -fl scratchpad/bin` 无输出）。未实测：convert_hf_to_gguf.py（需 torch 等 Python 依赖）、imatrix、投机解码（需同词表草稿模型，额外下载超出 1.5 GB 限额）、多模态、RPC、CUDA/Vulkan/SYCL、Ollama MLX 路径。

## 审校补记（2026-10-28）

- Q4_K_M 中 `token_embd.weight` 为 q6_K 的原因：Qwen3-0.6B 输出层与词表嵌入共享权重，`src/llama-quant.cpp:495` 对 OUTPUT 或 `has_tied_embeddings && TOKEN_EMBD` 用 q6_K；非共享模型的词表嵌入不会因 `_M` 升位。正文已改为“输出层升到 q6_K”。
- 统一入口 `llama serve/cli` 的引入版本未在 v0.2—v0.7 发布说明中找到，正文改为“当前版本还有”，不再写“v0.7.0 起”。
- Ollama 10 月发布从 v0.40.1（10-07）开始，不是 0.40.3。
