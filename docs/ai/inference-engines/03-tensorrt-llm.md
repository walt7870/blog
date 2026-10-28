# 03. TensorRT-LLM：NVIDIA 自家的推理库

资料助手已经在 vLLM 和 SGLang 上跑通了。团队的机器全是 NVIDIA GPU，今年还要上一批 Blackwell，于是有人问：NVIDIA 自己出的 TensorRT-LLM 会不会更快？换过去要付出什么？

TensorRT-LLM 是 NVIDIA 开源的大模型推理库，目标是把最新的模型、最新的低精度格式和最新的 GPU 特性尽快组合到一起：Hopper 的 FP8、Blackwell 的 NVFP4、NVLink 上的大规模专家并行，通常最先在这里出现。它最初建立在 TensorRT 编译器上，先把模型编译成“引擎”文件再运行；从 1.0 起，默认路径换成了基于 PyTorch 的运行时，直接加载 Hugging Face 检查点。名字里的 TensorRT 是历史留下的，理解这一点能省掉很多误会。

这一篇讲清楚：它的两条流程怎样演变，当前版本一个请求经过哪些进程和模块；怎样用 LLM API、`trtllm-serve`、`trtllm-bench` 三个入口；调度、KV Cache、量化、投机解码、并行和 P/D 分离各自怎样配置；它和 Triton Inference Server、NVIDIA Dynamo 的关系；部署和调参的要点，以及换过来的真实成本。机制原理在[推理优化系列](../llm-inference/index.md)里已经讲过，这里只讲 TensorRT-LLM 怎样实现、怎样配置。

本篇以 GitHub 上最新的正式版 **TensorRT-LLM 1.2.1**（2026 年 4 月 20 日发布）为准，参数名和默认值逐项对照了这个版本的源码。之后只有预发布版本，最新是 1.4.0rc1（2026 年 10 月 22 日），其中已经删除了旧的 TensorRT 引擎流程，文中会单独标出。本站没有在 GPU 上运行这些命令，显存数字是按[第 4 篇](../llm-inference/04-memory-budget.md)的公式手算的估计。

## 名字里的 TensorRT：两条流程的更替

先看 TensorRT-LLM 的“出身”，因为网上大量教程还停留在旧流程，照着做会和当前版本对不上。

2023 年 10 月发布的 0.5.0 是第一个版本。那时的用法分三步：用每个模型目录下的 `convert_checkpoint.py` 把 Hugging Face 权重转成 TensorRT-LLM 自己的检查点格式；再用 `trtllm-build` 调用 TensorRT 把模型编译成引擎文件；最后由 C++ 运行时加载引擎提供服务。编译能做激进的算子融合和内核选择，代价是引擎和构建时的条件绑在一起：GPU 架构、张量并行数、`max_batch_size`、`max_num_tokens`、最大序列长度都在构建时定死，改任何一项都要重新构建，换一种卡也要重新构建。新模型要先有人写好 TensorRT 网络定义才能用。

为了降低这个门槛，NVIDIA 在 0.x 后期加入了基于 PyTorch 的后端：模型用普通的 PyTorch 代码定义，关键算子（注意力、MoE、量化 GEMM、通信）调用同样的高性能内核，不再经过 TensorRT 编译。2025 年 9 月的 **1.0** 把它定为默认：发布说明写的是“PyTorch 架构已稳定并成为默认体验，LLM API 已稳定”，`LLM` 类和 `trtllm-serve` 的默认后端都改成了 PyTorch，文档也改为以 PyTorch 流程为主。

![上方是旧流程：HF 检查点经转换脚本和 trtllm-build 编译成绑定 GPU 与上限参数的引擎；下方是 1.0 起默认的 PyTorch 流程：直接加载 HF 或 ModelOpt 检查点、预热、分配 KV 后服务；底部是 2023 年到 2026 年的版本时间线](/ai/inference-engines/trtllm-workflow.svg)

上半部分的五步里，红色的“引擎文件”是旧流程成本的来源：它把运行时的上限冻结在了构建时。下半部分没有这个环节，调整批大小、上下文长度、并行方式只需要改配置后重启。时间线说明了当前的状态：

| 版本 | 日期 | TensorRT 引擎流程的状态 |
| --- | --- | --- |
| 0.5.0—0.21.0 | 2023-10 到 2025-08 | 主线；后期加入 PyTorch 后端 |
| 1.0 | 2025-09-24 | PyTorch 成为默认；TensorRT 后端保留 |
| 1.2.1（最新正式版） | 2026-04-20 | 仍可用：`from tensorrt_llm._tensorrt_engine import LLM`、`trtllm-build`、`trtllm-serve --backend tensorrt` |
| 1.3.0rc20（预发布） | 2026-06-30 | 发布说明声明这是最后一个支持 TensorRT 后端的版本 |
| 1.3.0rc21（预发布） | 2026-07-15 | 删除 TensorRT 后端的 Python 模块、示例、测试和对应的 Triton 后端 |
| 1.4.0rc1（预发布） | 2026-10-22 | 只有 PyTorch 后端 |

1.3 系列一直停在预发布（最后是 1.3.0rc29），没有出正式版，版本号直接进入 1.4.0 预发布。所以在 2026 年 10 月这个时间点，**正式版 1.2.1 同时带着两条流程，预发布版只剩 PyTorch**。官方在线文档跟随主分支，已经有“TensorRT Backend Removed”迁移页：`LLM(backend="tensorrt")` 会抛 `ValueError`，`trtllm-build`、`trtllm-refit`、`trtllm-prune` 和各模型的 `convert_checkpoint.py` 都不再存在。新项目没有理由再走引擎流程；手里还有旧引擎的服务，迁移方式就是不再转换和构建，直接把 Hugging Face 检查点交给 `LLM` 或 `trtllm-serve`，参数从 `TrtLlmArgs` 换到 `TorchLlmArgs`。

下文除特别说明外，讲的都是默认的 PyTorch 后端。

## 一个请求经过哪些进程和模块

推理系列[第 7 篇](../llm-inference/07-request-path.md)讲过一个请求从 HTTP 入口到反分词的通用路径。TensorRT-LLM 把这条路径分在两类进程里。

![trtllm-serve 主进程负责 HTTP 接口、对话模板与分词，持有 LLM 对象和 GenerationExecutorProxy，通过 ZMQ IPC 把请求交给每个 GPU rank 上的 MPI 工作进程；工作进程里的 PyExecutor 循环依次取请求、调度、分配 KV、执行前向、采样并交回结果](/ai/inference-engines/trtllm-architecture.svg)

