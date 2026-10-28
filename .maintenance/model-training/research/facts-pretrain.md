# facts-pretrain：第 06、07、13 篇事实核对

核对日期：2026-10-27。结论列“一致”表示与正文用法一致；“修正”表示与简报或常见说法不同。

## 第 06 篇 预训练数据与分词

| 事实 | 数值 / 内容 | 来源 | 结论 |
| --- | --- | --- | --- |
| FineWeb 规模 | 论文摘要：15T token，来自 96 个 Common Crawl 快照（2024）；数据集卡现称“超过 18.5T token”（后续版本追加快照），按 GPT-2 分词器计数 | https://arxiv.org/abs/2406.17557 ；https://huggingface.co/datasets/HuggingFaceFW/fineweb/raw/main/README.md | 一致。正文写“2024 年发布时约 15T（GPT-2 分词器计数），之后版本扩到 18.5T 以上” |
| FineWeb 流程 | URL 黑名单（恶意、成人站点）→ trafilatura 抽正文 → fastText 语言识别，英语分数 < 0.65 丢弃 → Gopher 重复/质量规则、C4 规则（不含 terminal_punct）、自定义规则 → MinHash 去重（每个快照单独去重，5-gram 分片，14×8 个哈希函数）→ 匿名化邮箱和公网 IP，电话号码因误报高未处理 | FineWeb 数据集卡 | 一致 |
| FineWeb 退出机制 | 卡片提供个人信息删除表单；v1.3.0 曾按下架通知删除特定域名；卡片未提 robots.txt | 同上 | 一致，正文只写“提供删除渠道” |
| Common Crawl robots.txt | CCBot 先读 robots.txt，允许才抓取；遵守 Crawl-delay；`User-agent: CCBot` + `Disallow: /` 即可退出；另有 opt-out registry | https://commoncrawl.org/faq | 一致 |
| Common Crawl 规模 | 首页：超过 3000 亿网页、跨 15 年、每月新增 30 亿—50 亿页、2007 年起 | https://commoncrawl.org/ | 一致（官网数字会变，正文写“官网 2026 年标注”） |
| FineWeb-Edu 分类器 | Llama-3-70B-Instruct 给 FineWeb 样本按 0—5 分打“教育价值”分（数据集卡写 50 万条标注，分类器卡写训练用 45 万条）；在 Snowflake-arctic-embed-m 上加单输出回归头，冻结编码器只训头，20 轮、lr 3e-4；阈值 3 时二分类 F1 82%；去掉 3 分以下保留 1.3T token（删掉 92%）；阈值 2 版本 5.4T；许可证 ODC-By | https://huggingface.co/datasets/HuggingFaceFW/fineweb-edu/raw/main/README.md ；https://huggingface.co/HuggingFaceFW/fineweb-edu-classifier | 一致。正文写“约 50 万条标注” |
| FineWeb-Edu 分类器局限 | 卡片自述：偏向中小学教育内容；高分段可能过拟合“看起来像学术”的内容；逐页判断，没有上下文 | 分类器卡 | 一致，正文用作“模型过滤也有偏差”的例子 |
| Llama 3 去重 | URL 级保留最新版本；文档级全局 MinHash；行级：每 3000 万文档一个桶内出现超过 6 次的行删除 | Llama 3 论文 3.1.1 https://arxiv.org/abs/2407.21783 | 一致 |
| Llama 3 启发式过滤 | 重复 n-gram 覆盖率、脏词计数（补漏成人站点）、token 分布 KL 散度剔除异常 | 同上 | 一致 |
| Llama 3 质量分类器 | fastText 判断“是否会被维基百科引用”；DistilRoberta 等 RoBERTa 类分类器用 Llama 2 的预测训练 | 同上 | 一致（论文措辞是 predictions，不是 annotations） |
| Llama 3 安全/PII | 过滤可能含不安全内容或大量 PII 的网站、已知成人域名 | 同上 | 一致 |
| Llama 3 多语言 | fastText 语言识别分 176 种语言，再在每种语言内做文档级和行级去重 | 同上 | 一致 |
| Llama 3 数据配比 | 约 50% 通用知识、25% 数学与推理、17% 代码、8% 多语言 | 同上 3.1.2 | 与简报一致 |
| Llama 3 配比方法 | 知识分类（下采样网上过多的类别，如娱乐）+ 小模型上的配比规模定律实验 | 同上 | 一致 |
| Llama 3 退火数据 | 不把常用基准的训练集放进退火数据；退火让 8B 在 GSM8k、MATH 验证集分别提升 24.0%、6.4%，405B 提升可忽略 | 同上 3.1.3 | 一致 |
| Llama 3 污染分析 | 按 8-gram 重叠打分；PiQA、HellaSwag 污染高且分数受益；Natural Questions 估计 52% 污染但几乎无影响；MBPP、HumanEval、MMLU 因 8-gram 标出过多污染而无法可靠估计 | 同上 5.1.4 | 一致 |
| Llama 3 分词器 | 128K 词表 = tiktoken 的 100K + 28K 非英语 token；英语压缩率 3.17 → 3.94 字符/token；`vocab_size` 128,256 | 同上 3.1 / 3.2 | 一致 |
| Llama 2 分词器 | SentencePiece BPE，32K 词表，数字拆成单个数字，未知 UTF-8 字符拆成字节（byte fallback） | https://arxiv.org/abs/2307.09288 | 一致 |
| PaLM 分词器 | SentencePiece 256K，无损可逆、保留空白，OOV Unicode 拆 UTF-8 字节，数字拆单个数字 | https://arxiv.org/abs/2204.02311 | 一致 |
| BPE 出处 | Sennrich、Haddow、Birch，2015 arXiv / ACL 2016，用子词处理罕见词 | https://arxiv.org/abs/1508.07909 | 一致 |
| 中文 token 数（实测） | 自写 115 字的年假制度段落：Llama 2 分词器 158 token（1.37 token/字）、Llama 3 分词器 93（0.81）、Qwen2.5 分词器 82（0.71）、GPT-2 分词器 246（2.14）。同义英文 478 字符：Llama 3 99 token（4.83 字符/token）。“年假怎么申请？”：Llama 3 切 5 个（年/假/怎么/申请/？），Llama 2 切 14 个（“假”“怎”“申”各拆 3 个字节 token） | 本机 `tokenizers` 0.x 库加载 tokenizer.json：Qwen/Qwen2.5-0.5B-Instruct、NousResearch/Meta-Llama-3-8B（官方 Llama 3 分词器的公开镜像）、NousResearch/Llama-2-7b-hf、openai-community/gpt2；脚本在会话 scratchpad `count.py` | 实测，正文注明“单段样例实测，不代表平均值” |
| 记忆与提取 | Carlini 等 2020：从 GPT-2 提取数百条逐字训练序列，含姓名、电话、邮箱；只出现在一份文档里的序列也能被提取；模型越大越容易 | https://arxiv.org/abs/2012.07805 | 一致 |

