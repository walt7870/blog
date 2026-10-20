# 适配器模式

适配器（Adapter）把已有接口转换成调用方需要的接口。它常用于接入第三方 SDK、替换旧系统或隔离协议差异。转换的对象包括参数、返回值、异常和状态语义，不能只把方法改个名字。

![通知适配器的调用与状态转换](/design-pattern/patterns/adapter.svg)

## 接入厂商通知接口

订单导出完成后，业务希望调用 `NotificationPort.submit()` 提交通知。旧 SDK 却使用 `push(address, template, values)`，返回状态码和请求编号。若业务到处判断这些字段，换厂商时就必须修改每个调用点。

对象适配器实现内部接口，并持有旧 SDK。业务只看内部合同：返回回执表示厂商已受理，不能据此断言用户已收到消息；明确限流可按上层策略延后，未知状态必须暴露为失败。厂商若只提供同步“已送达”结果，也要先核对其定义，不能机械映射。

下例用本地类模拟 SDK，不连接真实邮件服务。保存为 `AdapterDemo.java`，可在 Java 17+ 编译运行：

```java
import java.util.Map;
import java.util.Objects;

public class AdapterDemo {
    record Notification(String address, String orderNo) {
        Notification {
            if (address == null || address.isBlank()
                    || orderNo == null || orderNo.isBlank()) {
                throw new IllegalArgumentException("收件地址和订单号不能为空");
            }
        }
    }

    record Receipt(String requestId) {}
    record VendorReply(int code, String requestId) {}

    interface NotificationPort {
        Receipt submit(Notification notification);
    }

    static final class RateLimited extends RuntimeException {
        RateLimited() { super("厂商限流，交由上层安排后续处理"); }
    }

    static final class VendorFailure extends RuntimeException {
        VendorFailure(String message) { super(message); }
    }

    static final class LegacyMailSdk {
        private final VendorReply reply;

        LegacyMailSdk(VendorReply reply) { this.reply = reply; }

        VendorReply push(String address, String template,
                         Map<String, String> values) {
            System.out.println("旧接口: " + template + " / " + values.get("order"));
            return reply;
        }
    }

    static final class MailAdapter implements NotificationPort {
        private final LegacyMailSdk sdk;

        MailAdapter(LegacyMailSdk sdk) {
            this.sdk = Objects.requireNonNull(sdk);
        }

        public Receipt submit(Notification notification) {
            Objects.requireNonNull(notification);
            VendorReply reply = sdk.push(notification.address(), "EXPORT_READY",
                    Map.of("order", notification.orderNo()));
            if (reply == null) throw new VendorFailure("厂商回执为空");
            if (reply.code() == 429) throw new RateLimited();
            if (reply.code() != 202 || reply.requestId() == null
                    || reply.requestId().isBlank()) {
                throw new VendorFailure("无法确认受理状态: " + reply.code());
            }
            return new Receipt(reply.requestId());
        }
    }

    public static void main(String[] args) {
        Notification message = new Notification("user@example.com", "O-1001");
        NotificationPort port = new MailAdapter(
                new LegacyMailSdk(new VendorReply(202, "request-1")));
        System.out.println("已受理: " + port.submit(message).requestId());

        try {
            new MailAdapter(new LegacyMailSdk(new VendorReply(429, null)))
                    .submit(message);
            throw new AssertionError("限流必须显式返回失败");
        } catch (RateLimited expected) {
            System.out.println(expected.getMessage());
        }
        try {
            new MailAdapter(new LegacyMailSdk(new VendorReply(500, null)))
                    .submit(message);
            throw new AssertionError("未知失败不能伪装成成功");
        } catch (VendorFailure expected) {
            System.out.println(expected.getMessage());
        }
    }
}
```

`NotificationPort` 是目标接口，`LegacyMailSdk` 是被适配对象，`MailAdapter` 承担转换。样例中的 202、429 与模板名是这个模拟厂商的合同，不能直接套用到其他 SDK。真实接入还要验证地址格式、模板字段、错误码、超时与返回编号的可信度。

## 类适配、对象适配与默认回调

| 实现形式 | 结构 | 适用边界 |
| --- | --- | --- |
| 对象适配 | `Adapter implements Target`，内部持有 `Adaptee` | 组合已有实例，可注入不同实现；上例属于此类 |
| 类适配 | `Adapter extends Adaptee implements Target` | Java只能继承一个类，且被适配类不能是 `final` |
| 默认回调适配类 | 抽象类为监听器提供空方法，子类按需覆盖 | 减少回调样板，不一定承担两个业务接口之间的语义转换 |

不必为每个外部类都创建适配器。若目标接口和外部接口已经一致，增加纯转发对象未必有价值。若一个厂商支持撤回，另一个不支持，就不能让后者静默返回“撤回成功”；应缩小共同合同，或把能力查询与撤回能力单独建模。

## Spring MVC 的处理器适配

Spring MVC 中，`DispatcherServlet` 先通过 `HandlerMapping` 找到处理器，再寻找能处理它的 `HandlerAdapter`。`RequestMappingHandlerAdapter` 支持注解控制器对应的 `HandlerMethod`；`SimpleControllerHandlerAdapter` 对接传统 `Controller`，`HandlerFunctionAdapter` 对接函数式处理器。

这里的适配使前端控制器无需实现每种处理器的调用细节。实际适配器还会处理参数解析、返回值等机制，不能用“直接反射调用一个方法”代替其完整实现。Starter 自动配置、视图解析与消息转换各自有独立职责，不能笼统归为同一种适配器。

## 失败与验收

先确认“已受理、已发送、已送达”的状态区别，再验证成功、限流、参数错误、空回执和未知错误码。若调用超时，结果可能是未知：厂商可能已经接收请求。自动重试需要稳定幂等键或厂商查询能力，不能由适配器无条件再次发送。

适配层记录外部请求编号与内部业务编号，便于追踪；日志避免写入完整收件地址与敏感消息。目标接口的测试应检查共同语义，厂商适配测试则检查字段与错误映射。上线前仍需用真实 SDK 的测试环境验证，模拟程序只能证明本地转换逻辑。

需要简化多个子系统的常用调用时看[外观](./facade.md)；需要给同接口对象叠加处理能力时看[装饰器](./decorator.md)。
