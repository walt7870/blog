# Brownfield 实战二：用失败测试驱动 Agent 修改

> 系列第 10 篇  
> 实战节点：`failing-tests` → `initial-implementation` → `review-correction`  
> 核心问题：怎样让 Agent 通过编译器、测试和 Review 逐步收敛，而不是一次生成最终答案  
> 最后核验：2026-07-20  
> 对应视频：第 01 集（第二章）《AI 编程实战：让 Codex 从需求走到可验证交付》  

上一篇建立了订单服务的基线、任务契约和实施计划。本篇真正开始修改，但不会直接让 Agent“实现完整功能”。我们先在 `4328c1f` 写入取消订单的行为测试，并确认它在没有生产实现时真实失败；再在 `9e4a379` 完成第一版实现；最后通过 Review 发现状态规则放在 Service 中虽然测试通过，却不利于领域一致性，于 `0d3a019` 把不变量移动到 `Order.cancel()`。

这个过程展示了 Agentic Engineering 与一次性代码生成的差异：每轮动作都由上一轮可观察证据驱动。红灯定义缺失行为，编译器暴露契约断点，绿灯证明当前测试覆盖的行为，独立 Review 再质疑结构。测试不是收尾仪式，而是 Agent 感知环境的主要通道。

## 阅读路线：先看全局，再进入机制

视频版先展示整章地图，再逐层展开。博客沿用同一判断顺序，但保留更多机制、案例、失败模式和生产边界：

1. **失败测试**：先让新行为在实现前因正确原因失败。
2. **领域状态**：把 CREATED、PAID 与 CANCELLED 的转换规则收进领域对象。
3. **小步实现**：按 Repository、Service、Controller 和错误映射逐层闭环。
4. **根因修正**：在绿色之后继续审查状态不变量、幂等保存和异常语义。

这四步不是目录装饰，而是一条决策链：失败测试 → 领域状态 → 小步实现 → 根因修正。阅读后面的案例时，可以随时回到这条链判断当前问题发生在哪一层。

## 真实问题：为什么“先写测试”不等于测试驱动

Agent 可以在实现之后补一组永远通过的测试，也可以让测试复述内部方法调用；甚至可以同时生成测试和代码，使我们从未看到测试能否发现缺失行为。文件里有测试不代表形成证据。

真正的测试优先至少包含三个时间点：修改生产代码前，新增测试对当前代码失败；实现后，同一测试转为通过；全量测试继续通过。失败原因还必须与需求缺失有关，而不是拼写错误、坏依赖或测试本身不能启动。

本例的失败发生在测试编译：`OrderStatus.PAID`、`CANCELLED`、`OrderService.cancel(UUID)` 和 `OrderRepository.findById(UUID)` 尚不存在。共观察到 10 个编译错误。对于新增公开契约，这是一种有效红灯：测试已经准确要求生产代码提供新能力。

## 机制：先把状态转换写成可执行规格

![订单取消在 CREATED、CANCELLED、PAID 与 UNKNOWN 中的状态机](/ai/coding-agent-series/ep10/fig-01.png)

状态机是测试矩阵的来源：

```text
CREATED   --cancel--> CANCELLED，保存一次
CANCELLED --cancel--> CANCELLED，不再保存
PAID      --cancel--> conflict，不保存
UNKNOWN   --lookup--> not found
```

它同时决定三个测试层次。Domain 测状态转换本身；Application 测查询、编排和保存行为；Web 测 URL、状态码和 JSON。若只写 MockMvc 成功路径，PAID 分支和保存次数可能永远没有被验证；若只写 Domain 测试，又不能证明 404/409 的协议映射。

状态对象是不可变 record，因此 CREATED 取消返回新 `Order`，原对象保持 CREATED；重复取消返回 `this`。这个语义让 Service 可以用对象身份判断是否需要保存。生产系统也可以采用显式 Transition Result，不必照搬身份比较；重要的是幂等规则和持久化行为有明确契约。

### 1. 测试优先是一个反馈循环

![从失败测试到最小实现、再验证与重构的循环](/ai/coding-agent-series/ep10/fig-02.png)

