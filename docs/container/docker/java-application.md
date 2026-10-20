---
title: Java 应用镜像构建
author: Walt
date: 2026-05-17
---

# Java 应用镜像构建

Java 订单服务容器化后，JAR、JRE 和入口命令由镜像交付，数据库地址、凭据和资源约束在运行时配置。环境晋级应使用同一份经过验证的镜像摘要，不能只看版本标签相同。容器也不会替应用解决非堆内存、目录权限和停止期间的在途请求。

![Java 产物、运行参数、内存预算与优雅退出的关系](/container/java-container-runtime.svg)

## 固定可执行产物

Spring Boot Maven 项目需要生成可执行 JAR，而非普通类库 JAR。下面是已有 Spring Boot 项目的构建片段，插件版本跟随项目的父工程或插件管理；已经继承 `repackage` 执行时不要重复添加。`finalName` 固定产物名，避免 `*.jar` 同时匹配原始包、源码包等文件。

```xml
<build>
  <finalName>app</finalName>
  <plugins>
    <plugin>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-maven-plugin</artifactId>
      <executions>
        <execution>
          <goals><goal>repackage</goal></goals>
        </execution>
      </executions>
    </plugin>
  </plugins>
</build>
```

```bash
./mvnw clean verify
jar tf target/app.jar
```

前提是项目包含并正确配置 Maven Wrapper。没有 Wrapper 时可用项目规定版本的 `mvn`。典型可执行 Boot JAR 可看到 `BOOT-INF/classes` 与依赖目录；仍需实际启动验证。Gradle 项目应配置 `bootJar` 的确定输出，再复制这一文件，不能把全部 `build/libs/*.jar` 视为唯一可执行包。

## 运行镜像

```dockerfile
FROM eclipse-temurin:21-jre
RUN groupadd --gid 10001 app \
    && useradd --uid 10001 --gid 10001 --no-create-home app
WORKDIR /app
COPY --chown=10001:10001 target/app.jar /app/app.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

这是 Linux Temurin 21 JRE 的模板。目标平台、JRE 主版本和应用字节码需要匹配，正式发布应固定验证过的基础镜像摘要。应用写入 `/exports` 时应单独挂载，并准备 UID 10001 可写的目录；只给 JAR 设置 owner 不会让其他目录自动可写。

```bash
docker build -t java-orders:dev .
docker run -d --name java-orders \
  --publish 127.0.0.1:8080:8080 \
  --memory 512m --cpus 1 \
  -e JAVA_TOOL_OPTIONS='-Xms128m -Xmx256m' \
  -e SPRING_PROFILES_ACTIVE=test \
  java-orders:dev
docker logs --tail 100 java-orders
```

这里假设应用的 `test` 配置已满足启动依赖。`JAVA_TOOL_OPTIONS` 是 JVM 识别的入口，`JAVA_OPTS` 只是常用约定，JSON 入口不会自动读取它。JVM 参数必须放在 `-jar` 前，`docker run java-orders:dev --server.port=8081` 这类尾部参数则追加为应用参数。

## 内存预算与诊断

512 MiB 容器限制不等于 JVM 堆能设为 512 MiB。堆之外还有线程栈、元空间、代码缓存、直接内存、JNI 与本地库等消耗。上例只把最大堆设为 256 MiB，为其他部分保留空间；是否足够仍需结合线程数、请求大小和压测验证。

容器限制、JVM 识别情况与应用指标应结合检查：

```bash
docker inspect --type container --format '{{json .HostConfig.Memory}}' java-orders
docker stats --no-stream java-orders
docker inspect --type container --format '{{json .State}}' java-orders
```

当 JVM 抛 `OutOfMemoryError` 与当进程被 cgroup OOM 终止时，证据不同。后者可能来不及生成 heap dump；运行镜像只包含 JRE 时，也不保证自带 `jcmd` 等诊断工具。诊断入口见 [JVM 实操](../../devlanguage/java/jvm/hands-on)。

## 停止信号与在途请求

JSON 形式的 Java 入口让 Java 直接接收容器停止信号。Spring Boot 服务需要按所用版本配置并验证优雅停机，在途请求等待时间还应小于外部容器停止期限。例如应用等待窗口为 20 秒时，Docker 先提供更长的停止窗口：

```properties
server.shutdown=graceful
spring.lifecycle.timeout-per-shutdown-phase=20s
```

```bash
docker stop --timeout 30 java-orders
```

验收应在存在在途请求时观察完成和拒绝新请求的行为，并核对日志；“停止命令返回成功”不等于业务优雅退出。后台任务和多阶段生命周期还可能有额外等待，不能把所有服务的期限都固定为这两个数字。

需要入口脚本做前置检查时，最后用 `exec` 把主进程位置交给 Java，例如：

```sh
#!/bin/sh
set -eu
test -r /app/app.jar
exec java -jar /app/app.jar "$@"
```

脚本需有执行权限并被配置为入口。不要用没有 `exec` 的 `sh -c 'java ...'` 代替它，否则 shell 可能阻挡信号转发。外部注入的 JVM 参数仍通过 JVM 支持的环境变量处理，避免拼接任意 shell 字符串。

## 选择构建方式

已有 CI 产出 JAR 时，先测试和打包，再将确定产物交给 Docker。希望构建环境也固定在镜像中，可采用[多阶段构建](./image-build-supply-chain)。Spring Boot 的 Buildpacks 路径可以减少手写 Dockerfile：

```bash
./mvnw spring-boot:build-image \
  -Dspring-boot.build-image.imageName=java-orders:dev
```

这一路径需要可访问的 Docker daemon 和兼容的 builder/run image。Jib 可在没有本地 daemon 的方式下构建和推送 Java 镜像；私有仓库、依赖与镜像平台仍需配置。原生库、字体、证书和设备依赖较多时，先明确运行环境合同，再选择能准确表达这些输入的方案。

## 交付验收

至少验证固定产物能启动、进程身份正确、真实请求成功、资源上限下无异常、挂载目录可写，以及停止和重建后业务状态正确。镜像摘要、平台与源码记录应能相互追溯。

`COPY` 失败先查实际产物与上下文；非 root 启动失败查目录和低端口权限；环境参数不生效查配置优先级和入口；本地正常而线上失败查实际摘要、平台、证书、时区和外部依赖。日志输出到标准输出，导出与诊断文件则放在明确规划的存储位置，见[存储、网络与 Compose](./storage-network-compose)。
