# ParNew GC

ParNew 是 Serial 年轻代收集器的多线程版本，主要出现在 CMS 组合中。它在现代新项目中很少作为主动选型，更多用于理解和维护老系统。

## 定位

| 维度 | 说明 |
| --- | --- |
| 核心目标 | 多线程回收年轻代 |
| 常见组合 | ParNew + CMS |
| 适合场景 | 维护 CMS 老系统 |
| 新项目建议 | 优先评估 G1、ZGC、Shenandoah |

## 工作方式

ParNew 主要处理年轻代 Minor GC：

```text
Eden 满 -> STW -> 多线程复制存活对象到 Survivor / 老年代 -> 恢复应用
```

它比 Serial 更能利用多核 CPU，但仍然是 STW 回收。

## 参数

老系统中可能看到：

```bash
-XX:+UseConcMarkSweepGC
-XX:ParallelGCThreads=8
```

在较新的 JDK 中，CMS 相关参数已经不可用或不建议使用。维护老系统时先确认 JDK 版本，不要把旧参数直接复制到新 JDK。

## 常见问题

### Minor GC 频繁

可能原因：

- Eden 太小。
- 分配速率太高。
- 对象短时间大量创建。

排查：

```bash
jstat -gcutil <pid> 1000
```

### 晋升失败

年轻代对象无法顺利晋升到老年代，可能触发 Full GC。

处理：

- 看老年代剩余空间。
- 检查对象存活率。
- 调整堆或迁移 GC 方案。

## 迁移建议

仍在使用 ParNew + CMS 的系统，建议把迁移评估纳入技术债治理：

- JDK 较老时先评估升级路径。
- 中等延迟服务优先评估 G1。
- 极低延迟服务评估 ZGC 或 Shenandoah。
- 迁移前后用同样流量模型压测 P99、P999、吞吐和 CPU。
