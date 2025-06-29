# Deployment

## 概述

Deployment 是 Kubernetes 中用于管理无状态应用的核心控制器，提供声明式的 Pod 和 ReplicaSet 更新机制。

| 关键点 | 内容 |
| ---- | ---- |
| 核心作用 | 管理 Pod 的创建、更新和删除 |
| 控制对象 | 通过 ReplicaSet 管理 Pod 副本 |
| 更新策略 | 支持滚动更新和重新创建 |
| 回滚机制 | 支持版本历史和快速回滚 |

## Deployment 的本质

### 设计理念

* **声明式管理**：描述期望状态，由控制器确保实际状态与期望状态一致
* **版本控制**：每次更新创建新的 ReplicaSet，保留历史版本
* **滚动更新**：逐步替换旧版本 Pod，确保服务可用性
* **自动恢复**：监控 Pod 状态，自动重启失败的 Pod

### 架构关系

```
Deployment
    ↓ (管理)
ReplicaSet (v1, v2, v3...)
    ↓ (创建)
Pod (副本1, 副本2, 副本3...)
```

## 基本配置

### 简单的 Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.20
        ports:
        - containerPort: 80
```

### 完整配置示例

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app-deployment
  namespace: default
  labels:
    app: web-app
    version: v1.0
  annotations:
    deployment.kubernetes.io/revision: "1"
spec:
  # 副本数量
  replicas: 5
  
  # 选择器（必须匹配 template.metadata.labels）
  selector:
    matchLabels:
      app: web-app
      tier: frontend
  
  # Pod 模板
  template:
    metadata:
      labels:
        app: web-app
        tier: frontend
        version: v1.0
    spec:
      containers:
      - name: web-container
        image: nginx:1.20
        ports:
        - containerPort: 80
          name: http
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
  
  # 更新策略
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  
  # 进度截止时间
  progressDeadlineSeconds: 600
  
  # 保留的历史版本数
  revisionHistoryLimit: 10
```

## 更新策略

### 滚动更新（RollingUpdate）

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rolling-update-demo
spec:
  replicas: 6
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 2      # 最多不可用的 Pod 数量
      maxSurge: 2           # 最多超出期望副本数的 Pod 数量
  selector:
    matchLabels:
      app: demo
  template:
    metadata:
      labels:
        app: demo
    spec:
      containers:
      - name: app
        image: nginx:1.20
        ports:
        - containerPort: 80
```

### 重新创建（Recreate）

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: recreate-demo
spec:
  replicas: 3
  strategy:
    type: Recreate  # 先删除所有旧 Pod，再创建新 Pod
  selector:
    matchLabels:
      app: demo
  template:
    metadata:
      labels:
        app: demo
    spec:
      containers:
      - name: app
        image: nginx:1.20
```

### 更新策略对比

| 策略 | 优点 | 缺点 | 适用场景 |
| ---- | ---- | ---- | ---- |
| RollingUpdate | 零停机更新，平滑过渡 | 更新过程较慢，可能出现版本混合 | 无状态应用，对可用性要求高 |
| Recreate | 更新快速，版本一致 | 有停机时间 | 有状态应用，不能并存多版本 |

## 生命周期管理

### 创建 Deployment

```bash
# 从 YAML 文件创建
kubectl apply -f deployment.yaml

# 命令行创建
kubectl create deployment nginx --image=nginx:1.20 --replicas=3

# 生成 YAML 模板
kubectl create deployment nginx --image=nginx:1.20 --dry-run=client -o yaml > deployment.yaml
```

### 查看 Deployment

```bash
# 查看所有 Deployment
kubectl get deployments
kubectl get deploy

# 查看详细信息
kubectl describe deployment nginx-deployment

# 查看 YAML 配置
kubectl get deployment nginx-deployment -o yaml

# 实时监控状态
kubectl get deployment nginx-deployment -w
```

### 更新 Deployment

```bash
# 更新镜像
kubectl set image deployment/nginx-deployment nginx=nginx:1.21

# 编辑配置
kubectl edit deployment nginx-deployment

# 应用新配置
kubectl apply -f deployment.yaml

# 重启 Deployment（重新创建所有 Pod）
kubectl rollout restart deployment/nginx-deployment
```

### 扩缩容

```bash
# 手动扩缩容
kubectl scale deployment nginx-deployment --replicas=5

# 查看扩缩容状态
kubectl get deployment nginx-deployment

# 自动扩缩容（需要 HPA）
kubectl autoscale deployment nginx-deployment --cpu-percent=50 --min=1 --max=10
```

## 滚动更新和回滚

### 滚动更新过程

```bash
# 触发滚动更新
kubectl set image deployment/nginx-deployment nginx=nginx:1.21 --record

# 查看滚动更新状态
kubectl rollout status deployment/nginx-deployment

# 查看滚动更新历史
kubectl rollout history deployment/nginx-deployment

# 查看特定版本详情
kubectl rollout history deployment/nginx-deployment --revision=2
```

