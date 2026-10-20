# Class 文件与字节码

Class 文件是 JVM 的稳定输入格式。Java、Kotlin、Scala、Groovy 等语言都可以编译成 Class 文件，再交给 JVM 运行。理解 Class 文件，可以解释很多运行期问题：版本不兼容、方法找不到、字段找不到、动态代理、lambda、反射调用和字节码增强。

## Class 文件解决什么问题

源码面向开发者，机器码面向 CPU，Class 文件位于中间：

![编译期方法合同与运行期依赖冲突](/jvm/bytecode-linkage-contract.svg)

它让 Java 语言和底层平台解耦，也让 JVM 能在运行时做验证、链接、解释执行和即时编译。

## 基本结构

一个 Class 文件可以粗略拆成：

| 结构 | 作用 |
| --- | --- |
| 魔数 | 标识这是 Class 文件，固定为 `0xCAFEBABE` |
| 版本号 | 标识编译目标版本 |
| 常量池 | 存放类名、方法名、字段名、字符串、符号引用 |
| 访问标记 | public、final、interface、abstract 等 |
| 类关系 | 当前类、父类、接口 |
| 字段表 | 字段名、类型、访问标记、属性 |
| 方法表 | 方法名、描述符、Code 属性、异常表 |
| 各级属性 | 类、字段、方法、Code 分别有属性；行号表和局部变量表位于 Code 内 |

查看方式：

```bash
javap -v OrderService
```

## 版本号

普通 Class 文件的主版本限定最低运行时版本；预览特性类文件还有特殊次版本和对应发行版的启用约束，不能只看主版本。常见错误：

```text
java.lang.UnsupportedClassVersionError
```

含义通常是：编译用的 JDK 比运行环境新。排查时看：

```bash
javap -v SomeClass | grep "major version"
java -version
```

工程上要统一编译目标：

```xml
<maven.compiler.release>17</maven.compiler.release>
```

或 Gradle：

```kotlin
java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}
```

toolchain 选择编译器；若使用更新编译器面向 JDK 17 发布，还应设置 `JavaCompile.options.release = 17` 来约束目标字节码与可用标准 API。只设置 `sourceCompatibility` / `targetCompatibility` 不能阻止源码误用新 JDK API。更多工程配置见 [Gradle](../manager/gradle.md)。

## 常量池

常量池保存运行期链接所需的符号引用，例如：

- 类名：`java/lang/String`
- 方法名：`println`
- 方法描述符：`(Ljava/lang/String;)V`
- 字段名：`out`
- 字符串字面量
- 动态调用入口

类加载、初始化与符号引用解析失败，表现为不同错误：

| 错误 | 常见原因 |
| --- | --- |
| `ClassNotFoundException` | 显式加载类失败，例如 `Class.forName`；它不是链接错误 |
| `NoClassDefFoundError` | 编译时有类，运行时缺失或初始化失败 |
| `NoSuchMethodError` | 运行时方法签名和编译期不一致 |
| `NoSuchFieldError` | 运行时字段和编译期不一致 |
| `IllegalAccessError` | 访问权限在运行期不满足 |

类缺失、版本冲突、加载器可见性和初始化失败要分别判断。错误包含 `Could not initialize class` 时，应回查该类**第一次**初始化失败的异常，而不是继续往 classpath 塞同名 jar。

## 方法描述符

JVM 不只看方法名，还看方法描述符。比如：

```java
void save(String name) {}
void save(Object value) {}
```

这两个方法是合法的 Java 重载。JVM 方法描述符还包含返回类型，所以下列三个描述符彼此不同：

```text
(Ljava/lang/String;)V
(Ljava/lang/String;)I
(Ljava/lang/Object;)V
```

其中：

| 符号 | 含义 |
| --- | --- |
| `V` | void |
| `I` | int |
| `J` | long |
| `Z` | boolean |
| `L...;` | 对象类型 |
| `[` | 数组 |

但 Java 源码不能只按返回类型重载：`void save(String)` 与 `int save(String)` 不能在同一个 Java 类里同时声明。描述符里的返回类型仍影响二进制兼容：库把返回类型从 `int` 改成 `long`，旧调用者不会自动适配。

## 复现一次依赖冲突

