# 代理模式 (Proxy Pattern)

## 历史脉络

代理模式是 GoF 结构型模式之一，广泛存在于远程调用、AOP、缓存、权限控制、懒加载、事务代理、动态代理等工程实践中。它通过一个替身对象控制对真实对象的访问。

![代理模式结构图](/design-pattern/patterns/proxy.svg)

## 准确理解

代理模式和真实对象通常实现相同接口。代理的重点是访问控制，而不是改变目标接口。它可以在调用前后增加权限、缓存、日志、事务、远程通信、延迟加载等逻辑。

## 问题识别

适合使用代理模式的信号：

- 访问真实对象前需要权限校验或上下文检查。
- 真实对象创建成本高，需要懒加载。
- 访问结果可缓存，但调用方不应感知缓存细节。
- 本地对象代表远程服务。
- 需要在方法调用边界加事务、监控或日志。

不适合的情况：

- 只是增强对象能力，装饰器可能更贴切。
- 代理改变了业务语义，调用方会产生误解。
- 代理层隐藏过多副作用，问题排查困难。

## 落地要点

- 代理和真实对象保持同一接口，减少调用方差异。
- 明确代理职责：权限、缓存、远程、懒加载或监控。
- 缓存代理要处理失效策略和一致性。
- 远程代理要处理超时、重试、熔断和错误转换。

## 概述

代理模式（Proxy Pattern）是一种结构型设计模式，为其他对象提供一种代理以控制对这个对象的访问。代理对象在客户端和目标对象之间起到中介的作用，并且可以通过代理对象来间接地操作目标对象。

简单来说，代理模式就是"找人代办"，当我们不能或不想直接访问某个对象时，可以通过一个代理对象来间接访问。代理对象具有与被代理对象相同的接口，客户端通过代理对象来访问被代理对象，代理对象在转发请求的同时可以添加额外的处理逻辑。

代理模式的核心思想是控制访问，通过代理对象来：

- **控制访问权限**：检查客户端是否有权限访问目标对象
- **延迟加载**：只有在真正需要时才创建目标对象
- **缓存结果**：缓存目标对象的操作结果，提高性能
- **记录日志**：记录对目标对象的访问日志
- **事务管理**：在访问前后添加事务处理逻辑

## 使用场景

- **远程代理**：为位于远程服务器上的对象提供本地代理
- **虚拟代理**：延迟创建开销很大的对象，直到真正需要时才创建
- **保护代理**：控制对原始对象的访问权限
- **智能引用代理**：在访问对象时执行额外的操作，如引用计数、加载持久化对象等
- **缓存代理**：为开销大的运算结果提供暂时存储
- **同步代理**：在多线程环境中为目标对象提供安全的访问控制

## 类图结构

```plaintext
┌─────────────────┐
│     Client      │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│     Subject     │
│   (interface)   │
│ + request()     │
└─────────┬───────┘
          △
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌─────────────────┐  ┌─────────────────┐
│   RealSubject   │  │      Proxy      │
│                 │  │                 │
│ + request()     │  │ - realSubject   │
└─────────────────┘  │ + request()     │
                     │ + checkAccess() │
                     │ + logAccess()   │
                     └─────────────────┘
```

- **Subject**：抽象主题，定义代理和真实主题的公共接口
- **RealSubject**：真实主题，定义代理所代表的真实对象
- **Proxy**：代理，保存一个引用使得代理可以访问实体，控制对实体的访问
- **Client**：客户端，通过代理访问真实主题

## 示例

### 示例1：图片加载的虚拟代理

**场景描述**：在图片浏览器中，加载大图片需要较长时间。使用虚拟代理可以先显示占位符，在后台异步加载真实图片。

