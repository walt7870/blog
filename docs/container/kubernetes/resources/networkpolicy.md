# NetworkPolicy

## 概述

NetworkPolicy 是 Kubernetes 中用于控制 Pod 之间网络流量的资源对象。它提供了网络层面的安全隔离，允许管理员定义哪些 Pod 可以与其他 Pod、服务或外部端点进行通信。NetworkPolicy 是实现微分段（micro-segmentation）和零信任网络架构的重要工具。

| 关键点 | 内容 |
| ---- | ---- |
| 核心作用 | 控制 Pod 间的网络流量 |
| 安全模型 | 默认拒绝，显式允许 |
| 流量方向 | 入站（Ingress）和出站（Egress） |
| 选择器 | 基于标签选择目标 Pod |
| 依赖 | 需要支持 NetworkPolicy 的 CNI 插件 |

## NetworkPolicy 的本质

### 设计理念

* **零信任网络**：默认拒绝所有流量，只允许明确定义的通信
* **最小权限原则**：只开放必要的网络访问
* **标签驱动**：基于 Kubernetes 标签进行流量控制
* **声明式配置**：通过 YAML 声明网络策略

### 工作原理

```
NetworkPolicy 控制器
    ↓
监听 NetworkPolicy 资源变化
    ↓
解析策略规则
    ↓
CNI 插件实现
    ↓
配置网络规则（iptables/eBPF/OVS）
    ↓
执行流量过滤
```

### 流量控制模型

```
Pod A ──→ [NetworkPolicy] ──→ Pod B
         ↓
    检查规则：
    1. 是否有适用的 NetworkPolicy
    2. 源 Pod 是否匹配 podSelector
    3. 目标 Pod 是否匹配 namespaceSelector
    4. 端口是否匹配 ports 规则
    5. 协议是否匹配
```

## 基本配置

### 1. 拒绝所有入站流量

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: production
  labels:
    policy-type: security
spec:
  # 选择所有 Pod
  podSelector: {}
  
  # 定义策略类型
  policyTypes:
  - Ingress
  
  # 空的 ingress 规则 = 拒绝所有入站流量
  # ingress: []
```

### 2. 拒绝所有出站流量

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Egress
  
  # 空的 egress 规则 = 拒绝所有出站流量
  # egress: []
```

### 3. 拒绝所有流量（入站和出站）

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

### 4. 允许特定 Pod 的入站流量

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  # 选择后端 Pod
  podSelector:
    matchLabels:
      app: backend
      tier: api
  
  policyTypes:
  - Ingress
  
  ingress:
  # 允许来自前端 Pod 的流量
  - from:
    - podSelector:
        matchLabels:
          app: frontend
          tier: web
    
    # 允许的端口
    ports:
    - protocol: TCP
      port: 8080
    - protocol: TCP
      port: 8443
```

### 5. 允许特定命名空间的流量

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-monitoring
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web-server
  
  policyTypes:
  - Ingress
  
  ingress:
  # 允许来自监控命名空间的流量
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    
    ports:
    - protocol: TCP
      port: 9090  # Prometheus 指标端口
```

## 高级配置

### 1. 复杂的入站规则

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: complex-ingress-policy
  namespace: ecommerce
  labels:
    app: api-server
    security-level: high
spec:
  # 选择 API 服务器 Pod
  podSelector:
    matchLabels:
      app: api-server
      tier: backend
  
  policyTypes:
  - Ingress
  
  ingress:
  # 规则1：允许来自前端的 HTTP 流量
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    - podSelector:
        matchLabels:
          app: mobile-gateway
    
    ports:
    - protocol: TCP
      port: 8080
      endPort: 8090  # 端口范围
  
  # 规则2：允许来自监控命名空间的指标收集
  - from:
    - namespaceSelector:
        matchLabels:
          purpose: monitoring
    
    ports:
    - protocol: TCP
      port: 9090
  
  # 规则3：允许来自管理命名空间的管理流量
  - from:
    - namespaceSelector:
        matchLabels:
          name: admin
      podSelector:
        matchLabels:
          role: admin-tool
    
    ports:
    - protocol: TCP
      port: 8443
  
  # 规则4：允许来自特定 IP 范围的外部流量
  - from:
    - ipBlock:
        cidr: 10.0.0.0/8
        except:
        - 10.0.1.0/24  # 排除特定子网
        - 10.0.2.0/24
    
    ports:
    - protocol: TCP
      port: 443
