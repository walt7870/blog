# 合成复用原则

合成复用原则强调优先通过对象组合与委托复用能力。它与 GoF 提倡的“优先对象组合，而不是类继承”一致：变化维度独立时，让对象分别承担能力，在组装处决定组合方式。

![日志能力通过委托逐层组合](/design-pattern/principles/crp.svg)

## 为什么继承容易膨胀

日志既可以输出到控制台或文件，也可以增加前缀、过滤和敏感字段遮盖。若把输出位置和处理能力都写进继承树，很快会出现多种组合子类。新增一种处理能力时，又需要为每种输出位置增加对应子类。

组合把处理能力与输出目标分开：前缀组件持有另一个 `Logger`，处理消息后交给它。调用方仍只依赖同一接口，组合关系由组装代码决定。

## 可运行示例

以下 Java 17+ 示例使用字段名精确的 `token` 键值对做有限遮盖，演示委托顺序；它不是覆盖所有凭据形式的安全日志过滤器。

```java
import java.util.Objects;

public class LoggerComposition {
    interface Logger {
        void log(String message);
    }

    static final class ConsoleLogger implements Logger {
        public void log(String message) {
            System.out.println(message);
        }
    }

    record PrefixLogger(Logger delegate) implements Logger {
        PrefixLogger {
            Objects.requireNonNull(delegate);
        }
        public void log(String message) {
            delegate.log("[订单] " + message);
        }
    }

    record TokenMaskLogger(Logger delegate) implements Logger {
        TokenMaskLogger {
            Objects.requireNonNull(delegate);
        }
        public void log(String message) {
            delegate.log(message.replaceAll("token=[^\\s]+", "token=***"));
        }
    }

    public static void main(String[] args) {
        Logger logger = new PrefixLogger(
                new TokenMaskLogger(new ConsoleLogger()));
        logger.log("创建成功 token=demo");
    }
}
```

输出为 `[订单] 创建成功 token=***`。运行命令是 `javac LoggerComposition.java && java LoggerComposition`。输入先经过前缀组件，再经过遮盖组件，最后交给控制台；构造器的嵌套方向与调用方向一致。

## 取舍与验收

新增文件输出时，只需实现相同接口再组装；新增处理能力时，单独测试组件并补组合测试。需要检查调用顺序、异常传播与资源关闭：异步、压缩、加密、重试等组件通常不满足交换律，不能任意调换位置。

继承仍适合稳定的行为契约与模板流程。组合也有成本，层数过深会增加排查难度，资源所有权不清还会导致重复关闭。若当前只需要固定的一次输出，直接函数调用就足够，无需先建立组件链。
