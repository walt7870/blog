# Spring 总览

Spring 是 Java 应用的基础设施框架。它的核心价值不是“提供很多注解”，而是把应用中最容易散乱的几类事情收拢到统一机制里：对象创建、依赖组装、方法增强、Web 请求处理、配置加载、运行状态暴露。

可以把一个 Spring 应用理解成一条加工线：

- IoC 容器像对象仓库，负责创建和保管应用组件。
- AOP 像方法调用入口的检查站，负责在业务方法前后插入事务、日志、权限等通用动作。
- MVC 像 HTTP 请求调度台，负责把 URL、参数和请求体转交给合适的控制器方法。
- Spring Boot 像装配和启动系统，负责把常用依赖、默认配置、内嵌服务器和运维端点组织起来。

![Spring 学习路径](/spring/spring-learning-map.svg)

## 先用一个请求建立整体模型

假设浏览器请求 `GET /orders/1001`。应用能够返回订单，不是 Controller 一个人完成的，而是两条链先后协作。

启动时，Spring Boot 读取配置并创建 ApplicationContext；IoC 根据 BeanDefinition 创建 Controller、Service、Repository，并把依赖连接起来；AOP 为需要事务的 Service 生成代理；WebServer 启动并监听端口。此时应用只是“准备好接请求”。

请求到达后，DispatcherServlet 找到 Controller 方法并完成参数转换；Controller 调用注入的 Service；调用经过事务代理后进入业务方法；Repository 访问数据库；返回值再被转换成 JSON。两条链的阶段关系如下：

![Spring 启动链与请求链](/spring/spring-runtime-chains.svg)

新手容易把“应用启动”和“请求处理”混成一件事。前者负责把运行系统准备完整，后者使用已经准备好的对象处理一次输入。后面的 IoC、AOP、MVC 和 Boot 页面，分别解释这张图中的一段。

这两条链之间真正的连接点是 `ApplicationContext`。启动阶段结束后，Context 中保存的不是一堆彼此孤立的 Java 对象，而是一张已经完成装配的对象图：Controller 持有 Service 代理，Service 代理指向目标 Service，目标 Service 持有 Repository，MVC 基础设施保存 Controller 方法的映射关系。请求阶段不再临时扫描类、临时创建 Service，也不会在每次请求到来时重新解析自动配置；它只是沿启动阶段形成的对象图执行一次调用。

这也解释了 Spring 中很多看似无关的故障为什么都发生在启动期。构造器缺少依赖时，容器无法完成对象图；两个 Bean 互相依赖时，容器无法确定创建顺序；自动配置条件不满足时，对应 BeanDefinition 根本不会进入对象图；端口被占用时，WebServer 无法完成 Context 刷新。只有这张对象图和 Web 运行环境都准备完成，应用才会进入可接流量状态。

## Spring 接管代码的三个时刻

理解框架行为时，需要区分“定义被发现”“对象被创建”“方法被调用”三个时刻。它们经常被一句“Spring 自动处理”混在一起。

主配置类、组件扫描结果和自动配置首先被解析成 `BeanDefinition`。此时容器知道将来要创建哪些对象，但对象未必已经存在。随后 `refresh()` 根据定义创建非懒加载单例，解析构造器参数，执行后处理器，并可能把原始对象包装成代理。最后，请求或定时任务到来时，运行期调用才经过 MVC、AOP 和业务对象。

以 `@Transactional OrderService` 为例：组件扫描只登记“存在一个 OrderService”；Bean 创建阶段实例化它并由自动代理创建器返回代理；Controller 真正调用时，事务拦截器才取得连接、开启事务并进入目标方法。注解本身既不创建对象，也不直接开启事务，它只是让不同阶段的处理器获得一份元数据。

## 模块概览

| 模块 | 解决的问题 | 可以这样理解 | 详细说明 |
| --- | --- | --- | --- |
| IoC 容器 | 对象由谁创建、依赖由谁连接、生命周期由谁管理 | 应用组件的登记簿和装配车间 | [IoC 容器](./ioc.md) |
| AOP | 事务、日志、权限、审计等通用逻辑如何不侵入业务方法 | 方法调用外层的统一检查站 | [AOP](./aop.md) |
| Spring MVC | HTTP 请求如何匹配控制器、绑定参数、返回响应 | Web 请求的调度中心 | [Spring MVC](./mvc.md) |
| Spring Boot | 应用如何用较少配置启动，并获得默认 Web、配置、监控能力 | Spring 应用的启动器和默认装配器 | [Spring Boot](./springboot.md) |

