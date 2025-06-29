# 享元模式 (Flyweight Pattern)

## 概述

享元模式（Flyweight Pattern）是一种结构型设计模式，通过共享技术有效地支持大量细粒度对象的复用。当系统中存在大量相似对象时，享元模式通过分离对象的内部状态（可共享）和外部状态（不可共享），实现对象的高效复用，从而大幅减少内存消耗。

简单来说，享元模式就是"共享对象"，把对象中不变的部分提取出来共享，变化的部分通过参数传入，这样就能用少量的对象支持大量的操作。

享元模式的核心思想是区分内部状态和外部状态：

- **内部状态（Intrinsic State）**：存储在享元对象内部，可以被多个环境共享，不会随环境改变
- **外部状态（Extrinsic State）**：依赖于环境，会根据环境改变，不能被共享

## 使用场景

- 系统中存在大量相似对象，造成内存开销过大
- 对象的大部分状态可以外部化，剩余的内部状态相对较少
- 对象可以按照内部状态分组，每组可以用一个享元对象替代
- 软件系统不依赖于对象的身份，即两个对象被同一个享元对象替代是可以接受的
- 需要缓冲池的场景，如线程池、数据库连接池等

## 类图结构

```plaintext
┌─────────────────┐
│     Client      │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐      ┌─────────────────┐
│ FlyweightFactory│─────▶│   Flyweight     │
│                 │      │   (interface)   │
│ + getFlyweight()│      │ + operation()   │
└─────────────────┘      └─────────┬───────┘
          │                        △
          │                        │
          ▼                        │
┌─────────────────┐                │
│   flyweights    │                │
│   (HashMap)     │                │
└─────────────────┘                │
                                   │
                        ┌─────────────────┐
                        │ ConcreteFlyweight│
                        │                 │
                        │ - intrinsicState│
                        │ + operation()   │
                        └─────────────────┘
```

- **Flyweight**：享元接口，定义享元对象的公共方法
- **ConcreteFlyweight**：具体享元类，实现享元接口，存储内部状态
- **FlyweightFactory**：享元工厂，管理享元对象的创建和共享
- **Client**：客户端，维护外部状态，调用享元对象

## 示例

### 示例1：文本编辑器字符渲染

**场景描述**：文本编辑器需要渲染大量字符，每个字符都有字体、大小、颜色等属性。如果为每个字符创建一个对象，内存消耗会非常大。

