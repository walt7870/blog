---
title: JDK版本升级指南
author: niu
date: 2024-12-19
---

# JDK版本升级指南

本文档详细介绍了从JDK 5开始到JDK 24的每个版本的主要新增功能和特性，帮助开发者了解Java语言的演进历程。

## JDK 5 (Java SE 5.0) - 2004年9月

### 主要新特性

#### 1. 泛型 (Generics)
```java
// JDK 5之前
List list = new ArrayList();
list.add("Hello");
String s = (String) list.get(0); // 需要强制转换

// JDK 5之后
List<String> list = new ArrayList<String>();
list.add("Hello");
String s = list.get(0); // 类型安全，无需转换
```

#### 2. 增强的for循环 (Enhanced for loop)
```java
int[] numbers = {1, 2, 3, 4, 5};

// 传统for循环
for (int i = 0; i < numbers.length; i++) {
    System.out.println(numbers[i]);
}

// 增强for循环
for (int number : numbers) {
    System.out.println(number);
}
```

#### 3. 自动装箱/拆箱 (Autoboxing/Unboxing)
```java
// 自动装箱
Integer i = 10; // 等价于 Integer i = Integer.valueOf(10);

// 自动拆箱
int j = i; // 等价于 int j = i.intValue();
```

#### 4. 枚举 (Enums)
```java
public enum Day {
    MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY
}

public class EnumExample {
    public void printDay(Day day) {
        switch (day) {
            case MONDAY:
                System.out.println("星期一");
                break;
            case TUESDAY:
                System.out.println("星期二");
                break;
            // ...
        }
    }
}
```

#### 5. 可变参数 (Varargs)
```java
public void printNumbers(int... numbers) {
    for (int number : numbers) {
        System.out.println(number);
    }
}

// 调用
printNumbers(1, 2, 3, 4, 5);
```

#### 6. 注解 (Annotations)
```java
@Override
public String toString() {
    return "Custom toString";
}

@Deprecated
public void oldMethod() {
    // 已废弃的方法
}
```

#### 7. 静态导入 (Static Import)
```java
import static java.lang.Math.*;

public class StaticImportExample {
    public double calculateArea(double radius) {
        return PI * pow(radius, 2); // 无需Math.PI和Math.pow
    }
}
```

## JDK 6 (Java SE 6) - 2006年12月

### 主要新特性

#### 1. 脚本引擎支持 (Scripting Engine)
```java
import javax.script.*;

ScriptEngineManager manager = new ScriptEngineManager();
ScriptEngine engine = manager.getEngineByName("JavaScript");
engine.eval("print('Hello from JavaScript')");
```

#### 2. 编译器API (Compiler API)
```java
import javax.tools.*;

JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
int result = compiler.run(null, null, null, "HelloWorld.java");
```

#### 3. 插入式注解处理 (Pluggable Annotation Processing)
- 允许在编译时处理注解
- 支持代码生成和验证

#### 4. Web服务支持增强
- JAX-WS 2.0
- JAXB 2.0
- 内置HTTP服务器

#### 5. 桌面API增强
- SystemTray支持
- Desktop API
- 拖拽功能增强

## JDK 7 (Java SE 7) - 2011年7月

### 主要新特性

#### 1. 钻石操作符 (Diamond Operator)
```java
// JDK 7之前
Map<String, List<String>> map = new HashMap<String, List<String>>();

// JDK 7之后
Map<String, List<String>> map = new HashMap<>();
```

#### 2. 字符串switch语句
```java
String day = "MONDAY";
switch (day) {
    case "MONDAY":
        System.out.println("星期一");
        break;
    case "TUESDAY":
        System.out.println("星期二");
        break;
    default:
        System.out.println("其他");
}
```

#### 3. try-with-resources语句
```java
// 自动资源管理
try (FileReader fr = new FileReader("file.txt");
     BufferedReader br = new BufferedReader(fr)) {
    return br.readLine();
} // 资源自动关闭
```

