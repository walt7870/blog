---
title: 存储、网络与 Compose
author: Walt
date: 2026-07-12
---

# 存储、网络与 Compose

容器启动成功只是运行入口。真实应用还要处理数据写到哪里、服务怎样互相访问、依赖未就绪时如何重试，以及多服务环境怎样被一致地创建和销毁。

## 数据写入的四个位置

| 位置 | 生命周期 | 适合内容 | 注意事项 |
| --- | --- | --- | --- |
| 镜像层 | 随镜像发布，只读 | 程序、运行依赖、默认静态资源 | 修改后必须重建镜像 |
| 容器可写层 | 随容器存在 | 临时缓存、可丢弃中间文件 | 重建容器后不应依赖其数据 |
| Volume | 独立于容器 | 数据库文件、需要长期保存的数据 | 由 Docker 管理位置和生命周期 |
| Bind Mount | 直接映射主机路径 | 本地源码、开发配置、明确的宿主目录 | 权限和主机目录结构会影响可移植性 |

`tmpfs` 把临时数据放在内存中，适合不应落盘的短期文件，但会消耗内存且重启即丢失。数据库目录不应写在容器可写层，因为容器替换和镜像升级会让数据边界失控。

```bash
docker volume create order-db
docker run -d --name postgres \
  -v order-db:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=change-me \
  postgres:16

docker volume inspect order-db
```

挂载问题先检查“容器内路径是否正确”，再检查主机或 Volume 权限。容器内 UID 可能与主机用户名无关；生产镜像使用固定 UID 后，挂载目录也要允许该 UID 读写。

## 从进程端口到主机端口

应用在容器中监听 `127.0.0.1` 时，只允许容器自己的回环接口访问。要让其他容器或端口映射访问，服务通常应监听 `0.0.0.0` 或对应容器接口。

```bash
docker run --rm -p 127.0.0.1:8080:8080 order-api:dev
```

三段含义依次是主机监听地址、主机端口、容器端口。发布端口只解决“主机如何进入容器”；同一自定义网络中的容器之间应通过服务名和容器端口访问，不要绕到主机暴露端口。

```bash
docker network create order-net
docker run -d --name db --network order-net postgres:16
docker run --rm --network order-net order-api:dev \
  --db.url=jdbc:postgresql://db:5432/postgres
```

这个链路可分为五层检查：应用是否监听、容器端口是否正确、目标名称能否解析、网络是否相连、主机端口是否发布。`EXPOSE` 只记录镜像预期端口，不会自动创建主机端口映射。

## 用 Compose 固化多服务环境

Compose 把服务、网络、卷、配置和依赖关系写进一个声明文件。它适合本地开发、集成测试和单机多服务部署，不提供跨节点调度和集群故障迁移。

```yaml
services:
  api:
    image: registry.example.com/team/order-api:1.4.2
    ports:
      - "127.0.0.1:8080:8080"
    environment:
      DB_URL: jdbc:postgresql://db:5432/orders
      DB_USER: orders
      DB_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "-", "http://localhost:8080/actuator/health"]
      interval: 10s
      timeout: 3s
      retries: 12
    restart: unless-stopped

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: orders
      POSTGRES_USER: orders
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      - db-data:/var/lib/postgresql/data
    secrets:
      - db_password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U orders -d orders"]
      interval: 5s
      timeout: 3s
      retries: 20

volumes:
  db-data:

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

`depends_on` 的健康条件可以控制启动顺序，但应用仍然要能处理数据库连接短暂失败。依赖在运行期间可能重启，只有重试、超时和熔断能覆盖这种情况。

## 操作与验证

```bash
docker compose config
docker compose up -d
docker compose ps
docker compose logs -f api
docker compose exec db psql -U orders -d orders
docker compose down
```

`docker compose config` 会展开变量并检查合并后的模型，应在启动前执行。`down` 默认删除容器和网络，不删除命名卷；只有明确确认数据可以清空时才使用 `down -v`。

## 排查闭环

| 现象 | 验证入口 | 常见原因 |
| --- | --- | --- |
| API 无法连接数据库 | `docker compose exec api getent hosts db` | 服务名错误、网络不同、数据库未就绪 |
| 主机访问 8080 失败 | `docker compose ps`、应用日志 | 未发布端口、应用只监听回环地址、进程退出 |
| 数据重建后消失 | `docker volume ls`、检查挂载点 | 写入了容器层、执行了 `down -v`、挂载路径错误 |
| 挂载目录无权限 | `docker inspect`、容器内 `id` | 主机目录 UID/GID 与容器用户不匹配 |
| 服务反复重启 | `docker compose logs`、检查退出码 | 启动参数错误、依赖不可用、健康检查命令错误 |
| 修改配置不生效 | `docker compose config` | 变量来源、旧容器、Bind Mount 覆盖镜像文件 |

当单机已经不能满足节点故障恢复、多副本、滚动发布和统一权限治理时，再把相同的镜像迁移到 Kubernetes。迁移的是部署模型，不应在迁移时重新制作应用制品。
