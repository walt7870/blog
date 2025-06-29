# ConfigMap

## 概述

ConfigMap 是 Kubernetes 中用于存储非机密配置数据的资源对象。它允许你将配置信息与容器镜像解耦，使应用程序更加灵活和可移植。ConfigMap 以键值对的形式存储数据，可以包含单个属性或整个配置文件。

| 关键点 | 内容 |
| ---- | ---- |
| 核心作用 | 存储非机密的配置数据 |
| 数据格式 | 键值对形式 |
| 使用方式 | 环境变量、命令行参数、配置文件 |
| 大小限制 | 单个 ConfigMap 最大 1MB |

## ConfigMap 的本质

### 设计理念

* **配置与代码分离**：将配置信息从应用程序代码中分离出来
* **环境无关性**：同一镜像可以在不同环境中使用不同配置
* **动态配置**：支持运行时更新配置（需要应用程序支持）
* **版本控制**：配置变更可以通过 Kubernetes 资源进行版本管理

### 工作原理

```
创建 ConfigMap → 在 Pod 中引用 → kubelet 获取数据 → 注入到容器
      ↓              ↓              ↓              ↓
   存储配置数据      定义使用方式     从 API 获取     环境变量/文件
```

### ConfigMap vs Secret

| 特性 | ConfigMap | Secret |
| ---- | ---- | ---- |
| 数据类型 | 非机密配置数据 | 机密数据（密码、证书等） |
| 存储方式 | 明文存储 | Base64 编码存储 |
| 访问控制 | 基本的 RBAC 控制 | 更严格的访问控制 |
| 使用场景 | 配置文件、环境变量 | 密码、API 密钥、证书 |
| 大小限制 | 1MB | 1MB |

## 基本配置

### 1. 简单键值对 ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: default
data:
  # 简单的键值对
  database_host: "mysql.example.com"
  database_port: "3306"
  log_level: "INFO"
  debug_mode: "false"
  max_connections: "100"
```

### 2. 包含配置文件的 ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
  namespace: default
data:
  # 配置文件内容
  nginx.conf: |
    user nginx;
    worker_processes auto;
    error_log /var/log/nginx/error.log;
    pid /run/nginx.pid;
    
    events {
        worker_connections 1024;
    }
    
    http {
        log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                        '$status $body_bytes_sent "$http_referer" '
                        '"$http_user_agent" "$http_x_forwarded_for"';
        
        access_log /var/log/nginx/access.log main;
        
        sendfile on;
        tcp_nopush on;
        tcp_nodelay on;
        keepalive_timeout 65;
        types_hash_max_size 2048;
        
        include /etc/nginx/mime.types;
        default_type application/octet-stream;
        
        server {
            listen 80;
            server_name localhost;
            
            location / {
                root /usr/share/nginx/html;
                index index.html index.htm;
            }
        }
    }
  
  # 另一个配置文件
  default.conf: |
    server {
        listen 80;
        server_name example.com;
        
        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
```

### 3. 混合数据类型 ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-settings
  namespace: default
data:
  # 简单配置
  app_name: "MyApplication"
  version: "1.0.0"
  
  # JSON 配置
  database.json: |
    {
      "host": "localhost",
      "port": 5432,
      "database": "myapp",
      "ssl": true,
      "pool": {
        "min": 5,
        "max": 20
      }
    }
  
  # YAML 配置
  logging.yaml: |
    level: INFO
    handlers:
      - type: console
        format: "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
      - type: file
        filename: "/var/log/app.log"
        maxBytes: 10485760
        backupCount: 5
  
  # 属性文件
  application.properties: |
    server.port=8080
    spring.datasource.url=jdbc:mysql://localhost:3306/mydb
    spring.datasource.username=user
    spring.jpa.hibernate.ddl-auto=update
    logging.level.com.example=DEBUG
```

## 在 Pod 中使用 ConfigMap

### 1. 作为环境变量使用

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: myapp:latest
    env:
    # 单个键值对
    - name: DATABASE_HOST
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: database_host
    - name: DATABASE_PORT
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: database_port
    # 引用整个 ConfigMap
    envFrom:
    - configMapRef:
        name: app-config
```