```java
// 享元接口
public interface CharacterFlyweight {
    void render(int x, int y, String color, int fontSize);
}

// 具体享元类 - 字符
public class Character implements CharacterFlyweight {
    private final char character; // 内部状态：字符本身
    private final String fontFamily; // 内部状态：字体族
    
    public Character(char character, String fontFamily) {
        this.character = character;
        this.fontFamily = fontFamily;
    }
    
    @Override
    public void render(int x, int y, String color, int fontSize) {
        // 外部状态：位置(x,y)、颜色、字体大小
        System.out.printf("渲染字符 '%c' 在位置(%d,%d)，字体：%s，颜色：%s，大小：%d%n",
                character, x, y, fontFamily, color, fontSize);
    }
    
    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Character that = (Character) obj;
        return character == that.character && 
               Objects.equals(fontFamily, that.fontFamily);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(character, fontFamily);
    }
}

// 享元工厂
public class CharacterFactory {
    private static final Map<String, CharacterFlyweight> flyweights = new HashMap<>();
    
    public static CharacterFlyweight getCharacter(char character, String fontFamily) {
        String key = character + "-" + fontFamily;
        
        CharacterFlyweight flyweight = flyweights.get(key);
        if (flyweight == null) {
            flyweight = new Character(character, fontFamily);
            flyweights.put(key, flyweight);
            System.out.println("创建新的享元对象：" + key);
        } else {
            System.out.println("复用享元对象：" + key);
        }
        
        return flyweight;
    }
    
    public static int getFlyweightCount() {
        return flyweights.size();
    }
    
    public static void printFlyweights() {
        System.out.println("当前享元对象数量：" + flyweights.size());
        flyweights.keySet().forEach(key -> System.out.println("  - " + key));
    }
}

// 文档类 - 管理外部状态
public class Document {
    private List<CharacterContext> characters = new ArrayList<>();
    
    // 字符上下文 - 存储外部状态
    private static class CharacterContext {
        private CharacterFlyweight flyweight;
        private int x, y;
        private String color;
        private int fontSize;
        
        public CharacterContext(CharacterFlyweight flyweight, int x, int y, 
                              String color, int fontSize) {
            this.flyweight = flyweight;
            this.x = x;
            this.y = y;
            this.color = color;
            this.fontSize = fontSize;
        }
        
        public void render() {
            flyweight.render(x, y, color, fontSize);
        }
    }
    
    public void addCharacter(char character, String fontFamily, int x, int y, 
                           String color, int fontSize) {
        CharacterFlyweight flyweight = CharacterFactory.getCharacter(character, fontFamily);
        characters.add(new CharacterContext(flyweight, x, y, color, fontSize));
    }
    
    public void render() {
        System.out.println("\n=== 渲染文档 ===");
        characters.forEach(CharacterContext::render);
        System.out.println();
        CharacterFactory.printFlyweights();
    }
}

// 客户端
public class TextEditorClient {
    public static void main(String[] args) {
        Document document = new Document();
        
        // 添加文本 "Hello World!"
        String text = "Hello World!";
        String fontFamily = "Arial";
        
        for (int i = 0; i < text.length(); i++) {
            char ch = text.charAt(i);
            document.addCharacter(ch, fontFamily, i * 10, 0, "black", 12);
        }
        
        // 添加更多相同字符
        document.addCharacter('H', fontFamily, 0, 20, "red", 14);
        document.addCharacter('e', fontFamily, 10, 20, "blue", 16);
        document.addCharacter('l', fontFamily, 20, 20, "green", 18);
        
        document.render();
        
        System.out.println("\n=== 内存使用分析 ===");
        System.out.println("文档中字符总数：" + (text.length() + 3));
        System.out.println("实际创建的享元对象数：" + CharacterFactory.getFlyweightCount());
        System.out.println("内存节省率：" + 
            String.format("%.1f%%", 
                (1.0 - (double)CharacterFactory.getFlyweightCount() / (text.length() + 3)) * 100));
    }
}
```

### 示例2：游戏中的粒子系统

**场景描述**：游戏中需要渲染大量粒子效果（如火花、雨滴、子弹等），每种粒子类型的纹理、动画是相同的，但位置、速度、生命周期不同。

