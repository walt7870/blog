# 数学算法

数学算法是计算机科学中的重要组成部分，涉及数论、组合数学、概率统计等多个数学分支。这些算法在密码学、图形学、机器学习等领域有着广泛的应用。

## 数论算法

### 最大公约数与最小公倍数

#### 欧几里得算法（辗转相除法）

```python
def gcd(a, b):
    """
    计算两个数的最大公约数
    时间复杂度: O(log(min(a, b)))
    """
    while b:
        a, b = b, a % b
    return a

def extended_gcd(a, b):
    """
    扩展欧几里得算法
    返回 (gcd, x, y) 使得 ax + by = gcd(a, b)
    """
    if b == 0:
        return a, 1, 0
    
    gcd_val, x1, y1 = extended_gcd(b, a % b)
    x = y1
    y = x1 - (a // b) * y1
    
    return gcd_val, x, y

def lcm(a, b):
    """
    计算两个数的最小公倍数
    """
    return abs(a * b) // gcd(a, b)

# 示例
print("最大公约数和最小公倍数:")
a, b = 48, 18
print(f"gcd({a}, {b}) = {gcd(a, b)}")
print(f"lcm({a}, {b}) = {lcm(a, b)}")

gcd_val, x, y = extended_gcd(a, b)
print(f"扩展欧几里得: {a} * {x} + {b} * {y} = {gcd_val}")
```

### 素数相关算法

#### 素数判断

```python
import math
import random

def is_prime_trial(n):
    """
    试除法判断素数
    时间复杂度: O(√n)
    """
    if n < 2:
        return False
    if n == 2:
        return True
    if n % 2 == 0:
        return False
    
    for i in range(3, int(math.sqrt(n)) + 1, 2):
        if n % i == 0:
            return False
    return True

def miller_rabin(n, k=5):
    """
    Miller-Rabin素数测试
    概率性算法，k次测试后错误概率为 1/4^k
    时间复杂度: O(k * log³n)
    """
    if n < 2:
        return False
    if n == 2 or n == 3:
        return True
    if n % 2 == 0:
        return False
    
    # 将 n-1 写成 d * 2^r 的形式
    r = 0
    d = n - 1
    while d % 2 == 0:
        r += 1
        d //= 2
    
    # 进行k次测试
    for _ in range(k):
        a = random.randrange(2, n - 1)
        x = pow(a, d, n)
        
        if x == 1 or x == n - 1:
            continue
        
        for _ in range(r - 1):
            x = pow(x, 2, n)
            if x == n - 1:
                break
        else:
            return False
    
    return True

# 示例
print("\n素数判断:")
test_numbers = [17, 25, 97, 100, 997]
for num in test_numbers:
    trial_result = is_prime_trial(num)
    miller_result = miller_rabin(num)
    print(f"{num}: 试除法={trial_result}, Miller-Rabin={miller_result}")
```

#### 埃拉托斯特尼筛法

```python
def sieve_of_eratosthenes(n):
    """
    埃拉托斯特尼筛法生成素数
    时间复杂度: O(n log log n)
    空间复杂度: O(n)
    """
    if n < 2:
        return []
    
    is_prime = [True] * (n + 1)
    is_prime[0] = is_prime[1] = False
    
    for i in range(2, int(math.sqrt(n)) + 1):
        if is_prime[i]:
            for j in range(i * i, n + 1, i):
                is_prime[j] = False
    
    return [i for i in range(2, n + 1) if is_prime[i]]

def segmented_sieve(low, high):
    """
    分段筛法，适用于大范围素数生成
    """
    limit = int(math.sqrt(high)) + 1
    primes = sieve_of_eratosthenes(limit)
    
    size = high - low + 1
    is_prime = [True] * size
    
    for prime in primes:
        # 找到第一个大于等于low且能被prime整除的数
        start = max(prime * prime, (low + prime - 1) // prime * prime)
        
        for j in range(start, high + 1, prime):
            is_prime[j - low] = False
    
    result = []
    for i in range(size):
        if is_prime[i] and low + i > 1:
            result.append(low + i)
    
    return result

# 示例
print("\n素数生成:")
primes_100 = sieve_of_eratosthenes(100)
print(f"100以内的素数: {primes_100}")
print(f"素数个数: {len(primes_100)}")

segment_primes = segmented_sieve(100, 200)
print(f"100-200之间的素数: {segment_primes}")
```

