# 观察者模式

观察者（Observer）把一个变化通知给多个订阅者，发布方只依赖通知接口。订单已支付后，页面提示和进程内统计可以分别响应；增加一个非关键统计监听器，不必把它的实现塞进支付处理流程。但“通知函数返回”与“所有业务后续都可靠完成”是不同的保证。

![进程内事件分发与订阅生命周期](/design-pattern/patterns/observer.svg)

## 通知的是事实，还是要求必须完成的动作

`OrderPaid` 表示已支付这一事实；`DeductInventory` 则是要求扣减库存的命令。若库存扣减必须与订单状态共同满足一致性约束，就不能把它随意移入一个失败后被忽略的监听器。观察者减少直接依赖，却不会消除事务、时间顺序和失败依赖。

可以先用通知栏理解：一个任务完成后，页面刷新、统计计数、桌面提醒都想知道结果。通知栏不必知道三个实现的细节；其中桌面提醒权限被拒绝，也不应把已经完成的任务改成失败。反过来，如果“校验通过才允许付款”是前置规则，就应在主流程中显式执行，而不是靠监听顺序暗中保证。

## 一个有明确边界的分发器

下面的程序同步、单线程、仅在进程内运行。注册使用唯一标识，重复标识拒绝；每次发布先复制订阅快照，通知期间退订从下一次发布生效。非关键监听器的运行时异常被记录为结果，其他监听器继续；不捕获 JVM `Error`，也不提供可靠重试。

保存为 `ObserverDemo.java`，使用 Java 17+ 编译运行：

```java
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Consumer;

public class ObserverDemo {
    record OrderPaid(String eventId, String orderId, long amountFen) {
        OrderPaid {
            if (eventId == null || eventId.isBlank()
                    || orderId == null || orderId.isBlank() || amountFen < 0) {
                throw new IllegalArgumentException("事件标识、订单或金额非法");
            }
        }
    }

    interface Subscription extends AutoCloseable {
        @Override
        void close();
    }

    record Registration(String id, Consumer<OrderPaid> listener) {}
    record Delivery(String id, boolean success, String errorType) {}

    static final class Publisher {
        private final Map<String, Registration> registrations = new LinkedHashMap<>();
        private boolean publishing;

        Subscription subscribe(String id, Consumer<OrderPaid> listener) {
            if (id == null || id.isBlank()) throw new IllegalArgumentException("订阅标识为空");
            Registration registration = new Registration(id, Objects.requireNonNull(listener));
            if (registrations.putIfAbsent(id, registration) != null) {
                throw new IllegalArgumentException("订阅标识重复");
            }
            return () -> {
                if (registrations.get(id) == registration) registrations.remove(id);
            };
        }

        List<Delivery> publish(OrderPaid event) {
            Objects.requireNonNull(event);
            if (publishing) throw new IllegalStateException("本分发器不支持重入发布");
            List<Registration> snapshot = List.copyOf(registrations.values());
            List<Delivery> results = new ArrayList<>();
            publishing = true;
            try {
                for (Registration registration : snapshot) {
                    try {
                        registration.listener().accept(event);
                        results.add(new Delivery(registration.id(), true, ""));
                    } catch (RuntimeException failure) {
                        results.add(new Delivery(registration.id(), false,
                                failure.getClass().getSimpleName()));
                    }
                }
                return List.copyOf(results);
            } finally {
                publishing = false;
            }
        }
    }

    public static void main(String[] args) {
        Publisher publisher = new Publisher();
        List<String> calls = new ArrayList<>();
        Subscription ui = publisher.subscribe("ui", event -> calls.add("ui:" + event.eventId()));
        publisher.subscribe("optional-metric", event -> {
            throw new IllegalStateException("演示统计失败");
        });
        Subscription audit = publisher.subscribe("local-log",
                event -> calls.add("log:" + event.eventId()));
        OrderPaid first = new OrderPaid("E-1", "O-1", 10001);
        List<Delivery> results = publisher.publish(first);
        if (!calls.equals(List.of("ui:E-1", "log:E-1"))
                || results.size() != 3 || results.get(1).success()
                || !results.get(2).success()) {
            throw new AssertionError("监听器失败隔离错误");
        }
        audit.close();
        audit.close();
        calls.clear();
        List<Delivery> second = publisher.publish(new OrderPaid("E-2", "O-2", 500));
        if (!calls.equals(List.of("ui:E-2")) || second.size() != 2) {
            throw new AssertionError("退订未生效");
        }
        ui.close();
        System.out.println(results);
        System.out.println("失败监听器不阻断后续；重复退订安全；下次发布不再通知已退订者");
    }
}
```

