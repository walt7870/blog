# 图算法详解

图算法是计算机科学中的重要分支，用于解决网络、路径、连通性等问题。图由顶点（节点）和边组成，是描述复杂关系的强大数据结构。

## 图的基本概念

### 图的定义

图G = (V, E)，其中：

- V是顶点集合
- E是边集合
- 每条边连接两个顶点

### 图的分类

1. **有向图 vs 无向图**
   - 有向图：边有方向性
   - 无向图：边无方向性

2. **加权图 vs 无权图**
   - 加权图：边有权重
   - 无权图：边无权重

3. **连通图 vs 非连通图**
   - 连通图：任意两点间存在路径
   - 非连通图：存在不连通的顶点

### 图的表示方法

```python
class Graph:
    """
    图的基本实现
    """
    def __init__(self, directed=False):
        self.directed = directed
        self.vertices = set()
        self.edges = {}
    
    def add_vertex(self, vertex):
        """添加顶点"""
        self.vertices.add(vertex)
        if vertex not in self.edges:
            self.edges[vertex] = []
    
    def add_edge(self, u, v, weight=1):
        """添加边"""
        self.add_vertex(u)
        self.add_vertex(v)
        
        self.edges[u].append((v, weight))
        if not self.directed:
            self.edges[v].append((u, weight))
    
    def get_neighbors(self, vertex):
        """获取邻居节点"""
        return self.edges.get(vertex, [])
    
    def get_vertices(self):
        """获取所有顶点"""
        return list(self.vertices)
    
    def get_edges(self):
        """获取所有边"""
        edges = []
        for u in self.vertices:
            for v, weight in self.edges[u]:
                if self.directed or u <= v:  # 避免无向图重复
                    edges.append((u, v, weight))
        return edges

# 邻接矩阵表示
class GraphMatrix:
    """
    邻接矩阵表示的图
    """
    def __init__(self, num_vertices, directed=False):
        self.num_vertices = num_vertices
        self.directed = directed
        self.matrix = [[0] * num_vertices for _ in range(num_vertices)]
    
    def add_edge(self, u, v, weight=1):
        """添加边"""
        self.matrix[u][v] = weight
        if not self.directed:
            self.matrix[v][u] = weight
    
    def has_edge(self, u, v):
        """检查是否存在边"""
        return self.matrix[u][v] != 0
    
    def get_neighbors(self, vertex):
        """获取邻居节点"""
        neighbors = []
        for i in range(self.num_vertices):
            if self.matrix[vertex][i] != 0:
                neighbors.append((i, self.matrix[vertex][i]))
        return neighbors

# 邻接表表示
from collections import defaultdict

class GraphList:
    """
    邻接表表示的图
    """
    def __init__(self, directed=False):
        self.directed = directed
        self.graph = defaultdict(list)
    
    def add_edge(self, u, v, weight=1):
        """添加边"""
        self.graph[u].append((v, weight))
        if not self.directed:
            self.graph[v].append((u, weight))
    
    def get_neighbors(self, vertex):
        """获取邻居节点"""
        return self.graph[vertex]
    
    def get_vertices(self):
        """获取所有顶点"""
        vertices = set()
        for u in self.graph:
            vertices.add(u)
            for v, _ in self.graph[u]:
                vertices.add(v)
        return list(vertices)
```

## 图的遍历算法

### 深度优先搜索 (DFS)

#### 算法原理

从起始顶点开始，沿着一条路径尽可能深入，直到无法继续，然后回溯。

#### 实现方法

