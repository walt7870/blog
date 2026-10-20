# Excel/表格实战入口

> 示例文件：`table_health_check.py`  
> 示例核验：2026-10-20（Python 3.14，语法下限为 3.10）

## 这篇解决什么问题

客户交来的表头可能叫“手机号”“电话”或“mobile”，脚本必须先判断数据是否可用。

本集产物是：**数据体检报告**。

## 核心判断

先把外部表头映射为内部字段，再检查空值和重复。映射处理的是名称差异，不会恢复已经被 Excel 转坏的手机号。本课先使用内存行数据说明规则；CSV 入口见上一节，`.xlsx` 需要通过 `openpyxl` 等读取器转为记录，不能交给 `csv` 解析。

![表头映射成功后才进入记录检查](/python/table-health-gates.svg)

示例用 `(姓名, 电话)` 作为疑似重复键，只输出供核对，不自动删除。家庭共享手机号、同名不同人都可能存在；生产去重应优先使用系统客户编号。表头缺失属于整批输入错误，应停止规则处理；空手机号则属于行级数据质量问题，可以继续检查其他行。

## 运行示例

```bash
python3 table_health_check.py
```

预期缺失表头“无”、空手机号 1 行、疑似重复 1 行。空列表应报告“无数据行”；把某行的“电话”改为“手机”，应先报该行缺少字段，不能在统计中途才抛 `KeyError`。若外部表头有多个别名，需先确认不会映射到同一个内部字段而覆盖值。

## 完整示例

### table_health_check.py

```python
from __future__ import annotations

rows = [
    {"姓名": "李雷", "电话": "13800000001", "城市": "上海"},
    {"姓名": "韩梅梅", "电话": "", "城市": "杭州"},
    {"姓名": "李雷", "电话": "13800000001", "城市": "上海"},
]

field_map = {"姓名": "name", "电话": "phone", "城市": "city"}
required_headers = set(field_map)


def main() -> None:
    if not rows:
        print("无数据行；文件表头应由读取器单独校验")
        return
    for number, row in enumerate(rows, start=1):
        missing_headers = required_headers - set(row)
        if missing_headers:
            raise ValueError(f"第 {number} 行缺少字段：{sorted(missing_headers)}")
    normalized = [{target: row[source] for source, target in field_map.items()} for row in rows]
    empty_phone = [row for row in normalized if not row["phone"].strip()]
    seen = set()
    duplicates = []

    for row in normalized:
        key = (row["name"].strip(), row["phone"].strip())
        if key in seen:
            duplicates.append(row)
        seen.add(key)

    print("缺失表头：无")
    print(f"空手机号：{len(empty_phone)} 行")
    print(f"疑似重复：{len(duplicates)} 行")


if __name__ == "__main__":
    main()
```

## 继续学习

- [返回系列导读](./)
- [上一篇：JSON：系统接口常见的数据形态](./12-json-api-shape)
- [下一篇：分组统计：按来源、城市、销售汇总](./14-group-summary)