左边的主进程是 `trtllm-serve` 启动的 Python 进程。它用 FastAPI 提供 OpenAI 兼容接口，套用对话模板、分词和反分词，解析推理模型的思考内容和工具调用，然后把请求交给 `LLM` 对象。`LLM` 内部的 `GenerationExecutorProxy` 并不自己算，它通过 ZMQ 的进程间队列把请求发给工作进程。

右边的工作进程每张 GPU（准确地说是每个 rank）一个，由 MPI 拉起。张量并行设成 2，就有两个工作进程，它们每一步同步推进。每个工作进程里运行 `PyExecutor` 的后台循环，图中 ①—⑥ 就是一轮循环：

1. **取请求**：从请求队列取新到的请求，多卡时由 rank 0 广播给其他 rank。
2. **Scheduler**：在 `max_batch_size`（同时处理多少个请求）和 `max_num_tokens`（这一步最多处理多少个 token）两个预算内选出这一批，已经在生成阶段的请求优先排入，剩余预算再给新请求做 Prefill。这就是推理系列[第 9 篇](../llm-inference/09-continuous-batching.md)的连续批处理，NVIDIA 的文档里叫 in-flight batching（IFB）。
3. **KVCacheManager**：为这一批分配 KV 块，查找可复用的前缀。
4. **ModelEngine**：准备输入张量，执行模型前向。模型是 `tensorrt_llm/_torch/models/` 下的 PyTorch 代码，注意力默认用 `TRTLLM` 后端（NVIDIA 自己的注意力内核），也可以设 `attn_backend` 换成 `FLASHINFER` 或调试用的 `VANILLA`。纯 Decode 的批走预先录好的 CUDA Graph。
5. **Sampler**：对 logits 采样、判断停止条件、计算 logprobs。默认的 `sampler_type: auto` 在非束搜索时使用 `TorchSampler`，1.2 起批量采样默认借助 FlashInfer 的内核。
6. **交回结果**：输出经 IPC 回到主进程，由主进程反分词后流式推给客户端。

图左下角的重叠调度是 PyExecutor 的默认行为：GPU 开始执行第 n+1 步的前向时，CPU 才去处理第 n 步的采样结果（检查停止条件、更新输出、准备下一批）。这样 CPU 的工作被藏在 GPU 计算后面，代价是每个请求在结束时多算一步。它由 `disable_overlap_scheduler` 控制，默认 `false`，也就是开启；两模型的投机解码和 P/D 分离里的 context 实例需要关掉它，下文会提到。

还有一点和“PyTorch 后端”这个名字容易产生的印象不同：调度器（容量调度和微批调度）、KV 块管理、P/D 的 KV 传输等核心算法仍在 C++ 的 `batch_manager` 里，Python 通过绑定调用。PyTorch 后端改变的是“模型怎样定义和执行”，不是把整个运行时改写成 Python。

## 三个入口：LLM API、trtllm-serve、trtllm-bench

### LLM API：在 Python 里直接用

`LLM` 类是所有入口的基础，`trtllm-serve` 和 `trtllm-bench` 都在它上面搭建：

```python
# 运行环境：TensorRT-LLM 1.2.1 容器或 pip 安装环境，Linux + NVIDIA GPU
from tensorrt_llm import LLM, SamplingParams
from tensorrt_llm.llmapi import KvCacheConfig

llm = LLM(
    model="Qwen/Qwen3-8B",                # HF 模型名、本地 HF 目录或 ModelOpt 量化检查点
    max_seq_len=16384,
    enable_chunked_prefill=True,
    kv_cache_config=KvCacheConfig(free_gpu_memory_fraction=0.85),
)

params = SamplingParams(temperature=0.6, top_p=0.95, max_tokens=512)
for out in llm.generate(["员工请年假要提前几天申请？"], params):
    print(out.outputs[0].text)
```

`LLM` 的参数就是 `TorchLlmArgs` 的字段，层级较深的配置（KV Cache、CUDA Graph、投机解码、MoE）用对应的配置类传入。`llm.generate_async` 提供异步和流式接口。源码里每个字段带有 `beta` 或 `prototype` 稳定性标记，API 参考页也会标出；1.0 之后 NVIDIA 承诺稳定字段在后续版本保持兼容，`prototype` 字段可能随时改名或删除。

### trtllm-serve：OpenAI 兼容服务

```bash
trtllm-serve Qwen/Qwen3-8B --host 0.0.0.0 --port 8000 --config ./qwen3-8b.yaml
```

命令行只暴露了常用的十几个选项（批大小、token 预算、并行数、KV 显存比例、推理与工具解析器等），其余全部通过 `--config` 指定的 YAML 文件设置。`--config` 和旧名 `--extra_llm_api_options` 是同一个选项，YAML 的内容就是 `TorchLlmArgs` 的字段，嵌套字段按层级写，YAML 里的值覆盖命令行的值。这和 vLLM 把几乎所有参数都做成命令行选项的习惯不同，迁移时要先建立“改配置就是改 YAML”的认识。

1.2.1 提供的主要接口：

| 路径 | 用途 | 说明 |
| --- | --- | --- |
| `/v1/chat/completions`、`/v1/completions` | OpenAI 对话与补全 | 支持流式、`n > 1`、`response_format`（需启动时开启结构化输出） |
| `/v1/responses` | OpenAI Responses API | 1.2 起支持 GET/DELETE `/v1/responses/{id}` |
| `/v1/models`、`/version` | 模型列表、版本 | |
| `/health`、`/health_generate` | 存活检查；后者实际生成一次 | 就绪探针用 `/health` |
| `/metrics` | 迭代级统计（JSON） | 需要 `enable_iter_perf_stats: true`；取出即从队列删除 |
| `/prometheus/metrics` | Prometheus 指标 | 仅在 `return_perf_metrics: true` 时挂载 |
| `/kv_cache_events` | KV 块事件 | 供 Dynamo 等外部路由器做 KV 感知路由 |

还有两个 `trtllm-serve` 的子命令：`trtllm-serve disaggregated` 启动 P/D 分离的编排服务（后文），`trtllm-serve mm_embedding_serve` 单独部署多模态编码器。

### trtllm-bench：离线压测

`trtllm-bench` 绕过 HTTP，直接用数据集压 `LLM`，用来复现 NVIDIA 公布的性能数字，或比较两组配置：

```bash
# 生成 1000 条输入 128、输出 128 token 的合成请求
trtllm-bench --model Qwen/Qwen3-8B prepare-dataset \
  --output /tmp/synthetic_128_128.txt \
  token-norm-dist --input-mean 128 --output-mean 128 \
  --input-stdev 0 --output-stdev 0 --num-requests 1000

# 吞吐测试；--config 传同一份 YAML
trtllm-bench --model Qwen/Qwen3-8B throughput \
  --dataset /tmp/synthetic_128_128.txt --config ./qwen3-8b.yaml
```

