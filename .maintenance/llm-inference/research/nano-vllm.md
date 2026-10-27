# nano-vllm 源码研读笔记

> 所有结论都来自对下列 commit 源码的逐行阅读，引用格式 `file:line`（路径相对仓库根）。
> 写文章时若引用其他版本，请重新核对行号。

- 仓库：https://github.com/GeeeekExplorer/nano-vllm
- Commit：`bb823b3e06983d71485a8e1f23715ebd87d98ef8`
- 日期：`Sun Apr 26 13:10:12 2026 +0800`
- Commit 标题：`Merge pull request #218 from GeeeekExplorer/chunked-prefill-refactor`
  （注意：这一版**已经有受限的 chunked prefill**，比较早的版本没有。很多网上文章基于旧版，写的是"没有 chunked prefill"，跟这一版对不上。）
- pyproject：`version = "0.2.0"`，依赖 `torch>=2.4.0, triton>=3.0.0, transformers>=4.51.0, flash-attn, xxhash`，`requires-python = ">=3.10,<3.13"`（pyproject.toml:7,13-20）

## 0. 行数统计（`wc -l`，含空行和注释）

| 文件 | 行数 |
|---|---|
| nanovllm/__init__.py | 2 |
| nanovllm/llm.py | 5 |
| nanovllm/config.py | 25 |
| nanovllm/sampling_params.py | 11 |
| nanovllm/engine/llm_engine.py | 90 |
| nanovllm/engine/sequence.py | 83 |
| nanovllm/engine/scheduler.py | 92 |
| nanovllm/engine/block_manager.py | 120 |
| nanovllm/engine/model_runner.py | 257 |
| nanovllm/layers/activation.py | 11 |
| nanovllm/layers/attention.py | 75 |
| nanovllm/layers/embed_head.py | 66 |
| nanovllm/layers/layernorm.py | 50 |
| nanovllm/layers/linear.py | 156 |
| nanovllm/layers/rotary_embedding.py | 59 |
| nanovllm/layers/sampler.py | 12 |
| nanovllm/models/qwen3.py | 216 |
| nanovllm/utils/context.py | 27 |
| nanovllm/utils/loader.py | 28 |
| **nanovllm/ 包合计** | **1385** |
| example.py | 33 |
| bench.py | 32 |
| **全部 .py 合计** | **1450** |

README 自称 "~ 1,200 lines of Python code"；`wc -l` 实测包内 1385 行（含空行），两者口径不同，文章里建议写"约 1,400 行（README 称约 1,200 行）"。

## 1. 目录结构与各文件职责

```
nanovllm/
  __init__.py          导出 LLM, SamplingParams
  llm.py               class LLM(LLMEngine): pass —— 纯别名
  config.py            Config dataclass：全部引擎参数
  sampling_params.py   SamplingParams：temperature / max_tokens / ignore_eos
  engine/
    llm_engine.py      LLMEngine：起 TP 子进程、tokenizer、Scheduler；step()/generate() 主循环
    sequence.py        Sequence + SequenceStatus：单个请求的状态、token、block_table
    scheduler.py       Scheduler：waiting/running 队列，prefill/decode 决策，抢占，后处理
    block_manager.py   Block + BlockManager：分页 KV 块分配、引用计数、prefix caching 哈希
    model_runner.py    ModelRunner：每个 GPU 一个；建模型、算 KV 容量、CUDA Graph、准备输入、采样、共享内存 RPC
  layers/
    attention.py       Triton store_kvcache kernel + 调 flash-attn 的 Attention
    linear.py          Replicated / ColumnParallel / MergedColumnParallel / QKVParallel / RowParallel
    embed_head.py      VocabParallelEmbedding / ParallelLMHead
    layernorm.py       RMSNorm（含 fused add+norm）
    rotary_embedding.py RoPE（预计算 cos/sin cache）
    activation.py      SiluAndMul
    sampler.py         温度采样（指数分布噪声技巧）
  models/qwen3.py      Qwen3 模型定义（唯一支持的模型）
  utils/context.py     全局 Context：把 prefill/decode 元数据传给 Attention 层
  utils/loader.py      从 safetensors 加载权重，处理 q/k/v、gate/up 打包
```

### config.py 关键默认值（config.py:7-18）
- `max_num_batched_tokens = 16384`
- `max_num_seqs = 512`
- `max_model_len = 4096`（`__post_init__` 再与 `hf_config.max_position_embeddings` 取 min，config.py:25）
- `gpu_memory_utilization = 0.9`
- `tensor_parallel_size = 1`，断言 `1 <= tp <= 8`（config.py:23）
- `enforce_eager = False`
- `kvcache_block_size = 256`，断言 `% 256 == 0`（config.py:22）
- `num_kvcache_blocks = -1`（由 ModelRunner 运行时算出并写回）
- `eos = -1`（LLMEngine 用 tokenizer 的 `eos_token_id` 覆盖，llm_engine.py:33）

