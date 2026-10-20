# 中介者模式

中介者（Mediator）把一组对象的协作规则集中到一个场景对象中。导出表单有开始日期、结束日期、提交按钮和提示信息：修改任一日期，都要检查区间并更新按钮与提示。如果每个控件都直接操作其他控件，规则容易散落；让表单协调者统一处理，控件只负责自己的输入或展示。

![导出表单的控件事件与中介者协调](/design-pattern/patterns/mediator.svg)

## 协调者管规则，控件管自身

开始日期控件不应知道结束日期控件和提交按钮。它只把“用户选择了日期”交给协调者；协调者读取两项输入，计算是否合法，再设置按钮和提示。以后新增“区间不能超过 31 天”的规则，修改的是这个表单的协调逻辑，而不是分别修改所有控件。

这里减少的是控件之间的直接依赖，并没有消除依赖：协调者需要了解它负责的控件与业务约束。不要为了“全部解耦”建立一个任意字符串事件、任意对象参数的全局总线，反而失去类型检查和职责边界。

| 对象 | 接收什么 | 做什么 |
| --- | --- | --- |
| 日期控件 | 用户选择的日期，可为空 | 保存本项输入，报告变化 |
| 表单协调者 | 控件变化或提交请求 | 校验区间，协调按钮和提示 |
| 提交按钮 | 协调者设置的启用状态 | 把点击交回协调者 |
| 提示组件 | 已计算的提示文本 | 显示状态，不反向修改输入 |

## 可运行示例：日期区间联动

以下代码保存为 `MediatorDemo.java`，使用 Java 17 及以上版本。这是单线程内存模型，用于验证联动规则，没有接入真实 UI、导出服务或数据库。创建表单的线程拥有全部交互；跨线程调用会明确拒绝，后台回调应切回相应 UI 线程。

```java
import java.time.LocalDate;
import java.util.function.Consumer;
import java.util.function.Supplier;

public class MediatorDemo {
    record Range(LocalDate start, LocalDate end) {}
    record View(LocalDate start, LocalDate end, boolean enabled, String hint) {}

    static final class DateInput {
        private LocalDate value;
        private final Consumer<DateInput> changed;
        DateInput(Consumer<DateInput> changed) { this.changed = changed; }
        void userSelect(LocalDate value) {
            this.value = value;
            changed.accept(this);
        }
    }

    static final class SubmitButton {
        private boolean enabled;
        private final Supplier<Range> clicked;
        SubmitButton(Supplier<Range> clicked) { this.clicked = clicked; }
        Range userClick() { return clicked.get(); }
    }

    static final class Hint {
        private String text = "";
    }

    static final class ExportForm {
        private final Thread owner = Thread.currentThread();
        private final DateInput start = new DateInput(this::changed);
        private final DateInput end = new DateInput(this::changed);
        private final SubmitButton submit = new SubmitButton(this::submitRange);
        private final Hint hint = new Hint();

        ExportForm() { refresh(); }

        void checkThread() {
            if (Thread.currentThread() != owner) {
                throw new IllegalStateException("必须在表单所属线程操作");
            }
        }

        void selectStart(LocalDate value) {
            checkThread();
            start.userSelect(value);
        }

        void selectEnd(LocalDate value) {
            checkThread();
            end.userSelect(value);
        }

        private void changed(DateInput source) {
            checkThread();
            if (source != start && source != end) {
                throw new IllegalArgumentException("未知控件");
            }
            refresh();
        }

        private void refresh() {
            if (start.value == null || end.value == null) {
                submit.enabled = false;
                hint.text = "请选择起止日期";
            } else if (start.value.isAfter(end.value)) {
                submit.enabled = false;
                hint.text = "开始日期不能晚于结束日期";
            } else {
                submit.enabled = true;
                hint.text = "可以提交";
            }
        }

        private Range submitRange() {
            checkThread();
            if (!submit.enabled) throw new IllegalStateException(hint.text);
            return new Range(start.value, end.value);
        }

        Range clickSubmit() {
            checkThread();
            return submit.userClick();
        }

        View view() {
            checkThread();
            return new View(start.value, end.value, submit.enabled, hint.text);
        }
    }

    public static void main(String[] args) {
        var form = new ExportForm();
        System.out.println(form.view().hint());
        form.selectStart(LocalDate.of(2026, 10, 19));
        form.selectEnd(LocalDate.of(2026, 10, 18));
        System.out.println(form.view().hint());
        form.selectEnd(LocalDate.of(2026, 10, 20));
        System.out.println(form.clickSubmit());
    }
}
```

