# 交付一个客户可用小工具

> 示例文件：`delivery_check.py`  
> 示例核验：2026-10-20（Python 3.14，语法下限为 3.10）

## 这篇解决什么问题

脚本能在开发电脑上跑，不代表客户知道怎么使用、怎么判断结果、遇到错误找谁。

本集产物是：**交付目录约定与只读结构检查器**。结构通过后，还要实际运行工具核对结果。

## 核心判断

交付包至少包括真实入口、最小样例和运行说明。将上一节 `cli_tool.py` 作为 `run.py`，放到 `delivery_package/`，旁边放示例 `customers.csv` 和 README；运行后生成 `outputs/`。不要把开发电脑的 `.venv` 直接塞进去，按说明在目标机重建环境。

![文件结构检查和真实运行验收是两个独立步骤](/python/delivery-validation-gates.svg)

README 应写清 Python 版本、本工具只用标准库、字段合同、参数、预期输出及退出失败的处理方式。版本说明记录规则变化，例如从“只查手机号”改成“手机号和城市都查”，因为结果数量变化首先可能来自规则，而不是数据。

## 运行示例

```bash
python3 delivery_check.py
```

检查器不会创建或改写被检查文件，缺少任何必需文件时退出码为 1；全部存在时为 0。文件存在还不证明内容正确，随后在新目录按 README 实际执行：

```bash
cd delivery_package
python3 run.py --input customers.csv --output outputs/missing.csv
```

使用三条样例时，手机号检查结果应只有韩梅梅。再测试缺列、空表、已有输出和错误路径，确认失败会明确报告，原输入不变。`outputs/` 可以由工具首次运行创建，不作为交付前必须存在的目录。

## 完整示例

### delivery_check.py

```python
from __future__ import annotations

from pathlib import Path

required = ["README.md", "customers.csv", "run.py"]
base = Path(__file__).parent / "delivery_package"


def main() -> int:
    print("交付包检查：")
    missing = []
    for item in required:
        exists = (base / item).is_file()
        print(f"- {item}: {'OK' if exists else '缺失'}")
        if not exists:
            missing.append(item)
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
```

## 继续学习

- [返回系列导读](./)
- [上一篇：参数配置：不改代码也能换文件](./23-argparse-config)
- [下一篇：什么时候该用类，把数据和动作放进同一个对象](./25-classes-and-objects)
