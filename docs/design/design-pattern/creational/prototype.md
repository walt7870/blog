# 原型模式

原型模式通过复制已有对象创建新对象，适合“保留大部分配置，只改少数字段”的需求。它不要求实现 Java `Cloneable`；显式 `copy()`、复制构造器或 `copyWith()` 都可以表达复制合同。

![导出模板复制时的共享与独立字段](/design-pattern/patterns/prototype.svg)

## 复制的是配置还是身份

用户复制一份订单导出模板时，希望沿用列顺序与文件格式，但新模板应有自己的名称与标识。原模板的列配置不能因副本编辑而改变；不可变的列名字符串可以共享。运行中的任务、数据库主键、幂等键、连接句柄和锁则不能盲目复制。

因此，复制前先定义边界：哪些是独立的可变状态，哪些是可共享的不可变值，哪些字段需要重新生成。复制对象是否比重新构建更快，需要结合对象图和初始化成本测量，不能从“克隆”这个名称得出结论。

## 浅拷贝与深拷贝

Java `Object.clone()` 按字段复制对象，引用字段仍指向原来的对象，是浅拷贝。给外层对象加一个 `Cloneable` 并不会递归复制其列表或列表元素。深拷贝也应以业务需要的可变子图为边界，不需要复制不可变字符串，更不应复制外部连接。

| 字段 | 模板复制合同 | 原因 |
| --- | --- | --- |
| 名称 | 用调用者提供的新名称 | 副本身份应可区分 |
| 列表容器 | 新建列表 | 编辑副本的列不影响原模板 |
| 列名字符串 | 可以共享 | `String` 不可变 |
| 可变列设置对象 | 按字段继续复制 | 仅复制容器仍会共享元素 |
| 数据库主键、任务状态 | 新建或不带入 | 配置复制不等于复制业务执行实例 |

## 可运行示例

以下 Java 17+ 示例中列名是不可变字符串，所以新建列表就满足当前复制边界。

```java
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public final class PrototypeDemo {
    static final class ExportTemplate {
        private final String name;
        private final List<String> columns;

        ExportTemplate(String name, List<String> columns) {
            this.name = Objects.requireNonNull(name);
            this.columns = new ArrayList<>(List.copyOf(columns));
        }

        ExportTemplate copyAs(String newName) {
            return new ExportTemplate(newName, columns);
        }

        void addColumn(String column) {
            columns.add(Objects.requireNonNull(column));
        }

        List<String> columns() {
            return List.copyOf(columns);
        }

        String name() {
            return name;
        }
    }

    public static void main(String[] args) {
        ExportTemplate original = new ExportTemplate(
                "订单基础", List.of("订单号", "金额"));
        ExportTemplate copy = original.copyAs("订单物流");
        copy.addColumn("物流单号");

        if (original == copy || original.columns().size() != 2
                || copy.columns().size() != 3) {
            throw new AssertionError("复制边界错误");
        }
        System.out.println(original.name() + ": " + original.columns());
        System.out.println(copy.name() + ": " + copy.columns());
    }
}
```

使用 `javac PrototypeDemo.java && java PrototypeDemo` 运行。原模板仍有两列，副本有三列。构造器复制传入集合，查询方法返回只读快照，同时收敛了输入与输出两端的可变引用泄漏。

## 为什么不直接序列化复制

序列化往返可以复制部分对象图，但要求类型支持相应机制，并涉及类型信息、版本、性能和数据安全。它不是所有对象都适用的通用复制器；不能为复制方便而反序列化不可信数据。

显式复制能看清每个字段的处理，代价是新增字段时必须维护合同。循环引用、共享子对象和多态对象尤其需要注意：简单递归可能无限循环，也可能把本应共享的同一子对象复制多份。

## 验收与适用边界

先修改副本的每个可变字段，验证原模板不变，再反向修改原模板。若存在嵌套对象，需要覆盖元素级修改；只比较两个顶层引用不同并不够。还应检查副本主键、幂等键和执行状态没有沿用。

该示例面向单线程模板编辑。若原对象会并发变化，复制时必须使用一致快照或同步机制，否则可能读到不同时间的字段组合。若对象很简单或不需要复用已有配置，直接构造或[建造者](./builder.md)更直观。