### 2. 作为卷挂载使用

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
spec:
  containers:
  - name: nginx
    image: nginx:1.19
    volumeMounts:
    # 挂载整个 ConfigMap
    - name: nginx-config-volume
      mountPath: /etc/nginx
    # 挂载特定文件
    - name: app-config-volume
      mountPath: /etc/app
      subPath: application.properties
  volumes:
  # 挂载整个 ConfigMap
  - name: nginx-config-volume
    configMap:
      name: nginx-config
  # 挂载特定键
  - name: app-config-volume
    configMap:
      name: app-settings
      items:
      - key: application.properties
        path: app.properties
      - key: logging.yaml
        path: logging.yaml
```

### 3. 作为命令行参数使用

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: myapp:latest
    command: ["/app/myapp"]
    args:
    - "--host=$(DATABASE_HOST)"
    - "--port=$(DATABASE_PORT)"
    - "--log-level=$(LOG_LEVEL)"
    env:
    - name: DATABASE_HOST
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: database_host
    - name: DATABASE_PORT
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: database_port
    - name: LOG_LEVEL
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: log_level
```

## 高级配置

### 1. 不可变 ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: immutable-config
immutable: true  # 设置为不可变
data:
  config.yaml: |
    database:
      host: prod-db.example.com
      port: 5432
    cache:
      ttl: 3600
```

### 2. 带有二进制数据的 ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: binary-config
data:
  # 文本数据
  config.txt: "This is text data"
binaryData:
  # 二进制数据（Base64 编码）
  logo.png: iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==
```

### 3. 多容器共享 ConfigMap

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-container-pod
spec:
  containers:
  - name: web-server
    image: nginx:1.19
    volumeMounts:
    - name: shared-config
      mountPath: /etc/nginx/conf.d
  - name: log-processor
    image: fluentd:latest
    volumeMounts:
    - name: shared-config
      mountPath: /fluentd/etc
      subPath: fluentd.conf
  volumes:
  - name: shared-config
    configMap:
      name: shared-config
      items:
      - key: nginx.conf
        path: default.conf
      - key: fluentd.conf
        path: fluentd.conf
```

### 4. 文件权限设置

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: permission-pod
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: config-volume
      mountPath: /etc/config
  volumes:
  - name: config-volume
    configMap:
      name: app-config
      defaultMode: 0644  # 设置默认文件权限
      items:
      - key: sensitive.conf
        path: sensitive.conf
        mode: 0600  # 设置特定文件权限
      - key: public.conf
        path: public.conf
        mode: 0644
```

## 命令行操作

### 创建 ConfigMap

```bash
# 从字面值创建
kubectl create configmap app-config \
  --from-literal=database_host=mysql.example.com \
  --from-literal=database_port=3306 \
  --from-literal=log_level=INFO

# 从文件创建
kubectl create configmap nginx-config --from-file=nginx.conf

# 从目录创建
kubectl create configmap app-configs --from-file=./config-dir/

# 从环境文件创建
kubectl create configmap env-config --from-env-file=app.env

# 混合创建
kubectl create configmap mixed-config \
  --from-literal=version=1.0.0 \
  --from-file=config.yaml \
  --from-file=special-key=path/to/file.txt
```

### 查看和管理 ConfigMap

```bash
# 查看所有 ConfigMap
kubectl get configmaps
kubectl get cm  # 简写

# 查看特定 ConfigMap
kubectl get configmap app-config

# 查看 ConfigMap 详细信息
kubectl describe configmap app-config

# 以 YAML 格式查看
kubectl get configmap app-config -o yaml

# 查看 ConfigMap 的数据
kubectl get configmap app-config -o jsonpath='{.data}'

# 编辑 ConfigMap
kubectl edit configmap app-config

# 删除 ConfigMap
kubectl delete configmap app-config
```

### 更新 ConfigMap

```bash
# 替换 ConfigMap
kubectl replace -f configmap.yaml

# 应用更改
kubectl apply -f configmap.yaml

# 从文件更新特定键
kubectl create configmap app-config \
  --from-file=new-config.yaml \
  --dry-run=client -o yaml | kubectl apply -f -

# 使用 patch 更新
kubectl patch configmap app-config -p '{"data":{"new_key":"new_value"}}'
```

## 实际应用场景

### 1. Web 应用配置

