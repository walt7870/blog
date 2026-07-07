# Rust 动手入门路径

Rust 入门不要只停在语法阅读。更稳的方式是从工具链开始，做一个能运行、能测试、能排错的小项目，让 `cargo`、编译器提示和项目结构先进入日常节奏。

## 环境准备

安装 Rust 后先确认三个命令：

```bash
rustc --version
cargo --version
rustup show
```

`rustc` 是编译器，`cargo` 负责项目创建、构建、测试和依赖管理，`rustup` 负责安装和切换工具链。初学阶段建议使用 stable channel：

```bash
rustup default stable
rustup component add rustfmt clippy
```

项目里可以增加 `rust-toolchain.toml`，让团队环境一致：

```toml
[toolchain]
channel = "stable"
components = ["rustfmt", "clippy"]
```

## 第一个项目

创建项目：

```bash
cargo new hello-rust
cd hello-rust
cargo run
```

生成结构通常是：

```text
hello-rust/
├── Cargo.toml
└── src/
    └── main.rs
```

`Cargo.toml` 描述包名、版本、edition 和依赖；`src/main.rs` 是二进制程序入口。第一次不要急着加框架，先确认 `cargo run` 能稳定跑起来。

## 每天都要用的命令

| 命令 | 使用时机 |
| --- | --- |
| `cargo check` | 写代码过程中高频运行，快速发现类型和借用错误 |
| `cargo run` | 需要看到程序真实输出时运行 |
| `cargo test` | 写完函数或修 bug 后验证行为 |
| `cargo fmt` | 提交前统一格式 |
| `cargo clippy` | 提交前做静态检查 |
| `cargo doc --open` | 查看本项目文档和依赖文档 |

初学者最容易忽略 `cargo check`。它不生成最终二进制，反馈通常比完整构建更快，适合边写边看编译器提示。

## 基础语法跟写

可以用一个小函数串起变量、函数、结构体、枚举和错误处理：

```rust
#[derive(Debug)]
struct User {
    id: u64,
    name: String,
}

enum UserStatus {
    Active,
    Disabled,
}

fn format_user(user: &User, status: UserStatus) -> String {
    let label = match status {
        UserStatus::Active => "active",
        UserStatus::Disabled => "disabled",
    };

    format!("{}:{}:{}", user.id, user.name, label)
}

fn main() {
    let user = User {
        id: 1,
        name: String::from("rustacean"),
    };

    println!("{}", format_user(&user, UserStatus::Active));
}
```

这里要观察三个点：

- `String` 是拥有堆内存的字符串，传参时要考虑移动还是借用。
- `&user` 表示借用，函数使用完后 `main` 里仍然可以继续访问 `user`。
- `match` 会检查枚举分支是否覆盖完整。

## 错误处理入口

读取文件可以练习 `Result` 和 `?`：

```rust
use std::fs;
use std::io;

fn read_config(path: &str) -> Result<String, io::Error> {
    let content = fs::read_to_string(path)?;
    Ok(content)
}
```

`?` 的含义不是“忽略错误”，而是把错误返回给上层。能在本层处理的错误就在本层处理；需要调用方决策的错误，使用 `Result` 返回。

## 一个小练习

完成一个 `mini-grep`：

1. 接收两个参数：关键词和文件路径。
2. 读取文件内容。
3. 找出包含关键词的行。
4. 对找不到文件、参数缺失给出清晰错误。
5. 给核心搜索函数写单元测试。

项目结构可以先保持简单：

```text
mini-grep/
├── Cargo.toml
├── README.md
└── src/
    ├── lib.rs
    └── main.rs
```

把搜索逻辑放在 `lib.rs`，命令行参数和输出放在 `main.rs`。这样核心逻辑可以测试，入口逻辑保持薄。

## 入门合格标准

学完这一阶段，应能独立做到：

- 能创建项目并解释 `Cargo.toml`、`src/main.rs` 的作用。
- 能读懂常见编译错误的大意。
- 能区分移动、借用和克隆。
- 能写一个返回 `Result` 的函数。
- 能写基础单元测试。
- 能用 `cargo fmt`、`cargo clippy`、`cargo test` 做提交前检查。

如果这些还不熟，先不要急着进入 async、宏或 unsafe。Rust 前期越把基础动作练稳，后面越不容易被复杂概念拖住。
