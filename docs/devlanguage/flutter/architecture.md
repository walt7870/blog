# Flutter 核心架构与运行模型

Flutter 的核心不是某个组件，而是一条从 Dart 对象到屏幕像素的链路。理解这条链路，才能解释重建、布局、绘制、卡顿和平台接入。

## 分层模型

| 层级 | 职责 |
| --- | --- |
| 应用层 | 页面、组件、状态、业务流程 |
| Framework | Widget、Element、RenderObject、布局、手势、动画 |
| Engine | 文本、绘制、合成、Dart runtime、平台通道基础 |
| Embedder | 把 Engine 接入 iOS、Android、Web、桌面 |
| 平台层 | 窗口、输入、权限、系统服务、硬件能力 |

## Widget、Element、RenderObject

| 对象 | 重点 |
| --- | --- |
| Widget | 不可变配置，描述界面想长什么样 |
| Element | Widget 在树上的位置，管理生命周期和 State |
| RenderObject | 负责布局、绘制、命中测试等底层工作 |

`setState` 后并不是直接重画屏幕。框架会标记相关 Element 需要重建，下一帧调用 `build` 生成新的 Widget 配置，再更新 Element 和 RenderObject。

## 约束布局

Flutter 布局遵循：

1. 父级向子级下发 Constraints。
2. 子级在约束范围内选择 Size。
3. 父级根据子级 Size 决定 Position。

常见错误：

- `RenderFlex overflow`：Row 或 Column 主轴空间不足。
- `unbounded height`：滚动容器拿到无限高度。
- `Incorrect use of ParentDataWidget`：`Expanded`、`Positioned` 放错父级。

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
