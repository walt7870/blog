# 直接内存 (Direct Memory)

## 概述

直接内存（Direct Memory）并不是虚拟机运行时数据区的一部分，也不是《Java虚拟机规范》中定义的内存区域。但是这部分内存也被频繁地使用，而且也可能导致 OutOfMemoryError 异常出现。

直接内存是通过 JNI 在堆外分配的内存，这些内存不受 JVM 堆大小限制，但受到本机总内存大小以及处理器寻址空间的限制。

## 基本特性

### 1. 内存分配方式

```java
import java.nio.ByteBuffer;
import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;
import java.io.RandomAccessFile;
import java.lang.reflect.Method;

public class DirectMemoryBasics {
    
    public static void demonstrateDirectMemoryAllocation() {
        System.out.println("=== 直接内存分配演示 ===");
        
        // 1. 通过 ByteBuffer.allocateDirect() 分配
        int bufferSize = 1024 * 1024; // 1MB
        ByteBuffer directBuffer = ByteBuffer.allocateDirect(bufferSize);
        
        System.out.println("直接缓冲区信息:");
        System.out.println("  容量: " + directBuffer.capacity() + " bytes");
        System.out.println("  是否为直接缓冲区: " + directBuffer.isDirect());
        System.out.println("  剩余空间: " + directBuffer.remaining() + " bytes");
        
        // 2. 对比堆内缓冲区
        ByteBuffer heapBuffer = ByteBuffer.allocate(bufferSize);
        
        System.out.println("\n堆内缓冲区信息:");
        System.out.println("  容量: " + heapBuffer.capacity() + " bytes");
        System.out.println("  是否为直接缓冲区: " + heapBuffer.isDirect());
        System.out.println("  剩余空间: " + heapBuffer.remaining() + " bytes");
        
        // 3. 写入数据测试
        String testData = "Hello Direct Memory! ";
        byte[] dataBytes = testData.getBytes();
        
        // 向直接缓冲区写入数据
        for (int i = 0; i < 100; i++) {
            directBuffer.put(dataBytes);
        }
        
        System.out.println("\n写入数据后:");
        System.out.println("  直接缓冲区位置: " + directBuffer.position());
        System.out.println("  直接缓冲区剩余: " + directBuffer.remaining());
        
        // 4. 读取数据
        directBuffer.flip(); // 切换到读模式
        byte[] readBuffer = new byte[dataBytes.length];
        directBuffer.get(readBuffer);
        
        System.out.println("  读取的数据: " + new String(readBuffer));
    }
    
    // 演示内存映射文件
    public static void demonstrateMemoryMappedFile() {
        System.out.println("\n=== 内存映射文件演示 ===");
        
        try {
            // 创建临时文件
            String fileName = "temp_mapped_file.txt";
            RandomAccessFile file = new RandomAccessFile(fileName, "rw");
            
            // 写入一些数据
            String content = "This is a memory mapped file example. ";
            for (int i = 0; i < 1000; i++) {
                file.writeBytes(content);
            }
            
            long fileSize = file.length();
            System.out.println("文件大小: " + fileSize + " bytes");
            
            // 创建内存映射
            FileChannel channel = file.getChannel();
            MappedByteBuffer mappedBuffer = channel.map(
                FileChannel.MapMode.READ_WRITE, 0, fileSize);
            
            System.out.println("映射缓冲区信息:");
            System.out.println("  容量: " + mappedBuffer.capacity());
            System.out.println("  是否为直接缓冲区: " + mappedBuffer.isDirect());
            System.out.println("  是否已加载: " + mappedBuffer.isLoaded());
            
            // 读取映射文件的前100个字节
            byte[] readData = new byte[100];
            mappedBuffer.get(readData);
            System.out.println("  读取内容: " + new String(readData));
            
            // 修改映射文件
            mappedBuffer.position(0);
            mappedBuffer.put("MODIFIED: ".getBytes());
            mappedBuffer.force(); // 强制同步到磁盘
            
            // 清理资源
            channel.close();
            file.close();
            
            // 删除临时文件
            new java.io.File(fileName).delete();
            
        } catch (Exception e) {
            System.err.println("内存映射文件操作失败: " + e.getMessage());
        }
    }
    
    // 监控直接内存使用
    public static void monitorDirectMemoryUsage() {
        System.out.println("\n=== 直接内存使用监控 ===");
        
        try {
            // 获取直接内存使用情况（通过反射）
            Class<?> vmClass = Class.forName("sun.misc.VM");
            Method maxDirectMemoryMethod = vmClass.getMethod("maxDirectMemory");
            long maxDirectMemory = (Long) maxDirectMemoryMethod.invoke(null);
            
            System.out.println("最大直接内存: " + (maxDirectMemory / 1024 / 1024) + " MB");
            
            // 通过 MXBean 获取直接内存使用情况
            java.lang.management.MemoryMXBean memoryBean = 
                java.lang.management.ManagementFactory.getMemoryMXBean();
            
            java.util.List<java.lang.management.MemoryPoolMXBean> memoryPools = 
                java.lang.management.ManagementFactory.getMemoryPoolMXBeans();
            
            for (java.lang.management.MemoryPoolMXBean pool : memoryPools) {
                if (pool.getName().contains("Direct")) {
                    java.lang.management.MemoryUsage usage = pool.getUsage();
                    System.out.println("直接内存池: " + pool.getName());
                    System.out.println("  已使用: " + (usage.getUsed() / 1024 / 1024) + " MB");
                    System.out.println("  已提交: " + (usage.getCommitted() / 1024 / 1024) + " MB");
                    if (usage.getMax() > 0) {
                        System.out.println("  最大值: " + (usage.getMax() / 1024 / 1024) + " MB");
                    }
                }
            }
            
        } catch (Exception e) {
            System.err.println("无法获取直接内存信息: " + e.getMessage());
        }
    }
}
```

