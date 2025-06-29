# Spring Boot 详细指南

## 概述

Spring Boot 是由 Pivotal 团队提供的全新框架，其设计目的是用来简化新 Spring 应用的初始搭建以及开发过程。该框架使用了特定的方式来进行配置，从而使开发人员不再需要定义样板化的配置。

## 目录

1. [Spring Boot 简介](#spring-boot-简介)
2. [核心理念](#核心理念)
3. [基本组成](#基本组成)
4. [自动配置原理](#自动配置原理)
5. [起步依赖](#起步依赖)
6. [配置管理](#配置管理)
7. [Web 开发](#web-开发)
8. [数据访问](#数据访问)
9. [安全管理](#安全管理)
10. [监控与管理](#监控与管理)
11. [部署与运维](#部署与运维)
12. [最佳实践](#最佳实践)

---

## Spring Boot 简介

### 什么是 Spring Boot

Spring Boot 是 Spring 项目的一个子项目，它通过提供默认配置来简化 Spring 应用程序的开发。Spring Boot 的目标是让开发者能够快速创建独立的、生产级别的基于 Spring 的应用程序。

### Spring Boot 的历史

- **2013年**：Spring Boot 项目启动
- **2014年**：Spring Boot 1.0 正式发布
- **2018年**：Spring Boot 2.0 发布，基于 Spring 5.0
- **2022年**：Spring Boot 3.0 发布，基于 Spring 6.0 和 Java 17

### Spring Boot 的优势

1. **快速开发**：提供大量的自动配置，减少样板代码
2. **独立运行**：内嵌 Tomcat、Jetty 等服务器，可以独立运行
3. **生产就绪**：提供健康检查、指标监控、外部化配置等生产特性
4. **无代码生成**：不生成代码，也不需要 XML 配置
5. **丰富的生态**：与 Spring 生态系统完美集成

---

## 核心理念

### 1. 约定优于配置（Convention over Configuration）

Spring Boot 通过合理的默认配置，减少了开发者需要做的配置工作。例如：

```java
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

这个简单的类就能启动一个完整的 Spring 应用程序。

### 2. 开箱即用（Out of the Box）

Spring Boot 提供了大量的起步依赖（Starter），开发者只需要添加相应的依赖，就能获得完整的功能。

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

### 3. 生产就绪（Production Ready）

Spring Boot 提供了许多生产环境需要的特性：

- 健康检查
- 指标监控
- 外部化配置
- 日志管理
- 安全管理

---

## 基本组成

### 1. Spring Boot Starter

Starter 是 Spring Boot 的核心组成部分，它是一组依赖描述符，可以获得相关技术的一站式服务。

#### 常用 Starter

```xml
<!-- Web 开发 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<!-- 数据访问 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>

<!-- 安全管理 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<!-- 测试支持 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
```

### 2. 自动配置（Auto Configuration）

自动配置是 Spring Boot 的核心特性，它会根据类路径中的依赖自动配置 Spring 应用程序。

```java
@Configuration
@ConditionalOnClass(DataSource.class)
@EnableConfigurationProperties(DataSourceProperties.class)
public class DataSourceAutoConfiguration {
    
    @Bean
    @ConditionalOnMissingBean
    public DataSource dataSource(DataSourceProperties properties) {
        return DataSourceBuilder.create()
                .driverClassName(properties.getDriverClassName())
                .url(properties.getUrl())
                .username(properties.getUsername())
                .password(properties.getPassword())
                .build();
    }
}
```

### 3. 内嵌服务器

Spring Boot 内嵌了多种服务器，默认使用 Tomcat：

```java
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
        // 应用启动后，内嵌的 Tomcat 服务器也会启动
    }
}
```

可以通过配置切换到其他服务器：

```xml
<!-- 排除默认的 Tomcat -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <exclusions>
        <exclusion>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-tomcat</artifactId>
        </exclusion>
    </exclusions>
</dependency>

<!-- 使用 Jetty -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-jetty</artifactId>
</dependency>
```

### 4. Actuator（监控端点）

Actuator 提供了生产就绪的特性，如健康检查、指标监控等：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: always
```

---

## 自动配置原理

### 1. @SpringBootApplication 注解

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Inherited
@SpringBootConfiguration
@EnableAutoConfiguration
@ComponentScan(excludeFilters = { @Filter(type = FilterType.CUSTOM, classes = TypeExcludeFilter.class),
		@Filter(type = FilterType.CUSTOM, classes = AutoConfigurationExcludeFilter.class) })
public @interface SpringBootApplication {
    // ...
}
```

这个注解包含了三个重要的注解：
- `@SpringBootConfiguration`：标识这是一个配置类
- `@EnableAutoConfiguration`：启用自动配置
- `@ComponentScan`：启用组件扫描

### 2. 自动配置的工作原理

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Inherited
@AutoConfigurationPackage
@Import(AutoConfigurationImportSelector.class)
public @interface EnableAutoConfiguration {
    // ...
}
```

`AutoConfigurationImportSelector` 会读取 `META-INF/spring.factories` 文件中的配置类：

```properties
# spring.factories
org.springframework.boot.autoconfigure.EnableAutoConfiguration=\
org.springframework.boot.autoconfigure.admin.SpringApplicationAdminJmxAutoConfiguration,\
org.springframework.boot.autoconfigure.aop.AopAutoConfiguration,\
org.springframework.boot.autoconfigure.amqp.RabbitAutoConfiguration,\
...
```

### 3. 条件注解

Spring Boot 使用条件注解来决定是否应用某个配置：

```java
@Configuration
@ConditionalOnClass(RedisOperations.class)
@EnableConfigurationProperties(RedisProperties.class)
@Import({ LettuceConnectionConfiguration.class, JedisConnectionConfiguration.class })
public class RedisAutoConfiguration {
    
    @Bean
    @ConditionalOnMissingBean(name = "redisTemplate")
    public RedisTemplate<Object, Object> redisTemplate(RedisConnectionFactory redisConnectionFactory) {
        RedisTemplate<Object, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(redisConnectionFactory);
        return template;
    }
}
```

常用的条件注解：
- `@ConditionalOnClass`：当类路径中存在指定类时
- `@ConditionalOnMissingBean`：当容器中不存在指定 Bean 时
- `@ConditionalOnProperty`：当指定属性存在时
- `@ConditionalOnWebApplication`：当是 Web 应用时

---

## 起步依赖

### 1. Web 开发起步依赖

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

这个依赖包含了：
- Spring MVC
- 内嵌 Tomcat
- Jackson（JSON 处理）
- Validation（数据校验）

### 2. 数据访问起步依赖

```xml
<!-- JPA -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>

<!-- Redis -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>

<!-- MongoDB -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-mongodb</artifactId>
</dependency>
```

### 3. 自定义 Starter

创建自定义 Starter 的步骤：

1. **创建自动配置类**

```java
@Configuration
@ConditionalOnClass(MyService.class)
@EnableConfigurationProperties(MyProperties.class)
public class MyAutoConfiguration {
    
    @Bean
    @ConditionalOnMissingBean
    public MyService myService(MyProperties properties) {
        return new MyService(properties);
    }
}
```

2. **创建属性配置类**

```java
@ConfigurationProperties(prefix = "my.service")
public class MyProperties {
    private String name = "default";
    private int timeout = 30;
    
    // getters and setters
}
```

3. **创建 spring.factories 文件**

```properties
# META-INF/spring.factories
org.springframework.boot.autoconfigure.EnableAutoConfiguration=\
com.example.MyAutoConfiguration
```

---

## 配置管理

### 1. 配置文件

Spring Boot 支持多种配置文件格式：

#### application.properties
```properties
# 服务器配置
server.port=8080
server.servlet.context-path=/api

# 数据库配置
spring.datasource.url=jdbc:mysql://localhost:3306/mydb
spring.datasource.username=root
spring.datasource.password=password

# 日志配置
logging.level.com.example=DEBUG
logging.file.name=app.log
```

#### application.yml
```yaml
server:
  port: 8080
  servlet:
    context-path: /api

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/mydb
    username: root
    password: password
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true

logging:
  level:
    com.example: DEBUG
  file:
    name: app.log
```

### 2. 多环境配置

```yaml
# application.yml
spring:
  profiles:
    active: dev

---
# application-dev.yml
spring:
  config:
    activate:
      on-profile: dev
  datasource:
    url: jdbc:h2:mem:devdb

---
# application-prod.yml
spring:
  config:
    activate:
      on-profile: prod
  datasource:
    url: jdbc:mysql://prod-server:3306/proddb
```

### 3. 配置属性绑定

```java
@ConfigurationProperties(prefix = "app")
@Component
public class AppProperties {
    private String name;
    private String version;
    private Database database = new Database();
    
    public static class Database {
        private String url;
        private String username;
        private String password;
        
        // getters and setters
    }
    
    // getters and setters
}
```

```yaml
app:
  name: MyApplication
  version: 1.0.0
  database:
    url: jdbc:mysql://localhost:3306/mydb
    username: root
    password: password
```

### 4. 外部化配置

Spring Boot 支持多种外部化配置方式，优先级从高到低：

1. 命令行参数
2. 系统环境变量
3. application-{profile}.properties/yml
4. application.properties/yml
5. @PropertySource 注解
6. 默认属性

```bash
# 命令行参数
java -jar app.jar --server.port=9090 --spring.profiles.active=prod

# 环境变量
export SERVER_PORT=9090
export SPRING_PROFILES_ACTIVE=prod
```

---

## Web 开发

### 1. RESTful API 开发

```java
@RestController
@RequestMapping("/api/users")
@Validated
public class UserController {
    
    @Autowired
    private UserService userService;
    
    @GetMapping
    public ResponseEntity<Page<User>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<User> users = userService.findAll(pageable);
        return ResponseEntity.ok(users);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(@PathVariable Long id) {
        return userService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody @Valid CreateUserRequest request) {
        User user = userService.create(request);
        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(user.getId())
                .toUri();
        return ResponseEntity.created(location).body(user);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(
            @PathVariable Long id,
            @RequestBody @Valid UpdateUserRequest request) {
        return userService.update(id, request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if (userService.delete(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
```

### 2. 数据校验

```java
public class CreateUserRequest {
    
    @NotBlank(message = "用户名不能为空")
    @Size(min = 3, max = 20, message = "用户名长度必须在3-20之间")
    private String username;
    
    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String email;
    
    @NotBlank(message = "密码不能为空")
    @Size(min = 6, message = "密码长度不能少于6位")
    private String password;
    
    @Min(value = 18, message = "年龄不能小于18岁")
    @Max(value = 100, message = "年龄不能大于100岁")
    private Integer age;
    
    // getters and setters
}
```

### 3. 异常处理

```java
@ControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(UserNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleUserNotFound(UserNotFoundException ex) {
        return ErrorResponse.builder()
                .code("USER_NOT_FOUND")
                .message(ex.getMessage())
                .timestamp(LocalDateTime.now())
                .build();
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error -> 
            errors.put(error.getField(), error.getDefaultMessage()));
        
        return ErrorResponse.builder()
                .code("VALIDATION_ERROR")
                .message("请求参数校验失败")
                .details(errors)
                .timestamp(LocalDateTime.now())
                .build();
    }
    
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleGeneral(Exception ex) {
        return ErrorResponse.builder()
                .code("INTERNAL_ERROR")
                .message("服务器内部错误")
                .timestamp(LocalDateTime.now())
                .build();
    }
}
```

### 4. 跨域配置

```java
@Configuration
public class CorsConfig {
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

---

## 数据访问

### 1. JPA 数据访问

```java
@Entity
@Table(name = "users")
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false)
    private String username;
    
    @Column(unique = true, nullable = false)
    private String email;
    
    @Column(nullable = false)
    private String password;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
    
    // constructors, getters and setters
}
```

```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    Optional<User> findByUsername(String username);
    
    Optional<User> findByEmail(String email);
    
    @Query("SELECT u FROM User u WHERE u.createdAt >= :startDate")
    List<User> findUsersCreatedAfter(@Param("startDate") LocalDateTime startDate);
    
    @Modifying
    @Query("UPDATE User u SET u.email = :email WHERE u.id = :id")
    int updateUserEmail(@Param("id") Long id, @Param("email") String email);
}
```

### 2. Redis 数据访问

```java
@Service
public class CacheService {
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    @Autowired
    private StringRedisTemplate stringRedisTemplate;
    
    public void set(String key, Object value, long timeout, TimeUnit unit) {
        redisTemplate.opsForValue().set(key, value, timeout, unit);
    }
    
    public Object get(String key) {
        return redisTemplate.opsForValue().get(key);
    }
    
    public void delete(String key) {
        redisTemplate.delete(key);
    }
    
    public void setString(String key, String value) {
        stringRedisTemplate.opsForValue().set(key, value);
    }
    
    public String getString(String key) {
        return stringRedisTemplate.opsForValue().get(key);
    }
}
```

### 3. 事务管理

```java
@Service
@Transactional
public class UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private EmailService emailService;
    
    @Transactional(rollbackFor = Exception.class)
    public User createUser(CreateUserRequest request) {
        // 检查用户名是否已存在
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new UserAlreadyExistsException("用户名已存在");
        }
        
        // 创建用户
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        
        User savedUser = userRepository.save(user);
        
        // 发送欢迎邮件
        emailService.sendWelcomeEmail(savedUser.getEmail());
        
        return savedUser;
    }
    
    @Transactional(readOnly = true)
    public Page<User> findAll(Pageable pageable) {
        return userRepository.findAll(pageable);
    }
}
```

---

## 安全管理

### 1. Spring Security 集成

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
```

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf().disable()
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/users").hasRole("USER")
                .requestMatchers(HttpMethod.POST, "/api/users").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
    
    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter();
    }
}
```

### 2. JWT 认证

```java
@Service
public class JwtService {
    
    private final String secretKey = "mySecretKey";
    private final long jwtExpiration = 86400000; // 24 hours
    
    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        return createToken(claims, userDetails.getUsername());
    }
    
    private String createToken(Map<String, Object> claims, String subject) {
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(SignatureAlgorithm.HS512, secretKey)
                .compact();
    }
    
    public Boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }
    
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }
    
    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }
    
    private Claims extractAllClaims(String token) {
        return Jwts.parser().setSigningKey(secretKey).parseClaimsJws(token).getBody();
    }
    
    private Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }
    
    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }
}
```

---

## 监控与管理

### 1. Actuator 端点

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus,env
      base-path: /actuator
  endpoint:
    health:
      show-details: always
      show-components: always
  info:
    env:
      enabled: true
  metrics:
    export:
      prometheus:
        enabled: true
```

