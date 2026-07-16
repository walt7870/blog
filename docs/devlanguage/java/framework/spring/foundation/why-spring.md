# Spring 解决了什么问题

一家电商刚上线时，“创建订单”可能只有几十行代码：Controller 接收 JSON，`new` 一个 Service，Service 再 `new` Repository，读取配置、保存订单并返回结果。代码很直观，甚至不需要框架。

真正的问题在系统扩张后出现。数据库从单库变成主从，支付接口需要超时与重试，订单写入必须放在事务中，接口要统一校验、审计和监控，测试又不能真的连接生产数据库。此时每个业务类都开始知道连接池、配置文件、HTTP、事务、日志和对象创建细节。业务逻辑仍然只有“校验金额并创建订单”，但让它运行起来的基础设施代码已经包围了业务代码。

Spring 解决的不是“Java 不能创建对象”，而是**大型应用中对象的创建、连接、增强和协议接入缺少统一边界**。它把这些基础设施职责从业务对象中移出，在应用启动时形成一张可管理的对象图，在运行时通过稳定的入口复用这张图。

![Spring 管理的运行边界](/spring/foundation/why-spring-runtime-boundaries.svg)

这张图先给出全文结论：

- 业务代码仍负责订单规则、状态变化和业务决策。
- Spring Framework 负责组件定义、对象装配、生命周期、代理和 Web 协议适配。
- Spring Boot 负责选择一套常见运行形态，准备配置环境、自动配置和内嵌服务器。
- 数据库、Servlet 容器、消息中间件仍是独立系统，Spring 只是提供一致的接入方式。

Spring 不会替你设计领域模型，也不会自动修复错误的事务边界。理解这一点，才能避免把框架当成“加上注解就会自动完成一切”的黑盒。

## 先看没有 Spring 的订单服务

下面的代码可以工作，但它把“业务对象需要什么”和“依赖如何创建”写在了一起：

```java
public final class OrderService {
    private final OrderRepository repository;
    private final String currency;

    public OrderService() {
        DataSource dataSource = DataSourceFactory.create(
            System.getenv("DB_URL"),
            System.getenv("DB_USERNAME"),
            System.getenv("DB_PASSWORD")
        );
        this.repository = new JdbcOrderRepository(dataSource);
        this.currency = System.getenv().getOrDefault("ORDER_CURRENCY", "CNY");
    }

    public Order create(CreateOrderCommand command) {
        Order order = Order.create(command, currency);
        return repository.save(order);
    }
}
```

问题并不是出现了 `new`。在业务方法中创建一次性的值对象、命令或实体非常正常。问题是 `OrderService` 的构造器决定了数据库实现、连接配置来源和对象生命周期，导致三个后果：

1. **依赖被隐藏。** 只看类型声明无法知道构造 `OrderService` 会读取环境变量并创建连接池。
2. **替换成本扩散。** 单元测试想换成内存仓库，需要修改生产类或启动真实数据库。
3. **资源所有权模糊。** 谁关闭连接池、多个 Service 是否共享它、创建失败怎样清理，都没有统一答案。

先不用 Spring，只做一次普通 Java 重构：

```java
public final class OrderService {
    private final OrderRepository repository;
    private final OrderProperties properties;
    private final Clock clock;

    public OrderService(
            OrderRepository repository,
            OrderProperties properties,
            Clock clock) {
        this.repository = repository;
        this.properties = properties;
        this.clock = clock;
    }

    public Order create(CreateOrderCommand command) {
        // 这里只保留订单规则和业务状态变化
    }
}
```

此时依赖已经显式化。测试可以传入内存仓库和固定时钟，生产环境可以传入 JDBC 仓库和系统时钟。这是**依赖注入**，它首先是一种设计方法，并不属于 Spring 专利。

然而，系统中如果有几百个组件，手写一个巨大的 `main` 方法来按顺序创建 DataSource、Repository、Service、Controller、线程池和客户端，也会逐渐变成新的维护中心。Spring 容器接管的正是这层应用级组装工作。