```python
def dfs_recursive(graph, start, visited=None):
    """
    深度优先搜索 - 递归实现
    """
    if visited is None:
        visited = set()
    
    visited.add(start)
    print(f"访问节点: {start}")
    
    for neighbor, _ in graph.get_neighbors(start):
        if neighbor not in visited:
            dfs_recursive(graph, neighbor, visited)
    
    return visited

def dfs_iterative(graph, start):
    """
    深度优先搜索 - 迭代实现
    """
    visited = set()
    stack = [start]
    
    while stack:
        vertex = stack.pop()
        
        if vertex not in visited:
            visited.add(vertex)
            print(f"访问节点: {vertex}")
            
            # 将邻居节点加入栈（逆序以保持顺序）
            neighbors = [neighbor for neighbor, _ in graph.get_neighbors(vertex)]
            for neighbor in reversed(neighbors):
                if neighbor not in visited:
                    stack.append(neighbor)
    
    return visited

def dfs_with_path(graph, start, target):
    """
    DFS寻找路径
    """
    def dfs_helper(current, target, path, visited):
        if current == target:
            return path + [current]
        
        visited.add(current)
        
        for neighbor, _ in graph.get_neighbors(current):
            if neighbor not in visited:
                result = dfs_helper(neighbor, target, path + [current], visited)
                if result:
                    return result
        
        visited.remove(current)  # 回溯
        return None
    
    return dfs_helper(start, target, [], set())

def dfs_all_paths(graph, start, target):
    """
    DFS寻找所有路径
    """
    def dfs_helper(current, target, path, visited, all_paths):
        if current == target:
            all_paths.append(path + [current])
            return
        
        visited.add(current)
        
        for neighbor, _ in graph.get_neighbors(current):
            if neighbor not in visited:
                dfs_helper(neighbor, target, path + [current], visited, all_paths)
        
        visited.remove(current)  # 回溯
    
    all_paths = []
    dfs_helper(start, target, [], set(), all_paths)
    return all_paths

# 示例
graph = Graph()
edges = [(0, 1), (0, 2), (1, 3), (1, 4), (2, 5), (2, 6)]
for u, v in edges:
    graph.add_edge(u, v)

print("DFS递归遍历:")
dfs_recursive(graph, 0)

print("\nDFS迭代遍历:")
dfs_iterative(graph, 0)

print("\n寻找路径:")
path = dfs_with_path(graph, 0, 6)
print(f"从0到6的路径: {path}")

print("\n所有路径:")
all_paths = dfs_all_paths(graph, 0, 6)
for i, path in enumerate(all_paths):
    print(f"路径{i+1}: {path}")
```

### 广度优先搜索 (BFS)

#### 算法原理

从起始顶点开始，先访问所有距离为1的顶点，再访问距离为2的顶点，以此类推。

#### 实现方法

```python
from collections import deque

def bfs(graph, start):
    """
    广度优先搜索 - 基础实现
    """
    visited = set()
    queue = deque([start])
    visited.add(start)
    
    while queue:
        vertex = queue.popleft()
        print(f"访问节点: {vertex}")
        
        for neighbor, _ in graph.get_neighbors(vertex):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    
    return visited

def bfs_shortest_path(graph, start, target):
    """
    BFS寻找最短路径
    """
    if start == target:
        return [start]
    
    visited = set([start])
    queue = deque([(start, [start])])
    
    while queue:
        vertex, path = queue.popleft()
        
        for neighbor, _ in graph.get_neighbors(vertex):
            if neighbor == target:
                return path + [neighbor]
            
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, path + [neighbor]))
    
    return None  # 无路径

def bfs_level_order(graph, start):
    """
    BFS层序遍历
    """
    visited = set([start])
    current_level = [start]
    levels = []
    
    while current_level:
        levels.append(current_level[:])
        next_level = []
        
        for vertex in current_level:
            for neighbor, _ in graph.get_neighbors(vertex):
                if neighbor not in visited:
                    visited.add(neighbor)
                    next_level.append(neighbor)
        
        current_level = next_level
    
    return levels

def bfs_distances(graph, start):
    """
    BFS计算到所有节点的距离
    """
    distances = {start: 0}
    queue = deque([start])
    
    while queue:
        vertex = queue.popleft()
        
        for neighbor, _ in graph.get_neighbors(vertex):
            if neighbor not in distances:
                distances[neighbor] = distances[vertex] + 1
                queue.append(neighbor)
    
    return distances

# 示例
print("BFS遍历:")
bfs(graph, 0)

print("\n最短路径:")
shortest_path = bfs_shortest_path(graph, 0, 6)
print(f"从0到6的最短路径: {shortest_path}")

print("\n层序遍历:")
levels = bfs_level_order(graph, 0)
for i, level in enumerate(levels):
    print(f"第{i}层: {level}")

print("\n距离计算:")
distances = bfs_distances(graph, 0)
for vertex, distance in distances.items():
    print(f"从0到{vertex}的距离: {distance}")
```

