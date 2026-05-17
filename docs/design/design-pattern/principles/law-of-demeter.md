# 迪米特法则

迪米特法则也叫最少知识原则。它强调一个对象应该尽量少了解其他对象的内部结构，只和直接朋友通信。

![迪米特法则示意图](/design-pattern/principles/lod.svg)

## 历史脉络

迪米特法则源于 Demeter 项目中的面向对象设计经验，后来被广泛用于描述低耦合对象协作。它关注的不是类数量，而是对象之间知道多少内部细节。

## 准确理解

问题不在于方法调用链的点号数量本身，而在于调用方是否穿透了多个对象的内部结构。

例如：

```java
order.getCustomer().getWallet().deduct(amount);
```

调用方知道订单有客户、客户有钱包、钱包可以扣款。以后钱包模型变化，调用方也要跟着改。更稳定的方式是表达业务意图：

```java
order.pay(amount);
```

## 代码坏味道

- 大量出现 `a.getB().getC().doSomething()`。
- 调用方为了完成一个业务动作，需要理解多个对象内部结构。
- 一个类修改内部字段结构后，外部很多地方跟着改。
- DTO、实体、聚合根被外部随意层层取值并修改。

## 重构示例

问题代码：

```java
public class PaymentService {
    public void pay(Order order, BigDecimal amount) {
        Wallet wallet = order.getCustomer().getWallet();
        wallet.deduct(amount);
        order.setPaid(true);
    }
}
```

封装业务意图：

```java
public class Order {
    private Customer customer;
    private boolean paid;

    public void pay(BigDecimal amount) {
        customer.pay(amount);
        this.paid = true;
    }
}

public class Customer {
    private Wallet wallet;

    public void pay(BigDecimal amount) {
        wallet.deduct(amount);
    }
}
```

`PaymentService` 不再关心钱包在哪里，只调用 `order.pay(amount)`。

## 落地步骤

1. 搜索长链式调用。
2. 判断这段调用表达的业务意图是什么。
3. 把意图方法移动到拥有数据或更接近数据的对象上。
4. 保留必要的只读查询，不暴露可变内部对象。
5. 如果子系统太复杂，可以用外观模式提供统一入口。

## 常见误区

- 把所有调用都封装一层，导致无意义转发方法过多。
- 为避免链式调用牺牲必要的数据查询能力。
- 只看点号数量，不看是否真的泄漏内部结构。
- 把所有操作都放到一个外观类，形成新的大对象。

## 判断标准

内部对象结构调整时，外部调用方是否基本不变。如果需要大面积修改链式调用，说明对象知道得太多。
