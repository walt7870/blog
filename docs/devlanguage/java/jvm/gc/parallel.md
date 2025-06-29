# Parallel GC（并行垃圾回收器）

## 概述

Parallel GC 是 JDK 8 及之前版本 Server 模式下的默认垃圾回收器，也被称为 Throughput GC（吞吐量垃圾回收器）。它使用多线程并行执行垃圾回收，专注于最大化应用程序的吞吐量，适合批处理、科学计算等对吞吐量要求高的场景。

## 基本特征

### 核心特点
- **多线程并行**：使用多个线程同时进行垃圾回收
- **吞吐量优先**：设计目标是最大化应用程序吞吐量
- **Stop-The-World**：回收期间暂停所有应用线程
- **自适应调节**：自动调整堆大小和 GC 参数

### 适用场景
- **批处理应用**：数据处理、报表生成等
- **科学计算**：CPU 密集型计算任务
- **后台服务**：对延迟不敏感的服务
- **多核服务器**：充分利用多核 CPU 优势

## 组成结构

Parallel GC 由两个收集器组成：

### Parallel Scavenge（新生代收集器）
- **算法**：复制算法
- **目标**：回收新生代（Eden + Survivor）
- **特点**：多线程并行、可控制吞吐量

### Parallel Old（老年代收集器）
- **算法**：标记-整理算法
- **目标**：回收老年代
- **特点**：多线程并行、内存整理

## 内存布局

```
Parallel GC 堆内存布局：
┌─────────────────────────────┬─────────────────────────────┐
│          新生代              │          老年代              │
│ ┌─────┬─────────┬─────────┐ │                             │
│ │Eden │Survivor0│Survivor1│ │        Old Generation       │
│ │ 8:1 │   1:1   │   1:1   │ │                             │
│ └─────┴─────────┴─────────┘ │                             │
└─────────────────────────────┴─────────────────────────────┘
     新生代:老年代 = 1:2（默认）

多线程工作模式：
┌─────────┬─────────┬─────────┬─────────┐
│Thread 1 │Thread 2 │Thread 3 │Thread 4 │
│  GC     │  GC     │  GC     │  GC     │
│ Worker  │ Worker  │ Worker  │ Worker  │
└─────────┴─────────┴─────────┴─────────┘
```

## 工作流程

### Minor GC（新生代回收）

```
Parallel Minor GC 详细流程：
1. 触发条件检查：
   - Eden 区域空间不足
   - 新对象分配失败
   
2. 线程协调：
   - 确定 GC 线程数量
   - 分配工作区域
   - 同步所有 GC 线程
   
3. STW 暂停：
   - 暂停所有应用线程
   - 等待所有线程到达安全点
   
4. 并行根扫描：
   - 多线程并行扫描 GC Roots
   - 每个线程处理不同的根集合
   - 标记直接可达对象
   
5. 并行复制算法：
   - 将工作区域分配给不同线程
   - 并行复制存活对象到 Survivor
   - 线程间协调避免冲突
   
6. 对象晋升处理：
   - 检查对象年龄和大小
   - 符合条件的对象晋升到老年代
   - 更新晋升统计信息
   
7. 空间清理：
   - 并行清空 Eden 区域
   - 清空源 Survivor 区域
   - 交换 Survivor 角色
   
8. 线程同步：
   - 等待所有 GC 线程完成
   - 更新内存指针
   - 统计 GC 信息
   
9. 恢复应用线程：
   - 解除 STW 状态
   - 应用线程继续执行
```

### Major GC（老年代回收）

```
Parallel Major GC 详细流程：
1. 触发条件：
   - 老年代空间不足
   - 新生代晋升失败
   - 达到 GC 时间比例阈值
   
2. 线程准备：
   - 计算最优线程数
   - 分配内存区域
   - 初始化工作队列
   
3. STW 暂停：
   - 暂停所有应用线程
   - 时间通常较长
   
4. 并行标记阶段：
   - 多线程从 GC Roots 开始标记
   - 使用工作窃取算法平衡负载
   - 标记所有可达对象
   
5. 汇总阶段：
   - 统计存活对象信息
   - 计算压缩后的内存布局
   - 确定对象新地址
   
6. 并行整理阶段：
   - 多线程并行移动对象
   - 更新对象引用
   - 消除内存碎片
   
7. 清除阶段：
   - 清理未标记的对象
   - 回收内存空间
   - 更新空闲列表
   
8. 恢复应用线程：
   - 解除 STW 状态
   - 更新性能统计
```

