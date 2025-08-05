# 搜索算法详解

搜索算法是在数据结构中查找特定元素或满足条件的元素的方法。本文详细介绍各种搜索算法的原理、实现和应用场景。

## 算法分类

### 按数据结构分类
- **线性结构搜索**：数组、链表
- **树结构搜索**：二叉搜索树、平衡树、B树
- **图结构搜索**：深度优先搜索、广度优先搜索
- **哈希搜索**：哈希表查找

### 按搜索策略分类
- **盲目搜索**：线性搜索、二分搜索
- **启发式搜索**：A*算法、贪心最佳优先搜索
- **对抗搜索**：极小极大算法、Alpha-Beta剪枝

## 基础搜索算法

### 线性搜索 (Linear Search)

#### 算法原理
从数据结构的第一个元素开始，逐个检查每个元素，直到找到目标元素或遍历完所有元素。

#### 时间复杂度
- 最好情况：O(1) - 第一个元素就是目标
- 最坏情况：O(n) - 目标在最后或不存在
- 平均情况：O(n)

#### 空间复杂度
O(1)

#### 代码实现

```python
def linear_search(arr, target):
    """
    线性搜索实现
    """
    for i in range(len(arr)):
        if arr[i] == target:
            return i  # 返回目标元素的索引
    return -1  # 未找到目标元素

# 返回所有匹配位置的版本
def linear_search_all(arr, target):
    """
    返回所有匹配位置
    """
    positions = []
    for i in range(len(arr)):
        if arr[i] == target:
            positions.append(i)
    return positions

# 使用条件函数的版本
def linear_search_condition(arr, condition):
    """
    根据条件函数搜索
    """
    for i in range(len(arr)):
        if condition(arr[i]):
            return i
    return -1

# 示例
arr = [2, 3, 4, 10, 40]
target = 10

result = linear_search(arr, target)
if result != -1:
    print(f"元素 {target} 在索引 {result} 处找到")
else:
    print(f"元素 {target} 未找到")

# 条件搜索示例
result = linear_search_condition(arr, lambda x: x > 5)
print(f"第一个大于5的元素在索引 {result} 处")
```

#### 适用场景
- 无序数据
- 小数据集
- 链表等不支持随机访问的数据结构
- 需要找到所有匹配元素

### 二分搜索 (Binary Search)

#### 算法原理
在有序数组中，通过比较中间元素与目标值，每次排除一半的搜索空间。

#### 时间复杂度
- 所有情况：O(log n)

#### 空间复杂度
- 迭代版本：O(1)
- 递归版本：O(log n)

#### 代码实现

```python
def binary_search_iterative(arr, target):
    """
    二分搜索迭代实现
    """
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

def binary_search_recursive(arr, target, left=0, right=None):
    """
    二分搜索递归实现
    """
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

# 查找第一个出现位置
def binary_search_first(arr, target):
    """
    查找目标元素第一次出现的位置
    """
    left, right = 0, len(arr) - 1
    result = -1
    
    while left <= right:
        mid = (left + right) // 2
        
        if arr[mid] == target:
            result = mid
            right = mid - 1  # 继续在左半部分搜索
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    
    return result

# 查找最后一个出现位置
def binary_search_last(arr, target):
    """
    查找目标元素最后一次出现的位置
    """
    left, right = 0, len(arr) - 1
    result = -1
    
    while left <= right:
        mid = (left + right) // 2
        
        if arr[mid] == target:
            result = mid
            left = mid + 1  # 继续在右半部分搜索
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    
    return result

# 查找插入位置
def binary_search_insert_position(arr, target):
    """
    查找目标元素应该插入的位置
    """
    left, right = 0, len(arr)
    
    while left < right:
        mid = (left + right) // 2
        
        if arr[mid] < target:
            left = mid + 1
        else:
            right = mid
    
    return left

# 示例
arr = [2, 3, 4, 10, 10, 10, 40]
target = 10

result = binary_search_iterative(arr, target)
print(f"元素 {target} 在索引 {result} 处找到")

first_pos = binary_search_first(arr, target)
last_pos = binary_search_last(arr, target)
print(f"元素 {target} 第一次出现在索引 {first_pos}，最后一次出现在索引 {last_pos}")

insert_pos = binary_search_insert_position(arr, 15)
print(f"元素 15 应该插入在索引 {insert_pos} 处")
```

#### 二分搜索的变种

