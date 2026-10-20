# 虚拟环境和依赖

> 示例文件：`env_check.py`  
> 示例核验：2026-10-20（Python 3.14，语法下限为 3.10）

## 这篇解决什么问题

开发电脑能运行，客户电脑提示找不到库，往往是环境和依赖没有被固定。

本集产物是：**独立运行环境**。

## 核心判断

虚拟环境为项目提供独立的 Python 包目录，防止两个工具需要不同版本时互相影响；它不是容器，不会固定操作系统、系统动态库或驱动。`python -m pip` 明确使用该解释器对应的 pip，比单独敲 `pip` 更不容易装到别处。

![系统解释器创建项目环境，安装与运行使用同一解释器](/python/venv-interpreter-contract.svg)

本基础系列的示例只使用标准库，Python 3.10 或更高版本即可运行，不需要安装 `csv`、`json`、`logging`。使用第三方包时，记录经过验证的版本和 Python 版本，在新环境重新安装验证；仅复制 `.venv` 目录通常不能跨电脑复用。

macOS/Linux 在项目目录执行：

```bash
python3 -m venv .venv
.venv/bin/python -m pip --version
.venv/bin/python env_check.py
```

Windows PowerShell 对应执行：

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip --version
.\.venv\Scripts\python.exe env_check.py
```

不激活也能直接运行环境内解释器。项目已有第三方依赖清单时，再执行环境解释器的 `-m pip install -r requirements.txt`。`pip freeze` 可记录当前环境已装版本，但不是跨平台依赖求解器，也不保证所有下载工件长期可用。

## 运行示例

```bash
python3 env_check.py
```

检查输出的解释器路径位于当前项目 `.venv` 中，`sys.prefix != sys.base_prefix` 为 `True`。依赖文件存在只说明有文件，不代表包已安装；还应实际启动工具。标准库项目没有 `requirements.txt` 可以正常运行，应在 README 写明无需第三方包。

## 完整示例

### env_check.py

```python
from __future__ import annotations

import sys
from pathlib import Path


def main() -> None:
    print(f"Python 版本：{sys.version.split()[0]}")
    print(f"解释器路径：{sys.executable}")
    print(f"是否虚拟环境：{sys.prefix != sys.base_prefix}")
    print(f"requirements 是否存在：{Path(__file__).with_name('requirements.txt').exists()}")


if __name__ == "__main__":
    main()
```

## 继续学习

- [返回系列导读](./)
- [上一篇：生成日报：把多个结果合成一个输出](./16-daily-report)
- [下一篇：常见报错怎么读](./18-read-traceback)
