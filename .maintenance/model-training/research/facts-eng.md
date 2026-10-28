# facts-eng：第 21 篇（评估）、第 22 篇（训练工程与选型）核对记录

核对日期 2026-10-27。GitHub 版本用 `gh release list -R <repo>` 与 `gh api repos/<repo>/releases` 查询（含 `prerelease` 字段）。

## 第 21 篇 评估

| 事实 | 数值 / 结论 | 来源 | 结论 |
| --- | --- | --- | --- |
| MMLU | 57 个学科的四选一题，约 1.6 万题 | https://arxiv.org/abs/2009.03300 | 正文只写“57 个学科、四选一”，未写题数细节 |
| MMLU-Pro | 选项从 4 个增至 10 个；模型分数比 MMLU 低 16%—33%；24 种提示写法下分数波动从 4%—5% 降到约 2% | https://arxiv.org/abs/2406.01574 | 已核对摘要 |
| GSM8K | 8.5K 道小学数学应用题（Cobbe 等 2021） | https://arxiv.org/abs/2110.14168 | 已核对摘要 |
| HumanEval | 164 道 Python 函数题，pass@k；评测程序会执行模型生成的不可信代码，官方要求放在沙箱里 | https://github.com/openai/human-eval （README 示例 32,800 样本 ÷ 每题 200 = 164） | 已核对 |
| MT-Bench | 80 道题，8 类，每类 10 题，两轮对话 | https://arxiv.org/html/2306.05685v4 | 已核对 |
| Chatbot Arena（论文时） | 一个月约 3 万票 | 同上 | 已核对 |
| 位置偏差 | 交换两个回答顺序后判断一致的比例：GPT-4 65.0%，GPT-3.5 46.2%，Claude-v1 23.8%（默认提示）；Claude-v1 75% 情况偏向第一个 | 同上 Table 2 | 已核对 |
| 冗长偏差 | “重复列表”攻击（23 个回答）：Claude-v1、GPT-3.5 失败率 91.3%，GPT-4 8.7% | 同上 | 已核对 |
| 自我偏好 | GPT-4 给自己的胜率比人类评判高约 10%，Claude-v1 高约 25%；GPT-3.5 未表现出；作者说明数据有限，不能断定存在 | 同上 | 已核对，正文写明“数据有限” |
| 评委与人类一致率 | MT-Bench 不计平局（S2）：GPT-4 与人类 85%，人类之间 81%；计平局（S1）66% 对 63%/67% | 同上 Table 5 | 已核对 |
| 缓解效果 | few-shot 让 GPT-4 换序一致率从 65.0% 升到 77.5%；数学题失败率：默认 70%（14/20），思维链 30%，参考答案引导 15%（3/20） | 同上 | 已核对 |
| 论文发表 | Zheng 等，NeurIPS 2023 Datasets and Benchmarks Track；arXiv 2306.05685 | arXiv 页 | 正文写“2023 年” |
| 抽样误差 | p=0.8：n=200 时标准误 2.83 个百分点、95% 半宽 ±5.5；独立两版差 ±3 需约 1366 题/版，80% 功效需约 2788 题/版（z=0.84；用 0.8416 为 2791）；配对且 10% 题目结果不同（6.5% 修好、3.5% 改坏）时，95% 半宽 ±3 需约 423 题，80% 功效约 864 题；n=500 配对标准误 1.41 | 本地 node 计算（正态近似） | 自算，正文写明是近似 |

## 第 22 篇 训练工程与选型

### 版本快照（2026-10-27 查询，正式版）

