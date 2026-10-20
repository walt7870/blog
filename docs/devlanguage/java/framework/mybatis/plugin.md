# MyBatis 插件的拦截边界

订单查询偶尔变慢，可以先观察哪个 Mapper statement 耗时长，再到数据库核对执行计划、锁和连接等待。MyBatis 插件能在执行器、语句准备、参数绑定或结果映射等位置加入观测逻辑，但这些位置看到的时间和调用次数不同。先确定观测对象，才能解释日志。

本页以 MyBatis 3.5.19 为练习版本，沿用 [映射、会话与事务](./index.md) 的 H2 订单例子。示例只记录调用标识、成功标志和经过时间，不修改 SQL，也不承担支付重试。

## 四类扩展点如何经过缓存

![MyBatis插件与缓存的拦截边界](/java/mybatis-plugin-boundaries.svg)

`Interceptor` 通过 `@Intercepts`、`@Signature` 声明接口、方法名和参数类型，框架用 JDK 动态代理包装匹配的目标。常见扩展点是 `Executor`、`StatementHandler`、`ParameterHandler` 和 `ResultSetHandler`。签名必须精确匹配；只写同名方法不表示拦截了所有重载。

| 位置 | 适合观察什么 | 不能直接推出什么 |
| --- | --- | --- |
| `Executor.query` | 一次执行器查询调用的总耗时，包含所经过的缓存和映射 | 不能当成数据库服务端执行耗时 |
| `Executor.update` | 一次更新调用是否返回、执行器耗时 | 不能证明事务最终提交；BATCH 模式还可能尚未发送到数据库 |
| `StatementHandler.prepare` | 实际准备 JDBC Statement 的路径 | 缓存命中、Statement 复用时不一定进入 |
| `ParameterHandler.setParameters` | 参数向 JDBC 语句绑定的过程 | 不等于可以把敏感参数原值写日志 |
| `ResultSetHandler.handleResultSets` | 结果集读取和对象映射 | 不能独立覆盖连接等待、执行和提交 |

图画的是普通查询主路径，其他执行器模式、游标、嵌套查询和插件组合需要分别验证。代理只拦截经过它的调用；目标对象内部自调用不会自动再经过同一代理。例如只拦截四参数 `query`，不能据此宣称覆盖了所有六参数调用或内部嵌套查询。

## 可编译的耗时观测插件

以下是完整 `MapperTimingPlugin.java`，与上一页的 `MyBatisOrder.java` 放在同一练习目录。每次拦截只有一处 `invocation.proceed()`。目标失败时记录失败标志并把原异常继续向外传递，不再执行原 SQL。

```java
import java.util.concurrent.TimeUnit;
import org.apache.ibatis.executor.Executor;
import org.apache.ibatis.mapping.MappedStatement;
import org.apache.ibatis.plugin.Interceptor;
import org.apache.ibatis.plugin.Intercepts;
import org.apache.ibatis.plugin.Invocation;
import org.apache.ibatis.plugin.Signature;
import org.apache.ibatis.session.ResultHandler;
import org.apache.ibatis.session.RowBounds;

@Intercepts({
    @Signature(type = Executor.class, method = "query",
        args = {MappedStatement.class, Object.class,
                RowBounds.class, ResultHandler.class}),
    @Signature(type = Executor.class, method = "update",
        args = {MappedStatement.class, Object.class})
})
public final class MapperTimingPlugin implements Interceptor {
    @Override
    public Object intercept(Invocation invocation) throws Throwable {
        MappedStatement statement = (MappedStatement) invocation.getArgs()[0];
        long started = System.nanoTime();
        boolean success = false;
        try {
            Object result = invocation.proceed();
            success = true;
            return result;
        } finally {
            long micros = TimeUnit.NANOSECONDS.toMicros(System.nanoTime() - started);
            try {
                System.err.printf("statement=%s success=%s elapsedMicros=%d%n",
                        statement.getId(), success, micros);
            } catch (RuntimeException loggingFailure) {
                // 观测写出失败不能覆盖数据库调用的结果或原始异常。
            }
        }
    }
}
```

`nanoTime` 用于测量同一 JVM 内的经过时间，不是日志事件的墙上时钟。`success=true` 只表示这个被拦截调用正常返回；外层业务仍可能失败或回滚。不要把它显示成“订单支付成功”。示例的标准错误输出适合练习，生产应接入有容量上限的指标或日志通道，避免同步输出阻塞请求。

