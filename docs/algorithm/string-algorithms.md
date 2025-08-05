# 字符串算法详解

字符串算法是计算机科学中的重要分支，涉及字符串的搜索、匹配、处理和分析。这些算法在文本处理、生物信息学、数据压缩等领域有广泛应用。

## 字符串基础概念

### 基本定义

- **字符串**：由字符组成的有限序列
- **子串**：字符串中连续的字符序列
- **子序列**：字符串中保持相对顺序的字符序列（不一定连续）
- **前缀**：从字符串开头开始的子串
- **后缀**：到字符串结尾的子串
- **回文**：正读和反读都相同的字符串

### 字符串表示

```python
# 字符串的不同表示方法
class StringRepresentation:
    """
    字符串的不同表示方法
    """
    
    @staticmethod
    def char_array_representation(s):
        """字符数组表示"""
        return list(s)
    
    @staticmethod
    def ascii_representation(s):
        """ASCII码表示"""
        return [ord(c) for c in s]
    
    @staticmethod
    def binary_representation(s):
        """二进制表示"""
        return ''.join(format(ord(c), '08b') for c in s)
    
    @staticmethod
    def unicode_representation(s):
        """Unicode表示"""
        return [ord(c) for c in s]

# 示例
print("字符串表示方法示例:")
s = "Hello"
print(f"原字符串: {s}")
print(f"字符数组: {StringRepresentation.char_array_representation(s)}")
print(f"ASCII码: {StringRepresentation.ascii_representation(s)}")
print(f"二进制: {StringRepresentation.binary_representation(s)}")
print(f"Unicode: {StringRepresentation.unicode_representation(s)}")
```

## 字符串搜索算法

### 朴素字符串匹配

#### 算法原理
朴素算法通过逐个比较字符来查找模式串在文本串中的位置。

#### 实现代码

```python
def naive_string_search(text, pattern):
    """
    朴素字符串搜索算法
    时间复杂度: O(nm), n为文本长度, m为模式长度
    空间复杂度: O(1)
    """
    n, m = len(text), len(pattern)
    positions = []
    
    for i in range(n - m + 1):
        j = 0
        while j < m and text[i + j] == pattern[j]:
            j += 1
        
        if j == m:
            positions.append(i)
    
    return positions

def naive_string_search_optimized(text, pattern):
    """
    优化的朴素搜索 - 使用内置函数
    """
    positions = []
    start = 0
    
    while True:
        pos = text.find(pattern, start)
        if pos == -1:
            break
        positions.append(pos)
        start = pos + 1
    
    return positions

# 示例
print("\n朴素字符串搜索示例:")
text = "ABABDABACDABABCABCABCABCABC"
pattern = "ABABCAB"
positions = naive_string_search(text, pattern)
print(f"文本: {text}")
print(f"模式: {pattern}")
print(f"匹配位置: {positions}")
```

### KMP算法

#### 算法原理
KMP（Knuth-Morris-Pratt）算法通过预处理模式串，构建部分匹配表（失效函数），避免不必要的字符比较。

#### 实现代码

```python
def compute_lps_array(pattern):
    """
    计算最长前缀后缀数组（LPS数组）
    LPS[i] = pattern[0...i]的最长相等前缀后缀的长度
    """
    m = len(pattern)
    lps = [0] * m
    length = 0  # 前一个LPS值的长度
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

def kmp_search(text, pattern):
    """
    KMP字符串搜索算法
    时间复杂度: O(n + m)
    空间复杂度: O(m)
    """
    n, m = len(text), len(pattern)
    if m == 0:
        return []
    
    # 计算LPS数组
    lps = compute_lps_array(pattern)
    
    positions = []
    i = j = 0  # i为text的索引，j为pattern的索引
    
    while i < n:
        if pattern[j] == text[i]:
            i += 1
            j += 1
        
        if j == m:
            positions.append(i - j)
            j = lps[j - 1]
        elif i < n and pattern[j] != text[i]:
            if j != 0:
                j = lps[j - 1]
            else:
                i += 1
    
    return positions

def kmp_search_with_details(text, pattern):
    """
    带详细过程的KMP搜索
    """
    print(f"\nKMP搜索详细过程:")
    print(f"文本: {text}")
    print(f"模式: {pattern}")
    
    lps = compute_lps_array(pattern)
    print(f"LPS数组: {lps}")
    
    n, m = len(text), len(pattern)
    positions = []
    i = j = 0
    
    while i < n:
        print(f"\n比较 text[{i}]='{text[i]}' 和 pattern[{j}]='{pattern[j]}'")
        
        if pattern[j] == text[i]:
            print(f"匹配! i={i+1}, j={j+1}")
            i += 1
            j += 1
        
        if j == m:
            print(f"找到完整匹配，位置: {i - j}")
            positions.append(i - j)
            j = lps[j - 1]
            print(f"使用LPS[{m-1}]={lps[m-1]}，j={j}")
        elif i < n and pattern[j] != text[i]:
            if j != 0:
                print(f"不匹配，使用LPS[{j-1}]={lps[j-1]}")
                j = lps[j - 1]
            else:
                print(f"不匹配，i前进到{i+1}")
                i += 1
    
    return positions

# 示例
print("\nKMP算法示例:")
text = "ABABDABACDABABCABCABCABCABC"
pattern = "ABABCAB"
positions = kmp_search(text, pattern)
print(f"KMP匹配位置: {positions}")

# 详细过程示例
text_simple = "ABABCABABA"
pattern_simple = "ABABCAB"
positions_detailed = kmp_search_with_details(text_simple, pattern_simple)
```

### Boyer-Moore算法

#### 算法原理
Boyer-Moore算法从右到左比较字符，使用坏字符规则和好后缀规则来跳过不可能匹配的位置。

#### 实现代码

