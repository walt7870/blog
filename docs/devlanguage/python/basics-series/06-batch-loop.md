# 循环：一条规则跑完整张表

> 示例文件：`batch_check.py`  
> 示例核验：2026-10-20（Python 3.14，语法下限为 3.10）

## 这篇解决什么问题

同一条缺资料规则要检查 2000 行，人工逐行看会漏，循环让规则按同一标准跑完。

本集产物是：**批量检查结果**。

## 核心判断

`for` 每次取一条记录，分类到完整或待补结果。计数器和结果列表在循环外初始化，否则每一轮都会清空之前的成果。这里要求手机号和城市同时存在，用 `and`；不完整名单保存原始记录，方便继续追溯姓名和缺项。

![每条记录进入一个分类，循环结束后对账](/python/batch-classification.svg)

本课没有跳过记录，因此应满足“输入数量 = 完整数 + 待补数”。这条对账关系比只检查程序是否报错更有用：四行输入应该全部有去向。循环内修改正在遍历的列表可能跳项，宜构造独立结果列表。

## 运行示例

```bash
python3 batch_check.py
```

预期完整 1 位、待补 3 位，名单依次为韩梅梅、王芳、赵强。把 `customers` 设为空列表，应得到 0 和 0；全部补齐时，待补列表为空，完整数等于输入数。

## 完整示例

### batch_check.py

```python
from __future__ import annotations

customers = [
    {"name": "李雷", "phone": "13800000001", "city": "上海"},
    {"name": "韩梅梅", "phone": "", "city": "杭州"},
    {"name": "王芳", "phone": "13900000003", "city": ""},
    {"name": "赵强", "phone": "", "city": ""},
]


def main() -> None:
    incomplete = []
    complete_count = 0

    for customer in customers:
        if customer["phone"] and customer["city"]:
            complete_count += 1
        else:
            incomplete.append(customer)

    print(f"完整客户：{complete_count} 位")
    print(f"待补客户：{len(incomplete)} 位")
    for customer in incomplete:
        print(f"- {customer['name']}")


if __name__ == "__main__":
    main()
```

## 继续学习

- [返回系列导读](./)
- [上一篇：条件判断：把业务规则写清楚](./05-customer-rules-if)
- [下一篇：字符串清洗：空格、大小写和格式](./07-string-cleaning)
