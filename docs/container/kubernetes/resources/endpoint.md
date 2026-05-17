# Endpoint

## 概述

Endpoint 是 Kubernetes 中的一个核心资源，它代表了一个服务的网络端点集合。Endpoint 资源存储了服务背后的所有 Pod IP 地址和端口信息，是服务发现和负载均衡的基础。

| 关键点 | 内容 |
| ---- | ---- |
| 核心作用 | 存储服务后端 Pod 的 IP 地址和端口信息 |
| 创建方式 | 自动（通过 Service）或手动创建 |
| 关联资源 | Service、Pod |
| 使用场景 | 服务发现、负载均衡、外部服务集成 |

## Endpoint 的本质

### 设计理念

* **解耦服务与实例**：将服务定义与实际后端实例分离
* **动态更新**：随着 Pod 的创建、删除和重启自动更新
* **服务抽象**：为不同类型的后端提供统一的访问方式
* **扩展性**：支持集群内部和外部服务的统一管理

### 工作原理

```
Service 创建 → Endpoint 控制器监控 → 查找匹配 Pod → 创建/更新 Endpoint → kube-proxy 使用
    ↓                ↓                ↓                ↓                ↓
 服务定义      持续监控 Pod 变化    选择器匹配      端点集合更新      负载均衡实现
```

### 与 Service 的关系

| 资源 | 作用 | 创建方式 |
| ---- | ---- | ---- |
| Service | 定义服务名称、端口和选择器 | 用户创建 |
| Endpoint | 存储服务后端实例的 IP 和端口 | 通常由控制器自动创建 |
| EndpointSlice | Endpoint 的扩展版本，支持更大规模集群 | 自动创建（启用特性后） |

## 基本配置

### 自动创建的 Endpoint

当创建带有选择器的 Service 时，Kubernetes 会自动创建和管理对应的 Endpoint 资源。

```yaml
# Service 定义
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  selector:
    app: my-app
  ports:
  - name: http
    port: 80
    targetPort: 8080
```

对应自动创建的 Endpoint：

```yaml
apiVersion: v1
kind: Endpoints
metadata:
  name: my-service  # 必须与 Service 同名
subsets:
- addresses:
  - ip: 10.244.0.11  # Pod IP
  - ip: 10.244.0.12  # Pod IP
  ports:
  - name: http
    port: 8080
    protocol: TCP
```

### 手动创建的 Endpoint

对于没有选择器的 Service（如外部服务），需要手动创建 Endpoint。

```yaml
# 无选择器的 Service
apiVersion: v1
kind: Service
metadata:
  name: external-service
spec:
  ports:
  - name: http
    port: 80
    targetPort: 80
```

手动创建对应的 Endpoint：

```yaml
apiVersion: v1
kind: Endpoints
metadata:
  name: external-service  # 必须与 Service 同名
subsets:
- addresses:
  - ip: 192.168.1.100  # 外部服务 IP
  - ip: 192.168.1.101  # 外部服务 IP
  ports:
  - name: http
    port: 80
    protocol: TCP
```

## Endpoint 结构详解

### Endpoint 资源结构

```yaml
apiVersion: v1
kind: Endpoints
metadata:
  name: my-service
  namespace: default
  labels:
    app: my-app
  annotations:
    description: "Endpoints for my-service"
subsets:
- addresses:          # 正常工作的端点地址
  - ip: 10.244.0.11
    nodeName: node-1
    hostname: pod-1
    targetRef:
      kind: Pod
      name: my-pod-1
      namespace: default
      uid: 11111111-2222-3333-4444-555555555555
  - ip: 10.244.0.12
    nodeName: node-2
    hostname: pod-2
    targetRef:
      kind: Pod
      name: my-pod-2
      namespace: default
      uid: 66666666-7777-8888-9999-000000000000
  notReadyAddresses:  # 未就绪的端点地址
  - ip: 10.244.0.13
    nodeName: node-1
    hostname: pod-3
    targetRef:
      kind: Pod
      name: my-pod-3
      namespace: default
      uid: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
  ports:
  - name: http
    port: 8080
    protocol: TCP
  - name: https
    port: 8443
    protocol: TCP
```

### 关键字段说明

