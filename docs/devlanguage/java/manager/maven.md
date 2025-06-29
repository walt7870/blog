# Maven

## 概述

Apache Maven 是一个项目管理和构建自动化工具，主要用于 Java 项目，但也支持 C#、Ruby、Scala 等其他语言。Maven 使用项目对象模型（POM）来管理项目的构建、报告和文档。它通过标准化的目录结构、依赖管理和构建生命周期，简化了项目的构建过程。

## Maven 优势

**标准化项目结构**：Maven 提供了标准的目录布局，使得项目结构清晰统一，便于团队协作。

**强大的依赖管理**：自动下载和管理项目依赖，解决依赖冲突，支持传递性依赖。

**丰富的插件生态**：拥有大量的官方和第三方插件，覆盖编译、测试、打包、部署等各个环节。

**生命周期管理**：定义了清晰的构建生命周期，包括编译、测试、打包、安装、部署等阶段。

**仓库管理**：支持本地仓库、中央仓库和私有仓库，便于依赖的存储和分发。

**跨平台支持**：基于 Java 开发，可在任何支持 Java 的平台上运行。

**IDE 集成**：与主流 IDE（如 IntelliJ IDEA、Eclipse）深度集成。

## Maven 安装

### 前置条件

确保系统已安装 JDK 8 或更高版本：

```bash
java -version
javac -version
```

### 安装方式

#### 1. 官方下载安装