| 项目 | 仓库（当前） | 最新正式版 | 日期 | 说明 |
| --- | --- | --- | --- | --- |
| PyTorch | pytorch/pytorch | 2.14.1 | 2026-09-30 | 2.14.0 为 2026-09-02；2.14.1 修复若干静默错误结果，包括把 CUDA 13.2 Linux 二进制升到 13.2.2（cuBLAS NVFP4 缩放、编译器线程重汇合问题） |
| Transformers | huggingface/transformers | 5.21.0（tag `v5.21`） | 2026-10-26 | 新增模型为主 |
| TRL | huggingface/trl | 1.16.0 | 2026-10-15 | 支持 AWS Trainium；AsyncGRPO 前缀树打包 |
| PEFT | huggingface/peft | 0.21.2 | 2026-10-01 | 修复 Transformers ≥ 5.18 下编码器-解码器模型不可用；0.21.0（09-15）新增 KaSA 等方法 |
| Accelerate | huggingface/accelerate | 1.15.0 | 2026-09-09 | FSDP2 激活显存修复、检查点正确性修复 |
| DeepSpeed | deepspeedai/DeepSpeed（microsoft/DeepSpeed 重定向至此） | 0.19.8 | 2026-10-20 | 移除若干旧功能（压缩库残留、ZeRO++ 的 LoCo、sparse_gradients 标记弃用） |
| Megatron Core | NVIDIA/Megatron-LM | core_v0.19.2 | 2026-09-18 | 之后的 `26.09-*.rc*` 标签（最新 2026-10-13）为候选版；GitHub 未勾选 prerelease，但按名称属于预发布 |
| LLaMA-Factory | hiyouga/LlamaFactory（原 hiyouga/LLaMA-Factory 重定向） | 0.9.5 | 2026-05-30 | 兼容 Transformers v5 |
| ms-swift | modelscope/ms-swift | 4.6.0 | 2026-10-13 | 新增模型与 MUSA 后端 |
| verl | verl-project/verl（原 volcengine/verl 重定向） | 0.9.1 | 2026-09-20 | V1 训练器；旧 experimental 异步策略弃用 |
| diffusers | huggingface/diffusers | 0.42.1 | 2026-10-27 | 安全修复：`from_pretrained` 组件解析可绕过 `trust_remote_code`（GHSA-4prv-5hj7-c2xr），0.42.0 用户应升级 |
| sentence-transformers | huggingface/sentence-transformers（原 UKPLab 重定向） | 6.2.0 | 2026-10-21 | 模型合并、分布式评估 |
| NeMo Speech | NVIDIA-NeMo/Speech（原 NVIDIA/NeMo、NVIDIA-NeMo/NeMo 重定向） | 3.0.0 | 2026-08-07 | 仓库拆分后只保留语音；LLM/VLM/扩散移到 Megatron-Bridge、NeMo Automodel 等仓库 |
| Megatron-Bridge | NVIDIA-NeMo/Megatron-Bridge | 0.6.2 | 2026-09-18 | 与 Hugging Face 格式双向转换；另有 26.09-*.rc1 候选标签 |
| NeMo Automodel | NVIDIA-NeMo/Automodel | 0.7.0 | 2026-10-21 | PyTorch 原生分布式、直接用 HF 模型 |
| OpenRLHF | OpenRLHF/OpenRLHF | 0.11.2 | 2026-09-14 | 基于 Ray |
| Axolotl | axolotl-ai-cloud/axolotl | 0.21.1 | 2026-10-27 | |
| Unsloth | unslothai/unsloth | 仅 beta 命名的发布，最新 v0.1.911-beta | 2026-10-26 | GitHub 未勾选 prerelease，但名称为 beta，按预发布单列 |
| FunASR | modelscope/FunASR | 1.4.16 | 2026-09-18 | |
| ESPnet | espnet/espnet | v.202611 | 2026-10-23 | 日期式版本号 |
| WeNet | wenet-e2e/wenet | 3.1.0 | 2024-05-23 | 两年多无新发布，正文提示维护节奏 |

### 其他事实

