# 参数配置：不改代码也能换文件

> 示例文件：`cli_tool.py`  
> 最后核验：2026-08-02

本文围绕“同事怎样指定输入文件和输出目录”展开，结合可运行示例说明输入、规则、输出和改造边界。

## 这篇解决什么问题

客户每次换文件都要打开代码改路径，既危险又容易改坏脚本。

本集产物是：**命令行参数版脚本**。

## 核心判断

- `argparse` 要服务于真实客户数据处理。
- `输入路径` 要服务于真实客户数据处理。
- `输出路径` 要服务于真实客户数据处理。
- `默认值` 要服务于真实客户数据处理。

判断是否学会，不看能不能背概念，而看能不能运行脚本并得到可复查输出。

## 运行示例

```bash
python3 cli_tool.py
```

运行后检查三件事：

- 输入数据是否符合本集假设。
- 规则输出是否能解释。
- 文件或终端结果是否方便客户复核。

## 完整示例

### cli_tool.py

```python
from __future__ import annotations

import argparse
import csv
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="检查客户手机号")
    parser.add_argument("--input", default="customers.csv", help="输入 CSV 文件")
    parser.add_argument("--output", default="missing.csv", help="输出 CSV 文件")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    base = Path(__file__).parent
    input_file = base / args.input
    output_file = base / args.output

    with input_file.open("r", encoding="utf-8", newline="") as file:
        rows = list(csv.DictReader(file))

    missing = [row for row in rows if not row["phone"]]

    with output_file.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=["name"])
        writer.writeheader()
        writer.writerows({"name": row["name"]} for row in missing)

    print(f"已输出：{output_file.name}")


if __name__ == "__main__":
    main()
```

## 修改成自己的场景

1. 先替换样例数据，不急着改规则。
2. 确认字段名和客户真实表头一致。
3. 一次只改一条规则，运行后看输出。
4. 把异常、空值或跳过记录写清楚。
5. 如果要交给同事运行，把命令和预期输出写进 README。

## 常见误区

| 误区 | 后果 | 修正 |
| --- | --- | --- |
| 只追求脚本能跑 | 输出不可复查 | 同时输出数量、名单或文件路径 |
| 直接套用字段名 | 客户表头不一致时报错 | 先做字段说明或字段映射 |
| 把坏数据静默跳过 | 结果看似正常但漏处理 | 坏数据要记录原因 |
| 一次改很多规则 | 出错后难定位 | 每次只改一个规则点 |

## 读完之后能完成什么

你应该能运行本集示例，并把它改成自己的客户名单、订单表、日报或文件处理场景。


## 继续学习

- [返回系列导读](./)
- [上一篇：批量文件自动化](./22-batch-files)
- [下一篇：交付一个客户可用小工具](./24-delivery-package)
