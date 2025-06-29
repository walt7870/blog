# 门面模式 (Facade Pattern)

## 概述

门面模式（Facade Pattern）为子系统中的一组接口提供一个统一的高层接口，使得子系统更易使用。它通过引入一个门面类，屏蔽了子系统的复杂性，客户端只需与门面对象交互，无需了解系统内部的细节。

简单说，就是用一个"门面"把复杂的子系统包装起来，对外提供简单易用的接口，让客户端使用起来更方便。

门面模式通过封装复杂的子系统调用，提供统一的高层接口，适用于简化复杂系统交互、降低系统耦合度的场景，是面向接口编程和分层架构设计的重要实践。

门面模式不仅适用于简化API调用，在实际工程中，它广泛应用于框架设计、第三方库封装、微服务网关等场景，并可与适配器、单例等模式组合使用，构建易用且稳定的系统架构。

## 使用场景

- 需要为复杂子系统提供简单入口时；

- 客户端与多个子系统存在大量交互，需要简化调用；

- 希望降低子系统之间的耦合度；

- 需要构建分层结构的系统；

- 第三方库封装，提供更友好的API；

- 微服务架构中的API网关设计。

## 类图结构

```plaintext
┌────────────┐      ┌────────────┐
│  Client    │─────▶│  Facade    │
└────────────┘      └─────┬──────┘
                          │
        ┌─────────────────┴──────────────┐
        │                                │
  ┌────────────┐                 ┌────────────┐
  │ SubSystemA │                 │ SubSystemB │
  └────────────┘                 └────────────┘
        │                                │
  ┌────────────┐                 ┌────────────┐
  │ SubSystemC │                 │ SubSystemD │
  └────────────┘                 └────────────┘
```

- **Client**：客户端，使用门面提供的高层接口
- **Facade**：门面类，统一对外接口，封装子系统调用逻辑
- **SubSystem**：子系统类，包含实际业务逻辑的各个组件

## 示例

### 示例1：家庭影院系统

**场景描述**：家庭影院包含DVD播放器、投影仪、音响、灯光等多个子系统，用户希望通过简单操作就能"看电影"或"关闭影院"。

```java
// 子系统A - DVD播放器
public class DVDPlayer {
    public void on() {
        System.out.println("DVD 播放器打开");
    }
    
    public void play(String movie) {
        System.out.println("DVD 播放电影：" + movie);
    }
    
    public void stop() {
        System.out.println("DVD 停止播放");
    }
    
    public void off() {
        System.out.println("DVD 播放器关闭");
    }
}

// 子系统B - 投影仪
public class Projector {
    public void on() {
        System.out.println("投影仪打开");
    }
    
    public void setInput(String input) {
        System.out.println("投影仪设置输入源：" + input);
    }
    
    public void off() {
        System.out.println("投影仪关闭");
    }
}

// 子系统C - 音响系统
public class SoundSystem {
    public void on() {
        System.out.println("音响系统打开");
    }
    
    public void setVolume(int volume) {
        System.out.println("音响音量设置为：" + volume);
    }
    
    public void off() {
        System.out.println("音响系统关闭");
    }
}

// 子系统D - 灯光控制
public class LightControl {
    public void dim(int level) {
        System.out.println("灯光调暗至：" + level + "%");
    }
    
    public void on() {
        System.out.println("灯光打开");
    }
}

// 门面类 - 家庭影院门面
public class HomeTheaterFacade {
    private DVDPlayer dvd;
    private Projector projector;
    private SoundSystem soundSystem;
    private LightControl lights;
    
    public HomeTheaterFacade(DVDPlayer dvd, Projector projector, 
                           SoundSystem soundSystem, LightControl lights) {
        this.dvd = dvd;
        this.projector = projector;
        this.soundSystem = soundSystem;
        this.lights = lights;
    }
    
    // 高层接口：观看电影
    public void watchMovie(String movie) {
        System.out.println("准备观看电影...");
        lights.dim(10);
        projector.on();
        projector.setInput("DVD");
        soundSystem.on();
        soundSystem.setVolume(5);
        dvd.on();
        dvd.play(movie);
        System.out.println("电影开始，请享受！");
    }
    
    // 高层接口：结束电影
    public void endMovie() {
        System.out.println("关闭影院...");
        dvd.stop();
        dvd.off();
        soundSystem.off();
        projector.off();
        lights.on();
        System.out.println("影院已关闭");
    }
    
    // 高层接口：听音乐模式
    public void listenToMusic() {
        System.out.println("准备听音乐...");
        lights.dim(30);
        soundSystem.on();
        soundSystem.setVolume(8);
        System.out.println("音乐模式已开启");
    }
}

// 客户端
public class Client {
    public static void main(String[] args) {
        // 创建子系统
        DVDPlayer dvd = new DVDPlayer();
        Projector projector = new Projector();
        SoundSystem soundSystem = new SoundSystem();
        LightControl lights = new LightControl();
        
        // 创建门面
        HomeTheaterFacade homeTheater = new HomeTheaterFacade(
            dvd, projector, soundSystem, lights);
        
        // 简单调用
        homeTheater.watchMovie("阿凡达");
        System.out.println("\n--- 2小时后 ---\n");
        homeTheater.endMovie();
        
        System.out.println("\n--- 切换到音乐模式 ---\n");
        homeTheater.listenToMusic();
    }
}
```

