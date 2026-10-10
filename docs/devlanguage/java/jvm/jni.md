# JNI：Java 与 Native 能力的边界

JNI（Java Native Interface）让 Java 代码可以调用 C、C++ 或系统原生能力。它是 JVM 连接操作系统、硬件能力和既有 native 库的一条通道，但也会把内存安全、崩溃、线程栈和资源释放问题带进 Java 进程。

## JNI 解决什么问题

常见使用场景：

| 场景 | 说明 |
| --- | --- |
| 复用已有 C/C++ 库 | 图像处理、压缩、加密、音视频、科学计算 |
| 调用系统能力 | 操作系统 API、驱动、硬件能力 |
| 高性能计算 | 某些热点路径交给 native 库 |
| 框架内部优化 | Netty native transport、压缩库、数据库驱动底层能力 |

JNI 不应该作为普通业务开发的默认选择。能用成熟 Java 库解决时，优先使用 Java 库。

## 基本调用链

```text
Java 方法
  -> native 方法声明
  -> JNI 桥接
  -> C / C++ 函数
  -> native 内存 / 系统调用
  -> 返回 JVM
```

Java 侧示例：

```java
public class NativeHash {
    static {
        System.loadLibrary("nativehash");
    }

    public native int hash(byte[] data);
}
```

`native` 方法没有 Java 方法体，真正实现由动态库提供。

## 内存边界

JNI 最大的风险是内存边界变化：

| Java 世界 | Native 世界 |
| --- | --- |
| GC 管理对象生命周期 | 手动分配和释放内存 |
| 异常可被捕获 | 可能直接崩溃进程 |
| heap dump 能分析对象 | native 内存不完整体现在 heap dump |
| 类型安全较强 | 指针、越界、释放后访问风险更高 |

JNI 分配的 native memory 不受 `-Xmx` 限制。堆不高但 RSS 持续增长时，要考虑 JNI、直接内存、mmap 和线程栈。

## 常见问题

### JVM 崩溃

如果 native 代码段错误，Java 进程可能直接崩溃并生成：

```text
hs_err_pid<pid>.log
```

重点看：

- 崩溃线程。
- native 栈。
- problematic frame。
- 加载的动态库。
- JVM 参数和系统信息。

### native 内存泄漏

现象：

- Java 堆稳定。
- RSS 持续增长。
- heap dump 看不到明显大对象。

采集：

```bash
jcmd <pid> VM.native_memory summary
```

NMT 需要启动时开启：

```bash
-XX:NativeMemoryTracking=summary
```

### 本地引用未释放

JNI 有本地引用和全局引用。全局引用如果不释放，会让 Java 对象一直可达，导致 GC 不能回收。

### 线程模型不清晰

native 线程进入 JVM 前需要正确 attach，退出时要 detach。处理不当可能造成线程资源泄漏或崩溃。

## 和直接内存的关系

JNI、直接内存、mmap 都属于堆外方向。排查时可以按：

```text
Java 堆 -> 直接内存 -> JNI/native -> mmap -> 线程栈 -> Code Cache
```

不要只抓 heap dump。heap dump 看 Java 对象，不能完整解释 native 内存。

## 使用建议

- 优先使用成熟、维护良好的 native 库。
- 明确动态库版本、平台架构和加载路径。
- 对 native 分配建立释放规则。
- 为容器内存预留 native 空间。
- 压测时打开 NMT 或 JFR 观察内存和崩溃风险。
- 出现崩溃时保留 `hs_err_pid*.log`、core dump、启动参数和动态库版本。

JNI 是 JVM 的能力扩展口，也是稳定性边界。使用它时，排查思路必须从 Java 堆扩展到整个进程内存和操作系统层面。