| 字段 | 描述 | 示例 |
| ---- | ---- | ---- |
| `metadata.name` | Endpoint 名称，必须与 Service 同名 | `my-service` |
| `subsets` | 端点子集列表 | - |
| `subsets[].addresses` | 正常工作的端点地址列表 | `[{ip: "10.244.0.11", ...}]` |
| `subsets[].notReadyAddresses` | 未就绪的端点地址列表 | `[{ip: "10.244.0.13", ...}]` |
| `subsets[].addresses[].ip` | 端点 IP 地址 | `10.244.0.11` |
| `subsets[].addresses[].nodeName` | 端点所在节点名称 | `node-1` |
| `subsets[].addresses[].hostname` | 端点主机名 | `pod-1` |
| `subsets[].addresses[].targetRef` | 端点引用的对象 | `{kind: "Pod", name: "my-pod-1", ...}` |
| `subsets[].ports` | 端点端口列表 | `[{name: "http", port: 8080, ...}]` |
| `subsets[].ports[].name` | 端口名称 | `http` |
| `subsets[].ports[].port` | 端口号 | `8080` |
| `subsets[].ports[].protocol` | 端口协议 | `TCP` |

## 使用场景

### 1. 集群内服务发现

```yaml
# 部署应用
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: nginx
        image: nginx:1.19
        ports:
        - containerPort: 80

---
# 创建服务（自动创建 Endpoint）
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 80
```

### 2. 外部服务集成

```yaml
# 创建无选择器的服务
apiVersion: v1
kind: Service
metadata:
  name: external-db
spec:
  ports:
  - port: 3306
    targetPort: 3306

---
# 手动创建 Endpoint 指向外部数据库
apiVersion: v1
kind: Endpoints
metadata:
  name: external-db
subsets:
- addresses:
  - ip: 192.168.1.100  # 外部数据库 IP
  ports:
  - port: 3306
    protocol: TCP
```

### 3. 多端口服务

```yaml
# 多端口服务
apiVersion: v1
kind: Service
metadata:
  name: web-app
spec:
  selector:
    app: web
  ports:
  - name: http
    port: 80
    targetPort: 8080
  - name: https
    port: 443
    targetPort: 8443
  - name: metrics
    port: 9090
    targetPort: 9090

---
# 自动创建的 Endpoint
apiVersion: v1
kind: Endpoints
metadata:
  name: web-app
subsets:
- addresses:
  - ip: 10.244.0.11
  - ip: 10.244.0.12
  ports:
  - name: http
    port: 8080
    protocol: TCP
  - name: https
    port: 8443
    protocol: TCP
  - name: metrics
    port: 9090
    protocol: TCP
```

### 4. 混合云部署

```yaml
# 混合云服务
apiVersion: v1
kind: Service
metadata:
  name: hybrid-service
spec:
  ports:
  - port: 80
    targetPort: 80

---
# 混合端点（包含集群内和外部实例）
apiVersion: v1
kind: Endpoints
metadata:
  name: hybrid-service
subsets:
- addresses:
  - ip: 10.244.0.11  # 集群内 Pod
  - ip: 10.244.0.12  # 集群内 Pod
  - ip: 192.168.1.100  # 外部实例
  - ip: 192.168.1.101  # 外部实例
  ports:
  - port: 80
    protocol: TCP
```

## EndpointSlice

EndpointSlice 是 Kubernetes 1.16 引入的新资源，用于解决大规模集群中 Endpoint 资源的性能问题。

### EndpointSlice 基本配置

```yaml
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: web-service-abc
  labels:
    kubernetes.io/service-name: web-service  # 关联服务的标签
addressType: IPv4
ports:
- name: http
  protocol: TCP
  port: 80
endpoints:
- addresses:
  - "10.244.0.11"
  conditions:
    ready: true
  hostname: pod-1
  nodeName: node-1
  targetRef:
    kind: Pod
    name: web-pod-1
    namespace: default
- addresses:
  - "10.244.0.12"
  conditions:
    ready: true
  hostname: pod-2
  nodeName: node-2
  targetRef:
    kind: Pod
    name: web-pod-2
    namespace: default
```

### Endpoint vs EndpointSlice

| 特性 | Endpoint | EndpointSlice |
| ---- | ---- | ---- |
| 资源版本 | v1 | discovery.k8s.io/v1 |
| 扩展性 | 单个对象包含所有端点 | 多个切片分散端点 |
| 端点数量限制 | 无硬性限制，但有性能问题 | 每个切片默认 100 个端点 |
| 拓扑感知 | 不支持 | 支持区域和可用区信息 |
| 双栈支持 | 有限支持 | 原生支持 IPv4 和 IPv6 |
| 性能 | 大规模集群下性能较差 | 更好的性能和可扩展性 |

## 高级配置