### sampling_params.py（sampling_params.py:5-11）
只有三个字段：`temperature=1.0`、`max_tokens=64`、`ignore_eos=False`；`__post_init__` 断言 `temperature > 1e-10, "greedy sampling is not permitted"`。

## 2. 公开 API

README Quick Start（原文）：

```python
from nanovllm import LLM, SamplingParams
llm = LLM("/YOUR/MODEL/PATH", enforce_eager=True, tensor_parallel_size=1)
sampling_params = SamplingParams(temperature=0.6, max_tokens=256)
prompts = ["Hello, Nano-vLLM."]
outputs = llm.generate(prompts, sampling_params)
outputs[0]["text"]
```

- `LLM(model, **kwargs)`：只挑出属于 `Config` 字段的 kwargs，其余静默忽略（llm_engine.py:18-20）。
- `generate(prompts, sampling_params, use_tqdm=True)`：prompts 可以是字符串列表或 token id 列表（llm_engine.py:62）；`sampling_params` 可以是单个或与 prompts 等长的列表（llm_engine.py:67-68）。
- 返回值是 `[{"text": ..., "token_ids": ...}]`，按 seq_id（即提交顺序）排序（llm_engine.py:88-89）。函数签名标注 `-> list[str]`，但实际返回 dict 列表（llm_engine.py:65 vs 89）。
- 与 vLLM 的差异（README 原话）："The API mirrors vLLM's interface with minor differences in the `LLM.generate` method"——差异就在输出是 dict 而不是 `RequestOutput`。
- example.py 用 `tokenizer.apply_chat_template(..., tokenize=False, add_generation_prompt=True)` 先套模板再传字符串（example.py:16-24）。

## 3. 主循环

### LLMEngine.__init__（llm_engine.py:17-35）
1. 构造 Config；把 `Sequence.block_size` 类属性设为 `config.kvcache_block_size`（:21）。
2. 用 `mp.get_context("spawn")` 为 rank 1..tp-1 各起一个进程，目标就是 `ModelRunner(config, i, event)`（:24-30），每个子进程一个 `Event`。
3. rank 0 的 ModelRunner 在主进程里构造，拿到所有 events 列表（:31）。
4. tokenizer、Scheduler（此时 `config.num_kvcache_blocks` 已被 ModelRunner 算好）、`atexit` 注册 exit。

### step()（llm_engine.py:49-55）
1. `seqs, is_prefill = self.scheduler.schedule()`
2. 统计 token 数：prefill 时为本步所有 `num_scheduled_tokens` 之和；decode 时为 `-len(seqs)`（用正负号区分 prefill/decode，供 tqdm 计算吞吐，:51、:76-79）。
3. `self.model_runner.call("run", seqs, is_prefill)` 得到每个序列一个新 token。
4. `scheduler.postprocess(...)` 追加 token、判断结束。
5. 返回本步结束的 `(seq_id, completion_token_ids)`。

### generate()（llm_engine.py:60-90）
先 `add_request` 全部（字符串用 tokenizer.encode，:44-45），然后 `while not self.is_finished(): self.step()`（:73-75）；`is_finished` = waiting 和 running 都为空（scheduler.py:19-20）。没有流式输出，全部完成后一次性 decode 返回。

### prefill / decode 由谁决定
完全由 `Scheduler.schedule()` 决定：**只要 waiting 队列里能调度出至少一个序列，本步就是纯 prefill 步**；否则才做 decode（scheduler.py:54-55）。一个 batch 不会混合 prefill 和 decode。

## 4. Sequence（engine/sequence.py）

- 状态：`WAITING / RUNNING / FINISHED` 三种（sequence.py:8-11），没有 SWAPPED 等状态。
- `block_size = 256` 类属性（:15），被 LLMEngine 覆盖为 config 值。`counter = count()` 全局自增 seq_id（:16, :19）。
- 字段（:19-31）：`token_ids`（prompt+已生成）、`last_token`、`num_tokens`、`num_prompt_tokens`、`num_cached_tokens`（已经在 KV cache 里的 token 数，包括 prefix 命中和已算完的 chunk）、`num_scheduled_tokens`（本步要算的 token 数）、`is_prefill`、`block_table`（物理块 id 列表）、`temperature / max_tokens / ignore_eos`。
- `num_blocks = ceil(num_tokens / block_size)`（:56-57）；`last_block_num_tokens`（:60-61）；`block(i)` 返回第 i 块的 token 切片（:63-65）。
- 序列化优化：`__getstate__` 在 decode 阶段只发 `last_token`，prefill 阶段才发完整 `token_ids`（:72-74）——这是为了减小经共享内存 pickle 给 TP 子进程的数据量。

