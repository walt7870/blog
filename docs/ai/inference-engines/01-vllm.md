# 01. vLLM：从分页 KV 起家的通用推理引擎

资料助手第一次上线时，用的就是 vLLM：[实践篇](../llm-inference/vllm-quickstart.md)里一行 `vllm serve` 起了一个 OpenAI 兼容服务，日志告诉我们一张 H100 能放下几十万个 token 的 KV Cache。服务跑起来以后，问题变成了另一类：这一行命令背后到底启动了几个进程，CPU 要给多少核；同一份员工手册被几百人反复提问时，哪个模块在复用前缀；想加工具调用、JSON 输出、第二个 LoRA 适配器、投机解码，各自怎么配、会不会互相冲突；上了 Kubernetes 以后，探针、监控、鉴权由谁负责。

vLLM 出现的原因很直接。2023 年以前的推理服务按“最大可能长度”给每个请求预留 KV 显存，大部分预留空着，同时能服务的人很少。vLLM 把 KV Cache 切成固定大小的块按需分配（PagedAttention），再配上连续批处理，把吞吐提高了数倍。此后它逐步长成一个覆盖面最广的开源推理引擎：数百种模型架构，NVIDIA、AMD、Intel GPU 与 CPU，外加通过插件接入的 TPU、昇腾等硬件，以及量化、多 LoRA、结构化输出、投机解码、P/D 分离等几乎所有主流特性。

这一篇讲 vLLM 怎样实现和组织这些能力：先看它从论文到 V1 引擎的演进，再拆开一个 `vllm serve` 的进程结构，跟着一个请求走完全程；然后逐项讲调度器、KV 管理、模型执行和各项特性的用法与边界，最后是并行与多机、硬件插件、监控、生产部署、参数调优表和常见坑。安装、离线推理、调用接口、读启动日志和按报错排查显存问题，实践篇已经讲过，这里不重复。PagedAttention、连续批处理、前缀缓存这些机制本身，见推理系列的对应篇章。

本篇以 **vLLM 0.32.0**（2026 年 10 月 18 日发布）为准，参数名、默认值和行为都对照这个版本的源码与随版本发布的文档核对过。本站没有在 GPU 上运行文中的命令，涉及性能的地方只讲机制和判断方法，不给实测数字。

## 从一篇论文到 V1 引擎

vLLM 起源于加州大学伯克利分校的 Sky Computing 实验室。2023 年 6 月 20 日项目发布第一个版本，同年的 SOSP 论文提出 PagedAttention：把操作系统虚拟内存的分页思想用在 KV Cache 上，显存浪费从“大量预留空着”降到接近零，原理见[分页 KV 篇](../llm-inference/08-paged-attention.md)。之后两年，项目从“一个更快的推理库”变成了一个社区维护的通用引擎，治理上采用 Linux 基金会的项目治理结构。

功能快速堆叠的代价是架构负担。早期引擎（后来称为 V0）把调度、输入准备、输出处理放在同一个 Python 进程里，CPU 开销随批大小增长，很多特性是后来“挂”上去的，彼此组合时问题不断。于是项目重写了核心：

| 版本 | 时间 | 变化 |
| --- | --- | --- |
| 0.7.0 | 2025-01-27 | V1 引擎发布 alpha，需要设置 `VLLM_USE_V1=1` 打开；torch.compile 在 V1 中默认启用 |
| 0.8.0 | 2025-03-18 | 支持的场景默认使用 V1 |
| 0.10.0 | 2025-07-24 | 开始删除 V0 代码 |
| 0.11.0 | 2025-10-02 | V0 全部删除，V1 成为唯一引擎 |
| 0.23.0–0.29.0 | 2026-06 至 09 | Model Runner V2 逐步成为默认：先是部分稠密模型，0.25.0 覆盖所有稠密模型，0.29.0 覆盖所有模型 |

今天代码里仍能看到 `LLMEngine`、`AsyncLLMEngine` 这两个旧名字，但它们只是别名，分别指向 V1 的 `LLMEngine` 和 `AsyncLLM`。所以网上“vLLM V0 和 V1 怎么选”的讨论已经过时，现在只有 V1。

另一个容易混淆的名词是 **Model Runner V2**（MRV2）。它不是“vLLM V2 引擎”，而是 V1 引擎里 Worker 进程中执行模型那一层的重写：把“请求的持久状态”和“每一步的输入张量”分开，假设 GPU 执行与 CPU 准备天然重叠，不再需要旧实现里各种同步屏障。0.29.0 宣布旧的执行器（MRV1）进入弃用期，计划在 0.32 移除；实际在 0.32.0 里 MRV1 还在，作为 MRV2 尚不支持某些特性时的回退（下文“模型执行”一节细讲）。

项目大约每两周发一个正式版。2026 年 8 月以来依次是 0.28.0（08-26）、0.29.0（09-09）、0.30.0（09-22）、0.31.0（10-05）、0.32.0（10-18）。每版有数百个提交，默认值和不兼容变化经常出现，这是后文反复强调“固定版本、读发布说明”的原因。

## 一个 vllm serve 背后的进程

V1 的第一个设计决定是**多进程**：把处理 HTTP 和文本的工作、调度工作、GPU 计算放进不同进程，让它们在各自的 CPU 核上并行，避免 Python 全局解释器锁（GIL）让 GPU 等 CPU。

![vLLM V1 的进程结构：客户端经 HTTP 访问 API 服务进程，API 服务进程经 ZMQ 与 EngineCore 进程交换请求和输出，EngineCore 内有调度器、KV 缓存管理器和执行器，执行器经共享内存把调度结果广播给每张 GPU 上的 Worker 进程](/ai/inference-engines/vllm-architecture.svg)

以两卡张量并行为例，图中四类进程分工如下：

- **API 服务进程**。`vllm serve` 的主进程本身就是它（只有一个 API 服务进程时）。里面跑 FastAPI 和 `AsyncLLM`：请求进来时套对话模板、分词、加载和预处理图片音频、校验采样参数；输出回来时增量反分词、检查停止字符串、按 SSE 推给客户端。默认 1 个；开启数据并行（DP）时默认等于 DP 数，也可以用 `--api-server-count` 指定。
- **EngineCore 进程**。每个 DP rank 一个。它运行一个忙循环：取新请求、调度、让 Worker 执行一步、根据结果更新状态。调度器（Scheduler）、KV 缓存管理器（KVCacheManager）、结构化输出的语法状态都在这里。与 API 服务进程之间用 ZMQ 套接字通信，消息用 msgpack 序列化；收发由两个后台线程完成，序列化和网络 I/O 可以与 GPU 计算重叠。
- **Worker 进程**。每张 GPU 一个，总数等于 TP × PP（每个 DP rank）。Worker 负责加载自己那份权重、分配 KV 显存、运行 `GPUModelRunner` 做前向计算和采样。单机时执行器（Executor）用共享内存消息队列把每一步的调度结果广播给所有 Worker；TP 组内的卡之间用 NCCL 同步。
- **DP 协调进程**。只在 DP > 1 时存在，汇总各 rank 的排队和 KV 占用供负载均衡参考，MoE 模型下还要让所有 rank 的前向步调一致。

进程数可以直接算：API 服务进程数 + DP + GPU 数，DP > 1 时再加 1。`vllm serve -tp 4` 是 1 + 1 + 4 = 6 个进程；`-tp 2 -dp 4` 是 4 + 4 + 8 + 1 = 17 个。