### 1. 就绪端点和非就绪端点

```yaml
apiVersion: v1
kind: Endpoints
metadata:
  name: my-service
subsets:
- addresses:  # 就绪端点，正常接收流量
  - ip: 10.244.0.11
  - ip: 10.244.0.12
  notReadyAddresses:  # 非就绪端点，不接收流量但保留在列表中
  - ip: 10.244.0.13
  - ip: 10.244.0.14
  ports:
  - port: 8080
    protocol: TCP
```

### 2. 多子集配置

```yaml
apiVersion: v1
kind: Endpoints
metadata:
  name: multi-subset-service
subsets:
- addresses:  # 第一个子集（例如：生产环境实例）
  - ip: 10.244.0.11
  - ip: 10.244.0.12
  ports:
  - name: http
    port: 8080
    protocol: TCP
- addresses:  # 第二个子集（例如：金丝雀实例）
  - ip: 10.244.0.21
  - ip: 10.244.0.22
  ports:
  - name: http
    port: 8080
    protocol: TCP
```

### 3. 带主机名的 Endpoint

```yaml
apiVersion: v1
kind: Endpoints
metadata:
  name: hostname-service
subsets:
- addresses:
  - ip: 10.244.0.11
    hostname: web-1  # 自定义主机名
  - ip: 10.244.0.12
    hostname: web-2  # 自定义主机名
  ports:
  - port: 80
    protocol: TCP
```

### 4. 带节点名的 Endpoint

```yaml
apiVersion: v1
kind: Endpoints
metadata:
  name: node-aware-service
subsets:
- addresses:
  - ip: 10.244.0.11
    nodeName: node-1  # 指定节点名
  - ip: 10.244.0.12
    nodeName: node-2  # 指定节点名
  ports:
  - port: 80
    protocol: TCP
```

## 命令行操作

### 查看和管理 Endpoint

```bash
# 查看所有 Endpoint
kubectl get endpoints
kubectl get ep  # 简写

# 查看特定 Endpoint
kubectl get endpoints my-service

# 查看 Endpoint 详细信息
kubectl describe endpoints my-service

# 以 YAML 格式查看 Endpoint
kubectl get endpoints my-service -o yaml

# 编辑 Endpoint
kubectl edit endpoints my-service

# 删除 Endpoint
kubectl delete endpoints my-service
```

### 查看和管理 EndpointSlice

```bash
# 查看所有 EndpointSlice
kubectl get endpointslices

# 查看特定服务的 EndpointSlice
kubectl get endpointslices -l kubernetes.io/service-name=my-service

# 查看 EndpointSlice 详细信息
kubectl describe endpointslice my-service-abc

# 以 YAML 格式查看 EndpointSlice
kubectl get endpointslice my-service-abc -o yaml
```

### 调试 Endpoint

```bash
# 检查 Service 和 Endpoint 的关联
kubectl get svc,ep -o wide

# 检查 Pod 是否被选中为 Endpoint
kubectl get pods -l app=my-app -o wide

# 检查 Endpoint 控制器事件
kubectl get events --field-selector involvedObject.kind=Endpoints

# 检查 kube-proxy 日志
kubectl logs -n kube-system -l k8s-app=kube-proxy
```

## 故障排查

### 常见问题

| 问题 | 可能原因 | 解决方案 |
| ---- | ---- | ---- |
| Endpoint 为空 | 选择器未匹配到 Pod | 检查 Service 选择器和 Pod 标签 |
| 服务无法访问 | Endpoint 存在但 Pod 未就绪 | 检查 Pod 健康状态和就绪探针 |
| 外部服务无法访问 | 手动创建的 Endpoint 配置错误 | 验证 IP 地址和端口配置 |
| 流量分配不均 | kube-proxy 模式或负载均衡算法问题 | 调整 kube-proxy 配置或使用外部负载均衡器 |
| Endpoint 更新延迟 | 控制器延迟或缓存问题 | 检查控制器状态和缓存刷新设置 |

### 诊断步骤

1. **检查 Service 配置**
```bash
kubectl describe service my-service
```

2. **检查 Endpoint 配置**
```bash
kubectl describe endpoints my-service
```

3. **验证 Pod 标签**
```bash
kubectl get pods --show-labels
```

4. **检查 Pod 就绪状态**
```bash
kubectl get pods -o wide
kubectl describe pod my-pod-name
```

5. **检查网络连接**
```bash
# 从其他 Pod 测试连接
kubectl exec -it test-pod -- curl my-service:80

# 检查 DNS 解析
kubectl exec -it test-pod -- nslookup my-service
```

