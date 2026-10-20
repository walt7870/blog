# 外观模式

外观（Facade），也称门面，为一组子系统能力提供较容易使用的入口。它负责表达一个常用用例及其协调顺序，让调用方不必了解全部内部对象；校验、计算与存储规则仍由相应组件维护。

![报告外观与子系统调用顺序](/design-pattern/patterns/facade.svg)

## 从三个调用收拢为一个用例

生成订单导出摘要时，调用方可能先校验参数、再生成内容、最后保存结果。如果每个入口都重复这段顺序，就容易出现某个入口遗漏校验或在存储失败后仍返回成功。外观把这个共同用例命名为 `create()`，对外只返回完成后的回执。

外观也有代价：新增用例可能需要修改协调代码。它并不保证每次扩展都无需改动，也不一定提高吞吐；收益在于稳定入口与集中维护流程。当一个类开始同时负责会员、支付、报表、通知等无关用例时，应按用例拆分。

## 可运行的摘要生成例

示例生成 UTF-8 纯文本，保存到本地内存存储，不写真实文件、数据库或云对象。外观只有在保存调用成功后才返回 `READY`。保存为 `FacadeDemo.java`，可在 Java 17+ 编译运行：

```java
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

public class FacadeDemo {
    record Request(String orderNo, int rows) {}
    record Receipt(String reference, String state) {}

    static final class Validator {
        void validate(Request request) {
            Objects.requireNonNull(request);
            if (request.orderNo() == null || request.orderNo().isBlank()
                    || request.rows() < 0) {
                throw new IllegalArgumentException("订单号或行数无效");
            }
        }
    }

    static final class TextRenderer {
        byte[] render(Request request) {
            return ("订单: " + request.orderNo() + "，导出行数: " + request.rows())
                    .getBytes(StandardCharsets.UTF_8);
        }
    }

    interface Storage {
        String save(byte[] content);
    }

    static final class MemoryStorage implements Storage {
        private final Map<String, byte[]> files = new HashMap<>();

        public String save(byte[] content) {
            String reference = "memory-report-" + (files.size() + 1);
            files.put(reference, content.clone());
            return reference;
        }

        int count() { return files.size(); }
    }

    static final class ReportFacade {
        private final Validator validator;
        private final TextRenderer renderer;
        private final Storage storage;

        ReportFacade(Validator validator, TextRenderer renderer, Storage storage) {
            this.validator = Objects.requireNonNull(validator);
            this.renderer = Objects.requireNonNull(renderer);
            this.storage = Objects.requireNonNull(storage);
        }

        Receipt create(Request request) {
            validator.validate(request);
            byte[] content = renderer.render(request);
            String reference = storage.save(content);
            if (reference == null || reference.isBlank()) {
                throw new IllegalStateException("存储未返回有效引用");
            }
            return new Receipt(reference, "READY");
        }
    }

    public static void main(String[] args) {
        MemoryStorage storage = new MemoryStorage();
        ReportFacade facade = new ReportFacade(
                new Validator(), new TextRenderer(), storage);
        Receipt receipt = facade.create(new Request("O-1001", 120));
        if (!receipt.state().equals("READY") || storage.count() != 1) {
            throw new AssertionError("成功回执必须对应已保存内容");
        }
        System.out.println(receipt.state() + ": " + receipt.reference());

        try {
            facade.create(new Request("O-1002", -1));
            throw new AssertionError("非法参数必须被拒绝");
        } catch (IllegalArgumentException expected) {
            if (storage.count() != 1) throw new AssertionError("校验失败不得写入");
            System.out.println("非法参数未进入存储");
        }

        Storage unavailable = content -> {
            throw new IllegalStateException("存储不可用");
        };
        try {
            new ReportFacade(new Validator(), new TextRenderer(), unavailable)
                    .create(new Request("O-1003", 10));
            throw new AssertionError("保存失败不得返回成功");
        } catch (IllegalStateException expected) {
            System.out.println(expected.getMessage());
        }
    }
}
```

调用方只需要 `create()`，内部依次调用三个组件。样例的校验只是数据合法性，不是身份认证或权限控制；真实入口应先确定可信身份与订单访问权。内存存储只供单线程演示，进程退出会丢失数据。

这里的 `READY` 仅表示当前内存存储已保存。换成对象存储或数据库时，要重新约定“保存成功”的持久性、可读取性和失败恢复范围，不能沿用一个状态名就假定合同没有变化。

## 同步结果与异步结果分开

| 入口合同 | 何时返回 | 之后仍可能发生什么 |
| --- | --- | --- |
| 同步生成 | 校验、生成、保存均完成后 | 下载权限变化、生命周期过期等 |
| 异步创建任务 | 任务已可靠记录后 | 执行、重试、成功或失败 |
| 支付请求提交 | 请求已受理或结果未知时 | 支付确认、超时查询、关单或退款 |

如果报告耗时较长，外观应返回“待处理”的任务编号，调用方再查询状态。记录任务与投递执行通知之间若存在崩溃窗口，需要任务扫描或事务发件箱等机制补偿；一个外观方法不能自动提供可靠消息。

支付流程更不能把任意异常都解释成“未支付”。例如扣款已完成但发货失败，释放库存不是支付回滚；通知失败也不应撤销已经完成的支付。必须按已确认的状态选择查询、退款、释放预留或补发通知，相关机制见[事件驱动架构](../../architecture/event-driven-architecture.md)。

## 框架入口如何理解

`JdbcTemplate` 通过管理 JDBC 执行、资源清理与异常转换，减少调用方样板代码，适合用来理解简化入口；内部也使用模板与回调等机制，不能把它的全部设计归为外观。数据库失败应通过明确异常暴露，不能在 JDBC 对比示例里吞掉异常后返回空列表。

`DispatcherServlet` 的主要角色是前端控制器，它协调映射、适配与结果处理。`@SpringBootApplication` 是组合注解及配置入口，不是因为“多个注解合在一起”就自动满足对象协作式外观结构。识别模式要看对象关系与责任。

与[适配器](./adapter.md)相比，外观重点是简化用例入口，不以转换两个不兼容接口为必要条件；与[中介者](../behavioral/mediator.md)相比，子系统不必通过外观相互通信，通常也不必反向依赖外观。

## 失败与验收

用例测试要验证顺序和结果：校验失败不得继续生成或保存，生成失败不得保存，保存失败不得返回成功。还要验证子系统返回空值、超时或结果未知时的合同，不能只模拟抛异常。

真实存储可能已写入却未成功返回引用，因此还需要稳定业务键、查询与孤立文件清理。跨服务补偿不是本地事务回滚，重试也不能靠捕获所有异常后重跑全部流程。外观把协调集中起来，可靠性仍依赖各步骤可核实的状态与恢复机制。
