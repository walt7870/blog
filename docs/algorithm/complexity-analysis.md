# 算法复杂度分析

算法复杂度分析是评估算法效率的重要工具，帮助我们理解算法在不同输入规模下的性能表现。复杂度分析包括时间复杂度和空间复杂度两个维度。

## 基本概念

### 渐近记号

#### 大O记号（Big O Notation）

大O记号描述算法在最坏情况下的上界。

```python
def big_o_examples():
    """
    常见的大O复杂度示例
    """
    import time
    import matplotlib.pyplot as plt
    import numpy as np
    
    # O(1) - 常数时间
    def constant_time(arr):
        """无论数组大小，都只访问第一个元素"""
        return arr[0] if arr else None
    
    # O(log n) - 对数时间
    def logarithmic_time(arr, target):
        """二分查找"""
        left, right = 0, len(arr) - 1
        while left <= right:
            mid = (left + right) // 2
            if arr[mid] == target:
                return mid
            elif arr[mid] < target:
                left = mid + 1
            else:
                right = mid - 1
        return -1
    
    # O(n) - 线性时间
    def linear_time(arr):
        """遍历数组求和"""
        total = 0
        for num in arr:
            total += num
        return total
    
    # O(n log n) - 线性对数时间
    def merge_sort(arr):
        """归并排序"""
        if len(arr) <= 1:
            return arr
        
        mid = len(arr) // 2
        left = merge_sort(arr[:mid])
        right = merge_sort(arr[mid:])
        
        return merge(left, right)
    
    def merge(left, right):
        result = []
        i = j = 0
        
        while i < len(left) and j < len(right):
            if left[i] <= right[j]:
                result.append(left[i])
                i += 1
            else:
                result.append(right[j])
                j += 1
        
        result.extend(left[i:])
        result.extend(right[j:])
        return result
    
    # O(n²) - 平方时间
    def quadratic_time(arr):
        """冒泡排序"""
        n = len(arr)
        for i in range(n):
            for j in range(0, n - i - 1):
                if arr[j] > arr[j + 1]:
                    arr[j], arr[j + 1] = arr[j + 1], arr[j]
        return arr
    
    # O(2^n) - 指数时间
    def exponential_time(n):
        """朴素斐波那契递归"""
        if n <= 1:
            return n
        return exponential_time(n - 1) + exponential_time(n - 2)
    
    print("大O复杂度示例:")
    print("O(1) - 常数时间: 数组首元素访问")
    print("O(log n) - 对数时间: 二分查找")
    print("O(n) - 线性时间: 数组遍历")
    print("O(n log n) - 线性对数时间: 归并排序")
    print("O(n²) - 平方时间: 冒泡排序")
    print("O(2^n) - 指数时间: 朴素斐波那契")

big_o_examples()
```

#### 其他渐近记号

```python
def asymptotic_notations():
    """
    渐近记号的定义和关系
    """
    notations = {
        "大O记号 (O)": {
            "定义": "f(n) = O(g(n)) 当且仅当存在正常数c和n₀，使得对所有n ≥ n₀，有f(n) ≤ c·g(n)",
            "含义": "上界，最坏情况",
            "示例": "3n² + 2n + 1 = O(n²)"
        },
        "大Ω记号 (Ω)": {
            "定义": "f(n) = Ω(g(n)) 当且仅当存在正常数c和n₀，使得对所有n ≥ n₀，有f(n) ≥ c·g(n)",
            "含义": "下界，最好情况",
            "示例": "3n² + 2n + 1 = Ω(n²)"
        },
        "大Θ记号 (Θ)": {
            "定义": "f(n) = Θ(g(n)) 当且仅当f(n) = O(g(n))且f(n) = Ω(g(n))",
            "含义": "紧确界，平均情况",
            "示例": "3n² + 2n + 1 = Θ(n²)"
        },
        "小o记号 (o)": {
            "定义": "f(n) = o(g(n)) 当且仅当lim(n→∞) f(n)/g(n) = 0",
            "含义": "严格上界",
            "示例": "2n = o(n²)"
        },
        "小ω记号 (ω)": {
            "定义": "f(n) = ω(g(n)) 当且仅当lim(n→∞) f(n)/g(n) = ∞",
            "含义": "严格下界",
            "示例": "n² = ω(n)"
        }
    }
    
    print("\n渐近记号详解:")
    for notation, info in notations.items():
        print(f"\n{notation}:")
        print(f"  定义: {info['定义']}")
        print(f"  含义: {info['含义']}")
        print(f"  示例: {info['示例']}")

asymptotic_notations()
```

### 复杂度层次

