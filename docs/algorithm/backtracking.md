# 回溯算法

回溯把候选解拆成一系列选择，沿搜索树深入；当前分支完成或无法满足条件后，撤销选择，继续其他分支。它可以找一个可行解、全部解或最优解，停止条件和剪枝规则随目标改变。“当前收益较低”本身不是放弃分支的理由，后面的选择可能让它反超。

例如在 5 个预算单位内安排任务：A 花费 2、收益 3，B 花费 3、收益 4，每项最多一次。搜索依次决定选不选 A、选不选 B；选择 A+B 得到收益 7。如果再规定两者互斥，原来的最优组合变成非法，最优解为 B 的 4。回溯适合这种需要显式检查组合约束、规模又较小的问题。

![任务选择的搜索树和撤销过程](/algorithm/backtracking-task-tree.svg)

## 先定义状态、约束与答案

本例的状态是“下一项下标 i、剩余预算、当前收益、已选编号”。每次只处理下标 i，下一层变为 i+1，因此每项最多一次，也不会在不同顺序下重复枚举同一个集合。到 i=n 时，当前选择形成一个完整方案。

约束剪枝与最优值剪枝不同：花费超过剩余预算、与已选任务互斥，说明“选这一项”的分支不合法；而“当前收益加上所有剩余任务收益仍不超过已知最优值”，说明这个分支即使理想发展也无法改善答案。后者需要一个**不会低估**的收益上界。

这里收益非负，把剩余任务的收益全部相加，忽略预算与互斥限制，必定不小于真实可得收益。这个上界很宽松，但安全。若上界等于已知最优值，下面的程序可以剪掉，因为只需要一个最优方案；若要返回全部最优方案，就不能丢弃相等的分支。

## 完整实现：预算与互斥任务

以下 Python 3 程序返回最大收益及一组任务编号。整数预算允许剩余，花费为正整数，收益为非负整数，编号唯一；互斥关系必须引用已有且不同的编号。输入列表不被排序或修改。

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class Task:
    task_id: str
    cost: int
    score: int


def select_tasks(tasks, budget, conflicts=()):
    tasks = tuple(tasks)
    if type(budget) is not int or budget < 0:
        raise ValueError("预算必须是非负整数")
    ids = set()
    for task in tasks:
        if not isinstance(task, Task):
            raise TypeError("任务必须使用 Task")
        if not isinstance(task.task_id, str) or not task.task_id.strip():
            raise ValueError("编号不能为空")
        if task.task_id in ids:
            raise ValueError("编号必须唯一")
        if type(task.cost) is not int or task.cost <= 0:
            raise ValueError("花费必须是正整数")
        if type(task.score) is not int or task.score < 0:
            raise ValueError("收益必须是非负整数")
        ids.add(task.task_id)

    blocked = {task_id: set() for task_id in ids}
    for pair in conflicts:
        if not isinstance(pair, (tuple, list)) or len(pair) != 2:
            raise ValueError("互斥关系必须是两个编号")
        left, right = pair
        if not isinstance(left, str) or not isinstance(right, str):
            raise ValueError("互斥编号必须是字符串")
        if left not in ids or right not in ids or left == right:
            raise ValueError("互斥关系必须引用已有且不同的任务")
        blocked[left].add(right)
        blocked[right].add(left)

    n = len(tasks)
    suffix = [0] * (n + 1)
    for i in range(n - 1, -1, -1):
        suffix[i] = suffix[i + 1] + tasks[i].score

    chosen = []
    chosen_ids = set()
    best_score, best_ids = 0, ()

    def search(i, remaining, score):
        nonlocal best_score, best_ids
        if score + suffix[i] <= best_score:
            return
        if i == n:
            best_score, best_ids = score, tuple(chosen)
            return

        task = tasks[i]
        if task.cost <= remaining and blocked[task.task_id].isdisjoint(chosen_ids):
            chosen.append(task.task_id)
            chosen_ids.add(task.task_id)
            search(i + 1, remaining - task.cost, score + task.score)
            chosen_ids.remove(task.task_id)
            chosen.pop()
        search(i + 1, remaining, score)

    search(0, budget, 0)
    return best_score, best_ids


