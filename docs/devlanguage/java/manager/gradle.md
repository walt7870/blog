
# Gradle

## 概述

Gradle 是一个基于 Apache Ant 和 Apache Maven 概念的项目自动化构建开源工具。它使用一种基于 Groovy 的特定领域语言(DSL)来声明项目设置，而不是传统的 XML，使得构建脚本更加简单易懂。Gradle 也支持基于 Kotlin 语言的 Kotlin DSL，提供了更多选择和更好的 IDE 支持。

Gradle 采用了基于有向无环图（DAG）的任务执行模型，支持增量构建、构建缓存和并行执行，在大型项目中表现出色。它结合了 Ant 的灵活性和 Maven 的约定优于配置理念，成为现代 Java 项目构建的首选工具之一。

## Gradle 优势

**高性能构建**：支持增量构建、构建缓存、守护进程和并行执行，显著提高构建速度。

**灵活的 DSL**：支持 Groovy 和 Kotlin DSL，提供强大的脚本编写能力和优秀的 IDE 支持。

**强大的依赖管理**：自动处理依赖下载、版本控制和冲突解决，支持动态版本和依赖替换。

**多项目支持**：原生支持多项目构建，可以在项目间共享配置和依赖。

**丰富的插件生态**：拥有庞大的插件生态系统，涵盖各种构建任务和工具。

**约定与灵活性并存**：提供合理的默认约定，同时允许高度自定义。

**构建缓存**：支持本地和远程构建缓存，避免重复构建。

**增量构建**：只构建发生变化的部分，大幅提升构建效率。

## Gradle 安装

### 前置条件

确保系统已安装 JDK 8 或更高版本：

```bash
java -version
javac -version
```

### 安装方式

#### 1. 使用 SDKMAN（推荐）

SDKMAN 是管理多个 SDK 版本的优秀工具，支持 Java、Gradle、Maven 等：

```bash
# 安装 SDKMAN
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"

# 安装 Gradle
sdk install gradle

# 查看可用版本
sdk list gradle

# 安装特定版本
sdk install gradle 8.5

# 切换版本
sdk use gradle 8.5

# 设置默认版本
sdk default gradle 8.5
```

#### 2. 使用包管理器

**macOS (Homebrew)**：
```bash
brew install gradle
```

**Ubuntu/Debian**：
```bash
sudo apt update
sudo apt install gradle
```

**Windows (Chocolatey)**：
```bash
choco install gradle
```

#### 3. 手动安装

