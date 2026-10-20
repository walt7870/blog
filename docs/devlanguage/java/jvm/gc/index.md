# JVM GC

订单导出结束后，临时列表已经没有业务价值，Java 堆却还在增长。GC 能判断的是对象是否仍被引用，而不是业务还需不需要它：只要导出任务仍挂在一个可达的集合里，其中的数据就可能一直存活。理解 GC 要先分清引用关系，再看回收器如何在暂停、吞吐、CPU 和内存之间取舍。

## 对象为什么仍然存活

![导出任务的强引用与可达性](/jvm/gc-reachability.svg)

HotSpot 从线程执行状态、JNI 强全局引用、VM 内部结构等根出发，识别可达对象。图中任务已完成，但长寿命的任务表仍强引用任务及结果，因此 GC 不能替业务删除结果。移除那条引用后，如果也没有别的存活路径，结果才具备被回收的条件；这不保证立刻回收或马上降低进程 RSS。

局部变量写在源码里不代表在整个方法期间都保持为 GC 根，JIT 会考虑实际存活性。静态字段也不等于所有对象永久存活：字段所在类及其类加载器能否卸载同样要分析。弱引用、软引用、终结处理等有额外规则，不能把所有引用都当成强引用。具体泄漏分析看 [对象生命周期](../object-lifecycle.md) 和 [诊断案例](../diagnostic-cases.md)。

GC 管 Java 堆中的对象，不自动关闭文件、数据库连接或 JNI 会话。堆使用下降、堆容量下降和 RSS 下降也是三件不同的事，见 [堆](../runtime-area/heap.md) 与 [直接内存](../runtime-area/direct-memory.md)。

## 暂停、并行与并发是不同维度

STW 表示暂停应用线程；并行表示多个 GC 线程一起工作；并发表示 GC 与应用可以同时推进。Parallel GC 可以在 STW 中并行回收，G1 则既有并发标记，也有暂停中的并行转移。不能只按名字把回收器归成互斥的三类。

并发回收也会消耗 CPU、内存带宽和屏障成本，并需要为回收完成前的新分配留空间。如果应用在 100 ms 内又分配了大量数据，回收器还没释放空间就可能出现分配等待或退化回收。业务 P99 延迟还包含排队、锁、I/O 和调度，不等于 GC 暂停时间。

## 选型

![GC 候选与验证约束](/jvm/gc-selection.svg)

先保留当前可工作的基线，再根据真实负载选候选。下面的定位是试验入口，不是按堆大小直接决定的规则。

| 候选 | 可考虑的场景 | 必须检查的约束 |
| --- | --- | --- |
| [Serial](./serial.md) | 小工具、CPU 有限且能容忍暂停 | 存活量增长后的暂停、整个任务耗时 |
| [Parallel](./parallel.md) | 对账、报表等吞吐优先任务 | 最大暂停是否仍满足任务约束 |
| [G1](./g1.md) | 需要兼顾吞吐与停顿的服务 | Young/Mixed 暂停、存活量、大对象与复制空间 |
| [ZGC](./zgc.md)、[Shenandoah](./shenandoah.md) | 已证实 GC 长暂停影响业务的服务 | 发行版和版本、并发 CPU、分配余量、端到端延迟 |
| [ParNew](./parnew.md)、[CMS](./cms.md) | 解释和迁移历史服务 | 旧 JDK 参数，不能照搬到新版本 |
| [Epsilon](./epsilon.md) | 有限分配实验或经过预算的短任务 | 不回收，总分配量必须受控 |

例如夜间对账可以接受一次较长暂停，但要求四十分钟内完成，应比较总耗时、GC 时间与 CPU；支付接口若已经证实慢请求覆盖 GC 暂停，则比较延迟分布、超时率及回收成本。两者都要保持输入、堆预算、CPU 限额和预热条件可比，不能只拿单次跑分判断。

## 用有限实验认识日志

保存 `GcLoad.java`，用 JDK 17 编译。程序分配 32 KiB 数组，环形数组仅保留最近 64 块；静态 `volatile` 字段让数组逃逸，避免把实验退化为容易消除的无用分配。它是分配与引用实验，不代表业务压测。

```java
public class GcLoad {
    private static volatile byte[] last;

    public static void main(String[] args) {
        int rounds = args.length == 0 ? 20000 : Integer.parseInt(args[0]);
        if (rounds < 1 || rounds > 100000) {
            throw new IllegalArgumentException("rounds: 1..100000");
        }
        byte[][] recent = new byte[64][];
        long checksum = 0;
        for (int i = 0; i < rounds; i++) {
            byte[] block = new byte[32 * 1024];
            block[0] = (byte) i;
            recent[i % recent.length] = block;
            last = block;
            checksum += last[0] & 0xff;
        }
        System.out.println("checksum=" + checksum);
        System.out.println("last=" + recent[(rounds - 1) % 64][0]);
    }
}
```

```bash
javac GcLoad.java
java -Xms128m -Xmx128m -XX:+UseG1GC \
  '-Xlog:gc*:file=gc-g1.log:time,uptime,level,tags:filecount=3,filesize=10M' \
  GcLoad 20000
```

正常结束时输出 `checksum=2546416`、`last=31`。日志中的 `Using G1` 确认实际回收器；按 GC ID、时间和原因串起一次回收，看前后已用空间和暂停。`128m` 只是这个有限实验的堆配置，不能复制成服务容量模板。切换候选时只改回收器及日志文件名，并保留相同输入。

JDK 9+ 的统一日志可设置滚动，写入位置应由进程用户可写并具有容量预算。Young、Mixed、Full、Allocation Stall 并非所有回收器共享的分类；ZGC 和 Shenandoah 的字段也随模式和版本变化。监控解析器升级时应拿目标版本的真实日志验证，不能把 `jstat` 的每一列固定理解为 Eden/Survivor。

## 从现象回到原因

先把 GC 日志时间与请求、吞吐、CPU、容器限流及堆曲线对齐。若暂停没有覆盖慢请求，转查线程、下游和调度；若回收后占用基线持续增长，再追存活对象及持有链。短时间分配很多但很快死亡，与长期存活量不断增长，需要不同的改法。

已有服务可在相同用户、可附加且能看到目标 PID 的环境中，先看低成本入口：

```bash
jcmd 12345 VM.flags
jcmd 12345 GC.heap_info
# 仅采样5次；列的含义取决于目标JDK和回收器
jstat -gcutil 12345 1000 5
```

`12345` 要替换成实际 Java PID。对象直方图和 heap dump 可能带来停顿，默认采集还可能请求 Full GC，不能作为每次告警后的自动第一步。先确认命令帮助、磁盘、数据访问范围和可接受窗口，再按 [诊断案例](../diagnostic-cases.md) 采集。

处理后用相同负载验证：结果是否正确、暂停和请求尾延迟是否改善、回收后的存活量是否稳定、CPU 与 RSS 是否在预算内。只把 `MaxGCPauseMillis` 改小，既不能回收仍被引用的对象，也不能保证业务延迟。

<style scoped>
:deep(table) { display: block; overflow-x: auto; }
:deep(th), :deep(td) { min-width: 7em; }
</style>
