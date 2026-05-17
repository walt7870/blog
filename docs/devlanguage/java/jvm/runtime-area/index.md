# JVM 运行时数据区

运行时数据区描述 Java 程序运行时内存如何划分。它不是为了背概念，而是为了排查问题时能快速判断：对象在哪、线程栈在哪、类元数据在哪、堆外内存算不算 JVM 内存。

![JVM 运行时数据区](/jvm/runtime-area-map.svg)

## 区域总览

| 区域 | 是否线程共享 | 存放内容 | 典型问题 |
| --- | --- | --- | --- |
| [堆](./heap.md) | 共享 | 对象实例、数组 | 堆 OOM、Full GC、内存泄漏 |
| [方法区 / 元空间](./method-area.md) | 共享 | 类元数据、常量、方法信息 | Metaspace OOM、类加载器泄漏 |
| [虚拟机栈](./vm-stack.md) | 私有 | 栈帧、局部变量、操作数栈 | 栈溢出、线程过多 |
| [本地方法栈](./native-method-stack.md) | 私有 | JNI / native 调用栈 | native 崩溃、线程栈问题 |
| [程序计数器](./program-counter.md) | 私有 | 当前线程执行位置 | 线程切换和字节码执行理解 |
| [直接内存](./direct-memory.md) | 堆外 | NIO、Netty、mmap、JNI 数据 | Direct buffer OOM、RSS 过高 |

## 线程共享和线程私有

线程共享区域会被多个线程访问：

- 堆：大多数对象在这里分配。
- 方法区 / 元空间：类结构、方法、字段、常量等元数据。

线程私有区域随线程创建和销毁：

- 虚拟机栈：每次 Java 方法调用都会创建栈帧。
- 本地方法栈：Native 方法调用使用。
- 程序计数器：记录当前线程执行位置。

排查时先问两个问题：

1. 问题是否随线程数增加而恶化。
2. 问题是否随对象数量或类数量增加而恶化。

如果随线程数增加，重点看栈、线程池和 `-Xss`；如果随对象增长，重点看堆、直接内存和元空间。

## 常见异常定位

| 异常或现象 | 常见区域 | 优先动作 |
| --- | --- | --- |
| `OutOfMemoryError: Java heap space` | 堆 | 抓 heap dump，分析大对象和引用链 |
| `OutOfMemoryError: GC overhead limit exceeded` | 堆 | 看对象增长速度和 Full GC 频率 |
| `OutOfMemoryError: Metaspace` | 元空间 | 看类加载器、动态生成类、热部署 |
| `OutOfMemoryError: Direct buffer memory` | 直接内存 | 看 NIO/Netty buffer、`MaxDirectMemorySize` |
| `StackOverflowError` | 虚拟机栈 | 查递归、调用深度、`-Xss` |
| 进程 RSS 高但堆不高 | 堆外 | 看直接内存、线程栈、Code Cache、native |

## JVM 参数边界

| 参数 | 控制区域 |
| --- | --- |
| `-Xms` / `-Xmx` | Java 堆 |
| `-Xss` | 每个线程的 Java 栈大小 |
| `-XX:MaxMetaspaceSize` | 元空间上限 |
| `-XX:MaxDirectMemorySize` | 直接内存上限 |
| `-XX:ReservedCodeCacheSize` | JIT 编译代码缓存 |

容器中不要只配置 `-Xmx`。进程总内存还包括线程栈、直接内存、元空间、Code Cache、JNI/native 分配和 JVM 自身开销。

## 排查命令

```bash
# 查看进程
jps -l

# 查看堆
jcmd <pid> GC.heap_info
jmap -histo:live <pid> | head

# 查看类加载器
jcmd <pid> VM.classloader_stats

# 查看线程
jstack <pid>

# 查看 JVM 参数
jcmd <pid> VM.flags
```

如果需要保留现场：

```bash
jcmd <pid> GC.heap_dump /tmp/app.hprof
jcmd <pid> Thread.print > /tmp/thread.txt
```

生产环境抓 dump 会带来停顿和磁盘压力，执行前确认空间和影响范围。

## 阅读建议

- 想理解对象分配和 GC，先看 [堆](./heap.md)。
- 遇到 `StackOverflowError`，看 [虚拟机栈](./vm-stack.md)。
- 遇到 `Metaspace`，看 [方法区 / 元空间](./method-area.md)。
- 使用 Netty、NIO、mmap，重点看 [直接内存](./direct-memory.md)。
