# Rust 基础概念

Rust 的语法表面看起来接近 C、C++、JavaScript、Swift 等现代语言，但它的底层思维更强调“值的归属”和“编译期约束”。入门时不需要一次掌握所有细节，先建立语言基本形状即可。

## 程序入口

Rust 程序从 `main` 函数开始：

```rust
fn main() {
    println!("Hello, Rust!");
}
```

`println!` 后面的感叹号表示它是一个宏。宏可以在编译期展开代码，常用于格式化输出、派生实现、声明路由等场景。

## 变量与可变性

Rust 默认变量不可变：

```rust
let name = "Rust";
// name = "Go"; // 编译错误

let mut count = 1;
count += 1;
```

默认不可变不是为了制造麻烦，而是为了减少大型程序中“谁改了这个值”的不确定性。只有确实需要改变时才写 `mut`。

## 基本类型

常见标量类型：

| 类型 | 示例 | 说明 |
| --- | --- | --- |
| 整数 | `i32`、`u64`、`usize` | 有符号、无符号、平台相关大小 |
| 浮点数 | `f32`、`f64` | 默认常用 `f64` |
| 布尔 | `bool` | `true` 或 `false` |
| 字符 | `char` | Unicode 标量值，不等同于 1 字节 |

复合类型：

```rust
let pair: (i32, &str) = (1, "one");
let numbers: [i32; 3] = [1, 2, 3];
```

Rust 类型通常可以推断，但在函数签名、公共 API 和复杂泛型场景下，明确类型会让代码更清晰。

## 函数

```rust
fn add(left: i32, right: i32) -> i32 {
    left + right
}
```

Rust 中没有分号的最后一行表达式会作为返回值。下面两种写法等价：

```rust
fn add(left: i32, right: i32) -> i32 {
    return left + right;
}

fn add_short(left: i32, right: i32) -> i32 {
    left + right
}
```

## 表达式与语句

Rust 是表达式导向语言，`if`、`match`、代码块都可以产生值：

```rust
let level = 8;
let label = if level >= 10 { "high" } else { "normal" };
```

这会让很多逻辑可以写得更直接，但要求每个分支返回兼容的类型。

## 控制流

### if

```rust
let score = 90;

if score >= 90 {
    println!("excellent");
} else if score >= 60 {
    println!("passed");
} else {
    println!("failed");
}
```

### loop、while、for

```rust
let mut count = 0;

loop {
    count += 1;
    if count == 3 {
        break;
    }
}

while count < 5 {
    count += 1;
}

for item in [1, 2, 3] {
    println!("{item}");
}
```

`for` 循环通常配合集合、迭代器使用，是 Rust 中最常见的遍历方式。

## 结构体

结构体用于组织相关数据：

```rust
struct User {
    id: u64,
    name: String,
    active: bool,
}

fn main() {
    let user = User {
        id: 1,
        name: String::from("Alice"),
        active: true,
    };

    println!("{}", user.name);
}
```

可以用 `impl` 为结构体定义方法：

```rust
impl User {
    fn is_active(&self) -> bool {
        self.active
    }
}
```

`&self` 表示方法只借用当前对象，不取得所有权。

## 枚举

Rust 的枚举比很多语言更强，可以携带数据：

```rust
enum Command {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
}
```

这让枚举非常适合表达“有限状态集合”，例如协议消息、业务状态、错误类型、语法树节点。

## 模式匹配

`match` 要求穷尽所有可能情况：

```rust
fn handle(command: Command) {
    match command {
        Command::Quit => println!("quit"),
        Command::Move { x, y } => println!("move to {x}, {y}"),
        Command::Write(text) => println!("write {text}"),
    }
}
```

穷尽检查可以避免新增状态后遗漏处理逻辑。对复杂系统来说，这是 Rust 类型系统带来的重要收益。

## Option

Rust 没有空指针作为默认值，而是用 `Option<T>` 表达“可能有，也可能没有”：

```rust
fn find_name(id: u64) -> Option<String> {
    if id == 1 {
        Some(String::from("Alice"))
    } else {
        None
    }
}
```

使用时必须处理两种情况：

```rust
match find_name(1) {
    Some(name) => println!("{name}"),
    None => println!("not found"),
}
```

这避免了大量运行时空值错误。

## Result

可恢复错误通常用 `Result<T, E>`：

```rust
use std::fs;

fn read_config() -> Result<String, std::io::Error> {
    fs::read_to_string("config.toml")
}
```

调用方可以用 `?` 快速传播错误：

```rust
fn load() -> Result<String, std::io::Error> {
    let content = fs::read_to_string("config.toml")?;
    Ok(content)
}
```

`?` 的含义是：成功则取出值，失败则提前返回错误。

## 模块系统

Rust 用模块组织代码：

```rust
mod user {
    pub struct User {
        pub name: String,
    }
}

fn main() {
    let user = user::User {
        name: String::from("Alice"),
    };
}
```

默认私有，显式 `pub` 才公开。这种设计鼓励模块边界清晰。

## 包、Crate 与模块

几个概念容易混淆：

| 概念 | 说明 |
| --- | --- |
| Package | 一个包含 `Cargo.toml` 的工程包 |
| Crate | 编译单元，可以是库或可执行文件 |
| Module | 代码内部的命名空间 |
| Workspace | 多个 Package 的工程集合 |

一个典型 Rust 项目结构：

```text
my-app/
├── Cargo.toml
└── src/
    ├── main.rs
    └── lib.rs
```

## 入门阶段最重要的习惯

- 默认使用不可变变量，确实需要修改时再加 `mut`。
- 不急着到处使用引用，先理解值的移动和借用。
- 优先用 `Result` 和 `Option` 表达失败和缺失。
- 多用 `match` 把状态处理完整。
- 遇到编译错误先读错误信息，Rust 编译器通常会给出可操作建议。

## 参考资料

- The Rust Programming Language：https://doc.rust-lang.org/book/
- Rust by Example：https://doc.rust-lang.org/rust-by-example/
- Rust Reference：https://doc.rust-lang.org/reference/
