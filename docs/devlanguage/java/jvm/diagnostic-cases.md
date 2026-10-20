# JVM 诊断案例

订单导出变慢、插件重载后内存上涨、音频 native 库推高容器内存，外观都可能是“Java 服务卡了”，但证据入口不同。先保留时间、错误原文、JDK 版本、启动参数、发布变更和资源限额，再决定采集哪一类数据。下面用典型工程场景说明判断路径，命令以 JDK 17 HotSpot 为基线。

![JVM 故障证据分支与复测](/jvm/diagnostic-path.svg)

## 采集前先确认进程与成本

`jcmd` 要以合适的用户访问目标，并确认 PID 命名空间一致。下面示例中的 `12345` 都应替换为实际 PID；`/tmp` 文件路径属于目标进程所在环境，不能假定宿主机与容器看到同一个目录。进程已经退出时，不能再靠 `jcmd` 追采现场，需要使用事先保存的日志、监控、JFR 或 dump。

```bash
jcmd 12345 VM.version
jcmd 12345 VM.command_line
jcmd 12345 VM.flags
jcmd 12345 GC.heap_info
```

这些信息帮助确定运行版本、实际参数和堆布局，仍应避免高频重复 attach。`GC.class_histogram` 和 `GC.heap_dump` 可能带来较大停顿，默认行为还可能请求 GC；在目标版本上先看 `jcmd 12345 help GC.heap_dump`。转储前确认磁盘空间、可接受停顿和文件权限，heap dump 也可能含业务敏感数据，应控制访问与保留周期。

## 导出任务触发 Java heap space

如果错误原文是 `OutOfMemoryError: Java heap space`，且多轮导出后回收后的堆基线持续上升，先把任务量、并发数、队列长度与堆曲线对齐。批量查询产生的大 `List` 可能只是瞬时峰值；任务已结束却仍被上下文或缓存保留，才指向生命周期问题。两者对应的修复不同。

需要进一步确认对象分布或引用链时，分别选择直方图或堆转储，不要把两条高成本命令默认连续执行：

```bash
# 对象数量与浅堆分布；不能直接给出完整保留链
jcmd 12345 GC.class_histogram > /tmp/order-histogram.txt

# 目标进程写文件；确认空间、停顿和权限后使用
jcmd 12345 GC.heap_dump /tmp/order-export.hprof
```

在 MAT 中先看支配树与保留堆，再追 GC Roots。若线程池上下文保存已完成任务的结果，修复任务退出清理；若队列无限积压，则限制队列、并发并建立拒绝或背压策略。只把 `-Xmx` 调大可能推迟失败，却增加容器压力。验收要用相同数据和并发重复导出，确认队列能排空、回收后堆稳定在有界范围。

可在启动时配置 `-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/var/log/app` 预留 OOM 证据，但目录必须存在、可写且容量足够。这不能保证被内核杀死的容器一定留下 dump。

## 延迟尖刺与 Full GC

批任务期间接口尾延迟升高，应先核对同一时刻是否真的发生长 GC 停顿，不能仅凭 Full GC 次数累计值判断。日志需要在启动时保留并轮转：

```bash
'-Xlog:gc*,safepoint:file=runtime.log:time,uptime,level,tags:filecount=3,filesize=10M'
jstat -gcutil 12345 1000 5
```

上面第一行是 JVM 启动参数，不是独立 shell 命令。`jstat` 只取五次辅助样本；应以具体回收器的事件、原因、阶段和回收前后占用为主。显式 `System.gc()`、分配压力、晋升失败或元数据压力可能产生不同原因，不能把它们全部解释为堆泄漏。G1 的 Mixed GC 也不等同于 Full GC。

如果日志显示回收后仍有大量存活数据，检查大结果集、缓存和队列；如果暂停主要来自等待安全状态，结合 Safepoint 记录继续定位；如果 GC 停顿没有覆盖慢请求，则转查锁、下游和 CPU 限额。调整前固定基线，调整后同时比较吞吐、尾延迟、CPU 与存活量。`MaxGCPauseMillis` 是特定回收器的目标，不是接口延迟的硬保证。

## 插件重载引起 Metaspace OOM

报错为 `OutOfMemoryError: Metaspace` 时，观察每次插件加载和卸载后，类加载器数量与加载类是否持续累积。`jcmd 12345 VM.classloader_stats` 能看统计，但不能独自证明谁在保留旧加载器。堆中的加载器对象、Class 对象和关联引用链可以解释元空间为什么无法释放。

例如插件启动后台线程，卸载时只从插件注册表删除，却没有停止线程；线程上下文加载器仍引用插件加载器。即使插件内部引用成环，只要外部活动线程继续持有它，类型元数据就可能保留。需要停止任务、注销回调、恢复上下文加载器，并核对共享缓存与 ThreadLocal。

