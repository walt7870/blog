# 模板方法模式 (Template Method Pattern)

## 概述

模板方法模式是一种行为型设计模式，它在超类中定义了一个算法的骨架，允许子类在不改变算法整体结构的情况下重写算法的特定步骤。这个模式体现了"好莱坞原则"："别调用我们，我们会调用你"。

### 核心思想

- **算法骨架固定**：在抽象类中定义算法的基本结构
- **步骤可变**：允许子类重写算法中的某些步骤
- **控制反转**：由父类控制算法的执行流程，子类只负责实现具体步骤
- **代码复用**：公共逻辑在父类中实现，避免重复代码

## 使用场景

### 适用情况

1. **算法结构固定，步骤可变**：多个类有相似的算法结构，但某些步骤的实现不同
2. **代码复用需求**：希望避免重复代码，将公共行为提取到父类
3. **扩展控制**：希望控制子类的扩展点，只允许在特定位置进行定制
4. **框架设计**：设计框架时，定义处理流程的骨架，让用户实现具体步骤

### 典型应用

- **数据处理流程**：数据读取→处理→输出的固定流程
- **测试框架**：setUp→test→tearDown的测试流程
- **Web框架**：请求处理的生命周期管理
- **编译器设计**：词法分析→语法分析→代码生成的编译流程

## UML类图

```
┌─────────────────────────────────┐
│        AbstractClass            │
├─────────────────────────────────┤
│ + templateMethod(): void        │
│ # primitiveOperation1(): void   │
│ # primitiveOperation2(): void   │
│ # hook(): void                  │
└─────────────────────────────────┘
                 △
                 │
    ┌────────────┴────────────┐
    │                         │
┌───▽──────────┐    ┌────────▽─────────┐
│ ConcreteClassA│    │ ConcreteClassB   │
├───────────────┤    ├──────────────────┤
│ + primitive   │    │ + primitive      │
│   Operation1()│    │   Operation1()   │
│ + primitive   │    │ + primitive      │
│   Operation2()│    │   Operation2()   │
│ + hook()      │    │ + hook()         │
└───────────────┘    └──────────────────┘
```

## 核心组件

### 1. 抽象类 (Abstract Class)
- **职责**：定义模板方法和抽象的原语操作
- **特点**：包含算法骨架，控制执行流程

### 2. 具体类 (Concrete Class)
- **职责**：实现抽象类中的抽象方法
- **特点**：提供算法步骤的具体实现

### 3. 模板方法 (Template Method)
- **职责**：定义算法的骨架
- **特点**：调用抽象方法和钩子方法

### 4. 钩子方法 (Hook Method)
- **职责**：提供默认行为，子类可选择性重写
- **特点**：增加算法的灵活性

## 实践示例

### 示例1：数据处理框架