这个数字直接决定 **CPU 配额**。官方给的下限是每个进程一个物理核，即至少 2 + N 个物理核；开了超线程的云主机按 vCPU 算要翻倍。EngineCore 是忙循环，对 CPU 争抢尤其敏感。一个常见的失败场景是：Kubernetes 里给单卡 vLLM Pod 限制了 2 个 vCPU，压测时 GPU 利用率只有一半，TTFT 随并发明显抖动，原因不在 GPU，而在分词、调度和流式输出抢不到 CPU。按 2 × (2 + N) 个 vCPU 起步，再按压测结果加。

0.32.0 的仓库里还有一个实验性的 **Rust 前端**（`rust/` 目录），用 Rust 重写 API 服务这一层，通过同样的 ZMQ 协议连接 Python 的 EngineCore，设置 `VLLM_USE_RUST_FRONTEND=1` 打开。官方说明它“尚未覆盖全部功能”，生产上先用默认的 Python 前端。

## 一个请求怎样流过 V1

把资料助手的一次提问放进这套进程里走一遍。员工问“年假怎么申请”，应用把系统提示和检索到的员工手册段落（套上对话模板后共 2,000 个 token）放在前面，再接上约 100 个 token 的问题，拼成一个 2,100 个 token 的输入。前 2,000 个 token 和几秒前另一位同事的请求完全相同。

![一个请求在 API 服务进程、EngineCore 进程和 Worker 进程之间推进的七个步骤，第三到第六步在每个引擎步重复](/ai/inference-engines/vllm-request-lifecycle.svg)

1. **渲染与分词**（API 服务进程）。`/v1/chat/completions` 收到 `messages`，按模型的对话模板渲染成文本，再分词得到 2,100 个 token id。多模态输入也在这里下载、解码和预处理。参数不合法（比如长度超过上限）的请求在这一步就被拒绝，不会占用引擎。
2. **入队**（EngineCore）。请求被打包成 `EngineCoreRequest`，经 ZMQ 发给 EngineCore，进入等待队列，状态为 `WAITING`。需要编译语法的结构化输出请求会先处于 `WAITING_FOR_STRUCTURED_OUTPUT_GRAMMAR`，P/D 分离下等待远端 KV 的请求处于 `WAITING_FOR_REMOTE_KVS`。
3. **调度**（EngineCore）。轮到这个请求时，KVCacheManager 按块计算前缀哈希，发现前 2,000 个 token（正好 125 个 16-token 块）已经在缓存里，直接复用这些块；为剩下的 100 个 token 分配新块，调度器把这 100 个 token 排进本步。
4. **前向计算**（Worker）。执行器把本步的调度结果广播给所有 Worker，模型执行器据此更新块表、拼出输入张量，运行模型；能用 CUDA Graph 的批直接重放录好的图。
5. **采样**（Worker）。拿到最后一个位置的 logits，结构化输出请求先乘上语法掩码，再按采样参数选出 1 个 token。
6. **更新状态**（EngineCore）。调度器根据结果推进请求的进度，检查是否遇到结束符、是否达到 `max_tokens` 或上下文上限。没结束就留在运行队列，下一步只需再推进 1 个 token，回到第 3 步。
7. **反分词与推送**（API 服务进程）。新 token 经 ZMQ 回到前端，`OutputProcessor` 增量反分词，检查停止字符串，以 SSE 推给客户端。如果命中停止字符串，前端会通知 EngineCore 中止这个请求；客户端断开连接时也一样。

第 6 步和第 7 步的分工值得记住：**结束符和长度限制在 EngineCore 判断，停止字符串在前端判断**。停止字符串需要看到完整文本，而文本只有反分词后才有，所以命中停止字符串后，引擎可能已经多算了一两步。请求结束后，它的块引用计数归零，满块连同哈希留在前缀缓存里，下一个相同开头的请求还能命中，直到显存紧张时按最近最少使用（LRU）被回收。

这条路径和推理系列[第 7 篇](../llm-inference/07-request-path.md)讲的一般链路一一对应，区别在于 vLLM 把它们分到了三个进程里。想从代码层面看一个最小引擎怎样把这些环节串起来，可以对照 [nano-vllm 篇](../llm-inference/13-nano-vllm.md)。

## 调度器：统一的 token 预算

V1 调度器的核心思想写在源码注释里：调度器里**没有“预填充阶段”和“解码阶段”**。每个请求只有两个数，已经算完的 token 数和应该算到的 token 数（输入 + 已生成 + 投机草稿）。每一步调度器分配 token，让前者去追后者。新请求要追 2,100 个，正在生成的请求每步只追 1 个，带投机草稿的追 1 + k 个。分块预填充、前缀缓存、投机解码都落在同一套记账里，不需要特殊分支。

每一步的规则是：

- **总预算** 是 `--max-num-batched-tokens`，同时在批里的请求数上限是 `--max-num-seqs`。
- **先排运行中的请求**，再从等待队列取新请求。运行中的请求大多是解码，每个只要 1 个 token，所以解码几乎总能排上，剩下的预算留给预填充。
- **长输入自动分块**。预算不够一次装下某个请求的全部输入时，只排一部分，下一步接着算，这就是分块预填充（原理见[分块预填充篇](../llm-inference/11-chunked-prefill.md)）。

用数字感受一下。H100 上 `vllm serve` 的默认预算是 8192 个 token。某一步有 200 个请求在解码，占 200 个 token；新来的 2,100 个 token 请求命中了 2,000 个前缀，只需算 100 个，也排得下；同一步还剩近 7,900 个 token，可以继续接纳别的新请求。如果新请求是一份 30,000 个 token 的长文档，它会被切成 4 步左右算完，每一步解码请求都照常推进，不会被长输入卡住。

几个和调度相关的设置：

| 设置 | 作用 | 0.32.0 默认 |
| --- | --- | --- |
| `--scheduling-policy` | `fcfs` 先来先服务；`priority` 按请求里的 `priority` 字段（越小越先），同级按到达时间 | `fcfs` |
| `--long-prefill-token-threshold` | 超过这个长度的输入每步最多排这么多，避免一个长请求吃掉整步预算 | 0，不限制 |
| `--async-scheduling` | 异步调度：GPU 执行第 N 步时，CPU 已经在准备第 N+1 步 | 自动开启，与少数特性冲突时关闭 |
| `--max-num-queued-reqs`、`--max-num-queued-tokens` | 在 API 服务进程里限制排队的请求数或待预填充的 token 数，超出直接返回 503，让上游换实例重试 | 不限制 |
| `--watermark` | 接纳新请求时保留的空闲块比例，减少反复抢占 | 0 |

**抢占**发生在 KV 块不够时：调度器给运行中的请求分配下一个块失败，就挑一个请求让出位置。FCFS 下挑运行队列里最后加入的那个，priority 策略下挑优先级数值最大的那个。被抢占的请求释放全部块，进度清零，放回等待队列的最前面，之后**重新计算**。V1 没有把 KV 换出到 CPU 内存的“swap”抢占模式，旧版本的 `--swap-space` 参数已经不存在。重算并不总是从头开始：被释放的满块如果还没被回收，重新调度时会作为前缀缓存命中。抢占频繁说明 KV 容量和并发不匹配，监控上看 `vllm:num_preemptions`。

**异步调度**在 0.32.0 默认打开，条件不满足时自动关闭并在日志里打一条警告：池化模型、使用 EAGLE/MTP/草稿模型/GPU n-gram 等之外的投机方法、执行器不支持、旧执行器配合流水线并行等。开启后 CPU 的调度和输入准备与 GPU 计算重叠，小模型、小批场景收益最明显。