```python
def complexity_hierarchy():
    """
    常见复杂度的层次关系
    """
    complexities = [
        ("O(1)", "常数", "数组访问、哈希表查找"),
        ("O(log log n)", "双重对数", "某些高级数据结构操作"),
        ("O(log n)", "对数", "二分查找、平衡树操作"),
        ("O(√n)", "平方根", "试除法素数判断"),
        ("O(n)", "线性", "数组遍历、线性查找"),
        ("O(n log n)", "线性对数", "高效排序算法"),
        ("O(n²)", "平方", "简单排序、动态规划"),
        ("O(n³)", "立方", "矩阵乘法、三重循环"),
        ("O(2^n)", "指数", "子集枚举、朴素递归"),
        ("O(n!)", "阶乘", "全排列生成、旅行商问题")
    ]
    
    print("\n复杂度层次（从低到高）:")
    print(f"{'复杂度':<15} {'类型':<10} {'典型应用':<30}")
    print("-" * 60)
    
    for complexity, type_name, examples in complexities:
        print(f"{complexity:<15} {type_name:<10} {examples:<30}")
    
    # 数值比较
    print("\n当n=1000时的数值比较:")
    n = 1000
    import math
    
    values = {
        "O(1)": 1,
        "O(log n)": math.log2(n),
        "O(√n)": math.sqrt(n),
        "O(n)": n,
        "O(n log n)": n * math.log2(n),
        "O(n²)": n**2,
        "O(n³)": n**3,
        "O(2^n)": "太大无法计算",
        "O(n!)": "太大无法计算"
    }
    
    for complexity, value in values.items():
        if isinstance(value, (int, float)):
            print(f"{complexity}: {value:,.0f}")
        else:
            print(f"{complexity}: {value}")

complexity_hierarchy()
```

## 时间复杂度分析

### 基本分析方法

```python
def time_complexity_analysis():
    """
    时间复杂度分析的基本方法
    """
    
    # 1. 计算基本操作次数
    def count_operations_example():
        """示例：计算操作次数"""
        def algorithm1(n):
            count = 0
            # 外层循环：n次
            for i in range(n):          # n次
                # 内层循环：n次
                for j in range(n):      # n * n = n²次
                    count += 1         # n²次基本操作
            return count
            # 总操作次数：n² = O(n²)
        
        def algorithm2(n):
            count = 0
            # 外层循环：n次
            for i in range(n):          # n次
                # 内层循环：i次（0到n-1）
                for j in range(i):      # 0+1+2+...+(n-1) = n(n-1)/2次
                    count += 1         # n(n-1)/2次基本操作
            return count
            # 总操作次数：n(n-1)/2 = O(n²)
        
        print("操作次数计算示例:")
        n = 5
        print(f"算法1 (n={n}): {algorithm1(n)} 次操作")
        print(f"算法2 (n={n}): {algorithm2(n)} 次操作")
    
    # 2. 递归算法分析
    def recursive_analysis():
        """递归算法的复杂度分析"""
        
        # 主定理（Master Theorem）
        print("\n主定理分析递归复杂度:")
        print("对于递归关系 T(n) = aT(n/b) + f(n)，其中a≥1, b>1:")
        print("情况1: 如果f(n) = O(n^(log_b(a)-ε))，ε>0，则T(n) = Θ(n^log_b(a))")
        print("情况2: 如果f(n) = Θ(n^log_b(a))，则T(n) = Θ(n^log_b(a) * log n)")
        print("情况3: 如果f(n) = Ω(n^(log_b(a)+ε))，ε>0，且af(n/b)≤cf(n)，c<1，则T(n) = Θ(f(n))")
        
        examples = [
            {
                "算法": "归并排序",
                "递归关系": "T(n) = 2T(n/2) + O(n)",
                "参数": "a=2, b=2, f(n)=n",
                "分析": "log_2(2)=1, f(n)=Θ(n^1)，情况2",
                "结果": "T(n) = Θ(n log n)"
            },
            {
                "算法": "二分查找",
                "递归关系": "T(n) = T(n/2) + O(1)",
                "参数": "a=1, b=2, f(n)=1",
                "分析": "log_2(1)=0, f(n)=Θ(n^0)，情况2",
                "结果": "T(n) = Θ(log n)"
            },
            {
                "算法": "Strassen矩阵乘法",
                "递归关系": "T(n) = 7T(n/2) + O(n²)",
                "参数": "a=7, b=2, f(n)=n²",
                "分析": "log_2(7)≈2.81, f(n)=O(n^2.81-ε)，情况1",
                "结果": "T(n) = Θ(n^log_2(7))"
            }
        ]
        
        print("\n主定理应用示例:")
        for example in examples:
            print(f"\n{example['算法']}:")
            print(f"  递归关系: {example['递归关系']}")
            print(f"  参数: {example['参数']}")
            print(f"  分析: {example['分析']}")
            print(f"  结果: {example['结果']}")
    
    count_operations_example()
    recursive_analysis()

time_complexity_analysis()
```

### 摊还分析

