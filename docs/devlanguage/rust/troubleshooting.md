# Rust 排错手册

先判断失败在哪个阶段：解析依赖、编译、链接、运行还是业务断言。订单CLI编译失败与运行后金额错误需要不同证据；删除锁文件或大量添加 `clone` 可能掩盖现象，却没有解释原因。

![Rust错误从阶段到证据和修复的定位路径](/rust/diagnostic-path.svg)

## 从第一条相关诊断定位

先记录完整命令、当前目录、`rustc --version --verbose`、target和feature，再运行 `cargo check --locked`。检查第一条相关错误的位置、`note`、`help`，后续错误可能只是连锁反应。`rustc --explain E0382` 可以解释错误类别，但修复仍取决于当前资源归属。

下面是应失败的最小例子，可保存为 `moved.rs` 后执行 `rustc --edition 2024 moved.rs`：

```rust,compile_fail
fn main() {
    let name = String::from("order-42");
    let job = name;
    println!("{name}");
    drop(job);
}
```

它触发移动后使用。若调用方只读就借用，接管后不再访问则移动，确需独立副本才克隆。修复后还需运行使用该值的行为测试，不能只以编译通过结束。

## 借用冲突与生命周期

`Vec::push` 可能重新分配底层存储；持有元素引用并在修改后继续使用，编译器会拒绝潜在失效访问：

```rust,compile_fail
fn main() {
    let mut names = vec![String::from("order-42")];
    let first = &names[0];
    names.push(String::from("order-43"));
    println!("{first}");
}
```

如果只需先打印再添加，将最后一次引用使用移到 `push` 前；如果必须保留旧名称，明确复制对应字符串。即使当前容量足够，普通借用规则也不会因为开发者猜测“不发生重分配”而消失。

返回局部 `String` 的引用会越过所有者寿命。需要结果独立存活就返回 `String`；借用输入则把输出关系写入签名。生命周期标注不能延长数据寿命，也不应使用泄漏内存作为常规修复。完整正反例见[所有权](./ownership.md)。

## 类型、Trait与异步错误

| 现象 | 需要核对 | 修复后的验证 |
| --- | --- | --- |
| `expected u64, found ()` | 是否多了分号或漏返回分支 | 正常金额与错误分支都测试 |
| `?` 无法使用 | 所在函数的返回类型及错误转换 | 错误是否保留原因并传到边界 |
| Trait未满足 | 实际类型、引用层级、实现和feature | 最小调用及真实调用点 |
| Future不是Send | 跨await保存的值、锁守卫与引用 | 多线程调度和锁范围 |
| 程序卡住 | 阻塞I/O、死锁、通道未关闭 | 超时、关闭与积压场景 |
| panic | backtrace及触发输入 | 将普通输入错误改为Result |

运行期可用 `RUST_BACKTRACE=1 ./target/debug/order-cli ...` 获取panic上下文；没有panic时不会凭空出现调用栈。不要把 `unwrap` 作为普通输入失败的默认处理。

## 依赖与环境

```bash
cargo tree -d
cargo tree -e features
cargo metadata --locked --format-version 1
cargo check --locked --no-default-features
```

先看错误是下载/TLS、版本约束、feature、MSRV还是系统链接库。多个版本可以合法共存；同名类型来自不同crate版本时并不一定兼容。`--locked` 拒绝更新解析图不是网络故障；要升级时在独立变更中定向更新并审查锁文件，而非直接删除它。

CI与本机比较编译器、目标、feature、系统库、环境变量、路径大小写和测试数据。`cargo clean`仅适合验证构建缓存问题，既慢也不能修复不成立的类型或ABI合同。

## 闭环

为失败输入或状态先加能复现的测试，再做最小修复，最后跑原失败命令与对应行为。若使用 `cargo test --all-targets`，还需单独执行文档测试；互斥feature按支持矩阵分组。格式、Clippy、release与目标平台验证见[工具链](./tooling.md)，不要把所有问题都归到“编译器太严格”。
