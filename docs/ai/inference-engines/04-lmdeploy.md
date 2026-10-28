# 04. LMDeploy：TurboMind 与 PyTorch 两台引擎的分工

前几篇的 vLLM、SGLang、TensorRT-LLM 都是“一套引擎跑所有模型”。LMDeploy 的做法不同：它在同一个命令行和同一套 OpenAI 兼容接口之下，放了两台引擎。**TurboMind** 用 C++ 和 CUDA 写成，脱胎于 NVIDIA 的 FasterTransformer，只为少数热门架构做深度优化；**PyTorch 引擎**用 Python 写成，覆盖的模型更多，新特性（投机解码、P/D 分离、外部 KV 连接器）先在这里落地，华为昇腾、沐曦、寒武纪这些非 NVIDIA 设备也只走这条路。LMDeploy 由上海人工智能实验室 InternLM 团队维护（最初出自 OpenMMLab 的 MMRazor 与 MMDeploy 团队），定位是“压缩、部署、服务”一条龙的工具箱，自带 AWQ、SmoothQuant 量化工具和一个多实例分发代理。

资料助手如果用到 InternVL、Qwen-VL 这类多模态模型，或者公司有一批昇腾服务器，LMDeploy 往往是最先被拿来评估的框架之一。这一篇讲清楚：一个请求在 LMDeploy 里怎样流过；`--backend` 不写的时候到底用的是哪台引擎；两台引擎各自支持什么；W4A16、W8A8 和在线 KV 量化怎样用；`lmdeploy serve api_server` 的关键参数怎样调；多个实例怎样通过代理组织起来；以及容易踩的坑。

本篇以 **LMDeploy 0.18.0**（2026 年 9 月 28 日发布）为准，参数名和默认值逐项对照了这个版本的源码。LMDeploy 的 GPU 路径无法在本站的 Apple 笔记本上运行，文中命令没有在 GPU 上实际执行，显存数字是按[显存账本](../llm-inference/04-memory-budget.md)手算的估计。连续批处理、分页 KV、量化等机制的原理见推理系列对应篇，这里只讲 LMDeploy 怎样实现和配置。

## 一个工具箱，两台引擎

LMDeploy 的命令行除了检查环境用的 `check_env`，主要是四个子命令，各管一段：

| 命令 | 作用 |
| --- | --- |
| `lmdeploy lite` | 离线量化：`auto_awq`（W4A16）、`auto_gptq`、`smooth_quant`（W8A8）、`calibrate` |
| `lmdeploy chat` | 终端里和模型对话，调试用 |
| `lmdeploy serve api_server` | 启动 OpenAI 兼容服务（也提供 Anthropic 风格的 `/v1/messages`） |
| `lmdeploy serve proxy` | 请求分发代理，把多个 `api_server` 组织成一个入口，也负责 P/D 分离的编排 |

Python 里对应的入口是 `lmdeploy.pipeline(...)`，用于离线批量推理。早期版本里把模型转换成 TurboMind 专用格式的 `lmdeploy convert` 已经不在 0.18.0 的命令列表里，TurboMind 直接读取 Hugging Face 格式的权重。

两台引擎的分工可以先看这张对照表，后面几节逐项展开：

| 维度 | TurboMind | PyTorch 引擎 |
| --- | --- | --- |
| 实现 | C++/CUDA，Python 只做外壳 | Python + Triton/CUDA 算子，按设备加载后端 |
| 运行位置 | 和 API 服务在同一个进程 | `api_server` 下单独起一个引擎进程，通过 ZMQ 通信 |
| 模型覆盖 | 0.18.0 只认 19 个架构名：Llama、InternLM2/3、Qwen2/2.5/3/3.5（含 MoE 和 VL）、InternVL、Intern-S1/S2、Mixtral、gpt-oss、GLM-4.7-Flash | 支持表上百个条目，包括 DeepSeek-V2/V3/V3.2/V4、GLM-5、Kimi-K2.6、Gemma、Phi 等 |
| 权重量化 | AWQ、GPTQ 的 4 位权重（W4A16），FP8、MXFP4 等格式 | W4A16、W8A8（SmoothQuant 的 INT8/FP8），FP8 等 |
| KV 量化 | INT8、INT4（在线） | INT8、INT4、FP8，以及 TurboQuant（K 4 位 + V 2 位） |
| 投机解码 | 不支持 | EAGLE、EAGLE3、DeepSeek MTP、DFlash 等 |
| P/D 分离、KV 连接器 | 不支持 | 支持（DLSlime、Mooncake） |
| 多 LoRA | 不支持 | 支持（S-LoRA 方式按需换入） |
| 硬件 | NVIDIA GPU（Linux、Windows） | NVIDIA，另外经 dlinfer 支持昇腾、沐曦、寒武纪；ROCm 需源码安装 |

