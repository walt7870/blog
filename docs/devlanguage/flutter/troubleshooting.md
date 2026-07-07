# Flutter 排错手册

Flutter 排错先分类，再动手。不要一上来就清缓存、删 lock、换 SDK，否则容易把问题变成多个问题。

## 排查入口

| 问题 | 优先检查 |
| --- | --- |
| 环境异常 | `flutter doctor` |
| 依赖冲突 | `pubspec.yaml`、`pubspec.lock`、SDK constraint |
| Android 构建失败 | Gradle、Kotlin、minSdk、namespace、签名 |
| iOS 构建失败 | CocoaPods、Xcode、证书、描述文件、权限 |
| 页面白屏 | 日志、异常栈、路由、状态机、首帧 |
| 布局溢出 | Row/Column 主轴空间、滚动容器约束 |
| 卡顿 | Profile mode、DevTools Performance、图片和重建范围 |

## 依赖问题

```bash
flutter pub get
flutter pub outdated
flutter pub deps
```

`dependency_overrides` 只适合临时验证，不建议长期作为正式解法。

## 构建问题

Android 构建失败时，优先找第一条真实错误，而不是最后一行 `BUILD FAILED`。常见原因包括 Gradle 插件版本、Kotlin 版本、`minSdk`、`namespace`、签名和混淆。

iOS 构建失败时，重点看 CocoaPods、Xcode 版本、最低系统版本、证书、描述文件和 `Info.plist` 权限文案。

## 白屏问题

白屏要分三类：

| 类型 | 检查点 |
| --- | --- |
| 启动白屏 | 初始化阻塞、首帧过慢、启动图配置 |
| 页面白屏 | 路由错误、异常被吞、布局不可见 |
| 数据白屏 | 接口失败但没有错误态、状态机缺分支 |

## 卡顿问题

卡顿不要用 debug 模式判断。用 profile mode 和 DevTools 看 UI 线程、Raster 线程、图片解码、布局和绘制耗时。

常见处理：

- 缩小 `setState` 影响范围。
- 使用 `ListView.builder` 懒构建。
- 避免 `shrinkWrap` 处理大列表。
- 图片按显示尺寸加载。
- 复杂绘制用 `RepaintBoundary` 验证隔离效果。
- 大计算移出主 isolate。
