# Java 基础语法详解

## 概述

Java 是一种面向对象的编程语言，具有简洁、安全、可移植等特点。本文档详细介绍 Java 的基础语法，包含丰富的代码示例，帮助开发者快速掌握 Java 编程基础。

## 1. 基本程序结构

### 1.1 Hello World 程序

```java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
```

**语法要点：**
- `public class` 定义公共类
- 类名必须与文件名相同
- `main` 方法是程序入口点
- `System.out.println()` 用于输出

### 1.2 包声明和导入

```java
package com.example.demo;  // 包声明

import java.util.List;     // 导入单个类
import java.util.*;        // 导入整个包
import static java.lang.Math.PI;  // 静态导入

public class PackageExample {
    public static void main(String[] args) {
        System.out.println("PI = " + PI);
    }
}
```

## 2. 变量和数据类型

### 2.1 基本数据类型

```java
public class DataTypes {
    public static void main(String[] args) {
        // 整数类型
        byte b = 127;           // 8位，-128 到 127
        short s = 32767;        // 16位，-32768 到 32767
        int i = 2147483647;     // 32位，-2^31 到 2^31-1
        long l = 9223372036854775807L;  // 64位，需要L后缀
        
        // 浮点类型
        float f = 3.14f;        // 32位，需要f后缀
        double d = 3.14159;     // 64位，默认浮点类型
        
        // 字符类型
        char c = 'A';           // 16位Unicode字符
        char unicode = '\u0041'; // Unicode表示法
        
        // 布尔类型
        boolean flag = true;    // 只有true和false
        
        System.out.println("byte: " + b);
        System.out.println("short: " + s);
        System.out.println("int: " + i);
        System.out.println("long: " + l);
        System.out.println("float: " + f);
        System.out.println("double: " + d);
        System.out.println("char: " + c);
        System.out.println("boolean: " + flag);
    }
}
```

### 2.2 引用数据类型

```java
public class ReferenceTypes {
    public static void main(String[] args) {
        // 字符串
        String str1 = "Hello";          // 字符串字面量
        String str2 = new String("World"); // 通过构造器创建
        
        // 数组
        int[] numbers = {1, 2, 3, 4, 5};  // 数组初始化
        String[] names = new String[3];   // 指定长度的数组
        names[0] = "Alice";
        names[1] = "Bob";
        names[2] = "Charlie";
        
        // 多维数组
        int[][] matrix = {
            {1, 2, 3},
            {4, 5, 6},
            {7, 8, 9}
        };
        
        System.out.println("String: " + str1 + " " + str2);
        System.out.println("Array length: " + numbers.length);
        System.out.println("Matrix[1][1]: " + matrix[1][1]);
    }
}
```

### 2.3 变量声明和初始化

```java
public class Variables {
    // 实例变量（成员变量）
    private int instanceVar = 10;
    
    // 静态变量（类变量）
    private static String staticVar = "Static";
    
    // 常量
    private static final double PI = 3.14159;
    
    public void method() {
        // 局部变量
        int localVar = 20;
        
        // final 局部变量（常量）
        final int CONSTANT = 100;
        
        System.out.println("Instance: " + instanceVar);
        System.out.println("Static: " + staticVar);
        System.out.println("Local: " + localVar);
        System.out.println("Constant: " + CONSTANT);
    }
}
```

## 3. 运算符

### 3.1 算术运算符

```java
public class ArithmeticOperators {
    public static void main(String[] args) {
        int a = 10, b = 3;
        
        System.out.println("a + b = " + (a + b));  // 加法：13
        System.out.println("a - b = " + (a - b));  // 减法：7
        System.out.println("a * b = " + (a * b));  // 乘法：30
        System.out.println("a / b = " + (a / b));  // 除法：3（整数除法）
        System.out.println("a % b = " + (a % b));  // 取模：1
        
        // 自增自减
        int c = 5;
        System.out.println("c++ = " + (c++));     // 后置自增：5
        System.out.println("c = " + c);           // 6
        System.out.println("++c = " + (++c));     // 前置自增：7
        System.out.println("c-- = " + (c--));     // 后置自减：7
        System.out.println("--c = " + (--c));     // 前置自减：5
    }
}
```