```python
def binary_search_range(arr, target):
    """
    查找目标元素的范围 [first, last]
    """
    first = binary_search_first(arr, target)
    if first == -1:
        return [-1, -1]
    
    last = binary_search_last(arr, target)
    return [first, last]

def binary_search_closest(arr, target):
    """
    查找最接近目标值的元素
    """
    if not arr:
        return -1
    
    left, right = 0, len(arr) - 1
    
    while left < right:
        mid = (left + right) // 2
        
        if arr[mid] < target:
            left = mid + 1
        else:
            right = mid
    
    # 检查left和left-1哪个更接近target
    if left > 0 and abs(arr[left-1] - target) < abs(arr[left] - target):
        return left - 1
    return left

def binary_search_peak(arr):
    """
    查找峰值元素（比相邻元素都大的元素）
    """
    left, right = 0, len(arr) - 1
    
    while left < right:
        mid = (left + right) // 2
        
        if arr[mid] > arr[mid + 1]:
            right = mid
        else:
            left = mid + 1
    
    return left

# 旋转数组中的搜索
def search_rotated_array(arr, target):
    """
    在旋转排序数组中搜索
    """
    left, right = 0, len(arr) - 1
    
    while left <= right:
        mid = (left + right) // 2
        
        if arr[mid] == target:
            return mid
        
        # 判断哪一半是有序的
        if arr[left] <= arr[mid]:  # 左半部分有序
            if arr[left] <= target < arr[mid]:
                right = mid - 1
            else:
                left = mid + 1
        else:  # 右半部分有序
            if arr[mid] < target <= arr[right]:
                left = mid + 1
            else:
                right = mid - 1
    
    return -1
```

#### 适用场景
- 有序数组
- 大数据集
- 需要高效查找
- 范围查询

## 树结构搜索

### 二叉搜索树搜索

#### 算法原理
利用二叉搜索树的性质：左子树所有节点小于根节点，右子树所有节点大于根节点。

#### 代码实现

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class BST:
    def __init__(self):
        self.root = None
    
    def search(self, target):
        """
        在二叉搜索树中搜索目标值
        """
        return self._search_recursive(self.root, target)
    
    def _search_recursive(self, node, target):
        """
        递归搜索
        """
        if not node or node.val == target:
            return node
        
        if target < node.val:
            return self._search_recursive(node.left, target)
        else:
            return self._search_recursive(node.right, target)
    
    def search_iterative(self, target):
        """
        迭代搜索
        """
        current = self.root
        
        while current:
            if current.val == target:
                return current
            elif target < current.val:
                current = current.left
            else:
                current = current.right
        
        return None
    
    def find_min(self):
        """
        查找最小值
        """
        if not self.root:
            return None
        
        current = self.root
        while current.left:
            current = current.left
        return current
    
    def find_max(self):
        """
        查找最大值
        """
        if not self.root:
            return None
        
        current = self.root
        while current.right:
            current = current.right
        return current
    
    def find_predecessor(self, target):
        """
        查找前驱节点（小于target的最大值）
        """
        predecessor = None
        current = self.root
        
        while current:
            if current.val < target:
                predecessor = current
                current = current.right
            else:
                current = current.left
        
        return predecessor
    
    def find_successor(self, target):
        """
        查找后继节点（大于target的最小值）
        """
        successor = None
        current = self.root
        
        while current:
            if current.val > target:
                successor = current
                current = current.left
            else:
                current = current.right
        
        return successor
    
    def range_search(self, low, high):
        """
        范围搜索：查找[low, high]范围内的所有值
        """
        result = []
        self._range_search_helper(self.root, low, high, result)
        return result
    
    def _range_search_helper(self, node, low, high, result):
        if not node:
            return
        
        if low <= node.val <= high:
            result.append(node.val)
        
        if node.val > low:
            self._range_search_helper(node.left, low, high, result)
        
        if node.val < high:
            self._range_search_helper(node.right, low, high, result)
```

### 深度优先搜索 (DFS)

#### 算法原理
沿着树的深度遍历树的节点，尽可能深地搜索树的分支。

#### 代码实现

```python
def dfs_recursive(graph, start, visited=None, path=None):
    """
    深度优先搜索递归实现
    """
    if visited is None:
        visited = set()
    if path is None:
        path = []
    
    visited.add(start)
    path.append(start)
    
    for neighbor in graph[start]:
        if neighbor not in visited:
            dfs_recursive(graph, neighbor, visited, path)
    
    return path

