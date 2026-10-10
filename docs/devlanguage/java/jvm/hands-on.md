# JVM 动手入门路径

理解 JVM 最稳的方式，是先跑一个最小程序，把源码、Class 文件、字节码、类加载、内存和诊断命令串成一条线。下面这条路径不依赖复杂框架，只用 JDK 自带工具就能观察 JVM 的关键行为。

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
java -Xms128m -Xmx128m -XX:+UseG1GC -Xlog:gc*:file=gc.log:time,uptime,level,tags JvmDemo
```

这一步已经涉及 JVM 的完整入口：

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
| `major version` | Class 文件版本，决定运行它至少需要什么 JDK |
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
- `invokespecial`：调用构造方法或私有方法。
- `invokevirtual`：普通虚方法调用。
- `invokedynamic`：运行期动态链接，常见于字符串拼接和 lambda。
- `return`：方法返回。

字节码不是 CPU 指令，而是 JVM 的中间指令。解释器可以直接解释它，JIT 也可以把热点字节码编译成机器码。

## 观察运行中的 JVM

另开一个终端查看 Java 进程：

```bash
jps -l
```

拿到进程号后查看启动命令和参数：

```bash
jcmd <pid> VM.command_line
jcmd <pid> VM.flags
```

查看堆：

```bash
jcmd <pid> GC.heap_info
jstat -gcutil <pid> 1000
```

查看类加载：

```bash
jcmd <pid> VM.classloader_stats
```

查看线程：

```bash
jcmd <pid> Thread.print
```

这些命令分别对应 JVM 的几个维度：

| 命令 | 对应问题 |
| --- | --- |
| `VM.command_line` | 程序如何启动 |
| `VM.flags` | JVM 参数实际是什么 |
| `GC.heap_info` | 堆现在如何划分和使用 |
| `VM.classloader_stats` | 类加载器和类元数据是否异常 |
| `Thread.print` | 线程在执行什么、是否阻塞 |
| `jstat -gcutil` | GC 是否频繁、各区域占用如何变化 |

## 保留现场

排查问题时，不能只看一条错误日志。常见现场包括：

```bash
jcmd <pid> GC.heap_dump /tmp/app.hprof
jcmd <pid> Thread.print > /tmp/thread.txt
jcmd <pid> VM.flags > /tmp/vm-flags.txt
jcmd <pid> VM.command_line > /tmp/vm-command.txt
cp gc.log /tmp/gc.log
```

生产环境抓 heap dump 可能触发停顿，并且文件很大。执行前要确认磁盘空间、业务窗口和影响范围。

## 从现象回到机制

| 现象 | 先收集 | 再回到哪个机制 |
| --- | --- | --- |
| 类找不到 | 启动命令、classpath、依赖包、类加载器统计 | Class 文件、类加载 |
| 方法找不到 | `javap -v`、依赖版本、运行时 jar | 常量池、方法描述符、链接解析 |
| 堆 OOM | heap dump、GC 日志、对象直方图 | 堆、引用链、GC Roots |
| 堆不高但容器 OOM | RSS、NMT、直接内存、线程数 | 直接内存、线程栈、元空间 |
| CPU 高 | 线程栈、JFR、热点方法 | JIT、锁、循环、分配压力 |
| GC 停顿长 | GC 日志、对象存活率、堆大小 | 回收器、对象生命周期、停顿目标 |

这条路径跑通后，再读 Class 文件、类加载、运行时数据区和 GC 页面，会更容易把概念落到实际证据上。

