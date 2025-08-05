# 分治算法详解

分治算法是一种重要的算法设计策略，通过将复杂问题分解为若干个规模较小的相同子问题，递归求解子问题，然后合并子问题的解来得到原问题的解。

## 分治算法基本概念

### 算法思想

分治算法遵循"分而治之"的思想，主要包含三个步骤：

1. **分解（Divide）**：将原问题分解为若干个规模较小的子问题
2. **解决（Conquer）**：递归地求解各个子问题
3. **合并（Combine）**：将子问题的解合并为原问题的解

### 算法特征

1. **递归结构**：问题可以分解为相同类型的子问题
2. **最优子结构**：原问题的最优解包含子问题的最优解
3. **子问题独立**：子问题之间相互独立，不重叠
4. **规模递减**：子问题的规模比原问题小

### 时间复杂度分析

分治算法的时间复杂度通常可以用递推关系式表示：

```
T(n) = aT(n/b) + f(n)
```

其中：
- a：子问题的个数
- n/b：每个子问题的规模
- f(n)：分解和合并的时间复杂度

根据**主定理（Master Theorem）**可以求解：

1. 如果 f(n) = O(n^(log_b(a) - ε))，则 T(n) = Θ(n^log_b(a))
2. 如果 f(n) = Θ(n^log_b(a))，则 T(n) = Θ(n^log_b(a) * log n)
3. 如果 f(n) = Ω(n^(log_b(a) + ε))，则 T(n) = Θ(f(n))

## 经典分治算法

### 归并排序

#### 算法思想
将数组分成两半，递归地对两半进行排序，然后合并两个有序数组。

#### 时间复杂度
- T(n) = 2T(n/2) + O(n)
- 根据主定理：T(n) = O(n log n)

#### 实现代码

```python
def merge_sort(arr):
    """
    归并排序 - 分治算法实现
    """
    if len(arr) <= 1:
        return arr
    
    # 分解：将数组分成两半
    mid = len(arr) // 2
    left = arr[:mid]
    right = arr[mid:]
    
    # 递归求解子问题
    left_sorted = merge_sort(left)
    right_sorted = merge_sort(right)
    
    # 合并子问题的解
    return merge(left_sorted, right_sorted)

def merge(left, right):
    """
    合并两个有序数组
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

def merge_sort_detailed(arr, depth=0):
    """
    归并排序 - 详细版本，显示递归过程
    """
    indent = "  " * depth
    print(f"{indent}分解: {arr}")
    
    if len(arr) <= 1:
        print(f"{indent}基础情况: {arr}")
        return arr
    
    mid = len(arr) // 2
    left = arr[:mid]
    right = arr[mid:]
    
    print(f"{indent}左半部分: {left}")
    left_sorted = merge_sort_detailed(left, depth + 1)
    
    print(f"{indent}右半部分: {right}")
    right_sorted = merge_sort_detailed(right, depth + 1)
    
    result = merge(left_sorted, right_sorted)
    print(f"{indent}合并结果: {result}")
    
    return result

# 示例
print("归并排序示例:")
arr = [64, 34, 25, 12, 22, 11, 90]
print(f"原数组: {arr}")
print("\n排序过程:")
sorted_arr = merge_sort_detailed(arr)
print(f"\n最终结果: {sorted_arr}")
```

### 快速排序

#### 算法思想
选择一个基准元素，将数组分为小于基准和大于基准的两部分，递归地对两部分进行排序。

#### 时间复杂度
- 最好情况：T(n) = 2T(n/2) + O(n) = O(n log n)
- 最坏情况：T(n) = T(n-1) + O(n) = O(n²)
- 平均情况：O(n log n)

#### 实现代码

