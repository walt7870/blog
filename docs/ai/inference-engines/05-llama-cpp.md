# 05. llama.cpp：从 GGUF 文件到本地推理服务

前四篇的 vLLM、SGLang、TensorRT-LLM、LMDeploy 都默认手里有数据中心 GPU，目标是让一张 H100 同时服务尽可能多的用户。llama.cpp 从另一端出发：2023 年 3 月，Georgi Gerganov 用纯 C/C++ 在一台 MacBook 上跑起了 LLaMA，不依赖 Python、PyTorch 和 CUDA。这个项目后来长成了本地推理的事实标准：它定义的 GGUF 文件格式是 Hugging Face 上最常见的量化模型格式之一，下一篇的 Ollama、众多桌面聊天应用和端侧 SDK 都把它当作底层引擎。

资料助手的服务端跑在 H100 上，但开发同事想在自己的笔记本上调试提示词，销售同事想在出差时离线查产品资料，这两类需求都落在 llama.cpp 的主场：单机、单用户或少量并发、CPU 与 GPU 混合、内存有限。这一篇讲清楚：llama.cpp 由哪几层组成；GGUF 文件里装了什么；`Q4_K_M` 这类量化名字是什么意思，怎样从 Hugging Face 权重做出一个 GGUF；同一份文件怎样跑在 CPU、Metal、CUDA、Vulkan 上；`llama-server` 的槽位、连续批处理和上下文切分怎样工作；KV 量化、投机解码、语法约束、嵌入与多模态怎样开启；以及部署时的安全和常见坑。

本篇以 **llama.cpp v0.7.0**（2026 年 10 月 15 日发布）为准，参数和默认值对照了这个版本的源码。文中标“实测”的命令在一台 Apple M4（24 GB 统一内存）笔记本上用 Qwen3-0.6B 运行过，使用 v0.7.0 对应的预编译包 b11669；测量时机器上有其他重负载程序，吞吐数字只作定性参考。CUDA、Vulkan、SYCL 等后端没有在本机运行。量化、Roofline、KV Cache、连续批处理和投机解码的原理见推理系列对应篇，这里只讲 llama.cpp 怎样实现和配置。

## 三层代码：ggml、libllama 和工具

llama.cpp 仓库里其实有三层东西，分清它们，才能看懂文档和日志在说哪一层：

- **ggml** 是底层张量库，和 llama.cpp 同属 ggml-org，独立发版（v0.7.0 带的是 ggml v0.27.0）。它定义张量、计算图和所有量化格式，并通过“后端”（backend）把计算交给 CPU、Metal、CUDA、Vulkan 等设备。ggml 的后端调度器可以把一张计算图拆开，一部分节点放 GPU，一部分留在 CPU，这是 llama.cpp 能“部分卸载”的基础。
- **libllama**（`src/`，对外头文件 `include/llama.h`）懂得大模型：读 GGUF、分词、按模型架构（qwen3、llama、gemma 等上百种）搭计算图、管理 KV Cache、把一批 token 拆成设备能处理的小批次。其他程序（包括 Ollama 打包的 `llama-server`）都通过它调用模型。
- **工具**（`tools/`）是用户直接接触的部分：`llama-cli` 交互对话，`llama-server` 提供 HTTP 服务和网页界面，`llama-quantize` 量化，`llama-imatrix` 做量化校准，`llama-bench` 测速，`llama-perplexity` 评估质量，`ggml-rpc-server` 把一台机器的设备借给另一台。当前版本还有一个统一入口 `llama`，`llama serve` 等价于 `llama-server`，`llama cli` 等价于 `llama-cli`。

模型从 Hugging Face 到能被调用，要先经过一条转换流水线；加载之后，每一步推理再穿过这三层。

![llama.cpp 的模型准备流水线（safetensors 转 GGUF、可选校准、量化、运行）和一个服务进程内工具层、libllama、ggml 及多种后端的分层关系](/ai/inference-engines/llamacpp-stack.svg)

上排的四个箭头对应四个命令，后面“转换与量化”一节逐个讲。下排值得注意的是最后一层：后端是**编译时**选定的。同一份源码，编译时打开 `GGML_METAL` 就得到 Metal 版，打开 `GGML_CUDA` 就得到 CUDA 版；预编译包也按后端分别发布。GGUF 文件本身与后端无关，同一个文件可以在 Mac、Windows 显卡机和树莓派上加载。

## GGUF：一个文件装下整个模型

vLLM 加载一个模型，要读 Hugging Face 仓库里的 `config.json`、`tokenizer.json`、`tokenizer_config.json` 和若干 `.safetensors`。GGUF 的设计目标是**一个文件自带一切**：超参数、分词器、对话模板和全部权重都在里面，并且可以直接内存映射（mmap），加载时不必整个读进内存再拷贝。

![GGUF 文件依次由文件头、元数据键值对、张量信息表和对齐的张量数据组成](/ai/inference-engines/llamacpp-gguf.svg)

文件头只有 24 个字节：4 字节的 `GGUF`、4 字节的版本号（当前是 3），以及各 8 字节的张量个数和元数据个数。接下来是元数据键值对，键名有约定的命名空间：`general.*` 是通用信息，`<架构名>.*` 是该架构的超参数，`tokenizer.*` 是分词器。再往后是张量信息表，每个张量记下名字、形状、数据类型和在数据区的偏移；最后是按对齐（默认 32 字节）存放的张量数据。

