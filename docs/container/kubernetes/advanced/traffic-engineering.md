---
title: Kubernetes 流量工程：Gateway、Cilium 与 Service Mesh
author: Walt
date: 2026-07-18
---

# Kubernetes 流量工程：Gateway、Cilium 与 Service Mesh

Gateway API、eBPF 数据面和 Service Mesh 分别解决入口 API、节点转发与东西向治理问题。它们可以组合，但不是层层安装就自然更可靠；每增加一层，都必须明确配置所有者、实际数据路径、观测入口和回退方式。

## Gateway API 的角色模型

Ingress 把入口地址、TLS 和路由压在一个对象模型中，而且 API 已冻结。Gateway API 把基础设施与应用路由分开：

- GatewayClass 由基础设施提供者定义具体实现。
- Gateway 声明监听器、地址、协议和可附着路由范围。
- HTTPRoute/GRPCRoute/TCPRoute 等由应用团队声明匹配与后端。
- Policy 类资源向目标对象附加 TLS、流量或实现相关策略。

Route 使用 `parentRefs` 附着到 Gateway，Gateway listener 用 `allowedRoutes` 控制哪些 namespace 和 Route 类型可以接入。跨 namespace 引用后端默认不应被悄悄允许，需要目标 namespace 中的 ReferenceGrant 明确授权。

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: order-api
  namespace: orders
spec:
  parentRefs:
    - name: public-gateway
      namespace: gateway-system
  hostnames: ["orders.example.com"]
  rules:
    - backendRefs:
        - name: order-api
          port: 8080
```

对象创建成功不代表实现接受。应检查 `Accepted`、`ResolvedRefs`、`Programmed` 等 Conditions，并确认 `observedGeneration` 对应当前 spec。

```bash
kubectl get gateway -A
kubectl get httproute -A -o yaml
kubectl get referencegrant -A
kubectl get gatewayclass -o yaml
```

迁移 Ingress 时先做能力盘点：注解中的重写、认证、限流、源地址和实现专属行为是否有等价 API；然后同域名灰度或使用独立域名对比，不要只转换 YAML 后直接切全部流量。

## Cilium 与 eBPF 数据面

Cilium 可以用 eBPF 实现 Pod 网络、NetworkPolicy、Service 负载均衡，并在特定模式下替换 kube-proxy。内核中的 BPF program 和 map 保存实际转发与策略状态，Cilium Agent 负责节点侧编程，Operator 负责部分集群级控制任务。

这改变了排障证据：只查看 iptables 可能得出“没有规则”的错误结论。应先确认 Cilium 配置和 kube-proxy replacement 模式，再查看 Service、endpoint、policy 和 BPF map 状态。

```bash
cilium status --wait
cilium connectivity test
cilium service list
cilium endpoint list
hubble observe --namespace orders
```

Hubble 从 Cilium 数据面提供节点流量可见性；Hubble Relay 聚合节点流，CLI/UI 展示 L3/L4/L7 流。它能证明某个 flow 被转发或策略拒绝，但不能替代应用 trace，也不能凭单条 flow 推断整个请求成功。

从 kube-proxy 迁移到替代数据面会影响已有连接和节点规则。生产方案要包含内核能力、直连路由/隧道、MTU、HostPort/NodePort/源地址、NetworkPolicy 语义和回退验证，并按节点池逐步推进。

## Service Mesh：Sidecar 与 Ambient

传统 Istio Sidecar 模式把 Envoy 注入每个 Pod，Istiod 通过 xDS 分发监听器、路由、集群和证书配置。它提供细粒度 L7 路由、遥测和 mTLS，但增加 Pod 资源、启动顺序和代理升级耦合。

Ambient 模式把安全 L4 overlay 下沉到每节点 ztunnel，需要 L7 能力的流量再经过 waypoint proxy。ztunnel 使用 HBONE 建立身份感知隧道；waypoint 承担 HTTP 路由、授权和 L7 遥测。它减少 Sidecar 注入，但没有消除控制面、证书、隧道和代理故障。

| 需求 | Sidecar | Ambient |
| --- | --- | --- |
| 每工作负载独立代理边界 | 直接具备 | L4 共享 ztunnel，L7 按需 waypoint |
| Pod 资源开销 | 每 Pod 一份 | 节点级 L4 + 按需 L7 |
| 应用接入变更 | 需要注入和重建 Pod | 加入 ambient 网格无需 Sidecar 注入 |
| 排障重点 | Pod 内 Envoy 与应用 | ztunnel、waypoint、HBONE 与策略附着 |

选择模式应基于协议、L7 策略比例、多租户隔离、资源成本和运维成熟度。只需要 mTLS 与 L4 授权的服务，不必为所有流量强制经过 L7 代理。

## 三层联合排障

```text
客户端
  -> Gateway/LB（监听、证书、Route Conditions）
  -> Service 数据面（VIP、BPF/iptables、EndpointSlice）
  -> Mesh 数据面（身份、策略、xDS、ztunnel/waypoint）
  -> 应用（监听、依赖、超时、业务错误）
```

排障时从边界探测，而不是同时重启三层：

1. 直接访问 Pod IP/端口，确认应用和基础网络。
2. 访问 Service，确认 EndpointSlice 和节点转发。
3. 从网格内身份访问，确认 mTLS、策略和代理配置。
4. 经过 Gateway 访问，确认监听器、Route、TLS 和外部地址。
5. 用同一个 request ID 对齐 Gateway access log、Hubble flow、mesh telemetry 和应用 trace。

如果绕过某层后恢复，只能说明故障边界缩小，不能直接证明该产品本身有 Bug；仍要区分配置未接受、控制面未下发和数据面未执行。

## 生产验收

- Gateway/Route Conditions 能解释未附着、引用失败和地址未编程。
- 单节点网络 Agent 或代理升级不会同时中断全部副本。
- 策略拒绝在流量观测中可见，且能关联到具体对象和规则。
- 证书轮换、控制面短暂不可用时已有数据面行为符合预期。
- 迁移期间新旧路径可对比，连接影响和回退触发条件已量化。
- 删除 Gateway、Route、Policy 或 Mesh 标签后，不残留不可解释的数据面状态。

## 官方资料

- [Gateway API Types](https://gateway-api.sigs.k8s.io/reference/api-types/)
- [Cilium kube-proxy replacement](https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/)
- [Hubble Observability](https://docs.cilium.io/en/stable/observability/hubble/)
- [Istio Ambient Architecture](https://istio.io/latest/docs/ambient/architecture/)
