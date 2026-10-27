# 13. 读一个最小推理引擎：nano-vllm

前五篇讲了推理引擎的核心机制：分页的 KV、连续批处理与抢占、前缀缓存、分块预填充、CUDA Graph。只看文字和图，这些机制容易停留在“大概知道”。vLLM 的代码有几十万行，从头读起很难抓住主线。这一篇换一种学法：读 **nano-vllm**，一个只有约 1400 行 Python 的最小推理引擎，它把这些机制都实现了一遍。读完你应该能顺着一个请求，在代码里找到它被调度、分配 KV 块、命中前缀、录制成图、写入缓存的每一个位置。

## 为什么读它

nano-vllm 是一个用来学习的项目，目标是用尽量少的代码复现 vLLM 的核心思路。它只支持 Qwen3 系列模型，只做离线批量推理，没有 HTTP 服务；但分页 KV、前缀缓存、调度与抢占、受限的分块预填充、CUDA Graph、张量并行这些机制都有，而且每个都只用几十行实现。

它的 README 给出了一组离线吞吐对比：在一块 8 GB 显存的 RTX 4070 笔记本 GPU 上，用 Qwen3-0.6B 处理 256 个请求（输入、输出长度各在 100—1024 之间随机），vLLM 用时 98.37 秒，约 1362 token/s；nano-vllm 用时 93.41 秒，约 1434 token/s。这组数字只说明在这个小模型、这个离线场景下，它的核心路径并不慢；README 没有注明对比的 vLLM 版本，也不能推广到在线服务或大模型。

本文基于 2026 年 4 月 26 日的提交 `bb823b3`（版本 0.2.0）。不同版本的实现有差别，比如较早的版本没有分块预填充，对照阅读时请先切到这个提交。

```bash
git clone https://github.com/GeeeekExplorer/nano-vllm.git
cd nano-vllm && git checkout bb823b3
```

## 先看全貌

用 `wc -l` 统计，`nanovllm/` 包内一共 1385 行（含空行和注释；README 说约 1200 行，是不同的统计口径）。按职责分成四层：

![nano-vllm 的结构：LLMEngine 驱动主循环，Scheduler 和 BlockManager 负责调度与 KV 块，ModelRunner 准备输入并执行模型，Attention 层读写分页 KV](/ai/llm-inference/nano-vllm-map.svg)

| 文件 | 行数 | 职责 | 对应章节 |
| --- | ---: | --- | --- |
| `engine/llm_engine.py` | 90 | 主循环：`generate()` 和 `step()` | 第 7 篇 |
| `engine/sequence.py` | 83 | 一个请求的状态、token 和块表 | 第 3、8 篇 |
| `engine/scheduler.py` | 92 | 调度：Prefill/Decode、token 预算、抢占 | 第 9、11 篇 |
| `engine/block_manager.py` | 120 | KV 块的分配、引用计数、前缀哈希 | 第 8、10 篇 |
| `engine/model_runner.py` | 257 | KV 容量计算、准备输入、CUDA Graph、张量并行 | 第 4、12、16 篇 |
| `layers/attention.py` | 75 | 写入分页 KV，调用 FlashAttention | 第 8、12 篇 |
| `layers/linear.py` | 156 | 张量并行的线性层 | 第 16 篇 |
| `layers/sampler.py` | 12 | 温度采样 | 第 7 篇 |
| `models/qwen3.py` | 216 | Qwen3 模型结构 | — |

建议的阅读顺序，就是一个请求经过的顺序：入口 → 调度 → 块管理 → 执行准备 → 注意力。

## 第一站：主循环

使用方式和 vLLM 的离线接口几乎一样：

```python
from nanovllm import LLM, SamplingParams
llm = LLM("/YOUR/MODEL/PATH", enforce_eager=True, tensor_parallel_size=1)
sampling_params = SamplingParams(temperature=0.6, max_tokens=256)
outputs = llm.generate(["Hello, Nano-vLLM."], sampling_params)
```

