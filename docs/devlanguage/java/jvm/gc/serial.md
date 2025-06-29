# Serial GC（串行垃圾回收器）

## 概述

Serial GC 是最古老、最基础的垃圾回收器，采用单线程进行垃圾回收工作。它是 Client 模式下的默认垃圾回收器，设计简单、稳定可靠，但在多核环境下性能受限。

## 基本特征

### 核心特点

- **单线程回收**：只使用一个线程进行垃圾回收
- **Stop-The-World**：回收期间暂停所有应用线程
- **简单可靠**：算法简单，没有线程交互开销
- **内存占用小**：回收器本身占用内存很少

### 适用场景

- **单核 CPU 环境**：避免线程切换开销
- **小型应用程序**：堆内存小于 100MB
- **客户端应用**：桌面应用、小工具等
- **嵌入式设备**：资源受限的环境

## 组成结构

Serial GC 由两个收集器组成：

### Serial（新生代收集器）

- **算法**：复制算法
- **目标**：回收新生代（Eden + Survivor）
- **特点**：单线程、STW

### Serial Old（老年代收集器）

- **算法**：标记-整理算法
- **目标**：回收老年代
- **特点**：单线程、STW、内存整理

## 内存布局

```
Serial GC 堆内存布局：
┌─────────────────────────────┬─────────────────────────────┐
│          新生代              │          老年代              │
│ ┌─────┬─────────┬─────────┐ │                             │
│ │Eden │Survivor0│Survivor1│ │        Old Generation       │
│ │ 8:1 │   1:1   │   1:1   │ │                             │
│ └─────┴─────────┴─────────┘ │                             │
└─────────────────────────────┴─────────────────────────────┘
     新生代:老年代 = 1:2（默认）
```

## 工作流程

### Minor GC（新生代回收）

```
Minor GC 详细流程：
1. 触发条件检查：
   - Eden 区域空间不足
   - 新对象分配失败
   
2. STW 暂停：
   - 暂停所有应用线程
   - 确保堆状态一致性
   
3. 根扫描：
   - 扫描 GC Roots
   - 标记直接可达对象
   
4. 复制算法执行：
   - 将 Eden 中存活对象复制到 Survivor1
   - 将 Survivor0 中存活对象复制到 Survivor1
   - 对象年龄增加 1
   
5. 晋升检查：
   - 年龄达到阈值（默认15）的对象晋升到老年代
   - Survivor 区域空间不足时直接晋升
   
6. 空间清理：
   - 清空 Eden 区域
   - 清空 Survivor0 区域
   - 交换 Survivor0 和 Survivor1 角色
   
7. 恢复应用线程：
   - 解除 STW 状态
   - 应用线程继续执行
```

### Major GC（老年代回收）

```
Major GC 详细流程：
1. 触发条件：
   - 老年代空间不足
   - 新生代晋升失败
   - 显式调用 System.gc()
   
2. STW 暂停：
   - 暂停所有应用线程
   - 时间通常较长
   
3. 标记阶段：
   - 从 GC Roots 开始标记
   - 遍历整个老年代对象图
   - 标记所有可达对象
   
4. 整理阶段：
   - 将存活对象向内存一端移动
   - 消除内存碎片
   - 更新对象引用
   
5. 清除阶段：
   - 清理未标记的对象
   - 回收内存空间
   
6. 恢复应用线程：
   - 解除 STW 状态
```

## 算法实现

### 复制算法（新生代）

