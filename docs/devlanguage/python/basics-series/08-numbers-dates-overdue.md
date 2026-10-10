# 数字和日期：金额、天数和超期

> 示例文件：`overdue_check.py`  
> 最后核验：2026-08-02

本文围绕“订单金额和最近联系时间怎样计算”展开，结合可运行示例说明输入、规则、输出和改造边界。

## 这篇解决什么问题

最近联系时间超过 14 天的客户需要提醒，订单金额也要进入分层规则。

本集产物是：**超期客户清单**。

## 核心判断

- `int` 要服务于真实客户数据处理。
- `float` 要服务于真实客户数据处理。
- `datetime` 要服务于真实客户数据处理。
- `日期差` 要服务于真实客户数据处理。
- `格式转换` 要服务于真实客户数据处理。

判断是否学会，不看能不能背概念，而看能不能运行脚本并得到可复查输出。

## 运行示例

```bash
python3 overdue_check.py
```

运行后检查三件事：

- 输入数据是否符合本集假设。
- 规则输出是否能解释。
- 文件或终端结果是否方便客户复核。

## 完整示例

### overdue_check.py

```python
from __future__ import annotations

from datetime import date, datetime

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
        amount = float(customer["amount"])
        if contact_date is None:
            print(f"{customer['name']}：没有联系记录，金额 {amount:.2f}")
            continue

        days = (today - contact_date).days
        status = "超期" if days > 14 else "正常"
        print(f"{customer['name']}：{days} 天未联系，{status}，金额 {amount:.2f}")


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
- [上一篇：字符串清洗：空格、大小写和格式](./07-string-cleaning)
- [下一篇：函数：把重复规则变成可复用步骤](./09-functions-reusable-rules)