```python
def amortized_analysis():
    """
    摊还分析方法
    """
    
    # 聚合分析示例：动态数组
    class DynamicArray:
        def __init__(self):
            self.capacity = 1
            self.size = 0
            self.data = [None] * self.capacity
        
        def append(self, item):
            if self.size == self.capacity:
                # 扩容：复制所有元素到新数组
                old_data = self.data
                self.capacity *= 2
                self.data = [None] * self.capacity
                for i in range(self.size):
                    self.data[i] = old_data[i]
            
            self.data[self.size] = item
            self.size += 1
    
    def aggregate_analysis():
        """聚合分析：计算n次append操作的总成本"""
        print("\n聚合分析 - 动态数组append操作:")
        
        # 分析n次append操作的总成本
        print("扩容发生在插入第1, 2, 4, 8, 16, ..., 2^k个元素时")
        print("每次扩容的成本分别为1, 2, 4, 8, 16, ..., 2^k")
        
        def total_cost(n):
            """计算n次append的总成本"""
            cost = 0
            i = 1
            while i <= n:
                cost += i  # 扩容成本
                cost += i  # 从上次扩容到这次扩容的插入成本
                i *= 2
            cost += n - (i // 2)  # 最后一段的插入成本
            return cost
        
        n = 16
        total = total_cost(n)
        print(f"\n{n}次append操作总成本: {total}")
        print(f"摊还成本: {total/n:.2f} = O(1)")
    
    # 势能分析示例
    def potential_analysis():
        """势能分析方法"""
        print("\n势能分析 - 动态数组:")
        print("定义势能函数 Φ(D) = 2 * size - capacity")
        print("其中size是当前元素数量，capacity是当前容量")
        
        def analyze_operation(size_before, capacity_before, is_resize):
            if is_resize:
                # 扩容操作
                actual_cost = size_before + 1  # 复制+插入
                capacity_after = capacity_before * 2
                size_after = size_before + 1
                
                phi_before = 2 * size_before - capacity_before
                phi_after = 2 * size_after - capacity_after
                
                amortized_cost = actual_cost + phi_after - phi_before
                
                print(f"扩容操作: 实际成本={actual_cost}, 势能变化={phi_after - phi_before}, 摊还成本={amortized_cost}")
            else:
                # 普通插入
                actual_cost = 1
                size_after = size_before + 1
                capacity_after = capacity_before
                
                phi_before = 2 * size_before - capacity_before
                phi_after = 2 * size_after - capacity_after
                
                amortized_cost = actual_cost + phi_after - phi_before
                
                print(f"普通插入: 实际成本={actual_cost}, 势能变化={phi_after - phi_before}, 摊还成本={amortized_cost}")
        
        # 分析几个操作
        print("\n操作序列分析:")
        analyze_operation(1, 2, False)  # 普通插入
        analyze_operation(2, 2, True)   # 扩容
        analyze_operation(3, 4, False)  # 普通插入
        analyze_operation(4, 4, True)   # 扩容
    
    # 记账分析示例
    def accounting_analysis():
        """记账分析方法"""
        print("\n记账分析 - 动态数组:")
        print("为每次append操作预付3个单位的成本:")
        print("- 1个单位用于当前插入")
        print("- 2个单位存储起来，用于将来的扩容")
        
        print("\n当需要扩容时:")
        print("- 当前插入需要1个单位")
        print("- 复制n个元素需要n个单位")
        print("- 之前存储的2n个单位正好够用")
        print("\n因此摊还成本为3 = O(1)")
    
    aggregate_analysis()
    potential_analysis()
    accounting_analysis()

amortized_analysis()
```

## 空间复杂度分析

### 空间复杂度的组成

