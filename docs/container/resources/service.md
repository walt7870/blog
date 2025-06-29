# Service

## 概述

Service 是 Kubernetes 中用于暴露应用服务的抽象层，为一组 Pod 提供稳定的网络访问入口和负载均衡。

| 关键点 | 内容 |
| ---- | ---- |
| 核心作用 | 提供 Pod 的稳定访问入口和负载均衡 |
| 选择机制 | 通过标签选择器选择后端 Pod |
| 网络抽象 | 提供虚拟 IP 和 DNS 名称 |
| 服务发现 | 支持 DNS 和环境变量服务发现 |

## Service 的本质

### 设计理念

* **服务抽象**：将动态变化的 Pod 集合抽象为稳定的服务端点
* **负载均衡**：在多个 Pod 实例间分发流量
* **服务发现**：提供 DNS 名称和虚拟 IP 用于服务发现
* **解耦架构**：分离服务消费者和提供者，支持微服务架构

### 工作原理

```

## 高级配置

### 会话保持（Session Affinity）

```yaml
apiVersion: v1
kind: Service
metadata:
  name: session-affinity-service
spec:
  selector:
    app: my-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800  # 3小时
```

### 多端口服务

```yaml
apiVersion: v1
kind: Service
metadata:
  name: multi-port-service
spec:
  selector:
    app: my-app
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 8080
    - name: https
      protocol: TCP
      port: 443
      targetPort: 8443
    - name: metrics
      protocol: TCP
      port: 9090
      targetPort: 9090
```

### 外部 IP 配置

```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-ip-service
spec:
  selector:
    app: my-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  externalIPs:
    - 192.168.1.100
    - 192.168.1.101
```

### 健康检查配置

```yaml
apiVersion: v1
kind: Service
metadata:
  name: health-check-service
spec:
  selector:
    app: my-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  # 配合 Endpoint 健康检查
  publishNotReadyAddresses: false  # 默认值，不发布未就绪的地址
```

## 服务发现

### DNS 服务发现

**完整 DNS 名称格式**：
```
<service-name>.<namespace>.svc.<cluster-domain>
```

**示例**：
```bash
# 同命名空间内访问
curl http://my-service:80

# 跨命名空间访问
curl http://my-service.production.svc.cluster.local:80

# 简化访问（同命名空间）
curl http://my-service
```

### 环境变量服务发现

Kubernetes 会为每个 Service 创建环境变量：

```bash
# 对于名为 my-service 的服务
MY_SERVICE_SERVICE_HOST=10.0.0.1
MY_SERVICE_SERVICE_PORT=80
MY_SERVICE_PORT=tcp://10.0.0.1:80
MY_SERVICE_PORT_80_TCP=tcp://10.0.0.1:80
MY_SERVICE_PORT_80_TCP_PROTO=tcp
MY_SERVICE_PORT_80_TCP_PORT=80
MY_SERVICE_PORT_80_TCP_ADDR=10.0.0.1
```

## Endpoint 管理

### 查看 Endpoint

```bash
# 查看 Service 对应的 Endpoint
kubectl get endpoints my-service

# 详细信息
kubectl describe endpoints my-service
```

### 手动管理 Endpoint

```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-service
spec:
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
# 注意：没有 selector

---
apiVersion: v1
kind: Endpoints
metadata:
  name: external-service  # 必须与 Service 名称相同
subsets:
  - addresses:
      - ip: 192.168.1.100
      - ip: 192.168.1.101
    ports:
      - port: 80
        protocol: TCP
```

## 监控和调试

### 常用命令

```bash
# 查看 Service 列表
kubectl get services

# 查看 Service 详细信息
kubectl describe service my-service

# 查看 Service 的 Endpoint
kubectl get endpoints my-service

# 查看 kube-proxy 日志
kubectl logs -n kube-system -l k8s-app=kube-proxy

# 测试服务连通性
kubectl run test-pod --image=busybox --rm -it -- /bin/sh
# 在 Pod 内执行
wget -qO- http://my-service:80
```

### 网络调试

```bash
# 查看 iptables 规则（iptables 模式）
sudo iptables -t nat -L KUBE-SERVICES

