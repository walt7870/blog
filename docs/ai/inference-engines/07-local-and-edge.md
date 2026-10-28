# 07. MLX-LM 与端侧框架：在 Apple 芯片和用户设备上运行模型

第 01—04 篇的框架都跑在数据中心：一张 H100、几十个并发请求、追求每张卡的吞吐；第 05、06 篇的 llama.cpp 和 Ollama 把模型搬到了个人电脑上。资料助手还要做一个离线版本，装在出差同事的 MacBook 上，没有网络也能查制度。这时约束完全变了：只有一个用户，没有批可以凑；内存和系统、浏览器、聊天软件共用；模型要小到几个 GB 以内；装起来要简单，最好一条命令。

[端侧推理篇](../llm-inference/22-edge.md)已经讲了这类场景的共同原理：单用户 Decode 的速度上限约等于内存带宽除以模型大小，Prefill 受限于有限的算力，部署时要分清模型格式、运行时和后端三层，测试要看冷启动、峰值内存和持续运行后的速度。这一篇不重复这些原理，而是落到具体框架上：主角是 Apple 的 **MLX-LM**，讲它怎样利用统一内存、怎样生成、量化、提供服务和做 LoRA 微调，并在一台 Apple M4 笔记本上实际运行；最后简要定位 ExecuTorch、MLC-LLM 等面向手机和跨平台的端侧运行时，帮助判断什么时候该用哪一个。llama.cpp 和 Ollama 的细节见[第 05 篇](./05-llama-cpp.md)和[第 06 篇](./06-ollama.md)。

本篇以 **mlx-lm 0.32.2**（2026 年 10 月 16 日发布）和 **mlx 0.32.4**（2026 年 10 月 14 日发布）为准，参数默认值对照了 mlx-lm 0.32.2 的源码。标注“实测”的命令和数字来自一台 Apple M4、24 GB 统一内存、macOS 26.6 的笔记本。测试时这台机器上还有其他程序在运行，速度数字偏保守，只用来说明量级和趋势，不能当成 M4 的性能基准。

## MLX 和 MLX-LM 是什么

**MLX** 是 Apple 机器学习研究团队开源的数组框架，用法接近 NumPy 和 PyTorch，专门为 Apple 芯片设计。它有两个和推理关系很大的特点。第一是**统一内存**：数组放在 CPU 和 GPU 共用的同一块内存里，在哪个设备上计算只是参数，不需要像 CUDA 那样把权重从内存拷进显存。第二是**惰性求值**：运算先记录成计算图，真正需要结果时才执行，框架可以借此合并运算、减少中间结果的内存。MLX 的 GPU 计算通过 Metal 完成，近年也加入了 CUDA 和 CPU 后端，所以 mlx-lm 的 `pyproject.toml` 里有 `cuda12`、`cuda13`、`cpu` 这几个可选依赖组，可以装在 Linux 机器上。不过它的主场仍是 Mac。

**MLX-LM** 是建立在 MLX 之上的大模型工具包，同样由 `ml-explore` 组织维护。它提供：从 Hugging Face 加载模型、生成文本、终端对话、OpenAI 风格的 HTTP 服务、量化转换、LoRA 与全参数微调、困惑度和评测，以及基于 `mx.distributed` 的多机推理。社区组织 `mlx-community` 在 Hugging Face 上维护了大量已经转换和量化好的 MLX 模型，大多数情况下可以直接下载使用。

它和前面几篇框架的关系可以这样理解：

| 框架 | 模型格式 | 在 Mac 上的位置 |
| --- | --- | --- |
| MLX-LM | MLX 格式的 safetensors（加上 config 和分词器） | Apple 自家框架，Python 为主，适合实验、微调和本地服务 |
| llama.cpp / Ollama | GGUF | C/C++ 实现，Metal 后端；跨平台，单个可执行文件，安装最省事 |
| mlx-vlm | MLX 格式 | 社区项目，专做多模态模型 |
| vLLM-Metal | Hugging Face 格式 | vLLM 官方组织下的插件，基于 MLX，在 Mac 上提供 vLLM 的接口 |

