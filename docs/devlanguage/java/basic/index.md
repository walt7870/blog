# Java 基础

一段订单程序要把输入转换为对象，判断状态，累计金额，再报告成功或失败。变量、分支、循环、方法和异常都可以放进这条处理链理解；先能解释数据在哪里变化，再进入框架，才容易判断一次请求为何得到某个结果。

本专题覆盖 JDK、基础语法、标准 API 和语言特性。本页以 JDK 17 为练习基线，用一个可编译的订单例子串起语法与对象引用；金额、集合和时间等 API 的细节放在工具类页，避免在不同文章重复维护。

## 阅读路径

| 当前问题 | 阅读入口 | 读完后应能完成 |
| --- | --- | --- |
| `java`、`javac` 和项目版本不一致 | [JDK 概述](./jdk/index.md) | 查清编译器、运行时和目标版本 |
| 旧项目需要升级 JDK | [JDK 版本变化](./jdk/upgrade.md) | 区分语言、API、字节码与运行参数变化 |
| 如何把规则写成程序 | 本页 | 独立编译运行，并解释变量、引用与失败路径 |
| 相等、金额、集合与日期有什么陷阱 | [基础工具类](./base-class.md) | 验证精度、共享和生命周期边界 |
| 泛型、注解、反射、Lambda、Stream 如何协作 | [语言特性](./special.md) | 判断编译期约束与运行期行为 |
| 类加载、内存和 GC 如何影响程序 | [JVM](../jvm/index.md) | 从运行过程定位实际故障 |

## 从两笔订单开始

以下是完整的 `OrderBasics.java`。订单金额以分存储，状态使用枚举；构造器拒绝负金额和空身份，支付方法只允许待支付状态变成已支付，统计方法只累计已支付订单。这里仅演示单线程、内存内的数据变化，不涉及数据库事务、支付回调或并发控制。

```java
import java.util.Objects;

public class OrderBasics {
    enum Status { PENDING, PAID, CANCELLED }

    static final class Order {
        private final String id;
        private final long amountCent;
        private Status status;

        Order(String id, long amountCent, Status status) {
            this.id = Objects.requireNonNull(id, "订单号不能为空");
            if (id.isBlank() || amountCent < 0) {
                throw new IllegalArgumentException("订单号或金额不合法");
            }
            this.amountCent = amountCent;
            this.status = Objects.requireNonNull(status, "状态不能为空");
        }
    }

    static void markPaid(Order order) {
        Objects.requireNonNull(order, "订单不能为空");
        if (order.status != Status.PENDING) {
            throw new IllegalStateException("只有待支付订单允许支付");
        }
        order.status = Status.PAID;
    }

    static void replaceLocal(Order order) {
        order = new Order("999", 0, Status.PENDING);
    }

    static long paidTotal(Order[] orders) {
        long total = 0;
        for (Order order : orders) {
            if (order.status != Status.PAID) continue;
            total = Math.addExact(total, order.amountCent);
        }
        return total;
    }

    public static void main(String[] args) {
        var order = new Order("102", 5000, Status.PENDING);
        markPaid(order);
        replaceLocal(order);
        Order[] orders = {
            order, new Order("103", 3000, Status.PAID)
        };
        System.out.println("原订单=" + order.id + "，状态=" + order.status);
        System.out.println("已支付总额=" + paidTotal(orders) + "分");
    }
}
```

```bash
java -version
javac -version
javac --release 17 -encoding UTF-8 OrderBasics.java
java OrderBasics
```

结果应为原订单仍是 `102`，状态变成 `PAID`，总额为 `8000` 分。`replaceLocal` 是专门说明参数语义的教学方法：它创建并赋值了新对象，却没有把调用者的变量换掉。它不应出现在真实支付处理流程中。

编译时文件名与这里的公共类名一致，运行时传类名 `OrderBasics`，不带 `.class`。这个例子不声明包，因此在输出 class 所在目录运行；进入正式项目后，`package` 决定全限定类名，启动时还需要正确的 classpath。`import` 让源码可使用短类名，并不会下载依赖，也不会把子包自动一起导入。

## 变量、对象与参数传递

![Java方法参数按值传递与对象共享](/java/method-value-reference.svg)

Java 的参数按值传递。基本类型传递数值副本，引用类型传递引用值的副本；后者可以让两个变量访问同一个对象。`markPaid(order)` 改的是共享对象里的字段，所以调用者能看到 `PAID`。`replaceLocal(order)` 改的是形参变量保存的引用，所以不会让调用者的 `order` 指向新订单。

`this.id = id` 左侧是当前对象字段，右侧是构造器参数。构造器用来建立对象的不变量，不声明返回类型。`static` 方法属于类，不依赖某个实例的 `this`，但可以显式接收对象；实例方法则通常把操作组织到对象自身。这里只把订单封装在一个文件里，真正业务类仍应通过受控方法维护状态。

`final` 字段只允许在规定的初始化位置赋值，不意味着它指向的对象不可变。`final Order[] orders` 不能重新指向另一个数组，但数组中的元素仍可替换，对象里的非 final 字段仍可变化。数组长度固定，数组引用可以为 `null`，数组中的引用元素也可以为 `null`，应按入口合同决定是否允许；本例的 `paidTotal` 要求传入非空数组和非空元素。