## 5. Scheduler（engine/scheduler.py）

两个 `deque`：`waiting`、`running`（:16-17）。

### schedule() 的精确策略

**Prefill 阶段**（:29-55）——总是先尝试：
- 循环条件：`waiting` 非空且已调度数 `< max_num_seqs`（:30）。只看队首 `waiting[0]`（FCFS，不跳过）。
- `remaining = max_num_batched_tokens - num_batched_tokens`，为 0 则停（:32-34）。
- 如果该序列还没有 block_table（第一次调度）：`can_allocate` 返回命中的前缀块数，`-1` 表示空闲块不够 → 停（:35-38）；本次要算的 token 数 = `num_tokens - num_cached_blocks * block_size`（:39）。
- 如果已有 block_table（之前被 chunk 过）：要算的 token = `num_tokens - num_cached_tokens`（:40-41）。
- **chunked prefill 只允许 batch 中第一个序列**：`if remaining < num_tokens and scheduled_seqs: break`（:42，注释原文 "only allow chunked prefill for the first seq"）。也就是说，第一个序列如果放不下会被切成 `min(num_tokens, remaining)`（:46），后续序列放不下则直接结束本轮。
- 第一次调度时 `block_manager.allocate(seq, num_cached_blocks)`——**一次性为整个 prompt 分配所有块**（:44-45）。
- 只有当 `num_cached_tokens + num_scheduled_tokens == num_tokens`（整个 prompt 本步算完）时，才把状态设为 RUNNING、从 waiting 弹出、放进 running（:48-51）；被切块的序列仍留在 waiting 队首，下一步继续。
- 有任何序列被调度就返回 `(scheduled_seqs, True)`（:54-55）。

**Decode 阶段**（:57-73）：
- 循环条件：`running` 非空且 `< max_num_seqs`（:58）。decode 不检查 `max_num_batched_tokens`。
- 从 running 左端取一个 seq；`while not can_append(seq)`：若 running 还有别的序列，就**抢占 running 尾部（最后加入的）那个** `self.preempt(self.running.pop())`；否则抢占自己并 break（:60-65）。
- `while...else`：能 append 时设 `num_scheduled_tokens = 1`、`is_prefill = False`、`may_append`（必要时新分配块）、加入本批（:66-70）。
- 最后 `self.running.extendleft(reversed(scheduled_seqs))` 把本批按原顺序放回 running 左端（:72）。

### 抢占（preempt，:75-79）
- 状态改回 WAITING，`is_prefill = True`，`block_manager.deallocate(seq)` **释放全部块**（引用计数减一，归零的块回到 free 队列），然后 `waiting.appendleft(seq)` 放到等待队列**最前面**，下一步优先重新 prefill。
- 只有"重算"（recompute）式抢占，没有换出到 CPU（swap）。
- 被释放的块的 hash 仍留在 `hash_to_block_id`（只有在该块被重新分配时才删除，block_manager.py:47-48），所以重新 prefill 时满块部分可能直接命中 prefix cache。

### postprocess（:81-92）
对每个序列：
1. `block_manager.hash_blocks(seq)`：给本步新填满的块算哈希（:83）。
2. `num_cached_tokens += num_scheduled_tokens`，清零 scheduled（:84-85）。
3. 如果是 prefill 且还没算完整个 prompt（chunk 未完），**丢弃本步采样出的 token**，continue（:86-87）。
4. 否则 `append_token`；遇到 EOS（且非 ignore_eos）或生成数达到 `max_tokens` → FINISHED，deallocate，从 running 移除（:88-92）。

## 6. BlockManager（engine/block_manager.py）

- `Block`：`block_id`、`ref_count`、`hash`（-1 表示未哈希）、`token_ids`（:8-23）。`reset()` 把 ref_count 设为 1（:20-23）。
- `BlockManager`：`blocks` 列表、`hash_to_block_id: dict[int,int]`、`free_block_ids: deque`、`used_block_ids: set`（:28-33）。块大小来自 config，默认 256。

### 哈希（compute_hash，:35-41）
- 使用 **xxhash 的 `xxh64`**。
- 先放前一块的哈希 `prefix.to_bytes(8, "little")`（如果 prefix != -1），再放 `np.array(token_ids).tobytes()`，返回 `intdigest()`。
- 即：**链式哈希 = hash(前一块哈希 + 本块 token ids)**，因此相同哈希意味着整个前缀相同。
- 命中时还会比对 `self.blocks[block_id].token_ids != token_ids` 来防哈希碰撞（:66）。

