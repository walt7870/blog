---
title: 动态规划
author: Walt
date: 2024-06-01 15:00:00
---

# 动态规划

动态规划（Dynamic Programming，DP）把会重复遇到的子问题归并成状态，并保存状态的答案。关键是状态包含继续决策所需的信息：若两条不同历史到达同一状态，后续可选行动与收益计算应一致，才能合并计算。

在 5 个预算单位内选择一次性任务：A 花费 2、收益 3，B 花费 3、收益 4，C 花费 4、收益 5。每个任务最多选一次，预算允许剩余。最高单项收益是 C 的 5，但最优组合是 A+B，收益 7。这是 0-1 背包模型；若任务还有依赖、互斥或截止时间，下面的状态可能不够，需要重新建模。

![0-1背包选择任务B时的两条状态来源](/algorithm/dp-task-transition.svg)

## 状态必须写清“前多少项”和“预算含义”

定义 `dp[i][c]` 为：只考虑前 i 个任务、总花费不超过 c 时，能获得的最大收益。i 是任务数量，不是数组下标；第 i 项在代码中对应 `tasks[i - 1]`。允许一个都不选且收益非负，因此 `dp[0][c] = 0`，本例中预算为 0 时也只能得到 0。

考虑第 i 项、花费 w、收益 v，有两种互斥情况：

- 不选：沿用 `dp[i - 1][c]`。
- 选择一次：仅当 `c >= w` 时，候选为 `dp[i - 1][c - w] + v`。

取两者最大值。第二项必须读上一行，才能保证当前任务未被使用过。如果问题要求“恰好花完预算”，未达到的金额就不能初始化为 0，应区分不可达状态，否则会把不存在的方案混入答案。

| 已考虑任务 | c=0 | c=1 | c=2 | c=3 | c=4 | c=5 |
| --- | --- | --- | --- | --- | --- | --- |
| 无任务 | 0 | 0 | 0 | 0 | 0 | 0 |
| A(2,3) | 0 | 0 | 3 | 3 | 3 | 3 |
| A、B(3,4) | 0 | 0 | 3 | 4 | 4 | 7 |
| A、B、C(4,5) | 0 | 0 | 3 | 4 | 5 | 7 |

例如处理 B 时，`dp[2][5]` 比较“不选 B 的 3”和“在前一行用 2 单位预算所得 3，再加 B 的 4”，因此得到 7。处理 C 后，最右格仍为 7，说明 C 没有改善这一预算下的最优值。

## 完整实现：返回收益和任务清单

以下 Python 3 示例不依赖第三方包。它限定整数预算、正整数花费和非负整数收益，任务编号必须唯一；输入违反合同会明确抛出异常。收益只是给定模型中的分值，不代表真实投资、经营收益预测。

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class Task:
    task_id: str
    cost: int
    score: int


def select_tasks(tasks, budget):
    tasks = tuple(tasks)
    if type(budget) is not int or budget < 0:
        raise ValueError("预算必须是非负整数")
    seen = set()
    for task in tasks:
        if not isinstance(task, Task):
            raise TypeError("任务必须使用 Task")
        if not isinstance(task.task_id, str) or not task.task_id.strip():
            raise ValueError("任务编号不能为空")
        if task.task_id in seen:
            raise ValueError("任务编号不能重复")
        if type(task.cost) is not int or task.cost <= 0:
            raise ValueError("花费必须是正整数")
        if type(task.score) is not int or task.score < 0:
            raise ValueError("收益必须是非负整数")
        seen.add(task.task_id)

    n = len(tasks)
    dp = [[0] * (budget + 1) for _ in range(n + 1)]
    for i, task in enumerate(tasks, start=1):
        for capacity in range(budget + 1):
            best = dp[i - 1][capacity]
            if capacity >= task.cost:
                best = max(best, dp[i - 1][capacity - task.cost] + task.score)
            dp[i][capacity] = best

    selected = []
    capacity = budget
    for i in range(n, 0, -1):
        if dp[i][capacity] != dp[i - 1][capacity]:
            task = tasks[i - 1]
            selected.append(task.task_id)
            capacity -= task.cost
    selected.reverse()
    return dp[n][budget], tuple(selected)


