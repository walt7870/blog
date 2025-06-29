# Shenandoah GC（低延迟垃圾回收器）

## 概述

Shenandoah GC 是 Red Hat 开发的一款低延迟垃圾回收器，首次在 OpenJDK 12 中作为实验性功能引入，在 OpenJDK 15 中成为正式功能。Shenandoah 的设计目标是实现可预测的低停顿时间，无论堆大小如何，都能将 GC 停顿时间控制在 10ms 以内。它采用了并发回收技术，在应用程序运行的同时执行大部分垃圾回收工作，是现代 JVM 中最先进的低延迟垃圾回收器之一。

## 基本特征

### 核心特点

- **超低停顿时间**：目标停顿时间 < 10ms，与堆大小无关
- **并发回收**：大部分 GC 工作与应用并发执行
- **区域化管理**：将堆分为多个区域进行管理
- **Brooks 指针**：使用转发指针实现并发移动
- **无分代设计**：不区分年轻代和老年代
- **适应性强**：适用于各种堆大小和应用类型

### 设计目标

- **低延迟优先**：最小化 GC 停顿时间
- **可预测性**：停顿时间与堆大小无关
- **高并发性**：最大化并发执行
- **内存效率**：合理的内存开销
- **简化调优**：减少调优参数

## 核心技术

### 1. Brooks 指针（转发指针）

Shenandoah 的核心创新是 Brooks 指针技术：

```
Brooks 指针原理：

传统对象布局：
[对象头][字段1][字段2][字段3]...

Shenandoah 对象布局：
[对象头][Brooks指针][字段1][字段2][字段3]...

Brooks 指针特点：
1. 每个对象都有一个额外的指针字段
2. 指向对象的当前位置（通常指向自己）
3. 当对象移动时，指针更新为新位置
4. 应用程序通过指针间接访问对象

并发移动过程：
1. 应用程序继续运行
2. GC 线程复制对象到新位置
3. 更新 Brooks 指针指向新位置
4. 应用程序自动访问新位置的对象

优势：
- 实现真正的并发移动
- 无需停止应用程序
- 简化并发控制
- 支持增量更新
```

### 2. 区域化内存管理

Shenandoah 将堆内存划分为多个固定大小的区域：

```
区域管理特点：

1. 区域大小：
   - 默认大小：堆大小 / 2048
   - 最小：1MB，最大：32MB
   - 所有区域大小相同

2. 区域状态：
   - Empty：空闲区域
   - Regular：正常使用区域
   - Humongous：大对象区域
   - Collection Set：待回收区域
   - Pinned：固定区域（不可移动）

3. 区域选择策略：
   - 垃圾密度优先
   - 回收效益最大化
   - 避免内存碎片
   - 平衡并发性能

4. 动态调整：
   - 根据分配模式调整
   - 适应应用行为
   - 优化回收效率
   - 减少内存浪费
```

### 3. 并发标记算法

Shenandoah 使用 SATB（Snapshot-At-The-Beginning）并发标记：

```
并发标记特点：

1. SATB 快照：
   - 标记开始时创建堆快照
   - 保证标记的完整性
   - 处理并发修改
   - 避免对象丢失

2. 三色标记：
   - 白色：未访问对象
   - 灰色：已访问但未扫描完成
   - 黑色：已完全扫描对象

3. 写屏障：
   - 记录引用变化
   - 维护标记一致性
   - 处理并发更新
   - 支持增量标记

4. 并发处理：
   - 与应用程序并发执行
   - 最小化停顿时间
   - 动态调整标记速度
   - 平衡 CPU 使用
```

### 4. 并发回收机制

Shenandoah 的并发回收是其核心优势：

```
并发回收流程：

1. 选择回收集合：
   - 分析区域垃圾密度
   - 选择回收效益最高的区域
   - 考虑并发性能影响
   - 避免过度并发

2. 并发复制：
   - 应用程序继续运行
   - GC 线程复制存活对象
   - 更新 Brooks 指针
   - 处理并发访问冲突

3. 引用更新：
   - 扫描所有引用
   - 更新指向新位置
   - 处理根引用
   - 维护引用一致性

4. 内存回收：
   - 释放旧区域内存
   - 更新区域状态
   - 合并空闲区域
   - 准备下次分配
```

## 工作流程

### Shenandoah GC 完整周期

```
Shenandoah GC 周期包含以下阶段：

1. 初始标记（Initial Mark）- STW
   - 标记 GC Roots 直接引用的对象
   - 停顿时间：1-5ms
   - 与堆大小无关

2. 并发标记（Concurrent Mark）
   - 遍历对象图，标记所有可达对象
   - 与应用程序并发执行
   - 使用 SATB 写屏障
   - 处理并发修改

3. 最终标记（Final Mark）- STW
   - 处理并发标记期间的变化
   - 完成标记过程
   - 停顿时间：1-5ms

4. 并发清理（Concurrent Cleanup）
   - 回收完全空的区域
   - 更新区域状态
   - 准备回收集合

5. 并发回收（Concurrent Evacuation）
   - 复制存活对象到新区域
   - 更新 Brooks 指针
   - 与应用程序并发执行

6. 初始更新引用（Initial Update References）- STW
   - 更新 GC Roots 的引用
   - 停顿时间：1-3ms

7. 并发更新引用（Concurrent Update References）
   - 更新堆中所有引用
   - 与应用程序并发执行
   - 扫描整个堆空间

8. 最终更新引用（Final Update References）- STW
   - 完成引用更新
   - 清理工作
   - 停顿时间：1-3ms

9. 并发清理（Concurrent Cleanup）
   - 回收旧区域内存
   - 重置区域状态
   - 准备下次 GC
```

