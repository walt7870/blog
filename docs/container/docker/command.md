# Docker 常用命令详解

## 概述

Docker 是一个开源的容器化平台，提供了丰富的命令行工具来管理容器、镜像、网络和存储卷。本文档详细介绍了 Docker 的常用命令，特别是 `docker exec` 命令的使用场景和实际示例。

## 基础命令

### 镜像管理

#### docker pull
从 Docker Hub 或其他镜像仓库拉取镜像。

```bash
# 拉取最新版本的镜像
docker pull nginx

# 拉取指定版本的镜像
docker pull nginx:1.21

# 从指定仓库拉取镜像
docker pull registry.example.com/nginx:latest
```

#### docker images
列出本地所有镜像。

```bash
# 显示所有镜像
docker images

# 显示镜像的详细信息
docker images --no-trunc

# 只显示镜像 ID
docker images -q
```

#### docker rmi
删除本地镜像。

```bash
# 删除指定镜像
docker rmi nginx:latest

# 强制删除镜像（即使有容器在使用）
docker rmi -f nginx:latest

# 删除所有未使用的镜像
docker image prune
```

### 容器管理

#### docker run
创建并启动一个新容器。

```bash
# 基本运行
docker run nginx

# 后台运行并指定名称
docker run -d --name my-nginx nginx

# 端口映射
docker run -d -p 8080:80 nginx

# 挂载数据卷
docker run -d -v /host/path:/container/path nginx

# 设置环境变量
docker run -d -e ENV_VAR=value nginx

# 交互式运行
docker run -it ubuntu /bin/bash
```

#### docker ps
列出容器信息。

```bash
# 显示正在运行的容器
docker ps

# 显示所有容器（包括已停止的）
docker ps -a

# 只显示容器 ID
docker ps -q

# 显示最近创建的容器
docker ps -l
```

#### docker stop/start/restart
控制容器的运行状态。

```bash
# 停止容器
docker stop container_name

# 启动已停止的容器
docker start container_name

# 重启容器
docker restart container_name

# 强制停止容器
docker kill container_name
```

#### docker rm
删除容器。

```bash
# 删除已停止的容器
docker rm container_name

# 强制删除正在运行的容器
docker rm -f container_name

# 删除所有已停止的容器
docker container prune
```

## Docker Exec 命令详解

### 基本语法

`docker exec` 命令用于在正在运行的容器中执行命令。这是 Docker 中最重要的调试和管理命令之一。

```bash
docker exec [OPTIONS] CONTAINER COMMAND [ARG...]
```

### 常用选项

- `-i, --interactive`: 保持 STDIN 打开，即使没有附加终端
- `-t, --tty`: 分配一个伪终端
- `-d, --detach`: 在后台运行命令
- `-e, --env`: 设置环境变量
- `-w, --workdir`: 指定工作目录
- `-u, --user`: 指定用户名或 UID
- `--privileged`: 给予扩展权限

### 使用场景和示例

#### 场景1：进入容器进行调试

当容器出现问题时，最常见的需求是进入容器内部查看状态、检查日志或修改配置。

```bash
# 进入正在运行的容器的 bash 终端
docker exec -it my-nginx /bin/bash

# 如果容器没有 bash，可以使用 sh
docker exec -it my-alpine /bin/sh

# 以 root 用户身份进入容器
docker exec -it -u root my-container /bin/bash
```

**实际应用示例：**
```bash
# 启动一个 nginx 容器
docker run -d --name web-server -p 8080:80 nginx

# 进入容器检查配置文件
docker exec -it web-server /bin/bash

# 在容器内执行
root@container:/# cat /etc/nginx/nginx.conf
root@container:/# ls -la /var/log/nginx/
root@container:/# exit
```

#### 场景2：执行单个命令

有时只需要在容器中执行特定命令，而不需要进入交互式终端。

```bash
# 查看容器内的进程
docker exec my-container ps aux

# 查看容器内的文件
docker exec my-container ls -la /app

# 检查容器内的网络配置
docker exec my-container ip addr show

# 查看容器内的环境变量
docker exec my-container env
```

**实际应用示例：**
```bash
# 检查数据库容器的连接状态
docker exec mysql-container mysqladmin -u root -p status

# 查看 Redis 容器的内存使用情况
docker exec redis-container redis-cli info memory

# 检查应用容器的日志文件
docker exec app-container tail -f /var/log/app.log
```

#### 场景3：文件操作和数据管理

在容器中进行文件的创建、修改、备份等操作。

```bash
# 在容器中创建文件
docker exec my-container touch /tmp/test.txt

# 在容器中创建目录
docker exec my-container mkdir -p /app/data

# 修改文件权限
docker exec my-container chmod 755 /app/script.sh

# 查看文件内容
docker exec my-container cat /etc/hosts
```

**实际应用示例：**
```bash
# 在 Web 服务器容器中更新配置文件
docker exec web-server cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak
docker exec web-server sed -i 's/worker_processes auto/worker_processes 4/' /etc/nginx/nginx.conf

# 重新加载配置
docker exec web-server nginx -s reload
```

#### 场景4：数据库操作

对数据库容器进行管理和维护操作。

```bash
# 连接到 MySQL 数据库
docker exec -it mysql-container mysql -u root -p

# 执行 SQL 查询
docker exec mysql-container mysql -u root -p -e "SHOW DATABASES;"

# 备份数据库
docker exec mysql-container mysqldump -u root -p --all-databases > backup.sql

# 连接到 PostgreSQL 数据库
docker exec -it postgres-container psql -U postgres
```

