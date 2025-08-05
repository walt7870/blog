# 排序算法详解

排序算法是计算机科学中最基础和重要的算法之一。本文详细介绍各种排序算法的原理、实现和应用场景。

## 算法分类

### 按时间复杂度分类
- **O(n²) 算法**：冒泡排序、选择排序、插入排序
- **O(n log n) 算法**：快速排序、归并排序、堆排序
- **O(n) 算法**：计数排序、桶排序、基数排序（特定条件下）

### 按稳定性分类
- **稳定排序**：冒泡排序、插入排序、归并排序、计数排序
- **不稳定排序**：选择排序、快速排序、堆排序

### 按空间复杂度分类
- **原地排序**：冒泡排序、选择排序、插入排序、快速排序、堆排序
- **非原地排序**：归并排序、计数排序、桶排序、基数排序

## 基础排序算法

### 冒泡排序 (Bubble Sort)

#### 算法原理
重复遍历数组，比较相邻元素并交换位置，使较大元素逐渐"冒泡"到数组末尾。

#### 时间复杂度
- 最好情况：O(n) - 数组已排序
- 最坏情况：O(n²) - 数组逆序
- 平均情况：O(n²)

#### 空间复杂度
O(1) - 原地排序

#### 代码实现

```python
def bubble_sort(arr):
    """
    冒泡排序实现
    """
    n = len(arr)
    
    for i in range(n):
        # 优化：如果一轮遍历中没有交换，说明已排序
        swapped = False
        
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        
        # 如果没有交换，提前结束
        if not swapped:
            break
    
    return arr

# 示例
arr = [64, 34, 25, 12, 22, 11, 90]
print(f"原数组: {arr}")
sorted_arr = bubble_sort(arr.copy())
print(f"排序后: {sorted_arr}")
```

#### 适用场景
- 数据量小的情况
- 教学演示
- 几乎已排序的数据

### 选择排序 (Selection Sort)

#### 算法原理
每次从未排序部分选择最小元素，放到已排序部分的末尾。

#### 时间复杂度
- 所有情况：O(n²)

#### 空间复杂度
O(1) - 原地排序

#### 代码实现

```python
def selection_sort(arr):
    """
    选择排序实现
    """
    n = len(arr)
    
    for i in range(n):
        # 找到未排序部分的最小元素索引
        min_idx = i
        for j in range(i + 1, n):
            if arr[j] < arr[min_idx]:
                min_idx = j
        
        # 交换最小元素到正确位置
        arr[i], arr[min_idx] = arr[min_idx], arr[i]
    
    return arr

# 示例
arr = [64, 25, 12, 22, 11]
print(f"原数组: {arr}")
sorted_arr = selection_sort(arr.copy())
print(f"排序后: {sorted_arr}")
```

#### 适用场景
- 内存写入代价高的情况（交换次数少）
- 数据量小的情况

### 插入排序 (Insertion Sort)

#### 算法原理
将数组分为已排序和未排序两部分，逐个将未排序元素插入到已排序部分的正确位置。

#### 时间复杂度
- 最好情况：O(n) - 数组已排序
- 最坏情况：O(n²) - 数组逆序
- 平均情况：O(n²)

#### 空间复杂度
O(1) - 原地排序

#### 代码实现

```python
def insertion_sort(arr):
    """
    插入排序实现
    """
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        
        # 将大于key的元素向右移动
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        
        # 插入key到正确位置
        arr[j + 1] = key
    
    return arr

# 示例
arr = [12, 11, 13, 5, 6]
print(f"原数组: {arr}")
sorted_arr = insertion_sort(arr.copy())
print(f"排序后: {sorted_arr}")
```

#### 适用场景
- 小数据集
- 几乎已排序的数据
- 在线算法（数据逐个到达）

## 高效排序算法

### 快速排序 (Quick Sort)

#### 算法原理
选择一个基准元素，将数组分为小于和大于基准的两部分，递归排序两部分。

#### 时间复杂度
- 最好情况：O(n log n) - 每次平均分割
- 最坏情况：O(n²) - 每次分割极不平衡
- 平均情况：O(n log n)

