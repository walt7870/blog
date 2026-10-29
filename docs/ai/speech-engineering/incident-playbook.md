---
search: false
---

# 语音故障的技术定位

技术内容已按实现机制归入以下页面：

- [音频回放与质量回归](./evidence-driven-validation)：PCM 完整性、模型输入与协议输出对照。
- [角色证据与目标说话人识别](./pipeline-boundaries)：极短子段、跨窗口身份和目标输入。
- [断句、收尾与逐句时延](./latency-and-finalization)：尾帧、预计算与 EOF 竞争。
- [动态批处理与推理调度](./performance-and-capacity)：排队、截止时间和负载保护。