```yaml
# Web 应用 ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: webapp-config
data:
  # 应用配置
  app.properties: |
    server.port=8080
    server.servlet.context-path=/api
    
    # 数据库配置
    spring.datasource.url=jdbc:mysql://mysql:3306/webapp
    spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
    
    # 缓存配置
    spring.cache.type=redis
    spring.redis.host=redis
    spring.redis.port=6379
    
    # 日志配置
    logging.level.com.example=DEBUG
    logging.pattern.console=%d{yyyy-MM-dd HH:mm:ss} - %msg%n
  
  # Nginx 配置
  nginx.conf: |
    upstream backend {
        server webapp:8080;
    }
    
    server {
        listen 80;
        server_name example.com;
        
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
        
        location / {
            root /usr/share/nginx/html;
            index index.html;
        }
    }

---
# 使用 ConfigMap 的 Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
      - name: webapp
        image: mywebapp:latest
        ports:
        - containerPort: 8080
        volumeMounts:
        - name: config-volume
          mountPath: /app/config
        env:
        - name: SPRING_CONFIG_LOCATION
          value: "file:/app/config/app.properties"
      - name: nginx
        image: nginx:1.19
        ports:
        - containerPort: 80
        volumeMounts:
        - name: nginx-config
          mountPath: /etc/nginx/conf.d
      volumes:
      - name: config-volume
        configMap:
          name: webapp-config
          items:
          - key: app.properties
            path: app.properties
      - name: nginx-config
        configMap:
          name: webapp-config
          items:
          - key: nginx.conf
            path: default.conf
```

### 2. 微服务配置管理

```yaml
# 服务发现配置
apiVersion: v1
kind: ConfigMap
metadata:
  name: service-discovery
data:
  services.yaml: |
    services:
      user-service:
        url: http://user-service:8080
        timeout: 30s
        retry: 3
      order-service:
        url: http://order-service:8080
        timeout: 30s
        retry: 3
      payment-service:
        url: http://payment-service:8080
        timeout: 60s
        retry: 2

---
# 监控配置
apiVersion: v1
kind: ConfigMap
metadata:
  name: monitoring-config
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
    
    scrape_configs:
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
```

### 3. 数据库初始化脚本

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: db-init-scripts
data:
  01-schema.sql: |
    CREATE DATABASE IF NOT EXISTS myapp;
    USE myapp;
    
    CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        total DECIMAL(10,2),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
  
  02-data.sql: |
    INSERT INTO users (username, email) VALUES
    ('admin', 'admin@example.com'),
    ('user1', 'user1@example.com'),
    ('user2', 'user2@example.com');
  
  03-indexes.sql: |
    CREATE INDEX idx_users_username ON users(username);
    CREATE INDEX idx_users_email ON users(email);
    CREATE INDEX idx_orders_user_id ON orders(user_id);
    CREATE INDEX idx_orders_status ON orders(status);
```

## 故障排查

### 常见问题

| 问题 | 可能原因 | 解决方案 |
| ---- | ---- | ---- |
| Pod 无法启动 | ConfigMap 不存在 | 检查 ConfigMap 是否创建且名称正确 |
| 环境变量为空 | 键名不匹配 | 验证 ConfigMap 中的键名 |
| 配置文件未挂载 | 挂载路径错误 | 检查 volumeMounts 和 volumes 配置 |
| 配置更新不生效 | Pod 未重启 | 重启 Pod 或使用支持热重载的应用 |
| 权限错误 | 文件权限设置不当 | 调整 defaultMode 和 mode 设置 |

### 诊断步骤

1. **检查 ConfigMap 是否存在**
```bash
kubectl get configmap app-config
kubectl describe configmap app-config
```

2. **验证 ConfigMap 数据**
```bash
kubectl get configmap app-config -o yaml
```

3. **检查 Pod 配置**
```bash
kubectl describe pod my-pod
```

4. **验证环境变量**
```bash
kubectl exec my-pod -- env | grep DATABASE
```

5. **检查挂载的文件**
```bash
kubectl exec my-pod -- ls -la /etc/config
kubectl exec my-pod -- cat /etc/config/app.properties
```

6. **查看 Pod 事件**
```bash
kubectl get events --field-selector involvedObject.name=my-pod
```

## 最佳实践

### 1. 命名和组织

```yaml
# 良好的命名规范
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config-v1  # 包含应用名和版本
  namespace: production
  labels:
    app: myapp
    component: config
    version: v1.0.0
    environment: production
  annotations:
    description: "MyApp production configuration"
    maintainer: "team-backend@company.com"
    last-updated: "2024-01-15"
