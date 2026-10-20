# 图算法

图用顶点表示对象，用边表示关系。物流站点、任务依赖和网络容量都可以画成图，但边的含义不同：距离不能直接当容量，依赖方向也不能按画面位置猜测。建模前先写清方向、权重、是否允许平行边、自环与孤立顶点，以及希望返回的结果。

例如仓库经过分拨站或中转站到门店。按“经过最少路段”与“总耗时最少”会得到不同路线：仓库→分拨→门店有 2 条边、耗时 5；仓库→中转→分拨→门店有 3 条边、耗时 3。BFS 解决前一种无权目标，Dijkstra 在非负耗时下解决后一种目标。

![无权最少路段与非负权最短耗时的区别](/algorithm/graph-path-model.svg)

## 表示方式也属于算法合同

邻接表保存每个顶点的出边，稀疏图通常使用 O(V+E) 空间；邻接矩阵使用 O(V²) 空间，适合直接查边或某些稠密图运算。遍历邻接矩阵中一个顶点的全部邻居仍需扫描一行。

无向边在邻接表中通常存两条方向相反的记录。算法遍历时两条都要看到，展示边列表时才去重，不能让 Bellman-Ford 或 Floyd-Warshall 只收到无向边的一半。边权 0 可以合法存在，所以不能用矩阵中的 0 同时表示“没有边”；应用 None、无穷或单独存在标记。

孤立顶点也应显式登记。平行边可以保留，或者按明确规则合并；最短路径常取最小权重，网络流容量可能相加，两者不能复用同一个去重规则。顶点是可标识对象，不要求它们支持大小比较。

## 完整实现：同一张图，两种路径目标

以下 Python 3 示例用非空字符串作顶点编号，非负整数作边权。先构建独立邻接快照，检查所有目标顶点已声明；后面的两个算法只接收这种已校验且计算期间不再修改的快照。无向图需要调用方显式填入双向边。

```python
from collections import deque
from heapq import heappop, heappush
from itertools import count


def graph_snapshot(source):
    graph = {vertex: tuple(edges) for vertex, edges in source.items()}
    if any(not isinstance(v, str) or not v.strip() for v in graph):
        raise ValueError("顶点编号必须是非空字符串")
    for edges in graph.values():
        for edge in edges:
            if not isinstance(edge, (tuple, list)) or len(edge) != 2:
                raise ValueError("边必须包含目标与权重")
            target, weight = edge
            if not isinstance(target, str) or target not in graph:
                raise ValueError("边的目标顶点未声明")
            if type(weight) is not int or weight < 0:
                raise ValueError("本例只接受非负整数边权")
    return {vertex: tuple((target, weight) for target, weight in edges)
            for vertex, edges in graph.items()}


def restore_path(previous, start, target):
    path = [target]
    while path[-1] != start:
        path.append(previous[path[-1]])
    return tuple(reversed(path))


def bfs_path(graph, start, target):
    if start not in graph or target not in graph:
        raise ValueError("起点和终点必须已声明")
    previous = {start: None}
    queue = deque([start])
    while queue:
        vertex = queue.popleft()
        if vertex == target:
            return restore_path(previous, start, target)
        for neighbor, _ in graph[vertex]:
            if neighbor not in previous:
                previous[neighbor] = vertex
                queue.append(neighbor)
    return None


def dijkstra_path(graph, start, target):
    if start not in graph or target not in graph:
        raise ValueError("起点和终点必须已声明")
    distance = {start: 0}
    previous = {start: None}
    serial = count()
    heap = [(0, next(serial), start)]
    while heap:
        cost, _, vertex = heappop(heap)
        if cost != distance[vertex]:
            continue
        if vertex == target:
            return cost, restore_path(previous, start, target)
        for neighbor, weight in graph[vertex]:
            candidate = cost + weight
            if candidate < distance.get(neighbor, float("inf")):
                distance[neighbor] = candidate
                previous[neighbor] = vertex
                heappush(heap, (candidate, next(serial), neighbor))
    return None, ()


graph = graph_snapshot({
    "仓库": (("分拨", 4), ("中转", 1)),
    "分拨": (("门店", 1),),
    "中转": (("分拨", 1), ("门店", 8)),
    "门店": (),
    "孤立站": (),
})
assert bfs_path(graph, "仓库", "门店") == ("仓库", "分拨", "门店")
assert dijkstra_path(graph, "仓库", "门店") == (3, ("仓库", "中转", "分拨", "门店"))
assert dijkstra_path(graph, "仓库", "仓库") == (0, ("仓库",))
assert bfs_path(graph, "仓库", "孤立站") is None
assert dijkstra_path(graph, "仓库", "孤立站") == (None, ())
print(dijkstra_path(graph, "仓库", "门店"))
```

BFS 入队时记录前驱，保证每个顶点只入队一次；它忽略边权，返回最少边数路径。Dijkstra 松弛时保存更短距离，把新条目入堆，取出旧距离条目时跳过。堆中加入独立序号，避免距离相同时依赖顶点对象的大小比较。只在距离严格变小时更新前驱，零权环不会因为相等距离无限更新。