# 查看 IPVS 规则（ipvs 模式）
sudo ipvsadm -Ln

# 查看 Service 的 ClusterIP
kubectl get service my-service -o jsonpath='{.spec.clusterIP}'

# 端口转发测试
kubectl port-forward service/my-service 8080:80
```

## 故障排查

### 常见问题

| 问题 | 可能原因 | 解决方案 |
| ---- | ---- | ---- |
| Service 无法访问 | 标签选择器不匹配 | 检查 Service selector 和 Pod labels |
| 连接超时 | Pod 未就绪 | 检查 Pod 状态和健康检查 |
| 负载不均衡 | kube-proxy 配置问题 | 检查 kube-proxy 模式和配置 |
| DNS 解析失败 | CoreDNS 问题 | 检查 CoreDNS Pod 状态 |
| 外部访问失败 | 防火墙或网络策略 | 检查网络策略和防火墙规则 |

### 诊断步骤

1. **检查 Service 配置**
```bash
kubectl describe service my-service
```

2. **检查 Endpoint**
```bash
kubectl get endpoints my-service
```

3. **检查 Pod 标签**
```bash
kubectl get pods --show-labels
```

4. **测试网络连通性**
```bash
# 从集群内测试
kubectl run debug --image=busybox --rm -it -- /bin/sh
telnet my-service 80
```

5. **检查 kube-proxy**
```bash
kubectl get pods -n kube-system -l k8s-app=kube-proxy
kubectl logs -n kube-system -l k8s-app=kube-proxy
```

## 性能优化

### 选择合适的代理模式

```yaml
# kube-proxy 配置
apiVersion: kubeproxy.config.k8s.io/v1alpha1
kind: KubeProxyConfiguration
mode: "ipvs"  # 推荐使用 ipvs
ipvs:
  scheduler: "rr"  # 轮询调度
  strictARP: true
```

### 会话保持优化

```yaml
apiVersion: v1
kind: Service
metadata:
  name: optimized-service
spec:
  selector:
    app: my-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  # 根据需要选择会话保持策略
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600  # 1小时，根据业务需求调整
```

### 减少网络跳转

```yaml
apiVersion: v1
kind: Service
metadata:
  name: local-traffic-service
  annotations:
    service.kubernetes.io/topology-aware-hints: auto
spec:
  selector:
    app: my-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  # 优先路由到本地节点的 Pod
  externalTrafficPolicy: Local  # 仅对 NodePort 和 LoadBalancer 有效
  internalTrafficPolicy: Local   # Kubernetes 1.22+
```

## 最佳实践

### 1. 命名规范

```yaml
# 推荐的命名方式
metadata:
  name: frontend-web-service      # 描述性名称
  labels:
    app: frontend
    component: web
    version: v1.0
  annotations:
    description: "Frontend web service for user interface"
```

### 2. 标签选择器设计

```yaml
# 精确的标签选择
spec:
  selector:
    app: my-app
    version: v1.0
    environment: production
```

### 3. 端口配置

```yaml
spec:
  ports:
    - name: http          # 为端口命名
      protocol: TCP
      port: 80           # Service 端口
      targetPort: http   # 使用容器端口名称
    - name: metrics
      protocol: TCP
      port: 9090
      targetPort: 9090
```

### 4. 安全配置

```yaml
metadata:
  annotations:
    # 限制访问来源
    service.beta.kubernetes.io/load-balancer-source-ranges: "10.0.0.0/8,172.16.0.0/12"
spec:
  # 仅内部访问
  type: ClusterIP
  # 或使用网络策略进一步限制
```

### 5. 监控集成

```yaml
metadata:
  labels:
    app: my-app
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9090"
    prometheus.io/path: "/metrics"
spec:
  ports:
    - name: web
      port: 80
      targetPort: 8080
    - name: metrics
      port: 9090
      targetPort: 9090
