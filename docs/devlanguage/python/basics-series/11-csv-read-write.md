# 读写 CSV 文件

> 示例文件：`csv_cleaning.py`  
> 最后核验：2026-08-02

本文围绕“怎样从真实表格文件读取和输出”展开，结合可运行示例说明输入、规则、输出和改造边界。

## 这篇解决什么问题

客户发来的 CSV 需要被脚本读取，检查后还要输出一份待补信息名单。

本集产物是：**清洗后 CSV**。

## 核心判断

- `csv` 要服务于真实客户数据处理。
- `路径` 要服务于真实客户数据处理。
- `编码` 要服务于真实客户数据处理。
- `表头` 要服务于真实客户数据处理。
- `写入文件` 要服务于真实客户数据处理。

判断是否学会，不看能不能背概念，而看能不能运行脚本并得到可复查输出。

## 运行示例

```bash
python3 csv_cleaning.py
```

运行后检查三件事：

- 输入数据是否符合本集假设。
- 规则输出是否能解释。
- 文件或终端结果是否方便客户复核。

## 完整示例

### csv_cleaning.py

```python
from __future__ import annotations

import csv
from pathlib import Path

base = Path(__file__).parent
input_file = base / "customers.csv"
output_file = base / "missing_customers.csv"


def main() -> None:
    with input_file.open("r", encoding="utf-8", newline="") as file:
        rows = list(csv.DictReader(file))

    missing = [row for row in rows if not row["phone"] or not row["city"]]

    with output_file.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=["name", "missing"])
        writer.writeheader()
        for row in missing:
            fields = []
            if not row["phone"]:
                fields.append("phone")
            if not row["city"]:
                fields.append("city")
            writer.writerow({"name": row["name"], "missing": "|".join(fields)})

    print(f"已输出：{output_file.name}，{len(missing)} 行")


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
- [上一篇：模块：把脚本拆成几份文件](./10-modules-split-script)
- [下一篇：JSON：系统接口常见的数据形态](./12-json-api-shape)
