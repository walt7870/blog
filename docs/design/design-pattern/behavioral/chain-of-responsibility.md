# 责任链模式

责任链（Chain of Responsibility）把请求交给一组有序处理者，每个处理者决定接收、拒绝或继续。它既可以表达“找到一个接收者就停止”的审批路由，也可以表达多个过滤器先后参与的处理链。必须先说明是哪一种合同，不能假定每个请求只会经过一个节点。

![责任链的继续、拒绝与返回](/design-pattern/patterns/chain-of-responsibility.svg)

## 顺序与短路是业务规则

导出请求先检查权限，再检查参数，最后执行生成。权限拒绝后，参数与业务步骤都不应继续；外层追踪却可能仍需要在返回或异常时收尾。因此链不仅有向前传递，也可能按相反顺序完成后置逻辑。

“组长权限内直接批准，否则交给经理”属于寻找接收者；“所有必要校验通过后才创建任务”属于连续过滤。真实多级审批还可能要求每位审批者都确认并持久保存进度，不能用第一个满足天数条件就终止的程序代替。

## 每次请求独立推进

下面用不可变处理器列表定义顺序，通过每次调用的局部索引推进，没有可被后续请求继承的共享游标。`Next` 只允许调用一次，防止某个处理器重复执行下游。示例为同步内存程序，不解析令牌、不提供真实认证，也不创建导出文件。

保存为 `ChainDemo.java`，可在 Java 17+ 编译运行：

```java
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;

public class ChainDemo {
    record Request(boolean permitted, int rows, List<String> trace) {}
    record Response(int code, String message) {}

    interface Next {
        Response proceed();
    }

    interface Filter {
        Response apply(Request request, Next next);
    }

    static final class Pipeline {
        private final List<Filter> filters;
        private final Function<Request, Response> terminal;

        Pipeline(List<Filter> filters, Function<Request, Response> terminal) {
            this.filters = List.copyOf(filters);
            this.terminal = Objects.requireNonNull(terminal);
        }

        Response execute(Request request) {
            return invoke(0, Objects.requireNonNull(request));
        }

        private Response invoke(int index, Request request) {
            if (index == filters.size()) return terminal.apply(request);
            AtomicBoolean continued = new AtomicBoolean();
            return filters.get(index).apply(request, () -> {
                if (!continued.compareAndSet(false, true)) {
                    throw new IllegalStateException("同一节点不能重复继续");
                }
                return invoke(index + 1, request);
            });
        }
    }

    public static void main(String[] args) {
        AtomicInteger terminalCalls = new AtomicInteger();
        Filter tracing = (request, next) -> {
            request.trace().add("进入追踪");
            try {
                return next.proceed();
            } finally {
                request.trace().add("退出追踪");
            }
        };
        Filter permission = (request, next) -> {
            request.trace().add("检查权限");
            if (!request.permitted()) return new Response(403, "没有导出权限");
            return next.proceed();
        };
        Filter parameters = (request, next) -> {
            request.trace().add("检查参数");
            if (request.rows() < 1 || request.rows() > 10000) {
                return new Response(400, "行数须在1到10000之间");
            }
            return next.proceed();
        };
        Pipeline pipeline = new Pipeline(List.of(tracing, permission, parameters),
                request -> {
                    terminalCalls.incrementAndGet();
                    request.trace().add("执行业务");
                    return new Response(200, "演示处理成功");
                });

        Request good = new Request(true, 120, new ArrayList<>());
        Request denied = new Request(false, 120, new ArrayList<>());
        Request invalid = new Request(true, 0, new ArrayList<>());
        if (pipeline.execute(good).code() != 200
                || pipeline.execute(denied).code() != 403
                || pipeline.execute(invalid).code() != 400
                || terminalCalls.get() != 1
                || denied.trace().contains("检查参数")
                || invalid.trace().contains("执行业务")) {
            throw new AssertionError("复用链时仍必须逐请求检查并短路");
        }
        System.out.println(good.trace());
        System.out.println(denied.trace());
        System.out.println(invalid.trace());

        Pipeline repeated = new Pipeline(List.of((request, next) -> {
            next.proceed();
            return next.proceed();
        }), request -> new Response(200, "终点"));
        try {
            repeated.execute(new Request(true, 1, new ArrayList<>()));
            throw new AssertionError("重复继续必须被拒绝");
        } catch (IllegalStateException expected) {
            System.out.println(expected.getMessage());
        }
    }
}
```

成功请求依次记录追踪、权限、参数、业务，再退出追踪；拒绝请求也会退出追踪，但不会访问后续节点。列表可以复用，处理器是否可共享还取决于其自身状态。本例每个请求持有独立追踪列表，只用于同步流程，不能把同一请求列表交给多个线程并发写入。

若需要汇总所有参数错误，可以在一个校验组件内收集错误；若需要“第一条失败立即停止”，就维持短路。把拒绝异常捕获后继续下一个处理者，可能绕过权限或重复副作用，不能作为通用的健壮性处理。

## 框架里的真实推进方式

Servlet过滤器通过 `chain.doFilter()` 进入下游；不调用就会短路，返回后可执行后置逻辑，异常时的收尾应使用 `finally`。不是由外部循环独立调用每个过滤器。

Spring Security 的 `SecurityFilterChain` 是描述匹配条件与过滤器列表的接口，`FilterChainProxy` 选择首个匹配的安全链，再组织过滤器执行。不能把自行编写的同名类当作框架源码，也不能让处理器列表的共享游标跨请求累积。

Netty的入站处理器通常通过 `ctx.fireChannelRead()` 向后传播；出站事件方向不同，不能按一个普通循环概括。在 `SimpleChannelInboundHandler` 中继续转发引用计数消息，还需遵守自动释放与保留引用合同，否则下游可能访问已释放数据。资源管理属于框架约定，不因采用责任链就消失。

## 调整链路时保留哪些约束

| 调整 | 可能破坏的合同 | 判断方式 |
| --- | --- | --- |
| 缓存“某类型的处理者”并直接跳转 | 跳过权限、租户或请求内容判断 | 只有选择完全由稳定类型决定时才可评估 |
| 把全部处理器并行执行 | 顺序、短路及共享上下文 | 独立无副作用校验可另做并行汇总，不视为原链 |
| 动态修改共享列表 | 在途请求看到不一致配置 | 发布不可变新版本，在途请求保持原快照 |
| 捕获所有异常继续尝试 | 已执行副作用被重复、拒绝被绕过 | 按明确错误分类决定终止或转交 |
| 允许任意 `setNext()` | 自引用和环导致无限传递 | 装配时查环，或使用有限不可变列表 |

链适合可变节点和线性顺序。存在复杂分支、回退、人工等待与持久化步骤时，应评估状态机或工作流引擎；普通 `if` 与顺序调用足够清楚时，也无需为了模式引入对象。

## 失败与验收

至少连续复用同一条链处理成功、拒绝、非法输入和处理器异常，核对终点是否执行、执行次数、后置逻辑以及错误类型。再检查空链、重复继续、配置更新与请求上下文隔离。鉴权与资金等拒绝结果必须停止，不能以“兜底成功”掩盖。

日志记录请求标识、链版本、节点结果和必要耗时即可，避免直接输出令牌或整份业务对象。本地同步程序只能验证推进合同；真实异步链还要定义取消、超时、完成回调和资源释放。
