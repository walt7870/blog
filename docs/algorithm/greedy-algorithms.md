# 贪心算法详解

贪心算法是一种在每一步选择中都采取在当前状态下最好或最优选择的算法策略，希望通过局部最优选择导致全局最优解。

## 贪心算法基本概念

### 算法特征

1. **贪心选择性质**
   - 可以通过局部最优选择达到全局最优
   - 每一步的选择不依赖于未来的选择
   - 一旦做出选择，就不再改变

2. **最优子结构**
   - 问题的最优解包含子问题的最优解
   - 可以通过子问题的最优解构造原问题的最优解

3. **无后效性**
   - 某阶段状态一旦确定，不受后续决策影响
   - 每个子问题的解一旦确定，就不再改变

### 贪心算法设计步骤

1. **建立数学模型**：描述最优化问题
2. **拆分子问题**：将问题分解为若干子问题
3. **确定贪心策略**：选择局部最优的贪心策略
4. **证明贪心选择**：证明贪心选择能导致全局最优
5. **编写算法**：实现贪心算法

### 贪心算法 vs 动态规划

| 特征 | 贪心算法 | 动态规划 |
|------|----------|----------|
| 选择策略 | 局部最优 | 全局考虑 |
| 子问题依赖 | 无依赖 | 有依赖 |
| 时间复杂度 | 通常较低 | 通常较高 |
| 适用范围 | 特定问题 | 更广泛 |
| 实现难度 | 相对简单 | 相对复杂 |

## 经典贪心算法问题

### 活动选择问题

#### 问题描述
给定n个活动，每个活动有开始时间和结束时间，选择最多的互不冲突的活动。

#### 贪心策略
按结束时间排序，优先选择结束时间最早的活动。

#### 实现代码

```python
def activity_selection(activities):
    """
    活动选择问题 - 贪心算法
    activities: [(start_time, end_time, activity_id), ...]
    """
    if not activities:
        return []
    
    # 按结束时间排序
    activities.sort(key=lambda x: x[1])
    
    selected = [activities[0]]
    last_end_time = activities[0][1]
    
    for i in range(1, len(activities)):
        start_time, end_time, activity_id = activities[i]
        
        # 如果当前活动的开始时间不早于上一个活动的结束时间
        if start_time >= last_end_time:
            selected.append(activities[i])
            last_end_time = end_time
    
    return selected

def activity_selection_with_profit(activities):
    """
    带权重的活动选择问题
    activities: [(start_time, end_time, profit, activity_id), ...]
    """
    if not activities:
        return [], 0
    
    # 按结束时间排序
    activities.sort(key=lambda x: x[1])
    n = len(activities)
    
    # dp[i] 表示前i个活动的最大收益
    dp = [0] * (n + 1)
    selected = [[] for _ in range(n + 1)]
    
    for i in range(1, n + 1):
        start_time, end_time, profit, activity_id = activities[i-1]
        
        # 不选择当前活动
        dp[i] = dp[i-1]
        selected[i] = selected[i-1][:]
        
        # 找到最晚的不冲突活动
        j = i - 1
        while j > 0 and activities[j-1][1] > start_time:
            j -= 1
        
        # 选择当前活动
        if dp[j] + profit > dp[i]:
            dp[i] = dp[j] + profit
            selected[i] = selected[j][:] + [activities[i-1]]
    
    return selected[n], dp[n]

# 示例
activities = [
    (1, 4, 'A'), (3, 5, 'B'), (0, 6, 'C'),
    (5, 7, 'D'), (3, 9, 'E'), (5, 9, 'F'),
    (6, 10, 'G'), (8, 11, 'H'), (8, 12, 'I'),
    (2, 14, 'J'), (12, 16, 'K')
]

print("活动选择问题:")
selected = activity_selection(activities)
print(f"选择的活动数量: {len(selected)}")
for start, end, activity_id in selected:
    print(f"活动{activity_id}: {start}-{end}")

# 带权重的活动选择
weighted_activities = [
    (1, 4, 20, 'A'), (3, 5, 20, 'B'), (0, 6, 100, 'C'),
    (5, 7, 40, 'D'), (3, 9, 60, 'E'), (5, 9, 30, 'F')
]

print("\n带权重的活动选择:")
selected_weighted, max_profit = activity_selection_with_profit(weighted_activities)
print(f"最大收益: {max_profit}")
for start, end, profit, activity_id in selected_weighted:
    print(f"活动{activity_id}: {start}-{end}, 收益: {profit}")
```

