# 依赖倒置原则

依赖倒置原则强调：高层模块不应该依赖低层模块，二者都应该依赖抽象；抽象不应该依赖细节，细节应该依赖抽象。

![依赖倒置原则示意图](/design-pattern/principles/dip.svg)

## 历史脉络

依赖倒置原则在 SOLID 原则体系中被广泛传播。它直接影响了依赖注入、端口与适配器、分层架构、插件化架构等工程实践。

## 准确理解

高层模块是业务策略，例如订单创建、支付确认、库存预占。低层模块是实现细节，例如数据库、短信 SDK、Redis、文件系统、HTTP 客户端。

如果业务策略直接依赖具体 SDK，细节变化会反向影响业务。依赖倒置的做法是让业务依赖一个稳定抽象，具体实现去适配这个抽象。

## 代码坏味道

- 业务服务里直接出现第三方 SDK 类型。
- 单元测试必须启动数据库、Redis、消息队列才能跑。
- 更换短信、存储、支付厂商时要改核心业务类。
- 高层模块中充满连接配置、协议字段、外部错误码转换。

## 重构示例

问题代码：

```java
public class OrderService {
    private final AliyunSmsClient smsClient;

    public void create(Order order) {
        // 创建订单
        smsClient.sendSms(order.getPhone(), "ORDER_CREATED");
    }
}
```

倒置依赖：

```java
public interface OrderMessagePort {
    void sendOrderCreated(Order order);
}

public class OrderService {
    private final OrderMessagePort messagePort;

    public void create(Order order) {
        // 创建订单
        messagePort.sendOrderCreated(order);
    }
}

public class AliyunSmsAdapter implements OrderMessagePort {
    private final AliyunSmsClient smsClient;

    public void sendOrderCreated(Order order) {
        smsClient.sendSms(order.getPhone(), "ORDER_CREATED");
    }
}
```

业务只依赖 `OrderMessagePort`，短信厂商细节被放到适配器里。

## 落地步骤

1. 从业务服务中找出外部依赖类型。
2. 根据业务意图定义接口，不要照搬 SDK 方法名。
3. 让业务类依赖接口。
4. 用适配器把外部 SDK 转成内部接口。
5. 测试时用内存实现或 mock 实现替换真实外部服务。

## 常见误区

- 接口按技术实现命名，例如 `RedisService`，导致抽象仍然泄漏细节。
- 每个类都抽接口，反而增加不必要跳转。
- 抽象粒度太细，把外部 SDK 的每个方法都复制一遍。
- 只写接口，不做依赖注入和测试替换，收益有限。

## 判断标准

更换外部实现时，业务核心代码是否不用改；单元测试是否能不启动外部基础设施。如果可以，依赖倒置就落到了实处。
