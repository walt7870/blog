# Flutter 排错手册

先确定失败阶段与第一条相关证据，再改一个变量。列表反复加载、Android链接失败和发布包白屏不是同一种问题；清缓存、删锁文件与全量升级会把原始问题混入更多变化。

![Flutter按失败阶段定位证据与复验](/flutter/diagnostic-evidence.svg)

## 环境、依赖与构建

先记录Flutter revision、Dart、目标、设备、系统、构建模式、入口、环境配置与原始命令。`flutter doctor -v` 看目标工具链，`flutter pub deps` 看实际依赖，`flutter pub outdated` 只提供升级线索，不自动证明新版本兼容。

Android检查第一条Gradle、Kotlin、Java或原生链接错误，区分下载、版本、minSdk、namespace、ABI和签名。iOS按工程使用的CocoaPods或Swift Package Manager、Xcode、最低系统版本及签名日志排查。不要把任意插件失败都归因于缓存。

```bash
flutter doctor -v
flutter pub deps
flutter analyze
flutter test
flutter run -v
```

`flutter clean` 适合验证构建产物问题，不能修复版本约束、权限或ABI。锁文件丢失会改变解析图，应先保存差异，只有有意更新时才重新解析并回归。

## 重复请求与错误结果

若父组件重建就重新加载，先查是否在build中调用 `repository.load()`。FutureBuilder应接收在initState、配置变化或显式重试时保存的Future，见[完整示例](./hands-on.md)。

页面退出后的 `setState` 错误应检查定时器、订阅和任务归属，及时释放。检查mounted可以避免更新已销毁页面，却不能拦住旧筛选覆盖新结果；需要查询代次、取消或请求身份。超时不自动取消底层Future，写接口重试要核对服务端幂等。

| 现象 | 关键证据 | 修复后断言 |
| --- | --- | --- |
| 每次build都请求 | 受控Repository调用计数 | 相同配置重建只调用一次 |
| 旧筛选覆盖新筛选 | 每个请求的查询键与完成顺序 | A晚于B返回仍显示B |
| 退出后仍回调 | State和订阅释放时点 | 页面销毁后无更新或泄漏 |
| 缓存显示他人数据 | 账号、租户与缓存键 | 切账号隔离旧响应和本地状态 |
| 无限加载或白屏 | 初始化、路由、状态与异常栈 | 失败有出口且可恢复 |

## 布局与状态身份

`RenderFlex overflowed` 先找主轴可用空间，长标题在Row中用Expanded/Flexible约束；`unbounded height` 检查ListView上游是否给有限高度。竖向滚动容器内的Column不能直接用Expanded分配无限剩余空间，可改用合适的sliver结构。

列表重排后输入错位，检查Key是否绑定稳定业务ID、是否位于实际参与匹配的子级。每次创建UniqueKey并不是修复复用问题，而是强制替换；输入控制器也不能在build中反复创建。结合[架构页](./architecture.md)的约束与节点图定位，再用长文本、字号放大与插入删除测试复验。

## 性能与平台能力

在目标真机profile模式下用DevTools分清build、layout、paint、raster、网络和内存。60Hz每帧约16.7毫秒，120Hz约8.3毫秒，但不能简单把各流水阶段相加当作唯一预算；按实际帧轨迹与设备判断。

大计算移出主isolate前先测成本，Web上的compute不自动提供原生后台isolate。图片按显示需求控制解码尺寸，大列表用惰性构建；RepaintBoundary可能增加图层与内存，必须比较实际效果。

权限问题沿Dart调用、插件支持、原生配置、用户授权、系统限制逐层验证。通道API异步不保证原生调用无阻塞；定位、蓝牙、相机和后台运行需真实设备与系统版本覆盖。

## 发布包异常与闭环

release才失败时，用相同配置在测试设备复现，核对环境、资源、签名、ABI、优化/混淆和原生SDK。保留对应符号与mapping后再解释崩溃堆栈，不以debug成功证明发布包正确。

每次修复记录触发路径、第一条证据、根因、方案边界和验证结果。先加能复现的测试，再修复并重复原失败流程；安装、升级、数据迁移和灰度恢复的检查见[交付页](./project-delivery.md)。
