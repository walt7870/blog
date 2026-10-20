# Maven

Maven 是 Java 工程里最常见的构建与依赖管理工具。它不是单纯的“下载 jar 包工具”，而是把项目坐标、依赖版本、源码目录、测试、打包、发布和插件执行统一放进一套可重复的工程模型里。一个项目只要给出 `pom.xml`，团队成员、CI 服务器和发布流水线就能用同一套命令得到一致的构建结果。

Maven 用 `pom.xml` 描述项目，用仓库保存构件，用生命周期组织步骤，用插件执行具体工作。相同 POM 不保证所有环境产生相同结果：构建工具、JDK、插件版本、可变快照、资源过滤和环境配置都可能影响输出。本页以 Maven 3.9、JDK 17 为示例基线；Maven 4 的行为与兼容性应单独核对。

## 视频讲解

配套视频系列：[Maven 深入教程：从 POM 到依赖治理与发布部署](https://www.bilibili.com/video/BV1uEK96HEyw)。

视频更适合先建立整体图景，文章更适合回查命令、配置和排错细节。建议先按视频顺序理解 Maven 的构建链路，再回到本文对照 `pom.xml`、依赖树、生命周期、插件绑定和多模块构建。

| 分P | 主题 | 对应文章重点 |
| --- | --- | --- |
| P01 | Maven 到底在管理什么 | 项目模型、坐标、仓库、生命周期和插件的总览 |
| P02 | POM 与 effective POM | POM 结构、父 POM、继承、最终生效配置 |
| P03 | 生命周期、phase 与 plugin | 生命周期阶段如何触发插件目标 |
| P04 | 依赖解析、传递依赖与冲突 | 仓库解析、传递依赖、版本冲突处理 |
| P05 | scope 与 classpath 边界 | 编译、测试、运行、打包时的依赖可见性 |
| P06 | 仓库、本地缓存与 SNAPSHOT | 本地仓库、远程仓库、私服、快照版本 |
| P07 | BOM、parent 与版本治理 | 团队级版本收敛和依赖管理 |
| P08 | 多模块与 Reactor 构建 | 聚合、继承、模块顺序和局部构建 |
| P09 | Profile、资源过滤与环境差异 | 构建参数和环境差异的边界 |
| P10 | 测试、质量检查与构建门禁 | 单元测试、验证阶段和质量约束 |
| P11 | 发布、部署与制品管理 | `install`、`deploy`、私服和制品生命周期 |
| P12 | Maven 排查方法论 | effective POM、依赖树、插件日志和常见故障 |

![Maven 在 Java 工程中的位置](/java/maven-position.svg)

## 解决的问题

没有 Maven 时，一个 Java 项目通常需要手工完成这些事情：下载第三方 jar 包、维护编译命令、区分测试代码和业务代码、把资源文件复制到输出目录、运行测试、组装最终 jar 或 war、把公共模块交给其他项目使用。项目越大，越容易出现“本地能跑、CI 不能跑”“A 同学下载了新版本依赖、B 同学还是旧版本”“公共模块复制来复制去”的问题。

Maven 把这些不稳定的手工动作收敛成约定和配置。项目采用固定目录结构，依赖通过坐标声明，构建过程按生命周期推进，真正的编译、测试、打包由插件完成。开发者不需要记住一长串 `javac`、`jar`、复制资源的命令，只要维护项目模型，再用目标阶段触发构建。

典型工程里，Maven 负责以下边界：

| 问题 | Maven 的处理方式 |
| --- | --- |
| 项目叫什么、产物是什么 | 使用 `groupId`、`artifactId`、`version`、`packaging` 定义项目坐标 |
| 第三方库从哪里来 | 从本地仓库、私服仓库、中央仓库解析依赖 |
| 编译、测试、打包如何执行 | 生命周期阶段绑定插件目标 |
| 多个模块如何一起构建 | 父 POM 管版本，聚合 POM 管构建顺序 |
| 版本冲突如何定位 | 用依赖树、有效 POM 和插件日志还原最终结果 |

## 从 0 建立项目

一个最小 Maven 项目只需要一个 `pom.xml` 和标准源码目录：

```text
demo-order/
├── pom.xml
└── src/
    ├── main/
    │   ├── java/
    │   │   └── com/example/order/OrderApplication.java
    │   └── resources/
    │       └── application.yml
    └── test/
        └── java/
            └── com/example/order/OrderApplicationTest.java
```

`src/main/java` 放业务代码，`src/main/resources` 放运行时资源，`src/test/java` 放测试代码，`target/` 是构建输出目录。这个目录结构本身就是约定，Maven 插件会默认从这些位置读取源码、资源和测试文件。

可以用 Archetype 创建普通 Java 项目：

```bash
mvn archetype:generate \
  -DgroupId=com.example \
  -DartifactId=demo-order \
  -DarchetypeArtifactId=maven-archetype-quickstart \
  -DinteractiveMode=false
```

Spring Boot 项目常从 Spring Initializr 创建。它生成 Maven 结构、启动类、测试类和匹配的 `pom.xml`。但仓库根目录未必就是 Maven 根工程：先找实际 POM、父子模块和 README 中的构建入口；多技术仓库可能只在某个子目录使用 Maven。Archetype 也应固定版本并检查生成结果，不把旧模板默认值当成当前工具链配置。

## 安装与验证

Maven 运行依赖 JDK。安装前先确认 Java 可用：

```bash
java -version
javac -version
```

常见安装方式：

```bash
# macOS
brew install maven

# SDKMAN
sdk install maven

# Ubuntu / Debian
sudo apt update
sudo apt install maven
```

验证安装：

```bash
mvn -version
```

输出中核对 Maven 版本、Java 版本与 Java home。默认用户配置在 `~/.m2/settings.xml`，默认本地仓库为 `~/.m2/repository`，但可被配置或参数覆盖。项目已带 Wrapper 时优先运行 `./mvnw -version` 与 `./mvnw verify`；Wrapper 固定 Maven 分发版本，不会自动固定 JDK 或全部依赖。

## POM 的核心结构

`pom.xml` 是 Maven 的项目对象模型。它不是脚本，而是项目声明：这个项目是谁、依赖谁、如何构建、产物如何发布。

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.example</groupId>
    <artifactId>demo-order</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <packaging>jar</packaging>

    <properties>
        <maven.compiler.release>17</maven.compiler.release>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <junit.version>5.10.2</junit.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>${junit.version}</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.13.0</version>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-surefire-plugin</artifactId>
                <version>3.2.5</version>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-jar-plugin</artifactId>
                <version>3.4.2</version>
            </plugin>
        </plugins>
    </build>
</project>
```

坐标由 `groupId`、`artifactId`、`version` 组成。`groupId` 通常表示组织或业务域，`artifactId` 表示模块名，`version` 表示产物版本。其他项目引用当前模块时，本质上也是引用这个坐标。

`packaging` 决定产物形态。普通库和服务常用 `jar`，传统 Servlet 应用可能使用 `war`，父工程或版本管理工程常用 `pom`。当 `packaging` 不同时，Maven 默认绑定的插件目标也会不同。

### 验证一个真实产物

[订单构建示例](/java/examples/order-build-lab.zip) 包含完整 POM、相同源码对应的 Gradle 配置和 4 个金额计算测试。解压后进入 `order-build-lab`，执行：

```bash
mvn -version
mvn clean verify
jar tf target/order-build-lab-1.0.0-SNAPSHOT.jar
java -cp target/order-build-lab-1.0.0-SNAPSHOT.jar example.orders.OrderTotal
```

预期 Surefire 报告为 4 个测试、0 失败、0 错误，运行输出 `5970`。测试覆盖正常金额、零价格、非法数量及乘法溢出。普通 JAR 中是本项目 class，JUnit 属于测试依赖，不应打入；这里用 `-cp` 指定入口，不需要 `Main-Class`，也不宣称这个 JAR 已能使用 `java -jar` 启动。

POM 中固定的插件与 JUnit 版本用于重现实验，不代表生产项目当前补丁建议。示例不包含真实支付、数据库或外部服务，测试通过仅说明这些本地规则被构建正确执行。

## settings 与 pom 的边界

`pom.xml` 描述项目本身，应提交到代码仓库。`settings.xml` 描述当前开发者或构建环境的私有配置，一般放在 `~/.m2/settings.xml`，不应提交到业务代码仓库。

| 文件 | 作用 | 典型内容 |
| --- | --- | --- |
| `pom.xml` | 项目模型 | 项目坐标、依赖、插件、模块、发布地址 |
| `settings.xml` | 本机或 CI 环境配置 | 本地仓库路径、镜像、私服账号、激活 profile |

国内网络或企业内网环境通常会配置镜像和私服认证：

```xml
<settings>
    <mirrors>
        <mirror>
            <id>company-public</id>
            <mirrorOf>*</mirrorOf>
            <url>https://maven.example.com/repository/public/</url>
        </mirror>
    </mirrors>

    <servers>
        <server>
            <id>company-releases</id>
            <username>${env.MAVEN_REPO_USER}</username>
            <password>${env.MAVEN_REPO_PASSWORD}</password>
        </server>
        <server>
            <id>company-public</id>
            <username>${env.MAVEN_REPO_USER}</username>
            <password>${env.MAVEN_REPO_PASSWORD}</password>
        </server>
    </servers>
</settings>
```

认证按实际访问的仓库 ID 匹配。下载被镜像改写后，应匹配 `mirror.id`，本例为 `company-public`；发布则匹配 `distributionManagement` 中的发布仓库 ID。示例的服务器均为占位地址。将账号留在 CI 密钥中，避免打印或提交实际有效 settings。

## 仓库与依赖解析

Maven 仓库保存构件，常见文件包括 `.pom`、`.jar`、源码包、Javadoc 包和校验文件。先尝试本地可用结果，再按仓库路由与更新策略访问远程。快照、缺失结果缓存和更新检查不能概括成“本地有文件就永远不联网”。企业私服可以代理 Central；配置镜像后，也不是每次私服失败都由 Maven 自动绕过它直连 Central。

![Maven 依赖解析链路](/java/maven-dependency-resolution.svg)

依赖声明只写直接依赖，但实际进入项目 classpath 的还包括传递依赖。例如订单服务直接依赖 `spring-web`，`spring-web` 又依赖 `spring-core`、`spring-beans`，这些间接依赖也会被解析进来。传递依赖提高了复用效率，也带来了版本冲突。

```bash
# 查看依赖树
mvn dependency:tree

# 只看某个 groupId 或 artifactId
mvn dependency:tree -Dincludes=org.springframework

# 分析声明但未使用、使用但未声明的依赖
mvn dependency:analyze
```

依赖冲突时，Maven 主要按“路径最近优先”选择版本。路径长度相同，再按声明顺序选择先出现的依赖。工程中更稳定的做法不是依赖这个隐式结果，而是在 `dependencyManagement` 中统一声明版本。

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-dependencies</artifactId>
            <version>3.2.6</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

`dependencyManagement` 可以管理版本、scope 等默认依赖信息，但不会自动引入依赖；实际使用仍需在 `dependencies` 中声明。直接声明的版本、管理表和传递依赖调解需要结合有效 POM 与依赖树判断。示例的 Boot 3.2.6 仅展示 BOM 导入结构，不是建议新项目采用该旧补丁；生产版本按维护范围与兼容矩阵选择。

## scope 与 classpath

`scope` 决定依赖在哪些 classpath 中可见。打包插件另有组装规则：普通 JAR 不会把所有 `compile` 依赖自动塞进包内；WAR 和 Boot 重打包的规则又不同。

| scope | 编译 | 测试 | 运行 | 典型场景 |
| --- | --- | --- | --- | --- |
| `compile` | 是 | 是 | 是 | 业务代码直接使用的库，默认值 |
| `provided` | 是 | 是 | 否 | Servlet API、Lombok、由运行容器提供的库 |
| `runtime` | 否 | 是 | 是 | JDBC 驱动、运行时实现 |
| `test` | 否 | 是 | 否 | JUnit、Mockito、测试工具 |
| `import` | 否 | 否 | 否 | 在 `dependencyManagement` 中导入 BOM |
| `system` | 是 | 是 | 否 | 绑定本机文件，破坏可移植性，应改为正规仓库构件 |

传统外部 Servlet 容器部署时，Servlet API 通常由容器提供；嵌入式服务器的独立服务要按框架打包合同配置，不能把所有 Web 依赖一律改成 `provided`。Lombok 还涉及注解处理器配置，新 JDK 的处理器发现规则也需核对。JDBC 驱动若误写 `provided`，可能直到运行时才暴露缺失；编译成功不能证明运行依赖齐全。

## 生命周期与插件

Maven 命令不是直接调用“编译器”或“打包器”，而是请求执行某个生命周期阶段。执行 `mvn package` 时，Maven 会从 `validate` 一路执行到 `package`，中间包括资源处理、编译、测试编译、测试和打包。

![Maven 生命周期与插件执行](/java/maven-lifecycle.svg)

常用阶段：

| 命令 | 会做什么 | 适用场景 |
| --- | --- | --- |
| `mvn validate` | 检查项目模型是否完整 | 快速验证 POM 是否能被解析 |
| `mvn compile` | 处理资源并编译主代码 | 本地确认语法和主依赖 |
| `mvn test` | 编译并执行单元测试 | 提交前验证 |
| `mvn package` | 测试后生成 jar 或 war | 本地打包、容器镜像构建前 |
| `mvn verify` | 运行更多校验 | 集成测试、质量门禁 |
| `mvn install` | 安装产物到本地仓库 | 本地联调多项目 |
| `mvn deploy` | 发布产物到远程仓库 | CI 发布公共库 |

插件是生命周期真正做事的执行者。`maven-compiler-plugin` 负责编译，`maven-surefire-plugin` 负责单元测试，`maven-jar-plugin` 负责普通 jar，`maven-war-plugin` 负责 war，`maven-deploy-plugin` 负责发布。生命周期提供顺序，插件提供能力。

`verify` 不会凭空发现并执行所有集成测试。若采用 Failsafe，需要把它的 `integration-test`、`verify` 目标绑定到相应阶段；质量检查也需要插件执行配置。直接运行某个 `plugin:goal`，不能假定此前的全部生命周期阶段已自动执行。`clean` 属于另一条生命周期，不是每次构建的必经前置步骤。

常见编译配置：

```xml
<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <version>3.13.0</version>
            <configuration>
                <release>17</release>
                <parameters>true</parameters>
            </configuration>
        </plugin>
    </plugins>
</build>
```

`release` 比同时写 `source` 和 `target` 更适合控制 JDK API 兼容性。项目统一 JDK 版本时，建议把版本放到 `properties` 中，再由插件引用。

## 常用命令

本地开发时，先掌握少量高频命令即可：

```bash
# 清理输出目录
mvn clean

# 编译主代码
mvn compile

# 运行测试
mvn test

# 打包，默认会执行测试
mvn clean package

# 跳过测试执行，但仍编译测试代码
mvn clean package -DskipTests

# 跳过测试编译和测试执行
mvn clean package -Dmaven.test.skip=true

# 将当前模块安装到本地仓库，供其他本地项目引用
mvn clean install

# 查看最终生效的 POM
mvn help:effective-pom

# 查看当前环境生效的 settings
mvn help:effective-settings
```

跳过测试要谨慎区分。`-DskipTests` 只跳过测试运行，测试代码仍会编译；`-Dmaven.test.skip=true` 连测试代码编译也跳过，更容易掩盖测试依赖和测试源码问题。

## 多模块项目

当订单、支付、库存、通知等模块需要在一个仓库里协作时，单个 Maven 项目会演变成多模块项目。多模块项目通常有一个根 POM，负责聚合子模块、统一版本和插件配置。

![Maven 多模块组织方式](/java/maven-multi-module.svg)

目录示例：

```text
shop-platform/
├── pom.xml
├── shop-common/
│   └── pom.xml
├── order-service/
│   └── pom.xml
├── payment-service/
│   └── pom.xml
└── inventory-service/
    └── pom.xml
```

根 POM：

```xml
<project>
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example.shop</groupId>
    <artifactId>shop-platform</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <packaging>pom</packaging>

    <modules>
        <module>shop-common</module>
        <module>order-service</module>
        <module>payment-service</module>
        <module>inventory-service</module>
    </modules>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>com.example.shop</groupId>
                <artifactId>shop-common</artifactId>
                <version>${project.version}</version>
            </dependency>
        </dependencies>
    </dependencyManagement>
</project>
```

子模块通过 `parent` 继承公共配置：

```xml
<parent>
    <groupId>com.example.shop</groupId>
    <artifactId>shop-platform</artifactId>
    <version>1.0.0-SNAPSHOT</version>
</parent>

<artifactId>order-service</artifactId>

<dependencies>
    <dependency>
        <groupId>com.example.shop</groupId>
        <artifactId>shop-common</artifactId>
    </dependency>
</dependencies>
```

多模块有两个容易混淆的概念：继承和聚合。`parent` 是继承关系，子模块继承父 POM 的属性、依赖管理和插件管理；`modules` 是聚合关系，根项目一次构建多个模块，并按模块依赖关系决定构建顺序。两者常常写在同一个根 POM 中，但含义不同。

局部构建常用命令：

```bash
# 只构建 order-service 以及它依赖的模块
mvn clean install -pl order-service -am

# 从某个模块开始继续构建
mvn clean install -rf :order-service

# 构建多个模块
mvn clean install -pl order-service,payment-service -am
```

`-pl` 选择模块，`-am` 同时构建所需依赖模块，`-rf` 用于失败后从指定模块恢复构建。`-rf` 不保证补建被跳过的上游：若上次只到 `package`，兄弟模块可能并未安装进本地仓库；缺少上游结果时回根工程用 `-pl … -am` 重建。Reactor 使用实际模块依赖等关系排序，`dependencyManagement` 中仅管理一个坐标不会建立构建依赖。

## 版本管理与 BOM

企业项目里最容易失控的是版本。一个服务直接写几十个依赖版本，多个服务各写一套版本，很快就会出现 Spring、Jackson、Netty、日志框架版本不一致的问题。

稳定做法是把版本集中到父 POM 或 BOM：

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.example.platform</groupId>
            <artifactId>platform-dependencies</artifactId>
            <version>1.4.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

BOM 的作用是给一组依赖提供统一版本表。业务模块只声明要用什么，不重复声明版本：

```xml
<dependencies>
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
    </dependency>
</dependencies>
```

对于业务平台，建议分三层管理版本：语言和构建插件版本放父 POM，通用三方库版本放 BOM，业务模块只声明真实使用的依赖。这样升级 Spring Boot 或日志组件时，改动集中，回滚也清晰。

## Profile 与环境差异

Profile 用于切换少量构建差异，例如不同仓库、不同打包参数、不同资源过滤配置。它不适合承载大量业务环境逻辑。数据库地址、密钥、运行时开关更适合交给应用配置中心、环境变量或部署平台。

```xml
<profiles>
    <profile>
        <id>dev</id>
        <properties>
            <skip.integration.tests>true</skip.integration.tests>
        </properties>
    </profile>
    <profile>
        <id>release</id>
        <properties>
            <skip.integration.tests>false</skip.integration.tests>
        </properties>
    </profile>
</profiles>
```

使用方式：

```bash
mvn clean verify -Pdev
mvn clean deploy -Prelease
```

Profile 越多，构建结果越难判断。一个项目如果需要通过 Profile 切换大量源码、依赖和插件，通常说明模块边界或部署模型需要重新整理。

上面的 `skip.integration.tests` 是项目自定义属性；只有插件配置显式引用它才生效。例如配置 Failsafe 的 `<skipITs>${skip.integration.tests}</skipITs>`，并绑定其两个目标。仅复制 properties 不会自动跳过集成测试；应从实际测试报告核对执行数量。

## 私服与发布

公共三方依赖一般来自 Maven Central 或企业镜像，内部公共库应发布到企业私服。私服的价值不只是加速下载，还包括统一缓存、权限控制、制品留存、漏洞治理和离线构建。

发布配置通常放在项目 POM：

```xml
<distributionManagement>
    <repository>
        <id>company-releases</id>
        <url>https://maven.example.com/repository/releases/</url>
    </repository>
    <snapshotRepository>
        <id>company-snapshots</id>
        <url>https://maven.example.com/repository/snapshots/</url>
    </snapshotRepository>
</distributionManagement>
```

账号密码放在 `settings.xml` 的 `servers` 中。执行发布：

```bash
mvn clean deploy
```

`SNAPSHOT` 版本表示开发中的可变版本，适合联调；正式版本不应重复覆盖。公共库发布前应确保源码包、Javadoc 包、测试和版本号策略清晰，否则下游项目很难追踪问题。

## Spring Boot 项目中的 Maven

Spring Boot Maven 项目通常通过父 POM 或 BOM 继承大量版本管理能力：

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.6</version>
    <relativePath/>
</parent>
```

使用 Spring Boot 父 POM 后，常见 starter 不需要重复写版本：

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

可执行 jar 由 Spring Boot 插件重新打包：

```xml
<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
        </plugin>
    </plugins>
</build>
```

使用 Boot 父 POM 时，它提供 `repackage` 的执行配置，声明插件后可在 `package` 时重打包。仅导入 Boot BOM 只管理依赖，不会带来插件版本或执行绑定，需要自行补齐。普通 JAR 通常只包含项目自己的 class 和资源；Boot 重打包则组织依赖和启动器，两者应通过实际包结构与启动命令区分。

## 常见排错路径

Maven 问题不要只看最后一行错误。有效排查顺序是：先确认命令阶段，再看项目模型，再看依赖树，再看插件配置，最后定位仓库或网络。

![Maven 排错路径](/java/maven-troubleshooting.svg)

### 依赖下载失败

先判断是坐标不存在、仓库不可访问，还是认证失败：

```bash
mvn -U dependency:resolve
mvn help:effective-settings
```

`-U` 强制检查缺失 release 与更新的 SNAPSHOT，不是重新下载所有已存在的正式构件。私服认证按实际仓库或镜像 ID 核对；先定位具体坐标、HTTP 状态和失败缓存，再处理该构件。避免删除整个本地仓库，让原始错误被大批重新下载掩盖。

### 版本冲突或运行时报错

编译能过但运行时报 `NoSuchMethodError`、`ClassNotFoundException`、`ClassCastException`，常见原因是实际进入运行 classpath 的版本和预期不一致。

```bash
mvn dependency:tree -Dverbose
mvn dependency:tree -Dincludes=com.fasterxml.jackson.core
```

定位后优先在 `dependencyManagement` 统一版本，必要时用 `exclusions` 排除不该传递进来的依赖：

```xml
<dependency>
    <groupId>com.example</groupId>
    <artifactId>legacy-client</artifactId>
    <version>1.0.0</version>
    <exclusions>
        <exclusion>
            <groupId>commons-logging</groupId>
            <artifactId>commons-logging</artifactId>
        </exclusion>
    </exclusions>
</dependency>
```

### 插件版本或编译 JDK 不一致

本地能编译，CI 报 JDK API 不存在，通常是 JDK 版本或编译插件配置不一致。先看：

```bash
mvn -version
mvn help:effective-pom
```

项目应明确编译目标，例如使用 `maven.compiler.release`。团队项目还可以结合 Maven Wrapper、CI 镜像和工具链配置固定构建环境。

### 测试跳过后仍然失败

如果使用 `-DskipTests` 后仍然失败，说明失败可能发生在测试编译阶段。测试源码依赖缺失、生成测试代码失败、测试资源过滤失败都会在这个阶段暴露。只有 `-Dmaven.test.skip=true` 才会跳过测试编译，但这不适合作为长期构建参数。

### 多模块找不到内部依赖

本地只进入某个子目录执行构建时，Maven 可能找不到兄弟模块的最新产物。优先回到根目录执行：

```bash
mvn clean install -pl order-service -am
```

如果仍然失败，检查子模块 `parent` 坐标、根 POM `modules` 声明、内部依赖版本是否和 `${project.version}` 保持一致。

## 选型与使用边界

Maven 适合约定清晰、依赖管理稳定、CI 发布流程标准化的 Java 项目。企业后端服务、公共 SDK、多模块平台、Spring Boot 应用都很适合使用 Maven。它的优势是模型稳定、生态成熟、团队协作成本低。

Gradle 更适合构建逻辑高度定制、需要更强增量构建和脚本表达能力的项目，例如大型 Android 工程或复杂多语言构建。普通 Java 后端项目如果没有明显的构建性能或脚本扩展需求，Maven 的可读性和统一性通常更容易维护。

## 能力验证清单

学完 Maven 后，应能独立完成这些事情：

- 从空目录创建一个 Maven Java 项目，并解释标准目录结构的作用。
- 读懂 `pom.xml` 中项目坐标、依赖、插件、父 POM、模块声明的含义。
- 使用 `mvn clean package`、`mvn test`、`mvn install` 完成本地构建和联调。
- 通过 `dependency:tree` 找到版本冲突来源，并用 `dependencyManagement` 或 `exclusions` 收敛依赖。
- 区分 `pom.xml` 和 `settings.xml`，正确配置镜像、私服账号和发布仓库。
- 维护一个多模块项目，知道 `parent` 继承和 `modules` 聚合的区别。
- 按错误类型选择排查入口，而不是反复删除整个本地仓库。

## 总结

Maven 的学习重点不是记住所有标签，而是建立工程模型。`pom.xml` 定义项目，仓库提供构件，生命周期安排顺序，插件执行动作，依赖树决定最终 classpath。沿着这条线看，一个 Maven 项目从 0 到发布就是：声明坐标和依赖，按标准目录组织代码，执行生命周期阶段，生成构件，必要时发布到仓库，再用依赖树和有效 POM 排查偏差。
