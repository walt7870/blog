# 工具链与工程实践

Rust 的工程体验很大程度来自统一工具链。对团队来说，Rust 的价值不只是语言安全，也包括构建、测试、格式化、静态检查、文档和发布流程的一致性。

## rustup

`rustup` 用于安装和管理 Rust 工具链：

```bash
rustup update
rustup default stable
rustup toolchain install nightly
```

常见用途：

- 切换 stable、beta、nightly。
- 安装交叉编译目标。
- 安装 rustfmt、Clippy 等组件。
- 为项目固定工具链。

项目可以用 `rust-toolchain.toml` 固定版本：

```toml
[toolchain]
channel = "stable"
components = ["rustfmt", "clippy"]
```

## Cargo 常用命令

```bash
cargo new hello-rust
cargo build
cargo run
cargo test
cargo check
cargo fmt
cargo clippy
cargo doc --open
```

常见命令含义：

| 命令 | 用途 |
| --- | --- |
| `cargo check` | 快速类型检查，不生成最终二进制 |
| `cargo build` | 编译项目 |
| `cargo run` | 编译并运行 |
| `cargo test` | 运行测试 |
| `cargo fmt` | 格式化代码 |
| `cargo clippy` | 静态检查 |
| `cargo doc` | 生成文档 |

开发中应优先频繁运行 `cargo check`，它比完整构建更快。

## Cargo.toml

`Cargo.toml` 是 Rust 项目的清单文件：

```toml
[package]
name = "hello-rust"
version = "0.1.0"
edition = "2024"

[dependencies]
serde = { version = "1", features = ["derive"] }
```

依赖版本采用语义化版本规则。Rust 生态通常把公共 API 兼容性看得比较重，但生产项目仍应结合 lockfile、审计和 CI 控制升级风险。

## Cargo.lock

`Cargo.lock` 记录精确依赖版本。

- 应用项目通常提交 `Cargo.lock`。
- 库项目是否提交取决于团队策略，但发布到 crates.io 时不会强制下游使用你的 lockfile。

提交 lockfile 可以提高构建可复现性。

## Workspace

大型项目通常使用 workspace 管理多个 crate：

```toml
[workspace]
members = [
    "crates/api",
    "crates/core",
    "crates/cli",
]
resolver = "2"
```

优势：

- 共享 lockfile。
- 统一构建和测试。
- 拆分模块边界。
- 多个可执行文件和库协同开发。

## rustfmt

`rustfmt` 负责统一格式：

```bash
cargo fmt
```

团队不应在格式上花太多讨论。让自动格式化成为提交前和 CI 的固定步骤。

## Clippy

Clippy 是 Rust 官方 lint 工具：

```bash
cargo clippy --all-targets --all-features
```

它能发现很多可读性、性能和潜在错误问题。常见 CI 配置会把 warning 当作失败：

```bash
cargo clippy --all-targets --all-features -- -D warnings
```

但对历史项目要谨慎启用 `-D warnings`，避免一次性引入大量无关修改。

## 测试

Rust 支持单元测试、集成测试和文档测试。

单元测试通常写在同一文件：

```rust
pub fn add(left: i32, right: i32) -> i32 {
    left + right
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_two_numbers() {
        assert_eq!(add(1, 2), 3);
    }
}
```

集成测试放在 `tests/` 目录：

```text
tests/
└── api_test.rs
```

文档测试写在注释示例中，`cargo test` 会自动运行：

```rust
/// Adds two numbers.
///
/// ```
/// assert_eq!(my_crate::add(1, 2), 3);
/// ```
pub fn add(left: i32, right: i32) -> i32 {
    left + right
}
```

## 文档

Rust 文档注释使用 `///`：

```rust
/// User account in the system.
pub struct User {
    /// Unique user id.
    pub id: u64,
}
```

生成文档：

```bash
cargo doc --no-deps --open
```

公共库应重视文档示例，因为示例能被测试，减少文档和真实 API 脱节。

## Feature Flags

Cargo feature 用于条件启用功能：

```toml
[features]
default = ["json"]
json = ["serde_json"]

[dependencies]
serde_json = { version = "1", optional = true }
```

Feature 适合控制可选依赖、平台能力、协议支持。不要滥用 feature 表达运行时配置，否则构建矩阵会变复杂。

## Release 构建

默认 debug 构建偏向编译速度和调试体验，release 构建开启优化：

```bash
cargo build --release
```

可以在 `Cargo.toml` 中配置 profile：

```toml
[profile.release]
lto = true
codegen-units = 1
strip = true
```

这些选项可能提升运行性能或减小体积，但会增加编译时间，需结合项目目标选择。

## 安全与供应链

Rust 项目也要关注依赖安全。常用工具包括：

- `cargo audit`：检查已知安全漏洞。
- `cargo deny`：检查许可证、重复依赖、漏洞和来源。
- `cargo vet`：供应链审查流程。

基础设施项目尤其应把依赖审计纳入 CI。

## CI 建议

一个常见 Rust CI 至少包含：

```bash
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test --all-features
cargo build --release
```

如果项目支持多个平台，还应加入 Linux、macOS、Windows 或目标架构矩阵。

## 工程实践建议

- 应用项目提交 `Cargo.lock`。
- 提交前运行 `cargo fmt` 和 `cargo clippy`。
- 模块边界优先用可见性控制，而不是约定。
- 对公共 API 写文档和示例。
- 对核心逻辑使用单元测试，对外部行为使用集成测试。
- 不要过早拆太多 crate，小项目先保持简单。

## 参考资料

- rustup：https://rustup.rs/
- Cargo Book：https://doc.rust-lang.org/cargo/
- rustfmt：https://github.com/rust-lang/rustfmt
- Clippy：https://doc.rust-lang.org/clippy/
- Rustdoc：https://doc.rust-lang.org/rustdoc/