```java
// 粒子享元接口
public interface ParticleFlyweight {
    void update(double x, double y, double velocityX, double velocityY, 
               double life, double deltaTime);
    void render(double x, double y, double alpha);
}

// 具体粒子享元
public class Particle implements ParticleFlyweight {
    private final String texture;     // 内部状态：纹理
    private final String animation;   // 内部状态：动画
    private final double mass;        // 内部状态：质量
    
    public Particle(String texture, String animation, double mass) {
        this.texture = texture;
        this.animation = animation;
        this.mass = mass;
        System.out.println("创建粒子享元：" + texture);
    }
    
    @Override
    public void update(double x, double y, double velocityX, double velocityY, 
                      double life, double deltaTime) {
        // 使用内部状态（质量）和外部状态计算物理效果
        double gravity = -9.8 * mass * deltaTime;
        System.out.printf("更新粒子[%s] 位置:(%.1f,%.1f) 速度:(%.1f,%.1f) 生命:%.2f%n",
                texture, x, y, velocityX, velocityY + gravity, life);
    }
    
    @Override
    public void render(double x, double y, double alpha) {
        System.out.printf("渲染粒子[%s] 在(%.1f,%.1f) 透明度:%.2f 动画:%s%n",
                texture, x, y, alpha, animation);
    }
}

// 粒子工厂
public class ParticleFactory {
    private static final Map<String, ParticleFlyweight> particles = new HashMap<>();
    
    public static ParticleFlyweight getParticle(String type) {
        ParticleFlyweight particle = particles.get(type);
        
        if (particle == null) {
            switch (type) {
                case "fire":
                    particle = new Particle("fire.png", "flame_anim", 0.1);
                    break;
                case "water":
                    particle = new Particle("water.png", "drop_anim", 0.5);
                    break;
                case "spark":
                    particle = new Particle("spark.png", "sparkle_anim", 0.05);
                    break;
                default:
                    throw new IllegalArgumentException("未知粒子类型：" + type);
            }
            particles.put(type, particle);
        }
        
        return particle;
    }
    
    public static int getParticleTypeCount() {
        return particles.size();
    }
}

// 粒子实例 - 存储外部状态
public class ParticleInstance {
    private ParticleFlyweight flyweight;
    private double x, y;              // 外部状态：位置
    private double velocityX, velocityY; // 外部状态：速度
    private double life;              // 外部状态：生命周期
    private double maxLife;
    
    public ParticleInstance(String type, double x, double y, 
                          double velocityX, double velocityY, double life) {
        this.flyweight = ParticleFactory.getParticle(type);
        this.x = x;
        this.y = y;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.life = life;
        this.maxLife = life;
    }
    
    public void update(double deltaTime) {
        flyweight.update(x, y, velocityX, velocityY, life, deltaTime);
        
        // 更新外部状态
        x += velocityX * deltaTime;
        y += velocityY * deltaTime;
        life -= deltaTime;
    }
    
    public void render() {
        double alpha = life / maxLife; // 根据生命周期计算透明度
        flyweight.render(x, y, alpha);
    }
    
    public boolean isAlive() {
        return life > 0;
    }
}

// 粒子系统
public class ParticleSystem {
    private List<ParticleInstance> particles = new ArrayList<>();
    
    public void addParticle(String type, double x, double y, 
                          double velocityX, double velocityY, double life) {
        particles.add(new ParticleInstance(type, x, y, velocityX, velocityY, life));
    }
    
    public void update(double deltaTime) {
        // 更新所有粒子
        particles.forEach(particle -> particle.update(deltaTime));
        
        // 移除死亡的粒子
        particles.removeIf(particle -> !particle.isAlive());
    }
    
    public void render() {
        System.out.println("\n=== 渲染粒子系统 ===");
        particles.forEach(ParticleInstance::render);
        System.out.println("活跃粒子数：" + particles.size());
        System.out.println("享元类型数：" + ParticleFactory.getParticleTypeCount());
    }
    
    public int getParticleCount() {
        return particles.size();
    }
}

// 游戏客户端
public class GameClient {
    public static void main(String[] args) {
        ParticleSystem particleSystem = new ParticleSystem();
        
        // 创建火焰效果
        for (int i = 0; i < 50; i++) {
            particleSystem.addParticle("fire", 
                Math.random() * 100, Math.random() * 100,
                (Math.random() - 0.5) * 20, Math.random() * 30,
                2.0 + Math.random() * 3.0);
        }
        
        // 创建水滴效果
        for (int i = 0; i < 30; i++) {
            particleSystem.addParticle("water",
                Math.random() * 100, 200,
                (Math.random() - 0.5) * 10, -50 - Math.random() * 20,
                3.0 + Math.random() * 2.0);
        }
        
        // 创建火花效果
        for (int i = 0; i < 100; i++) {
            particleSystem.addParticle("spark",
                50, 50,
                (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100,
                1.0 + Math.random() * 2.0);
        }
        
        // 模拟游戏循环
        double deltaTime = 0.016; // 60 FPS
        
        for (int frame = 0; frame < 5; frame++) {
            System.out.println("\n=== 第 " + (frame + 1) + " 帧 ===");
            particleSystem.update(deltaTime);
            
            if (frame == 0 || frame == 4) {
                particleSystem.render();
            }
        }
        
        System.out.println("\n=== 性能统计 ===");
        System.out.println("总粒子实例：" + (50 + 30 + 100));
        System.out.println("享元对象数：" + ParticleFactory.getParticleTypeCount());
        System.out.println("内存节省：使用享元模式，只需要 " + 
            ParticleFactory.getParticleTypeCount() + " 个享元对象支持 " + 
            (50 + 30 + 100) + " 个粒子实例");
    }
}
```