def dfs_iterative(graph, start):
    """
    深度优先搜索迭代实现
    """
    visited = set()
    stack = [start]
    path = []
    
    while stack:
        node = stack.pop()
        
        if node not in visited:
            visited.add(node)
            path.append(node)
            
            # 将邻居节点加入栈（逆序以保持正确的访问顺序）
            for neighbor in reversed(graph[node]):
                if neighbor not in visited:
                    stack.append(neighbor)
    
    return path

def dfs_find_path(graph, start, target, path=None, visited=None):
    """
    使用DFS查找从start到target的路径
    """
    if path is None:
        path = []
    if visited is None:
        visited = set()
    
    path = path + [start]
    visited.add(start)
    
    if start == target:
        return path
    
    for neighbor in graph[start]:
        if neighbor not in visited:
            new_path = dfs_find_path(graph, neighbor, target, path, visited.copy())
            if new_path:
                return new_path
    
    return None

def dfs_find_all_paths(graph, start, target, path=None, visited=None):
    """
    使用DFS查找从start到target的所有路径
    """
    if path is None:
        path = []
    if visited is None:
        visited = set()
    
    path = path + [start]
    visited.add(start)
    
    if start == target:
        return [path]
    
    paths = []
    for neighbor in graph[start]:
        if neighbor not in visited:
            new_paths = dfs_find_all_paths(graph, neighbor, target, path, visited.copy())
            paths.extend(new_paths)
    
    return paths

# 示例
graph = {
    'A': ['B', 'C'],
    'B': ['A', 'D', 'E'],
    'C': ['A', 'F'],
    'D': ['B'],
    'E': ['B', 'F'],
    'F': ['C', 'E']
}

print("DFS递归:", dfs_recursive(graph, 'A'))
print("DFS迭代:", dfs_iterative(graph, 'A'))
print("A到F的路径:", dfs_find_path(graph, 'A', 'F'))
print("A到F的所有路径:", dfs_find_all_paths(graph, 'A', 'F'))
```

### 广度优先搜索 (BFS)

#### 算法原理
从根节点开始，沿着树的宽度遍历树的节点，先访问距离根节点最近的节点。

#### 代码实现

```python
from collections import deque

def bfs(graph, start):
    """
    广度优先搜索实现
    """
    visited = set()
    queue = deque([start])
    path = []
    
    while queue:
        node = queue.popleft()
        
        if node not in visited:
            visited.add(node)
            path.append(node)
            
            # 将邻居节点加入队列
            for neighbor in graph[node]:
                if neighbor not in visited:
                    queue.append(neighbor)
    
    return path

def bfs_shortest_path(graph, start, target):
    """
    使用BFS查找最短路径
    """
    if start == target:
        return [start]
    
    visited = set([start])
    queue = deque([(start, [start])])
    
    while queue:
        node, path = queue.popleft()
        
        for neighbor in graph[node]:
            if neighbor not in visited:
                new_path = path + [neighbor]
                
                if neighbor == target:
                    return new_path
                
                visited.add(neighbor)
                queue.append((neighbor, new_path))
    
    return None

def bfs_level_order(graph, start):
    """
    BFS层序遍历，返回每一层的节点
    """
    if not start:
        return []
    
    result = []
    queue = deque([start])
    visited = set([start])
    
    while queue:
        level_size = len(queue)
        current_level = []
        
        for _ in range(level_size):
            node = queue.popleft()
            current_level.append(node)
            
            for neighbor in graph[node]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)
        
        result.append(current_level)
    
    return result

def bfs_distance(graph, start, target):
    """
    使用BFS计算两点间的最短距离
    """
    if start == target:
        return 0
    
    visited = set([start])
    queue = deque([(start, 0)])
    
    while queue:
        node, distance = queue.popleft()
        
        for neighbor in graph[node]:
            if neighbor == target:
                return distance + 1
            
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, distance + 1))
    
    return -1  # 无法到达