### 2. 自定义健康检查

```java
@Component
public class DatabaseHealthIndicator implements HealthIndicator {
    
    @Autowired
    private DataSource dataSource;
    
    @Override
    public Health health() {
        try (Connection connection = dataSource.getConnection()) {
            if (connection.isValid(1)) {
                return Health.up()
                        .withDetail("database", "Available")
                        .withDetail("validationQuery", "SELECT 1")
                        .build();
            } else {
                return Health.down()
                        .withDetail("database", "Not responding")
                        .build();
            }
        } catch (Exception e) {
            return Health.down()
                    .withDetail("database", "Connection failed")
                    .withException(e)
                    .build();
        }
    }
}
```

### 3. 自定义指标

```java
@Service
public class UserService {
    
    private final MeterRegistry meterRegistry;
    private final Counter userCreationCounter;
    private final Timer userQueryTimer;
    
    public UserService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.userCreationCounter = Counter.builder("user.creation")
                .description("Number of users created")
                .register(meterRegistry);
        this.userQueryTimer = Timer.builder("user.query")
                .description("User query duration")
                .register(meterRegistry);
    }
    
    public User createUser(CreateUserRequest request) {
        userCreationCounter.increment();
        // 创建用户逻辑
        return user;
    }
    
    public User findById(Long id) {
        return userQueryTimer.recordCallable(() -> {
            // 查询用户逻辑
            return userRepository.findById(id).orElse(null);
        });
    }
}
```

