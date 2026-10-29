# 19. 主流架构对比与演进趋势

前面十九篇先讲清 Transformer 的骨架，把一个 decoder-only 模型拆成部件，接着看各种改动，最后逐个拆解了 Llama、Qwen、DeepSeek 和其他开源模型。这一篇把它们放在一起比较：哪些设计已经成了所有人的默认选择，哪些地方各家走了不同的路，这几年的改动朝着什么方向，以及拿到一个新模型时，怎样用这些对比快速判断它的位置。

读完你应该能对着任意一个新发布模型的 `config.json`，说出它在注意力、FFN、位置编码和稳定性这四处各选了哪一种方案，估出它放进资料助手、读一本 10 万 token 的员工手册时要多少缓存，并知道这些选择背后的取舍还需要怎样实测。

## 已经统一的骨架

2023 年以后发布的主流开源大语言模型，骨架几乎完全一样。这副骨架在[第 09 篇](./09-transformer-family.md)里叫“现代配方”，从 Llama 1 开始固定下来：

| 部件 | 主流选择 | 被替换掉的旧做法 | 讲在哪一篇 |
| --- | --- | --- | --- |
| 整体结构 | 只有解码器，自回归预测下一个 token | 编码器-解码器、仅编码器 | [09](./09-transformer-family.md) |
| 分词 | 字节级 BPE，词表 12.8 万到 25 万 | 3 万左右的小词表 | [02](./02-tokenizer-embedding.md) |
| 归一化 | Pre-Norm + RMSNorm | Post-Norm + LayerNorm | [06](./06-residual-norm.md) |
| FFN 激活 | SwiGLU（三个矩阵带门控） | ReLU、GELU 两层 FFN | [05](./05-ffn.md) |
| 位置编码 | RoPE，配合 YaRN 等方法扩展 | 学习的绝对位置向量 | [07](./07-position.md) |
| 线性层偏置 | 基本去掉 | 每个线性层都带偏置 | [09](./09-transformer-family.md) |
| 注意力头 | 至少用 GQA，多个 Q 头共享 K、V | 每个头各有 K、V 的 MHA | [04](./04-multi-head.md) |
| Dropout | 预训练时不用 | 各层都加 | [09](./09-transformer-family.md) |

这些选择趋同的原因并不相同。RMSNorm、去偏置是“更省、效果不差”；SwiGLU 和 RoPE 在当年的对照实验里有稳定的小幅收益；GQA 是为了推理时的 KV Cache；Pre-Norm 是为了深网络能稳定训练。也有一部分是路径依赖：Llama 的代码、权重和工具链成了事实标准，后来者沿用它可以直接复用整套推理和训练生态。

骨架统一意味着读新模型时可以只看差异。[第 18 篇](./18-reading-models.md)讲的“先 diff 配置和 modular 文件”就是基于这一点：绝大多数新模型在 Transformers 里都是从 Llama、Qwen 或 DeepSeek 的实现继承下来，改动集中在少数几个类里。

## 分歧集中在四个地方

在统一的骨架上，各家真正的差异集中在注意力与 KV、FFN、位置编码和稳定性措施这四处。下图挑了八个代表模型，颜色表示它和 Llama 式基线相比改在哪里：

![八个代表模型在注意力与 KV、FFN、位置编码、稳定性四个模块上的选择：Llama-3.1-8B 全是基线配方；Qwen3 和 DeepSeek-V3 在 FFN 上改用 MoE，DeepSeek 还压缩了 KV；Gemma 3、gpt-oss、Llama 4 改为局部与全局层交替；Qwen3.5 用线性注意力混合；DeepSeek-V4 改用压缩注意力和多路残差](/ai/llm-architecture/comparison-matrix.svg)

**注意力与 KV** 是分歧最大的地方，因为它决定了长上下文的成本。粗分有四条路线：

| 路线 | 做法 | 代表 | 省什么 | 代价 |
| --- | --- | --- | --- | --- |
| 减少 KV 头 | GQA、MQA | Llama 3、Qwen3、MiniMax-M2 | KV Cache 按头数比例缩小 | 头太少时质量下降；张量并行受 KV 头数限制 |
| 压缩 KV | MLA 缓存低秩潜向量 | DeepSeek-V2/V3、Kimi K2、GLM-5、Mistral Large 3 | 每层每 token 只存 576 个数 | 实现复杂；解码时计算更多 |
| 局部为主 | 滑动窗口或分块局部层，少数全局层 | Gemma 2/3/4、gpt-oss、Llama 4 | 大部分层的缓存大小固定 | 远距离信息只能靠少数全局层 |
| 线性为主 | 线性注意力层占多数，少数完整注意力层 | Qwen3-Next/3.5、Kimi Linear、MiniMax-Text-01 | 大部分层只有固定大小的状态 | 精确召回弱，部署工具链不成熟 |