一个直观的理解：TurboMind 是“赛车”，路线窄但跑得快；PyTorch 引擎是“越野车”，什么路都能开，新装备也先装在它身上。两者共享同一套服务层，所以对调用方来说接口完全一样。

## 一个请求怎样流过 LMDeploy

资料助手的员工问“年假怎么申请”，请求打到 `api_server` 的 `/v1/chat/completions`。它在 LMDeploy 里经过的模块如下图。

![LMDeploy 中一个请求的路径：api_server 进程里完成对话模板、分词和图片编码，再交给进程内的 TurboMind 或独立进程里的 PyTorch 引擎](/ai/inference-engines/lmdeploy-architecture.svg)

`api_server` 是一个 FastAPI 应用。它先套用对话模板、分词，然后交给 `AsyncEngine`。`AsyncEngine` 是服务层和引擎之间的适配器：它为每个请求建立一个会话，把 token 送进引擎，再把引擎吐出的 token 反分词、按流式或非流式返回。这一段和[一个请求的全链路](../llm-inference/07-request-path.md)讲的步骤一一对应。

如果模型是多模态的，服务启动时按架构名识别出来，换用 `VLAsyncEngine`。它多了一个 `ImageEncoder`：图片的预处理和视觉编码器前向在一个单线程的线程池里执行，每次最多处理 `--vision-max-batch-size` 张图（默认 1），得到的图像特征和文字 token 拼在一起再送进语言模型。

接下来两台引擎走不同的路：

- **TurboMind** 在 API 进程内部以 C++ 扩展的形式运行。它维护一个常驻的批（persistent batch）和一个 KV 缓存管理器，前向计算由自研的 CUDA 算子完成。多卡张量并行时，每张卡一个工作线程，由 NCCL 同步。
- **PyTorch 引擎**由 `api_server` 强制以多进程模式启动：服务进程和引擎进程之间用 ZMQ 做远程调用（也可以换成 Ray）。引擎进程里有一个循环：`RequestManager` 收请求，`Scheduler` 决定这一步哪些序列参与、分配 KV 块，`ModelAgent` 执行打过补丁的模型（加入了张量并行、量化和高性能算子），然后更新状态、把结果送回。这个结构和 vLLM V1 的“API 进程 + EngineCore 进程”很接近。

把引擎放在单独进程里，好处是 Python 层的调度开销不和 HTTP 处理争同一个 GIL；TurboMind 的调度本身在 C++ 里，不存在这个问题，所以留在同一进程。

## 不写 --backend 时用的是哪台引擎

`lmdeploy serve api_server` 的 `--backend` 参数默认值是 `turbomind`，但源码里只要它不等于 `pytorch`，就会进入自动选择。所以默认值的真实含义是“优先 TurboMind，不支持就回退到 PyTorch”。判断过程如下：

![LMDeploy 自动选择引擎的判断顺序：显式指定 pytorch 直接使用；否则依次检查 TurboMind 是否编译、模型是否为 SmoothQuant 量化、架构是否在 TurboMind 支持表中](/ai/inference-engines/lmdeploy-backend-choice.svg)

1. 显式写了 `--backend pytorch`（或者在 Python 里传入 `PytorchEngineConfig`），直接用 PyTorch 引擎。
2. 安装的包里没有编译 TurboMind（例如在昇腾环境、或用 `DISABLE_TURBOMIND=1` 从源码安装），回退 PyTorch，日志打印 `Fallback to pytorch engine because turbomind is not built.`。
3. 模型配置里的量化方法是 `smooth_quant`（W8A8），TurboMind 不支持，回退。
4. 读取模型 `config.json` 里的 `architectures`，不在 TurboMind 的支持表里就回退，日志打印 `Fallback to pytorch engine because '<模型>' not supported by turbomind engine.`。

放到具体模型上：