```java
// Serial GC 新生代复制算法伪代码
public class SerialCopyingGC {
    
    public void minorGC() {
        // 1. STW 暂停
        stopAllApplicationThreads();
        
        try {
            // 2. 初始化复制目标空间
            Space toSpace = getToSpace();
            toSpace.clear();
            
            // 3. 从 GC Roots 开始复制
            for (GCRoot root : getGCRoots()) {
                if (root.pointsToYoungGen()) {
                    Object newObj = copyObject(root.getObject(), toSpace);
                    root.updateReference(newObj);
                }
            }
            
            // 4. 递归复制所有可达对象
            processReferencesInToSpace(toSpace);
            
            // 5. 处理晋升
            promoteOldObjects();
            
            // 6. 交换空间
            swapSpaces();
            
        } finally {
            // 7. 恢复应用线程
            resumeAllApplicationThreads();
        }
    }
    
    private Object copyObject(Object obj, Space toSpace) {
        if (obj.isForwarded()) {
            return obj.getForwardingPointer();
        }
        
        // 检查是否需要晋升
        if (shouldPromote(obj)) {
            return promoteToOldGen(obj);
        }
        
        // 复制到新空间
        Object newObj = toSpace.allocate(obj.size());
        copyObjectData(obj, newObj);
        obj.setForwardingPointer(newObj);
        
        // 增加年龄
        newObj.incrementAge();
        
        return newObj;
    }
    
    private boolean shouldPromote(Object obj) {
        return obj.getAge() >= maxTenuringThreshold ||
               obj.size() > maxSurvivorSize;
    }
}
```

### 标记-整理算法（老年代）

```java
// Serial GC 老年代标记-整理算法伪代码
public class SerialMarkCompactGC {
    
    public void majorGC() {
        // 1. STW 暂停
        stopAllApplicationThreads();
        
        try {
            // 2. 标记阶段
            markPhase();
            
            // 3. 计算新地址
            computeNewAddresses();
            
            // 4. 更新引用
            updateReferences();
            
            // 5. 移动对象
            compactObjects();
            
        } finally {
            // 6. 恢复应用线程
            resumeAllApplicationThreads();
        }
    }
    
    private void markPhase() {
        // 清除所有标记
        clearAllMarks();
        
        // 从 GC Roots 开始标记
        Stack<Object> markStack = new Stack<>();
        
        for (GCRoot root : getGCRoots()) {
            Object obj = root.getObject();
            if (obj != null && !obj.isMarked()) {
                markStack.push(obj);
            }
        }
        
        // 深度优先遍历标记
        while (!markStack.isEmpty()) {
            Object obj = markStack.pop();
            if (!obj.isMarked()) {
                obj.setMarked(true);
                
                // 将引用的对象加入栈
                for (Object ref : obj.getReferences()) {
                    if (ref != null && !ref.isMarked()) {
                        markStack.push(ref);
                    }
                }
            }
        }
    }
    
    private void computeNewAddresses() {
        Address compactPointer = heap.getOldGenStart();
        
        for (Object obj : heap.getOldGenObjects()) {
            if (obj.isMarked()) {
                obj.setNewAddress(compactPointer);
                compactPointer += obj.size();
            }
        }
    }
    
    private void updateReferences() {
        // 更新 GC Roots
        for (GCRoot root : getGCRoots()) {
            Object obj = root.getObject();
            if (obj != null && obj.hasNewAddress()) {
                root.updateReference(obj.getNewAddress());
            }
        }
        
        // 更新对象间引用
        for (Object obj : heap.getAllObjects()) {
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
    
    private void compactObjects() {
        for (Object obj : heap.getOldGenObjects()) {
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

## 性能特征

### 优势

1. **简单可靠**：
   - 算法简单，bug 少
   - 经过长期验证
   - 行为可预测

2. **内存效率**：
   - 回收器本身内存占用小
   - 没有额外的数据结构开销
   - 适合内存受限环境

3. **无线程竞争**：
   - 单线程执行，无同步开销
   - 避免线程切换成本
   - 在单核环境下效率最高

### 劣势

1. **停顿时间长**：
   - 单线程回收速度慢
   - STW 时间与堆大小成正比
   - 不适合大内存应用

2. **吞吐量低**：
   - 无法利用多核优势
   - 回收效率相对较低
   - 影响应用响应性

3. **扩展性差**：
   - 不适合服务器环境
   - 无法处理大并发
   - 性能瓶颈明显

## JVM 参数配置

### 基础参数

```bash
# 启用 Serial GC
-XX:+UseSerialGC

# 堆内存设置
-Xms512m                        # 初始堆大小
-Xmx1g                          # 最大堆大小

