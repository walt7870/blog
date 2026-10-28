# 实践：用 vLLM 跑起资料助手

前七篇讲的都是原理：Prefill 和 Decode，KV Cache 和显存账本，TTFT 和 TPOT，一个请求从进门到出门经过的环节。这一篇动手，用 vLLM 把资料助手真正跑起来。依次做这几件事：安装，用 Python 批量生成，启动一个 OpenAI 兼容的服务并调用它，读懂启动日志里的显存数字，调整常用参数，模型大到一张卡放不下时上多卡，以及启动失败时按报错排查。

读完你应该能独立完成一次部署，并能把日志里的每个数字和前几篇的概念对上：日志说 KV Cache 能放 45 万个 token，你知道这个数是怎么算出来的；启动报显存不够，你能看出该调高还是调低哪个参数。

本篇的命令和参数以 **vLLM 0.32.0**（2026 年 10 月 18 日发布）为准，已对照这个版本的官方文档和源码逐项核对。本站没有在 GPU 上实际运行这些命令，文中的显存数字是按第 4 篇的公式手算的估计，你自己运行时以日志打印的为准。vLLM 迭代很快，别的版本请先看对应版本的文档。

## vLLM 在链路里管哪一段

回到[第 1 篇](./01-inference-system.md)的分工：应用负责界面和业务，推理引擎负责把请求变成 GPU 上的计算，GPU 负责算。vLLM 就是推理引擎这一层，[第 7 篇](./07-request-path.md)里从 API 入口到反分词的整条链路，基本都在它内部完成。

它常被提到的几个特点，在本系列都有对应的章节：

| 特点 | 一句话说明 | 原理在哪一篇 |
| --- | --- | --- |
| PagedAttention | KV Cache 分成固定大小的块按需分配，不再按最大长度预留 | 第 8 篇 |
| 连续批处理 | 每一步都可以把新请求加进正在运行的批，结束的请求立即让出位置 | 第 9 篇 |
| 前缀缓存、分块预填充 | 相同的开头只算一次；长输入分段处理，不卡住别人 | 第 10、11 篇 |
| OpenAI 兼容接口 | 原来调 OpenAI 的代码改一下地址就能用 | 本篇 |
| 量化 | 支持 FP8、AWQ、GPTQ 等多种格式；GGUF 和 bitsandbytes 已拆到单独的插件（`vllm-gguf-plugin`、`vllm-bnb-plugin`），要另外安装 | 第 14 篇 |
| 硬件覆盖 | NVIDIA、AMD、Intel GPU，以及通过单独的包或插件支持的 TPU、昇腾等 | 本篇 |

这一篇只讲怎么用。想知道 PagedAttention 怎么工作，看[第 8 篇](./08-paged-attention.md)。

## 先装起来

### 环境要求

| 项目 | 0.32.0 的要求 |
| --- | --- |
| 操作系统 | Linux |
| Python | 3.11 到 3.14 |
| NVIDIA GPU | 计算能力（compute capability，NVIDIA 给每代 GPU 架构的版本号）7.5 及以上，比如 T4、RTX 20 系列及更新的消费卡、A100、L4、L40S、H100、B200 |
| CUDA | PyPI 上的预编译包和默认 Docker 镜像基于 CUDA 13.0，需要 R580 及以上的驱动；驱动较旧时改用单独发布的 CUDA 12.9 版本（镜像标签带 `-cu129`） |

网上不少教程写的是“Python 3.10、计算能力 7.0（V100）”，那是旧版本的要求。0.32.0 已经不支持 Python 3.10，V100 也不在预编译包的支持范围里。Mac 上没有 CUDA，想用 Apple 芯片的 GPU 要改用基于 MLX 的 vLLM-Metal 项目；手头没有 GPU，可以先看[第 22 篇](./22-edge.md)里的本地推理方案。

### 用 uv 安装

官方推荐用 uv（一个用 Rust 写的 Python 包管理器）建一个干净的虚拟环境：

```bash
uv venv --python 3.12 --seed
source .venv/bin/activate
uv pip install vllm --torch-backend=auto
vllm download-kernels
```