## 算法实现

### 并行复制算法（新生代）

```java
// Parallel GC 新生代并行复制算法伪代码
public class ParallelCopyingGC {
    private final int gcThreadCount;
    private final WorkStealingQueue[] workQueues;
    private final CyclicBarrier barrier;
    
    public void parallelMinorGC() {
        // 1. STW 暂停
        stopAllApplicationThreads();
        
        try {
            // 2. 初始化并行环境
            initializeParallelEnvironment();
            
            // 3. 启动 GC 工作线程
            CountDownLatch latch = new CountDownLatch(gcThreadCount);
            for (int i = 0; i < gcThreadCount; i++) {
                final int threadId = i;
                gcThreadPool.submit(() -> {
                    try {
                        parallelCopyWorker(threadId);
                    } finally {
                        latch.countDown();
                    }
                });
            }
            
            // 4. 等待所有线程完成
            latch.await();
            
            // 5. 后处理
            postProcessing();
            
        } finally {
            // 6. 恢复应用线程
            resumeAllApplicationThreads();
        }
    }
    
    private void parallelCopyWorker(int threadId) {
        Space toSpace = getToSpace();
        WorkStealingQueue myQueue = workQueues[threadId];
        
        // 处理分配给当前线程的 GC Roots
        List<GCRoot> myRoots = partitionGCRoots(threadId);
        for (GCRoot root : myRoots) {
            if (root.pointsToYoungGen()) {
                Object newObj = copyObject(root.getObject(), toSpace, myQueue);
                root.updateReference(newObj);
            }
        }
        
        // 处理工作队列中的对象
        processWorkQueue(myQueue, toSpace);
        
        // 工作窃取：帮助其他线程完成工作
        workStealing(toSpace);
        
        // 同步点：等待所有线程完成
        barrier.await();
    }
    
    private Object copyObject(Object obj, Space toSpace, WorkStealingQueue queue) {
        if (obj.isForwarded()) {
            return obj.getForwardingPointer();
        }
        
        // 检查是否需要晋升
        if (shouldPromote(obj)) {
            return promoteToOldGen(obj);
        }
        
        // 原子性分配新空间
        Object newObj = toSpace.atomicAllocate(obj.size());
        if (newObj == null) {
            // 空间不足，直接晋升
            return promoteToOldGen(obj);
        }
        
        // 复制对象数据
        copyObjectData(obj, newObj);
        obj.setForwardingPointer(newObj);
        newObj.incrementAge();
        
        // 将引用的对象加入工作队列
        for (Object ref : obj.getReferences()) {
            if (ref != null && ref.inYoungGen()) {
                queue.push(ref);
            }
        }
        
        return newObj;
    }
    
    private void workStealing(Space toSpace) {
        // 尝试从其他线程的队列中窃取工作
        for (int i = 0; i < gcThreadCount; i++) {
            WorkStealingQueue otherQueue = workQueues[i];
            Object obj;
            while ((obj = otherQueue.steal()) != null) {
                copyObject(obj, toSpace, workQueues[Thread.currentThread().getId()]);
            }
        }
    }
}
```

### 并行标记-整理算法（老年代）

