# 迭代器模式

迭代器（Iterator）把“数据存在哪里”和“当前读到哪里”分开。浏览商品目录时，同一个目录可以按层级展开，也可以逐层扫描；调用方只取下一个节点，不必持有数组下标或自己维护树的队列。每次遍历都有自己的游标，目录本身不保存“当前第几个”。

![商品目录的独立游标与两种遍历顺序](/design-pattern/patterns/iterator.svg)

## 独立游标与一致性是两件事

Java 的 `Iterable<T>` 负责提供 `iterator()`，`Iterator<T>` 负责 `hasNext()` 与 `next()`。迭代结束后的 `next()` 应抛出 `NoSuchElementException`；`remove()` 是可选操作，默认可以拒绝。不要另建同名的 `Iterator` 或 `Iterable` 接口，否则增强 `for` 等语言机制无法自动使用它们。

两个游标能分别记录进度，不代表同一个游标可以被多线程安全共享，也不代表底层集合允许并发修改。遍历期间的变化需要单独选择一致性合同：

| 合同 | 看到的数据 | 适用边界 |
| --- | --- | --- |
| 不可变结构或固定快照 | 创建时固定的结构 | 复制有成本；元素本身也须考虑可变性 |
| 快速失败，如 `ArrayList` | 检测到某些结构修改时抛异常 | 尽力检测，不是并发正确性的保障 |
| 弱一致，如部分并发集合 | 可能反映部分后续变化 | 具体保证以对应集合合同为准 |
| 受锁保护的整个遍历 | 锁内约定的数据视图 | 所有读写方必须遵守同一锁协议 |

即便 `hasNext()` 和 `next()` 分别加锁，两个调用之间仍可能被其他线程消费。业务需要“检查并取出”原子化时，应使用队列的 `poll()` 等合适接口，不能让一次方法锁替代完整协议。

## 可运行示例：目录的深度与广度遍历

商品目录是“商城 → 数码、图书；数码 → 手机”。前序深度遍历得到“商城、数码、手机、图书”；广度遍历得到“商城、数码、图书、手机”。区别在于待访问节点从头还是从尾入队，节点自身没有处理下一项的状态。

以下代码保存为 `IteratorDemo.java`，使用 Java 17 及以上版本。目录节点和子列表不可变；本例按节点在树中的出现位置遍历，如果同一子节点被两处复用，就会出现两次，不是图上的去重搜索。

```java
import java.util.ArrayDeque;
import java.util.Iterator;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Objects;

public class IteratorDemo {
    record Node(String name, List<Node> children) {
        Node {
            if (name == null || name.isBlank()) {
                throw new IllegalArgumentException("目录名称不能为空");
            }
            children = List.copyOf(children);
        }
    }

    enum Order { DEPTH_FIRST, BREADTH_FIRST }

    record Catalog(Node root, Order order) implements Iterable<Node> {
        Catalog {
            Objects.requireNonNull(root);
            Objects.requireNonNull(order);
        }

        public Iterator<Node> iterator() {
            return new Iterator<>() {
                private final ArrayDeque<Node> pending =
                    new ArrayDeque<>(List.of(root));

                public boolean hasNext() {
                    return !pending.isEmpty();
                }

                public Node next() {
                    if (!hasNext()) throw new NoSuchElementException();
                    Node current = pending.removeFirst();
                    List<Node> children = current.children();
                    if (order == Order.DEPTH_FIRST) {
                        for (int i = children.size() - 1; i >= 0; i--) {
                            pending.addFirst(children.get(i));
                        }
                    } else {
                        pending.addAll(children);
                    }
                    return current;
                }
            };
        }
    }

    public static void main(String[] args) {
        Node root = new Node("商城", List.of(
            new Node("数码", List.of(new Node("手机", List.of()))),
            new Node("图书", List.of())
        ));
        for (Order order : Order.values()) {
            for (Node node : new Catalog(root, order)) {
                System.out.print(node.name() + " ");
            }
            System.out.println();
        }

        Catalog catalog = new Catalog(root, Order.DEPTH_FIRST);
        Iterator<Node> a = catalog.iterator();
        Iterator<Node> b = catalog.iterator();
        a.next();
        System.out.println(b.next().name()); // 仍为商城
    }
}
```

