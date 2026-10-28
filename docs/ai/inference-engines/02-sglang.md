# 02. SGLang：从基数树缓存长成的大规模推理引擎

资料助手的请求有一个明显的特点：几乎每个请求都以同一段系统提示和几千个 token 的员工手册开头，多轮对话还会把前几轮原样带上。[前缀缓存篇](../llm-inference/10-prefix-cache.md)讲过，这类负载的大部分 Prefill 都是重复计算。SGLang 正是从“怎样让共享前缀只算一次”这个问题起家的：它的论文提出了 RadixAttention，用一棵基数树管理所有请求的 KV Cache。几年下来，它已经长成和 vLLM 并列的通用推理引擎，能跑 DeepSeek、Qwen、Kimi 这类大型 MoE 模型的多机部署，也被不少强化学习框架拿来生成训练数据。

这一篇把 SGLang 当成一个要上生产的系统来拆：它由哪几个进程组成，一个请求怎样流过；RadixAttention、调度策略、重叠调度在源码里具体怎样工作；HiCache、结构化输出、投机解码、DP Attention、专家并行、P/D 分离和 Model Gateway 各解决什么问题、怎样打开；量化、LoRA、多模态和硬件支持到哪一步；部署时监控什么、哪些参数最常调、哪些坑最常踩。连续批处理、分块预填充、投机解码等机制在推理系列已经讲过，这里只链接，不重讲；[第 18 篇](../llm-inference/18-vllm-sglang.md)对 SGLang 的一页概述，这里展开成完整的一篇。

本篇以 **SGLang 0.5.22**（GitHub 正式发布，2026 年 10 月 19 日）为准，参数名和默认值对照了这个版本的源码与仓库内文档。本站没有在 GPU 上运行文中的命令，涉及显存和 KV 容量的数字是按源码公式手算的估计，实际以启动日志为准。

## 从一篇论文到一个推理引擎

SGLang 最早来自 LMSYS 团队的论文《SGLang: Efficient Execution of Structured Language Model Programs》（arXiv 2312.07104）。论文的出发点是“LLM 程序”：一次任务往往不是一问一答，而是多次调用模型，中间夹着分支、并行、约束格式的输出。论文为此提出了两部分：

- **前端语言**：在 Python 里用 `gen`、`select`、`fork` 等原语描述多次调用的流程；
- **运行时**：用 RadixAttention 在多次调用之间复用 KV Cache，用压缩的有限状态机加速受约束的解码。

后来的发展重心明显偏向运行时。今天绝大多数用户只把 SGLang 当作 OpenAI 兼容的推理服务来用，前端语言仍然保留，但已经不是主角（后文有一小节）。仓库现在由非营利组织 LMSYS 托管，README 对自己的定位是“为智能体负载、大规模服务和强化学习 rollout 优化的开源推理框架”，同一个 Python 包里还带了图像和视频生成引擎 SGLang Diffusion。

和 vLLM 相比，SGLang 有几个一直保持的特点：前缀缓存以基数树为核心，粒度细到单个 token；调度器默认开启 CPU 与 GPU 的重叠；对 DeepSeek 这类 MLA + MoE 大模型，DP Attention、专家并行和 P/D 分离的组合投入很深，大规模部署的公开案例多；新模型发布时经常同步提供启动配方。两者的基础能力高度重叠，选哪一个仍要按[第 18 篇](../llm-inference/18-vllm-sglang.md)的三道关实测。

## 一个服务由哪些进程组成

执行 `sglang serve` 以后，机器上出现的不止一个 Python 进程。分工很清楚：TokenizerManager 在主进程，Scheduler 在子进程，DetokenizerManager 在另一个子进程。

![sglang serve 启动后，主进程运行 HTTP 服务和 TokenizerManager，每张 GPU 一个 Scheduler 子进程负责调度和模型执行，DetokenizerManager 子进程把 token ID 变成文本，三者之间通过 ZMQ 传递消息](/ai/inference-engines/sglang-architecture.svg)

| 进程 | 主要对象 | 职责 |
| --- | --- | --- |
| 主进程 | FastAPI 应用、`TokenizerManager` | 接收 HTTP 请求（OpenAI、Anthropic `/v1/messages`、Ollama `/api/chat`、原生 `/generate` 等），套对话模板、分词、多模态预处理，按请求 ID 等待结果，流式返回 |
| Scheduler 子进程（每张卡一个） | `Scheduler`、`TpModelWorker`、`ModelRunner`、RadixCache、KV 池 | 维护等待队列和运行批，匹配前缀、分配 KV、组批，调用模型前向和采样 |
| Detokenizer 子进程 | `DetokenizerManager` | 把每步新生成的 token ID 增量解码成文本，处理停止串和特殊 token |
| 可选：DataParallelController | — | `--dp-size > 1` 时在前面把请求分给多组 Scheduler |

图里有三点值得注意。

第一，**调度和模型执行在同一个进程里**。Scheduler 进程直接持有 `TpModelWorker`，后者再创建 `ModelRunner`，调度器组好的批在本进程内交给模型执行，不需要跨进程传输张量。TP=4 时就有 4 个 Scheduler 进程，每个绑定一张卡，各自执行相同的调度逻辑；只有 rank 0 从主进程接收请求，再把请求广播给其他 rank，保证大家组出同样的批。

第二，**进程之间用 ZeroMQ 通信**。主进程把分好词的请求 PUSH 到 rank 0 的 Scheduler；Scheduler 把每步输出的 token ID PUSH 给 Detokenizer；Detokenizer 再把文本 PUSH 回主进程。三条通道都是本机的 `ipc://` 套接字。同一模型各 TP rank 之间的 all-reduce 则走 NCCL，和这些通道无关。

第三，**CPU 密集的活被挪出了 GPU 进程**。分词、反分词、JSON 解析、HTTP 连接管理都不占用 Scheduler 的时间。分词本身成为瓶颈时，可以用 `--tokenizer-worker-num` 开多个分词进程（默认 1，注意它和 `--api-key` 不能同时使用，后文“坑”一节再说）。多机部署时，只有 0 号节点运行 HTTP 和分词，其他节点只运行 Scheduler。

## 一个请求怎样走完

以资料助手的一次提问为例：系统提示加员工手册约 3000 个 token，用户问题约 30 个 token，要求流式返回。