```python
def space_complexity_analysis():
    """
    空间复杂度分析
    """
    
    print("空间复杂度的组成:")
    print("1. 输入空间：存储输入数据所需的空间")
    print("2. 辅助空间：算法执行过程中额外需要的空间")
    print("3. 输出空间：存储输出结果所需的空间")
    print("\n通常我们关注的是辅助空间复杂度")
    
    # 不同空间复杂度的示例
    def space_examples():
        """不同空间复杂度的算法示例"""
        
        # O(1) 空间
        def bubble_sort_inplace(arr):
            """原地冒泡排序 - O(1)空间"""
            n = len(arr)
            for i in range(n):
                for j in range(0, n - i - 1):
                    if arr[j] > arr[j + 1]:
                        arr[j], arr[j + 1] = arr[j + 1], arr[j]
            return arr
        
        # O(log n) 空间
        def binary_search_recursive(arr, target, left=0, right=None):
            """递归二分查找 - O(log n)空间（递归栈）"""
            if right is None:
                right = len(arr) - 1
            
            if left > right:
                return -1
            
            mid = (left + right) // 2
            if arr[mid] == target:
                return mid
            elif arr[mid] < target:
                return binary_search_recursive(arr, target, mid + 1, right)
            else:
                return binary_search_recursive(arr, target, left, mid - 1)
        
        # O(n) 空间
        def merge_sort(arr):
            """归并排序 - O(n)空间"""
            if len(arr) <= 1:
                return arr
            
            mid = len(arr) // 2
            left = merge_sort(arr[:mid])    # 需要额外空间
            right = merge_sort(arr[mid:])   # 需要额外空间
            
            return merge(left, right)       # merge也需要额外空间
        
        def merge(left, right):
            result = []  # O(n)空间
            i = j = 0
            
            while i < len(left) and j < len(right):
                if left[i] <= right[j]:
                    result.append(left[i])
                    i += 1
                else:
                    result.append(right[j])
                    j += 1
            
            result.extend(left[i:])
            result.extend(right[j:])
            return result
        
        # O(n²) 空间
        def floyd_warshall(graph):
            """Floyd-Warshall算法 - O(n²)空间"""
            n = len(graph)
            # 创建距离矩阵副本
            dist = [[float('inf')] * n for _ in range(n)]  # O(n²)空间
            
            # 初始化
            for i in range(n):
                for j in range(n):
                    if i == j:
                        dist[i][j] = 0
                    elif graph[i][j] != 0:
                        dist[i][j] = graph[i][j]
            
            # 动态规划
            for k in range(n):
                for i in range(n):
                    for j in range(n):
                        dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
            
            return dist
        
        print("\n空间复杂度示例:")
        print("O(1): 原地冒泡排序 - 只使用常数个额外变量")
        print("O(log n): 递归二分查找 - 递归栈深度为log n")
        print("O(n): 归并排序 - 需要额外数组存储合并结果")
        print("O(n²): Floyd-Warshall - 需要n×n的距离矩阵")
    
    # 递归算法的空间分析
    def recursive_space_analysis():
        """递归算法的空间复杂度分析"""
        print("\n递归算法空间分析:")
        
        def factorial_recursive(n):
            """递归阶乘 - O(n)空间"""
            if n <= 1:
                return 1
            return n * factorial_recursive(n - 1)
        
        def factorial_iterative(n):
            """迭代阶乘 - O(1)空间"""
            result = 1
            for i in range(1, n + 1):
                result *= i
            return result
        
        def fibonacci_recursive(n):
            """递归斐波那契 - O(n)空间（最大递归深度）"""
            if n <= 1:
                return n
            return fibonacci_recursive(n - 1) + fibonacci_recursive(n - 2)
        
        def fibonacci_dp(n):
            """动态规划斐波那契 - O(n)空间"""
            if n <= 1:
                return n
            
            dp = [0] * (n + 1)
            dp[1] = 1
            
            for i in range(2, n + 1):
                dp[i] = dp[i - 1] + dp[i - 2]
            
            return dp[n]
        
        def fibonacci_optimized(n):
            """优化的斐波那契 - O(1)空间"""
            if n <= 1:
                return n
            
            a, b = 0, 1
            for _ in range(2, n + 1):
                a, b = b, a + b
            
            return b
        
        print("阶乘计算:")
        print("  递归版本: O(n)空间（递归栈）")
        print("  迭代版本: O(1)空间")
        
        print("\n斐波那契数列:")
        print("  递归版本: O(n)空间（递归栈深度）")
        print("  动态规划: O(n)空间（存储所有子问题结果）")
        print("  优化版本: O(1)空间（只保存必要的状态）")
    
    space_examples()
    recursive_space_analysis()

space_complexity_analysis()
```

## 实际性能分析

### 理论与实际的差异