- `--torch-backend=auto` 让 uv 根据本机的 CUDA 驱动挑选匹配的 PyTorch。也可以手动指定，比如 `--torch-backend=cu126`。
- `vllm download-kernels` 预先下载 FlashInfer（一个注意力算子库，第 12 篇）编译好的算子。不做这一步也能用，但 vLLM 会在启动时现场下载和编译并打印警告，在 Hopper（H100、H200）及更新架构的 GPU 上可能多花几分钟。每次安装或升级 vLLM 后都要在同一个环境里重新运行一次。
- 要固定版本，写成 `uv pip install 'vllm==0.32.0' --torch-backend=auto`。生产环境一定要固定，原因见[第 21 篇](./21-production.md)。

官方文档特别提醒：**用全新的环境安装**。vLLM 带了大量预编译的 CUDA 算子，和特定版本的 PyTorch、CUDA 绑定。装进一个已有其他版本 PyTorch 的环境，很容易出现奇怪的报错。

习惯用 conda 的，可以用 conda 建环境，再在里面用 uv 安装：

```bash
conda create -n vllm-env python=3.12 -y
conda activate vllm-env
pip install --upgrade uv
uv pip install vllm --torch-backend=auto
```

AMD GPU（ROCm）从 vLLM 的专用源安装，目前要求 Python 3.12、ROCm 7.0、glibc 2.35 及以上：

```bash
uv venv --python 3.12 --seed
source .venv/bin/activate
uv pip install vllm --extra-index-url https://wheels.vllm.ai/rocm/
```

装完检查一下版本：

```bash
python -c "import vllm; print(vllm.__version__)"
```

### 准备模型

vLLM 默认从 Hugging Face 下载模型。本系列用的 `meta-llama/Llama-3.1-8B-Instruct` 是**门控模型**：要先在模型页面登录并同意许可协议，再在本机配置访问令牌，否则下载时会报 401 或 403：

```bash
export HF_TOKEN=<你的 Hugging Face 访问令牌>
```

国内网络访问 Hugging Face 较慢，可以改从 ModelScope 下载。设置环境变量后，模型名要换成 ModelScope 上的名字（Llama-3.1-8B-Instruct 在那里叫 `LLM-Research/Meta-Llama-3.1-8B-Instruct`）：

```bash
export VLLM_USE_MODELSCOPE=True
```

拿不到 Llama 的授权，可以换成不需要授权的 `Qwen/Qwen2.5-7B-Instruct`，下面的步骤都一样。算显存时注意它的配置不同：28 层、4 个 KV 头，每个 token 的 KV 是 2 × 28 × 4 × 128 × 2 = 56 KiB，不到 Llama-3.1-8B 的一半。

## 离线批量推理：不起服务，直接生成

离线推理指在一个 Python 程序里加载模型、处理一批输入、拿到结果后退出，不启动 HTTP 服务。适合批量生成、数据标注、跑评测这类不需要实时响应的任务。入口是 `LLM` 和 `SamplingParams` 两个类。

假设资料助手要预先为员工手册里的常见问题生成一版草稿答案：

```python
from vllm import LLM, SamplingParams

llm = LLM(model="meta-llama/Llama-3.1-8B-Instruct", max_model_len=8192)

sampling_params = SamplingParams(temperature=0.2, top_p=0.9, max_tokens=512)

conversations = [
    [{"role": "system", "content": "你是公司资料助手，回答简洁。"},
     {"role": "user", "content": "年假怎么申请？"}],
    [{"role": "system", "content": "你是公司资料助手，回答简洁。"},
     {"role": "user", "content": "出差住宿标准是多少？"}],
    [{"role": "system", "content": "你是公司资料助手，回答简洁。"},
     {"role": "user", "content": "试用期可以请病假吗？"}],
]

outputs = llm.chat(conversations, sampling_params)
for output in outputs:
    print(output.outputs[0].text)
    print(output.outputs[0].finish_reason)  # stop 表示正常说完，length 表示被长度截断
```

几点说明：