tasks = (Task("A", 2, 3), Task("B", 3, 4))
assert select_tasks(tasks, 5) == (7, ("A", "B"))
assert select_tasks(tasks, 5, (("A", "B"),)) == (4, ("B",))
assert select_tasks((), 5) == (0, ())
assert select_tasks(tasks, 0) == (0, ())
print(select_tasks(tasks, 5))
```

输出 `(7, ('A', 'B'))`。进入“选 A”的递归前把 A 加入路径，返回后从路径和编号集合中移除；随后“不选 A”的分支从干净状态开始。保存答案用 `tuple(chosen)` 复制当前路径，不能保存会继续变化的列表引用。

程序按输入顺序先探索选择分支，平分时保留先发现的最优方案；初始空方案收益为 0，因此全部零收益时返回空方案。它不保证在所有最优方案中任务数量最少，也不按编号重新排序。业务如果需要这样的第二目标，应改比较合同和相等上界的处理。

最坏仍有 O(2ⁿ) 个搜索节点。互斥集合检查和保存路径最多再带来 O(n) 因子，保守时间上界为 O(n·2ⁿ)；互斥关系数为 m 时，邻接集合与递归等辅助空间为 O(n+m)。Python 递归深度也限制可处理的 n；剪枝不保证把大规模问题变得可行。

## 为什么“看起来更紧”的上界可能算错

以容量 10、当前已知收益 10 为例，剩余两项按输入顺序为 X(重量 10、收益 1)、Y(重量 10、收益 100)。若按这个顺序做“分数装填”，会先装 X 并得到上界 1，于是剪掉分支，却漏掉能选 Y 得到的 100。

分数背包要按收益密度从大到小装填，才能作为相同约束下 0-1 背包的松弛上界；计算时还要避免浮点舍入把上界向下压低。没有证明与数值处理时，宁可先使用所有剩余非负收益之和，再测量是否值得优化。可行方案的收益是下界，不能当作“最多只能得到多少”的上界。

分支限界用上下界排除不可能改进的子树，可以采用深度优先、广度优先或优先队列；回溯常用深度优先维护路径。两者可以结合，但不是相同术语。A* 则按 `g+h` 搜索路径，涉及启发函数、重复状态和最短路条件，参见[图算法](./graph-algorithms.md)。

## 不同问题怎样安排选择

| 问题 | 一层选择什么 | 状态与撤销 | 必须明确的边界 |
| --- | --- | --- | --- |
| 子集与组合 | 当前元素选或不选，或下一元素下标 | 路径与起始下标 | 是否按位置区分重复值、空集合是否计入 |
| 排列 | 从未使用的位置中选一个 | 路径与 used 数组 | 相同值是否需要去重；保存结果需复制 |
| N 皇后 | 当前行的列 | 已占列、行减列、行加列 | n 的取值、返回一个还是全部棋盘 |
| 数独 | 空格的候选数字 | 棋盘与行/列/宫集合 | 先验证形状、字符及已有冲突；区分无解与已解 |
| 单词搜索 | 当前格的相邻格 | 路径中的格子集合 | 禁止同一路径复用格子；用独立 visited，避免哨兵与字符冲突 |
| 图着色 | 当前顶点的颜色 | 相邻已着色顶点 | 给定 k 找可行解不等于求最少颜色 |
| 旅行商 | 下一座未访问城市 | 访问集合、当前端点和费用 | 起终点、缺边与负权；仅以当前费用剪枝需额外前提 |

允许同一候选重复使用的“组合总和”必须特别检查终止性。如果选择 0 后目标不减少，或允许正负数反复抵消，沿用常见递归模板可能永不终止。可以限定正整数候选，或增加明确使用次数；不能只排序后直接递归。候选去重应基于业务含义，不能把两个独立库存项误合成一个。

迷宫深度优先搜索可以找一条可达路径，不保证最短。无权最短路径优先用 BFS；如果要枚举所有简单路径，沿当前路径使用并撤销 visited，但结果数量可能指数增长。这里“撤销路径”和“全局已经搜索完成”的访问标记承担不同职责。

## 验证剪枝与恢复

先关闭最优值剪枝，用小规模全枚举结果作基准；再开启剪枝比较最优值和所选项是否合法。应覆盖空输入、零预算、全超预算、互斥环、多个最优解、零收益和非法关系。除返回收益外，还要检查编号没有重复、预算没有超出、互斥双方没有同时出现。

若要求枚举 K 个结果，每个长度最多 n，单是复制和保存输出就可能需要 O(Kn) 时间与空间。不要只把递归栈算作全部空间。工程中应先决定是否流式产出、是否设结果数量或耗时上限，以及超时后返回“未完成”还是已有可行解，不能把提前停止的结果称为已证明最优。

只有预算与一次性选择、预算范围可控时，可以改用[动态规划](./dynamic-programming.md)；如果增加复杂依赖、资源与排班约束，应先评估成熟约束求解器。回溯程序适合作为小实例基准和理解状态的工具。
