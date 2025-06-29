# 本地方法栈 (Native Method Stack)

## 概述

本地方法栈（Native Method Stack）与虚拟机栈所发挥的作用是非常相似的，其区别只是虚拟机栈为虚拟机执行 Java 方法（也就是字节码）服务，而本地方法栈则是为虚拟机使用到的本地（Native）方法服务。

## 基本特性

### 1. 线程私有性

```java
public class NativeMethodStackExample {
    // 加载本地库
    static {
        try {
            System.loadLibrary("example"); // 加载本地库
        } catch (UnsatisfiedLinkError e) {
            System.out.println("本地库加载失败: " + e.getMessage());
        }
    }
    
    // 声明本地方法
    public native int nativeCalculation(int a, int b);
    public native String nativeStringProcess(String input);
    public native void nativeArraySort(int[] array);
    
    public static void main(String[] args) {
        NativeMethodStackExample example = new NativeMethodStackExample();
        
        // 多线程调用本地方法，每个线程有独立的本地方法栈
        Thread thread1 = new Thread(() -> {
            try {
                for (int i = 0; i < 100; i++) {
                    int result = example.nativeCalculation(i, i * 2);
                    System.out.println("Thread-1: " + result);
                }
            } catch (UnsatisfiedLinkError e) {
                System.out.println("Thread-1 本地方法调用失败");
            }
        }, "NativeThread-1");
        
        Thread thread2 = new Thread(() -> {
            try {
                for (int i = 0; i < 100; i++) {
                    String result = example.nativeStringProcess("input-" + i);
                    System.out.println("Thread-2: " + result);
                }
            } catch (UnsatisfiedLinkError e) {
                System.out.println("Thread-2 本地方法调用失败");
            }
        }, "NativeThread-2");
        
        thread1.start();
        thread2.start();
        
        try {
            thread1.join();
            thread2.join();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
```

### 2. 内存结构对比

```
┌─────────────────────────────────────────────────────────────┐
│                    JVM 内存区域结构                          │
├─────────────────────────────────────────────────────────────┤
│                      线程共享区域                            │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │      堆内存      │  │          方法区                 │   │
│  │    (Heap)       │  │      (Method Area)             │   │
│  └─────────────────┘  └─────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                      线程私有区域                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐   │
│  │   程序计数器     │  │    虚拟机栈     │  │  本地方法栈  │   │
│  │ (PC Register)   │  │  (VM Stack)     │  │(Native Stack)│   │
│  │                 │  │                 │  │             │   │
│  │ • 字节码指针    │  │ • Java 方法     │  │ • 本地方法   │   │
│  │ • 本地方法时    │  │ • 栈帧管理      │  │ • JNI 调用   │   │
│  │   为 undefined  │  │ • 局部变量表    │  │ • C/C++ 栈   │   │
│  │                 │  │ • 操作数栈      │  │ • 平台相关   │   │
│  └─────────────────┘  └─────────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## JNI (Java Native Interface)

### 1. JNI 基础概念

```java
public class JNIBasics {
    // 加载本地库
    static {
        System.loadLibrary("jnibasics");
    }
    
    // 基本数据类型的本地方法
    public native boolean nativeBoolean(boolean value);
    public native byte nativeByte(byte value);
    public native char nativeChar(char value);
    public native short nativeShort(short value);
    public native int nativeInt(int value);
    public native long nativeLong(long value);
    public native float nativeFloat(float value);
    public native double nativeDouble(double value);
    
    // 对象类型的本地方法
    public native String nativeString(String input);
    public native int[] nativeIntArray(int[] array);
    public native Object nativeObject(Object obj);
    
    // 静态本地方法
    public static native void staticNativeMethod();
    
    // 演示 JNI 调用
    public void demonstrateJNICalls() {
        System.out.println("=== JNI 基本数据类型测试 ===");
        
        try {
            System.out.println("boolean: " + nativeBoolean(true));
            System.out.println("byte: " + nativeByte((byte) 127));
            System.out.println("char: " + nativeChar('A'));
            System.out.println("short: " + nativeShort((short) 32767));
            System.out.println("int: " + nativeInt(2147483647));
            System.out.println("long: " + nativeLong(9223372036854775807L));
            System.out.println("float: " + nativeFloat(3.14f));
            System.out.println("double: " + nativeDouble(2.718281828));
        } catch (UnsatisfiedLinkError e) {
            System.out.println("本地方法调用失败: " + e.getMessage());
        }
        
        System.out.println("\n=== JNI 对象类型测试 ===");
        
        try {
            String result = nativeString("Hello JNI");
            System.out.println("String result: " + result);
            
            int[] array = {1, 2, 3, 4, 5};
            int[] processedArray = nativeIntArray(array);
            System.out.println("Array result: " + Arrays.toString(processedArray));
            
            staticNativeMethod();
        } catch (UnsatisfiedLinkError e) {
            System.out.println("对象类型本地方法调用失败: " + e.getMessage());
        }
    }
}
```

### 2. JNI 数据类型映射

```java
public class JNIDataTypeMapping {
    /*
    Java 类型到 JNI 类型的映射：
    
    Java 类型        JNI 类型        C/C++ 类型
    ─────────────────────────────────────────────
    boolean         jboolean        unsigned char
    byte            jbyte           signed char
    char            jchar           unsigned short
    short           jshort          short
    int             jint            int
    long            jlong           long long
    float           jfloat          float
    double          jdouble         double
    
    Object          jobject         jobject
    String          jstring         jstring
    Class           jclass          jclass
    Throwable       jthrowable      jthrowable
    
    Object[]        jobjectArray    jobjectArray
    boolean[]       jbooleanArray   jbooleanArray
    byte[]          jbyteArray      jbyteArray
    char[]          jcharArray      jcharArray
    short[]         jshortArray     jshortArray
    int[]           jintArray       jintArray
    long[]          jlongArray      jlongArray
    float[]         jfloatArray     jfloatArray
    double[]        jdoubleArray    jdoubleArray
    */
    
