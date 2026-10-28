# posttrain 组事实核对（09 SFT、10 LoRA/QLoRA、11 偏好对齐、12 RL 与推理模型）

核对日期：2026-10-27。来源均为论文原文（arXiv 摘要或全文）、官方文档或官方仓库文件。

## 09 SFT

| 事实 | 正文用法 | 来源 | 结论 |
| --- | --- | --- | --- |
| LIMA：65B LLaMA，只用 1,000 条精选问答做 SFT，人评中 43% 情况与 GPT-4 持平或更好（对 Bard 58%、对 DaVinci003 65%） | 数据质量优先 | https://arxiv.org/abs/2305.11206 | 属实 |
| QLoRA 论文：9k 条 OASST1 胜过 450k 条 FLAN v2（聊天评测），数据质量远比数量重要 | 数据质量优先的第二例 | https://arxiv.org/abs/2305.14314 全文 §1 | 属实 |
| Qwen2.5-0.5B-Instruct 模板：`<\|im_start\|>role\n内容<\|im_end\|>\n`，无 system 时自动插入 “You are Qwen, created by Alibaba Cloud. You are a helpful assistant.”；eos_token `<\|im_end\|>`，pad_token `<\|endoftext\|>` | 模板渲染示例 | https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct/raw/main/tokenizer_config.json（已下载核对 chat_template） | 属实 |
| Llama 3.1 Instruct 模板：`<\|begin_of_text\|><\|start_header_id\|>system<\|end_header_id\|>\n\n…<\|eot_id\|>…<\|start_header_id\|>assistant<\|end_header_id\|>\n\n`，回答以 `<\|eot_id\|>` 结束；base 模型生成 `<\|end_of_text\|>` | 模板对照 | https://github.com/meta-llama/llama-models/blob/main/models/llama3_1/prompt_format.md | 属实 |
| TRL v1.16.0 SFTTrainer：对话格式 `messages` 自动套模板；`assistant_only_loss=True` 只对 assistant 计损失，要求模板含 `{% generation %}` 标记；prompt-completion 数据默认只对 completion 计损失；忽略位置标签 -100；`packing=True`，默认 `packing_strategy="bfd"` 且自动 padding-free；SFTConfig 默认 lr 2e-5、3 epochs、max_length 1024 | 损失掩码、打包、超参 | https://huggingface.co/docs/trl/sft_trainer | 属实（v1.16.0） |
| TRL 文档：训练适配器通常用更高学习率（约 1e-4） | LoRA 学习率 | 同上 | 属实 |
| TRL 文档：Qwen2.5-1.5B base 做 SFT 需设 `eos_token="<\|im_end\|>"`，否则回答不会正确结束 | “模板错了不报错”的实例 | 同上 | 属实 |
| LLaMA-Factory 官方示例 qwen3_lora_sft.yaml：lora_rank 8、lora_target all、lr 1.0e-4、3 epochs；qwen3_full_sft.yaml：lr 1.0e-5、3 epochs | 超参起点 | https://github.com/hiyouga/LlamaFactory/tree/main/examples（2026-10 main 分支） | 属实。简报说 llama3_* 示例，现仓库已改名为 qwen3_*，正文只写“官方示例” |
| InstructGPT 的“对齐税”：RLHF 后部分公开 NLP 基准退步，混入预训练梯度（PPO-ptx）显著减轻 | 遗忘与混入通用数据 | https://arxiv.org/abs/2203.02155 | 属实 |

