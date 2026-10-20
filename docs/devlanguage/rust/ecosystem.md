# Rust 生态与运行边界

选Rust库时，先看程序运行在哪里、谁提供I/O与调度、依赖哪些系统组件。Web服务、CLI、浏览器WASM和MCU共享语言基础，但不能直接互换运行环境。

![Rust不同目标的运行环境与外部依赖](/rust/ecosystem-boundaries.svg)

## Cargo与依赖合同

Cargo负责解析、构建和测试，crates.io是常用公共仓库，也支持Git、路径和私有registry。包数量或下载量只能作为线索，仍需核对最近维护、许可证、MSRV、目标平台、feature和安全公告。

下面是配置片段，具体程序还需使用对应API：

```toml
[dependencies]
serde = { version = "1", features = ["derive"] }
tokio = { version = "1", features = ["rt-multi-thread", "macros", "sync", "time"] }
```

Serde提供序列化框架，JSON还需`serde_json`等格式库。Tokio功能由feature启用；不必为所有程序默认`full`。应用保留锁文件并验证实际解析版本，不能凭`version = "1"`认为一年后会安装相同依赖图。

## 服务端与CLI

| 需求 | 常见选择 | 需要验证的边界 |
| --- | --- | --- |
| HTTP服务 | Axum/Tower/Tokio或Actix Web | 运行时、超时、背压、错误和关闭 |
| HTTP调用 | reqwest | TLS后端、代理、连接复用与响应状态 |
| 配置与JSON | Serde、serde_json、toml | 字段校验、缺失与规模限制 |
| CLI | clap、anyhow | 参数、退出码、标准输出/错误和路径 |
| 数据库 | sqlx、Diesel、SeaORM | 驱动、迁移、事务和连接池 |
| 结构化日志 | tracing与subscriber | 请求标识、敏感信息、异步跨度 |

例如订单API并不只需选一个Web框架，还要定义库存冲突如何返回、数据库池耗尽如何拒绝、外部调用超时后谁取消工作。sqlx的编译期查询宏通常需要可用数据库或正确的离线元数据，`cargo check`在开发机通过不能证明干净CI也具备这些输入。

## WASM、嵌入式与FFI

浏览器WASM可用`wasm-bindgen/web-sys`连接JS与Web API，不自动拥有桌面文件、线程或原生套接字。主机与WASM之间的数据复制也有成本；只有计算收益超过交互开销时，迁移热点才有意义。

MCU可用`no_std`配合PAC、HAL、Embassy或RTIC。`no_std`意味着不链接完整标准库，不意味着无需启动代码、链接脚本或永远不使用堆；如采用`alloc`仍需提供分配器。具体外设、芯片版本、探针与硬件时序必须按板级验证。

跨语言组件常用PyO3/maturin、napi-rs或C ABI。Rust对象不能直接以未稳定布局跨边界传递，应定义长度、编码、所有权、释放函数和线程要求；panic、异常和错误码也需按ABI设计处理，不能假设跨语言自动传播。

## 采用与验收

先用最小项目在目标环境跑通构建、I/O、错误和退出，查看`cargo tree -e features`确认依赖范围。再用真实规模的数据验证性能和内存，并保留原方案对照。GUI、数据科学、厂商SDK等领域应逐项核对具体能力，不以“Rust生态成熟”代替判断。

不要在常规构建中自动升级全部crate或执行未经审查的工具安装。`build.rs`与过程宏会在构建机执行，Rust安全代码的内存模型不能限制它们访问构建机资源。工程治理见[工具链](./tooling.md)，原生与异步调度见[并发与运行时](./concurrency.md)。
