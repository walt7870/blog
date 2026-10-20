# 生成日报：把多个结果合成一个输出

> 示例文件：`daily_report.py`  
> 示例核验：2026-10-20（Python 3.14，语法下限为 3.10）

## 这篇解决什么问题

每天手工复制客户统计、异常订单和待回访名单，既慢又容易漏。

本集产物是：**每日客户运营日报**。

## 核心判断

报表生成分为“计算指标”和“渲染展示”两步。本课只演示后一部分，`summary` 中的 18、3、5、2 是固定教学输入，不代表程序已经读完客户表和订单表。接入前面章节时，应先得到各项统计，再把结果传给 `build_report`，避免把打印常量误当成自动统计。

![各项已计算的指标汇入模板，再写入独立报表](/python/daily-report-composition.svg)

新增客户按统计日内创建的客户计数，待补资料和超期回访可能是存量客户；这几项可以重叠，不能相加当成总人数。报表还应带业务日期、输入批次和异常明细去向，才能追溯“为什么今天有 3 位待补”。

## 运行示例

```bash
python3 daily_report.py
```

预期生成 `outputs/daily-report-2026-08-02.txt`，内容与传入的四项指标一致。将待补资料改为 0，只应改变这一行；删除必需指标应抛出 `KeyError`，避免悄悄显示 0。当前文件名固定，同一目录重跑会覆盖报表，正式批处理应按业务日期与批次保存。

## 完整示例

### daily_report.py

```python
from __future__ import annotations

from pathlib import Path

output_dir = Path(__file__).parent / "outputs"
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
    output_dir.mkdir(exist_ok=True)
    report = build_report(summary)
    report_file.write_text(report, encoding="utf-8")
    print(report)
    print(f"已写入：{report_file}")


if __name__ == "__main__":
    main()
```

## 继续学习

- [返回系列导读](./)
- [上一篇：订单检查：金额、状态和异常](./15-order-check)
- [下一篇：虚拟环境和依赖](./17-venv-dependencies)
