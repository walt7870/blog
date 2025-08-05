---
title: 领域驱动设计之聚合根（Aggregate Root）
author: Walt
date: 2024-06-01 10:00:00
---

# 聚合根（Aggregate Root）

> 本文旨在帮助读者**从零开始**理解聚合根的概念、作用与设计方法，并通过示例快速上手。

---

## 一、什么是聚合（Aggregate）？

在领域驱动设计（DDD）中，**聚合**是一组**高度内聚**的领域对象（实体与值对象）的集合，它们共同表达一个完整的业务概念。聚合的核心目标是：

- **维护业务规则的一致性**：确保聚合内的对象始终满足业务不变性条件（Invariants）。
- **定义事务边界**：聚合是数据持久化的最小单元，确保事务的原子性。

### 1.1 聚合的组成

- **聚合根（Aggregate Root）**：聚合的入口点，外部系统只能通过聚合根访问聚合内部对象。
- **实体（Entity）**：具有唯一标识的对象，生命周期由聚合根管理。
- **值对象（Value Object）**：描述属性的不可变对象，无独立生命周期。

---

## 二、什么是聚合根（Aggregate Root）？

**聚合根**是聚合中的**唯一实体**，它：

1. **作为聚合的“门面”**：所有对聚合的操作（查询、修改）必须通过聚合根进行。
2. **维护聚合的完整性**：确保聚合内的业务规则不被破坏。
3. **全局唯一标识**：聚合根拥有全局唯一ID，其他对象通过聚合根间接访问。

### 2.1 为什么需要聚合根？

- **避免对象间混乱的引用**：防止外部系统直接修改聚合内部对象。
- **简化复杂业务逻辑**：将复杂的业务规则封装在聚合根内。
- **优化性能**：减少数据库事务的粒度，避免不必要的锁冲突。

---

## 三、如何识别聚合根？

### 3.1 设计步骤

1. **分析业务场景**：识别业务操作的核心对象。
2. **定义不变性条件**：明确哪些规则必须始终成立。
3. **划分聚合边界**：将关联紧密的对象划分为一个聚合。
4. **选择聚合根**：选择最能代表业务概念的实体作为聚合根。

### 3.2 判断标准

- **生命周期控制**：聚合根决定聚合内其他对象的创建与销毁。
- **业务规则集中**：聚合根负责验证所有业务规则。
- **全局可访问性**：聚合根是外部系统唯一可直接引用的对象。

---

## 四、示例：电商订单聚合

### 4.1 业务场景

在一个电商系统中，**订单（Order）**是一个典型的聚合根，它包含：

- **订单项（OrderItem）**：订单中的商品条目。
- **收货地址（Address）**：值对象，描述配送信息。
- **订单状态（OrderStatus）**：枚举值，描述订单当前状态。

### 4.2 聚合设计

```java
// 聚合根：Order
public class Order {
    private OrderId id; // 全局唯一标识
    private List<OrderItem> items; // 订单项集合
    private Address shippingAddress; // 收货地址（值对象）
    private OrderStatus status; // 订单状态

    // 业务方法：添加商品
    public void addProduct(Product product, int quantity) {
        if (status != OrderStatus.DRAFT) {
            throw new IllegalStateException("只能修改草稿订单");
        }
        items.add(new OrderItem(product, quantity));
        recalculateTotal(); // 重新计算总价
    }

    // 业务方法：提交订单
    public void submit() {
        if (items.isEmpty()) {
            throw new IllegalStateException("订单不能为空");
        }
        this.status = OrderStatus.SUBMITTED;
    }

    // 不变性条件：订单总价需与所有订单项金额之和一致
    private void recalculateTotal() {
        // 实现总价计算逻辑
    }
}

// 实体：OrderItem（生命周期由Order控制）
public class OrderItem {
    private ProductId productId;
    private int quantity;
    private BigDecimal price;
}

// 值对象：Address
public class Address {
    private final String city;
    private final String street;
    private final String zipCode;
}
```

### 4.3 关键点说明

- **聚合根**：`Order` 是唯一可直接访问的实体，外部系统通过 `Order.addProduct()` 添加商品。
- **不变性条件**：订单提交前必须包含商品（`items.isEmpty()` 检查）。
- **事务边界**：`Order` 及其所有 `OrderItem` 必须作为一个事务单元持久化。

---

## 五、常见误区与最佳实践

### 5.1 误区

- **聚合过大**：包含过多对象会导致事务冲突和性能问题。
- **聚合过小**：过度拆分聚合会导致复杂的跨聚合调用。
- **直接暴露内部对象**：违反聚合根的封装原则。

### 5.2 最佳实践

1. **保持聚合小而专注**：聚合应仅包含与核心业务规则相关的对象。
2. **通过ID引用其他聚合**：避免直接引用其他聚合根，使用ID关联。
3. **使用领域事件**：跨聚合的通信通过领域事件（Domain Event）实现。
4. **优先使用值对象**：减少不必要的实体，用值对象描述属性。

---

## 六、进阶：聚合根与微服务

在微服务架构中，聚合根天然对应**微服务的边界**：

- 每个聚合根可独立部署为一个微服务。
- 聚合根之间通过API或事件总线通信。
- 避免跨聚合的事务，使用**最终一致性**（Eventual Consistency）。

---

## 七、总结

| 概念       | 作用                          | 示例（电商订单）           |
|------------|-------------------------------|----------------------------|
| **聚合**   | 维护业务规则的一致性          | 订单+订单项+地址           |
| **聚合根** | 聚合的唯一入口，控制生命周期  | `Order` 实体               |
| **实体**   | 有独立生命周期的业务对象      | `OrderItem`                |
| **值对象** | 描述属性的不可变对象          | `Address`、`OrderStatus`   |