`generate()` 把所有请求加入等待队列，然后不停调用 `step()`，直到等待和运行队列都空了。`step()` 就是第 7 篇说的“引擎主循环的一圈”，只有 7 行（`engine/llm_engine.py:49-55`）：

```python
def step(self):
    seqs, is_prefill = self.scheduler.schedule()
    num_tokens = sum(seq.num_scheduled_tokens for seq in seqs) if is_prefill else -len(seqs)
    token_ids = self.model_runner.call("run", seqs, is_prefill)
    self.scheduler.postprocess(seqs, token_ids, is_prefill)
    outputs = [(seq.seq_id, seq.completion_token_ids) for seq in seqs if seq.is_finished]
    return outputs, num_tokens
```

调度器选出这一步的请求，执行器算出每个请求的下一个 token，后处理把 token 追加进去并判断是否结束。所有机制都藏在这三个调用里面。

## 第二站：一个请求的状态

`Sequence` 记录一个请求的全部状态（`engine/sequence.py`）。值得关注的字段：

- `status`：只有 `WAITING`、`RUNNING`、`FINISHED` 三种。
- `token_ids`：输入加上已经生成的全部 token。
- `num_cached_tokens`：已经存在 KV Cache 里的 token 数，包括命中前缀的部分和分块预填充已经算完的部分。
- `block_table`：这个请求的块表，一个物理块编号的列表（第 8 篇）。
- `block_size`：默认 256，而且必须是 256 的倍数。vLLM 在 NVIDIA GPU 上常见的是 16，这里取大块是为了简化实现。

`num_cached_tokens` 是理解后面代码的关键。“这一步要算哪些 token”永远是从 `num_cached_tokens` 开始，到某个位置结束。前缀命中、分块续算、普通 Decode，都用这一个字段统一表达，这和第 11 篇说的 vLLM V1 的设计思路一致。

## 第三站：调度器

`Scheduler.schedule()` 有两段（`engine/scheduler.py:29-73`），先试 Prefill，再做 Decode。

**Prefill 段**：从等待队列的队首开始，按先来先服务的顺序处理。每个请求要满足三个条件才能加入这一步：同时运行的请求数没超过 `max_num_seqs`（默认 512），token 预算 `max_num_batched_tokens`（默认 16384）还有剩余，空闲 KV 块够用。第一次被调度的请求，会先查前缀缓存，算出有多少块已经命中，然后**一次性为整个输入分配所有的块**。

分块预填充在这里只有一行：

```python
if remaining < num_tokens and scheduled_seqs:  # only allow chunked prefill for the first seq
    break
```

只有这一步的第一个请求允许被切开：它放不下时，只算预算允许的那部分，剩下的留在等待队列队首，下一步继续。后面的请求放不下就直接结束本轮。只要这一段调度上了任何请求，这一步就是**纯 Prefill**，不做 Decode。这就是第 9 篇说的“Prefill 优先”策略，也是它和 vLLM V1 混合调度的最大区别。

**Decode 段**：没有新的 Prefill 时，让运行中的请求各推进 1 个 token。块不够时抢占队尾最后加入的请求，第 9 篇已经引用过这段代码。被抢占的请求释放全部块，放回**等待队列的最前面**，下一步优先重新 Prefill。它只有重算，没有换出到 CPU。

## 第四站：块管理与前缀缓存

`BlockManager`（`engine/block_manager.py`）管理所有物理块。每个块有一个引用计数、一个哈希值和它存放的 token 编号。全局维护一个空闲块队列和一张“哈希 → 块编号”表。

**前缀命中**。第 10 篇引用过它的链式哈希函数：块的哈希 = xxh64(前一块的哈希 + 本块的 token)。查找时从第一块开始逐块算哈希、查表，遇到第一个不命中的块就停止。命中时还会比对一遍块里的 token，防止哈希碰撞。注意查找只遍历到**倒数第二块**：