## 连通性算法

### 连通分量

#### 无向图连通分量

```python
def find_connected_components(graph):
    """
    寻找无向图的连通分量
    """
    visited = set()
    components = []
    
    def dfs_component(vertex, component):
        visited.add(vertex)
        component.append(vertex)
        
        for neighbor, _ in graph.get_neighbors(vertex):
            if neighbor not in visited:
                dfs_component(neighbor, component)
    
    for vertex in graph.get_vertices():
        if vertex not in visited:
            component = []
            dfs_component(vertex, component)
            components.append(component)
    
    return components

def is_connected(graph):
    """
    判断无向图是否连通
    """
    vertices = graph.get_vertices()
    if not vertices:
        return True
    
    visited = dfs_recursive(graph, vertices[0])
    return len(visited) == len(vertices)

# 示例
# 创建非连通图
disconnected_graph = Graph()
edges = [(0, 1), (1, 2), (3, 4), (5, 6), (6, 7)]
for u, v in edges:
    disconnected_graph.add_edge(u, v)

components = find_connected_components(disconnected_graph)
print("连通分量:")
for i, component in enumerate(components):
    print(f"分量{i+1}: {component}")

print(f"\n图是否连通: {is_connected(disconnected_graph)}")
```

#### 强连通分量 (SCC)

```python
def kosaraju_scc(graph):
    """
    Kosaraju算法寻找强连通分量
    """
    def dfs_finish_time(vertex, visited, stack):
        visited.add(vertex)
        for neighbor, _ in graph.get_neighbors(vertex):
            if neighbor not in visited:
                dfs_finish_time(neighbor, visited, stack)
        stack.append(vertex)
    
    def dfs_scc(vertex, visited, component, transpose_graph):
        visited.add(vertex)
        component.append(vertex)
        for neighbor, _ in transpose_graph.get_neighbors(vertex):
            if neighbor not in visited:
                dfs_scc(neighbor, visited, component, transpose_graph)
    
    # 第一次DFS，记录完成时间
    visited = set()
    stack = []
    for vertex in graph.get_vertices():
        if vertex not in visited:
            dfs_finish_time(vertex, visited, stack)
    
    # 构建转置图
    transpose_graph = Graph(directed=True)
    for u, v, weight in graph.get_edges():
        transpose_graph.add_edge(v, u, weight)
    
    # 第二次DFS，按完成时间逆序
    visited = set()
    sccs = []
    
    while stack:
        vertex = stack.pop()
        if vertex not in visited:
            component = []
            dfs_scc(vertex, visited, component, transpose_graph)
            sccs.append(component)
    
    return sccs

def tarjan_scc(graph):
    """
    Tarjan算法寻找强连通分量
    """
    index_counter = [0]
    stack = []
    lowlinks = {}
    index = {}
    on_stack = set()
    sccs = []
    
    def strongconnect(vertex):
        index[vertex] = index_counter[0]
        lowlinks[vertex] = index_counter[0]
        index_counter[0] += 1
        stack.append(vertex)
        on_stack.add(vertex)
        
        for neighbor, _ in graph.get_neighbors(vertex):
            if neighbor not in index:
                strongconnect(neighbor)
                lowlinks[vertex] = min(lowlinks[vertex], lowlinks[neighbor])
            elif neighbor in on_stack:
                lowlinks[vertex] = min(lowlinks[vertex], index[neighbor])
        
        if lowlinks[vertex] == index[vertex]:
            component = []
            while True:
                w = stack.pop()
                on_stack.remove(w)
                component.append(w)
                if w == vertex:
                    break
            sccs.append(component)
    
    for vertex in graph.get_vertices():
        if vertex not in index:
            strongconnect(vertex)
    
    return sccs

# 示例
directed_graph = Graph(directed=True)
edges = [(0, 1), (1, 2), (2, 0), (1, 3), (3, 4), (4, 5), (5, 3)]
for u, v in edges:
    directed_graph.add_edge(u, v)

print("Kosaraju强连通分量:")
sccs_kosaraju = kosaraju_scc(directed_graph)
for i, scc in enumerate(sccs_kosaraju):
    print(f"SCC{i+1}: {scc}")

print("\nTarjan强连通分量:")
sccs_tarjan = tarjan_scc(directed_graph)
for i, scc in enumerate(sccs_tarjan):
    print(f"SCC{i+1}: {scc}")
```

