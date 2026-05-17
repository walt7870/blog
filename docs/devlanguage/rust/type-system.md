# 类型系统、Trait 与错误处理

Rust 的类型系统承担了很多工程职责：表达数据结构、限制状态、约束接口、传播错误、保证并发安全。理解类型系统后，Rust 代码会从“编译器很严格”变成“编译器在帮我维护边界”。

## 强类型与类型推断

Rust 是静态强类型语言，但具备类型推断：

```rust
let count = 10;        // 推断为 i32
let size = 10usize;    // 明确为 usize
let name = "Rust";     // &str
```

函数签名必须写清参数和返回类型：

```rust
fn double(value: i32) -> i32 {
    value * 2
}
```

这是有意设计：函数签名是模块之间的契约，不能完全依赖上下文猜测。

## 结构体建模

结构体适合表达实体和值对象：

```rust
struct Money {
    amount: i64,
    currency: String,
}

impl Money {
    fn new(amount: i64, currency: impl Into<String>) -> Self {
        Self {
            amount,
            currency: currency.into(),
        }
    }
}
```

`Self` 表示当前实现块对应的类型。

## 枚举建模

枚举适合表达状态和分支：

```rust
enum PaymentStatus {
    Pending,
    Paid { transaction_id: String },
    Failed { reason: String },
    Refunded,
}
```

相比用字符串或整数状态码，枚举能让编译器检查遗漏分支：

```rust
fn status_label(status: PaymentStatus) -> &'static str {
    match status {
        PaymentStatus::Pending => "pending",
        PaymentStatus::Paid { .. } => "paid",
        PaymentStatus::Failed { .. } => "failed",
        PaymentStatus::Refunded => "refunded",
    }
}
```

## 泛型

泛型用于编写和具体类型无关的代码：

```rust
fn first<T>(items: &[T]) -> Option<&T> {
    items.first()
}
```

Rust 泛型通常在编译期单态化，也就是为实际使用的类型生成对应代码。这样可以获得接近手写具体类型的性能。

## Trait

Trait 定义行为契约，类似“某个类型能做什么”：

```rust
trait Summary {
    fn summarize(&self) -> String;
}

struct Article {
    title: String,
    author: String,
}

impl Summary for Article {
    fn summarize(&self) -> String {
        format!("{} by {}", self.title, self.author)
    }
}
```

Trait 可以作为函数参数约束：

```rust
fn print_summary(item: &impl Summary) {
    println!("{}", item.summarize());
}
```

也可以写成泛型约束：

```rust
fn print_summary<T: Summary>(item: &T) {
    println!("{}", item.summarize());
}
```

## 常见标准库 Trait

| Trait | 用途 |
| --- | --- |
| `Debug` | `{:?}` 调试输出 |
| `Display` | `{}` 用户友好输出 |
| `Clone` | 显式复制 |
| `Copy` | 低成本按位复制 |
| `Default` | 默认值 |
| `PartialEq`、`Eq` | 相等比较 |
| `PartialOrd`、`Ord` | 排序比较 |
| `Iterator` | 迭代器协议 |
| `From`、`Into` | 类型转换 |

很多 Trait 可以通过派生自动实现：

```rust
#[derive(Debug, Clone, PartialEq, Eq)]
struct UserId(u64);
```

## Trait 对象

泛型适合编译期确定类型，Trait 对象适合运行时多态：

```rust
trait Handler {
    fn handle(&self, input: &str);
}

fn run(handler: Box<dyn Handler>) {
    handler.handle("event");
}
```

`dyn Handler` 表示动态分发，会有一次间接调用成本，但能换来更灵活的扩展方式。

## Option：显式表达缺失

`Option<T>` 有两个可能值：

```rust
enum Option<T> {
    Some(T),
    None,
}
```

常见用法：

```rust
let maybe_name = Some("Alice");

if let Some(name) = maybe_name {
    println!("{name}");
}
```

`if let` 适合只关心某一个分支的情况。

## Result：显式表达失败

`Result<T, E>` 有两个可能值：

```rust
enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

示例：

```rust
use std::num::ParseIntError;

fn parse_port(value: &str) -> Result<u16, ParseIntError> {
    value.parse::<u16>()
}
```

调用方可以匹配结果：

```rust
match parse_port("8080") {
    Ok(port) => println!("port = {port}"),
    Err(error) => println!("invalid port: {error}"),
}
```

## ? 运算符

`?` 用于传播错误：

```rust
use std::fs;
use std::io;

fn read_username() -> Result<String, io::Error> {
    let content = fs::read_to_string("user.txt")?;
    Ok(content.trim().to_string())
}
```

如果读取成功，`content` 得到字符串；如果失败，函数直接返回 `Err`。

## panic 与可恢复错误

Rust 区分两类失败：

- 可恢复错误：文件不存在、网络超时、参数非法，通常返回 `Result`。
- 不可恢复错误：程序状态已经违反基本假设，可以使用 `panic!`。

业务代码不应把 `panic!` 当作普通异常系统使用。库代码尤其应该谨慎，因为 `panic!` 会把控制权交给调用方或直接终止程序。

## 类型驱动设计

Rust 很适合把非法状态排除在类型之外：

```rust
struct Email(String);

impl Email {
    fn parse(value: String) -> Result<Self, String> {
        if value.contains('@') {
            Ok(Self(value))
        } else {
            Err(String::from("invalid email"))
        }
    }
}
```

只要外部无法直接构造 `Email`，后续函数就可以相信它已经通过校验。

## 常见实践

- 对业务状态优先使用枚举，而不是字符串常量。
- 对外部输入优先转换成领域类型，再进入核心逻辑。
- 公共函数签名要清楚表达所有权、借用和错误。
- 库代码少用 `unwrap`，应用边界处可以在确定不可恢复时使用。
- Trait 不要过早抽象，先等重复行为稳定出现。

## 参考资料

- Generics：https://doc.rust-lang.org/book/ch10-00-generics.html
- Traits：https://doc.rust-lang.org/book/ch10-02-traits.html
- Error Handling：https://doc.rust-lang.org/book/ch09-00-error-handling.html