一个容易被忽视的边界：分块预填充对生成模型是默认且“官方唯一支持”的模式。手动加 `--no-enable-chunked-prefill`，源码会警告这个模型“不正式支持关闭分块预填充，可能导致引擎崩溃或输出错误”。想限制长输入对解码的干扰，应该调 `--max-num-batched-tokens` 或 `--long-prefill-token-threshold`，而不是关掉分块。

## KV 缓存管理与前缀缓存

EngineCore 里的 KVCacheManager 只管“账”，真正的 KV 张量在 Worker 的显存里。账本的基本单位是**块**，默认每块 16 个 token。所有空闲块放在一个按 LRU 排序的双向队列里；分配时从队首取，释放时放回队尾，块上原有的哈希和内容并不立即清除。

前缀缓存就建立在这套账本上（机制见[前缀缓存篇](../llm-inference/10-prefix-cache.md)）：

- 每个**满块**算一个哈希，输入包括父块的哈希、本块的 token id，以及“额外键”：LoRA 适配器名、多模态输入的哈希与位置、`cache_salt`。所以同一段文字在不同 LoRA 下、或配了不同图片时不会误命中。
- 哈希形成一条链，一个块命中意味着它之前的所有块都相同。新请求从头逐块查表，查到第一个不命中的块为止。
- 只缓存满块。前缀长度不是 16 的整数倍时，最后半块要重算。
- 被引用的块不会被回收；引用计数为零的块留在空闲队列里“待命”，被重新分配时才真正失效。

默认哈希算法是 `sha256`，可以用 `--prefix-caching-hash-algo` 改成 `sha256_cbor`、`xxhash` 或 `xxhash_cbor`。xxhash 更快，但不是密码学哈希，理论上存在构造碰撞的可能。多租户共用一个实例时，前缀缓存还有一个隐患：命中会让首 token 更快，攻击者可以借时间差推测别人是否发过某段文本。请求里的 `cache_salt` 字段只放进第一个块的哈希，同一租户用同一个盐，不同租户之间就不会共享缓存。

几个与 KV 容量相关的选项：

| 选项 | 作用 |
| --- | --- |
| `--kv-cache-dtype` | KV 的存储类型，默认跟随模型。`fp8` 让 KV 占用减半，0.32.0 还支持 `nvfp4`、`int4_per_token_head` 等更低位格式，各自有硬件和后端限制，精度要自己评测（见[量化篇](../llm-inference/14-quantization.md)） |
| `--kv-cache-memory-bytes` | 直接指定每张卡的 KV 字节数，设置后忽略 `--gpu-memory-utilization` |
| `--kv-offloading-size` | 打开 KV 卸载到 CPU 内存，单位 GiB（TP > 1 时是各卡总和）；后端默认 vLLM 原生实现，也可选 `lmcache` |
| `--block-size` | 块大小，默认 16；一般不需要改，部分注意力后端和混合模型会自行调整 |

对滑动窗口注意力、Mamba 等混合结构的模型，V1 用“混合 KV 缓存管理器”给不同类型的层分组管理，窗口外的块可以提前释放。这部分对用户透明，遇到问题时可以用 `--disable-hybrid-kv-cache-manager` 退回统一分配来对比。

## 模型执行：MRV2、编译与 CUDA Graph

Worker 启动时依次完成：初始化设备并检查空闲显存是否够预算、加载权重、用假数据试跑一次测激活峰值、按剩余预算分配 KV、编译模型、录制 CUDA Graph。实践篇的“读懂启动日志”一节按这个顺序解释了每一行显存数字。

**Model Runner V2** 是 0.32.0 默认的模型执行器。它解决的是旧实现的几个结构性问题：旧实现直接把持久化的请求状态张量当作模型输入，请求一加入或退出就要搬动行，还得保留一份冗余的请求状态备份；异步调度是后加的，靠屏障防止 CPU 和 GPU 同时读写同一块内存。MRV2 给每个请求分配一个固定的状态行，每一步按本步顺序从状态里“收集”出输入张量；大张量（如块表）常驻 GPU，只把增量写过去；被抢占的请求当作结束处理，恢复时重新加入。官方设计文档也坦承它“功能尚未完备、测试还不充分”。

选择逻辑是：环境变量 `VLLM_USE_V2_MODEL_RUNNER` 显式设了就听它的；没设时默认用 MRV2，但缺少 Triton，或者用到 MRV2 还不支持的特性（如 `suffix`、`medusa`、`mlp_speculator`、自定义类这几种投机方法，异构词表的草稿模型）时，打印警告并回退旧执行器。反过来，预填充上下文并行、流水线并行加异步调度只有 MRV2 支持。排查“为什么换个投机方法性能就变了”时，先看日志里用的是哪个执行器。

**torch.compile 与优化级别**。vLLM 用 torch.compile 把模型编译成融合后的内核，再在其上录制 CUDA Graph（原理见[注意力算子与 CUDA Graph 篇](../llm-inference/12-attention-kernels.md)）。`-O` 参数一次性设定编译和图的组合：

| 级别 | 编译 | CUDA Graph | 适合 |
| --- | --- | --- | --- |
| `-O0` | 不编译 | 不录制 | 开发调试，启动最快，性能最低 |
| `-O1` | vLLM 编译 + 基础融合 | 分段（PIECEWISE） | 想快点启动又保留大部分性能 |
| `-O2`（默认） | 增加编译区间和融合 | 解码批用完整图，混合批用分段图（`FULL_AND_PIECEWISE`） | 生产 |
| `-O3` | 目前与 `-O2` 相同 | 同左 | 预留给更激进的优化 |

完整图把整个前向录成一张图，CPU 发射开销最小，但注意力这类形状随请求变化的算子要求后端支持；分段图在注意力处断开，其余部分录图，兼容性更好。默认对纯解码批用完整图、对含预填充的批用分段图，兼顾两者。录制的批大小上限默认是 `max_num_seqs × 2` 与 512 中的较小值（Blackwell 上为 1024），再不超过 `max_num_batched_tokens`；超过上限的批不走图。`--performance-mode interactivity` 会为 1 到 32 的每个批大小单独录图，减少小批时的填充开销；`throughput` 把未显式设置的 `max_num_seqs` 和 `max_num_batched_tokens` 翻倍。

编译和自动调优是启动慢的主要原因。编译结果缓存在 `~/.cache/vllm`（`VLLM_CACHE_ROOT`），容器部署时把它挂成卷，第二次启动可以复用。`--enforce-eager` 关掉 CUDA Graph，只适合排查问题。

**注意力后端**由平台按 GPU 架构和模型结构自动选择。非 MLA 模型在 Hopper、Ampere 上按 FlashAttention、FlashInfer、Triton、FlexAttention 的顺序尝试，在 Blackwell（SM100）上 FlashInfer 排第一；DeepSeek 这类 MLA 模型有 FlashMLA、FlashInfer-MLA、CUTLASS-MLA 等专用后端；AMD 上有 ROCm 和 AITER 系列。用 `--attention-backend` 可以强制指定，指定一个不支持当前模型或 KV 类型的后端会直接启动失败。0.32.0 删除了 cascade attention，`--disable-cascade-attn` 只会打印警告。

## 入口与接口

vLLM 有两种主要用法：Python 里的 `LLM` 类做离线批量推理，`vllm serve` 起在线服务。两者的用法、常用接口和采样参数默认值，实践篇已经逐项讲过。这里补充 0.32.0 服务端的全貌：

