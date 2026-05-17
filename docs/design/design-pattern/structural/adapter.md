# 适配器模式 (Adapter Pattern)

## 历史脉络

适配器模式是 GoF 结构型模式之一，长期用于遗留系统改造、第三方 SDK 接入、接口迁移和跨系统集成。它的核心价值是让已有能力在不修改原代码的情况下接入新接口。

![适配器模式结构图](/design-pattern/patterns/adapter.svg)

## 准确理解

适配器解决的是接口不兼容，而不是增强功能。客户端依赖目标接口，适配器内部调用被适配对象，把参数、返回值、异常和语义转换成系统期望的形式。

## 问题识别

适合使用适配器的信号：

- 第三方 SDK 方法名、参数结构和内部接口不一致。
- 老系统接口无法修改，但新系统希望统一调用方式。
- 转换逻辑散落在多个业务类里。
- 需要隔离外部错误码、协议字段和数据格式。

不适合的情况：

- 接口语义本身不一致，强行转换会误导调用方。
- 只是为了换个方法名，没有实际兼容边界。
- 适配层越来越厚，说明边界模型需要重新设计。

## 落地要点

- 目标接口应按内部业务语义设计，不要照搬外部 SDK。
- 外部异常和错误码应在适配器内转换。
- 适配器不要承载复杂业务规则，只做边界转换。
- 多个厂商实现同一能力时，可配合工厂或策略选择适配器。

## 概述

将一个类的接口转换成客户端期望的另一个接口，使原本接口不兼容的类可以一起工作。

简单说，就是**让对接不上的接口也能对上**，像一个插头转换器，把A接口转换成B接口。

适配器模式是桥梁设计工具，它让“不兼容”的类也能协作，是在不修改原有代码的前提下实现代码复用的强力武器，适用于系统集成和系统改造中。

## 使用场景

- 使用一个已有类，但它的接口和当前系统要求不兼容；

- 想复用一些老代码系统、第三方库，但不想改它们；

- 希望解耦“目标系统”和“被适配者”的耦合关系。

## 类图结构（以类适配器为例）

```plaintext
       ┌──────────────┐
       │   Target     │ ← 客户端期望的接口（目标）
       └──────┬───────┘
              │
       ┌──────▼────────┐
       │  Adapter      │ ← 适配器，实现 Target，内部调用 Adaptee
       └──────┬────────┘
              │
       ┌──────▼────────┐
       │  Adaptee      │ ← 被适配者，已有类
       └───────────────┘

```

## 示例

假设我们有一个 220V 电源（Adaptee），现在手机只能使用 5V 电压（Target），我们用适配器将其转换。

### 1. 目标接口（Target）

``` java
public interface DC5 {
    int output5V();
}
```

### 2. 被适配者（Adaptee）

``` java
public class AC220 {
    public int output220V() {
        return 220;
    }
}
```

### 3. 适配器（Adapter）

``` java
public class PowerAdapter implements DC5 {
    private AC220 ac220;

    public PowerAdapter(AC220 ac220) {
        this.ac220 = ac220;
    }

    @Override
    public int output5V() {
        int src = ac220.output220V();
        // 模拟变压处理
        int dst = src / 44;
        System.out.println("适配器：将" + src + "V转换为" + dst + "V");
        return dst;
    }
}

```

### 4. 客户端调用

```java
public class Client {
    public static void main(String[] args) {
        AC220 ac220 = new AC220();
        DC5 adapter = new PowerAdapter(ac220);

        int voltage = adapter.output5V();
        System.out.println("手机接收到电压：" + voltage + "V");
    }
}

```

## 优缺点分析

### ✅ 优点

| 优点               | 说明                      |
| ---------------- | ----------------------- |
| **1. 解耦客户端与旧接口** | 客户端依赖的是目标接口而不是被适配者，松耦合。 |
| **2. 提高复用性**     | 适配器可以复用旧代码/第三方类，无需改动它们。 |
| **3. 符合开闭原则**    | 新增适配器即可扩展系统，原有代码无须修改。   |