在本机量化 Qwen3-0.6B 时，加载器打印出了这些元数据（节选）：

```text
general.architecture str = qwen3
qwen3.block_count u32 = 28
qwen3.context_length u32 = 40960
qwen3.attention.head_count u32 = 16
qwen3.attention.head_count_kv u32 = 8
qwen3.attention.key_length u32 = 128
tokenizer.ggml.model str = gpt2
tokenizer.chat_template str = {%- if tools %}\n ...
general.file_type u32 = 15
```

这几行已经够算出 KV Cache 的大小了（算法见[推理系列第 3 篇](../llm-inference/03-kv-cache.md)，后面会用到）：每个 token 每层存 K 和 V 两份，各 8 个头 × 128 维，FP16 每个数 2 字节，28 层合计每 token 112 KiB。`tokenizer.chat_template` 是 Jinja 模板，`llama-server` 默认用它把 `messages` 渲染成模型认识的提示词；模板写错或缺失，是“模型回答怪异”的常见原因。

GGUF 有两个容易误会的地方。第一，**一个文件里的张量可以用不同的量化类型**，文件名里的 `Q4_K_M` 只是“主要类型”；实测这个 Q4_K_M 文件里有 113 个 f32 张量（各种 norm）、168 个 q4_K、29 个 q6_K。第二，超大模型会被 `llama-gguf-split` 切成 `xxx-00001-of-00003.gguf` 这样的分片，加载时只需指定第一个分片。

## 量化类型：Q4_K_M 到底是什么

GGUF 的量化名字很多，但规律只有几条。[推理系列第 14 篇](../llm-inference/14-quantization.md)讲过“分组量化”：一组权重共享一个缩放系数，组越小、系数精度越高，误差越小，额外开销也越大。llama.cpp 的各代格式就是这条思路的不同取舍：

| 系列 | 例子 | 怎样存 | 说明 |
| --- | --- | --- | --- |
| 传统格式 | `Q4_0`、`Q5_1`、`Q8_0` | 每 32 个权重一组，一个 FP16 缩放（`_1` 再加一个最小值） | `Q4_0` 每权重 4.5 位；`Q8_0` 约 8.5 位，几乎无损，常作为“参照版” |
| k-quants | `Q2_K` 到 `Q6_K`，及 `_S`/`_M`/`_L` | 256 个权重的超级块，内部 8 个 32 元子块；子块的缩放再用 6 位量化 | 同样位数下误差更小；`_S/_M/_L` 表示对敏感张量升位的多少 |
| i-quants | `IQ4_XS`、`IQ3_M`、`IQ2_XXS`、`IQ1_S` | 非均匀码本，按组查表还原 | 2—3 位时质量明显好于同位数的 k-quants；最低几档必须提供 imatrix |
| 三值 | `TQ1_0`、`TQ2_0` | 权重只有 −1、0、+1 | 只对按三值训练的模型（BitNet 一类）有意义 |
| 微缩放浮点 | `MXFP4_MOE` | MXFP4，专给 MoE 专家权重 | 对应原生以 MXFP4 发布的模型 |
| 浮点 | `BF16`、`F16`、`F32` | 不量化 | 转换的中间产物，或给小模型保真用 |

`_S`、`_M`、`_L` 的区别在于“哪些张量升位”。以 `Q4_K_M` 为例，大部分矩阵用 q4_K，但对质量更敏感的部分层的 `attn_v`、`ffn_down` 和输出层升到 q6_K；Qwen3-0.6B 这类输出层与词表嵌入共用一份权重的模型，词表嵌入也跟着升位。`llama-quantize` 的帮助里用 Llama-3-8B 给出了各档的大小和困惑度增量，可以直接拿来比较：

| 类型 | Llama-3-8B 文件大小 | 困惑度增量 | 用途 |
| --- | ---: | ---: | --- |
| `Q8_0` | 7.96 GiB | +0.0026 | 内存够时的保真选择 |
| `Q6_K` | 6.14 GiB | +0.0217 | 接近无损 |
| `Q5_K_M` | 5.33 GiB | +0.0569 | 质量优先的折中 |
| `Q4_K_M` | 4.58 GiB | +0.1754 | 最常用的默认档 |
| `Q4_0` | 4.34 GiB | +0.4685 | 只在某些后端的特化内核更快时考虑 |
| `Q3_K_M` | 3.74 GiB | +0.6569 | 内存非常紧时 |
| `Q2_K` | 2.96 GiB | +3.5199 | 质量损失已经很大 |

困惑度增量只是一个整体指标，对代码、数学、长上下文检索等任务的影响要用自己的评测集确认（推理系列第 14 篇的“怎样验收”）。

一个容易困惑的现象出现在实测里：把 Qwen3-0.6B 量化到 Q4_K_M，`llama-quantize` 报告的平均位数是 **5.24 BPW**，而不是 8B 模型上常见的 4.9 左右。原因是这个小模型的词表有 151936 个词，词表嵌入矩阵（1024 × 151936）用 q6_K 存，单这一个张量就占 121.7 MiB，接近整个文件的三分之一。模型越小，词表嵌入占比越大，“Q4”文件的实际位数就越高。

