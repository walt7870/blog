# Spring IoC 容器详解

## 概述

IoC（Inversion of Control，控制反转）是 Spring 框架的核心特性之一。它是一种设计原则，用于减少代码之间的耦合度。在传统的程序设计中，对象的创建和依赖关系的管理都是由程序代码直接控制的。而在 IoC 模式下，这种控制权被反转了，对象的创建和依赖关系的管理交给了容器来处理。

## 目录

1. [IoC 基本概念](#ioc-基本概念)
2. [依赖注入（DI）](#依赖注入di)
3. [Spring IoC 容器](#spring-ioc-容器)
4. [Bean 的定义与配置](#bean-的定义与配置)
5. [Bean 的生命周期](#bean-的生命周期)
6. [Bean 的作用域](#bean-的作用域)
7. [依赖注入的方式](#依赖注入的方式)
8. [自动装配](#自动装配)
9. [注解驱动开发](#注解驱动开发)
10. [Java 配置](#java-配置)
11. [高级特性](#高级特性)
12. [最佳实践](#最佳实践)

---

## IoC 基本概念

### 什么是控制反转

控制反转（IoC）是一种设计原则，它将对象的创建、配置和生命周期管理的控制权从应用程序代码转移到外部容器。

#### 传统方式 vs IoC 方式

**传统方式**：

```java
public class UserService {
    private UserRepository userRepository;
    
    public UserService() {
        // 直接创建依赖对象
        this.userRepository = new UserRepositoryImpl();
    }
    
    public User findById(Long id) {
        return userRepository.findById(id);
    }
}
```

**IoC 方式**：

```java
public class UserService {
    private UserRepository userRepository;
    
    // 通过构造函数注入依赖
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    
    public User findById(Long id) {
        return userRepository.findById(id);
    }
}
```

### IoC 的优势

1. **降低耦合度**：对象之间的依赖关系由容器管理，减少了直接依赖
2. **提高可测试性**：可以轻松地注入模拟对象进行单元测试
3. **增强灵活性**：可以在运行时动态改变对象的依赖关系
4. **简化配置**：集中管理对象的创建和配置
5. **支持 AOP**：为面向切面编程提供基础

---

## 依赖注入（DI）

### 什么是依赖注入

依赖注入（Dependency Injection，DI）是实现 IoC 的一种方式。它是一种设计模式，用于实现对象之间的松耦合。

### DI 的类型

#### 1. 构造函数注入

```java
@Component
public class UserService {
    private final UserRepository userRepository;
    private final EmailService emailService;
    
    // 构造函数注入
    public UserService(UserRepository userRepository, EmailService emailService) {
        this.userRepository = userRepository;
        this.emailService = emailService;
    }
    
    public User createUser(User user) {
        User savedUser = userRepository.save(user);
        emailService.sendWelcomeEmail(savedUser.getEmail());
        return savedUser;
    }
}
```

#### 2. Setter 注入

```java
@Component
public class UserService {
    private UserRepository userRepository;
    private EmailService emailService;
    
    // Setter 注入
    @Autowired
    public void setUserRepository(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    
    @Autowired
    public void setEmailService(EmailService emailService) {
        this.emailService = emailService;
    }
}
```

#### 3. 字段注入

```java
@Component
public class UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private EmailService emailService;
    
    public User createUser(User user) {
        User savedUser = userRepository.save(user);
        emailService.sendWelcomeEmail(savedUser.getEmail());
        return savedUser;
    }
}
```

### 推荐的注入方式

**构造函数注入是推荐的方式**，原因如下：

1. **不可变性**：可以将字段声明为 final
2. **必需依赖**：确保所有必需的依赖都被提供
3. **测试友好**：便于编写单元测试
4. **循环依赖检测**：在应用启动时就能发现循环依赖

---

## Spring IoC 容器

### 容器类型

Spring 提供了两种主要的容器类型：

#### 1. BeanFactory

```java
// 基本的 IoC 容器
BeanFactory factory = new XmlBeanFactory(new ClassPathResource("beans.xml"));
UserService userService = (UserService) factory.getBean("userService");
```

#### 2. ApplicationContext

```java
// 高级的 IoC 容器
ApplicationContext context = new ClassPathXmlApplicationContext("beans.xml");
UserService userService = context.getBean("userService", UserService.class);
```

### ApplicationContext 的实现

#### 1. ClassPathXmlApplicationContext

```java
// 从类路径加载 XML 配置文件
ApplicationContext context = new ClassPathXmlApplicationContext("applicationContext.xml");
```

#### 2. FileSystemXmlApplicationContext

```java
// 从文件系统加载 XML 配置文件
ApplicationContext context = new FileSystemXmlApplicationContext("/path/to/applicationContext.xml");
```

#### 3. AnnotationConfigApplicationContext

```java
// 基于注解的配置
ApplicationContext context = new AnnotationConfigApplicationContext(AppConfig.class);
```

#### 4. WebApplicationContext

```java
// Web 应用上下文
@Configuration
@EnableWebMvc
public class WebConfig implements WebMvcConfigurer {
    // Web 相关配置
}
```

---

## Bean 的定义与配置

### XML 配置方式

```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xsi:schemaLocation="http://www.springframework.org/schema/beans
                           http://www.springframework.org/schema/beans/spring-beans.xsd">
    
    <!-- 简单 Bean 定义 -->
    <bean id="userRepository" class="com.example.repository.UserRepositoryImpl"/>
    
    <!-- 带构造函数参数的 Bean -->
    <bean id="userService" class="com.example.service.UserService">
        <constructor-arg ref="userRepository"/>
        <constructor-arg ref="emailService"/>
    </bean>
    
    <!-- 带属性注入的 Bean -->
    <bean id="emailService" class="com.example.service.EmailService">
        <property name="smtpHost" value="smtp.example.com"/>
        <property name="smtpPort" value="587"/>
    </bean>
    
    <!-- 集合类型注入 -->
    <bean id="notificationService" class="com.example.service.NotificationService">
        <property name="handlers">
            <list>
                <ref bean="emailHandler"/>
                <ref bean="smsHandler"/>
            </list>
        </property>
        <property name="config">
            <map>
                <entry key="timeout" value="30"/>
                <entry key="retries" value="3"/>
            </map>
        </property>
    </bean>
    
</beans>
```

### 注解配置方式

#### 1. 组件扫描

```java
@Configuration
@ComponentScan(basePackages = "com.example")
public class AppConfig {
    // 配置类
}
```

#### 2. 组件注解

```java
// 通用组件
@Component
public class UserValidator {
    public boolean validate(User user) {
        return user != null && user.getEmail() != null;
    }
}

// 服务层组件
@Service
public class UserService {
    // 服务逻辑
}

// 数据访问层组件
@Repository
public class UserRepositoryImpl implements UserRepository {
    // 数据访问逻辑
}

// 控制层组件
@Controller
public class UserController {
    // 控制器逻辑
}
```

#### 3. Bean 定义注解

```java
@Configuration
public class DatabaseConfig {
    
    @Bean
    @Primary
    public DataSource primaryDataSource() {
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl("jdbc:mysql://localhost:3306/primary");
        dataSource.setUsername("user");
        dataSource.setPassword("password");
        return dataSource;
    }
    
    @Bean
    @Qualifier("secondary")
    public DataSource secondaryDataSource() {
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl("jdbc:mysql://localhost:3306/secondary");
        dataSource.setUsername("user");
        dataSource.setPassword("password");
        return dataSource;
    }
    
    @Bean
    @ConditionalOnProperty(name = "cache.enabled", havingValue = "true")
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager("users", "products");
    }
}
```

---

## Bean 的生命周期

### 生命周期阶段

1. **实例化**：创建 Bean 实例
2. **属性填充**：设置 Bean 的属性值
3. **初始化**：调用初始化方法
4. **使用**：Bean 可以被应用程序使用
5. **销毁**：容器关闭时销毁 Bean

### 生命周期回调

#### 1. 初始化回调

```java
// 方式1：实现 InitializingBean 接口
@Component
public class UserService implements InitializingBean {
    
    @Override
    public void afterPropertiesSet() throws Exception {
        // 初始化逻辑
        System.out.println("UserService 初始化完成");
    }
}

// 方式2：使用 @PostConstruct 注解
@Component
public class EmailService {
    
    @PostConstruct
    public void init() {
        // 初始化逻辑
        System.out.println("EmailService 初始化完成");
    }
}

// 方式3：在 @Bean 注解中指定
@Configuration
public class AppConfig {
    
    @Bean(initMethod = "init")
    public SomeService someService() {
        return new SomeService();
    }
}

public class SomeService {
    public void init() {
        System.out.println("SomeService 初始化完成");
    }
}
```

#### 2. 销毁回调

```java
// 方式1：实现 DisposableBean 接口
@Component
public class UserService implements DisposableBean {
    
    @Override
    public void destroy() throws Exception {
        // 清理逻辑
        System.out.println("UserService 销毁");
    }
}

// 方式2：使用 @PreDestroy 注解
@Component
public class EmailService {
    
    @PreDestroy
    public void cleanup() {
        // 清理逻辑
        System.out.println("EmailService 销毁");
    }
}

// 方式3：在 @Bean 注解中指定
@Configuration
public class AppConfig {
    
    @Bean(destroyMethod = "cleanup")
    public SomeService someService() {
        return new SomeService();
    }
}
```

### BeanPostProcessor

```java
@Component
public class CustomBeanPostProcessor implements BeanPostProcessor {
    
    @Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
        System.out.println("Before initialization: " + beanName);
        return bean;
    }
    
    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
        System.out.println("After initialization: " + beanName);
        return bean;
    }
}
```

---

## Bean 的作用域

### 作用域类型

#### 1. Singleton（单例）

```java
@Component
@Scope("singleton") // 默认作用域
public class UserService {
    // 整个应用中只有一个实例
}
```

#### 2. Prototype（原型）

```java
@Component
@Scope("prototype")
public class UserCommand {
    // 每次请求都创建新实例
}
```

#### 3. Request（请求）

```java
@Component
@Scope("request")
public class RequestScopedBean {
    // 每个 HTTP 请求一个实例
}
```

#### 4. Session（会话）

```java
@Component
@Scope("session")
public class SessionScopedBean {
    // 每个 HTTP 会话一个实例
}
```

#### 5. Application（应用）

```java
@Component
@Scope("application")
public class ApplicationScopedBean {
    // 整个 Web 应用一个实例
}
```

### 自定义作用域

```java
@Component
public class ThreadLocalScope implements Scope {
    
    private final ThreadLocal<Map<String, Object>> threadLocal = new ThreadLocal<Map<String, Object>>() {
        @Override
        protected Map<String, Object> initialValue() {
            return new HashMap<>();
        }
    };
    
    @Override
    public Object get(String name, ObjectFactory<?> objectFactory) {
        Map<String, Object> scope = threadLocal.get();
        Object object = scope.get(name);
        if (object == null) {
            object = objectFactory.getObject();
            scope.put(name, object);
        }
        return object;
    }
    
    @Override
    public Object remove(String name) {
        Map<String, Object> scope = threadLocal.get();
        return scope.remove(name);
    }
    
    @Override
    public void registerDestructionCallback(String name, Runnable callback) {
        // 注册销毁回调
    }
    
    @Override
    public Object resolveContextualObject(String key) {
        return null;
    }
    
    @Override
    public String getConversationId() {
        return Thread.currentThread().getName();
    }
}

// 注册自定义作用域
@Configuration
public class ScopeConfig {
    
    @Bean
    public static CustomScopeConfigurer customScopeConfigurer() {
        CustomScopeConfigurer configurer = new CustomScopeConfigurer();
        configurer.addScope("thread", new ThreadLocalScope());
        return configurer;
    }
}

// 使用自定义作用域
@Component
@Scope("thread")
public class ThreadScopedBean {
    // 每个线程一个实例
}
```

---

## 依赖注入的方式

### @Autowired 注解

#### 1. 按类型自动装配

```java
@Service
public class UserService {
    
    @Autowired
    private UserRepository userRepository; // 按类型注入
    
    @Autowired
    private List<UserValidator> validators; // 注入所有 UserValidator 类型的 Bean
    
    @Autowired
    private Map<String, NotificationHandler> handlers; // 注入所有 NotificationHandler，key 为 Bean 名称
}
```

#### 2. 可选依赖

```java
@Service
public class UserService {
    
    @Autowired(required = false)
    private CacheManager cacheManager; // 可选依赖，如果不存在则为 null
    
    @Autowired
    private Optional<MetricsCollector> metricsCollector; // 使用 Optional 包装
}
```

### @Qualifier 注解

```java
@Service
public class UserService {
    
    @Autowired
    @Qualifier("primaryDataSource")
    private DataSource primaryDataSource;
    
    @Autowired
    @Qualifier("secondaryDataSource")
    private DataSource secondaryDataSource;
}

@Configuration
public class DataSourceConfig {
    
    @Bean
    @Qualifier("primaryDataSource")
    public DataSource primaryDataSource() {
        // 主数据源配置
        return new HikariDataSource();
    }
    
    @Bean
    @Qualifier("secondaryDataSource")
    public DataSource secondaryDataSource() {
        // 辅助数据源配置
        return new HikariDataSource();
    }
}
```

### @Primary 注解

```java
@Configuration
public class DataSourceConfig {
    
    @Bean
    @Primary // 当有多个相同类型的 Bean 时，优先选择这个
    public DataSource primaryDataSource() {
        return new HikariDataSource();
    }
    
    @Bean
    public DataSource secondaryDataSource() {
        return new HikariDataSource();
    }
}

@Service
public class UserService {
    
    @Autowired
    private DataSource dataSource; // 会注入 primaryDataSource
}
```

### @Resource 注解

```java
@Service
public class UserService {
    
    @Resource(name = "userRepository") // 按名称注入
    private UserRepository userRepository;
    
    @Resource // 按名称注入，名称为字段名
    private EmailService emailService;
}
```

---

## 自动装配

### 装配模式

#### 1. byName

```xml
<bean id="userService" class="com.example.UserService" autowire="byName">
    <!-- Spring 会查找名为 userRepository 的 Bean 并注入 -->
</bean>

<bean id="userRepository" class="com.example.UserRepositoryImpl"/>
```

#### 2. byType

```xml
<bean id="userService" class="com.example.UserService" autowire="byType">
    <!-- Spring 会查找 UserRepository 类型的 Bean 并注入 -->
</bean>

<bean id="userRepo" class="com.example.UserRepositoryImpl"/>
```

#### 3. constructor

```xml
<bean id="userService" class="com.example.UserService" autowire="constructor">
    <!-- Spring 会根据构造函数参数类型自动装配 -->
</bean>
```

### 排除自动装配

```java
@Component
public class UserService {
    
    @Autowired
    @Qualifier("exclude")
    private UserRepository userRepository;
}

@Repository
@Qualifier("exclude")
public class ExcludedUserRepository implements UserRepository {
    // 这个实现会被排除在自动装配之外
}
```

---

## 注解驱动开发

### 启用注解支持

```java
@Configuration
@EnableAutoConfiguration
@ComponentScan(basePackages = "com.example")
public class AppConfig {
    // 配置类
}
```

### 条件注解

#### 1. @Conditional

```java
public class DatabaseCondition implements Condition {
    
    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        return context.getEnvironment().getProperty("database.enabled", Boolean.class, false);
    }
}

@Configuration
public class DatabaseConfig {
    
    @Bean
    @Conditional(DatabaseCondition.class)
    public DataSource dataSource() {
        return new HikariDataSource();
    }
}
```

#### 2. Spring Boot 条件注解

```java
@Configuration
public class ConditionalConfig {
    
    @Bean
    @ConditionalOnProperty(name = "feature.enabled", havingValue = "true")
    public FeatureService featureService() {
        return new FeatureServiceImpl();
    }
    
    @Bean
    @ConditionalOnMissingBean(CacheManager.class)
    public CacheManager defaultCacheManager() {
        return new ConcurrentMapCacheManager();
    }
    
    @Bean
    @ConditionalOnClass(RedisTemplate.class)
    public RedisService redisService() {
        return new RedisServiceImpl();
    }
}
```

### Profile

```java
@Configuration
@Profile("development")
public class DevConfig {
    
    @Bean
    public DataSource dataSource() {
        // 开发环境数据源
        return new H2DataSource();
    }
}

@Configuration
@Profile("production")
public class ProdConfig {
    
    @Bean
    public DataSource dataSource() {
        // 生产环境数据源
        return new HikariDataSource();
    }
}

@Service
@Profile("!test") // 非测试环境
public class EmailService {
    // 邮件服务实现
}
```

---

## Java 配置

### 配置类

```java
@Configuration
public class AppConfig {
    
    @Bean
    public UserRepository userRepository() {
        return new JpaUserRepository();
    }
    
    @Bean
    public UserService userService() {
        return new UserService(userRepository(), emailService());
    }
    
    @Bean
    public EmailService emailService() {
        EmailService service = new EmailService();
        service.setSmtpHost("smtp.example.com");
        service.setSmtpPort(587);
        return service;
    }
}
```

### 导入配置

```java
@Configuration
@Import({DatabaseConfig.class, SecurityConfig.class})
public class AppConfig {
    // 主配置类
}

@Configuration
public class DatabaseConfig {
    // 数据库相关配置
}

@Configuration
public class SecurityConfig {
    // 安全相关配置
}
```

### 配置属性

```java
@Configuration
@PropertySource("classpath:application.properties")
public class AppConfig {
    
    @Value("${database.url}")
    private String databaseUrl;
    
    @Value("${database.username}")
    private String databaseUsername;
    
    @Bean
    public DataSource dataSource() {
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl(databaseUrl);
        dataSource.setUsername(databaseUsername);
        return dataSource;
    }
}
```

---

## 高级特性

### 1. 循环依赖处理

```java
// 问题：循环依赖
@Service
public class ServiceA {
    @Autowired
    private ServiceB serviceB;
}

@Service
public class ServiceB {
    @Autowired
    private ServiceA serviceA;
}

// 解决方案1：使用 @Lazy 注解
@Service
public class ServiceA {
    @Autowired
    @Lazy
    private ServiceB serviceB;
}

// 解决方案2：使用 Setter 注入
@Service
public class ServiceA {
    private ServiceB serviceB;
    
    @Autowired
    public void setServiceB(ServiceB serviceB) {
        this.serviceB = serviceB;
    }
}

// 解决方案3：重新设计，避免循环依赖
@Service
public class ServiceC {
    // 提取公共逻辑，避免循环依赖
}
```

### 2. 懒加载

```java
@Component
@Lazy // Bean 在第一次使用时才创建
public class ExpensiveService {
    
    public ExpensiveService() {
        System.out.println("创建 ExpensiveService，这是一个耗时操作");
    }
}

@Service
public class UserService {
    
    @Autowired
    @Lazy // 注入点也需要标记为懒加载
    private ExpensiveService expensiveService;
    
    public void someMethod() {
        // 只有在这里调用时，ExpensiveService 才会被创建
        expensiveService.doSomething();
    }
}
```

### 3. 工厂 Bean

```java
@Component
public class ConnectionFactoryBean implements FactoryBean<Connection> {
    
    @Override
    public Connection getObject() throws Exception {
        // 创建复杂的 Connection 对象
        return DriverManager.getConnection("jdbc:mysql://localhost:3306/db");
    }
    
    @Override
    public Class<?> getObjectType() {
        return Connection.class;
    }
    
    @Override
    public boolean isSingleton() {
        return false; // 每次调用都创建新的连接
    }
}

@Service
public class DatabaseService {
    
    @Autowired
    private Connection connection; // 注入的是 FactoryBean 创建的对象
    
    @Autowired
    @Qualifier("&connectionFactoryBean")
    private FactoryBean<Connection> factoryBean; // 注入 FactoryBean 本身
}
```

### 4. 事件机制

```java
// 自定义事件
public class UserRegisteredEvent extends ApplicationEvent {
    private final User user;
    
    public UserRegisteredEvent(Object source, User user) {
        super(source);
        this.user = user;
    }
    
    public User getUser() {
        return user;
    }
}

// 事件发布者
@Service
public class UserService {
    
    @Autowired
    private ApplicationEventPublisher eventPublisher;
    
    public User registerUser(User user) {
        User savedUser = userRepository.save(user);
        
        // 发布事件
        eventPublisher.publishEvent(new UserRegisteredEvent(this, savedUser));
        
        return savedUser;
    }
}

// 事件监听器
@Component
public class UserEventListener {
    
    @EventListener
    public void handleUserRegistered(UserRegisteredEvent event) {
        User user = event.getUser();
        System.out.println("用户注册成功：" + user.getUsername());
        // 发送欢迎邮件等后续处理
    }
    
    @EventListener
    @Async // 异步处理
    public void handleUserRegisteredAsync(UserRegisteredEvent event) {
        // 异步处理逻辑
    }
}
```

---

## 最佳实践

### 1. 依赖注入最佳实践

```java
// 推荐：使用构造函数注入
@Service
public class UserService {
    private final UserRepository userRepository;
    private final EmailService emailService;
    
    public UserService(UserRepository userRepository, EmailService emailService) {
        this.userRepository = userRepository;
        this.emailService = emailService;
    }
}

// 避免：字段注入（测试困难）
@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private EmailService emailService;
}
```

### 2. Bean 命名规范

```java
// 推荐：使用有意义的名称
@Component("userValidator")
public class UserValidator {
    // ...
}

@Bean("primaryDataSource")
public DataSource primaryDataSource() {
    // ...
}

// 避免：使用默认名称或无意义名称
@Component
public class Validator {
    // ...
}
```

### 3. 配置组织

```java
// 推荐：按功能模块组织配置
@Configuration
public class DatabaseConfig {
    // 数据库相关配置
}

@Configuration
public class SecurityConfig {
    // 安全相关配置
}

@Configuration
public class CacheConfig {
    // 缓存相关配置
}

// 主配置类
@Configuration
@Import({DatabaseConfig.class, SecurityConfig.class, CacheConfig.class})
public class AppConfig {
    // 主要配置
}
```

### 4. 测试友好的设计

```java
@Service
public class UserService {
    private final UserRepository userRepository;
    private final EmailService emailService;
    
    // 构造函数注入便于测试
    public UserService(UserRepository userRepository, EmailService emailService) {
        this.userRepository = userRepository;
        this.emailService = emailService;
    }
}

// 测试类
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private EmailService emailService;
    
    @InjectMocks
    private UserService userService;
    
    @Test
    void shouldCreateUser() {
        // 测试逻辑
    }
}
```

### 5. 性能优化

```java
// 使用懒加载避免不必要的初始化
@Component
@Lazy
public class ExpensiveService {
    // 耗时的初始化逻辑
}

// 使用 @Primary 避免歧义
@Configuration
public class DataSourceConfig {
    
    @Bean
    @Primary
    public DataSource primaryDataSource() {
        return new HikariDataSource();
    }
    
    @Bean
    public DataSource secondaryDataSource() {
        return new HikariDataSource();
    }
}

// 合理使用作用域
@Component
@Scope("prototype") // 对于有状态的对象使用原型作用域
public class StatefulService {
    private String state;
    // ...
}
```

---

## 总结

Spring IoC 容器是 Spring 框架的核心，它通过控制反转和依赖注入的设计模式，实现了对象之间的松耦合。主要特点包括：

### 核心优势

1. **松耦合**：对象之间的依赖关系由容器管理
2. **可测试性**：便于进行单元测试和集成测试
3. **灵活性**：支持多种配置方式和注入方式
4. **可维护性**：集中管理对象的创建和配置
5. **扩展性**：支持自定义作用域、后处理器等扩展

### 最佳实践总结

1. **优先使用构造函数注入**：保证依赖的不可变性和必需性
2. **合理使用作用域**：根据对象的生命周期选择合适的作用域
3. **避免循环依赖**：通过重新设计或使用懒加载解决
4. **使用有意义的命名**：提高代码的可读性和可维护性
5. **按功能模块组织配置**：保持配置的清晰和可管理性

Spring IoC 容器为现代 Java 应用开发提供了强大的基础设施，通过合理使用其特性，可以构建出高质量、可维护、可扩展的应用程序。