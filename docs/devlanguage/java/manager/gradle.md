# Gradle

一个库存 SDK 增加了代码生成步骤：先读模型文件，再生成源码，最后编译、测试并打包。把命令写成几个脚本能暂时跑通，但构建系统还要知道“谁依赖谁、什么变化需要重做、结果是否能复用”。Gradle 用项目模型、依赖配置和任务图表达这些关系。

本文采用 **Gradle 8.11.1、JDK 17、Kotlin DSL** 作为可复现实验基线。它不是当前生产版本推荐：升级时需要核对所选 Gradle、运行 JDK、Java 工具链和第三方插件的兼容矩阵。例如 Gradle 8.11.1 可以运行于 JDK 17，但不能据此推断它也支持运行于 JDK 25；Gradle 9 的运行 JDK 下限也不同。

## 模型与任务图

![Gradle的项目模型与任务执行关系](/java/gradle-task-graph.svg)

`settings.gradle.kts` 定义构建中的项目、插件解析和依赖仓库策略；各项目的 `build.gradle.kts` 应用插件、声明依赖并注册任务。Gradle 先初始化与配置模型，再选择请求任务及其依赖，最后执行任务动作。不要把“脚本从上到下读取”理解为“所有 doLast 按源码顺序执行”。

例如 `build` 是 Java 插件提供的生命周期任务，它通过依赖关系触发 `assemble` 和 `check`；后者通常包含测试。自定义 `verifySchema` 若没有接到 `check` 上，执行 `build` 不会自动运行它。任务是一项构建工作，不具有数据库事务那样的原子性；失败后可能留下部分文件，需要任务自己正确管理输出。

| 关系 | 加入任务图 | 执行效果 |
| --- | --- | --- |
| `dependsOn` | 是 | 本任务依赖前置工作完成 |
| 输出 Provider | 通常可推导生产者 | 消费者取其输出作为输入，表达数据与执行关系 |
| `mustRunAfter` | 否 | 两者都在图中时约束顺序 |
| `finalizedBy` | 是 | 安排清理或收尾，包含前任务失败的场景 |

`--continue` 会继续执行不依赖失败结果的任务，整次构建仍失败；`-x test` 则排除测试，不能作为验证通过的证据。

## Wrapper 与三个仓库入口

有 Wrapper 的项目优先使用项目里的版本：

```bash
./gradlew --version
./gradlew tasks --all
./gradlew build
```

Windows 使用 `gradlew.bat`。Wrapper 脚本、JAR 和 properties 应一起提交；`distributionUrl` 在 `gradle/wrapper/gradle-wrapper.properties`，不是在全局 `gradle.properties` 中设置一个名为 `gradle.wrapperUrl` 的系统属性。分发包的 SHA-256 应按官方校验值配置 `distributionSha256Sum`，不能随手填一个摘要。

若已有可信 Gradle 安装，可为本文实验生成 Wrapper：

```bash
gradle wrapper --gradle-version 8.11.1 --distribution-type bin
./gradlew --version
```

Wrapper 只固定 Gradle 分发版本；它不自动安装任意 JDK。工具链查找失败时，先确认所需 JDK 已安装，或为构建显式配置工具链下载服务。

| 入口 | 配置位置 | 负责什么 |
| --- | --- | --- |
| Gradle 分发包 | `gradle-wrapper.properties` | 启动哪一版 Gradle |
| 插件仓库 | Settings 中 `pluginManagement.repositories` | `plugins {}` 的插件解析 |
| 业务依赖仓库 | Settings 中 `dependencyResolutionManagement.repositories` | 应用与测试的库 |

不能靠在普通 `repositories` 里添加插件门户，解决所有插件解析失败。企业代理也应分别覆盖这几个入口，保留 HTTPS 与必要的认证。避免全局 init 脚本偷偷重写所有仓库，否则本地与 CI 很难对齐。

## 一个可运行的订单构建

