# 异常处理：让脚本遇到坏数据不断掉

> 示例文件：`safe_parse.py`  
> 示例核验：2026-10-20（Python 3.14，语法下限为 3.10）

## 这篇解决什么问题

一行日期格式错误不应该让整批任务全部失败，但关键字段缺失又必须被记录。

本集产物是：**坏数据记录表**。

## 核心判断

缺日期或某行格式不合法是可归因到记录的问题，可以把该行和原因放入异常清单，再继续下一行。文件读不到、整列缺失、结果写入失败影响整批可信度，应终止任务并返回失败。是否继续取决于错误作用范围，而不是异常是不是红字。

![行级格式问题留痕继续，批级输入输出故障终止](/python/row-error-boundary.svg)

`try` 只包围可能失败的日期转换，`except ValueError` 只处理预期格式问题；编程错误如访问不存在的方法不应被它吞掉。返回的 `(value, error)` 明确区分成功与失败，调用方不可把失败值当正常日期参与统计。

## 运行示例

```bash
python3 safe_parse.py
```

预期成功 1 行、坏数据 2 行，韩梅梅为格式错误、王芳为缺少日期，满足输入 3 = 成功 1 + 失败 2。继续把日期改成不存在的 2026-02-30，应进入格式错误；若字段不是文本，也应在解析前报告类型错误。

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
    if not isinstance(text, str):
        return None, "联系日期必须是文本"
    text = text.strip()
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

## 继续学习

- [返回系列导读](./)
- [上一篇：常见报错怎么读](./18-read-traceback)
- [下一篇：日志：给别人运行时留下线索](./20-logging)