同一个模型在 MLX 和 GGUF 下是两份不同的文件，不能互相直接使用。选择 MLX-LM 的主要理由是：想在 Python 里控制生成过程、想在 Mac 上做 LoRA 微调，或者需要 MLX 社区先支持的新模型。

## 统一内存：能放多大，跑多快

在 Mac 上跑模型，第一个问题是“放不放得下”。统一内存省掉了拷贝，但 GPU 能稳定使用的内存比标称容量小。

![独立显卡要先把权重拷进显存，Apple 统一内存中 CPU 和 GPU 共用一块内存；本机 24 GiB 中 GPU 推荐工作集约 17.8 GiB](/ai/inference-engines/mlx-memory.svg)

macOS 给 GPU 设了一个“推荐工作集”上限。在本机上用 `mx.device_info()` 读到（实测）：

```python
>>> import mlx.core as mx
>>> mx.device_info()
{'device_name': 'Apple M4', 'max_recommended_working_set_size': 19069665280,
 'memory_size': 25769803776, 'architecture': 'applegpu_g16g', 'max_buffer_length': 14302248960, ...}
```

总内存 24 GiB，推荐工作集约 17.8 GiB，约占 74%。mlx-lm 在生成时会把“常驻内存（wired memory）上限”设为这个值，让模型权重和 KV 不被系统换出；如果模型本身的字节数超过推荐工作集的 90%，会打印一条警告：

```text
[WARNING] Generating with a model that requires ... MB which is close to the maximum recommended size of ... MB. This can be slow.
```

看到这条警告，说明模型对这台机器来说太大，生成会明显变慢。官方给的处理办法是在 macOS 15 及以上用 `sudo sysctl iogpu.wired_limit_mb=N` 调高上限，N 要大于模型的 MB 数、小于总内存。这个设置重启后失效，调得太高会挤压系统和其他应用，在日常使用的笔记本上要谨慎；更稳妥的做法是换更小或位数更低的模型。

按这台 24 GB 的机器算资料助手能用的模型（权重按 4 位、每 64 个权重一组存一对 16 位缩放和偏置，平均约 4.5 位）：

| 模型 | 4 位权重 | 8K 上下文的 KV | 放得下吗 |
| --- | ---: | ---: | --- |
| Qwen3-0.6B | 约 0.3 GiB | 约 0.9 GiB | 轻松 |
| Qwen3-8B | 约 4.3 GiB | 约 1.1 GiB | 可以，留给系统的空间充足 |
| 32B 级模型 | 约 17 GiB | 数 GiB | 超出推荐工作集，不建议 |

Qwen3-0.6B 的 KV 并不比 8B 小多少，因为两者的层数（28 和 36）和 KV 头数（都是 8）接近，每个 token 的 KV 只取决于这些结构参数。小模型省下的主要是权重。

速度上限沿用第 22 篇的估算：Decode 每一步都要把权重读一遍。M4 的内存带宽约 120 GB/s，Qwen3-8B 的 4 位版本约 4.6 GB，单用户 Decode 理论上限约 26 token/s；Qwen3-0.6B 的 4 位版本约 0.35 GB，上限约 340 token/s。M4 Pro、M4 Max 的带宽是 273 GB/s 和最高 546 GB/s，同一个模型的上限按比例提高。实际速度会低于上限，原因包括注意力读 KV、反量化计算和调度开销。

## 安装与第一次生成

MLX-LM 需要 Python 3.11 或更新、Apple 芯片的 Mac（Intel Mac 不支持 Metal 后端）。下面的命令在本机实际运行过，用 uv 建一个独立环境（也可以用 `python3.12 -m venv` 加 `pip`）：

```bash
uv venv --python 3.12 .venv-mlx
source .venv-mlx/bin/activate
uv pip install 'mlx-lm==0.32.2'      # 同时装上 mlx 0.32.4

mlx_lm.generate --model mlx-community/Qwen3-0.6B-4bit \
  --prompt "用三句话说明年假怎么申请。" --max-tokens 256
```

第一次运行会从 Hugging Face 下载模型（这个模型约 335 MB），之后读本地缓存。输出的最后几行是速度和内存（实测，连续运行三次，Decode 在 92–122 token/s 之间，下面是其中一次）：