1. **进入主进程。** HTTP 层解析 `/v1/chat/completions` 请求，TokenizerManager 按模型的对话模板拼出完整提示并分词，得到约 3030 个 token ID，连同采样参数一起发给 Scheduler，然后在一个以请求 ID 为键的等待对象上挂起。
2. **进入等待队列。** rank 0 的 Scheduler 在每轮循环开头收取新请求，广播给其他 rank，各 rank 把它包装成 `Req` 放进等待队列。
3. **匹配前缀、排队。** 调度策略为等待队列排序。默认的 `fcfs` 不按命中排序，但仍会在基数树里查一遍前缀，为后面的显存预算和指标服务。如果员工手册已被别的请求算过，这里会命中约 3000 个 token。
4. **组批。** `get_next_batch_to_run` 先尝试从等待队列组一个 Prefill 批（受 `chunked_prefill_size`、剩余 KV 和请求数上限约束），能组出来就先跑 Prefill；组不出来，才对正在运行的请求做一步 Decode。这个请求只需要为未命中的约 30 个 token 做 Prefill。
5. **前向与采样。** ModelRunner 准备输入张量，选用注意力后端计算，Decode 批走录好的 CUDA Graph，采样得到下一个 token。
6. **回传与反分词。** 新 token ID 被发给 Detokenizer，它把这个 token 和之前未输出完的字节拼起来，得到可显示的增量文本，再发回主进程。
7. **流式输出与结束。** 主进程把增量文本作为 SSE 事件推给客户端。遇到停止条件后，请求从运行批移出，它的 KV 不会立刻释放，而是作为新分支插入基数树，供后续请求复用。

这条链路的通用形态在[请求路径篇](../llm-inference/07-request-path.md)讲过，连续批处理的原理见[连续批处理篇](../llm-inference/09-continuous-batching.md)。SGLang 特别的地方在第 3、4 步：调度策略怎样利用基数树，以及 CPU 组批和 GPU 计算怎样重叠。

## 先跑起来

### 安装

0.5.22 要求 Python 3.11 或更新，PyTorch 钉在 2.14.1，并且只提供 CUDA 13 的构建：0.5.19 是最后一个带 CUDA 12 轮子和镜像的版本。宿主机驱动要支持 CUDA 13。官方推荐两种方式：

```bash
# 方式一：Docker（Linux + NVIDIA GPU + NVIDIA Container Toolkit）
docker pull lmsysorg/sglang:v0.5.22

# 方式二：uv 安装到虚拟环境
pip install uv
uv venv --python 3.12 && source .venv/bin/activate
uv pip install --prerelease=allow 'sglang==0.5.22'
```

`--prerelease=allow` 不能省：SGLang 的部分依赖只在 PyPI 上发布预发布版本，官方文档说明，0.12.0 之前的 uv 不加这个开关会悄悄装成旧的 0.5.9。另外，`sglang[all]` 这个 extra 现在包含 Diffusion、HTTP/2 和链路追踪等可选依赖，只做文本推理用不到。AMD、Intel GPU、Xeon CPU 各有对应的镜像标签（如 `v0.5.22-rocm10-mi30x`、`v0.5.22-xpu`、`v0.5.22-xeon`），昇腾、Apple Silicon 等平台按各自的安装文档来。

### 启动资料助手的服务

在 H100 80GB 上启动 Qwen3-8B：

```bash
sglang serve Qwen/Qwen3-8B \
  --host 0.0.0.0 --port 30000 \
  --context-length 32768 \
  --reasoning-parser qwen3 \
  --tool-call-parser qwen \
  --enable-metrics
```

`sglang serve` 是新的命令行入口，模型路径可以直接作为第一个位置参数；旧写法 `python -m sglang.launch_server --model-path Qwen/Qwen3-8B ...` 仍然可用，大量文档和示例还在用它。几个参数的作用：

- `--host 0.0.0.0`：默认只监听 `127.0.0.1`，在容器或要被别的机器访问时必须改；默认端口是 30000。
- `--reasoning-parser qwen3`：把 Qwen3 输出里 `<think>` 段的内容拆到 `reasoning_content` 字段；`--tool-call-parser qwen` 把工具调用解析成 OpenAI 格式的 `tool_calls`。
- `--enable-metrics`：在同一端口暴露 Prometheus 的 `/metrics`。

用 Docker 时，按官方示例挂上模型缓存并放大共享内存：

```bash
docker run --gpus all --shm-size 32g --ipc=host -p 30000:30000 \
  -v "$HOME/.cache/huggingface:/root/.cache/huggingface" \
  lmsysorg/sglang:v0.5.22 \
  sglang serve Qwen/Qwen3-8B --host 0.0.0.0 --port 30000
```

服务就绪后，先请求 `/health_generate`：空闲时它会让引擎实际生成一个 token，确认整条链路可用（`/health` 默认只检查服务状态，不触发生成）。再发一个正式请求：

```bash
curl -s http://127.0.0.1:30000/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model": "Qwen/Qwen3-8B",
       "messages": [{"role": "system", "content": "你是公司资料助手。"},
                    {"role": "user", "content": "年假怎么计算？"}],
       "max_tokens": 512,
       "chat_template_kwargs": {"enable_thinking": false}}'
```

`chat_template_kwargs` 会传给对话模板，这里关掉 Qwen3 的思考模式。返回体的 `usage` 里能看到输入和输出 token 数。

### 读懂启动时算出的几个数

SGLang 启动时不做一次“试跑测峰值”，而是先按显存档位用公式估出几个关键值。以 H100 80GB、TP=1、Qwen3-8B 为例，按 0.5.22 的源码手算：

| 值 | 怎样得到 | 本例 |
| --- | --- | --- |
| `chunked_prefill_size` | 显存 60–90 GB 档位的默认值 | 8192 |
| decode CUDA Graph 最大批 | 同一档位，TP<4 时 | 256 |
| `mem_fraction_static` | (显存 − 预留) ÷ 显存；预留 ≈ 512 MiB + 8192×1.5 MiB + 并行修正 + 图预留，80GB 卡至少 10 GiB | 约 0.83 |
| KV 池容量 | 0.83 × 79.6 GiB − 约 15.3 GiB 权重，按每 token 144 KiB（36 层 × 8 个 KV 头 × 128 维 × K、V × 2 字节） | 约 37 万 token |
| `max_running_requests` | 容量 ÷ 上下文长度 × 512，限制在 2048–4096，且不超过容量的一半 | 4096 |

`mem_fraction_static` 的含义和 vLLM 的 `gpu_memory_utilization` 不同：它是“权重 + KV 池”占总显存的比例，剩下的部分留给激活和 CUDA Graph。启动报显存不足时调低它，KV 不够用时在确认激活不会爆的前提下调高它。显存账本的推导方法见[显存预算篇](../llm-inference/04-memory-budget.md)，启动日志里会打印实际的 `mem_fraction_static`、KV 池 token 数和最大运行请求数，以日志为准。

## 前缀缓存：RadixAttention 在源码里的样子

RadixAttention 的原理在[前缀缓存篇](../llm-inference/10-prefix-cache.md)讲过：所有缓存过的 token 序列放进一棵基数树，共同的开头只存一份，请求结束后它的 KV 作为新分支插入，显存不够时从叶子开始回收。落到 0.5.22 的实现上，有几个具体的点：

