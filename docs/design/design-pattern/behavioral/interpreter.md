# 解释器模式 (Interpreter Pattern)

## 概述

解释器模式是一种行为型设计模式，它定义了一个语言的文法表示，并定义一个解释器来处理这个文法。解释器模式为语言中的每一个文法规则定义一个类，并且提供一个解释器来解释语言中的句子。

### 核心思想

- **文法表示**：为特定语言定义一个文法表示
- **解释执行**：提供解释器来解释和执行语言中的句子
- **递归结构**：通过递归的方式处理复杂的语法结构

## 使用场景

解释器模式适用于以下情况：

1. **简单语言处理**：当有一个简单的语言需要解释执行时
2. **文法相对稳定**：语言的文法相对简单且稳定，不会频繁变化
3. **效率要求不高**：对执行效率要求不是特别高的场景
4. **配置文件解析**：解析配置文件、规则引擎等场景
5. **数学表达式计算**：计算器、公式解析等应用

## UML 类图

```txt
┌─────────────────────┐
│    <<abstract>>     │
│   AbstractExpression│
├─────────────────────┤
│ + interpret(context)│
└──────────┬──────────┘
           │
           │ extends
           ▼
┌─────────────────────┐    ┌─────────────────────┐
│  TerminalExpression │    │NonTerminalExpression│
├─────────────────────┤    ├─────────────────────┤
│ + interpret(context)│    │ + interpret(context)│
└─────────────────────┘    └─────────────────────┘
                                      │
                                      │ contains
                                      ▼
                           ┌─────────────────────┐
                           │   AbstractExpression│
                           │      (children)     │
                           └─────────────────────┘

┌─────────────────────┐
│      Context        │
├─────────────────────┤
│ - variables         │
├─────────────────────┤
│ + getValue(var)     │
│ + setValue(var,val) │
└─────────────────────┘

┌─────────────────────┐
│      Client         │
├─────────────────────┤
│ + main()            │
└─────────────────────┘
```

## 核心组件

### 1. AbstractExpression（抽象表达式）
定义解释器的接口，约定解释器的解释操作。

### 2. TerminalExpression（终结符表达式）
实现与文法中的终结符相关联的解释操作。

### 3. NonTerminalExpression（非终结符表达式）
实现与文法中的非终结符相关的解释操作。

### 4. Context（上下文）
包含解释器之外的一些全局信息。

### 5. Client（客户端）
构建表示该文法定义的语言中一个特定的句子的抽象语法树。

## 实现示例

### 示例1：数学表达式解释器

```java
// 抽象表达式
public abstract class Expression {
    public abstract int interpret(Context context);
}

// 上下文类
public class Context {
    private Map<String, Integer> variables = new HashMap<>();
    
    public void setVariable(String name, int value) {
        variables.put(name, value);
    }
    
    public int getVariable(String name) {
        return variables.getOrDefault(name, 0);
    }
    
    public boolean hasVariable(String name) {
        return variables.containsKey(name);
    }
    
    public void clearVariables() {
        variables.clear();
    }
    
    public Set<String> getVariableNames() {
        return variables.keySet();
    }
}
```

## 优缺点分析

### 优点

1. **易于改变和扩展文法**
   - 由于在解释器模式中使用类来表示文法规则，因此可以使用继承来改变或扩展该文法
   - 添加新的解释规则比较容易

2. **易于实现文法**
   - 在抽象语法树中每一个表达式节点类的实现方式都是相似的
   - 这些类都易于直接编写

3. **增加新的解释表达式的方式比较容易**
   - 如果用户需要增加新的解释表达式只需要对应增加一个新的终结符表达式或非终结符表达式类
   - 原有表达式类代码无需修改，符合开闭原则

4. **支持复杂的文法**
   - 可以通过组合简单的表达式来构建复杂的语法结构
   - 递归的特性使得处理嵌套结构变得自然

### 缺点

1. **对于复杂的文法难以维护**
   - 解释器模式为文法中的每一个规则至少定义了一个类
   - 因此包含许多规则的文法可能难以管理和维护

2. **执行效率较低**
   - 解释器模式通常使用大量的循环和递归调用
   - 当要解释的句子比较复杂时，其运行速度很慢

3. **应用场景有限**
   - 解释器模式适用于文法相对简单的语言
   - 对于复杂的语言，类的层次结构会变得庞大而无法管理

## 与其他模式的对比

### 解释器模式 vs 策略模式

| 特性 | 解释器模式 | 策略模式 |
|------|------------|----------|
| **目的** | 解释和执行特定语言的句子 | 封装算法，使算法可以互换 |
| **结构** | 树形结构，支持递归 | 平行结构，策略独立 |
| **复杂度** | 适合复杂的语法结构 | 适合简单的算法选择 |
| **扩展性** | 通过添加新的表达式类扩展 | 通过添加新的策略类扩展 |

### 解释器模式 vs 命令模式

| 特性 | 解释器模式 | 命令模式 |
|------|------------|----------|
| **目的** | 解释语言文法 | 封装请求为对象 |
| **执行方式** | 递归解释执行 | 直接调用执行 |
| **撤销操作** | 不直接支持 | 支持撤销和重做 |
| **组合性** | 天然支持组合 | 可以组合但不是核心特性 |

### 解释器模式 vs 访问者模式

| 特性 | 解释器模式 | 访问者模式 |
|------|------------|------------|
| **目的** | 解释执行语法树 | 在对象结构上定义新操作 |
| **操作位置** | 操作分散在各个表达式类中 | 操作集中在访问者类中 |
| **添加新操作** | 需要修改所有表达式类 | 只需添加新的访问者 |
| **添加新节点** | 容易添加新的表达式类 | 需要修改所有访问者 |

## 实际应用场景

### 1. 配置文件解析器

