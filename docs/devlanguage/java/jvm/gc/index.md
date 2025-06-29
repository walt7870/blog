# JVM 垃圾回收 (Garbage Collection)

## 概述

垃圾回收（Garbage Collection，GC）是现代高级编程语言的重要特性，它自动管理内存的分配和释放，让开发人员能够专注于程序逻辑设计，大大提高了开发效率和程序运行的安全性，有效避免了内存泄漏等问题。然而，自动内存管理也带来了一定的性能开销，并且开发者失去了对内存控制的精确性。

### GC 的核心目标

1. **自动内存管理**：无需手动分配和释放内存
2. **内存安全**：防止内存泄漏和悬挂指针
3. **性能优化**：尽可能减少 GC 对应用程序性能的影响
4. **可预测性**：提供可预测的停顿时间和吞吐量

### GC 的权衡

- **优势**：内存安全、开发效率高、减少程序错误
- **劣势**：性能开销、停顿时间、内存使用效率相对较低

## GC 实现方式

### 1. 可达性分析算法（Reachability Analysis）

可达性分析是目前主流虚拟机采用的内存管理方式，包括 JVM、.NET、Go 等都基于此方式实现。

**工作原理：**

- 从 GC Roots 作为起始节点集，根据引用关系向下搜索
- 搜索过程中走过的路径称为**引用链**（Reference Chain）
- 当一个对象到 GC Roots 没有任何引用链相连时，证明此对象不可达，可以被回收

**优势：**

- 能够解决循环引用问题
- 准确识别垃圾对象
- 主流虚拟机的标准实现

### 2. 引用计数算法（Reference Counting）

**工作原理：**

- 对象被引用时，引用计数器加 1
- 引用失效时，引用计数器减 1
- 引用计数为 0 的对象可以被立即回收

**优势：**

- 实现简单，回收及时
- 不需要 STW（Stop The World）
- 内存回收与程序执行实时交互

**劣势：**

- 无法解决循环引用问题
- 频繁更新计数器影响性能
- 需要额外内存存储计数器

**应用场景：**

- Python、Swift 等语言的内存管理
- 微软 COM 技术
- 某些嵌入式系统

### GC Roots（垃圾回收根节点）

GC Roots 是可达性分析算法的起点，代表那些肯定不会被回收的对象。在 Java 中，可以作为 GC Roots 的对象包括：

#### 主要的 GC Roots 类型

1. **虚拟机栈中的引用**
   - 栈帧中的本地变量表引用的对象
   - 方法参数、局部变量等

2. **方法区中的静态引用**
   - 类的静态变量引用的对象
   - 常量池中的引用

3. **方法区中的常量引用**
   - 字符串常量池（String Pool）中的引用
   - Class 对象、异常对象等

4. **本地方法栈中的引用**
   - JNI（Java Native Interface）引用的对象
   - Native 方法中引用的 Java 对象

5. **活跃线程**
   - 正在运行的线程对象
   - 线程局部变量

6. **同步锁持有的对象**
   - 被 synchronized 关键字锁定的对象

7. **JVM 内部引用**
   - 系统类加载器
   - 异常处理相关对象
   - JVMTI 中注册的回调、本地代码缓存等

#### GC Roots 的判断标准

**核心原则**：程序能否直接访问该对象

- 如果程序可以直接引用某个对象（如调用栈中的变量指针），则该对象可以作为 GC Root
- GC Roots 的范围会根据不同的垃圾回收器和回收阶段有所不同

#### 不同回收器的 GC Roots 差异

- **Serial/Parallel GC**：传统的 GC Roots 集合
- **CMS GC**：在并发标记阶段可能需要重新扫描部分 Roots
- **G1 GC**：使用 Remembered Set 优化跨区域引用的 Roots 扫描
- **ZGC/Shenandoah**：使用着色指针技术，Roots 扫描更加高效

## GC 执行方式分类

根据垃圾回收的运行方式不同，GC 可以分为三类：

### 1. 串行执行（Serial）

**特点：**

- 垃圾回收器执行时应用程序完全挂起（STW）
- 只有一个 GC 线程执行垃圾对象的识别和回收
- 单线程处理，简单可靠

**适用场景：**

- 单核 CPU 环境
- 小型应用程序（堆内存 < 100MB）
- 客户端应用

**代表回收器：**

- Serial GC
- Serial Old GC

### 2. 并行执行（Parallel）

**特点：**

- 垃圾回收器执行时应用程序挂起（STW）
- 多个 GC 线程同时进行垃圾回收工作
- 能够充分利用多核 CPU 资源，减少回收时间

**适用场景：**

- 多核 CPU 环境
- 注重吞吐量的服务器应用
- 批处理任务

**代表回收器：**