在上一页 `factory` 方法中，放在 `build` 之前注册插件：

```java
configuration.addInterceptor(new MapperTimingPlugin());
return new SqlSessionFactoryBuilder().build(configuration);
```

```bash
javac --release 17 -encoding UTF-8 -cp 'lib/*' MyBatisOrder.java MapperTimingPlugin.java
java -cp '.:lib/*' MyBatisOrder
```

Windows 的运行 classpath 改为 `.;lib/*`。输出仍应保持订单 102 已支付、103 金额 3000 分、总额 8000 分；额外日志按调用记录 statement 标识。插件没有记录 SQL 参数、连接 URL、密码或异常消息，避免把业务数据带到观测系统。真实日志还需要访问控制、保留周期和请求关联标识。

## 注册顺序与共享状态

同一目标先注册 A，再注册 B，后注册的代理位于外层。正常调用的顺序为 `B进入 → A进入 → 目标 → A退出 → B退出`；发生异常时则按各层的 `catch/finally` 逻辑退出。这条规则只适用于都匹配该对象和签名的插件，不代表所有 MyBatis 扩展点形成一条全局线性链。

原生 MyBatis 可在构建前 `configuration.addInterceptor(...)`，也可在配置文件的 `<plugins>` 中注册。Spring Boot 集成应使用所选 starter 支持的插件 Bean 或配置定制入口；先检查实际配置中的拦截器列表，避免自动扫描与手动注册各加一次。`org.apache.ibatis.session.Configuration` 与 Spring 的 `@Configuration` 不是同一个类型。

插件实例可被多个会话和请求共享。当前示例把开始时间和成功标志放在局部变量里，没有用实例字段保存“当前订单”“当前连接方言”或“当前分页参数”。配置值应在启动阶段固定，不能在首次请求时猜出数据库方言后让所有数据源共用它。

## 分页改写为什么需要更多合同

分页不是给任意 SQL 末尾添加 `LIMIT` 就结束。原 SQL 可能有 CTE、子查询、已有分页、锁语句、末尾分号或数据库特有语法；SQL Server 等方言还要求相应排序规则。查询结果由 SQL、绑定参数、分页条件和缓存键共同决定，若在生成缓存键后只改 SQL，可能把不同页混进同一缓存身份。

需要通用分页时，应评估项目已有、维护中的分页组件及其具体版本兼容范围；只有少数固定查询时，明确数据库方言的 SQL 通常更容易验证。两者都应检查页码/页大小边界、偏移量溢出、稳定唯一排序、空页、总数统计语义、缓存和其他插件顺序。不要通过反射写入 `BoundSql` 私有字段来绕过这些合同。

`ThreadLocal` 的清理范围也必须覆盖业务调用的完整生命周期。在 `prepare` 的 finally 中清理，无法覆盖缓存命中或进入 prepare 前已经抛错的路径；线程池复用时可能污染下一个请求。优先显式传递分页参数；必须使用线程上下文时，应由建立上下文的边界负责 `try/finally` 清理，嵌套调用还要有恢复策略。

## 验收与排错

| 验证场景 | 应看到什么 | 失败意味着什么 |
| --- | --- | --- |
| 同一会话连续执行相同查询 | 执行器观测可能两次，数据库准备次数更少 | 不应把日志条数直接当 SQL 请求数 |
| 更新违反数据库约束 | 原异常向外传播，一次调用不自动再写 | 捕获后重调 proceed 会形成隐式重试 |
| 更新正常返回后业务回滚 | 观测可为 success=true，新会话仍读到旧值 | 需要区分调用成功和事务提交 |
| A、B 都匹配同一方法 | B进入、A进入、A退出、B退出 | 检查注册顺序、重复注册和实际代理链 |
| 并发请求使用不同参数 | 每次观测只关联自身调用 | 检查共享字段与线程上下文泄漏 |

插件没生效时，先核对最终配置里是否已注册，再核对接口方法签名和本次路径是否真的经过该位置。慢查询排查应把执行器耗时、连接池等待、数据库执行计划与锁等待放在同一请求上下文中分析；单个插件不能代替这些证据。
