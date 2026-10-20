<script setup>
import { withBase } from 'vitepress'
</script>

# 02. 从函数调用到 LangGraph 状态工作流

一个模型调用很好理解：输入进去，结果出来。真正的业务流程却经常是“先判断，再执行，再检查，最后回复”。当步骤开始共享状态、出现分支和错误路径时，代码很容易变成一团嵌套条件。

LangGraph 用状态图表达这种流程。

![客服状态图：先检查输入和升级条件，再调用工具](/ai/langgraph-support-routing.svg)

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

先按[运行准备](./#代码运行准备)安装依赖，下面的例子不调用模型，可在激活虚拟环境后运行：

```bash
python - <<'PY'
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

输出中会同时保留原始 `message`、分类结果 `intent` 和最终 `answer`。节点只返回自己负责的更新，默认同名字段被新值覆盖；要追加消息或合并列表，必须为对应字段声明 reducer。`TypedDict` 描述字段类型，不等于执行了输入校验，API 边界仍需单独验证。

这里完全没有“智能决策”。图的结构是代码预先定义的，分类也只是普通规则。这一点非常重要。

## 客服工作流逐步拆解

生产客服工作流应先校验输入、身份和风险，再执行工具。完整<a :href="withBase('/ai/examples/workflow_demo.py')" download="workflow_demo.py">离线示例</a>采用三个节点与条件边：

```text
classify -> guardrail -> respond（仅ready时查询）
                     -> END（缺输入或转人工）
```

### classify：识别意图和参数

该节点用规则产生有限意图标签，并用正则提取教学订单号。替换为模型分类后，仍需校验标签和订单格式；模型不能提供已登录用户的可信身份。

输出示意：

```python
{
    "intent": "order_status",
    "order_no": "DEMO001",
}
```

### guardrail：执行业务硬规则

查订单但没有订单号时返回 `needs_input`；破损或赔偿请求进入 `escalated`；其余情况才正常完成。

护栏是独立节点的好处是，它不会因为 Prompt 改写或模型更换而消失。

### respond：产生受控回复

`ready` 才进入该节点，按意图确定是否调用订单 Tool，再用固定模板回复；其他状态直接结束，不先创建工单再检查赔偿权限。真实查单服务必须用服务端身份验证订单归属。示例没有身份系统，只能访问教学订单。

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

如果回答节点调用模型超时，应记录 `respond` 节点失败。节点命名不会自动完成日志脱敏和业务审计，事件采集仍需实现。

图本身也不会自动持久化。上述 `compile()` 没有配置 checkpointer，进程退出后不能从检查点继续。需要恢复时，配置持久化存储和稳定的 `thread_id`；恢复可能从节点开头重新执行，因此数据库写入要使用业务幂等键。检查点不提供外部副作用的恰好一次保证。

## 不使用 LangGraph 时

普通 Python 可以写成：

```python
def run_support(message: str) -> dict:
    intent = classify(message)
    status = apply_guardrail(intent, message)
    if status != "ready":
        return {"status": status}
    tool_calls = use_tools(intent, message)
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

下一篇讨论 RAG 的证据链：先检索资料，再判断证据是否足够，最后决定回答还是拒答。离线示例先用普通函数演示门控，复杂分支再考虑组织为状态图。

[上一篇：LangChain 到底是什么](01-what-is-langchain.md) · [返回目录](./) · [下一篇：完整 RAG](03-rag-from-zero.md)