### 3.2 关系运算符

```java
public class RelationalOperators {
    public static void main(String[] args) {
        int x = 10, y = 20;
        
        System.out.println("x == y: " + (x == y));  // 等于：false
        System.out.println("x != y: " + (x != y));  // 不等于：true
        System.out.println("x > y: " + (x > y));    // 大于：false
        System.out.println("x < y: " + (x < y));    // 小于：true
        System.out.println("x >= y: " + (x >= y));  // 大于等于：false
        System.out.println("x <= y: " + (x <= y));  // 小于等于：true
        
        // 字符串比较
        String str1 = "Hello";
        String str2 = "Hello";
        String str3 = new String("Hello");
        
        System.out.println("str1 == str2: " + (str1 == str2));        // true（字符串池）
        System.out.println("str1 == str3: " + (str1 == str3));        // false（不同对象）
        System.out.println("str1.equals(str3): " + str1.equals(str3)); // true（内容相同）
    }
}
```

### 3.3 逻辑运算符

```java
public class LogicalOperators {
    public static void main(String[] args) {
        boolean a = true, b = false;
        
        System.out.println("a && b: " + (a && b));  // 逻辑与：false
        System.out.println("a || b: " + (a || b));  // 逻辑或：true
        System.out.println("!a: " + (!a));          // 逻辑非：false
        
        // 短路运算
        int x = 5, y = 0;
        if (y != 0 && x / y > 2) {  // 短路与，y != 0 为false，不会执行 x / y
            System.out.println("This won't print");
        }
        
        if (y == 0 || x / y > 2) {  // 短路或，y == 0 为true，不会执行 x / y
            System.out.println("Short circuit OR works");
        }
    }
}
```

### 3.4 位运算符

```java
public class BitwiseOperators {
    public static void main(String[] args) {
        int a = 60;  // 0011 1100
        int b = 13;  // 0000 1101
        
        System.out.println("a & b: " + (a & b));   // 按位与：12 (0000 1100)
        System.out.println("a | b: " + (a | b));   // 按位或：61 (0011 1101)
        System.out.println("a ^ b: " + (a ^ b));   // 按位异或：49 (0011 0001)
        System.out.println("~a: " + (~a));         // 按位取反：-61
        System.out.println("a << 2: " + (a << 2)); // 左移：240 (1111 0000)
        System.out.println("a >> 2: " + (a >> 2)); // 右移：15 (0000 1111)
        System.out.println("a >>> 2: " + (a >>> 2)); // 无符号右移：15
    }
}
```

### 3.5 赋值运算符

```java
public class AssignmentOperators {
    public static void main(String[] args) {
        int a = 10;
        
        a += 5;  // a = a + 5，结果：15
        System.out.println("a += 5: " + a);
        
        a -= 3;  // a = a - 3，结果：12
        System.out.println("a -= 3: " + a);
        
        a *= 2;  // a = a * 2，结果：24
        System.out.println("a *= 2: " + a);
        
        a /= 4;  // a = a / 4，结果：6
        System.out.println("a /= 4: " + a);
        
        a %= 4;  // a = a % 4，结果：2
        System.out.println("a %= 4: " + a);
        
        a <<= 2; // a = a << 2，结果：8
        System.out.println("a <<= 2: " + a);
        
        a >>= 1; // a = a >> 1，结果：4
        System.out.println("a >>= 1: " + a);
    }
}
```

## 4. 控制结构

### 4.1 条件语句

