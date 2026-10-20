---
title: 领域驱动设计之聚合根（Aggregate Root）
author: Walt
date: 2024-06-01 10:00:00
---

# 聚合根（Aggregate Root）

订单有订单项、金额和状态。若外部代码能直接向订单项列表塞数据，或者把已提交订单的数量改成负数，就会绕过业务规则。聚合把需要一起保护的对象组织起来，由一个根实体控制修改入口；数据库事务和并发控制负责让这些规则在持久化时仍然成立。

## 一致性边界和修改入口

聚合是一致性边界，聚合根是这个边界对外的修改入口。一个订单可以有多个订单项实体，根仍然只有一个。根的 ID 在约定身份范围内唯一，跨上下文引用时还需明确租户、来源等命名空间，不必为“全宇宙唯一”引入额外机制。

![订单聚合的修改入口与外部商品引用](/architecture/ddd-aggregate-boundary.svg)

实体依靠身份区分，即使字段相同，两个订单项也可能是不同条目。值对象依靠值比较，例如同币种、同数额的金额；不可变只是实现手段，校验和语义也要放在对象中。聚合内部实体的标识可以只在聚合内唯一。

只读查询不必强制经过聚合根加载全部对象，可以使用独立 DTO/SQL，见 [CQRS](../cqrs-architecture)。但查询得到的可变对象不能成为绕过根的修改通道。返回集合时，应使用不可变视图或副本；元素自身也要避免泄漏可变引用。

## 从不变量识别聚合

先问“哪条规则必须在这次提交时成立”，再决定包含哪些对象。例如草稿订单允许增减明细，提交后明细冻结；订单总额等于各行金额之和。订单和明细应一起维护这些规则。

商品目录可以独立变价，但已下单明细应保留成交价格。因此订单项保存商品 ID 和价格快照，不应每次计算都读取商品当前价，也不该把整个商品目录纳入订单事务。库存和付款有独立生命周期，更适合通过明确流程协作。

聚合并非越小越好。拆得过细会使一个简单规则变成跨边界补偿；做得过大则增加锁冲突、加载量和并发更新失败。是否拆分，要看规则和冲突，而不是数据库外键或类数量。

## 一个可运行的内存模型

下面使用 Java 17+ 的 `record` 表达不可变明细，金额用同一币种的最小单位整数，示例约定人民币分。本例不单独追踪某一行，明细作为值对象；需要逐行售后、拆分发货时，可增加聚合内行 ID，按实体管理。`Math.*Exact` 检查溢出；真实业务还需定义币种、折扣、舍入和计价来源。保存为 `OrderExample.java` 后执行 `java OrderExample.java`，可观察正常提交和非法修改被拒绝。

```java
import java.util.ArrayList;
import java.util.List;

public class OrderExample {
    enum Status { DRAFT, SUBMITTED }

    record OrderLine(String productId, long unitPriceMinor, int quantity) {
        OrderLine {
            if (productId == null || productId.isBlank()
                    || unitPriceMinor < 0 || quantity <= 0) {
                throw new IllegalArgumentException("无效订单项");
            }
        }
        long subtotalMinor() {
            return Math.multiplyExact(unitPriceMinor, quantity);
        }
    }

    static final class Order {
        private final String id;
        private final List<OrderLine> lines = new ArrayList<>();
        private Status status = Status.DRAFT;

        Order(String id) {
            if (id == null || id.isBlank()) {
                throw new IllegalArgumentException("订单 ID 不能为空");
            }
            this.id = id;
        }

        void addProduct(String productId, long quotedPriceMinor, int quantity) {
            requireDraft();
            var line = new OrderLine(productId, quotedPriceMinor, quantity);
            Math.addExact(totalMinor(), line.subtotalMinor());
            lines.add(line);
        }

        void submit() {
            requireDraft();
            if (lines.isEmpty()) throw new IllegalStateException("空订单不能提交");
            status = Status.SUBMITTED;
        }

        List<OrderLine> lines() { return List.copyOf(lines); }
        long totalMinor() {
            long total = 0;
            for (var line : lines) total = Math.addExact(total, line.subtotalMinor());
            return total;
        }
        private void requireDraft() {
            if (status != Status.DRAFT) throw new IllegalStateException("订单已冻结");
        }
    }

    public static void main(String[] args) {
        var order = new Order("O-1001");
        order.addProduct("P-01", 2500, 2);
        order.submit();
        System.out.println("总额：" + order.totalMinor() + " 分");
        try {
            order.addProduct("P-02", 1000, 1);
            throw new AssertionError("不应允许修改已提交订单");
        } catch (IllegalStateException expected) {
            System.out.println(expected.getMessage());
        }
        try {
            order.lines().clear();
            throw new AssertionError("不应允许外部清空明细");
        } catch (UnsupportedOperationException expected) {
            System.out.println("外部不能修改明细集合");
        }
    }
}
```

这段模型用累计计算避免总额字段与明细不同步，新增明细前先检查溢出，失败不留下半修改状态。它只演示内存内规则；价格参数必须来自服务端确认的报价，不能直接相信客户端传入金额。

## 聚合不自动提供事务

两个请求可能分别加载订单版本 3。一个提交，另一个仍按草稿修改；即使两个内存对象都调用了正确方法，最后无条件保存也可能覆盖已提交状态。

仓储保存时应配合数据库事务、版本号条件更新或合适的锁。使用乐观锁时，以 `WHERE id = ? AND version = 3` 更新，检查影响行数，再在同一事务保存明细；冲突后重新加载并按最新状态判断，不能无条件重试旧修改。持久化失败时不要继续复用已被内存修改的聚合实例。

外部支付、库存等系统不能因为被模型引用就加入本地原子事务。跨边界需定义幂等、重试、补偿或人工处理，具体见 [订单支付实践](./practice)。领域事件描述已发生的事实，可靠投递仍依赖 Outbox 等机制。

## 设计检查

| 检查对象 | 应能回答的问题 | 失败信号 |
| --- | --- | --- |
| 修改入口 | 提交后还能从哪里改订单项？ | 公共 setter、可变集合或 ORM 实体被外部直接持有 |
| 不变量 | 哪个方法保护数量、状态和总额？ | 规则散落在页面、控制器和 SQL，模型只是字段 |
| 并发提交 | 两个请求同时修改时谁失败？ | 保存没有版本条件，也不检查更新行数 |
| 边界规模 | 为何这些对象需要同一事务？ | 只因有外键就把客户、库存、支付全装进订单 |
| 运行边界 | 一个聚合是否一定一个服务？ | 为每个聚合新建独立服务，却没有部署需求 |

聚合是业务一致性边界，微服务是部署与运行边界。订单和退货申请可以作为不同聚合留在同一个上下文，也可以先在模块化单体中维护；服务拆分由独立发布、团队职责和伸缩需求共同决定。