```python
import random

def quick_sort(arr, low=0, high=None):
    """
    快速排序 - 分治算法实现
    """
    if high is None:
        high = len(arr) - 1
    
    if low < high:
        # 分解：找到分割点
        pivot_index = partition(arr, low, high)
        
        # 递归求解子问题
        quick_sort(arr, low, pivot_index - 1)
        quick_sort(arr, pivot_index + 1, high)
    
    return arr

def partition(arr, low, high):
    """
    分割函数 - 将数组分为两部分
    """
    # 选择最后一个元素作为基准
    pivot = arr[high]
    
    # 小于基准的元素的索引
    i = low - 1
    
    for j in range(low, high):
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    
    # 将基准放到正确位置
    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1

def quick_sort_random_pivot(arr, low=0, high=None):
    """
    快速排序 - 随机选择基准
    """
    if high is None:
        high = len(arr) - 1
    
    if low < high:
        # 随机选择基准
        random_index = random.randint(low, high)
        arr[random_index], arr[high] = arr[high], arr[random_index]
        
        pivot_index = partition(arr, low, high)
        quick_sort_random_pivot(arr, low, pivot_index - 1)
        quick_sort_random_pivot(arr, pivot_index + 1, high)
    
    return arr

def quick_sort_three_way(arr, low=0, high=None):
    """
    三路快速排序 - 处理重复元素
    """
    if high is None:
        high = len(arr) - 1
    
    if low < high:
        lt, gt = three_way_partition(arr, low, high)
        quick_sort_three_way(arr, low, lt - 1)
        quick_sort_three_way(arr, gt + 1, high)
    
    return arr

def three_way_partition(arr, low, high):
    """
    三路分割：< pivot, = pivot, > pivot
    """
    pivot = arr[low]
    lt = low      # arr[low..lt-1] < pivot
    i = low + 1   # arr[lt..i-1] = pivot
    gt = high + 1 # arr[gt..high] > pivot
    
    while i < gt:
        if arr[i] < pivot:
            arr[lt], arr[i] = arr[i], arr[lt]
            lt += 1
            i += 1
        elif arr[i] > pivot:
            gt -= 1
            arr[i], arr[gt] = arr[gt], arr[i]
        else:
            i += 1
    
    return lt, gt

# 示例
print("\n快速排序示例:")
arr1 = [64, 34, 25, 12, 22, 11, 90]
print(f"原数组: {arr1}")
quick_sort(arr1.copy())
print(f"快速排序结果: {arr1}")

# 三路快速排序示例
arr2 = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]
print(f"\n含重复元素数组: {arr2}")
result = quick_sort_three_way(arr2.copy())
print(f"三路快速排序结果: {result}")
```

### 二分查找

#### 算法思想
在有序数组中查找目标值，每次将搜索范围缩小一半。

#### 时间复杂度
- T(n) = T(n/2) + O(1) = O(log n)

#### 实现代码

```python
def binary_search(arr, target, left=0, right=None):
    """
    二分查找 - 递归实现
    """
    if right is None:
        right = len(arr) - 1
    
    if left > right:
        return -1
    
    mid = (left + right) // 2
    
    if arr[mid] == target:
        return mid
    elif arr[mid] > target:
        return binary_search(arr, target, left, mid - 1)
    else:
        return binary_search(arr, target, mid + 1, right)

def binary_search_iterative(arr, target):
    """
    二分查找 - 迭代实现
    """
    left, right = 0, len(arr) - 1
    
    while left <= right:
        mid = (left + right) // 2
        
        if arr[mid] == target:
            return mid
        elif arr[mid] > target:
            right = mid - 1
        else:
            left = mid + 1
    
    return -1

def binary_search_first_occurrence(arr, target):
    """
    查找第一次出现的位置
    """
    left, right = 0, len(arr) - 1
    result = -1
    
    while left <= right:
        mid = (left + right) // 2
        
        if arr[mid] == target:
            result = mid
            right = mid - 1  # 继续在左半部分查找
        elif arr[mid] > target:
            right = mid - 1
        else:
            left = mid + 1
    
    return result

def binary_search_last_occurrence(arr, target):
    """
    查找最后一次出现的位置
    """
    left, right = 0, len(arr) - 1
    result = -1
    
    while left <= right:
        mid = (left + right) // 2
        
        if arr[mid] == target:
            result = mid
            left = mid + 1  # 继续在右半部分查找
        elif arr[mid] > target:
            right = mid - 1
        else:
            left = mid + 1
    
    return result

def binary_search_range(arr, target):
    """
    查找目标值的范围 [first, last]
    """
    first = binary_search_first_occurrence(arr, target)
    if first == -1:
        return [-1, -1]
    
    last = binary_search_last_occurrence(arr, target)
    return [first, last]

# 示例
print("\n二分查找示例:")
arr = [1, 2, 3, 4, 4, 4, 5, 6, 7, 8]
print(f"数组: {arr}")

target = 4
print(f"\n查找目标: {target}")
print(f"基本二分查找: 索引 {binary_search(arr, target)}")
print(f"第一次出现: 索引 {binary_search_first_occurrence(arr, target)}")
print(f"最后一次出现: 索引 {binary_search_last_occurrence(arr, target)}")
print(f"出现范围: {binary_search_range(arr, target)}")
```

