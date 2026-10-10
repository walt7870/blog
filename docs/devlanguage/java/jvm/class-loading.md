# 类加载机制

类加载负责把 Class 文件变成 JVM 内部可使用的类型。它连接字节码、运行时数据区、反射、框架扫描、插件隔离和热部署，是 JVM 与 Java 生态框架之间最关键的桥。

## 生命周期

类从字节码进入 JVM，通常经过：

```text
加载 -> 验证 -> 准备 -> 解析 -> 初始化 -> 使用 -> 卸载
```

| 阶段 | 说明 | 常见问题 |
| --- | --- | --- |
| 加载 | 找到字节码，生成 Class 对象和类元数据 | 类路径错误、jar 缺失 |
| 验证 | 校验文件格式、语义和安全约束 | Class 版本不兼容、非法字节码 |
| 准备 | 为静态变量分配默认值 | 误以为此时已完成业务赋值 |
| 解析 | 符号引用解析为直接引用 | 方法、字段、类解析失败 |
| 初始化 | 执行静态变量赋值和静态代码块 | 静态初始化异常、循环依赖 |
| 卸载 | 类加载器不可达后，类元数据可被回收 | 热部署泄漏、Metaspace 增长 |

## 准备和初始化的区别

```java
class Config {
    static int port = 8080;
}
```

准备阶段为 `port` 分配默认值 `0`；初始化阶段才执行赋值，把它变成 `8080`。这个差异解释了很多静态字段初始化顺序问题。

## 类加载器层次

常见类加载器：

| 类加载器 | 作用 |
| --- | --- |
| Bootstrap ClassLoader | 加载核心类库，例如 `java.lang.*` |
| Platform ClassLoader | 加载平台模块 |
| Application ClassLoader | 加载应用 classpath / module path |
| 自定义 ClassLoader | 容器、插件、热部署、Agent 等场景使用 |

查看类加载器：

```java
System.out.println(String.class.getClassLoader());
System.out.println(ClassLoader.getSystemClassLoader());
System.out.println(Thread.currentThread().getContextClassLoader());
```

`String.class.getClassLoader()` 通常返回 `null`，表示由 Bootstrap ClassLoader 加载。

## 双亲委派

双亲委派的基本思路：

```text
当前 ClassLoader 收到加载请求
  -> 先交给父加载器
  -> 父加载器找不到
  -> 当前加载器再尝试加载
```

好处：

- 核心类库优先由上层加载器加载。
- 避免业务代码伪造 `java.lang.String`。
- 保证基础类型在进程内有稳定身份。

类身份由“类加载器 + 类全限定名”共同决定。两个加载器分别加载同名类，JVM 会认为它们不是同一个类型。

## 为什么会打破委派

工程里经常需要调整委派模型：

| 场景 | 原因 |
| --- | --- |
| Tomcat WebApp | 不同应用需要隔离依赖 |
| 插件系统 | 插件要带自己的 jar，卸载时希望释放类 |
| SPI | 由调用方决定扩展实现所在的类加载器 |
| Java Agent | 需要在启动或运行期增强类 |
| Spring Boot DevTools | 用不同加载器区分稳定依赖和可重启业务类 |

打破委派不等于破坏设计，它是在隔离、扩展和安全之间做取舍。

## 线程上下文类加载器

线程上下文类加载器常见于 SPI 和框架扩展：

```java
ClassLoader loader = Thread.currentThread().getContextClassLoader();
```

它解决的问题是：核心库由上层加载器加载，但扩展实现类可能在应用加载器里。典型例子包括 JDBC Driver、ServiceLoader、日志框架桥接。

## 类加载和 Spring

Spring 大量依赖类加载能力：

- 扫描 classpath 找组件。
- 用反射读取注解、方法和字段。
- 通过代理生成新类。
- 用不同加载器处理测试、重启、容器隔离。

Spring 项目里遇到 `ClassNotFoundException`、`NoSuchMethodError`、`BeanCreationException` 时，不要只看 Spring 栈，也要看运行时 classpath、依赖版本和类加载器。

## 常见问题

### ClassNotFoundException

运行时主动加载类失败。常见原因：

- jar 不在运行 classpath。
- 类名写错。
- 模块化或容器隔离导致不可见。

### NoClassDefFoundError

编译时存在，运行时使用时失败。可能是：

- 运行包缺依赖。
- 类初始化失败后再次使用。
- 依赖版本被排除或覆盖。

### ClassCastException

如果错误信息里两个类名相同，但加载器不同，通常是类加载器隔离问题：

```text
com.example.User cannot be cast to com.example.User
```

### Metaspace 持续增长

可能是类加载器泄漏。典型引用链：

```text
Thread / ThreadLocal / static field -> object -> Class -> ClassLoader
```

## 排查命令

```bash
jcmd <pid> VM.classloader_stats
jcmd <pid> GC.class_histogram | head
jcmd <pid> VM.flags
```

查看 jar 内容：

```bash
jar tf app.jar | grep 'com/example/User.class'
```

查看依赖树：

```bash
mvn dependency:tree
gradle dependencies
```

排查类加载问题时，核心问题只有三个：

1. 运行时有没有这个 Class 文件。
2. 是哪个 ClassLoader 加载的。
3. 编译期看到的版本和运行期看到的版本是否一致。

