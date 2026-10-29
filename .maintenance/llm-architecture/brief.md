# 大模型架构系列：写作简报

日期：2026-10-28。所有写作代理和审查代理开工前读本文件。

## 系列定位

`docs/ai/llm-architecture/`，侧边栏分组“大模型架构”，放在“大模型”之后、“模型训练与调优”之前（先看模型长什么样，再看怎样训练，再看怎样推理和用什么引擎）。面向会用聊天助手、听过“Transformer”“注意力”但说不清内部结构的读者，讲清主流大语言模型的内部结构和工作原理：一段文字怎样变成 token、经过几十层里的注意力和 FFN、怎样算出下一个 token；MoE、MLA、线性注意力、混合架构这些改动各解决什么问题；Llama、Qwen、DeepSeek、Mistral、Gemma、GLM、Kimi、gpt-oss 等主流模型具体选了哪些设计。读完应能：

1. 说出一个 decoder-only 模型每一层里有什么、每个模块输入输出的形状、参数和计算各花在哪；
2. 看懂任意开源模型的 `config.json` 和 Transformers 里的 `modeling_*.py`，手算参数量、每 token 计算量和 KV Cache 大小；
3. 理解 GQA/MLA、MoE、RoPE 外推、滑动窗口、线性注意力等设计是在质量、训练成本、推理显存、长上下文之间做什么取舍；
4. 拿到一个新发布的模型，能判断它在架构上和前代比改了什么、为什么改。

读者常见的问题要正面回答，例如“FFN 是什么、为什么占了大半参数”“注意力里的 Q、K、V 到底是什么”“为什么现在几乎都是 decoder-only”“MoE 总参数 6710 亿为什么每个 token 只用 370 亿”。

和站内已有内容的分工：

- `docs/ai/deep-learning/architectures.md`、`docs/ai/llm/concepts.md` 是总览级的短介绍，保留，本系列是深入版本；
- `docs/ai/model-training/` 讲怎样训练（数据、预训练、SFT、LoRA、对齐），本系列只在讲“架构为什么这样设计”时提训练稳定性和成本，并链接训练系列；
- `docs/ai/llm-inference/` 讲 KV Cache、PagedAttention、量化、投机解码等推理机制，本系列讲到 KV 头、MLA、MTP 时只讲架构本身对推理的影响并链接；
- `docs/ai/inference-engines/` 讲推理引擎软件，本系列不讲引擎；
- `docs/ai/precision/` 讲数值格式。

## 贯穿案例

沿用其他三个系列的公司内部**资料助手**：员工小林问“年假怎么申请？”。本系列跟着这句话进入模型：它被切成哪些 token，每个 token 变成 4096 维向量，经过 32 层，每层注意力怎样让“申请”去看“年假”，FFN 怎样把“年假”相关的知识加进向量，最后输出层怎样给出下一个 token“根据”的概率。后面讲 MoE、长上下文、多模态时，继续用资料助手的需求举例（整本员工手册放进上下文、上传报销单截图、语音提问）。

## 统一的数字口径

- **主算例：Llama-3.1-8B**（和训练、推理系列一致）。`config.json`：`hidden_size` 4096、`num_hidden_layers` 32、`num_attention_heads` 32、`num_key_value_heads` 8、`head_dim` 128、`intermediate_size` 14336、`vocab_size` 128256、`hidden_act` silu、`rms_norm_eps` 1e-5、`rope_theta` 500000、`rope_scaling` llama3（factor 8，原始 8192）、`max_position_embeddings` 131072、`tie_word_embeddings` false。可从 https://huggingface.co/unsloth/Meta-Llama-3.1-8B/raw/main/config.json 读取。
- **参数分解（已复算）**：每层注意力 q 16,777,216 + k 4,194,304 + v 4,194,304 + o 16,777,216 = 41,943,040；每层 FFN（gate/up/down 各 4096×14336）176,160,768；每层两个 RMSNorm 8192；每层合计 218,112,000。32 层 6,979,584,000；词嵌入和输出层各 525,336,576；最终 norm 4096；总计 **8,030,261,248**。FFN 占 **70.2%**，注意力 16.7%，词嵌入+输出层 13.1%。
- **每 token 前向计算**约 2×参数量 ≈ 16 GFLOPs（不含注意力里随上下文增长的部分，那部分每层每 token 约 4×上下文长度×4096 FLOPs，需在用到时说明口径）。
- **KV Cache**：每 token 2×32 层×8 头×128×2 字节 = 131,072 字节 = 128 KiB（BF16），和推理系列第 03 篇一致。
- **对照与实践模型**：Qwen2.5-0.5B-Instruct（实践篇由主编在本机实际运行，24 层、隐藏 896、14 个 Q 头、2 个 KV 头、FFN 4864、词表 151,936、共享词嵌入）；Qwen3-8B、DeepSeek-V3/V3.x、gpt-oss 等用作拆解对象时读它们的 `config.json`。
- 数字给出代入过程；GB（10⁹）和 GiB（2³⁰）分开写；估算、示意、实测分清。