这里的注册顺序是该示例的显式合同，不是所有观察者框架的共同保证。不能让监听器 B 假定监听器 A 已经写好了共享数据；有这样的前后依赖时，应把它们放在同一个处理流程，或明确事件阶段。

每次事件携带不可变数据，监听器无需回头读取发布者的“当前订单”。若改用拉取方式，通知 E-1 后再读取当前状态可能已经看到 E-2；异步处理尤其需要事件版本或快照。不可变 `record` 也只冻结字段引用，本例的字段是不可变字符串与数值，含可变集合时还需复制。

## 订阅关系也有生命周期

组件卸载、页面关闭或会话结束时，应关闭相应订阅，否则长生命周期发布者会一直持有监听器及其捕获对象。弱引用不是通用替代：没有其他强引用时，监听器可能被回收并无声停止通知；后台清理线程自身也需要有退出方式。

本例使用订阅快照，因此监听器在一次回调中新增或取消订阅不会修改当前循环。取消不代表中断已经开始的回调；多线程版本要进一步定义“退订返回后，是否还允许旧快照调用”。简单换成 `synchronizedList` 不会让复合操作、复制与遍历自动全部原子化。

`publishing` 保护防止本分发器递归发布形成通知环，但它不是跨线程锁。所有方法都必须由同一个事件循环调用；若要跨线程发布，应另行设计串行调度或并发合同，不能把这个程序直接注册成任意线程可用的单例服务。

## 同步、异步与可靠消息

| 方式 | 调用返回代表什么 | 需要额外解决的问题 |
| --- | --- | --- |
| 同步本地回调 | 本次回调已执行或失败 | 异常传播、监听耗时、重入与顺序 |
| 提交到本地线程池 | 任务已提交，可能尚未执行 | 容量、拒绝、上下文、关闭、取消与结果收集 |
| 带持久化的消息分发 | 由具体确认协议决定 | 事务衔接、重投、去重、顺序和重放 |

观察者与发布订阅有相近思想，不能一面把两者完全等同，一面又断言前者只能同步、后者一定依赖消息代理。进程内事件总线也可以做订阅过滤；消息代理则可能提供跨进程路由和持久化，但这些能力须由实际实现与配置保证。

把每个监听器放到 `parallelStream()` 并不会自动提高吞吐，还会改变顺序、增加共享状态竞争，并可能阻塞公共线程池。异步分发应设置有界容量，明确慢订阅者如何积压、拒绝或降级；需要可靠投递时，也要持久记录失败和重试，而不是只打印异常。

## Spring 事件与事务提交

Spring 的 `ApplicationEventPublisher` 负责把事件交给多播器，单凭调用接口不能推断同步或异步。默认简单多播器通常在发布线程调用监听器，也可以配置执行器；方法监听器的 `@EventListener` 应放在处理方法上。框架的实际执行合同需要结合所用版本与配置判断。

`@TransactionalEventListener` 可以绑定到事务阶段，默认 `AFTER_COMMIT`；没有活动事务时默认不会执行，除非明确开启 `fallbackExecution`。提交前发送外部邮件可能产生“数据库回滚但邮件已发送”的不一致；提交后回调又存在“数据库已提交、进程在通知前退出”的丢失窗口。

因此，提交后监听器适合有相应丢失容忍度的进程内后续动作，不能单独保证通知可靠。需要订单事件可恢复时，可在业务事务中一起写出站事件，再由独立发布流程重试与确认，机制见[事件驱动架构](../../architecture/event-driven-architecture)。提交后回调如需再写数据库，还要明确新的事务边界，不能假设旧事务会再次提交。

RxJava等流式API还定义订阅、完成、错误和调度合同，冷流可能为每个订阅者重新运行生产逻辑；不能只看有多个 `subscribe()` 就认定每人消费的是同一次广播。背压和可靠存储也应分别判断。

## 失败与验收

至少检查无订阅者、重复订阅标识、正常通知、某个监听器失败、通知中注册或退订、重复退订、重入发布和发布者关闭。确认“失败隔离”是否只适用于非关键动作，关键一致性要求应回到主流程或可靠事件机制中。

日志应能关联事件标识、对象版本、监听器、开始结束和失败类型；敏感支付数据不应随整个事件对象输出。同步耗时应覆盖失败回调，异步耗时还应区分排队与执行。事件被重复投递时，需要副作用幂等，不能靠“观察者天然只通知一次”的假设保护账目。
