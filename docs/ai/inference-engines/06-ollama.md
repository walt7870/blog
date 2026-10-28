# 06. Ollama：本地模型管理与常驻 API

[上一篇](./05-llama-cpp.md)用 llama.cpp 跑模型，要自己找 GGUF 文件、选量化档、记住 `-c`、`-np`、`-ngl` 这些参数，换一个模型就重启一次服务。Ollama 把这些事情包了起来：`ollama run qwen3` 一条命令完成下载、加载和对话；后台常驻一个服务，按请求自动加载模型，空闲几分钟后自动卸载；模型像 Docker 镜像一样有名字和标签，存在本地的统一目录里。它的定位是“本地模型的包管理器 + 常驻 API”，很多桌面应用、编辑器插件和 Agent 工具默认就去连本机的 Ollama。

资料助手团队里，Ollama 最常出现在两个地方：开发同事在笔记本上用它当 OpenAI 兼容接口的本地替身，调试提示词和工具调用；有人想在一台带显卡的小服务器上给部门同事“先搭一个能用的”。前者很合适，后者要先想清楚它的并发、上下文和安全默认值。这一篇讲清楚：Ollama 由哪些进程组成、和 llama.cpp 是什么关系；模型库、标签和本地存储；Modelfile 能定制什么；原生 API 和兼容 API 的区别；并发、上下文和内存怎样由环境变量控制，默认值是多少；GPU 支持；以及默认无鉴权带来的安全边界，什么时候应该换成 vLLM 或 SGLang。

本篇以 **Ollama v0.40.12**（2026 年 10 月 27 日发布）为准，默认值对照了这个版本的源码。文中标“实测”的内容是在 Apple M4（24 GB 统一内存）笔记本上，把官方 macOS 发布包解压到临时目录、用 `qwen3:0.6b` 运行得到的；测量时机器上有其他负载，速度数字只作定性参考。NVIDIA、AMD 显卡上的行为按源码和文档核对，没有实际运行。

## 一个管理进程，加上每个模型一个推理子进程

Ollama 是一个用 Go 写的程序，同一个可执行文件既是命令行客户端，也是服务端：

- `ollama serve` 启动常驻服务，默认监听 `127.0.0.1:11434`。macOS、Windows 的桌面 App 和 Linux 的 systemd 服务做的都是这件事。
- `ollama run`、`pull`、`list`、`ps`、`create` 等命令是**客户端**，它们通过 HTTP 调用这个服务。服务没启动时，客户端会报连不上。

真正计算 token 的不是 `ollama serve` 本身。v0.40.12 里，服务端加载模型时会拉起一个**推理子进程**：

- **GGUF 模型**交给 `llama-server`，也就是上一篇讲的上游 llama.cpp 服务。Ollama 的发布包里自带这个二进制（v0.40.12 固定在 llama.cpp 的 b11901 构建，并打上 Ollama 自己的补丁），启动时只监听 `127.0.0.1` 的一个随机端口，不对外。
- **safetensors 模型**交给 MLX runner：Ollama 以 `ollama runner --model … --port …` 再启动一个自身进程，用 Apple 的 MLX 框架计算。在 Apple Silicon 上默认可用；Linux、Windows 上有单独打包的 MLX（CUDA）发布包，自行编译时用 `OLLAMA_MLX_BACKENDS` 选择。

选哪个子进程只看模型的权重格式，没有环境变量开关。早期 Ollama 有过 Go 写的自研引擎和 `OLLAMA_NEW_ENGINE` 开关，这些代码在 v0.40.12 里已经不存在。

![Ollama 的进程结构：CLI、App 和用户程序调用常驻的 ollama serve，调度器按权重格式拉起 llama-server 或 MLX runner 子进程，模型文件存放在模型目录](/ai/inference-engines/ollama-architecture.svg)

这张图解释了 Ollama 的大部分行为。`ollama serve` 负责接口、对话模板、思考内容和工具调用的解析，以及调度：决定加载哪个模型、上下文多长、并行几路、排队和卸载。推理子进程只管算。实测中，`ollama ps` 的 `RUNNER` 列直接显示用的是哪种子进程，而系统进程表里能看到 Ollama 传给 `llama-server` 的完整参数：