```java
// 抽象数据处理器
abstract class DataProcessor {
    
    // 模板方法：定义数据处理的完整流程
    public final void processData() {
        System.out.println("=== 开始数据处理 ===");
        
        // 1. 数据读取
        Data data = readData();
        if (data == null) {
            System.out.println("数据读取失败，处理终止");
            return;
        }
        
        // 2. 数据验证
        if (!validateData(data)) {
            System.out.println("数据验证失败，处理终止");
            return;
        }
        
        // 3. 数据转换
        Data transformedData = transformData(data);
        
        // 4. 数据处理
        Data processedData = processBusinessLogic(transformedData);
        
        // 5. 数据输出
        outputData(processedData);
        
        // 6. 清理资源（钩子方法）
        cleanup();
        
        System.out.println("=== 数据处理完成 ===");
    }
    
    // 抽象方法：子类必须实现
    protected abstract Data readData();
    protected abstract boolean validateData(Data data);
    protected abstract Data transformData(Data data);
    protected abstract Data processBusinessLogic(Data data);
    protected abstract void outputData(Data data);
    
    // 钩子方法：子类可选择性重写
    protected void cleanup() {
        System.out.println("执行默认清理操作");
    }
    
    // 辅助方法
    protected void logStep(String step) {
        System.out.println("[" + getClass().getSimpleName() + "] " + step);
    }
}

// 数据实体类
class Data {
    private String content;
    private String type;
    private long timestamp;
    
    public Data(String content, String type) {
        this.content = content;
        this.type = type;
        this.timestamp = System.currentTimeMillis();
    }
    
    // Getters and Setters
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public long getTimestamp() { return timestamp; }
    
    @Override
    public String toString() {
        return String.format("Data{type='%s', content='%s', timestamp=%d}", 
                           type, content, timestamp);
    }
}

// 具体实现：CSV文件处理器
class CsvDataProcessor extends DataProcessor {
    private String filePath;
    
    public CsvDataProcessor(String filePath) {
        this.filePath = filePath;
    }
    
    @Override
    protected Data readData() {
        logStep("从CSV文件读取数据: " + filePath);
        // 模拟从CSV文件读取数据
        return new Data("name,age,city\nJohn,25,NYC\nJane,30,LA", "CSV");
    }
    
    @Override
    protected boolean validateData(Data data) {
        logStep("验证CSV数据格式");
        // 验证CSV格式
        return data.getContent() != null && 
               data.getContent().contains(",") && 
               data.getType().equals("CSV");
    }
    
    @Override
    protected Data transformData(Data data) {
        logStep("转换CSV数据为标准格式");
        // 将CSV转换为JSON格式
        String[] lines = data.getContent().split("\n");
        StringBuilder json = new StringBuilder("[\n");
        
        if (lines.length > 1) {
            String[] headers = lines[0].split(",");
            for (int i = 1; i < lines.length; i++) {
                String[] values = lines[i].split(",");
                json.append("  {");
                for (int j = 0; j < headers.length && j < values.length; j++) {
                    json.append(String.format("\"%s\":\"%s\"", headers[j], values[j]));
                    if (j < headers.length - 1) json.append(",");
                }
                json.append("}");
                if (i < lines.length - 1) json.append(",");
                json.append("\n");
            }
        }
        json.append("]");
        
        return new Data(json.toString(), "JSON");
    }
    
    @Override
    protected Data processBusinessLogic(Data data) {
        logStep("执行CSV数据业务逻辑处理");
        // 添加处理时间戳
        String processedContent = data.getContent().replace(
            "]", 
            ",\n  {\"processed_at\":\"" + new java.util.Date() + "\"}\n]"
        );
        return new Data(processedContent, data.getType());
    }
    
    @Override
    protected void outputData(Data data) {
        logStep("输出处理后的数据");
        System.out.println("处理结果:");
        System.out.println(data.getContent());
    }
    
    @Override
    protected void cleanup() {
        logStep("清理CSV处理器资源");
        // 清理临时文件、关闭文件流等
        super.cleanup();
    }
}

// 具体实现：XML文件处理器
class XmlDataProcessor extends DataProcessor {
    private String xmlContent;
    
    public XmlDataProcessor(String xmlContent) {
        this.xmlContent = xmlContent;
    }
    
    @Override
    protected Data readData() {
        logStep("读取XML数据");
        return new Data(xmlContent, "XML");
    }
    
    @Override
    protected boolean validateData(Data data) {
        logStep("验证XML数据格式");
        // 简单的XML格式验证
        return data.getContent() != null && 
               data.getContent().contains("<") && 
               data.getContent().contains(">") &&
               data.getType().equals("XML");
    }
    
    @Override
    protected Data transformData(Data data) {
        logStep("转换XML数据");
        // 简化的XML到JSON转换
        String content = data.getContent()
            .replaceAll("<([^>]+)>([^<]+)</[^>]+>", "\"$1\":\"$2\"")
            .replaceAll(",\s*$", "");
        return new Data("{" + content + "}", "JSON");
    }
    
    @Override
    protected Data processBusinessLogic(Data data) {
        logStep("执行XML数据业务逻辑处理");
        // 添加元数据
        String processedContent = data.getContent().replace(
            "}", 
            ",\"metadata\":{\"source\":\"XML\",\"processed_at\":\"" + 
            System.currentTimeMillis() + "\"}}"
        );
        return new Data(processedContent, data.getType());
    }
    
    @Override
    protected void outputData(Data data) {
        logStep("输出XML处理结果");
        System.out.println("XML处理结果:");
        System.out.println(data.getContent());
    }
}
```

### 示例2：游戏AI行为框架

