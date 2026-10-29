# 大模型架构系列维护记录

日期：2026-10-28，Asia/Shanghai。

## 位置与职责

正式内容在 `docs/ai/llm-architecture/`：导读、第 01—20 篇正文和一篇不编号的实践篇（`layer-practice.md`，侧边栏放在第 10 篇之后）。分五部分：从 Transformer 到大模型（01—03：原始 Transformer、三种结构与 decoder-only、今天大模型的全景）、逐层拆解（04—10 + 实践）、架构演进（11—14：MoE、高效注意力、线性混合、多模态）、主流模型拆解（15—18）、读懂与对比（19—20）。侧边栏分组“大模型架构”在“大模型”之后、“模型训练与调优”之前，按五个部分嵌套为可折叠子分组。

2026-10-28 按“先整体、再部件、再变化、再实例、最后方法”重排过一次编号（旧→新）：00→01、09→02、01→03、02—08→04—10、10—12→11—13、17→14、13—16→15—18、18→19、19→20。facts 文件和 brief 章节表里的篇号是写作时的旧编号，按此表对照。机制讲在机制篇，模型篇只写该模型的具体配置并链接回机制篇；新增内容先判断属于哪一部分，不要另起编号。旧文件名（00-transformer.md、01-overview.md 等 20 个）保留为 `search: false` 的跳转页，因为部署脚本要求线上路径不丢失；`public/ai/llm-architecture/family-recipe.svg` 同理保留，已不被引用、也不再由脚本生成。

入口：AI 总览卡片、`learning-path.md`、`llm/index.md`、`llm/concepts.md`（Transformer、MoE 两处）、`deep-learning/architectures.md`。训练方法链接 `docs/ai/model-training/`，推理机制链接 `docs/ai/llm-inference/`，引擎软件链接 `docs/ai/inference-engines/`，本系列不重讲。

写作简报（章节表、贯穿案例、数字口径、写作和图示要求）见 `brief.md`。

## 数字口径与来源

- 主算例 Llama-3.1-8B：总参数 8,030,261,248，FFN 70.2%、注意力 16.7%、词嵌入+输出层 13.1%；每 token KV 128 KiB（BF16）；每 token 前向约 16 GFLOPs（2×总参数）或 15.0 GFLOPs（只计矩阵乘、不计词嵌入查表），正文两种口径都说明。
- 模型配置取 Hugging Face 官方 `config.json`（Meta、Google 官方仓库需登录时用 unsloth 等镜像，facts 里注明）；结构以本机 Transformers 5.21.0 源码核对。2026 年 6 月以后的模型（Qwen3.5—3.8、DeepSeek-V4、Gemma 4、GLM-5、Kimi K2.5/2.6、Mistral Small 4、MiniMax-M3 等）均按源码和官方模型卡写。
- 各组核对记录：`research/facts-basics.md`（01—03）、`facts-layer.md`（04—06）、`facts-posdec.md`（07—09）、`facts-evolve.md`（10—12）、`facts-families-a.md`（13—14）、`facts-families-b.md`（15—16）、`facts-read.md`（17—18）。第 19 篇的数字取自各篇，缓存与激活比例在 `diagrams-comparison.mjs` 里按配置重算。
- 版本快照日期 2026-10-28。新模型发布后更新 13—16 篇规格表时，同步第 19 篇的对比图与表。

## 实践篇的实测

`layer-practice.md` 在 Apple M4（24 GB）、macOS 26.6、Python 3.12.14、torch 2.14.1、transformers 5.21.0 上实际运行，模型 Qwen2.5-0.5B-Instruct，FP32、CPU、eager 注意力。脚本 `public/ai/llm-architecture/layer-practice/dissect.py` 供读者下载，完整输出保存在 `layer-practice/result.json`，实践篇的图由 `diagrams-practice.mjs` 直接读取该文件生成。

- 参数手算与实际计数均为 494,032,768；词嵌入共享。
- 提示 25 个 token（系统提示“你是公司内部的资料助手。”）；下一个 token “年” 26.9%。
- 消融：去掉第 0 层 FFN 损失 2.148→13.97；第 4—19 层单独去掉 1.991—2.529；成片去掉 4—19 层 FFN 9.362、注意力 8.19。
- 注意：Transformers 5 里 `output_hidden_states` 最后一项已经过最终 norm，脚本改为用 hook 取每层输出；`rope_theta` 移到 `rope_parameters`。
- 第 05 篇另有作者实测的 FFN 消融（“法国的首都是巴黎，中国的首都是”），记录在 `facts-layer.md`。
- 重跑时先更新版本号与输出，数字变化要同步正文表格并重跑 `diagrams-practice.mjs`。

## 图示

生成脚本：`diagrams-transformer.mjs`（第 01 篇）、`diagrams-basics.mjs`、`diagrams-layer.mjs`、`diagrams-posdec.mjs`、`diagrams-evolve.mjs`、`diagrams-families-a.mjs`、`diagrams-families-b.mjs`、`diagrams-read.mjs`、`diagrams-practice.mjs`、`diagrams-index.mjs`、`diagrams-comparison.mjs`，共用 `svg-kit.mjs`，输出到 `public/ai/llm-architecture/`。修改图示改脚本后重跑，不手改 SVG。

```bash
for f in .maintenance/llm-architecture/diagrams-*.mjs; do node "$f"; done
node .maintenance/llm-architecture/check-svg.mjs public/ai/llm-architecture <png 输出目录>
```

## 验证入口

- `npm run docs:build`；`node script/check-pages.mjs <站点地址> <截图目录> docs/ai/llm-architecture/ ...`。
- 逐页审查记录在 `.maintenance/content-audit/reviews/zzzzzzzzzzzzzzzz-llm-architecture.json`。
- 可下载工具：`public/ai/llm-architecture/tools/arch_calc.py`（第 18 篇，只用标准库，读 config 算参数、FLOPs、KV）。
