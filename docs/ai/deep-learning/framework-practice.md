<script setup>
import { withBase } from 'vitepress'
</script>

# 深度学习工程实践

深度学习框架负责张量计算、自动微分、硬件加速、模型组织和分布式训练。理解框架的目标不是记住 API，而是能把数据、模型、损失、优化和评估串成可复现流程。

## 训练程序的五部分

![训练、验证、保存与部署时的责任边界](/ai/ai-training-loop.svg)

```python
for inputs, targets in train_loader:
    optimizer.zero_grad()
    outputs = model(inputs)
    loss = criterion(outputs, targets)
    loss.backward()
    optimizer.step()
```

这段循环背后还需要：

1. 数据集读取、清洗和增强。
2. 模型结构与预训练权重。
3. 训练和验证模式切换。
4. 指标统计和日志。
5. 检查点保存、恢复和版本记录。

## 训练与验证模式

`model.train()` 和 `model.eval()` 会影响 Dropout、BatchNorm 等层。验证时还应关闭梯度记录，减少显存和计算：

```python
model.eval()
with torch.no_grad():
    for inputs, targets in valid_loader:
        outputs = model(inputs)
```

忘记切换模式会导致评估结果抖动或与线上推理不一致。

## 设备与数据形状

模型和输入必须在同一设备。排错时优先打印：

- Tensor shape。
- dtype。
- device。
- 数值最小值、最大值和缺失值。
- 标签范围与类别映射。

大量训练错误不是架构问题，而是维度顺序、数据类型或预处理不一致。

## 可运行的 CPU 训练示例

下载<a :href="withBase('/ai/examples/tiny-torch-classifier.py')" download>完整训练与重载脚本</a>。在 Python 3.12 环境执行：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install torch==2.14.1 numpy==2.5.4
python tiny-torch-classifier.py --checkpoint tiny-classifier.pt
```

脚本只使用 CPU，不下载模型或数据。它用 16 个二维网格点学习 `x1+0.5*x2>0`，另用坐标不重叠的 16 点验证。核心计算是：

```python
model = torch.nn.Linear(2, 1)
criterion = torch.nn.BCEWithLogitsLoss()
optimizer = torch.optim.SGD(model.parameters(), lr=0.1)
# train_x: float32 [16,2]；train_y: float32 [16,1]，值为0或1。
optimizer.zero_grad(set_to_none=True)
logits = model(train_x)
loss = criterion(logits, train_y)
loss.backward()
optimizer.step()
```

训练阶段把 logits 交给损失函数，推理阶段才做 Sigmoid。完整脚本检查损失下降、梯度有限、保存前后输出完全一致，并拒绝空输入、错列数和 NaN。它把特征顺序、阈值和 schema 版本与 `state_dict` 一起保存，避免只保留权重却丢掉输入合同。

在 Python 3.12.14、PyTorch 2.14.1 的 CPU 环境中，初始损失约 0.788171，300 次更新后约 0.097969；合成验证集准确率为 `15/16=93.75%`，重载输出一致。跨环境可能出现数值差异，优先检查不变量和错误输入是否被拒绝，而不是逐位比较这段日志。

这是计算链路练习，不是业务效果证明。数据由已知线性规则生成，验证集与训练集来自同一种构造，也没有独立测试集；不能据此证明真实风控或客服任务达到某个准确率。实际项目应增加独立测试、类别与时间切片及错误分析。

## 迁移学习

数据量有限时，可从与输入和任务相近的预训练模型开始。先核对预处理与输出含义，替换任务头并冻结主干参数，再训练新头；链路正确后，按验证效果解冻部分层。冻结梯度并不自动冻结 BatchNorm 的运行统计量，训练模式也需要按计划控制。

优化器应包含计划更新的参数；解冻后要检查参数是否进入优化器。全部参数一开始就用较大学习率微调，可能破坏预训练表示。冻结、解冻和学习率配置都应进入实验记录，而不是只保存最后一份权重。

## 实验可复现

至少记录：

- 代码提交版本。
- 数据集和切分版本。
- 模型结构与预训练权重。
- 随机种子和超参数。
- 软件环境与硬件。
- 训练曲线、最终指标和检查点。

随机种子不能消除所有硬件非确定性，但能减少无意义差异。

## 性能优化顺序

1. 先用 Profiler 找到数据加载、计算还是通信瓶颈。
2. 调整 Batch 和数据加载并发。
3. 在硬件与算子支持时评估混合精度，核对溢出、精度和实际吞吐变化。
4. 单卡稳定后再做多卡并行。
5. 部署前评估量化、编译和模型导出。

不要在训练逻辑尚未验证时先做复杂分布式优化。

## 从训练到部署

模型文件只是部署的一部分。生产推理还需要固定：

- 输入 schema 和预处理版本。
- 模型权重与运行时版本。
- 输出后处理和阈值。
- 并发、Batch、超时和资源限制。
- 监控指标和回滚版本。

训练和推理使用不同的图片缩放、文本分词或类别映射，是常见的线上错误来源。

## 最小实践建议

选择一个公开小数据集，完成下面的闭环：

1. 建立简单基线。
2. 训练一个小网络。
3. 绘制训练和验证曲线。
4. 保存并重新加载模型。
5. 写一个独立推理脚本。
6. 分析至少 20 个错误样本。
7. 记录一次模型或参数调整前后的对比。

完成这个闭环，比只运行大型模型示例更能建立深度学习工程能力。