```java
// 抽象游戏AI
abstract class GameAI {
    
    // 模板方法：定义AI的完整行为流程
    public final void takeTurn() {
        System.out.println("=== " + getAIName() + " 开始回合 ===");
        
        // 1. 收集信息
        GameState gameState = collectInformation();
        
        // 2. 分析局势
        AnalysisResult analysis = analyzeGameState(gameState);
        
        // 3. 制定策略
        Strategy strategy = planStrategy(analysis);
        
        // 4. 执行行动
        Action action = executeAction(strategy);
        
        // 5. 评估结果（钩子方法）
        evaluateResult(action);
        
        // 6. 学习优化（钩子方法）
        if (shouldLearn()) {
            learn(action, gameState);
        }
        
        System.out.println("=== " + getAIName() + " 回合结束 ===");
    }
    
    // 抽象方法：子类必须实现
    protected abstract String getAIName();
    protected abstract GameState collectInformation();
    protected abstract AnalysisResult analyzeGameState(GameState state);
    protected abstract Strategy planStrategy(AnalysisResult analysis);
    protected abstract Action executeAction(Strategy strategy);
    
    // 钩子方法：子类可选择性重写
    protected void evaluateResult(Action action) {
        System.out.println("[" + getAIName() + "] 执行了行动: " + action.getDescription());
    }
    
    protected boolean shouldLearn() {
        return false; // 默认不学习
    }
    
    protected void learn(Action action, GameState state) {
        System.out.println("[" + getAIName() + "] 进行学习优化");
    }
    
    // 辅助方法
    protected void logDecision(String decision) {
        System.out.println("[" + getAIName() + "] 决策: " + decision);
    }
}

// 游戏状态类
class GameState {
    private int playerHealth;
    private int enemyHealth;
    private int resources;
    private String[] availableActions;
    
    public GameState(int playerHealth, int enemyHealth, int resources, String[] actions) {
        this.playerHealth = playerHealth;
        this.enemyHealth = enemyHealth;
        this.resources = resources;
        this.availableActions = actions;
    }
    
    // Getters
    public int getPlayerHealth() { return playerHealth; }
    public int getEnemyHealth() { return enemyHealth; }
    public int getResources() { return resources; }
    public String[] getAvailableActions() { return availableActions; }
}

// 分析结果类
class AnalysisResult {
    private String situation;
    private double winProbability;
    private String[] threats;
    private String[] opportunities;
    
    public AnalysisResult(String situation, double winProbability, 
                         String[] threats, String[] opportunities) {
        this.situation = situation;
        this.winProbability = winProbability;
        this.threats = threats;
        this.opportunities = opportunities;
    }
    
    // Getters
    public String getSituation() { return situation; }
    public double getWinProbability() { return winProbability; }
    public String[] getThreats() { return threats; }
    public String[] getOpportunities() { return opportunities; }
}

// 策略类
class Strategy {
    private String name;
    private String description;
    private int priority;
    
    public Strategy(String name, String description, int priority) {
        this.name = name;
        this.description = description;
        this.priority = priority;
    }
    
    // Getters
    public String getName() { return name; }
    public String getDescription() { return description; }
    public int getPriority() { return priority; }
}

// 行动类
class Action {
    private String type;
    private String description;
    private boolean success;
    
    public Action(String type, String description) {
        this.type = type;
        this.description = description;
        this.success = true;
    }
    
    // Getters and Setters
    public String getType() { return type; }
    public String getDescription() { return description; }
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
}

// 具体实现：攻击型AI
class AggressiveAI extends GameAI {
    
    @Override
    protected String getAIName() {
        return "攻击型AI";
    }
    
    @Override
    protected GameState collectInformation() {
        logDecision("收集战场信息，重点关注攻击机会");
        return new GameState(80, 60, 100, 
            new String[]{"攻击", "强化攻击", "防御", "技能"});
    }
    
    @Override
    protected AnalysisResult analyzeGameState(GameState state) {
        logDecision("分析局势：优先考虑攻击策略");
        
        double winProb = state.getPlayerHealth() > state.getEnemyHealth() ? 0.7 : 0.4;
        String situation = state.getEnemyHealth() < 30 ? "敌人血量较低" : "正常对战";
        
        return new AnalysisResult(situation, winProb,
            new String[]{"敌人可能反击"},
            new String[]{"可以发动强攻", "敌人防御较弱"});
    }
    
    @Override
    protected Strategy planStrategy(AnalysisResult analysis) {
        if (analysis.getWinProbability() > 0.6) {
            logDecision("制定全面攻击策略");
            return new Strategy("全面攻击", "集中火力攻击敌人", 9);
        } else {
            logDecision("制定谨慎攻击策略");
            return new Strategy("谨慎攻击", "寻找机会进行攻击", 6);
        }
    }
    
    @Override
    protected Action executeAction(Strategy strategy) {
        if (strategy.getPriority() >= 8) {
            return new Action("强化攻击", "发动强化攻击，造成大量伤害");
        } else {
            return new Action("普通攻击", "进行普通攻击");
        }
    }
    
    @Override
    protected void evaluateResult(Action action) {
        super.evaluateResult(action);
        System.out.println("[" + getAIName() + "] 攻击效果评估: " + 
                         (action.isSuccess() ? "成功" : "失败"));
    }
}

// 具体实现：防御型AI
class DefensiveAI extends GameAI {
    
    @Override
    protected String getAIName() {
        return "防御型AI";
    }
    
    @Override
    protected GameState collectInformation() {
        logDecision("收集信息，重点关注威胁和防御机会");
        return new GameState(50, 80, 120, 
            new String[]{"防御", "治疗", "攻击", "逃跑"});
    }
    
    @Override
    protected AnalysisResult analyzeGameState(GameState state) {
        logDecision("分析局势：优先考虑生存策略");
        
        double winProb = state.getPlayerHealth() < 30 ? 0.2 : 0.5;
        String situation = state.getPlayerHealth() < 30 ? "血量危险" : "相对安全";
        
        return new AnalysisResult(situation, winProb,
            new String[]{"敌人攻击力强", "血量不足"},
            new String[]{"可以防御反击", "有治疗机会"});
    }
    
    @Override
    protected Strategy planStrategy(AnalysisResult analysis) {
        if (analysis.getSituation().contains("危险")) {
            logDecision("制定紧急防御策略");
            return new Strategy("紧急防御", "优先保命和治疗", 10);
        } else {
            logDecision("制定稳健防御策略");
            return new Strategy("稳健防御", "防御为主，伺机反击", 7);
        }
    }
    
    @Override
    protected Action executeAction(Strategy strategy) {
        if (strategy.getName().contains("紧急")) {
            return new Action("治疗", "使用治疗技能恢复生命值");
        } else {
            return new Action("防御", "提高防御力，减少受到的伤害");
        }
    }
    
    @Override
    protected boolean shouldLearn() {
        return true; // 防御型AI会学习
    }
    
    @Override
    protected void learn(Action action, GameState state) {
        System.out.println("[" + getAIName() + "] 学习防御策略的有效性");
        System.out.println("[" + getAIName() + "] 更新防御优先级算法");
    }
}
```

