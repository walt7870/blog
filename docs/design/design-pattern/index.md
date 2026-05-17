# 设计模式整体科普

设计模式是软件开发中反复出现的设计问题和成熟解决思路的总结。它不是固定代码模板，也不是越多越好的技巧集合，而是一套帮助开发者描述结构、控制复杂度、降低耦合、提升可维护性的设计语言。

通俗地说，设计模式解决三类问题：

- 对象怎么创建：创建过程复杂、类型会变化、构建步骤多。
- 对象怎么组织：接口不兼容、功能要叠加、访问要控制、结构要统一。
- 对象怎么协作：算法会变化、状态会变化、通知关系复杂、请求处理流程不固定。

![设计模式总览地图](/design-pattern/pattern-map.svg)

## 为什么需要设计模式

小程序可以靠直觉写完，大系统不能只靠直觉维护。系统一旦长期演进，就会出现一些典型问题：

- 新增一个功能要修改很多旧代码。
- 类之间互相依赖，改一个地方牵动一大片。
- 创建对象时到处都是 `new`、`if else`、配置判断和初始化细节。
- 同一段流程里混杂权限、缓存、日志、重试、业务逻辑。
- 状态和分支越来越多，代码变成难以理解的条件堆叠。
- 团队沟通时缺少统一语言，只能反复解释一段结构“为什么这样写”。

设计模式的价值就在于把这些常见变化点整理成可复用的结构。它让代码不只是“能跑”，还更容易理解、扩展和替换。

## 设计模式不是什么

设计模式容易被误用。理解边界很重要：

- 设计模式不是语法糖，不能自动提升代码质量。
- 设计模式不是框架，不能替代业务建模和架构设计。
- 设计模式不是必须套用的清单，简单问题不需要复杂模式。
- 设计模式不是越多越专业，过度抽象会让系统更难读。
- 设计模式不是只属于面向对象语言，很多思想在函数式、脚本语言和架构设计中也能体现。

好的模式使用通常有一个共同点：代码中确实存在变化点，模式把变化点放到了更合适的位置。

## 模式背后的设计原则

设计原则是判断是否需要模式、应该如何使用模式的依据。

![设计原则关系图](/design-pattern/principles.svg)

每个原则都有独立说明页，适合在学习具体模式前先建立判断标准：[设计原则总览](./principles/)。

| 原则 | 通俗理解 | 常见体现 |
| --- | --- | --- |
| [单一职责](./principles/single-responsibility.md) | 一个模块只承担一类清晰职责 | 类更小，变化原因更集中 |
| [开闭原则](./principles/open-closed.md) | 对扩展开放，对修改收敛 | 新增实现类、策略、处理器，而不是改旧分支 |
| [里氏替换](./principles/liskov-substitution.md) | 子类替换父类后行为仍然可靠 | 继承不能破坏父类契约 |
| [依赖倒置](./principles/dependency-inversion.md) | 高层策略依赖抽象，不依赖细节 | 面向接口、依赖注入、插件化 |
| [接口隔离](./principles/interface-segregation.md) | 接口小而专，不强迫实现无关能力 | 拆分大接口，降低无用依赖 |
| [迪米特法则](./principles/law-of-demeter.md) | 少知道、少暴露、少链式打穿内部结构 | 外观、中介者、封装边界 |
| [组合复用](./principles/composite-reuse.md) | 优先通过组合复用能力 | 装饰器、策略、桥接、组合 |

这些原则不是教条。实际项目中要结合复杂度、团队能力、变更频率和性能要求取舍。

## 三大分类

### 创建型模式

创建型模式关注“对象怎么来”。当对象创建逻辑本身开始变复杂，就应该考虑把创建过程从业务使用方中抽离。

![创建型模式总览](/design-pattern/creational-overview.svg)

| 模式 | 解决的问题 | 直观理解 |
| --- | --- | --- |
| [单例模式](./creational/singleton.md) | 全局只需要一个实例 | 一个系统只保留一个共享对象 |
| [工厂方法](./creational/factory-method.md) | 创建哪种产品由子类决定 | 把 `new` 延迟给具体工厂 |
| [抽象工厂](./creational/abstract-method.md) | 创建一组相关产品 | 一次切换一个产品族 |
| [建造者](./creational/builder.md) | 复杂对象分步骤构建 | 像装配一台电脑一样组装对象 |
| [原型](./creational/prototype.md) | 创建成本高，适合复制 | 从样板对象克隆新对象 |