### 分数背包问题

#### 问题描述
给定n个物品，每个物品有重量和价值，背包容量有限，物品可以分割，求最大价值。

#### 贪心策略
按单位重量价值（价值密度）降序排列，优先选择价值密度高的物品。

#### 实现代码

```python
def fractional_knapsack(items, capacity):
    """
    分数背包问题
    items: [(weight, value, item_id), ...]
    capacity: 背包容量
    """
    if not items or capacity <= 0:
        return 0, []
    
    # 计算价值密度并排序
    items_with_density = []
    for weight, value, item_id in items:
        density = value / weight if weight > 0 else 0
        items_with_density.append((weight, value, item_id, density))
    
    # 按价值密度降序排序
    items_with_density.sort(key=lambda x: x[3], reverse=True)
    
    total_value = 0
    selected_items = []
    remaining_capacity = capacity
    
    for weight, value, item_id, density in items_with_density:
        if remaining_capacity <= 0:
            break
        
        if weight <= remaining_capacity:
            # 完全装入
            total_value += value
            selected_items.append((item_id, 1.0, value))
            remaining_capacity -= weight
        else:
            # 部分装入
            fraction = remaining_capacity / weight
            total_value += value * fraction
            selected_items.append((item_id, fraction, value * fraction))
            remaining_capacity = 0
    
    return total_value, selected_items

def fractional_knapsack_detailed(items, capacity):
    """
    分数背包问题 - 详细版本
    """
    print(f"背包容量: {capacity}")
    print("物品信息:")
    
    items_with_density = []
    for weight, value, item_id in items:
        density = value / weight if weight > 0 else 0
        items_with_density.append((weight, value, item_id, density))
        print(f"  物品{item_id}: 重量={weight}, 价值={value}, 密度={density:.2f}")
    
    # 按价值密度排序
    items_with_density.sort(key=lambda x: x[3], reverse=True)
    
    print("\n按价值密度排序后:")
    for weight, value, item_id, density in items_with_density:
        print(f"  物品{item_id}: 密度={density:.2f}")
    
    total_value, selected_items = fractional_knapsack(items, capacity)
    
    print("\n选择结果:")
    for item_id, fraction, value in selected_items:
        print(f"  物品{item_id}: 选择比例={fraction:.2f}, 获得价值={value:.2f}")
    
    print(f"\n总价值: {total_value:.2f}")
    return total_value, selected_items

# 示例
items = [
    (10, 60, 'A'), (20, 100, 'B'), (30, 120, 'C')
]
capacity = 50

print("分数背包问题:")
fractional_knapsack_detailed(items, capacity)
```

### 哈夫曼编码

#### 问题描述
给定字符及其出现频率，构造最优前缀编码，使得编码总长度最短。

#### 贪心策略
每次选择频率最小的两个节点合并，构建哈夫曼树。

#### 实现代码