```text
==========
Prompt: 17 tokens, 334.095 tokens-per-sec
Generation: 256 tokens, 120.035 tokens-per-sec
Peak memory: 0.486 GB
```

`Prompt` 一行是 Prefill 速度，`Generation` 一行是 Decode 速度，`Peak memory` 是 MLX 分配的峰值内存。17 个 token 的提示太短，Prefill 速度主要反映启动开销，没有参考意义。Decode 约 120 token/s，低于上节算出的 340 token/s 上限：0.6B 这样的小模型每一步的计算量很小，固定开销（内核启动、采样、Python 循环）占比变大，带宽并没有被用满。这也是端侧常见的现象，模型越小，离带宽上限越远。

几个常用参数的默认值：`--max-tokens` 100、`--temp` 0（贪心解码）、`--top-p` 1.0、`--prefill-step-size` 2048。不写 `--model` 时用的是 `mlx-community/Llama-3.2-3B-Instruct-4bit`。Qwen3 默认开启思考模式，输出会先出现一段 `<think>` 内容；在资料助手这种问答里通常要关掉，可以加 `--chat-template-config '{"enable_thinking": false}'`。

终端对话用 `mlx_lm.chat --model ...`，在 Python 里调用则是：

```python
from mlx_lm import load, stream_generate

model, tokenizer = load("mlx-community/Qwen3-0.6B-4bit")
messages = [{"role": "user", "content": "年假怎么申请？"}]
prompt = tokenizer.apply_chat_template(messages, add_generation_prompt=True)
for r in stream_generate(model, tokenizer, prompt, max_tokens=256):
    print(r.text, end="", flush=True)
```

## 输入变长以后：Prefill、批量和长上下文

资料助手的真实请求带着系统提示和检索到的制度段落，一个请求两千 token 很常见。用 `mlx_lm.benchmark` 固定输入 2048 token、输出 256 token，在本机上测（实测，机器同时有其他负载）：

```bash
mlx_lm.benchmark --model mlx-community/Qwen3-0.6B-4bit -p 2048 -g 256 -n 3        # 批大小 1
mlx_lm.benchmark --model mlx-community/Qwen3-0.6B-4bit -p 2048 -g 256 -b 8 -n 2   # 批大小 8
```

| 批大小 | Prefill（token/s） | Decode（token/s，批 8 为 8 个序列合计） | 峰值内存 |
| ---: | ---: | ---: | ---: |
| 1 | 约 670–950 | 约 17–74 | 1.24 GB |
| 8 | 约 700–870 | 约 46–116 | 2.91 GB |

同一组参数多次运行，Decode 速度相差一倍以上，这是机器上其他负载造成的，表里给的是范围而不是单个数字。即使有干扰，趋势仍然清楚：

第一，Prefill 是计算受限的，每秒八九百 token 意味着读完 2048 token 的输入要两秒多，0.6B 模型尚且如此，8B 模型的计算量是它的十几倍，这就是端侧首 token 慢的来源，推理系列第 22 篇讲的“控制输入长度”“预先算好系统提示的 KV”在这里很具体。第二，上下文从十几个 token 变成 2048 个以后，Decode 速度从约 120 token/s 掉到了 74 token/s 以下：每一步除了读权重，还要读越来越长的 KV，对 0.6B 这种权重很小的模型，2048 个 token 的 KV 约 220 MiB，已经是权重的三分之二。第三，批大小从 1 提到 8，8 个序列合计的 Decode 吞吐有所上升：权重读一次可以服务 8 个序列，和数据中心的批处理是同一个原理。但单个用户感受到的速度并没有变快，离线版的资料助手只有一个人用，批处理帮不上忙。

长输入还有几个工具：