- **粒度是一个 token。** `--page-size` 默认解析为 1，所以匹配可以停在任意 token 上，不像块哈希那样向下取整到块边界。部分注意力后端要求更大的页（FlashMLA、TensorRT-LLM MLA 用 64，FA4 在 Blackwell 上用 128），这时匹配按页对齐。
- **键不只是 token。** 树的键 `RadixKey` 包含 token 序列、`extra_key`（例如不同的 LoRA 适配器）和 `cache_salt`。同样的文字用不同适配器生成的 KV 不会互相命中。
- **回收策略可选。** `--radix-eviction-policy` 默认 `lru`，还有 `lfu`、`slru`、`priority`、`tlru`。只有没被正在运行的请求锁住的叶子才能回收，叶子回收后父节点才可能变成新的候选。少数提示被高频复用、又常被一次性长文挤掉时，`slru` 或 `lfu` 更合适。
- **默认就开着。** 关闭用 `--disable-radix-cache`。v0.5.21 起，前缀树的核心操作默认由 Rust 实现。

资料助手能从中直接受益：员工手册那 3000 个 token 只在第一次被计算，之后的请求只为问题部分做 Prefill。监控里的 `sglang:cache_hit_rate` 就是这个命中率。多副本部署时每个副本各有一棵树，要靠路由器把相同前缀的请求送到同一副本，见后文 Model Gateway 一节。

## 调度策略：fcfs 之外的选择

有了基数树，调度器就能按“谁命中得多”来决定先处理谁。`--schedule-policy` 的默认值是 **`fcfs`**（先来先服务），不是常被误传的 `lpm`。源码把策略分成两类：

| 策略 | 类别 | 等待队列怎样排序 |
| --- | --- | --- |
| `fcfs`（默认） | 与缓存无关 | 保持到达顺序；开启优先级调度时先按优先级再按入队时间 |
| `lof` | 与缓存无关 | 按 `max_new_tokens` 从大到小（Longest Output First） |
| `random` | 与缓存无关 | 随机打乱 |
| `routing-key` | 与缓存无关 | 运行批里出现次数越多的 routing key 越靠前 |
| `lpm` | 缓存感知 | 命中前缀越长越靠前（Longest Prefix Match） |
| `dfs-weight` | 缓存感知 | 按基数树上的深度优先权重排序，让同一棵子树的请求挨在一起 |
| `hrrn` | 缓存感知 | 响应比优先：等待期间系统处理的 Prefill token 数 ÷ 自己未命中的长度，比值大的先跑 |
| `shortest-prefill-first` | 缓存感知（实验性） | 未命中长度越短越靠前，并为短请求预留一部分分块预算 |

缓存感知策略有三条容易被忽略的规则：

1. **队列太长时退化。** `lpm` 和 `hrrn` 在等待队列超过 128 个请求时（常量 `WAITING_QUEUE_PREFIX_MATCH_MAX`），这一轮直接按 FCFS 处理，因为对几百个请求逐个做前缀匹配和排序本身就很贵。
2. **缓存关了就退回 FCFS。** 用 `--disable-radix-cache` 时，缓存感知策略一律退回 `fcfs`；`shortest-prefill-first` 则直接报错。
3. **队列内的共享前缀去重。** `lpm` 等策略会对“在缓存里几乎没命中（不超过 32 个 token）”的请求再做一次检查：把它们插入一棵模拟的“等待队列基数树”，如果某个请求和队列里排在前面的请求共享了至少 32 个 token，就暂时把它排到后面。这样，同时到达的 100 个带同一份新手册的请求，先放一个进去算出手册的 KV，其余的下一轮就能命中，而不是 100 个一起冷启动。两个阈值可以用环境变量 `IN_BATCH_PREFIX_CACHING_CHECK_THRESHOLD` 和 `IN_BATCH_PREFIX_CACHING_DEPRIORITIZE_THRESHOLD` 调整。

**什么时候换掉 fcfs。** 资料助手这种“大量请求共享少数几段长前缀、而且经常集中到达”的负载，`lpm` 能提高命中率，减少 Prefill 总量。代价是公平性：命中少的请求会被一再推后，尾部 TTFT 变差，所以要同时看 `sglang:cache_hit_rate` 和 TTFT 的 P99，而不只看吞吐。前缀几乎不重复的负载（例如每次都是不同的长文档摘要），缓存感知策略只增加排序开销，保持 `fcfs` 即可。要在等待时间和命中之间折中，可以试 `hrrn`。

**优先级调度。** 打开 `--enable-priority-scheduling` 后，请求里的 `priority` 字段生效（默认数值大的优先，`--schedule-low-priority-values-first` 反过来），差距超过 `--priority-scheduling-preemption-threshold`（默认 10）时可以抢占正在运行的请求。它只能和 `fcfs` 或 `lof` 一起用。注意 `--schedule-policy` 的可选值里虽然列了 `priority`，但按 0.5.22 源码，调度器的两类策略枚举都不包含它，设置后会在初始化时报“未知策略”；要的是优先级调度，就用上面这个开关。

## 重叠调度：让 GPU 不等 CPU

每一步调度，CPU 都要做不少事：处理上一步的输出（检查停止条件、把 token 发给 Detokenizer）、从等待队列挑请求、匹配前缀、分配 KV 页、准备输入张量。对 8B 这样的小模型，一步 Decode 的 GPU 时间只有十几毫秒，CPU 这段开销占比就不小。如果 CPU 做完再让 GPU 算，GPU 就会周期性地空闲。

![时间线对比：不重叠时 CPU 组批与 GPU 前向交替进行，GPU 周期性空闲；默认的重叠调度中 GPU 计算第 k 批时 CPU 同时处理第 k−1 批结果并组好第 k+1 批](/ai/inference-engines/sglang-overlap.svg)

SGLang 的调度循环有两个版本。`event_loop_normal` 是直观的写法：收请求、组批、运行、处理结果，依次进行。默认使用的 `event_loop_overlap` 换了顺序：本批的前向一发射就立即返回，不等 GPU 算完；接着处理上一批的结果；然后才为本批启动采样（采样要用到语法约束的最新状态，必须等上一批处理完）；下一轮循环开始时 GPU 往往还在算，CPU 已经在组下一批了。

下一批 Decode 需要“这一批每个请求刚生成的 token”作为输入，而这个 token 还没回到 CPU。SGLang 用一个常驻 GPU 的 `FutureMap` 解决：CPU 组批时只填一个占位索引，前向开始时由 GPU 从上一批的输出缓冲区里就地取值。

重叠调度默认开启，用 `--disable-overlap-schedule` 关闭。它的代价是结果晚一步回到 CPU：停止判断和流式输出都滞后一步。某个请求在第 k 步生成了结束符，调度器要到处理第 k 步结果时才知道，第 k+1 步可能已经为它多算了一次（结果被丢弃）；按 `max_tokens` 长度上限结束的请求可以提前算出来，调度器会跳过这多余的一步。以下情况会自动关闭重叠：流水线并行（`--pp-size > 1`）、扩散语言模型、部分 Mamba 混合模型的缓存模式、Apple Silicon 上不走 MLX 的路径等。连续两个 Prefill 批之间可以用环境变量 `SGLANG_DISABLE_CONSECUTIVE_PREFILL_OVERLAP=1` 关闭重叠，以换取首批更低的 TTFT。