### 模运算

#### 快速幂算法

```python
def fast_power(base, exp, mod=None):
    """
    快速幂算法
    计算 base^exp % mod
    时间复杂度: O(log exp)
    """
    result = 1
    base = base % mod if mod else base
    
    while exp > 0:
        if exp % 2 == 1:
            result = (result * base) % mod if mod else result * base
        exp = exp >> 1
        base = (base * base) % mod if mod else base * base
    
    return result

def modular_inverse(a, m):
    """
    计算模逆元
    使用扩展欧几里得算法
    """
    def extended_gcd(a, b):
        if a == 0:
            return b, 0, 1
        gcd, x1, y1 = extended_gcd(b % a, a)
        x = y1 - (b // a) * x1
        y = x1
        return gcd, x, y
    
    gcd, x, _ = extended_gcd(a % m, m)
    if gcd != 1:
        return None  # 模逆元不存在
    return (x % m + m) % m

# 示例
print("\n模运算:")
base, exp, mod = 2, 10, 1000
result = fast_power(base, exp, mod)
print(f"{base}^{exp} mod {mod} = {result}")

a, m = 3, 11
inverse = modular_inverse(a, m)
print(f"{a}的模{m}逆元: {inverse}")
if inverse:
    print(f"验证: {a} * {inverse} mod {m} = {(a * inverse) % m}")
```

## 组合数学算法

### 排列组合

```python
def factorial(n):
    """
    计算阶乘
    """
    if n <= 1:
        return 1
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result

def permutation(n, r):
    """
    计算排列数 P(n, r) = n! / (n-r)!
    """
    if r > n or r < 0:
        return 0
    result = 1
    for i in range(n, n - r, -1):
        result *= i
    return result

def combination(n, r):
    """
    计算组合数 C(n, r) = n! / (r! * (n-r)!)
    """
    if r > n or r < 0:
        return 0
    if r == 0 or r == n:
        return 1
    
    # 优化：选择较小的r
    r = min(r, n - r)
    
    result = 1
    for i in range(r):
        result = result * (n - i) // (i + 1)
    
    return result

def pascal_triangle(n):
    """
    生成帕斯卡三角形的前n行
    """
    triangle = []
    for i in range(n):
        row = [1] * (i + 1)
        for j in range(1, i):
            row[j] = triangle[i-1][j-1] + triangle[i-1][j]
        triangle.append(row)
    return triangle

# 示例
print("\n排列组合:")
n, r = 10, 3
print(f"P({n}, {r}) = {permutation(n, r)}")
print(f"C({n}, {r}) = {combination(n, r)}")

print("\n帕斯卡三角形前6行:")
triangle = pascal_triangle(6)
for i, row in enumerate(triangle):
    print(f"第{i}行: {row}")
```

### 卡特兰数

```python
def catalan_number(n):
    """
    计算第n个卡特兰数
    C_n = (2n)! / ((n+1)! * n!)
    """
    if n <= 1:
        return 1
    
    # 使用递推公式: C_n = sum(C_i * C_{n-1-i}) for i in [0, n-1]
    catalan = [0] * (n + 1)
    catalan[0] = catalan[1] = 1
    
    for i in range(2, n + 1):
        for j in range(i):
            catalan[i] += catalan[j] * catalan[i - 1 - j]
    
    return catalan[n]

def catalan_applications():
    """
    卡特兰数的应用示例
    """
    print("\n卡特兰数应用:")
    
    # 括号匹配数
    n = 4
    print(f"{n}对括号的合法匹配数: {catalan_number(n)}")
    
    # 二叉搜索树数量
    print(f"{n}个节点的不同二叉搜索树数量: {catalan_number(n)}")
    
    # 凸多边形三角剖分数
    print(f"{n+2}边形的三角剖分数: {catalan_number(n)}")
    
    # 前n项卡特兰数
    print("前10个卡特兰数:")
    for i in range(10):
        print(f"C_{i} = {catalan_number(i)}")

catalan_applications()
```

