
# Gradle

## 概述

Gradle 是一个基于 Apache Ant 和 Apache Maven 概念的项目自动化构建开源工具。它使用一种基于 Groovy 的特定领域语言(DSL)来声明项目设置，而不是传统的 XML，使得构建脚本更加简单易懂，通知gradle也支持基于Kotlin语言的Kotlin DSL,提供了更多选择。

## gradle优势

灵活性: Gradle允许你使用任何你喜欢的构建脚本语言，并提供强大的自定义任务类型功能。
性能：Gradle出色的构建性能，尤其对大型项目，它支持构建缓存，守护进程和并行执行，可以显著提高构建速度。
依赖管理：Gradle提供强大的依赖管理功能，可以自动处理依赖项的下载、版本控制和冲突解决。
多项目支持：Gradle支持多项目构建，你可以定义多个项目，并在它们之间共享配置和依赖项。
插件系统：Gradle拥有庞大的插件生态系统，涵盖了各种构建任务和工具。
社区支持：Gradle拥有庞大的社区支持，有大量的文档、教程和插件可供使用。

## gradle安装

### 安装工具

多版本管理需要可以使用sdkman
<https://sdkman.io/sdks>
亲测java,maven环境管理使用sdkman相当舒适

### gradle镜像

国内镜像可以使用腾讯云：<https://mirrors.cloud.tencent.com/gradle/>

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

build.gradle.kts

``` kotlin
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
}

//配置发布插件
publishing {
    //定义发布的内容
    publications {
        //创建具体发布内容
        create<MavenPublication>("Publish") {
            //设置groupId
            groupId = project.group.toString()
            //设置artifactId
            artifactId = "gradle-demo"
            //设置发布内容版本
            version = project.version.toString()
            //从java组件/库中获取发布内容
            from(components["java"])

        }
    }
}

//项目组id，同maven组id
group = "com.example"

version = "0.0.1-SNAPSHOT"

//设置java配置
java {
    toolchain {
        //设置java21
        languageVersion = JavaLanguageVersion.of(21)
    }
}
/**
 *
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
    mavenCentral()
}
// !!代表强制使用该依赖，不写默认使用高版本
dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("com.belerweb:pinyin4j: 2.5.1!!") {
        //排除内部依赖 ,在运行和和编译是
//        exclude("com.xxx")
    }


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

    /**
        测试时包括,类似maven下面配置
         <dependency>
             <groupId>org.springframework.boot</groupId>
             <artifactId>spring-boot-starter-test</artifactId>
             <scope>test</scope>
         </dependency>
     */

    testImplementation("org.springframework.boot:spring-boot-starter-test")

    //测试运行时包含
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")

    /**
    <dependency>
        <groupId>mysql</groupId>
        <artifactId>mysql-connector-java</artifactId>
        <scope>8.0.33</scope>
    </dependency>
     */
    runtimeOnly("mysql:mysql-connector-java:8.8.33")


}

//任务配置块，针对特定类型的任务进行配置
tasks.withType<Test> {
    //使用JUnit Platform来进行测试，这是JUnit5推荐的方式
    useJUnitPlatform()
}
```
