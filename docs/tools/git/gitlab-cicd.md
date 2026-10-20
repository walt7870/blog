# GitLab CI/CD 搭建与发布

自建 GitLab 只是代码托管的起点。真正可交付的 CI/CD，需要把代码审核、构建算力、制品、部署权限、运行验收和回滚连接起来：维护者合并代码后，系统能够发布确定的版本；失败时能够定位停在哪一层；发布异常时能够恢复发布前的状态。

这里以一个包含订单 API 和管理前端的项目为例，按“部署 GitLab → 接入 Runner → 跑通验证 → 构建制品 → 发布测试环境 → 完善通知与回滚 → 推广到其他仓库”的顺序说明。容器服务发布到 Kubernetes，静态前端发布到对象存储。配置以 **2026 年 9 月的 GitLab Runner 认证令牌工作流、Docker Compose v2 和 Kubernetes executor** 为边界；具体镜像、Helm Chart 和工具版本应固定到实际验收过的版本。

示例统一使用 `git.example.com`、`team/order-api`、`app-test` 等演示名称。命令中的版本、镜像仓库和环境变量需要按部署环境填写。GitLab 主机和已有 Kubernetes 集群的安装权限是前提；云账号、网络与集群本身的创建不在本文展开，相关模型可先阅读 [Kubernetes 总览](/docs/container/kubernetes/)。

## 先确定发布链路和边界

对订单 API，期望链路是：开发者提交 MR，维护者合并到受保护的 `test` 分支，流水线测试代码、构建镜像、推送镜像仓库、更新测试工作负载，最后执行接口验收并通知。测试通过后，生产发布再使用独立的身份和环境门禁。

![GitLab CI/CD 组件与权限关系](/git/gitlab-cicd-architecture.svg)

| 组件 | 职责 | 不能据此推断的事情 |
| --- | --- | --- |
| GitLab | 仓库、MR、流水线编排、变量和作业记录 | GitLab 启动成功不代表能执行构建 |
| Runner manager | 向 GitLab 请求任务，创建和清理执行环境 | 管理 Pod 正常不代表某个项目能调度作业 |
| CI 作业 Pod | 拉代码、测试、编译、推送或部署 | Pod 执行完毕不代表业务发布成功 |
| 镜像仓库／对象存储 | 保存可追溯的发布产物 | 上传成功不代表运行环境已切换版本 |
| Kubernetes／静态站点 | 运行或分发指定版本 | 滚动更新完成、首页返回 200 都不是完整业务验收 |

Kubernetes executor 中，Runner manager 通常作为 Deployment 常驻，每个 GitLab CI Job 对应一个临时 **Pod**。它不是每次启动一个 Runner，也不是默认创建 Kubernetes Job。数据库迁移、批处理和集群内冒烟测试，才可能由部署脚本另外创建 Kubernetes Job。

国内与海外环境可以共用 GitLab 控制面，但执行算力应尽量靠近依赖源、镜像仓库和部署目标。海外 Runner 能访问 GitLab，不代表国内 GitLab 主机能访问海外代码源。先分别验证网络路径，再决定镜像导入、缓存和发布的位置。

## 第一步：把 GitLab 部署成可维护的服务

### 数据先于容器

GitLab 的状态不只包括 Git 仓库，还有数据库、附件、LFS 对象、配置和加密所需文件。先准备固定的宿主机挂载目录，再启动容器：

```text
/srv/gitlab/
├── compose/       # Compose 配置和版本记录
├── config/        # /etc/gitlab
├── data/          # /var/opt/gitlab
└── logs/          # /var/log/gitlab
```

`/srv/gitlab/compose/compose.yaml`：

```yaml
services:
  gitlab:
    image: gitlab/gitlab-ce:${GITLAB_VERSION:?请设置固定版本}
    container_name: gitlab
    hostname: git.example.com
    restart: unless-stopped
    shm_size: 256m
    environment:
      GITLAB_OMNIBUS_CONFIG: |
        external_url 'https://git.example.com'
        nginx['listen_port'] = 80
        nginx['listen_https'] = false
        letsencrypt['enable'] = false
        gitlab_rails['gitlab_shell_ssh_port'] = 2222
    ports:
      - '127.0.0.1:8929:80'
      - '2222:22'
    volumes:
      - /srv/gitlab/config:/etc/gitlab
      - /srv/gitlab/data:/var/opt/gitlab
      - /srv/gitlab/logs:/var/log/gitlab
```

在该目录的本地 `.env` 中设置已选定的完整镜像标签，例如 `GITLAB_VERSION=<版本号>-ce.0`，不要使用浮动的 `latest`。使用 Compose v2 启动和检查：

```bash
docker compose config --quiet
docker compose up -d
docker compose ps
docker exec gitlab gitlab-ctl status
```

宿主机 Nginx 终止 HTTPS，再代理到本机 `8929`。这样公网只开放 HTTPS、证书验证所需的 HTTP，以及确实需要的 Git SSH 端口；不用把 GitLab 的内部 HTTP 端口暴露出去。Git SSH 的 `2222` 与主机管理 SSH 的 `22` 是两条不同通道。

独立目录便于容器重建和数据迁移，但**独立目录不等于独立磁盘，更不等于备份**。用 `findmnt -T /srv/gitlab/data` 和 `df -h /srv/gitlab/data` 确认实际挂载；构建缓存也不应无上限地挤占 GitLab 数据盘。

