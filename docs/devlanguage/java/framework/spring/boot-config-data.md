# Spring Boot Config Data、配置覆盖与类型安全绑定

同一个 `payment.timeout` 可能同时出现在 Jar 内的 `application.yml`、外部配置目录、Profile 文件、环境变量、系统属性和命令行参数中。代码最终拿到的不是“某个 YAML 里的值”，而是 Boot 在启动早期收集并排序后的 Environment 结果。

配置问题难排查，通常不是因为不会写 YAML，而是混淆了三个动作：配置文件怎样被发现，多个来源怎样覆盖，最终字符串怎样绑定成业务对象。本篇用支付客户端配置贯穿这三个阶段，并给出可重复的失败实验。

![Spring Boot Config Data 总结图](/spring/summary/boot-config-data-overview.webp)

总结图先建立“发现、覆盖、绑定、校验、消费”的配置流水线。下面的 SVG 进一步表示 PropertySource 优先级以及配置对象进入运行组件的准确关系。

![Spring Boot 配置发现、覆盖与绑定](/spring/boot-config-data-resolution.svg)

> 配套视频：[EP04：多个配置来源怎样决定最终值](https://www.bilibili.com/video/BV1AGKu6mEDp) 解释 PropertySource 顺序；[EP05：Config Data、Profile 和外部目录怎样进入配置栈](https://www.bilibili.com/video/BV1d8Ku6NEMh) 解释文件发现过程。

## 配置必须在 Context 刷新前准备

`SpringApplication.run()` 进入 `prepareEnvironment()` 后，会创建与应用类型匹配的 Environment，并执行环境后处理器。Config Data 机制在普通业务 Bean 创建前解析配置位置、Profile 和导入关系，把每份配置文档转换为有顺序的 PropertySource。

这个时间点决定了一个重要边界：日志系统、`spring.main.*`、Profile 和部分服务器选择在 Context 刷新前就要使用。`@PropertySource` 要等配置类解析时才加入 Environment，因此不能可靠地修改这些早期参数。

配置处理不是“容器已经启动后读取一个文件”，而是启动输入的一部分。Config Data 位置无法解析、文件格式错误或导入循环，应用会在大量 Bean 尚未注册前失败。

## 默认搜索位置不是只有 classpath

没有显式修改位置时，Boot 会从 classpath 根目录、classpath 的 `/config`、当前目录、当前目录的 `config/` 及其直接子目录寻找 `application.properties` 或 YAML 变体。外部位置能够覆盖 Jar 内默认值，适合让同一个制品进入不同环境。

订单服务可以把安全默认值放在 Jar 内：

```yaml
payment:
  connect-timeout: 1s
  read-timeout: 3s
  max-attempts: 1
```

生产环境通过 `/opt/order/config/application-prod.yml` 覆盖地址和容量参数，而不是重新打包 Jar。这样发布物、配置和密钥的责任边界更清晰，也便于证明两个实例运行的是同一份应用制品。

### `spring.config.location` 与 `additional-location`

两者都能指定自定义配置位置，但语义不同：

| 参数 | 对默认搜索位置的影响 | 适用场景 |
| --- | --- | --- |
| `spring.config.location` | 替换默认位置 | 完全由平台规定配置目录 |
| `spring.config.additional-location` | 在默认位置之外追加 | 保留 Jar 默认值，再叠加环境配置 |

位置是目录时应以 `/` 结尾，让 Boot 按配置名称与 Profile 展开；位置是文件时则直接导入。配置位置参数本身必须来自环境变量、系统属性或命令行等早期来源，不能期待把它写进尚未被发现的配置文件里。

```bash
java -jar order-service.jar \
  --spring.config.additional-location=optional:file:/opt/order/config/
```

`optional:` 表示位置缺失时允许继续启动。数据库密码、支付地址等关键配置通常不应标记为可选，否则应用可能带着错误默认值进入运行期。是否可选应由业务可用性决定，不是为了消除启动异常。

## `spring.config.import` 建立配置依赖

配置文档可以使用 `spring.config.import` 导入额外文件或远程配置实现支持的位置：

```yaml
spring:
  config:
    import:
      - optional:file:./config/payment.yml
      - file:/etc/order/database.yml
```

导入项会被当作当前文档的配置依赖处理。非可选位置缺失会阻止启动，这通常比第一笔订单到来时才发现配置缺失更安全。

导入不应形成隐蔽的长链。配置来源过多时，值虽然有确定顺序，人却难以判断责任归属。生产系统宜规定少量稳定来源，例如“Jar 默认值 + 平台环境变量 + 挂载的敏感配置”，并在发布记录中保留配置版本。

## Profile 选择配置集合，不是业务开关

Profile 会影响哪些配置文档和 BeanDefinition 参与启动。`application-prod.yml` 是默认配置的 Profile 特化，而 `spring.config.activate.on-profile` 可以让某个 YAML 文档只在条件匹配时生效。

```yaml
payment:
  sandbox: true

---
spring:
  config:
    activate:
      on-profile: prod

payment:
  sandbox: false
```

Profile 适合表达环境级装配差异，例如开发环境使用模拟支付、生产环境使用真实 Client。它不适合表示每分钟变化的促销开关，也不适合承担租户级业务策略。运行期间频繁变化的状态应进入配置中心、数据库或专门的特性开关系统，并明确一致性与回滚语义。

多个 Profile 同时激活时，必须结合激活顺序和文档顺序判断结果。只看到文件名带 `prod`，不能证明它一定覆盖所有其他来源。

## PropertySource 顺序决定最终值

Environment 是有序 PropertySource 集合。命令行参数、系统属性、环境变量、Config Data 和默认属性处于不同优先级。后加入的高优先级来源可以遮蔽低优先级同名键。

例如 Jar 内配置为：

```yaml
server:
  port: 8080
```

启动命令使用：

```bash
SERVER_PORT=9090 java -jar order-service.jar --server.port=10080
```

最终端口是 `10080`，因为命令行属性优先于环境变量与 Config Data。这个实验能证明运行时使用的是 Environment 的最终视图，而不是直接读取 YAML。

### 环境变量名称转换

操作系统环境变量通常不能使用点号。Boot 的宽松绑定可以把 `PAYMENT_READ_TIMEOUT` 对应到 `payment.read-timeout`。但 Map Key、列表索引和特殊字符可能需要更谨慎的命名与验证，复杂结构不宜全部塞进环境变量。

容器平台使用环境变量时，应检查 Deployment 实际注入结果，而不是只检查模板仓库。变量为空、Secret Key 名错误、旧 Pod 未滚动都可能让不同实例得到不同配置。

## `@ConfigurationProperties` 把字符串变成模型

Environment 只负责提供配置值。业务代码若在各处使用 `@Value`，会把前缀、默认值、转换和校验分散到多个 Bean。成组配置更适合绑定为类型安全对象：

```java
@Validated
@ConfigurationProperties("payment")
public record PaymentProperties(
        @NotNull URI baseUrl,
        @NotNull Duration connectTimeout,
        @NotNull Duration readTimeout,
        @Min(1) @Max(5) int maxAttempts) {
}
```

```java
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(PaymentProperties.class)
class PaymentConfiguration {

    @Bean
    PaymentClient paymentClient(
            PaymentProperties properties,
            RestClient.Builder builder) {
        return new PaymentClient(
                builder.baseUrl(properties.baseUrl()).build(),
                properties.readTimeout(),
                properties.maxAttempts());
    }
}
```

绑定阶段会完成 `Duration`、`DataSize`、URI、枚举和集合等类型转换。配合 Validation，地址缺失、重试次数越界等问题会阻止 Context 刷新，而不是以错误默认值运行。

### 构造器绑定与可变 JavaBean

不可变配置对象适合构造器绑定，能保证对象创建后状态完整。需要第三方绑定、复杂继承或逐步设置时才考虑可变 JavaBean。无论使用哪种形式，都应让配置对象只描述数据，不在 Getter 中发起网络调用或读取其他 Bean。

### 默认值应该放在哪里

通用且安全的默认值可以放在配置类字段或 Jar 内配置；环境相关地址、凭证和容量不应硬编码。一个判断标准是：如果默认值被误带到生产，会不会造成数据错误、安全风险或资源耗尽。答案为“会”的配置，应强制外部提供并在启动期校验。

## YAML、列表与 Map 的结构边界

YAML 缩进表达对象层级，列表和 Map 又有各自合并语义。配置看起来相似，不代表 Binder 得到的对象相同。

```yaml
payment:
  routes:
    - channel: card
      timeout: 2s
    - channel: wallet
      timeout: 1s
```

适合绑定为 `List<RouteProperties>`。如果 Profile 文档重新声明 `payment.routes`，通常应把它理解为对整个列表的替换，而不是按 `channel` 自动合并。希望按键覆盖时可以改用 Map：

```yaml
payment:
  routes:
    card:
      timeout: 2s
    wallet:
      timeout: 1s
```

配置模型应与覆盖需求一致。用列表表达有稳定标识的配置项，升级时很容易因顺序和整表替换产生意外。

同一位置同时存在 `.properties` 与 YAML 时也要避免依赖隐含优先规则。团队应统一一种主格式，减少“修改了文件但实际读取另一份”的问题。

## 密钥不是普通配置值

数据库密码、Token 和私钥可以通过 Environment 进入应用，但它们的生命周期与普通超时参数不同：需要访问控制、轮换、审计和脱敏。仓库中的 `application.yml` 只应保留变量引用或非敏感默认值。

```yaml
payment:
  api-key: ${PAYMENT_API_KEY}
```

占位符没有来源时应让绑定校验失败，不能回退到真实测试密钥。生产排查只确认“来源存在、版本正确、目标实例已更新”，不要把 Secret 内容写到日志、截图、Actuator 或发布记录。

密钥轮换还要考虑 Client 是否只在启动时读取。修改平台 Secret 并不会自动更新已运行 Bean；若没有动态刷新机制，就必须滚动实例并验证新连接。动态刷新则会引入对象重建、并发可见性和失败回退问题，不应默认假设所有配置可热更新。

## 配置改变 Bean 图与只改变参数是两回事

`payment.read-timeout` 通常只改变 PaymentClient 的参数；`acme.payment.enabled` 若参与 `@ConditionalOnProperty`，则决定 PaymentClient Bean 是否存在。前者的错误多发生在绑定或使用阶段，后者会改变自动配置结果和依赖图。

这种区别对 AOT、测试和动态配置都很重要。运行期间修改普通超时，也要有对象重新加载机制才能生效；修改决定 Bean 存在性的条件，则通常需要重新创建 ApplicationContext，不能靠刷新一个字段完成。

设计配置项时，应明确分类：

- 启动结构配置：决定模块、Bean 或服务器是否存在。
- 资源配置：连接池、线程池、超时和队列容量。
- 业务策略配置：限额、路由和功能开关。
- 敏感配置：凭证、证书和加密材料。

四类配置的发布频率、验证方式和变更权限不应完全相同。

## 配置元数据改善使用体验

可复用 Starter 暴露配置项时，应加入配置处理器生成元数据。IDE 才能提示属性名、类型和说明，升级时也更容易发现废弃属性。

配置属性是对使用者的公共 API。重命名时需要迁移策略和版本说明，不能把内部字段名随意暴露后再无提示删除。

## 三个失败实验

### 实验一：关键导入文件缺失

把配置写为：

```yaml
spring:
  config:
    import: file:/tmp/not-exists/payment.yml
```

应用会在环境准备阶段以 Config Data 位置异常停止。添加 `optional:` 后能继续启动，但必须验证关键属性是否还有合法来源。这个差异用于决定配置是否真的可选。

### 实验二：绑定格式错误

设置：

```bash
PAYMENT_READ_TIMEOUT=fast java -jar order-service.jar
```

`fast` 不能转换为 Duration，配置属性绑定失败，Context 不会完成刷新。排查重点是目标属性、来源和值格式，不是支付 Client 的网络日志。

### 实验三：高优先级来源遮蔽

YAML 中把 `payment.max-attempts` 改成 2，但部署环境残留 `PAYMENT_MAX_ATTEMPTS=5`，运行值仍然是 5。此时继续修改 YAML 没有效果，应查看 Environment 中该属性的来源，并清理平台侧覆盖项。

## 用测试固定配置契约

配置类可以使用 `ApplicationContextRunner` 快速验证，不必每次启动完整服务器：

```java
class PaymentConfigurationTest {

    private final ApplicationContextRunner runner =
            new ApplicationContextRunner()
                    .withUserConfiguration(PaymentConfiguration.class);

    @Test
    void bindsValidatedConfiguration() {
        runner.withPropertyValues(
                        "payment.base-url=https://pay.example.com",
                        "payment.connect-timeout=1s",
                        "payment.read-timeout=3s",
                        "payment.max-attempts=2")
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context.getBean(PaymentProperties.class)
                            .readTimeout()).isEqualTo(Duration.ofSeconds(3));
                });
    }
}
```

还应增加缺少必填项、格式错误和边界值失败测试。测试的目标不是证明 Binder 永远正确，而是固定应用对配置名称、默认值和约束的承诺。

多 Profile 与环境变量映射也应有集成测试。测试可以启动最小 Context，激活 Profile 并断言最终配置对象；不要只测试 YAML 能否被语法解析，因为真正风险在多来源合并和绑定结果。

## 运行时怎样取得配置证据

本地排查可以通过启动参数、`Environment#getProperty()` 断点、`env` 和 `configprops` 端点观察结果。生产环境应使用受控管理面，并依赖脱敏后的来源信息。

需要记录的不是全部 Environment，而是目标属性的四元组：规范属性名、最终值的安全表示、最高优先级来源、绑定对象。再加上消费者对象的实际参数，就能判断问题停在覆盖、绑定还是使用。

例如支付超时异常时，证据可以写成：

```text
property: payment.read-timeout
resolved: 30s
source: systemEnvironment[PAYMENT_READ_TIMEOUT]
bound bean: PaymentProperties.readTimeout = PT30S
consumer: PaymentClient readTimeout = PT30S
```

这个证据链比复制整个 `application-prod.yml` 更直接，也不会把无关密钥带入排查记录。

## 生产排查闭环

配置异常按下面顺序处理：

1. 确认故障发生在 Config Data 发现、PropertySource 覆盖、类型转换还是 Bean 使用阶段。
2. 记录目标属性的最终值、来源和适用 Profile；敏感值只记录是否存在与来源，不打印正文。
3. 检查实际进程的命令行、系统属性、环境变量和挂载文件，而不是只看代码仓库。
4. 检查 `@ConfigurationProperties` 是否注册、前缀是否一致、校验是否执行。
5. 修正拥有该值的最高优先级来源，滚动实例后再次读取运行值。
6. 用一个安全的真实调用验证配置确实被 Client、连接池或服务器采用。

Actuator 的 `env` 与 `configprops` 能辅助定位，但生产暴露必须鉴权、隔离并脱敏。它们提供证据，不应成为绕过发布系统直接修改配置的入口。

## 版本与升级边界

Boot 4.1 与 3.5 都使用 Config Data 模型，但托管依赖、属性名称与自动配置模块可能不同。升级时应比较配置变更日志，并检查废弃或重命名属性。属性迁移工具适合发现问题，不应永久保留为运行依赖。

AOT 场景下，构建时可确定的 Bean 图与运行时 Profile/条件切换存在额外限制。计划使用 AOT 或 Native Image 时，应把“哪些属性只改变普通对象参数，哪些属性会改变 Bean 是否存在”区分开，避免把运行时动态装配当作默认能力。

## 继续阅读

- [Spring Boot 总览](./springboot.md)：确定配置在 Boot 全链路中的位置。
- [Spring Boot 启动机制](./boot-startup.md)：继续追踪 Environment 准备与 Context 刷新。
- [Spring Boot 自动配置](./boot-autoconfiguration.md)：理解配置值怎样参与条件判断和默认 Bean 注册。
- [Spring Boot 配置与生产运行](./boot-production.md)：把配置证据接入健康、观测和发布流程。