## 最短路径算法

### Dijkstra算法

#### 算法原理

用于求解单源最短路径问题，适用于非负权重的图。

#### 实现方法

```python
import heapq

def dijkstra(graph, start):
    """
    Dijkstra算法 - 单源最短路径
    """
    distances = {vertex: float('inf') for vertex in graph.get_vertices()}
    distances[start] = 0
    previous = {vertex: None for vertex in graph.get_vertices()}
    
    # 优先队列：(距离, 顶点)
    pq = [(0, start)]
    visited = set()
    
    while pq:
        current_distance, current_vertex = heapq.heappop(pq)
        
        if current_vertex in visited:
            continue
        
        visited.add(current_vertex)
        
        for neighbor, weight in graph.get_neighbors(current_vertex):
            if neighbor not in visited:
                new_distance = current_distance + weight
                
                if new_distance < distances[neighbor]:
                    distances[neighbor] = new_distance
                    previous[neighbor] = current_vertex
                    heapq.heappush(pq, (new_distance, neighbor))
    
    return distances, previous

def dijkstra_path(graph, start, target):
    """
    Dijkstra算法 - 返回最短路径
    """
    distances, previous = dijkstra(graph, start)
    
    if distances[target] == float('inf'):
        return None, float('inf')
    
    # 重构路径
    path = []
    current = target
    while current is not None:
        path.append(current)
        current = previous[current]
    
    return path[::-1], distances[target]

def dijkstra_all_paths(graph, start):
    """
    Dijkstra算法 - 到所有节点的最短路径
    """
    distances, previous = dijkstra(graph, start)
    paths = {}
    
    for target in graph.get_vertices():
        if distances[target] != float('inf'):
            path = []
            current = target
            while current is not None:
                path.append(current)
                current = previous[current]
            paths[target] = path[::-1]
    
    return paths, distances

# 示例
weighted_graph = Graph()
weighted_edges = [
    (0, 1, 4), (0, 2, 2), (1, 2, 1), (1, 3, 5),
    (2, 3, 8), (2, 4, 10), (3, 4, 2)
]
for u, v, w in weighted_edges:
    weighted_graph.add_edge(u, v, w)

print("Dijkstra最短距离:")
distances, _ = dijkstra(weighted_graph, 0)
for vertex, distance in distances.items():
    print(f"从0到{vertex}: {distance}")

print("\n最短路径:")
path, distance = dijkstra_path(weighted_graph, 0, 4)
print(f"从0到4的路径: {path}, 距离: {distance}")
```

### Bellman-Ford算法

#### 算法原理

用于求解单源最短路径问题，可以处理负权重边，并能检测负权重环。

#### 实现方法

