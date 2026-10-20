# MyBatis 的映射、会话与事务

订单接口传入订单号，业务层调用 `mapper.findById(102)`，MyBatis 把它定位到 SQL，绑定参数，再把结果行映射为对象。框架减少的是 JDBC 参数、语句和结果处理的重复工作；SQL 是否正确、索引是否合适、事务何时提交和失败后是否重试，仍需要明确设计。

本页先说明执行链，再用独立内存数据库运行提交与回滚。练习固定 **MyBatis 3.5.19、H2 2.3.232、JDK 17**，用于验证文中的 API 合同，不表示这是当前所有项目的推荐依赖组合。Spring 集成应按项目的 Spring、Spring Boot、MyBatis-Spring 和 JDK 兼容矩阵选型，不能把旧版集成包直接用于任意新项目。

## Mapper 方法如何到达数据库

![MyBatis会话与事务的生命周期](/java/mybatis-session-transaction.svg)

`SqlSessionFactoryBuilder` 用配置创建工厂，通常只在启动阶段使用。`SqlSessionFactory` 可以在应用内复用；普通 `SqlSession` 不是线程安全对象，应限制在一次受控操作或事务内，不能存成全局变量供请求共享。Mapper 代理由会话创建，其使用范围也不能超过对应会话。

Mapper 接口方法、XML 的 namespace/id 或注解映射共同确定 statement。常见标识是接口全限定名加方法名；接口存在但 XML 未被打包、namespace 不一致或方法没有注册，都会导致绑定失败。XML 与注解可以按语句组织，但同一 statement 不应重复定义两套冲突实现。

执行时，`MappedStatement` 描述语句合同，`BoundSql` 表达本次动态 SQL 和参数映射。Executor 协调执行与缓存，StatementHandler、ParameterHandler、ResultSetHandler 分别参与语句、参数和结果处理。它们的扩展点见 [插件机制](./plugin.md)；拦截 Mapper 调用耗时与观察数据库实际耗时并不相同。

## 可运行的订单状态更新

练习只连接当前进程的 H2 内存库，不访问已有数据库，也不创建网络监听。初始 102 订单待支付、金额 5000 分，103 已支付、金额 3000 分；先提交 102 的状态变更，再修改 103 的金额后回滚，最后新开会话核对结果。

依赖坐标如下，是项目依赖片段；也可将对应 JAR 放到练习目录的 `lib/`。不需要添加 MyBatis-Spring 或配置数据库 root 账号。

```xml
<dependency>
  <groupId>org.mybatis</groupId>
  <artifactId>mybatis</artifactId>
  <version>3.5.19</version>
</dependency>
<dependency>
  <groupId>com.h2database</groupId>
  <artifactId>h2</artifactId>
  <version>2.3.232</version>
  <scope>runtime</scope>
</dependency>
```

以下为完整 `MyBatisOrder.java`。`@Param` 固定参数名称，`@ConstructorArgs` 明确结果列与 record 构造器的对应关系，不依赖构造器参数名猜测。