## 优缺点分析

### ✅ 优点

| 优点                | 说明                                     |
| ------------------- | ---------------------------------------- |
| **1. 大幅减少内存消耗** | 通过共享相同的享元对象，显著降低内存使用量 |
| **2. 提高系统性能**    | 减少对象创建和垃圾回收的开销             |
| **3. 集中管理共享状态** | 享元工厂统一管理共享对象，便于维护       |
| **4. 支持大量对象**    | 能够高效支持大量细粒度对象的使用         |
| **5. 状态分离清晰**    | 明确区分内部状态和外部状态，职责清晰     |

### ❌ 缺点

| 缺点                | 说明                                     |
| ------------------- | ---------------------------------------- |
| **1. 增加系统复杂度**  | 需要分离内部外部状态，增加设计复杂性     |
| **2. 外部状态管理**   | 客户端需要维护外部状态，增加使用复杂度   |
| **3. 运行时间开销**   | 查找享元对象可能带来额外的时间开销       |
| **4. 线程安全问题**   | 多线程环境下需要考虑享元对象的线程安全   |
| **5. 不适合少量对象** | 对象数量较少时，享元模式的优势不明显     |

## 和其他模式对比

| 模式       | 本质思想           | 与享元模式的区别                         |
| ---------- | ------------------ | ---------------------------------------- |
| **享元模式**   | 共享对象减少内存   | 关注内存优化，通过共享减少对象数量       |
| **单例模式**   | 确保唯一实例       | 关注实例控制，享元关注对象复用           |
| **原型模式**   | 克隆对象创建       | 关注对象创建，享元关注对象共享           |
| **对象池模式** | 复用昂贵对象       | 关注对象生命周期管理，享元关注状态分离   |
| **工厂模式**   | 封装对象创建       | 关注创建过程，享元工厂还负责对象缓存     |

## 在实际框架中的应用

### 1. Java String 常量池

Java 的 String 常量池是享元模式的经典应用：

```java
public class StringFlyweightExample {
    public static void main(String[] args) {
        // 字符串字面量会被放入常量池，实现共享
        String s1 = "Hello";
        String s2 = "Hello";
        String s3 = "Hello";
        
        System.out.println("s1 == s2: " + (s1 == s2)); // true，共享同一个对象
        System.out.println("s1 == s3: " + (s1 == s3)); // true，共享同一个对象
        
        // 使用 intern() 方法也可以实现共享
        String s4 = new String("Hello").intern();
        System.out.println("s1 == s4: " + (s1 == s4)); // true
        
        // 不同的字符串内容会创建不同的享元对象
        String s5 = "World";
        System.out.println("s1 == s5: " + (s1 == s5)); // false
    }
}
```

### 2. Integer 缓存池

Java 的 Integer 类也使用了享元模式：

```java
public class IntegerFlyweightExample {
    public static void main(String[] args) {
        // -128 到 127 之间的 Integer 对象会被缓存
        Integer a1 = 100;
        Integer a2 = 100;
        System.out.println("a1 == a2: " + (a1 == a2)); // true，共享缓存对象
        
        Integer b1 = 200;
        Integer b2 = 200;
        System.out.println("b1 == b2: " + (b1 == b2)); // false，超出缓存范围
        
        // 查看 Integer 缓存的实现
        System.out.println("Integer 缓存范围：" + 
            Integer.valueOf(-128) + " 到 " + Integer.valueOf(127));
    }
}
```