循环依次是：写一个能表达行为的失败测试；运行并检查失败原因；只补足当前缺失能力；再次运行；绿灯后再重构。Agent 每次只需要解释当前最靠前的确定性反馈，减少大范围猜测。

这里“最小实现”不等于草率。它要求范围与契约一致，不顺便加入数据库、支付 API 或通用状态机框架。小步修改让错误来源更清晰，也让 Diff 更容易 Review。测试仍然可能不完整，因此每轮绿灯只提高有限信心，不能取代后续审查。

聚焦测试与全量测试应分工：开发循环先跑 Domain 或 Service 测试以获得快速反馈，完成阶段运行 `mvn test`。如果只跑聚焦测试，Controller 对象图或旧创建行为可能被破坏而未发现。

### 2. 红灯证明测试具有发现缺失行为的能力

![没有失败阶段与真实红绿证据的区别](/ai/coding-agent-series/ep10/fig-03.png)

`failing-tests` 节点修改 Service 测试替身，让它能 seed 订单、按 ID 查询并记录保存次数；增加 CREATED、CANCELLED、PAID、不存在四个用例；增加 MockMvc 创建后连续取消两次的场景。生产接口还没修改，所以 `mvn test` 在 `testCompile` 阶段失败。

编译失败需要人工判断是否是“正确的失败”。例如测试把 `CANCELED` 拼错，同样会编译失败，却没有证明需求。本例错误符号与任务契约逐一对应，说明测试正在要求尚未存在的 API。提交这一节点后，任何人都能检出并复现红灯。

测试先行还有一个设计作用：为 Repository 增加查询后，原先的 Lambda 替身不再满足单抽象方法，需要升级为小型类。这暴露了接口演进会影响所有实现者和测试消费者，提醒 Agent 搜索 `implements OrderRepository` 与匿名实现，而不是只改生产类。

## 从 Repository 查询开始构造用例

![cancel(UUID) 从查询、领域转换到保存的流程](/ai/coding-agent-series/ep10/fig-04.png)

取消方法只有 UUID，必须先取得当前聚合：

```java
public Order cancel(UUID id) {
    Order order = orderRepository.findById(id)
            .orElseThrow(() -> new OrderNotFoundException(id));
    Order cancelled = order.cancel();
    if (cancelled == order) {
        return order;
    }
    return orderRepository.save(cancelled);
}
```

Port 使用 `Optional<Order>` 明确不存在，而不是返回 `null`；内存实现从 `ConcurrentHashMap` 读取。Service 把“不存在”转换为应用异常，调用领域对象决定状态，然后只在返回新对象时保存。Controller 不知道 Map，也不判断状态。

这个结构仍有生产边界：查询和保存不是原子事务，两个并发请求可能读取同一 CREATED。演示任务明确不引入数据库，因此保留这一限制，并在交付证据中说明。Agent 不应为了掩盖限制写一个无法代表真实持久化的本地锁。

## 第一次实现为什么通过测试仍需要修改

![初次 Service 判断与 Review 后 Domain 不变量的对比](/ai/coding-agent-series/ep10/fig-05.png)

`initial-implementation` 将状态判断写在 `OrderService.cancel()`：CANCELLED 直接返回，非 CREATED 抛异常，CREATED 构造新订单并保存。13 个测试全部通过，HTTP 行为也能成立。但 Review 提出：订单可取消条件是领域不变量，如果未来批处理、消息消费者或另一个用例修改订单，它们可能复制或绕过 Service 规则。

`review-correction` 把转换移动到 `Order.cancel()`，增加 3 个直接领域测试，Service 只做查询、调用和保存。最终 16 个测试通过。这个变化不是为了追求“富领域模型”标签，而是让所有调用者共享状态约束，使变化原因更集中。

并非所有逻辑都应塞进 Entity。跨聚合协调、外部权限、事务和通知仍属于应用层或领域服务。判断依据是规则是否由订单自身状态和数据即可决定。PAID 能否取消不需要 HTTP 和 Repository，因此适合 Domain；订单是否存在只能由查询得知，因此留在 Application。

## 异常与 HTTP 状态保持分层