```text
NAME          ID              SIZE      PROCESSOR    CONTEXT    RUNNER      UNTIL
qwen3:0.6b    7df6b6e09427    826 MB    100% GPU     4096       llamacpp    4 minutes from now

.../llama-server --model .../blobs/sha256-7f4030… --port 52547 --host 127.0.0.1 --no-webui --offline
    -c 4096 -np 1 … --no-jinja --chat-template chatml --flash-attn auto -b 512 -ub 512 --context-shift --keep 4
```

GPU 层数、线程数由 `llama-server` 自己探测（上一篇的 `--fit`）；对话模板则由 Ollama 在 Go 里渲染好再发过去（`--no-jinja`），所以同一个 GGUF 在 Ollama 和裸 `llama-server` 里的提示词格式可能不完全一样。

## 模型库、标签与本地存储

Ollama 的模型名形如 `qwen3:0.6b`，冒号前是模型名，后面是标签；完整写法是 `registry.ollama.ai/library/qwen3:0.6b`，省略时默认仓库 `registry.ollama.ai`、命名空间 `library`、标签 `latest`。标签通常组合了参数规模和量化，例如 `qwen3:8b`、`qwen3:8b-q8_0`；不带量化后缀的标签一般是 `Q4_K_M`。`latest` 只是一个普通标签，指向维护者选定的某个版本，不同时间拉到的 `latest` 可能不是同一份权重，生产中要写死具体标签，必要时记下 `ollama list` 里的 ID。

```bash
ollama pull qwen3:0.6b        # 下载
ollama list                   # 本地已有的模型
ollama show qwen3:0.6b        # 架构、上下文长度、量化、能力、默认参数
ollama rm qwen3:0.6b          # 删除
```

本机实测 `ollama show qwen3:0.6b` 的输出（节选）：架构 `qwen3`、`context length 40960`、`quantization Q4_K_M`，能力包括 `completion`、`tools`、`thinking`（默认开启思考），默认参数 `temperature 0.6`、`top_k 20`、`top_p 0.95`。这些默认参数来自模型发布者，会覆盖 Ollama 的全局默认（`temperature 0.8`、`top_k 40`、`top_p 0.9`）。

模型存放在 `OLLAMA_MODELS` 目录，默认 `~/.ollama/models`；Linux 用安装脚本装成系统服务时，服务以 `ollama` 用户运行，目录在 `/usr/share/ollama/.ollama/models`。目录结构借鉴了容器镜像：

```text
models/
├── manifests/registry.ollama.ai/library/qwen3/0.6b   # 清单：这个标签由哪些层组成
├── manifests-v2/ollama.com/library/qwen3/0.6b        # 新版清单路径
└── blobs/
    ├── sha256-7f4030…   # 权重（GGUF，522 MB）
    ├── sha256-ae370d…   # 对话模板
    ├── sha256-d18a5c…   # 许可证
    └── sha256-cff3f3…   # 默认参数
```

清单是一个 JSON，列出各层的类型（`application/vnd.ollama.image.model`、`.template`、`.license`、`.params`）和 sha256 摘要；层文件按摘要命名，多个标签共用同一份权重时只存一次。这意味着两件事：权重文件就是一个普通 GGUF，可以拿给 `llama-server` 直接加载；但不要手动改 `blobs/` 里的文件，摘要对不上会被当作损坏。

## Modelfile：在已有模型上叠一层

Modelfile 的作用类似 Dockerfile：从一个基础模型出发，叠加参数、系统提示和模板，生成一个新名字的模型。它不训练、也不修改权重。资料助手的一个本地版本可以这样定义（本机实测）：

```text
FROM ./Qwen3-0.6B-Q4_K_M.gguf
PARAMETER num_ctx 8192
PARAMETER temperature 0.3
SYSTEM 你是公司资料助手，只根据给定资料回答，资料里没有就说不知道。
```

```bash
ollama create assistant-qwen3 -f Modelfile
ollama run assistant-qwen3
```

`FROM` 可以是库里的模型名、本地 GGUF 文件，或一个 safetensors 目录。常用指令：