```python
import heapq
from collections import defaultdict, Counter

class HuffmanNode:
    def __init__(self, char=None, freq=0, left=None, right=None):
        self.char = char
        self.freq = freq
        self.left = left
        self.right = right
    
    def __lt__(self, other):
        return self.freq < other.freq
    
    def is_leaf(self):
        return self.left is None and self.right is None

def build_huffman_tree(frequencies):
    """
    构建哈夫曼树
    frequencies: {char: frequency, ...}
    """
    if len(frequencies) <= 1:
        # 特殊情况：只有一个字符
        char = list(frequencies.keys())[0] if frequencies else None
        return HuffmanNode(char, frequencies.get(char, 0))
    
    # 创建优先队列
    heap = []
    for char, freq in frequencies.items():
        heapq.heappush(heap, HuffmanNode(char, freq))
    
    # 构建哈夫曼树
    while len(heap) > 1:
        # 取出频率最小的两个节点
        left = heapq.heappop(heap)
        right = heapq.heappop(heap)
        
        # 创建新的内部节点
        merged = HuffmanNode(
            char=None,
            freq=left.freq + right.freq,
            left=left,
            right=right
        )
        
        heapq.heappush(heap, merged)
    
    return heap[0] if heap else None

def generate_huffman_codes(root):
    """
    生成哈夫曼编码
    """
    if not root:
        return {}
    
    if root.is_leaf():
        # 只有一个字符的特殊情况
        return {root.char: '0'}
    
    codes = {}
    
    def dfs(node, code):
        if node.is_leaf():
            codes[node.char] = code
        else:
            if node.left:
                dfs(node.left, code + '0')
            if node.right:
                dfs(node.right, code + '1')
    
    dfs(root, '')
    return codes

def huffman_encoding(text):
    """
    哈夫曼编码
    """
    if not text:
        return '', {}, None
    
    # 统计字符频率
    frequencies = Counter(text)
    
    # 构建哈夫曼树
    root = build_huffman_tree(frequencies)
    
    # 生成编码表
    codes = generate_huffman_codes(root)
    
    # 编码文本
    encoded_text = ''.join(codes[char] for char in text)
    
    return encoded_text, codes, root

def huffman_decoding(encoded_text, root):
    """
    哈夫曼解码
    """
    if not encoded_text or not root:
        return ''
    
    if root.is_leaf():
        # 只有一个字符的特殊情况
        return root.char * len(encoded_text)
    
    decoded_text = []
    current = root
    
    for bit in encoded_text:
        if bit == '0':
            current = current.left
        else:
            current = current.right
        
        if current.is_leaf():
            decoded_text.append(current.char)
            current = root
    
    return ''.join(decoded_text)

def analyze_huffman_compression(text):
    """
    分析哈夫曼编码的压缩效果
    """
    print(f"原始文本: {text}")
    print(f"原始长度: {len(text)} 字符")
    
    # 统计字符频率
    frequencies = Counter(text)
    print("\n字符频率:")
    for char, freq in sorted(frequencies.items()):
        print(f"  '{char}': {freq}")
    
    # 哈夫曼编码
    encoded_text, codes, root = huffman_encoding(text)
    
    print("\n哈夫曼编码表:")
    for char, code in sorted(codes.items()):
        print(f"  '{char}': {code}")
    
    print(f"\n编码后文本: {encoded_text}")
    print(f"编码长度: {len(encoded_text)} 位")
    
    # 计算压缩比
    original_bits = len(text) * 8  # 假设原始使用ASCII编码
    compressed_bits = len(encoded_text)
    compression_ratio = compressed_bits / original_bits
    
    print(f"\n压缩分析:")
    print(f"  原始大小: {original_bits} 位")
    print(f"  压缩大小: {compressed_bits} 位")
    print(f"  压缩比: {compression_ratio:.2%}")
    print(f"  节省空间: {(1 - compression_ratio):.2%}")
    
    # 验证解码
    decoded_text = huffman_decoding(encoded_text, root)
    print(f"\n解码验证: {'成功' if decoded_text == text else '失败'}")
    
    return encoded_text, codes, root

# 示例
text = "this is an example of a huffman tree"
print("哈夫曼编码示例:")
analyze_huffman_compression(text)
```

### 最小生成树问题

#### Kruskal算法（贪心实现）

```python
class UnionFind:
    """
    并查集 - 用于Kruskal算法
    """
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.components = n
    
    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]
    
    def union(self, x, y):
        px, py = self.find(x), self.find(y)
        if px == py:
            return False
        
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        
        self.parent[py] = px
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1
        
        self.components -= 1
        return True

def kruskal_mst_greedy(edges, n):
    """
    Kruskal算法求最小生成树 - 贪心实现
    edges: [(weight, u, v), ...]
    n: 顶点数量
    """
    # 按权重排序（贪心策略：优先选择权重最小的边）
    edges.sort()
    
    uf = UnionFind(n)
    mst_edges = []
    total_weight = 0
    
    for weight, u, v in edges:
        if uf.union(u, v):
            mst_edges.append((u, v, weight))
            total_weight += weight
            
            # MST有n-1条边
            if len(mst_edges) == n - 1:
                break
    
    return mst_edges, total_weight

# 示例
edges = [
    (4, 0, 1), (2, 0, 2), (1, 1, 2), (5, 1, 3),
    (8, 2, 3), (10, 2, 4), (2, 3, 4)
]
n = 5

print("\nKruskal最小生成树:")
mst_edges, total_weight = kruskal_mst_greedy(edges, n)
print(f"总权重: {total_weight}")
print("MST边:")
for u, v, weight in mst_edges:
    print(f"  {u} - {v}: {weight}")
```

