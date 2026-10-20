# 日志：给别人运行时留下线索

> 示例文件：`run_with_logging.py`  
> 示例核验：2026-10-20（Python 3.14，语法下限为 3.10）

## 这篇解决什么问题

客户说“昨天跑了”，但没人知道处理了多少行、跳过了哪些坏数据、输出在哪里。

本集产物是：**运行日志**。

## 核心判断

日志回答一次运行的时间、输入数量、处理数量、失败原因和输出去向。正常阶段用 `INFO`，可继续的单行异常用 `WARNING`，导致本批无法完成的错误用 `ERROR`；需要定位异常栈时，在 `except` 中调用 `logging.exception`。日志级别不会自动改变退出码，失败任务还需抛出异常或明确退出。

![一次运行留下开始、行级异常与数量对账记录](/python/run-log-evidence.svg)

使用行号或内部编号关联异常清单，不把完整姓名、手机号或认证头写入普通日志。`basicConfig` 通常只在进程入口配置一次；长期运行程序还需轮转和保留期限，不能让 `run.log` 无限增长。此示例是短命令行脚本，文件默认追加。

## 运行示例

```bash
python3 run_with_logging.py
```

打开脚本旁的 `run.log`，应看到开始数量 2、第二行缺姓名警告、成功 1 与跳过 1 的结束记录。第二次运行追加新记录。中文编码显式使用 UTF-8；日志文件写入失败不能被报告成成功。

## 完整示例

### run_with_logging.py

```python
from __future__ import annotations

import logging
from pathlib import Path

log_file = Path(__file__).with_name("run.log")

logging.basicConfig(
    filename=log_file,
    encoding="utf-8",
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)


def main() -> None:
    customers = [{"name": "李雷"}, {"name": ""}]
    logging.info("开始处理客户，数量=%s", len(customers))

    processed = skipped = 0
    for number, customer in enumerate(customers, start=1):
        if not customer["name"]:
            skipped += 1
            logging.warning("跳过缺姓名客户，行号=%s", number)
            continue
        processed += 1
        logging.info("处理完成，行号=%s", number)

    logging.info("批次完成，成功=%s，跳过=%s", processed, skipped)
    print(f"日志已写入：{log_file}")


if __name__ == "__main__":
    main()
```

## 继续学习

- [返回系列导读](./)
- [上一篇：异常处理：让脚本遇到坏数据不断掉](./19-exception-handling)
- [下一篇：调用 API：从系统拿客户数据](./21-api-fetch-customers)