`throughput` 默认后端是 pytorch，加 `--streaming` 会额外统计 TTFT 和 token 间延迟；`latency` 子命令测低并发延迟。数据集是一行一个 JSON，字段为 `task_id`、`prompt` 或 `input_ids`、`output_tokens`。它自带的量化配置只覆盖 FP8 和 NVFP4。离线压测反映的是引擎上限，上线前还要用真实请求分布压 `trtllm-serve`（仓库里带 `tensorrt_llm.serve.scripts.benchmark_serving`），指标口径见推理系列[第 20 篇](../llm-inference/20-benchmark.md)。另一个工具 `trtllm-eval` 用来在常见基准上做精度回归。

## 资料助手上线：H100 上跑 Qwen3-8B

### 用 NGC 容器启动

NVIDIA 在 NGC 上发布了每个版本的容器，这是最省事的安装方式，1.2.1 对应 `nvcr.io/nvidia/tensorrt-llm/release:1.2.1`。在一台装好驱动和 NVIDIA Container Toolkit 的 Linux 机器上：

```bash
mkdir -p ~/trtllm-work && cd ~/trtllm-work
cat > qwen3-8b.yaml <<'EOF'
max_batch_size: 64
max_num_tokens: 8192
max_seq_len: 16384
enable_chunked_prefill: true
kv_cache_config:
  free_gpu_memory_fraction: 0.85
  enable_block_reuse: true
cuda_graph_config:
  enable_padding: true
  max_batch_size: 64
enable_iter_perf_stats: true
EOF

docker run --rm -it --ipc host --gpus '"device=0"' \
  --ulimit memlock=-1 --ulimit stack=67108864 \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  -v "$PWD":/workspace -w /workspace \
  nvcr.io/nvidia/tensorrt-llm/release:1.2.1 \
  trtllm-serve Qwen/Qwen3-8B --host 0.0.0.0 --port 8000 \
    --reasoning_parser qwen3 --config /workspace/qwen3-8b.yaml
```

几处要留意：`--host 0.0.0.0` 不能省，`trtllm-serve` 的默认监听地址是 `localhost`，在容器里只监听回环地址，宿主机的端口映射就访问不到；`--ipc host` 和两个 `ulimit` 来自官方示例，多卡通信需要；`--reasoning_parser qwen3` 让 Qwen3 的思考内容进入 `reasoning_content` 字段。服务就绪后：

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/health   # 200 表示就绪
curl http://localhost:8000/v1/chat/completions -H "Content-Type: application/json" -d '{
  "model": "Qwen/Qwen3-8B",
  "messages": [{"role": "user", "content": "员工请年假要提前几天申请？"}],
  "max_tokens": 512
}'
```

不用容器时，也可以 `pip install tensorrt_llm`。PyPI 上的 1.2.1 只是一个约 10 KB 的源码包，实际的二进制包在 NVIDIA 自己的索引 `pypi.nvidia.com` 上，只有 Linux x86_64（Python 3.10、3.12）和 aarch64（Python 3.12）版本。官方安装页要求先装 CUDA 13.1 工具包、与之匹配的 `torch==2.9.1`（cu130 版本）和 `libopenmpi-dev`；pip 有时会把已装好的 CUDA 13 版 PyTorch 替换成 CUDA 12.8 版，导致运行时报错，官方建议用约束文件锁住 torch 版本。依赖这么多，生产环境更推荐直接用容器镜像。

### 启动日志里的显存账

TensorRT-LLM 分配 KV Cache 的方式和 vLLM 不同，值得对着日志算一遍。它先加载权重，再用一批假请求试跑一次，记下峰值显存（PyTorch 分配的部分加上 NCCL、CUDA Graph 等 PyTorch 之外的部分），然后：

```text
KV 可用显存 = (GPU 总显存 − 试跑峰值) × free_gpu_memory_fraction
```

按 H100 80GB、Qwen3-8B BF16 手算（激活与其他开销是估计值）：

```text
GPU 总显存（系统显示）                 ≈ 79.6 GiB
权重：8.2B 参数 × 2 字节               ≈ 15.3 GiB
试跑时的激活峰值与 PyTorch 外开销       ≈ 4 GiB（估计）
剩余                                   ≈ 79.6 − 19.3 = 60.3 GiB
× 0.85                                 ≈ 51 GiB 给 KV

