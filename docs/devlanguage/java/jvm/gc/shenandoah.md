# Shenandoah GC

Shenandoah 是低延迟垃圾回收器，目标是把对象标记、整理和移动尽量并发化，减少堆大小对停顿时间的影响。它和 ZGC 都属于低延迟方向，但实现机制不同。

## 定位

| 维度 | 说明 |
| --- | --- |
| 核心目标 | 极低停顿 |
| 执行方式 | 并发标记、并发整理 |
| 适合场景 | 延迟敏感服务、大堆应用 |
| 关注点 | CPU 开销、写屏障成本、JDK 发行版支持 |

## 工作方式

简化阶段：

```text
初始标记(STW) -> 并发标记 -> 最终标记(STW) -> 并发整理 / 转移 -> 引用更新
```

Shenandoah 的价值在于：对象整理不再完全依赖长时间 STW，因此大堆下停顿更可控。

## 启用

```bash
-XX:+UseShenandoahGC
```

常见配置：

```bash
-Xms8g -Xmx8g
-XX:+UseShenandoahGC
-Xlog:gc*:file=gc.log:time,uptime,level,tags
```

使用前确认当前 JDK 发行版是否支持 Shenandoah。

## 适用判断

适合：

- 长暂停不可接受。
- G1 Mixed / Full GC 停顿超出目标。
- 愿意用一定 CPU 换低延迟。

不适合：

- CPU 已经紧张。
- 主要目标是最大吞吐。
- 所用 JDK 不支持或运维团队不熟悉。

## 排查

重点看：

- 暂停阶段是否仍超标。
- 并发阶段 CPU 开销。
- 回收是否追得上分配。
- 是否出现退化 Full GC。

命令：

```bash
jstat -gcutil <pid> 1000
jcmd <pid> GC.heap_info
```

如果迁移自 G1，要对比同流量下的 P99、P999、CPU、吞吐和 RSS，不只比较平均延迟。
