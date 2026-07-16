# Spring Boot 源码全流程视频系列

《Spring Boot 源码全流程》共 20 集。视频从一个应用为何能启动并响应请求出发，沿真实源码调用顺序进入配置环境、ApplicationContext、BeanDefinition、`refresh()`、自动配置、Bean 生命周期、AOP、事务、WebServer 和 Spring MVC 请求链。文字文档负责补充概念边界、工程用法和排错入口。

系列采用 Spring Boot 4.1.0、Spring Framework 7.0.8、Java 25 作为源码讲解基线。这是阅读源码时使用的固定坐标，不表示所有项目都应立即升级到这些版本。维护其他版本时，应保留主流程模型，同时以项目实际依赖中的类名、方法签名和条件分支为准。

![Spring Boot 启动源码主链](/spring/boot-startup-source-chain.svg)

## 观看前先分清五个词

| 术语 | 它是什么 | 它不是什么 |
| --- | --- | --- |
| Environment | 应用可以查询的有序配置集合 | 只等于操作系统环境变量 |
| BeanDefinition | 描述对象类型、作用域和创建方式的元信息 | 已经创建好的业务对象 |
| Bean | 已经由 Spring 容器管理的对象 | 所有通过 `new` 创建的 Java 对象 |
| ApplicationContext | 管理定义、Bean、事件和资源的运行容器 | Docker 或操作系统容器 |
| WebServer | 监听端口并接收网络请求的服务器 | Controller 或业务 Service |

新手最容易把 BeanDefinition、Bean 和 ApplicationContext 混在一起。可以先记住：BeanDefinition 是说明书，Bean 是根据说明书造出的对象，ApplicationContext 是保管说明书和对象、推进生命周期的容器。

## 源码主线

页面开头的启动源码主链图把流程分为两层：`refresh()` 之前准备 Environment、ApplicationContext 和初始 BeanDefinition；`refresh()` 内部展开配置、创建 Bean、生成代理并启动 WebServer。DispatcherServlet 随后使用已经形成的对象图处理 HTTP 请求。

这条主线同时回答三个问题：启动代码按什么顺序执行、容器里的对象怎样形成、应用启动后请求怎样进入业务方法。阅读单个类时，应先确认它位于启动输入、容器刷新还是请求处理阶段，再进入方法内部。

## 学习路线

| 阶段 | 集数 | 重点 | 配套阅读 |
| --- | --- | --- | --- |
| 建立启动地图 | EP01–EP03 | 启动阶段、事件机制、Boot 与 Framework 的职责边界 | [Spring 总览](./)、[Spring Boot](./springboot.md) |
| 准备容器输入 | EP04–EP07 | 配置源、Config Data、上下文类型和初始 BeanDefinition | [Spring Boot](./springboot.md)、[IoC 容器](./ioc.md) |
| 展开容器定义 | EP08–EP13 | `refresh()`、工厂后处理器、配置类、自动配置与条件判断 | [IoC 容器](./ioc.md)、[Spring Boot](./springboot.md) |
| 创建并增强对象 | EP14–EP18 | Bean 生命周期、依赖注入、后处理器、AOP 与事务 | [IoC 容器](./ioc.md)、[AOP](./aop.md) |
| 接通 Web 链路 | EP19–EP20 | 内嵌服务器启动和 MVC 请求分派 | [Spring MVC](./mvc.md)、[Spring Boot](./springboot.md) |

第一次学习建议按顺序观看。排查具体问题时，可以直接根据后面的现象表进入对应集数和文字页面。

## 覆盖边界

“源码全流程”指的是 Servlet Web 应用从 `main()` 到 Controller 的主启动链，不表示 Spring 生态的每个子系统都在 20 集内展开。

- WebFlux 使用 Reactive ApplicationContext 和响应式请求链，不能直接套用 DispatcherServlet 模型。
- Spring Security 的 FilterChainProxy 位于 MVC 调度之前，需要单独分析安全过滤器链。
- JPA、MyBatis、Redis 和消息队列有各自的连接、会话、事务或消费模型，本系列只解释它们如何作为 Bean 进入容器。
- Actuator、AOT、Native Image、自定义 Starter 和自动配置测试适合在主链建立后继续深入。

明确边界并不是减少内容，而是避免把不同运行模型压缩到一张图里。主链掌握后，再进入这些子系统，更容易判断它们在哪个阶段接入。

## 分集目录