### can_allocate（:58-73）
- 只遍历 `range(seq.num_blocks - 1)`——**最后一块永远不参与前缀命中**（哪怕它恰好是满块），保证至少有一些 token 需要真正计算以产生 logits。
- 逐块算链式哈希、查 `hash_to_block_id`，第一次不命中就 break（只匹配连续前缀）。
- 命中块若正在被使用（在 `used_block_ids`）则不需要新块，`num_new_blocks -= 1`；命中但已在 free 队列里的块仍要从 free 队列拿出来，所以仍计入需求。
- 空闲块不足返回 -1，否则返回命中块数。

### allocate（:75-92）
- 对命中的前缀块：在用则 `ref_count += 1`；已空闲则 `ref_count = 1` 并从 free 队列移到 used（:83-88）。
- 其余块调用 `_allocate_block()` 从 free 队列左端取新块（:90-91）。`_allocate_block` 若发现该块旧 hash 仍映射到自己，就从 `hash_to_block_id` 删除，然后 reset（:43-51）。
- `seq.num_cached_tokens = num_cached_blocks * block_size`（:92）。

### deallocate（:94-101）
倒序遍历 block_table，`ref_count -= 1`，归零则放回 free 队列尾部（`_deallocate_block`，:53-56）；清零 `num_cached_tokens`、清空 block_table。块的 hash 和 token_ids **不清**，这就是"释放后仍可被前缀命中"的来源。

### can_append / may_append（:103-108）
- `can_append`: `len(self.free_block_ids) >= (len(seq) % self.block_size == 1)`——布尔值当 0/1：只有当序列长度模 block_size 等于 1（刚追加的 token 落在一个新块的第一个位置）时才需要 1 个空闲块。
- `may_append`: 同样条件下 `block_table.append(self._allocate_block())`。
- decode 时 `len(seq)` 已包含上一步刚 append 的 token（它的 KV 还没写），所以这里检查的是"这个待写 KV 的 token 是否需要新块"。

### hash_blocks（:110-120）
- `start = num_cached_tokens // block_size`，`end = (num_cached_tokens + num_scheduled_tokens) // block_size`——只给本步**新填满**的完整块算哈希；最后的不完整块不哈希（hash 保持 -1）。
- 链式起点取 `block_table[start-1]` 的 hash（:114），然后 `block.update(h, token_ids)` 并 `hash_to_block_id[h] = block_id`。
- decode 过程中块被填满时同样会被哈希，所以生成出来的 token 也会进入 prefix cache。

## 7. ModelRunner（engine/model_runner.py）

### 初始化（:17-48）
`dist.init_process_group("nccl", "tcp://localhost:2333", ...)`（:26）→ 设置默认 dtype 为 `hf_config.dtype`、默认 device cuda → 建 `Qwen3ForCausalLM` → `load_model` → `Sampler` → `warmup_model()` → `allocate_kv_cache()` → 非 eager 时 `capture_cudagraph()`（:31-37）。

### KV cache 容量计算（warmup_model :91-101 + allocate_kv_cache :103-121）
- warmup：用 `seq_len = min(max_num_batched_tokens, max_model_len)`、`num_seqs = min(max_num_batched_tokens // seq_len, max_num_seqs)` 个全 0 序列跑一次 prefill，目的是测出激活峰值（:93-100）。
- 公式（:106-113）：
  - `free, total = torch.cuda.mem_get_info()`；`used = total - free`
  - `peak = memory_stats()["allocated_bytes.all.peak"]`，`current = ...["allocated_bytes.all.current"]`
  - `num_kv_heads = num_key_value_heads // world_size`
  - `block_bytes = 2 * num_hidden_layers * block_size * num_kv_heads * head_dim * dtype.itemsize`
  - **`num_kvcache_blocks = int(total * gpu_memory_utilization - used - peak + current) // block_bytes`**
  - 含义：总显存 × 利用率，减去当前已用，再预留"峰值 − 当前"这部分激活开销。
- 一次性分配大张量 `kv_cache = torch.empty(2, num_hidden_layers, num_kvcache_blocks, block_size, num_kv_heads, head_dim)`（:115），再把 `kv_cache[0, layer_id]` / `kv_cache[1, layer_id]` 赋给每个有 `k_cache/v_cache` 属性的模块（即 Attention 层，:116-121）。

### 张量并行：多进程 + 共享内存（:41-89）
- rank 0 创建 `SharedMemory(name="nanovllm", create=True, size=2**20)`（1 MiB），其他 rank barrier 后打开并进入 `loop()`（:41-48）。
- `write_shm`（:76-83）：pickle `[method_name, *args]`，前 4 字节写长度（little-endian），然后对每个子进程 `event.set()`。
- `read_shm`（:68-74）：`event.wait()` → 读长度和数据 → `event.clear()`。
- `call`（:85-89）：rank 0 先广播再本地执行同名方法；`loop`（:61-66）中子进程收到 `"exit"` 后退出。
- 只有 rank 0 准备温度、运行 sampler（:216-218）；LM head 用 `dist.gather` 把 logits 收集到 rank 0（embed_head.py:62-65）。

