# 程序计数器

程序计数器（pc register）是 JVM 规范中的线程私有执行位置。当前方法是 Java 方法时，它指向正在执行的 JVM 指令；当前方法是 native 方法时，其值**未定义**。它描述 JVM 的执行模型，不要求实现为一块能单独观察和调参的 Java 内存。

![两个线程的执行位置与方法返回](/jvm/program-counter-frames.svg)

## 执行位置与调用现场

两个线程可以执行同一个 `total` 方法，却分别停在不同指令、拥有不同参数与操作数。线程 A 暂停，不会把线程 B 的指令位置覆盖。调用其他方法时，当前帧发生切换；返回后恢复调用者的现场，并继续调用指令之后的流程，而不是从头重跑。

OS 调度保存的机器寄存器与 JVM 规范的 pc 也不能直接画等号。解释执行可以用字节码位置描述进度；JIT 编译后 CPU 执行机器码，JVM 利用元数据把机器码位置映射回 Java 方法和字节码位置。崩溃日志里的机器地址不是 `javap` 输出的偏移量。

## 用加法观察偏移

保存为 `CounterDemo.java`：

```java
class CounterDemo {
    static int total(int price, int freight) {
        return price + freight;
    }

    public static void main(String[] args) {
        System.out.println(total(199, 10));
    }
}
```

```bash
javac CounterDemo.java
java CounterDemo
javap -c CounterDemo
```

程序输出 `209`。`total` 的核心字节码如下：

```text
0: iload_0
1: iload_1
2: iadd
3: ireturn
```

`iload_0`、`iload_1` 把局部变量槽的整数送入操作数栈，`iadd` 取两个值相加并放回结果，`ireturn` 把结果交给调用者。`0` 到 `3` 是这个方法内部的字节码偏移；碰到带操作数的其他指令，偏移不一定每次只加一，也不是源文件行号。

## 排障时看什么

pc 区域没有规范规定的 OOM 情形，也没有独立容量开关。实际定位使用异常栈、调试器或性能采样；源代码行号通常依赖编译生成的行号表，不能从一个字节码偏移直接猜行号。涉及 native 崩溃时还需对应库的符号和调用栈。

`jcmd <pid> Thread.print` 查看的是当前线程现场，异常日志保存的是抛出时调用链；二者时间点不同。理解 pc 是为了把“指令位置”和[栈帧](./vm-stack.md)分开，具体 Class 文件结构见[Class 文件与字节码](../class-file-bytecode.md)。