### 回滚操作

```bash
# 回滚到上一个版本
kubectl rollout undo deployment/nginx-deployment

# 回滚到指定版本
kubectl rollout undo deployment/nginx-deployment --to-revision=2

# 暂停滚动更新
kubectl rollout pause deployment/nginx-deployment

# 恢复滚动更新
kubectl rollout resume deployment/nginx-deployment
```

### 版本管理示例

```yaml
# 带有变更记录的更新
apiVersion: apps/v1
kind: Deployment
metadata:
  name: versioned-app
  annotations:
    deployment.kubernetes.io/revision: "3"
    kubernetes.io/change-cause: "Update to version 1.2.0"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: versioned-app
  template:
    metadata:
      labels:
        app: versioned-app
        version: "1.2.0"
    spec:
      containers:
      - name: app
        image: myapp:1.2.0
        ports:
        - containerPort: 8080
```

## 高级配置

### 就绪性和存活性探针

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: health-check-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: health-demo
  template:
    metadata:
      labels:
        app: health-demo
    spec:
      containers:
      - name: app
        image: nginx:1.20
        ports:
        - containerPort: 80
        
        # 存活探针
        livenessProbe:
          httpGet:
            path: /health
            port: 80
            httpHeaders:
            - name: Custom-Header
              value: Awesome
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
        
        # 就绪探针
        readinessProbe:
          httpGet:
            path: /ready
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3
        
        # 启动探针
        startupProbe:
          httpGet:
            path: /startup
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 30
```

### 资源管理

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resource-managed-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: resource-demo
  template:
    metadata:
      labels:
        app: resource-demo
    spec:
      containers:
      - name: app
        image: nginx:1.20
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
            ephemeral-storage: "1Gi"
          limits:
            memory: "256Mi"
            cpu: "200m"
            ephemeral-storage: "2Gi"
        
        # 环境变量
        env:
        - name: ENV
          value: "production"
        - name: LOG_LEVEL
          value: "info"
        
        # 存储卷挂载
        volumeMounts:
        - name: config-volume
          mountPath: /etc/config
        - name: data-volume
          mountPath: /data
      
      volumes:
      - name: config-volume
        configMap:
          name: app-config
      - name: data-volume
        persistentVolumeClaim:
          claimName: app-data-pvc
```

### 安全配置

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: secure-app
  template:
    metadata:
      labels:
        app: secure-app
    spec:
      # Pod 安全上下文
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 3000
        fsGroup: 2000
        seccompProfile:
          type: RuntimeDefault
      
      containers:
      - name: app
        image: nginx:1.20
        
        # 容器安全上下文
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          capabilities:
            drop:
            - ALL
            add:
            - NET_BIND_SERVICE
        
        ports:
        - containerPort: 80
        
        volumeMounts:
        - name: tmp-volume
          mountPath: /tmp
        - name: var-cache-volume
          mountPath: /var/cache/nginx
        - name: var-run-volume
          mountPath: /var/run
      
      volumes:
      - name: tmp-volume
        emptyDir: {}
      - name: var-cache-volume
        emptyDir: {}
      - name: var-run-volume
        emptyDir: {}
```

## 调度和亲和性

### 节点选择和亲和性

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scheduled-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: scheduled-app
  template:
    metadata:
      labels:
        app: scheduled-app
    spec:
      # 节点选择器
      nodeSelector:
        disktype: ssd
        zone: us-west1
      
      # 亲和性配置
      affinity:
        # 节点亲和性
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: kubernetes.io/arch
                operator: In
                values:
                - amd64
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 1
            preference:
              matchExpressions:
              - key: node-type
                operator: In
                values:
                - high-performance
        
        # Pod 反亲和性（分散部署）
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - scheduled-app
              topologyKey: kubernetes.io/hostname
      
      # 容忍度
      tolerations:
      - key: "dedicated"
        operator: "Equal"
        value: "gpu"
        effect: "NoSchedule"
      
      containers:
      - name: app
        image: nginx:1.20
```

## 监控和观测

### 状态监控

```bash
# 查看 Deployment 状态
kubectl get deployment nginx-deployment -o wide

# 查看 ReplicaSet
kubectl get replicaset -l app=nginx

# 查看 Pod 状态
kubectl get pods -l app=nginx

# 查看事件
kubectl get events --field-selector involvedObject.name=nginx-deployment

# 查看资源使用情况
kubectl top deployment nginx-deployment
kubectl top pods -l app=nginx
```

### 日志收集

```bash
# 查看 Deployment 相关的所有 Pod 日志
kubectl logs -l app=nginx --tail=100

# 实时查看日志
kubectl logs -l app=nginx -f

# 查看特定 Pod 日志
kubectl logs <pod-name>

# 查看前一个容器实例的日志
kubectl logs <pod-name> --previous
```

### 指标配置

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: monitored-deployment
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"
    prometheus.io/path: "/metrics"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: monitored-app
  template:
    metadata:
      labels:
        app: monitored-app
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: app
        image: myapp:latest
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: METRICS_ENABLED
          value: "true"
