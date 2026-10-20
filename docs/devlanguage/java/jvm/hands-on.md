# JVM 动手入门路径

先跑一个最小程序，再把源码、Class 文件、字节码、类加载和内存指标对应起来。这条练习使用 **JDK 17 或更新版本的 HotSpot**，不需要 Spring；`record` 语法不能直接交给 JDK 8 编译。编译和诊断尽量使用同一套 JDK，先确认 `java -version` 与 `javac -version`。

![JVM 从字节码到执行与回收的关系](/jvm/jvm-overview.svg)

## 准备一个最小程序

创建 `JvmDemo.java`：

```java
public class JvmDemo {
    private static final String APP_NAME = "jvm-demo";

    public static void main(String[] args) throws Exception {
        User user = new User(1L, "Tom");
        System.out.println(APP_NAME + ":" + user.name());
        Thread.sleep(300_000);
    }

    record User(Long id, String name) {
    }
}
```

编译和运行：

```bash
javac JvmDemo.java
java -Xms128m -Xmx128m -XX:+UseG1GC '-Xlog:gc*:file=gc.log:time,uptime,level,tags' JvmDemo
```

先看到 `jvm-demo:Tom`，随后进程等待五分钟供另一个终端观察。程序会生成 `JvmDemo.class` 和 `JvmDemo$User.class` 两个文件；只复制前者会丢失嵌套类型。显式的 G1 和堆大小只是保证实验口径一致，不是生产参数建议。

可以按下面的关系核对文件和执行入口：

```text
JvmDemo.java -> javac -> JvmDemo.class -> ClassLoader -> main 方法 -> 堆 / 栈 / 方法区 -> GC 日志
```

## 查看 Class 文件

Class 文件是 JVM 真正接收的输入。先看文件版本、常量池和方法结构：

```bash
javap -v JvmDemo
```

重点看几类信息：

| 信息 | 说明 |
| --- | --- |
| `major version` | 类文件目标版本；此例使用 JDK 17 编译时为 61 |
| `constant pool` | 类名、方法名、字段名、字符串字面量、符号引用 |
| `methods` | 方法描述符、访问标记、Code 属性 |
| `LineNumberTable` | 字节码和源码行号的映射 |
| `BootstrapMethods` | lambda、字符串拼接、动态调用相关信息 |

如果遇到 `UnsupportedClassVersionError`，优先看 Class 文件版本和运行时 JDK 版本是否匹配。

## 查看字节码

```bash
javap -c JvmDemo
```

字节码展示方法内部如何执行。可以重点观察：

- `getstatic`：读取静态字段。
- `new`：创建对象。
- `invokespecial`：此例用于构造方法；也用于部分特殊调用，不应把全部私有方法调用都等同于此指令。
- `invokevirtual`：普通虚方法调用。
- `invokedynamic`：运行期动态链接，常见于字符串拼接和 lambda。
- `return`：方法返回。

字节码不是 CPU 指令，而是 JVM 的中间指令。解释器可以执行它，JIT 也可以把热点路径编译成机器码。此例主要在 `sleep`，不能据此观察业务方法被大量 JIT 编译，更不能把运行时间当成性能测试。

## 观察运行中的 JVM

另开一个终端查看 Java 进程：

```bash
jps -l
```

找到主类为 `JvmDemo` 的进程，拿到进程号后查看启动命令和参数。以下 `<pid>` 都要替换成实际数字，不能连尖括号一起粘贴进 shell。诊断工具需与目标进程使用同一操作用户，并能看到相同 PID 空间；容器里的 PID 不一定等于宿主机 PID。

```bash
jcmd <pid> VM.command_line
jcmd <pid> VM.flags
```

查看堆：

```bash
jcmd <pid> GC.heap_info
jstat -gcutil <pid> 1000 5
```

查看类加载：

```bash
jcmd <pid> VM.classloader_stats
```

查看线程：

```bash
jcmd <pid> Thread.print
```

`jstat` 此处采样五次后退出。这个程序分配量很小，未发生 GC 也是正常结果；不能由此证明某个真实服务没有 GC 压力。这些命令分别对应几个维度：

| 命令 | 对应问题 |
| --- | --- |
| `VM.command_line` | 程序如何启动 |
| `VM.flags` | JVM 参数实际是什么 |
| `GC.heap_info` | 堆现在如何划分和使用 |
| `VM.classloader_stats` | 类加载器和类元数据是否异常 |
| `Thread.print` | 线程在执行什么、是否阻塞 |
| `jstat -gcutil` | GC 是否频繁、各区域占用如何变化 |

## 保留现场

先保存低影响的运行配置和线程信息，在当前可写目录使用与 PID 对应的文件名，避免多次采集互相覆盖。下面仍以 `<pid>` 表示待替换位置：

```bash
jcmd <pid> Thread.print > thread-<pid>.txt
jcmd <pid> VM.flags > vm-flags-<pid>.txt
jcmd <pid> VM.command_line > vm-command-<pid>.txt
```

确认需要对象证据后，再执行 `jcmd <pid> GC.heap_dump /absolute/path/app-<pid>.hprof`。路径由目标 JVM 写入，必须在目标文件系统可写；默认 dump 会请求 Full GC，仍可能造成明显停顿，且需要足够磁盘空间。先用 `jcmd <pid> help GC.heap_dump` 核对当前版本选项。dump 可能包含订单、口令和个人数据，不应放入博客静态资源或公开附件。

GC 日志在启动 JVM 时的工作目录中。实验结束后等待五分钟自动退出，或回到运行程序的终端按 `Ctrl+C`；不要保留闲置实验进程。更完整的内存边界见[运行时数据区](./runtime-area/)。

## 从现象回到机制

| 现象 | 先收集 | 再回到哪个机制 |
| --- | --- | --- |
| 类找不到 | 启动命令、classpath、依赖包、类加载器统计 | Class 文件、类加载 |
| 方法找不到 | `javap -v`、依赖版本、运行时 jar | 常量池、方法描述符、链接解析 |
| 堆 OOM | heap dump、GC 日志、对象直方图 | 堆、引用链、GC Roots |
| 堆不高但容器内存超限 | 容器终止原因、RSS、已启用的 NMT、buffer 池、线程数 | 直接内存、线程栈、元空间 |
| CPU 高 | 线程栈、JFR、热点方法 | JIT、锁、循环、分配压力 |
| GC 停顿长 | GC 日志、对象存活率、堆大小 | 回收器、对象生命周期、停顿目标 |

NMT 必须在启动时另加 `-XX:NativeMemoryTracking=summary`，本页默认启动命令没有开启它；没有开启时不能事后补出历史数据。完成练习的标志是：能指出两个 Class 文件、定位 `main` 的字节码、确认实际 G1 参数，并解释为什么静止进程没有频繁 GC。再进入 [Class 文件](./class-file-bytecode.md)、[类加载](./class-loading.md)和 [GC](./gc/) 阅读机制。