### 示例2：计算机启动门面

**场景描述**：计算机启动涉及CPU、内存、硬盘等多个硬件子系统的初始化，用户只需要按一个开机键。

```java
// CPU子系统
public class CPU {
    public void freeze() {
        System.out.println("CPU 冻结");
    }
    
    public void jump(long position) {
        System.out.println("CPU 跳转到位置：" + position);
    }
    
    public void execute() {
        System.out.println("CPU 执行指令");
    }
}

// 内存子系统
public class Memory {
    public void load(long position, byte[] data) {
        System.out.println("内存加载数据到位置：" + position + 
                         "，数据大小：" + data.length + " bytes");
    }
}

// 硬盘子系统
public class HardDrive {
    public byte[] read(long lba, int size) {
        System.out.println("硬盘读取 LBA：" + lba + "，大小：" + size + " bytes");
        return new byte[size];
    }
}

// 计算机门面
public class ComputerFacade {
    private static final long BOOT_ADDRESS = 0x00;
    private static final long BOOT_SECTOR = 0x00;
    private static final int SECTOR_SIZE = 512;
    
    private CPU cpu;
    private Memory memory;
    private HardDrive hardDrive;
    
    public ComputerFacade() {
        this.cpu = new CPU();
        this.memory = new Memory();
        this.hardDrive = new HardDrive();
    }
    
    // 高层接口：启动计算机
    public void start() {
        System.out.println("=== 计算机启动中 ===");
        cpu.freeze();
        byte[] bootData = hardDrive.read(BOOT_SECTOR, SECTOR_SIZE);
        memory.load(BOOT_ADDRESS, bootData);
        cpu.jump(BOOT_ADDRESS);
        cpu.execute();
        System.out.println("=== 计算机启动完成 ===");
    }
}

// 客户端
public class BootClient {
    public static void main(String[] args) {
        ComputerFacade computer = new ComputerFacade();
        computer.start(); // 一键启动
    }
}
```

## 优缺点分析

### ✅ 优点

| 优点                | 说明                                     |
| ------------------- | ---------------------------------------- |
| **1. 简化调用流程**   | 客户端只需与门面交互，大大降低使用复杂度   |
| **2. 降低耦合度**    | 客户端与子系统解耦，减少依赖关系           |
| **3. 更好的分层**    | 有利于系统分层和职责划分，提高可维护性     |
| **4. 提高复用性**    | 门面可以被多个客户端复用                   |
| **5. 易于扩展**      | 新增子系统功能时，只需修改门面类           |
| **6. 符合迪米特法则** | 客户端只与直接朋友（门面）交互             |