## 分块预填充、批的组成与显存预算

分块预填充的原理见[分块预填充篇](../llm-inference/11-chunked-prefill.md)。SGLang 的做法是：一个长请求的 Prefill 超过 `--chunked-prefill-size` 时被切成多段，每轮只推进一段，同一时刻最多有一个“正在分块”的请求。默认值按显存档位决定：

| 单卡显存 | 典型 GPU（源码注释） | `chunked_prefill_size` | decode 图最大批（TP<4 / TP≥4） |
| --- | --- | --- | --- |
| < 20 GB | T4、4080 | 2048 | 8 |
| 20–35 GB | A10、4090、5090 | 4096 | 48 / 160 |
| 35–60 GB | A100 40GB、L40 | 4096 | 32 / 160 |
| 60–90 GB | H100、A100 80GB | 8192 | 256 / 512 |
| 90–160 GB | H20、H200 | 8192 | 256 / 512 |
| ≥ 160 GB | B200、MI300 | 16384 | 512 |

设成 `-1` 表示关闭分块。和 vLLM V1 不同，SGLang 默认**不**把 Prefill 和 Decode 混进同一批：有可做的 Prefill 就先做 Prefill 批，否则做 Decode 批。这对 TTFT 友好，但长 Prefill 期间正在 Decode 的请求会停顿，表现为 ITL 的尖刺。打开 `--enable-mixed-chunk` 可以让分块 Prefill 和 Decode 共处一批；更彻底的办法是 P/D 分离。

KV 池不够时，调度器会“撤回”（retract）部分正在 Decode 的请求，把它们放回等待队列，之后重新计算。默认按 `--retraction-policy length` 先撤回已输出短、输入长的请求。`sglang:num_retracted_reqs` 持续增长，说明调度得太激进，可以调大 `--schedule-conservativeness`（默认 1.0）让调度器预留更多空间，或者调低 `--max-running-requests`。

## CUDA Graph、torch.compile 与注意力后端

CUDA Graph 的作用和分段录制的思路见[注意力内核篇](../llm-inference/12-attention-kernels.md)。0.5.22 把 Decode 和 Prefill 两个阶段分开配置：在 CUDA 平台上，Decode 默认录制完整图（`full`），Prefill 默认使用**可中断图**（`breakable`）——把一次前向切成多段录制，不能录进图的操作在段与段之间以普通方式执行。Prefill 图的默认最大 token 数等于 `chunked_prefill_size`（MLA 模型为 2048），流水线并行时默认关闭 Prefill 图。

相关参数在这个版本改成了按阶段命名：`--cuda-graph-backend-decode`、`--cuda-graph-backend-prefill`（取值 `full`、`breakable`、`disabled`）、`--cuda-graph-max-bs-decode`、`--cuda-graph-max-bs-prefill`、`--disable-decode-cuda-graph`、`--disable-prefill-cuda-graph`，也可以用一个 JSON 一次写全：`--cuda-graph-config '{"decode":{"backend":"full","max_bs":256}}'`。怀疑 CUDA Graph 导致输出异常时，`--debug-cuda-graph` 会让所有操作在图的录制、回放路径上以普通方式执行，便于定位。

`--enable-torch-compile` 默认关闭，打开后对不超过 `--torch-compile-max-bs`（默认 32）的批用 `torch.compile` 编译，小批 Decode 可能更快，但首次启动编译慢，收益要实测。

注意力后端默认自动选择，规则在 `get_default_attn_backend` 里：

| 条件 | 普通多头注意力（Llama、Qwen） | MLA（DeepSeek 等） |
| --- | --- | --- |
| Hopper（H100/H200） | `fa3`（使用 topk>1 的投机解码时除外） | `fa3` |
| Blackwell SM100（B200 等） | `trtllm_mha`，K/V 维度不同时 `fa4` | `flashinfer` |
| AMD ROCm | `aiter` | `aiter`（KV 头数为 16 或 128）或 `triton` |
| Apple MPS | `torch_native` | `torch_native` |
| 其他 NVIDIA GPU（A100、RTX 等） | `flashinfer`（模型有 attention sink 时用 `triton`） | `triton` |

DeepSeek-V4、Qwen3.5 等新架构在各自的模型覆盖规则里还会另选后端，以启动日志打印的为准。可以用 `--attention-backend` 整体指定，也可以用 `--prefill-attention-backend` 和 `--decode-attention-backend` 分别指定。换后端最常见的原因是遇到某个模型和默认后端的兼容问题，换完要重新做质量回归。

## HiCache：把前缀缓存放到显存之外

前缀缓存篇算过一笔账：从 CPU 内存把 8K token 的 KV 搬回来，比重新 Prefill 快得多。HiCache（`--enable-hierarchical-cache`，默认关闭）把基数树扩展成三级：

| 层级 | 介质 | 范围 |
| --- | --- | --- |
| L1 | GPU 显存 | 本实例 |
| L2 | 主机内存 | 本实例私有，同一台机器上的两个实例也不共享 |
| L3 | 存储后端：`file`、`mooncake`、`hf3fs`、`nixl`、`aibrix` 等 | 取决于后端，配置成共享时可跨实例 |

每个树节点记录它的 KV 在哪几层。新请求先在 L1、L2 里匹配；剩下的部分去 L3 查，命中超过阈值（文档默认 256 token）才触发预取。预取的停止时机由 `--hicache-storage-prefetch-policy` 决定：`best_effort`（GPU 能算了就不等）、`wait_complete`（等全部取完）、`timeout`（默认，按 token 数线性计算的超时，上限 30 秒）。写回策略 `--hicache-write-policy` 默认 `write_through`，即命中的数据立即往下一层写；带宽紧张时可以用 `write_through_selective` 只写热数据，或用 `write_back` 只在被逐出时写。

L2 的大小由 `--hicache-ratio`（相对显存池的倍数，主机内存模式下默认解析为 2.0）或 `--hicache-size`（GB，优先）决定，都不设时还受 `--hicache-host-memory-fraction`（默认 0.8）约束。一个常见误解是“把几台机器的内存凑成一个大 L2”：做不到，跨实例复用只能靠 L3。资料助手如果有大量不同部门的长手册、单卡显存放不下所有热门前缀，HiCache 加本机内存就能提高命中；要在多个副本之间共享，再接 Mooncake 等 L3。HiCache 也是 LMCache 等外部 KV 层之外的内置选择，[第 08 篇](./08-orchestration.md)讲这些组件之间的关系。

## 结构化输出、工具调用与推理内容

结构化输出的原理见[第 18 篇](../llm-inference/18-vllm-sglang.md)。SGLang 的语法后端由 `--grammar-backend` 选择，默认 `xgrammar`：