- Parallel GC（ParNew）
- Parallel Old GC
- Parallel Scavenge GC

### 3. 并发执行（Concurrent）

**特点：**

- GC 线程与应用线程可以同时运行
- 大部分回收工作与应用程序并发执行
- 在某些关键阶段仍需要 STW
- 显著减少应用程序停顿时间

**适用场景：**

- 对响应时间敏感的应用
- Web 服务器、交互式应用
- 大内存应用

**代表回收器：**

- CMS GC
- G1 GC
- ZGC
- Shenandoah GC

### 并发 vs 并行的区别

**并行（Parallel）**：

- 多个 GC 线程同时工作
- 应用线程暂停
- 关注点：提高 GC 效率

**并发（Concurrent）**：

- GC 线程与应用线程同时工作
- 应用线程大部分时间可以继续运行
- 关注点：减少停顿时间

### 重要说明

即使是支持并发的垃圾回收器，也不是在所有阶段都能并发执行：

**并发阶段：**

- 并发标记
- 并发清理
- 并发重置

**必须 STW 的阶段：**

- 初始标记
- 重新标记
- 对象转移/复制
- 引用处理
- 类卸载
- 符号表和字符串表处理

因此，"并发"具有明显的**阶段性特征**。

## 垃圾回收算法

### 1. 标记-清除算法（Mark-Sweep）

**算法流程：**

1. **标记阶段**：从 GC Roots 开始遍历，标记所有可达对象
2. **清除阶段**：遍历整个堆，回收未被标记的对象

**处理方式：**
```
标记阶段：
  for each root in GC_Roots:
    mark_reachable(root)
    
清除阶段：
  for each object in heap:
    if not marked(object):
      free(object)
    else:
      unmark(object)  // 为下次GC准备
```

**优势：**

- 实现简单，是最基础的回收算法
- 不需要移动对象，速度较快
- 适用于存活对象较多的场景

**劣势：**

- 产生内存碎片
- 需要两次遍历堆内存
- 标记和清除效率都不高

**应用：**

- CMS 收集器的老年代回收
- 早期的垃圾回收器

### 2. 标记-整理算法（Mark-Compact）

**算法流程：**

1. **标记阶段**：标记所有可达对象
2. **整理阶段**：将存活对象向内存一端移动
3. **清除阶段**：清理边界外的内存

**处理方式：**
```
标记阶段：
  mark_phase()
  
整理阶段：
  compact_address = heap_start
  for each object in heap:
    if marked(object):
      move_object(object, compact_address)
      compact_address += object.size
      
清除阶段：
  clear_memory(compact_address, heap_end)
```

**优势：**

- 解决内存碎片问题
- 内存利用率高
- 分配新对象时简单高效

**劣势：**

- 需要移动对象，成本较高
- 需要更新所有指向移动对象的引用
- STW 时间较长

**应用：**

- Serial Old、Parallel Old 收集器
- 老年代回收的主要算法

### 3. 复制算法（Copying）

**算法流程：**

1. 将内存分为两个相等的半区（From 和 To）
2. 只使用其中一个半区（From）
3. GC 时将 From 区存活对象复制到 To 区
4. 清空 From 区，交换 From 和 To 区角色

**处理方式：**
```
复制算法：
  to_space_ptr = to_space_start
  
  for each root in GC_Roots:
    if root points to from_space:
      new_addr = copy_object(root.target, to_space_ptr)
      root.target = new_addr
      to_space_ptr += object.size
      
  // 递归复制所有可达对象
  for each copied_object in to_space:
    for each reference in copied_object:
      if reference points to from_space:
        new_addr = copy_object(reference.target, to_space_ptr)
        reference.target = new_addr
        to_space_ptr += object.size
        
  // 交换空间角色
  swap(from_space, to_space)
  clear(from_space)
```

**优势：**

- 没有内存碎片
- 分配内存简单高效（指针碰撞）
- 只需遍历存活对象

**劣势：**

- 内存利用率只有 50%
- 存活对象较多时效率低
- 需要额外空间做担保

**应用：**

- 新生代回收（Eden + Survivor）
- 存活率低的内存区域

### 4. 分代收集算法（Generational）

**核心思想：**
基于"弱分代假说"：

- 绝大多数对象都是朝生夕灭
- 熬过越多次垃圾收集的对象越难以消亡

**内存分区：**
```
堆内存布局：
┌─────────────────┬─────────────────┐
│    新生代        │    老年代        │
│ ┌─────┬───┬───┐ │                 │
│ │Eden │S0 │S1 │ │   Old Gen       │
│ └─────┴───┴───┘ │                 │
└─────────────────┴─────────────────┘
```

**分代策略：**

- **新生代**：使用复制算法，回收频繁
- **老年代**：使用标记-清除或标记-整理，回收较少
- **永久代/元空间**：存储类信息，很少回收