| 模型 | 架构名 | 默认会用 |
| --- | --- | --- |
| Qwen3-8B | `Qwen3ForCausalLM` | TurboMind |
| Llama-3.1-8B-Instruct | `LlamaForCausalLM` | TurboMind |
| InternVL3 系列 | `InternVLChatModel` 等 | TurboMind（含视觉编码器） |
| Qwen3-8B 经 SmoothQuant 量化 | 量化方法 `smooth_quant` | PyTorch |
| Mistral-7B | `MistralForCausalLM` | PyTorch |
| DeepSeek-V3、GLM-5 | 不在表中 | PyTorch |

这里有一个文档和代码不一致的地方需要注意。官方的支持模型页面里，TurboMind 的表格仍然列着 Mistral、DeepSeek-V2、LLaVA、MiniCPM-V、GLM4、Molmo 等模型，但 0.18.0 的代码只认上表那些架构名。0.14 和 0.15 两个版本重写了 TurboMind 的模型层，并移除了一批旧模型的支持，文档表格没有跟着更新。所以判断一个模型实际走哪台引擎，**以启动日志为准**：看到 `Fallback to pytorch engine` 就说明它在用 PyTorch 引擎，性能特征和可用参数都要按 PyTorch 引擎来理解。

同一台引擎下也有细分限制。TurboMind 不支持滑动窗口注意力，打开了 `use_sliding_window` 的模型要用 PyTorch 引擎；`head_dim` 不是 128 的模型（如 Llama-3.2-1B、Qwen2-0.5B）在 TurboMind 上不能开 KV 量化。

## TurboMind 内部：常驻批与分块 KV

TurboMind 的两个核心设计在推理系列里都讲过原理，这里看它的叫法和参数。

**Persistent batch（常驻批）** 就是[连续批处理](../llm-inference/09-continuous-batching.md)。LMDeploy 和 vLLM 差不多同时期开发这项功能，它把服务进程的整个生命周期看成一个一直在跑的批：批里有 N 个预先配置的槽位，有空槽就让新请求加入，请求生成结束立刻释放槽位，批的大小随负载自动伸缩。N 就是 `--max-batch-size`，不设时按 GPU 型号取值：A100/A800 为 384，H100/H800/H200 为 1024，其他 NVIDIA 卡为 128。

**Blocked KV cache（分块 KV）** 对应[分页注意力](../llm-inference/08-paged-attention.md)：KV 按固定 token 数切成块，块大小由 `--cache-block-seq-len` 决定，默认 64。在计算能力 8.0 及以上的 GPU（A100、H100 等）上它必须是 32 的倍数，更老的卡必须是 64 的倍数。

KV 能占多少显存，由 `--cache-max-entry-count` 决定，默认 0.8。它的含义是“**加载完权重以后剩余空闲显存**的 80%”，不是总显存的 80%。0.18.0 的 TurboMind 在创建引擎时调用 CUDA 查询空闲显存（张量并行时取各卡最小值），乘以这个比例作为缓存预算，日志里会打印一行 `Object cache budget: ... MB from free ... MB and ratio 0.800`。剩下的 20% 留给激活、工作区和 CUDA Graph 等。这个值在 0.18.0 里必须在 0 和 1 之间；旧文档里“写成大于 1 的整数表示块数”的用法已经不被接受，会在启动时直接报错。

用资料助手的配置手算一下（Qwen3-8B，BF16，一张 H100 80GB）：

```text
权重：约 8.2B × 2 字节 ≈ 16.4 GB（约 15.3 GiB）
加载后空闲：约 79 GiB − 15.3 GiB − CUDA 上下文等 ≈ 63 GiB
KV 预算：63 GiB × 0.8 ≈ 50 GiB
每个 token 的 KV：36 层 × 8 个 KV 头 × 128 维 × 2（K 和 V）× 2 字节 = 144 KiB
可容纳：50 GiB ÷ 144 KiB ≈ 36 万个 token
```

推导方法和[显存账本](../llm-inference/04-memory-budget.md)一样，实际数字以日志为准。36 万 token 意味着平均每个请求 2000 token 时，大约能同时容纳 180 个请求，远小于默认的 1024 个槽位，所以在这块卡上真正限制并发的是 KV 而不是槽位数。打开 INT8 KV 量化（后文），容量大约翻倍。

另外几个和调度有关的参数：

