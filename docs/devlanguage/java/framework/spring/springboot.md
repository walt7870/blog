# Spring Boot

Spring Boot 是 Spring 应用的启动和默认装配体系。它把常用依赖、默认配置、内嵌服务器、配置加载、日志、健康检查等工程能力组织起来，让应用能以更少样板配置启动，但底层仍然是 Spring Framework 的 IoC、AOP、MVC 等机制。

![Spring Boot 启动源码主链](/spring/boot-startup-source-chain.svg)

## 视频讲解

配套的 [Spring Boot 源码全流程视频系列](./video-series.md) 共 20 集，从 [一个应用是怎样启动起来的](https://www.bilibili.com/video/BV1A5Ku6jE6R) 开始，沿 `SpringApplication.run()`、Environment、ApplicationContext、BeanDefinition、`refresh()`、自动配置、Bean 生命周期、AOP、事务、WebServer 和 DispatcherServlet 展开。

视频负责建立真实调用顺序，本文负责回查 Starter、自动配置、配置加载、Actuator、打包运行和排错路径。系列使用 Spring Boot 4.1.0、Spring Framework 7.0.8、Java 25 作为源码基线，完整分集链接、核心类和按现象回查表见 [视频系列页面](./video-series.md)。

| 阶段 | 集数 | 对应本文与相关页面 |
| --- | --- | --- |
| 启动与配置准备 | EP01–EP07 | 本文的配置加载；[Spring 总览](./)、[IoC 容器](./ioc.md) |
| 容器刷新与自动配置 | EP08–EP13 | 本文的自动配置；[IoC 容器](./ioc.md) |
| Bean、代理与事务 | EP14–EP18 | [IoC 容器](./ioc.md)、[AOP](./aop.md) |
| WebServer 与请求链 | EP19–EP20 | 本文的运行入口；[Spring MVC](./mvc.md) |

![Spring Boot 自动配置判断链](/spring/boot-auto-config.svg)

## 详细位置

- 本页说明 Boot 的 Starter、自动配置、配置加载、Actuator、打包运行和排查方式。
- 完整启动源码顺序见 [Spring Boot 源码全流程视频系列](./video-series.md)。
- Spring 基础模块关系见 [Spring 总览](./index.md)。
- Bean 装配机制见 [IoC 容器](./ioc.md)。
- Web 请求链见 [Spring MVC](./mvc.md)。
- 事务和方法增强见 [AOP](./aop.md)。

## Boot 到底做了什么

一个 Boot 应用启动时，大致发生这些事：

1. 创建 Spring 应用上下文。
2. 读取配置文件、环境变量、命令行参数等外部配置。
3. 扫描启动类所在包及其子包下的组件。
4. 根据 classpath、配置项、已有 Bean 判断哪些自动配置生效。
5. 如果是 Web 应用，启动内嵌服务器。
6. 暴露日志、健康检查、指标等运行时观察入口。

Boot 像一套标准化开机程序。它不是替你写业务，而是让数据库、Web、JSON、校验、日志、监控这些常用部件按约定先装起来。

### 从 `run()` 到应用就绪

以 Servlet Web 应用为例，主流程可以压缩成五段：

```text
SpringApplication.run()
  -> 准备 Environment 与 Config Data
  -> 选择并创建 ServletWebServerApplicationContext
  -> 加载主配置类的 BeanDefinition
  -> refresh() 展开配置、创建 Bean、生成代理、启动 WebServer
  -> 执行 Runner 并发布 ApplicationReadyEvent
```

`ApplicationContext` 被创建出来时还只是容器外壳。初始 BeanDefinition 加载完成后，`refresh()` 才会执行工厂后处理器、注册 BeanPostProcessor、创建非懒加载单例并启动生命周期组件。把“创建 Context”和“刷新 Context”分开，是理解启动日志、断点位置和失败阶段的关键。

### `SpringApplication` 在 `run()` 之前已经决定了什么

调用 `SpringApplication.run(OrderApplication.class, args)` 看起来只有一行，实际先构造 `SpringApplication`，把主配置类保存为 primary source，并根据 classpath 推断应用类型。MVC 类存在时通常选择 Servlet，只有响应式 Web 条件满足且 MVC 不存在时才选择 Reactive，都不满足则是普通非 Web Context。这个判断会影响随后创建哪种 ApplicationContext，以及是否需要启动 WebServer。

构造阶段还会发现启动期初始化器和监听器。它们不是普通业务 Bean，因为此时 BeanFactory 尚未刷新；它们服务于 Context 创建之前或启动事件阶段。理解这一点后，才不会尝试在过早的监听器中随意注入尚未创建的业务 Bean。

### Environment 为什么必须先于 Context 刷新准备好

`run()` 先创建并配置 Environment，把命令行参数、系统属性、环境变量和 Config Data 组织成有顺序的 PropertySource。日志级别、激活 Profile、应用类型和部分 `spring.main.*` 参数会在 Context 刷新前使用，所以配置系统不能等普通 `@Bean` 创建后再工作。

Config Data 处理的不只是读取一个 `application.yml`。它要解析默认位置、外部目录、Profile 文档、`spring.config.import` 和可选位置，再按规则把文档加入 Environment。同名属性的最终值取决于来源优先级和文档顺序。`@PropertySource` 在配置类解析阶段才加入，因而来不及影响某些更早读取的启动参数。排查配置覆盖时，必须问“这个值在哪个启动阶段被谁读取”，而不能只比较两个 YAML 文件。

### Context 创建、加载和刷新是三个不同动作

Environment 准备好后，ApplicationContextFactory 创建与应用类型匹配的 Context。接着 `load()` 把 primary source 登记为初始 BeanDefinition。此时主配置类进入容器，但组件扫描和自动配置还没有全部展开。只有进入 `refresh()`，`ConfigurationClassPostProcessor` 才解析主配置类上的复合注解，递归导入更多配置并注册 BeanDefinition。

这三个时刻对应不同故障：Context 类型错误通常与 classpath 或显式 WebApplicationType 有关；主配置类无法加载属于初始来源问题；Bean 缺失、条件不命中和依赖注入失败多发生在刷新阶段。把所有启动异常都归为“自动配置失败”，会从错误入口开始排查。

### 内嵌服务器为什么在 `refresh()` 中启动

Servlet 应用使用专门的 WebServerApplicationContext。刷新过程中，它从容器寻找 `ServletWebServerFactory`，例如 Tomcat 工厂；工厂创建服务器，Boot 再把 DispatcherServlet、Filter 和 Listener 等注册到 ServletContext。服务器对象被创建、端口绑定、生命周期启动不是同一概念，端口真正可监听要以服务器状态和操作系统端口为证据。

WebServer 放在 Context 生命周期内有两个效果：服务器需要的配置、Factory 和自定义器都可以作为 Bean 参与装配；如果后续关键单例创建失败，Context 刷新会失败并关闭已经分配的资源，而不会留下一个“端口开着但业务 Bean 不完整”的半成品应用。应用就绪事件更晚，它还要等待 Context 刷新、Runner 执行等步骤结束，因此“端口已经监听”和“实例可以接业务流量”也不应简单画等号。

### 启动失败时沿阶段定位

一段异常栈的价值不只是最后一行错误。若日志尚未出现 Environment 准备完成，应检查配置位置、格式和导入；若 Context 已创建但 BeanDefinition 解析失败，应检查配置类、条件和类加载；若错误位于 `finishBeanFactoryInitialization()`，应沿最底层 `BeanCreationException` 查构造器、注入和初始化回调；若 WebServer 启动失败，再检查端口、证书、Connector 和 Servlet 注册。

Boot 的失败分析器会把部分底层异常整理成更可操作的描述，但它不会替代因果链。排错时应找到第一个与业务配置或 Bean 创建相关的 `Caused by`，同时判断它位于上述哪个阶段，避免只围绕最外层 `Application run failed` 搜索。

## 核心组成

| 组成 | 负责什么 | 直观理解 |
| --- | --- | --- |
| Starter | 成组引入依赖 | 一套工具箱 |
| 自动配置 | 条件满足时注册默认 Bean | 自动装配工 |
| 外部化配置 | 从文件、环境变量、命令行读取配置 | 应用参数面板 |
| 配置绑定 | 把配置变成类型安全对象 | 参数表转对象 |
| Actuator | 暴露健康、指标、环境、路由等端点 | 运行仪表盘 |

## Starter

Starter 只负责依赖组合，不直接代表功能已经正确运行。比如引入 Web Starter，会带来 MVC、内嵌 Tomcat、JSON 处理等依赖；这些依赖进入 classpath 后，自动配置再判断是否创建对应 Bean。

常见 Starter：

| Starter | 带来的能力 |
| --- | --- |
| `spring-boot-starter-web` | Servlet Web、Spring MVC、JSON、内嵌 Tomcat |
| `spring-boot-starter-validation` | 参数校验 |
| `spring-boot-starter-jdbc` | JDBC、连接池、事务基础 |
| `spring-boot-starter-data-redis` | Redis 集成 |
| `spring-boot-starter-security` | 安全过滤器链 |
| `spring-boot-starter-actuator` | 健康检查和运行端点 |
| `spring-boot-starter-test` | 测试基础设施 |

加了 Starter 但功能没生效时，不要只看依赖是否存在，还要看自动配置条件是否满足。

## 自动配置

自动配置的本质是条件判断。Boot 会问几个问题：

- classpath 里有没有相关类。
- 配置项是否打开。
- 当前是不是 Web 应用。
- 容器里是否已经有用户自己定义的 Bean。
- 这个自动配置是否被排除。

只有条件满足，默认 Bean 才会注册。用户自己定义 Bean 后，很多默认配置会主动让位。这是 Boot 的重要原则：默认配置负责起步，显式配置负责覆盖。

### 自动配置的源码入口

自动配置不是启动末尾突然创建一批对象，而是把候选配置类加入普通配置解析链：

```text
主配置类
  -> @EnableAutoConfiguration
  -> AutoConfigurationImportSelector
  -> 读取自动配置候选
  -> 过滤、排除、排序
  -> ConfigurationClassParser 继续解析
  -> ConditionEvaluator 判断条件
  -> 满足条件的 @Bean 写入 BeanDefinitionRegistry
```

因此，“自动配置类被发现”和“其中的 Bean 最终创建”是两个不同阶段。前者取决于候选加载与过滤，后者还要经过条件判断、用户 Bean 覆盖和正常 Bean 生命周期。

排查自动配置时，优先使用：

```bash
java -jar app.jar --debug
```

或 Actuator 的 conditions 端点：

```bash
curl http://localhost:8080/actuator/conditions
```

看报告时重点关注：

- 哪些配置命中了。
- 哪些配置没命中。
- 没命中的条件是什么。
- 是否已有自定义 Bean 导致默认配置让位。

### 以 DataSource 为例理解“条件化默认值”

项目引入 JDBC Starter 后，classpath 中出现 JDBC API、连接池实现和相关自动配置候选。配置类解析器导入 DataSource 自动配置，并逐项判断它要求的类、应用类型和已有 Bean。若用户没有定义 DataSource，且配置足以确定连接方式，自动配置中的 `@Bean` 方法才会生成 DataSource BeanDefinition；若用户已经提供 DataSource，`@ConditionalOnMissingBean` 让默认定义退出。

这里 Starter、自动配置类、BeanDefinition 和 Bean 分属四个阶段。Starter 只改变依赖图；自动配置候选只是可被导入的配置类；条件成立后才产生 BeanDefinition；BeanFactory 最后根据定义创建连接池对象。把它们都简称为“Starter 自动创建 DataSource”，就无法解释为什么依赖存在但条件报告不匹配，或者为什么自定义 Bean 能让默认实现退让。

条件判断还存在时序。`@ConditionalOnMissingBean` 依据当时 BeanDefinitionRegistry 中可见的定义作决定，自定义 Starter 的顺序错误可能让条件判断早于用户定义被发现。Boot 通过自动配置排序和约定减少这种问题，但编写扩展时仍要明确配置导入顺序，而不能把条件注解当成运行期随时重新计算的开关。Context 刷新完成后再注册一个 Bean，并不会让整套自动配置自动重跑。

## 配置加载

Boot 支持从多个位置读取配置。常见来源可以按优先级粗略理解为：

1. 命令行参数。
2. 环境变量。
3. profile 专属配置。
4. 默认配置文件。
5. 代码默认值。

例如同一个端口配置，命令行参数通常会覆盖配置文件。配置排查时不要只看 `application.yml`，要确认运行时最终值来自哪里。

“优先级”也不能只背成五行简表。Boot 官方定义了更完整的 PropertySource 顺序，测试属性、`SPRING_APPLICATION_JSON`、系统属性等也可能参与覆盖；外部 Config Data 通常可以覆盖包内默认配置，Profile 专属文档又会覆盖同位置的非 Profile 文档。生产排错应通过 `Environment`、`env` 或 `configprops` 端点确认最终值及来源，而不是凭经验猜测。涉及密钥时要依赖端点脱敏和访问控制，不直接输出完整配置。

常用命令：

```bash
java -jar app.jar --spring.profiles.active=prod
java -jar app.jar --server.port=8081
```

## 配置绑定

业务配置如果超过一两个字段，应优先使用配置绑定。它把同一组配置聚合为对象，例如支付网关地址、超时时间、重试次数、业务开关。

这样做的好处：

- 配置结构清晰。
- 能设置默认值。
- 能做校验。
- 测试更方便。
- 排查时能按前缀定位。

配置绑定适合业务参数，不适合承载业务流程。配置回答“参数是什么”，业务代码回答“根据参数怎么做”。

```yaml
payment:
  base-url: https://pay.example.com
  timeout: 3s
  retry-count: 2
```

```java
@Validated
@ConfigurationProperties("payment")
public record PaymentProperties(
        URI baseUrl,
        Duration timeout,
        @Min(0) int retryCount) {
}
```

配置类应在启动时完成类型转换和校验。相比在多个业务类中散落 `@Value`，结构化绑定更容易发现字段拼写、单位和必填项问题，也便于测试不同环境下的配置组合。

这类配置对象还需要通过 `@ConfigurationPropertiesScan` 或 `@EnableConfigurationProperties` 进入容器；使用 Bean Validation 做启动校验时，项目中还要有对应校验实现。注解存在但对象没有注册，或缺少校验依赖，都会让“代码看起来正确”但运行行为与预期不同。

## Actuator

Actuator 是 Boot 应用的运行观察入口。它不解决业务问题，但能帮助判断应用是否活着、配置是什么、路由有哪些、自动配置为什么生效或没生效。

常用端点：

| 端点 | 用途 |
| --- | --- |
| `/actuator/health` | 健康检查 |
| `/actuator/metrics` | 指标 |
| `/actuator/env` | 查看环境和配置来源 |
| `/actuator/conditions` | 查看自动配置条件 |
| `/actuator/mappings` | 查看 MVC 路由 |

生产环境暴露 Actuator 要谨慎。`env`、`conditions`、`beans` 等端点可能泄露内部结构或敏感配置，应配合鉴权、网络隔离和最小暴露范围。

Actuator 端点应与问题对应使用：配置覆盖查 `env`，自动配置查 `conditions`，路由查 `mappings`，实例健康查 `health`，性能趋势查 `metrics`。不要为了方便一次性暴露所有端点。

## 打包和运行

Boot 应用通常打成可执行 Jar。Maven 项目常用：

```bash
mvn clean package -DskipTests
java -jar target/order-service.jar --spring.profiles.active=prod
```

运行问题排查时，先确认：

- 使用的 JDK 版本是否符合项目要求。
- 当前 profile 是否正确。
- 依赖是否完整打进包里。
- 启动参数是否覆盖了配置文件。
- 端口、数据库、Redis、消息队列等外部依赖是否可访问。

Spring Boot 3 基于 Spring Framework 6，运行时要求 Java 17 或更高版本。升级到 Boot 3 时，还需要关注 Jakarta 包名迁移、第三方依赖兼容性和构建插件版本。

本专题视频使用 Spring Boot 4.1.0、Spring Framework 7.0.8 和 Java 25 走读源码。项目升级时，不应只对照视频中的类名修改版本；还要核对目标 Boot 版本的 Java 基线、依赖管理、配置属性迁移、Servlet 或 Reactive API 变化，以及第三方 Starter 是否兼容。

## 生产运行边界

应用能够启动，不等于已经适合生产运行。至少需要明确：

| 边界 | 需要确认 | 常见风险 |
| --- | --- | --- |
| 外部依赖 | 连接、读取、重试和熔断超时 | 启动或请求线程被长期占用 |
| 线程池 | 核心线程、队列、拒绝策略、上下文传递 | 无界队列导致延迟和内存持续增长 |
| 数据库 | 连接池、事务范围、慢查询、迁移 | 长事务和连接耗尽 |
| WebServer | 端口、请求大小、连接与优雅停机 | 发布时请求中断或资源未释放 |
| Actuator | 暴露范围、鉴权、探针语义 | 敏感信息泄露或错误摘流 |
| 日志与指标 | 请求 ID、业务 ID、错误码、关键延迟 | 出现问题时无法关联证据 |

Kubernetes 的存活探针和就绪探针也不应混为一谈。存活检查回答“进程是否需要重启”，就绪检查回答“实例是否可以接流量”；把外部依赖短暂波动直接当成存活失败，可能造成不必要的重启并放大故障。

## 常见问题

### 加了依赖但功能没生效

检查顺序：

1. 依赖是否进入运行时 classpath。
2. 自动配置条件是否满足。
3. 必要配置项是否缺失。
4. 是否已有用户自定义 Bean 让默认配置失效。
5. 是否排除了相关自动配置。

### 配置值不是预期

检查顺序：

1. 当前 profile。
2. 命令行参数。
3. 环境变量。
4. 配置文件位置。
5. 配置绑定前缀和字段。
6. Actuator `/actuator/env` 中的最终来源。

### 应用启动慢

常见原因：

- 初始化阶段做远程调用。
- 启动时扫描范围过大。
- 外部依赖连接超时。
- 引入了暂时不用的 Starter。
- 启动时执行大量数据预热或迁移。

处理时先定位慢在哪里，再决定是缩小扫描、设置超时、清理依赖，还是把非关键预热移到启动后异步执行。

### 端口被占用

临时换端口：

```bash
java -jar app.jar --server.port=8081
```

如果在容器或服务器中运行，还要检查宿主机端口映射、网关转发和健康检查地址是否同步调整。

## 测试选择

| 测试目标 | 推荐方式 |
| --- | --- |
| 纯业务规则 | 普通 JUnit 单元测试 |
| Controller 映射和响应 | `@WebMvcTest` |
| 配置绑定 | 配置绑定测试或小范围 Spring 测试 |
| 自动配置和上下文 | `@SpringBootTest` |
| 完整接口链路 | 随机端口集成测试 |

Boot 测试不要一律启动完整上下文。完整上下文适合验证装配，不适合替代快速业务测试。

## 源码与运行验证

学习启动源码时，可以用一组固定证据避免只看静态代码：

1. 在 `SpringApplication.run()`、`prepareEnvironment()`、`refresh()`、`doCreateBean()` 和 `DispatcherServlet.doDispatch()` 设置断点。
2. 启动时记录 ApplicationContext 真实类型、BeanDefinition 数量和最终 Bean 数量。
3. 使用 `--debug` 或 conditions 端点解释一个自动配置为什么命中或退出。
4. 使用 `lsof -i :8080` 或同类命令确认端口何时开始监听。
5. 发出一条真实 HTTP 请求，把请求日志、Controller 断点、Service 代理类型和数据库结果串起来。

完成这条验证链后，`run()`、容器刷新、Bean 创建、代理增强、WebServer 和请求处理不再是六段孤立知识，而是同一个应用从静态工程到运行服务的连续过程。

## 总结

Spring Boot 的核心是约定、默认装配和运行入口。读 Boot 项目时先看 Starter，再看配置文件和 profile，再看用户自定义配置，最后用 debug 报告或 Actuator 确认自动配置结果。Boot 让项目容易启动，但生产环境仍要明确管理数据库、线程池、安全端点、日志、健康检查和外部依赖超时。