### 2. 直接内存的优势

```java
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;

public class DirectMemoryAdvantages {
    
    // 性能对比测试
    public static void performanceComparison() {
        System.out.println("=== 直接内存性能对比 ===");
        
        int bufferSize = 1024 * 1024; // 1MB
        int iterations = 1000;
        
        // 1. 直接内存性能测试
        long directTime = testDirectMemoryPerformance(bufferSize, iterations);
        
        // 2. 堆内存性能测试
        long heapTime = testHeapMemoryPerformance(bufferSize, iterations);
        
        System.out.printf("直接内存操作时间: %d ms%n", directTime);
        System.out.printf("堆内存操作时间: %d ms%n", heapTime);
        System.out.printf("性能提升: %.2fx%n", (double) heapTime / directTime);
    }
    
    private static long testDirectMemoryPerformance(int bufferSize, int iterations) {
        ByteBuffer directBuffer = ByteBuffer.allocateDirect(bufferSize);
        
        long startTime = System.currentTimeMillis();
        
        for (int i = 0; i < iterations; i++) {
            directBuffer.clear();
            
            // 写入数据
            for (int j = 0; j < bufferSize / 4; j++) {
                directBuffer.putInt(j);
            }
            
            directBuffer.flip();
            
            // 读取数据
            int sum = 0;
            while (directBuffer.hasRemaining()) {
                sum += directBuffer.getInt();
            }
        }
        
        return System.currentTimeMillis() - startTime;
    }
    
    private static long testHeapMemoryPerformance(int bufferSize, int iterations) {
        ByteBuffer heapBuffer = ByteBuffer.allocate(bufferSize);
        
        long startTime = System.currentTimeMillis();
        
        for (int i = 0; i < iterations; i++) {
            heapBuffer.clear();
            
            // 写入数据
            for (int j = 0; j < bufferSize / 4; j++) {
                heapBuffer.putInt(j);
            }
            
            heapBuffer.flip();
            
            // 读取数据
            int sum = 0;
            while (heapBuffer.hasRemaining()) {
                sum += heapBuffer.getInt();
            }
        }
        
        return System.currentTimeMillis() - startTime;
    }
    
    // 文件 I/O 性能对比
    public static void fileIOPerformanceComparison() {
        System.out.println("\n=== 文件 I/O 性能对比 ===");
        
        String sourceFile = "source.txt";
        String directTargetFile = "direct_target.txt";
        String heapTargetFile = "heap_target.txt";
        
        try {
            // 创建测试文件
            createTestFile(sourceFile, 10 * 1024 * 1024); // 10MB
            
            // 使用直接内存复制文件
            long directTime = copyFileWithDirectMemory(sourceFile, directTargetFile);
            
            // 使用堆内存复制文件
            long heapTime = copyFileWithHeapMemory(sourceFile, heapTargetFile);
            
            System.out.printf("直接内存文件复制时间: %d ms%n", directTime);
            System.out.printf("堆内存文件复制时间: %d ms%n", heapTime);
            System.out.printf("性能提升: %.2fx%n", (double) heapTime / directTime);
            
            // 清理测试文件
            new java.io.File(sourceFile).delete();
            new java.io.File(directTargetFile).delete();
            new java.io.File(heapTargetFile).delete();
            
        } catch (IOException e) {
            System.err.println("文件 I/O 测试失败: " + e.getMessage());
        }
    }
    
    private static void createTestFile(String fileName, int size) throws IOException {
        try (FileOutputStream fos = new FileOutputStream(fileName)) {
            byte[] data = new byte[1024];
            java.util.Arrays.fill(data, (byte) 'A');
            
            for (int i = 0; i < size / 1024; i++) {
                fos.write(data);
            }
        }
    }
    
    private static long copyFileWithDirectMemory(String source, String target) throws IOException {
        long startTime = System.currentTimeMillis();
        
        try (FileInputStream fis = new FileInputStream(source);
             FileOutputStream fos = new FileOutputStream(target);
             FileChannel sourceChannel = fis.getChannel();
             FileChannel targetChannel = fos.getChannel()) {
            
            ByteBuffer buffer = ByteBuffer.allocateDirect(64 * 1024); // 64KB
            
            while (sourceChannel.read(buffer) > 0) {
                buffer.flip();
                targetChannel.write(buffer);
                buffer.clear();
            }
        }
        
        return System.currentTimeMillis() - startTime;
    }
    
    private static long copyFileWithHeapMemory(String source, String target) throws IOException {
        long startTime = System.currentTimeMillis();
        
        try (FileInputStream fis = new FileInputStream(source);
             FileOutputStream fos = new FileOutputStream(target);
             FileChannel sourceChannel = fis.getChannel();
             FileChannel targetChannel = fos.getChannel()) {
            
            ByteBuffer buffer = ByteBuffer.allocate(64 * 1024); // 64KB
            
            while (sourceChannel.read(buffer) > 0) {
                buffer.flip();
                targetChannel.write(buffer);
                buffer.clear();
            }
        }
        
        return System.currentTimeMillis() - startTime;
    }
    
    // 零拷贝演示
    public static void demonstrateZeroCopy() {
        System.out.println("\n=== 零拷贝演示 ===");
        
        String sourceFile = "zero_copy_source.txt";
        String targetFile = "zero_copy_target.txt";
        
        try {
            // 创建测试文件
            createTestFile(sourceFile, 5 * 1024 * 1024); // 5MB
            
            long startTime = System.currentTimeMillis();
            
            try (FileInputStream fis = new FileInputStream(sourceFile);
                 FileOutputStream fos = new FileOutputStream(targetFile);
                 FileChannel sourceChannel = fis.getChannel();
                 FileChannel targetChannel = fos.getChannel()) {
                
                // 使用 transferTo 实现零拷贝
                long transferred = sourceChannel.transferTo(0, sourceChannel.size(), targetChannel);
                
                System.out.println("零拷贝传输字节数: " + transferred);
            }
            
            long zeroCopyTime = System.currentTimeMillis() - startTime;
            System.out.printf("零拷贝时间: %d ms%n", zeroCopyTime);
            
            // 清理文件
            new java.io.File(sourceFile).delete();
            new java.io.File(targetFile).delete();
            
        } catch (IOException e) {
            System.err.println("零拷贝测试失败: " + e.getMessage());
        }
    }
}
```