```java
public class ConditionalStatements {
    public static void main(String[] args) {
        int score = 85;
        
        // if-else 语句
        if (score >= 90) {
            System.out.println("优秀");
        } else if (score >= 80) {
            System.out.println("良好");
        } else if (score >= 70) {
            System.out.println("中等");
        } else if (score >= 60) {
            System.out.println("及格");
        } else {
            System.out.println("不及格");
        }
        
        // 三元运算符
        String result = score >= 60 ? "及格" : "不及格";
        System.out.println("三元运算符结果: " + result);
        
        // switch 语句
        int dayOfWeek = 3;
        switch (dayOfWeek) {
            case 1:
                System.out.println("星期一");
                break;
            case 2:
                System.out.println("星期二");
                break;
            case 3:
                System.out.println("星期三");
                break;
            case 4:
                System.out.println("星期四");
                break;
            case 5:
                System.out.println("星期五");
                break;
            case 6:
            case 7:
                System.out.println("周末");
                break;
            default:
                System.out.println("无效的日期");
        }
        
        // Java 14+ switch 表达式
        String dayName = switch (dayOfWeek) {
            case 1 -> "星期一";
            case 2 -> "星期二";
            case 3 -> "星期三";
            case 4 -> "星期四";
            case 5 -> "星期五";
            case 6, 7 -> "周末";
            default -> "无效日期";
        };
        System.out.println("Switch表达式: " + dayName);
    }
}
```

### 4.2 循环语句

```java
public class LoopStatements {
    public static void main(String[] args) {
        // for 循环
        System.out.println("=== for 循环 ===");
        for (int i = 1; i <= 5; i++) {
            System.out.println("i = " + i);
        }
        
        // 增强型 for 循环（for-each）
        System.out.println("\n=== 增强型 for 循环 ===");
        int[] numbers = {1, 2, 3, 4, 5};
        for (int num : numbers) {
            System.out.println("num = " + num);
        }
        
        // while 循环
        System.out.println("\n=== while 循环 ===");
        int j = 1;
        while (j <= 3) {
            System.out.println("j = " + j);
            j++;
        }
        
        // do-while 循环
        System.out.println("\n=== do-while 循环 ===");
        int k = 1;
        do {
            System.out.println("k = " + k);
            k++;
        } while (k <= 3);
        
        // 嵌套循环
        System.out.println("\n=== 嵌套循环（九九乘法表） ===");
        for (int x = 1; x <= 9; x++) {
            for (int y = 1; y <= x; y++) {
                System.out.print(y + "×" + x + "=" + (x * y) + "\t");
            }
            System.out.println();
        }
    }
}
```

### 4.3 跳转语句

```java
public class JumpStatements {
    public static void main(String[] args) {
        // break 语句
        System.out.println("=== break 语句 ===");
        for (int i = 1; i <= 10; i++) {
            if (i == 5) {
                break;  // 跳出循环
            }
            System.out.println("i = " + i);
        }
        
        // continue 语句
        System.out.println("\n=== continue 语句 ===");
        for (int i = 1; i <= 5; i++) {
            if (i == 3) {
                continue;  // 跳过本次循环
            }
            System.out.println("i = " + i);
        }
        
        // 标签和 break
        System.out.println("\n=== 标签和 break ===");
        outer: for (int i = 1; i <= 3; i++) {
            for (int j = 1; j <= 3; j++) {
                if (i == 2 && j == 2) {
                    break outer;  // 跳出外层循环
                }
                System.out.println("i=" + i + ", j=" + j);
            }
        }
        
        // return 语句
        System.out.println("\n=== return 语句 ===");
        int result = calculateSum(5);
        System.out.println("Sum = " + result);
    }
    
    public static int calculateSum(int n) {
        int sum = 0;
        for (int i = 1; i <= n; i++) {
            sum += i;
            if (sum > 10) {
                return sum;  // 提前返回
            }
        }
        return sum;
    }
}
```

## 5. 方法（函数）

### 5.1 方法定义和调用

