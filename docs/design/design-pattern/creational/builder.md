# 建造者模式

建造者将复杂对象的构建步骤与最终表示分离。经典结构中，指挥者按照稳定顺序调用建造者，同一构建过程可以得到不同产品；现代 Java 也常用链式建造者表达多参数配置。两者都管理构建，但链式调用本身并不能证明实现了完整的 GoF 结构。

![导出配置从可变建造者到不可变快照](/design-pattern/patterns/builder.svg)

## 导出参数为什么需要构建边界

订单导出包含日期区间、列顺序、格式、是否有表头和分页大小。如果直接传入多个字符串、布尔值和整数，调用处很难识别每个位置；如果先创建空对象再逐项设置，其他代码又可能拿到未完成对象。

建造者暂存可变配置，`build()` 交付合法快照。是否合法不仅是“不为空”，还可能包括开始日期不晚于结束日期、分页大小在允许范围内、至少选择一列等组合约束。

## 可运行示例

以下 Java 17+ 示例省略实际文件渲染。业务约束统一放在产品构造边界，建造者负责命名步骤和默认值；直接调用产品构造器也不能绕过校验。

```java
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public final class BuilderDemo {
    enum Format { CSV, XLSX }

    record ExportSpec(LocalDate start, LocalDate end,
                      List<String> columns, Format format, int pageSize) {
        ExportSpec {
            Objects.requireNonNull(start);
            Objects.requireNonNull(end);
            Objects.requireNonNull(format);
            columns = List.copyOf(columns);
            if (start.isAfter(end)) {
                throw new IllegalArgumentException("开始日期晚于结束日期");
            }
            if (columns.isEmpty() || columns.stream().anyMatch(String::isBlank)) {
                throw new IllegalArgumentException("必须选择有效的导出列");
            }
            if (pageSize < 1 || pageSize > 10000) {
                throw new IllegalArgumentException("分页大小须在 1 到 10000 之间");
            }
        }
    }

    static final class ExportBuilder {
        private LocalDate start;
        private LocalDate end;
        private final List<String> columns = new ArrayList<>();
        private Format format = Format.CSV;
        private int pageSize = 1000;

        ExportBuilder timeRange(LocalDate start, LocalDate end) {
            this.start = start;
            this.end = end;
            return this;
        }

        ExportBuilder column(String name) {
            columns.add(Objects.requireNonNull(name));
            return this;
        }

        ExportBuilder format(Format format) {
            this.format = Objects.requireNonNull(format);
            return this;
        }

        ExportBuilder pageSize(int pageSize) {
            this.pageSize = pageSize;
            return this;
        }

        ExportSpec build() {
            return new ExportSpec(start, end, columns, format, pageSize);
        }
    }

    public static void main(String[] args) {
        ExportBuilder builder = new ExportBuilder()
                .timeRange(LocalDate.of(2026, 10, 1),
                           LocalDate.of(2026, 10, 19))
                .column("订单号").column("金额");
        ExportSpec first = builder.build();
        builder.column("物流单号");
        ExportSpec second = builder.build();
        if (first.columns().size() != 2 || second.columns().size() != 3) {
            throw new AssertionError("构建结果与建造者共享了可变列表");
        }
        try {
            builder.pageSize(0).build();
            throw new AssertionError("缺少非法分页校验");
        } catch (IllegalArgumentException expected) {
            System.out.println(expected.getMessage());
        }
        System.out.println(first.format() + " / " + first.columns());
    }
}
```

使用 `javac BuilderDemo.java && java BuilderDemo` 运行。第二次构建增加物流单号，第一次结果仍保留两列；非法分页被拒绝。这里允许重用建造者，但它不是线程安全对象，不能由并发请求共享。

`record` 只保证字段引用不能重新赋值，并不自动使内部集合不可变。本例的 `List.copyOf()` 才保证列集合只读；若元素换成可变列对象，还需复制元素或使用不可变值类型。字段名是否合法、调用者是否允许导出这些列，属于业务授权与数据模型检查，不由该示例完成。

## 何时需要指挥者

汽车装配、文档生成等流程如果有稳定步骤，且不同建造者能产出不同表示，可以让指挥者依次调用“准备、构建主体、收尾”。指挥者不必知道具体部件，但必须说明失败后如何清理未完成产品，以及是否允许中途获取结果。

如果只是导出参数有很多可选项，链式建造者已经足够，不必再建立指挥者、抽象建造者和多个具体建造者。若参数只有两个且类型清晰，普通构造器也更直接。

## 验收与失败方式

至少验证缺少必填项、边界值、组合冲突、默认值、重复构建和外部集合修改。最常见的失败是 `build()` 直接返回内部可变对象，后续再次设置参数会修改已经交付的产品。

创建产品时才分配外部资源，且清楚指定谁负责关闭；不要让一个长期存活的建造者悄悄持有连接。建造者解决的是对象构建，任务提交、限流和失败重试仍属于服务运行机制。