### prepare_prefill（:129-170）
- 对每个序列：`start = num_cached_tokens`，`seqlen_q = num_scheduled_tokens`，`end = start + seqlen_q`，`seqlen_k = end`（:139-142）。
- `input_ids = seq[start:end]`，`positions = range(start, end)`（:143-144）——只送需要计算的 token。
- 累积 `cu_seqlens_q`、`cu_seqlens_k`、`max_seqlen_q/k`（:145-148）。
- `slot_mapping`：对 `[start, end)` 覆盖的每个块，计算物理槽位 `block_table[i] * block_size + offset`，首块从 `start % block_size` 开始，末块到 `end - i*block_size` 结束（:151-161）。warmup 时没有 block_table 直接 continue（:149-150）。
- `if cu_seqlens_k[-1] > cu_seqlens_q[-1]`（有前缀命中或之前 chunk 过的部分）才构造 `block_tables`（:162-163，注释写 "prefix cache"）。
- `set_context(True, cu_seqlens_q, cu_seqlens_k, max_seqlen_q, max_seqlen_k, slot_mapping, None, block_tables)`（:169）。

### prepare_decode（:172-188）
每个序列：`input_ids = last_token`，`positions = len(seq) - 1`，`context_lens = len(seq)`，`slot_mapping = block_table[-1] * block_size + last_block_num_tokens - 1`（:177-181）；block_tables 用 -1 补齐到最长（:123-127）。

### block_tables 的 padding（prepare_block_tables :123-127）
按 batch 内最长的 block_table 用 `-1` 补齐，pinned memory + `non_blocking` 拷贝到 GPU。

### run_model 与 CUDA Graph（:195-212, :222-257）
- 走 eager 的三种情况：`is_prefill`、`enforce_eager`、或 `input_ids.size(0) > 512`（:197-198）。**CUDA Graph 只用于 decode**。
- 捕获的 batch size：`graph_bs = [1, 2, 4, 8] + list(range(16, max_bs + 1, 16))`，`max_bs = min(max_num_seqs, 512)`（:226, :234）。默认配置下就是 1,2,4,8,16,32,...,512。
- 按从大到小顺序捕获（`reversed(self.graph_bs)`，:238），每个 bs 先 warmup 一次再 `torch.cuda.graph(graph, self.graph_pool)` 捕获；第一张图的 memory pool 给后面所有图共享（:243-245）。
- 静态输入缓冲区：`input_ids, positions, slot_mapping, context_lens, block_tables(max_bs × max_num_blocks), outputs(max_bs × hidden_size)`（:228-233, :250-257）；`max_num_blocks = ceil(max_model_len / block_size)`（:227）。
- 回放（:200-212）：选**第一个 ≥ 实际 bs** 的图；把真实数据拷进静态缓冲区前半部分，`slot_mapping.fill_(-1)`（多出的 padding 行写 -1，Triton kernel 遇到 -1 直接 return）、`context_lens.zero_()`；`graph.replay()`；`compute_logits`（LM head）**在图外**对 `outputs[:bs]` 执行。

### run（:214-220）
`prepare_prefill` 或 `prepare_decode` → rank 0 准备温度 → `run_model` → rank 0 sampler `.tolist()` → `reset_context()`。

## 8. Attention 层（layers/attention.py）

- 引入：`from flash_attn import flash_attn_varlen_func, flash_attn_with_kvcache`（:6）。
- **Triton `store_kvcache_kernel`**（:10-30）：grid 为 `(N,)`，每个 program 处理一个 token；读 `slot_mapping[idx]`，`-1` 则跳过；把该 token 全部 head 的 K/V（长度 `D = num_heads * head_dim`）写到 `k_cache/v_cache` 的 `slot * D` 处。包装函数里断言了各维 stride 连续（:33-40）。
- `forward`（:59-75）：
  1. 若 cache 非空（warmup 时为空张量）先 `store_kvcache`（:62-63）——**无论 prefill 还是 decode，都先把本步的 K/V 写进分页 cache**。
  2. prefill：调用 `flash_attn_varlen_func(q, k, v, cu_seqlens_q, cu_seqlens_k, max_seqlen_q, max_seqlen_k, causal=True, block_table=context.block_tables)`。**如果 `block_tables is not None`（前缀命中或 chunk 续算），把 k、v 换成整个 `k_cache/v_cache`，借 block_table 以分页方式读出完整上下文**（:65-70）；否则直接用本步的连续 k、v，block_table 为 None。
  3. decode：`flash_attn_with_kvcache(q.unsqueeze(1), k_cache, v_cache, cache_seqlens=context.context_lens, block_table=context.block_tables, causal=True)`（:71-74）。

