# Ingress

## 概述

Ingress 是 Kubernetes 中用于管理集群外部访问集群内服务的 API 对象，通常用于 HTTP 和 HTTPS 路由。它提供了负载均衡、SSL 终止和基于名称的虚拟主机等功能。

| 关键点 | 内容 |
| ---- | ---- |
| 核心作用 | 管理外部到集群内服务的 HTTP/HTTPS 访问 |
| 路由规则 | 基于主机名和路径的路由 |
| 负载均衡 | 七层负载均衡和流量分发 |
| SSL/TLS | 支持 SSL 证书管理和 HTTPS 终止 |

## Ingress 的本质

### 设计理念

* **七层路由**：在应用层（HTTP/HTTPS）进行流量路由
* **统一入口**：为多个服务提供统一的外部访问入口
* **智能路由**：基于域名、路径、请求头等进行路由决策
* **SSL 终止**：在入口处处理 SSL/TLS 加密和解密

### 工作原理

```
外部请求 → Ingress Controller → Ingress 规则匹配 → 后端 Service → Pod
    ↓              ↓                    ↓
  域名/路径     负载均衡器配置        路由规则
```

### Ingress vs Service

| 特性 | Service | Ingress |
| ---- | ---- | ---- |
| 网络层级 | 四层（TCP/UDP） | 七层（HTTP/HTTPS） |
| 路由能力 | 端口路由 | 域名、路径路由 |
| SSL 支持 | 需要应用处理 | 原生支持 SSL 终止 |
| 负载均衡 | 简单轮询 | 高级负载均衡算法 |
| 成本 | 每个服务一个 LoadBalancer | 多个服务共享一个入口 |

## Ingress Controller

### 常见的 Ingress Controller

| Controller | 特点 | 适用场景 |
| ---- | ---- | ---- |
| **Nginx Ingress** | 功能丰富，社区活跃 | 通用场景，生产环境 |
| **Traefik** | 自动服务发现，配置简单 | 微服务架构，容器化环境 |
| **HAProxy Ingress** | 高性能，企业级功能 | 高并发，企业环境 |
| **Istio Gateway** | 服务网格集成 | 微服务治理，复杂路由 |
| **AWS ALB** | 云原生，与 AWS 深度集成 | AWS 环境 |
| **GCE Ingress** | Google Cloud 原生 | GCP 环境 |

### Nginx Ingress Controller 安装

```bash
# 使用 Helm 安装
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx

# 或使用 kubectl 安装
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
```

## 基本配置

### 简单的 HTTP Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: simple-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
```

### 多路径路由

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-path-ingress
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /api/v1
        pathType: Prefix
        backend:
          service:
            name: api-v1-service
            port:
              number: 80
      - path: /api/v2
        pathType: Prefix
        backend:
          service:
            name: api-v2-service
            port:
              number: 80
      - path: /docs
        pathType: Prefix
        backend:
          service:
            name: docs-service
            port:
              number: 80
```

### 多域名路由

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-host-ingress
spec:
  rules:
  - host: frontend.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80
  - host: admin.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: admin-service
            port:
              number: 80
```

## HTTPS 和 SSL 配置

### 使用预定义证书

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tls-secret
type: kubernetes.io/tls
data:
  tls.crt: LS0tLS1CRUdJTi... # base64 编码的证书
  tls.key: LS0tLS1CRUdJTi... # base64 编码的私钥

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tls-ingress
spec:
  tls:
  - hosts:
    - secure.example.com
    secretName: tls-secret
  rules:
  - host: secure.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: secure-service
            port:
              number: 80
```

### 使用 cert-manager 自动证书

```yaml
# 安装 cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# ClusterIssuer 配置
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx

---
# 自动证书 Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: auto-tls-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - auto.example.com
    secretName: auto-tls-secret
  rules:
  - host: auto.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
```

## 高级配置

### 路径类型详解

| 路径类型 | 匹配规则 | 示例 |
| ---- | ---- | ---- |
| `Exact` | 精确匹配 | `/api/v1` 只匹配 `/api/v1` |
| `Prefix` | 前缀匹配 | `/api` 匹配 `/api/v1`, `/api/users` 等 |
| `ImplementationSpecific` | 由 Ingress Controller 决定 | 取决于具体实现 |

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: path-types-ingress
spec:
  rules:
  - host: example.com
    http:
      paths:
      - path: /api/v1/users
        pathType: Exact  # 精确匹配
        backend:
          service:
            name: users-service
            port:
              number: 80
      - path: /api
        pathType: Prefix  # 前缀匹配
        backend:
          service:
            name: api-service
            port:
              number: 80
