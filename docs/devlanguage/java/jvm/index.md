# JVM

JVM（Java Virtual Machine）是 Java 程序的运行环境。它把 `.class` 字节码加载到内存中，通过解释执行和即时编译执行代码，并负责线程、内存、垃圾回收、异常、安全校验等运行时能力。

![JVM 整体结构](/jvm/jvm-overview.svg)

## 阅读路径

JVM 内容按问题拆成几组：

- [运行时数据区](./runtime-area/)：理解对象、栈帧、类元数据、直接内存分别放在哪里。
- [GC](./gc/)：理解对象什么时候回收、不同垃圾回收器如何取舍。
- 类加载：理解 `.class` 如何被加载、验证、准备、解析和初始化。
- 执行引擎：理解解释执行、JIT 编译、热点代码优化。

如果目标是排查问题，阅读顺序通常是：

```text
现象 -> 内存区域 -> JVM 参数 -> 观测命令 -> GC / 线程 / 类加载日志
```

## JVM 负责什么

| 能力 | 说明 | 常见排查入口 |
| --- | --- | --- |
| 类加载 | 把字节码变成 JVM 内部可用的类元数据 | `ClassNotFoundException`、类冲突、热部署泄漏 |
| 运行时内存 | 管理堆、栈、方法区、程序计数器等区域 | OOM、栈溢出、元空间增长 |
| 执行引擎 | 解释执行字节码，并对热点代码做 JIT 编译 | 预热慢、CPU 高、性能抖动 |
| 垃圾回收 | 自动识别无用对象并回收内存 | GC 停顿、Full GC、吞吐下降 |
| 本地交互 | 通过 JNI、直接内存、系统调用访问 JVM 外能力 | native 内存泄漏、直接内存 OOM |

## 从源码到运行

Java 程序运行可以拆成几步：

```text
.java -> javac -> .class -> 类加载 -> 运行时数据区 -> 执行引擎 -> 机器指令
```

### 编译

`javac` 把源码编译成字节码。字节码不是机器码，而是一套面向 JVM 的中间指令。

```bash
javac OrderService.java
javap -c OrderService
```

`javap -c` 可以查看字节码，有助于理解方法调用、局部变量、分支和异常表。

### 类加载

类加载大致包含：

| 阶段 | 作用 |
| --- | --- |
| 加载 | 找到 `.class`，读入字节码，生成 Class 元数据 |
| 验证 | 校验字节码安全性和格式合法性 |
| 准备 | 为静态变量分配默认值 |
| 解析 | 把符号引用解析为直接引用 |
| 初始化 | 执行静态变量赋值和静态代码块 |

类的唯一性由“类加载器 + 类全限定名”共同决定，这也是插件化、热部署、容器隔离中经常遇到类冲突的根源。

## 运行时数据区

运行时数据区决定数据放在哪里：

| 区域 | 线程关系 | 主要内容 | 常见异常 |
| --- | --- | --- | --- |
| 堆 | 线程共享 | 对象实例、数组 | `OutOfMemoryError: Java heap space` |
| 方法区 / 元空间 | 线程共享 | 类元数据、常量、方法信息 | `OutOfMemoryError: Metaspace` |
| 虚拟机栈 | 线程私有 | 栈帧、局部变量、操作数栈 | `StackOverflowError` |
| 本地方法栈 | 线程私有 | Native 方法调用栈 | `StackOverflowError`、native OOM |
| 程序计数器 | 线程私有 | 当前线程执行位置 | 很少单独出问题 |
| 直接内存 | 堆外 | NIO、Netty、mmap、JNI 数据 | `OutOfMemoryError: Direct buffer memory` |

内存问题不要只看 `-Xmx`。容器内存、线程数、直接内存、Metaspace、Code Cache 都可能把进程 RSS 撑高。

## GC 关注什么

GC 的核心问题有三个：

1. 哪些对象还活着。
2. 回收哪些区域。
3. 用多少停顿、CPU 和内存换取回收效果。

常见取舍：

| 目标 | 常见选择 |
| --- | --- |
| 小应用、工具进程 | Serial |
| 批处理、吞吐优先 | Parallel |
| 通用服务端 | G1 |
| 极低延迟、大堆 | ZGC / Shenandoah |
| 老系统维护 | CMS / ParNew |

GC 调优先看业务指标，再看 GC 日志。只盯某个参数，容易把问题从停顿转成 CPU 或内存浪费。

## 常用观测命令

```bash
# 查看 Java 进程
jps -l

# 查看 JVM 参数
jcmd <pid> VM.flags
jcmd <pid> VM.command_line

# 查看堆信息
jcmd <pid> GC.heap_info

# 查看类加载统计
jcmd <pid> VM.classloader_stats

# 查看线程栈
jstack <pid>

# 查看 GC 统计
jstat -gcutil <pid> 1000
```

JDK 9+ 推荐使用统一日志：

```bash
-Xlog:gc*:file=gc.log:time,uptime,level,tags
```

## 排查入口

| 现象 | 优先查看 |
| --- | --- |
| `Java heap space` | 堆大小、对象增长、heap dump |
| `Metaspace` | 类加载器数量、动态代理、热部署 |
| `Direct buffer memory` | `MaxDirectMemorySize`、Netty/NIO buffer、进程 RSS |
| `StackOverflowError` | 递归、栈帧大小、`-Xss` |
| Full GC 频繁 | 老年代占用、晋升速度、内存泄漏 |
| GC 停顿过长 | GC 类型、堆大小、对象存活率、日志 |
| CPU 高但 GC 不高 | 线程栈、JIT、锁竞争、业务循环 |

## 使用建议

- 先理解区域边界，再调参数。
- 先抓证据：日志、dump、线程栈、监控曲线。
- GC 参数不要靠模板复制，必须结合堆大小、对象生命周期和延迟目标。
- 容器环境要同时关注 JVM 内存和进程总内存。
- 老版本 JVM 的经验不一定适用于新版本，迁移时要重新压测。