```java
// 图片接口
public interface Image {
    void display();
    String getInfo();
}

// 真实图片类
public class RealImage implements Image {
    private String filename;
    private byte[] imageData;
    private boolean loaded = false;
    
    public RealImage(String filename) {
        this.filename = filename;
        System.out.println("创建 RealImage 对象：" + filename);
    }
    
    private void loadFromDisk() {
        if (!loaded) {
            System.out.println("从磁盘加载图片：" + filename);
            try {
                // 模拟加载时间
                Thread.sleep(2000);
                imageData = ("图片数据：" + filename).getBytes();
                loaded = true;
                System.out.println("图片加载完成：" + filename);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }
    
    @Override
    public void display() {
        loadFromDisk();
        System.out.println("显示图片：" + filename + ", 大小：" + imageData.length + " bytes");
    }
    
    @Override
    public String getInfo() {
        return "真实图片：" + filename + (loaded ? " (已加载)" : " (未加载)");
    }
}

// 图片代理类
public class ImageProxy implements Image {
    private String filename;
    private RealImage realImage;
    private boolean accessGranted;
    
    public ImageProxy(String filename) {
        this.filename = filename;
        this.accessGranted = checkAccess();
        System.out.println("创建 ImageProxy 对象：" + filename);
    }
    
    private boolean checkAccess() {
        // 模拟权限检查
        boolean hasPermission = !filename.contains("private");
        System.out.println("权限检查：" + filename + " -> " + 
                         (hasPermission ? "允许访问" : "拒绝访问"));
        return hasPermission;
    }
    
    private void logAccess() {
        System.out.println("[访问日志] " + new java.util.Date() + 
                         " - 访问图片：" + filename);
    }
    
    @Override
    public void display() {
        logAccess();
        
        if (!accessGranted) {
            System.out.println("访问被拒绝：" + filename);
            return;
        }
        
        // 延迟创建真实对象
        if (realImage == null) {
            realImage = new RealImage(filename);
        }
        
        realImage.display();
    }
    
    @Override
    public String getInfo() {
        if (!accessGranted) {
            return "代理图片：" + filename + " (访问被拒绝)";
        }
        
        if (realImage == null) {
            return "代理图片：" + filename + " (未加载)";
        }
        
        return "代理图片：" + filename + " -> " + realImage.getInfo();
    }
}

// 图片浏览器
public class ImageViewer {
    private List<Image> images = new ArrayList<>();
    
    public void addImage(String filename) {
        // 使用代理，延迟加载
        images.add(new ImageProxy(filename));
    }
    
    public void showImage(int index) {
        if (index >= 0 && index < images.size()) {
            System.out.println("\n=== 显示第 " + (index + 1) + " 张图片 ===");
            images.get(index).display();
        }
    }
    
    public void showAllInfo() {
        System.out.println("\n=== 图片列表 ===");
        for (int i = 0; i < images.size(); i++) {
            System.out.println((i + 1) + ". " + images.get(i).getInfo());
        }
    }
}

// 客户端
public class ImageViewerClient {
    public static void main(String[] args) {
        ImageViewer viewer = new ImageViewer();
        
        // 添加图片（只创建代理，不加载真实图片）
        viewer.addImage("photo1.jpg");
        viewer.addImage("photo2.png");
        viewer.addImage("private_photo.jpg");
        viewer.addImage("landscape.jpg");
        
        System.out.println("\n=== 图片代理创建完成 ===");
        viewer.showAllInfo();
        
        // 只有在真正需要显示时才加载图片
        viewer.showImage(0);  // 加载并显示第一张图片
        viewer.showImage(2);  // 尝试显示私有图片（被拒绝）
        viewer.showImage(1);  // 加载并显示第二张图片
        
        System.out.println("\n=== 最终状态 ===");
        viewer.showAllInfo();
        
        // 再次显示已加载的图片（不会重新加载）
        System.out.println("\n=== 再次显示第一张图片 ===");
        viewer.showImage(0);
    }
}
```

### 示例2：数据库连接的保护代理

**场景描述**：数据库访问需要权限控制，使用保护代理可以在访问数据库前进行身份验证和权限检查。

