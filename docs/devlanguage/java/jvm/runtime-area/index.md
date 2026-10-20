# JVM 运行时数据区

运行时数据区回答“执行位置、调用现场、对象和类型信息分别由谁保存”。排障还要多问一层：这块数据在 Java 堆里，还是占用进程的其他内存？**线程归属和物理位置是两个维度**。元空间既是线程共享的，又位于 native memory；虚拟线程的栈仍是线程私有的逻辑调用现场，却可以用堆内 stack chunk 保存。

![JVM 运行时数据区与进程内存边界](/jvm/runtime-area-map.svg)

## 区域与观测口径

下表区分 JVM 规范中的逻辑区域与 HotSpot 的实现。Code Cache 和直接缓冲区有助于解释进程占用，但不是规范额外定义的两个运行时数据区。

| 区域 | 归属与内容 | HotSpot 观测入口 |
| --- | --- | --- |
| [堆](./heap.md) | 共享；对象实例、数组 | 堆使用量、GC 日志、heap dump |
| [方法区 / 元空间](./method-area.md) | 共享；类结构、字节码、运行时常量池等 | 类加载器统计、Metaspace 使用量 |
| [虚拟机栈](./vm-stack.md) | 线程私有；栈帧、参数、局部变量和中间计算 | 异常栈、线程 dump |
| [本地方法栈](./native-method-stack.md) | native 调用现场；HotSpot 平台线程的 Java/native 帧通常共用 OS 栈 | 崩溃日志、native 调用栈 |
| [程序计数器](./program-counter.md) | 线程私有；当前 JVM 指令位置，native 方法中未定义 | 字节码偏移、调试器；没有独立容量参数 |
| [直接内存](./direct-memory.md) | 本文特指 NIO direct buffer 数据；共享须由程序同步 | direct BufferPool、分配上限 |
| Code Cache | JIT 机器码和相关代码结构 | `Compiler.codecache` |

同一笔订单导出会同时涉及多个区域：方法参数保存在逻辑栈帧中，订单列表在堆中，导出类的元数据在元空间，写网络的 direct buffer 数据在堆外。它们由同一次请求触发，却不受同一个参数限制。

## 从故障现象选择入口

| 信号 | 第一份证据 | 后续判断 |
| --- | --- | --- |
| `Java heap space` | GC 日志、对象直方图、必要时 dump | 导出是否一次加载全部订单，还是缓存长期保留 |
| `Metaspace` | 当前类数量、类加载器数量和重复加载趋势 | 合法加载容量、生成类失控，还是旧加载器未退出 |
| `Direct buffer memory` 或无法预留 direct buffer | direct 池、上限、分配位置 | buffer 持有过久、峰值过高或上限过小 |
| `StackOverflowError` | **出错时**的异常栈 | 重复调用、循环对象输出或合法但过深的遍历 |
| 无 Java OOM，进程被容器终止 | 容器事件、退出原因、内存曲线 | 先确认 OOM kill；单独的退出码 137 不足以证明 |
| RSS 增长但堆稳定 | 同时段的 RSS、NMT、buffer 池、线程数 | 继续区分线程栈、映射、allocator 保留和 native 分配 |

## 参数控制到哪里

| 参数 | 控制范围 | 不应据此推导 |
| --- | --- | --- |
| `-Xms` / `-Xmx` | Java 堆初始值 / 上限 | 堆上限等于进程上限 |
| `-Xss` | HotSpot 平台线程的栈大小配置 | 每个虚拟线程预留同样大小的 native 栈 |
| `-XX:MaxMetaspaceSize` | HotSpot 类元数据内存上限 | JIT 机器码也在此范围内 |
| `-XX:MaxDirectMemorySize` | JDK NIO direct buffer 容量预算 | 全部 mmap、JNI、Netty 分配均受它限制 |
| `-XX:ReservedCodeCacheSize` | HotSpot Code Cache 预留容量 | 当前 RSS 等于预留量 |

例如 2 GiB 容器中给堆 1 GiB、direct 512 MiB、元空间 256 MiB，三项配置已经合计 1.75 GiB；余下还要承载平台线程栈、Code Cache、GC 结构和 native 库。这不是一份已证明能运行的容量配置，必须用真实线程数、负载和峰值测量。

## 收集同一时段的证据

以下命令在目标进程所在主机或容器、同一操作用户和可见 PID 空间内执行；优先使用匹配该 JDK 的工具。`<pid>` 替换为真实 PID。

```bash
jcmd <pid> VM.command_line
jcmd <pid> VM.flags -all
jcmd <pid> GC.heap_info
jcmd <pid> VM.classloader_stats
jcmd <pid> Compiler.codecache
jcmd <pid> Thread.print
```

NMT 需要启动时设置 `-XX:NativeMemoryTracking=summary`，无法事后从关闭状态开启。预热后执行 `jcmd <pid> VM.native_memory baseline`，问题复现后执行 `jcmd <pid> VM.native_memory summary.diff scale=MB`，比只看一张总量快照更容易定位增长类别。NMT 的 reserved、committed 与操作系统 RSS 含义不同，也不覆盖所有第三方 native 分配。

堆直方图和 dump 放到已确认需要对象证据的分支：`GC.class_histogram`、默认的 `GC.heap_dump` 可能请求 Full GC 并造成停顿，dump 还需要磁盘空间。不要把它们当作每秒采样命令。

阅读时，先用[堆](./heap.md)掌握引用与容量，再看[栈](./vm-stack.md)和[程序计数器](./program-counter.md)理解调用；遇到插件卸载看[元空间](./method-area.md)，接入音视频或存储 native 库看[本地方法栈](./native-method-stack.md)，网络缓冲与 RSS 则进入[直接内存](./direct-memory.md)。

<style scoped>
table td:nth-child(2), table td:nth-child(3) { min-width: 136px; }
table:first-of-type td:first-child, table:last-of-type td:first-child { white-space: nowrap; }
</style>
