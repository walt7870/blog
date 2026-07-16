# Spring 常用注解完整指南

Spring 注解不是一组互相独立的快捷语法。每个注解都是元数据，必须由特定框架组件在特定阶段读取，才会改变容器或请求的运行行为。`@Service` 被组件扫描读取，形成 BeanDefinition；`@Autowired` 被 BeanPostProcessor 读取，参与依赖解析；`@Transactional` 被事务基础设施读取，形成代理和拦截器；`@RequestMapping` 被 MVC 在启动期读取，形成请求映射。

理解一个注解时，应连续回答四个问题：谁读取它、什么时候读取、它改变了什么对象、什么情况下看起来存在但实际不生效。

## 注解进入运行系统的四个阶段

| 阶段 | 典型注解 | 处理结果 |
| --- | --- | --- |
| 配置解析 | `@Configuration`、`@ComponentScan`、`@Import`、`@Bean` | 增加或修改 BeanDefinition |
| Bean 创建 | `@Autowired`、`@Value`、`@PostConstruct`、`@Async` | 注入依赖、执行回调或返回代理 |
| 基础设施注册 | `@EnableTransactionManagement`、`@EnableAsync`、`@EnableScheduling` | 注册处理注解所需的后处理器和 Advisor |
| 运行期调用 | `@Transactional`、`@Cacheable`、`@RequestMapping` | 经过代理、路由或框架策略执行 |

注解写在源码上，只能证明元数据存在。目标类不是 Bean、基础设施没有启用、调用绕过代理或映射条件不匹配时，运行行为仍可能不存在。

