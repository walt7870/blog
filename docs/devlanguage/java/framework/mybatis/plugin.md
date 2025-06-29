# MyBatis 插件机制详解

## 概述

MyBatis 插件（Plugin）是一个强大的扩展机制，允许开发者在 SQL 执行的关键节点进行拦截和自定义处理。通过插件机制，我们可以实现诸如分页、数据库方言适配、SQL 性能监控、数据加密等功能。

## 插件原理

MyBatis 插件基于 JDK 动态代理和责任链模式实现，可以拦截以下四个核心对象的方法调用：

1. **Executor** - 执行器，负责 SQL 的执行和缓存维护
2. **StatementHandler** - 语句处理器，负责 SQL 语句的预编译和参数设置
3. **ParameterHandler** - 参数处理器，负责参数的设置
4. **ResultSetHandler** - 结果集处理器，负责结果集的映射

## 插件接口

所有插件都必须实现 `Interceptor` 接口：

```java
public interface Interceptor {
    // 拦截方法，包含核心逻辑
    Object intercept(Invocation invocation) throws Throwable;
    
    // 生成代理对象
    default Object plugin(Object target) {
        return Plugin.wrap(target, this);
    }
    
    // 设置插件属性
    default void setProperties(Properties properties) {
        // 默认空实现
    }
}
```

## 数据库方言适配插件示例

以下是一个完整的数据库方言适配插件示例，支持 MySQL、PostgreSQL、Oracle 等不同数据库的分页语法：

### 1. 数据库方言枚举

```java
public enum DatabaseDialect {
    MYSQL("mysql") {
        @Override
        public String buildPaginationSql(String originalSql, int offset, int limit) {
            return originalSql + " LIMIT " + offset + ", " + limit;
        }
    },
    
    POSTGRESQL("postgresql") {
        @Override
        public String buildPaginationSql(String originalSql, int offset, int limit) {
            return originalSql + " LIMIT " + limit + " OFFSET " + offset;
        }
    },
    
    ORACLE("oracle") {
        @Override
        public String buildPaginationSql(String originalSql, int offset, int limit) {
            return "SELECT * FROM (" +
                   "SELECT ROWNUM rn, t.* FROM (" + originalSql + ") t " +
                   "WHERE ROWNUM <= " + (offset + limit) + ") " +
                   "WHERE rn > " + offset;
        }
    },
    
    SQLSERVER("sqlserver") {
        @Override
        public String buildPaginationSql(String originalSql, int offset, int limit) {
            return originalSql + " OFFSET " + offset + " ROWS FETCH NEXT " + limit + " ROWS ONLY";
        }
    };
    
    private final String dialectName;
    
    DatabaseDialect(String dialectName) {
        this.dialectName = dialectName;
    }
    
    public abstract String buildPaginationSql(String originalSql, int offset, int limit);
    
    public static DatabaseDialect fromUrl(String url) {
        if (url.contains("mysql")) {
            return MYSQL;
        } else if (url.contains("postgresql")) {
            return POSTGRESQL;
        } else if (url.contains("oracle")) {
            return ORACLE;
        } else if (url.contains("sqlserver")) {
            return SQLSERVER;
        }
        throw new IllegalArgumentException("Unsupported database: " + url);
    }
}
```

### 2. 分页参数对象

```java
public class PageInfo {
    private int pageNum = 1;
    private int pageSize = 10;
    private boolean enablePagination = false;
    
    public PageInfo() {}
    
    public PageInfo(int pageNum, int pageSize) {
        this.pageNum = pageNum;
        this.pageSize = pageSize;
        this.enablePagination = true;
    }
    
    public int getOffset() {
        return (pageNum - 1) * pageSize;
    }
    
    // getter and setter methods
    public int getPageNum() { return pageNum; }
    public void setPageNum(int pageNum) { this.pageNum = pageNum; }
    
    public int getPageSize() { return pageSize; }
    public void setPageSize(int pageSize) { this.pageSize = pageSize; }
    
    public boolean isEnablePagination() { return enablePagination; }
    public void setEnablePagination(boolean enablePagination) { this.enablePagination = enablePagination; }
}
```

