# 批量文件自动化

> 示例文件：`batch_files.py`  
> 最后核验：2026-08-02

本文围绕“一个文件夹里几十个文件怎样统一处理”展开，结合可运行示例说明输入、规则、输出和改造边界。

## 这篇解决什么问题

每天收到多个城市的日报文件，人工改名和汇总容易漏文件、覆盖文件。

本集产物是：**批量改名/汇总脚本**。

## 核心判断

- `pathlib` 要服务于真实客户数据处理。
- `glob` 要服务于真实客户数据处理。
- `文件命名` 要服务于真实客户数据处理。
- `输入输出隔离` 要服务于真实客户数据处理。

判断是否学会，不看能不能背概念，而看能不能运行脚本并得到可复查输出。

## 运行示例

```bash
python3 batch_files.py
```

运行后检查三件事：

- 输入数据是否符合本集假设。
- 规则输出是否能解释。
- 文件或终端结果是否方便客户复核。

## 完整示例

### batch_files.py

```python
from __future__ import annotations

from pathlib import Path

base = Path(__file__).parent
input_dir = base / "inputs"
output_dir = base / "outputs"
input_dir.mkdir(exist_ok=True)
output_dir.mkdir(exist_ok=True)

for city in ["shanghai", "hangzhou", "shenzhen"]:
    (input_dir / f"{city}.txt").write_text(f"{city} daily report", encoding="utf-8")


def main() -> None:
    for index, file in enumerate(sorted(input_dir.glob("*.txt")), start=1):
        target = output_dir / f"report-{index:02d}-{file.name}"
        target.write_text(file.read_text(encoding="utf-8"), encoding="utf-8")
        print(f"{file.name} -> {target.name}")


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
- [上一篇：调用 API：从系统拿客户数据](./21-api-fetch-customers)
- [下一篇：参数配置：不改代码也能换文件](./23-argparse-config)
