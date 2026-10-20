---
title: Docker 常用命令
author: Walt
date: 2026-10-20
---

# Docker 常用命令

这份速查沿订单服务的排查过程组织。先确认操作的是哪台 daemon，再查看实例状态、日志、网络和挂载，最后才执行修复。示例中的 `orders` 是容器名，`order-api:dev` 是需要自行构建的应用镜像；临时观察示例使用官方 Alpine 镜像。

![Docker 排查中从管理端点到进程与请求证据的路径](/container/docker-diagnostic-path.svg)

## 先确认端点和对象

```bash
docker context show
docker context inspect
docker version
docker ps -a --filter name=orders
docker image ls
```

context 可以指向远程 daemon。名字过滤可能匹配多个对象，修改前要核对目标 ID；本机目录也不一定对远程 daemon 可见。`docker ps` 默认只显示运行中的实例，退出实例需要 `-a`。

```bash
docker inspect --type container \
  --format '{{json .State}}' orders
docker logs --since 10m --tail 200 --timestamps orders
docker stats --no-stream orders
docker top orders
```

状态中的退出码、`OOMKilled` 和错误信息应与日志时间对应。一次 `stats` 不能代表峰值；退出码 137 表示进程收到 SIGKILL，但不能仅凭它认定发生 OOM。`logs` 主要反映日志驱动可提供的标准输出和错误输出，不等于应用写到任意文件的全部日志。完整 `inspect` 可能含配置和环境变量，分享时应先确认内容。

## 创建、停止与重建

```bash
docker run -d --name orders \
  --publish 127.0.0.1:8080:8080 \
  --memory 512m --cpus 1 \
  order-api:dev
docker stop --timeout 30 orders
docker start orders
```

服务必须在容器网络接口上监听目标端口，通常为 `0.0.0.0:8080`。发布到 `127.0.0.1` 限制宿主机的入口；是否还存在其他网络路径，需要结合实际网络和防火墙判断。

`run` 新建实例，`start` 启动旧实例，`restart` 重启旧实例；更新标签或环境变量后执行 `restart` 不会自动替换实例配置和镜像。停止一般先发送配置的停止信号，等待超时后再强制终止。`kill` 默认直接发送 SIGKILL，应与正常退出区分。

重建前先核对挂载和数据保存。下面只删除已经确认可替换的旧实例：

```bash
docker inspect --type container --format '{{json .Mounts}}' orders
docker stop --timeout 30 orders
docker rm orders
```

删除容器会删除其可写层。命名卷的保留与清理单独管理，删除容器不是备份方法。

## exec：创建额外进程

`exec` 在运行中的容器中启动额外命令，不会替换 PID 1，也不负责管理命令的长期任务状态。主进程退出后，额外进程不能继续作为可靠后台服务；容器重启也不会自动重放上一次 exec。

```bash
docker exec orders id
docker exec -it orders sh
docker exec --user 10001:10001 --workdir /app orders ls -l
docker exec -e DEBUG=true orders /app/check.sh
```

只有镜像中存在对应程序时才能执行。精简镜像可能没有 shell、`curl`、`ps` 或包管理器，这时先用宿主 CLI 的状态、日志、进程视图排查。`-u` 改变本次进程身份，不自动解决挂载目录权限；`-e` 只影响这次新进程，不能改写已有主进程的环境。

`-i` 保持标准输入，`-t` 分配伪终端。交互式 shell 常用 `-it`，脚本管道和二进制数据传输通常不用 `-t`。命令不会自动交给 shell 解释：

```bash
docker exec orders sh -c 'printf "%s\n" "$HOSTNAME"; ls /tmp'
```

单引号让变量在容器里的 shell 展开。相反，`docker exec orders echo "$HOSTNAME"` 会先被宿主 shell 展开。重定向也一样：

```bash
docker exec orders cat /app/status.txt > ./orders-status.txt
```

这里的目标文件在运行 CLI 的电脑上。只有 exec 内部 shell 中的 `>` 才指向容器路径。数据库备份应使用对应客户端协议与一致性方案，并检查退出状态及恢复结果，不能把生成一个文件当作备份有效。

## 网络与文件证据

```bash
docker port orders
docker inspect --type container --format '{{json .NetworkSettings.Networks}}' orders
docker inspect --type container --format '{{json .Mounts}}' orders
docker network ls
docker volume ls
docker cp orders:/app/status.txt ./orders-status.txt
```

同一自定义网络中的服务通常通过名称和容器端口通信，不通过宿主发布端口。检查顺序是名称解析、目标监听、传输连接、应用协议、认证与响应内容。PostgreSQL 的 5432 端口不是 HTTP，应用 `pg_isready`、`psql` 等工具检查；`curl http://db:5432` 不能验证数据库业务连接。

复制文件可用于提取证据，但不能推断复制到容器的配置已被应用加载。更新 Nginx 配置后要先 `nginx -t`，再 reload 并复验请求；普通应用容器也不保证运行 systemd，不能默认用容器内 `systemctl` 管理服务。

## 镜像与清理范围

```bash
docker pull registry.example.com/team/order-api:1.4.2
docker image inspect registry.example.com/team/order-api:1.4.2
docker system df
docker container ls -a
docker image ls --filter dangling=true
docker volume ls
```

拉取与登录需要相应仓库、网络和权限。发布追踪见[镜像构建与供应链](./image-build-supply-chain)。清理前先区分磁盘占用是镜像、构建缓存、容器层还是卷，再列出候选对象并按对象删除：

```bash
docker rm old-orders
docker image rm order-api:old
docker volume inspect old-order-data
```

`image prune` 默认主要清理悬空镜像，`-a` 扩大到未被容器引用的镜像。`system prune` 还会处理停止容器、未使用网络和构建缓存等，`--volumes` 会进一步涉及卷，其具体范围应核对当前 CLI 帮助。未被使用不等于业务不再需要；不要把批量 prune、强制删除或自动重启作为日常排错第一步。

## 一个可直接运行的观察示例

```bash
docker run --rm public.ecr.aws/docker/library/alpine:3.22 \
  sh -c 'id; printf "working-directory: "; pwd; test -d /proc'
```

退出码 0 表示这三个观察动作成功，不证明订单应用可用。真实服务修复后应重放原失败请求，并检查状态、日志和数据结果。更完整的组合环境见[存储、网络与 Compose](./storage-network-compose)。