**处理流程：**
```
Minor GC（新生代）：
  1. Eden 区满时触发
  2. 将 Eden + Survivor0 存活对象复制到 Survivor1
  3. 清空 Eden + Survivor0
  4. 交换 Survivor0 和 Survivor1
  5. 年龄达到阈值的对象晋升到老年代
  
Major GC（老年代）：
  1. 老年代空间不足时触发
  2. 使用标记-清除或标记-整理算法
  3. 通常伴随 Minor GC（Full GC）
```

**优势：**

- 针对不同区域使用最适合的算法
- 大幅提高回收效率
- 减少回收频率和停顿时间

### 5. 增量收集算法（Incremental）

**核心思想：**
将垃圾回收工作分解为多个小步骤，与应用程序交替执行。

**处理方式：**
```
增量标记：
  while not all_objects_processed:
    process_small_batch_of_objects()
    yield_to_application()  // 让应用程序运行一段时间
    
三色标记法：
  白色：未访问的对象
  灰色：已访问但子对象未访问的对象
  黑色：已访问且子对象也已访问的对象
```

**优势：**

- 减少单次停顿时间
- 提高应用程序响应性
- 适合实时性要求高的应用

**劣势：**

- 总体回收时间可能增加
- 实现复杂度高
- 需要处理并发修改问题

### 6. 区域化收集算法（Regional）

**代表实现：G1 GC**

**核心思想：**
将堆内存划分为多个大小相等的区域（Region），每个区域可以独立回收。

**处理方式：**
```
G1 回收流程：
  1. 并发标记：标记所有存活对象
  2. 计算回收价值：垃圾对象数量 / 回收时间
  3. 选择回收集合：优先回收价值高的区域
  4. 混合回收：同时回收新生代和部分老年代区域
```

**优势：**

- 可预测的停顿时间
- 内存利用率高
- 适合大堆内存应用

**应用：**

- G1 垃圾收集器
- 大内存、低延迟应用

## 垃圾回收器详解

### 1. Serial GC（串行垃圾回收器）

**适用场景：**

- 单核 CPU 或小内存应用
- 客户端应用程序
- 堆内存小于 100MB 的应用

**组成：**

- **Serial**：新生代收集器
- **Serial Old**：老年代收集器

**算法流程：**
```
Serial GC 工作流程：
1. 新生代回收（Minor GC）：
   - STW 暂停所有应用线程
   - 单线程执行复制算法
   - Eden + Survivor0 → Survivor1
   - 年龄增长，达到阈值晋升老年代
   
2. 老年代回收（Major GC）：
   - STW 暂停所有应用线程
   - 单线程执行标记-整理算法
   - 标记 → 整理 → 清除
```

**特点：**

- 简单可靠，无线程交互开销
- STW 时间较长
- 内存占用小

**JVM 参数：**
```bash
-XX:+UseSerialGC
```

### 2. Parallel GC（并行垃圾回收器）

**适用场景：**

- 多核 CPU 环境
- 注重吞吐量的服务器应用
- 批处理任务

**组成：**

- **Parallel Scavenge**：新生代收集器
- **Parallel Old**：老年代收集器

**算法流程：**
```
Parallel GC 工作流程：
1. 新生代回收：
   - STW 暂停所有应用线程
   - 多线程并行执行复制算法
   - 线程数 = CPU 核心数
   - 自适应调节堆大小和停顿时间
   
2. 老年代回收：
   - STW 暂停所有应用线程
   - 多线程并行执行标记-整理算法
   - 压缩整理内存空间
```

**特点：**

- 高吞吐量（Throughput First）
- 自适应大小策略
- 可控制最大停顿时间

**JVM 参数：**
```bash
-XX:+UseParallelGC              # 使用 Parallel GC
-XX:ParallelGCThreads=8         # GC 线程数
-XX:MaxGCPauseMillis=200        # 最大停顿时间
-XX:GCTimeRatio=99              # 吞吐量目标
```

### 3. ParNew GC（并行新生代收集器）

**适用场景：**

- 与 CMS 配合使用
- 多核 CPU 环境的新生代回收

**算法流程：**
```
ParNew GC 工作流程：
1. STW 暂停应用线程
2. 多线程并行复制算法：
   - 每个线程处理部分 GC Roots
   - 并行复制存活对象
   - 同步更新引用关系
3. 恢复应用线程执行
```

**特点：**

- Parallel Scavenge 的多线程版本
- 专门与 CMS 配合
- 支持并发收集

**JVM 参数：**
```bash
-XX:+UseParNewGC
-XX:ParallelGCThreads=4
```

### 4. CMS GC（Concurrent Mark Sweep）

**适用场景：**

