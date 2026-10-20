# Rust 基础概念

先用一个订单计算建立语言的基本形状：命令行收到数量字符串，程序把它转换为整数，拒绝零和过大数量，再用整数分计算总价。变量、函数、枚举和错误处理在同一条链路中配合。

![订单数量从字符串到金额的处理过程](/rust/order-input-flow.svg)

## 从输入得到明确结果

把下面内容放进 `cargo new order-basics` 生成的 `src/main.rs`，执行 `cargo run`：

```rust
#[derive(Debug, PartialEq, Eq)]
enum OrderError {
    InvalidQuantity,
    AmountOverflow,
}

fn total_cents(input: &str, unit_cents: u64) -> Result<u64, OrderError> {
    let quantity: u64 = input.parse().map_err(|_| OrderError::InvalidQuantity)?;
    if !(1..=99).contains(&quantity) {
        return Err(OrderError::InvalidQuantity);
    }
    unit_cents.checked_mul(quantity).ok_or(OrderError::AmountOverflow)
}

fn main() {
    match total_cents("2", 1990) {
        Ok(cents) => println!("总价 {cents} 分"),
        Err(error) => eprintln!("计算失败：{error:?}"),
    }
}
```

输出为 `总价 3980 分`。`parse` 负责文本到数字的转换，不接受空串或负数；区间检查负责业务上限。`checked_mul` 将溢出转换为 `None`，再用 `ok_or` 变成领域错误，不依赖不同构建配置下普通乘法的溢出行为。整数分适合这里的固定最小货币单位；汇率、税率、舍入与多币种还要另建规则。

`Result<u64, OrderError>` 表示成功得到整数金额，失败得到可枚举的原因。`?` 在成功时取出值，在错误时提前返回；它没有吞掉错误，也不会自动重试。`println!` 与 `eprintln!` 的感叹号表示宏，分别写标准输出和标准错误。

## 变量、类型与表达式

`let` 默认不可重新赋值，确实需要更新才写 `mut`。例如累计行数可以可变，原始单价通常保持不可变。不可变绑定不等于底层对象永远不能变化：内部可变性另见[所有权](./ownership.md)。

```rust
let unit_cents: u64 = 1990;
let mut quantity = 1u64;
quantity += 1;
let label = if quantity > 1 { "多件" } else { "单件" };
println!("{label}，单价 {unit_cents} 分");
```

函数末尾不带分号的表达式可作为返回值，`if`、`match` 和代码块也能产生值，各分支必须满足相容的类型。加分号会把表达式语句的结果丢弃，函数可能因此得到 `()` 而不是预期金额。

| 数据 | 适合的类型 | 需要注意 |
| --- | --- | --- |
| 金额、标识 | `u64` 或有校验的领域类型 | 不把所有数字都默认当 `i32` |
| 内存索引、集合长度 | `usize` | 位宽随目标平台变化 |
| 数值计算 | `f32`、`f64` | 浮点舍入不适合直接表达该例的分 |
| UTF-8 文本 | `String`、`&str` | 字节长度与字符数量不同 |
| 固定数组、可增长集合 | `[T; N]`、`Vec<T>` | 数组长度是类型的一部分 |

`char` 是 Unicode 标量值，既不等于一个字节，也不一定是一个用户眼中的完整字符。`"订单".len()` 是 UTF-8 字节数，不能直接拿它当显示宽度；字符串不能用整数下标随意截取字符。

## 用结构体与枚举组织业务

结构体聚合同时存在的字段，枚举描述互斥的情况。`Paid { transaction_id }` 把支付流水和已支付状态放在同一个分支，避免“状态已支付但忘填流水”的松散组合。

```rust
enum Payment {
    Pending,
    Paid { transaction_id: String },
    Failed { reason: String },
}

struct Order {
    id: u64,
    payment: Payment,
}

impl Order {
    fn is_paid(&self) -> bool {
        matches!(&self.payment, Payment::Paid { .. })
    }
}
```

`&self` 借用订单，不消费它。`match` 应穷尽分支；如果始终使用 `_` 吞掉其他情况，后续新增状态也可能不再触发遗漏提醒。具体领域校验与 Trait 见[类型系统](./type-system.md)。

## 遍历、缺失与失败

`for item in &items` 借用集合，`for item in items` 通常消费集合。`Option<T>` 表达正常的缺失，例如没有第二行；`Result<T, E>` 表达需要说明原因的失败，例如第二行数量非法。二者不要机械互换，否则排错时只剩“没有结果”。

```rust
let rows = ["2", "0", "three"];
for row in &rows {
    match total_cents(row, 1990) {
        Ok(total) => println!("{row}: {total}"),
        Err(error) => eprintln!("{row}: {error:?}"),
    }
}
assert_eq!(rows.get(3), None);
```

这是逐行处理的示例，不是事务：一行失败不会撤销前面已打印的行，更不会撤销真实数据库中的变更。批处理需要另定“全部拒绝”还是“部分成功”的合同。

## 代码放在哪里

Package 由 `Cargo.toml` 描述；crate 是编译单元；module 是 crate 内的命名与可见性边界；workspace 管理多个 package。一个 package 可以同时有 `src/lib.rs` 库 crate 和 `src/main.rs` 二进制 crate，也可有多个二进制目标。

入门项目把计算放进库，把参数、输出与退出码放进入口。`pub` 只公开确实需要的接口，字段保持私有以便集中校验。后续在[动手实践](./hands-on.md)完成命令行闭环，在[工程工具](./tooling.md)了解构建、测试和锁文件。
