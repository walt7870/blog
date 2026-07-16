# Spring Boot

Spring Boot 不是另一个 IoC 容器，也不是一组注解的简称。它建立在 Spring Framework 之上，负责把依赖选择、启动编排、条件化默认配置、外部配置、内嵌服务器和运行观测组织成一套可交付的应用模型。

一个订单服务能够从 `main()` 走到可以接收 HTTP 请求，需要四层机制同时成立：依赖层提供 MVC、服务器和 JSON 库；启动层准备 Environment 并刷新 ApplicationContext；自动配置层根据条件登记默认 Bean；运行层负责配置、健康检查、指标和优雅停止。

![Spring Boot 启动源码主链](/spring/boot-startup-source-chain.svg)

## 从一个应用的启动理解 Boot

启动方法只有一行：

```java
@SpringBootApplication
public class OrderApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrderApplication.class, args);
    }
}
```

这行代码并不直接“启动 Tomcat”。SpringApplication 先判断应用类型，准备由多个 PropertySource 组成的 Environment，再创建对应 ApplicationContext。主配置类被登记为初始 BeanDefinition，`refresh()` 随后展开组件扫描和自动配置、创建单例、生成代理，并由 Web Context 创建内嵌服务器。

Context 刷新成功后还要执行 Runner，最后才发布 ApplicationReadyEvent。因此，“Context 对象存在”“端口开始监听”和“实例可以接流量”是三个不同状态。完整源码阶段和异常入口见 [Spring Boot 启动机制](./boot-startup.md)。

## Starter

Starter 是经过依赖管理的一组依赖坐标。Web Starter 会把 MVC、JSON 和默认内嵌服务器所需模块带入 classpath，但它不直接创建 Controller、ObjectMapper 或 WebServer。真正的对象定义来自用户配置与自动配置，最终由 BeanFactory 创建。

这一区分解决了一个常见误判：Maven 或 Gradle 已经能看到依赖，只能证明代码和资源进入运行时，不代表对应自动配置条件一定成立。

## 自动配置

`@SpringBootApplication` 包含自动配置入口。AutoConfigurationImportSelector 读取候选配置，完成排除和排序，再交给配置类解析器。条件评估根据 classpath、Environment、应用类型以及已有 BeanDefinition 决定哪些默认定义可以注册。

![Spring Boot 自动配置判断链](/spring/boot-auto-config.svg)

用户定义同类型 Bean 后，很多默认配置会在定义阶段退让，而不是先创建默认对象再覆盖。Starter、自动配置候选、BeanDefinition 和最终 Bean 分属四个阶段，排查时不能混成一句“Boot 自动创建”。完整 DataSource 案例、条件报告和自定义 Starter 边界见 [Spring Boot 自动配置](./boot-autoconfiguration.md)。

## 配置加载

Boot 的配置不是单独一份 `application.yml`，而是多个 PropertySource 合并后的 Environment。包内文件提供默认值，外部文件、环境变量、系统属性和命令行参数按顺序参与覆盖；Profile 和 Config Data Import 还会改变文件集合。

配置问题必须检查运行实例的最终值与来源。只查看仓库中的 YAML，无法证明部署参数、环境变量或外部文件没有覆盖它。成组业务配置应使用 `@ConfigurationProperties` 完成类型转换和启动校验。

配置覆盖、绑定、Actuator 安全和探针设计见 [配置与生产运行](./boot-production.md)。

## Web 运行模型

Servlet 应用使用专门的 WebServerApplicationContext。它在刷新过程中查找 ServletWebServerFactory，应用服务器配置和 Customizer，创建服务器，并把 DispatcherServlet、Filter 与 Listener 注册到 ServletContext。

请求真正到达后，处理工作转交给 Spring MVC；Boot 不替代 HandlerMapping、参数解析器、消息转换器或异常解析器。完整请求路径见 [一个 Spring 请求的完整运行过程](./runtime-model.md) 和 [Spring MVC](./mvc.md)。

## 生产运行边界

能启动不等于能稳定运行。外部调用需要连接与读取超时，线程池需要容量和拒绝策略，数据库需要连接池与事务边界，日志和指标要能关联请求，发布过程要区分摘流量、在途请求和资源关闭。

存活检查回答进程是否需要重启，就绪检查回答实例能否接流量。把数据库短暂故障直接作为存活失败，可能导致所有实例反复重启。Actuator 端点也应按问题和权限开放，而不是一次性暴露全部内部信息。

这些工程边界在 [配置与生产运行](./boot-production.md) 中按配置、探针、观测、外部依赖和发布流程展开。

## 常见问题

启动失败先判断发生在 Environment、Context 创建、配置解析、Bean 创建还是 WebServer 阶段；依赖存在但能力未生效，查看自动配置条件报告；配置值异常，查看 Environment 最终来源；端口已开但请求失败，继续进入 MVC 映射、代理和业务调用链。

| 现象 | 进入页面 |
| --- | --- |
| 启动停在某个阶段、端口未监听 | [Boot 启动机制](./boot-startup.md) |
| Starter 已加入但 Bean 未出现 | [Boot 自动配置](./boot-autoconfiguration.md) |
| 配置被覆盖、健康检查或线上容量问题 | [配置与生产运行](./boot-production.md) |
| Bean 创建、注入、生命周期异常 | [IoC 容器](./ioc.md) |
| 接口 404、400 或 JSON 写出失败 | [Spring MVC](./mvc.md) |
| 事务没有开启或回滚结果异常 | [AOP 与事务](./aop.md) |

## 视频讲解

[Spring Boot 源码全流程视频系列](./video-series.md) 共 20 集，以 Spring Boot 4.1.0、Spring Framework 7.0.8、Java 25 为讲解坐标，从 `run()` 依次进入 Environment、ApplicationContext、BeanDefinition、`refresh()`、自动配置、Bean 生命周期、事务、WebServer 和 DispatcherServlet。

第一次观看先建立 [完整运行模型](./runtime-model.md)，再按 [分集目录](./video-series.md#分集目录) 进入源码方法，能避免把类名记成彼此无关的调用清单。
