# 字符串算法

字符串处理先要确认“位置”和“相等”的含义。Python str 按 Unicode 码点索引，UTF-8 文件按字节存储，用户看到的一个字形还可能由多个码点组成。查找、截取、长度和高亮必须使用同一个单位，否则算法返回的下标正确，界面仍可能标错。

例如 `len("订单") == 2`，UTF-8 编码长度为6字节；`é` 与 `e\u0301` 可以显示相似，却是不同码点序列。是否先做 NFC 规范化、大小写折叠或分词，应由业务定义；变换可能改变长度，映射回原文位置还需要保留对应关系。

## 子串、子序列与编辑

子串要求连续，子序列只要求相对顺序不变。“订单已支付”包含子串“已支付”，也包含子序列“单支”，但后者不是连续片段。日志关键词查找、文本差异与拼写纠错分别对应不同模型，不能统一叫“字符串相似度”。

| 问题 | 合适机制 | 结果合同 |
| --- | --- | --- |
| 一个关键词是否存在、第一次在哪里 | 内置 in / find | find返回码点下标，未找到为-1；空模式含义由接口定义 |
| 所有精确匹配，包括重叠 | KMP、带明确推进规则的查找 | 例如 `aaaa` 中 `aa` 为0、1、2 |
| 多个关键词同时扫描 | Trie、Aho-Corasick等 | 预处理成本、重复模式、输出数量都要算 |
| 两段文本的共同连续部分 | 最长公共子串 | 不匹配时当前连续长度归零 |
| 保持顺序的最大共同内容 | 最长公共子序列 LCS | 可跨越删除内容，可能存在多组最优解 |
| 最少插入/删除/替换 | Levenshtein编辑距离 | 单位、操作代价与是否允许转置必须明确 |
| 结构化模式匹配 | 正则、通配符或语法解析器 | 三者语义不同，不能共用同一个 * 解释 |

工程中先用内置函数或成熟库。手写算法适合需要理解状态、跨块扫描或作为小规模基准的场景；不能因为内置函数写得短就把它称为“朴素算法”，其内部实现和复杂度需要单独核对。

## KMP：保存已经匹配的前缀

KMP为模式预计算 LPS 表：`lps[i]` 是模式前缀 `pattern[:i+1]` 的最长**真前缀**与后缀相等的长度，“真”表示不能取整个前缀本身。模式 `ABABAC` 的表为 `[0,0,1,2,3,0]`。

假设已经匹配 `ABABA`，下一字符本该为 C，却读到 B。已知末尾 `ABA` 同时是模式前缀，匹配长度可从5退到3，再用同一个 B 与模式位置3比较。文本指针不回退，也不用把已确认的 A、B 全部重新读一遍。

这种状态也能跨输入块保留。文本“订单A已支付；订单B已支付”拆成“订单A已”和“支付；订单B已支付”，分别独立搜索会漏掉第一次跨块匹配；保留前缀长度即可找到绝对位置3与10。

![KMP跨文本块保留前缀状态与绝对位置](/algorithm/string-stream-boundary.svg)

## 完整实现：跨块精确匹配

以下 Python 3 类拒绝空模式，明确与某些内置函数“空模式匹配所有边界”的合同不同。它按码点计算位置，允许重叠，逐块返回本块新完成匹配的全局起始下标；空输入块不改变状态。

```python
class KMPMatcher:
    def __init__(self, pattern):
        if not isinstance(pattern, str) or not pattern:
            raise ValueError("模式必须是非空字符串")
        self._pattern = pattern
        self._lps = [0] * len(pattern)
        matched = 0
        for i in range(1, len(pattern)):
            while matched and pattern[i] != pattern[matched]:
                matched = self._lps[matched - 1]
            if pattern[i] == pattern[matched]:
                matched += 1
            self._lps[i] = matched
        self.reset()

    def reset(self):
        self._matched = 0
        self._offset = 0

    def feed(self, chunk):
        if not isinstance(chunk, str):
            raise TypeError("输入块必须是字符串")
        positions = []
        matched = self._matched
        for i, char in enumerate(chunk):
            while matched and char != self._pattern[matched]:
                matched = self._lps[matched - 1]
            if char == self._pattern[matched]:
                matched += 1
            if matched == len(self._pattern):
                positions.append(self._offset + i - len(self._pattern) + 1)
                matched = self._lps[matched - 1]
        self._matched = matched
        self._offset += len(chunk)
        return tuple(positions)


matcher = KMPMatcher("已支付")
assert matcher.feed("订单A已") == ()
assert matcher.feed("") == ()
assert matcher.feed("支付；订单B已支付") == (3, 10)
matcher.reset()
assert matcher.feed("已支付") == (0,)
overlap = KMPMatcher("aa")
assert overlap.feed("a") == ()
assert overlap.feed("aaa") == (0, 1, 2)
print(KMPMatcher("ABABAC").feed("ABABABAC"))
```

输出 `(2,)`。模式预处理 O(m)，所有块合计扫描 O(n)，维护状态 O(m)，返回 K 个位置另需 O(K)时间与存储。本实现不会保留全部历史文本，但同一实例有可变状态，应按文本流独立使用，不能在多个流或线程之间交错调用。

从文件按字节分块时，UTF-8字符可能跨字节块。先使用增量解码器或文本流正确解码，再将字符串交给matcher；对每个原始字节块独立decode可能失败。匹配位置仍是解码后码点位置，若要字节偏移，需要额外维护映射。断点恢复也必须保存模式版本、匹配长度、解码状态和偏移，不能只记文件读取字节数。

