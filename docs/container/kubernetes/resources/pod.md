# Pod

## 概述

Pod 是 Kubernetes 中最小的可部署单元，是一个或多个容器的集合，这些容器共享存储、网络和运行规范。

| 关键点 | 内容 |
| ---- | ---- |
| 核心作用 | Kubernetes 中最小的调度和部署单元 |
| 容器关系 | 一个 Pod 可包含一个或多个紧密耦合的容器 |
| 资源共享 | Pod 内容器共享网络、存储卷和生命周期 |
| 调度单位 | Kubernetes 调度器以 Pod 为单位进行调度 |

## Pod 的本质

### 设计理念

* **原子性部署单元**：Pod 中的所有容器作为一个整体被调度到同一个节点
* **共享资源模型**：容器间可以通过 localhost 通信，共享存储卷
* **生命周期一致性**：Pod 内所有容器同时启动、停止和重启
* **网络命名空间共享**：Pod 内容器共享同一个 IP 地址和端口空间

### 与容器的关系

```yaml
# 单容器 Pod（最常见）
apiVersion: v1
kind: Pod
metadata:
  name: single-container-pod
spec:
  containers:
  - name: web-server
    image: nginx:1.20
    ports:
    - containerPort: 80

---
# 多容器 Pod（边车模式）
apiVersion: v1
kind: Pod
metadata:
  name: multi-container-pod
spec:
  containers:
  - name: web-server
    image: nginx:1.20
    ports:
    - containerPort: 80
    volumeMounts:
    - name: shared-logs
      mountPath: /var/log/nginx
  - name: log-collector
    image: fluentd:latest
    volumeMounts:
    - name: shared-logs
      mountPath: /var/log/nginx
  volumes:
  - name: shared-logs
    emptyDir: {}
```

## Pod 生命周期

### 生命周期阶段

| 阶段 | 状态 | 描述 |
| ---- | ---- | ---- |
| Pending | 等待中 | Pod 已被创建，但一个或多个容器尚未创建或运行 |
| Running | 运行中 | Pod 已绑定到节点，所有容器都已创建，至少一个容器正在运行 |
| Succeeded | 成功 | Pod 中所有容器都已成功终止，且不会重启 |
| Failed | 失败 | Pod 中所有容器都已终止，至少一个容器以失败状态终止 |
| Unknown | 未知 | 无法获取 Pod 状态，通常是与节点通信失败 |

### 容器状态

```yaml
# 查看 Pod 状态的示例输出
apiVersion: v1
kind: Pod
status:
  phase: Running
  conditions:
  - type: Initialized
    status: "True"
  - type: Ready
    status: "True"
  - type: ContainersReady
    status: "True"
  - type: PodScheduled
    status: "True"
  containerStatuses:
  - name: web-server
    state:
      running:
        startedAt: "2024-01-01T10:00:00Z"
    ready: true
    restartCount: 0
```

### 重启策略

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: restart-policy-example
spec:
  restartPolicy: Always  # Always(默认) | OnFailure | Never
  containers:
  - name: app
    image: busybox
    command: ['sh', '-c', 'echo Hello && sleep 30']
```

| 重启策略 | 行为 | 适用场景 |
| ---- | ---- | ---- |
| Always | 容器退出时总是重启 | 长期运行的服务（默认） |
| OnFailure | 容器非正常退出时重启 | 批处理任务 |
| Never | 容器退出时不重启 | 一次性任务 |

## Pod 配置详解

### 资源限制和请求

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: resource-demo
spec:
  containers:
  - name: app
    image: nginx
    resources:
      requests:        # 资源请求（调度时保证）
        memory: "64Mi"
        cpu: "250m"
      limits:          # 资源限制（运行时上限）
        memory: "128Mi"
        cpu: "500m"
```

