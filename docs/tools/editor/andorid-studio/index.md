# Android Studio

Android Studio 里最容易混淆的是 JDK：同一个项目里可能同时存在“构建用 JDK”“编辑器索引用 SDK”“IDE 自身运行时”。排查构建问题时，优先看 Gradle JDK；代码提示异常时，再看 Project SDK；只有 IDE 自己启动异常或运行时问题，才需要改 Boot Runtime。

![Android Studio JDK 选择链](/editor/android-studio-jdk-flow.svg)

## 先判断要改哪一个 JDK

| 场景 | 优先检查 | 典型现象 |
| --- | --- | --- |
| Gradle Sync 失败、命令行构建失败 | Gradle JDK | `Unsupported class file major version`、`Android Gradle plugin requires Java ...` |
| IDE 能构建，但代码飘红、跳转异常 | Project SDK | 编辑器提示不准、索引异常、Java API 识别不完整 |
| Android Studio 本体启动慢、崩溃、运行时异常 | IDE Runtime | IDE 自身启动或插件运行异常 |

一句话：**构建问题先改 Gradle JDK，不要一上来改 IDE Runtime。**

## Gradle JDK：真正决定构建

Gradle JDK 是 Gradle Daemon 和 Android Gradle Plugin 实际运行时使用的 JDK。绝大多数 Android 项目的 JDK 问题都在这里。

### 在界面里修改

路径：

```text
File -> Settings -> Build, Execution, Deployment -> Build Tools -> Gradle -> Gradle JDK
```

macOS 上入口是：

```text
Android Studio -> Settings -> Build, Execution, Deployment -> Build Tools -> Gradle -> Gradle JDK
```

常用选择：

- `jbr-17` 或 `jbr-21`：Android Studio 自带的 JetBrains Runtime。
- `Download JDK...`：让 IDE 下载一套项目可用 JDK。
- `Add Local JDK...`：选择本机已安装的 JDK。

选择后重新执行：

```text
File -> Sync Project with Gradle Files
```

### 在文件里确认

当前项目的 Gradle JDK 通常会写在 `.idea/gradle.xml`：

```xml
<option name="gradleJvm" value="jbr-17" />
```

这表示当前项目使用 Android Studio 自带的 JBR 17 作为 Gradle JDK。这个配置是项目级的，不等于系统 `JAVA_HOME`。

新建项目也可能使用 `GRADLE_LOCAL_JAVA_HOME`，它会从 `.gradle/config.properties` 里的 `java.home` 读取项目本地 JDK 路径：

```properties
java.home=/path/to/jdk
```

团队项目里如果希望不同机器保持一致，可以优先固定 Gradle Wrapper、AGP 版本和 Gradle JDK，再考虑是否提交项目级 IDE 配置。

### 用命令验证命令行构建

在 Android Studio 底部 Terminal 执行：

```bash
# macOS / Linux
./gradlew --version | grep "JVM"

# Windows
gradlew.bat --version | findstr "JVM"
```

输出示例：

```text
JVM:          17.0.12 (JetBrains s.r.o. 17.0.12+1-b1207.1)
```

这里显示的是命令行 Gradle 构建实际使用的 JDK。注意：在普通 Terminal 里运行 Gradle 时，`JAVA_HOME` 或 `PATH` 也可能参与选择；如果是 Android Studio 的 Sync 或工具按钮触发的构建，则以 Gradle 设置里的 JDK 为准。

## Project SDK：影响编辑器理解代码

Project SDK 主要影响 Android Studio 的代码分析、索引、跳转和部分编辑器体验，不直接决定 Gradle 构建。

路径：

```text
File -> Project Structure -> Project -> SDK
```

处理建议：

- 普通 Android 项目：Project SDK 与 Gradle JDK 保持同一大版本。
- 老项目：先让 Gradle JDK 满足构建，再让 Project SDK 跟随。
- 如果只是代码飘红但 `./gradlew assembleDebug` 能过，优先尝试重新 Sync、Invalidate Caches，再看 Project SDK。

常用操作：

```text
File -> Invalidate Caches...
File -> Sync Project with Gradle Files
```

## IDE Runtime：Android Studio 自己用

IDE Runtime 是 Android Studio 本体运行使用的 JetBrains Runtime。它不是项目构建 JDK。