怎样选：内存放得下时，`Q4_K_M` 是大多数人的起点，`Q5_K_M`、`Q6_K` 用来对照质量；只有当模型放不进内存时才往 3 位、2 位走，这时优先选 IQ 系列并配 imatrix。和“小模型的高位量化”相比，“大模型的低位量化”往往质量更好，但要实测：同样 8 GB 内存，14B 的 `IQ3_M` 和 8B 的 `Q6_K` 哪个更适合资料助手，取决于任务。

## 转换与量化：从 Hugging Face 权重到 GGUF

大部分热门模型在 Hugging Face 上已经有现成的 GGUF（官方仓库或 `ggml-org`、`bartowski`、`unsloth` 等社区仓库），直接下载即可：

```bash
# 自动下载并运行；不写 :量化 时默认取 Q4_K_M，没有就取仓库里第一个文件
llama-server -hf ggml-org/Qwen3-8B-GGUF:Q4_K_M
```

`-hf` 下载的文件放在 `LLAMA_CACHE` 指定的目录，并兼容 Hugging Face hub 的缓存目录。需要自己做的情况有三种：模型太新还没人转，要量化自己微调过的模型，或者要用自己的语料做 imatrix。完整流程是四步（以下命令在 llama.cpp 源码目录执行，Python 依赖按仓库的 `requirements.txt` 安装；本机没有运行转换脚本）：

```bash
# 1. safetensors → GGUF，保留 BF16 精度（--outtype 可选 f32/f16/bf16/q8_0/tq1_0/tq2_0/auto）
python convert_hf_to_gguf.py ./Qwen3-8B --outtype bf16 --outfile qwen3-8b-bf16.gguf

# 2. （可选）用一段代表性文本计算重要性矩阵，默认输出 imatrix.gguf
llama-imatrix -m qwen3-8b-bf16.gguf -f calib-zh.txt -o imatrix.gguf -ngl all

# 3. 量化
llama-quantize --imatrix imatrix.gguf qwen3-8b-bf16.gguf qwen3-8b-q4_k_m.gguf Q4_K_M

# 4. 验证：困惑度对比 + 业务问题抽查
llama-perplexity -m qwen3-8b-q4_k_m.gguf -f eval-zh.txt
```

**imatrix** 的作用是告诉量化器“哪些列的权重在真实输入下更重要”，量化时优先保住它们的精度。它对 k-quants 是锦上添花，对最低位的 i-quants 是必需品：目标类型是 `IQ1_S`、`IQ1_M`、`IQ2_XXS`、`IQ2_XS`、`IQ2_S`、`IQ3_XXS`（以及 `Q2_K_S`）而没给 imatrix 时，`llama-quantize` 会直接报错 `this quantization requires an importance matrix!` 并退出——源码注释说得很直白，硬做出来的结果“will be garbage”。校准文本最好贴近业务：资料助手主要处理中文制度文档，就用中文语料，而不是只用英文维基。

`llama-quantize` 还有几个实用开关：`--dry-run` 只打印每个张量将被量化成什么、文件多大，不真正写文件；`--tensor-type attn_v=q8_0` 单独指定某类张量；`--output-tensor-type`、`--token-embedding-type` 控制输出层和词表嵌入。

**一个反例。** 本机实测用的是现成的 `Qwen3-0.6B-Q8_0.gguf`，用 `--allow-requantize` 再量化到 Q4_K_M：

```bash
llama-quantize --allow-requantize Qwen3-0.6B-Q8_0.gguf Qwen3-0.6B-Q4_K_M.gguf Q4_K_M
# model size  =   604.15 MiB (8.50 BPW)
# quant size  =   372.65 MiB (5.24 BPW)
# quantize time = 26743.34 ms
```

命令成功了，但这是“量化的量化”，Q8_0 的误差会叠加到 Q4_K_M 上，所以默认需要 `--allow-requantize` 才允许。做演示没问题，正式发布的文件应当从 BF16/F16 开始量化。

## 后端：同一份 GGUF 跑在哪

| 后端 | 目标设备 | 说明 |
| --- | --- | --- |
| CPU | x86（AVX/AVX2/AVX512/AMX）、ARM（NEON、SVE/SME）、RISC-V | 永远可用；x86 预编译包按指令集分别提供动态库，运行时选择 |
| Metal | Apple Silicon GPU | macOS 包默认启用，`-ngl` 默认把全部层放 GPU |
| CUDA | NVIDIA GPU | 自带大量手写内核；Docker 镜像有 CUDA 12 和 CUDA 13 两套 |
| HIP、MUSA | AMD GPU、摩尔线程 GPU | 复用 CUDA 内核代码 |
| Vulkan | 几乎所有现代 GPU（含核显） | 驱动装好就能用，跨厂商的通用选择 |
| SYCL、OpenVINO | Intel GPU / CPU / NPU | OpenVINO 仍在进行中 |
| CANN | 华为昇腾 NPU | |
| OpenCL、Hexagon | 高通 Adreno GPU、骁龙 NPU | 面向手机 |
| BLAS、BLIS、ZenDNN、zDNN | CPU 上的加速库 | 主要加速 Prompt 处理 |
| WebGPU、VirtGPU | 浏览器、虚拟机 | |
| RPC | 远端机器上的任意后端 | 见“多机”一节 |