```java
public class Methods {
    // 无参数无返回值的方法
    public static void sayHello() {
        System.out.println("Hello, World!");
    }
    
    // 有参数无返回值的方法
    public static void greet(String name) {
        System.out.println("Hello, " + name + "!");
    }
    
    // 有参数有返回值的方法
    public static int add(int a, int b) {
        return a + b;
    }
    
    // 多个参数的方法
    public static double calculateArea(double length, double width) {
        return length * width;
    }
    
    // 可变参数的方法
    public static int sum(int... numbers) {
        int total = 0;
        for (int num : numbers) {
            total += num;
        }
        return total;
    }
    
    // 方法重载
    public static int multiply(int a, int b) {
        return a * b;
    }
    
    public static double multiply(double a, double b) {
        return a * b;
    }
    
    public static int multiply(int a, int b, int c) {
        return a * b * c;
    }
    
    public static void main(String[] args) {
        // 调用方法
        sayHello();
        greet("Alice");
        
        int result = add(5, 3);
        System.out.println("5 + 3 = " + result);
        
        double area = calculateArea(5.5, 3.2);
        System.out.println("面积 = " + area);
        
        // 可变参数调用
        int sum1 = sum(1, 2, 3);
        int sum2 = sum(1, 2, 3, 4, 5);
        System.out.println("Sum1 = " + sum1);
        System.out.println("Sum2 = " + sum2);
        
        // 方法重载调用
        System.out.println("int multiply: " + multiply(3, 4));
        System.out.println("double multiply: " + multiply(3.5, 2.5));
        System.out.println("three int multiply: " + multiply(2, 3, 4));
    }
}
```

### 5.2 递归方法

```java
public class RecursiveMethods {
    // 计算阶乘
    public static long factorial(int n) {
        if (n <= 1) {
            return 1;  // 基础情况
        }
        return n * factorial(n - 1);  // 递归调用
    }
    
    // 计算斐波那契数列
    public static int fibonacci(int n) {
        if (n <= 1) {
            return n;
        }
        return fibonacci(n - 1) + fibonacci(n - 2);
    }
    
    // 二分查找（递归实现）
    public static int binarySearch(int[] arr, int target, int left, int right) {
        if (left > right) {
            return -1;  // 未找到
        }
        
        int mid = left + (right - left) / 2;
        
        if (arr[mid] == target) {
            return mid;
        } else if (arr[mid] > target) {
            return binarySearch(arr, target, left, mid - 1);
        } else {
            return binarySearch(arr, target, mid + 1, right);
        }
    }
    
    public static void main(String[] args) {
        // 阶乘示例
        System.out.println("5! = " + factorial(5));
        
        // 斐波那契数列
        System.out.print("斐波那契数列前10项: ");
        for (int i = 0; i < 10; i++) {
            System.out.print(fibonacci(i) + " ");
        }
        System.out.println();
        
        // 二分查找
        int[] sortedArray = {1, 3, 5, 7, 9, 11, 13, 15};
        int index = binarySearch(sortedArray, 7, 0, sortedArray.length - 1);
        System.out.println("元素7的索引: " + index);
    }
}
```

## 6. 数组操作

### 6.1 一维数组

```java
import java.util.Arrays;

public class ArrayOperations {
    public static void main(String[] args) {
        // 数组声明和初始化
        int[] numbers1 = {1, 2, 3, 4, 5};  // 直接初始化
        int[] numbers2 = new int[5];       // 指定长度
        int[] numbers3 = new int[]{6, 7, 8, 9, 10};  // 匿名数组
        
        // 数组赋值
        for (int i = 0; i < numbers2.length; i++) {
            numbers2[i] = (i + 1) * 10;
        }
        
        // 数组遍历
        System.out.println("=== 传统for循环遍历 ===");
        for (int i = 0; i < numbers1.length; i++) {
            System.out.println("numbers1[" + i + "] = " + numbers1[i]);
        }
        
        System.out.println("\n=== 增强型for循环遍历 ===");
        for (int num : numbers2) {
            System.out.println("num = " + num);
        }
        
        // 数组工具类使用
        System.out.println("\n=== Arrays工具类 ===");
        System.out.println("numbers1: " + Arrays.toString(numbers1));
        
        // 数组排序
        int[] unsorted = {5, 2, 8, 1, 9, 3};
        System.out.println("排序前: " + Arrays.toString(unsorted));
        Arrays.sort(unsorted);
        System.out.println("排序后: " + Arrays.toString(unsorted));
        
        // 数组查找
        int index = Arrays.binarySearch(unsorted, 5);
        System.out.println("元素5的索引: " + index);
        
        // 数组复制
        int[] copied = Arrays.copyOf(numbers1, numbers1.length);
        System.out.println("复制的数组: " + Arrays.toString(copied));
        
        // 数组填充
        int[] filled = new int[5];
        Arrays.fill(filled, 100);
        System.out.println("填充的数组: " + Arrays.toString(filled));
    }
}
```