## 第 07 篇 预训练

| 事实 | 数值 / 内容 | 来源 | 结论 |
| --- | --- | --- | --- |
| Llama 3 主训练调度（405B） | AdamW，峰值 lr 8×10⁻⁵，线性预热 8000 步，余弦衰减到 8×10⁻⁷，共 120 万步 | Llama 3 论文 3.4.1 | 一致 |
| Llama 3 批大小 | 初始 4M token、序列 4096；252M token 后 8M、序列 8192；2.87T token 后 16M | 同上 | 一致 |
| Llama 3 长上下文 | 6 个阶段从 8K 逐步到 128K，约 800B token；每阶段判断标准：短上下文评测完全恢复、该长度下“大海捞针”全对；推迟原因是自注意力计算随长度平方增长 | 同上 3.4.2 | 与简报一致 |
| Llama 3 退火 | 最后 40M token 线性把 lr 退火到 0，保持 128K 上下文，上采样极高质量数据；对退火过程中的检查点做 Polyak 平均得到最终模型 | 同上 3.4.3 | 一致（Polyak 平均出自论文同节，记忆中，正文只写“平均检查点”时谨慎表述） |
| Llama 3 RoPE | RoPE base 提高到 500,000 | 同上 3.2 | 一致 |
| Llama 3 预训练量 | 旗舰 15.6T token；导言写约 15T 多语言 token | 同上 | 一致 |
| Llama 3.1 GPU 小时 | 8B 146 万、70B 700 万、405B 3084 万、合计 3930 万 H100-80GB GPU 小时；预训练数据截止 2023 年 12 月 | https://github.com/meta-llama/llama-models/blob/main/models/llama3_1/MODEL_CARD.md | 与简报一致 |
| WSD | MiniCPM（2024）：预热—稳定—衰减三段；衰减占总 token 约 10% 已足够，2.5% 不够；衰减开始后 loss 快速下降；衰减阶段混入高质量 SFT 数据；利于继续训练 | https://arxiv.org/abs/2404.06395 | 一致 |
| Llama 2 稳定性设置 | AdamW β2=0.95，梯度裁剪 1.0，预热 2000 步，余弦衰减到峰值 10%，weight decay 0.1 | https://arxiv.org/abs/2307.09288 | 一致 |
| z-loss | PaLM：辅助损失 10⁻⁴·log²Z，鼓励 softmax 归一化项 log Z 接近 0，提高稳定性 | https://arxiv.org/abs/2204.02311 | 一致 |
| PaLM loss 尖峰 | 540B 训练中约 20 次尖峰；从尖峰前约 100 步的检查点重启并跳过 200—500 个批次 | 同上 | 一致 |
| QK-norm、OLMo 2 | OLMo 2（2024/2025）：对 Q、K 投影做 RMSNorm；z-loss（3.3.3 写 10⁻⁴，表 1 写 10⁻⁵，论文内部不一致）；输出端归一化；embedding 不做 weight decay；梯度裁剪 1.0；退火阶段用 Dolmino Mix 1124，多次退火后做模型平均 | https://arxiv.org/abs/2501.00656 | 正文不写 OLMo 2 的 z-loss 系数，只写 PaLM 的 |
| 继续预训练 | Gururangan 等 2020（DAPT/TAPT）：在领域文本上二次预训练，生物医学、计算机科学论文、新闻、评论四个领域都有提升 | https://arxiv.org/abs/2004.10964 | 一致 |
| 继续预训练的回放 | Ibrahim 等 2024：lr 重新预热 + 重新衰减 + 回放旧数据可匹配从头重训；英→英弱分布变化回放 5%，英→德强变化回放 25%；重新预热 lr 是旧数据 loss 上升的重要原因 | https://arxiv.org/abs/2403.08763 | 一致 |
| 6ND 与 8B 算力 | 6 × 8.03e9 × 15e12 ≈ 7.2×10²³ FLOPs（简报口径） | 简报 + 自算 | 一致 |
| 基础模型与对话模型输出 | 正文示例是示意输出，没有实际运行 | — | 正文标为“示意” |

