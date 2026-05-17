# Rust 学习路线与选型建议

Rust 入门最容易的问题是：语法刚会写，就被所有权、生命周期、Trait、异步同时拦住。比较稳的方式是分阶段学习，每一阶段只解决一个主要问题。

## 第一阶段：写得出来

目标：能读懂基本语法，能写简单 CLI 或小工具。

重点内容：

- `let`、`mut`、函数、控制流。
- 基本类型、结构体、枚举。
- `match`、`if let`。
- `Option`、`Result`。
- Cargo 基本命令。

建议练习：

- 写一个文本统计工具。
- 写一个 JSON/TOML 配置读取工具。
- 写一个简单文件批量重命名工具。

这一阶段不要深挖生命周期和宏，先建立手感。

## 第二阶段：理解所有权

目标：遇到 borrow checker 错误能读懂大意，知道该移动、借用还是克隆。

重点内容：

- 所有权移动。
- 不可变借用和可变借用。
- 字符串、切片、集合的所有权。
- 函数参数如何选择 `T`、`&T`、`&mut T`。
- `Clone` 和 `Copy` 的区别。

建议练习：

- 实现一个内存中的任务列表。
- 写一个简单缓存结构。
- 把函数参数从拥有值改成借用值，观察编译器提示。

这一阶段最重要的是少用无脑 `clone`。有些 `clone` 是合理的，但它不应成为逃避所有权模型的默认方式。

## 第三阶段：用类型建模

目标：能用结构体、枚举和 Trait 表达业务边界。

重点内容：

- 枚举携带数据。
- 模式匹配穷尽检查。
- 泛型。
- Trait 和 Trait bound。
- 错误类型设计。
- `From`、`Into`、`TryFrom`。

建议练习：

- 用枚举表达订单状态流转。
- 为不同消息类型实现统一处理 Trait。
- 写一个输入校验模块，把字符串转换成领域类型。

Rust 很适合把非法状态从类型层面排除。不要急着模仿面向对象继承层次，先学会组合结构体、枚举和 Trait。

## 第四阶段：工程化

目标：能维护一个结构清晰的小型 Rust 项目。

重点内容：

- 模块系统和可见性。
- Workspace。
- 测试、文档测试。
- rustfmt、Clippy。
- 日志、配置、错误处理。
- CI 基础流程。

建议练习：

- 写一个带配置文件、日志和测试的 CLI。
- 把核心逻辑拆成库 crate，把命令行入口作为二进制 crate。
- 给公共函数补文档示例，并用 `cargo test` 验证。

## 第五阶段：选择方向

Rust 到中级后应按方向继续深入。

### 后端服务方向

学习内容：

- Tokio。
- Axum 或 Actix Web。
- Serde。
- reqwest。
- sqlx 或 Diesel。
- tracing。
- 超时、限流、连接池、优雅关闭。

练习项目：

- REST API 服务。
- WebSocket 服务。
- 简单任务队列。
- 反向代理或网关。

### 系统与基础设施方向

学习内容：

- `std::fs`、`std::net`、进程管理。
- 内存布局和性能分析。
- unsafe 基础边界。
- FFI。
- 多线程、锁、原子类型。
- Linux 系统调用和平台差异。

练习项目：

- 简单 shell 工具。
- 日志采集 Agent。
- 文件同步工具。
- TCP 代理。

### WebAssembly 方向

学习内容：

- wasm-bindgen。
- wasm-pack。
- JS/Rust 数据交互。
- 浏览器性能边界。
- 包体积优化。

练习项目：

- 图片处理模块。
- Markdown 解析模块。
- 加密或压缩工具。

### 嵌入式方向

学习内容：

- `no_std`。
- HAL/PAC。
- 中断、定时器、外设。
- Embassy 或 RTIC。
- 交叉编译和调试。

练习项目：

- LED 控制。
- 传感器读取。
- 串口通信。
- 简单实时任务调度。

## 不同背景的学习建议

| 背景 | 建议 |
| --- | --- |
| Java/Go 后端 | 重点理解所有权、错误处理、异步运行时，不要照搬 GC 语言对象共享习惯 |
| C/C++ | 重点理解借用检查和安全抽象，减少手动内存管理思维惯性 |
| JavaScript/TypeScript | 重点补齐静态类型、生命周期、并发和系统资源概念 |
| Python | 先从 CLI 和数据处理工具开始，不要一上来挑战复杂异步服务 |
| 嵌入式/C 背景 | 从 `no_std` 前先学标准 Rust，避免同时踩语言和硬件两类坑 |

## 常见误区

- 以为 Rust 必须完全不用 `clone`。
- 以为所有生命周期都要手写。
- 过早使用 `Arc<Mutex<T>>` 共享所有东西。
- 把 `unwrap` 当作业务错误处理。
- 在还没理解同步 Rust 前直接学习 async。
- 为小项目设计过度复杂的 Trait 层次。
- 看到 unsafe 就害怕，或者反过来过早滥用 unsafe。

## 推荐学习顺序

1. Rust Book 前半部分：语法、所有权、结构体、枚举、错误处理。
2. Rust by Example：通过小例子补齐语感。
3. 写一个小 CLI，完整走 Cargo、测试、文档流程。
4. 学习 Trait、泛型、生命周期。
5. 根据方向学习 Tokio、WASM、嵌入式或 FFI。
6. 阅读成熟 crate 源码，学习真实项目组织方式。

## 项目选型建议

适合从 Rust 开始的项目：

- 新的 CLI 工具。
- 高性能网络服务。
- 对内存安全要求高的新模块。
- 可独立部署的 Agent。
- 需要跨平台分发的工具。

适合渐进引入 Rust 的项目：

- Python/Node.js 中的性能热点。
- C/C++ 中安全风险高但边界清晰的模块。
- Java/Go 系统中资源敏感的边缘组件。

不建议一开始就用 Rust 强行重写的项目：

- 业务规则快速变化的后台管理系统。
- 强依赖成熟 Java/Python 框架能力的系统。
- 团队完全没有 Rust 经验且交付周期极短的核心业务。

## 入门项目清单

- `todo-cli`：任务增删改查，练习结构体、文件读写、错误处理。
- `mini-grep`：文本搜索，练习切片、迭代器、命令行参数。
- `config-loader`：读取 TOML/JSON，练习 Serde 和错误传播。
- `http-ping`：批量请求 URL，练习 reqwest 和并发。
- `chat-server`：练习 Tokio、TCP 或 WebSocket。

## 参考资料

- The Rust Programming Language：https://doc.rust-lang.org/book/
- Rust by Example：https://doc.rust-lang.org/rust-by-example/
- Rustlings：https://github.com/rust-lang/rustlings
- Async Book：https://rust-lang.github.io/async-book/
- Embedded Rust Book：https://docs.rust-embedded.org/book/
