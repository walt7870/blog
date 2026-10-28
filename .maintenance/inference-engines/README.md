# 推理引擎与框架系列维护记录

日期：2026-10-28，Asia/Shanghai。

## 位置与职责

正式内容在 `docs/ai/inference-engines/`：导读加 9 篇，按框架组织。数据中心引擎 01 vLLM、02 SGLang、03 TensorRT-LLM、04 LMDeploy；本地与端侧 05 llama.cpp、06 Ollama、07 MLX-LM 与端侧框架；08 分布式编排与 KV 缓存组件；09 整体对比与选型。侧边栏分组“推理引擎与框架”紧跟“大模型推理优化”，按三组嵌套。

分工：机制原理在 `docs/ai/llm-inference/`（本系列只链接，不重讲）；vLLM 的安装、离线推理与显存报错排查在 `llm-inference/vllm-quickstart.md`；`llm-inference/18-vllm-sglang.md` 保留为概览并链接本系列。入口：AI 总览卡片、`learning-path.md` 第六阶段、推理系列导读第 18 篇一行、第 18 篇开头与结尾、vLLM 实践篇小结。

写作简报见 `brief.md`；各篇核对记录（源码路径与行号、发布页、实测输出）见 `research/facts-*.md`。

## 版本基线（2026-10-28 查询 GitHub 正式发布）

vLLM 0.32.0、SGLang 0.5.22、TensorRT-LLM 1.2.1（之后只有预发布）、LMDeploy 0.18.0、llama.cpp 0.7.0、Ollama 0.40.12、MLX-LM 0.32.2、Dynamo 1.6.1、llm-d 1.0.0、AIBrix 0.8.0、LMCache 0.5.6、Mooncake 0.3.13.post1。源码按对应标签浅克隆在会话 scratchpad 中核对，未入库。更新版本时同步第 09 篇与推理系列第 18 篇的版本表。

## 实测与未实测

- llama.cpp 0.7.0、Ollama 0.40.12、MLX-LM 0.32.2 在 Apple M4（24 GB）上用 Qwen3-0.6B 实际运行；测试期间机器负载很高，吞吐数字只作定性参考，正文已注明。
- vLLM、SGLang、TensorRT-LLM、LMDeploy、Dynamo、llm-d 等未在 GPU 上运行，命令与默认值按固定版本源码和文档核对，正文已注明。

## 写作过程中对已有页面的更正

- `vllm-quickstart.md`：预编译包为 CUDA 13.0（12.9 为 `-cu129` 变体）；不指定 `--host` 时监听所有网卡；GGUF、bitsandbytes 需单独插件。
- `18-vllm-sglang.md`：SGLang 安装改为 `uv pip install --prerelease=allow`、需 CUDA 13，默认监听 `127.0.0.1:30000`，重叠调度下树形草稿受限；TensorRT-LLM 定位按 1.0 后的实际边界重写；llama.cpp 语义化版本自 2026 年 8 月起；Ollama 0.40.12。

## 图示

生成脚本 `diagrams-vllm.mjs`、`diagrams-sglang.mjs`、`diagrams-trtllm.mjs`、`diagrams-local.mjs`、`diagrams-lmdeploy-mlx.mjs`、`diagrams-orchestration.mjs`、`diagrams-overview.mjs`，共用 `svg-kit.mjs`，输出到 `public/ai/inference-engines/`。改图改脚本后重跑，不手改 SVG；`check-svg.mjs` 检查文字越框并导出 PNG 人工查看。

## 验证入口

`npm run docs:build`；`node script/check-pages.mjs <站点地址> <截图目录> docs/ai/inference-engines/ ...`；逐页审查记录在 `.maintenance/content-audit/reviews/zzzzzzzzzzzzzzz-inference-engines.json`。