### 3. 线程本地存储工具

```java
public class PageHelper {
    private static final ThreadLocal<PageInfo> PAGE_INFO = new ThreadLocal<>();
    
    public static void startPage(int pageNum, int pageSize) {
        PAGE_INFO.set(new PageInfo(pageNum, pageSize));
    }
    
    public static PageInfo getPageInfo() {
        return PAGE_INFO.get();
    }
    
    public static void clearPage() {
        PAGE_INFO.remove();
    }
}
```

### 4. 数据库方言适配插件

```java
@Intercepts({
    @Signature(type = StatementHandler.class, method = "prepare", args = {Connection.class, Integer.class})
})
public class DatabaseDialectPlugin implements Interceptor {
    
    private DatabaseDialect dialect;
    private String dialectProperty;
    
    @Override
    public Object intercept(Invocation invocation) throws Throwable {
        StatementHandler statementHandler = (StatementHandler) invocation.getTarget();
        
        // 获取分页信息
        PageInfo pageInfo = PageHelper.getPageInfo();
        if (pageInfo == null || !pageInfo.isEnablePagination()) {
            return invocation.proceed();
        }
        
        try {
            // 获取 BoundSql
            BoundSql boundSql = statementHandler.getBoundSql();
            String originalSql = boundSql.getSql();
            
            // 检测数据库类型
            if (dialect == null) {
                Connection connection = (Connection) invocation.getArgs()[0];
                detectDatabaseDialect(connection);
            }
            
            // 构建分页 SQL
            String paginationSql = dialect.buildPaginationSql(
                originalSql, 
                pageInfo.getOffset(), 
                pageInfo.getPageSize()
            );
            
            // 通过反射修改 SQL
            Field sqlField = BoundSql.class.getDeclaredField("sql");
            sqlField.setAccessible(true);
            sqlField.set(boundSql, paginationSql);
            
            return invocation.proceed();
        } finally {
            // 清理线程本地变量
            PageHelper.clearPage();
        }
    }
    
    private void detectDatabaseDialect(Connection connection) throws SQLException {
        if (dialectProperty != null && !dialectProperty.trim().isEmpty()) {
            // 使用配置的方言
            dialect = DatabaseDialect.valueOf(dialectProperty.toUpperCase());
        } else {
            // 自动检测数据库类型
            String url = connection.getMetaData().getURL();
            dialect = DatabaseDialect.fromUrl(url);
        }
    }
    
    @Override
    public Object plugin(Object target) {
        if (target instanceof StatementHandler) {
            return Plugin.wrap(target, this);
        }
        return target;
    }
    
    @Override
    public void setProperties(Properties properties) {
        this.dialectProperty = properties.getProperty("dialect");
    }
}
```

### 5. SQL 性能监控插件

