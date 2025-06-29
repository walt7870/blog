# CMS GC（并发标记清除垃圾回收器）

## 概述

CMS（Concurrent Mark Sweep）GC 是一个以获取最短回收停顿时间为目标的老年代垃圾回收器。它使用并发标记和清除算法，在垃圾回收的大部分时间里，应用线程和 GC 线程可以并发执行，显著减少了停顿时间。CMS GC 通常与 ParNew GC 配合使用，适合对延迟敏感的应用场景。

## 基本特征

### 核心特点

- **并发回收**：大部分 GC 工作与应用线程并发执行
- **低延迟**：专注于减少停顿时间
- **标记-清除**：使用标记-清除算法，不进行内存整理
- **老年代专用**：只负责老年代垃圾回收

### 适用场景

- **延迟敏感应用**：Web 服务器、在线交易系统
- **大内存应用**：堆内存 4GB-32GB
- **高并发服务**：需要快速响应的服务
- **B/S 架构应用**：用户交互频繁的应用

## 组成结构

CMS GC 只负责老年代回收，需要与新生代收集器配合：

### CMS（老年代收集器）

- **算法**：并发标记-清除算法
- **目标**：回收老年代
- **特点**：并发执行、低停顿

### 配合的新生代收集器

- **ParNew GC**：主要配合对象（推荐）
- **Serial GC**：备用选择（不推荐）

## 内存布局

```txt
CMS GC 堆内存布局：
┌─────────────────────────────┬─────────────────────────────┐
│          新生代              │          老年代              │
│ ┌─────┬─────────┬─────────┐ │                             │
│ │Eden │Survivor0│Survivor1│ │        Old Generation       │
│ │     │         │         │ │        (CMS 管理)           │
│ └─────┴─────────┴─────────┘ │                             │
└─────────────────────────────┴─────────────────────────────┘
     ParNew 负责              CMS 负责

内存碎片化问题：
┌─────────────────────────────────────────────────────────────┐
│ [对象A] [空闲] [对象B] [空闲] [对象C] [空闲] [对象D] [空闲]  │
└─────────────────────────────────────────────────────────────┘
  CMS 不进行内存整理，可能产生内存碎片
```

## 工作流程

CMS GC 的回收过程分为四个主要阶段：

### 1. 初始标记（Initial Mark）- STW

```txt
初始标记阶段详细流程：
1. 暂停应用线程：
   - 触发 Stop-The-World
   - 时间很短，通常几毫秒
   
2. 标记 GC Roots：
   - 标记所有 GC Roots 直接引用的对象
   - 标记新生代中引用老年代的对象
   - 不进行深度遍历
   
3. 记录标记信息：
   - 在对象头中设置标记位
   - 初始化并发标记的数据结构
   - 准备并发标记阶段的工作队列
   
4. 恢复应用线程：
   - 解除 STW 状态
   - 应用线程继续执行
   - 开始并发标记阶段
```

### 2. 并发标记（Concurrent Mark）- 并发

```txt
并发标记阶段详细流程：
1. 并发遍历对象图：
   - GC 线程与应用线程并发执行
   - 从初始标记的对象开始深度遍历
   - 标记所有可达的老年代对象
   
2. 处理引用变化：
   - 应用线程可能修改对象引用
   - 使用写屏障记录引用变化
   - 维护修改记录（mod union table）
   
3. 三色标记算法：
   - 白色：未标记的对象（垃圾）
   - 灰色：已标记但未扫描引用的对象
   - 黑色：已标记且已扫描引用的对象
   
4. 处理并发修改：
   - 记录新分配的对象
   - 记录引用关系的变化
   - 为重新标记阶段做准备
```

### 3. 重新标记（Remark）- STW

```txt
重新标记阶段详细流程：
1. 暂停应用线程：
   - 再次触发 Stop-The-World
   - 时间较短，通常几十毫秒
   
2. 处理并发标记期间的变化：
   - 扫描修改记录（mod union table）
   - 处理新分配的对象
   - 修正并发标记期间的遗漏
   
3. 扫描新生代引用：
   - 扫描新生代中指向老年代的引用
   - 确保跨代引用的正确性
   - 可选择在此前进行新生代回收
   
4. 完成最终标记：
   - 确保所有存活对象都被正确标记
   - 准备并发清除阶段
   - 统计垃圾对象信息
   
5. 恢复应用线程：
   - 解除 STW 状态
   - 开始并发清除阶段
```

