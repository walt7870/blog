# 参数配置：不改代码也能换文件

> 示例文件：`cli_tool.py`  
> 示例核验：2026-10-20（Python 3.14，语法下限为 3.10）

## 这篇解决什么问题

客户每次换文件都要打开代码改路径，既危险又容易改坏脚本。

本集产物是：**命令行参数版脚本**。

## 核心判断

参数把“这次运行用哪份文件”从程序逻辑中分离出来。`--input` 和 `--output` 是每次运行的选择，手机号检查规则仍保留在代码中。本例相对路径以终端当前目录为准，绝对路径直接使用；与脚本内固定资源相对脚本目录的做法要区分。

![命令行参数解析成路径，校验通过后才读写文件](/python/cli-path-contract.svg)

输出不能与输入指向同一个文件，默认也不能覆盖已有结果；只有显式传 `--overwrite` 才允许覆盖结果。路径相等检查会解析符号链接，对已存在的硬链接再用 `samefile` 检查，避免不同名字实际指向同一原件。

## 运行示例

```bash
python3 cli_tool.py --help
python3 cli_tool.py --input customers.csv --output outputs/missing.csv
```

使用 [CSV 章节](./11-csv-read-write)的三行输入，预期只输出韩梅梅，因为本例只查手机号。`--help` 不读取文件；未知参数会被解析器拒绝。输出与输入相同时必须报错；第二次运行已有结果时应拒绝覆盖，确认需要替换后才加 `--overwrite`。

## 完整示例

### cli_tool.py

```python
from __future__ import annotations

import argparse
import csv
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="检查客户手机号")
    parser.add_argument("--input", default="customers.csv", help="输入 CSV 文件")
    parser.add_argument("--output", default="missing.csv", help="输出 CSV 文件")
    parser.add_argument("--overwrite", action="store_true", help="允许覆盖已有结果文件")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_file = Path(args.input).expanduser().resolve()
    output_file = Path(args.output).expanduser().resolve()
    if input_file == output_file or (output_file.exists() and input_file.samefile(output_file)):
        raise ValueError("输出路径不能与输入相同")

    with input_file.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        missing_headers = {"name", "phone"} - set(reader.fieldnames or [])
        if missing_headers:
            raise ValueError(f"缺少表头：{sorted(missing_headers)}")
        rows = list(reader)

    missing = [row for row in rows if not row["phone"]]

    output_file.parent.mkdir(parents=True, exist_ok=True)
    mode = "w" if args.overwrite else "x"
    with output_file.open(mode, encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=["name"])
        writer.writeheader()
        writer.writerows({"name": row["name"]} for row in missing)

    print(f"已输出：{output_file}，{len(missing)} 行")


if __name__ == "__main__":
    main()
```

## 继续学习

- [返回系列导读](./)
- [上一篇：批量文件自动化](./22-batch-files)
- [下一篇：交付一个客户可用小工具](./24-delivery-package)