### 6.2 多维数组

```java
public class MultiDimensionalArrays {
    public static void main(String[] args) {
        // 二维数组
        int[][] matrix = {
            {1, 2, 3},
            {4, 5, 6},
            {7, 8, 9}
        };
        
        // 动态创建二维数组
        int[][] dynamicMatrix = new int[3][3];
        int value = 1;
        for (int i = 0; i < dynamicMatrix.length; i++) {
            for (int j = 0; j < dynamicMatrix[i].length; j++) {
                dynamicMatrix[i][j] = value++;
            }
        }
        
        // 遍历二维数组
        System.out.println("=== 二维数组遍历 ===");
        for (int i = 0; i < matrix.length; i++) {
            for (int j = 0; j < matrix[i].length; j++) {
                System.out.print(matrix[i][j] + " ");
            }
            System.out.println();
        }
        
        // 增强型for循环遍历二维数组
        System.out.println("\n=== 增强型for循环遍历 ===");
        for (int[] row : matrix) {
            for (int element : row) {
                System.out.print(element + " ");
            }
            System.out.println();
        }
        
        // 不规则数组（锯齿数组）
        int[][] jaggedArray = new int[3][];
        jaggedArray[0] = new int[2];
        jaggedArray[1] = new int[3];
        jaggedArray[2] = new int[4];
        
        // 填充锯齿数组
        for (int i = 0; i < jaggedArray.length; i++) {
            for (int j = 0; j < jaggedArray[i].length; j++) {
                jaggedArray[i][j] = (i + 1) * (j + 1);
            }
        }
        
        System.out.println("\n=== 锯齿数组 ===");
        for (int[] row : jaggedArray) {
            System.out.println(Arrays.toString(row));
        }
        
        // 三维数组
        int[][][] cube = new int[2][3][4];
        int count = 1;
        for (int i = 0; i < cube.length; i++) {
            for (int j = 0; j < cube[i].length; j++) {
                for (int k = 0; k < cube[i][j].length; k++) {
                    cube[i][j][k] = count++;
                }
            }
        }
        
        System.out.println("\n=== 三维数组 ===");
        for (int i = 0; i < cube.length; i++) {
            System.out.println("层 " + i + ":");
            for (int j = 0; j < cube[i].length; j++) {
                System.out.println(Arrays.toString(cube[i][j]));
            }
        }
    }
}
```

## 7. 字符串操作

### 7.1 字符串基本操作