```java
// 配置表达式抽象类
public abstract class ConfigExpression {
    public abstract Object evaluate(ConfigContext context);
}

// 配置上下文
public class ConfigContext {
    private Map<String, Object> properties = new HashMap<>();
    private Map<String, String> environment = System.getenv();
    
    public void setProperty(String key, Object value) {
        properties.put(key, value);
    }
    
    public Object getProperty(String key) {
        return properties.get(key);
    }
    
    public String getEnvironmentVariable(String name) {
        return environment.get(name);
    }
    
    public boolean hasProperty(String key) {
        return properties.containsKey(key);
    }
}

// 字符串字面量表达式
public class StringLiteralExpression extends ConfigExpression {
    private String value;
    
    public StringLiteralExpression(String value) {
        this.value = value;
    }
    
    @Override
    public Object evaluate(ConfigContext context) {
        return value;
    }
}

// 属性引用表达式
public class PropertyReferenceExpression extends ConfigExpression {
    private String propertyName;
    
    public PropertyReferenceExpression(String propertyName) {
        this.propertyName = propertyName;
    }
    
    @Override
    public Object evaluate(ConfigContext context) {
        if (context.hasProperty(propertyName)) {
            return context.getProperty(propertyName);
        }
        throw new IllegalArgumentException("未找到属性: " + propertyName);
    }
}

// 环境变量表达式
public class EnvironmentVariableExpression extends ConfigExpression {
    private String variableName;
    
    public EnvironmentVariableExpression(String variableName) {
        this.variableName = variableName;
    }
    
    @Override
    public Object evaluate(ConfigContext context) {
        String value = context.getEnvironmentVariable(variableName);
        if (value == null) {
            throw new IllegalArgumentException("未找到环境变量: " + variableName);
        }
        return value;
    }
}

// 字符串插值表达式
public class StringInterpolationExpression extends ConfigExpression {
    private List<ConfigExpression> parts;
    
    public StringInterpolationExpression(List<ConfigExpression> parts) {
        this.parts = parts;
    }
    
    @Override
    public Object evaluate(ConfigContext context) {
        StringBuilder result = new StringBuilder();
        for (ConfigExpression part : parts) {
            result.append(part.evaluate(context).toString());
        }
        return result.toString();
    }
}

// 配置解析器
public class ConfigParser {
    public static ConfigExpression parse(String configValue) {
        if (!configValue.contains("${")) {
            return new StringLiteralExpression(configValue);
        }
        
        List<ConfigExpression> parts = new ArrayList<>();
        int start = 0;
        int pos = 0;
        
        while (pos < configValue.length()) {
            int varStart = configValue.indexOf("${", pos);
            if (varStart == -1) {
                // 剩余部分是字面量
                if (start < configValue.length()) {
                    parts.add(new StringLiteralExpression(configValue.substring(start)));
                }
                break;
            }
            
            // 添加变量前的字面量部分
            if (varStart > start) {
                parts.add(new StringLiteralExpression(configValue.substring(start, varStart)));
            }
            
            // 查找变量结束位置
            int varEnd = configValue.indexOf("}", varStart);
            if (varEnd == -1) {
                throw new IllegalArgumentException("未闭合的变量引用: " + configValue);
            }
            
            // 解析变量
            String variable = configValue.substring(varStart + 2, varEnd);
            if (variable.startsWith("env.")) {
                parts.add(new EnvironmentVariableExpression(variable.substring(4)));
            } else {
                parts.add(new PropertyReferenceExpression(variable));
            }
            
            start = varEnd + 1;
            pos = start;
        }
        
        if (parts.size() == 1) {
            return parts.get(0);
        }
        
        return new StringInterpolationExpression(parts);
    }
}
```

### 2. 规则引擎

