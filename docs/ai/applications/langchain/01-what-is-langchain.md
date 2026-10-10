# 01. LangChain 到底是什么

很多教程从 `pip install langchain` 开始，接着连续展示十几个类。读完以后，你可能会调用 API，却还是不知道 LangChain 解决了什么问题。

我们换一个顺序：先理解它在应用里的位置，再看代码。

## 先说结论

**LangChain 不是大模型，也不会让模型自动变聪明。**

它是一套应用编排工具，帮助你把这些东西连接起来：

- Prompt：怎样组织输入；
- Model：调用哪个模型；
- Retriever：从哪里寻找资料；
- Tool：允许系统执行哪些业务函数；
- State：多步执行期间保存什么；
- Trace：每一步发生了什么。

单次模型调用像调用一个远程函数。真正的 AI 应用往往需要先查数据、再判断、再调用工具、最后检查结果。LangChain 的价值主要出现在这些连接处。

## 从一次普通模型调用说起

不使用 LangChain 时，调用模型通常类似这样：

```python
from openai import OpenAI

client = OpenAI()
response = client.chat.completions.create(
    model="gpt-4.1-mini",
    messages=[
        {"role": "system", "content": "你是客服助手，只回答退款政策。"},
        {"role": "user", "content": "退款多久到账？"},
    ],
)
print(response.choices[0].message.content)
```

这段代码没有问题。如果需求始终只有“一次固定调用”，直接使用模型 SDK 通常更简单。

变化从这里开始：

1. Prompt 需要复用和测试；
2. 模型可能切换；
3. 输出要继续交给解析器；
4. 调用前要先检索内部资料；
5. 某些结果要进入工具或工作流；
6. 出错时要知道失败在哪一步。

你当然可以继续手写这些胶水代码。LangChain 做的事情，是为这些常见连接提供统一接口。

## LangChain 的五层心智模型

可以把常用能力理解成五层。

| 层次 | 解决的问题 | 常见对象 |
| --- | --- | --- |
| 输入层 | 如何稳定地组织消息和变量 | `ChatPromptTemplate` |
| 模型层 | 如何用统一方式调用不同模型 | `ChatModel` |
| 组合层 | 如何把多个步骤串联起来 | `Runnable`、LCEL |
| 外部能力层 | 如何获取资料或执行函数 | `Retriever`、`Tool` |
| 状态工作流层 | 如何表达节点、分支、循环和恢复 | `StateGraph` |

其中最重要的抽象是 **Runnable**：一个有输入、有输出、可以被调用和组合的步骤。

LCEL（LangChain Expression Language）则是组合 Runnable 的写法。`a | b | c` 表示把 `a` 的输出交给 `b`，再把 `b` 的输出交给 `c`。

LangGraph 位于更高一层。当执行不再是一条直线，而是包含共享状态、条件分支、循环或失败恢复时，用图比不断嵌套 `if/else` 更清楚。

## 第一个 Runnable

下面是一条最小的真实模型链。它需要配置 `OPENAI_API_KEY`，但代码展示的重点是三个职责清楚的步骤：Prompt、Model、Parser。

```python
import os

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

prompt = ChatPromptTemplate.from_messages([
    ("system", "用一句朴素的话解释这个技术概念。"),
    ("human", "{concept}"),
])

model = ChatOpenAI(
    model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
    base_url=os.getenv("OPENAI_BASE_URL"),
    api_key=os.environ["OPENAI_API_KEY"],
    temperature=0,
)

chain = prompt | model | StrOutputParser()
answer = chain.invoke({"concept": "LangChain Runnable"})
print(answer)
```

逐段看：

- `prompt` 把字典输入转换为模型消息；
- `model` 把消息转换为模型响应；
- `StrOutputParser` 只取最终文本；
- `chain.invoke(...)` 通过统一入口运行整条链。

统一入口的意义不是少写几行，而是后续更容易替换组件、批量调用、接入流式输出或记录轨迹。

## 不使用 LangChain 时

同样的流程用普通 Python 完全可以写：

```python
def explain(concept: str, client) -> str:
    messages = [
        {"role": "system", "content": "用一句朴素的话解释这个技术概念。"},
        {"role": "user", "content": concept},
    ]
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=messages,
    )
    return response.choices[0].message.content or ""
```

判断标准很简单：

- 只有一个固定调用：普通 Python 或官方 SDK 更直接；
- 有多个可替换步骤：Runnable 开始有价值；
- 有检索和工具：统一数据契约能减少重复适配；
- 有状态、分支或循环：考虑 LangGraph；
- 只是为了“看起来像 AI 工程”：不要引入框架。

## 生产代码怎样解耦模型

业务代码不应直接依赖某一个模型供应商。可以先定义一层很薄的模型网关，让工作流只依赖业务语义：

```python
from typing import Protocol


class ModelGateway(Protocol):
    def classify_support(self, message: str) -> str: ...
    def generate_sql(self, question: str, schema: str) -> str: ...
    def answer_from_context(self, question: str, contexts: list[str]) -> str: ...
```

离线测试使用确定性实现，真实环境再用 `ChatOpenAI.invoke()` 实现相同接口。这样不配置 API Key 也能测试状态流转、检索门控和业务护栏，切换模型时也不用改业务节点。

这也演示了一个实用原则：**先让业务流程和模型供应商解耦，再决定使用哪个模型。**

## 常见误区

### 误区一：用了 LangChain，答案就会更准

不会。答案质量仍取决于模型、Prompt、上下文和评测。LangChain 主要改善组织方式。

### 误区二：所有调用都要写成链

不需要。两三行清楚的 Python 通常比为了形式而创建的链更容易维护。

### 误区三：Chain 和 Agent 是同一个东西

不是。Chain 通常按预设顺序执行；Agent 允许模型决定下一步，风险和成本都更高。

### 误区四：LangGraph 取代 LangChain

不是。LangGraph 负责有状态工作流，节点内部仍可使用 LangChain 的 Prompt、Model、Retriever 和 Tool。

## 动手练习

1. 按上面的 `ModelGateway` 写一个规则版实现，让三个方法都返回固定、可断言的结果。
2. 思考你的一个现有模型调用：它只有一个步骤，还是已经包含检索、解析、重试或工具？
3. 有 API Key 时运行上面的 Runnable，把 `StrOutputParser` 去掉，观察模型原始响应对象与纯字符串的区别。

## 小结

LangChain 是编排层，不是智能本身。先问清楚应用是否真的存在多个需要连接、替换或观察的步骤，再决定是否引入它。

下一篇，我们会离开直线型 Chain，使用一个完全离线可运行的 LangGraph，看看状态怎样在节点之间流动。

[返回系列目录](./) · [下一篇：LangGraph 状态工作流](02-langgraph-workflow.md)
