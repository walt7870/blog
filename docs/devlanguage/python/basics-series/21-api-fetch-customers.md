# 调用 API：从系统拿客户数据

> 示例文件：`fetch_customers.py`  
> 示例核验：2026-10-20（Python 3.14，语法下限为 3.10）

## 这篇解决什么问题

客户数据来自 CRM 接口，不再手工导出，脚本要看状态码、解析 JSON，并保护访问凭证。

本集产物是：**拉取客户接口样例**。

## 核心判断

接口调用依次经过网络连接、HTTP 状态、JSON 解析和业务结构校验。HTTP 200 只表示传输层面的成功响应，仍可能带业务失败状态。超时、401 未认证、429 限流和 500 服务错误需要分别定位；不能把所有错误都当成“客户列表为空”。

![HTTP响应经过状态、解析和业务校验后进入客户规则](/python/api-response-gates.svg)

凭证从环境变量或凭证服务读取，不写进源码、URL 查询参数或日志。列表接口通常有分页，单次返回 100 条不代表系统只有 100 位客户；先核对游标、总数与终止条件，再汇总。本文离线例子只演示响应进入程序的方式，不会发出网络请求。

## 运行示例

```bash
python3 fetch_customers.py
```

离线例子预期输出 2 位客户和韩梅梅的待补提醒。把模拟状态码改为 401，应停止处理；若真实接口返回无法解析的 JSON，应保留接口路径、状态与请求标识排错，避免输出包含凭证的完整请求。

## 完整示例

### fetch_customers.py

```python
from __future__ import annotations

# 为了让示例离线可运行，这里模拟一次 API 响应。
response = {
    "status_code": 200,
    "json": {
        "customers": [
            {"name": "李雷", "phone": "13800000001"},
            {"name": "韩梅梅", "phone": ""},
        ]
    },
}


def main() -> None:
    if response["status_code"] != 200:
        raise RuntimeError(f"接口失败：{response['status_code']}")

    customers = response["json"]["customers"]
    print(f"接口客户数量：{len(customers)}")
    for customer in customers:
        print(f"- {customer['name']}｜{customer.get('phone') or '手机号待补'}")


if __name__ == "__main__":
    main()
```

## 接入真实接口

标准库可以发起一次带超时的 GET，下面函数仅在调用时访问传入的接口，令牌来自 `CRM_API_TOKEN`。正式地址应使用 HTTPS；本地演练可使用本机 HTTP 服务，不要把真实令牌发给演练地址。

```python
import json
import os
from urllib.request import Request, urlopen


def fetch_customer_page(url: str) -> dict:
    token = os.environ["CRM_API_TOKEN"]
    request = Request(url, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    })
    with urlopen(request, timeout=10) as response:
        payload = json.load(response)
    if not isinstance(payload, dict) or not isinstance(payload.get("customers"), list):
        raise ValueError("响应缺少 customers 数组")
    return payload
```

`urlopen` 对 HTTP 错误抛出 `HTTPError`，网络错误或超时也会向上传递；调用方可据此报告失败，不能无上限重试。`timeout=10` 是阻塞网络操作的超时参数，不保证整个多次读取或多页任务在 10 秒内完成；整批任务还需截止时间。此函数只取一页，游标字段及记录校验必须按接口合同补齐，结构校验可参考 [JSON](./12-json-api-shape)。

## 继续学习

- [返回系列导读](./)
- [上一篇：日志：给别人运行时留下线索](./20-logging)
- [下一篇：批量文件自动化](./22-batch-files)