Qwen3-8B 每个 token 的 KV：2 × 36 层 × 8 个 KV 头 × 128 维 × 2 字节 = 144 KiB
51 GiB ÷ 144 KiB                       ≈ 37 万个 token，按每块 32 token 约 1.16 万个块
```

日志里对应的是 `Peak memory during memory usage profiling` 和 `available KV cache memory when calculating max tokens` 两行，用它们核对上面的估计。这里的比例乘的是**剩下的**显存，而 vLLM 的 `gpu_memory_utilization`（0.32.0 默认 0.92）乘的是**总**显存；两个框架的“0.9”不能直接对比，迁移时要按各自的公式重算。默认值 0.9 在单独占卡时通常可用；出现显存不足时，官方部署指南建议降到 0.7 或更低，同卡还有别的进程时也要预留余量。

如果把 KV 设成 FP8（`kv_cache_config.dtype: fp8`），每个 token 减到 72 KiB，同样的显存能放约 74 万个 token；换用 NVIDIA 发布的 FP8 预量化检查点 `nvidia/Qwen3-8B-FP8`，权重也几乎减半，余下的显存再给 KV。它们的取舍在后文的量化一节。

### 一个失败案例：长文档请求被直接拒绝

假设没有写上面 YAML 里的 `enable_chunked_prefill: true`，其他保持默认。资料助手把一份 1.2 万 token 的员工手册连同问题发过来，服务没有排队、也没有截断，而是立刻返回错误，日志里是这样一句：

```text
The sum of prompt length (12000.0), query length (0) should not exceed max_num_tokens (8192)
```

原因在 `LLM` 的参数检查：PyTorch 后端在**没有开启分块预填充**时，要求一个请求的整段输入能在一步内处理完，也就是输入长度不能超过 `max_num_tokens`，而它的默认值是 8192。vLLM 和 SGLang 默认开启分块预填充，同样的请求会被切成几段处理，换到 TensorRT-LLM 就踩了这个默认值差异。

两种修法：开启 `enable_chunked_prefill`，让长输入按块分几步做 Prefill（推理系列[第 11 篇](../llm-inference/11-chunked-prefill.md)讲过它对 TTFT 和 TPOT 的影响，NVIDIA 的调度文档也建议总是开启）；或者把 `max_num_tokens` 调到大于最长输入，但这会让每一步的激活和工作区变大，挤占 KV 显存，还会让长请求的 Prefill 拖慢同批其他请求的生成。资料助手这类长输入多的场景，选前者。

## 调度与 KV Cache：IFB、分页、复用

### 三个上限怎样一起起作用

| 参数 | 含义 | 1.2.1 默认 |
| --- | --- | --- |
| `max_batch_size` | 同时在运行的请求数上限 | 2048 |
| `max_num_tokens` | 一步之内所有请求的 token 总数上限（去掉填充后） | 8192 |
| `max_seq_len` | 单个请求输入加输出的最大长度 | 从模型配置推导（Qwen3-8B 是 40960） |

调度器每一步先把生成阶段的请求排进来（每个只占 1 个 token，投机解码时更多），剩余的 token 预算再给新请求做 Prefill，任一上限碰到就停。默认的 2048 并不意味着真能同时跑 2048 个请求，KV 放不下时调度器就不再接纳新请求。实际设置时，`max_batch_size` 应该接近真实的峰值并发，`cuda_graph_config` 的批大小要覆盖它；`max_num_tokens` 决定一步能塞多少 Prefill，调大能提高吞吐，但会抬高同批请求的 TPOT 和激活显存。官方给 Qwen3-30B-A3B 的推荐配置是 `max_batch_size: 161`、`max_num_tokens: 1160`，说明这两个值要按模型和负载压出来，没有通用答案。

容量调度策略由 `scheduler_config.capacity_scheduler_policy` 决定，默认 `GUARANTEED_NO_EVICT`：只有确定能为请求一直保留 KV 时才开始执行它，开始后不会被暂停，延迟稳定，但接纳得保守。`MAX_UTILIZATION` 尽量多塞请求，KV 不够时暂停一部分，吞吐更高、尾延迟变差。还有 `STATIC_BATCH`，按静态批的方式处理。

### 分页 KV 与跨请求复用

KV Cache 是一个块池，每块存 `tokens_per_block` 个 token（默认 32），原理和推理系列[第 8 篇](../llm-inference/08-paged-attention.md)的分页一致。一个块里打包了所有层，所以层数相同、KV 头数和注意力窗口不同的层（比如滑动窗口与全注意力交替的模型）会分到不同的池里。

块写满后会挂到一棵基数树上，新请求进来时按前缀查找，命中的块直接复用，不再计算，这对应[第 10 篇](../llm-inference/10-prefix-cache.md)的前缀缓存。1.2.1 里和复用相关的开关：

| 配置 | 默认 | 作用 |
| --- | --- | --- |
| `kv_cache_config.enable_block_reuse` | `true` | 跨请求复用 KV 块 |
| `enable_partial_reuse` / `copy_on_partial_reuse` | `true` / `true` | 只匹配了一部分的块也能复用；被占用时先复制再用 |
| `host_cache_size` | 不设（不启用） | 从显存淘汰的块先下沉到主机内存，命中时再拷回 |
| `secondary_offload_min_priority` | 文档说明为 35 | 优先级低于它的块不下沉，直接丢弃 |
| `event_buffer_max_size` | 0 | 大于 0 时记录 KV 块事件，供外部路由器使用 |

淘汰按优先级加 LRU：块的优先级在 0 到 100 之间，默认 35，同优先级时先淘汰最久未用的。请求可以带 `KvCacheRetentionConfig`，给某些 token 区间（比如资料助手固定的系统提示）设更高优先级和持续时间，让它们更晚被淘汰。多租户场景还有 KV 缓存加盐：请求带 `cache_salt` 时，只有盐相同的请求之间才复用，避免一个租户通过命中时间推测另一个租户的提示词。

两个限制：当前只有叶子块能被淘汰，对滑动窗口层不够理想；多模态模型在 `trtllm-serve` 下需要关闭块复用（官方文档的多模态示例就是 `enable_block_reuse: false`）。

## 量化：ModelOpt 负责产出，TensorRT-LLM 负责运行

TensorRT-LLM 的量化分工很明确：量化本身由 **NVIDIA Model Optimizer**（ModelOpt，仓库 `NVIDIA/Model-Optimizer`）离线完成，产出带量化配置的 Hugging Face 格式检查点；TensorRT-LLM 读到这个配置就选用对应的内核。量化原理见推理系列[第 14 篇](../llm-inference/14-quantization.md)。

最省事的是直接用 NVIDIA 在 Hugging Face 上发布的预量化检查点，比如 `nvidia/Qwen3-8B-FP8`、`nvidia/Llama-3.1-8B-Instruct-FP8`，把模型名换掉即可。没有现成检查点时自己量化：

```bash
git clone https://github.com/NVIDIA/Model-Optimizer.git
cd Model-Optimizer/examples/llm_ptq
scripts/huggingface_example.sh --model Qwen/Qwen3-8B --quant fp8
# 需要 NVFP4 KV Cache 时，权重必须是 FP8：
scripts/huggingface_example.sh --model Qwen/Qwen3-8B --quant fp8 --kv_cache_quant nvfp4
```

量化要用一部分校准数据跑模型，需要一张能放下原模型的 GPU。量化后要用 `trtllm-eval` 或自己的业务评测集确认质量，不能只看能否启动。

格式能不能用，首先取决于 GPU 架构。下表整理自 1.2.1 文档的硬件支持矩阵（Y 表示支持）：

| 格式 | Blackwell 数据中心卡（sm100/103，B200/B300） | Blackwell sm120（RTX PRO 6000 等） | Hopper（H100/H200） | Ada（L40S 等） | Ampere（A100） |
| --- | --- | --- | --- | --- | --- |
| NVFP4 权重与激活 | Y | Y | — | — | — |
| MXFP4（GPT-OSS） | Y | Y | — | — | — |
| FP8 per-tensor | Y | Y | Y | Y | — |
| FP8 block scaling | Y | — | Y | — | — |
| FP8 rowwise | — | — | Y | — | — |
| FP8 KV Cache | Y | Y | Y | Y | Y |
| NVFP4 KV Cache | Y | — | — | — | — |
| W4A8 AWQ / GPTQ | Y | — | Y | Y | — |
| W4A16 AWQ / GPTQ（INT4 权重） | Y | — | Y | Y | Y |

读这张表的几个要点：NVFP4 需要 Blackwell 的 FP4 张量核心，H100 上无法运行 `-NVFP4` 检查点；FP8 计算从 Ada 和 Hopper 开始才有，A100 上只能用 INT4 权重量化（W4A16）和 FP8 KV；Blackwell 上的 FP8 block scaling 实际走的是 MXFP8 配方（缩放因子格式和 Hopper 不同），跨代迁移时要重新验证精度。另外还有一张“模型支持矩阵”，某个模型支持哪些格式要单独查，比如文档里 Qwen3 支持 NVFP4、FP8、FP8/NVFP4 KV 和 W4A16 AWQ/GPTQ，但没有 W4A8 AWQ。

KV Cache 的精度可以单独设：`kv_cache_config.dtype: fp8` 对没有 FP8 KV 的检查点也能手动打开，每个 token 的 KV 减半；`nvfp4` 需要 ModelOpt 离线生成，并且当前只能和 FP8 权重组合。

对资料助手：H100 上，`nvidia/Qwen3-8B-FP8` 加 FP8 KV 是收益最直接的组合，权重和 KV 都约减半；以后换到 B200，再评估 NVFP4。注意这个 FP8 检查点的模型卡把 Blackwell 列为支持的架构、在 B200 上测试，按上表 FP8 per-tensor 在 Hopper 上同样支持，但在 H100 上的精度要自己验证一遍。

## 投机解码：一模型与两模型

投机解码的原理见推理系列[第 15 篇](../llm-inference/15-speculative-decoding.md)。TensorRT-LLM 的 PyTorch 后端有两种实现：

- **一模型（one model）**：把起草模块作为子模块插进目标模型，整个起草循环可以录进一个 CUDA Graph，低延迟场景最快，但不支持动态草稿长度，只覆盖部分模型和算法。
- **两模型（two model）**：由 PyExecutor 在调度前生成草稿 token，挂到请求上再交给目标模型。更灵活，但不支持重叠调度，启用时会自动关闭它。

1.2.1 文档列出的组合：

| 算法 | 一模型 | 两模型 | 配置类 / `decoding_type` |
| --- | --- | --- | --- |
| EAGLE-3 | Llama 4 Maverick | Llama 4 Maverick、Llama 3.1 8B、Llama 3.3 70B | `EagleDecodingConfig` / `Eagle` |
| MTP | DeepSeek V3/R1（另有 EAGLE 式 MTP） | — | `MTPDecodingConfig` / `MTP` |
| 草稿模型（draft/target） | — | 所有模型 | `DraftTargetDecodingConfig` / `DraftTarget` |
| NGram（提示词查找） | — | 所有模型 | `NGramDecodingConfig` / `NGram` |
| 用户自定义起草器 | — | 所有模型 | `UserProvidedDecodingConfig` |

文档还提到 Qwen3、gpt-oss-120b 等模型的 EAGLE-3 草稿权重在 NVIDIA 的 Speculative Decoding Modules 集合里；模型特性矩阵里 Qwen3 MoE、GPT-OSS 的 EAGLE-3 一模型和两模型都标为支持。另有 `decoding_type: AUTO`，自动选一个不需要草稿模型的方法。`MedusaDecodingConfig`、`LookaheadDecodingConfig` 只支持旧的 TensorRT 后端，在默认后端上不能用。

在 `trtllm-serve` 里，投机解码只能写在 YAML 中：

```yaml
speculative_config:
  decoding_type: Eagle
  max_draft_len: 3
  speculative_model: yuhuili/EAGLE3-LLaMA3.1-Instruct-8B
  eagle3_one_model: false      # 1.2.1 源码默认 true；两模型时需同时关闭重叠调度