data:
  # 使用有意义的键名
  database.host: "prod-mysql.company.com"
  database.port: "3306"
  cache.redis.host: "prod-redis.company.com"
  logging.level: "INFO"
```

### 2. 环境特定配置

```yaml
# 开发环境
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
  namespace: development
data:
  environment: "development"
  database.host: "dev-mysql"
  database.port: "3306"
  logging.level: "DEBUG"
  debug.enabled: "true"

---
# 生产环境
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
  namespace: production
data:
  environment: "production"
  database.host: "prod-mysql.company.com"
  database.port: "3306"
  logging.level: "WARN"
  debug.enabled: "false"
```

### 3. 配置验证

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: validated-config
data:
  # 使用 JSON Schema 验证配置
  config.json: |
    {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": {
        "database": {
          "type": "object",
          "properties": {
            "host": {"type": "string", "format": "hostname"},
            "port": {"type": "integer", "minimum": 1, "maximum": 65535}
          },
          "required": ["host", "port"]
        }
      },
      "required": ["database"]
    }
```

### 4. 配置热重载

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hot-reload-app
spec:
  containers:
  - name: app
    image: myapp:latest
    env:
    - name: CONFIG_WATCH_ENABLED
      value: "true"
    - name: CONFIG_RELOAD_INTERVAL
      value: "30s"
    volumeMounts:
    - name: config-volume
      mountPath: /etc/config
    # 使用 sidecar 容器监控配置变化
  - name: config-reloader
    image: configmap-reload:latest
    args:
    - --volume-dir=/etc/config
    - --webhook-url=http://localhost:8080/reload
    volumeMounts:
    - name: config-volume
      mountPath: /etc/config
  volumes:
  - name: config-volume
    configMap:
      name: app-config
```

### 5. 安全配置

```yaml
# 使用 RBAC 控制 ConfigMap 访问
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: configmap-reader
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list"]
  resourceNames: ["app-config"]  # 限制特定 ConfigMap

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: configmap-reader-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: app-service-account
  namespace: production
roleRef:
  kind: Role
  name: configmap-reader
  apiGroup: rbac.authorization.k8s.io
```

## 监控和可观测性

### 1. ConfigMap 使用监控

```yaml
# Prometheus 监控规则
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: configmap-alerts
  namespace: monitoring
spec:
  groups:
  - name: configmap.rules
    rules:
    - alert: ConfigMapNotFound
      expr: kube_configmap_info{configmap="app-config"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "ConfigMap {{ $labels.configmap }} not found"
        description: "ConfigMap {{ $labels.configmap }} in namespace {{ $labels.namespace }} is missing."
    
    - alert: ConfigMapTooLarge
      expr: kube_configmap_info{configmap="app-config"} > 900000  # 900KB
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "ConfigMap {{ $labels.configmap }} is too large"
        description: "ConfigMap {{ $labels.configmap }} in namespace {{ $labels.namespace }} is approaching the 1MB limit."
```

### 2. 配置变更审计

```yaml
# 审计策略
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: Metadata
  resources:
  - group: ""
    resources: ["configmaps"]
  verbs: ["create", "update", "patch", "delete"]
  namespaces: ["production", "staging"]
```

## 总结

ConfigMap 是 Kubernetes 中管理应用程序配置的重要工具，它提供了灵活的配置管理方式，支持多种数据格式和使用方式。通过合理使用 ConfigMap，可以实现配置与代码的分离，提高应用程序的可移植性和可维护性。

**关键要点**：
- ConfigMap 用于存储非机密的配置数据
- 支持键值对、配置文件等多种数据格式
- 可以通过环境变量、卷挂载等方式在 Pod 中使用
- 单个 ConfigMap 大小限制为 1MB
- 配置更新需要重启 Pod 才能生效（除非应用支持热重载）
- 应该结合 RBAC 进行访问控制和安全管理