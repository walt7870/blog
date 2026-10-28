# 大模型推理优化系列维护记录

日期：2026-10-26，Asia/Shanghai。

## 位置与职责

正式内容在 `docs/ai/llm-inference/`：导读加 22 篇正文，分五部分（一次推理怎样发生、瓶颈原理、引擎核心技术、压缩与加速、规模化与工程）。侧边栏分组“大模型推理优化”位于 AI 侧边栏，替换了原“模型推理系列”分组；AI 总览卡片、`llm/inference.md`、`foundations/index.md`、`precision/index.md`、`precision/06-choosing-precision.md`、`speech-engineering/performance-and-capacity.md` 的入口都指向新系列。

原 `docs/ai/inference-series/` 的 13 篇和导读已整合进新系列，原地址保留为 `search: false` 的跳转页，列出对应的新文章；14—16 三个精度迁移页不变。原系列的交互组件（`InferenceLab`、`InferenceIntuition`、`InferenceFigure`、`SpeechRuntimeLab`）和 `public/ai/inference-series/` 下的 SVG、`measure_stream.py` 继续被新系列引用，不能删除。`InferenceStory`、`InferenceJourney` 只被原导读使用，现在没有页面引用。

## 内容来源

- 起点：微信文章“AIInfra推理优化(1)：LLM 推理基础”（https://mp.weixin.qq.com/s/kx5W0VQA9whEJML_gWp4AA）。它属于开源教程 AIInfraGuide（caomaolufei/AIInfraGuide）模块四。
- `research/aiinfraguide-digest.md`：模块四其余章节的研读摘要与逐条核对，原文以仓库为准，不在本目录保存副本。第 6—9 章只有大纲，分布式、P/D、压测、生产部署的内容改为依据论文、官方文档与源码。
- `research/facts.md`：GPU 规格、模型配置、量化格式、投机解码、引擎默认值、P/D 论文、指标定义、端侧设备的核对表，每项附来源 URL。
- `research/nano-vllm.md`：nano-vllm 提交 `bb823b3`（2026-04-26，版本 0.2.0）的逐文件源码笔记，第 13 篇的行号与代码摘录以此为准。
- 原 `inference-series` 的维护记录 `.maintenance/inference-series/README.md` 与已核验的资料（vLLM 0.32.0、SGLang 0.5.22 固定版本文档，sherpa-onnx v2.0.0 发布说明）。

公开正文按机制重写，不复制原文和资料搜集过程。

## 版本与数字口径

- 贯穿例子：Llama-3.1-8B（32 层、32 个注意力头、8 个 KV 头、每头 128 维，BF16 权重约 16.1 GB，每 token KV 128 KiB），NVIDIA H100 SXM（BF16 稠密 989 TFLOPS、3.35 TB/s、平衡点约 295 FLOP/Byte、实际可用约 79.6 GiB）。
- 引擎版本：vLLM 0.32.0（`gpu_memory_utilization` 默认 0.92；H100 上 API 服务的 `max_num_batched_tokens` 默认 8192、`max_num_seqs` 1024；V1 只有重算式抢占、无写时复制；CUDA Graph 默认 `FULL_AND_PIECEWISE`；投机解码按单链起草），SGLang 0.5.22（默认调度 `fcfs`，`lpm` 在等待队列超过 128 时退回 FCFS）。
- 第 18 篇的版本快照按 2026-10-26 查询的 GitHub 正式发布记录；更新快照时同步检查第 18、19 篇的版本说明。
- 已更正的常见说法：PagedAttention 论文的原话是现有系统 KV 有效利用率 20.4%—38.2%、vLLM 约 96%，“浪费低于 4%”出自博客；SGLang 默认不是 `lpm`；RTX 4090 的 330 TFLOPS 是 FP16 累加值，未在正文使用。
- 所有 Roofline、延迟、传输时间都是理论下界，正文已注明；第 20 篇的并发扫描图是示意，不是实测数据。

## 图示

新图由 `diagrams-a.mjs`、`diagrams-b.mjs`、`diagrams-c.mjs` 生成到 `public/ai/llm-inference/`，共用 `svg-kit.mjs` 的样式与绘图函数。修改图示要改生成脚本后重新运行，不手改 SVG。

```bash
node .maintenance/llm-inference/diagrams-a.mjs
node .maintenance/llm-inference/diagrams-b.mjs
node .maintenance/llm-inference/diagrams-c.mjs
node .maintenance/llm-inference/check-svg.mjs public/ai/llm-inference <png 输出目录>
```

`check-svg.mjs` 在 Chrome 中渲染每张图，报告节点文字越出方框或画布的情况，并输出 PNG 供人工查看。

## 验证入口

- `npm run docs:build` 全站构建。
- `node script/check-pages.mjs <站点地址> <截图目录> docs/ai/llm-inference/ ...`：1440 / 390、浅色 / 深色检查横向溢出、失效图片和报错。
- 逐页审查记录在 `.maintenance/content-audit/reviews/zzzzzzzzzzzzz-llm-inference.json`。

## 后续整合

- 2026-10-26：微信文章“AI基础-76：KV缓存”（https://mp.weixin.qq.com/s/3co5gF6fe-wkNyaLtT2sjQ）要点已被系列覆盖，只在第 03 篇补充复杂度口径、KV 属于请求而非会话、训练为何不用 KV Cache、缓解 KV 压力的五类做法。通用的整合流程见 `.maintenance/article-integration.md`。
- 2026-10-27：微信文章“AIInfra推理优化(2)：vLLM 快速入门”（https://mp.weixin.qq.com/s/DndkGLaqjlWbKc1Zjou9kg，AIInfraGuide 推理优化第 2 章）是上手教程，系列原本没有实操篇。新增 `docs/ai/llm-inference/vllm-quickstart.md`（不编号，侧边栏放在第 07 篇之后，避免改动已发布的章节编号和地址），覆盖原文全部小节，并按 vLLM 0.32.0 更正 Python/计算能力要求、默认值、OOM 调参方向、`--quantization awq` 误用、405B 卡数等，核对记录见 `research/facts.md` §11。启动流程图由 `diagrams-d.mjs` 生成。
