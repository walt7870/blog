# 一个 Spring 请求的完整运行过程

学习 Spring 最容易走偏的方式，是先背 `@Component`、`@Autowired`、`@Transactional` 和 `@RequestMapping`。这些注解分别属于不同阶段；如果不知道应用何时读取它们、谁根据它们工作，知识会停留在配置记忆。

本页用“创建订单”贯穿应用启动和请求处理。目标不是记住所有类名，而是建立一张可以用于阅读源码和定位故障的运行地图。

![Spring 启动链与请求链](/spring/spring-runtime-chains.svg)

## 第一阶段：磁盘上的类变成容器定义

应用启动前，`OrderController`、`OrderService` 和 `OrderRepository` 只是 classpath 中的类。`SpringApplication` 准备 Environment、创建 ApplicationContext，并把主配置类登记为初始 BeanDefinition。进入 `refresh()` 后，配置类处理器执行组件扫描，订单相关组件才陆续成为 BeanDefinition。

BeanDefinition 是创建对象的说明书。它保存 Bean 类型、作用域、构造方式、依赖关系和初始化信息，但不是业务对象本身。此时容器可以回答“将来有哪些组件”，还不能执行 `orderService.create()`。

自动配置也在这一阶段加入定义。Web Starter 让 MVC、JSON 和内嵌服务器相关类进入 classpath，Boot 再根据条件导入 MVC 与服务器配置。用户组件和自动配置最终都进入同一个 BeanDefinitionRegistry，随后接受同一套 Bean 创建流程。

## 第二阶段：定义形成可调用对象图

容器创建 `OrderController` 时发现构造器需要 `OrderService`，于是查找匹配的定义。创建 `OrderService` 又需要 Repository、支付客户端和配置对象，BeanFactory 会递归创建或取得这些依赖。对象不是按文件顺序创建，而是沿依赖图展开。

假设 Service 的公开方法带有 `@Transactional`。原始 Service 完成实例化、注入和初始化后，自动代理创建器发现事务 Advisor 能匹配它，于是返回代理对象。Controller 最终保存的是 Service 代理，代理内部再指向目标 Service。到这里，容器形成的对象图大致是：

```java
OrderController
    └── OrderServiceProxy
            └── OrderServiceTarget
                    ├── OrderRepository
                    ├── PaymentClient
                    └── OrderProperties
```

这段代码块表达的是对象层级，不是时间流程。时间流程由 [Bean 创建源码图](./ioc.md#从-beandefinition-到可用对象) 展示。

## 第三阶段：Web 服务器开放请求入口

Servlet Web Context 在刷新过程中取得 `ServletWebServerFactory`，创建内嵌服务器，并把 DispatcherServlet、Filter 和 Listener 注册到 ServletContext。MVC 启动时还会扫描 Controller，建立“请求条件到 HandlerMethod”的映射表。

端口开始监听说明网络入口已经打开，但不必然表示实例适合接业务流量。关键 Runner 尚未结束、缓存尚未准备好或外部依赖不可用时，就绪检查仍应拒绝流量。生产系统需要区分“进程活着”“端口已开”“业务已就绪”三个状态。

## 第四阶段：一条请求沿对象图执行

客户端发送：

```http
POST /orders
Content-Type: application/json

{"skuId": 1001, "quantity": 2}
```

请求先经过 Servlet Filter，随后进入 DispatcherServlet。HandlerMapping 根据路径、Method 和媒体类型找到 Controller 方法；HandlerAdapter 使用参数解析器与消息转换器把 JSON 读成 `CreateOrderRequest`，再执行 Bean Validation。

Controller 将协议对象转换为业务 Command，调用构造器中注入的 Service。由于这个引用是代理，调用先进入 TransactionInterceptor。事务管理器取得数据库连接、关闭自动提交并把资源绑定到当前线程，目标 Service 随后执行订单规则并调用 Repository。同一线程内的数据访问复用事务资源。

业务方法正常结束后，事务代理提交并释放资源。Controller 把业务结果转换为 Response，返回值处理器进行内容协商，Jackson 最终写出 JSON。至此，一次请求结束；容器中的单例对象图不会销毁，下一条请求继续复用它。

## 出错时先判断处于哪个阶段

启动日志中连 Context 都没有创建，优先检查配置位置、类加载和应用类型；Context 已开始刷新但出现 BeanCreationException，沿最底层依赖和初始化异常查对象图；端口未监听，检查 WebServerFactory、端口和服务器配置。

请求到达后出现 404，说明问题通常位于路径改写、HandlerMapping 或 Controller 注册；400 多发生在消息读取、类型转换和校验；事务未生效要确认 Service 是否为代理以及调用是否从代理外部进入；Controller 已返回但客户端收到 500，还要继续查返回值处理和 JSON 序列化。

这套判断比按注解搜索更稳定，因为它先确定失败阶段，再进入阶段内的具体组件。

## 继续阅读

- 对象定义、依赖解析和生命周期：[IoC 容器](./ioc.md)
- 代理形成、事务资源和回滚边界：[AOP 与事务](./aop.md)
- 请求映射、参数解析和响应写出：[Spring MVC](./mvc.md)
- 应用从 `run()` 到就绪：[Spring Boot 启动机制](./boot-startup.md)
- Starter 为什么能产生默认 Bean：[Spring Boot 自动配置](./boot-autoconfiguration.md)
- 配置覆盖、Actuator 和生产运行：[配置与生产运行](./boot-production.md)