## 优缺点分析

### 优点

1. **代码复用**：公共算法逻辑在父类中实现，避免重复代码
2. **控制反转**：父类控制算法流程，子类只需实现具体步骤
3. **扩展性好**：新增算法变种只需继承并实现抽象方法
4. **符合开闭原则**：对扩展开放，对修改封闭
5. **易于维护**：算法结构集中管理，修改影响范围可控

### 缺点

1. **继承限制**：必须通过继承实现，增加了类的层次结构
2. **调试困难**：算法流程分散在父类和子类中，调试相对复杂
3. **灵活性受限**：算法骨架固定，难以进行大幅度的流程调整
4. **子类数量增加**：每种算法变种都需要一个子类
5. **理解成本**：需要理解整个继承体系才能掌握完整逻辑

## 与其他模式的对比

### 与策略模式的对比

| 特性 | 模板方法模式 | 策略模式 |
|------|-------------|----------|
| **结构** | 继承关系 | 组合关系 |
| **控制** | 父类控制流程 | 客户端选择策略 |
| **变化点** | 算法步骤 | 整个算法 |
| **扩展** | 继承扩展 | 组合扩展 |
| **复用** | 代码复用好 | 策略可复用 |

### 与工厂方法模式的对比

| 特性 | 模板方法模式 | 工厂方法模式 |
|------|-------------|-------------|
| **目的** | 定义算法骨架 | 创建对象 |
| **关注点** | 行为的变化 | 对象的创建 |
| **方法类型** | 多个抽象方法 | 单个工厂方法 |
| **应用场景** | 算法流程 | 对象实例化 |

### 与命令模式的对比

| 特性 | 模板方法模式 | 命令模式 |
|------|-------------|----------|
| **封装** | 封装算法骨架 | 封装请求 |
| **执行** | 立即执行 | 延迟执行 |
| **撤销** | 不支持 | 支持撤销 |
| **队列** | 不支持 | 支持队列 |

## 实际应用场景

### 1. Web框架中的请求处理