```

### 重写和重定向

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rewrite-ingress
  annotations:
    # URL 重写
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    # 永久重定向
    nginx.ingress.kubernetes.io/permanent-redirect: https://new.example.com
    # 临时重定向
    nginx.ingress.kubernetes.io/temporal-redirect: https://temp.example.com
    # 自定义重写
    nginx.ingress.kubernetes.io/configuration-snippet: |
      rewrite ^/old-path/(.*)$ /new-path/$1 permanent;
spec:
  rules:
  - host: example.com
    http:
      paths:
      - path: /api(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80
```

### 负载均衡配置

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: load-balancing-ingress
  annotations:
    # 负载均衡算法
    nginx.ingress.kubernetes.io/upstream-hash-by: "$request_uri"
    # 会话保持
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/affinity-mode: "persistent"
    nginx.ingress.kubernetes.io/session-cookie-name: "INGRESSCOOKIE"
    nginx.ingress.kubernetes.io/session-cookie-expires: "86400"
    nginx.ingress.kubernetes.io/session-cookie-max-age: "86400"
    # 权重分配
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "30"
spec:
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
```

### 限流和安全

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: security-ingress
  annotations:
    # 限流配置
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/rate-limit-connections: "10"
    
    # IP 白名单
    nginx.ingress.kubernetes.io/whitelist-source-range: "10.0.0.0/8,172.16.0.0/12"
    
    # 基本认证
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: basic-auth
    nginx.ingress.kubernetes.io/auth-realm: 'Authentication Required'
    
    # CORS 配置
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://example.com"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, OPTIONS"
    nginx.ingress.kubernetes.io/cors-allow-headers: "DNT,X-CustomHeader,Keep-Alive,User-Agent"
spec:
  rules:
  - host: secure.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: secure-service
            port:
              number: 80
```

### 健康检查和超时

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: health-check-ingress
  annotations:
    # 后端健康检查
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
    nginx.ingress.kubernetes.io/health-check-path: "/health"
    nginx.ingress.kubernetes.io/health-check-interval: "30s"
    
    # 超时配置
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    
    # 缓冲配置
    nginx.ingress.kubernetes.io/proxy-buffering: "on"
    nginx.ingress.kubernetes.io/proxy-buffer-size: "4k"
    nginx.ingress.kubernetes.io/proxy-buffers-number: "8"
spec:
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
```

## 金丝雀部署

### 基于权重的金丝雀部署

```yaml
# 生产版本 Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: production-ingress
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-production
            port:
              number: 80

---
# 金丝雀版本 Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: canary-ingress
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"  # 10% 流量
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-canary
            port:
              number: 80
```

### 基于请求头的金丝雀部署

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: header-canary-ingress
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-by-header: "X-Canary"
    nginx.ingress.kubernetes.io/canary-by-header-value: "true"
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-canary
            port:
              number: 80
```

## 监控和调试

### 常用命令

```bash
# 查看 Ingress 列表
kubectl get ingress

# 查看 Ingress 详细信息
kubectl describe ingress my-ingress

# 查看 Ingress Controller 日志
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# 查看 Ingress Controller 配置
kubectl get configmap -n ingress-nginx ingress-nginx-controller -o yaml

# 测试 Ingress 规则
curl -H "Host: example.com" http://<INGRESS_IP>/
```

### 调试技巧

```bash
# 查看 Nginx 配置
kubectl exec -n ingress-nginx <nginx-controller-pod> -- cat /etc/nginx/nginx.conf

# 实时查看访问日志
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx -f

# 检查证书状态
kubectl describe certificate <certificate-name>

# 验证 DNS 解析
nslookup example.com

# 测试 SSL 证书
openssl s_client -connect example.com:443 -servername example.com
```

## 故障排查

### 常见问题