## 第 13 篇 蒸馏、继续预训练与模型合并

| 事实 | 数值 / 内容 | 来源 | 结论 |
| --- | --- | --- | --- |
| 知识蒸馏 | Hinton、Vinyals、Dean 2015：用温度 T 软化 softmax 得到软目标；软目标梯度量级按 1/T² 缩放，所以同时用硬、软目标时要乘 T² | https://arxiv.org/abs/1503.02531 （PDF 正文） | 一致 |
| 序列级蒸馏 | Kim & Rush 2016（EMNLP）：在机器翻译上用教师生成的序列训练学生；最佳学生约快 10 倍，贪心解码比无蒸馏学生高 4.2 BLEU | https://arxiv.org/abs/1606.07947 | 一致 |
| DeepSeek-R1 蒸馏 | 用 R1 整理的 80 万条样本（约 60 万推理 + 20 万非推理）对 Qwen2.5-Math-1.5B、Qwen2.5-Math-7B、Qwen2.5-14B、Qwen2.5-32B、Llama-3.1-8B、Llama-3.3-70B-Instruct 做 SFT，不做 RL；蒸馏版 Qwen-32B 明显好于在同底座上做大规模 RL 的 R1-Zero-Qwen-32B | https://arxiv.org/abs/2501.12948 （HTML v1 2.4、4.1 节）；https://huggingface.co/deepseek-ai/DeepSeek-R1 | 一致 |
| R1 许可 | 代码与权重 MIT，允许商用和用于蒸馏训练其他模型；Qwen 蒸馏版原底座 Apache 2.0，Llama 蒸馏版受 Llama 3.1 / 3.3 许可证约束 | DeepSeek-R1 模型卡 | 一致 |
| 在线策略蒸馏 | GKD（Agarwal 等 2023，ICLR 2024）：学生在自己生成的序列上接受教师反馈，解决训练与推理分布不一致 | https://arxiv.org/abs/2306.13649 | 一致 |
| Llama 3.1 许可证与输出 | 用 Llama 材料或其输出训练、微调、改进并分发的模型，名称开头须加 “Llama”；分发时显著标注 “Built with Llama”；月活超 7 亿须另行申请 | https://github.com/meta-llama/llama-models/blob/main/models/llama3_1/LICENSE | 一致，正文只作为“要核对的条款”举例，不作法律意见 |
| Llama 3.1 模型卡 | 明确列出“用输出改进其他模型，包括合成数据与蒸馏”为许可证允许的用途 | Llama 3.1 MODEL_CARD | 一致 |
| Qwen2.5-1.5B-Instruct | Apache-2.0；1.54B 参数（非嵌入 1.31B）；28 层；上下文 32,768 | https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct | 一致 |
| 教师与学生分词器不同 | Llama 3 词表 128,256、Qwen2.5 词表 151,665（本机 tokenizer.json 实测 `get_vocab_size`），逐 token logit 蒸馏不能直接对齐，序列级蒸馏不受影响 | 本机实测 | 一致 |
| Model soups | Wortsman 等 2022（ICML）：平均不同超参微调出的模型权重，常优于单个最佳模型，推理无额外成本；前提是微调模型落在同一个低误差盆地；ViT-G 在 ImageNet top-1 90.94% | https://arxiv.org/abs/2203.05482 | 一致 |
| 任务向量 | Ilharco 等 2022（ICLR 2023）：任务向量 = 微调后权重 − 预训练权重；相加获得多任务能力，取负可削弱某任务（遗忘），类比组合 | https://arxiv.org/abs/2212.04089 | 一致 |
| TIES-Merging | Yadav 等 2023（NeurIPS）：Trim 重置变化小的参数 → Elect Sign 选符号 → 只平均与选定符号一致的值；干扰来自冗余参数和符号冲突 | https://arxiv.org/abs/2306.01708 | 一致 |
| DARE | Yu 等 2023（ICML 2024）：按比例 p 随机丢弃差值参数，剩余乘 1/(1−p)；SFT 差值通常很小（约 0.002 以内），丢 90% 乃至 99% 能力基本不变；作为合并前预处理 | https://arxiv.org/abs/2311.03099 | 一致 |