## 9. 其他层

### 线性层（layers/linear.py）
- `LinearBase`：权重形状 `(output_size, input_size)`，给 param 挂 `weight_loader`（:12-34）。
- `ReplicatedLinear`：不切分（:37-51）。（Qwen3 模型里没有用到。）
- `ColumnParallelLinear`：沿输出维（`tp_dim=0`）切成 `output_size / tp`；前向不通信（:54-73）。
- `MergedColumnParallelLinear`：把多个列并行矩阵（gate/up）拼在一起，`weight_loader` 按 `loaded_shard_id` 计算 offset，并对加载的权重 `chunk(tp_size)[tp_rank]`（:76-93）。
- `QKVParallelLinear`：输出大小 `(total_num_heads + 2 * total_num_kv_heads) * head_size`，按 "q"/"k"/"v" 放到对应偏移（:96-128）。
- `RowParallelLinear`：沿输入维（`tp_dim=1`）切分；前向后 `dist.all_reduce`，bias 只在 rank 0 加（:131-156）。
- Qwen3 中：`qkv_proj = QKVParallelLinear`、`o_proj = RowParallelLinear`（qwen3.py:42-53）；`gate_up_proj = MergedColumnParallelLinear`、`down_proj = RowParallelLinear`（qwen3.py:100-109）——标准 Megatron 式"列切 → 行切 + all-reduce"，每层 attention 和 MLP 各一次 all-reduce。

### 词表并行（layers/embed_head.py）
- `VocabParallelEmbedding`：每个 rank 存 `num_embeddings / tp` 行；TP>1 时把不在本分片的 id mask 掉，查表后乘 mask，再 `all_reduce`（:34-42）。
- `ParallelLMHead`：prefill 时**只取每个序列最后一个位置** `cu_seqlens_q[1:] - 1` 计算 logits（:58-60）；TP>1 时 `dist.gather` 到 rank 0 再 `torch.cat(..., -1)`（:62-65）。
- `tie_word_embeddings` 时 lm_head 与 embed 共享权重（qwen3.py:202-203）。

### RoPE（layers/rotary_embedding.py）
- 预计算 `inv_freq = 1 / base^(arange(0, d, 2)/d)`，对 `max_position_embeddings` 个位置算 cos/sin 拼成 `cos_sin_cache`（:29-35）。
- `apply_rotary_emb` 是 "前一半/后一半"（NeoX 风格）旋转：`y1 = x1*cos - x2*sin; y2 = x2*cos + x1*sin`（:6-14）。
- `forward` 带 `@torch.compile`（:37）；`get_rope` 用 `lru_cache(1)` 让所有层共享同一个实例（:51-59）。

### RMSNorm（layers/layernorm.py）
- `rms_forward` 与 `add_rms_forward` 都是 `@torch.compile`（:16, :28）。
- fused 版本：`x = x + residual`（float32），新的 residual 为相加结果，再做归一化（:29-40）。Decoder 层用它把残差加法与下一个 norm 融合（qwen3.py:152-158）。

### SiluAndMul（layers/activation.py:6-11）
`x, y = x.chunk(2, -1); return F.silu(x) * y`，`@torch.compile`。

### Sampler（layers/sampler.py:7-12）
```
logits = logits.float().div_(temperatures.unsqueeze(dim=1))
probs = torch.softmax(logits, dim=-1)
sample_tokens = probs.div_(torch.empty_like(probs).exponential_(1).clamp_min_(1e-10)).argmax(dim=-1)
```
- 按序列温度缩放 → softmax → `probs / Exp(1) 噪声` 取 argmax。这是"指数分布竞赛（exponential race）"技巧，与 Gumbel-max 等价（argmax p_i/E_i 等价于按 p 采样），避免调用 `torch.multinomial`。
- 不支持 top-k / top-p；不支持 greedy（温度必须 > 1e-10）。整个 forward 有 `@torch.compile`。

### Qwen3 模型（models/qwen3.py）
- 无 qkv_bias 时对 q、k 做按 head 的 RMSNorm（`q_norm` / `k_norm`，:68-70, :82-84）——Qwen3 特有。`qkv_bias = getattr(config, 'attention_bias', True)`（:133）。
- `packed_modules_mapping`：`q_proj/k_proj/v_proj → qkv_proj`，`gate_proj/up_proj → gate_up_proj`（:187-193），供 loader 使用。

