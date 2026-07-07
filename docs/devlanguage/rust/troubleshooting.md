# Rust 排错手册

Rust 的很多错误不是运行时才暴露，而是在编译期就被拦下来。入门时会觉得编译器“严格”，但真实工程里，这些提示是在帮项目提前收口风险。

## 排错顺序

遇到问题时不要直接修改一堆代码。建议按固定顺序走：

1. 先运行 `cargo check`，得到最小反馈。
2. 从第一条错误开始看，后面的错误可能是连锁反应。
3. 看错误里的 `note`、`help` 和代码位置。
4. 判断问题属于所有权、借用、生命周期、类型不匹配、依赖还是 feature。
5. 做最小修改，再重新运行 `cargo check`。

Rust 编译器提示通常比较长，但关键信息一般在这几类句子里：

- `value borrowed here after move`
- `cannot borrow ... as mutable`
- `does not live long enough`
- `mismatched types`
- `the trait bound ... is not satisfied`
- `failed to select a version`

## moved value

典型问题：

```rust
let name = String::from("Rust");
let other = name;
println!("{name}");
```

`String` 不是 `Copy` 类型，赋值给 `other` 后所有权移动，`name` 不能继续使用。

常见修法：

- 只是读取：传 `&name`。
- 确实需要两份数据：显式 `clone()`。
- 函数需要拿走所有权：调用后不要再使用原变量。

优先问清楚“谁拥有这份数据”，不要一看到错误就无脑 `clone`。

## borrow 冲突

典型问题：

```rust
let mut names = vec![String::from("a")];
let first = &names[0];
names.push(String::from("b"));
println!("{first}");
```

这里不可变借用 `first` 还在使用，不能同时对 `names` 做可变修改。因为 `push` 可能导致底层内存重新分配，旧引用可能失效。

常见修法：

- 缩短引用生命周期。
- 先用完引用，再修改集合。
- 提前取出需要的数据副本。
- 重构函数，让读和写分成两个阶段。

## lifetime 问题

生命周期错误通常不是要求手写复杂标注，而是说明返回的引用可能比数据活得更久。

错误示例：

```rust
fn make_ref() -> &str {
    let text = String::from("hello");
    &text
}
```

`text` 在函数结束时释放，不能返回指向它的引用。常见修法是返回拥有值：

```rust
fn make_text() -> String {
    String::from("hello")
}
```

生命周期标注不是延长数据寿命，它只是描述引用之间的关系。

## unwrap 不是通用修复

`unwrap()` 适合示例、测试或确认不会失败的临时脚本，不适合作为业务错误处理默认方案。

更稳的写法：

```rust
fn load_config(path: &str) -> Result<String, std::io::Error> {
    std::fs::read_to_string(path)
}
```

应用层可以用 `anyhow` 附加上下文：

```rust
use anyhow::{Context, Result};

fn load_config(path: &str) -> Result<String> {
    std::fs::read_to_string(path)
        .with_context(|| format!("failed to read config: {path}"))
}
```

库代码更适合定义清晰错误类型，应用入口负责打印和退出。

## Cargo 依赖问题

依赖相关问题先看 `Cargo.toml`，再看解析结果：

```bash
cargo tree
cargo tree -d
cargo metadata --format-version 1
```

常见原因：

- 两个依赖要求不兼容版本。
- feature 组合启用了额外依赖。
- `dev-dependencies` 和 `dependencies` 边界混乱。
- workspace 中不同 crate 使用了不同版本声明。
- lockfile 固定了旧版本。

升级时建议小步提交：

```bash
cargo update -p crate_name
cargo test
cargo clippy --all-targets --all-features
```

不要一次性大范围更新后再排查，问题定位会变困难。

## feature 排查

feature 是编译期能力开关，不是运行时配置。排查时先确认项目实际启用了哪些 feature：

```bash
cargo tree -e features
cargo test --all-features
cargo test --no-default-features
```

设计 feature 时要克制：

- 默认 feature 不要太重。
- 可选依赖要显式。
- 关键组合要进入 CI。
- 对外库要写清楚每个 feature 的作用和代价。

## CI 失败排查

本地通过、CI 失败时，优先比较环境：

- Rust 工具链版本是否一致。
- 是否安装了相同 target 和组件。
- 是否启用了相同 feature。
- 是否依赖系统库。
- 是否存在路径、大小写、换行符差异。

建议项目固定这些检查：

```bash
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test --all-targets --all-features
```

如果历史项目 warning 很多，可以先不启用 `-D warnings`，逐步收敛。

## 排错心法

Rust 排错的关键不是记住所有错误码，而是形成判断路径：

| 现象 | 优先判断 |
| --- | --- |
| 值不能继续用 | 是否发生所有权移动 |
| 不能同时修改 | 是否存在未结束的借用 |
| 引用活得不够久 | 是否返回了局部数据引用 |
| `?` 不能用 | 函数返回类型是否是 `Result` 或 `Option` |
| Trait 不满足 | 泛型约束、引用层级或 feature 是否缺失 |
| 依赖冲突 | 版本范围、lockfile、feature 是否不一致 |

先定位类别，再做最小修复。这个习惯比记忆零散技巧更重要。
