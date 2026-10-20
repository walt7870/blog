---
title: 存储、网络与 Compose
author: Walt
date: 2026-07-12
---

# 存储、网络与 Compose

订单服务在运行中需要连接数据库，把导出的 CSV 留给后续下载。容器启动成功只说明主进程还在，不能证明数据库已就绪、文件能保留或请求可以到达。部署配置应明确数据落点、服务地址和失败后的恢复方式。

![订单 API 经内部网络访问数据库并将结果写入独立卷的关系](/container/docker-compose-data-network.svg)

## 数据写入与生命周期

| 位置 | 保存边界 |
| --- | --- |
| 镜像层 | 程序及默认文件；运行实例不会原地修改发布镜像 |
| 容器可写层 | 跟随该实例；删除重建后不能依赖原数据 |
| 命名卷 | Docker 管理；生命周期与单个容器分开 |
| 绑定挂载 | 直接使用 daemon 所在主机路径，受目录、权限及共享机制影响 |
| tmpfs | 临时内存文件；停止后不保留，仍需计算资源消耗 |

挂载会遮住镜像中的同名路径。Docker 给空卷初始化内容还有默认复制行为，应与绑定挂载区分。容器内固定 UID 后，挂载目录也需允许相应身份访问；macOS 的宿主路径还经过虚拟机文件共享。命名卷可保留并不等于有备份，数据库应单独验证一致性备份和恢复。

## 端口发布与内部通信

```bash
docker run --rm --publish 127.0.0.1:8080:8080 order-api:dev
```

三段分别为宿主地址、宿主端口、容器端口。服务通常要监听 `0.0.0.0:8080`，仅监听容器内 `127.0.0.1` 时，其他容器及通常的端口转发无法进入。`EXPOSE` 是镜像元数据，不会自动创建宿主端口。

同一自定义网络中的容器可通过名称和容器端口访问。下面是隔离实验，先设置仅用于实验的密码；两个容器共用网络，数据库不向宿主发布端口：

```bash
printf '实验数据库密码: '
read -r -s POSTGRES_PASSWORD
printf '\n'
export POSTGRES_PASSWORD
docker network create order-doc-net
docker run -d --name order-doc-db --network order-doc-net \
  -e POSTGRES_PASSWORD -e POSTGRES_USER=orders -e POSTGRES_DB=orders \
  --mount type=volume,src=order-doc-db-data,dst=/var/lib/postgresql/data \
  postgres:16-alpine
docker exec order-doc-db pg_isready -h 127.0.0.1 -U orders -d orders
```

这里的静默输入适用于 Bash 或 zsh。`pg_isready` 失败时先查看数据库日志，等待初始化后重试。指定 TCP 地址可以避开初始化期间临时服务的 Unix socket，减少提前就绪的误判。它证明服务能否接收连接，不证明应用密码和 SQL 权限正确；还要用真实应用身份建立连接。环境变量可被有管理权限的人读取，生产凭据应采用受控分发方式。

## Compose 声明的合同

Compose 适合本地开发、集成测试和单机组合部署，不提供跨节点故障迁移。下面是订单应用的结构模板，前提是应用已经实现 `DB_PASSWORD_FILE` 的读取，并且提供相应健康端点；这些不是 Docker 或 Spring Boot 自动支持的自定义变量。

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
    volumes:
      - exports:/exports
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: orders
      POSTGRES_USER: orders
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -h 127.0.0.1 -U orders -d orders"]
      interval: 5s
      timeout: 3s
      retries: 20
    restart: unless-stopped

volumes:
  db-data:
  exports:

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

PostgreSQL 官方镜像实现了 `POSTGRES_PASSWORD_FILE`，API 需要自行实现对应配置。实验中把密码文件存于权限受控且未纳入版本库的目录。普通本地 Compose 的文件型 secret 并非加密保险箱，仍依赖宿主文件和 Docker 管理权限。

`service_healthy` 控制启动依赖门槛；数据库之后仍可能重启或断连，API 必须处理重连、超时和重复请求。`restart` 策略处理进程退出，单独变成 unhealthy 通常不会触发 Docker 自动重启。若给 API 加健康检查，必须确认镜像存在所用探测程序，不能默认 JRE 镜像自带 `curl` 或 `wget`。

## 创建、重建与数据验收

```bash
docker compose config --quiet
docker compose up -d
docker compose ps
docker compose logs --since 10m --tail 100 api db
docker compose exec db pg_isready -h 127.0.0.1 -U orders -d orders
docker compose down
```

先验证合并模型，再启动并检查原始请求、应用连接和文件结果。`config` 的完整输出可能展开敏感环境变量，检查结构可先用 `--quiet`。配置或镜像更新通常需要 `up -d` 触发对应重建；单纯 `restart` 不会应用新环境变量。

`down` 默认删除容器和网络，保留普通命名卷；外部卷由外部管理。`down -v` 会扩大卷清理范围，不能用于希望保留数据库的正常重建。项目名变化也可能创建另一组卷，看起来像“数据丢失”，应先核对实际卷名和挂载关系。

## 排查与退出实验

| 现象 | 先取证，再修复 |
| --- | --- |
| API 连不上数据库 | 内部名称、同网关系、监听、就绪、认证与应用连接错误 |
| 宿主 8080 不通 | 实际发布地址、应用监听、进程状态和防火墙 |
| CSV 重建后消失 | 是否写到 `/exports` 挂载、项目名及卷对象是否改变 |
| 数据库修改密码后仍认证失败 | 初始化变量是否仅对新数据目录生效，核对数据库内账号状态 |
| unhealthy 但没有重启 | 区分健康状态和进程退出，检查探针是否存在及退出码 |

前面的独立数据库实验结束后，先停止并删除实验容器、再删除专用网络：

```bash
docker stop order-doc-db
docker rm order-doc-db
docker network rm order-doc-net
unset POSTGRES_PASSWORD
```

专用命名卷 `order-doc-db-data` 此时保留。确认其中只有可丢弃实验数据后，才执行 `docker volume rm order-doc-db-data`。不要用全局 prune 代替精确清理。