```sh
javac --release 17 IteratorDemo.java
java IteratorDemo
```

预期前两行为上面的两种遍历顺序，第三行为“商城”。每次 `iterator()` 都新建待访问队列；多次 `hasNext()` 不消耗元素；没有实现的 `remove()` 沿用标准接口默认行为并抛出 `UnsupportedOperationException`。

访问 n 个节点的总时间为 O(n)，队列保存尚未访问的节点，额外空间取决于树形，最坏可达 O(n)。广度遍历在很宽的目录上会保留一整层；本例深度遍历也会保存待处理的兄弟节点，不能一概声称只用常数内存。

## 删除、过滤与重放

集合支持迭代删除时，应由该迭代器执行 `remove()`，并遵守“每次成功 `next()` 后最多删除一次”的合同。以下是独立使用片段：

```java
var names = new java.util.ArrayList<>(java.util.List.of("草稿", "作废", "已发布"));
var iterator = names.iterator();
while (iterator.hasNext()) {
    if (iterator.next().equals("作废")) iterator.remove();
}
System.out.println(names); // [草稿, 已发布]
```

`Arrays.asList(...)` 是固定大小列表，不支持这种删除；`List.of(...)` 是不可修改列表。增强 `for` 中直接删原 `ArrayList` 通常也会破坏迭代协议，应使用显式迭代器或 `removeIf`。

过滤迭代器可能预读后续元素才能回答 `hasNext()`。此时直接把 `remove()` 转交底层游标，可能删除预读项而不是最近返回给调用方的项。拼接多个迭代器时也不能用“当前游标”代替“最近返回元素所属游标”。没有可靠映射就应拒绝删除，不能提供看似通用的错误实现。

重放通常需要新建迭代器、重新查询或显式缓存。缓存全部已读元素会增长到整个数据集大小，不再具有固定内存的流式特征；数据库结果或网络流也不一定能重置。若提供批量迭代，批大小必须大于 0，否则可能持续返回空批且永不前进。

## 远程数据和文件需要资源边界

迭代协议没有承诺 `hasNext()` 必须便宜。分页游标可能在这里发起请求，应明确超时、重试、游标令牌与错误传播。稳定排序和一致性也要由数据源保证：按偏移分页的过程中插入新订单，可能导致重复或漏读；不能仅靠封装成迭代器消除这个问题。

JDBC 的 `ResultSet` 有类似游标的协议，但不实现 `java.util.Iterator`。包装时要缓存预读结果，保证重复 `hasNext()` 不跳行，并约定只能创建一个消费游标。调用方用 `try-with-resources` 关闭 `ResultSet`、`Statement`，连接由约定的拥有者关闭；查询构造失败也要释放已获得的资源。

文件遍历优先用标准 API。以下片段展示 `Files.walk` 的关闭位置，不自行实现目录递归：

```java
try (var paths = java.nio.file.Files.walk(java.nio.file.Path.of("."), 8)) {
    paths.filter(java.nio.file.Files::isRegularFile)
         .filter(path -> path.toString().endsWith(".java"))
         .forEach(System.out::println);
}
```

`Files.walk` 返回持有资源的流，遍历提前退出或抛异常时也须关闭。默认不跟随符号链接；启用跟随时还要考虑循环、权限和遍历范围。将 `Files.list(path).iterator()` 压栈却丢掉流对象，会让目录句柄失去关闭入口。

## 验证与选型

先用空集合、单元素和多层目录验证顺序；在耗尽后继续调用 `next()`，应明确抛异常。交错使用两个游标，检查它们不串进度；重复 `hasNext()`，检查不多取数据。可删除迭代器还要检查重复删除、预读和跨集合边界。

业务只是遍历现有集合时，直接采用标准集合协议。需要自定义树顺序、过滤、分页或资源游标时，再实现适当包装。[访问者模式](./visitor.md)负责对不同节点执行何种操作，迭代器负责如何访问下一项，两者可以组合；Java Stream 的执行基础涉及 `Spliterator`，不能简单认定所有流操作内部都使用普通 `Iterator`。
