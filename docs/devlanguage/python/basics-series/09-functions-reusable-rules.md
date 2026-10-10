# 函数：把重复规则变成可复用步骤

> 示例文件：`checks.py`  
> 最后核验：2026-08-02

本文围绕“同一条规则怎样在多张表里复用”展开，结合可运行示例说明输入、规则、输出和改造边界。

## 这篇解决什么问题

缺资料检查在客户表、订单表和回访表里反复出现，复制代码会让规则越来越难改。

本集产物是：**is_incomplete_customer**。

## 核心判断

- `def` 要服务于真实客户数据处理。
- `参数` 要服务于真实客户数据处理。
- `返回值` 要服务于真实客户数据处理。
- `单一职责` 要服务于真实客户数据处理。

判断是否学会，不看能不能背概念，而看能不能运行脚本并得到可复查输出。

## 运行示例

```bash
python3 checks.py
```

运行后检查三件事：

- 输入数据是否符合本集假设。
- 规则输出是否能解释。
- 文件或终端结果是否方便客户复核。

## 完整示例

### checks.py

```python
from __future__ import annotations


def is_incomplete_customer(customer: dict) -> bool:
    return not customer.get("name") or not customer.get("phone")


def need_followup(customer: dict) -> bool:
    return customer.get("days_since_contact", 0) > 7


def main() -> None:
    customers = [
        {"name": "李雷", "phone": "13800000001", "days_since_contact": 3},
        {"name": "韩梅梅", "phone": "", "days_since_contact": 12},
    ]

    for customer in customers:
        print(customer["name"], {
            "资料不完整": is_incomplete_customer(customer),
            "需要回访": need_followup(customer),
        })


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
- [上一篇：数字和日期：金额、天数和超期](./08-numbers-dates-overdue)
- [下一篇：模块：把脚本拆成几份文件](./10-modules-split-script)