### 大整数乘法

#### Karatsuba算法

#### 算法思想
将两个n位数分解为两个n/2位数，使用3次乘法代替4次乘法。

#### 时间复杂度
- T(n) = 3T(n/2) + O(n)
- 根据主定理：T(n) = O(n^log₂3) ≈ O(n^1.585)

#### 实现代码

```python
def karatsuba_multiply(x, y):
    """
    Karatsuba大整数乘法算法
    """
    # 基础情况
    if x < 10 or y < 10:
        return x * y
    
    # 计算位数
    n = max(len(str(x)), len(str(y)))
    half = n // 2
    
    # 分解
    high1, low1 = divmod(x, 10**half)
    high2, low2 = divmod(y, 10**half)
    
    # 递归计算三个乘法
    z0 = karatsuba_multiply(low1, low2)
    z1 = karatsuba_multiply((low1 + high1), (low2 + high2))
    z2 = karatsuba_multiply(high1, high2)
    
    # 合并结果
    return z2 * (10**(2*half)) + (z1 - z2 - z0) * (10**half) + z0

def karatsuba_multiply_detailed(x, y, depth=0):
    """
    Karatsuba算法 - 详细版本
    """
    indent = "  " * depth
    print(f"{indent}计算: {x} × {y}")
    
    if x < 10 or y < 10:
        result = x * y
        print(f"{indent}基础情况: {result}")
        return result
    
    n = max(len(str(x)), len(str(y)))
    half = n // 2
    
    high1, low1 = divmod(x, 10**half)
    high2, low2 = divmod(y, 10**half)
    
    print(f"{indent}分解 {x}: high={high1}, low={low1}")
    print(f"{indent}分解 {y}: high={high2}, low={low2}")
    
    z0 = karatsuba_multiply_detailed(low1, low2, depth + 1)
    z1 = karatsuba_multiply_detailed((low1 + high1), (low2 + high2), depth + 1)
    z2 = karatsuba_multiply_detailed(high1, high2, depth + 1)
    
    result = z2 * (10**(2*half)) + (z1 - z2 - z0) * (10**half) + z0
    print(f"{indent}合并结果: {result}")
    
    return result

def traditional_multiply(x, y):
    """
    传统乘法算法（用于比较）
    """
    return x * y

# 性能比较
import time

def compare_multiplication_algorithms(x, y):
    """
    比较不同乘法算法的性能
    """
    print(f"\n大整数乘法比较: {x} × {y}")
    
    # Karatsuba算法
    start_time = time.time()
    karatsuba_result = karatsuba_multiply(x, y)
    karatsuba_time = time.time() - start_time
    
    # 传统算法
    start_time = time.time()
    traditional_result = traditional_multiply(x, y)
    traditional_time = time.time() - start_time
    
    print(f"Karatsuba结果: {karatsuba_result}")
    print(f"传统算法结果: {traditional_result}")
    print(f"结果一致: {karatsuba_result == traditional_result}")
    print(f"Karatsuba时间: {karatsuba_time:.6f}秒")
    print(f"传统算法时间: {traditional_time:.6f}秒")

# 示例
print("\nKaratsuba大整数乘法示例:")
x, y = 1234, 5678
print(f"计算过程:")
result = karatsuba_multiply_detailed(x, y)
print(f"\n最终结果: {x} × {y} = {result}")

# 性能比较
compare_multiplication_algorithms(12345678, 87654321)
```

