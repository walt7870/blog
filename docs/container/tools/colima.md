---
title: Colima 本地容器环境
author: Walt
date: 2026-10-20
---

# Colima 本地容器环境

macOS 上安装 `docker` 命令，只得到客户端；运行 Linux 容器还需要 Linux 内核和服务端。Colima 通过 Lima 管理本地 Linux VM，在其中配置 Docker、containerd 等环境，宿主机的 CLI 再连接对应端点。本文以 macOS 上的 Docker 开发环境为主，命令与配置按 Colima 0.10.3 说明。

订单应用“命令连接失败”“源码挂载为空”“浏览器访问不到”分别可能发生在管理端点、文件共享和端口转发层。先分清路径，比反复删除 VM 更容易保留证据和数据。

![Colima 中宿主机、Linux VM、管理端点与数据路径](/container/colima-host-vm-boundaries.svg)

## 安装与确认端点

Colima 0.10.3 要求 macOS 13 或更新版本，支持 Intel 与 Apple Silicon。Homebrew 负责选择本机架构，避免在 Apple Silicon 上直接下载写死 `amd64` 的二进制。安装命令会修改本机软件环境：

```bash
brew install colima docker docker-compose docker-buildx
colima version
colima start --help
colima start --runtime docker --cpus 4 --memory 8 --disk 100
colima status
docker context ls
docker version
docker compose version
docker buildx version
```

CPU、内存与磁盘是 VM 的预算，内存和磁盘单位是 GiB；它们不是每个容器的限制。首次启动还会下载 VM 镜像，不能用固定 `sleep 10` 代替就绪判断。Docker、Compose 和 Buildx 分别确认客户端、插件与服务端可用；插件找不到时，执行 `brew info docker-compose docker-buildx`，按当前安装提示设置插件目录，不能把“Colima 已启动”等同于插件已安装。

默认配置会在启动后激活 Colima 的 Docker context。已有 Docker Desktop、远程 context 或 IDE 时，先看 `docker context ls` 和 `colima status`，核对目标端点再操作。`DOCKER_HOST`、`DOCKER_CONTEXT` 及命令行选项都可能改变连接目标；不要仅凭终端中显示的 context 名称判断实际请求发到了哪里。

```bash
docker context inspect colima
docker --context colima ps -a
```

上例使用默认 profile 的 `colima` context。其他 profile 以实际列表为准。IDE 支持 context 时选择同一项；只接受 socket 时使用 `colima status` 给出的路径。默认 socket 为 `~/.colima/default/docker.sock`，修改过 `COLIMA_HOME` 后路径会变化。

## 配置、模板与 profile

日常修改使用 `colima start --edit`。默认配置位于 `~/.colima/default/colima.yaml`，命名 profile 位于 `~/.colima/<名称>/colima.yaml`。下面是现有配置中可调整的片段，其他字段保留由工具生成的值：

```yaml
cpu: 4
memory: 8
disk: 100
runtime: docker
autoActivate: true
network:
  address: false
kubernetes:
  enabled: false
```

YAML 字段是 `cpu`，启动参数是 `--cpus`；`network.address` 是“是否分配可达 VM IP”的布尔值，不接受网段字符串。普通本地端口发布不要求开启这个选项。VM 的共享或桥接网络模式也不能当作 Docker 容器的 `--network host`。

已运行的 VM 修改资源后应停止再启动，不能指望再次执行普通 `start` 自动应用所有变化。磁盘可扩容，不支持就地缩小；VM 架构、运行时、VM 类型和挂载驱动等创建时选项也不能随意原地切换。需要不同组合时新建 profile，先迁移和验证数据。

```bash
colima stop
colima start --cpus 4 --memory 8
colima list
colima start order-lab --runtime docker --cpus 2 --memory 4 --activate=false
colima status order-lab
```

`order-lab` 是另一套本地 VM 配置和运行时数据，不是生产环境。`--activate=false` 避免启动实验 profile 时改掉当前客户端的默认目标；后续命令仍应显式确认 context。

`colima template` 编辑新实例使用的默认配置模板，路径为 `~/.colima/_templates/default.yaml`。它不提供 `template create/list/show` 这组子命令，`start --template` 也是布尔开关，不是选择命名模板的参数。已有实例的配置与新实例默认模板应分别维护。

## 文件怎样进入容器

绑定挂载分两步：macOS 目录先共享给 Linux VM，Docker 再把 VM 可见的路径挂进容器。默认用户主目录可写共享，但外接盘等主目录之外的路径需要在配置中声明。以下路径仅为示例，需替换为实际存在的目录：

```yaml
mounts:
  - location: /Volumes/DevData/orders
    writable: true
```

编辑并重新启动后，先从 VM 检查该路径，再检查容器的 `Mounts` 和实际文件。`docker cp` 成功只能说明复制动作完成，不能证明宿主共享目录正常。容器写入还要满足应用 UID 的权限；VM 能看到目录不等于非 root 进程可写。

