# Rust 项目实战路线

熟悉 Rust 不能只靠看语法。一个比较完整的练习路径，是先做 CLI，再做小服务，最后把测试、日志、配置、发布和依赖治理补齐。

## 实战一：CLI 文本过滤工具

CLI 项目适合入门，因为它规模小、反馈快，又能覆盖 Rust 的关键工程动作。

目标能力：

- 解析命令行参数。
- 读取文件。
- 返回清晰错误。
- 把核心逻辑拆到库 crate。
- 写单元测试和集成测试。
- 生成可执行文件。

推荐结构：

```text
mini-grep/
├── Cargo.toml
├── README.md
├── src/
│   ├── lib.rs
│   └── main.rs
└── tests/
    └── cli_test.rs
```

`src/lib.rs` 放搜索逻辑，`src/main.rs` 只负责读取参数、调用逻辑和打印结果。这样核心逻辑不依赖命令行环境，测试更容易写。

可以引入的依赖：

```toml
[dependencies]
clap = { version = "4", features = ["derive"] }
anyhow = "1"
```

应用入口用 `anyhow` 提供上下文，库函数尽量保留明确类型边界。

## 实战二：Cargo 依赖治理

项目变大后，依赖问题会比语法问题更常见。建议把依赖治理作为练习的一部分。

常用命令：

```bash
cargo tree
cargo tree -d
cargo update -p crate_name
cargo outdated
cargo audit
```

核心原则：

- 应用项目提交 `Cargo.lock`，保证构建可复现。
- 升级依赖小步进行，每次升级后跑测试。
- feature 不要滥用，避免测试矩阵失控。
- workspace 里尽量统一关键依赖版本。

如果项目有多个 crate，可以把共享依赖提到 workspace：

```toml
[workspace]
members = ["crates/core", "crates/cli"]
resolver = "2"

[workspace.dependencies]
serde = { version = "1", features = ["derive"] }
anyhow = "1"
```

## 实战三：测试与质量闭环

Rust 项目至少要有四类检查：

```bash
cargo fmt --check
cargo clippy --all-targets --all-features
cargo test --all-targets --all-features
cargo build --release
```

测试分层：

- 单元测试：验证纯函数、状态转换和边界条件。
- 集成测试：验证公开 API 或 CLI 行为。
- 文档测试：保证 README 和公共 API 示例没有过期。
- 性能测试：用 criterion 对热点函数做基准。

一个实用习惯是把“修复 bug”变成“先复现，再补测试，再改代码”。这样项目不会在相同问题上反复回退。

## 实战四：Axum 小服务

Web 服务可以练习 Rust 的异步、状态管理、错误处理和观测能力。

最小依赖：

```toml
[dependencies]
axum = "0.8"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
tracing = "0.1"
tracing-subscriber = "0.3"
```

一个服务通常包含：

- `Router`：组织路由。
- extractor：读取 path、query、json、state。
- state：保存连接池、配置和共享服务。
- error：把内部错误转换成 HTTP 响应。
- tracing：记录请求链路和关键上下文。
- shutdown signal：处理优雅关闭。

示例结构：

```text
rust-api/
├── Cargo.toml
├── src/
│   ├── main.rs
│   ├── route.rs
│   ├── state.rs
│   └── error.rs
└── tests/
    └── api_test.rs
```

初学阶段不要一开始就引入数据库、缓存、消息队列。先把路由、请求解析、响应结构、错误返回和日志跑通。

## 实战五：发布前检查

一个可交付 Rust 小项目，至少应满足：

- `README` 写清楚安装、运行、配置和示例。
- `cargo fmt --check` 通过。
- `cargo clippy --all-targets --all-features` 无明显问题。
- `cargo test --all-targets --all-features` 通过。
- 关键错误路径有清晰提示。
- release 构建可以生成可执行文件。
- 配置、日志、依赖和运行环境边界清楚。

对于 CLI，验证二进制是否能在目标平台运行；对于服务，验证健康检查、优雅关闭、日志字段和错误响应。

## 什么时候进入更深方向

完成 CLI 和小服务后，可以按方向继续：

| 方向 | 深入内容 |
| --- | --- |
| 后端服务 | Tokio、Tower、连接池、数据库、限流、超时、可观测性 |
| 基础设施 | 网络协议、文件系统、性能分析、内存布局、FFI |
| WebAssembly | wasm-bindgen、wasm-pack、前端集成、包体积优化 |
| 嵌入式 | `no_std`、HAL、Embassy、交叉编译、硬件调试 |
| 桌面与工具 | Tauri、egui、跨平台打包、本地资源访问 |

Rust 的学习重点不是把所有方向同时学完，而是先用小项目掌握语言和工具链，再根据真实需求深入一个方向。