下载 [订单构建示例](/java/examples/order-build-lab.zip)，解压后进入 `order-build-lab`。它与 [Maven](./maven.md) 使用同一份源码和 4 个 JUnit 测试，以整数“分”计算订单行金额，覆盖正常值、零价格、非法数量和溢出。这里没有真实数据库或支付调用。

`settings.gradle.kts`：

```kotlin
pluginManagement {
    repositories {
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        mavenCentral()
    }
}

rootProject.name = "order-build-lab"
```

`pluginManagement` 应在 Settings 的相应前置位置，名称不是 `pluginsManagement`。本例拒绝项目内再次声明仓库，避免仓库策略分散；所以不要再向 `build.gradle.kts` 添加 `repositories {}`。Version Catalog 已是稳定机制，不需要旧的 `VERSION_CATALOGS` 特性预览开关。

最小 `build.gradle.kts`：

```kotlin
plugins {
    java
}

group = "example.orders"
version = "1.0.0-SNAPSHOT"

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}

tasks.withType<JavaCompile>().configureEach {
    options.release.set(17)
    options.encoding = "UTF-8"
}

dependencies {
    testImplementation(platform("org.junit:junit-bom:5.10.2"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()
}
```

Java 插件提供标准目录与任务，`useJUnitPlatform()` 选择测试平台，测试运行时还要有引擎与启动器。下载包中另有下节的资源生成任务；这里先保留 Java 构建的最小结构。固定 JUnit 版本仅用于重现实验，不表示应该在新项目中长期使用这一旧版本。

先查看图，再执行构建：

```bash
./gradlew build --dry-run
./gradlew clean build
jar tf build/libs/order-build-lab-1.0.0-SNAPSHOT.jar
java -cp build/libs/order-build-lab-1.0.0-SNAPSHOT.jar example.orders.OrderTotal
```

`--dry-run` 只列出计划，不执行测试。实际构建后查看 `build/reports/tests/test/index.html` 和 `build/test-results/test/`，应有 4 个测试且全部通过，主类输出 `5970`。普通 JAR 不包含测试依赖，也不会因写了 `Main-Class` 就自动获得所有运行依赖；本例用 `-cp` 明确入口。

## 自定义任务要表达输入与输出

下载包生成一个 `build-info.properties`，将它作为资源放进 JAR。下面代码放在同一个 `build.gradle.kts` 中；导入位于文件顶部，类型与注册部分放在已有插件和依赖配置之后。

```kotlin
import org.gradle.api.DefaultTask
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.CacheableTask
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.OutputFile
import org.gradle.api.tasks.TaskAction

@CacheableTask
abstract class WriteBuildInfo : DefaultTask() {
    @get:Input
    abstract val releaseName: Property<String>

    @get:OutputFile
    abstract val destination: RegularFileProperty

    @TaskAction
    fun writeInfo() {
        val name = releaseName.get()
        require(name.matches(Regex("[A-Za-z0-9._-]+")))
        val output = destination.get().asFile
        output.parentFile.mkdirs()
        output.writeText("release=$name\n", Charsets.UTF_8)
    }
}

val writeBuildInfo = tasks.register<WriteBuildInfo>("writeBuildInfo") {
    releaseName.set(providers.gradleProperty("buildVersion").orElse("1.0.0"))
    destination.set(layout.buildDirectory.file("generated/build-info/build-info.properties"))
}

tasks.processResources {
    from(writeBuildInfo)
}
```

`from(writeBuildInfo)` 同时指定资源来源与生产者。若只用一个裸路径字符串，Gradle 未必知道先运行哪个任务。生成任务写独立目录，`processResources` 再复制到自己的目录，避免两个任务争写同一输出。

版本名是显式输入，文件是显式输出，动作中不读取 `project` 或当前时间。同一输入生成同一内容，才具备复用前提。如果把当前时间、Git 命令或环境变量藏在动作里又不声明输入，任务可能错误地显示 `UP-TO-DATE`，把旧结果带进新包。需要提交号时，应通过 Provider 传入可追踪的输入。