创建型模式的核心不是隐藏 `new`，而是隐藏创建背后的变化：产品类型、初始化步骤、默认配置、资源复用、创建成本。

### 结构型模式

结构型模式关注“对象怎么搭在一起”。当对象之间接口不一致、功能需要叠加、访问需要控制、系统需要统一入口时，就会用到这一类模式。

![结构型模式总览](/design-pattern/structural-overview.svg)

| 模式 | 解决的问题 | 直观理解 |
| --- | --- | --- |
| [适配器](./structural/adapter.md) | 接口不兼容 | 插头转换器 |
| [桥接](./structural/bridge.md) | 抽象和实现两个维度都要变化 | 把两个变化方向拆开 |
| [组合](./structural/composite.md) | 树形结构中整体和部分一致处理 | 文件夹和文件都能被遍历 |
| [装饰器](./structural/decorator.md) | 不改原对象，动态叠加功能 | 给对象一层层加外套 |
| [外观](./structural/facade.md) | 子系统复杂，对外需要简单入口 | 服务大厅统一窗口 |
| [享元](./structural/flyweight.md) | 大量细粒度对象占用资源 | 共享可复用的内部状态 |
| [代理](./structural/proxy.md) | 控制对真实对象的访问 | 先经过门卫再访问目标 |

结构型模式常常和组合优先原则有关。它们不是为了制造更多类，而是为了让对象关系更稳定、更清楚。

### 行为型模式

行为型模式关注“对象怎么协作”。当流程、算法、状态、通知、请求分发这些行为不断变化时，行为型模式能把变化从硬编码调用中拆出来。

![行为型模式总览](/design-pattern/behavioral-overview.svg)

| 模式 | 解决的问题 | 直观理解 |
| --- | --- | --- |
| [策略](./behavioral/strategy.md) | 算法可替换 | 同一目标，多种打法 |
| [模板方法](./behavioral/template-method.md) | 流程骨架固定，步骤可变 | 固定菜谱流程，允许替换调料 |
| [观察者](./behavioral/observer.md) | 状态变化通知多个对象 | 订阅消息推送 |
| [迭代器](./behavioral/iterator.md) | 统一遍历集合 | 不暴露内部结构也能逐个访问 |
| [责任链](./behavioral/chain-of-responsibility.md) | 请求沿处理链传递 | 审批流逐级处理 |
| [状态](./behavioral/state.md) | 不同状态下行为不同 | 订单状态改变后可执行动作不同 |
| [命令](./behavioral/command.md) | 把请求封装成对象 | 操作可排队、记录、撤销 |
| [备忘录](./behavioral/memento.md) | 保存和恢复对象状态 | 撤销、回滚、快照 |
| [解释器](./behavioral/interpreter.md) | 解释简单规则或语言 | 规则表达式解析器 |
| [访问者](./behavioral/visitor.md) | 数据结构稳定，操作常变化 | 给结构新增操作而不改元素类 |
| [中介者](./behavioral/mediator.md) | 多对象互相调用变复杂 | 用协调中心管理交互 |

行为型模式的重点是职责分配。它们让调用关系从“对象之间互相硬连”变成“通过策略、事件、命令、状态、处理器等结构进行协作”。

## 如何选择设计模式

先识别问题，再选择模式。实际落地时可以按下面四步走：

1. 找变化点：未来最可能增加或替换的地方是什么。
2. 找稳定点：哪些接口、流程或调用方不希望频繁修改。
3. 隔离变化：把变化点放到独立类、接口、处理器或组合对象里。
4. 验证收益：新增一个同类需求时，是否能少改旧代码、少影响旧测试。

![设计模式选型路线图](/design-pattern/selection-guide.svg)

