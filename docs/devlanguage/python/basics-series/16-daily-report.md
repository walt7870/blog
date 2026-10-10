# 生成日报：把多个结果合成一个输出

> 示例文件：`daily_report.py`  
> 最后核验：2026-08-02

本文围绕“脚本怎样产出日报文本和文件”展开，结合可运行示例说明输入、规则、输出和改造边界。

## 这篇解决什么问题

每天手工复制客户统计、异常订单和待回访名单，既慢又容易漏。

本集产物是：**每日客户运营日报**。

## 核心判断

- `字符串模板` 要服务于真实客户数据处理。
- `文件写入` 要服务于真实客户数据处理。
- `输出目录` 要服务于真实客户数据处理。
- `日期命名` 要服务于真实客户数据处理。

判断是否学会，不看能不能背概念，而看能不能运行脚本并得到可复查输出。

## 运行示例

```bash
python3 daily_report.py
```

运行后检查三件事：

- 输入数据是否符合本集假设。
- 规则输出是否能解释。
- 文件或终端结果是否方便客户复核。

## 完整示例

### daily_report.py

```python
from __future__ import annotations

from pathlib import Path

output_dir = Path(__file__).parent / "outputs"
output_dir.mkdir(exist_ok=True)
report_file = output_dir / "daily-report-2026-08-02.txt"

summary = {
    "new_customers": 18,
    "missing_info": 3,
    "overdue_followup": 5,
    "order_issues": 2,
}


def build_report(data: dict[str, int]) -> str:
    return f"""客户运营日报
新增客户：{data['new_customers']}
待补资料：{data['missing_info']}
超期回访：{data['overdue_followup']}
异常订单：{data['order_issues']}
"""


def main() -> None:
    report = build_report(summary)
    report_file.write_text(report, encoding="utf-8")
    print(report)
    print(f"已写入：{report_file}")


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
- [上一篇：订单检查：金额、状态和异常](./15-order-check)
- [下一篇：虚拟环境和依赖](./17-venv-dependencies)
