# Spring Framework、Spring Boot、Servlet 容器与生态项目边界

一个常见的 Spring Web 应用同时出现 `@RestController`、`DispatcherServlet`、Tomcat、`@SpringBootApplication`、Spring Data Repository 和 Spring Security Filter。它们都在同一个进程中工作，却不属于同一层，也不是由同一个项目提供。

如果只把它们统称为“Spring”，开发时尚且能靠经验完成接口；一旦遇到端口未监听、路由 404、事务不生效、数据库配置未装配或安全链拒绝请求，就很难判断应该检查哪个模块。本篇以订单接口为主线，拆清标准、实现、框架、装配工具和生态项目各自负责的部分。

![Spring 应用各层边界](/spring/foundation/spring-platform-boundaries.svg)

> 配套视频：[EP06：为什么会创建普通、Servlet 或 Reactive 上下文](https://www.bilibili.com/video/BV1R8Ku6NEKT) 解释 Web 应用类型；[EP19：内嵌 Tomcat 在什么时候监听端口](https://www.bilibili.com/video/BV1o4Ku6TERf) 解释 Boot 与服务器的启动边界。

## 先看一次请求经过了哪些责任层

假设客户端调用：

```http
POST /orders
Content-Type: application/json

{"skuId": 1001, "quantity": 2}
```

应用代码里只有一个 Controller：

```java
@RestController
@RequestMapping("/orders")
final class OrderController {
    private final OrderService orderService;

    OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    ResponseEntity<OrderResponse> create(
            @Valid @RequestBody CreateOrderRequest request) {
        Order order = orderService.create(request.toCommand());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(OrderResponse.from(order));
    }
}
```

请求真正完成时至少发生了六层协作：

1. 操作系统把监听端口上的连接交给服务器进程。
2. Tomcat 或 Jetty 解析 HTTP，把请求表示为 Servlet API 定义的对象。
3. Filter 链处理编码、安全、追踪等容器级横切逻辑。
4. Spring MVC 的 `DispatcherServlet` 查找 Controller，解析参数并调用方法。
5. Spring 容器提供 Controller、Service、Repository 及其代理对象。
6. Spring Boot 在启动期选择默认服务器、MVC 配置、JSON 转换器和诊断设施。

Spring Data、Security 等生态项目可能继续插入 Repository 代理或安全过滤链。它们使用 Spring Framework 的容器与扩展机制，但拥有独立的 API、发布节奏和内部模型。

## Jakarta Servlet 是协议契约，不是服务器产品

Servlet 规范定义 Web 组件与运行环境之间的契约。应用或框架使用 `ServletRequest`、`ServletResponse`、`Filter`、`ServletContext` 等 API；容器负责提供这些接口的实现，管理 Servlet 生命周期，并把网络请求分派到 `service()`。

规范解决的是可移植边界：只要实现满足同一版本的 Servlet 契约，基于该契约编写的框架就不必针对每个服务器重新定义请求、响应和生命周期模型。

它不负责这些事情：

- 不定义 Spring 的 Bean、依赖注入或 AOP。
- 不提供 Controller 注解、JSON 参数绑定和统一异常处理。
- 不决定数据库事务如何开启与提交。
- 不提供 Boot 的自动配置、Starter 或 Actuator。
- 不等于 Tomcat、Jetty 这类具体实现。

`DispatcherServlet` 名字里虽然有 Servlet，但它是 Spring MVC 提供的前端控制器；`HttpServletRequest` 则来自 Servlet API；真正创建请求对象并调用 Filter、Servlet 的是容器实现。

### 容器为什么能先于 Spring MVC 工作

外部容器部署 WAR 时，容器先启动并创建 Web 应用运行环境，再由初始化机制注册 Spring 的 `DispatcherServlet`。内嵌容器模式下顺序由 Boot 反向编排：Spring 应用先创建特定 Web ApplicationContext，找到 `ServletWebServerFactory`，再创建并启动容器，同时注册 `DispatcherServlet`、Filter 和 Listener。

两种模式最终都满足 Servlet 契约，但控制启动过程的人不同：

| 部署模型 | 进程与容器由谁启动 | Spring 如何进入系统 | 常见交付物 |
| --- | --- | --- | --- |
| 外部容器 | 运维或应用服务器先启动 | WAR 初始化时注册 Spring Web 组件 | WAR |
| Boot 内嵌容器 | `SpringApplication.run()` 编排 | Web Context 创建服务器并注册组件 | 可执行 Jar |

内嵌并不表示 Tomcat 变成了 Spring 的一部分，只表示服务器库进入应用依赖，由 Boot 负责配置和生命周期编排。

## Servlet 容器是规范的运行实现

Tomcat、Jetty 等服务器实现 Servlet 规范，并承担真实网络入口。以 Tomcat 为例，它负责 Connector、线程池、请求解析、ServletContext、Session、FilterChain 和 Servlet 生命周期。Spring MVC 接到的请求已经经过容器解析。

因此，下面这些问题优先进入容器层排查：

- 端口无法绑定、连接被拒绝、TLS Connector 配置错误。
- 请求头或请求体超过服务器限制。
- 工作线程耗尽、连接队列堆积、Keep-Alive 行为异常。
- Session Cookie、压缩、访问日志等服务器行为不符合预期。
- Filter 注册顺序和 URL Pattern 导致请求未进入 MVC。

而路径已进入 `DispatcherServlet` 后出现的 Handler 匹配、参数绑定、内容协商和异常解析问题，主要属于 Spring MVC。

### Tomcat、Jetty 与 Netty 不是同一种接入方式

Servlet 栈通常使用 Tomcat 或 Jetty 这类 Servlet 容器。Spring WebFlux 可以运行在 Reactor Netty 上，此时请求处理不经过 Servlet API；WebFlux 也可以适配到支持异步非阻塞能力的 Servlet 容器，但编程模型仍由 WebFlux 负责。

判断应用属于哪条链，不要只看服务器名称，应检查：

1. 应用类型是 `SERVLET` 还是 `REACTIVE`。
2. 使用 `spring-boot-starter-web` 还是 `spring-boot-starter-webflux`。
3. 运行 Context 是 Servlet Web Context 还是 Reactive Web Context。
4. 请求入口是 `DispatcherServlet` 还是 `DispatcherHandler`。

同一个进程同时引入 MVC 与 WebFlux 依赖时，Boot 的应用类型选择有明确条件；不能因为 classpath 中出现 Reactor 就断定请求已经是响应式链路。

## Spring Framework 提供应用的基础运行模型

Spring Framework 是模块化框架，而不是单一 Jar。它的核心能力可以分成几条主线：

| 模块域 | 主要职责 | 典型运行对象 |
| --- | --- | --- |
| Core Container | 定义、创建、装配和管理组件 | `BeanDefinition`、`BeanFactory`、`ApplicationContext` |
| AOP | 为方法调用建立代理和拦截器链 | `Advisor`、`MethodInterceptor`、代理对象 |
| Data Access | 统一事务、连接资源和数据访问异常 | `PlatformTransactionManager`、`JdbcTemplate` |
| Web MVC | 把 Servlet 请求映射为 Java 方法调用 | `DispatcherServlet`、`HandlerMapping` |
| WebFlux | 提供响应式服务器与客户端编程模型 | `DispatcherHandler`、`WebClient` |
| Testing | 缓存测试 Context 并提供 Web 测试工具 | TestContext、MockMvc、WebTestClient |
| Integration | 调度、缓存、JMS、邮件、可观测等基础集成 | TaskExecutor、CacheManager 等 |

Framework 负责“机制”。例如它定义如何刷新容器、如何从 BeanDefinition 创建对象、如何生成 AOP 代理、如何分派 MVC 请求。它不会凭空知道订单系统应该连接哪个数据库，也不会默认决定业务使用哪种 JSON 命名策略。

### Framework 可以脱离 Boot 使用

下面的纯 Framework 程序不需要 `SpringApplication`：

```java
var context = new AnnotationConfigApplicationContext(OrderConfiguration.class);
var service = context.getBean(OrderService.class);
service.create(new CreateOrderCommand(1001L, 2));
context.close();
```

它仍然可以使用依赖注入、事件、AOP 和事务，只是配置来源、容器创建、服务器接入、日志与交付方式需要应用自己组织。Boot 减少的是这部分装配和运行决策，不是替换 Framework 的容器。

### Framework 不拥有业务规则

库存是否允许超卖、订单状态能否从已取消变成已支付、支付超时如何补偿，都不属于容器或事务抽象。Spring 可以提供事务边界、事件发布和重试接入点，但业务必须明确：

- 状态转换条件。
- 幂等键与重复请求结果。
- 本地事务和远程副作用的边界。
- 失败后的恢复、补偿和人工处理方式。

把业务规则藏进切面、监听器或 Controller Advice，会让责任边界重新变得不可见。

## Spring Boot 负责应用装配、启动与交付

Spring Boot 建立在 Spring Framework 之上。它通过依赖管理、Starter、自动配置、外部配置、内嵌服务器和运维能力，把一组 Framework 机制组织成可直接运行的应用。

`@SpringBootApplication` 组合了主配置标记、自动配置入口和组件扫描。`SpringApplication.run()` 则负责准备 Environment、选择 ApplicationContext 类型、加载初始 BeanDefinition、刷新 Context、启动 WebServer、执行 Runner 并发布生命周期事件。

### Starter 不创建 Bean

`spring-boot-starter-web` 是一组依赖坐标。它让 Spring MVC、JSON 库和默认服务器实现进入 classpath，但“依赖存在”不等于“对象已经创建”。真正过程是：

1. Starter 把类和自动配置模块带入运行时。
2. 自动配置候选在配置解析阶段被导入。
3. 条件根据 classpath、属性、应用类型和已有定义决定是否成立。
4. 条件成立后注册 BeanDefinition。
5. BeanFactory 在刷新后半段创建实际对象。

排查自动配置时，应查看 Condition Evaluation Report 和 BeanDefinition，而不是只检查 Maven 依赖树。

### Boot 默认值可以退让

自动配置的价值不是“什么都替你决定”，而是在条件成立时提供默认值，并允许用户通过配置属性、Customizer、显式 Bean 或排除项接管。

例如应用定义自己的 `DataSource` 后，默认数据源配置通常会因 `@ConditionalOnMissingBean` 不成立而退出。这个动作发生在定义注册阶段，不是先创建两个连接池再选择一个。

### Boot 不替代构建工具和部署平台

Maven、Gradle 负责依赖解析、编译、测试和打包；Docker 或 Buildpacks 负责镜像；Kubernetes、systemd 或云平台负责进程调度、网络和资源限制。Boot 能生成可执行 Jar、分层 Jar，提供健康端点和优雅停机，但不会替代部署平台的副本调度与流量治理。

## Spring MVC 是 Framework 的 Web 模块

MVC 的核心任务是把 HTTP 请求转换成 Handler 调用，再把返回值转换成 HTTP 响应。它依赖 Servlet API，却不等于 Servlet 容器。

一次正常调用依次经过容器请求解析、FilterChain、DispatcherServlet、HandlerMapping、HandlerAdapter、参数解析与校验、Controller、返回值处理和消息转换。完整流程使用图示表达，每个节点的对象关系、异常分支和验证方式见 [一个请求从应用启动到 JSON 响应的完整生命线](../runtime-model.md) 与 [Spring MVC](../mvc.md)。

### Controller 是协议适配器

Controller 应负责读取 HTTP 输入、触发校验、转换为业务命令并选择响应状态。它不应该承担事务编排、库存规则或持久化细节。否则协议变化会直接撕裂业务代码，单元测试也必须依赖 Web Context。

## 生态项目通过 Framework 接入，但不是 Framework 模块

Spring 官网列出的 Data、Security、Cloud、Integration、Batch、Kafka、GraphQL 等项目有独立仓库与发布节奏。Boot 通常为它们提供依赖管理或自动配置，但不能据此把它们视为 Boot 内部功能。

### Spring Data

Spring Data 提供统一的数据访问编程模型，并按数据库类型拆成 JPA、JDBC、R2DBC、MongoDB、Redis 等子项目。Repository 接口代理通过 Spring 容器注册，事务可接入 Framework 的事务抽象，但实体映射、查询生成和存储特性属于对应 Spring Data 模块。

使用 JPA 时还涉及 Jakarta Persistence 规范与 Hibernate 等实现。`JpaRepository`、`EntityManager` 和数据库驱动来自不同层，不能用“Spring 保存了实体”概括整个链路。

### Spring Security

Spring Security 建立认证、授权、安全上下文和防护机制。在 Servlet 应用中，它通常通过 `DelegatingFilterProxy` 把容器 Filter 链桥接到 Spring 管理的安全过滤链。请求可能在进入 `DispatcherServlet` 前被拒绝，所以 401/403 不应只检查 Controller 注解。

### Spring Cloud

Spring Cloud 面向分布式系统模式，例如配置、服务发现、网关和客户端集成。它不是使用 Spring Boot 的必选项。单体应用或由平台直接提供服务发现与配置能力的系统，可能完全不需要 Cloud 组件。

### Spring Integration、Batch 与消息项目

Integration 提供企业集成模式与消息通道；Batch 负责批处理作业、步骤和重启语义；Spring for Apache Kafka、AMQP 等项目负责具体消息系统接入。它们可以复用容器、事务、事件和可观测基础设施，但各自有独立的消费、确认和失败恢复模型。

### 第三方库进入 Spring 的三种方式

一个普通 Java SDK 要进入 Spring 应用，通常只有三种接入方式：

1. 应用在 `@Configuration` 中显式创建 Bean。
2. 库提供 Spring 配置模块，注册 BeanDefinition 或扩展点。
3. 库提供 Boot 自动配置与 Starter，根据条件给出默认 Bean。

判断某个功能“是不是 Spring 提供的”，应检查类所属坐标、配置类来源和运行时 Bean 类型，而不是看它能否被 `@Autowired`。

## 一张责任表定位故障

| 现象 | 首要责任层 | 第一批证据 |
| --- | --- | --- |
| 端口未监听 | Boot 启动或服务器实现 | 启动失败报告、Connector 日志、端口占用 |
| 请求体过大被拒绝 | Servlet 容器或网关 | 服务器限制、状态码、访问日志 |
| Controller 404 | Spring MVC | `/actuator/mappings`、HandlerMapping 日志 |
| JSON 读取失败 | MVC 消息转换 | Content-Type、转换器、字段错误 |
| Service 无法注入 | Core Container | BeanDefinition、候选列表、Context 异常 |
| `@Transactional` 不生效 | AOP 与事务 | Bean 实际类型、代理入口、事务日志 |
| Repository 方法生成错误 | Spring Data 子项目 | Repository 代理、派生查询解析日志 |
| 401 或 403 | Security 或上游网关 | Security FilterChain、认证上下文、网关日志 |
| 配置没有覆盖默认值 | Boot Config Data / 自动配置 | PropertySource、conditions、configprops |
| 消费消息后重复处理 | 消息项目与业务幂等 | offset/ack、重试记录、幂等键 |

这张表给出的是排查起点，不代表故障只会停留在一层。例如 MVC 500 可能源于 Service 抛错，但至少应先证明请求已经匹配 Handler，再向下追踪。

## 用运行时证据确认边界

### 查类来自哪个依赖

IDE 的“跳转到声明”或构建工具依赖树可以确认类所属模块：

```bash
./mvnw dependency:tree
./gradlew dependencies --configuration runtimeClasspath
```

`DispatcherServlet` 位于 Spring Web MVC，`HttpServletRequest` 位于 Servlet API，Tomcat 的请求实现位于服务器库。类名相邻不代表所属层相同。

### 查应用最终选择了哪条 Web 栈

启动日志、ApplicationContext 实际类型和服务器工厂 Bean 能共同证明应用类型。Servlet 应用还可以检查 `DispatcherServlet` 与 HandlerMapping；响应式应用检查 `DispatcherHandler` 和 ReactiveWebServerFactory。

### 查默认对象是谁创建的

使用 `--debug` 或 Actuator `conditions` 查看自动配置条件，再查看目标 Bean 的定义来源。若用户配置和自动配置都可能提供同类对象，应同时确认：

- 自动配置候选是否被导入。
- 哪条条件成立或退出。
- 用户 BeanDefinition 在条件评估时是否已经可见。
- 最终注入的是哪个 Bean 实例。

### 查请求在哪一层结束

按网络入口、访问日志、Filter、Dispatcher、Handler、Service、数据库逐层设置证据。不要只凭最后状态码猜测：容器 404、MVC 404、安全 403 和业务 404 的责任层不同，响应体、日志位置与调用栈也不同。

## 版本边界

截至 2026 年 7 月，本专题的源码主线为 Spring Framework 7.0.x 与 Spring Boot 4.1.x。Boot 4.1.0 要求至少 Java 17，并要求 Framework 7.0.8 或更高版本；Servlet 应用要求兼容 Servlet 6.1 的容器，官方支持的内嵌基线包括 Tomcat 11.0.x 与 Jetty 12.1.x。

生产系统仍大量使用 Framework 6.2 与 Boot 3.5。它们同样要求 Java 17 起步，但依赖版本、废弃 API、自动配置类和测试注解可能不同。阅读源码时必须先锁定项目自己的 BOM 和运行依赖，不能直接把 7.0/4.1 的类名复制到 6.2/3.5 项目。

需要特别注意 `javax.*` 到 `jakarta.*` 的命名空间差异。Spring Framework 6、Boot 3 及后续版本以 Jakarta EE 9+ API 为基础；从 Boot 2 迁移时，仅修改 import 往往不够，还要升级 Servlet 容器、Validation、Persistence 及相关第三方库。

## 选择模块时从责任出发

新建一个普通 JSON 订单服务，可以这样选择：

- 需要 Servlet MVC：使用 Web Starter，让 Boot 管理 MVC、JSON 和内嵌 Servlet 容器的默认装配。
- 需要数据库访问：根据模型选择 JDBC、JPA 或 R2DBC，不因“都是 Repository”混用事务模型。
- 需要认证授权：引入 Security，并明确过滤链、会话或 Token 模型。
- 需要消息消费：选择具体消息项目，设计确认、重试、死信与幂等。
- 需要分布式能力：先确认平台已有能力，再选择必要的 Cloud 组件。

模块越多，启动条件、线程模型、资源池和故障路径越多。Spring 的模块化价值是“按需要组合”，不是把所有 Starter 一次性引入。

## 排错闭环

遇到边界不清的问题，按下面顺序收敛：

1. 写出失败发生在启动期还是请求期。
2. 确认应用是 Servlet、Reactive 还是非 Web 类型。
3. 找到故障对象所属依赖坐标与提供项目。
4. 判断该对象由容器创建、Framework 注册、Boot 自动配置还是业务显式配置。
5. 使用启动报告、BeanDefinition、映射表、过滤链或调用栈证明当前阶段。
6. 只修改拥有该责任的配置层，并重新执行真实请求验证。

能够把“Spring 报错”改写为“Boot 在配置解析阶段没有注册 DataSource BeanDefinition”或“Security FilterChain 在进入 MVC 前拒绝了请求”，才算真正确定了模块边界。

## 继续阅读

- [Spring 解决了什么问题](./why-spring.md)：从对象协作和基础设施接入理解引入 Spring 的价值。
- [一个请求从应用启动到 JSON 响应的完整生命线](../runtime-model.md)：连接启动链、对象图、代理和请求链。
- [Spring 常用注解完整指南](../annotations.md)：从读取者与生效阶段理解注解。
- [Spring IoC 容器](../ioc.md)：继续进入 BeanDefinition、依赖解析和生命周期。
- [Spring Boot](../springboot.md)：继续进入启动、自动配置和生产运行。