| 集数 | 核心问题 | 源码入口 | 视频 | 配套阅读 |
| --- | --- | --- | --- | --- |
| EP01 | 一个磁盘上的工程怎样变成可以响应请求的服务 | `SpringApplication.run()`、`AbstractApplicationContext.refresh()` | [B站](https://www.bilibili.com/video/BV1A5Ku6jE6R) | [Spring 总览](./)、[Spring Boot](./springboot.md) |
| EP02 | `run()` 怎样编排环境、容器、Runner 和就绪事件 | `SpringApplication.run()` | [B站](https://www.bilibili.com/video/BV1AGKu6mEXo) | [Spring Boot](./springboot.md) |
| EP03 | 容器还没创建时，启动事件为什么已经能够发布 | `SpringApplicationRunListeners`、`EventPublishingRunListener` | [B站](https://www.bilibili.com/video/BV1AGKu6mEQA) | [Spring 总览](./) |
| EP04 | 同一配置来自多个位置时，最终值怎样确定 | `prepareEnvironment()`、`PropertySource` | [B站](https://www.bilibili.com/video/BV1AGKu6mEDp) | [配置加载](./springboot.md#配置加载) |
| EP05 | `application.yml`、Profile 和外部目录怎样进入配置栈 | `ConfigDataEnvironmentPostProcessor` | [B站](https://www.bilibili.com/video/BV1d8Ku6NEMh) | [配置加载](./springboot.md#配置加载) |
| EP06 | 同一个 `main()` 为什么会创建普通、Servlet 或 Reactive 上下文 | `WebApplicationType`、`ApplicationContextFactory` | [B站](https://www.bilibili.com/video/BV1R8Ku6NEKT) | [Spring Boot](./springboot.md)、[Spring MVC](./mvc.md) |
| EP07 | Bean 创建前，主配置类怎样先登记为 BeanDefinition | `SpringApplication.load()`、`BeanDefinitionLoader` | [B站](https://www.bilibili.com/video/BV1RtKu6iEqZ) | [IoC 容器](./ioc.md) |
| EP08 | `refresh()` 怎样把定义集合推进成可用容器 | `AbstractApplicationContext.refresh()` | [B站](https://www.bilibili.com/video/BV1jtKu6qEEC) | [IoC 容器](./ioc.md) |
| EP09 | BeanFactory 创建业务 Bean 前要先安装哪些运行规则 | `prepareBeanFactory()` | [B站](https://www.bilibili.com/video/BV1GYKu6PE99) | [IoC 容器](./ioc.md) |
| EP10 | 主配置类怎样通过工厂后处理器展开成更多定义 | `invokeBeanFactoryPostProcessors()`、`ConfigurationClassPostProcessor` | [B站](https://www.bilibili.com/video/BV19YKu6AEFn) | [IoC 容器](./ioc.md) |
| EP11 | `@ComponentScan`、`@Import` 和 `@Bean` 怎样递归解析 | `ConfigurationClassParser` | [B站](https://www.bilibili.com/video/BV19hKu6eEAr) | [IoC 容器](./ioc.md) |
| EP12 | 自动配置候选从哪里来，又怎样进入普通配置解析链 | `AutoConfigurationImportSelector` | [B站](https://www.bilibili.com/video/BV1RhKu6eENY) | [自动配置](./springboot.md#自动配置) |
| EP13 | 用户自定义 Bean 后，默认自动配置为什么会让位 | `ConditionEvaluator`、`OnBeanCondition` | [B站](https://www.bilibili.com/video/BV1RhKu6eE14) | [自动配置](./springboot.md#自动配置) |
| EP14 | BeanDefinition 怎样经过实例化、填充和初始化成为对象 | `getBean()`、`doCreateBean()` | [B站](https://www.bilibili.com/video/BV1fWKu6uE5W) | [IoC 容器](./ioc.md) |
| EP15 | Spring 怎样从多个候选对象中确定注入目标 | `AutowiredAnnotationBeanPostProcessor`、`DependencyDescriptor` | [B站](https://www.bilibili.com/video/BV1oWKu6uEyp) | [IoC 容器](./ioc.md) |
| EP16 | BeanPostProcessor 在对象生命周期的什么位置接入增强 | `PostProcessorRegistrationDelegate`、`BeanPostProcessor` | [B站](https://www.bilibili.com/video/BV1fHKu66EeJ) | [IoC 容器](./ioc.md)、[AOP](./aop.md) |
| EP17 | Advisor 怎样匹配业务 Bean，并由 ProxyFactory 生成代理 | `AbstractAutoProxyCreator`、`ProxyFactory` | [B站](https://www.bilibili.com/video/BV1EHKu6rE39) | [AOP](./aop.md) |
| EP18 | `@Transactional` 怎样进入拦截器并完成提交或回滚 | `TransactionInterceptor`、`PlatformTransactionManager` | [B站](https://www.bilibili.com/video/BV1i4Ku6MEng) | [AOP](./aop.md) |
| EP19 | 内嵌 Tomcat 在什么时候创建并真正监听 8080 | `ServletWebServerApplicationContext.onRefresh()`、`WebServerStartStopLifecycle` | [B站](https://www.bilibili.com/video/BV1o4Ku6TERf) | [Spring Boot](./springboot.md) |
| EP20 | 请求怎样找到 Controller 方法并变成响应 | `DispatcherServlet.doDispatch()`、`RequestMappingHandlerAdapter` | [B站](https://www.bilibili.com/video/BV1osKu6BEqK) | [Spring MVC](./mvc.md) |

## 配合文字文档阅读

视频和文字承担不同职责。视频适合建立调用顺序和对象关系，文字页适合在编码或排错时回查边界。

- [Spring 总览](./) 负责 IoC、AOP、MVC、Boot 的关系，以及一次请求在各模块中的位置。
- [IoC 容器](./ioc.md) 负责 Bean 来源、依赖解析、生命周期和装配冲突。
- [AOP](./aop.md) 负责代理选择、切点、事务失效和横切逻辑边界。
- [Spring MVC](./mvc.md) 负责请求映射、参数绑定、返回值、异常处理和接口排查。
- [Spring Boot](./springboot.md) 负责 Starter、自动配置、外部化配置、Actuator、打包运行和生产边界。

观看时不需要记住所有类名。每完成一个阶段，至少能画出当前阶段的输入、关键处理器、输出以及失败后应该查看的证据。

## 最小跟踪练习

准备一个只有 `spring-boot-starter-web`、一个 Controller 和一个 Service 的应用，然后完成下面的闭环：

1. 在 `application.yml` 把端口设为 8081，再用命令行参数改为 8082，确认最终监听端口和配置来源。
2. 在 `SpringApplication.run()`、`AbstractApplicationContext.refresh()` 和 `doCreateBean()` 设置断点，观察启动顺序。
3. 打印 Controller 与 Service 的实际类型，确认哪些对象是普通 Bean，哪些对象因为 AOP 或事务成为代理。
4. 请求 `GET /hello`，在 `DispatcherServlet.doDispatch()` 查看 Handler、参数解析和返回值处理。
5. 用启动日志、端口、断点和 HTTP 响应证明整条链真实走通。

这组练习不要求修改框架源码。目标是把视频中的类和方法与一个可以重复运行的应用对应起来。

## 按现象回查

| 现象 | 优先集数 | 建议断点或证据 | 文字入口 |
| --- | --- | --- | --- |
| 启动失败，但不清楚发生在哪个阶段 | EP01–EP03、EP08 | `SpringApplication.run()`、`refresh()` 异常栈、启动事件 | [Spring Boot 常见问题](./springboot.md#常见问题) |
| 配置值与 `application.yml` 不一致 | EP04–EP05 | PropertySource 顺序、激活 Profile、`/actuator/env` | [配置加载](./springboot.md#配置加载) |
| 应用创建了错误的上下文或服务器没有启动 | EP06、EP19 | WebApplicationType、Context 真实类型、端口监听、启动日志 | [Spring Boot](./springboot.md) |
| Bean 没注册、没注入或出现多实现冲突 | EP07–EP11、EP14–EP15 | BeanDefinition 名称、候选类型、Qualifier、Primary | [IoC 容器](./ioc.md) |
| 自动配置未生效或自定义 Bean 没有覆盖默认实现 | EP12–EP13 | conditions 报告、classpath、已有 BeanDefinition | [自动配置](./springboot.md#自动配置) |
| AOP 或事务注解没有生效 | EP16–EP18 | Bean 真实类型、Advisor、是否经过代理、异常传播 | [AOP 失效场景](./aop.md#失效场景) |
| 请求 404、参数绑定失败或响应转换异常 | EP20 | mappings、HandlerMapping、HandlerAdapter、Converter | [Spring MVC 排查路径](./mvc.md#排查路径) |

排错时应先确认现象位于启动阶段还是请求阶段。启动阶段的问题优先查看 Environment、BeanDefinition 和 `refresh()`；请求阶段的问题优先查看端口、Servlet 容器、DispatcherServlet 和具体 Handler。

## 能力验证清单

完成这套路线后，应能独立完成：

- 画出从 `main()` 到 `ApplicationReadyEvent` 的主流程，并说明 Boot 与 Framework 的职责边界。
- 根据配置覆盖问题定位实际 PropertySource、Profile 和 Config Data 位置。
- 区分 ApplicationContext 创建、BeanDefinition 注册和 Bean 实例化三个时刻。
- 按 `refresh()` 的阶段判断工厂后处理器、Bean 后处理器和单例创建的执行顺序。
- 从 `.imports`、条件注解和已有 Bean 解释自动配置为何生效或退让。
- 从 `doCreateBean()` 解释实例化、依赖注入、初始化和提前暴露的边界。
- 判断一个对象是否经过代理，并定位自调用、非公开方法或异常处理导致的事务失效。
- 从 WebServer 生命周期解释“服务器对象已创建”和“端口已经监听”的区别。
- 从 `DispatcherServlet` 追踪 HandlerMapping、HandlerAdapter、参数解析、方法调用和返回值处理。
- 把启动日志、断点、Actuator、端口和真实请求组合成可验证的源码阅读闭环。