## 算法实现

### Shenandoah GC 核心实现

```java
// Shenandoah GC 的核心实现
public class ShenandoahGarbageCollector {
    private final ShenandoahHeap heap;
    private final ShenandoahConcurrentMark marker;
    private final ShenandoahConcurrentEvacuation evacuator;
    private final ShenandoahReferenceProcessor refProcessor;
    private final ShenandoahBarrierSet barrierSet;
    
    // GC 状态
    private volatile GCPhase currentPhase = GCPhase.IDLE;
    private volatile boolean gcInProgress = false;
    
    public ShenandoahGarbageCollector(ShenandoahHeap heap) {
        this.heap = heap;
        this.marker = new ShenandoahConcurrentMark(heap);
        this.evacuator = new ShenandoahConcurrentEvacuation(heap);
        this.refProcessor = new ShenandoahReferenceProcessor();
        this.barrierSet = new ShenandoahBarrierSet(heap);
    }
    
    // 主要的 GC 入口点
    public void collectGarbage(GCCause cause) {
        if (gcInProgress) {
            return; // 避免重复 GC
        }
        
        try {
            gcInProgress = true;
            performGCCycle(cause);
        } finally {
            gcInProgress = false;
            currentPhase = GCPhase.IDLE;
        }
    }
    
    private void performGCCycle(GCCause cause) {
        long startTime = System.nanoTime();
        
        // 1. 初始标记阶段（STW）
        performInitialMark();
        
        // 2. 并发标记阶段
        performConcurrentMark();
        
        // 3. 最终标记阶段（STW）
        performFinalMark();
        
        // 4. 并发清理阶段
        performConcurrentCleanup();
        
        // 5. 选择回收集合
        CollectionSet collectionSet = selectCollectionSet();
        
        if (!collectionSet.isEmpty()) {
            // 6. 并发回收阶段
            performConcurrentEvacuation(collectionSet);
            
            // 7. 初始更新引用阶段（STW）
            performInitialUpdateReferences();
            
            // 8. 并发更新引用阶段
            performConcurrentUpdateReferences();
            
            // 9. 最终更新引用阶段（STW）
            performFinalUpdateReferences();
            
            // 10. 最终清理
            performFinalCleanup(collectionSet);
        }
        
        long duration = System.nanoTime() - startTime;
        recordGCStatistics(cause, duration);
    }
    
    // 1. 初始标记阶段
    private void performInitialMark() {
        currentPhase = GCPhase.INITIAL_MARK;
        
        // 停止所有应用线程
        VMThread.safepoint(() -> {
            long startTime = System.nanoTime();
            
            // 标记 GC Roots
            marker.markRoots();
            
            // 设置并发标记状态
            heap.setConcurrentMarkInProgress(true);
            
            long duration = System.nanoTime() - startTime;
            recordPhaseTime(GCPhase.INITIAL_MARK, duration);
        });
    }
    
    // 2. 并发标记阶段
    private void performConcurrentMark() {
        currentPhase = GCPhase.CONCURRENT_MARK;
        
        // 启动并发标记线程
        CompletableFuture<Void> markingTask = CompletableFuture.runAsync(() -> {
            marker.concurrentMark();
        });
        
        // 等待标记完成
        try {
            markingTask.get();
        } catch (Exception e) {
            throw new RuntimeException("Concurrent marking failed", e);
        }
    }
    
    // 3. 最终标记阶段
    private void performFinalMark() {
        currentPhase = GCPhase.FINAL_MARK;
        
        VMThread.safepoint(() -> {
            long startTime = System.nanoTime();
            
            // 处理并发标记期间的变化
            marker.finishMark();
            
            // 计算存活数据大小
            heap.calculateLiveData();
            
            // 清除并发标记状态
            heap.setConcurrentMarkInProgress(false);
            
            long duration = System.nanoTime() - startTime;
            recordPhaseTime(GCPhase.FINAL_MARK, duration);
        });
    }
    
    // 4. 并发清理阶段
    private void performConcurrentCleanup() {
        currentPhase = GCPhase.CONCURRENT_CLEANUP;
        
        // 回收完全空的区域
        heap.reclaimEmptyRegions();
        
        // 重置区域状态
        heap.resetRegionStates();
    }
    
    // 5. 选择回收集合
    private CollectionSet selectCollectionSet() {
        CollectionSetSelector selector = new CollectionSetSelector(heap);
        return selector.selectRegions();
    }
    
    // 6. 并发回收阶段
    private void performConcurrentEvacuation(CollectionSet collectionSet) {
        currentPhase = GCPhase.CONCURRENT_EVACUATION;
        
        // 设置回收状态
        heap.setEvacuationInProgress(true);
        heap.setCollectionSet(collectionSet);
        
        // 启动并发回收
        CompletableFuture<Void> evacuationTask = CompletableFuture.runAsync(() -> {
            evacuator.evacuateCollectionSet(collectionSet);
        });
        
        try {
            evacuationTask.get();
        } catch (Exception e) {
            throw new RuntimeException("Concurrent evacuation failed", e);
        }
    }
    
    // 7. 初始更新引用阶段
    private void performInitialUpdateReferences() {
        currentPhase = GCPhase.INITIAL_UPDATE_REFS;
        
        VMThread.safepoint(() -> {
            long startTime = System.nanoTime();
            
            // 更新 GC Roots 中的引用
            refProcessor.updateRootReferences();
            
            // 设置并发更新引用状态
            heap.setConcurrentUpdateRefsInProgress(true);
            
            long duration = System.nanoTime() - startTime;
            recordPhaseTime(GCPhase.INITIAL_UPDATE_REFS, duration);
        });
    }
    
    // 8. 并发更新引用阶段
    private void performConcurrentUpdateReferences() {
        currentPhase = GCPhase.CONCURRENT_UPDATE_REFS;
        
        CompletableFuture<Void> updateTask = CompletableFuture.runAsync(() -> {
            refProcessor.concurrentUpdateReferences();
        });
        
        try {
            updateTask.get();
        } catch (Exception e) {
            throw new RuntimeException("Concurrent reference update failed", e);
        }
    }
    
    // 9. 最终更新引用阶段
    private void performFinalUpdateReferences() {
        currentPhase = GCPhase.FINAL_UPDATE_REFS;
        
        VMThread.safepoint(() -> {
            long startTime = System.nanoTime();
            
            // 完成引用更新
            refProcessor.finishUpdateReferences();
            
            // 清除更新引用状态
            heap.setConcurrentUpdateRefsInProgress(false);
            heap.setEvacuationInProgress(false);
            
            long duration = System.nanoTime() - startTime;
            recordPhaseTime(GCPhase.FINAL_UPDATE_REFS, duration);
        });
    }
    
    // 10. 最终清理
    private void performFinalCleanup(CollectionSet collectionSet) {
        currentPhase = GCPhase.FINAL_CLEANUP;
        
        // 回收旧区域
        heap.reclaimCollectionSet(collectionSet);
        
        // 重置状态
        heap.clearCollectionSet();
        
        // 更新统计信息
        heap.updateStatistics();
    }
    
    // 记录 GC 统计信息
    private void recordGCStatistics(GCCause cause, long duration) {
        GCStatistics stats = new GCStatistics(
            cause,
            duration,
            heap.getUsedSize(),
            heap.getTotalSize(),
            getCurrentPhaseTimings()
        );
        
        heap.getStatisticsRecorder().record(stats);
    }
    
    private void recordPhaseTime(GCPhase phase, long duration) {
        heap.getPhaseTimings().record(phase, duration);
    }
    
    private Map<GCPhase, Long> getCurrentPhaseTimings() {
        return heap.getPhaseTimings().getTimings();
    }
    
    // GC 阶段枚举
    public enum GCPhase {
        IDLE,
        INITIAL_MARK,
        CONCURRENT_MARK,
        FINAL_MARK,
        CONCURRENT_CLEANUP,
        CONCURRENT_EVACUATION,
        INITIAL_UPDATE_REFS,
        CONCURRENT_UPDATE_REFS,
        FINAL_UPDATE_REFS,
        FINAL_CLEANUP
    }
}
```

