# 08. vLLM 的执行机制

## 本篇导读

前面逐项学过的优化，在引擎里需要协作。本篇沿着小林的一条问题，观察 **vLLM 如何接收、安排、分配状态、执行和返回**。先把模块与已知机制对应，再看 V1、完整块缓存和启动入口，不从类名列表开始记忆。

![vLLM请求在API、调度器、KV管理、执行与采样间推进的循环](/ai/inference-series/engine-loop.svg)

vLLM 从分页 KV 管理发展为完整推理引擎。它能用于在线聊天、RAG、Agent 后端、离线数据生成，以及受具体模型实现约束的多模态、embedding、rerank 等任务。模型支持表里出现一个名字，不代表它的所有模态、精度、并行和推测组合都可用。

前面的机制在这里各自找到位置：调度器安排本轮工作，KV 管理器维护状态，model runner 准备并执行模型，采样与输出路径把结果推进到下一轮。

## 先看职责，再看类名

| 阶段 | 执行什么 | 可以观测或追问什么 |
| --- | --- | --- |
| API 入口 | 协议转换、模板、分词、多模态处理 | 进入引擎前花了多久，实际 token 是什么 |
| 请求管理与调度 | waiting/running 状态、本轮 token 预算 | 谁获准执行，谁在等 KV，是否抢占 |
| KV 管理 | 查询前缀、分配块、维护块表与引用 | 命中多少完整块，空闲容量多少 |
| Worker / model runner | 张量、attention 元数据、编译或图执行 | 哪个后端，什么 shape，CPU/GPU 是否有空隙 |
| 采样与约束 | logits 处理、合法 token mask、选 token | 采样参数与语法状态是否正确 |
| 输出与停止 | 流式返回、parser、EOS、取消、释放 | 是正常结束、截断、失败还是断开 |

V1 把很多工作表达为“本请求这一轮需推进多少 token”。Prefill、普通 decode、推测验证仍有不同计算，但可以在统一的调度预算下管理。当前学习应以 V1 为基础，V0 已弃用。

**V1 引擎与 Model Runner V2 是不同层次。** v0.32.0 里的 MRV2 属于模型执行器演进，不能把它写成整个引擎已升级成“V2”。

## 自动前缀缓存怎样识别状态

常规完整块路径将键组织为：

```text
块键 = hash(父块哈希, 当前块 token IDs, 额外状态标识)
额外标识可能包括：LoRA、多模态内容、cache salt 等
```

父哈希把此前历史连起来。两页 token 一样，但前面不同，不能共用该页状态。完整块命中后，请求引用已有物理页，未命中部分继续分配与计算。

这主要节省命中前缀的 prefill，不会省去整个答案的 decode。请求需要 prompt logprobs 等特殊输出时，也可能要求重新计算相关位置。混合注意力、模型特定状态和后端的规则应另行核对。

在[前缀实验](./04-cache-attention.md)里先看完整页粒度，再理解哈希链，比只背 `enable-prefix-caching` 更可靠。

## 最小服务入口

下面是 Linux NVIDIA GPU 上的学习模板，使用固定引擎版本。显存、GPU 架构、驱动、wheel 和模型下载条件必须匹配；不适用于直接复制到所有 Mac、AMD 或 CPU 环境。

```bash
python3.11 -m venv .venv-vllm
source .venv-vllm/bin/activate
python -m pip install 'vllm==0.32.0'

vllm serve Qwen/Qwen3-0.6B \
  --host 127.0.0.1 --port 8000 \
  --max-model-len 4096
```

`--max-model-len` 限制服务上下文，不是要求每个请求一定使用这个长度。GPU 内存利用率、序列数与 token 预算也不是同一个开关。先用最简单配置建立基线，再按瓶颈调整。模型标识仅示范命令入口，正式实验还应固定 revision、tokenizer 和模板。

可以通过兼容接口调用，具体请求与双引擎对照实验见[部署、压测与排错](./13-practice.md)。开启结构化输出、工具解析或推测前，先检查安装版本的 `vllm serve --help` 和该模型所需配置。

## 从故障反查模块

| 现象 | 优先观察 | 不宜先做什么 |
| --- | --- | --- |
| API 很慢而 GPU 有空隙 | tokenizer、API worker、CPU 调度 | 直接增加 TP |
| 长输入导致别的请求停顿 | token 预算、chunked prefill、队列 | 只看平均 tokens/s |
| 内存紧张、反复抢占 | cache usage、实际长度、并发 | 一直提高序列上限 |
| 开图执行后错误 | eager 对照、shape 与后端组合 | 把 eager 成功当作性能验收 |
| 工具字段缺失或流式异常 | 模板、tool/reasoning parser、结束语义 | 先归因权重损坏 |

## 阅读源码的路线

固定 tag 后，先追踪一条短文本请求，再开启前缀、分块、推测。可从官方 V1 设计和 `KVCacheBlock`、`get_computed_blocks`、`allocate_slots` 等符号检索进入；路径和类名可能随版本变化，职责相对稳定。

每次阅读只回答一个状态问题：请求何时从 waiting 进入 running？KV 何时被锁定？预算不足时如何退让？取消后谁释放活跃引用？执行器如何选择 graph 与 eager？这些问题能把代码与实际现象对应起来。

## 本篇回顾

- API 准备输入，调度器分配本轮工作，KV 管理器安排状态，执行器与采样路径推进结果。
- 完整块的前缀键包含此前历史，命中主要省 prefill，后续回答仍要生成。
- V1 是引擎层的设计，MRV2 是执行器演进；部署还要核对模型与功能组合。

有关 v0.32.0 的升级变化见[版本与对比](./12-selection-versions.md)。下一篇仍使用相同资料助手，观察另一种状态组织：**SGLang 怎样把共同前缀变成树？** 进入[SGLang 的执行机制](./09-sglang.md)。
