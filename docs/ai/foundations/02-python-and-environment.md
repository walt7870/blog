<script setup>
import { withBase } from 'vitepress'
</script>

# 02. 准备运行第一个实验

上一篇已经把模型缩小成 `w × 重量 + b`。现在需要一个地方执行这个计算，并看到修改参数后的输出。本篇只补运行前八篇实验所需的 Python 和终端知识，不要求先掌握完整编程语言。

Python 是本系列用来表达计算步骤的编程语言。**脚本**就是把这些步骤保存成一个 `.py` 文件；**解释器**是读取并执行它的程序。可以把脚本想成食谱，解释器是照着食谱操作的人。

前八篇只使用 Python 自带的工具，合称**标准库**，不需要另外安装处理模型的软件包。电脑的通用处理器 CPU 就能完成这些小计算；用于并行加速的 GPU 显卡在这里用不上。下面采用 Python 3.12，macOS 或 Linux 可使用“终端”应用输入命令，Windows 可打开 PowerShell。它们提供文字操作窗口；窗口里负责理解命令的程序通常称为 shell。

## 确认运行的是哪个解释器

在终端执行 `python3.12 --version`，应看到 `Python 3.12.x`。如果系统提示找不到命令，先从 [Python 官方下载入口](https://www.python.org/downloads/) 或操作系统的软件管理工具准备 Python 3.12，再重新打开终端。若平时使用 `python3`，可先执行 `python3 --version`；显示 3.12 时，下方的 `python3.12` 也可以换成 `python3`。

**目录**就是文件夹。终端每一刻都位于某个“当前目录”；只写文件名时，程序通常从这里寻找文件。在下面的命令中，`mkdir -p` 创建文件夹，`cd` 进入它，`python3.12 -m venv` 再创建一套本实验专用的 Python 环境：

```bash
mkdir -p ai-foundations
cd ai-foundations
python3.12 -m venv .venv
source .venv/bin/activate
python --version
```

`.venv` 这个文件夹就是**虚拟环境**。可以把它看成项目自己的工具箱，今后安装的软件包放在这里，便于和其他项目分开。`source` 那行是激活工具箱，让当前窗口中的 `python` 使用这里的解释器；最后一行应显示 `Python 3.12.x`。新开终端时需要重新进入目录并激活。若不确定用的是谁，可以执行 `python -c "import sys; print(sys.executable)"` 查看实际路径。

<details>
<summary>Windows PowerShell 对应命令</summary>

在已安装 Python 的 PowerShell 中执行：

```powershell
mkdir ai-foundations
cd ai-foundations
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe --version
```

后续命令中的 `python` 可以替换成 `.\.venv\Scripts\python.exe`，无需为激活脚本修改系统策略。本文完整实测范围为 macOS/Python 3.12，Windows 命令用于说明等价入口。

</details>

## 读懂后续代码的几个对象

激活环境后执行 `python` 进入交互解释器，逐行输入：

```python
w = 2.0
b = 1.0
weight = 2.5
prediction = w * weight + b
print(prediction)
```

输出应为 `6.0`。**变量**像贴着名字的储物格，`w = 2.0` 表示把数值 2.0 存到名为 `w` 的格子里；这里的 `=` 是赋值。`*` 是乘法，`print` 把值显示出来。修改 `w` 不会自动重算已经保存的 `prediction`，需要重新执行计算语句。训练时同样如此：每轮都要用新的参数重新计算预测。

多条样本可放进列表，通过循环逐条处理：

```python
samples = [(1.0, 3.0), (2.0, 5.0), (3.0, 7.0)]
for x, target in samples:
    prediction = w * x + b
    print(x, prediction, target)
```

方括号里的有序集合称为**列表**；这里每对圆括号把一个重量和一个目标绑在一起，称为元组。`for x, target in samples` 每次取出一对数，依次放入 `x` 和 `target`，执行缩进的两行，再取下一对。这就是**循环**，省去了手写三遍相同计算。复制时不要把缩进删除。

如果同一套计算还要在许多地方使用，可以给它起名，形成**函数**：

```python
def predict(x, w, b):
    return w * x + b

print(predict(2.5, 2.0, 1.0))
```

`def` 定义名为 `predict` 的函数，括号列出要交给它的三个数；`return` 把算出的结果交回调用处。`predict(2.5, 2.0, 1.0)` 就是交入这三个数并取得结果。

离开交互解释器可执行 `exit()`。命令行中的 `python 文件名.py` 是运行一个保存好的程序，与在 `>>>` 提示符里输入代码不同。

## 跑通下载与输出位置

下载<a :href="withBase('/ai/foundations/labs/train_regression.py')" download>回归训练脚本</a>到 `ai-foundations`，在该目录执行：

```bash
python train_regression.py --steps 1 --output first-step.json
```

`--steps 1` 告诉脚本只更新一次参数，`--output` 后面是保存结果的文件名。这些跟在命令后面的选项称为**命令行参数**，用于控制这次怎样运行，与模型里的 `w,b` 属于不同用途。

终端应输出含 `initial_loss`、`final_loss` 和 `output` 的一行结果，分别记录开始时的错误得分、结束时的错误得分和输出位置，目录中出现 `first-step.json`。JSON 是一种用“名称：值”保存数据的文本格式，用文本编辑器就能打开。现在先认出这些输出；损失如何计算到第 06 篇再解释。脚本按明确给出的路径写文件，同名输出会覆盖；想保留不同实验，应使用不同文件名。

如果提示找不到脚本，先检查当前目录与文件名；如果出现 `SyntaxError`，先确认下载的是 `.py` 源码，而不是网页 HTML。安装成功只证明环境准备好，能运行并核对输出才完成这个练习。

已经能够确定解释器、运行脚本、修改变量和查看输出。这里只使用了数值、列表、函数与循环；完整语法按需阅读 [Python 基础](../../devlanguage/python/)。下一篇先明确程序读到的每条记录究竟表示什么：[03. 把问题变成样本](./03-data-task-and-split.md)。
