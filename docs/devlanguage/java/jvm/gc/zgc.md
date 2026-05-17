# ZGC

ZGC 是低延迟垃圾回收器，目标是在大堆场景下把 GC 停顿控制在很短范围内。它通过并发标记、并发转移、读屏障和着色指针等机制，让大部分回收工作与应用线程并发执行。

## 定位

| 维度 | 说明 |
| --- | --- |
| 核心目标 | 极低停顿 |
| 执行方式 | 大部分阶段并发 |
| 适合场景 | 延迟敏感、大堆服务 |
| 主要代价 | 更多并发 CPU 开销、吞吐可能下降 |

## 工作方式

简化理解：

```text
短暂停顿扫描 Roots -> 并发标记 -> 短暂停顿修正 -> 并发转移对象 -> 应用继续运行
```

ZGC 的关键不是“没有 GC”，而是把长时间工作并发化，缩短必须暂停应用的阶段。

## 启用

```bash
-XX:+UseZGC
```

常见配置：

```bash
-Xms8g -Xmx8g
-XX:+UseZGC
-Xlog:gc*:file=gc.log:time,uptime,level,tags
```

如果使用支持分代 ZGC 的 JDK，可按压测结果评估分代模式。不要只因为参数新就直接上线。

## 适用判断

适合：

- 对 P99/P999 停顿非常敏感。
- 堆较大，G1 停顿无法满足。
- CPU 资源有余量。

不适合：

- 极致吞吐优先。
- CPU 已经长期接近瓶颈。
- 小堆应用，复杂回收器收益不明显。

## 排查

关注：

- GC 暂停是否满足延迟目标。
- 并发 GC 是否占用过多 CPU。
- 分配速率是否高于回收能力。
- 进程 RSS 是否符合预期。

命令：

```bash
jstat -gcutil <pid> 1000
jcmd <pid> GC.heap_info
```

日志重点：

- Pause Mark Start / End。
- Concurrent Mark。
- Concurrent Relocation。
- Allocation Stall。

出现 Allocation Stall 时，说明应用分配速度和 ZGC 回收进度之间出现压力，需要看堆大小、分配速率和 CPU。