### utils/context.py
全局 `_CONTEXT`（dataclass：`is_prefill, cu_seqlens_q, cu_seqlens_k, max_seqlen_q, max_seqlen_k, slot_mapping, context_lens, block_tables`），`set_context / get_context / reset_context`（:5-27）。用全局变量把批次元数据传给深层 Attention 和 LMHead，免得逐层传参。

### utils/loader.py
遍历模型目录下所有 `*.safetensors`；权重名包含 packed key 时替换成打包后的参数名，并以 shard_id 调用该参数的 `weight_loader`；否则用参数自带或默认的 `copy_`（:12-28）。

## 10. README 中的 Benchmark（原文数据）

测试配置：
- Hardware: RTX 4070 Laptop (8GB)
- Model: Qwen3-0.6B
- Total Requests: 256 sequences
- Input Length: Randomly sampled between 100–1024 tokens
- Output Length: Randomly sampled between 100–1024 tokens

| Inference Engine | Output Tokens | Time (s) | Throughput (tokens/s) |
|---|---|---|---|
| vLLM | 133,966 | 98.37 | 1361.84 |
| Nano-vLLM | 133,966 | 93.41 | 1434.13 |

bench.py 的其他设置：`seed(0)`、`LLM(path, enforce_eager=False, max_model_len=4096)`、`SamplingParams(temperature=0.6, ignore_eos=True, max_tokens=randint(100, 1024))`、prompt token 为 `randint(0, 10000)` 随机 id；先跑一次 `"Benchmark: "` 预热；吞吐 = `sum(max_tokens) / 时间`（bench.py:9-28）。注意：这是纯离线吞吐（只统计输出 token），README 未注明 vLLM 版本。

## 11. nano-vllm 没有实现的东西（均经代码/README 核对）

- **只支持 Qwen3**：`models/` 下只有 qwen3.py，ModelRunner 硬编码 `Qwen3ForCausalLM`（model_runner.py:31）。
- **没有在线服务**：没有 HTTP / OpenAI 兼容 server，也没有流式输出；`generate` 全部完成后一次返回（llm_engine.py:73-90）。README 的定位就是 "Fast offline inference"。
- **采样参数极简**：只有 temperature / max_tokens / ignore_eos；无 top-k、top-p、repetition penalty、stop 字符串、logprobs、n>1、beam search；**不允许 greedy**（sampling_params.py:5-11）。
- **prefill 与 decode 不混批**（scheduler.py:54-55）。
- **chunked prefill 是受限版**：只允许每个 prefill batch 的第一个序列被切块（scheduler.py:42）；没有 vLLM 那种 decode 优先 + 混合 chunk 的调度。
- **抢占只有重算**（释放块、回 waiting 队首），没有 swap 到 CPU（scheduler.py:75-79）。
- **前缀缓存只按整块（256 token）命中**，且最后一块永远不参与命中（block_manager.py:62）。
- 没有量化（无 quant 相关代码），没有投机解码，没有 LoRA，没有 pipeline parallel（只有 TP，≤8，config.py:23），没有多模态。
- TP 只支持单机：`tcp://localhost:2333`（model_runner.py:26）+ 进程间共享内存（model_runner.py:43）。
- CUDA Graph 只覆盖 decode 且 bs ≤ 512（model_runner.py:197）。

## 12. 推荐的代码摘录（逐字复制，均 ≤ 15 行）

### ① 主循环一步：`nanovllm/engine/llm_engine.py:49-55`
```python
    def step(self):
        seqs, is_prefill = self.scheduler.schedule()
        num_tokens = sum(seq.num_scheduled_tokens for seq in seqs) if is_prefill else -len(seqs)
        token_ids = self.model_runner.call("run", seqs, is_prefill)
        self.scheduler.postprocess(seqs, token_ids, is_prefill)
        outputs = [(seq.seq_id, seq.completion_token_ids) for seq in seqs if seq.is_finished]
        return outputs, num_tokens
```

### ② decode 调度与抢占：`nanovllm/engine/scheduler.py:57-72`
```python
        # decode
        while self.running and len(scheduled_seqs) < self.max_num_seqs:
            seq = self.running.popleft()
            while not self.block_manager.can_append(seq):
                if self.running:
                    self.preempt(self.running.pop())
                else:
                    self.preempt(seq)
                    break
            else:
                seq.num_scheduled_tokens = 1
                seq.is_prefill = False
                self.block_manager.may_append(seq)
                scheduled_seqs.append(seq)
        assert scheduled_seqs
        self.running.extendleft(reversed(scheduled_seqs))
```
（16 行，可去掉第一行注释变成 15 行。）配套可再引用 chunked prefill 那一行 `scheduler.py:42`：
```python
            if remaining < num_tokens and scheduled_seqs:  # only allow chunked prefill for the first seq
```