### 最大子数组问题

#### 算法思想
将数组分成两半，最大子数组要么在左半部分，要么在右半部分，要么跨越中点。

#### 时间复杂度
- T(n) = 2T(n/2) + O(n) = O(n log n)

#### 实现代码

```python
def max_subarray_divide_conquer(arr, low=0, high=None):
    """
    最大子数组问题 - 分治算法
    """
    if high is None:
        high = len(arr) - 1
    
    # 基础情况
    if low == high:
        return low, high, arr[low]
    
    # 分解
    mid = (low + high) // 2
    
    # 递归求解左半部分
    left_low, left_high, left_sum = max_subarray_divide_conquer(arr, low, mid)
    
    # 递归求解右半部分
    right_low, right_high, right_sum = max_subarray_divide_conquer(arr, mid + 1, high)
    
    # 求解跨越中点的最大子数组
    cross_low, cross_high, cross_sum = max_crossing_subarray(arr, low, mid, high)
    
    # 合并：选择三者中的最大值
    if left_sum >= right_sum and left_sum >= cross_sum:
        return left_low, left_high, left_sum
    elif right_sum >= left_sum and right_sum >= cross_sum:
        return right_low, right_high, right_sum
    else:
        return cross_low, cross_high, cross_sum

def max_crossing_subarray(arr, low, mid, high):
    """
    求跨越中点的最大子数组
    """
    # 从中点向左扩展
    left_sum = float('-inf')
    current_sum = 0
    max_left = mid
    
    for i in range(mid, low - 1, -1):
        current_sum += arr[i]
        if current_sum > left_sum:
            left_sum = current_sum
            max_left = i
    
    # 从中点向右扩展
    right_sum = float('-inf')
    current_sum = 0
    max_right = mid + 1
    
    for i in range(mid + 1, high + 1):
        current_sum += arr[i]
        if current_sum > right_sum:
            right_sum = current_sum
            max_right = i
    
    return max_left, max_right, left_sum + right_sum

def max_subarray_kadane(arr):
    """
    最大子数组问题 - Kadane算法（动态规划，O(n)）
    """
    max_sum = float('-inf')
    current_sum = 0
    start = end = 0
    temp_start = 0
    
    for i in range(len(arr)):
        current_sum += arr[i]
        
        if current_sum > max_sum:
            max_sum = current_sum
            start = temp_start
            end = i
        
        if current_sum < 0:
            current_sum = 0
            temp_start = i + 1
    
    return start, end, max_sum

def compare_max_subarray_algorithms(arr):
    """
    比较不同最大子数组算法
    """
    print(f"数组: {arr}")
    
    # 分治算法
    start1, end1, sum1 = max_subarray_divide_conquer(arr)
    print(f"\n分治算法:")
    print(f"  最大子数组: arr[{start1}:{end1+1}] = {arr[start1:end1+1]}")
    print(f"  最大和: {sum1}")
    
    # Kadane算法
    start2, end2, sum2 = max_subarray_kadane(arr)
    print(f"\nKadane算法:")
    print(f"  最大子数组: arr[{start2}:{end2+1}] = {arr[start2:end2+1]}")
    print(f"  最大和: {sum2}")
    
    print(f"\n结果一致: {sum1 == sum2}")

# 示例
print("\n最大子数组问题示例:")
arr = [-2, 1, -3, 4, -1, 2, 1, -5, 4]
compare_max_subarray_algorithms(arr)
```

