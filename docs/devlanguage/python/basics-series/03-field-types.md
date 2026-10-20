# 变量和类型怎么服务业务字段

> 示例文件：`field_types.py`  
> 示例核验：2026-10-20（Python 3.14，语法下限为 3.10）

这篇文章把字符串、数字、布尔值和空值放回客户字段里。重点不是背类型名，而是判断字段应该怎样被使用。

## 这篇解决什么问题

客户表里常见字段看起来都像“内容”，但用途完全不同：

- 姓名、手机号、城市：主要用于展示、匹配、判空。
- 订单金额、购买次数：需要求和、比较和统计。
- 是否会员、是否已回访：只有是或否。
- 最近联系时间为空：表示缺失或没有记录。

类型选错，规则就可能错。

## 核心判断

![原始字符串经过字段校验后转换成业务类型](/python/field-conversion-contract.svg)

先问字段要做什么，再决定类型。

## 本集示例

运行：

```bash
python3 field_types.py
```

它会输出客户字段、示例值、推荐类型和用途。

## 完整代码

```python
from __future__ import annotations

from decimal import Decimal


customer = {
    "name": "李雷",
    "phone": "013800000001",
    "city": "上海",
    "order_amount_text": "1200.50",
    "order_count_text": "3",
    "is_vip": True,
    "last_contact": None,
}


field_specs = [
    ("name", customer["name"], "str", "展示客户姓名"),
    ("phone", customer["phone"], "str", "保留前导零和格式"),
    ("city", customer["city"], "str", "筛选和分组"),
    ("order_amount", Decimal(customer["order_amount_text"]), "Decimal", "精确十进制金额"),
    ("order_count", int(customer["order_count_text"]), "int", "计算购买次数"),
    ("is_vip", customer["is_vip"], "bool", "判断会员状态"),
    ("last_contact", customer["last_contact"], "None", "表示暂时没有联系记录"),
]

for field, value, type_name, purpose in field_specs:
    print(f"{field}: {value!r} | {type_name} | {purpose}")
```

## 字段类型说明表

| 字段 | 示例 | 推荐类型 | 原因 |
| --- | --- | --- | --- |
| `name` | `李雷` | `str` | 用于展示和匹配 |
| `phone` | `013800000001` | `str` | 不用于计算，要保留格式 |
| `city` | `上海` | `str` | 用于筛选和分组 |
| `order_amount` | `1200.50` | `Decimal` | 用十进制金额求和和比较 |
| `order_count` | `3` | `int` | 表示次数 |
| `is_vip` | `True` | `bool` | 表示是否 |
| `last_contact` | `None` | `None` 或日期 | 表示缺失或日期 |

金额也可以按最小货币单位存为整数，例如人民币 `120050` 分。`float` 适合近似测量值，`0.1 + 0.2` 并不精确等于 `0.3`；若使用 `Decimal`，从原始字符串构造，避免先转成浮点。结算还要单独约定币种、舍入方式和发生舍入的步骤。

接口文本 `"false"` 不会因为内容像否定词就自动变成布尔值，`bool("false")` 仍是 `True`。需明确映射允许的文本；`None`、空字符串和金额 `0` 也不是同一种业务状态，不能全部用 `if not value` 当成缺失。

## 常见误区

| 误区 | 后果 | 修正 |
| --- | --- | --- |
| 手机号转数字 | 前导零丢失，格式不可控 | 手机号按字符串保存 |
| 金额一直当文本 | 不能正确求和和比较 | 检查格式后转成数字 |
| 空字符串和缺失不区分 | 无法判断是否需要补资料 | 为关键字段写明确规则 |
| 所有字段都先转换 | 坏数据会让脚本提前失败 | 先检查，再转换 |

## 修改成自己的场景

1. 列出表头字段。
2. 为每个字段写一个示例值。
3. 写清用途：展示、计算、判断、分组还是缺失检查。
4. 再决定推荐类型。

## 读完之后能完成什么

你应该能为客户表写出一张字段说明表，并解释为什么手机号是字符串、金额是数字、是否会员是布尔值。


## 继续学习

- [返回系列导读](./)
- [上一篇：安装、运行和脚本文件](./02-run-python-script)
- [下一篇：列表、字典和表格行](./04-customer-records-list-dict)