## 三种复用机制

![Gradle任务复用与配置缓存的区别](/java/gradle-cache-boundaries.svg)

| 现象 | 复用什么 | 条件与限制 |
| --- | --- | --- |
| `UP-TO-DATE` | 当前工作目录中已有任务输出 | 输入和输出快照未变；不等于逐文件增量算法 |
| `FROM-CACHE` | 缓存中的任务输出 | 任务可缓存且键匹配，可恢复被清理的输出 |
| `Reusing configuration cache` | 已配置的任务执行模型 | 配置输入相容且任务、插件满足配置缓存约束；任务仍可能执行 |

在下载包中做下面的有限实验。先清理一次本项目输出，再连续运行两次；这样首次执行可以把实际生成结果写入构建缓存：

```bash
./gradlew clean
./gradlew writeBuildInfo --build-cache --configuration-cache -PbuildVersion=1.0.0
./gradlew writeBuildInfo --build-cache --configuration-cache -PbuildVersion=1.0.0
cat build/generated/build-info/build-info.properties
```

第一次生成 `release=1.0.0`，第二次通常显示 `UP-TO-DATE` 并复用配置缓存。若已有相同缓存，首次也可能直接恢复，状态要以真实日志为准。

再删除当前项目输出，但保留用户构建缓存：

```bash
./gradlew clean
./gradlew writeBuildInfo --build-cache --configuration-cache -PbuildVersion=1.0.0
./gradlew writeBuildInfo --build-cache --configuration-cache -PbuildVersion=1.0.1
cat build/generated/build-info/build-info.properties
```

相同输入应可出现 `FROM-CACHE`；改输入后文件必须变为 `release=1.0.1`。这验证输入合同，不是在测生产 CI 加速比。网络下载缓存、Daemon 和 JVM 预热是另外的机制，不等同于这三种复用。

## 依赖配置与最终版本

Gradle 的 Configuration 既有声明依赖的桶，也有用于解析或提供变体的配置。以 Java 插件为例，`implementation` 用来声明，实际诊断通常看可解析的 `compileClasspath` 或 `runtimeClasspath`。

| 声明位置 | 本项目用途 | 对 Java 库消费者的影响 |
| --- | --- | --- |
| `implementation` | 主代码编译与运行 | 隐藏于消费者编译 API 之外，但仍可传递到运行时 |
| `api` | 公开 API 暴露依赖类型 | 进入消费者编译路径；需要 `java-library` 插件 |
| `compileOnly` | 仅编译需要 | 不自动供运行时使用，也不等于所有测试编译都继承 |
| `runtimeOnly` | 主程序运行需要 | 例如通过服务发现加载的 JDBC 驱动 |
| `annotationProcessor` | javac 处理器路径 | 与普通编译可见性是不同合同 |
| `testImplementation` / `testRuntimeOnly` | 测试编译与执行 | 不作为主程序运行依赖发布 |

例如 SDK 的公开方法返回第三方类型，消费者编译也需要那个库，可以用 `api`；仅内部序列化用到的库用 `implementation`。后者不表示依赖在消费者运行时消失。若使用 Lombok，通常同时声明 `compileOnly` 和 `annotationProcessor`；`compileOnly.extendsFrom(annotationProcessor)` 的继承方向也不能读反。

```bash
./gradlew dependencies --configuration runtimeClasspath
./gradlew dependencies --configuration testRuntimeClasspath
./gradlew dependencyInsight --dependency junit-jupiter --configuration testRuntimeClasspath
```

一般冲突解析倾向选择较高版本，但 strict 约束、platform、能力冲突和规则都可能改变结果。不要把 `!!` 理解为不考虑任何约束的“绝对强制”；它表达严格版本要求，约束不兼容时可能解析失败。先看 `dependencyInsight` 的选择原因，再改依赖或管理策略。