- `--max-prefill-token-num`（默认 8192）：每一步预填充最多处理多少 token。长输入会被切成多段，和其他请求的 Decode 交替进行，就是[分块预填充](../llm-inference/11-chunked-prefill.md)。调大能缩短单个长请求的首 token 时间，但会拉长同一步里其他请求的 token 间隔。
- `--num-tokens-per-iter` 和 `--max-prefill-iters`（默认 0 和 1）：TurboMind 特有，两者配合实现类似 DeepSpeed 的 Dynamic SplitFuse，控制每次前向处理的 token 数和预填充最多拆成几次前向。
- `--enable-prefix-caching`：**默认关闭**。这和 vLLM、SGLang 默认开启前缀缓存不同。资料助手每个请求都带同一段系统提示和制度文档时，记得显式打开（原理见[前缀缓存](../llm-inference/10-prefix-cache.md)）。
- `--session-len`：单个序列的最大长度，不设时取模型配置里的最大位置数。Qwen3-8B 的配置是 40960，所以默认就按 40960 准备，比大多数业务需要的长。设小一些不能省下 KV 预算（预算按比例分配），但能让超长请求在入口就被拒绝，而不是占着大量 KV 慢慢跑。

TurboMind 文档里还描述过一个特点：KV 缓存管理器按最近最少使用淘汰序列，被淘汰的序列只保留 token ID，下次同一会话再来时重新计算 KV。早期 LMDeploy 的交互式对话靠这个机制在多轮之间保留状态。0.15.0 起推理改为无状态，`api_server` 的每个请求都是独立的，多轮对话的历史复用改由前缀缓存承担。

## PyTorch 引擎：覆盖广，新特性先到

PyTorch 引擎的调度器同样按块分配 KV（块大小也是 64），也是连续批处理。它和 TurboMind 的差别主要在“能做的事更多”：

- **模型覆盖**：新模型通常先在这里支持，大型 MoE 模型（DeepSeek-V3/V3.2/V4、GLM-5、Kimi-K2.6）只能走这条路。新模型接入只要写 Python 的模型文件，不需要改 C++ 算子。
- **投机解码**：`--speculative-algorithm` 可选 `eagle`、`eagle3`、`deepseek_mtp`、`hy3_mtp`、`qwen3_5_mtp`、`dflash`，配合 `--speculative-draft-model` 和 `--speculative-num-draft-tokens`（默认 1）。对 TurboMind 设置投机解码只会得到一条警告，不会生效。原理见[投机解码](../llm-inference/15-speculative-decoding.md)。
- **多 LoRA**：`--adapters` 可以挂多个适配器，用 `名字=路径` 的形式区分，请求里按名字选择。适配器按页换入换出，不必提前合并进权重。
- **大规模并行**：除张量并行 `--tp` 外，还有数据并行 `--dp`、专家并行 `--ep`，以及面向 DeepSeek 类 MoE 的 `--enable-microbatch`、`--enable-eplb`；多机可用 Ray（`--distributed-executor-backend ray`）。并行方式的原理见[分布式推理](../llm-inference/16-distributed.md)。
- **P/D 分离和 KV 连接器**：`--role Prefill/Decode` 与 `--migration-backend`（默认 DLSlime，可选 Mooncake），以及 `--kv-transfer-config` 接外部 KV 存储，都只在 PyTorch 引擎可用，给 TurboMind 传 `--kv-transfer-config` 会直接报错。
- **CUDA Graph**：默认开启（`--eager-mode` 默认 False），0.18.0 新增了预填充阶段的分段 CUDA Graph（`--piecewise-cudagraph-max-tokens`）。调试新模型时可以先开 `--eager-mode` 排除图捕获的问题。

代价是性能。对于 TurboMind 支持的模型，同样的硬件上 TurboMind 通常更快，尤其是 4 位权重量化的小批 Decode，这正是它的 C++ 实现和定制 GEMM 算子投入最多的地方。如果你的模型两台引擎都支持、又不需要 PyTorch 独有的特性，可以分别用 `--backend turbomind` 和 `--backend pytorch` 各跑一遍压测再决定。

## 量化：W4A16、W8A8 与在线 KV 量化

量化路线的原理见[量化篇](../llm-inference/14-quantization.md)。LMDeploy 自带量化工具，三条路线对应不同命令和引擎：