```python
def bellman_ford(graph, start):
    """
    Bellman-Ford算法
    """
    vertices = graph.get_vertices()
    distances = {vertex: float('inf') for vertex in vertices}
    distances[start] = 0
    previous = {vertex: None for vertex in vertices}
    
    # 松弛操作，重复|V|-1次
    for _ in range(len(vertices) - 1):
        for u, v, weight in graph.get_edges():
            if distances[u] != float('inf') and distances[u] + weight < distances[v]:
                distances[v] = distances[u] + weight
                previous[v] = u
    
    # 检测负权重环
    for u, v, weight in graph.get_edges():
        if distances[u] != float('inf') and distances[u] + weight < distances[v]:
            return None, None  # 存在负权重环
    
    return distances, previous

def bellman_ford_with_path(graph, start, target):
    """
    Bellman-Ford算法 - 返回路径
    """
    distances, previous = bellman_ford(graph, start)
    
    if distances is None:
        return None, None  # 存在负权重环
    
    if distances[target] == float('inf'):
        return None, float('inf')  # 无路径
    
    # 重构路径
    path = []
    current = target
    while current is not None:
        path.append(current)
        current = previous[current]
    
    return path[::-1], distances[target]

# 示例（包含负权重）
negative_graph = Graph(directed=True)
negative_edges = [
    (0, 1, 4), (0, 2, 2), (1, 3, -3), (2, 1, -2), (2, 3, 4), (3, 4, 1)
]
for u, v, w in negative_edges:
    negative_graph.add_edge(u, v, w)

print("Bellman-Ford最短距离:")
distances, previous = bellman_ford(negative_graph, 0)
if distances:
    for vertex, distance in distances.items():
        print(f"从0到{vertex}: {distance}")
else:
    print("存在负权重环")
```

### Floyd-Warshall算法

#### 算法原理

用于求解所有顶点对之间的最短路径，使用动态规划思想。

#### 实现方法

```python
def floyd_warshall(graph):
    """
    Floyd-Warshall算法 - 所有顶点对最短路径
    """
    vertices = graph.get_vertices()
    n = len(vertices)
    vertex_to_index = {v: i for i, v in enumerate(vertices)}
    
    # 初始化距离矩阵
    dist = [[float('inf')] * n for _ in range(n)]
    next_vertex = [[None] * n for _ in range(n)]
    
    # 初始化对角线
    for i in range(n):
        dist[i][i] = 0
    
    # 初始化直接边
    for u, v, weight in graph.get_edges():
        i, j = vertex_to_index[u], vertex_to_index[v]
        dist[i][j] = weight
        next_vertex[i][j] = v
    
    # Floyd-Warshall核心算法
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
                    next_vertex[i][j] = next_vertex[i][k]
    
    return dist, next_vertex, vertices

def floyd_warshall_path(dist_matrix, next_matrix, vertices, start, target):
    """
    重构Floyd-Warshall路径
    """
    vertex_to_index = {v: i for i, v in enumerate(vertices)}
    i, j = vertex_to_index[start], vertex_to_index[target]
    
    if dist_matrix[i][j] == float('inf'):
        return None, float('inf')
    
    path = [start]
    current = start
    
    while current != target:
        current_index = vertex_to_index[current]
        target_index = vertex_to_index[target]
        current = next_matrix[current_index][target_index]
        path.append(current)
    
    return path, dist_matrix[i][j]

# 示例
print("\nFloyd-Warshall所有最短路径:")
dist_matrix, next_matrix, vertices = floyd_warshall(weighted_graph)

for i, u in enumerate(vertices):
    for j, v in enumerate(vertices):
        if i != j and dist_matrix[i][j] != float('inf'):
            path, distance = floyd_warshall_path(dist_matrix, next_matrix, vertices, u, v)
            print(f"从{u}到{v}: 路径{path}, 距离{distance}")
```

## 最小生成树算法

### Kruskal算法

#### 算法原理

使用贪心策略和并查集，按边权重排序，逐个添加不形成环的边。

#### 实现方法

