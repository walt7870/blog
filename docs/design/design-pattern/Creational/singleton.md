# 单例模式

## 概括

**单例模式**确保一个类在系统中只有一个实例，并提供一个全局访问点来获取它，单例模式用于控制全局唯一资源实例，通过私有构造 + 静态方法实现“只生成一次、处处可用”，适用于配置信息、缓存、日志等场景。但使用时需注意线程安全、测试可用性、序列化防护等问题。


## 使用场景

适用于以下场景：

程序中只需要一个实例，且该实例全局共享，例如：

* 配置管理类

* 数据库连接池

* 日志管理器

* 缓存系统

创建对象开销较大，频繁创建影响性能。

## 类图说明

```plaintext
        ┌──────────────────────┐
        │      Singleton       │
        └─────────┬────────────┘
                  │
      ┌───────────▼────────────┐
      │ + getInstance(): Self  │  ← 提供访问唯一实例的静态方法
      │ - Singleton()          │  ← 构造方法私有化
      └────────────────────────┘

```

## 使用示例

1. 饿汉式（类加载即创建实例，线程安全，推荐）

```java
public class Singleton {
    private static final Singleton instance = new Singleton();

    private Singleton() {
        System.out.println("构造函数只调用一次");
    }

    public static Singleton getInstance() {
        return instance;
    }
}

```

2. 懒汉式（延迟加载，但线程不安全 ❌）

```java
public class Singleton {
    private static Singleton instance;

    private Singleton() {}

    public static Singleton getInstance() {
        if (instance == null) {
            instance = new Singleton();  // 多线程下会创建多个实例
        }
        return instance;
    }
}


```

3. 懒汉式 + 双重检查锁（DCL，推荐 ✅）

```java
public class Singleton {
    private static volatile Singleton instance;

    private Singleton() {}

    public static Singleton getInstance() {
        if (instance == null) {
            synchronized (Singleton.class) {
                if (instance == null) {
                    instance = new Singleton();  // 只会创建一次
                }
            }
        }
        return instance;
    }
}


```

4. 静态内部类（线程安全 + 延迟加载 ✅）

```java
public class Singleton {
    private Singleton() {}

    private static class Holder {
        private static final Singleton INSTANCE = new Singleton();
    }

    public static Singleton getInstance() {
        return Holder.INSTANCE;
    }
}
```

5. 枚举实现（最安全 ✅）

```java
public enum Singleton {
    INSTANCE;

    public void doSomething() {
        System.out.println("Singleton is doing something");
    }
}
```

**天然线程安全（由 JVM 保证）**
枚举类型在 Java 中的实例创建是由 JVM 保证的线程安全的类加载过程完成的。

```java
public enum Singleton {
    INSTANCE;
}
```

JVM 类加载机制确保枚举类只会被加载一次；

枚举实例在类加载时就被创建，不可能被多线程重复创建；

不需要加锁、写 DCL 代码，也不存在懒汉式那种并发风险。

**防止反射攻击**
普通单例类可以被反射破坏，例如：

```java
Constructor<Singleton> constructor = Singleton.class.getDeclaredConstructor();
constructor.setAccessible(true);
Singleton instance2 = constructor.newInstance();  // 破坏单例
```

但是 枚举类的构造方法会在反射时抛出异常：
```java
Exception in thread "main" java.lang.IllegalArgumentException: Cannot reflectively create enum objects
```

枚举类型不能被反射实例化，这是 Java 语言层面的保护。

**防止序列化破坏**
普通单例如果实现 Serializable 接口，会因为反序列化过程创建新对象：

```java
ObjectInputStream in = new ObjectInputStream(new FileInputStream("singleton.obj"));
Singleton s2 = (Singleton) in.readObject();  // 是一个新对象
```

而使用 enum 的单例是天然安全的，反序列化时不会创建新实例，因为枚举的序列化机制由 JVM 保证是单例的。

**代码简洁，不易出错**
相比复杂的 DCL、静态内部类、懒汉/饿汉实现，枚举实现更清晰：

```java
public enum Singleton {
    INSTANCE;

    public void doSomething() {
        System.out.println("枚举单例方法");
    }
}
```

调用也非常简单：

```java
Singleton.INSTANCE.doSomething();
```

## 优缺点分析

**✅ 优点**

| 优点             | 说明                       |
| -------------- | ------------------------ |
| **1. 全局唯一实例**  | 保证系统中只有一个对象，节省资源，防止状态混乱。 |
| **2. 延迟加载可实现** | 结合懒汉模式可延迟对象创建，提升性能。      |
| **3. 全局访问点**   | 提供统一访问接口，便于管理与控制。        |
| **4. 可结合枚举实现** | 枚举方式天然线程安全，防反射、防序列化破坏单例。 |

**❌ 缺点**

| 缺点                 | 说明                             |
| ------------------ | ------------------------------ |
| **1. 不利于扩展和测试**    | 单例隐藏了依赖关系，耦合度高，不利于单元测试和 Mock。  |
| **2. 多线程处理复杂**     | 懒汉式线程安全实现复杂，容易出错（比如 DCL 实现不当）。 |
| **3. 可能被反射/序列化破坏** | 反射或反序列化可能绕过私有构造，创建新实例。需特殊防护。   |

## 变体总结（按初始化时机 + 线程安全）

| 模式        | 是否延迟初始化 | 是否线程安全 | 是否推荐          |
| --------- | ------- | ------ | ------------- |
| 饿汉式       | 否       | 是      | ✅ 推荐          |
| 懒汉式（非同步）  | 是       | 否      | ❌ 不推荐         |
| 懒汉式（同步）   | 是       | 是（效率低） | ⚠️ 一般         |
| 双重检查锁 DCL | 是       | 是      | ✅ 推荐          |
| 静态内部类     | 是       | 是      | ✅ 强烈推荐        |
| 枚举实现（最安全） | 否       | 是      | ✅ 推荐（Java 特有） |