## 一手来源

- 模型配置：`curl -s https://huggingface.co/<org>/<repo>/raw/main/config.json`（Meta 官方仓库要登录，可用 unsloth 镜像，并在 facts 里注明）。
- 模型实现：本机已装的 Transformers 源码 `<scratch>/venv-mlx/lib/python3.12/site-packages/transformers/models/<name>/modeling_<name>.py`（有 llama、llama4、qwen2、qwen3、qwen3_moe、qwen3_next、qwen3_5、qwen3_5_moe、deepseek_v3、deepseek_v32、deepseek_v4、mixtral、mistral4、gemma3、gemma4、glm4_moe、glm_moe_dsa、glm5_next、gpt_oss、kimi_linear、kimi_k25、minimax、minimax_m2、mamba2、jamba、falcon_h1、nemotron_h、qwen2_5_vl、qwen3_vl、qwen3_omni_moe 等）。注意这里面有 2026 年 6 月以后的新模型，写之前先读源码和官方模型卡确认，不要凭印象写。
- 论文（arXiv）、官方技术报告、官方博客和模型卡。
- 不确定、查不到一手来源的说法不写；闭源模型（GPT、Claude、Gemini）只写官方公开过的架构信息，明确说“未公开”。

## 章节表（写作时的旧编号；2026-10-28 已重排，现行编号与部分见 README.md）

