# 前端部署指南

## 部署方式概览

前端应用有多种部署方式，从简单的静态托管到复杂的容器化部署，选择合适的部署策略对于应用的性能、可靠性和成本都有重要影响。

## 静态托管服务

### GitHub Pages
适合开源项目和个人项目，免费且易于设置。

#### 配置步骤
1. **仓库设置**
   - 创建名为 `username.github.io` 的仓库用于用户页面
   - 或创建普通仓库用于项目页面

2. **构建配置**
```json
// package.json
{
  "homepage": "https://username.github.io/repository-name",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build"
  }
}
```

3. **部署脚本**
```bash
npm install --save-dev gh-pages
npm run deploy
```

### Netlify
功能丰富的静态托管平台，支持持续部署和边缘函数。

#### 部署方式
1. **Git集成部署**
   - 连接GitHub/GitLab/Bitbucket仓库
   - 自动构建和部署

2. **配置文件**
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

3. **环境变量**
```bash
# 在Netlify控制台设置
VITE_API_URL=https://api.example.com
VITE_ENV=production
```

### Vercel
专为前端优化的部署平台，支持零配置部署。

#### 部署配置
1. **vercel.json**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install"
}
```

2. **环境变量**
```bash
vercel env add API_URL
vercel env add DATABASE_URL
```

## 云服务部署

### AWS S3 + CloudFront
企业级静态网站托管解决方案。

#### S3配置
```bash
# 创建S3存储桶
aws s3 mb s3://my-app-bucket

# 设置存储桶策略
aws s3api put-bucket-policy --bucket my-app-bucket --policy file://policy.json

# 上传文件
aws s3 sync build/ s3://my-app-bucket --delete
```

#### CloudFront配置
```json
{
  "DistributionConfig": {
    "Origins": [{
      "DomainName": "my-app-bucket.s3.amazonaws.com",
      "Id": "S3-my-app-bucket",
      "S3OriginConfig": {
        "OriginAccessIdentity": ""
      }
    }],
    "DefaultCacheBehavior": {
      "TargetOriginId": "S3-my-app-bucket",
      "ViewerProtocolPolicy": "redirect-to-https"
    }
  }
}
```

### Google Cloud Storage + CDN
```bash
# 上传文件到GCS
gsutil rsync -r -d build/ gs://my-app-bucket/

# 设置公开访问
gsutil iam ch allUsers:objectViewer gs://my-app-bucket

# 配置CDN
gcloud compute backend-buckets create my-app-cdn --gcs-bucket-name=my-app-bucket
```

### Azure Static Web Apps
```yaml
# .github/workflows/azure-static-web-apps.yml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches: [ main ]
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  build_and_deploy_job:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          api_location: "api"
          output_location: "dist"
```

## 容器化部署

### Docker容器化

#### Dockerfile示例
```dockerfile
# 多阶段构建
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Nginx配置
```nginx
# nginx.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # 启用gzip压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 缓存静态资源
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA路由回退
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Kubernetes部署

#### 部署配置
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend-app
  template:
    metadata:
      labels:
        app: frontend-app
    spec:
      containers:
      - name: frontend-app
        image: my-registry/frontend-app:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "250m"
          limits:
            memory: "128Mi"
            cpu: "500m"

---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
spec:
  selector:
    app: frontend-app
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

#### Ingress配置
```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: frontend-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
```

## CI/CD集成

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          echo "Deploying to production..."
          # 添加具体的部署命令
```

### GitLab CI/CD
```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

test:
  stage: test
  script:
    - npm ci
    - npm run test

build:
  stage: build
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/

deploy:
  stage: deploy
  script:
    - echo "Deploying to production..."
  only:
    - main
```

## 环境管理

### 环境变量配置
```bash
# .env.production
VITE_API_URL=https://api.production.com
VITE_ENV=production
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx

# .env.staging
VITE_API_URL=https://api.staging.com
VITE_ENV=staging

# .env.development
VITE_API_URL=http://localhost:3000
VITE_ENV=development
```

### 多环境部署
```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development

  frontend-prod:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
```

## 监控和日志

### 应用性能监控
```javascript
// 集成Sentry
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});
```

### 用户行为监控
```javascript
// 集成Google Analytics
import ReactGA from 'react-ga4';

ReactGA.initialize(import.meta.env.VITE_GA_TRACKING_ID);
ReactGA.send('pageview');
```

## 部署最佳实践

### 性能优化
1. **启用压缩**: 使用gzip或brotli压缩静态资源
2. **设置缓存**: 合理配置缓存策略
3. **使用CDN**: 全球内容分发网络
4. **图片优化**: 使用现代图片格式和响应式图片

### 安全最佳实践
1. **HTTPS**: 强制使用HTTPS
2. **安全头部**: 配置CSP、HSTS等安全头部
3. **依赖更新**: 定期更新依赖包
4. **代码审计**: 使用安全扫描工具

### 可用性保障
1. **健康检查**: 配置应用健康检查
2. **自动扩展**: 根据负载自动扩展实例
3. **备份策略**: 定期备份重要数据
4. **灾难恢复**: 制定灾难恢复计划

## 部署检查清单

### 部署前
- [ ] 代码审查完成
- [ ] 测试全部通过
- [ ] 性能测试完成
- [ ] 安全检查通过

### 部署中
- [ ] 零停机部署
- [ ] 蓝绿部署或金丝雀发布
- [ ] 实时监控应用状态
- [ ] 回滚计划准备就绪

### 部署后
- [ ] 功能验证完成
- [ ] 性能监控正常
- [ ] 错误日志检查
- [ ] 用户反馈收集

## 总结

前端部署已经从简单的文件上传发展到复杂的云原生架构。选择合适的部署策略需要考虑：
- 项目规模和复杂度
- 预算和成本限制
- 团队技术栈和经验
- 可用性和性能要求
- 安全和合规需求

通过合理的部署策略和最佳实践，可以确保前端应用的稳定性、性能和安全性。