```java
// 规则表达式抽象类
public abstract class RuleExpression {
    public abstract boolean evaluate(RuleContext context);
}

// 规则上下文
public class RuleContext {
    private Map<String, Object> facts = new HashMap<>();
    
    public void setFact(String name, Object value) {
        facts.put(name, value);
    }
    
    public Object getFact(String name) {
        return facts.get(name);
    }
    
    public boolean hasFact(String name) {
        return facts.containsKey(name);
    }
    
    @SuppressWarnings("unchecked")
    public <T> T getFact(String name, Class<T> type) {
        Object value = facts.get(name);
        if (value != null && type.isInstance(value)) {
            return (T) value;
        }
        return null;
    }
}

// 条件表达式
public class ConditionExpression extends RuleExpression {
    private String factName;
    private String operator;
    private Object expectedValue;
    
    public ConditionExpression(String factName, String operator, Object expectedValue) {
        this.factName = factName;
        this.operator = operator;
        this.expectedValue = expectedValue;
    }
    
    @Override
    public boolean evaluate(RuleContext context) {
        if (!context.hasFact(factName)) {
            return false;
        }
        
        Object actualValue = context.getFact(factName);
        
        switch (operator) {
            case "==":
                return Objects.equals(actualValue, expectedValue);
            case "!=":
                return !Objects.equals(actualValue, expectedValue);
            case ">":
                return compareValues(actualValue, expectedValue) > 0;
            case "<":
                return compareValues(actualValue, expectedValue) < 0;
            case ">=":
                return compareValues(actualValue, expectedValue) >= 0;
            case "<=":
                return compareValues(actualValue, expectedValue) <= 0;
            case "contains":
                return actualValue.toString().contains(expectedValue.toString());
            default:
                throw new IllegalArgumentException("不支持的操作符: " + operator);
        }
    }
    
    @SuppressWarnings("unchecked")
    private int compareValues(Object v1, Object v2) {
        if (v1 instanceof Comparable && v2 instanceof Comparable) {
            return ((Comparable<Object>) v1).compareTo(v2);
        }
        throw new IllegalArgumentException("无法比较的值类型");
    }
    
    @Override
    public String toString() {
        return factName + " " + operator + " " + expectedValue;
    }
}

// AND表达式
public class AndExpression extends RuleExpression {
    private List<RuleExpression> expressions;
    
    public AndExpression(List<RuleExpression> expressions) {
        this.expressions = expressions;
    }
    
    public AndExpression(RuleExpression... expressions) {
        this.expressions = Arrays.asList(expressions);
    }
    
    @Override
    public boolean evaluate(RuleContext context) {
        for (RuleExpression expression : expressions) {
            if (!expression.evaluate(context)) {
                return false;
            }
        }
        return true;
    }
    
    @Override
    public String toString() {
        return "(" + expressions.stream()
                                .map(Object::toString)
                                .collect(Collectors.joining(" AND ")) + ")";
    }
}

// OR表达式
public class OrExpression extends RuleExpression {
    private List<RuleExpression> expressions;
    
    public OrExpression(List<RuleExpression> expressions) {
        this.expressions = expressions;
    }
    
    public OrExpression(RuleExpression... expressions) {
        this.expressions = Arrays.asList(expressions);
    }
    
    @Override
    public boolean evaluate(RuleContext context) {
        for (RuleExpression expression : expressions) {
            if (expression.evaluate(context)) {
                return true;
            }
        }
        return false;
    }
    
    @Override
    public String toString() {
        return "(" + expressions.stream()
                                .map(Object::toString)
                                .collect(Collectors.joining(" OR ")) + ")";
    }
}

// NOT表达式
public class NotExpression extends RuleExpression {
    private RuleExpression expression;
    
    public NotExpression(RuleExpression expression) {
        this.expression = expression;
    }
    
    @Override
    public boolean evaluate(RuleContext context) {
        return !expression.evaluate(context);
    }
    
    @Override
    public String toString() {
        return "NOT " + expression.toString();
    }
}

// 规则定义
public class Rule {
    private String name;
    private RuleExpression condition;
    private List<RuleAction> actions;
    
    public Rule(String name, RuleExpression condition, List<RuleAction> actions) {
        this.name = name;
        this.condition = condition;
        this.actions = actions;
    }
    
    public boolean matches(RuleContext context) {
        return condition.evaluate(context);
    }
    
    public void execute(RuleContext context) {
        if (matches(context)) {
            for (RuleAction action : actions) {
                action.execute(context);
            }
        }
    }
    
    public String getName() { return name; }
    public RuleExpression getCondition() { return condition; }
    
    @Override
    public String toString() {
        return "Rule[" + name + "]: IF " + condition + " THEN " + actions.size() + " actions";
    }
}

// 规则动作接口
public interface RuleAction {
    void execute(RuleContext context);
}

// 设置事实动作
public class SetFactAction implements RuleAction {
    private String factName;
    private Object value;
    
    public SetFactAction(String factName, Object value) {
        this.factName = factName;
        this.value = value;
    }
    
    @Override
    public void execute(RuleContext context) {
        context.setFact(factName, value);
        System.out.println("设置事实: " + factName + " = " + value);
    }
}

// 打印动作
public class PrintAction implements RuleAction {
    private String message;
    
    public PrintAction(String message) {
        this.message = message;
    }
    
    @Override
    public void execute(RuleContext context) {
        System.out.println("规则输出: " + message);
    }
}
```

### 3. 模板引擎

```java
// 模板表达式抽象类
public abstract class TemplateExpression {
    public abstract String render(TemplateContext context);
}

// 模板上下文
public class TemplateContext {
    private Map<String, Object> variables = new HashMap<>();
    
    public void setVariable(String name, Object value) {
        variables.put(name, value);
    }
    
    public Object getVariable(String name) {
        return variables.get(name);
    }
    
    public boolean hasVariable(String name) {
        return variables.containsKey(name);
    }
    
    public Set<String> getVariableNames() {
        return variables.keySet();
    }
}

// 文本表达式
public class TextExpression extends TemplateExpression {
    private String text;
    
    public TextExpression(String text) {
        this.text = text;
    }
    
    @Override
    public String render(TemplateContext context) {
        return text;
    }
}

// 变量表达式
public class VariableTemplateExpression extends TemplateExpression {
    private String variableName;
    
    public VariableTemplateExpression(String variableName) {
        this.variableName = variableName;
    }
    
    @Override
    public String render(TemplateContext context) {
        Object value = context.getVariable(variableName);
        return value != null ? value.toString() : "";
    }
}

// 条件表达式
public class IfExpression extends TemplateExpression {
    private String condition;
    private TemplateExpression thenExpression;
    private TemplateExpression elseExpression;
    
    public IfExpression(String condition, TemplateExpression thenExpression, TemplateExpression elseExpression) {
        this.condition = condition;
        this.thenExpression = thenExpression;
        this.elseExpression = elseExpression;
    }
    
    @Override
    public String render(TemplateContext context) {
        boolean conditionResult = evaluateCondition(context);
        if (conditionResult && thenExpression != null) {
            return thenExpression.render(context);
        } else if (!conditionResult && elseExpression != null) {
            return elseExpression.render(context);
        }
        return "";
    }
    
    private boolean evaluateCondition(TemplateContext context) {
        // 简化的条件评估
        Object value = context.getVariable(condition);
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        return value != null;
    }
}

// 循环表达式
public class ForEachExpression extends TemplateExpression {
    private String itemVariable;
    private String collectionVariable;
    private TemplateExpression bodyExpression;
    
    public ForEachExpression(String itemVariable, String collectionVariable, TemplateExpression bodyExpression) {
        this.itemVariable = itemVariable;
        this.collectionVariable = collectionVariable;
        this.bodyExpression = bodyExpression;
    }
    
    @Override
    public String render(TemplateContext context) {
        Object collection = context.getVariable(collectionVariable);
        if (!(collection instanceof Iterable)) {
            return "";
        }
        
        StringBuilder result = new StringBuilder();
        for (Object item : (Iterable<?>) collection) {
            // 创建新的上下文，包含当前项
            TemplateContext itemContext = new TemplateContext();
            // 复制原有变量
            for (String varName : context.getVariableNames()) {
                itemContext.setVariable(varName, context.getVariable(varName));
            }
            // 设置当前项变量
            itemContext.setVariable(itemVariable, item);
            
            result.append(bodyExpression.render(itemContext));
        }
        
        return result.toString();
    }
}

// 组合表达式
public class CompositeTemplateExpression extends TemplateExpression {
    private List<TemplateExpression> expressions;
    
    public CompositeTemplateExpression(List<TemplateExpression> expressions) {
        this.expressions = expressions;
    }
    
    @Override
    public String render(TemplateContext context) {
        StringBuilder result = new StringBuilder();
        for (TemplateExpression expression : expressions) {
            result.append(expression.render(context));
        }
        return result.toString();
    }
}
```