### 矩阵乘法

#### Strassen算法

#### 算法思想
将矩阵分块，使用7次乘法代替8次乘法来计算矩阵乘积。

#### 时间复杂度
- T(n) = 7T(n/2) + O(n²)
- 根据主定理：T(n) = O(n^log₂7) ≈ O(n^2.807)

#### 实现代码

```python
import numpy as np

def matrix_multiply_traditional(A, B):
    """
    传统矩阵乘法 O(n³)
    """
    n = len(A)
    C = [[0] * n for _ in range(n)]
    
    for i in range(n):
        for j in range(n):
            for k in range(n):
                C[i][j] += A[i][k] * B[k][j]
    
    return C

def matrix_add(A, B):
    """
    矩阵加法
    """
    n = len(A)
    C = [[0] * n for _ in range(n)]
    
    for i in range(n):
        for j in range(n):
            C[i][j] = A[i][j] + B[i][j]
    
    return C

def matrix_subtract(A, B):
    """
    矩阵减法
    """
    n = len(A)
    C = [[0] * n for _ in range(n)]
    
    for i in range(n):
        for j in range(n):
            C[i][j] = A[i][j] - B[i][j]
    
    return C

def strassen_multiply(A, B):
    """
    Strassen矩阵乘法算法
    """
    n = len(A)
    
    # 基础情况
    if n <= 2:
        return matrix_multiply_traditional(A, B)
    
    # 确保矩阵大小是2的幂
    if n % 2 != 0:
        # 填充矩阵
        A = pad_matrix(A)
        B = pad_matrix(B)
        n = len(A)
    
    # 分块
    mid = n // 2
    
    A11 = [[A[i][j] for j in range(mid)] for i in range(mid)]
    A12 = [[A[i][j] for j in range(mid, n)] for i in range(mid)]
    A21 = [[A[i][j] for j in range(mid)] for i in range(mid, n)]
    A22 = [[A[i][j] for j in range(mid, n)] for i in range(mid, n)]
    
    B11 = [[B[i][j] for j in range(mid)] for i in range(mid)]
    B12 = [[B[i][j] for j in range(mid, n)] for i in range(mid)]
    B21 = [[B[i][j] for j in range(mid)] for i in range(mid, n)]
    B22 = [[B[i][j] for j in range(mid, n)] for i in range(mid, n)]
    
    # 计算7个乘积
    M1 = strassen_multiply(matrix_add(A11, A22), matrix_add(B11, B22))
    M2 = strassen_multiply(matrix_add(A21, A22), B11)
    M3 = strassen_multiply(A11, matrix_subtract(B12, B22))
    M4 = strassen_multiply(A22, matrix_subtract(B21, B11))
    M5 = strassen_multiply(matrix_add(A11, A12), B22)
    M6 = strassen_multiply(matrix_subtract(A21, A11), matrix_add(B11, B12))
    M7 = strassen_multiply(matrix_subtract(A12, A22), matrix_add(B21, B22))
    
    # 计算结果的四个块
    C11 = matrix_add(matrix_subtract(matrix_add(M1, M4), M5), M7)
    C12 = matrix_add(M3, M5)
    C21 = matrix_add(M2, M4)
    C22 = matrix_add(matrix_subtract(matrix_add(M1, M3), M2), M6)
    
    # 合并结果
    C = [[0] * n for _ in range(n)]
    
    for i in range(mid):
        for j in range(mid):
            C[i][j] = C11[i][j]
            C[i][j + mid] = C12[i][j]
            C[i + mid][j] = C21[i][j]
            C[i + mid][j + mid] = C22[i][j]
    
    return C

def pad_matrix(matrix):
    """
    将矩阵填充到2的幂大小
    """
    n = len(matrix)
    next_power_of_2 = 1
    while next_power_of_2 < n:
        next_power_of_2 *= 2
    
    padded = [[0] * next_power_of_2 for _ in range(next_power_of_2)]
    
    for i in range(n):
        for j in range(n):
            padded[i][j] = matrix[i][j]
    
    return padded

def compare_matrix_multiplication(A, B):
    """
    比较不同矩阵乘法算法
    """
    print(f"矩阵大小: {len(A)} × {len(A)}")
    
    # 传统算法
    import time
    start_time = time.time()
    traditional_result = matrix_multiply_traditional(A, B)
    traditional_time = time.time() - start_time
    
    # Strassen算法
    start_time = time.time()
    strassen_result = strassen_multiply(A, B)
    strassen_time = time.time() - start_time
    
    # 验证结果
    n = len(A)
    results_match = True
    for i in range(n):
        for j in range(n):
            if abs(traditional_result[i][j] - strassen_result[i][j]) > 1e-10:
                results_match = False
                break
        if not results_match:
            break
    
    print(f"传统算法时间: {traditional_time:.6f}秒")
    print(f"Strassen算法时间: {strassen_time:.6f}秒")
    print(f"结果一致: {results_match}")
    print(f"加速比: {traditional_time / strassen_time:.2f}x")

# 示例
print("\nStrassen矩阵乘法示例:")

# 创建测试矩阵
A = [[1, 2], [3, 4]]
B = [[5, 6], [7, 8]]

print(f"矩阵A: {A}")
print(f"矩阵B: {B}")

traditional_result = matrix_multiply_traditional(A, B)
strassen_result = strassen_multiply(A, B)

print(f"传统算法结果: {traditional_result}")
print(f"Strassen算法结果: {strassen_result}")

# 性能比较（较大矩阵）
print("\n性能比较:")
n = 4
A_large = [[i + j for j in range(n)] for i in range(n)]
B_large = [[i * j + 1 for j in range(n)] for i in range(n)]
compare_matrix_multiplication(A_large, B_large)
```