```python
def boyer_moore_bad_char_table(pattern):
    """
    构建坏字符表
    """
    m = len(pattern)
    bad_char = {}
    
    # 初始化所有字符的位置为-1
    for i in range(256):  # ASCII字符
        bad_char[chr(i)] = -1
    
    # 记录模式中每个字符最后出现的位置
    for i in range(m):
        bad_char[pattern[i]] = i
    
    return bad_char

def boyer_moore_good_suffix_table(pattern):
    """
    构建好后缀表
    """
    m = len(pattern)
    good_suffix = [0] * m
    border_pos = [0] * (m + 1)
    
    # 预处理强好后缀情况
    i = m
    j = m + 1
    border_pos[i] = j
    
    while i > 0:
        while j <= m and pattern[i - 1] != pattern[j - 1]:
            if good_suffix[j - 1] == 0:
                good_suffix[j - 1] = j - i
            j = border_pos[j]
        
        i -= 1
        j -= 1
        border_pos[i] = j
    
    # 预处理弱好后缀情况
    j = border_pos[0]
    for i in range(m):
        if good_suffix[i] == 0:
            good_suffix[i] = j
        if i == j:
            j = border_pos[j]
    
    return good_suffix

def boyer_moore_search(text, pattern):
    """
    Boyer-Moore字符串搜索算法
    平均时间复杂度: O(n/m)
    最坏时间复杂度: O(nm)
    """
    n, m = len(text), len(pattern)
    if m == 0:
        return []
    
    # 构建坏字符表和好后缀表
    bad_char = boyer_moore_bad_char_table(pattern)
    good_suffix = boyer_moore_good_suffix_table(pattern)
    
    positions = []
    shift = 0
    
    while shift <= n - m:
        j = m - 1
        
        # 从右到左比较
        while j >= 0 and pattern[j] == text[shift + j]:
            j -= 1
        
        if j < 0:
            # 找到匹配
            positions.append(shift)
            shift += good_suffix[0]
        else:
            # 计算移动距离
            bad_char_shift = j - bad_char.get(text[shift + j], -1)
            good_suffix_shift = good_suffix[j]
            shift += max(bad_char_shift, good_suffix_shift)
    
    return positions

def boyer_moore_search_simple(text, pattern):
    """
    简化版Boyer-Moore算法（仅使用坏字符规则）
    """
    n, m = len(text), len(pattern)
    bad_char = boyer_moore_bad_char_table(pattern)
    
    positions = []
    shift = 0
    
    while shift <= n - m:
        j = m - 1
        
        while j >= 0 and pattern[j] == text[shift + j]:
            j -= 1
        
        if j < 0:
            positions.append(shift)
            shift += 1
        else:
            shift += max(1, j - bad_char.get(text[shift + j], -1))
    
    return positions

# 示例
print("\nBoyer-Moore算法示例:")
text = "ABAAABCDABABCABCABCABC"
pattern = "ABCAB"
positions = boyer_moore_search(text, pattern)
print(f"文本: {text}")
print(f"模式: {pattern}")
print(f"Boyer-Moore匹配位置: {positions}")

# 简化版示例
positions_simple = boyer_moore_search_simple(text, pattern)
print(f"简化版Boyer-Moore匹配位置: {positions_simple}")
```

### Rabin-Karp算法

#### 算法原理
Rabin-Karp算法使用哈希函数来快速比较字符串，通过滚动哈希技术实现高效搜索。

#### 实现代码

```python
def rabin_karp_search(text, pattern, prime=101):
    """
    Rabin-Karp字符串搜索算法
    平均时间复杂度: O(n + m)
    最坏时间复杂度: O(nm)
    """
    n, m = len(text), len(pattern)
    if m == 0:
        return []
    
    # 计算哈希值的基数
    base = 256
    
    # 计算模式串的哈希值
    pattern_hash = 0
    text_hash = 0
    h = 1
    
    # h = base^(m-1) % prime
    for i in range(m - 1):
        h = (h * base) % prime
    
    # 计算模式串和文本第一个窗口的哈希值
    for i in range(m):
        pattern_hash = (base * pattern_hash + ord(pattern[i])) % prime
        text_hash = (base * text_hash + ord(text[i])) % prime
    
    positions = []
    
    # 滑动窗口
    for i in range(n - m + 1):
        # 检查哈希值
        if pattern_hash == text_hash:
            # 哈希值相等，逐字符比较确认
            if text[i:i + m] == pattern:
                positions.append(i)
        
        # 计算下一个窗口的哈希值
        if i < n - m:
            text_hash = (base * (text_hash - ord(text[i]) * h) + ord(text[i + m])) % prime
            # 确保哈希值为正数
            if text_hash < 0:
                text_hash += prime
    
    return positions

def rabin_karp_multiple_patterns(text, patterns, prime=101):
    """
    多模式Rabin-Karp搜索
    """
    if not patterns:
        return {}
    
    base = 256
    n = len(text)
    results = {pattern: [] for pattern in patterns}
    
    # 按模式长度分组
    patterns_by_length = {}
    for pattern in patterns:
        length = len(pattern)
        if length not in patterns_by_length:
            patterns_by_length[length] = []
        patterns_by_length[length].append(pattern)
    
    # 对每个长度组进行搜索
    for m, pattern_group in patterns_by_length.items():
        if m == 0 or m > n:
            continue
        
        # 计算h = base^(m-1) % prime
        h = 1
        for i in range(m - 1):
            h = (h * base) % prime
        
        # 计算所有模式的哈希值
        pattern_hashes = {}
        for pattern in pattern_group:
            pattern_hash = 0
            for char in pattern:
                pattern_hash = (base * pattern_hash + ord(char)) % prime
            pattern_hashes[pattern_hash] = pattern
        
        # 计算文本第一个窗口的哈希值
        text_hash = 0
        for i in range(m):
            text_hash = (base * text_hash + ord(text[i])) % prime
        
        # 滑动窗口搜索
        for i in range(n - m + 1):
            if text_hash in pattern_hashes:
                pattern = pattern_hashes[text_hash]
                if text[i:i + m] == pattern:
                    results[pattern].append(i)
            
            # 计算下一个窗口的哈希值
            if i < n - m:
                text_hash = (base * (text_hash - ord(text[i]) * h) + ord(text[i + m])) % prime
                if text_hash < 0:
                    text_hash += prime
    
    return results

# 示例
print("\nRabin-Karp算法示例:")
text = "GEEKS FOR GEEKS"
pattern = "GEEK"
positions = rabin_karp_search(text, pattern)
print(f"文本: {text}")
print(f"模式: {pattern}")
print(f"Rabin-Karp匹配位置: {positions}")

# 多模式搜索示例
print("\n多模式Rabin-Karp搜索示例:")
patterns = ["GEEK", "FOR", "EEK"]
results = rabin_karp_multiple_patterns(text, patterns)
for pattern, positions in results.items():
    print(f"模式 '{pattern}': {positions}")
```