```

### 2. 复杂的出站规则

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: complex-egress-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web-app
  
  policyTypes:
  - Egress
  
  egress:
  # 规则1：允许访问数据库
  - to:
    - podSelector:
        matchLabels:
          app: database
          tier: data
    
    ports:
    - protocol: TCP
      port: 5432  # PostgreSQL
    - protocol: TCP
      port: 3306  # MySQL
  
  # 规则2：允许访问缓存服务
  - to:
    - podSelector:
        matchLabels:
          app: redis
    - podSelector:
        matchLabels:
          app: memcached
    
    ports:
    - protocol: TCP
      port: 6379  # Redis
    - protocol: TCP
      port: 11211  # Memcached
  
  # 规则3：允许访问外部 API
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - 10.0.0.0/8     # 排除内网
        - 172.16.0.0/12  # 排除内网
        - 192.168.0.0/16 # 排除内网
    
    ports:
    - protocol: TCP
      port: 443  # HTTPS
    - protocol: TCP
      port: 80   # HTTP
  
  # 规则4：允许 DNS 查询
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
  
  # 规则5：允许访问 Kubernetes API
  - to:
    - ipBlock:
        cidr: 10.96.0.1/32  # Kubernetes API Server IP
    
    ports:
    - protocol: TCP
      port: 443
```

### 3. 双向流量控制

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: bidirectional-policy
  namespace: microservices
spec:
  podSelector:
    matchLabels:
      app: user-service
  
  policyTypes:
  - Ingress
  - Egress
  
  ingress:
  # 允许来自 API 网关的请求
  - from:
    - podSelector:
        matchLabels:
          app: api-gateway
    
    ports:
    - protocol: TCP
      port: 8080
  
  # 允许来自其他微服务的请求
  - from:
    - podSelector:
        matchLabels:
          tier: microservice
    
    ports:
    - protocol: TCP
      port: 8080
  
  egress:
  # 允许访问数据库
  - to:
    - podSelector:
        matchLabels:
          app: user-database
    
    ports:
    - protocol: TCP
      port: 5432
  
  # 允许调用其他微服务
  - to:
    - podSelector:
        matchLabels:
          tier: microservice
    
    ports:
    - protocol: TCP
      port: 8080
  
  # 允许 DNS 解析
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    
    ports:
    - protocol: UDP
      port: 53
```

## 实际应用场景

### 1. 多租户环境隔离

```yaml
# 租户 A 的网络策略
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: tenant-a-isolation
  namespace: tenant-a
  labels:
    tenant: tenant-a
    policy-type: isolation
spec:
  # 应用到租户 A 的所有 Pod
  podSelector: {}
  
  policyTypes:
  - Ingress
  - Egress
  
  ingress:
  # 只允许来自同一租户的流量
  - from:
    - namespaceSelector:
        matchLabels:
          tenant: tenant-a
  
  # 允许来自 Ingress Controller
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
      podSelector:
        matchLabels:
          app.kubernetes.io/name: ingress-nginx
    
    ports:
    - protocol: TCP
      port: 80
    - protocol: TCP
      port: 443
  
  egress:
  # 只允许访问同一租户的服务
  - to:
    - namespaceSelector:
        matchLabels:
          tenant: tenant-a
  
  # 允许访问共享服务（如 DNS、监控）
  - to:
    - namespaceSelector:
        matchLabels:
          shared-service: "true"
  
  # 允许访问外部服务
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - 10.0.0.0/8
    
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 80

