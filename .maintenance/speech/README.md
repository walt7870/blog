# 语音相关内容维护说明

## 分工

| 位置 | 内容 | 写法 |
| --- | --- | --- |
| `docs/basic/acoustics/`（声学与语音，01—22） | 声音与设备、前端处理、识别/说话人/合成原理与主流模型、sherpa-onnx 端侧部署、端侧 NPU 加速实战、交互链路、评估与选型 | 通用知识，按篇号顺序阅读 |
| `docs/ai/speech-engineering/`（流式语音技术实践，1—8） | 一条私有化会议转写服务的分段、角色、热词、调度、推理合同、回放验证、离线交付 | 项目实践；事实以项目记录为准，不在这里改写数字和结论 |
| `docs/ai/model-training/` 第 14—16 篇 | ASR、TTS 的训练与微调 | 由模型训练系列维护 |
| `docs/ai/llm-inference/19-speech-multimodal.md` | 语音模型推理与首音频时延 | 由推理系列维护 |
| `docs/ai/domains/speech.md` | 一页全貌 + 去哪里深入的路由表 | 保持短 |

机制讲在基础篇，实践篇只讲项目里的取舍并链接回基础篇（例如 TEN-VAD、说话人分离、目标说话人 ASR 的概念在 05、10 篇）。新增内容先判断属于哪一篇，不另起平行页面。

## 篇号

2026-10-28 重排。文件名没有改（避免旧地址失效），篇号只体现在侧边栏和页面标题。顺序：

- 一、声音与设备：01 sound-fundamentals、02 structure、03 capture-playback
- 二、前端处理：04 noise-reduction、05 vad/index、06 vad/silero-vad、07 wake-word
- 三、识别、说话人与合成：08 speech-recognition、09 asr-models（新）、10 speaker（新）、11 speech-synthesis
- 四、端侧部署：12 sherpa-onnx/index、13 recognition-modes、14 model-selection-deployment
- 五、端侧 NPU 加速：15 npu-asr/index、16 compression、17 operators、18 measurement、19 verdict
- 六、系统与工程：20 voice-interaction、21 quality-evaluation、22 engineering

2026-10-30 新增第五部分（`npu-asr/`），原 15—17 顺延为 20—22（文件名不变）。该子系列的事实清单、脱敏口径和刻意未写入的内容见 `npu-asr/facts.md`，图示生成脚本是 `npu-asr/diagrams-npu-asr.mjs`。

每篇结尾有“下一篇”链接，改顺序时同步改。`speech-engineering/release-and-collaboration.md`、`incident-playbook.md` 是合并后保留的指引页（`search: false`），不进侧边栏。

## 事实基线

- 模型、版本、许可证核对到 2026-10-28，来源记录在 `research/facts-*.md`（每行附一手来源）。标为 U 的条目没有在正文中使用，或已改成不含具体数字的写法。
- sherpa-onnx 基线 v2.0.1（2026-10-26）。官方热词文档仍写“只有 Transducer 支持”，源码中 Qwen3-ASR 有 `hotwords`、Fun-ASR-Nano 有提示词配置；正文按源码写并注明差异。
- 说话人分离的 DER 必须同时写清 collar 和是否计入重叠。

## 图示

- 原有声学图由 `.maintenance/content-audit/generate-acoustics-diagrams.mjs` 生成。
- 09、10 篇的新图由 `diagrams-speech.mjs` 生成（复用 `../llm-architecture/svg-kit.mjs`），输出到 `public/acoustics/`。
- 15—19 篇的图由 `npu-asr/diagrams-npu-asr.mjs` 生成，同样复用 svg-kit，另带按像素宽度的自动换行和跟随文本的自适应高度。
- 检查：`node .maintenance/llm-architecture/check-svg.mjs public/acoustics <png 目录> <文件名过滤>`，再看 PNG。不要手改 SVG。
