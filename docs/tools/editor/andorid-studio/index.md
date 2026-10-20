# Android Studio：JDK、构建与编辑器排错

同一个 Android 项目可能同时用到三套 Java 环境：Android Studio 自己运行的 JBR、Gradle Daemon 运行的 JDK，以及编译源代码的 Java toolchain。应用能调用哪些 Android API，又由 `compileSdk`、`minSdk` 和脱糖支持共同约束。把这几件事都称为“项目 JDK”，很容易出现命令行构建通过、IDE Sync 却失败的情况。

![Android Studio 的运行时与编译边界](/editor/android-studio-jdk-flow.svg)

## 先确定失败发生在哪条链路

| 现象 | 检查入口 | 判断依据 |
| --- | --- | --- |
| Studio 无法启动、IDE 插件崩溃 | IDE Runtime 与 IDE 日志 | 是否连空项目都无法打开 |
| Sync 或构建报 Java 版本错误 | Gradle 的运行 JVM | AGP 最低要求、Wrapper 支持的 JVM 范围 |
| Java 编译语法或目标版本错误 | toolchain、`compileOptions` | 编译器版本、source/target 是否一致 |
| 某 Android API 飘红或低版本运行崩溃 | `compileSdk`、依赖、`minSdk` | API 引入版本、脱糖范围、运行系统版本 |

例如订单应用使用 AGP 8.5.2、Gradle 8.7：AGP 要求至少 JDK 17，Gradle 8.7 必须支持所选运行 JVM。把 IDE 的 Boot Runtime 改成 17，不会自动修复终端仍由 `JAVA_HOME` 指向 Java 11 的问题。

## 确认 Gradle 实际运行的 JVM

先看 `gradle/wrapper/gradle-wrapper.properties` 的 `distributionUrl`，再看根构建文件或 `gradle/libs.versions.toml` 中的 AGP 版本。使用项目 Wrapper，避免机器全局 `gradle` 与项目版本不同。

```bash
./gradlew --version
./gradlew :app:assembleDebug --stacktrace
```

Windows 使用 `gradlew.bat`。新版本 Gradle 的输出会分别列出 Launcher JVM 和 Daemon JVM，旧版可能只列 `JVM`；保留完整输出，不能只截取一个版本号。构建失败时先读取第一个有业务含义的 `Caused by`，栈底的“任务失败”只是结果。

**存在 `gradle/gradle-daemon-jvm.properties` 时，先检查 Daemon JVM criteria。** 该机制在受支持的 Gradle 中按 Java 版本、厂商等条件选择 Daemon JVM，并优先于 `JAVA_HOME`、`org.gradle.java.home`。Android Studio Panda 1 起的新项目默认采用该方式，旧项目也可能迁移。选择条件不是一条固定的本机安装路径，自动下载还需要相应配置和网络条件。

没有采用该机制的项目，再检查以下入口：

| 构建入口 | JVM 选择位置 |
| --- | --- |
| Studio 的 Sync 或构建按钮 | Settings → Build, Execution, Deployment → Build Tools → Gradle |
| 普通终端执行 Wrapper | `JAVA_HOME`，未设置时看 `PATH` 中的 `java`；同时检查 `org.gradle.java.home` |
| Studio Terminal 的 “Run highlighted command” | 可能使用 IDE Gradle 设置，区别于直接敲入终端命令 |

macOS 的 Settings 在 Android Studio 菜单中。旧式项目的 IDE 选择通常记录为 `.idea/gradle.xml` 中的 `gradleJvm`；`GRADLE_LOCAL_JAVA_HOME` 从 `.gradle/config.properties` 的 `java.home` 解析路径。`jbr-17` 是 JDK 表条目名称，不能由它推断所有 Studio 发行版内置 JBR 都是 17。用设置中展示的实际版本和构建输出确认。

团队应固定 Wrapper、AGP 和 JVM 条件，将机器绝对路径留在本地。SDK 版本管理器只改变当前 shell 环境，不保证已启动的 IDE、已有 Daemon 或 CI 自动跟随；切换后分别验证这些入口。

## 分清编译器、语言级别与 Android API

Gradle 运行在 JDK 21，并不表示应用可以直接使用所有 Java 21 API。Java toolchain 决定编译器；`sourceCompatibility` 决定 Java 语法级别，`targetCompatibility` 决定产生的 class 格式；Kotlin 另有自己的编译目标。Android 构建还会将字节码转换为 DEX。

下面是模块 `build.gradle.kts` 中的局部示例，适用于已经配置 Android 插件的模块：

```kotlin
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

android {
    compileSdk = 34
    defaultConfig { minSdk = 26 }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
```

这是边界示例，不是当前新项目的版本推荐。安装对应 JDK 或配置 toolchain resolver 后才能解析工具链；Kotlin 项目还需按其插件版本设置相同目标。`compileSdk = 34` 提供 API 34 的编译符号，但不让 API 26 设备自动具备 API 34 的能力。新 API 要做版本保护，或采用明确支持的核心库脱糖；脱糖也不覆盖所有 Java API。

Android 模块的编辑器模型来自 Gradle Sync、Android SDK 和构建配置。不要套用普通 IntelliJ Java 项目的 “Project SDK 跟随 Gradle JDK” 作为通用修复。代码飘红时，先确认选中的 build variant、SDK 平台是否安装、依赖是否解析、source set 是否纳入，再看 Sync 日志。模型正确但索引持续异常时，才执行 Invalidate Caches。

## 按证据修复常见故障

`Android Gradle plugin requires Java 17` 说明运行 AGP 的 JVM 太旧。确认是否有 Daemon criteria，再调整对应 Gradle JVM 入口，并重新执行 `--version` 和原失败任务。只改变编译 toolchain 不会修复 AGP 的运行要求。

`Unsupported class file major version` 可能是旧 Gradle/Groovy 无法读取较新 class，也可能是插件或依赖由较新 Java 编译。常见 class major 为 52（Java 8）、55（11）、61（17）、65（21）。需要沿栈确认出错组件，再选择兼容 JVM 或升级 Wrapper/插件；不能仅凭编号就升级所有依赖。

老项目必须同时满足“AGP 要求的最低 JDK”和“当前 Gradle 支持的运行 JVM”。先按项目的精确版本核对兼容性，不按项目年代猜选 8、11 或 17。升级时保留一次成功构建基线，每步只调整一项，检查 Sync、编译、测试以及目标设备运行。

IDE 本体通常使用随 Studio 分发的 JBR。只有 IDE 自身启动或运行故障，才考虑 Help → Change IDE Boot Runtime；记录原设置以便恢复。构建故障的验收是同一提交在终端、IDE 和 CI 使用预期 JVM 完成相同任务，不能只以错误提示消失为准。