从 [Gradle 官网](https://gradle.org/releases/) 下载二进制包：

```bash
# 下载并解压
wget https://services.gradle.org/distributions/gradle-8.5-bin.zip
unzip gradle-8.5-bin.zip
sudo mv gradle-8.5 /opt/gradle

# 配置环境变量
echo 'export GRADLE_HOME=/opt/gradle' >> ~/.bashrc
echo 'export PATH=$GRADLE_HOME/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

#### 4. 使用 Gradle Wrapper（项目级别）

Gradle Wrapper 是推荐的方式，确保项目使用特定版本的 Gradle：

```bash
# 在现有项目中添加 Wrapper
gradle wrapper --gradle-version 8.5

# 使用 Wrapper 执行构建
./gradlew build  # Unix/Linux/macOS
gradlew.bat build  # Windows
```

### 验证安装

```bash
gradle -v
```

### Gradle 镜像配置

#### 全局配置

在 `~/.gradle/gradle.properties` 中配置：

```properties
# 使用阿里云镜像
systemProp.gradle.wrapperUrl=https://mirrors.aliyun.com/macports/distfiles/gradle/gradle-8.5-bin.zip

# JVM 参数优化
org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m

# 启用并行构建
org.gradle.parallel=true

# 启用构建缓存
org.gradle.caching=true

# 启用配置缓存
org.gradle.configuration-cache=true
```

#### 仓库镜像配置

在 `~/.gradle/init.gradle` 中配置：

```groovy
allprojects {
    repositories {
        maven { url 'https://maven.aliyun.com/repository/public/' }
        maven { url 'https://maven.aliyun.com/repository/spring/' }
        maven { url 'https://maven.aliyun.com/repository/spring-plugin/' }
        maven { url 'https://maven.aliyun.com/repository/gradle-plugin/' }
        maven { url 'https://maven.aliyun.com/repository/google/' }
        maven { url 'https://maven.aliyun.com/repository/jcenter/' }
        mavenCentral()
        gradlePluginPortal()
    }
}
```

### Gradle 守护进程

Gradle 守护进程可以显著提高构建性能：

```bash
# 启动守护进程
gradle --daemon

# 停止守护进程
gradle --stop

# 查看守护进程状态
gradle --status

# 禁用守护进程（单次构建）
gradle --no-daemon build
```

## 新建项目

使用spring initializr新建项目
目录结构：
``` txt
.
├── HELP.md
├── build.gradle.kts
├── gradle
│   └── wrapper
│       ├── gradle-wrapper.jar
│       └── gradle-wrapper.properties
├── gradlew
├── gradlew.bat
├── settings.gradle.kts
└── src
    ├── main
    │   ├── java
    │   │   └── com
    │   │       └── example
    │   │           └── gradledemo
    │   │               └── GradleDemoApplication.java
    │   └── resources
    │       ├── application.properties
    │       ├── static
    │       └── templates
    └── test
        └── java
            └── com
                └── example
                    └── gradledemo
                        └── GradleDemoApplicationTests.java
```

### 目录文件说明

``` txt
src: 源代码目录  
-- main: 主目录  
-- -- java: Java 源代码目录  
-- -- resources: 资源目录  
--test: 测试代码目录  
gradle: Gradle 构建目录  
-- wrapper: Gradle 包装器目录  
-- -- gradle-wrapper.jar: Gradle 包装器 JAR 文件  
-- -- gradle-wrapper.properties: Gradle 包装器配置文件  
build.gradle.kts 使用kotlin DSL编写的构建脚本，包括依赖、仓库、插件等  
settings.gradle.kts 使用kotlin DSL编写的全局设置脚本  
gradlew: Unix 系统下的 Gradle 包装器脚本  
gradlew.bat: Windows 系统下的 Gradle 包装器脚本  
```

### 配置文件说明

#### build.gradle.kts 详解

##### 基础配置

```kotlin
// 插件声明，用于指定项目构建所需要的插件
plugins {
    //gradle内部的java插件，支持构建java项目
    java
    //使用springboot插件，并且指定版本，支持springboot项目构建
    id("org.springframework.boot") version "3.4.5"
    //使用spring依赖管理插件，指定版本，管理spring项目依赖关系
    id("io.spring.dependency-management") version "1.1.7"
    //引入maven-publish插件
    id("maven-publish")
    // 代码质量插件
    id("org.sonarqube") version "4.4.1.3373"
    // 测试覆盖率插件
    jacoco
}

//项目组id，同maven组id
group = "com.example"
version = "0.0.1-SNAPSHOT"
description = "Gradle 示例项目"

//设置java配置
java {
    toolchain {
        //设置java21
        languageVersion = JavaLanguageVersion.of(21)
    }
    // 生成源码 JAR
    withSourcesJar()
    // 生成 Javadoc JAR
    withJavadocJar()
}

/**
 * 让 compileOnly 配置继承 annotationProcessor配置中的所有依赖,
 * 这样，添加到 compileOnly 中的任何库也将被视为注解处理器，
 * 但仅在编译时使用不会在运行时包含在内。
 */
configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

//指定仓库
repositories {
    // 阿里云镜像（国内推荐）
    maven("https://maven.aliyun.com/repository/public/")
    maven("https://maven.aliyun.com/repository/spring/")
    // Maven 中央仓库
    mavenCentral()
    // Gradle 插件门户
    gradlePluginPortal()
    // 本地仓库
    mavenLocal()
}

// !!代表强制使用该依赖，不写默认使用高版本
dependencies {
    // Spring Boot 依赖
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    
    // 工具库
    implementation("com.belerweb:pinyin4j:2.5.1!!") {
        //排除内部依赖 ,在运行和和编译是
//        exclude("com.xxx")
    }
    implementation("com.google.guava:guava:32.1.3-jre")
    implementation("org.apache.commons:commons-lang3:3.13.0")
    
    // JSON 处理
    implementation("com.fasterxml.jackson.core:jackson-databind")

    /*扫描Lib目录下所有jar，并增加到依赖中*/
    implementation(fileTree("lib"))

    //仅在编译时使用，类似maven  scope  provided
    compileOnly("org.projectlombok:lombok")

    /**
        你在类上使用Lombok提供的注解(如@Getter、@Setter等)时，
        Lombok的注解处理器会自动为你的类生成getter和setter方法，这样你就不需要手动编写这些方法了。
        为了让Gradle知道在编译时要调用Lombok的注解处理器你就需要在Gradle构建脚本中添加Lombok作为annotationProcessor的依赖。
     **/
    annotationProcessor("org.projectlombok:lombok")
    annotationProcessor("org.springframework.boot:spring-boot-configuration-processor")

    /**
        测试时包括,类似maven下面配置
         <dependency>
             <groupId>org.springframework.boot</groupId>
             <artifactId>spring-boot-starter-test</artifactId>
             <scope>test</scope>
         </dependency>
     */
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.1")
    testImplementation("org.mockito:mockito-core:5.7.0")
    testImplementation("org.testcontainers:junit-jupiter:1.19.3")

    //测试运行时包含
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")

    /**
    <dependency>
        <groupId>mysql</groupId>
        <artifactId>mysql-connector-java</artifactId>
        <scope>8.0.33</scope>
    </dependency>
     */
    runtimeOnly("mysql:mysql-connector-java:8.0.33")
    runtimeOnly("com.h2database:h2")
    
    // 开发时依赖
    developmentOnly("org.springframework.boot:spring-boot-devtools")
}

//配置发布插件
publishing {
    //定义发布的内容
    publications {
        //创建具体发布内容
        create<MavenPublication>("maven") {
            //设置groupId
            groupId = project.group.toString()
            //设置artifactId
            artifactId = "gradle-demo"
            //设置发布内容版本
            version = project.version.toString()
            //从java组件/库中获取发布内容
            from(components["java"])
            
            pom {
                name.set("Gradle 示例项目")
                description.set("这是一个 Gradle 构建的示例项目")
                url.set("https://github.com/example/gradle-demo")
                
                licenses {
                    license {
                        name.set("Apache License 2.0")
                        url.set("https://www.apache.org/licenses/LICENSE-2.0")
                    }
                }
                
                developers {
                    developer {
                        id.set("developer")
                        name.set("开发者")
                        email.set("developer@example.com")
                    }
                }
            }
        }
    }
    
    repositories {
        maven {
            name = "GitHubPackages"
            url = uri("https://maven.pkg.github.com/example/gradle-demo")
            credentials {
                username = project.findProperty("gpr.user") as String? ?: System.getenv("USERNAME")
                password = project.findProperty("gpr.key") as String? ?: System.getenv("TOKEN")
            }
        }
    }
}

// 任务配置
tasks {
    // 测试任务配置
    test {
        useJUnitPlatform()
        testLogging {
            events("passed", "skipped", "failed")
            exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
        }
        finalizedBy(jacocoTestReport)
    }
    
    // Jacoco 测试报告
    jacocoTestReport {
        dependsOn(test)
        reports {
            xml.required.set(true)
            html.required.set(true)
        }
    }
    
    // JAR 任务配置
    jar {
        manifest {
            attributes(
                "Implementation-Title" to project.name,
                "Implementation-Version" to project.version,
                "Main-Class" to "com.example.GradleDemoApplication"
            )
        }
    }
    
    // 编译任务配置
    compileJava {
        options.encoding = "UTF-8"
        options.compilerArgs.addAll(listOf("-Xlint:unchecked", "-Xlint:deprecation"))
    }
    
    // Javadoc 任务配置
    javadoc {
        options.encoding = "UTF-8"
        if (JavaVersion.current().isJava9Compatible) {
            (options as StandardJavadocDocletOptions).addBooleanOption("html5", true)
        }
    }
    
    // 自定义任务：代码格式化检查
    register("checkFormat") {
        group = "verification"
        description = "检查代码格式"
        doLast {
            println("执行代码格式检查...")
        }
    }
    
    // 自定义任务：生成版本信息
    register("generateVersionInfo") {
        group = "build"
        description = "生成版本信息文件"
        doLast {
            val versionFile = file("${buildDir}/resources/main/version.properties")
            versionFile.parentFile.mkdirs()
            versionFile.writeText("version=${project.version}\nbuildTime=${java.time.Instant.now()}")
        }
    }
    
    // 让 processResources 依赖版本信息生成
    processResources {
        dependsOn("generateVersionInfo")
    }
}

// SonarQube 配置
sonarqube {
    properties {
        property("sonar.projectKey", "gradle-demo")
        property("sonar.organization", "example")
        property("sonar.host.url", "https://sonarcloud.io")
        property("sonar.coverage.jacoco.xmlReportPaths", "${buildDir}/reports/jacoco/test/jacocoTestReport.xml")
    }
}
```

##### settings.gradle.kts 详解

```kotlin
// 项目根名称
rootProject.name = "gradle-demo"

// 包含子模块
include("app")
include("lib")
include("shared")

// 插件管理
pluginsManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
        maven("https://maven.aliyun.com/repository/gradle-plugin/")
    }
}