入口：

```text
Help -> Change IDE Boot Runtime...
```

使用建议：

- 一般不要手动修改。
- Android Studio 能正常启动时，不靠改它解决项目构建问题。
- 只有 IDE 自身启动、插件兼容或运行时崩溃问题，才考虑切换官方提供的 Runtime。

## 版本判断方法

不要死记版本表，先从项目文件判断当前使用的 Android Gradle Plugin 和 Gradle。

### 查看 Android Gradle Plugin 版本

常见位置：

```kotlin
// settings.gradle.kts 或 build.gradle.kts
plugins {
    id("com.android.application") version "8.5.2" apply false
}
```

Groovy 写法：

```groovy
plugins {
    id 'com.android.application' version '8.5.2' apply false
}
```

老项目也可能写在根目录 `build.gradle`：

```groovy
buildscript {
    dependencies {
        classpath 'com.android.tools.build:gradle:7.4.2'
    }
}
```

### 查看 Gradle 版本

看 `gradle/wrapper/gradle-wrapper.properties`：

```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.7-bin.zip
```

这里的 `8.7` 就是项目使用的 Gradle Wrapper 版本。

### 选择 JDK 的经验规则

| 项目情况 | Gradle JDK 选择 |
| --- | --- |
| AGP 8.x / 9.x 项目 | 优先 JDK 17 |
| AGP 7.x 项目 | 优先 JDK 11 或 17，具体看构建报错与 Gradle 版本 |
| AGP 4.x 老项目 | 优先 JDK 8 或 11，避免直接上 JDK 17+ |
| 不确定版本 | 先运行 `./gradlew --version` 和一次 Sync，看错误提示 |

实际工程里以项目的 AGP、Gradle Wrapper 和报错信息为准。版本信息变化很快，长期维护文档里不放完整对照表，避免读者按过期表格处理问题。

## 常见报错处理

### Unsupported class file major version

常见原因：Gradle 或插件运行在不匹配的 JDK 上。

处理步骤：

1. 执行 `./gradlew --version | grep "JVM"`，确认当前构建 JDK。
2. 查看项目 AGP 和 Gradle Wrapper 版本。
3. 在 Gradle JDK 里切换到更匹配的 JDK。
4. 重新 Sync。

常见 major version 对照：

| major version | Java 版本 |
| --- | --- |
| 52 | Java 8 |
| 55 | Java 11 |
| 61 | Java 17 |
| 65 | Java 21 |

### Android Gradle plugin requires Java 17

原因：当前 AGP 需要 Java 17，但 Gradle JDK 使用了更低版本。

处理：

```text
Gradle JDK -> 选择 jbr-17 或本机 JDK 17 -> Sync
```

然后验证：

```bash
./gradlew --version | grep "JVM"
```

### Gradle JDK version too high

原因：老项目使用较旧 Gradle 或 AGP，却运行在过高 JDK 上。

处理：

1. 不要先升级 Android Studio。
2. 把 Gradle JDK 切回 JDK 8、11 或 17 中更接近项目年代的版本。
3. 如果必须使用新 JDK，再分步骤升级 Gradle Wrapper 和 AGP。

### IDE 代码飘红但命令行能构建

这通常不是 Gradle JDK 问题。

处理顺序：

1. `File -> Sync Project with Gradle Files`
2. `File -> Invalidate Caches...`
3. 检查 Project SDK。
4. 检查模块 SDK、源码目录标记、Gradle source set。

## 推荐排查流程

从最可验证的地方开始，不要凭感觉改配置：

```text
1. 复制完整错误信息
2. ./gradlew --version 看 JVM
3. 看 AGP 版本
4. 看 Gradle Wrapper 版本
5. 切 Gradle JDK
6. Sync
7. 仍失败再考虑升级 Gradle / AGP
```

排查时尽量一次只改一个变量。比如只切 Gradle JDK，然后 Sync；不要同时改 JDK、Gradle、AGP、compileSdk，否则很难判断到底是哪一步修好了问题。

## 最小结论

- 构建失败：先查 Gradle JDK。
- 代码飘红：先 Sync 和清缓存，再查 Project SDK。
- IDE 自己异常：才考虑 IDE Runtime。
- 长期项目不要依赖静态版本表，直接看项目文件和实际报错。
