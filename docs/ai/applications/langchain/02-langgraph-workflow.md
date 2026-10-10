# 02. 从函数调用到 LangGraph 状态工作流

一个模型调用很好理解：输入进去，结果出来。真正的业务流程却经常是“先判断，再执行，再检查，最后回复”。当步骤开始共享状态、出现分支和错误路径时，代码很容易变成一团嵌套条件。

LangGraph 用状态图表达这种流程。

## 为什么普通函数开始失控

以客服为例，一条消息可能需要：

1. 识别是查订单、问政策还是破损投诉；
2. 提取订单号；
3. 调用不同业务函数；
4. 对赔偿和隐私问题强制升级人工；
5. 根据前面所有结果生成回复；
6. 记录每一步输入、输出和错误。

普通 Python 当然能完成。但如果所有逻辑都塞进一个函数，任何一步变化都会影响整段代码，失败时也很难说明“流程走到了哪里”。

LangGraph 没有消灭这些业务逻辑。它只是把逻辑拆成明确节点，并约定状态如何在节点间传递。

## State、Node 与 Edge

理解 LangGraph 只需要先抓住三个概念：

- **State**：本次运行共享的数据；
- **Node**：读取状态并返回部分更新的函数；
- **Edge**：规定节点的执行顺序。

一张图可以写成：

```text
START -> classify -> respond -> END
```

状态则可能从：

```python
{"message": "退款有什么要求？"}
```

逐步变成：

```python
{
    "message": "退款有什么要求？",
    "intent": "policy",
    "answer": "签收后 7 天内可申请退货。",
}
```

## 一个可离线运行的最小图

下面的例子不调用模型，可以直接在项目根目录运行：

```bash
conda run --no-capture-output -n arm_env python - <<'PY'
from typing import TypedDict

from langgraph.graph import END, START, StateGraph


class SupportState(TypedDict, total=False):
    message: str
    intent: str
    answer: str


def classify(state: SupportState) -> SupportState:
    intent = "policy" if "退款" in state["message"] else "general"
    return {"intent": intent}


def respond(state: SupportState) -> SupportState:
    if state["intent"] == "policy":
        answer = "退款审核通过后，通常会在 3-5 个工作日内原路退回。"
    else:
        answer = "我可以帮助查询退款政策。"
    return {"answer": answer}


builder = StateGraph(SupportState)
builder.add_node("classify", classify)
builder.add_node("respond", respond)
builder.add_edge(START, "classify")
builder.add_edge("classify", "respond")
builder.add_edge("respond", END)
graph = builder.compile()

print(graph.invoke({"message": "退款多久到账？"}))
PY
```

输出中会同时保留原始 `message`、分类结果 `intent` 和最终 `answer`。节点只返回自己负责的更新，LangGraph 负责合并状态并按边执行。

这里完全没有“智能决策”。图的结构是代码预先定义的，分类也只是普通规则。这一点非常重要。

## 客服工作流逐步拆解

一个实用的客服图可以拆成四个节点：

```text
classify -> tools -> guardrail -> respond
```

### classify：识别意图和参数

这一节点通过 `ModelGateway` 取得有限的意图标签，并用确定性正则提取订单号。离线模式使用规则，真实模型模式才会调用模型。

输出示意：

```python
{
    "intent": "order_status",
    "order_no": "HB20260722001",
    "tool_calls": [],
}
```

### tools：确定性路由业务函数

节点根据已经得到的意图执行 `lookup_order`、`search_policy` 或 `create_ticket`。下一步由 `if` 分支决定，不是模型自由选择。

### guardrail：执行业务硬规则

查订单但没有订单号时返回 `needs_input`；破损或赔偿请求进入 `escalated`；其余情况才正常完成。

护栏是独立节点的好处是，它不会因为 Prompt 改写或模型更换而消失。

### respond：产生受控回复

最后一步读取统一状态生成回复。示例使用确定性模板，因此不会做未经授权的承诺。

## 工作流不等于 Agent

这条客服链是一条**确定性路由工作流，不等于 Agent**。

| 问题 | 当前客服工作流 | 自主 Agent |
| --- | --- | --- |
| 谁决定下一步 | 程序中的边和条件 | 模型 |
| 是否可以循环 | 当前不循环 | 通常可以 |
| 可预测性 | 高 | 较低 |
| 适合场景 | 客服、审批、安全流程 | 开放式探索任务 |

把普通工作流都称为 Agent，会掩盖真正重要的风险：模型是否拥有行动决策权，以及它可以连续行动多少次。

## 运行轨迹与失败定位

图让每一步有了名字，也让观察变得自然。生产实现可以为每次运行保存这些事件：

- `node_started`：节点收到什么安全输入；
- `tool_called`：调用了哪个工具；
- `node_completed`：输出和耗时；
- `run_failed`：运行在哪个节点失败；
- `run_completed`：最终结果。

如果回答节点调用模型超时，运行不会只留下一个模糊的 500 错误，而是能指出 `answer` 节点失败。调试多步骤系统时，这通常比“少写几行代码”更有价值。

## 不使用 LangGraph 时

普通 Python 可以写成：

```python
def run_support(message: str) -> dict:
    intent = classify(message)
    tool_calls = use_tools(intent, message)
    status = apply_guardrail(intent, message)
    answer = respond(intent, tool_calls, status)
    return {"answer": answer, "status": status}
```

对于四个固定步骤，这依然很清楚。下面这些需求出现后，图结构才更值得：

- 多个条件分支；
- 失败后从指定节点恢复；
- 人工审批后继续；
- 循环执行直到满足停止条件；
- 每个节点需要独立观察和评测。

不要因为用了大模型，就默认需要 LangGraph。

## 动手练习

1. 运行最小图，把 `classify` 改成支持 `order_status`，观察状态如何增加字段。
2. 在 `classify` 和 `respond` 之间加入 `guardrail` 节点，对“赔偿”消息固定返回“转人工”。
3. 为缺订单号、政策查询和破损升级各写一个测试，断言最终状态和经过的节点。
4. 思考一个你熟悉的审批流程：哪些判断必须写成确定性节点，绝不能交给模型？

## 小结

LangGraph 把共享状态、多步骤执行和分支变成显式结构。它的价值不是让模型更自主，而是让复杂流程更容易理解、测试和恢复。

下一篇，我们会把这个状态图用于 RAG：先检索资料，再判断证据是否足够，最后决定回答还是拒答。

[上一篇：LangChain 到底是什么](01-what-is-langchain.md) · [返回目录](./) · [下一篇：完整 RAG](03-rag-from-zero.md)