### ❌ 缺点

| 缺点                 | 说明                     |
| ------------------ | ---------------------- |
| **1. 增加代码复杂性**     | 系统中多出一层适配器代码，增加维护成本。   |
| **2. 多重适配嵌套时结构复杂** | 如果需要多层适配，结构容易混乱、不易追踪。  |
| **3. 不支持所有情况**     | 某些接口结构差异太大时，适配不现实或效率低。 |

## 适配器分类（按实现方式）

| 类型        | 特点                                    | 实现方式示例                                            |
| --------- | ------------------------------------- | ------------------------------------------------- |
| **类适配器**  | 使用**继承**实现适配（只能适配一个类）                 | `class Adapter extends Adaptee implements Target` |
| **对象适配器** | 使用**组合**方式持有被适配对象，更灵活，推荐 使用            | 见上面代码中的 PowerAdapter                              |
| **接口适配器** | 针对接口中的多个方法，**只实现部分方法**（通常用于框架回调，如监听器） | Java 中常通过抽象类默认实现接口所有方法                            |


## Spring中的应用 HandlerAdapter

### 背景

Spring MVC 中的 HandlerAdapter 是对适配器模式的经典实现，它将控制器（各种风格）和前端控制器解耦，使整个处理器调用机制灵活、可扩展、符合开闭原则，类似设置还有ViewResolver、HttpMessageConverter，及SpringBoot 中对 starter 的自动装配适配。

在 Spring MVC 中，前端控制器 DispatcherServlet 的职责是根据用户请求，调用对应的处理器（即 Controller）。
但问题是：处理器有多种风格/类型（传统 Controller、注解 Controller、函数式 Handler 等），如何统一调用呢？

👉 这就引出了 HandlerAdapter（适配器）机制。



### 类结构图

``` plaintext
                     ┌────────────────────────┐
                     │    DispatcherServlet    │
                     └────────────┬────────────┘
                                  │
                          find适配器（遍历列表）
                                  │
                     ┌────────────▼────────────┐
                     │     HandlerAdapter      │ ← 目标接口
                     └────────────┬────────────┘
                                  │
        ┌─────────────────────────┴─────────────────────────┐
        │                        │                          │
┌──────────────┐     ┌─────────────────────┐     ┌────────────────────┐
│ SimpleController│  │ RequestMappingAdapter │     │ FunctionHandlerAdapter │
└────────────────┘   └─────────────────────┘     └────────────────────┘
      （适配传统 Controller）     （适配注解 Controller）        （适配函数式 Handler）

```

### 核心接口：HandlerAdapter

```java
public interface HandlerAdapter {
    boolean supports(Object handler);       // 是否支持该处理器对象
    ModelAndView handle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception;
    long getLastModified(HttpServletRequest request, Object handler);
}
```

#### 说明

1. supports()：判断是否支持某种类型的处理器（如是否是HandlerMethod）

2. handle()：具体适配执行

3. DispatcherServlet 并不关心 handler 是什么类型，它只需要找到对应的 HandlerAdapter，交给它去处理


#### 典型实现：RequestMappingHandlerAdapter

这是我们平时最常用的注解风格 Controller（@Controller @RequestMapping）的适配器：

```java
public class RequestMappingHandlerAdapter implements HandlerAdapter {
    @Override
    public boolean supports(Object handler) {
        return handler instanceof HandlerMethod;  // 支持注解风格的方法
    }

    @Override
    public ModelAndView handle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // 执行 Controller 方法
    }
}

```

#### DispatcherServlet 中的调用流程（简化）

```java
// 核心伪代码：
Object handler = getHandler(request);  // 查找 Controller（可能是 HandlerMethod 等）

for (HandlerAdapter adapter : handlerAdapters) {
    if (adapter.supports(handler)) {
        adapter.handle(request, response, handler);  // 调用匹配适配器
        break;
    }
}

```

##### 说明

- DispatcherServlet 并不关心 handler 的具体类型；

- 它只需要找到合适的适配器来执行吗，这正是典型的适配器模式应用。