### 3. 数据库连接池

数据库连接池也体现了享元模式的思想：

```java
// 简化的连接池实现
public class ConnectionPool {
    private static final int MAX_CONNECTIONS = 10;
    private static final Queue<Connection> pool = new LinkedList<>();
    private static final Set<Connection> usedConnections = new HashSet<>();
    
    static {
        // 初始化连接池
        for (int i = 0; i < MAX_CONNECTIONS; i++) {
            pool.offer(createConnection());
        }
    }
    
    public static synchronized Connection getConnection() {
        if (pool.isEmpty()) {
            throw new RuntimeException("连接池已满");
        }
        
        Connection connection = pool.poll();
        usedConnections.add(connection);
        return connection;
    }
    
    public static synchronized void releaseConnection(Connection connection) {
        if (usedConnections.remove(connection)) {
            pool.offer(connection);
        }
    }
    
    private static Connection createConnection() {
        // 创建数据库连接的逻辑
        return new MockConnection();
    }
    
    public static int getAvailableConnections() {
        return pool.size();
    }
    
    public static int getUsedConnections() {
        return usedConnections.size();
    }
}
```

### 4. Web 框架中的视图对象

在 Web 框架中，视图模板也常使用享元模式：

```java
// 模板享元
public class TemplateEngine {
    private static final Map<String, Template> templateCache = new ConcurrentHashMap<>();
    
    public static Template getTemplate(String templatePath) {
        return templateCache.computeIfAbsent(templatePath, path -> {
            System.out.println("加载模板：" + path);
            return new Template(path);
        });
    }
    
    public static class Template {
        private final String path;
        private final String content;
        
        public Template(String path) {
            this.path = path;
            this.content = loadTemplateContent(path);
        }
        
        public String render(Map<String, Object> context) {
            // 使用外部状态（context）渲染模板
            String result = content;
            for (Map.Entry<String, Object> entry : context.entrySet()) {
                result = result.replace("${" + entry.getKey() + "}", 
                                      String.valueOf(entry.getValue()));
            }
            return result;
        }
        
        private String loadTemplateContent(String path) {
            // 模拟加载模板内容
            return "<html><body><h1>${title}</h1><p>${content}</p></body></html>";
        }
    }
}

// 使用示例
public class WebController {
    public String renderPage(String templatePath, Map<String, Object> data) {
        Template template = TemplateEngine.getTemplate(templatePath);
        return template.render(data); // 外部状态通过参数传入
    }
}
```

## 享元模式的变种和扩展

### 1. 复合享元模式

当享元对象本身也包含其他享元对象时：

```java
// 复合享元 - 文档段落
public class ParagraphFlyweight {
    private List<CharacterFlyweight> characters;
    private String style; // 内部状态：段落样式
    
    public ParagraphFlyweight(String style) {
        this.style = style;
        this.characters = new ArrayList<>();
    }
    
    public void addCharacter(CharacterFlyweight character) {
        characters.add(character);
    }
    
    public void render(int x, int y, Map<String, Object> context) {
        System.out.println("渲染段落，样式：" + style);
        int charX = x;
        for (CharacterFlyweight character : characters) {
            character.render(charX, y, 
                (String) context.get("color"), 
                (Integer) context.get("fontSize"));
            charX += 10;
        }
    }
}
```

### 2. 享元 + 观察者模式

享元对象状态变化时通知观察者：