| 类别 | 接口 |
| --- | --- |
| OpenAI 兼容 | `/v1/chat/completions`、`/v1/completions`、`/v1/responses`、`/v1/models`、`/v1/embeddings`、`/v1/audio/transcriptions`、`/v1/audio/translations` |
| 其他厂商格式 | `/v1/messages`（Anthropic Messages）、`/cohere/v2/chat`、`/v2/embed`、`/v2/rerank` |
| 池化与打分 | `/pooling`、`/classify`、`/score`、`/v1/score`、`/rerank`、`/v1/rerank` |
| 原生生成 | `/inference/v1/generate`（输入输出都是 token id，适合上层自己做分词的系统） |
| 运维 | `/health`、`/ping`、`/metrics`、`/version`、`/server_info`、`/tokenize`、`/detokenize` |
| LoRA | `/v1/load_lora_adapter`、`/v1/unload_lora_adapter`（需开启运行时更新） |
| 开发与强化学习 | `/sleep`、`/wake_up`、`/reset_prefix_cache`、`/collective_rpc`、权重更新等，只有设置 `VLLM_SERVER_DEV_MODE=1` 才注册 |

最后一行要特别注意：开发模式会暴露 `/collective_rpc` 这类能在 Worker 上调用任意方法的接口，只能在可信网络里为强化学习、调试等用途打开。批量离线任务还可以用 `vllm run-batch` 读一个 OpenAI Batch 格式的 JSONL 文件逐条处理。

## 量化：读模型配置，按格式选内核

vLLM 支持的量化大致分三类（原理与取舍见[量化篇](../llm-inference/14-quantization.md)）：

| 类别 | 0.32.0 中的方法名 | 说明 |
| --- | --- | --- |
| 预量化权重 | `awq`、`gptq`（及 `awq_marlin`、`gptq_marlin`、`humming` 等内核）、`compressed-tensors`、`modelopt`、`modelopt_fp4`、`modelopt_mxfp8`、`quark`、`torchao`、`inc`、`mxfp4`、`fp8`、`moe_wna16`、`experts_int8` | 模型仓库的配置里写了量化信息，vLLM 自动识别，一般不用写 `--quantization` |
| 加载时在线量化 | `fp8_per_tensor`、`fp8_per_block`、`fp8_per_channel`、`mxfp8`、`int8_per_channel_weight_only`、`nvfp4_per_token` | 拿 BF16 模型加载时转换，不需要校准数据 |
| KV Cache 量化 | `--kv-cache-dtype fp8` 等 | 与权重量化独立 |

几个要点：

- `compressed-tensors` 是 LLM Compressor 产出的格式，覆盖 FP8 W8A8、INT8 W8A8、INT4 W4A16 等常见方案，是官方推荐的量化工具链；NVIDIA 的 ModelOpt 产出 FP8、NVFP4 格式，适合 Hopper 和 Blackwell。
- 同一种格式会根据 GPU 选不同内核，比如 GPTQ/AWQ 在 Ampere 及以后的卡上走 Marlin 或 Humming 等高性能内核（0.32.0 起 Hopper 上优先 Humming）。`--linear-backend` 可以统一指定线性层后端。
- **GGUF 和 bitsandbytes 已经移出主包**，分别由 `vllm-gguf-plugin`、`vllm-bnb-plugin` 两个插件提供，需要单独安装。官方文档对 GGUF 的定位是“高度实验性、优化不足”，主要用来省显存；本地量化模型的主场在 [llama.cpp](./05-llama-cpp.md)。
- `fbgemm_fp8`、`fp_quant` 已标为弃用；旧写法 `--quantization fp8` 用于在线量化时也会打印弃用警告，改用 `fp8_per_tensor` 或 `fp8_per_block`。

## 多 LoRA：一个基座服务多个适配器

资料助手要给人事和法务部门各配一个微调过的 LoRA 适配器，基座模型共用一份：

```bash
vllm serve Qwen/Qwen3-8B --max-model-len 16384 \
  --enable-lora --max-loras 4 --max-lora-rank 64 \
  --lora-modules hr=/models/lora/hr legal=/models/lora/legal
```

请求里把 `model` 写成 `hr` 或 `legal` 就会使用对应适配器，写基座模型名则不用适配器。同一批里可以混着不同适配器的请求，vLLM 用专门的批量 LoRA 内核一次算完。几个参数的含义：`--max-loras`（默认 1）是同一批里最多同时激活几个适配器，决定显存里预留的槽位；`--max-lora-rank`（默认 16，可选 1、8、16、32、64、128、256、320、512）要不小于所有适配器的秩，设大了浪费显存；`--max-cpu-loras` 是 CPU 内存里缓存几个，不设置时等于 `--max-loras`。

需要在运行时增删适配器时，设置环境变量 `VLLM_ALLOW_RUNTIME_LORA_UPDATING=True`，再调用 `/v1/load_lora_adapter`、`/v1/unload_lora_adapter`。这两个接口能让调用者加载任意路径的文件，同样只应在内网开放。适配器多、切换频繁的平台，可以看第 08 篇介绍的 AIBrix 等控制面怎样统一管理。前缀缓存的哈希包含 LoRA 名，不同适配器之间不会共享缓存。

## 结构化输出

