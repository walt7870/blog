# Rust 视频学习系列

本页保留系列章节索引，配套文章可按下表直接阅读。尚未提供逐集视频链接，因此不以此表表示视频已发布；视频动态可在[个人主页](/profile/)的B站入口查看。

![Rust按交付能力推进的学习路线](/rust/learning-delivery-route.svg)

## 学习顺序

| 章节 | 主题 | 配套阅读 |
| --- | --- | --- |
| 01 | Rust 为什么值得系统学习 | [Rust 概览](./index.md)、[发展历程](./history.md)、[核心优势](./advantages.md) |
| 02 | Rust 工具链与第一个工程 | [工具链与工程实践](./tooling.md)、[基础概念](./basic.md) |
| 03 | 所有权、借用与生命周期 | [所有权与借用](./ownership.md) |
| 04 | 类型系统、枚举与模式匹配 | [类型系统与错误处理](./type-system.md) |
| 05 | 错误处理与健壮 API | [类型系统与错误处理](./type-system.md) |
| 06 | 集合、字符串、迭代器 | [基础概念](./basic.md) |
| 07 | 模块、crate 与 workspace | [工具链与工程实践](./tooling.md) |
| 08 | Trait、泛型与抽象设计 | [类型系统与错误处理](./type-system.md) |
| 09 | 并发模型 | [并发与异步](./concurrency.md) |
| 10 | Async Rust 与 Tokio | [并发与异步](./concurrency.md)、[生态系统](./ecosystem.md) |
| 11 | Unsafe 与 FFI | [生态系统](./ecosystem.md) |
| 12 | Web 服务开发 | [生态系统](./ecosystem.md) |
| 13 | 数据访问与配置 | [生态系统](./ecosystem.md) |
| 14 | 测试、性能与可观测性 | [工具链与工程实践](./tooling.md) |
| 15 | 宏与代码生成 | [基础概念](./basic.md) |
| 16 | WASM、桌面、游戏和嵌入式 | [生态系统](./ecosystem.md) |
| 17 | 生产选型与迁移策略 | [学习路线与选型](./learning-path.md) |
| 18 | 从入门到精通路线图 | [学习路线与选型](./learning-path.md) |
| 19 | 从安装到第一个可运行项目 | [动手入门路径](./hands-on.md)、[工具链与工程实践](./tooling.md) |
| 20 | Rust 基础语法跟写练习 | [动手入门路径](./hands-on.md)、[基础概念](./basic.md) |
| 21 | 所有权报错排查实战 | [排错手册](./troubleshooting.md)、[所有权与借用](./ownership.md) |
| 22 | CLI 小项目实战 | [项目实战路线](./project-practice.md)、[工具链与工程实践](./tooling.md) |
| 23 | Cargo 依赖与工程排错 | [排错手册](./troubleshooting.md)、[工具链与工程实践](./tooling.md) |
| 24 | 测试、调试与质量闭环 | [项目实战路线](./project-practice.md)、[工具链与工程实践](./tooling.md) |
| 25 | Axum 小服务实战 | [项目实战路线](./project-practice.md)、[生态系统](./ecosystem.md) |
| 26 | 从学习到项目落地的检查清单 | [项目实战路线](./project-practice.md)、[学习路线与选型](./learning-path.md) |

## 推荐阅读路径

初学者可以按三轮推进：

1. 先读 01-03，理解 Rust 为什么强调所有权和借用。
2. 再读 04-14，把类型系统、错误处理、并发、异步、测试和工程工具串起来。
3. 最后读 19-26，动手完成一个 CLI 和一个小 Web 服务，把知识落到可运行项目里。

已经有其他语言经验的开发者，可以先读 01、02、03、05、07、09、10、14、17，再进入 19-26 的实操补齐。

## 学习闭环

只读概念还不够，Rust 最关键的是把编译器反馈变成日常开发节奏：

- 用 `cargo check` 高频检查类型和借用问题。
- 用 `cargo test` 固化核心行为。
- 用 `cargo clippy --all-targets` 提前发现质量问题。
- 用 `README`、文档测试和示例代码保持项目可交接。
- 用小项目验证依赖、配置、日志、错误处理和发布流程。

完成每组章节后运行对应例子，记录编译反馈、测试断言和错误输出，再进入下一组。工具链与目标环境按工程页的支持范围验证。