## 区间调度问题

### 区间覆盖问题

#### 问题描述
给定一个目标区间和若干个子区间，选择最少的子区间来完全覆盖目标区间。

#### 贪心策略
按左端点排序，每次选择能覆盖当前未覆盖部分且右端点最远的区间。

#### 实现代码

```python
def interval_cover(target_start, target_end, intervals):
    """
    区间覆盖问题
    target_start, target_end: 目标区间
    intervals: [(start, end, interval_id), ...]
    """
    if not intervals:
        return []
    
    # 按左端点排序
    intervals.sort()
    
    selected = []
    current_pos = target_start
    i = 0
    
    while current_pos < target_end and i < len(intervals):
        # 找到能覆盖current_pos的区间中右端点最远的
        best_interval = None
        best_right = current_pos
        
        while i < len(intervals) and intervals[i][0] <= current_pos:
            if intervals[i][1] > best_right:
                best_right = intervals[i][1]
                best_interval = intervals[i]
            i += 1
        
        if best_interval is None:
            # 无法覆盖
            return None
        
        selected.append(best_interval)
        current_pos = best_right
    
    if current_pos < target_end:
        return None  # 无法完全覆盖
    
    return selected

def interval_cover_detailed(target_start, target_end, intervals):
    """
    区间覆盖问题 - 详细版本
    """
    print(f"目标区间: [{target_start}, {target_end}]")
    print("可用区间:")
    for start, end, interval_id in intervals:
        print(f"  区间{interval_id}: [{start}, {end}]")
    
    result = interval_cover(target_start, target_end, intervals)
    
    if result is None:
        print("\n无法完全覆盖目标区间")
        return None
    
    print(f"\n最少需要 {len(result)} 个区间:")
    total_length = 0
    for start, end, interval_id in result:
        length = end - start
        total_length += length
        print(f"  区间{interval_id}: [{start}, {end}], 长度: {length}")
    
    target_length = target_end - target_start
    print(f"\n目标区间长度: {target_length}")
    print(f"选择区间总长度: {total_length}")
    print(f"覆盖效率: {target_length / total_length:.2%}")
    
    return result

# 示例
intervals = [
    (1, 3, 'A'), (2, 4, 'B'), (3, 5, 'C'),
    (4, 6, 'D'), (5, 7, 'E')
]
target_start, target_end = 1, 7

print("区间覆盖问题:")
interval_cover_detailed(target_start, target_end, intervals)
```

### 区间调度最大化问题

#### 问题描述
给定若干个区间，选择最多的互不重叠的区间。

#### 贪心策略
按结束时间排序，优先选择结束时间最早的区间。

#### 实现代码

```python
def max_non_overlapping_intervals(intervals):
    """
    最大不重叠区间数
    intervals: [(start, end, interval_id), ...]
    """
    if not intervals:
        return []
    
    # 按结束时间排序
    intervals.sort(key=lambda x: x[1])
    
    selected = [intervals[0]]
    last_end = intervals[0][1]
    
    for i in range(1, len(intervals)):
        start, end, interval_id = intervals[i]
        
        # 如果当前区间与上一个选择的区间不重叠
        if start >= last_end:
            selected.append(intervals[i])
            last_end = end
    
    return selected

def min_intervals_to_remove(intervals):
    """
    最少移除区间数使得剩余区间不重叠
    """
    if not intervals:
        return []
    
    # 按结束时间排序
    intervals.sort(key=lambda x: x[1])
    
    keep = [intervals[0]]
    remove = []
    last_end = intervals[0][1]
    
    for i in range(1, len(intervals)):
        start, end, interval_id = intervals[i]
        
        if start >= last_end:
            # 不重叠，保留
            keep.append(intervals[i])
            last_end = end
        else:
            # 重叠，移除
            remove.append(intervals[i])
    
    return remove, keep

# 示例
intervals = [
    (1, 2, 'A'), (2, 3, 'B'), (3, 4, 'C'),
    (1, 3, 'D'), (2, 4, 'E')
]

print("\n最大不重叠区间:")
max_intervals = max_non_overlapping_intervals(intervals)
print(f"最多可以选择 {len(max_intervals)} 个区间:")
for start, end, interval_id in max_intervals:
    print(f"  区间{interval_id}: [{start}, {end}]")

print("\n最少移除区间:")
remove, keep = min_intervals_to_remove(intervals)
print(f"需要移除 {len(remove)} 个区间:")
for start, end, interval_id in remove:
    print(f"  区间{interval_id}: [{start}, {end}]")
print(f"保留 {len(keep)} 个区间:")
for start, end, interval_id in keep:
    print(f"  区间{interval_id}: [{start}, {end}]")
```