## 模式变种和扩展

### 1. 缓存解释器

```java
// 带缓存的表达式
public abstract class CachedExpression extends Expression {
    private Map<Context, Integer> cache = new HashMap<>();
    private boolean cacheEnabled = true;
    
    @Override
    public final int interpret(Context context) {
        if (!cacheEnabled) {
            return doInterpret(context);
        }
        
        return cache.computeIfAbsent(context, this::doInterpret);
    }
    
    protected abstract int doInterpret(Context context);
    
    public void setCacheEnabled(boolean enabled) {
        this.cacheEnabled = enabled;
    }
    
    public void clearCache() {
        cache.clear();
    }
    
    public int getCacheSize() {
        return cache.size();
    }
}

// 带缓存的加法表达式
public class CachedAddExpression extends CachedExpression {
    private Expression left;
    private Expression right;
    
    public CachedAddExpression(Expression left, Expression right) {
        this.left = left;
        this.right = right;
    }
    
    @Override
    protected int doInterpret(Context context) {
        return left.interpret(context) + right.interpret(context);
    }
}
```

### 2. 异步解释器

```java
// 异步表达式接口
public interface AsyncExpression {
    CompletableFuture<Object> interpretAsync(Context context);
}

// 异步表达式实现
public class AsyncMathExpression implements AsyncExpression {
    private Expression expression;
    private ExecutorService executor;
    
    public AsyncMathExpression(Expression expression, ExecutorService executor) {
        this.expression = expression;
        this.executor = executor;
    }
    
    @Override
    public CompletableFuture<Object> interpretAsync(Context context) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                // 模拟耗时计算
                Thread.sleep(100);
                return expression.interpret(context);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException(e);
            }
        }, executor);
    }
}

// 异步组合表达式
public class AsyncCompositeExpression implements AsyncExpression {
    private List<AsyncExpression> expressions;
    private ExecutorService executor;
    
    public AsyncCompositeExpression(List<AsyncExpression> expressions, ExecutorService executor) {
        this.expressions = expressions;
        this.executor = executor;
    }
    
    @Override
    public CompletableFuture<Object> interpretAsync(Context context) {
        List<CompletableFuture<Object>> futures = expressions.stream()
            .map(expr -> expr.interpretAsync(context))
            .collect(Collectors.toList());
        
        return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
            .thenApply(v -> futures.stream()
                .map(CompletableFuture::join)
                .collect(Collectors.toList()));
    }
}
```

### 3. 类型安全的解释器

```java
// 类型化表达式
public abstract class TypedExpression<T> {
    private final Class<T> type;
    
    protected TypedExpression(Class<T> type) {
        this.type = type;
    }
    
    public abstract T interpret(TypedContext context);
    
    public Class<T> getType() {
        return type;
    }
    
    public boolean isCompatibleWith(Class<?> otherType) {
        return type.isAssignableFrom(otherType) || otherType.isAssignableFrom(type);
    }
}

// 类型化上下文
public class TypedContext {
    private Map<String, TypedValue<?>> variables = new HashMap<>();
    
    public <T> void setVariable(String name, T value, Class<T> type) {
        variables.put(name, new TypedValue<>(value, type));
    }
    
    @SuppressWarnings("unchecked")
    public <T> T getVariable(String name, Class<T> expectedType) {
        TypedValue<?> typedValue = variables.get(name);
        if (typedValue == null) {
            throw new IllegalArgumentException("变量不存在: " + name);
        }
        
        if (!expectedType.isAssignableFrom(typedValue.getType())) {
            throw new ClassCastException("类型不匹配: 期望 " + expectedType + ", 实际 " + typedValue.getType());
        }
        
        return (T) typedValue.getValue();
    }
    
    private static class TypedValue<T> {
        private final T value;
        private final Class<T> type;
        
        public TypedValue(T value, Class<T> type) {
            this.value = value;
            this.type = type;
        }
        
        public T getValue() { return value; }
        public Class<T> getType() { return type; }
    }
}

// 类型化数字表达式
public class TypedNumberExpression extends TypedExpression<Integer> {
    private int value;
    
    public TypedNumberExpression(int value) {
        super(Integer.class);
        this.value = value;
    }
    
    @Override
    public Integer interpret(TypedContext context) {
        return value;
    }
}

// 类型化字符串表达式
public class TypedStringExpression extends TypedExpression<String> {
    private String value;
    
    public TypedStringExpression(String value) {
        super(String.class);
        this.value = value;
    }
    
    @Override
    public String interpret(TypedContext context) {
        return value;
    }
}
```

## 最佳实践

### 1. 表达式设计原则