// 依赖解析管理
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        maven("https://maven.aliyun.com/repository/public/")
        mavenCentral()
    }
}

// 功能预览
enableFeaturePreview("TYPESAFE_PROJECT_ACCESSORS")
enableFeaturePreview("VERSION_CATALOGS")
```

## Gradle 任务管理

### 任务基础

Gradle 构建的核心是任务（Task）。每个任务代表构建过程中的一个原子操作，如编译代码、运行测试、打包 JAR 等。

#### 查看可用任务

```bash
# 查看所有任务
./gradlew tasks

# 查看所有任务（包括隐藏任务）
./gradlew tasks --all

# 查看特定组的任务
./gradlew tasks --group build
```

#### 执行任务

```bash
# 执行单个任务
./gradlew build

# 执行多个任务
./gradlew clean build

# 排除特定任务
./gradlew build -x test

# 继续执行（忽略失败）
./gradlew build --continue

# 并行执行
./gradlew build --parallel
```

### 自定义任务

#### 简单任务

```kotlin
// 注册简单任务
tasks.register("hello") {
    doLast {
        println("Hello, Gradle!")
    }
}

// 带参数的任务
tasks.register("greet") {
    group = "custom"
    description = "打招呼任务"
    
    doFirst {
        println("准备打招呼...")
    }
    
    doLast {
        val name = project.findProperty("name") ?: "World"
        println("Hello, $name!")
    }
}
```

执行：
```bash
./gradlew hello
./gradlew greet -Pname=张三
```

#### 复杂任务

```kotlin
// 文件操作任务
tasks.register<Copy>("copyDocs") {
    group = "documentation"
    description = "复制文档文件"
    
    from("src/docs")
    into("${buildDir}/docs")
    include("**/*.md")
    exclude("**/draft/**")
    
    // 文件过滤
    filter { line ->
        line.replace("@VERSION@", project.version.toString())
    }
}

