# 条件判断：把业务规则写清楚

> 示例文件：`customer_tags.py`  
> 最后核验：2026-08-02

本文围绕“缺资料、高价值、需回访怎样变成 if”展开，结合可运行示例说明输入、规则、输出和改造边界。

## 这篇解决什么问题

销售主管口头说“超过 7 天没联系就提醒”，脚本必须把这句话变成稳定规则。

本集产物是：**客户标签规则**。

## 核心判断

- `if` 要服务于真实客户数据处理。
- `elif` 要服务于真实客户数据处理。
- `else` 要服务于真实客户数据处理。
- `比较` 要服务于真实客户数据处理。
- `布尔值` 要服务于真实客户数据处理。

判断是否学会，不看能不能背概念，而看能不能运行脚本并得到可复查输出。

## 运行示例

```bash
python3 customer_tags.py
```

运行后检查三件事：

- 输入数据是否符合本集假设。
- 规则输出是否能解释。
- 文件或终端结果是否方便客户复核。

## 完整示例

### customer_tags.py

```python
from __future__ import annotations

customers = [
    {"name": "李雷", "phone": "13800000001", "level": "VIP", "days_since_contact": 3, "amount": 3200},
    {"name": "韩梅梅", "phone": "", "level": "普通", "days_since_contact": 12, "amount": 500},
    {"name": "王芳", "phone": "13900000003", "level": "VIP", "days_since_contact": 18, "amount": 1800},
]


def tag_customer(customer: dict) -> list[str]:
    tags = []

    if not customer["phone"]:
        tags.append("资料待补")

    if customer["level"] == "VIP" or customer["amount"] >= 3000:
        tags.append("高价值")

    if customer["days_since_contact"] > 7:
        tags.append("需要回访")
    else:
        tags.append("联系正常")

    return tags


def main() -> None:
    for customer in customers:
        print(f"{customer['name']}：{', '.join(tag_customer(customer))}")


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
- [上一篇：列表、字典和表格行](./04-customer-records-list-dict)
- [下一篇：循环：一条规则跑完整张表](./06-batch-loop)