    static {
        System.loadLibrary("datatypes");
    }
    
    // 演示各种数据类型的传递
    public native void demonstrateDataTypes(
        boolean boolVal,
        byte byteVal,
        char charVal,
        short shortVal,
        int intVal,
        long longVal,
        float floatVal,
        double doubleVal,
        String stringVal,
        int[] intArray,
        Object objectVal
    );
    
    // 返回复杂对象
    public native Person createPerson(String name, int age);
    
    // 处理异常
    public native void throwNativeException() throws RuntimeException;
    
    public static class Person {
        private String name;
        private int age;
        
        public Person(String name, int age) {
            this.name = name;
            this.age = age;
        }
        
        // Getter 和 Setter 方法
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public int getAge() { return age; }
        public void setAge(int age) { this.age = age; }
        
        @Override
        public String toString() {
            return "Person{name='" + name + "', age=" + age + "}";
        }
    }
    
    public void testDataTypeMapping() {
        try {
            demonstrateDataTypes(
                true,
                (byte) 100,
                'X',
                (short) 1000,
                50000,
                1000000L,
                3.14f,
                2.718,
                "Hello Native",
                new int[]{1, 2, 3, 4, 5},
                new Person("John", 25)
            );
            
            Person nativePerson = createPerson("Native Person", 30);
            System.out.println("从本地方法创建的对象: " + nativePerson);
            
        } catch (UnsatisfiedLinkError e) {
            System.out.println("本地方法调用失败: " + e.getMessage());
        } catch (RuntimeException e) {
            System.out.println("本地方法抛出异常: " + e.getMessage());
        }
    }
}
```

## 本地方法栈的工作机制

### 1. 调用栈结构

```java
public class NativeStackStructure {
    static {
        System.loadLibrary("stackdemo");
    }
    
    // 本地方法声明
    public native void nativeMethodA();
    public native void nativeMethodB(int param);
    public native String nativeMethodC(String input);
    
    public void demonstrateStackStructure() {
        /*
        调用栈结构示例：
        
        Java 调用栈                本地方法栈
        ┌─────────────────────┐    ┌─────────────────────┐
        │ main()              │    │                     │
        │ - 局部变量          │    │                     │
        │ - 操作数栈          │    │                     │
        ├─────────────────────┤    │                     │
        │ demonstrateStack... │    │                     │
        │ - 局部变量          │    │                     │
        │ - 操作数栈          │    │                     │
        ├─────────────────────┤    ├─────────────────────┤
        │ javaMethodA()       │    │ nativeMethodA()     │
        │ - 局部变量          │    │ - C/C++ 局部变量    │
        │ - 操作数栈          │    │ - C/C++ 栈帧        │
        │ - 调用 native 方法  │ -> │ - JNI 环境指针      │
        └─────────────────────┘    ├─────────────────────┤
                                   │ nativeMethodB()     │
                                   │ - C/C++ 局部变量    │
                                   │ - C/C++ 栈帧        │
                                   └─────────────────────┘
        */
        
        System.out.println("开始演示调用栈结构");
        javaMethodA();
        System.out.println("调用栈演示完成");
    }
    
    private void javaMethodA() {
        System.out.println("Java 方法 A - 调用本地方法");
        
        try {
            nativeMethodA(); // 跳转到本地方法栈
        } catch (UnsatisfiedLinkError e) {
            System.out.println("本地方法 A 调用失败");
        }
        
        System.out.println("Java 方法 A - 本地方法返回");
    }
    
    // 演示嵌套调用
    public void demonstrateNestedCalls() {
        System.out.println("=== 嵌套调用演示 ===");
        
        try {
            // Java -> Native -> Java -> Native 的调用链
            nestedJavaMethod1();
        } catch (UnsatisfiedLinkError e) {
            System.out.println("嵌套调用失败: " + e.getMessage());
        }
    }
    
