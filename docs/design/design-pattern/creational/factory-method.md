# 工厂方法 (Factory Method Pattern)

## 历史脉络

工厂方法是 GoF 经典设计模式之一，出现在面向对象框架大量发展的阶段。它解决的核心问题是：框架或高层流程知道“需要一个产品”，但不应该知道“具体创建哪一个产品类”。很多框架扩展点、插件系统、驱动加载机制都能看到它的影子。

![工厂方法模式结构图](/design-pattern/patterns/factory-method.svg)

## 概括

工厂方法模式定义了一个创建对象的接口，但由子类决定要实例化的类。这样，父类可以将实例化的职责交给子类，实现了对象创建的延迟和扩展性。

更准确地说，工厂方法不是为了简单隐藏 `new`，而是为了把“产品选择逻辑”从“产品使用逻辑”中隔离出去。

## 问题识别

适合考虑工厂方法的典型信号：

- 创建对象前需要根据类型、配置、环境选择不同实现。
- 多个产品类实现同一接口，调用方只关心接口能力。
- 新增产品时，总要修改核心业务类里的分支。
- 创建过程包含校验、初始化、资源准备等细节。

不适合的情况：

- 只有一个产品类，短期也没有扩展计划。
- 创建逻辑只是简单 `new`，没有额外变化点。
- 分支数量很少且稳定，直接构造更清楚。

## 使用场景

工厂方法模式适用于以下场景：

* 对象的创建逻辑复杂，需要封装；
* 系统中存在多个产品类，但它们都继承自一个共同的接口或父类；
* 希望代码遵循开闭原则，对扩展开放、对修改封闭。

## 重构前后对比

问题代码通常长这样：

```java
public class LoggerService {
    public Logger create(String type) {
        if ("file".equals(type)) {
            return new FileLogger();
        }
        if ("db".equals(type)) {
            return new DatabaseLogger();
        }
        throw new IllegalArgumentException("不支持的日志类型");
    }
}
```

如果日志类型会继续扩展，可以把创建逻辑移动到工厂：

```java
public interface LoggerFactory {
    String type();
    Logger createLogger();
}

public class FileLoggerFactory implements LoggerFactory {
    public String type() {
        return "file";
    }

    public Logger createLogger() {
        return new FileLogger();
    }
}
```

再用注册表统一选择：

```java
public class LoggerFactoryRegistry {
    private final Map<String, LoggerFactory> factories;

    public LoggerFactoryRegistry(List<LoggerFactory> factoryList) {
        this.factories = factoryList.stream()
                .collect(Collectors.toMap(LoggerFactory::type, factory -> factory));
    }

    public Logger create(String type) {
        LoggerFactory factory = factories.get(type);
        if (factory == null) {
            throw new IllegalArgumentException("不支持的日志类型");
        }
        return factory.createLogger();
    }
}
```

这样新增 `KafkaLogger` 时，只需要新增 `KafkaLoggerFactory` 并注册，不需要改原有分支。

## 类图说明

```plaintext
          +-------------------+
          |   Product         |<----------------+
          +-------------------+                 |
                  ▲                            |
      +-----------+-----------+                |
      |                       |                |
+------------+        +---------------+        |
| ConcreteA  |        |  ConcreteB     |        |
+------------+        +---------------+        |
                                               |
        +----------------------+
        | Creator（工厂接口）  |---------------------> createProduct()
        +----------------------+
                  ▲
       +----------+----------+
       |                     |
+----------------+  +----------------+
| FactoryA        |  | FactoryB        |
+----------------+  +----------------+
| createProduct() |  | createProduct() |
+----------------+  +----------------+

```

## 使用示例

我们以一个日志系统为例，支持两种日志：文件日志 和 数据库日志。



1. 抽象产品接口

```java
public interface Logger {
    void log(String message);
}

```

2. 具体产品类

```java
public class FileLogger implements Logger {
    public void log(String message) {
        System.out.println("写入文件日志: " + message);
    }
}

public class DatabaseLogger implements Logger {
    public void log(String message) {
        System.out.println("写入数据库日志: " + message);
    }
}

```

3. 抽象工厂接口

```java
public interface LoggerFactory {
    Logger createLogger();  // 工厂方法
}


```

4. 具体工厂类

```java
public class FileLoggerFactory implements LoggerFactory {
    public Logger createLogger() {
        // 可加入一些初始化逻辑，如检查路径等
        return new FileLogger();
    }
}

public class DatabaseLoggerFactory implements LoggerFactory {
    public Logger createLogger() {
        // 可加入数据库连接检查等逻辑
        return new DatabaseLogger();
    }
}


```

5. 客户端调用

```java
public class Client {
    public static void main(String[] args) {
        LoggerFactory factory;

        // 假设从配置读取
        String logType = "file";  // 可改为 "db"

        if (logType.equals("file")) {
            factory = new FileLoggerFactory();
        } else {
            factory = new DatabaseLoggerFactory();
        }

        Logger logger = factory.createLogger();
        logger.log("这是一条日志消息。");
    }
}

```

## 优缺点分析

**✅ 优点**
符合开闭原则：新增产品时不修改已有工厂和产品代码；

封装对象创建逻辑，易于维护；

降低耦合度：客户端依赖抽象，不依赖具体类。

**❌ 缺点**
每新增一个产品类，就必须新增一个对应的工厂类，增加类数量；

简单场景下使用可能显得过度设计。

## 与简单工厂的区别

| 简单工厂          | 工厂方法            |
| ------------- | --------------- |
| 使用一个工厂类生产所有产品 | 每个具体工厂类生产一个具体产品 |
| 不符合开闭原则       | 符合开闭原则          |
| 适合产品数量固定      | 适合产品种类不断扩展的系统   |
