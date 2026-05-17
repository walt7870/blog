# 前端部署

前端部署的本质，是把构建后的静态资源稳定地交给浏览器访问。对于 Vite、Vue、React、Angular 这类单页应用，部署产物通常是 `dist/` 目录，里面包含 `index.html`、带 hash 的 JS/CSS 文件、图片字体等静态资源。

国内项目更常见的部署方式有三类：直接发布到 Linux 服务器并由 Nginx 提供访问；上传到对象存储并接入 CDN；打成 Nginx 容器镜像后交给 Docker 或 Kubernetes 运行。选哪一种，主要看团队是否已有服务器、是否需要 CDN 加速、是否已有容器平台，以及发布流程是否需要标准化。

## 构建产物

部署前先确认本地构建结果可用。以 Vite 项目为例：

```bash
npm ci
npm run build
```

构建完成后，检查 `dist/`：

```bash
ls -lah dist
```

如果项目部署在域名根路径，例如 `https://www.example.com/`，一般不需要额外配置 `base`。如果部署在子路径，例如 `https://www.example.com/admin/`，需要在构建工具中配置资源基础路径：

```ts
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/admin/',
})
```

子路径部署时，Nginx 的 `location` 也要和 `base` 保持一致，否则刷新页面或加载静态资源时容易出现 404。

## Nginx 服务器部署

中小型后台、企业官网、管理端系统经常直接发布到云服务器或内网服务器。流程是本地或 CI 构建 `dist/`，再同步到服务器目录，由 Nginx 提供静态访问和路由回退。

服务器目录可以按版本隔离，发布时切换软链接：

```bash
sudo mkdir -p /data/www/admin/releases
sudo mkdir -p /data/www/admin/shared
```

一次发布可以这样做：

```bash
VERSION=$(date +%Y%m%d%H%M%S)
ssh deploy@server "mkdir -p /data/www/admin/releases/$VERSION"
rsync -avz --delete dist/ deploy@server:/data/www/admin/releases/$VERSION/
ssh deploy@server "ln -sfn /data/www/admin/releases/$VERSION /data/www/admin/current && sudo nginx -t && sudo nginx -s reload"
```

Nginx 配置示例：

```nginx
server {
    listen 80;
    server_name admin.example.com;

    root /data/www/admin/current;
    index index.html;

    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript application/xml image/svg+xml;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
        try_files $uri =404;
    }

    location = /index.html {
        add_header Cache-Control "no-cache";
    }
}
```

`index.html` 不建议设置长缓存，因为它负责引用最新的 JS/CSS 文件。带 hash 的静态资源可以设置长缓存，发布新版本时文件名变化，浏览器会自动请求新资源。

如果前端需要转发接口到后端，可以在同一个 Nginx 中增加 `/api/` 代理：

```nginx
location /api/ {
    proxy_pass http://backend-service:8080/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

接口代理适合后台系统和内网应用。公网业务更常见的做法，是前端域名和 API 域名分开，通过网关或后端服务处理跨域、鉴权和限流。

## 对象存储与 CDN

营销页、官网、文档站、用户访问量较大的前端应用，通常适合使用对象存储加 CDN。国内常见组合是阿里云 OSS + CDN、腾讯云 COS + CDN、华为云 OBS + CDN、七牛云 Kodo + CDN 等。对象存储负责放文件，CDN 负责就近访问和缓存。

以通用流程看，发布分三步：构建 `dist/`，同步到对象存储，刷新 CDN 缓存。不同厂商命令不同，但目标一致。

```bash
npm ci
npm run build

# 示例：使用厂商 CLI 将 dist 同步到 bucket
cloud-cli sync dist/ oss://example-bucket/admin/ --delete

# 示例：刷新入口页和关键路径
cloud-cli cdn refresh https://static.example.com/admin/index.html
```

对象存储部署要特别注意缓存策略。`index.html` 应设置为不缓存或短缓存；带 hash 的静态资源可以长缓存。很多线上“发布后用户看到旧页面”的问题，根源都是入口页、CDN 缓存和浏览器缓存没有分层处理。

如果是单页应用，还需要配置历史路由回退。对象存储静态网站托管通常可以设置默认首页和错误页，把 404 回退到 `index.html`。如果前面还有 CDN，也要确认 CDN 对 404、目录访问和回源规则的处理方式。

公网域名接入 CDN 前，应提前确认域名解析、证书、备案和厂商接入要求。证书建议统一在网关、CDN 或负载均衡层维护，不要分散到多个临时入口。

## Docker 部署

如果团队已有容器平台，前端可以构建成一个 Nginx 镜像。镜像里只保留静态产物和 Nginx 配置，Node.js 只出现在构建阶段。

```dockerfile
FROM node:20-alpine AS build

WORKDIR /workspace
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

