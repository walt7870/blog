# JSON：系统接口常见的数据形态

> 示例文件：`parse_api_json.py`  
> 最后核验：2026-08-02

本文围绕“JSON 和字典、列表是什么关系”展开，结合可运行示例说明输入、规则、输出和改造边界。

## 这篇解决什么问题

系统导出的客户数据不是表格，而是一段 JSON，脚本要知道怎样取出客户列表。

本集产物是：**接口样例解析**。

## 核心判断

- `json` 要服务于真实客户数据处理。
- `嵌套结构` 要服务于真实客户数据处理。
- `dict/list 映射` 要服务于真实客户数据处理。
- `默认值` 要服务于真实客户数据处理。

判断是否学会，不看能不能背概念，而看能不能运行脚本并得到可复查输出。

## 运行示例

```bash
python3 parse_api_json.py
```

运行后检查三件事：

- 输入数据是否符合本集假设。
- 规则输出是否能解释。
- 文件或终端结果是否方便客户复核。

## 完整示例

### parse_api_json.py

```python
from __future__ import annotations

import json
from pathlib import Path

response_file = Path(__file__).with_name("crm_response.json")


def main() -> None:
    payload = json.loads(response_file.read_text(encoding="utf-8"))
    customers = payload.get("data", {}).get("customers", [])

    print(f"接口状态：{payload.get('status')}")
    print(f"客户数量：{len(customers)}")
    for customer in customers:
        print(f"- {customer['name']}｜{customer.get('phone') or '手机号待补'}")


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
- [上一篇：读写 CSV 文件](./11-csv-read-write)
- [下一篇：Excel/表格实战入口](./13-table-health-check)