## 内存管理

### 1. 直接内存分配与释放

```java
import java.nio.ByteBuffer;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import sun.misc.Cleaner;

public class DirectMemoryManagement {
    
    // 直接内存分配监控
    public static void demonstrateAllocationTracking() {
        System.out.println("=== 直接内存分配监控 ===");
        
        java.util.List<ByteBuffer> buffers = new java.util.ArrayList<>();
        
        try {
            // 分配多个直接内存缓冲区
            for (int i = 0; i < 10; i++) {
                int size = (i + 1) * 1024 * 1024; // 1MB, 2MB, ..., 10MB
                ByteBuffer buffer = ByteBuffer.allocateDirect(size);
                buffers.add(buffer);
                
                System.out.printf("分配缓冲区 %d: %d MB%n", i + 1, size / 1024 / 1024);
                
                // 监控内存使用
                monitorDirectMemoryUsage();
                
                // 模拟一些操作
                buffer.putInt(0, 0x12345678);
                int value = buffer.getInt(0);
                System.out.printf("  写入/读取测试: 0x%08X%n", value);
            }
            
            System.out.println("\n所有缓冲区分配完成");
            
        } catch (OutOfMemoryError e) {
            System.err.println("直接内存不足: " + e.getMessage());
        }
        
        // 手动释放部分缓冲区
        System.out.println("\n开始释放缓冲区...");
        for (int i = 0; i < buffers.size(); i += 2) {
            ByteBuffer buffer = buffers.get(i);
            releaseDirectMemory(buffer);
            System.out.printf("释放缓冲区 %d%n", i + 1);
        }
        
        // 强制垃圾回收
        System.gc();
        
        try {
            Thread.sleep(1000); // 等待 GC 完成
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        System.out.println("\n垃圾回收后的内存状态:");
        monitorDirectMemoryUsage();
    }
    
    // 手动释放直接内存
    private static void releaseDirectMemory(ByteBuffer buffer) {
        if (buffer.isDirect()) {
            try {
                // 通过反射获取 Cleaner
                Field cleanerField = buffer.getClass().getDeclaredField("cleaner");
                cleanerField.setAccessible(true);
                Cleaner cleaner = (Cleaner) cleanerField.get(buffer);
                
                if (cleaner != null) {
                    cleaner.clean(); // 立即释放内存
                }
            } catch (Exception e) {
                System.err.println("手动释放直接内存失败: " + e.getMessage());
            }
        }
    }
    
    // 内存泄漏检测
    public static void demonstrateMemoryLeakDetection() {
        System.out.println("\n=== 直接内存泄漏检测 ===");
        
        // 记录初始内存状态
        long initialMemory = getDirectMemoryUsed();
        System.out.println("初始直接内存使用: " + (initialMemory / 1024 / 1024) + " MB");
        
        // 模拟内存泄漏
        java.util.List<ByteBuffer> leakedBuffers = new java.util.ArrayList<>();
        
        for (int i = 0; i < 50; i++) {
            ByteBuffer buffer = ByteBuffer.allocateDirect(1024 * 1024); // 1MB
            leakedBuffers.add(buffer);
            
            // 每10次分配检查一次内存
            if ((i + 1) % 10 == 0) {
                long currentMemory = getDirectMemoryUsed();
                long leakedMemory = currentMemory - initialMemory;
                System.out.printf("分配 %d 个缓冲区后，泄漏内存: %d MB%n", 
                                i + 1, leakedMemory / 1024 / 1024);
            }
        }
        
        // 清理泄漏的内存
        System.out.println("\n开始清理泄漏的内存...");
        for (ByteBuffer buffer : leakedBuffers) {
            releaseDirectMemory(buffer);
        }
        leakedBuffers.clear();
        
        // 强制垃圾回收
        System.gc();
        
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        long finalMemory = getDirectMemoryUsed();
        System.out.println("清理后直接内存使用: " + (finalMemory / 1024 / 1024) + " MB");
        System.out.println("内存恢复: " + ((finalMemory - initialMemory) <= 1024 * 1024 ? "成功" : "失败"));
    }
    
    // 获取直接内存使用量
    private static long getDirectMemoryUsed() {
        try {
            java.util.List<java.lang.management.MemoryPoolMXBean> memoryPools = 
                java.lang.management.ManagementFactory.getMemoryPoolMXBeans();
            
            for (java.lang.management.MemoryPoolMXBean pool : memoryPools) {
                if (pool.getName().contains("Direct")) {
                    return pool.getUsage().getUsed();
                }
            }
        } catch (Exception e) {
            // 忽略异常
        }
        return 0;
    }
    
    // 监控直接内存使用情况
    private static void monitorDirectMemoryUsage() {
        try {
            // 获取最大直接内存
            Class<?> vmClass = Class.forName("sun.misc.VM");
            Method maxDirectMemoryMethod = vmClass.getMethod("maxDirectMemory");
            long maxDirectMemory = (Long) maxDirectMemoryMethod.invoke(null);
            
            // 获取已使用的直接内存
            long usedDirectMemory = getDirectMemoryUsed();
            
            double usagePercentage = (double) usedDirectMemory / maxDirectMemory * 100;
            
            System.out.printf("  直接内存使用: %d MB / %d MB (%.1f%%)%n", 
                            usedDirectMemory / 1024 / 1024,
                            maxDirectMemory / 1024 / 1024,
                            usagePercentage);
            
        } catch (Exception e) {
            System.err.println("  无法获取直接内存使用信息: " + e.getMessage());
        }
    }
}
```