#### 4. 多异常捕获
```java
try {
    // 可能抛出多种异常的代码
} catch (IOException | SQLException ex) {
    // 处理多种异常
    logger.log(ex);
}
```

#### 5. 数字字面量改进
```java
// 二进制字面量
int binary = 0b1010;

// 数字分隔符
long creditCardNumber = 1234_5678_9012_3456L;
int million = 1_000_000;
```

#### 6. Fork/Join框架
```java
import java.util.concurrent.ForkJoinPool;
import java.util.concurrent.RecursiveTask;

public class SumTask extends RecursiveTask<Long> {
    private final int[] array;
    private final int start, end;
    
    @Override
    protected Long compute() {
        if (end - start <= 1000) {
            // 直接计算
            long sum = 0;
            for (int i = start; i < end; i++) {
                sum += array[i];
            }
            return sum;
        } else {
            // 分割任务
            int mid = (start + end) / 2;
            SumTask left = new SumTask(array, start, mid);
            SumTask right = new SumTask(array, mid, end);
            left.fork();
            return right.compute() + left.join();
        }
    }
}
```

#### 7. NIO.2 (New I/O 2)
```java
import java.nio.file.*;

// 文件操作
Path path = Paths.get("example.txt");
Files.write(path, "Hello World".getBytes());
List<String> lines = Files.readAllLines(path);

// 目录遍历
Files.walkFileTree(Paths.get("/home"), new SimpleFileVisitor<Path>() {
    @Override
    public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
        System.out.println(file);
        return FileVisitResult.CONTINUE;
    }
});
```

## JDK 8 (Java SE 8) - 2014年3月

### 主要新特性

#### 1. Lambda表达式
```java
// 传统方式
List<String> names = Arrays.asList("Alice", "Bob", "Charlie");
names.sort(new Comparator<String>() {
    @Override
    public int compare(String a, String b) {
        return a.compareTo(b);
    }
});

// Lambda表达式
names.sort((a, b) -> a.compareTo(b));
// 或者更简洁
names.sort(String::compareTo);
```

#### 2. Stream API
```java
List<String> names = Arrays.asList("Alice", "Bob", "Charlie", "David");

// 过滤、转换、收集
List<String> result = names.stream()
    .filter(name -> name.length() > 3)
    .map(String::toUpperCase)
    .collect(Collectors.toList());

// 并行处理
long count = names.parallelStream()
    .filter(name -> name.startsWith("A"))
    .count();
```

#### 3. 方法引用 (Method References)
```java
// 静态方法引用
Function<String, Integer> parseInt = Integer::parseInt;

// 实例方法引用
Function<String, String> toUpperCase = String::toUpperCase;

// 构造器引用
Supplier<List<String>> listSupplier = ArrayList::new;
```

#### 4. 默认方法 (Default Methods)
```java
interface Vehicle {
    void start();
    
    // 默认方法
    default void stop() {
        System.out.println("Vehicle stopped");
    }
    
    // 静态方法
    static void checkEngine() {
        System.out.println("Engine checked");
    }
}
```

#### 5. Optional类
```java
// 避免空指针异常
Optional<String> optional = Optional.ofNullable(getString());

// 安全地处理可能为null的值
String result = optional
    .filter(s -> s.length() > 5)
    .map(String::toUpperCase)
    .orElse("DEFAULT");
```

#### 6. 新的日期时间API
```java
import java.time.*;

// 新的日期时间类
LocalDate date = LocalDate.now();
LocalTime time = LocalTime.now();
LocalDateTime dateTime = LocalDateTime.now();
ZonedDateTime zonedDateTime = ZonedDateTime.now();

// 日期计算
LocalDate tomorrow = date.plusDays(1);
LocalDate nextWeek = date.plusWeeks(1);

// 格式化
DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
String formatted = dateTime.format(formatter);
```

#### 7. 重复注解 (Repeating Annotations)
```java
@Repeatable(Schedules.class)
@interface Schedule {
    String dayOfMonth() default "first";
    String dayOfWeek() default "Mon";
    int hour() default 12;
}

@interface Schedules {
    Schedule[] value();
}

@Schedule(dayOfMonth="last")
@Schedule(dayOfWeek="Fri", hour=23)
public void doPeriodicCleanup() { ... }
```

