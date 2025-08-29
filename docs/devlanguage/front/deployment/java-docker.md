# Java应用的镜像部署

## 核心思路

1. Maven 先编译 & 打包 Java 项目（.jar / .war）。

2. 用插件（或外部命令）去调用 Docker，根据 Dockerfile 构建镜像。

## 配置pom

``` xml
    <build>
        <plugins>
            <!-- 打 jar 包 -->
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <version>3.3.0</version> <!-- Spring Boot 对应版本 -->
                <executions>
                    <execution>
                        <goals>
                            <goal>repackage</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>

            <!-- Docker 构建插件 -->
            <plugin>
                <groupId>com.spotify</groupId>
                <artifactId>dockerfile-maven-plugin</artifactId>
                <version>1.4.13</version>
                <configuration>
                    <!-- 镜像名称 -->
                    <repository>spai</repository>
                    <tag>v1</tag>
                    <!-- Dockerfile 路径 -->
                    <dockerfile>${project.basedir}/Dockerfile</dockerfile>
                    <!-- 构建上下文 -->
                    <contextDirectory>${project.basedir}</contextDirectory>
                </configuration>
                <executions>
                    <execution>
                        <id>default</id>
                        <goals>
                            <goal>build</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>

```

## Dockerfile

``` dockerfile
# 使用官方 Eclipse Temurin JDK 21 作为基础镜像
FROM eclipse-temurin:21-jdk

# 设置工作目录
WORKDIR /app

# 复制 Maven 构建产物
COPY target/spai-0.0.1.jar app.jar

# 暴露应用端口（可选）
EXPOSE 8080

# 启动应用
ENTRYPOINT ["java", "-jar", "app.jar"]

```

## 构建

运行 maven 构建命令，会自动调用 Dockerfile 构建镜像。

``` bash
#构建
mvn clean package dockerfile:build

#运行
docker run -d -p 8080:8080 spai:v1

#查看运行中的容器
docker ps

#查看日志
docker logs <container_id>

```