```python
for i in range(seq.num_blocks - 1):
```

最后一块即使恰好写满、也有缓存，也不参与命中。原因第 10 篇说过：至少要留一部分 token 真正做前向计算，才能得到下一个 token 的概率。

**何时需要新块**。Decode 时判断要不要分配新块，只用了一个巧妙的取模：

```python
def can_append(self, seq: Sequence) -> bool:
    return len(self.free_block_ids) >= (len(seq) % self.block_size == 1)
```

序列长度对块大小取模等于 1，说明刚追加的 token 是新块里的第一个，需要 1 个空闲块；否则当前块还有空位，需要 0 个。布尔值在这里被当作 0 和 1 使用。

**释放但不清空**。请求结束或被抢占时，块的引用计数减一，归零的块回到空闲队列，但它的哈希和 token **保留着**。只要这个块还没被重新分配出去，后来的请求仍然可以命中它。被抢占的请求重新 Prefill 时，往往能直接命中自己之前的块。

## 第五站：执行准备与 KV 容量

`ModelRunner`（`engine/model_runner.py`）是每张 GPU 上的执行者。

**KV 容量怎样算出来**。启动时先用一批假数据跑一次 Prefill，测出计算过程中的显存峰值，再把剩下的空间全部分给 KV Cache（`model_runner.py:106-113`，略去了取 KV 头数和每头维度的两行）：

```python
free, total = torch.cuda.mem_get_info()
used = total - free
peak = torch.cuda.memory_stats()["allocated_bytes.all.peak"]
current = torch.cuda.memory_stats()["allocated_bytes.all.current"]
block_bytes = 2 * num_hidden_layers * self.block_size * num_kv_heads * head_dim * dtype.itemsize
config.num_kvcache_blocks = int(total * config.gpu_memory_utilization - used - peak + current) // block_bytes
```

`block_bytes` 就是第 4 篇的公式乘以块大小：`2 × 层数 × KV 头数 × 每头维度 × 字节数 × 每块 token 数`。可用空间是“总显存 × 利用率 − 已经占用的 − 计算峰值多出的部分”。算出块数后，一次性申请一个大张量，形状是 `(2, 层数, 块数, 块大小, KV 头数, 每头维度)`，之后再也不重新分配。

**槽位映射**。`prepare_prefill` 和 `prepare_decode` 把这一步的请求整理成模型的输入，其中最重要的是 `slot_mapping`：每个要计算的 token，它的 K、V 应该写到 KV 大张量的哪个位置。公式就是第 8 篇的 `块表[逻辑块号] × 块大小 + 块内偏移`。Prefill 时只送入从 `num_cached_tokens` 开始的 token，命中前缀的部分不再计算。

**CUDA Graph**。只用于 Decode。启动时为批大小 1、2、4、8，然后 16 到 512 每隔 16 各录制一张图，从大到小录制，所有图共享一个显存池。运行时挑“不小于实际批大小”的最小那张，把真实数据拷进图的输入缓冲区，多出来的位置把槽位填成 -1，然后回放。计算词表概率的最后一层放在图外执行。第 12 篇引用过这段代码。

## 第六站：注意力层

`layers/attention.py` 只有 75 行，做两件事。

**写入 KV**。不论 Prefill 还是 Decode，先用一个 Triton 编写的小内核，把这一步每个 token 的 K、V 写进分页缓存：

```python
idx = tl.program_id(0)
slot = tl.load(slot_mapping_ptr + idx)
if slot == -1: return
key_offsets = idx * key_stride + tl.arange(0, D)
value_offsets = idx * value_stride + tl.arange(0, D)
key = tl.load(key_ptr + key_offsets)
value = tl.load(value_ptr + value_offsets)
cache_offsets = slot * D + tl.arange(0, D)
tl.store(k_cache_ptr + cache_offsets, key)
tl.store(v_cache_ptr + cache_offsets, value)
```