## 数字和字符串问题

### 数字重排问题

#### 最大数问题

```python
from functools import cmp_to_key

def largest_number(nums):
    """
    重排数字组成最大数
    """
    if not nums:
        return "0"
    
    # 转换为字符串
    str_nums = [str(num) for num in nums]
    
    # 自定义比较函数
    def compare(x, y):
        # 比较 x+y 和 y+x 的大小
        if x + y > y + x:
            return -1  # x 应该在 y 前面
        elif x + y < y + x:
            return 1   # y 应该在 x 前面
        else:
            return 0   # 相等
    
    # 排序
    str_nums.sort(key=cmp_to_key(compare))
    
    # 组合结果
    result = ''.join(str_nums)
    
    # 处理全为0的情况
    return '0' if result[0] == '0' else result

def smallest_number(nums):
    """
    重排数字组成最小数
    """
    if not nums:
        return "0"
    
    str_nums = [str(num) for num in nums]
    
    def compare(x, y):
        if x + y < y + x:
            return -1
        elif x + y > y + x:
            return 1
        else:
            return 0
    
    str_nums.sort(key=cmp_to_key(compare))
    result = ''.join(str_nums)
    
    return '0' if result[0] == '0' else result

# 示例
nums = [3, 30, 34, 5, 9]
print("\n数字重排问题:")
print(f"原数字: {nums}")
print(f"最大数: {largest_number(nums)}")
print(f"最小数: {smallest_number(nums)}")
```

#### 移除K位数字

```python
def remove_k_digits(num, k):
    """
    移除k位数字使得剩余数字最小
    """
    if k >= len(num):
        return "0"
    
    stack = []
    to_remove = k
    
    for digit in num:
        # 如果当前数字比栈顶小，且还需要移除数字
        while stack and stack[-1] > digit and to_remove > 0:
            stack.pop()
            to_remove -= 1
        
        stack.append(digit)
    
    # 如果还需要移除数字，从末尾移除
    while to_remove > 0:
        stack.pop()
        to_remove -= 1
    
    # 移除前导零
    result = ''.join(stack).lstrip('0')
    
    return result if result else "0"

def remove_k_digits_detailed(num, k):
    """
    移除k位数字 - 详细版本
    """
    print(f"原数字: {num}")
    print(f"需要移除: {k} 位")
    
    if k >= len(num):
        print("移除位数大于等于数字长度，结果为0")
        return "0"
    
    stack = []
    to_remove = k
    removed_positions = []
    
    for i, digit in enumerate(num):
        while stack and stack[-1][0] > digit and to_remove > 0:
            removed_digit, removed_pos = stack.pop()
            removed_positions.append(removed_pos)
            to_remove -= 1
            print(f"  移除位置{removed_pos}的数字'{removed_digit}'")
        
        stack.append((digit, i))
    
    # 从末尾移除剩余数字
    while to_remove > 0:
        removed_digit, removed_pos = stack.pop()
        removed_positions.append(removed_pos)
        to_remove -= 1
        print(f"  从末尾移除位置{removed_pos}的数字'{removed_digit}'")
    
    result_digits = [digit for digit, _ in stack]
    result = ''.join(result_digits).lstrip('0')
    result = result if result else "0"
    
    print(f"移除的位置: {sorted(removed_positions)}")
    print(f"结果: {result}")
    
    return result

# 示例
num = "1432219"
k = 3
print("\n移除K位数字问题:")
remove_k_digits_detailed(num, k)
```

### 字符串问题

#### 删除字符使字符串有序