```python
class UnionFind:
    """
    并查集数据结构
    """
    def __init__(self, vertices):
        self.parent = {v: v for v in vertices}
        self.rank = {v: 0 for v in vertices}
    
    def find(self, x):
        """查找根节点（路径压缩）"""
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]
    
    def union(self, x, y):
        """合并两个集合（按秩合并）"""
        root_x = self.find(x)
        root_y = self.find(y)
        
        if root_x != root_y:
            if self.rank[root_x] < self.rank[root_y]:
                self.parent[root_x] = root_y
            elif self.rank[root_x] > self.rank[root_y]:
                self.parent[root_y] = root_x
            else:
                self.parent[root_y] = root_x
                self.rank[root_x] += 1
            return True
        return False

def kruskal_mst(graph):
    """
    Kruskal算法求最小生成树
    """
    edges = graph.get_edges()
    vertices = graph.get_vertices()
    
    # 按权重排序
    edges.sort(key=lambda x: x[2])
    
    mst_edges = []
    total_weight = 0
    uf = UnionFind(vertices)
    
    for u, v, weight in edges:
        if uf.union(u, v):
            mst_edges.append((u, v, weight))
            total_weight += weight
            
            # MST有n-1条边
            if len(mst_edges) == len(vertices) - 1:
                break
    
    return mst_edges, total_weight

# 示例
print("\nKruskal最小生成树:")
mst_edges, total_weight = kruskal_mst(weighted_graph)
print(f"总权重: {total_weight}")
print("MST边:")
for u, v, weight in mst_edges:
    print(f"  {u} - {v}: {weight}")
```

### Prim算法

#### 算法原理

从任意顶点开始，逐步添加与当前树相邻的最小权重边。

#### 实现方法

```python
def prim_mst(graph, start=None):
    """
    Prim算法求最小生成树
    """
    vertices = graph.get_vertices()
    if not vertices:
        return [], 0
    
    if start is None:
        start = vertices[0]
    
    mst_edges = []
    total_weight = 0
    visited = {start}
    
    # 优先队列：(权重, 起点, 终点)
    pq = []
    for neighbor, weight in graph.get_neighbors(start):
        heapq.heappush(pq, (weight, start, neighbor))
    
    while pq and len(visited) < len(vertices):
        weight, u, v = heapq.heappop(pq)
        
        if v in visited:
            continue
        
        # 添加到MST
        mst_edges.append((u, v, weight))
        total_weight += weight
        visited.add(v)
        
        # 添加新的边到优先队列
        for neighbor, edge_weight in graph.get_neighbors(v):
            if neighbor not in visited:
                heapq.heappush(pq, (edge_weight, v, neighbor))
    
    return mst_edges, total_weight

# 示例
print("\nPrim最小生成树:")
mst_edges, total_weight = prim_mst(weighted_graph)
print(f"总权重: {total_weight}")
print("MST边:")
for u, v, weight in mst_edges:
    print(f"  {u} - {v}: {weight}")
```

## 拓扑排序

### 算法原理

对有向无环图(DAG)的顶点进行线性排序，使得对于每条边(u,v)，u在排序中都出现在v之前。

### 实现方法

```python
def topological_sort_dfs(graph):
    """
    拓扑排序 - DFS实现
    """
    visited = set()
    temp_visited = set()
    result = []
    
    def dfs(vertex):
        if vertex in temp_visited:
            return False  # 存在环
        
        if vertex in visited:
            return True
        
        temp_visited.add(vertex)
        
        for neighbor, _ in graph.get_neighbors(vertex):
            if not dfs(neighbor):
                return False
        
        temp_visited.remove(vertex)
        visited.add(vertex)
        result.append(vertex)
        return True
    
    for vertex in graph.get_vertices():
        if vertex not in visited:
            if not dfs(vertex):
                return None  # 存在环，无法拓扑排序
    
    return result[::-1]

def topological_sort_kahn(graph):
    """
    拓扑排序 - Kahn算法（BFS实现）
    """
    # 计算入度
    in_degree = {vertex: 0 for vertex in graph.get_vertices()}
    for vertex in graph.get_vertices():
        for neighbor, _ in graph.get_neighbors(vertex):
            in_degree[neighbor] += 1
    
    # 找到所有入度为0的顶点
    queue = deque([vertex for vertex in in_degree if in_degree[vertex] == 0])
    result = []
    
    while queue:
        vertex = queue.popleft()
        result.append(vertex)
        
        # 移除该顶点的所有出边
        for neighbor, _ in graph.get_neighbors(vertex):
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    
    # 检查是否存在环
    if len(result) != len(graph.get_vertices()):
        return None  # 存在环
    
    return result

# 示例
dag = Graph(directed=True)
dag_edges = [(5, 2), (5, 0), (4, 0), (4, 1), (2, 3), (3, 1)]
for u, v in dag_edges:
    dag.add_edge(u, v)

print("\n拓扑排序 (DFS):")
topo_dfs = topological_sort_dfs(dag)
print(f"排序结果: {topo_dfs}")

print("\n拓扑排序 (Kahn):")
topo_kahn = topological_sort_kahn(dag)
print(f"排序结果: {topo_kahn}")
```