配套的 `nginx.conf`：

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
        try_files $uri =404;
    }

    location = /index.html {
        add_header Cache-Control "no-cache";
    }
}
```

构建和运行：

```bash
docker build -t registry.example.com/web/admin:1.0.0 .
docker run --rm -p 8080:80 registry.example.com/web/admin:1.0.0
```

镜像标签不要只使用 `latest`。更稳妥的方式是使用版本号、Git commit、构建号组合，例如 `admin:20260517-8f3a21c`，这样回滚时能准确找到上一版。

## GitLab CI 发布示例

国内团队常见的是自建 GitLab、内网制品库、私有镜像仓库和堡垒机发布。下面示例演示把 `dist/` 同步到 Nginx 服务器：

```yaml
stages:
  - build
  - deploy

build:
  stage: build
  image: node:20-alpine
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 day
  only:
    - main

deploy:
  stage: deploy
  image: alpine:3.20
  before_script:
    - apk add --no-cache openssh-client rsync
    - mkdir -p ~/.ssh
    - echo "$DEPLOY_PRIVATE_KEY" > ~/.ssh/id_rsa
    - chmod 600 ~/.ssh/id_rsa
    - ssh-keyscan "$DEPLOY_HOST" >> ~/.ssh/known_hosts
  script:
    - VERSION=$(date +%Y%m%d%H%M%S)
    - ssh "$DEPLOY_USER@$DEPLOY_HOST" "mkdir -p /data/www/admin/releases/$VERSION"
    - rsync -avz --delete dist/ "$DEPLOY_USER@$DEPLOY_HOST:/data/www/admin/releases/$VERSION/"
    - ssh "$DEPLOY_USER@$DEPLOY_HOST" "ln -sfn /data/www/admin/releases/$VERSION /data/www/admin/current && sudo nginx -t && sudo nginx -s reload"
  only:
    - main
```

如果发布到对象存储，把 `deploy` 阶段替换为厂商 CLI 的上传和 CDN 刷新命令即可。密钥不要写在仓库里，应放在 CI/CD 变量或密钥管理系统中。

## 环境配置

前端环境变量大多在构建阶段注入。以 Vite 为例，只有 `VITE_` 前缀变量会暴露给客户端代码：

```bash
# .env.production
VITE_API_BASE_URL=https://api.example.com
VITE_APP_ENV=production
```

代码中读取：

```ts
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
```

不要把服务端密钥、数据库密码、对象存储密钥放进前端环境变量。前端构建产物会被浏览器下载，里面的变量不是秘密。

如果同一份镜像需要部署到多个环境，可以在 Nginx 启动时生成一个运行时配置文件，例如 `/config.js`：

```js
window.__APP_CONFIG__ = {
  apiBaseUrl: 'https://api.example.com'
}
```

页面先加载 `/config.js`，应用再读取 `window.__APP_CONFIG__`。这种方式适合容器镜像跨环境复用，但要避免把敏感信息放进去。

## 发布与回滚

前端发布最容易忽略的是回滚。直接覆盖服务器目录虽然简单，但失败后很难恢复。更稳妥的发布方式是保留多个版本目录，当前版本通过软链接指向。

```bash
/data/www/admin/
├── current -> /data/www/admin/releases/20260517103000
└── releases/
    ├── 20260516180000
    └── 20260517103000
```

回滚时只需要切换软链接并重载 Nginx：

```bash
ln -sfn /data/www/admin/releases/20260516180000 /data/www/admin/current
sudo nginx -t
sudo nginx -s reload
```

对象存储和 CDN 场景也要保留历史版本。可以按版本目录上传，例如 `/admin/releases/<version>/`，入口文件再切换到对应版本；或者启用对象存储版本控制。不要只依赖“重新上传旧文件”，因为 CDN 和浏览器缓存可能让恢复过程变得不可控。

## 排查入口

| 现象 | 优先检查 |
| --- | --- |
| 刷新页面 404 | Nginx 或对象存储是否配置 SPA 回退到 `index.html` |
| 页面空白 | 静态资源路径是否受 `base` 影响，控制台是否有 JS 加载失败 |
| 发布后仍是旧页面 | `index.html`、CDN、浏览器缓存是否仍命中旧版本 |
| 接口跨域失败 | API 域名、CORS 响应头、Cookie `SameSite` 和 HTTPS 是否匹配 |
| 静态资源 403 | 对象存储权限、CDN 回源鉴权、防盗链配置 |
| Docker 容器正常但访问失败 | 端口映射、Nginx 配置路径、容器内文件是否复制成功 |
| 线上配置不生效 | 环境变量是在构建阶段还是运行阶段注入 |

## 检查清单

- 构建命令、Node.js 版本和包管理器锁文件在 CI 中固定。
- `index.html` 短缓存，带 hash 的静态资源长缓存。
- 单页应用配置了历史路由回退。
- API 地址、资源 `base`、CDN 路径和部署子目录一致。
- 发布目录保留历史版本，能在几分钟内回滚。
- 对象存储和 CDN 场景配置了 HTTPS、缓存刷新和权限策略。
- 密钥只放在 CI/CD 或后端服务中，不进入前端构建产物。