#### 空间复杂度
O(log n) - 递归调用栈

#### 代码实现

```python
def quick_sort(arr, low=0, high=None):
    """
    快速排序实现
    """
    if high is None:
        high = len(arr) - 1
    
    if low < high:
        # 分区操作，返回基准元素的正确位置
        pi = partition(arr, low, high)
        
        # 递归排序基准元素左右两部分
        quick_sort(arr, low, pi - 1)
        quick_sort(arr, pi + 1, high)
    
    return arr

def partition(arr, low, high):
    """
    分区函数，将数组分为小于和大于基准的两部分
    """
    # 选择最后一个元素作为基准
    pivot = arr[high]
    
    # 小于基准的元素的索引
    i = low - 1
    
    for j in range(low, high):
        # 如果当前元素小于或等于基准
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    
    # 将基准元素放到正确位置
    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1

# 示例
arr = [10, 7, 8, 9, 1, 5]
print(f"原数组: {arr}")
sorted_arr = quick_sort(arr.copy())
print(f"排序后: {sorted_arr}")
```

#### 优化技巧

```python
def optimized_quick_sort(arr, low=0, high=None):
    """
    优化的快速排序
    """
    if high is None:
        high = len(arr) - 1
    
    # 对小数组使用插入排序
    if high - low + 1 < 10:
        insertion_sort_range(arr, low, high)
        return arr
    
    if low < high:
        # 三数取中选择基准
        median_of_three(arr, low, high)
        
        pi = partition(arr, low, high)
        optimized_quick_sort(arr, low, pi - 1)
        optimized_quick_sort(arr, pi + 1, high)
    
    return arr

def median_of_three(arr, low, high):
    """
    三数取中法选择基准
    """
    mid = (low + high) // 2
    
    if arr[mid] < arr[low]:
        arr[low], arr[mid] = arr[mid], arr[low]
    if arr[high] < arr[low]:
        arr[low], arr[high] = arr[high], arr[low]
    if arr[high] < arr[mid]:
        arr[mid], arr[high] = arr[high], arr[mid]
    
    # 将中位数放到末尾作为基准
    arr[mid], arr[high] = arr[high], arr[mid]

def insertion_sort_range(arr, low, high):
    """
    对指定范围进行插入排序
    """
    for i in range(low + 1, high + 1):
        key = arr[i]
        j = i - 1
        while j >= low and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
```

#### 适用场景
- 大数据集
- 平均性能要求高
- 内存使用受限

### 归并排序 (Merge Sort)

#### 算法原理
采用分治策略，将数组分为两半，递归排序后合并。

#### 时间复杂度
- 所有情况：O(n log n)

#### 空间复杂度
O(n) - 需要额外数组存储

#### 代码实现

```python
def merge_sort(arr):
    """
    归并排序实现
    """
    if len(arr) <= 1:
        return arr
    
    # 分割数组
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    
    # 合并排序后的数组
    return merge(left, right)

def merge(left, right):
    """
    合并两个已排序的数组
    """
    result = []
    i = j = 0
    
    # 比较并合并
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    
    # 添加剩余元素
    result.extend(left[i:])
    result.extend(right[j:])
    
    return result

# 原地归并排序版本
def merge_sort_inplace(arr, left=0, right=None):
    """
    原地归并排序（减少空间使用）
    """
    if right is None:
        right = len(arr) - 1
    
    if left < right:
        mid = (left + right) // 2
        
        merge_sort_inplace(arr, left, mid)
        merge_sort_inplace(arr, mid + 1, right)
        merge_inplace(arr, left, mid, right)
    
    return arr

def merge_inplace(arr, left, mid, right):
    """
    原地合并函数
    """
    # 创建临时数组
    left_arr = arr[left:mid + 1]
    right_arr = arr[mid + 1:right + 1]
    
    i = j = 0
    k = left
    
    while i < len(left_arr) and j < len(right_arr):
        if left_arr[i] <= right_arr[j]:
            arr[k] = left_arr[i]
            i += 1
        else:
            arr[k] = right_arr[j]
            j += 1
        k += 1
    
    while i < len(left_arr):
        arr[k] = left_arr[i]
        i += 1
        k += 1
    
    while j < len(right_arr):
        arr[k] = right_arr[j]
        j += 1
        k += 1

# 示例
arr = [12, 11, 13, 5, 6, 7]
print(f"原数组: {arr}")
sorted_arr = merge_sort(arr.copy())
print(f"排序后: {sorted_arr}")
```

