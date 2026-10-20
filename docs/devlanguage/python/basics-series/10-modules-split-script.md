# 模块：把脚本拆成几份文件

> 示例文件：`checks.py`、`report.py`、`main.py`  
> 示例核验：2026-10-20（Python 3.14，语法下限为 3.10）

## 这篇解决什么问题

一个脚本里同时放读取、检查、统计和输出，后续改规则时很容易牵动无关代码。

本集产物是：**checks.py 和 report.py**。

## 核心判断

入口 `main.py` 组织读取、筛选和展示；`checks.py` 只返回规则结果；`report.py` 负责显示。依赖从入口指向两个模块，规则模块不反过来导入入口，避免循环导入。三份文件在同一目录，本例运行时 Python 会把脚本目录加入模块搜索路径。

![main分别依赖规则与输出模块，规则模块不依赖入口](/python/module-dependency.svg)

导入模块会执行其顶层语句。`if __name__ == "__main__":` 确保只有直接运行入口时才调用 `main()`，导入用于复用时不会自动生成报表。不要把文件命名为 `csv.py`、`json.py`，否则可能遮住标准库同名模块。

## 运行示例

```bash
python3 main.py
```

把三个片段分别放入对应文件后运行，预期只列出韩梅梅。再执行 `python3 -c "import main"`，应没有业务输出；若导入就开始处理，检查入口守卫与顶层文件写入。

## 完整示例

### checks.py

```python
from __future__ import annotations


def missing_phone(customer: dict) -> bool:
    return not customer.get("phone")
```

### report.py

```python
from __future__ import annotations


def print_missing(customers: list[dict]) -> None:
    print("待补手机号：")
    for customer in customers:
        print(f"- {customer['name']}")
```

### main.py

```python
from __future__ import annotations

from checks import missing_phone
from report import print_missing

customers = [
    {"name": "李雷", "phone": "13800000001"},
    {"name": "韩梅梅", "phone": ""},
]


def main() -> None:
    missing = [customer for customer in customers if missing_phone(customer)]
    print_missing(missing)


if __name__ == "__main__":
    main()
```

## 继续学习

- [返回系列导读](./)
- [上一篇：函数：把重复规则变成可复用步骤](./09-functions-reusable-rules)
- [下一篇：读写 CSV 文件](./11-csv-read-write)