### 4. 并发清除（Concurrent Sweep）- 并发

```txt
并发清除阶段详细流程：
1. 并发回收垃圾：
   - GC 线程与应用线程并发执行
   - 清除所有未标记的对象
   - 回收内存空间
   
2. 更新空闲列表：
   - 维护空闲内存块列表
   - 合并相邻的空闲块
   - 不进行内存整理
   
3. 处理并发分配：
   - 应用线程可能在老年代分配新对象
   - 新分配的对象默认标记为存活
   - 避免误回收新对象
   
4. 清理标记信息：
   - 清除对象头中的标记位
   - 重置 GC 相关的数据结构
   - 为下一次 GC 做准备
   
5. 统计和报告：
   - 统计回收的内存量
   - 记录 GC 时间信息
   - 更新 GC 性能指标
```

## 算法实现

### CMS 并发标记算法

```java
// CMS 并发标记算法伪代码
public class CMSCollector {
    private final MarkStack markStack;
    private final ModUnionTable modUnionTable;
    private final CardTable cardTable;
    private volatile boolean concurrentMarkingActive;
    
    public void cmsCollection() {
        try {
            // 1. 初始标记阶段
            initialMark();
            
            // 2. 并发标记阶段
            concurrentMark();
            
            // 3. 重新标记阶段
            remark();
            
            // 4. 并发清除阶段
            concurrentSweep();
            
        } catch (ConcurrentModeFailure e) {
            // 并发失败，回退到 Serial Old
            fallbackToSerialOld();
        }
    }
    
    private void initialMark() {
        // STW 阶段
        stopAllApplicationThreads();
        
        try {
            // 清除之前的标记
            clearAllMarks();
            
            // 标记 GC Roots 直接引用的对象
            for (GCRoot root : getGCRoots()) {
                Object obj = root.getObject();
                if (obj != null && obj.inOldGen()) {
                    obj.setMarked(true);
                    markStack.push(obj);
                }
            }
            
            // 标记新生代到老年代的引用
            scanYoungGenReferences();
            
            // 初始化并发标记环境
            concurrentMarkingActive = true;
            modUnionTable.clear();
            
        } finally {
            resumeAllApplicationThreads();
        }
    }
    
    private void concurrentMark() {
        // 并发阶段，与应用线程同时执行
        while (!markStack.isEmpty() && concurrentMarkingActive) {
            Object obj = markStack.pop();
            
            if (obj != null && obj.isMarked()) {
                // 扫描对象的引用
                for (Object ref : obj.getReferences()) {
                    if (ref != null && ref.inOldGen() && !ref.isMarked()) {
                        // 原子性标记
                        if (ref.atomicMark()) {
                            markStack.push(ref);
                        }
                    }
                }
            }
            
            // 检查是否需要让出 CPU
            if (shouldYield()) {
                Thread.yield();
            }
        }
    }
    
    private void remark() {
        // STW 阶段
        stopAllApplicationThreads();
        
        try {
            // 可选：在重新标记前进行新生代回收
            if (shouldScavengeBeforeRemark()) {
                parNewCollector.minorGC();
            }
            
            // 处理并发标记期间的修改
            processModUnionTable();
            
            // 重新扫描新生代引用
            rescanYoungGenReferences();
            
            // 完成剩余的标记工作
            finishMarking();
            
        } finally {
            concurrentMarkingActive = false;
            resumeAllApplicationThreads();
        }
    }
    
    private void concurrentSweep() {
        // 并发阶段，与应用线程同时执行
        FreeList freeList = heap.getOldGenFreeList();
        
        for (Object obj : heap.getOldGenObjects()) {
            if (!obj.isMarked()) {
                // 对象是垃圾，回收它
                Address objAddr = obj.getAddress();
                Size objSize = obj.getSize();
                
                // 清理对象
                obj.finalize();
                
                // 添加到空闲列表
                freeList.addFreeBlock(objAddr, objSize);
                
            } else {
                // 清除标记，为下次 GC 准备
                obj.clearMark();
            }
            
            // 检查是否需要让出 CPU
            if (shouldYield()) {
                Thread.yield();
            }
        }
        
        // 合并相邻的空闲块
        freeList.coalesce();
    }
    
    // 写屏障：记录引用修改
    public void recordReference(Object from, Object to) {
        if (concurrentMarkingActive && from.inOldGen()) {
            modUnionTable.recordModification(from);
        }
    }
}
```