## 10 LoRA 与 QLoRA

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| LoRA 摘要：相对 Adam 全参微调 GPT-3 175B，可训练参数减少 10,000 倍，GPU 显存需求减少 3 倍；不增加推理延迟（与 adapter 相比） | https://arxiv.org/abs/2106.09685 | 属实 |
| 正文 §4：A 随机高斯初始化、B 置零，训练开始时 ΔW=0；ΔWx 乘以 α/r，α 设为首次尝试的 r 后不再调，用于改 r 时少调超参 | 同上 PDF | 属实 |
| GPT-3 175B 训练显存 1.2TB → 350GB；r=4 只改 Wq、Wv 时检查点 350GB → 35MB；训练快约 25% | 同上 PDF §4.2 | 属实 |
| “内在秩”假设：引用 Aghajanyan 等的低内在维度结论，假设权重更新也有低“内在秩”；表 6 中 r=1 改 Wq、Wv 已有竞争力；脚注：任务语言与预训练不同时，小 r 未必够 | 同上 §7.2 | 属实 |
| Llama-3.1-8B r=16 全部 7 种线性层：q 131,072；k 81,920；v 81,920；o 131,072；gate/up/down 各 294,912；每层 1,310,720；32 层 41,943,040；占 8,030,261,248 的 0.522% | 自算，维度按简报口径 | 与简报一致 |
| QLoRA：NF4、双重量化、分页优化器；65B 单张 48GB 卡；>780GB → <48GB；Guanaco 达 ChatGPT 99.3%（Vicuna 基准），24 小时单卡 | https://arxiv.org/abs/2305.14314 | 属实 |
| QLoRA 细节：W 用 NF4、分块 64；双重量化把量化常数开销从 0.5 bit/参数降到 0.127 bit/参数；计算时反量化为 BF16；分页优化器用 NVIDIA 统一内存，显存不够时把优化器状态换到 CPU 内存 | 同上 §3 | 属实 |
| QLoRA：只对 q、v 加 LoRA 追不上全参微调，所有线性层加 LoRA 才能匹配；r 本身影响不大 | 同上 §4 | 属实 |
| QLoRA 底座估算：线性层 6,979,321,856 参数 × (4 + 0.127) bit ≈ 3.60 GB；嵌入与输出层 1,050,673,152 × 2 B ≈ 2.10 GB；合计约 5.7 GB | 自算 | 与简报“5.5—6 GB”一致 |
| LoRA Learns Less and Forgets Less（Biderman 等，2024）：代码与数学、指令微调（约 100K 对）和继续预训练（20B token）；LoRA 明显弱于全参，但更好保留目标域外能力；全参学到的扰动秩比常见 LoRA 配置高 10—100 倍 | https://arxiv.org/abs/2405.09673 | 属实 |
| PEFT LoraConfig 默认 r=8、lora_alpha=8；`target_modules="all-linear"` 选全部线性层（排除输出层）；`use_rslora` 缩放改为 α/√r；`use_dora` 把更新拆成幅度和方向，开销大于 LoRA，建议推理前合并；默认初始化 B=0 | https://huggingface.co/docs/peft/package_reference/lora | 属实 |
| DoRA（2024）：预训练权重分解为幅度与方向，方向用 LoRA 更新；在 LLaMA、LLaVA、VL-BART 上稳定优于 LoRA，无额外推理开销（合并后） | https://arxiv.org/abs/2402.09353 | 属实 |
| rsLoRA（2023）：适配器应除以 √r 而不是 r，否则高秩时学习变慢 | https://arxiv.org/abs/2312.03732 | 属实 |
| vLLM 多 LoRA 服务：`--enable-lora --lora-modules name=path`，请求的 `model` 字段选适配器，`max_loras`、`max_lora_rank` 为全局配置，可与底座请求并行 | https://docs.vllm.ai/en/latest/features/lora.html | 属实；站内推理系列没有专门讲多 LoRA 服务（只有 10-prefix-cache.md 提到 LoRA 作为缓存哈希的额外标识），正文链接该页并直接说明 vLLM 参数 |