```java
public class ObservableFlyweight implements CharacterFlyweight {
    private final char character;
    private final String fontFamily;
    private final List<FlyweightObserver> observers = new ArrayList<>();
    
    public ObservableFlyweight(char character, String fontFamily) {
        this.character = character;
        this.fontFamily = fontFamily;
    }
    
    public void addObserver(FlyweightObserver observer) {
        observers.add(observer);
    }
    
    @Override
    public void render(int x, int y, String color, int fontSize) {
        // 渲染逻辑
        System.out.printf("渲染字符 '%c'%n", character);
        
        // 通知观察者
        observers.forEach(observer -> 
            observer.onRender(this, x, y, color, fontSize));
    }
    
    public interface FlyweightObserver {
        void onRender(CharacterFlyweight flyweight, int x, int y, 
                     String color, int fontSize);
    }
}
```

### 3. 线程安全的享元工厂

```java
public class ThreadSafeFlyweightFactory {
    private static final ConcurrentHashMap<String, CharacterFlyweight> flyweights 
        = new ConcurrentHashMap<>();
    private static final AtomicInteger createCount = new AtomicInteger(0);
    
    public static CharacterFlyweight getCharacter(char character, String fontFamily) {
        String key = character + "-" + fontFamily;
        
        return flyweights.computeIfAbsent(key, k -> {
            createCount.incrementAndGet();
            System.out.println("线程 " + Thread.currentThread().getName() + 
                             " 创建享元：" + k);
            return new Character(character, fontFamily);
        });
    }
    
    public static int getCreateCount() {
        return createCount.get();
    }
    
    // 多线程测试
    public static void main(String[] args) throws InterruptedException {
        int threadCount = 10;
        CountDownLatch latch = new CountDownLatch(threadCount);
        
        for (int i = 0; i < threadCount; i++) {
            new Thread(() -> {
                try {
                    for (int j = 0; j < 100; j++) {
                        getCharacter('A', "Arial");
                        getCharacter('B', "Arial");
                    }
                } finally {
                    latch.countDown();
                }
            }, "Thread-" + i).start();
        }
        
        latch.await();
        System.out.println("总创建次数：" + getCreateCount());
        System.out.println("享元对象数：" + flyweights.size());
    }
}
```

## 实际项目中的最佳实践

### 1. 享元对象的设计原则

```java
// ✅ 好的享元设计
public class GoodFlyweight {
    // 内部状态：不可变、可共享
    private final String type;
    private final String texture;
    private final double mass;
    
    public GoodFlyweight(String type, String texture, double mass) {
        this.type = type;
        this.texture = texture;
        this.mass = mass;
    }
    
    // 通过参数接收外部状态
    public void operation(ExternalState state) {
        // 使用内部状态和外部状态进行操作
        System.out.println("类型：" + type + ", 位置：" + state.getPosition());
    }
    
    // 内部状态不可修改
    public String getType() {
        return type;
    }
}

// ❌ 不好的享元设计
public class BadFlyweight {
    private String type;        // 可变的内部状态
    private double x, y;        // 外部状态混入内部
    private String color;       // 应该是外部状态
    
    // 违反享元模式原则的设计
    public void setPosition(double x, double y) {
        this.x = x;
        this.y = y;
    }
}
```

### 2. 享元工厂的优化

```java
public class OptimizedFlyweightFactory {
    private static final Map<String, WeakReference<CharacterFlyweight>> flyweights 
        = new ConcurrentHashMap<>();
    private static final ScheduledExecutorService cleaner 
        = Executors.newScheduledThreadPool(1);
    
    static {
        // 定期清理无效的弱引用
        cleaner.scheduleAtFixedRate(() -> {
            flyweights.entrySet().removeIf(entry -> 
                entry.getValue().get() == null);
        }, 1, 1, TimeUnit.MINUTES);
    }
    
    public static CharacterFlyweight getCharacter(char character, String fontFamily) {
        String key = character + "-" + fontFamily;
        
        WeakReference<CharacterFlyweight> ref = flyweights.get(key);
        CharacterFlyweight flyweight = (ref != null) ? ref.get() : null;
        
        if (flyweight == null) {
            flyweight = new Character(character, fontFamily);
            flyweights.put(key, new WeakReference<>(flyweight));
        }
        
        return flyweight;
    }
    
    public static void shutdown() {
        cleaner.shutdown();
    }
}
```