## JDK 9 (Java SE 9) - 2017年9月

### 主要新特性

#### 1. 模块系统 (Project Jigsaw)
```java
// module-info.java
module com.example.myapp {
    requires java.base;
    requires java.logging;
    exports com.example.myapp.api;
    provides com.example.myapp.spi.Service 
        with com.example.myapp.impl.ServiceImpl;
}
```

#### 2. JShell (交互式编程环境)
```bash
$ jshell
|  Welcome to JShell -- Version 9
|  For an introduction type: /help intro

jshell> int x = 10
x ==> 10

jshell> System.out.println("Hello " + x)
Hello 10
```

#### 3. 集合工厂方法
```java
// 不可变集合
List<String> list = List.of("a", "b", "c");
Set<String> set = Set.of("a", "b", "c");
Map<String, Integer> map = Map.of("a", 1, "b", 2, "c", 3);
```

#### 4. Stream API增强
```java
// takeWhile和dropWhile
Stream.of(1, 2, 3, 4, 5, 6)
    .takeWhile(x -> x < 4)
    .forEach(System.out::println); // 输出: 1, 2, 3

// ofNullable
Stream.ofNullable(getNullableValue())
    .forEach(System.out::println);
```

#### 5. 接口私有方法
```java
interface MyInterface {
    default void method1() {
        commonMethod();
    }
    
    default void method2() {
        commonMethod();
    }
    
    // 私有方法
    private void commonMethod() {
        System.out.println("Common logic");
    }
}
```

#### 6. 多版本JAR文件
```
jar root
  - A.class
  - B.class
  - C.class
  - META-INF/versions/9/A.class
  - META-INF/versions/10/B.class
```

## JDK 10 (Java SE 10) - 2018年3月

### 主要新特性

#### 1. 局部变量类型推断 (var关键字)
```java
// 类型推断
var list = new ArrayList<String>(); // ArrayList<String>
var map = new HashMap<String, Integer>(); // HashMap<String, Integer>
var stream = list.stream(); // Stream<String>

// 在循环中使用
for (var item : list) {
    System.out.println(item);
}
```

#### 2. 应用程序类数据共享 (Application Class-Data Sharing)
- 改进启动时间
- 减少内存占用

#### 3. 垃圾收集器接口
- 统一的垃圾收集器接口
- 便于添加新的垃圾收集器

#### 4. 并行全垃圾收集器 (Parallel Full GC for G1)
- G1垃圾收集器的Full GC并行化

## JDK 11 (Java SE 11) - 2018年9月 (LTS)

### 主要新特性

#### 1. 字符串方法增强
```java
String str = "  Hello World  ";

// 新方法
boolean blank = str.isBlank(); // 检查是否为空白
String stripped = str.strip(); // 去除首尾空白
String[] lines = "Line1\nLine2\nLine3".lines().toArray(String[]::new);
String repeated = "Java".repeat(3); // "JavaJavaJava"
```

#### 2. 文件读写简化
```java
// 读取文件
String content = Files.readString(Paths.get("file.txt"));

// 写入文件
Files.writeString(Paths.get("output.txt"), "Hello World");
```

#### 3. HTTP客户端 (标准化)
```java
import java.net.http.*;

HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/data"))
    .build();

HttpResponse<String> response = client.send(request, 
    HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

#### 4. Lambda参数的局部变量语法
```java
// 在Lambda中使用var
list.stream()
    .map((var x) -> x.toUpperCase())
    .collect(Collectors.toList());
```

#### 5. 运行单文件源代码程序
```bash
# 直接运行Java源文件
java HelloWorld.java
```

#### 6. 移除和废弃
- 移除Java EE和CORBA模块
- 废弃Nashorn JavaScript引擎

## JDK 12 (Java SE 12) - 2019年3月

### 主要新特性

#### 1. Switch表达式 (预览)
```java
// 传统switch语句
String result;
switch (day) {
    case MONDAY:
    case FRIDAY:
    case SUNDAY:
        result = "6";
        break;
    case TUESDAY:
        result = "7";
        break;
    default:
        result = "8";
}