- `--prefill-step-size`（默认 2048）：长提示分段处理，每段多少 token。调小能降低 Prefill 时的峰值内存，代价是 Prefill 变慢。
- `--max-kv-size n`：把 KV 变成固定大小的循环缓存，超过 n 个 token 后覆盖最早的部分。内存可控，但模型会“忘掉”开头，对需要完整读文档的问答不合适。
- `--kv-bits 4` 或 `8`：KV 量化，从第 `--quantized-kv-start`（默认 5000）个 token 起量化，分组大小 `--kv-group-size` 默认 64。注意量化 KV 上的注意力不是融合实现，会产生一个 `prefill_step_size × 上下文长度` 的分数矩阵，开 KV 量化时要同时调小 `--prefill-step-size`，否则省下的内存可能还不够这个矩阵用。
- `mlx_lm.cache_prompt`：把一段长提示的 KV 预先算好存成文件，之后 `mlx_lm.generate --prompt-cache-file` 直接加载，只算新问题。资料助手可以把系统提示和常用制度文档预先缓存。

## 量化：mlx_lm.convert 与几种学习型量化

`mlx-community` 上没有现成版本，或者想自己控制量化方式时，用 `mlx_lm.convert`：

```bash
mlx_lm.convert --model Qwen/Qwen3-8B -q --mlx-path ./qwen3-8b-4bit
```

`-q` 打开量化，默认是 `affine` 模式、4 位、每 64 个权重一组（每组存缩放和偏置）。`--q-mode` 还可以选 `mxfp4`（默认 4 位、每 32 个一组）、`nvfp4`（4 位、每 16 个一组）、`mxfp8`（8 位、每 32 个一组），这些是[量化篇](../llm-inference/14-quantization.md)讲过的微缩放浮点格式。`--q-bits` 和 `--q-group-size` 可以覆盖默认值；`--quant-predicate` 提供 `mixed_2_6`、`mixed_3_4`、`mixed_3_6`、`mixed_4_6` 几种混合位宽方案，对敏感的层用高位、其余用低位。输出目录默认 `mlx_model`，**已存在会直接报错**，避免覆盖。转换时模型按惰性方式加载，但 8B 模型的 BF16 原始权重要先下载约 16 GB，磁盘要留够。

直接“四舍五入”式的量化在 3 位、2 位时质量下降明显。mlx-lm 提供了四种用校准数据改善质量的方法，各有独立命令（需要 `pip install "mlx-lm[train]"`）：

| 命令 | 方法 | 特点 |
| --- | --- | --- |
| `mlx_lm.dynamic_quant` | 按每层对输出的敏感度分配位数 | 最快 |
| `mlx_lm.awq` | AWQ：量化前按激活缩放和裁剪权重 | 与第 04 篇 LMDeploy 的 W4A16 同一类方法 |
| `mlx_lm.gptq` | GPTQ：逐层最小化输出误差 | 经典方法 |
| `mlx_lm.dwq` | DWQ：以未量化模型为老师，微调缩放、偏置等参数 | 更慢，通常效果最好，可以接在其他方法之后 |

量化后要在自己的问答集上比较质量，而不是只看文件变小了多少，验收方法见量化篇。

## mlx_lm.server：本地的 OpenAI 风格接口

资料助手的离线客户端可以通过本地 HTTP 接口调用模型，这样换模型或换框架都不用改客户端代码：

```bash
mlx_lm.server --model mlx-community/Qwen3-0.6B-4bit
```

默认监听 **127.0.0.1:8080**，只接受本机访问。提供 `/v1/chat/completions`、`/v1/completions`、`/v1/models` 和 `/health`。在本机实测：

```bash
$ curl -s localhost:8080/health
{"status": "ok"}

$ curl -s localhost:8080/v1/chat/completions -H "Content-Type: application/json" \
    -d '{"messages": [{"role": "user", "content": "年假怎么申请？用两句话回答。"}], "max_tokens": 128}'
```

返回的 `choices[0].message.content` 是：“年假申请通常需要提供工作证明和身份证，具体步骤可能因地区和公司政策有所不同。”这条回答格式正确，内容却是编的：0.6B 的通用模型不知道这家公司的制度，于是给出一个听起来合理的答案。离线资料助手依然要把制度原文检索出来放进上下文，模型只负责组织语言（见[推理系列第 1 篇](../llm-inference/01-inference-system.md)对各层职责的划分）。启动时加了 `--chat-template-args '{"enable_thinking":false}'` 关闭 Qwen3 的思考输出；`system_fingerprint` 字段里能看到 mlx-lm、mlx 和系统的版本。

