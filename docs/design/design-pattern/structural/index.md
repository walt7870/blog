# 结构型模式总览

结构型模式关注类与对象如何组合。它们解决的不是业务规则本身，而是接口不兼容、功能叠加、访问控制、子系统简化、树形组织、对象共享等结构问题。

![结构型模式总览](/design-pattern/structural-overview.svg)

## 解决的核心问题

结构型模式常出现在这些场景：

- 新系统想复用老接口或第三方库，但接口对不上。
- 需要给对象增加日志、缓存、加密、压缩、权限等能力。
- 访问真实对象前需要做控制，例如远程调用、懒加载、鉴权。
- 子系统内部复杂，外部只需要一个简单入口。
- 对象组成树形结构，例如菜单、文件、组织架构。
- 系统有多个变化维度，继承层次开始膨胀。
- 大量小对象占用内存，需要共享可复用部分。

结构型模式的共同点是优先通过组合和封装调整关系，而不是直接修改已有类。

## 七种结构型模式

| 模式 | 适合场景 | 直观理解 |
| --- | --- | --- |
| [适配器](./adapter.md) | 接口不兼容 | 插头转换器 |
| [桥接](./bridge.md) | 抽象和实现都可能变化 | 拆开两个变化维度 |
| [组合](./composite.md) | 整体和部分需要一致处理 | 文件夹和文件统一遍历 |
| [装饰器](./decorator.md) | 动态叠加功能 | 一层层包装对象 |
| [外观](./facade.md) | 简化复杂子系统 | 统一服务窗口 |
| [享元](./flyweight.md) | 大量对象共享状态 | 把重复部分集中复用 |
| [代理](./proxy.md) | 控制对真实对象的访问 | 访问目标前先经过代理 |

## 怎么选

### 接口不一致

选择适配器。重点是让旧接口、第三方接口或遗留系统能接入当前系统，而不直接修改原有代码。

### 功能要动态叠加

选择装饰器。比如输入流增加缓冲、压缩、加密能力；业务处理增加日志、校验、监控能力。

### 访问目标前要加控制

选择代理。比如远程代理、虚拟代理、保护代理、缓存代理。代理通常和真实对象实现相同接口。

### 子系统太复杂

选择外观。外观不是屏蔽所有能力，而是给常用流程提供稳定入口，降低调用方理解成本。

### 整体和部分同等对待

选择组合。树形菜单、目录结构、组织架构、表达式树都很适合。

### 两个维度同时扩展

选择桥接。比如形状和颜色、消息类型和发送渠道、设备抽象和具体驱动。桥接能避免继承组合爆炸。

### 大量对象重复

选择享元。重点是区分内部状态和外部状态，把可共享的内部状态缓存起来。

## 实操：结构问题怎么落地处理

### 场景一：第三方接口到处散落

问题代码：

```java
public class OrderService {
    private final VendorSmsClient smsClient;

    public void createOrder(Order order) {
        // 创建订单
        Map<String, Object> params = new HashMap<>();
        params.put("orderNo", order.getOrderNo());
        smsClient.pushMessage(order.getPhone(), "ORDER_CREATED", params);
    }
}
```

业务类直接依赖厂商 SDK，后续换厂商或改模板时影响面大。可以通过适配器统一内部接口：

```java
public interface NotificationSender {
    void orderCreated(Order order);
}

public class SmsNotificationAdapter implements NotificationSender {
    private final VendorSmsClient smsClient;

    public void orderCreated(Order order) {
        Map<String, Object> params = Map.of("orderNo", order.getOrderNo());
        smsClient.pushMessage(order.getPhone(), "ORDER_CREATED", params);
    }
}
```

`OrderService` 只依赖 `NotificationSender`，外部 SDK 变化被限制在适配器内部。

### 场景二：业务方法里重复出现缓存和鉴权

问题代码：

```java
public UserProfile getProfile(Long userId) {
    checkPermission(userId);
    UserProfile cached = cache.get(userId);
    if (cached != null) {
        return cached;
    }
    UserProfile profile = remoteUserClient.getProfile(userId);
    cache.put(userId, profile);
    return profile;
}
```

如果很多方法都这样写，可以把访问控制和缓存放到代理层：

```java
public interface UserProfileClient {
    UserProfile getProfile(Long userId);
}

public class UserProfileProxy implements UserProfileClient {
    private final UserProfileClient target;
    private final Cache<Long, UserProfile> cache;

    public UserProfile getProfile(Long userId) {
        checkPermission(userId);
        UserProfile cached = cache.get(userId);
        if (cached != null) {
            return cached;
        }
        UserProfile profile = target.getProfile(userId);
        cache.put(userId, profile);
        return profile;
    }
}
```

代理适合控制访问，不适合偷偷改变业务含义。调用方应该仍然认为自己在访问 `UserProfileClient`。

### 场景三：复杂子系统需要统一入口

下单可能涉及库存、优惠、支付、消息、积分：

```java
public class OrderFacade {
    public OrderResult submit(OrderCommand command) {
        inventoryService.lock(command);
        CouponResult coupon = couponService.calculate(command);
        PaymentResult payment = paymentService.pay(command, coupon);
        pointService.add(command.getUserId(), payment);
        messageService.sendOrderCreated(command);
        return OrderResult.success(payment.getOrderNo());
    }
}
```

外观模式适合把一组稳定流程收口成一个入口。它不应该吞掉所有细节，也不应该变成所有业务逻辑都塞进去的巨大类。

## 容易混淆的模式

| 模式 | 容易混淆点 | 区分方式 |
| --- | --- | --- |
| 适配器 vs 外观 | 都包了一层 | 适配器解决接口不兼容，外观简化子系统 |
| 装饰器 vs 代理 | 都包着真实对象 | 装饰器增强能力，代理控制访问 |
| 桥接 vs 策略 | 都依赖抽象 | 桥接拆结构维度，策略替换算法行为 |
| 组合 vs 装饰器 | 都可能递归组合 | 组合表达树形整体，装饰器表达功能叠加 |

## 常见误区

- 适配器过多会掩盖真实接口混乱，需要适时治理边界。
- 装饰器层数太多会增加调试难度。
- 代理不应悄悄改变真实对象语义。
- 外观不能变成新的“上帝类”，只负责协调常用流程。
- 享元要谨慎处理共享状态，避免把外部变化也共享出去。

结构型模式的关键是让对象关系更清楚。它们应该降低理解成本，而不是把简单结构包装得更复杂。