```java
// Parallel GC 老年代并行标记-整理算法伪代码
public class ParallelMarkCompactGC {
    private final int gcThreadCount;
    private final AtomicInteger workCounter;
    private final ConcurrentLinkedQueue<Object> markQueue;
    
    public void parallelMajorGC() {
        stopAllApplicationThreads();
        
        try {
            // 1. 并行标记阶段
            parallelMarkPhase();
            
            // 2. 计算新地址阶段
            computeNewAddresses();
            
            // 3. 并行更新引用阶段
            parallelUpdateReferences();
            
            // 4. 并行压缩阶段
            parallelCompactPhase();
            
        } finally {
            resumeAllApplicationThreads();
        }
    }
    
    private void parallelMarkPhase() {
        CountDownLatch latch = new CountDownLatch(gcThreadCount);
        
        // 初始化标记队列
        for (GCRoot root : getGCRoots()) {
            Object obj = root.getObject();
            if (obj != null) {
                markQueue.offer(obj);
            }
        }
        
        // 启动标记工作线程
        for (int i = 0; i < gcThreadCount; i++) {
            gcThreadPool.submit(() -> {
                try {
                    parallelMarkWorker();
                } finally {
                    latch.countDown();
                }
            });
        }
        
        latch.await();
    }
    
    private void parallelMarkWorker() {
        Object obj;
        while ((obj = markQueue.poll()) != null || hasMoreWork()) {
            if (obj != null && !obj.isMarked()) {
                // 原子性标记对象
                if (obj.atomicMark()) {
                    // 成功标记，处理引用
                    for (Object ref : obj.getReferences()) {
                        if (ref != null && !ref.isMarked()) {
                            markQueue.offer(ref);
                        }
                    }
                }
            }
        }
    }
    
    private void computeNewAddresses() {
        // 单线程计算新地址，避免竞争
        Address compactPointer = heap.getOldGenStart();
        
        for (Object obj : heap.getOldGenObjects()) {
            if (obj.isMarked()) {
                obj.setNewAddress(compactPointer);
                compactPointer += obj.size();
            }
        }
    }
    
    private void parallelUpdateReferences() {
        CountDownLatch latch = new CountDownLatch(gcThreadCount);
        
        for (int i = 0; i < gcThreadCount; i++) {
            final int threadId = i;
            gcThreadPool.submit(() -> {
                try {
                    updateReferencesWorker(threadId);
                } finally {
                    latch.countDown();
                }
            });
        }
        
        latch.await();
    }
    
    private void updateReferencesWorker(int threadId) {
        // 更新分配给当前线程的 GC Roots
        List<GCRoot> myRoots = partitionGCRoots(threadId);
        for (GCRoot root : myRoots) {
            Object obj = root.getObject();
            if (obj != null && obj.hasNewAddress()) {
                root.updateReference(obj.getNewAddress());
            }
        }
        
        // 更新分配给当前线程的对象引用
        List<Object> myObjects = partitionObjects(threadId);
        for (Object obj : myObjects) {
            if (obj.isMarked()) {
                for (Reference ref : obj.getReferences()) {
                    Object target = ref.getTarget();
                    if (target != null && target.hasNewAddress()) {
                        ref.updateTarget(target.getNewAddress());
                    }
                }
            }
        }
    }
    
    private void parallelCompactPhase() {
        CountDownLatch latch = new CountDownLatch(gcThreadCount);
        
        for (int i = 0; i < gcThreadCount; i++) {
            final int threadId = i;
            gcThreadPool.submit(() -> {
                try {
                    compactWorker(threadId);
                } finally {
                    latch.countDown();
                }
            });
        }
        
        latch.await();
    }
    
    private void compactWorker(int threadId) {
        List<Object> myObjects = partitionObjects(threadId);
        
        for (Object obj : myObjects) {
            if (obj.isMarked()) {
                Address newAddr = obj.getNewAddress();
                if (newAddr != obj.getCurrentAddress()) {
                    moveObject(obj, newAddr);
                }
                obj.clearMark();
            }
        }
    }
}
```

## 自适应调节机制

### 自适应大小调节

```java
// Parallel GC 自适应调节算法伪代码
public class AdaptiveSizePolicy {
    private double targetThroughput = 0.99; // 目标吞吐量 99%
    private long maxPauseTime = 200; // 最大停顿时间 200ms
    
    public void adjustHeapSizes() {
        GCStats stats = getLatestGCStats();
        
        // 计算当前吞吐量
        double currentThroughput = calculateThroughput(stats);
        
        if (currentThroughput < targetThroughput) {
            // 吞吐量不足，尝试增加堆大小
            if (stats.avgPauseTime < maxPauseTime) {
                increaseHeapSize();
            } else {
                // 停顿时间过长，减少 GC 频率
                adjustGCTrigger();
            }
        } else {
            // 吞吐量满足要求，尝试优化停顿时间
            if (stats.avgPauseTime > maxPauseTime) {
                decreaseHeapSize();
            }
        }
        
        // 调整新生代大小
        adjustYoungGenSize(stats);
    }
    
    private void adjustYoungGenSize(GCStats stats) {
        double promotionRate = stats.promotionRate;
        double allocationRate = stats.allocationRate;
        
        if (promotionRate > 0.1) {
            // 晋升率过高，增加新生代
            increaseYoungGenSize();
        } else if (stats.minorGCFrequency > targetFrequency) {
            // Minor GC 过于频繁，增加新生代
            increaseYoungGenSize();
        } else if (stats.youngGenUtilization < 0.8) {
            // 新生代利用率低，减少新生代
            decreaseYoungGenSize();
        }
    }
}
```