预编译包在 GitHub 发布页按“平台 × 后端”分别打包，例如 `llama-<build>-bin-macos-arm64.tar.gz`、`…-win-cuda-…`、`…-ubuntu-vulkan-…`；也可以用 `curl -LsSf https://llama.app/install.sh | sh` 安装，或用 Homebrew、winget、Docker。自己编译时用 CMake 打开对应开关（`-DGGML_CUDA=ON`、`-DGGML_VULKAN=ON` 等），细节见仓库 `docs/build.md`。

和设备相关的几个运行参数：

| 参数 | 默认值 | 作用 |
| --- | --- | --- |
| `-ngl, --n-gpu-layers` | `auto` | 放到 GPU 的层数：数字、`auto` 或 `all` |
| `--fit on/off` | `on` | 没有显式指定的参数（层数、上下文等）自动调整到能放进设备内存 |
| `-sm, --split-mode` | `layer` | 多卡切分方式：`none`、`layer`（按层流水）、`row`（按行并行）、`tensor`（实验性的张量并行） |
| `-ts, --tensor-split` | 自动 | 多卡之间按什么比例分，例如 `3,1` |
| `-ot, --override-tensor` | 无 | 按张量名正则指定放哪个设备，例如把 MoE 专家留在 CPU |
| `-cmoe` / `-ncmoe N` | 关 | 全部 / 前 N 层的 MoE 专家权重留在 CPU |
| `--moe-cache-mib N` | 0 | v0.7.0 新增：专家放在主机内存时，在 GPU 上开一块 LRU 缓存 |
| `-t, --threads` | 自动 | CPU 线程数，一般设为性能核数量 |
| `-lm, --load-mode` | `auto` | `mmap`、`mlock`、`mmap+mlock`、`dio` 等，取代了旧的 `--mlock`、`--no-mmap` |

“部分卸载”是 llama.cpp 最有特色的能力：模型比显存大时，`-ngl 20` 把前 20 层放 GPU、其余留在 CPU，两边各算各的层，中间结果在层边界传递。代价是 CPU 那部分的速度受系统内存带宽限制，往往成为瓶颈。对 MoE 模型有更聪明的切法：注意力和共享部分放 GPU，体积巨大但每个 token 只激活一小部分的专家权重留在 CPU（`-ncmoe`），这样 GPU 上算的是每步都要用的部分，CPU 只算被选中的少数专家。

## 性能直觉：带宽决定 Decode，算力决定 Prefill

[第 6 篇](../llm-inference/06-gpu-roofline.md)的 Roofline 和[推理系列第 22 篇](../llm-inference/22-edge.md)的端侧分析在这里直接适用：单用户 Decode 每生成一个 token 都要把全部权重读一遍，速度上限约等于“内存带宽 ÷ 权重字节数”；Prefill 一次处理成百上千个 token，权重读一次就能复用很多次，瓶颈转到算力。所以在笔记本上，量化首先是为了让 Decode 更快、模型放得下，而 GPU 的主要价值是让长 Prompt 的处理不再漫长。

本机用 `llama-bench` 对比了 CPU（`-ngl 0`）和 Metal（`-ngl 99`），`pp512` 是处理 512 token 的 Prompt，`tg128` 是生成 128 token：

```bash
llama-bench -m Qwen3-0.6B-Q8_0.gguf,Qwen3-0.6B-Q4_K_M.gguf -ngl 0,99 -p 512 -n 128 -r 3
```

| 模型 | 后端 | pp512（token/s） | tg128（token/s） |
| --- | --- | ---: | ---: |
| Q8_0 | CPU | 404 ± 78 | 64 ± 34 |
| Q8_0 | Metal | 1412 ± 133 | 57 ± 6 |
| Q4_K_M | CPU | 199 ± 38 | 100 ± 6 |
| Q4_K_M | Metal | 1220 ± 60 | 74 ± 15 |

这是在 Apple M4 笔记本上实测的结果，但测量时机器上还有其他重负载程序（系统负载在 20 到 150 之间波动），同样的命令重跑几次，Decode 数字在 12 到 133 token/s 之间变化，标准差也很大。能稳定得出的结论只有两条：Metal 的 Prompt 处理比 CPU 快 3—7 倍；Decode 在这台机器上 CPU 和 Metal 没有拉开稳定差距，因为两者读的是同一块统一内存，瓶颈是带宽而不是算力。M4 的内存带宽约 120 GB/s，按约 390 MB 的 Q4_K_M 权重算，Decode 理论上限约 300 token/s；0.6B 这样的小模型每步还有固定的调度和采样开销，实际离上限更远。8B 模型的权重是它的十几倍，固定开销占比小，速度会更接近“带宽 ÷ 权重”。

自己测速时，让机器尽量空闲，用 `-r 5` 以上的重复次数看标准差；比较两个配置时只改一个变量。`llama-bench` 测的是纯模型速度，服务端到端的延迟还要加上排队、模板渲染和网络。