## 字符串处理算法

### 最长公共子序列（LCS）

#### 算法原理
最长公共子序列问题是找到两个序列中最长的公共子序列。

#### 实现代码

```python
def lcs_length(text1, text2):
    """
    计算最长公共子序列的长度
    时间复杂度: O(mn)
    空间复杂度: O(mn)
    """
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i - 1] == text2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    
    return dp[m][n]

def lcs_string(text1, text2):
    """
    获取最长公共子序列的具体内容
    """
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    
    # 填充DP表
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i - 1] == text2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    
    # 回溯构造LCS
    lcs = []
    i, j = m, n
    while i > 0 and j > 0:
        if text1[i - 1] == text2[j - 1]:
            lcs.append(text1[i - 1])
            i -= 1
            j -= 1
        elif dp[i - 1][j] > dp[i][j - 1]:
            i -= 1
        else:
            j -= 1
    
    return ''.join(reversed(lcs))

def lcs_all_sequences(text1, text2):
    """
    获取所有最长公共子序列
    """
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    
    # 填充DP表
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i - 1] == text2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    
    # 回溯获取所有LCS
    def backtrack(i, j, current_lcs):
        if i == 0 or j == 0:
            all_lcs.add(current_lcs[::-1])
            return
        
        if text1[i - 1] == text2[j - 1]:
            backtrack(i - 1, j - 1, current_lcs + text1[i - 1])
        else:
            if dp[i - 1][j] == dp[i][j]:
                backtrack(i - 1, j, current_lcs)
            if dp[i][j - 1] == dp[i][j]:
                backtrack(i, j - 1, current_lcs)
    
    all_lcs = set()
    backtrack(m, n, "")
    return list(all_lcs)

def lcs_space_optimized(text1, text2):
    """
    空间优化的LCS算法
    空间复杂度: O(min(m, n))
    """
    if len(text1) < len(text2):
        text1, text2 = text2, text1
    
    m, n = len(text1), len(text2)
    prev = [0] * (n + 1)
    curr = [0] * (n + 1)
    
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i - 1] == text2[j - 1]:
                curr[j] = prev[j - 1] + 1
            else:
                curr[j] = max(prev[j], curr[j - 1])
        prev, curr = curr, prev
    
    return prev[n]

# 示例
print("\n最长公共子序列示例:")
text1 = "ABCDGH"
text2 = "AEDFHR"
print(f"字符串1: {text1}")
print(f"字符串2: {text2}")
print(f"LCS长度: {lcs_length(text1, text2)}")
print(f"LCS内容: {lcs_string(text1, text2)}")
print(f"所有LCS: {lcs_all_sequences(text1, text2)}")
print(f"空间优化LCS长度: {lcs_space_optimized(text1, text2)}")
```

### 最长公共子串

#### 算法原理
最长公共子串是两个字符串中最长的连续公共部分。

#### 实现代码

```python
def longest_common_substring(text1, text2):
    """
    最长公共子串
    时间复杂度: O(mn)
    空间复杂度: O(mn)
    """
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    
    max_length = 0
    ending_pos_i = 0
    
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i - 1] == text2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
                if dp[i][j] > max_length:
                    max_length = dp[i][j]
                    ending_pos_i = i
            else:
                dp[i][j] = 0
    
    # 提取最长公共子串
    start_pos = ending_pos_i - max_length
    longest_substring = text1[start_pos:ending_pos_i]
    
    return longest_substring, max_length

def longest_common_substring_space_optimized(text1, text2):
    """
    空间优化的最长公共子串
    空间复杂度: O(min(m, n))
    """
    if len(text1) < len(text2):
        text1, text2 = text2, text1
    
    m, n = len(text1), len(text2)
    prev = [0] * (n + 1)
    curr = [0] * (n + 1)
    
    max_length = 0
    ending_pos_i = 0
    
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i - 1] == text2[j - 1]:
                curr[j] = prev[j - 1] + 1
                if curr[j] > max_length:
                    max_length = curr[j]
                    ending_pos_i = i
            else:
                curr[j] = 0
        prev, curr = curr, prev
    
    start_pos = ending_pos_i - max_length
    longest_substring = text1[start_pos:ending_pos_i]
    
    return longest_substring, max_length

def all_common_substrings(text1, text2, min_length=1):
    """
    找到所有公共子串
    """
    m, n = len(text1), len(text2)
    common_substrings = set()
    
    for i in range(m):
        for j in range(i + min_length, m + 1):
            substring = text1[i:j]
            if substring in text2:
                common_substrings.add(substring)
    
    return sorted(list(common_substrings), key=len, reverse=True)

# 示例
print("\n最长公共子串示例:")
text1 = "GeeksforGeeks"
text2 = "GeeksQuiz"
print(f"字符串1: {text1}")
print(f"字符串2: {text2}")

longest_sub, length = longest_common_substring(text1, text2)
print(f"最长公共子串: '{longest_sub}', 长度: {length}")

longest_sub_opt, length_opt = longest_common_substring_space_optimized(text1, text2)
print(f"空间优化结果: '{longest_sub_opt}', 长度: {length_opt}")

all_common = all_common_substrings(text1, text2, 2)
print(f"所有长度>=2的公共子串: {all_common[:5]}...")  # 只显示前5个
```

### 编辑距离

#### 算法原理
编辑距离（Levenshtein距离）是指两个字符串之间，由一个转成另一个所需的最少编辑操作次数。

#### 实现代码