在空的实验目录里创建三个源码文件，目录名分别为 `v1`、`v2`、`client`。使用 JDK 17，示例刻意只修改返回类型：

```java
// v1/Price.java
public class Price {
    public static int cents() { return 19900; }
}
```

```java
// v2/Price.java
public class Price {
    public static long cents() { return 19900L; }
}
```

```java
// client/Checkout.java
public class Checkout {
    public static void main(String[] args) {
        System.out.println(Price.cents());
    }
}
```

以下使用 macOS/Linux 的 classpath 分隔符 `:`；Windows 改为 `;`：

```bash
javac -d out/v1 v1/Price.java
javac -d out/v2 v2/Price.java
javac -cp out/v1 -d out/client client/Checkout.java
java -cp out/client:out/v1 Checkout
java -cp out/client:out/v2 Checkout
```

第一次输出 `19900`；第二次出现 `NoSuchMethodError: 'int Price.cents()'`。调用者编译时记录了 `Price.cents:()I`，运行时 v2 只提供 `()J`。类确实存在，增加堆内存不会修复这个合同冲突。

```bash
javap -classpath out/client -c Checkout
javap -classpath out/v1 -s Price
javap -classpath out/v2 -s Price
```

对照指令和描述符后，让调用者与目标库重新编译并一起发布，或者恢复兼容 API。仅重编译调用者可能使旧二进制恢复运行，但若单位、取值范围和业务语义同时改变，还需要业务验证。

## Code 属性与字节码

普通非 abstract、非 native 方法的字节码在 `Code` 属性里；abstract 和 native 方法没有它。示例：

```bash
javap -c Demo
```

常见指令：

| 指令 | 说明 |
| --- | --- |
| `iload` / `aload` | 从局部变量表加载 int / 引用 |
| `istore` / `astore` | 把值写入局部变量表 |
| `getfield` / `putfield` | 读写实例字段 |
| `getstatic` / `putstatic` | 读写静态字段 |
| `invokevirtual` | 普通虚方法调用 |
| `invokestatic` | 静态方法调用 |
| `invokespecial` | 构造方法、显式父类调用等特殊调用；私有方法的具体指令取决于调用形式与编译器 |
| `invokeinterface` | 接口方法调用 |
| `invokedynamic` | 动态调用，常见于 lambda 和字符串拼接 |

字节码是偏栈式模型。计算过程通常是：

```text
局部变量表 -> 操作数栈 -> 指令计算 -> 操作数栈 -> 局部变量表或返回值
```

## 异常表

`Code` 中的异常表记录受保护区间与处理入口；编译器通常借助它实现 `catch` 和需要异常路径的 `finally`，具体布局取决于源码和优化。它描述：

- 哪段字节码受保护。
- 捕获什么异常类型。
- 跳到哪个 handler 执行。

理解异常表有助于看懂：

- finally 为什么可能被复制到多条路径。
- 某个异常为什么会转交该 handler；源码行号则来自独立的 `LineNumberTable`，并非异常表。
- 反编译代码和源码为什么不完全一样。

## 字节码增强

很多框架会生成或修改 Class 文件：

| 场景 | 典型技术 |
| --- | --- |
| Spring AOP | JDK 动态代理、CGLIB |
| ORM 懒加载 | 字节码增强、代理类 |
| Mock 测试 | 运行期生成类 |
| Agent 监控 | Java Agent、ASM、Byte Buddy |
| 热部署 | 自定义 ClassLoader、类替换 |

字节码增强本身不是问题，问题在于：生成类过多会增加元空间压力，类加载器无法释放会形成类加载器泄漏，增强后方法栈也可能和源码不完全一致。

## 排查清单

遇到类或方法相关运行错误，按这个顺序查：

1. 看异常类型：找不到类、找不到方法、权限错误还是初始化错误。
2. 用 `jar tf app.jar | grep ClassName` 确认运行包里有没有目标类。
3. 用 `javap -classpath xxx.jar -v ClassName` 看版本、常量池和方法描述符。
4. 比较编译期依赖和运行期依赖。
5. 如果涉及容器、插件或热部署，再看类加载器边界。

<style scoped>
table:first-of-type td:first-child { white-space: nowrap; }
</style>