```java
import java.sql.Connection;
import java.sql.Statement;
import javax.sql.DataSource;
import org.apache.ibatis.annotations.Arg;
import org.apache.ibatis.annotations.ConstructorArgs;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;
import org.apache.ibatis.datasource.unpooled.UnpooledDataSource;
import org.apache.ibatis.mapping.Environment;
import org.apache.ibatis.session.Configuration;
import org.apache.ibatis.session.SqlSession;
import org.apache.ibatis.session.SqlSessionFactory;
import org.apache.ibatis.session.SqlSessionFactoryBuilder;
import org.apache.ibatis.transaction.jdbc.JdbcTransactionFactory;

public class MyBatisOrder {
    public record OrderRow(long id, long amountCent, String status) {}

    public interface OrderMapper {
        @Select("SELECT id, amount_cent, status FROM orders WHERE id = #{id}")
        @ConstructorArgs({
            @Arg(column = "id", javaType = long.class, id = true),
            @Arg(column = "amount_cent", javaType = long.class),
            @Arg(column = "status", javaType = String.class)
        })
        OrderRow findById(@Param("id") long id);

        @Update("UPDATE orders SET status = 'PAID' " +
                "WHERE id = #{id} AND status = 'PENDING'")
        int markPaid(@Param("id") long id);

        @Update("UPDATE orders SET amount_cent = #{cent} WHERE id = #{id}")
        int changeAmount(@Param("id") long id, @Param("cent") long cent);

        @Select("SELECT COUNT(*) FROM orders WHERE status = #{status}")
        int countByStatus(@Param("status") String status);
    }

    static SqlSessionFactory factory(DataSource dataSource) {
        Environment environment = new Environment("local-example",
                new JdbcTransactionFactory(), dataSource);
        Configuration configuration = new Configuration(environment);
        configuration.setCacheEnabled(false);
        configuration.addMapper(OrderMapper.class);
        return new SqlSessionFactoryBuilder().build(configuration);
    }

    static void pay(SqlSessionFactory factory, long id) {
        try (SqlSession session = factory.openSession(false)) {
            try {
                int changed = session.getMapper(OrderMapper.class).markPaid(id);
                if (changed != 1) throw new IllegalStateException("订单状态不允许支付");
                session.commit();
            } catch (RuntimeException | Error failure) {
                try {
                    session.rollback();
                } catch (RuntimeException rollbackFailure) {
                    failure.addSuppressed(rollbackFailure);
                }
                throw failure;
            }
        }
    }

    public static void main(String[] args) throws Exception {
        DataSource dataSource = new UnpooledDataSource("org.h2.Driver",
                "jdbc:h2:mem:order_example;DB_CLOSE_DELAY=-1", "sa", "");
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement()) {
            statement.execute("CREATE TABLE orders (id BIGINT PRIMARY KEY, " +
                    "amount_cent BIGINT NOT NULL CHECK (amount_cent >= 0), " +
                    "status VARCHAR(16) NOT NULL)");
            statement.executeUpdate("INSERT INTO orders VALUES " +
                    "(102, 5000, 'PENDING'), (103, 3000, 'PAID')");
        }
        SqlSessionFactory factory = factory(dataSource);
        pay(factory, 102);
        try (SqlSession session = factory.openSession(false)) {
            session.getMapper(OrderMapper.class).changeAmount(103, 9999);
            session.rollback();
        }
        try (SqlSession session = factory.openSession()) {
            OrderMapper mapper = session.getMapper(OrderMapper.class);
            OrderRow first = mapper.findById(102);
            OrderRow second = mapper.findById(103);
            long total = Math.addExact(first.amountCent(), second.amountCent());
            if (!first.status().equals("PAID") || total != 8000) {
                throw new AssertionError("提交或回滚结果不符");
            }
            System.out.println("102状态=" + first.status());
            System.out.println("103金额=" + second.amountCent() + "分");
            System.out.println("已支付=" + mapper.countByStatus("PAID") +
                    "单，合计=" + total + "分");
        }
    }
}
```

```bash
javac --release 17 -encoding UTF-8 -cp 'lib/*' MyBatisOrder.java
java -cp '.:lib/*' MyBatisOrder
```

命令适用于 Linux/macOS；Windows 的运行 classpath 使用 `.;lib/*`。预期结果为 `102状态=PAID`、`103金额=3000分`、`已支付=2单，合计=8000分`。H2 的 `DB_CLOSE_DELAY=-1` 让内存库在连接关闭后存活到当前 JVM 结束，适合这个进程内练习，不是生产数据库持久化策略。

`pay` 中的回滚位于 session 的有效作用域内，回滚自身的异常也不会覆盖原始失败。提交本身仍可能失败；应用应把成功结果放在正确的事务边界之后。关闭未提交的普通会话通常会回滚，但示例显式表达提交和回滚，不依赖遗漏操作来暗示业务意图。

再次支付 102 会得到更新行数 0 并失败，因为本例只允许 PENDING→PAID。真实支付需要按稳定支付身份验证幂等结果；行数 0 还可能表示订单不存在、状态冲突等不同情况，不能统一当作“幂等成功”。`WHERE status='PENDING'` 也不能替代支付流水唯一约束和跨表事务。

## 动态 SQL、映射与分页

`#{}` 为值生成预编译参数，适合订单号、状态、金额和分页数值。`${}` 直接拼接文本，不负责转义，也不能拿来替代值绑定。表名、列名、排序方向不能作为普通值参数占位，需要从代码内的允许集合选择；不能把客户端的排序字符串直接拼入 SQL。