订单导出的长期 CSV 或数据库数据可以进入命名卷，避免大量小文件经宿主共享反复读写。但命名卷位于该 profile 的运行时数据盘中，不是天然的宿主文件夹，也不是备份。数据库备份应通过数据库的一致性机制导出并验证恢复，不能只复制正在写入的底层数据文件。

挂载驱动要与 VM 类型匹配。macOS 13+ 的 VZ 可选 `virtiofs`；QEMU 有自己的挂载选择。不能把 `--mount-type virtiofs` 当作所有机器上通用的性能开关。Apple Silicon 上模拟 x86_64 也只解决部分兼容问题，不能代替目标架构的原生性能和原生库测试。

## 浏览器怎样访问服务

容器进程先监听容器内的接口和端口，Docker 再声明发布，Colima/Lima 将对应端口转发到宿主。使用前先核对 Docker context，并确保 8080 没有被其他服务占用：

```bash
docker --context colima run --rm --name colima-web-check \
  --publish 127.0.0.1:8080:8080 \
  public.ecr.aws/docker/library/alpine:3.22 \
  sh -c 'mkdir -p /www; printf "colima-web-ok\n" > /www/index.html; exec httpd -f -p 8080 -h /www'
```

在另一个终端请求 `http://127.0.0.1:8080/`，应得到 `colima-web-ok`；结束后在前一个终端按 Ctrl+C，`--rm` 删除该实验容器。这个检查只验证简单 TCP/HTTP 路径，不验证订单 API 或数据库。先请求 VM/容器，再请求宿主，可帮助区分应用监听、Docker 发布与宿主转发问题。

端口映射写在 `docker run --publish` 或 Compose `ports`，不是 `colima start --port-forward 8080:80`。只监听容器内 `127.0.0.1` 的应用，通常无法从容器外进入；宿主地址和容器监听地址是不同配置。UDP、指定宿主 IP、VPN 路由与桥接有各自约束，不能从一次 localhost TCP 成功推断所有网络路径都可用。

## containerd 与 Kubernetes 的边界

需要 containerd 环境时创建独立 profile，并用 `colima nerdctl` 管理，不把 Docker CLI 直接当作 containerd 客户端。Colima 的 Kubernetes 开关是在 VM 内启用 K3s；Kubernetes 是编排系统，不是 Docker 与 containerd 旁边的另一种容器运行时。

```bash
colima start k8s-lab --runtime containerd --kubernetes --activate=false
colima status k8s-lab
kubectl config get-contexts
```

后续 `kubectl` 命令显式选择列表中的实验 context，先检查节点与系统 Pod，再创建业务对象。`--kubernetes-version` 要匹配 K3s 的完整发行版本，不能随意填一个 Kubernetes 上游版本号。containerd 的镜像是否可供 Kubernetes 使用还与 namespace 有关，通常需要 `k8s.io`；在另一个 Docker daemon 上构建镜像，并不会自动出现在这里。

本地单 VM 集群可练习对象、控制循环和应用恢复，无法证明控制面高可用、跨节点故障迁移或多可用区容灾。需要多节点实验时，可比较 kind、k3d、minikube；进入生产设计则阅读[Kubernetes 导览](../kubernetes/)，不把本地 VM 资源调大当成高可用方案。

## 按证据排查与恢复

| 现象 | 先观察什么 | 修复后怎样验收 |
| --- | --- | --- |
| VM 启动失败 | `colima list`、启动错误、宿主架构、虚拟化与磁盘空间 | VM 运行，再确认所选运行时可访问 |
| CLI 连不上 daemon | profile 状态、context 端点、环境变量、socket | 对明确 context 执行 `docker version` 与 `ps` |
| 容器挂载为空 | 宿主原路径、VM 共享、容器 Mounts 与权限 | 用应用身份读取或写入目标文件 |
| 宿主 HTTP 不通 | 端口占用、进程监听、发布地址与转发层 | 从宿主重放原请求，核对响应内容 |
| 拉镜像失败 | VM 的 DNS、代理、证书和仓库认证 | 拉取同一个镜像并验证目标平台 |
| 升级后旧 profile 异常 | 版本与配置、新建实验 profile 的差异 | 先恢复实验，再验证旧应用与数据 |

观察 VM 可执行 `colima ssh -- uname -a`、`colima ssh -- df -h`。`--` 后是 VM 内命令，不是把一整条带空格的命令作为可执行文件名。Docker 的 events 是对象事件，应用日志仍用 `docker logs`；Kubernetes 日志必须指定 Pod 或受支持的资源选择方式，只有 namespace 不足以确定日志对象。

停止 VM 使用 `colima stop`，会影响该 VM 中所有工作负载。Colima 0.9 起运行时数据有独立数据盘，普通 `colima delete` 与加 `--data` 的删除范围不同；后者还会删除运行时数据。任何重建前都应确认当前版本、profile、备份与恢复方法，不能把一段 `down -v`、全局 prune、删除 VM 的组合脚本当作日常排错。

恢复后至少核对端点、镜像与平台、真实请求、文件落点和重启后的数据。Docker 命令与组合配置见[常用命令](../docker/command)和[存储、网络与 Compose](../docker/storage-network-compose)，本页只负责本地 VM 到这些工具之间的连接边界。