| 指令 | 作用 |
| --- | --- |
| `FROM` | 基础模型（必需） |
| `PARAMETER` | 默认参数，如 `num_ctx`、`temperature`、`top_k`、`top_p`、`min_p`、`stop`、`num_predict`、`repeat_penalty`、`seed` |
| `SYSTEM` | 默认系统提示 |
| `TEMPLATE` | 对话模板（Go 模板语法） |
| `MESSAGE` | 预置几轮示例对话 |
| `LICENSE` | 许可证文本 |
| `REQUIRES` | 要求的最低 Ollama 版本 |
| `CAPABILITY` | 声明模型能力 |

源码的解析器还认 `ADAPTER`（LoRA）、`DRAFT`（投机解码的草稿模型）、`RENDERER`、`PARSER`，其中 LoRA 适配器在运行时会打印“已废弃，将在未来版本移除”的警告。

量化要分两种情况。从 **safetensors** 导入时，`ollama create --quantize` 可以在导入时量化，可选 `int4`、`int8`、`nvfp4`、`mxfp4`、`mxfp8`，结果走 MLX 路径。从 **GGUF** 导入时 Ollama 不做量化，实测加 `--quantize q4_K_M` 会直接报错：

```text
Error: create-time quantization is only supported for safetensors imports; quantize GGUF models before importing
```

想要 `Q4_K_M` 之类的 GGUF 量化档，先用上一篇的 `llama-quantize` 做好，再 `FROM` 进来。

**一个失败的例子。** 用上面这个 Modelfile 问“差旅住宿标准是多少？”，没有给任何资料，模型回答“根据公司资料，差旅住宿标准为：每人每天200元”。`SYSTEM` 里写了“没有就说不知道”，0.6B 的模型仍然编了一个具体数字。系统提示只是提示词的一部分，不是护栏：资料助手要靠检索把真实制度放进上下文，再由程序检查回答是否引用了给定资料，无法确认时拒答。

## API：原生接口与兼容接口

Ollama 同时提供三套接口，都在同一个端口上：

| 接口 | 路径 | 适合 |
| --- | --- | --- |
| 原生 API | `/api/chat`、`/api/generate`、`/api/embed`，以及 `/api/pull`、`/api/create`、`/api/show`、`/api/ps`、`/api/tags`、`/api/delete` 等管理接口 | 需要 Ollama 特有参数：`options`、`keep_alive`、`think`、`format` |
| OpenAI 兼容 | `/v1/chat/completions`、`/v1/completions`、`/v1/embeddings`、`/v1/models`、`/v1/responses`、`/v1/audio/*` | 现有 OpenAI SDK 代码，只改 `base_url` |
| Anthropic 兼容 | `/v1/messages` | Anthropic SDK、需要 Messages 格式的工具 |

原生接口的一次请求（本机实测）：

```bash
curl -s http://127.0.0.1:11434/api/chat -d '{
  "model": "qwen3:0.6b",
  "messages": [{"role": "user", "content": "用一句话说明报销需要哪些材料。"}],
  "think": false, "stream": false,
  "options": {"num_predict": 128}
}'
# "content": "报销需要提供发票、报销凭证、项目资料和相关证明。"
# "load_duration": 524351875, "prompt_eval_count": 24, "eval_count": 15, ...
```

原生接口默认流式返回，`stream: false` 才一次返回；结果里的 `load_duration`、`prompt_eval_duration`、`eval_duration`（纳秒）能直接看出慢在加载、Prompt 还是生成。`format` 字段可以传 `"json"` 或一个 JSON Schema 做结构化输出，Ollama 会把它转成语法约束交给 `llama-server`。

OpenAI 兼容接口要求填 `api_key`，但服务端并不检查，随便填一个即可：

```python
from openai import OpenAI
client = OpenAI(base_url="http://127.0.0.1:11434/v1/", api_key="ollama")  # 必填但不校验
client.chat.completions.create(model="qwen3:0.6b", messages=[{"role": "user", "content": "你好"}])
```

兼容接口的局限在于 OpenAI 协议里没有“上下文长度”这个参数。原生接口可以在 `options.num_ctx` 里逐请求指定，兼容接口只能靠全局的 `OLLAMA_CONTEXT_LENGTH`，或用 Modelfile 做一个带 `PARAMETER num_ctx` 的新模型名。这直接引出下一节的问题。

## 上下文长度：默认值取决于显存

v0.40.12 不再用一个固定的默认上下文。服务启动时把所有 GPU 的总显存加起来（减去 `OLLAMA_GPU_OVERHEAD`），按三档决定默认值：