## 分治算法的优化技巧

### 减少递归深度

```python
def optimized_merge_sort(arr, threshold=10):
    """
    优化的归并排序 - 小数组使用插入排序
    """
    if len(arr) <= threshold:
        return insertion_sort(arr)
    
    mid = len(arr) // 2
    left = optimized_merge_sort(arr[:mid], threshold)
    right = optimized_merge_sort(arr[mid:], threshold)
    
    return merge(left, right)

def insertion_sort(arr):
    """
    插入排序 - 用于小数组
    """
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr

# 示例
print("\n优化的归并排序:")
arr = [64, 34, 25, 12, 22, 11, 90, 5, 77, 30]
print(f"原数组: {arr}")
result = optimized_merge_sort(arr.copy())
print(f"排序结果: {result}")
```

### 内存优化

```python
def merge_sort_inplace(arr, temp_arr, left, right):
    """
    原地归并排序 - 减少内存分配
    """
    if left < right:
        mid = (left + right) // 2
        
        merge_sort_inplace(arr, temp_arr, left, mid)
        merge_sort_inplace(arr, temp_arr, mid + 1, right)
        
        merge_inplace(arr, temp_arr, left, mid, right)

def merge_inplace(arr, temp_arr, left, mid, right):
    """
    原地合并
    """
    # 复制到临时数组
    for i in range(left, right + 1):
        temp_arr[i] = arr[i]
    
    i = left      # 左半部分索引
    j = mid + 1   # 右半部分索引
    k = left      # 合并后数组索引
    
    while i <= mid and j <= right:
        if temp_arr[i] <= temp_arr[j]:
            arr[k] = temp_arr[i]
            i += 1
        else:
            arr[k] = temp_arr[j]
            j += 1
        k += 1
    
    # 复制剩余元素
    while i <= mid:
        arr[k] = temp_arr[i]
        i += 1
        k += 1
    
    while j <= right:
        arr[k] = temp_arr[j]
        j += 1
        k += 1

def merge_sort_optimized(arr):
    """
    优化的归并排序入口函数
    """
    temp_arr = [0] * len(arr)
    merge_sort_inplace(arr, temp_arr, 0, len(arr) - 1)
    return arr

# 示例
print("\n内存优化的归并排序:")
arr = [64, 34, 25, 12, 22, 11, 90]
print(f"原数组: {arr}")
result = merge_sort_optimized(arr.copy())
print(f"排序结果: {result}")
```

