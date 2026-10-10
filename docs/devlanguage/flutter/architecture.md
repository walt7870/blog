# Flutter 核心架构与运行模型

Flutter 的核心不是某个组件，而是一条从 Dart 对象到屏幕像素的链路。理解这条链路，才能解释重建、布局、绘制、卡顿和平台接入。

这页重点回答几个问题：

- 为什么 Flutter 页面是 Widget 组合，而不是直接操作 View。
- 为什么 `setState` 之后不是马上重画整个屏幕。
- 为什么布局错误常常出现 `overflow`、`unbounded height`。
- 为什么性能分析要区分 UI 线程、Raster 线程和平台线程。
- 为什么接入相机、蓝牙、定位、支付时需要关心原生配置。

## 分层模型

| 层级 | 职责 |
| --- | --- |
| 应用层 | 页面、组件、状态、业务流程 |
| Framework | Widget、Element、RenderObject、布局、手势、动画 |
| Engine | 文本、绘制、合成、Dart runtime、平台通道基础 |
| Embedder | 把 Engine 接入 iOS、Android、Web、桌面 |
| 平台层 | 窗口、输入、权限、系统服务、硬件能力 |

应用层代码由业务团队维护，主要写 Widget、状态、服务和路由。Framework 是 Flutter 提供的 Dart 层能力，负责声明式 UI、布局、手势、动画、语义树等。Engine 更靠底层，负责 Dart runtime、文本排版、图形绘制、图层合成和与平台通信。Embedder 是每个平台的接入层，例如 Android、iOS、macOS、Windows、Linux、Web 都有各自的承载方式。

这套分层决定了 Flutter 的优势和成本。优势是上层 UI 可以跨平台保持一致，动画和绘制能力比较完整；成本是平台能力并不会自动消失，权限、签名、原生 SDK、系统版本、插件兼容性仍然要治理。

## Dart 运行时与事件循环

Flutter 应用逻辑运行在 Dart isolate 中。isolate 可以理解为 Dart 的独立执行单元，它有自己的内存空间和事件循环，不与其他 isolate 共享普通对象。默认情况下，应用主 isolate 同时承担 UI 构建、事件处理和普通业务逻辑。

常见异步代码并不等于开启新线程。`Future`、`async`、`await` 让任务在事件循环中排队，适合网络请求、文件读写、定时器和异步回调；如果在主 isolate 中做大量同步计算，仍然会阻塞 UI。

| 场景 | 推荐方式 |
| --- | --- |
| 网络请求、数据库读取、文件 IO | `Future` / `async` / `await` |
| 高频 UI 状态变化 | 控制重建范围，避免同步重活 |
| 图片处理、大 JSON 解析、大量计算 | 放到后台 isolate 或原生侧处理 |
| 与原生 SDK 通信 | Platform Channel、插件或 FFI |

判断是否需要 isolate 的关键不是“代码是不是异步”，而是它会不会长时间占用主 isolate。如果一个 JSON 解析在低端机上会卡住几百毫秒，就应该从架构上把它移出去。

## Widget、Element、RenderObject

| 对象 | 重点 |
| --- | --- |
| Widget | 不可变配置，描述界面想长什么样 |
| Element | Widget 在树上的位置，管理生命周期和 State |
| RenderObject | 负责布局、绘制、命中测试等底层工作 |

`setState` 后并不是直接重画屏幕。框架会标记相关 Element 需要重建，下一帧调用 `build` 生成新的 Widget 配置，再更新 Element 和 RenderObject。

Flutter 同时维护三棵密切相关的树：

| 树 | 特点 | 变化频率 |
| --- | --- | --- |
| Widget Tree | 不可变配置，`build` 会不断产生新对象 | 高频变化 |
| Element Tree | 挂载位置，连接 Widget 和 RenderObject | 尽量复用 |
| RenderObject Tree | 负责布局、绘制和命中测试 | 只在需要时更新 |

Widget 很轻，可以被频繁创建；Element 更像运行时节点，负责判断新旧 Widget 是否可以复用；RenderObject 更接近底层布局和绘制对象，创建和更新成本更高。Flutter 的高效更新依赖这套分工：业务代码不断声明“现在界面应该是什么样”，Framework 尽量复用已有运行时结构，只更新真正受影响的部分。

### Key 为什么重要

默认情况下，Flutter 会根据 Widget 的类型和位置决定能否复用 Element。列表重排、插入、删除时，如果没有合适的 Key，框架可能把状态复用到错误位置。

| Key 类型 | 适合场景 |
| --- | --- |
| `ValueKey(id)` | 列表项有稳定业务 ID |
| `ObjectKey(object)` | 对象身份本身稳定 |
| `UniqueKey()` | 每次都希望强制区分，不适合普通列表复用 |
| `GlobalKey` | 跨树访问 State、表单校验、特殊定位，谨慎使用 |

大多数业务列表使用 `ValueKey` 就够了。`GlobalKey` 能力强，但会增加树移动和查找成本，也容易让组件边界变模糊。

### State 生命周期

`StatefulWidget` 的状态实际保存在 `State` 对象中。常见生命周期顺序如下：

| 方法 | 作用 |
| --- | --- |
| `initState` | 初始化一次，适合创建控制器、订阅流、发起首屏任务 |
| `didChangeDependencies` | 依赖的 inherited 数据变化时触发 |
| `build` | 根据当前状态返回 Widget 配置 |
| `didUpdateWidget` | 父级传入的新 Widget 配置变化时触发 |
| `deactivate` | 节点暂时从树中移除 |
| `dispose` | 永久销毁，释放控制器、订阅、动画等资源 |

`build` 必须保持轻量和纯粹，不适合放耗时计算、网络请求或状态副作用。需要释放的对象必须在 `dispose` 中处理，例如 `TextEditingController`、`AnimationController`、`StreamSubscription`。

