# JVM 深入视频系列

这套视频按 JVM 的真实运行链路组织：先把 JVM 放到 Java 程序运行系统里理解，再进入 Class 文件、字节码、类加载、运行时内存、方法调用、对象布局、元空间和垃圾回收。每一集都围绕一个核心问题展开，并和博客正文中的排查路径互相对应。

视频合集：[JVM 深入教程：从运行入口到内存、类加载与 GC 原理](https://www.bilibili.com/video/BV1UaM76XExd)

## 系列主线

```text
Java 源码
  -> Class 文件
  -> 字节码
  -> 类加载
  -> 运行时数据区
  -> 方法调用与对象布局
  -> 元空间与常量池
  -> GC Roots 与回收器
  -> G1 分区回收
```

## 分集目录

| 集数 | 标题 | 核心问题 | 配套阅读 | 视频 |
| --- | --- | --- | --- | --- |
| 01 | JVM 是什么：Java 程序的运行系统 | Java 为什么不是直接跑在操作系统上，JVM 在中间承担什么 | [JVM 概览](./)、[动手入门路径](./hands-on.md) | [观看](https://www.bilibili.com/video/BV1UaM76XExd?p=1) |
| 02 | 从 Java 到 Class 文件 | Class 文件为什么是 JVM 的稳定输入，版本和方法签名如何影响运行 | [Class 文件与字节码](./class-file-bytecode.md) | [观看](https://www.bilibili.com/video/BV1UaM76XExd?p=2) |
| 03 | 字节码如何表达程序 | 操作数栈、局部变量表和字节码指令如何描述方法执行 | [Class 文件与字节码](./class-file-bytecode.md)、[虚拟机栈](./runtime-area/vm-stack.md) | [观看](https://www.bilibili.com/video/BV1UaM76XExd?p=3) |
| 04 | 类加载机制：类型如何进入 JVM | 加载、验证、准备、解析、初始化分别解决什么问题 | [类加载机制](./class-loading.md) | [观看](https://www.bilibili.com/video/BV1UaM76XExd?p=4) |
| 05 | 双亲委派与类隔离 | 为什么类名相同也可能不是同一个类，委派模型如何影响隔离 | [类加载机制](./class-loading.md)、[方法区](./runtime-area/method-area.md) | [观看](https://www.bilibili.com/video/BV1UaM76XExd?p=5) |
| 06 | 运行时内存全景 | 堆、栈、元空间、直接内存分别负责什么 | [运行时数据区](./runtime-area/) | [观看](https://www.bilibili.com/video/BV1UaM76XExd?p=6) |
| 07 | Java 栈与方法调用 | 方法调用如何进入栈帧，栈溢出和线程内存如何产生 | [虚拟机栈](./runtime-area/vm-stack.md) | [观看](https://www.bilibili.com/video/BV1UaM76XExd?p=7) |
| 08 | 对象在堆里怎么存在 | 对象头、实例数据、对齐填充如何影响对象大小 | [对象生命周期](./object-lifecycle.md)、[堆](./runtime-area/heap.md) | [观看](https://www.bilibili.com/video/BV1UaM76XExd?p=8) |
| 09 | 方法区、元空间与常量池 | 类元数据、运行时常量池和动态类为什么会带来元空间压力 | [方法区](./runtime-area/method-area.md) | [观看](https://www.bilibili.com/video/BV1UaM76XExd?p=9) |
| 10 | 垃圾回收从根上理解 | GC Roots 和可达性分析如何决定对象能否回收 | [GC 概述](./gc/) | [观看](https://www.bilibili.com/video/BV1UaM76XExd?p=10) |
| 11 | 主流 GC 怎么选 | Serial、Parallel、G1、ZGC、Shenandoah 如何按场景取舍 | [GC 概述](./gc/) | [观看](https://www.bilibili.com/video/BV1UaM76XExd?p=11) |
| 12 | G1 的工作方式 | Region、Remembered Set、Mixed GC 和停顿目标如何组合 | [G1](./gc/g1.md) | [观看](https://www.bilibili.com/video/BV1UaM76XExd?p=12) |

## 如何配合文字学习

先按分集顺序建立整体链路，再回到文字页查细节。遇到线上问题时，不需要从第一集重新看，可以按现象进入对应页面：

| 现象 | 推荐入口 |
| --- | --- |
| 类找不到、方法找不到、依赖版本冲突 | 第 02-05 集；[Class 文件与字节码](./class-file-bytecode.md)、[类加载机制](./class-loading.md) |
| OOM、容器内存被打满、RSS 异常 | 第 06、08、09 集；[运行时数据区](./runtime-area/) |
| 栈溢出、线程数过多、调用链过深 | 第 07 集；[虚拟机栈](./runtime-area/vm-stack.md) |
| Full GC、停顿过长、吞吐下降 | 第 10-12 集；[GC 概述](./gc/) |
| 需要选择回收器或调整参数 | 第 11-12 集；[GC 选型](./gc/#选型) |
| CPU 高、预热慢、延迟抖动 | [执行引擎与 JIT](./execution-engine-jit.md)、[诊断案例](./diagnostic-cases.md) |

## 需要掌握的闭环

JVM 学习最终要形成一个排查闭环：

1. 先用现象定位方向：类加载、内存、线程、GC、CPU、启动或 native。
2. 再用证据确认位置：GC 日志、线程栈、heap dump、类加载统计、JFR、监控曲线。
3. 然后回到机制解释原因：对象可达性、类加载器边界、栈帧增长、直接内存、回收器策略。
4. 最后再调参数或改代码：先改证据能证明的问题，不复制模板参数。

完整文字路径可以按 [动手入门路径](./hands-on.md) -> [Class 文件与字节码](./class-file-bytecode.md) -> [类加载机制](./class-loading.md) -> [执行引擎与 JIT](./execution-engine-jit.md) -> [对象生命周期](./object-lifecycle.md) -> [诊断案例](./diagnostic-cases.md) 的顺序阅读。