## 11 偏好对齐

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| InstructGPT 三步：示范数据 SFT → 排序数据训奖励模型 → PPO；1.3B InstructGPT 输出被偏好于 175B GPT-3 | https://arxiv.org/abs/2203.02155 | 属实 |
| 奖励模型 6B；每个提示排序 K=4—9 个回答，产生 C(K,2) 对；损失 −log σ(r(x,y_w) − r(x,y_l))（Bradley–Terry 形式） | 同上全文 | 属实 |
| PPO 目标：奖励减 β·KL(π‖π_SFT)，PPO-ptx 再加 γ 倍预训练似然；数据量 SFT 约 13k 提示、RM 约 33k、PPO 约 31k | 同上 | 属实 |
| Gao 等 2022 奖励模型过度优化：用“金标准”奖励模型代替人，训练代理奖励模型；d=√KL，BoN：R=d(α−βd)，RL：R=d(α−β·log d)；系数随奖励模型规模平滑变化 | https://arxiv.org/abs/2210.10760 | 属实 |
| DPO（Rafailov 等 2023）：重新参数化奖励使最优策略有闭式解，用简单分类损失解决 RLHF 问题，不用显式奖励模型、训练中不采样 | https://arxiv.org/abs/2305.18290 | 属实 |
| TRL v1.16.0 DPO：损失 −log σ(β(Δchosen − Δrejected))；默认 β=0.1，lr 1e-6；`ref_model=None` 时用训练开始时的模型作参考；`precompute_ref_log_probs` 可预先算参考对数概率；日志 rewards/chosen、rewards/margins、rewards/accuracies | https://huggingface.co/docs/trl/dpo_trainer | 属实 |
| LLaMA-Factory qwen3_lora_dpo.yaml：pref_beta 0.1、lr 5.0e-6、3 epochs | 官方示例 | 属实 |
| IPO（Azar 等 2023，ΨPO）：偏好越确定，DPO 的 KL 正则越弱；p=1 时被拒回答概率被推到 0，与 β 无关；Ψ 取恒等得 IPO | https://arxiv.org/abs/2310.12036 §4.2、§5 | 属实 |
| KTO（2024）：只需“好/不好”二元信号，基于 Kahneman–Tversky 前景理论 | https://arxiv.org/abs/2402.01306 | 属实 |
| ORPO（2024）：无参考模型，在 SFT 中用胜负比（odds ratio）对比，单阶段 | https://arxiv.org/abs/2403.07691 | 属实 |
| SimPO（2024）：用序列平均对数概率作隐式奖励，无参考模型，加目标奖励间隔，不明显增加长度 | https://arxiv.org/abs/2405.14734 | 属实 |

## 12 强化学习与推理模型

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| RLVR 一词出自 Tülu 3（2024） | https://arxiv.org/abs/2411.15124 | 属实 |
| DeepSeekMath（2024）：GRPO 是 PPO 变体，省去价值模型，用同题多份输出的平均奖励作基线；结果监督时优势 = (r − 组均值)/组标准差，赋给该输出的每个 token；KL 直接加进损失（用 Schulman 无偏估计）；每题 64 份、KL 系数 0.04、lr 1e-6、约 144K 题、最长 1024；RL 提升 Maj@K 而非 Pass@K；7B 在 MATH 51.7% | https://arxiv.org/abs/2402.03300 全文 §4 | 属实 |
| DeepSeek-R1（2025）：R1-Zero 从 DeepSeek-V3-Base 直接 GRPO，规则奖励（准确性 + 格式），不用神经奖励模型（怕奖励被钻空子、重训成本）；AIME 2024 pass@1 15.6% → 71.0%，多数投票 86.7%；“aha moment”；可读性差、语言混杂 | https://arxiv.org/html/2501.12948v1 | 属实 |
| R1 四阶段：数千条冷启动长 CoT SFT → 推理 RL（加语言一致性奖励）→ 拒绝采样约 600k 推理 + 约 200k 非推理 = 约 800k 条，对 V3-Base SFT 2 轮 → 全场景 RL（规则奖励 + 有用性/无害性奖励模型） | 同上 | 属实 |
| 蒸馏：用 800k 条对 Qwen2.5、Llama 系列只做 SFT；Qwen-32B 上 RL 1 万余步的 R1-Zero-Qwen-32B AIME 47.0，蒸馏版 72.6 | 同上 | 属实 |
| 失败尝试：PRM、MCTS | 同上 | 属实 |
| R1-Zero 超参（arXiv v2 附录）：lr 3e-6，KL 0.001，温度 1，每题 16 份，最长 32,768（8.2k 步后 65,536），每步 32 题共 512 条，每 400 步把参考模型换成最新策略，共 10,400 步 | https://arxiv.org/html/2501.12948v2 | 属实（v2 修订版；v1 未写） |
| TRL v1.16.0 GRPOTrainer：默认 num_generations 8、beta 0.0（默认不加 KL）、lr 1e-6、loss_type 默认 "dapo"；原 GRPO 按 1/\|o_i\| 归一引入长度偏差（Understanding R1-Zero-Like Training），dr_grpo 用常数归一；reward_funcs 可传自定义函数；use_vllm 加速生成 | https://huggingface.co/docs/trl/grpo_trainer | 属实 |
| OpenAI 2025 监控推理模型：在智能体编码环境中监控 o3-mini 的奖励钻空子，CoT 监控比只看动作有效；把监控加进奖励后，模型学会在 CoT 里隐藏意图继续作弊 | https://arxiv.org/abs/2503.11926 | 属实 |