| 路线 | 怎样得到 | 推理引擎 | 主要收益 |
| --- | --- | --- | --- |
| W4A16（权重 4 位） | `lmdeploy lite auto_awq` 自己量化，或直接用社区的 AWQ/GPTQ 模型 | TurboMind 优先，PyTorch 也支持 | 权重显存约降到 1/4，小批 Decode 明显加速 |
| W8A8（权重和激活 8 位） | `lmdeploy lite smooth_quant --quant-dtype int8` 或 `fp8` | 只有 PyTorch | 大批量时计算更快 |
| KV INT8/INT4 | 启动时加 `--quant-policy`，不需要校准 | 两者都支持 | KV 容量约 2 倍/4 倍，提高并发 |

**W4A16。** 一条命令完成 AWQ 量化，默认用 wikitext2 数据集的 128 条样本、每条 2048 token 做校准，4 位、每 128 个权重一组：

```bash
lmdeploy lite auto_awq Qwen/Qwen3-8B --work-dir ./qwen3-8b-awq
lmdeploy serve api_server ./qwen3-8b-awq --model-format awq
```

量化后精度掉得明显时，官方建议加 `--search-scale` 并把 `--batch-size` 调到 8 重新量化，代价是耗时更长、显存占用更高；校准时显存不够则调小 `--calib-seqlen`。TurboMind 也能直接加载用 GPTQ 量化的 4 位模型，但 LMDeploy 自带的工具只实现了 AWQ 算法。官方 W4A16 文档列出的 GPU 是 V100 到 RTX 40 系列（sm70–sm89）；0.18.0 的发布说明提到扩展了 Hopper（sm90）上的量化 GEMM，在 H100 上用之前要以实测为准。`--model-format` 的可选值还有 `gptq`、`compressed-tensors`（llm-compressor 产出的 4 位分组模型）、`fp8`、`mxfp4`，不写时自动从模型配置里读取。

**W8A8。** SmoothQuant 先把激活里的离群值“搬”一部分到权重上，再把两者都量化成 8 位：

```bash
lmdeploy lite smooth_quant Qwen/Qwen3-8B --work-dir ./qwen3-8b-w8a8 --quant-dtype int8
lmdeploy serve api_server ./qwen3-8b-w8a8 --backend pytorch
```

量化结果的配置里写着 `smooth_quant`，所以即使不写 `--backend pytorch`，自动选择也会落到 PyTorch 引擎。官方文档列出 INT8 支持 V100 到 H100，FP8 需要 RTX 40 系列或 H100。

**在线 KV 量化。** 这是 LMDeploy 用得最多的一项量化，因为它不需要准备任何量化模型，启动时加一个参数即可：

```bash
lmdeploy serve api_server Qwen/Qwen3-8B --quant-policy int8
```

`--quant-policy` 接受名字或数字：`int8`（8）、`int4`（4）、`fp8`（16）、`fp8_e5m2`（17）、`turbo_quant`（42），默认 0 表示不量化。INT8 和 INT4 采用非对称、按头按 token 的量化，在写入 KV 时在线完成。官方用 OpenCompass 做的评测里，INT8 KV 几乎不掉点，INT4 多数数据集掉 1 到 2 个点、个别（如 GSM8K）掉 3 个点左右；Llama-2-7B 上 INT8 和 INT4 的请求吞吐分别提高约 27% 和 39%。TurboQuant（K 4 位、V 2 位，平均 3 位）压缩更狠，但只支持 PyTorch 引擎、不支持 MLA 架构和投机解码，官方在 H200 上测得吞吐下降约 7%，换来约 5 倍的 KV 压缩。

KV 量化前面说的限制别忘了：TurboMind 上 `head_dim` 不是 128 的模型不支持。量化后的验收方法见量化篇，至少要在资料助手自己的问答集上比较量化前后的答案质量，而不是只看吞吐。

## 多模态：InternVL 的主场

LMDeploy 对多模态模型的投入很深，InternVL 全系列、Qwen2-VL/2.5-VL/3-VL、Qwen3.5、Intern-S1、Gemma3、GLM-4V、MiniCPM-V、Llama4、Kimi-K2.6 等都在支持列表里。启动方式和纯文本模型一样，服务会自动识别：

```bash
lmdeploy serve api_server OpenGVLab/InternVL3-8B --server-port 23333
```