# 示例
print("BFS遍历:", bfs(graph, 'A'))
print("A到F的最短路径:", bfs_shortest_path(graph, 'A', 'F'))
print("A到F的距离:", bfs_distance(graph, 'A', 'F'))
print("层序遍历:", bfs_level_order(graph, 'A'))
```

## 哈希搜索

### 哈希表搜索

#### 算法原理
使用哈希函数将键映射到数组索引，实现O(1)平均时间复杂度的搜索。

#### 代码实现

```python
class HashTable:
    def __init__(self, size=10):
        self.size = size
        self.table = [[] for _ in range(size)]  # 使用链表解决冲突
    
    def _hash(self, key):
        """
        哈希函数
        """
        if isinstance(key, str):
            return sum(ord(c) for c in key) % self.size
        return hash(key) % self.size
    
    def insert(self, key, value):
        """
        插入键值对
        """
        index = self._hash(key)
        bucket = self.table[index]
        
        # 检查键是否已存在
        for i, (k, v) in enumerate(bucket):
            if k == key:
                bucket[i] = (key, value)  # 更新值
                return
        
        # 添加新的键值对
        bucket.append((key, value))
    
    def search(self, key):
        """
        搜索键对应的值
        """
        index = self._hash(key)
        bucket = self.table[index]
        
        for k, v in bucket:
            if k == key:
                return v
        
        raise KeyError(f"Key '{key}' not found")
    
    def delete(self, key):
        """
        删除键值对
        """
        index = self._hash(key)
        bucket = self.table[index]
        
        for i, (k, v) in enumerate(bucket):
            if k == key:
                del bucket[i]
                return v
        
        raise KeyError(f"Key '{key}' not found")
    
    def contains(self, key):
        """
        检查是否包含指定键
        """
        try:
            self.search(key)
            return True
        except KeyError:
            return False
    
    def keys(self):
        """
        返回所有键
        """
        all_keys = []
        for bucket in self.table:
            for k, v in bucket:
                all_keys.append(k)
        return all_keys
    
    def values(self):
        """
        返回所有值
        """
        all_values = []
        for bucket in self.table:
            for k, v in bucket:
                all_values.append(v)
        return all_values

# 开放寻址法实现
class HashTableOpenAddressing:
    def __init__(self, size=10):
        self.size = size
        self.keys = [None] * size
        self.values = [None] * size
        self.deleted = [False] * size
    
    def _hash(self, key):
        return hash(key) % self.size
    
    def _probe(self, key):
        """
        线性探测
        """
        index = self._hash(key)
        
        while (self.keys[index] is not None and 
               self.keys[index] != key and 
               not self.deleted[index]):
            index = (index + 1) % self.size
        
        return index
    
    def insert(self, key, value):
        index = self._probe(key)
        self.keys[index] = key
        self.values[index] = value
        self.deleted[index] = False
    
    def search(self, key):
        index = self._hash(key)
        
        while self.keys[index] is not None:
            if self.keys[index] == key and not self.deleted[index]:
                return self.values[index]
            index = (index + 1) % self.size
        
        raise KeyError(f"Key '{key}' not found")

# 示例
ht = HashTable()
ht.insert("apple", 5)
ht.insert("banana", 3)
ht.insert("orange", 8)

print(f"apple: {ht.search('apple')}")
print(f"包含banana: {ht.contains('banana')}")
print(f"所有键: {ht.keys()}")
```

## 高级搜索算法

### A*搜索算法

#### 算法原理
A*算法是一种启发式搜索算法，使用评估函数f(n) = g(n) + h(n)，其中g(n)是从起点到节点n的实际代价，h(n)是从节点n到目标的启发式估计代价。

#### 代码实现

```python
import heapq
import math

class Node:
    def __init__(self, position, g=0, h=0, parent=None):
        self.position = position
        self.g = g  # 从起点到当前节点的实际代价
        self.h = h  # 从当前节点到目标的启发式代价
        self.f = g + h  # 总评估代价
        self.parent = parent
    
    def __lt__(self, other):
        return self.f < other.f
    
    def __eq__(self, other):
        return self.position == other.position

def heuristic(pos1, pos2):
    """
    曼哈顿距离启发式函数
    """
    return abs(pos1[0] - pos2[0]) + abs(pos1[1] - pos2[1])

def euclidean_distance(pos1, pos2):
    """
    欧几里得距离启发式函数
    """
    return math.sqrt((pos1[0] - pos2[0])**2 + (pos1[1] - pos2[1])**2)

