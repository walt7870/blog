# 订单检查：金额、状态和异常

> 示例文件：`order_check.py`  
> 示例核验：2026-10-20（Python 3.14，语法下限为 3.10）

## 这篇解决什么问题

已付款订单的实收为 0、取消订单仍有未退实收，都需要核对。这里把 `amount` 定义为“收款减已完成退款后的净实收”，而不是商品原价或订单应付额；只有含义明确，状态与金额才能一起检查。

本集产物是：**异常订单名单**。

## 核心判断

本例限定为无赠品、已完成收退款对账的订单快照：`paid` 应有正净实收，`pending` 尚未收款，`cancelled` 已退净实收应为 0。现实系统的退款可能仍在处理中，必须结合退款状态或对账截止时间，不能仅因取消订单保留商品原价就判错。

![先明确金额口径，再结合订单状态生成核对项](/python/order-amount-status.svg)

规则返回的是待核对原因，不会自动改订单或发退款。多个独立 `if` 可以记录同一订单的多个问题。未知状态要进入异常清单，否则新增状态可能被静默排除在统计之外。

## 运行示例

```bash
python3 order_check.py
```

预期 A1002 为“已付款净实收异常”，A1003 为“取消订单仍有净实收”。把 A1003 净实收改为 0 后不再命中；未知状态始终报告。此例只做金额和状态核对，重复订单、币种和退款时序要另设规则。

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
        issues.append("已付款净实收异常")
    if order["status"] == "cancelled" and order["amount"] > 0:
        issues.append("取消订单仍有净实收")
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

## 继续学习

- [返回系列导读](./)
- [上一篇：分组统计：按来源、城市、销售汇总](./14-group-summary)
- [下一篇：生成日报：把多个结果合成一个输出](./16-daily-report)
