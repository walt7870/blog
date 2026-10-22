<script setup>
import PrecisionCanvas from '../../../.vitepress/theme/components/PrecisionCanvas.vue'
</script>

# 15. 混合精度：训练、推理与语音链路

上一页解释了格式的位段和范围。这一篇回答更容易被误用的问题：**到底哪些地方该用 FP32，哪些地方可以用 FP16、BF16 或 FP8？**

混合精度不是把模型整体转换成一种低位 dtype，而是让适合 Tensor Core 的算子使用低精度，让归约、归一化、概率和更新步骤保留足够的范围或累加精度。

## 训练和推理的目标不同

训练要保存梯度、优化器状态并持续更新参数，推理只需要前向计算和输出。一个常见的训练布局如下：

```text
权重主副本 / 优化器状态：FP32（常见做法）
        ↓
前向矩阵乘法、卷积：BF16 或 FP16
        ↓
归约、归一化、损失的敏感部分：FP32 或高精度累加
        ↓
反向梯度：按 AMP 规则计算，必要时做 loss scaling
```

推理时可以省掉梯度和优化器状态，但仍然要区分：权重 dtype、激活 dtype、累加 dtype、KV dtype 和最终输出 dtype。一个 BF16 模型可能在 FP32 中完成 `softmax`，一个 FP8 权重模型也可能用 BF16 激活和 FP32 累加。

下面用几种配置观察分工：切换权重与激活方案，再单独改变 KV。示例把归一化与矩阵累加保留在 FP32；实际算子使用的格式还要查看具体后端配置与执行记录。

<PrecisionCanvas mode="pipeline" />

## PyTorch AMP 做了什么

PyTorch 的 [`torch.amp`](https://docs.pytorch.org/docs/stable/amp.html) 中，`torch.autocast` 按设备和算子的规则选择 dtype：适合低精度的线性层和卷积可以走 FP16/BF16，部分敏感操作提升到 FP32。`GradScaler` 通过先放大 loss、反向后再还原梯度，减少 FP16 小梯度下溢；检测到非有限梯度时会跳过该次参数更新，并调整缩放因子。前向本身的范围溢出，还需要从模型和算子精度解决。

一个最小的 CUDA 训练片段如下。它说明的是职责边界，不是适用于所有模型的固定模板：

```python
import torch

model = model.cuda()
optimizer = torch.optim.AdamW(model.parameters(), lr=2e-4)
scaler = torch.amp.GradScaler("cuda")

for inputs, targets in loader:
    inputs, targets = inputs.cuda(), targets.cuda()
    optimizer.zero_grad(set_to_none=True)

    with torch.autocast("cuda", dtype=torch.float16):
        logits = model(inputs)
        loss = loss_fn(logits, targets)

    scaler.scale(loss).backward()
    scaler.step(optimizer)
    scaler.update()
```

如果使用 BF16，通常依靠它更大的指数范围，很多训练流程只需要 `autocast(..., dtype=torch.bfloat16)`，不必照搬 FP16 的 scaling；是否需要仍要看模型、硬件和损失实现。PyTorch 当前文档也提醒，部分以 BF16 范围预训练的模型放到 FP16 范围中可能溢出，`GradScaler` 不保证缩放因子始终大于 1。

## 推理服务要显式记录五种 dtype

排查“换精度后变快/变差”时，至少记录下面五项：

| 位置 | 例子 | 典型问题 |
| --- | --- | --- |
| checkpoint | BF16、FP8、INT4 | 文件和加载显存不等于执行显存 |
| 激活 | BF16、FP16、FP8 | 动态范围、异常值和 kernel 支持 |
| 累加 | FP32、FP16 | 长归约、点积和注意力误差 |
| KV cache | BF16、FP8、FP4 | 长上下文容量与读取转换成本 |
| 输出与后处理 | FP32 logits、float 音频 | 阈值、采样、解码和质量指标 |

例如 vLLM 当前文档把 `--kv-cache-dtype fp8` 单独作为 KV cache 能力；SGLang 也把 `fp8_e4m3`、`fp8_e5m2` 和实验性的 FP4 KV cache 分开列出。把权重设成 FP8 并不会自动把 KV cache、激活和所有后处理都变成 FP8。

## 语音模型要按阶段选精度

语音模型的链路通常比纯文本生成更长，适合的精度也不同：

| 阶段 | 常见候选 | 需要特别测什么 |
| --- | --- | --- |
| 特征提取、声学编码器 | FP16/BF16，部分算子 FP32 | RTF、短音频首包、极小能量输入 |
| CTC/RNN-T 或自回归解码 | BF16/FP16，logits/归约可 FP32 | CER/WER、重复、尾句和 beam 稳定性 |
| 说话人 embedding、相似度 | BF16 或 FP32 | 阈值附近分数、跨设备一致性 |
| 声学 token、扩散/Flow | 按模型和 kernel 选择 | 音质、步数、首个可播放块 |
| vocoder、波形后处理 | 常保留敏感算子 FP32 | 爆音、断裂、静音、块间连续性 |

因此“语音推理能否用低精度”的答案通常是可以，但要拆成编码器、生成器、解码器和声码器分别测。主干使用 BF16、池化或分类头保留 FP32 是常见的混合方案；如果把分类头也强行降到 BF16 后出现异常分数或浮点错误，优先回退局部，而不是立即否定整个低精度路径。

模型张量和音频采样也要分开记录：模型内部的 BF16 用于计算，WAV/PCM 的位深用于表示声音采样。输出保存成 16 位 PCM 还是浮点音频，由接口、动态范围和保存需求决定。

## 三个小实验比一句“更快”更可靠

在同一模型、输入集、采样参数和设备上，只改变一个 dtype，记录：

1. **数值实验**：抽取中间张量，统计最大绝对误差、相对误差、`NaN/Inf`，特别检查归一化、softmax、logits 和阈值比较。
2. **系统实验**：记录加载时间、峰值显存、首 token/首音频块延迟、稳态吞吐、实时率和长上下文容量。
3. **任务实验**：文本看准确率、结构化输出和长上下文；ASR 看 CER/WER、漏字和尾句；TTS 看音质、说话人相似度和块间连续性。

输出相同但质量集退化，说明不能上线；质量相同但 kernel 不支持，说明不能宣称加速；显存下降但首包变慢，说明反量化或数据搬运成了新瓶颈。

混合精度是在不同计算位置分配数值预算。训练还要照顾梯度与参数更新，推理更关注前向、状态和后处理；语音链路则需要逐段检查识别、音质与连续性。把数值误差、系统性能和任务质量一起测量，才能找到值得保留的配置。

下一篇[低位量化实践](./16-quantization-now.md)继续讨论 FP8、FP4、INT8、INT4 和 W4A16，看看这些表示怎样结合 scale 与专用算子进入部署。
