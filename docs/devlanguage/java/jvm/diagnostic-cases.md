# JVM 诊断案例

JVM 排查要从现象进入证据，再回到机制。下面这些案例不是参数模板，而是常见线上问题的判断路径。

## 案例一：Java heap space

现象：

```text
java.lang.OutOfMemoryError: Java heap space
```

第一步保留现场：

```bash
jcmd <pid> VM.flags
jcmd <pid> GC.heap_info
jcmd <pid> GC.class_histogram > /tmp/histo.txt
jcmd <pid> GC.heap_dump /tmp/app.hprof
```

判断路径：

1. 看 `-Xmx` 是否和业务容量匹配。
2. 看对象直方图：是少量大对象，还是某类对象数量异常。
3. 用 MAT / JProfiler 看 dominator tree 和 GC Roots。
4. 看引用链是否来自静态集合、缓存、队列、ThreadLocal。
5. 如果 Full GC 后堆不下降，优先怀疑泄漏或容量不足。

修复方向：

- 缓存加容量、过期和淘汰策略。
- 分页或流式处理大批量数据。
- 消费积压时限制队列。
- 清理 ThreadLocal、监听器、静态集合。
- 确认是容量问题后再调大堆。

## 案例二：Full GC 频繁

现象：

- RT 抖动。
- GC 日志频繁出现 Full GC。
- 老年代回收后下降不明显。

先看 GC 日志：

```bash
-Xlog:gc*:file=gc.log:time,uptime,level,tags
```

再看运行指标：

```bash
jstat -gcutil <pid> 1000
jcmd <pid> GC.heap_info
```

判断：

| 观察 | 方向 |
| --- | --- |
| Full GC 后老年代仍高 | 存活对象多、泄漏或容量不足 |
| Young GC 后晋升很快 | 对象生命周期偏长、Survivor 不够 |
| 大对象频繁出现 | 批量数据、大数组、大字符串 |
| Mixed GC 效果差 | G1 老年代回收收益不够 |

处理：

- 先降低对象存活率和大对象分配。
- 检查缓存、队列和批处理。
- G1 场景再根据日志调整停顿目标和堆大小。
- 不要把 `MaxGCPauseMillis` 设置得过低。

## 案例三：Metaspace OOM

现象：

```text
java.lang.OutOfMemoryError: Metaspace
```

采集：

```bash
jcmd <pid> VM.classloader_stats
jcmd <pid> VM.native_memory summary
jcmd <pid> GC.class_histogram | head
```

判断：

- 类加载器数量是否持续增长。
- 动态代理类是否持续生成。
- 热部署后旧 ClassLoader 是否仍被引用。
- 脚本、表达式、模板是否不断生成新类。

修复：

- 动态类生成加缓存和上限。
- 热部署或插件卸载时清理线程、ThreadLocal、静态引用。
- 设置合理的 `MaxMetaspaceSize`。
- 保留 heap dump 分析类加载器引用链。

## 案例四：堆不高但容器 OOM

现象：

- Java 堆使用率不高。
- 容器被 OOMKilled。
- 进程 RSS 持续升高。

先确认：

```bash
jcmd <pid> GC.heap_info
jcmd <pid> VM.flags
ps -o pid,rss,vsz,command -p <pid>
```

如果开启了 NMT：

```bash
jcmd <pid> VM.native_memory summary
```

排查顺序：

```text
直接内存 -> 线程栈 -> 元空间 -> Code Cache -> mmap / native -> JVM 自身
```

修复：

- 设置 `MaxDirectMemorySize` 和 `MaxMetaspaceSize`。
- 控制线程池最大线程数。
- 检查 Netty buffer release。
- 容器内存预算不要只按 `-Xmx` 计算。

## 案例五：CPU 高但 GC 不高

现象：

- CPU 使用率高。
- GC 时间不高。
- RT 上升或吞吐下降。

采集线程栈：

```bash
jcmd <pid> Thread.print > /tmp/thread.txt
top -H -p <pid>
```

把高 CPU 线程 id 转成十六进制，在线程栈里查：

```bash
printf "%x\n" <tid>
```

可能方向：

- 死循环或重试风暴。
- 锁竞争。
- 序列化 / JSON / 正则热点。
- 日志过多。
- 加解密、压缩、图片处理。
- JIT 预热或反优化。

更进一步可抓 JFR：

```bash
jcmd <pid> JFR.start name=profile settings=profile duration=60s filename=/tmp/app.jfr
```

## 案例六：线程数过多

现象：

- 内存上升但堆不高。
- `unable to create native thread`。
- 上下文切换变多。

采集：

```bash
jcmd <pid> Thread.print > /tmp/thread.txt
ps -o nlwp,pid,rss,command -p <pid>
```

判断：

- 是否无限创建线程。
- 线程池最大值是否过大。
- 是否存在阻塞调用导致线程堆积。
- `-Xss` 是否过大。

修复：

- 使用有界线程池和队列。
- 给外部调用设置超时。
- 降低不必要的线程栈大小。
- 拆分 CPU 密集和 I/O 密集线程池。

## 诊断原则

1. 先保存现场，再重启。
2. 先分清堆内、堆外、线程、类加载、GC、CPU。
3. 先看证据，不靠参数模板猜。
4. 先修对象生命周期和容量边界，再调 JVM 参数。
5. 每次只改一个关键变量，用压测或监控验证。