## llama-cli 与 llama-server

`llama-cli` 是交互式命令行，适合快速试模型。当前的 `llama-cli` 内部复用了服务端的对话逻辑，默认进入多轮对话；`-st` 只回答一轮就退出，`-rea off` 关掉思考模型的推理段落：

```bash
llama-cli -m Qwen3-0.6B-Q4_K_M.gguf -c 4096 -st -p "用一句话解释什么是 GGUF。" -rea off
```

本机实测输出：

```text
> 用一句话解释什么是 GGUF。
GGUF 是一种用于提升图像质量的算法，通过深度学习技术实现图像的精简和高质量。

[ Prompt: 147.9 t/s | Generation: 133.4 t/s ]
```

速度很好，答案完全错误。0.6B 的模型没见过足够的 llama.cpp 资料，就自信地编了一个。这个例子提醒两件事：引擎跑通只是第一步，模型能力要单独验收；本地小模型适合做格式转换、分类、短摘要这类不依赖大量世界知识的任务，资料助手的问答仍然要靠检索把资料放进提示词，再加程序校验。

`llama-server` 是生产中更常用的形态。它是一个单进程的 HTTP 服务，内置网页聊天界面，提供 OpenAI 兼容和 Anthropic 兼容接口：

```bash
llama-server -m Qwen3-0.6B-Q4_K_M.gguf -c 16384
# security: no API key is set and CORS allows all origins
# initializing, n_slots = 4, n_ctx_slot = 16384, kv_unified = 'true'
# listening on http://127.0.0.1:9931
```

注意三点：默认只监听 `127.0.0.1`；默认端口从 v0.7.0 起是 **9931**（以前是 8080）；没有设置 API Key 时启动日志会给出安全警告。主要接口：

| 路径 | 用途 |
| --- | --- |
| `/v1/chat/completions`、`/v1/completions`、`/v1/responses` | OpenAI 兼容的对话、补全、Responses |
| `/v1/messages` | Anthropic Messages 兼容 |
| `/v1/embeddings`、`/v1/rerank` | 嵌入和重排（需要对应启动参数） |
| `/v1/audio/transcriptions` | 语音转写（音频模型） |
| `/v1/models`、`/health` | 模型列表、健康检查（`/health` 不检查 API Key） |
| `/completion`、`/infill`、`/tokenize`、`/apply-template` | 原生补全、代码填空、分词、只渲染模板 |
| `/slots`、`/metrics` | 槽位状态、Prometheus 指标 |

返回结果除了 OpenAI 格式的 `usage`，还多一个 `timings` 字段，直接给出这次请求的 Prompt 和生成速度，排查慢请求很方便。

## 槽位、连续批处理与上下文切分

`llama-server` 的并发单位叫**槽位**（slot）。每个槽一次服务一个请求，有自己的 token 序列和采样状态。服务端每一步把所有活跃槽这一步要算的 token 拼成一个批次，一次 `llama_decode` 前向，再各自采样；某个槽的请求结束就立刻空出来接新请求。这就是[第 9 篇](../llm-inference/09-continuous-batching.md)讲的连续批处理，在 llama.cpp 里默认开启（`-cb`）。

![llama-server 中请求经过任务队列分配到槽位，每步拼批调用 llama_decode；下方对比统一 KV 池与按 -np 平均切分两种上下文分配](/ai/inference-engines/llamacpp-slots.svg)

槽位数由 `-np` 控制，而 `-c` 是**整个 KV 池**的大小，不是每个请求的上限。两者怎样配合，取决于有没有显式写 `-np`，这是最容易踩的坑：

- **不写 `-np`**（默认 `-1`，即 auto）：服务端开 4 个槽，并启用统一 KV 池（`kv_unified = true`）。4 个槽共用 `-c` 个单元，单个请求最长可以用满 `-c`，但所有槽加起来也只有 `-c`。
- **写了 `-np 4`**：KV 池被平均切开，每个槽固定 `-c / 4`。实测 `-c 16384 -np 4` 时日志是 `n_ctx_seq = 4096`、`n_ctx_slot = 4096`、`kv_unified = 'false'`。这时一个 6000 token 的请求会超出它那一格，即使另外三个槽空着也借不到。
- 想要“每槽最多 N、池子按需”，用 `--kv-unified-per-slot N`：不写 `-c` 时池大小自动设为 `np × N`。

不写 `-c` 时，上下文取模型的训练长度（Qwen3-0.6B 是 40960），`--fit` 在内存不够时会自动调小。

在本机同时发出 1、4、8 个请求实测（每个请求生成 128 token，统一 KV 池，4 个槽）：

| 并发请求数 | 总耗时 | 总吞吐 | 各请求耗时 |
| ---: | ---: | ---: | --- |
| 1 | 7.06 s | 18 token/s | 7.06 s |
| 4 | 5.68 s | 90 token/s | 4 个都是 5.68 s |
| 8 | 11.06 s | 93 token/s | 前 4 个 5.9 s，后 4 个 11.0 s |