### 三色标记算法

```java
// 三色标记算法实现
public class TriColorMarking {
    private enum Color {
        WHITE,  // 未标记（垃圾）
        GRAY,   // 已标记但未扫描引用
        BLACK   // 已标记且已扫描引用
    }
    
    public void triColorMark() {
        Queue<Object> grayQueue = new ConcurrentLinkedQueue<>();
        
        // 初始化：所有对象为白色
        for (Object obj : heap.getAllObjects()) {
            obj.setColor(Color.WHITE);
        }
        
        // 从 GC Roots 开始，标记为灰色
        for (GCRoot root : getGCRoots()) {
            Object obj = root.getObject();
            if (obj != null) {
                obj.setColor(Color.GRAY);
                grayQueue.offer(obj);
            }
        }
        
        // 处理灰色对象
        while (!grayQueue.isEmpty()) {
            Object obj = grayQueue.poll();
            
            // 扫描对象的引用
            for (Object ref : obj.getReferences()) {
                if (ref != null && ref.getColor() == Color.WHITE) {
                    ref.setColor(Color.GRAY);
                    grayQueue.offer(ref);
                }
            }
            
            // 标记为黑色（已完成扫描）
            obj.setColor(Color.BLACK);
        }
        
        // 白色对象即为垃圾
        for (Object obj : heap.getAllObjects()) {
            if (obj.getColor() == Color.WHITE) {
                // 回收垃圾对象
                recycleObject(obj);
            }
        }
    }
}
```

### 写屏障机制

```java
// CMS 写屏障实现
public class CMSWriteBarrier {
    private final ModUnionTable modUnionTable;
    private final CardTable cardTable;
    
    // 引用写入时的屏障
    public void writeBarrier(Object from, Object to, int fieldOffset) {
        // 原始的引用写入
        from.setReference(fieldOffset, to);
        
        // CMS 写屏障处理
        if (cmsCollector.isConcurrentMarkingActive()) {
            // 记录修改的对象
            modUnionTable.recordModification(from);
            
            // 如果新引用的对象未标记，需要标记
            if (to != null && to.inOldGen() && !to.isMarked()) {
                to.setMarked(true);
                cmsCollector.addToMarkStack(to);
            }
        }
        
        // 跨代引用处理
        if (from.inOldGen() && to != null && to.inYoungGen()) {
            // 标记卡片为脏
            cardTable.markCardDirty(from.getAddress());
        }
    }
    
    // 数组元素写入的屏障
    public void arrayWriteBarrier(Object[] array, int index, Object value) {
        // 原始的数组写入
        array[index] = value;
        
        // 写屏障处理
        writeBarrier(array, value, index * REFERENCE_SIZE);
    }
}
```

## 性能特征

### 优势

1. **低延迟**：
   - 大部分 GC 工作并发执行
   - STW 时间短且可预测
   - 适合延迟敏感应用

2. **高并发**：
   - 应用线程几乎不受 GC 影响
   - 支持高并发访问
   - 响应时间稳定

3. **成熟稳定**：
   - 经过长期验证
   - 在生产环境广泛使用
   - 调优经验丰富

### 劣势

1. **内存碎片**：
   - 不进行内存整理
   - 长期运行可能产生碎片
   - 可能导致分配失败

2. **CPU 开销**：
   - 并发执行消耗 CPU 资源
   - 影响应用程序吞吐量
   - 需要额外的 GC 线程

3. **并发失败**：
   - 并发回收期间老年代可能满
   - 回退到 Serial Old 进行 Full GC
   - 造成长时间停顿

## JVM 参数配置

### 基础参数

```bash
# 启用 CMS GC
-XX:+UseConcMarkSweepGC         # 启用 CMS
-XX:+UseParNewGC                # 新生代使用 ParNew（自动启用）

# 堆内存设置
-Xms4g                          # 初始堆大小
-Xmx16g                         # 最大堆大小

# 新生代设置
-Xmn4g                          # 新生代大小
-XX:NewRatio=3                  # 老年代:新生代 = 3:1
-XX:SurvivorRatio=8             # Eden:Survivor = 8:1
```

