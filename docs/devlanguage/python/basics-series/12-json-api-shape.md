# JSON：系统接口常见的数据形态

> 示例文件：`parse_api_json.py`  
> 示例核验：2026-10-20（Python 3.14，语法下限为 3.10）

## 这篇解决什么问题

系统导出的客户数据不是表格，而是一段 JSON，脚本要知道怎样取出客户列表。

本集产物是：**接口样例解析**。

## 核心判断

JSON 是交换格式，`json.loads` 才把文本转换为 Python 对象：对象对应 `dict`，数组对应 `list`，`null` 对应 `None`。解析成功只表示语法合法，不表示返回内容符合客户接口的约定；`{"data": null}` 仍是合法 JSON。

![JSON文本先解析，再校验结构，最后取客户数组](/python/json-response-contract.svg)

这里规定成功响应必须包含 `status="ok"`、对象 `data` 和数组 `customers`。不能用一串 `.get(..., {})` 静默把缺失客户数组当成“零位客户”，否则接口改字段名也会生成看似正常的空报表。数组中每项也要符合记录结构，异常要指出位置。

## 运行示例

```bash
python3 parse_api_json.py
```

先在脚本旁放入 `crm_response.json`：

```json
{"status":"ok","data":{"customers":[{"name":"李雷","phone":"13800000001"},{"name":"韩梅梅","phone":""}]}}
```

预期客户数量 2，韩梅梅显示手机号待补。把 `customers` 改成空数组应输出 0；删掉此字段、改为 `null` 或改成对象，应给出结构错误，不能与正常空数组混为一谈。

## 完整示例

### parse_api_json.py

```python
from __future__ import annotations

import json
from pathlib import Path

response_file = Path(__file__).with_name("crm_response.json")


def main() -> None:
    payload = json.loads(response_file.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or payload.get("status") != "ok":
        raise ValueError("客户响应不是成功对象")
    data = payload.get("data")
    if not isinstance(data, dict) or not isinstance(data.get("customers"), list):
        raise ValueError("data.customers 必须是数组")
    customers = data["customers"]
    for index, item in enumerate(customers, start=1):
        if not isinstance(item, dict) or not isinstance(item.get("name"), str):
            raise ValueError(f"第 {index} 条客户缺少文本姓名")

    print(f"接口状态：{payload.get('status')}")
    print(f"客户数量：{len(customers)}")
    for customer in customers:
        print(f"- {customer['name']}｜{customer.get('phone') or '手机号待补'}")


if __name__ == "__main__":
    main()
```

## 继续学习

- [返回系列导读](./)
- [上一篇：读写 CSV 文件](./11-csv-read-write)
- [下一篇：Excel/表格实战入口](./13-table-health-check)