// 新的switch表达式
String result = switch (day) {
    case MONDAY, FRIDAY, SUNDAY -> "6";
    case TUESDAY -> "7";
    default -> "8";
};
```

#### 2. 文本块 (预览)
```java
// 传统字符串
String html = "<html>\n" +
              "    <body>\n" +
              "        <p>Hello World</p>\n" +
              "    </body>\n" +
              "</html>\n";

// 文本块
String html = """
              <html>
                  <body>
                      <p>Hello World</p>
                  </body>
              </html>
              """;
```

#### 3. Shenandoah垃圾收集器 (实验性)
- 低延迟垃圾收集器
- 独立于堆大小的暂停时间

## JDK 13 (Java SE 13) - 2019年9月

### 主要新特性

#### 1. 文本块改进 (预览)
```java
// 支持转义序列
String json = """
              {
                  "name": "John",
                  "age": \{age}
              }
              """;
```

#### 2. Switch表达式增强 (预览)
```java
// yield关键字
int result = switch (x) {
    case 1, 2 -> {
        System.out.println("Small number");
        yield x * 2;
    }
    case 3, 4 -> {
        System.out.println("Medium number");
        yield x * 3;
    }
    default -> {
        System.out.println("Large number");
        yield x * 4;
    }
};
```

#### 3. 动态CDS存档
- 改进应用启动时间
- 自动生成类数据共享存档

## JDK 14 (Java SE 14) - 2020年3月

### 主要新特性

#### 1. Switch表达式 (标准化)
```java
// 正式成为标准特性
String result = switch (day) {
    case MONDAY, FRIDAY, SUNDAY -> "Weekend feeling";
    case TUESDAY -> "Tuesday blues";
    default -> "Midweek";
};
```

#### 2. 模式匹配 instanceof (预览)
```java
// 传统方式
if (obj instanceof String) {
    String s = (String) obj;
    System.out.println(s.length());
}

// 模式匹配
if (obj instanceof String s) {
    System.out.println(s.length());
}
```

#### 3. 记录类 (预览)
```java
// 记录类
public record Person(String name, int age) {
    // 自动生成构造器、getter、equals、hashCode、toString
}

// 使用
Person person = new Person("Alice", 30);
System.out.println(person.name()); // Alice
System.out.println(person.age());  // 30
```

#### 4. 文本块 (标准化)
```java
// 正式成为标准特性
String query = """
               SELECT id, name, email
               FROM users
               WHERE age > 18
               ORDER BY name
               """;
```

#### 5. 有用的NullPointerException
```java
// 更详细的空指针异常信息
// 之前: NullPointerException
// 现在: Cannot invoke "String.length()" because "name" is null
```

## JDK 15 (Java SE 15) - 2020年9月

### 主要新特性

#### 1. 密封类 (预览)
```java
// 密封类
public sealed class Shape
    permits Circle, Rectangle, Triangle {
}

public final class Circle extends Shape {
    private final double radius;
    // ...
}

public final class Rectangle extends Shape {
    private final double width, height;
    // ...
}

public non-sealed class Triangle extends Shape {
    // 允许进一步继承
}
```

#### 2. 隐藏类 (Hidden Classes)
- 框架动态生成类的支持
- 不能被其他类直接使用

#### 3. EdDSA数字签名算法
```java
// Edwards-Curve数字签名算法
KeyPairGenerator kpg = KeyPairGenerator.getInstance("EdDSA");
KeyPair kp = kpg.generateKeyPair();
```

#### 4. ZGC和Shenandoah转为产品特性
- 从实验性转为正式支持

## JDK 16 (Java SE 16) - 2021年3月

### 主要新特性

#### 1. 记录类 (标准化)
```java
// 正式成为标准特性
public record Point(int x, int y) {
    // 紧凑构造器
    public Point {
        if (x < 0 || y < 0) {
            throw new IllegalArgumentException("Coordinates must be positive");
        }
    }
    
