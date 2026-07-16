# Spring IoC 容器

IoC 容器负责管理应用里的长期组件。它记录哪些类可以成为 Bean，决定这些 Bean 如何创建，负责把 Bean 之间的依赖连接起来，并在初始化和销毁阶段提供扩展点。

如果把业务应用看成一座工厂，IoC 容器不是生产线上的某个工人，而是设备台账和装配系统：哪些设备需要登记，设备之间怎么连接，启动前要做什么检查，关闭时要按什么顺序收尾，都由它统一管理。

![Spring IoC 容器总结图](/spring/summary/ioc-container-overview.webp)

总结图先区分 BeanDefinition、BeanFactory 与 ApplicationContext，再把“来源、定义、实例化、注入、初始化、可用”连成完整生命周期。后续源码图继续展开每个扩展点的准确位置。

![Spring Bean 生命周期](/spring/ioc-bean-lifecycle.svg)

> 配套视频：Bean 定义与对象创建不是同一步。可先看 [EP07：主配置类怎样登记为 BeanDefinition](https://www.bilibili.com/video/BV1RtKu6iEqZ)，再看 [EP14：BeanDefinition 怎样成为对象](https://www.bilibili.com/video/BV1fWKu6uE5W)。

## 详细位置

- 本页说明 IoC 的概念边界、Bean 来源、依赖注入、生命周期和排错方式。
- Spring 各模块关系见 [Spring 总览](./index.md)。
- 事务和代理问题见 [AOP](./aop.md)。
- Web 请求中的 Controller、Service 装配见 [Spring MVC](./mvc.md)。

## 概念边界

| 概念 | 准确含义 | 直观理解 |
| --- | --- | --- |
| IoC | 对象创建和依赖组装的控制权从业务代码转移到容器 | 对象不再自己找零件，而是由装配系统配齐 |
| DI | 容器把一个对象需要的依赖传给它 | 组件声明插口，容器插上线 |
| Bean | 被 Spring 容器管理的对象 | 登记在容器台账里的组件 |
| ApplicationContext | 常用 Spring 容器 | 应用启动后的组件仓库和运行上下文 |
| BeanDefinition | Bean 的元信息 | 容器创建 Bean 前看的说明书 |

IoC 的重点不是让代码变短，而是让依赖关系显式、可替换、可检查。一个对象需要什么依赖，应能从构造器或配置中直接看出来，而不是藏在方法内部的 `new` 里。

## 哪些对象适合成为 Bean

适合注册为 Bean 的对象：

- 应用服务：例如订单服务、支付服务、导出服务。
- 数据访问对象：例如 Repository、Mapper、DAO。
- 外部系统客户端：例如支付网关客户端、短信客户端、对象存储客户端。
- 框架扩展点：例如拦截器、监听器、定时任务、消息消费者。
- 配置对象：例如线程池、序列化器、业务配置绑定对象。

不适合注册为 Bean 的对象：

- Entity、DTO、VO、Command、Request、Response。
- 一次循环、一次请求、一次计算中临时创建的数据对象。
- 持有用户临时状态或请求中间状态的对象。

判断标准是生命周期。Bean 通常像“设备”，在应用启动后长期存在；DTO 和 Entity 更像“单据”，在一次流程中流转，用完就结束。

## Bean 的来源

Bean 主要来自两类入口。

### 组件扫描

应用内部自己写的组件，通常通过 `@Service`、`@Repository`、`@Controller`、`@Component` 注册。它表达的是“这个类由容器管理”。

使用时应让注解表达分层语义：

| 注解 | 更适合放在 | 说明 |
| --- | --- | --- |
| `@Controller` / `@RestController` | Web 入口 | 处理 HTTP 协议 |
| `@Service` | 应用服务 | 编排业务流程、控制事务边界 |
| `@Repository` | 数据访问 | 数据库、缓存、外部存储访问 |
| `@Component` | 通用组件 | 没有明确分层语义的工具型组件 |

### 配置类

第三方对象、带构造参数的 SDK Client、线程池、连接池等，通常通过 `@Configuration` 和 `@Bean` 注册。它表达的是“这个对象怎样创建”。

组件扫描适合“类本身就是组件”；配置类适合“对象创建过程需要额外说明”。把复杂创建逻辑塞进业务类，会让业务代码同时承担装配职责。

下面的例子同时展示两种来源：`OrderService` 来自组件扫描，第三方支付客户端来自配置类。

```java
@Service
public class OrderService {
    private final PaymentClient paymentClient;

    public OrderService(PaymentClient paymentClient) {
        this.paymentClient = paymentClient;
    }
}

@Configuration
public class PaymentConfiguration {
    @Bean
    PaymentClient paymentClient(PaymentProperties properties) {
        return new PaymentClient(properties.baseUrl(), properties.timeout());
    }
}
```

容器启动时先登记两份 BeanDefinition，再按构造器参数解析依赖。`OrderService` 不负责读取配置或创建客户端，因此测试时可以直接传入替身实现。

## 依赖注入

依赖注入的目标是让对象只声明“我需要什么”，不关心“依赖从哪里来”。最推荐的是构造器注入，因为它有几个清晰特征：

- 对象创建完成时，必需依赖已经齐全。
- 依赖关系可以从构造器直接看见。
- 字段可以保持不可变。
- 单元测试可以直接传入替身对象。
- 循环依赖会更早暴露。

Setter 注入适合可选依赖或运行期可替换依赖。字段注入虽然短，但依赖不透明，测试不方便，业务代码中不建议作为默认选择。

## 多实现如何选择

一个接口有多个实现时，容器会遇到“同一个插口有多根线”的问题。常见处理方式：

| 场景 | 方式 | 含义 |
| --- | --- | --- |
| 调用方明确需要某个实现 | `@Qualifier` | 指定 Bean 名称或限定符 |
| 某个实现是默认选择 | `@Primary` | 多实现中优先使用它 |
| 调用方需要所有实现 | 注入 `List<T>` 或 `Map<String, T>` | 适合插件、策略、责任链 |

不要靠类名巧合或加载顺序解决多实现问题。多实现本身是设计信息，应该用注解或集合注入表达清楚。

## 生命周期

单例 Bean 的生命周期可以按这条线理解：

1. 容器读取 Bean 定义。
2. 调用构造器创建对象。
3. 注入依赖和配置属性。
4. 执行初始化前扩展。
5. 执行初始化回调。
6. 执行初始化后扩展。
7. Bean 进入可用状态。
8. 容器关闭时执行销毁回调。

初始化回调适合做必须在启动前完成的校验，例如配置完整性检查、本地缓存结构初始化。不适合放置耗时且非关键的远程调用，否则应用启动会被外部系统拖慢。

### 从 BeanDefinition 到可用对象

源码中，一个单例 Bean 会经历缓存检查、实例化、依赖注入、初始化和最终暴露。主流程及对象状态变化如下：

![Spring 单例 Bean 创建源码流程](/spring/ioc-bean-creation-source-flow.svg)

BeanPostProcessor 不只是“初始化前后各调用一次”。自动注入、配置属性绑定、生命周期注解和自动代理都可能通过不同处理器介入对象创建。排查 Bean 状态时，需要先确认当前看到的是原始实例、初始化中的实例，还是已经完成代理包装的最终对象。

### `refresh()` 怎样把定义变成对象图

这一段可配合 [EP08：`refresh()` 怎样推进成可用容器](https://www.bilibili.com/video/BV1jtKu6qEEC) 和 [EP10：配置类怎样展开更多定义](https://www.bilibili.com/video/BV19YKu6AEFn) 阅读。

`ApplicationContext` 创建完成并不表示容器已经可用。真正把配置元数据推进为运行时对象的是 `AbstractApplicationContext.refresh()`。它先准备 BeanFactory，再执行 BeanFactoryPostProcessor，随后注册 BeanPostProcessor，最后才创建普通非懒加载单例。这个顺序不是实现细节，而是容器能够扩展的基础：修改“说明书”的处理器必须先执行，参与“造对象”的处理器必须在普通 Bean 创建前安装好。

`ConfigurationClassPostProcessor` 是前一类处理器。它读取主配置类，递归处理 `@ComponentScan`、`@Import` 和 `@Bean`，继续向 BeanDefinitionRegistry 写入定义。假设项目最初只把 `OrderApplication` 登记进容器，经过配置类解析后，订单 Controller、Service、Repository、数据源自动配置等定义才逐步展开。此时可以有几百份 BeanDefinition，但绝大多数业务对象仍未实例化。

`AutowiredAnnotationBeanPostProcessor`、处理生命周期注解的处理器和自动代理创建器属于后一类扩展。它们必须先注册，之后 `finishBeanFactoryInitialization()` 批量创建单例时才能参与依赖注入、初始化和代理包装。若把两类处理器都笼统称为“后处理器”，就会看不懂为什么有的扩展能增加 BeanDefinition，有的只能改变某个已经创建的 Bean。

### 构造器参数是怎样解析的

以下对象图并不是按照源码文件顺序创建的：

```java
@Service
class OrderService {
    private final OrderRepository repository;
    private final PaymentClient paymentClient;

    OrderService(OrderRepository repository, PaymentClient paymentClient) {
        this.repository = repository;
        this.paymentClient = paymentClient;
    }
}
```

容器准备创建 `OrderService` 时，会先选择可用构造器，再把每个参数包装成依赖描述。BeanFactory 按“所需类型 + 泛型 + 限定符 + 是否必需”等信息查找候选 BeanDefinition。只有一个候选时直接选中；多个候选时继续比较 `@Primary`、`@Qualifier`、优先级和名称；仍无法唯一确定才抛出异常。选中候选并不代表它已经存在，如果对应单例尚未创建，`getBean()` 会递归创建它。

因此，构造器注入形成的是一棵按需展开的创建树。创建 Controller 可能触发创建 Service，创建 Service 又触发 Repository 和 Client。单例缓存避免同一个完整 Bean 被重复创建，`dependsOn` 和依赖关系记录则帮助容器确定初始化、销毁顺序以及异常信息。所谓“自动注入”并不是按字段名猜一个对象，而是一套可观察的候选解析过程。

### 原始对象为什么可能不是最终 Bean

`createBeanInstance()` 返回的只是刚完成构造的实例。随后属性填充、Aware 回调、初始化方法和 BeanPostProcessor 会依次介入。`initializeBean()` 的返回值可以与传入对象不同，AOP 自动代理创建器正是在这里把目标对象包装成代理。最终放入单例池、注入其他组件的通常是处理器链最后返回的对象。

这一区别对排错非常重要。构造方法和早期初始化回调里看到的 `this` 是目标对象；Controller 中注入的 Service 可能是代理；`getBean(OrderService.class)` 返回的是容器最终暴露的 Bean。若某个处理器提前持有原始对象，而其他调用方拿到代理，同一个逻辑对象就出现两种引用，事务和切面行为会变得不一致。Spring 对循环依赖和提前代理有大量约束，根源正是要保证最终暴露对象的一致性。

### 循环依赖的准确边界

Spring 的三级缓存可以在特定条件下提前暴露单例引用，但它不是通用的循环依赖解决器。构造器循环依赖无法先创建任何一方；prototype Bean 不进入单例缓存；关闭循环引用或对象创建过程中出现其他异常时，也不会被缓存机制自动修复。

即使某个字段注入循环依赖能够启动，也应优先调整设计。缓存解决的是对象创建时序，不会消除两个服务职责相互纠缠的问题。

三级缓存所保存的也不是三个完整 Bean。一级缓存保存已经完成初始化的单例；二级缓存保存提前暴露的引用；三级缓存保存能够在需要时产生提前引用的工厂。A 创建后尚未完成初始化，注入 B 时触发 B 创建，B 又需要 A，容器才会从三级缓存取得 A 的提前引用。等 A 最终完成初始化后，正式引用再进入一级缓存。构造器循环无法使用这条路径，因为 A 在需要 B 时连原始实例都还没有产生。

如果 A 最终需要被 AOP 代理，提前引用还必须与最终代理保持一致，否则 B 可能拿到原始 A，而其他 Bean 拿到代理 A。这也是循环依赖与代理叠加后更难推断的原因。工程上应把循环依赖视为对象边界信号，而不是依赖缓存技巧维持启动。

## 作用域

多数业务 Bean 使用默认的 singleton。它表示容器中只有一个实例，并不表示它必须持有全局状态。

单例 Bean 应尽量无状态。用户 ID、请求参数、导入进度、临时计算结果等不应放进单例字段，否则并发请求之间可能互相污染。

常见作用域：

| 作用域 | 生命周期 | 适用性 |
| --- | --- | --- |
| `singleton` | 容器内单例 | Service、Repository、Client、配置类 |
| `prototype` | 每次获取创建新实例 | 有状态任务对象，使用较少 |
| `request` | 每个 HTTP 请求一个实例 | 请求上下文 |
| `session` | 每个 HTTP Session 一个实例 | 会话状态，谨慎使用 |

## 配置绑定

零散的 `@Value` 适合少量简单值。只要配置形成一组，例如支付网关地址、Token、超时时间、重试次数，就更适合使用 `@ConfigurationProperties`。

结构化配置的好处：

- 配置项属于同一个对象，含义集中。
- 可以设置默认值和校验规则。
- 测试时可以直接构造配置对象。
- 排查时更容易确认前缀、字段和最终值。

配置对象像“设备参数表”，业务组件只读取参数表，不应该到处散落读取配置文件。

## 常见问题

### 找不到 Bean

优先检查：

1. 类是否在启动类所在包或子包下。
2. 类是否通过组件注解或配置类注册。
3. 条件装配是否没有命中。
4. 测试环境是否缺少配置类。
5. 依赖是否进入运行时 classpath。

### Bean 超过一个

说明容器找到了多个候选对象，但注入点没有说明要哪个。用 `@Qualifier` 指定、用 `@Primary` 设置默认，或者改成注入集合。

### 循环依赖

循环依赖通常不是容器问题，而是服务边界问题。A 调 B，B 又调 A，往往说明两个服务职责互相缠绕。

优先处理方式：

- 抽出共同依赖。
- 调整服务边界。
- 用事件解耦后续动作。
- 把事务入口放到更清晰的应用服务层。

### 配置没有注入

检查顺序：

1. 配置文件是否进入 classpath。
2. 当前 profile 是否正确。
3. 环境变量或命令行参数是否覆盖文件配置。
4. 配置前缀和字段名是否匹配。
5. 配置属性类是否被启用或扫描。

## 测试判断

业务单元测试不一定需要启动 Spring。构造器注入设计良好的类，可以直接传入替身依赖测试业务规则。只有需要验证组件扫描、条件装配、配置绑定、事务代理等框架行为时，才需要启动 Spring 测试上下文。

## 源码与运行验证

可以用一个最小应用验证“先登记定义、后创建对象”：

1. 在 `SpringApplication.load()` 后观察 BeanDefinition 名称，此时主配置类已经登记，但业务单例还没有全部创建。
2. 在 `AbstractApplicationContext.refresh()` 的 `finishBeanFactoryInitialization()` 前后分别观察单例数量。
3. 在 `AbstractAutowireCapableBeanFactory.doCreateBean()` 设置断点，查看实例化、属性填充和初始化的先后顺序。
4. 对最终 Bean 打印 `bean.getClass()`，确认它是原始类型还是代理类型。

如果只想验证装配结果，可以使用 `ApplicationContextRunner` 或小范围 Spring 测试；如果只测试订单计算规则，直接 `new OrderService(fakeClient)` 更快，也更能暴露业务类是否依赖容器细节。

## 总结

IoC 的核心是明确对象管理边界。长期组件交给容器，临时数据留在业务流程里；必需依赖用构造器表达，多实现用明确规则选择；单例 Bean 保持无状态；排错时按扫描范围、注册来源、条件装配、多实现冲突、配置绑定逐层检查。