| 后端 | JSON Schema | 正则 | EBNF |
| --- | --- | --- | --- |
| `xgrammar`（默认） | 支持 | 支持 | 支持 |
| `outlines` | 支持 | 支持 | 不支持 |
| `llguidance` | 支持 | 支持 | 支持 |

OpenAI 接口里用 `response_format`（`json_schema` 类型）传入约束；原生 `/generate` 接口的采样参数里用 `json_schema`、`regex` 或 `ebnf`，一个请求只能给其中一种。对 Qwen3、DeepSeek-R1 这类带思考段的模型，设置了 `--reasoning-parser` 后，约束只作用在思考结束之后的正文上，`<think>` 内部可以自由生成。

工具调用由 `--tool-call-parser` 解析，按模型家族选择（Qwen 系列用 `qwen`，Qwen3-Coder 用 `qwen3_coder`，还有 Llama、DeepSeek、Kimi、GLM 等多种）。格式合法不代表内容正确：资料助手调用“查询假期余额”工具时，员工编号是否属于当前用户，仍然要由业务代码校验。

## 投机解码

投机解码的原理和各方法的来源见[投机解码篇](../llm-inference/15-speculative-decoding.md)。0.5.22 内置的方法：

| `--speculative-algorithm` | 草稿来源 | 适合 |
| --- | --- | --- |
| `EAGLE` | EAGLE-2 草稿头，可建树 | 有对应草稿模型，兼容面最广 |
| `EAGLE3` | EAGLE-3 草稿头 | 官方推荐的首选 |
| `EAGLE` + 小步数（或别名 `NEXTN`） | 模型自带的 MTP 层 | DeepSeek、MiMo 等带 MTP 的模型 |
| `STANDALONE` | 一个更小的完整模型 | 只有同家族小模型可用 |
| `NGRAM` | 从上下文里匹配 n-gram，不需要草稿模型 | 输出大量复述输入的场景，仅 CUDA |
| `DFLASH`、`DSPARK`、`UNO` | 各自格式的草稿检查点或适配器 | 有对应检查点的新模型 |

以资料助手为例，如果有 Qwen3-8B 对应的 EAGLE-3 草稿模型：

```bash
sglang serve Qwen/Qwen3-8B --host 0.0.0.0 \
  --speculative-algorithm EAGLE3 \
  --speculative-draft-model-path <Qwen3-8B 的 EAGLE-3 草稿模型> \
  --speculative-num-steps 3 \
  --speculative-eagle-topk 1 \
  --speculative-num-draft-tokens 4
```

三个形状参数要么都不设（让 SGLang 按模型自动选），要么三个一起设。有几处必须知道的行为：

- **投机解码默认和重叠调度一起运行（V2 worker），而重叠只支持 `--speculative-eagle-topk 1`。** 显式设置 topk>1（树形草稿）会报错；不设 topk 时自动调参可能选出 topk>1，官方建议显式写 1。要用树形草稿，就加 `--disable-overlap-schedule`。
- **EAGLE 家族没设 `--max-running-requests` 时会被自动设为 48。** 投机解码主要改善低并发下的单请求速度，高并发时验证批变大，收益下降甚至变负；如果确实要在高并发下使用，手动设置这个值并压测。
- 接受情况看 `sglang:spec_accept_length`（平均每次前向接受的 token 数）和 `sglang:spec_accept_rate`。

## 多卡与多机：TP、DP Attention、EP、PP

并行方式的原理见[分布式推理篇](../llm-inference/16-distributed.md)。SGLang 的参数：

| 参数 | 默认 | 含义 |
| --- | --- | --- |
| `--tp-size`（常写 `--tp`） | 1 | 张量并行 |
| `--pp-size` | 1 | 流水线并行（会关闭重叠调度） |
| `--attn-dp-size` | 1 | DP Attention：在 TP 组内把注意力部分拆成 N 个数据并行组 |
| `--ep-size`（常写 `--ep`） | 1 | 专家并行 |
| `--dp-size` | 1 | 在一个服务里起多份完整模型副本（不推荐，见下） |
| `--nnodes`、`--node-rank`、`--dist-init-addr` | 1、0、无 | 多机 |

**DP Attention** 是 SGLang 为 DeepSeek 这类 MLA 模型引入的做法。MLA 的 KV 只有一个“头”，按 TP 切分时每张卡都要存一份完整的 KV，TP=8 等于把 KV 存了 8 遍。DP Attention 让注意力层按数据并行运行——每个组处理不同的请求、各自只存自己请求的 KV，FFN/MoE 层仍然按张量并行或专家并行计算，两者之间用集合通信交换激活。要求 `tp_size` 能被 `attn_dp_size` 整除。官方给 DeepSeek 的推荐组合是：

```bash
sglang serve deepseek-ai/DeepSeek-V3 --trust-remote-code \
  --tp 8 --attn-dp-size 8 --ep 8 \
  --moe-a2a-backend deepep --moe-runner-backend deep_gemm
```

注意参数的变化：旧教程里的 `--dp-size 8 --enable-dp-attention` 在 0.5.22 仍能用，会被解析成 `--attn-dp-size 8 --dp-size 1` 并打印废弃警告，计划在 2026-12-31 之后移除，新部署直接写 `--attn-dp-size`。

**专家并行**把 MoE 的专家分散到各卡，`--moe-a2a-backend` 选择 token 分发的通信方式（默认 `none`，即用 all-reduce/all-gather；大规模用 `deepep`，弹性部署用 `mooncake` 或 `nixl`，AMD 用 `mori`，昇腾用 `ascend_fuseep`），`--moe-runner-backend` 选择专家计算内核。配套的还有专家负载均衡 `--enable-eplb`、双批重叠 `--enable-two-batch-overlap`（让一个微批的通信和另一个微批的计算重叠）等，默认都关闭。

**多机**用三件套参数，每台机器运行同样的命令，只改 `--node-rank`：

```bash
# 两台机器各 8 卡，TP=16；第二台把 --node-rank 改成 1
sglang serve meta-llama/Llama-3.1-405B-Instruct \
  --tp 16 --nnodes 2 --node-rank 0 --dist-init-addr 10.0.0.1:20000
```

**为什么不推荐 `--dp-size`。** 它在一个服务里用 DataParallelController 起多份副本，只有轮询、按请求数、按 token 数这几种简单的分发方式，没有缓存感知路由、熔断和单独的观测。官方 DP 指南直接写着“highly not recommended”，推荐改用 Model Gateway 做数据并行。资料助手的 Qwen3-8B 一张卡就放得下，多卡时更合理的做法是起多个单卡实例，前面放一个路由器。

## P/D 分离

P/D 分离的动机和 KV 传输的代价见 [P/D 分离篇](../llm-inference/17-pd-disaggregation.md)。SGLang 文档列出的两个直接原因是：Prefill 批打断正在进行的 Decode；DP Attention 下一个组在做 Prefill、另一个组在做 Decode，导致整体等待。