### 域名、反向代理和证书必须一致

先确认 DNS 指向正确入口，并完成证书签发。以下片段位于 Nginx 的 `http` 上下文，证书文件需要事先安装：

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name git.example.com;
    location /.well-known/acme-challenge/ {
        root /var/www/acme;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name git.example.com;
    ssl_certificate     /etc/nginx/ssl/git.example.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/git.example.com/privkey.pem;
    client_max_body_size 512m;

    location / {
        proxy_pass http://127.0.0.1:8929;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 3600;
    }
}
```

签发第一张证书时，可以先启用 HTTP 校验站点，证书安装后再启用 HTTPS 配置。自动续期需要包含“重新签发 → 安装到 Nginx 使用的路径 → `nginx -t` → reload”整条链路，只有定时执行签发命令还不够。下载得到的一份证书文件本身不会自动续期。

更换域名时，要同步检查 DNS、证书、`external_url`、Runner URL、Git remote、Webhook，以及使用该域名作为 issuer 的身份信任配置。旧域名的错误不能作为新入口是否正常的证据。

验收应从 GitLab 主机和 Runner 所在网络各做一次：

```bash
curl --fail --silent --show-error https://git.example.com/users/sign_in -o /dev/null
git ls-remote https://git.example.com/team/demo.git
# SSH 克隆需要提前配置用户公钥，并核对服务端主机密钥指纹
ssh -T -p 2222 git@git.example.com
```

私有项目的 HTTPS 认证应交给凭据管理工具，不把令牌拼在 URL 中。若主机内服务正常、公网出现拦截页或 TLS 被重置，应检查云侧入口、安全规则及域名接入状态。SSH 能登录主机，只证明管理通道可用。

### 账号策略和恢复能力

在管理后台明确注册策略：内部实例可以关闭自助注册，或采用邮箱域名限制加管理员审批。域名限制不应被当成清理历史账号的工具；已有成员需要单独审查。SMTP 也要实际验证，否则注册确认、密码重置和告警邮件无法形成闭环。

备份至少覆盖应用数据、`gitlab.rb` 和 `gitlab-secrets.json`。应用备份命令是：

```bash
docker exec -t gitlab gitlab-backup create
```

这条命令不等于完整灾备：配置与加密文件需要单独加密保管，外部对象存储和镜像仓库按其存储方式另做备份。备份应离开原数据盘，并演练恢复到匹配的 GitLab 版本与版本类型。容器重建前后可核对用户、项目、SSH 公钥数量以及仓库可读写性，不应把“容器启动了”当作数据完整的证明。

## 第二步：安装 Runner，先跑一个无部署权限的作业

### 先分清三种镜像

Runner 管理镜像负责接收任务和管理 Pod；Helper 镜像负责克隆代码、缓存和制品传输；作业镜像才运行 `npm`、Go、BuildKit、AWS CLI 或 `kubectl`。

因此，把 Node 或 Go 装进 Runner manager 镜像，并不会让业务作业自动获得这些工具。公共工具可以做成固定版本的作业镜像，但业务编译工具链仍应跟随项目需要选择。管理镜像、Helper 与运行节点架构也需要匹配。

### 使用认证令牌创建 Runner

在 GitLab 的项目或群组 **Settings → CI/CD → Runners** 中创建 Runner。普通验证 Runner 使用标签 `k8s-verify`，关闭接收无标签作业；发布 Runner 后续单独创建并设为 Protected。采用以 `glrt-` 为前缀的 Runner authentication token 工作流，不沿用旧的 registration token 教程。

如果在主机直接执行 `gitlab-runner register` 却提示 `command not found`，说明该主机没有安装 Runner 程序。GitLab 服务镜像不会自动在宿主机安装 Runner。这里选择 Helm 安装，因此无需再在同一位置执行主机版注册命令；采用 Docker executor 的独立构建机才需要另行安装对应 Runner 软件并注册。

对于 Kubernetes，先由管理员创建 `ci-verify` namespace 和无业务权限的 `ci-job` ServiceAccount。Runner manager 的 Role/RoleBinding 由固定版本的 Helm Chart 创建。安装前用 `kubectl auth can-i` 检查权限；收到 `Forbidden` 表示当前身份无权观察或操作，不能推断 namespace 不存在。

```bash
# 在管理员已确认的目标集群上下文中执行；已存在的资源无需重复创建
kubectl create namespace ci-verify
kubectl -n ci-verify create serviceaccount ci-job
kubectl auth can-i create deployments -n ci-verify
kubectl auth can-i create roles -n ci-verify
```

将认证令牌保存到本地受限文件，通过 Secret 注入，避免把值写进命令历史或 Git：

```bash
# 本地文件只包含认证令牌，不带末尾换行；文件权限应为 600
kubectl -n ci-verify create secret generic runner-auth \
  --from-file=runner-token=/secure/runner-token \
  --from-literal=runner-registration-token=''
```

`values-verify.yaml` 的起步配置：

```yaml
gitlabUrl: https://git.example.com
concurrent: 2
rbac:
  create: true
