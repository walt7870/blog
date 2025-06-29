# MyBatis 详细介绍

## 概述

MyBatis 是一款优秀的持久层框架，它支持自定义 SQL、存储过程以及高级映射。MyBatis 免除了几乎所有的 JDBC 代码以及设置参数和获取结果集的工作。MyBatis 可以通过简单的 XML 或注解来配置和映射原始类型、接口和 Java POJO（Plain Old Java Objects，普通老式 Java 对象）为数据库中的记录。

## 核心特性

### 1. 简化数据库操作

- 消除了大量的 JDBC 样板代码
- 自动处理连接管理
- 简化结果集映射

### 2. 灵活的 SQL 控制

- 支持动态 SQL
- 可以编写复杂的查询语句
- 支持存储过程调用

### 3. 强大的映射功能

- 自动映射结果集到 Java 对象
- 支持复杂的关联映射
- 支持嵌套查询和嵌套结果映射

### 4. 缓存机制

- 一级缓存（SqlSession 级别）
- 二级缓存（Mapper 级别）
- 支持第三方缓存集成

## 核心组件

### 1. SqlSessionFactory

```java
// 创建 SqlSessionFactory
String resource = "mybatis-config.xml";
InputStream inputStream = Resources.getResourceAsStream(resource);
SqlSessionFactory sqlSessionFactory = new SqlSessionFactoryBuilder().build(inputStream);
```

### 2. SqlSession

```java
// 获取 SqlSession
try (SqlSession session = sqlSessionFactory.openSession()) {
    // 执行数据库操作
    UserMapper mapper = session.getMapper(UserMapper.class);
    User user = mapper.selectUser(1);
}
```

### 3. Mapper 接口

```java
public interface UserMapper {
    User selectUser(int id);
    List<User> selectAllUsers();
    int insertUser(User user);
    int updateUser(User user);
    int deleteUser(int id);
}
```

## 配置文件

### 1. 主配置文件 (mybatis-config.xml)

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE configuration
  PUBLIC "-//mybatis.org//DTD Config 3.0//EN"
  "http://mybatis.org/dtd/mybatis-3-config.dtd">
<configuration>
  <environments default="development">
    <environment id="development">
      <transactionManager type="JDBC"/>
      <dataSource type="POOLED">
        <property name="driver" value="com.mysql.cj.jdbc.Driver"/>
        <property name="url" value="jdbc:mysql://localhost:3306/mybatis"/>
        <property name="username" value="root"/>
        <property name="password" value="password"/>
      </dataSource>
    </environment>
  </environments>
  <mappers>
    <mapper resource="mappers/UserMapper.xml"/>
  </mappers>
</configuration>
```

### 2. Mapper XML 文件

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper
  PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
  "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.example.mapper.UserMapper">
  
  <select id="selectUser" resultType="com.example.model.User">
    SELECT * FROM users WHERE id = #{id}
  </select>
  
  <select id="selectAllUsers" resultType="com.example.model.User">
    SELECT * FROM users
  </select>
  
  <insert id="insertUser" parameterType="com.example.model.User">
    INSERT INTO users (name, email, age) 
    VALUES (#{name}, #{email}, #{age})
  </insert>
  
  <update id="updateUser" parameterType="com.example.model.User">
    UPDATE users 
    SET name = #{name}, email = #{email}, age = #{age}
    WHERE id = #{id}
  </update>
  
  <delete id="deleteUser">
    DELETE FROM users WHERE id = #{id}
  </delete>
  
</mapper>
```

## 动态 SQL

MyBatis 的强大特性之一是动态 SQL，它可以根据条件动态生成 SQL 语句。

### 1. if 标签

```xml
<select id="findUsers" resultType="User">
  SELECT * FROM users
  WHERE 1=1
  <if test="name != null">
    AND name = #{name}
  </if>
  <if test="email != null">
    AND email = #{email}
  </if>
</select>
```

### 2. choose、when、otherwise

```xml
<select id="findUsers" resultType="User">
  SELECT * FROM users
  WHERE 1=1
  <choose>
    <when test="name != null">
      AND name = #{name}
    </when>
    <when test="email != null">
      AND email = #{email}
    </when>
    <otherwise>
      AND status = 'ACTIVE'
    </otherwise>
  </choose>
</select>
```

### 3. where 标签

```xml
<select id="findUsers" resultType="User">
  SELECT * FROM users
  <where>
    <if test="name != null">
      name = #{name}
    </if>
    <if test="email != null">
      AND email = #{email}
    </if>
  </where>
</select>
```

### 4. foreach 标签

```xml
<select id="findUsersByIds" resultType="User">
  SELECT * FROM users
  WHERE id IN
  <foreach item="id" collection="list" open="(" separator="," close=")">
    #{id}
  </foreach>
</select>
```

## 结果映射

### 1. 简单映射

```xml
<select id="selectUser" resultType="com.example.model.User">
  SELECT id, name, email FROM users WHERE id = #{id}
</select>
```

### 2. 复杂映射