6. **检查 kube-proxy 配置**
```bash
kubectl -n kube-system describe configmap kube-proxy
```

## 最佳实践

### 1. 命名和标签规范

```yaml
apiVersion: v1
kind: Endpoints
metadata:
  name: my-service
  labels:
    app: my-app
    component: web
    environment: production
  annotations:
    description: "Web service endpoints"
    maintainer: "team-a"
subsets:
- addresses:
  - ip: 10.244.0.11
  - ip: 10.244.0.12
  ports:
  - port: 80
    protocol: TCP
```

### 2. 健康检查配置

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-pod
  labels:
    app: web
spec:
  containers:
  - name: nginx
    image: nginx
    ports:
    - containerPort: 80
    readinessProbe:  # 就绪探针影响 Endpoint 状态
      httpGet:
        path: /healthz
        port: 80
      initialDelaySeconds: 5
      periodSeconds: 10
    livenessProbe:  # 存活探针影响 Pod 生命周期
      httpGet:
        path: /healthz
        port: 80
      initialDelaySeconds: 15
      periodSeconds: 20
```

### 3. 外部服务集成最佳实践

```yaml
# 使用 ExternalName 服务类型（适用于基于 DNS 的外部服务）
apiVersion: v1
kind: Service
metadata:
  name: external-service-dns
spec:
  type: ExternalName
  externalName: api.example.com

---
# 使用无选择器服务 + Endpoint（适用于基于 IP 的外部服务）
apiVersion: v1
kind: Service
metadata:
  name: external-service-ip
spec:
  ports:
  - port: 80
    targetPort: 80

---
apiVersion: v1
kind: Endpoints
metadata:
  name: external-service-ip
subsets:
- addresses:
  - ip: 192.168.1.100
  - ip: 192.168.1.101
  ports:
  - port: 80
    protocol: TCP
```

### 4. 高可用性配置

```yaml
# 确保足够的副本数
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ha-web
spec:
  replicas: 3  # 至少 3 个副本
  selector:
    matchLabels:
      app: ha-web
  template:
    metadata:
      labels:
        app: ha-web
    spec:
      affinity:
        podAntiAffinity:  # 确保 Pod 分布在不同节点
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - ha-web
            topologyKey: "kubernetes.io/hostname"
      containers:
      - name: nginx
        image: nginx
        ports:
        - containerPort: 80
```

## 监控和可观测性

### 1. Prometheus 监控指标

```yaml
# Prometheus ServiceMonitor
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: endpoint-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: my-app
  endpoints:
  - port: metrics
    interval: 15s
  namespaceSelector:
    matchNames:
    - default
```

### 2. 告警规则

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: endpoint-alerts
  namespace: monitoring
spec:
  groups:
  - name: endpoint.rules
    rules:
    - alert: EndpointDown
      expr: kube_endpoint_address_available{endpoint="my-service"} < 1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Endpoint {{ $labels.endpoint }} has no available addresses"
        description: "Service {{ $labels.endpoint }} in namespace {{ $labels.namespace }} has no available endpoints for at least 5 minutes."
    
    - alert: EndpointDegraded
      expr: kube_endpoint_address_available{endpoint="my-service"} < kube_endpoint_address_not_ready{endpoint="my-service"}
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Endpoint {{ $labels.endpoint }} is degraded"
        description: "Service {{ $labels.endpoint }} in namespace {{ $labels.namespace }} has more not ready endpoints than ready endpoints."
```

### 3. 日志记录

```yaml
# 配置 kube-proxy 详细日志
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-proxy
  namespace: kube-system
data:
  config.conf: |
    apiVersion: kubeproxy.config.k8s.io/v1alpha1
    kind: KubeProxyConfiguration
    # ...
    logging:
      level: 4  # 详细日志级别
```

## 总结

Endpoint 是 Kubernetes 服务发现和负载均衡的核心组件，它将抽象的服务定义与实际的后端实例连接起来。通过合理配置和管理 Endpoint，可以实现灵活的服务发现、负载均衡和外部服务集成。

**关键要点**：
- Endpoint 存储服务后端 Pod 的 IP 地址和端口信息
- 可以自动创建（通过 Service 选择器）或手动创建（外部服务）
- EndpointSlice 是 Endpoint 的扩展版本，适用于大规模集群
- 正确配置 Endpoint 对于服务可用性和负载均衡至关重要
- 监控 Endpoint 状态可以及时发现服务问题