# 桥接模式 (Bridge Pattern)

## 概述

将抽象部分与它的实现部分分离，使它们可以独立变化。

简单说，就是用“桥”把抽象和实现解耦，避免继承层次过深，从而使系统更加灵活。

桥接模式通过组合方式将“抽象”和“实现”解耦，适用于多维度扩展、避免子类爆炸的复杂系统，是面向接口编程的经典实践。

桥接模式不仅适用于理论中的“抽象 × 实现”组合，在实际工程中，它广泛应用于框架设计、UI 多平台适配、行为结构分离等场景，并可与策略等模式组合打造高度灵活的系统架构。

## 使用场景

- 类的维度有多个变化（如：品牌 × 类型），想让这两个维度独立扩展；

- 系统不希望将抽象和实现绑定在一起；

- 希望通过组合替代继承，降低耦合；

- 需要跨平台操作接口，如操作系统驱动、图形绘制等。

## 类图结构

``` plaintext
      抽象部分                   实现部分
┌───────────────────┐     ┌────────────────────┐
│  Abstraction      │◄────│  Implementor        │
└────────┬──────────┘     └────────┬───────────┘
         │                         │
┌────────▼─────────┐       ┌───────▼─────────────┐
│ RefinedAbstraction│      │ ConcreteImplementor │
└──────────────────┘       └─────────────────────┘

```

- Abstraction：抽象类，包含对实现部分的引用（Bridge）

- Implementor：实现接口（定义具体行为）

- RefinedAbstraction：扩展抽象类

- ConcreteImplementor：具体实现类


## 示例

**遥控器 × 电视**
遥控器有开关、调频道等行为，而电视有不同品牌（小米、索尼等），我们想遥控器和电视可以独立扩展，不能用多层继承。

### 1. 实现接口（Implementor）

```java
public interface TV {
    void on();
    void off();
    void tuneChannel(int channel);
}
```

### 2. 具体实现类（ConcreteImplementor）

```java
public class SonyTV implements TV {
    public void on() {
        System.out.println("Sony TV 打开");
    }

    public void off() {
        System.out.println("Sony TV 关闭");
    }

    public void tuneChannel(int channel) {
        System.out.println("Sony TV 切换频道：" + channel);
    }
}

public class XiaomiTV implements TV {
    public void on() {
        System.out.println("小米 TV 打开");
    }

    public void off() {
        System.out.println("小米 TV 关闭");
    }

    public void tuneChannel(int channel) {
        System.out.println("小米 TV 切换频道：" + channel);
    }
}

}
```

### 3. 抽象遥控器（Abstraction）

```java
public abstract class RemoteControl {
    protected TV tv;

    public RemoteControl(TV tv) {
        this.tv = tv;
    }

    public abstract void turnOn();
    public abstract void turnOff();
    public abstract void setChannel(int channel);
}

```

### 4. 扩展遥控器类型（RefinedAbstraction）

```java
public class BasicRemoteControl extends RemoteControl {
    public BasicRemoteControl(TV tv) {
        super(tv);
    }

    public void turnOn() {
        tv.on();
    }

    public void turnOff() {
        tv.off();
    }

    public void setChannel(int channel) {
        tv.tuneChannel(channel);
    }
}

```

### 客户端调用

```java
public class Client {
    public static void main(String[] args) {
        TV sony = new SonyTV();
        RemoteControl remote1 = new BasicRemoteControl(sony);
        remote1.turnOn();
        remote1.setChannel(5);
        remote1.turnOff();

        System.out.println("-------------");

        TV xiaomi = new XiaomiTV();
        RemoteControl remote2 = new BasicRemoteControl(xiaomi);
        remote2.turnOn();
        remote2.setChannel(10);
        remote2.turnOff();
    }
}
```

## 优缺点分析

### ✅ 优点

| 优点              | 说明                    |
| --------------- | --------------------- |
| **1. 解耦抽象与实现**  | 抽象与实现可以独立扩展，互不影响      |
| **2. 更灵活的结构组合** | 用组合代替继承，避免类爆炸         |
| **3. 提高系统可扩展性** | 新增遥控器/电视品牌，只需新增类，互不干扰 |
| **4. 符合开闭原则**   | 可以独立添加功能，且不会影响已有类     |

### ❌ 缺点

| 缺点              | 说明                     |
| --------------- | ---------------------- |
| **1. 增加系统复杂度**  | 多了很多中间抽象类、组合关系，初学者不易理解 |
| **2. 不适用于简单对象** | 对于结构简单的系统反而“过度设计”      |