## 概率与统计算法

### 随机数生成

```python
import random
import math

class RandomGenerator:
    """
    各种概率分布的随机数生成器
    """
    
    def __init__(self, seed=None):
        if seed is not None:
            random.seed(seed)
    
    def uniform(self, a=0, b=1):
        """均匀分布"""
        return random.uniform(a, b)
    
    def normal(self, mu=0, sigma=1):
        """正态分布（Box-Muller变换）"""
        return random.gauss(mu, sigma)
    
    def exponential(self, lambd=1):
        """指数分布"""
        return random.expovariate(lambd)
    
    def poisson(self, lambd):
        """泊松分布"""
        # Knuth算法
        L = math.exp(-lambd)
        k = 0
        p = 1
        
        while p > L:
            k += 1
            p *= random.random()
        
        return k - 1
    
    def geometric(self, p):
        """几何分布"""
        return int(math.log(random.random()) / math.log(1 - p)) + 1
    
    def binomial(self, n, p):
        """二项分布"""
        count = 0
        for _ in range(n):
            if random.random() < p:
                count += 1
        return count

# 示例
print("\n随机数生成:")
rng = RandomGenerator(seed=42)

print(f"均匀分布[0,1]: {[round(rng.uniform(), 3) for _ in range(5)]}")
print(f"正态分布N(0,1): {[round(rng.normal(), 3) for _ in range(5)]}")
print(f"指数分布λ=1: {[round(rng.exponential(), 3) for _ in range(5)]}")
print(f"泊松分布λ=3: {[rng.poisson(3) for _ in range(10)]}")
print(f"几何分布p=0.3: {[rng.geometric(0.3) for _ in range(10)]}")
print(f"二项分布B(10,0.5): {[rng.binomial(10, 0.5) for _ in range(10)]}")
```

### 蒙特卡罗方法

```python
import random
import math

def monte_carlo_pi(n):
    """
    使用蒙特卡罗方法估算π
    """
    inside_circle = 0
    
    for _ in range(n):
        x = random.uniform(-1, 1)
        y = random.uniform(-1, 1)
        if x*x + y*y <= 1:
            inside_circle += 1
    
    pi_estimate = 4 * inside_circle / n
    return pi_estimate

def monte_carlo_integration(func, a, b, n):
    """
    使用蒙特卡罗方法计算定积分
    """
    total = 0
    for _ in range(n):
        x = random.uniform(a, b)
        total += func(x)
    
    return (b - a) * total / n

def buffon_needle(n, needle_length=1, line_spacing=2):
    """
    布丰投针实验估算π
    """
    hits = 0
    
    for _ in range(n):
        # 针的中心到最近平行线的距离
        distance = random.uniform(0, line_spacing / 2)
        # 针与平行线的夹角
        angle = random.uniform(0, math.pi / 2)
        
        # 针的一端到最近平行线的距离
        end_distance = (needle_length / 2) * math.sin(angle)
        
        if end_distance >= distance:
            hits += 1
    
    # π的估算值
    if hits > 0:
        pi_estimate = (2 * needle_length * n) / (line_spacing * hits)
        return pi_estimate
    return 0

# 示例
print("\n蒙特卡罗方法:")

# 估算π
pi_estimate = monte_carlo_pi(100000)
print(f"蒙特卡罗估算π: {pi_estimate:.6f}")
print(f"实际π值: {math.pi:.6f}")
print(f"误差: {abs(pi_estimate - math.pi):.6f}")

# 数值积分
def f(x):
    return x * x  # 积分 x^2 从0到1，真实值为1/3

integral_estimate = monte_carlo_integration(f, 0, 1, 100000)
print(f"\n∫₀¹ x² dx 蒙特卡罗估算: {integral_estimate:.6f}")
print(f"真实值: {1/3:.6f}")
print(f"误差: {abs(integral_estimate - 1/3):.6f}")

# 布丰投针
buffon_pi = buffon_needle(100000)
print(f"\n布丰投针估算π: {buffon_pi:.6f}")
print(f"误差: {abs(buffon_pi - math.pi):.6f}")
```