---
# 租户 B 的网络策略（类似配置）
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: tenant-b-isolation
  namespace: tenant-b
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          tenant: tenant-b
  
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          tenant: tenant-b
  - to:
    - namespaceSelector:
        matchLabels:
          shared-service: "true"

---
# 共享服务的网络策略
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: shared-service-policy
  namespace: shared-services
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  
  ingress:
  # 允许所有租户访问
  - from:
    - namespaceSelector:
        matchExpressions:
        - key: tenant
          operator: Exists
```

### 2. 微服务架构的网络分段

```yaml
# Web 层网络策略
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: web-tier-policy
  namespace: ecommerce
spec:
  podSelector:
    matchLabels:
      tier: web
  
  policyTypes:
  - Ingress
  - Egress
  
  ingress:
  # 允许来自 Ingress Controller 的流量
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    
    ports:
    - protocol: TCP
      port: 80
    - protocol: TCP
      port: 443
  
  # 允许来自负载均衡器的健康检查
  - from:
    - ipBlock:
        cidr: 10.0.100.0/24  # LB 子网
    
    ports:
    - protocol: TCP
      port: 8080
  
  egress:
  # 只允许访问应用层
  - to:
    - podSelector:
        matchLabels:
          tier: app
    
    ports:
    - protocol: TCP
      port: 8080
  
  # 允许 DNS 解析
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    
    ports:
    - protocol: UDP
      port: 53

---
# 应用层网络策略
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: app-tier-policy
  namespace: ecommerce
spec:
  podSelector:
    matchLabels:
      tier: app
  
  policyTypes:
  - Ingress
  - Egress
  
  ingress:
  # 只允许来自 Web 层的流量
  - from:
    - podSelector:
        matchLabels:
          tier: web
    
    ports:
    - protocol: TCP
      port: 8080
  
  # 允许来自同一层的微服务间通信
  - from:
    - podSelector:
        matchLabels:
          tier: app
    
    ports:
    - protocol: TCP
      port: 8080
  
  egress:
  # 允许访问数据层
  - to:
    - podSelector:
        matchLabels:
          tier: data
    
    ports:
    - protocol: TCP
      port: 5432  # PostgreSQL
    - protocol: TCP
      port: 6379  # Redis
  
  # 允许访问外部 API
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - 10.0.0.0/8
    
    ports:
    - protocol: TCP
      port: 443
  
  # 允许 DNS 解析
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    
    ports:
    - protocol: UDP
      port: 53

---
# 数据层网络策略
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: data-tier-policy
  namespace: ecommerce
spec:
  podSelector:
    matchLabels:
      tier: data
  
  policyTypes:
  - Ingress
  - Egress
  
  ingress:
  # 只允许来自应用层的流量
  - from:
    - podSelector:
        matchLabels:
          tier: app
    
    ports:
    - protocol: TCP
      port: 5432
    - protocol: TCP
      port: 6379
  
  # 允许来自备份服务的流量
  - from:
    - namespaceSelector:
        matchLabels:
          name: backup
      podSelector:
        matchLabels:
          app: backup-agent
    
    ports:
    - protocol: TCP
      port: 5432
  
  egress:
  # 数据层通常不需要出站流量，除了 DNS
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    
    ports:
    - protocol: UDP
      port: 53
  
  # 允许数据库集群间通信
  - to:
    - podSelector:
        matchLabels:
          tier: data
          app: postgresql
    
    ports:
    - protocol: TCP
      port: 5432
```

### 3. 开发环境的网络策略

```yaml
# 开发环境：相对宽松的策略
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: development-policy
  namespace: development
  labels:
    environment: development
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  
  ingress:
  # 允许来自开发者的直接访问
  - from:
    - ipBlock:
        cidr: 192.168.1.0/24  # 开发者网络
  
  # 允许同一命名空间内的所有通信
  - from:
    - namespaceSelector:
        matchLabels:
          name: development
  
  # 允许来自监控和日志系统
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
  
  egress:
  # 允许访问所有外部服务（开发需要）
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
  
  # 允许访问共享服务
  - to:
    - namespaceSelector:
        matchLabels:
          shared-service: "true"

