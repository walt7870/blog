# 工厂方法

## 概括

工厂方法模式定义了一个创建对象的接口，但由子类决定要实例化的类。这样，父类可以将实例化的职责交给子类，实现了对象创建的延迟和扩展性。

## 使用场景

工厂方法模式适用于以下场景：

* 对象的创建逻辑复杂，需要封装；
* 系统中存在多个产品类，但它们都继承自一个共同的接口或父类；
* 希望代码遵循开闭原则，对扩展开放、对修改封闭。

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