```python
def edit_distance(word1, word2):
    """
    计算编辑距离（Levenshtein距离）
    操作：插入、删除、替换
    时间复杂度: O(mn)
    空间复杂度: O(mn)
    """
    m, n = len(word1), len(word2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    
    # 初始化边界条件
    for i in range(m + 1):
        dp[i][0] = i  # 删除所有字符
    for j in range(n + 1):
        dp[0][j] = j  # 插入所有字符
    
    # 填充DP表
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if word1[i - 1] == word2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]  # 不需要操作
            else:
                dp[i][j] = 1 + min(
                    dp[i - 1][j],      # 删除
                    dp[i][j - 1],      # 插入
                    dp[i - 1][j - 1]   # 替换
                )
    
    return dp[m][n]

def edit_distance_with_operations(word1, word2):
    """
    计算编辑距离并返回具体操作序列
    """
    m, n = len(word1), len(word2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    
    # 初始化
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    
    # 填充DP表
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if word1[i - 1] == word2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(
                    dp[i - 1][j],
                    dp[i][j - 1],
                    dp[i - 1][j - 1]
                )
    
    # 回溯构造操作序列
    operations = []
    i, j = m, n
    
    while i > 0 or j > 0:
        if i > 0 and j > 0 and word1[i - 1] == word2[j - 1]:
            i -= 1
            j -= 1
        elif i > 0 and j > 0 and dp[i][j] == dp[i - 1][j - 1] + 1:
            operations.append(f"替换 '{word1[i - 1]}' -> '{word2[j - 1]}' 在位置 {i - 1}")
            i -= 1
            j -= 1
        elif i > 0 and dp[i][j] == dp[i - 1][j] + 1:
            operations.append(f"删除 '{word1[i - 1]}' 在位置 {i - 1}")
            i -= 1
        elif j > 0 and dp[i][j] == dp[i][j - 1] + 1:
            operations.append(f"插入 '{word2[j - 1]}' 在位置 {i}")
            j -= 1
    
    return dp[m][n], list(reversed(operations))

def edit_distance_space_optimized(word1, word2):
    """
    空间优化的编辑距离
    空间复杂度: O(min(m, n))
    """
    if len(word1) < len(word2):
        word1, word2 = word2, word1
    
    m, n = len(word1), len(word2)
    prev = list(range(n + 1))
    curr = [0] * (n + 1)
    
    for i in range(1, m + 1):
        curr[0] = i
        for j in range(1, n + 1):
            if word1[i - 1] == word2[j - 1]:
                curr[j] = prev[j - 1]
            else:
                curr[j] = 1 + min(prev[j], curr[j - 1], prev[j - 1])
        prev, curr = curr, prev
    
    return prev[n]

def weighted_edit_distance(word1, word2, insert_cost=1, delete_cost=1, replace_cost=1):
    """
    带权重的编辑距离
    """
    m, n = len(word1), len(word2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    
    # 初始化
    for i in range(m + 1):
        dp[i][0] = i * delete_cost
    for j in range(n + 1):
        dp[0][j] = j * insert_cost
    
    # 填充DP表
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if word1[i - 1] == word2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = min(
                    dp[i - 1][j] + delete_cost,
                    dp[i][j - 1] + insert_cost,
                    dp[i - 1][j - 1] + replace_cost
                )
    
    return dp[m][n]

# 示例
print("\n编辑距离示例:")
word1 = "kitten"
word2 = "sitting"
print(f"单词1: {word1}")
print(f"单词2: {word2}")
print(f"编辑距离: {edit_distance(word1, word2)}")

distance, operations = edit_distance_with_operations(word1, word2)
print(f"\n编辑距离: {distance}")
print("操作序列:")
for op in operations:
    print(f"  {op}")

print(f"\n空间优化编辑距离: {edit_distance_space_optimized(word1, word2)}")
print(f"带权重编辑距离: {weighted_edit_distance(word1, word2, 2, 2, 1)}")
```

## 回文算法

### 回文检测

#### 实现代码

```python
def is_palindrome_simple(s):
    """
    简单回文检测
    时间复杂度: O(n)
    空间复杂度: O(1)
    """
    left, right = 0, len(s) - 1
    
    while left < right:
        if s[left] != s[right]:
            return False
        left += 1
        right -= 1
    
    return True

def is_palindrome_ignore_case_space(s):
    """
    忽略大小写和空格的回文检测
    """
    # 预处理：只保留字母和数字，转换为小写
    cleaned = ''.join(char.lower() for char in s if char.isalnum())
    return is_palindrome_simple(cleaned)

def longest_palindromic_substring_expand(s):
    """
    最长回文子串 - 中心扩展法
    时间复杂度: O(n^2)
    空间复杂度: O(1)
    """
    if not s:
        return ""
    
    start = 0
    max_len = 1
    
    def expand_around_center(left, right):
        while left >= 0 and right < len(s) and s[left] == s[right]:
            left -= 1
            right += 1
        return right - left - 1
    
    for i in range(len(s)):
        # 奇数长度回文
        len1 = expand_around_center(i, i)
        # 偶数长度回文
        len2 = expand_around_center(i, i + 1)
        
        current_max = max(len1, len2)
        if current_max > max_len:
            max_len = current_max
            start = i - (current_max - 1) // 2
    
    return s[start:start + max_len]

def longest_palindromic_substring_dp(s):
    """
    最长回文子串 - 动态规划
    时间复杂度: O(n^2)
    空间复杂度: O(n^2)
    """
    n = len(s)
    if n == 0:
        return ""
    
    dp = [[False] * n for _ in range(n)]
    start = 0
    max_len = 1
    
    # 单个字符都是回文
    for i in range(n):
        dp[i][i] = True
    
    # 检查长度为2的子串
    for i in range(n - 1):
        if s[i] == s[i + 1]:
            dp[i][i + 1] = True
            start = i
            max_len = 2
    
    # 检查长度大于2的子串
    for length in range(3, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            if s[i] == s[j] and dp[i + 1][j - 1]:
                dp[i][j] = True
                start = i
                max_len = length
    
    return s[start:start + max_len]

def manacher_algorithm(s):
    """
    Manacher算法 - 线性时间找最长回文子串
    时间复杂度: O(n)
    空间复杂度: O(n)
    """
    # 预处理：在每个字符间插入特殊字符
    processed = '#'.join('^{}$'.format(s))
    n = len(processed)
    
    # P[i] 表示以i为中心的回文半径
    P = [0] * n
    center = right = 0  # 当前回文的中心和右边界
    
    for i in range(1, n - 1):
        # 利用回文的对称性
        mirror = 2 * center - i
        
        if i < right:
            P[i] = min(right - i, P[mirror])
        
        # 尝试扩展回文
        try:
            while processed[i + P[i] + 1] == processed[i - P[i] - 1]:
                P[i] += 1
        except IndexError:
            pass
        
        # 如果回文扩展超过了右边界，更新中心和右边界
        if i + P[i] > right:
            center, right = i, i + P[i]
    
    # 找到最长回文
    max_len = max(P)
    center_index = P.index(max_len)
    
    # 转换回原字符串的索引
    start = (center_index - max_len) // 2
    return s[start:start + max_len]

def palindromic_substrings_count(s):
    """
    计算回文子串的数量
    """
    count = 0
    
    def expand_around_center(left, right):
        nonlocal count
        while left >= 0 and right < len(s) and s[left] == s[right]:
            count += 1
            left -= 1
            right += 1
    
    for i in range(len(s)):
        # 奇数长度回文
        expand_around_center(i, i)
        # 偶数长度回文
        expand_around_center(i, i + 1)
    
    return count

# 示例
print("\n回文算法示例:")
test_strings = [
    "racecar",
    "A man a plan a canal Panama",
    "race a car",
    "babad",
    "cbbd"
]

for s in test_strings:
    print(f"\n字符串: '{s}'")
    print(f"是否为回文: {is_palindrome_simple(s)}")
    print(f"忽略大小写和空格是否为回文: {is_palindrome_ignore_case_space(s)}")
    print(f"最长回文子串(中心扩展): '{longest_palindromic_substring_expand(s)}'")
    print(f"最长回文子串(DP): '{longest_palindromic_substring_dp(s)}'")
    print(f"最长回文子串(Manacher): '{manacher_algorithm(s)}'")
    print(f"回文子串数量: {palindromic_substrings_count(s)}")
```