### ❌ 缺点

| 缺点                | 说明                                     |
| ------------------- | ---------------------------------------- |
| **1. 可能过度简化**   | 门面过多可能导致系统结构僵化，失去灵活性   |
| **2. 不利于个性化**  | 统一接口可能无法满足所有客户端的特殊需求   |
| **3. 违反开闭原则**  | 新增子系统功能时需要修改门面类             |
| **4. 可能成为瓶颈**  | 门面类承担过多职责，可能成为性能瓶颈       |

## 和其他模式对比

| 模式       | 本质思想           | 与门面模式的区别                         |
| ---------- | ------------------ | ---------------------------------------- |
| **适配器模式** | 改变接口兼容性     | 关注接口转换，门面关注简化调用流程       |
| **门面模式**   | 统一高层接口       | 主要用于简化子系统调用，提供便捷入口     |
| **代理模式**   | 控制对象访问       | 关注访问控制和增强，门面关注简化操作     |
| **中介者模式** | 封装对象间交互     | 关注对象间通信，门面关注客户端与系统交互 |
| **装饰器模式** | 动态增强对象功能   | 关注功能扩展，门面关注接口简化           |

## 在Spring中的应用

### 1. Spring的JdbcTemplate

Spring 的 JdbcTemplate 是对原生 JDBC 操作的门面封装，大大简化了数据库操作：

```java
// 原生JDBC操作（复杂）
public List<User> findUsersWithoutFacade() {
    Connection conn = null;
    PreparedStatement stmt = null;
    ResultSet rs = null;
    List<User> users = new ArrayList<>();
    
    try {
        conn = DriverManager.getConnection(url, username, password);
        stmt = conn.prepareStatement("SELECT * FROM users WHERE age > ?");
        stmt.setInt(1, 18);
        rs = stmt.executeQuery();
        
        while (rs.next()) {
            User user = new User();
            user.setId(rs.getLong("id"));
            user.setName(rs.getString("name"));
            user.setAge(rs.getInt("age"));
            users.add(user);
        }
    } catch (SQLException e) {
        // 异常处理
    } finally {
        // 资源关闭
        if (rs != null) try { rs.close(); } catch (SQLException e) {}
        if (stmt != null) try { stmt.close(); } catch (SQLException e) {}
        if (conn != null) try { conn.close(); } catch (SQLException e) {}
    }
    
    return users;
}

// 使用JdbcTemplate门面（简单）
@Autowired
private JdbcTemplate jdbcTemplate;

public List<User> findUsersWithFacade() {
    return jdbcTemplate.query(
        "SELECT * FROM users WHERE age > ?",
        new Object[]{18},
        (rs, rowNum) -> {
            User user = new User();
            user.setId(rs.getLong("id"));
            user.setName(rs.getString("name"));
            user.setAge(rs.getInt("age"));
            return user;
        }
    );
}
```

### 2. Spring MVC 的 DispatcherServlet

DispatcherServlet 作为前端控制器，是整个 Spring MVC 框架的门面：

```java
// DispatcherServlet 内部协调多个组件
public class DispatcherServlet extends FrameworkServlet {
    
    protected void doDispatch(HttpServletRequest request, 
                            HttpServletResponse response) {
        // 1. 通过HandlerMapping找到处理器
        HandlerExecutionChain mappedHandler = getHandler(request);
        
        // 2. 通过HandlerAdapter执行处理器
        HandlerAdapter ha = getHandlerAdapter(mappedHandler.getHandler());
        ModelAndView mv = ha.handle(request, response, handler);
        
        // 3. 通过ViewResolver解析视图
        processDispatchResult(request, response, mappedHandler, mv, exception);
    }
}
```

客户端（浏览器）只需要发送HTTP请求，DispatcherServlet 作为门面协调所有内部组件。

### 3. Spring Security 的 SecurityContextHolder