请求按 OpenAI 的格式在消息里放 `image_url`，可以是 http(s) 地址或 `data:` 开头的 base64。0.16.0 起 TurboMind 自己实现了 InternVL 和 Qwen-VL 系列的视觉编码器，0.18.0 的 TurboMind 也包含 Qwen3.5 的视觉部分（官方支持表的脚注还写着不支持，是旧说明）。其他多模态模型的视觉部分走 PyTorch 实现。

有两个和多模态相关的参数：`--vision-max-batch-size` 控制一次编码几张图（默认 1，图片多的业务可以调大，但要留出视觉编码器的显存）；`--language-model-only` 让多模态模型只当纯文本模型跑，不加载视觉编码器，省显存。

多模态服务有一个安全问题必须处理：服务端会按请求里的地址去取图片，`--allowed-media-domains` 默认不设，即任何域名都会去访问；而且除了 http(s) 和 data URL，`file://` 地址和服务器上存在的本地路径也会被当成图片读取。对外提供服务时，要么用 `--allowed-media-domains` 列出允许的图片域名，要么在网关层把 `image_url` 限定为 base64，否则就留下了让服务器替攻击者访问内网地址或读本地文件的口子。

## 启动服务与生产部署

最小的服务启动（Linux + NVIDIA GPU，安装文档推荐 Python 3.10 到 3.13，PyPI 另有 3.14 的轮子；0.18.0 的轮子基于 CUDA 12.8）：

```bash
python3.12 -m venv .venv-lmdeploy && source .venv-lmdeploy/bin/activate
python -m pip install 'lmdeploy==0.18.0'

lmdeploy serve api_server Qwen/Qwen3-8B --server-port 23333 --session-len 8192
```

不写 `--server-port` 时默认端口是 **23333**。启动完成后可以用 OpenAI SDK 调用：

```bash
curl http://localhost:23333/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "Qwen/Qwen3-8B", "messages": [{"role": "user", "content": "年假怎么申请？"}], "max_tokens": 256}'
```

除了 `/v1/chat/completions`、`/v1/completions`、`/v1/models`，0.18.0 还提供 `/v1/responses`、Anthropic 风格的 `/v1/messages`、健康检查 `/health` 和 Prometheus 指标 `/metrics`。工具调用和推理内容解析要分别用 `--tool-call-parser`、`--reasoning-parser` 指定解析器。注意 `/v1/embeddings` 在 LMDeploy 里是未实现的接口，调用会直接返回 400，需要向量化的场景要另找服务。

启动后检查三处日志：选中的引擎（有没有 `Fallback to pytorch engine`）、KV 缓存预算（`Object cache budget`）、实际的 `session_len` 和 `max_batch_size`。

**生产部署前必须改的默认值。** `api_server` 默认监听 `0.0.0.0`，跨域设置全部是 `*`，不设 `--api-keys` 时没有任何认证。设了 `--api-keys` 以后，除 `/health`、`/docs`、`/redoc` 和 `/nodes` 开头的路径外，其他接口都要求 `Authorization: Bearer` 头。`/sleep`、`/wakeup`、`/update_weights` 这类管理接口和对话接口在同一个端口上，所以不要把 `api_server` 直接暴露在公网，前面要有网关做鉴权、限流和路径过滤（见[生产部署篇](../llm-inference/21-production.md)）。`--allow-terminate-by-client` 默认关闭，保持关闭。

**容器与 Kubernetes。** 官方镜像是 `openmmlab/lmdeploy`，文档示例用 `latest` 标签，生产环境应固定到具体版本标签并记录镜像摘要：

```bash
docker run --runtime nvidia --gpus all \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  -p 23333:23333 --ipc=host \
  openmmlab/lmdeploy:<版本标签> \
  lmdeploy serve api_server Qwen/Qwen3-8B --api-keys <密钥>
```

仓库的 `k8s/` 目录有一份 Deployment 和 Service 示例，容器端口 23333，带就绪和存活探针，可以作为起点。

**监控。** `/metrics` 默认开启（`--disable-metrics` 关闭），指标名以 `lmdeploy:` 开头，仓库的 `lmdeploy/monitoring` 目录提供了 Prometheus 加 Grafana 的 docker compose 配置。读 `lmdeploy:gpu_cache_usage_perc` 时要知道两台引擎口径不同：PyTorch 引擎默认只统计在途请求引用的块，TurboMind 统计的是前缀缓存和检查点对象占用的字节；TurboMind 在数据并行大于 1 时暂时没有调度指标。