## 和其他模式对比

| 模式    | 本质思想         | 与桥接的区别                |
| ----- | ------------ | --------------------- |
| 装饰器模式 | 动态增强对象功能     | 关注对象“功能”的扩展，不是抽象与实现分离 |
| 适配器模式 | 改变已有类接口兼容性   | 解决接口不兼容，不关注抽象/实现结构    |
| 桥接模式  | 抽象与实现分离，解耦结构 | 强调多维度独立扩展             |


## 在Spring中的应用

### 1. JDBC 框架中的桥接结构

Spring 的 JdbcTemplate 是访问数据库的核心工具，它背后通过桥接模式，将**SQL 执行逻辑（抽象）与数据库驱动实现（实现部分）**分离：

#### 类图理解（简化）

```plaintext
       抽象层                            实现层
┌─────────────────┐          ┌────────────────────────┐
│   JdbcTemplate   │◄────────│  java.sql.Driver       │
└─────────────────┘          └────────────┬───────────┘
                                          │
                              ┌───────────▼────────────┐
                              │  MysqlDriver、PgDriver │
                              └────────────────────────┘
```

- JdbcTemplate 提供通用数据库操作接口（抽象层）

- java.sql.Driver 是 JDBC 驱动接口（实现层）

- 两者通过桥梁（Connection、DataSource）连接

- 新增驱动无需改动 JdbcTemplate，体现了桥接模式的“独立变化”思想

### Spring AOP 中的桥接思路

Spring AOP 中的 Advice（通知）与 MethodInterceptor（方法执行器）之间的组合，也体现了桥接的思想：

```txt
    通知类型（抽象）               方法拦截器（实现）
┌──────────────────┐     ┌─────────────────────────────┐
│ BeforeAdvice      │◄────│ MethodBeforeAdviceInterceptor │
│ AfterAdvice       │     │ AfterReturningAdviceInterceptor │
└──────────────────┘     └─────────────────────────────┘
```

Spring 会根据不同的通知类型“桥接”到不同的底层拦截器执行逻辑。

### 桥接模式在 GUI 框架中的应用

GUI（图形界面）常涉及多个平台（Windows、Mac、Linux）和多个控件（按钮、滑块、文本框），如何设计才能扩展新平台和新控件时不互相影响？

```plaintext
        抽象层                         实现层
┌────────────────────┐    ┌────────────────────────────┐
│    Button（按钮）     │    │   WindowsButtonImpl        │
│    Slider（滑块）     │    │   MacButtonImpl            │
│    TextBox（文本框）   │    │   LinuxButtonImpl          │
└────────────────────┘    └────────────────────────────┘
```

- 每个控件都有平台实现版本

- 可以任意组合控件和平台，实现跨平台 UI

- 如果用继承，则需每种控件 × 每个平台都写一个类

桥接模式让控件与平台独立扩展，实现了 GUI 框架的高可扩展性

### 桥接 + 策略模式组合使用

这两个模式经常联合使用，桥接负责结构解耦，策略负责行为可切换。

#### 示例：订单支付系统

场景：多个支付平台（微信/支付宝/银联）+ 多种促销策略（满减/打折）

桥接：支付方式

``` java
public interface PayPlatform {
    void pay(BigDecimal amount);
}

public class WeChatPay implements PayPlatform { ... }
public class AliPay implements PayPlatform { ... }
```

策略：促销策略

```java
public interface PromotionStrategy {
    BigDecimal applyDiscount(BigDecimal price);
}

public class Discount10Percent implements PromotionStrategy { ... }
public class FullMinus50 implements PromotionStrategy { ... }

```

```java
public class Order {
    private PayPlatform payPlatform;
    private PromotionStrategy promotionStrategy;

    public Order(PayPlatform payPlatform, PromotionStrategy promotionStrategy) {
        this.payPlatform = payPlatform;
        this.promotionStrategy = promotionStrategy;
    }

    public void checkout(BigDecimal originalPrice) {
        BigDecimal finalPrice = promotionStrategy.applyDiscount(originalPrice);
        payPlatform.pay(finalPrice);
    }
}
```

可以灵活组合：

1. 微信 + 满减

2. 支付宝 + 打折

3. 银联 + 无促销

桥接负责结构组合（支付平台），策略负责行为切换（促销算法），两者职责清晰，系统灵活。
