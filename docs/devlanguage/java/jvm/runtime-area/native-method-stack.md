# 本地方法栈

本地方法栈服务于 native 方法调用。Java 代码通过 JNI 调用 C/C++ 或系统能力时，相关调用现场会进入本地方法栈。大多数 Java 应用不直接操作它，但涉及 JNI、Netty native transport、压缩库、图像处理、加密库时需要关注。

## 概念边界

| 项目 | 说明 |
| --- | --- |
| 线程关系 | 线程私有 |
| 服务对象 | native 方法、JNI 调用 |
| 常见风险 | native 崩溃、堆外内存泄漏、线程栈压力 |
| 常见信号 | `hs_err_pid*.log`、进程崩溃、RSS 增长 |

虚拟机栈服务 Java 方法，本地方法栈服务 native 方法。HotSpot 的具体实现可能把两者结合管理，但理解上可以分开。

## 常见场景

- JNI 手写本地库。
- Netty epoll/kqueue native transport。
- RocksDB、LevelDB、SQLite 等本地存储库。
- 压缩、加密、图像、音视频处理库。
- JNA / Panama 等访问 native 能力的方式。

## 常见问题

### JVM 崩溃

如果进程直接崩溃并生成 `hs_err_pid*.log`，重点看：

- 当前线程。
- Problematic frame。
- native library 路径。
- JVM 参数和系统信息。

示例入口：

```bash
ls hs_err_pid*.log
```

这类问题通常不是普通 Java 异常，可能是 native 库越界、非法内存访问、ABI 不兼容或 JDK bug。

### RSS 增长但堆稳定

native 库可能在堆外分配内存。heap dump 看不到完整 native 分配。

排查：

```bash
jcmd <pid> VM.native_memory summary
ps -o pid,rss,vsz,command -p <pid>
```

NMT 需要启动时打开：

```bash
-XX:NativeMemoryTracking=summary
```

### 线程栈压力

大量线程会带来大量 Java 栈和 native 栈开销。线程数异常时，不要只看堆。

```bash
jcmd <pid> Thread.print
```

## 参数与限制

`-Xss` 通常影响 Java 线程栈大小，也会影响线程可创建数量。native 调用很深或线程很多时，需要结合系统线程限制一起看。

```bash
-Xss1m
```

系统层面还要看：

```bash
ulimit -a
```

## 使用建议

- 能用成熟 Java 库解决的，不轻易引入 JNI。
- 引入 native 库时记录版本、平台、架构和加载路径。
- 对 native 库做压测和崩溃演练。
- 容器内存预算包含 native 分配和线程栈。
- 出现 `hs_err_pid` 时保留现场，不要只重启。