## 字符串匹配的高级应用

### 正则表达式匹配

#### 实现代码

```python
def is_match_recursive(s, p):
    """
    正则表达式匹配 - 递归实现
    支持 '.' 和 '*'
    """
    if not p:
        return not s
    
    first_match = bool(s) and (p[0] == s[0] or p[0] == '.')
    
    if len(p) >= 2 and p[1] == '*':
        return (is_match_recursive(s, p[2:]) or  # 匹配0次
                (first_match and is_match_recursive(s[1:], p)))  # 匹配1次或多次
    else:
        return first_match and is_match_recursive(s[1:], p[1:])

def is_match_dp(s, p):
    """
    正则表达式匹配 - 动态规划实现
    """
    m, n = len(s), len(p)
    dp = [[False] * (n + 1) for _ in range(m + 1)]
    
    # 空字符串匹配空模式
    dp[0][0] = True
    
    # 处理模式中的 '*' 可以匹配空字符串的情况
    for j in range(2, n + 1):
        if p[j - 1] == '*':
            dp[0][j] = dp[0][j - 2]
    
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if p[j - 1] == '*':
                # '*' 匹配0次
                dp[i][j] = dp[i][j - 2]
                # '*' 匹配1次或多次
                if p[j - 2] == s[i - 1] or p[j - 2] == '.':
                    dp[i][j] = dp[i][j] or dp[i - 1][j]
            elif p[j - 1] == '.' or p[j - 1] == s[i - 1]:
                dp[i][j] = dp[i - 1][j - 1]
    
    return dp[m][n]

def wildcard_matching(s, p):
    """
    通配符匹配
    支持 '?' 和 '*'
    '?' 匹配任意单个字符
    '*' 匹配任意字符序列（包括空序列）
    """
    m, n = len(s), len(p)
    dp = [[False] * (n + 1) for _ in range(m + 1)]
    
    dp[0][0] = True
    
    # 处理模式开头的 '*'
    for j in range(1, n + 1):
        if p[j - 1] == '*':
            dp[0][j] = dp[0][j - 1]
    
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if p[j - 1] == '*':
                dp[i][j] = dp[i - 1][j] or dp[i][j - 1]
            elif p[j - 1] == '?' or p[j - 1] == s[i - 1]:
                dp[i][j] = dp[i - 1][j - 1]
    
    return dp[m][n]

# 示例
print("\n正则表达式和通配符匹配示例:")
test_cases = [
    ("aa", "a"),
    ("aa", "a*"),
    ("ab", ".*"),
    ("aab", "c*a*b"),
    ("mississippi", "mis*is*p*."),
]

for s, p in test_cases:
    print(f"\n字符串: '{s}', 模式: '{p}'")
    print(f"正则匹配(递归): {is_match_recursive(s, p)}")
    print(f"正则匹配(DP): {is_match_dp(s, p)}")
    print(f"通配符匹配: {wildcard_matching(s, p)}")
```

### 字符串哈希和滚动哈希

#### 实现代码

```python
class RollingHash:
    """
    滚动哈希类
    """
    
    def __init__(self, s, base=256, mod=10**9 + 7):
        self.s = s
        self.base = base
        self.mod = mod
        self.n = len(s)
        
        # 预计算哈希值和幂次
        self.hash_values = [0] * (self.n + 1)
        self.powers = [1] * (self.n + 1)
        
        for i in range(self.n):
            self.hash_values[i + 1] = (self.hash_values[i] * base + ord(s[i])) % mod
            self.powers[i + 1] = (self.powers[i] * base) % mod
    
    def get_hash(self, left, right):
        """
        获取子串 s[left:right+1] 的哈希值
        """
        result = (self.hash_values[right + 1] - 
                 self.hash_values[left] * self.powers[right - left + 1]) % self.mod
        return result if result >= 0 else result + self.mod
    
    def find_all_occurrences(self, pattern):
        """
        使用滚动哈希找到所有匹配位置
        """
        if len(pattern) > self.n:
            return []
        
        pattern_hash = 0
        for char in pattern:
            pattern_hash = (pattern_hash * self.base + ord(char)) % self.mod
        
        positions = []
        pattern_len = len(pattern)
        
        for i in range(self.n - pattern_len + 1):
            if self.get_hash(i, i + pattern_len - 1) == pattern_hash:
                # 哈希值相等，进行字符串比较确认
                if self.s[i:i + pattern_len] == pattern:
                    positions.append(i)
        
        return positions

def longest_duplicate_substring(s):
    """
    找到最长重复子串
    使用二分搜索 + 滚动哈希
    """
    n = len(s)
    
    def has_duplicate_of_length(length):
        """检查是否存在长度为length的重复子串"""
        if length == 0:
            return True
        
        base = 256
        mod = 10**9 + 7
        
        # 计算第一个子串的哈希值
        hash_value = 0
        power = 1
        for i in range(length):
            hash_value = (hash_value * base + ord(s[i])) % mod
            if i < length - 1:
                power = (power * base) % mod
        
        seen = {hash_value}
        
        # 滚动哈希
        for i in range(length, n):
            hash_value = (hash_value - ord(s[i - length]) * power) % mod
            hash_value = (hash_value * base + ord(s[i])) % mod
            
            if hash_value in seen:
                return True
            seen.add(hash_value)
        
        return False
    
    # 二分搜索最长长度
    left, right = 0, n - 1
    result_length = 0
    
    while left <= right:
        mid = (left + right) // 2
        if has_duplicate_of_length(mid):
            result_length = mid
            left = mid + 1
        else:
            right = mid - 1
    
    # 找到具体的重复子串
    if result_length == 0:
        return ""
    
    rh = RollingHash(s)
    seen = {}
    
    for i in range(n - result_length + 1):
        hash_val = rh.get_hash(i, i + result_length - 1)
        if hash_val in seen:
            return s[i:i + result_length]
        seen[hash_val] = i
    
    return ""

def repeated_string_pattern(s):
    """
    检查字符串是否由重复的子串构成
    """
    n = len(s)
    
    for length in range(1, n // 2 + 1):
        if n % length == 0:
            pattern = s[:length]
            if pattern * (n // length) == s:
                return True, pattern
    
    return False, ""

# 示例
print("\n字符串哈希和滚动哈希示例:")
text = "abcabcabcabc"
pattern = "abc"

rh = RollingHash(text)
positions = rh.find_all_occurrences(pattern)
print(f"文本: {text}")
print(f"模式: {pattern}")
print(f"匹配位置: {positions}")

# 最长重复子串
test_string = "banana"
longest_dup = longest_duplicate_substring(test_string)
print(f"\n字符串 '{test_string}' 的最长重复子串: '{longest_dup}'")

# 重复模式检测
test_patterns = ["abcabcabcabc", "ababab", "abcdef"]
for s in test_patterns:
    is_repeated, pattern = repeated_string_pattern(s)
    print(f"字符串 '{s}' 是否由重复模式构成: {is_repeated}")
    if is_repeated:
        print(f"  重复模式: '{pattern}'")
```