### Brooks 指针实现

```java
// Brooks 指针的实现
public class BrooksPointer {
    // Brooks 指针在对象头之后的偏移量
    private static final int BROOKS_POINTER_OFFSET = 8; // 64位系统
    
    // 获取对象的 Brooks 指针
    public static Object getBrooksPointer(Object obj) {
        if (obj == null) return null;
        
        // 读取 Brooks 指针字段
        long objAddress = getObjectAddress(obj);
        long pointerAddress = objAddress + BROOKS_POINTER_OFFSET;
        return readObjectReference(pointerAddress);
    }
    
    // 设置对象的 Brooks 指针
    public static void setBrooksPointer(Object obj, Object target) {
        if (obj == null) return;
        
        long objAddress = getObjectAddress(obj);
        long pointerAddress = objAddress + BROOKS_POINTER_OFFSET;
        writeObjectReference(pointerAddress, target);
    }
    
    // 原子性更新 Brooks 指针
    public static boolean compareAndSetBrooksPointer(Object obj, Object expected, Object target) {
        if (obj == null) return false;
        
        long objAddress = getObjectAddress(obj);
        long pointerAddress = objAddress + BROOKS_POINTER_OFFSET;
        return compareAndSwapObjectReference(pointerAddress, expected, target);
    }
    
    // 解引用：通过 Brooks 指针获取实际对象
    public static Object dereference(Object obj) {
        if (obj == null) return null;
        
        Object target = getBrooksPointer(obj);
        return target != null ? target : obj;
    }
    
    // 检查对象是否已被移动
    public static boolean isForwarded(Object obj) {
        if (obj == null) return false;
        
        Object pointer = getBrooksPointer(obj);
        return pointer != null && pointer != obj;
    }
    
    // 获取对象的最终位置（递归解引用）
    public static Object getFinalTarget(Object obj) {
        Object current = obj;
        Object target;
        
        // 递归跟踪转发链
        while ((target = getBrooksPointer(current)) != null && target != current) {
            current = target;
        }
        
        return current;
    }
    
    // 初始化新对象的 Brooks 指针
    public static void initializeBrooksPointer(Object obj) {
        if (obj != null) {
            setBrooksPointer(obj, obj); // 初始指向自己
        }
    }
    
    // 并发移动对象时的指针更新
    public static boolean forwardObject(Object oldObj, Object newObj) {
        if (oldObj == null || newObj == null) return false;
        
        // 原子性地更新 Brooks 指针
        return compareAndSetBrooksPointer(oldObj, oldObj, newObj);
    }
    
    // 批量更新引用
    public static void updateReferences(Object[] references) {
        for (int i = 0; i < references.length; i++) {
            Object ref = references[i];
            if (ref != null) {
                Object target = getFinalTarget(ref);
                if (target != ref) {
                    references[i] = target;
                }
            }
        }
    }
    
    // 内存屏障相关方法
    public static Object loadReference(Object obj, long offset) {
        // 加载引用时自动解引用
        Object ref = readObjectReference(getObjectAddress(obj) + offset);
        return dereference(ref);
    }
    
    public static void storeReference(Object obj, long offset, Object value) {
        // 存储引用时记录到 SATB 队列
        Object oldValue = readObjectReference(getObjectAddress(obj) + offset);
        if (oldValue != null && ShenandoahHeap.isMarkingActive()) {
            ShenandoahBarrierSet.enqueueSATB(oldValue);
        }
        
        writeObjectReference(getObjectAddress(obj) + offset, value);
    }
    
    // 低级内存操作（简化实现）
    private static long getObjectAddress(Object obj) {
        // 实际实现会使用 Unsafe 或 JVM 内部 API
        return System.identityHashCode(obj); // 简化
    }
    
    private static Object readObjectReference(long address) {
        // 实际实现会直接读取内存
        return null; // 简化
    }
    
    private static void writeObjectReference(long address, Object ref) {
        // 实际实现会直接写入内存
    }
    
    private static boolean compareAndSwapObjectReference(long address, Object expected, Object target) {
        // 实际实现会使用原子操作
        return true; // 简化
    }
}
```