// ZIP 打包任务
tasks.register<Zip>("packageDistribution") {
    group = "distribution"
    description = "打包发布文件"
    
    archiveFileName.set("${project.name}-${project.version}.zip")
    destinationDirectory.set(file("${buildDir}/distributions"))
    
    from("${buildDir}/libs") {
        include("*.jar")
        into("lib")
    }
    
    from("src/main/scripts") {
        include("**/*")
        into("bin")
        fileMode = 0755
    }
    
    from("README.md", "LICENSE")
}

// 代码生成任务
tasks.register("generateBuildInfo") {
    group = "build"
    description = "生成构建信息"
    
    val outputDir = file("${buildDir}/generated/sources/buildInfo")
    outputs.dir(outputDir)
    
    doLast {
        outputDir.mkdirs()
        val buildInfoFile = file("${outputDir}/BuildInfo.java")
        buildInfoFile.writeText("""
            package com.example.generated;
            
            public class BuildInfo {
                public static final String VERSION = "${project.version}";
                public static final String BUILD_TIME = "${java.time.Instant.now()}";
                public static final String GIT_COMMIT = "${getGitCommit()}";
            }
        """.trimIndent())
    }
}

// 获取 Git 提交信息的辅助函数
fun getGitCommit(): String {
    return try {
        val process = ProcessBuilder("git", "rev-parse", "--short", "HEAD")
            .directory(rootDir)
            .start()
        process.inputStream.bufferedReader().readText().trim()
    } catch (e: Exception) {
        "unknown"
    }
}

// 让编译任务依赖代码生成
tasks.compileJava {
    dependsOn("generateBuildInfo")
    source("${buildDir}/generated/sources/buildInfo")
}
```

### 任务依赖

```kotlin
// 任务依赖关系
tasks.register("taskA") {
    doLast { println("执行任务 A") }
}

tasks.register("taskB") {
    dependsOn("taskA")
    doLast { println("执行任务 B") }
}

tasks.register("taskC") {
    dependsOn("taskA", "taskB")
    doLast { println("执行任务 C") }
}

// 条件依赖
tasks.register("conditionalTask") {
    onlyIf {
        project.hasProperty("runConditional")
    }
    doLast {
        println("条件任务执行")
    }
}

// 最终化任务
tasks.test {
    finalizedBy("jacocoTestReport")
}

// 任务排序
tasks.register("taskX") {
    doLast { println("任务 X") }
}

tasks.register("taskY") {
    mustRunAfter("taskX")
    doLast { println("任务 Y") }
}
```

### 任务配置

```kotlin
// 配置现有任务
tasks.withType<JavaCompile> {
    options.encoding = "UTF-8"
    options.compilerArgs.addAll(listOf(
        "-Xlint:unchecked",
        "-Xlint:deprecation",
        "-parameters"
    ))
}