组件扫描、依赖注入、代理和请求映射分别发生在不同阶段。对应视频可按需查看：[EP11：配置类与组件扫描](https://www.bilibili.com/video/BV19hKu6eEAr)、[EP15：依赖候选选择](https://www.bilibili.com/video/BV1oWKu6uEyp)、[EP17：Advisor 与代理生成](https://www.bilibili.com/video/BV1EHKu6rE39)、[EP20：请求映射与方法调用](https://www.bilibili.com/video/BV1osKu6BEqK)。

## 组件注册注解

### `@Component`

通用组件标记。组件扫描发现类后，将其转换为 BeanDefinition。适合没有明确分层语义的转换器、策略、监听器等。

### `@Service`

`@Component` 的业务语义化组合注解。它本身不会自动开启事务，也不会强制类只能编排业务；价值在于表达分层意图，并方便切点、扫描或架构测试按 Service 层识别组件。

### `@Repository`

用于数据访问组件。除分层语义外，Spring 的持久化异常转换基础设施可以为 Repository 代理统一转换特定技术的异常。只有类成为 Bean 且异常转换处理器存在时，这项行为才成立。

### `@Controller` 与 `@RestController`

`@Controller` 让类进入容器并成为 MVC Handler 候选。`@RestController` 组合了 `@Controller` 与 `@ResponseBody`，方法返回值默认写入响应体，而不是解释为视图名称。

### `@Named` 与 `@ManagedBean`

Spring 可以识别部分 Jakarta 标准组件注解，但 Spring 项目通常优先使用带分层语义的 stereotype。跨容器代码需要降低 Spring 依赖时，再考虑标准注解。

## Java 配置注解

### `@Configuration`

声明配置类。配置类解析器会处理其中的 `@Bean`、`@Import` 和组件扫描。完整配置模式能够拦截同一配置类内的 `@Bean` 方法调用，保证取得容器管理对象；`proxyBeanMethods=false` 则更接近普通工厂方法集合，不应依赖方法之间的直接调用取得单例。

### `@Bean`

把方法返回值登记为 Bean。适合第三方 Client、线程池、序列化器、数据源等无法在类上添加组件注解的对象。方法参数由容器按依赖规则解析：

```java
@Bean
PaymentClient paymentClient(PaymentProperties properties,
                            RestClient.Builder builder) {
    return new PaymentClient(builder.baseUrl(properties.baseUrl()).build());
}
```

`name`/`value` 指定 Bean 名，`initMethod` 和 `destroyMethod` 指定生命周期回调。返回类型应足够具体，否则按具体类型注入时可能无法成为候选。

### `@ComponentScan`

定义组件扫描范围、过滤规则和命名策略。默认从声明类所在包向下扫描。启动类放在过深包中，会导致同级业务包没有被发现；扫描根包过大又可能引入非预期配置。

### `@Import`

显式导入配置类、ImportSelector、DeferredImportSelector 或 ImportBeanDefinitionRegistrar。它是模块化配置和自动配置的重要入口，不只是“替代组件扫描”。

### `@ImportResource`

把遗留 XML Bean 定义导入 Java 配置体系。适合渐进迁移，不宜成为新代码的默认配置方式。

### `@PropertySource`

向 Environment 增加属性源。它在配置类解析阶段生效，因此来不及影响某些刷新前已经读取的 Boot 参数；Boot Config Data 场景优先使用 `application.yml`、外部配置和 `spring.config.import`。

### `@Profile`

根据激活 Profile 条件化注册配置类或 Bean。它控制定义是否存在，不适合表达运行期间频繁变化的业务开关。

### `@Scope`、`@Lazy`、`@DependsOn`

`@Scope` 改变 Bean 生命周期范围；`@Lazy` 推迟 Bean 创建或在注入点生成延迟解析代理；`@DependsOn` 表达初始化顺序依赖。它们不能替代合理的对象依赖设计，尤其不要用 `@DependsOn` 修补隐式业务时序。

## 依赖注入与候选选择

### `@Autowired`

由 AutowiredAnnotationBeanPostProcessor 处理，可用于构造器、字段、Setter 和普通方法。单构造器不需要显式标注。业务代码优先构造器注入，使必需依赖、不可变性和测试入口清晰。

候选选择先看类型，再结合泛型、限定符、Primary、优先级和名称。`required=false` 表示允许缺失，但 Optional、ObjectProvider 或可空类型通常能更明确表达可选依赖。

### `@Qualifier`

在同类型多个候选中进一步缩小范围。限定符表达的是候选语义，不应只把它理解成 Bean 名字符串。可以创建组合注解，例如 `@PaymentChannel("stripe")`，减少业务代码依赖具体实现名。

### `@Primary` 与 `@Fallback`

`@Primary` 在多个候选中声明优先选择；`@Fallback` 把候选标记为后备实现，只有非后备候选无法满足时才考虑。它们适合定义默认策略，调用方明确需要某实现时仍应使用限定符。

### `@Resource` 与 `@Inject`

`@Resource` 来自 Jakarta，常按名称语义解析；`@Inject` 类似 `@Autowired`，但没有 `required` 属性。团队应统一默认注入风格，避免同一项目混用后让候选规则难以判断。

### `@Value`

注入属性占位符或 SpEL 表达式。适合少量独立值；一组有业务含义的配置应使用 `@ConfigurationProperties`，获得类型安全、集中校验和更好的元数据支持。

### `@Order`

为有序集合、部分处理器链和切面提供顺序信息。它不控制普通 Bean 的创建顺序，也不会自动改变所有框架扩展点的优先级规则。

## 生命周期注解

### `@PostConstruct` 与 `@PreDestroy`

分别在依赖注入后执行初始化回调、在容器销毁前执行清理。初始化方法不应依赖尚未完成代理包装的自调用，也不适合执行不可控的长时间远程操作。

### `@EventListener`

把 Bean 方法注册为应用事件监听器。默认同步执行，发布线程会等待监听方法结束。需要异步时必须同时理解线程池、异常处理和事务上下文不会自然传播。

### `@TransactionalEventListener`

把事件监听绑定到事务阶段，例如提交后执行。只有事件发布时存在事务才有对应阶段语义；`fallbackExecution` 会改变无事务时的处理方式。它适合事务提交后的本地动作，不等于可靠消息投递。

## AOP 与事务注解

### `@Aspect`

声明 AspectJ 风格切面类。切面仍需成为 Spring Bean，且项目需要启用对应 AOP 基础设施。

### `@Pointcut`、`@Before`、`@After`、`@AfterReturning`、`@AfterThrowing`、`@Around`

`@Pointcut` 复用切点表达式；其余注解声明通知执行时机。`@Around` 能控制是否继续调用目标方法，能力最大，也最容易隐藏行为。能使用窄通知时，不应默认选择环绕通知。

### `@EnableAspectJAutoProxy`

注册基于 Advisor 的自动代理基础设施。Spring Boot 在相关条件满足时通常自动配置 AOP，但普通 Framework 项目需要显式启用或采用等价配置。

### `@Transactional`

描述事务属性：事务管理器、传播行为、隔离级别、超时、只读和回滚规则。它只是元数据；目标必须是容器 Bean，事务基础设施必须启用，默认代理模式下调用还必须从代理外部进入。

```java
@Transactional(
    propagation = Propagation.REQUIRED,
    isolation = Isolation.READ_COMMITTED,
    timeout = 5,
    rollbackFor = PaymentException.class)
public Order place(CreateOrderCommand command) { ... }
```

默认通常为 REQUIRED、数据库默认隔离级别、读写事务；RuntimeException 和 Error 触发回滚，受检异常需结合版本默认和显式规则确认。自调用、异步线程和远程服务不会天然共享本地事务。

### `@EnableTransactionManagement`

注册读取 `@Transactional` 并创建事务 Advisor 的基础设施。注解放在方法上但没有对应基础设施时，不会凭空产生事务。

## Spring MVC 注解

### `@RequestMapping` 与组合映射

`@RequestMapping` 可限定路径、HTTP Method、参数、Header、`consumes` 和 `produces`。`@GetMapping`、`@PostMapping`、`@PutMapping`、`@PatchMapping`、`@DeleteMapping` 是针对 Method 的组合注解。映射在启动期注册，请求到来时根据全部条件选择最佳 Handler。

### `@PathVariable`、`@RequestParam`、`@RequestHeader`、`@CookieValue`

分别从 URI 模板、查询或表单参数、请求头和 Cookie 解析参数。应根据数据在 HTTP 协议中的真实位置选择，不要为了少写 DTO 把复杂请求全部塞进查询参数。

### `@RequestBody` 与 `@ResponseBody`

`@RequestBody` 使用 HttpMessageConverter 读取请求体；`@ResponseBody` 使用转换器写出返回值。JSON 读取失败发生在 Controller 调用前，JSON 写出失败发生在 Controller 返回后。

### `@RequestPart` 与 `@ModelAttribute`

`@RequestPart` 处理 multipart 中需要消息转换的部分，适合 JSON 元数据加文件；`@ModelAttribute` 适合把请求参数绑定到模型对象，也用于 MVC 模型初始化。二者不要与普通 JSON `@RequestBody` 混淆。

### `@Valid` 与 `@Validated`

`@Valid` 来自 Jakarta Validation，触发级联校验；Spring 的 `@Validated` 支持校验分组，也可用于方法级校验。字段格式校验不应承载库存、状态流转等业务规则。

### `@ResponseStatus`

把异常或处理方法映射为 HTTP 状态。复杂公共 API 更适合由统一异常处理构造稳定错误体，而不是在大量异常类上分散协议规则。

### `@ExceptionHandler`、`@ControllerAdvice`、`@RestControllerAdvice`

`@ExceptionHandler` 声明异常处理方法；Advice 把处理扩展到多个 Controller；`@RestControllerAdvice` 组合了 Advice 与 ResponseBody。它负责异常到协议响应的转换，不应在这里补做事务回滚或业务补偿。

### `@CrossOrigin`

声明 MVC 跨域规则。若 Spring Security、网关或 Nginx 也处理 CORS，需要确定唯一责任层，避免重复响应头和预检请求被安全链拒绝。

## 异步、调度与缓存

### `@EnableAsync` 与 `@Async`

前者注册异步代理基础设施，后者标记需要提交到执行器的方法。默认代理边界同样存在自调用问题。异步线程不会自然继承事务、ThreadLocal 和安全上下文，线程池容量与异常处理必须显式设计。

### `@EnableScheduling` 与 `@Scheduled`

启用并声明定时任务，支持 fixedRate、fixedDelay 和 cron。多实例部署时每个实例都可能执行，需要分布式锁、任务分片或独立调度平台保证业务语义。

### `@EnableCaching`、`@Cacheable`、`@CachePut`、`@CacheEvict`、`@Caching`

`@Cacheable` 命中时可跳过目标方法；`@CachePut` 始终执行并更新缓存；`@CacheEvict` 删除缓存；`@Caching` 组合多个操作。缓存 Key、空值、异常、事务提交顺序和一致性必须一起设计，不能只加注解。

## Spring Boot 注解

### `@SpringBootApplication`

组合 `@SpringBootConfiguration`、`@EnableAutoConfiguration` 和 `@ComponentScan`。它同时定义主配置、自动配置入口和默认扫描根包，通常只放在一个顶层启动类上。

### `@EnableAutoConfiguration`

导入自动配置候选，并根据条件、排除项和顺序参与配置解析。它不扫描所有 jar 中的任意配置类，而是读取约定位置的候选元数据。

### `@ConfigurationProperties`

把 Environment 中同一前缀的配置绑定为类型安全对象，支持嵌套结构、Duration、DataSize 和校验。适合业务配置与基础设施参数。

### `@ConfigurationPropertiesScan` 与 `@EnableConfigurationProperties`

前者按包扫描配置属性类型，后者显式注册指定类型。可复用自动配置通常使用显式注册，业务应用可根据包结构选择扫描。

### `@ConditionalOnClass`、`@ConditionalOnMissingBean` 等条件注解

Boot 常用条件包括类存在或缺失、Bean 存在或缺失、属性取值、资源存在、Web 应用类型和表达式。它们主要在配置解析阶段决定定义是否注册，不是运行过程中不断重新求值的业务开关。

### `@AutoConfiguration`

声明 Boot 自动配置类，并支持 before、after 等排序关系。它用于可复用基础设施模块，不应把普通业务配置包装成自动配置。

## 测试注解

### `@SpringBootTest`

加载完整 Boot ApplicationContext，可选择模拟 Web 环境或随机端口。适合验证完整装配，不应替代快速单元测试。

### `@WebMvcTest`

只加载 MVC 相关切片，适合验证路由、参数、校验、异常和响应。Service 通常需要测试替身。

### `@ContextConfiguration`、`@ActiveProfiles`、`@TestPropertySource`

分别指定测试上下文来源、激活 Profile 和测试属性。测试通过前应确认测试配置没有掩盖生产配置缺失。

### `@MockBean` / `@MockitoBean`

用于把测试替身注册或覆盖到 ApplicationContext。具体名称和推荐方式取决于 Spring Boot、Spring Framework 版本；升级时应按项目版本核对迁移说明，而不是在新旧注解间盲目替换。

### 测试中的 `@Transactional`

测试方法事务通常在方法结束后回滚，但真实 HTTP 随机端口测试运行在服务器线程，测试线程事务不一定覆盖服务端请求。不能用测试回滚现象证明生产事务边界正确。

## 元注解与组合注解

Spring 支持把多个注解组合为一个领域注解，并通过 `@AliasFor` 声明属性别名。`@RestController`、`@GetMapping` 和 `@SpringBootApplication` 都属于组合注解。

自定义组合注解适合表达稳定的业务或平台契约，例如“内部管理接口”统一组合路径、鉴权标记与响应语义。组合过深会隐藏真实行为，应让名称准确表达作用，并为别名和覆盖规则编写测试。

## 不属于本文主体的注解

Spring Security、Spring Data JPA、Spring Data Redis、Spring Cloud、Spring Batch、Spring Integration 各有独立注解体系，例如安全方法、实体映射、Repository 查询、声明式客户端和批处理配置。它们建立在本篇的容器、代理和配置机制上，但运行模型不同，应在对应专题展开，而不是把所有 `org.springframework.*` 注解堆成一张表。

## 排查注解不生效的固定顺序

1. 注解是否来自预期包和版本。
2. 目标类是否已经成为 Spring Bean。
3. 对应 BeanDefinition、后处理器或 Advisor 是否存在。
4. 注解的目标位置、继承与组合规则是否满足。
5. 调用是否经过代理或 MVC 等正确入口。
6. 条件、Profile、作用域和 ApplicationContext 层级是否限制了范围。
7. 用日志、Bean 实际类型、条件报告、映射表或断点证明行为，而不是只检查源码上有没有注解。

掌握这套顺序后，注解不再是需要死记的词典，而是进入 Spring 配置解析、Bean 创建和运行期调用的可定位入口。
