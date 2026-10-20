# 函数：把重复规则变成可复用步骤

> 示例文件：`checks.py`  
> 示例核验：2026-10-20（Python 3.14，语法下限为 3.10）

## 这篇解决什么问题

缺资料检查在客户表、订单表和回访表里反复出现，复制代码会让规则越来越难改。

本集产物是：**is_incomplete_customer**。

## 核心判断

函数接收一条客户记录，返回一个明确结果，不在规则内部读文件或打印报表。这样同一规则既能用于终端工具，也能用于日报。`return` 把判断交给调用方，`print` 只显示文本；只打印“缺手机号”的函数不能直接放进筛选条件。

![输入记录经过规则函数返回判断，由调用方决定展示方式](/python/function-rule-contract.svg)

本例的必需字段缺失就算资料不完整；回访天数则不允许默认成 0，否则没有联系信息的客户会被误认为刚联系过。参数 `days_limit` 明确边界，修改阈值时调用方无需复制一份函数。

## 运行示例

```bash
python3 checks.py
```

预期李雷两个判断均为 `False`，韩梅梅均为 `True`。调用后原字典不变；把阈值传为 14，韩梅梅的 12 天不再命中。删除联系天数字段应报 `KeyError`，提醒调用方先做输入校验。

## 完整示例

### checks.py

```python
from __future__ import annotations


def is_incomplete_customer(customer: dict) -> bool:
    return not customer.get("name") or not customer.get("phone")


def need_followup(customer: dict, days_limit: int = 7) -> bool:
    return customer["days_since_contact"] > days_limit


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

## 继续学习

- [返回系列导读](./)
- [上一篇：数字和日期：金额、天数和超期](./08-numbers-dates-overdue)
- [下一篇：模块：把脚本拆成几份文件](./10-modules-split-script)