runners:
  secret: runner-auth
  config: |
    [[runners]]
      executor = "kubernetes"
      [runners.kubernetes]
        namespace = "ci-verify"
        image = "alpine:3.22"
        service_account = "ci-job"
        automount_service_account_token = false
        service_account_overwrite_allowed = ""
        privileged = false
        cpu_request = "500m"
        cpu_limit = "2"
        memory_request = "512Mi"
        memory_limit = "2Gi"
        helper_cpu_request = "100m"
        helper_memory_request = "128Mi"
        helper_memory_limit = "512Mi"
        ephemeral_storage_request = "1Gi"
        ephemeral_storage_limit = "4Gi"
        [runners.kubernetes.node_selector]
          "kubernetes.io/arch" = "arm64"
```

这里选择 `arm64` 是示例，不代表集群一定是 ARM。先核对节点标签，再选择架构；`tags` 决定哪个 Runner 接任务，`node_selector` 决定作业 Pod 到哪类节点，二者不能相互替代。

```bash
helm repo add gitlab https://charts.gitlab.io
helm repo update
helm search repo gitlab/gitlab-runner --versions
# CHART_VERSION 填写已选定的 Chart 版本；Chart 版本不等于 Runner 版本
helm upgrade --install ci-verify gitlab/gitlab-runner \
  --namespace ci-verify --version "$CHART_VERSION" \
  --values values-verify.yaml
kubectl -n ci-verify get pods
```

认证令牌模式下，标签、Protected、是否接收无标签任务等属性应在创建 Runner 时或 GitLab 管理界面设置，不能假定旧注册参数仍会覆盖这些属性。Runner 主动连接 GitLab 请求任务，通常无需为 Runner 新开公网入站端口。

### 第一条流水线只验证执行链路

在示例仓库根目录提交 `.gitlab-ci.yml`：

```yaml
stages: [verify]

runner-smoke:
  stage: verify
  tags: [k8s-verify]
  image: alpine:3.22
  script:
    - uname -m
    - test -d .git
    - printf '%s\n' "$CI_COMMIT_SHA" > build-info.txt
  artifacts:
    paths: [build-info.txt]
    expire_in: 1 day
```

确认作业从 pending 进入 running，能克隆仓库、运行脚本、上传并下载制品，结束后临时 Pod 被清理。此时才证明 Runner 执行链路已经打通；还没有业务构建、云权限或部署能力。

## 第三步：把人员、构建和发布权限拆开

希望“维护者合并后自动发布”，不需要共享一个管理员账号。人员用自己的 GitLab 身份做审查，流水线使用专用机器身份。`test` 和 `main` 都设为受保护分支，禁止直接 push，只允许约定的维护者合并；CI 配置和部署脚本也在审核范围内。

| 身份 | 所需权限 | 不应默认拥有 |
| --- | --- | --- |
| 安装与维护人员 | 安装 Runner、配置 IAM 和 namespace RBAC | 不把个人登录会话作为流水线运行前提 |
| Runner manager | 在指定 CI namespace 创建、观察、清理作业 Pod 等资源 | 业务 namespace 的发布权限 |
| 验证作业 | 拉代码、下载依赖、测试和上传制品 | 云发布身份、生产变量 |
| 镜像发布作业 | 登录并推送指定镜像仓库 | 修改 IAM、删除镜像仓库 |
| 测试／生产部署作业 | 各自环境指定资源的更新与验收 | 跨环境发布、任意 ServiceAccount 切换 |

至少把普通验证、测试发布、生产发布拆开。不同信任级别宜使用不同 Runner 和 CI namespace；普通分支不能通过 `KUBERNETES_SERVICE_ACCOUNT_OVERWRITE` 选到高权限账号。Runner 标签只是调度条件，真正的权限边界来自 Protected Runner、项目范围、分支保护、变量规则和运行身份。

在 AWS EKS 中，可以使用 IRSA 或 Pod Identity，让长期存在的 IAM Role 每次签发短期凭证。若用 GitLab ID token 直接联合 AWS，则需要独立配置 OIDC provider，并约束 issuer、audience、项目和受保护分支；它与 EKS ServiceAccount 的 OIDC 信任不是同一套配置。

采用 IRSA 时，管理员先关联集群 OIDC provider，创建限定到指定 namespace 和 ServiceAccount 的角色信任，再给 ServiceAccount 添加角色注解。只添加注解不会自动创建 IAM Role 或授权。部署作业内部用以下命令核对实际身份，输出不得包含令牌：

```bash
aws sts get-caller-identity
kubectl auth can-i patch deployment/order-api -n app-test
kubectl auth can-i list deployments -n app-test
kubectl auth can-i watch deployments -n app-test
```

云权限与 Kubernetes RBAC 要分别验收。能向 ECR 推送镜像，不代表能更新 Deployment；`eks:DescribeCluster` 只允许获取集群信息，也不代表已经获得 Kubernetes 对象权限。同集群发布可以使用 Pod 的 ServiceAccount；跨集群发布还要建立目标集群的身份映射或访问条目与 RBAC，不能照搬源集群令牌。

对一个已有的 `order-api` Deployment，最小更新示例是由管理员在目标 namespace 创建：

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: order-api-publisher
  namespace: app-test
rules:
  - apiGroups: [apps]
    resources: [deployments]
    resourceNames: [order-api]
    verbs: [get, patch]
  - apiGroups: [apps]
    resources: [deployments]
    verbs: [list, watch]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: order-api-publisher
  namespace: app-test
subjects:
  - kind: ServiceAccount
    name: order-publisher
    namespace: ci-release-test
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: order-api-publisher
```

