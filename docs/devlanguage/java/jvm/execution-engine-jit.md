# 执行引擎与 JIT

订单接口第一次收到请求时，需要加载类、建立连接、填充缓存，还可能处于解释执行阶段。持续运行后，同一个金额计算方法可能已经有编译后的机器码。启动变快或吞吐变高，不能全部归因于 JIT；需要把编译活动与业务预热、GC、系统 CPU 放到同一时间轴观察。

本页以 HotSpot 为例。解释器、C1、C2 和分层策略属于实现机制，不是 Java 语言要求每个方法必须经过的固定阶段。

## 字节码如何进入编译代码

![HotSpot 编译与去优化关系](/jvm/execution-tiering.svg)

解释器可以直接执行方法，也会收集方法调用、循环回边和类型分布等信息。编译策略根据热度、已有代码和编译队列决定是否提交任务。C1 编译速度较快，可以生成带采样信息的代码；C2 通常投入更多优化成本。启用分层编译时，不同方法可以停留在不同层级，也可以跳过某些层级。冷方法可能一直由解释器执行。

方法已经开始运行，也不一定要等下一次调用才进入编译代码。长循环可通过 OSR（On-Stack Replacement）在执行中切入适合该位置的机器码。编译日志中的 `%` 常用来标记 OSR 编译；这与从方法入口开始执行的普通编译任务不同。

例如导出任务循环计算十万笔订单金额，热点可能是循环体；在线接口则可能是每次只执行几行、但被频繁调用的方法。二者都可能成为编译目标，不能只看某个方法的调用次数。

## 优化为什么依赖上下文

方法内联会把被调方法的实现展开到调用点，让后续优化看到更多信息。订单总价计算中的小型取值方法可能被内联，随后常量传播或无用分支消除继续简化代码。但内联也会增加机器码体积，因此“内联越多越快”不是调参目标。

逃逸分析判断对象如何被使用。若编译器能证明一个临时对象的字段可以独立处理，就可能通过标量替换消除实际分配；如果锁不需要保护跨线程共享状态，也可能消除锁。不能把这一过程描述成 HotSpot 普遍把对象搬到线程栈。源码出现 `new`，也不证明运行时一定产生了相同数量的堆对象。

```java
record Amount(long cents) {}

static long payable(long cents) {
    Amount amount = new Amount(cents);
    return amount.cents() + 100;
}
```

这个片段展示可优化的使用方式，不承诺一定消除分配。实际结果还受内联、编译器、版本和调用上下文影响。若把 `amount` 存入全局集合，它的身份和存活时间就改变了，不能沿用前一个结论。分配是否消除应通过适当的分配观测或专门基准验证。

锁消除、锁粗化和运行时锁实现也要分开理解：前两者是编译优化，锁的竞争与膨胀则涉及同步运行机制。偏向锁是历史版本主题，不应作为现代 JDK 排查同步问题的统一入口。

## 去优化与 Safepoint

JIT 可以利用运行时收集的类型信息进行推测性优化，并保留假设失效时的恢复路径。插件引入新的实现类型后，原来只看到一种类型的调用点可能需要使部分编译代码失效、恢复解释器状态并重新收集信息。不是每次加载类都必然触发去优化，也不是一次延迟尖刺就能证明发生了去优化。

`PrintCompilation` 中的 `made not entrant` 表示某份编译代码不再接受新的入口调用；它可能与更高层级代码替换有关，不能单凭这几个字推断业务抖动根因。需要结合编译层级、时间、JFR 和请求指标判断。

Safepoint 是 JVM 协调执行某些操作的机制。到达安全状态的等待时间与操作本身的耗时应分别观察。GC 有需要停顿的阶段，也有并发阶段；线程局部握手也不能一概当作全局停顿。检查 JDK 17 的统一日志可以使用下面的启动参数，日志应轮转并写入容量受控的目录：

```bash
'-Xlog:gc*,safepoint:file=runtime.log:time,uptime,level,tags:filecount=3,filesize=10M'
```

如果日志表明请求变慢时 GC 停顿很短，应继续检查锁等待、下游响应、CPU 调度和限额，而不是继续收紧 GC 停顿目标。

## 观察一个有限的编译实验

使用 JDK 17 或更新版本，将下面的程序保存为 `JitLab.java`。它只产生计算负载，最后短暂保留进程供观测，不需要连接外部服务。

```java
public class JitLab {
    static volatile long result;

    static long payable(long cents) {
        return cents + 100;
    }

    public static void main(String[] args) throws Exception {
        long sum = 0;
        for (int round = 0; round < 20; round++) {
            for (int i = 0; i < 200_000; i++) {
                sum += payable(i);
            }
        }
        result = sum;
        System.out.println("pid=" + ProcessHandle.current().pid());
        System.out.println("result=" + result);
        Thread.sleep(20_000);
    }
}
```

```bash
javac JitLab.java
java -XX:+PrintCompilation JitLab
```

输出中的结果应为 `400398000000`；日志通常能看到 `JitLab::payable` 或 `JitLab::main` 的编译，但具体任务、层级和顺序不固定。程序只保留 20 秒，第二个终端需在此期间执行。将下面的 `12345` 换成输出中的 PID，以相同用户在相同 PID 命名空间运行：

```bash
jcmd 12345 Compiler.codecache
jcmd 12345 Compiler.queue
```

Code Cache 保存编译后的代码和部分运行时桩，不属于 Java 堆。先看使用量、编译是否启用与日志，再判断是否需要调整 `ReservedCodeCacheSize`。NMT 只能在启动时用 `-XX:NativeMemoryTracking=summary` 等选项开启后提供相应统计，不能把未开启时的空结果当成“没有 native 内存”。

可另跑 `java -Xint JitLab`，确认纯解释模式仍得到相同业务结果。这个程序没有隔离预热、死代码消除、系统噪声和测量开销，不能把两次执行时间当成可信的性能基准；需要比较具体实现时使用 JMH，并检查业务是否仍在做等量工作。

## 从现象选证据

| 现象 | 先检查 | 结论边界 |
| --- | --- | --- |
| 新实例首批请求慢 | 类加载、连接与缓存预热、编译时间轴 | 不把全部启动成本算给 JIT |
| CPU 高，GC 时间少 | JFR 执行采样、编译线程与应用热点 | CPU 热点与等待时间分开分析 |
| 运行中吞吐突然下降 | Code Cache、编译活动、GC、系统限额 | 代码失效日志本身不足以证明因果 |
| 延迟尖刺 | 请求时间轴、Safepoint、锁等待、下游耗时 | 平均耗时不能替代尾延迟 |

需要记录 60 秒采样时，可在仍存活的目标进程上使用 `jcmd 12345 JFR.start name=jit settings=profile duration=60s filename=/tmp/jit.jfr`。路径属于目标进程文件系统，目标用户必须有写权限；采样仍有开销，应结合运行负载决定时长。本页 20 秒实验只验证命令入口，长期采样用于持续运行的服务。排查完成后，用相同请求、相同并发和相同资源限额对比吞吐、尾延迟及 CPU，才能判断优化是否有效。

进一步阅读：[对象生命周期](./object-lifecycle.md)、[诊断案例](./diagnostic-cases.md)、[运行时内存](./runtime-area/index.md)。

<style scoped>
:deep(table) { display: block; overflow-x: auto; }
:deep(th), :deep(td) { min-width: 9em; }
</style>
