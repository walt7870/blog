# ParNew GC（并行新生代垃圾回收器）

## 概述

ParNew GC 是 Serial GC 的多线程版本，专门用于新生代垃圾回收。它是 CMS GC 的默认新生代收集器，也是唯一能与 CMS 老年代收集器配合工作的新生代收集器。ParNew 在多核环境下相比 Serial GC 有显著的性能提升，是并发收集的重要组成部分。

## 基本特征

### 核心特点

- **多线程并行**：使用多个线程同时进行新生代垃圾回收
- **Stop-The-World**：回收期间暂停所有应用线程
- **CMS 兼容**：专为与 CMS 老年代收集器配合设计
- **复制算法**：采用复制算法进行新生代回收

### 适用场景

- **与 CMS 配合**：作为 CMS 的新生代收集器
- **多核环境**：充分利用多核 CPU 优势
- **延迟敏感应用**：配合 CMS 实现低延迟
- **服务器应用**：替代 Serial GC 提升性能

## 组成结构

ParNew GC 只负责新生代回收：

### ParNew（新生代收集器）

- **算法**：复制算法
- **目标**：回收新生代（Eden + Survivor）
- **特点**：多线程并行、与 CMS 兼容

### 配合的老年代收集器

- **CMS GC**：主要配合对象
- **Serial Old**：备用选择（不推荐）

## 内存布局

```txt
ParNew GC 堆内存布局：
┌─────────────────────────────┬─────────────────────────────┐
│          新生代              │          老年代              │
│ ┌─────┬─────────┬─────────┐ │                             │
│ │Eden │Survivor0│Survivor1│ │        Old Generation       │
│ │ 8:1 │   1:1   │   1:1   │ │        (CMS 管理)           │
│ └─────┴─────────┴─────────┘ │                             │
└─────────────────────────────┴─────────────────────────────┘
     ParNew 负责              CMS 负责

多线程工作模式：
┌─────────┬─────────┬─────────┬─────────┐
│Thread 1 │Thread 2 │Thread 3 │Thread 4 │
│ParNew   │ParNew   │ParNew   │ParNew   │
│Worker   │Worker   │Worker   │Worker   │
└─────────┴─────────┴─────────┴─────────┘
```

## 工作流程

### Minor GC 详细流程

```txt
ParNew Minor GC 详细流程：
1. 触发条件检查：
   - Eden 区域空间不足
   - 新对象分配失败
   - 达到分配速率阈值
   
2. 线程协调准备：
   - 确定 ParNew 线程数量
   - 分配工作区域和任务
   - 初始化线程同步机制
   
3. STW 暂停：
   - 暂停所有应用线程
   - 等待所有线程到达安全点
   - 确保堆状态一致性
   
4. 并行根扫描：
   - 多线程并行扫描 GC Roots
   - 每个线程处理不同的根集合
   - 标记直接可达的新生代对象
   
5. 并行复制处理：
   - 将工作区域分配给不同线程
   - 并行复制存活对象到目标 Survivor
   - 线程间协调避免冲突和重复工作
   
6. 跨代引用处理：
   - 处理老年代到新生代的引用
   - 使用 Card Table 优化扫描
   - 确保引用一致性
   
7. 对象晋升处理：
   - 检查对象年龄和大小
   - 符合条件的对象晋升到老年代
   - 与 CMS 协调晋升操作
   
8. 空间清理：
   - 并行清空 Eden 区域
   - 清空源 Survivor 区域
   - 交换 Survivor0 和 Survivor1 角色
   
9. 线程同步完成：
   - 等待所有 ParNew 线程完成
   - 更新内存指针和统计信息
   - 与 CMS 同步状态
   
10. 恢复应用线程：
    - 解除 STW 状态
    - 应用线程继续执行
    - 触发 CMS 并发回收（如需要）
```

### 与 CMS 的协调机制

