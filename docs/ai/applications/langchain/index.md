<script setup>
import { withBase } from 'vitepress'
</script>

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

按顺序阅读可以把组件组合、状态流转、检索和执行边界串起来。示例统一使用订单与退款场景，金额、订单和政策均为教学数据。

## 代码运行准备

示例使用 Python 3.11。建立独立虚拟环境，避免依赖修改影响其他项目。以下固定版本对应 2026-10-20 的验证环境：

```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install \
  "langchain==1.4.6" "langgraph==1.2.16" \
  "langchain-openai==1.7.2" "langchain-chroma==1.1.0" \
  "langchain-text-splitters==1.1.3" "sqlglot==30.23.0"
python -c "import langchain_core, langgraph; print('ready')"
```

Windows PowerShell 使用 `.venv\Scripts\Activate.ps1` 激活环境。第 1 篇的真实模型调用需要 `OPENAI_API_KEY` 和账户可用的模型标识；兼容接口还应检查工具调用、结构化输出和参数支持，不能仅以 URL 相同就认为能力一致。

完整的<a :href="withBase('/ai/examples/workflow_demo.py')" download="workflow_demo.py">离线示例源码</a>包含客服状态图、检索门控、Tool 注册和 SQLite 校验。下载后在文件所在目录执行：

```bash
python workflow_demo.py check
python workflow_demo.py support '查询订单DEMO001'
python workflow_demo.py rag '退款多久到账？'
python workflow_demo.py sql 'SELECT SUM(amount) FROM sales'
```

`check` 覆盖 15 组成功和拒绝场景。示例不请求远程模型、不创建真实工单、不连接业务数据库。RAG 使用小词表检索替身，专门演示证据不足时如何停止；它不衡量真实 Embedding、生成模型或生产检索质量。文中的 Chroma 片段属于替换检索层的集成入口，不是该离线文件已经包含的功能。

需要复现同一组间接依赖时，可使用[完整依赖锁定文件](/ai/examples/requirements-lock.txt)，在 Python 3.11 虚拟环境中运行 `python -m pip install -r requirements-lock.txt`。它对应本地教学验证环境；部署到其他操作系统和架构时还需验证相应二进制包是否可用。

截至 2026-10-20，锁文件中的 ChromaDB 1.5.9 有代码注入和跨租户权限校验漏洞，安全公告尚未标注已修复版本。这份锁文件仅用于隔离的本地教学复现，不能作为生产部署基线；不要启动对外服务、导入不可信数据库或加载第三方执行代码。前面的离线示例使用检索替身，不启动 Chroma 服务。接入真实检索层前，需要重新核对修复版本、数据来源和权限隔离，再验证集成行为。

## Demo 与真实模型的区别

实战项目通常同时保留确定性替身和真实模型网关。确定性替身让相同输入得到相同输出，方便离线学习和回归测试；它能演示工作流如何传递状态、检索资料、调用工具和执行护栏，但不代表真实大模型的理解能力。

切换到兼容 OpenAI 接口的模型后，分类、SQL 生成和基于资料回答可以由模型完成。无论使用哪种模型，检索门控、业务护栏、SQL 校验和权限控制都仍然必须由程序负责。

这也是整组文章最重要的原则：**模型负责处理不确定性，代码负责守住确定性边界。**
