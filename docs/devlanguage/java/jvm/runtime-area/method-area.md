# 方法区与元空间

方法区是 JVM 规范中的逻辑区域，用于存储类相关信息。HotSpot 在 JDK 8 之后主要用 Metaspace（元空间）实现方法区，元空间使用 native memory，而不是 Java 堆。

## 存放内容

| 内容 | 说明 |
| --- | --- |
| 类元数据 | 类名、父类、接口、字段、方法等结构信息 |
| 运行时常量池 | 字面量和符号引用等运行期常量信息 |
| 静态变量相关信息 | 静态字段元数据和引用关系 |
| JIT 编译相关信息 | 部分编译后的代码和运行期结构 |

注意：方法区不是“存放所有 static 对象的地方”。静态字段引用的对象通常仍在堆中，方法区保存的是类元数据和相关引用信息。

## JDK 版本差异

| 版本 | 实现特点 |
| --- | --- |
| JDK 7 及之前 | HotSpot 使用永久代（PermGen）实现方法区 |
| JDK 8+ | 永久代移除，使用元空间（Metaspace） |

元空间位于 native memory。`-Xmx` 限制不了它，需要用 `MaxMetaspaceSize` 控制上限。

## 常见问题

### Metaspace OOM

现象：

```text
java.lang.OutOfMemoryError: Metaspace
```

常见原因：

- 动态生成类过多，例如代理、字节码增强、表达式编译。
- 热部署或插件系统中类加载器无法释放。
- 应用不断加载新 jar 或脚本。
- `MaxMetaspaceSize` 设置过小。

排查：

```bash
jcmd <pid> VM.classloader_stats
jcmd <pid> GC.class_histogram | head
jcmd <pid> VM.native_memory summary
```

如果类加载器数量持续增加，重点看是否存在类加载器泄漏。

### 类加载器泄漏

典型场景：

- Web 容器热部署后旧 ClassLoader 仍被线程、静态变量、ThreadLocal 持有。
- 插件卸载后仍有全局缓存引用插件类。
- 动态代理类持续生成但没有复用。

排查重点：

```text
ClassLoader -> Class -> static field -> object -> ClassLoader
```

这类问题通常要结合 heap dump 看引用链。

## 参数

```bash
-XX:MetaspaceSize=128m
-XX:MaxMetaspaceSize=512m
```

`MetaspaceSize` 影响触发类卸载和元空间 GC 的初始阈值，`MaxMetaspaceSize` 控制上限。生产环境建议设置上限，避免元空间无限挤占容器内存。

## 观测指标

| 指标 | 含义 |
| --- | --- |
| Loaded Class Count | 当前加载类数量 |
| Total Loaded Class Count | 累计加载类数量 |
| Unloaded Class Count | 已卸载类数量 |
| Metaspace Used | 元空间使用量 |

如果累计加载类持续增长、卸载数量很少，并且元空间上升，需要检查动态类生成和类加载器生命周期。

## 处理建议

- 动态代理、脚本、表达式编译要有缓存和上限。
- 热部署或插件卸载要清理线程、ThreadLocal、监听器、静态缓存。
- 容器环境给元空间设置明确上限。
- 发生 Metaspace OOM 时，同时保留 heap dump 和 classloader 统计。