- 对响应时间敏感的应用
- Web 服务器、交互式应用
- 老年代内存较大的应用

**算法流程：**
```
CMS GC 完整流程：
1. 初始标记（Initial Mark）- STW：
   - 标记 GC Roots 直接关联的对象
   - 停顿时间很短
   
2. 并发标记（Concurrent Mark）：
   - 从 GC Roots 开始遍历整个对象图
   - 与应用线程并发执行
   - 使用三色标记算法
   
3. 并发预清理（Concurrent Preclean）：
   - 处理并发标记期间引用变化
   - 减少重新标记的工作量
   
4. 重新标记（Remark）- STW：
   - 修正并发标记期间的变动
   - 使用增量更新算法
   - 停顿时间较短但比初始标记长
   
5. 并发清除（Concurrent Sweep）：
   - 清除未标记的对象
   - 与应用线程并发执行
   - 不进行内存整理
   
6. 并发重置（Concurrent Reset）：
   - 重置 CMS 算法相关数据结构
   - 为下次 GC 做准备
```

**三色标记算法：**
```
三色标记状态：
- 白色：未被访问的对象（垃圾对象）
- 灰色：已被访问但子对象未访问完的对象
- 黑色：已被访问且子对象也访问完的对象

标记过程：
1. 初始时所有对象为白色
2. 从 GC Roots 开始，将直接引用对象标记为灰色
3. 遍历灰色对象，将其引用的白色对象标记为灰色，自己变为黑色
4. 重复步骤3，直到没有灰色对象
5. 剩余白色对象即为垃圾对象
```

**特点：**

- 低停顿时间
- 并发收集
- 产生内存碎片
- 对 CPU 资源敏感

**JVM 参数：**
```bash
-XX:+UseConcMarkSweepGC         # 启用 CMS
-XX:CMSInitiatingOccupancyFraction=75  # 触发阈值
-XX:+UseCMSCompactAtFullCollection     # Full GC 时整理
-XX:CMSFullGCsBeforeCompaction=0       # 多少次 Full GC 后整理
```

### 5. G1 GC（Garbage First）

**适用场景：**

- 大内存应用（> 4GB）
- 需要可预测停顿时间
- 服务器端应用

**内存布局：**
```
G1 堆内存布局：
┌─────┬─────┬─────┬─────┬─────┬─────┐
│ E   │ S   │ O   │ O   │ H   │ E   │  E: Eden
├─────┼─────┼─────┼─────┼─────┼─────┤  S: Survivor  
│ O   │ E   │ S   │ E   │ O   │ O   │  O: Old
├─────┼─────┼─────┼─────┼─────┼─────┤  H: Humongous
│ E   │ O   │ E   │ O   │ S   │ E   │
└─────┴─────┴─────┴─────┴─────┴─────┘
每个区域大小：1MB - 32MB
```

**算法流程：**
```
G1 GC 完整流程：
1. 新生代回收（Young GC）：
   - STW 暂停
   - 并行复制算法
   - 回收所有 Eden 和 Survivor 区域
   - 部分对象晋升到老年代
   
2. 并发标记周期：
   a) 初始标记（Initial Mark）- STW：
      - 标记 GC Roots 直接引用对象
      - 通常与 Young GC 一起执行
      
   b) 根区域扫描（Root Region Scan）：
      - 扫描 Survivor 区域引用的老年代对象
      - 与应用线程并发
      
   c) 并发标记（Concurrent Mark）：
      - 标记整个堆的存活对象
      - 与应用线程并发
      - 使用 SATB（Snapshot At The Beginning）
      
   d) 重新标记（Remark）- STW：
      - 完成标记过程
      - 处理 SATB 缓冲区
      
   e) 清理（Cleanup）- STW：
      - 计算各区域存活对象
      - 回收完全空闲的区域
      - 重置 Remembered Set
      
3. 混合回收（Mixed GC）：
   - 回收新生代 + 部分老年代区域
   - 选择回收价值最高的区域
   - 可预测停顿时间
```

**SATB 算法：**
```
SATB（Snapshot At The Beginning）：
目的：解决并发标记时的对象漏标问题

工作原理：
1. 并发标记开始时创建对象图快照
2. 应用线程修改引用时记录原始值
3. 将原始引用值放入 SATB 缓冲区
4. 重新标记阶段处理 SATB 缓冲区

伪代码：
write_barrier(obj, field, new_value):
  old_value = obj.field
  if concurrent_marking_active:
    satb_buffer.add(old_value)
  obj.field = new_value
```

**特点：**

- 可预测的停顿时间
- 高吞吐量
- 内存利用率高
- 适合大堆应用

