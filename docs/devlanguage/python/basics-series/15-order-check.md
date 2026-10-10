# 订单检查：金额、状态和异常

> 示例文件：`order_check.py`  
> 最后核验：2026-08-02

本文围绕“订单表里哪些规则适合自动查”展开，结合可运行示例说明输入、规则、输出和改造边界。

## 这篇解决什么问题

已付款订单金额为 0，取消订单仍被计入日报，都会让经营数据失真。

本集产物是：**异常订单名单**。

## 核心判断

- `数字比较` 要服务于真实客户数据处理。
- `状态枚举` 要服务于真实客户数据处理。
- `异常清单` 要服务于真实客户数据处理。
- `规则表` 要服务于真实客户数据处理。

判断是否学会，不看能不能背概念，而看能不能运行脚本并得到可复查输出。

## 运行示例

```bash
python3 order_check.py
```

运行后检查三件事：

- 输入数据是否符合本集假设。
- 规则输出是否能解释。
- 文件或终端结果是否方便客户复核。

## 完整示例

### order_check.py

```python
from __future__ import annotations

orders = [
    {"order_id": "A1001", "customer": "李雷", "amount": 1200.5, "status": "paid"},
    {"order_id": "A1002", "customer": "韩梅梅", "amount": 0, "status": "paid"},
    {"order_id": "A1003", "customer": "王芳", "amount": 800, "status": "cancelled"},
]


def find_order_issues(order: dict) -> list[str]:
    issues = []
    if order["status"] == "paid" and order["amount"] <= 0:
        issues.append("已付款金额异常")
    if order["status"] == "cancelled" and order["amount"] > 0:
        issues.append("取消订单仍有金额")
    if order["status"] not in {"paid", "pending", "cancelled"}:
        issues.append("未知状态")
    return issues


def main() -> None:
    for order in orders:
        issues = find_order_issues(order)
        if issues:
            print(f"{order['order_id']}｜{order['customer']}：{', '.join(issues)}")


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
- [上一篇：分组统计：按来源、城市、销售汇总](./14-group-summary)
- [下一篇：生成日报：把多个结果合成一个输出](./16-daily-report)
