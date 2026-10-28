# 推理引擎与框架系列：写作简报

日期：2026-10-27。写作代理开工前读本文件。

## 系列定位

`docs/ai/inference-engines/`，侧边栏分组“推理引擎与框架”，紧跟“大模型推理优化”之后。“大模型推理优化”系列（`docs/ai/llm-inference/`）按机制讲 PagedAttention、连续批处理、前缀缓存、量化、投机解码、分布式、P/D 分离，它的第 18 篇只用一页概述 vLLM 与 SGLang，实践篇 `vllm-quickstart.md` 讲 vLLM 的上手。本系列按**框架**组织：每个主流框架一篇，尽可能全面地讲清它的定位、架构、能力、用法、调优、部署和边界，最后一篇整体对比与选型。

机制原理不重讲，链接推理系列对应篇（例如“连续批处理的原理见 `../llm-inference/09-continuous-batching.md`”），本系列讲“这个框架怎样实现、怎样配置、有什么特别之处”。vLLM 篇不重复 `vllm-quickstart.md` 的安装与排错步骤，而是讲架构、全部主要特性和生产部署，并链接实践篇。

读者读完一篇应能回答：这个框架为什么存在、适合谁；内部由哪些进程/模块组成，一个请求怎样流过；支持哪些模型、硬件、量化格式、并行方式、高级特性；怎样启动、关键参数怎么调；怎样部署到生产（容器、多机、K8s、监控）；已知限制和常见坑；当前版本和近期变化。

## 章节表（文件名固定，交叉链接按此写）

| 文件 | 侧边栏标题 | 范围 |
| --- | --- | --- |
| `index.md` | 系列导读 | 主编撰写 |
| `01-vllm.md` | 01. vLLM | V1 引擎架构（API 服务进程、EngineCore、调度器、KV 管理、Worker/ModelRunner、MRV2）、全部主要特性、离线/在线/嵌入/多模态/LoRA/结构化输出/工具调用/推理模型解析、量化格式、并行（TP/PP/DP/EP、多机 Ray 与否）、P/D 分离与 KV 连接器、投机解码方法、硬件插件（AMD、TPU、昇腾等 platform plugin）、可观测性（Prometheus 指标）、生产部署（Docker、K8s、production-stack/llm-d 关系）、关键参数调优表、限制与坑 |
| `02-sglang.md` | 02. SGLang | 架构（TokenizerManager、Scheduler、DetokenizerManager 进程，ModelRunner）、RadixAttention、重叠调度、调度策略、HiCache、结构化输出后端、投机解码（EAGLE 等）、并行（TP/DP-attention/EP、多机）、P/D 分离（Mooncake/NIXL）、前端语言、Router（sgl-router/model gateway）、量化、硬件支持、指标、参数调优、限制 |
| `03-tensorrt-llm.md` | 03. TensorRT-LLM | NVIDIA 定位，PyTorch 后端与旧的 TensorRT 引擎构建流程的变化（核对当前默认），`trtllm-serve`、in-flight batching、paged KV、FP8/FP4（Blackwell）/INT4 AWQ 等量化与 ModelOpt、投机解码、并行、与 Triton Inference Server、Dynamo 的关系，适配成本，正式版与预发布版 |
| `04-llama-cpp.md` | 04. llama.cpp | ggml、GGUF 格式与量化类型（Q4_K_M 等 k-quants、IQ 系列）、CPU/Metal/CUDA/Vulkan 等后端、`llama-cli`/`llama-server`（OpenAI 兼容、并行槽位 `-np`、连续批处理）、部分层卸载 `-ngl`、KV 量化、投机解码、转换与量化流程、语法约束；版本号方案变化（核对：2026 年起语义化版本、默认端口变化） |
| `05-ollama.md` | 05. Ollama | 定位（本地模型管理 + API），Modelfile、模型库与标签、与 llama.cpp 的关系及自有引擎（核对当前实现）、API（原生与 OpenAI 兼容）、并发与内存设置（`OLLAMA_NUM_PARALLEL`、`OLLAMA_MAX_LOADED_MODELS`、上下文长度默认值等，以源码或官方文档为准）、安全边界（默认监听地址、无认证）、适用与不适用 |
| `06-lmdeploy.md` | 06. LMDeploy | TurboMind 与 PyTorch 两个引擎的分工与支持范围、W4A16/KV INT8/INT4 量化、persistent batch、多模态（InternVL 等）、`lmdeploy serve api_server`、昇腾等硬件支持（核对） |
| `07-local-and-edge.md` | 07. MLX-LM 与端侧框架 | Apple MLX-LM（统一内存、量化、LoRA 微调、`mlx_lm.server`），并简述 ExecuTorch、MLC-LLM 等端侧方案的定位，链接 `../llm-inference/22-edge.md` |
| `08-orchestration.md` | 08. 分布式编排与 KV 缓存组件 | 引擎之上的一层：NVIDIA Dynamo、llm-d、vLLM production-stack、AIBrix（核对存在与定位）、Mooncake、LMCache、NIXL；KV 感知路由、P/D 编排、多级 KV 缓存；和引擎的组合关系 |
| `09-comparison.md` | 09. 整体对比与选型 | 主编撰写 |

## 统一口径与贯穿案例