```txt
ParNew 与 CMS 协调流程：
1. 晋升空间检查：
   - 检查老年代可用空间
   - 预估晋升对象大小
   - 确保有足够空间接收晋升对象
   
2. 并发标记协调：
   - 如果 CMS 正在并发标记
   - ParNew 需要配合更新标记信息
   - 确保标记的一致性
   
3. 重新标记准备：
   - 为 CMS 重新标记阶段做准备
   - 记录新生代到老年代的引用变化
   - 维护 Card Table 状态
   
4. 失败处理：
   - 如果晋升失败（老年代空间不足）
   - 触发 CMS 的 Full GC
   - 或者触发 Serial Old 回收
```

## 算法实现

### ParNew 并行复制算法

```java
// ParNew GC 并行复制算法伪代码
public class ParNewGC {
    private final int parNewThreadCount;
    private final WorkStealingQueue[] workQueues;
    private final CyclicBarrier barrier;
    private final CMSCollector cmsCollector;
    
    public void parNewMinorGC() {
        // 1. 与 CMS 协调检查
        if (!cmsCollector.canAcceptPromotion()) {
            // 老年代空间不足，触发 CMS 回收
            cmsCollector.triggerCollection();
            return;
        }
        
        // 2. STW 暂停
        stopAllApplicationThreads();
        
        try {
            // 3. 初始化并行环境
            initializeParNewEnvironment();
            
            // 4. 启动 ParNew 工作线程
            CountDownLatch latch = new CountDownLatch(parNewThreadCount);
            for (int i = 0; i < parNewThreadCount; i++) {
                final int threadId = i;
                parNewThreadPool.submit(() -> {
                    try {
                        parNewWorker(threadId);
                    } finally {
                        latch.countDown();
                    }
                });
            }
            
            // 5. 等待所有线程完成
            latch.await();
            
            // 6. 与 CMS 同步状态
            synchronizeWithCMS();
            
        } finally {
            // 7. 恢复应用线程
            resumeAllApplicationThreads();
        }
    }
    
    private void parNewWorker(int threadId) {
        Space toSpace = getToSpace();
        WorkStealingQueue myQueue = workQueues[threadId];
        
        // 处理分配给当前线程的 GC Roots
        List<GCRoot> myRoots = partitionGCRoots(threadId);
        for (GCRoot root : myRoots) {
            if (root.pointsToYoungGen()) {
                Object newObj = copyObjectWithCMSCoordination(
                    root.getObject(), toSpace, myQueue);
                root.updateReference(newObj);
            }
        }
        
        // 处理跨代引用（Card Table）
        processCardTable(threadId, toSpace, myQueue);
        
        // 处理工作队列中的对象
        processWorkQueue(myQueue, toSpace);
        
        // 工作窃取：帮助其他线程完成工作
        workStealing(toSpace);
        
        // 同步点：等待所有线程完成
        barrier.await();
    }
    
    private Object copyObjectWithCMSCoordination(Object obj, Space toSpace, 
                                                 WorkStealingQueue queue) {
        if (obj.isForwarded()) {
            return obj.getForwardingPointer();
        }
        
        // 检查是否需要晋升
        if (shouldPromote(obj)) {
            return promoteToOldGenWithCMS(obj);
        }
        
        // 原子性分配新空间
        Object newObj = toSpace.atomicAllocate(obj.size());
        if (newObj == null) {
            // Survivor 空间不足，直接晋升
            return promoteToOldGenWithCMS(obj);
        }
        
        // 复制对象数据
        copyObjectData(obj, newObj);
        obj.setForwardingPointer(newObj);
        newObj.incrementAge();
        
        // 处理对象引用
        for (Object ref : obj.getReferences()) {
            if (ref != null) {
                if (ref.inYoungGen()) {
                    queue.push(ref);
                } else if (ref.inOldGen()) {
                    // 记录新生代到老年代的引用
                    recordCrossGenerationReference(newObj, ref);
                }
            }
        }
        
        return newObj;
    }
    
    private Object promoteToOldGenWithCMS(Object obj) {
        // 与 CMS 协调晋升
        Object promotedObj = cmsCollector.promoteObject(obj);
        
        if (promotedObj == null) {
            // 晋升失败，触发 Full GC
            throw new PromotionFailedException("Old generation full");
        }
        
        // 如果 CMS 正在并发标记，需要标记新晋升的对象
        if (cmsCollector.isConcurrentMarkingActive()) {
            cmsCollector.markPromotedObject(promotedObj);
        }
        
        return promotedObj;
    }
    
    private void processCardTable(int threadId, Space toSpace, 
                                 WorkStealingQueue queue) {
        // 处理分配给当前线程的 Card Table 条目
        CardTable cardTable = heap.getCardTable();
        List<Card> myCards = partitionCards(threadId);
        
        for (Card card : myCards) {
            if (card.isDirty()) {
                // 扫描该卡片对应的老年代区域
                for (Object oldObj : card.getObjects()) {
                    for (Object ref : oldObj.getReferences()) {
                        if (ref != null && ref.inYoungGen()) {
                            queue.push(ref);
                        }
                    }
                }
                card.clean();
            }
        }
    }
    
    private void synchronizeWithCMS() {
        // 更新 CMS 相关的数据结构
        cmsCollector.updateAfterYoungGC();
        
        // 检查是否需要触发 CMS 并发回收
        if (cmsCollector.shouldStartConcurrentCycle()) {
            cmsCollector.startConcurrentCollection();
        }
    }
}
```