阅读顺序建议是 IoC -> AOP -> MVC -> Spring Boot。IoC 是基础，AOP 和 MVC 都依赖容器管理 Bean；Spring Boot 则把这些能力按常见项目形态组合起来。

如果是第一次进入本专题，不建议直接按模块顺序背概念。先读 [一个 Spring 请求的完整运行过程](./runtime-model.md)，看清启动阶段怎样形成对象图、请求阶段怎样复用对象图，再根据问题进入对应机制。

## 按读者问题进入

| 当前问题 | 首选入口 | 后续深入 |
| --- | --- | --- |
| 只会写接口，不清楚框架怎样连起来 | [完整运行过程](./runtime-model.md) | IoC、AOP、MVC |
| Bean 找不到、循环依赖、注入冲突 | [IoC 容器](./ioc.md) | Boot 自动配置 |
| 事务不生效、回滚结果异常 | [AOP 与事务](./aop.md) | 完整运行过程 |
| 404、400、JSON 写出失败 | [Spring MVC](./mvc.md) | 完整运行过程 |
| 想理解 `run()` 和端口监听 | [Boot 启动机制](./boot-startup.md) | IoC、MVC |
| 加了 Starter 但 Bean 没出现 | [Boot 自动配置](./boot-autoconfiguration.md) | 配置与生产运行 |
| 配置覆盖、健康检查、线上故障 | [配置与生产运行](./boot-production.md) | Boot 启动机制 |

## 视频学习入口

配套的 [Spring Boot 源码全流程视频系列](./video-series.md) 共 20 集，每集独立发布并对应一个具体源码问题。系列从 `SpringApplication.run()` 进入，依次经过配置环境、ApplicationContext、BeanDefinition、`refresh()`、自动配置、Bean 生命周期、AOP、事务、WebServer，最后走到 DispatcherServlet 处理 HTTP 请求。