## IoC 的重点是控制权，不是语法

传统写法中，`OrderService` 主动创建 `JdbcOrderRepository`，Repository 又负责创建数据源。业务对象因此控制了整条依赖创建链。

使用容器后，业务对象只声明构造器参数，应用的组装者控制具体实现：

```java
@Service
public class OrderService {
    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }
}

@Repository
public class InMemoryOrderRepository implements OrderRepository {
    // ...
}
```

`@Service` 和 `@Repository` 只是组件来源的元数据。启动阶段，组件扫描把这些类转换为 `BeanDefinition`；容器再根据定义选择构造器、解析参数、创建对象，并把 `InMemoryOrderRepository` 传给 `OrderService`。控制权从业务类反转到了应用容器，因此称为 Inversion of Control。

这里需要区分三个对象：

| 对象 | 保存什么 | 出现阶段 |
| --- | --- | --- |
| `BeanDefinition` | Bean 的类型、作用域、构造参数、初始化方式等创建说明 | 配置解析和扫描阶段 |
| Bean 实例 | 真正参与运行的 Controller、Service、Repository 等对象 | 实例化阶段 |
| `ApplicationContext` | BeanFactory 加上事件、资源、环境、国际化等应用级能力 | 整个应用运行期 |

容器不是一个静态 `Map<String, Object>`。在单例创建前，它还允许 `BeanFactoryPostProcessor` 修改定义；对象创建后，`BeanPostProcessor` 可以检查或包装实例；Context 刷新完成后，事件监听器和生命周期组件才进入运行状态。后续 Core Container 章节会拆开这些阶段，本篇只需要先建立“**定义先于实例，装配发生在请求之前**”的模型。

## 从手写装配到容器装配

构造器注入之后，完全可以不用容器，在 `main` 方法中完成组装：

```java
OrderProperties properties = loadOrderProperties();
DataSource dataSource = createDataSource(properties.database());
OrderRepository repository = new JdbcOrderRepository(dataSource);
OrderService service = new OrderService(repository, properties, Clock.systemUTC());
OrderController controller = new OrderController(service);
HttpServer server = new HttpServer(8080, controller);
server.start();
```

对于只有几个对象的命令行工具，这种“组合根”清晰、可控，也许比引入框架更合适。容器的必要性并不来自代码行数，而来自组装规则开始出现多个维度：

- 开发环境用内存仓库，生产环境用 JDBC 仓库，测试环境还要替换时钟和第三方客户端。
- 数据源、线程池和 HTTP Client 需要共享，不能让每个 Service 各创建一份。
- 某些组件依赖配置条件，只有 classpath 存在驱动且开关启用时才注册。
- 代理必须在目标对象创建后、交给调用者前完成包装，调用者不应拿到一半是原对象、一半是代理的混合关系。
- Context 关闭时要按正确顺序停止消费者、等待任务结束、关闭连接池并释放端口。

如果继续手写，这些规则会集中到一个越来越大的工厂类：它既解析配置，又排序依赖，还负责异常清理和环境分支。Spring 没有让复杂度消失，而是把这类通用复杂度放进经过长期验证的生命周期与扩展协议中。应用只保留自身特有的装配选择。

更准确地说，容器在启动时完成一次有约束的图构建：BeanDefinition 是节点的创建说明，构造器参数和属性引用是节点之间的边，作用域与生命周期是节点规则，后处理器则有机会在图形成过程中修改节点或把实例换成代理。只有必要节点都能创建、必要边都能连接，刷新过程才会成功。

这也说明为什么“启动成功”是一条有价值的证据，但不是全部证据。它能证明对象图基本闭合，不能证明订单金额规则正确、SQL 没有逻辑错误、外部支付一定可用或容量足够。业务单测、集成测试和生产可观测性仍然分别承担不同证据职责。

## 先把三类对象分清

许多 Spring 项目的混乱不是注解用错，而是没有区分应用组件、基础设施资源和运行数据。

### 应用组件