### 2. 内存池管理

```java
import java.nio.ByteBuffer;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicLong;

public class DirectMemoryPool {
    private final ConcurrentLinkedQueue<ByteBuffer> pool;
    private final int bufferSize;
    private final int maxPoolSize;
    private final AtomicLong allocatedCount;
    private final AtomicLong pooledCount;
    
    public DirectMemoryPool(int bufferSize, int maxPoolSize) {
        this.pool = new ConcurrentLinkedQueue<>();
        this.bufferSize = bufferSize;
        this.maxPoolSize = maxPoolSize;
        this.allocatedCount = new AtomicLong(0);
        this.pooledCount = new AtomicLong(0);
    }
    
    // 获取缓冲区
    public ByteBuffer acquire() {
        ByteBuffer buffer = pool.poll();
        
        if (buffer == null) {
            // 池中没有可用缓冲区，创建新的
            buffer = ByteBuffer.allocateDirect(bufferSize);
            allocatedCount.incrementAndGet();
            System.out.printf("创建新的直接内存缓冲区，总分配数: %d%n", allocatedCount.get());
        } else {
            pooledCount.decrementAndGet();
            buffer.clear(); // 重置缓冲区状态
            System.out.printf("从池中获取缓冲区，池中剩余: %d%n", pooledCount.get());
        }
        
        return buffer;
    }
    
    // 归还缓冲区
    public void release(ByteBuffer buffer) {
        if (buffer == null || !buffer.isDirect()) {
            return;
        }
        
        if (pooledCount.get() < maxPoolSize) {
            buffer.clear(); // 清理缓冲区
            pool.offer(buffer);
            pooledCount.incrementAndGet();
            System.out.printf("缓冲区归还到池中，池中数量: %d%n", pooledCount.get());
        } else {
            // 池已满，释放缓冲区
            releaseDirectMemory(buffer);
            System.out.println("池已满，直接释放缓冲区");
        }
    }
    
    // 手动释放直接内存
    private void releaseDirectMemory(ByteBuffer buffer) {
        try {
            java.lang.reflect.Field cleanerField = buffer.getClass().getDeclaredField("cleaner");
            cleanerField.setAccessible(true);
            sun.misc.Cleaner cleaner = (sun.misc.Cleaner) cleanerField.get(buffer);
            
            if (cleaner != null) {
                cleaner.clean();
            }
        } catch (Exception e) {
            System.err.println("释放直接内存失败: " + e.getMessage());
        }
    }
    
    // 清空池
    public void clear() {
        ByteBuffer buffer;
        while ((buffer = pool.poll()) != null) {
            releaseDirectMemory(buffer);
        }
        pooledCount.set(0);
        System.out.println("内存池已清空");
    }
    
    // 获取统计信息
    public void printStatistics() {
        System.out.println("\n=== 内存池统计信息 ===");
        System.out.println("缓冲区大小: " + (bufferSize / 1024) + " KB");
        System.out.println("最大池大小: " + maxPoolSize);
        System.out.println("总分配数: " + allocatedCount.get());
        System.out.println("池中数量: " + pooledCount.get());
        System.out.println("池使用率: " + String.format("%.1f%%", 
                          (double) pooledCount.get() / maxPoolSize * 100));
    }
    
    // 演示内存池使用
    public static void demonstrateMemoryPool() {
        System.out.println("=== 直接内存池演示 ===");
        
        DirectMemoryPool pool = new DirectMemoryPool(1024 * 1024, 10); // 1MB 缓冲区，最多10个
        
        java.util.List<ByteBuffer> buffers = new java.util.ArrayList<>();
        
        // 获取多个缓冲区
        System.out.println("\n--- 获取缓冲区 ---");
        for (int i = 0; i < 15; i++) {
            ByteBuffer buffer = pool.acquire();
            buffers.add(buffer);
            
            // 写入一些数据
            buffer.putInt(0, i * 1000);
        }
        
        pool.printStatistics();
        
        // 归还部分缓冲区
        System.out.println("\n--- 归还缓冲区 ---");
        for (int i = 0; i < 8; i++) {
            pool.release(buffers.get(i));
        }
        
        pool.printStatistics();
        
        // 再次获取缓冲区（应该从池中获取）
        System.out.println("\n--- 再次获取缓冲区 ---");
        for (int i = 0; i < 5; i++) {
            ByteBuffer buffer = pool.acquire();
            System.out.println("获取到缓冲区，容量: " + buffer.capacity());
        }
        
        pool.printStatistics();
        
        // 清空池
        pool.clear();
        pool.printStatistics();
    }
}
```

