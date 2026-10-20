# 模板方法模式

模板方法（Template Method）由父类安排稳定的步骤顺序，子类实现其中的差异。可以把它理解为同一条报表生产线：检查订单数据、打开输出、生成内容、关闭输出；明细报表逐行写订单，汇总报表只写总数和合计，生命周期由同一个入口控制。

![报表模板的固定顺序、扩展点与失败收尾](/design-pattern/patterns/template-method.svg)

## 固定顺序不是固定所有实现

模板入口通常使用 `final` 防止子类重排，稳定的校验和收尾保持私有，只把真正变化的 `render()` 开放为扩展点。默认可选行为可以做钩子，例如选择是否输出附加说明；必须执行的权限检查、关闭资源、提交结果不应成为可随意跳过的钩子。

“先检查，再生成，成功后再返回”是合同的一部分。父类即使固定了方法调用顺序，也无法阻止子类在自己的代码中写错格式、关闭不属于它的资源或触发外部副作用。它约束的是协作入口，仍然需要扩展点文档和子类合同测试。

若两条业务流程只有方法名相似，先后关系却不同，强行抽成父类会产生大量布尔开关和空实现。只有一段算法需要替换时，用[策略](./strategy)组合通常更直接；流程顺序经常变化时，应考虑显式编排，而不是继续加深继承层次。

## 完整的报表生成示例

下面仅输出 UTF-8 文本，不解析 CSV/XML、不连接数据库、不上传文件。输入是不可变订单行快照；模板拥有工厂新建的输出流，负责关闭，子类只写内容。保存为 `TemplateDemo.java`，使用 Java 17+ 编译运行：

```java
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class TemplateDemo {
    record Row(String orderId, long amountFen) {
        Row {
            if (orderId == null || !orderId.matches("[A-Z0-9-]{1,32}")
                    || amountFen < 0) {
                throw new IllegalArgumentException("订单标识或金额非法");
            }
        }
    }

    @FunctionalInterface
    interface SinkFactory {
        OutputStream open() throws IOException;
    }

    abstract static class ReportTemplate {
        public final int generate(List<Row> input, SinkFactory factory)
                throws IOException {
            List<Row> rows = List.copyOf(input);
            Objects.requireNonNull(factory);
            if (rows.isEmpty()) throw new IllegalArgumentException("至少一行订单");
            try (Writer writer = new OutputStreamWriter(
                    Objects.requireNonNull(factory.open()), StandardCharsets.UTF_8)) {
                render(rows, writer);
            }
            return rows.size();
        }

        protected abstract void render(List<Row> rows, Writer writer)
                throws IOException;
    }

    static final class DetailReport extends ReportTemplate {
        @Override
        protected void render(List<Row> rows, Writer writer) throws IOException {
            for (Row row : rows) {
                writer.write(row.orderId() + " 金额分=" + row.amountFen() + "\n");
            }
        }
    }

    static final class SummaryReport extends ReportTemplate {
        @Override
        protected void render(List<Row> rows, Writer writer) throws IOException {
            long total = 0;
            for (Row row : rows) total = Math.addExact(total, row.amountFen());
            writer.write("订单数=" + rows.size() + " 合计分=" + total + "\n");
        }
    }

    static final class TrackingSink extends ByteArrayOutputStream {
        final List<String> events;
        final boolean failOnClose;

        TrackingSink(List<String> events, boolean failOnClose) {
            this.events = events;
            this.failOnClose = failOnClose;
        }

        @Override
        public void close() throws IOException {
            events.add("关闭输出");
            super.close();
            if (failOnClose) throw new IOException("关闭失败");
        }
    }

    public static void main(String[] args) throws IOException {
        List<Row> rows = List.of(new Row("O-1", 1200), new Row("O-2", 800));
        for (ReportTemplate report : List.of(new DetailReport(), new SummaryReport())) {
            List<String> events = new ArrayList<>();
            TrackingSink sink = new TrackingSink(events, false);
            int count = report.generate(rows, () -> {
                events.add("打开输出");
                return sink;
            });
            if (count != 2 || !events.equals(List.of("打开输出", "关闭输出"))) {
                throw new AssertionError("生命周期错误");
            }
            String expected = report instanceof DetailReport
                    ? "O-1 金额分=1200\nO-2 金额分=800\n"
                    : "订单数=2 合计分=2000\n";
            if (!sink.toString(StandardCharsets.UTF_8).equals(expected)) {
                throw new AssertionError("报表内容错误");
            }
            System.out.print(expected);
        }
        List<String> invalidEvents = new ArrayList<>();
        try {
            new DetailReport().generate(List.of(), () -> {
                invalidEvents.add("不应打开");
                return new TrackingSink(invalidEvents, false);
            });
            throw new AssertionError("空数据应当拒绝");
        } catch (IllegalArgumentException expected) {
            if (!invalidEvents.isEmpty()) throw new AssertionError("校验前打开了输出");
        }

        ReportTemplate failing = new ReportTemplate() {
            @Override
            protected void render(List<Row> ignored, Writer writer) throws IOException {
                throw new IOException("生成失败");
            }
        };
        List<String> failureEvents = new ArrayList<>();
        try {
            failing.generate(rows, () -> new TrackingSink(failureEvents, true));
            throw new AssertionError("失败不能返回成功");
        } catch (IOException expected) {
            if (!expected.getMessage().equals("生成失败")
                    || expected.getSuppressed().length != 1
                    || !failureEvents.equals(List.of("关闭输出"))) {
                throw new AssertionError("原异常或清理异常丢失", expected);
            }
            System.out.println("生成失败仍关闭输出，关闭异常作为suppressed保留");
        }
    }
}
```