### Card Table 处理机制

```java
// Card Table 处理算法伪代码
public class CardTableProcessor {
    private static final int CARD_SIZE = 512; // 每个卡片 512 字节
    
    public void processCardTableInParallel(int threadId) {
        CardTable cardTable = heap.getCardTable();
        
        // 计算当前线程负责的卡片范围
        int totalCards = cardTable.getCardCount();
        int cardsPerThread = totalCards / parNewThreadCount;
        int startCard = threadId * cardsPerThread;
        int endCard = (threadId == parNewThreadCount - 1) ? 
                      totalCards : (threadId + 1) * cardsPerThread;
        
        // 处理分配的卡片
        for (int cardIndex = startCard; cardIndex < endCard; cardIndex++) {
            Card card = cardTable.getCard(cardIndex);
            
            if (card.isDirty()) {
                processCard(card);
                card.clean();
            }
        }
    }
    
    private void processCard(Card card) {
        Address startAddr = card.getStartAddress();
        Address endAddr = card.getEndAddress();
        
        // 扫描卡片对应的内存区域
        for (Address addr = startAddr; addr < endAddr; addr += WORD_SIZE) {
            Object obj = getObjectAt(addr);
            if (obj != null && obj.isInOldGen()) {
                // 检查该老年代对象的引用
                for (Reference ref : obj.getReferences()) {
                    Object target = ref.getTarget();
                    if (target != null && target.inYoungGen()) {
                        // 找到老年代到新生代的引用
                        addToWorkQueue(target);
                    }
                }
            }
        }
    }
}
```

## 性能特征

### 优势

1. **多核性能提升**：
   - 相比 Serial GC 有显著性能提升
   - 充分利用多核 CPU 资源
   - 减少新生代回收时间

2. **CMS 兼容性**：
   - 与 CMS 完美配合
   - 支持低延迟垃圾回收
   - 维护跨代引用一致性

3. **成熟稳定**：
   - 经过长期验证
   - 算法相对简单
   - 行为可预测

### 劣势

1. **线程开销**：
   - 多线程协调有开销
   - 在单核或双核环境下可能不如 Serial GC
   - 存在线程切换成本

2. **依赖性强**：
   - 主要为 CMS 设计
   - 与其他老年代收集器配合效果一般
   - 功能相对单一

3. **停顿时间**：
   - 仍然是 STW 收集器
   - 停顿时间与新生代大小相关
   - 不适合超大新生代

## JVM 参数配置

### 基础参数