```java
// 良好的表达式基类设计
public abstract class BaseExpression {
    // 核心解释方法
    public abstract Object interpret(Context context);
    
    // 表达式验证
    public boolean validate(Context context) {
        try {
            interpret(context);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
    
    // 表达式优化
    public BaseExpression optimize() {
        return this; // 默认不优化
    }
    
    // 表达式描述
    public abstract String getDescription();
    
    // 依赖分析
    public Set<String> getDependencies() {
        return Collections.emptySet();
    }
    
    // 复杂度评估
    public int getComplexity() {
        return 1; // 默认复杂度为1
    }
}

// 可优化的表达式
public class OptimizableExpression extends BaseExpression {
    private BaseExpression expression;
    private boolean optimized = false;
    
    public OptimizableExpression(BaseExpression expression) {
        this.expression = expression;
    }
    
    @Override
    public Object interpret(Context context) {
        if (!optimized) {
            expression = expression.optimize();
            optimized = true;
        }
        return expression.interpret(context);
    }
    
    @Override
    public String getDescription() {
        return "Optimizable[" + expression.getDescription() + "]";
    }
}
```

### 2. 错误处理策略

```java
// 解释器异常
public class InterpreterException extends RuntimeException {
    private final String expressionDescription;
    private final Context context;
    
    public InterpreterException(String message, String expressionDescription, Context context) {
        super(message);
        this.expressionDescription = expressionDescription;
        this.context = context;
    }
    
    public InterpreterException(String message, Throwable cause, String expressionDescription, Context context) {
        super(message, cause);
        this.expressionDescription = expressionDescription;
        this.context = context;
    }
    
    public String getExpressionDescription() { return expressionDescription; }
    public Context getContext() { return context; }
    
    @Override
    public String getMessage() {
        return super.getMessage() + " [表达式: " + expressionDescription + "]";
    }
}

// 安全的表达式包装器
public class SafeExpression extends BaseExpression {
    private BaseExpression expression;
    private Object defaultValue;
    private boolean suppressExceptions;
    
    public SafeExpression(BaseExpression expression, Object defaultValue, boolean suppressExceptions) {
        this.expression = expression;
        this.defaultValue = defaultValue;
        this.suppressExceptions = suppressExceptions;
    }
    
    @Override
    public Object interpret(Context context) {
        try {
            return expression.interpret(context);
        } catch (Exception e) {
            if (suppressExceptions) {
                return defaultValue;
            } else {
                throw new InterpreterException(
                    "表达式执行失败: " + e.getMessage(),
                    e,
                    expression.getDescription(),
                    context
                );
            }
        }
    }
    
    @Override
    public String getDescription() {
        return "Safe[" + expression.getDescription() + ", default=" + defaultValue + "]";
    }
}
```

### 3. 性能优化策略

```java
// 表达式性能监控器
public class ExpressionProfiler {
    private Map<String, PerformanceStats> stats = new ConcurrentHashMap<>();
    
    public <T> T profile(String expressionId, Supplier<T> execution) {
        long startTime = System.nanoTime();
        try {
            T result = execution.get();
            recordSuccess(expressionId, System.nanoTime() - startTime);
            return result;
        } catch (Exception e) {
            recordFailure(expressionId, System.nanoTime() - startTime);
            throw e;
        }
    }
    
    private void recordSuccess(String expressionId, long executionTime) {
        stats.computeIfAbsent(expressionId, k -> new PerformanceStats())
             .recordSuccess(executionTime);
    }
    
    private void recordFailure(String expressionId, long executionTime) {
        stats.computeIfAbsent(expressionId, k -> new PerformanceStats())
             .recordFailure(executionTime);
    }
    
    public PerformanceStats getStats(String expressionId) {
        return stats.get(expressionId);
    }
    
    public Map<String, PerformanceStats> getAllStats() {
        return new HashMap<>(stats);
    }
}

// 性能统计
public class PerformanceStats {
    private long totalExecutions;
    private long successfulExecutions;
    private long totalExecutionTime;
    private long minExecutionTime = Long.MAX_VALUE;
    private long maxExecutionTime = Long.MIN_VALUE;
    
    public synchronized void recordSuccess(long executionTime) {
        totalExecutions++;
        successfulExecutions++;
        updateExecutionTime(executionTime);
    }
    
    public synchronized void recordFailure(long executionTime) {
        totalExecutions++;
        updateExecutionTime(executionTime);
    }
    
    private void updateExecutionTime(long executionTime) {
        totalExecutionTime += executionTime;
        minExecutionTime = Math.min(minExecutionTime, executionTime);
        maxExecutionTime = Math.max(maxExecutionTime, executionTime);
    }
    
    public double getSuccessRate() {
        return totalExecutions == 0 ? 0.0 : (double) successfulExecutions / totalExecutions;
    }
    
    public double getAverageExecutionTime() {
        return totalExecutions == 0 ? 0.0 : (double) totalExecutionTime / totalExecutions;
    }
    
    // 其他getter方法...
}

// 带性能监控的表达式
public class ProfiledExpression extends BaseExpression {
    private BaseExpression expression;
    private ExpressionProfiler profiler;
    private String expressionId;
    
    public ProfiledExpression(BaseExpression expression, ExpressionProfiler profiler, String expressionId) {
        this.expression = expression;
        this.profiler = profiler;
        this.expressionId = expressionId;
    }
    
    @Override
    public Object interpret(Context context) {
        return profiler.profile(expressionId, () -> expression.interpret(context));
    }
    
    @Override
    public String getDescription() {
        return "Profiled[" + expressionId + ": " + expression.getDescription() + "]";
    }
}
```

### 4. 调试和监控支持