**JVM 参数：**
```bash
-XX:+UseG1GC                    # 启用 G1
-XX:MaxGCPauseMillis=200        # 目标停顿时间
-XX:G1HeapRegionSize=16m        # 区域大小
-XX:G1NewSizePercent=20         # 新生代最小比例
-XX:G1MaxNewSizePercent=80      # 新生代最大比例
```

### 6. ZGC（Z Garbage Collector）

**适用场景：**

- 超大内存应用（TB 级别）
- 极低延迟要求（< 10ms）
- 云原生应用

**核心技术：**
```
ZGC 核心技术：
1. 着色指针（Colored Pointers）：
   - 64位指针中使用高位存储元数据
   - 标记、重定位、记忆集信息
   
2. 读屏障（Load Barrier）：
   - 在对象访问时检查指针状态
   - 自动处理对象重定位
   
3. 并发重定位：
   - 与应用线程并发移动对象
   - 使用转发表记录新旧地址映射
```

**算法流程：**
```
ZGC 工作流程：
1. 并发标记（Concurrent Mark）：
   - 使用着色指针标记存活对象
   - 完全并发，无 STW
   
2. 并发重定位准备（Concurrent Relocation Set Selection）：
   - 选择需要重定位的区域
   - 计算重定位收益
   
3. 并发重定位（Concurrent Relocation）：
   - 并发移动对象到新区域
   - 使用读屏障处理访问
   - 更新转发表
   
4. 并发重映射（Concurrent Remapping）：
   - 更新所有指向旧对象的引用
   - 清理转发表
```

**着色指针技术：**
```
64位着色指针布局：
┌─────────┬─────┬─────┬─────┬─────────────────────────────┐
│ Unused  │ M0  │ M1  │ R   │        Object Address       │
│ 16 bits │ 1   │ 1   │ 1   │          45 bits            │
└─────────┴─────┴─────┴─────┴─────────────────────────────┘

M0: Marked0 - 标记位0
M1: Marked1 - 标记位1  
R:  Remapped - 重映射位

状态转换：
- 标记阶段：设置 M0 或 M1
- 重定位阶段：清除标记位
- 重映射阶段：设置 R 位
```

**特点：**

- 停顿时间 < 10ms
- 支持 TB 级堆内存
- 完全并发收集
- 内存开销较高

**JVM 参数：**
```bash
-XX:+UseZGC                     # 启用 ZGC
-XX:+UnlockExperimentalVMOptions # 解锁实验特性
```

### 7. Shenandoah GC

**适用场景：**

- 低延迟要求的应用
- 大内存应用
- 响应时间敏感的服务

**核心技术：**
```
Shenandoah 核心技术：
1. Brooks Pointers（间接指针）：
   - 每个对象前添加转发指针
   - 支持并发移动对象
   
2. 连接矩阵（Connection Matrix）：
   - 记录区域间引用关系
   - 优化根扫描过程
```

**算法流程：**
```
Shenandoah GC 工作流程：
1. 初始标记（Initial Mark）- STW：
   - 标记 GC Roots 直接引用对象
   - 停顿时间很短
   
2. 并发标记（Concurrent Mark）：
   - 遍历对象图标记存活对象
   - 与应用线程并发
   
3. 最终标记（Final Mark）- STW：
   - 完成标记过程
   - 选择回收集合
   
4. 并发清理（Concurrent Cleanup）：
   - 回收完全空闲的区域
   - 与应用线程并发
   
5. 并发疏散（Concurrent Evacuation）：
   - 移动存活对象到新区域
   - 使用 Brooks Pointers
   - 与应用线程并发
   
6. 初始更新引用（Initial Update References）- STW：
   - 更新 GC Roots 的引用
   - 停顿时间很短
   
7. 并发更新引用（Concurrent Update References）：
   - 更新所有对象的引用
   - 与应用线程并发
   
8. 最终更新引用（Final Update References）- STW：
   - 完成引用更新
   - 停顿时间很短
```

**Brooks Pointers：**
```
Brooks Pointers 结构：
┌─────────────────┬─────────────────┐
│ Forwarding Ptr  │ Object Data     │
│    8 bytes      │   Object Size   │
└─────────────────┴─────────────────┘

访问对象：
1. 读取转发指针
2. 如果指向自己，直接访问
3. 如果指向其他位置，访问新位置
```

**特点：**

- 低停顿时间（< 10ms）
- 完全并发的疏散和引用更新
- 内存开销适中
- 支持大堆内存

**JVM 参数：**
```bash
-XX:+UseShenandoahGC            # 启用 Shenandoah
-XX:+UnlockExperimentalVMOptions # 解锁实验特性
```

### 8. Epsilon GC（无操作垃圾回收器）

**适用场景：**

- 性能测试和基准测试
- 短生命周期应用
- 内存分析和调试