`MaxMetaspaceSize` 提供预算边界，不会修复这条引用链。如果启动时开启了 `-XX:NativeMemoryTracking=summary`，可用 `jcmd 12345 VM.native_memory summary` 辅助观察 JVM 跟踪的 native 分类。修复后重复加载、调用、卸载，在具备类卸载条件的回收周期后观察趋势，而不是要求一次卸载立即返还全部 RSS。机制见 [方法区与元空间](./runtime-area/method-area.md)。

## 堆不高，容器却被终止

音频解码或推理通过 JNI 分配 native 内存时，Java 堆可能很稳定，但整个 cgroup 已接近内存上限。先核对编排系统给出的 `OOMKilled`、内核记录以及 cgroup 事件；退出码 137 只说明收到 SIGKILL，不能单独证明 OOM。

在 Linux cgroup v2 环境中，确认目标实际所属 cgroup 后再读取其 `memory.current`、`memory.max`、`memory.events` 和 `memory.stat`。路径随容器运行方式变化，不能直接套用某个宿主机路径。cgroup 统计还可能包含页缓存和同组进程，不等于某一个 Java 进程的 RSS。

进程仍存活时，可对比堆、RSS、线程、BufferPool 指标和 native 分类：

```bash
ps -o pid,rss,vsz,command -p 12345
jcmd 12345 GC.heap_info
# 仅在启动时已开启 NMT 的情况下
jcmd 12345 VM.native_memory summary
```

NMT 不覆盖所有第三方 native 分配，reserved 也不等于已驻留内存。如果 NMT 分类无法解释 RSS 增长，继续查看系统内存映射、native 库和分配分析；不能据此断言 JVM 没问题或 native 没泄漏。`MaxDirectMemorySize` 约束相应 JDK NIO direct 预算，不限制全部 JNI、mmap 或网络库内存。

对于 JNI 会话，检查创建、失败、取消和关闭路径是否成对释放；对于 buffer，检查 retain/release 与共享视图的所有权。验收要同时记录 native 活动会话数、容器用量和业务结果，并给堆外、线程、页缓存及同组进程留出预算。机制见 [直接内存](./runtime-area/direct-memory.md)。

## CPU 高，但 GC 时间不高

支付回调失败后无退避重试，可能使少量工作线程持续占满 CPU；锁等待和下游阻塞则可能让请求很慢，却不表现为这些线程持续耗用 CPU。先区分“正在计算”和“正在等待”，再找热点。

Linux 平台线程可用以下入口，连续取几次线程栈以区分偶然采样：

```bash
top -H -p 12345
jcmd 12345 Thread.print > /tmp/thread-1.txt
# 将 top 中实际高 CPU 的十进制线程 ID 替换到这里
printf '%x\n' 12346
```

十六进制结果可与 HotSpot 线程栈中的 `nid` 对照，但必须是同一 PID 命名空间。macOS 不适用 `top -H -p`，可先使用 JFR 执行采样和线程栈。虚拟线程也不能按“一条虚拟线程等于一个 OS TID”映射，应按目标 JDK 的虚拟线程诊断能力分析。

需要带时间窗口的热点记录时：

```bash
jcmd 12345 JFR.start name=profile settings=profile duration=60s filename=/tmp/app.jfr
```

确认目标能存活到记录完成，并在目标文件系统取回产物。执行采样、锁事件与分配事件各有覆盖范围；没有采到不代表不存在。若定位到无界重试，加入次数上限、退避和超时预算，再对比相同故障注入下的重试率、CPU、成功率和尾延迟，避免仅通过减少工作量制造“性能改善”。

## 线程持续增长

外部接口变慢时，如果每个请求再创建一条平台线程，线程数可能随着积压上涨，最终报 `unable to create native thread`。原因可以是内存，也可以是进程、线程或 cgroup PID 限额，应同时检查系统限制与创建速率。

Linux 可用 `ps -o nlwp,pid,rss,command -p 12345` 看线程数，再结合线程栈和线程池指标判断是否大量等待同一下游。该字段在不同操作系统有差异，不能当成跨平台命令。不要在没有栈深验证时直接减小 `-Xss`；它可能把资源问题变成 `StackOverflowError`。

修复通常需要连接超时、调用超时、有界执行器、队列和拒绝策略共同建立容量边界。虚拟线程降低部分线程成本，也不会让数据库连接或下游服务拥有无限并发能力。恢复后确认线程与队列能回落、下游并发受控，并验证拒绝、取消和超时仍符合业务合同。

## 保留一次可复用的排障结论

记录触发负载、准确错误、时间对齐的证据、保留对象或热点位置、排除过的替代原因以及修复前后结果。一个参数变化只说明配置不同，只有相同负载下的结果变化和对应机制证据才能支持修复结论。继续阅读：[运行观测实验](./hands-on.md)、[执行引擎](./execution-engine-jit.md)、[对象生命周期](./object-lifecycle.md)。