### 环境变量配置

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: env-demo
spec:
  containers:
  - name: app
    image: nginx
    env:
    # 直接设置
    - name: DEMO_GREETING
      value: "Hello from the environment"
    # 从 ConfigMap 获取
    - name: SPECIAL_LEVEL_KEY
      valueFrom:
        configMapKeyRef:
          name: special-config
          key: special.level
    # 从 Secret 获取
    - name: SECRET_USERNAME
      valueFrom:
        secretKeyRef:
          name: mysecret
          key: username
    # 从字段获取
    - name: MY_NODE_NAME
      valueFrom:
        fieldRef:
          fieldPath: spec.nodeName
```

### 存储卷挂载

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: volume-demo
spec:
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - name: config-volume
      mountPath: /etc/config
    - name: data-volume
      mountPath: /data
    - name: secret-volume
      mountPath: /etc/secrets
      readOnly: true
  volumes:
  - name: config-volume
    configMap:
      name: app-config
  - name: data-volume
    persistentVolumeClaim:
      claimName: data-pvc
  - name: secret-volume
    secret:
      secretName: app-secret
```

### 健康检查

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: health-check-demo
spec:
  containers:
  - name: app
    image: nginx
    ports:
    - containerPort: 80
    # 存活探针
    livenessProbe:
      httpGet:
        path: /healthz
        port: 80
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 5
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

| 探针类型 | 作用 | 失败后果 |
| ---- | ---- | ---- |
| livenessProbe | 检查容器是否存活 | 重启容器 |
| readinessProbe | 检查容器是否就绪 | 从 Service 端点移除 |
| startupProbe | 检查容器是否启动完成 | 重启容器 |

### 安全上下文

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: security-context-demo
spec:
  securityContext:
    runAsUser: 1000
    runAsGroup: 3000
    fsGroup: 2000
  containers:
  - name: app
    image: nginx
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      runAsNonRoot: true
      capabilities:
        drop:
        - ALL
        add:
        - NET_BIND_SERVICE
```

## Pod 网络

### 网络模型

```yaml
# Pod 网络示例
apiVersion: v1
kind: Pod
metadata:
  name: network-demo
spec:
  containers:
  - name: container1
    image: nginx
    ports:
    - containerPort: 80
  - name: container2
    image: busybox
    command: ['sh', '-c', 'while true; do wget -qO- localhost:80; sleep 10; done']
```

### 网络特性

* **共享网络命名空间**：Pod 内容器共享同一个 IP 地址
* **localhost 通信**：容器间可通过 localhost 和端口通信
* **端口冲突**：同一 Pod 内容器不能使用相同端口
* **网络策略**：可通过 NetworkPolicy 控制 Pod 间网络访问

### DNS 配置

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: dns-demo
spec:
  dnsPolicy: ClusterFirst  # ClusterFirst | Default | None | ClusterFirstWithHostNet
  dnsConfig:
    nameservers:
    - 1.2.3.4
    searches:
    - ns1.svc.cluster-domain.example
    - my.dns.search.suffix
    options:
    - name: ndots
      value: "2"
  containers:
  - name: app
    image: nginx
```

## Pod 调度

### 节点选择

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: scheduling-demo
spec:
  # 节点选择器
  nodeSelector:
    disktype: ssd
    zone: us-west1
  
  # 节点亲和性
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: kubernetes.io/e2e-az-name
            operator: In
            values:
            - e2e-az1
            - e2e-az2
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 1
        preference:
          matchExpressions:
          - key: another-node-label-key
            operator: In
            values:
            - another-node-label-value
  
  # Pod 亲和性和反亲和性
    podAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
          - key: security
            operator: In
            values:
            - S1
        topologyKey: topology.kubernetes.io/zone
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
            - key: security
              operator: In
              values:
              - S2
          topologyKey: topology.kubernetes.io/zone
  
  # 容忍度
  tolerations:
  - key: "key1"
    operator: "Equal"
    value: "value1"
    effect: "NoSchedule"
  - key: "key1"
    operator: "Equal"
    value: "value1"
    effect: "NoExecute"
    tolerationSeconds: 3600
  
  containers:
  - name: app
    image: nginx
