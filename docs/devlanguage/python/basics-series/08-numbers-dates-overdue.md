# 数字和日期：金额、天数和超期

> 示例文件：`overdue_check.py`  
> 示例核验：2026-10-20（Python 3.14，语法下限为 3.10）

## 这篇解决什么问题

最近联系时间超过 14 天的客户需要提醒，订单金额也要进入分层规则。

本集产物是：**超期客户清单**。

## 核心判断

客户表里的日期先按约定格式解析成 `date`，才能计算自然日差；不要对 `"2026-7-9"` 这样的原始文本直接排序比较。示例固定业务日期为 2026-08-02，保证每次练习结果一致；生产运行可用业务时区下的当天日期，而不是依赖电脑的任意时区。

![日期解析、缺失与未来日期的处理路径](/python/contact-date-decision.svg)

金额从文本转为 `Decimal`，不先经过 `float`。未来联系日期不属于“联系正常”，应先标记数据异常；“超过 14 天”用 `> 14`，第 14 天仍在正常范围。此处用自然日，若要精确到 24 小时或跨时区计算，应使用带时区的 `datetime` 并另定规则。

## 运行示例

```bash
python3 overdue_check.py
```

预期李雷 3 天未联系、正常；韩梅梅 23 天、超期；王芳没有联系记录。再使用 2026-07-19、2026-07-18 和 2026-08-03，分别验证 14 天正常、15 天超期、未来日期异常。非法日期会抛出 `ValueError`，逐行继续处理的方法见异常处理章节。

## 完整示例

### overdue_check.py

```python
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

today = date(2026, 8, 2)
customers = [
    {"name": "李雷", "last_contact": "2026-07-30", "amount": "3200.50"},
    {"name": "韩梅梅", "last_contact": "2026-07-10", "amount": "500"},
    {"name": "王芳", "last_contact": "", "amount": "1800"},
]


def parse_date(text: str) -> date | None:
    if not text:
        return None
    return datetime.strptime(text, "%Y-%m-%d").date()


def main() -> None:
    for customer in customers:
        contact_date = parse_date(customer["last_contact"])
        amount = Decimal(customer["amount"])
        if contact_date is None:
            print(f"{customer['name']}：没有联系记录，金额 {amount:.2f}")
            continue

        days = (today - contact_date).days
        if days < 0:
            print(f"{customer['name']}：联系日期晚于业务日期，需要核对")
            continue
        status = "超期" if days > 14 else "正常"
        print(f"{customer['name']}：{days} 天未联系，{status}，金额 {amount:.2f}")


if __name__ == "__main__":
    main()
```

## 继续学习

- [返回系列导读](./)
- [上一篇：字符串清洗：空格、大小写和格式](./07-string-cleaning)
- [下一篇：函数：把重复规则变成可复用步骤](./09-functions-reusable-rules)