Version Catalog 为坐标、版本与插件提供别名，BOM/platform 为一组相关库提供版本约束，两者不是同一层功能。Catalog 中写一个版本别名，不保证最终解析就选它；BOM 也不会自动应用 Spring Boot 插件。依赖锁定固定解析选择，校验元数据验证下载内容，二者同样需要区分：

```kotlin
dependencyLocking {
    lockAllConfigurations()
}
```

```bash
./gradlew dependencies --write-locks
./gradlew test --write-verification-metadata sha256
```

审核并提交实际生成的 lockfile 与 `gradle/verification-metadata.xml`。首次生成摘要只记录当前下载结果，不能代替可信来源核对；校验的生成与更新不是一个虚构的 `dependencyVerification { verify(...) }` DSL。

## 多项目与插件复用

根 Settings 用 `include("app", "order-core")` 定义子项目，`app` 中声明 `implementation(project(":order-core"))` 建立依赖。执行 `./gradlew :app:build` 会带上所需生产者任务；仅在 Settings 包含项目，不表示所有项目互相依赖。根工程与子项目各自需要相应插件，不能假设动态 `apply` 后 Kotlin DSL 的类型安全访问器一定已生成。

`includeBuild("../inventory-sdk")` 纳入的是另一个独立构建，可用于本地联调或构建逻辑；它与 `include` 子项目不同。共享规则较多时可以用 `buildSrc` 或独立 `build-logic` 约定插件，后者需要正确设置插件构建与 `pluginManagement.includeBuild`。先把一处重复规则提炼成插件，再逐步迁移，不用一个巨大的 `allprojects` 隐式修改所有模块。

公共 SDK 发布可使用 `maven-publish` 与 `from(components["java"])`；这发布 Java 组件及元数据，不等于发布完整可执行 Boot 服务。Boot 的 `bootJar`、普通 `jar`、源码包和 Javadoc 包应分别确认用途、任务与坐标。库发布到仓库和服务部署到服务器也是两种操作，发布前核对版本、目标仓库及认证。

## CI 与排错闭环

CI 应先输出 Wrapper 与 JDK 版本，再执行与本地相同的 `./gradlew build`，保存测试 XML、HTML 报告和产物标识。缓存恢复后仍要运行验证。外部贡献分支不应获得内部仓库发布凭据或写入团队可信远程构建缓存的权限。

遇到慢构建，先按下载、配置、任务执行和测试分段计时；不要把固定 `-Xmx4g`、固定 worker 数和全局开启缓存当作普遍修复。工作进程、测试 JVM、Daemon 及其他工具会共同争用容器预算。可先生成本地报告：

```bash
./gradlew build --profile
./gradlew build --info --stacktrace
./gradlew help --task test
```

`--scan` 可能向远端服务发布构建信息，应先理解当前插件、目标服务与数据策略。纯本地定位可以先用 `--profile`、日志和测试报告。

| 现象 | 下一步 | 修复后的验收 |
| --- | --- | --- |
| 插件下载失败 | 查 `pluginManagement`、插件 ID/版本、代理与证书 | 明确实际解析来源，干净环境也能解析 |
| 库版本与预期不同 | 对实际配置运行 `dependencyInsight` | 核对选择原因和最终运行包 |
| 构建成功却没有测试 | 查引擎、过滤、`NO-SOURCE`、跳过参数和报告数量 | 预期测试确实执行，失败用例会让构建失败 |
| 任务没执行 | 查是否在图中、依赖、`onlyIf` 和复用状态 | 改真实输入能触发，未变输入能正确复用 |
| 配置缓存报错 | 查问题报告中的任务/插件和执行期模型访问 | 修复后连续两次运行并核对产物 |
| 本地成功、CI 失败 | 查 JDK、Wrapper、环境属性、仓库与工具链 | 在同一合同下复现、修复并重跑 |

配套 [Gradle 视频系列](https://www.bilibili.com/video/BV1d2K96wE4L) 按模型、任务图、插件、依赖变体、缓存和发布展开。对照本文实验时，以真实任务日志、测试数量和输出文件为准，不用“BUILD SUCCESSFUL”代替完整验收。