    private void nestedJavaMethod1() {
        System.out.println("Java 方法 1");
        nativeMethodB(42); // 调用本地方法
    }
    
    // 这个方法会被本地代码回调
    public void callbackFromNative(String message) {
        System.out.println("从本地方法回调: " + message);
        
        // 在回调中再次调用本地方法
        try {
            String result = nativeMethodC("callback-data");
            System.out.println("回调中的本地方法结果: " + result);
        } catch (UnsatisfiedLinkError e) {
            System.out.println("回调中的本地方法调用失败");
        }
    }
}
```

### 2. 内存管理

```java
public class NativeMemoryManagement {
    static {
        System.loadLibrary("memory");
    }
    
    // 内存分配相关的本地方法
    public native long allocateNativeMemory(int size);
    public native void freeNativeMemory(long address);
    public native void writeToNativeMemory(long address, byte[] data);
    public native byte[] readFromNativeMemory(long address, int size);
    
    // 直接内存操作
    public native ByteBuffer allocateDirectBuffer(int capacity);
    public native void processDirectBuffer(ByteBuffer buffer);
    
    public void demonstrateMemoryManagement() {
        System.out.println("=== 本地内存管理演示 ===");
        
        try {
            // 分配本地内存
            int size = 1024;
            long memoryAddress = allocateNativeMemory(size);
            System.out.println("分配本地内存地址: 0x" + Long.toHexString(memoryAddress));
            
            if (memoryAddress != 0) {
                // 写入数据
                byte[] testData = "Hello Native Memory".getBytes();
                writeToNativeMemory(memoryAddress, testData);
                System.out.println("写入数据: " + new String(testData));
                
                // 读取数据
                byte[] readData = readFromNativeMemory(memoryAddress, testData.length);
                System.out.println("读取数据: " + new String(readData));
                
                // 释放内存
                freeNativeMemory(memoryAddress);
                System.out.println("释放本地内存");
            }
            
        } catch (UnsatisfiedLinkError e) {
            System.out.println("本地内存管理失败: " + e.getMessage());
        }
    }
    
    public void demonstrateDirectBuffer() {
        System.out.println("\n=== 直接内存缓冲区演示 ===");
        
        try {
            // 分配直接内存缓冲区
            ByteBuffer directBuffer = allocateDirectBuffer(1024);
            
            if (directBuffer != null) {
                System.out.println("直接缓冲区容量: " + directBuffer.capacity());
                System.out.println("是否为直接缓冲区: " + directBuffer.isDirect());
                
                // 写入数据
                String testString = "Direct Buffer Test";
                directBuffer.put(testString.getBytes());
                directBuffer.flip();
                
                // 本地方法处理缓冲区
                processDirectBuffer(directBuffer);
                
                // 读取处理后的数据
                byte[] result = new byte[directBuffer.remaining()];
                directBuffer.get(result);
                System.out.println("处理后的数据: " + new String(result));
            }
            
        } catch (UnsatisfiedLinkError e) {
            System.out.println("直接缓冲区操作失败: " + e.getMessage());
        }
    }
    