Dijkstra 到终点出堆且条目有效时可以返回；在**第一次发现终点**时返回则不安全。本图先发现直达门店的较高成本，后面才改善为 3。负权会破坏“出堆后已经最优”的证明，不能只删除快照中的负权校验继续使用算法。

快照构建 O(V+E)，BFS 时间 O(V+E)、辅助空间 O(V)。此 Dijkstra 采用懒删除堆，可存在 O(E) 条条目；保守时间 O(V+E+(E+1)log(E+2))、堆及前驱空间 O(V+E)。简单图常简写为 O((V+E)log V)，但不能把此实现的堆空间一律写成 O(V)。路径恢复另外需要 O(路径长度)。

## 从问题选择算法

| 目标 | 算法与机制 | 前提及结果边界 |
| --- | --- | --- |
| 遍历可达顶点 | DFS 栈或 BFS 队列 | 一次从起点出发只覆盖可达部分；遍历全图需遍历未访问顶点 |
| 无向图连通分量 | 多次遍历或并查集 | 空图的“是否连通”需约定；孤立点各为一个分量 |
| 有向图强连通分量 | Tarjan、Kosaraju | 同一分量内任意两点互相可达；不等同无向连通 |
| 无权最短路径 | BFS | 最短指边数，或所有边代价相同的总成本 |
| 非负权单源最短路径 | Dijkstra | 权重快照与非负合同；相同最优值不保证枚举所有路径 |
| 含负边单源最短路径 | Bellman-Ford | O(VE)，可检测源点可达负环；受负环影响的目标无有限最短值 |
| 所有顶点对最短路径 | Floyd-Warshall | O(V³)时间、O(V²)空间；平行边取最小，负环需检查和传播影响 |
| 无向网络最低连接成本 | Kruskal、Prim | 求最小生成树，不是任意两点最短路；不连通时为森林或明确失败 |
| 任务依赖顺序 | 拓扑排序 | 有向无环图；返回顺序可能不唯一，不能用普通排序代替 |
| 容量约束下最大吞吐 | 最大流 | 边为容量而非距离，需残余网络、反向边和流量守恒 |
| 两类对象一对一配对 | 二分图最大匹配 | 校验左右集合互斥且每边跨集合；最大匹配不等于局部不可扩大的极大匹配 |

最小生成树允许负权，不需要套用 Dijkstra 的非负限制。Kruskal 按边权选不构成环的边；并查集维护当前连通分量。Prim 只从一个起点运行时覆盖该连通分量，若未覆盖全部顶点，不应称为全图的生成树。选 Prim 还是 Kruskal 还取决于图的表示与实现，不能只凭稀疏或稠密一句话决定。

Floyd-Warshall 的初始对角线通常为 0，但负自环不能被覆盖丢失；多条直接边取最小值。出现负对角线说明负环存在，经过该环可达的起终点对不能继续按有限最短距离恢复路径，否则可能循环。不可达和负环影响应使用不同结果。

## 依赖、容量与恢复流程

构建与部署可以建模为依赖 DAG：例如“编译→测试→打包”，边表示前者完成后后者才可执行。Kahn 算法维护入度为 0 的就绪队列，移除已处理顶点的出边；处理数量不足 V 表示存在环。剩余顶点也可能只是依赖于环，并不全在环上，需要 SCC 等进一步定位。Python 可用标准库 `graphlib.TopologicalSorter` 管理依赖和就绪任务。

拓扑顺序只说明合法先后，不说明任务耗时，也不保证资源足够。关键路径在 DAG 上按持续时间求最长依赖链；活动边 u→v 的零时差条件可写为 `earliest[u] == latest[v] - duration(u,v)`。计算还需统一项目起终点、非负工期和多个出口的合同；没有资源竞争的关键路径工期只是模型结论。

网络流沿**残余容量**大于 0 的边找增广路，增大正向流后必须增加反向可撤销容量。搜索原始容量图会反复走已满边，可能算错甚至不终止。每条边应关联其反向边索引，避免平行边或原本就有反向边时误更新。用 BFS 找增广路的经典实现称 Edmonds-Karp，时间 O(VE²)；一般 Ford-Fulkerson 的复杂度取决于选路方式与容量条件。

本页不把路径、依赖和容量混装进一个通用算法类。实际使用还需要区分静态快照、边权实时变化、断点重算和输入非法；已经得出的最短路径不能自动适应后续新增边或权重改变。

## 验证路径与模型

小图可用全源动态规划或穷举简单路径作对照，验证距离和返回路径是否一致；每个相邻顶点必须确实有对应方向的边。多条最短路时比较目标值与合法性，不硬编码唯一顺序。

应覆盖孤立点、缺失顶点、自环、零权环、平行边、不可达终点、起终点相同和负权拒绝。拓扑结果检查每条边的先后关系，并测试环；生成森林检查边无环、连通分量覆盖和总成本；流算法检查每条边容量、内部顶点流量守恒，并以最小割作小实例对照。测试结果不能代替对算法前提的确认。