    // 静态方法
    public static Point origin() {
        return new Point(0, 0);
    }
}
```

#### 2. 模式匹配 instanceof (标准化)
```java
// 正式成为标准特性
if (obj instanceof String s && s.length() > 5) {
    System.out.println(s.toUpperCase());
}
```

#### 3. 打包工具 (jpackage)
```bash
# 创建本地安装包
jpackage --input target/ --name MyApp --main-jar myapp.jar --main-class com.example.Main
```

#### 4. Vector API (孵化)
```java
// SIMD操作支持
var a = FloatVector.fromArray(species, array1, 0);
var b = FloatVector.fromArray(species, array2, 0);
var c = a.mul(b);
c.intoArray(result, 0);
```

## JDK 17 (Java SE 17) - 2021年9月 (LTS)

### 主要新特性

#### 1. 密封类 (标准化)
```java
// 正式成为标准特性
public sealed interface Expr
    permits ConstantExpr, PlusExpr, TimesExpr, NegExpr {
}

public record ConstantExpr(int i) implements Expr {}
public record PlusExpr(Expr a, Expr b) implements Expr {}
public record TimesExpr(Expr a, Expr b) implements Expr {}
public record NegExpr(Expr e) implements Expr {}
```

#### 2. 强封装JDK内部API
- 默认强封装所有JDK内部元素
- 提高安全性和可维护性

#### 3. 新的macOS渲染管道
- 使用Apple Metal API
- 替代已废弃的OpenGL API

#### 4. 移除实验性AOT和JIT编译器
- 移除实验性的提前编译功能

## JDK 18 (Java SE 18) - 2022年3月

### 主要新特性

#### 1. UTF-8作为默认字符集
```java
// 现在默认使用UTF-8编码
FileReader reader = new FileReader("file.txt"); // 使用UTF-8
```

#### 2. 简单Web服务器
```bash
# 启动简单的文件服务器
jwebserver -p 8080 -d /path/to/directory
```

#### 3. 代码片段在Javadoc中
```java
/**
 * 计算两个数的和
 * {@snippet :
 * int result = add(5, 3);
 * System.out.println(result); // 输出: 8
 * }
 */
public int add(int a, int b) {
    return a + b;
}
```

#### 4. Vector API (第二次孵化)
- 改进的SIMD操作支持

## JDK 19 (Java SE 19) - 2022年9月

### 主要新特性

#### 1. 虚拟线程 (预览)
```java
// 虚拟线程
Thread.startVirtualThread(() -> {
    System.out.println("Hello from virtual thread!");
});

// 使用Executor
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    for (int i = 0; i < 1000000; i++) {
        executor.submit(() -> {
            // 轻量级线程任务
            Thread.sleep(Duration.ofSeconds(1));
            return "Task completed";
        });
    }
}
```

#### 2. 结构化并发 (孵化)
```java
// 结构化并发
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    Future<String> user = scope.fork(() -> findUser());
    Future<String> order = scope.fork(() -> findOrder());
    
    scope.join();           // 等待所有任务完成
    scope.throwIfFailed();  // 如果有失败则抛出异常
    
    // 使用结果
    return new UserOrder(user.resultNow(), order.resultNow());
}
```

#### 3. 模式匹配 switch (第三次预览)
```java
// 增强的模式匹配
String result = switch (obj) {
    case Integer i && i > 0 -> "Positive integer: " + i;
    case String s && s.length() > 5 -> "Long string: " + s;
    case null -> "Null value";
    default -> "Other: " + obj;
};
```

## JDK 20 (Java SE 20) - 2023年3月

### 主要新特性

#### 1. 作用域值 (孵化)
```java
// 作用域值 - 线程本地变量的替代
public class ScopedValueExample {
    private static final ScopedValue<String> USER = ScopedValue.newInstance();
    