# 新生代设置
-Xmn256m                        # 新生代大小
-XX:NewRatio=2                  # 老年代:新生代 = 2:1
-XX:SurvivorRatio=8             # Eden:Survivor = 8:1
```

### 高级参数

```bash
# 晋升相关
-XX:MaxTenuringThreshold=15     # 最大晋升年龄
-XX:TargetSurvivorRatio=50      # Survivor 目标使用率
-XX:PretenureSizeThreshold=1m   # 大对象直接晋升阈值

# GC 触发
-XX:MinHeapFreeRatio=10         # 最小空闲堆比例
-XX:MaxHeapFreeRatio=70         # 最大空闲堆比例

# 调试参数
-XX:+PrintGC                    # 打印 GC 信息
-XX:+PrintGCDetails             # 打印详细 GC 信息
-XX:+PrintGCTimeStamps          # 打印时间戳
```

## 监控与调优

### 关键指标

1. **停顿时间**：
   - Minor GC 停顿时间
   - Major GC 停顿时间
   - 总停顿时间占比

2. **回收频率**：
   - Minor GC 频率
   - Major GC 频率
   - Full GC 频率

3. **内存使用**：
   - 各代内存使用率
   - 晋升率
   - 分配速率

### 调优策略

#### 减少 Minor GC 频率

```bash
# 增加新生代大小
-Xmn512m

# 调整新生代比例
-XX:NewRatio=1                  # 新生代:老年代 = 1:1
```

#### 减少 Major GC 频率

```bash
# 增加老年代大小
-Xmx2g

# 调整晋升阈值
-XX:MaxTenuringThreshold=10

# 设置大对象阈值
-XX:PretenureSizeThreshold=512k
```

#### 优化停顿时间

```bash
# 减少堆大小（如果可能）
-Xmx512m

# 优化对象生命周期
# 应用层面优化，减少长生命周期对象
```

### 监控命令

```bash
# 查看 GC 统计
jstat -gc <pid> 1s

# 查看 GC 性能
jstat -gcutil <pid> 1s

# 查看内存分布
jmap -histo <pid>

# 生成堆转储
jmap -dump:format=b,file=heap.hprof <pid>
```

## 典型应用场景

### 1. 桌面应用程序

```bash
# 配置示例
-XX:+UseSerialGC
-Xms128m
-Xmx512m
-XX:NewRatio=2
```

### 2. 小型 Web 应用

```bash
# 配置示例
-XX:+UseSerialGC
-Xms256m
-Xmx1g
-XX:NewRatio=3
-XX:MaxTenuringThreshold=10
```

### 3. 嵌入式应用

```bash
# 配置示例
-XX:+UseSerialGC
-Xms64m
-Xmx256m
-XX:NewRatio=1
```

## 与其他 GC 对比

| 特性 | Serial GC | Parallel GC | G1 GC |
|------|-----------|-------------|-------|
| 线程数 | 单线程 | 多线程 | 多线程 |
| 停顿时间 | 长 | 中等 | 短 |
| 吞吐量 | 低 | 高 | 中高 |
| 内存开销 | 最低 | 低 | 中等 |
| 适用堆大小 | < 100MB | < 4GB | > 4GB |
| 复杂度 | 最简单 | 简单 | 复杂 |

## 最佳实践

### 1. 选择标准

- **堆内存 < 100MB**：首选 Serial GC
- **单核 CPU**：Serial GC 性能最优
- **客户端应用**：Serial GC 资源占用最少
- **简单应用**：Serial GC 最稳定可靠

### 2. 配置建议

- **合理设置堆大小**：避免过大导致停顿时间过长
- **优化新生代比例**：根据对象生命周期调整
- **监控 GC 日志**：及时发现性能问题
- **应用层优化**：减少对象创建，优化对象生命周期

### 3. 注意事项

- **不适合服务器应用**：停顿时间过长
- **不适合大内存应用**：回收效率低
- **不适合高并发应用**：无法充分利用多核
- **适合稳定性要求高的场景**：算法简单可靠

## 总结

Serial GC 作为最基础的垃圾回收器，具有简单、稳定、资源占用少的特点，非常适合小型应用、客户端程序和资源受限的环境。虽然在多核、大内存的现代服务器环境下性能受限，但在特定场景下仍然是最佳选择。理解 Serial GC 的工作原理对于学习其他更复杂的垃圾回收器也具有重要意义。