disable_overlap_scheduler: true
```

有三个容易忽略的限制。第一，每个请求只起草一条长度为 `max_draft_len` 的链，不支持树形草稿。第二，文档明确说 1.2.1 没有办法按负载动态关闭投机，所以“加速只在低批量时可见”，高并发下反而浪费算力；资料助手白天高峰并发高，夜间低，要分别压测。第三，`eagle3_one_model` 在源码里默认是 `true`，而文档示例设成了 `false`，照抄示例时实际跑的是哪种实现要以配置为准。预发布版在这方面变化很大：1.3.0rc25 起两模型实现被强制回退为一模型，升级时要重新验证。

## 并行：从 TP 到 Wide-EP

多卡的原理见推理系列[第 16 篇](../llm-inference/16-distributed.md)。TensorRT-LLM 按模块分别选择并行方式：

| 模块 | 方式 | 配置 |
| --- | --- | --- |
| 整体 | 张量并行 TP、流水线并行 PP | `tensor_parallel_size`、`pipeline_parallel_size`（命令行 `--tp_size`、`--pp_size`） |
| 注意力 | TP（适合小批量）或数据并行 DP（适合大批量） | `enable_attention_dp: true` 时权重复制、KV 按请求分到各 rank |
| MoE 层 | 专家内切分（TP）、专家分布（EP）或两者混合 | `moe_tensor_parallel_size × moe_expert_parallel_size` 必须等于 `tensor_parallel_size` |
| 长上下文 | 上下文并行 CP、Helix 并行（1.2 新增） | `context_parallel_size` 等 |
| 大规模 MoE | Wide-EP：专家槽位与专家解耦，热门专家可复制，配合离线或在线 EPLB 负载均衡 | `moe_config.load_balancer` 等，示例在 `examples/wide_ep/` |

“注意力 DP + MoE EP”是 DeepSeek、Qwen3 MoE 这类模型在大批量吞吐场景的常用组合，官方 Qwen3 推荐配置就开了 `enable_attention_dp: true`。Wide-EP 的通信内核专门针对 GB200 的多节点 NVLink（MNNVL）优化，这是 NVIDIA 在自己硬件上的独门优势，也意味着在普通 InfiniBand 集群上收益不同。

多机部署靠 MPI：在 Slurm 集群上用 `srun` 拉起所有 rank，每个 rank 执行 `trtllm-llmapi-launch trtllm-serve ...`，由这个包装脚本协调；不用 Slurm 时用 `mpirun`，需要节点间免密 SSH。1.2 新增了 `orchestrator_type: ray`（原型），用 Ray 代替 MPI 管理工作进程。特性组合要查官方的“特性组合矩阵”：比如 MTP 和 EAGLE-3 都不能和 PP 一起用，LoRA 不能和 CUDA Graph 一起用。

资料助手的 Qwen3-8B 一张 H100 就放得下，不需要并行；想提高吞吐时，多开几个单卡副本、在前面做负载均衡，通常比 TP=2 更划算。

## P/D 分离：两类实例与一个编排服务

P/D 分离的原理和取舍见推理系列[第 17 篇](../llm-inference/17-pd-disaggregation.md)。TensorRT-LLM 把 Prefill 实例叫 context 服务，Decode 实例叫 generation 服务，自带一个最简单的编排方式：

![客户端请求先到 trtllm-serve disaggregated 编排服务；编排服务先发 context-only 请求给 context 服务，拿到首 token 和 ctx_params 后，再发 generation-only 请求给 generation 服务；generation 服务凭 ctx_params 通过 NIXL 或 UCX 从 context 服务的显存拉取 KV，逐 token 生成并经编排服务返回；也可以用 Dynamo 替代编排服务](/ai/inference-engines/trtllm-disagg.svg)

图中的关键是 ③ 返回的 `ctx_params`：它记录了这次 Prefill 在哪个 context 实例上、KV 块在哪里，generation 服务凭它直接从对方显存读取 KV（⑤），KV 不经过编排服务。启动方式是先起两类 `trtllm-serve`，再起编排服务：

```bash
# context 服务两个（官方示例对 context 服务关闭重叠调度）
cat > ctx.yaml <<'EOF'
disable_overlap_scheduler: true
cache_transceiver_config:
  backend: UCX
  max_tokens_in_buffer: 16384