## 数值计算算法

### 方程求解

```python
import math

def bisection_method(func, a, b, tolerance=1e-6, max_iterations=100):
    """
    二分法求方程的根
    """
    if func(a) * func(b) > 0:
        raise ValueError("函数在区间端点同号，无法使用二分法")
    
    for i in range(max_iterations):
        c = (a + b) / 2
        
        if abs(func(c)) < tolerance or abs(b - a) < tolerance:
            return c, i + 1
        
        if func(a) * func(c) < 0:
            b = c
        else:
            a = c
    
    return (a + b) / 2, max_iterations

def newton_method(func, derivative, x0, tolerance=1e-6, max_iterations=100):
    """
    牛顿法求方程的根
    """
    x = x0
    
    for i in range(max_iterations):
        fx = func(x)
        
        if abs(fx) < tolerance:
            return x, i + 1
        
        dfx = derivative(x)
        if abs(dfx) < 1e-12:
            raise ValueError("导数接近零，牛顿法可能不收敛")
        
        x_new = x - fx / dfx
        
        if abs(x_new - x) < tolerance:
            return x_new, i + 1
        
        x = x_new
    
    return x, max_iterations

def secant_method(func, x0, x1, tolerance=1e-6, max_iterations=100):
    """
    割线法求方程的根
    """
    for i in range(max_iterations):
        f0, f1 = func(x0), func(x1)
        
        if abs(f1) < tolerance:
            return x1, i + 1
        
        if abs(f1 - f0) < 1e-12:
            raise ValueError("函数值差接近零，割线法可能不收敛")
        
        x_new = x1 - f1 * (x1 - x0) / (f1 - f0)
        
        if abs(x_new - x1) < tolerance:
            return x_new, i + 1
        
        x0, x1 = x1, x_new
    
    return x1, max_iterations

# 示例
print("\n方程求解:")

# 求解 x^2 - 2 = 0 (即求√2)
def f(x):
    return x*x - 2

def df(x):
    return 2*x

print("求解 x² - 2 = 0:")

# 二分法
root_bisection, iter_bisection = bisection_method(f, 1, 2)
print(f"二分法: 根={root_bisection:.8f}, 迭代次数={iter_bisection}")

# 牛顿法
root_newton, iter_newton = newton_method(f, df, 1.5)
print(f"牛顿法: 根={root_newton:.8f}, 迭代次数={iter_newton}")

# 割线法
root_secant, iter_secant = secant_method(f, 1, 2)
print(f"割线法: 根={root_secant:.8f}, 迭代次数={iter_secant}")

print(f"真实值√2: {math.sqrt(2):.8f}")
```

### 数值积分

```python
def trapezoidal_rule(func, a, b, n):
    """
    梯形法则数值积分
    """
    h = (b - a) / n
    result = (func(a) + func(b)) / 2
    
    for i in range(1, n):
        x = a + i * h
        result += func(x)
    
    return result * h

def simpson_rule(func, a, b, n):
    """
    辛普森法则数值积分
    n必须是偶数
    """
    if n % 2 != 0:
        n += 1  # 确保n是偶数
    
    h = (b - a) / n
    result = func(a) + func(b)
    
    for i in range(1, n):
        x = a + i * h
        if i % 2 == 0:
            result += 2 * func(x)
        else:
            result += 4 * func(x)
    
    return result * h / 3

def adaptive_simpson(func, a, b, tolerance=1e-6):
    """
    自适应辛普森积分
    """
    def simpson_basic(f, x0, x2):
        x1 = (x0 + x2) / 2
        h = (x2 - x0) / 6
        return h * (f(x0) + 4*f(x1) + f(x2))
    
    def adaptive_simpson_recursive(f, x0, x2, tolerance, whole):
        x1 = (x0 + x2) / 2
        left = simpson_basic(f, x0, x1)
        right = simpson_basic(f, x1, x2)
        
        if abs(left + right - whole) <= 15 * tolerance:
            return left + right + (left + right - whole) / 15
        
        return (adaptive_simpson_recursive(f, x0, x1, tolerance/2, left) +
                adaptive_simpson_recursive(f, x1, x2, tolerance/2, right))
    
    whole = simpson_basic(func, a, b)
    return adaptive_simpson_recursive(func, a, b, tolerance, whole)

# 示例
print("\n数值积分:")

# 计算 ∫₀¹ e^x dx，真实值为 e - 1
def exp_func(x):
    return math.exp(x)

true_value = math.e - 1

print(f"计算 ∫₀¹ eˣ dx，真实值: {true_value:.8f}")

# 梯形法则
trap_result = trapezoidal_rule(exp_func, 0, 1, 1000)
print(f"梯形法则(n=1000): {trap_result:.8f}, 误差: {abs(trap_result - true_value):.2e}")

# 辛普森法则
simp_result = simpson_rule(exp_func, 0, 1, 1000)
print(f"辛普森法则(n=1000): {simp_result:.8f}, 误差: {abs(simp_result - true_value):.2e}")

# 自适应辛普森
adaptive_result = adaptive_simpson(exp_func, 0, 1)
print(f"自适应辛普森: {adaptive_result:.8f}, 误差: {abs(adaptive_result - true_value):.2e}")
```

