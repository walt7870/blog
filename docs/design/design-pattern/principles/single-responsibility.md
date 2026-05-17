# 单一职责原则

单一职责原则强调：一个模块、类或函数应该只有一个引起它变化的原因。这里的“职责”不是方法数量，而是变化原因。

![单一职责原则示意图](/design-pattern/principles/srp.svg)

## 历史脉络

单一职责原则后来被归入 SOLID 原则体系，并由 Robert C. Martin 等人在面向对象设计实践中推广。它的思想并不局限于类设计，本质上来自模块化设计：把不同原因导致的变化隔离开，降低修改影响范围。

## 准确理解

一个类有很多方法，不一定违反单一职责；一个类只有一个方法，也可能违反单一职责。关键要看这些代码是否因为不同类型的需求而改变。

例如 `OrderService` 同时负责订单创建、库存扣减、优惠计算、短信通知、审计日志。它不是因为“订单业务”这个名字就合理，真正问题是这些职责的变化来源不同：

- 订单流程变化。
- 库存规则变化。
- 促销规则变化。
- 消息模板变化。
- 审计合规变化。

这些变化混在一个类里，任何一类需求都会影响同一个文件。

## 代码坏味道

- 一个类超过几百行，并且方法分属不同业务语义。
- 类名越来越宽泛，例如 `Manager`、`Helper`、`CommonService`。
- 修改一个需求时，总要顺手改同一个大类的不同区域。
- 单元测试很难写，因为创建这个类要准备很多无关依赖。
- 一个方法里同时做参数校验、业务决策、数据库访问、消息发送。

## 重构示例

问题代码：

```java
public class OrderService {
    public void create(OrderCommand command) {
        validate(command);
        BigDecimal amount = calculatePrice(command);
        orderRepository.save(command, amount);
        smsClient.send(command.getPhone(), "订单创建成功");
        auditRepository.save("CREATE_ORDER", command.getUserId());
    }
}
```

职责拆分后：

```java
public class OrderApplicationService {
    private final OrderValidator validator;
    private final PriceCalculator priceCalculator;
    private final OrderRepository orderRepository;
    private final OrderCreatedNotifier notifier;
    private final AuditLogger auditLogger;

    public void create(OrderCommand command) {
        validator.validate(command);
        BigDecimal amount = priceCalculator.calculate(command);
        Order order = orderRepository.save(command, amount);
        notifier.notify(order);
        auditLogger.recordOrderCreated(order);
    }
}
```

拆分后不是方法更少，而是变化更清楚：价格规则改 `PriceCalculator`，通知模板改 `OrderCreatedNotifier`，审计字段改 `AuditLogger`。

## 落地步骤

1. 先列出这个类会因为哪些需求变化而修改。
2. 把变化原因相同的方法保留在一起。
3. 把基础设施能力抽出去，例如消息、缓存、审计、文件、第三方 SDK。
4. 用应用服务编排流程，用领域对象或策略承载规则。
5. 重构后补测试，确保旧流程行为不变。

## 常见误区

- 把每个方法都拆成一个类，导致类数量膨胀。
- 只按技术层拆，不按变化原因拆。
- 拆分后仍然互相直接依赖，形成新的耦合。
- 把所有编排都塞进一个新的 `Facade` 或 `Manager`，只是换了名字。

## 判断标准

当新增一种通知方式时，是否不需要修改价格计算代码；当调整价格规则时，是否不影响审计逻辑。如果答案是肯定的，单一职责拆分就有实际收益。
