---
title: Kubernetes NetworkPolicy
author: Walt
date: 2026-10-20
---

# Kubernetes NetworkPolicy

NetworkPolicy 描述 Pod 在三四层允许哪些入口和出口流量。它只有在集群网络实现支持 NetworkPolicy 时才生效；API 对象创建成功不代表数据面已经执行策略。

策略是允许列表且可以叠加。一个方向一旦被任意策略选中，该方向未被允许的流量会被拒绝；允许结果是所有适用策略规则的并集，不按创建顺序覆盖。

![NetworkPolicy 同一来源项的交集与多个来源项的并集](/container/networkpolicy-selector-scope.svg)

图中比较的是目标 `orders/order-api` 的入口来源集合。它并不代替源 Pod 的出口策略：新连接还必须被源 Egress 允许，或源方向本来未被隔离。已允许连接的响应流量隐式放行，不必为每个响应再写一条反向规则。

## 先建立默认拒绝

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: orders
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
```

默认拒绝必须配套逐项允许 DNS、入口、数据库、消息系统和观测出口。直接在生产 Namespace 应用而没有连接清单，容易同时切断所有依赖。

## 允许入口服务访问订单 API

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-gateway-to-order-api
  namespace: orders
spec:
  podSelector:
    matchLabels:
      app: order-api
  policyTypes: [Ingress]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: gateway-system
          podSelector:
            matchLabels:
              app: gateway
      ports:
        - protocol: TCP
          port: 8080
```

同一个 `from` 项中的 namespaceSelector 和 podSelector 是 AND：只允许目标 Namespace 中匹配 label 的 Pod。拆成两个列表项则是 OR，含义完全不同。

例如 `gateway-system` 里有 gateway 和运维探测 Pod，`orders` 里也有一个 `app: gateway` Pod。上面的单项 AND 只选中前者中的 gateway；若拆成 `- namespaceSelector` 与 `- podSelector` 两项，就会允许 gateway-system 的所有 Pod，外加本命名空间 orders 内的 gateway Pod。单独的 podSelector 不会跨全部命名空间寻找同名标签。

## 允许 DNS 和数据库出口

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: order-api-egress
  namespace: orders
spec:
  podSelector:
    matchLabels: { app: order-api }
  policyTypes: [Egress]
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - { protocol: UDP, port: 53 }
        - { protocol: TCP, port: 53 }
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: data
          podSelector:
            matchLabels:
              app: orders-db
      ports:
        - { protocol: TCP, port: 5432 }
```

DNS labels 由发行版决定，应用前应检查实际 CoreDNS Pod。若 Pod 使用 NodeLocal DNSCache，目的地址可能是节点或链路本地地址，不能直接套用这份 CoreDNS Pod 规则。数据库端若也被入口策略隔离，还需允许 orders 的 API Pod 访问 5432；上面的出口规则只负责源端一半。

外部 SaaS 或动态 IP 依赖可能需要 CNI 扩展、出口网关或代理，标准 `ipBlock` 不适合表达域名语义。

## 边界

- 标准 NetworkPolicy 主要处理 L3/L4，不识别 HTTP 路径和用户身份。
- 它不加密流量；mTLS 属于另一层能力。
- 对 hostNetwork、节点流量、Service NAT 和云负载均衡路径的行为要按 CNI 实现验证。
- Namespace 不是自动的网络隔离边界，没有策略时 Pod 通常可以跨 Namespace 通信。
- 同时需要源端 Egress 和目标端 Ingress 允许，任一侧拒绝都会失败。
- Pod 自身回环以及所在节点到 Pod 的流量有特殊边界，不能把默认拒绝解释成拦住所有协议和全部主机流量；ICMP 等行为也需按实现验证。
- 规则最终由各节点的数据面异步执行；标准 API 不提供“所有节点均已下发”的统一就绪状态，现有连接是否立刻断开也由实现决定。

## 安全上线方式

1. 从流量观测和应用依赖清单建立基线。
2. 在测试 Namespace 应用默认拒绝和允许规则。
3. 验证启动、DNS、入口、出口、发布、扩缩和故障恢复。
4. 灰度到少量工作负载或 Namespace，并监控拒绝事件/指标。
5. 保留可快速撤销的变更和带外管理通道。

## 排障

```bash
kubectl get networkpolicy -n orders -o yaml
kubectl get pod -n orders --show-labels
kubectl get namespace --show-labels
```

使用现有且经过批准的探测 Pod 做允许与拒绝两组测试，分别记录源 namespace/标签、目标地址、端口、协议及 CNI 观测。不要直接创建一个无标签的调试 Pod 后，把它被拒绝误判为业务策略错误。测试要新建连接，并覆盖同节点、跨节点和 DNS；已有连接不断开不能证明新规则没生效。

| 现象 | 优先检查 |
| --- | --- |
| Policy 存在但仍可通信 | CNI 是否支持/启用策略、selector 是否匹配 |
| 域名不能解析 | DNS Egress 的 Namespace/Pod label 和 TCP/UDP 53 |
| 同 Namespace 正常、跨 Namespace 失败 | namespaceSelector、源 Egress、目标 Ingress |
| Service 不通但 Pod IP 通 | Service 数据面路径和 CNI 对 NAT 的处理 |
| 只在部分节点失败 | CNI agent 状态、节点规则和版本一致性 |