- 贯穿案例沿用推理系列的公司**资料助手**；服务端示例模型优先 **Qwen3-8B**（Apache 2.0）或 **Llama-3.1-8B**，硬件 **NVIDIA H100 80GB**；本地类框架用 Apple Silicon 笔记本或消费级显卡。
- 版本以 2026-10-27 查询的 GitHub 正式发布为准（`gh api repos/OWNER/REPO/releases/latest`、`gh release list -R OWNER/REPO -L 10`），写明版本和发布日期，预发布单独标注。推理系列第 18 篇已有快照：vLLM 0.32.0（2026-10-18）、SGLang 0.5.22（2026-10-19）、TensorRT-LLM 1.2.1（2026-04-20，之后只有预发布，最新 1.4.0rc1）、llama.cpp 0.7.0（2026-10-15，语义化版本、服务默认端口改为 9931）、LMDeploy 0.18.0（2026-09-28）、Ollama 0.40.11（2026-10-24）、ExecuTorch 1.5.1。发现不一致在 facts 文件里记录并以一手来源为准。
- 源码已检出：vLLM v0.32.0 在 `/private/tmp/claude-501/-Users-waltniu-project-blog/ab2dea5d-ac09-4d96-a1ed-1bc537d34308/scratchpad/src/vllm`，SGLang v0.5.22 在同目录 `src/sglang`。其他框架需要源码时浅克隆到 `.../scratchpad/src/<name>`（`git clone --depth 1 --branch <tag>`），只读，不放进博客仓库。默认值、参数名、命令以源码或固定版本文档为准，写明出处行号到 facts 文件。
- 本机是 Apple Silicon（arm64，24 GB 内存，磁盘剩余约 30 GB）。llama.cpp、Ollama、MLX-LM 篇可以在本机用小模型（如 Qwen3-0.6B / Qwen2.5-0.5B 的 GGUF 或 MLX 版本，≤1.5 GB）实际运行命令并记录输出；装在 scratchpad 里，不用 sudo，不改系统配置，跑完停掉进程。运行过的写“在 Apple M 系列笔记本上实测”，没运行的写明未实测。GPU 框架无法本机运行，命令按文档与源码核对并写明未在 GPU 上运行。

## 写作要求

与推理系列一致：先读项目根目录 `AGENTS.md` 的“写作偏好”“新增文章基本原则”和 `.maintenance/blog-writing.md`；范文看 `docs/ai/llm-inference/18-vllm-sglang.md`（现有浅版本，你要写得远比它深）和 `docs/ai/llm-inference/vllm-quickstart.md`（口吻、命令写法、核对严谨度）。

- 全中文叙述，命令、参数、代码、产品名保留原文。H1 写 `# 01. vLLM：……副题`。不写“本文”“让我们”“一句话总结”“值得一提”“众所周知”“一文看懂”等套话，不写资料搜集过程和参考文献列表。
- 开头说明这个框架是什么、为什么出现、本篇讲什么；结尾自然回顾，并链接下一篇（第 08 篇链接 `./09-comparison.md`）。
- 全面但有结构：用连续段落讲因果和取舍，表格做参数和能力对照，列表做步骤和检查项。至少讲一个失败或不适用的场景。
- 篇幅：每篇约 15000—30000 字节，vLLM、SGLang、TensorRT-LLM 可以更长；Ollama、第 07 篇可以短一些。全面是目标，但不要堆砌未经核对的特性清单——每个写进去的特性、参数名、默认值都要能在源码或官方文档里找到。
- 每篇末尾前有一节“版本与变化”或类似内容（标题自然命名），写当前版本、近期重要变化和升级注意事项。
- 站内链接用相对路径，只链接存在的文件（先 `ls`）；链接推理系列机制篇而不重讲。
- 核对记录写进 `.maintenance/inference-engines/research/facts-<组名>.md`：事实、来源（源码路径+行号、文档 URL、发布页）、结论。

## 图示

每篇至少一张解释架构或请求流的 SVG（进程/模块关系、请求怎样流过、部署拓扑），用 `.maintenance/inference-engines/svg-kit.mjs`（用法见 `.maintenance/llm-inference/diagrams-a.mjs`、`diagrams-d.mjs`）。脚本 `.maintenance/inference-engines/diagrams-<组名>.mjs`，输出到 `public/ai/inference-engines/`，文件名带框架前缀（如 `vllm-architecture.svg`）。运行 `node .maintenance/inference-engines/check-svg.mjs public/ai/inference-engines <scratch png 目录> <过滤>`，结果全部 `ok`，并用 Read 查看 PNG。正文引用 `![完整句子描述](/ai/inference-engines/xxx.svg)`，图前说明问题，图后解释关系。

## 边界

只新建本组章节、本组 diagrams 脚本、facts 文件和 SVG。不改侧边栏、导读、推理系列已有页面或其他文件，不运行 `npm run docs:build`，不 git add/commit/push。完成后简洁汇报：文件清单、每篇覆盖的要点、与简报或推理系列现有说法不一致之处（尤其是推理系列第 18 篇或实践篇里需要更正的内容）、仍不确定之处、实测了什么。另外附一段 200—400 字的“对比素材”：该框架在定位、硬件、模型覆盖、量化、并行、P/D、易用性、生产成熟度上的要点，供第 09 篇使用。