## 应用场景

### 1. NIO 网络编程

```java
import java.nio.ByteBuffer;
import java.nio.channels.ServerSocketChannel;
import java.nio.channels.SocketChannel;
import java.nio.channels.Selector;
import java.nio.channels.SelectionKey;
import java.net.InetSocketAddress;
import java.util.Iterator;

public class DirectMemoryNIOExample {
    
    // NIO 服务器示例
    public static class NIOServer {
        private final int port;
        private final int bufferSize;
        private ServerSocketChannel serverChannel;
        private Selector selector;
        
        public NIOServer(int port, int bufferSize) {
            this.port = port;
            this.bufferSize = bufferSize;
        }
        
        public void start() throws Exception {
            System.out.println("启动 NIO 服务器，端口: " + port);
            
            // 创建服务器通道
            serverChannel = ServerSocketChannel.open();
            serverChannel.configureBlocking(false);
            serverChannel.bind(new InetSocketAddress(port));
            
            // 创建选择器
            selector = Selector.open();
            serverChannel.register(selector, SelectionKey.OP_ACCEPT);
            
            System.out.println("服务器启动完成，等待连接...");
            
            // 事件循环
            while (true) {
                int readyChannels = selector.select(1000);
                
                if (readyChannels == 0) {
                    continue;
                }
                
                Iterator<SelectionKey> keyIterator = selector.selectedKeys().iterator();
                
                while (keyIterator.hasNext()) {
                    SelectionKey key = keyIterator.next();
                    keyIterator.remove();
                    
                    if (key.isAcceptable()) {
                        handleAccept(key);
                    } else if (key.isReadable()) {
                        handleRead(key);
                    }
                }
            }
        }
        
        private void handleAccept(SelectionKey key) throws Exception {
            ServerSocketChannel serverChannel = (ServerSocketChannel) key.channel();
            SocketChannel clientChannel = serverChannel.accept();
            
            if (clientChannel != null) {
                clientChannel.configureBlocking(false);
                
                // 为每个客户端分配直接内存缓冲区
                ByteBuffer buffer = ByteBuffer.allocateDirect(bufferSize);
                clientChannel.register(selector, SelectionKey.OP_READ, buffer);
                
                System.out.println("客户端连接: " + clientChannel.getRemoteAddress());
                System.out.println("分配直接内存缓冲区: " + bufferSize + " bytes");
            }
        }
        
        private void handleRead(SelectionKey key) throws Exception {
            SocketChannel clientChannel = (SocketChannel) key.channel();
            ByteBuffer buffer = (ByteBuffer) key.attachment();
            
            int bytesRead = clientChannel.read(buffer);
            
            if (bytesRead > 0) {
                buffer.flip();
                
                // 处理接收到的数据
                byte[] data = new byte[buffer.remaining()];
                buffer.get(data);
                String message = new String(data);
                
                System.out.println("接收到消息: " + message);
                
                // 回显消息
                buffer.clear();
                buffer.put(("Echo: " + message).getBytes());
                buffer.flip();
                clientChannel.write(buffer);
                
                buffer.clear();
            } else if (bytesRead == -1) {
                // 客户端断开连接
                System.out.println("客户端断开连接: " + clientChannel.getRemoteAddress());
                key.cancel();
                clientChannel.close();
            }
        }
        
        public void stop() throws Exception {
            if (selector != null) {
                selector.close();
            }
            if (serverChannel != null) {
                serverChannel.close();
            }
        }
    }
    
    // 高性能缓冲区管理
    public static class HighPerformanceBufferManager {
        private final DirectMemoryPool readBufferPool;
        private final DirectMemoryPool writeBufferPool;
        
        public HighPerformanceBufferManager() {
            // 创建读写缓冲区池
            this.readBufferPool = new DirectMemoryPool(64 * 1024, 100);  // 64KB 读缓冲区
            this.writeBufferPool = new DirectMemoryPool(64 * 1024, 100); // 64KB 写缓冲区
        }
        
        public ByteBuffer acquireReadBuffer() {
            return readBufferPool.acquire();
        }
        
        public ByteBuffer acquireWriteBuffer() {
            return writeBufferPool.acquire();
        }
        
        public void releaseReadBuffer(ByteBuffer buffer) {
            readBufferPool.release(buffer);
        }
        
        public void releaseWriteBuffer(ByteBuffer buffer) {
            writeBufferPool.release(buffer);
        }
        
        public void printStatistics() {
            System.out.println("\n=== 缓冲区管理器统计 ===");
            System.out.println("读缓冲区池:");
            readBufferPool.printStatistics();
            System.out.println("\n写缓冲区池:");
            writeBufferPool.printStatistics();
        }
        
        public void shutdown() {
            readBufferPool.clear();
            writeBufferPool.clear();
        }
    }
    
    // 演示 NIO 直接内存使用
    public static void demonstrateNIODirectMemory() {
        System.out.println("=== NIO 直接内存使用演示 ===");
        
        HighPerformanceBufferManager bufferManager = new HighPerformanceBufferManager();
        
        try {
            // 模拟多个连接的缓冲区使用
            java.util.List<ByteBuffer> readBuffers = new java.util.ArrayList<>();
            java.util.List<ByteBuffer> writeBuffers = new java.util.ArrayList<>();
            
            // 获取多个缓冲区
            for (int i = 0; i < 20; i++) {
                ByteBuffer readBuffer = bufferManager.acquireReadBuffer();
                ByteBuffer writeBuffer = bufferManager.acquireWriteBuffer();
                
                readBuffers.add(readBuffer);
                writeBuffers.add(writeBuffer);
                
                // 模拟数据处理
                readBuffer.put(("Read data " + i).getBytes());
                writeBuffer.put(("Write data " + i).getBytes());
            }
            
            bufferManager.printStatistics();
            
            // 释放部分缓冲区
            for (int i = 0; i < 10; i++) {
                bufferManager.releaseReadBuffer(readBuffers.get(i));
                bufferManager.releaseWriteBuffer(writeBuffers.get(i));
            }
            
            System.out.println("\n释放部分缓冲区后:");
            bufferManager.printStatistics();
            
        } finally {
            bufferManager.shutdown();
        }
    }
}
```