| 总显存 | 默认上下文 |
| --- | ---: |
| 不到 23 GiB | 4096 |
| 23—47 GiB | 32768 |
| 47 GiB 及以上 | 262144 |

源码里阈值写成 23/47 GiB，比文档里的 24/48 略低，是为了容忍不同驱动报告的细微差异。实测 24 GB 内存的 M4 笔记本，Metal 报告可用 17.8 GiB，服务日志是：

```text
msg="vram-based default context" total_vram="17.8 GiB" default_num_ctx=4096
```

也就是说，**在大多数 16—24 GB 的笔记本上，默认上下文只有 4096**。优先级从高到低是：请求里的 `options.num_ctx` > Modelfile 的 `PARAMETER num_ctx` > 环境变量 `OLLAMA_CONTEXT_LENGTH` > 按显存自动。最终值不会超过模型的训练长度；如果加载时内存不够，调度器会依次退到 32768、4096 再试。

上下文不够时 Ollama 不会报错：聊天接口默认 `truncate: true`，渲染后的提示超长时从最早的历史消息开始丢，只保证系统消息和最新一条消息留下；生成过程中写满上下文，`llama-server` 以 `--context-shift --keep 4` 运行，会丢掉早期内容继续生成。对闲聊影响不大，但资料助手把检索到的几段制度原文放进对话历史时，可能在不知不觉中被截掉。检查办法是看响应里的 `prompt_eval_count` 是否接近上下文长度，需要长上下文时显式设置 `num_ctx`。

Ollama 自己的文档在这一点上并不一致：FAQ 仍写“默认 4096”，Modelfile 文档写 `num_ctx` 默认 2048，只有“Context length”页和代码一致。以代码和 `ollama ps` 的 `CONTEXT` 列为准。

## 并发与内存：几个环境变量

服务端的行为主要由环境变量控制，修改后要重启 `ollama serve`（macOS 用 `launchctl setenv`，Linux 在 systemd 的 override 文件里加 `Environment=`）。和并发、内存相关的几个：

| 变量 | 默认值 | 作用 |
| --- | --- | --- |
| `OLLAMA_HOST` | `127.0.0.1:11434` | 监听地址和端口 |
| `OLLAMA_NUM_PARALLEL` | 1 | 每个模型同时处理的请求数 |
| `OLLAMA_MAX_LOADED_MODELS` | 0（自动：3 × GPU 数，无 GPU 时 3） | 同时驻留的模型数 |
| `OLLAMA_MAX_QUEUE` | 512 | 排队上限，满了返回 HTTP 503 |
| `OLLAMA_KEEP_ALIVE` | 5m | 模型空闲多久后卸载；负数常驻，0 立即卸载 |
| `OLLAMA_CONTEXT_LENGTH` | 0（自动，见上节） | 默认上下文 |
| `OLLAMA_FLASH_ATTENTION` | 自动 | 设为 1/0 强制开或关 |
| `OLLAMA_KV_CACHE_TYPE` | `f16` | KV 类型，可选 `q8_0`、`q4_0`；全局生效 |
| `OLLAMA_GPU_OVERHEAD` | 0 | 每块 GPU 预留给其他程序的字节数 |
| `OLLAMA_SCHED_SPREAD` | 关 | 强制把模型摊到所有 GPU |
| `OLLAMA_LOAD_TIMEOUT` | 5m | 加载超时 |
| `OLLAMA_MODELS` | `~/.ollama/models` | 模型目录 |

最值得注意的是 `OLLAMA_NUM_PARALLEL` 默认为 1：同一个模型同一时间只处理一个请求，其他请求排队。本机实测同时发 4 个请求（每个生成 128 token）：

| 设置 | 子进程参数 | 4 个请求的耗时 | 总吞吐 | `ollama ps` 占用 |
| --- | --- | --- | ---: | ---: |
| 默认 | `-c 4096 -np 1` | 4.3 / 8.1 / 12.4 / 16.4 s，逐个排队 | 31 token/s | 826 MB |
| `OLLAMA_NUM_PARALLEL=4` | `-c 16384 -np 4` | 4 个都是 6.5 s | 79 token/s | 2.3 GB |