| 问题 | 可能原因 | 解决方案 |
| ---- | ---- | ---- |
| 404 Not Found | 路径匹配错误 | 检查 path 和 pathType 配置 |
| 502 Bad Gateway | 后端服务不可用 | 检查 Service 和 Pod 状态 |
| 503 Service Unavailable | Ingress Controller 问题 | 检查 Controller 状态和资源 |
| SSL 证书错误 | 证书配置问题 | 检查 TLS Secret 和证书有效性 |
| 域名无法访问 | DNS 解析问题 | 检查 DNS 配置和 Ingress IP |

### 诊断步骤

1. **检查 Ingress 配置**
```bash
kubectl get ingress -o yaml
kubectl describe ingress my-ingress
```

2. **检查后端服务**
```bash
kubectl get service
kubectl get endpoints
```

3. **检查 Ingress Controller**
```bash
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
```

4. **测试网络连通性**
```bash
# 直接测试服务
kubectl port-forward service/my-service 8080:80
curl http://localhost:8080

# 测试 Ingress
curl -H "Host: example.com" http://<INGRESS_IP>/
```

## 性能优化

### Nginx 配置优化

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-configuration
  namespace: ingress-nginx
data:
  # 工作进程数
  worker-processes: "auto"
  
  # 连接数限制
  max-worker-connections: "16384"
  
  # 缓冲区大小
  proxy-buffer-size: "16k"
  proxy-buffers-number: "8"
  
  # 压缩配置
  enable-gzip: "true"
  gzip-level: "6"
  gzip-types: "text/plain text/css application/json application/javascript text/xml application/xml"
  
  # 保持连接
  upstream-keepalive-connections: "100"
  upstream-keepalive-timeout: "60"
  
  # SSL 优化
  ssl-protocols: "TLSv1.2 TLSv1.3"
  ssl-ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256"
```

### 资源限制

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  template:
    spec:
      containers:
      - name: controller
        resources:
          requests:
            cpu: 100m
            memory: 90Mi
          limits:
            cpu: 1000m
            memory: 1Gi
```

## 最佳实践

### 1. 域名和路径设计

```yaml
# 推荐的域名结构
metadata:
  name: well-designed-ingress
spec:
  rules:
  # 环境隔离
  - host: api-dev.example.com
  - host: api-staging.example.com
  - host: api.example.com  # 生产环境
  
  # 服务分离
  - host: frontend.example.com
  - host: api.example.com
  - host: admin.example.com
```

### 2. 安全配置

```yaml
metadata:
  annotations:
    # 强制 HTTPS
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    
    # 安全头
    nginx.ingress.kubernetes.io/configuration-snippet: |
      add_header X-Frame-Options "SAMEORIGIN" always;
      add_header X-Content-Type-Options "nosniff" always;
      add_header X-XSS-Protection "1; mode=block" always;
      add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 3. 监控集成

```yaml
metadata:
  annotations:
    # Prometheus 监控
    nginx.ingress.kubernetes.io/enable-metrics: "true"
    
    # 访问日志格式
    nginx.ingress.kubernetes.io/log-format-escape-json: "true"
    nginx.ingress.kubernetes.io/log-format-upstream: |
      {"time": "$time_iso8601", "remote_addr": "$proxy_protocol_addr", "x_forwarded_for": "$proxy_add_x_forwarded_for", "request_id": "$req_id", "remote_user": "$remote_user", "bytes_sent": $bytes_sent, "request_time": $request_time, "status": $status, "vhost": "$host", "request_proto": "$server_protocol", "path": "$uri", "request_query": "$args", "request_length": $request_length, "duration": $request_time, "method": "$request_method", "http_referrer": "$http_referer", "http_user_agent": "$http_user_agent"}
```

### 4. 高可用配置

```yaml
# Ingress Controller 高可用部署
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ingress-nginx-controller
spec:
  replicas: 3  # 多副本
  template:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app.kubernetes.io/name: ingress-nginx
            topologyKey: kubernetes.io/hostname
```

## 总结

Ingress 是 Kubernetes 中实现七层负载均衡和 HTTP/HTTPS 路由的核心组件。通过合理配置 Ingress 规则和选择合适的 Ingress Controller，可以构建高性能、高可用的应用入口。

**关键要点**：
- 选择合适的 Ingress Controller（推荐 Nginx Ingress）
- 合理设计域名和路径路由规则
- 配置 SSL/TLS 证书实现 HTTPS 访问
- 实施安全策略和访问控制
- 建立监控和日志收集机制
- 优化性能和资源配置
- 实现高可用和故障恢复能力