## 性能特征

### 优势
1. **高吞吐量**：
   - 多线程并行回收，效率高
   - 专注于最大化应用程序吞吐量
   - 适合 CPU 密集型应用

2. **自适应调节**：
   - 自动调整堆大小和 GC 参数
   - 根据应用特征优化性能
   - 减少手动调优工作

3. **成熟稳定**：
   - 经过长期验证和优化
   - 算法稳定可靠
   - 广泛应用于生产环境

### 劣势
1. **停顿时间长**：
   - STW 时间与堆大小成正比
   - 不适合延迟敏感应用
   - 大堆情况下停顿明显

2. **内存碎片**：
   - 老年代使用标记-整理算法
   - 整理过程耗时较长
   - 可能产生临时内存碎片

3. **线程竞争**：
   - 多线程间需要同步
   - 存在一定的协调开销
   - 线程数过多时效率下降

## JVM 参数配置

### 基础参数
```bash
# 启用 Parallel GC（JDK 8 默认）
-XX:+UseParallelGC              # 新生代使用 Parallel
-XX:+UseParallelOldGC           # 老年代使用 Parallel Old

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
# GC 线程数设置
-XX:ParallelGCThreads=8         # 并行 GC 线程数
-XX:+UseAdaptiveSizePolicy      # 启用自适应调节

# 自动计算线程数（推荐）
# CPU <= 8: ParallelGCThreads = CPU 核数
# CPU > 8: ParallelGCThreads = 8 + (CPU - 8) * 5/8
```

### 性能调优参数
```bash
# 吞吐量目标
-XX:GCTimeRatio=99              # GC 时间占比 1/(1+99) = 1%
-XX:MaxGCPauseMillis=200        # 最大停顿时间目标

# 晋升相关
-XX:MaxTenuringThreshold=15     # 最大晋升年龄
-XX:TargetSurvivorRatio=90      # Survivor 目标使用率
-XX:PretenureSizeThreshold=1m   # 大对象直接晋升阈值

# 自适应调节
-XX:+UseAdaptiveSizePolicy      # 启用自适应大小调节
-XX:AdaptiveSizePolicyWeight=10 # 自适应权重
```

### 高级参数
```bash
# 内存管理
-XX:MinHeapFreeRatio=5          # 最小空闲堆比例
-XX:MaxHeapFreeRatio=10         # 最大空闲堆比例

# GC 触发
-XX:CMSInitiatingOccupancyFraction=70  # 老年代使用率触发阈值

# 调试参数
-XX:+PrintGC                    # 打印 GC 信息
-XX:+PrintGCDetails             # 打印详细 GC 信息
-XX:+PrintGCTimeStamps          # 打印时间戳
-XX:+PrintAdaptiveSizePolicy    # 打印自适应调节信息
```

## 监控与调优

### 关键指标
1. **吞吐量指标**：
   - 应用程序运行时间占比
   - GC 时间占比
   - 每秒处理请求数

2. **停顿时间指标**：
   - 平均停顿时间
   - 最大停顿时间
   - 停顿时间分布

3. **内存指标**：
   - 各代内存使用率
   - 晋升率和分配率
   - GC 频率

### 调优策略

#### 优化吞吐量
```bash
# 增加堆大小
-Xmx16g

# 调整 GC 时间比例
-XX:GCTimeRatio=199             # GC 时间占比 0.5%

# 增加 GC 线程数
-XX:ParallelGCThreads=16

# 启用自适应调节
-XX:+UseAdaptiveSizePolicy
```

#### 优化停顿时间
```bash
# 设置停顿时间目标
-XX:MaxGCPauseMillis=100

# 减少新生代大小
-XX:NewRatio=4                  # 减少新生代比例

# 调整晋升阈值
-XX:MaxTenuringThreshold=10
```

#### 内存优化
```bash
# 优化新生代配置
-XX:SurvivorRatio=6             # 增加 Survivor 空间
-XX:TargetSurvivorRatio=80      # 降低 Survivor 目标使用率

# 大对象处理
-XX:PretenureSizeThreshold=512k # 降低大对象阈值
```

