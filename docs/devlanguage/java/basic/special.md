# Java 特殊特性详解

## 概述

本文档详细介绍 Java 语言中的高级特性和核心概念，包括反射、枚举、类与对象、接口、注解、泛型、内部类等内容。这些特性是 Java 面向对象编程的核心，也是理解 Java 框架和高级编程技巧的基础。

## 目录

1. [类与对象](#1-类与对象)
2. [接口](#2-接口)
3. [枚举](#3-枚举)
4. [反射](#4-反射)
5. [注解](#5-注解)
6. [泛型](#6-泛型)
7. [内部类](#7-内部类)
8. [Lambda 表达式](#8-lambda-表达式)
9. [函数式接口](#9-函数式接口)
10. [Stream API](#10-stream-api)

---

## 1. 类与对象

### 1.1 类的定义与结构

```java
// 基本类定义
public class Person {
    // 成员变量（字段）
    private String name;
    private int age;
    private static int count = 0; // 静态变量
    
    // 静态代码块
    static {
        System.out.println("Person 类被加载");
    }
    
    // 实例代码块
    {
        count++;
        System.out.println("创建 Person 实例");
    }
    
    // 构造方法
    public Person() {
        this("Unknown", 0);
    }
    
    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }
    
    // 实例方法
    public void introduce() {
        System.out.println("我是 " + name + "，今年 " + age + " 岁");
    }
    
    // 静态方法
    public static int getCount() {
        return count;
    }
    
    // Getter 和 Setter
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public int getAge() { return age; }
    public void setAge(int age) { this.age = age; }
}
```

### 1.2 继承与多态

```java
// 父类
public abstract class Animal {
    protected String name;
    
    public Animal(String name) {
        this.name = name;
    }
    
    // 抽象方法
    public abstract void makeSound();
    
    // 具体方法
    public void sleep() {
        System.out.println(name + " 正在睡觉");
    }
    
    // final 方法，不能被重写
    public final void breathe() {
        System.out.println(name + " 正在呼吸");
    }
}

// 子类
public class Dog extends Animal {
    private String breed;
    
    public Dog(String name, String breed) {
        super(name); // 调用父类构造方法
        this.breed = breed;
    }
    
    @Override
    public void makeSound() {
        System.out.println(name + " 汪汪叫");
    }
    
    // 方法重载
    public void play() {
        System.out.println(name + " 在玩耍");
    }
    
    public void play(String toy) {
        System.out.println(name + " 在玩 " + toy);
    }
}

// 使用示例
public class InheritanceDemo {
    public static void main(String[] args) {
        Animal dog = new Dog("旺财", "金毛");
        dog.makeSound(); // 多态调用
        dog.sleep();
        dog.breathe();
        
        // 类型转换
        if (dog instanceof Dog) {
            Dog realDog = (Dog) dog;
            realDog.play();
            realDog.play("球");
        }
    }
}
```

### 1.3 访问修饰符

```java
public class AccessModifierDemo {
    public String publicField = "公共字段";        // 任何地方都可访问
    protected String protectedField = "受保护字段"; // 同包或子类可访问
    String packageField = "包字段";               // 同包可访问
    private String privateField = "私有字段";      // 仅本类可访问
    
    public void demonstrateAccess() {
        System.out.println(publicField);
        System.out.println(protectedField);
        System.out.println(packageField);
        System.out.println(privateField); // 只有在本类中才能访问
    }
}
```

---

## 2. 接口

### 2.1 接口定义与实现

```java
// 基本接口
public interface Drawable {
    // 常量（默认 public static final）
    String DEFAULT_COLOR = "黑色";
    
    // 抽象方法（默认 public abstract）
    void draw();
    void setColor(String color);
}

// 扩展接口
public interface Colorable extends Drawable {
    void changeColor(String newColor);
}

// 接口实现
public class Circle implements Colorable {
    private String color = DEFAULT_COLOR;
    private double radius;
    
    public Circle(double radius) {
        this.radius = radius;
    }
    
    @Override
    public void draw() {
        System.out.println("绘制一个半径为 " + radius + " 的 " + color + " 圆形");
    }
    
    @Override
    public void setColor(String color) {
        this.color = color;
    }
    
    @Override
    public void changeColor(String newColor) {
        System.out.println("将颜色从 " + color + " 改为 " + newColor);
        this.color = newColor;
    }
}
```

### 2.2 默认方法和静态方法（Java 8+）

```java
public interface ModernInterface {
    // 抽象方法
    void abstractMethod();
    
    // 默认方法
    default void defaultMethod() {
        System.out.println("这是默认方法");
        privateHelper();
    }
    
    // 静态方法
    static void staticMethod() {
        System.out.println("这是静态方法");
    }
    
    // 私有方法（Java 9+）
    private void privateHelper() {
        System.out.println("私有辅助方法");
    }
}

public class ModernClass implements ModernInterface {
    @Override
    public void abstractMethod() {
        System.out.println("实现抽象方法");
    }
    
    // 可以选择重写默认方法
    @Override
    public void defaultMethod() {
        System.out.println("重写的默认方法");
        ModernInterface.super.defaultMethod(); // 调用接口的默认方法
    }
}
```

### 2.3 函数式接口

```java
@FunctionalInterface
public interface Calculator {
    int calculate(int a, int b);
    
    // 可以有默认方法
    default void printResult(int a, int b) {
        System.out.println("结果: " + calculate(a, b));
    }
}

// 使用示例
public class FunctionalInterfaceDemo {
    public static void main(String[] args) {
        // Lambda 表达式实现
        Calculator add = (a, b) -> a + b;
        Calculator multiply = (a, b) -> a * b;
        
        System.out.println("加法: " + add.calculate(5, 3));
        System.out.println("乘法: " + multiply.calculate(5, 3));
        
        add.printResult(5, 3);
    }
}
```

---

## 3. 枚举

### 3.1 基本枚举

```java
// 简单枚举
public enum Day {
    MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY
}

// 使用枚举
public class EnumBasicDemo {
    public static void main(String[] args) {
        Day today = Day.MONDAY;
        
        // 枚举比较
        if (today == Day.MONDAY) {
            System.out.println("今天是周一");
        }
        
        // switch 语句
        switch (today) {
            case MONDAY:
                System.out.println("周一，新的开始");
                break;
            case FRIDAY:
                System.out.println("周五，快到周末了");
                break;
            default:
                System.out.println("普通的一天");
        }
        
        // 枚举方法
        System.out.println("枚举名称: " + today.name());
        System.out.println("枚举序号: " + today.ordinal());
        
        // 遍历所有枚举值
        for (Day day : Day.values()) {
            System.out.println(day);
        }
    }
}
```

### 3.2 复杂枚举

```java
public enum Planet {
    MERCURY(3.303e+23, 2.4397e6),
    VENUS(4.869e+24, 6.0518e6),
    EARTH(5.976e+24, 6.37814e6),
    MARS(6.421e+23, 3.3972e6);
    
    private final double mass;   // 质量（千克）
    private final double radius; // 半径（米）
    
    // 枚举构造方法
    Planet(double mass, double radius) {
        this.mass = mass;
        this.radius = radius;
    }
    
    // 枚举方法
    public double getMass() { return mass; }
    public double getRadius() { return radius; }
    
    // 计算表面重力
    public double surfaceGravity() {
        final double G = 6.67300E-11;
        return G * mass / (radius * radius);
    }
    
    // 计算在该星球上的重量
    public double surfaceWeight(double otherMass) {
        return otherMass * surfaceGravity();
    }
}

// 使用复杂枚举
public class PlanetDemo {
    public static void main(String[] args) {
        double earthWeight = 75.0; // 地球上的重量
        
        for (Planet planet : Planet.values()) {
            double weight = planet.surfaceWeight(earthWeight);
            System.out.printf("在 %s 上的重量: %.2f kg%n", 
                            planet.name(), weight);
        }
    }
}
```

### 3.3 枚举实现接口

```java
public interface Operation {
    double apply(double x, double y);
}

public enum BasicOperation implements Operation {
    PLUS("+") {
        @Override
        public double apply(double x, double y) { return x + y; }
    },
    MINUS("-") {
        @Override
        public double apply(double x, double y) { return x - y; }
    },
    TIMES("*") {
        @Override
        public double apply(double x, double y) { return x * y; }
    },
    DIVIDE("/") {
        @Override
        public double apply(double x, double y) { return x / y; }
    };
    
    private final String symbol;
    
    BasicOperation(String symbol) {
        this.symbol = symbol;
    }
    
    @Override
    public String toString() {
        return symbol;
    }
}

// 使用示例
public class OperationDemo {
    public static void main(String[] args) {
        double x = 10.0, y = 3.0;
        
        for (BasicOperation op : BasicOperation.values()) {
            System.out.printf("%.1f %s %.1f = %.2f%n", 
                            x, op, y, op.apply(x, y));
        }
    }
}
```

---

## 4. 反射

### 4.1 Class 对象

```java
import java.lang.reflect.*;

public class ReflectionBasics {
    public static void main(String[] args) throws Exception {
        // 获取 Class 对象的三种方式
        Class<?> clazz1 = String.class;
        Class<?> clazz2 = "Hello".getClass();
        Class<?> clazz3 = Class.forName("java.lang.String");
        
        System.out.println("类名: " + clazz1.getName());
        System.out.println("简单类名: " + clazz1.getSimpleName());
        System.out.println("包名: " + clazz1.getPackage().getName());
        System.out.println("是否为接口: " + clazz1.isInterface());
        System.out.println("是否为数组: " + clazz1.isArray());
        System.out.println("父类: " + clazz1.getSuperclass());
        
        // 获取实现的接口
        Class<?>[] interfaces = clazz1.getInterfaces();
        System.out.println("实现的接口:");
        for (Class<?> intf : interfaces) {
            System.out.println("  " + intf.getName());
        }
    }
}
```

### 4.2 反射操作字段

```java
import java.lang.reflect.Field;

public class Student {
    private String name;
    public int age;
    protected String grade;
    static String school = "清华大学";
    
    public Student(String name, int age, String grade) {
        this.name = name;
        this.age = age;
        this.grade = grade;
    }
    
    @Override
    public String toString() {
        return String.format("Student{name='%s', age=%d, grade='%s'}", 
                           name, age, grade);
    }
}

public class FieldReflectionDemo {
    public static void main(String[] args) throws Exception {
        Student student = new Student("张三", 20, "大二");
        Class<?> clazz = student.getClass();
        
        System.out.println("=== 获取所有字段 ===");
        Field[] fields = clazz.getDeclaredFields();
        for (Field field : fields) {
            System.out.printf("字段: %s, 类型: %s, 修饰符: %s%n",
                            field.getName(), 
                            field.getType().getSimpleName(),
                            Modifier.toString(field.getModifiers()));
        }
        
        System.out.println("\n=== 操作私有字段 ===");
        Field nameField = clazz.getDeclaredField("name");
        nameField.setAccessible(true); // 设置可访问私有字段
        
        String originalName = (String) nameField.get(student);
        System.out.println("原始姓名: " + originalName);
        
        nameField.set(student, "李四");
        System.out.println("修改后: " + student);
        
        System.out.println("\n=== 操作静态字段 ===");
        Field schoolField = clazz.getDeclaredField("school");
        System.out.println("学校: " + schoolField.get(null)); // 静态字段传入 null
    }
}
```

### 4.3 反射操作方法

```java
import java.lang.reflect.Method;

public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }
    
    private String formatResult(String operation, int result) {
        return String.format("%s 的结果是: %d", operation, result);
    }
    
    public static void printInfo() {
        System.out.println("这是一个计算器类");
    }
    
    // 重载方法
    public double add(double a, double b) {
        return a + b;
    }
}

public class MethodReflectionDemo {
    public static void main(String[] args) throws Exception {
        Calculator calc = new Calculator();
        Class<?> clazz = calc.getClass();
        
        System.out.println("=== 获取所有方法 ===");
        Method[] methods = clazz.getDeclaredMethods();
        for (Method method : methods) {
            System.out.printf("方法: %s, 返回类型: %s, 参数: %s%n",
                            method.getName(),
                            method.getReturnType().getSimpleName(),
                            java.util.Arrays.toString(method.getParameterTypes()));
        }
        
        System.out.println("\n=== 调用公共方法 ===");
        Method addMethod = clazz.getMethod("add", int.class, int.class);
        int result = (int) addMethod.invoke(calc, 5, 3);
        System.out.println("5 + 3 = " + result);
        
        System.out.println("\n=== 调用私有方法 ===");
        Method formatMethod = clazz.getDeclaredMethod("formatResult", String.class, int.class);
        formatMethod.setAccessible(true);
        String formatted = (String) formatMethod.invoke(calc, "加法", result);
        System.out.println(formatted);
        
        System.out.println("\n=== 调用静态方法 ===");
        Method staticMethod = clazz.getMethod("printInfo");
        staticMethod.invoke(null); // 静态方法传入 null
    }
}
```

### 4.4 反射操作构造方法

```java
import java.lang.reflect.Constructor;

public class Person {
    private String name;
    private int age;
    
    public Person() {
        this("Unknown", 0);
    }
    
    public Person(String name) {
        this(name, 0);
    }
    
    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }
    
    private Person(int age) {
        this("Private", age);
    }
    
    @Override
    public String toString() {
        return String.format("Person{name='%s', age=%d}", name, age);
    }
}

public class ConstructorReflectionDemo {
    public static void main(String[] args) throws Exception {
        Class<?> clazz = Person.class;
        
        System.out.println("=== 获取所有构造方法 ===");
        Constructor<?>[] constructors = clazz.getDeclaredConstructors();
        for (Constructor<?> constructor : constructors) {
            System.out.printf("构造方法: %s, 参数: %s%n",
                            constructor.getName(),
                            java.util.Arrays.toString(constructor.getParameterTypes()));
        }
        
        System.out.println("\n=== 使用不同构造方法创建对象 ===");
        
        // 无参构造方法
        Constructor<?> defaultConstructor = clazz.getConstructor();
        Person person1 = (Person) defaultConstructor.newInstance();
        System.out.println("无参构造: " + person1);
        
        // 单参构造方法
        Constructor<?> nameConstructor = clazz.getConstructor(String.class);
        Person person2 = (Person) nameConstructor.newInstance("张三");
        System.out.println("单参构造: " + person2);
        
        // 双参构造方法
        Constructor<?> fullConstructor = clazz.getConstructor(String.class, int.class);
        Person person3 = (Person) fullConstructor.newInstance("李四", 25);
        System.out.println("双参构造: " + person3);
        
        // 私有构造方法
        Constructor<?> privateConstructor = clazz.getDeclaredConstructor(int.class);
        privateConstructor.setAccessible(true);
        Person person4 = (Person) privateConstructor.newInstance(30);
        System.out.println("私有构造: " + person4);
    }
}
```

### 4.5 反射工具类

```java
import java.lang.reflect.*;
import java.util.*;

public class ReflectionUtils {
    
    /**
     * 获取对象的所有字段值
     */
    public static Map<String, Object> getFieldValues(Object obj) {
        Map<String, Object> fieldValues = new HashMap<>();
        Class<?> clazz = obj.getClass();
        
        Field[] fields = clazz.getDeclaredFields();
        for (Field field : fields) {
            try {
                field.setAccessible(true);
                Object value = field.get(obj);
                fieldValues.put(field.getName(), value);
            } catch (IllegalAccessException e) {
                fieldValues.put(field.getName(), "无法访问");
            }
        }
        
        return fieldValues;
    }
    
    /**
     * 复制对象（浅拷贝）
     */
    public static <T> T copyObject(T source) throws Exception {
        Class<?> clazz = source.getClass();
        
        @SuppressWarnings("unchecked")
        T target = (T) clazz.getDeclaredConstructor().newInstance();
        
        Field[] fields = clazz.getDeclaredFields();
        for (Field field : fields) {
            field.setAccessible(true);
            Object value = field.get(source);
            field.set(target, value);
        }
        
        return target;
    }
    
    /**
     * 调用对象的方法
     */
    public static Object invokeMethod(Object obj, String methodName, 
                                    Class<?>[] paramTypes, Object... args) 
                                    throws Exception {
        Class<?> clazz = obj.getClass();
        Method method = clazz.getDeclaredMethod(methodName, paramTypes);
        method.setAccessible(true);
        return method.invoke(obj, args);
    }
    
    /**
     * 打印类的详细信息
     */
    public static void printClassInfo(Class<?> clazz) {
        System.out.println("=== 类信息: " + clazz.getSimpleName() + " ===");
        
        // 字段信息
        System.out.println("\n字段:");
        Field[] fields = clazz.getDeclaredFields();
        for (Field field : fields) {
            System.out.printf("  %s %s %s%n",
                            Modifier.toString(field.getModifiers()),
                            field.getType().getSimpleName(),
                            field.getName());
        }
        
        // 构造方法信息
        System.out.println("\n构造方法:");
        Constructor<?>[] constructors = clazz.getDeclaredConstructors();
        for (Constructor<?> constructor : constructors) {
            System.out.printf("  %s %s(%s)%n",
                            Modifier.toString(constructor.getModifiers()),
                            constructor.getName(),
                            Arrays.toString(constructor.getParameterTypes()));
        }
        
        // 方法信息
        System.out.println("\n方法:");
        Method[] methods = clazz.getDeclaredMethods();
        for (Method method : methods) {
            System.out.printf("  %s %s %s(%s)%n",
                            Modifier.toString(method.getModifiers()),
                            method.getReturnType().getSimpleName(),
                            method.getName(),
                            Arrays.toString(method.getParameterTypes()));
        }
    }
}

// 使用示例
public class ReflectionUtilsDemo {
    public static void main(String[] args) throws Exception {
        Student student = new Student("王五", 22, "大三");
        
        // 获取字段值
        Map<String, Object> fieldValues = ReflectionUtils.getFieldValues(student);
        System.out.println("字段值: " + fieldValues);
        
        // 复制对象
        Student copy = ReflectionUtils.copyObject(student);
        System.out.println("复制的对象: " + copy);
        
        // 打印类信息
        ReflectionUtils.printClassInfo(Student.class);
    }
}
```

---

## 5. 注解

### 5.1 内置注解

```java
// 使用内置注解
public class BuiltInAnnotationsDemo {
    
    @Deprecated
    public void oldMethod() {
        System.out.println("这是一个过时的方法");
    }
    
    @Override
    public String toString() {
        return "BuiltInAnnotationsDemo";
    }
    
    @SuppressWarnings("unchecked")
    public void suppressWarningsMethod() {
        @SuppressWarnings("rawtypes")
        List list = new ArrayList();
        list.add("item");
    }
    
    @SafeVarargs
    public final void safeVarargsMethod(List<String>... lists) {
        for (List<String> list : lists) {
            System.out.println(list);
        }
    }
}
```

### 5.2 自定义注解

```java
import java.lang.annotation.*;

// 方法级注解
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Timer {
    String value() default "";
    boolean enabled() default true;
}

// 类级注解
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Component {
    String name() default "";
    String version() default "1.0";
}

// 字段级注解
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Inject {
    String value() default "";
    boolean required() default true;
}

// 参数级注解
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface NotNull {
}

// 多目标注解
@Target({ElementType.METHOD, ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
public @interface Validate {
    String pattern() default "";
    int min() default 0;
    int max() default Integer.MAX_VALUE;
}
```

### 5.3 注解处理器

```java
import java.lang.reflect.Method;
import java.lang.reflect.Field;

@Component(name = "UserService", version = "2.0")
public class UserService {
    
    @Inject("userRepository")
    private String repository;
    
    @Validate(min = 1, max = 100)
    private int userId;
    
    @Timer("getUserById")
    public String getUserById(@NotNull String id) {
        return "User: " + id;
    }
    
    @Timer(value = "getAllUsers", enabled = false)
    public void getAllUsers() {
        System.out.println("获取所有用户");
    }
}

// 注解处理器
public class AnnotationProcessor {
    
    public static void processClass(Class<?> clazz) {
        System.out.println("=== 处理类: " + clazz.getSimpleName() + " ===");
        
        // 处理类级注解
        if (clazz.isAnnotationPresent(Component.class)) {
            Component component = clazz.getAnnotation(Component.class);
            System.out.printf("组件名称: %s, 版本: %s%n", 
                            component.name(), component.version());
        }
        
        // 处理字段注解
        Field[] fields = clazz.getDeclaredFields();
        for (Field field : fields) {
            if (field.isAnnotationPresent(Inject.class)) {
                Inject inject = field.getAnnotation(Inject.class);
                System.out.printf("注入字段: %s, 值: %s, 必需: %s%n",
                                field.getName(), inject.value(), inject.required());
            }
            
            if (field.isAnnotationPresent(Validate.class)) {
                Validate validate = field.getAnnotation(Validate.class);
                System.out.printf("验证字段: %s, 最小值: %d, 最大值: %d%n",
                                field.getName(), validate.min(), validate.max());
            }
        }
        
        // 处理方法注解
        Method[] methods = clazz.getDeclaredMethods();
        for (Method method : methods) {
            if (method.isAnnotationPresent(Timer.class)) {
                Timer timer = method.getAnnotation(Timer.class);
                System.out.printf("计时方法: %s, 名称: %s, 启用: %s%n",
                                method.getName(), timer.value(), timer.enabled());
            }
        }
    }
    
    public static void main(String[] args) {
        processClass(UserService.class);
    }
}
```

### 5.4 注解驱动的简单框架

```java
import java.lang.reflect.*;
import java.util.*;

// 简单的依赖注入容器
public class SimpleContainer {
    private Map<String, Object> beans = new HashMap<>();
    
    public void registerBean(String name, Object bean) {
        beans.put(name, bean);
    }
    
    public <T> T getBean(String name, Class<T> type) {
        return type.cast(beans.get(name));
    }
    
    public void injectDependencies(Object target) throws Exception {
        Class<?> clazz = target.getClass();
        Field[] fields = clazz.getDeclaredFields();
        
        for (Field field : fields) {
            if (field.isAnnotationPresent(Inject.class)) {
                Inject inject = field.getAnnotation(Inject.class);
                String beanName = inject.value().isEmpty() ? 
                                field.getName() : inject.value();
                
                Object dependency = beans.get(beanName);
                if (dependency != null) {
                    field.setAccessible(true);
                    field.set(target, dependency);
                    System.out.println("注入依赖: " + beanName + " -> " + field.getName());
                } else if (inject.required()) {
                    throw new RuntimeException("找不到必需的依赖: " + beanName);
                }
            }
        }
    }
    
    public Object executeWithTimer(Object target, String methodName, 
                                 Class<?>[] paramTypes, Object... args) 
                                 throws Exception {
        Method method = target.getClass().getDeclaredMethod(methodName, paramTypes);
        
        if (method.isAnnotationPresent(Timer.class)) {
            Timer timer = method.getAnnotation(Timer.class);
            if (timer.enabled()) {
                long startTime = System.nanoTime();
                Object result = method.invoke(target, args);
                long endTime = System.nanoTime();
                
                String timerName = timer.value().isEmpty() ? 
                                 methodName : timer.value();
                System.out.printf("方法 %s 执行时间: %.2f ms%n", 
                                timerName, (endTime - startTime) / 1_000_000.0);
                return result;
            }
        }
        
        return method.invoke(target, args);
    }
}

// 使用示例
public class FrameworkDemo {
    public static void main(String[] args) throws Exception {
        SimpleContainer container = new SimpleContainer();
        
        // 注册依赖
        container.registerBean("userRepository", "UserRepositoryImpl");
        
        // 创建服务并注入依赖
        UserService userService = new UserService();
        container.injectDependencies(userService);
        
        // 执行带计时的方法
        container.executeWithTimer(userService, "getUserById", 
                                 new Class[]{String.class}, "123");
        container.executeWithTimer(userService, "getAllUsers", new Class[]{});
    }
}
```

---

## 6. 泛型

### 6.1 泛型基础

```java
// 泛型类
public class Box<T> {
    private T content;
    
    public Box(T content) {
        this.content = content;
    }
    
    public T getContent() {
        return content;
    }
    
    public void setContent(T content) {
        this.content = content;
    }
    
    @Override
    public String toString() {
        return "Box{content=" + content + "}";
    }
}

// 泛型接口
public interface Comparable<T> {
    int compareTo(T other);
}

// 实现泛型接口
public class Student implements Comparable<Student> {
    private String name;
    private int score;
    
    public Student(String name, int score) {
        this.name = name;
        this.score = score;
    }
    
    @Override
    public int compareTo(Student other) {
        return Integer.compare(this.score, other.score);
    }
    
    // getters and toString...
    public String getName() { return name; }
    public int getScore() { return score; }
    
    @Override
    public String toString() {
        return String.format("Student{name='%s', score=%d}", name, score);
    }
}

// 使用泛型
public class GenericBasicsDemo {
    public static void main(String[] args) {
        // 泛型类使用
        Box<String> stringBox = new Box<>("Hello");
        Box<Integer> intBox = new Box<>(42);
        
        System.out.println(stringBox);
        System.out.println(intBox);
        
        // 泛型接口使用
        Student student1 = new Student("张三", 85);
        Student student2 = new Student("李四", 92);
        
        int result = student1.compareTo(student2);
        System.out.println("比较结果: " + result);
    }
}
```

### 6.2 泛型方法

```java
import java.util.*;

public class GenericMethods {
    
    // 泛型方法
    public static <T> void swap(T[] array, int i, int j) {
        T temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    
    // 多个类型参数
    public static <T, U> void printPair(T first, U second) {
        System.out.println("第一个: " + first + ", 第二个: " + second);
    }
    
    // 有界类型参数
    public static <T extends Number> double sum(List<T> numbers) {
        double total = 0.0;
        for (T number : numbers) {
            total += number.doubleValue();
        }
        return total;
    }
    
    // 递归类型边界
    public static <T extends Comparable<T>> T max(List<T> list) {
        if (list.isEmpty()) {
            return null;
        }
        
        T max = list.get(0);
        for (T item : list) {
            if (item.compareTo(max) > 0) {
                max = item;
            }
        }
        return max;
    }
    
    public static void main(String[] args) {
        // 使用泛型方法
        String[] strings = {"a", "b", "c"};
        System.out.println("交换前: " + Arrays.toString(strings));
        swap(strings, 0, 2);
        System.out.println("交换后: " + Arrays.toString(strings));
        
        // 多个类型参数
        printPair("Hello", 42);
        printPair(3.14, true);
        
        // 有界类型参数
        List<Integer> integers = Arrays.asList(1, 2, 3, 4, 5);
        List<Double> doubles = Arrays.asList(1.1, 2.2, 3.3);
        
        System.out.println("整数和: " + sum(integers));
        System.out.println("小数和: " + sum(doubles));
        
        // 递归类型边界
        List<String> words = Arrays.asList("apple", "banana", "cherry");
        System.out.println("最大字符串: " + max(words));
    }
}
```

### 6.3 通配符

```java
import java.util.*;

public class WildcardsDemo {
    
    // 上界通配符 (? extends T)
    public static double sumOfNumbers(List<? extends Number> numbers) {
        double sum = 0.0;
        for (Number number : numbers) {
            sum += number.doubleValue();
        }
        return sum;
    }
    
    // 下界通配符 (? super T)
    public static void addNumbers(List<? super Integer> numbers) {
        numbers.add(1);
        numbers.add(2);
        numbers.add(3);
    }
    
    // 无界通配符 (?)
    public static void printList(List<?> list) {
        for (Object item : list) {
            System.out.println(item);
        }
    }
    
    // PECS 原则示例 (Producer Extends, Consumer Super)
    public static <T> void copy(List<? extends T> source, List<? super T> destination) {
        for (T item : source) {
            destination.add(item);
        }
    }
    
    public static void main(String[] args) {
        // 上界通配符
        List<Integer> integers = Arrays.asList(1, 2, 3);
        List<Double> doubles = Arrays.asList(1.1, 2.2, 3.3);
        
        System.out.println("整数和: " + sumOfNumbers(integers));
        System.out.println("小数和: " + sumOfNumbers(doubles));
        
        // 下界通配符
        List<Number> numbers = new ArrayList<>();
        List<Object> objects = new ArrayList<>();
        
        addNumbers(numbers);
        addNumbers(objects);
        
        System.out.println("Numbers: " + numbers);
        System.out.println("Objects: " + objects);
        
        // 无界通配符
        printList(integers);
        printList(Arrays.asList("a", "b", "c"));
        
        // PECS 示例
        List<String> source = Arrays.asList("hello", "world");
        List<Object> destination = new ArrayList<>();
        copy(source, destination);
        System.out.println("复制结果: " + destination);
    }
}
```

### 6.4 类型擦除和限制

```java
import java.lang.reflect.*;
import java.util.*;

public class TypeErasureDemo {
    
    public static void demonstrateTypeErasure() {
        List<String> stringList = new ArrayList<>();
        List<Integer> intList = new ArrayList<>();
        
        // 运行时类型相同
        System.out.println("String List 类型: " + stringList.getClass());
        System.out.println("Integer List 类型: " + intList.getClass());
        System.out.println("类型相同: " + (stringList.getClass() == intList.getClass()));
    }
    
    // 泛型数组的限制
    public static void genericArrayLimitations() {
        // 编译错误: 不能创建泛型数组
        // List<String>[] stringLists = new List<String>[10];
        
        // 可以这样做
        @SuppressWarnings("unchecked")
        List<String>[] stringLists = new List[10];
        stringLists[0] = new ArrayList<>();
        
        // 或者使用 ArrayList
        List<List<String>> listOfLists = new ArrayList<>();
    }
    
    // 获取泛型信息的方法
    public static void getGenericInfo() throws Exception {
        // 通过反射获取泛型信息
        Method method = TypeErasureDemo.class.getMethod("methodWithGenericParam", List.class);
        Type[] paramTypes = method.getGenericParameterTypes();
        
        for (Type paramType : paramTypes) {
            if (paramType instanceof ParameterizedType) {
                ParameterizedType pType = (ParameterizedType) paramType;
                System.out.println("参数化类型: " + pType);
                System.out.println("原始类型: " + pType.getRawType());
                System.out.println("类型参数: " + Arrays.toString(pType.getActualTypeArguments()));
            }
        }
    }
    
    public void methodWithGenericParam(List<String> list) {
        // 方法体
    }
    
    public static void main(String[] args) throws Exception {
        demonstrateTypeErasure();
        genericArrayLimitations();
        getGenericInfo();
    }
}
```

---

## 7. 内部类

### 7.1 成员内部类

```java
public class OuterClass {
    private String outerField = "外部类字段";
    private static String staticField = "静态字段";
    
    // 成员内部类
    public class InnerClass {
        private String innerField = "内部类字段";
        
        public void innerMethod() {
            // 可以访问外部类的所有成员
            System.out.println("访问外部类字段: " + outerField);
            System.out.println("访问静态字段: " + staticField);
            System.out.println("内部类字段: " + innerField);
            
            // 调用外部类方法
            outerMethod();
        }
        
        public void accessOuterThis() {
            // 访问外部类的 this 引用
            System.out.println("外部类实例: " + OuterClass.this);
        }
    }
    
    public void outerMethod() {
        System.out.println("外部类方法");
        
        // 在外部类中创建内部类实例
        InnerClass inner = new InnerClass();
        inner.innerMethod();
    }
    
    public static void main(String[] args) {
        OuterClass outer = new OuterClass();
        
        // 创建内部类实例的方式
        OuterClass.InnerClass inner1 = outer.new InnerClass();
        inner1.innerMethod();
        
        // 另一种方式
        OuterClass.InnerClass inner2 = new OuterClass().new InnerClass();
        inner2.accessOuterThis();
    }
}
```

### 7.2 静态内部类

```java
public class StaticInnerDemo {
    private String instanceField = "实例字段";
    private static String staticField = "静态字段";
    
    // 静态内部类
    public static class StaticInner {
        private String innerField = "静态内部类字段";
        
        public void innerMethod() {
            // 只能访问外部类的静态成员
            System.out.println("访问静态字段: " + staticField);
            System.out.println("内部类字段: " + innerField);
            
            // 编译错误：不能访问实例字段
            // System.out.println(instanceField);
        }
        
        public static void staticInnerMethod() {
            System.out.println("静态内部类的静态方法");
        }
    }
    
    public static void main(String[] args) {
        // 创建静态内部类实例（不需要外部类实例）
        StaticInner staticInner = new StaticInner();
        staticInner.innerMethod();
        
        // 调用静态内部类的静态方法
        StaticInner.staticInnerMethod();
    }
}
```

### 7.3 局部内部类

```java
public class LocalInnerDemo {
    private String outerField = "外部类字段";
    
    public void methodWithLocalInner() {
        final String localVar = "局部变量";
        String effectivelyFinalVar = "实际final变量";
        
        // 局部内部类
        class LocalInner {
            private String innerField = "局部内部类字段";
            
            public void innerMethod() {
                System.out.println("外部类字段: " + outerField);
                System.out.println("局部变量: " + localVar);
                System.out.println("实际final变量: " + effectivelyFinalVar);
                System.out.println("内部类字段: " + innerField);
            }
        }
        
        // 在方法内使用局部内部类
        LocalInner localInner = new LocalInner();
        localInner.innerMethod();
        
        // effectivelyFinalVar = "修改后"; // 编译错误：会破坏 effectively final
    }
    
    public static void main(String[] args) {
        LocalInnerDemo demo = new LocalInnerDemo();
        demo.methodWithLocalInner();
    }
}
```

### 7.4 匿名内部类

```java
import java.util.*;

public class AnonymousInnerDemo {
    
    // 接口
    interface Greeting {
        void sayHello(String name);
    }
    
    // 抽象类
    abstract class Animal {
        protected String name;
        
        public Animal(String name) {
            this.name = name;
        }
        
        public abstract void makeSound();
        
        public void sleep() {
            System.out.println(name + " 正在睡觉");
        }
    }
    
    public void demonstrateAnonymousClasses() {
        // 实现接口的匿名类
        Greeting greeting = new Greeting() {
            @Override
            public void sayHello(String name) {
                System.out.println("你好, " + name + "!");
            }
        };
        greeting.sayHello("张三");
        
        // 继承抽象类的匿名类
        Animal dog = new Animal("旺财") {
            @Override
            public void makeSound() {
                System.out.println(name + " 汪汪叫");
            }
        };
        dog.makeSound();
        dog.sleep();
        
        // 继承具体类的匿名类
        Thread thread = new Thread() {
            @Override
            public void run() {
                System.out.println("匿名线程正在运行");
            }
        };
        thread.start();
        
        // 在集合操作中使用匿名类
        List<String> names = Arrays.asList("张三", "李四", "王五");
        
        Collections.sort(names, new Comparator<String>() {
            @Override
            public int compare(String s1, String s2) {
                return s2.compareTo(s1); // 降序排列
            }
        });
        
        System.out.println("排序后: " + names);
    }
    
    public static void main(String[] args) {
        AnonymousInnerDemo demo = new AnonymousInnerDemo();
        demo.demonstrateAnonymousClasses();
    }
}
```

### 7.5 内部类的实际应用

```java
import java.util.*;

// 迭代器模式的实现
public class MyList<T> {
    private Object[] elements;
    private int size = 0;
    private static final int DEFAULT_CAPACITY = 10;
    
    public MyList() {
        elements = new Object[DEFAULT_CAPACITY];
    }
    
    public void add(T element) {
        if (size >= elements.length) {
            resize();
        }
        elements[size++] = element;
    }
    
    @SuppressWarnings("unchecked")
    public T get(int index) {
        if (index < 0 || index >= size) {
            throw new IndexOutOfBoundsException();
        }
        return (T) elements[index];
    }
    
    public int size() {
        return size;
    }
    
    private void resize() {
        elements = Arrays.copyOf(elements, elements.length * 2);
    }
    
    // 成员内部类实现迭代器
    public class ListIterator implements Iterator<T> {
        private int currentIndex = 0;
        
        @Override
        public boolean hasNext() {
            return currentIndex < size;
        }
        
        @Override
        @SuppressWarnings("unchecked")
        public T next() {
            if (!hasNext()) {
                throw new NoSuchElementException();
            }
            return (T) elements[currentIndex++];
        }
    }
    
    public Iterator<T> iterator() {
        return new ListIterator();
    }
    
    // 静态内部类实现构建器模式
    public static class Builder<T> {
        private MyList<T> list = new MyList<>();
        
        public Builder<T> add(T element) {
            list.add(element);
            return this;
        }
        
        public MyList<T> build() {
            return list;
        }
    }
    
    public static <T> Builder<T> builder() {
        return new Builder<>();
    }
    
    public static void main(String[] args) {
        // 使用构建器创建列表
        MyList<String> list = MyList.<String>builder()
            .add("Apple")
            .add("Banana")
            .add("Cherry")
            .build();
        
        // 使用迭代器遍历
        Iterator<String> iterator = list.iterator();
        while (iterator.hasNext()) {
            System.out.println(iterator.next());
        }
        
        // 增强for循环（需要实现Iterable接口）
        System.out.println("\n直接访问:");
        for (int i = 0; i < list.size(); i++) {
            System.out.println(list.get(i));
        }
    }
}
```

---

## 8. Lambda 表达式

### 8.1 Lambda 基础语法

```java
import java.util.*;
import java.util.function.*;

public class LambdaBasics {
    
    public static void main(String[] args) {
        // 基本语法形式
        
        // 1. 无参数
        Runnable r1 = () -> System.out.println("Hello Lambda");
        r1.run();
        
        // 2. 单个参数（可省略括号）
        Consumer<String> c1 = s -> System.out.println("消费: " + s);
        Consumer<String> c2 = (s) -> System.out.println("消费: " + s);
        c1.accept("测试");
        
        // 3. 多个参数
        BinaryOperator<Integer> add = (a, b) -> a + b;
        System.out.println("加法: " + add.apply(5, 3));
        
        // 4. 多行代码块
        BinaryOperator<Integer> complex = (a, b) -> {
            System.out.println("计算 " + a + " 和 " + b + " 的和");
            int result = a + b;
            return result;
        };
        System.out.println("复杂计算: " + complex.apply(10, 20));
        
        // 5. 类型推断
        List<String> list = Arrays.asList("apple", "banana", "cherry");
        list.forEach(item -> System.out.println(item)); // 推断 item 为 String
        
        // 6. 方法引用
        list.forEach(System.out::println); // 等价于上面的 lambda
    }
}
```

### 8.2 常用函数式接口

```java
import java.util.*;
import java.util.function.*;

public class FunctionalInterfacesDemo {
    
    public static void main(String[] args) {
        // Predicate<T> - 断言型接口
        Predicate<Integer> isEven = n -> n % 2 == 0;
        Predicate<Integer> isPositive = n -> n > 0;
        
        System.out.println("4 是偶数且为正数: " + isEvenAndPositive.test(4));
        System.out.println("-2 是偶数且为正数: " + isEvenAndPositive.test(-2));
        
        // Function<T, R> - 函数型接口
        Function<String, Integer> stringLength = s -> s.length();
        Function<Integer, String> intToString = i -> "数字: " + i;
        
        System.out.println("字符串长度: " + stringLength.apply("Hello"));
        
        // 函数组合
        Function<String, String> lengthToString = stringLength.andThen(intToString);
        System.out.println(lengthToString.apply("Lambda"));
        
        // Consumer<T> - 消费型接口
        Consumer<String> printer = s -> System.out.println("打印: " + s);
        Consumer<String> logger = s -> System.out.println("日志: " + s);
        
        // 组合消费者
        Consumer<String> combined = printer.andThen(logger);
        combined.accept("测试消息");
        
        // Supplier<T> - 供给型接口
        Supplier<String> randomString = () -> "随机数: " + Math.random();
        Supplier<Date> currentTime = Date::new;
        
        System.out.println(randomString.get());
        System.out.println("当前时间: " + currentTime.get());
        
        // UnaryOperator<T> - 一元操作符
        UnaryOperator<String> toUpperCase = String::toUpperCase;
        UnaryOperator<Integer> square = x -> x * x;
        
        System.out.println("转大写: " + toUpperCase.apply("hello"));
        System.out.println("平方: " + square.apply(5));
        
        // BinaryOperator<T> - 二元操作符
        BinaryOperator<String> concat = (s1, s2) -> s1 + s2;
        BinaryOperator<Integer> max = Integer::max;
        
        System.out.println("连接: " + concat.apply("Hello", "World"));
        System.out.println("最大值: " + max.apply(10, 20));
    }
}
```

### 8.3 方法引用

```java
import java.util.*;
import java.util.function.*;

public class MethodReferenceDemo {
    
    public static void staticMethod(String s) {
        System.out.println("静态方法: " + s);
    }
    
    public void instanceMethod(String s) {
        System.out.println("实例方法: " + s);
    }
    
    public static void main(String[] args) {
        List<String> list = Arrays.asList("apple", "banana", "cherry");
        
        // 1. 静态方法引用
        Consumer<String> staticRef = MethodReferenceDemo::staticMethod;
        list.forEach(staticRef);
        
        // 2. 实例方法引用
        MethodReferenceDemo demo = new MethodReferenceDemo();
        Consumer<String> instanceRef = demo::instanceMethod;
        list.forEach(instanceRef);
        
        // 3. 特定类型的任意对象的实例方法引用
        Function<String, Integer> lengthRef = String::length;
        list.stream().map(lengthRef).forEach(System.out::println);
        
        // 4. 构造方法引用
        Supplier<List<String>> listSupplier = ArrayList::new;
        Function<Integer, List<String>> listWithCapacity = ArrayList::new;
        
        List<String> newList1 = listSupplier.get();
        List<String> newList2 = listWithCapacity.apply(10);
        
        System.out.println("新列表1: " + newList1);
        System.out.println("新列表2容量: " + newList2.size());
        
        // 5. 数组构造方法引用
        Function<Integer, String[]> arrayCreator = String[]::new;
        String[] array = arrayCreator.apply(5);
        System.out.println("数组长度: " + array.length);
    }
}
```

### 8.4 Lambda 表达式的实际应用

```java
import java.util.*;
import java.util.stream.*;

public class LambdaApplications {
    
    static class Person {
        private String name;
        private int age;
        private String city;
        
        public Person(String name, int age, String city) {
            this.name = name;
            this.age = age;
            this.city = city;
        }
        
        // getters
        public String getName() { return name; }
        public int getAge() { return age; }
        public String getCity() { return city; }
        
        @Override
        public String toString() {
            return String.format("Person{name='%s', age=%d, city='%s'}", name, age, city);
        }
    }
    
    public static void main(String[] args) {
        List<Person> people = Arrays.asList(
            new Person("张三", 25, "北京"),
            new Person("李四", 30, "上海"),
            new Person("王五", 22, "北京"),
            new Person("赵六", 35, "深圳"),
            new Person("钱七", 28, "上海")
        );
        
        // 1. 排序
        System.out.println("=== 按年龄排序 ===");
        people.stream()
              .sorted((p1, p2) -> Integer.compare(p1.getAge(), p2.getAge()))
              .forEach(System.out::println);
        
        // 使用 Comparator.comparing
        System.out.println("\n=== 按姓名排序 ===");
        people.stream()
              .sorted(Comparator.comparing(Person::getName))
              .forEach(System.out::println);
        
        // 2. 过滤
        System.out.println("\n=== 年龄大于25的人 ===");
        people.stream()
              .filter(p -> p.getAge() > 25)
              .forEach(System.out::println);
        
        // 3. 映射
        System.out.println("\n=== 所有人的姓名 ===");
        people.stream()
              .map(Person::getName)
              .forEach(System.out::println);
        
        // 4. 分组
        System.out.println("\n=== 按城市分组 ===");
        Map<String, List<Person>> groupedByCity = people.stream()
            .collect(Collectors.groupingBy(Person::getCity));
        groupedByCity.forEach((city, persons) -> {
            System.out.println(city + ": " + persons.size() + " 人");
        });
        
        // 5. 聚合操作
        OptionalDouble averageAge = people.stream()
            .mapToInt(Person::getAge)
            .average();
        System.out.println("\n平均年龄: " + averageAge.orElse(0));
        
        // 6. 自定义收集器
        String names = people.stream()
            .map(Person::getName)
            .collect(Collectors.joining(", ", "[", "]"));
        System.out.println("所有姓名: " + names);
    }
}
```

---

## 9. 函数式接口

### 9.1 自定义函数式接口

```java
@FunctionalInterface
public interface MathOperation {
    double operate(double a, double b);
    
    // 默认方法
    default double operateAndPrint(double a, double b) {
        double result = operate(a, b);
        System.out.println("结果: " + result);
        return result;
    }
    
    // 静态方法
    static MathOperation add() {
        return (a, b) -> a + b;
    }
    
    static MathOperation multiply() {
        return (a, b) -> a * b;
    }
}

@FunctionalInterface
public interface TriFunction<T, U, V, R> {
    R apply(T t, U u, V v);
}

public class CustomFunctionalInterfaceDemo {
    
    public static void main(String[] args) {
        // 使用 Lambda 实现
        MathOperation subtract = (a, b) -> a - b;
        MathOperation divide = (a, b) -> b != 0 ? a / b : 0;
        
        System.out.println("减法: " + subtract.operate(10, 3));
        System.out.println("除法: " + divide.operate(10, 3));
        
        // 使用默认方法
        subtract.operateAndPrint(15, 5);
        
        // 使用静态方法
        MathOperation add = MathOperation.add();
        MathOperation multiply = MathOperation.multiply();
        
        System.out.println("加法: " + add.operate(5, 3));
        System.out.println("乘法: " + multiply.operate(5, 3));
        
        // 三元函数接口
        TriFunction<String, Integer, Boolean, String> formatter = 
            (str, num, upper) -> {
                String result = str + ": " + num;
                return upper ? result.toUpperCase() : result;
            };
        
        System.out.println(formatter.apply("count", 42, true));
         System.out.println(formatter.apply("value", 100, false));
     }
 }
 ```

### 9.2 函数式接口组合

```java
import java.util.function.*;
import java.util.*;

public class FunctionComposition {
    
    public static void main(String[] args) {
        // Function 组合
        Function<String, String> addPrefix = s -> "前缀_" + s;
        Function<String, String> addSuffix = s -> s + "_后缀";
        Function<String, String> toUpper = String::toUpperCase;
        
        // compose: 先执行参数函数，再执行当前函数
        Function<String, String> composed1 = addSuffix.compose(addPrefix);
        System.out.println("compose: " + composed1.apply("测试"));
        
        // andThen: 先执行当前函数，再执行参数函数
        Function<String, String> composed2 = addPrefix.andThen(addSuffix);
        System.out.println("andThen: " + composed2.apply("测试"));
        
        // 链式组合
        Function<String, String> pipeline = addPrefix
            .andThen(toUpper)
            .andThen(addSuffix);
        System.out.println("链式组合: " + pipeline.apply("hello"));
        
        // Predicate 组合
        Predicate<Integer> isPositive = x -> x > 0;
        Predicate<Integer> isEven = x -> x % 2 == 0;
        Predicate<Integer> isLessThan100 = x -> x < 100;
        
        // and, or, negate 组合
        Predicate<Integer> isPositiveEven = isPositive.and(isEven);
        Predicate<Integer> isPositiveOrEven = isPositive.or(isEven);
        Predicate<Integer> isNotPositive = isPositive.negate();
        
        List<Integer> numbers = Arrays.asList(-2, -1, 0, 1, 2, 3, 4, 5, 100, 101);
        
        System.out.println("\n正数且偶数:");
        numbers.stream().filter(isPositiveEven).forEach(System.out::println);
        
        System.out.println("\n复杂条件组合:");
        Predicate<Integer> complexCondition = isPositive
            .and(isEven)
            .and(isLessThan100);
        numbers.stream().filter(complexCondition).forEach(System.out::println);
        
        // Consumer 组合
        Consumer<String> print = System.out::println;
        Consumer<String> log = s -> System.err.println("LOG: " + s);
        
        Consumer<String> printAndLog = print.andThen(log);
        printAndLog.accept("测试消息");
    }
}
```

---

## 10. Stream API

### 10.1 Stream 基础操作

```java
import java.util.*;
import java.util.stream.*;

public class StreamBasics {
    
    public static void main(String[] args) {
        List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
        
        // 1. 创建 Stream
        Stream<Integer> stream1 = numbers.stream();
        Stream<Integer> stream2 = Stream.of(1, 2, 3, 4, 5);
        Stream<Integer> stream3 = Stream.iterate(0, n -> n + 2).limit(5);
        Stream<Double> stream4 = Stream.generate(Math::random).limit(3);
        
        // 2. 中间操作（惰性求值）
        System.out.println("=== 过滤和映射 ===");
        numbers.stream()
               .filter(n -> n % 2 == 0)  // 过滤偶数
               .map(n -> n * n)          // 平方
               .forEach(System.out::println);
        
        System.out.println("\n=== 去重和排序 ===");
        List<String> words = Arrays.asList("apple", "banana", "apple", "cherry", "banana");
        words.stream()
             .distinct()                    // 去重
             .sorted()                      // 排序
             .forEach(System.out::println);
        
        System.out.println("\n=== 限制和跳过 ===");
        numbers.stream()
               .skip(3)      // 跳过前3个
               .limit(4)     // 限制4个
               .forEach(System.out::println);
        
        // 3. 终端操作（触发计算）
        System.out.println("\n=== 聚合操作 ===");
        long count = numbers.stream().filter(n -> n > 5).count();
        System.out.println("大于5的数量: " + count);
        
        OptionalInt max = numbers.stream().mapToInt(Integer::intValue).max();
        System.out.println("最大值: " + max.orElse(0));
        
        int sum = numbers.stream().mapToInt(Integer::intValue).sum();
        System.out.println("总和: " + sum);
        
        OptionalDouble average = numbers.stream().mapToInt(Integer::intValue).average();
        System.out.println("平均值: " + average.orElse(0));
        
        // 4. 查找操作
        System.out.println("\n=== 查找操作 ===");
        Optional<Integer> first = numbers.stream().filter(n -> n > 5).findFirst();
        System.out.println("第一个大于5的数: " + first.orElse(-1));
        
        Optional<Integer> any = numbers.stream().filter(n -> n > 5).findAny();
        System.out.println("任意一个大于5的数: " + any.orElse(-1));
        
        // 5. 匹配操作
        boolean allPositive = numbers.stream().allMatch(n -> n > 0);
        boolean anyEven = numbers.stream().anyMatch(n -> n % 2 == 0);
        boolean noneNegative = numbers.stream().noneMatch(n -> n < 0);
        
        System.out.println("\n=== 匹配操作 ===");
        System.out.println("全部为正数: " + allPositive);
        System.out.println("存在偶数: " + anyEven);
        System.out.println("没有负数: " + noneNegative);
    }
}
```

### 10.2 Stream 高级操作

```java
import java.util.*;
import java.util.stream.*;

public class StreamAdvanced {
    
    static class Student {
        private String name;
        private int age;
        private String major;
        private double score;
        
        public Student(String name, int age, String major, double score) {
            this.name = name;
            this.age = age;
            this.major = major;
            this.score = score;
        }
        
        // getters
        public String getName() { return name; }
        public int getAge() { return age; }
        public String getMajor() { return major; }
        public double getScore() { return score; }
        
        @Override
        public String toString() {
            return String.format("Student{name='%s', age=%d, major='%s', score=%.1f}", 
                               name, age, major, score);
        }
    }
    
    public static void main(String[] args) {
        List<Student> students = Arrays.asList(
            new Student("张三", 20, "计算机", 85.5),
            new Student("李四", 22, "数学", 92.0),
            new Student("王五", 21, "计算机", 78.5),
            new Student("赵六", 23, "物理", 88.0),
            new Student("钱七", 20, "数学", 95.5)
        );
        
        // 1. 分组操作
        System.out.println("=== 按专业分组 ===");
        Map<String, List<Student>> groupedByMajor = students.stream()
            .collect(Collectors.groupingBy(Student::getMajor));
        groupedByMajor.forEach((major, studentList) -> {
            System.out.println(major + ": " + studentList.size() + " 人");
        });
        
        // 2. 分组统计
        System.out.println("\n=== 按专业统计平均分 ===");
        Map<String, Double> averageScoreByMajor = students.stream()
            .collect(Collectors.groupingBy(
                Student::getMajor,
                Collectors.averagingDouble(Student::getScore)
            ));
        averageScoreByMajor.forEach((major, avgScore) -> {
            System.out.printf("%s: %.2f\n", major, avgScore);
        });
        
        // 3. 分区操作
        System.out.println("\n=== 按分数分区 ===");
        Map<Boolean, List<Student>> partitioned = students.stream()
            .collect(Collectors.partitioningBy(s -> s.getScore() >= 90));
        System.out.println("优秀学生 (>=90): " + partitioned.get(true).size());
        System.out.println("普通学生 (<90): " + partitioned.get(false).size());
        
        // 4. 自定义收集器
        System.out.println("\n=== 自定义收集 ===");
        String studentNames = students.stream()
            .map(Student::getName)
            .collect(Collectors.joining(", ", "学生名单: [", "]"));
        System.out.println(studentNames);
        
        // 5. 统计信息
        System.out.println("\n=== 分数统计 ===");
        DoubleSummaryStatistics scoreStats = students.stream()
            .collect(Collectors.summarizingDouble(Student::getScore));
        System.out.println("分数统计: " + scoreStats);
        
        // 6. 多级分组
        System.out.println("\n=== 按专业和年龄分组 ===");
        Map<String, Map<Integer, List<Student>>> multiGrouped = students.stream()
            .collect(Collectors.groupingBy(
                Student::getMajor,
                Collectors.groupingBy(Student::getAge)
            ));
        multiGrouped.forEach((major, ageMap) -> {
            System.out.println(major + ":");
            ageMap.forEach((age, studentList) -> {
                System.out.println("  年龄 " + age + ": " + studentList.size() + " 人");
            });
        });
        
        // 7. flatMap 操作
        System.out.println("\n=== flatMap 示例 ===");
        List<List<String>> nestedList = Arrays.asList(
            Arrays.asList("a", "b"),
            Arrays.asList("c", "d", "e"),
            Arrays.asList("f")
        );
        
        List<String> flatList = nestedList.stream()
            .flatMap(List::stream)
            .collect(Collectors.toList());
        System.out.println("扁平化结果: " + flatList);
        
        // 8. reduce 操作
        System.out.println("\n=== reduce 操作 ===");
        Optional<Student> topStudent = students.stream()
            .reduce((s1, s2) -> s1.getScore() > s2.getScore() ? s1 : s2);
        System.out.println("最高分学生: " + topStudent.orElse(null));
        
        double totalScore = students.stream()
             .map(Student::getScore)
             .reduce(0.0, Double::sum);
         System.out.println("总分: " + totalScore);
     }
 }
 ```

### 10.3 并行流

```java
import java.util.*;
import java.util.stream.*;
import java.util.concurrent.*;

public class ParallelStreamExample {
    
    public static void main(String[] args) {
        List<Integer> largeList = IntStream.rangeClosed(1, 1000000)
                                          .boxed()
                                          .collect(Collectors.toList());
        
        // 串行流处理
        long startTime = System.currentTimeMillis();
        long sequentialSum = largeList.stream()
                                     .mapToLong(Integer::longValue)
                                     .sum();
        long sequentialTime = System.currentTimeMillis() - startTime;
        
        // 并行流处理
        startTime = System.currentTimeMillis();
        long parallelSum = largeList.parallelStream()
                                   .mapToLong(Integer::longValue)
                                   .sum();
        long parallelTime = System.currentTimeMillis() - startTime;
        
        System.out.println("串行流结果: " + sequentialSum + ", 耗时: " + sequentialTime + "ms");
        System.out.println("并行流结果: " + parallelSum + ", 耗时: " + parallelTime + "ms");
        
        // 并行流的线程安全问题
        System.out.println("\n=== 并行流线程安全 ===");
        List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
        
        // 错误示例：非线程安全
        List<Integer> unsafeResult = new ArrayList<>();
        numbers.parallelStream().forEach(unsafeResult::add); // 可能导致数据丢失
        System.out.println("非线程安全结果大小: " + unsafeResult.size());
        
        // 正确示例：使用线程安全的收集器
        List<Integer> safeResult = numbers.parallelStream()
                                         .collect(Collectors.toList());
        System.out.println("线程安全结果: " + safeResult);
        
        // 使用同步集合
        List<Integer> synchronizedList = Collections.synchronizedList(new ArrayList<>());
        numbers.parallelStream().forEach(synchronizedList::add);
        System.out.println("同步集合结果大小: " + synchronizedList.size());
        
        // 并行流的适用场景
        System.out.println("\n=== 并行流性能对比 ===");
        
        // CPU密集型任务
        List<Integer> testData = IntStream.rangeClosed(1, 10000)
                                         .boxed()
                                         .collect(Collectors.toList());
        
        // 串行处理
        startTime = System.nanoTime();
        double sequentialResult = testData.stream()
                                         .mapToDouble(n -> Math.sqrt(n * n * n))
                                         .sum();
        long sequentialNanos = System.nanoTime() - startTime;
        
        // 并行处理
        startTime = System.nanoTime();
        double parallelResult = testData.parallelStream()
                                       .mapToDouble(n -> Math.sqrt(n * n * n))
                                       .sum();
        long parallelNanos = System.nanoTime() - startTime;
        
        System.out.printf("串行处理: %.2f, 耗时: %.2fms\n", 
                         sequentialResult, sequentialNanos / 1_000_000.0);
        System.out.printf("并行处理: %.2f, 耗时: %.2fms\n", 
                         parallelResult, parallelNanos / 1_000_000.0);
        
        // 控制并行度
        System.out.println("\n=== 控制并行度 ===");
        System.out.println("可用处理器数量: " + Runtime.getRuntime().availableProcessors());
        
        // 使用自定义ForkJoinPool
        ForkJoinPool customThreadPool = new ForkJoinPool(2);
        try {
            long customResult = customThreadPool.submit(() ->
                numbers.parallelStream()
                       .mapToLong(Integer::longValue)
                       .sum()
            ).get();
            System.out.println("自定义线程池结果: " + customResult);
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            customThreadPool.shutdown();
        }
    }
}
```

---

## 11. Optional 类

### 11.1 Optional 基础用法

```java
import java.util.*;

public class OptionalBasics {
    
    public static void main(String[] args) {
        // 1. 创建 Optional
        Optional<String> empty = Optional.empty();
        Optional<String> nonEmpty = Optional.of("Hello");
        Optional<String> nullable = Optional.ofNullable(null);
        Optional<String> nullable2 = Optional.ofNullable("World");
        
        System.out.println("=== Optional 创建 ===");
        System.out.println("empty: " + empty);
        System.out.println("nonEmpty: " + nonEmpty);
        System.out.println("nullable: " + nullable);
        System.out.println("nullable2: " + nullable2);
        
        // 2. 检查值是否存在
        System.out.println("\n=== 检查值 ===");
        System.out.println("empty.isPresent(): " + empty.isPresent());
        System.out.println("nonEmpty.isPresent(): " + nonEmpty.isPresent());
        System.out.println("empty.isEmpty(): " + empty.isEmpty()); // Java 11+
        
        // 3. 获取值
        System.out.println("\n=== 获取值 ===");
        
        // 安全获取值
        if (nonEmpty.isPresent()) {
            System.out.println("值: " + nonEmpty.get());
        }
        
        // 使用 orElse
        String value1 = empty.orElse("默认值");
        String value2 = nonEmpty.orElse("默认值");
        System.out.println("empty.orElse(): " + value1);
        System.out.println("nonEmpty.orElse(): " + value2);
        
        // 使用 orElseGet（惰性求值）
        String value3 = empty.orElseGet(() -> "惰性默认值");
        System.out.println("empty.orElseGet(): " + value3);
        
        // 使用 orElseThrow
        try {
            String value4 = empty.orElseThrow(() -> new RuntimeException("值不存在"));
        } catch (RuntimeException e) {
            System.out.println("异常: " + e.getMessage());
        }
        
        // 4. 条件执行
        System.out.println("\n=== 条件执行 ===");
        nonEmpty.ifPresent(s -> System.out.println("值存在: " + s));
        empty.ifPresent(s -> System.out.println("这不会执行"));
        
        // Java 9+ ifPresentOrElse
        nonEmpty.ifPresentOrElse(
            s -> System.out.println("存在值: " + s),
            () -> System.out.println("值不存在")
        );
        
        empty.ifPresentOrElse(
            s -> System.out.println("这不会执行"),
            () -> System.out.println("空值处理")
        );
    }
}
```

### 11.2 Optional 高级用法

```java
import java.util.*;
import java.util.stream.*;

public class OptionalAdvanced {
    
    static class Person {
        private String name;
        private Optional<String> email;
        private Optional<Address> address;
        
        public Person(String name, String email, Address address) {
            this.name = name;
            this.email = Optional.ofNullable(email);
            this.address = Optional.ofNullable(address);
        }
        
        public String getName() { return name; }
        public Optional<String> getEmail() { return email; }
        public Optional<Address> getAddress() { return address; }
    }
    
    static class Address {
        private String street;
        private String city;
        
        public Address(String street, String city) {
            this.street = street;
            this.city = city;
        }
        
        public String getStreet() { return street; }
        public String getCity() { return city; }
    }
    
    public static void main(String[] args) {
        List<Person> people = Arrays.asList(
            new Person("张三", "zhang@example.com", new Address("中山路", "北京")),
            new Person("李四", null, null),
            new Person("王五", "wang@example.com", new Address("人民路", "上海"))
        );
        
        // 1. map 操作
        System.out.println("=== map 操作 ===");
        Optional<String> name = Optional.of("hello");
        Optional<String> upperName = name.map(String::toUpperCase);
        System.out.println("转大写: " + upperName.orElse("无值"));
        
        Optional<Integer> length = name.map(String::length);
        System.out.println("字符串长度: " + length.orElse(0));
        
        // 2. flatMap 操作
        System.out.println("\n=== flatMap 操作 ===");
        people.forEach(person -> {
            String email = person.getEmail()
                                .map(String::toUpperCase)
                                .orElse("无邮箱");
            System.out.println(person.getName() + " 的邮箱: " + email);
            
            String city = person.getAddress()
                               .map(Address::getCity)
                               .orElse("未知城市");
            System.out.println(person.getName() + " 的城市: " + city);
        });
        
        // 3. filter 操作
        System.out.println("\n=== filter 操作 ===");
        Optional<String> longEmail = Optional.of("very.long.email@example.com")
                                           .filter(email -> email.length() > 10);
        System.out.println("长邮箱: " + longEmail.orElse("邮箱太短"));
        
        Optional<String> shortEmail = Optional.of("a@b.com")
                                            .filter(email -> email.length() > 10);
        System.out.println("短邮箱: " + shortEmail.orElse("邮箱太短"));
        
        // 4. 链式操作
        System.out.println("\n=== 链式操作 ===");
        people.forEach(person -> {
            String result = person.getEmail()
                                 .filter(email -> email.contains("@"))
                                 .map(email -> email.substring(0, email.indexOf("@")))
                                 .map(String::toUpperCase)
                                 .orElse("无效用户名");
            System.out.println(person.getName() + " 的用户名: " + result);
        });
        
        // 5. Optional 与 Stream 结合
        System.out.println("\n=== Optional 与 Stream ===");
        List<String> emails = people.stream()
                                   .map(Person::getEmail)
                                   .filter(Optional::isPresent)
                                   .map(Optional::get)
                                   .collect(Collectors.toList());
        System.out.println("所有邮箱: " + emails);
        
        // Java 9+ 更简洁的写法
        List<String> emails2 = people.stream()
                                    .map(Person::getEmail)
                                    .flatMap(Optional::stream)
                                    .collect(Collectors.toList());
        System.out.println("所有邮箱(Java 9+): " + emails2);
        
        // 6. Optional 的组合
        System.out.println("\n=== Optional 组合 ===");
        Optional<String> firstName = Optional.of("张");
        Optional<String> lastName = Optional.of("三");
        
        // 组合两个 Optional
        Optional<String> fullName = firstName.flatMap(first ->
            lastName.map(last -> first + last)
        );
        System.out.println("全名: " + fullName.orElse("未知"));
        
        // 7. 实用工具方法
        System.out.println("\n=== 实用工具 ===");
        
        // 安全的字符串转整数
        System.out.println("字符串转整数: " + safeParseInt("123").orElse(-1));
        System.out.println("无效字符串转整数: " + safeParseInt("abc").orElse(-1));
        
        // 安全的数组访问
        String[] array = {"a", "b", "c"};
        System.out.println("数组[1]: " + safeArrayAccess(array, 1).orElse("越界"));
        System.out.println("数组[5]: " + safeArrayAccess(array, 5).orElse("越界"));
    }
    
    // 安全的字符串转整数
    public static Optional<Integer> safeParseInt(String str) {
        try {
            return Optional.of(Integer.parseInt(str));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }
    
    // 安全的数组访问
    public static <T> Optional<T> safeArrayAccess(T[] array, int index) {
        if (index >= 0 && index < array.length) {
            return Optional.ofNullable(array[index]);
        }
        return Optional.empty();
    }
}
```

---

## 12. 总结与最佳实践

### 12.1 设计原则

1. **单一职责原则**：每个类应该只有一个改变的理由
2. **开闭原则**：对扩展开放，对修改关闭
3. **里氏替换原则**：子类应该能够替换父类
4. **接口隔离原则**：不应该强迫客户依赖它们不使用的方法
5. **依赖倒置原则**：高层模块不应该依赖低层模块

### 12.2 编码最佳实践

```java
// 1. 使用 Optional 避免 null 检查
public Optional<User> findUserById(Long id) {
    // 返回 Optional 而不是 null
    return userRepository.findById(id);
}

// 2. 使用 Stream API 进行集合操作
List<String> activeUserNames = users.stream()
    .filter(User::isActive)
    .map(User::getName)
    .collect(Collectors.toList());

// 3. 使用函数式接口提高代码可读性
Predicate<User> isAdult = user -> user.getAge() >= 18;
Function<User, String> getUserInfo = user -> 
    user.getName() + " (" + user.getAge() + ")";

// 4. 合理使用泛型
public <T extends Comparable<T>> T findMax(List<T> list) {
    return list.stream().max(Comparable::compareTo).orElse(null);
}

// 5. 使用枚举替代常量
public enum Status {
    ACTIVE("激活"),
    INACTIVE("未激活"),
    SUSPENDED("暂停");
    
    private final String description;
    
    Status(String description) {
        this.description = description;
    }
    
    public String getDescription() {
        return description;
    }
}
```

### 12.3 性能优化建议

1. **合理使用并行流**：仅在数据量大且CPU密集型任务时使用
2. **避免过度使用反射**：反射会影响性能，考虑使用注解处理器
3. **正确使用泛型**：避免类型擦除带来的性能问题
4. **合理设计类层次**：避免过深的继承层次
5. **使用适当的集合类型**：根据使用场景选择合适的集合实现

### 12.4 安全注意事项

1. **避免反射安全漏洞**：限制反射的使用范围
2. **正确处理异常**：不要忽略或隐藏异常
3. **使用不可变对象**：提高线程安全性
4. **验证输入参数**：使用 Optional 和断言进行参数验证
5. **遵循最小权限原则**：合理设置访问修饰符