| 部分 | 文件 | 侧边栏标题 | 主问题 |
| --- | --- | --- | --- |
| 导读 | `index.md` | 系列导读 | 主编撰写 |
| 一 Transformer 逐层拆解 | `00-transformer.md` | 00. Transformer：大模型共同的骨架 | 主编撰写：RNN 的问题、原始编码器-解码器结构、五个零件、参数与训练、到大模型的演变（2026-10-28 补） |
| | `01-overview.md` | 01. 全景：从一句话到下一个 token | decoder-only 模型由哪几块组成？“年假怎么申请？”经过哪些步骤变成下一个 token？参数和计算各花在哪（8B 的参数分解表）？什么是自回归生成？ |
| | `02-tokenizer-embedding.md` | 02. 分词与词嵌入 | 文字怎样切成 token（BPE、字节级、中文怎样切）？词表大小怎样影响参数和效率？词嵌入是查表；输出层与词嵌入共享（tie）是什么？ |
| | `03-attention.md` | 03. 注意力：每个 token 怎样看上下文 | Q、K、V 是什么、从哪来？缩放点积、softmax、因果掩码一步步手算（3—4 个 token、小维度）；注意力的计算和显存为什么随长度平方增长 |
| | `04-multi-head.md` | 04. 多头注意力与 KV 头：MHA、MQA、GQA、MLA | 为什么要多个头、每个头学什么；KV 头变少怎样省 KV Cache、损失什么；MLA 的低秩压缩和吸收技巧；各模型的选择 |
| | `05-ffn.md` | 05. FFN：前馈网络做了什么 | FFN 是什么（两层/三层线性 + 激活，逐 token 独立）；为什么占约 2/3 以上参数；ReLU→GELU→SwiGLU 门控；中间维度为什么是 14336；“键值记忆”视角与知识存储的研究证据和边界；FFN 和注意力的分工 |
| | `06-residual-norm.md` | 06. 残差连接与归一化 | 残差流（residual stream）是什么、为什么深网络离不开；LayerNorm 与 RMSNorm；Post-Norm 到 Pre-Norm；QK-Norm、logit soft-capping 等稳定性技巧；初始化与深度 |
| | `07-position.md` | 07. 位置编码：RoPE 与长上下文 | 注意力本身不知道顺序；绝对位置、相对位置、ALiBi；RoPE 的旋转直觉和手算；`rope_theta`；上下文扩展（位置插值、NTK、YaRN、Llama 3 的分频缩放）；NoPE 与部分层不用 RoPE |
| | `08-output-decoding.md` | 08. 输出层与解码：从 logits 到文字 | 最后一层向量怎样变成 128256 个分数；softmax 与温度；贪心、top-k、top-p、min-p；重复惩罚；停止 token 与对话模板；为什么一次只能出一个 token |
| 二 架构演进 | `09-transformer-family.md` | 09. 从 Transformer 到 GPT：三种结构 | 2017 年原始编码器-解码器；BERT（编码器）、T5（编解码）、GPT（解码器）各适合什么；为什么大模型几乎都走 decoder-only；从 GPT-2 到 Llama 的“现代配方”改了哪些 |
| | `10-moe.md` | 10. 混合专家 MoE | 稀疏激活：总参数 vs 激活参数；路由器怎样选专家（top-k、softmax/sigmoid）；负载均衡（辅助损失、无辅助损失偏置）；共享专家与细粒度专家；专家并行与推理代价；Mixtral、DeepSeekMoE、Qwen3-MoE 对比 |
| | `11-efficient-attention.md` | 11. 长上下文与高效注意力 | 长上下文的成本账；FlashAttention 改了什么（不改数学，改访存）；滑动窗口与局部/全局交替；稀疏注意力（NSA、DeepSeek Sparse Attention 等）；注意力汇聚（attention sink）；长上下文“能读”和“读得好”的区别 |
| | `12-linear-hybrid.md` | 12. 线性注意力、状态空间模型与混合架构 | 用固定大小的状态代替 KV Cache；线性注意力、Mamba/SSM、门控 DeltaNet 的直觉；为什么纯线性模型召回差、所以出现混合架构（Jamba、Qwen3-Next、Kimi Linear、Nemotron-H 等）；对推理显存的影响 |
| 三 主流模型拆解 | `13-llama.md` | 13. Llama 家族 | Llama 1/2/3/3.1/3.2/3.3/4 每代改了什么（GQA、词表、RoPE 缩放、上下文、MoE 与多模态、iRoPE）；读 `modeling_llama.py` 一层的代码；许可证 |
| | `14-qwen.md` | 14. Qwen 家族 | Qwen2/2.5/3/3-MoE/3-Next/3.5（以源码和官方发布为准）每代的结构选择（QKV bias、QK-Norm、共享词嵌入、MoE 配置、混合注意力）；思考与非思考模式是训练还是架构；规格表 |
| | `15-deepseek.md` | 15. DeepSeek：MLA、MoE 与 MTP | V2 的 MLA 与 DeepSeekMoE；V3 的无辅助损失负载均衡、多 token 预测（MTP）、FP8 训练；R1 是训练方法不是新架构；V3.2 的稀疏注意力；V4（以源码和官方发布为准）；671B/37B 的参数账 |
| | `16-open-models.md` | 16. 其他主流开源模型 | Mistral/Mixtral、Gemma（局部/全局交替、soft-capping）、GLM、Kimi K2（及其后续）、gpt-oss（注意力汇聚、交替带状注意力、MXFP4）、MiniMax 等各自的架构特点；闭源模型公开了什么 |
| 四 多模态与读懂模型 | `17-multimodal.md` | 17. 多模态大模型的结构 | 图像怎样变成 token（ViT、patch、投影层）；LLaVA 式外挂编码器 vs 原生多模态；动态分辨率与 M-RoPE；语音怎样接入（音频编码器、语音 token、Thinker-Talker）；资料助手读报销单截图 |
| | `18-reading-models.md` | 18. 读懂 config 与源码 | `config.json` 每个字段对应什么；从配置手算参数量、每 token FLOPs、KV Cache；Transformers `modeling_*.py` 的类结构；怎样快速判断一个新模型改了什么；深度、宽度、头维度、词表这些超参数的取舍 |
| | `layer-practice.md` | 实践：逐层拆开一个小模型 | 主编撰写并实际运行 |
| | `19-comparison.md` | 19. 主流架构对比与演进趋势 | 主编撰写 |

## 写作要求（必须遵守）

先读项目根目录 `AGENTS.md` 的“写作偏好”“新增文章基本原则”两节和 `.maintenance/blog-writing.md`。再读一篇范文：`docs/ai/llm-inference/03-kv-cache.md` 或 `04-memory-budget.md`（口吻、长度、手算方式、开头结尾的写法照它来），以及 `docs/ai/llm/concepts.md`、`docs/ai/deep-learning/architectures.md` 看已有覆盖。要点：

