# Spring Boot 启动机制

Spring Boot 启动不是“扫描注解然后启动 Tomcat”这么简单。一次完整启动需要先建立配置环境，再选择容器类型、加载初始定义、刷新对象图、创建服务器，最后执行 Runner 并发布就绪事件。不同阶段使用的扩展机制不同，故障入口也不同。

![Spring Boot 启动源码主链](/spring/boot-startup-source-chain.svg)

> 配套视频：[EP02：`run()` 的完整启动编排](https://www.bilibili.com/video/BV1AGKu6mEXo) 适合跟随本页主链观看；服务器阶段对应 [EP19：内嵌 Tomcat 的创建与监听](https://www.bilibili.com/video/BV1o4Ku6TERf)。

## `SpringApplication` 构造阶段

`SpringApplication.run(OrderApplication.class, args)` 会创建 SpringApplication，并保存主配置类。它根据 classpath 判断应用类型：MVC 条件满足时选择 Servlet Context，只有响应式 Web 条件满足且 MVC 不存在时才选择 Reactive，否则使用普通非 Web Context。

构造阶段还会发现 ApplicationContextInitializer 和 ApplicationListener。此时普通 Bean 尚不存在，这些扩展用于修改即将创建的 Context 或观察早期启动事件，不能按业务 Bean 的使用方式理解。

### Primary Source 不是“扫描结果”

传给 `run()` 的 `OrderApplication.class` 是 Primary Source。它告诉 Boot 从哪里开始加载配置，通常同时带有 `@SpringBootApplication`。构造 SpringApplication 时还没有扫描 Controller、Service 或 Repository；这些类要等主配置被登记并在 `refresh()` 中由配置类处理器展开。

启动类位置会影响默认组件扫描根包。把启动类放在业务包的下层，可能导致同级模块没有被发现；放在默认包又可能扫描所有依赖。根包应覆盖应用组件，但不应把无关库全部纳入扫描。

### 应用类型是运行模型选择

`WebApplicationType` 决定后续使用普通、Servlet 还是 Reactive ApplicationContext。它不仅影响有没有端口，还影响 WebServerFactory、作用域、服务器生命周期和请求入口。

当 MVC 与 WebFlux 同时在 classpath 中时，不能根据某个 Reactor 类型判断应用一定走响应式链。应检查 SpringApplication 的最终应用类型、Context 实际类型以及入口是 `DispatcherServlet` 还是 `DispatcherHandler`。

## 早期扩展点为什么不能都做成 Bean

Boot 启动早期需要在 Context 存在前完成日志、配置位置、Bootstrap Registry 和 Environment 修改。普通 Bean 依赖 Context 刷新后才能发现，因此无法反过来参与这些阶段。

| 扩展类型 | 介入阶段 | 适合做什么 | 不应做什么 |
| --- | --- | --- | --- |
| Bootstrap Registry 扩展 | Environment 前后 | 为配置解析准备早期资源 | 使用普通业务 Bean |
| EnvironmentPostProcessor | Environment 准备 | 增加或转换 PropertySource | 创建完整业务客户端 |
| ApplicationContextInitializer | Context 刷新前 | 调整 Context、注册少量定义 | 依赖全部单例已创建 |
| ApplicationListener | 对应事件阶段 | 观察生命周期和记录证据 | 隐藏核心业务初始化 |
| BeanFactoryPostProcessor | refresh 中定义阶段 | 修改 BeanDefinition | 操作尚未创建的业务对象 |
| Runner | Context 刷新后、就绪前 | 执行短且可控的启动任务 | 无超时远程调用 |

越早的扩展点拥有的运行环境越少，也越容易影响整个启动。平台代码若必须使用早期扩展，应保持功能窄、无业务副作用，并为失败提供清晰诊断。

## Environment 准备阶段

`run()` 创建 Environment，把默认属性、Config Data、环境变量、系统属性和命令行参数组织成有顺序的 PropertySource。日志配置、Profile、部分 `spring.main.*` 设置会在 Context 刷新前被读取，所以 Environment 必须提前完成。

Config Data 会解析包内与外部 `application` 文件、Profile 文档、`spring.config.import` 和可选位置。属性覆盖不是简单的“prod 文件高于默认文件”，还受来源类型、文件位置和文档顺序影响。排错时应确认最终 PropertySource，而不是只打开某个 YAML 文件。

环境准备还会触发早期监听器与日志初始化。此时发生的异常通常没有完整业务 Context，不能依赖普通 `@Component` 处理。需要参与这一阶段的扩展应使用 Boot 规定的早期发现机制，并避免引用尚未创建的业务 Bean。

Config Data 的详细发现、覆盖和绑定见 [Config Data、配置覆盖与类型安全绑定](./boot-config-data.md)。

## Context 创建与初始加载

ApplicationContextFactory 根据应用类型创建容器。此刻 Context 主要是一个尚未刷新的外壳。`load()` 随后把 primary source 登记为初始 BeanDefinition；组件扫描、`@Bean` 和自动配置仍要等待配置类处理器在 `refresh()` 中展开。

区分“Context 已创建”和“Context 已刷新”很重要。前者只能证明容器对象存在，后者才意味着普通单例、代理、生命周期组件和 Web 运行环境已经基本形成。

`prepareContext()` 会把 Environment 关联到 Context，应用 Initializer，并加载 Primary Source。`SpringApplication.load()` 使用 BeanDefinitionLoader 把主配置登记到 BeanDefinitionRegistry。这个阶段注册的是描述信息，不是已经执行构造器的启动类对象。

可以在 `load()` 后统计 BeanDefinition 数量，再在配置类处理完成后比较。后者会多出组件扫描、Import 和自动配置贡献的定义，这能直接证明“初始输入”和“最终对象图”之间还有配置解析过程。

## `refresh()` 推进容器状态

`refresh()` 先准备 BeanFactory，再执行 BeanFactoryPostProcessor。配置类处理器在这里扫描组件、处理 Import 并写入更多 BeanDefinition。随后容器注册 BeanPostProcessor，创建非懒加载单例；依赖注入、配置绑定、生命周期回调和自动代理都在对象创建过程中发生。

任何关键单例创建失败都会中断刷新。Spring 会销毁已创建的单例并关闭相关资源，避免留下一个只有部分对象可用的 Context。Bean 创建细节见 [IoC 容器](./ioc.md)。

`refresh()` 内部可以按四个责任段理解：

1. 准备 Context 与 BeanFactory，注册标准依赖和可解析对象。
2. 执行 BeanFactoryPostProcessor，把初始配置展开为完整 BeanDefinition 集合。
3. 注册 BeanPostProcessor，为注入、配置绑定、生命周期和自动代理安装创建规则。
4. 创建非懒加载单例，完成生命周期组件初始化并发布刷新事件。

这四段不是简单的回调列表。工厂后处理器修改“怎样创建对象”，Bean 后处理器参与“正在创建的对象”，普通业务 Bean 则是处理结果。扩展点放错阶段，会出现依赖尚不可用、对象过早创建或无法获得代理等问题。

### 自动配置在什么时候进入

自动配置候选由配置类解析链导入。条件评估决定哪些配置类和 Bean 方法形成定义，BeanFactory 随后才创建对象。条件报告属于定义阶段证据，不代表目标 Bean 一定成功初始化。

例如 DataSource 自动配置条件全部匹配，但连接池构造时仍可能因 URL 格式或驱动初始化失败。排查时要区分“定义有没有注册”和“实例有没有创建成功”。

## WebServer 创建与端口监听

Servlet Web Context 在刷新过程中寻找 `ServletWebServerFactory`。自动配置通常提供 Tomcat 或 Jetty Factory，服务器自定义器把 `server.*` 配置应用到 Factory，随后创建服务器并注册 DispatcherServlet、Filter 和 Listener。

服务器对象创建、Connector 绑定端口和应用发布就绪事件是不同时间点。排查时可以同时观察启动事件、Context 状态和 `lsof -i :8080`；生产探针则应以业务是否可以安全接流量为准。

Servlet Web Context 在 `onRefresh()` 附近创建 WebServer。服务器工厂、`server.*` 属性和 WebServerFactoryCustomizer 共同决定端口、TLS、压缩和线程等设置。随后 ServletContextInitializer 把 DispatcherServlet、Filter 和 Listener 注册到服务器环境。

端口冲突通常发生在服务器启动阶段，和 Controller 是否存在无关；Filter 初始化异常可能在服务器已经创建后阻止 Context 完成刷新。异常栈中的阶段比最外层“Application run failed”更有定位价值。

## Runner、事件与就绪

Context 刷新成功后，Boot 执行 ApplicationRunner 和 CommandLineRunner。它们仍位于启动关键路径，耗时初始化或远程调用会推迟应用就绪。Runner 完成后才发布 ApplicationReadyEvent。

必须在接流量前完成的短初始化可以放在启动链中；耗时预热应评估是否异步执行，并通过就绪状态控制流量。把不可控远程调用放入 Bean 构造器或初始化回调，会让整个 Context 被外部依赖超时拖住。

### 启动事件不是同一个时间点

Boot 的事件覆盖 Environment 准备、Context 初始化、启动完成与应用就绪等阶段。监听早期事件的对象可能还不是 Bean；监听刷新后事件的普通 Bean 则可以使用完整对象图。

事件适合观察生命周期或触发与阶段一致的动作，不适合把核心业务依赖隐藏在监听器里。订单服务若必须在接流量前加载路由表，应让失败明确阻止就绪；若只是异步预热缓存，则应在预热期间控制 readiness，并允许失败后重试。

常见事件可以按“环境可用、Context 已建立、启动编排完成、应用已就绪、启动失败”理解。监听器应只依赖该时点已经成立的事实。例如准备 Environment 的事件不能读取 OrderService，ApplicationReadyEvent 可以访问完整 Bean，却不应承诺未来数据库永远可用。

## 源码调用坐标

| 阶段 | 观察入口 | 要证明的事实 |
| --- | --- | --- |
| 构造 | `SpringApplication` 构造器 | Primary Source、应用类型、早期扩展集合 |
| 环境 | `prepareEnvironment()` | PropertySource 与激活 Profile 的最终结果 |
| Context | `createApplicationContext()` | 实际 Context 类型是否符合预期 |
| 初始定义 | `load()` | 主配置类只是初始 BeanDefinition |
| 刷新 | `AbstractApplicationContext.refresh()` | 配置解析、后处理器和单例创建顺序 |
| 服务器 | Web Context 的 `onRefresh()` | WebServerFactory 与端口何时生效 |
| Runner | `callRunners()` | 哪个 Runner 延长了启动关键路径 |
| 就绪 | `ApplicationReadyEvent` | Boot 启动编排已完成，不等于所有下游永远健康 |

观察源码时同时记录时间戳、线程名、BeanDefinition 数量和端口状态。只有方法断点而没有运行结果，容易把“经过某方法”误判为“阶段已经成功”。

## 四个失败实验

### 配置格式错误

在 YAML 中制造缩进错误。应用会在 Environment/Config Data 阶段停止，普通 Controller 与 Service 尚未创建。修复后应验证目标 PropertySource 与最终绑定值，不只确认进程能起来。

### 删除 Service 注解

OrderService 不再形成 BeanDefinition，Controller 构造器依赖在单例创建阶段无法解析。此时 Environment 已经完成，但 Context 无法刷新，端口通常不会进入可用状态。

### 占用服务器端口

先启动一个进程占用 8080，再运行应用。业务 Bean 可能已经创建，失败却发生在 WebServer 绑定 Connector 时。FailureAnalyzer 会给出可读提示，底层证据仍是端口占用与服务器异常。

### Runner 调用慢服务

在 Runner 中调用一个 30 秒超时的远端接口。Context 与端口可能已经存在，但 ApplicationReadyEvent 被推迟。如果平台过早送流量，会出现“进程活着但初始化未完成”的窗口。修正方案是缩短关键初始化、设置明确超时，并用 readiness 表达业务就绪。

## 启动耗时怎样拆解

总启动时间只能说明慢，不能说明慢在哪里。可以结合启动日志、ApplicationStartup/StartupStep、JFR、Bean 创建耗时与外部调用日志，把时间分到 Config Data、配置解析、Bean 创建、服务器和 Runner。

常见慢点包括：扫描范围过大、初始化时访问网络、数据库迁移、连接池预热、代理或类路径过多、Runner 串行任务。优化前先取得阶段证据；盲目开启懒加载可能只是把问题推迟到第一笔请求。

启动优化还要考虑失败发现。关键配置和依赖若被过度懒加载，应用可能先进入就绪，随后在真实流量下才暴露缺失。

## 测试启动阶段而不是只测 Controller

完整 `@SpringBootTest` 可以证明主要配置能形成 Context，但还应针对不同阶段使用更窄测试：配置属性用 ApplicationContextRunner，自动配置用条件矩阵，Web 服务器用随机端口测试，Runner 与事件用显式监听记录顺序。

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OrderApplicationStartupTest {

    @LocalServerPort
    int port;

    @Test
    void applicationStartsAndServesHealth() {
        var client = RestClient.create("http://localhost:" + port);
        var status = client.get()
                .uri("/actuator/health")
                .retrieve()
                .toEntity(String.class)
                .getStatusCode();
        assertThat(status.is2xxSuccessful()).isTrue();
    }
}
```

随机端口避免与本地进程冲突，也能证明服务器真正监听并处理请求。但 health 成功不能替代订单业务测试，应根据测试目标分别验证启动、协议和业务。

## 启动失败后的资源清理

Context 刷新中途失败时，已经创建的单例与资源需要销毁。自定义线程池、SDK Client 或临时文件若没有接入 Bean 生命周期，可能在启动失败后继续残留线程或句柄，影响重试和测试进程退出。

基础设施对象应通过 Bean 销毁回调、`AutoCloseable` 适配或明确的 destroyMethod 释放。不要在静态初始化块中启动无法关闭的线程，也不要在构造器中注册全局钩子后忽略失败路径。

## 按阶段阅读异常

配置导入异常通常发生在 Environment 阶段；Context 类型错误与 classpath 或显式 WebApplicationType 有关；BeanDefinition 解析失败多指向配置类和条件；BeanCreationException 要继续追踪最底层构造、注入和初始化异常；WebServerException 则检查端口、证书、Factory 和 Servlet 注册。

Boot 的 FailureAnalyzer 可以把常见底层异常改写成易读描述，但真正的定位仍要结合阶段和第一处有效 `Caused by`。

## 版本差异与稳定边界

Boot 4.1 的主线基于 Framework 7.0，Boot 3.5 基于 Framework 6.2。两条线的总体启动阶段一致，但模块拆分、包名、自动配置类和托管依赖可能不同。源码断点应以项目实际版本为准，不把内部方法签名当成公共 API。

稳定理解应落在责任上：先准备 Environment，再创建并刷新合适的 Context，Web 应用在刷新中建立服务器，Runner 完成后发布就绪事件。即使内部实现调整，这条阶段边界仍能用于定位大多数启动故障。

## 继续阅读

- [Config Data、配置覆盖与类型安全绑定](./boot-config-data.md)：深入 Environment 输入。
- [Spring Boot 自动配置](./boot-autoconfiguration.md)：深入配置解析期间的候选和条件。
- [一个请求从启动到响应的完整生命线](./runtime-model.md)：把启动对象图连接到一次真实 HTTP 请求。
- [Spring Boot 配置与生产运行](./boot-production.md)：把就绪、健康与发布过程连接起来。
