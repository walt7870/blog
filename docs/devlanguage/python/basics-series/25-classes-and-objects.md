# 什么时候该用类，把数据和动作放进同一个对象

> 对应视频：EP25《什么时候该用类，把数据和动作放进同一个对象》

字典和函数能完成很多任务。真正需要类的信号不是“代码看起来高级”，而是同一类数据不断带着一组相关动作在不同地方出现。

## 从字典加函数开始

```python
customer = {"name": "李雷", "phone": "13800000001", "source": "官网"}

def is_incomplete(item: dict[str, str]) -> bool:
    return not item["name"] or not item["phone"]
```

字段和动作增加后，调用处会反复传入 `customer`，每个函数也都要记住同一批字段名。此时可以把共同结构和动作收进类。

```python
class Customer:
    def __init__(self, name: str, phone: str, source: str) -> None:
        self.name = name
        self.phone = phone
        self.source = source

    def is_incomplete(self) -> bool:
        return not self.name or not self.phone

    def label(self) -> str:
        return f"{self.name}｜{self.source}"


han_meimei = Customer("韩梅梅", "", "展会")
print(han_meimei.is_incomplete())  # True
```

`Customer` 是类，描述每位客户共有的结构；`han_meimei` 是实例，保存自己的属性。`self` 表示当前正在操作的实例，因此方法可以读取它自己的数据。

## 类和函数怎么选

| 情况 | 优先选择 | 示例 |
| --- | --- | --- |
| 一次输入到一次输出的转换 | 函数 | `clean_source(text)` |
| 一份数据有状态和多种长期动作 | 类 | `customer.is_incomplete()` |
| 多个文件共享单条规则 | 函数或模块 | `checks.is_incomplete(row)` |

类不会替代函数。先把规则写成函数并确认稳定；当数据和多种动作确实长期绑定，再把它们收进对象。

## 继续学习

- [上一篇：交付一个客户可用小工具](./24-delivery-package)
- [下一篇：学完 Python 基础后，怎样从空目录做出第一个可用工具](./26-first-usable-tool)
- [返回系列导读](./)