```python
import time
import random
import sys

def practical_performance_analysis():
    """
    实际性能分析：理论复杂度与实际运行时间的关系
    """
    
    def measure_time(func, *args):
        """测量函数执行时间"""
        start_time = time.time()
        result = func(*args)
        end_time = time.time()
        return end_time - start_time, result
    
    def compare_sorting_algorithms():
        """比较不同排序算法的实际性能"""
        
        def bubble_sort(arr):
            """冒泡排序 O(n²)"""
            arr = arr.copy()
            n = len(arr)
            for i in range(n):
                for j in range(0, n - i - 1):
                    if arr[j] > arr[j + 1]:
                        arr[j], arr[j + 1] = arr[j + 1], arr[j]
            return arr
        
        def quick_sort(arr):
            """快速排序 O(n log n)平均，O(n²)最坏"""
            if len(arr) <= 1:
                return arr
            
            pivot = arr[len(arr) // 2]
            left = [x for x in arr if x < pivot]
            middle = [x for x in arr if x == pivot]
            right = [x for x in arr if x > pivot]
            
            return quick_sort(left) + middle + quick_sort(right)
        
        def merge_sort(arr):
            """归并排序 O(n log n)"""
            if len(arr) <= 1:
                return arr
            
            mid = len(arr) // 2
            left = merge_sort(arr[:mid])
            right = merge_sort(arr[mid:])
            
            result = []
            i = j = 0
            
            while i < len(left) and j < len(right):
                if left[i] <= right[j]:
                    result.append(left[i])
                    i += 1
                else:
                    result.append(right[j])
                    j += 1
            
            result.extend(left[i:])
            result.extend(right[j:])
            return result
        
        def python_sort(arr):
            """Python内置排序（Timsort）"""
            return sorted(arr)
        
        # 测试不同规模的数据
        sizes = [100, 500, 1000, 2000]
        algorithms = [
            ("冒泡排序", bubble_sort),
            ("快速排序", quick_sort),
            ("归并排序", merge_sort),
            ("Python内置", python_sort)
        ]
        
        print("\n排序算法性能比较:")
        print(f"{'算法':<12} {'n=100':<10} {'n=500':<10} {'n=1000':<10} {'n=2000':<10}")
        print("-" * 60)
        
        for name, algorithm in algorithms:
            times = []
            for size in sizes:
                # 生成随机数据
                data = [random.randint(1, 1000) for _ in range(size)]
                
                try:
                    exec_time, _ = measure_time(algorithm, data)
                    times.append(f"{exec_time:.4f}s")
                except RecursionError:
                    times.append("超时")
                except:
                    times.append("错误")
            
            print(f"{name:<12} {times[0]:<10} {times[1]:<10} {times[2]:<10} {times[3]:<10}")
    
    def cache_effects():
        """缓存效应对性能的影响"""
        print("\n缓存效应分析:")
        
        def matrix_multiply_ijk(A, B):
            """标准矩阵乘法（i-j-k顺序）"""
            n = len(A)
            C = [[0] * n for _ in range(n)]
            
            for i in range(n):
                for j in range(n):
                    for k in range(n):
                        C[i][j] += A[i][k] * B[k][j]
            
            return C
        
        def matrix_multiply_ikj(A, B):
            """缓存友好的矩阵乘法（i-k-j顺序）"""
            n = len(A)
            C = [[0] * n for _ in range(n)]
            
            for i in range(n):
                for k in range(n):
                    for j in range(n):
                        C[i][j] += A[i][k] * B[k][j]
            
            return C
        
        # 测试不同大小的矩阵
        sizes = [50, 100, 200]
        
        print(f"{'矩阵大小':<10} {'i-j-k顺序':<12} {'i-k-j顺序':<12} {'性能提升':<10}")
        print("-" * 50)
        
        for size in sizes:
            # 生成随机矩阵
            A = [[random.random() for _ in range(size)] for _ in range(size)]
            B = [[random.random() for _ in range(size)] for _ in range(size)]
            
            time_ijk, _ = measure_time(matrix_multiply_ijk, A, B)
            time_ikj, _ = measure_time(matrix_multiply_ikj, A, B)
            
            improvement = time_ijk / time_ikj
            
            print(f"{size}×{size:<6} {time_ijk:.4f}s{'':<4} {time_ikj:.4f}s{'':<4} {improvement:.2f}x")
    
    def memory_usage_analysis():
        """内存使用分析"""
        print("\n内存使用分析:")
        
        def get_size(obj):
            """获取对象的内存大小"""
            return sys.getsizeof(obj)
        
        # 不同数据结构的内存使用
        n = 1000
        
        # 列表 vs 生成器
        list_data = [i for i in range(n)]
        gen_data = (i for i in range(n))
        
        print(f"存储{n}个整数:")
        print(f"  列表: {get_size(list_data)} 字节")
        print(f"  生成器: {get_size(gen_data)} 字节")
        
        # 不同数据类型的内存使用
        import array
        
        python_list = list(range(n))
        python_array = array.array('i', range(n))
        
        print(f"\n{n}个整数的存储:")
        print(f"  Python列表: {get_size(python_list)} 字节")
        print(f"  array模块: {get_size(python_array)} 字节")
        print(f"  内存节省: {(get_size(python_list) - get_size(python_array)) / get_size(python_list) * 100:.1f}%")
    
    compare_sorting_algorithms()
    cache_effects()
    memory_usage_analysis()

practical_performance_analysis()
```

### 性能优化策略

