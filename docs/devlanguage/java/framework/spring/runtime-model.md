# 一个 Spring 请求从启动到响应的完整生命线

浏览器调用 `POST /orders` 时，真正工作的不只是 Controller。请求到来之前，Spring 已经完成配置读取、容器创建、组件发现、依赖装配、代理生成、路由注册和端口监听；请求到来之后，MVC、事务代理、业务对象、数据访问和 JSON 转换才沿着已经形成的对象图执行。

本篇用一个最小订单服务贯穿这两个时间轴。读完后，应能区分“类被发现、Bean 被创建、代理被调用”三个时刻，并能根据异常发生的位置判断应该进入 Boot、IoC、AOP 还是 MVC 排查。

![Spring 启动链与请求链](/spring/spring-runtime-chains.svg)

> 配套视频：先看 [EP01：工程怎样变成可以响应请求的服务](https://www.bilibili.com/video/BV1A5Ku6jE6R) 建立全局地图；进入请求阶段时再看 [EP20：请求怎样找到 Controller 并变成响应](https://www.bilibili.com/video/BV1osKu6BEqK)。

## 先准备一个可以追踪的订单接口

项目只需要 Web、Validation、JDBC 和 H2。Controller 负责协议转换，Service 定义事务边界，Repository 执行数据库写入：

```java
@RestController
@RequestMapping("/orders")
class OrderController {
    private final OrderService orderService;

    OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    ResponseEntity<OrderResponse> create(
            @Valid @RequestBody CreateOrderRequest request) {
        Order order = orderService.create(request.toCommand());
        return ResponseEntity.status(201).body(OrderResponse.from(order));
    }
}

@Service
class OrderService {
    private final OrderRepository repository;

    OrderService(OrderRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public Order create(CreateOrderCommand command) {
        Order order = Order.create(command.skuId(), command.quantity());
        repository.save(order);
        return order;
    }
}
```

这段代码看不到 DataSource、事务拦截器、JSON 转换器和 Tomcat，但运行时缺少其中任何一个，请求都不能完成。它们一部分来自用户代码，一部分来自自动配置，最后都进入同一个 ApplicationContext。

## 时间轴一：启动阶段形成运行系统

启动期的完整源码编排还可以配合 [EP02：`run()` 怎样编排环境、容器、Runner 和就绪事件](https://www.bilibili.com/video/BV1AGKu6mEXo) 逐步观察。

### `main()` 首先准备配置环境

`SpringApplication.run()` 先判断应用类型，再创建 Environment。命令行参数、系统属性、环境变量、Config Data 和默认属性被组织为有序的 PropertySource。日志级别、Profile、服务器端口等值会在普通业务 Bean 创建前使用，因此配置环境必须先于 Context 刷新完成。

在 `application.yml` 写 `server.port: 8080`，同时用 `--server.port=9090` 启动，最终监听 9090。这个现象证明运行时读取的是 Environment 的最终结果，而不是某一份文件。

### Context 创建时还没有完整业务对象

Servlet 应用通常创建 Servlet Web ApplicationContext。此时 Context 只是容器外壳，主配置类随后被登记为初始 BeanDefinition。BeanDefinition 描述对象类型、作用域和创建方式，但不是已经构造好的 Bean。

进入 `refresh()` 后，ConfigurationClassPostProcessor 才处理组件扫描、Import、Bean 方法和自动配置。OrderController、OrderService、Repository，以及 MVC、DataSource、事务管理器和 WebServerFactory 的定义在这一阶段汇入 BeanDefinitionRegistry。

可以在 `SpringApplication.load()` 后观察定义数量，再在 `invokeBeanFactoryPostProcessors()` 后比较。后一个时刻会出现更多定义，但许多普通单例仍未创建。这能直接证明“发现定义”和“创建对象”是两步。

### BeanFactory 沿依赖图创建对象

容器准备创建 OrderController 时，先解析构造器中的 OrderService。若 Service 尚不存在，就递归创建 Service；Service 又触发 Repository 创建。创建顺序来自依赖图，而不是源码文件顺序。

OrderService 完成构造、依赖注入和初始化后，自动代理创建器检查到事务 Advisor 匹配 `create()`，于是返回代理对象。Controller 保存的是 OrderService 代理，代理持有目标 Service，目标 Service 再持有 Repository。页面开头流程图中的“Bean 与代理”节点表达的就是这次对象替换。打印 `orderService.getClass()` 并使用 `AopUtils.isAopProxy()`，可以证明 Controller 拿到的对象是否已经被包装。

### MVC 在启动期登记请求映射

RequestMappingHandlerMapping 会扫描 Controller Bean，把类级和方法级条件合并为 RequestMappingInfo，并与 HandlerMethod 建立映射。路径、HTTP Method、`consumes`、`produces`、Header 和参数条件都属于匹配依据。

所以请求到来时，Spring 不会重新扫描所有 Controller。`/actuator/mappings` 中能看到 `POST /orders`，说明路由已经在启动期登记。

### WebServer 开放网络入口

Web Context 从容器取得 ServletWebServerFactory，创建服务器并注册 DispatcherServlet、Filter 和 Listener。端口绑定成功表示网络入口已打开；Runner 完成并发布 ApplicationReadyEvent 后，应用才完成 Boot 启动链。

端口已监听、Context 已刷新、实例可以接流量并不是完全相同的状态。生产环境应使用 readiness 表达业务就绪，而不是只检查 TCP 端口。

## 时间轴二：一次请求沿对象图执行

客户端发送：

```http
POST /orders
Content-Type: application/json

{"skuId":1001,"quantity":2}
```

请求先经过 Filter 链，再进入 DispatcherServlet。HandlerMapping 根据请求条件找到 HandlerExecutionChain；HandlerAdapter 负责调用 HandlerMethod。`@RequestBody` 对应的参数解析器选择 Jackson 消息转换器，把字节流反序列化成 CreateOrderRequest，随后 Bean Validation 检查字段约束。

Controller 把协议对象转换成业务 Command，并调用注入的 OrderService。调用先到代理，TransactionInterceptor 读取事务属性并选择事务管理器。JDBC 事务管理器取得连接、关闭自动提交，并把连接资源绑定到当前线程。

目标 Service 随后执行。Repository 获取连接时会复用当前线程绑定的事务资源，因此订单写入和 Service 方法共享同一提交结果。方法正常返回，事务拦截器提交并释放连接；符合回滚规则的异常向外传播时则回滚。

Controller 得到 Order 后转换为 OrderResponse。返回值处理器根据注解和返回类型确定写响应体，内容协商选择 `application/json`，Jackson 最终把对象写入响应流。HTTP 201 返回后，本次请求结束，但单例对象图继续服务下一次请求。

## 三个故障实验

### 实验一：删除 Service 注解

删除 `@Service` 后，OrderService 不再产生 BeanDefinition。创建 Controller 时构造器依赖无法解析，应用在 Context 刷新阶段失败，端口不会正常开放。这是 IoC 对象图形成失败，不是 MVC 404。

### 实验二：同类内部调用事务方法

如果同一个 Service 用 `this.create()` 调用带事务的方法，调用绕过代理，TransactionInterceptor 不会执行。方法上仍有注解，但数据库日志和断点都证明事务入口没有经过。这是代理调用边界问题。

### 实验三：返回无法序列化的对象

Controller 方法已经执行并返回，但 Jackson 写响应时失败，客户端仍收到 500。此时重复检查路由没有意义，应从 ReturnValueHandler 和 HttpMessageConverter 排查。它说明“进入 Controller”并不等于“响应已经成功”。

## 用证据跑通整条链

按下面的顺序设置观察点：

1. `SpringApplication.run()`：确认启动入口和参数。
2. `AbstractApplicationContext.refresh()`：确认 Context 刷新边界。
3. `ConfigurationClassPostProcessor`：观察定义怎样展开。
4. `AbstractAutowireCapableBeanFactory.doCreateBean()`：观察 Controller、Service 创建。
5. `AbstractAutoProxyCreator.wrapIfNecessary()`：确认事务代理形成。
6. `DispatcherServlet.doDispatch()`：取得真实 HandlerExecutionChain。
7. `TransactionInterceptor.invoke()`：确认调用进入事务拦截器。
8. 数据库日志与 HTTP 响应：确认提交结果和最终 JSON。

再结合 BeanDefinition 数量、Bean 实际类型、`/actuator/mappings`、监听端口和真实请求，就能形成从源码到运行结果的证据链。

## 排错时先确定失败阶段

Environment 尚未完成时失败，检查配置位置、格式和导入；Context 刷新期间失败，检查 BeanDefinition、依赖解析和初始化；端口没有监听，检查 WebServerFactory 和服务器配置；404 进入映射层；400 进入参数读取、转换和校验；事务异常进入代理与资源边界；Controller 返回后的 500 继续检查响应转换。

Spring 的模块不是一组平行概念。Boot 负责把系统启动起来，IoC 形成对象图，AOP改变方法入口，MVC把 HTTP 转换为方法调用。先确定当前处于哪个时间轴和阶段，再进入对应源码，排查范围会迅速缩小。

## 继续深入

- [IoC 容器](./ioc.md)：定义、依赖解析和 Bean 生命周期。
- [AOP 与事务](./aop.md)：代理、事务资源和回滚规则。
- [Spring MVC](./mvc.md)：映射、参数解析和响应写出。
- [Spring Boot 启动机制](./boot-startup.md)：从 Environment 到应用就绪。
