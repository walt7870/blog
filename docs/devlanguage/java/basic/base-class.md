# Java 基础工具类详解

## 概述

Java 提供了丰富的基础工具类，这些类封装了常用的功能，极大地简化了开发工作。本文档系统性地介绍 Java 中最重要的基础工具类，包含完整的类体系、详细的方法说明和大量实用的代码示例。

## 目录结构

### 📚 核心内容体系

1. **[基础对象类](#1-基础对象类)**
   - Object 类 - 所有类的根父类
   - Objects 工具类 - 空值安全操作

2. **[字符串处理](#2-字符串处理)**
   - String 类 - 不可变字符串
   - StringBuilder/StringBuffer - 可变字符串

3. **[数学运算](#3-数学运算)**
   - Math 类 - 基础数学函数
   - BigDecimal/BigInteger - 高精度数值

4. **[数组操作](#4-数组操作)**
   - Arrays 类 - 数组工具方法

5. **[集合工具](#5-集合工具)**
   - Collections 类 - 集合操作工具

6. **[异常处理体系](#6-异常处理体系)** ⭐
   - 异常类层次结构
   - 常见异常类型
   - 自定义异常设计
   - 异常处理最佳实践

7. **[系统交互](#7-系统交互)**
   - System 类 - 系统级操作
   - Runtime 类 - 运行时环境

8. **[实用工具扩展](#8-实用工具扩展)**
   - 日期时间处理
   - 正则表达式
   - 反射工具

---

## 1. 基础对象类

### 1.1 Object 类

### 1.1 概述

`Object` 是 Java 中所有类的根父类，提供了所有对象都具有的基本方法。

```java
public class ObjectExample {
    private String name;
    private int age;
    
    public ObjectExample(String name, int age) {
        this.name = name;
        this.age = age;
    }
    
    // 重写 toString() 方法
    @Override
    public String toString() {
        return "ObjectExample{name='" + name + "', age=" + age + "}";
    }
    
    // 重写 equals() 方法
    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        
        ObjectExample that = (ObjectExample) obj;
        return age == that.age && 
               (name != null ? name.equals(that.name) : that.name == null);
    }
    
    // 重写 hashCode() 方法
    @Override
    public int hashCode() {
        int result = name != null ? name.hashCode() : 0;
        result = 31 * result + age;
        return result;
    }
    
    // 重写 clone() 方法
    @Override
    protected Object clone() throws CloneNotSupportedException {
        return super.clone();
    }
    
    public static void main(String[] args) throws CloneNotSupportedException {
        ObjectExample obj1 = new ObjectExample("Alice", 25);
        ObjectExample obj2 = new ObjectExample("Alice", 25);
        ObjectExample obj3 = obj1;
        
        // toString() 示例
        System.out.println("obj1: " + obj1.toString());
        
        // equals() 示例
        System.out.println("obj1.equals(obj2): " + obj1.equals(obj2)); // true
        System.out.println("obj1 == obj2: " + (obj1 == obj2));         // false
        System.out.println("obj1 == obj3: " + (obj1 == obj3));         // true
        
        // hashCode() 示例
        System.out.println("obj1.hashCode(): " + obj1.hashCode());
        System.out.println("obj2.hashCode(): " + obj2.hashCode());
        
        // getClass() 示例
        System.out.println("obj1.getClass(): " + obj1.getClass());
        System.out.println("obj1.getClass().getName(): " + obj1.getClass().getName());
        
        // clone() 示例
        ObjectExample cloned = (ObjectExample) obj1.clone();
        System.out.println("cloned: " + cloned);
        System.out.println("obj1 == cloned: " + (obj1 == cloned));     // false
        System.out.println("obj1.equals(cloned): " + obj1.equals(cloned)); // true
    }
}
```

### 1.2 Object 类的核心方法

```java
public class ObjectMethods {
    public static void main(String[] args) {
        String str = "Hello World";
        
        // getClass() - 获取对象的运行时类
        Class<?> clazz = str.getClass();
        System.out.println("类名: " + clazz.getName());
        System.out.println("简单类名: " + clazz.getSimpleName());
        
        // instanceof 操作符
        System.out.println("str instanceof String: " + (str instanceof String));
        System.out.println("str instanceof Object: " + (str instanceof Object));
        
        // wait(), notify(), notifyAll() - 线程同步相关
        Object lock = new Object();
        
        // 在同步块中使用
        synchronized (lock) {
            try {
                System.out.println("准备等待...");
                // lock.wait(1000); // 等待1秒或被唤醒
                System.out.println("等待结束");
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        
        // finalize() - 垃圾回收前调用（已废弃）
        System.out.println("finalize() 方法已在 Java 9+ 中被废弃");
    }
}
```

## 2. String 类

### 2.1 String 基本操作

```java
public class StringUtilities {
    public static void main(String[] args) {
        String str = "  Hello, Java World!  ";
        
        // 基本信息
        System.out.println("=== 基本信息 ===");
        System.out.println("原字符串: '" + str + "'");
        System.out.println("长度: " + str.length());
        System.out.println("是否为空: " + str.isEmpty());
        System.out.println("是否为空白: " + str.isBlank()); // Java 11+
        
        // 字符访问
        System.out.println("\n=== 字符访问 ===");
        System.out.println("第一个字符: " + str.charAt(2));
        System.out.println("字符数组: " + java.util.Arrays.toString(str.toCharArray()));
        
        // 查找操作
        System.out.println("\n=== 查找操作 ===");
        System.out.println("indexOf('a'): " + str.indexOf('a'));
        System.out.println("lastIndexOf('a'): " + str.lastIndexOf('a'));
        System.out.println("indexOf(\"Java\"): " + str.indexOf("Java"));
        System.out.println("contains(\"World\"): " + str.contains("World"));
        System.out.println("startsWith(\"  Hello\"): " + str.startsWith("  Hello"));
        System.out.println("endsWith(\"!  \"): " + str.endsWith("!  "));
        
        // 截取操作
        System.out.println("\n=== 截取操作 ===");
        System.out.println("substring(2, 7): '" + str.substring(2, 7) + "'");
        System.out.println("substring(8): '" + str.substring(8) + "'");
        
        // 转换操作
        System.out.println("\n=== 转换操作 ===");
        System.out.println("trim(): '" + str.trim() + "'");
        System.out.println("strip(): '" + str.strip() + "'"); // Java 11+
        System.out.println("toUpperCase(): " + str.toUpperCase());
        System.out.println("toLowerCase(): " + str.toLowerCase());
        
        // 替换操作
        System.out.println("\n=== 替换操作 ===");
        System.out.println("replace('o', 'O'): " + str.replace('o', 'O'));
        System.out.println("replaceAll(\"[aeiou]\", \"*\"): " + str.replaceAll("[aeiou]", "*"));
        System.out.println("replaceFirst(\"l\", \"L\"): " + str.replaceFirst("l", "L"));
        
        // 分割操作
        System.out.println("\n=== 分割操作 ===");
        String csv = "apple,banana,orange,grape";
        String[] fruits = csv.split(",");
        System.out.println("分割结果: " + java.util.Arrays.toString(fruits));
        
        // 连接操作
        System.out.println("\n=== 连接操作 ===");
        String joined = String.join(" | ", fruits);
        System.out.println("连接结果: " + joined);
        
        // 格式化操作
        System.out.println("\n=== 格式化操作 ===");
        String formatted = String.format("姓名: %s, 年龄: %d, 分数: %.2f", "Alice", 25, 95.5);
        System.out.println("格式化结果: " + formatted);
    }
}
```

### 2.2 String 性能优化

```java
public class StringPerformance {
    public static void main(String[] args) {
        // String 不可变性演示
        System.out.println("=== String 不可变性 ===");
        String original = "Hello";
        String modified = original.concat(" World");
        System.out.println("原字符串: " + original);     // "Hello"
        System.out.println("修改后: " + modified);       // "Hello World"
        System.out.println("是否为同一对象: " + (original == modified)); // false
        
        // 字符串池演示
        System.out.println("\n=== 字符串池 ===");
        String str1 = "Java";
        String str2 = "Java";
        String str3 = new String("Java");
        String str4 = str3.intern();
        
        System.out.println("str1 == str2: " + (str1 == str2));     // true
        System.out.println("str1 == str3: " + (str1 == str3));     // false
        System.out.println("str1 == str4: " + (str1 == str4));     // true
        
        // 性能比较
        System.out.println("\n=== 性能比较 ===");
        int iterations = 10000;
        
        // String 拼接（性能差）
        long startTime = System.currentTimeMillis();
        String result1 = "";
        for (int i = 0; i < iterations; i++) {
            result1 += "a";
        }
        long endTime = System.currentTimeMillis();
        System.out.println("String 拼接耗时: " + (endTime - startTime) + "ms");
        
        // StringBuilder 拼接（性能好）
        startTime = System.currentTimeMillis();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < iterations; i++) {
            sb.append("a");
        }
        String result2 = sb.toString();
        endTime = System.currentTimeMillis();
        System.out.println("StringBuilder 拼接耗时: " + (endTime - startTime) + "ms");
        
        // StringBuffer 拼接（线程安全）
        startTime = System.currentTimeMillis();
        StringBuffer sbf = new StringBuffer();
        for (int i = 0; i < iterations; i++) {
            sbf.append("a");
        }
        String result3 = sbf.toString();
        endTime = System.currentTimeMillis();
        System.out.println("StringBuffer 拼接耗时: " + (endTime - startTime) + "ms");
    }
}
```

## 3. Math 类

### 3.1 数学运算

```java
public class MathUtilities {
    public static void main(String[] args) {
        // 常量
        System.out.println("=== 数学常量 ===");
        System.out.println("PI: " + Math.PI);
        System.out.println("E: " + Math.E);
        
        // 基本运算
        System.out.println("\n=== 基本运算 ===");
        System.out.println("abs(-5): " + Math.abs(-5));
        System.out.println("abs(-3.14): " + Math.abs(-3.14));
        System.out.println("max(10, 20): " + Math.max(10, 20));
        System.out.println("min(10, 20): " + Math.min(10, 20));
        
        // 幂运算
        System.out.println("\n=== 幂运算 ===");
        System.out.println("pow(2, 3): " + Math.pow(2, 3));        // 2^3 = 8
        System.out.println("sqrt(16): " + Math.sqrt(16));          // √16 = 4
        System.out.println("cbrt(27): " + Math.cbrt(27));          // ∛27 = 3
        System.out.println("exp(1): " + Math.exp(1));              // e^1
        System.out.println("log(Math.E): " + Math.log(Math.E));    // ln(e) = 1
        System.out.println("log10(100): " + Math.log10(100));      // log₁₀(100) = 2
        
        // 三角函数
        System.out.println("\n=== 三角函数 ===");
        double angle = Math.PI / 4; // 45度
        System.out.println("sin(π/4): " + Math.sin(angle));
        System.out.println("cos(π/4): " + Math.cos(angle));
        System.out.println("tan(π/4): " + Math.tan(angle));
        System.out.println("asin(1): " + Math.asin(1));            // arcsin(1) = π/2
        System.out.println("acos(0): " + Math.acos(0));            // arccos(0) = π/2
        System.out.println("atan(1): " + Math.atan(1));            // arctan(1) = π/4
        
        // 取整函数
        System.out.println("\n=== 取整函数 ===");
        double value = 3.7;
        System.out.println("原值: " + value);
        System.out.println("ceil(3.7): " + Math.ceil(value));      // 向上取整: 4.0
        System.out.println("floor(3.7): " + Math.floor(value));    // 向下取整: 3.0
        System.out.println("round(3.7): " + Math.round(value));    // 四舍五入: 4
        System.out.println("rint(3.7): " + Math.rint(value));      // 最接近的整数: 4.0
        
        value = 3.2;
        System.out.println("\n原值: " + value);
        System.out.println("ceil(3.2): " + Math.ceil(value));      // 4.0
        System.out.println("floor(3.2): " + Math.floor(value));    // 3.0
        System.out.println("round(3.2): " + Math.round(value));    // 3
        System.out.println("rint(3.2): " + Math.rint(value));      // 3.0
        
        // 随机数
        System.out.println("\n=== 随机数 ===");
        System.out.println("random(): " + Math.random());          // [0.0, 1.0)
        
        // 生成指定范围的随机数
        int min = 10, max = 50;
        int randomInt = (int) (Math.random() * (max - min + 1)) + min;
        System.out.println("随机整数[10, 50]: " + randomInt);
        
        // 其他有用的方法
        System.out.println("\n=== 其他方法 ===");
        System.out.println("signum(5): " + Math.signum(5));        // 符号函数: 1.0
        System.out.println("signum(-5): " + Math.signum(-5));      // -1.0
        System.out.println("signum(0): " + Math.signum(0));        // 0.0
        
        System.out.println("copySign(5, -1): " + Math.copySign(5, -1)); // -5.0
        System.out.println("nextUp(1.0): " + Math.nextUp(1.0));    // 下一个更大的浮点数
        System.out.println("ulp(1.0): " + Math.ulp(1.0));          // 最小精度单位
    }
}
```

### 3.2 数学工具方法

```java
public class MathHelper {
    // 计算两点间距离
    public static double distance(double x1, double y1, double x2, double y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }
    
    // 角度转弧度
    public static double toRadians(double degrees) {
        return Math.toRadians(degrees);
    }
    
    // 弧度转角度
    public static double toDegrees(double radians) {
        return Math.toDegrees(radians);
    }
    
    // 计算阶乘
    public static long factorial(int n) {
        if (n < 0) throw new IllegalArgumentException("n must be non-negative");
        long result = 1;
        for (int i = 2; i <= n; i++) {
            result *= i;
        }
        return result;
    }
    
    // 计算最大公约数
    public static int gcd(int a, int b) {
        while (b != 0) {
            int temp = b;
            b = a % b;
            a = temp;
        }
        return Math.abs(a);
    }
    
    // 计算最小公倍数
    public static int lcm(int a, int b) {
        return Math.abs(a * b) / gcd(a, b);
    }
    
    // 判断是否为质数
    public static boolean isPrime(int n) {
        if (n < 2) return false;
        if (n == 2) return true;
        if (n % 2 == 0) return false;
        
        for (int i = 3; i <= Math.sqrt(n); i += 2) {
            if (n % i == 0) return false;
        }
        return true;
    }
    
    public static void main(String[] args) {
        System.out.println("=== 自定义数学工具 ===");
        
        // 距离计算
        double dist = distance(0, 0, 3, 4);
        System.out.println("点(0,0)到点(3,4)的距离: " + dist);
        
        // 角度转换
        System.out.println("90度 = " + toRadians(90) + " 弧度");
        System.out.println("π弧度 = " + toDegrees(Math.PI) + " 度");
        
        // 阶乘
        System.out.println("5! = " + factorial(5));
        
        // 最大公约数和最小公倍数
        System.out.println("gcd(12, 18) = " + gcd(12, 18));
        System.out.println("lcm(12, 18) = " + lcm(12, 18));
        
        // 质数判断
        for (int i = 2; i <= 20; i++) {
            if (isPrime(i)) {
                System.out.print(i + " ");
            }
        }
        System.out.println("\n以上是2-20之间的质数");
    }
}
```

## 4. Arrays 类

### 4.1 数组操作工具

```java
import java.util.Arrays;
import java.util.Comparator;

public class ArraysUtilities {
    public static void main(String[] args) {
        // 数组初始化
        int[] numbers = {5, 2, 8, 1, 9, 3};
        String[] names = {"Alice", "Bob", "Charlie", "David"};
        
        System.out.println("=== 原始数组 ===");
        System.out.println("numbers: " + Arrays.toString(numbers));
        System.out.println("names: " + Arrays.toString(names));
        
        // 数组排序
        System.out.println("\n=== 数组排序 ===");
        int[] sortedNumbers = numbers.clone();
        Arrays.sort(sortedNumbers);
        System.out.println("升序排序: " + Arrays.toString(sortedNumbers));
        
        String[] sortedNames = names.clone();
        Arrays.sort(sortedNames);
        System.out.println("字符串排序: " + Arrays.toString(sortedNames));
        
        // 自定义排序
        String[] customSorted = names.clone();
        Arrays.sort(customSorted, Comparator.comparing(String::length));
        System.out.println("按长度排序: " + Arrays.toString(customSorted));
        
        // 逆序排序
        String[] reverseSorted = names.clone();
        Arrays.sort(reverseSorted, Comparator.reverseOrder());
        System.out.println("逆序排序: " + Arrays.toString(reverseSorted));
        
        // 二分查找
        System.out.println("\n=== 二分查找 ===");
        int index = Arrays.binarySearch(sortedNumbers, 5);
        System.out.println("在排序数组中查找5的索引: " + index);
        
        index = Arrays.binarySearch(sortedNames, "Bob");
        System.out.println("在排序数组中查找Bob的索引: " + index);
        
        // 数组复制
        System.out.println("\n=== 数组复制 ===");
        int[] copied = Arrays.copyOf(numbers, numbers.length);
        System.out.println("完整复制: " + Arrays.toString(copied));
        
        int[] partialCopy = Arrays.copyOf(numbers, 3);
        System.out.println("部分复制(前3个): " + Arrays.toString(partialCopy));
        
        int[] extendedCopy = Arrays.copyOf(numbers, 10);
        System.out.println("扩展复制(长度10): " + Arrays.toString(extendedCopy));
        
        int[] rangeCopy = Arrays.copyOfRange(numbers, 1, 4);
        System.out.println("范围复制[1,4): " + Arrays.toString(rangeCopy));
        
        // 数组填充
        System.out.println("\n=== 数组填充 ===");
        int[] filled = new int[5];
        Arrays.fill(filled, 100);
        System.out.println("全部填充100: " + Arrays.toString(filled));
        
        Arrays.fill(filled, 1, 3, 200);
        System.out.println("部分填充[1,3)为200: " + Arrays.toString(filled));
        
        // 数组比较
        System.out.println("\n=== 数组比较 ===");
        int[] array1 = {1, 2, 3};
        int[] array2 = {1, 2, 3};
        int[] array3 = {1, 2, 4};
        
        System.out.println("array1 equals array2: " + Arrays.equals(array1, array2));
        System.out.println("array1 equals array3: " + Arrays.equals(array1, array3));
        
        // 多维数组
        System.out.println("\n=== 多维数组 ===");
        int[][] matrix = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
        System.out.println("二维数组: " + Arrays.deepToString(matrix));
        
        int[][] matrix2 = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
        System.out.println("深度比较: " + Arrays.deepEquals(matrix, matrix2));
        
        // 哈希码
        System.out.println("\n=== 哈希码 ===");
        System.out.println("array1 hashCode: " + Arrays.hashCode(array1));
        System.out.println("matrix hashCode: " + Arrays.deepHashCode(matrix));
        
        // 并行排序（Java 8+）
        System.out.println("\n=== 并行排序 ===");
        int[] largeArray = new int[1000];
        for (int i = 0; i < largeArray.length; i++) {
            largeArray[i] = (int) (Math.random() * 1000);
        }
        
        long startTime = System.currentTimeMillis();
        Arrays.parallelSort(largeArray);
        long endTime = System.currentTimeMillis();
        System.out.println("并行排序1000个元素耗时: " + (endTime - startTime) + "ms");
        System.out.println("前10个元素: " + Arrays.toString(Arrays.copyOf(largeArray, 10)));
    }
}
```

### 4.2 数组流操作（Java 8+）

```java
import java.util.Arrays;
import java.util.stream.IntStream;

public class ArrayStreamOperations {
    public static void main(String[] args) {
        int[] numbers = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
        
        System.out.println("=== 数组流操作 ===");
        System.out.println("原数组: " + Arrays.toString(numbers));
        
        // 转换为流
        System.out.println("\n=== 基本流操作 ===");
        
        // 过滤偶数
        int[] evenNumbers = Arrays.stream(numbers)
                .filter(n -> n % 2 == 0)
                .toArray();
        System.out.println("偶数: " + Arrays.toString(evenNumbers));
        
        // 映射操作
        int[] squared = Arrays.stream(numbers)
                .map(n -> n * n)
                .toArray();
        System.out.println("平方: " + Arrays.toString(squared));
        
        // 聚合操作
        System.out.println("\n=== 聚合操作 ===");
        int sum = Arrays.stream(numbers).sum();
        System.out.println("求和: " + sum);
        
        double average = Arrays.stream(numbers).average().orElse(0.0);
        System.out.println("平均值: " + average);
        
        int max = Arrays.stream(numbers).max().orElse(0);
        System.out.println("最大值: " + max);
        
        int min = Arrays.stream(numbers).min().orElse(0);
        System.out.println("最小值: " + min);
        
        long count = Arrays.stream(numbers).count();
        System.out.println("元素个数: " + count);
        
        // 条件判断
        System.out.println("\n=== 条件判断 ===");
        boolean allPositive = Arrays.stream(numbers).allMatch(n -> n > 0);
        System.out.println("是否都为正数: " + allPositive);
        
        boolean anyEven = Arrays.stream(numbers).anyMatch(n -> n % 2 == 0);
        System.out.println("是否有偶数: " + anyEven);
        
        boolean noneNegative = Arrays.stream(numbers).noneMatch(n -> n < 0);
        System.out.println("是否没有负数: " + noneNegative);
        
        // 查找操作
        System.out.println("\n=== 查找操作 ===");
        int firstEven = Arrays.stream(numbers)
                .filter(n -> n % 2 == 0)
                .findFirst()
                .orElse(-1);
        System.out.println("第一个偶数: " + firstEven);
        
        int anyOdd = Arrays.stream(numbers)
                .filter(n -> n % 2 == 1)
                .findAny()
                .orElse(-1);
        System.out.println("任意一个奇数: " + anyOdd);
        
        // 排序和去重
        System.out.println("\n=== 排序和去重 ===");
        int[] duplicates = {3, 1, 4, 1, 5, 9, 2, 6, 5, 3};
        System.out.println("原数组: " + Arrays.toString(duplicates));
        
        int[] sortedUnique = Arrays.stream(duplicates)
                .distinct()
                .sorted()
                .toArray();
        System.out.println("去重排序: " + Arrays.toString(sortedUnique));
        
        // 限制和跳过
        System.out.println("\n=== 限制和跳过 ===");
        int[] first5 = Arrays.stream(numbers)
                .limit(5)
                .toArray();
        System.out.println("前5个: " + Arrays.toString(first5));
        
        int[] skip5 = Arrays.stream(numbers)
                .skip(5)
                .toArray();
        System.out.println("跳过前5个: " + Arrays.toString(skip5));
        
        // 并行流
        System.out.println("\n=== 并行流 ===");
        int parallelSum = Arrays.stream(numbers)
                .parallel()
                .sum();
        System.out.println("并行求和: " + parallelSum);
    }
}
```

## 5. Collections 类

### 5.1 集合操作工具

```java
import java.util.*;

public class CollectionsUtilities {
    public static void main(String[] args) {
        // 创建测试数据
        List<Integer> numbers = new ArrayList<>(Arrays.asList(5, 2, 8, 1, 9, 3));
        List<String> names = new ArrayList<>(Arrays.asList("Alice", "Bob", "Charlie", "David"));
        
        System.out.println("=== 原始集合 ===");
        System.out.println("numbers: " + numbers);
        System.out.println("names: " + names);
        
        // 排序操作
        System.out.println("\n=== 排序操作 ===");
        List<Integer> sortedNumbers = new ArrayList<>(numbers);
        Collections.sort(sortedNumbers);
        System.out.println("升序排序: " + sortedNumbers);
        
        Collections.sort(sortedNumbers, Collections.reverseOrder());
        System.out.println("降序排序: " + sortedNumbers);
        
        List<String> sortedNames = new ArrayList<>(names);
        Collections.sort(sortedNames, Comparator.comparing(String::length));
        System.out.println("按长度排序: " + sortedNames);
        
        // 查找操作
        System.out.println("\n=== 查找操作 ===");
        Collections.sort(numbers); // 二分查找需要有序集合
        int index = Collections.binarySearch(numbers, 5);
        System.out.println("二分查找5的索引: " + index);
        
        Integer max = Collections.max(numbers);
        Integer min = Collections.min(numbers);
        System.out.println("最大值: " + max + ", 最小值: " + min);
        
        String longest = Collections.max(names, Comparator.comparing(String::length));
        System.out.println("最长的名字: " + longest);
        
        // 反转和打乱
        System.out.println("\n=== 反转和打乱 ===");
        List<Integer> reversed = new ArrayList<>(numbers);
        Collections.reverse(reversed);
        System.out.println("反转: " + reversed);
        
        List<Integer> shuffled = new ArrayList<>(numbers);
        Collections.shuffle(shuffled);
        System.out.println("打乱: " + shuffled);
        
        // 旋转
        List<Integer> rotated = new ArrayList<>(numbers);
        Collections.rotate(rotated, 2);
        System.out.println("右旋转2位: " + rotated);
        
        // 交换
        List<String> swapped = new ArrayList<>(names);
        Collections.swap(swapped, 0, 2);
        System.out.println("交换索引0和2: " + swapped);
        
        // 填充和替换
        System.out.println("\n=== 填充和替换 ===");
        List<String> filled = new ArrayList<>(Arrays.asList("a", "b", "c", "d"));
        Collections.fill(filled, "X");
        System.out.println("填充X: " + filled);
        
        List<String> replaced = new ArrayList<>(names);
        Collections.replaceAll(replaced, "Alice", "Alicia");
        System.out.println("替换Alice为Alicia: " + replaced);
        
        // 频率统计
        System.out.println("\n=== 频率统计 ===");
        List<String> letters = Arrays.asList("a", "b", "a", "c", "b", "a");
        int frequency = Collections.frequency(letters, "a");
        System.out.println("字母a的频率: " + frequency);
        
        // 子集合操作
        System.out.println("\n=== 子集合操作 ===");
        List<Integer> source = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9);
        List<Integer> target = Arrays.asList(3, 4, 5);
        
        int startIndex = Collections.indexOfSubList(source, target);
        System.out.println("子列表[3,4,5]在源列表中的起始索引: " + startIndex);
        
        int lastIndex = Collections.lastIndexOfSubList(source, target);
        System.out.println("子列表[3,4,5]在源列表中的最后索引: " + lastIndex);
        
        // 不相交判断
        List<Integer> list1 = Arrays.asList(1, 2, 3);
        List<Integer> list2 = Arrays.asList(4, 5, 6);
        List<Integer> list3 = Arrays.asList(3, 4, 5);
        
        boolean disjoint1 = Collections.disjoint(list1, list2);
        boolean disjoint2 = Collections.disjoint(list1, list3);
        System.out.println("list1和list2不相交: " + disjoint1);
        System.out.println("list1和list3不相交: " + disjoint2);
        
        // 创建不可变集合
        System.out.println("\n=== 不可变集合 ===");
        List<String> immutableList = Collections.unmodifiableList(names);
        System.out.println("不可变列表: " + immutableList);
        
        Set<String> immutableSet = Collections.unmodifiableSet(new HashSet<>(names));
        System.out.println("不可变集合: " + immutableSet);
        
        Map<String, Integer> map = new HashMap<>();
        map.put("Alice", 25);
        map.put("Bob", 30);
        Map<String, Integer> immutableMap = Collections.unmodifiableMap(map);
        System.out.println("不可变映射: " + immutableMap);
        
        // 同步集合
        System.out.println("\n=== 同步集合 ===");
        List<String> syncList = Collections.synchronizedList(new ArrayList<>(names));
        Set<String> syncSet = Collections.synchronizedSet(new HashSet<>(names));
        Map<String, Integer> syncMap = Collections.synchronizedMap(new HashMap<>(map));
        
        System.out.println("同步列表类型: " + syncList.getClass().getSimpleName());
        System.out.println("同步集合类型: " + syncSet.getClass().getSimpleName());
        System.out.println("同步映射类型: " + syncMap.getClass().getSimpleName());
        
        // 单例集合
        System.out.println("\n=== 单例集合 ===");
        List<String> singletonList = Collections.singletonList("Only");
        Set<String> singletonSet = Collections.singleton("Only");
        Map<String, String> singletonMap = Collections.singletonMap("key", "value");
        
        System.out.println("单例列表: " + singletonList);
        System.out.println("单例集合: " + singletonSet);
        System.out.println("单例映射: " + singletonMap);
        
        // 空集合
        System.out.println("\n=== 空集合 ===");
        List<String> emptyList = Collections.emptyList();
        Set<String> emptySet = Collections.emptySet();
        Map<String, String> emptyMap = Collections.emptyMap();
        
        System.out.println("空列表大小: " + emptyList.size());
        System.out.println("空集合大小: " + emptySet.size());
        System.out.println("空映射大小: " + emptyMap.size());
    }
}
```

### 5.2 自定义比较器

```java
import java.util.*;

class Person {
    private String name;
    private int age;
    private double salary;
    
    public Person(String name, int age, double salary) {
        this.name = name;
        this.age = age;
        this.salary = salary;
    }
    
    // Getters
    public String getName() { return name; }
    public int getAge() { return age; }
    public double getSalary() { return salary; }
    
    @Override
    public String toString() {
        return String.format("Person{name='%s', age=%d, salary=%.1f}", name, age, salary);
    }
}

public class ComparatorExamples {
    public static void main(String[] args) {
        List<Person> people = Arrays.asList(
            new Person("Alice", 30, 50000),
            new Person("Bob", 25, 45000),
            new Person("Charlie", 35, 60000),
            new Person("David", 28, 48000)
        );
        
        System.out.println("=== 原始列表 ===");
        people.forEach(System.out::println);
        
        // 按年龄排序
        System.out.println("\n=== 按年龄排序 ===");
        List<Person> byAge = new ArrayList<>(people);
        Collections.sort(byAge, Comparator.comparing(Person::getAge));
        byAge.forEach(System.out::println);
        
        // 按薪水排序（降序）
        System.out.println("\n=== 按薪水排序（降序） ===");
        List<Person> bySalary = new ArrayList<>(people);
        Collections.sort(bySalary, Comparator.comparing(Person::getSalary).reversed());
        bySalary.forEach(System.out::println);
        
        // 按姓名长度排序
        System.out.println("\n=== 按姓名长度排序 ===");
        List<Person> byNameLength = new ArrayList<>(people);
        Collections.sort(byNameLength, Comparator.comparing(p -> p.getName().length()));
        byNameLength.forEach(System.out::println);
        
        // 多级排序：先按年龄，再按薪水
        System.out.println("\n=== 多级排序（年龄+薪水） ===");
        List<Person> multiSort = new ArrayList<>(people);
        Collections.sort(multiSort, 
            Comparator.comparing(Person::getAge)
                     .thenComparing(Person::getSalary));
        multiSort.forEach(System.out::println);
        
        // 自定义比较器
        System.out.println("\n=== 自定义比较器 ===");
        List<Person> custom = new ArrayList<>(people);
        Collections.sort(custom, new Comparator<Person>() {
            @Override
            public int compare(Person p1, Person p2) {
                // 先比较年龄段（20-29, 30-39等）
                int ageGroup1 = p1.getAge() / 10;
                int ageGroup2 = p2.getAge() / 10;
                if (ageGroup1 != ageGroup2) {
                    return Integer.compare(ageGroup1, ageGroup2);
                }
                // 年龄段相同则比较薪水
                return Double.compare(p2.getSalary(), p1.getSalary());
            }
        });
        custom.forEach(System.out::println);
        
        // Lambda 表达式比较器
        System.out.println("\n=== Lambda 表达式比较器 ===");
        List<Person> lambda = new ArrayList<>(people);
        Collections.sort(lambda, (p1, p2) -> {
            // 按姓名字母顺序
            return p1.getName().compareTo(p2.getName());
        });
        lambda.forEach(System.out::println);
        
        // 空值安全的比较器
        System.out.println("\n=== 空值安全比较器 ===");
        List<String> withNulls = Arrays.asList("Alice", null, "Bob", "Charlie", null);
        System.out.println("原列表: " + withNulls);
        
        List<String> nullsFirst = new ArrayList<>(withNulls);
        Collections.sort(nullsFirst, Comparator.nullsFirst(String::compareTo));
        System.out.println("null在前: " + nullsFirst);
        
        List<String> nullsLast = new ArrayList<>(withNulls);
        Collections.sort(nullsLast, Comparator.nullsLast(String::compareTo));
        System.out.println("null在后: " + nullsLast);
    }
}
```

## 6. Objects 类（Java 7+）

### 6.1 对象工具方法

```java
import java.util.Objects;
import java.util.Comparator;

public class ObjectsUtilities {
    public static void main(String[] args) {
        String str1 = "Hello";
        String str2 = null;
        String str3 = "Hello";
        
        System.out.println("=== 空值安全比较 ===");
        
        // 空值安全的 equals
        System.out.println("Objects.equals(str1, str3): " + Objects.equals(str1, str3)); // true
        System.out.println("Objects.equals(str1, str2): " + Objects.equals(str1, str2)); // false
        System.out.println("Objects.equals(str2, null): " + Objects.equals(str2, null)); // true
        
        // 深度比较
        String[] array1 = {"a", "b", "c"};
        String[] array2 = {"a", "b", "c"};
        String[] array3 = null;
        
        System.out.println("Objects.deepEquals(array1, array2): " + Objects.deepEquals(array1, array2)); // true
        System.out.println("Objects.deepEquals(array1, array3): " + Objects.deepEquals(array1, array3)); // false
        
        // 哈希码计算
        System.out.println("\n=== 哈希码计算 ===");
        System.out.println("Objects.hashCode(str1): " + Objects.hashCode(str1));
        System.out.println("Objects.hashCode(str2): " + Objects.hashCode(str2)); // 0
        
        // 多个对象的哈希码
        int combinedHash = Objects.hash(str1, str3, 123, true);
        System.out.println("组合哈希码: " + combinedHash);
        
        // toString 方法
        System.out.println("\n=== toString 方法 ===");
        System.out.println("Objects.toString(str1): " + Objects.toString(str1));
        System.out.println("Objects.toString(str2): " + Objects.toString(str2)); // "null"
        System.out.println("Objects.toString(str2, \"默认值\"): " + Objects.toString(str2, "默认值"));
        
        // 空值检查
        System.out.println("\n=== 空值检查 ===");
        
        try {
            String nonNull = Objects.requireNonNull(str1);
            System.out.println("非空检查通过: " + nonNull);
        } catch (NullPointerException e) {
            System.out.println("空值异常: " + e.getMessage());
        }
        
        try {
            String nonNull = Objects.requireNonNull(str2, "参数不能为空");
            System.out.println("非空检查通过: " + nonNull);
        } catch (NullPointerException e) {
            System.out.println("空值异常: " + e.getMessage());
        }
        
        // 条件检查
        System.out.println("\n=== 条件检查 ===");
        System.out.println("Objects.isNull(str2): " + Objects.isNull(str2));
        System.out.println("Objects.nonNull(str1): " + Objects.nonNull(str1));
        
        // 比较操作
        System.out.println("\n=== 比较操作 ===");
        Integer num1 = 10;
        Integer num2 = 20;
        Integer num3 = null;
        
        int result = Objects.compare(num1, num2, Integer::compareTo);
        System.out.println("compare(10, 20): " + result); // -1
        
        // 空值安全的比较
        result = Objects.compare(num1, num3, Comparator.nullsLast(Integer::compareTo));
        System.out.println("compare(10, null) with nullsLast: " + result); // -1
        
        result = Objects.compare(num3, num1, Comparator.nullsFirst(Integer::compareTo));
        System.out.println("compare(null, 10) with nullsFirst: " + result); // -1
    }
}
```

### 6.2 实用工具方法示例

```java
import java.util.Objects;
import java.util.function.Supplier;

public class ObjectsHelper {
    
    // 安全的字符串操作
    public static String safeToString(Object obj) {
        return Objects.toString(obj, "");
    }
    
    // 安全的长度获取
    public static int safeLength(String str) {
        return Objects.nonNull(str) ? str.length() : 0;
    }
    
    // 条件性非空检查
    public static <T> T requireNonNullIf(T obj, boolean condition, String message) {
        if (condition) {
            return Objects.requireNonNull(obj, message);
        }
        return obj;
    }
    
    // 延迟计算的非空检查
    public static <T> T requireNonNull(T obj, Supplier<String> messageSupplier) {
        if (obj == null) {
            throw new NullPointerException(messageSupplier.get());
        }
        return obj;
    }
    
    // 多个对象的非空检查
    public static void requireAllNonNull(Object... objects) {
        for (int i = 0; i < objects.length; i++) {
            Objects.requireNonNull(objects[i], "参数 " + i + " 不能为空");
        }
    }
    
    // 安全的比较
    public static boolean safeEquals(Object a, Object b) {
        return Objects.equals(a, b);
    }
    
    // 构建器模式中的验证
    public static class PersonBuilder {
        private String name;
        private Integer age;
        private String email;
        
        public PersonBuilder setName(String name) {
            this.name = Objects.requireNonNull(name, "姓名不能为空");
            return this;
        }
        
        public PersonBuilder setAge(Integer age) {
            this.age = Objects.requireNonNull(age, "年龄不能为空");
            if (age < 0 || age > 150) {
                throw new IllegalArgumentException("年龄必须在0-150之间");
            }
            return this;
        }
        
        public PersonBuilder setEmail(String email) {
            this.email = email; // 可选字段
            return this;
        }
        
        public Person build() {
            requireAllNonNull(name, age);
            return new Person(name, age, Objects.toString(email, "未提供"));
        }
    }
    
    public static void main(String[] args) {
        System.out.println("=== 工具方法示例 ===");
        
        // 安全字符串操作
        System.out.println("safeToString(null): '" + safeToString(null) + "'");
        System.out.println("safeLength(null): " + safeLength(null));
        System.out.println("safeLength(\"Hello\"): " + safeLength("Hello"));
        
        // 条件性检查
        String result = requireNonNullIf("test", true, "条件为真时不能为空");
        System.out.println("条件性检查结果: " + result);
        
        // 延迟计算消息
        try {
            requireNonNull(null, () -> "延迟计算的错误消息: " + System.currentTimeMillis());
        } catch (NullPointerException e) {
            System.out.println("捕获异常: " + e.getMessage());
        }
        
        // 构建器模式
        try {
            Person person = new PersonBuilder()
                .setName("Alice")
                .setAge(25)
                .setEmail("alice@example.com")
                .build();
            System.out.println("构建的对象: " + person);
        } catch (Exception e) {
            System.out.println("构建失败: " + e.getMessage());
        }
        
        // 多对象检查
        try {
            requireAllNonNull("a", "b", "c");
            System.out.println("所有参数都非空");
        } catch (NullPointerException e) {
            System.out.println("存在空参数: " + e.getMessage());
        }
    }
}
```

## 6. 异常处理体系

### 6.1 异常类层次结构

Java 异常体系是一个完整的类层次结构，所有异常都继承自 `Throwable` 类。

```java
/**
 * Java 异常体系结构示意
 * 
 * Throwable
 * ├── Error (系统级错误，不应被捕获)
 * │   ├── OutOfMemoryError
 * │   ├── StackOverflowError
 * │   └── VirtualMachineError
 * └── Exception (应用级异常)
 *     ├── RuntimeException (运行时异常，非检查异常)
 *     │   ├── NullPointerException
 *     │   ├── IllegalArgumentException
 *     │   ├── IndexOutOfBoundsException
 *     │   ├── ClassCastException
 *     │   └── NumberFormatException
 *     └── 检查异常 (Checked Exceptions)
 *         ├── IOException
 *         ├── SQLException
 *         ├── ClassNotFoundException
 *         └── ParseException
 */

public class ExceptionHierarchyDemo {
    public static void main(String[] args) {
        System.out.println("=== Java 异常体系演示 ===");
        
        // 1. 运行时异常示例
        demonstrateRuntimeExceptions();
        
        // 2. 检查异常示例
        demonstrateCheckedExceptions();
        
        // 3. 错误示例（仅演示，不推荐捕获）
        demonstrateErrors();
    }
    
    private static void demonstrateRuntimeExceptions() {
        System.out.println("\n--- 运行时异常示例 ---");
        
        // NullPointerException
        try {
            String str = null;
            int length = str.length(); // 会抛出 NPE
        } catch (NullPointerException e) {
            System.out.println("捕获 NullPointerException: " + e.getMessage());
        }
        
        // IllegalArgumentException
        try {
            validateAge(-5);
        } catch (IllegalArgumentException e) {
            System.out.println("捕获 IllegalArgumentException: " + e.getMessage());
        }
        
        // IndexOutOfBoundsException
        try {
            int[] array = {1, 2, 3};
            int value = array[5]; // 数组越界
        } catch (IndexOutOfBoundsException e) {
            System.out.println("捕获 IndexOutOfBoundsException: " + e.getMessage());
        }
        
        // ClassCastException
        try {
            Object obj = "Hello";
            Integer num = (Integer) obj; // 类型转换异常
        } catch (ClassCastException e) {
            System.out.println("捕获 ClassCastException: " + e.getMessage());
        }
        
        // NumberFormatException
        try {
            int num = Integer.parseInt("abc"); // 数字格式异常
        } catch (NumberFormatException e) {
            System.out.println("捕获 NumberFormatException: " + e.getMessage());
        }
    }
    
    private static void demonstrateCheckedExceptions() {
        System.out.println("\n--- 检查异常示例 ---");
        
        // IOException
        try {
            java.io.FileReader reader = new java.io.FileReader("nonexistent.txt");
        } catch (java.io.IOException e) {
            System.out.println("捕获 IOException: " + e.getMessage());
        }
        
        // ParseException
        try {
            java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd");
            java.util.Date date = sdf.parse("invalid-date");
        } catch (java.text.ParseException e) {
            System.out.println("捕获 ParseException: " + e.getMessage());
        }
    }
    
    private static void demonstrateErrors() {
        System.out.println("\n--- 错误示例（仅演示） ---");
        
        // 注意：通常不应该捕获 Error
        try {
            // 模拟栈溢出（递归调用）
            // causeStackOverflow(); // 取消注释会导致栈溢出
            System.out.println("StackOverflowError 演示已跳过");
        } catch (StackOverflowError e) {
            System.out.println("捕获 StackOverflowError（不推荐）");
        }
    }
    
    private static void validateAge(int age) {
        if (age < 0 || age > 150) {
            throw new IllegalArgumentException("年龄必须在 0-150 之间，当前值: " + age);
        }
    }
    
    // 递归方法，会导致栈溢出
    private static void causeStackOverflow() {
        causeStackOverflow();
    }
}
```

### 6.2 常见异常类型详解

#### 6.2.1 运行时异常 (RuntimeException)

```java
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class RuntimeExceptionExamples {
    
    public static void main(String[] args) {
        System.out.println("=== 常见运行时异常详解 ===");
        
        // 1. NullPointerException
        demonstrateNPE();
        
        // 2. IllegalArgumentException
        demonstrateIllegalArgument();
        
        // 3. IllegalStateException
        demonstrateIllegalState();
        
        // 4. UnsupportedOperationException
        demonstrateUnsupportedOperation();
        
        // 5. ConcurrentModificationException
        demonstrateConcurrentModification();
    }
    
    private static void demonstrateNPE() {
        System.out.println("\n--- NullPointerException 示例 ---");
        
        // 常见的 NPE 场景
        String[] scenarios = {
            "字符串方法调用",
            "数组访问",
            "集合操作",
            "对象方法调用"
        };
        
        for (String scenario : scenarios) {
            try {
                switch (scenario) {
                    case "字符串方法调用":
                        String str = null;
                        str.length(); // NPE
                        break;
                    case "数组访问":
                        int[] array = null;
                        int length = array.length; // NPE
                        break;
                    case "集合操作":
                        List<String> list = null;
                        list.add("item"); // NPE
                        break;
                    case "对象方法调用":
                        Object obj = null;
                        obj.toString(); // NPE
                        break;
                }
            } catch (NullPointerException e) {
                System.out.println(scenario + " 导致 NPE: " + e.getMessage());
            }
        }
        
        // NPE 预防策略
        System.out.println("\n--- NPE 预防策略 ---");
        String nullableString = null;
        
        // 1. 使用 Objects.equals()
        boolean equals1 = Objects.equals(nullableString, "test");
        System.out.println("Objects.equals() 结果: " + equals1);
        
        // 2. 使用 Optional
        Optional<String> optional = Optional.ofNullable(nullableString);
        String result = optional.orElse("默认值");
        System.out.println("Optional 处理结果: " + result);
        
        // 3. 空值检查
        if (nullableString != null) {
            System.out.println("字符串长度: " + nullableString.length());
        } else {
            System.out.println("字符串为空，跳过处理");
        }
    }
    
    private static void demonstrateIllegalArgument() {
        System.out.println("\n--- IllegalArgumentException 示例 ---");
        
        try {
            // 参数验证示例
            validateEmail(""); // 空邮箱
        } catch (IllegalArgumentException e) {
            System.out.println("邮箱验证失败: " + e.getMessage());
        }
        
        try {
            validateAge(-1); // 负数年龄
        } catch (IllegalArgumentException e) {
            System.out.println("年龄验证失败: " + e.getMessage());
        }
        
        try {
            calculatePercentage(150); // 超出范围的百分比
        } catch (IllegalArgumentException e) {
            System.out.println("百分比计算失败: " + e.getMessage());
        }
    }
    
    private static void demonstrateIllegalState() {
        System.out.println("\n--- IllegalStateException 示例 ---");
        
        // 状态机示例
        StateMachine machine = new StateMachine();
        
        try {
            machine.stop(); // 尝试停止未启动的机器
        } catch (IllegalStateException e) {
            System.out.println("状态错误: " + e.getMessage());
        }
        
        machine.start();
        machine.stop(); // 正常停止
        System.out.println("状态机正常运行");
    }
    
    private static void demonstrateUnsupportedOperation() {
        System.out.println("\n--- UnsupportedOperationException 示例 ---");
        
        // 不可修改的集合
        List<String> immutableList = Collections.unmodifiableList(
            Arrays.asList("a", "b", "c"));
        
        try {
            immutableList.add("d"); // 尝试修改不可变集合
        } catch (UnsupportedOperationException e) {
            System.out.println("不支持的操作: " + e.getMessage());
        }
        
        // 只读视图
        Map<String, String> map = new HashMap<>();
        map.put("key1", "value1");
        Map<String, String> readOnlyMap = Collections.unmodifiableMap(map);
        
        try {
            readOnlyMap.put("key2", "value2"); // 尝试修改只读视图
        } catch (UnsupportedOperationException e) {
            System.out.println("只读视图修改失败: " + e.getMessage());
        }
    }
    
    private static void demonstrateConcurrentModification() {
        System.out.println("\n--- ConcurrentModificationException 示例 ---");
        
        List<String> list = new ArrayList<>(Arrays.asList("a", "b", "c", "d"));
        
        try {
            // 在迭代过程中修改集合
            for (String item : list) {
                if ("b".equals(item)) {
                    list.remove(item); // 会抛出 ConcurrentModificationException
                }
            }
        } catch (ConcurrentModificationException e) {
            System.out.println("并发修改异常: " + e.getMessage());
        }
        
        // 正确的做法：使用迭代器
        System.out.println("\n--- 正确的集合修改方式 ---");
        list = new ArrayList<>(Arrays.asList("a", "b", "c", "d"));
        Iterator<String> iterator = list.iterator();
        while (iterator.hasNext()) {
            String item = iterator.next();
            if ("b".equals(item)) {
                iterator.remove(); // 安全的删除方式
            }
        }
        System.out.println("修改后的集合: " + list);
    }
    
    // 辅助方法
    private static void validateEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("邮箱地址不能为空");
        }
        if (!email.contains("@")) {
            throw new IllegalArgumentException("邮箱地址格式不正确");
        }
    }
    
    private static void validateAge(int age) {
        if (age < 0 || age > 150) {
            throw new IllegalArgumentException("年龄必须在 0-150 之间，当前值: " + age);
        }
    }
    
    private static double calculatePercentage(int value) {
        if (value < 0 || value > 100) {
            throw new IllegalArgumentException("百分比值必须在 0-100 之间，当前值: " + value);
        }
        return value / 100.0;
    }
    
    // 状态机示例类
    private static class StateMachine {
        private boolean running = false;
        
        public void start() {
            if (running) {
                throw new IllegalStateException("状态机已经在运行中");
            }
            running = true;
            System.out.println("状态机已启动");
        }
        
        public void stop() {
            if (!running) {
                throw new IllegalStateException("状态机未启动，无法停止");
            }
            running = false;
            System.out.println("状态机已停止");
        }
    }
}
```

#### 6.2.2 检查异常 (Checked Exceptions)

```java
import java.io.*;
import java.net.*;
import java.sql.*;
import java.text.*;
import java.util.Date;

public class CheckedExceptionExamples {
    
    public static void main(String[] args) {
        System.out.println("=== 检查异常详解 ===");
        
        // 1. IOException 处理
        handleIOException();
        
        // 2. SQLException 处理
        handleSQLException();
        
        // 3. ParseException 处理
        handleParseException();
        
        // 4. 异常链和包装
        demonstrateExceptionChaining();
    }
    
    private static void handleIOException() {
        System.out.println("\n--- IOException 处理示例 ---");
        
        // 文件读取
        String filename = "test.txt";
        try (BufferedReader reader = new BufferedReader(new FileReader(filename))) {
            String line = reader.readLine();
            System.out.println("读取内容: " + line);
        } catch (FileNotFoundException e) {
            System.out.println("文件未找到: " + e.getMessage());
            // 可以尝试创建默认文件或使用备用文件
            createDefaultFile(filename);
        } catch (IOException e) {
            System.out.println("文件读取错误: " + e.getMessage());
        }
        
        // 网络连接
        try {
            URL url = new URL("http://example.com");
            URLConnection connection = url.openConnection();
            connection.setConnectTimeout(5000); // 5秒超时
            try (InputStream inputStream = connection.getInputStream()) {
                System.out.println("网络连接成功");
            }
        } catch (MalformedURLException e) {
            System.out.println("URL 格式错误: " + e.getMessage());
        } catch (IOException e) {
            System.out.println("网络连接失败: " + e.getMessage());
        }
    }
    
    private static void handleSQLException() {
        System.out.println("\n--- SQLException 处理示例 ---");
        
        // 模拟数据库操作
        String url = "jdbc:h2:mem:testdb";
        String sql = "SELECT * FROM users WHERE id = ?";
        
        try {
            // 注意：这里只是示例，实际需要添加 H2 数据库依赖
            // Connection conn = DriverManager.getConnection(url);
            // PreparedStatement stmt = conn.prepareStatement(sql);
            
            System.out.println("数据库连接示例（需要实际数据库驱动）");
            
        } catch (Exception e) {
            // 在实际应用中，这里会是 SQLException
            System.out.println("数据库操作失败: " + e.getMessage());
            
            // 异常处理策略
            if (e.getMessage().contains("connection")) {
                System.out.println("处理策略: 重试连接或使用备用数据源");
            } else if (e.getMessage().contains("syntax")) {
                System.out.println("处理策略: 检查 SQL 语法");
            } else {
                System.out.println("处理策略: 记录错误日志并通知管理员");
            }
        }
    }
    
    private static void handleParseException() {
        System.out.println("\n--- ParseException 处理示例 ---");
        
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
        String[] dateStrings = {
            "2023-12-25",    // 正确格式
            "25/12/2023",    // 错误格式
            "2023-13-45",    // 无效日期
            "invalid-date"   // 完全错误
        };
        
        for (String dateString : dateStrings) {
            try {
                Date date = sdf.parse(dateString);
                System.out.println("解析成功: " + dateString + " -> " + date);
            } catch (ParseException e) {
                System.out.println("解析失败: " + dateString + " (位置: " + e.getErrorOffset() + ")");
                
                // 尝试其他格式
                Date fallbackDate = tryAlternativeFormats(dateString);
                if (fallbackDate != null) {
                    System.out.println("  备用格式解析成功: " + fallbackDate);
                } else {
                    System.out.println("  所有格式都解析失败");
                }
            }
        }
    }
    
    private static void demonstrateExceptionChaining() {
        System.out.println("\n--- 异常链和包装示例 ---");
        
        try {
            processUserData("invalid-data");
        } catch (DataProcessingException e) {
            System.out.println("业务异常: " + e.getMessage());
            System.out.println("原始异常: " + e.getCause().getMessage());
            
            // 打印完整的异常链
            System.out.println("\n完整异常链:");
            Throwable current = e;
            int level = 0;
            while (current != null) {
                System.out.println("  ".repeat(level) + current.getClass().getSimpleName() + ": " + current.getMessage());
                current = current.getCause();
                level++;
            }
        }
    }
    
    // 辅助方法
    private static void createDefaultFile(String filename) {
        try (PrintWriter writer = new PrintWriter(new FileWriter(filename))) {
            writer.println("这是默认创建的文件内容");
            System.out.println("已创建默认文件: " + filename);
        } catch (IOException e) {
            System.out.println("创建默认文件失败: " + e.getMessage());
        }
    }
    
    private static Date tryAlternativeFormats(String dateString) {
        String[] formats = {
            "dd/MM/yyyy",
            "MM-dd-yyyy",
            "yyyy/MM/dd",
            "dd-MM-yyyy"
        };
        
        for (String format : formats) {
            try {
                SimpleDateFormat sdf = new SimpleDateFormat(format);
                return sdf.parse(dateString);
            } catch (ParseException e) {
                // 继续尝试下一个格式
            }
        }
        return null;
    }
    
    private static void processUserData(String data) throws DataProcessingException {
        try {
            // 模拟数据处理过程
            if ("invalid-data".equals(data)) {
                throw new IllegalArgumentException("数据格式不正确");
            }
            // 其他处理逻辑...
        } catch (IllegalArgumentException e) {
            // 包装异常，提供更多上下文信息
            throw new DataProcessingException("用户数据处理失败: " + data, e);
        }
    }
    
    // 自定义业务异常
    private static class DataProcessingException extends Exception {
        public DataProcessingException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
```

### 6.3 自定义异常设计

```java
/**
 * 自定义异常设计最佳实践
 */

// 1. 业务异常基类
abstract class BusinessException extends Exception {
    private final String errorCode;
    private final Object[] parameters;
    
    public BusinessException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
        this.parameters = new Object[0];
    }
    
    public BusinessException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.parameters = new Object[0];
    }
    
    public BusinessException(String errorCode, String message, Object... parameters) {
        super(message);
        this.errorCode = errorCode;
        this.parameters = parameters != null ? parameters.clone() : new Object[0];
    }
    
    public String getErrorCode() {
        return errorCode;
    }
    
    public Object[] getParameters() {
        return parameters.clone();
    }
    
    @Override
    public String toString() {
        return String.format("%s[%s]: %s", 
            getClass().getSimpleName(), errorCode, getMessage());
    }
}

// 2. 具体业务异常类
class UserNotFoundException extends BusinessException {
    public UserNotFoundException(String userId) {
        super("USER_NOT_FOUND", "用户不存在: " + userId, userId);
    }
}

class InvalidPasswordException extends BusinessException {
    public InvalidPasswordException() {
        super("INVALID_PASSWORD", "密码不正确");
    }
    
    public InvalidPasswordException(String reason) {
        super("INVALID_PASSWORD", "密码不正确: " + reason, reason);
    }
}

class AccountLockedException extends BusinessException {
    private final Date lockTime;
    private final int remainingMinutes;
    
    public AccountLockedException(Date lockTime, int remainingMinutes) {
        super("ACCOUNT_LOCKED", 
              String.format("账户已锁定，剩余时间: %d 分钟", remainingMinutes),
              lockTime, remainingMinutes);
        this.lockTime = lockTime;
        this.remainingMinutes = remainingMinutes;
    }
    
    public Date getLockTime() {
        return lockTime;
    }
    
    public int getRemainingMinutes() {
        return remainingMinutes;
    }
}

// 3. 系统异常类
class SystemException extends RuntimeException {
    private final String component;
    private final String operation;
    
    public SystemException(String component, String operation, String message) {
        super(String.format("[%s.%s] %s", component, operation, message));
        this.component = component;
        this.operation = operation;
    }
    
    public SystemException(String component, String operation, String message, Throwable cause) {
        super(String.format("[%s.%s] %s", component, operation, message), cause);
        this.component = component;
        this.operation = operation;
    }
    
    public String getComponent() {
        return component;
    }
    
    public String getOperation() {
        return operation;
    }
}

// 4. 验证异常类
class ValidationException extends BusinessException {
    private final java.util.List<String> violations;
    
    public ValidationException(java.util.List<String> violations) {
        super("VALIDATION_FAILED", "数据验证失败: " + String.join(", ", violations));
        this.violations = new java.util.ArrayList<>(violations);
    }
    
    public java.util.List<String> getViolations() {
        return new java.util.ArrayList<>(violations);
    }
}

// 5. 使用示例
public class CustomExceptionDemo {
    
    public static void main(String[] args) {
        System.out.println("=== 自定义异常使用示例 ===");
        
        UserService userService = new UserService();
        
        // 1. 用户不存在异常
        try {
            userService.getUser("nonexistent");
        } catch (UserNotFoundException e) {
            System.out.println("捕获异常: " + e);
            System.out.println("错误代码: " + e.getErrorCode());
        }
        
        // 2. 密码错误异常
        try {
            userService.login("user1", "wrongpassword");
        } catch (InvalidPasswordException e) {
            System.out.println("捕获异常: " + e);
        } catch (UserNotFoundException e) {
            System.out.println("捕获异常: " + e);
        }
        
        // 3. 账户锁定异常
        try {
            userService.login("lockeduser", "password");
        } catch (AccountLockedException e) {
            System.out.println("捕获异常: " + e);
            System.out.println("锁定时间: " + e.getLockTime());
            System.out.println("剩余分钟: " + e.getRemainingMinutes());
        } catch (Exception e) {
            System.out.println("其他异常: " + e);
        }
        
        // 4. 验证异常
        try {
            userService.createUser("", "short", "invalid-email");
        } catch (ValidationException e) {
            System.out.println("捕获异常: " + e);
            System.out.println("验证错误列表:");
            e.getViolations().forEach(violation -> 
                System.out.println("  - " + violation));
        }
        
        // 5. 系统异常
        try {
            userService.saveUser(new User("test", "password", "test@example.com"));
        } catch (SystemException e) {
            System.out.println("捕获异常: " + e);
            System.out.println("组件: " + e.getComponent());
            System.out.println("操作: " + e.getOperation());
        }
    }
    
    // 模拟用户服务
    private static class UserService {
        
        public User getUser(String userId) throws UserNotFoundException {
            if ("nonexistent".equals(userId)) {
                throw new UserNotFoundException(userId);
            }
            return new User(userId, "password", "user@example.com");
        }
        
        public User login(String userId, String password) 
                throws UserNotFoundException, InvalidPasswordException, AccountLockedException {
            
            if ("lockeduser".equals(userId)) {
                throw new AccountLockedException(new Date(), 15);
            }
            
            User user = getUser(userId);
            
            if (!"password".equals(password)) {
                throw new InvalidPasswordException("密码长度不足或包含非法字符");
            }
            
            return user;
        }
        
        public User createUser(String username, String password, String email) 
                throws ValidationException {
            
            java.util.List<String> violations = new java.util.ArrayList<>();
            
            if (username == null || username.trim().isEmpty()) {
                violations.add("用户名不能为空");
            }
            
            if (password == null || password.length() < 6) {
                violations.add("密码长度至少6位");
            }
            
            if (email == null || !email.contains("@")) {
                violations.add("邮箱格式不正确");
            }
            
            if (!violations.isEmpty()) {
                throw new ValidationException(violations);
            }
            
            return new User(username, password, email);
        }
        
        public void saveUser(User user) throws SystemException {
            try {
                // 模拟数据库保存操作
                if ("test".equals(user.getUsername())) {
                    throw new RuntimeException("数据库连接失败");
                }
            } catch (RuntimeException e) {
                throw new SystemException("UserService", "saveUser", "保存用户失败", e);
            }
        }
    }
    
    // 用户实体类
    private static class User {
        private String username;
        private String password;
        private String email;
        
        public User(String username, String password, String email) {
            this.username = username;
            this.password = password;
            this.email = email;
        }
        
        public String getUsername() { return username; }
        public String getPassword() { return password; }
        public String getEmail() { return email; }
    }
}
```

### 6.4 异常处理最佳实践

```java
import java.io.*;
import java.util.*;
import java.util.logging.Logger;
import java.util.logging.Level;

public class ExceptionBestPractices {
    
    private static final Logger logger = Logger.getLogger(ExceptionBestPractices.class.getName());
    
    public static void main(String[] args) {
        System.out.println("=== 异常处理最佳实践 ===");
        
        // 1. 资源管理
        demonstrateResourceManagement();
        
        // 2. 异常转换和包装
        demonstrateExceptionTranslation();
        
        // 3. 异常日志记录
        demonstrateExceptionLogging();
        
        // 4. 异常恢复策略
        demonstrateRecoveryStrategies();
        
        // 5. 性能考虑
        demonstratePerformanceConsiderations();
    }
    
    // 1. 资源管理最佳实践
    private static void demonstrateResourceManagement() {
        System.out.println("\n--- 资源管理最佳实践 ---");
        
        // ❌ 错误的做法
        System.out.println("错误的资源管理:");
        badResourceManagement();
        
        // ✅ 正确的做法 - try-with-resources
        System.out.println("\n正确的资源管理:");
        goodResourceManagement();
        
        // ✅ 多资源管理
        System.out.println("\n多资源管理:");
        multipleResourceManagement();
    }
    
    private static void badResourceManagement() {
        FileInputStream fis = null;
        try {
            fis = new FileInputStream("test.txt");
            // 处理文件...
        } catch (IOException e) {
            System.out.println("文件操作失败: " + e.getMessage());
        } finally {
            // ❌ 容易忘记关闭资源，且可能抛出异常
            if (fis != null) {
                try {
                    fis.close();
                } catch (IOException e) {
                    System.out.println("关闭文件失败: " + e.getMessage());
                }
            }
        }
    }
    
    private static void goodResourceManagement() {
        // ✅ try-with-resources 自动管理资源
        try (FileInputStream fis = new FileInputStream("test.txt")) {
            // 处理文件...
            System.out.println("文件处理完成");
        } catch (IOException e) {
            System.out.println("文件操作失败: " + e.getMessage());
        }
        // 资源会自动关闭，即使发生异常
    }
    
    private static void multipleResourceManagement() {
        try (FileInputStream fis = new FileInputStream("input.txt");
             FileOutputStream fos = new FileOutputStream("output.txt");
             BufferedInputStream bis = new BufferedInputStream(fis);
             BufferedOutputStream bos = new BufferedOutputStream(fos)) {
            
            // 处理多个资源...
            System.out.println("多资源处理完成");
            
        } catch (IOException e) {
            System.out.println("多资源操作失败: " + e.getMessage());
        }
        // 所有资源都会按照相反的顺序自动关闭
    }
    
    // 2. 异常转换和包装
    private static void demonstrateExceptionTranslation() {
        System.out.println("\n--- 异常转换和包装 ---");
        
        try {
            // 底层操作
            performLowLevelOperation();
        } catch (LowLevelException e) {
            // ✅ 转换为高层异常，保留原始异常信息
            throw new HighLevelException("高层操作失败", e);
        }
    }
    
    private static void performLowLevelOperation() throws LowLevelException {
        throw new LowLevelException("底层操作失败");
    }
    
    // 3. 异常日志记录
    private static void demonstrateExceptionLogging() {
        System.out.println("\n--- 异常日志记录 ---");
        
        try {
            riskyOperation();
        } catch (Exception e) {
            // ✅ 记录完整的异常信息
            logger.log(Level.SEVERE, "操作失败", e);
            
            // ✅ 根据异常类型记录不同级别的日志
            if (e instanceof IllegalArgumentException) {
                logger.warning("参数错误: " + e.getMessage());
            } else if (e instanceof IOException) {
                logger.severe("IO错误: " + e.getMessage());
            } else {
                logger.severe("未知错误: " + e.getMessage());
            }
            
            // ✅ 记录上下文信息
            logger.info("错误发生时的系统状态: " + getSystemState());
        }
    }
    
    // 4. 异常恢复策略
    private static void demonstrateRecoveryStrategies() {
        System.out.println("\n--- 异常恢复策略 ---");
        
        // 策略1: 重试机制
        retryStrategy();
        
        // 策略2: 降级处理
        fallbackStrategy();
        
        // 策略3: 断路器模式
        circuitBreakerStrategy();
    }
    
    private static void retryStrategy() {
        System.out.println("\n重试策略:");
        int maxRetries = 3;
        int retryCount = 0;
        
        while (retryCount < maxRetries) {
            try {
                unreliableOperation();
                System.out.println("操作成功");
                break;
            } catch (Exception e) {
                retryCount++;
                System.out.println("第 " + retryCount + " 次重试失败: " + e.getMessage());
                
                if (retryCount >= maxRetries) {
                    System.out.println("重试次数已达上限，操作最终失败");
                    break;
                }
                
                // 等待一段时间再重试
                try {
                    Thread.sleep(1000 * retryCount); // 指数退避
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
    }
    
    private static void fallbackStrategy() {
        System.out.println("\n降级策略:");
        
        try {
            String result = primaryService();
            System.out.println("主服务结果: " + result);
        } catch (Exception e) {
            System.out.println("主服务失败，使用备用服务: " + e.getMessage());
            
            try {
                String fallbackResult = fallbackService();
                System.out.println("备用服务结果: " + fallbackResult);
            } catch (Exception fallbackException) {
                System.out.println("备用服务也失败，使用默认值");
                String defaultResult = getDefaultValue();
                System.out.println("默认结果: " + defaultResult);
            }
        }
    }
    
    private static void circuitBreakerStrategy() {
        System.out.println("\n断路器策略:");
        
        CircuitBreaker circuitBreaker = new CircuitBreaker(3, 5000); // 3次失败，5秒恢复
        
        for (int i = 0; i < 10; i++) {
            try {
                String result = circuitBreaker.call(() -> flakyService());
                System.out.println("调用 " + (i + 1) + " 成功: " + result);
            } catch (Exception e) {
                System.out.println("调用 " + (i + 1) + " 失败: " + e.getMessage());
            }
            
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }
    
    // 5. 性能考虑
    private static void demonstratePerformanceConsiderations() {
        System.out.println("\n--- 性能考虑 ---");
        
        // ❌ 避免在循环中使用异常控制流程
        System.out.println("\n错误的异常使用:");
        long start = System.nanoTime();
        badExceptionUsage();
        long end = System.nanoTime();
        System.out.println("耗时: " + (end - start) / 1_000_000.0 + " ms");
        
        // ✅ 正确的做法
        System.out.println("\n正确的做法:");
        start = System.nanoTime();
        goodExceptionUsage();
        end = System.nanoTime();
        System.out.println("耗时: " + (end - start) / 1_000_000.0 + " ms");
    }
    
    private static void badExceptionUsage() {
        // ❌ 使用异常控制循环
        int[] array = {1, 2, 3, 4, 5};
        int i = 0;
        try {
            while (true) {
                System.out.print(array[i] + " ");
                i++;
            }
        } catch (ArrayIndexOutOfBoundsException e) {
            // 使用异常来结束循环
        }
        System.out.println();
    }
    
    private static void goodExceptionUsage() {
        // ✅ 使用正常的控制流程
        int[] array = {1, 2, 3, 4, 5};
        for (int value : array) {
            System.out.print(value + " ");
        }
        System.out.println();
    }
    
    // 辅助方法和类
    private static void riskyOperation() throws Exception {
        if (Math.random() > 0.5) {
            throw new IOException("随机IO异常");
        }
    }
    
    private static void unreliableOperation() throws Exception {
        if (Math.random() > 0.7) {
            throw new RuntimeException("不可靠操作失败");
        }
    }
    
    private static String primaryService() throws Exception {
        throw new Exception("主服务不可用");
    }
    
    private static String fallbackService() throws Exception {
        return "备用服务数据";
    }
    
    private static String getDefaultValue() {
        return "默认数据";
    }
    
    private static String flakyService() throws Exception {
        if (Math.random() > 0.6) {
            throw new Exception("服务暂时不可用");
        }
        return "服务正常";
    }
    
    private static String getSystemState() {
        return "内存使用: " + (Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory()) / 1024 / 1024 + "MB";
    }
    
    // 自定义异常类
    private static class LowLevelException extends Exception {
        public LowLevelException(String message) {
            super(message);
        }
    }
    
    private static class HighLevelException extends RuntimeException {
        public HighLevelException(String message, Throwable cause) {
            super(message, cause);
        }
    }
    
    // 简单的断路器实现
    private static class CircuitBreaker {
        private int failureCount = 0;
        private final int failureThreshold;
        private final long recoveryTimeout;
        private long lastFailureTime = 0;
        private boolean open = false;
        
        public CircuitBreaker(int failureThreshold, long recoveryTimeout) {
            this.failureThreshold = failureThreshold;
            this.recoveryTimeout = recoveryTimeout;
        }
        
        public String call(java.util.concurrent.Callable<String> operation) throws Exception {
            if (open) {
                if (System.currentTimeMillis() - lastFailureTime > recoveryTimeout) {
                    open = false;
                    failureCount = 0;
                    System.out.println("断路器恢复，尝试调用");
                } else {
                    throw new Exception("断路器开启，拒绝调用");
                }
            }
            
            try {
                String result = operation.call();
                failureCount = 0; // 成功时重置计数
                return result;
            } catch (Exception e) {
                failureCount++;
                lastFailureTime = System.currentTimeMillis();
                
                if (failureCount >= failureThreshold) {
                    open = true;
                    System.out.println("断路器开启，失败次数: " + failureCount);
                }
                
                throw e;
            }
        }
    }
}
```

## 7. 系统交互

### 7.1 系统信息和操作

```java
import java.util.Properties;

public class SystemUtilities {
    public static void main(String[] args) {
        // 系统时间
        System.out.println("=== 系统时间 ===");
        long currentTime = System.currentTimeMillis();
        System.out.println("当前时间戳: " + currentTime);
        
        long nanoTime = System.nanoTime();
        System.out.println("纳秒时间: " + nanoTime);
        
        // 性能测试示例
        long startTime = System.nanoTime();
        // 模拟一些操作
        for (int i = 0; i < 1000000; i++) {
            Math.sqrt(i);
        }
        long endTime = System.nanoTime();
        System.out.println("操作耗时: " + (endTime - startTime) / 1_000_000.0 + " ms");
        
        // 系统属性
        System.out.println("\n=== 系统属性 ===");
        System.out.println("Java版本: " + System.getProperty("java.version"));
        System.out.println("Java供应商: " + System.getProperty("java.vendor"));
        System.out.println("Java安装目录: " + System.getProperty("java.home"));
        System.out.println("操作系统: " + System.getProperty("os.name"));
        System.out.println("操作系统版本: " + System.getProperty("os.version"));
        System.out.println("操作系统架构: " + System.getProperty("os.arch"));
        System.out.println("用户名: " + System.getProperty("user.name"));
        System.out.println("用户主目录: " + System.getProperty("user.home"));
        System.out.println("当前工作目录: " + System.getProperty("user.dir"));
        System.out.println("文件分隔符: " + System.getProperty("file.separator"));
        System.out.println("路径分隔符: " + System.getProperty("path.separator"));
        System.out.println("行分隔符: " + System.getProperty("line.separator").replace("\n", "\\n").replace("\r", "\\r"));
        
        // 所有系统属性
         System.out.println("\n=== 所有系统属性 ===");
         Properties props = System.getProperties();
         props.forEach((key, value) -> {
             if (key.toString().startsWith("java.") || key.toString().startsWith("os.")) {
                 System.out.println(key + " = " + value);
             }
         });
         
         // 环境变量
         System.out.println("\n=== 环境变量 ===");
         String javaHome = System.getenv("JAVA_HOME");
         String path = System.getenv("PATH");
         System.out.println("JAVA_HOME: " + javaHome);
         System.out.println("PATH: " + (path != null ? path.substring(0, Math.min(100, path.length())) + "..." : "null"));
         
         // 数组复制
         System.out.println("\n=== 数组复制 ===");
         int[] source = {1, 2, 3, 4, 5};
         int[] dest = new int[5];
         System.arraycopy(source, 0, dest, 0, source.length);
         System.out.println("源数组: " + java.util.Arrays.toString(source));
         System.out.println("目标数组: " + java.util.Arrays.toString(dest));
         
         // 部分复制
         int[] partialDest = new int[3];
         System.arraycopy(source, 1, partialDest, 0, 3);
         System.out.println("部分复制[1-3]: " + java.util.Arrays.toString(partialDest));
         
         // 垃圾回收
         System.out.println("\n=== 垃圾回收 ===");
         Runtime runtime = Runtime.getRuntime();
         long beforeGC = runtime.freeMemory();
         System.out.println("GC前空闲内存: " + beforeGC / 1024 / 1024 + " MB");
         
         System.gc(); // 建议进行垃圾回收
         
         long afterGC = runtime.freeMemory();
         System.out.println("GC后空闲内存: " + afterGC / 1024 / 1024 + " MB");
         
         // 程序退出
         System.out.println("\n=== 程序退出 ===");
         System.out.println("正常结束程序");
         // System.exit(0); // 正常退出
         // System.exit(1); // 异常退出
     }
 }
 ```

### 7.2 系统工具方法

```java
import java.io.Console;
import java.util.Scanner;

public class SystemHelper {
    
    // 获取系统信息
    public static void printSystemInfo() {
        System.out.println("=== 系统信息摘要 ===");
        System.out.println("Java版本: " + System.getProperty("java.version"));
        System.out.println("操作系统: " + System.getProperty("os.name") + " " + System.getProperty("os.version"));
        System.out.println("用户目录: " + System.getProperty("user.home"));
        System.out.println("工作目录: " + System.getProperty("user.dir"));
        
        Runtime runtime = Runtime.getRuntime();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = totalMemory - freeMemory;
        
        System.out.println("总内存: " + totalMemory / 1024 / 1024 + " MB");
        System.out.println("已用内存: " + usedMemory / 1024 / 1024 + " MB");
        System.out.println("空闲内存: " + freeMemory / 1024 / 1024 + " MB");
        System.out.println("处理器核心数: " + runtime.availableProcessors());
    }
    
    // 性能计时器
    public static class Timer {
        private long startTime;
        private String name;
        
        public Timer(String name) {
            this.name = name;
            this.startTime = System.nanoTime();
        }
        
        public void stop() {
            long endTime = System.nanoTime();
            double duration = (endTime - startTime) / 1_000_000.0;
            System.out.println(name + " 耗时: " + duration + " ms");
        }
    }
    
    // 安全的数组复制
    public static <T> T[] safeCopy(T[] source, int srcPos, int length) {
        if (source == null) {
            throw new IllegalArgumentException("源数组不能为空");
        }
        if (srcPos < 0 || srcPos >= source.length) {
            throw new IndexOutOfBoundsException("起始位置超出范围");
        }
        if (length < 0 || srcPos + length > source.length) {
            throw new IllegalArgumentException("复制长度无效");
        }
        
        @SuppressWarnings("unchecked")
        T[] result = (T[]) java.lang.reflect.Array.newInstance(
            source.getClass().getComponentType(), length);
        System.arraycopy(source, srcPos, result, 0, length);
        return result;
    }
    
    // 读取用户输入（安全方式）
    public static String readPassword(String prompt) {
        Console console = System.console();
        if (console != null) {
            char[] password = console.readPassword(prompt);
            return new String(password);
        } else {
            // 在IDE中运行时的备选方案
            System.out.print(prompt);
            Scanner scanner = new Scanner(System.in);
            return scanner.nextLine();
        }
    }
    
    public static void main(String[] args) {
        // 系统信息
        printSystemInfo();
        
        // 性能计时
        System.out.println("\n=== 性能计时示例 ===");
        Timer timer = new Timer("数组排序");
        int[] array = new int[100000];
        for (int i = 0; i < array.length; i++) {
            array[i] = (int) (Math.random() * 1000);
        }
        java.util.Arrays.sort(array);
        timer.stop();
        
        // 安全数组复制
        System.out.println("\n=== 安全数组复制 ===");
        String[] names = {"Alice", "Bob", "Charlie", "David", "Eve"};
        String[] subset = safeCopy(names, 1, 3);
        System.out.println("原数组: " + java.util.Arrays.toString(names));
        System.out.println("复制结果: " + java.util.Arrays.toString(subset));
        
        // 密码读取示例（注释掉避免阻塞）
        // System.out.println("\n=== 密码读取 ===");
        // String password = readPassword("请输入密码: ");
        // System.out.println("密码长度: " + password.length());
    }
}
```

## 8. Runtime 类

### 8.1 运行时环境操作

```java
import java.io.IOException;

public class RuntimeUtilities {
    public static void main(String[] args) {
        Runtime runtime = Runtime.getRuntime();
        
        // 内存信息
        System.out.println("=== 内存信息 ===");
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long maxMemory = runtime.maxMemory();
        long usedMemory = totalMemory - freeMemory;
        
        System.out.println("最大内存: " + maxMemory / 1024 / 1024 + " MB");
        System.out.println("总分配内存: " + totalMemory / 1024 / 1024 + " MB");
        System.out.println("已使用内存: " + usedMemory / 1024 / 1024 + " MB");
        System.out.println("空闲内存: " + freeMemory / 1024 / 1024 + " MB");
        System.out.println("内存使用率: " + String.format("%.2f%%", (double) usedMemory / totalMemory * 100));
        
        // 处理器信息
        System.out.println("\n=== 处理器信息 ===");
        int processors = runtime.availableProcessors();
        System.out.println("可用处理器核心数: " + processors);
        
        // 垃圾回收
        System.out.println("\n=== 垃圾回收 ===");
        System.out.println("GC前空闲内存: " + runtime.freeMemory() / 1024 / 1024 + " MB");
        
        // 创建一些对象来消耗内存
        for (int i = 0; i < 100000; i++) {
            new String("临时对象" + i);
        }
        
        System.out.println("创建对象后空闲内存: " + runtime.freeMemory() / 1024 / 1024 + " MB");
        
        runtime.gc(); // 建议进行垃圾回收
        
        // 等待一下让GC完成
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        System.out.println("GC后空闲内存: " + runtime.freeMemory() / 1024 / 1024 + " MB");
        
        // 执行外部命令（跨平台示例）
        System.out.println("\n=== 执行外部命令 ===");
        try {
            String os = System.getProperty("os.name").toLowerCase();
            Process process;
            
            if (os.contains("win")) {
                // Windows
                process = runtime.exec("cmd /c echo Hello from Windows");
            } else {
                // Unix/Linux/Mac
                process = runtime.exec("echo Hello from Unix/Linux/Mac");
            }
            
            // 等待命令执行完成
            int exitCode = process.waitFor();
            System.out.println("命令执行完成，退出码: " + exitCode);
            
            // 读取命令输出
            java.io.BufferedReader reader = new java.io.BufferedReader(
                new java.io.InputStreamReader(process.getInputStream()));
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println("输出: " + line);
            }
            reader.close();
            
        } catch (IOException | InterruptedException e) {
            System.out.println("执行命令时出错: " + e.getMessage());
        }
        
        // 关闭钩子
        System.out.println("\n=== 关闭钩子 ===");
        runtime.addShutdownHook(new Thread(() -> {
            System.out.println("程序正在关闭，执行清理操作...");
            // 这里可以添加清理代码
        }));
        
        System.out.println("已添加关闭钩子");
        
        // 内存监控示例
        System.out.println("\n=== 内存监控 ===");
        monitorMemory();
    }
    
    private static void monitorMemory() {
        Runtime runtime = Runtime.getRuntime();
        
        for (int i = 0; i < 5; i++) {
            long used = runtime.totalMemory() - runtime.freeMemory();
            System.out.printf("第%d次检查 - 已用内存: %d MB\n", 
                i + 1, used / 1024 / 1024);
            
            // 创建一些对象
            java.util.List<String> list = new java.util.ArrayList<>();
            for (int j = 0; j < 10000; j++) {
                list.add("测试字符串" + j);
            }
            
            try {
                Thread.sleep(500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }
}
```

### 8.2 进程管理工具

```java
import java.io.*;
import java.util.concurrent.TimeUnit;

public class ProcessManager {
    
    // 执行命令并获取输出
    public static String executeCommand(String command) throws IOException, InterruptedException {
        Process process = Runtime.getRuntime().exec(command);
        
        // 读取标准输出
        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }
        }
        
        // 等待进程完成
        boolean finished = process.waitFor(10, TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            throw new InterruptedException("命令执行超时");
        }
        
        return output.toString().trim();
    }
    
    // 执行命令并实时输出
    public static int executeCommandWithRealTimeOutput(String command) throws IOException, InterruptedException {
        ProcessBuilder pb = new ProcessBuilder();
        
        // 根据操作系统设置命令
        String os = System.getProperty("os.name").toLowerCase();
        if (os.contains("win")) {
            pb.command("cmd", "/c", command);
        } else {
            pb.command("sh", "-c", command);
        }
        
        pb.redirectErrorStream(true); // 合并错误流和输出流
        Process process = pb.start();
        
        // 实时读取输出
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println("[输出] " + line);
            }
        }
        
        return process.waitFor();
    }
    
    // 获取系统信息
    public static void getSystemInfo() {
        try {
            String os = System.getProperty("os.name").toLowerCase();
            
            if (os.contains("win")) {
                System.out.println("=== Windows 系统信息 ===");
                System.out.println("系统版本:");
                System.out.println(executeCommand("ver"));
                
                System.out.println("\n内存信息:");
                System.out.println(executeCommand("wmic OS get TotalVisibleMemorySize,FreePhysicalMemory /format:list"));
                
            } else {
                System.out.println("=== Unix/Linux/Mac 系统信息 ===");
                System.out.println("系统版本:");
                System.out.println(executeCommand("uname -a"));
                
                System.out.println("\n内存信息:");
                try {
                    System.out.println(executeCommand("free -h"));
                } catch (Exception e) {
                    // Mac 系统可能没有 free 命令
                    System.out.println(executeCommand("vm_stat"));
                }
                
                System.out.println("\n磁盘使用:");
                System.out.println(executeCommand("df -h"));
            }
            
        } catch (Exception e) {
            System.out.println("获取系统信息时出错: " + e.getMessage());
        }
    }
    
    public static void main(String[] args) {
        System.out.println("=== 进程管理示例 ===");
        
        try {
            // 简单命令执行
            String os = System.getProperty("os.name").toLowerCase();
            String dateCommand = os.contains("win") ? "date /t" : "date";
            String result = executeCommand(dateCommand);
            System.out.println("当前日期: " + result);
            
            // 实时输出示例
            System.out.println("\n=== 实时输出示例 ===");
            String listCommand = os.contains("win") ? "dir" : "ls -la";
            int exitCode = executeCommandWithRealTimeOutput(listCommand);
            System.out.println("命令执行完成，退出码: " + exitCode);
            
        } catch (Exception e) {
            System.out.println("执行命令时出错: " + e.getMessage());
        }
        
        // 获取详细系统信息
        System.out.println("\n=== 详细系统信息 ===");
        getSystemInfo();
    }
}
```

## 9. 总结

### 9.1 工具类使用最佳实践

1. **Object 类**
   - 重写 `equals()` 时必须重写 `hashCode()`
   - 使用 `Objects.equals()` 进行空值安全比较
   - 合理使用 `toString()` 方法便于调试

2. **String 类**
   - 大量字符串拼接使用 `StringBuilder`
   - 利用字符串池提高性能
   - 使用 `String.format()` 进行格式化

3. **Math 类**
   - 使用合适的数学函数提高代码可读性
   - 注意浮点数精度问题
   - 随机数生成考虑使用 `Random` 类

4. **Arrays 类**
   - 排序前确保数组元素可比较
   - 二分查找要求数组已排序
   - 使用流操作简化数组处理

5. **Collections 类**
   - 选择合适的集合类型
   - 使用不可变集合保证数据安全
   - 自定义比较器实现复杂排序

6. **Objects 类**
   - 使用空值安全方法避免 NPE
   - 利用 `requireNonNull()` 进行参数验证
   - 使用 `hash()` 方法计算组合哈希码

7. **System 类**
   - 使用 `nanoTime()` 进行精确计时
   - 合理使用系统属性获取环境信息
   - 谨慎使用 `System.exit()`

8. **Runtime 类**
   - 监控内存使用情况
   - 合理使用垃圾回收建议
   - 安全执行外部命令

### 9.2 性能优化建议

- 避免在循环中创建大量临时对象
- 使用合适的数据结构和算法
- 利用并行处理提高性能
- 合理使用缓存机制
- 注意内存泄漏问题

### 9.3 安全注意事项

- 验证输入参数的有效性
- 使用空值安全的方法
- 避免执行不可信的外部命令
- 保护敏感信息不被泄露
- 合理处理异常情况

这些基础工具类是 Java 开发的基石，熟练掌握它们的使用方法和最佳实践，能够显著提高开发效率和代码质量。在实际项目中，应该根据具体需求选择合适的工具类和方法，并注意性能和安全方面的考虑。