Controller、Service、Repository、策略、事件监听器等通常具有稳定身份，会被多个调用复用，也需要替换或增强。它们适合成为 Bean。容器管理的是其创建方式和依赖关系，不是把业务类变成某种特殊类型。

订单示例中的 `OrderService`、`OrderController` 和 `InMemoryOrderRepository` 属于这一类。它们默认是单例，因此方法可以并发执行，字段应保存稳定依赖而不是某位用户的本次请求状态。

### 基础设施资源

DataSource、连接池、线程池、HTTP Client、序列化器、消息生产者同样适合由容器管理，但理由更偏向资源治理：它们创建昂贵、需要复用、带有配置，并且通常存在关闭动作。

这类对象常通过 `@Configuration` 与 `@Bean` 注册，因为第三方类无法直接添加 Spring 注解。把 SDK Client 放进容器不代表 Spring 拥有远端服务；容器只管理本地客户端对象及其生命周期。

### 运行数据

`CreateOrderRequest`、`CreateOrderCommand`、`Order`、查询条件和接口响应是一次调用中产生和流动的数据。它们通常由 MVC、业务方法或持久化层按需创建，不应因为“Spring 管对象”就全部注册成 Bean。

如果把订单实体做成单例 Bean，多位用户会并发修改同一个实例；如果为每种 DTO 编写 BeanDefinition，容器会承担本来属于请求流程的数据创建工作。正确边界是：**容器组装长期协作的角色，业务流程创建本次调用携带的信息。**

当然，Spring 也提供 request、session 等作用域，但它们用于确实需要与 Web 生命周期绑定的组件，不是让普通 DTO 进入容器的默认理由。作用域越依赖协议环境，业务代码复用和测试通常越困难。

## Spring 把四类基础设施责任集中起来

### 1. 对象图与生命周期

容器统一回答这些问题：

- 哪些对象属于应用组件，哪些只是一次请求中的临时数据？
- 一个接口有多个实现时选择哪一个？
- 单例何时创建，懒加载对象何时创建，销毁回调由谁执行？
- 依赖不存在、候选冲突或出现循环时，在哪个阶段失败？

集中管理的价值不是少写几个 `new`，而是对象关系可以在启动期验证。一个必要依赖缺失时，应用应当拒绝进入“可接流量”状态，而不是等到第一位用户下单才抛出空指针异常。

### 2. 横切能力

事务、权限、审计、缓存和指标通常跨越很多业务方法。把它们复制进每个方法会让业务流程被模板代码淹没，也容易出现某个分支忘记提交、回滚或记录。

Spring AOP 的常见做法是让容器返回代理对象。调用者持有的不是裸 `OrderService`，而是能够先执行事务拦截器、再进入目标方法的代理。业务代码仍然表达业务，通用策略集中在拦截器和配置中。

代理也带来边界：只有经过代理的调用才能被拦截；同一个对象内部的 `this.method()` 通常绕过代理；私有方法不是合适的声明式事务入口。Spring 消除了重复代码，但没有消除调用边界。

### 3. 协议适配

业务服务不应该理解 HTTP 状态码、JSON 序列化或 Servlet API。Spring MVC 把协议职责放在 Controller 和框架组件中：

```java
@PostMapping
public ResponseEntity<OrderResponse> create(
        @Valid @RequestBody CreateOrderRequest request) {
    Order order = orderService.create(
        new CreateOrderCommand(request.customerId(), request.totalAmount())
    );
    return ResponseEntity.created(locationOf(order)).body(OrderResponse.from(order));
}
```

`DispatcherServlet` 选择处理方法，参数解析器读取请求体，Bean Validation 检查输入，消息转换器在 JSON 与 Java 对象之间转换，返回值处理器生成 HTTP 响应。Controller 只做协议与业务命令之间的翻译。

这使同一个 `OrderService` 可以被 HTTP Controller、消息监听器或定时任务复用。改变入口协议，不需要把订单规则重写一遍。

### 用责任账本检查一次订单调用

对创建订单接口逐项记账，可以避免 Controller、Service 和基础设施再次黏在一起：