从 [Maven 官网](https://maven.apache.org/download.cgi) 下载二进制包：

```bash
# 下载并解压
wget https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.tar.gz
tar -xzf apache-maven-3.9.6-bin.tar.gz
sudo mv apache-maven-3.9.6 /opt/maven

# 配置环境变量
echo 'export MAVEN_HOME=/opt/maven' >> ~/.bashrc
echo 'export PATH=$MAVEN_HOME/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

#### 2. 使用包管理器

**macOS (Homebrew)**：
```bash
brew install maven
```

**Ubuntu/Debian**：
```bash
sudo apt update
sudo apt install maven
```

**CentOS/RHEL**：
```bash
sudo yum install maven
```

#### 3. 使用 SDKMAN（推荐）

```bash
# 安装 SDKMAN
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"

# 安装 Maven
sdk install maven

# 查看可用版本
sdk list maven

# 切换版本
sdk use maven 3.9.6
```

### 验证安装

```bash
mvn -version
```

### Maven 镜像配置

国内用户建议配置阿里云镜像以提高下载速度。编辑 `~/.m2/settings.xml`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0 
          http://maven.apache.org/xsd/settings-1.0.0.xsd">
  
  <mirrors>
    <mirror>
      <id>aliyunmaven</id>
      <mirrorOf>*</mirrorOf>
      <name>阿里云公共仓库</name>
      <url>https://maven.aliyun.com/repository/public</url>
    </mirror>
  </mirrors>
  
  <profiles>
    <profile>
      <id>jdk-1.8</id>
      <activation>
        <activeByDefault>true</activeByDefault>
        <jdk>1.8</jdk>
      </activation>
      <properties>
        <maven.compiler.source>1.8</maven.compiler.source>
        <maven.compiler.target>1.8</maven.compiler.target>
        <maven.compiler.compilerVersion>1.8</maven.compiler.compilerVersion>
      </properties>
    </profile>
  </profiles>
</settings>
```

## 新建项目

### 使用 Maven Archetype

Maven 提供了多种项目模板（Archetype）来快速创建项目：

#### 1. 创建简单 Java 项目

```bash
mvn archetype:generate \
  -DgroupId=com.example \
  -DartifactId=my-app \
  -DarchetypeArtifactId=maven-archetype-quickstart \
  -DinteractiveMode=false
```

#### 2. 创建 Web 项目

```bash
mvn archetype:generate \
  -DgroupId=com.example \
  -DartifactId=my-web-app \
  -DarchetypeArtifactId=maven-archetype-webapp \
  -DinteractiveMode=false
```

#### 3. 创建 Spring Boot 项目

```bash
mvn archetype:generate \
  -DgroupId=com.example \
  -DartifactId=spring-boot-demo \
  -DarchetypeGroupId=org.springframework.boot \
  -DarchetypeArtifactId=spring-boot-starter-parent \
  -DinteractiveMode=false
```

### 项目目录结构

Maven 标准目录结构：

```
my-app/
├── pom.xml
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/
│   │   │       └── example/
│   │   │           └── App.java
│   │   ├── resources/
│   │   │   ├── application.properties
│   │   │   ├── static/
│   │   │   └── templates/
│   │   └── webapp/
│   │       ├── WEB-INF/
│   │       │   └── web.xml
│   │       └── index.jsp
│   ├── test/
│   │   ├── java/
│   │   │   └── com/
│   │   │       └── example/
│   │   │           └── AppTest.java
│   │   └── resources/
│   └── site/
│       └── site.xml
├── target/
│   ├── classes/
│   ├── test-classes/
│   └── my-app-1.0-SNAPSHOT.jar
└── README.md
```

### 目录说明

```
src/main/java: 主要的 Java 源代码
src/main/resources: 主要的资源文件（配置文件、属性文件等）
src/main/webapp: Web 应用资源（JSP、HTML、CSS、JS 等）
src/test/java: 测试 Java 源代码
src/test/resources: 测试资源文件
src/site: 项目站点文档
target: 构建输出目录
pom.xml: 项目对象模型文件，Maven 的核心配置文件
```

## POM 文件详解

### 基本 POM 结构

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    
    <!-- POM 模型版本 -->
    <modelVersion>4.0.0</modelVersion>
    
    <!-- 项目坐标 -->
    <groupId>com.example</groupId>
    <artifactId>my-app</artifactId>
    <version>1.0-SNAPSHOT</version>
    <packaging>jar</packaging>
    
    <!-- 项目信息 -->
    <name>My Application</name>
    <description>A sample Maven project</description>
    <url>http://www.example.com</url>
    
    <!-- 属性配置 -->
    <properties>
        <maven.compiler.source>11</maven.compiler.source>
        <maven.compiler.target>11</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <junit.version>5.9.2</junit.version>
        <spring.version>5.3.23</spring.version>
    </properties>
    
    <!-- 依赖管理 -->
    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework</groupId>
                <artifactId>spring-framework-bom</artifactId>
                <version>${spring.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>
    
    <!-- 项目依赖 -->
    <dependencies>
        <!-- Spring Core -->
        <dependency>
            <groupId>org.springframework</groupId>
            <artifactId>spring-core</artifactId>
        </dependency>
        
        <!-- JUnit 5 -->
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>${junit.version}</version>
            <scope>test</scope>
        </dependency>
        
        <!-- Lombok -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <version>1.18.24</version>
            <scope>provided</scope>
        </dependency>
    </dependencies>
    
    <!-- 构建配置 -->
    <build>
        <!-- 最终构建文件名 -->
        <finalName>my-application</finalName>
        
        <!-- 插件配置 -->
        <plugins>
            <!-- 编译插件 -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.11.0</version>
                <configuration>
                    <source>11</source>
                    <target>11</target>
                    <encoding>UTF-8</encoding>
                </configuration>
            </plugin>
            
            <!-- Surefire 测试插件 -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-surefire-plugin</artifactId>
                <version>3.0.0-M9</version>
                <configuration>
                    <includes>
                        <include>**/*Test.java</include>
                        <include>**/*Tests.java</include>
                    </includes>
                </configuration>
            </plugin>
            
            <!-- JAR 打包插件 -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-jar-plugin</artifactId>
                <version>3.3.0</version>
                <configuration>
                    <archive>
                        <manifest>
                            <mainClass>com.example.App</mainClass>
                        </manifest>
                    </archive>
                </configuration>
            </plugin>
        </plugins>
    </build>
    
    <!-- 仓库配置 -->
    <repositories>
        <repository>
            <id>central</id>
            <name>Central Repository</name>
            <url>https://repo1.maven.org/maven2</url>
        </repository>
    </repositories>
    
    <!-- 插件仓库 -->
    <pluginRepositories>
        <pluginRepository>
            <id>central</id>
            <name>Central Repository</name>
            <url>https://repo1.maven.org/maven2</url>
        </pluginRepository>
    </pluginRepositories>
</project>
```

### 依赖作用域（Scope）

Maven 提供了多种依赖作用域：

```xml
<!-- 编译和运行时都需要（默认） -->
<dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-core</artifactId>
    <scope>compile</scope>
</dependency>

<!-- 仅编译时需要 -->
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <scope>provided</scope>
</dependency>

<!-- 仅运行时需要 -->
<dependency>
    <groupId>mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
    <scope>runtime</scope>
</dependency>

<!-- 仅测试时需要 -->
<dependency>
    <groupId>junit</groupId>
    <artifactId>junit</artifactId>
    <scope>test</scope>
</dependency>

<!-- 系统依赖（不推荐使用） -->
<dependency>
    <groupId>com.sun</groupId>
    <artifactId>tools</artifactId>
    <scope>system</scope>
    <systemPath>${java.home}/../lib/tools.jar</systemPath>
</dependency>

<!-- 导入其他 POM 的依赖管理 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-dependencies</artifactId>
    <type>pom</type>
    <scope>import</scope>
</dependency>
```

## Maven 生命周期

Maven 定义了三个标准的生命周期：

### 1. Clean 生命周期

清理项目构建产生的文件：

- **pre-clean**: 执行清理前的准备工作
- **clean**: 清理构建产生的文件
- **post-clean**: 执行清理后的收尾工作

```bash
# 清理项目
mvn clean
```

### 2. Default 生命周期

项目的构建和部署：

- **validate**: 验证项目信息
- **initialize**: 初始化构建状态
- **generate-sources**: 生成源代码
- **process-sources**: 处理源代码
- **generate-resources**: 生成资源文件
- **process-resources**: 处理资源文件
- **compile**: 编译源代码
- **process-classes**: 处理编译后的文件
- **generate-test-sources**: 生成测试源代码
- **process-test-sources**: 处理测试源代码
- **generate-test-resources**: 生成测试资源
- **process-test-resources**: 处理测试资源
- **test-compile**: 编译测试代码
- **process-test-classes**: 处理测试编译后的文件
- **test**: 运行单元测试
- **prepare-package**: 打包前的准备
- **package**: 打包
- **pre-integration-test**: 集成测试前的准备
- **integration-test**: 运行集成测试
- **post-integration-test**: 集成测试后的处理
- **verify**: 验证包的有效性
- **install**: 安装到本地仓库
- **deploy**: 部署到远程仓库

```bash
# 常用命令
mvn compile          # 编译
mvn test            # 测试
mvn package         # 打包
mvn install         # 安装到本地仓库
mvn deploy          # 部署到远程仓库

# 组合命令
mvn clean compile   # 清理并编译
mvn clean package   # 清理并打包
mvn clean install   # 清理、编译、测试、打包、安装
```

### 3. Site 生命周期

生成项目站点文档：

- **pre-site**: 生成站点前的准备
- **site**: 生成项目站点
- **post-site**: 生成站点后的处理
- **site-deploy**: 部署站点到服务器

```bash
# 生成项目站点
mvn site
```

## Maven 插件详解

### 核心插件

#### 1. 编译插件

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <version>3.11.0</version>
    <configuration>
        <source>17</source>
        <target>17</target>
        <encoding>UTF-8</encoding>
        <compilerArgs>
            <arg>-parameters</arg>
            <arg>-Xlint:unchecked</arg>
        </compilerArgs>
    </configuration>
</plugin>
```

#### 2. 测试插件

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <version>3.0.0-M9</version>
    <configuration>
        <!-- 跳过测试 -->
        <skipTests>false</skipTests>
        <!-- 测试失败时继续构建 -->
        <testFailureIgnore>false</testFailureIgnore>
        <!-- 包含的测试文件 -->
        <includes>
            <include>**/*Test.java</include>
            <include>**/*Tests.java</include>
        </includes>
        <!-- 排除的测试文件 -->
        <excludes>
            <exclude>**/*IntegrationTest.java</exclude>
        </excludes>
        <!-- 系统属性 -->
        <systemPropertyVariables>
            <spring.profiles.active>test</spring.profiles.active>
        </systemPropertyVariables>
    </configuration>
</plugin>
```

#### 3. 打包插件

```xml
<!-- JAR 打包 -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-jar-plugin</artifactId>
    <version>3.3.0</version>
    <configuration>
        <archive>
            <manifest>
                <addClasspath>true</addClasspath>
                <mainClass>com.example.Main</mainClass>
            </manifest>
        </archive>
    </configuration>
</plugin>

<!-- WAR 打包 -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-war-plugin</artifactId>
    <version>3.3.2</version>
    <configuration>
        <warSourceDirectory>src/main/webapp</warSourceDirectory>
        <failOnMissingWebXml>false</failOnMissingWebXml>
    </configuration>
</plugin>
```

#### 4. 源码和文档插件

```xml
<!-- 源码打包 -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-source-plugin</artifactId>
    <version>3.2.1</version>
    <executions>
        <execution>
            <id>attach-sources</id>
            <goals>
                <goal>jar</goal>
            </goals>
        </execution>
    </executions>
</plugin>

<!-- JavaDoc 生成 -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-javadoc-plugin</artifactId>
    <version>3.4.1</version>
    <configuration>
        <encoding>UTF-8</encoding>
        <charset>UTF-8</charset>
        <docencoding>UTF-8</docencoding>
    </configuration>
    <executions>
        <execution>
            <id>attach-javadocs</id>
            <goals>
                <goal>jar</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

### 第三方插件

#### 1. Spring Boot 插件

```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
    <version>3.2.0</version>
    <configuration>
        <mainClass>com.example.Application</mainClass>
        <excludes>
            <exclude>
                <groupId>org.projectlombok</groupId>
                <artifactId>lombok</artifactId>
            </exclude>
        </excludes>
    </configuration>
    <executions>
        <execution>
            <goals>
                <goal>repackage</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

#### 2. Docker 插件

```xml
<plugin>
    <groupId>com.spotify</groupId>
    <artifactId>dockerfile-maven-plugin</artifactId>
    <version>1.4.13</version>
    <configuration>
        <repository>${docker.image.prefix}/${project.artifactId}</repository>
        <tag>${project.version}</tag>
        <buildArgs>
            <JAR_FILE>target/${project.build.finalName}.jar</JAR_FILE>
        </buildArgs>
    </configuration>
</plugin>
```

#### 3. 代码质量插件

```xml
<!-- Checkstyle -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-checkstyle-plugin</artifactId>
    <version>3.2.0</version>
    <configuration>
        <configLocation>checkstyle.xml</configLocation>
        <encoding>UTF-8</encoding>
        <consoleOutput>true</consoleOutput>
        <failsOnError>true</failsOnError>
    </configuration>
</plugin>

<!-- SpotBugs -->
<plugin>
    <groupId>com.github.spotbugs</groupId>
    <artifactId>spotbugs-maven-plugin</artifactId>
    <version>4.7.3.0</version>
</plugin>

<!-- JaCoCo 代码覆盖率 -->
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.8</version>
    <executions>
        <execution>
            <goals>
                <goal>prepare-agent</goal>
            </goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals>
                <goal>report</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

## 多模块项目

Maven 支持多模块项目管理，适用于大型项目的模块化开发：

### 父项目 POM

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    
    <modelVersion>4.0.0</modelVersion>
    
    <groupId>com.example</groupId>
    <artifactId>parent-project</artifactId>
    <version>1.0-SNAPSHOT</version>
    <packaging>pom</packaging>
    
    <name>Parent Project</name>
    <description>Multi-module parent project</description>
    
    <!-- 子模块 -->
    <modules>
        <module>common</module>
        <module>service</module>
        <module>web</module>
    </modules>
    
    <!-- 属性管理 -->
    <properties>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <spring.boot.version>3.2.0</spring.boot.version>
        <junit.version>5.9.2</junit.version>
    </properties>
    
    <!-- 依赖管理 -->
    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-dependencies</artifactId>
                <version>${spring.boot.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
            
            <!-- 内部模块依赖 -->
            <dependency>
                <groupId>com.example</groupId>
                <artifactId>common</artifactId>
                <version>${project.version}</version>
            </dependency>
            
            <dependency>
                <groupId>com.example</groupId>
                <artifactId>service</artifactId>
                <version>${project.version}</version>
            </dependency>
        </dependencies>
    </dependencyManagement>
    
    <!-- 插件管理 -->
    <build>
        <pluginManagement>
            <plugins>
                <plugin>
                    <groupId>org.apache.maven.plugins</groupId>
                    <artifactId>maven-compiler-plugin</artifactId>
                    <version>3.11.0</version>
                    <configuration>
                        <source>17</source>
                        <target>17</target>
                        <encoding>UTF-8</encoding>
                    </configuration>
                </plugin>
                
                <plugin>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-maven-plugin</artifactId>
                    <version>${spring.boot.version}</version>
                </plugin>
            </plugins>
        </pluginManagement>
    </build>
</project>
```

### 子模块 POM

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    
    <modelVersion>4.0.0</modelVersion>
    
    <!-- 继承父项目 -->
    <parent>
        <groupId>com.example</groupId>
        <artifactId>parent-project</artifactId>
        <version>1.0-SNAPSHOT</version>
    </parent>
    
    <artifactId>service</artifactId>
    <packaging>jar</packaging>
    
    <name>Service Module</name>
    <description>Business service module</description>
    
    <dependencies>
        <!-- 依赖其他模块 -->
        <dependency>
            <groupId>com.example</groupId>
            <artifactId>common</artifactId>
        </dependency>
        
        <!-- 外部依赖 -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter</artifactId>
        </dependency>
    </dependencies>
</project>
```

### 多模块构建命令

```bash
# 构建所有模块
mvn clean install

# 构建特定模块
mvn clean install -pl service

# 构建模块及其依赖
mvn clean install -pl service -am

# 构建依赖于指定模块的模块
mvn clean install -pl service -amd

# 跳过测试
mvn clean install -DskipTests

# 并行构建
mvn clean install -T 4
```

## Profile 配置

Maven Profile 允许为不同环境定制构建配置：

```xml
<profiles>
    <!-- 开发环境 -->
    <profile>
        <id>dev</id>
        <activation>
            <activeByDefault>true</activeByDefault>
        </activation>
        <properties>
            <spring.profiles.active>dev</spring.profiles.active>
            <database.url>jdbc:mysql://localhost:3306/dev_db</database.url>
        </properties>
        <dependencies>
            <dependency>
                <groupId>com.h2database</groupId>
                <artifactId>h2</artifactId>
                <scope>runtime</scope>
            </dependency>
        </dependencies>
    </profile>
    
    <!-- 测试环境 -->
    <profile>
        <id>test</id>
        <properties>
            <spring.profiles.active>test</spring.profiles.active>
            <database.url>jdbc:mysql://test-server:3306/test_db</database.url>
        </properties>
    </profile>
    
    <!-- 生产环境 -->
    <profile>
        <id>prod</id>
        <properties>
            <spring.profiles.active>prod</spring.profiles.active>
            <database.url>jdbc:mysql://prod-server:3306/prod_db</database.url>
        </properties>
        <build>
            <plugins>
                <plugin>
                    <groupId>org.apache.maven.plugins</groupId>
                    <artifactId>maven-compiler-plugin</artifactId>
                    <configuration>
                        <optimize>true</optimize>
                        <debug>false</debug>
                    </configuration>
                </plugin>
            </plugins>
        </build>
    </profile>
    
    <!-- 基于操作系统的激活 -->
    <profile>
        <id>windows</id>
        <activation>
            <os>
                <family>windows</family>
            </os>
        </activation>
        <properties>
            <script.extension>.bat</script.extension>
        </properties>
    </profile>
    
    <!-- 基于 JDK 版本的激活 -->
    <profile>
        <id>jdk11</id>
        <activation>
            <jdk>11</jdk>
        </activation>
        <properties>
            <maven.compiler.source>11</maven.compiler.source>
            <maven.compiler.target>11</maven.compiler.target>
        </properties>
    </profile>
</profiles>
```

### Profile 使用

```bash
# 激活特定 Profile
mvn clean package -Ptest

# 激活多个 Profile
mvn clean package -Ptest,prod

# 查看当前激活的 Profile
mvn help:active-profiles

# 查看所有可用的 Profile
mvn help:all-profiles
```

## 仓库管理

### 仓库类型

1. **本地仓库**: `~/.m2/repository`
2. **中央仓库**: Maven 官方仓库
3. **远程仓库**: 第三方或私有仓库

### 私有仓库配置

#### Nexus 仓库配置

```xml
<!-- settings.xml -->
<servers>
    <server>
        <id>nexus-releases</id>
        <username>admin</username>
        <password>admin123</password>
    </server>
    <server>
        <id>nexus-snapshots</id>
        <username>admin</username>
        <password>admin123</password>
    </server>
</servers>

<mirrors>
    <mirror>
        <id>nexus</id>
        <mirrorOf>*</mirrorOf>
        <url>http://nexus.company.com:8081/repository/maven-public/</url>
    </mirror>
</mirrors>
```

#### POM 中的仓库配置

```xml
<repositories>
    <repository>
        <id>nexus-releases</id>
        <name>Nexus Release Repository</name>
        <url>http://nexus.company.com:8081/repository/maven-releases/</url>
        <releases>
            <enabled>true</enabled>
        </releases>
        <snapshots>
            <enabled>false</enabled>
        </snapshots>
    </repository>
</repositories>

<distributionManagement>
    <repository>
        <id>nexus-releases</id>
        <name>Nexus Release Repository</name>
        <url>http://nexus.company.com:8081/repository/maven-releases/</url>
    </repository>
    <snapshotRepository>
        <id>nexus-snapshots</id>
        <name>Nexus Snapshot Repository</name>
        <url>http://nexus.company.com:8081/repository/maven-snapshots/</url>
    </snapshotRepository>
</distributionManagement>
```

## 高级特性

### 1. 依赖冲突解决

#### 查看依赖树

```bash
# 查看完整依赖树
mvn dependency:tree

# 查看特定依赖的冲突
mvn dependency:tree -Dverbose -Dincludes=org.springframework:spring-core

# 分析依赖
mvn dependency:analyze
```

#### 排除传递依赖

```xml
<dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-web</artifactId>
    <exclusions>
        <exclusion>
            <groupId>commons-logging</groupId>
            <artifactId>commons-logging</artifactId>
        </exclusion>
    </exclusions>
</dependency>
```

#### 强制指定版本

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.slf4j</groupId>
            <artifactId>slf4j-api</artifactId>
            <version>1.7.36</version>
        </dependency>
    </dependencies>
</dependencyManagement>
```

### 2. 资源过滤

```xml
<build>
    <resources>
        <resource>
            <directory>src/main/resources</directory>
            <filtering>true</filtering>
            <includes>
                <include>**/*.properties</include>
                <include>**/*.yml</include>
            </includes>
        </resource>
        <resource>
            <directory>src/main/resources</directory>
            <filtering>false</filtering>
            <excludes>
                <exclude>**/*.properties</exclude>
                <exclude>**/*.yml</exclude>
            </excludes>
        </resource>
    </resources>
</build>
```

### 3. 自定义插件开发

```java
@Mojo(name = "hello", defaultPhase = LifecyclePhase.COMPILE)
public class HelloMojo extends AbstractMojo {
    
    @Parameter(property = "hello.message", defaultValue = "Hello World!")
    private String message;
    
    @Parameter(defaultValue = "${project}", readonly = true)
    private MavenProject project;
    
    public void execute() throws MojoExecutionException {
        getLog().info("Project: " + project.getName());
        getLog().info("Message: " + message);
    }
}
```

## 最佳实践

### 1. 项目结构

- 遵循 Maven 标准目录结构
- 合理划分模块，保持单一职责
- 使用有意义的 groupId 和 artifactId

### 2. 依赖管理

- 在父 POM 中统一管理依赖版本
- 避免在子模块中指定版本号
- 定期更新依赖版本，关注安全漏洞
- 使用 `dependencyManagement` 而不是直接依赖

### 3. 版本管理

- 使用语义化版本号（Semantic Versioning）
- 开发版本使用 SNAPSHOT 后缀
- 发布版本去掉 SNAPSHOT 后缀

### 4. 构建优化

```xml
<!-- 并行构建 -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <fork>true</fork>
        <meminitial>128m</meminitial>
        <maxmem>512m</maxmem>
    </configuration>
</plugin>

<!-- 跳过不必要的插件 -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-javadoc-plugin</artifactId>
    <configuration>
        <skip>true</skip>
    </configuration>
</plugin>
```

### 5. 安全配置

```xml
<!-- settings.xml 中加密密码 -->
<servers>
    <server>
        <id>nexus</id>
        <username>admin</username>
        <password>{COQLCE6DU6GtcS5P=}</password>
    </server>
</servers>
```

```bash
# 生成主密码
mvn --encrypt-master-password mypassword

# 加密服务器密码
mvn --encrypt-password mypassword
```

## 常见问题与解决方案

### 1. 编码问题

```xml
<properties>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    <project.reporting.outputEncoding>UTF-8</project.reporting.outputEncoding>
    <maven.compiler.encoding>UTF-8</maven.compiler.encoding>
</properties>
```

### 2. 内存不足

```bash
# 设置环境变量
export MAVEN_OPTS="-Xmx2048m -XX:MaxPermSize=512m"

# 或在 .mavenrc 文件中设置
echo 'export MAVEN_OPTS="-Xmx2048m -XX:MaxPermSize=512m"' >> ~/.mavenrc
```

### 3. 依赖下载失败

```bash
# 清理本地仓库
mvn dependency:purge-local-repository

# 强制更新依赖
mvn clean install -U

# 离线模式
mvn clean install -o
```

### 4. 测试失败

```bash
# 跳过测试
mvn clean install -DskipTests

# 跳过测试编译
mvn clean install -Dmaven.test.skip=true

# 运行特定测试
mvn test -Dtest=UserServiceTest
```

## Maven vs Gradle 对比

| 特性 | Maven | Gradle |
|------|-------|--------|
| 配置文件 | XML (pom.xml) | Groovy/Kotlin DSL |
| 学习曲线 | 较平缓 | 较陡峭 |
| 构建性能 | 中等 | 较快（增量构建、并行执行） |
| 插件生态 | 成熟丰富 | 快速发展 |
| IDE 支持 | 优秀 | 良好 |
| 企业采用 | 广泛 | 增长中 |
| 灵活性 | 中等 | 高 |
| 标准化 | 高 | 中等 |

## 总结

Maven 作为 Java 生态系统中最重要的构建工具之一，具有以下核心价值：

**标准化优势**：提供了统一的项目结构和构建生命周期，降低了项目维护成本。

**依赖管理**：强大的依赖管理机制，自动处理传递依赖和版本冲突。

**插件生态**：丰富的插件生态系统，覆盖构建、测试、部署等各个环节。

**企业级支持**：成熟稳定，在企业级项目中得到广泛应用。

**多模块支持**：优秀的多模块项目管理能力，适合大型项目开发。

**工具集成**：与主流 IDE 和 CI/CD 工具深度集成。

Maven 通过其约定优于配置的理念，为 Java 项目提供了标准化的构建解决方案，是 Java 开发者必须掌握的重要工具。