```

## 故障排查

### 常见问题诊断

```bash
# 检查 Deployment 状态
kubectl describe deployment <deployment-name>

# 检查 ReplicaSet 状态
kubectl describe replicaset <replicaset-name>

# 检查 Pod 状态
kubectl describe pod <pod-name>

# 查看事件
kubectl get events --sort-by=.metadata.creationTimestamp

# 检查资源配额
kubectl describe resourcequota
kubectl describe limitrange
```

### 常见故障及解决方案

| 问题 | 症状 | 可能原因 | 解决方案 |
| ---- | ---- | ---- | ---- |
| Pod 无法启动 | Pending 状态 | 资源不足、调度限制 | 检查资源请求、节点容量、调度策略 |
| 滚动更新卡住 | 部分 Pod 更新失败 | 镜像拉取失败、健康检查失败 | 检查镜像、探针配置、网络连接 |
| 服务不可用 | 就绪探针失败 | 应用启动慢、配置错误 | 调整探针参数、检查应用配置 |
| 内存溢出 | Pod 被杀死重启 | 内存限制过低 | 增加内存限制、优化应用内存使用 |
| 回滚失败 | 历史版本不可用 | 历史版本被清理 | 检查 revisionHistoryLimit 设置 |

### 调试技巧

```yaml
# 调试用的 Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: debug-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: debug
  template:
    metadata:
      labels:
        app: debug
    spec:
      containers:
      - name: debug
        image: busybox
        command: ['sleep', '3600']  # 保持运行以便调试
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "200m"
```

## 最佳实践

### 设计原则

1. **声明式配置**：使用 YAML 文件管理配置，避免命令式操作
2. **版本控制**：为镜像使用具体版本标签，避免使用 latest
3. **资源限制**：设置合理的资源请求和限制
4. **健康检查**：配置适当的存活和就绪探针
5. **标签管理**：使用一致的标签策略便于管理

### 配置建议

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: best-practice-deployment
  labels:
    app: my-app
    version: v1.0.0
    component: backend
    part-of: my-system
    managed-by: kubectl
spec:
  replicas: 3
  
  # 选择器必须匹配模板标签
  selector:
    matchLabels:
      app: my-app
      component: backend
  
  template:
    metadata:
      labels:
        app: my-app
        version: v1.0.0
        component: backend
    spec:
      # 安全配置
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
      
      containers:
      - name: app
        image: my-app:v1.0.0  # 使用具体版本
        
        # 端口配置
        ports:
        - containerPort: 8080
          name: http
          protocol: TCP
        
        # 资源配置
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        
        # 健康检查
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /ready
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        
        # 环境变量
        env:
        - name: ENV
          value: "production"
        - name: LOG_LEVEL
          value: "info"
        
        # 存储卷挂载
        volumeMounts:
        - name: config
          mountPath: /app/config
          readOnly: true
      
      volumes:
      - name: config
        configMap:
          name: app-config
  
  # 更新策略
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  
  # 进度截止时间
  progressDeadlineSeconds: 600
  
  # 保留历史版本数
  revisionHistoryLimit: 10
```

### 性能优化

1. **镜像优化**：使用多阶段构建，减小镜像大小
2. **启动优化**：优化应用启动时间，合理设置探针延迟
3. **资源调优**：根据实际使用情况调整资源请求和限制
4. **并发控制**：合理设置 maxUnavailable 和 maxSurge
5. **历史管理**：适当设置 revisionHistoryLimit 避免过多历史版本

### 安全建议

1. **最小权限**：使用非 root 用户运行容器
2. **只读文件系统**：设置 readOnlyRootFilesystem
3. **能力限制**：删除不必要的 Linux capabilities
4. **网络策略**：使用 NetworkPolicy 限制网络访问
5. **镜像安全**：定期扫描镜像漏洞

## 总结

Deployment 是 Kubernetes 中管理无状态应用的核心资源，提供了强大的声明式管理能力：

### 核心特性
1. **声明式管理** - 描述期望状态，自动维护
2. **滚动更新** - 零停机更新，平滑过渡
3. **版本控制** - 保留历史版本，支持快速回滚
4. **自动恢复** - 监控 Pod 状态，自动重启失败实例

### 主要功能
1. **副本管理** - 确保指定数量的 Pod 副本运行
2. **更新策略** - 支持滚动更新和重新创建
3. **扩缩容** - 手动或自动调整副本数量
4. **故障恢复** - 自动替换失败的 Pod

### 最佳实践
1. **合理配置** - 设置适当的资源限制和健康检查
2. **版本管理** - 使用具体版本标签，记录变更历史
3. **安全加固** - 遵循安全最佳实践
4. **监控观测** - 配置完善的监控和日志收集
5. **故障处理** - 建立完善的故障排查流程

Deployment 是 Kubernetes 应用部署的基础，掌握其使用方法对于运维和开发都至关重要。