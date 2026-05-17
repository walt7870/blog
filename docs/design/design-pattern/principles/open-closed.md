# 开闭原则

开闭原则强调：软件实体应该对扩展开放，对修改关闭。它不是说永远不能修改旧代码，而是希望稳定的核心流程不要因为每次新增需求而反复被改动。

![开闭原则示意图](/design-pattern/principles/ocp.svg)

## 历史脉络

开闭原则最早可追溯到 Bertrand Meyer 对面向对象软件构造的讨论，后来在 SOLID 原则体系中被广泛传播。它是很多设计模式的核心目标，例如策略、工厂、观察者、责任链都在不同角度支撑开闭原则。

## 准确理解

“对修改关闭”不是禁止修 bug、禁止重构、禁止演进，而是不要让新增同类能力时总要修改已经稳定的核心代码。

例如支付服务每加一个支付渠道都修改 `if else`，说明变化点没有被隔离。更合理的做法是让支付服务依赖抽象支付策略，新增渠道时新增实现类并注册。

## 代码坏味道

- 同一个核心方法因为新增类型不断追加分支。
- 新需求影响老功能测试，回归范围很大。
- 配置项增加后，业务类里到处跟着改判断。
- 类里出现大量按 `type`、`status`、`scene` 分发的代码。

## 重构示例

问题代码：

```java
public class DiscountService {
    public BigDecimal discount(String type, Order order) {
        if ("vip".equals(type)) {
            return order.getAmount().multiply(new BigDecimal("0.8"));
        }
        if ("new_user".equals(type)) {
            return order.getAmount().subtract(new BigDecimal("30"));
        }
        return order.getAmount();
    }
}
```

按扩展点改造：

```java
public interface DiscountPolicy {
    String type();
    BigDecimal apply(Order order);
}

public class DiscountService {
    private final Map<String, DiscountPolicy> policies;

    public BigDecimal discount(String type, Order order) {
        DiscountPolicy policy = policies.get(type);
        return policy == null ? order.getAmount() : policy.apply(order);
    }
}
```

新增学生优惠时，新建 `StudentDiscountPolicy` 即可。

## 落地步骤

1. 找出最常追加分支的地方。
2. 判断分支之间是否有共同输入和共同输出。
3. 抽象出稳定接口，例如 `calculate`、`handle`、`send`、`validate`。
4. 把每个分支迁移成独立实现。
5. 用配置、容器、工厂或注册表完成实现选择。

## 常见误区

- 为不确定的未来过早抽象。
- 把所有变化都抽象成接口，导致代码跳转困难。
- 只新增实现，不治理旧分支，最后新旧结构并存。
- 忽略默认策略和异常策略，导致运行时找不到实现。

## 判断标准

新增一个同类能力时，是否只新增类和配置，而不修改核心流程。如果新增三个以上同类能力仍然稳定，开闭原则的收益就比较明确。