**工作原理：**
```
Epsilon GC 特点：
- 只分配内存，不回收内存
- 内存耗尽时直接 OOM
- 零 GC 开销
- 用于测量 GC 对应用的影响
```

**JVM 参数：**
```bash
-XX:+UseEpsilonGC               # 启用 Epsilon GC
-XX:+UnlockExperimentalVMOptions # 解锁实验特性
```

## 垃圾回收器选择指南

### 选择矩阵

| 应用类型 | 堆大小 | 延迟要求 | 推荐回收器 |
|---------|--------|----------|------------|
| 客户端应用 | < 100MB | 不敏感 | Serial GC |
| 服务器应用 | 100MB-4GB | 吞吐量优先 | Parallel GC |
| Web 应用 | 2GB-32GB | 响应时间敏感 | G1 GC |
| 大内存应用 | > 32GB | 低延迟 | ZGC/Shenandoah |
| 实时系统 | 任意 | 极低延迟 | ZGC |
| 批处理 | 任意 | 高吞吐量 | Parallel GC |

### 性能对比

| 回收器 | 停顿时间 | 吞吐量 | 内存开销 | 适用堆大小 |
|--------|----------|--------|----------|------------|
| Serial | 长 | 低 | 最小 | < 100MB |
| Parallel | 长 | 高 | 小 | 100MB-4GB |
| CMS | 短 | 中 | 中 | 2GB-32GB |
| G1 | 可控 | 高 | 中 | 4GB-64GB |
| ZGC | 极短 | 高 | 高 | > 8GB |
| Shenandoah | 极短 | 中高 | 中高 | > 8GB |

## GC 调优指南

### 调优目标

1. **吞吐量优先**：
   - 目标：最大化应用程序运行时间占比
   - 适用：批处理、科学计算、后台服务
   - 推荐：Parallel GC

2. **延迟优先**：
   - 目标：最小化单次 GC 停顿时间
   - 适用：Web 应用、交互式应用
   - 推荐：G1、ZGC、Shenandoah

3. **内存效率优先**：
   - 目标：最小化内存占用
   - 适用：内存受限环境
   - 推荐：Serial GC

### 调优步骤

```
GC 调优流程：
1. 确定调优目标
   - 吞吐量 vs 延迟 vs 内存使用
   - 设定具体指标（如停顿时间 < 100ms）
   
2. 选择合适的垃圾回收器
   - 根据应用特性和硬件环境
   - 参考选择矩阵
   
3. 设置合理的堆大小
   - 新生代：老年代 = 1:2 或 1:3
   - 总堆大小：物理内存的 1/2 到 3/4
   
4. 监控和分析 GC 日志
   - 启用详细 GC 日志
   - 使用 GC 分析工具
   
5. 逐步调整参数
   - 一次只调整一个参数
   - 观察效果后再进行下一步调整
   
6. 压力测试验证
   - 模拟生产环境负载
   - 验证调优效果
```

### 关键参数调优

#### 堆内存设置
```bash
# 基础堆设置
-Xms4g                          # 初始堆大小
-Xmx4g                          # 最大堆大小
-XX:NewRatio=2                  # 老年代:新生代 = 2:1
-XX:SurvivorRatio=8             # Eden:Survivor = 8:1

# 元空间设置（JDK 8+）
-XX:MetaspaceSize=256m          # 初始元空间大小
-XX:MaxMetaspaceSize=512m       # 最大元空间大小
```

#### G1 GC 调优
```bash
# G1 基础设置
-XX:+UseG1GC
-XX:MaxGCPauseMillis=100        # 目标停顿时间
-XX:G1HeapRegionSize=16m        # 区域大小

# G1 高级设置
-XX:G1NewSizePercent=20         # 新生代最小比例
-XX:G1MaxNewSizePercent=80      # 新生代最大比例
-XX:G1MixedGCCountTarget=8      # 混合 GC 次数目标
-XX:G1HeapWastePercent=5        # 允许的堆浪费百分比
```

#### ZGC 调优
```bash
# ZGC 基础设置
-XX:+UseZGC
-XX:+UnlockExperimentalVMOptions

# ZGC 高级设置
-XX:ZCollectionInterval=5       # 收集间隔（秒）
-XX:ZUncommitDelay=300          # 内存归还延迟（秒）
```

### GC 日志配置

#### JDK 8 及以前
```bash
-XX:+PrintGC                    # 打印 GC 信息
-XX:+PrintGCDetails             # 打印详细 GC 信息
-XX:+PrintGCTimeStamps          # 打印时间戳
-XX:+PrintGCApplicationStoppedTime  # 打印停顿时间
-Xloggc:gc.log                  # GC 日志文件
-XX:+UseGCLogFileRotation       # 日志轮转
-XX:NumberOfGCLogFiles=5        # 日志文件数量
-XX:GCLogFileSize=100M          # 单个日志文件大小
```

