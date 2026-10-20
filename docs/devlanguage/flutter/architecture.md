# Flutter 核心架构与运行模型

理解Flutter时，可沿两条链路阅读：一条是状态变化如何更新屏幕，另一条是数据或平台结果如何回到当前页面。把两者混在一起，常会出现重复请求、状态错位和页面销毁后仍更新的问题。

![Flutter配置、运行时节点与屏幕更新关系](/flutter/render-lifecycle.svg)

## 配置与运行时对象

Widget描述不可变配置，Element保存树中的运行时关系，State与有状态Element关联；RenderObject执行布局、绘制与命中测试。并非每个Widget都直接对应RenderObject，组合组件可以只是构造其他Widget。

同一匹配位置能否更新现有Element，关键比较Widget的 `runtimeType` 与 `key`。列表重排时，稳定的 `ValueKey(task.id)` 帮助把状态与业务对象对齐；每次build生成 `UniqueKey()` 则会破坏原本应保留的身份。Key只在相应父级的匹配范围内有意义，不能当全局数据库主键。

`const` 可复用不变配置、减少部分更新工作，但不是“子树从此永不重建或绘制”的保证。继承依赖、约束和动画仍可能触发对应工作，应按实际性能轨迹判断。

## 一次状态变化

`setState` 的回调同步执行，回调内应只做状态赋值，不能声明为async。随后标记相关Element需要重建，在帧处理时调用build，并按变化更新运行时节点。只有需要布局或绘制的部分继续进入对应阶段，build次数不直接等于重绘次数。

| 阶段 | 关注对象 | 待办例子 |
| --- | --- | --- |
| 事件与状态 | 回调、页面状态 | 点击重试后替换已有请求Future |
| 构建与协调 | Widget、Element、State | 保留列表项身份与输入草稿 |
| 布局 | Constraints、Size、位置 | 长标题在剩余宽度内换行 |
| 绘制与合成 | RenderObject、图层 | 生成需要变化的绘制内容 |
| 栅格与呈现 | 引擎、GPU、平台 | 真实设备上检查帧耗时 |

Framework主要是Dart层，Engine负责运行时、文本和图形等底层能力，Embedder接入宿主窗口、输入与系统事件。Web与原生的实现路径不同；UI、平台和Raster工作也不能永远假定固定对应三个独立系统线程，具体线程组织取决于平台及引擎版本。

## State生命周期与异步结果

`initState` 初始化当前State一次，`didChangeDependencies` 会在初始阶段和继承依赖变化后调用，`didUpdateWidget` 处理父级新配置。`deactivate` 后可能重新插入树，`dispose` 才表示当前State结束，应释放控制器、订阅、动画与定时器。

`build` 可以频繁执行，不能把它当初始化入口。FutureBuilder应接收已保存的Future，而非每次build调用Repository；完整代码见[动手页](./hands-on.md)。

`mounted` 只能说明页面是否仍挂载，不能证明结果属于最新请求。筛选A请求比筛选B晚返回时，还需请求代次、查询键或取消机制，防止旧结果覆盖新内容。Future超时也通常不会取消原始工作，更不会撤回服务器已经完成的写入。

## 约束布局

父级向下传约束，子级在范围内选择尺寸，父级决定位置。一个屏幕内的 `Column` 若需要列表填满剩余高度，可用 `Expanded(child: ListView.builder(...))`；而竖向滚动容器内通常没有有限剩余高度，不能照搬相同Expanded结构。

![Flutter布局约束与长标题处理](/flutter/layout-constraints.svg)

`Row` 中长文本可用Expanded或Flexible把可用宽度传进去，再决定换行或截断。截断适合可进入详情的摘要，不应把关键金额或错误原因悄悄藏掉。字体放大、键盘弹出和横屏需要单独验证，不靠添加固定高度掩盖溢出。

## 异步、isolate与平台接入

`Future/await` 表达等待，不自动并行；同步JSON解码或计算仍可能阻塞当前isolate。原生平台可用 `Isolate.run`、`compute` 等转移合适的计算，但消息传输与复制有成本；Web上的compute不会因此提供相同的后台isolate行为。

MethodChannel用于请求与响应，EventChannel用于事件流，FFI用于符合ABI合同的原生库。插件必须支持目标平台，还要定义权限拒绝、生命周期、错误与线程约定；通道异步不代表原生工作自动在线程池执行。状态、平台服务与页面解耦后更容易通过受控实现测试异常路径。
