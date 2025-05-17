# JVM

JVM（Java Virtual Machine，Java虚拟机）是Java程序运行的核心部分，是一种虚拟的计算机，它能够执行用Java编写的字节码文件（.class文件），并提供了跨平台能力,即让java和能在jvm运行的语言具备一次编写，到处运行的能力。

## JVM能做什么

1. **加载字节码：** 读取 .class 文件（Java编译器编译生成的文件）。

2. **字节码执行**：将字节码转换为具体机器指令执行（通过解释器或即时编译器）。

3. **内存管理：** 负责内存分配与回收（包含垃圾回收机制 GC）。

4. **运行时支持：** 提供线程管理、异常处理、安全控制等运行时功能。

## 核心组成

```markdown

     ┌─────────────────────────────────────┐
     │             JVM                     │
     ├─────────────────────────────────────┤
     │ 类加载器                             │
     ├─────────────────────────────────────┤
     │ 运行时数据区                        │
     │ ├─ 方法区（MetaSpace）             │
     │ ├─ 堆（Heap）                      │
     │ ├─ 栈（JVM Stack）                 │
     │ ├─ 程序计数器                      │
     │ └─ 本地方法栈                      │
     ├─────────────────────────────────────┤
     │ 执行引擎                            │
     │ ├─ 解释器                          │
     │ ├─ JIT 编译器                      │
     │ └─ GC 垃圾回收器                   │
     ├─────────────────────────────────────┤
     │ 本地方法接口（JNI）                │
     └─────────────────────────────────────┘
```

## 类字节码加载

java文件对应的类编译成.class后，将 .class 字节码文件加载到 JVM 内存中，形成 Class 对象。

### 类加载过程

1. **加载（Loading）：** 通过类名找到 .class 文件并读取为字节码。

2. **连接（Linking）：**

   - **验证（Verify）：** 确保类的字节码合法且符合 JVM 要求。

   - **准备（Prepare）：** 分配静态变量的内存并初始化默认值。

   - **解析（Resolve）：** 将符号引用转为直接引用。

3. **初始化（Initialization）：** 执行静态代码块、赋值语句。

### 一、类加载器类型

jvm提供不同的类加载器类型，用于不同场景功能。遵循 双亲委派机制（Parent Delegation Model）。每个类都由某个类加载器加载，类的唯一性取决于：类名 + 类加载器。

#### 启动类加载器（Bootstrap ClassLoader）

%JAVA_HOME%/lib 目录下的核心类库，如：

java.lang.*
java.util.*
java.io.*
java.net.*

启动类加载器加载的对象不在java层，加载的类类获取会返回null。

```java
System.out.println(String.class.getClassLoader());  // 输出 null
```

原因说明：

1. **启动早：** Bootstrap ClassLoader 在 JVM 启动初期就存在，早于任何 Java 代码的执行。

2. **基础安全性：** 它加载的是最关键的核心类（如 java.lang.Object），必须可靠、安全、不可替换。

3. **性能和兼容性：** C/C++实现更接近底层，执行更高效，也方便 JVM 跨平台。

#### 扩展类加载器（Extension ClassLoader）

- **加载路径：** %JAVA_HOME%/lib/ext 或由 java.ext.dirs 指定

- **主要职责：** 加载扩展功能类，如一些加密包、数据库驱动等

#### 应用类加载器（App ClassLoader）

加载我们写的代码，也就是 classpath 下的类。

- **加载路径：** classpath 所指定的目录下的类（即你写的代码）

- **主要职责:** 加载应用程序开发者编写的类

#### 自定义类加载器（可选）

自己继承 ClassLoader 并实现 findClass() 方法

- **典型用途：**

  - 实现热部署（如 Tomcat 的 WebAppClassLoader）

  - 插件系统

  - 字节码加密/解密

  - 沙箱隔离

#### 双亲委派机制（Parent Delegation Model）

**工作流程：**
当类加载器尝试加载一个类时：

1. 先委托其 父加载器 加载。

2. 如果父类加载器无法加载（ClassNotFoundException），再自己尝试加载。

**主要作用:**

1. 避免重复加载

2. 避免核心类被篡改（如自己定义一个 java.lang.String 会被拦截）

```markdown
          [ Bootstrap ClassLoader ]
                    ↑
        [ Extension ClassLoader ]
                    ↑
          [ App ClassLoader ]
                    ↑
       [ Custom ClassLoader (自定义的) ]

```

## 二、运行时数据区（Runtime Data Areas）

JVM 在运行 Java 程序时，会在内存中划分出若干数据区，用于执行和管理数据。

### 1. 程序计数器（Program Counter Register）

- 每个线程独有（线程私有）

- 存储正在执行的字节码的地址

- 如果正在执行 native 方法，则为空

### 2. Java虚拟机栈（JVM Stack）

- 每个线程独有（线程私有）

- 每个方法调用对应一个栈帧（Stack Frame）

- 本地变量表（局部变量、参数）

- 操作数栈（计算用）

- 动态链接、方法返回地址等

- 可能抛出 StackOverflowError

### 3. 本地方法栈（Native Method Stack）

- 用于执行本地方法（如 C/C++ 写的 JNI 方法）

- 不同 JVM 实现不同

- 也可能抛出 StackOverflowError

### 4. 堆（Heap）

- 所有线程共享

- 对象实例与数组都在堆中分配

- 垃圾回收（GC）主要工作区

- 可能抛出 OutOfMemoryError

- 划分为新生代（Eden、Survivor）和老年代

### 5. 方法区（Method Area）

- 所有线程共享

- 存储类的结构信息（类的元数据）、常量池、静态变量、JIT 编译代码

- 在 HotSpot 中叫做 元空间（MetaSpace）（Java 8之后）

- 可能抛出 OutOfMemoryError

## 三、执行引擎（Execution Engine）

负责执行字节码，转换为具体平台的机器码。

组成部分：

1. **解释器（Interpreter）**

   - 逐条解释执行字节码

   - 启动快，但运行慢

2. **即时编译器（JIT，Just-In-Time Compiler）**

   - 将热点代码编译为本地机器码，提升性能

   - 常用：C1（客户端模式）、C2（服务端模式）

3. **执行子系统协调组件（执行调度、调用栈管理等）**

   - 包括方法调用、返回、异常处理、线程切换、栈帧管理等。  

## 四、本地接口（Native Interface）

**作用：**

1. 提供与其他语言（如 C/C++）互操作的能力。

2. 使用 JNI（Java Native Interface）

3. 可以调用系统底层库或本地方法，如 OpenGL、数据库驱动等

4. 本地方法也会用到本地方法栈

## 五、垃圾回收系统（GC Subsystem）

**目标：**

- 自动管理内存，释放不再被引用的对象，避免内存泄漏。

**常见策略：**

- 分代回收：将堆划分为新生代、老年代

- Stop-The-World：GC过程会暂停应用线程

- 多种GC算法适应不同业务场景（响应快 vs 吞吐量高）