```python
def optimization_strategies():
    """
    常见的性能优化策略
    """
    
    # 1. 算法优化
    def algorithm_optimization():
        """算法层面的优化"""
        print("算法优化策略:")
        
        # 示例：斐波那契数列的不同实现
        def fib_naive(n):
            """朴素递归 O(2^n)"""
            if n <= 1:
                return n
            return fib_naive(n - 1) + fib_naive(n - 2)
        
        def fib_memo(n, memo={}):
            """记忆化递归 O(n)"""
            if n in memo:
                return memo[n]
            if n <= 1:
                return n
            memo[n] = fib_memo(n - 1, memo) + fib_memo(n - 2, memo)
            return memo[n]
        
        def fib_dp(n):
            """动态规划 O(n)时间，O(n)空间"""
            if n <= 1:
                return n
            dp = [0] * (n + 1)
            dp[1] = 1
            for i in range(2, n + 1):
                dp[i] = dp[i - 1] + dp[i - 2]
            return dp[n]
        
        def fib_optimized(n):
            """空间优化 O(n)时间，O(1)空间"""
            if n <= 1:
                return n
            a, b = 0, 1
            for _ in range(2, n + 1):
                a, b = b, a + b
            return b
        
        def fib_matrix(n):
            """矩阵快速幂 O(log n)"""
            if n <= 1:
                return n
            
            def matrix_multiply(A, B):
                return [[A[0][0]*B[0][0] + A[0][1]*B[1][0], A[0][0]*B[0][1] + A[0][1]*B[1][1]],
                       [A[1][0]*B[0][0] + A[1][1]*B[1][0], A[1][0]*B[0][1] + A[1][1]*B[1][1]]]
            
            def matrix_power(matrix, power):
                if power == 1:
                    return matrix
                if power % 2 == 0:
                    half = matrix_power(matrix, power // 2)
                    return matrix_multiply(half, half)
                else:
                    return matrix_multiply(matrix, matrix_power(matrix, power - 1))
            
            base_matrix = [[1, 1], [1, 0]]
            result_matrix = matrix_power(base_matrix, n)
            return result_matrix[0][1]
        
        print("\n斐波那契数列优化历程:")
        print("1. 朴素递归: O(2^n) - 指数时间")
        print("2. 记忆化: O(n) - 避免重复计算")
        print("3. 动态规划: O(n)时间，O(n)空间")
        print("4. 空间优化: O(n)时间，O(1)空间")
        print("5. 矩阵快速幂: O(log n) - 对数时间")
    
    # 2. 数据结构优化
    def data_structure_optimization():
        """数据结构优化"""
        print("\n数据结构优化:")
        
        # 示例：查找操作的优化
        import bisect
        
        def linear_search(arr, target):
            """线性查找 O(n)"""
            for i, val in enumerate(arr):
                if val == target:
                    return i
            return -1
        
        def binary_search(arr, target):
            """二分查找 O(log n) - 需要有序数组"""
            left, right = 0, len(arr) - 1
            while left <= right:
                mid = (left + right) // 2
                if arr[mid] == target:
                    return mid
                elif arr[mid] < target:
                    left = mid + 1
                else:
                    right = mid - 1
            return -1
        
        def hash_search(hash_set, target):
            """哈希查找 O(1)平均"""
            return target in hash_set
        
        print("查找操作优化:")
        print("1. 线性查找: O(n) - 适用于无序数据")
        print("2. 二分查找: O(log n) - 需要有序数据")
        print("3. 哈希查找: O(1)平均 - 需要额外空间")
        
        # 数据结构选择指南
        structures = {
            "数组/列表": {
                "访问": "O(1)",
                "搜索": "O(n)",
                "插入": "O(n)",
                "删除": "O(n)",
                "适用场景": "随机访问，大小固定"
            },
            "链表": {
                "访问": "O(n)",
                "搜索": "O(n)",
                "插入": "O(1)",
                "删除": "O(1)",
                "适用场景": "频繁插入删除"
            },
            "哈希表": {
                "访问": "O(1)平均",
                "搜索": "O(1)平均",
                "插入": "O(1)平均",
                "删除": "O(1)平均",
                "适用场景": "快速查找，键值对存储"
            },
            "平衡树": {
                "访问": "O(log n)",
                "搜索": "O(log n)",
                "插入": "O(log n)",
                "删除": "O(log n)",
                "适用场景": "有序数据，范围查询"
            }
        }
        
        print("\n数据结构性能对比:")
        print(f"{'数据结构':<10} {'访问':<12} {'搜索':<12} {'插入':<12} {'删除':<12}")
        print("-" * 70)
        
        for name, ops in structures.items():
            print(f"{name:<10} {ops['访问']:<12} {ops['搜索']:<12} {ops['插入']:<12} {ops['删除']:<12}")
    
    # 3. 缓存优化
    def caching_optimization():
        """缓存优化策略"""
        print("\n缓存优化策略:")
        
        # LRU缓存实现
        class LRUCache:
            def __init__(self, capacity):
                self.capacity = capacity
                self.cache = {}
                self.order = []
            
            def get(self, key):
                if key in self.cache:
                    # 移动到最前面
                    self.order.remove(key)
                    self.order.append(key)
                    return self.cache[key]
                return None
            
            def put(self, key, value):
                if key in self.cache:
                    # 更新值并移动到最前面
                    self.cache[key] = value
                    self.order.remove(key)
                    self.order.append(key)
                else:
                    # 新增
                    if len(self.cache) >= self.capacity:
                        # 删除最久未使用的
                        oldest = self.order.pop(0)
                        del self.cache[oldest]
                    
                    self.cache[key] = value
                    self.order.append(key)
        
        # 函数结果缓存
        def memoize(func):
            """装饰器：缓存函数结果"""
            cache = {}
            
            def wrapper(*args):
                if args in cache:
                    return cache[args]
                result = func(*args)
                cache[args] = result
                return result
            
            return wrapper
        
        @memoize
        def expensive_function(n):
            """模拟耗时计算"""
            import time
            time.sleep(0.1)  # 模拟计算时间
            return n * n
        
        print("缓存策略:")
        print("1. LRU缓存: 最近最少使用")
        print("2. 函数结果缓存: 避免重复计算")
        print("3. 数据预取: 提前加载可能需要的数据")
        print("4. 分层缓存: 多级缓存系统")
    
    algorithm_optimization()
    data_structure_optimization()
    caching_optimization()

optimization_strategies()
```