### CMS 核心参数

```bash
# 触发条件
-XX:CMSInitiatingOccupancyFraction=70    # 老年代使用率达到 70% 触发
-XX:+UseCMSInitiatingOccupancyOnly       # 只使用设定的阈值

# 并发线程数
-XX:ConcGCThreads=4                      # 并发 GC 线程数
-XX:ParallelGCThreads=8                  # 并行 GC 线程数（STW 阶段）

# 重新标记优化
-XX:+CMSScavengeBeforeRemark             # 重新标记前进行新生代回收
-XX:+CMSParallelRemarkEnabled            # 并行重新标记
```

### 内存管理参数

```bash
# 内存碎片处理
-XX:+UseCMSCompactAtFullCollection       # Full GC 时进行内存整理
-XX:CMSFullGCsBeforeCompaction=5         # 5 次 Full GC 后进行整理

# 大对象处理
-XX:PretenureSizeThreshold=1m            # 大对象直接进入老年代

# 晋升相关
-XX:MaxTenuringThreshold=6               # 最大晋升年龄
-XX:TargetSurvivorRatio=90               # Survivor 目标使用率
```

### 高级参数

```bash
# 增量模式（已废弃）
-XX:+CMSIncrementalMode                  # 启用增量模式（不推荐）
-XX:CMSIncrementalDutyCycle=50           # 增量模式占空比

# 类卸载
-XX:+CMSClassUnloadingEnabled            # 启用类卸载
-XX:+CMSPermGenSweepingEnabled           # 清理永久代（JDK 7）

# 调试参数
-XX:+PrintGCDetails                      # 打印详细 GC 信息
-XX:+PrintCMSStatistics                  # 打印 CMS 统计信息
-XX:+TraceConcurrentGCollection          # 跟踪并发回收
```

## 监控与调优

### 关键指标

1. **并发回收指标**：
   - 并发标记时间
   - 并发清除时间
   - 并发失败次数

2. **停顿时间指标**：
   - 初始标记停顿时间
   - 重新标记停顿时间
   - Full GC 停顿时间

3. **内存指标**：
   - 老年代使用率
   - 内存碎片率
   - 晋升率

### 调优策略

#### 减少并发失败

```bash
# 提前触发 CMS
-XX:CMSInitiatingOccupancyFraction=60

# 增加老年代空间
-Xmx24g

# 减少晋升率
-XX:MaxTenuringThreshold=8
-Xmn6g
```

#### 优化停顿时间

```bash
# 重新标记优化
-XX:+CMSScavengeBeforeRemark
-XX:+CMSParallelRemarkEnabled

# 增加并行线程数
-XX:ParallelGCThreads=12

# 减少新生代大小
-XX:NewRatio=4
```

#### 处理内存碎片

```bash
# 定期整理内存
-XX:+UseCMSCompactAtFullCollection
-XX:CMSFullGCsBeforeCompaction=3

# 大对象处理
-XX:PretenureSizeThreshold=512k

# 监控碎片率
-XX:+PrintFLSStatistics
```

### 监控工具

#### JVM 内置工具

```bash
# 查看 CMS 统计
jstat -gccms <pid> 1s

# 查看 GC 统计
jstat -gc <pid> 1s

# 查看老年代统计
jstat -gcold <pid> 1s

# 查看内存使用
jmap -histo <pid>
```

#### GC 日志分析

```bash
# 启用详细 GC 日志
-XX:+PrintGCDetails \
-XX:+PrintGCTimeStamps \
-XX:+PrintCMSStatistics \
-XX:+PrintPromotionFailure \
-Xloggc:cms-gc.log

# 关注的日志信息：
# - CMS-concurrent-mark: 并发标记时间
# - CMS-concurrent-sweep: 并发清除时间
# - concurrent mode failure: 并发失败
# - promotion failed: 晋升失败
```

## 典型应用场景

### 1. Web 应用服务器

```bash
# 低延迟 Web 服务配置
-XX:+UseConcMarkSweepGC
-Xms8g -Xmx16g
-Xmn4g
-XX:CMSInitiatingOccupancyFraction=70
-XX:+CMSScavengeBeforeRemark
-XX:+CMSParallelRemarkEnabled
-XX:MaxTenuringThreshold=6
```