| 行为 | 责任对象 | 放在这里的原因 | 对应证据 |
| --- | --- | --- | --- |
| 读取 JSON、检查字段格式 | MVC、请求 DTO、Validation | 属于 HTTP 输入契约，业务层不应解析 JSON | 发送非法 JSON 或空字段应得到 400 |
| 将请求转换成业务命令 | Controller | 隔离外部协议模型与业务入口 | Controller 测试检查转换结果 |
| 判断订单金额是否超过上限 | OrderService 或领域策略 | 属于下单规则，换成消息入口也必须执行 | 不启动 Spring 的单元测试 |
| 取得币种和订单上限 | 类型安全配置对象 | 配置需要绑定、校验和环境覆盖 | 配置绑定测试与启动失败实验 |
| 生成 ID 和时间 | 业务服务调用显式依赖 | 固定时钟后结果可重复，ID 策略可替换 | 固定 Clock 的单元测试 |
| 保存订单 | OrderRepository 端口及实现 | 业务只依赖保存语义，不依赖 JDBC 或内存细节 | 仓库测试或数据库集成测试 |
| 生成 201、Location 和 JSON | Controller 与 MVC 返回值处理器 | 属于 HTTP 输出契约 | MockMvc 或真实端口测试 |

这里没有唯一的类名答案，例如复杂金额规则可以下沉为领域策略；真正的标准是责任是否稳定、能否在不启动无关基础设施时独立验证、换一种入口或存储时业务规则是否仍然成立。

当责任账本清楚后，Spring 的价值也更具体：它负责把表中的长期协作者连接起来，并为协议与横切能力提供统一入口，而不是把所有行为塞进一个“万能 Service”。

### 4. 运行环境与默认装配

Spring Framework 提供容器、AOP、事务和 Web 等机制，但不会替应用选择全部依赖。Spring Boot 在其上建立约定：

- 收集命令行、系统属性、环境变量和配置文件，形成统一 `Environment`。
- 根据 classpath、配置属性和已有 Bean 判断应该启用哪些自动配置。
- 在 Servlet Web 应用中创建并启动内嵌 Tomcat、Jetty 等服务器。
- 统一日志初始化、失败分析、健康检查和打包方式。

因此，Boot 不是另一个容器。`SpringApplication.run()` 最终仍要创建并刷新 Spring `ApplicationContext`；自动配置最终仍然贡献 `BeanDefinition` 和 Bean；Starter 本质上是依赖集合，不是运行时魔法。

## 一次启动和一次请求怎样连接起来

以示例工程的 `POST /api/orders` 为例，应用有两条时间上分离的链。

