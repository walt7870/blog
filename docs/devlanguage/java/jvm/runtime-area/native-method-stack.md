# 本地方法栈

本地方法栈是 native 调用现场的逻辑概念。HotSpot 的平台线程通常使用同一个 OS 栈承载 Java 和 native 帧，不能在容量预算里机械地为每个线程再加一份独立“本地栈”。JNI、压缩、图像、音视频和 native 存储库还会在栈之外分配堆外数据，那是另一条生命周期。

![JNI 调用现场与 native 资源生命周期](/jvm/native-call-resources.svg)

## 调用结束不等于资源释放

以音频解码为例：Java 方法调用 native `decode`，C/C++ 函数的临时变量随调用现场退出；但库创建的解码器句柄、模型缓存、native 工作线程可以跨多次调用保留。只有按库合同执行销毁、停止工作和释放，才能结束这些资源的生命周期。

Java 包装对象不可达，不保证库立即销毁句柄。成熟封装一般提供 `close()` 等确定的释放入口；使用 `try-with-resources` 的前提是该类确实实现 `AutoCloseable`，不能给未知 SDK 凭空假设接口。Cleaner 只能按库设计承担兜底，不能替代请求成功、失败、取消和关闭路径的清理。

JNI 回调还要遵守引用与线程合同：跨调用保留 Java 对象通常需要 global reference，并在结束时删除；native 创建的线程附加 JVM 后也要按合同分离。局部引用不是跨线程可随意缓存的句柄。详见[JNI](../jni.md)。JDK 22 正式提供的 Foreign Function & Memory API 使用不同的访问接口和 Arena 生命周期，也不能与 JNI 当作同一套释放协议。

## 先区分三类故障

| 信号 | 先找什么 | 不足以证明什么 |
| --- | --- | --- |
| `UnsatisfiedLinkError` | 库名、加载路径、依赖库、CPU 架构、符号签名 | 不一定已经进入 native 方法，更不是必然栈溢出 |
| 致命崩溃，产生 `hs_err_pid*.log` | Current thread、Problematic frame、native 库、完整栈 | 最后崩溃的库不一定是最早破坏内存的地方 |
| RSS 上升但堆稳定 | 库的活动句柄、分配、映射、线程、OS 指标 | heap dump 或 NMT 稳定不能排除 native 泄漏 |

`hs_err` 是定位入口，可能需要 core、对应符号和相同版本库继续分析。记录 JDK、库版本、平台、架构、输入大小与并发条件，保留首次失败现场。完整日志常含路径、参数和环境信息，对外共享前应检查内容。

## NMT 能看什么

启动时加入 `-XX:NativeMemoryTracking=summary` 后，才能执行：

```bash
jcmd <pid> VM.native_memory baseline
# 重复创建、使用、关闭 native 资源后比较
jcmd <pid> VM.native_memory summary.diff scale=MB
ps -o pid,rss,vsz,command -p <pid>
```

NMT 记录 HotSpot 记账范围，不能完整跟踪第三方库直接调用的 `malloc`、`mmap` 等。若 RSS 增长而 NMT 没有对应增长，继续检查库 allocator、缓存保留和映射，必要时在复现环境使用 native 分配分析工具。RSS 没有立即下降也可能来自 allocator 缓存，不能只凭单个数认定泄漏。

## 栈、线程与关闭验证

`-Xss` 主要用于 JVM 创建的平台线程栈配置；native 库自己创建线程时，栈大小与数量可能由库和 OS 控制。深层 C/C++ 递归、越界写栈也可能使进程直接崩溃，不能承诺都转成可捕获的 Java `StackOverflowError`。

```bash
jcmd <pid> Thread.print
```

线程 dump 能看到部分 JNI 边界和阻塞，完整 native 调用链可能还需要平台调试器及符号。对音频解码器，验收应覆盖重复创建/关闭、错误输入、超时取消、并发调用和进程退出：检查句柄是否归零、后台线程是否停止、内存是否在稳定池容量内。只跑一次成功调用，不能验证长期资源管理。
