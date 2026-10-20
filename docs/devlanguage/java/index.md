# Java

一段订单代码从保存到上线，要经过编译、依赖解析、测试、打包和运行。Java 语言描述业务规则，JDK 提供编译与诊断工具，JVM 执行字节码，Maven 或 Gradle 组织构建，Spring 等框架管理应用对象和请求。它们协作完成一条链路，各自解决的问题不同。

本专题按这条链路组织。先能独立写出并运行一个小程序，再理解对象与资源的生命周期，最后进入框架、构建和生产诊断；不需要先背完整生态名录。

## 从源码到运行

![Java从订单源码到服务运行的边界](/java/java-delivery-map.svg)

例如，订单总金额计算错了，要先检查金额单位、类型和计算规则；编译时报找不到类，要检查依赖与编译路径；上线后出现 `NoSuchMethodError`，则要核对运行时实际加载的 JAR。若所有类都加载成功，但导出越跑越占内存，排查对象持有链比直接换回收器更有用。

| 遇到的问题 | 阅读入口 | 应能完成的操作 |
| --- | --- | --- |
| 环境、语法、集合、异常与资源关闭 | [Java 基础](./basic/) / [基础类库](./basic/base-class.md) | 用明确的输入输出验证一段完整代码 |
| 编译目标与部署 JDK 不一致 | [JDK 与 Java 版本](./basic/jdk/) / [升级实践](./basic/jdk/upgrade.md) | 区分构建工具运行 JDK、编译 release 和运行镜像 |
| Lambda、Stream、record 等写法的边界 | [语言特性](./basic/special.md) | 解释操作是否有副作用、结果是否可变、并发是否安全 |
| 类加载、执行、内存和 GC | [JVM](./jvm/) / [动手入门](./jvm/hands-on.md) | 从实际参数、日志和对象关系解释运行现象 |
| 下载、版本冲突、测试或打包失败 | [依赖管理](./manager/) | 找到生效配置、最终版本、失败阶段和产物 |
| Web 请求、事务、依赖注入与数据访问 | [Java 框架](./framework/) | 沿请求和事务边界定位框架行为 |

## 用一个订单程序建立基线

下面是可独立运行的 `OrderTotal.java`，使用 JDK 17。它用整数“分”表达金额，验证数量与溢出；没有数据库、Web 容器或第三方依赖，便于先排除框架因素。

```java
public class OrderTotal {
    static long totalCents(long unitCents, int quantity) {
        if (unitCents < 0 || quantity <= 0) {
            throw new IllegalArgumentException("invalid order line");
        }
        return Math.multiplyExact(unitCents, quantity);
    }

    public static void main(String[] args) {
        System.out.println(totalCents(1990, 3));
        try {
            totalCents(1990, 0);
            throw new AssertionError("zero quantity accepted");
        } catch (IllegalArgumentException expected) {
            System.out.println("invalid quantity rejected");
        }
        try {
            totalCents(Long.MAX_VALUE, 2);
            throw new AssertionError("overflow accepted");
        } catch (ArithmeticException expected) {
            System.out.println("overflow rejected");
        }
    }
}
```

```bash
javac --release 17 -encoding UTF-8 OrderTotal.java
java OrderTotal
```

预期依次输出 `5970`、`invalid quantity rejected`、`overflow rejected`。这只验证单行乘法，不等于完成了支付系统：折扣、税费、币种与舍入仍要建立明确规则。出现小数金额时可使用 `BigDecimal` 并显式约定精度和舍入；不能把二进制浮点数误差当成数据库或 JVM 故障。

当代码增加到多个类并引入测试库，手写 classpath 就开始容易出错。这时让 [Maven](./manager/maven.md) 或 [Gradle](./manager/gradle.md) 组织编译、测试和打包。构建工具会下载插件和依赖，但普通 JAR 不会因此自动包含全部依赖或获得 `Main-Class`。

## 框架与运行时各管什么

![订单请求中的框架与资源边界](/java/framework-order-boundaries.svg)

把计算接到 HTTP 接口后，Spring MVC 负责请求映射与参数绑定，业务对象负责价格规则，MyBatis 或 JDBC 负责数据库交互。Spring 事务可以控制某个数据库事务，但不会自动让外部支付与数据库一起原子提交。请求重试、幂等键、订单状态和消息补偿属于业务合同，需要单独设计。