```java
public class StringOperations {
    public static void main(String[] args) {
        // 字符串创建
        String str1 = "Hello";
        String str2 = new String("World");
        String str3 = "Hello";
        
        // 字符串比较
        System.out.println("=== 字符串比较 ===");
        System.out.println("str1 == str3: " + (str1 == str3));        // true（字符串池）
        System.out.println("str1.equals(str3): " + str1.equals(str3)); // true
        System.out.println("str1.equalsIgnoreCase(\"HELLO\"): " + 
                          str1.equalsIgnoreCase("HELLO"));           // true
        
        // 字符串长度和字符访问
        System.out.println("\n=== 字符串长度和字符访问 ===");
        String text = "Java Programming";
        System.out.println("长度: " + text.length());
        System.out.println("第一个字符: " + text.charAt(0));
        System.out.println("最后一个字符: " + text.charAt(text.length() - 1));
        
        // 字符串查找
        System.out.println("\n=== 字符串查找 ===");
        System.out.println("indexOf('a'): " + text.indexOf('a'));
        System.out.println("lastIndexOf('a'): " + text.lastIndexOf('a'));
        System.out.println("indexOf(\"Pro\"): " + text.indexOf("Pro"));
        System.out.println("contains(\"Java\"): " + text.contains("Java"));
        System.out.println("startsWith(\"Java\"): " + text.startsWith("Java"));
        System.out.println("endsWith(\"ing\"): " + text.endsWith("ing"));
        
        // 字符串截取
        System.out.println("\n=== 字符串截取 ===");
        System.out.println("substring(5): " + text.substring(5));
        System.out.println("substring(0, 4): " + text.substring(0, 4));
        
        // 字符串转换
        System.out.println("\n=== 字符串转换 ===");
        System.out.println("toUpperCase(): " + text.toUpperCase());
        System.out.println("toLowerCase(): " + text.toLowerCase());
        System.out.println("trim(): '" + "  Hello World  ".trim() + "'");
        System.out.println("replace('a', 'A'): " + text.replace('a', 'A'));
        System.out.println("replaceAll(\"[aeiou]\", \"*\"): " + 
                          text.replaceAll("[aeiou]", "*"));
        
        // 字符串分割
        System.out.println("\n=== 字符串分割 ===");
        String sentence = "apple,banana,orange,grape";
        String[] fruits = sentence.split(",");
        for (String fruit : fruits) {
            System.out.println("水果: " + fruit);
        }
        
        // 字符串连接
        System.out.println("\n=== 字符串连接 ===");
        String joined = String.join("-", fruits);
        System.out.println("连接后: " + joined);
    }
}
```

### 7.2 StringBuilder 和 StringBuffer

```java
public class StringBuilderExample {
    public static void main(String[] args) {
        // StringBuilder（非线程安全，性能更好）
        StringBuilder sb = new StringBuilder();
        sb.append("Hello");
        sb.append(" ");
        sb.append("World");
        sb.append("!");
        
        System.out.println("StringBuilder结果: " + sb.toString());
        
        // StringBuilder 方法链
        StringBuilder sb2 = new StringBuilder()
            .append("Java")
            .append(" is")
            .append(" awesome!");
        
        System.out.println("方法链结果: " + sb2.toString());
        
        // StringBuilder 其他操作
        StringBuilder sb3 = new StringBuilder("Hello World");
        System.out.println("原始: " + sb3);
        
        sb3.insert(5, ",");  // 在索引5处插入
        System.out.println("插入后: " + sb3);
        
        sb3.delete(5, 6);    // 删除索引5到6之间的字符
        System.out.println("删除后: " + sb3);
        
        sb3.reverse();       // 反转
        System.out.println("反转后: " + sb3);
        
        // StringBuffer（线程安全）
        StringBuffer sbf = new StringBuffer("Thread Safe");
        sbf.append(" String");
        System.out.println("StringBuffer结果: " + sbf.toString());
        
        // 性能比较示例
        long startTime, endTime;
        
        // String 连接（性能较差）
        startTime = System.currentTimeMillis();
        String str = "";
        for (int i = 0; i < 10000; i++) {
            str += "a";
        }
        endTime = System.currentTimeMillis();
        System.out.println("String连接耗时: " + (endTime - startTime) + "ms");
        
        // StringBuilder 连接（性能较好）
        startTime = System.currentTimeMillis();
        StringBuilder sbPerf = new StringBuilder();
        for (int i = 0; i < 10000; i++) {
            sbPerf.append("a");
        }
        String result = sbPerf.toString();
        endTime = System.currentTimeMillis();
        System.out.println("StringBuilder连接耗时: " + (endTime - startTime) + "ms");
    }
}
```

## 8. 输入输出

### 8.1 控制台输入输出