## 线性代数算法

### 矩阵运算

```python
class Matrix:
    """
    简单的矩阵类
    """
    
    def __init__(self, data):
        self.data = data
        self.rows = len(data)
        self.cols = len(data[0]) if data else 0
    
    def __str__(self):
        return '\n'.join([' '.join([f'{x:8.4f}' for x in row]) for row in self.data])
    
    def __add__(self, other):
        if self.rows != other.rows or self.cols != other.cols:
            raise ValueError("矩阵维度不匹配")
        
        result = [[0] * self.cols for _ in range(self.rows)]
        for i in range(self.rows):
            for j in range(self.cols):
                result[i][j] = self.data[i][j] + other.data[i][j]
        
        return Matrix(result)
    
    def __mul__(self, other):
        if isinstance(other, (int, float)):
            # 标量乘法
            result = [[0] * self.cols for _ in range(self.rows)]
            for i in range(self.rows):
                for j in range(self.cols):
                    result[i][j] = self.data[i][j] * other
            return Matrix(result)
        
        elif isinstance(other, Matrix):
            # 矩阵乘法
            if self.cols != other.rows:
                raise ValueError("矩阵维度不匹配")
            
            result = [[0] * other.cols for _ in range(self.rows)]
            for i in range(self.rows):
                for j in range(other.cols):
                    for k in range(self.cols):
                        result[i][j] += self.data[i][k] * other.data[k][j]
            
            return Matrix(result)
    
    def transpose(self):
        """矩阵转置"""
        result = [[0] * self.rows for _ in range(self.cols)]
        for i in range(self.rows):
            for j in range(self.cols):
                result[j][i] = self.data[i][j]
        return Matrix(result)
    
    def determinant(self):
        """计算行列式（仅适用于方阵）"""
        if self.rows != self.cols:
            raise ValueError("只有方阵才能计算行列式")
        
        n = self.rows
        if n == 1:
            return self.data[0][0]
        if n == 2:
            return (self.data[0][0] * self.data[1][1] - 
                   self.data[0][1] * self.data[1][0])
        
        # 使用第一行展开
        det = 0
        for j in range(n):
            # 计算代数余子式
            minor = [[self.data[i][k] for k in range(n) if k != j] 
                    for i in range(1, n)]
            cofactor = ((-1) ** j) * Matrix(minor).determinant()
            det += self.data[0][j] * cofactor
        
        return det

def gaussian_elimination(matrix, vector):
    """
    高斯消元法解线性方程组 Ax = b
    """
    n = len(matrix)
    # 创建增广矩阵
    augmented = [row[:] + [vector[i]] for i, row in enumerate(matrix)]
    
    # 前向消元
    for i in range(n):
        # 选择主元
        max_row = i
        for k in range(i + 1, n):
            if abs(augmented[k][i]) > abs(augmented[max_row][i]):
                max_row = k
        
        # 交换行
        augmented[i], augmented[max_row] = augmented[max_row], augmented[i]
        
        # 消元
        for k in range(i + 1, n):
            if augmented[i][i] == 0:
                continue
            factor = augmented[k][i] / augmented[i][i]
            for j in range(i, n + 1):
                augmented[k][j] -= factor * augmented[i][j]
    
    # 回代
    solution = [0] * n
    for i in range(n - 1, -1, -1):
        solution[i] = augmented[i][n]
        for j in range(i + 1, n):
            solution[i] -= augmented[i][j] * solution[j]
        solution[i] /= augmented[i][i]
    
    return solution

# 示例
print("\n矩阵运算:")

# 矩阵基本运算
A = Matrix([[1, 2], [3, 4]])
B = Matrix([[5, 6], [7, 8]])

print("矩阵A:")
print(A)
print("\n矩阵B:")
print(B)

print("\nA + B:")
print(A + B)

print("\nA * B:")
print(A * B)

print("\nA的转置:")
print(A.transpose())

print(f"\nA的行列式: {A.determinant()}")

# 解线性方程组
print("\n解线性方程组:")
print("2x + y = 5")
print("x + 3y = 6")

coeff_matrix = [[2, 1], [1, 3]]
const_vector = [5, 6]

solution = gaussian_elimination(coeff_matrix, const_vector)
print(f"解: x = {solution[0]:.4f}, y = {solution[1]:.4f}")

# 验证
print(f"验证: 2*{solution[0]:.4f} + {solution[1]:.4f} = {2*solution[0] + solution[1]:.4f}")
print(f"验证: {solution[0]:.4f} + 3*{solution[1]:.4f} = {solution[0] + 3*solution[1]:.4f}")
```