```java
@Intercepts({
    @Signature(type = Executor.class, method = "query", 
               args = {MappedStatement.class, Object.class, RowBounds.class, ResultHandler.class}),
    @Signature(type = Executor.class, method = "update", 
               args = {MappedStatement.class, Object.class})
})
public class SqlPerformancePlugin implements Interceptor {
    
    private long slowSqlThreshold = 1000; // 慢SQL阈值，单位毫秒
    
    @Override
    public Object intercept(Invocation invocation) throws Throwable {
        long startTime = System.currentTimeMillis();
        
        try {
            Object result = invocation.proceed();
            
            long endTime = System.currentTimeMillis();
            long executionTime = endTime - startTime;
            
            // 记录SQL执行信息
            logSqlExecution(invocation, executionTime);
            
            return result;
        } catch (Exception e) {
            long endTime = System.currentTimeMillis();
            long executionTime = endTime - startTime;
            
            // 记录异常SQL
            logSqlError(invocation, executionTime, e);
            throw e;
        }
    }
    
    private void logSqlExecution(Invocation invocation, long executionTime) {
        MappedStatement mappedStatement = (MappedStatement) invocation.getArgs()[0];
        String sqlId = mappedStatement.getId();
        
        if (executionTime > slowSqlThreshold) {
            System.err.println(String.format(
                "[SLOW SQL] ID: %s, Execution Time: %d ms", 
                sqlId, executionTime
            ));
        } else {
            System.out.println(String.format(
                "[SQL] ID: %s, Execution Time: %d ms", 
                sqlId, executionTime
            ));
        }
    }
    
    private void logSqlError(Invocation invocation, long executionTime, Exception e) {
        MappedStatement mappedStatement = (MappedStatement) invocation.getArgs()[0];
        String sqlId = mappedStatement.getId();
        
        System.err.println(String.format(
            "[SQL ERROR] ID: %s, Execution Time: %d ms, Error: %s", 
            sqlId, executionTime, e.getMessage()
        ));
    }
    
    @Override
    public void setProperties(Properties properties) {
        String threshold = properties.getProperty("slowSqlThreshold");
        if (threshold != null) {
            this.slowSqlThreshold = Long.parseLong(threshold);
        }
    }
}
```

## 插件配置

### 1. XML 配置方式

```xml
<!-- mybatis-config.xml -->
<configuration>
    <plugins>
        <!-- 数据库方言适配插件 -->
        <plugin interceptor="com.example.plugin.DatabaseDialectPlugin">
            <property name="dialect" value="mysql"/>
        </plugin>
        
        <!-- SQL性能监控插件 -->
        <plugin interceptor="com.example.plugin.SqlPerformancePlugin">
            <property name="slowSqlThreshold" value="2000"/>
        </plugin>
    </plugins>
</configuration>
```

### 2. Spring Boot 配置方式

```java
@Configuration
public class MyBatisConfig {
    
    @Bean
    public ConfigurationCustomizer configurationCustomizer() {
        return configuration -> {
            // 添加数据库方言插件
            DatabaseDialectPlugin dialectPlugin = new DatabaseDialectPlugin();
            Properties dialectProps = new Properties();
            dialectProps.setProperty("dialect", "mysql");
            dialectPlugin.setProperties(dialectProps);
            configuration.addInterceptor(dialectPlugin);
            
            // 添加性能监控插件
            SqlPerformancePlugin performancePlugin = new SqlPerformancePlugin();
            Properties perfProps = new Properties();
            perfProps.setProperty("slowSqlThreshold", "1500");
            performancePlugin.setProperties(perfProps);
            configuration.addInterceptor(performancePlugin);
        };
    }
}
```

## 使用示例

### 1. 分页查询示例

```java
@Service
public class UserService {
    
    @Autowired
    private UserMapper userMapper;
    
    public List<User> getUsersByPage(int pageNum, int pageSize) {
        // 设置分页参数
        PageHelper.startPage(pageNum, pageSize);
        
        // 执行查询，插件会自动添加分页SQL
        return userMapper.selectAllUsers();
    }
    
    public List<User> getUsersByName(String name) {
        // 不设置分页参数，正常查询
        return userMapper.selectUsersByName(name);
    }
}
```

### 2. Mapper 接口

```java
public interface UserMapper {
    List<User> selectAllUsers();
    List<User> selectUsersByName(@Param("name") String name);
}
```

### 3. Mapper XML

```xml
<mapper namespace="com.example.mapper.UserMapper">
    <select id="selectAllUsers" resultType="com.example.model.User">
        SELECT id, name, email, age FROM users ORDER BY id
    </select>
    
    <select id="selectUsersByName" resultType="com.example.model.User">
        SELECT id, name, email, age FROM users 
        WHERE name LIKE CONCAT('%', #{name}, '%')
        ORDER BY id
    </select>
</mapper>
```

