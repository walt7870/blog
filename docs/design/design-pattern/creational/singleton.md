# 单例模式

单例模式在约定范围内控制一个类型的实例数量，并提供获取它的入口。Java 静态字段通常以类加载器为边界，容器中的单例通常以容器及 Bean 定义为边界；多个 JVM 进程仍会各有实例。集群唯一的任务或写入者需要分布式协调，不能靠静态字段保证。

![单例访问范围、初始化与使用边界](/design-pattern/patterns/singleton.svg)

## 先判断是否需要唯一

共享一个无状态服务、连接池或配置快照，可以避免重复初始化，但这些对象不天然只能有一份。一个服务可能为不同数据库建立多个连接池，也可能为不同负载建立独立线程池。应先确定实例的身份、所有者和关闭时机，再选择容器管理或静态入口。

用户、请求、订单等可变状态应保留在相应生命周期中。把“当前用户”写进单例字段会在并发请求间互相覆盖；单例初始化正确也无法避免这种业务竞态。

## 初始化方式

| 方式 | 初始化时机 | 初始化安全与代价 |
| --- | --- | --- |
| 静态字段直接创建 | 类初始化时，未必是 JVM 启动时 | 类初始化机制保证安全发布；无需按需延迟时较直接 |
| 同步访问方法 | 首次获取时 | `synchronized` 保证初始化及获取过程互斥；是否有性能影响需测量 |
| 双重检查锁 | 首次获取时 | Java 5+ 内存模型下必须使用 `volatile`，实现更易出错 |
| 静态内部类 | 首次触发 Holder 初始化时 | 依赖类初始化机制实现延迟创建 |
| 枚举常量 | 枚举类初始化时 | 简洁，标准反射与序列化有特殊规则；内部字段仍需并发保护 |

没有同步的 `if (instance == null) instance = new Singleton()` 会发生并发竞争，不应作为多线程方案。双重检查锁中的 `volatile` 不只是防止创建多个对象，也承担安全发布所需的可见性和顺序约束。

## 静态内部类示例

以下 Java 17+ 程序验证多个线程获取到同一引用。静态实例不持有外部连接，因此无需演示关闭；若换成连接池，必须另外定义关闭责任。

```java
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

public final class SingletonDemo {
    private SingletonDemo() {}

    private static class Holder {
        private static final SingletonDemo INSTANCE = new SingletonDemo();
    }

    public static SingletonDemo getInstance() {
        return Holder.INSTANCE;
    }

    public static void main(String[] args) throws Exception {
        ExecutorService workers = Executors.newFixedThreadPool(4);
        try {
            List<Future<SingletonDemo>> results = new ArrayList<>();
            for (int i = 0; i < 100; i++) {
                results.add(workers.submit(SingletonDemo::getInstance));
            }
            SingletonDemo expected = getInstance();
            for (Future<SingletonDemo> result : results) {
                if (result.get() != expected) {
                    throw new AssertionError("实例不一致");
                }
            }
            System.out.println("100 次获取均为同一实例");
        } finally {
            workers.shutdown();
        }
    }
}
```

使用 `javac SingletonDemo.java && java SingletonDemo` 运行。这里证明的是一次执行中这些调用返回同一引用，并不证明跨类加载器、跨进程唯一，也不证明该对象未来新增的可变字段线程安全。

## 枚举与双重检查锁

只需要简单静态实例时，可以使用枚举：

```java
enum Registry {
    INSTANCE;
}
```

标准反射 API 不允许创建枚举实例，标准 Java 序列化按枚举类型与名称恢复常量。普通可序列化单例则需要考虑 `readResolve()` 等机制；这不是对所有运行时修改手段的安全承诺。

下面的双重检查锁是另一种结构，通常无需与 Holder 同时采用：

```java
final class LazyRegistry {
    private static volatile LazyRegistry instance;
    private LazyRegistry() {}

    static LazyRegistry getInstance() {
        LazyRegistry current = instance;
        if (current == null) {
            synchronized (LazyRegistry.class) {
                current = instance;
                if (current == null) {
                    current = new LazyRegistry();
                    instance = current;
                }
            }
        }
        return current;
    }
}
```

## 失败方式与验证

单例初始化若访问网络并抛异常，会把外部失败与类初始化绑定；使用 Holder 时，失败后的该类还可能处于错误状态，不能假设下一次调用自动重试。因此，可能失败且需要恢复的连接建立通常更适合由可管理的服务生命周期承担。

除并发获取测试外，还要测试配置变更、停机、资源关闭和测试替换。通过构造器注入共享对象能让依赖可见，通常比到处调用静态入口更容易测试。若实际需求是缓存或对象池，应分别处理键、容量、过期和归还，不要把它们简化成“一个单例就够”。