```java
// 表达式调试器
public class ExpressionDebugger {
    private boolean debugEnabled = false;
    private List<DebugListener> listeners = new ArrayList<>();
    
    public void setDebugEnabled(boolean enabled) {
        this.debugEnabled = enabled;
    }
    
    public void addListener(DebugListener listener) {
        listeners.add(listener);
    }
    
    public void removeListener(DebugListener listener) {
        listeners.remove(listener);
    }
    
    public Object debugInterpret(BaseExpression expression, Context context) {
        if (!debugEnabled) {
            return expression.interpret(context);
        }
        
        notifyBeforeInterpret(expression, context);
        
        try {
            Object result = expression.interpret(context);
            notifyAfterInterpret(expression, context, result);
            return result;
        } catch (Exception e) {
            notifyOnError(expression, context, e);
            throw e;
        }
    }
    
    private void notifyBeforeInterpret(BaseExpression expression, Context context) {
        for (DebugListener listener : listeners) {
            listener.beforeInterpret(expression, context);
        }
    }
    
    private void notifyAfterInterpret(BaseExpression expression, Context context, Object result) {
        for (DebugListener listener : listeners) {
            listener.afterInterpret(expression, context, result);
        }
    }
    
    private void notifyOnError(BaseExpression expression, Context context, Exception error) {
        for (DebugListener listener : listeners) {
            listener.onError(expression, context, error);
        }
    }
}

// 调试监听器接口
public interface DebugListener {
    void beforeInterpret(BaseExpression expression, Context context);
    void afterInterpret(BaseExpression expression, Context context, Object result);
    void onError(BaseExpression expression, Context context, Exception error);
}

// 控制台调试监听器
public class ConsoleDebugListener implements DebugListener {
    private int indentLevel = 0;
    
    @Override
    public void beforeInterpret(BaseExpression expression, Context context) {
        printIndent();
        System.out.println("-> 开始解释: " + expression.getDescription());
        indentLevel++;
    }
    
    @Override
    public void afterInterpret(BaseExpression expression, Context context, Object result) {
        indentLevel--;
        printIndent();
        System.out.println("<- 解释完成: " + expression.getDescription() + " = " + result);
    }
    
    @Override
    public void onError(BaseExpression expression, Context context, Exception error) {
        indentLevel--;
        printIndent();
        System.err.println("<- 解释错误: " + expression.getDescription() + " - " + error.getMessage());
    }
    
    private void printIndent() {
        for (int i = 0; i < indentLevel; i++) {
            System.out.print("  ");
        }
    }
}

// 可调试的表达式
public class DebuggableExpression extends BaseExpression {
    private BaseExpression expression;
    private ExpressionDebugger debugger;
    
    public DebuggableExpression(BaseExpression expression, ExpressionDebugger debugger) {
        this.expression = expression;
        this.debugger = debugger;
    }
    
    @Override
    public Object interpret(Context context) {
        return debugger.debugInterpret(expression, context);
    }
    
    @Override
    public String getDescription() {
        return "Debuggable[" + expression.getDescription() + "]";
    }
}
```

## 总结

解释器模式是一种强大的设计模式，它为特定领域的语言提供了一种优雅的解决方案。通过将语言的文法规则映射到类层次结构，解释器模式使得语言的解释和执行变得清晰和可维护。

### 核心价值

1. **语言抽象**：为特定领域问题提供了专门的语言表达方式
2. **结构清晰**：文法规则与代码结构一一对应，易于理解和维护
3. **扩展性好**：添加新的语言构造只需要添加新的表达式类
4. **组合性强**：支持复杂的嵌套和组合结构

### 使用建议

1. **适用场景选择**：解释器模式最适合文法相对简单且稳定的语言
2. **性能考虑**：对于性能要求高的场景，考虑使用编译器或其他优化技术
3. **错误处理**：提供完善的错误处理和调试支持
4. **类型安全**：在可能的情况下，使用类型安全的设计
5. **缓存优化**：对于重复执行的表达式，考虑使用缓存机制

解释器模式在配置文件解析、规则引擎、模板引擎、DSL实现等领域有着广泛的应用。虽然它可能不是最高效的解决方案，但它提供了一种清晰、可维护的方式来处理特定领域的语言需求。

// 终结符表达式：数字
public class NumberExpression extends Expression {
    private int number;
    
    public NumberExpression(int number) {
        this.number = number;
    }
    
    @Override
    public int interpret(Context context) {
        return number;
    }
    
    @Override
    public String toString() {
        return String.valueOf(number);
    }
}

// 终结符表达式：变量
public class VariableExpression extends Expression {
    private String name;
    
    public VariableExpression(String name) {
        this.name = name;
    }
    
    @Override
    public int interpret(Context context) {
        if (!context.hasVariable(name)) {
            throw new IllegalArgumentException("未定义的变量: " + name);
        }
        return context.getVariable(name);
    }
    
    @Override
    public String toString() {
        return name;
    }
}

// 非终结符表达式：加法
public class AddExpression extends Expression {
    private Expression left;
    private Expression right;
    
    public AddExpression(Expression left, Expression right) {
        this.left = left;
        this.right = right;
    }
    
    @Override
    public int interpret(Context context) {
        return left.interpret(context) + right.interpret(context);
    }
    
    @Override
    public String toString() {
        return "(" + left + " + " + right + ")";
    }
}

// 非终结符表达式：减法
public class SubtractExpression extends Expression {
    private Expression left;
    private Expression right;
    
    public SubtractExpression(Expression left, Expression right) {
        this.left = left;
        this.right = right;
    }
    
    @Override
    public int interpret(Context context) {
        return left.interpret(context) - right.interpret(context);
    }
    
    @Override
    public String toString() {
        return "(" + left + " - " + right + ")";
    }
}

// 非终结符表达式：乘法
public class MultiplyExpression extends Expression {
    private Expression left;
    private Expression right;
    
    public MultiplyExpression(Expression left, Expression right) {
        this.left = left;
        this.right = right;
    }
    
    @Override
    public int interpret(Context context) {
        return left.interpret(context) * right.interpret(context);
    }
    
    @Override
    public String toString() {
        return "(" + left + " * " + right + ")";
    }
}

// 非终结符表达式：除法
public class DivideExpression extends Expression {
    private Expression left;
    private Expression right;
    
    public DivideExpression(Expression left, Expression right) {
        this.left = left;
        this.right = right;
    }
    