### 并发回收实现

```java
// Shenandoah 并发回收实现
public class ShenandoahConcurrentEvacuation {
    private final ShenandoahHeap heap;
    private final ExecutorService evacuationThreads;
    private final ConcurrentLinkedQueue<ShenandoahRegion> workQueue;
    private final AtomicInteger activeWorkers;
    
    public ShenandoahConcurrentEvacuation(ShenandoahHeap heap) {
        this.heap = heap;
        this.evacuationThreads = Executors.newFixedThreadPool(
            Runtime.getRuntime().availableProcessors());
        this.workQueue = new ConcurrentLinkedQueue<>();
        this.activeWorkers = new AtomicInteger(0);
    }
    
    // 回收指定的区域集合
    public void evacuateCollectionSet(CollectionSet collectionSet) {
        // 准备工作队列
        prepareWorkQueue(collectionSet);
        
        // 启动回收工作线程
        List<CompletableFuture<Void>> tasks = new ArrayList<>();
        int workerCount = Math.min(collectionSet.size(), 
                                  Runtime.getRuntime().availableProcessors());
        
        for (int i = 0; i < workerCount; i++) {
            CompletableFuture<Void> task = CompletableFuture.runAsync(
                this::evacuationWorker, evacuationThreads);
            tasks.add(task);
        }
        
        // 等待所有工作完成
        CompletableFuture.allOf(tasks.toArray(new CompletableFuture[0])).join();
        
        // 完成回收
        finishEvacuation(collectionSet);
    }
    
    private void prepareWorkQueue(CollectionSet collectionSet) {
        workQueue.clear();
        
        // 按垃圾密度排序，优先处理垃圾最多的区域
        List<ShenandoahRegion> sortedRegions = collectionSet.getRegions()
            .stream()
            .sorted((r1, r2) -> Double.compare(r2.getGarbageRatio(), r1.getGarbageRatio()))
            .collect(Collectors.toList());
        
        workQueue.addAll(sortedRegions);
    }
    
    // 回收工作线程
    private void evacuationWorker() {
        activeWorkers.incrementAndGet();
        
        try {
            ShenandoahRegion region;
            while ((region = workQueue.poll()) != null) {
                evacuateRegion(region);
            }
        } finally {
            activeWorkers.decrementAndGet();
        }
    }
    
    // 回收单个区域
    private void evacuateRegion(ShenandoahRegion region) {
        if (region.isEmpty() || region.isEvacuated()) {
            return;
        }
        
        // 标记区域为正在回收
        region.setEvacuating(true);
        
        try {
            // 遍历区域中的所有存活对象
            ObjectIterator iterator = region.objectIterator();
            while (iterator.hasNext()) {
                Object obj = iterator.next();
                
                if (obj != null && heap.isMarked(obj)) {
                    evacuateObject(obj, region);
                }
            }
            
            // 标记区域回收完成
            region.setEvacuated(true);
            
        } catch (Exception e) {
            // 处理回收异常
            handleEvacuationError(region, e);
        } finally {
            region.setEvacuating(false);
        }
    }
    
    // 回收单个对象
    private void evacuateObject(Object obj, ShenandoahRegion sourceRegion) {
        // 检查对象是否已被移动
        if (BrooksPointer.isForwarded(obj)) {
            return; // 已被其他线程移动
        }
        
        // 分配新的内存空间
        int objectSize = heap.getObjectSize(obj);
        Object newObj = heap.allocateEvacuation(objectSize);
        
        if (newObj == null) {
            // 分配失败，可能需要触发 Full GC
            handleEvacuationFailure(obj, sourceRegion);
            return;
        }
        
        // 复制对象内容
        copyObject(obj, newObj, objectSize);
        
        // 原子性地更新 Brooks 指针
        if (BrooksPointer.forwardObject(obj, newObj)) {
            // 成功移动对象
            recordObjectEvacuation(obj, newObj, sourceRegion);
        } else {
            // 其他线程已经移动了这个对象
            heap.deallocate(newObj); // 释放重复分配的内存
        }
    }
    
    // 复制对象内容
    private void copyObject(Object source, Object target, int size) {
        // 复制对象头
        copyObjectHeader(source, target);
        
        // 复制对象字段
        copyObjectFields(source, target, size);
        
        // 初始化目标对象的 Brooks 指针
        BrooksPointer.initializeBrooksPointer(target);
    }
    
    private void copyObjectHeader(Object source, Object target) {
        // 复制对象头信息（类型、标记等）
        // 实际实现会使用内存复制操作
    }
    
    private void copyObjectFields(Object source, Object target, int size) {
        // 复制对象的所有字段
        // 实际实现会使用高效的内存复制
        long sourceAddr = getObjectAddress(source);
        long targetAddr = getObjectAddress(target);
        
        // 跳过对象头和 Brooks 指针
        int dataOffset = getObjectDataOffset();
        int dataSize = size - dataOffset;
        
        if (dataSize > 0) {
            copyMemory(sourceAddr + dataOffset, targetAddr + dataOffset, dataSize);
        }
    }
    
    // 处理回收失败
    private void handleEvacuationFailure(Object obj, ShenandoahRegion region) {
        // 标记对象为固定（不可移动）
        heap.pinObject(obj);
        
        // 记录回收失败
        region.recordEvacuationFailure();
        
        // 可能需要触发 Full GC
        if (region.getEvacuationFailureCount() > getFailureThreshold()) {
            heap.requestFullGC();
        }
    }
    
    private void recordObjectEvacuation(Object oldObj, Object newObj, ShenandoahRegion region) {
        // 更新统计信息
        region.recordEvacuatedObject(getObjectSize(oldObj));
        heap.recordEvacuation(oldObj, newObj);
    }
    
    private void finishEvacuation(CollectionSet collectionSet) {
        // 等待所有工作线程完成
        while (activeWorkers.get() > 0) {
            Thread.yield();
        }
        
        // 验证回收完成
        for (ShenandoahRegion region : collectionSet.getRegions()) {
            if (!region.isEvacuated() && !region.hasEvacuationFailures()) {
                throw new IllegalStateException("Region evacuation incomplete: " + region);
            }
        }
        
        // 更新堆统计
        heap.updateEvacuationStatistics(collectionSet);
    }
    
    private void handleEvacuationError(ShenandoahRegion region, Exception e) {
        System.err.println("Evacuation error in region " + region + ": " + e.getMessage());
        region.markEvacuationFailed();
    }
    
    // 辅助方法
    private long getObjectAddress(Object obj) {
        // 实际实现会使用 Unsafe
        return 0;
    }
    
    private int getObjectSize(Object obj) {
        // 实际实现会计算对象大小
        return 0;
    }
    
    private int getObjectDataOffset() {
        // 对象头 + Brooks 指针的大小
        return 16; // 简化
    }
    
    private void copyMemory(long src, long dst, int size) {
        // 实际实现会使用高效的内存复制
    }
    
    private int getFailureThreshold() {
        return 10; // 可配置
    }
}
```

