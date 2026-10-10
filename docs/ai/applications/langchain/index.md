# LangChain 从入门到工程实践

这是一组写给 Python 开发者的 LangChain 中文教程。它不从 API 清单开始，而是从几个真实问题出发：什么时候只调用模型就够了，什么时候需要工作流，RAG 为什么会答错，Tool 和 Agent 到底有什么区别，以及一个 Demo 距离上线还缺什么。

## LangChain 在一次请求里做什么

![LangChain 与 LangGraph 在应用请求中的职责](/ai/langchain-request-flow.svg)

LangChain 主要统一 Prompt、模型、检索器、Tool 和输出解析器的输入输出，让这些组件可以组合、替换和测试。LangGraph 在此基础上管理共享状态、条件分支、循环和恢复。真正的模型推理仍由模型服务完成，数据库查询和业务写入仍由应用自己的受控代码完成。

如果应用只有一次固定模型调用，直接使用模型 SDK 往往更清楚。组件开始增多时再引入 LangChain，流程出现状态和分支时再引入 LangGraph。

## 这组文章适合谁

你只需要：

- 会写基本的 Python 函数、字典和类型注解；
- 知道大模型可以接收文本并返回文本；
- 愿意在本地运行几条命令观察结果。

不要求你提前了解 LangChain、向量数据库或 Agent。

## 你会学到什么

读完后，你应该能够：

- 清楚解释 LangChain 在应用里的位置；
- 判断应该使用普通 Python、LangChain Runnable，还是 LangGraph；
- 画出一条 RAG 查询从问题到引用答案的完整路径；
- 区分 Tool、确定性工作流和自主 Agent；
- 为模型生成的 SQL 加上真正的程序化护栏；
- 用轨迹、脱敏和固定评测把原型变成可维护的软件。

## 阅读顺序

1. [LangChain 到底是什么](01-what-is-langchain.md)
2. [从函数调用到 LangGraph 状态工作流](02-langgraph-workflow.md)
3. [一次完整 RAG 是怎样运行的](03-rag-from-zero.md)
4. [Tools、工作流与 Agent 不要混为一谈](04-tools-workflows-agents.md)
5. [从 Demo 到可上线的 LangChain 应用](05-production-practices.md)

建议按顺序阅读。每篇约 10-15 分钟，末尾都有一个可以马上动手的练习。

## 代码运行准备

示例按 Python 3.11 及以上版本编写。已经有 `arm_env` 环境时，可以直接安装这一组经过配套验证的依赖：

```bash
conda run -n arm_env python --version
conda run -n arm_env pip install \
  "langchain>=1.3,<1.4" \
  "langgraph>=1.2,<1.3" \
  "langchain-openai>=1.4,<1.5" \
  "langchain-chroma>=1.1,<1.2" \
  "langchain-text-splitters>=1.0,<2" \
  "sqlglot>=27,<28"
conda run -n arm_env python -c "import langchain_core, langgraph; print('ready')"
```

第 1 篇的真实模型调用需要 `OPENAI_API_KEY`。第 2 篇的最小 LangGraph 示例完全离线；其余文章把可离线验证的工作流、检索门控和安全校验作为重点，不要求先搭建完整 Web 系统。

## Demo 与真实模型的区别

实战项目通常同时保留确定性替身和真实模型网关。确定性替身让相同输入得到相同输出，方便离线学习和回归测试；它能演示工作流如何传递状态、检索资料、调用工具和执行护栏，但不代表真实大模型的理解能力。

切换到兼容 OpenAI 接口的模型后，分类、SQL 生成和基于资料回答可以由模型完成。无论使用哪种模型，检索门控、业务护栏、SQL 校验和权限控制都仍然必须由程序负责。

这也是整组文章最重要的原则：**模型负责处理不确定性，代码负责守住确定性边界。**