```

## 总结

Service 是 Kubernetes 网络架构的核心组件，提供了稳定的服务发现和负载均衡能力。通过合理选择 Service 类型、配置代理模式和优化网络策略，可以构建高性能、高可用的微服务架构。

**关键要点**：
- 根据访问需求选择合适的 Service 类型
- 在大规模集群中优先使用 IPVS 代理模式
- 合理配置会话保持和流量策略
- 建立完善的监控和故障排查机制
- 遵循安全和性能最佳实践
客户端请求 → Service (虚拟IP) → kube-proxy → 后端Pod
                ↓
            标签选择器匹配
                ↓
        Pod1, Pod2, Pod3...
```

## Service 类型详解

| 类型 | 功能 | 使用场景 | 访问方式 |
| ---- | ---- | ---- | ---- |
| `ClusterIP`（默认） | 仅集群内部可访问 | 微服务间调用 | ClusterIP:Port |
| `NodePort` | 将服务暴露在每个 Node 的某个端口上 | 集群外部通过 Node IP + 端口访问 | NodeIP:NodePort |
| `LoadBalancer` | 通过云提供商分配一个公网负载均衡 IP | 公网服务，如 API 接口 | LoadBalancerIP:Port |
| `ExternalName` | 将服务映射为 DNS 名称 | 接入外部服务，如 `mysql.example.com` | DNS CNAME 记录 |
| `Headless Service` | DNS 显示所有 Pod IP，提供直连能力 | 需要感知 Pod 实例，比如 StatefulSet、数据库等 | 直接访问 Pod IP |

### 1. ClusterIP Service

**特点**：
- 默认类型，仅集群内部可访问
- 分配一个集群内部的虚拟 IP
- 通过 kube-proxy 实现负载均衡

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  selector:
    app: my-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: ClusterIP
```

### 2. NodePort Service

**特点**：
- 在每个节点上开放一个端口（30000-32767）
- 外部可通过 `<NodeIP>:<NodePort>` 访问
- 自动创建 ClusterIP

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-nodeport-service
spec:
  selector:
    app: my-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
      nodePort: 30080
  type: NodePort
```

### 3. LoadBalancer Service

**特点**：
- 需要云提供商支持
- 自动创建外部负载均衡器
- 分配公网 IP 地址

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-loadbalancer-service
spec:
  selector:
    app: my-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: LoadBalancer
```

### 4. ExternalName Service

**特点**：
- 将服务映射到外部 DNS 名称
- 不创建 ClusterIP
- 返回 CNAME 记录

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-external-service
spec:
  type: ExternalName
  externalName: database.example.com
```

### 5. Headless Service

**特点**：
- 设置 `clusterIP: None`
- DNS 查询返回所有 Pod IP
- 用于有状态服务

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-headless-service
spec:
  clusterIP: None
  selector:
    app: my-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
```

## 完整配置示例

### Deployment + Service 示例

```yaml
# Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: web
        image: nginx
        ports:
        - containerPort: 80

---
# Service
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  type: ClusterIP
  selector:
    app: my-app
  ports:
  - port: 80        # Service 暴露的端口
    targetPort: 80  # Pod 内部容器的端口

```

**效果：**
自动创建一个虚拟 IP（ClusterIP）

所有访问 my-service:80 的流量被转发到匹配标签 app: my-app 的 Pod 中

## Service 的核心机制

### 服务发现

Service 在集群内注册为一个 DNS 名称

比如：my-service.default.svc.cluster.local

Pod 之间可通过 DNS 名称互相访问

### 负载均衡

kube-proxy 在每个节点上运行，维护 iptables 或 IPVS 规则

访问 Service IP 时，会被转发到后端某个 Pod

默认使用 轮询策略

### 机制

| 模式          | 使用方式       | 实现机制                   | 性能 | 说明        |
| ----------- | ---------- | ---------------------- | -- | --------- |
| `userspace` | 已淘汰        | kube-proxy 接收请求、转发     | 低  | 早期方案，不再推荐 |
| `iptables`  | 默认方式（较早版本） | 利用内核 iptables NAT 转发规则 | 中  | 规则多时维护开销大 |
| `ipvs`      | 推荐方式（现代部署） | 使用 Linux 内核 IPVS 模块    | 高  | 性能更强、维护高效 |

#### iptables 模式详解

##### 工作机制

1. kube-proxy 监听 Service 和 Endpoint 的变化

2. 为每个 Service 创建一条 iptables DNAT 规则

3. 为每个 Endpoint 创建 随机轮询跳转规则

##### 示例（简化）

```shell
# 访问 10.0.0.1:80 会被重定向到某个 Pod 的 IP:80
-A KUBE-SERVICES -d 10.0.0.1/32 --dport 80 -j KUBE-SVC-ABCDE