| 问题 | 优先考虑 |
| --- | --- |
| 创建对象时有很多判断、配置、初始化逻辑 | 工厂方法、抽象工厂、建造者 |
| 一个复杂对象有很多可选参数和构建步骤 | 建造者 |
| 某个对象全局只应存在一个实例 | 单例，但要谨慎处理测试和全局状态 |
| 新旧接口不兼容，但旧代码不想改 | 适配器 |
| 需要在不改原类的情况下增加能力 | 装饰器 |
| 访问真实对象前要加权限、缓存、远程调用、延迟加载 | 代理 |
| 子系统太复杂，外部只需要简单入口 | 外观 |
| 算法经常替换 | 策略 |
| 流程固定但某些步骤不同 | 模板方法 |
| 状态不同导致行为不同 | 状态 |
| 一个对象变化后要通知多个对象 | 观察者 |
| 请求需要多个处理者依次尝试 | 责任链 |
| 操作需要排队、记录、撤销 | 命令 |

## 实操：从代码坏味道识别模式

设计模式最好从真实代码问题里长出来，而不是先想模式再找地方套。下面这些坏味道比较常见。

| 代码现象 | 可能的问题 | 可考虑的模式 |
| --- | --- | --- |
| 一个方法里按 `type` 写了很多 `if else` | 算法或产品类型在变化 | 策略、工厂方法 |
| 构造函数有十几个参数，且很多参数可选 | 对象构建过程不清晰 | 建造者 |
| 调用方为了完成一件事要连续调用很多子系统 | 子系统细节泄漏给外部 | 外观 |
| 每个业务方法都重复写鉴权、日志、缓存 | 横向能力和业务逻辑混在一起 | 代理、装饰器 |
| 老接口和新接口不一致，只能到处写转换代码 | 兼容逻辑散落 | 适配器 |
| 订单、工单、连接等状态越加越多 | 状态分支侵入主类 | 状态 |
| 请求要经过多个校验、过滤、审批节点 | 处理流程可插拔 | 责任链 |
| 一个事件发生后要通知多个模块 | 一对多依赖需要解耦 | 观察者 |

### 示例一：支付分支演进为策略

一开始直接写分支很正常：

```java
public class PayService {
    public void pay(String type, Order order) {
        if ("alipay".equals(type)) {
            // 支付宝支付
        } else if ("wechat".equals(type)) {
            // 微信支付
        } else if ("bank".equals(type)) {
            // 银行卡支付
        } else {
            throw new IllegalArgumentException("不支持的支付方式");
        }
    }
}
```

当支付方式频繁增加时，这段代码的问题会变明显：每加一种支付都要改 `PayService`，测试也要覆盖旧分支。可以把每种支付拆成策略：

```java
public interface PayStrategy {
    String type();
    void pay(Order order);
}

public class AlipayStrategy implements PayStrategy {
    public String type() {
        return "alipay";
    }

    public void pay(Order order) {
        // 支付宝支付
    }
}

public class PayService {
    private final Map<String, PayStrategy> strategies;

    public PayService(List<PayStrategy> strategyList) {
        this.strategies = strategyList.stream()
                .collect(Collectors.toMap(PayStrategy::type, strategy -> strategy));
    }

    public void pay(String type, Order order) {
        PayStrategy strategy = strategies.get(type);
        if (strategy == null) {
            throw new IllegalArgumentException("不支持的支付方式");
        }
        strategy.pay(order);
    }
}
```

判断是否值得这样改的标准很简单：支付方式是否经常增加、每种支付逻辑是否足够独立、调用方是否只关心“支付”而不关心具体算法。如果答案都是肯定的，策略模式收益明显。

### 示例二：导出流程演进为模板方法

导出 Excel、CSV、PDF 的流程可能类似：查询数据、转换字段、写文件、上传存储。不同格式只是中间步骤不同。

```java
public abstract class ExportTemplate {
    public final String export(ExportRequest request) {
        List<Row> rows = queryData(request);
        byte[] content = render(rows);
        String url = upload(content);
        recordLog(request, url);
        return url;
    }

    protected abstract List<Row> queryData(ExportRequest request);

    protected abstract byte[] render(List<Row> rows);

    protected String upload(byte[] content) {
        // 上传到文件存储
        return "file-url";
    }

    protected void recordLog(ExportRequest request, String url) {
        // 记录导出日志
    }
}
```