- 全中文叙述，技术名词、命令、代码、论文和产品名保留原文。技术知识库口吻，不出现“本文”“让我们”“一句话总结”“值得一提”“众所周知”“一文看懂”“经验法则”等套话，不写资料搜集过程和参考文献列表，不写“根据某某资料”。
- H1 写成 `# 05. FFN：前馈网络做了什么` 这种“编号. 标题：副题”格式。正文 H2 围绕知识内容命名，不用“本篇讲什么”“总结与下一篇”这类机械标题。
- 开头一两段：承接上一篇、本篇要回答的问题、读完能判断什么。结尾一段自然回顾要点，并用链接引出下一篇。
- 由浅入深：先用资料助手里的具体场景或一组可手算的小数字，再给术语和机制。每个术语首次出现时说明它是什么、用来干什么；不要首屏堆缩写。每个模块讲清输入输出的张量形状（如 `[序列长度, 4096] → [序列长度, 14336] → [序列长度, 4096]`）。
- 公式写在 ```text 代码块里，交代每个符号，带一组数值代入。需要展示代码时，用简化后的 PyTorch 风格伪代码（十几行以内），并说明它对应 Transformers 源码里哪个类；不整段粘贴源码。
- 连续段落讲因果和取舍；表格用于同维度比较（如各模型的配置），列表用于步骤和检查项，不要满篇列表。每篇至少讲一个设计失效或不适用的情况（例如 MQA 质量下降、纯线性注意力召回差、外推失败、MoE 路由坍缩），以及怎样看出来。
- 研究结论（如“FFN 存知识”“注意力头分工”）要说明证据强度和边界，不把可解释性研究的猜想写成定论。
- 篇幅参考推理系列：每篇约 7000—12000 字节 Markdown（参考，不是指标）。
- 易变事实（模型配置、发布时间、上下文长度、许可证、论文结论）必须核对一手来源，写明版本或日期。核对记录写进 `.maintenance/llm-architecture/research/facts-<组名>.md`：每条事实、数值、来源 URL 或源码路径、核对结论。发现简报数字有误，写明并按正确值写正文。
- 不复制第三方文章或教程原文；用自己的话按机制重写。不放真实客户、IP、域名、账号。
- 站内链接用相对路径，例如同系列 `./05-ffn.md`，其他专题 `../llm-inference/03-kv-cache.md`、`../model-training/03-memory.md`、`../precision/05-quantization.md`。同系列章节按上面的章节表链接（文件会由其他代理同时写出）；其他专题只链接确实存在的文件（先 `ls` 确认）。锚点链接要确认标题文字。

## 图示

每篇至少一张、通常两三张真正解释机制的 SVG（数据流、张量形状变化、参数比例、注意力矩阵、路由过程、结构对比），不做装饰。用共享绘图库 `.maintenance/llm-architecture/svg-kit.mjs`（导出 `svg`、`box`、`cell`、`edge`、`text`、`write` 等，读它的源码看用法；范例见 `.maintenance/model-training/diagrams-basics.mjs`、`.maintenance/llm-inference/diagrams-a.mjs`）。

- 每组建一个生成脚本 `.maintenance/llm-architecture/diagrams-<组名>.mjs`，运行 `node .maintenance/llm-architecture/diagrams-<组名>.mjs` 输出到 `public/ai/llm-architecture/`。文件名用小写短横线，加章节前缀（如 `ffn-swiglu.svg`、`moe-routing.svg`），不和别组重名。
- 不手改 SVG，改脚本重跑。
- 运行 `node .maintenance/llm-architecture/check-svg.mjs public/ai/llm-architecture <你的 scratch png 目录> <文件名过滤>` 检查文字越框；输出必须全部是 `ok`，并用 Read 查看导出的 PNG，确认版面清楚、无重叠、箭头方向正确、文字没有被截断。
- 正文引用：`![描述图里关系的完整句子](/ai/llm-architecture/xxx.svg)`。图前说明它回答什么，图后解释关键关系。
- 横向比例，宽 1100—1400 左右；字号沿用 kit 的样式类；中文为主。

## 边界

- 只新建本组负责的章节文件、本组的 diagrams 脚本、本组的 facts 文件和本组的 SVG。不改侧边栏、导读、其他专题页、其他组的文件，不运行 `npm run docs:build`，不 git add/commit/push。
- 完成后汇报：写了哪些文件、每篇的主问题和贯穿案例怎样用、哪些事实与简报不同、哪些地方仍不确定、引用了哪些站内链接。