#### 适用场景
- 需要稳定排序
- 大数据集
- 外部排序（数据不能全部加载到内存）
- 链表排序

### 堆排序 (Heap Sort)

#### 算法原理
利用堆数据结构的性质，构建最大堆后逐个取出最大元素。

#### 时间复杂度
- 所有情况：O(n log n)

#### 空间复杂度
O(1) - 原地排序

#### 代码实现

```python
def heap_sort(arr):
    """
    堆排序实现
    """
    n = len(arr)
    
    # 构建最大堆
    for i in range(n // 2 - 1, -1, -1):
        heapify(arr, n, i)
    
    # 逐个取出最大元素
    for i in range(n - 1, 0, -1):
        # 将最大元素移到末尾
        arr[0], arr[i] = arr[i], arr[0]
        
        # 重新调整堆
        heapify(arr, i, 0)
    
    return arr

def heapify(arr, n, i):
    """
    调整堆，使其满足最大堆性质
    """
    largest = i  # 初始化最大元素为根节点
    left = 2 * i + 1  # 左子节点
    right = 2 * i + 2  # 右子节点
    
    # 如果左子节点存在且大于根节点
    if left < n and arr[left] > arr[largest]:
        largest = left
    
    # 如果右子节点存在且大于当前最大值
    if right < n and arr[right] > arr[largest]:
        largest = right
    
    # 如果最大值不是根节点
    if largest != i:
        arr[i], arr[largest] = arr[largest], arr[i]
        
        # 递归调整受影响的子树
        heapify(arr, n, largest)

# 示例
arr = [12, 11, 13, 5, 6, 7]
print(f"原数组: {arr}")
sorted_arr = heap_sort(arr.copy())
print(f"排序后: {sorted_arr}")
```

#### 适用场景
- 需要原地排序
- 内存使用受限
- 不需要稳定排序

## 线性时间排序算法

### 计数排序 (Counting Sort)

#### 算法原理
统计每个元素出现的次数，然后按顺序输出。

#### 时间复杂度
O(n + k)，其中k是数据范围

#### 空间复杂度
O(k)

#### 代码实现

```python
def counting_sort(arr):
    """
    计数排序实现
    """
    if not arr:
        return arr
    
    # 找到最大值和最小值
    max_val = max(arr)
    min_val = min(arr)
    range_val = max_val - min_val + 1
    
    # 创建计数数组
    count = [0] * range_val
    output = [0] * len(arr)
    
    # 统计每个元素的出现次数
    for num in arr:
        count[num - min_val] += 1
    
    # 计算累积计数
    for i in range(1, range_val):
        count[i] += count[i - 1]
    
    # 构建输出数组（从后往前保证稳定性）
    for i in range(len(arr) - 1, -1, -1):
        output[count[arr[i] - min_val] - 1] = arr[i]
        count[arr[i] - min_val] -= 1
    
    return output

# 简化版本（适用于非负整数）
def simple_counting_sort(arr):
    """
    简化的计数排序（适用于非负整数）
    """
    if not arr:
        return arr
    
    max_val = max(arr)
    count = [0] * (max_val + 1)
    
    # 统计每个元素的出现次数
    for num in arr:
        count[num] += 1
    
    # 重构数组
    result = []
    for i in range(len(count)):
        result.extend([i] * count[i])
    
    return result

# 示例
arr = [4, 2, 2, 8, 3, 3, 1]
print(f"原数组: {arr}")
sorted_arr = counting_sort(arr)
print(f"排序后: {sorted_arr}")
```

#### 适用场景
- 数据范围较小
- 整数排序
- 需要稳定排序

### 桶排序 (Bucket Sort)

#### 算法原理
将数据分布到多个桶中，对每个桶单独排序，最后合并。

#### 时间复杂度
- 平均情况：O(n + k)
- 最坏情况：O(n²)