```

### 调度策略

| 策略 | 描述 | 使用场景 |
| ---- | ---- | ---- |
| nodeSelector | 简单的节点标签选择 | 基本的节点选择需求 |
| nodeAffinity | 更灵活的节点亲和性规则 | 复杂的节点选择逻辑 |
| podAffinity | Pod 间亲和性 | 希望 Pod 调度到相同区域 |
| podAntiAffinity | Pod 间反亲和性 | 希望 Pod 分散部署 |
| tolerations | 容忍节点污点 | 允许调度到特殊节点 |

## 多容器模式

### 边车模式（Sidecar）

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sidecar-demo
spec:
  containers:
  # 主容器
  - name: web-server
    image: nginx
    ports:
    - containerPort: 80
    volumeMounts:
    - name: shared-logs
      mountPath: /var/log/nginx
  
  # 边车容器 - 日志收集
  - name: log-collector
    image: fluentd
    volumeMounts:
    - name: shared-logs
      mountPath: /var/log/nginx
    - name: fluentd-config
      mountPath: /fluentd/etc
  
  volumes:
  - name: shared-logs
    emptyDir: {}
  - name: fluentd-config
    configMap:
      name: fluentd-config
```

### 适配器模式（Adapter）

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: adapter-demo
spec:
  containers:
  # 主容器 - 生成非标准格式日志
  - name: app
    image: my-legacy-app
    volumeMounts:
    - name: app-logs
      mountPath: /var/log
  
  # 适配器容器 - 转换日志格式
  - name: log-adapter
    image: log-format-converter
    volumeMounts:
    - name: app-logs
      mountPath: /var/log
    - name: formatted-logs
      mountPath: /var/log/formatted
  
  volumes:
  - name: app-logs
    emptyDir: {}
  - name: formatted-logs
    emptyDir: {}
```

### 大使模式（Ambassador）

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ambassador-demo
spec:
  containers:
  # 主容器
  - name: app
    image: my-app
    env:
    - name: DATABASE_HOST
      value: "localhost"  # 通过大使容器访问
    - name: DATABASE_PORT
      value: "5432"
  
  # 大使容器 - 代理数据库连接
  - name: db-ambassador
    image: postgres-proxy
    ports:
    - containerPort: 5432
    env:
    - name: POSTGRES_HOST
      value: "postgres.example.com"
    - name: POSTGRES_PORT
      value: "5432"
```

## 初始化容器

### Init Containers

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: init-demo
spec:
  initContainers:
  # 第一个初始化容器 - 等待服务可用
  - name: wait-for-service
    image: busybox:1.28
    command: ['sh', '-c']
    args:
    - |
      until nslookup myservice.default.svc.cluster.local; do
        echo waiting for myservice
        sleep 2
      done
  
  # 第二个初始化容器 - 下载配置
  - name: download-config
    image: busybox:1.28
    command: ['sh', '-c']
    args:
    - |
      wget -O /shared/config.json http://config-server/config
    volumeMounts:
    - name: shared-data
      mountPath: /shared
  
  containers:
  - name: app
    image: my-app
    volumeMounts:
    - name: shared-data
      mountPath: /app/config
  
  volumes:
  - name: shared-data
    emptyDir: {}
```

### Init Container 特性

* **顺序执行**：按定义顺序依次执行，前一个成功后才执行下一个
* **必须成功**：所有 Init Container 必须成功完成，主容器才会启动
* **资源共享**：与主容器共享 volumes、网络和安全上下文
* **重启行为**：Pod 重启时，所有 Init Container 会重新执行

## Pod 故障排查

### 常见问题诊断

```bash
# 查看 Pod 状态
kubectl get pods
kubectl get pod <pod-name> -o wide

# 查看 Pod 详细信息
kubectl describe pod <pod-name>

# 查看 Pod 日志
kubectl logs <pod-name>
kubectl logs <pod-name> -c <container-name>  # 多容器时指定容器
kubectl logs <pod-name> --previous  # 查看前一个容器实例的日志