同一台机器上，一个 200 token 的请求单独发送耗时 1.7–4.3 秒，4 个相同请求同时发送，各自完成耗时 5.3–8.9 秒（实测，波动来自机器上的其他负载），大致短于逐个处理所需的 4 × 1.7–4.3 秒，和服务端把它们合并成批解码的行为相符。

服务端的生成默认值和命令行不同：`max_tokens` 默认 512、温度 0。几个和并发有关的参数：

| 参数 | 默认 | 含义 |
| --- | --- | --- |
| `--decode-concurrency` | 32 | 可批处理时，最多同时解码多少个请求 |
| `--prompt-concurrency` | 8 | 可批处理时，最多同时处理多少个提示 |
| `--prefill-step-size` | 2048 | 同上，分段 Prefill |
| `--prompt-cache-size` | 10 | 最多保留多少份不同的 KV 缓存，用于多轮对话复用 |
| `--prompt-cache-bytes` | 不限 | KV 缓存的总字节上限 |
| `--kv-bits` | 不量化 | 设置后关闭批处理，请求逐个处理 |
| `--draft-model`、`--num-draft-tokens` | 无、3 | 投机解码的草稿模型 |

0.32 的服务端已经有连续批处理：新请求可以加入正在解码的批。但有几种情况会退回到逐个处理：用了草稿模型、开了 `--kv-bits`、请求里指定了 `seed`、请求里带图片。

官方文档明确写着：这个服务**不建议用于生产**，只实现了基本的安全检查。它没有认证；请求体里的 `model` 和 `adapters` 字段可以让服务端加载另一个本地路径或 Hugging Face 上的模型；`--allowed-origins` 默认是 `*`。把 `--host` 改成 `0.0.0.0` 让局域网访问之前，要想清楚谁能连上来。给一个人用的离线助手，保持默认的 127.0.0.1 就好。

## LoRA 微调：在笔记本上训练适配器

MLX-LM 的一个独特之处是可以直接在 Mac 上微调。资料助手想让模型熟悉公司术语和回答格式时，可以用几百条问答做 LoRA：

![MLX-LM 的命令关系：Hugging Face 模型经 convert 量化成 MLX 模型目录，供 generate、chat、server 使用；训练数据经 lora 得到适配器，可直接加载或用 fuse 合并](/ai/inference-engines/mlx-workflow.svg)

数据放在一个目录里，`train.jsonl` 必须有，`valid.jsonl` 可选（有它才报告验证损失），`test.jsonl` 用于 `--test`。每行一条，支持 `chat`、`tools`、`completions`、`text` 四种格式，资料助手用 `chat` 格式：

```json
{"messages": [{"role": "system", "content": "你是公司资料助手。"}, {"role": "user", "content": "年假怎么申请？"}, {"role": "assistant", "content": "在 OA 系统提交年假申请，直属主管审批后生效。"}]}
```

训练命令（实测，用 32 条训练、8 条验证的示例数据跑 50 步，只验证流程能走通）：

```bash
uv pip install 'mlx-lm[train]==0.32.2'
mlx_lm.lora --model mlx-community/Qwen3-0.6B-4bit --train --data ./lora-data \
  --iters 50 --batch-size 4 --steps-per-eval 25 --adapter-path ./adapters
```

```text
Trainable parameters: 0.484% (2.884M/596.050M)
iter   train_loss     tok/s
   1   val 6.936
  10   3.132          198
  20   0.601          200
  25   val 0.175
  40   0.053          188
  50   val 0.042
```

整个过程约 1 分钟，进程常驻内存约 0.7 GB，得到一个 11 MB 的 `adapters.safetensors`。只有 0.48% 的参数参与训练。挂上适配器提问：

```bash
mlx_lm.generate --model mlx-community/Qwen3-0.6B-4bit --adapter-path ./adapters \
  --system-prompt "你是公司资料助手。" --prompt "年假怎么申请？" \
  --chat-template-config '{"enable_thinking": false}'
```