#### 空间复杂度
O(n + k)

#### 代码实现

```python
def bucket_sort(arr, bucket_count=10):
    """
    桶排序实现
    """
    if len(arr) <= 1:
        return arr
    
    # 找到最大值和最小值
    max_val = max(arr)
    min_val = min(arr)
    
    # 计算桶的范围
    bucket_range = (max_val - min_val) / bucket_count
    
    # 创建桶
    buckets = [[] for _ in range(bucket_count)]
    
    # 将元素分配到桶中
    for num in arr:
        if num == max_val:
            bucket_index = bucket_count - 1
        else:
            bucket_index = int((num - min_val) / bucket_range)
        buckets[bucket_index].append(num)
    
    # 对每个桶进行排序
    for bucket in buckets:
        bucket.sort()  # 可以使用任何排序算法
    
    # 合并桶
    result = []
    for bucket in buckets:
        result.extend(bucket)
    
    return result

# 示例
arr = [0.897, 0.565, 0.656, 0.1234, 0.665, 0.3434]
print(f"原数组: {arr}")
sorted_arr = bucket_sort(arr)
print(f"排序后: {sorted_arr}")
```

#### 适用场景
- 数据均匀分布
- 浮点数排序
- 大数据集的外部排序

### 基数排序 (Radix Sort)

#### 算法原理
按照数字的每一位进行排序，从最低位到最高位。

#### 时间复杂度
O(d × (n + k))，其中d是位数，k是基数

#### 空间复杂度
O(n + k)

#### 代码实现

```python
def radix_sort(arr):
    """
    基数排序实现
    """
    if not arr:
        return arr
    
    # 找到最大值以确定位数
    max_val = max(arr)
    
    # 从最低位开始排序
    exp = 1
    while max_val // exp > 0:
        counting_sort_by_digit(arr, exp)
        exp *= 10
    
    return arr

def counting_sort_by_digit(arr, exp):
    """
    按指定位数进行计数排序
    """
    n = len(arr)
    output = [0] * n
    count = [0] * 10
    
    # 统计每个数字的出现次数
    for i in range(n):
        index = (arr[i] // exp) % 10
        count[index] += 1
    
    # 计算累积计数
    for i in range(1, 10):
        count[i] += count[i - 1]
    
    # 构建输出数组
    i = n - 1
    while i >= 0:
        index = (arr[i] // exp) % 10
        output[count[index] - 1] = arr[i]
        count[index] -= 1
        i -= 1
    
    # 复制回原数组
    for i in range(n):
        arr[i] = output[i]

# 示例
arr = [170, 45, 75, 90, 2, 802, 24, 66]
print(f"原数组: {arr}")
sorted_arr = radix_sort(arr.copy())
print(f"排序后: {sorted_arr}")
```

#### 适用场景
- 整数排序
- 字符串排序
- 数据位数固定

## 排序算法比较

### 性能对比表

| 算法 | 最好时间 | 平均时间 | 最坏时间 | 空间复杂度 | 稳定性 | 原地排序 |
|------|----------|----------|----------|------------|--------|----------|
| 冒泡排序 | O(n) | O(n²) | O(n²) | O(1) | 稳定 | 是 |
| 选择排序 | O(n²) | O(n²) | O(n²) | O(1) | 不稳定 | 是 |
| 插入排序 | O(n) | O(n²) | O(n²) | O(1) | 稳定 | 是 |
| 快速排序 | O(n log n) | O(n log n) | O(n²) | O(log n) | 不稳定 | 是 |
| 归并排序 | O(n log n) | O(n log n) | O(n log n) | O(n) | 稳定 | 否 |
| 堆排序 | O(n log n) | O(n log n) | O(n log n) | O(1) | 不稳定 | 是 |
| 计数排序 | O(n + k) | O(n + k) | O(n + k) | O(k) | 稳定 | 否 |
| 桶排序 | O(n + k) | O(n + k) | O(n²) | O(n + k) | 稳定 | 否 |
| 基数排序 | O(d(n + k)) | O(d(n + k)) | O(d(n + k)) | O(n + k) | 稳定 | 否 |

### 选择建议

