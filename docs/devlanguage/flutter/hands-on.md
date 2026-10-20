# Flutter 动手入门

做一个可运行、可测试的待办列表，覆盖加载、空数据、成功、失败与重试。请求在初始化、Repository变化或用户明确重试时创建，父级普通重建不再重复请求。

![待办请求在页面生命周期中的创建与更新](/flutter/request-lifecycle.svg)

## 创建最小工程

先确认 `flutter --version`、`flutter doctor -v` 与目标设备。Dart随Flutter提供，项目应固定已验证的Flutter版本及revision，SDK范围不能替代精确版本。

```bash
flutter create --platforms=web flutter_learning
cd flutter_learning
flutter devices
```

这里选择Web便于先运行最小UI，Android/iOS的签名、权限与设备行为需要后续独立验证。文件分工：`pubspec.yaml` 管依赖与资源，`lib/main.dart` 管入口，下面的 `lib/task_page.dart` 管模型、受控数据源与页面，`test/` 放自动化验证。

## 模型、数据源与页面

把以下完整代码放进 `lib/task_page.dart`。示例只返回内存数据，不声称已接真实接口或本地持久化：

```dart
import 'package:flutter/material.dart';

class Task {
  const Task(this.id, this.title);
  final String id;
  final String title;
}

abstract interface class TaskRepository {
  Future<List<Task>> load();
}

class DemoTaskRepository implements TaskRepository {
  @override
  Future<List<Task>> load() async {
    await Future<void>.delayed(const Duration(milliseconds: 300));
    return const [
      Task('1', '检查待办的加载状态'),
      Task('2', '补充失败后的重试测试'),
    ];
  }
}

class TaskListPage extends StatefulWidget {
  const TaskListPage({super.key, required this.repository});
  final TaskRepository repository;

  @override
  State<TaskListPage> createState() => _TaskListPageState();
}

class _TaskListPageState extends State<TaskListPage> {
  late Future<List<Task>> _tasks;

  @override
  void initState() {
    super.initState();
    _tasks = widget.repository.load();
  }

  @override
  void didUpdateWidget(covariant TaskListPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.repository, widget.repository)) {
      _tasks = widget.repository.load();
    }
  }

  void _reload() {
    setState(() { _tasks = widget.repository.load(); });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('待办'),
        actions: [
          IconButton(
            tooltip: '重新加载',
            onPressed: _reload,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: FutureBuilder<List<Task>>(
        future: _tasks,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('加载失败'),
                  TextButton(onPressed: _reload, child: const Text('重试')),
                ],
              ),
            );
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
              );
            },
          );
        },
      ),
    );
  }
}
```

`_tasks` 保存同一个Future，build只消费状态。`didUpdateWidget` 在父级替换Repository时重新加载，随后框架本来就会build，无需额外setState。父级也应保持Repository身份稳定，不能每次build都创建新实例。

本例重新加载时显示全页进度，便于观察最小状态；保留旧列表的后台刷新与请求去重在[实战](./project-practice.md)中另定合同。FutureBuilder会忽略已经替换的Future结果，但不会取消底层网络请求；离开页面也不表示服务端副作用被撤销。

## 连接入口

替换 `lib/main.dart`：

```dart
import 'package:flutter/material.dart';
import 'task_page.dart';

void main() {
  runApp(MaterialApp(
    home: TaskListPage(repository: DemoTaskRepository()),
  ));
}
```

执行 `flutter run -d chrome`，约300毫秒后显示两项待办，刷新按钮重新触发一次加载。热重载通常保留State，不会重跑initState；入口、初始化和原生插件变化分别考虑热重启或完整重新运行，不能混用后误以为配置无效。

## 验证重建、失败与竞态

默认工程的计数器测试与新页面不相符，删除或替换为下面 `test/task_page_test.dart`。受控Repository用Completer明确决定成功、失败与完成顺序，不靠真实网络碰运气：

```dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_learning/task_page.dart';

class ControlledTasks implements TaskRepository {
  final requests = <Completer<List<Task>>>[];
  @override
  Future<List<Task>> load() {
    final request = Completer<List<Task>>();
    requests.add(request);
    return request.future;
  }
}

void main() {
  Widget app(TaskRepository repo) => MaterialApp(
    home: TaskListPage(repository: repo),
  );

  testWidgets('重建不重复加载，成功显示列表', (tester) async {
    final repo = ControlledTasks();
    await tester.pumpWidget(app(repo));
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    await tester.pumpWidget(app(repo));
    expect(repo.requests, hasLength(1));
    repo.requests.single.complete(const [Task('42', '核对加载合同')]);
    await tester.pump();
    expect(find.text('核对加载合同'), findsOneWidget);
  });

  testWidgets('失败可重试并进入空状态', (tester) async {
    final repo = ControlledTasks();
    await tester.pumpWidget(app(repo));
    repo.requests.single.completeError(StateError('模拟失败'));
    await tester.pump();
    expect(find.text('加载失败'), findsOneWidget);
    await tester.tap(find.text('重试'));
    await tester.pump();
    expect(repo.requests, hasLength(2));
    repo.requests.last.complete(const []);
    await tester.pump();
    expect(find.text('暂无待办'), findsOneWidget);
  });

  testWidgets('旧Future不能覆盖新数据源，销毁后不更新', (tester) async {
    final oldRepo = ControlledTasks();
    final newRepo = ControlledTasks();
    await tester.pumpWidget(app(oldRepo));
    await tester.pumpWidget(app(newRepo));
    newRepo.requests.single.complete(const [Task('2', '新列表')]);
    await tester.pump();
    oldRepo.requests.single.complete(const [Task('1', '旧列表')]);
    await tester.pump();
    expect(find.text('新列表'), findsOneWidget);
    expect(find.text('旧列表'), findsNothing);
    await tester.tap(find.byTooltip('重新加载'));
    await tester.pump();
    await tester.pumpWidget(const SizedBox());
    newRepo.requests.last.complete(const []);
    await tester.pump();
    expect(tester.takeException(), isNull);
  });
}
```

```bash
dart format lib test
flutter analyze
flutter test
flutter run -d chrome
```

再故意把FutureBuilder的 `future: _tasks` 改为 `future: widget.repository.load()`，重建计数测试应失败。这证明测试能发现重复请求，而不只是让正常示例通过。Widget测试不等于真机性能、权限或无障碍验收；这些边界见[架构](./architecture.md)与[交付](./project-delivery.md)。
