# Class 文件与字节码

Class 文件是 JVM 的稳定输入格式。Java、Kotlin、Scala、Groovy 等语言都可以编译成 Class 文件，再交给 JVM 运行。理解 Class 文件，可以解释很多运行期问题：版本不兼容、方法找不到、字段找不到、动态代理、lambda、反射调用和字节码增强。

## Class 文件解决什么问题

源码面向开发者，机器码面向 CPU，Class 文件位于中间：

```text
Java Source -> javac -> Class File -> JVM -> OS / CPU
```

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
| 属性表 | 行号表、局部变量表、注解、泛型签名等 |

查看方式：

```bash
javap -v OrderService
```

## 版本号

Class 文件版本决定运行它需要的最低 JVM 版本。常见错误：

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

## 常量池

常量池保存运行期链接所需的符号引用，例如：

- 类名：`java/lang/String`
- 方法名：`println`
- 方法描述符：`(Ljava/lang/String;)V`
- 字段名：`out`
- 字符串字面量
- 动态调用入口

很多运行期错误发生在“符号引用解析为直接引用”的阶段：

| 错误 | 常见原因 |
| --- | --- |
| `ClassNotFoundException` | 运行时找不到类 |
| `NoClassDefFoundError` | 编译时有类，运行时缺失或初始化失败 |
| `NoSuchMethodError` | 运行时方法签名和编译期不一致 |
| `NoSuchFieldError` | 运行时字段和编译期不一致 |
| `IllegalAccessError` | 访问权限在运行期不满足 |

这些问题不是“JVM 随机出错”，通常是运行时依赖版本和编译时依赖版本不一致。

## 方法描述符

JVM 不只看方法名，还看方法描述符。比如：

```java
void save(String name)
int save(String name)
void save(Object value)
```

在字节码层面会变成不同的方法签名。方法描述符示例：

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

排查 `NoSuchMethodError` 时，最可靠的方法是对编译期和运行期 jar 分别执行 `javap -classpath`，比较方法描述符。

## Code 属性与字节码

方法真正执行的指令在 `Code` 属性里。示例：

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
| `invokespecial` | 构造方法、私有方法、父类方法 |
| `invokeinterface` | 接口方法调用 |
| `invokedynamic` | 动态调用，常见于 lambda 和字符串拼接 |

字节码是偏栈式模型。计算过程通常是：

```text
局部变量表 -> 操作数栈 -> 指令计算 -> 操作数栈 -> 局部变量表或返回值
```

## 异常表

Java 的 `try/catch/finally` 在 Class 文件中会形成异常表。异常表描述：

- 哪段字节码受保护。
- 捕获什么异常类型。
- 跳到哪个 handler 执行。

理解异常表有助于看懂：

- finally 为什么可能被复制到多条路径。
- 异常栈为什么能定位行号。
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

