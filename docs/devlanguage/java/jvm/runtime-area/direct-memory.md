# 直接内存

Java 堆之外还有元空间、代码缓存、线程栈、文件映射和 native 库分配。本文把“直接内存”限定为 **NIO direct buffer 的堆外数据区**，并与 mmap、JNI 分开讨论。这样才能回答：谁分配、谁释放、哪个指标看得见、哪个上限管得住。

![直接缓冲区与其他堆外分配的边界](/jvm/direct-memory.svg)

## 一个 buffer 的两部分

`ByteBuffer.allocateDirect()` 返回 Java 堆中的缓冲区对象，其数据放在堆外。在常见 HotSpot 实现中，拥有分配的对象关联清理机制；失去所有相关可达引用后才可能触发清理。`slice()`、`duplicate()` 可以共享同一数据区，因此原变量不再使用，不代表数据已经无人引用。

```java
import java.nio.ByteBuffer;

class DirectBufferDemo {
    public static void main(String[] args) {
        ByteBuffer owner = ByteBuffer.allocateDirect(1024 * 1024);
        owner.putInt(0, 199);
        ByteBuffer view = owner.duplicate();
        System.out.println(view.getInt(0)); // 199：共享同一数据区
    }
}
```

保存为 `DirectBufferDemo.java`，运行 `javac DirectBufferDemo.java`、`java DirectBufferDemo`。它说明共享数据，不演示确定时刻的释放；`ByteBuffer` 没有通用的 `close()`，不能把置空或 `System.gc()` 当作同步释放协议。

对于网络和文件 I/O，direct buffer 可以避免某些路径里 Java 堆缓冲区到 native 临时缓冲区的额外复制，但不等于没有内核复制，更不保证所有大小都更快。小块短命数据反复申请 direct buffer，可能增加分配和清理成本。

## 三种内存不能混算

| 类型 | 管理与限制 | 观察入口 |
| --- | --- | --- |
| JDK NIO direct buffer | JDK direct 容量预算，`MaxDirectMemorySize` | `java.nio` 的 direct BufferPool |
| 文件映射 `MappedByteBuffer` | 文件映射与清理生命周期；不由上述 direct 预算统一限制 | mapped BufferPool、OS 映射 |
| JNI / native allocator | 库自身的创建、释放、池化接口和上限 | 库指标、OS、必要时 native 分配分析 |

Netty 是否走 JDK direct 预算，取决于版本、allocator 与分配路径。池化 `ByteBuf` 的引用计数释放归还的是框架管理的资源，不保证 RSS 立即下降；不能把 `release()` 与 JDK Cleaner 混为同一种协议。排障要同时看 allocator 的活动分配、池保留量和 leak detector，不能只读 direct BufferPool。

`mmap` 首先占用虚拟地址空间，文件页被触碰后才会体现为实际驻留等开销。VSZ、RSS、映射文件大小不是同一指标；“映射了 10 GiB 文件”不意味着立刻使用 10 GiB 物理内存。文件删除与解除映射的行为也受平台影响。

## direct 分配失败怎么查

错误可能是 `OutOfMemoryError: Direct buffer memory`，也可能包含 `Cannot reserve ... direct buffer memory` 及 allocated/limit 信息。先保存完整异常和分配栈，确认实际失败的是 JDK direct 预算，而不是 native 库自己的分配。

```bash
jcmd <pid> VM.flags -all
```

核对 `MaxDirectMemorySize`，再取同一时间窗口的 direct 池 `Count`、`MemoryUsed`、`TotalCapacity`。这三个数分别表示数量、估算内存与总容量，不要求彼此相等；视图也不一定增加底层分配计数。参数为默认值时，不能直接把输出中的 `0` 理解为禁用直接内存，应结合 JDK 实现的默认预算。

订单文件上传突然变大时，若未完成请求长期持有 buffer，可能是并发在途量过高。若流量回落后活动分配仍不回落，则查保留引用和 Netty 引用计数。只有确认合法峰值超过预算后才扩大上限，并重新验证容器余量。

```bash
-XX:MaxDirectMemorySize=512m
```

这只是一项预算示例，不是进程总内存上限，也无法防止绕过该路径的 JNI/native 分配。

## RSS 高但堆稳定

先确认容器终止原因与进程内存趋势，再把 heap、direct/mapped 池、平台线程数、元空间和代码缓存对齐到同一时间轴。NMT 必须启动时启用：

```bash
-XX:NativeMemoryTracking=summary
```

```bash
jcmd <pid> VM.native_memory baseline
# 复现相同负载后比较
jcmd <pid> VM.native_memory summary.diff scale=MB
ps -o pid,rss,vsz,command -p <pid>
```

`ps` 示例适用于常见 Linux/macOS，字段单位以本机手册为准。NMT 跟踪 HotSpot 经其机制记账的分配，不覆盖全部第三方 native malloc 和文件映射，committed 也不等于 RSS。若 NMT 变化小而 RSS 持续增长，应继续查库分配、映射与 allocator 保留，不能据此断言“没有泄漏”。

修复后重复相同文件大小、并发和取消请求：观察活动 buffer 是否归还、请求退出后池的保留量是否稳定、容器峰值是否有余量。heap dump 可辅助查堆中持有者，但无法完整呈现堆外字节内容；native 崩溃与库生命周期见[本地方法栈](./native-method-stack.md)。
