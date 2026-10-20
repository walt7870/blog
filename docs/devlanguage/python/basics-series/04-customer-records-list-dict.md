# 列表、字典和表格行：一行、多行、字段名怎样在代码里对应

> 示例文件：`customer_records.py`  
> 示例核验：2026-10-20（Python 3.14，语法下限为 3.10）

这篇文章解释客户表进入 Python 后最常见的结构：一位客户用字典，多位客户用列表。

## 这篇解决什么问题

表格看起来是一整块，但脚本处理时通常拆成：

![客户列表、单条字典与字段值的对应关系](/python/customer-record-shape.svg)

理解这个结构，后面的条件判断、循环、统计和文件输出都会更自然。

## 一位客户用字典

```python
customer = {
    "name": "李雷",
    "phone": "13800000001",
    "city": "上海",
    "source": "官网",
}
```

`"name"`、`"phone"`、`"city"`、`"source"` 是字段名。它们保留了业务含义。

取手机号时写：

```python
customer["phone"]
```

这比记“第几列”更清楚。

## 多位客户用列表

```python
customers = [
    {"name": "李雷", "phone": "13800000001", "city": "上海"},
    {"name": "韩梅梅", "phone": "", "city": "杭州"},
    {"name": "王芳", "phone": "13900000003", "city": ""},
]
```

列表负责保存多条记录。以后用循环处理整张表，就是从这个列表里一位一位取客户。

## 安全取值

字段可能缺失。例如有些客户没有等级字段：

```python
level = customer.get("level", "普通")
```

`get` 的第二个参数是默认值。字段不存在时，程序不会立刻报错，而是使用默认值。

默认值要谨慎使用。手机号、姓名这类关键字段缺失时，通常应该记录到异常名单，而不是直接默认。

`get` 只在键不存在时使用第二个参数；`{"level": None}.get("level", "普通")` 仍是 `None`。如果业务允许把空值也归为普通等级，需要额外写清规则。`customer["phone"]` 在缺键时抛出 `KeyError`，适合已经校验过的必填字段；默认值不能代替输入合同。

## 运行示例

```bash
python3 customer_records.py
```

它会输出：

- 第一位客户姓名。
- 每位客户的结构化描述。
- 最近订单的嵌套字段示例。

## 完整代码要点

```python
customers = [
    {
        "name": "李雷",
        "phone": "13800000001",
        "city": "上海",
        "source": "官网",
        "level": "VIP",
        "last_order": {"order_id": "A1001", "amount": 1200.5, "status": "paid"},
    },
    {
        "name": "韩梅梅",
        "phone": "",
        "city": "杭州",
        "source": "展会",
    },
]

print("第一位客户：", customers[0]["name"])
for item in customers:
    print(f"{item['name']}｜{item.get('phone') or '手机号待补'}")
    last_order = item.get("last_order")
    if last_order is not None:
        print("最近订单：", last_order["order_id"], last_order["status"])
```

这里 `last_order` 是一个嵌套字典。它表示一位客户内部还有一组订单信息。

列表里的元素是对象引用：`first = customers[0]` 后修改 `first["city"]`，也会改变列表中的同一条记录。`dict(item)` 只做浅拷贝，里面的 `last_order` 仍共享；需要保留原始输入时，应另建结果记录，嵌套结构则按实际需求复制。

## 客户结构模板

| 字段 | 类型 | 是否必填 | 默认值 |
| --- | --- | --- | --- |
| `name` | `str` | 是 | 无 |
| `phone` | `str` | 是 | 无，缺失要记录 |
| `city` | `str` | 否 | `城市待补` |
| `source` | `str` | 否 | `未知来源` |
| `level` | `str` | 否 | `普通` |
| `last_order` | `dict` | 否 | 无订单 |

## 常见误区

| 误区 | 后果 | 修正 |
| --- | --- | --- |
| 用列表位置表达字段 | 表头一变，规则全乱 | 用字典 key 表达字段名 |
| 默认值乱用 | 关键缺失被掩盖 | 关键字段缺失要记录 |
| 字段名不统一 | 同一字段有多个写法 | 先约定结构模板 |
| 嵌套太早 | 新手取值路径变复杂 | 先掌握一层结构 |

## 读完之后能完成什么

你应该能把一张客户表想象成“客户字典的列表”，并能写出一个字段结构模板。


## 继续学习

- [返回系列导读](./)
- [上一篇：变量和类型怎么服务业务字段](./03-field-types)
- [下一篇：条件判断：把业务规则写清楚](./05-customer-rules-if)