```xml
<resultMap id="UserResultMap" type="com.example.model.User">
  <id property="id" column="user_id"/>
  <result property="name" column="user_name"/>
  <result property="email" column="user_email"/>
  <association property="profile" javaType="com.example.model.Profile">
    <id property="id" column="profile_id"/>
    <result property="bio" column="bio"/>
  </association>
  <collection property="orders" ofType="com.example.model.Order">
    <id property="id" column="order_id"/>
    <result property="amount" column="amount"/>
  </collection>
</resultMap>

<select id="selectUserWithDetails" resultMap="UserResultMap">
  SELECT u.id as user_id, u.name as user_name, u.email as user_email,
         p.id as profile_id, p.bio,
         o.id as order_id, o.amount
  FROM users u
  LEFT JOIN profiles p ON u.id = p.user_id
  LEFT JOIN orders o ON u.id = o.user_id
  WHERE u.id = #{id}
</select>
```

## 注解方式

MyBatis 也支持使用注解来定义映射关系：

```java
public interface UserMapper {
    
    @Select("SELECT * FROM users WHERE id = #{id}")
    User selectUser(int id);
    
    @Insert("INSERT INTO users(name, email) VALUES(#{name}, #{email})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insertUser(User user);
    
    @Update("UPDATE users SET name=#{name}, email=#{email} WHERE id=#{id}")
    int updateUser(User user);
    
    @Delete("DELETE FROM users WHERE id = #{id}")
    int deleteUser(int id);
    
    @Select("SELECT * FROM users WHERE name LIKE #{name}")
    @Results({
        @Result(property = "id", column = "id"),
        @Result(property = "name", column = "name"),
        @Result(property = "email", column = "email")
    })
    List<User> findUsersByName(String name);
}
```

## 缓存机制

### 1. 一级缓存

- 默认开启
- SqlSession 级别
- 同一个 SqlSession 中相同查询会使用缓存

### 2. 二级缓存

```xml
<!-- 在 Mapper XML 中开启二级缓存 -->
<cache eviction="LRU" flushInterval="60000" size="512" readOnly="true"/>
```

```java
// 在注解中开启二级缓存
@CacheNamespace(eviction = LruCache.class, flushInterval = 60000, size = 512, readWrite = true)
public interface UserMapper {
    // mapper methods
}
```

## 与 Spring 集成

### 1. 添加依赖

```xml
<dependency>
    <groupId>org.mybatis</groupId>
    <artifactId>mybatis-spring</artifactId>
    <version>2.0.7</version>
</dependency>
```

### 2. 配置

```java
@Configuration
@MapperScan("com.example.mapper")
public class MyBatisConfig {
    
    @Bean
    public SqlSessionFactory sqlSessionFactory(DataSource dataSource) throws Exception {
        SqlSessionFactoryBean factoryBean = new SqlSessionFactoryBean();
        factoryBean.setDataSource(dataSource);
        factoryBean.setMapperLocations(new PathMatchingResourcePatternResolver()
            .getResources("classpath:mappers/*.xml"));
        return factoryBean.getObject();
    }
    
    @Bean
    public SqlSessionTemplate sqlSessionTemplate(SqlSessionFactory sqlSessionFactory) {
        return new SqlSessionTemplate(sqlSessionFactory);
    }
}
```

## 最佳实践

### 1. 命名规范

- Mapper 接口以 Mapper 结尾
- XML 文件与接口同名
- SQL ID 与方法名一致

### 2. 参数处理

```java
// 单个参数
User selectUser(int id);

// 多个参数使用 @Param
List<User> selectUsers(@Param("name") String name, @Param("age") int age);

// 使用对象参数
int insertUser(User user);

// 使用 Map 参数
List<User> selectUsersByMap(Map<String, Object> params);
```

### 3. 事务管理

```java
// 手动事务管理
try (SqlSession session = sqlSessionFactory.openSession()) {
    UserMapper mapper = session.getMapper(UserMapper.class);
    mapper.insertUser(user);
    session.commit(); // 手动提交
} catch (Exception e) {
    session.rollback(); // 回滚
}

// 自动提交
try (SqlSession session = sqlSessionFactory.openSession(true)) {
    UserMapper mapper = session.getMapper(UserMapper.class);
    mapper.insertUser(user); // 自动提交
}
```

### 4. 性能优化

- 合理使用缓存
- 避免 N+1 查询问题
- 使用批量操作
- 合理设置连接池参数

## 常见问题

### 1. 参数传递问题

```java
// 错误：多个参数没有使用 @Param
List<User> selectUsers(String name, int age);

// 正确：使用 @Param 注解
List<User> selectUsers(@Param("name") String name, @Param("age") int age);
```

### 2. 结果映射问题

```xml
<!-- 字段名与属性名不匹配时需要明确映射 -->
<resultMap id="UserResultMap" type="User">
  <result property="userName" column="user_name"/>
  <result property="userEmail" column="user_email"/>
</resultMap>
```

### 3. 动态 SQL 问题

```xml
<!-- 避免 SQL 注入，使用 #{} 而不是 ${} -->
<select id="selectUser" resultType="User">
  SELECT * FROM users WHERE id = #{id}
</select>
```

## 总结

MyBatis 是一个功能强大、灵活性高的持久层框架，它在简化数据库操作的同时保持了对 SQL 的完全控制。通过合理使用 MyBatis 的各种特性，可以构建高效、可维护的数据访问层。

主要优势：
- 学习成本低
- SQL 控制灵活
- 性能优秀
- 社区活跃
- 与 Spring 集成良好

适用场景：
- 需要复杂 SQL 查询的项目
- 对性能要求较高的应用
- 需要精确控制 SQL 的场景
- 传统企业级应用开发