在这四条路线之上，还有一层“只算一部分”的稀疏注意力：DeepSeek-V3.2 和 GLM-5 用索引器为每个 token 挑出 2048 个历史位置，Qwen3.8-Flash-Next 和 MiniMax-M3 按块挑选。它们省的是计算和读取量，缓存仍要保存全部位置（[第 11 篇](./11-efficient-attention.md)）。DeepSeek-V4 则走得更远，远处的历史只保留压缩后的摘要（[第 15 篇](./15-deepseek.md)）。

**FFN** 的分歧是稠密还是 MoE。在百亿参数以上的模型里，MoE 已经是主流；稠密模型仍在 30B 以下的尺寸上占多数（Llama 3.x、Qwen3 稠密系列、Gemma），因为小模型的总参数本来就放得下，MoE 带来的路由、负载均衡和专家并行的复杂度不划算。MoE 内部的选择也在收敛：细粒度专家（每个专家的中间维度只有几百到两千），加一个共享专家，用 sigmoid 打分加无辅助损失的偏置做负载均衡（[第 10 篇](./10-moe.md)）。

**位置编码** 的主体都是 RoPE，差别在细节：`rope_theta` 从 1 万涨到 1000 万，扩展方法从位置插值换成 YaRN 或 Llama 3 的分频缩放；新一些的模型只对一部分维度做旋转（Qwen3-Next、Qwen3.5 只转 25% 的维度），或者干脆让一部分层不用位置编码（Llama 4 的 NoPE 层）。局部层和全局层用不同的 `rope_theta` 也很常见（Gemma 3）。

**稳定性措施** 的差别最细，也最容易被忽略。QK-Norm 在 Qwen3、Gemma 3、GLM-4.5 等模型里取代了 QKV 偏置或 soft-capping，用来限制注意力分数；gpt-oss 给每个头加了可学习的汇聚项，并截断 SwiGLU 的激活；DeepSeek-V4 把单条残差流换成多路残差（mHC）。这些改动在推理时几乎不增加成本，但会影响推理引擎能否直接使用现成的注意力内核，例如 soft-capping 会让一部分融合内核无法使用（[第 06 篇](./06-residual-norm.md)）。

## 一本手册的缓存账

四种注意力路线的差别，最直观地体现在长上下文的缓存上。把资料助手的 10 万 token 员工手册放进上下文，只计随长度增长的那部分缓存（BF16），各模型的差距超过 30 倍：

![把 10 万 token 的员工手册放进上下文，各模型需要随长度增长保存的缓存：MiniMax-M2 约 23.7 GiB，Qwen3-8B 13.7，Llama-3.1-8B 12.2，Gemma 3 27B 7.6，DeepSeek-V3 6.5，Llama 4 Maverick 4.6，gpt-oss-120b 3.4，Qwen3.5-397B 2.9，Kimi Linear 0.8](/ai/llm-architecture/comparison-kv-100k.svg)

每个数字都可以从配置手算。以三个模型为例：

```text
Llama-3.1-8B：2（K 和 V）× 32 层 × 8 个 KV 头 × 128 维 × 2 字节 = 131,072 字节/token
              × 100,000 token ÷ 2³⁰ ≈ 12.2 GiB
DeepSeek-V3： 61 层 × 576 个数 × 2 字节 = 70,272 字节/token → 6.5 GiB
gpt-oss-120b：只有 18 个全局层随长度增长
              2 × 18 × 8 × 64 × 2 = 36,864 字节/token → 3.4 GiB
              另外 18 个窗口 128 的局部层，缓存固定约 4.5 MiB
```

这张图里有两点容易误读。第一，模型大不等于缓存大：DeepSeek-V3 有 6710 亿参数，缓存只有 80 亿参数的 Llama-3.1-8B 的一半；MiniMax-M2 每层都是完整的 GQA 注意力，缓存是 Llama-3.1-8B 的近两倍。第二，缓存小不等于读得好：局部层看不到远处，线性层的固定状态会把历史压缩到记不清，它们要靠少数全局层完成“回到第 37 页找年假规定”这类精确召回。MiniMax 从 Text-01 的线性混合回到 M2 的完整注意力，官方给出的原因就是放大以后多跳推理出现缺陷（[第 16 篇](./16-open-models.md)）。选哪条路线，最后要用自己的长文档任务实测，[第 11 篇](./11-efficient-attention.md)给了资料助手的自测方法。

## 演进的几条主线

把各家按时间排开，这几年的架构改动大致沿着四条线：

**一是 KV 越来越省。** 从 MHA 到 GQA，再到 MLA 的低秩压缩、局部与全局交替、线性注意力混合和压缩注意力，目标都是让上下文变长时缓存不要线性地吃掉显存。Llama 2 7B 每 token 的 KV 是 512 KiB，Llama 3 8B 用 GQA 降到 128 KiB，DeepSeek-V3 用 MLA 降到 68.6 KiB，Kimi Linear 的增长部分只剩 7.9 KiB。这条线的驱动力来自推理：长上下文、多轮对话和 Agent 任务都要求在同样显存里放下更多 token 和更多并发请求。

**二是 FFN 越来越稀疏。** MoE 的激活比例从 Mixtral 的约四分之一，降到 2024 年底以后的 3%—6%：

