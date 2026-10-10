# 现代 JVM 发展

JVM 不是停留在早期 Java 时代的运行环境。近几个长期支持版本里，JVM 在 GC、容器感知、可观测性、启动性能、低延迟和云原生部署上都发生了明显变化。

## 版本脉络

| 版本 | 重要方向 |
| --- | --- |
| JDK 8 | Lambda、Metaspace、G1 可用性提升 |
| JDK 9 | 模块化、统一 GC 日志、JShell、G1 成为默认 GC |
| JDK 11 | 长期支持版本，ZGC 实验引入，容器支持继续完善 |
| JDK 17 | 长期支持版本，ZGC / Shenandoah 成熟度提升，强封装推进 |
| JDK 21 | 长期支持版本，虚拟线程正式可用，ZGC 分代能力进入主线 |

项目选型时，不只看语言语法，也要看 JVM 能力：GC、容器识别、诊断工具、框架兼容性和部署方式都会受 JDK 版本影响。

## G1 默认化

JDK 9 之后，G1 成为服务端默认 GC。它的核心价值是：

- Region 分区管理。
- 以停顿目标为导向选择回收集合。
- 用 Mixed GC 回收部分老年代。
- 在吞吐和延迟之间提供较均衡的默认表现。

这也是现代普通服务端应用常先从 G1 基线开始的原因。

## ZGC 与 Shenandoah

ZGC 和 Shenandoah 面向低延迟，目标是把大部分回收工作并发化。

| 回收器 | 核心方向 |
| --- | --- |
| ZGC | colored pointer、load barrier、低停顿、大堆 |
| Shenandoah | 并发整理、读写屏障、低停顿 |

低延迟回收器不是“无成本更快”。它们可能使用更多 CPU、更多元数据或牺牲部分吞吐。适用场景通常是对 P99 / P999 停顿敏感的服务。

## 容器感知

早期 Java 进程容易把宿主机资源误认为可用资源，导致容器里内存和 CPU 判断失真。现代 JDK 对 cgroup 支持更好，可以识别容器限制。

常见参数：

```bash
-XX:InitialRAMPercentage=50
-XX:MaxRAMPercentage=70
```

容器部署时要关注：

- 堆不是进程总内存。
- 直接内存、线程栈、元空间、Code Cache 都占 RSS。
- 容器 OOMKilled 和 JVM 自己抛 OOM 是两类问题。
- CPU quota 会影响 GC 线程和业务线程调度。

## JFR 和诊断能力

JFR（Java Flight Recorder）已经成为现代 JVM 诊断的重要工具。它能以较低开销记录：

- CPU 热点。
- 分配热点。
- GC 停顿。
- 锁竞争。
- 线程阻塞。
- 文件和网络 I/O。

启动一次 60 秒采样：

```bash
jcmd <pid> JFR.start name=profile settings=profile duration=60s filename=/tmp/app.jfr
```

相比单次线程栈，JFR 更适合看一段时间内的行为。

## CDS 与启动优化

CDS（Class Data Sharing）把部分类元数据预先归档，让多个 JVM 进程共享，提高启动速度并降低内存占用。

适合场景：

- 命令行工具。
- Serverless / 短生命周期服务。
- 容器频繁扩缩容。
- 启动速度敏感的微服务。

框架侧也会配合做 AOT、索引、预计算和反射配置收敛。

## 虚拟线程

JDK 21 中虚拟线程正式可用。它解决的是“阻塞式代码和大量并发任务之间的线程成本问题”。

虚拟线程适合：

- 大量 I/O 等待。
- 请求-响应模型。
- 希望保留同步代码风格的服务。

不适合把 CPU 密集任务无限并发化。CPU 仍然是有限资源，虚拟线程降低的是线程创建和阻塞成本，不是让计算免费。

## GraalVM 与 Native Image

GraalVM 提供 JIT 编译器和 Native Image 能力。Native Image 可以把 Java 应用提前编译成本地可执行文件。

优势：

- 启动快。
- 内存占用低。
- 适合短生命周期和云原生场景。

代价：

- 反射、动态代理、JNI、资源加载需要配置。
- 运行期动态性受限。
- 峰值性能和传统 JVM 不一定相同。

传统 JVM 和 Native Image 不是替代关系，而是不同部署模型。

## 选型建议

| 目标 | 优先关注 |
| --- | --- |
| 稳定服务端 | JDK 17 / 21、G1、JFR、统一日志 |
| 低延迟 | ZGC / Shenandoah、对象生命周期、P99 / P999 |
| 容器部署 | cgroup、RAMPercentage、RSS 预算 |
| 快速启动 | CDS、AOT、框架启动优化、Native Image |
| 高并发 I/O | 虚拟线程、连接池、超时控制 |

现代 JVM 学习不能只停在“堆、栈、GC”。真正落地时，还要把 JDK 版本、容器限制、诊断工具、部署模型和业务延迟目标放在一起看。