每个 GPU 线程块负责一个 token：读出它的槽位，把 K、V 复制过去。槽位为 -1 的是 CUDA Graph 填充出来的空位置，直接跳过。

**计算注意力**。直接调用 FlashAttention 库：Prefill 用 `flash_attn_varlen_func`，它能在一个批里处理长短不一的多个序列；Decode 用 `flash_attn_with_kvcache`，按块表从分页缓存里读历史 KV。有一个细节：如果这一步的 Prefill 有命中前缀或者是分块续算，就把块表也传给 Prefill 的调用，让它从分页缓存里读出完整的上下文，而不只是这一步新算的部分。

## 其余部分

**张量并行**。`layers/linear.py` 实现了第 16 篇要讲的张量并行：Q、K、V 投影和 MLP 的前半段按输出维度切分到各张卡上（列切分），注意力输出投影和 MLP 的后半段按输入维度切分（行切分），之后做一次 `all_reduce` 汇总。每一层一共两次 `all_reduce`。多卡之间的任务分发用了共享内存加事件通知，只支持单机。

**采样器**。只有 6 行，支持温度，不支持 top-k、top-p，而且不允许温度为 0 的贪心采样。它没有调用常规的多项式抽样，而是把概率除以一组指数分布的随机数再取最大值，这在数学上等价于按概率抽样，写起来更简洁。

## 它省略了什么

和 vLLM 相比，nano-vllm 有意省掉了很多东西。读它的时候要知道边界在哪里：

| 方面 | nano-vllm | vLLM |
| --- | --- | --- |
| 服务方式 | 离线批量，全部完成后一次返回 | OpenAI 兼容服务、流式输出 |
| 模型 | 只有 Qwen3 | 数百种架构，包括多模态 |
| 调度 | Prefill 优先，不混合；只有首个请求可分块 | 统一 token 预算，Decode 优先，任意请求可分块 |
| 抢占 | 重算 | 重算，可配合 KV 卸载组件 |
| 前缀缓存 | 256 token 的整块 | 按后端的块大小，常见 16 |
| 采样 | 只有温度 | 贪心、top-k、top-p、约束解码等 |
| 其他 | 无量化、无投机解码、无 LoRA、无流水线并行 | 都有 |

## 动手练习

有一张 NVIDIA GPU，就可以按 README 安装后做下面几个练习。它们都只需要改几行代码：

1. 在 `BlockManager.allocate` 里打印每个请求命中了多少块，然后发送几个开头相同、结尾不同的请求，验证第 10 篇说的命中规则。注意 nano-vllm 只按 256 token 的整块命中，而且最后一块不参与命中，所以共同开头至少要有 256 个 token，而且整个输入要比 256 个 token 更长，才能看到第一个块命中。
2. 把 `enforce_eager` 分别设为 `True` 和 `False`，用 `bench.py` 对比吞吐，观察 CUDA Graph 对小模型 Decode 的影响。
3. 把 `max_num_batched_tokens` 调小，再发送一个长输入和几个短输入，观察第一个请求被分块、后面的请求等待的现象。
4. 调小 `gpu_memory_utilization` 让 KV 块变少，在 `preempt` 里打印日志，观察抢占在什么时候发生。

nano-vllm 用约 1400 行代码实现了推理引擎的骨架：`step()` 驱动主循环，调度器按 Prefill 优先和 token 预算挑选请求、块不够时抢占，块管理器用链式哈希做前缀缓存，执行器按显存余量算出 KV 块数并为 Decode 录制 CUDA Graph，注意力层把 K、V 写进分页缓存再调用 FlashAttention。读懂它，再去读 vLLM 的对应模块会容易很多。

第三部分到这里结束。第四部分换一个方向：不改调度，而是让每一步要搬的数据更少。下一篇讲[量化](./14-quantization.md)。