```java
// 数据库访问接口
public interface DatabaseAccess {
    List<String> query(String sql);
    boolean execute(String sql);
    void connect();
    void disconnect();
}

// 真实数据库访问类
public class RealDatabaseAccess implements DatabaseAccess {
    private String connectionString;
    private boolean connected = false;
    private Map<String, List<String>> mockData;
    
    public RealDatabaseAccess(String connectionString) {
        this.connectionString = connectionString;
        initMockData();
        System.out.println("创建真实数据库连接：" + connectionString);
    }
    
    private void initMockData() {
        mockData = new HashMap<>();
        mockData.put("users", Arrays.asList("Alice", "Bob", "Charlie"));
        mockData.put("products", Arrays.asList("Laptop", "Phone", "Tablet"));
        mockData.put("orders", Arrays.asList("Order1", "Order2", "Order3"));
    }
    
    @Override
    public void connect() {
        if (!connected) {
            System.out.println("连接到数据库：" + connectionString);
            try {
                Thread.sleep(1000); // 模拟连接时间
                connected = true;
                System.out.println("数据库连接成功");
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }
    
    @Override
    public void disconnect() {
        if (connected) {
            System.out.println("断开数据库连接");
            connected = false;
        }
    }
    
    @Override
    public List<String> query(String sql) {
        if (!connected) {
            throw new RuntimeException("数据库未连接");
        }
        
        System.out.println("执行查询：" + sql);
        
        // 简单的SQL解析
        String tableName = extractTableName(sql);
        List<String> result = mockData.getOrDefault(tableName, Arrays.asList("No data"));
        
        System.out.println("查询结果：" + result);
        return new ArrayList<>(result);
    }
    
    @Override
    public boolean execute(String sql) {
        if (!connected) {
            throw new RuntimeException("数据库未连接");
        }
        
        System.out.println("执行更新：" + sql);
        // 模拟执行时间
        try {
            Thread.sleep(500);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        System.out.println("更新执行成功");
        return true;
    }
    
    private String extractTableName(String sql) {
        // 简单的表名提取
        String[] parts = sql.toLowerCase().split("\\s+");
        for (int i = 0; i < parts.length - 1; i++) {
            if ("from".equals(parts[i])) {
                return parts[i + 1];
            }
        }
        return "unknown";
    }
}

// 用户信息
public class User {
    private String username;
    private String role;
    private Set<String> permissions;
    
    public User(String username, String role, Set<String> permissions) {
        this.username = username;
        this.role = role;
        this.permissions = permissions;
    }
    
    public String getUsername() { return username; }
    public String getRole() { return role; }
    public Set<String> getPermissions() { return permissions; }
    
    public boolean hasPermission(String permission) {
        return permissions.contains(permission) || permissions.contains("ALL");
    }
}

// 数据库代理类
public class DatabaseProxy implements DatabaseAccess {
    private RealDatabaseAccess realDatabase;
    private String connectionString;
    private User currentUser;
    private List<String> accessLog;
    private Map<String, List<String>> queryCache;
    
    public DatabaseProxy(String connectionString) {
        this.connectionString = connectionString;
        this.accessLog = new ArrayList<>();
        this.queryCache = new HashMap<>();
        System.out.println("创建数据库代理");
    }
    
    public void setUser(User user) {
        this.currentUser = user;
        System.out.println("设置当前用户：" + user.getUsername() + " (" + user.getRole() + ")");
    }
    
    private boolean checkPermission(String operation) {
        if (currentUser == null) {
            System.out.println("权限检查失败：用户未登录");
            return false;
        }
        
        boolean hasPermission = currentUser.hasPermission(operation);
        System.out.println("权限检查：" + currentUser.getUsername() + 
                         " 执行 " + operation + " -> " + 
                         (hasPermission ? "允许" : "拒绝"));
        return hasPermission;
    }
    
    private void logAccess(String operation, String details) {
        String logEntry = String.format("[%s] 用户:%s 操作:%s 详情:%s",
                new java.util.Date(),
                currentUser != null ? currentUser.getUsername() : "未知",
                operation, details);
        accessLog.add(logEntry);
        System.out.println("[访问日志] " + logEntry);
    }
    
    @Override
    public void connect() {
        if (!checkPermission("CONNECT")) {
            throw new SecurityException("没有连接权限");
        }
        
        logAccess("CONNECT", connectionString);
        
        if (realDatabase == null) {
            realDatabase = new RealDatabaseAccess(connectionString);
        }
        realDatabase.connect();
    }
    
    @Override
    public void disconnect() {
        if (realDatabase != null) {
            logAccess("DISCONNECT", "");
            realDatabase.disconnect();
        }
    }
    
    @Override
    public List<String> query(String sql) {
        if (!checkPermission("READ")) {
            throw new SecurityException("没有查询权限");
        }
        
        logAccess("QUERY", sql);
        
        // 检查缓存
        List<String> cachedResult = queryCache.get(sql);
        if (cachedResult != null) {
            System.out.println("从缓存返回查询结果：" + cachedResult);
            return new ArrayList<>(cachedResult);
        }
        
        if (realDatabase == null) {
            connect();
        }
        
        List<String> result = realDatabase.query(sql);
        
        // 缓存结果
        queryCache.put(sql, new ArrayList<>(result));
        
        return result;
    }
    
    @Override
    public boolean execute(String sql) {
        if (!checkPermission("WRITE")) {
            throw new SecurityException("没有执行权限");
        }
        
        logAccess("EXECUTE", sql);
        
        if (realDatabase == null) {
            connect();
        }
        
        // 清除相关缓存
        queryCache.clear();
        System.out.println("清除查询缓存");
        
        return realDatabase.execute(sql);
    }
    
    public void printAccessLog() {
        System.out.println("\n=== 访问日志 ===");
        accessLog.forEach(System.out::println);
    }
    
    public void printCacheInfo() {
        System.out.println("\n=== 缓存信息 ===");
        System.out.println("缓存条目数：" + queryCache.size());
        queryCache.forEach((sql, result) -> 
            System.out.println("  " + sql + " -> " + result));
    }
}

// 客户端
public class DatabaseClient {
    public static void main(String[] args) {
        DatabaseProxy dbProxy = new DatabaseProxy("jdbc:mysql://localhost:3306/testdb");
        
        // 创建不同权限的用户
        User admin = new User("admin", "管理员", 
                            Set.of("CONNECT", "READ", "WRITE", "ALL"));
        User reader = new User("reader", "只读用户", 
                             Set.of("CONNECT", "READ"));
        User guest = new User("guest", "访客", 
                            Set.of());
        
        try {
            // 测试未登录访问
            System.out.println("=== 测试未登录访问 ===");
            try {
                dbProxy.query("SELECT * FROM users");
            } catch (SecurityException e) {
                System.out.println("捕获异常：" + e.getMessage());
            }
            
            // 测试管理员访问
            System.out.println("\n=== 测试管理员访问 ===");
            dbProxy.setUser(admin);
            dbProxy.query("SELECT * FROM users");
            dbProxy.query("SELECT * FROM products"); // 测试缓存
            dbProxy.query("SELECT * FROM users");    // 从缓存返回
            dbProxy.execute("UPDATE users SET name='Alice2' WHERE id=1");
            
            // 测试只读用户访问
            System.out.println("\n=== 测试只读用户访问 ===");
            dbProxy.setUser(reader);
            dbProxy.query("SELECT * FROM orders");
            try {
                dbProxy.execute("DELETE FROM orders WHERE id=1");
            } catch (SecurityException e) {
                System.out.println("捕获异常：" + e.getMessage());
            }
            
            // 测试访客访问
            System.out.println("\n=== 测试访客访问 ===");
            dbProxy.setUser(guest);
            try {
                dbProxy.query("SELECT * FROM users");
            } catch (SecurityException e) {
                System.out.println("捕获异常：" + e.getMessage());
            }
            
        } finally {
            dbProxy.disconnect();
            dbProxy.printAccessLog();
            dbProxy.printCacheInfo();
        }
    }
}
```

### 示例3：远程服务代理

**场景描述**：访问远程服务时，使用代理可以处理网络通信、序列化、重试等复杂逻辑。