### 2. 大文件处理

```java
import java.nio.ByteBuffer;
import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;
import java.io.RandomAccessFile;
import java.io.IOException;

public class LargeFileProcessing {
    
    // 大文件分块处理
    public static void processLargeFileWithDirectMemory(String fileName) {
        System.out.println("=== 大文件直接内存处理 ===");
        
        try (RandomAccessFile file = new RandomAccessFile(fileName, "r");
             FileChannel channel = file.getChannel()) {
            
            long fileSize = channel.size();
            int chunkSize = 64 * 1024 * 1024; // 64MB 块
            
            System.out.println("文件大小: " + (fileSize / 1024 / 1024) + " MB");
            System.out.println("块大小: " + (chunkSize / 1024 / 1024) + " MB");
            
            ByteBuffer buffer = ByteBuffer.allocateDirect(chunkSize);
            
            long totalBytesProcessed = 0;
            int chunkCount = 0;
            
            while (totalBytesProcessed < fileSize) {
                buffer.clear();
                
                int bytesRead = channel.read(buffer);
                if (bytesRead == -1) {
                    break;
                }
                
                buffer.flip();
                
                // 处理数据块
                long chunkStartTime = System.currentTimeMillis();
                processDataChunk(buffer, chunkCount);
                long chunkProcessTime = System.currentTimeMillis() - chunkStartTime;
                
                totalBytesProcessed += bytesRead;
                chunkCount++;
                
                System.out.printf("处理块 %d: %d bytes, 耗时: %d ms%n", 
                                chunkCount, bytesRead, chunkProcessTime);
            }
            
            System.out.println("文件处理完成，总共处理: " + (totalBytesProcessed / 1024 / 1024) + " MB");
            
        } catch (IOException e) {
            System.err.println("文件处理失败: " + e.getMessage());
        }
    }
    
    private static void processDataChunk(ByteBuffer buffer, int chunkIndex) {
        // 模拟数据处理：计算字节和
        long sum = 0;
        int count = 0;
        
        while (buffer.hasRemaining()) {
            sum += buffer.get() & 0xFF; // 转换为无符号字节
            count++;
        }
        
        System.out.printf("  块 %d 统计: %d 字节, 字节和: %d, 平均值: %.2f%n", 
                         chunkIndex, count, sum, (double) sum / count);
    }
    
    // 内存映射文件处理
    public static void processWithMemoryMapping(String fileName) {
        System.out.println("\n=== 内存映射文件处理 ===");
        
        try (RandomAccessFile file = new RandomAccessFile(fileName, "r");
             FileChannel channel = file.getChannel()) {
            
            long fileSize = channel.size();
            long maxMappingSize = 1024L * 1024 * 1024; // 1GB 最大映射大小
            
            System.out.println("文件大小: " + (fileSize / 1024 / 1024) + " MB");
            
            long position = 0;
            int mappingCount = 0;
            
            while (position < fileSize) {
                long mappingSize = Math.min(maxMappingSize, fileSize - position);
                
                MappedByteBuffer mappedBuffer = channel.map(
                    FileChannel.MapMode.READ_ONLY, position, mappingSize);
                
                System.out.printf("创建映射 %d: 位置 %d, 大小 %d MB%n", 
                                mappingCount + 1, position, mappingSize / 1024 / 1024);
                
                // 处理映射区域
                long startTime = System.currentTimeMillis();
                processMemoryMappedRegion(mappedBuffer, mappingCount);
                long processTime = System.currentTimeMillis() - startTime;
                
                System.out.printf("映射 %d 处理完成，耗时: %d ms%n", 
                                mappingCount + 1, processTime);
                
                position += mappingSize;
                mappingCount++;
                
                // 建议 GC 回收映射
                mappedBuffer = null;
                System.gc();
            }
            
            System.out.println("内存映射处理完成，总映射数: " + mappingCount);
            
        } catch (IOException e) {
            System.err.println("内存映射处理失败: " + e.getMessage());
        }
    }
    
    private static void processMemoryMappedRegion(MappedByteBuffer buffer, int regionIndex) {
        // 模拟复杂的数据处理
        long sum = 0;
        int maxValue = 0;
        int minValue = 255;
        int count = 0;
        
        while (buffer.hasRemaining()) {
            int value = buffer.get() & 0xFF;
            sum += value;
            maxValue = Math.max(maxValue, value);
            minValue = Math.min(minValue, value);
            count++;
        }
        
        System.out.printf("  映射 %d 统计: %d 字节, 和: %d, 最大: %d, 最小: %d, 平均: %.2f%n", 
                         regionIndex, count, sum, maxValue, minValue, (double) sum / count);
    }
    
    // 创建测试文件
    public static void createTestFile(String fileName, long sizeInMB) {
        System.out.println("创建测试文件: " + fileName + ", 大小: " + sizeInMB + " MB");
        
        try (RandomAccessFile file = new RandomAccessFile(fileName, "rw");
             FileChannel channel = file.getChannel()) {
            
            ByteBuffer buffer = ByteBuffer.allocateDirect(1024 * 1024); // 1MB 缓冲区
            
            // 填充随机数据
            java.util.Random random = new java.util.Random();
            byte[] data = new byte[buffer.capacity()];
            
            for (long i = 0; i < sizeInMB; i++) {
                random.nextBytes(data);
                buffer.clear();
                buffer.put(data);
                buffer.flip();
                channel.write(buffer);
            }
            
            System.out.println("测试文件创建完成");
            
        } catch (IOException e) {
            System.err.println("创建测试文件失败: " + e.getMessage());
        }
    }
    
    // 演示大文件处理
    public static void demonstrateLargeFileProcessing() {
        String testFile = "large_test_file.dat";
        
        try {
            // 创建 100MB 测试文件
            createTestFile(testFile, 100);
            
            // 使用直接内存处理
            long startTime = System.currentTimeMillis();
            processLargeFileWithDirectMemory(testFile);
            long directMemoryTime = System.currentTimeMillis() - startTime;
            
            // 使用内存映射处理
            startTime = System.currentTimeMillis();
            processWithMemoryMapping(testFile);
            long memoryMappingTime = System.currentTimeMillis() - startTime;
            
            System.out.println("\n=== 性能对比 ===");
            System.out.printf("直接内存处理时间: %d ms%n", directMemoryTime);
            System.out.printf("内存映射处理时间: %d ms%n", memoryMappingTime);
            
            if (directMemoryTime > 0 && memoryMappingTime > 0) {
                System.out.printf("性能比率: %.2fx%n", 
                                (double) directMemoryTime / memoryMappingTime);
            }
            
        } finally {
            // 清理测试文件
            new java.io.File(testFile).delete();
        }
    }
}
```