> 配套视频：[EP01：一个磁盘上的工程怎样变成可以响应请求的服务](https://www.bilibili.com/video/BV1A5Ku6jE6R)。视频适合先建立启动与请求的整体顺序，下面的正文继续解释每一层为什么存在。

### 启动链

1. `SpringApplication.run()` 判断应用类型，准备监听器、参数和 Environment。
2. Boot 创建 Servlet Web 类型的 `ApplicationContext`。
3. 配置类解析、组件扫描和自动配置注册 BeanDefinition。
4. `refresh()` 驱动 BeanFactory 后处理、Bean 创建、Bean 后处理和生命周期回调。
5. `OrderController` 构造时获得 `OrderService`；`OrderService` 构造时获得 `OrderRepository`、`OrderProperties` 和 `Clock`。
6. WebServer 完成初始化并监听端口，应用才具备接收请求的条件。

### 请求链

1. Tomcat 接收连接并进入 Servlet Filter 链。
2. `DispatcherServlet` 查找 `/api/orders` 对应的 Controller 方法。
3. 消息转换器把 JSON 读取为 `CreateOrderRequest`，校验器拒绝空客户编号或非正金额。
4. Controller 创建业务命令并调用启动期已经装配好的 `OrderService`。
5. Service 校验订单上限并通过 Repository 保存订单。
6. 返回值被写成 JSON，响应状态为 `201 Created`，同时带有 `Location` 头。

请求阶段不会再次扫描 `@Service`，也不会为每次请求重建所有单例。它只是使用启动阶段已经建立的对象图。这是分析 Spring 日志和性能问题时非常重要的时间边界。

## 源码观察坐标

阅读源码时应先固定调用上下文，再进入具体方法；只搜索一个类名，很容易把启动期和请求期代码混在一起。

| 观察目标 | 上游调用 | 核心入口 | 本例中应看到什么 |
| --- | --- | --- | --- |
| Boot 启动 | 应用 `main` 方法 | `SpringApplication.run()` | Environment、Context 类型和主配置源被准备 |
| 容器刷新 | Boot 创建 Context 后 | `AbstractApplicationContext.refresh()` | 后处理器执行、非懒加载单例创建、生命周期组件启动 |
| 单例预实例化 | `finishBeanFactoryInitialization()` | `DefaultListableBeanFactory.preInstantiateSingletons()` | Controller、Service、Repository 的对象图闭合 |
| MVC 分派 | Servlet 容器调用 DispatcherServlet | `DispatcherServlet.doDispatch()` | HandlerMapping 选中 `OrderController.create()` |
| 方法执行 | HandlerAdapter 处理 HandlerMethod | `InvocableHandlerMethod.invokeForRequest()` | JSON 已转换为请求对象，参数校验先于业务调用 |

对照阅读时，可从 [Spring 容器参考文档](https://docs.spring.io/spring-framework/reference/core/beans/introduction.html)、[DispatcherServlet 参考文档](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet.html) 和 [Spring Boot 运行方式](https://docs.spring.io/spring-boot/reference/using/running-your-application.html) 进入公开契约，再进入对应版本源码。内部方法名和调用层级可能调整，公开行为与迁移指南才是升级依据。

源码断点还应与异常阶段配对。配置类解析阶段失败，优先检查扫描范围、`@Import`、条件和 BeanDefinition 来源；单例创建阶段失败，沿最内层 `Caused by` 查构造器依赖、配置绑定和初始化回调；WebServer 启动阶段失败，检查端口、证书和 Servlet 容器配置。应用已经显示 `Started` 之后才出现的 404、400 或业务异常，则不应重新从组件扫描开始猜测，而应进入请求分派、参数解析或业务调用链。

同一个表面现象也可能跨阶段。例如“接口不可访问”既可能是 Controller 没有注册导致启动后 404，也可能是端口占用导致应用根本没启动。先确认 Context 是否刷新完成、WebServer 是否监听，再决定进入哪个源码入口，比直接在所有自动配置类中搜索有效得多。

## 注解为什么不会“自己生效”

看到 `@Service`、`@Valid` 或 `@Transactional` 时，不要把注解当成执行语句。Java 注解只是元数据，必须有读取者在特定阶段解释它：

| 注解 | 谁读取 | 何时产生效果 |
| --- | --- | --- |
| `@Service` | 组件扫描器与配置类解析过程 | 注册 BeanDefinition |
| `@ConfigurationProperties` | Boot 配置属性绑定基础设施 | Bean 创建和属性绑定阶段 |
| `@Valid` | MVC 参数解析与校验过程 | 请求参数解析阶段 |
| `@Transactional` | 事务 Advisor 与方法拦截器 | 代理创建后，在方法调用阶段 |

排查“注解不生效”时，应先问三个问题：负责读取它的组件是否存在、当前对象是否由容器管理、调用是否经过对应入口。只检查注解拼写通常不够。

## 可运行证据：业务代码不依赖 Spring 才更容易测试

配套工程位于 `spring-blog-examples`。`OrderServiceTest` 直接调用构造器，不启动 Spring：

```java
OrderRepository repository = order -> order;
Clock clock = Clock.fixed(fixedInstant, ZoneOffset.UTC);
OrderProperties properties = new OrderProperties("CNY", new BigDecimal("10000.00"));

OrderService service = new OrderService(repository, properties, clock);
Order result = service.create(new CreateOrderCommand("C-1001", new BigDecimal("199.00")));
```

这项测试证明了一个重要边界：**良好的 Spring 业务组件仍然应当是普通 Java 对象**。Spring 负责组装它，不应该成为所有业务行为的运行前提。

完整 HTTP 测试则使用 `@SpringBootTest` 和 MockMvc，验证 JSON 输入确实经过 Controller、校验、Service 和 Repository，并得到 `201`、`Location` 与订单响应。两个层次的测试分别证明业务规则和框架接线，失败时也能更快定位。

运行全部证据：

```bash
cd spring-blog-examples
mvn test
```

只验证纯业务对象：

```bash
mvn -Dtest=OrderServiceTest test
```

只验证完整 HTTP 接线：

```bash
mvn -Dtest=OrderApiIntegrationTest test
```

## 失败实验：对象图缺一条边会怎样

`IncompleteObjectGraphTest` 只注册 `OrderService`、配置和时钟，故意不提供 `OrderRepository`：

```java
new ApplicationContextRunner()
    .withBean(OrderProperties.class, () -> properties)
    .withBean(Clock.class, Clock::systemUTC)
    .withBean(OrderService.class)
    .run(context -> assertThat(context).hasFailed());
```

预期结果不是请求到来后才失败，而是 Context 创建 `OrderService` 时立即报告无法解析 `OrderRepository`。这说明容器把一部分运行期不确定性提前到了启动期。

恢复方式也很明确：注册一个 `OrderRepository` Bean，例如让 `InMemoryOrderRepository` 进入组件扫描范围，或通过 `@Bean` 显式提供实现。不要通过把构造器参数改成可空、在业务方法中临时 `new` 实现来掩盖对象图缺口。

运行失败实验的自动化断言：

```bash
mvn -Dtest=IncompleteObjectGraphTest test
```

测试进程最终应当是成功的，因为测试断言的正是“Context 按预期失败”；日志中的启动异常是实验现象，不代表 Maven 测试失败。

## Spring 没有解决什么

### 不替你划分业务边界

把库存、支付、优惠、通知全部写进一个 `@Service`，并不会因为它是 Bean 就变得合理。容器能装配对象，不能替团队判断聚合边界、状态机和一致性策略。

### 不保证事务覆盖外部系统

数据库本地事务无法原子提交第三方支付和消息发送。`@Transactional` 也不能把普通 HTTP 调用变成分布式事务。Outbox、幂等、补偿和最终一致性仍需显式设计。

### 不消除并发和资源约束

单例 Bean 可以被多个线程并发调用。把可变请求状态保存在 Service 字段中会产生竞态。线程池、数据库连接池和 HTTP 连接池也都有容量上限，自动配置只提供默认值，不等于生产参数已经正确。

### 不让错误配置自动变正确

Boot 能绑定配置并在校验失败时阻止启动，但覆盖优先级、环境隔离和密钥管理仍是工程责任。默认值适合启动，不一定适合峰值流量、故障恢复或合规要求。

## 什么时候不必使用 Spring

Spring 的容器和生态适合生命周期长、集成点多、需要统一事务与 Web 能力的应用，但不是所有 Java 程序的默认答案。一次性数据转换脚本、依赖很少的命令行工具、启动体积受严格约束的函数，可能用普通 Java 组合根就足够。

判断时应比较真实复杂度，而不是比较注解数量：对象是否需要按环境替换，资源是否需要统一关闭，是否存在多个协议入口，横切规则能否集中治理，团队是否需要 Boot 的诊断和运维约定。如果这些需求都很弱，引入容器会增加启动阶段、隐式处理器和调试成本。

反过来，如果项目已经同时手写配置覆盖、组件工厂、事务模板、路由适配、连接池生命周期和健康检查，那么“不用框架”并不代表更轻，只是团队在维护一套自己的应用框架。Spring 的取舍应建立在责任和生命周期上，而不是建立在“XML 很多”或“注解很方便”这类表面印象上。

## Framework、Boot、Servlet 容器与生态项目的边界

| 层次 | 主要职责 | 本例中的位置 |
| --- | --- | --- |
| Java / Jakarta API | 语言、反射、HTTP Servlet、Validation 等基础规范 | 构造器、record、Servlet 请求、校验注解 |
| Spring Framework | IoC、AOP、事务、MVC、资源和事件等通用机制 | 创建对象图，分派 Controller 调用 |
| Spring Boot | 启动约定、配置绑定、自动配置、内嵌服务器与运维集成 | `SpringApplication.run()`、`application.yml`、Tomcat |
| Servlet 容器 | TCP 监听、HTTP 解析、Servlet 生命周期和线程调度 | 接收请求并调用 DispatcherServlet |
| 独立生态项目 | Security、Data、Integration、Cloud 等特定领域能力 | 后续按接入点单独展开 |

Spring Framework 可以脱离 Boot 使用，Boot 则以 Framework 为基础。Tomcat 不是 Spring MVC，MVC 运行在 Servlet 容器提供的规范之上。Spring Data、Spring Security 和 Spring Cloud 也不是 Framework Core 的内部模块，正文只在出现接入点时说明边界。

## 7.0 / 4.1 主线与 6.2 / 3.5 生产线

本系列源码调用链以 Spring Framework 7.0 与 Spring Boot 4.1 为主，示例工程暂以 Framework 6.2、Boot 3.5 和 Java 17 运行。这样安排不是混用概念，而是把“理解当前主线”和“复现生产常见环境”分开。

| 维度 | 主线分析 | 可运行生产基线 | 阅读策略 |
| --- | --- | --- | --- |
| Java | 以 Java 21 的部署与诊断能力为重点 | 示例保持 Java 17 可编译 | 业务代码避免无必要的新语法依赖 |
| Framework | 7.0 | 6.2 | 核心容器模型一致，关注废弃 API 与默认行为调整 |
| Boot | 4.1 | 3.5 | 关注测试模块拆分、依赖坐标和自动配置条件变化 |
| Jakarta | `jakarta.*` | `jakarta.*` | 不再使用旧 `javax.*` Web 与 Validation 包名 |

每篇涉及内部类或方法时都会给出所属版本和调用上下文，不把某一版本的源码行号当成永久 API。升级时首先依赖公开契约、迁移指南和条件报告，而不是复制内部实现。

## 从现象反推责任层

| 现象 | 第一检查点 | 原因 |
| --- | --- | --- |
| 应用启动时报缺少 Bean | BeanDefinition 来源、扫描范围、条件和候选实现 | 对象图没有闭合 |
| Bean 能注入但事务不生效 | 实际对象类型、代理方式、调用是否穿过代理 | 问题发生在 AOP 调用边界 |
| 请求 404 | Servlet 映射、Controller 映射和 HTTP Method | 请求尚未进入业务 Service |
| 请求 400 | JSON 格式、参数解析、校验错误 | MVC 在业务调用前拒绝输入 |
| 配置不是预期值 | PropertySource 顺序、Profile、环境变量和绑定前缀 | Environment 中的最终值不同 |
| 业务方法单测通过但接口失败 | Controller 转换、容器接线、序列化或异常处理 | 业务规则正确不等于框架集成正确 |

排错时不要从所有注解开始逐个猜。先确定问题发生在启动期还是请求期，再判断是对象图、代理、协议适配还是外部资源。责任层一旦确定，搜索范围会迅速缩小。

## 本篇结论

Spring 的核心价值可以压缩成一句话：**让业务对象声明依赖，让应用基础设施统一完成装配、增强和协议接入，并尽可能在启动阶段验证运行结构。**

这套机制带来可替换、可测试和一致的扩展入口，但也引入容器生命周期、代理边界和自动配置条件。掌握 Spring 不是记住更多注解，而是能回答：当前对象由谁创建、依赖从哪里来、调用经过哪些基础设施、错误发生在哪个阶段。

下一篇将沿着同一个订单请求，把“应用启动”和“返回 JSON”连成完整生命线，并明确每个关键对象出现的时间点。
