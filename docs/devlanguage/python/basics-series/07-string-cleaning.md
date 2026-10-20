# 字符串清洗：空格、大小写和格式

> 示例文件：`normalize_source.py`  
> 示例核验：2026-10-20（Python 3.14，语法下限为 3.10）

## 这篇解决什么问题

来源字段里同时出现“官网”“ 官网”“网站”和“Web”，统计结果会被拆散。

本集产物是：**来源字段标准化**。

## 核心判断

先去首尾空白，再统一英文大小写，最后按已确认的别名映射到标准来源。`strip()` 不删除中间空格，也不会修改原字符串；需要接住返回值。不能随意删除所有空格或横线，客户名称、活动编号中的这些字符可能有含义。

![保留原值，再得到清洗值和标准分类](/python/source-normalization.svg)

“展会-上海”归入“展会”是本例明确约定的规则。不能据此把所有带 `-` 的来源都截断，否则“合作-平台”也会被改坏。未知来源进入“其他”，原值保留在记录中，便于后续增加映射；空值则单独标为“来源待补”。

## 运行示例

```bash
python3 normalize_source.py
```

前四项应得到官网，“展会”和“展会-上海”得到展会，“转介绍”保持不变。再加入空白和“合作-平台”，分别确认输出“来源待补”和“其他”，且原始列表未被修改。

## 完整示例

### normalize_source.py

```python
from __future__ import annotations

raw_sources = ["官网", " 官网 ", "网站", "Web", "展会", "展会-上海", "转介绍"]

source_aliases = {
    "官网": "官网",
    "网站": "官网",
    "web": "官网",
    "展会": "展会",
    "转介绍": "转介绍",
}


def normalize_source(source: str) -> str:
    text = source.strip().lower()
    if not text:
        return "来源待补"
    if text.startswith("展会-"):
        text = "展会"
    return source_aliases.get(text, "其他")


def main() -> None:
    for source in raw_sources:
        print(f"{source!r} -> {normalize_source(source)}")


if __name__ == "__main__":
    main()
```

## 继续学习

- [返回系列导读](./)
- [上一篇：循环：一条规则跑完整张表](./06-batch-loop)
- [下一篇：数字和日期：金额、天数和超期](./08-numbers-dates-overdue)