### 2. 在线交易系统

```bash
# 延迟敏感的交易系统
-XX:+UseConcMarkSweepGC
-Xms16g -Xmx32g
-Xmn8g
-XX:CMSInitiatingOccupancyFraction=60
-XX:ConcGCThreads=8
-XX:+CMSScavengeBeforeRemark
-XX:+UseCMSCompactAtFullCollection
```

### 3. 实时数据处理

```bash
# 实时数据处理服务
-XX:+UseConcMarkSweepGC
-Xms12g -Xmx24g
-Xmn6g
-XX:CMSInitiatingOccupancyFraction=65
-XX:MaxTenuringThreshold=4
-XX:+CMSClassUnloadingEnabled
```

## 与其他 GC 对比

| 特性 | CMS GC | Parallel GC | G1 GC | ZGC |
|------|--------|-------------|-------|-----|
| 停顿时间 | 短 | 长 | 可控 | 极短 |
| 吞吐量 | 中等 | 最高 | 高 | 中等 |
| 内存开销 | 中等 | 低 | 中高 | 高 |
| 内存碎片 | 有 | 无 | 少 | 无 |
| 适用堆大小 | 4GB-32GB | < 32GB | 4GB-64GB | > 64GB |
| 并发程度 | 高 | 无 | 部分 | 高 |
| 复杂度 | 高 | 简单 | 中等 | 高 |

## 最佳实践

### 1. 选择标准

- **延迟敏感**：响应时间要求 < 100ms
- **中等内存**：堆大小 4GB-32GB
- **高并发**：大量并发请求
- **稳定负载**：负载相对稳定的应用

### 2. 配置建议

- **合理设置触发阈值**：避免并发失败
- **优化新生代配置**：减少晋升率
- **启用重新标记优化**：减少停顿时间
- **监控内存碎片**：定期进行内存整理

### 3. 注意事项

- **避免频繁 Full GC**：调整触发时机
- **关注 CPU 使用率**：并发回收消耗 CPU
- **监控并发失败**：及时调整参数
- **定期性能测试**：验证调优效果

### 4. 迁移建议

- **从 Parallel GC 迁移**：当延迟成为瓶颈时
- **迁移到 G1 GC**：当内存超过 32GB 时
- **迁移到 ZGC**：当需要极低延迟时

## 故障排查

### 常见问题

1. **并发失败（Concurrent Mode Failure）**：

   ```
   原因：并发回收期间老年代空间不足
   解决：
   - 降低触发阈值
   - 增加老年代空间
   - 减少晋升率
   ```

2. **晋升失败（Promotion Failed）**：

   ```
   原因：老年代碎片导致大对象分配失败
   解决：
   - 启用内存整理
   - 调整大对象阈值
   - 增加老年代空间
   ```

3. **重新标记时间过长**：

   ```
   原因：新生代对象过多或引用复杂
   解决：
   - 启用重新标记前新生代回收
   - 增加并行线程数
   - 减少新生代大小
   ```

### 诊断工具

```bash
# 分析 GC 日志
-XX:+PrintGCDetails \
-XX:+PrintGCCause \
-XX:+PrintCMSStatistics

# 监控内存使用
jstat -gccms <pid> 1s

# 分析内存碎片
-XX:+PrintFLSStatistics

# 生成堆转储
jmap -dump:format=b,file=heap.hprof <pid>
```

## 发展历程与现状

### 历史地位

- **JDK 1.4**：首次引入 CMS GC
- **JDK 6-8**：成为低延迟应用的首选
- **JDK 9**：被标记为废弃（Deprecated）
- **JDK 14**：正式移除

### 替代方案

- **G1 GC**：JDK 9+ 的默认选择
- **ZGC**：超低延迟需求
- **Shenandoah GC**：另一个低延迟选择

## 总结

CMS GC 作为第一个真正意义上的并发垃圾回收器，在低延迟垃圾回收领域具有重要的历史地位。它通过并发标记和清除算法，显著减少了应用程序的停顿时间，为延迟敏感的应用提供了重要支持。虽然 CMS GC 已经被废弃，但理解其工作原理和调优方法，对于理解现代垃圾回收器的发展脉络和掌握 JVM 调优技术仍然具有重要意义。在维护现有使用 CMS GC 的系统时，本文提供的知识和经验仍然非常有价值。