## 分治算法的应用场景

### 计算几何问题

#### 最近点对问题

```python
import math

def closest_pair_brute_force(points):
    """
    暴力法求最近点对 O(n²)
    """
    n = len(points)
    min_dist = float('inf')
    closest_pair = None
    
    for i in range(n):
        for j in range(i + 1, n):
            dist = distance(points[i], points[j])
            if dist < min_dist:
                min_dist = dist
                closest_pair = (points[i], points[j])
    
    return closest_pair, min_dist

def closest_pair_divide_conquer(points):
    """
    分治法求最近点对 O(n log n)
    """
    # 按x坐标排序
    points_x = sorted(points, key=lambda p: p[0])
    # 按y坐标排序
    points_y = sorted(points, key=lambda p: p[1])
    
    return closest_pair_rec(points_x, points_y)

def closest_pair_rec(px, py):
    """
    递归求解最近点对
    """
    n = len(px)
    
    # 基础情况：使用暴力法
    if n <= 3:
        return closest_pair_brute_force(px)
    
    # 分解
    mid = n // 2
    midpoint = px[mid]
    
    pyl = [point for point in py if point[0] <= midpoint[0]]
    pyr = [point for point in py if point[0] > midpoint[0]]
    
    # 递归求解
    (p1, q1), dl = closest_pair_rec(px[:mid], pyl)
    (p2, q2), dr = closest_pair_rec(px[mid:], pyr)
    
    # 找到较小距离
    if dl <= dr:
        d = dl
        closest_pair = (p1, q1)
    else:
        d = dr
        closest_pair = (p2, q2)
    
    # 检查跨越中线的点对
    strip = [point for point in py if abs(point[0] - midpoint[0]) < d]
    
    for i in range(len(strip)):
        j = i + 1
        while j < len(strip) and (strip[j][1] - strip[i][1]) < d:
            dist = distance(strip[i], strip[j])
            if dist < d:
                d = dist
                closest_pair = (strip[i], strip[j])
            j += 1
    
    return closest_pair, d

def distance(p1, p2):
    """
    计算两点间距离
    """
    return math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)

# 示例
print("\n最近点对问题:")
points = [(2, 3), (12, 30), (40, 50), (5, 1), (12, 10), (3, 4)]
print(f"点集: {points}")

(p1, p2), min_dist = closest_pair_divide_conquer(points)
print(f"最近点对: {p1} 和 {p2}")
print(f"最小距离: {min_dist:.2f}")
```

### 数值计算问题

#### 快速幂算法

```python
def power_divide_conquer(base, exp):
    """
    快速幂算法 - 分治实现
    时间复杂度: O(log n)
    """
    if exp == 0:
        return 1
    
    if exp == 1:
        return base
    
    # 分解
    if exp % 2 == 0:
        # 偶数：base^exp = (base^(exp/2))^2
        half_power = power_divide_conquer(base, exp // 2)
        return half_power * half_power
    else:
        # 奇数：base^exp = base * base^(exp-1)
        return base * power_divide_conquer(base, exp - 1)

def power_iterative(base, exp):
    """
    快速幂算法 - 迭代实现
    """
    result = 1
    
    while exp > 0:
        if exp % 2 == 1:
            result *= base
        base *= base
        exp //= 2
    
    return result

def matrix_power(matrix, n):
    """
    矩阵快速幂
    """
    if n == 0:
        # 返回单位矩阵
        size = len(matrix)
        identity = [[0] * size for _ in range(size)]
        for i in range(size):
            identity[i][i] = 1
        return identity
    
    if n == 1:
        return matrix
    
    if n % 2 == 0:
        half_power = matrix_power(matrix, n // 2)
        return matrix_multiply_traditional(half_power, half_power)
    else:
        return matrix_multiply_traditional(matrix, matrix_power(matrix, n - 1))

# 示例
print("\n快速幂算法:")
base, exp = 2, 10
print(f"计算 {base}^{exp}")
print(f"分治算法结果: {power_divide_conquer(base, exp)}")
print(f"迭代算法结果: {power_iterative(base, exp)}")
print(f"内置函数结果: {base**exp}")

# 矩阵快速幂示例
print("\n矩阵快速幂:")
matrix = [[1, 1], [1, 0]]  # 斐波那契矩阵
n = 5
result = matrix_power(matrix, n)
print(f"矩阵^{n} = {result}")
```

