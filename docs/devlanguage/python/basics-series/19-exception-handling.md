# 异常处理：让脚本遇到坏数据不断掉

> 示例文件：`safe_parse.py`  
> 最后核验：2026-08-02

本文围绕“坏行、缺列、格式错怎样处理”展开，结合可运行示例说明输入、规则、输出和改造边界。

## 这篇解决什么问题

一行日期格式错误不应该让整批任务全部失败，但关键字段缺失又必须被记录。

本集产物是：**坏数据记录表**。

## 核心判断

- `try` 要服务于真实客户数据处理。
- `except` 要服务于真实客户数据处理。
- `raise` 要服务于真实客户数据处理。
- `坏数据记录` 要服务于真实客户数据处理。

判断是否学会，不看能不能背概念，而看能不能运行脚本并得到可复查输出。

## 运行示例

```bash
python3 safe_parse.py
```

运行后检查三件事：

- 输入数据是否符合本集假设。
- 规则输出是否能解释。
- 文件或终端结果是否方便客户复核。

## 完整示例

### safe_parse.py

```python
from __future__ import annotations

from datetime import datetime

rows = [
    {"name": "李雷", "last_contact": "2026-07-30"},
    {"name": "韩梅梅", "last_contact": "2026/07/xx"},
    {"name": "王芳", "last_contact": ""},
]


def parse_contact(row: dict) -> tuple[datetime | None, str | None]:
    text = row.get("last_contact", "")
    if not text:
        return None, "缺少联系日期"
    try:
        return datetime.strptime(text, "%Y-%m-%d"), None
    except ValueError:
        return None, f"日期格式错误：{text}"


def main() -> None:
    bad_rows = []
    for row in rows:
        value, error = parse_contact(row)
        if error:
            bad_rows.append({"name": row["name"], "error": error})
        else:
            print(f"{row['name']}：{value.date()}")

    print("坏数据：")
    for row in bad_rows:
        print(f"- {row['name']}：{row['error']}")


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
- [上一篇：常见报错怎么读](./18-read-traceback)
- [下一篇：日志：给别人运行时留下线索](./20-logging)