## 配置与调优

### 1. JVM 参数配置

```java
public class DirectMemoryConfiguration {
    
    public static void printDirectMemoryConfiguration() {
        System.out.println("=== 直接内存配置信息 ===");
        
        try {
            // 获取最大直接内存设置
            Class<?> vmClass = Class.forName("sun.misc.VM");
            java.lang.reflect.Method maxDirectMemoryMethod = vmClass.getMethod("maxDirectMemory");
            long maxDirectMemory = (Long) maxDirectMemoryMethod.invoke(null);
            
            System.out.println("最大直接内存: " + (maxDirectMemory / 1024 / 1024) + " MB");
            
            // 获取系统属性
            String maxDirectMemorySize = System.getProperty("sun.nio.MaxDirectMemorySize");
            if (maxDirectMemorySize != null) {
                System.out.println("系统属性设置: " + maxDirectMemorySize);
            } else {
                System.out.println("系统属性设置: 未设置（使用默认值）");
            }
            
            // 获取运行时参数
            java.lang.management.RuntimeMXBean runtimeBean = 
                java.lang.management.ManagementFactory.getRuntimeMXBean();
            
            java.util.List<String> inputArguments = runtimeBean.getInputArguments();
            System.out.println("\nJVM 启动参数中的直接内存相关设置:");
            
            boolean foundDirectMemoryArg = false;
            for (String arg : inputArguments) {
                if (arg.contains("MaxDirectMemorySize")) {
                    System.out.println("  " + arg);
                    foundDirectMemoryArg = true;
                }
            }
            
            if (!foundDirectMemoryArg) {
                System.out.println("  未找到 -XX:MaxDirectMemorySize 参数");
            }
            
            // 计算默认值
            java.lang.management.MemoryMXBean memoryBean = 
                java.lang.management.ManagementFactory.getMemoryMXBean();
            long heapMax = memoryBean.getHeapMemoryUsage().getMax();
            
            System.out.println("\n相关内存信息:");
            System.out.println("最大堆内存: " + (heapMax / 1024 / 1024) + " MB");
            System.out.println("直接内存/堆内存比率: " + 
                             String.format("%.2f", (double) maxDirectMemory / heapMax));
            
        } catch (Exception e) {
            System.err.println("获取直接内存配置失败: " + e.getMessage());
        }
    }
    
    // 推荐的配置指南
    public static void printConfigurationGuidelines() {
        System.out.println("\n=== 直接内存配置指南 ===");
        
        System.out.println("1. 设置最大直接内存:");
        System.out.println("   -XX:MaxDirectMemorySize=512m  # 设置为 512MB");
        System.out.println("   -XX:MaxDirectMemorySize=1g    # 设置为 1GB");
        System.out.println("   -XX:MaxDirectMemorySize=2048m # 设置为 2GB");
        
        System.out.println("\n2. 监控相关参数:");
        System.out.println("   -XX:+PrintGCDetails           # 打印 GC 详情");
        System.out.println("   -XX:+PrintGCTimeStamps        # 打印 GC 时间戳");
        System.out.println("   -XX:+UseG1GC                 # 使用 G1 垃圾收集器");
        
        System.out.println("\n3. 调试参数:");
        System.out.println("   -XX:+UnlockDiagnosticVMOptions");
        System.out.println("   -XX:+LogVMOutput");
        System.out.println("   -XX:+TraceClassLoading");
        
        System.out.println("\n4. 配置建议:");
        System.out.println("   - NIO 密集型应用: 设置为堆内存的 50%-100%");
        System.out.println("   - 普通应用: 设置为堆内存的 25%-50%");
        System.out.println("   - 内存受限环境: 设置为堆内存的 10%-25%");
        
        System.out.println("\n5. 监控要点:");
        System.out.println("   - 定期检查直接内存使用率");
        System.out.println("   - 监控 OutOfMemoryError: Direct buffer memory");
        System.out.println("   - 关注 GC 频率和停顿时间");
        System.out.println("   - 使用内存分析工具（如 JProfiler、MAT）");
    }
    
    // 性能调优建议
    public static void printPerformanceTuningTips() {
        System.out.println("\n=== 直接内存性能调优建议 ===");
        
        System.out.println("1. 缓冲区大小优化:");
        System.out.println("   - 网络 I/O: 8KB - 64KB");
        System.out.println("   - 文件 I/O: 64KB - 1MB");
        System.out.println("   - 大文件处理: 1MB - 64MB");
        
        System.out.println("\n2. 内存池策略:");
        System.out.println("   - 预分配常用大小的缓冲区");
        System.out.println("   - 实现缓冲区复用机制");
        System.out.println("   - 设置合理的池大小限制");
        
        System.out.println("\n3. 避免内存泄漏:");
        System.out.println("   - 及时释放不再使用的缓冲区");
        System.out.println("   - 使用 try-with-resources 模式");
        System.out.println("   - 实现自动清理机制");
        
        System.out.println("\n4. 监控和诊断:");
        System.out.println("   - 定期检查内存使用情况");
        System.out.println("   - 设置内存使用阈值告警");
        System.out.println("   - 记录内存分配和释放日志");
        
        System.out.println("\n5. 应用场景选择:");
        System.out.println("   - 高频 I/O 操作: 优先使用直接内存");
        System.out.println("   - 短期数据处理: 考虑使用堆内存");
        System.out.println("   - 大数据量处理: 结合内存映射文件");
    }
}
```