tasks.withType<Test> {
    useJUnitPlatform()
    
    // 测试 JVM 参数
    jvmArgs("-Xmx1024m", "-XX:+HeapDumpOnOutOfMemoryError")
    
    // 系统属性
    systemProperty("spring.profiles.active", "test")
    
    // 环境变量
    environment("TEST_ENV", "gradle")
    
    // 测试日志
    testLogging {
        events("passed", "skipped", "failed", "standardOut", "standardError")
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
        showStandardStreams = false
    }
    
    // 测试过滤
    filter {
        includeTestsMatching("*IntegrationTest")
        excludeTestsMatching("*SlowTest")
    }
    
    // 并行测试
    maxParallelForks = Runtime.getRuntime().availableProcessors().div(2).takeIf { it > 0 } ?: 1
}

// JAR 任务配置
tasks.jar {
    archiveBaseName.set("my-app")
    archiveVersion.set(project.version.toString())
    archiveClassifier.set("")
    
    manifest {
        attributes(
            "Implementation-Title" to project.name,
            "Implementation-Version" to project.version,
            "Implementation-Vendor" to "Example Corp",
            "Built-By" to System.getProperty("user.name"),
            "Built-JDK" to System.getProperty("java.version"),
            "Built-Gradle" to gradle.gradleVersion,
            "Main-Class" to "com.example.Application"
        )
    }
    
    // 排除文件
    exclude("**/*.tmp")
    exclude("**/test/**")
    
    // 重复文件策略
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
}
```

## Gradle 依赖管理

### 依赖配置

Gradle 使用配置（Configuration）来管理不同类型的依赖：

```kotlin
dependencies {
    // 编译和运行时都需要
    implementation("org.springframework:spring-core:5.3.21")
    
    // 仅编译时需要
    compileOnly("org.projectlombok:lombok:1.18.24")
    
    // 仅运行时需要
    runtimeOnly("mysql:mysql-connector-java:8.0.33")
    
    // API 依赖（会传递给依赖此项目的其他项目）
    api("com.google.guava:guava:31.1-jre")
    
    // 测试编译和运行时
    testImplementation("org.junit.jupiter:junit-jupiter:5.8.2")
    
    // 仅测试运行时
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
    
    // 注解处理器
    annotationProcessor("org.springframework.boot:spring-boot-configuration-processor")
    
    // 测试注解处理器
    testAnnotationProcessor("org.mapstruct:mapstruct-processor:1.5.2.Final")
}
```

### 依赖声明方式

```kotlin
dependencies {
    // 外部依赖
    implementation("group:artifact:version")
    implementation("org.apache.commons:commons-lang3:3.12.0")
    
    // 带分类器的依赖
    implementation("org.springframework:spring-core:5.3.21:sources")
    
    // 平台依赖（BOM）
    implementation(platform("org.springframework.boot:spring-boot-dependencies:2.7.0"))
    
    // 项目依赖
    implementation(project(":shared"))
    implementation(project(":lib:utils"))
    
    // 文件依赖
    implementation(files("libs/custom.jar"))
    implementation(fileTree("libs") { include("*.jar") })
    
    // 渐变依赖
    implementation(gradleApi())
    implementation(localGroovy())
}
```

### 版本管理

#### 版本范围

```kotlin
dependencies {
    // 精确版本
    implementation("com.google.guava:guava:31.1-jre")
    
    // 动态版本
    implementation("com.google.guava:guava:31.+")
    implementation("com.google.guava:guava:latest.release")
    
    // 版本范围
    implementation("com.google.guava:guava:[30.0, 32.0)")
    
    // 强制版本
    implementation("com.google.guava:guava:31.1-jre!!") {
        version {
            strictly("31.1-jre")
        }
    }
}
```

#### 版本目录（Version Catalogs）

创建 `gradle/libs.versions.toml`：

```toml
[versions]
spring-boot = "3.2.0"
junit = "5.10.1"
guava = "32.1.3-jre"

[libraries]
spring-boot-starter-web = { module = "org.springframework.boot:spring-boot-starter-web", version.ref = "spring-boot" }
spring-boot-starter-test = { module = "org.springframework.boot:spring-boot-starter-test", version.ref = "spring-boot" }
junit-jupiter = { module = "org.junit.jupiter:junit-jupiter", version.ref = "junit" }
guava = { module = "com.google.guava:guava", version.ref = "guava" }

[bundles]
spring-boot = ["spring-boot-starter-web"]
testing = ["spring-boot-starter-test", "junit-jupiter"]