def a_star_search(grid, start, goal):
    """
    A*搜索算法实现
    """
    rows, cols = len(grid), len(grid[0])
    
    # 初始化起点和终点
    start_node = Node(start, 0, heuristic(start, goal))
    goal_node = Node(goal)
    
    # 开放列表和关闭列表
    open_list = [start_node]
    closed_list = set()
    
    # 方向：上、下、左、右
    directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]
    
    while open_list:
        # 选择f值最小的节点
        current_node = heapq.heappop(open_list)
        closed_list.add(current_node.position)
        
        # 检查是否到达目标
        if current_node.position == goal:
            path = []
            while current_node:
                path.append(current_node.position)
                current_node = current_node.parent
            return path[::-1]  # 返回从起点到终点的路径
        
        # 探索邻居节点
        for dx, dy in directions:
            new_x, new_y = current_node.position[0] + dx, current_node.position[1] + dy
            
            # 检查边界和障碍物
            if (0 <= new_x < rows and 0 <= new_y < cols and 
                grid[new_x][new_y] == 0 and (new_x, new_y) not in closed_list):
                
                new_g = current_node.g + 1
                new_h = heuristic((new_x, new_y), goal)
                new_node = Node((new_x, new_y), new_g, new_h, current_node)
                
                # 检查是否已在开放列表中
                in_open_list = False
                for i, open_node in enumerate(open_list):
                    if open_node.position == new_node.position:
                        if new_node.g < open_node.g:
                            open_list[i] = new_node
                            heapq.heapify(open_list)
                        in_open_list = True
                        break
                
                if not in_open_list:
                    heapq.heappush(open_list, new_node)
    
    return None  # 无法找到路径

# 示例：在网格中寻找路径
grid = [
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
]

start = (0, 0)
goal = (9, 9)

path = a_star_search(grid, start, goal)
if path:
    print(f"找到路径: {path}")
    print(f"路径长度: {len(path)}")
else:
    print("无法找到路径")
```

### 跳跃点搜索 (Jump Point Search)

#### 算法原理
JPS是A*算法的优化版本，通过跳跃点减少搜索空间，特别适用于网格地图。

#### 代码实现

```python
def jump_point_search(grid, start, goal):
    """
    跳跃点搜索算法
    """
    rows, cols = len(grid), len(grid[0])
    
    def is_valid(x, y):
        return 0 <= x < rows and 0 <= y < cols and grid[x][y] == 0
    
    def jump(x, y, dx, dy):
        """
        在给定方向上寻找跳跃点
        """
        if not is_valid(x, y):
            return None
        
        if (x, y) == goal:
            return (x, y)
        
        # 对角线移动
        if dx != 0 and dy != 0:
            # 检查强制邻居
            if ((is_valid(x - dx, y + dy) and not is_valid(x - dx, y)) or
                (is_valid(x + dx, y - dy) and not is_valid(x, y - dy))):
                return (x, y)
            
            # 递归搜索水平和垂直方向
            if jump(x + dx, y, dx, 0) or jump(x, y + dy, 0, dy):
                return (x, y)
        
        # 水平或垂直移动
        else:
            if dx != 0:  # 水平移动
                if ((is_valid(x + dx, y + 1) and not is_valid(x, y + 1)) or
                    (is_valid(x + dx, y - 1) and not is_valid(x, y - 1))):
                    return (x, y)
            else:  # 垂直移动
                if ((is_valid(x + 1, y + dy) and not is_valid(x + 1, y)) or
                    (is_valid(x - 1, y + dy) and not is_valid(x - 1, y))):
                    return (x, y)
        
        # 继续在当前方向搜索
        return jump(x + dx, y + dy, dx, dy)
    
    def get_neighbors(node):
        """
        获取节点的邻居（跳跃点）
        """
        x, y = node.position
        neighbors = []
        
        # 8个方向
        directions = [(-1, -1), (-1, 0), (-1, 1), (0, -1), 
                     (0, 1), (1, -1), (1, 0), (1, 1)]
        
        for dx, dy in directions:
            jump_point = jump(x + dx, y + dy, dx, dy)
            if jump_point:
                neighbors.append(jump_point)
        
        return neighbors
    
    # 使用A*框架，但使用跳跃点作为邻居
    start_node = Node(start, 0, heuristic(start, goal))
    open_list = [start_node]
    closed_list = set()
    
    while open_list:
        current_node = heapq.heappop(open_list)
        closed_list.add(current_node.position)
        
        if current_node.position == goal:
            path = []
            while current_node:
                path.append(current_node.position)
                current_node = current_node.parent
            return path[::-1]
        
        for neighbor_pos in get_neighbors(current_node):
            if neighbor_pos in closed_list:
                continue
            
            # 计算实际距离（可能需要路径重构）
            distance = euclidean_distance(current_node.position, neighbor_pos)
            new_g = current_node.g + distance
            new_h = heuristic(neighbor_pos, goal)
            new_node = Node(neighbor_pos, new_g, new_h, current_node)
            
            # 检查开放列表
            in_open_list = False
            for i, open_node in enumerate(open_list):
                if open_node.position == new_node.position:
                    if new_node.g < open_node.g:
                        open_list[i] = new_node
                        heapq.heapify(open_list)
                    in_open_list = True
                    break
            
            if not in_open_list:
                heapq.heappush(open_list, new_node)
    
    return None
