# Spring Boot 启动机制

Spring Boot 启动不是“扫描注解然后启动 Tomcat”这么简单。一次完整启动需要先建立配置环境，再选择容器类型、加载初始定义、刷新对象图、创建服务器，最后执行 Runner 并发布就绪事件。不同阶段使用的扩展机制不同，故障入口也不同。

![Spring Boot 启动源码主链](/spring/boot-startup-source-chain.svg)

## `SpringApplication` 构造阶段

`SpringApplication.run(OrderApplication.class, args)` 会创建 SpringApplication，并保存主配置类。它根据 classpath 判断应用类型：MVC 条件满足时选择 Servlet Context，只有响应式 Web 条件满足且 MVC 不存在时才选择 Reactive，否则使用普通非 Web Context。

构造阶段还会发现 ApplicationContextInitializer 和 ApplicationListener。此时普通 Bean 尚不存在，这些扩展用于修改即将创建的 Context 或观察早期启动事件，不能按业务 Bean 的使用方式理解。

## Environment 准备阶段

`run()` 创建 Environment，把默认属性、Config Data、环境变量、系统属性和命令行参数组织成有顺序的 PropertySource。日志配置、Profile、部分 `spring.main.*` 设置会在 Context 刷新前被读取，所以 Environment 必须提前完成。

Config Data 会解析包内与外部 `application` 文件、Profile 文档、`spring.config.import` 和可选位置。属性覆盖不是简单的“prod 文件高于默认文件”，还受来源类型、文件位置和文档顺序影响。排错时应确认最终 PropertySource，而不是只打开某个 YAML 文件。

## Context 创建与初始加载

ApplicationContextFactory 根据应用类型创建容器。此刻 Context 主要是一个尚未刷新的外壳。`load()` 随后把 primary source 登记为初始 BeanDefinition；组件扫描、`@Bean` 和自动配置仍要等待配置类处理器在 `refresh()` 中展开。

区分“Context 已创建”和“Context 已刷新”很重要。前者只能证明容器对象存在，后者才意味着普通单例、代理、生命周期组件和 Web 运行环境已经基本形成。

## `refresh()` 推进容器状态

`refresh()` 先准备 BeanFactory，再执行 BeanFactoryPostProcessor。配置类处理器在这里扫描组件、处理 Import 并写入更多 BeanDefinition。随后容器注册 BeanPostProcessor，创建非懒加载单例；依赖注入、配置绑定、生命周期回调和自动代理都在对象创建过程中发生。

任何关键单例创建失败都会中断刷新。Spring 会销毁已创建的单例并关闭相关资源，避免留下一个只有部分对象可用的 Context。Bean 创建细节见 [IoC 容器](./ioc.md)。

## WebServer 创建与端口监听

Servlet Web Context 在刷新过程中寻找 `ServletWebServerFactory`。自动配置通常提供 Tomcat 或 Jetty Factory，服务器自定义器把 `server.*` 配置应用到 Factory，随后创建服务器并注册 DispatcherServlet、Filter 和 Listener。

服务器对象创建、Connector 绑定端口和应用发布就绪事件是不同时间点。排查时可以同时观察启动事件、Context 状态和 `lsof -i :8080`；生产探针则应以业务是否可以安全接流量为准。

## Runner、事件与就绪

Context 刷新成功后，Boot 执行 ApplicationRunner 和 CommandLineRunner。它们仍位于启动关键路径，耗时初始化或远程调用会推迟应用就绪。Runner 完成后才发布 ApplicationReadyEvent。

必须在接流量前完成的短初始化可以放在启动链中；耗时预热应评估是否异步执行，并通过就绪状态控制流量。把不可控远程调用放入 Bean 构造器或初始化回调，会让整个 Context 被外部依赖超时拖住。

## 按阶段阅读异常

配置导入异常通常发生在 Environment 阶段；Context 类型错误与 classpath 或显式 WebApplicationType 有关；BeanDefinition 解析失败多指向配置类和条件；BeanCreationException 要继续追踪最底层构造、注入和初始化异常；WebServerException 则检查端口、证书、Factory 和 Servlet 注册。

Boot 的 FailureAnalyzer 可以把常见底层异常改写成易读描述，但真正的定位仍要结合阶段和第一处有效 `Caused by`。