下面是独立 Mapper XML 中的语句片段，不属于上面的注解示例。假设方法为 `List<OrderRow> findByIds(@Param("ids") List<Long> ids)`，已有名为 `orderRow` 的构造器 resultMap。非空集合逐项绑定；空集合或 null 明确返回零行，避免动态条件被省略后变成全表查询。

```xml
<select id="findByIds" resultMap="orderRow">
  SELECT id, amount_cent, status FROM orders
  WHERE
  <choose>
    <when test="ids != null and !ids.isEmpty()">
      id IN
      <foreach collection="ids" item="id" open="(" separator="," close=")">
        #{id}
      </foreach>
    </when>
    <otherwise>1 = 0</otherwise>
  </choose>
  ORDER BY id
</select>
```

`where` 可清理开头的 AND/OR，`set` 可处理动态更新的逗号，但不会替你保证“至少有一个更新字段”或限制修改范围。动态批量更新、删除应先在应用入口确认必需条件，再对最终 SQL 和影响行数验收。

简单一行对象可以用明确列别名或 resultMap；一对多关联需要标识主、子对象的身份，避免把联接产生的重复主行当成多个订单。嵌套查询可能形成 N+1 次访问；直接对联接结果做 LIMIT 又可能截断一张订单的子项。常见办法是先按稳定顺序分页取订单 ID，再批量取明细并按 ID 组装。分页需要唯一排序键以及明确的数据快照要求，`RowBounds` 本身不等于所有数据库都会生成物理分页 SQL。

## 缓存不是事务隔离的替代

一级缓存属于普通 SqlSession，默认 localCacheScope 为 SESSION；同一会话里相同查询可能返回同一批对象引用。更新、提交、回滚或清理会影响本地缓存，配置也会改变范围。长时间复用会话会扩大陈旧读取和对象共享风险，不能据此构建跨请求缓存。

二级缓存按 namespace 配置，不是因为有 Mapper 接口就自动获得可用业务缓存。它的提交可见性、对象复制/序列化要求、跨 namespace 更新和外部写入失效都需要核对。本例关闭了二级缓存；高一致性的订单/资金场景不应在没有失效设计时随意开启 `readOnly=true` 共享可变对象。真实缓存方案应先明确能接受的数据陈旧窗口。

## Spring 管理的会话有不同边界

使用 MyBatis-Spring 时，通过受管理的 Mapper 或 `SqlSessionTemplate` 参与 Spring 事务；事务管理器与 SqlSessionFactory 必须使用对应的同一 DataSource。不要在受 Spring 管理的会话上手动调用 `commit`、`rollback` 或 `close`，也不要在业务代码中另开独立会话绕过既有事务。

事务配置生效还取决于代理调用、传播和回滚规则。没有 Spring 事务时，受管理 Mapper 的单次操作可自动提交，多个 Mapper 调用不会因此自动成为一笔业务事务。多个数据源、本地线程切换和异步任务需要单独核对，不能假设原事务上下文天然传播到所有工作线程。

## 从错误回到证据

| 现象 | 先核对什么 | 验证办法 |
| --- | --- | --- |
| `Invalid bound statement` | namespace、方法名、注册方式、XML 打包路径 | 查看实际产物中的资源，定位完整 statement 标识 |
| 参数名找不到 | `@Param` 名称、对象属性、集合名 | 对照 BoundSql 的参数映射，不记录敏感原值 |
| 字段为 null 或构造失败 | SQL 列、类型处理器、构造器/resultMap | 用一行固定数据核对每个字段，而非 SELECT * 猜测 |
| 更新返回 1，之后数据却没变 | 最外层事务是否提交、是否发生回滚 | 新连接/新会话读取，结合事务日志确认 |
| 多次查询结果旧 | 会话复用、二级缓存、数据库隔离和外部写入 | 分别验证新会话、缓存设置和数据库真实值 |
| 查询慢 | 最终 SQL、执行计划、结果行数、N+1 和连接等待 | 关联应用观测与数据库证据，详见 [MySQL 查询优化](../../../../database/mysql/query-optimization.md) |

可运行示例验证的是本地映射和事务合同；生产排查还要考虑实际驱动、数据库版本、连接池、隔离级别和框架集成。图与例子均不能替代这些环境验收。
