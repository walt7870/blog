# Spring / Spring Boot

Spring 不是一组注解的集合，而是一套应用运行模型：启动阶段发现组件、建立对象图并挂接扩展能力；请求阶段复用对象图，通过 Web、事务和数据访问基础设施完成一次业务调用；Spring Boot 则在这套模型之上提供配置、自动装配、内嵌服务器、诊断和交付能力。

本专题使用同一个订单系统贯穿全部章节。每个机制都从真实问题进入，继续追踪运行阶段和源码入口，再用可运行代码、失败实验和排错路径完成验证。Framework 7.0 与 Boot 4.1 是源码主线，同时标明 Framework 6.2、Boot 3.5 及 Java 17/21 的生产差异。

## 学习起点

- [Spring 解决了什么问题](./foundation/why-spring.md)：理解容器、代理、Web 与 Boot 分别接管什么，以及哪些责任仍属于业务系统。
- [一个请求从应用启动到 JSON 响应的完整生命线](./runtime-model.md)：沿订单请求连接启动链和请求链。
- [Framework、Boot、Servlet 容器与生态项目边界](./foundation/platform-boundaries.md)：避免把所有 `org.springframework.*` 能力混成一个框架。
- [Spring 注解运行机制与常用注解指南](./annotations.md)：从注解读取者、处理阶段和失效边界建立查阅入口。
- [Spring Boot 源码全流程视频系列](./video-series.md)：20 集视频按源码调用顺序对应到下列文字章节，适合先建立动态过程，再回到正文查机制和排错方法。

## 完整知识体系

下面是完整创作路线。标题带链接表示独立正文已经可以阅读；暂未链接的标题会继续按顺序创作，不使用空白页或提纲页占位。

### 基础运行模型

1. [Spring 解决了什么问题](./foundation/why-spring.md)
2. [一个请求从应用启动到 JSON 响应的完整生命线](./runtime-model.md)
3. [Spring Framework、Spring Boot、Servlet 容器与生态项目边界](./foundation/platform-boundaries.md)
4. [Spring 注解运行机制与常用注解指南](./annotations.md)

### Core Container

5. [BeanFactory、ApplicationContext 与 IoC 容器](./ioc.md)
6. BeanDefinition 的来源与注册
7. 配置类、组件扫描、Import 与条件解析
8. `refresh()` 完整刷新过程
9. Bean 实例化、构造器选择与依赖解析
10. BeanPostProcessor、FactoryPostProcessor 与扩展点
11. 生命周期、作用域、懒加载与销毁
12. 循环依赖、三级缓存与代理一致性
13. Resource、Environment、PropertySource 与 Profile
14. 事件、国际化与应用解耦
15. Validation、DataBinder、类型转换与格式化
16. SpEL、元注解和组合注解
17. Spring AOT 与运行时反射边界

### AOP、事务与数据访问

18. [AOP 代理创建、拦截器链与事务入口](./aop.md)
19. 切点、通知、Advisor 与代理选择
20. 声明式事务从注解到数据库连接
21. 传播行为、隔离级别、rollback-only 与事务同步
22. 事务失效、异步边界和外部副作用
23. JdbcTemplate、连接管理与统一数据异常
24. JPA、ORM、R2DBC 与 Spring 事务接入边界

### Web

25. [Spring MVC 请求处理总览](./mvc.md)
26. DispatcherServlet 请求分派
27. 参数解析、数据绑定、校验和消息转换
28. 返回值、内容协商、异常处理和流式响应
29. Filter、Interceptor、AOP 与安全过滤链
30. 文件上传、静态资源、CORS 与异步请求
31. REST Client、HTTP Interface 与客户端错误处理
32. WebSocket、SockJS 与 STOMP
33. WebFlux、WebClient、背压与 Servlet 模型边界
34. RSocket 与响应式双向通信

### Testing 与 Integration

35. Spring TestContext 与上下文缓存
36. 单元测试、测试切片和完整集成测试
37. MockMvc、RestTestClient 与 WebTestClient
38. 数据库、消息和容器化测试
39. 异步任务、调度与线程池
40. 缓存抽象与一致性边界
41. JMS、邮件、JMX 与 Observability

### Spring Boot

42. [`SpringApplication.run()` 完整启动过程](./boot-startup.md)
43. [Config Data、配置覆盖与配置绑定](./boot-config-data.md)
44. [自动配置候选、条件、排序和退让](./boot-autoconfiguration.md)
45. Starter 与自定义 AutoConfiguration
46. 内嵌 Tomcat、Jetty、Netty 与优雅停机
47. 日志系统、FailureAnalyzer 与启动诊断
48. SQL、NoSQL、消息、缓存和 IO 自动配置
49. Actuator、健康检查、指标、Tracing 和审计
50. 可执行 Jar、分层 Jar、Docker 与 Buildpacks
51. AOT、Native Image、Checkpoint Restore 与启动优化
52. [Spring Boot 配置与生产运行](./boot-production.md)

## 如何阅读

第一次接触 Spring，应从基础运行模型顺序阅读，再进入 Core Container。已经能够开发接口但经常遇到事务、注入或 404 问题，可以先读完整生命线，再按现象进入对应章节。准备升级或排查生产启动问题时，应同时关注每篇的版本差异、失败实验和证据链，不直接把内部源码细节当作稳定 API。

Security、Spring Data、Integration、Cloud 等独立生态项目只在本专题中说明接入点；它们的内部原理在独立专题展开。