## 复杂度分析工具

### 性能测试框架

```python
import time
import tracemalloc
import functools
import matplotlib.pyplot as plt
import numpy as np

class PerformanceAnalyzer:
    """
    性能分析工具类
    """
    
    def __init__(self):
        self.results = {}
    
    def time_complexity_test(self, func, input_generator, sizes, name=None):
        """
        测试时间复杂度
        """
        if name is None:
            name = func.__name__
        
        times = []
        
        for size in sizes:
            # 生成测试数据
            test_input = input_generator(size)
            
            # 测量执行时间
            start_time = time.perf_counter()
            
            if isinstance(test_input, tuple):
                func(*test_input)
            else:
                func(test_input)
            
            end_time = time.perf_counter()
            
            execution_time = end_time - start_time
            times.append(execution_time)
        
        self.results[name] = {
            'sizes': sizes,
            'times': times,
            'type': 'time'
        }
        
        return times
    
    def space_complexity_test(self, func, input_generator, sizes, name=None):
        """
        测试空间复杂度
        """
        if name is None:
            name = func.__name__
        
        memory_usage = []
        
        for size in sizes:
            # 开始内存追踪
            tracemalloc.start()
            
            # 生成测试数据
            test_input = input_generator(size)
            
            # 执行函数
            if isinstance(test_input, tuple):
                result = func(*test_input)
            else:
                result = func(test_input)
            
            # 获取内存使用情况
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            memory_usage.append(peak / 1024 / 1024)  # 转换为MB
        
        self.results[name + '_memory'] = {
            'sizes': sizes,
            'memory': memory_usage,
            'type': 'space'
        }
        
        return memory_usage
    
    def plot_results(self, theoretical_complexities=None):
        """
        绘制性能分析结果
        """
        time_results = {k: v for k, v in self.results.items() if v['type'] == 'time'}
        space_results = {k: v for k, v in self.results.items() if v['type'] == 'space'}
        
        # 绘制时间复杂度
        if time_results:
            plt.figure(figsize=(12, 5))
            
            plt.subplot(1, 2, 1)
            for name, data in time_results.items():
                plt.plot(data['sizes'], data['times'], 'o-', label=name)
            
            # 添加理论复杂度曲线
            if theoretical_complexities:
                sizes = np.array(time_results[list(time_results.keys())[0]]['sizes'])
                for complexity_name, complexity_func in theoretical_complexities.items():
                    theoretical_times = complexity_func(sizes)
                    # 标准化到实际数据的范围
                    actual_times = time_results[list(time_results.keys())[0]]['times']
                    scale = actual_times[-1] / theoretical_times[-1]
                    theoretical_times *= scale
                    plt.plot(sizes, theoretical_times, '--', label=f'{complexity_name} (理论)', alpha=0.7)
            
            plt.xlabel('输入规模 (n)')
            plt.ylabel('执行时间 (秒)')
            plt.title('时间复杂度分析')
            plt.legend()
            plt.grid(True, alpha=0.3)
            
            # 绘制空间复杂度
            if space_results:
                plt.subplot(1, 2, 2)
                for name, data in space_results.items():
                    plt.plot(data['sizes'], data['memory'], 's-', label=name.replace('_memory', ''))
                
                plt.xlabel('输入规模 (n)')
                plt.ylabel('内存使用 (MB)')
                plt.title('空间复杂度分析')
                plt.legend()
                plt.grid(True, alpha=0.3)
            
            plt.tight_layout()
            plt.show()
    
    def complexity_ratio_analysis(self, algorithm_name):
        """
        分析复杂度增长比率
        """
        if algorithm_name not in self.results:
            print(f"未找到算法 {algorithm_name} 的测试结果")
            return
        
        data = self.results[algorithm_name]
        sizes = data['sizes']
        
        if data['type'] == 'time':
            values = data['times']
            unit = '秒'
        else:
            values = data['memory']
            unit = 'MB'
        
        print(f"\n{algorithm_name} 复杂度增长分析:")
        print(f"{'输入规模':<10} {f'执行时间({unit})':<15} {'增长比率':<10} {'理论比率':<10}")
        print("-" * 50)
        
        for i in range(len(sizes)):
            if i == 0:
                print(f"{sizes[i]:<10} {values[i]:<15.6f} {'基准':<10} {'基准':<10}")
            else:
                actual_ratio = values[i] / values[0]
                size_ratio = sizes[i] / sizes[0]
                
                # 估算理论比率（假设不同复杂度）
                theoretical_ratios = {
                    'O(1)': 1,
                    'O(log n)': np.log2(size_ratio),
                    'O(n)': size_ratio,
                    'O(n log n)': size_ratio * np.log2(size_ratio),
                    'O(n²)': size_ratio ** 2,
                    'O(n³)': size_ratio ** 3,
                    'O(2^n)': 2 ** (sizes[i] - sizes[0])
                }
                
                # 找到最接近的理论复杂度
                best_match = min(theoretical_ratios.items(), 
                               key=lambda x: abs(x[1] - actual_ratio))
                
                print(f"{sizes[i]:<10} {values[i]:<15.6f} {actual_ratio:<10.2f} {best_match[0]}")

# 使用示例
def performance_testing_example():
    """
    性能测试示例
    """
    analyzer = PerformanceAnalyzer()
    
    # 定义测试算法
    def bubble_sort(arr):
        arr = arr.copy()
        n = len(arr)
        for i in range(n):
            for j in range(0, n - i - 1):
                if arr[j] > arr[j + 1]:
                    arr[j], arr[j + 1] = arr[j + 1], arr[j]
        return arr
    
    def merge_sort(arr):
        if len(arr) <= 1:
            return arr
        
        mid = len(arr) // 2
        left = merge_sort(arr[:mid])
        right = merge_sort(arr[mid:])
        
        result = []
        i = j = 0
        
        while i < len(left) and j < len(right):
            if left[i] <= right[j]:
                result.append(left[i])
                i += 1
            else:
                result.append(right[j])
                j += 1
        
        result.extend(left[i:])
        result.extend(right[j:])
        return result
    
    # 输入生成器
    def random_array_generator(size):
        import random
        return [random.randint(1, 1000) for _ in range(size)]
    
    # 测试规模
    sizes = [100, 200, 400, 800, 1600]
    
    print("开始性能测试...")
    
    # 测试时间复杂度
    analyzer.time_complexity_test(bubble_sort, random_array_generator, sizes, "冒泡排序")
    analyzer.time_complexity_test(merge_sort, random_array_generator, sizes, "归并排序")
    
    # 测试空间复杂度
    analyzer.space_complexity_test(bubble_sort, random_array_generator, sizes, "冒泡排序")
    analyzer.space_complexity_test(merge_sort, random_array_generator, sizes, "归并排序")
    
    # 分析结果
    analyzer.complexity_ratio_analysis("冒泡排序")
    analyzer.complexity_ratio_analysis("归并排序")
    
    # 定义理论复杂度函数
    theoretical_complexities = {
        'O(n²)': lambda n: n**2 * 1e-6,  # 冒泡排序理论复杂度
        'O(n log n)': lambda n: n * np.log2(n) * 1e-6  # 归并排序理论复杂度
    }
    
    # 绘制结果（注释掉，因为在文本环境中无法显示图表）
    # analyzer.plot_results(theoretical_complexities)
    
    print("\n性能测试完成！")

performance_testing_example()
```