```sh
javac --release 17 MediatorDemo.java
java MediatorDemo
```

前两行输出“请选择起止日期”“开始日期不能晚于结束日期”，最后返回 2026-10-19 至 2026-10-20 的 `Range`。同一天是本例的合法区间；实际导出的时区、结束日期是否包含当天、查询上界如何换算，需要在业务合同中另外规定。

日期输入允许暂时为空或前后颠倒，这是一种合理的编辑状态；协调者通过禁用提交来阻止非法业务操作。不要把“所有输入时刻都合法”强加给编辑过程。真正提交时仍要检查，因为 UI 的禁用状态不能代替服务端校验。

## 避免事件反馈环

本例只有 `userSelect` 发出变化事件。协调者更新按钮或提示只是设置展示状态，不会再次发布“用户操作”。如果程序设置值与用户输入共用通知入口，就可能出现“开始变化 → 修结束 → 结束变化 → 再修开始”的循环。

需要自动修正输入时，应区分事件来源，或在一个有明确起止的更新批次中合并刷新。不要用无限重试或随意的全局布尔开关掩盖递归：异常发生时开关是否恢复、嵌套更新是否被丢弃都要能解释。真实 UI 框架还应使用自己的事件线程与卸载清理机制。

## 从本地协调到异步业务

表单若向后端请求导出，应在提交时固定日期快照和请求标识，再切换到提交中状态。修改输入后，旧请求完成不能覆盖新输入的提示；可用递增请求版本识别过期回调。销毁页面时要处理取消、退订和回调生命周期，不能把回调保存在永久全局协调者中。

库存、支付和发货的跨服务编排也有协调特点，但中介者模式本身不提供事务。支付请求超时可能已经扣款；不能在一个 `catch` 中无条件退款、释放库存并取消发货，就宣称整体已回滚。可靠编排还需要持久化步骤、幂等标识、状态查询、可重试的补偿和人工处置入口，见[事件驱动架构](../../architecture/event-driven-architecture.md)。

异步队列同样要定义容量、拒绝、顺序、关闭和积压处理。把事件提交给线程池并立即返回，只表示接收或排队成功；不表示后续控件或服务已经完成处理。`ConcurrentHashMap` 中存放普通 `ArrayList` 也不会使列表自动支持并发订阅与遍历。

## 怎样判断是否值得引入

同一组控件有多条相互影响的规则、规则散在多个回调中难以确认时，中介者适合把协作收拢。只有一个输入调用一个按钮时，普通回调就足够。协调者开始同时管理多个页面、数据库、通知、鉴权和报表时，应按业务场景拆开，控件复用通过窄接口完成。

[观察者模式](./observer.md)解决订阅与变化通知；中介者决定参与者应如何协作，可以借助观察者接收事件。[外观模式](../structural/facade.md)主要提供简化入口，子系统通常不需要反过来认识外观。两者不应简单按“单向或双向”划分。

验证这类协调规则，先列输入与期望视图，再执行事件序列：缺任一日期、开始晚于结束、同一天、合法区间后清空输入，都应同步更新按钮和提示；非法状态点击提交必须拒绝。还应验证两个表单互不串状态、后台线程调用被拒绝，以及真实 UI 中更新展示不会重新触发用户事件。