```java
// 远程服务接口
public interface RemoteService {
    String processData(String data);
    List<String> batchProcess(List<String> dataList);
    boolean isHealthy();
}

// 远程服务实现（模拟远程服务器上的实现）
public class RemoteServiceImpl implements RemoteService {
    private String serverName;
    private boolean healthy;
    
    public RemoteServiceImpl(String serverName) {
        this.serverName = serverName;
        this.healthy = Math.random() > 0.1; // 90% 概率健康
        System.out.println("远程服务启动：" + serverName + 
                         " (状态：" + (healthy ? "健康" : "故障") + ")");
    }
    
    @Override
    public String processData(String data) {
        if (!healthy) {
            throw new RuntimeException("服务不可用：" + serverName);
        }
        
        // 模拟处理时间
        try {
            Thread.sleep(100 + (int)(Math.random() * 200));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        String result = "[" + serverName + "] 处理结果：" + data.toUpperCase();
        System.out.println("远程处理：" + data + " -> " + result);
        return result;
    }
    
    @Override
    public List<String> batchProcess(List<String> dataList) {
        return dataList.stream()
                .map(this::processData)
                .collect(Collectors.toList());
    }
    
    @Override
    public boolean isHealthy() {
        return healthy;
    }
    
    public void setHealthy(boolean healthy) {
        this.healthy = healthy;
    }
}

// 远程服务代理
public class RemoteServiceProxy implements RemoteService {
    private List<RemoteServiceImpl> servers;
    private int currentServerIndex = 0;
    private Map<String, String> cache;
    private int maxRetries = 3;
    private long cacheExpireTime = 5000; // 5秒缓存
    private Map<String, Long> cacheTimestamps;
    
    public RemoteServiceProxy(List<String> serverNames) {
        this.servers = serverNames.stream()
                .map(RemoteServiceImpl::new)
                .collect(Collectors.toList());
        this.cache = new ConcurrentHashMap<>();
        this.cacheTimestamps = new ConcurrentHashMap<>();
        System.out.println("创建远程服务代理，服务器数量：" + servers.size());
    }
    
    private RemoteServiceImpl getHealthyServer() {
        for (int i = 0; i < servers.size(); i++) {
            RemoteServiceImpl server = servers.get(currentServerIndex);
            currentServerIndex = (currentServerIndex + 1) % servers.size();
            
            if (server.isHealthy()) {
                return server;
            }
        }
        throw new RuntimeException("没有可用的服务器");
    }
    
    private boolean isCacheValid(String key) {
        Long timestamp = cacheTimestamps.get(key);
        return timestamp != null && 
               (System.currentTimeMillis() - timestamp) < cacheExpireTime;
    }
    
    private void putCache(String key, String value) {
        cache.put(key, value);
        cacheTimestamps.put(key, System.currentTimeMillis());
    }
    
    @Override
    public String processData(String data) {
        // 检查缓存
        if (isCacheValid(data)) {
            String cachedResult = cache.get(data);
            System.out.println("从缓存返回：" + data + " -> " + cachedResult);
            return cachedResult;
        }
        
        // 重试机制
        for (int retry = 0; retry < maxRetries; retry++) {
            try {
                RemoteServiceImpl server = getHealthyServer();
                String result = server.processData(data);
                
                // 缓存结果
                putCache(data, result);
                
                return result;
            } catch (Exception e) {
                System.out.println("第 " + (retry + 1) + " 次尝试失败：" + e.getMessage());
                
                if (retry == maxRetries - 1) {
                    throw new RuntimeException("所有重试都失败了", e);
                }
                
                // 等待后重试
                try {
                    Thread.sleep(1000 * (retry + 1));
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("重试被中断", ie);
                }
            }
        }
        
        throw new RuntimeException("处理失败");
    }
    
    @Override
    public List<String> batchProcess(List<String> dataList) {
        System.out.println("批量处理 " + dataList.size() + " 个项目");
        
        return dataList.parallelStream()
                .map(this::processData)
                .collect(Collectors.toList());
    }
    
    @Override
    public boolean isHealthy() {
        return servers.stream().anyMatch(RemoteServiceImpl::isHealthy);
    }
    
    public void printStatus() {
        System.out.println("\n=== 服务状态 ===");
        for (int i = 0; i < servers.size(); i++) {
            RemoteServiceImpl server = servers.get(i);
            System.out.println("服务器 " + (i + 1) + ": " + 
                             (server.isHealthy() ? "健康" : "故障"));
        }
        
        System.out.println("\n=== 缓存状态 ===");
        System.out.println("缓存条目数：" + cache.size());
        cache.forEach((key, value) -> {
            boolean valid = isCacheValid(key);
            System.out.println("  " + key + " -> " + value + 
                             " (" + (valid ? "有效" : "过期") + ")");
        });
    }
    
    // 模拟服务器故障
    public void simulateServerFailure(int serverIndex) {
        if (serverIndex >= 0 && serverIndex < servers.size()) {
            servers.get(serverIndex).setHealthy(false);
            System.out.println("模拟服务器 " + (serverIndex + 1) + " 故障");
        }
    }
    
    // 模拟服务器恢复
    public void simulateServerRecovery(int serverIndex) {
        if (serverIndex >= 0 && serverIndex < servers.size()) {
            servers.get(serverIndex).setHealthy(true);
            System.out.println("模拟服务器 " + (serverIndex + 1) + " 恢复");
        }
    }
}

// 客户端
public class RemoteServiceClient {
    public static void main(String[] args) {
        // 创建远程服务代理
        RemoteServiceProxy proxy = new RemoteServiceProxy(
            Arrays.asList("Server-1", "Server-2", "Server-3"));
        
        try {
            System.out.println("=== 测试正常处理 ===");
            String result1 = proxy.processData("hello");
            String result2 = proxy.processData("world");
            String result3 = proxy.processData("hello"); // 应该从缓存返回
            
            System.out.println("\n=== 测试批量处理 ===");
            List<String> batchData = Arrays.asList("item1", "item2", "item3", "hello");
            List<String> batchResults = proxy.batchProcess(batchData);
            System.out.println("批量处理结果：" + batchResults);
            
            proxy.printStatus();
            
            System.out.println("\n=== 测试故障转移 ===");
            proxy.simulateServerFailure(0);
            proxy.simulateServerFailure(1);
            
            String result4 = proxy.processData("failover-test");
            System.out.println("故障转移结果：" + result4);
            
            System.out.println("\n=== 测试所有服务器故障 ===");
            proxy.simulateServerFailure(2);
            
            try {
                proxy.processData("all-failed");
            } catch (Exception e) {
                System.out.println("捕获异常：" + e.getMessage());
            }
            
            System.out.println("\n=== 测试服务器恢复 ===");
            proxy.simulateServerRecovery(1);
            String result5 = proxy.processData("recovery-test");
            System.out.println("恢复后结果：" + result5);
            
        } finally {
            proxy.printStatus();
        }
    }
}
```