![应用和领域异常通过 Advice 映射为 404 与 409](/ai/coding-agent-series/ep10/fig-06.png)

`OrderNotFoundException` 位于 Application，`OrderCannotBeCancelledException` 位于 Domain。`OrderExceptionHandler` 把它们分别转为：

```json
{"code":"ORDER_NOT_FOUND","message":"Order not found: ..."}
{"code":"ORDER_CANNOT_BE_CANCELLED","message":"Order cannot be cancelled from status PAID"}
```

Controller 的成功路径只调用 Service 并返回 `200`。集中 Advice 让同类异常保持协议一致，也避免 Domain 引用 Spring 的 `HttpStatus`。测试分别断言业务异常和 HTTP JSON，防止某一层的实现细节渗透到另一层。

错误消息在真实生产中还要考虑本地化、敏感信息和稳定契约。本文把稳定 `code` 作为客户端判断字段，`message` 用于解释；不要让客户端依赖完整异常文本。

## 幂等要同时检查结果和副作用

![首次与重复取消的时序及保存行为](/ai/coding-agent-series/ep10/fig-07.png)

第一次请求读取 CREATED，Domain 返回新的 CANCELLED，Repository 保存并返回；第二次读取 CANCELLED，Domain 返回同一对象，Service 不保存，HTTP 仍返回 `200/CANCELLED`。用户看到稳定成功结果，系统也避免无意义写入。

Service 测试断言 `result.status()`、对象身份与 `saveCalls()`；MockMvc 测试先创建真实订单，再对 `Location + "/cancel"` 请求两次。这两层互补：前者精确证明副作用，后者证明路由、依赖注入、序列化与内存 Repository 组合工作。

如果只断言第二次返回 200，Service 即使每次新建订单并保存也可能通过；如果只断言保存次数，HTTP 路由拼错又无法发现。可观察行为应覆盖结果、错误和关键副作用。

## 测试替身应实现最小真实语义

![Map、findById、save、计数器与固定 Clock 构成测试替身](/ai/coding-agent-series/ep10/fig-08.png)

`TestOrderRepository` 使用 `Map<UUID, Order>` 保存状态，`seed` 准备 Given，`findById` 返回 Optional，`save` 覆盖相同 ID 并增加计数。它没有模拟数据库事务、延迟和并发，因为当前测试只验证应用编排。固定 Clock 保持创建时间可重复。

测试替身既不能过于空洞，也不该重建生产系统。若 `findById` 永远返回同一个对象，可能掩盖 ID 使用错误；若用真实数据库，Service 单元测试反馈变慢且失败原因混杂。选择能表达当前端口契约的最小实现。

接口新增方法后，编译器迫使所有实现同步更新，这正是静态类型的价值。为省事给接口加一个错误默认实现，可能让遗漏实现悄悄通过，不适合这里的契约变化。

## 代码改动保持每层单一变化原因

![Order、Service、Repository、Controller、Advice 与 Tests 的责任分布](/ai/coding-agent-series/ep10/fig-09.png)

最终改动可以用责任解释：`Order` 管理状态不变量；`OrderService` 编排用例；Repository 提供存取契约；Controller 提供路由；Advice 映射协议错误；测试充当可执行规格。19 个文件的总 Diff 包含文档 415 行新增，但生产代码本身保持局部。

Agent 容易出现两种极端：把所有逻辑堆进 Controller，或为小功能创建大量抽象。评审时不要用文件数量机械判断，应看每个新增类型是否隔离一种真实变化。两个异常分别属于应用不存在和领域冲突，具有清晰语义；为每个状态创建策略类则超出当前复杂度。

## 编译器和测试是 Agent 的外部感知系统

![从接口编译失败到行为测试和状态规则修正](/ai/coding-agent-series/ep10/fig-10.png)

运行反馈应按顺序读取。测试编译失败说明生产契约缺失，先补符号和实现者；编译通过后，测试断言失败才进入行为调试；行为绿灯后，Review 再处理职责与风险。不要在第一处编译错误时同时重写架构，因为后续证据还未出现。

长日志应提取第一处根因、失败阶段、目标模块和报告路径。重复堆叠全部 Maven 输出会占用上下文。Agent 每轮说明“观察到什么、推断什么、下一步最小动作”，比盲目重跑更容易审查。

