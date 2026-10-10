---
title: 镜像构建与供应链
author: Walt
date: 2026-07-12
---

# 镜像构建与供应链

镜像不是把服务器目录压缩后搬走，而是由一组只读层、配置元数据和内容摘要组成的可分发制品。稳定的容器交付链要同时解决三件事：构建结果可重复、制品来源可追踪、进入生产的内容可验证。

![Docker 镜像与容器层](/container/docker-layer-model.svg)

## Dockerfile 的执行模型

构建命令接收 Dockerfile 和构建上下文。`COPY`、`ADD` 只能读取上下文中的文件，因此上下文应尽量小，并用 `.dockerignore` 排除源码仓库元数据、日志、测试报告和本地依赖目录。

```dockerfile
# syntax=docker/dockerfile:1
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
RUN --mount=type=cache,target=/root/.gradle ./gradlew dependencies --no-daemon
COPY src ./src
RUN --mount=type=cache,target=/root/.gradle ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 app
WORKDIR /app
COPY --from=build --chown=app:app /src/build/libs/*.jar app.jar
USER 10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

这里的构建阶段包含编译工具，运行阶段只保留 JRE 和产物。多阶段构建降低了运行镜像体积，也减少了生产镜像中的编译器、包管理器和源码。

## 分层与缓存

构建缓存按指令及其输入判断是否可复用。一层失效后，后续依赖层通常都要重新执行。因此，应先复制变化少的依赖描述，再下载依赖，最后复制频繁变化的源码。

```text
复制构建描述 -> 下载依赖 -> 复制源码 -> 编译 -> 组装运行镜像
    低频变化        可缓存       高频变化
```

不要为了减少层数把所有工作塞进一条难以维护的 `RUN`。真正需要控制的是无效缓存、残留下载文件和运行镜像内容。BuildKit 的缓存挂载可复用 Maven、Gradle、npm 等下载目录，密钥挂载则能让凭据只在构建步骤中临时可见，避免写进镜像层。

```bash
DOCKER_BUILDKIT=1 docker build --progress=plain -t order-api:dev .
docker history order-api:dev
docker image inspect order-api:dev
```

## CMD、ENTRYPOINT 与运行参数

`ENTRYPOINT` 定义镜像要执行的程序，`CMD` 常作为默认参数。JSON 数组形式不会经过 shell 展开，信号能更直接地到达主进程，适合作为服务镜像入口。

```dockerfile
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
CMD ["--spring.profiles.active=prod"]
```

运行时可以替换 `CMD` 参数：

```bash
docker run --rm order-api:dev --spring.profiles.active=test
```

入口脚本若要做模板渲染或前置检查，最后应使用 `exec "$@"` 交出 PID 1，确保停止信号传给应用并完成优雅退出。

## 标签、摘要与不可变制品

标签是便于阅读的指针，可能被重新指向；摘要是对镜像内容的标识。发布记录应同时保存版本标签和摘要。

```bash
docker tag order-api:dev registry.example.com/team/order-api:1.4.2
docker push registry.example.com/team/order-api:1.4.2
docker inspect --format='{{index .RepoDigests 0}}' registry.example.com/team/order-api:1.4.2
```

生产部署最好引用受控版本或摘要，避免同名标签被覆盖后出现“配置没变但实际镜像变了”。发布晋级也不应重新构建：测试通过的同一摘要从测试环境进入预发和生产，环境差异通过外部配置注入。

## 供应链检查点

一条可审计的链路通常包含：

1. 源码提交触发受控构建，记录提交 ID、构建器和依赖锁文件。
2. 生成镜像，同时产生软件物料清单（SBOM）和漏洞扫描结果。
3. 对镜像摘要签名，将签名、证明和扫描结果保存到制品系统。
4. Registry 使用命名空间和权限控制限制推送、拉取与删除。
5. 部署准入策略检查来源、签名、风险等级和允许的仓库。
6. 生产环境记录实际运行摘要，支持从运行实例追溯到源码和构建任务。

## 构建故障排查

| 现象 | 检查顺序 |
| --- | --- |
| 每次都重新下载依赖 | Dockerfile 指令顺序、锁文件是否先复制、缓存挂载是否启用 |
| 修改代码后构建结果没变化 | 构建上下文、`.dockerignore`、COPY 路径、实际使用的镜像标签 |
| 镜像体积异常 | `docker history`、基础镜像、多阶段构建、包管理器缓存 |
| 容器收到停止命令但不退出 | PID 1、shell 入口、是否使用 `exec`、应用优雅停机配置 |
| Registry 中同标签内容不一致 | 比对 RepoDigest，检查标签是否被覆盖 |
| 构建日志泄露凭据 | 删除 ARG/ENV 中的密钥，改用 BuildKit secret mount |

构建完成不代表镜像可交付。至少还要验证非 root 运行、只读文件系统兼容性、健康检查、停止信号、架构平台、漏洞风险和摘要追踪。
