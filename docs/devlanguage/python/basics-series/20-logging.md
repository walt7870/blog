# 日志：给别人运行时留下线索

> 示例文件：`run_with_logging.py`  
> 最后核验：2026-08-02

本文围绕“脚本跑完为什么要留下记录”展开，结合可运行示例说明输入、规则、输出和改造边界。

## 这篇解决什么问题

客户说“昨天跑了”，但没人知道处理了多少行、跳过了哪些坏数据、输出在哪里。

本集产物是：**运行日志**。

## 核心判断

- `logging` 要服务于真实客户数据处理。
- `INFO` 要服务于真实客户数据处理。
- `WARNING` 要服务于真实客户数据处理。
- `ERROR` 要服务于真实客户数据处理。
- `日志文件` 要服务于真实客户数据处理。

判断是否学会，不看能不能背概念，而看能不能运行脚本并得到可复查输出。

## 运行示例

```bash
python3 run_with_logging.py
```

运行后检查三件事：

- 输入数据是否符合本集假设。
- 规则输出是否能解释。
- 文件或终端结果是否方便客户复核。

## 完整示例

### run_with_logging.py

```python
from __future__ import annotations

import logging
from pathlib import Path

log_file = Path(__file__).with_name("run.log")

logging.basicConfig(
    filename=log_file,
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)


def main() -> None:
    customers = [{"name": "李雷"}, {"name": ""}]
    logging.info("开始处理客户，数量=%s", len(customers))

    for customer in customers:
        if not customer["name"]:
            logging.warning("跳过缺姓名客户")
            continue
        logging.info("处理客户：%s", customer["name"])

    logging.info("处理完成")
    print(f"日志已写入：{log_file}")


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
- [上一篇：异常处理：让脚本遇到坏数据不断掉](./19-exception-handling)
- [下一篇：调用 API：从系统拿客户数据](./21-api-fetch-customers)
