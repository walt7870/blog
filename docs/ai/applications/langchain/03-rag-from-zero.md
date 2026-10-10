# 03. 一次完整 RAG 是怎样运行的

大模型知道很多公开知识，却不知道你公司昨天更新的退款政策，也无法天然给出可核验的内部文档来源。把整份资料直接塞进 Prompt 又会遇到长度、成本和噪声问题。

RAG 的做法是：**先找到与问题相关的资料，再让模型只根据这些资料回答。**

## RAG 解决什么问题

RAG 是 Retrieval-Augmented Generation，即“检索增强生成”。它把一次问答拆成两类职责：

- 检索系统负责从可信资料中寻找证据；
- 生成模型负责把证据组织成人类可读的回答。

它主要解决：

- 私有资料不在模型训练数据里；
- 文档频繁更新，不适合反复训练模型；
- 回答需要引用来源；
- 没有证据时应该拒答，而不是依靠常识猜测。

RAG 不保证答案一定正确。如果切分、Embedding、检索或门控有问题，模型拿到的仍然可能是错误上下文。

## 离线实验准备

准备三份短 Markdown：退款政策、配送说明和产品手册。Embedding 可以先用本地模型或确定性测试替身，向量库使用本地 Chroma。第一轮实验同时准备两个问题：

```python
questions = [
    "退款审核通过后多久到账？",  # 知识库内问题
    "火星天气怎么样？",          # 知识库外问题
]
```

每次运行都要输出答案、引用文档、片段 ID、摘录和相关性分数。先不要只看答案，RAG 的关键在于这条证据链能不能被核验。

## 文档如何进入向量库

入库不是“把文件交给大模型记住”，而是一条独立的数据处理链：

```text
TXT / Markdown / PDF
        ↓
提取文本
        ↓
RecursiveCharacterTextSplitter
        ↓
Document(page_content, metadata)
        ↓
Embedding
        ↓
Chroma 向量库
```

核心写法可以简化为：

```python
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=420,
    chunk_overlap=60,
)
chunks = splitter.split_text(text)

documents = [
    Document(
        page_content=chunk,
        metadata={
            "document": filename,
            "chunk_id": f"{document_id}-{index + 1}",
        },
    )
    for index, chunk in enumerate(chunks)
]

vector_store.add_documents(documents, ids=[
    document.metadata["chunk_id"] for document in documents
])
```

这里有三个容易忽略的决定。

第一，`chunk_size` 不是越大越好。过大的片段会混入无关主题，过小则容易丢失上下文。

第二，`chunk_overlap` 用少量重复避免一句话恰好被切在边界上，但重叠太多会制造大量近似结果。

第三，`metadata` 必须从入库时就设计好。没有文档名和片段 ID，后面就很难提供可靠引用。

## 一次查询的四个节点

可以用 LangGraph 把查询分成四步：

```text
rewrite -> retrieve -> grade -> answer
```

### 1. rewrite：整理查询

当前离线实现只做 `strip()`，目的是把这个节点位置显式保留下来。生产环境可以在这里消除对话指代，例如把“它多久到账”改写成“退款审核通过后多久到账”。

### 2. retrieve：召回候选片段

真实执行路径直接调用 Chroma 集成：

```python
documents = self.vector_store.similarity_search(query, k=4)
```

`similarity_search` 返回 LangChain `Document`，正文位于 `page_content`，来源信息位于 `metadata`。项目随后增加一个可解释的词元重合分数，方便离线实验观察相关性。

这里的 `k=4` 只是候选数量，不表示四个结果都应该交给模型。

### 3. grade：相关性门控

项目根据最高分动态计算门槛：

```python
best_score = max((score for _, score in retrieved), default=0.0)
threshold = max(0.18, best_score * 0.6)
relevant = [item for item in retrieved if item[1] >= threshold]
```

这一步是确定性代码，不是 Prompt 建议。它决定哪些证据可以进入回答节点。

### 4. answer：依据证据回答

如果 `relevant` 为空，工作流直接返回 `insufficient_context`。只有存在可靠片段时，才调用：

```python
service.gateway.answer_from_context(
    state["question"],
    [document.page_content for document, _ in relevant],
)
```

## 为什么需要相关性门控

向量库通常总能返回“最相似”的内容，即使所有内容都不相关。

假设知识库只有退款和耳机说明，你问：

```text
火星天气怎么样？
```

向量库仍可能返回某个片段。没有门控时，模型会看到一段与火星无关的资料，然后可能用自己的常识继续回答。这就违背了企业知识库问答的目标。

把“火星天气怎么样？”交给同一查询函数。正确行为不是“尽量回答”，而是返回 `insufficient_context` 并明确说明资料不足。

## 引用与拒答

回答中的引用来自通过门控的 `Document.metadata`，而不是让模型自己编造文件名：

```python
Citation(
    document=document.metadata["document"],
    chunk_id=document.metadata["chunk_id"],
    excerpt=document.page_content[:180],
    score=round(score, 4),
)
```

可靠的 RAG 至少要同时提供：

- 回答；
- 来源文档；
- 可定位的片段；
- 没有证据时的明确状态。

只有一段自然语言答案，无法证明系统真的使用了资料。

## RAG 常见失败

### 找不到正确片段

检查切分是否破坏语义、Embedding 是否适合当前语言，以及查询是否需要改写。

### 找到了片段但答案仍错

检查 Prompt 是否明确限制“只依据资料”，上下文里是否混入冲突或低质量片段。

### 所有问题都能得到答案

这通常不是优点。检查是否缺少相关性门控和拒答测试。

### 引用看起来正确但无法定位

检查入库时是否保存稳定的文档 ID、片段 ID、页码或 URL。

### 更新文档后仍命中旧内容

需要设计版本更新、旧向量删除和重建机制。常见做法是先删除同一文档 ID 的旧片段，再写入带新版本号的片段。

## 如何评测

不要用“我问了几个问题，感觉还行”作为验收标准。至少准备三类固定样本：

1. 有明确答案的问题，检查答案与引用；
2. 换一种表达的问题，检查召回稳定性；
3. 知识库外的问题，检查是否拒答。

把这些预期写成 RAG 测试和固定评测集，修改切分参数、阈值或模型后才能发现回归。

## 动手练习

1. 分别请求“退款多久到账？”和“火星天气怎么样？”，比较 `status` 与 `citations`。
2. 修改退款政策的一个副本并重新入库，观察片段数量、版本号和旧片段是否被清理。
3. 把问题换成同义表达，查看检索片段和分数是否变化。
4. 阅读 `grade` 节点，把最低阈值从 `0.18` 提高，预测哪些测试可能失败，再运行测试验证。

## 小结

完整 RAG 不只是“向量检索 + 模型”。它还包括可靠入库、查询处理、相关性门控、引用、拒答和评测。LangChain 提供统一的 `Document`、文本切分器和向量库集成；LangGraph 让这些步骤和状态变得显式。

下一篇，我们会讨论另一个经常被混淆的主题：一个函数注册成 Tool 后，是否就意味着系统已经是 Agent？

[上一篇：LangGraph 状态工作流](02-langgraph-workflow.md) · [返回目录](./) · [下一篇：Tools 与 Agent](04-tools-workflows-agents.md)