### 写屏障实现

```java
// Shenandoah 写屏障实现
public class ShenandoahBarrierSet {
    private final ShenandoahHeap heap;
    private static final ThreadLocal<SATBQueue> satbQueues = 
        ThreadLocal.withInitial(SATBQueue::new);
    
    public ShenandoahBarrierSet(ShenandoahHeap heap) {
        this.heap = heap;
    }
    
    // SATB 写屏障
    public static void satbWriteBarrier(Object obj, long offset, Object newValue) {
        if (!ShenandoahHeap.isMarkingActive()) {
            return; // 标记未激活时不需要屏障
        }
        
        // 读取旧值
        Object oldValue = readObjectReference(obj, offset);
        
        if (oldValue != null) {
            // 将旧值加入 SATB 队列
            enqueueSATB(oldValue);
        }
    }
    
    // 读屏障（用于 Brooks 指针解引用）
    public static Object readBarrier(Object obj) {
        if (obj == null) {
            return null;
        }
        
        // 检查是否需要解引用
        if (ShenandoahHeap.isEvacuationActive()) {
            return BrooksPointer.dereference(obj);
        }
        
        return obj;
    }
    
    // 加载引用屏障
    public static Object loadReferenceBarrier(Object obj, long offset) {
        Object ref = readObjectReference(obj, offset);
        return readBarrier(ref);
    }
    
    // 存储引用屏障
    public static void storeReferenceBarrier(Object obj, long offset, Object value) {
        // SATB 写屏障
        satbWriteBarrier(obj, offset, value);
        
        // 存储新值
        writeObjectReference(obj, offset, value);
    }
    
    // 将对象加入 SATB 队列
    public static void enqueueSATB(Object obj) {
        if (obj == null) return;
        
        SATBQueue queue = satbQueues.get();
        queue.enqueue(obj);
        
        // 检查队列是否需要刷新
        if (queue.shouldFlush()) {
            flushSATBQueue(queue);
        }
    }
    
    // 刷新 SATB 队列
    private static void flushSATBQueue(SATBQueue queue) {
        Object[] buffer = queue.getBuffer();
        int size = queue.size();
        
        // 将缓冲区内容提交给标记器
        ShenandoahHeap.getInstance().getMarker().processSATBBuffer(buffer, size);
        
        // 重置队列
        queue.reset();
    }
    
    // 比较并交换屏障
    public static boolean compareAndSwapBarrier(Object obj, long offset, 
                                               Object expected, Object newValue) {
        // SATB 写屏障
        if (ShenandoahHeap.isMarkingActive()) {
            Object current = readObjectReference(obj, offset);
            if (current != null && current != expected) {
                enqueueSATB(current);
            }
        }
        
        // 执行 CAS 操作
        return compareAndSwapObjectReference(obj, offset, expected, newValue);
    }
    
    // 数组复制屏障
    public static void arrayCopyBarrier(Object src, int srcPos, 
                                       Object dst, int dstPos, int length) {
        if (!ShenandoahHeap.isMarkingActive() && !ShenandoahHeap.isEvacuationActive()) {
            // 快速路径：无需屏障
            System.arraycopy(src, srcPos, dst, dstPos, length);
            return;
        }
        
        // 慢速路径：逐个元素复制并应用屏障
        for (int i = 0; i < length; i++) {
            Object element = Array.get(src, srcPos + i);
            
            // 应用读屏障
            element = readBarrier(element);
            
            // 应用写屏障
            if (ShenandoahHeap.isMarkingActive()) {
                Object oldElement = Array.get(dst, dstPos + i);
                if (oldElement != null) {
                    enqueueSATB(oldElement);
                }
            }
            
            Array.set(dst, dstPos + i, element);
        }
    }
    
    // 克隆屏障
    public static Object cloneBarrier(Object obj) {
        if (obj == null) return null;
        
        // 应用读屏障获取最新对象
        Object target = readBarrier(obj);
        
        // 执行克隆
        Object clone = performClone(target);
        
        // 如果正在标记，需要标记新对象
        if (ShenandoahHeap.isMarkingActive()) {
            ShenandoahHeap.getInstance().getMarker().markObject(clone);
        }
        
        return clone;
    }
    
    // SATB 队列实现
    private static class SATBQueue {
        private static final int BUFFER_SIZE = 256;
        private final Object[] buffer = new Object[BUFFER_SIZE];
        private int index = 0;
        
        public void enqueue(Object obj) {
            if (index < BUFFER_SIZE) {
                buffer[index++] = obj;
            } else {
                // 缓冲区满，强制刷新
                flushSATBQueue(this);
                buffer[0] = obj;
                index = 1;
            }
        }
        
        public boolean shouldFlush() {
            return index >= BUFFER_SIZE * 0.75; // 75% 满时刷新
        }
        
        public Object[] getBuffer() {
            return buffer;
        }
        
        public int size() {
            return index;
        }
        
        public void reset() {
            index = 0;
            Arrays.fill(buffer, null);
        }
    }
    
    // 低级内存操作（简化实现）
    private static Object readObjectReference(Object obj, long offset) {
        // 实际实现会使用 Unsafe
        return null;
    }
    
    private static void writeObjectReference(Object obj, long offset, Object value) {
        // 实际实现会使用 Unsafe
    }
    
    private static boolean compareAndSwapObjectReference(Object obj, long offset, 
                                                        Object expected, Object newValue) {
        // 实际实现会使用 Unsafe
        return true;
    }
    
    private static Object performClone(Object obj) {
        // 实际实现会调用对象的 clone 方法
        return null;
    }
}
```