```java
// Spring MVC中的HandlerInterceptor就是模板方法模式的应用
abstract class RequestProcessor {
    
    public final void processRequest(HttpRequest request, HttpResponse response) {
        // 1. 预处理
        if (!preHandle(request, response)) {
            return;
        }
        
        try {
            // 2. 处理请求
            handleRequest(request, response);
        } catch (Exception e) {
            // 3. 异常处理
            handleException(request, response, e);
        } finally {
            // 4. 后处理
            postHandle(request, response);
        }
    }
    
    protected abstract void handleRequest(HttpRequest request, HttpResponse response);
    
    protected boolean preHandle(HttpRequest request, HttpResponse response) {
        return true; // 默认允许处理
    }
    
    protected void postHandle(HttpRequest request, HttpResponse response) {
        // 默认空实现
    }
    
    protected void handleException(HttpRequest request, HttpResponse response, Exception e) {
        response.setStatus(500);
        response.setBody("Internal Server Error");
    }
}
```

### 2. 测试框架中的测试流程

```java
// JUnit风格的测试框架
abstract class TestCase {
    
    public final void runTest() {
        System.out.println("开始测试: " + getTestName());
        
        try {
            // 1. 测试准备
            setUp();
            
            // 2. 执行测试
            executeTest();
            
            System.out.println("测试通过: " + getTestName());
        } catch (AssertionError e) {
            System.out.println("测试失败: " + getTestName() + " - " + e.getMessage());
        } catch (Exception e) {
            System.out.println("测试错误: " + getTestName() + " - " + e.getMessage());
        } finally {
            // 3. 清理资源
            tearDown();
        }
    }
    
    protected abstract String getTestName();
    protected abstract void executeTest() throws Exception;
    
    protected void setUp() {
        // 默认空实现
    }
    
    protected void tearDown() {
        // 默认空实现
    }
    
    // 断言方法
    protected void assertEquals(Object expected, Object actual) {
        if (!Objects.equals(expected, actual)) {
            throw new AssertionError("Expected: " + expected + ", but was: " + actual);
        }
    }
    
    protected void assertTrue(boolean condition) {
        if (!condition) {
            throw new AssertionError("Expected true, but was false");
        }
    }
}
```

### 3. 数据库连接管理

```java
// 数据库操作模板
abstract class DatabaseTemplate {
    
    public final <T> T execute(String sql, Object... params) {
        Connection connection = null;
        PreparedStatement statement = null;
        
        try {
            // 1. 获取连接
            connection = getConnection();
            
            // 2. 准备语句
            statement = prepareStatement(connection, sql, params);
            
            // 3. 执行操作
            return executeOperation(statement);
            
        } catch (SQLException e) {
            // 4. 异常处理
            handleException(e);
            return null;
        } finally {
            // 5. 清理资源
            cleanup(statement, connection);
        }
    }
    
    protected abstract Connection getConnection() throws SQLException;
    protected abstract <T> T executeOperation(PreparedStatement statement) throws SQLException;
    
    protected PreparedStatement prepareStatement(Connection conn, String sql, Object... params) 
            throws SQLException {
        PreparedStatement stmt = conn.prepareStatement(sql);
        for (int i = 0; i < params.length; i++) {
            stmt.setObject(i + 1, params[i]);
        }
        return stmt;
    }
    
    protected void handleException(SQLException e) {
        System.err.println("数据库操作异常: " + e.getMessage());
    }
    
    protected void cleanup(PreparedStatement statement, Connection connection) {
        try {
            if (statement != null) statement.close();
            if (connection != null) connection.close();
        } catch (SQLException e) {
            System.err.println("资源清理异常: " + e.getMessage());
        }
    }
}
```

## 模式变种和扩展

### 1. 带参数的模板方法