## 优缺点分析

### ✅ 优点

| 优点                | 说明                                     |
| ------------------- | ---------------------------------------- |
| **1. 控制访问**       | 可以在不修改目标对象的情况下控制对它的访问 |
| **2. 延迟加载**       | 可以延迟创建开销很大的对象，提高系统启动速度 |
| **3. 权限控制**       | 可以在代理中实现权限检查和访问控制       |
| **4. 缓存优化**       | 可以缓存目标对象的结果，提高性能         |
| **5. 日志记录**       | 可以记录对目标对象的访问日志             |
| **6. 远程访问**       | 可以隐藏远程调用的复杂性                 |
| **7. 事务管理**       | 可以在访问前后添加事务处理逻辑           |

### ❌ 缺点

| 缺点                | 说明                                     |
| ------------------- | ---------------------------------------- |
| **1. 增加复杂度**     | 增加了系统的复杂度，需要额外的代理类     |
| **2. 性能开销**       | 代理调用会增加一定的性能开销             |
| **3. 间接访问**       | 客户端不能直接访问目标对象，增加了间接性 |
| **4. 代理维护**       | 需要维护代理类与目标类的一致性           |
| **5. 调试困难**       | 增加了调试的复杂度，问题可能出现在代理层 |

## 和其他模式对比

| 模式       | 本质思想           | 与代理模式的区别                         |
| ---------- | ------------------ | ---------------------------------------- |
| **代理模式**   | 控制对象访问       | 关注访问控制，代理与目标对象接口相同     |
| **装饰器模式** | 动态添加功能       | 关注功能扩展，可以层层装饰               |
| **适配器模式** | 接口转换           | 关注接口适配，连接不兼容的接口           |
| **外观模式**   | 简化复杂接口       | 关注接口简化，提供统一的高层接口         |
| **桥接模式**   | 分离抽象和实现     | 关注结构解耦，抽象和实现可以独立变化     |

## 在实际框架中的应用

### 1. Spring AOP 代理

Spring AOP 使用代理模式实现面向切面编程：

```java
// 目标接口
public interface UserService {
    void createUser(String username);
    User findUser(String username);
}

// 目标实现
@Service
public class UserServiceImpl implements UserService {
    @Override
    public void createUser(String username) {
        System.out.println("创建用户：" + username);
    }
    
    @Override
    public User findUser(String username) {
        System.out.println("查找用户：" + username);
        return new User(username);
    }
}

// 切面
@Aspect
@Component
public class LoggingAspect {
    @Before("execution(* com.example.UserService.*(..))")
    public void logBefore(JoinPoint joinPoint) {
        System.out.println("[AOP] 方法调用前：" + joinPoint.getSignature().getName());
    }
    
    @After("execution(* com.example.UserService.*(..))")
    public void logAfter(JoinPoint joinPoint) {
        System.out.println("[AOP] 方法调用后：" + joinPoint.getSignature().getName());
    }
}

// Spring 会自动创建代理对象
@RestController
public class UserController {
    @Autowired
    private UserService userService; // 这里注入的是代理对象
    
    @PostMapping("/users")
    public void createUser(@RequestParam String username) {
        userService.createUser(username); // 通过代理调用
    }
}
```

### 2. JPA/Hibernate 懒加载代理

JPA 使用代理模式实现懒加载：

```java
@Entity
public class User {
    @Id
    private Long id;
    
    private String name;
    
    // 懒加载关联
    @OneToMany(fetch = FetchType.LAZY, mappedBy = "user")
    private List<Order> orders;
    
    // getters and setters
}

@Entity
public class Order {
    @Id
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    private User user; // 这里会创建代理对象
    
    // getters and setters
}

// 使用示例
@Service
public class OrderService {
    @Autowired
    private OrderRepository orderRepository;
    
    public void processOrder(Long orderId) {
        Order order = orderRepository.findById(orderId).get();
        
        // 此时 order.getUser() 返回的是代理对象
        User user = order.getUser();
        
        // 只有在真正访问用户属性时才会触发数据库查询
        String userName = user.getName(); // 触发懒加载
    }
}
```

### 3. Java 动态代理

Java 提供了内置的动态代理机制：

```java
// 接口
public interface Calculator {
    int add(int a, int b);
    int subtract(int a, int b);
}

// 实现类
public class CalculatorImpl implements Calculator {
    @Override
    public int add(int a, int b) {
        return a + b;
    }
    
    @Override
    public int subtract(int a, int b) {
        return a - b;
    }
}

// 动态代理处理器
public class CalculatorInvocationHandler implements InvocationHandler {
    private Object target;
    
    public CalculatorInvocationHandler(Object target) {
        this.target = target;
    }
    
    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        System.out.println("方法调用前：" + method.getName());
        long startTime = System.currentTimeMillis();
        
        Object result = method.invoke(target, args);
        
        long endTime = System.currentTimeMillis();
        System.out.println("方法调用后：" + method.getName() + 
                         ", 耗时：" + (endTime - startTime) + "ms");
        
        return result;
    }
}

// 使用动态代理
public class DynamicProxyExample {
    public static void main(String[] args) {
        Calculator calculator = new CalculatorImpl();
        
        // 创建动态代理
        Calculator proxy = (Calculator) Proxy.newProxyInstance(
            calculator.getClass().getClassLoader(),
            calculator.getClass().getInterfaces(),
            new CalculatorInvocationHandler(calculator)
        );
        
        // 通过代理调用方法
        int result1 = proxy.add(10, 5);
        int result2 = proxy.subtract(10, 3);
        
        System.out.println("结果1：" + result1);
        System.out.println("结果2：" + result2);
    }
}
```

