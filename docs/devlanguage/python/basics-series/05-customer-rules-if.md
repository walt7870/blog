# 条件判断：把业务规则写清楚

> 示例文件：`customer_tags.py`  
> 示例核验：2026-10-20（Python 3.14，语法下限为 3.10）

## 这篇解决什么问题

销售主管口头说“超过 7 天没联系就提醒”，脚本必须把这句话变成稳定规则。

本集产物是：**客户标签规则**。

## 核心判断

一个客户可以同时“资料待补”和“需要回访”，所以这两条规则用独立的 `if`。联系状态则只能二选一：超过 7 天为需要回访，否则联系正常，用 `if/else`。`elif` 适合互斥分档，例如金额高、中、低三档；把所有标签改成一串 `elif` 会漏掉后面的命中项。

![独立标签可以同时命中，联系状态只能二选一](/python/customer-rule-branches.svg)

“超过 7 天”对应 `> 7`，第 7 天不提醒，第 8 天提醒。`VIP or amount >= 3000` 表示满足任一条件；如果主管要求“VIP 且累计金额达标”，应改成 `and`，并补上边界样例。

## 运行示例

```bash
python3 customer_tags.py
```

预期李雷为“高价值、联系正常”，韩梅梅为“资料待补、需要回访”，王芳为“高价值、需要回访”。再把联系天数分别改为 7 和 8，确认提醒只在 8 命中。代码假设字段已存在且天数为非负整数；缺字段和文本金额应在进入规则前检查。

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

## 继续学习

- [返回系列导读](./)
- [上一篇：列表、字典和表格行](./04-customer-records-list-dict)
- [下一篇：循环：一条规则跑完整张表](./06-batch-loop)