---
# 生产环境：严格的策略
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: production-strict-policy
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  
  ingress:
  # 只允许来自 Ingress Controller
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
  
  # 允许来自监控系统
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    
    ports:
    - protocol: TCP
      port: 9090
  
  egress:
  # 严格控制出站流量
  - to:
    - namespaceSelector:
        matchLabels:
          name: production
  
  # 只允许访问必要的外部服务
  - to:
    - ipBlock:
        cidr: 203.0.113.0/24  # 特定的外部 API
    
    ports:
    - protocol: TCP
      port: 443
  
  # DNS 解析
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    
    ports:
    - protocol: UDP
      port: 53
```

## 命令行操作

### 基本操作

```bash
# 创建 NetworkPolicy
kubectl apply -f networkpolicy.yaml

# 查看 NetworkPolicy
kubectl get networkpolicy
kubectl get netpol  # 简写

# 查看特定命名空间的 NetworkPolicy
kubectl get networkpolicy -n production

# 查看 NetworkPolicy 详情
kubectl describe networkpolicy deny-all -n production

# 查看 NetworkPolicy 的 YAML
kubectl get networkpolicy deny-all -o yaml
```

### 使用标签查询

```bash
# 查看带有特定标签的 NetworkPolicy
kubectl get networkpolicy -l policy-type=security

# 查看所有命名空间的 NetworkPolicy
kubectl get networkpolicy --all-namespaces

# 按标签选择器查看
kubectl get networkpolicy --selector=app=web-server
```

### 调试和测试

```bash
# 测试网络连通性
kubectl run test-pod --image=busybox --rm -it --restart=Never -- /bin/sh

# 在测试 Pod 中测试连接
wget -qO- --timeout=2 http://target-service:8080
nc -zv target-service 8080
ping target-service

# 查看 Pod 的标签（用于调试策略匹配）
kubectl get pods --show-labels

# 查看命名空间的标签
kubectl get namespaces --show-labels

# 检查 CNI 插件是否支持 NetworkPolicy
kubectl get nodes -o wide
kubectl describe node <node-name> | grep -i network
```

### 策略管理

```bash
# 更新 NetworkPolicy
kubectl apply -f updated-networkpolicy.yaml

# 删除 NetworkPolicy
kubectl delete networkpolicy deny-all -n production

# 批量删除
kubectl delete networkpolicy -l policy-type=temporary

# 导出现有策略
kubectl get networkpolicy deny-all -o yaml > backup-policy.yaml
```

## 故障排查

### 常见问题

| 问题 | 可能原因 | 解决方案 |
| ---- | ---- | ---- |
| NetworkPolicy 不生效 | CNI 插件不支持 | 使用支持的 CNI（Calico、Cilium 等） |
| 流量被意外阻止 | 策略规则过于严格 | 检查 podSelector 和规则匹配 |
| 无法访问 DNS | 缺少 DNS 出站规则 | 添加 kube-dns 的出站规则 |
| 服务间通信失败 | 标签选择器错误 | 验证 Pod 和命名空间标签 |
| 外部访问被阻止 | 缺少 ipBlock 规则 | 添加适当的 IP 范围规则 |

### 诊断步骤

1. **检查 CNI 插件支持**
```bash
# 检查当前 CNI 插件
kubectl get nodes -o wide
kubectl get pods -n kube-system | grep -E "calico|cilium|weave|flannel"

# 检查 NetworkPolicy 功能
kubectl api-resources | grep networkpolicy
```

2. **验证策略配置**
```bash
# 检查策略是否正确应用
kubectl get networkpolicy -A
kubectl describe networkpolicy <policy-name> -n <namespace>

# 检查目标 Pod 的标签
kubectl get pods -l app=web-server --show-labels
```

3. **测试网络连通性**
```bash
# 创建测试 Pod
kubectl run debug-pod --image=nicolaka/netshoot --rm -it --restart=Never

