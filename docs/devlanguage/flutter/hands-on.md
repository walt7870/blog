# Flutter 动手入门路径

动手入门的目标不是只看到默认计数器页面，而是建立一条可复现链路：环境可检查、工程可运行、目录可解释、问题可定位。

入门阶段要养成一个习惯：每一步都要知道“它在检查什么、产出什么、影响哪里”。否则项目跑起来只是偶然，换机器、换 SDK、换插件、换平台时很容易卡住。

## 安装与检查

安装 Flutter SDK 后，先运行：

```bash
flutter doctor
```

`doctor` 会检查 Flutter、Dart、Android 工具链、Xcode、设备和 IDE 插件。新手不要跳过这一步，很多“项目跑不起来”的问题其实是环境缺项。

常见检查项：

| 检查项 | 说明 | 常见问题 |
| --- | --- | --- |
| Flutter SDK | Flutter 命令和缓存是否可用 | PATH 没配、SDK 下载不完整 |
| Dart SDK | Dart 随 Flutter 分发 | 使用了系统 Dart 导致版本不一致 |
| Android toolchain | Android SDK、licenses、platform tools | 未接受 licenses、SDK 缺版本 |
| Xcode | iOS/macOS 构建工具 | 版本过低、命令行工具未选择 |
| Device | 模拟器、真机、浏览器 | 设备未授权、模拟器未启动 |
| IDE 插件 | Android Studio、VS Code 插件 | 插件缺失不影响命令行，但影响调试体验 |

常用环境命令：

```bash
flutter --version
flutter doctor -v
flutter devices
flutter config
```

如果一台机器上有多个 Flutter 版本，建议使用版本管理工具或明确 SDK 路径。团队项目还应该在 README 中写清楚 Flutter 版本、Dart 版本、Android Gradle 插件版本、Xcode 最低版本和常用命令。

## 创建第一个项目

```bash
flutter create flutter_learning
cd flutter_learning
flutter pub get
flutter run
```

常见目录职责：

| 目录或文件 | 作用 |
| --- | --- |
| `lib/main.dart` | Dart 入口和应用根组件 |
| `pubspec.yaml` | 依赖、资源、字体、版本 |
| `android/` | Android 平台壳、权限、签名、Gradle 配置 |
| `ios/` | iOS 平台壳、权限、证书、Xcode 配置 |
| `test/` | 单元测试和 Widget 测试 |

初学者优先关注 `lib/`、`pubspec.yaml` 和平台目录。`lib/` 是 Dart 主体代码；`pubspec.yaml` 决定依赖、资源、字体和版本；`android/`、`ios/` 是平台壳，插件、权限、签名、构建失败经常从这里定位。

建议创建项目后立刻跑一遍：

```bash
flutter analyze
flutter test
flutter run
```

这三个命令分别检查静态问题、测试问题和运行问题。即使项目还很小，也能帮助你建立“改代码后先验证”的习惯。

## 接手已有项目先看什么

真实工作中，经常不是从 `flutter create` 开始，而是接手一个已有项目。不要急着改页面，先把工程跑通并确认边界。

| 检查项 | 看哪里 | 目的 |
| --- | --- | --- |
| Flutter 版本 | README、`.fvmrc`、CI 配置、团队文档 | 避免本地 SDK 与项目不一致 |
| 入口文件 | `lib/main.dart`、`lib/bootstrap.dart` | 确认初始化顺序 |
| 环境配置 | `--dart-define`、配置文件、CI 变量 | 确认接口域名和功能开关 |
| 路由配置 | `MaterialApp`、路由库、路由表 | 找到页面入口和登录守卫 |
| 网络层 | HTTP Client、拦截器、错误模型 | 确认 token、超时、错误处理 |
| 本地存储 | secure storage、shared preferences、数据库 | 确认缓存和登录态保存方式 |
| 平台配置 | `android/`、`ios/` | 确认权限、签名、插件配置 |
| 测试命令 | package scripts、CI 配置 | 确认提交前需要跑什么 |

推荐先跑：

```bash
flutter --version
flutter doctor -v
flutter pub get
flutter analyze
flutter test
flutter run --dart-define=APP_ENV=dev
```

如果项目没有 README，至少自己整理一份本地启动记录：Flutter 版本、运行命令、环境变量、常见问题和已知限制。以后换机器、换同事、接 CI 都会用到。

## `pubspec.yaml` 怎么看

`pubspec.yaml` 是 Flutter 项目的配置入口之一。最常见内容包括：

```yaml
name: flutter_learning
description: A Flutter learning project.
publish_to: "none"

environment:
  sdk: ">=3.0.0 <4.0.0"

dependencies:
  flutter:
    sdk: flutter
  http: ^1.2.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0

flutter:
  uses-material-design: true
  assets:
    - assets/images/
```

几个关键点：

| 字段 | 作用 |
| --- | --- |
| `environment.sdk` | 限定 Dart SDK 版本，避免依赖在不兼容版本下安装 |
| `dependencies` | 运行时依赖，打包进入应用 |
| `dev_dependencies` | 开发和测试依赖，不直接作为运行能力 |
| `assets` | 声明图片、配置文件等资源，否则运行时找不到 |
| `uses-material-design` | 启用 Material 图标等基础资源 |

改完依赖或资源后执行：

```bash
flutter pub get
```

如果依赖版本冲突，用 `flutter pub deps` 看依赖树，用 `flutter pub outdated` 看可升级范围。不要长期依赖 `dependency_overrides` 解决正式问题，它更适合临时验证。

## 热重载与重启

| 操作 | 适合场景 |
| --- | --- |
| Hot Reload | UI 和普通 Dart 代码变更 |
| Hot Restart | 初始化逻辑、全局状态、入口变更 |
| 重新运行 | 原生配置、权限、插件、平台代码变更 |