## 字符串算法的应用

### 文本处理应用

```python
class TextProcessor:
    """
    文本处理工具类
    """
    
    @staticmethod
    def word_frequency(text):
        """
        统计单词频率
        """
        import re
        words = re.findall(r'\b\w+\b', text.lower())
        frequency = {}
        for word in words:
            frequency[word] = frequency.get(word, 0) + 1
        return frequency
    
    @staticmethod
    def find_anagrams(words):
        """
        找到所有变位词组
        """
        anagram_groups = {}
        for word in words:
            key = ''.join(sorted(word.lower()))
            if key not in anagram_groups:
                anagram_groups[key] = []
            anagram_groups[key].append(word)
        
        return [group for group in anagram_groups.values() if len(group) > 1]
    
    @staticmethod
    def text_similarity(text1, text2):
        """
        计算文本相似度（基于编辑距离）
        """
        max_len = max(len(text1), len(text2))
        if max_len == 0:
            return 1.0
        
        edit_dist = edit_distance(text1, text2)
        return 1.0 - edit_dist / max_len
    
    @staticmethod
    def extract_urls(text):
        """
        提取文本中的URL
        """
        import re
        url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        return re.findall(url_pattern, text)
    
    @staticmethod
    def extract_emails(text):
        """
        提取文本中的邮箱地址
        """
        import re
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        return re.findall(email_pattern, text)
    
    @staticmethod
    def remove_duplicates_preserve_order(text_list):
        """
        去除重复文本，保持顺序
        """
        seen = set()
        result = []
        for text in text_list:
            if text not in seen:
                seen.add(text)
                result.append(text)
        return result

class StringCompression:
    """
    字符串压缩算法
    """
    
    @staticmethod
    def run_length_encoding(s):
        """
        行程长度编码
        """
        if not s:
            return ""
        
        compressed = []
        current_char = s[0]
        count = 1
        
        for i in range(1, len(s)):
            if s[i] == current_char:
                count += 1
            else:
                compressed.append(f"{current_char}{count}")
                current_char = s[i]
                count = 1
        
        compressed.append(f"{current_char}{count}")
        result = ''.join(compressed)
        
        # 如果压缩后更长，返回原字符串
        return result if len(result) < len(s) else s
    
    @staticmethod
    def run_length_decoding(s):
        """
        行程长度解码
        """
        result = []
        i = 0
        
        while i < len(s):
            char = s[i]
            i += 1
            count_str = ""
            
            while i < len(s) and s[i].isdigit():
                count_str += s[i]
                i += 1
            
            count = int(count_str) if count_str else 1
            result.append(char * count)
        
        return ''.join(result)
    
    @staticmethod
    def lz77_compress(s, window_size=20, lookahead_size=15):
        """
        简化的LZ77压缩算法
        """
        compressed = []
        i = 0
        
        while i < len(s):
            match_length = 0
            match_distance = 0
            
            # 在搜索窗口中查找最长匹配
            start = max(0, i - window_size)
            for j in range(start, i):
                length = 0
                while (i + length < len(s) and 
                       j + length < i and 
                       length < lookahead_size and 
                       s[i + length] == s[j + length]):
                    length += 1
                
                if length > match_length:
                    match_length = length
                    match_distance = i - j
            
            if match_length > 0:
                compressed.append((match_distance, match_length, s[i + match_length] if i + match_length < len(s) else ''))
                i += match_length + 1
            else:
                compressed.append((0, 0, s[i]))
                i += 1
        
        return compressed

# 示例
print("\n文本处理应用示例:")
processor = TextProcessor()

# 单词频率统计
text = "Hello world! This is a hello world example. Hello again!"
freq = processor.word_frequency(text)
print(f"文本: {text}")
print(f"单词频率: {dict(sorted(freq.items(), key=lambda x: x[1], reverse=True))}")

# 变位词检测
words = ["listen", "silent", "hello", "world", "enlist"]
anagrams = processor.find_anagrams(words)
print(f"\n单词列表: {words}")
print(f"变位词组: {anagrams}")

# 文本相似度
text1 = "hello world"
text2 = "hello word"
similarity = processor.text_similarity(text1, text2)
print(f"\n文本1: '{text1}'")
print(f"文本2: '{text2}'")
print(f"相似度: {similarity:.3f}")

# 字符串压缩
compressor = StringCompression()
original = "aaabbccccdddd"
compressed = compressor.run_length_encoding(original)
decompressed = compressor.run_length_decoding(compressed)
print(f"\n原字符串: {original}")
print(f"压缩后: {compressed}")
print(f"解压后: {decompressed}")
print(f"压缩比: {len(compressed)/len(original):.2f}")

## 字符串算法复杂度对比

### 搜索算法复杂度

```python
def algorithm_complexity_comparison():
    """
    字符串搜索算法复杂度对比
    """
    algorithms = {
        "朴素搜索": {
            "时间复杂度": "O(nm)",
            "空间复杂度": "O(1)",
            "预处理时间": "O(1)",
            "适用场景": "短模式串，简单实现"
        },
        "KMP算法": {
            "时间复杂度": "O(n + m)",
            "空间复杂度": "O(m)",
            "预处理时间": "O(m)",
            "适用场景": "长文本搜索，避免回溯"
        },
        "Boyer-Moore": {
            "时间复杂度": "O(nm) 最坏，O(n/m) 平均",
            "空间复杂度": "O(σ + m)",  # σ是字符集大小
            "预处理时间": "O(m + σ)",
            "适用场景": "大字符集，长模式串"
        },
        "Rabin-Karp": {
            "时间复杂度": "O(nm) 最坏，O(n + m) 平均",
            "空间复杂度": "O(1)",
            "预处理时间": "O(m)",
            "适用场景": "多模式搜索，滚动哈希"
        }
    }
    
    print("字符串搜索算法复杂度对比:")
    print(f"{'算法':<15} {'时间复杂度':<25} {'空间复杂度':<15} {'预处理时间':<15}")
    print("-" * 80)
    
    for name, info in algorithms.items():
        print(f"{name:<15} {info['时间复杂度']:<25} {info['空间复杂度']:<15} {info['预处理时间']:<15}")
        print(f"{'适用场景:':<15} {info['适用场景']}")
        print()