### 4. MyBatis Mapper 代理

MyBatis 使用代理模式为 Mapper 接口创建实现：

```java
// Mapper 接口
public interface UserMapper {
    @Select("SELECT * FROM users WHERE id = #{id}")
    User findById(Long id);
    
    @Insert("INSERT INTO users(name, email) VALUES(#{name}, #{email})")
    void insert(User user);
}

// MyBatis 会为 Mapper 接口创建代理实现
@Service
public class UserService {
    @Autowired
    private UserMapper userMapper; // 这是代理对象
    
    public User getUser(Long id) {
        return userMapper.findById(id); // 代理会执行 SQL
    }
}

// 简化的 MyBatis 代理实现原理
public class MapperProxyFactory<T> {
    private final Class<T> mapperInterface;
    
    public MapperProxyFactory(Class<T> mapperInterface) {
        this.mapperInterface = mapperInterface;
    }
    
    @SuppressWarnings("unchecked")
    public T newInstance(SqlSession sqlSession) {
        MapperProxy<T> mapperProxy = new MapperProxy<>(sqlSession, mapperInterface);
        return (T) Proxy.newProxyInstance(
            mapperInterface.getClassLoader(),
            new Class[]{mapperInterface},
            mapperProxy
        );
    }
}

public class MapperProxy<T> implements InvocationHandler {
    private final SqlSession sqlSession;
    private final Class<T> mapperInterface;
    
    public MapperProxy(SqlSession sqlSession, Class<T> mapperInterface) {
        this.sqlSession = sqlSession;
        this.mapperInterface = mapperInterface;
    }
    
    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        // 根据方法和注解执行相应的 SQL 操作
        if (method.isAnnotationPresent(Select.class)) {
            Select select = method.getAnnotation(Select.class);
            return sqlSession.selectOne(select.value()[0], args[0]);
        } else if (method.isAnnotationPresent(Insert.class)) {
            Insert insert = method.getAnnotation(Insert.class);
            return sqlSession.insert(insert.value()[0], args[0]);
        }
        
        return null;
    }
}
```

## 代理模式的变种和扩展

### 1. 智能代理

智能代理可以根据情况自动选择最优的处理策略：

```java
public class SmartCacheProxy implements RemoteService {
    private RemoteService primaryService;
    private RemoteService backupService;
    private Map<String, CacheEntry> cache;
    private CircuitBreaker circuitBreaker;
    
    private static class CacheEntry {
        String value;
        long timestamp;
        long accessCount;
        
        CacheEntry(String value) {
            this.value = value;
            this.timestamp = System.currentTimeMillis();
            this.accessCount = 1;
        }
        
        void access() {
            accessCount++;
        }
        
        boolean isExpired(long ttl) {
            return System.currentTimeMillis() - timestamp > ttl;
        }
    }
    
    public SmartCacheProxy(RemoteService primary, RemoteService backup) {
        this.primaryService = primary;
        this.backupService = backup;
        this.cache = new ConcurrentHashMap<>();
        this.circuitBreaker = new CircuitBreaker();
    }
    
    @Override
    public String processData(String data) {
        // 1. 检查缓存
        CacheEntry entry = cache.get(data);
        if (entry != null && !entry.isExpired(5000)) {
            entry.access();
            System.out.println("智能缓存命中：" + data);
            return entry.value;
        }
        
        // 2. 选择服务
        RemoteService service = circuitBreaker.isOpen() ? backupService : primaryService;
        
        try {
            String result = service.processData(data);
            
            // 3. 智能缓存策略
            if (entry == null || entry.accessCount > 3) {
                cache.put(data, new CacheEntry(result));
            }
            
            circuitBreaker.recordSuccess();
            return result;
            
        } catch (Exception e) {
            circuitBreaker.recordFailure();
            
            // 降级处理
            if (entry != null) {
                System.out.println("使用过期缓存：" + data);
                return entry.value;
            }
            
            throw e;
        }
    }
    
    // 其他方法实现...
}

// 简单的断路器实现
class CircuitBreaker {
    private int failureCount = 0;
    private long lastFailureTime = 0;
    private final int threshold = 3;
    private final long timeout = 10000; // 10秒
    
    public boolean isOpen() {
        if (failureCount >= threshold) {
            return System.currentTimeMillis() - lastFailureTime < timeout;
        }
        return false;
    }
    
    public void recordSuccess() {
        failureCount = 0;
    }
    
    public void recordFailure() {
        failureCount++;
        lastFailureTime = System.currentTimeMillis();
    }
}
```

### 2. 组合代理

多个代理可以组合使用，形成代理链：

