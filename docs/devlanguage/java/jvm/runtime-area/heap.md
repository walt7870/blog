# 堆内存 (Heap)

## 概述

堆内存是 Java 虚拟机所管理的内存中最大的一块，是所有线程共享的内存区域。堆内存在虚拟机启动时创建，用于存储对象实例和数组。堆内存是垃圾收集器管理的主要区域，因此也被称为"GC 堆"。

## 堆内存结构

### 分代收集理论

现代 JVM 基于分代收集理论设计堆内存结构：

```
┌─────────────────────────────────────────────────────────────┐
│                          堆内存 (Heap)                        │
├─────────────────────────────────────────────────────────────┤
│                    新生代 (Young Generation)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │   Eden 区   │  │ Survivor 0  │  │    Survivor 1       │   │
│  │             │  │     (S0)    │  │       (S1)          │   │
│  │   新对象     │  │   存活对象   │  │     存活对象         │   │
│  │   分配区     │  │   暂存区     │  │     暂存区           │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    老年代 (Old Generation)                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    长期存活对象                          │ │
│  │                    大对象直接分配                        │ │
│  │                    从新生代晋升的对象                    │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 各区域详解

#### 1. Eden 区
- **作用**：新创建的对象首先在 Eden 区分配内存
- **特点**：分配速度快，使用指针碰撞方式分配
- **回收**：当 Eden 区满时触发 Minor GC

#### 2. Survivor 区 (S0/S1)
- **作用**：存放经过一次 Minor GC 后仍然存活的对象
- **特点**：两个 Survivor 区交替使用，保证其中一个始终为空
- **晋升**：对象在 Survivor 区经过多次 GC 后晋升到老年代

#### 3. 老年代 (Old Generation)
- **作用**：存放长期存活的对象和大对象
- **特点**：空间大，回收频率低
- **回收**：当老年代满时触发 Major GC 或 Full GC

## 对象分配策略

### 1. 对象优先在 Eden 区分配

```java
public class EdenAllocation {
    private static final int _1MB = 1024 * 1024;
    
    public static void testAllocation() {
        byte[] allocation1, allocation2, allocation3, allocation4;
        
        // 在 Eden 区分配
        allocation1 = new byte[2 * _1MB];
        allocation2 = new byte[2 * _1MB];
        allocation3 = new byte[2 * _1MB];
        
        // 出现第一次 Minor GC
        allocation4 = new byte[4 * _1MB];
    }
}
```

### 2. 大对象直接进入老年代

```java
public class LargeObjectAllocation {
    private static final int _1MB = 1024 * 1024;
    
    public static void testPretenureSizeThreshold() {
        // 大对象直接分配到老年代
        // -XX:PretenureSizeThreshold=3145728 (3MB)
        byte[] allocation = new byte[4 * _1MB];
    }
}
```

### 3. 长期存活对象进入老年代

```java
public class ObjectAging {
    private static final int _1MB = 1024 * 1024;
    
    public static void testTenuringThreshold() {
        byte[] allocation1, allocation2, allocation3;
        
        allocation1 = new byte[_1MB / 4];
        
        // allocation1 + allocation2 + allocation3 > Eden 空间
        // 触发 Minor GC，allocation1 进入 Survivor
        allocation2 = new byte[4 * _1MB];
        allocation3 = new byte[4 * _1MB];
        
        // 再次触发 Minor GC，allocation1 年龄增加
        allocation3 = null;
        allocation3 = new byte[4 * _1MB];
    }
}
```

### 4. 动态对象年龄判定

```java
public class DynamicAging {
    private static final int _1MB = 1024 * 1024;
    
    public static void testTenuringThreshold2() {
        byte[] allocation1, allocation2, allocation3, allocation4;
        
        allocation1 = new byte[_1MB / 4];
        allocation2 = new byte[_1MB / 4];
        
        // 如果 Survivor 中相同年龄对象大小总和 > Survivor 空间一半
        // 则年龄 >= 该年龄的对象直接进入老年代
        allocation3 = new byte[4 * _1MB];
        allocation4 = new byte[4 * _1MB];
        allocation4 = null;
        allocation4 = new byte[4 * _1MB];
    }
}
```

## 垃圾收集算法

### 1. 标记-清除算法 (Mark-Sweep)

```java
// 伪代码示例
public class MarkSweepGC {
    public void gc() {
        // 标记阶段：标记所有可达对象
        markReachableObjects();
        
        // 清除阶段：回收未标记对象
        sweepUnmarkedObjects();
    }
    
    private void markReachableObjects() {
        // 从 GC Roots 开始标记
        for (Object root : gcRoots) {
            mark(root);
        }
    }
    