---

## 部署与运维

### 1. 打包部署

```xml
<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
            <configuration>
                <excludes>
                    <exclude>
                        <groupId>org.projectlombok</groupId>
                        <artifactId>lombok</artifactId>
                    </exclude>
                </excludes>
            </configuration>
        </plugin>
    </plugins>
</build>
```

```bash
# 打包
mvn clean package

# 运行
java -jar target/myapp-1.0.0.jar

# 指定配置文件
java -jar target/myapp-1.0.0.jar --spring.config.location=classpath:/application-prod.yml

# 指定 JVM 参数
java -Xms512m -Xmx1024m -jar target/myapp-1.0.0.jar
```

### 2. Docker 部署

```dockerfile
# Dockerfile
FROM openjdk:17-jre-slim

VOLUME /tmp

COPY target/myapp-1.0.0.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app.jar"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=docker
      - SPRING_DATASOURCE_URL=jdbc:mysql://db:3306/myapp
    depends_on:
      - db
  
  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=myapp
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

### 3. 日志管理

```yaml
# logback-spring.xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <springProfile name="!prod">
        <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
            <encoder>
                <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
            </encoder>
        </appender>
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>
    
    <springProfile name="prod">
        <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
            <file>logs/application.log</file>
            <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
                <fileNamePattern>logs/application.%d{yyyy-MM-dd}.%i.log</fileNamePattern>
                <timeBasedFileNamingAndTriggeringPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedFNATP">
                    <maxFileSize>100MB</maxFileSize>
                </timeBasedFileNamingAndTriggeringPolicy>
                <maxHistory>30</maxHistory>
            </rollingPolicy>
            <encoder>
                <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
            </encoder>
        </appender>
        <root level="INFO">
            <appender-ref ref="FILE"/>
        </root>
    </springProfile>
