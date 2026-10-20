# 对象生命周期：从 new 到回收

导出订单时，查询得到的对象先被当前任务引用，生成文件后本应释放。如果导出结束后，线程池中的上下文仍保存整个结果集，这些对象就会继续存活。理解对象生命周期，需要把创建过程、引用持有和回收条件连起来，而不只是记住“对象在堆上”。

## 创建与初始化有不同步骤

`new Order()` 对应的字节码通常既有分配实例的 `new`，也有调用实例初始化方法的 `invokespecial`。执行创建前，目标类需要满足加载、链接和初始化的前提；首次使用的延迟可能包含静态初始化，不能只归于对象分配。

实例存储先获得默认零值，再按构造链执行初始化。以 JDK 17 普通构造器为例，超类构造完成后，才按源码顺序执行本类实例字段初始化器和实例初始化块，最后执行本类构造器剩余语句。字段初始化器和初始化块彼此按出现顺序交织，不是“所有字段完成后再执行所有代码块”。通过 `this(...)` 委托时，这些初始化也不会在每层构造器重复执行。

```java
class BaseOrder {
    BaseOrder() { System.out.println("base"); }
}

public class OrderInit extends BaseOrder {
    int cents = initialPrice();
    { System.out.println("block=" + cents); }

    OrderInit() { System.out.println("constructor=" + cents); }

    static int initialPrice() {
        System.out.println("field");
        return 19900;
    }

    public static void main(String[] args) { new OrderInit(); }
}
```

将其保存为 `OrderInit.java`，运行 `javac OrderInit.java` 和 `java OrderInit`，顺序应为 `base`、`field`、`block=19900`、`constructor=19900`。构造器里注册回调、启动线程或把 `this` 放入共享集合，可能使未完成初始化的实例被别处访问；安全发布是另外一个并发约束，不能用“构造器已经开始运行”代替。

## 分配位置与对象布局

HotSpot 常用 TLAB 降低分配竞争。它是堆中由线程独占使用的分配缓冲区，不是线程栈；对象从 TLAB 分配也仍然是堆对象。需要更大的对象、缓冲区不足或特定回收器策略时，分配会走其他路径。指针递增、空闲块管理和 TLAB 描述的是不同层次的机制，不能简单作为三种互斥算法。

对象整体布局包括对象头、实例字段以及可能的对齐填充。传统 HotSpot 对象头包含 Mark Word 和类型信息，数组还需要长度信息；实例数据和填充本身不属于对象头。压缩指针、对齐参数、继承字段排列和运行版本都会影响实际大小，因此不能用“字段字节数相加”估算整个对象。

JDK 24 引入实验性的紧凑对象头；JDK 25 将其转为产品特性，但该版本仍需显式启用 `UseCompactObjectHeaders`。这里的版本边界不能推广到所有更新版本和所有 JVM。检查具体对象布局时，应记录运行 JDK、启动参数和对象类型，再用 JOL 等工具测量，避免硬背一个固定头大小。

## 可达性决定能否回收

![导出结果被长期引用的关系](/jvm/heap-export-retention.svg)

导出函数返回，只代表一次调用结束。如果静态缓存、任务队列、监听器、JNI Global Reference 或活动线程继续持有对象，对象仍可能从 GC Roots 可达。反过来，对象之间互相引用并不自动构成泄漏；整个引用环都不可达时，也可以回收。

分析时应从业务应有的存活范围出发：下载文件已生成，为什么订单列表仍被持有？Dominator Tree 帮助找到保留大量内存的支配对象，GC Roots 路径帮助追查谁让它继续存活。对象数量多、浅堆大和保留堆大描述不同问题；不能只看直方图第一名就断言泄漏。

## ThreadLocal 的 key 与 value

![线程池中的 ThreadLocal 持有关系](/jvm/threadlocal-retention.svg)

ThreadLocalMap 的 Entry 对 key 使用弱引用，但对 value 的引用是强引用。key 被回收后，value 不保证立即清理；线程仍存活且条目未被清除时，value 仍可能被保留。在线程池里，key 也可能一直被静态字段持有，此时忘记清理同样会跨请求残留上下文，甚至把上一次请求的信息带到下一次任务。

独立任务拥有自己的上下文时，应在同一线程的 `finally` 中清除：

```java
CONTEXT.set(context);
try {
    exportOrders();
} finally {
    CONTEXT.remove();
}
```

这是任务边界的机制片段，`CONTEXT`、`context` 与 `exportOrders()` 由应用定义。如果调用发生在已有上下文的嵌套作用域里，退出时通常应恢复外层值，不能无条件 `remove()` 破坏外层状态。框架若区分“无条目”和“值为 null”，应通过它提供的作用域 API 成对安装与恢复。异步切换线程也不会自动传播普通 ThreadLocal；传播、恢复与清理都需要明确的所有者。

## 存活不等于固定晋升路线

在 Serial、Parallel 等传统分代模型中，常见路径是 Eden 分配、年轻代回收后在 Survivor 存活，随后按年龄或空间压力晋升。TLAB、年龄阈值和晋升行为都是具体实现和策略的一部分，不是对象必须经历的 Java 语义。

G1 用 Region 组织堆，Humongous 对象按 Region 大小判定并走特殊分配路径；Mixed GC 是 G1 的具体机制，不能说所有回收器在“老年代高”时都触发 Mixed GC。ZGC、Shenandoah 还需要结合 JDK 版本和具体模式理解，详见 [GC 总览](./gc/index.md)。

一次读取整个文件、收集所有分页结果再统一生成 JSON，可能制造大数组和高峰存活集。流式读取只有在后续阶段也逐批消费、及时解除引用时才降低峰值；如果最后又收集成一个 `List`，前面的分页没有解决保留问题。批大小、队列长度、缓存容量和导出并发需要一起限制。

## 从存活问题回到验证

出现 OOM 时先保留准确错误类型和进程状态。`Java heap space` 可进一步看堆和引用链；Metaspace、直接内存、native 线程或容器 OOM 不能只靠 heap dump 解释。直方图和堆转储都可能造成明显停顿，转储还需要足够磁盘，应按 [诊断案例](./diagnostic-cases.md) 选择采集动作。

修复导出任务后，可固定订单数量、单批大小与并发，连续执行多轮：对比任务队列、活动导出数、回收后堆占用和上下文是否恢复。缓存允许保留到容量上限，文件缓冲可能按设计复用，因此目标不是强求每轮 RSS 立即回到初始值，而是确认保留量有边界、跨任务状态不串用、业务结果正确。