- `LLM(...)` 这一行最慢。它会下载并加载权重、编译模型并试跑一次测显存、分配 KV Cache、录制 CUDA Graph（把每一步要发射的 GPU 操作录下来、之后整体重放，省掉 CPU 逐个发射的开销，第 12 篇），下面[读懂启动日志](#读懂启动日志-显存是怎么分的)一节会逐步拆开。这一步只做一次，之后的 `chat` 调用很快。
- 三个问题一次性交给引擎，引擎自己用连续批处理把它们放进同一批计算。**不要写一个 for 循环一次传一个**，那样每次只有一个请求在跑，GPU 大部分时间在等（第 6 篇讲过 Decode 阶段批越大越划算）。
- 这里把 `max_model_len` 设成 8192，原因在后面的显存一节解释。
- 例子里的制度问题，模型只能凭训练时学到的常识回答，并不知道你们公司的规定。真正的资料助手要先检索制度原文、放进提示里，这是应用层的事，不在本系列范围。

### 两个最常见的坑

**用 `generate` 喂对话模型，忘了套对话模板。** `LLM` 还有一个 `generate` 方法，它把你给的字符串原样送进模型，**不会自动套用对话模板**。[第 7 篇](./07-request-path.md#对话模板-模型看到的不是你发的原文)讲过，Instruct 模型认的是带特殊标记的格式，直接喂一句裸文本，它可能续写你的问题、答非所问，或者停不下来。对话模型用 `chat`；确实要用 `generate`，先自己套模板：

```python
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-3.1-8B-Instruct")
texts = [
    tokenizer.apply_chat_template(conv, tokenize=False, add_generation_prompt=True)
    for conv in conversations
]
outputs = llm.generate(texts, sampling_params)
```

`add_generation_prompt=True` 会在末尾加上“轮到助手回答”的标记，少了它模型不知道该开始回答。`generate` 适合本来就不是对话的任务，比如让基座模型续写一段文字。

**忘了设 `max_tokens`，回答只有十几个字。** `SamplingParams` 里 `max_tokens` 的默认值是 **16**。只写 `SamplingParams(temperature=0.7)`，每个回答最多 16 个 token，说到一半就断了，`finish_reason` 是 `length`。离线推理时总是显式设置 `max_tokens`。在线服务的规则不同，见后面的参数一节。

### 模型自带的默认采样参数

很多模型仓库里有一个 `generation_config.json`，写着模型作者推荐的采样参数。比如 Llama-3.1-8B-Instruct 写的是 `temperature 0.6, top_p 0.9`，Qwen2.5-7B-Instruct 写的是 `temperature 0.7, top_p 0.8, top_k 20, repetition_penalty 1.05`。vLLM 默认会读取它，但离线和在线用法不同：

- **离线**：只有调用 `chat` 或 `generate` 时**不传** `sampling_params`，才使用模型推荐的这组参数。像上面的例子那样自己传了一个 `SamplingParams`，它就是最终参数，没写的字段取 vLLM 自己的默认值（比如温度 1.0），模型的推荐值不参与。
- **在线服务**：请求里没写的字段，先取模型推荐值，再取 vLLM 默认值。同一段调用代码换个模型，输出风格可能就变了，原因往往在这里。

请求或 `SamplingParams` 里显式写了的参数总是优先。想完全不用模型推荐值，加载时指定：

```python
llm = LLM(model="meta-llama/Llama-3.1-8B-Instruct", generation_config="vllm")
```

## 在线服务：起一个兼容 OpenAI 的接口

资料助手是给全公司用的，需要一个常驻的服务。一行命令启动：

```bash
vllm serve meta-llama/Llama-3.1-8B-Instruct --max-model-len 8192
```

服务默认在 8000 端口监听，**不指定 `--host` 时绑定的是本机所有网卡**，同一网络里的其他机器都能直接访问。只想本机使用，加 `--host 127.0.0.1`；改端口用 `--port`。下面的例子都在本机用 `localhost:8000` 访问。和离线推理一样，`--generation-config vllm` 可以关掉模型自带的采样默认值。

![vllm serve 启动的五个步骤：读取配置、加载权重、试跑测峰值、分配 KV、录制 CUDA Graph，以及第 1、2、4 步可能出现的启动失败](/ai/llm-inference/vllm-startup.svg)

启动要经过图中的五步，日志里能看到对应的输出。“空闲显存够不够预算”在加载权重之前就检查；第 3 步的试跑包含 torch.compile 对模型的编译，往往是启动中最耗时的一段（编译结果会缓存，第二次启动快很多）。8B 模型在 H100 上通常要一到几分钟，模型越大越久。日志出现监听端口的信息后，服务才能接请求，在这之前调用会被拒绝。

### 用 curl 调用

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Llama-3.1-8B-Instruct",
    "messages": [
      {"role": "system", "content": "你是公司资料助手，回答简洁。"},
      {"role": "user", "content": "年假怎么申请？"}
    ],
    "temperature": 0.2,
    "max_completion_tokens": 512
  }'
```

`model` 字段要和启动时的模型名一致。想让客户端看到一个更短的名字，启动时加 `--served-model-name assistant`，请求里写 `"model": "assistant"`。

### 用 OpenAI 的 Python 客户端调用

服务实现了 OpenAI 的接口格式，原来调 OpenAI 的代码只要改 `base_url`：

```python
from openai import OpenAI

client = OpenAI(base_url="http://localhost:8000/v1", api_key="EMPTY")

stream = client.chat.completions.create(
    model="meta-llama/Llama-3.1-8B-Instruct",
    messages=[
        {"role": "system", "content": "你是公司资料助手，回答简洁。"},
        {"role": "user", "content": "年假怎么申请？"},
    ],
    temperature=0.2,
    max_completion_tokens=512,
    stream=True,
)
for chunk in stream:
    if chunk.choices and chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

这里打开了 `stream=True`，回答一段一段地推送回来，用户看到第一个字的时间就是第 5 篇的 TTFT。服务没开认证时，`api_key` 随便填一个非空字符串即可。

需要“续写一段文字”而不是对话时，用补全接口 `client.completions.create(model=..., prompt="...")`，它对应 `/v1/completions`，同样不套对话模板。装好 vLLM 后还可以直接在命令行里试：`vllm chat` 连上本机服务进行多轮对话，`vllm complete` 做补全。

### 常用接口

| 方法与路径 | 用途 |
| --- | --- |
| `POST /v1/chat/completions` | 对话，最常用 |
| `POST /v1/completions` | 文本补全，不套对话模板 |
| `POST /v1/responses` | OpenAI 的 Responses 接口 |
| `POST /v1/messages` | Anthropic Messages 格式的兼容接口 |
| `GET /v1/models` | 列出服务中的模型名 |
| `POST /tokenize`、`POST /detokenize` | 只做分词或反分词，排查模板和长度问题时有用 |
| `GET /health` | 健康检查，给负载均衡和容器编排用 |
| `GET /metrics` | Prometheus 格式的监控指标（第 21 篇） |
| `GET /version` | 查看 vLLM 版本 |

`/v1/embeddings`、`/v1/audio/transcriptions` 等接口只有在加载对应类型的模型时才能用。

### 认证：只保护了一部分接口

vLLM 默认不做任何认证。可以用 `--api-key` 或环境变量 `VLLM_API_KEY` 设置一个密钥，客户端在 `Authorization: Bearer <密钥>` 头里带上：

```bash
export VLLM_API_KEY=<自己生成的随机字符串>
vllm serve meta-llama/Llama-3.1-8B-Instruct --max-model-len 8192
```

```python
client = OpenAI(base_url="http://localhost:8000/v1", api_key="<同一个字符串>")
```

要注意它保护的范围。0.32.0 的源码里，只有路径以 `/v1`、`/v2`、`/inference`、`/cohere` 开头的请求会检查密钥，`/health`、`/metrics`、`/tokenize` 等不在这个范围内，不带密钥也能访问。这个开关适合防止内网里误调用，**不能代替真正的鉴权**。对外提供服务时，引擎端口不要直接暴露，放在网关后面，由网关负责鉴权、限流和 TLS（第 21 篇）。

## 参数怎么调

### 采样参数

每个请求都可以带采样参数。它们在[第 7 篇](./07-request-path.md#采样-从概率到-token)讲过的“采样”这一步起作用：

| 参数 | 作用 | 默认值 |
| --- | --- | --- |
| `temperature` | 越低越保守，0 表示贪心（每步选分数最高的） | 1.0 |
| `top_p` | 只在累计概率达到 p 的候选里抽 | 1.0，不限制 |
| `top_k` | 只在分数最高的 k 个里抽 | 0，不限制（-1 效果相同） |
| `min_p` | 去掉概率低于“最高概率 × min_p”的候选 | 0，不限制 |
| `max_tokens` | 最多生成多少个 token | 离线 16；在线服务见下文 |
| `repetition_penalty` | 大于 1 时压低已出现过的 token 的分数 | 1.0 |
| `presence_penalty`、`frequency_penalty` | OpenAI 风格的重复惩罚 | 0 |
| `stop` | 生成出这些字符串就停下，返回内容不含它 | 无 |
| `n` | 同一个输入生成几份回答 | 1 |
| `seed` | 固定随机种子 | 无 |

表中的默认值是 vLLM 自己的。前面说过，模型自带的 `generation_config.json` 会覆盖其中几项。

两点补充：

- **在线服务的长度上限。** OpenAI 的对话接口现在推荐用 `max_completion_tokens`，旧的 `max_tokens` 仍然兼容，但已标为弃用。两个都没写时，服务不会用 16，而是取“上下文上限减去输入长度”，再和模型配置里的 `max_new_tokens`（如果有）取较小值。也就是说，不写长度上限，模型可能一直写到上下文用完。资料助手这类场景应该在请求里写明上限。
- **`seed` 和可复现。** 固定 `seed` 或把温度设为 0，能让结果在多数时候一致，但不保证每次完全相同。原因在第 7 篇讲过：请求和不同的请求拼在一批时，浮点计算的顺序会变。

起步可以这样设：要求准确的问答，温度 0 到 0.3；需要一些变化的写作，温度 0.7 左右、top_p 0.9。具体以你的评测结果为准。

### 引擎参数

引擎参数在启动时决定，影响所有请求。下面是最常调的几个（命令行写法；Python 里把 `-` 换成 `_` 作为 `LLM(...)` 的参数）：

| 参数 | 作用 | 0.32.0 的默认值 |
| --- | --- | --- |
| `--max-model-len` | 单个请求的上下文上限（输入加输出） | 取模型配置的最大长度；写 `auto` 则取显存放得下的最大值 |
| `--gpu-memory-utilization` | 这个实例最多用掉显卡总显存的比例 | 0.92 |
| `--max-num-seqs` | 同时在批里的请求数上限 | 显存 70 GiB 以上的卡（A100 除外）为 1024，其余为 256 |
| `--max-num-batched-tokens` | 每一步最多处理多少个 token（第 11 篇的 token 预算） | H100、H200：在线服务 8192，离线 16384；显存 160 GiB 以上的卡两者都是 16384；其他卡更小 |
| `--tensor-parallel-size` | 张量并行的卡数 | 1 |
| `--dtype` | 权重和计算的数据类型 | `auto`，跟随模型配置 |
| `--quantization` | 量化方法 | 不写时读模型配置里的量化信息 |
| `--kv-cache-dtype` | KV Cache 的数据类型，如 `fp8` | `auto`，与模型相同 |
| `--enable-prefix-caching` | 前缀缓存（第 10 篇） | 生成模型默认开启 |
| `--enforce-eager` | 关闭 CUDA Graph，便于调试 | 关闭 |

网上的资料常写“`gpu_memory_utilization` 默认 0.9、`max_num_seqs` 默认 256”，这是旧版本或小显存卡上的值。默认值会随版本和显卡变化，启动日志会打印实际生效的配置，以日志为准。

`--enforce-eager` 只在排查问题时用。关掉 CUDA Graph 后启动更快、显存略省，但小批量 Decode 时 CPU 发射算子的开销会直接暴露出来，生成明显变慢（第 12 篇）。

## 读懂启动日志：显存是怎么分的

把[第 4 篇](./04-memory-budget.md)的显存账本对应到 vLLM 的实际做法。`gpu_memory_utilization` 定的是**这个实例总共能用多少显存**，包括权重、运行时的临时空间和 KV Cache，剩下的全部分给 KV：

```text
预算        = 显卡总显存 × gpu_memory_utilization
KV Cache    = 预算 − 权重 − 试跑测出的激活峰值 − 其他固定开销
```

激活是前向计算过程中的中间结果，用完即弃，但同一时刻最多会占多少，取决于一步处理多少 token。vLLM 启动时用 `max_num_batched_tokens` 那么多的假数据跑一遍，记下这个峰值。

代入 Llama-3.1-8B 和一张 H100（实际可用约 79.6 GiB）：

```text
预算       ≈ 79.6 GiB × 0.92     ≈ 73.2 GiB
− 权重                           ≈ 15.0 GiB
− 激活峰值等运行开销             ≈ 3 GiB（假设值，日志里有实测）
= KV Cache                       ≈ 55 GiB
55 GiB ÷ 128 KiB/token           ≈ 45 万个 token
```

第 4 篇得到的是约 40 万个 token，比这里少约 5 万。其中约 1.3 万来自比例：第 4 篇保守地按 0.9 算，这里用 0.92 的默认值，差 1.6 GiB；其余来自运行开销的假设，第 4 篇留得更宽。两个数都是估算，真实值看日志。启动日志里对应两行：

```text
Available KV cache memory: ... GiB
GPU KV cache size: ... tokens, Maximum concurrency for 8,192 tokens per request: ...x
```

第二行的“最大并发”是 KV 总容量除以 `max_model_len`：45 万 ÷ 8192 ≈ 55，意思是 55 个请求同时用满 8192 个 token 也放得下。实际请求大多比上限短，能同时服务的人数通常更多。

### max_model_len 改变的是什么

`max_model_len` 不改变 KV 的总容量，45 万个 token 的池子还是那么大。它改变的是**单个请求最多能占多少**。

Llama-3.1-8B 的配置写的是 131072（128K）。不设 `--max-model-len`，引擎就按 128K 准备：启动时要检查 KV 至少放得下一个 128K 的请求（16 GiB，H100 上没问题，小显存卡上可能直接启动失败）；日志里的最大并发会显示 45 万 ÷ 131072 ≈ 3.4 倍。

资料助手的单次对话用不到 128K，把上限设成 8192，一是小显存卡也能启动，二是防止个别超长请求一口气占掉大量 KV、挤占别人。上限设多大，按业务实际的最长输入加最长输出来定。

### gpu_memory_utilization 该往哪个方向调

很多教程说“OOM 就调低 `gpu_memory_utilization`”，这条建议只适用于下面第一种报错。这个比例是**给自己的预算**，调低意味着 KV 更少。要先看报错是哪一种：

- 报“启动时空闲显存小于预算”（`Free memory on device ... is less than desired GPU memory utilization`）：卡上有别的进程占着显存，比如另一个 vLLM 实例或者没退出的 Jupyter。腾出显存，或者**调低**比例，让预算不超过实际空闲的部分。两个实例共用一张卡时，比如各设 0.45。
- 报“KV 放不下一个最长请求”（`... KV cache is needed, which is larger than the available KV cache memory`）或“没有空间分配缓存块”（`No available memory for the cache blocks`）：预算扣掉权重后剩得太少。应该**调高**比例，或者调小 `--max-model-len`；报错里会给出“按现有显存估计能支持的最大长度”。还不够就量化或加卡。
- 运行一段时间后才报 `CUDA out of memory`：通常是激活峰值超出了试跑时的估计，比如超大批或多模态输入。调低比例给运行时留更多余量，或者调小 `--max-num-batched-tokens`、`--max-num-seqs`。

## 注意力后端

注意力计算由专门的算子库完成（第 12 篇），vLLM 叫它**注意力后端**。启动时会按 GPU 型号、模型结构和数据类型自动选择，日志里会打印选中的是哪一个。一般不需要手动指定。遇到某个后端的兼容问题，或者要做性能对比时，可以强制指定：

```bash
vllm serve meta-llama/Llama-3.1-8B-Instruct --attention-backend FLASHINFER
```

NVIDIA GPU 上常见的有 `FLASH_ATTN`、`FLASHINFER`、`TRITON_ATTN`，DeepSeek 这类使用 MLA（多头潜在注意力，第 4 篇）的模型有专门的后端；AMD GPU 上有 `ROCM_ATTN`、`ROCM_AITER_FA`、`TRITON_ATTN` 等。强制指定一个不支持当前模型或数据类型的后端，启动会直接报错。

## 一张卡放不下：上多卡

资料助手升级到 70B 模型，BF16 权重约 140 GB，一张 80 GB 的卡放不下。最直接的办法是张量并行，把每一层的矩阵切开分给几张卡（原理见[第 16 篇](./16-distributed.md)）：

```bash
vllm serve meta-llama/Llama-3.1-70B-Instruct --tensor-parallel-size 4 --max-model-len 8192
```

离线推理同理：`LLM(model=..., tensor_parallel_size=4)`。

卡数有约束：注意力头数要能被卡数整除。Llama-3.1-70B 有 64 个头，TP 可以是 2、4、8，不能是 3 或 6。

### 需要几张卡

下表按 BF16 权重估算。80 GB 的卡实际可用约 79.6 GiB，换成十进制约 85.5 GB，乘以 0.92 后每张卡的预算约 78.6 GB。“能启动”不等于“够用”：KV 太少，同时能服务的人就很少。

| 模型规模 | BF16 权重 | 最少能启动 | 比较宽裕的配置 |
| --- | --- | --- | --- |
| 7–8B | 约 15–16 GB | 1 张 24 GB 卡，只够较短的上下文 | 1 张 48 GB 或 80 GB 卡 |
| 13–14B | 约 26–30 GB | 1 张 48 GB 卡 | 1 张 80 GB 卡 |
| 32–34B | 约 64–68 GB | 1 张 80 GB 卡，KV 只剩约 10 GB，要限制上下文长度 | 2 张 80 GB 卡 |
| 70–72B | 约 140–145 GB | 2 张 80 GB 卡，KV 合计只剩约 10 GB | 4 张 80 GB 卡；或用 FP8 权重放 2 张 H100 |
| 405B | 约 810 GB | 8 张 80 GB 卡（640 GB）**放不下**；需要 FP8 权重，或两台机器共 16 张卡 | 8 张 H200（每张 141 GB），或 FP8 权重放 8 张 H100 |

以 70B 放两张 80 GB 卡为例：预算约 2 × 78.6 ≈ 157 GB，减去 140 GB 权重和两张卡各自的运行开销，KV 只剩约 10 GB。Llama-3.1-70B 每个 token 的 KV 是 320 KiB，大约只能放 3 万个 token，几个长对话就满了。

量化能把权重缩小。INT4 的 AWQ、GPTQ 权重大约是 BF16 的四分之一到三分之一（还要存缩放系数，有些层保留 16 位），FP8 是一半。代价和适用条件见[第 14 篇](./14-quantization.md)。

### vLLM 支持的并行方式

| 方式 | 拆的是什么 | 参数 |
| --- | --- | --- |
| 张量并行 TP | 每一层的矩阵切开，卡间每层通信两次 | `--tensor-parallel-size` |
| 流水线并行 PP | 不同的层放在不同的卡或机器上 | `--pipeline-parallel-size` |
| 数据并行 DP | 整个模型复制几份，各自处理不同请求 | `--data-parallel-size` |
| 专家并行 EP | MoE 模型的专家分到不同的卡上 | `--enable-expert-parallel` |
| 上下文并行 | 超长序列的 KV 和计算分到多张卡上 | `--prefill-context-parallel-size`、`--decode-context-parallel-size` |

常见的组合是：一台机器内用 TP（机内的卡之间有 NVLink 这类高速互联），跨机器时加 PP，流量大再用 DP 复制多份。**模型能放进一张卡时，优先用 DP 而不是 TP**：8B 模型放 8 张卡，部署 8 个独立副本通常比一个 TP=8 的实例吞吐更高，也没有卡间通信。各种方式的取舍在第 16 篇。

## 启动和运行中的常见问题

按现象查：

| 现象或报错 | 原因 | 处理 |
| --- | --- | --- |
| 下载模型报 401、403 | 门控模型没有授权 | 在模型页登录并同意协议，配置 `HF_TOKEN` |
| 下载很慢或超时 | 网络访问 Hugging Face 不畅 | 设 `VLLM_USE_MODELSCOPE=True` 改用 ModelScope，或提前把模型下载到本地目录，`vllm serve /本地/路径` |
| 启动时空闲显存小于预算 | 其他进程占着显存 | 用 `nvidia-smi` 找到并结束它，或调低 `--gpu-memory-utilization` |
| 加载权重时 `CUDA out of memory` | 一张卡放不下权重 | 加卡做 TP，或换量化版本的模型 |
| KV 放不下一个最长请求 | 预算扣掉权重后剩得太少 | 调高 `--gpu-memory-utilization`，调小 `--max-model-len` |
| 回答答非所问、重复、停不下来 | 对话模型没套模板 | 用 `llm.chat` 或 `/v1/chat/completions`，不要用 `generate` 喂裸文本 |
| 离线生成只有十几个字 | `max_tokens` 默认 16 | 在 `SamplingParams` 里设置 `max_tokens` |
| 在线调用的代码没变，换个模型后风格变了 | 请求没写的采样参数取了新模型 `generation_config.json` 里的推荐值 | 请求里显式写参数，或启动时加 `--generation-config vllm` |
| 提示需要 `trust_remote_code` | 模型结构的代码放在模型仓库里 | 见下文 |

### `--quantization` 不是“压缩开关”

有些教程把 `--quantization awq` 当作显存不够时的通用解法，这是误解。AWQ、GPTQ 这类方法需要**事先量化好的模型文件**（模型名里通常带 `-AWQ`、`-GPTQ-Int4`），vLLM 会从模型配置里自动识别，一般连这个参数都不用写。拿一个普通的 BF16 模型加上 `--quantization awq`，启动会报错，因为文件里没有 AWQ 需要的数据。

不想找量化模型、又想省权重显存时，vLLM 支持在加载时把 BF16 权重**在线转成 FP8**：`--quantization fp8_per_tensor`（或按块缩放的 `fp8_per_block`）。旧写法 `--quantization fp8` 仍能用，但 0.32.0 会打印弃用警告。在 H100、L40S 这类有 FP8 计算单元的卡上收益最好，精度影响要自己评测。

### `--trust-remote-code` 会执行模型仓库里的代码

有些模型的结构没有被 vLLM 或 transformers 内置，代码放在模型仓库里，需要加 `--trust-remote-code` 才能加载。这个参数的意思是：**下载并执行这个仓库里的 Python 代码**。只对可信来源的模型开启，并用 `--revision`（模型文件）和 `--code-revision`（模型代码）固定到具体的提交，避免仓库更新后执行了你没审查过的代码。

## 小结

vLLM 的使用分两种形态：`LLM` 类做离线批量推理，`vllm serve` 起一个兼容 OpenAI 的在线服务。对话模型要通过 `chat` 或对话接口调用，才会套上对话模板；离线时 `max_tokens` 默认只有 16；模型自带的 `generation_config.json` 会覆盖默认采样参数。

显存方面，`gpu_memory_utilization` 定的是整个实例的预算，权重和运行开销扣完后剩下的都是 KV Cache，日志里的 token 数就是第 4 篇那笔账的结果。`max_model_len` 不改变 KV 总量，只限制单个请求能占多少。启动报显存问题时，先分清是别的进程占了显存（调低比例），还是预算不够放 KV（调高比例或缩短上限）。一张卡放不下时用张量并行，卡数要能整除注意力头数；放得下时用数据并行扩容。

动手之后，可以对照这几条检查自己：

- 能装好 vLLM，说出它对 Python、GPU 和 CUDA 的要求；
- 能用 `LLM.chat` 批量生成，并解释为什么不该逐条循环调用；
- 能启动服务，用 curl 和 OpenAI 客户端调用，打开流式输出；
- 能从启动日志的 KV 容量，倒推出“每个 token 128 KiB”这笔账；
- 遇到启动失败，能根据报错判断该调高还是调低 `gpu_memory_utilization`；
- 能为一个给定大小的模型估算需要几张卡，并说出 TP 卡数的约束。

服务跑起来以后，人一多就会遇到新问题：请求排队、长输入卡住别人、显存被占满。从[第 8 篇：PagedAttention](./08-paged-attention.md) 开始，看推理引擎在内部用哪些机制应对这些问题；想对刚起的服务做压测，直接跳到[第 20 篇](./20-benchmark.md)。
