# 策略模式

策略（Strategy）把同一目标的不同算法放在共同接口后面，由调用方或选择器决定使用哪一种。普通客户与会员都要计算手续费，但费率不同；费用服务可以保留校验、选择、返回报价的流程，把计算规则交给策略。

![费用策略的逐请求选择与版本边界](/design-pattern/patterns/strategy.svg)

## 先判断变化是否属于同一个合同

原本的 `if (plan.equals("normal")) ... else if (...)` 并不天然有问题。只有规则需要独立维护、测试或配置，且都能遵守同一个输入输出合同时，拆成策略才有收益。两个稳定费率用一张配置表就能表达，也无需为每个费率创建一个类。

同一个接口不代表任意替换都正确。费用策略应约定金额单位、币种、取整、适用客户和错误行为；一种实现返回“分”，另一种返回“元”，编译虽通过，业务已经错误。支付、退款、发货则是不同请求，不能只因为都叫 `execute()` 就视为一个算法族。

以人民币手续费为例，100.01 元按普通费率 1% 计算，原始结果是 1.0001 元；约定按分四舍五入后得到 1.00 元。会员费率 0.5% 得到 0.50 元。选错费率、先按元截断再转换、使用 `double`，都会让同一笔输入得到不同账目。

## 选择器与算法分别承担什么

选择器处理“这个请求用哪个规则”，策略处理“给定输入如何计算”。把一串条件藏进工厂只是移动了选择逻辑，并没有消灭业务判断。新增算法通常不改调用流程，但仍要注册入口、配置适用范围并验证冲突。

共享服务宜在每次调用中选择局部策略引用。若把当前策略放在单例的可变字段，再先调用 `setStrategy()`、后调用 `calculate()`，两个请求可能互相覆盖。无状态策略可以共享；含会话、连接、缓冲区或用户数据的实现必须另行定义生命周期。

下面是完整的内存费用演示。金额单位为人民币分，费率单位为基点，100 个基点等于 1%；只做非负手续费报价，不扣款、不处理真实支付账户。保存为 `StrategyDemo.java`，使用 Java 17+ 编译运行：

```java
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

public class StrategyDemo {
    @FunctionalInterface
    interface FeePolicy {
        long feeFen(long amountFen);
    }

    record Quote(String version, String plan, long feeFen) {}

    static FeePolicy rate(int basisPoints) {
        if (basisPoints < 0 || basisPoints > 10000) {
            throw new IllegalArgumentException("费率须在0到10000基点之间");
        }
        return amountFen -> BigDecimal.valueOf(amountFen)
                .multiply(BigDecimal.valueOf(basisPoints))
                .divide(BigDecimal.valueOf(10000), 0, RoundingMode.HALF_UP)
                .longValueExact();
    }

    static final class FeeService {
        private final String version;
        private final Map<String, FeePolicy> policies;

        FeeService(String version, Map<String, FeePolicy> policies) {
            if (version == null || version.isBlank()) {
                throw new IllegalArgumentException("规则版本不能为空");
            }
            this.version = version;
            this.policies = Map.copyOf(policies);
        }

        Quote quote(String plan, long amountFen) {
            if (amountFen < 0) throw new IllegalArgumentException("金额不能为负");
            if (plan == null) throw new IllegalArgumentException("客户方案不能为空");
            FeePolicy policy = policies.get(plan);
            if (policy == null) throw new IllegalArgumentException("不支持的客户方案");
            long fee = policy.feeFen(amountFen);
            if (fee < 0 || fee > amountFen) {
                throw new IllegalStateException("费用不符合非负且不超过本金的合同");
            }
            return new Quote(version, plan, fee);
        }
    }

    public static void main(String[] args) {
        FeeService service = new FeeService("fee-v1",
                Map.of("normal", rate(100), "vip", rate(50)));
        if (service.quote("normal", 10001).feeFen() != 100
                || service.quote("vip", 10001).feeFen() != 50
                || service.quote("normal", 50).feeFen() != 1
                || service.quote("vip", 0).feeFen() != 0
                || service.quote("normal", Long.MAX_VALUE).feeFen()
                    != 92233720368547758L) {
            throw new AssertionError("费率、取整或大金额计算错误");
        }
        expectRejected(() -> service.quote("unknown", 10001));
        expectRejected(() -> service.quote("normal", -1));
        System.out.println(service.quote("normal", 10001));
        System.out.println(service.quote("vip", 10001));
    }

    static void expectRejected(Runnable action) {
        try {
            action.run();
            throw new AssertionError("应当拒绝非法输入");
        } catch (IllegalArgumentException expected) {
            System.out.println(expected.getMessage());
        }
    }
}
```

简单费率通过同一个函数构造策略，无须两个只有常数不同的类。以后若增加封顶费率，可以新增实现，但仍须遵守金额与失败合同。`Map.copyOf()` 只冻结映射结构，不会把其中有状态的策略自动变成线程安全对象。

## 默认策略、版本与切换

未知客户类型不应默认享受最低费率；认证、计费、合规等关键规则一般应明确拒绝。确有兼容默认值时，需要在协议中规定，并能从日志看出默认分支被使用。重试也不能随机换一个计算算法来掩盖输入错误。

运行中更新规则时，可以发布不可变的新选择器，由一次请求持有同一个版本。订单还应保存实际使用的规则版本、必要输入和计算结果，以便结算或争议复核；当前配置已更新，不代表历史账目应重新用新费率解释。本例的 `version` 仅随报价返回，没有实现存储或动态配置发布。

缓存费用结果时，键至少要覆盖影响结果的输入、规则版本及业务隔离范围，缓存还要有容量与失效策略。使用两个并发 Map 分别存值和时间戳并不能保证一致更新。切换有状态缓存实现也不等于完成数据迁移，需要定义旧数据和在途请求如何处理。

## 与其他模式的分工

| 问题 | 合适的表达 | 边界 |
| --- | --- | --- |
| 同一输入采用不同算法 | 策略 | 调用方或选择器决定适用规则 |
| 当前状态决定能否执行、执行后如何迁移 | [状态](./state) | 关注合法迁移；并非只能由状态对象自动切换 |
| 固定步骤中开放局部变化 | [模板方法](./template-method) | 可在某一步再调用策略 |
| 将请求保存、排队或交给其他执行者 | [命令](./command) | 撤销与可靠执行需额外实现 |
| 多个检查依次通过或短路 | [责任链](./chain-of-responsibility) | 连续执行全部校验不等于选择一个策略 |

压缩算法也可用策略表达，但存储结果必须保留编码格式或版本，不能用“当前策略”盲目解压旧数据。ZIP需要完成目录尾部写入后再取字节；真实流关闭与压缩往返可参见[装饰器](../structural/decorator)。排序选择也必须考虑稳定性、数据分布、内存和实际测量，不能用数组长度阈值宣称某实现一定最快。

## 失败与验收

为每个策略使用相同的合同用例，再加入各自边界：零值、负值、取整临界、大金额、未知类型和版本更新。检查选择器是否实际命中了期望实现，不能只验证“返回了一个数字”。对共享服务，用交错或并发请求确认没有可变的当前策略污染。

观察耗时和失败率时要带策略标识与版本，监控自身失败不能把已完成的业务误记为失败并触发重复操作。若改为异步执行，还要明确线程池归属、取消、超时和关闭；这些不是增加一个 `CompletableFuture` 返回值就自动具备的能力。