```java
import java.util.Scanner;

public class InputOutput {
    public static void main(String[] args) {
        // 输出
        System.out.println("这是一行输出");
        System.out.print("这是不换行输出");
        System.out.print(" 继续在同一行\n");
        
        // 格式化输出
        String name = "Alice";
        int age = 25;
        double salary = 5000.50;
        
        System.out.printf("姓名: %s, 年龄: %d, 薪水: %.2f\n", name, age, salary);
        System.out.printf("十六进制: %x, 八进制: %o, 科学计数法: %e\n", 255, 255, 1234.5);
        
        // 输入
        Scanner scanner = new Scanner(System.in);
        
        System.out.print("请输入您的姓名: ");
        String inputName = scanner.nextLine();
        
        System.out.print("请输入您的年龄: ");
        int inputAge = scanner.nextInt();
        
        System.out.print("请输入您的身高(米): ");
        double inputHeight = scanner.nextDouble();
        
        System.out.print("您是学生吗？(true/false): ");
        boolean isStudent = scanner.nextBoolean();
        
        // 输出输入的信息
        System.out.println("\n=== 您输入的信息 ===");
        System.out.println("姓名: " + inputName);
        System.out.println("年龄: " + inputAge);
        System.out.println("身高: " + inputHeight + "米");
        System.out.println("是否为学生: " + isStudent);
        
        scanner.close();
    }
}
```

## 9. 异常处理基础

### 9.1 try-catch-finally

```java
public class ExceptionHandling {
    public static void main(String[] args) {
        // 基本异常处理
        try {
            int result = 10 / 0;  // 会抛出 ArithmeticException
            System.out.println("结果: " + result);
        } catch (ArithmeticException e) {
            System.out.println("捕获到算术异常: " + e.getMessage());
        } finally {
            System.out.println("finally块总是会执行");
        }
        
        // 多个catch块
        try {
            String str = null;
            System.out.println(str.length());  // NullPointerException
            
            int[] arr = new int[5];
            System.out.println(arr[10]);       // ArrayIndexOutOfBoundsException
        } catch (NullPointerException e) {
            System.out.println("空指针异常: " + e.getMessage());
        } catch (ArrayIndexOutOfBoundsException e) {
            System.out.println("数组越界异常: " + e.getMessage());
        } catch (Exception e) {
            System.out.println("其他异常: " + e.getMessage());
        }
        
        // try-with-resources（Java 7+）
        try (Scanner scanner = new Scanner(System.in)) {
            System.out.println("资源会自动关闭");
        } catch (Exception e) {
            System.out.println("异常: " + e.getMessage());
        }
        
        // 方法调用中的异常处理
        try {
            int result = divide(10, 0);
            System.out.println("除法结果: " + result);
        } catch (IllegalArgumentException e) {
            System.out.println("参数异常: " + e.getMessage());
        }
    }
    
    public static int divide(int a, int b) {
        if (b == 0) {
            throw new IllegalArgumentException("除数不能为零");
        }
        return a / b;
    }
}
```

## 10. 总结

Java 基础语法涵盖了以下核心要素：

### 10.1 语法特点

- **强类型语言**：变量必须声明类型
- **面向对象**：一切皆对象（除基本类型）
- **平台无关**："一次编写，到处运行"
- **自动内存管理**：垃圾回收机制

### 10.2 编程规范

- **命名规范**：类名大驼峰，方法名小驼峰，常量全大写
- **代码风格**：适当的缩进和空格
- **注释规范**：单行 `//`，多行 `/* */`，文档 `/** */`

### 10.3 最佳实践

- 合理使用访问修饰符
- 优先使用局部变量
- 及时关闭资源
- 适当的异常处理
- 使用 StringBuilder 进行字符串拼接

### 10.4 学习建议

1. **循序渐进**：从基础语法开始，逐步深入
2. **多练习**：通过编写代码加深理解
3. **阅读源码**：学习优秀的代码风格
4. **项目实践**：将知识应用到实际项目中