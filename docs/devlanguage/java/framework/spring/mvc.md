# Spring MVC

Spring MVC 负责把 HTTP 世界和 Java 方法连接起来。客户端看到的是 URL、Method、Header、Query、Body；业务代码希望拿到的是 Java 对象、业务命令和明确的返回结果。MVC 的工作就是完成这层翻译和调度。

![Spring MVC 请求处理流程](/spring/mvc-request-flow.svg)

> 配套视频：[EP20：请求怎样找到 Controller 方法并变成响应](https://www.bilibili.com/video/BV1osKu6BEqK)。视频展示调用顺序，本文继续拆解映射、参数解析、异常处理和排错证据。

## 详细位置

- 本页说明 MVC 请求链、Controller 职责、参数绑定、校验、异常处理和排查方式。
- Controller、Service 等对象如何注入见 [IoC 容器](./ioc.md)。
- Service 方法上的事务和日志增强见 [AOP](./aop.md)。
- Boot Web 默认配置见 [Spring Boot](./springboot.md)。

## 请求链路

一次接口请求可以按这条链理解：

1. 请求先到 Servlet 容器。
2. Filter 处理更底层的通用逻辑，例如编码、安全链、链路追踪。
3. `DispatcherServlet` 接管请求，成为 MVC 的统一入口。
4. HandlerMapping 找到哪个控制器方法能处理这个请求。
5. HandlerAdapter 完成参数绑定、类型转换和校验。
6. Controller 调用 Service。
7. 返回值处理器把 Java 对象写成 JSON 或视图。
8. 如果出现异常，异常处理器把异常转换成响应。

`DispatcherServlet` 可以理解为前台调度员：它不亲自处理业务，而是找到合适窗口、准备好材料、交给对应处理人，再把处理结果按协议返回。

### `doDispatch()` 内部怎样推进

源码中的主链比“找到 Controller”多几个关键对象，它同时包含正常返回路径和异常解析分支：

![DispatcherServlet 内部分派流程](/spring/mvc-dispatch-internals.svg)

HandlerMapping 负责“找谁”，HandlerAdapter 负责“怎么调用”，ArgumentResolver 负责“参数从哪里来”，ReturnValueHandler 负责“返回值怎么写出去”。把这四个职责分开后，自定义参数解析、响应体转换和异常处理才能各自扩展，而不必修改 DispatcherServlet。

### 请求不是直接“反射调用 Controller”

应用启动时，`RequestMappingHandlerMapping` 已经扫描 Controller Bean，把类级和方法级映射条件解析为 `RequestMappingInfo`，并与 `HandlerMethod` 建立注册关系。这里不仅有路径，还包含 HTTP Method、可消费和可产生的媒体类型、Header 与参数条件。请求到来后，映射器用这些条件查找最佳匹配；所以同一路径因 Method 或 Content-Type 不同，可以得到 404、405 或 415 等不同结果。

找到的 `HandlerMethod` 只是“哪个 Bean 的哪个方法”的描述，不能直接处理 Servlet 请求。`RequestMappingHandlerAdapter` 为它准备 `ServletInvocableHandlerMethod`，逐个参数询问已注册的 `HandlerMethodArgumentResolver`。`@PathVariable` 从 URI 模板变量取值，`@RequestParam` 从参数表取值，`@RequestBody` 则把输入流交给合适的 `HttpMessageConverter`。JSON 反序列化、类型转换和 Bean Validation 因而是连续但不同的步骤：JSON 语法错误发生在消息读取阶段，字符串转数字失败发生在类型转换阶段，`@NotBlank` 失败发生在校验阶段。

Controller 返回对象后也不是简单调用 `toString()`。返回值处理器先根据返回类型和注解决定是否写响应体，再做内容协商，从客户端 `Accept`、控制器 `produces` 和可用转换器中选择媒体类型。最终 Jackson 转换器把对象写入响应流。方法已经成功返回但序列化失败，会表现为响应阶段异常；这正是“断点进了 Controller，客户端仍收到 500”的典型原因。

### 用创建订单追踪一次真实转换

客户端发送 `POST /orders`、`Content-Type: application/json`。Filter 链先建立请求 ID 和安全上下文，DispatcherServlet 再取得对应 HandlerExecutionChain。JSON 转换器把字节流读成 `CreateOrderRequest`，校验器只检查数量、地址等输入约束。Controller 将协议对象转换成 `CreateOrderCommand`，调用由 IoC 注入的 Service 代理；事务和业务规则在 Service 层执行。返回的 `Order` 被转换为稳定的 `OrderResponse`，最后由消息转换器写成 JSON。

这里每次转换都有目的。Request 隔离外部协议，Command 表达业务意图，领域对象维护业务状态，Response 控制对外字段。若 Controller 直接接收并返回 JPA Entity，HTTP 字段、持久化映射、懒加载关系和业务状态就被绑在同一个类型上；一次数据库模型调整可能改变接口，一次 JSON 序列化又可能意外触发查询。MVC 分层不是为了增加类数量，而是隔离变化方向。

### 异常解析也属于分派链

Controller、参数解析器或返回值处理器抛出异常后，`DispatcherServlet` 会依次询问 `HandlerExceptionResolver`。`ExceptionHandlerExceptionResolver` 处理 `@ExceptionHandler` 和 `@ControllerAdvice`，其他解析器可处理状态码注解或默认 MVC 异常。某个解析器返回 ModelAndView 或写入响应，表示异常已经转换；没有解析器接住，异常才继续交给 Servlet 容器和 Boot 的错误处理。

因此，统一异常处理不是包住 Controller 的一个 `try/catch`。它是分派流程中的策略链，既能处理业务方法异常，也能处理部分绑定和转换异常。若响应头或响应体已经提交，后续异常处理往往无法再替换完整响应，这也是流式下载、手工写响应时必须更谨慎的原因。

## 分层职责

| 层级 | 负责 | 不负责 |
| --- | --- | --- |
| Controller | HTTP 协议适配、参数校验、响应组织 | 复杂业务决策、事务细节、数据库访问 |
| Request / Response | 接口入参和出参模型 | 持久化细节 |
| Service | 业务编排、事务边界 | HTTP Header、URL、状态码细节 |
| Repository / Client | 数据库、缓存、外部接口访问 | 业务流程编排 |
| Advice / Interceptor | 通用异常、上下文、拦截逻辑 | 核心业务分支 |

Controller 像海关窗口，负责检查表单、核对格式、把材料转交给业务部门。它不应该在窗口现场决定库存、支付、审批、结算等复杂规则。

## 请求映射

请求映射回答三个问题：

- 这个请求的路径是什么。
- 这个请求使用什么 HTTP Method。
- 这个请求需要什么附加条件，例如参数、Header、内容类型。

常见匹配关系：

| 请求数据 | MVC 注解 | 适合场景 |
| --- | --- | --- |
| 路径片段 | `@PathVariable` | `/orders/1001` 中的 `1001` |
| 查询参数 | `@RequestParam` | 分页、筛选、搜索关键词 |
| 请求体 JSON | `@RequestBody` | 创建、修改、复杂查询条件 |
| 请求头 | `@RequestHeader` | 请求 ID、租户、客户端版本 |
| Cookie | `@CookieValue` | 会话标识、灰度标记 |

不清楚用哪个时，可以按数据位置判断：在路径里就是 PathVariable，在问号后就是 RequestParam，在 JSON Body 里就是 RequestBody。

## 参数绑定与校验

参数绑定是把字符串、JSON、文件等 HTTP 输入转换成 Java 类型。校验是在进入业务前检查输入是否满足基础格式。

适合放在校验层的规则：

- 字段不能为空。
- 数字范围是否合法。
- 字符串长度是否合法。
- 集合是否为空。
- 邮箱、手机号等基础格式。

不适合放在校验层的规则：

- 库存是否足够。
- 用户是否可以取消订单。
- 支付状态是否允许退款。
- 优惠券是否满足业务条件。

后一类属于业务规则，应放在 Service 或领域对象里。校验层负责“材料格式是否齐”，业务层负责“这件事能不能办”。

一个保持边界清晰的 Controller 可以这样写：

```java
@RestController
@RequestMapping("/orders")
public class OrderController {
    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> create(
            @Valid @RequestBody CreateOrderRequest request) {
        Order order = orderService.create(request.toCommand());
        return ResponseEntity.status(201).body(OrderResponse.from(order));
    }
}
```

这里的 `@RequestBody` 触发消息转换器把 JSON 读成对象，`@Valid` 执行字段约束，Controller 再把协议对象转换成业务命令。库存检查和订单状态流转仍由 Service 负责。

## 统一异常

统一异常处理的目标是让接口错误稳定、可读、可排查。

一个合理的错误响应通常包含：

- 业务错误码。
- 面向调用方的错误信息。
- 请求追踪 ID。
- 必要时包含字段级校验错误。

不应返回给外部的信息：

- Java 堆栈。
- 数据库 SQL 细节。
- 内部文件路径。
- 密钥、Token、连接串。

HTTP 状态码和业务错误码不冲突。参数错误可以是 400，同时业务错误码是 `PARAM_INVALID`；系统异常可以是 500，同时业务错误码是 `SYSTEM_ERROR`。

```java
@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(OrderNotFoundException.class)
    ResponseEntity<ApiError> handleNotFound(
            OrderNotFoundException exception,
            HttpServletRequest request) {
        ApiError error = new ApiError(
                "ORDER_NOT_FOUND",
                exception.getMessage(),
                request.getHeader("X-Request-Id"));
        return ResponseEntity.status(404).body(error);
    }
}
```

异常处理器负责协议转换，不应在这里补做库存回滚、订单状态修改等业务补偿。业务一致性由事务或明确的补偿流程负责。

## 拦截器、过滤器、AOP 的区别

| 机制 | 所在位置 | 更适合做什么 |
| --- | --- | --- |
| Filter | Servlet 容器层，MVC 之前 | 安全链、编码、跨域、链路 ID |
| Interceptor | MVC 层，知道 Handler 信息 | 登录态、租户上下文、接口审计 |
| AOP | Bean 方法调用层 | 事务、方法级日志、业务注解增强 |

选择时看你需要的信息在哪一层。如果需要原始请求和响应，用 Filter；如果需要知道目标控制器方法，用 Interceptor；如果关注 Service 方法调用，用 AOP。

## CORS

CORS 是浏览器安全策略下的跨域访问控制，不是后端接口本身的业务权限。排查跨域时要同时看四处：

1. 浏览器控制台报错。
2. 预检请求 `OPTIONS` 是否到达服务。
3. 网关或 Nginx 是否已经处理 CORS。
4. Spring MVC 或 Spring Security 是否重复或覆盖了响应头。

生产环境应明确允许的 Origin、Method 和 Header。长期使用任意 Origin 会扩大风险，尤其是携带 Cookie 或认证信息时。

## 文件上传

文件上传比普通 JSON 请求更容易出问题，原因是它涉及请求大小、临时文件、文件名、内容类型、存储路径和后续处理。

基本判断：

- 大小限制应在网关和应用两层都配置。
- 文件名不要直接使用客户端传入值作为存储名。
- 扩展名不能作为唯一校验依据。
- 上传接收和后续导入处理最好解耦，避免长时间占用请求线程。

## 静态资源

Spring Boot 可以直接提供 classpath 下的静态资源，也可以通过 MVC 配置映射外部目录。用户上传文件如果要提供访问，需要额外考虑：

- 是否需要鉴权。
- 是否可能目录穿越。
- 是否应该使用对象存储或 CDN。
- 缓存策略如何设置。
- 删除或替换文件后访问结果是否一致。

静态资源不是“能访问就结束”，生产环境更关注安全边界和缓存行为。

## 测试选择

| 测试目标 | 推荐方式 | 原因 |
| --- | --- | --- |
| 只验证 Controller 映射、参数、响应 | `@WebMvcTest` | 启动范围小，定位 Web 层问题快 |
| 验证完整接口链路 | `@SpringBootTest` + 随机端口 | 能覆盖真实容器和完整配置 |
| 只验证业务规则 | 普通单元测试 | 不需要启动 MVC |
| 验证异常响应格式 | Web 层测试 | 能确认状态码和错误结构 |

不要把所有测试都写成完整上下文测试。MVC 层问题和业务规则问题应分开验证。

## 排查路径

### 404

优先检查：

1. URL 和服务上下文路径是否正确。
2. HTTP Method 是否匹配。
3. Controller 是否被扫描成 Bean。
4. 类级路径和方法级路径组合后是否符合预期。
5. 网关或反向代理是否改写路径。

### 400

常见原因：

- JSON 格式错误。
- `Content-Type` 不匹配。
- 参数类型转换失败。
- 校验规则不通过。
- 必填参数缺失。

### 415

说明服务端不支持当前请求体类型。JSON 请求通常应使用 `application/json`，文件上传通常应使用 `multipart/form-data`。

### 500

优先看服务端日志中的第一处业务异常。全局异常处理应记录原始异常，响应中只保留调用方需要知道的信息。

### 返回对象存在，但 JSON 写出失败

这类问题发生在 Controller 方法已经返回之后，常见原因是返回类型无法序列化、懒加载对象访问失败、响应已经提交后再次写入，或 HttpMessageConverter 不支持当前媒体类型。排查时应从 ReturnValueHandler 和消息转换器进入，而不是重复检查路由。

## 源码与运行验证

可以用同一个接口同时验证映射、参数、业务调用和响应转换：

1. 访问 `/actuator/mappings` 或查看启动日志，确认 Controller 方法已注册。
2. 在 `DispatcherServlet.doDispatch()` 观察取得的 HandlerExecutionChain。
3. 在 `RequestMappingHandlerAdapter.invokeHandlerMethod()` 查看参数解析器和返回值处理器集合。
4. 使用 MockMvc 验证 201、400、404 和 500 的响应结构。
5. 再用随机端口集成测试发出真实 HTTP 请求，确认 Filter、序列化和服务器配置也被覆盖。

Web 层测试通过只能证明 MVC 边界符合预期；数据库事务、外部接口和真实服务器行为仍需要对应层级的集成测试。

## 总结

Spring MVC 是 HTTP 协议和业务方法之间的调度与翻译层。读 MVC 代码时先看请求链，再看 Controller 是否只做协议适配，最后检查校验、异常、拦截器和返回值处理是否集中。排错时按“路由 -> 参数 -> 校验 -> 拦截链 -> 业务异常 -> 响应转换”的顺序推进。
