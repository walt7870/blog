# 常见报错怎么读

> 示例文件：`error_examples.py`  
> 示例核验：2026-10-20（Python 3.14，语法下限为 3.10）

## 这篇解决什么问题

脚本报错后客户只看到一屏英文，不知道应该看文件、行号还是最后一行异常类型。

本集产物是：**报错排查卡片**。

## 核心判断

先读最后一行的异常类型和值，再向上定位最接近失败位置的业务代码帧。调用栈通常从外层到内层显示；最下面的业务行更接近直接失败点，但根因可能在上游输入。遇到异常链时，还要读 `During handling...` 或 `direct cause` 前后的两段信息。

![从异常类型回到业务代码，再核对原始输入](/python/traceback-reading-path.svg)

例如 `amount = int("500元")` 报 `ValueError`，根因是输入包含单位，不是整数类型失效。先确认字段合同究竟允许“500元”还是只接受“500”，再决定转换或拒绝。不能为了消除红字就包一层 `except: pass`。

```text
Traceback (most recent call last):
  File "order_check.py", line 12, in <module>
    amount = int("500元")
ValueError: invalid literal for int() with base 10: '500元'
```

保留报错类型、相关调用帧、运行命令和最小输入。日志含客户姓名、电话或凭证时，应先去除这些值再分享；定位问题通常只需要字段结构与异常值类型。

## 运行示例

```bash
python3 error_examples.py
```

下面脚本打印四类错误说明卡片，不会主动抛出异常。另在独立练习文件中只放 `int("500元")`，观察实际 `ValueError` 与行号，再改为 `int("500")` 确认通过。行号随文件变化，应以本机报错为准。

## 完整示例

### error_examples.py

```python
from __future__ import annotations

examples = {
    "FileNotFoundError": "文件路径不对或文件不存在",
    "KeyError": "字典里没有这个字段名",
    "ValueError": "值的格式不能转换成目标类型",
    "TypeError": "值的类型不支持当前操作",
}


def main() -> None:
    print("常见报错阅读卡片：")
    for error, meaning in examples.items():
        print(f"- {error}: {meaning}")


if __name__ == "__main__":
    main()
```

## 继续学习

- [返回系列导读](./)
- [上一篇：虚拟环境和依赖](./17-venv-dependencies)
- [下一篇：异常处理：让脚本遇到坏数据不断掉](./19-exception-handling)