```java
// 支持参数配置的模板方法
abstract class ConfigurableProcessor<T> {
    
    public final ProcessResult process(T input, ProcessConfig config) {
        ProcessContext context = createContext(input, config);
        
        try {
            // 1. 验证输入
            if (!validateInput(input, config)) {
                return ProcessResult.failure("输入验证失败");
            }
            
            // 2. 预处理
            T preprocessed = preProcess(input, context);
            
            // 3. 核心处理
            T processed = coreProcess(preprocessed, context);
            
            // 4. 后处理
            T postprocessed = postProcess(processed, context);
            
            return ProcessResult.success(postprocessed);
            
        } catch (Exception e) {
            return handleProcessException(e, context);
        }
    }
    
    protected abstract boolean validateInput(T input, ProcessConfig config);
    protected abstract T coreProcess(T input, ProcessContext context);
    
    protected ProcessContext createContext(T input, ProcessConfig config) {
        return new ProcessContext(config);
    }
    
    protected T preProcess(T input, ProcessContext context) {
        return input; // 默认不处理
    }
    
    protected T postProcess(T input, ProcessContext context) {
        return input; // 默认不处理
    }
    
    protected ProcessResult handleProcessException(Exception e, ProcessContext context) {
        return ProcessResult.failure("处理异常: " + e.getMessage());
    }
}

// 配置类
class ProcessConfig {
    private boolean enableLogging;
    private int timeout;
    private Map<String, Object> properties;
    
    // 构造函数和getter/setter
}

// 上下文类
class ProcessContext {
    private ProcessConfig config;
    private long startTime;
    private Map<String, Object> attributes;
    
    public ProcessContext(ProcessConfig config) {
        this.config = config;
        this.startTime = System.currentTimeMillis();
        this.attributes = new HashMap<>();
    }
    
    // getter/setter方法
}

// 结果类
class ProcessResult {
    private boolean success;
    private Object data;
    private String message;
    
    public static ProcessResult success(Object data) {
        return new ProcessResult(true, data, "成功");
    }
    
    public static ProcessResult failure(String message) {
        return new ProcessResult(false, null, message);
    }
    
    // 构造函数和getter方法
}
```

### 2. 异步模板方法

```java
// 异步处理模板
abstract class AsyncProcessor {
    private final ExecutorService executor;
    
    public AsyncProcessor() {
        this.executor = Executors.newFixedThreadPool(4);
    }
    
    public CompletableFuture<ProcessResult> processAsync(Object input) {
        return CompletableFuture
            .supplyAsync(() -> preProcess(input), executor)
            .thenCompose(this::coreProcessAsync)
            .thenApply(this::postProcess)
            .exceptionally(this::handleException);
    }
    
    protected abstract Object preProcess(Object input);
    protected abstract CompletableFuture<Object> coreProcessAsync(Object input);
    protected abstract ProcessResult postProcess(Object input);
    
    protected ProcessResult handleException(Throwable throwable) {
        return ProcessResult.failure("异步处理异常: " + throwable.getMessage());
    }
    
    public void shutdown() {
        executor.shutdown();
    }
}
```

### 3. 多阶段模板方法

```java
// 多阶段处理模板
abstract class MultiStageProcessor {
    
    public final ProcessResult process(Object input) {
        ProcessResult result = new ProcessResult();
        
        // 阶段1：准备阶段
        if (!executeStage("PREPARE", () -> prepareStage(input, result))) {
            return result;
        }
        
        // 阶段2：验证阶段
        if (!executeStage("VALIDATE", () -> validateStage(input, result))) {
            return result;
        }
        
        // 阶段3：处理阶段
        if (!executeStage("PROCESS", () -> processStage(input, result))) {
            return result;
        }
        
        // 阶段4：完成阶段
        executeStage("COMPLETE", () -> completeStage(input, result));
        
        return result;
    }
    
    private boolean executeStage(String stageName, Supplier<Boolean> stageLogic) {
        try {
            System.out.println("开始执行阶段: " + stageName);
            boolean success = stageLogic.get();
            System.out.println("阶段 " + stageName + (success ? " 成功" : " 失败"));
            return success;
        } catch (Exception e) {
            System.err.println("阶段 " + stageName + " 异常: " + e.getMessage());
            return false;
        }
    }
    
    protected abstract boolean prepareStage(Object input, ProcessResult result);
    protected abstract boolean validateStage(Object input, ProcessResult result);
    protected abstract boolean processStage(Object input, ProcessResult result);
    protected abstract boolean completeStage(Object input, ProcessResult result);
}
```

## 最佳实践

### 1. 模板方法设计原则