## 总结

算法复杂度分析是算法设计和优化的重要工具：

### 核心概念总结

1. **渐近记号**
   - **大O记号**：描述上界，最坏情况
   - **大Ω记号**：描述下界，最好情况
   - **大Θ记号**：描述紧确界，平均情况

2. **复杂度类型**
   - **时间复杂度**：算法执行时间与输入规模的关系
   - **空间复杂度**：算法所需存储空间与输入规模的关系

3. **分析方法**
   - **基本操作计数**：统计关键操作的执行次数
   - **递归分析**：使用主定理分析递归算法
   - **摊还分析**：分析一系列操作的平均成本

### 常见复杂度等级

- **O(1)**：常数时间，最优
- **O(log n)**：对数时间，高效
- **O(n)**：线性时间，可接受
- **O(n log n)**：线性对数时间，较好
- **O(n²)**：平方时间，需要优化
- **O(2^n)**：指数时间，通常不可接受

### 实际应用考虑

1. **理论与实际的差异**
   - 常数因子的影响
   - 缓存效应
   - 分支预测
   - 内存访问模式

2. **优化策略**
   - 算法选择
   - 数据结构优化
   - 缓存利用
   - 并行化

3. **性能测试**
   - 基准测试
   - 性能分析工具
   - 复杂度验证
   - 瓶颈识别

### 最佳实践

1. **分析步骤**
   - 识别基本操作
   - 计算操作次数
   - 确定主导项
   - 使用渐近记号表示

2. **优化原则**
   - 优先考虑时间复杂度
   - 在时间和空间间权衡
   - 考虑实际使用场景
   - 测试验证理论分析

复杂度分析不仅是理论工具，更是指导实际开发的重要方法。通过深入理解复杂度分析，可以设计出更高效的算法，编写出性能更优的程序。