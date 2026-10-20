# 类型系统、Trait 与错误处理

外部接口可能收到 `"0"`、`"2"` 或 `"two"` 作为购买数量。如果核心计算一直接收字符串，每个调用点都要重新猜测哪些值有效。更稳妥的边界是先解析为私有字段的 `Quantity`，再让核心函数只接收这个领域类型。

![外部输入通过领域类型进入核心计算](/rust/type-validation-boundary.svg)

## 用构造入口维护不变量

下面代码可放进 `src/lib.rs`。数量限制为 1 至 99，金额单位为整数分；校验只表达这条业务规则，不宣称覆盖货币系统的全部需求。

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Quantity(u8);

#[derive(Debug, PartialEq, Eq)]
pub enum OrderError {
    InvalidQuantity,
    AmountOverflow,
}

impl Quantity {
    pub fn parse(input: &str) -> Result<Self, OrderError> {
        let value: u8 = input.parse().map_err(|_| OrderError::InvalidQuantity)?;
        if !(1..=99).contains(&value) {
            return Err(OrderError::InvalidQuantity);
        }
        Ok(Self(value))
    }

    pub fn get(self) -> u8 { self.0 }
}

pub fn total_cents(unit_cents: u64, quantity: Quantity) -> Result<u64, OrderError> {
    unit_cents.checked_mul(u64::from(quantity.get()))
        .ok_or(OrderError::AmountOverflow)
}
```

字段未公开，其他模块不能直接 `Quantity(0)`。模块内部仍必须守住不变量，反序列化、数据库加载和新增构造函数也要经过同一校验。不能只检查字符串里是否有 `@` 就把一个 `Email` 类型称作完整验证；类型保证只与实际构造规则一样强。

## 枚举表达互斥状态

`Pending` 与 `Paid { transaction_id }` 的枚举可避免“已支付但没有流水”的字段组合。穷尽匹配能提醒遗漏状态，但不能自动阻止“已退款再次发货”：合法转换还要由方法、事务条件与幂等键控制。跨进程收到的字符串或 JSON 也必须先解析，静态类型不能证明外部数据可信。

## 泛型与 Trait 的职责

泛型适合相同算法处理不同类型，例如 `fn first<T>(items: &[T]) -> Option<&T>`；Trait 定义类型必须提供的行为。给订单存储定义接口时，先明确需要的行为，再抽象，而不是为每个结构体都配一个同名 Trait。

```rust
trait OrderStore {
    fn total(&self, id: u64) -> Option<u64>;
}

fn lookup<S: OrderStore>(store: &S, id: u64) -> Option<u64> {
    store.total(id)
}
```

这种泛型调用通常单态化。若要在运行时替换实现，可以接收 `&dyn OrderStore`；Trait 必须满足动态兼容要求，调用通常通过虚表间接分发。动态分发不必然分配堆内存，`Box<dyn Trait>` 的装箱和 `&dyn Trait` 的借用是不同选择。

`Debug` 服务调试，`Display` 服务面向人的输出，`From/TryFrom` 区分不失败与可能失败的转换。`Clone` 不保证深复制，`Copy` 不自动保证大对象复制便宜；派生前应确认数据语义，见[所有权](./ownership.md)。

## 缺失、失败与传播

找不到可选优惠券可用 `Option`；输入非法、存储故障通常用 `Result`，保留原因。`?` 提前传播错误，并在兼容时使用 `From` 转换错误类型，不会记录日志或执行补偿。

| 边界 | 处理方式 | 订单例子 |
| --- | --- | --- |
| 核心领域库 | 返回可匹配的错误枚举 | 非法数量与金额溢出分开 |
| CLI入口 | 错误写 stderr 并返回非零退出码 | 脚本不会把失败当成功 |
| HTTP适配 | 转成稳定响应，内部细节进受控日志 | 校验失败与内部故障区别处理 |
| 不变量被破坏 | 根据恢复策略处理 panic | 不把 panic 当普通用户输入错误 |

未处理的 `Result` 默认通常产生 `must_use` 警告，不是必然编译失败；项目可用 lint 策略提高严格度，但 `let _ =` 仍可显式丢弃。审查要确认业务错误得到了处理，不能仅检查有没有警告。

## 验证保证是否真实存在

在同一个库文件追加下面测试后执行 `cargo test`：

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quantity_and_amount_contract() {
        assert_eq!(total_cents(1990, Quantity::parse("2").unwrap()), Ok(3980));
        for input in ["", "0", "100", "-1", "two", "256"] {
            assert_eq!(Quantity::parse(input), Err(OrderError::InvalidQuantity));
        }
        assert_eq!(Quantity::parse("99").unwrap().get(), 99);
        assert_eq!(total_cents(u64::MAX, Quantity::parse("2").unwrap()),
                   Err(OrderError::AmountOverflow));
    }
}
```

再从库外尝试构造 `Quantity(0)`，应编译失败；故意把金额乘法改成加法，正常金额测试应失败。前者验证接口边界，后者验证断言能发现行为退化。完整CLI与错误退出见[动手实践](./hands-on.md)。
