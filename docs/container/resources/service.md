# Service

## 本质

* Service 是一个 Kubernetes 资源对象（Service）

* 提供一个 虚拟IP（ClusterIP），用于访问后端动态变化的 Pod 集合

* 通过标签选择器（Label Selector） 选择要转发的目标 Pod

## 作用

* 提供 Pod 访问的 统一入口

* 解耦服务消费者与服务提供者

* 提供负载均衡（基于 kube-proxy）

* 实现跨节点服务访问

## 概述
  
| 关键点  | 内容                                           |
| ---- | -------------------------------------------- |
| 核心作用 | 提供 Pod 的稳定访问入口                               |
| 构成机制 | label selector + kube-proxy 负载均衡             |
| 类型选择 | ClusterIP（默认）、NodePort、LoadBalancer、Headless |
| 重要补充 | DNS 服务发现、会话保持、Ingress 配合                     |

## Service 的类型详解

| 类型                             | 功能                     | 使用场景                            |
| ------------------------------ | ---------------------- | ------------------------------- |
| `ClusterIP`（默认）                | 仅集群内部可访问               | 微服务间调用                          |
| `NodePort`                     | 将服务暴露在每个 Node 的某个端口上   | 集群外部通过 Node IP + 端口访问           |
| `LoadBalancer`                 | 通过云提供商分配一个公网负载均衡 IP    | 公网服务，如 API 接口                   |
| `ExternalName`                 | 将服务映射为 DNS 名称          | 接入外部服务，如 `mysql.example.com`    |
| `Headless Service`（无ClusterIP） | DNS 显示所有 Pod IP，提供直连能力 | 需要感知 Pod 实例，比如 StatefulSet、数据库等 |

## 典型示例：ClusterIP Service

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
