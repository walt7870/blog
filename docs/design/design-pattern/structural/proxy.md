# 代理模式

代理（Proxy）用代表对象控制对目标的访问。代理与目标通常实现同一接口，调用方通过代理发起请求；权限检查、延迟创建、缓存或远程通信发生在这个调用边界上。接口相同并不能消除网络超时、授权变化等语义差异，合同仍须明确。

![保护代理与每次调用的授权判断](/design-pattern/patterns/proxy.svg)

## 先确定控制哪一种访问

保护代理检查身份与权限；虚拟代理延迟创建或加载目标；远程代理把本地调用转换成网络交互；缓存代理按明确的新鲜度合同复用结果。这些职责可以组合，也可以拆成多层，关键是顺序与副作用可追踪。

一个常见错误是在共享代理中保存 `currentUser`，先调用 `setUser()` 再访问数据。并发请求会覆盖身份，即使底层 Map 是并发容器也无法修复这类业务竞争。可信上下文应随每次调用传递，或来自正确隔离的请求作用域。

## 保护代理：撤销后下一次访问即拒绝

下面演示同一报告编号在不同租户中的隔离，以及授权撤销。上下文由测试代码模拟，真实系统必须由服务端认证结果构造，不能直接信任请求体或任意 `X-Tenant-Id`。样例不包含缓存、数据库或网络。

保存为 `ProxyDemo.java`，可在 Java 17+ 编译运行：

```java
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public class ProxyDemo {
    record Session(String tenant, String user) {
        Session {
            if (tenant == null || tenant.isBlank()
                    || user == null || user.isBlank()) {
                throw new IllegalArgumentException("可信身份不能为空");
            }
        }
    }

    record ResourceKey(String tenant, String reportId) {}
    record Grant(String tenant, String user, String reportId) {}

    interface ReportReader {
        String read(Session session, String reportId);
    }

    static final class AccessPolicy {
        private final Set<Grant> grants = ConcurrentHashMap.newKeySet();

        void allow(Grant grant) { grants.add(grant); }
        void revoke(Grant grant) { grants.remove(grant); }

        boolean allowed(Session session, String reportId) {
            return grants.contains(new Grant(
                    session.tenant(), session.user(), reportId));
        }
    }

    static final class MemoryReader implements ReportReader {
        private final Map<ResourceKey, String> reports;
        private int calls;

        MemoryReader(Map<ResourceKey, String> reports) {
            this.reports = Map.copyOf(reports);
        }

        public String read(Session session, String reportId) {
            calls++;
            String content = reports.get(new ResourceKey(session.tenant(), reportId));
            if (content == null) throw new NoSuchElementException("报告不存在");
            return content;
        }
    }

    static final class ProtectedReader implements ReportReader {
        private final ReportReader target;
        private final AccessPolicy policy;

        ProtectedReader(ReportReader target, AccessPolicy policy) {
            this.target = Objects.requireNonNull(target);
            this.policy = Objects.requireNonNull(policy);
        }

        public String read(Session session, String reportId) {
            Objects.requireNonNull(session);
            if (reportId == null || reportId.isBlank()) {
                throw new IllegalArgumentException("报告编号不能为空");
            }
            if (!policy.allowed(session, reportId)) {
                throw new SecurityException("无权读取报告");
            }
            return target.read(session, reportId);
        }
    }

    static void expectDenied(Runnable action) {
        try {
            action.run();
            throw new AssertionError("必须拒绝访问");
        } catch (SecurityException expected) {
            System.out.println(expected.getMessage());
        }
    }

    public static void main(String[] args) {
        MemoryReader target = new MemoryReader(Map.of(
                new ResourceKey("tenant-a", "report-1"), "租户A报告",
                new ResourceKey("tenant-b", "report-1"), "租户B报告"));
        AccessPolicy policy = new AccessPolicy();
        Grant grant = new Grant("tenant-a", "user-1", "report-1");
        policy.allow(grant);
        ReportReader reader = new ProtectedReader(target, policy);
        Session session = new Session("tenant-a", "user-1");
        System.out.println(reader.read(session, "report-1"));
        expectDenied(() -> reader.read(new Session("tenant-b", "user-1"), "report-1"));
        policy.revoke(grant);
        expectDenied(() -> reader.read(session, "report-1"));
        if (target.calls != 1) throw new AssertionError("拒绝请求不得访问目标");
        System.out.println("目标仅被调用 1 次");
    }
}
```

