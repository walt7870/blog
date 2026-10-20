# 工具链与工程实践

Cargo统一构建与测试入口，但复现一次构建还需要固定编译器、依赖、feature和系统环境。以订单CLI为例，开发机成功只证明当前环境；CI必须从同一提交与锁文件重建，并验证真实可执行文件。

![Rust固定输入、质量检查与交付链路](/rust/toolchain-gates.svg)

## 固定项目输入

`rustup` 管工具链，`rustc` 编译代码，`cargo` 管项目与依赖。先运行 `rustc --version --verbose`、`cargo --version`、`rustup show active-toolchain`，确认当前实际选择，避免全局默认值掩盖目录覆盖。

项目可在 `rust-toolchain.toml` 指定经团队验证的精确版本。下面固定1.85.0是可复现配置示例，不是推荐长期停留在这个版本：

```toml
[toolchain]
channel = "1.85.0"
profile = "minimal"
components = ["rustfmt", "clippy"]
```

`stable`、`beta`、`nightly` 是会移动的通道；需要Nightly能力时也应评估按日期固定。`edition = "2024"` 是每个crate的语言规则，`rust-version` 是最低支持版本，二者不等于实际编译器版本，见[发展历程](./history.md)。

## 清单、锁文件与依赖

`Cargo.toml` 表达允许的版本范围，`Cargo.lock` 记录解析图；`--locked` 在需要改变锁文件时拒绝执行，不负责冻结系统库、环境变量或远程服务。应用应提交锁文件，库也可为自身CI保留锁文件，但下游不会被强制使用这份解析结果。

```bash
cargo check --locked
cargo tree -e features
cargo tree -d
cargo metadata --locked --format-version 1
```

重复依赖版本不一定是解析失败，需判断API、类型身份和体积影响。依赖的 `build.rs` 与过程宏会在构建机执行，拉取后编译也是执行第三方代码；锁文件和内存安全不能代替构建机隔离与依赖审查。`--frozen` 同时约束锁文件与网络访问，干净缓存下可能直接失败。

## 不同检查分别覆盖什么

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
cargo build --release --locked
cargo doc --workspace --no-deps --locked
```

格式检查只看排版，Clippy补充静态诊断，测试验证断言，release构建验证优化后的链接与产物。把警告升为错误适合已收敛规则的工程；新编译器可能带来新诊断，升级时需要评估。

`cargo test` 默认也运行符合条件的库文档测试；`cargo test --all-targets` 选择目标测试，不包含文档测试。若CI使用后者，应单独运行 `cargo test --doc --locked`。README中的代码不会自动成为文档测试，除非项目明确把它纳入rustdoc输入或另有校验。

## Feature与workspace

Feature是编译期能力组合，通常应设计为可叠加。不能把 `--all-features` 当成覆盖全部组合：互斥后端可能无法同时编译，全部打开也不会验证缺省或单项关闭的路径。按支持合同分别测试默认、无默认与指定组合。

```toml
[workspace]
members = ["crates/core", "crates/cli"]
resolver = "3"

[workspace.dependencies]
serde = { version = "1", features = ["derive"] }
```

这是2024 Edition工程的虚拟workspace片段；resolver3需要支持它的工具链。成员只有声明 `serde.workspace = true` 才继承对应依赖。共享锁文件和目标目录不等于强制所有crate使用同一版本，还应检查实际解析图。

## 发布与供应链

`cargo audit`、`cargo deny`、`cargo vet`、`cargo outdated` 是单独安装的扩展工具，不属于Cargo内置命令。安装前核对来源、版本、所需MSRV和权限，在CI固定工具版本；审计库还需要更新，扫描通过不证明没有未知漏洞。

release默认优化，但不自动成为可跨系统运行的静态二进制。明确目标三元组、CPU、系统库、TLS后端与签名要求，在目标环境验证。LTO、strip、codegen-units等配置应以体积、性能和排错需求测量后选择，不机械复制“最优配置”。完整例子见[动手实践](./hands-on.md)和[项目实战](./project-practice.md)。
