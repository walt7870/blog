# Excel/表格实战入口

> 示例文件：`table_health_check.py`  
> 最后核验：2026-08-02

本文围绕“客户交来的 xlsx/csv 应该先检查什么”展开，结合可运行示例说明输入、规则、输出和改造边界。

## 这篇解决什么问题

客户交来的表头可能叫“手机号”“电话”或“mobile”，脚本必须先判断数据是否可用。

本集产物是：**数据体检报告**。

## 核心判断

- `表头` 要服务于真实客户数据处理。
- `空值` 要服务于真实客户数据处理。
- `重复行` 要服务于真实客户数据处理。
- `字段映射` 要服务于真实客户数据处理。

判断是否学会，不看能不能背概念，而看能不能运行脚本并得到可复查输出。

## 运行示例

```bash
python3 table_health_check.py
```

运行后检查三件事：

- 输入数据是否符合本集假设。
- 规则输出是否能解释。
- 文件或终端结果是否方便客户复核。

## 完整示例

### table_health_check.py

```python
from __future__ import annotations

rows = [
    {"姓名": "李雷", "电话": "13800000001", "城市": "上海"},
    {"姓名": "韩梅梅", "电话": "", "城市": "杭州"},
    {"姓名": "李雷", "电话": "13800000001", "城市": "上海"},
]

field_map = {"姓名": "name", "电话": "phone", "城市": "city"}
required_headers = set(field_map)


def main() -> None:
    headers = set(rows[0])
    missing_headers = required_headers - headers
    empty_phone = [row for row in rows if not row["电话"]]
    seen = set()
    duplicates = []

    for row in rows:
        key = (row["姓名"], row["电话"])
        if key in seen:
            duplicates.append(row)
        seen.add(key)

    print(f"缺失表头：{sorted(missing_headers) or '无'}")
    print(f"空手机号：{len(empty_phone)} 行")
    print(f"重复记录：{len(duplicates)} 行")


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
- [上一篇：JSON：系统接口常见的数据形态](./12-json-api-shape)
- [下一篇：分组统计：按来源、城市、销售汇总](./14-group-summary)