## 性能特征

### 优势

1. **超低停顿时间**：
   - 目标停顿时间 < 10ms
   - 与堆大小无关
   - 可预测的延迟

2. **高并发性**：
   - 大部分工作并发执行
   - 最小化 STW 时间
   - 支持高并发应用

3. **适应性强**：
   - 适用于各种堆大小
   - 自适应调节
   - 无需复杂调优

4. **内存效率**：
   - 区域化管理
   - 增量回收
   - 减少内存碎片

### 劣势

1. **内存开销**：
   - Brooks 指针增加 8 字节开销
   - 写屏障性能影响
   - 额外的元数据

2. **吞吐量影响**：
   - 并发工作消耗 CPU
   - 写屏障开销
   - 内存访问间接性

3. **复杂性**：
   - 实现复杂
   - 调试困难
   - 需要特殊的 JIT 支持

## JVM 参数配置

### 基础参数

```bash
# 启用 Shenandoah GC
-XX:+UnlockExperimentalVMOptions   # JDK 12-14 需要
-XX:+UseShenandoahGC               # 启用 Shenandoah

# 堆内存设置
-Xms4g                             # 初始堆大小
-Xmx8g                             # 最大堆大小
```

### Shenandoah 特定参数

```bash
# 回收策略
-XX:ShenandoahGCHeuristics=adaptive    # 自适应策略（默认）
# 可选值：adaptive, static, aggressive, compact, passive

# 区域大小
-XX:ShenandoahRegionSize=32m           # 区域大小（默认自动计算）

# 并发线程数
-XX:ConcGCThreads=4                    # 并发 GC 线程数

# 触发条件
-XX:ShenandoahAllocSpikeFactor=10      # 分配峰值因子
-XX:ShenandoahGarbageThreshold=60      # 垃圾阈值百分比
```