## 分治算法的设计原则

### 问题分解策略

```python
def divide_and_conquer_template(problem, threshold=1):
    """
    分治算法模板
    """
    # 基础情况
    if is_base_case(problem, threshold):
        return solve_base_case(problem)
    
    # 分解问题
    subproblems = divide_problem(problem)
    
    # 递归求解子问题
    subresults = []
    for subproblem in subproblems:
        subresult = divide_and_conquer_template(subproblem, threshold)
        subresults.append(subresult)
    
    # 合并子问题的解
    result = combine_results(subresults)
    
    return result

def is_base_case(problem, threshold):
    """
    判断是否为基础情况
    """
    return len(problem) <= threshold

def solve_base_case(problem):
    """
    解决基础情况
    """
    # 具体实现依赖于问题
    pass

def divide_problem(problem):
    """
    分解问题
    """
    # 具体实现依赖于问题
    pass

def combine_results(subresults):
    """
    合并子问题的解
    """
    # 具体实现依赖于问题
    pass

# 分治算法设计检查清单
def design_checklist():
    """
    分治算法设计检查清单
    """
    checklist = {
        "问题分解": [
            "子问题与原问题类型相同",
            "子问题规模比原问题小",
            "子问题之间相互独立",
            "分解方式简单高效"
        ],
        "基础情况": [
            "基础情况定义清晰",
            "基础情况容易求解",
            "递归能够到达基础情况",
            "基础情况处理正确"
        ],
        "合并策略": [
            "合并操作正确",
            "合并时间复杂度合理",
            "合并结果完整",
            "合并过程稳定"
        ],
        "复杂度分析": [
            "递推关系式正确",
            "主定理适用性",
            "空间复杂度分析",
            "实际性能测试"
        ]
    }
    
    print("分治算法设计检查清单:")
    for category, items in checklist.items():
        print(f"\n{category}:")
        for item in items:
            print(f"  ✓ {item}")

design_checklist()
```

## 总结

分治算法是一种强大的算法设计策略：

### 核心思想
- **分解**：将复杂问题分解为简单子问题
- **递归**：递归地解决子问题
- **合并**：将子问题的解合并为原问题的解

### 适用条件
1. **子问题独立**：子问题之间不重叠
2. **最优子结构**：原问题的解包含子问题的最优解
3. **规模递减**：子问题规模比原问题小
4. **合并可行**：能够有效合并子问题的解

### 经典应用
- **排序算法**：归并排序、快速排序
- **搜索算法**：二分查找
- **数值计算**：快速幂、大整数乘法
- **几何问题**：最近点对、凸包
- **矩阵运算**：Strassen矩阵乘法

### 优化技巧
1. **阈值优化**：小规模问题使用简单算法
2. **内存优化**：减少内存分配和复制
3. **并行化**：子问题可以并行处理
4. **缓存优化**：利用局部性原理

### 复杂度分析
- **主定理**：分析递推关系式
- **递归树**：可视化递归过程
- **空间复杂度**：考虑递归栈空间

分治算法通过"分而治之"的思想，将复杂问题转化为简单问题，是算法设计中的重要工具。掌握分治算法的设计原则和分析方法，对于解决复杂计算问题具有重要意义。