## 多实例：proxy 与 P/D 分离

资料助手推广到全公司以后，一个实例不够用。LMDeploy 自带的 `proxy` 可以把多个 `api_server` 组织成一个入口：

![LMDeploy 的多实例拓扑：客户端只访问 proxy，proxy 按路由策略把请求分给多个 api_server；DistServe 模式下 proxy 先把请求发给 Prefill 实例，再由 Decode 实例接着生成](/ai/inference-engines/lmdeploy-proxy.svg)

```bash
# 代理，默认端口 8000
lmdeploy serve proxy --server-port 8000 --routing-strategy min_expected_latency

# 两个实例，启动时自动注册到代理
CUDA_VISIBLE_DEVICES=0 lmdeploy serve api_server Qwen/Qwen3-8B --server-port 23333 --proxy-url http://127.0.0.1:8000
CUDA_VISIBLE_DEVICES=1 lmdeploy serve api_server Qwen/Qwen3-8B --server-port 23334 --proxy-url http://127.0.0.1:8000
```

客户端只访问代理的 8000 端口，接口和单个 `api_server` 一样。节点也可以通过 `/nodes/add`、`/nodes/remove`、`/nodes/status` 手动管理。路由策略有三种：`random`（按各节点报告的吞吐能力加权随机）、`min_expected_latency`（默认，按排队请求数和吞吐能力估算完成时间，选最短的）、`min_observed_latency`（按最近一段时间实际观测到的平均耗时选）。三种策略都不看前缀缓存命中，需要 KV 感知路由时要用[编排层](./08-orchestration.md)的组件。

同一个代理也负责 P/D 分离。把 `--serving-strategy` 设为 `DistServe`，再分别以 `--role Prefill` 和 `--role Decode` 启动实例（必须是 `--backend pytorch`），代理会先把请求交给 Prefill 实例，KV 通过 DLSlime（或 Mooncake）经 RDMA 或 NVLink 传到 Decode 实例继续生成。默认走 RDMA，需要机器上装好 ibverbs、加载 GPUDirect RDMA 驱动。P/D 分离值不值得做，先看 [P/D 分离篇](../llm-inference/17-pd-disaggregation.md)的判断标准。

代理本身也监听 `0.0.0.0`，同样支持 `--api-keys`，而 `/nodes` 开头的节点管理接口在认证中间件里是放行的。这意味着能访问代理端口的人就能增删节点，代理也只能放在内网，节点管理接口要在网关层屏蔽。

## 昇腾与其他硬件

LMDeploy 是国产 AI 芯片上较早可用的开源推理框架之一。`--device` 可选 `cuda`、`ascend`（华为昇腾）、`maca`（沐曦）、`camb`（寒武纪），非 CUDA 设备只走 PyTorch 引擎，底层通过 dlinfer 调用各家的算子库（昇腾上是 `torch-npu` 加 `dlinfer-ascend`）。

```bash
lmdeploy serve api_server --backend pytorch --device ascend internlm/internlm2_5-7b-chat
```

官方文档列出支持 Atlas 800T A3、Atlas 800T A2 和 Atlas 300I Duo 三种昇腾设备，并提供对应的 Docker 镜像。支持范围比 NVIDIA 窄得多：A3 目前只支持 Qwen 系列且只能用 eager 模式；300I Duo 只能用图模式；A2 的支持表覆盖 Llama2/3、InternLM2/2.5/3、Qwen2/2.5/3、Qwen2-VL/2.5-VL、InternVL 系列等，W8A8 要用图模式、W4A16 要用 eager 模式。量化在昇腾上也可以做，`lmdeploy lite auto_awq ... --device npu`。在国产卡上选型时，要按“模型 × 设备型号 × eager/graph 模式 × 量化方式”这个组合逐项对表，不能只看“支持昇腾”。

AMD GPU 需要在 ROCm 容器里设置 `LMDEPLOY_TARGET_DEVICE=rocm` 从源码安装，不像 vLLM 那样有成熟的预编译包。NVIDIA Jetson 有社区项目和仓库里的 `Dockerfile.jetson`。Windows 上 PyPI 有预编译轮子，TurboMind 可用。macOS 没有预编译包，Apple 芯片上请看 [llama.cpp](./05-llama-cpp.md)、[Ollama](./06-ollama.md) 和 [MLX-LM](./07-local-and-edge.md) 三篇。