4 个请求一起跑时总吞吐翻了约 5 倍（单请求那次正好赶上机器负载高峰，偏慢），因为 Decode 受带宽限制，一次读权重同时服务 4 个请求几乎不增加成本。8 个请求时多出来的 4 个只能排队，等前一批结束才拿到槽，所以耗时翻倍、总吞吐不再增长。槽位数要按“同时在线的请求数”和“内存装得下多少 KV”一起定：每多一个槽，就要多一份上下文的 KV。

槽位还承担前缀复用。新请求优先分配给“已有内容和它前缀最相似”的槽（`--slot-prompt-similarity`，默认 0.1），直接复用那个槽里已算好的 KV，只算新增部分；多轮对话时这能省掉大部分 Prompt 处理。槽被别的请求占用前，旧内容会被保存到主机内存里的提示缓存（`--cache-ram`，默认 8192 MiB），之后还能恢复。返回结果里 `usage.prompt_tokens_details.cached_tokens` 显示命中了多少。和 vLLM、SGLang 的块级前缀缓存（[第 10 篇](../llm-inference/10-prefix-cache.md)）相比，这是按槽的、较粗粒度的复用，适合少量用户的多轮对话，不适合成百上千个请求共享同一份长系统提示的场景。

上下文写满时，`--context-shift` 可以丢掉最早的一段继续生成，但默认关闭：服务端会在达到上限时结束生成（`finish_reason` 为 `length`），客户端要把它当作不完整结果处理。

## KV Cache 类型与 Flash Attention

小模型配长上下文时，内存的大头不是权重而是 KV。实测 Qwen3-0.6B Q4_K_M，`-c 16384`：

```text
CPU_Mapped model buffer size  =  121.71 MiB      # 词表嵌入留在 CPU 侧
MTL0_Mapped model buffer size =  372.65 MiB
llama_kv_cache: size = 1792.00 MiB (16384 cells, 28 layers, 4/1 seqs), K (f16): 896.00 MiB, V (f16): 896.00 MiB
```

1792 MiB 正好等于前面算的 112 KiB × 16384，进程实际占用约 1.9 GB，KV 占了九成。`-ctk`、`-ctv` 可以把 K、V 存成更低精度，可选 `f32`、`f16`（默认）、`bf16`、`q8_0`、`q4_0`、`q4_1`、`iq4_nl`、`q5_0`、`q5_1`：

```bash
llama-server -m Qwen3-0.6B-Q4_K_M.gguf -c 16384 -ctk q8_0 -ctv q8_0
# enabling flash_attn since it is required for quantized V cache
# llama_kv_cache: size = 952.00 MiB ... K (q8_0): 476.00 MiB, V (q8_0): 476.00 MiB
```

KV 减半，进程占用从 1916 MB 降到 1072 MB。日志第一行说明了一个约束：**量化 V 需要 Flash Attention**。`-fa` 默认是 `auto`，此时会自动开启；如果显式写了 `-fa off` 又量化 V，启动会失败。`q8_0` 的质量损失通常很小，`q4_0` 更省但对长上下文检索类任务影响更明显，K 比 V 更敏感，可以只降 V 或 K 用 `q8_0`、V 用 `q4_0`。原理和取舍见[第 14 篇](../llm-inference/14-quantization.md)“量化 KV Cache”一节。

## 投机解码

llama.cpp 的投机解码（原理见[第 15 篇](../llm-inference/15-speculative-decoding.md)）支持多种起草方式，用 `--spec-type` 选择，默认 `none`：

| 类型 | 草稿来源 | 需要什么 |
| --- | --- | --- |
| `draft-simple` | 一个同词表的小模型 | `-md` 指定草稿 GGUF |
| `draft-eagle3`、`draft-mtp`、`draft-dflash`、`draft-dspark` | 专门训练的草稿头或模型自带的 MTP 层 | 对应的草稿文件或支持 MTP 的模型 |
| `ngram-simple`、`ngram-map-k`、`ngram-mod`、`ngram-cache` 等 | 从已有文本里查 n-gram | 不需要额外模型 |

最常见的用法是给大模型配一个同系列小模型：

```bash
llama-server -m Qwen3-8B-Q4_K_M.gguf -md Qwen3-0.6B-Q8_0.gguf \
  --spec-type draft-simple --spec-draft-n-max 8 -ngl all --spec-draft-ngl all
```

`--spec-draft-n-max` 是每次最多起草几个 token，默认 3。v0.7.0 删除了旧的 `--draft`、`--draft-max`、`--draft-min`，沿用旧启动脚本会直接报错退出，要改成 `--spec-draft-n-max` / `--spec-draft-n-min`。n-gram 类方法不需要额外模型，在“输出大量重复输入内容”的任务（改写代码、按模板填表）上有效。草稿模型的词表必须和目标模型一致；收益取决于接受率，在本地单用户、Decode 受带宽限制的场景最明显，多并发时 GPU 已经忙起来，收益会下降。本机没有实测投机解码。

## 结构化输出：GBNF 与 JSON Schema

llama.cpp 用自己的语法描述语言 **GBNF** 约束输出，每一步把不符合语法的 token 屏蔽掉（机制见[第 18 篇](../llm-inference/18-vllm-sglang.md)“结构化输出”一节）。命令行用 `--grammar`、`--grammar-file`、`-j/--json-schema`；服务端更常用 OpenAI 的 `response_format`，JSON Schema 会被自动转成 GBNF。本机实测：