### 3. 外部状态的管理策略

```java
// 外部状态管理器
public class ExternalStateManager {
    private final Map<Object, Map<String, Object>> stateMap = new WeakHashMap<>();
    
    public void setState(Object flyweight, String key, Object value) {
        stateMap.computeIfAbsent(flyweight, k -> new HashMap<>()).put(key, value);
    }
    
    public Object getState(Object flyweight, String key) {
        Map<String, Object> states = stateMap.get(flyweight);
        return states != null ? states.get(key) : null;
    }
    
    public void removeState(Object flyweight) {
        stateMap.remove(flyweight);
    }
    
    public int getStateCount() {
        return stateMap.size();
    }
}

// 使用示例
public class StateManagerExample {
    private ExternalStateManager stateManager = new ExternalStateManager();
    
    public void useCharacter() {
        CharacterFlyweight char1 = CharacterFactory.getCharacter('A', "Arial");
        CharacterFlyweight char2 = CharacterFactory.getCharacter('A', "Arial");
        
        // char1 和 char2 是同一个享元对象
        assert char1 == char2;
        
        // 为同一个享元对象设置不同的外部状态
        stateManager.setState(char1, "position", new Point(10, 20));
        stateManager.setState(char1, "color", "red");
        
        // 在另一个上下文中使用相同享元
        stateManager.setState(char2, "position", new Point(30, 40));
        stateManager.setState(char2, "color", "blue");
        
        // 注意：由于 char1 == char2，后设置的状态会覆盖前面的
        // 这说明外部状态不应该与享元对象绑定
    }
}
```

### 4. 性能监控和调优

```java
public class FlyweightMetrics {
    private static final AtomicLong hitCount = new AtomicLong(0);
    private static final AtomicLong missCount = new AtomicLong(0);
    private static final AtomicLong createTime = new AtomicLong(0);
    
    public static void recordHit() {
        hitCount.incrementAndGet();
    }
    
    public static void recordMiss(long creationTime) {
        missCount.incrementAndGet();
        createTime.addAndGet(creationTime);
    }
    
    public static void printMetrics() {
        long total = hitCount.get() + missCount.get();
        double hitRate = total > 0 ? (double) hitCount.get() / total * 100 : 0;
        
        System.out.println("=== 享元模式性能指标 ===");
        System.out.println("缓存命中次数：" + hitCount.get());
        System.out.println("缓存未命中次数：" + missCount.get());
        System.out.println("缓存命中率：" + String.format("%.2f%%", hitRate));
        System.out.println("平均创建时间：" + 
            (missCount.get() > 0 ? createTime.get() / missCount.get() : 0) + "ms");
    }
    
    public static void reset() {
        hitCount.set(0);
        missCount.set(0);
        createTime.set(0);
    }
}

// 带监控的享元工厂
public class MonitoredFlyweightFactory {
    private static final Map<String, CharacterFlyweight> flyweights = new HashMap<>();
    
    public static synchronized CharacterFlyweight getCharacter(char character, String fontFamily) {
        String key = character + "-" + fontFamily;
        
        CharacterFlyweight flyweight = flyweights.get(key);
        if (flyweight != null) {
            FlyweightMetrics.recordHit();
            return flyweight;
        }
        
        // 记录创建时间
        long startTime = System.currentTimeMillis();
        flyweight = new Character(character, fontFamily);
        long creationTime = System.currentTimeMillis() - startTime;
        
        flyweights.put(key, flyweight);
        FlyweightMetrics.recordMiss(creationTime);
        
        return flyweight;
    }
}
```

享元模式通过巧妙地分离内部状态和外部状态，实现了对象的高效共享，在处理大量相似对象时能够显著减少内存消耗。在实际应用中，需要仔细分析对象的状态特征，合理设计享元对象和外部状态管理，才能充分发挥享元模式的优势。