# KUBE-SVC-ABCDE 链会使用随机策略跳转到真实后端 Pod
-A KUBE-SVC-ABCDE -j KUBE-SEP-1111
-A KUBE-SVC-ABCDE -j KUBE-SEP-2222

# KUBE-SEP-1111 跳转到实际 Pod IP
-A KUBE-SEP-1111 -s 172.17.0.2/32 -j DNAT --to-destination 172.17.0.2:80
```

##### 特点

* 所有规则都写死在 iptables 中

* Pod 变动时需要重建规则 → 多 Pod 时效率下降

* 使用 随机轮询（不支持加权）

#### IPVS 模式详解（推荐）

IPVS（IP Virtual Server）是 Linux 内核提供的高性能负载均衡技术。

开启,kube-proxy 启动参数包含：

```shell
--proxy-mode=ipvs
```

节点需要安装内核模块:

```shell
modprobe ip_vs
modprobe ip_vs_rr
modprobe ip_vs_wrr
modprobe ip_vs_sh

```

##### 工作流程

1. kube-proxy 将 Service/Endpoint 转换为 ipvsadm 规则

2. 系统调用内核级别 IPVS 实现负载均衡

3. 每个 Service 变为一个虚拟服务（Virtual Server）

4. 每个 Pod 成为一个真实服务（Real Server）

##### 示例（使用 ipvsadm -Ln 查看）

```nginx
TCP  10.0.0.1:80 rr
  -> 172.17.0.2:80            Masq    1      0          0
  -> 172.17.0.3:80            Masq    1      0          0

```

* rr：轮询（Round Robin）策略

* Masq：使用 NAT 转发方式（Masquerade）

##### 核心特点

1. 内核实现，高性能、低延迟

2. 支持更多调度策略（见下方）

3. 即时响应 Pod 变更，效率高

#### IPVS 支持的调度算法（调度策略）

| 策略名称                       | 含义                        |
| -------------------------- | ------------------------- |
| `rr` (Round Robin)         | 轮询，默认策略                   |
| `wrr` (Weighted RR)        | 加权轮询，支持不同权重               |
| `lc` (Least Connection)    | 最少连接数                     |
| `wlc` (Weighted LC)        | 加权最少连接数                   |
| `sh` (Source Hashing)      | 基于源IP做一致性哈希，用于 session 粘性 |
| `dh` (Destination Hashing) | 基于目标IP做一致性哈希              |

#### 性能与对比分析

| 项目       | iptables      | ipvs       |
| -------- | ------------- | ---------- |
| 实现方式     | 用户空间维护规则，内核转发 | 全部内核态实现    |
| 规则数量大时效率 | 随着 Pod 增多性能下降 | 规则查找稳定高效   |
| 调度策略     | 仅支持轮询         | 多种高效调度算法   |
| 响应变化速度   | 规则重建延迟大       | 快速生效       |
| 推荐程度     | 中等（兼容性好）      | 高（大规模集群首选） |

#### 选择建议

| 场景               | 推荐模式            |
| ---------------- | --------------- |
| 小规模开发环境          | `iptables`（易部署） |
| 中大型生产环境          | `ipvs`（高性能）     |
| 对连接追踪依赖强         | `iptables`      |
| 希望高并发、快速切换后端 Pod | `ipvs`          |

#### 常见问题排查

| 问题             | 排查方法                          |
| -------------- | ----------------------------- |
| Service IP 不通  | `kubectl get endpoints` 看是否为空 |
| kube-proxy 不工作 | 查看 `kube-proxy` Pod 日志        |
| ipvs 模式不生效     | 检查内核模块是否加载成功                  |
| 转发不均衡          | 检查是否启用 `sessionAffinity`      |
| 规则过多导致变慢       | 考虑切换为 IPVS 模式                 |

### Session Affinity（会话保持）

Kubernetes 通过 Service 实现负载均衡。默认情况下，请求被随机分配到后端 Pod。但启用 SessionAffinity 后，会根据 客户端 IP 地址 绑定目标 Pod。

#### 开启配置

```yaml
spec:
  sessionAffinity: ClientIP  # 同一个客户端访问保持连接到同一个 Pod