tasks = (Task("A", 2, 3), Task("B", 3, 4), Task("C", 4, 5))
assert select_tasks(tasks, 5) == (7, ("A", "B"))
assert select_tasks(tasks, 0) == (0, ())
assert select_tasks((), 5) == (0, ())
print(select_tasks(tasks, 5))
```

输出 `(7, ('A', 'B'))`。逆向恢复时，如果本行的值和上一行一样，选择跳过当前项；出现多个最优解时，这个规则固定返回其中一个，不枚举所有方案。若有收益、数量、优先级等多层比较标准，应把平分规则纳入状态或比较逻辑，不能事后随意换清单。

有 n 个任务、预算上限 B 时，时间和表空间均为 O(nB)，恢复路径另需 O(n) 时间。这里按整数运算近似常数计；大整数的位数也会带来成本。O(nB) 对预算数值是多项式，对 B 的二进制表示长度不一定是，因此称为伪多项式。预算从 5 变成十亿时，即使只有几十项，这张表也不可直接使用；应调整单位、采用稀疏状态或重新选择算法。

## 一维压缩为什么要倒序

若只求最大收益，不需要恢复清单，可以把前一行压缩到同一个数组。0-1 背包的容量必须从大到小更新，使本轮读取的较小容量仍属于上一轮：

```python
def best_score_only(tasks, budget):
    # 仅供已按 select_tasks 同一合同校验过的输入使用。
    best = [0] * (budget + 1)
    for task in tasks:
        for capacity in range(budget, task.cost - 1, -1):
            best[capacity] = max(
                best[capacity],
                best[capacity - task.cost] + task.score,
            )
    return best[budget]


assert best_score_only(tasks, 5) == 7
assert best_score_only((Task("A", 2, 3),), 4) == 3
```

只有 A 一项、容量为 4 时，正确答案是 3。若从小到大：先把 `best[2]` 更新为 3，随后 `best[4]` 又读取本轮的 `best[2]`，得到 6，相当于重复选择 A。完全背包允许重复使用同一项，正序更新才符合它的模型，不能只记循环方向而忘记来源状态。

压缩后的数组只记录最佳值。恢复清单通常需要保留选择决策、前驱或重新计算；直接在一维数组旁保存可变路径引用，可能在后续更新时覆盖历史。优先保留清晰的二维版本作为基准，确认空间确实成为瓶颈后再压缩。

## 记忆化与自底向上怎样选择

记忆化搜索按需递归计算状态并缓存答案，适合实际只访问少量状态的情况；自底向上按依赖顺序填表，便于控制遍历和内存。二者都必须确保递归或转移终止。缓存键漏掉预算、已用次数等约束时，会把不同问题误认为同一状态。

“无后效性”指状态已经概括了后续决策所需的历史，不是所有问题都天然与历史无关。例如任务之间有互斥关系，只用“前 i 项、预算 c”可能无法判断下一个任务能否选择；需要增加相关状态或采用其他模型。优化问题还需最优子结构；计数、可达性等 DP 则分别保存方案数或布尔值，不必硬套“最大收益”。

## 其他状态模型

| 模型 | 状态含义 | 计算顺序与边界 |
| --- | --- | --- |
| 路径计数 | `ways[i]`：到第 i 级的方法数 | `ways[0]=1`，允许一步或两步时依赖 i-1、i-2；大结果注意整数范围 |
| 最长递增子序列 | `length[i]`：以第 i 项结尾的最长长度 | 仅从更早且更小的元素转移；不是“前 i 项的全局最优值” |
| 编辑距离 | `dp[i][j]`：两个前缀的最少编辑数 | 空前缀到长度 j 的前缀需要 j 次插入，详见[字符串算法](./string-algorithms.md) |
| 区间模型 | `dp[i][j]`：求解某个连续区间的成本 | 通常按区间长度递增，先得到较短区间 |
| 集合模型 | `dp[mask][i]`：访问集合 mask 后停在 i 的成本 | 必须定义起点、不可达值和是否返回起点，空间可能指数增长 |

图上的最短路径也可能有递推关系，但有环、负权或实时变化时不能只靠“从左到右填表”。应按[图算法](./graph-algorithms.md)中的算法前提选择，不把所有路径问题都归入同一个模板。

## 怎样验证状态没有漏约束

先对少量任务枚举所有子集作为基准，再与 DP 输出比较。除了检查总收益，还要确认编号不重复、总花费不超预算、所选项收益等于返回值；有平分情况时只要求满足明确的平分合同。

建议覆盖空任务、零预算、全部超预算、恰好装满、多个最优解、非法花费和重复编号。再固定随机种子生成小实例做对照；这能揭示循环方向与边界问题，不能代替状态模型正确性的论证。上线规模还应检查预算离散化误差、内存上限和计算耗时。
