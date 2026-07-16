# Java 框架

Java 框架部分记录企业应用开发中常用的基础框架。阅读时可以先从框架解决的问题进入，再进入具体组件的配置、运行机制和排错路径。

## MyBatis

- [MyBatis 概述](./mybatis/)
- [MyBatis 插件](./mybatis/plugin.md)

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
