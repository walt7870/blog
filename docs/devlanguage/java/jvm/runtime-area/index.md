# Java 运行时数据区域

## 概述

Java 虚拟机（JVM）在执行 Java 程序时，会将内存划分为若干个不同的数据区域。这些区域有各自的用途、创建和销毁时间，有的区域随着虚拟机进程的启动而存在，有些区域则依赖用户线程的启动和结束而建立和销毁。

## 运行时数据区域结构

```
┌─────────────────────────────────────────────────────────────┐
│                        JVM 运行时数据区域                      │
├─────────────────────────────────────────────────────────────┤
│                      线程共享区域                             │
│  ┌─────────────────┐    ┌─────────────────────────────────┐  │
│  │     方法区       │    │            堆内存               │  │
│  │   (Method Area) │    │           (Heap)               │  │
│  │                 │    │                                 │  │
│  │ • 类信息        │    │ • 新生代 (Young Generation)     │  │
│  │ • 常量池        │    │   - Eden 区                     │  │
│  │ • 静态变量      │    │   - Survivor 0/1 区             │  │
│  │ • 即时编译代码  │    │ • 老年代 (Old Generation)       │  │
│  └─────────────────┘    └─────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                      线程私有区域                             │
│  ┌─────────────────┐    ┌─────────────────────────────────┐  │
│  │    程序计数器    │    │           虚拟机栈               │  │
│  │      (PC)       │    │        (VM Stack)              │  │
│  └─────────────────┘    └─────────────────────────────────┘  │
│                         ┌─────────────────────────────────┐  │
│                         │           本地方法栈             │  │
│                         │      (Native Method Stack)     │  │
│                         └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 内存区域分类

### 线程共享区域

这些区域在虚拟机启动时创建，在虚拟机退出时销毁，被所有线程共享：

- **[堆内存 (Heap)](./heap.md)** - 存储对象实例和数组
- **[方法区 (Method Area)](./method-area.md)** - 存储类信息、常量、静态变量等

### 线程私有区域

这些区域随线程创建而创建，随线程结束而销毁，每个线程都有独立的实例：

- **[程序计数器 (Program Counter Register)](./program-counter.md)** - 记录当前线程执行的字节码行号
- **[虚拟机栈 (Java Virtual Machine Stack)](./vm-stack.md)** - 存储局部变量、操作数栈等
- **[本地方法栈 (Native Method Stack)](./native-method-stack.md)** - 为本地方法服务

## 内存分配与回收

### 对象创建流程

```java
// 对象创建示例
String str = new String("Hello World");

// 内存分配过程：
// 1. 检查类是否已加载到方法区
// 2. 在堆中分配内存空间
// 3. 初始化对象
// 4. 将引用存储在栈中
```

### 垃圾回收机制

```java
public class GCExample {
    public static void main(String[] args) {
        // 在堆中创建对象
        List<String> list = new ArrayList<>();
        
        for (int i = 0; i < 1000; i++) {
            list.add("Item " + i);
        }
        
        // 当 list 超出作用域时，对象变为垃圾回收候选
        list = null;
        
        // 建议进行垃圾回收（仅建议，不保证立即执行）
        System.gc();
    }
}
```

## 内存溢出异常

### 常见的内存溢出类型

1. **堆内存溢出 (OutOfMemoryError: Java heap space)**
```java
public class HeapOOM {
    static class OOMObject {}
    
    public static void main(String[] args) {
        List<OOMObject> list = new ArrayList<>();
        while (true) {
            list.add(new OOMObject());
        }
    }
}
```

2. **栈溢出 (StackOverflowError)**
```java
public class StackSOF {
    private int stackLength = 1;
    
    public void stackLeak() {
        stackLength++;
        stackLeak(); // 无限递归
    }
    
    public static void main(String[] args) {
        StackSOF sof = new StackSOF();
        try {
            sof.stackLeak();
        } catch (Throwable e) {
            System.out.println("Stack length: " + sof.stackLength);
            throw e;
        }
    }
}
```

3. **方法区溢出 (OutOfMemoryError: Metaspace)**
```java
public class MethodAreaOOM {
    public static void main(String[] args) {
        while (true) {
            Enhancer enhancer = new Enhancer();
            enhancer.setSuperclass(OOMObject.class);
            enhancer.setUseCache(false);
            enhancer.setCallback(new MethodInterceptor() {
                public Object intercept(Object obj, Method method, 
                                      Object[] args, MethodProxy proxy) {
                    return proxy.invokeSuper(obj, args);
                }
            });
            enhancer.create();
        }
    }
    
    static class OOMObject {}
}
```

## JVM 参数配置

### 堆内存配置

```bash
# 设置堆的初始大小和最大大小
-Xms512m -Xmx2g

