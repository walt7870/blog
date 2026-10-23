---
search: false
---

# 数值格式学习入口

FP32、FP16、BF16 的详细说明已整理为独立的[模型数值精度](../precision/)专题，从一个数怎样保存开始，依次解释范围、刻度、误差、混合精度和量化。

<span id="32-位和-16-位-差在哪里"></span>
<span id="浮点数由三段组成"></span>

- 初次学习：[01. 数字怎样存进计算机](../precision/01-number-storage.md)。
- 比较三种常见格式：[02. FP32、FP16 与 BF16](../precision/02-floating-formats.md)。

<span id="同一个小数-会落在哪个刻度"></span>

- 操作原有的舍入实验：[03. 舍入、溢出与计算误差](../precision/03-rounding-errors.md)。

<span id="为什么-bf16-经常用于训练和推理"></span>

- 理解计算位置的分工：[04. 混合精度怎样计算](../precision/04-mixed-precision.md)。

<span id="fp8、fp4-还需要-scale"></span>

- 继续了解低位格式：[05. FP8、FP4 与整数量化](../precision/05-quantization.md)。