    // 内存泄漏检测
    public void demonstrateMemoryLeak() {
        System.out.println("\n=== 内存泄漏检测演示 ===");
        
        List<Long> allocatedAddresses = new ArrayList<>();
        
        try {
            // 故意分配大量内存而不释放（演示内存泄漏）
            for (int i = 0; i < 100; i++) {
                long address = allocateNativeMemory(1024 * 1024); // 1MB
                if (address != 0) {
                    allocatedAddresses.add(address);
                }
            }
            
            System.out.println("分配了 " + allocatedAddresses.size() + " 块内存");
            
            // 模拟程序运行一段时间
            Thread.sleep(1000);
            
            // 正确释放内存
            for (long address : allocatedAddresses) {
                freeNativeMemory(address);
            }
            
            System.out.println("释放了所有分配的内存");
            
        } catch (UnsatisfiedLinkError e) {
            System.out.println("内存操作失败: " + e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
```

## 异常处理

### 1. 本地方法中的异常

```java
public class NativeExceptionHandling {
    static {
        System.loadLibrary("exceptions");
    }
    
    // 可能抛出异常的本地方法
    public native void nativeMethodThatThrows() throws RuntimeException;
    public native int nativeDivision(int a, int b) throws ArithmeticException;
    public native String nativeStringOperation(String input) throws IllegalArgumentException;
    
    // 检查异常的本地方法
    public native void checkAndThrowException(boolean shouldThrow);
    
    public void demonstrateExceptionHandling() {
        System.out.println("=== 本地方法异常处理演示 ===");
        
        // 1. 处理运行时异常
        try {
            nativeMethodThatThrows();
        } catch (RuntimeException e) {
            System.out.println("捕获运行时异常: " + e.getMessage());
            e.printStackTrace();
        } catch (UnsatisfiedLinkError e) {
            System.out.println("本地方法链接失败: " + e.getMessage());
        }
        
        // 2. 处理算术异常
        try {
            int result1 = nativeDivision(10, 2);
            System.out.println("正常除法结果: " + result1);
            
            int result2 = nativeDivision(10, 0); // 可能抛出异常
            System.out.println("除零结果: " + result2);
            
        } catch (ArithmeticException e) {
            System.out.println("捕获算术异常: " + e.getMessage());
        } catch (UnsatisfiedLinkError e) {
            System.out.println("本地方法调用失败");
        }
        
        // 3. 处理参数异常
        try {
            String result1 = nativeStringOperation("valid input");
            System.out.println("正常字符串操作结果: " + result1);
            
            String result2 = nativeStringOperation(null); // 可能抛出异常
            System.out.println("空字符串操作结果: " + result2);
            
        } catch (IllegalArgumentException e) {
            System.out.println("捕获参数异常: " + e.getMessage());
        } catch (UnsatisfiedLinkError e) {
            System.out.println("本地方法调用失败");
        }
    }
    
    // 异常传播测试
    public void demonstrateExceptionPropagation() {
        System.out.println("\n=== 异常传播演示 ===");
        
        try {
            javaMethodWithNativeCall();
        } catch (Exception e) {
            System.out.println("最终捕获异常: " + e.getClass().getSimpleName());
            System.out.println("异常消息: " + e.getMessage());
            
            // 打印完整的调用栈
            System.out.println("调用栈:");
            for (StackTraceElement element : e.getStackTrace()) {
                System.out.println("  " + element);
            }
        }
    }
    
    private void javaMethodWithNativeCall() throws Exception {
        System.out.println("Java 方法调用本地方法");
        
        try {
            checkAndThrowException(true); // 本地方法抛出异常
        } catch (UnsatisfiedLinkError e) {
            // 转换为更具体的异常
            throw new Exception("本地方法执行失败", e);
        }
    }
}
```

### 2. 异常处理最佳实践

```java
public class NativeExceptionBestPractices {
    static {
        try {
            System.loadLibrary("bestpractices");
        } catch (UnsatisfiedLinkError e) {
            System.err.println("警告: 无法加载本地库 - " + e.getMessage());
        }
    }
    
    // 安全的本地方法调用
    public native boolean isNativeLibraryLoaded();
    public native String safeNativeOperation(String input);
    public native void cleanupNativeResources();
    
    // 检查本地库是否可用
    public boolean isNativeSupported() {
        try {
            return isNativeLibraryLoaded();
        } catch (UnsatisfiedLinkError e) {
            return false;
        }
    }
    
    // 安全的本地方法调用包装
    public String safeCallNativeMethod(String input) {
        // 1. 检查本地库是否可用
        if (!isNativeSupported()) {
            System.out.println("本地库不可用，使用 Java 实现");
            return fallbackJavaImplementation(input);
        }
        
        // 2. 参数验证
        if (input == null) {
            throw new IllegalArgumentException("输入参数不能为 null");
        }
        
        // 3. 安全调用本地方法
        try {
            return safeNativeOperation(input);
        } catch (UnsatisfiedLinkError e) {
            System.err.println("本地方法调用失败: " + e.getMessage());
            return fallbackJavaImplementation(input);
        } catch (RuntimeException e) {
            System.err.println("本地方法运行时异常: " + e.getMessage());
            throw e; // 重新抛出运行时异常
        }
    }
    
    // Java 备用实现
    private String fallbackJavaImplementation(String input) {
        return "Java fallback: " + input.toUpperCase();
    }
    
    // 资源管理
    public void demonstrateResourceManagement() {
        System.out.println("=== 本地资源管理演示 ===");
        
        try {
            // 使用 try-with-resources 模式
            try (NativeResource resource = new NativeResource()) {
                resource.doNativeOperation();
            } // 自动调用 close() 方法
            
        } catch (Exception e) {
            System.err.println("资源管理异常: " + e.getMessage());
        }
    }
    
    // 本地资源包装类
    public static class NativeResource implements AutoCloseable {
        private boolean closed = false;
        
        static {
            try {
                System.loadLibrary("resource");
            } catch (UnsatisfiedLinkError e) {
                System.err.println("资源库加载失败: " + e.getMessage());
            }
        }
        
        public native void initNativeResource();
        public native void doNativeOperation();
        public native void releaseNativeResource();
        
        public NativeResource() {
            try {
                initNativeResource();
            } catch (UnsatisfiedLinkError e) {
                System.err.println("本地资源初始化失败: " + e.getMessage());
            }
        }
        
        public void doNativeOperation() {
            if (closed) {
                throw new IllegalStateException("资源已关闭");
            }
            
            try {
                doNativeOperation();
            } catch (UnsatisfiedLinkError e) {
                System.err.println("本地操作失败: " + e.getMessage());
            }
        }
        
        @Override
        public void close() {
            if (!closed) {
                try {
                    releaseNativeResource();
                } catch (UnsatisfiedLinkError e) {
                    System.err.println("本地资源释放失败: " + e.getMessage());
                } finally {
                    closed = true;
                }
            }
        }
        
        // 确保资源被释放
        @Override
        protected void finalize() throws Throwable {
            try {
                close();
            } finally {
                super.finalize();
            }
        }
    }
}
```

## 性能考虑

### 1. JNI 调用开销

```java
public class NativePerformanceAnalysis {
    static {
        System.loadLibrary("performance");
    }
    
    // 简单的本地方法
    public native int simpleNativeAdd(int a, int b);
    public native void emptyNativeMethod();
    
    // 复杂的本地方法
    public native int[] complexNativeOperation(int[] input);
    public native String heavyStringProcessing(String input);
    
    // Java 等价实现
    public int javaAdd(int a, int b) {
        return a + b;
    }
    
    public void emptyJavaMethod() {
        // 空方法
    }
    
    public int[] complexJavaOperation(int[] input) {
        int[] result = new int[input.length];
        for (int i = 0; i < input.length; i++) {
            result[i] = input[i] * 2 + 1;
        }
        return result;
    }
    
    public void performanceComparison() {
        System.out.println("=== JNI 性能对比分析 ===");
        
        int iterations = 1000000;
        
        // 1. 简单操作性能对比
        compareSimpleOperations(iterations);
        
        // 2. 复杂操作性能对比
        compareComplexOperations(10000);
        
        // 3. 方法调用开销对比
        compareMethodCallOverhead(iterations);
    }
    
    private void compareSimpleOperations(int iterations) {
        System.out.println("\n--- 简单操作性能对比 ---");
        
        // Java 实现
        long startTime = System.nanoTime();
        for (int i = 0; i < iterations; i++) {
            javaAdd(i, i + 1);
        }
        long javaTime = System.nanoTime() - startTime;
        
        // 本地实现
        startTime = System.nanoTime();
        try {
            for (int i = 0; i < iterations; i++) {
                simpleNativeAdd(i, i + 1);
            }
        } catch (UnsatisfiedLinkError e) {
            System.out.println("本地方法调用失败");
            return;
        }
        long nativeTime = System.nanoTime() - startTime;
        
        System.out.printf("Java 加法: %d ms%n", javaTime / 1_000_000);
        System.out.printf("Native 加法: %d ms%n", nativeTime / 1_000_000);
        System.out.printf("性能比率: %.2fx%n", (double) nativeTime / javaTime);
    }
    
    private void compareComplexOperations(int iterations) {
        System.out.println("\n--- 复杂操作性能对比 ---");
        
        int[] testArray = new int[1000];
        for (int i = 0; i < testArray.length; i++) {
            testArray[i] = i;
        }
        
        // Java 实现
        long startTime = System.nanoTime();
        for (int i = 0; i < iterations; i++) {
            complexJavaOperation(testArray);
        }
        long javaTime = System.nanoTime() - startTime;
        
        // 本地实现
        startTime = System.nanoTime();
        try {
            for (int i = 0; i < iterations; i++) {
                complexNativeOperation(testArray);
            }
        } catch (UnsatisfiedLinkError e) {
            System.out.println("本地方法调用失败");
            return;
        }
        long nativeTime = System.nanoTime() - startTime;
        
        System.out.printf("Java 复杂操作: %d ms%n", javaTime / 1_000_000);
        System.out.printf("Native 复杂操作: %d ms%n", nativeTime / 1_000_000);
        System.out.printf("性能比率: %.2fx%n", (double) nativeTime / javaTime);
    }
    
    private void compareMethodCallOverhead(int iterations) {
        System.out.println("\n--- 方法调用开销对比 ---");
        
        // Java 空方法调用
        long startTime = System.nanoTime();
        for (int i = 0; i < iterations; i++) {
            emptyJavaMethod();
        }
        long javaTime = System.nanoTime() - startTime;
        
        // 本地空方法调用
        startTime = System.nanoTime();
        try {
            for (int i = 0; i < iterations; i++) {
                emptyNativeMethod();
            }
        } catch (UnsatisfiedLinkError e) {
            System.out.println("本地方法调用失败");
            return;
        }
        long nativeTime = System.nanoTime() - startTime;
        
        System.out.printf("Java 空方法调用: %d ms%n", javaTime / 1_000_000);
        System.out.printf("Native 空方法调用: %d ms%n", nativeTime / 1_000_000);
        System.out.printf("JNI 调用开销: %.2fx%n", (double) nativeTime / javaTime);
        System.out.printf("平均 JNI 调用时间: %.2f ns%n", (double) nativeTime / iterations);
    }
}
```

### 2. 优化策略

```java
public class NativeOptimizationStrategies {
    static {
        System.loadLibrary("optimization");
    }
    
    // 批量处理优化
    public native int[] batchProcessArray(int[] input);
    public native void batchProcessMultipleArrays(int[][] arrays);
    
    // 直接内存访问优化
    public native void processDirectBuffer(ByteBuffer buffer);
    public native void processHeapBuffer(byte[] array);
    
    // 缓存优化
    public native void initializeNativeCache();
    public native String getCachedResult(String key);
    public native void clearNativeCache();
    
    public void demonstrateOptimizations() {
        System.out.println("=== 本地方法优化策略演示 ===");
        
        // 1. 批量处理优化
        demonstrateBatchProcessing();
        
        // 2. 直接内存访问优化
        demonstrateDirectMemoryAccess();
        
        // 3. 缓存优化
        demonstrateCaching();
    }
    
    private void demonstrateBatchProcessing() {
        System.out.println("\n--- 批量处理优化 ---");
        
        int[] largeArray = new int[100000];
        for (int i = 0; i < largeArray.length; i++) {
            largeArray[i] = i;
        }
        
        try {
            // 单次批量处理
            long startTime = System.nanoTime();
            int[] result = batchProcessArray(largeArray);
            long batchTime = System.nanoTime() - startTime;
            
            System.out.printf("批量处理时间: %d ms%n", batchTime / 1_000_000);
            System.out.printf("处理了 %d 个元素%n", result.length);
            
            // 多数组批量处理
            int[][] multipleArrays = new int[10][10000];
            for (int i = 0; i < multipleArrays.length; i++) {
                for (int j = 0; j < multipleArrays[i].length; j++) {
                    multipleArrays[i][j] = i * 10000 + j;
                }
            }
            
            startTime = System.nanoTime();
            batchProcessMultipleArrays(multipleArrays);
            long multiBatchTime = System.nanoTime() - startTime;
            
            System.out.printf("多数组批量处理时间: %d ms%n", multiBatchTime / 1_000_000);
            
        } catch (UnsatisfiedLinkError e) {
            System.out.println("批量处理方法调用失败");
        }
    }
    
    private void demonstrateDirectMemoryAccess() {
        System.out.println("\n--- 直接内存访问优化 ---");
        
        int bufferSize = 1024 * 1024; // 1MB
        byte[] testData = new byte[bufferSize];
        Arrays.fill(testData, (byte) 0x42);
        
        try {
            // 堆内存缓冲区
            long startTime = System.nanoTime();
            processHeapBuffer(testData);
            long heapTime = System.nanoTime() - startTime;
            
            // 直接内存缓冲区
            ByteBuffer directBuffer = ByteBuffer.allocateDirect(bufferSize);
            directBuffer.put(testData);
            directBuffer.flip();
            
            startTime = System.nanoTime();
            processDirectBuffer(directBuffer);
            long directTime = System.nanoTime() - startTime;
            
            System.out.printf("堆内存处理时间: %d ms%n", heapTime / 1_000_000);
            System.out.printf("直接内存处理时间: %d ms%n", directTime / 1_000_000);
            System.out.printf("性能提升: %.2fx%n", (double) heapTime / directTime);
            
        } catch (UnsatisfiedLinkError e) {
            System.out.println("直接内存访问方法调用失败");
        }
    }
    
    private void demonstrateCaching() {
        System.out.println("\n--- 缓存优化 ---");
        
        try {
            // 初始化缓存
            initializeNativeCache();
            
            String[] testKeys = {"key1", "key2", "key3", "key1", "key2"};
            
            // 测试缓存性能
            long totalTime = 0;
            for (String key : testKeys) {
                long startTime = System.nanoTime();
                String result = getCachedResult(key);
                long endTime = System.nanoTime();
                
                totalTime += (endTime - startTime);
                System.out.printf("键 '%s' 结果: %s (耗时: %d ns)%n", 
                                key, result, endTime - startTime);
            }
            
            System.out.printf("总耗时: %d ms%n", totalTime / 1_000_000);
            System.out.printf("平均耗时: %d ns%n", totalTime / testKeys.length);
            
            // 清理缓存
            clearNativeCache();
            
        } catch (UnsatisfiedLinkError e) {
            System.out.println("缓存方法调用失败");
        }
    }
    
    // 最佳实践建议
    public void printOptimizationGuidelines() {
        System.out.println("\n=== 本地方法优化指南 ===");
        
        System.out.println("1. 减少 JNI 调用频率:");
        System.out.println("   - 批量处理数据而不是逐个处理");
        System.out.println("   - 缓存计算结果");
        System.out.println("   - 合并多个小操作为一个大操作");
        
        System.out.println("\n2. 优化数据传输:");
        System.out.println("   - 使用直接内存缓冲区");
        System.out.println("   - 避免频繁的数组复制");
        System.out.println("   - 重用缓冲区对象");
        
        System.out.println("\n3. 内存管理:");
        System.out.println("   - 及时释放本地资源");
        System.out.println("   - 使用 try-with-resources 模式");
        System.out.println("   - 避免内存泄漏");
        
        System.out.println("\n4. 异常处理:");
        System.out.println("   - 提供 Java 备用实现");
        System.out.println("   - 正确处理本地异常");
        System.out.println("   - 验证输入参数");
        
        System.out.println("\n5. 线程安全:");
        System.out.println("   - 确保本地代码线程安全");
        System.out.println("   - 避免全局状态");
        System.out.println("   - 使用适当的同步机制");
    }
}
```

## 调试和监控

### 1. 本地方法栈监控

```java
public class NativeStackMonitoring {
    public static void monitorNativeMethodCalls() {
        ThreadMXBean threadBean = ManagementFactory.getThreadMXBean();
        
        // 获取当前线程信息
        long currentThreadId = Thread.currentThread().getId();
        ThreadInfo threadInfo = threadBean.getThreadInfo(currentThreadId, Integer.MAX_VALUE);
        
        System.out.println("=== 本地方法栈监控 ===");
        System.out.println("线程名称: " + threadInfo.getThreadName());
        System.out.println("线程状态: " + threadInfo.getThreadState());
        
        // 分析栈跟踪
        StackTraceElement[] stackTrace = threadInfo.getStackTrace();
        System.out.println("栈深度: " + stackTrace.length);
        
        boolean hasNativeMethods = false;
        for (StackTraceElement element : stackTrace) {
            if (element.isNativeMethod()) {
                hasNativeMethods = true;
                System.out.println("本地方法: " + element.getClassName() + 
                                 "." + element.getMethodName() + "(Native Method)");
            }
        }
        
        if (!hasNativeMethods) {
            System.out.println("当前栈中没有本地方法调用");
        }
    }
    
    // 监控所有线程的本地方法调用
    public static void monitorAllThreadsNativeCalls() {
        ThreadMXBean threadBean = ManagementFactory.getThreadMXBean();
        long[] threadIds = threadBean.getAllThreadIds();
        ThreadInfo[] threadInfos = threadBean.getThreadInfo(threadIds, Integer.MAX_VALUE);
        
        System.out.println("\n=== 所有线程本地方法监控 ===");
        
        int threadsWithNativeMethods = 0;
        for (ThreadInfo info : threadInfos) {
            if (info != null) {
                boolean hasNative = false;
                for (StackTraceElement element : info.getStackTrace()) {
                    if (element.isNativeMethod()) {
                        if (!hasNative) {
                            System.out.println("\n线程: " + info.getThreadName());
                            hasNative = true;
                            threadsWithNativeMethods++;
                        }
                        System.out.println("  本地方法: " + element.getClassName() + 
                                         "." + element.getMethodName());
                    }
                }
            }
        }
        
        System.out.println("\n总线程数: " + threadInfos.length);
        System.out.println("包含本地方法的线程数: " + threadsWithNativeMethods);
    }
    
    // JVM 参数监控
    public static void monitorJVMParameters() {
        RuntimeMXBean runtimeBean = ManagementFactory.getRuntimeMXBean();
        
        System.out.println("\n=== JVM 参数监控 ===");
        System.out.println("JVM 名称: " + runtimeBean.getVmName());
        System.out.println("JVM 版本: " + runtimeBean.getVmVersion());
        System.out.println("JVM 供应商: " + runtimeBean.getVmVendor());
        
        List<String> inputArguments = runtimeBean.getInputArguments();
        System.out.println("\nJVM 启动参数:");
        for (String arg : inputArguments) {
            if (arg.contains("stack") || arg.contains("Xss")) {
                System.out.println("  栈相关参数: " + arg);
            }
        }
        
        // 系统属性
        System.out.println("\n本地库路径:");
        String libraryPath = System.getProperty("java.library.path");
        String[] paths = libraryPath.split(System.getProperty("path.separator"));
        for (String path : paths) {
            System.out.println("  " + path);
        }
    }
}
```

### 2. 性能分析工具

```java
public class NativePerformanceProfiler {
    private static final Map<String, Long> methodCallCounts = new ConcurrentHashMap<>();
    private static final Map<String, Long> methodTotalTime = new ConcurrentHashMap<>();
    
    // 方法调用计时器
    public static class NativeMethodTimer implements AutoCloseable {
        private final String methodName;
        private final long startTime;
        
        public NativeMethodTimer(String methodName) {
            this.methodName = methodName;
            this.startTime = System.nanoTime();
            methodCallCounts.merge(methodName, 1L, Long::sum);
        }
        
        @Override
        public void close() {
            long duration = System.nanoTime() - startTime;
            methodTotalTime.merge(methodName, duration, Long::sum);
        }
    }
    
    // 分析本地方法性能
    public static void profileNativeMethod(String methodName, Runnable nativeCall) {
        try (NativeMethodTimer timer = new NativeMethodTimer(methodName)) {
            nativeCall.run();
        }
    }
    
    // 打印性能统计
    public static void printPerformanceStats() {
        System.out.println("\n=== 本地方法性能统计 ===");
        System.out.printf("%-30s %10s %15s %15s%n", 
                         "方法名", "调用次数", "总时间(ms)", "平均时间(ns)");
        System.out.println("-".repeat(75));
        
        for (String methodName : methodCallCounts.keySet()) {
            long callCount = methodCallCounts.get(methodName);
            long totalTime = methodTotalTime.getOrDefault(methodName, 0L);
            long avgTime = callCount > 0 ? totalTime / callCount : 0;
            
            System.out.printf("%-30s %10d %15d %15d%n", 
                             methodName, callCount, totalTime / 1_000_000, avgTime);
        }
    }
    
    // 清除统计数据
    public static void clearStats() {
        methodCallCounts.clear();
        methodTotalTime.clear();
    }
    
    // 内存使用监控
    public static void monitorMemoryUsage() {
        MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
        
        MemoryUsage heapUsage = memoryBean.getHeapMemoryUsage();
        MemoryUsage nonHeapUsage = memoryBean.getNonHeapMemoryUsage();
        
        System.out.println("\n=== 内存使用监控 ===");
        System.out.println("堆内存使用:");
        printMemoryUsage("  ", heapUsage);
        
        System.out.println("非堆内存使用:");
        printMemoryUsage("  ", nonHeapUsage);
        
        // 直接内存监控（如果可用）
        try {
            List<MemoryPoolMXBean> memoryPools = ManagementFactory.getMemoryPoolMXBeans();
            for (MemoryPoolMXBean pool : memoryPools) {
                if (pool.getName().contains("Direct")) {
                    System.out.println("直接内存池: " + pool.getName());
                    printMemoryUsage("  ", pool.getUsage());
                }
            }
        } catch (Exception e) {
            System.out.println("无法获取直接内存信息: " + e.getMessage());
        }
    }
    
    private static void printMemoryUsage(String prefix, MemoryUsage usage) {
        if (usage != null) {
            System.out.printf("%s已用: %d MB, 已提交: %d MB, 最大: %d MB%n",
                             prefix,
                             usage.getUsed() / (1024 * 1024),
                             usage.getCommitted() / (1024 * 1024),
                             usage.getMax() / (1024 * 1024));
        }
    }
    
    // 垃圾回收监控
    public static void monitorGarbageCollection() {
        List<GarbageCollectorMXBean> gcBeans = ManagementFactory.getGarbageCollectorMXBeans();
        
        System.out.println("\n=== 垃圾回收监控 ===");
        for (GarbageCollectorMXBean gcBean : gcBeans) {
            System.out.printf("GC: %s%n", gcBean.getName());
            System.out.printf("  收集次数: %d%n", gcBean.getCollectionCount());
            System.out.printf("  收集时间: %d ms%n", gcBean.getCollectionTime());
            
            String[] poolNames = gcBean.getMemoryPoolNames();
            System.out.printf("  管理的内存池: %s%n", Arrays.toString(poolNames));
        }
    }
}
```

## 总结

本地方法栈是 JVM 中专门为本地方法服务的重要组件：

### 核心特性
1. **线程私有** - 每个线程都有独立的本地方法栈
2. **本地方法支持** - 为 JNI 调用提供栈空间
3. **平台相关** - 实现依赖于具体的 JVM 和操作系统
4. **内存管理** - 可能发生 StackOverflowError 和 OutOfMemoryError

### 主要用途
1. **JNI 调用** - 支持 Java 调用 C/C++ 代码
2. **系统集成** - 与操作系统和第三方库交互
3. **性能优化** - 计算密集型任务的本地实现
4. **硬件访问** - 直接访问硬件资源

### 最佳实践
1. **谨慎使用** - 只在必要时使用本地方法
2. **异常处理** - 提供完善的错误处理和备用方案
3. **资源管理** - 确保本地资源正确释放
4. **性能优化** - 批量处理、直接内存访问、缓存策略
5. **调试监控** - 使用适当的工具进行性能分析

### 注意事项
1. **可移植性** - 本地代码降低了程序的可移植性
2. **安全性** - 本地代码可能绕过 Java 安全机制
3. **调试难度** - 本地代码调试比 Java 代码更困难
4. **维护成本** - 需要维护多个平台的本地库

理解本地方法栈的工作原理有助于更好地使用 JNI，进行系统级编程，并优化应用程序的性能。在使用本地方法时，应该权衡其带来的性能提升与增加的复杂性。