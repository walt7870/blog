# 分组统计：按来源、城市、销售汇总

> 示例文件：`group_summary.py`  
> 最后核验：2026-08-02

本文围绕“怎样从明细变成管理能看的小表”展开，结合可运行示例说明输入、规则、输出和改造边界。

## 这篇解决什么问题

运营要看不同来源客户数量、城市分布和销售负责量，明细表需要汇总成小报表。

本集产物是：**来源/城市统计**。

## 核心判断

- `dict 累计` 要服务于真实客户数据处理。
- `set` 要服务于真实客户数据处理。
- `排序` 要服务于真实客户数据处理。
- `Top N` 要服务于真实客户数据处理。

判断是否学会，不看能不能背概念，而看能不能运行脚本并得到可复查输出。

## 运行示例

```bash
python3 group_summary.py
```

运行后检查三件事：

- 输入数据是否符合本集假设。
- 规则输出是否能解释。
- 文件或终端结果是否方便客户复核。

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
- [上一篇：Excel/表格实战入口](./13-table-health-check)
- [下一篇：订单检查：金额、状态和异常](./15-order-check)
