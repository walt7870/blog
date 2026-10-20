<script setup>
import { withBase } from 'vitepress'
</script>

# Brownfield 实战二：用测试约束 Agent 修改

上一篇已经明确取消订单的四种行为。本篇把它们变成能运行的合同，再按查询、领域、用例和 Web 顺序补实现。重点是检查反馈为什么出现：编译红灯表示缺少符号，行为失败表示结果不符，绿色只说明当前断言成立，三者不能混为一谈。

<a :href="withBase('/ai/examples/coding-order-lab.zip')" download>下载订单实战源码</a>，环境和基线准备见[上一篇](./09-brownfield-understand-before-edit.md)。本篇的命令均在解压后的 `coding-order-lab` 内运行。

## 把新合同加入原测试集

```bash
mvn clean test
cp contract/example/orders/CancelOrderTest.java tests/example/orders/
mvn clean test
```

第一次应有 8 个测试通过；复制合同后的第二次应在 `testCompile` 失败，因为基线没有 `Order.cancel()`、新状态、`findById()` 和取消异常等符号。先读第一个错误，再检查它是否确实对应尚未实现的合同。Java 版本不对、包名写错或依赖不可达，都不能作为需求红灯。

编译失败还不能证明测试会拒绝错误实现。可以随意补齐方法并返回错误值，让代码编译；此时测试仍应因为状态、异常和保存次数不符而失败。下一篇会故意放行已支付订单、增加重复保存、改错 HTTP 映射，观察这种行为级反证。

![基线、契约红灯、最终测试和本地HTTP的验证顺序](/ai/coding-agent-series/order-verification-stages.svg)

## 状态规则放在订单对象里

![可取消、重复取消和已支付冲突的状态规则](/ai/coding-agent-series/order-cancel-state.svg)

`final/example/orders/Order.java` 的关键实现如下：

```java
public Order cancel() {
    if (status == Status.CANCELLED) return this;
    if (status != Status.CREATED) throw new OrderCannotBeCancelledException();
    return new Order(id, amount, Status.CANCELLED);
}
```

`Order` 是不可变 record。首次取消产生新对象，保留 ID 和金额；重复取消返回同一个对象；已支付抛出业务异常，原对象不变。Domain 测试直接检查这些结果，不要求启动 HTTP。

如果把判断全部写在 Controller，批处理和消息消费者便可能绕过它；只放 Service 也容易在其他用例复制规则。这里让订单对象拥有转换规则，Service 负责存取和编排。这个选择不意味着每个简单 DTO 都要改造成领域模型，应看规则是否需要被多个入口保持一致。

## Service 编排查询与保存

Repository 新增 `Optional<Order> findById(UUID id)`，内存实现用 `Optional.ofNullable(orders.get(id))`。应用用例如下：

```java
public Order cancel(UUID id) {
    Order order = repository.findById(id).orElseThrow(OrderNotFoundException::new);
    Order cancelled = order.cancel();
    return cancelled == order ? order : repository.save(cancelled);
}
```

身份比较依赖刚才的领域合同：返回 `this` 表示没有变化。Service 测试使用计数 Repository，先种入 CREATED，清零保存计数，再连续取消两次，断言最终只有一次保存。若以后换成每次都反序列化对象的存储或显式转换结果，必须重新检查这份合同，不能把 `==` 当通用幂等算法。

`findById` 返回空时抛出不存在异常；已支付由领域对象拒绝，因此不会执行保存。异常里不包含 HTTP 状态码，便于从其他协议入口复用。

## Web 只负责协议适配

Controller 将路径参数解析为 UUID，调用 `service.cancel(id)` 并返回结果。`OrderExceptionHandler` 分别处理 `OrderNotFoundException` 和 `OrderCannotBeCancelledException`：

```java
@ExceptionHandler(OrderNotFoundException.class)
ResponseEntity<Map<String, String>> missing() {
    return ResponseEntity.status(404).body(Map.of("code", "ORDER_NOT_FOUND"));
}
```

冲突分支同样返回 `409` 和 `ORDER_CANNOT_BE_CANCELLED`。非法 UUID 在参数转换时返回 `400`，不应被伪装成“订单不存在”。Web 测试既检查 HTTP 状态，也检查 JSON 业务码，避免两种错误都被一个通用 `500` 吞掉。

MockMvc 的已支付测试直接向内存 Repository 放入 PAID 订单，然后请求取消接口，验证真实 Controller、Service 和 Advice 组合后的 409。这不是外部网络请求，也不是支付流程测试。

## 运行同一套测试检查最终快照

可以在 `baseline/` 中自行实现，然后继续运行默认测试；也可以先观察提供的最终快照：

```bash
mvn clean test -Dlab.stage=final
```

预期为 16 个测试通过，其中创建 8 个、取消 8 个。每次切换源码快照必须使用 `clean`，避免旧 `.class` 残留让缺失类看起来仍然存在。`final/` 是用于对照的完整源码，不会自动把实现复制到基线。

| 层次 | 取消合同检查什么 |
| --- | --- |
| Domain 3 项 | 新取消副本、重复返回同一对象、PAID 拒绝 |
| Service 3 项 | 不存在、重复不再次保存、PAID 不保存 |
| Web 2 项 | 创建后两次取消及404、PAID映射409 |

一个测试方法可以包含多项断言，所以“16 个”不是覆盖程度或质量分数。Review 还要检查金额与 ID 是否保留、错误路径有没有保存、测试是否在真实应用配置下执行，以及接口新增查询是否遗漏其他实现。

## 绿灯后再检查责任和边界

让 Agent 从任务合同和 Diff 重新审查，而不是要求它证明自己的实现正确。例如问：“把 PAID 放行后哪项测试失败？重复保存在哪里被观察？订单对象是否依赖 HTTP？原创建测试是否被放宽？”回答需要引用源码与结果。

测试通过后，不必为了重构而引入通用状态机、数据库或事件总线。当前实现的主要限制仍是内存存储、无并发条件更新、无认证与支付入口。下一篇扩大到打包进程和真实 HTTP，并把这些限制放进可复核的交付说明。