EOF
CUDA_VISIBLE_DEVICES=0 trtllm-serve Qwen/Qwen3-8B --port 8001 --config ctx.yaml &> log_ctx_0 &
CUDA_VISIBLE_DEVICES=1 trtllm-serve Qwen/Qwen3-8B --port 8002 --config ctx.yaml &> log_ctx_1 &

# generation 服务一个
cat > gen.yaml <<'EOF'
cache_transceiver_config:
  backend: UCX
  max_tokens_in_buffer: 16384
EOF
CUDA_VISIBLE_DEVICES=2 trtllm-serve Qwen/Qwen3-8B --port 8003 --config gen.yaml &> log_gen_0 &

# 编排服务，对外监听 8000
cat > disagg.yaml <<'EOF'
hostname: localhost
port: 8000
backend: pytorch
context_servers:
  num_instances: 2
  urls: ["localhost:8001", "localhost:8002"]
generation_servers:
  num_instances: 1
  urls: ["localhost:8003"]
EOF
trtllm-serve disaggregated -c disagg.yaml
```

客户端照常向 `localhost:8000/v1/chat/completions` 发请求。三个实例都启动完成后再起编排服务；排查时先看各实例日志里 cache transceiver 是否初始化成功。

`cache_transceiver_config.backend` 可选 `DEFAULT`（即 NIXL）、`NIXL`、`UCX`、`MOONCAKE`（1.2 新增）和已不推荐的 `MPI`；NIXL 底下默认走 UCX，可用环境变量 `TRTLLM_NIXL_KVCACHE_BACKEND=LIBFABRIC` 切换。`max_tokens_in_buffer` 建议不小于最长输入。两类实例可以用不同的并行方式，传输时会做 KV 布局转换。

这套编排适合验证和小规模部署。它的局限也明显：路由是静态 URL 列表，不感知各实例的 KV 命中和负载（1.2 加了服务发现机制，支持动态加入和退出实例）；1.2 的已知问题里还有“context 用 PP、generation 用 TP 时可能卡住”。官方文档把 Dynamo 列为第一种用法：它多了独立的前后处理工作进程、KV 感知路由和 Kubernetes 部署支持，更适合生产。对资料助手这种 8B 模型、单卡就能服务的规模，P/D 分离通常不划算，输入很长且 TTFT 与 TPOT 互相干扰明显时再考虑。

## 和 Triton、Dynamo 的关系

这三个名字经常一起出现，层次不同：

| 组件 | 层次 | 和 TensorRT-LLM 的关系 |
| --- | --- | --- |
| TensorRT-LLM | 推理引擎 | 本篇主角，可以单独用 `trtllm-serve` 提供服务 |
| Triton Inference Server | 通用模型服务器（多框架、多模型） | 通过 TensorRT-LLM 后端把它作为模型之一托管 |
| NVIDIA Dynamo | 数据中心级分布式推理编排 | 把 TensorRT-LLM（以及 vLLM、SGLang）当作工作进程，在上面做路由、P/D 编排和扩缩容 |

**Triton** 曾是 TensorRT-LLM 的主要服务方式，后端源码已经从独立仓库 `triton-inference-server/tensorrtllm_backend` 迁入 TensorRT-LLM 仓库的 `triton_backend/` 目录。1.2.1 里有两种模型仓库：`inflight_batcher_llm` 是 C++ 实现，服务旧流程编出的 TensorRT 引擎；`llmapi` 是 Python 后端，在 `model.yaml` 里写 `backend: "pytorch"` 就能加载 PyTorch 后端，官方把它标为原型，并且当前配置注明“还不支持批处理”（`max_batch_size: 0`）。预发布版 1.3.0rc21 已经删除了 TensorRT 引擎版的 Triton 后端。已经把 Triton 当统一入口的团队（同时托管视觉模型、嵌入模型等）可以继续用 Python 后端，新部署只服务大模型时，`trtllm-serve` 或 Dynamo 更直接。

**Dynamo** 是 NVIDIA 在 2025 年开源的分布式推理框架，在第 08 篇[分布式编排与 KV 缓存组件](./08-orchestration.md)里详细讲。和 TensorRT-LLM 组合时，`python -m dynamo.frontend` 接收 OpenAI 请求并做 KV 感知路由，`python -m dynamo.trtllm --model-path ... --extra-engine-args <YAML>` 作为工作进程，加 `--disaggregation-mode prefill` 或 `decode` 就是 P/D 分离；YAML 就是上面那套 `TorchLlmArgs` 配置。Kubernetes 上的部署由 Dynamo 的 operator 和 CRD 管理，TensorRT-LLM 文档里的 K8s 示例也直接指向 Dynamo。要注意版本：Dynamo 1.6.1 锁定的是预发布版 `tensorrt-llm==1.3.0rc29`，不是正式版 1.2.1，选这条路就等于接受预发布版的变化节奏。

## 支持的模型与硬件

**硬件。** 只支持 NVIDIA GPU，官方支持页列出：Blackwell（B200、GB200、B300、GB300、DGX Spark）、Hopper（H100、H200、GH200）、Ada Lovelace（L20、L40/L40S）、Ampere（A100）。1.2 的发布说明提到扩展了 SM120/SM121 路径（RTX PRO 6000 Blackwell、DGX Spark 等），量化矩阵也单列了 sm120，但 DGX Spark 仍是 beta，只验证了单节点。操作系统只有 Linux，Windows 支持从 0.18 起已弃用；Jetson 只有早年的 `v0.12.0-jetson` 分支。AMD、Intel GPU、Apple Silicon、CPU 都不在范围内。

**模型。** 1.2.1 文档的 PyTorch 后端文本模型表约 23 个架构：DeepSeek-V3/V3.2、GPT-OSS、Llama 2/3/3.1/4、Qwen2/Qwen3/Qwen3 MoE/Qwen3-Next、Gemma 3、Phi-4、Mistral/Mixtral、Nemotron 系列、EXAONE 4.0、MiniMax M2 等，另有 BERT 分类、Qwen2 奖励模型；多模态表有 Qwen2/2.5-VL、LLaVA-NeXT、Llama 4、Gemma 3、Mistral 3、Phi-4-multimodal、Nemotron Nano VL 等。重点模型还有一张特性矩阵，列出每个架构是否支持重叠调度、CUDA Graph、注意力 DP、P/D 分离、分块预填充、MTP、EAGLE-3，并带脚注（比如 MLA 的分块预填充只在 SM100/SM103 上可用）。

和 vLLM 上百种架构相比，这个名单短得多，但覆盖了主流开源模型，NVIDIA 也以“热门模型第一天支持”为目标，常在新模型发布当天跟进 DeepSeek、GPT-OSS、Qwen 这类大模型。名单之外的模型要自己按 `docs/source/models/adding-new-model.md` 用 PyTorch 写模型类，比旧流程写 TensorRT 网络简单很多，但仍需要理解它的注意力元数据、KV 管理和权重加载接口。

其他能力：LoRA（多适配器、HF 与 NeMo 格式，`lora_config` 配置，请求级 `LoRARequest`）、结构化输出（XGrammar 或 LLGuidance，要在启动时于 YAML 里设 `guided_decoding_backend`，之后请求里的 `response_format` 才会按语法约束生成）、束搜索、logprobs、睡眠与唤醒释放显存（`/release_memory`、`/resume_memory`）和在线更新权重（`/update_weights`）。

## 生产部署要点

| 方面 | 做法 |
| --- | --- |
| 镜像 | 固定到 `nvcr.io/nvidia/tensorrt-llm/release:1.2.1` 的摘要，不用浮动标签；NGC 上还有大量 `.dev` 夜间标签和 rc 标签，不要误拉 |
| 配置 | 从仓库 `examples/configs/curated/` 的推荐 YAML（容器内 `/app/tensorrt_llm/examples/configs`）出发，按自己的负载压测调整 |
| 监听与鉴权 | `trtllm-serve` 没有 API key 选项，默认只监听 localhost；对外暴露必须放在网关后面做鉴权和限流（推理系列[第 21 篇](../llm-inference/21-production.md)） |
| 健康检查 | 存活和就绪用 `/health`；`/health_generate` 会真的生成 1 个 token，占用一次推理 |
| 指标 | 设 `return_perf_metrics: true` 后抓取 `/prometheus/metrics`，有 `trtllm_time_to_first_token_seconds`、`trtllm_time_per_output_token_seconds`、`trtllm_request_queue_time_seconds`、`trtllm_e2e_request_latency_seconds` 等；`/metrics` 是 JSON 迭代统计，读一次删一次，适合调试 |
| 多机 | Slurm + `trtllm-llmapi-launch`，或交给 Dynamo |
| Kubernetes | 用 Dynamo 的 operator；或者自己用 Deployment 跑单机 `trtllm-serve`，前面接负载均衡 |
| 首次启动 | 预热和 GEMM 内核自动调优（`enable_autotuner` 默认开启）会拉长启动时间，大模型更久（DeepSeek V3 的 Triton 示例写明首次加载约一小时）；就绪探针的超时要放宽 |

## 关键参数速查

| 参数（YAML 字段） | 1.2.1 默认 | 调整方向 |
| --- | --- | --- |
| `max_batch_size` | 2048 | 设成真实峰值并发附近，并让 CUDA Graph 批大小覆盖它 |
| `max_num_tokens` | 8192 | 吞吐优先调大，TPOT 敏感调小；未开分块预填充时它也是单请求输入上限 |
| `max_seq_len` | 模型配置值 | 只用短上下文时调小，减少预热和最坏情况的 KV 预留 |
| `enable_chunked_prefill` | `false` | 长输入场景设 `true` |
| `kv_cache_config.free_gpu_memory_fraction` | 0.9 | OOM 或同卡有别的进程时降到 0.7 左右；乘的是试跑后的剩余显存 |
| `kv_cache_config.max_tokens` | 不设 | 想精确限制 KV 容量时设，和比例取较小值 |
| `kv_cache_config.dtype` | `auto` | `fp8` 让 KV 减半（先验证精度） |
| `kv_cache_config.enable_block_reuse` | `true` | 多模态服务按文档关闭 |
| `kv_cache_config.tokens_per_block` | 32 | 一般不动 |
| `kv_cache_config.host_cache_size` | 不设 | 前缀复用多、显存紧时设成字节数，启用主机内存二级缓存 |
| `cuda_graph_config.max_batch_size` | 0，即按 128 生成批大小列表 | 和 `max_batch_size` 对齐 |
| `cuda_graph_config.enable_padding` | `false` | 设 `true`，否则不在列表里的批大小（如 50）退回非图模式 |
| `disable_overlap_scheduler` | `false` | 两模型投机解码、P/D 的 context 实例需要 `true` |
| `scheduler_config.capacity_scheduler_policy` | `GUARANTEED_NO_EVICT` | 追求吞吐可试 `MAX_UTILIZATION` |
| `enable_attention_dp` | `false` | MoE 大批量吞吐场景开启 |
| `moe_config.backend` | `CUTLASS` | 按模型和 GPU 试 `TRTLLM`、`DEEPGEMM`、`WIDEEP` 等 |
| `attn_backend` | `TRTLLM` | 一般不动 |
| `guided_decoding_backend` | 不设 | 需要 JSON Schema 输出时设 `xgrammar` |
| `enable_iter_perf_stats` / `return_perf_metrics` | `false` / `false` | 开启后才有 `/metrics` 和 Prometheus 指标，前者有轻微开销 |

CUDA Graph 的默认批大小值得多看一眼：不开填充时，列表是 1 到 31、32、64、128，再加上不超过上限的 2 的幂；批大小落在两者之间（比如 50）就无法用图，回到逐个启动内核的模式。官方部署指南都建议 `enable_padding: true`，把 50 补到 56，多算几个空位换来图的收益。

## 换过来要付出什么

把这些放在一起，TensorRT-LLM 的适配成本主要不在“编译引擎”（那是旧流程的问题），而在下面几处：

- **硬件与系统锁定。** 只能跑在 Linux + NVIDIA GPU 上。团队如果同时有 AMD 卡、需要在 Mac 上开发调试，就要维护两套栈。
- **模型覆盖更窄。** 名单外的模型、刚发布的小众架构，要么等官方支持，要么自己写模型类。
- **配置面不同。** 大部分参数在 YAML 里，名字和语义与 vLLM 不对应（`free_gpu_memory_fraction` 的口径、默认关闭的分块预填充、默认不开的结构化输出），已有的运维脚本和告警要重写。
- **特性组合要逐项查。** 官方有专门的组合矩阵和模型特性矩阵，“各自支持”不等于“一起能用”。
- **版本节奏。** 正式版间隔几个月，预发布每周甚至几天一个，新模型和新特性常常只在预发布里；在线文档跟随主分支，内容可能比你装的版本新。

换来的是：NVIDIA 新硬件和新格式（NVFP4、MNNVL 上的 Wide-EP、Blackwell 专用内核）通常在这里最早、最充分地可用，NVIDIA 公布的 DeepSeek-R1、Llama 4 等模型在 Blackwell 上的纪录性能都基于它；和 Dynamo、ModelOpt、NGC 容器同出一家，组合起来的集成度高。

所以评估顺序可以是：先确认模型在支持名单和特性矩阵里、所需功能组合可用；再用同样的模型、请求分布和 GPU，把 vLLM 或 SGLang 的结果当基线，和 TensorRT-LLM 对比 Goodput 与延迟分位数。

**不适合的场景：** 非 NVIDIA 硬件（昇腾等可看第 04 篇 LMDeploy）或本地 Mac 推理（看第 05—07 篇）；需要大量冷门架构或频繁试新模型的研究环境；多 LoRA 适配器高并发服务（LoRA 不能和 CUDA Graph 组合）；运维团队希望所有参数都能用命令行和环境变量管理、不愿维护 YAML。

## 常见的坑

1. **照着旧教程跑 `trtllm-build`。** 1.2.1 还能用，预发布版已删除；新部署直接用 PyTorch 后端。
2. **在线文档和安装版本不一致。** nvidia.github.io 的文档跟随主分支，已经没有 TensorRT 后端、默认值也可能改了；读 1.2.1 时以对应标签的源码和 `docs/source/` 为准。
3. **容器里起服务却访问不到。** 默认监听 `localhost`，加 `--host 0.0.0.0`。
4. **长输入被拒。** 分块预填充默认关闭，输入超过 `max_num_tokens`（8192）直接报错。
5. **在 H100 上加载 NVFP4 检查点。** NVFP4 只在 Blackwell 上可用，H100 用 FP8 检查点。
6. **以为结构化输出开箱即用。** `guided_decoding_backend` 默认不设，要在启动 YAML 里指定 `xgrammar` 或 `llguidance`，并确认日志出现 `Guided decoder initialized with backend`。
7. **`/metrics` 没有数据或数据“丢了”。** 需要 `enable_iter_perf_stats: true`，而且统计取出后就从队列删除；监控系统应抓 `/prometheus/metrics`。
8. **pip 安装后导入失败。** PyPI 上只有占位源码包，wheel 在 `pypi.nvidia.com`；pip 可能把 CUDA 13 版 PyTorch 换成 CUDA 12.8 版，按官方说明用约束文件锁定 torch。
9. **投机解码在高并发下变慢。** 1.2.1 不能按负载动态关闭投机，按高峰和低谷分别压测再决定。
10. **把 0.9 当成和 vLLM 的 0.92 一样。** 一个乘剩余显存，一个乘总显存。

## 版本与变化

**1.2.1（2026-04-20，最新正式版）** 是 1.2 的补丁版本：修复了一个会导致 KV Cache 损坏的问题，升级了 xgrammar 和 FlashInfer。还在用 1.2.0 的部署应升级到 1.2.1。

**1.2（2026-03-12）** 的主要内容：新增 Qwen3-Next、Qwen3-VL、Nemotron Nano V3 等模型的 beta 支持；B300/GB300 与 SM120/SM121/SM103 路径；DeepSeek V3.2 的 MTP>1；P/D 分离加入服务发现、请求取消、NIXL-LibFabric 和 Mooncake 传输后端；FlashInfer 采样成为默认（不兼容变化）、TorchSampler 支持束搜索；PDL 默认开启、NUMA 感知的 CPU 亲和性自动配置；Helix 并行、Ray 编排器、DGX Spark（beta）。基础镜像升级到 `nvcr.io/nvidia/pytorch:25.12-py3`，PyTorch 2.9.1。

**1.1（2025-12-19）** 加入 KV Cache 连接器 API、MLA 的 KV 复用、KV 缓存加盐、结构化输出与投机解码组合、B300/GB300 支持。**1.0（2025-09-24）** 把 PyTorch 后端和 LLM API 定为默认和稳定。

**预发布 1.3.0rc 到 1.4.0rc1** 变化很大，升级前逐条读发布说明，这里列出影响面较大的几项：

| 版本 | 变化 |
| --- | --- |
| 1.3.0rc10 | logprobs 默认不再归一化（不兼容） |
| 1.3.0rc20 | 请求里的 `chat_template` 改为显式启用（不兼容）；最后一个带 TensorRT 后端的版本 |
| 1.3.0rc21 | 删除 TensorRT 后端、TRT 示例和 TensorRT 引擎版 Triton 后端；AutoDeploy 进入弃用 |
| 1.3.0rc25 | KV Cache 管理器 V2 成为推荐架构；两模型投机解码回退为一模型 |
| 1.3.0rc29 | 删除 AutoDeploy |
| 1.4.0rc0 | 删除 KVCacheManagerV2 的 Python 后端、`LlmRequest` 字段迁到 Python（均不兼容）；加入命令行覆盖配置 |
| 1.4.0rc1 | 默认使用 KV Cache 管理器 V2 和 Python 版 KV 传输器（不兼容）；已知问题包括取消流式请求后 P/D 传输可能失败 |

升级注意：生产按正式版 1.2.1 规划；需要预发布里的新模型时，单独建一套环境，固定镜像摘要，用自己的评测集和压测脚本验证后再切换，并保留 1.2.1 的回退路径。和其他引擎一样，记录引擎版本、镜像摘要、模型与检查点版本、量化配置、YAML 全文、GPU 型号与驱动，升级前后对比质量和延迟分位数。

TensorRT-LLM 是 NVIDIA 为自家 GPU 打造的推理库：当前默认路径是 PyTorch 定义模型、C++ 管调度和 KV、NVIDIA 内核做计算，配置集中在 YAML，量化由 ModelOpt 产出，P/D 分离与大规模部署和 Dynamo 配合。它在新硬件、新格式和热门大模型上最快，代价是只能跑在 NVIDIA + Linux 上、模型名单较短、默认值和特性组合需要逐项核对。对资料助手，H100 上用 FP8 检查点、开启分块预填充是合理的起点，但值不值得从 vLLM 迁移，要看同条件压测的结果。

数据中心引擎还剩最后一个：下一篇看 [LMDeploy](./04-lmdeploy.md)，它在同一套接口下放了 TurboMind 和 PyTorch 两台引擎，在 4 bit 部署、多模态模型和国产硬件上有自己的位置。
