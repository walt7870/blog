# 批量文件自动化

> 示例文件：`batch_files.py`  
> 示例核验：2026-10-20（Python 3.14，语法下限为 3.10）

## 这篇解决什么问题

每天收到多个城市的日报文件，人工改名和汇总容易漏文件、覆盖文件。

本集产物是：**保留原件的批量复制脚本**。示例不做内容汇总，也不重命名输入原件。

## 核心判断

输入目录只读，输出放到另一个目录；`glob("*.txt")` 只选当前层的文本文件，包含子目录的任务才考虑 `rglob`。排序让处理顺序稳定，但编号依赖集合顺序，新增文件后序号可能变化。本例用原文件名派生目标名，让同一输入始终映射到同一目标。

![输入原件保持不动，派生结果写入独立目录](/python/batch-file-boundaries.svg)

使用排他创建模式 `x`，目标已存在就报错，防止重复运行静默覆盖旧结果。批次中断后可能已有部分输出；先检查已完成文件再决定重跑或换批次目录，更复杂的续跑见并发系列检查点章节。示例只支持 UTF-8 文本，不适合二进制文件。

## 运行示例

```bash
python3 batch_files.py
```

在脚本旁手动建立 `inputs/`，放入 `shanghai.txt` 和 `hangzhou.txt`，脚本会创建 `outputs/report-shanghai.txt` 等结果，内容应与原件一致。第二次运行应因目标已存在而失败，原件与已生成结果都不会被覆盖。没有匹配文件时明确报错，避免把空输入当成批量完成。

## 完整示例

### batch_files.py

```python
from __future__ import annotations

from pathlib import Path

base = Path(__file__).parent
input_dir = base / "inputs"
output_dir = base / "outputs"


def main() -> None:
    files = sorted(file for file in input_dir.glob("*.txt") if file.is_file())
    if not files:
        raise ValueError("inputs 中没有可处理的 txt 文件")
    output_dir.mkdir(exist_ok=True)
    for file in files:
        target = output_dir / f"report-{file.name}"
        content = file.read_text(encoding="utf-8")
        with target.open("x", encoding="utf-8") as output:
            output.write(content)
        print(f"{file.name} -> {target.name}")


if __name__ == "__main__":
    main()
```

## 继续学习

- [返回系列导读](./)
- [上一篇：调用 API：从系统拿客户数据](./21-api-fetch-customers)
- [下一篇：参数配置：不改代码也能换文件](./23-argparse-config)