```

#### 使用场景

| 场景                   | 是否推荐启用会话保持          |
| -------------------- | ------------------- |
| 登录状态保存在 Pod          | ✅ 是                 |
| 视频会议系统               | ✅ 是                 |
| 无状态 Web 接口（REST API） | ❌ 否                 |
| 依赖 Cookie 的轻会话（JWT）  | ❌ 否（推荐使用 Cookie 识别） |

#### 注意事项

| 项目      | 说明                                                     |
| ------- | ------------------------------------------------------ |
| 粒度      | 基于 **客户端 IP 地址**，不支持 Cookie 或 Header                   |
| 节点间共享   | 各 Node 的 kube-proxy 独立维护映射，跨 Node 效果可能不一致（iptables 模式） |
| 超时不可忽略  | 过期后会重新负载均衡，可能“粘性失效”                                    |
| IPVS 优势 | IPVS 模式下更高效，天然支持会话表维护                                  |
| 配置范围    | `SessionAffinity` 是 Service 层的配置，对 Pod 本身无感知           |

#### 对比

| 机制                                  | 粘性依据           | 可配置性          | 说明               |
| ----------------------------------- | -------------- | ------------- | ---------------- |
| `SessionAffinity: ClientIP`         | 客户端 IP         | 支持 timeout 设置 | 最常见              |
| Ingress Cookie-based Sticky Session | Cookie         | 灵活（支持多个路由规则）  | 适用于 HTTP         |
| Web 应用自行实现粘性                        | Token / Header | 高度可控          | 服务逻辑实现，适用于复杂路由需求 |

### Headless Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-db
spec:
  clusterIP: None
  selector:
    app: my-db
  ports:
    - port: 5432
```

**说明：**

* 不分配 ClusterIP

* DNS 解析返回所有 Pod 的 IP 地址

* 用于客户端需要直接访问某个 Pod 的场景，如：

  * StatefulSet（有序部署、主从数据库）

  * Kafka、Zookeeper 等需要节点感知的系统

### Service 与 Ingress 的关系

* Service 是基础网络单元

* Ingress 是用于 HTTP/HTTPS 七层反向代理的入口控制器

* Ingress 通常转发请求到一个或多个 Service，进行统一的 URL 路由、TLS 终结等处理

### 常用命令

```shell
# 查看所有服务
kubectl get svc

# 查看服务详情
kubectl describe svc my-service

# 测试服务连接
kubectl run test --rm -it --image=busybox -- /bin/sh
> wget my-service:80

# 查看kube-proxy模式
kubectl get pod -n kube-system -l k8s-app=kube-proxy -o yaml | grep mode

```

### 典型问题与注意事项

| 问题              | 原因             | 解决方案                                           |
| --------------- | -------------- | ---------------------------------------------- |
| 无法访问 Service    | 标签选择器未匹配到 Pod  | 检查 Deployment 与 Service 的 labels/selector 是否一致 |
| Service 无响应     | Pod 没有监听端口或没就绪 | 查看 Pod 状态，确认端口和 readiness probe                |
| NodePort 无法外部访问 | 节点防火墙或安全组限制    | 检查防火墙规则、云平台安全组                                 |
