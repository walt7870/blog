# 分组统计：按来源、城市、销售汇总

> 示例文件：`group_summary.py`  
> 示例核验：2026-10-20（Python 3.14，语法下限为 3.10）

## 这篇解决什么问题

运营要看不同来源客户数量、城市分布和销售负责量，明细表需要汇总成小报表。

本集产物是：**来源/城市统计**。

## 核心判断

先约定统计单位。本例每条输入是一位客户且不重复，所以按来源累计的是客户数；若输入变成订单明细，同一客户出现三次会计三次，不能还把结果叫客户人数。要统计去重人数，必须先选稳定客户编号，再按分组维护编号集合。

![同一批客户可以按不同字段分组，分别累计并对账](/python/group-summary-grain.svg)

`result.get(key, 0) + 1` 为每个分组维护计数。缺失来源归为“未知”后，所有分组数量之和应等于输入行数。排序只改变展示顺序，不改变统计口径；展示 Top N 时还要注明未显示组的数量，避免把榜单当全量。

## 运行示例

```bash
python3 group_summary.py
```

预期官网 2、展会 1；上海 2、杭州 1；张三 2、李四 1。每种分组之和都是 3。重复放入李雷会使行数增加到 4，这是当前“逐行计数”的预期行为，不能误认为代码已做客户去重。

## 完整示例

### group_summary.py

```python
from __future__ import annotations

customers = [
    {"name": "李雷", "city": "上海", "source": "官网", "owner": "张三"},
    {"name": "韩梅梅", "city": "杭州", "source": "展会", "owner": "李四"},
    {"name": "王芳", "city": "上海", "source": "官网", "owner": "张三"},
]


def count_by(rows: list[dict], field: str) -> dict[str, int]:
    result: dict[str, int] = {}
    for row in rows:
        key = row.get(field) or "未知"
        result[key] = result.get(key, 0) + 1
    return result


def main() -> None:
    for field in ["source", "city", "owner"]:
        print(f"{field} 统计：")
        for key, count in sorted(count_by(customers, field).items(), key=lambda item: item[1], reverse=True):
            print(f"- {key}: {count}")


if __name__ == "__main__":
    main()
```

## 继续学习

- [返回系列导读](./)
- [上一篇：Excel/表格实战入口](./13-table-health-check)
- [下一篇：订单检查：金额、状态和异常](./15-order-check)
