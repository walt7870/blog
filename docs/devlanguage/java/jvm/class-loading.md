# 类加载机制

类加载负责把 Class 文件变成 JVM 内部可使用的类型。它连接字节码、运行时数据区、反射、框架扫描、插件隔离和热部署，是 JVM 与 Java 生态框架之间最关键的桥。

## 生命周期

类加载不是每次请求都重走一遍的流水线。先看类型何时进入可用状态，再看它的方法、字段引用何时被解析：

![类的初始化前提与延迟解析边界](/jvm/class-loading-boundaries.svg)

验证与准备必须在初始化前完成；解析既可提早完成，也可延迟到某条引用实际使用时。图中的解析支路表示时机可变，不表示初始化可以跳过所需的验证和准备。

| 阶段 | 说明 | 常见问题 |
| --- | --- | --- |
| 加载 | 找到字节码，生成 Class 对象和类元数据 | 类路径错误、jar 缺失 |
| 验证 | 校验文件格式、语义和安全约束 | Class 版本不兼容、非法字节码 |
| 准备 | 为静态字段建立存储并赋默认值 | 把默认值或常量赋值误当成业务初始化 |
| 解析 | 符号引用解析为直接引用 | 方法、字段、类解析失败 |
| 初始化 | 按规范规则初始化常量字段，并执行 `<clinit>`（若存在） | 静态初始化异常、循环依赖 |
| 卸载 | 定义加载器满足可回收条件后，类型才具备卸载条件 | 外部引用仍保留加载器、Metaspace 增长 |

## 准备和初始化的区别

```java
class Config {
    static int port = 8080;
}
```

准备阶段为 `port` 赋默认值 `0`；初始化阶段才执行普通字段初始化代码，把它变成 `8080`。但 `static final int PORT = 8080` 这样的常量变量有 `ConstantValue` 规则，不能据此推导“所有静态字段都靠 `<clinit>` 赋值”。调用者还可能内联常量，读取常量不一定触发声明类初始化。

假设支付路由类在静态块里连接远程配置中心：第一次使用时连接失败，可能抛出 `ExceptionInInitializerError`；此类会在该定义加载器中被标记为初始化错误，后续使用可抛 `NoClassDefFoundError`。恢复配置中心不等于这个类会自行重跑初始化。应保留首次异常，并将可重试的网络操作移出静态初始化。类初始化的同步也不能代替服务级重试与就绪管理。

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

`ClassLoader.loadClass` 的常见默认流程先查已加载类型，再委托父加载器，最后调用本加载器的查找逻辑。它不是 JVM 强制所有自定义加载器遵守的唯一算法：

```text
当前 ClassLoader 收到加载请求
  -> 先交给父加载器
  -> 父加载器找不到
  -> 当前加载器再尝试加载
```

好处：

- 核心类库优先由上层加载器加载。
- 有助于统一核心类型；`java.*` 的定义限制也有运行时检查，不能把安全性完全归功于委派。
- 保证基础类型在进程内有稳定身份。

普通类的运行时身份由“**定义加载器** + 二进制类名”决定。两个加载器分别定义同名类，得到不同类型；若两个子加载器都委托同一父加载器取得同一个类，则仍是同一类型。加载请求的发起者不一定是最终定义者。

## 为什么会打破委派

工程里经常需要调整委派模型：

| 场景 | 原因 |
| --- | --- |
| Tomcat WebApp | 不同应用需要隔离依赖 |
| 插件系统 | 插件要带自己的 jar，卸载时希望释放类 |
| SPI | 由调用方决定扩展实现所在的类加载器 |
| Java Agent | 可以在定义前变换字节码；增强本身不必改变委派模型 |
| Spring Boot DevTools | 用不同加载器区分稳定依赖和可重启业务类 |

打破委派不等于破坏设计，它是在隔离、扩展和安全之间做取舍。

## 线程上下文类加载器

线程上下文类加载器常见于 SPI 和框架扩展：

```java
ClassLoader loader = Thread.currentThread().getContextClassLoader();
```

它让扩展查找采用调用环境提供的加载器。例如 `ServiceLoader.load(Service.class)` 常使用线程上下文加载器查找提供者，而不是强制由定义 ServiceLoader 的引导加载器查找所有业务实现。这是选择查找入口，不是修改父加载器自身的可见范围；也可以显式传入加载器。

插件与宿主共享的 `PaymentProvider` 接口应由共同父加载器定义，插件只隔离实现和私有依赖。若插件另带一份接口并自行定义，实例即使方法相同，也不能直接转成宿主的接口。线程池复用时若临时设置上下文加载器，应在 `finally` 恢复原值，防止后续任务串用插件环境。

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

JVM 使用某个类型时无法完成所需的类定义或初始化，常见于编译期可用、运行期失败，但不能由异常名反推该类一定参与过源码编译。可能是：

- 运行包缺依赖。
- 类初始化失败后再次使用。
- 依赖版本被排除或覆盖。

### ClassCastException

如果错误信息里两个类名相同，但加载器不同，通常是类加载器隔离问题：

```text
com.example.User cannot be cast to com.example.User
```

### Metaspace 持续增长

先区分合法加载增长、动态生成类和旧加载器保留。只有存在外部可达关系时，才把“卸载失败”归因到泄漏。例如仍存活的宿主线程保存插件上下文加载器，或者宿主注册表持有插件对象：

```text
GC Root -> 宿主线程的 contextClassLoader -> 旧插件加载器
GC Root -> 宿主注册表 -> 插件对象 -> 插件类型 -> 定义加载器
```

加载器及其类型之间的内部引用环不能单独证明泄漏。结合类数量、加载器趋势和保留路径分析，见[方法区与元空间](./runtime-area/method-area.md)。

## 排查命令

```bash
jcmd <pid> VM.classloader_stats
jcmd <pid> VM.flags
```

使用目标进程可见 PID、同一用户和匹配的 JDK。`GC.class_histogram` 默认可能请求 Full GC，并非低影响的类数量采样；只在需要对象证据时另行安排。JDK 9+ 可在下次启动加入 `'-Xlog:class+load=info,class+unload=info'`，核对类型来源和卸载，但日志量需要控制。

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

<style scoped>
table:first-of-type td:first-child { white-space: nowrap; }
</style>