```java
// 基础代理接口
public abstract class BaseProxy implements RemoteService {
    protected RemoteService target;
    
    public BaseProxy(RemoteService target) {
        this.target = target;
    }
}

// 日志代理
public class LoggingProxy extends BaseProxy {
    public LoggingProxy(RemoteService target) {
        super(target);
    }
    
    @Override
    public String processData(String data) {
        System.out.println("[LOG] 开始处理：" + data);
        try {
            String result = target.processData(data);
            System.out.println("[LOG] 处理成功：" + result);
            return result;
        } catch (Exception e) {
            System.out.println("[LOG] 处理失败：" + e.getMessage());
            throw e;
        }
    }
    
    // 其他方法实现...
}

// 性能监控代理
public class PerformanceProxy extends BaseProxy {
    public PerformanceProxy(RemoteService target) {
        super(target);
    }
    
    @Override
    public String processData(String data) {
        long startTime = System.currentTimeMillis();
        try {
            String result = target.processData(data);
            long duration = System.currentTimeMillis() - startTime;
            System.out.println("[PERF] 处理耗时：" + duration + "ms");
            return result;
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            System.out.println("[PERF] 失败耗时：" + duration + "ms");
            throw e;
        }
    }
    
    // 其他方法实现...
}

// 缓存代理
public class CachingProxy extends BaseProxy {
    private Map<String, String> cache = new ConcurrentHashMap<>();
    
    public CachingProxy(RemoteService target) {
        super(target);
    }
    
    @Override
    public String processData(String data) {
        String cached = cache.get(data);
        if (cached != null) {
            System.out.println("[CACHE] 缓存命中：" + data);
            return cached;
        }
        
        String result = target.processData(data);
        cache.put(data, result);
        System.out.println("[CACHE] 缓存存储：" + data);
        return result;
    }
    
    // 其他方法实现...
}

// 代理链构建器
public class ProxyChainBuilder {
    public static RemoteService buildChain(RemoteService target) {
        // 构建代理链：日志 -> 性能监控 -> 缓存 -> 目标对象
        return new LoggingProxy(
            new PerformanceProxy(
                new CachingProxy(target)
            )
        );
    }
}

// 使用示例
public class ProxyChainExample {
    public static void main(String[] args) {
        RemoteService realService = new RemoteServiceImpl("RealServer");
        RemoteService proxyChain = ProxyChainBuilder.buildChain(realService);
        
        // 第一次调用
        proxyChain.processData("test1");
        
        // 第二次调用（应该命中缓存）
        proxyChain.processData("test1");
        
        // 第三次调用（新数据）
        proxyChain.processData("test2");
    }
}
```

## 实际项目中的最佳实践

### 1. 代理模式的选择策略

```java
// 代理类型枚举
public enum ProxyType {
    VIRTUAL,    // 虚拟代理
    PROTECTION, // 保护代理
    REMOTE,     // 远程代理
    CACHE,      // 缓存代理
    SMART       // 智能代理
}

// 代理工厂
public class ProxyFactory {
    public static <T> T createProxy(Class<T> interfaceType, T target, ProxyType... types) {
        Object proxy = target;
        
        // 根据类型创建代理链
        for (ProxyType type : types) {
            switch (type) {
                case VIRTUAL:
                    proxy = createVirtualProxy(interfaceType, proxy);
                    break;
                case PROTECTION:
                    proxy = createProtectionProxy(interfaceType, proxy);
                    break;
                case CACHE:
                    proxy = createCacheProxy(interfaceType, proxy);
                    break;
                // 其他类型...
            }
        }
        
        return interfaceType.cast(proxy);
    }
    
    @SuppressWarnings("unchecked")
    private static <T> T createVirtualProxy(Class<T> interfaceType, Object target) {
        return (T) Proxy.newProxyInstance(
            interfaceType.getClassLoader(),
            new Class[]{interfaceType},
            new VirtualProxyHandler(target)
        );
    }
    
    // 其他代理创建方法...
}

// 虚拟代理处理器
class VirtualProxyHandler implements InvocationHandler {
    private Object target;
    private volatile boolean initialized = false;
    
    public VirtualProxyHandler(Object target) {
        this.target = target;
    }
    
    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        if (!initialized) {
            synchronized (this) {
                if (!initialized) {
                    System.out.println("延迟初始化目标对象");
                    // 这里可以进行复杂的初始化逻辑
                    initialized = true;
                }
            }
        }
        
        return method.invoke(target, args);
    }
}
```

### 2. 代理性能优化

```java
// 高性能代理实现
public class HighPerformanceProxy implements InvocationHandler {
    private final Object target;
    private final Map<Method, MethodHandler> methodHandlers;
    
    public HighPerformanceProxy(Object target) {
        this.target = target;
        this.methodHandlers = new ConcurrentHashMap<>();
        precomputeMethodHandlers();
    }
    
    private void precomputeMethodHandlers() {
        Class<?> targetClass = target.getClass();
        for (Method method : targetClass.getMethods()) {
            methodHandlers.put(method, createMethodHandler(method));
        }
    }
    
    private MethodHandler createMethodHandler(Method method) {
        // 根据方法特征创建优化的处理器
        if (method.getName().startsWith("get")) {
            return new CachedMethodHandler(method);
        } else if (method.getName().startsWith("set")) {
            return new DirectMethodHandler(method);
        } else {
            return new LoggedMethodHandler(method);
        }
    }
    
    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        MethodHandler handler = methodHandlers.get(method);
        return handler.handle(target, args);
    }
    
    // 方法处理器接口
    interface MethodHandler {
        Object handle(Object target, Object[] args) throws Throwable;
    }
    
    // 缓存方法处理器
    static class CachedMethodHandler implements MethodHandler {
        private final Method method;
        private final Map<Object, Object> cache = new ConcurrentHashMap<>();
        
        CachedMethodHandler(Method method) {
            this.method = method;
        }
        
        @Override
        public Object handle(Object target, Object[] args) throws Throwable {
            Object key = Arrays.toString(args);
            return cache.computeIfAbsent(key, k -> {
                try {
                    return method.invoke(target, args);
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            });
        }
    }
    
    // 直接方法处理器
    static class DirectMethodHandler implements MethodHandler {
        private final Method method;
        
        DirectMethodHandler(Method method) {
            this.method = method;
        }
        
        @Override
        public Object handle(Object target, Object[] args) throws Throwable {
            return method.invoke(target, args);
        }
    }
    
    // 日志方法处理器
    static class LoggedMethodHandler implements MethodHandler {
        private final Method method;
        
        LoggedMethodHandler(Method method) {
            this.method = method;
        }
        
        @Override
        public Object handle(Object target, Object[] args) throws Throwable {
            System.out.println("调用方法：" + method.getName());
            Object result = method.invoke(target, args);
            System.out.println("方法返回：" + result);
            return result;
        }
    }
}
```