并行 4 路后吞吐提高到约 2.5 倍，最后一个请求的等待从 16 秒降到 6.5 秒，代价是内存从 826 MB 涨到 2.3 GB。原因在子进程参数里：Ollama 把 `-c` 设为“上下文 × 并行数”，并显式传 `-np`，按上一篇的规则，KV 池被平均切成 4 份，每路仍是 4096。所以并行数翻几倍，KV 内存就翻几倍；在显存紧张的机器上加大并行，可能导致模型放不进 GPU，部分层退回 CPU，反而更慢。嵌入模型和部分架构（如 qwen3vl、qwen3next、mllama 等）会被强制为 1 路。

多个模型时，调度器按“预计占用是否超过空闲内存的 80%”决定是否先卸载别的模型。实测在已加载 `qwen3:0.6b` 时再调用上面的 `assistant-qwen3`（`num_ctx 8192`、4 路并行），两者同时驻留，`ollama ps` 显示后者占 4.4 GB；请求里带 `"keep_alive": 0` 后它被立即卸载，响应的 `done_reason` 为 `unload`。在资料助手这类“一个主模型 + 一个嵌入模型”的部署里，可以把 `OLLAMA_KEEP_ALIVE` 设为 `-1` 让它们常驻，避免第一个请求承担几秒的加载时间。

## GPU 支持

| 平台 | 支持情况（v0.40.12 文档） |
| --- | --- |
| NVIDIA | 计算能力 5.0 及以上，驱动 550 以上（5.0—6.2 的老卡需要 570 以上） |
| AMD | Linux 和 Windows 上用 ROCm v7，支持列表从 gfx908 到 gfx1201；更多 AMD 卡可以走 Vulkan |
| Vulkan | 安装了 Vulkan 后端时默认启用（macOS 除外），覆盖 Intel 等其他显卡 |
| Apple | macOS 14 及以上；M 系列芯片用 Metal 和 MLX，Intel Mac 只能用 CPU |
| 其他 | NVIDIA Jetson 有单独的发布包 |

模型能整个放进一块 GPU 时，Ollama 优先只用一块，减少卡间通信；放不下才摊到多块。`ollama ps` 的 `PROCESSOR` 列显示 GPU/CPU 的比例，看到 `48%/52% CPU/GPU` 这类混合比例，就说明有一部分层在 CPU 上，速度会明显下降，应该换更小的量化、缩短上下文或减少并行。

## 安全边界：默认没有鉴权

Ollama 的服务端**没有 API Key 校验**。`OLLAMA_AUTH` 这个变量名容易误解，它只让客户端在请求上签名（用于连接 ollama.com），本地服务端并不据此拒绝请求。默认只监听 `127.0.0.1`，此时只有本机进程能访问；服务端还会检查 Host 头，在回环地址上只接受本地和内网形式的主机名，用来防御借助 DNS 重绑定从网页发起的请求。跨域方面，默认允许 `localhost`、`127.0.0.1`、`0.0.0.0` 以及 `app://`、`file://`、`vscode-webview://` 等来源，`OLLAMA_ORIGINS` 只能在此基础上追加。

问题出在“为了让同事能用，把 `OLLAMA_HOST` 改成 `0.0.0.0`”。这一步之后，网络上任何能访问这台机器 11434 端口的人都可以：

- 免费使用这台机器的 GPU 跑任意模型；
- 调用 `/api/pull` 下载模型占满磁盘，调用 `/api/delete` 删除已有模型，调用 `/api/create` 创建模型；
- 用 `/api/ps`、`/api/tags`、`/api/show` 看到你装了什么、正在跑什么。

安全研究者多次在公网上扫描到成千上万个这样暴露的 Ollama 实例。如果确实要给别人用，保持 Ollama 监听 `127.0.0.1`，在前面放一个反向代理，由代理负责 TLS、鉴权、限流和接口白名单（只放行 `/v1/chat/completions`、`/api/chat` 等推理接口，拦掉 `pull`、`delete`、`create`）。官方 FAQ 给的 Nginx 示例只做了转发和 `Host` 头改写，鉴权要自己加；用 ngrok、Cloudflare Tunnel 暴露时同样如此。

另一个边界是云模型。Ollama 现在可以登录 ollama.com，运行带 `:cloud` 后缀的模型，请求会发到 Ollama 的云端而不是本机 GPU。处理敏感资料的环境如果要求数据不出本机，可以设置 `OLLAMA_NO_CLOUD=1`（或在 `~/.ollama/server.json` 里设置 `disable_ollama_cloud`）关闭这一功能，并在日志里确认 `Ollama cloud disabled: true`。