代理每次读取时判断授权，没有在构造器里永久记住“允许”。撤销在本例授权查询之前完成时，后续读取会被拒绝；若撤销与已经通过判断的调用并发，仍需定义在途请求的处理合同，普通前置检查不是原子撤销协议。

这个内存目标的调用计数只供单线程演示。真实服务还要保证调用方无法通过其他入口绕过保护代理，必要时在数据访问层再次实施租户或对象级权限，不能把一个包装类当成完整安全边界。

## 缓存、延迟加载与远程失败

缓存代理应先判断当前请求的访问权，再检查缓存。键必须覆盖影响结果的租户、资源、参数和必要的身份或授权版本；数据更新与权限变更也要有失效策略。把 SQL 文本或 `Arrays.toString(args)` 当作通用键可能碰撞或混淆身份，不应照搬。

过期数据能否降级返回要由业务决定。库存、余额与权限结果通常不能因为目标失败就返回旧值；缓存容量、并发加载和错误缓存也要单独定义。清空整个 Map 不是 LRU，两个并发 Map 分别存结果与时间戳也不构成原子快照。

虚拟代理需要把“创建目标”本身延后，传入一个已经创建好的昂贵对象再设置 `initialized=true` 并没有实现延迟创建。加载过程中应区分未开始、加载中、成功与失败，明确等待、取消与重试；同步方法里 `sleep()` 也不是后台异步加载。

远程代理需要超时预算、序列化合同与错误分类。结果未知的写入不能无条件换节点重试；批量操作还要定义部分成功。熔断、退避与并发限流优先使用成熟组件，不能只用一个未同步失败计数器来代替生产级机制。

## JDK 动态代理与异常传播

静态代理显式实现接口，JDK动态代理通过 `InvocationHandler` 拦截接口方法。下面独立程序演示保留目标异常类型，并单独处理 `equals`、`hashCode`、`toString`，避免把代理身份比较直接转发给目标。

保存为 `DynamicProxyDemo.java`：

```java
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;

public class DynamicProxyDemo {
    public interface LabelService {
        String label(String text);
    }

    public static void main(String[] args) {
        LabelService target = text -> {
            if (text == null || text.isBlank()) {
                throw new IllegalArgumentException("内容不能为空");
            }
            return "标签: " + text;
        };
        LabelService proxy = (LabelService) Proxy.newProxyInstance(
                LabelService.class.getClassLoader(),
                new Class<?>[]{LabelService.class},
                (self, method, values) -> {
                    if (method.getDeclaringClass() == Object.class) {
                        return switch (method.getName()) {
                            case "equals" -> self == values[0];
                            case "hashCode" -> System.identityHashCode(self);
                            case "toString" -> "LabelService代理";
                            default -> throw new IllegalStateException("未知Object方法");
                        };
                    }
                    try {
                        return method.invoke(target, values);
                    } catch (InvocationTargetException failure) {
                        throw failure.getCause();
                    }
                });
        System.out.println(proxy.label("订单"));
        if (!proxy.equals(proxy) || proxy.equals(target)) {
            throw new AssertionError("代理身份比较不符合合同");
        }
        try {
            proxy.label("");
            throw new AssertionError("目标异常必须传播");
        } catch (IllegalArgumentException expected) {
            System.out.println(expected.getMessage());
        }
    }
}
```

反射把目标异常包装在 `InvocationTargetException` 中，示例解包后重新抛出原因。如果处理器抛出的受检异常不在接口允许范围内，JDK代理仍可能包装为 `UndeclaredThrowableException`；不能简单宣称所有异常都原样返回。

Spring AOP 使用 JDK动态代理或基于类的代理。目标内部的 `this.otherMethod()` 通常绕过代理增强；类代理也不能增强 `final` 方法或直接覆盖私有方法。事务与缓存是否生效，应验证调用是否经过实际代理，而不是只确认方法上有注解。Hibernate的延迟加载则取决于映射、增强方式与持久化上下文，不能承诺每次关联访问都必定触发SQL。

## 失败与验收

沿一次调用检查身份从哪里进入、哪些层会短路、目标调用了几次、异常如何返回。保护代理验证跨租户、撤销与绕过路径；缓存代理验证命中、过期、容量、身份隔离与写后失效；虚拟代理验证并发首次加载与失败重试；远程代理验证超时、结果未知、取消及幂等。

性能日志只记录必要的业务标识与时间，避免打印连接串、完整参数和返回数据。计时使用单调时钟；成功、失败及总耗时保持同一统计口径。与[装饰器](./decorator.md)相比，判断重点是访问合同，不是代码包了几层。
