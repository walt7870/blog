# 访问者模式

访问者（Visitor）把针对不同元素类型的一项操作集中到同一个对象中。技术文章包含文本和图片，既要生成纯文本摘要，也要统计正文字符与图片数量。如果把导出、统计、校验等方法都加进每种元素，元素类会不断膨胀；访问者让稳定的元素结构接收不同操作。

![文档元素通过accept分派到具体访问操作](/design-pattern/patterns/visitor.svg)

## accept 为什么不能直接省掉

Java 的方法重载按调用位置的静态类型选择；运行时再根据接收对象选择重写实现。假设一个变量声明为 `Block`，即使它装的是 `Text`，直接调用 `visitor.visit(block)` 也不会自动挑中 `visit(Text)`。

因此先调用 `block.accept(visitor)`：运行时进入 `Text.accept` 后，这里的 `this` 已是静态类型 `Text`，再调用 `visitor.visit(this)` 就能选中对应重载；具体访问者的实现再决定执行导出还是统计。这就是经典双重分派在 Java 中的组织方式。

| 变化方向 | 需要修改什么 | 代价 |
| --- | --- | --- |
| 增加“统计”操作 | 新增一个实现全部访问方法的访问者 | 元素类沿用原来的 `accept` |
| 增加“视频”元素 | 元素接口允许新类型，访问者接口增加重载，各访问者实现它 | 要同时检查全部既有操作 |
| 修改遍历顺序 | 修改容器或专门遍历器 | 应确认哪些操作依赖文档顺序 |

访问者并不天然降低类型安全。明确的接口可以让缺少某种元素处理成为编译错误；使用反射、未经检查的类型强转或“未知元素直接忽略”的默认实现，才容易把问题推迟到运行时。

## 可运行示例：纯文本导出与统计

以下代码保存为 `VisitorDemo.java`，使用 Java 17 及以上版本。示例是不可变的平面文档，没有实现 HTML、JSON 或 PDF 渲染，也不会加载图片。图片元素只保存本地资源标识和替代文本；统计不会把图片宽高换算成文件字节数。

```java
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

public class VisitorDemo {
    interface Visitor<R> {
        R visit(Text text);
        R visit(Image image);
    }

    sealed interface Block permits Text, Image {
        <R> R accept(Visitor<R> visitor);
    }

    record Text(String content) implements Block {
        Text { Objects.requireNonNull(content); }
        public <R> R accept(Visitor<R> visitor) {
            return visitor.visit(this);
        }
    }

    record Image(String assetKey, String alt) implements Block {
        Image {
            if (assetKey == null || assetKey.isBlank()) {
                throw new IllegalArgumentException("资源标识不能为空");
            }
            Objects.requireNonNull(alt);
        }
        public <R> R accept(Visitor<R> visitor) {
            return visitor.visit(this);
        }
    }

    record Document(List<Block> blocks) {
        Document { blocks = List.copyOf(blocks); }
    }

    static final class PlainText implements Visitor<String> {
        public String visit(Text text) { return text.content(); }
        public String visit(Image image) { return "[图片：" + image.alt() + "]"; }
    }

    record Stats(long textCodePoints, long images) {
        Stats plus(Stats other) {
            return new Stats(Math.addExact(textCodePoints, other.textCodePoints),
                             Math.addExact(images, other.images));
        }
    }

    static final class Statistics implements Visitor<Stats> {
        public Stats visit(Text text) {
            String value = text.content();
            return new Stats(value.codePointCount(0, value.length()), 0);
        }
        public Stats visit(Image image) { return new Stats(0, 1); }
    }

    static String export(Document document) {
        var visitor = new PlainText();
        return document.blocks().stream()
            .map(block -> block.accept(visitor))
            .collect(Collectors.joining("\n"));
    }

    static Stats statistics(Document document) {
        var visitor = new Statistics();
        Stats total = new Stats(0, 0);
        for (Block block : document.blocks()) {
            total = total.plus(block.accept(visitor));
        }
        return total;
    }

    public static void main(String[] args) {
        var document = new Document(List.of(
            new Text("订单说明"),
            new Image("order-flow", "订单流转图"),
            new Text("支付完成")
        ));
        System.out.println(export(document));
        System.out.println(statistics(document));
    }
}
```