# 在测试 Pod 中执行网络测试
nslookup kubernetes.default.svc.cluster.local
telnet target-service 8080
curl -v http://target-service:8080/health
```

4. **检查日志**
```bash
# 检查 CNI 插件日志
kubectl logs -n kube-system -l k8s-app=calico-node
kubectl logs -n kube-system -l k8s-app=cilium

# 检查 kube-proxy 日志
kubectl logs -n kube-system -l k8s-app=kube-proxy
```

### 调试工具和技巧

```bash
# 使用 netshoot 进行网络调试
kubectl run netshoot --rm -i --tty --image nicolaka/netshoot

# 在 netshoot 中可用的工具：
# - nslookup, dig: DNS 测试
# - telnet, nc: 端口连通性测试
# - curl, wget: HTTP 测试
# - tcpdump: 网络包捕获
# - iperf3: 网络性能测试

# 示例调试命令
nslookup web-service.production.svc.cluster.local
telnet web-service.production.svc.cluster.local 80
curl -v http://web-service.production.svc.cluster.local/
tcpdump -i any host web-service.production.svc.cluster.local
```

## 最佳实践

### 1. 安全配置最佳实践

```yaml
# 1. 默认拒绝策略（每个命名空间都应该有）
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress

---
# 2. 允许必要的系统流量
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-system-traffic
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Egress
  
  egress:
  # 允许 DNS 解析
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
  
  # 允许访问 Kubernetes API
  - to:
    - ipBlock:
        cidr: 10.96.0.1/32  # API Server IP
    
    ports:
    - protocol: TCP
      port: 443

---
# 3. 分层的网络策略
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: web-tier-specific
  namespace: production
spec:
  podSelector:
    matchLabels:
      tier: web
  
  policyTypes:
  - Ingress
  - Egress
  
  ingress:
  # 只允许来自 Ingress Controller
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    
    ports:
    - protocol: TCP
      port: 8080
  
  egress:
  # 只允许访问应用层
  - to:
    - podSelector:
        matchLabels:
          tier: app
    
    ports:
    - protocol: TCP
      port: 8080
```

### 2. 标签和选择器最佳实践

```yaml
# 使用一致的标签策略
apiVersion: v1
kind: Pod
metadata:
  name: web-server
  labels:
    # 应用标识
    app: web-server
    version: v1.2.3
    
    # 架构层次
    tier: web
    component: frontend
    
    # 环境和团队
    environment: production
    team: platform
    
    # 安全级别
    security-level: high
    data-classification: internal
    
    # 网络策略相关
    network-policy: web-tier
    ingress-allowed: "true"
    egress-restricted: "true"

---
# 基于标签的精确策略
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: precise-web-policy
spec:
  podSelector:
    matchLabels:
      tier: web
      security-level: high
  
  policyTypes:
  - Ingress
  - Egress
  
  ingress:
  - from:
    - podSelector:
        matchLabels:
          component: load-balancer
          security-level: high
    
    ports:
    - protocol: TCP
      port: 8080
  
  egress:
  - to:
    - podSelector:
        matchLabels:
          tier: app
          security-level: high
    
    ports:
    - protocol: TCP
      port: 8080
```

### 3. 监控和审计

```yaml
# Prometheus 监控规则
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: networkpolicy-monitoring
  namespace: monitoring
spec:
  groups:
  - name: networkpolicy.rules
    rules:
    # 监控 NetworkPolicy 数量
    - record: kubernetes:networkpolicy:count
      expr: count(kube_networkpolicy_info)
    
    # 监控被拒绝的连接
    - alert: NetworkPolicyDeniedConnections
      expr: increase(cilium_drop_count_total[5m]) > 100
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "High number of denied network connections"
        description: "{{ $value }} connections have been denied in the last 5 minutes"
    
    # 监控 NetworkPolicy 变更
    - alert: NetworkPolicyChanged
      expr: increase(kube_networkpolicy_created[1h]) > 0
      for: 0m
      labels:
        severity: info
      annotations:
        summary: "NetworkPolicy has been created or modified"
        description: "A NetworkPolicy has been created or modified in the last hour"