```java
// 良好的模板方法设计
abstract class WellDesignedTemplate {
    
    // 1. 模板方法应该是final的，防止子类重写
    public final Result executeTemplate(Input input) {
        // 2. 提供清晰的执行流程
        validateInput(input);
        
        Context context = initializeContext(input);
        
        try {
            Result result = performOperation(input, context);
            return finalizeResult(result, context);
        } catch (Exception e) {
            return handleError(e, context);
        } finally {
            cleanup(context);
        }
    }
    
    // 3. 抽象方法应该有清晰的职责
    protected abstract void validateInput(Input input);
    protected abstract Result performOperation(Input input, Context context);
    
    // 4. 钩子方法提供默认实现
    protected Context initializeContext(Input input) {
        return new Context();
    }
    
    protected Result finalizeResult(Result result, Context context) {
        return result;
    }
    
    protected Result handleError(Exception e, Context context) {
        return Result.error(e.getMessage());
    }
    
    protected void cleanup(Context context) {
        // 默认清理逻辑
    }
    
    // 5. 提供辅助方法
    protected void logStep(String step) {
        System.out.println("[" + getClass().getSimpleName() + "] " + step);
    }
}
```

### 2. 错误处理策略

```java
// 完善的错误处理
abstract class RobustTemplate {
    
    public final ProcessResult process(Object input) {
        ProcessResult result = new ProcessResult();
        
        try {
            // 执行各个步骤
            executeStep("validation", () -> validateInput(input), result);
            executeStep("preparation", () -> prepareData(input), result);
            executeStep("processing", () -> processData(input), result);
            executeStep("finalization", () -> finalizeData(input), result);
            
        } catch (CriticalException e) {
            // 关键异常，停止处理
            result.addError("关键错误: " + e.getMessage());
            result.setStatus(ProcessStatus.FAILED);
        } catch (RecoverableException e) {
            // 可恢复异常，尝试恢复
            if (attemptRecovery(e, result)) {
                result.setStatus(ProcessStatus.RECOVERED);
            } else {
                result.setStatus(ProcessStatus.FAILED);
            }
        }
        
        return result;
    }
    
    private void executeStep(String stepName, Runnable step, ProcessResult result) {
        try {
            step.run();
            result.addStep(stepName, true);
        } catch (Exception e) {
            result.addStep(stepName, false);
            result.addError(stepName + "失败: " + e.getMessage());
            
            // 根据异常类型决定是否继续
            if (e instanceof CriticalException) {
                throw e;
            } else if (e instanceof RecoverableException) {
                throw e;
            } else {
                // 一般异常，记录但继续执行
                logWarning("步骤 " + stepName + " 出现异常，但继续执行: " + e.getMessage());
            }
        }
    }
    
    protected abstract void validateInput(Object input);
    protected abstract void prepareData(Object input);
    protected abstract void processData(Object input);
    protected abstract void finalizeData(Object input);
    
    protected boolean attemptRecovery(RecoverableException e, ProcessResult result) {
        // 默认不尝试恢复
        return false;
    }
    
    protected void logWarning(String message) {
        System.out.println("WARNING: " + message);
    }
}

// 自定义异常类
class CriticalException extends RuntimeException {
    public CriticalException(String message) {
        super(message);
    }
}

class RecoverableException extends RuntimeException {
    public RecoverableException(String message) {
        super(message);
    }
}
```

### 3. 性能优化策略

```java
// 性能优化的模板方法
abstract class OptimizedTemplate {
    private final Map<String, Object> cache = new ConcurrentHashMap<>();
    private final AtomicLong executionCount = new AtomicLong(0);
    
    public final Result execute(Input input) {
        long startTime = System.nanoTime();
        String cacheKey = generateCacheKey(input);
        
        try {
            // 1. 检查缓存
            if (isCacheable(input)) {
                Result cached = getCachedResult(cacheKey);
                if (cached != null) {
                    return cached;
                }
            }
            
            // 2. 执行处理
            Result result = performExecution(input);
            
            // 3. 缓存结果
            if (isCacheable(input) && result.isSuccessful()) {
                cacheResult(cacheKey, result);
            }
            
            return result;
            
        } finally {
            // 4. 性能统计
            long duration = System.nanoTime() - startTime;
            recordPerformance(duration);
        }
    }
    
    protected abstract Result performExecution(Input input);
    protected abstract String generateCacheKey(Input input);
    
    protected boolean isCacheable(Input input) {
        return true; // 默认可缓存
    }
    
    @SuppressWarnings("unchecked")
    protected Result getCachedResult(String cacheKey) {
        return (Result) cache.get(cacheKey);
    }
    
    protected void cacheResult(String cacheKey, Result result) {
        // 简单的LRU策略
        if (cache.size() > 1000) {
            cache.clear(); // 简化的清理策略
        }
        cache.put(cacheKey, result);
    }
    
    protected void recordPerformance(long durationNanos) {
        long count = executionCount.incrementAndGet();
        if (count % 100 == 0) {
            System.out.println("执行次数: " + count + ", 最近执行时间: " + 
                             (durationNanos / 1_000_000) + "ms");
        }
    }
    
    // 性能统计方法
    public long getExecutionCount() {
        return executionCount.get();
    }
    
    public void clearCache() {
        cache.clear();
    }
}
```