## 高级特性

### 1. 多数据源支持

```java
@Intercepts({
    @Signature(type = StatementHandler.class, method = "prepare", args = {Connection.class, Integer.class})
})
public class MultiDataSourceDialectPlugin implements Interceptor {
    
    private Map<String, DatabaseDialect> dialectMap = new HashMap<>();
    
    @Override
    public Object intercept(Invocation invocation) throws Throwable {
        Connection connection = (Connection) invocation.getArgs()[0];
        String url = connection.getMetaData().getURL();
        
        // 根据连接URL获取对应的方言
        DatabaseDialect dialect = dialectMap.computeIfAbsent(url, 
            key -> DatabaseDialect.fromUrl(key));
        
        // 处理分页逻辑
        return handlePagination(invocation, dialect);
    }
    
    private Object handlePagination(Invocation invocation, DatabaseDialect dialect) 
            throws Throwable {
        // 分页处理逻辑
        return invocation.proceed();
    }
}
```

### 2. 插件链执行顺序

插件的执行顺序与配置顺序相反（类似洋葱模型）：

```
配置顺序: Plugin1 -> Plugin2 -> Plugin3
执行顺序: Plugin3 -> Plugin2 -> Plugin1 -> 目标方法 -> Plugin1 -> Plugin2 -> Plugin3
```

### 3. 条件拦截

```java
@Override
public Object intercept(Invocation invocation) throws Throwable {
    MappedStatement mappedStatement = (MappedStatement) invocation.getArgs()[0];
    
    // 只拦截特定的SQL语句
    if (mappedStatement.getId().contains("selectByPage")) {
        // 执行分页逻辑
        return handlePagination(invocation);
    }
    
    // 其他情况直接执行
    return invocation.proceed();
}
```

## 最佳实践

### 1. 性能考虑
- 避免在插件中执行耗时操作
- 合理使用缓存减少重复计算
- 只在必要时进行拦截

### 2. 异常处理
```java
@Override
public Object intercept(Invocation invocation) throws Throwable {
    try {
        // 插件逻辑
        return processInvocation(invocation);
    } catch (Exception e) {
        // 记录错误日志
        logger.error("Plugin execution failed", e);
        // 继续执行原方法
        return invocation.proceed();
    }
}
```

### 3. 线程安全
- 插件实例是单例的，需要考虑线程安全
- 使用 ThreadLocal 存储线程相关数据
- 避免使用实例变量存储状态

### 4. 资源清理
```java
@Override
public Object intercept(Invocation invocation) throws Throwable {
    try {
        // 插件逻辑
        return invocation.proceed();
    } finally {
        // 清理资源
        ThreadLocalHelper.clear();
    }
}
```

## 常见问题

### 1. 插件不生效
- 检查 @Intercepts 注解配置
- 确认插件已正确注册
- 验证拦截的方法签名是否正确

### 2. 性能问题
- 避免在插件中执行复杂逻辑
- 使用条件判断减少不必要的处理
- 合理使用缓存

### 3. 兼容性问题
- 不同版本的 MyBatis 可能有 API 变化
- 注意与其他插件的兼容性
- 测试多种数据库环境

## 总结

MyBatis 插件机制提供了强大的扩展能力，通过合理使用插件可以实现：

- **数据库方言适配** - 支持多种数据库的语法差异
- **分页功能** - 自动添加分页SQL
- **性能监控** - 监控SQL执行时间和性能
- **数据加密** - 自动加密敏感数据
- **审计日志** - 记录数据变更历史
- **缓存增强** - 实现更复杂的缓存策略

在使用插件时，需要注意性能影响、线程安全和异常处理，确保插件的稳定性和可靠性。通过本文的示例，你可以根据实际需求开发适合的 MyBatis 插件。