algorithm_complexity_comparison()
```

### 字符串处理算法复杂度

```python
def string_processing_complexity():
    """
    字符串处理算法复杂度分析
    """
    processing_algorithms = {
        "最长公共子序列": {
            "时间复杂度": "O(mn)",
            "空间复杂度": "O(mn) 或 O(min(m,n))",
            "说明": "动态规划，可空间优化"
        },
        "最长公共子串": {
            "时间复杂度": "O(mn)",
            "空间复杂度": "O(mn) 或 O(min(m,n))",
            "说明": "动态规划，可空间优化"
        },
        "编辑距离": {
            "时间复杂度": "O(mn)",
            "空间复杂度": "O(mn) 或 O(min(m,n))",
            "说明": "动态规划，支持插入删除替换"
        },
        "最长回文子串(中心扩展)": {
            "时间复杂度": "O(n²)",
            "空间复杂度": "O(1)",
            "说明": "简单实现，空间效率高"
        },
        "最长回文子串(Manacher)": {
            "时间复杂度": "O(n)",
            "空间复杂度": "O(n)",
            "说明": "线性时间，最优算法"
        },
        "字符串哈希": {
            "时间复杂度": "O(n)",
            "空间复杂度": "O(n)",
            "说明": "预处理后O(1)查询子串哈希"
        }
    }
    
    print("\n字符串处理算法复杂度分析:")
    for name, info in processing_algorithms.items():
        print(f"\n{name}:")
        print(f"  时间复杂度: {info['时间复杂度']}")
        print(f"  空间复杂度: {info['空间复杂度']}")
        print(f"  说明: {info['说明']}")

string_processing_complexity()
```

## 字符串算法选择指南

### 搜索算法选择

```python
def search_algorithm_selection_guide():
    """
    字符串搜索算法选择指南
    """
    scenarios = {
        "单次搜索，短模式串": {
            "推荐算法": "朴素搜索",
            "原因": "实现简单，预处理开销小"
        },
        "多次搜索，相同模式串": {
            "推荐算法": "KMP算法",
            "原因": "预处理一次，多次使用，线性时间"
        },
        "大字符集，长模式串": {
            "推荐算法": "Boyer-Moore",
            "原因": "跳跃式搜索，平均性能优秀"
        },
        "多模式搜索": {
            "推荐算法": "Rabin-Karp 或 Aho-Corasick",
            "原因": "支持同时搜索多个模式"
        },
        "近似匹配": {
            "推荐算法": "编辑距离 + 动态规划",
            "原因": "支持模糊匹配和相似度计算"
        },
        "实时搜索": {
            "推荐算法": "滚动哈希 + Rabin-Karp",
            "原因": "支持增量更新，适合流式数据"
        }
    }
    
    print("\n字符串搜索算法选择指南:")
    for scenario, recommendation in scenarios.items():
        print(f"\n场景: {scenario}")
        print(f"  推荐算法: {recommendation['推荐算法']}")
        print(f"  选择原因: {recommendation['原因']}")

search_algorithm_selection_guide()
```

### 性能优化建议

```python
def performance_optimization_tips():
    """
    字符串算法性能优化建议
    """
    tips = [
        {
            "类别": "预处理优化",
            "建议": [
                "对于重复搜索，预计算模式串的辅助信息",
                "使用适当的数据结构存储预处理结果",
                "考虑缓存常用模式的预处理结果"
            ]
        },
        {
            "类别": "内存优化",
            "建议": [
                "使用滚动数组减少空间复杂度",
                "对于大文本，考虑分块处理",
                "及时释放不需要的中间结果"
            ]
        },
        {
            "类别": "算法选择",
            "建议": [
                "根据数据特征选择合适的算法",
                "考虑平均情况而非最坏情况",
                "结合多种算法的优势"
            ]
        },
        {
            "类别": "实现优化",
            "建议": [
                "使用位运算加速某些操作",
                "避免不必要的字符串复制",
                "利用编程语言的内置优化"
            ]
        },
        {
            "类别": "并行化",
            "建议": [
                "对于大文本，考虑并行搜索",
                "使用多线程处理独立的搜索任务",
                "利用SIMD指令加速字符比较"
            ]
        }
    ]
    
    print("\n字符串算法性能优化建议:")
    for tip in tips:
        print(f"\n{tip['类别']}:")
        for suggestion in tip['建议']:
            print(f"  • {suggestion}")

