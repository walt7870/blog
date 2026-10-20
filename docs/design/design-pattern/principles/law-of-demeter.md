# 迪米特法则

迪米特法则也叫最少知识原则：对象应通过稳定的直接协作者完成任务，减少对其他对象内部结构的了解。它源于 Demeter 项目中的对象设计实践，目标是缩小内部结构变化对外部的影响。

![配送标签生成前后的对象知识边界](/design-pattern/principles/lod.svg)

## 调用链暴露了什么

生成配送标签时，外部服务可能先取订单的客户，再取客户的地址，最后拼接省、市、街道。问题不在点号数量，而在于它了解了客户的内部模型，并把“客户当前地址”误当成“这笔订单的配送地址”。

订单创建后，配送地址通常需要保留当时的快照。客户后来修改常用地址，不应悄悄改变已经确认的订单。将标签生成交给持有地址快照的订单对象，可以同时收敛知识边界与业务含义。

## 示例

下面是可独立编译的 Java 17+ 示例。地址类型本身只读，不将内部可变对象暴露给调用者。

```java
import java.util.Objects;

record ShippingAddress(String province, String city, String street) {
    ShippingAddress {
        Objects.requireNonNull(province);
        Objects.requireNonNull(city);
        Objects.requireNonNull(street);
    }

    String label() {
        return province + city + street;
    }
}

record Order(ShippingAddress shippingAddress) {
    Order {
        Objects.requireNonNull(shippingAddress);
    }

    String deliveryLabel() {
        return shippingAddress.label();
    }
}

class DeliveryService {
    String labelFor(Order order) {
        return order.deliveryLabel();
    }
}
```

调用方只表达“生成这笔订单的配送标签”。地址从三个字段改成行政区编码与详细地址后，外部调用仍可保持不变。示例不涉及打印协议、隐私遮盖和地址校验；这些要求应在相应边界处理，不能靠封装方法自动获得。

## 如何收敛知识边界

先定位反复出现的链式访问，再问调用方真正想完成什么。若多个调用者都在解析同一内部结构，把这项意图放到拥有数据的对象或稳定服务入口。外部查询需要结构化数据时，可以提供只读快照，不必强迫所有查询都变成命令。

流式 API 的 `stream().filter().map()` 没有穿透业务内部结构；只读 DTO 的遍历也未必需要封装。相反，哪怕只有一次 getter，如果返回了可随意修改的内部集合，也可能泄露不变量。判断依据是结构变化和修改权限，不是点号计数。

## 验收与边界

测试订单创建后的地址快照不随客户地址变化，检查缺少地址时的失败方式，再验证内部字段调整不要求修改所有标签调用方。不要为了少写 getter 建立大量无语义的转发方法，也不要把订单、钱包、支付状态简单串成一个 `order.pay()` 就当作事务已经解决；跨对象一致性仍需要明确事务与协调机制。