建议先按 EP01–EP03 建立全局地图，再根据 [分集目录](./video-series.md#分集目录) 进入具体机制。遇到配置覆盖、Bean 注入、自动配置、事务失效或请求 404 时，可以直接使用 [按现象回查](./video-series.md#按现象回查) 定位集数、断点和文字入口。

## Spring 解决的核心矛盾

没有框架约束时，一个业务类常常同时承担很多职责：自己创建数据库访问对象，自己读取配置，自己处理事务，自己记录日志，自己决定异常如何返回。代码能运行，但系统变大后会出现几个问题：

- 依赖关系藏在方法和构造细节里，替换实现、写测试、定位问题都困难。
- 事务、日志、权限等通用逻辑在多个业务方法里重复出现。
- HTTP、数据库、缓存、消息、配置等入口没有统一组织方式。
- 启动失败、配置不生效、注解不生效时，很难判断应该从哪一层查。

Spring 的处理方式是把这些职责分层：

- 业务类只声明自己需要哪些依赖，不直接决定依赖如何创建。
- 容器负责找到这些依赖，并在应用启动时完成装配。
- 通用逻辑通过代理或框架组件统一挂到调用链上。
- Web 请求、异常响应、配置读取、健康检查都有稳定入口。

因此，理解 Spring 的重点不是背注解，而是看清每个机制接管了哪一段责任。

## 一次请求中的位置关系

以“创建订单接口”为例，可以按这条链理解：

1. Spring Boot 启动应用，读取配置，启动内嵌 Web 服务器。
2. IoC 容器创建 Controller、Service、Repository、Client 等 Bean，并注入依赖。
3. 浏览器或客户端发起 HTTP 请求。
4. Spring MVC 根据路径和方法找到 Controller，并完成参数绑定与校验。
5. Controller 把请求转换为业务命令，调用 Service。
6. 如果 Service 方法带有事务、审计或日志增强，AOP 代理先执行这些通用逻辑。
7. Service 执行业务流程，调用 Repository 或外部 Client。
8. 方法返回后，AOP 处理提交、记录或异常逻辑。
9. MVC 把结果转换成 JSON；如果发生异常，则交给统一异常处理。

这条链也是排错顺序。请求没进来查 MVC 映射；业务对象没创建查 IoC；事务没生效查 AOP 代理；配置没加载查 Boot 配置和自动装配。

## 关键边界

### IoC 管对象，不管所有数据

适合交给 IoC 容器的对象通常是长期存在、可复用、需要配置或需要被其他组件依赖的对象，例如 Controller、Service、Repository、消息监听器、HTTP 客户端、线程池、配置类。

不适合交给容器的对象通常是一次请求或一次业务流程中的临时数据，例如 Request、Response、Command、DTO、Entity。它们更像“单据”，由业务流程创建和传递，不应该放进对象仓库长期保管。

### AOP 管横切逻辑，不管核心业务分支

AOP 适合处理“很多方法都要做，而且规则一致”的事情，例如事务、日志、审计、权限检查。它不适合隐藏关键业务分支，因为调用者很难从方法体直接看到完整行为。

判断标准很简单：去掉这段逻辑后，业务流程是否仍然能被清楚描述。如果能，它可能是横切逻辑；如果不能，它应该显式写在业务流程里。

### MVC 管协议适配，不管业务决策

Controller 应该像翻译层：把 HTTP 路径、查询参数、请求体翻译成业务命令，再把业务结果翻译成接口响应。库存扣减、订单状态流转、支付超时补偿等业务决策，应放在 Service 或领域对象中。

### Boot 管启动装配，不替代 Spring 基础能力

Spring Boot 让项目更容易启动，但它并没有改变 Spring 的基本模型。`@SpringBootApplication` 背后仍然是组件扫描、自动配置和 IoC 容器；`spring-boot-starter-web` 背后仍然是 Spring MVC 和 Servlet Web 运行环境。

## 常见入口

| 目标 | 常见入口 | 说明 |
| --- | --- | --- |
| 注册应用组件 | `@Component`、`@Service`、`@Repository`、`@Controller` | 让类成为容器管理的 Bean |
| 注册第三方对象 | `@Configuration` + `@Bean` | 适合 SDK Client、线程池、数据源等 |
| 声明事务边界 | `@Transactional` | 通常放在应用服务的 public 方法 |
| 处理 HTTP 请求 | `@RestController`、`@RequestMapping` | 由 MVC 完成路由和参数绑定 |
| 绑定配置 | `@ConfigurationProperties` | 适合业务配置和外部服务配置 |
| 观察运行状态 | Actuator | 查看健康、路由、配置、自动装配条件 |

## 排错入口

| 现象 | 优先检查 | 详细说明 |
| --- | --- | --- |
| Bean 没有注入 | 扫描范围、Bean 来源、条件装配、多实现冲突 | [IoC 常见问题](./ioc.md#常见问题) |
| `@Transactional` 不生效 | 是否经过代理、是否内部调用、异常是否被吞掉 | [AOP 失效场景](./aop.md#失效场景) |
| 接口 404 或参数绑定失败 | URL、HTTP Method、参数注解、内容类型 | [MVC 排查路径](./mvc.md#排查路径) |
| 配置值不是预期 | profile、环境变量、命令行参数、配置绑定 | [Boot 配置排查](./springboot.md#常见问题) |
| 自动配置没有生效 | classpath、条件注解、用户自定义 Bean、排除项 | [Boot 自动配置](./springboot.md#自动配置) |

## 学习目标

读完这一组文档后，应能回答这些问题：

- 一个类为什么能被注入到另一个类里。
- 同一个接口多个实现时，Spring 如何决定注入哪个。
- 事务为什么有时生效、有时不生效。
- 一个 HTTP 请求如何找到对应控制器方法。
- Spring Boot 为什么加了 Starter 就会出现默认能力。
- 出现 Bean、代理、路由、配置问题时，应该从哪一层开始查。

Spring 的学习不应停留在注解清单。更有效的方式是把它看成应用运行链路：启动时装配对象，请求时调度入口，调用时经过代理，异常时统一处理，运行时通过日志和端点观察状态。

## 阅读方式

- 第一次接触 Spring：先读本页，再读 [IoC 容器](./ioc.md) 和 [Spring MVC](./mvc.md)，最后进入 [Spring Boot](./springboot.md)。
- 已经能写业务接口：重点读 [AOP](./aop.md) 的代理边界、[Spring Boot](./springboot.md) 的自动配置和 [源码视频系列](./video-series.md)。
- 正在排查问题：不要按目录从头阅读，直接从本页的排错入口或 [按现象回查](./video-series.md#按现象回查) 进入对应机制。