## 总结

直接内存是 Java 应用程序中重要的内存区域：

### 核心特性
1. **堆外分配** - 不占用 JVM 堆空间
2. **高性能** - 减少数据复制，提高 I/O 效率
3. **零拷贝** - 支持操作系统级别的零拷贝操作
4. **内存映射** - 支持大文件的高效处理

### 主要优势
1. **I/O 性能** - 显著提升网络和文件 I/O 性能
2. **内存效率** - 避免 Java 堆和本地内存之间的数据复制
3. **大容量支持** - 可以分配超过堆大小限制的内存
4. **GC 友好** - 不受垃圾收集器管理，减少 GC 压力

### 应用场景
1. **NIO 网络编程** - 高并发网络服务器
2. **大文件处理** - 日志分析、数据处理
3. **缓存系统** - 高性能缓存实现
4. **消息队列** - 高吞吐量消息处理

### 注意事项
1. **内存限制** - 受系统总内存和 MaxDirectMemorySize 限制
2. **内存泄漏** - 需要手动管理内存生命周期
3. **调试困难** - 不在堆转储中显示，调试相对困难
4. **平台依赖** - 某些特性依赖于操作系统支持

### 最佳实践
1. **合理配置** - 根据应用需求设置合适的直接内存大小
2. **内存池化** - 实现缓冲区复用机制
3. **监控告警** - 建立完善的内存监控体系
4. **异常处理** - 妥善处理 OutOfMemoryError
5. **性能测试** - 在实际环境中验证性能提升效果

理解直接内存的特性和使用方法，有助于开发高性能的 Java 应用程序，特别是在 I/O 密集型和大数据处理场景中。