这允许读取该 namespace 的 Deployment 列表和变化，但只允许修改指定 Deployment。若进一步限制 `list/watch` 的 `resourceNames`，客户端必须携带匹配的名称字段选择器，需要针对所用客户端验证。只给 `get/patch` 时，更新可能成功，而 `kubectl rollout status` 的监听持续报 Forbidden。

`patch` 不是字段级授权：它不仅能改镜像，也能改 Pod 模板、ServiceAccount 或挂载配置，具体后果取决于准入策略及运行身份。这个 Role 只适用于已审查的受信发布代码；还应限制可用 ServiceAccount、镜像来源和挂载，隔离该 namespace 的高权限身份。`resourceNames` 限制资源名称，不能替代这些约束。

这个 Role **不能**完成首次创建应用、读取 Secret、创建迁移 Job，也不覆盖 Argo Rollouts。首次基础设施初始化由管理员或独立基础设施流程完成；实际需要哪些附加动作，再按资源种类和 namespace 授权。使用 Rollout CRD 的服务要配置 `rollouts.argoproj.io` 权限及对应验收工具。

ECR 权限同样拆分：`ecr:GetAuthorizationToken` 的资源范围必须为 `*`，镜像层上传、`PutImage`、镜像读取等动作则限制到明确的 repository ARN。运行节点或运行 Pod 的镜像拉取身份还需要单独配置，CI 能推送不代表业务节点能拉取。

## 第四步：定义仓库怎样构建，而不是套一个万能 Dockerfile

接入前先列清楚“仓库 → 制品 → 运行对象”的映射。一个仓库中有多个目录、多个二进制程序，甚至多个 Deployment，都不能直接推断为多个镜像。

| 仓库类型 | 构建产物 | 发布目标 | 回滚记录 |
| --- | --- | --- | --- |
| 静态管理前端 | `dist/` 等静态文件 | 对象存储和 CDN | 发布前静态版本或快照 |
| 单镜像 API | 一个镜像 digest | 一个或多个明确工作负载 | 各目标原镜像 digest |
| 单镜像加前端 | 一个后端镜像和一份静态制品 | Kubernetes 加对象存储 | 后端与前端版本组合 |
| 多镜像仓库 | API、Worker 等各自的镜像 | 各自声明的工作负载 | 所有组件的发布清单 |
| 仅构建项目 | SDK、压缩包或基础镜像 | 制品库 | 不提供虚假的业务回滚入口 |

订单项目可以采用以下目录，公共模板不负责决定业务如何编译：

```text
order-api/
├── Dockerfile
├── .gitlab-ci.yml
├── web/
└── ci/
    ├── verify.sh
    ├── build.sh
    ├── deploy.sh
    ├── rollback.sh
    └── notify.py
```

### 镜像架构按目标工作负载确定

先看目标工作负载的节点约束、实际运行节点和依赖库，再决定 `linux/arm64` 或 `linux/amd64`。工具镜像提供两种架构，不意味着每次业务发布也要构建两种架构。镜像标签里出现 `amd64` 更不是架构证明：

```bash
kubectl get nodes -L kubernetes.io/arch
kubectl -n app-test get deployment order-api -o yaml
docker buildx imagetools inspect "$IMAGE_REF"
```

纯 Go 且不依赖 CGO 时可以交叉编译；涉及 C/C++、CGO 或厂商 SDK 时，应优先使用目标架构节点。QEMU 模拟需要提前配置，性能和兼容性也必须验证。典型错配表现是 `exec format error` 或 Pod 无法就绪，不能靠重试流水线修复。

构建工具链应固定版本。Dockerfile 保留业务依赖和构建逻辑，作业镜像提供 CI 所需的工具；两层文件系统彼此独立，作业镜像预装了依赖，不代表 Dockerfile 内的安装步骤就能命中缓存。

### 构建一次，保存不可变产物

用提交 SHA 加流水线编号标记镜像，并在部署前解析为 digest。不要只部署 `latest`，也不要在 deploy 作业中重新编译一次。下面是已配置 Buildx、构建引擎、镜像认证和目标仓库后的命令片段：

```bash
set -euo pipefail
IMAGE_TAG="${IMAGE_REPOSITORY}:ci-${CI_COMMIT_SHA}-${CI_PIPELINE_ID}"
docker buildx build \
  --platform "linux/${TARGET_ARCH}" \
  --file Dockerfile \
  --tag "$IMAGE_TAG" \
  --metadata-file build-metadata.json \
  --push .
DIGEST=$(jq -er '."containerimage.digest"' build-metadata.json)
printf 'IMAGE_REF=%s@%s\n' "$IMAGE_REPOSITORY" "$DIGEST" > image.env
```

这不是仅安装 Docker CLI 就能运行的命令：Buildx 还需要可访问的 BuildKit 后端。镜像构建可采用独立的 rootless BuildKit；其 user namespace、seccomp 和 AppArmor 需求要在所用节点上验证。特权 Docker-in-Docker 和挂载宿主 Docker socket 都会扩大权限边界，不能为了跑通构建而给普通验证 Runner 全局启用。

`image.env` 可以作为 `artifacts:reports:dotenv` 传给部署作业；完整镜像 digest、提交、构建参数和流水线编号应写入发布记录。私钥、访问令牌、运行环境 Secret 不进入镜像层、构建参数、缓存或制品。

