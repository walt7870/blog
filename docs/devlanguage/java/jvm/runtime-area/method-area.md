# 方法区与元空间

方法区是 JVM 规范中的逻辑区域，保存每个类的结构、方法代码、运行时常量池等信息。Metaspace 是 HotSpot 从 JDK 8 起用于保存类元数据的 native 内存实现。两者不能与“所有与类有关的内存”画等号：`Class` 对象和静态字段值、JIT 机器码分别有不同的位置和生命周期。

## 类型信息放在哪里

| 内容 | 现代 HotSpot 中的主要位置 | 观察边界 |
| --- | --- | --- |
| 类结构、字段和方法元数据、字节码、运行时常量池结构 | Metaspace | `MaxMetaspaceSize` 约束类元数据容量 |
| `java.lang.Class` 对象、静态字段值及其引用的普通对象 | Java 堆；静态字段值通常保存在 Class mirror 中 | `static List` 的列表内容不是元空间数据 |
| 被解析或驻留的字符串对象 | Java 堆 | 常量池中的描述结构不等于字符串对象本体 |
| JIT 编译后的机器码 | Code Cache | 看 `Compiler.codecache`，不能靠扩大元空间解决 |

JDK 7 及以前的 HotSpot 使用永久代保存大量类元数据；JDK 8 移除永久代并引入元空间。启用压缩类指针时，还应区分 Compressed Class Space 与其他元空间分配；`Compressed class space` 和 `Metaspace` OOM 的定位不能只看一个汇总数。

## 插件卸载为什么不等于类卸载

插件停止接收任务后，若宿主线程的上下文类加载器或全局监听器仍保留旧插件，旧加载器及其定义的类就仍可能可达。调用 `URLClassLoader.close()` 主要关闭资源，不会强制卸载类。

![插件类加载器的外部保留与卸载边界](/jvm/metaspace-loader-retention.svg)

图中真正需要移除的是**宿主长期存活入口到旧插件的保留关系**。插件对象、类与加载器之间的内部循环本身不能证明泄漏；整个对象群不可达时，循环不会阻止回收。完成清理后也要等待具备类卸载能力且启用相应行为的回收周期，不能承诺下一条语句执行后容量立即下降。

另一个不同原因是表达式服务每次请求都生成新类，却长期保留同一个加载器。这里不一定存在“忘记卸载旧加载器”，而是生成类缺乏复用和数量上限。修复要管理表达式缓存键、生成策略及加载器生命周期。

## 先看趋势，再抓引用

```bash
jcmd <pid> VM.classloader_stats
jstat -class <pid> 1000 10
```

记录相同阶段的当前类数量、卸载数量、加载器数量与 Metaspace Used。累计加载类数只增不减是计数器定义；启动预热时卸载很少也正常。更有价值的信号是：反复加载、停用同一个插件后，旧加载器和当前类数阶梯式上升，并且相关业务已经结束。

如果启动时启用了 `-XX:NativeMemoryTracking=summary`，可比较元空间相关类别：

```bash
jcmd <pid> VM.native_memory baseline
# 重复执行插件加载、停止、清理流程后比较
jcmd <pid> VM.native_memory summary.diff scale=MB
```

需要定位持有者时，再采集 heap dump，检查旧 ClassLoader 到 GC Roots 的路径。dump 看得到加载器、Class mirror 和宿主持有关系，但不是元空间每一块 native 数据的完整镜像。抓取方式和停顿影响见[堆](./heap.md)。

## 参数和处理取舍

```bash
-XX:MetaspaceSize=128m
-XX:MaxMetaspaceSize=512m
```

`MetaspaceSize` 是初始 GC 高水位相关阈值，不表示启动即分配 128 MiB；`MaxMetaspaceSize` 限制类元数据容量。示例值不是通用生产模板：过低会让正常框架加载失败，过高会挤占容器余量。没有显式上限也不等于可无限分配，最终仍受地址空间和系统内存约束。

处理 OOM 时，先区分业务需要的类确实变多、动态生成失控和旧加载器泄漏。修复插件清理后，按原次数重复装卸，核对旧加载器是否不再保留、当前类数与元空间使用是否趋稳；如果只是合法业务类增加，再按测量结果调整容量。不要用扩大 `-Xmx` 处理 Metaspace OOM。