### 3. 代理模式的监控和调试

```java
// 代理监控器
public class ProxyMonitor {
    private static final Map<String, ProxyMetrics> metricsMap = new ConcurrentHashMap<>();
    
    public static void recordMethodCall(String proxyName, String methodName, long duration, boolean success) {
        ProxyMetrics metrics = metricsMap.computeIfAbsent(proxyName, ProxyMetrics::new);
        metrics.recordCall(methodName, duration, success);
    }
    
    public static void printMetrics() {
        System.out.println("\n=== 代理性能指标 ===");
        metricsMap.forEach((name, metrics) -> {
            System.out.println("代理：" + name);
            metrics.print();
            System.out.println();
        });
    }
    
    static class ProxyMetrics {
        private final String proxyName;
        private final Map<String, MethodMetrics> methodMetrics = new ConcurrentHashMap<>();
        
        ProxyMetrics(String proxyName) {
            this.proxyName = proxyName;
        }
        
        void recordCall(String methodName, long duration, boolean success) {
            methodMetrics.computeIfAbsent(methodName, MethodMetrics::new)
                         .record(duration, success);
        }
        
        void print() {
            methodMetrics.forEach((method, metrics) -> {
                System.out.printf("  %s: 调用%d次, 成功率%.1f%%, 平均耗时%.1fms%n",
                    method, metrics.totalCalls, metrics.getSuccessRate(), metrics.getAverageDuration());
            });
        }
    }
    
    static class MethodMetrics {
        private final String methodName;
        private final AtomicLong totalCalls = new AtomicLong();
        private final AtomicLong successCalls = new AtomicLong();
        private final AtomicLong totalDuration = new AtomicLong();
        
        MethodMetrics(String methodName) {
            this.methodName = methodName;
        }
        
        void record(long duration, boolean success) {
            totalCalls.incrementAndGet();
            totalDuration.addAndGet(duration);
            if (success) {
                successCalls.incrementAndGet();
            }
        }
        
        double getSuccessRate() {
            long total = totalCalls.get();
            return total > 0 ? (double) successCalls.get() / total * 100 : 0;
        }
        
        double getAverageDuration() {
            long total = totalCalls.get();
            return total > 0 ? (double) totalDuration.get() / total : 0;
        }
    }
}

// 监控代理处理器
public class MonitoringProxyHandler implements InvocationHandler {
    private final Object target;
    private final String proxyName;
    
    public MonitoringProxyHandler(Object target, String proxyName) {
        this.target = target;
        this.proxyName = proxyName;
    }
    
    @Override
     public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
         long startTime = System.currentTimeMillis();
         boolean success = false;
         
         try {
             Object result = method.invoke(target, args);
             success = true;
             return result;
         } catch (Exception e) {
             success = false;
             throw e;
         } finally {
             long duration = System.currentTimeMillis() - startTime;
             ProxyMonitor.recordMethodCall(proxyName, method.getName(), duration, success);
         }
     }
}
```

## 总结

代理模式是一种非常实用的设计模式，它通过引入代理对象来控制对目标对象的访问。代理模式的核心价值在于：

### 🎯 核心价值

1. **访问控制**：可以在不修改原有代码的情况下添加访问控制逻辑
2. **性能优化**：通过缓存、延迟加载等技术提高系统性能
3. **功能增强**：可以在原有功能基础上添加日志、监控、事务等横切关注点
4. **解耦合**：客户端与真实对象解耦，便于系统扩展和维护

### 📋 使用建议

1. **选择合适的代理类型**：根据具体需求选择虚拟代理、保护代理、远程代理等
2. **注意性能开销**：代理会增加一定的性能开销，需要权衡利弊
3. **保持接口一致性**：代理对象应该与目标对象实现相同的接口
4. **合理使用代理链**：多个代理可以组合使用，但要注意复杂度控制
5. **考虑线程安全**：在多线程环境中要确保代理的线程安全性

### 🚀 实际应用

代理模式在现代软件开发中应用广泛：

- **Spring AOP**：面向切面编程的核心实现机制
- **ORM 框架**：如 Hibernate 的懒加载机制
- **RPC 框架**：如 Dubbo、gRPC 的客户端代理
- **缓存系统**：Redis、Memcached 的客户端代理
- **安全框架**：如 Spring Security 的权限控制

代理模式体现了"控制访问"的设计思想，是构建灵活、可扩展系统的重要工具。通过合理运用代理模式，我们可以在不修改原有代码的基础上，为系统添加各种增强功能，提高代码的可维护性和可扩展性。
