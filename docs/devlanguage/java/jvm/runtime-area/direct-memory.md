# 直接内存

直接内存不是 Java 虚拟机规范定义的运行时数据区，但它属于 Java 进程实际占用的内存。NIO、Netty、内存映射文件、JNI 都可能使用直接内存。排查线上内存问题时，如果堆不高但进程 RSS 很高，直接内存是重点嫌疑之一。

![直接内存位置](/jvm/direct-memory.svg)

## 概念边界

直接内存通常指 JVM 通过 native 方式在 Java 堆外分配的内存。

| 对比项 | Java 堆 | 直接内存 |
| --- | --- | --- |
| 是否受 `-Xmx` 限制 | 是 | 否 |
| 是否在 heap dump 中完整呈现 | 是 | 通常不完整 |
| 常见使用方 | 普通对象、集合、业务数据 | `DirectByteBuffer`、Netty、mmap、JNI |
| 回收方式 | GC 管理对象 | 依赖引用对象不可达后的清理机制或框架释放 |
| 常见异常 | `Java heap space` | `Direct buffer memory`、RSS 过高 |

`ByteBuffer.allocateDirect()` 创建的是 Java 对象加堆外数据的组合：Java 堆里有一个 DirectByteBuffer 对象，真正的数据区域在堆外。

## 使用场景

### NIO 网络和文件 I/O

直接内存可以减少 Java 堆和 native I/O 缓冲之间的数据复制，适合高吞吐网络和文件读写。

最小示例：

```java
ByteBuffer buffer = ByteBuffer.allocateDirect(1024 * 1024);
```

不要把直接内存理解成“永远更快”。小对象、短生命周期、普通业务数据放到直接内存里，可能只是增加管理成本。

### Netty

Netty 常使用池化直接内存降低分配成本。它的重点不是“每次都新建 DirectByteBuffer”，而是复用 buffer，减少频繁分配和回收。

排查 Netty 直接内存时，重点看：

- 是否启用池化。
- buffer 是否及时 release。
- 是否存在引用计数泄漏。
- 进程 RSS 是否持续增长。

### MappedByteBuffer

`MappedByteBuffer` 把文件映射到内存，适合大文件随机访问。

风险：

- 映射释放时机不直观。
- 文件被映射后在部分系统上删除或覆盖会受影响。
- 大量 mmap 会推高进程地址空间和 RSS。

## 参数与默认行为

限制直接内存：

```bash
-XX:MaxDirectMemorySize=512m
```

如果没有显式配置，实际上限与 JDK 版本、启动参数和实现细节有关。生产环境里建议显式配置，避免堆、直接内存、线程栈一起把容器内存打满。

容器示例：

```bash
java \
  -Xms1g -Xmx1g \
  -XX:MaxDirectMemorySize=512m \
  -XX:MaxMetaspaceSize=256m \
  -jar app.jar
```

## 常见问题

### Direct buffer memory

现象：

```text
java.lang.OutOfMemoryError: Direct buffer memory
```

常见原因：

- 直接内存上限太小。
- DirectByteBuffer 分配过快，GC 来不及触发清理。
- Netty buffer 泄漏。
- mmap 或 JNI 分配没有释放。

处理路径：

1. 查看启动参数是否配置 `MaxDirectMemorySize`。
2. 看进程 RSS 是否持续增长。
3. 如果使用 Netty，打开 leak detector 做验证。
4. 检查是否有无限制创建 direct buffer 或 mmap 的代码。
5. 根据业务峰值调整上限，并压测验证。

### 堆不高但容器 OOM

这种情况通常说明内存不只在堆里。

排查顺序：

```text
堆 -> 直接内存 -> 线程栈 -> 元空间 -> Code Cache -> native / mmap
```

可先收集：

```bash
jcmd <pid> VM.flags
jcmd <pid> GC.heap_info
jcmd <pid> VM.native_memory summary
```

`VM.native_memory` 需要启动时开启 Native Memory Tracking：

```bash
-XX:NativeMemoryTracking=summary
```

NMT 会有一定开销，建议在压测、灰度或问题复现场景中使用。

## 观测方式

### JVM 参数

```bash
jcmd <pid> VM.flags | grep Direct
```

### BufferPoolMXBean

JDK 暴露了 direct 和 mapped buffer 池的使用情况，监控系统可以采集：

```text
java.nio:type=BufferPool,name=direct
java.nio:type=BufferPool,name=mapped
```

重点指标：

- `Count`：buffer 数量。
- `MemoryUsed`：已使用内存。
- `TotalCapacity`：总容量。

### 进程维度

```bash
ps -o pid,rss,vsz,command -p <pid>
```

如果 Java 堆稳定但 RSS 增长，说明要继续查堆外。

## 使用建议

- 高吞吐 I/O 场景使用直接内存，普通业务对象不要滥用。
- 生产环境显式配置 `MaxDirectMemorySize`。
- 使用 Netty 时关注引用计数和 leak detector。
- 容器内存预算要把堆、直接内存、线程栈、元空间一起计算。
- 直接内存问题不要只抓 heap dump，还要看进程内存和 NMT。