    @Override
    public int interpret(Context context) {
        int rightValue = right.interpret(context);
        if (rightValue == 0) {
            throw new ArithmeticException("除数不能为零");
        }
        return left.interpret(context) / rightValue;
    }
    
    @Override
    public String toString() {
        return "(" + left + " / " + right + ")";
    }
}

// 表达式解析器
public class ExpressionParser {
    private String expression;
    private int position;
    
    public ExpressionParser(String expression) {
        this.expression = expression.replaceAll("\\s+", ""); // 移除空格
        this.position = 0;
    }
    
    public Expression parse() {
        Expression result = parseExpression();
        if (position < expression.length()) {
            throw new IllegalArgumentException("表达式解析错误，位置: " + position);
        }
        return result;
    }
    
    private Expression parseExpression() {
        Expression left = parseTerm();
        
        while (position < expression.length()) {
            char operator = expression.charAt(position);
            if (operator == '+' || operator == '-') {
                position++;
                Expression right = parseTerm();
                if (operator == '+') {
                    left = new AddExpression(left, right);
                } else {
                    left = new SubtractExpression(left, right);
                }
            } else {
                break;
            }
        }
        
        return left;
    }
    
    private Expression parseTerm() {
        Expression left = parseFactor();
        
        while (position < expression.length()) {
            char operator = expression.charAt(position);
            if (operator == '*' || operator == '/') {
                position++;
                Expression right = parseFactor();
                if (operator == '*') {
                    left = new MultiplyExpression(left, right);
                } else {
                    left = new DivideExpression(left, right);
                }
            } else {
                break;
            }
        }
        
        return left;
    }
    
    private Expression parseFactor() {
        if (position >= expression.length()) {
            throw new IllegalArgumentException("表达式不完整");
        }
        
        char ch = expression.charAt(position);
        
        // 处理括号
        if (ch == '(') {
            position++;
            Expression result = parseExpression();
            if (position >= expression.length() || expression.charAt(position) != ')') {
                throw new IllegalArgumentException("缺少右括号");
            }
            position++;
            return result;
        }
        
        // 处理数字
        if (Character.isDigit(ch)) {
            return parseNumber();
        }
        
        // 处理变量
        if (Character.isLetter(ch)) {
            return parseVariable();
        }
        
        throw new IllegalArgumentException("无效字符: " + ch);
    }
    
    private Expression parseNumber() {
        int start = position;
        while (position < expression.length() && Character.isDigit(expression.charAt(position))) {
            position++;
        }
        int number = Integer.parseInt(expression.substring(start, position));
        return new NumberExpression(number);
    }
    
    private Expression parseVariable() {
        int start = position;
        while (position < expression.length() && Character.isLetterOrDigit(expression.charAt(position))) {
            position++;
        }
        String variable = expression.substring(start, position);
        return new VariableExpression(variable);
    }
}

// 使用示例
public class MathInterpreterExample {
    public static void main(String[] args) {
        // 创建上下文
        Context context = new Context();
        context.setVariable("x", 10);
        context.setVariable("y", 5);
        context.setVariable("z", 2);
        
        // 测试各种表达式
        String[] expressions = {
            "x + y",
            "x - y",
            "x * y",
            "x / y",
            "x + y * z",
            "(x + y) * z",
            "x * y + z",
            "x / y - z",
            "(x + y) / (z + 1)"
        };
        
        for (String expr : expressions) {
            try {
                ExpressionParser parser = new ExpressionParser(expr);
                Expression expression = parser.parse();
                int result = expression.interpret(context);
                
                System.out.println("表达式: " + expr);
                System.out.println("解析后: " + expression);
                System.out.println("结果: " + result);
                System.out.println("---");
            } catch (Exception e) {
                System.err.println("解析表达式 '" + expr + "' 时出错: " + e.getMessage());
            }
        }
    }
}
```

### 示例2：简单SQL解释器

```java
// SQL表达式抽象类
public abstract class SqlExpression {
    public abstract Object execute(DatabaseContext context);
}

// 数据库上下文
public class DatabaseContext {
    private Map<String, List<Map<String, Object>>> tables = new HashMap<>();
    
    public void createTable(String tableName, List<Map<String, Object>> data) {
        tables.put(tableName, new ArrayList<>(data));
    }
    
    public List<Map<String, Object>> getTable(String tableName) {
        return tables.get(tableName);
    }
    
    public boolean hasTable(String tableName) {
        return tables.containsKey(tableName);
    }
    
    public Set<String> getTableNames() {
        return tables.keySet();
    }
}

// SELECT表达式
public class SelectExpression extends SqlExpression {
    private List<String> columns;
    private String tableName;
    private WhereExpression whereClause;
    
    public SelectExpression(List<String> columns, String tableName) {
        this.columns = columns;
        this.tableName = tableName;
    }
    
    public SelectExpression(List<String> columns, String tableName, WhereExpression whereClause) {
        this.columns = columns;
        this.tableName = tableName;
        this.whereClause = whereClause;
    }
    
    @Override
    public Object execute(DatabaseContext context) {
        if (!context.hasTable(tableName)) {
            throw new IllegalArgumentException("表不存在: " + tableName);
        }
        
        List<Map<String, Object>> table = context.getTable(tableName);
        List<Map<String, Object>> result = new ArrayList<>();
        
        for (Map<String, Object> row : table) {
            // 应用WHERE条件
            if (whereClause == null || whereClause.evaluate(row)) {
                Map<String, Object> selectedRow = new HashMap<>();
                
                // 选择指定列
                if (columns.contains("*")) {
                    selectedRow.putAll(row);
                } else {
                    for (String column : columns) {
                        if (row.containsKey(column)) {
                            selectedRow.put(column, row.get(column));
                        }
                    }
                }
                
                result.add(selectedRow);
            }
        }
        
        return result;
    }
    
    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append("SELECT ").append(String.join(", ", columns));
        sb.append(" FROM ").append(tableName);
        if (whereClause != null) {
            sb.append(" WHERE ").append(whereClause);
        }
        return sb.toString();
    }
}