如果改了 `AndroidManifest.xml`、`Info.plist`、原生插件或签名配置，通常需要重新运行应用。

热重载能保留当前状态，所以适合快速调 UI；热重启会重建应用状态，适合验证初始化逻辑；重新运行会重新构建并安装应用，适合验证平台配置。不要把这三者混在一起，否则容易出现“我明明改了配置但没生效”的错觉。

## 第一个页面的拆法

建议从一个待办列表页开始：

1. `TaskListPage`：页面骨架。
2. `TaskItemTile`：单个待办卡片。
3. `TaskEmptyView`：空状态。
4. `TaskErrorView`：错误态和重试按钮。
5. `TaskRepository`：先返回本地假数据，再替换成接口。

这样能从一开始养成“页面、组件、数据来源、状态”分开的习惯。

一个简单结构可以这样组织：

```text
lib/
  main.dart
  app.dart
  features/
    task/
      task_list_page.dart
      task_item_tile.dart
      task_repository.dart
      task_model.dart
```

示例模型：

```dart
class Task {
  const Task({
    required this.id,
    required this.title,
    required this.completed,
  });

  final String id;
  final String title;
  final bool completed;
}
```

示例 Repository：

```dart
class TaskRepository {
  Future<List<Task>> fetchTasks() async {
    await Future<void>.delayed(const Duration(milliseconds: 300));
    return const [
      Task(id: '1', title: '跑通 Flutter 工程', completed: true),
      Task(id: '2', title: '拆分待办列表页面', completed: false),
    ];
  }
}
```

页面可以先用 `FutureBuilder` 入门：

```dart
class TaskListPage extends StatelessWidget {
  const TaskListPage({super.key, required this.repository});

  final TaskRepository repository;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tasks')),
      body: FutureBuilder<List<Task>>(
        future: repository.fetchTasks(),
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return const Center(child: Text('加载失败，请稍后重试'));
          }
          final tasks = snapshot.data ?? const <Task>[];
          if (tasks.isEmpty) {
            return const Center(child: Text('暂无待办'));
          }
          return ListView.builder(
            itemCount: tasks.length,
            itemBuilder: (context, index) {
              final task = tasks[index];
              return ListTile(
                key: ValueKey(task.id),
                title: Text(task.title),
                trailing: task.completed
                    ? const Icon(Icons.check_circle)
                    : const Icon(Icons.radio_button_unchecked),
              );
            },
          );
        },
      ),
    );
  }
}
```

这段代码虽然简单，但已经包含真实项目里的基本状态：加载中、失败、空数据、成功列表。后面接接口、缓存、分页和刷新，都可以在这条结构上继续扩展。

## 从假数据过渡到真实接口

初学者容易从页面里直接发请求。更稳的过渡方式是先保持页面结构不变，只替换 Repository 的实现。

```text
TaskListPage
  -> TaskListController
    -> TaskRepository
      -> FakeTaskRepository
      -> HttpTaskRepository
```

开发顺序可以这样走：

1. `FakeTaskRepository` 返回本地数据，先把页面状态做完整。
2. 定义 `TaskRepository` 抽象，页面和状态对象只依赖抽象。
3. 写 `HttpTaskRepository` 调接口，把 JSON 转成业务模型。
4. 加入错误映射，网络错误、认证错误、业务错误不要散落在页面里。
5. 再补本地缓存、分页、下拉刷新和离线草稿。

这样做的好处是页面不会因为接口没准备好而停住，也不会因为接口字段变化导致 UI 到处改。

## 调试工具

入门阶段至少熟悉这些工具：

| 工具 | 用途 |
| --- | --- |
| Debug Console | 看日志、异常栈、断点调试 |
| Flutter Inspector | 查看 Widget 树、布局边界 |
| Performance View | 分析帧耗时、UI/Raster 压力 |
| Network View | 查看网络请求 |
| Memory View | 观察内存增长和对象分配 |
| Logging | 记录业务关键路径和错误信息 |

调试布局时可以打开 `Debug Paint` 或使用 Inspector 选中节点；调试性能时用 profile mode，不要用 debug mode 判断流畅度；调试异步问题时保留完整异常栈，不要只显示“加载失败”。

## 常见入门误区

| 误区 | 问题 | 更好的做法 |
| --- | --- | --- |
| 所有代码写在 `main.dart` | 页面、状态、数据混在一起 | 从第一个页面开始拆文件 |
| `build` 里发网络请求 | 每次重建可能重复请求 | 放到状态对象、Repository 或初始化逻辑 |
| 错误态只打印日志 | 用户看到白屏或无反馈 | 页面展示可理解错误和重试入口 |
| 列表项不用 Key | 插入、删除、重排时状态错位 | 使用业务 ID 做 `ValueKey` |
| 改原生配置后只热重载 | 配置不会重新生效 | 重新运行应用 |
| 遇到问题先删缓存 | 可能掩盖真实原因 | 先分类，再看日志和依赖树 |

## 入门检查清单

- `flutter doctor` 没有阻断项。
- 能在模拟器或真机运行默认项目。
- 能说明 `pubspec.yaml`、`lib/`、`android/`、`ios/` 的职责。
- 能区分 Hot Reload、Hot Restart 和重新运行。
- 能写出包含加载、空数据、成功、失败的最小页面。
- 能解释 `Widget`、`State`、`Repository` 分别负责什么。
- 能接手已有项目并找到入口、路由、网络层、环境配置和平台配置。
- 能把假数据 Repository 替换成真实接口实现。
- 能用 Inspector 找到一个布局节点。
- 能用 `flutter analyze` 和 `flutter test` 做基础验证。