# 进入 Pod 容器
kubectl exec -it <pod-name> -- /bin/bash
kubectl exec -it <pod-name> -c <container-name> -- /bin/bash

# 查看 Pod 事件
kubectl get events --field-selector involvedObject.name=<pod-name>

# 查看 Pod 资源使用
kubectl top pod <pod-name>
```

### 常见故障及解决方案

| 状态 | 可能原因 | 解决方案 |
| ---- | ---- | ---- |
| ImagePullBackOff | 镜像拉取失败 | 检查镜像名称、网络、认证信息 |
| CrashLoopBackOff | 容器启动后立即退出 | 检查应用配置、启动命令、资源限制 |
| Pending | 无法调度到节点 | 检查资源请求、节点选择器、污点容忍 |
| ContainerCreating | 容器创建中 | 检查存储卷挂载、网络配置 |
| Error/Failed | 容器执行失败 | 查看日志、检查应用逻辑 |

### 调试技巧

```yaml
# 调试用的 Pod 模板
apiVersion: v1
kind: Pod
metadata:
  name: debug-pod
spec:
  containers:
  - name: debug
    image: busybox
    command: ['sleep', '3600']  # 保持运行以便调试
    volumeMounts:
    - name: debug-volume
      mountPath: /debug
  volumes:
  - name: debug-volume
    hostPath:
      path: /tmp
      type: Directory
```

## 最佳实践

### 设计原则

1. **单一职责**：每个容器应该只负责一个功能
2. **无状态设计**：尽量设计无状态的应用
3. **优雅关闭**：处理 SIGTERM 信号，实现优雅关闭
4. **健康检查**：配置适当的存活和就绪探针
5. **资源限制**：设置合理的资源请求和限制

### 配置建议

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: best-practice-pod
  labels:
    app: my-app
    version: v1.0
spec:
  # 安全配置
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
  
  containers:
  - name: app
    image: my-app:v1.0
    
    # 资源配置
    resources:
      requests:
        memory: "64Mi"
        cpu: "100m"
      limits:
        memory: "128Mi"
        cpu: "200m"
    
    # 健康检查
    livenessProbe:
      httpGet:
        path: /health
        port: 8080
      initialDelaySeconds: 30
      periodSeconds: 10
    
    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 5
    
    # 环境变量
    env:
    - name: LOG_LEVEL
      value: "INFO"
    
    # 存储卷
    volumeMounts:
    - name: config
      mountPath: /app/config
      readOnly: true
  
  volumes:
  - name: config
    configMap:
      name: app-config
  
  # 重启策略
  restartPolicy: Always
```

### 性能优化

1. **镜像优化**：使用多阶段构建，减小镜像大小
2. **启动优化**：优化应用启动时间，合理设置探针延迟
3. **资源调优**：根据实际使用情况调整资源请求和限制
4. **网络优化**：合理使用 DNS 缓存，优化服务发现
5. **存储优化**：选择合适的存储类型，避免不必要的 I/O

## 总结

Pod 是 Kubernetes 的核心概念，理解 Pod 的特性和使用方法对于掌握 Kubernetes 至关重要：

### 核心特性
1. **最小部署单元** - 容器的逻辑主机
2. **资源共享** - 网络、存储、生命周期共享
3. **原子性操作** - 整体调度、启停、扩缩容
4. **临时性** - 设计为可替换的临时资源

### 主要用途
1. **单容器 Pod** - 最常见的使用模式
2. **多容器 Pod** - 紧密耦合的容器组合
3. **边车模式** - 辅助功能容器
4. **初始化容器** - 预处理和准备工作

### 最佳实践
1. **合理设计** - 遵循单一职责原则
2. **健康检查** - 配置完善的探针
3. **资源管理** - 设置合适的资源限制
4. **安全配置** - 使用安全上下文
5. **故障处理** - 实现优雅关闭和错误恢复

掌握 Pod 的概念和使用方法是学习 Kubernetes 其他高级概念（如 Deployment、Service 等）的基础。