    private void mark(Object obj) {
        if (obj != null && !obj.isMarked()) {
            obj.setMarked(true);
            // 递归标记引用的对象
            for (Object ref : obj.getReferences()) {
                mark(ref);
            }
        }
    }
}
```

### 2. 复制算法 (Copying)

```java
// 新生代使用的复制算法
public class CopyingGC {
    private Object[] fromSpace;
    private Object[] toSpace;
    
    public void minorGC() {
        // 将存活对象从 from 空间复制到 to 空间
        copyLiveObjects(fromSpace, toSpace);
        
        // 交换 from 和 to 空间
        Object[] temp = fromSpace;
        fromSpace = toSpace;
        toSpace = temp;
        
        // 清空新的 to 空间
        clearSpace(toSpace);
    }
}
```

### 3. 标记-整理算法 (Mark-Compact)

```java
// 老年代使用的标记-整理算法
public class MarkCompactGC {
    public void majorGC() {
        // 标记阶段
        markReachableObjects();
        
        // 整理阶段：移动存活对象到内存一端
        compactLiveObjects();
        
        // 更新引用
        updateReferences();
    }
}
```

## 堆内存配置参数

### 基本配置

```bash
# 设置堆的初始大小
-Xms512m

# 设置堆的最大大小
-Xmx2g

# 设置新生代大小
-Xmn256m

# 设置新生代与老年代的比例 (1:3)
-XX:NewRatio=3

# 设置 Eden 区与 Survivor 区的比例 (8:1:1)
-XX:SurvivorRatio=8
```

### 高级配置

```bash
# 设置大对象阈值
-XX:PretenureSizeThreshold=3145728

# 设置对象晋升老年代的年龄阈值
-XX:MaxTenuringThreshold=15

# 设置 Survivor 区使用率阈值
-XX:TargetSurvivorRatio=50

# 启用自适应大小策略
-XX:+UseAdaptiveSizePolicy
```

## 内存分配示例

### 1. TLAB (Thread Local Allocation Buffer)

```java
public class TLABExample {
    public static void main(String[] args) {
        // 每个线程都有自己的 TLAB
        // 减少多线程分配时的同步开销
        
        Runnable task = () -> {
            for (int i = 0; i < 1000; i++) {
                // 在当前线程的 TLAB 中分配
                Object obj = new Object();
            }
        };
        
        // 启动多个线程
        for (int i = 0; i < 10; i++) {
            new Thread(task).start();
        }
    }
}
```

### 2. 指针碰撞分配

```java
public class PointerBumpAllocation {
    // 模拟指针碰撞分配过程
    private static class SimpleHeap {
        private byte[] memory;
        private int allocPointer;
        
        public SimpleHeap(int size) {
            this.memory = new byte[size];
            this.allocPointer = 0;
        }
        
        public synchronized Object allocate(int size) {
            if (allocPointer + size > memory.length) {
                throw new OutOfMemoryError("Heap space");
            }
            
            int oldPointer = allocPointer;
            allocPointer += size;
            
            // 返回分配的内存地址（简化表示）
            return new Object();
        }
    }
}
```

## 堆内存监控

### 1. 使用 JVM 工具

```bash
# 查看堆内存使用情况
jstat -gc <pid>

# 查看堆内存详细信息
jmap -heap <pid>

# 生成堆转储文件
jmap -dump:format=b,file=heap.hprof <pid>

# 查看堆中对象统计
jmap -histo <pid>
```

### 2. 编程方式监控

```java
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.MemoryUsage;

public class HeapMonitor {
    public static void printHeapInfo() {
        MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
        
        // 堆内存使用情况
        MemoryUsage heapUsage = memoryBean.getHeapMemoryUsage();
        
        System.out.println("堆内存信息:");
        System.out.println("初始大小: " + heapUsage.getInit() / 1024 / 1024 + " MB");
        System.out.println("已使用: " + heapUsage.getUsed() / 1024 / 1024 + " MB");
        System.out.println("已提交: " + heapUsage.getCommitted() / 1024 / 1024 + " MB");
        System.out.println("最大大小: " + heapUsage.getMax() / 1024 / 1024 + " MB");
        
        // 非堆内存使用情况
        MemoryUsage nonHeapUsage = memoryBean.getNonHeapMemoryUsage();
        System.out.println("\n非堆内存信息:");
        System.out.println("已使用: " + nonHeapUsage.getUsed() / 1024 / 1024 + " MB");
        System.out.println("已提交: " + nonHeapUsage.getCommitted() / 1024 / 1024 + " MB");
    }
    