```

## 搜索算法比较

### 性能对比表

| 算法 | 时间复杂度 | 空间复杂度 | 适用数据结构 | 特点 |
|------|------------|------------|--------------|------|
| 线性搜索 | O(n) | O(1) | 任意 | 简单，适用于无序数据 |
| 二分搜索 | O(log n) | O(1) | 有序数组 | 高效，需要有序数据 |
| 哈希搜索 | O(1)平均 | O(n) | 哈希表 | 最快，需要好的哈希函数 |
| BST搜索 | O(log n)平均 | O(n) | 二叉搜索树 | 动态，支持插入删除 |
| DFS | O(V + E) | O(V) | 图/树 | 内存效率高，可能陷入深度 |
| BFS | O(V + E) | O(V) | 图/树 | 找最短路径，内存使用多 |
| A* | O(b^d) | O(b^d) | 图 | 启发式，找最优路径 |

### 选择建议

#### 数据特征
- **无序小数据**：线性搜索
- **有序数据**：二分搜索
- **频繁查询**：哈希表
- **动态数据**：二叉搜索树

#### 问题类型
- **精确匹配**：哈希搜索、二分搜索
- **范围查询**：二叉搜索树、B树
- **路径查找**：BFS（最短路径）、DFS（任意路径）
- **最优路径**：A*算法

#### 性能要求
- **最快查询**：哈希表
- **内存受限**：二分搜索、DFS
- **需要排序**：二叉搜索树
- **图搜索**：BFS/DFS + 启发式算法

## 实际应用示例

### 文本搜索

```python
def text_search_kmp(text, pattern):
    """
    KMP字符串搜索算法
    """
    def compute_lps(pattern):
        """计算最长前缀后缀数组"""
        m = len(pattern)
        lps = [0] * m
        length = 0
        i = 1
        
        while i < m:
            if pattern[i] == pattern[length]:
                length += 1
                lps[i] = length
                i += 1
            else:
                if length != 0:
                    length = lps[length - 1]
                else:
                    lps[i] = 0
                    i += 1
        return lps
    
    n, m = len(text), len(pattern)
    if m == 0:
        return []
    
    lps = compute_lps(pattern)
    matches = []
    i = j = 0
    
    while i < n:
        if pattern[j] == text[i]:
            i += 1
            j += 1
        
        if j == m:
            matches.append(i - j)
            j = lps[j - 1]
        elif i < n and pattern[j] != text[i]:
            if j != 0:
                j = lps[j - 1]
            else:
                i += 1
    
    return matches

# 示例
text = "ABABDABACDABABCABCABCABCABC"
pattern = "ABABCABCABCABC"
matches = text_search_kmp(text, pattern)
print(f"模式 '{pattern}' 在文本中的位置: {matches}")
```

### 数据库索引搜索

```python
class BTreeNode:
    def __init__(self, leaf=False):
        self.keys = []
        self.values = []
        self.children = []
        self.leaf = leaf
    
    def search(self, key):
        """在B树节点中搜索键"""
        i = 0
        while i < len(self.keys) and key > self.keys[i]:
            i += 1
        
        if i < len(self.keys) and key == self.keys[i]:
            return self.values[i]
        
        if self.leaf:
            return None
        
        return self.children[i].search(key)

class BTree:
    def __init__(self, degree):
        self.root = BTreeNode(leaf=True)
        self.degree = degree
    
    def search(self, key):
        """在B树中搜索"""
        return self.root.search(key)
```

## 总结

搜索算法的选择需要考虑多个因素：

1. **数据特征**：大小、有序性、动态性
2. **查询模式**：精确查找、范围查询、模糊匹配
3. **性能要求**：时间复杂度、空间复杂度
4. **实际约束**：内存限制、实时性要求

在实际应用中，通常会结合多种搜索算法：
- 数据库使用B+树索引进行范围查询
- 哈希表用于快速精确匹配
- 图算法用于路径规划和网络分析
- 启发式搜索用于AI和游戏开发

理解各种搜索算法的原理和特点，能够帮助我们在不同场景下选择最合适的算法，提高系统的整体性能。