#### 小数据集 (n < 50)
- **插入排序**：简单高效，对小数据集性能很好
- **选择排序**：交换次数少，适合写入代价高的情况

#### 中等数据集 (50 ≤ n ≤ 10000)
- **快速排序**：平均性能最好
- **归并排序**：需要稳定排序时
- **堆排序**：内存使用受限时

#### 大数据集 (n > 10000)
- **快速排序**：一般情况下的最佳选择
- **归并排序**：需要稳定排序或外部排序
- **基数排序**：整数数据且位数不多

#### 特殊情况
- **几乎已排序**：插入排序或冒泡排序
- **数据范围小**：计数排序
- **浮点数均匀分布**：桶排序
- **需要稳定排序**：归并排序、插入排序
- **内存受限**：堆排序、快速排序

## 实际应用示例

### 多关键字排序

```python
def multi_key_sort(students):
    """
    多关键字排序示例：按成绩降序，成绩相同按姓名升序
    """
    return sorted(students, key=lambda x: (-x['score'], x['name']))

# 示例数据
students = [
    {'name': 'Alice', 'score': 85},
    {'name': 'Bob', 'score': 90},
    {'name': 'Charlie', 'score': 85},
    {'name': 'David', 'score': 92}
]

sorted_students = multi_key_sort(students)
for student in sorted_students:
    print(f"{student['name']}: {student['score']}")
```

### 自定义比较函数

```python
from functools import cmp_to_key

def custom_compare(x, y):
    """
    自定义比较函数：按字符串长度排序，长度相同按字典序
    """
    if len(x) != len(y):
        return len(x) - len(y)
    return -1 if x < y else (1 if x > y else 0)

words = ['apple', 'pie', 'washington', 'book', 'zebra']
sorted_words = sorted(words, key=cmp_to_key(custom_compare))
print(sorted_words)
```

### 外部排序示例

```python
def external_merge_sort(input_file, output_file, chunk_size=1000):
    """
    外部归并排序：处理无法完全加载到内存的大文件
    """
    import tempfile
    import heapq
    
    # 第一阶段：分块排序
    temp_files = []
    with open(input_file, 'r') as f:
        while True:
            chunk = []
            for _ in range(chunk_size):
                line = f.readline()
                if not line:
                    break
                chunk.append(int(line.strip()))
            
            if not chunk:
                break
            
            # 排序块并写入临时文件
            chunk.sort()
            temp_file = tempfile.NamedTemporaryFile(mode='w', delete=False)
            for num in chunk:
                temp_file.write(f"{num}\n")
            temp_file.close()
            temp_files.append(temp_file.name)
    
    # 第二阶段：多路归并
    with open(output_file, 'w') as output:
        # 打开所有临时文件
        file_handles = [open(f, 'r') for f in temp_files]
        
        # 初始化堆
        heap = []
        for i, fh in enumerate(file_handles):
            line = fh.readline()
            if line:
                heapq.heappush(heap, (int(line.strip()), i))
        
        # 归并
        while heap:
            value, file_index = heapq.heappop(heap)
            output.write(f"{value}\n")
            
            # 从同一文件读取下一个数
            line = file_handles[file_index].readline()
            if line:
                heapq.heappush(heap, (int(line.strip()), file_index))
        
        # 关闭文件
        for fh in file_handles:
            fh.close()
    
    # 清理临时文件
    import os
    for temp_file in temp_files:
        os.unlink(temp_file)
```

## 总结

排序算法是计算机科学的基础，选择合适的排序算法需要考虑：

1. **数据规模**：小数据集可以使用简单算法，大数据集需要高效算法
2. **数据特征**：是否已部分排序、数据分布、数据类型
3. **性能要求**：时间复杂度、空间复杂度、稳定性
4. **实际约束**：内存限制、并行性要求、实现复杂度

在实际应用中，现代编程语言的内置排序函数（如Python的`sorted()`、Java的`Arrays.sort()`）通常采用混合算法，结合了多种排序算法的优点，能够在各种情况下提供良好的性能。

理解各种排序算法的原理和特点，有助于在特定场景下做出最佳选择，也为学习更高级的算法奠定基础。