### 调优参数

```bash
# 性能调优
-XX:+ShenandoahOptimizeInstanceFinals  # 优化实例 final 字段
-XX:+ShenandoahOptimizeStaticFinals    # 优化静态 final 字段
-XX:+ShenandoahElasticTLAB             # 弹性 TLAB

# 内存管理
-XX:ShenandoahMinFreeThreshold=10      # 最小空闲阈值
-XX:ShenandoahMaxFreeThreshold=25      # 最大空闲阈值

# 并发控制
-XX:ShenandoahPacingMaxDelay=10        # 最大延迟控制
```

### 监控参数

```bash
# GC 日志
-Xlog:gc*:gc.log                       # 基础 GC 日志
-Xlog:gc*,safepoint:gc.log             # 包含安全点信息

# Shenandoah 特定日志
-Xlog:gc+heap=info                     # 堆信息
-Xlog:gc+ergo=debug                    # 启发式信息
-Xlog:gc+regions=trace                 # 区域详细信息

# 统计信息
-XX:+ShenandoahPrintStatistics         # 打印统计信息
-XX:+ShenandoahPrintRegionRememberedSet # 打印记忆集信息
```

### 不同场景配置

#### 低延迟优先

```bash
-XX:+UseShenandoahGC
-XX:ShenandoahGCHeuristics=aggressive
-XX:ShenandoahGarbageThreshold=30
-XX:+ShenandoahOptimizeInstanceFinals
-XX:+ShenandoahOptimizeStaticFinals
```

#### 吞吐量平衡

```bash
-XX:+UseShenandoahGC
-XX:ShenandoahGCHeuristics=adaptive
-XX:ShenandoahGarbageThreshold=60
-XX:ShenandoahAllocSpikeFactor=5
```

#### 大堆优化

```bash
-XX:+UseShenandoahGC
-XX:ShenandoahRegionSize=64m
-XX:ShenandoahGCHeuristics=static
-XX:+ShenandoahElasticTLAB
```

## 监控与调优

### 关键指标

1. **停顿时间**：
   - 各阶段停顿时间
   - 总停顿时间
   - 停顿时间分布

2. **并发性能**：
   - 并发标记时间
   - 并发回收时间
   - 并发更新引用时间

3. **内存使用**：
   - 堆使用率
   - 区域利用率
   - 垃圾回收效率

4. **吞吐量影响**：
   - 应用吞吐量
   - GC 开销比例
   - CPU 使用率

### 监控工具

#### JVM 内置工具

```bash
# 查看 GC 统计
jstat -gc <pid> 1s

# 查看 Shenandoah 特定信息
jcmd <pid> GC.run_finalization
jcmd <pid> VM.info

# 生成堆转储
jcmd <pid> GC.dump_heap heap.hprof
```

#### 自定义监控

```java
// Shenandoah 监控示例
public class ShenandoahMonitor {
    private final List<GarbageCollectorMXBean> gcBeans;
    private final MemoryMXBean memoryBean;
    
    public ShenandoahMonitor() {
        this.gcBeans = ManagementFactory.getGarbageCollectorMXBeans();
        this.memoryBean = ManagementFactory.getMemoryMXBean();
    }
    
    public void printGCStatistics() {
        for (GarbageCollectorMXBean gcBean : gcBeans) {
            if (gcBean.getName().contains("Shenandoah")) {
                System.out.println("Shenandoah GC Statistics:");
                System.out.println("  Collection Count: " + gcBean.getCollectionCount());
                System.out.println("  Collection Time: " + gcBean.getCollectionTime() + "ms");
                
                if (gcBean.getCollectionCount() > 0) {
                    double avgTime = (double) gcBean.getCollectionTime() / gcBean.getCollectionCount();
                    System.out.println("  Average Time: " + String.format("%.2f", avgTime) + "ms");
                }
            }
        }
        
        MemoryUsage heapUsage = memoryBean.getHeapMemoryUsage();
        System.out.println("Heap Usage: " + 
                          heapUsage.getUsed() / 1024 / 1024 + "MB / " +
                          heapUsage.getMax() / 1024 / 1024 + "MB");
    }
}
```

### 性能调优指南

#### 1. 停顿时间优化

```bash
# 如果停顿时间过长
-XX:ShenandoahGCHeuristics=aggressive  # 更激进的回收
-XX:ShenandoahGarbageThreshold=30      # 降低垃圾阈值
-XX:+ShenandoahOptimizeInstanceFinals  # 启用优化
```