## 数学算法应用

### 密码学应用

```python
def rsa_key_generation(bit_length=8):
    """
    简化的RSA密钥生成（仅用于演示）
    """
    # 生成两个小素数（实际应用中需要大素数）
    primes = sieve_of_eratosthenes(100)
    p = primes[10]  # 选择一个素数
    q = primes[15]  # 选择另一个素数
    
    n = p * q
    phi_n = (p - 1) * (q - 1)
    
    # 选择公钥指数e
    e = 65537  # 常用值
    while gcd(e, phi_n) != 1:
        e += 2
    
    # 计算私钥指数d
    d = modular_inverse(e, phi_n)
    
    return {
        'public_key': (n, e),
        'private_key': (n, d),
        'p': p, 'q': q, 'phi_n': phi_n
    }

def rsa_encrypt(message, public_key):
    """RSA加密"""
    n, e = public_key
    return fast_power(message, e, n)

def rsa_decrypt(ciphertext, private_key):
    """RSA解密"""
    n, d = private_key
    return fast_power(ciphertext, d, n)

# 示例
print("\nRSA加密演示:")
keys = rsa_key_generation()
print(f"p = {keys['p']}, q = {keys['q']}")
print(f"n = {keys['public_key'][0]}")
print(f"公钥: (n={keys['public_key'][0]}, e={keys['public_key'][1]})")
print(f"私钥: (n={keys['private_key'][0]}, d={keys['private_key'][1]})")

message = 42
print(f"\n原始消息: {message}")

encrypted = rsa_encrypt(message, keys['public_key'])
print(f"加密后: {encrypted}")

decrypted = rsa_decrypt(encrypted, keys['private_key'])
print(f"解密后: {decrypted}")
```

### 计算几何应用