#### JDK 9+
```bash
-Xlog:gc*:gc.log:time,tags      # 统一日志格式
-Xlog:gc*:gc-%t.log:time,tags   # 带时间戳的日志文件
```

## 常见 GC 问题与解决方案

### 1. Full GC 频繁

**症状：**

- Full GC 频率过高
- 应用响应时间长
- 吞吐量下降

**原因分析：**
```
可能原因：
1. 老年代空间不足
2. 元空间（永久代）不足
3. 内存泄漏
4. 大对象频繁分配
5. 新生代设置过小
```

**解决方案：**
```bash
# 增加堆内存
-Xmx8g

# 调整新生代比例
-XX:NewRatio=1                  # 新生代:老年代 = 1:1

# 增加元空间
-XX:MaxMetaspaceSize=512m

# 启用 CMS 增量模式（已废弃）
-XX:+CMSIncrementalMode
```

### 2. Minor GC 时间过长

**症状：**

- 新生代 GC 停顿时间长
- 年轻代回收效率低

**原因分析：**
```
可能原因：
1. 新生代过大
2. 存活对象过多
3. 跨代引用过多
4. GC 线程数设置不当
```

**解决方案：**
```bash
# 调整新生代大小
-Xmn2g

# 调整 Survivor 比例
-XX:SurvivorRatio=6             # Eden:Survivor = 6:1

# 调整 GC 线程数
-XX:ParallelGCThreads=8

# 启用并行 GC
-XX:+UseParallelGC
```

### 3. 内存泄漏

**症状：**

- 老年代使用率持续上升
- Full GC 后内存无法释放
- 最终导致 OutOfMemoryError

**诊断方法：**
```bash
# 生成堆转储
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=/path/to/dump

# 手动生成堆转储
jmap -dump:format=b,file=heap.hprof <pid>

# 分析工具
# Eclipse MAT、VisualVM、JProfiler
```

**解决方案：**

1. 使用内存分析工具定位泄漏点
2. 检查静态集合、缓存、监听器
3. 确保及时关闭资源
4. 避免创建不必要的对象引用

### 4. GC 停顿时间不稳定

**症状：**

- GC 停顿时间波动大
- 偶尔出现长时间停顿

**原因分析：**
```
可能原因：
1. 堆内存碎片化
2. 大对象分配
3. 系统负载不均
4. JIT 编译影响
```

**解决方案：**
```bash
# 使用 G1 GC
-XX:+UseG1GC
-XX:MaxGCPauseMillis=100

# 启用压缩指针
-XX:+UseCompressedOops

# 预分配内存
-XX:+AlwaysPreTouch
```

## GC 监控与分析

### 监控指标

1. **吞吐量指标**：
   - GC 时间占比
   - 应用运行时间占比
   - 每秒处理请求数

2. **延迟指标**：
   - 平均 GC 停顿时间
   - 最大 GC 停顿时间
   - GC 停顿时间分布

3. **内存指标**：
   - 堆内存使用率
   - 各代内存使用情况
   - GC 频率

### 分析工具

#### 命令行工具
```bash
# jstat - JVM 统计信息
jstat -gc <pid> 1s              # 每秒输出 GC 信息
jstat -gccapacity <pid>         # 输出内存容量信息
jstat -gcutil <pid> 1s 10       # 输出 GC 利用率

# jmap - 内存映射
jmap -histo <pid>               # 输出对象统计
jmap -dump:format=b,file=heap.hprof <pid>  # 生成堆转储

# jstack - 线程堆栈
jstack <pid>                    # 输出线程堆栈信息
```

#### 图形化工具

1. **VisualVM**：
   - 实时监控 JVM 状态
   - 分析堆转储文件
   - 性能分析和调优

2. **Eclipse MAT**：
   - 专业的内存分析工具
   - 内存泄漏检测
   - 对象引用分析

3. **GCViewer**：
   - GC 日志可视化分析
   - 性能趋势分析
   - 调优建议

4. **JProfiler**：
   - 商业性能分析工具
   - 实时监控和分析
   - 内存和 CPU 分析

### GC 日志分析