开启方式是给两组实例分别设置 `--disaggregation-mode prefill` 和 `--disaggregation-mode decode`，再用路由器把它们连起来。单机两卡的最小示例（需要 RDMA 网卡）：

```bash
sglang serve Qwen/Qwen3-8B --disaggregation-mode prefill \
  --port 30000 --disaggregation-ib-device mlx5_0
sglang serve Qwen/Qwen3-8B --disaggregation-mode decode \
  --port 30001 --base-gpu-id 1 --disaggregation-ib-device mlx5_0
python -m sglang_router.launch_router --pd-disaggregation \
  --prefill http://127.0.0.1:30000 --decode http://127.0.0.1:30001 \
  --host 0.0.0.0 --port 8000
```

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `--disaggregation-transfer-backend` | `mooncake` | 还可选 `nixl`、`ascend`、`mori`、`mooncake_tcp` |
| `--disaggregation-bootstrap-port` | 8998 | Prefill 侧的握手端口，路由器据此配对 |
| `--disaggregation-decode-enable-radix-cache` | 关闭 | Decode 侧默认不保留前缀缓存 |
| `--disaggregation-decode-allocation-policy` | `early` | Decode 在 Prefill 完成前就预留目标 KV；`prefill_complete` 推迟预留，两侧必须一致 |

几个边界：P/D 实例之间要有 RDMA（InfiniBand/RoCE，或 AWS EFA 的专用构建）才有意义，`mooncake_tcp` 只适合功能验证；有状态的 Responses API（`store`、`previous_response_id`、后台任务）在 P/D 下不支持；0.5.21 起，用 `--enable-pd-role-switch` 启动的实例可以通过 `/pd_role_switch` 在线切换角色，不必重启。资料助手这种 8B 模型、输入几千 token 的负载，单实例加分块预填充通常够用，P/D 分离的收益要等输入更长、规模更大、ITL 要求更严时才明显。

## SGLang Model Gateway

前面多次提到的路由器，现在叫 **SGLang Model Gateway**（SMG，早期叫 SGLang Router），是一个用 Rust 写的独立组件，Python 包名 `sglang-router`，命令是 `python -m sglang_router.launch_router` 或 `smg`。它在仓库的 `sgl-model-gateway/` 目录里，0.5.22 对应的版本是 0.3.2；主 README 的生态表已经把 SMG 指向独立的 `smg-project/smg` 仓库，后续版本以那边为准。

它承担这些职责：

- **负载均衡**：`--policy` 默认 `cache_aware`，在路由器里为每个实例维护一棵近似的前缀树（按请求历史记录，存的是原始字符而不是 token，不需要分词，也不查询实例的真实缓存）。实例之间负载差距同时超过 `--balance-abs-threshold`（默认 64）和 `--balance-rel-threshold`（默认 1.5 倍）时，直接发往最空闲的实例；否则看前缀命中比例，超过 `--cache-threshold`（默认 0.3）就发往命中最多的实例，没超过就发往缓存树最小、空间最多的实例。其他策略有 `round_robin`、`random`、`power_of_two`、`prefix_hash`、`manual` 等。
- **P/D 编排**：`--pd-disaggregation` 模式下为每个请求挑一对 Prefill/Decode 实例。
- **可靠性**：重试、熔断、令牌桶限流、健康检查、Kubernetes 服务发现。
- **gRPC 与多模型**：gRPC 模式下分词、推理内容和工具调用都在 Rust 里处理；`--enable-igw` 可以在一个网关后面挂多个模型。

用网关做数据并行的最简写法：

```bash
pip install sglang-router
python -m sglang_router.launch_server --model-path Qwen/Qwen3-8B --dp-size 4
```

这条命令和原生 `--dp-size` 的参数相同，入口不同：`sglang_router.launch_server` 会启动 4 个独立的 SGLang 工作进程加一个网关。注意网关默认监听 `0.0.0.0:30000`，和 SGLang 服务的默认端口相同，同机部署时要错开；网关默认也不做鉴权。

## 量化、LoRA、多模态和非生成模型

**量化。** 原理和格式对比见[量化篇](../llm-inference/14-quantization.md)。SGLang 能直接加载 FP8、GPTQ、AWQ、ModelOpt FP8/FP4（NVFP4）、compressed-tensors、MXFP4、GGUF、bitsandbytes 等格式的预量化模型，也能用 `--quantization fp8` 等做在线量化。官方建议优先用离线量化好的模型；已量化的模型不要再加 `--quantization`。KV Cache 量化用 `--kv-cache-dtype`（默认 `auto`，即与模型相同），可选 `fp8_e4m3`、`fp8_e5m2`、`nvfp4` 等；FP8 KV 没有校准好的缩放因子时默认为 1.0，可能影响精度，要做质量回归。AMD 上走 Quark 和 aiter，昇腾上走 `modelslim`。

**LoRA。** `--lora-paths` 加载适配器（指定后自动开启 LoRA），`--max-loras-per-batch` 默认 8，内核后端 `--lora-backend` 默认 `csgmv`。运行中可以通过 `/load_lora_adapter`、`/unload_lora_adapter` 动态增删；OpenAI 接口里用 `"model": "Qwen/Qwen3-8B:hr-policy"` 这样的写法选择适配器。不同适配器生成的 KV 在基数树里互不命中。

**多模态。** Qwen-VL（含 Qwen3-VL）、DeepSeek-VL2、Gemma 3、Llama 3.2 Vision、Kimi-VL、GLM-4.5V、MiniCPM-V 等视觉语言模型可以直接加载，图片通过 OpenAI 格式的 `image_url` 传入。相关参数有 `--mm-attention-backend`、`--enable-prefix-mm-cache` 等；多模态模型的 `mem_fraction_static` 会自动调低，为图像处理留出显存。

**非生成模型。** 嵌入模型（`/v1/embeddings`）、重排序（`/v1/rerank`）、分类（`/v1/classify`）、奖励模型都有支持，大多数会自动识别，也可以用 `--is-embedding` 显式声明。0.5.21 新增的 `/v1/decisions` 和 `/v1/score` 把生成模型当作打分器使用。没有原生实现的架构可以用 `--model-impl transformers` 回落到 Hugging Face Transformers 实现，速度通常不如原生实现。

## 前端语言：还在，但不是主角

论文里的前端语言仍在 `sglang` 包里，适合在 Python 中编排多次调用。下面的例子让模型先判断该用哪个工具，再按分支继续生成；`select` 的候选值和 `gen` 的输出都会在同一个会话状态里累积，前面的内容自然成为后面的前缀，正好命中基数树：

```python
import sglang as sgl

@sgl.function
def route_question(s, question):
    s += sgl.system("你是公司资料助手。")
    s += sgl.user(question)
    s += sgl.assistant("需要查询的系统：" + sgl.gen("tool", choices=["假期系统", "报销系统"]))
    s += sgl.user("请给出回答。")
    s += sgl.assistant(sgl.gen("answer", max_tokens=256))

sgl.set_default_backend(sgl.RuntimeEndpoint("http://127.0.0.1:30000"))
state = route_question.run(question="年假怎么计算？")
print(state["tool"], state["answer"])
```