[plugins]
spring-boot = { id = "org.springframework.boot", version.ref = "spring-boot" }
```

在 `build.gradle.kts` 中使用：

```kotlin
dependencies {
    implementation(libs.spring.boot.starter.web)
    implementation(libs.guava)
    
    // 使用 bundle
    testImplementation(libs.bundles.testing)
}
```

### 依赖约束和解析

```kotlin
// 依赖约束
dependencies {
    constraints {
        implementation("org.apache.commons:commons-lang3:3.12.0")
        testImplementation("org.junit.jupiter:junit-jupiter:5.8.2")
    }
}

// 解析策略
configurations.all {
    resolutionStrategy {
        // 强制版本
        force("org.slf4j:slf4j-api:1.7.36")
        
        // 版本替换
        eachDependency {
            if (requested.group == "org.springframework") {
                useVersion("5.3.21")
            }
        }
        
        // 缓存策略
        cacheDynamicVersionsFor(10, "minutes")
        cacheChangingModulesFor(4, "hours")
        
        // 失败策略
        failOnVersionConflict()
    }
}
```

### 依赖排除和替换

```kotlin
dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web") {
        // 排除特定依赖
        exclude(group = "org.springframework.boot", module = "spring-boot-starter-tomcat")
        exclude(module = "logback-classic")
    }
    
    // 添加替代依赖
    implementation("org.springframework.boot:spring-boot-starter-jetty")
    
    // 全局排除
    configurations.all {
        exclude(group = "commons-logging", module = "commons-logging")
    }
    
    // 依赖替换
    modules {
        module("commons-logging:commons-logging") {
            replacedBy("org.slf4j:jcl-over-slf4j")
        }
    }
}
```

### 依赖分析

```bash
# 查看依赖树
./gradlew dependencies

# 查看特定配置的依赖
./gradlew dependencies --configuration implementation

# 查看依赖洞察
./gradlew dependencyInsight --dependency guava

# 构建扫描
./gradlew build --scan
```

## Gradle 多项目构建

### 项目结构

```
my-project/
├── settings.gradle.kts
├── build.gradle.kts
├── gradle.properties
├── app/
│   ├── build.gradle.kts
│   └── src/
├── lib/
│   ├── build.gradle.kts
│   └── src/
└── shared/
    ├── build.gradle.kts
    └── src/
```

### 根项目配置

**settings.gradle.kts**：
```kotlin
rootProject.name = "my-project"

include("app")
include("lib")
include("shared")

// 嵌套项目
include("services:user-service")
include("services:order-service")

// 项目目录映射
project(":services:user-service").projectDir = file("services/user")
project(":services:order-service").projectDir = file("services/order")
```

**根 build.gradle.kts**：
```kotlin
// 所有项目通用配置
allprojects {
    group = "com.example"
    version = "1.0.0"
    
    repositories {
        maven("https://maven.aliyun.com/repository/public/")
        mavenCentral()
    }
}

// 所有子项目通用配置
subprojects {
    apply(plugin = "java")
    apply(plugin = "java-library")
    
    java {
        toolchain {
            languageVersion.set(JavaLanguageVersion.of(17))
        }
    }
    
    dependencies {
        testImplementation("org.junit.jupiter:junit-jupiter:5.10.1")
    }
    
    tasks.test {
        useJUnitPlatform()
    }
}

// 特定项目配置
project(":app") {
    dependencies {
        implementation(project(":lib"))
        implementation(project(":shared"))
    }
}

project(":lib") {
    dependencies {
        api(project(":shared"))
        implementation("com.google.guava:guava:32.1.3-jre")
    }
}
```

### 项目间依赖

```kotlin
// 在子项目中声明依赖
dependencies {
    // 依赖其他子项目
    implementation(project(":shared"))
    api(project(":lib"))
    
    // 依赖特定配置
    testImplementation(project(path = ":shared", configuration = "testFixtures"))
    
    // 复合构建依赖
    implementation("com.example:external-lib")
}
```

### 复合构建

**settings.gradle.kts**：
```kotlin
rootProject.name = "my-app"

// 包含其他构建
includeBuild("../my-lib")
includeBuild("../my-plugin") {
    dependencySubstitution {
        substitute(module("com.example:my-plugin")).using(project(":"))
    }
}
```

### 构建逻辑共享

#### 约定插件

**buildSrc/src/main/kotlin/java-conventions.gradle.kts**：
```kotlin
plugins {
    java
    jacoco
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}

tasks.test {
    useJUnitPlatform()
    finalizedBy(tasks.jacocoTestReport)
}