## 编辑距离：状态包含两个前缀

令 `dp[i][j]` 为把 a 的前i个码点变成 b 的前j个码点所需最少操作数。删除来自 `dp[i-1][j]+1`，插入来自 `dp[i][j-1]+1`，替换或保留来自 `dp[i-1][j-1]+(a[i-1]!=b[j-1])`。空前缀到长度j的前缀需要j次插入，反向需要i次删除。

下面仅返回单位代价的距离，不返回编辑脚本，也不包含相邻交换操作。只保留上一行即可把额外空间降到 O(min(m,n))：

```python
def edit_distance(left, right):
    if not isinstance(left, str) or not isinstance(right, str):
        raise TypeError("输入必须是字符串")
    if len(left) < len(right):
        left, right = right, left
    previous = list(range(len(right) + 1))
    for i, char_left in enumerate(left, start=1):
        current = [i]
        for j, char_right in enumerate(right, start=1):
            current.append(min(
                previous[j] + 1,
                current[j - 1] + 1,
                previous[j - 1] + (char_left != char_right),
            ))
        previous = current
    return previous[-1]


assert edit_distance("kitten", "sitting") == 3
assert edit_distance("发货", "发货了") == 1
assert edit_distance("", "订单") == 2
assert edit_distance("ab", "ba") == 2
print(edit_distance("订单A", "订单B"))
```

输出1，时间 O(mn)。交换两个输入只在对称的操作代价下安全；如果插入和删除价格不同，需要保持方向或同时交换代价。恢复编辑脚本要保存决策或采用专门恢复算法，且每个位置必须说明相对于原文、目标还是已编辑文本，不能直接把回溯下标当作逐步执行下标。

LCS在字符相等时接上对角状态加1，不相等时取上方或左方较长者；最长公共子串则在不相等时清零。这两个DP都常需 O(mn)时间，压缩数组只能直接给出某些摘要；枚举所有LCS可能产生指数数量输出。编辑距离也不等于语义相似度，“支付成功”和“支付失败”可能字面接近而业务意义相反。

## 哈希、回文与模式语法

滚动哈希可以快速更新窗口摘要，但哈希相等不代表字符串相同。精确匹配需要回查原文；多模式哈希表应将同一哈希对应的所有候选保留为桶，不能用后一模式覆盖前一模式。二分最长重复子串时，每次“存在重复”的判断也要验证碰撞，否则错误判断会让二分方向失真。

Boyer-Moore从右向左比较，利用坏字符和好后缀信息跳跃；性能取决于具体变体、输入与预处理，不能无条件用 O(n/m) 描述所有文本的平均成本。Rabin-Karp在碰撞少时扫描高效，发生大量碰撞并逐次复核时可能退化。所有算法返回大量匹配时，都必须计入输出数量。

回文中心扩展同时处理单字符中心与字符间中心，最坏 O(n²)时间。Manacher利用已知回文的对称半径达到线性扫描，但预处理哨兵必须与真实输入不冲突，不能用try/except吞掉越界来掩盖规则错误。返回切片还会分配与答案长度成正比的空间，O(1)辅助空间不等于总返回空间。

正则的 `a*` 表示重复a，通配符的 `*` 通常表示任意字符序列；支持点与星的教学DP不是完整正则引擎。字面关键词进入正则前应转义，验证整串时使用fullmatch语义。对外部复杂模式还需考虑回溯成本与运行资源，不能把任意模式直接当作普通子串搜索。

URL、邮箱和代码等结构化文本不能靠一个宽松正则就完成合法性验证。使用对应解析器并按协议/业务规则检查；Python的ord返回Unicode码点，并非任意字符的ASCII编码，逐码点拼“8位二进制”也不是UTF-8编码。

## 压缩、索引与业务文本

行程长度编码需要明确可逆格式。直接把“字符+十进制次数”拼成字符串，会与原始数字字符冲突；“变长时返回原文”若没有格式标记，解码器也无法知道输入是否编码。可以使用结构化的字符/次数对和格式头，限制展开总长度；通用字节压缩优先采用zlib等成熟实现。

倒排索引回答分词后的词项集合查询，不等同连续子串匹配。按空白split不能完成中文分词；同一文档编号更新时还应删除旧词项记录，否则已删除的词仍可命中。大小写、规范化、分词器版本与索引版本需要一致，结果排序和去重也应有合同。

DNA反向互补、序列对齐与自然语言处理都有额外领域模型。反向互补回文不等于普通正反相同，更不能仅由短序列重复断言真实发夹结构。对齐代价、模糊碱基和输入校验要交由明确的领域实现处理。

## 验证匹配边界与输出

KMP用小文本的逐位置切片比较作为基准，同时随机改变切块方式，确认整段与分块输出一致。覆盖模式长于文本、空文本、全部重复、重叠匹配、中文、补充平面码点、组合字符及非法空模式。规范化前后属于不同输入，不能悄悄合并其下标。

编辑距离可与完整二维表对照，检查空串、相等、插入、删除、替换、对称性及单位代价下的长度差下界。计时应区分解码、规范化、模式预处理、扫描和结果高亮；真实大文件还需检查跨块状态、结果数量与内存，不能只展示一个英文短串样例。