</configuration>
```

---

## 最佳实践

### 1. 项目结构

```
src/
├── main/
│   ├── java/
│   │   └── com/
│   │       └── example/
│   │           └── myapp/
│   │               ├── MyAppApplication.java
│   │               ├── config/
│   │               │   ├── SecurityConfig.java
│   │               │   └── DatabaseConfig.java
│   │               ├── controller/
│   │               │   └── UserController.java
│   │               ├── service/
│   │               │   ├── UserService.java
│   │               │   └── impl/
│   │               │       └── UserServiceImpl.java
│   │               ├── repository/
│   │               │   └── UserRepository.java
│   │               ├── entity/
│   │               │   └── User.java
│   │               ├── dto/
│   │               │   ├── request/
│   │               │   │   └── CreateUserRequest.java
│   │               │   └── response/
│   │               │       └── UserResponse.java
│   │               └── exception/
│   │                   ├── GlobalExceptionHandler.java
│   │                   └── UserNotFoundException.java
│   └── resources/
│       ├── application.yml
│       ├── application-dev.yml
│       ├── application-prod.yml
│       └── logback-spring.xml
└── test/
    └── java/
        └── com/
            └── example/
                └── myapp/
                    ├── MyAppApplicationTests.java
                    ├── controller/
                    │   └── UserControllerTest.java
                    └── service/
                        └── UserServiceTest.java