## 第五步：把触发规则、构建和发布连接起来

MR 流水线负责验证，合并后 `test` 的 push 流水线负责部署。不能把“源分支提交”“MR 更新”“合并后目标分支更新”视为同一种事件。

下面是**容器仓库的接入骨架**，展示作业之间的契约；`ci/*.sh`、`ci/notify.py` 和 `$CI_TOOLS_IMAGE` 需要先实现或由固定版本的公共工具包提供。它不是一个复制到任意仓库即可发布的完整产品模板。

```yaml
workflow:
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_PIPELINE_SOURCE == "push" && $CI_COMMIT_BRANCH == "test" && $CI_COMMIT_REF_PROTECTED == "true"'
    - when: never

stages: [verify, build, deploy, notify, operations]

verify:
  stage: verify
  tags: [k8s-verify]
  image: $CI_TOOLS_IMAGE
  script: ["bash ci/verify.sh"]

.test-release:
  tags: [k8s-release-test]
  image: $CI_TOOLS_IMAGE
  rules:
    - if: '$CI_PIPELINE_SOURCE == "push" && $CI_COMMIT_BRANCH == "test" && $CI_COMMIT_REF_PROTECTED == "true"'

build:
  extends: .test-release
  stage: build
  script: ["bash ci/build.sh"]
  artifacts:
    paths: [build-metadata.json]
    reports:
      dotenv: image.env
    expire_in: 30 days

deploy-test:
  extends: .test-release
  stage: deploy
  environment:
    name: test
  resource_group: order-api-test
  needs:
    - job: build
      artifacts: true
  script: ["bash ci/deploy.sh"]
  artifacts:
    when: always
    paths: [release-status.json]
    expire_in: 30 days

notify-success:
  extends: .test-release
  stage: notify
  tags: [k8s-notify]
  dependencies: []
  when: on_success
  allow_failure: true
  script: ["python3 ci/notify.py success"]

notify-failure:
  extends: .test-release
  stage: notify
  tags: [k8s-notify]
  dependencies: []
  when: on_failure
  allow_failure: true
  script: ["python3 ci/notify.py failed"]

rollback-test:
  extends: .test-release
  stage: operations
  environment:
    name: test
  resource_group: order-api-test
  dependencies: []
  when: manual
  allow_failure: true
  script: ["bash ci/rollback.sh"]

redeploy-test:
  extends: .test-release
  stage: operations
  environment:
    name: test
  resource_group: order-api-test
  dependencies: []
  when: manual
  allow_failure: true
  script: ["bash ci/deploy.sh --reuse-release"]
```

`CI_TOOLS_IMAGE` 是非敏感的固定镜像引用，需要对 MR 验证作业可见，不能与发布凭据一起限制成仅受保护分支可读；若镜像为私有镜像，验证 Runner 还要具备只读拉取能力。部署凭据和通知 Webhook 则只提供给对应的受保护作业，并按实际 GitLab 支持设置 Masked、Hidden 等属性。

这里用 `dependencies: []` 让通知与手动作业不被自动下载上游制品阻塞；通知脚本从 GitLab API 和持久发布记录获取结果，回滚脚本按当前流水线编号读取原始发布记录。没有给通知加 `needs: []`，因为那会让通知脱离前序阶段、过早开始。也没有让失败通知强依赖 `deploy-test`，因此验证或构建失败时仍有通知路径。

`k8s-notify` 需要实际创建对应的受保护 Runner，只持有通知和必要只读查询权限，不持有部署权限。通知作业也可以与受信任的执行池共享容量，但要通过身份和 namespace 控制权限，并避免构建排队耗尽通知容量。

`allow_failure: true` 使可选的手动入口不阻塞主流水线，但也意味着其失败不会把整条流水线判红。因此回滚和再次发布必须记录独立的操作结果并通知，不能只看原流水线状态。若组织要求这些操作严格计入独立流水线状态，应使用单独的操作流水线。

### 部署脚本要有可验收的契约

`ci/deploy.sh` 至少完成以下步骤，且所有环境修改都放在同一个 `resource_group` 锁内：

1. 确认目标环境、工作负载、容器名称和待发布 digest；拒绝不完整参数。
2. 读取当前版本，持久保存“本次发布前版本”和“本次待发布版本”。
3. 更新指定容器镜像，等待滚动更新完成。
4. 验证服务内接口，再验证网关或外部域名的业务路径。
5. 更新发布记录；失败时保留失败阶段、已修改对象与诊断结果。

已有 Deployment 的更新命令可以很短：

```bash
kubectl -n "$APP_NAMESPACE" set image \
  "deployment/$WORKLOAD" "$CONTAINER=$IMAGE_REF"
kubectl -n "$APP_NAMESPACE" rollout status \
  "deployment/$WORKLOAD" --timeout=180s
curl --fail --silent --show-error \
  --retry 3 --retry-delay 3 --max-time 15 \
  "$SMOKE_URL"
```

但 `SMOKE_URL` 不能只是一个始终返回 200 的首页。订单服务可以使用测试租户查询一笔已知订单，校验状态码、响应字段和依赖可用性；验证账户使用最小权限，响应也不输出客户数据。测试必须有超时和退出条件，不能无限重试掩盖业务失败。

