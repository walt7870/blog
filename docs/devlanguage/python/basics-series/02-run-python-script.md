# 安装、运行和脚本文件：客户电脑上怎样确认 Python 能跑起来

> 示例文件：`hello_customer.py`  
> 示例核验：2026-10-20（Python 3.14，语法下限为 3.10）

这篇文章解决一个非常实际的问题：拿到 Python 脚本之后，怎样确认它能在客户电脑上运行。

很多运行失败不是代码逻辑错，而是 Python 命令找不到、终端位置不对、脚本文件名写错、数据文件不在脚本旁边。

## 核心判断

运行脚本之前先确认三件事：

```text
电脑能找到 Python
终端站在正确文件夹
脚本文件和数据文件放在预期位置
```

这三件事确认后，脚本才有资格进入业务规则调试。

## 先确认 Python 入口

macOS 或 Linux 常见命令：

```bash
python3 --version
```

Windows 常见命令：

```powershell
py --version
python --version
```

只要能输出版本号，就说明系统能启动 Python。命令不存在时，先处理安装或环境路径，不要急着改脚本。

## 再确认当前目录

终端总是站在某个文件夹里。macOS 或 Linux 可以输入：

```bash
pwd
```

Windows 可以输入：

```powershell
Get-Location
```

Windows 命令提示符（cmd）用 `cd`，PowerShell 用 `Get-Location` 查看当前目录。

很多“找不到文件”的问题，不是文件真的不存在，而是终端没有进入脚本所在目录。

![解释器、工作目录与脚本目录的区别](/python/script-path-boundaries.svg)

`Path("customers.csv")` 相对终端工作目录解析；`Path(__file__).resolve().parent / "customers.csv"` 相对脚本目录解析。比如在 `/tmp` 执行 `/work/tool/hello_customer.py`，前者寻找 `/tmp/customers.csv`，后者寻找 `/work/tool/customers.csv`。本课选择后者，因此运行入口可以变化，数据仍在脚本旁边。

## 运行本集示例

```bash
python3 hello_customer.py
```

预期输出会包含：

- Python 版本。
- 解释器路径。
- 脚本所在目录。
- `customers.csv` 是否存在。

## 完整代码

```python
from __future__ import annotations

import platform
import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "customers.csv"


def main() -> None:
    print("Python 客户教程运行检查")
    print(f"- Python 版本：{platform.python_version()}")
    print(f"- 解释器路径：{sys.executable}")
    print(f"- 脚本所在目录：{BASE_DIR}")
    print(f"- 终端工作目录：{Path.cwd()}")
    print(f"- 客户表是否存在：{'是' if DATA_FILE.is_file() else '否'}")

    if DATA_FILE.is_file():
        print(f"- 客户表示例文件：{DATA_FILE.name}")


if __name__ == "__main__":
    main()
```

## 修改成自己的场景

1. 把 `DATA_FILE` 改成自己的输入文件名。
2. 把脚本和数据文件放进同一个项目文件夹。
3. 在说明文档里写清楚先 `cd` 到哪个目录。
4. 让脚本输出当前目录和数据文件状态，方便客户截图反馈。

## 常见错误

| 现象 | 可能原因 | 处理 |
| --- | --- | --- |
| `command not found: python3` | Python 命令不可用 | 换用 `python`/`py` 或检查安装 |
| `can't open file` | 脚本文件名或目录不对 | 进入脚本所在目录，检查文件名 |
| `No such file or directory` | 数据文件路径不对 | 把数据放到预期目录，或改脚本路径 |
| 输出目录很奇怪 | 终端当前目录不符合预期 | 先运行 `pwd` 或 `cd` 确认 |

## 读完之后能完成什么

你应该能做到：

- 用命令确认 Python 是否可用。
- 进入脚本所在目录。
- 运行一个 `.py` 文件。
- 从输出判断路径和数据文件是否正常。


## 继续学习

- [返回系列导读](./)
- [上一篇：把客户名单变成可检查的数据](./01-customer-list-data-cleaning)
- [下一篇：变量和类型怎么服务业务字段](./03-field-types)