```python
def remove_chars_for_sorted(s):
    """
    删除最少字符使字符串有序（非递减）
    """
    if not s:
        return s
    
    stack = []
    
    for char in s:
        # 如果当前字符比栈顶字符小，移除栈顶字符
        while stack and stack[-1] > char:
            stack.pop()
        
        stack.append(char)
    
    return ''.join(stack)

def remove_duplicate_chars(s):
    """
    删除重复字符，保持字典序最小
    """
    if not s:
        return s
    
    # 统计每个字符的出现次数
    char_count = {}
    for char in s:
        char_count[char] = char_count.get(char, 0) + 1
    
    stack = []
    in_stack = set()
    
    for char in s:
        char_count[char] -= 1
        
        if char in in_stack:
            continue
        
        # 如果栈顶字符大于当前字符，且栈顶字符后面还会出现，则移除栈顶字符
        while (stack and stack[-1] > char and 
               char_count[stack[-1]] > 0):
            removed = stack.pop()
            in_stack.remove(removed)
        
        stack.append(char)
        in_stack.add(char)
    
    return ''.join(stack)

# 示例
print("\n字符串处理问题:")
s1 = "dcba"
print(f"原字符串: {s1}")
print(f"删除字符后有序: {remove_chars_for_sorted(s1)}")

s2 = "bcabc"
print(f"\n原字符串: {s2}")
print(f"删除重复字符: {remove_duplicate_chars(s2)}")
```

## 图论中的贪心算法

### 最短路径问题

#### Dijkstra算法（贪心实现）

```python
import heapq

def dijkstra_greedy(graph, start):
    """
    Dijkstra算法 - 贪心实现
    graph: {node: [(neighbor, weight), ...], ...}
    """
    distances = {node: float('inf') for node in graph}
    distances[start] = 0
    previous = {node: None for node in graph}
    
    # 优先队列：(距离, 节点)
    pq = [(0, start)]
    visited = set()
    
    while pq:
        current_dist, current_node = heapq.heappop(pq)
        
        if current_node in visited:
            continue
        
        visited.add(current_node)
        
        # 贪心策略：选择距离最短的未访问节点
        for neighbor, weight in graph.get(current_node, []):
            if neighbor not in visited:
                new_dist = current_dist + weight
                
                if new_dist < distances[neighbor]:
                    distances[neighbor] = new_dist
                    previous[neighbor] = current_node
                    heapq.heappush(pq, (new_dist, neighbor))
    
    return distances, previous

# 示例
graph = {
    'A': [('B', 4), ('C', 2)],
    'B': [('C', 1), ('D', 5)],
    'C': [('D', 8), ('E', 10)],
    'D': [('E', 2)],
    'E': []
}

print("\nDijkstra最短路径:")
distances, previous = dijkstra_greedy(graph, 'A')
for node, dist in distances.items():
    print(f"从A到{node}的最短距离: {dist}")
```

## 贪心算法的局限性

### 反例分析

#### 0-1背包问题

```python
def greedy_01_knapsack_wrong(items, capacity):
    """
    错误的贪心算法解决0-1背包问题
    按价值密度排序（这种贪心策略对0-1背包是错误的）
    """
    # 按价值密度排序
    items_sorted = sorted(items, key=lambda x: x[1]/x[0], reverse=True)
    
    total_value = 0
    total_weight = 0
    selected = []
    
    for weight, value, item_id in items_sorted:
        if total_weight + weight <= capacity:
            total_value += value
            total_weight += weight
            selected.append((weight, value, item_id))
    
    return total_value, selected

def dp_01_knapsack_correct(items, capacity):
    """
    正确的动态规划解决0-1背包问题
    """
    n = len(items)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    
    for i in range(1, n + 1):
        weight, value, _ = items[i-1]
        for w in range(capacity + 1):
            # 不选择第i个物品
            dp[i][w] = dp[i-1][w]
            
            # 选择第i个物品
            if w >= weight:
                dp[i][w] = max(dp[i][w], dp[i-1][w-weight] + value)
    
    return dp[n][capacity]

# 反例演示
print("\n贪心算法局限性演示:")
print("0-1背包问题反例:")

items = [(10, 60, 'A'), (20, 100, 'B'), (30, 120, 'C')]
capacity = 50

print(f"物品: {items}")
print(f"背包容量: {capacity}")

greedy_value, greedy_selected = greedy_01_knapsack_wrong(items, capacity)
print(f"\n贪心算法结果: 价值={greedy_value}")
print(f"选择的物品: {greedy_selected}")

correct_value = dp_01_knapsack_correct(items, capacity)
print(f"\n正确答案: 价值={correct_value}")
print(f"贪心算法{'正确' if greedy_value == correct_value else '错误'}")
```