    public void processRequest(String username) {
        ScopedValue.where(USER, username)
                   .run(() -> {
                       // 在这个作用域内，USER.get()返回username
                       doSomeWork();
                   });
    }
    
    private void doSomeWork() {
        String currentUser = USER.get(); // 获取当前用户
        // 处理逻辑
    }
}
```

#### 2. 记录模式 (第二次预览)
```java
// 记录模式匹配
record Point(int x, int y) {}
record ColoredPoint(Point point, String color) {}

// 模式匹配解构
if (obj instanceof ColoredPoint(Point(var x, var y), var color)) {
    System.out.println("Point at (" + x + ", " + y + ") with color " + color);
}
```

#### 3. 虚拟线程 (第二次预览)
- 改进的虚拟线程实现
- 更好的性能和稳定性

## JDK 21 (Java SE 21) - 2023年9月 (LTS)

### 主要新特性

#### 1. 虚拟线程 (标准化)
```java
// 正式成为标准特性
Thread.ofVirtual().start(() -> {
    System.out.println("Virtual thread: " + Thread.currentThread());
});

// 虚拟线程工厂
ThreadFactory factory = Thread.ofVirtual().factory();
Thread vt = factory.newThread(() -> {
    // 虚拟线程任务
});
vt.start();
```

#### 2. 字符串模板 (预览)
```java
// 字符串模板
String name = "World";
int count = 42;

// 使用STR模板处理器
String message = STR."Hello \{name}! Count: \{count}";

// 自定义模板处理器
String json = JSON."""
    {
        "name": "\{name}",
        "count": \{count}
    }
    """;
```

#### 3. 序列集合 (Sequenced Collections)
```java
// 新的集合接口
List<String> list = new ArrayList<>();
list.addFirst("first");
list.addLast("last");
String first = list.getFirst();
String last = list.getLast();

// 反向视图
List<String> reversed = list.reversed();
```

#### 4. 模式匹配 switch (标准化)
```java
// 正式成为标准特性
String result = switch (obj) {
    case Integer i when i > 0 -> "Positive: " + i;
    case String s when s.length() > 5 -> "Long string";
    case null -> "Null";
    default -> "Other";
};
```

#### 5. 记录模式 (标准化)
```java
// 正式成为标准特性
record Person(String name, int age) {}

if (obj instanceof Person(var name, var age)) {
    System.out.println(name + " is " + age + " years old");
}
```

## JDK 22 (Java SE 22) - 2024年3月

### 主要新特性

#### 1. 未命名变量和模式 (预览)
```java
// 未命名变量
for (var _ : items) {
    // 不需要使用循环变量
    doSomething();
}

// 未命名模式
switch (obj) {
    case Point(var x, var _) -> processX(x); // 忽略y坐标
    case ColoredPoint(var _, var color) -> processColor(color); // 忽略点坐标
}
```

#### 2. 字符串模板 (第二次预览)
```java
// 改进的字符串模板
String name = "Alice";
int age = 30;

// 多行模板
String html = STR."""
    <html>
        <body>
            <h1>Hello \{name}</h1>
            <p>Age: \{age}</p>
        </body>
    </html>
    """;
```

#### 3. 类文件API (预览)
```java
// 操作类文件的API
ClassFile cf = ClassFile.of();
byte[] bytes = cf.build(ClassDesc.of("com.example.MyClass"), cb -> {
    cb.withFlags(AccessFlag.PUBLIC)
      .withSuperclass(ConstantDescs.CD_Object)
      .withMethod("<init>", MethodTypeDesc.of(ConstantDescs.CD_void), 
                  AccessFlag.PUBLIC, mb -> {
          mb.withCode(codeb -> {
              codeb.aload(0)
                   .invokespecial(ConstantDescs.CD_Object, "<init>", 
                                 MethodTypeDesc.of(ConstantDescs.CD_void))
                   .return_();
          });
      });
});
```

#### 4. 结构化并发 (第二次预览)
```java
// 改进的结构化并发
try (var scope = new StructuredTaskScope<String>()) {
    var task1 = scope.fork(() -> fetchUserData());
    var task2 = scope.fork(() -> fetchOrderData());
    
    scope.join();
    
    String userData = task1.get();
    String orderData = task2.get();
    
    return combineData(userData, orderData);
}
```

## JDK 23 (Java SE 23) - 2024年9月

### 主要新特性

#### 1. 原始类型模式 (预览)
```java
// 原始类型的模式匹配
Object obj = 42;