performance_optimization_tips()
```

## 实际应用案例

### 搜索引擎中的应用

```python
class SearchEngine:
    """
    简化的搜索引擎实现
    """
    
    def __init__(self):
        self.documents = []
        self.inverted_index = {}
    
    def add_document(self, doc_id, content):
        """添加文档到索引"""
        self.documents.append((doc_id, content))
        words = content.lower().split()
        
        for word in words:
            if word not in self.inverted_index:
                self.inverted_index[word] = set()
            self.inverted_index[word].add(doc_id)
    
    def search(self, query):
        """搜索查询"""
        query_words = query.lower().split()
        if not query_words:
            return []
        
        # 获取包含所有查询词的文档
        result_docs = self.inverted_index.get(query_words[0], set())
        for word in query_words[1:]:
            result_docs = result_docs.intersection(
                self.inverted_index.get(word, set())
            )
        
        return list(result_docs)
    
    def fuzzy_search(self, query, max_distance=2):
        """模糊搜索"""
        results = []
        query_lower = query.lower()
        
        for word in self.inverted_index:
            if edit_distance(query_lower, word) <= max_distance:
                results.extend(self.inverted_index[word])
        
        return list(set(results))

# 示例
print("\n搜索引擎应用示例:")
search_engine = SearchEngine()

# 添加文档
documents = [
    (1, "Python is a powerful programming language"),
    (2, "Java is also a popular programming language"),
    (3, "Machine learning with Python is exciting"),
    (4, "Web development using Python and Django")
]

for doc_id, content in documents:
    search_engine.add_document(doc_id, content)

# 精确搜索
results = search_engine.search("Python programming")
print(f"搜索 'Python programming': {results}")

# 模糊搜索
fuzzy_results = search_engine.fuzzy_search("Pythom", max_distance=1)
print(f"模糊搜索 'Pythom': {fuzzy_results}")
```

### 生物信息学中的应用

```python
class DNASequenceAnalyzer:
    """
    DNA序列分析器
    """
    
    def __init__(self):
        self.complement = {'A': 'T', 'T': 'A', 'G': 'C', 'C': 'G'}
    
    def find_motifs(self, sequence, motif):
        """在DNA序列中查找特定模式"""
        return kmp_search(sequence, motif)
    
    def reverse_complement(self, sequence):
        """计算反向互补序列"""
        return ''.join(self.complement.get(base, base) for base in reversed(sequence))
    
    def find_palindromes(self, sequence, min_length=4):
        """查找回文序列（可能的发夹结构）"""
        palindromes = []
        
        for i in range(len(sequence)):
            # 奇数长度回文
            left, right = i, i
            while (left >= 0 and right < len(sequence) and 
                   sequence[left] == self.complement.get(sequence[right], '')):
                if right - left + 1 >= min_length:
                    palindromes.append((left, right, sequence[left:right+1]))
                left -= 1
                right += 1
            
            # 偶数长度回文
            left, right = i, i + 1
            while (left >= 0 and right < len(sequence) and 
                   sequence[left] == self.complement.get(sequence[right], '')):
                if right - left + 1 >= min_length:
                    palindromes.append((left, right, sequence[left:right+1]))
                left -= 1
                right += 1
        
        return palindromes
    
    def sequence_alignment_score(self, seq1, seq2, match=2, mismatch=-1, gap=-1):
        """简单的序列比对评分"""
        m, n = len(seq1), len(seq2)
        dp = [[0] * (n + 1) for _ in range(m + 1)]
        
        # 初始化
        for i in range(m + 1):
            dp[i][0] = i * gap
        for j in range(n + 1):
            dp[0][j] = j * gap
        
        # 填充DP表
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if seq1[i-1] == seq2[j-1]:
                    score = match
                else:
                    score = mismatch
                
                dp[i][j] = max(
                    dp[i-1][j-1] + score,  # 匹配/不匹配
                    dp[i-1][j] + gap,      # 删除
                    dp[i][j-1] + gap       # 插入
                )
        
        return dp[m][n]

# 示例
print("\n生物信息学应用示例:")
analyzer = DNASequenceAnalyzer()

sequence = "ATCGATCGATCG"
motif = "ATCG"

positions = analyzer.find_motifs(sequence, motif)
print(f"DNA序列: {sequence}")
print(f"查找模式: {motif}")
print(f"找到位置: {positions}")

rev_comp = analyzer.reverse_complement(sequence)
print(f"反向互补序列: {rev_comp}")

palindromes = analyzer.find_palindromes("ATCGATCGATCG")
print(f"回文序列: {palindromes}")
```

## 总结

字符串算法是计算机科学的重要组成部分，具有广泛的应用价值：

### 核心算法总结

1. **搜索算法**
   - **朴素搜索**：简单直观，适合短模式
   - **KMP算法**：线性时间，避免不必要的回溯
   - **Boyer-Moore**：跳跃式搜索，大字符集下性能优秀
   - **Rabin-Karp**：基于哈希，支持多模式搜索

2. **字符串处理**
   - **最长公共子序列/子串**：序列比较的基础
   - **编辑距离**：衡量字符串相似度
   - **回文算法**：检测和查找回文结构

3. **高级技术**
   - **滚动哈希**：支持增量更新的哈希技术
   - **字符串压缩**：减少存储空间
   - **正则表达式**：强大的模式匹配工具

### 应用领域

- **文本处理**：搜索引擎、文档处理、自然语言处理
- **生物信息学**：DNA序列分析、蛋白质结构预测
- **数据压缩**：文件压缩、数据传输优化
- **网络安全**：入侵检测、恶意代码识别
- **编译器设计**：词法分析、语法解析

### 性能考虑

- **时间复杂度**：根据数据规模选择合适算法
- **空间复杂度**：考虑内存限制和优化需求
- **预处理成本**：权衡预处理时间和查询效率
- **实际性能**：考虑缓存、分支预测等因素

### 发展趋势

- **并行化**：利用多核处理器加速计算
- **近似算法**：在精度和效率间找到平衡
- **机器学习结合**：智能化的字符串处理
- **硬件加速**：GPU、FPGA等专用硬件支持

字符串算法的掌握对于程序员来说至关重要，它不仅是算法基础的重要组成部分，也是解决实际问题的有力工具。通过深入理解这些算法的原理和应用，可以更好地设计和优化字符串处理相关的系统和应用。