tasks.jacocoTestReport {
    reports {
        xml.required.set(true)
        html.required.set(true)
    }
}
```

在子项目中使用：
```kotlin
plugins {
    id("java-conventions")
}
```

## Gradle 插件开发

### 简单插件

**buildSrc/src/main/kotlin/MyPlugin.kt**：
```kotlin
import org.gradle.api.Plugin
import org.gradle.api.Project

class MyPlugin : Plugin<Project> {
    override fun apply(project: Project) {
        // 创建扩展
        val extension = project.extensions.create("myPlugin", MyPluginExtension::class.java)
        
        // 注册任务
        project.tasks.register("myTask", MyTask::class.java) { task ->
            task.message.set(extension.message)
        }
    }
}

// 扩展配置
open class MyPluginExtension {
    var message: String = "Hello from plugin!"
}

// 自定义任务
import org.gradle.api.DefaultTask
import org.gradle.api.provider.Property
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.TaskAction

abstract class MyTask : DefaultTask() {
    @get:Input
    abstract val message: Property<String>
    
    @TaskAction
    fun execute() {
        println(message.get())
    }
}
```

### 插件配置

**build.gradle.kts**：
```kotlin
plugins {
    id("my-plugin")
}

myPlugin {
    message = "自定义消息"
}
```

### 发布插件

**plugin/build.gradle.kts**：
```kotlin
plugins {
    `kotlin-dsl`
    `gradle-plugin`
    `maven-publish`
}

gradlePlugin {
    plugins {
        create("myPlugin") {
            id = "com.example.my-plugin"
            implementationClass = "com.example.MyPlugin"
            displayName = "My Custom Plugin"
            description = "A custom Gradle plugin"
        }
    }
}

publishing {
    repositories {
        maven {
            name = "GitHubPackages"
            url = uri("https://maven.pkg.github.com/example/my-plugin")
            credentials {
                username = System.getenv("GITHUB_ACTOR")
                password = System.getenv("GITHUB_TOKEN")
            }
        }
    }
}
```

## Gradle 性能优化

### 构建性能配置

**gradle.properties**：
```properties
# 启用守护进程
org.gradle.daemon=true

# 并行构建
org.gradle.parallel=true

# 配置缓存
org.gradle.configuration-cache=true

# 构建缓存
org.gradle.caching=true

# JVM 参数优化
org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g -XX:+HeapDumpOnOutOfMemoryError

# 文件系统监控
org.gradle.vfs.watch=true

# 工作进程数量
org.gradle.workers.max=4
```

### 增量构建优化

```kotlin
// 任务输入输出声明
tasks.register<JavaExec>("generateCode") {
    // 输入
    inputs.files("src/main/resources/schema.json")
    inputs.property("version", project.version)
    
    // 输出
    outputs.dir("${buildDir}/generated/sources")
    
    // 任务实现
    mainClass.set("com.example.CodeGenerator")
    classpath = configurations.runtimeClasspath.get()
}

// 避免不必要的任务执行
tasks.register("conditionalTask") {
    onlyIf {
        file("trigger.txt").exists()
    }
    
    doLast {
        println("条件满足，执行任务")
    }
}
```

### 依赖优化

```kotlin
// 依赖锁定
dependencyLocking {
    lockAllConfigurations()
}

// 依赖验证
dependencyVerification {
    verify("org.apache.commons:commons-lang3:3.12.0") {
        checksum("sha256", "d919d904486c0c3d8b3e8b4b8b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b")
    }
}

// 排除传递依赖
configurations.all {
    exclude(group = "commons-logging")
    
    resolutionStrategy {
        // 缓存动态版本
        cacheDynamicVersionsFor(10, "minutes")
        cacheChangingModulesFor(4, "hours")
    }
}
```

### 构建扫描和分析

```bash
# 启用构建扫描
./gradlew build --scan

# 性能分析
./gradlew build --profile

# 依赖分析
./gradlew buildEnvironment
./gradlew dependencies
./gradlew dependencyInsight --dependency guava