## 常见坑

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 性能比预期差很多，参数也对不上 | 模型实际回退到了 PyTorch 引擎 | 看启动日志里的 `Fallback to pytorch engine`；按文档表格判断不可靠 |
| 启动时报 cache ratio 相关的检查失败 | 把 `--cache-max-entry-count` 写成了大于 1 的块数 | 0.18.0 只接受 0 到 1 之间的比例 |
| 加载后、第一批长请求时显存不足 | 剩下 20% 不够放激活和工作区，或同卡有别的进程 | 调低 `--cache-max-entry-count`（如 0.6）或调小 `--max-prefill-token-num` |
| 加了 `--quant-policy int8` 但报不支持 | 模型 `head_dim` 不是 128（TurboMind） | 换 PyTorch 引擎，或放弃 KV 量化 |
| 配了投机解码没有加速 | TurboMind 不支持，只打印警告 | 加 `--backend pytorch` |
| 多轮对话首 token 很慢 | 前缀缓存默认关闭 | 加 `--enable-prefix-caching` |
| 调 `/v1/embeddings` 返回 400 | 该接口未实现 | 向量化用专门的服务 |
| 按官方表格选了模型，结果引擎不支持 | 支持表与 0.18.0 代码不一致 | 以代码里的支持表和启动日志为准，升级后重新确认 |

**不适合的场景。** 如果主力模型是 DeepSeek-V3 这类大型 MoE，LMDeploy 只能用 PyTorch 引擎，这时它和 vLLM、SGLang 比没有 TurboMind 那样的性能优势，而后两者在大规模专家并行、P/D 分离和社区部署经验上积累更多，通常应优先评估后两者。需要向量化接口、需要 AMD GPU 上开箱即用、或者依赖 Kubernetes 生态里成熟的 KV 感知路由时，LMDeploy 也不是首选。反过来，主力模型是 InternVL、Qwen-VL 或 InternLM，或者要在昇腾上快速跑起来，LMDeploy 值得放在候选名单前面。

## 版本与变化

当前正式版是 **0.18.0**（2026-09-28），PyPI 提供 Linux x86_64 和 Windows 的 Python 3.10 到 3.14 轮子。最近几个版本节奏约为每月一版，变化集中在这些地方：

- **0.18.0**：输出输入部分的 logprobs；扩展 Hopper 上的量化 GEMM；昇腾支持 GLM-5.2；Qwen3.5 支持 DFlash 投机解码；PyTorch 引擎实验性地复用 TurboMind 的 W4A16 算子；预填充阶段的分段 CUDA Graph；Mooncake 存储支持 MTP；移除旧的 OpenAI API 客户端。
- **0.16.0**：TurboMind 自带 InternVL 与 Qwen-VL 系列的视觉编码器。
- **0.15.0**：推理改为无状态，移除交互式会话；新增 `--language-model-only`，替代原来的 `--disable-vision-encoder`；TurboMind 新的显存分配器和对象缓存；移除一批过时模型。
- **0.14.0**：重写 TurboMind 的模型层，此后支持的架构收窄，Mixtral 在这一版重新加回。
- **0.13.0** 起 PyPI 轮子基于 CUDA 12.8。

升级时要特别回归三件事：模型是否还在 TurboMind 支持表里（重写模型层的版本可能让模型回退到 PyTorch 引擎）；`--cache-max-entry-count` 等参数语义有没有变；视觉编码器跑在哪台引擎上。和其他引擎一样，保留引擎版本、镜像摘要、模型版本、量化配置和启动参数，用同一套质量集和压测脚本比较升级前后。

LMDeploy 用一套服务层包住两台引擎：TurboMind 在少数热门架构上追求极致性能，PyTorch 引擎负责广覆盖、新特性和国产硬件。不写 `--backend` 时它会自动选择，判断依据是代码里的支持表而不是文档表格，所以一定要看启动日志。在线 KV 量化、AWQ 和多模态是它的强项，前缀缓存默认关闭、监听所有地址且默认无认证是需要主动改的默认值。

vLLM、SGLang、TensorRT-LLM 和 LMDeploy 都默认手里有数据中心 GPU。接下来换到另一个极端：不依赖数据中心 GPU、能在笔记本和 CPU 上跑起来的 [llama.cpp](./05-llama-cpp.md)。