## 与简报的差异

- 简报数字在本组用到的范围内（Llama 3 数据配比、长上下文 6 阶段约 800B、Llama 3.1 GPU 小时、128K 词表）全部核对一致。
- FineWeb 当前数据集卡写“超过 18.5T token”，15T 是 2024 年论文发布时的数字，正文两者都交代。
- Llama 3 RoBERTa 分类器是用 Llama 2 的“预测”训练，正文按此写。

## 仍不确定

- Llama 3 论文 3.4.3 的“退火期间检查点 Polyak 平均”来自记忆和此前阅读，本轮抓取未单独引用到原句；正文已不写该细节。
- 中文 token/字比例只用一段 115 字样例实测，正文已注明只代表该样例。

## 补充核对（写作中追加）

| 事实 | 数值 / 内容 | 来源 | 结论 |
| --- | --- | --- | --- |
| Llama 3 配比下采样类别 | 论文举例下采样“arts and entertainment” | Llama 3 论文 3.1.2 | 一致，图中写“如艺术与娱乐” |
| Llama 3 退火检查点平均 | 3.4.3：退火期间计算模型检查点平均（Polyak 1991） | Llama 3 论文 3.4.3 | 已核对，上文“仍不确定”第一条取消；第 07 篇正文写“把退火过程中的若干检查点做平均” |
| FineWeb 全局去重 | 跨 96 个快照全局去重只剩约 4T token，350B token 训练的模型几乎不比不去重好；原因是旧快照中被保留的数据含更多广告、关键词列表、格式混乱文本；逐快照去重约 20T token，效果与 RefinedWeb 相当 | https://arxiv.org/abs/2406.17557 | 一致 |
| Qwen2.5-3B-Instruct 许可证 | qwen-research（与 1.5B 的 Apache 2.0 不同） | https://huggingface.co/Qwen/Qwen2.5-3B-Instruct | 一致 |
| 示意值说明 | 第 07 篇下一个 token 概率、第 13 篇“工作日/自然日”概率、TIES 6 个参数均为教学示意值；T=2 分布 = T=1 概率开平方再归一化（0.894、0.346、0.224、0.173 → 0.55、0.21、0.14、0.11） | 自算 | — |
| 成本估算 | 8B×15T：7.2e23 ÷ (989e12×0.4) ≈ 1.82e9 s ≈ 50.6 万 GPU 小时；模型卡 146 万约 2.9 倍；继续预训练 10B token：4.8e20 FLOPs ≈ 338 GPU 小时；2 美元/GPU 小时为假设单价 | 自算 | 正文标为估算 |
