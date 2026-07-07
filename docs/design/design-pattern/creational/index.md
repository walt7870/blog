# 创建型模式总览

创建型模式关注对象的创建过程。它们解决的不是“能不能创建对象”，而是当创建逻辑变复杂、产品类型会扩展、构建步骤很多、创建成本较高时，如何让使用方少依赖具体细节。

![创建型模式总览](/design-pattern/creational-overview.svg)

## 解决的核心问题

创建型模式通常出现在这些信号里：

- 业务代码中到处散落 `new` 和初始化细节。
- 创建对象前需要读取配置、判断环境、选择实现类。
- 一个对象有很多可选参数，构造函数越来越长。
- 新增产品类型时，总要修改调用方代码。
- 创建对象成本高，希望复用或复制已有对象。
- 某个资源只能有一个实例，例如配置中心、线程池、连接池。

创建型模式的目标是让客户端表达“我要什么”，而不是关心“怎么一步步造出来”。

## 五种创建型模式

| 模式 | 适合场景 | 直观理解 |
| --- | --- | --- |
| [单例模式](./singleton.md) | 全局只允许一个实例 | 一个系统只保留一个共享对象 |
| [工厂方法](./factory-method.md) | 产品类型会扩展 | 把具体创建交给具体工厂 |
| [抽象工厂](./abstract-method.md) | 一组相关产品需要整体切换 | 创建一整个产品族 |
| [建造者](./builder.md) | 对象构建步骤多、参数多 | 分步骤组装复杂对象 |
| [原型](./prototype.md) | 创建成本高或对象结构复杂 | 复制已有样板对象 |

## 怎么选

### 只想控制唯一实例

选择单例模式。常见于线程池、连接池、全局配置、注册中心客户端等。但要避免把业务状态塞进单例，否则测试和并发都会变复杂。

### 只创建一种产品层次

选择工厂方法。比如日志输出器、支付渠道、文件解析器、消息发送器，每次只需要一种产品实例。

### 需要创建一组配套产品

选择抽象工厂。比如不同操作系统的按钮、输入框、菜单；不同云厂商的存储、队列、数据库客户端。重点是产品族之间要保持一致。

### 一个对象参数很多

选择建造者。比如 HTTP 请求、报表配置、复杂查询条件、导出任务配置。建造者能避免构造函数参数过长，也能让构建过程更清晰。

### 从已有对象快速生成新对象

选择原型模式。比如图形编辑器复制图形、游戏中复制怪物模板、流程系统复制审批模板。

## 实操：创建逻辑怎么从业务代码里拆出来

### 场景一：对象创建分支太多

常见问题代码：

```java
public class ParserService {
    public Parser createParser(String fileType) {
        if ("json".equals(fileType)) {
            return new JsonParser();
        }
        if ("xml".equals(fileType)) {
            return new XmlParser();
        }
        if ("csv".equals(fileType)) {
            return new CsvParser();
        }
        throw new IllegalArgumentException("不支持的文件类型");
    }
}
```

如果文件类型稳定，这样写没有问题。如果解析器类型经常增加，可以改成注册式工厂：

```java
public interface Parser {
    String fileType();
    Document parse(String content);
}

public class ParserFactory {
    private final Map<String, Parser> parserMap;

    public ParserFactory(List<Parser> parsers) {
        this.parserMap = parsers.stream()
                .collect(Collectors.toMap(Parser::fileType, parser -> parser));
    }

    public Parser getParser(String fileType) {
        Parser parser = parserMap.get(fileType);
        if (parser == null) {
            throw new IllegalArgumentException("不支持的文件类型");
        }
        return parser;
    }
}
```

新增 `YamlParser` 时只需要新增类并注册，不需要修改原来的分支。

### 场景二：构造参数太多

问题代码：

```java
ReportTask task = new ReportTask(
        "sales",
        startTime,
        endTime,
        true,
        false,
        "xlsx",
        "zh_CN",
        5000
);
```

调用方很难看出每个参数的含义，也容易传错顺序。可以使用建造者：

```java
ReportTask task = ReportTask.builder()
        .name("sales")
        .timeRange(startTime, endTime)
        .includeHeader(true)
        .format("xlsx")
        .locale("zh_CN")
        .pageSize(5000)
        .build();
```

建造者适合参数多、可选项多、构建时需要校验默认值的对象。

### 场景三：单例不要直接写成全局业务对象

比较适合单例的对象通常是无状态或资源型对象：

```java
public class ThreadPoolHolder {
    private static final ExecutorService INSTANCE =
            Executors.newFixedThreadPool(16);

    public static ExecutorService getInstance() {
        return INSTANCE;
    }
}
```

不适合单例的对象通常带有用户、订单、请求上下文等业务状态。业务状态一旦全局共享，很容易引发并发问题和测试污染。

## 常见误区

- 简单对象不要强行套工厂，直接构造更清楚。
- 单例不是全局变量的合理化工具。
- 抽象工厂适合产品族，不适合只有一个产品的场景。
- 建造者不是所有多参数对象都必须使用，参数少且稳定时构造函数即可。
- 原型复制要注意深拷贝和浅拷贝边界。

## 和其他模式的关系

- 创建型模式经常和策略、状态、责任链配合，用工厂创建不同策略或处理器。
- 建造者可以构建组合模式中的树形对象。
- 单例常见于外观、工厂、注册表，但要控制全局状态范围。
- 原型适合与缓存、对象池结合，减少重复初始化成本。

创建型模式的核心判断标准是：创建过程是否已经成为变化点。如果没有，保持简单更好。