训练集里的问题“年假怎么申请？”得到了训练数据里的原话。换一个训练集里没有的问题“产假有几天？”，模型回答“产假为十天，需在领证后一年内休完”，这是把训练集里婚假的答案套了过来。这个示例的验证集是训练集的复制，验证损失降到 0.04 只说明模型背下了这 5 个问答，不说明它学会了什么。

`--model` 指向量化模型时，训练自动变成 QLoRA：底座保持 4 位冻结，只训练 16 位的低秩矩阵。主要默认值：微调方式 `lora`（另有 `dora` 和全参数 `full`），只在最后 16 层加适配器（`--num-layers`），`--batch-size` 4，`--iters` 1000，学习率 1e-5，`--max-seq-length` 2048，秩 8、缩放 20，每 100 步保存一次到 `adapters/`。加 `--mask-prompt` 只对回答部分计算损失。

训练完成后有两种用法：生成和服务时用 `--adapter-path adapters` 直接挂上；或者用 `mlx_lm.fuse` 把适配器合并进模型，得到一个新的模型目录。

内存不够时，官方建议按这个顺序调：先用量化模型（QLoRA），再把 `--batch-size` 降到 1 或 2（可以配合 `--grad-accumulation-steps` 保持等效批大小），再减少 `--num-layers`，把长样本切短，最后打开 `--grad-checkpoint` 用计算换内存。

一次 50 步的训练只能证明命令能跑通。微调是否让资料助手变好，要用训练时没见过的问题测，并且像上面的产假问题那样，检查它有没有开始编造制度条款。制度会更新，把条款背进权重不如用检索把最新文档放进上下文，LoRA 更适合学习回答格式和术语，而不是记住会变的事实。

## MLX-LM 的边界

- **只有一个人用时它最合适。** 服务端虽然有批处理，但没有认证、分页 KV、多实例路由和监控指标，不应该拿来给团队提供共享服务。团队共用请回到前几篇的服务端框架。
- **多模态要换工具。** mlx-lm 加载 Qwen3-VL 这类模型时会丢弃视觉部分，按纯文本模型运行，带图片的请求只对极少数模型有效。看图问答用社区的 mlx-vlm。
- **Mac 以外的设备要另选。** 虽然 MLX 有 CUDA 后端，但在 NVIDIA GPU 上，vLLM、SGLang 等框架的生态和优化积累远多于 MLX。在 iPhone 上，MLX 有 Swift 版本可用，但移动端更常见的是下面介绍的 ExecuTorch、Core ML 或 MLC-LLM。
- **大模型受限于推荐工作集。** 24 GB 的机器跑 8B 模型很舒服，32B 级模型就超出了。内存大的 Mac（64 GB、128 GB）能放下数据中心单卡都放不下的模型，但带宽决定了它们的 Decode 速度只有每秒十几到几十 token。
- **一个失败的例子。** 想在这台 24 GB 的机器上用 `--kv-bits 4` 跑一个 32K 上下文的长文档问答以节省内存，如果保持默认的 `--prefill-step-size 2048`，量化 KV 的非融合注意力会生成 2048 × 32768 的分数矩阵，每层每头都要这样一块，峰值内存反而可能比不量化还高。这时要把 `--prefill-step-size` 降到 512 甚至更低，并接受 Prefill 变慢。

## 其他端侧运行时：怎样定位

MLX-LM 解决的是“Mac 上的大模型”。离线资料助手如果还要上手机、上 Windows 笔记本或在浏览器里运行，就要看其他运行时。各运行时的原理和端侧测试方法在[推理系列第 22 篇](../llm-inference/22-edge.md)讲过，这里只做定位：

| 运行时 | 核心思路 | 典型目标 | 什么时候优先考虑 |
| --- | --- | --- | --- |
| llama.cpp / Ollama | C/C++ 实现，GGUF 格式，多后端 | 桌面、服务器、部分移动端 | 要跨 Windows、Linux、Mac 统一一套方案，或要最简单的安装（第 05、06 篇） |
| MLX-LM | Apple 数组框架，统一内存 | Mac | Mac 上的 Python 实验、微调、本地服务 |
| ExecuTorch | PyTorch 官方端侧运行时，`torch.export` 导出成 `.pte`，再交给不同后端 | iOS、Android、嵌入式 | 移动应用，模型在 PyTorch 里，需要调用 NPU |
| MLC-LLM | 基于 TVM 的机器学习编译，同一模型编译到多个平台 | 浏览器（WebGPU）、iOS、Android、各类 GPU | 需要在浏览器里运行，或想用一套编译流程覆盖很多设备 |
| Core ML、ONNX Runtime、LiteRT | 各平台通用的推理运行时 | 对应平台 | 已有的应用栈就是这些，或者模型以非生成式为主 |

