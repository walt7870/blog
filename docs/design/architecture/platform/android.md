# Android 构建与运行边界

Android 应用的构建发生在开发机或 CI，运行发生在设备。JDK 负责运行 Gradle 及相关编译工具；设备通常由 ART 执行 DEX，并通过系统 API 与原生库完成工作。把开发机换成 JDK 17，不代表手机获得了全部 Java 17 API，也不会自动改变应用的最低 Android 版本。

例如收据扫描应用的页面使用 Kotlin，图片校正在 C++ 库中实现。应用要同时满足构建工具版本、Android API、原生 ABI、权限与生命周期几组约束。模拟器能打开首页，只验证了其中很小一段。

![Android 构建与设备运行链路](/architecture/android-build-runtime.svg)

## 版本要分别固定

| 配置 | 作用 | 核对位置 |
| --- | --- | --- |
| Android Gradle Plugin（AGP） | 提供 Android 构建任务、资源处理、打包等集成 | 根构建脚本、`settings.gradle(.kts)` 或版本目录 |
| Gradle Wrapper | 选定项目使用的 Gradle 发行版 | `gradle/wrapper/gradle-wrapper.properties` |
| Gradle 使用的 JDK | 运行构建工具与插件 | IDE Gradle 设置、守护进程 JVM 条件、命令行环境或项目配置 |
| Java/Kotlin 编译设置 | 语言功能、编译工具链及字节码目标 | 模块构建脚本与插件配置 |
| `compileSdk` / `minSdk` / `targetSdk` | 编译 API、安装下限与目标行为适配 | Android 模块的 `android` 配置 |
| NDK / ABI | 编译原生代码及选择设备二进制 | `ndkVersion`、CMake/ndk-build 与 ABI 配置 |

不同入口可能选择不同 JDK。排查时记录实际输出，不能只看终端的 `java -version` 就认定 Android Studio 和 CI 使用同一个环境：

```sh
java -version
./gradlew --version
./gradlew :app:assembleDebug --stacktrace
```

命令需在实际 Android 项目执行，`:app` 替换为真实模块。构建会解析依赖并生成产物，应使用受信任的项目、依赖与 wrapper。升级时按目标 AGP 的兼容性要求同步核对 Gradle、JDK、SDK 和其他插件，不把“最低 Gradle 版本”改写成任意更高版本都受支持。

以历史项目的 **AGP 8.4** 为例，2024 年 4 月已发布正式版，兼容性表规定最低/默认 Gradle 为 **8.6**、最低/默认 JDK 为 **17**，最高支持 API 为 **34**。这组历史配置用于维护旧项目；新项目与其他 AGP 版本需要分别核对，不能据此推断一段未经验证的 Gradle 范围。

## API 与原生 ABI 是两条线

`compileSdk` 决定编译时可见的 Android API，`minSdk` 决定支持的最低设备版本，`targetSdk` 影响系统采用的兼容行为与相关要求。调用较新 API 时按可用性分支处理；脱糖只覆盖受支持的语言特性或库 API，不会把所有新系统能力补到旧设备。

原生库需要按目标 ABI 构建。常见名称包括 `arm64-v8a`、`armeabi-v7a`、`x86`、`x86_64`；设备是否支持某个 ABI 要查系统实际报告，不能假设所有 64 位设备都能执行 32 位库。普通 Linux 的 arm64 `.so` 也不能仅改目录名就作为 Android NDK 产物使用，Android 系统库与 ABI 合同不同。

```sh
adb shell getprop ro.product.cpu.abilist
unzip -l app-debug.apk
```

对直接安装的 APK，检查 `lib/<abi>/lib<name>.so` 及其依赖；使用 App Bundle 时还需检查为目标设备生成的实际拆分包。AAB 不是直接安装到设备的普通 APK。`UnsatisfiedLinkError` 可能来自缺失切片、缺失间接依赖、找不到符号或加载顺序，不能只看到 `arm64-v8a` 目录就宣布兼容。

## 页面、任务与系统生命周期

收据扫描的 UI 展示当前状态，ViewModel 等组件可以帮助管理界面数据，但不能保证进程一直存活。长任务需要根据业务选择可恢复的工作调度、适用的前台服务或其他系统能力，并遵守目标系统的启动、权限和资源限制。后台任务不是一个无限运行的普通线程。

拍摄与录音分别需要对应权限，网络、通知、文件访问和蓝牙也有各自规则。把待处理文件与稳定任务标识持久化后，进程重建可以继续核对任务；服务器已收到、客户端未登记时，通过幂等标识查回结果。日志中保留错误码和任务状态，不记录令牌、收据原图或敏感业务内容。

## 验证与排错

先验证构建配置与依赖解析，再检查 APK 内容、签名和安装，最后在代表性真机执行完整扫描流程。至少覆盖最低支持系统、目标 ABI、拒绝权限、旋转或重建页面、后台限制、低存储和重复操作。原生库还需核对页面大小兼容、运行库和资源占用等目标设备要求，不能只测一台模拟器。

构建失败从首个有效错误及对应插件版本查起；无法安装检查签名、版本和设备条件；启动成功后扫描崩溃则检查首次原生加载与图像输入。Release 使用混淆或资源压缩时，要验证 JNI 入口和反射保留规则，并保留符号用于定位崩溃。一次 `assembleDebug` 成功不能替代发布包验收。
