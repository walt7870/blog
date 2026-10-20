# 模型推理系列维护记录

日期：2026-10-20，Asia/Shanghai。

## 位置与职责

正式内容位于 `docs/ai/inference-series/`，包含导读与 13 篇正文；入口属于 AI 公共侧边栏。旧推理页继续可访问，补充双向导读；语音实践页链接通用机制与实验。没有新增顶栏类别。

交互组件均局部引入，不改变全局主题注册。`InferenceLab.vue` 保留七种实验：请求生命周期、计算/搬运下界、显存预算、前缀整页匹配、批处理、greedy 推测验证、语音首音频路径。`InferenceIntuition.vue` 补充职责点选、三档工作台预算、有无便笺的 K/V 位置对照；`InferenceJourney.vue` 提供四阶段路径。均为本地教学计算，不调用真实模型，不把模拟数字声明为 GPU 测量。

基础五张独立 SVG 由 `generate-diagrams.mjs` 生成，分别表达职责分层、成功请求时序、分页映射、P/D 状态交接、语音与打断路径。`generate-intuition.mjs` 补充 16 张机制/直觉图及其中 8 张的手机排版，表达数量、先后与共享关系。沿用现有 AI 图示配色和系统中文字体，含 title/desc；修改 SVG 应修改生成源稿后重跑。`InferenceFigure.vue` 通过 picture/source 在手机选择 480px 画布版本，避免把横向图简单缩成不可读小字。

## 阅读结构修订

本轮反馈指出：逐篇缺少总括、学习顺序不够渐进，前几篇过早堆术语和文字。修订以“小林问年假怎么申请”为同一主线，按现象 → 请求 → 资源 → 状态 → 调度 → 执行优化 → 引擎 → 工程展开。13 篇均有本篇导读、本篇回顾与下一问。前五篇重排正文，公式、分类与特殊边界按需要放展开区；后八篇补足承接和案例，把机制图或实验移到前面。语音篇先走听、答、说链路，再展开架构分类。

桌面和手机共用同一事实模型，不按屏幕删掉关键关系；教学词块、等时隙、手动预算和类比边界明确标注。位置数统计不冒充 FLOP，分块不冒充工作量减少，精度刻度不冒充所有浮点格式。

## 内容依据与版本边界

沿用本次学习任务已核验的原始记录：

- `/Users/waltniu/Documents/项目/个人学习/模型推理学习资料/模型推理全景学习指南.md`
- 同目录 `sources/releases-2026-10-20.json` 保存 GitHub Releases 原始记录、完整 release body 及 TensorRT-LLM RC。
- `vllm-prefix.json`、`vllm-v1.json`、`vllm-optimization.json`、`vllm-quickstart.json`：固定 v0.32.0 文档。
- `sglang-hicache.json`、`sglang-eviction.json`、`sglang-quickstart.json`：固定 v0.5.22 文档。
- `papers.json`、`speculative-paper.json`：PagedAttention、SGLang、FlashAttention 与精确 speculative sampling 原理。
- `tensorrt-architecture.json`、`llama-readme.json`、`tgi-maintenance.json`：架构、本地运行与维护状态。

微信起点是 `https://mp.weixin.qq.com/s/pEC8Oz1OCo2eAVsUAD0f3w` 和 `https://mp.weixin.qq.com/s/4UaO6mhgYDfhtLs7OjORmA`。前者来自浏览器可见文字，未把插图当作已逐项 OCR；后者有完整提取文字。公开正文按机制重写，不复制资料搜集记录或参考列表。

官方原理入口：

- https://arxiv.org/abs/2309.06180
- https://arxiv.org/abs/2312.07104
- https://arxiv.org/abs/2205.14135
- https://proceedings.mlr.press/v202/leviathan23a.html

固定版本实现入口：

- https://github.com/vllm-project/vllm/blob/v0.32.0/docs/design/prefix_caching.md
- https://github.com/vllm-project/vllm/releases/tag/v0.32.0
- https://github.com/sgl-project/sglang/releases/tag/v0.5.22
- https://github.com/sgl-project/sglang/blob/v0.5.22/docs/docs/advanced_features/hicache_design.mdx
- https://github.com/sgl-project/sglang/blob/v0.5.22/docs/docs/advanced_features/radix_eviction_policy.mdx

避免误读：V1 ≠ MRV2；完整页命中 ≠ 任意相似文本复用；FlashAttention 不把常规稠密注意力计算降为线性；HiCache ≠ HiSparse；INT4 不保证四倍加速；Mac 后端不等于 NVIDIA 功能等价；正式 release ≠ RC。

版本快照按 Shanghai 时间，TensorRT-LLM 1.2.1 是当时 latest 正式记录，1.4.0rc0 为预发布。性能数字严格保留 GPU、模型、负载与指标条件，以及 FP8 KV 的 TTFT 代价。

## 验证入口

- `node .maintenance/inference-series/check-math.mjs` 验证教学模型的显存值、页边界、调度工作守恒与拒绝后提交。
- 使用 Node 24 构建全站；浏览器检查真实桌面/手机尺寸、浅深主题、交互与 SVG。
- 构建后重启 preview 再检查，避免运行中的 preview 保留上一轮 metadata 映射，导致新 HTML 与旧映射组合。
- `build-review.mjs` 是工作区其他前端专题修改期间的临时排除构建，只用于独立验收，不能发布或声称全站通过；输出与临时目录局部忽略。最终已回到 `npm run docs:build` 全站构建和正式 preview 验证，`serve-review.py` 备用服务未启动。
- `measure_stream.py` 是用户可下载的标准库闭环客户端；fixture 验证不等于实际 GPU 跑分。
- 本任务没有安装推理引擎、下载权重、运行 GPU 或付费推理，没有提交、推送或部署。

实际执行结果另见 `validation.md`。
