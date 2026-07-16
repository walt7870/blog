# Spring Boot 自动配置

自动配置不是运行时猜测，也不是 Starter 直接创建对象。它是一套发生在配置类解析阶段的条件化 BeanDefinition 注册机制。

![Spring Boot 自动配置判断链](/spring/boot-auto-config.svg)

> 配套视频：[EP12：自动配置候选怎样进入配置解析链](https://www.bilibili.com/video/BV1RhKu6eENY) 与 [EP13：用户 Bean 为什么能让默认配置退让](https://www.bilibili.com/video/BV1RhKu6eE14)。

## 四个容易混淆的阶段

Starter 只负责依赖组合，让框架类、驱动和自动配置模块进入 classpath。`@EnableAutoConfiguration` 触发 AutoConfigurationImportSelector 读取候选配置；条件评估决定哪些配置和 `@Bean` 方法成立；BeanFactory 最后才根据 BeanDefinition 创建对象。

因此，“依赖已经存在”只能证明第一阶段完成，不能证明功能已启用。条件可能因应用类型、配置开关、缺少其他类或用户 Bean 已存在而退出。

| 阶段 | 输入 | 结果 | 常用证据 |
| --- | --- | --- | --- |
| 依赖解析 | POM、Gradle 配置、BOM | 类与资源进入 classpath | dependency tree |
| 候选发现 | `AutoConfiguration.imports` | 得到自动配置类名集合 | Jar 资源、导入日志 |
| 条件评估 | 类、属性、BeanDefinition、应用类型 | 保留或排除配置 | conditions 报告 |
| 定义注册 | 配置类与 `@Bean` 方法 | BeanDefinition 进入容器 | BeanDefinition 来源 |
| 对象创建 | BeanDefinition 与依赖图 | 实际 Bean、代理和生命周期 | Bean 类型、创建异常 |

很多“自动配置没生效”实际发生在不同阶段。依赖没有进入 classpath 时，条件报告里甚至不会出现预期候选；条件匹配后 Bean 创建失败，则不能把问题归因于候选发现。

## 候选是怎样进入配置解析链的

`@SpringBootApplication` 包含 `@EnableAutoConfiguration`。配置类解析器遇到对应 ImportSelector 后，读取各个 Jar 中约定的自动配置候选资源，处理排除项与顺序，再把候选作为配置类继续解析。

Boot 4.1 的自定义自动配置通过下面的资源声明候选：

```text
META-INF/spring/
  org.springframework.boot.autoconfigure.AutoConfiguration.imports
```

文件每行记录一个自动配置类。候选类不应依赖普通组件扫描发现，也不应在内部启动大范围扫描；显式 Import 更容易控制边界。

候选元数据解决“有哪些自动配置可能参与”，条件解决“本次应用哪些成立”。二者都发生在普通单例大规模创建之前。

## 条件不是运行期业务判断

`@ConditionalOnClass` 检查类路径，`@ConditionalOnProperty` 检查 Environment，`@ConditionalOnWebApplication` 检查应用类型，`@ConditionalOnMissingBean` 根据当时可见的 BeanDefinition 判断是否退让。

条件评估的结果通常固定在 Context 刷新过程中。启动后修改环境变量，不会自动重新计算整个 Bean 图。需要动态变化的业务开关不应直接建模为自动配置条件。

### Bean 条件依赖处理顺序

`@ConditionalOnMissingBean` 只能根据评估时已经处理的定义判断。用户配置通常先于自动配置，因此默认 Bean 可以安全退让。两个互不相关的自动配置若用 Bean 条件彼此隐式依赖，可能受到顺序影响，应通过明确的 before/after 关系或拆分配置解决。

### 属性条件要定义默认语义

平台 Starter 常写：

```java
@ConditionalOnProperty(
        prefix = "acme.payment",
        name = "enabled",
        havingValue = "true",
        matchIfMissing = true)
```

`matchIfMissing=true` 表示缺少属性时默认启用。对会产生外部副作用或费用的能力，这个默认可能不安全。条件设计必须回答：缺省时启用还是关闭、非法值是否应启动失败、关闭后使用者注入接口会得到什么结果。

### 类条件与方法签名的加载风险

条件写在配置类上时，Boot 可以先读取注解元数据，再决定是否加载配置。若把可选第三方类型直接写进不受保护的 `@Bean` 方法签名，JVM 可能在条件有机会退出前解析类型并失败。

更安全的方式是把依赖某个可选库的 Bean 放进嵌套配置类，并在该配置类上使用类条件：

```java
@AutoConfiguration
public class PaymentAutoConfiguration {

    @Configuration(proxyBeanMethods = false)
    @ConditionalOnClass(name = "com.vendor.sdk.PaymentSdk")
    static class VendorPaymentConfiguration {

        @Bean
        @ConditionalOnMissingBean
        VendorPaymentClient vendorPaymentClient() {
            return new VendorPaymentClient();
        }
    }
}
```

可选依赖测试必须模拟类完全缺失，而不是只在正常 classpath 下验证条件字符串。

### SpEL 条件可能过早创建 Bean

条件表达式若引用 Bean，可能让该 Bean 在正常后处理器全部安装前过早初始化，配置绑定和代理状态都可能不完整。自动配置应优先使用专门的类、属性、资源和 Bean 条件，把复杂运行判断留给普通 Bean。

## 用 DataSource 追踪一次装配

引入 JDBC Starter 后，JDBC API、连接池和数据源自动配置进入依赖图。配置类解析阶段导入相关自动配置，并判断必要类是否存在、当前是否缺少用户 DataSource、连接信息能否确定。条件成立后才登记 DataSource BeanDefinition，刷新后半段再创建连接池对象。

如果用户显式声明 DataSource，`@ConditionalOnMissingBean` 让默认定义退出。这不是用户 Bean 创建后替换默认对象，而是条件评估时根本不登记默认定义。理解这个时间点，才能正确分析“为什么我的 Bean 没覆盖默认配置”和自动配置顺序问题。

完整链路可以拆成：

1. JDBC Starter 让 JDBC API、连接池实现与数据源自动配置模块进入 classpath。
2. Config Data 把 `spring.datasource.*` 绑定为数据源属性。
3. 数据源自动配置检查必要类、应用类型和已有 DataSource 定义。
4. 条件成立后，配置类登记连接池 DataSource 的 BeanDefinition。
5. BeanFactory 创建 DataSource，应用属性和 Customizer。
6. 健康、指标与 JdbcTemplate 等后续自动配置根据 DataSource 继续装配。

用户手写 DataSource 后，默认连接池定义可能退让，但指标绑定、健康检查或事务管理器是否继续存在，需要看各自独立条件。替换一个核心 Bean 不等于关闭整套相关自动配置。

### “有 DataSource”不等于数据库可用

Condition Evaluation Report 能证明 DataSource 定义为何出现，却不能证明数据库连通。连接池可能延迟到第一次借连接才建立物理连接。排查必须继续执行安全查询或健康检查，并观察驱动、DNS、TLS、认证和池状态。

## 条件报告怎样阅读

使用 `--debug` 或 Actuator `conditions` 端点可以查看 ConditionEvaluationReport。先找到目标 AutoConfiguration，再区分 positive matches、negative matches 和 exclusions。报告中的每条消息应与 classpath、配置或 BeanDefinitionRegistry 中的事实对应。

```bash
java -jar order-service.jar --debug
curl http://localhost:8080/actuator/conditions
```

如果 DataSource 配置没有生效，不要从所有启动日志中搜索“数据库”。直接定位 DataSource 相关自动配置，确认是哪一条条件退出，再检查对应依赖、属性或用户 Bean。

报告中的三类信息含义不同：

- Positive matches：条件成立，只证明候选通过了当前条件。
- Negative matches：至少一条条件不成立，应从最具体的退出原因处理。
- Exclusions：用户配置或注解明确排除了候选，不属于条件自然退出。

报告很长时，先从“期望得到的 Bean”反查可能提供它的 AutoConfiguration，再查看该配置，而不是从头阅读全部候选。

## 用户配置怎样安全接管默认值

Boot 的设计是提供可退让默认值，而不是禁止显式配置。常见接管方式是声明同类型 Bean、设置公开配置属性、提供 Customizer，或排除特定自动配置。优先使用配置属性和 Customizer；只有默认模型无法表达需求时才完全替换核心 Bean。

替换 `ServletWebServerFactory`、ObjectMapper 或 DataSource 这类基础 Bean 时，要检查 Boot 原本应用的 Customizer、监控和生命周期能力是否仍然存在。得到一个“能启动”的对象不等于保留了默认配置的全部工程行为。

接管默认配置可以按侵入程度排序：

1. 修改公开配置属性。
2. 提供框架定义的 Customizer 或回调。
3. 声明局部协作 Bean，让某个默认定义退让。
4. 排除整项自动配置并自行建立完整基础设施。

优先选择影响最小且能被测试覆盖的方式。直接排除自动配置会同时失去默认值、生命周期、指标或其他联动能力，应建立责任清单逐项补齐。

## 自动配置顺序不是 Bean 初始化顺序

`before`、`after` 和自动配置排序解决的是配置解析与定义可见性，不直接保证普通 Bean 的创建顺序。Bean 初始化顺序由依赖图、`dependsOn`、懒加载和 BeanFactory 创建过程决定。把自动配置排序当成业务初始化编排工具，会产生难以推断的启动行为。

如果 B 配置的条件需要看到 A 配置注册的 BeanDefinition，可以让 B 在 A 之后解析；如果 Bean B 创建时必须使用 Bean A，应通过构造器依赖表达。两种顺序解决的问题不同。

## 自定义自动配置的边界

可复用 Starter 应把依赖组合、配置属性和自动配置拆开。自动配置类应使用明确条件，在用户提供实现时退让，并通过 ApplicationContextRunner 验证“条件满足时注册、缺少依赖时退出、用户 Bean 存在时退让”三条路径。

业务项目内部仅有一处使用的普通配置，不必包装成 Starter。自动配置适合跨项目复用的基础设施约定，不适合隐藏核心业务流程。

## 构建一个可退让的支付 Starter

假设多个订单服务都需要 PaymentClient。自动配置模块可以定义类型安全属性、默认 Client 和定制入口：

```java
@AutoConfiguration
@ConditionalOnClass(PaymentClient.class)
@EnableConfigurationProperties(PaymentClientProperties.class)
public class PaymentClientAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    PaymentClient paymentClient(
            PaymentClientProperties properties,
            ObjectProvider<PaymentClientCustomizer> customizers) {
        PaymentClient.Builder builder = PaymentClient.builder()
                .baseUrl(properties.baseUrl())
                .timeout(properties.timeout());
        customizers.orderedStream()
                .forEach(customizer -> customizer.customize(builder));
        return builder.build();
    }
}
```

候选文件加入：

```text
com.acme.payment.autoconfigure.PaymentClientAutoConfiguration
```

Starter POM 再组合自动配置模块和 Payment SDK。这样三个概念保持分离：SDK 提供客户端能力，AutoConfiguration 把它接入 Spring，Starter 让使用者一次引入典型依赖。

### 为什么提供 Customizer

只有配置属性时，平台只能暴露预先设计的字段；只有用户完整替换 Bean 时，又会丢失默认行为。Customizer 让应用在保留默认创建流程的前提下调整 Builder，适合证书、拦截器或观测等扩展。

Customizer 也要限制责任。它不应在创建 Client 时访问远端或修改业务状态，否则所有使用者的启动路径都会被隐藏副作用拖慢。

## Starter 的模块结构与依赖责任

一个可复用平台能力通常拆为：

```text
acme-payment-core
  └─ 与 Spring 无关的 PaymentClient API 与实现

acme-payment-spring-boot
  ├─ @ConfigurationProperties
  ├─ AutoConfiguration
  └─ Customizer 与接入 API

acme-payment-spring-boot-starter
  └─ 组合典型依赖
```

小型库可以合并自动配置与 Starter，但仍要保持职责概念清楚。Starter 不应引入所有可选实现，否则使用者会得到无关驱动、更多自动配置候选和更大的攻击面。

自动配置模块对第三方库的依赖通常声明为 optional，让库缺失时能自然退让；Starter 再决定典型使用场景需要带上哪些实现。若存在 JDBC、Reactive 两种模式，应拆成独立候选和条件，避免同时创建两套 Client。

配置属性前缀属于公共命名空间，建议使用组织或产品前缀，例如 `acme.payment`。不要占用 `spring.*`，也不要用过于宽泛的 `client.*` 与业务应用冲突。

## 排除自动配置的使用边界

应用可以通过注解或配置属性排除特定自动配置，但排除应是可解释的最终选择，不是看到启动异常就先关闭模块。

排除前需要确认：

- 是整个能力不需要，还是某条条件或配置错误。
- 排除后由谁提供目标 Bean 与生命周期。
- 其他自动配置是否依赖被排除的定义。
- 监控、健康、事务或定制链是否一起消失。

如果只是希望替换一个默认 Client，声明用户 Bean 或 Customizer 通常比排除整项配置更安全。

## 用 ApplicationContextRunner 验证条件矩阵

自动配置至少要验证三条路径：条件满足时注册、用户 Bean 存在时退让、关键属性无效时失败。

```java
class PaymentClientAutoConfigurationTest {

    private final ApplicationContextRunner runner =
            new ApplicationContextRunner()
                    .withConfiguration(AutoConfigurations.of(
                            PaymentClientAutoConfiguration.class))
                    .withPropertyValues(
                            "acme.payment.base-url=https://pay.example.com",
                            "acme.payment.timeout=2s");

    @Test
    void createsDefaultClient() {
        runner.run(context ->
                assertThat(context).hasSingleBean(PaymentClient.class));
    }

    @Test
    void backsOffForUserBean() {
        runner.withBean(PaymentClient.class, FakePaymentClient::new)
                .run(context -> assertThat(context)
                        .getBean(PaymentClient.class)
                        .isInstanceOf(FakePaymentClient.class));
    }
}
```

如果自动配置依赖某个可选库，还要使用 `FilteredClassLoader` 模拟类缺失，证明候选能干净退出而不是在解析注解或方法签名时抛 NoClassDefFoundError。

## 四个失败实验

### 只有 Starter，没有关键驱动

依赖组合若把驱动标记为可选，使用者没有显式引入，类条件会退出。依赖树与 Negative matches 能证明问题发生在 classpath，不应通过手写 Bean 绕过缺失依赖。

### 用户 Bean 注册得太晚

把替代 Bean 放在未被扫描的包中，默认 Bean 不会退让。先确认用户 BeanDefinition 是否存在，再检查条件顺序；源码上写了 `@Bean` 不能证明配置类已经被导入。

### 用自动配置排序控制初始化

即使 B 声明在 A 之后解析，B 创建的 Bean 仍可能先实例化。增加构造器依赖后顺序才由对象图明确表达。

### 完整替换 ObjectMapper

应用声明新 ObjectMapper 后接口能返回 JSON，却丢失 Boot 原先应用的模块和 Customizer。验证不应只看 200，还要覆盖日期、枚举、命名策略和错误响应等真实序列化契约。

## 排错闭环

1. 从缺失或异常的目标 Bean 确认期望提供它的自动配置类。
2. 检查相关 Jar、候选资源和类是否真的在运行 classpath。
3. 阅读该候选的 Positive、Negative 或 Exclusion 结果。
4. 检查条件评估时已有的 BeanDefinition 和最终 Environment 值。
5. 条件匹配后继续检查 Bean 创建、Customizer 和初始化异常。
6. 用实际行为验证，不以 Bean 存在代替数据库、序列化或服务器功能可用。

## 版本差异

Boot 4 提高了模块化程度，部分支持能力需要更精确的 Starter，包名和自动配置类也可能从 Boot 3.5 发生变化。自定义 Starter 若要同时支持 3.x 与 4.x，会面对模块、依赖和 API 差异，不宜只依靠同一组条件碰运气兼容。

迁移时先使用目标版本的依赖管理，检查候选资源、自动配置替换关系和属性迁移，再运行条件矩阵测试。内部 AutoConfiguration 类名不是稳定业务 API，应用应尽量通过公开属性、Customizer 和 Bean 契约接入。

## 继续阅读

- [Spring Boot Config Data](./boot-config-data.md)：条件读取的 Environment 从哪里来。
- [Spring Boot 启动机制](./boot-startup.md)：自动配置处于 `refresh()` 的哪个阶段。
- [IoC 容器](./ioc.md)：BeanDefinition 怎样成为最终 Bean。
- [Spring Boot 配置与生产运行](./boot-production.md)：条件报告怎样进入线上诊断证据链。