若验收由 Kubernetes Job 执行，不能只等 `Complete=True`。轮询时同时判断 `Failed=True`，并检查 `backoffLimit`、`activeDeadlineSeconds`，失败后立即采集 Job 状态和脱敏日志。否则一个已经返回 404 的测试会被拖到几分钟后，最终错误却显示成“等待超时”。

`rollout status` 成功只证明工作负载满足滚动更新条件。网关仍可能返回 404、504，依赖也可能异常。流水线后半段失败不会自动撤销已经更新的镜像，因此必须明确自动回滚还是保留现场、由维护者执行回滚。

## 静态前端如何接入同一条发布流程

静态前端不必先构造成 Docker 镜像。构建作业执行锁文件对应的依赖安装和构建，将 `dist/` 作为 artifact 交给发布作业。VitePress 常见输出是 `.vitepress/dist/`，应按项目实际构建目录配置，不能统一猜成 `dist/`。

例如普通 Vite 项目的构建作业：

```yaml
build-web:
  stage: build
  tags: [k8s-verify]
  image: node:22-bookworm-slim
  script:
    - npm ci --cache .npm --prefer-offline
    - npm run build
  cache:
    key:
      files: [package-lock.json]
      prefix: node22
    paths: [.npm/]
  artifacts:
    paths: [dist/]
    expire_in: 30 days
```

发布前先保存当前完整静态版本或建立可恢复的版本清单。上传采用“哈希资源先上传、入口文件最后切换”的顺序，以下只是发布脚本的上传部分：

这里要求 `dist/assets/` 中每个文件的 URL 都随内容变化而变化，且旧 URL 永不覆盖成其他内容，才可整目录设置 `immutable`。如果包含固定名称的图片、配置或手工复制资源，应拆出该目录并使用短缓存或重新验证策略，不能仅凭目录名判断缓存安全。

```bash
set -euo pipefail
: "${WEB_BUCKET:?}" "${WEB_PREFIX:?}" "${CF_DISTRIBUTION_ID:?}"
destination="s3://${WEB_BUCKET}/${WEB_PREFIX%/}"
aws s3 sync dist/assets/ "${destination}/assets/" \
  --cache-control 'public,max-age=31536000,immutable'
aws s3 sync dist/ "${destination}/" \
  --exclude 'assets/*' --exclude 'index.html' \
  --cache-control 'public,max-age=300'
aws s3 cp dist/index.html "${destination}/index.html" \
  --content-type text/html \
  --cache-control 'no-cache,max-age=0,must-revalidate'
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id "$CF_DISTRIBUTION_ID" \
  --paths '/*' --query 'Invalidation.Id' --output text)
aws cloudfront wait invalidation-completed \
  --distribution-id "$CF_DISTRIBUTION_ID" --id "$INVALIDATION_ID"
```

这里假设 `WEB_PREFIX` 是无前导斜杠的非空目录，例如 `apps/admin/test`。若对象存储目录是这个前缀、网站却从域名根路径访问，CDN Origin Path 应与此前缀匹配；若网站通过 `/admin/` 访问，还需校对构建工具的 base 和 CDN 路由。缓存刷新路径是浏览器访问路径，不是 S3 内部对象前缀。

这个顺序降低新 HTML 引用不存在资源的概率，但多个非哈希页面的覆盖不是原子操作。多页站点或强一致发布可以使用版本目录加入口切换；CDN 刷新后仍要检查页面及其关键资源。不要在上传新版本时立刻删除旧哈希文件，仍持有旧 HTML 的浏览器需要它们。垃圾清理按保留期独立执行，并考虑最长页面缓存时间。

如果发布包含一个后端镜像和一份静态前端，发布记录要保存这两个版本及其兼容关系。前端目录多不等于镜像多，当前只运行一个工作负载也不代表仓库永远只有一个运行单元。

## 通知、回滚和再次发布应作为基础能力

### 通知要覆盖失败，并保留准确的业务结果

只在部署脚本最后发送成功通知，会漏掉测试失败、构建失败和部署中途退出。用独立成功／失败通知作业承接结果，通知失败不改变业务发布的事实；再用平台级 Pipeline Webhook 或外部监控兜住 YAML 无效、Runner 全部离线、流水线取消等无法保证执行通知作业的情况。

通知保留一份清楚的结构即可：

```text
发布失败
服务：订单 API
环境：测试
合并：feature/order-timeout → test
合并人：实际 MR 合并人
版本：提交 SHA／镜像 digest
失败位置：deploy-test
链接：流水线、失败作业、MR
```

合并后的分支流水线通常没有完整的 MR 变量。可用项目 ID 和提交 SHA 查询关联 MR，再筛选已合并、目标分支匹配且与该提交对应的记录。合并人取 MR 的实际字段；`GITLAB_USER_NAME` 是流水线触发者，不能无条件当作合并人。没有可靠匹配时明确显示“直接提交或未识别 MR”，不从提交标题猜测。

通知里的镜像完整引用用于定位仓库，digest 用独立代码块展示以便复制。负责人可以从服务目录或外部表格查询，失败时显示“未配置”，不阻塞发布，也不默认冒用某个人。Webhook 和查询凭据放受保护变量或 Secret；截图、错误日志和导出的静态页面也不应包含它们。

### 回滚恢复本次发布前的版本