### 监控工具

#### JVM 内置工具
```bash
# 查看 GC 统计
jstat -gc <pid> 1s

# 查看 GC 性能
jstat -gcutil <pid> 1s

# 查看 GC 容量
jstat -gccapacity <pid>

# 查看新生代统计
jstat -gcnew <pid> 1s

# 查看老年代统计
jstat -gcold <pid> 1s
```

#### GC 日志分析
```bash
# 启用详细 GC 日志
-XX:+PrintGCDetails \
-XX:+PrintGCTimeStamps \
-XX:+PrintGCDateStamps \
-Xloggc:gc.log

# 使用 GCViewer 分析日志
# 关注指标：
# - 吞吐量
# - 平均停顿时间
# - 内存使用趋势
```

## 典型应用场景

### 1. 批处理应用
```bash
# 大数据处理配置
-XX:+UseParallelGC
-Xms8g -Xmx32g
-XX:NewRatio=2
-XX:ParallelGCThreads=16
-XX:GCTimeRatio=199
-XX:+UseAdaptiveSizePolicy
```

### 2. 科学计算
```bash
# CPU 密集型计算配置
-XX:+UseParallelGC
-Xms4g -Xmx16g
-XX:NewRatio=3
-XX:ParallelGCThreads=12
-XX:MaxGCPauseMillis=500
```

### 3. 后台服务
```bash
# 后台数据处理服务
-XX:+UseParallelGC
-Xms2g -Xmx8g
-XX:NewRatio=2
-XX:ParallelGCThreads=8
-XX:GCTimeRatio=99
```

## 与其他 GC 对比

| 特性 | Parallel GC | G1 GC | CMS GC | ZGC |
|------|-------------|-------|--------|---------|
| 停顿时间 | 长 | 可控 | 短 | 极短 |
| 吞吐量 | 最高 | 高 | 中等 | 中等 |
| 内存开销 | 低 | 中等 | 中等 | 高 |
| 适用堆大小 | < 32GB | 4GB-64GB | < 32GB | > 64GB |
| 并发程度 | 并行 | 部分并发 | 并发 | 并发 |
| 复杂度 | 简单 | 中等 | 复杂 | 复杂 |

## 最佳实践

### 1. 选择标准
- **吞吐量优先**：批处理、科学计算等场景
- **多核服务器**：充分利用 CPU 资源
- **内存 < 32GB**：避免停顿时间过长
- **延迟不敏感**：可以容忍较长的停顿时间

### 2. 配置建议
- **启用自适应调节**：减少手动调优工作
- **合理设置目标**：平衡吞吐量和停顿时间
- **监控关键指标**：及时发现性能问题
- **定期调优**：根据应用变化调整参数

### 3. 注意事项
- **避免过度调优**：自适应机制通常效果很好
- **关注内存分配模式**：优化对象生命周期
- **监控晋升率**：避免频繁 Full GC
- **测试验证**：在生产环境前充分测试

### 4. 迁移建议
- **从 Serial GC 迁移**：直接替换，性能显著提升
- **迁移到 G1 GC**：当停顿时间成为瓶颈时考虑
- **迁移到 ZGC**：超大堆或极低延迟需求时考虑

## 故障排查

### 常见问题
1. **Full GC 频繁**：
   - 检查老年代大小
   - 分析对象晋升模式
   - 调整新生代配置

2. **停顿时间过长**：
   - 减少堆大小
   - 增加 GC 线程数
   - 考虑迁移到 G1 GC

3. **吞吐量下降**：
   - 检查 GC 频率
   - 调整 GC 时间比例
   - 优化应用程序

### 诊断工具
```bash
# 生成堆转储
jmap -dump:format=b,file=heap.hprof <pid>

# 分析内存使用
jmap -histo <pid> | head -20

# 查看 JVM 参数
jinfo -flags <pid>

# 实时监控
jconsole
```

## 总结

Parallel GC 是一个成熟、稳定的垃圾回收器，专注于最大化应用程序吞吐量。它通过多线程并行回收和自适应调节机制，在批处理、科学计算等场景下表现优异。虽然停顿时间相对较长，但在对延迟不敏感的应用中，Parallel GC 仍然是一个优秀的选择。随着硬件发展和应用需求变化，了解其特性和调优方法对于 Java 应用性能优化具有重要意义。