```

### 2. 配置管理最佳实践

```java
// 使用 @ConfigurationProperties 而不是 @Value
@ConfigurationProperties(prefix = "app")
@Data
@Component
public class AppProperties {
    private String name;
    private String version;
    private Security security = new Security();
    
    @Data
    public static class Security {
        private String jwtSecret;
        private long jwtExpiration;
    }
}
```

### 3. 异常处理最佳实践

```java
// 自定义业务异常
public class BusinessException extends RuntimeException {
    private final String code;
    
    public BusinessException(String code, String message) {
        super(message);
        this.code = code;
    }
    
    public String getCode() {
        return code;
    }
}

// 统一异常处理
@ControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException ex) {
        ErrorResponse error = ErrorResponse.builder()
                .code(ex.getCode())
                .message(ex.getMessage())
                .timestamp(LocalDateTime.now())
                .build();
        return ResponseEntity.badRequest().body(error);
    }
}
```

### 4. 测试最佳实践

```java
@SpringBootTest
@TestPropertySource(locations = "classpath:application-test.properties")
class UserServiceTest {
    
    @Autowired
    private UserService userService;
    
    @MockBean
    private UserRepository userRepository;
    
    @Test
    void shouldCreateUserSuccessfully() {
        // Given
        CreateUserRequest request = new CreateUserRequest();
        request.setUsername("testuser");
        request.setEmail("test@example.com");
        
        User savedUser = new User();
        savedUser.setId(1L);
        savedUser.setUsername("testuser");
        
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        
        // When
        User result = userService.createUser(request);
        
        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getUsername()).isEqualTo("testuser");
    }
}
```

---

## 总结

Spring Boot 通过其强大的自动配置、丰富的起步依赖和生产就绪的特性，极大地简化了 Spring 应用程序的开发和部署。它不仅提高了开发效率，还降低了学习成本，使得开发者能够专注于业务逻辑的实现。

### 核心优势总结

1. **简化配置**：通过自动配置减少样板代码
2. **快速开发**：丰富的起步依赖和约定优于配置
3. **生产就绪**：内置监控、健康检查、指标收集等特性
4. **灵活部署**：支持传统部署和容器化部署
5. **丰富生态**：与 Spring 生态系统完美集成

### 学习建议

1. **掌握核心概念**：理解自动配置、起步依赖的工作原理
2. **实践项目开发**：通过实际项目加深理解
3. **学习最佳实践**：关注代码质量和架构设计
4. **深入源码**：理解 Spring Boot 的实现机制
5. **关注生态发展**：跟上 Spring Boot 的版本更新

Spring Boot 作为现代 Java 开发的首选框架，为构建企业级应用提供了完整的解决方案。通过合理使用其特性和遵循最佳实践，开发者可以构建出高质量、可维护、可扩展的应用程序。