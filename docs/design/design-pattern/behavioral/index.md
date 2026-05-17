# 行为型模式总览

行为型模式关注对象之间如何协作。它们解决的是算法替换、流程扩展、状态切换、事件通知、请求分发、撤销恢复等行为变化问题。

![行为型模式总览](/design-pattern/behavioral-overview.svg)

## 解决的核心问题

行为型模式常出现在这些信号里：

- 一段逻辑里有大量 `if else` 或 `switch`，分支还会继续增加。
- 算法经常切换，但调用方不应该关心算法细节。
- 流程大体固定，但某些步骤由不同子类或扩展点实现。
- 状态变化后，对象行为完全不同。
- 一个事件发生后，需要通知多个对象。
- 一个请求可能由多个处理器中的某一个处理。
- 操作需要排队、记录、撤销、重做。
- 数据结构稳定，但针对结构的操作不断增加。

行为型模式的共同目标是把协作逻辑从硬编码调用中拆出来，让职责更清晰。

## 十一种行为型模式

| 模式 | 适合场景 | 直观理解 |
| --- | --- | --- |
| [策略](./strategy.md) | 算法可替换 | 同一目标，多种打法 |
| [模板方法](./template-method.md) | 流程骨架固定，步骤可变 | 固定流程，开放步骤 |
| [观察者](./observer.md) | 状态变化通知多个对象 | 发布订阅 |
| [迭代器](./iterator.md) | 统一遍历集合 | 不暴露内部结构也能遍历 |
| [责任链](./chain-of-responsibility.md) | 多个处理器依次尝试处理请求 | 审批流 |
| [状态](./state.md) | 状态不同，行为不同 | 订单状态机 |
| [命令](./command.md) | 请求需要对象化 | 可排队、可记录、可撤销的操作 |
| [备忘录](./memento.md) | 保存和恢复状态 | 快照与撤销 |
| [解释器](./interpreter.md) | 解释简单规则或表达式 | 小型规则引擎 |
| [访问者](./visitor.md) | 数据结构稳定，操作常变化 | 给结构新增操作 |
| [中介者](./mediator.md) | 多对象交互复杂 | 用协调中心减少互相依赖 |

## 怎么选

### 算法可替换

选择策略模式。比如不同折扣算法、路由算法、排序规则、支付费率计算。策略强调“同一件事有多种做法”。

### 流程固定，步骤可变

选择模板方法。比如导入流程固定为读取、校验、转换、保存，但每类文件的读取和转换不同。

### 状态决定行为

选择状态模式。比如订单、工单、审批单、连接对象。状态模式适合把状态分支从主类中拆出去。

### 一个事件通知多个对象

选择观察者模式。比如事件总线、监听器、消息订阅、模型视图同步。

### 请求需要一站站处理

选择责任链。比如过滤器链、拦截器链、审批链、风控规则链。

### 操作需要记录和撤销

选择命令模式，必要时配合备忘录。命令保存“要做什么”，备忘录保存“做之前是什么状态”。

### 多对象互相调用太乱

选择中介者。它把复杂网状交互收敛到协调中心，适合 UI 控件联动、聊天室、工作流协调。

### 数据结构稳定，操作增加快

选择访问者。比如 AST、报表结构、组织结构，需要不断增加导出、统计、校验等操作。

## 实操：行为变化怎么拆

### 场景一：促销计算从分支改成策略

问题代码：

```java
public BigDecimal calculate(String promotionType, Order order) {
    if ("discount".equals(promotionType)) {
        return order.getAmount().multiply(new BigDecimal("0.9"));
    }
    if ("full_reduce".equals(promotionType)) {
        return order.getAmount().subtract(new BigDecimal("20"));
    }
    if ("coupon".equals(promotionType)) {
        return couponService.calculate(order);
    }
    return order.getAmount();
}
```

当促销规则频繁变化时，可以拆成策略：

```java
public interface PromotionStrategy {
    String type();
    BigDecimal calculate(Order order);
}

public class PromotionService {
    private final Map<String, PromotionStrategy> strategies;

    public BigDecimal calculate(String type, Order order) {
        PromotionStrategy strategy = strategies.get(type);
        if (strategy == null) {
            return order.getAmount();
        }
        return strategy.calculate(order);
    }
}
```

新增促销时新增一个策略类，不修改原有计算服务。

### 场景二：校验流程改成责任链

问题代码：

```java
public void submit(Order order) {
    checkUser(order);
    checkAddress(order);
    checkInventory(order);
    checkRisk(order);
    createOrder(order);
}
```

如果校验节点会按业务线增减，可以拆成处理器链：

```java
public interface OrderValidator {
    void validate(Order order);
}

public class OrderSubmitService {
    private final List<OrderValidator> validators;

    public void submit(Order order) {
        for (OrderValidator validator : validators) {
            validator.validate(order);
        }
        createOrder(order);
    }
}
```

责任链适合处理节点可插拔的流程。链路顺序本身是业务规则，需要明确配置和测试。

### 场景三：订单状态从条件判断改成状态模式

问题代码：

```java
public void cancel(Order order) {
    if (order.isPaid()) {
        refund(order);
        order.setStatus("CANCELLED");
    } else if (order.isCreated()) {
        order.setStatus("CANCELLED");
    } else if (order.isShipped()) {
        throw new IllegalStateException("已发货订单不能直接取消");
    }
}
```

状态越来越多时，可以把状态行为拆出去：

```java
public interface OrderState {
    void cancel(Order order);
}

public class PaidState implements OrderState {
    public void cancel(Order order) {
        refund(order);
        order.changeState(new CancelledState());
    }
}

public class ShippedState implements OrderState {
    public void cancel(Order order) {
        throw new IllegalStateException("已发货订单不能直接取消");
    }
}
```

状态模式适合状态数量较多、状态行为差异明显的场景。如果只有两个状态且变化很少，普通分支更简单。

## 容易混淆的模式

| 模式 | 相似点 | 区分方式 |
| --- | --- | --- |
| 策略 vs 状态 | 都把行为拆到独立类 | 策略由外部选择，状态由对象内部状态驱动 |
| 策略 vs 模板方法 | 都能改变算法 | 策略用组合替换整体算法，模板方法用继承替换局部步骤 |
| 责任链 vs 命令 | 都能封装请求 | 责任链强调谁处理，命令强调请求本身可保存和调度 |
| 观察者 vs 中介者 | 都降低对象直接依赖 | 观察者是一对多通知，中介者是多对象交互协调 |
| 备忘录 vs 命令 | 都可用于撤销 | 命令记录操作，备忘录记录状态 |

## 常见误区

- 策略类过多但变化很少，会造成过度设计。
- 观察者链路过长时，问题定位会变难，需要日志和事件边界。
- 责任链处理顺序很重要，顺序隐含业务规则时要明确文档化。
- 状态模式不适合状态很少且稳定的简单分支。
- 访问者要求数据结构稳定，如果元素类型频繁变化会很痛苦。
- 解释器只适合小语言或规则表达式，复杂语言应使用成熟解析工具。

行为型模式最重要的是让协作可见。读代码时应该能看出请求如何流动、状态如何切换、扩展点在哪里。