### 贪心算法适用性判断

```python
def check_greedy_applicability(problem_description):
    """
    检查贪心算法适用性的指导原则
    """
    criteria = {
        "贪心选择性质": "每一步的局部最优选择能导致全局最优",
        "最优子结构": "问题的最优解包含子问题的最优解",
        "无后效性": "当前选择不影响未来的选择",
        "单调性": "问题具有某种单调性质"
    }
    
    print("贪心算法适用性检查清单:")
    for criterion, description in criteria.items():
        print(f"  ✓ {criterion}: {description}")
    
    print("\n常见适用场景:")
    scenarios = [
        "活动选择问题",
        "分数背包问题",
        "哈夫曼编码",
        "最小生成树",
        "单源最短路径（非负权重）",
        "区间调度问题"
    ]
    
    for scenario in scenarios:
        print(f"  • {scenario}")
    
    print("\n常见不适用场景:")
    non_scenarios = [
        "0-1背包问题",
        "最长公共子序列",
        "编辑距离",
        "有负权重的最短路径"
    ]
    
    for scenario in non_scenarios:
        print(f"  • {scenario}")

check_greedy_applicability("")
```

## 贪心算法设计技巧

### 贪心策略选择

```python
def greedy_strategy_examples():
    """
    常见贪心策略示例
    """
    strategies = {
        "按结束时间排序": "活动选择、区间调度",
        "按价值密度排序": "分数背包",
        "按频率排序": "哈夫曼编码",
        "按权重排序": "最小生成树",
        "按距离排序": "最短路径",
        "按开始时间排序": "区间覆盖",
        "按剩余时间排序": "任务调度"
    }
    
    print("常见贪心策略:")
    for strategy, application in strategies.items():
        print(f"  {strategy}: {application}")

greedy_strategy_examples()
```

### 贪心算法证明方法

```python
def greedy_proof_methods():
    """
    贪心算法正确性证明方法
    """
    methods = {
        "交换论证法": {
            "描述": "证明任何最优解都可以通过交换得到贪心解",
            "步骤": [
                "假设存在与贪心解不同的最优解",
                "找到第一个不同的选择",
                "证明可以安全地交换这个选择",
                "重复直到得到贪心解"
            ]
        },
        "归纳法": {
            "描述": "证明贪心选择后剩余问题仍然最优",
            "步骤": [
                "证明贪心选择是安全的",
                "证明子问题具有最优子结构",
                "归纳证明整个算法正确"
            ]
        },
        "反证法": {
            "描述": "假设贪心解不是最优的，导出矛盾",
            "步骤": [
                "假设存在更优的解",
                "分析这个解的结构",
                "证明贪心选择不会更差",
                "得出矛盾"
            ]
        }
    }
    
    print("\n贪心算法证明方法:")
    for method, details in methods.items():
        print(f"\n{method}:")
        print(f"  描述: {details['描述']}")
        print("  步骤:")
        for i, step in enumerate(details['步骤'], 1):
            print(f"    {i}. {step}")

greedy_proof_methods()
```

## 总结

贪心算法是一种重要的算法设计策略：

### 核心思想
- **局部最优选择**：每一步都做出当前最好的选择
- **不回溯**：一旦做出选择就不再改变
- **希望全局最优**：通过局部最优达到全局最优

### 适用条件
1. **贪心选择性质**：局部最优能导致全局最优
2. **最优子结构**：问题具有最优子结构性质
3. **无后效性**：当前选择不影响未来选择

### 常见应用
- **调度问题**：活动选择、任务调度
- **图论问题**：最小生成树、最短路径
- **编码问题**：哈夫曼编码
- **背包问题**：分数背包
- **字符串问题**：字典序优化

### 设计要点
1. **选择合适的贪心策略**
2. **证明贪心选择的正确性**
3. **分析时间和空间复杂度**
4. **考虑特殊情况和边界条件**

### 局限性
- **不是万能的**：很多问题不适用贪心算法
- **需要严格证明**：贪心策略的正确性需要数学证明
- **可能得到局部最优**：不当的贪心策略可能无法得到全局最优

贪心算法虽然简单，但在合适的问题上能够提供高效的解决方案。关键是要正确识别问题的贪心性质，选择合适的贪心策略，并严格证明其正确性。