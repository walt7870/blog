# 工厂方法

工厂方法让具体创建者决定产品实现，高层流程通过产品接口完成工作。核心是把可覆盖的创建操作留给扩展点，而不仅仅是给 `new` 换个位置。

![日志流程、工厂方法与产品的关系](/design-pattern/patterns/factory-method.svg)

## 从稳定流程中分离创建

假设导出完成后要记录一条日志。日志写入流程不想知道具体输出对象，但控制台与内存记录的创建方式不同。抽象创建者可以固定“取得记录器、记录消息”的流程，具体创建者覆盖 `createLogger()`。

简单工厂则通常在一个方法内按类型选择产品；注册表按键查找创建者或供应器。它们都能集中创建逻辑，但不必被归为经典工厂方法。注册表也不天然符合开闭原则，新增实现仍需装配与配置验证。

## 可运行示例

以下 Java 17+ 程序只演示控制台与内存记录，不接入真实文件或数据库。每次 `execute()` 都创建一个记录器，内存记录器也不会跨调用保留内容。

```java
import java.util.ArrayList;
import java.util.List;

public final class FactoryMethodDemo {
    interface Logger {
        void log(String message);
    }

    static final class ConsoleLogger implements Logger {
        public void log(String message) {
            System.out.println("控制台: " + message);
        }
    }

    static final class MemoryLogger implements Logger {
        private final List<String> messages = new ArrayList<>();

        public void log(String message) {
            messages.add(message);
            System.out.println("内存记录数: " + messages.size());
        }
    }

    abstract static class LogJob {
        protected abstract Logger createLogger();

        final void execute(String message) {
            Logger logger = createLogger();
            logger.log(message);
        }
    }

    static final class ConsoleLogJob extends LogJob {
        protected Logger createLogger() {
            return new ConsoleLogger();
        }
    }

    static final class MemoryLogJob extends LogJob {
        protected Logger createLogger() {
            return new MemoryLogger();
        }
    }

    public static void main(String[] args) {
        List<LogJob> jobs = List.of(new ConsoleLogJob(), new MemoryLogJob());
        for (LogJob job : jobs) {
            job.execute("订单导出完成");
        }
    }
}
```

使用 `javac FactoryMethodDemo.java && java FactoryMethodDemo` 运行，输出 `控制台: 订单导出完成` 和 `内存记录数: 1`。稳定流程位于 `LogJob.execute()`，具体创建位于子类的工厂方法。启动装配仍要选择子类，模式并没有消除选择点。

## 资源产品怎么处理

若产品改成文件写入器，工厂方法需要约定新建还是共享，以及谁关闭。新建并由当前流程拥有的 `AutoCloseable` 产品可以在流程内使用 `try-with-resources`；共享连接池则不能被每次调用顺手关闭。

创建失败时应停止当前操作并报告原因，不能返回 `null` 把失败推迟到日志调用处。若日志是业务审计的必要部分，还需要定义写入失败对主业务的影响；“只是记录日志”不能替代一致性要求。

## 与相近结构的区别

| 结构 | 创建决定放在哪里 | 适用边界 |
| --- | --- | --- |
| 简单工厂 | 集中方法中的分支或配置 | 类型少且稳定时容易理解 |
| 工厂方法 | 具体创建者覆盖创建操作 | 稳定流程允许扩展产品实现 |
| 抽象工厂 | 一组相关创建操作的具体实现 | 多个配套产品要整体切换 |
| 供应器注册表 | 键对应的供应器与装配 | 按配置查找实现，需处理重复键和未知键 |

工厂方法不要求每个产品都必须有一个单独工厂类，也不规定每次必须新建实例；应把这些选择写进合同。若系统只有一个产品且创建逻辑稳定，直接构造更少跳转。

## 验收

用所有具体创建者运行相同流程测试，检查产品契约、创建失败、重复调用与关闭责任。新增一种日志产品后，稳定流程应能继续运行；装配入口的变化应可定位，不能只证明“没改旧类”就忽略漏注册或未知配置。