实例字段和数组元素有默认值，例如整数为 0、引用为 `null`；局部变量必须在使用前完成确定赋值。`var` 仍是静态类型推断，不是动态类型，也不能用 `var value = null` 表达未知类型。重载依据编译期可见的参数类型等规则选择方法，不能只靠返回类型区分；实例方法的重写才参与运行时多态分派。

## 类型和运算的业务含义

| 类型或表达式 | 需要掌握的行为 | 在订单中的判断 |
| --- | --- | --- |
| `byte/short/int/long` | 有符号整数范围有限，普通溢出不自动报错 | 金额与中间乘法检查范围，必要时使用 exact 方法 |
| `float/double` | 二进制浮点，不精确表示所有十进制小数 | 不直接承担精确货币累计 |
| `char` | 一个 UTF-16 代码单元，不保证是一整个可见字符 | 文本截断需考虑代码点或字形 |
| `boolean` | 只有真和假，整数不能直接作条件 | 用明确条件表达是否可支付 |
| `10 / 3` | 整数除法得到 3 | 换成 `double` 也要在除法发生前完成转换 |
| `a == b` | 引用类型比较对象身份 | 业务值通常通过适当的 `equals` 比较 |
| `amount += delta` | 复合赋值包含隐式转换，不等同任意场景下的普通赋值 | 小整数类型与溢出尤其需要检查 |
| `& / \| / ^ / << / >> / >>>` | 整数的位运算，移位距离会按类型规则截取 | 适合明确定义的位标志和协议编码，不代替普通业务判断 |

`Integer` 是引用类型，拆箱遇到 `null` 会抛空指针异常，装箱缓存也不能作为 `==` 比较业务数值的依据。一个外部字符串即使能 `Long.parseLong`，也还要验证是否为允许的金额、数量或标识符；解析成功与业务合法是两个步骤。精度、编码与范围的可运行反例见[基础工具类](./base-class.md)。

## 分支、循环与方法边界

`if` 适合表达状态和范围判断，`&&`、`||` 短路可以避免在空值或零除数情况下继续访问；对 boolean 使用 `&`、`|` 时两边都会求值。条件的顺序因此会影响是否抛出异常，不能机械互换。

有限状态的展示可使用 `switch` 表达式；本例基线 JDK 17 支持下列不需要预览特性的写法：

```java
String label = switch (status) {
    case PENDING -> "待支付";
    case PAID -> "已支付";
    case CANCELLED -> "已取消";
};
```

这是方法体片段，`status` 必须是非空的 `Status`。`->` 分支不会像传统冒号分支那样贯穿到下一分支；多语句分支可用代码块和 `yield` 返回表达式结果。状态展示与状态变更是两种职责，界面文案改变不应该同时触发支付动作。

已知元素集合可以使用增强 for，按下标处理数组时使用 `i < array.length`，不用 `<=`；二维数组在 Java 中是“数组的数组”，每行可能不同长度或为空。`while` 适合次数尚未确定但结束条件明确的过程，`do-while` 至少执行一次。`continue` 跳过本轮，`break` 离开相应循环，`return` 则结束整个方法。遇到非法订单时选择跳过还是整批失败，必须由数据合同决定，不能为让总额看起来可用而默默忽略。

方法应表达有独立输入、输出与失败条件的操作。`paidTotal` 不修改订单，只返回合计；`markPaid` 不负责打印界面文案或发送消息。递归需要终止条件和输入范围，层数过深可能耗尽栈；斐波那契和二分查找的复杂度、范围与正确实现进入[算法专题](../../../algorithm/index.md)，避免把指数递归作为通用计算方案。

## 输入、异常与可验证的结果

练习中将 `"102"` 改成空串，应在构造器失败；将 5000 改成负数，应拒绝创建；连续调用两次 `markPaid`，第二次应因状态不符失败；把多笔金额加到超出 `long` 范围，应由 `addExact` 抛异常。真实系统可能将重复的支付通知处理为幂等成功，但那需要稳定业务身份及持久结果，不能仅靠这段内存方法实现。

`throw` 产生异常，`throws` 声明方法可能向上传播的相应异常，`try/catch` 则在能够处理的边界接住它。异常使后面的正常路径停止，不能在 catch 中只打印信息后返回一个正常总额；保留原因和明确失败结果，调用者才能决定回退、修复或重试。`finally` 通常用于离开 try 时的清理，但进程强杀、断电等情况下没有必然执行保证，也不应在其中用 `return` 覆盖原来的返回值或异常。

控制台交互可由程序入口拥有一个 `Scanner`，但 `nextInt`、`nextLine` 混用时要理解换行残留，非法输入还需要处理。业务工具方法不要随意关闭由调用者管理的 `System.in`。文件和网络资源则使用明确编码与 try-with-resources，细节见[异常与资源关闭](./base-class.md#异常与资源关闭)。

出现“编译失败”时先看错误行和实际 `javac` 版本，再判断语法、类型、依赖或导入；出现“找不到主类”时检查包名、输出目录和 classpath；出现 `UnsupportedClassVersionError` 时检查 class 的目标版本与运行 JDK。不要通过重复安装另一个 JDK 或删除全部依赖来替代定位。能解释正常输出和这些失败路径，才说明程序的基础行为已被掌握。