## 什么时候该换成 vLLM 或 SGLang

Ollama 的设计目标是“一个人、一台机器、很多个模型随用随换”，适合：

- 个人开发和调试，需要一个随时可用的 OpenAI 兼容端点；
- 桌面应用、编辑器插件、Agent 工具的本地后端；
- 离线环境下的演示和小范围试用；
- 在一台机器上频繁切换、比较多个模型。

出现下面这些需求时，就该考虑第 01、02 篇的服务端引擎了：

- **并发上来了。** 几十个用户同时在线，需要分页 KV、块级前缀缓存和按 token 预算的调度（[第 8](../llm-inference/08-paged-attention.md)—[11 篇](../llm-inference/11-chunked-prefill.md)），Ollama 每个模型固定几路并行、每路固定一段上下文的方式会浪费内存，也压不满 GPU。
- **需要多卡或多机。** Ollama 能把一个模型摊到同一台机器的多块 GPU 上，但没有张量并行和数据并行的精细控制，也不能跨机器。
- **需要可观测性和稳定的生产参数。** Ollama 没有 Prometheus 指标接口；它的很多默认值（上下文、并行、默认模型标签）会随版本变化。
- **需要鉴权和多租户。** 这些本来就不该由推理引擎负责，但 vLLM、SGLang 至少支持 API Key，并有成熟的网关和 K8s 部署方案（[推理系列第 21 篇](../llm-inference/21-production.md)）。
- **模型和格式。** 需要 FP8、AWQ、GPTQ 等 GPU 量化格式，或刚发布的新架构时，vLLM、SGLang 的支持往往更早；Ollama 能跑的就是它的 llama.cpp 和 MLX 支持的范围。

一个实际的做法是：开发阶段用 Ollama 的 OpenAI 兼容接口写代码，上线时把 `base_url` 指向 vLLM。两边都是 OpenAI 协议，但模型名、对话模板、默认采样参数和上下文长度都不一样，切换后要用同一组问题重新验收。

## 版本与变化

v0.40.12 于 2026 年 10 月 27 日发布，三天前是 v0.40.11。Ollama 发版非常频繁，10 月份就从 0.40.1 走到 0.40.12，基本是几天一个版本，每个版本通常都会更新内置的 llama.cpp 和 MLX。v0.40.12 新增了 Liquid AI 的 LFM3 系列和 d1 2B 决策模型（这一版只在 Apple 硬件上支持），改进了 Apple Silicon 上 Gemma 4 等模型的 Prompt 处理速度，MLX 路径支持 DFlash2 草稿模型的投机解码。

近一年和使用者关系最大的几处变化：

- **推理由上游 llama.cpp 和 MLX 承担。** GGUF 模型直接由随包的 `llama-server` 运行，旧的 Go 自研引擎已经移除；问题排查可以参照 llama.cpp 的参数和日志。
- **默认上下文按显存分档**，不再是固定的 2048 或 4096。
- **兼容接口扩展**：除 OpenAI 的 Chat Completions，还有 Responses、音频接口和 Anthropic Messages。
- **云模型和 `ollama launch`**：后者用来配置并启动 OpenCode、Claude Code、Codex 等外部编码工具连到 Ollama。

升级前记下 `ollama --version`、所用模型的标签和 ID、环境变量和 Modelfile；升级后用 `ollama ps` 核对上下文、并行和 GPU 比例是否和以前一致，再跑一遍业务回归问题。生产环境不要依赖自动更新的桌面 App，固定安装包版本。

Ollama 把 llama.cpp 和 MLX 包装成一个带模型仓库、自动调度和常驻接口的本地服务，代价是并发、上下文和安全都取了“单人本机”的默认值：默认 1 路并行，16—24 GB 的机器默认只有 4096 上下文，没有鉴权。了解这些默认值，它是本地开发最省事的工具；超出它的设计范围，就该换成服务端引擎。资料助手还要做一个离线版本，放在出差同事的 MacBook 上。下一篇看 [MLX-LM 与端侧框架](./07-local-and-edge.md)：在 Apple 芯片的统一内存里，模型怎样加载、量化、微调和提供服务。