结构化输出在采样前用语法掩码屏蔽不合法的 token，原理见[第 18 篇](../llm-inference/18-vllm-sglang.md#结构化输出-每一步都在限制选择)。vLLM 在 OpenAI 接口里通过 `extra_body` 的 `structured_outputs` 字段接收约束，支持 `choice`（枚举）、`regex`、`json`（JSON Schema）、`grammar`（上下文无关文法）和 `structural_tag`；标准的 `response_format` 也可用。

```python
completion = client.chat.completions.create(
    model="Qwen/Qwen3-8B",
    messages=[{"role": "user", "content": "从这段请假申请里提取员工姓名和天数：……"}],
    extra_body={"structured_outputs": {"json": {
        "type": "object",
        "properties": {"name": {"type": "string"}, "days": {"type": "integer"}},
        "required": ["name", "days"],
    }}},
)
```

后端可选 `xgrammar`、`guidance`、`outlines`、`lm-format-enforcer`，默认 `auto`：先用 xgrammar，Schema 里有它不支持的特性就换 guidance，再不行换 outlines。用 `--structured-outputs-config.backend` 可以固定一个后端。0.32.0 起嵌套超过 64 层的 JSON Schema 会直接返回 400，防止恶意 Schema 拖垮服务。

结构化输出保证的是格式，不是内容。上面例子里的 `days` 一定是整数，但是否等于申请里写的天数，仍要由业务代码核对。输出被 `max_tokens` 截断时，JSON 不完整，`finish_reason` 是 `length`，这种结果要当作失败处理。

## 工具调用与推理模型解析

模型输出的工具调用和“思考过程”都只是文本，vLLM 用**解析器**把它们拆成 OpenAI 格式的结构化字段：

```bash
vllm serve Qwen/Qwen3-8B --max-model-len 16384 \
  --enable-auto-tool-choice --tool-call-parser hermes \
  --reasoning-parser qwen3
```

- `--enable-auto-tool-choice` 让模型在 `tool_choice: "auto"` 时自行决定是否调用工具，必须配合 `--tool-call-parser`。0.32.0 注册了 54 个工具解析器名，大多按模型家族命名（`llama3_json`、`mistral`、`deepseek_v3`、`qwen3_coder`、`openai` 等）。Qwen3 通用模型的模板沿用 Hermes 风格的 `<tool_call>` 标签，用 `hermes`；`qwen3_json` 目前就是它的别名。0.32.0 新增的 `hf` 解析器读取模型仓库里的 `response_template`，带这个模板的模型不再需要专用解析器。
- `--reasoning-parser` 把思考内容拆到 `reasoning_content`，最终回答留在 `content`，0.32.0 注册了 38 个。Qwen3 默认开启思考，可以在启动时用 `--default-chat-template-kwargs '{"enable_thinking": false}'` 全局关闭，单个请求再用 `chat_template_kwargs` 覆盖。`thinking_token_budget` 采样参数可以限制思考长度。
- 0.32.0 在启动时检查工具解析器与模型是否匹配，`parallel_tool_calls=false` 也会被强制执行。

解析器选错是最常见的问题：模型确实输出了工具调用，但客户端拿到的是一段普通文本。按模型卡或官方文档的推荐选择，换模型时一起换。和结构化输出一样，解析器只负责格式，工具参数是否合法、调用是否有权限，由调用工具的程序检查。

## 多模态、嵌入与重排

**多模态**。图像、视频、音频输入的模型（Qwen-VL 系列、LLaVA、Pixtral 等）用同一个 `vllm serve` 启动，消息里按 OpenAI 格式传 `image_url` 等内容。预处理在 API 服务进程里完成，每个进程默认有 4 GiB 的多模态处理缓存；视觉编码器在 Worker 上运行，结果放进编码器缓存。常用设置：`--limit-mm-per-prompt` 限制每个请求的图片或视频数量（同时影响启动时预留的显存），`--allowed-media-domains` 限定允许下载的媒体域名，防止服务端请求伪造（SSRF）。不限制域名时，用户可以让服务器去访问内网地址或云元数据接口。

**嵌入、分类与重排**。vLLM 有两种运行模式（runner）：`generate` 和 `pooling`。嵌入模型（GTE、E5 等）、重排模型、分类与奖励模型以 pooling 模式运行，暴露 `/v1/embeddings`、`/classify`、`/score`、`/rerank` 等接口；生成模型也可以用 `--convert embed` 或 `--convert classify` 包装成池化模型。池化模型默认关闭异步调度，前缀缓存和分块预填充是否开启取决于模型。资料助手的检索链路如果也要自建，嵌入模型和对话模型通常分成两个实例部署，各自调参数。

## 投机解码

投机解码用一个便宜的“起草者”一次猜多个 token，再让目标模型一步验证（原理见[投机解码篇](../llm-inference/15-speculative-decoding.md)）。vLLM 用 `--speculative-config` 传一个 JSON 配置：

```bash
# 不需要草稿模型：从输入里查找 n-gram 作为草稿
vllm serve Qwen/Qwen3-8B --max-model-len 16384 \
  --speculative-config '{"method": "ngram", "num_speculative_tokens": 4, "prompt_lookup_max": 4}'
```

0.32.0 支持的方法：

| 方法 | 草稿来源 | 适用 |
| --- | --- | --- |
| `eagle`、`eagle3` | 在目标模型隐藏状态上训练的小头 | 通用，收益高，需要对应的 EAGLE 权重 |
| `mtp` | 模型自带的多 token 预测层（DeepSeek、GLM、Qwen3-Next 等） | 模型原生支持时首选；各模型专用名（如 `deepseek_mtp`）已统一为 `mtp` |
| `draft_model` | 同词表的小模型 | 有合适小模型时 |
| `dflash`、`dspark` | 新的并行起草方法 | 依赖特定草稿权重，部分只在 MRV2 中实现 |
| `medusa`、`mlp_speculator` | 额外的预测头 | 有现成权重时 |
| `ngram`、`ngram_gpu`、`suffix` | 从输入或历史输出中匹配 | 无需额外模型，代码补全、改写等输出大量复用输入的场景 |
| `custom_class` | 自定义提案类 | 实验 |

两个判断要点。第一，投机解码改善的是低并发下的单请求延迟；并发高、GPU 已经算力饱和时，验证多余草稿的计算反而挤占吞吐，官方的方法选择表里，各方法在高 QPS 一列的收益普遍低于低 QPS 一列。第二，方法会影响其他特性：`suffix`、`medusa`、`mlp_speculator` 会让执行器回退到旧实现，EAGLE/MTP/草稿模型/GPU n-gram 之外的方法会关闭异步调度。开启后看 `vllm:spec_decode_*` 系列指标里的接受长度，接受率低于预期就换方法或减小 `num_speculative_tokens`。

## 睡眠模式与在线换权重

强化学习训练中，同一组 GPU 要在“生成样本”和“训练”之间来回切换。vLLM 的睡眠模式（`--enable-sleep-mode`，CUDA 与 ROCm 支持）让引擎不退出就释放显存：

- `sleep(level=1)`：权重拷到 CPU 内存，丢弃 KV Cache。适合醒来后继续用同一个模型。
- `sleep(level=2)`：权重和 KV 都丢弃。适合醒来后要加载新权重的场景，可以先 `wake_up(tags=["weights"])` 只恢复权重显存、原地更新权重，再 `wake_up(tags=["kv_cache"])`。

离线时直接调用 `LLM` 对象的方法；在线时对应的 `/sleep`、`/wake_up`、`/is_sleeping` 接口属于开发模式接口，需要 `VLLM_SERVER_DEV_MODE=1`。0.32.0 还加了从训练进程直接传输权重的一组接口和 `--sleep-preserve-parameter-names`（睡眠时保留冻结的参数）。这一块主要服务于 RL 框架，普通在线服务用不到。

## KV 连接器与 P/D 分离

KV 连接器是 vLLM 把 KV Cache 搬出自己显存的统一接口，用 `--kv-transfer-config` 配置。它支撑三类用途：把 KV 卸载到 CPU 内存或外部存储，扩大前缀缓存的容量；在多个实例之间共享前缀缓存；P/D 分离，把预填充和解码放在不同实例上（原理与取舍见 [P/D 分离篇](../llm-inference/17-pd-disaggregation.md)）。

0.32.0 注册的连接器：

| 连接器 | 用途 |
| --- | --- |
| `NixlConnector`（及 `NixlPullConnector`、`NixlPushConnector`） | 基于 NVIDIA NIXL 库的点对点 KV 传输，默认走 UCX，可选 LIBFABRIC 等；P/D 的主力 |
| `MooncakeConnector`、`MooncakeStoreConnector` | Mooncake 传输引擎与分布式 KV 存储 |
| `LMCacheConnectorV1`、`LMCacheMPConnector` | LMCache 多级缓存（CPU、磁盘、远端） |
| `OffloadingConnector`、`SimpleCPUOffloadConnector` | vLLM 原生的 CPU（及文件系统）卸载 |
| `MoRIIOConnector` | AMD ROCm 上的传输 |
| `FlexKVConnectorV1`、`HF3FSKVConnector` | 其他分布式 KV 存储 |
| `MultiConnector` | 按顺序组合多个连接器，比如 NIXL 做 P/D 的同时再卸载到 CPU |

每个实例声明自己的角色 `kv_role`：`kv_producer`（产出 KV，即预填充）、`kv_consumer`（消费 KV，即解码）或 `kv_both`。用 NIXL 在一台机器的两张卡上搭 P/D，按官方文档是这样（未在 GPU 上实测）：

```bash
# GPU 0：预填充实例
CUDA_VISIBLE_DEVICES=0 VLLM_NIXL_SIDE_CHANNEL_PORT=5600 \
vllm serve Qwen/Qwen3-8B --port 8100 \
  --kv-transfer-config '{"kv_connector":"NixlConnector","kv_role":"kv_producer"}'

# GPU 1：解码实例
CUDA_VISIBLE_DEVICES=1 VLLM_NIXL_SIDE_CHANNEL_PORT=5601 \
vllm serve Qwen/Qwen3-8B --port 8200 \
  --kv-transfer-config '{"kv_connector":"NixlConnector","kv_role":"kv_consumer"}'
```

两个实例前面还需要一个代理：先把请求发给预填充实例，拿到它返回的 `kv_transfer_params`，再把请求连同这些参数发给解码实例，后者从预填充实例直接拉取 KV。仓库里只有一个用于测试的玩具代理脚本，生产上这部分由 llm-d、Dynamo 等编排层承担（见[第 08 篇](./08-orchestration.md)）。

决定要不要上 P/D 前，先读官方文档的两句话：这个功能**仍是实验性的**；P/D 分离**不提高吞吐**，它的价值是把 TTFT 和 ITL 分开调、压住解码的尾延迟。资料助手如果只有一两张 H100、问答输入不长，分块预填充已经能把干扰控制住，上 P/D 只会多一跳网络和一个代理。超长输入多、对解码延迟有严格指标、而且有 RDMA 网络时才值得评估。传输失败时的行为由 `kv_load_failure_policy` 决定，默认 `fail` 直接报错，可改为 `recompute` 在本地重算。

## 并行与多机

vLLM 支持的并行方式和参数，实践篇已经列过表；原理在[分布式推理篇](../llm-inference/16-distributed.md)。这里讲它们在 vLLM 里怎样落地。

**执行器后端**决定 Worker 怎样启动和通信，参数是 `--distributed-executor-backend`：

- `mp`：Python 多进程，单机默认。0.32.0 下跨机也可以用 `mp`：主节点 `--nnodes 2 --node-rank 0 --master-addr <主节点 IP>`，其他节点加 `--node-rank 1 ... --headless`（不起 API 服务）。
- `ray`：用 Ray 集群调度 Worker。Ray 现在是可选依赖，需要自己安装（官方示例为 `pip install "ray[cgraph]"`）；已经在 Ray placement group 里运行，或指定 `--data-parallel-backend ray` 时会自动选它。官方提供 `run_cluster.sh` 在多台机器上用容器拉起 Ray 集群，Kubernetes 上可以用 KubeRay。
- `uni`：单卡单进程；`external_launcher`：由 torchrun 等外部工具启动，主要给训练框架嵌入用。

一个常见的多机组合是机内张量并行、机间流水线并行：两台 8 卡机器跑一个放不下单机的模型，`--tensor-parallel-size 8 --pipeline-parallel-size 2`。所有节点的环境必须一致（模型路径、Python 包版本），用同一个容器镜像最省事。

**数据并行**在 vLLM 里有两种部署方式。内部负载均衡：`--data-parallel-size 4` 起一个入口，API 服务进程按各 rank 的排队和 KV 占用分发请求，跨机时其他节点用 `--headless --data-parallel-start-rank` 加入；外部负载均衡：每个 rank 单独暴露端口，由上层路由器分配。对于能放进一张卡的稠密模型，DP 的效果和“起几个独立副本、前面挂负载均衡”差不多，后者在 Kubernetes 上更好管理。DP 真正不可替代的场景是 **MoE 模型**：注意力部分用 DP，专家部分用专家并行（`--enable-expert-parallel`，EP 规模 = TP × DP），所有 rank 每一步必须一起前向，没有请求的 rank 也要跑空步，DP 协调进程就是为此存在的。专家间的 all-to-all 通信用 `--all2all-backend` 选择，默认 `allgather_reducescatter`，多机预填充可选 DeepEP 高吞吐模式，解码可选低延迟模式；`--enable-eplb` 打开专家负载均衡。

**上下文并行**分为预填充上下文并行和解码上下文并行（`--prefill-context-parallel-size`、`--decode-context-parallel-size`），用于百万 token 级的超长上下文，前者只有 MRV2 支持。

多机部署有一条安全底线：vLLM 节点之间的通信（PyTorch 分布式、KV 传输、DP 控制消息）**默认不加密**，其中部分消息的格式被恶意构造后可以导致代码执行。所有节点要放在隔离的私有网络里，`VLLM_HOST_IP` 设成私网地址，相关端口（如 KV 传输默认 14579、DP 主节点默认 29500）不能对外开放。

## 硬件平台与插件

主仓库直接支持的平台是 NVIDIA CUDA、AMD ROCm、Intel XPU（GPU）和 CPU（x86、ARM、Apple Silicon、IBM Z、PowerPC）。其余硬件通过**平台插件**接入：插件以 Python 包的形式在 `vllm.platform_plugins` 入口注册自己的平台类，替换设备初始化、注意力后端和自定义算子，引擎的调度和接口保持不变。

| 硬件 | 方式 | 0.32.0 时的状态 |
| --- | --- | --- |
| NVIDIA GPU | 主仓库 | 计算能力 7.5 及以上；PyPI 的 0.32.0 轮子按 CUDA 13.0 编译（需要 R580 及以上驱动），另有 CUDA 12.9 版本的轮子和镜像 |
| AMD GPU | 主仓库 | 专用的轮子索引和 `vllm/vllm-openai-rocm` 镜像；0.32.0 起 ROCm 也默认用 MRV2 |
| Intel GPU | 主仓库 | 专用索引和 `vllm/vllm-openai-xpu` 镜像 |
| CPU | 主仓库 | `vllm/vllm-openai-cpu` 镜像，适合测试和小模型 |
| Google TPU | 官方插件 `tpu-inference` | 主仓库的 TPU 平台只是转到该包；最新 v0.32.0（2026-10-23） |
| 华为昇腾 | 官方插件 `vllm-ascend` | 最新正式版 v0.23.0.post1（2026-09-22），之后只有 0.30.0rc2 等预发布 |
| Apple Silicon GPU | 官方插件 `vllm-metal`（基于 MLX） | 最新 v0.32.0（2026-10-21） |
| Intel Gaudi、IBM Spyre、AWS Neuron | 官方插件 `vllm-gaudi`、`vllm-spyre`、`vllm-neuron` | 各自发版 |
| 沐曦、昆仑芯、摩尔线程等 | 厂商维护的插件 | 各自发版 |

插件的版本号通常跟随 vLLM 主版本，一个插件版本只对应一个 vLLM 版本。上表昇腾的例子说明插件可能落后主线好几个版本：在昇腾上部署时，能用的 vLLM 版本由插件决定，主线新加的特性和修复要等插件跟上。选型时把“目标模型 × vLLM 版本 × 插件版本 × 需要的特性”作为一个整体去核对，不要假设主线文档里的功能在插件上都可用。

## 可观测性

`/metrics` 以 Prometheus 格式暴露指标，名字统一带 `vllm:` 前缀，标签里有 `model_name` 和引擎编号。计数器在暴露时自动加 `_total` 后缀，例如 `vllm:prompt_tokens` 抓取后是 `vllm:prompt_tokens_total`。下面是最常用的一组：

| 指标 | 类型 | 怎么用 |
| --- | --- | --- |
| `vllm:num_requests_running`、`vllm:num_requests_waiting` | 当前值 | 等待数持续上升说明容量不够，是扩容和限流的首要信号 |
| `vllm:kv_cache_usage_perc` | 当前值 | KV 使用率，1 表示 100%；长期接近 1 时会出现抢占 |
| `vllm:num_preemptions` | 计数 | 抢占次数，非零且持续增长要加 KV 或降并发 |
| `vllm:prefix_cache_queries`、`vllm:prefix_cache_hits` | 计数 | 两者相除得前缀命中率（按 token 计） |
| `vllm:time_to_first_token_seconds` | 直方图 | TTFT 分布，算 P50/P99 |
| `vllm:inter_token_latency_seconds`、`vllm:request_time_per_output_token_seconds` | 直方图 | 逐 token 间隔与单请求平均每 token 时间 |
| `vllm:e2e_request_latency_seconds`、`vllm:request_queue_time_seconds` | 直方图 | 端到端时间、排队时间；排队占比高说明瓶颈在容量而非计算 |
| `vllm:request_prefill_time_seconds`、`vllm:request_decode_time_seconds` | 直方图 | 预填充、解码各花了多久 |
| `vllm:prompt_tokens`、`vllm:generation_tokens` | 计数 | 输入输出吞吐 |
| `vllm:request_success` | 计数 | 按 `finished_reason` 分的完成数，`length` 占比高说明上限设小了或模型停不下来 |
| `vllm:admission_rejections` | 计数 | 因排队上限被拒的请求，0.32.0 新增 |
| `vllm:lora_requests_info` | 当前值 | 正在运行和等待的 LoRA 适配器 |

TTFT、TPOT、ITL 的定义差异和怎样用分位数，见[指标篇](../llm-inference/05-metrics.md)与[压测篇](../llm-inference/20-benchmark.md)；`vllm bench serve` 是 vLLM 自带的压测工具。仓库的 `examples/observability` 里有 Prometheus + Grafana 的示例面板。需要逐请求链路追踪时，用 `--otlp-traces-endpoint` 把 OpenTelemetry 追踪发到收集器。日志方面，逐请求日志默认关闭，排查问题时用 `--enable-log-requests` 打开（INFO 级别记录请求编号和参数，DEBUG 级别连输入内容一起记录，后者会把用户提问写进日志，要注意隐私）；周期性的吞吐统计日志默认开启，可用 `--disable-log-stats` 关闭。0.32.0 新增了 JSON 格式的日志格式化器，便于接入日志系统。

## 生产部署

**容器**。官方镜像是 `vllm/vllm-openai`，入口命令就是 `vllm serve`，镜像名后面直接接模型和引擎参数。0.32.0 的标签包括 `v0.32.0`（CUDA 13.0）、`v0.32.0-cu129`（CUDA 12.9，给驱动较旧的主机）、`-ubuntu2404` 变体，以及 ROCm、CPU、XPU 各自的镜像。

```bash
docker run --gpus all --ipc=host \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  -v vllm-cache:/root/.cache/vllm \
  -p 127.0.0.1:8000:8000 \
  vllm/vllm-openai:v0.32.0 \
  Qwen/Qwen3-8B --max-model-len 16384
```

- `--ipc=host`（或足够大的 `--shm-size`）是必需的，多进程之间靠共享内存交换数据。
- 挂载 `~/.cache/vllm` 保存编译缓存，第二次启动可以跳过 torch.compile。
- 端口只映射到本机回环地址，由同机的网关对外提供服务。vLLM 自身**默认监听所有网卡**（不指定 `--host` 时绑定空地址），放在容器里尤其要注意宿主机的端口映射。
- 固定到具体版本标签，最好再固定镜像摘要，不要用 `latest`。

**Kubernetes**。官方的原生部署示例有几个要点：用 `emptyDir`（`medium: Memory`）挂到 `/dev/shm`；资源里申请 `nvidia.com/gpu`；存活和就绪探针都打 `/health`，初始延迟设 60 秒。实际启动时间取决于模型下载、编译和 CUDA Graph 录制，大模型可能要几分钟，探针延迟过短会让 Pod 在启动途中被反复杀掉，建议用 startupProbe 兜住启动阶段。CPU 和内存按前面的进程数配足；模型文件放在 PVC 或节点本地缓存，避免每个 Pod 都从 Hugging Face 下载。

**引擎之上的一层**。单个 vLLM 实例不负责跨副本的路由、扩缩容和 P/D 编排。vLLM 文档列出了一长串集成方案，定位可以这样区分：

- **vLLM production-stack**：vLLM 项目的参考部署，一个 Helm chart 打包引擎、路由器和 Grafana 面板，与 LMCache 集成，适合想快速在 Kubernetes 上搭起多副本服务的团队。
- **llm-d**：Kubernetes 原生的分布式推理栈，以 vLLM 为主要引擎，基于 Gateway API 推理扩展做前缀感知路由和 P/D 编排，2026 年 10 月发布 1.0。
- **NVIDIA Dynamo**、**AIBrix**、**KServe**、**KubeRay** 等：分别从 NVIDIA 全栈、控制面、通用模型服务和 Ray 生态的角度接入 vLLM。

这些项目的拓扑、取舍和与引擎版本的绑定关系，见[第 08 篇](./08-orchestration.md)。

**安全**。生产上要叠加几层，而不是依赖引擎自身：

1. vLLM 的 `--api-key` 只检查 `/v1`、`/v2`、`/inference`、`/cohere` 开头的路径，`/metrics`、`/tokenize` 等不受保护（实践篇有详细说明）。对外服务一律放在网关后面，由网关做鉴权、限流和 TLS（[生产部署篇](../llm-inference/21-production.md)）。
2. 不在公网环境打开 `VLLM_SERVER_DEV_MODE`、`VLLM_ALLOW_RUNTIME_LORA_UPDATING`。
3. 多模态服务设置 `--allowed-media-domains`；0.32.0 起不受信的图片只允许光栅格式。
4. 0.32.0 起默认不允许任何跨域来源，浏览器直连需要显式设置 `--allowed-origins`；更好的做法仍是浏览器只访问自己的后端。
5. 只对可信模型开启 `--trust-remote-code`，并固定版本。

## 关键参数调优表

下表列出最常调整的引擎参数，默认值取自 0.32.0 源码。“H100 服务”指显存 70 GiB 以上的非 A100 卡上运行 `vllm serve`。

| 参数 | 默认值 | 什么时候调 | 代价或副作用 |
| --- | --- | --- | --- |
| `--max-model-len` | 模型配置的最大长度 | 业务最长输入 + 输出明显短于模型上限时调小 | 太小会拒绝长请求；不改变 KV 总量 |
| `--gpu-memory-utilization` | 0.92 | 同卡还有其他进程时调低；KV 不够时调高 | 太高可能在运行时因激活峰值 OOM |
| `--kv-cache-memory-bytes` | 不设置 | 需要精确控制 KV 大小时 | 设置后忽略上一项 |
| `--max-num-seqs` | H100 服务 1024；显存较小的卡与 A100 为 256 | 想限制解码批大小、压低 TPOT 时调小 | 并发上限降低；也决定 CUDA Graph 录制范围 |
| `--max-num-batched-tokens` | H100 服务 8192（离线 16384）；≥160 GiB 的卡 16384；其他卡服务 2048 | 吞吐优先调大，TTFT/尾延迟优先调小 | 调大使激活峰值上升，KV 变少，单步变长 |
| `--long-prefill-token-threshold` | 0（不限） | 长短请求混合、短请求 TTFT 被长输入拖累时 | 长输入的 TTFT 变长 |
| `--performance-mode` | `balanced` | 低并发交互选 `interactivity`，批处理选 `throughput` | 前者启动更久，后者单请求延迟更高 |
| `-O` / `--optimization-level` | 2 | 开发调试用 0 或 1 加快启动 | 降级后性能下降 |
| `--enforce-eager` | 关闭 | 只在排查 CUDA Graph 相关问题时打开 | 小批解码明显变慢 |
| `--enable-prefix-caching` | 生成模型开启 | 几乎不需要关；多租户隔离用 `cache_salt` | 关闭后共享前缀要重算 |
| `--kv-cache-dtype` | `auto` | KV 不够、上下文很长时试 `fp8` | 需评测精度；部分后端不支持 |
| `--kv-offloading-size` | 不启用 | 前缀复用多但显存装不下时，卸载到 CPU | 占用主机内存（容器内计入内存限额） |
| `--scheduling-policy` | `fcfs` | 需要区分请求优先级时用 `priority` | 低优先级请求可能被频繁抢占 |
| `--max-num-queued-reqs` / `--max-num-queued-tokens` | 不限 | 希望过载时快速返回 503、让上游换实例 | 需要上游有重试逻辑 |
| `--stream-interval` | 1 | 高并发流式、CPU 吃紧时调大，几个 token 推一次 | 流式输出变得不够平滑 |
| `--api-server-count` | 1，DP 时等于 DP | 短请求极多、前端 CPU 成瓶颈时增加 | 每个进程多占 CPU 和多模态缓存 |
| `--tensor-parallel-size` / `--data-parallel-size` | 1 / 1 | 放不下用 TP，放得下优先多副本或 DP | TP 引入卡间通信 |
| `--speculative-config` | 不启用 | 低并发、延迟敏感 | 高并发时可能降低吞吐 |
| `--max-loras` / `--max-lora-rank` | 1 / 16 | 同批需要多个适配器、适配器秩更大时 | 预留显存增加 |

调参的顺序建议是：先用 `--max-model-len` 定下业务上限，看启动日志里的 KV 容量与最大并发；用接近真实分布的数据压测，观察等待数、KV 使用率、抢占和 TTFT/TPOT 分位数；再根据瓶颈在“排队”“抢占”还是“单步太慢”调整上面的参数。一次只改一个，前后用同一份压测数据对比。

## 限制与常见坑

- **默认监听所有网卡且不鉴权**。不加 `--host` 时 vLLM 绑定所有网卡，`--api-key` 也只覆盖部分路径。在有公网地址的云主机上直接 `vllm serve`，等于把模型和 `/metrics` 暴露在外。只在本机测试时显式加 `--host 127.0.0.1`。
- **CPU 不够**。进程数随 TP、DP 增长，GPU 利用率上不去时先查 CPU 配额，而不是先调引擎参数。
- **特性组合会悄悄降级**。某些投机方法会关闭异步调度、让执行器回退到旧实现；某些注意力后端不支持某种 KV 类型。每个特性单独可用，组合起来不一定是最快路径。上线前读一遍启动日志里的警告，并对“模型 × 量化 × 投机 × 结构化输出 × 并行方式”的实际组合做回归。
- **抢占是重算**。KV 紧张时被抢占的请求要重新计算，延迟陡增但不会报错。`vllm:num_preemptions` 是比 OOM 更早的预警。
- **不要关分块预填充**。对生成模型这不是受支持的配置。
- **P/D 分离不提吞吐**，而且仍是实验性功能；它需要外部代理或编排层，单机小规模部署通常得不偿失。
- **GGUF、bitsandbytes 要装插件**，且官方定位为实验性。追求本地量化的生态，用 llama.cpp 更合适。
- **硬件插件版本落后**。昇腾等平台能用的 vLLM 版本由插件决定，主线文档里的新特性不一定可用。
- **启动慢**。编译、自动调优和 CUDA Graph 录制可能让大模型启动几分钟。挂载编译缓存，安装后运行一次 `vllm download-kernels`，用 `vllm preload` 预热，探针给足时间。
- **默认采样参数来自模型**。在线服务里请求没写的采样参数取模型 `generation_config.json` 的推荐值（实践篇有详细说明），换模型后输出风格变化往往源于此。
- **多机通信不加密**。节点必须在隔离网络里。
- **开发模式接口**。`VLLM_SERVER_DEV_MODE=1` 会暴露可以在 Worker 上执行方法的接口，只能在可信环境使用。

一个具体的不适用场景：资料助手的另一个团队想在员工笔记本（Apple Silicon，24 GB 统一内存）上离线跑一个 8B 模型。主线 vLLM 在 macOS 上只有 CPU 支持；Apple GPU 要装 `vllm-metal` 插件，它基于 MLX，功能范围跟主线不同。这种单用户、本地优先、需要量化到 4 位的场景，[llama.cpp](./05-llama-cpp.md)、[Ollama](./06-ollama.md) 或 [MLX-LM](./07-local-and-edge.md) 更直接；vLLM 的优势在多用户并发的服务端。

## 版本与变化

当前正式版是 **0.32.0**（2026 年 10 月 18 日），要求 Python 3.11 到 3.14，PyPI 轮子依赖 PyTorch 2.13.0、CUDA 13.0。这一版的不兼容变化和需要注意的地方：

- **Python 3.10 不再支持**；`transformers` 要求 5.16.1 及以上、5.20.0 以下，`tokenizers` 0.23.2 及以上。和其他库装在同一环境时容易冲突，所以官方一直建议用全新环境。
- **`max_tokens` 改为纯上限**。以前它会从上下文窗口里“预留”，输入加 `max_tokens` 超过上下文就拒绝请求；现在只是输出的上限，长输入不再被拒，但输出可能因上下文用完而提前截断，要检查 `finish_reason`。
- **CORS 默认收紧**：从允许所有来源改为不允许，浏览器直连要设 `--allowed-origins`。
- **删除的功能**：cascade attention、torch.compile 的序列并行与 AsyncTP 编译过程、`mamba_cache_mode="all"`、LoRA 的 Tensorizer 支持，以及之前已弃用的 `AsyncLLM.pause_generation()` 等接口。
- **Responses 接口**的推理流事件改名为 `response.content_part.added/done`（`part.type="reasoning_text"`），流式解析思考内容的客户端要同步修改。
- **新默认**：共享内存张量区（多模态大张量一次拷贝广播给 Worker）默认开启；ROCm 默认使用 MRV2；GLM-5.x 在 Blackwell 上默认 FP8 KV。
- **安全修复**：对话模板静态校验并限时渲染、分词器边界错误、P2P ZMQ 连接耗尽等三个安全公告，图片格式白名单，多模态共享内存句柄签名，JSON Schema 深度限制。
- **新增**：`vllm download-kernels` 预装 FlashInfer 算子，`hf` 通用工具与推理解析器，`vllm:admission_rejections` 等指标，多 API 服务进程时按最少负载分配连接。

升级的一般做法：先读发布说明里的“Breaking Changes”和安全公告，再看性能改进；在新环境里装新版本，用同一份评测集和压测数据对比质量与 TTFT/TPOT 分位数；保留旧版本的镜像摘要以便回退。使用插件或编排层（如 Dynamo 1.6.1 锁定 vLLM 0.31.0）时，vLLM 的版本跟着它们走，不能单独升级。

## 总结

vLLM 的 V1 引擎把一个推理服务拆成三层进程：API 服务进程处理文本和协议，EngineCore 用统一的 token 预算做调度、用块哈希链管理前缀缓存，Worker 用 MRV2、torch.compile 和 CUDA Graph 把每一步算快。几乎所有特性，包括分块预填充、前缀缓存、投机解码、结构化输出、多 LoRA、KV 连接器，都是挂在这条“调度一步、执行一步”的循环上的不同环节。理解了这条循环，就能读懂启动日志和监控指标，判断一个参数会影响哪一段，也能看出哪些特性组合会互相牵制。

它的长处是覆盖面：模型、硬件、量化格式和接口都最全，社区迭代最快；对应的代价是默认值和行为随版本变化频繁，硬件插件和编排层的版本要一起管理，实验性功能（P/D 分离、MRV2 的部分路径、Rust 前端）上线前要单独验证。

同样以前缀复用为核心、但用基数树组织缓存，并在调度上做了更多重叠的另一个主流引擎，是下一篇的 [SGLang](./02-sglang.md)。