`s.fork(n)` 可以从同一个状态分出 n 个并行分支，`gen` 的 `regex` 参数可以约束格式。它的定位是“调用 SGLang 服务的客户端库”：如今多数团队用 OpenAI SDK 加自己的编排代码完成同样的事，新项目不必为了 SGLang 学这套语言。

## 硬件支持

| 平台 | 支持方式与边界 |
| --- | --- |
| NVIDIA | 主平台：B200/B300/GB200/GB300、H100/H200/H800/H20、A100、RTX 30/40/50 系列、Jetson Orin 等；需要 CUDA 13 |
| AMD | Instinct MI300X、MI325X、MI350X、MI355X，官方 ROCm 镜像，注意力与 MoE 走 aiter |
| 华为昇腾 | A2、A3、950PR/DT，有独立的安装、调优和模型支持文档，P/D 传输有 `ascend` 后端 |
| Google TPU | v6e、v7，通过独立仓库 `sgl-project/sglang-jax`（JAX 实现）支持，不是同一套代码 |
| Intel | Arc / Arc Pro B 系列 GPU（`-xpu` 镜像）、Xeon CPU（`-xeon` 镜像） |
| Apple Silicon | `SGLANG_USE_MLX=1` 走 MLX 后端；0.5.22 新增标准 PyTorch（MPS）后端，但支持面更小；适合开发调试 |
| 摩尔线程 | MTT S5000 |

README 还列出了正在接入的平台（AWS Trainium、寒武纪 MLU、海光等），这些不应视为可用。硬件“受支持”和“你的模型 × 量化格式 × 并行方式在这块卡上可用”是两回事：DeepSeek 的 FP8 MoE、FP4 KV、某种注意力后端，在不同平台上的覆盖差别很大，以对应平台文档和 Cookbook 里的启动命令为准，自己再做质量和压测回归。

## 可观测性

`--enable-metrics` 后，`/metrics` 输出 Prometheus 格式的指标，前缀都是 `sglang:`。和[指标篇](../llm-inference/05-metrics.md)的概念对应：

| 指标 | 含义 | 看什么 |
| --- | --- | --- |
| `sglang:num_running_reqs`、`sglang:num_queue_reqs` | 运行中、排队中的请求数 | 排队持续增长说明容量不足 |
| `sglang:token_usage` | KV 池（混合模型取最紧的那个池）的占用率 | 长期接近 1 时会出现撤回 |
| `sglang:cache_hit_rate` | 前缀缓存命中率 | 判断调度策略和路由是否有效 |
| `sglang:gen_throughput` | 生成吞吐（token/s） | 容量规划 |
| `sglang:time_to_first_token_seconds` | TTFT 直方图 | 看 P50/P99 |
| `sglang:inter_token_latency_seconds` | 相邻 token 间隔直方图 | Prefill 打断 Decode 时出现尖刺 |
| `sglang:e2e_request_latency_seconds` | 端到端延迟直方图 | 与业务 SLO 对齐 |
| `sglang:num_retracted_reqs` | 被撤回的请求数 | 持续增长说明调度过激 |
| `sglang:spec_accept_length` | 投机解码平均接受长度 | 判断投机是否划算 |

另外，`--log-requests` 记录请求内容（注意隐私），`--enable-trace` 配合 `--otlp-traces-endpoint` 输出 OpenTelemetry 链路，`/start_profile`、`/stop_profile` 可以在线抓取 PyTorch Profiler 结果。启动日志每隔 `--decode-log-interval`（默认 40）步打印一行 Decode 统计，包括运行请求数、token 占用和吞吐，没有接 Prometheus 时也能粗看负载。

## 生产部署

**容器。** 用固定版本标签（如 `lmsysorg/sglang:v0.5.22`）而不是 `latest`；`--shm-size` 或 `--ipc=host` 不能少，多进程之间要用共享内存；模型缓存挂到持久卷，避免每次重启重新下载。`latest-runtime` 标签是体积更小的运行时镜像。

**Kubernetes。** 仓库里的 `docker/k8s-sglang-service.yaml` 是单机部署的参考：一张 GPU、挂 `/dev/shm` 和模型缓存卷，存活探针用 `/health`，就绪探针用 `/health_generate`，初始延迟 120 秒（大模型加载更久，要相应调长）。多机部署可以用 StatefulSet 示例或 LeaderWorkerSet（LWS）；更完整的方案有 SGLang 生态里的 OME（模型服务 operator）和 RBG（RoleBasedGroup，适合 P/D 这类多角色部署），以及 llm-d、NVIDIA Dynamo、Ray Serve 等把 SGLang 当作后端的编排系统，[第 08 篇](./08-orchestration.md)讨论它们的分工。

**安全。** SGLang 默认只监听 `127.0.0.1`，这是好的默认值，但一改成 `0.0.0.0` 就要注意：`--api-key` 默认不设，此时推理接口和 `/flush_cache`、`/update_weights_from_disk`、`/load_lora_adapter`、`/start_profile` 这类管理接口都在同一端口、无需认证。生产上至少要做到：服务只在内网可达；在网关层做鉴权和限流（[生产部署篇](../llm-inference/21-production.md)）；需要时设置 `--api-key` 和 `--admin-api-key`，后者单独保护管理接口。`/health`、`/metrics` 始终免鉴权，方便探针和采集。

**升级与回滚。** 记录镜像摘要、模型版本、启动参数和 Cookbook 里的推荐配置；SGLang 每两三周一个正式版，每版几百个 PR，升级前在预发环境用业务数据回归质量、TTFT/ITL 分位数和吞吐。

## 关键参数调优

