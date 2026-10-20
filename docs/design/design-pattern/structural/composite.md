# 组合模式

组合（Composite）把对象组织成部分与整体的结构，让调用方使用同一个操作处理叶子与容器。文件有大小，目录的大小可以定义为其子项大小之和；调用方只需调用 `bytes()`，递归行为由目录实现。

![目录与文件的组合关系](/design-pattern/patterns/composite.svg)

## 共同操作与子项管理分开

组合模式适合共同操作有一致意义的对象，例如目录统计、菜单渲染、表达式求值。它不要求所有节点都能添加子项：文件本身不应假装支持 `add()`，再在运行时抛异常。

可以选择“透明式”接口，把子项管理放在共同接口中，但必须明确叶子不支持这些可选操作；也可以采用“安全式”接口，只把统计等共同能力放进去，子项管理由容器单独承担。下例采用后者，并进一步使用不可变树，创建容器后不再修改子项集合。

## 用目录统计说明递归组合

下面统计的是内存中的逻辑文件条目，不扫描磁盘。文件大小是传入的演示值，目录不计自身元数据；真实文件系统还涉及硬链接、符号链接、稀疏文件与权限失败，不能把这个程序当成磁盘占用工具。

保存为 `CompositeDemo.java`，可在 Java 17+ 编译运行：

```java
import java.util.ArrayList;
import java.util.List;

public class CompositeDemo {
    sealed interface Node permits FileLeaf, Folder {
        String name();
        long bytes();
    }

    static void checkName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("名称不能为空");
        }
    }

    record FileLeaf(String name, long bytes) implements Node {
        FileLeaf {
            checkName(name);
            if (bytes < 0) throw new IllegalArgumentException("大小不能为负数");
        }
    }

    record Folder(String name, List<Node> children) implements Node {
        Folder {
            checkName(name);
            children = List.copyOf(children);
        }

        public long bytes() {
            long total = 0;
            for (Node child : children) {
                total = Math.addExact(total, child.bytes());
            }
            return total;
        }
    }

    public static void main(String[] args) {
        Folder docs = new Folder("文档",
                List.of(new FileLeaf("订单.csv", 100)));
        List<Node> source = new ArrayList<>(List.of(
                new FileLeaf("图片.png", 2000),
                new FileLeaf("视频.mp4", 5000)));
        Folder media = new Folder("媒体", source);
        Folder root = new Folder("导出", List.of(docs, media));
        source.clear();
        if (root.bytes() != 7100 || media.children().size() != 2) {
            throw new AssertionError("容器必须保留独立的子项快照");
        }
        System.out.println(root.name() + ": " + root.bytes() + " 字节");
        System.out.println("空目录: " + new Folder("空目录", List.of()).bytes());

        try {
            new Folder("过大", List.of(
                    new FileLeaf("大文件", Long.MAX_VALUE),
                    new FileLeaf("额外文件", 1))).bytes();
            throw new AssertionError("累加溢出必须失败");
        } catch (ArithmeticException expected) {
            System.out.println("拒绝溢出统计");
        }
    }
}
```

客户端持有 `Node` 时可以统一读取大小，但只有 `Folder` 有 `children()`。目录遍历子项，子目录继续递归，文件直接返回值。一个完整统计访问每个出现的节点一次，时间复杂度为 O(n)，递归调用栈为 O(h)，其中 h 是树高。

`List.copyOf()` 只复制列表结构，不深拷贝元素；此例的两种节点都是不可变对象，因此共享已有子树不会产生并发修改。封闭的节点类型也意味着新增节点类型需要修改 `permits`，这是示例为固定模型选择的限制，不能宣称任意扩展都无需修改。

## 树、共享子树与循环

本例必须先构造子节点，才能构造保存它们的目录，没有修改子项的入口，所以普通构造流程不会建立循环。若从外部 JSON、数据库父子关系或可变对象组装树，仍须检查自引用、祖先回挂和超深结构；不可信输入应设置节点数与深度上限，必要时用显式栈替代递归。

同一文件对象若被放入两个目录，程序按出现次数累计两次。这是“逻辑条目总和”的合同。如果需求是物理存储占用，应按文件标识去重；如果是权限树，共享子树可能具有不同继承路径，更不能机械相加。先定义业务语义，再决定能否复用统一操作。

可变树还要确定父节点归属：是否允许多个父节点、移动是否原子、父子引用如何保持一致。对外返回可修改的子项列表会绕开这些检查，通常应返回只读视图或快照。

## 与链、装饰器和访问者的区别

| 结构 | 主要目的 | 需要注意 |
| --- | --- | --- |
| 组合 | 用共同操作递归处理部分与整体 | 多个子项、树结构与统计语义 |
| 装饰器 | 给一个同接口对象增加处理 | 包装顺序与目标委托 |
| 责任链 | 按顺序决定处理、继续或终止 | 后继节点不一定被调用 |
| 访问者 | 在稳定节点种类上增加不同操作 | 访问分派、遍历顺序与新节点成本 |

Spring Security 的 `FilterChainProxy` 会选择匹配的安全过滤器链，过滤器通过继续调用链推进，也可以提前终止。它不是把所有过滤器在一个 `for` 循环里逐一独立执行；理解其处理过程应优先看[责任链](../behavioral/chain-of-responsibility.md)，不能仅因“包含多个过滤器”就当作目录式组合。

若要对同一目录树增加清单、JSON、HTML等输出，可以评估[访问者](../behavioral/visitor.md)。输出 HTML 时必须转义文件名等外部值，遍历也要约定每个节点只由一方递归，避免重复访问。不要把自行编写的 `CompositeView` 示例当成 Spring MVC 的真实类。

## 验收方式

先核对叶子、空容器、多层容器的结果，再检查负数、溢出、重复引用和输入深度。对可变实现，增加移动、删除、循环、并发读取测试；对本例的不可变实现，验证修改源列表不会改变已构建目录即可。

如果共同接口需要大量“当前节点不支持”的方法，说明统一得过宽；如果数据包含任意环、跨层引用或多种边语义，图模型可能比树形组合更准确。
