# Flutter 学习路线

这条路线按“能跑起来、能理解原理、能做工程、能上线排错”的顺序组织。每个主题都对应一个学习目标，配套文章补齐概念、命令、结构图、项目实践和排错路径。

![Flutter从页面到工程交付的能力路线](/flutter/app-boundaries.svg)

## 文本学习路线

这里是文章和练习索引，并未提供逐集可播放视频地址。先完成动手页的受控请求与Widget测试，再把同一应用扩展为接口、缓存与发布项目；不能以章节名当作已经完成对应实战。

| 阶段 | 重点 | 对应内容 |
| --- | --- | --- |
| 建立定位 | Flutter 解决什么问题，和 WebView、React Native、原生开发有什么边界 | 01 |
| 跑通工程 | SDK、Dart、项目目录、热重载、pubspec、第一屏 | 02-03、[动手入门路径](./hands-on.md) |
| 理解核心 | Widget/Element/RenderObject、约束布局、状态和生命周期 | 04-06、[核心架构](./architecture.md) |
| 做成应用 | 路由、接口、缓存、动画、插件、平台能力 | 07-11、[项目实战路线](./project-practice.md) |
| 工程化 | 性能、测试、架构分层、组件库、发布和观测 | 12-16、[项目实战路线](./project-practice.md)、[完整项目承接清单](./project-delivery.md) |
| 能排问题 | 依赖、构建、白屏、卡顿、线上异常 | 17、[排错手册](./troubleshooting.md) |
| 形成路线 | 把知识组织成可持续练习路径 | 18 |

推荐顺序是：[Flutter 概览](./index.md) -> [核心架构](./architecture.md) -> [动手入门路径](./hands-on.md) -> [项目实战路线](./project-practice.md) -> [完整项目承接清单](./project-delivery.md) -> [排错手册](./troubleshooting.md)。读完后再回到下面的主题目录，可以检查自己是否已经覆盖了关键知识点。

| 编号 | 主题 | 学习重点 | 配套阅读 |
| --- | --- | --- | --- |
| 01 | Flutter 的定位：为什么它不是套壳 Web | 从框架定位、渲染方式和跨端边界理解 Flutter 适合做什么、不适合做什么。 | [Flutter 概览](./index.md)、[核心架构](./architecture.md) |
| 02 | 环境、Dart 与第一个可运行 App | 跑通 SDK、设备、项目目录、热重载和第一个页面，建立可复现开发链路。 | [动手入门路径](./hands-on.md) |
| 03 | Dart 基础、空安全与异步模型 | 掌握 Dart 语法、空安全、`Future`、`async/await` 和主 isolate 的基本边界。 | [动手入门路径](./hands-on.md) |
| 04 | Widget、Element、RenderObject 三层模型 | 理解 Widget 是配置、Element 管位置和生命周期、RenderObject 负责布局绘制。 | [核心架构](./architecture.md) |
| 05 | 约束布局：Constraints go down, sizes go up | 用父约束、子尺寸、父定位这条规则解释 Row、Column、ListView 的常见布局问题。 | [核心架构](./architecture.md) |
| 06 | 状态、生命周期与重建边界 | 区分局部状态、页面状态、业务状态和持久状态，控制重建范围和资源释放。 | [项目实战路线](./project-practice.md) |
| 07 | 路由、导航、深链与页面组织 | 理解页面栈、参数、登录拦截、深链和返回行为，避免路由散落在业务组件里。 | [项目实战路线](./project-practice.md) |
| 08 | 网络、JSON、错误处理与接口层 | 建立 DTO、业务模型、Repository、错误模型和重试策略，避免页面直接耦合接口。 | [项目实战路线](./project-practice.md) |
| 09 | 本地存储、缓存与离线体验 | 按偏好、token、结构化数据、文件缓存和同步队列区分本地存储方案。 | [项目实战路线](./project-practice.md) |
| 10 | 手势、动画、CustomPainter 与动效系统 | 理解手势命中、动画控制器、自定义绘制和重绘边界，避免动效拖慢页面。 | [核心架构](./architecture.md) |
| 11 | 平台通道、插件、FFI 与原生能力 | 理解 MethodChannel、EventChannel、FFI 和插件配置，处理权限、线程和错误边界。 | [核心架构](./architecture.md)、[排错手册](./troubleshooting.md) |
| 12 | 渲染流水线、性能优化与 DevTools | 区分 build、layout、paint、raster、内存和网络问题，用 DevTools 定位瓶颈。 | [核心架构](./architecture.md)、[排错手册](./troubleshooting.md) |
| 13 | 测试、质量门禁与 CI | 用单元测试、Widget 测试、集成测试和 CI 命令保证项目可持续迭代。 | [项目实战路线](./project-practice.md) |
| 14 | 架构分层、状态管理与可维护项目结构 | 设计 presentation、application、domain、data、core、shared 的职责边界。 | [项目实战路线](./project-practice.md) |
| 15 | 组件库、主题、设计系统与工程规范 | 把颜色、字号、间距、基础组件、业务组件和页面模板沉淀成稳定规范。 | [项目实战路线](./project-practice.md) |
| 16 | 打包发布、签名、多环境与线上观测 | 梳理 dev/test/prod、Android/iOS 签名、版本、崩溃、日志、性能和回滚。 | [项目实战路线](./project-practice.md) |
| 17 | 常见疑难排查：依赖、构建、白屏、卡顿 | 按环境、依赖、构建、运行、布局、网络、性能、发布阶段定位问题。 | [排错手册](./troubleshooting.md) |
| 18 | 从新手到高手的项目路线图 | 把入门、核心、工程和进阶阶段串起来，形成持续练习和项目落地路线。 | [项目实战路线](./project-practice.md)、[完整项目承接清单](./project-delivery.md) |

## 推荐节奏

新手按 01-06 建立基本心智模型，再进入 07-12 补工程能力，最后通过 13-18 把质量、发布和项目路线补齐。

有移动端或前端经验的开发者，可以重点看 01、04、05、06、08、11、12、14、16，再用实战项目验证边界。

## 学完后的自检问题

- 能否说明 Flutter 为什么采用声明式 Widget 和自绘渲染。
- 能否解释 Widget、Element、RenderObject 分别负责什么。
- 能否说清楚父级约束、子级尺寸、父级定位这套布局规则。
- 能否写出包含加载、空数据、成功、失败的页面状态。
- 能否把接口、缓存、错误和页面展示分层处理。
- 能否判断一个平台能力应该用插件、平台通道还是 FFI。
- 能否用 DevTools 区分 build 慢、layout 慢、paint 慢和 raster 慢。
- 能否给一个 Flutter 项目设计测试、发布、日志和崩溃收集链路。
- 能否从需求出发拆出页面、接口、状态、缓存、权限和发布验收项。
