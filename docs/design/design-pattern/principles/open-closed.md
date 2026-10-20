# 开闭原则

开闭原则强调：软件实体应该对扩展开放，对修改关闭。它不是说永远不能修改旧代码，而是希望稳定的核心流程不要因为每次新增需求而反复被改动。

![开闭原则示意图](/design-pattern/principles/ocp.svg)

## 历史脉络

开闭原则最早可追溯到 Bertrand Meyer 对面向对象软件构造的讨论，后来在 SOLID 原则体系中被广泛传播。它是很多设计模式的核心目标，例如策略、工厂、观察者、责任链都在不同角度支撑开闭原则。

## 准确理解

“对修改关闭”不是禁止修 bug、禁止重构、禁止演进，而是不要让新增同类能力时总要修改已经稳定的核心代码。

例如优惠计算每加一种活动都修改同一个分支方法，且每种规则都独立演进时，可以让服务依赖优惠策略，新增规则时新增实现并注册。若规则数量少且长期稳定，直接条件判断仍然合理。

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
            return order.getAmount().subtract(new BigDecimal("30")).max(BigDecimal.ZERO);
        }
        return order.getAmount();
    }
}
```

按扩展点改造：

以下是结构片段，省略 `Order` 类型与 import。约定金额为非负元金额、统一币种，策略返回最终应付金额，舍入在结算边界统一处理。

```java
public interface DiscountPolicy {
    String type();
    BigDecimal apply(Order order);
}

public class DiscountService {
    private final Map<String, DiscountPolicy> policies;

    public DiscountService(List<DiscountPolicy> registered) {
        this.policies = registered.stream().collect(
                Collectors.toUnmodifiableMap(DiscountPolicy::type, policy -> policy));
    }

    public BigDecimal discount(String type, Order order) {
        DiscountPolicy policy = policies.get(type);
        if (policy == null) {
            throw new IllegalArgumentException("未注册的优惠类型: " + type);
        }
        BigDecimal result = policy.apply(order);
        if (result == null || result.signum() < 0
                || result.compareTo(order.getAmount()) > 0) {
            throw new IllegalStateException("优惠结果超出允许范围");
        }
        return result;
    }
}
```

新增学生优惠时，新增 `StudentDiscountPolicy` 并加入装配列表；注册表构建时拒绝重复类型。不优惠也应是显式策略，避免配置拼错后悄悄按原价收费。这里没有展示优惠叠加、资格校验和币种转换，它们需要单独定义契约。

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

新增一个同类能力时，是否主要修改实现与装配，而无需触碰稳定流程。用每个策略运行金额边界测试，并保留旧策略的回归结果；不能用实现类数量作为原则是否成立的阈值。
