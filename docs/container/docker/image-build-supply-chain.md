---
title: 镜像构建与供应链
author: Walt
date: 2026-07-12
---

# 镜像构建与供应链

订单 API 的测试通过后，生产环境应该拿到哪一份程序？答案需要落到镜像摘要、目标平台和构建记录。重新构建同一个标签，可能因为基础镜像或远程依赖变化得到不同内容，因此发布晋级应围绕经过验收的制品进行。

![源码输入经过构建、验证与摘要记录后晋级生产的流程](/container/docker-image-promotion.svg)

## 上下文决定能复制什么

普通 `COPY` 从构建上下文读取文件；`COPY --from` 则可以从其他构建阶段、镜像或命名上下文读取。`ADD` 还支持特定的远程来源与归档行为，不能用“只读取本地上下文”概括所有来源。订单应用只复制已验证 JAR 时，普通 `COPY` 已足够。

在项目根目录放置 `.dockerignore`，排除 `.git`、日志、临时凭据及无关产物。下面保留固定交付文件，避免通配符匹配多个 JAR：

```text
.git
.env*
secrets/
*.log
target/*
!target/app.jar
```

构建时的 `.` 是上下文目录，不是 Dockerfile 所在目录的同义词。`COPY` 找不到文件时，先检查调用目录、忽略规则和实际产物名称。

## 多阶段构建与确定产物

下面是 Maven 单模块项目的结构模板，要求项目将可执行产物固定为 `target/app.jar`，具体配置见[Java 应用镜像](./java-application)。真实发布还应固定依赖与基础镜像摘要。

```dockerfile
# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml ./
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B clean verify

FROM eclipse-temurin:21-jre
RUN groupadd --gid 10001 app \
    && useradd --uid 10001 --gid 10001 --no-create-home app
WORKDIR /app
COPY --from=build --chown=10001:10001 /workspace/target/app.jar /app/app.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

运行阶段没有复制 Maven 仓库、源码和编译工具，能减少交付内容。`groupadd/useradd` 适用于此模板选用的 Linux 基础镜像，不能照搬到没有这些工具的 distroless 镜像。多模块、Maven Wrapper 和私有仓库项目还需复制对应构建输入，不能假设只靠一个 `pom.xml` 就能构建。

## 缓存与密钥是不同机制

普通层缓存根据指令及相关输入决定能否复用；依赖输入改变会影响后续构建。缓存挂载则复用下载目录，不保证构建确定性，运行阶段也不会自动包含这些缓存。诊断缓存时，先确认构建输入和日志，不要先把所有缓存删掉。

私有 Maven 仓库凭据可以用 BuildKit secret mount，在需要的构建步骤中临时提供：

```dockerfile
RUN --mount=type=cache,target=/root/.m2 \
    --mount=type=secret,id=maven_settings,target=/root/.m2/settings.xml,required=true \
    mvn -B clean verify
```

```bash
docker build --secret id=maven_settings,src=/path/to/settings.xml \
  --progress=plain -t order-api:dev .
docker history order-api:dev
```

该片段替换前面的构建 `RUN`。不要用 ARG、ENV 或先 COPY 再删除的方式传入密钥：删除后旧层仍可能包含内容。secret mount 也无法阻止构建命令主动复制或打印密钥，应同时约束构建脚本和日志。

## 标签、摘要与平台

标签是名字，摘要标识内容。构建后的本地 image ID、仓库 manifest 摘要和多平台索引摘要不是同一个对象，发布记录要明确记录的是哪一个。推送可以得到仓库发布摘要，再查看发布端的清单和平台信息：

```bash
docker tag order-api:dev registry.example.com/team/order-api:1.4.2
docker push registry.example.com/team/order-api:1.4.2
docker buildx imagetools inspect registry.example.com/team/order-api:1.4.2
```

测试、预发和生产使用同一份经过验证的摘要；跨仓库复制后仍应核对目标摘要与平台，不能假设复制工具一定原样保留表示形式。CPU 架构与基础镜像必须适配部署节点；模拟运行通过也不能代替目标机器上的性能与设备验证。

## 从来源记录到部署验收

构建记录应能从镜像追溯到源码提交、构建器、依赖锁定和基础镜像。SBOM 描述包含的软件，漏洞扫描按当时数据库发现已知风险，签名与证明供策略核验来源；三者解决的问题不同。签名有效不代表没有漏洞，扫描通过也不代表发布者可信。

部署端需真正执行允许仓库、签名和风险策略，而非只在 CI 里生成文件。镜像发布后还要验收非 root 权限、启动请求、资源预算、停止行为和实际运行摘要；出现失败时，应能恢复上一份已验证制品及兼容配置。数据库模式发生变化时，镜像回退也必须检查数据兼容性。

## 排查入口

| 现象 | 检查对象 |
| --- | --- |
| 修改源码没有进入镜像 | 上下文、忽略规则、COPY 输入和实际运行摘要 |
| 缓存总失效或依赖反复下载 | 指令输入、缓存挂载、构建器与下载源 |
| COPY 匹配多个 JAR | 打包插件输出、固定文件名和多模块路径 |
| ARM 节点启动失败 | 发布索引、所选平台与本地构建平台 |
| 同标签在不同环境行为不同 | 实际摘要、运行配置、外部依赖与节点环境 |
| 日志中出现凭据 | 构建命令、脚本输出、ARG/ENV 和层内容；同时轮换已泄露凭据 |

文件和端口合同见[存储、网络与 Compose](./storage-network-compose)，Java 的产物与运行参数见[Java 应用镜像](./java-application)。