| 事实 | 数值 / 结论 | 来源 | 结论 |
| --- | --- | --- | --- |
| Llama 3.1 训练 GPU 小时 | 8B 146 万、70B 700 万、405B 3084 万，合计 3930 万 H100-80GB（TDP 700W）GPU 小时；约 15T token；Llama 3.1 Community License | https://github.com/meta-llama/llama-models/blob/main/models/llama3_1/MODEL_CARD.md | 与简报一致 |
| Llama 3.1 许可证 | 用 Llama 材料或输出训练、微调并分发的模型，名称开头须带“Llama”；分发时显著标注“Built with Llama”；月活超 7 亿须另行申请；遵守可接受使用政策 | https://github.com/meta-llama/llama-models/blob/main/models/llama3_1/LICENSE | 已核对 |
| Llama 3 405B 训练中断 | 54 天快照内 466 次中断，419 次意外；约 78% 归因于确认或疑似硬件问题；GPU 问题占意外中断 58.7%；有效训练时间 90% 以上；最多 16K 张 H100 | https://arxiv.org/html/2407.21783v3 §3.3.4 | 已核对 |
| HF Trainer 检查点内容 | `optimizer.pt`、`scheduler.pt`、`trainer_state.json`、`rng_state.pth`（多进程为 `rng_state_<rank>.pth`）；恢复时默认跳过已训练批次，`ignore_data_skip` 可关闭 | transformers v5.21 `src/transformers/trainer.py` | 已核对源码 |
| Accelerate 检查点 | `save_state()` 保存经 `prepare()` 的模型、优化器、调度器（源码 `self._schedulers`）、RNG、GradScaler；未经 `prepare()` 的自定义对象需 `register_for_checkpointing`（审查时据 accelerator.py 源码更正）；中途恢复用 `skip_first_batches` | https://huggingface.co/docs/accelerate/usage_guides/checkpoint | 已核对 |
| 检查点大小估算 | 8B 全参：BF16 权重 2 + FP32 主权重 4 + 两个动量 8 = 14 字节/参数 ≈ 112.4 GB；LoRA 4194 万参数，FP32 参数+两动量 12 字节 ≈ 0.5 GB | 自算 | 估算 |
| 成本算例 | 2 万条 × 600 token × 3 轮 = 3600 万 token；6ND = 1.73×10¹⁸ FLOPs；H100 989 TFLOPS、MFU 30% → 约 1.6 GPU 小时；按 4ND（LoRA 不算冻结权重梯度）约 1.1 GPU 小时；按假设单价 2.5 美元/GPU 小时；Llama 3.1 8B 146 万 GPU 小时 × 2.5 ≈ 365 万美元 | 自算；单价为假设 | 正文标注“假设价格” |
| Qwen2.5-0.5B-Instruct 许可证 | Apache 2.0 | 简报（实践篇所用） | 未单独复核，正文仅作对照 |

## 简报差异与不确定

- 简报写的仓库名多处已迁移：DeepSpeed → deepspeedai，LLaMA-Factory → hiyouga/LlamaFactory，verl → verl-project，sentence-transformers → huggingface，NeMo → NVIDIA-NeMo/Speech（且只剩语音部分）。正文按新名称写。
- Megatron-LM 与 Unsloth 的候选/beta 标签在 GitHub 上没有勾选 prerelease，按标签名判断为预发布。
- 评委偏差数字来自 2023 年的 GPT-4、GPT-3.5、Claude-v1，正文写明是当时评委的结果，现在的评委要自己校准。

### 补充（正文用到、按常识与项目页描述核对）

- verl 仓库描述 “verl/HybridFlow: A Flexible and Efficient RL Post-Training Framework”；HybridFlow 论文（arXiv 2409.19256）来自字节跳动，原仓库在 volcengine 组织下。正文写“源自字节跳动的 HybridFlow 论文”。
- OpenRLHF 仓库描述为基于 Ray；LlamaFactory 仓库描述 “Unified Efficient Fine-Tuning of 100+ LLMs & VLMs (ACL 2024)”；ms-swift 4.6.0 发布说明提到 Megatron-SWIFT。
- PyTorch FSDP2 接口为 `torch.distributed.fsdp.fully_shard`，分布式检查点 `torch.distributed.checkpoint` 支持按新切分加载（未在本次单独抓取文档，属稳定事实）。
- 篇幅：21 篇约 19.7 KB、22 篇约 21.6 KB，超出简报参考区间，原因是两篇各自覆盖的必需主题较多（基准、评测集、指标、评委、回归、统计、线上；框架、版本、复现、检查点、故障、成本、合规、隐私、注册表）。