SecurityContextHolder 提供了访问安全上下文的统一门面：

```java
// 复杂的安全上下文管理被门面简化
public class SecurityService {
    
    public String getCurrentUsername() {
        // 门面简化了获取当前用户的操作
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : null;
    }
    
    public boolean hasRole(String role) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getAuthorities().stream()
            .anyMatch(authority -> authority.getAuthority().equals("ROLE_" + role));
    }
}
```

### 4. Spring Boot 的自动配置

Spring Boot 的 `@EnableAutoConfiguration` 本质上也是门面模式的应用：

```java
@SpringBootApplication // 这个注解是多个注解的门面
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args); // 简化的启动门面
    }
}

// @SpringBootApplication 实际上是以下注解的组合门面
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Inherited
@SpringBootConfiguration
@EnableAutoConfiguration
@ComponentScan
public @interface SpringBootApplication {
    // ...
}
```

## 门面模式的变种和扩展

### 1. 分层门面模式

在大型系统中，可能需要多层门面来管理复杂性：

```java
// 底层门面 - 数据访问门面
public class DataAccessFacade {
    private UserRepository userRepo;
    private OrderRepository orderRepo;
    
    public User getUserWithOrders(Long userId) {
        User user = userRepo.findById(userId);
        List<Order> orders = orderRepo.findByUserId(userId);
        user.setOrders(orders);
        return user;
    }
}

// 中层门面 - 业务服务门面
public class BusinessServiceFacade {
    private DataAccessFacade dataFacade;
    private EmailService emailService;
    private PaymentService paymentService;
    
    public void processOrder(OrderRequest request) {
        // 协调多个业务服务
        User user = dataFacade.getUserWithOrders(request.getUserId());
        Payment payment = paymentService.processPayment(request.getPayment());
        emailService.sendConfirmation(user.getEmail(), payment);
    }
}

// 顶层门面 - API门面
@RestController
public class OrderController {
    private BusinessServiceFacade businessFacade;
    
    @PostMapping("/orders")
    public ResponseEntity<String> createOrder(@RequestBody OrderRequest request) {
        businessFacade.processOrder(request);
        return ResponseEntity.ok("Order processed successfully");
    }
}
```

### 2. 门面 + 工厂模式组合

```java
// 门面工厂，根据不同场景创建不同的门面
public class TheaterFacadeFactory {
    
    public static HomeTheaterFacade createBasicTheater() {
        return new HomeTheaterFacade(
            new DVDPlayer(),
            new BasicProjector(),
            new BasicSoundSystem(),
            new BasicLightControl()
        );
    }
    
    public static HomeTheaterFacade createPremiumTheater() {
        return new HomeTheaterFacade(
            new BluRayPlayer(),
            new HDProjector(),
            new SurroundSoundSystem(),
            new SmartLightControl()
        );
    }
}
```

### 3. 门面 + 策略模式组合

```java
// 支付门面，内部使用策略模式
public class PaymentFacade {
    private Map<String, PaymentStrategy> strategies;
    
    public PaymentFacade() {
        strategies = new HashMap<>();
        strategies.put("alipay", new AlipayStrategy());
        strategies.put("wechat", new WechatStrategy());
        strategies.put("credit", new CreditCardStrategy());
    }
    
    // 简化的支付接口
    public PaymentResult pay(String method, BigDecimal amount, Map<String, Object> params) {
        PaymentStrategy strategy = strategies.get(method);
        if (strategy == null) {
            throw new IllegalArgumentException("Unsupported payment method: " + method);
        }
        
        // 门面协调支付流程
        validateAmount(amount);
        logPaymentAttempt(method, amount);
        PaymentResult result = strategy.pay(amount, params);
        logPaymentResult(result);
        
        return result;
    }
    
    private void validateAmount(BigDecimal amount) { /* 验证逻辑 */ }
    private void logPaymentAttempt(String method, BigDecimal amount) { /* 日志记录 */ }
    private void logPaymentResult(PaymentResult result) { /* 结果记录 */ }
}
```