```bash
# 启用 ParNew GC（通常与 CMS 一起使用）
-XX:+UseConcMarkSweepGC         # 启用 CMS，自动启用 ParNew
-XX:+UseParNewGC                # 显式启用 ParNew（已废弃）

# 堆内存设置
-Xms2g                          # 初始堆大小
-Xmx8g                          # 最大堆大小

# 新生代设置
-Xmn2g                          # 新生代大小
-XX:NewRatio=3                  # 老年代:新生代 = 3:1
-XX:SurvivorRatio=8             # Eden:Survivor = 8:1
```

### 线程配置

```bash
# ParNew 线程数设置
-XX:ParallelGCThreads=8         # ParNew 线程数

# 自动计算线程数（推荐）
# CPU <= 8: ParallelGCThreads = CPU 核数
# CPU > 8: ParallelGCThreads = 8 + (CPU - 8) * 5/8
```

### 与 CMS 配合参数

```bash
# CMS 相关参数
-XX:+UseConcMarkSweepGC         # 启用 CMS
-XX:CMSInitiatingOccupancyFraction=70  # CMS 触发阈值
-XX:+UseCMSInitiatingOccupancyOnly     # 只使用设定阈值

# 晋升相关
-XX:MaxTenuringThreshold=6      # 降低晋升年龄
-XX:TargetSurvivorRatio=90      # Survivor 目标使用率
-XX:PretenureSizeThreshold=1m   # 大对象直接晋升阈值
```

### 优化参数

```bash
# 内存管理
-XX:+CMSScavengeBeforeRemark    # 重新标记前进行新生代回收
-XX:+CMSParallelRemarkEnabled   # 并行重新标记

# Card Table 优化
-XX:+UseCondCardMark            # 条件卡片标记

# 调试参数
-XX:+PrintGC                    # 打印 GC 信息
-XX:+PrintGCDetails             # 打印详细 GC 信息
-XX:+PrintGCTimeStamps          # 打印时间戳
```

## 监控与调优

### 关键指标

1. **新生代回收指标**：
   - Minor GC 频率
   - Minor GC 停顿时间
   - 新生代回收效率

2. **晋升指标**：
   - 晋升率
   - 晋升失败次数
   - 平均对象年龄

3. **与 CMS 协调指标**：
   - CMS 触发频率
   - 并发失败次数
   - Full GC 频率

### 调优策略

#### 优化新生代回收

```bash
# 调整新生代大小
-Xmn3g                          # 增加新生代

# 优化 Survivor 配置
-XX:SurvivorRatio=6             # 增加 Survivor 空间
-XX:TargetSurvivorRatio=80      # 降低目标使用率

# 调整晋升策略
-XX:MaxTenuringThreshold=4      # 降低晋升年龄
```

#### 优化与 CMS 配合

```bash
# 提前触发 CMS
-XX:CMSInitiatingOccupancyFraction=60

# 重新标记优化
-XX:+CMSScavengeBeforeRemark
-XX:+CMSParallelRemarkEnabled

# 并发线程数
-XX:ConcGCThreads=4
```

#### 减少晋升失败

```bash
# 增加老年代空间
-Xmx12g

# 降低晋升率
-XX:MaxTenuringThreshold=8
-XX:PretenureSizeThreshold=512k

# 启用压缩指针（64位）
-XX:+UseCompressedOops
```

### 监控命令

```bash
# 查看新生代统计
jstat -gcnew <pid> 1s

# 查看 GC 统计
jstat -gc <pid> 1s

# 查看 GC 性能
jstat -gcutil <pid> 1s

# 查看 CMS 统计
jstat -gccms <pid> 1s
```

## 典型应用场景

### 1. Web 应用服务器

```bash
# 低延迟 Web 应用配置
-XX:+UseConcMarkSweepGC
-Xms4g -Xmx8g
-Xmn2g
-XX:ParallelGCThreads=8
-XX:CMSInitiatingOccupancyFraction=70
-XX:MaxTenuringThreshold=6
```