#### 典型 GC 日志解读
```
# G1 GC 日志示例
2023-01-01T10:00:00.000+0800: [GC pause (G1 Evacuation Pause) (young)
 Desired survivor size 16777216 bytes, new threshold 15 (max 15)
 [Parallel Time: 10.0 ms, GC Workers: 8]
    [GC Worker Start (ms): Min: 0.0, Avg: 0.1, Max: 0.2, Diff: 0.2]
    [Ext Root Scanning (ms): Min: 0.5, Avg: 0.8, Max: 1.2, Diff: 0.7]
    [Update RS (ms): Min: 0.0, Avg: 0.1, Max: 0.3, Diff: 0.3]
    [Scan RS (ms): Min: 0.0, Avg: 0.1, Max: 0.2, Diff: 0.2]
    [Code Root Scanning (ms): Min: 0.0, Avg: 0.0, Max: 0.1, Diff: 0.1]
    [Object Copy (ms): Min: 8.0, Avg: 8.5, Max: 9.0, Diff: 1.0]
    [Termination (ms): Min: 0.0, Avg: 0.2, Max: 0.5, Diff: 0.5]
 [Other: 2.0 ms]
 [Eden: 512M(512M)->0B(512M) Survivors: 64M->64M Heap: 1024M(2048M)->576M(2048M)]
 [Times: user=0.08 sys=0.00, real=0.01 secs]
```

**关键信息解读：**

- **GC 类型**：G1 Evacuation Pause (young)
- **停顿时间**：real=0.01 secs（10ms）
- **内存变化**：Eden 从 512M 回收到 0B
- **堆使用**：从 1024M 减少到 576M
- **并行度**：8 个 GC 工作线程

## 最佳实践

### 1. 应用层面优化

```java
// 对象池复用
public class ObjectPool<T> {
    private final Queue<T> pool = new ConcurrentLinkedQueue<>();
    private final Supplier<T> factory;
    
    public T acquire() {
        T object = pool.poll();
        return object != null ? object : factory.get();
    }
    
    public void release(T object) {
        // 重置对象状态
        reset(object);
        pool.offer(object);
    }
}

// 避免频繁字符串拼接
StringBuilder sb = new StringBuilder();
for (String item : items) {
    sb.append(item).append(",");
}
String result = sb.toString();

// 合理使用集合初始容量
List<String> list = new ArrayList<>(expectedSize);
Map<String, Object> map = new HashMap<>(expectedSize * 4 / 3);
```

### 2. JVM 参数最佳实践

```bash
# 生产环境推荐配置
# 基础内存设置
-Xms8g -Xmx8g                   # 堆内存
-XX:MetaspaceSize=256m          # 元空间
-XX:MaxMetaspaceSize=512m
-XX:MaxDirectMemorySize=1g      # 直接内存

# G1 GC 配置
-XX:+UseG1GC
-XX:MaxGCPauseMillis=100
-XX:G1HeapRegionSize=16m
-XX:G1NewSizePercent=30
-XX:G1MaxNewSizePercent=60
-XX:G1MixedGCCountTarget=8

# GC 日志
-Xlog:gc*:gc-%t.log:time,tags
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=/path/to/dumps

# 性能优化
-XX:+UseCompressedOops          # 压缩指针
-XX:+UseCompressedClassPointers # 压缩类指针
-XX:+AlwaysPreTouch             # 预分配内存
```

### 3. 监控和告警

```yaml
# Prometheus 监控指标
metrics:
  - jvm_gc_collection_seconds     # GC 耗时
  - jvm_memory_bytes_used         # 内存使用量
  - jvm_memory_pool_bytes_used    # 内存池使用量
  - jvm_gc_memory_allocated_bytes # 分配内存量

# 告警规则
alerts:
  - name: "GC 停顿时间过长"
    condition: "gc_pause_time > 200ms"
    
  - name: "Full GC 频率过高"
    condition: "full_gc_rate > 1/hour"
    
  - name: "内存使用率过高"
    condition: "heap_usage > 85%"
```

### 4. 容器化环境注意事项

```bash
# Docker 容器 JVM 设置
# 自动检测容器内存限制（JDK 8u191+）
-XX:+UseContainerSupport
-XX:MaxRAMPercentage=75.0       # 使用容器内存的 75%

# Kubernetes 环境
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app
    resources:
      requests:
        memory: "4Gi"
      limits:
        memory: "8Gi"
    env:
    - name: JAVA_OPTS
      value: "-XX:+UseG1GC -XX:MaxRAMPercentage=75.0"
```

## 总结

JVM 垃圾回收是一个复杂而重要的主题，选择合适的垃圾回收器和调优策略对应用性能至关重要：

1. **理解业务需求**：明确是优先考虑吞吐量还是延迟
2. **选择合适的回收器**：根据应用特性和硬件环境选择
3. **持续监控和调优**：通过监控指标持续优化 GC 性能
4. **应用层面优化**：减少对象创建，合理使用内存
5. **测试验证**：在类生产环境中验证调优效果

随着 JVM 技术的发展，新一代低延迟垃圾回收器（如 ZGC、Shenandoah）正在成为大内存、低延迟应用的首选，而传统的分代回收器仍然在特定场景下发挥重要作用。选择和调优垃圾回收器需要结合具体的应用场景和性能要求，通过实际测试来验证效果。
