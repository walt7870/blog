---
title: Java 应用镜像构建
author: Walt
date: 2026-05-17
---

# Java 应用镜像构建

Java 应用容器化的核心目标，是把可运行的 `jar` 包、JRE/JDK、启动参数和运行环境约束固化到镜像中。构建完成后，测试、预发和生产环境运行的是同一个镜像标签，而不是在服务器上临时安装 JDK、复制文件和手工启动进程。

这类内容属于容器交付链路，应放在 Docker 专题下。Maven 或 Gradle 负责产出构建物，Docker 负责把构建物和运行环境封装为镜像。

## 基本链路

```text
源码 -> Maven/Gradle 编译测试 -> 生成 jar -> Dockerfile 构建镜像 -> 本地运行验证 -> 推送镜像仓库
```

最小闭环只需要两步：先执行 `mvn package` 生成 `target/*.jar`，再执行 `docker build` 构建镜像。是否把 Docker 构建绑定到 Maven 生命周期，要看团队的 CI/CD 约定；在流水线里显式拆开构建、测试、镜像制作和推送，通常更容易排查问题。

## Maven 打包

Spring Boot 应用通常通过 `spring-boot-maven-plugin` 生成可执行 `jar`。版本建议跟随项目使用的 Spring Boot 版本，不要在插件里单独写一个和父工程不一致的版本。

```xml
<build>
  <plugins>
    <plugin>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-maven-plugin</artifactId>
      <executions>
        <execution>
          <goals>
            <goal>repackage</goal>
          </goals>
        </execution>
      </executions>
    </plugin>
  </plugins>
</build>
```

执行打包：

```bash
mvn clean package -DskipTests
```

生产流水线不建议默认跳过测试。这里的 `-DskipTests` 只适合本地快速验证镜像构建流程。

## Dockerfile

一个简单的 Spring Boot `jar` 镜像可以这样写：

```dockerfile
FROM eclipse-temurin:21-jre

WORKDIR /app

COPY target/app.jar /app/app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

如果构建产物名称包含版本号，可以在构建前统一复制成固定文件名，或者使用构建参数：

```dockerfile
FROM eclipse-temurin:21-jre

WORKDIR /app

ARG JAR_FILE=target/*.jar
COPY ${JAR_FILE} /app/app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

构建镜像：

```bash
docker build -t registry.example.com/demo/java-app:1.0.0 .
```

本地运行验证：

```bash
docker run --rm \
  --name java-app \
  -p 8080:8080 \
  registry.example.com/demo/java-app:1.0.0
```

查看容器和日志：

```bash
docker ps
docker logs -f java-app
```

## 多阶段构建

如果不希望 CI 环境提前执行 Maven 打包，也可以在 Dockerfile 内完成编译。多阶段构建会把 Maven 和源码留在构建阶段，最终镜像只保留运行所需文件。

```dockerfile
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre

WORKDIR /app
COPY --from=build /workspace/target/*.jar /app/app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

这种方式适合简单项目和本地验证。大型项目更常见的做法，是在 CI 中先缓存 Maven 依赖、执行测试和打包，再把确定的构建物交给 Docker 构建镜像。

## 通过 Maven 触发镜像构建

如果团队希望一个命令完成打包和镜像构建，可以使用 Spring Boot Maven Plugin 的 `build-image` 目标。它基于 Cloud Native Buildpacks 生成镜像，不需要手写 Dockerfile。

```bash
mvn spring-boot:build-image \
  -Dspring-boot.build-image.imageName=registry.example.com/demo/java-app:1.0.0
```

这种方式适合 Spring Boot 应用的标准化交付。需要自定义系统依赖、字体、证书、诊断工具或特殊启动脚本时，手写 Dockerfile 更直观。

也可以使用 Jib 这类专门面向 Java 的镜像构建工具，把镜像构建集成到 Maven 或 Gradle 中。它的优势是无需本地 Docker daemon，也能更好地利用分层缓存；代价是需要团队统一插件配置和镜像推送权限。

## 启动参数

生产镜像不要把所有 JVM 参数写死在 Dockerfile 里。更常见的做法是通过环境变量或启动脚本注入参数，便于不同环境调整堆大小、时区、配置文件和诊断开关。

```dockerfile
FROM eclipse-temurin:21-jre

WORKDIR /app
COPY target/app.jar /app/app.jar

ENV JAVA_OPTS=""
ENV SPRING_PROFILES_ACTIVE=prod

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar --spring.profiles.active=$SPRING_PROFILES_ACTIVE"]
```

运行时传入参数：

```bash
docker run --rm \
  -p 8080:8080 \
  -e JAVA_OPTS="-Xms512m -Xmx512m" \
  -e SPRING_PROFILES_ACTIVE=test \
  registry.example.com/demo/java-app:1.0.0
```

在 Kubernetes 中，这些参数通常由 `Deployment`、`ConfigMap`、`Secret` 和资源限制共同管理。

## 镜像设计注意点

| 项目 | 建议 |
| --- | --- |
| 基础镜像 | 优先选择固定版本标签，避免生产环境使用 `latest` |
| JDK / JRE | 运行阶段优先使用 JRE；需要在线诊断工具时再评估 JDK |
| 构建产物 | 固定复制为 `/app/app.jar`，降低启动命令复杂度 |
| 配置 | 不把环境差异写进镜像，通过环境变量或配置中心注入 |
| 日志 | 输出到标准输出，由 Docker 或 Kubernetes 采集 |
| 端口 | `EXPOSE` 只声明意图，实际暴露仍依赖 `docker run -p` 或 Kubernetes Service |
| 镜像标签 | 使用版本号、提交号或构建号，避免只推送 `latest` |

## 排查入口

| 现象 | 检查点 |
| --- | --- |
| `COPY target/*.jar` 失败 | 是否已执行 Maven 打包，构建上下文是否在项目根目录 |
| 容器启动后退出 | `docker logs` 查看 Java 异常、配置缺失、端口冲突 |
| 端口访问不到 | 应用是否监听 `0.0.0.0`，`docker run -p` 映射是否正确 |
| 镜像过大 | 是否把 Maven 本地仓库、源码、测试文件复制进运行镜像 |
| 参数不生效 | `ENTRYPOINT` 写法、环境变量名称、Shell 展开方式 |
| 本地正常线上失败 | 基础镜像架构、环境变量、时区、证书、外部依赖地址 |

## 最小验证清单

- `mvn clean package` 能稳定生成可执行 `jar`。
- `docker build` 不依赖本机绝对路径。
- `docker run --rm -p 8080:8080 ...` 能启动并通过健康检查。
- 容器日志输出到标准输出。
- 镜像标签能对应到源码提交或发布版本。
- 配置、密钥和 JVM 参数不硬编码在镜像里。