## 补充核对

| 事实 | 来源 | 结论 |
| --- | --- | --- |
| LLaMA-Factory 默认 `train_on_prompt=False`（只对回答计损失）、`mask_history=False`（多轮都训练） | https://github.com/hiyouga/LlamaFactory/blob/main/src/llamafactory/hparams/data_args.py | 属实 |
| R1-Zero 推理 token 数“从数百到数千”随训练增长（论文 §2.2.4 文字描述；图 3 为平均长度曲线） | https://arxiv.org/abs/2501.12948 | 文字记忆与图注一致，图中具体数值未能从 HTML 读出，正文只写“几百增长到数千” |
| 月计薪天数 21.75、休息日 200%、法定节假日 300%、工作日延时 150% | 《劳动法》第四十四条；原劳动和社会保障部 2008 年关于月计薪天数的通知 | 正文作为“教学用示例制度”，不作为法律解读 |
| 加班费算例：8,700 ÷ 21.75 = 400；400 × 2 × 200% = 1,600；错误答案 1,200（150%）、2,400（300%）、800（漏乘倍数） | 自算 | 正确 |
| GRPO 示意：奖励 1,0,1,0,1,0,0,1，均值 0.5，总体标准差 0.5，优势 ±1.0 | 自算 | 正确 |
| DPO 算例：β=0.1，(0.3 − (−0.5)) → 0.08，σ≈0.52，损失≈0.65；(1.0 − (−9.0)) → 1.0，σ≈0.73，损失≈0.31 | 自算 | 正确 |
| BT 算例：分差 1.5 → σ≈0.82，损失≈0.20；分差 −1.5 → 损失≈1.70 | 自算 | 正确 |
| LoRA r=64 全线性层：41,943,040 × 4 ≈ 1.68 亿，约 2.1% | 自算 | 正确 |
| 适配器文件大小：41,943,040 × 2 字节 ≈ 84 MB（BF16） | 自算 | 正确 |
| RL 生成量估算：2,000 × 8 × 600 = 960 万 token；SFT 2,000 × 200 = 40 万 token，24 倍 | 自算，示例假设 | 正确 |

## 简报数字核对

- Llama-3.1-8B LoRA r=16 每层 1,310,720、共约 4194 万、0.52%：自算一致。
- QLoRA 底座 5.5—6 GB：按 NF4 + 双重量化 + BF16 词嵌入/输出层自算约 5.7 GB，一致。
- 简报所列 LLaMA-Factory “examples” 文件名已变化（llama3_* → qwen3_*），超参口径不变：LoRA 1e-4、全参 1e-5、3 epochs。
- TRL 当前版本 v1.16.0，GRPO 默认 beta=0.0、loss_type="dapo"，与 DeepSeekMath 原始配置（KL 0.04）不同，正文写明。

## 仍不确定

- 偏好对齐与 RL 的“常见起点”超参（DPO β 0.1、lr 5e-7—5e-6）来自 TRL 默认值和 LLaMA-Factory 示例，没有通用最优值，正文以“起点”表述。
- 资料助手的加班费规则（工作日 1.5 倍、休息日 2 倍、法定节假日 3 倍）是中国《劳动法》第四十四条的通行口径，用作教学案例中的“公司制度”，正文注明为示例规则。