| 参数 | 0.5.22 默认 | 什么时候调 |
| --- | --- | --- |
| `--host` / `--port` | `127.0.0.1` / 30000 | 容器和对外服务改 `0.0.0.0` |
| `--mem-fraction-static` | 按显存与参数公式计算（H100 单卡约 0.83） | 启动 OOM 时调低；KV 不够、激活有余量时调高 |
| `--max-running-requests` | 按 KV 容量推算，2048–4096；EAGLE 系为 48 | 高并发 Decode 显存吃紧、撤回频繁时调低 |
| `--chunked-prefill-size` | 按显存档位（H100 为 8192） | 长输入导致 ITL 尖刺时调小；追求 Prefill 吞吐时调大；`-1` 关闭 |
| `--max-prefill-tokens` | 16384 | 单个 Prefill 批的 token 上限 |
| `--context-length` | 模型配置 | 缩短可降低单请求最坏情况的 KV 需求 |
| `--schedule-policy` | `fcfs` | 前缀高度共享、集中到达时试 `lpm`；要兼顾等待时间试 `hrrn` |
| `--schedule-conservativeness` | 1.0 | 撤回频繁时调大 |
| `--disable-overlap-schedule` | 不设（重叠开启） | 排查结果滞后问题，或需要树形投机草稿时 |
| `--enable-mixed-chunk` | 关闭 | 希望 Prefill 时 Decode 不停顿 |
| `--page-size` | 1 | 部分注意力后端会自动改成 32/64/128 |
| `--attention-backend` | 自动 | 兼容性问题或做后端对比时 |
| `--cuda-graph-max-bs-decode` | 按显存档位（H100 TP<4 为 256） | 并发高于它的批不走 CUDA Graph；显存紧张时调小 |
| `--kv-cache-dtype` | `auto` | 需要更多 KV 容量时用 FP8，需回归质量 |
| `--grammar-backend` | `xgrammar` | 需要 Outlines 或 llguidance 的特定语法时 |
| `--radix-eviction-policy` | `lru` | 少量热门前缀被一次性长文挤掉时试 `slru`/`lfu` |
| `--enable-hierarchical-cache` | 关闭 | 热门前缀总量超过显存 |
| `--tp` / `--attn-dp-size` / `--ep` | 1 | 模型放不下或 MoE 大模型时 |
| `--tokenizer-worker-num` | 1 | 分词成为瓶颈（与 `--api-key` 不兼容） |
| `--enable-metrics` | 关闭 | 生产环境都应打开 |

调参的顺序建议：先用默认值跑通并压测，记录 TTFT、ITL、吞吐和 `token_usage`；先解决显存和并发上限（前三行），再调调度策略和分块，最后才考虑后端、编译和投机解码。每次只改一个变量。

## 限制与常见坑

**一个不适用的场景。** 假设资料助手扩展出“上传任意合同做摘要”的功能：每个请求都是一份几万 token 的新合同，几乎没有共享前缀。这时 RadixAttention 只增加了一次查树的开销，`lpm` 也排不出有意义的顺序；而且长 Prefill 会周期性地卡住正在 Decode 的其他用户。正确的做法是保持 `fcfs`，调小 `--chunked-prefill-size` 或打开 `--enable-mixed-chunk`，负载再大就考虑 P/D 分离；SGLang 的前缀缓存优势在这类负载上体现不出来，和 vLLM 的差距要靠实测判断。

其他常见问题：

- **容器里访问不到服务。** 默认监听 `127.0.0.1`，必须加 `--host 0.0.0.0`。
- **CUDA 版本不匹配。** 0.5.20 起只有 CUDA 13 构建，旧驱动的机器要么升级驱动，要么停在 0.5.19 及 `-cu129` 镜像。
- **用 uv 装出了 0.5.9。** 旧版 uv 没加 `--prerelease=allow`。
- **以为默认是 lpm。** 默认是 `fcfs`；设了 `lpm` 后，队列超过 128 时那一轮也会退化成 FCFS。
- **`--schedule-policy priority` 启动失败。** 优先级调度用 `--enable-priority-scheduling`，策略保持 `fcfs` 或 `lof`。
- **开了投机解码，高并发吞吐反而下降。** 一方面并发被自动限制在 48，另一方面大批下验证开销抵消收益。
- **投机解码设了 topk>1 报错。** 重叠调度只支持 topk=1，要么改成 1，要么关闭重叠。
- **旧教程的 `--enable-dp-attention`。** 仍可用但已废弃，改用 `--attn-dp-size`。
- **用 `--dp-size` 做生产数据并行。** 官方不推荐，改用 Model Gateway。
- **`--api-key` 和多分词进程冲突。** `--tokenizer-worker-num > 1` 时设置 API key 会直接启动失败。
- **网关和服务抢同一个端口。** SMG 和 SGLang 默认都是 30000。
- **P/D 没有 RDMA。** 用 TCP 传 KV，传输时间往往抵消分离带来的收益，只适合功能验证。
- **功能组合没有回归。** 0.5.22 修复了混合线性注意力模型在“投机解码 + 结构化输出”同时使用时恢复到错误状态的问题。每种功能单独可用，不代表组合起来正确，上线的组合要单独做质量回归。
- **按 Cookbook 抄参数却换了硬件。** 推荐配置往往针对特定 GPU 和并行方式，换卡后要重新确认注意力后端、MoE 后端和量化格式的支持情况。

## 版本与变化

截至 2026 年 10 月 27 日，SGLang 最新正式版是 **0.5.22**（2026-10-19），前几个版本是 0.5.21（10-02）、0.5.20（09-18）、0.5.19（09-05），大约两到三周一个版本，每版合入数百个 PR。近期值得关注的变化：

| 版本 | 变化 | 对使用者的影响 |
| --- | --- | --- |
| 0.5.20 | 退役 CUDA 12 构建；Responses API 的存储改为 `--enable-response-store` 才开启；Intel XPU 进入正式镜像；新增 CPU 上运行真实调度器的 SGLang Simulator | 旧驱动环境不能直接升级；依赖 `previous_response_id` 的应用要加开关 |
| 0.5.21 | 前缀缓存核心默认改用 Rust；P/D 实例可在线切换角色；新增 `/v1/decisions`、`/v1/score` | 前缀缓存行为不变，性能相关回归要重测 |
| 0.5.22 | 要求 Python 3.11+；Apple Silicon 新增 PyTorch 后端；InstantTensor 加载器加快模型加载；P/D 在长提示负载上吞吐提升、P95 TTFT 下降；HiSparse 支持 EAGLE 和 MTP；修复投机解码 + 结构化输出组合下的状态恢复错误 | Python 3.10 环境要先升级；使用该组合的混合模型应升级 |

另外几处参数层面的变化，在升级旧配置时最容易碰到：CUDA Graph 参数改成按 Decode/Prefill 分开的写法，Prefill 默认启用可中断图；DP Attention 的开关从 `--enable-dp-attention` 迁移到 `--attn-dp-size`（旧写法 2026 年底移除）；命令行入口新增 `sglang serve`。升级时保留镜像摘要、启动参数、模型与对话模板版本以及升级前后的压测结果，先读发布说明末尾的不兼容变更，再看性能数字。

SGLang 的核心可以归结为几层：进程上把分词、调度执行、反分词分开，用 ZMQ 串起来；调度上以基数树前缀缓存为中心，默认 FCFS、可选缓存感知策略，并让 CPU 组批与 GPU 计算重叠；规模上用 DP Attention、专家并行、P/D 分离和 Model Gateway 支撑大型 MoE 模型的多机部署。它和 vLLM 的能力大部分重叠，差别在默认取舍和对特定模型、特定规模的打磨程度。

vLLM 和 SGLang 都是“通用开源引擎”。如果模型和 GPU 都固定在 NVIDIA 生态内、愿意多花适配成本换极致性能，还有另一条路线：下一篇看 [TensorRT-LLM](./03-tensorrt-llm.md)。