失败也可能来自环境，例如 Java 版本或端口占用。基线通过后，这类概率降低；如果出现，先比较环境而不是修改业务代码以迎合错误环境。

## 实现完成需要一组证据，而不是一行绿色

![失败测试、单元、MockMvc、回归与 Diff 形成完成证据](/ai/coding-agent-series/ep10/fig-11.png)

本阶段观测到：新增测试在实现前真实编译失败；初次实现后 13 个测试通过；Review 修正后 16 个测试通过；原先 8 个测试仍在全量套件中；Diff 没有数据库、依赖或支付入口。每条证据对应契约的一部分。

“16 tests passed”不能证明线上可用，也不能证明并发安全；它证明当前代码在本地测试环境满足已编码的行为。下一篇还会检查测试是否真正断言业务、运行真实 HTTP、审查 Diff 和明确证据边界。

## 失败模式

### 失败一：测试与实现同时生成后只跑一次

没有红灯，无法证明测试能发现缺失行为。保存并运行独立失败节点。

### 失败二：为了绿灯放宽断言

失败揭示实现错误时，Agent 可能改测试迎合代码。先回到任务契约，只有需求确实变化时才调整期望。

### 失败三：只测成功路径

状态功能的主要风险常在重复、冲突和不存在。先画状态机，再从每条边生成测试。

### 失败四：测试复述实现

断言私有方法调用或构造细节会锁死重构。优先断言状态、错误、持久化和 HTTP 结果。

### 失败五：绿色测试等于设计完成

初次实现能通过行为测试，仍可能分配错职责。用新上下文 Review 领域不变量、重复和破坏半径。

### 失败六：测试替身过度简化

固定返回值可能掩盖 ID 和状态错误。替身至少实现当前 Port 的查询、覆盖和保存语义。

## 生产边界

测试驱动不能证明未建模的性质。本例无数据库、认证、版本控制、并发事务、审计和支付入口。不要把内存测试结果外推为生产持久化正确性。若任务进入生产，需要契约测试、真实数据库集成、并发场景、安全检查和发布验证。

Agent 可以执行测试和提出重构，但测试期望、状态语义和风险接受仍由工程责任人决定。为了通过测试删除旧断言、忽略失败或改变错误码，都应被 Review 阻止。

## 实践清单

- [ ] 从状态模型生成成功、幂等、冲突和不存在测试。
- [ ] 在生产实现前运行新增测试并确认失败原因正确。
- [ ] 保存可复现的失败测试 Git 节点。
- [ ] 用聚焦测试获得快速反馈，用全量测试完成回归。
- [ ] 每次只处理当前最靠前的编译或测试根因。
- [ ] 检查 Repository 接口的所有实现者和测试替身。
- [ ] 同时断言可观察结果与关键保存副作用。
- [ ] 绿灯后再 Review 领域规则和层次责任。
- [ ] 不通过放宽断言、删除旧测试或扩大范围换取通过。
- [ ] 对未建模的并发、持久化和安全能力明确限界。

## 读完之后，你应该能完成什么

- 能证明测试不是事后装饰。
- 能用失败输出区分缺失行为与环境问题。
- 能让 Agent 按最小垂直切片实现。
- 能在测试全绿后继续发现结构性缺陷。

如果只能复述概念，却不能完成上述动作，说明还没有把内容转化成工程能力；可以回到对应机制图、失败模式和实践清单重新核对。

## 小结

测试驱动 Agent 的价值不是模仿红绿重构仪式，而是把模型放进一个可观测的控制循环。失败测试定义缺失，编译器标出契约断点，最小实现响应当前证据，全量测试守住回归，Review 再挑战结构。Agent 仍会写出“能过但不够好”的第一版，正因为保留了证据和节点，我们才能低成本识别并修正它。

## 实战资料

- 失败测试：`4328c1f` / `failing-tests`
- 初次实现：`9e4a379` / `initial-implementation`
- Review 修正：`0d3a019` / `review-correction`
- 最终测试：16 tests，0 failures，0 errors，0 skipped