    public static void main(String[] args) {
        printHeapInfo();
        
        // 分配一些对象
        List<byte[]> list = new ArrayList<>();
        for (int i = 0; i < 100; i++) {
            list.add(new byte[1024 * 1024]); // 1MB
        }
        
        System.out.println("\n分配对象后:");
        printHeapInfo();
    }
}
```

## 常见问题与解决方案

### 1. 堆内存溢出 (OutOfMemoryError)

```java
public class HeapOOMSolution {
    // 问题：创建过多对象导致堆溢出
    public static void causeOOM() {
        List<byte[]> list = new ArrayList<>();
        while (true) {
            list.add(new byte[1024 * 1024]); // 持续分配 1MB
        }
    }
    
    // 解决方案1：及时释放不需要的对象引用
    public static void solution1() {
        List<byte[]> list = new ArrayList<>();
        for (int i = 0; i < 100; i++) {
            byte[] data = new byte[1024 * 1024];
            // 处理数据
            processData(data);
            // 不添加到 list 中，让对象可以被 GC
        }
    }
    
    // 解决方案2：使用对象池
    public static void solution2() {
        Queue<byte[]> pool = new ConcurrentLinkedQueue<>();
        
        for (int i = 0; i < 100; i++) {
            byte[] data = pool.poll();
            if (data == null) {
                data = new byte[1024 * 1024];
            }
            
            // 处理数据
            processData(data);
            
            // 归还到对象池
            pool.offer(data);
        }
    }
    
    private static void processData(byte[] data) {
        // 模拟数据处理
    }
}
```

### 2. 内存泄漏检测

```java
public class MemoryLeakDetection {
    // 常见内存泄漏：静态集合持有对象引用
    private static final List<Object> staticList = new ArrayList<>();
    
    // 问题代码
    public void addToStaticList(Object obj) {
        staticList.add(obj); // 对象永远不会被 GC
    }
    
    // 解决方案：使用 WeakReference
    private static final List<WeakReference<Object>> weakList = new ArrayList<>();
    
    public void addToWeakList(Object obj) {
        weakList.add(new WeakReference<>(obj));
        
        // 定期清理失效的 WeakReference
        weakList.removeIf(ref -> ref.get() == null);
    }
    
    // 监听器内存泄漏
    public class EventSource {
        private List<EventListener> listeners = new ArrayList<>();
        
        public void addListener(EventListener listener) {
            listeners.add(listener);
        }
        
        // 重要：提供移除监听器的方法
        public void removeListener(EventListener listener) {
            listeners.remove(listener);
        }
    }
}
```

## 性能优化建议

### 1. 堆大小调优

```bash
# 生产环境推荐配置
-Xms4g -Xmx4g          # 设置相同的初始和最大堆大小
-Xmn1g                 # 新生代设置为堆大小的 1/4
-XX:SurvivorRatio=8    # Eden:S0:S1 = 8:1:1
-XX:MaxTenuringThreshold=15  # 最大年龄阈值
```

### 2. 对象分配优化

```java
public class AllocationOptimization {
    // 优化1：重用对象
    private StringBuilder sb = new StringBuilder();
    
    public String buildString(String... parts) {
        sb.setLength(0); // 清空而不是创建新对象
        for (String part : parts) {
            sb.append(part);
        }
        return sb.toString();
    }
    
    // 优化2：使用基本类型数组而不是包装类型
    public void useIntArray() {
        int[] array = new int[1000];     // 推荐
        // Integer[] array = new Integer[1000]; // 避免
    }
    
    // 优化3：延迟初始化
    private List<String> expensiveList;
    
    public List<String> getExpensiveList() {
        if (expensiveList == null) {
            expensiveList = new ArrayList<>();
            // 初始化逻辑
        }
        return expensiveList;
    }
}
```

### 3. GC 调优

```bash
# G1 垃圾收集器配置
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200
-XX:G1HeapRegionSize=16m

# 并行垃圾收集器配置
-XX:+UseParallelGC
-XX:ParallelGCThreads=8

# CMS 垃圾收集器配置（已废弃）
-XX:+UseConcMarkSweepGC
-XX:CMSInitiatingOccupancyFraction=75
```

## 总结

堆内存是 Java 应用程序性能的关键因素：

1. **理解分代模型** - 新生代和老年代的不同特点和用途
2. **合理配置参数** - 根据应用特点调整堆大小和比例
3. **监控内存使用** - 定期检查内存使用情况和 GC 性能
4. **优化对象分配** - 减少不必要的对象创建，重用对象
5. **防止内存泄漏** - 及时释放不需要的对象引用

通过深入理解堆内存的工作原理和优化技巧，可以显著提升 Java 应用程序的性能和稳定性。