### 4. 监控和调试支持

```java
// 支持监控和调试的模板方法
abstract class MonitorableTemplate {
    private final List<TemplateListener> listeners = new ArrayList<>();
    private final ThreadLocal<ExecutionContext> contextHolder = new ThreadLocal<>();
    
    public final Result execute(Input input) {
        ExecutionContext context = new ExecutionContext(input);
        contextHolder.set(context);
        
        try {
            notifyListeners(l -> l.onExecutionStart(context));
            
            Result result = doExecute(input, context);
            
            context.setResult(result);
            notifyListeners(l -> l.onExecutionComplete(context));
            
            return result;
            
        } catch (Exception e) {
            context.setException(e);
            notifyListeners(l -> l.onExecutionError(context));
            throw e;
        } finally {
            contextHolder.remove();
        }
    }
    
    protected abstract Result doExecute(Input input, ExecutionContext context);
    
    // 监听器管理
    public void addListener(TemplateListener listener) {
        listeners.add(listener);
    }
    
    public void removeListener(TemplateListener listener) {
        listeners.remove(listener);
    }
    
    private void notifyListeners(Consumer<TemplateListener> action) {
        for (TemplateListener listener : listeners) {
            try {
                action.accept(listener);
            } catch (Exception e) {
                System.err.println("监听器异常: " + e.getMessage());
            }
        }
    }
    
    // 调试支持
    protected void debugStep(String stepName) {
        ExecutionContext context = contextHolder.get();
        if (context != null && context.isDebugEnabled()) {
            System.out.println("[DEBUG] " + stepName + " at " + new Date());
            context.addDebugInfo(stepName, System.currentTimeMillis());
        }
    }
    
    protected ExecutionContext getCurrentContext() {
        return contextHolder.get();
    }
}

// 监听器接口
interface TemplateListener {
    default void onExecutionStart(ExecutionContext context) {}
    default void onExecutionComplete(ExecutionContext context) {}
    default void onExecutionError(ExecutionContext context) {}
}

// 执行上下文
class ExecutionContext {
    private final Input input;
    private final long startTime;
    private final Map<String, Object> attributes;
    private final Map<String, Long> debugInfo;
    private Result result;
    private Exception exception;
    private boolean debugEnabled;
    
    public ExecutionContext(Input input) {
        this.input = input;
        this.startTime = System.currentTimeMillis();
        this.attributes = new HashMap<>();
        this.debugInfo = new HashMap<>();
        this.debugEnabled = Boolean.getBoolean("template.debug");
    }
    
    // getter/setter方法
    public long getDuration() {
        return System.currentTimeMillis() - startTime;
    }
    
    public void addDebugInfo(String step, long timestamp) {
        debugInfo.put(step, timestamp);
    }
    
    // 其他方法...
}
```

## 总结

模板方法模式是一种非常实用的行为型设计模式，它通过在父类中定义算法骨架，让子类实现具体步骤，实现了代码复用和控制反转。这个模式在框架设计、流程控制、算法变种等场景中有着广泛的应用。

### 关键要点

1. **算法骨架固定**：模板方法定义了算法的基本结构和执行顺序
2. **步骤可定制**：子类可以重写抽象方法来实现不同的算法步骤
3. **控制反转**：父类控制算法流程，子类只负责实现具体逻辑
4. **钩子方法**：提供可选的扩展点，增加算法的灵活性
5. **代码复用**：公共逻辑在父类中实现，避免重复代码

### 适用建议

- **适合使用**：算法结构稳定但步骤实现多样的场景
- **谨慎使用**：需要频繁修改算法流程的场景
- **最佳实践**：合理设计抽象方法和钩子方法，提供完善的错误处理和监控机制

模板方法模式是面向对象设计中的经典模式，掌握它不仅能帮助我们更好地设计可扩展的系统，还能加深对继承、多态等面向对象概念的理解。在实际应用中，结合具体需求选择合适的变种和优化策略，能够构建出既灵活又高效的软件系统。