## 网络流算法

### Ford-Fulkerson算法

#### 算法原理

通过寻找增广路径来求解最大流问题。

#### 实现方法

```python
def ford_fulkerson(graph, source, sink):
    """
    Ford-Fulkerson算法求最大流
    """
    def bfs_find_path(source, sink, parent):
        """BFS寻找增广路径"""
        visited = set([source])
        queue = deque([source])
        
        while queue:
            u = queue.popleft()
            
            for v, capacity in graph.get_neighbors(u):
                if v not in visited and capacity > 0:
                    visited.add(v)
                    parent[v] = u
                    if v == sink:
                        return True
                    queue.append(v)
        
        return False
    
    # 创建残余图
    residual_graph = Graph(directed=True)
    for u, v, capacity in graph.get_edges():
        residual_graph.add_edge(u, v, capacity)
        residual_graph.add_edge(v, u, 0)  # 反向边
    
    parent = {}
    max_flow = 0
    
    # 寻找增广路径
    while bfs_find_path(source, sink, parent):
        # 找到路径上的最小容量
        path_flow = float('inf')
        s = sink
        
        while s != source:
            for neighbor, capacity in residual_graph.get_neighbors(parent[s]):
                if neighbor == s:
                    path_flow = min(path_flow, capacity)
                    break
            s = parent[s]
        
        # 更新残余图
        v = sink
        while v != source:
            u = parent[v]
            
            # 更新正向边
            for i, (neighbor, capacity) in enumerate(residual_graph.edges[u]):
                if neighbor == v:
                    residual_graph.edges[u][i] = (neighbor, capacity - path_flow)
                    break
            
            # 更新反向边
            for i, (neighbor, capacity) in enumerate(residual_graph.edges[v]):
                if neighbor == u:
                    residual_graph.edges[v][i] = (neighbor, capacity + path_flow)
                    break
            
            v = parent[v]
        
        max_flow += path_flow
    
    return max_flow

# 示例
flow_graph = Graph(directed=True)
flow_edges = [
    (0, 1, 16), (0, 2, 13), (1, 2, 10), (1, 3, 12),
    (2, 1, 4), (2, 4, 14), (3, 2, 9), (3, 5, 20),
    (4, 3, 7), (4, 5, 4)
]
for u, v, capacity in flow_edges:
    flow_graph.add_edge(u, v, capacity)

print("\n最大流:")
max_flow = ford_fulkerson(flow_graph, 0, 5)
print(f"从0到5的最大流: {max_flow}")
```

## 图算法应用

### 关键路径问题