### ③ 前缀缓存的链式哈希：`nanovllm/engine/block_manager.py:35-41`
```python
    @classmethod
    def compute_hash(cls, token_ids: list[int], prefix: int = -1):
        h = xxhash.xxh64()
        if prefix != -1:
            h.update(prefix.to_bytes(8, "little"))
        h.update(np.array(token_ids).tobytes())
        return h.intdigest()
```
可搭配 `block_manager.py:103-108`（can_append / may_append 的 `% block_size == 1` 技巧）：
```python
    def can_append(self, seq: Sequence) -> bool:
        return len(self.free_block_ids) >= (len(seq) % self.block_size == 1)

    def may_append(self, seq: Sequence):
        if len(seq) % self.block_size == 1:
            seq.block_table.append(self._allocate_block())
```

### ④ KV cache 容量公式：`nanovllm/engine/model_runner.py:106-115`
```python
        free, total = torch.cuda.mem_get_info()
        used = total - free
        peak = torch.cuda.memory_stats()["allocated_bytes.all.peak"]
        current = torch.cuda.memory_stats()["allocated_bytes.all.current"]
        num_kv_heads = hf_config.num_key_value_heads // self.world_size
        head_dim = getattr(hf_config, "head_dim", hf_config.hidden_size // hf_config.num_attention_heads)
        block_bytes = 2 * hf_config.num_hidden_layers * self.block_size * num_kv_heads * head_dim * hf_config.dtype.itemsize
        config.num_kvcache_blocks = int(total * config.gpu_memory_utilization - used - peak + current) // block_bytes
        assert config.num_kvcache_blocks > 0
        self.kv_cache = torch.empty(2, hf_config.num_hidden_layers, config.num_kvcache_blocks, self.block_size, num_kv_heads, head_dim)
```

### ⑤ CUDA Graph 捕获：`nanovllm/engine/model_runner.py:234-248`
```python
        self.graph_bs = [1, 2, 4, 8] + list(range(16, max_bs + 1, 16))
        self.graphs = {}
        self.graph_pool = None

        for bs in reversed(self.graph_bs):
            graph = torch.cuda.CUDAGraph()
            set_context(False, slot_mapping=slot_mapping[:bs], context_lens=context_lens[:bs], block_tables=block_tables[:bs])
            outputs[:bs] = self.model(input_ids[:bs], positions[:bs])    # warmup
            with torch.cuda.graph(graph, self.graph_pool):
                outputs[:bs] = self.model(input_ids[:bs], positions[:bs])    # capture
            if self.graph_pool is None:
                self.graph_pool = graph.pool()
            self.graphs[bs] = graph
            torch.cuda.synchronize()
            reset_context()
```
回放部分 `model_runner.py:200-212`（13 行）：
```python
            bs = input_ids.size(0)
            context = get_context()
            graph = self.graphs[next(x for x in self.graph_bs if x >= bs)]
            graph_vars = self.graph_vars
            graph_vars["input_ids"][:bs] = input_ids
            graph_vars["positions"][:bs] = positions
            graph_vars["slot_mapping"].fill_(-1)
            graph_vars["slot_mapping"][:bs] = context.slot_mapping
            graph_vars["context_lens"].zero_()
            graph_vars["context_lens"][:bs] = context.context_lens
            graph_vars["block_tables"][:bs, :context.block_tables.size(1)] = context.block_tables
            graph.replay()
            return self.model.compute_logits(graph_vars["outputs"][:bs])
```

### ⑥ Triton 写 KV cache：`nanovllm/layers/attention.py:10-30`（kernel 主体 :21-30 共 10 行）
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

### ⑦（可选）采样器：`nanovllm/layers/sampler.py:7-12`
```python
    @torch.compile
    def forward(self, logits: torch.Tensor, temperatures: torch.Tensor):
        logits = logits.float().div_(temperatures.unsqueeze(dim=1))
        probs = torch.softmax(logits, dim=-1)
        sample_tokens = probs.div_(torch.empty_like(probs).exponential_(1).clamp_min_(1e-10)).argmax(dim=-1)
        return sample_tokens
```

## 13. 写作时容易写错的点

1. 这一版**有** chunked prefill（只限 batch 内第一个序列），旧文章说"没有"是基于旧 commit。
2. 默认 block size 是 **256**（vLLM 常用 16），且必须是 256 的倍数。
3. Prefix cache 的最后一块永不命中；只按完整块命中。
4. 抢占选的是 running 队列**尾部**的序列，被抢占的序列回到 waiting **队首**。
5. CUDA Graph 只用于 decode；LM head 在图外执行。
6. 采样不支持 greedy，用的是 exponential race 而非 multinomial。
7. `generate` 的返回类型注解是 `list[str]`，实际是 dict 列表。
8. 行数：包内 1385 行（wc -l），README 称约 1,200 行。
