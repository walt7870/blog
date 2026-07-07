# Flutter 技术全景：从界面框架到完整应用工程

Flutter 是一套跨平台 UI 与应用开发框架。它的价值不只是“一套代码多端运行”，更在于把 UI 描述、布局、状态更新、渲染、平台接入、测试和发布组织成一条比较完整的工程链路。

学习 Flutter 不能只记组件名。真正能把项目做稳，需要理解 Dart、Widget/Element/RenderObject、约束布局、状态边界、平台通道、性能工具和发布流程。

![Flutter 学习路线图](/flutter/flutter-learning-map.svg)

## 这组内容怎么读

- [Flutter 视频学习系列](./video-series.md)：按每集约 5 分钟的节奏，从环境、语言、核心模型讲到项目落地。
- [动手入门路径](./hands-on.md)：从安装、创建项目、运行、调试到第一个可维护页面。
- [核心架构与运行模型](./architecture.md)：解释 Flutter 的分层、Widget 三层模型、布局和渲染流水线。
- [项目实战路线](./project-practice.md)：用一个任务管理 App 把接口、状态、缓存、测试、发布串起来。
- [排错手册](./troubleshooting.md)：整理依赖、构建、白屏、布局溢出和卡顿的排查路径。

## Flutter 适合解决什么问题

| 场景 | 适合程度 | 原因 |
| --- | --- | --- |
| 多端一致的移动应用 | 高 | UI 自绘，主题、组件、动画一致性强 |
| 业务 App 快速迭代 | 高 | 热重载、组件化、插件生态能提升效率 |
| 高定制视觉和动效 | 高 | Canvas、动画和自定义绘制能力完整 |
| 重度系统能力应用 | 中 | 相机、蓝牙、地图、后台任务要评估插件和原生维护成本 |
| 纯内容站点或 SEO 页面 | 低到中 | Web 场景要评估首屏、SEO 和可访问性 |

## 学习主线

1. 跑通环境：`flutter doctor`、设备、IDE、`flutter run`。
2. 掌握 Dart：空安全、集合、异步、错误处理。
3. 理解核心模型：Widget 是配置，Element 管位置和生命周期，RenderObject 负责布局绘制。
4. 掌握布局：父级下发约束，子级返回尺寸，父级决定位置。
5. 管好状态：明确状态来源、影响范围、生命周期释放和跨页面共享边界。
6. 做完整工程：接口、缓存、路由、平台能力、测试、性能、发布和观测。

## 最小运行示例

```dart
import 'package:flutter/material.dart';

void main() {
  runApp(const LearningApp());
}

class LearningApp extends StatelessWidget {
  const LearningApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Learning',
      theme: ThemeData(colorSchemeSeed: Colors.blue),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: Text('Hello Flutter')),
    );
  }
}
```

这个例子展示的是最小入口：`main` 调用 `runApp`，`MaterialApp` 管应用级配置，页面由 Widget 组合出来。

## 视频与文章结合

视频适合建立整体模型和学习节奏，文章适合补命令、结构图、边界和排错路径。发布到 B 站后，视频链接会回填到 [视频学习系列](./video-series.md)。

## 参考资料

- Flutter 官方架构概览：https://docs.flutter.dev/resources/architectural-overview
- Flutter 性能最佳实践：https://docs.flutter.dev/perf/best-practices
- Dart 语言文档：https://dart.dev/language