# 任务分析
./gradlew tasks --all
./gradlew help --task build
```

## Gradle 与 CI/CD 集成

### GitHub Actions

**.github/workflows/ci.yml**：
```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        java: [11, 17, 21]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up JDK ${{ matrix.java }}
      uses: actions/setup-java@v4
      with:
        java-version: ${{ matrix.java }}
        distribution: 'temurin'
    
    - name: Cache Gradle packages
      uses: actions/cache@v3
      with:
        path: |
          ~/.gradle/caches
          ~/.gradle/wrapper
        key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}
        restore-keys: |
          ${{ runner.os }}-gradle-
    
    - name: Grant execute permission for gradlew
      run: chmod +x gradlew
    
    - name: Run tests
      run: ./gradlew test
    
    - name: Generate test report
      uses: dorny/test-reporter@v1
      if: success() || failure()
      with:
        name: Test Results
        path: '**/build/test-results/test/TEST-*.xml'
        reporter: java-junit
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./build/reports/jacoco/test/jacocoTestReport.xml
```

### Jenkins Pipeline

**Jenkinsfile**：
```groovy
pipeline {
    agent any
    
    tools {
        jdk 'JDK-17'
    }
    
    environment {
        GRADLE_OPTS = '-Dorg.gradle.daemon=false'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Build') {
            steps {
                sh './gradlew clean build'
            }
        }
        
        stage('Test') {
            steps {
                sh './gradlew test'
            }
            post {
                always {
                    publishTestResults testResultsPattern: '**/build/test-results/test/TEST-*.xml'
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'build/reports/tests/test',
                        reportFiles: 'index.html',
                        reportName: 'Test Report'
                    ])
                }
            }
        }
        
        stage('Code Quality') {
            steps {
                sh './gradlew sonarqube'
            }
        }
        
        stage('Package') {
            steps {
                sh './gradlew bootJar'
                archiveArtifacts artifacts: 'build/libs/*.jar', fingerprint: true
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
    }
}
```

## Gradle 最佳实践

### 项目结构

1. **使用标准目录布局**：遵循 Maven 标准目录结构
2. **合理划分子项目**：按功能模块划分，避免循环依赖
3. **使用 buildSrc**：共享构建逻辑
4. **版本目录管理**：使用 `libs.versions.toml` 统一管理版本

### 构建脚本

1. **使用 Kotlin DSL**：类型安全，IDE 支持更好
2. **避免硬编码**：使用属性和变量
3. **合理使用插件**：只应用必要的插件
4. **配置缓存**：启用配置缓存提升性能

### 依赖管理

1. **明确依赖范围**：正确使用 `api`、`implementation`、`compileOnly` 等
2. **版本管理**：使用 BOM 或版本目录统一管理
3. **避免版本冲突**：及时解决依赖冲突
4. **定期更新**：保持依赖版本更新

### 性能优化

1. **启用并行构建**：`org.gradle.parallel=true`
2. **使用构建缓存**：`org.gradle.caching=true`
3. **优化 JVM 参数**：合理设置堆内存大小
4. **增量构建**：正确声明任务输入输出

### 团队协作

1. **使用 Wrapper**：确保团队使用相同 Gradle 版本
2. **提交 Wrapper 文件**：包括 `gradle/wrapper/` 目录
3. **统一配置**：使用 `gradle.properties` 统一配置
4. **文档化**：编写清晰的构建文档

## Gradle 常见问题

### 构建问题

**问题**：构建速度慢
**解决方案**：
```bash
# 启用并行构建和缓存
echo "org.gradle.parallel=true" >> gradle.properties
echo "org.gradle.caching=true" >> gradle.properties
echo "org.gradle.configuration-cache=true" >> gradle.properties

# 优化 JVM 参数
echo "org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g" >> gradle.properties
```

**问题**：依赖下载失败
**解决方案**：
```kotlin
// 配置镜像仓库
repositories {
    maven("https://maven.aliyun.com/repository/public/")
    mavenCentral()
}
```

**问题**：版本冲突
**解决方案**：
```bash
# 查看依赖树
./gradlew dependencies

# 查看冲突详情
./gradlew dependencyInsight --dependency commons-logging
```

### 任务问题

**问题**：任务不执行
**解决方案**：
```kotlin
// 检查任务条件
tasks.register("myTask") {
    onlyIf {
        // 确保条件正确
        true
    }
}

// 强制执行
./gradlew myTask --rerun-tasks
```

**问题**：增量构建失效
**解决方案**：
```kotlin
// 正确声明输入输出
tasks.register("processFiles") {
    inputs.files("src/main/resources")
    outputs.dir("${buildDir}/processed")
    
    doLast {
        // 任务实现
    }
}
```

## 总结

Gradle 是一个功能强大、灵活性极高的构建工具，具有以下核心优势：

1. **高性能**：增量构建、构建缓存、并行执行
2. **灵活性**：强大的 DSL、丰富的插件生态
3. **可扩展性**：自定义任务、插件开发
4. **多语言支持**：Java、Kotlin、Groovy、Scala 等
5. **企业级特性**：复合构建、依赖管理、构建扫描

Gradle 适用于各种规模的项目，从简单的单模块应用到复杂的企业级多模块系统，都能提供优秀的构建体验。通过合理的配置和优化，Gradle 可以显著提升开发效率和构建性能。