### 2. 在线交易系统

```bash
# 延迟敏感的交易系统
-XX:+UseConcMarkSweepGC
-Xms8g -Xmx16g
-Xmn4g
-XX:ParallelGCThreads=12
-XX:CMSInitiatingOccupancyFraction=60
-XX:+CMSScavengeBeforeRemark
```

### 3. 缓存服务

```bash
# 大内存缓存服务
-XX:+UseConcMarkSweepGC
-Xms16g -Xmx32g
-Xmn8g
-XX:ParallelGCThreads=16
-XX:CMSInitiatingOccupancyFraction=75
-XX:MaxTenuringThreshold=4
```

## 与其他新生代收集器对比

| 特性 | ParNew GC | Serial GC | Parallel Scavenge |
|------|-----------|-----------|-------------------|
| 线程数 | 多线程 | 单线程 | 多线程 |
| 停顿时间 | 中等 | 长 | 中等 |
| 吞吐量 | 中高 | 低 | 最高 |
| CMS 兼容 | 完美 | 不兼容 | 不兼容 |
| 适用场景 | 低延迟 | 小应用 | 高吞吐量 |
| 复杂度 | 中等 | 简单 | 中等 |

## 最佳实践

### 1. 选择标准

- **与 CMS 配合**：需要低延迟垃圾回收
- **多核环境**：CPU 核数 >= 4
- **中等内存**：堆大小 4GB-32GB
- **延迟敏感**：对响应时间有要求

### 2. 配置建议

- **合理设置新生代大小**：通常为堆大小的 1/4 到 1/3
- **优化线程数**：等于 CPU 核数或略少
- **配合 CMS 调优**：统一考虑整体 GC 策略
- **监控晋升率**：避免频繁晋升失败

### 3. 注意事项

- **避免过大新生代**：会增加停顿时间
- **关注 CMS 状态**：ParNew 性能与 CMS 密切相关
- **监控线程开销**：在核数较少时可能不如 Serial GC
- **定期调优**：根据应用特征调整参数

### 4. 迁移建议

- **从 Serial GC 迁移**：在多核环境下直接替换
- **迁移到 G1 GC**：当内存超过 32GB 时考虑
- **与 Parallel GC 选择**：根据延迟 vs 吞吐量需求决定

## 故障排查

### 常见问题

1. **晋升失败**：
   - 检查老年代空间
   - 调整 CMS 触发时机
   - 优化对象生命周期

2. **停顿时间过长**：
   - 减少新生代大小
   - 增加 ParNew 线程数
   - 优化 Survivor 配置

3. **与 CMS 不协调**：
   - 检查 CMS 参数配置
   - 监控并发失败
   - 调整触发阈值

### 诊断工具

```bash
# 分析 GC 日志
-XX:+PrintGCDetails \
-XX:+PrintGCTimeStamps \
-XX:+PrintPromotionFailure \
-Xloggc:gc.log

# 监控内存使用
jstat -gc <pid> 1s

# 查看线程状态
jstack <pid>

# 分析堆转储
jmap -dump:format=b,file=heap.hprof <pid>
```

## 发展历程与未来

### 历史地位

- **JDK 1.4**：首次引入 ParNew GC
- **JDK 6-8**：作为 CMS 的标准配置
- **JDK 9+**：逐渐被 G1 GC 替代

### 现状与趋势

- **维护模式**：不再积极开发新功能
- **稳定可靠**：在现有场景下表现稳定
- **逐步替代**：新项目推荐使用 G1 GC

## 总结

ParNew GC 作为 Serial GC 的多线程版本，在多核环境下提供了显著的性能提升，特别是与 CMS GC 配合使用时，能够实现较低的延迟。虽然随着 G1 GC 的成熟，ParNew GC 的使用场景在减少，但在特定的应用环境中，它仍然是一个稳定可靠的选择。理解 ParNew GC 的工作原理和调优方法，对于维护现有系统和理解 JVM 垃圾回收机制具有重要意义。