```sh
javac --release 17 VisitorDemo.java
java VisitorDemo
```

导出依次得到“订单说明”“[图片：订单流转图]”“支付完成”，统计结果为 `Stats[textCodePoints=8, images=1]`。字符统计只包含文本块，使用 Unicode 码点数，**不是中文分词、可见字素数或 UTF-8 字节数**；组合重音、表情序列和换行应按自己的指标合同处理。

两个访问者没有共享缓冲区或累计字段，每次访问返回结果，再由外层组合。因此重复处理同一文档不会重复累加旧状态；空文档得到空字符串与零统计。实际操作需要维护状态时，应明确每次遍历的实例归属，不要把带 `StringBuilder` 的单例访问者同时交给多个请求。

## 遍历与节点操作只由一方负责

本例由 `Document` 的调用方按列表顺序遍历，元素的 `accept` 只做类型分派。如果增加章节、列表和表格等容器，可以由统一遍历器递归，也可以由访问者显式访问子节点；二者必须选定责任，不能容器先遍历一遍，访问者再遍历一次。

渲染通常依赖原顺序。把全部文本按类型分组后输出，再输出全部图片，即使遍历更集中，也会改变文章内容位置。并行处理应保留节点序号，在合并时恢复顺序，并定义失败后是否丢弃整个结果；不能多个线程无序写同一个字符串缓冲区。

树之外的结构还要考虑共享节点和环。目录导航可能让同一对象出现两次，应先约定按“出现位置”还是“对象身份”计数；存在回边时，要有访问标记或深度限制。访问者接口本身不会保证遍历终止。

## 导出安全和优化边界

纯文本输出与 HTML、JSON 输出不是同一个编码问题。生产 HTML 应使用带上下文转义的模板或 DOM API，分别处理正文、属性、URL 和样式；仅转义正文不能阻止属性注入或危险链接。JSON 应交给成熟序列化库，手拼数组容易出现空列表变成单个空字符串、控制字符遗漏和尾逗号错误。

编译器也常用访问者，但语法解析生成 AST 发生在这些访问操作之前。后续可分别实现名称解析、类型检查、常量折叠和代码生成。优化必须保留语言语义：`x * 0` 改成 `0` 可能删除 `x` 的副作用，也可能改变浮点 NaN、无穷或异常行为；把乘方符号原样输出到另一门语言也不一定正确。

每个操作要说明失败策略。发布文档时缺少必要资源应停止并报告节点位置；质量扫描可以收集多个错误，但输出必须同时带有失败清单。不能吞掉异常后把半份导出当成功返回。外部文件应先生成临时产物，完整成功后再发布，避免中途失败覆盖已有文件。

## 验证和选型

验证包含两种元素各自被正确分派、空文档、重复访问无累加、输出顺序、非法字段，以及中文和补充平面字符的统计边界。新增元素时让每个访问者给出明确处理；默认空实现可能让关键校验悄悄漏检，不宜用于必须覆盖全部节点的操作。

[迭代器模式](./iterator.md)决定如何获得下一项；访问者决定对具体类型执行什么操作。[策略模式](./strategy.md)适合替换一个统一算法，不要求为稳定元素族提供逐类型分派。[解释器模式](./interpreter.md)把语言规则表示成对象，访问者可以用于这些对象上的求值、检查或格式化。

只有少数固定操作时，把方法放回元素或使用普通函数往往更直接。元素类型频繁增加时，访问者会使所有操作跟着修改；应先确认真正稳定的是“数据类型”还是“操作集合”，再决定扩展方向。