模板方法适合“流程顺序不能乱，但部分步骤会变化”的场景。它的风险是继承关系会变重，所以流程不稳定时不要急着用。

### 示例三：接口兼容演进为适配器

系统内部希望统一发送短信：

```java
public interface SmsSender {
    void send(String phone, String content);
}
```

第三方 SDK 的接口却不同：

```java
public class VendorSmsClient {
    public void pushMessage(String mobile, String templateCode, Map<String, Object> params) {
        // 调用短信厂商
    }
}
```

不要让业务代码到处知道厂商接口，可以加适配器：

```java
public class VendorSmsAdapter implements SmsSender {
    private final VendorSmsClient client;

    public VendorSmsAdapter(VendorSmsClient client) {
        this.client = client;
    }

    public void send(String phone, String content) {
        Map<String, Object> params = Map.of("content", content);
        client.pushMessage(phone, "DEFAULT_TEMPLATE", params);
    }
}
```

适配器的收益在于：未来更换短信厂商时，业务代码仍然依赖 `SmsSender`，只替换适配层即可。

## 模式之间的区别

很多模式看起来相似，实际关注点不同。

### 策略、状态、模板方法

| 模式 | 变化点 | 关键区别 |
| --- | --- | --- |
| 策略 | 算法本身 | 调用方通常主动选择策略 |
| 状态 | 对象内部状态 | 状态改变后行为自然改变 |
| 模板方法 | 流程中的部分步骤 | 骨架由父类控制，子类覆盖步骤 |

### 适配器、装饰器、代理、外观

| 模式 | 主要目的 | 是否改变接口 |
| --- | --- | --- |
| 适配器 | 让不兼容接口协作 | 通常改变 |
| 装饰器 | 动态增加职责 | 通常保持一致 |
| 代理 | 控制访问真实对象 | 通常保持一致 |
| 外观 | 简化复杂子系统入口 | 提供更粗粒度接口 |

### 工厂方法、抽象工厂、建造者

| 模式 | 适合对象 | 关注点 |
| --- | --- | --- |
| 工厂方法 | 单类产品族扩展 | 谁来创建具体产品 |
| 抽象工厂 | 多个相关产品族 | 一组产品的一致创建 |
| 建造者 | 单个复杂对象 | 构建步骤和表示分离 |

## 常见误用

### 为了模式而模式

如果一个 `if else` 很稳定、分支很少、业务也很清晰，直接写条件判断可能比引入一堆接口更好。

### 抽象过早

变化点还没有出现时，过早抽象会让代码读起来像在猜未来。可以先保持简单，等重复和变化变清晰后再抽象。

### 单例滥用

单例容易变成隐藏的全局状态。它会影响测试、并发和模块边界。配置、连接池、线程池可以考虑单例，但业务对象通常不应随意单例化。

### 继承层次过深

很多模式可以用组合实现，不必构造复杂继承树。继承适合稳定的“是一个”关系，组合更适合灵活的“拥有某种能力”。

### 模式名字代替设计解释

说“这里用了策略模式”还不够，还要说明为什么算法会变化、策略如何被选择、扩展点在哪里。

## 学习路线

建议按下面顺序学习：

1. 先理解设计原则：单一职责、开闭原则、依赖倒置、组合复用。
2. 再学最常用模式：工厂方法、建造者、适配器、装饰器、代理、策略、观察者、责任链、状态。
3. 结合框架源码理解：Spring、JDK 集合、Servlet、日志框架、消息系统里都有大量模式思想。
4. 最后再看较抽象的模式：访问者、解释器、享元、桥接。

学习设计模式最有效的方式不是背定义，而是识别变化点：哪里经常变，哪里应该稳定，哪里需要隔离。

## 实践建议

- 先写出清楚的直接代码，再根据变化点抽象。
- 模式命名要服务沟通，不要遮蔽业务含义。
- 接口不要一次设计得过大，保持职责小而稳定。
- 优先组合，谨慎继承。
- 对具体模式保留简单示例和真实业务场景。
- 重构时引入模式比一开始强行套模式更自然。

设计模式的真正价值，是让系统在变化中仍然保持可理解、可修改、可验证。