![按发布时间排列的 MoE 模型激活参数占比：Mixtral 8x22B 27.7%，DeepSeek-V3 5.5%，Qwen3-235B 9.4%，Llama 4 Maverick 4.3%，Kimi K2 3.2%，gpt-oss-120b 4.4%，Qwen3-Next 3.8%，MiniMax-M2 4.3%，GLM-5 5.4%，Qwen3.5-397B 4.3%，DeepSeek-V4-Pro 3.1%](/ai/llm-architecture/comparison-moe-ratio.svg)

激活比例越低，同样的单 token 计算量能放下越多的总参数，但显存要按总参数准备，专家之间的通信也越重。所以 MoE 的趋势总伴随着更细的专家、分组或节点限制路由、专家并行这些配套改动（[第 10 篇](./10-moe.md)）。

**三是层与层不再相同。** 早期模型的每一层结构完全一样；现在越来越多的模型按固定比例交替不同类型的层：Gemma 3 的 5 个局部层接 1 个全局层，Qwen3.5 的 3 个 Gated DeltaNet 层接 1 个注意力层，Llama 4 Maverick 的密集层和 MoE 层交替，DeepSeek 的前几层是密集 FFN 或哈希路由。读这类模型的 config 时，要先找到 `layer_types`、`layer_pattern`、`first_k_dense_replace` 这类描述层排列的字段，再按层分别计算参数和缓存。

**四是多模态进入主干。** Llama 4、Gemma 3/4、Qwen3.5 都把视觉编码器作为同一个模型的一部分发布，Qwen3-VL 把视觉特征加到语言模型的前几层，Gemma 4 的一个版本干脆不要视觉编码器，图像块经一个线性层直接进入主干（[第 17 篇](./17-multimodal.md)）。语言模型部分的结构基本没变，变的是 token 的来源和位置编码的维度。

也有一些没有成为趋势的方向。纯线性注意力和纯状态空间模型在大规模语言模型上没有取代 Transformer，留下来的是混合架构；编码器-解码器结构在通用大模型里没有回来，但在语音识别和翻译类模型里仍是主流；MTP（多 token 预测）在 DeepSeek、Qwen3-Next、GLM 等模型里出现，用于训练信号和推理时的投机解码，但还不是所有人的标配。

## 拿到一个新模型先看什么

资料助手的团队每隔几个月就会遇到一个新发布的模型。用这个系列的方法，大约半小时就能判断它在架构上的位置和部署成本：

1. **读 `config.json` 的 `model_type` 和 `architectures`。** 它继承自哪个已知结构，去 Transformers 里找对应的 `modular_*.py`，看改了哪几个类（[第 18 篇](./18-reading-models.md)）。
2. **数清层的种类。** 有没有 `layer_types`、`sliding_window`、`first_k_dense_replace`、线性注意力相关字段，每种层各有几层。
3. **算三个数。** 总参数（决定显存）、每 token 激活参数（决定计算）、每 token 随长度增长的缓存字节数（决定能放多长的上下文、多少并发）。可以用 [第 18 篇](./18-reading-models.md)的脚本，再和官方公布的参数量对一下。
4. **看位置编码和上下文。** `rope_theta`、`rope_scaling`、`max_position_embeddings` 和模型卡里写的原生训练长度，区分“训练过的长度”和“配置允许的长度”（[第 07 篇](./07-position.md)）。
5. **找特殊的稳定性设计。** QK-Norm、soft-capping、注意力汇聚、截断激活、多路残差，确认你要用的推理引擎是否支持，否则可能退回慢速实现或者结果出错。
6. **确认许可证。** 开放权重不等于开源许可，月活上限、命名要求、地区限制在各家之间差别很大（[第 13 篇](./13-llama.md)、[第 14 篇](./14-qwen.md)、[第 16 篇](./16-open-models.md)）。

这六步只能告诉你一个模型“可能”适合什么场景。架构决定的是成本结构和能力的上限，质量还取决于训练数据和训练方法：R1 和 V3 的配置完全相同，能力却差别很大（[第 15 篇](./15-deepseek.md)）。最终的选择要回到自己的任务上评测，方法见[训练系列第 21 篇](../model-training/21-evaluation.md)。

## 版本快照

本系列各篇的模型配置以 2026 年 10 月 28 日能读到的 Hugging Face 官方 `config.json`、官方模型卡和技术报告，以及 Transformers 5.21.0 的源码为准。各家发布节奏很快：本系列写作期间，Qwen 已经发布到 Qwen3.8，DeepSeek 发布了 V4-Pro 正式版，Transformers 里还出现了尚未正式发布的模型目录。读到这里时，规格表里的“最新一代”可能已经不是最新；判断新模型的方法不会因此过时。

到这里，一个大模型的每个部件、每种主要改动和主流模型的具体选择都已经看过。想知道这些模型是怎样训练出来的，接着读[模型训练与调优](../model-training/)系列；想把它们部署起来、算清推理成本，读[大模型推理优化](../llm-inference/)和[推理引擎与框架](../inference-engines/)。也可以回到[系列导读](./index.md)，按具体问题挑选篇目重读。
