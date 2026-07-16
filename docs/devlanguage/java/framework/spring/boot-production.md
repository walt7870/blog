# Spring Boot 配置与生产运行

应用能够启动只是工程闭环的中点。生产运行还要回答：配置最终从哪里来、实例何时可以接流量、故障是否可观察、发布时如何停止，以及外部依赖变慢时怎样保护线程和连接。

## 配置不是一份 YAML 文件

> 配套视频：[EP04：多个配置来源怎样决定最终值](https://www.bilibili.com/video/BV1AGKu6mEDp) 与 [EP05：Config Data、Profile 和外部目录怎样进入配置栈](https://www.bilibili.com/video/BV1d8Ku6NEMh)。

Boot 把多个 PropertySource 合并为 Environment。包内配置适合保存安全默认值，外部文件和环境变量提供环境差异，命令行参数适合临时覆盖。测试属性还有独立优先级。相同键的最终值由来源顺序决定。

结构化业务配置应使用 `@ConfigurationProperties`，在启动时完成类型转换与校验：

```yaml
payment:
  base-url: https://pay.example.com
  connect-timeout: 1s
  read-timeout: 3s
```

```java
@Validated
@ConfigurationProperties("payment")
public record PaymentProperties(
        @NotNull URI baseUrl,
        @NotNull Duration connectTimeout,
        @NotNull Duration readTimeout) {}
```

配置对象需要通过扫描或 EnableConfigurationProperties 注册。校验失败应阻止应用进入就绪，而不是等第一笔支付请求到来才发现地址缺失。

## 健康、存活与就绪不是同一个问题

存活检查判断进程是否已经失去自愈能力，需要重启；就绪检查判断实例当前能否接收流量。数据库短暂抖动如果直接导致 liveness 失败，所有实例可能同时重启并放大故障。更稳妥的做法是根据业务依赖关系设计 readiness，并让 liveness 只覆盖进程级不可恢复状态。

健康端点返回 UP 也不能证明核心业务成功。至少还要有真实请求、数据库读写或消息收发等分层验证，且验证动作不能产生不可控副作用。

## Actuator 应按问题开放

`health` 用于实例状态，`metrics` 用于趋势，`mappings` 用于路由，`conditions` 用于自动配置，`env` 与 `configprops` 用于配置来源。生产环境不应为了排错方便暴露全部端点；内部结构和配置端点需要鉴权、网络隔离与脱敏。

一次配置问题的证据链应是：确认部署参数，查看 Environment 最终值及来源，检查配置绑定对象，再验证使用该配置的 Client。只看到 YAML 内容不能证明运行实例采用了该值。

## 外部调用必须有时间边界

HTTP、数据库、Redis 和消息系统都需要连接、读取或处理超时。没有超时的外部调用会长期占用请求线程；重试若没有总预算和退避，会在下游故障时制造更多流量。线程池和连接池的容量也必须结合上游并发、下游延迟和超时计算，而不是只提高最大值。

事务中应避免长时间远程调用。数据库连接在等待远端响应期间仍被占用，最终可能把外部服务变慢放大成连接池耗尽。

## 发布与停止过程

发布新版本时，实例应先从流量入口摘除，再等待在途请求完成，停止消费者和定时任务，最后关闭 Context 与连接资源。优雅停机需要网关、编排平台、服务器超时和应用配置协同；只打开一个开关不能保证所有请求都完成。

发布验证至少包括版本或提交标识、健康与就绪、一个代表性业务请求、关键依赖指标和错误日志。构建成功不能替代运行验证，进程存在也不能替代公网或真实调用链验证。

## 生产排错顺序

先确定影响范围和开始时间，再比较发布、配置和依赖事件；随后沿入口流量、线程池、数据库连接池、外部调用和 JVM 指标缩小范围。日志需要请求 ID 与业务 ID，指标需要延迟分位数和错误分类，Trace 用于还原跨服务时间分布。三者各自回答不同问题，不能只依赖一份启动日志。