```python
import math

class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y
    
    def distance_to(self, other):
        return math.sqrt((self.x - other.x)**2 + (self.y - other.y)**2)
    
    def __str__(self):
        return f"({self.x}, {self.y})"

def cross_product(o, a, b):
    """计算向量OA和OB的叉积"""
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

def convex_hull(points):
    """
    Graham扫描法计算凸包
    """
    n = len(points)
    if n < 3:
        return points
    
    # 找到最下方的点（y坐标最小，相同时x坐标最小）
    start = min(points, key=lambda p: (p.y, p.x))
    
    # 按极角排序
    def polar_angle(p):
        dx = p.x - start.x
        dy = p.y - start.y
        return math.atan2(dy, dx)
    
    sorted_points = sorted([p for p in points if p != start], key=polar_angle)
    
    # Graham扫描
    hull = [start, sorted_points[0]]
    
    for p in sorted_points[1:]:
        # 移除不在凸包上的点
        while (len(hull) > 1 and 
               cross_product(hull[-2], hull[-1], p) <= 0):
            hull.pop()
        hull.append(p)
    
    return hull

def closest_pair(points):
    """
    分治法找最近点对
    """
    def closest_pair_rec(px, py):
        n = len(px)
        
        # 基本情况
        if n <= 3:
            min_dist = float('inf')
            for i in range(n):
                for j in range(i + 1, n):
                    dist = px[i].distance_to(px[j])
                    min_dist = min(min_dist, dist)
            return min_dist
        
        # 分治
        mid = n // 2
        midpoint = px[mid]
        
        pyl = [p for p in py if p.x <= midpoint.x]
        pyr = [p for p in py if p.x > midpoint.x]
        
        dl = closest_pair_rec(px[:mid], pyl)
        dr = closest_pair_rec(px[mid:], pyr)
        
        d = min(dl, dr)
        
        # 检查跨越中线的点对
        strip = [p for p in py if abs(p.x - midpoint.x) < d]
        
        for i in range(len(strip)):
            j = i + 1
            while j < len(strip) and (strip[j].y - strip[i].y) < d:
                d = min(d, strip[i].distance_to(strip[j]))
                j += 1
        
        return d
    
    px = sorted(points, key=lambda p: p.x)
    py = sorted(points, key=lambda p: p.y)
    
    return closest_pair_rec(px, py)

# 示例
print("\n计算几何应用:")

# 生成随机点
import random
random.seed(42)
points = [Point(random.randint(0, 100), random.randint(0, 100)) for _ in range(10)]

print("随机点集:")
for i, p in enumerate(points):
    print(f"P{i}: {p}")

# 计算凸包
hull = convex_hull(points)
print(f"\n凸包顶点数: {len(hull)}")
print("凸包顶点:")
for p in hull:
    print(f"  {p}")

# 最近点对
min_distance = closest_pair(points)
print(f"\n最近点对距离: {min_distance:.4f}")
```

## 总结

数学算法是计算机科学的重要基础，涵盖了多个数学分支：

### 核心算法分类

1. **数论算法**
   - **欧几里得算法**：计算最大公约数，时间复杂度O(log n)
   - **素数算法**：素数判断、生成，应用于密码学
   - **模运算**：快速幂、模逆元，密码学基础

2. **组合数学**
   - **排列组合**：计数问题的基础
   - **卡特兰数**：递归结构计数
   - **生成函数**：组合问题的代数方法

3. **概率统计**
   - **随机数生成**：各种概率分布的模拟
   - **蒙特卡罗方法**：数值计算和概率估算
   - **统计推断**：数据分析的数学基础

4. **数值计算**
   - **方程求解**：二分法、牛顿法、割线法
   - **数值积分**：梯形法则、辛普森法则
   - **线性代数**：矩阵运算、方程组求解

### 应用领域

- **密码学**：RSA、椭圆曲线密码、哈希函数
- **计算机图形学**：几何变换、光线追踪、曲面建模
- **机器学习**：优化算法、概率模型、统计学习
- **科学计算**：数值模拟、工程计算、物理建模
- **金融工程**：期权定价、风险管理、量化交易

### 性能考虑

- **数值稳定性**：避免舍入误差累积
- **收敛性**：迭代算法的收敛条件
- **精度控制**：平衡计算精度和效率
- **并行化**：利用数学算法的并行特性

### 发展趋势

- **高精度计算**：任意精度算术
- **符号计算**：计算机代数系统
- **量子算法**：量子计算中的数学算法
- **机器学习结合**：数据驱动的数学算法优化

数学算法的掌握对于计算机科学研究和工程实践都具有重要意义，它不仅提供了解决问题的工具，也培养了严谨的数学思维和分析能力。