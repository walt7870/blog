# 享元模式

享元（Flyweight）通过共享重复的稳定状态，减少大量相似对象中的冗余。它不是把所有对象放进一个缓存：先区分哪些数据可以共享，哪些属于某次使用，再把外部状态留在调用上下文中。

![单元格共享样式与独立内容](/design-pattern/patterns/flyweight.svg)

## 从导出单元格识别重复状态

一份十万行的导出表格，可能只有少量字体、对齐与数字格式。若每个单元格都创建一套相同样式，样式对象会重复。可以让许多单元格引用同一份不可变样式，而单元格的行号与文本仍各自保存。

共享与否取决于建模边界：颜色可以是共享样式的一部分，也可以作为每次绘制的参数，不能一概称为“外部状态”。判断标准是它是否随某个使用上下文变化，以及共享后是否会相互覆盖。

## 有界样式工厂与独立单元格

下面只演示对象共享，不生成真实电子表格。工厂使用有限枚举作键，最多保留两种样式，避免任意字符串造成缓存持续增长。保存为 `FlyweightDemo.java`，可在 Java 17+ 编译运行：

```java
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.stream.IntStream;

public class FlyweightDemo {
    enum StyleKey { TEXT, AMOUNT }

    record ColumnStyle(String font, int points, String align) {
        String display(String value, int row) {
            return "行" + row + " / " + align + " / " + value;
        }
    }

    static final class StyleFactory {
        private final ConcurrentMap<StyleKey, ColumnStyle> styles =
                new ConcurrentHashMap<>();

        ColumnStyle get(StyleKey key) {
            return styles.computeIfAbsent(Objects.requireNonNull(key),
                    type -> switch (type) {
                        case TEXT -> new ColumnStyle("默认字体", 12, "左对齐");
                        case AMOUNT -> new ColumnStyle("默认字体", 12, "右对齐");
                    });
        }

        int size() { return styles.size(); }
    }

    record Cell(int row, String value, ColumnStyle style) {
        Cell {
            if (row < 1) throw new IllegalArgumentException("行号必须为正数");
            Objects.requireNonNull(value);
            Objects.requireNonNull(style);
        }

        String display() { return style.display(value, row); }
    }

    public static void main(String[] args) {
        StyleFactory factory = new StyleFactory();
        ColumnStyle text = factory.get(StyleKey.TEXT);
        Cell first = new Cell(1, "O-1001", text);
        Cell second = new Cell(2, "O-1002", factory.get(StyleKey.TEXT));
        Cell amount = new Cell(1, "88.00", factory.get(StyleKey.AMOUNT));
        IntStream.range(0, 100).parallel().forEach(index -> {
            if (factory.get(StyleKey.TEXT) != text) {
                throw new AssertionError("同一工厂应复用同键样式");
            }
        });
        if (first.style() != second.style() || amount.style() == text
                || factory.size() != 2 || first.value().equals(second.value())) {
            throw new AssertionError("样式共享，内容独立");
        }
        System.out.println(first.display());
        System.out.println(second.display());
        System.out.println(amount.display());
        System.out.println("3 个单元格引用 " + factory.size() + " 个样式对象");
    }
}
```

`ColumnStyle` 保存内部状态，`Cell` 保存外部状态并持有样式引用。工厂可以并发查找，但这不自动让任意可变样式变得线程安全；本例使用不可变记录，方法也没有保存“当前单元格”。引用相等只用于验证本工厂的复用，业务值比较仍应使用 `equals()`。

如果用共享样式作 Map 键保存“当前行号”，两个单元格会写到同一个位置，后写的值覆盖先写的值。外部状态应按单元格身份保存，或在调用时传入，而不是附着到共享对象。

## 享元、对象池与单例

| 机制 | 共享或复用什么 | 使用时的关键限制 |
| --- | --- | --- |
| 享元 | 多个上下文同时引用稳定状态 | 共享部分不保存单次使用的可变状态 |
| 对象池 | 借出、归还连接等资源 | 有租约、独占使用、重置与关闭责任 |
| 单例 | 某个范围内一个实例 | 唯一范围与内部状态安全另行定义 |
| 原型 | 从模板创建新对象 | 副本的可变部分是否独立 |

数据库连接、线程池工作线程通常有可变会话或执行状态，不是可被多个调用方随意同时共享的不可变享元。连接池减少重复创建成本，但要控制借用与归还，不能套用上面的样式共享方法。

字符串驻留可帮助理解规范化共享，但不可无界驻留用户输入。`Integer.valueOf()` 保证缓存 -128 到 127，并允许缓存更多值，所以两个值为 200 的包装对象是否引用相等不能写成跨运行环境固定为 false。业务比较整数值不应依赖这类缓存身份。

## 容量与性能如何判断

对象数量从 n 降到 k，并不等于内存节省率为 `1-k/n`。每个上下文仍要保存值、坐标和引用，工厂还有键、Map 与索引开销。粗略模型是“共享状态 k 份 + 外部上下文 n 份 + 工厂开销”，与“不共享时 n 份完整对象”比较，最后用相同 JVM 参数和真实数据测量保留堆大小。

若共享状态很小、键的种类接近单元格数量，工厂反而可能占更多内存。先用堆分析确认重复对象的保留关系，再比较创建耗时、分配速率、GC与查询成本，不以示例打印的对象数量充当性能结果。

开放配置的工厂需要容量与生命周期规则。弱引用可以让值被回收，但不会自动限制强引用键数量；并发重建也可能暂时产生多个等值对象。需要严格唯一身份时，回收策略与合同要重新设计；需要有界缓存时优先使用成熟实现。

## 失败与验收

验证同键共享、不同键区分、并发创建、外部状态互不覆盖，以及非法键与工厂作用域。共享对象如果持有数组、集合或外部资源，仅字段加 `final` 不足以证明不可变，还要处理防御性复制、引用泄露与关闭责任。

字体、模板和样式更新应使用版本化键或创建新不可变对象，不在旧共享实例上直接修改。不同租户的私有模板还要把租户与版本纳入边界，避免共享错误的数据。此模式适合经过测量的重复状态，不是通用的内存优化开关。