## 实际项目中的最佳实践

### 1. 门面接口设计原则

```java
// ❌ 不好的门面设计 - 暴露过多细节
public class BadOrderFacade {
    public void setDVDPlayer(DVDPlayer player) { /* ... */ }
    public DVDPlayer getDVDPlayer() { /* ... */ }
    public void setProjectorInput(String input) { /* ... */ }
    public void setSoundVolume(int volume) { /* ... */ }
    // 暴露了太多子系统的细节
}

// ✅ 好的门面设计 - 高层抽象
public class GoodOrderFacade {
    public void startMovieNight(String movie) { /* ... */ }
    public void endMovieNight() { /* ... */ }
    public void switchToMusicMode() { /* ... */ }
    // 提供高层的、面向用户场景的接口
}
```

### 2. 门面的职责边界

```java
// 门面应该专注于协调，而不是实现业务逻辑
public class OrderProcessingFacade {
    private OrderValidator validator;
    private InventoryService inventory;
    private PaymentService payment;
    private ShippingService shipping;
    private NotificationService notification;
    
    public OrderResult processOrder(OrderRequest request) {
        // 门面只负责协调，具体逻辑由各个服务实现
        ValidationResult validation = validator.validate(request);
        if (!validation.isValid()) {
            return OrderResult.failed(validation.getErrors());
        }
        
        InventoryResult inventoryCheck = inventory.reserve(request.getItems());
        if (!inventoryCheck.isSuccess()) {
            return OrderResult.failed("库存不足");
        }
        
        try {
            PaymentResult paymentResult = payment.charge(request.getPayment());
            ShippingResult shippingResult = shipping.arrange(request.getShipping());
            notification.sendConfirmation(request.getCustomer(), paymentResult, shippingResult);
            
            return OrderResult.success(paymentResult.getOrderId());
        } catch (Exception e) {
            inventory.release(request.getItems()); // 回滚库存
            return OrderResult.failed("处理失败：" + e.getMessage());
        }
    }
}
```

### 3. 门面的测试策略

```java
// 门面的单元测试应该关注协调逻辑，而不是子系统的具体实现
@ExtendWith(MockitoExtension.class)
class OrderProcessingFacadeTest {
    
    @Mock private OrderValidator validator;
    @Mock private InventoryService inventory;
    @Mock private PaymentService payment;
    
    @InjectMocks
    private OrderProcessingFacade facade;
    
    @Test
    void shouldProcessOrderSuccessfully() {
        // Given
        OrderRequest request = createValidOrderRequest();
        when(validator.validate(request)).thenReturn(ValidationResult.valid());
        when(inventory.reserve(request.getItems())).thenReturn(InventoryResult.success());
        when(payment.charge(request.getPayment())).thenReturn(PaymentResult.success("ORDER123"));
        
        // When
        OrderResult result = facade.processOrder(request);
        
        // Then
        assertThat(result.isSuccess()).isTrue();
        verify(validator).validate(request);
        verify(inventory).reserve(request.getItems());
        verify(payment).charge(request.getPayment());
    }
    
    @Test
    void shouldRollbackInventoryWhenPaymentFails() {
        // Given
        OrderRequest request = createValidOrderRequest();
        when(validator.validate(request)).thenReturn(ValidationResult.valid());
        when(inventory.reserve(request.getItems())).thenReturn(InventoryResult.success());
        when(payment.charge(request.getPayment())).thenThrow(new PaymentException("支付失败"));
        
        // When
        OrderResult result = facade.processOrder(request);
        
        // Then
        assertThat(result.isSuccess()).isFalse();
        verify(inventory).release(request.getItems()); // 验证回滚逻辑
    }
}
```

门面模式通过提供统一的高层接口，让复杂系统的使用变得简单、直观，是构建易用且可维护系统的重要设计模式。在实际应用中，合理使用门面模式可以显著提升系统的易用性和可维护性。