---
# 审计策略配置
apiVersion: v1
kind: ConfigMap
metadata:
  name: audit-policy
  namespace: kube-system
data:
  audit-policy.yaml: |
    apiVersion: audit.k8s.io/v1
    kind: Policy
    rules:
    # 审计 NetworkPolicy 的所有操作
    - level: Metadata
      resources:
      - group: "networking.k8s.io"
        resources: ["networkpolicies"]
      verbs: ["create", "update", "patch", "delete"]
    
    # 审计 Pod 的网络相关操作
    - level: Request
      resources:
      - group: ""
        resources: ["pods"]
      verbs: ["create", "update", "patch"]
      namespaces: ["production", "staging"]
```

### 4. 测试和验证

```bash
#!/bin/bash
# NetworkPolicy 测试脚本

set -e

NAMESPACE="test-networkpolicy"
TEST_APP="test-app"

echo "=== NetworkPolicy 测试开始 ==="

# 1. 创建测试命名空间
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
kubectl label namespace $NAMESPACE test=networkpolicy

# 2. 部署测试应用
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $TEST_APP
  namespace: $NAMESPACE
spec:
  replicas: 2
  selector:
    matchLabels:
      app: $TEST_APP
  template:
    metadata:
      labels:
        app: $TEST_APP
        tier: web
    spec:
      containers:
      - name: web
        image: nginx:alpine
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: $TEST_APP-service
  namespace: $NAMESPACE
spec:
  selector:
    app: $TEST_APP
  ports:
  - port: 80
    targetPort: 80
EOF

# 3. 等待 Pod 就绪
kubectl wait --for=condition=ready pod -l app=$TEST_APP -n $NAMESPACE --timeout=60s

# 4. 测试初始连通性（应该可以访问）
echo "测试初始连通性..."
kubectl run test-client --image=busybox --rm -it --restart=Never -n $NAMESPACE -- wget -qO- --timeout=5 http://$TEST_APP-service

# 5. 应用拒绝所有流量的 NetworkPolicy
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: $NAMESPACE
spec:
  podSelector: {}
  policyTypes:
  - Ingress
EOF

# 6. 测试连通性（应该被拒绝）
echo "测试拒绝策略..."
if kubectl run test-client-2 --image=busybox --rm -it --restart=Never -n $NAMESPACE -- wget -qO- --timeout=5 http://$TEST_APP-service 2>/dev/null; then
  echo "错误：流量应该被拒绝"
  exit 1
else
  echo "正确：流量被拒绝"
fi

# 7. 应用允许特定流量的 NetworkPolicy
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-test-client
  namespace: $NAMESPACE
spec:
  podSelector:
    matchLabels:
      app: $TEST_APP
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          role: test-client
    ports:
    - protocol: TCP
      port: 80
EOF

# 8. 使用正确标签的客户端测试（应该可以访问）
echo "测试允许策略..."
kubectl run test-client-3 --image=busybox --rm -it --restart=Never -n $NAMESPACE --labels="role=test-client" -- wget -qO- --timeout=5 http://$TEST_APP-service

# 9. 清理
echo "清理测试资源..."
kubectl delete namespace $NAMESPACE

echo "=== NetworkPolicy 测试完成 ==="
```

## 总结

NetworkPolicy 是 Kubernetes 中实现网络安全的重要工具，它提供了细粒度的流量控制能力，是构建零信任网络架构的基础。

**关键要点**：
- NetworkPolicy 需要支持的 CNI 插件才能生效
- 采用默认拒绝、显式允许的安全模型
- 基于标签选择器进行流量控制
- 支持入站和出站流量的精确控制
- 需要合理的标签策略和监控审计机制
- 在生产环境中应该分层实施网络策略