正常结果为两条明细，或订单数 2、合计 2000 分。成功返回位于资源关闭之后，关闭失败会向调用者传播；生成与关闭同时失败时，生成异常保留为主异常，关闭异常附在 `suppressed` 中。不能用普通 `finally` 再抛一个关闭异常覆盖最先失败的原因。

`List.copyOf()` 拒绝空元素并冻结列表，本例的 `Row` 也不可变。若列表内是可变实体，仅复制列表仍不能冻结订单数据。汇总使用 `Math.addExact()` 检测溢出，发生溢出时也会走资源关闭。`TrackingSink` 只记录内存演示行为，不能证明文件系统、远程上传或数据库提交已经可靠完成。

## 资源与结果必须分开判断

| 失败位置 | 后续行为 | 不能误判的结果 |
| --- | --- | --- |
| 输入校验 | 不打开输出 | 不属于生成成功 |
| 打开输出 | 由工厂处理其尚未交出的部分资源 | 模板不能关闭从未拿到的句柄 |
| 生成内容 | 关闭已交给模板的输出并传播失败 | 可能已有部分字节写出 |
| 刷新或关闭 | 传播失败 | 方法体执行完不代表最终输出成功 |
| 远端已接收但响应丢失 | 查询状态或按幂等协议恢复 | 不可直接重试并创建重复文件 |

对于文件报表，常用临时文件完成生成和关闭，再用符合目标文件系统合同的方式发布正式路径，失败时清理临时文件。关闭并不等于磁盘持久化；如需崩溃一致性，还要明确同步与发布保证。对于调用方拥有的 HTTP 响应流，则不能直接套用本例关闭合同，应提供只写入而不关闭的另一种接口。

“任何异常都记录后继续”不是健壮的模板。校验失败后仍生成、生成失败后仍发布，都会让流程对外报告错误成功。可恢复异常也必须定义重试边界、次数及幂等性，不能只设置一个 `RECOVERED` 字段就视为恢复完成。

## 框架中的边界

Servlet的 `HttpServlet.service()` 根据请求方法分派到 `doGet()`、`doPost()` 等扩展点，可帮助理解父类编排和子类定制；它并不要求所有框架入口都是 `final`。Spring MVC 的 `HandlerInterceptor` 是拦截回调接口，不能把自定义的抽象 `RequestProcessor` 称为其源码或直接等同模板方法。

同样，Spring 的 `JdbcTemplate` 主要通过回调提供变化点，虽有模板化流程，却不是“必须继承后覆盖步骤”的同一种使用方式。自行实现 JDBC 模板时还需遵守连接池、事务绑定、异常转换与资源释放合同，不能吞掉 `SQLException` 并返回 `null` 冒充正常空结果。

测试框架的准备、执行、收尾有各自版本与生命周期约定，不能用一个打印通过/失败的示例替代真实测试结果。线程池和异步流水线也要在异步完成后收尾；在提交任务的外层 `finally` 关闭资源，任务可能尚未开始使用它。

## 失败与验收

对所有子类运行同一组合同检查：正常生成、校验拒绝、打开失败、生成失败、刷新或关闭失败、生成与关闭同时失败，再核对输出内容与调用顺序。检查重复调用是否继承了上次的可变字段，子类是否关闭了借用资源，以及大金额汇总是否溢出。

若父类越来越依赖 `skipValidate`、`skipClose`、`useLegacyOrder` 等开关，说明稳定骨架已经分裂。应重新划分模板或改用组合，把变化留在明确的扩展点，而不是让子类猜测父类内部状态。
