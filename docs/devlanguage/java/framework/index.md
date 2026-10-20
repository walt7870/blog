# Java 框架

一个“查询订单”接口同时涉及对象创建、HTTP 参数绑定、业务规则、事务、SQL 和结果映射。Java 框架分别处理这些协作环节；排错时先确定失败处于哪个边界，再进入对应机制页，避免把所有异常都归为“框架配置问题”。

![Spring与MyBatis在订单请求中的职责](/java/framework-order-boundaries.svg)

图示采用 Spring MVC、Spring 事务与 MyBatis-Spring 的常见组合。Spring Boot 在启动阶段组织配置和组件，IoC 容器形成对象关系；HTTP 请求进入 MVC，业务方法通过满足事务配置的代理调用后，Mapper 再经会话和 JDBC 访问数据库。图中的先后是调用方向，返回和事务结束的过程仍需分别理解。

例如，订单更新 SQL 返回影响一行，只表明这次语句的执行结果；事务仍可能在后续步骤失败并回滚。Controller 因此不应提前把“Mapper 返回 1”作为最终成功。另一个例子是 Mapper 找不到 XML，这属于映射注册与资源打包问题，不能通过增加连接池大小修复。

## MyBatis

MyBatis 把明确的 SQL、参数绑定与结果映射组织成 Mapper 调用；它不替应用决定跨步骤的业务事务，也不自动生成合理索引。先运行 [MyBatis 订单示例](./mybatis/)，理解 SqlSession 生命周期、提交与回滚，再阅读 [插件机制](./mybatis/plugin.md) 中的拦截位置和异常边界。插件只在真实经过的拦截点生效，SQL 缓存命中和内部调用都会影响能观察到的范围。

## Spring

Spring 是 Java 应用的基础设施框架，重点解决对象装配、方法增强、Web 请求处理、配置加载和应用启动等问题。它不是单一功能库，而是一组协作机制。

| 内容 | 说明 | 详细说明 |
| --- | --- | --- |
| Spring 总览 | 建立 IoC、AOP、MVC、Spring Boot 的整体关系 | [查看](./spring/) |
| IoC 容器 | 理解 Bean 来源、依赖注入、生命周期和装配冲突 | [查看](./spring/ioc.md) |
| AOP | 理解代理机制、事务失效和切点设计 | [查看](./spring/aop.md) |
| Spring MVC | 理解请求链路、参数绑定、统一异常和接口排查 | [查看](./spring/mvc.md) |
| Spring Boot | 理解 Starter、自动配置、配置绑定和生产运行入口 | [查看](./spring/springboot.md) |
| Spring Boot 源码系列 | 沿真实启动链串联配置、容器、Bean、代理、服务器和请求处理 | [查看](./spring/video-series.md) |
| Spring 完整运行模型 | 从应用启动、对象图形成到一次 HTTP 请求结束 | [查看](./spring/runtime-model.md) |

## 按失败位置选择阅读入口

| 具体表现 | 先查什么 | 进入机制页 |
| --- | --- | --- |
| 启动时找不到 Bean 或有多个候选 | 定义来源、扫描范围、条件装配和限定名 | [IoC](./spring/ioc.md)、[Spring Boot](./spring/springboot.md) |
| 接口 404、参数绑定失败或响应格式不符 | 路由、请求方法、转换器与异常处理 | [MVC](./spring/mvc.md) |
| 标了事务却出现部分成功 | 是否跨代理调用、事务管理器/数据源、传播及回滚规则 | [AOP](./spring/aop.md)、[MyBatis](./mybatis/) |
| SQL 无法绑定参数或字段映射为空 | statement 标识、参数名称、别名/resultMap和实际资源 | [MyBatis](./mybatis/) |
| 插件未触发或时间指标失真 | 注册位置、方法签名、缓存层和是否重复执行 | [MyBatis 插件](./mybatis/plugin.md) |

同一故障可以跨多层，但证据要沿调用链定位。保留根因异常、映射标识与请求关联号，同时避免把完整 SQL 参数、身份凭据或订单隐私直接写进日志。