#### 2. 吞吐量优化

```bash
# 如果吞吐量不足
-XX:ShenandoahGCHeuristics=adaptive    # 自适应策略
-XX:ShenandoahGarbageThreshold=70      # 提高垃圾阈值
-XX:ShenandoahAllocSpikeFactor=5       # 调整分配因子
```

#### 3. 内存使用优化

```bash
# 如果内存使用效率低
-XX:ShenandoahRegionSize=16m           # 调整区域大小
-XX:+ShenandoahElasticTLAB             # 启用弹性 TLAB
-XX:ShenandoahMinFreeThreshold=5       # 降低空闲阈值
```

## 典型应用场景

### 1. 低延迟应用

- **金融交易系统**：要求极低的延迟
- **实时游戏服务器**：需要稳定的响应时间
- **在线广告系统**：对延迟敏感的竞价系统

### 2. 大内存应用

- **大数据处理**：处理大量数据的应用
- **缓存系统**：大内存缓存服务
- **搜索引擎**：大索引内存应用

### 3. 高并发应用

- **Web 服务器**：高并发 Web 应用
- **微服务架构**：大量微服务实例
- **消息队列**：高吞吐量消息处理

## 与其他 GC 对比

| 特性 | Shenandoah | G1 GC | ZGC | CMS |
|------|------------|-------|-----|-----|
| 停顿时间 | < 10ms | < 200ms | < 10ms | 不可控 |
| 堆大小影响 | 无关 | 相关 | 无关 | 相关 |
| 并发回收 | 是 | 部分 | 是 | 否 |
| 内存开销 | 中等 | 低 | 高 | 低 |
| 吞吐量 | 中等 | 高 | 中等 | 高 |
| 成熟度 | 较新 | 成熟 | 最新 | 成熟 |
| 调优复杂度 | 低 | 中等 | 低 | 高 |

## 最佳实践

### 1. 选择标准

- **延迟要求**：需要可预测的低延迟
- **堆大小**：中到大型堆（> 4GB）
- **应用类型**：延迟敏感的应用
- **并发需求**：高并发访问模式

### 2. 配置建议

- **启动配置**：使用默认的自适应策略
- **监控观察**：观察停顿时间和吞吐量
- **逐步调优**：根据监控结果调整参数
- **压力测试**：在生产环境前充分测试

### 3. 注意事项

- **JIT 编译器**：确保 JIT 支持 Shenandoah
- **应用适配**：某些应用可能需要适配
- **监控工具**：使用支持 Shenandoah 的监控工具
- **版本选择**：使用稳定版本的 JDK

### 4. 迁移建议

- **逐步迁移**：先在测试环境验证
- **性能对比**：与现有 GC 进行对比
- **监控部署**：部署完整的监控体系
- **回滚准备**：准备回滚到原 GC 的方案

## 故障排查

### 常见问题

1. **停顿时间过长**：
   ```
   原因：回收集合过大或并发线程不足
   解决：
   - 调整 ShenandoahGarbageThreshold
   - 增加 ConcGCThreads
   - 使用 aggressive 策略
   ```

2. **吞吐量下降**：
   ```
   原因：并发开销过大或回收过于频繁
   解决：
   - 提高垃圾阈值
   - 调整分配因子
   - 优化应用内存使用
   ```

3. **内存使用效率低**：
   ```
   原因：区域大小不合适或碎片过多
   解决：
   - 调整区域大小
   - 启用弹性 TLAB
   - 检查对象分配模式
   ```

### 诊断工具

```bash
# GC 日志分析
-Xlog:gc*:gc.log

# Shenandoah 特定日志
-Xlog:gc+regions=trace
-Xlog:gc+ergo=debug

# 性能分析
jprofiler 或 async-profiler

# 堆分析
jmap -dump:format=b,file=heap.hprof <pid>
```

## 发展历程与未来

### 历史发展

- **2014**：Red Hat 开始开发
- **JDK 12**：首次作为实验性功能引入
- **JDK 15**：成为正式功能
- **持续改进**：性能和稳定性不断提升

### 技术创新

- **Brooks 指针**：实现并发移动的关键技术
- **区域化管理**：灵活的内存管理策略
- **自适应启发式**：智能的回收策略
- **优化的写屏障**：减少性能开销

### 未来发展

- **性能优化**：进一步减少开销
- **功能增强**：支持更多特性
- **生态完善**：更好的工具支持
- **广泛应用**：在更多场景中应用

## 总结

Shenandoah GC 是一款专注于低延迟的现代垃圾回收器，通过 Brooks 指针技术实现了真正的并发回收，能够在不停止应用程序的情况下移动对象。它的设计目标是实现可预测的低停顿时间，无论堆大小如何都能将停顿时间控制在 10ms 以内。

Shenandoah 特别适合对延迟敏感的应用，如金融交易系统、实时游戏服务器和在线广告系统。虽然它在吞吐量方面可能不如传统的吞吐量优先的垃圾回收器，但在需要可预测低延迟的场景中，Shenandoah 提供了优秀的解决方案。

随着技术的不断发展和优化，Shenandoah GC 正在成为现代 Java 应用中越来越重要的选择，特别是在云原生和微服务架构中，其低延迟特性显得尤为重要。