GC 回收 Java 对象，不负责归还连接池中的数据库连接；`try-with-resources` 管理实现 `AutoCloseable` 的资源，Spring 也可以管理其拥有对象的关闭。线程、连接、文件与 JNI 会话都有各自的生命周期。把“对象以后会被 GC”当作“不必 close”，会造成堆并不大却资源耗尽的问题。

普通线程池、异步 API、响应式和虚拟线程也不是互相替换的性能开关。比如支付接口等数据库时，增加请求线程仍受连接池与数据库容量约束；CPU 密集的金额计算不能靠创建更多虚拟线程获得更多处理器。具体机制见 [现代 JVM](./jvm/modern-jvm.md)，框架中的对象和线程边界见 [运行模型](./framework/spring/runtime-model.md)。

## 版本与平台的判断

Java 在 1995 年公开发布，JDK 1.0 在 1996 年发布。历史名词 J2SE、J2EE、J2ME 指不同平台范围；今天的 Java SE 与 Jakarta EE 也不是同一个版本号体系。Spring Boot 应用可以使用 Jakarta API，但不意味着必须部署完整的 Jakarta EE 应用服务器。

版本变化先看是否影响自己的代码与依赖。泛型、集合与资源关闭是基础；8 的 Stream、17 的强封装、21 的虚拟线程以及后续本地互操作和运行时优化，各有不同作用。当前版本地图、预览与稳定功能、发行商维护政策统一放在 [JDK 与 Java 版本](./basic/jdk/)，避免多个总览维护互相矛盾的版本表。

跨平台的前提是目标机器有兼容的运行时、依赖和资源。纯 Java class 通常可以在兼容 JVM 上执行；若应用带 JNI 库，则还要匹配操作系统、CPU 架构和 ABI。`jlink` 运行映像与 Native Image 也有各自的目标平台边界，不能把“一次编译”理解为任何产物都跨平台。

Java 模块系统与 Maven/Gradle 的项目模块是两个概念。`module-info.java` 描述 JPMS 的读取、导出和反射开放关系；构建工具的多模块描述项目组织与构建依赖。一个多模块后端可以一直使用 classpath；采用 JPMS 后，`exports` 也不等于允许深反射，后者可能需要 `opens`。相关类加载与链接行为见 [类加载](./jvm/class-loading.md)。

## 按现象定位问题

排查时先写下“哪种输入、在哪个环境、预期什么、实际什么”。保留最早的异常和完整因果链，再区分问题发生在构建、启动还是运行阶段。

| 现象 | 首先保留的证据 | 后续方向 |
| --- | --- | --- |
| 编译失败 | 编译器版本、release、首个错误、编译依赖树 | [JDK 升级](./basic/jdk/upgrade.md)、构建工具生效模型 |
| 启动链接异常 | 完整异常、最终产物、运行 JDK、实际 class 来源 | [字节码与链接](./jvm/class-file-bytecode.md) |
| 请求慢、CPU 高 | 时间窗口、请求分布、线程与 CPU 采样、下游延迟 | [诊断案例](./jvm/diagnostic-cases.md)，区分等待与计算 |
| 内存持续增长 | GC 后基线、分配与存活量、RSS、持有链 | [运行时数据区](./jvm/runtime-area/)、[GC](./jvm/gc/) |
| 订单状态重复或丢失 | 幂等键、事务提交、消息确认、失败重试路径 | [事务与数据访问](./framework/mybatis/)、[事件驱动架构](/docs/design/architecture/event-driven-architecture.md) |

例如订单导出变慢，若数据库查询已经占了绝大多数时间，先检查 SQL 与数据量；只有证据显示 GC 暂停覆盖慢请求，才进入回收器分析。每次修改后都用同一输入复验结果正确性、耗时、资源与失败恢复，避免只记录“报错消失”。

完成本专题的标志是能独立交付一个有输入校验、自动测试、可重复构建和诊断入口的小服务，并解释它遇到依赖缺失、超时、资源耗尽和重试时如何表现。学习顺序可随项目问题调整，详细配置留在对应机制与实操页。
