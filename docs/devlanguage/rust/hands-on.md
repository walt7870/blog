# Rust 动手入门

做一个订单金额CLI：接收数量和单价分，成功只向stdout输出金额，失败向stderr输出原因并返回非零退出码。这个范围足以练习模块、领域类型、参数、测试与交付，不需要先引入Web框架。

![订单CLI从参数到退出码的处理](/rust/cli-contract.svg)

## 创建工程与核心库

先确认 `rustc --version`、`cargo --version`，然后创建：

```bash
cargo new order-cli --edition 2024
cd order-cli
```

把[类型系统](./type-system.md)中的 `Quantity`、`OrderError`、`total_cents` 和测试放进 `src/lib.rs`。Cargo会把连字符包名 `order-cli` 对应为代码里的 `order_cli` 库名。核心库只计算，不读命令行、不打印、不退出进程。

## 写入口与错误合同

替换 `src/main.rs`：

```rust
use order_cli::{Quantity, total_cents};
use std::process::ExitCode;

fn run() -> Result<u64, String> {
    let mut args = std::env::args_os().skip(1);
    let quantity = args.next().ok_or("用法：order-cli <数量1..99> <单价分>")?;
    let price = args.next().ok_or("缺少单价分")?;
    if args.next().is_some() { return Err("参数过多".into()); }
    let quantity = quantity.to_str().ok_or("数量必须是UTF-8文本")?;
    let price = price.to_str().ok_or("单价必须是UTF-8文本")?;
    let quantity = Quantity::parse(quantity).map_err(|_| "数量必须在1到99之间")?;
    let price: u64 = price.parse().map_err(|_| "单价必须是非负整数分")?;
    total_cents(price, quantity).map_err(|_| "金额溢出".into())
}

fn main() -> ExitCode {
    match run() {
        Ok(total) => { println!("{total}"); ExitCode::SUCCESS }
        Err(error) => { eprintln!("{error}"); ExitCode::from(2) }
    }
}
```

这里允许零单价，不允许数量零；退出码2表示使用或输入错误。`args_os` 避免操作系统参数无法表示为UTF-8时直接panic，再在需要数字的边界显式拒绝。参数解析库如clap适合更复杂选项，但不替代领域校验。

## 跑通正常和错误路径

```bash
cargo test
cargo run -- 2 1990
cargo run -- 0 1990
cargo run -- 2 18446744073709551615
cargo build --release --locked
./target/release/order-cli 2 1990
```

正常输出为 `3980`；零数量、溢出应没有成功结果，并返回2。Cargo本身也有错误码，最终验收应直接运行二进制，而不只检查 `cargo run` 的输出。单价文本支持Rust整数解析的语法；如果业务只允许ASCII数字，应另加相应格式校验。

## 验证实际进程行为

在 `tests/cli.rs` 写集成测试，Cargo会为测试提供本包二进制路径：

```rust
use std::process::Command;

#[test]
fn output_and_exit_contract() {
    let bin = env!("CARGO_BIN_EXE_order-cli");
    let good = Command::new(bin).args(["2", "1990"]).output().unwrap();
    assert!(good.status.success());
    assert_eq!(good.stdout, b"3980\n");
    assert!(good.stderr.is_empty());
    for args in [vec![], vec!["0", "1990"], vec!["2", "18446744073709551615"],
                 vec!["two", "1990"], vec!["2", "1990", "extra"]] {
        let bad = Command::new(bin).args(args).output().unwrap();
        assert_eq!(bad.status.code(), Some(2));
        assert!(bad.stdout.is_empty());
        assert!(!bad.stderr.is_empty());
    }
}
```

单元测试验证金额规则，进程测试验证参数、输出和退出码，二者覆盖不同合同。再运行 `cargo fmt`、`cargo clippy --all-targets -- -D warnings` 和 `cargo test`。换平台交付时还要实机运行；本机release成功不能证明Linux运行库或目标CPU兼容。

## 下一步

给工具加CSV输入前，先定义文件大小、编码、非法行、输出覆盖与部分成功策略。给它加HTTP入口时保留核心库，只新增协议适配，见[项目实战](./project-practice.md)。遇到编译失败按[排错手册](./troubleshooting.md)先复现最小问题，不通过大量克隆掩盖数据归属。
