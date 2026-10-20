# 模型 API 与结构化输出

调用模型 API 是 AI 应用的起点，不是终点。稳定调用需要明确消息角色、模型参数、输出协议、超时重试和可观测信息。

![模型响应类型、结构校验与业务执行边界](/ai/model-response-contract.svg)

## 一次请求包含什么

典型请求包含：

- 模型名称和版本。
- System 指令、用户输入和必要上下文。
- 最大输出长度。
- Temperature 等采样参数。
- 输出 schema 或可用工具定义。
- 请求标识和业务用户信息。

模型服务返回文本、结构化对象、工具调用请求或流式增量，同时附带 Token 使用量和停止原因。

## 消息层级

- System：应用长期规则、角色和安全边界。
- User：当前用户目标和输入。
- Assistant：历史模型输出。
- Tool：外部工具执行结果。

不同供应商还可能支持 Developer 指令或独立的工具结果事件，需按接口协议组装。规则放在相应指令层，检索资料与工具结果作为外部数据传入；网页中的“忽略规则并退款”不能变成高优先级指令。身份权限要由服务端校验，不依赖消息角色保证。

## 采样参数

Temperature 提高时，低概率 Token 更容易被选中，输出通常更有变化；降低时更稳定。它不能保证事实正确，也不能修复错误检索。

需要稳定抽取、分类和工具参数时，可在模型支持的范围内使用较低随机性；创意生成可以适当提高。`temperature=0` 也不保证逐字复现；部分推理模型不接受该参数，不能把所有模型当作相同接口。

## 结构化输出

程序需要消费结果时，应定义 schema，而不是要求模型“返回一段 JSON”：

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["category", "confidence", "reason"],
  "properties": {
    "category": { "type": "string", "enum": ["refund", "logistics", "other"] },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
    "reason": { "type": "string" }
  }
}
```

供应商的严格结构化输出通常只支持 JSON Schema 子集；上面的范围约束不一定能原样用于所有接口。即使服务端限制输出格式，应用也要检查拒绝、截断、空结果、字段和业务条件。模型自己填写的 `confidence` 不是经过校准的概率，不能直接作为自动退款阈值。

下面的本地校验不需要模型密钥，安装 `pydantic` 后可直接运行。它展示 `confidence` 越界、非法分类和额外字段如何被拒绝；真实分类准确率需要另一组标注样本评估。

```python
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, ValidationError

class Classification(BaseModel):
    model_config = ConfigDict(extra='forbid')
    category: Literal['refund', 'logistics', 'other']
    confidence: float = Field(ge=0, le=1)
    reason: str

raw = '{"category":"refund","confidence":1.2,"reason":"用户询问退款"}'
try:
    result = Classification.model_validate_json(raw)
except ValidationError:
    print('invalid_output')
```

验收输出为 `invalid_output`；把数值改为 `0.8` 可通过结构检查，但它仍不证明分类正确。接业务工具前还要验证订单归属、动作权限和当前状态。

## 流式输出

流式返回能降低用户感知的首字延迟，但会增加处理复杂度：

- 中途断开后如何恢复。
- 未完成 JSON 如何解析。
- 内容审核在生成前还是生成后执行。
- 工具调用和普通文本如何区分。
- 用户取消后如何终止后端请求。

例如收到 `{"category":"ref` 后连接中断，不能补全猜测字段并执行动作。界面可以展示文本增量，业务执行必须等待完整终止事件并通过校验；工具调用参数也要先合并完整，再按调用 ID 去重。取消前已提交的工具动作不会因为关闭流就自动回滚。

## 超时、重试与幂等

网络错误和服务拥塞可以有限重试；参数错误、权限错误和内容拒绝不应盲目重试。写操作必须通过业务工具设置幂等键，模型请求重试不能导致重复下单或重复发送。

## 可观测信息

每次请求至少记录：

- Trace ID 和业务场景。
- 模型及版本。
- Prompt 或模板版本。
- 输入输出 Token、首字延迟和总延迟。
- 检索、工具和模型各阶段耗时。
- 停止原因、错误类型和重试次数。

日志要脱敏，不应直接记录密码、密钥和完整个人隐私。

## 最小质量检查

建立包含正常、边界、无答案、恶意输入和超长输入的测试集。每次更换模型或 Prompt 都自动检查格式正确率、任务准确率、延迟和成本，而不是只在控制台试几个问题。