```bash
curl -s http://127.0.0.1:9931/v1/chat/completions -H 'Content-Type: application/json' -d '{
  "messages": [{"role": "user", "content": "出差报销：金额 320 元，类别 交通。按 JSON 输出。"}],
  "chat_template_kwargs": {"enable_thinking": false},
  "response_format": {"type": "json_schema", "json_schema": {"name": "claim", "schema": {
    "type": "object",
    "properties": {"amount": {"type": "number"}, "category": {"type": "string", "enum": ["交通", "住宿", "餐饮"]}},
    "required": ["amount", "category"]}}}
}'
# content: {"amount": 320, "category": "交通"}
```

仓库 `grammars/` 目录里有 JSON、算术表达式、C 语言等示例 GBNF。约束保证的是格式：`category` 一定是三个枚举值之一，但金额是否和发票一致仍要由业务代码校验；生成被 `max_tokens` 截断时，JSON 可能不完整。

工具调用依赖模型的对话模板，`llama-server` 默认用 Jinja 渲染模板（`--jinja` 默认开启），并按模型格式解析工具调用和思考内容（`--reasoning-format`，默认把思考放进 `reasoning_content`）。

## 嵌入、重排与多模态

同一个 `llama-server` 也能服务嵌入和重排模型，用于资料助手的检索环节：

```bash
llama-server -m bge-m3-Q8_0.gguf --embedding --pooling cls -ub 8192   # /v1/embeddings
llama-server -m bge-reranker-v2-m3-Q8_0.gguf --rerank                  # /v1/rerank
```

嵌入要求一条输入在一个物理批次内算完，所以 `-ub` 要不小于最长输入。v0.7.0 起，开启池化的嵌入模型会跳过语言模型输出头，显存占用最多降低一个数量级。

多模态（图像、音频输入）通过 **mtmd** 库实现：除了语言模型的 GGUF，还要一个“多模态投影器”文件（`mmproj-*.gguf`），负责把图片或音频编码成语言模型能接收的向量。用 `-hf` 下载时会自动带上 mmproj（`--mmproj-auto` 默认开启），本地文件则用 `--mmproj` 指定：

```bash
llama-server -m Qwen2.5-VL-7B-Q4_K_M.gguf --mmproj mmproj-Qwen2.5-VL-7B-f16.gguf
llama-mtmd-cli -m … --mmproj … --image invoice.jpg -p "提取发票金额"
```

图片通过 OpenAI 格式的 `image_url`（支持 base64）传入。投影器通常用 F16，不随主模型一起量化，显存要单独算。

## 多机：RPC 后端

RPC 后端让一台机器把自己的设备“借”给另一台：在每台工作机上运行 `ggml-rpc-server`（默认端口 50052），主机用 `--rpc 192.168.88.10:50052,192.168.88.11:50052` 把它们当作额外设备，模型按层分过去。v0.7.0 的 RPC 协议升到 v8，开始支持 `-sm tensor` 的张量并行。它适合把几台家用电脑的显存凑起来跑一个单机放不下的模型，层与层之间的数据走网络，速度明显低于单机。官方文档的警告要照做：**RPC 服务没有认证，不要在开放网络或敏感环境里运行**。需要真正的多机多卡服务时，应该考虑前三篇的引擎。

## 部署：容器、鉴权与监控

官方镜像在 `ghcr.io/ggml-org/llama.cpp`，`server` 标签只含 `llama-server`，另有 `server-cuda`（CUDA 12）、`server-cuda13`、`server-rocm`、`server-musa`、`server-vulkan` 等变体：

```bash
docker run --gpus all -p 9931:8080 -v /models:/models \
  ghcr.io/ggml-org/llama.cpp:server-cuda \
  -m /models/qwen3-8b-q4_k_m.gguf -c 32768 -ngl all --api-key "$LLAMA_API_KEY"
```

镜像里设置了 `LLAMA_ARG_HOST=0.0.0.0` 和 `LLAMA_ARG_PORT=8080`，所以**容器内仍是 8080**，并且监听所有地址；端口映射写错或直接用 `--network host` 时，服务会暴露在宿主机的网络上。大多数参数都有对应的 `LLAMA_ARG_*` 环境变量，便于在 Compose 或 K8s 里配置。

上线前检查这几项：

- **鉴权**：`--api-key` 设置一个或多个（逗号分隔）密钥，请求带 `Authorization: Bearer …`；`/health` 不检查密钥，可以给负载均衡探活。多用户、多租户的权限、限流放在前面的网关里做（[第 21 篇](../llm-inference/21-production.md)）。
- **CORS**：默认允许所有来源。本机开着服务时，任何网页都可以从浏览器里调用 `127.0.0.1:9931`，敏感环境要设置 API Key 或限制来源。
- **监控**：`--metrics` 打开 Prometheus 指标（默认关闭，未开启时 `/metrics` 返回 501）；`/slots` 默认开放，会暴露各槽的状态和采样参数，对外服务时用 `--no-slots` 关掉。
- **多模型**：`--models-dir` 进入 router 模式，一个服务管理一个目录里的多个模型，按请求的 `model` 字段加载，`--models-max`（默认 4）限制同时加载的数量。
- **TLS**：可以用 `--ssl-key-file`、`--ssl-cert-file`，但更常见的是放在反向代理后面。

