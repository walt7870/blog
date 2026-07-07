# Flutter 动手入门路径

动手入门的目标不是只看到默认计数器页面，而是建立一条可复现链路：环境可检查、工程可运行、目录可解释、问题可定位。

## 安装与检查

安装 Flutter SDK 后，先运行：

```bash
flutter doctor
```

`doctor` 会检查 Flutter、Dart、Android 工具链、Xcode、设备和 IDE 插件。新手不要跳过这一步，很多“项目跑不起来”的问题其实是环境缺项。

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

## 热重载与重启

| 操作 | 适合场景 |
| --- | --- |
| Hot Reload | UI 和普通 Dart 代码变更 |
| Hot Restart | 初始化逻辑、全局状态、入口变更 |
| 重新运行 | 原生配置、权限、插件、平台代码变更 |

如果改了 `AndroidManifest.xml`、`Info.plist`、原生插件或签名配置，通常需要重新运行应用。

## 第一个页面的拆法

建议从一个任务列表页开始：

1. `TaskListPage`：页面骨架。
2. `TaskItemTile`：单个任务卡片。
3. `TaskEmptyView`：空状态。
4. `TaskErrorView`：错误态和重试按钮。
5. `TaskRepository`：先返回本地假数据，再替换成接口。

这样能从一开始养成“页面、组件、数据来源、状态”分开的习惯。

## 入门检查清单

- `flutter doctor` 没有阻断项。
- 能在模拟器或真机运行默认项目。
- 能说明 `pubspec.yaml`、`lib/`、`android/`、`ios/` 的职责。
- 能区分 Hot Reload、Hot Restart 和重新运行。
- 能写出包含加载、空数据、成功、失败的最小页面。
