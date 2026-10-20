# 桥接模式

桥接（Bridge）把高层抽象与底层实现分开，让两个变化维度可以独立扩展。例如，通知可以分为摘要、完整两种形式，发送渠道又可以分为邮件、站内信。若为每种组合定义一个子类，类别会随着组合增加；桥接让通知形式持有渠道接口，通过委托完成发送。

![通知形式与发送渠道的桥接关系](/design-pattern/patterns/bridge.svg)

## 先确认两个维度是否独立

摘要通知关心展示哪些字段，渠道关心内容交给哪个发送入口。新增摘要形式不应要求复制全部渠道实现；新增渠道也不应要求重写全部通知形式。这种独立扩展是桥接的价值。

不过，组合数量减少不代表所有组合天然合法。若短信存在长度限制、某渠道不支持附件，应在接口合同或创建阶段明确能力边界。不能让“完整通知通过短信发送”静默丢掉关键内容。只有一个算法变化时，用[策略](../behavioral/strategy.md)通常更直接。

## 两种通知形式组合两种渠道

下面的 `Notice` 是抽象部分，`SummaryNotice`、`FullNotice` 扩展消息形式；`Channel` 是实现接口，邮件与站内信分别实现它。抽象部分持有实现接口，调用方向从 `Notice` 到 `Channel`，不是渠道反向调用通知。

示例只输出本地提交记录，不连接邮件服务器，也不证明消息已送达。保存为 `BridgeDemo.java`，可在 Java 17+ 编译运行：

```java
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class BridgeDemo {
    record Export(String orderNo, int rows) {
        Export {
            if (orderNo == null || orderNo.isBlank() || rows < 0) {
                throw new IllegalArgumentException("订单号或行数无效");
            }
        }
    }

    interface Channel {
        void submit(String recipient, String content);
    }

    static final class MailChannel implements Channel {
        public void submit(String recipient, String content) {
            System.out.println("邮件提交给 " + recipient + ": " + content);
        }
    }

    static final class InboxChannel implements Channel {
        private final List<String> records = new ArrayList<>();

        public void submit(String recipient, String content) {
            records.add(recipient + ": " + content);
        }

        List<String> records() { return List.copyOf(records); }
    }

    abstract static class Notice {
        private final Channel channel;

        Notice(Channel channel) {
            this.channel = Objects.requireNonNull(channel);
        }

        final void send(String recipient, Export export) {
            if (recipient == null || recipient.isBlank()) {
                throw new IllegalArgumentException("收件标识不能为空");
            }
            channel.submit(recipient, format(Objects.requireNonNull(export)));
        }

        protected abstract String format(Export export);
    }

    static final class SummaryNotice extends Notice {
        SummaryNotice(Channel channel) { super(channel); }

        protected String format(Export export) {
            return "订单 " + export.orderNo() + " 的导出已完成";
        }
    }

    static final class FullNotice extends Notice {
        FullNotice(Channel channel) { super(channel); }

        protected String format(Export export) {
            return "订单 " + export.orderNo() + " 已导出 " + export.rows() + " 行";
        }
    }

    public static void main(String[] args) {
        Export export = new Export("O-1001", 120);
        Channel mail = new MailChannel();
        InboxChannel inbox = new InboxChannel();
        new SummaryNotice(mail).send("user@example.com", export);
        new FullNotice(mail).send("user@example.com", export);
        new SummaryNotice(inbox).send("user-1", export);
        new FullNotice(inbox).send("user-1", export);
        if (inbox.records().size() != 2
                || !inbox.records().get(1).endsWith("已导出 120 行")) {
            throw new AssertionError("站内信组合结果不符合合同");
        }
        inbox.records().forEach(System.out::println);
    }
}
```

调用方在装配时选择渠道，通知对象只负责该形式的内容生成。这里没有提供运行时更换渠道的 setter，因为每次发送中途切换实现会使行为难以追踪；需要不同渠道时创建另一份通知对象即可。

`send()` 与 `format()` 同时使用了固定流程和可覆盖步骤，也体现了[模板方法](../behavioral/template-method.md)的组织方式。模式可以协作，但“模板方法”解释步骤扩展，“桥接”解释通知与渠道两个维度的关系，不能混为同一个判断。

## 如何判断是不是桥接

| 观察到的关系 | 判断 |
| --- | --- |
| 两个稳定命名的维度，分别扩展，再通过组合协作 | 符合桥接的设计意图 |
| 仅将一种促销算法注入订单结算 | 通常是策略，不足以认定桥接 |
| 把旧 SDK 转成新的内部接口 | 主要是适配器 |
| 为对象包上缓存或审计层 | 主要看代理或装饰器 |
| 为每个品牌和类型创建完整交叉子类 | 仍保留了组合膨胀问题 |

JDBC 将访问接口与驱动实现分离，可以帮助理解这种思想；但 `JdbcTemplate` 实际经由 `DataSource` 获取 `Connection`，不是直接调用 `Driver`，源码关系需要按真实链路解释。Spring AOP 把不同 `Advice` 转成拦截器的机制，核心是适配，不能因为发生了委托就称为桥接。

跨平台控件也有同样边界：若每个控件仍对应每个平台的一份完整实现，平台工作量并未消失。桥接可以复用上层控件逻辑与公共渲染原语，但不会自动省掉所有平台差异。

## 失败、并发与验收

真实渠道应明确提交失败、结果未知与后续送达状态，决定异常如何传播。通知形式层不应擅自换渠道重发：这可能造成重复通知，也可能把本应在站内展示的内容发送到外部。重试、幂等、限流与状态持久化应有独立协议。

样例的内存渠道只供单线程演示，不能直接作为并发消息队列。验收时应覆盖每种允许的形式与渠道组合、空接收者、非法数据、渠道失败和不支持的能力。收益要看新增一种形式或渠道能否局部修改，而不是只数接口数量。
