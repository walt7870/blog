# Rust 生态系统

Rust 生态的特点是官方工具链强、核心库质量高、不同领域发展不均衡。理解生态时不要只看“有没有框架”，还要看项目类型、维护活跃度、团队经验和长期兼容性。

## Cargo 与 crates.io

Cargo 是 Rust 的工程中心，负责：

- 创建项目。
- 编译构建。
- 管理依赖。
- 运行测试。
- 生成文档。
- 发布 crate。
- 管理 workspace。

crates.io 是官方包仓库。大多数 Rust 依赖都通过 Cargo 从 crates.io 获取。

```toml
[dependencies]
serde = { version = "1", features = ["derive"] }
tokio = { version = "1", features = ["full"] }
```

## 基础常用库

| 领域 | 常见库 | 说明 |
| --- | --- | --- |
| 序列化 | Serde | JSON、YAML、TOML、MessagePack 等生态核心 |
| 异步运行时 | Tokio | 网络服务、异步任务、定时器、I/O |
| HTTP 客户端 | reqwest | 高层 HTTP 客户端 |
| Web 框架 | Axum、Actix Web、Rocket | 后端服务和 API |
| 日志与追踪 | tracing、log | 结构化日志、链路追踪基础 |
| 错误处理 | thiserror、anyhow | 库错误和应用错误常用组合 |
| CLI | clap | 命令行参数解析 |
| 数据库 | sqlx、Diesel、SeaORM | SQL、ORM、异步数据库访问 |

这些库经常构成 Rust 应用的基础骨架。

## Web 后端生态

Rust Web 后端不是最“省代码”的方向，但适合高性能、高可靠、低资源占用的服务。

常见组合：

- Axum + Tokio + tower：现代异步服务栈。
- Actix Web：成熟高性能 Web 框架。
- Rocket：偏声明式和易用性。
- reqwest：调用外部 HTTP 服务。
- sqlx：异步 SQL，支持编译期或运行期校验。
- tracing：结构化日志和请求追踪。

适用场景：

- API 网关、代理、边缘服务。
- 高吞吐内部服务。
- 安全敏感的输入处理服务。
- 需要低内存占用的微服务。

## 命令行工具生态

Rust 非常适合写 CLI：

- 单二进制分发。
- 启动快。
- 跨平台。
- 依赖少。
- 容易处理文件、网络和并发。

常见库：

- `clap`：参数解析。
- `serde`：配置解析。
- `anyhow`：应用层错误处理。
- `indicatif`：进度条。
- `console`：终端样式。
- `ignore`、`walkdir`：文件遍历。

很多现代开发工具用 Rust 编写或重写，原因之一就是 CLI 体验好、分发简单。

## WebAssembly 生态

Rust 是 WebAssembly 重要语言之一，适合把性能敏感逻辑编译到浏览器、边缘运行时或插件沙箱中。

常见工具：

- `wasm-bindgen`：连接 Rust 和 JavaScript。
- `wasm-pack`：打包发布 WASM 模块。
- `web-sys`、`js-sys`：访问 Web API 和 JS 类型。

适用场景：

- 浏览器端图像、音视频、压缩、加密、解析等计算模块。
- 可移植插件系统。
- 边缘计算中的沙箱逻辑。

不适合把普通前端 UI 全部强行改写成 Rust，除非项目目标明确。

## 嵌入式生态

Rust 支持 `no_std`，可以在没有完整标准库的环境中运行。嵌入式 Rust 的价值在于用类型系统减少底层资源访问错误。

常见概念：

- `no_std`：不依赖标准库。
- HAL：硬件抽象层。
- PAC：外设访问 crate。
- RTIC、Embassy：嵌入式并发和异步框架。

适用场景：

- MCU 固件。
- 传感器和工业设备。
- 对安全和可靠性要求高的边缘硬件。

## 系统软件与 Linux

Rust 在系统软件中的应用持续增长，包括：

- 操作系统实验项目。
- 文件系统、网络组件。
- 虚拟化和容器工具。
- 浏览器组件。
- Linux kernel 部分模块开发。

Linux 内核引入 Rust 的重点不是替代 C，而是在可控范围内让部分新代码获得更强的内存安全保障。

## 数据库与基础设施

Rust 在数据库和基础设施领域常见原因：

- 内存占用可控。
- 延迟稳定。
- 并发安全。
- 适合长时间运行。
- 可生成独立二进制。

典型方向：

- 查询引擎。
- 存储引擎。
- 流处理组件。
- 消息系统。
- 代理和网关。
- 可观测性 Agent。

## 跨语言生态

Rust 常被用作其他语言项目的性能模块：

| 上层语言 | 常见桥接方式 |
| --- | --- |
| Python | PyO3、maturin |
| Node.js | Neon、napi-rs |
| Java | JNI、JNA、Panama 相关能力 |
| C/C++ | FFI、cbindgen |
| Web | wasm-bindgen |

这种方式适合渐进引入 Rust，不要求整个系统重写。

## 生态选择标准

选择 Rust crate 时建议看：

- 最近维护是否活跃。
- 下载量和依赖方是否充足。
- 是否有清晰文档和示例。
- 是否使用稳定 Rust。
- issue 和 PR 响应是否健康。
- 是否引入过重依赖。
- 安全公告和许可证是否可接受。

Rust 生态增长快，库选择要保守一些，尤其是基础设施项目。

## Rust 生态的短板

- GUI 框架仍在发展中，成熟度不如传统桌面生态。
- 企业级全家桶不如 Java Spring 生态完整。
- 数据科学生态不如 Python。
- 某些云厂商 SDK 质量和覆盖面不均衡。
- 异步生态强，但也增加了库之间运行时选择的复杂度。

Rust 的生态判断要结合具体领域，不宜泛泛地说“成熟”或“不成熟”。

## 参考资料

- crates.io：https://crates.io/
- Cargo Book：https://doc.rust-lang.org/cargo/
- Tokio：https://tokio.rs/
- Serde：https://serde.rs/
- Rust and WebAssembly：https://rustwasm.github.io/docs/book/
- Embedded Rust Book：https://docs.rust-embedded.org/book/
- Rust for Linux：https://rust-for-linux.com/