`llama-server` 是单进程、单节点的服务，没有 vLLM 那样的分页 KV、块级前缀缓存、P/D 分离和多机并行。它适合内部工具、开发环境、边缘节点上少量并发的服务；资料助手的正式服务端在 H100 上同时服务几十个用户，仍应该用 vLLM 或 SGLang。

## 常见坑

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 升级后客户端连不上 8080 | v0.7.0 起默认端口改为 9931（容器内仍是 8080） | 显式写 `--port`，不依赖默认值 |
| 单个长请求被截断，但 `-c` 明明很大 | 显式写了 `-np`，每槽只有 `-c / np` | 去掉 `-np` 用统一 KV 池，或按“每槽长度 × 槽数”设 `-c` |
| 启动脚本报参数已移除 | `--draft-max` 等投机参数在 v0.7.0 移除；`--mlock`、`--no-mmap` 改为 `--load-mode` | 对照 `llama-server --help` 更新脚本 |
| 量化报 `requires an importance matrix` | IQ1/IQ2/IQ3_XXS 等低位类型必须 imatrix | 先跑 `llama-imatrix`，或改用 k-quants |
| 回答里出现 `<|im_end|>` 或角色错乱 | 对话模板缺失或不匹配，或用了 `/completion` 自己拼提示 | 用 `/v1/chat/completions`；必要时 `--chat-template-file` 指定模板 |
| 量化 V 后启动失败 | 量化 V 需要 Flash Attention，却写了 `-fa off` | 改回 `-fa auto` 或只量化 K |
| 显存放不下，速度骤降 | `--fit` 自动减少了 GPU 层数，部分层回到 CPU | 看启动日志的 `offloaded N/M layers`，换更小的量化或缩短上下文 |
| 速度忽快忽慢 | 机器上有其他负载，或 CPU 线程数多于性能核 | 测速时保持空闲，`-t` 设为性能核数 |
| 思考模型输出很长 | Qwen3 等默认开启思考 | 请求里 `chat_template_kwargs: {"enable_thinking": false}`，或 `--reasoning off` |

## 版本与变化

llama.cpp 长期只有 `b<编号>` 形式的标签，几乎每次合并到主干就发一个，至今仍然如此，现在它们在 GitHub 上标为预发布，相当于夜间版（10 月 27 日已到 b11946）。**2026 年 8 月起，项目开始发布语义化版本**：v0.1.0 标签打在 8 月 17 日，v0.2.0（8 月 21 日）的发布说明正式宣布 `vX.Y.Z` 是“稳定版，推荐下游分发和普通用户使用”，之后约两周一个小版本：v0.3.0（8 月 25 日）、v0.4.0（9 月 4 日）、v0.5.0（9 月 23 日）、v0.6.0（10 月 5 日）、v0.7.0（10 月 15 日）。正式版的发布页本身不附二进制，而是指向对应的夜间构建（v0.7.0 对应 b11669），所以下载的预编译包 `--version` 会显示 `0.7.0-dev (build 11669)`。ggml 同步改为语义化版本，v0.7.0 带的是 ggml v0.27.0。

v0.7.0 中和使用者关系最大的变化：

- `llama-server` 默认端口从 8080 改为 **9931**，Docker 镜像内保持 8080。
- 新增 `--moe-cache-mib`：MoE 专家放在主机内存时，在 GPU 上维护一块 LRU 缓存，官方说明专家卸载场景下 Decode 最高约快 2.2 倍，并支持多卡共享。
- 投机解码新增 LiliCorr（基于 DFlash 的候选选择）和 GLM5-Next 的 MTP；新增 `--spec-draft-n-ubatch` 单独设置草稿模型的批大小。
- 嵌入模型启用池化时跳过输出头，显存最多降低约 10 倍；提示缓存不再保存嵌入和重排请求的状态。
- 服务端对话层围绕 `common_chat_session` 重构，格式化后的对话输出从单个字符串改为分段数组；直接解析原生接口返回内容的程序需要回归。
- 网页界面新增模型管理器。

升级时固定版本号（容器镜像固定到摘要），保留旧版本的启动参数、模型文件和一组业务回归问题；对照 `--help` 检查参数是否改名或移除；先在测试环境跑通同一组请求，比较输出质量、Prompt/生成速度和内存占用后再替换。

llama.cpp 用 ggml 把同一份代码带到几乎所有硬件上，用 GGUF 把模型变成一个可以随处拷贝的文件，用丰富的量化类型和部分卸载让大模型挤进有限的内存；`llama-server` 再用槽位和连续批处理支撑少量并发。它的边界也同样清楚：单节点、按槽的粗粒度缓存，适合本地和边缘，不适合高并发的数据中心服务。很多人第一次接触它，其实是通过一个更省事的外壳。下一篇看 [Ollama](./06-ollama.md)：它在 llama.cpp 之上加了模型仓库、自动调度和常驻服务，这些便利各自有什么代价。