# 设置新生代大小
-Xmn256m

# 设置新生代与老年代的比例
-XX:NewRatio=3

# 设置 Eden 区与 Survivor 区的比例
-XX:SurvivorRatio=8
```

### 栈内存配置

```bash
# 设置每个线程的栈大小
-Xss256k
```

### 方法区配置

```bash
# JDK 8+ 设置 Metaspace 大小
-XX:MetaspaceSize=128m
-XX:MaxMetaspaceSize=512m

# JDK 7 及以前设置永久代大小
-XX:PermSize=128m
-XX:MaxPermSize=512m
```

## 内存监控与分析

### 使用 JVM 工具监控内存

```bash
# 查看堆内存使用情况
jstat -gc <pid>

# 生成堆转储文件
jmap -dump:format=b,file=heap.hprof <pid>

# 查看类加载情况
jstat -class <pid>

# 实时监控 GC 情况
jstat -gc <pid> 1000
```

### 内存分析示例

```java
public class MemoryAnalysis {
    public static void main(String[] args) {
        // 获取运行时信息
        Runtime runtime = Runtime.getRuntime();
        
        // 总内存
        long totalMemory = runtime.totalMemory();
        
        // 空闲内存
        long freeMemory = runtime.freeMemory();
        
        // 最大内存
        long maxMemory = runtime.maxMemory();
        
        // 已使用内存
        long usedMemory = totalMemory - freeMemory;
        
        System.out.println("总内存: " + totalMemory / 1024 / 1024 + " MB");
        System.out.println("已使用: " + usedMemory / 1024 / 1024 + " MB");
        System.out.println("空闲内存: " + freeMemory / 1024 / 1024 + " MB");
        System.out.println("最大内存: " + maxMemory / 1024 / 1024 + " MB");
    }
}
```

## 性能优化建议

### 1. 合理设置堆大小

- 初始堆大小（-Xms）和最大堆大小（-Xmx）设置为相同值，避免动态扩容
- 根据应用特点调整新生代和老年代比例

### 2. 选择合适的垃圾收集器

```bash
# 并行收集器（适合吞吐量优先）
-XX:+UseParallelGC

# G1 收集器（适合低延迟）
-XX:+UseG1GC

# ZGC 收集器（超低延迟）
-XX:+UseZGC
```

### 3. 监控和调优

- 定期监控内存使用情况
- 分析 GC 日志，优化 GC 参数
- 使用内存分析工具定位内存泄漏

## 最佳实践

### 1. 避免内存泄漏

```java
public class MemoryLeakPrevention {
    // 正确：使用 WeakReference 避免内存泄漏
    private static final Map<String, WeakReference<Object>> cache = 
        new ConcurrentHashMap<>();
    
    // 错误：静态集合持有对象引用可能导致内存泄漏
    // private static final List<Object> staticList = new ArrayList<>();
    
    public void addToCache(String key, Object value) {
        cache.put(key, new WeakReference<>(value));
    }
    
    public Object getFromCache(String key) {
        WeakReference<Object> ref = cache.get(key);
        return ref != null ? ref.get() : null;
    }
}
```

### 2. 合理使用对象池

```java
public class ObjectPoolExample {
    private final Queue<StringBuilder> pool = new ConcurrentLinkedQueue<>();
    private final int maxSize = 100;
    
    public StringBuilder borrowObject() {
        StringBuilder sb = pool.poll();
        return sb != null ? sb.setLength(0) : new StringBuilder();
    }
    
    public void returnObject(StringBuilder sb) {
        if (pool.size() < maxSize) {
            pool.offer(sb);
        }
    }
}
```

### 3. 及时释放资源

```java
public class ResourceManagement {
    public void processFile(String filename) {
        // 使用 try-with-resources 自动关闭资源
        try (FileInputStream fis = new FileInputStream(filename);
             BufferedInputStream bis = new BufferedInputStream(fis)) {
            
            // 处理文件内容
            byte[] buffer = new byte[1024];
            int bytesRead;
            while ((bytesRead = bis.read(buffer)) != -1) {
                // 处理数据
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
```

## 总结

Java 运行时数据区域是 JVM 内存管理的核心，理解各个区域的作用和特点对于：

- **性能优化** - 合理配置内存参数
- **问题诊断** - 快速定位内存相关问题
- **应用设计** - 编写内存友好的代码

都具有重要意义。通过深入理解运行时数据区域，开发者可以更好地优化应用性能，避免内存相关的问题。

## 相关链接

- [堆内存详解](./heap.md)
- [方法区详解](./method-area.md)
- [虚拟机栈详解](./vm-stack.md)
- [程序计数器详解](./program-counter.md)
- [本地方法栈详解](./native-method-stack.md)