![发布、回滚与再次发布的状态关系](/git/gitlab-cicd-release-lifecycle.svg)

“回滚上一个提交”“重跑上一条流水线”和“恢复这次发布前的版本”并不等价。一次流水线可能只部署了一半，也可能在后面已有另一次成功发布。

发布记录需要持久保存以下信息，且只能包含非敏感元数据：

```json
{
  "service": "order-api",
  "environment": "test",
  "pipeline_id": "示例流水线编号",
  "commit": "完整提交 SHA",
  "before": { "backend": "发布前镜像 digest", "web": "发布前静态版本" },
  "after": { "backend": "本次镜像 digest", "web": "本次静态版本" },
  "phase": "accepted"
}
```

第一次修改环境前就写入 `before`，不要在失败后才尝试补记；重试同一流水线也不能覆盖原始 `before`。记录可以存放在启用版本和访问控制的对象存储中，GitLab artifact 作为便于排查的副本。只有短期 artifact 时，过期后回滚按钮即使还在，也无法恢复现场。

回滚读取 `before`，再次发布读取 `after`，两者都复用已经构建的不可变产物，不重新构建。两种操作和正常部署使用相同的环境锁，并分别完成验收和通知。

执行前还应比较线上当前版本与记录里的预期状态。假设发布 A 后又发布了 B，再点击 A 的回滚，不能直接把 B 覆盖掉；应拒绝过期操作，或经过明确的版本选择流程。`resource_group` 能解决同一项目内的并发互斥，不能独自解决跨项目写同一环境、旧流水线晚于新流水线部署的问题，还需要统一发布入口或外部锁，以及版本新旧检查。

数据库迁移不随镜像自动回退。涉及删字段、改数据格式等不可逆操作时，要使用向前兼容迁移、分阶段切换和独立恢复方案；“镜像已回滚”不能被记录为“整个系统已恢复”。

## 缓存与并发：先定位时间花在哪里

临时 Pod 每次重建，不意味着每次都要重新下载和编译。缓存、制品和运行环境承担不同职责：缓存丢失只应变慢；制品缺失则应停止部署；运行环境必须从声明的配置重建。

| 手段 | 适合保存的内容 | 常见边界 |
| --- | --- | --- |
| 固定版本工具镜像 | Node、Go、编译器、AWS CLI 等工具 | 不包含凭据；升级需要重新验收 |
| GitLab cache | npm 下载缓存、Go module／编译缓存 | key 包含项目、工具链、架构和锁文件；隔离不同信任级别 |
| BuildKit cache | Dockerfile 构建层 | 单独配置远程缓存；不等同于 GitLab cache |
| artifacts | 本条流水线构建出的静态文件、测试报告、元数据 | 明确保留期和下游下载关系 |
| 镜像仓库／版本化对象存储 | 可发布和可回滚的制品 | 保留窗口覆盖回滚需求，避免被清理策略误删 |

常驻一个构建 Pod 可以复用本地目录，但随之增加环境漂移、并发冲突、跨仓库污染和持久卷维护。对起步阶段，固定工具镜像、临时作业 Pod 和远程缓存通常更容易维护。是否引入常驻 BuildKit 或持久卷，应基于构建频率、缓存传输量和测量结果决定。

记录排队、拉镜像、安装依赖、编译、镜像推送、滚动更新和验收分别用了多久。先避免无必要的双架构构建，再调整 Dockerfile 层顺序和缓存；验收耗时不能通过删除验收步骤来“优化”。

作业一直 pending 时，先检查 Runner 标签、Protected、项目授权和在线状态。只有作业 Pod 已创建但无法调度时，才转向 CPU、内存、临时存储、节点架构、taint 和配额。扩大 Runner 并发不能修复权限或标签不匹配。

每个 manager 的全局 `concurrent`、单 Runner 的 `limit`、manager 副本数和节点可调度资源都会影响容量；`request_concurrency` 控制向 GitLab 请求任务的并发，不等于可同时运行的作业数。扩容时同时限制作业资源，避免 CI 抢占业务节点。单独的 namespace 不会隔离底层 CPU 和磁盘竞争，必要时使用专用节点池。

## 从一个仓库推广到多个仓库

先在一个服务完成真实的发布、失败通知、回滚和再次发布，再抽取共享模板。模板统一的是门禁、变量约定、缓存策略、发布记录、通知和操作入口；Dockerfile、依赖版本、构建上下文、迁移逻辑和业务验收留在业务仓库。

```yaml
include:
  - project: platform/ci-templates
    ref: v1.0.0
    file: /templates/container-test.yml

variables:
  SERVICE_NAME: order-api
  TARGET_ARCH: arm64
  DOCKERFILE: Dockerfile
  BUILD_CONTEXT: .
  APP_NAMESPACE: app-test
  WORKLOAD: order-api
  CONTAINER: api
```

这里的项目、标签和模板文件需要先发布到自己的 GitLab。`v1.0.0` 是示例接口版本，不是 GitLab 自带模板。模板只能提供已实现的能力；没有完整部署契约的项目先接成“仅构建”，不要展示虚假的发布成功和回滚入口。

共享模板发布顺序应是：合并并验证模板 → 创建不可变标签或引用固定 commit → 验证使用方身份能读取 → 再合并业务仓库引用。仅在作者工作区里有文件，或标签还未创建，都会导致业务流水线在执行任何作业前就配置失败。