switch (obj) {
    case int i -> System.out.println("Integer: " + i);
    case double d -> System.out.println("Double: " + d);
    case String s -> System.out.println("String: " + s);
}
```

#### 2. 模块导入声明 (预览)
```java
// 简化模块导入
import module java.base;

// 等价于导入java.base模块的所有导出包
// import java.lang.*;
// import java.util.*;
// import java.io.*;
// ...
```

#### 3. Markdown文档注释
```java
/**
 * # 计算器类
 * 
 * 这个类提供基本的数学运算功能：
 * 
 * - 加法
 * - 减法  
 * - 乘法
 * - 除法
 * 
 * ## 使用示例
 * 
 * ```java
 * Calculator calc = new Calculator();
 * int result = calc.add(5, 3);
 * ```
 */
public class Calculator {
    // ...
}
```

#### 4. ZGC分代收集 (实验性)
- 分代Z垃圾收集器
- 改进的内存管理

## JDK 24 (Java SE 24) - 2025年3月 (预期)

### 预期新特性

#### 1. 值对象 (预览)
```java
// 值对象 - 类似记录但更轻量
value class Point {
    int x;
    int y;
    
    Point(int x, int y) {
        this.x = x;
        this.y = y;
    }
}
```

#### 2. 通用泛型 (预览)
```java
// 原始类型泛型
class NumberList<T extends int | double | float> {
    private T[] elements;
    
    public void add(T element) {
        // 直接操作原始类型，无装箱开销
    }
}
```

#### 3. 字符串模板 (可能标准化)
```java
// 可能成为正式特性
String query = SQL."""
    SELECT * FROM users 
    WHERE name = \{userName} 
    AND age > \{minAge}
    """;
```

#### 4. 改进的并发原语
```java
// 新的并发工具
var channel = Channel.<String>newUnbounded();

// 发送方
channel.send("Hello");

// 接收方
String message = channel.receive();
```

## 版本选择建议

### LTS版本推荐
- **JDK 8**: 仍被广泛使用，但建议迁移
- **JDK 11**: 稳定的LTS版本，适合生产环境
- **JDK 17**: 当前主流LTS版本，推荐新项目使用
- **JDK 21**: 最新LTS版本，包含虚拟线程等重要特性

### 迁移路径
1. **从JDK 8迁移**: 建议先迁移到JDK 11，再考虑JDK 17/21
2. **从JDK 11迁移**: 可以直接迁移到JDK 17或JDK 21
3. **新项目**: 推荐使用JDK 21或更新版本

### 特性采用建议
- **立即可用**: 已标准化的特性（如Lambda、Stream、模块系统等）
- **谨慎使用**: 预览特性，适合实验和学习
- **关注发展**: 孵化特性，了解未来方向

## 总结

Java语言从JDK 5开始经历了巨大的发展，每个版本都带来了重要的改进：

- **JDK 5-7**: 奠定现代Java基础（泛型、注解、Lambda准备）
- **JDK 8**: 函数式编程革命（Lambda、Stream、新日期API）
- **JDK 9-11**: 模块化和现代化（模块系统、HTTP客户端、字符串增强）
- **JDK 12-16**: 语法现代化（Switch表达式、文本块、记录类）
- **JDK 17-21**: 性能和并发（密封类、虚拟线程、模式匹配）
- **JDK 22-24**: 未来特性（字符串模板、值对象、原始类型泛型）

选择合适的JDK版本需要考虑项目需求、团队技能、生态系统支持等因素。对于生产环境，建议使用LTS版本以获得长期支持和稳定性。