# 模型训练与调优系列维护记录

日期：2026-10-27，Asia/Shanghai。

## 位置与职责

正式内容在 `docs/ai/model-training/`：导读、22 篇正文和一篇不编号的实践篇（`lora-practice.md`，侧边栏放在第 10 篇之后）。分五部分：训练的共同底座（01—05）、大语言模型（06—13）、语音模型（14—16）、视觉多模态与向量（17—20）、评估与工程（21—22）。侧边栏分组“模型训练与调优”在“大模型”之后、“大模型推理优化”之前，按五个部分嵌套为可折叠子分组。

入口：AI 总览卡片、`learning-path.md` 第六阶段、`llm/index.md`、`llm/training.md` 结尾、`llm/sft.md` 相关概念、`foundations/index.md`。`llm/training.md` 与 `llm/sft.md` 保留为大模型专题里的短导读，本系列是深入版本；推理与部署由 `docs/ai/llm-inference/` 负责。

写作简报（章节表、贯穿案例、数字口径、写作和图示要求）见 `brief.md`。

## 数字口径

- 计算统一用 Llama-3.1-8B（80.3 亿参数、32 层、隐藏 4096、FFN 14336、8 个 KV 头、词表 128,256、约 15T token、模型卡 146 万 H100 小时）与 H100 SXM（BF16 稠密 989 TFLOPS）。
- 混合精度 AdamW 每参数 16 字节，8B 全参状态 128.5 GB；LoRA r=16 全部线性层 41,943,040 个参数（0.52%）；QLoRA 底座约 5.7 GB（双重量化）。
- 6ND 估算 8B×15T ≈ 7.2×10²³ FLOPs；按 40% MFU 约 50.7 万 GPU 小时，模型卡为 146 万，正文只说明手算是下界，不臆测差距原因。
- 各组核对记录：`research/facts-basics.md`、`facts-scale.md`、`facts-pretrain.md`、`facts-posttrain.md`、`facts-speech.md`、`facts-vision.md`、`facts-eng.md`。示意数据（训练曲线、混淆矩阵、检索指标、成本单价）正文已标明。
- 第 22 篇的框架版本快照按 2026-10-27 查询的 GitHub 正式发布；仓库迁移：DeepSpeed 在 `deepspeedai`，LLaMA-Factory 为 `hiyouga/LlamaFactory`，verl 为 `verl-project/verl`，sentence-transformers 在 `huggingface`，NeMo 拆分后语音在 `NVIDIA-NeMo/Speech`。

## 实践篇的实测

`lora-practice.md` 在 Apple M4（24 GB）、macOS、Python 3.12.14、torch 2.14.1、transformers 5.21.0、peft 0.21.2、trl 1.16.0、datasets 5.1.0 上实际运行，模型 Qwen2.5-0.5B-Instruct。脚本 `make_data.py`、`train.py`、`evaluate.py` 放在 `public/ai/model-training/lora-practice/` 供读者下载，评估输出保存在 `lora-practice/eval-base.json`、`eval-adapter.json`。

- 数据：虚构员工手册 8 条，训练 66 条（50 条可答、16 条拒答），评估 18 条（新问法 6、留出条款 5.6 与 7.1 共 8、资料外 4）。
- 训练：r=16、α=32、all-linear，lr 2e-4，cosine，3 轮 51 步，430 秒，进程峰值内存约 7.2 GB，可训练参数 8,798,208（1.75%）。
- 结果：条款引用 0→13/14，资料外拒答 3→4；暴露整段照抄与“三个月前的发票”仍被拒答两个数据问题。
- 本次环境中 `SFTConfig` 不接受 `warmup_ratio`，改用 `warmup_steps`。合并适配器（`merge_and_unload`）后目录约 953 MB。
- 重跑时先更新版本号与输出，数字变化要同步正文表格。

## 图示

生成脚本：`diagrams-basics.mjs`、`diagrams-scale.mjs`、`diagrams-pretrain.mjs`、`diagrams-posttrain.mjs`、`diagrams-speech.mjs`、`diagrams-vision.mjs`、`diagrams-eng.mjs`、`diagrams-index.mjs`，共用 `svg-kit.mjs`，输出到 `public/ai/model-training/`。修改图示改脚本后重跑，不手改 SVG。

```bash
for f in .maintenance/model-training/diagrams-*.mjs; do node "$f"; done
node .maintenance/model-training/check-svg.mjs public/ai/model-training <png 输出目录>
```

## 验证入口

- `npm run docs:build`；`node script/check-pages.mjs <站点地址> <截图目录> docs/ai/model-training/ ...`。
- 逐页审查记录在 `.maintenance/content-audit/reviews/zzzzzzzzzzzzzz-model-training.json`。