**实际应用示例：**
```bash
# 启动 MySQL 容器
docker run -d --name mysql-db -e MYSQL_ROOT_PASSWORD=secret mysql:8.0

# 等待数据库启动完成
sleep 30

# 创建数据库和用户
docker exec mysql-db mysql -u root -psecret -e "
CREATE DATABASE myapp;
CREATE USER 'appuser'@'%' IDENTIFIED BY 'apppass';
GRANT ALL PRIVILEGES ON myapp.* TO 'appuser'@'%';
FLUSH PRIVILEGES;"

# 验证创建结果
docker exec mysql-db mysql -u root -psecret -e "SHOW DATABASES;"
```

#### 场景5：应用程序管理

管理容器中运行的应用程序，如重启服务、更新配置等。

```bash
# 重启应用服务
docker exec my-app systemctl restart myservice

# 查看应用状态
docker exec my-app systemctl status myservice

# 执行应用脚本
docker exec my-app /app/scripts/maintenance.sh

# 查看应用进程
docker exec my-app pgrep -f myapp
```

**实际应用示例：**
```bash
# 在 Node.js 应用容器中执行 npm 命令
docker exec node-app npm install
docker exec node-app npm run build
docker exec node-app npm test

# 在 Python 应用容器中执行管理命令
docker exec django-app python manage.py migrate
docker exec django-app python manage.py collectstatic --noinput
docker exec django-app python manage.py createsuperuser
```

#### 场景6：网络和系统诊断

诊断容器的网络连接和系统状态。

```bash
# 测试网络连接
docker exec my-container ping google.com
docker exec my-container curl -I http://example.com
docker exec my-container nslookup example.com

# 查看网络接口
docker exec my-container ip addr show
docker exec my-container netstat -tulpn

# 查看系统资源
docker exec my-container top
docker exec my-container df -h
docker exec my-container free -m
```

**实际应用示例：**
```bash
# 诊断微服务之间的连接问题
docker exec frontend-service curl -v http://backend-service:8080/health
docker exec backend-service curl -v http://database-service:5432

# 检查容器的资源使用情况
docker exec my-app ps aux --sort=-%cpu | head -10
docker exec my-app du -sh /var/log/*
```

#### 场景7：后台任务执行

在容器中执行长时间运行的后台任务。

```bash
# 在后台执行命令
docker exec -d my-container /app/scripts/backup.sh

# 在后台启动服务
docker exec -d my-container /usr/sbin/sshd

# 在指定工作目录执行命令
docker exec -w /app my-container python script.py
```

**实际应用示例：**
```bash
# 在后台执行数据备份任务
docker exec -d database-container /scripts/daily-backup.sh

# 启动额外的监控进程
docker exec -d app-container /usr/local/bin/monitor.py
```

### 最佳实践

#### 1. 安全考虑

```bash
# 避免以 root 用户执行命令，使用指定用户
docker exec -u appuser my-container /app/script.sh

# 限制执行权限
docker exec --user 1000:1000 my-container command
```

#### 2. 环境变量管理

```bash
# 设置临时环境变量
docker exec -e DEBUG=true my-container /app/debug.sh

# 使用多个环境变量
docker exec -e VAR1=value1 -e VAR2=value2 my-container command
```

#### 3. 错误处理

```bash
# 检查命令执行结果
if docker exec my-container test -f /app/ready; then
    echo "Application is ready"
else
    echo "Application is not ready"
fi

# 获取命令退出码
docker exec my-container command
echo "Exit code: $?"
```

#### 4. 脚本自动化

```bash
#!/bin/bash
# 自动化容器管理脚本

CONTAINER_NAME="my-app"

# 检查容器是否运行
if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
    echo "Container is running, executing health check..."
    docker exec $CONTAINER_NAME /app/health-check.sh
    
    if [ $? -eq 0 ]; then
        echo "Health check passed"
    else
        echo "Health check failed, restarting container..."
        docker restart $CONTAINER_NAME
    fi
else
    echo "Container is not running"
fi
```

## 其他重要命令

### docker logs
查看容器日志。

```bash
# 查看容器日志
docker logs my-container

# 实时跟踪日志
docker logs -f my-container

# 查看最近的日志
docker logs --tail 100 my-container

# 显示时间戳
docker logs -t my-container
```

### docker cp
在容器和主机之间复制文件。

```bash
# 从容器复制文件到主机
docker cp my-container:/app/config.json ./config.json

# 从主机复制文件到容器
docker cp ./new-config.json my-container:/app/config.json

# 复制目录
docker cp my-container:/app/logs ./container-logs
```

### docker inspect
查看容器或镜像的详细信息。

```bash
# 查看容器详细信息
docker inspect my-container

# 查看特定字段
docker inspect --format='{{.State.Status}}' my-container

# 查看网络配置
docker inspect --format='{{.NetworkSettings.IPAddress}}' my-container
```

### docker stats
查看容器资源使用情况。

```bash
# 查看所有容器的资源使用情况
docker stats

# 查看特定容器的资源使用情况
docker stats my-container

# 只显示一次统计信息
docker stats --no-stream
```

## 总结

`docker exec` 是 Docker 容器管理中最重要的命令之一，它提供了与运行中容器交互的强大能力。通过合理使用 `docker exec`，我们可以：

1. **调试和故障排除**：进入容器内部检查问题
2. **配置管理**：动态修改容器配置
3. **数据操作**：执行数据备份、迁移等任务
4. **应用管理**：管理容器内的应用程序和服务
5. **监控和诊断**：检查系统状态和性能

掌握这些命令和使用场景，将大大提高 Docker 容器的管理效率和问题解决能力。在实际使用中，建议结合具体的应用场景，选择合适的参数和选项，确保操作的安全性和有效性。