// WHERE表达式
public class WhereExpression {
    private String column;
    private String operator;
    private Object value;
    
    public WhereExpression(String column, String operator, Object value) {
        this.column = column;
        this.operator = operator;
        this.value = value;
    }
    
    public boolean evaluate(Map<String, Object> row) {
        if (!row.containsKey(column)) {
            return false;
        }
        
        Object columnValue = row.get(column);
        
        switch (operator) {
            case "=":
                return Objects.equals(columnValue, value);
            case "!=":
                return !Objects.equals(columnValue, value);
            case ">":
                return compareValues(columnValue, value) > 0;
            case "<":
                return compareValues(columnValue, value) < 0;
            case ">=":
                return compareValues(columnValue, value) >= 0;
            case "<=":
                return compareValues(columnValue, value) <= 0;
            case "LIKE":
                return columnValue.toString().contains(value.toString());
            default:
                throw new IllegalArgumentException("不支持的操作符: " + operator);
        }
    }
    
    @SuppressWarnings("unchecked")
    private int compareValues(Object v1, Object v2) {
        if (v1 instanceof Comparable && v2 instanceof Comparable) {
            return ((Comparable<Object>) v1).compareTo(v2);
        }
        throw new IllegalArgumentException("无法比较的值类型");
    }
    
    @Override
    public String toString() {
        return column + " " + operator + " " + value;
    }
}

// INSERT表达式
public class InsertExpression extends SqlExpression {
    private String tableName;
    private Map<String, Object> values;
    
    public InsertExpression(String tableName, Map<String, Object> values) {
        this.tableName = tableName;
        this.values = values;
    }
    
    @Override
    public Object execute(DatabaseContext context) {
        if (!context.hasTable(tableName)) {
            throw new IllegalArgumentException("表不存在: " + tableName);
        }
        
        List<Map<String, Object>> table = context.getTable(tableName);
        table.add(new HashMap<>(values));
        
        return "插入成功，影响行数: 1";
    }
    
    @Override
    public String toString() {
        return "INSERT INTO " + tableName + " VALUES " + values;
    }
}

// 简单SQL解析器
public class SimpleSqlParser {
    public static SqlExpression parse(String sql) {
        sql = sql.trim().toUpperCase();
        
        if (sql.startsWith("SELECT")) {
            return parseSelect(sql);
        } else if (sql.startsWith("INSERT")) {
            return parseInsert(sql);
        } else {
            throw new IllegalArgumentException("不支持的SQL语句: " + sql);
        }
    }
    
    private static SelectExpression parseSelect(String sql) {
        // 简化的SELECT解析
        // SELECT columns FROM table [WHERE condition]
        String[] parts = sql.split("\\s+");
        
        if (parts.length < 4 || !"FROM".equals(parts[2])) {
            throw new IllegalArgumentException("无效的SELECT语句");
        }
        
        // 解析列
        String columnsStr = parts[1];
        List<String> columns = Arrays.asList(columnsStr.split(","));
        
        // 解析表名
        String tableName = parts[3];
        
        // 解析WHERE子句（简化版）
        WhereExpression whereClause = null;
        if (parts.length > 4 && "WHERE".equals(parts[4])) {
            if (parts.length >= 7) {
                String column = parts[5];
                String operator = parts[6];
                String value = parts[7].replace("'", "");
                
                // 尝试转换为数字
                Object parsedValue;
                try {
                    parsedValue = Integer.parseInt(value);
                } catch (NumberFormatException e) {
                    parsedValue = value;
                }
                
                whereClause = new WhereExpression(column, operator, parsedValue);
            }
        }
        
        return new SelectExpression(columns, tableName, whereClause);
    }
    
    private static InsertExpression parseInsert(String sql) {
        // 简化的INSERT解析
        // INSERT INTO table VALUES (value1, value2, ...)
        throw new UnsupportedOperationException("INSERT解析暂未实现");
    }
}

// 使用示例
public class SqlInterpreterExample {
    public static void main(String[] args) {
        // 创建数据库上下文
        DatabaseContext context = new DatabaseContext();
        
        // 创建测试数据
        List<Map<String, Object>> users = Arrays.asList(
            createRow("id", 1, "name", "张三", "age", 25, "city", "北京"),
            createRow("id", 2, "name", "李四", "age", 30, "city", "上海"),
            createRow("id", 3, "name", "王五", "age", 28, "city", "北京"),
            createRow("id", 4, "name", "赵六", "age", 35, "city", "广州")
        );
        
        context.createTable("USERS", users);
        
        // 测试SQL语句
        String[] sqlStatements = {
            "SELECT * FROM USERS",
            "SELECT NAME,AGE FROM USERS",
            "SELECT * FROM USERS WHERE AGE > 28",
            "SELECT NAME FROM USERS WHERE CITY = 北京"
        };
        
        for (String sql : sqlStatements) {
            try {
                System.out.println("执行SQL: " + sql);
                SqlExpression expression = SimpleSqlParser.parse(sql);
                Object result = expression.execute(context);
                
                if (result instanceof List) {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> rows = (List<Map<String, Object>>) result;
                    System.out.println("结果 (" + rows.size() + " 行):");
                    for (Map<String, Object> row : rows) {
                        System.out.println("  " + row);
                    }
                } else {
                    System.out.println("结果: " + result);
                }
                
                System.out.println("---");
            } catch (Exception e) {
                System.err.println("执行SQL '" + sql + "' 时出错: " + e.getMessage());
            }
        }
    }
    
    private static Map<String, Object> createRow(Object... keyValues) {
        Map<String, Object> row = new HashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            row.put((String) keyValues[i], keyValues[i + 1]);
        }
        return row;
    }
}