## 约束布局

Flutter 布局遵循：

1. 父级向子级下发 Constraints。
2. 子级在约束范围内选择 Size。
3. 父级根据子级 Size 决定 Position。

常见错误：

- `RenderFlex overflow`：Row 或 Column 主轴空间不足。
- `unbounded height`：滚动容器拿到无限高度。
- `Incorrect use of ParentDataWidget`：`Expanded`、`Positioned` 放错父级。

这套规则经常被概括成：Constraints go down, sizes go up, parent sets position。父级先把可用范围交给子级，子级在范围内选择自己的尺寸，最后父级决定子级摆在哪里。

几个常见例子：

| 场景 | 为什么出错 | 常见处理 |
| --- | --- | --- |
| `Row` 里文本太长 | 横向空间有限，文本没有被约束换行或截断 | 用 `Expanded`、`Flexible`、`maxLines`、`overflow` |
| `Column` 里直接放大列表 | 垂直方向没有给列表确定高度 | 用 `Expanded` 包住 `ListView` |
| `SingleChildScrollView` 里放 `Column + Expanded` | 滚动容器给了无限高度，`Expanded` 无法计算剩余空间 | 去掉 `Expanded` 或改用 sliver/list 结构 |
| `Stack` 外使用 `Positioned` | `Positioned` 只能作为 `Stack` 的直接子级 | 调整 Widget 层级 |

布局排错时不要只看报错最后一行。先找到哪个父级给了什么约束，再看哪个子级需要的尺寸超出约束。大多数布局问题都能沿着“父约束 -> 子尺寸 -> 父定位”定位。

## 渲染流水线

一帧通常会经历输入、动画、构建、布局、绘制、合成和栅格化。卡顿可能来自不同阶段：

| 症状 | 可能原因 |
| --- | --- |
| UI 线程忙 | build 过重、同步计算、状态范围过大 |
| Layout 慢 | 深层布局、`shrinkWrap` 大列表、Intrinsic 组件 |
| Paint 慢 | 复杂阴影、模糊、裁剪、自定义绘制 |
| Raster 慢 | 图片过大、图层复杂、GPU 压力 |
| 首屏慢 | 初始化阻塞、资源加载、同步 IO |

优化顺序是先复现，再用 DevTools 测量，再做最小改动，最后回归验证。

更细一点，一帧大致包含：

1. 处理输入、定时器、异步回调。
2. 推进动画，计算当前帧状态。
3. 重建脏 Widget，更新 Element。
4. 对需要布局的 RenderObject 执行 layout。
5. 对需要绘制的 RenderObject 生成绘制指令。
6. 合成图层，交给 Engine。
7. Raster 线程把图层栅格化成像素。
8. 平台把最终结果显示到屏幕。

如果 UI 线程卡住，动画和交互会明显迟滞；如果 Raster 压力大，界面构建看似不慢，但帧还是掉；如果平台线程或原生插件阻塞，可能表现成权限、相机、地图、支付等功能卡顿或回调异常。

## Platform Channel 与插件

Flutter 不能直接访问所有系统能力，需要通过插件或平台通道连接原生世界。常见方式有三类：

| 方式 | 适合场景 |
| --- | --- |
| MethodChannel | Dart 调用原生方法，原生返回结果 |
| EventChannel | 原生持续向 Dart 推送事件，例如传感器、定位 |
| FFI | 调用 C ABI 动态库，适合性能敏感或已有 native library |

插件的本质是把 Dart API、Android 实现、iOS 实现和平台配置打包在一起。使用插件时不要只看 Dart 调用方式，还要检查：

- Android 是否需要权限、`minSdk`、`namespace`、混淆规则。
- iOS 是否需要 `Info.plist` 权限文案、Pod 版本、最低系统版本。
- 插件是否支持目标平台，例如 Web、macOS、Windows。
- 插件是否在后台、冷启动、权限拒绝、系统版本差异下表现稳定。
- 插件异常是否被封装成可处理的业务错误。

平台通道边界要尽量收敛。业务页面不应该到处直接调用原生插件，最好通过服务层封装，例如 `LocationService`、`CameraService`、`PaymentGateway`。这样便于测试、替换插件和统一错误处理。

## 状态与重建边界

Flutter 的状态管理没有唯一答案。关键不是选择哪个库，而是把状态分类清楚：

| 状态类型 | 例子 | 生命周期 |
| --- | --- | --- |
| 局部 UI 状态 | 输入框焦点、开关、动画进度 | 单个组件内 |
| 页面状态 | 列表数据、加载中、错误态、筛选条件 | 页面生命周期内 |
| 业务状态 | 登录用户、购物车、权限、全局配置 | 跨页面共享 |
| 持久状态 | token、本地缓存、用户偏好 | 应用重启后仍存在 |

`setState` 适合局部状态；页面级状态可以用 `ValueNotifier`、`ChangeNotifier`、Riverpod、Bloc 等；持久状态要落到本地存储或数据库。不要为了简单页面引入过重框架，也不要让大型页面靠一个巨大的 `setState` 维护所有东西。

重建优化的基本原则：

- 状态放在离使用处最近的位置。
- 高频变化拆到更小组件。
- 列表项使用稳定 Key。
- 昂贵子树用 `const`、缓存或独立组件降低重建影响。
- 用 DevTools 看真实重建和帧耗时，不凭感觉优化。

## 一句话总结

Flutter 架构的核心是声明式 UI 与自绘渲染。Widget 描述界面，Element 管运行时位置和生命周期，RenderObject 负责布局绘制，Engine 把结果送到平台。理解这条链路后，页面开发、性能优化、插件接入和疑难排查就不再是零散技巧，而是可以顺着同一套模型分析。