**ExecuTorch** 当前正式版是 1.5.1（2026-09-23）。它的流程是三步：用 `torch.export` 捕获计算图；按目标硬件量化、优化，并由“分区器”把子图交给 XNNPACK（CPU）、Core ML、Qualcomm、Vulkan 等后端，后端不支持的算子回退到 CPU，产出 `.pte` 文件；设备上用一个很小的 C++ 运行时加载执行，并提供 Swift、Kotlin 接口。大模型可以用 `executorch.extension.llm.export.export_llm` 或 Hugging Face 的 Optimum-ExecuTorch 导出。它的优势是直接对接 PyTorch 生态和各家手机芯片的 NPU，Meta 在自家应用中大规模使用；代价是导出和后端适配需要工程投入，模型结构稍特殊就可能遇到不支持的算子。

**MLC-LLM** 走的是编译器路线：用 TVM 把模型编译成针对特定硬件的代码，同一套流程覆盖 CUDA、ROCm、Vulkan、Metal、Android 的 OpenCL 和浏览器的 WebGPU，引擎 MLCEngine 在各平台提供 OpenAI 兼容接口，浏览器版本是姊妹项目 WebLLM。需要注意它的发布方式：GitHub 上没有正式发布版本，只有开发版标签，安装依赖项目提供的预编译包，版本管理和升级要比有正式版的项目更谨慎。

选择端侧运行时时，第 22 篇的那条规则同样适用：“支持 iOS”“支持 NPU”“支持这个模型”是三件独立的事，要确认的是“模型 × 运行时版本 × 后端 × 设备型号”这个组合确实可用，并在目标设备上测持续运行后的速度和峰值内存。

## 版本与变化

**mlx-lm** 当前正式版是 0.32.2（2026-10-16），10 月 15 日到 16 日两天内连发了 0.32.0、0.32.1、0.32.2 三个版本；上一个版本是 4 月的 0.31.3。0.32 系列的主要变化：可以直接加载未转换的 Hugging Face 模型；为 nvfp4 量化的 MoE 加入全局缩放；新增 MiniCPM5 等模型的工具调用解析；修复了一批模型在批处理和长生成时的问题。它要求 Python 3.11 及以上、mlx 0.32.2 及以上、transformers 5.7 及以上，从旧环境升级时 transformers 的大版本变化最容易引起问题，建议新建环境。

**mlx** 当前是 0.32.4（2026-10-14），大约每月一个小版本。mlx-lm 的命令和参数变化较快，`python -m mlx_lm.server` 这种调用方式已经提示弃用，改用 `mlx_lm.server` 或 `python -m mlx_lm server`。

升级时记录 mlx、mlx-lm、transformers 的版本和模型的 Hugging Face 提交号，在同一台机器上用同一组问题比较质量和速度。端侧的速度还和系统负载、温度有关，比较时要在相同条件下多跑几次。

MLX-LM 把 Apple 芯片的统一内存变成了一个方便的本地实验平台：一条命令下载量化好的模型并生成，`mlx_lm.convert` 做量化，`mlx_lm.server` 提供本地接口，`mlx_lm.lora` 在笔记本上微调。它能放多大的模型由推荐工作集决定，能跑多快由内存带宽决定，适合单人使用而不是团队服务。手机和浏览器则交给 ExecuTorch、MLC-LLM 这类端侧运行时。

到这里，单个引擎的故事讲完了。资料助手在数据中心里扩展到很多副本以后，副本之间的路由、KV 的跨机传输和缓存，由引擎之上的另一层负责。下一篇看[分布式编排与 KV 缓存组件](./08-orchestration.md)。