私有 `include:project` 的解析要求触发流水线的用户具有相应项目访问权限；给项目加 CI Job Token allowlist 并不能自动解决这个权限。作业运行期间再通过 `CI_JOB_TOKEN` 下载模板脚本，是另一阶段的认证，应另外校对 allowlist、用户权限和接口支持。应使用普通维护者身份验收，不能只验证管理员账号。

还要注意：YAML 的 `include` 不会把模板仓库的脚本复制到业务仓库。公共脚本应打包进固定版本工具镜像，或者由作业从同一固定 ref 下载并校验，避免 YAML 固定版本而脚本却追随 `main`。

新增服务只需先交付五项信息：仓库和审核人、制品类型及构建入口、目标架构、部署对象和环境、验收与回滚规则。平台据此配置 Runner 范围、云权限、RBAC 和变量，再提交接入 MR。真正的多镜像项目可以用矩阵或子流水线，但每个镜像都要声明自己的 Dockerfile、上下文和部署映射。

### 生产接入要单独验收

测试发布成功后，再给生产分支和 Runner 配置独立权限、变量、资源锁和发布策略。是否合并 `main` 后自动部署，还是保留手动门禁，由团队发布制度决定；Protected Environment 等细粒度能力还要核对所用 GitLab 版本与许可，不能假定所有实例都有相同功能。

优先晋级已经验收的制品 digest，而不是合并后随意重建。若前端将环境参数编译进产物，测试产物不能直接当作生产产物使用，需要固定源码和构建输入重新构建并验收，或改为运行时配置。跨区域仓库复制后也应核对 digest、架构和依赖可达性。

首次接入历史服务时，先确认线上镜像对应的源码提交能够找回。线上正常运行、仓库 `test` 可以构建，并不证明两者是同一版本；无法定位源码基线时直接启用自动部署，可能把现场业务回退到旧实现。

## 排错顺序和完成标准

| 现象 | 先看哪一层 | 闭环方式 |
| --- | --- | --- |
| 域名无法访问，但主机 SSH 正常 | DNS、TLS、反代与公网入口 | 从 Runner 网络验证 HTTPS 和克隆，不关闭证书校验绕过 |
| 合并后没有流水线 | 配置解析、`workflow:rules`、受保护分支状态、跳过 CI 标记 | 用 CI Lint 检查合并配置，再验证目标分支 push 事件 |
| 模板 project/ref 不存在 | 模板是否已发布、用户访问权限 | 核对标签与文件，再用实际合并人的权限检查 |
| 作业 pending，没有 Pod | Runner 匹配、Protected、项目范围、并发 | 修正匹配或容量，避免让 MR 去等待只能执行发布的 Runner |
| Pod Pending | 节点资源、架构、污点、存储和拉取镜像 | 看调度事件，不盲目增加 manager 副本 |
| ECR/S3 AccessDenied | 作业实际 AWS 身份与资源范围 | 在作业内查身份，按被拒动作补精确权限 |
| 更新成功，rollout 持续 Forbidden | Kubernetes RBAC 的 `list/watch` | 分开验证修改权限和观察权限 |
| 镜像推送成功，应用不能启动 | 架构、入口命令、运行配置、拉取身份 | 核对 manifest、节点和容器事件 |
| 冒烟只显示超时 | Job 是否已失败、接口是否返回 4xx/5xx | 同时观察 Complete/Failed，保留实际失败响应与日志 |
| MR 合并接口返回 405 | MR 的 `detailed_merge_status`、冲突、分支是否落后 | 解决具体合并条件，不把所有 405 都归因于权限 |
| 流水线绿了但环境不是预期版本 | 运行版本、发布记录、并发顺序 | 对比 digest 与业务验收结果，检查是否有其他发布通道覆盖 |

仓库从其他托管平台迁入时，还要处理 LFS、子模块和同步方向。镜像迁移可先传 LFS 对象，再推分支、标签等业务 refs；不要把平台内部 refs 当作普通分支推送。切换主仓库后停止旧平台向新主分支写入，避免同步覆盖新提交或触发重复发布。Git 镜像也不会自动迁移 Issue、MR、权限和 CI 变量。

一项能力应区分“方案已设计、配置已提交、流水线已通过、真实环境已验收”。每个服务、每个环境分别记录以下达成标志：

- 普通成员能够提交 MR，维护者合并后触发正确环境，普通分支拿不到发布身份。
- 测试通过才构建，构建失败不部署；运行版本能追溯到提交、流水线和不可变产物。
- 验收能发现接口和依赖异常，而不只检查 Pod 或首页。
- 测试、构建和部署失败都有结果通知，通知系统故障不篡改业务结果。
- 回滚实际恢复发布前版本，再次发布实际复用本次产物；过期操作被拒绝。
- 换一个具有正常权限的维护者仍能完成流程，流水线不依赖某个人本地登录。
- 备份恢复、制品保留、缓存清理与资源容量有明确维护方式。

GitLab CI/CD 的完成点不是 YAML 能解析，也不是出现一个绿色作业，而是代码、制品、运行状态和发布记录能够相互核对。更多 Git 协作背景见 [协作流程](./workflow.md)，静态站点的路径、缓存和路由问题见 [前端部署](/docs/devlanguage/front/deployment/)。