```python
def critical_path(graph):
    """
    关键路径算法（AOE网络）
    """
    # 拓扑排序
    topo_order = topological_sort_kahn(graph)
    if not topo_order:
        return None, None
    
    vertices = graph.get_vertices()
    
    # 计算最早开始时间
    earliest = {v: 0 for v in vertices}
    for u in topo_order:
        for v, weight in graph.get_neighbors(u):
            earliest[v] = max(earliest[v], earliest[u] + weight)
    
    # 计算最晚开始时间
    latest = {v: max(earliest.values()) for v in vertices}
    for u in reversed(topo_order):
        for v, weight in graph.get_neighbors(u):
            latest[u] = min(latest[u], latest[v] - weight)
    
    # 找出关键路径
    critical_edges = []
    for u in vertices:
        for v, weight in graph.get_neighbors(u):
            if earliest[u] == latest[u] and earliest[v] == latest[v]:
                if earliest[u] + weight == earliest[v]:
                    critical_edges.append((u, v, weight))
    
    return critical_edges, max(earliest.values())

# 示例
aoe_graph = Graph(directed=True)
aoe_edges = [
    (0, 1, 3), (0, 2, 2), (1, 3, 2), (1, 4, 3),
    (2, 3, 4), (2, 5, 3), (3, 4, 2), (3, 5, 1),
    (4, 6, 1), (5, 6, 2)
]
for u, v, w in aoe_edges:
    aoe_graph.add_edge(u, v, w)

print("\n关键路径:")
critical_edges, project_time = critical_path(aoe_graph)
if critical_edges:
    print(f"项目总时间: {project_time}")
    print("关键边:")
    for u, v, weight in critical_edges:
        print(f"  {u} -> {v}: {weight}")
```

### 二分图匹配

```python
def is_bipartite(graph):
    """
    判断是否为二分图
    """
    color = {}
    
    def dfs(vertex, c):
        color[vertex] = c
        for neighbor, _ in graph.get_neighbors(vertex):
            if neighbor in color:
                if color[neighbor] == c:
                    return False
            else:
                if not dfs(neighbor, 1 - c):
                    return False
        return True
    
    for vertex in graph.get_vertices():
        if vertex not in color:
            if not dfs(vertex, 0):
                return False
    
    return True

def maximum_bipartite_matching(graph, left_vertices):
    """
    二分图最大匹配（匈牙利算法）
    """
    match = {}
    
    def dfs(u, visited):
        for v, _ in graph.get_neighbors(u):
            if v in visited:
                continue
            visited.add(v)
            
            if v not in match or dfs(match[v], visited):
                match[v] = u
                return True
        return False
    
    matching = 0
    for u in left_vertices:
        visited = set()
        if dfs(u, visited):
            matching += 1
    
    return matching, match

# 示例
bipartite_graph = Graph()
bipartite_edges = [(0, 3), (0, 4), (1, 3), (1, 5), (2, 4), (2, 5)]
for u, v in bipartite_edges:
    bipartite_graph.add_edge(u, v)

print("\n二分图检测:")
print(f"是否为二分图: {is_bipartite(bipartite_graph)}")

print("\n最大匹配:")
left_vertices = [0, 1, 2]
max_matching, match = maximum_bipartite_matching(bipartite_graph, left_vertices)
print(f"最大匹配数: {max_matching}")
print("匹配结果:")
for right, left in match.items():
    print(f"  {left} - {right}")
```

## 总结

图算法是解决复杂网络问题的重要工具：

### 算法分类

1. **遍历算法**：DFS、BFS
2. **连通性算法**：连通分量、强连通分量
3. **最短路径算法**：Dijkstra、Bellman-Ford、Floyd-Warshall
4. **最小生成树算法**：Kruskal、Prim
5. **拓扑排序算法**：DFS、Kahn
6. **网络流算法**：Ford-Fulkerson、最大匹配

### 应用领域

- **社交网络分析**：好友推荐、社区发现
- **交通运输**：路径规划、交通流优化
- **计算机网络**：路由算法、网络拓扑
- **项目管理**：关键路径、资源调度
- **生物信息学**：蛋白质网络、基因调控
- **推荐系统**：协同过滤、图嵌入

### 选择建议

- **无权图最短路径**：BFS
- **非负权图最短路径**：Dijkstra
- **可能有负权边**：Bellman-Ford
- **所有顶点对最短路径**：Floyd-Warshall
- **最小生成树**：稠密图用Prim，稀疏图用Kruskal
- **拓扑排序**：DFS或Kahn算法
- **最大流**：Ford-Fulkerson或更高效的Dinic算法

掌握图算法需要理解图的性质和算法的适用场景，通过实际问题来加深理解。
