# Spring Boot 自动配置

自动配置不是运行时猜测，也不是 Starter 直接创建对象。它是一套发生在配置类解析阶段的条件化 BeanDefinition 注册机制。

![Spring Boot 自动配置判断链](/spring/boot-auto-config.svg)

## 四个容易混淆的阶段

Starter 只负责依赖组合，让框架类、驱动和自动配置模块进入 classpath。`@EnableAutoConfiguration` 触发 AutoConfigurationImportSelector 读取候选配置；条件评估决定哪些配置和 `@Bean` 方法成立；BeanFactory 最后才根据 BeanDefinition 创建对象。

因此，“依赖已经存在”只能证明第一阶段完成，不能证明功能已启用。条件可能因应用类型、配置开关、缺少其他类或用户 Bean 已存在而退出。

## 用 DataSource 追踪一次装配

引入 JDBC Starter 后，JDBC API、连接池和数据源自动配置进入依赖图。配置类解析阶段导入相关自动配置，并判断必要类是否存在、当前是否缺少用户 DataSource、连接信息能否确定。条件成立后才登记 DataSource BeanDefinition，刷新后半段再创建连接池对象。

如果用户显式声明 DataSource，`@ConditionalOnMissingBean` 让默认定义退出。这不是用户 Bean 创建后替换默认对象，而是条件评估时根本不登记默认定义。理解这个时间点，才能正确分析“为什么我的 Bean 没覆盖默认配置”和自动配置顺序问题。

## 条件报告怎样阅读

使用 `--debug` 或 Actuator `conditions` 端点可以查看 ConditionEvaluationReport。先找到目标 AutoConfiguration，再区分 positive matches、negative matches 和 exclusions。报告中的每条消息应与 classpath、配置或 BeanDefinitionRegistry 中的事实对应。

```bash
java -jar order-service.jar --debug
curl http://localhost:8080/actuator/conditions
```

如果 DataSource 配置没有生效，不要从所有启动日志中搜索“数据库”。直接定位 DataSource 相关自动配置，确认是哪一条条件退出，再检查对应依赖、属性或用户 Bean。

## 用户配置怎样安全接管默认值

Boot 的设计是提供可退让默认值，而不是禁止显式配置。常见接管方式是声明同类型 Bean、设置公开配置属性、提供 Customizer，或排除特定自动配置。优先使用配置属性和 Customizer；只有默认模型无法表达需求时才完全替换核心 Bean。

替换 `ServletWebServerFactory`、ObjectMapper 或 DataSource 这类基础 Bean 时，要检查 Boot 原本应用的 Customizer、监控和生命周期能力是否仍然存在。得到一个“能启动”的对象不等于保留了默认配置的全部工程行为。

## 自动配置顺序不是 Bean 初始化顺序

`before`、`after` 和自动配置排序解决的是配置解析与定义可见性，不直接保证普通 Bean 的创建顺序。Bean 初始化顺序由依赖图、`dependsOn`、懒加载和 BeanFactory 创建过程决定。把自动配置排序当成业务初始化编排工具，会产生难以推断的启动行为。

## 自定义自动配置的边界

可复用 Starter 应把依赖组合、配置属性和自动配置拆开。自动配置类应使用明确条件，在用户提供实现时退让，并通过 ApplicationContextRunner 验证“条件满足时注册、缺少依赖时退出、用户 Bean 存在时退让”三条路径。

业务项目内部仅有一处使用的普通配置，不必包装成 Starter。自动配置适合跨项目复用的基础设施约定，不适合隐藏核心业务流程。
