# 交付一个客户可用小工具

> 示例文件：`delivery_check.py`  
> 最后核验：2026-08-02

本文围绕“脚本交付前要检查哪些东西”展开，结合可运行示例说明输入、规则、输出和改造边界。

## 这篇解决什么问题

脚本能在开发电脑上跑，不代表客户知道怎么使用、怎么判断结果、遇到错误找谁。

本集产物是：**完整交付包**。

## 核心判断

- `README` 要服务于真实客户数据处理。
- `示例数据` 要服务于真实客户数据处理。
- `验收清单` 要服务于真实客户数据处理。
- `版本说明` 要服务于真实客户数据处理。

判断是否学会，不看能不能背概念，而看能不能运行脚本并得到可复查输出。

## 运行示例

```bash
python3 delivery_check.py
```

运行后检查三件事：

- 输入数据是否符合本集假设。
- 规则输出是否能解释。
- 文件或终端结果是否方便客户复核。

## 完整示例

### delivery_check.py

```python
from __future__ import annotations

from pathlib import Path

required = ["README.md", "customers.csv", "run.py", "outputs"]
base = Path(__file__).parent / "delivery_package"
base.mkdir(exist_ok=True)
(base / "outputs").mkdir(exist_ok=True)
(base / "README.md").write_text("运行：python run.py\n输出：outputs/\n", encoding="utf-8")
(base / "customers.csv").write_text("name,phone\n李雷,13800000001\n", encoding="utf-8")
(base / "run.py").write_text("print('客户工具运行完成')\n", encoding="utf-8")


def main() -> None:
    print("交付包检查：")
    for item in required:
        exists = (base / item).exists()
        print(f"- {item}: {'OK' if exists else '缺失'}")


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
- [上一篇：参数配置：不改代码也能换文件](./23-argparse-config)
- [下一篇：什么时候该用类，把数据和动作放进同一个对象](./25-classes-and-objects)
