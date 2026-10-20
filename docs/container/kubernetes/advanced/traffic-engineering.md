---
title: Kubernetes 流量工程：Gateway、Cilium 与 Service Mesh
author: Walt
date: 2026-07-18
---

# Kubernetes 流量工程：Gateway、Cilium 与 Service Mesh

Gateway API、eBPF 数据面和 Service Mesh 分别解决入口 API、节点转发与东西向治理问题。它们可以组合，但不是层层安装就自然更可靠；每增加一层，都必须明确配置所有者、实际数据路径、观测入口和回退方式。

例如订单入口返回404，先区分“Gateway没有接受Route”和“请求已经到应用但路径不存在”；Hubble看到TCP转发成功，只能证明部分网络路径成立。配置对象、转发组件和应用响应需要各自的证据。

![Gateway配置关系与Ambient网格请求路径分开表示](/container/gateway-ambient-data-path.svg)

## Gateway API 的角色模型

Ingress 把入口地址、TLS 和路由压在一个对象模型中，而且 API 已冻结。Gateway API 把基础设施与应用路由分开：

- GatewayClass 由基础设施提供者定义具体实现。
- Gateway 声明监听器、地址、协议和可附着路由范围。
- HTTPRoute/GRPCRoute/TCPRoute 等由应用团队声明匹配与后端。
- Policy 类资源向目标对象附加 TLS、流量或实现相关策略。

Route 使用 `parentRefs` 附着到 Gateway，Gateway listener 用 `allowedRoutes` 控制哪些 namespace 和 Route 类型可以接入。跨 namespace 引用后端默认不应被悄悄允许，需要目标 namespace 中的 ReferenceGrant 明确授权。Route附着到另一个namespace的Gateway走listener的allowedRoutes机制，不是靠ReferenceGrant放行。

示例假设已安装兼容Gateway API的实现，`gateway-system/public-gateway`已存在且listener允许orders路由，orders中Service的服务端口是8080。这里port指Service port，不是随意填容器targetPort。

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

对象创建成功不代表实现接受。Route通常按 `status.parents` 检查对应controller的Accepted和ResolvedRefs；Gateway和listener还需检查Programmed等实现状态，并确认observedGeneration对应当前spec。Conditions所在对象和支持范围不同，不要求每个对象都有同名Condition。

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
kubectl get pod -n kube-system -l k8s-app=cilium -o wide
cilium_pod=替换为故障节点上的CiliumPod名称
kubectl exec -n kube-system "$cilium_pod" -- cilium-dbg service list
kubectl exec -n kube-system "$cilium_pod" -- cilium-dbg endpoint list
hubble observe --namespace orders
```

本地cilium CLI用于集群级检查，`cilium-dbg`在目标节点的Agent容器里读取本地数据面；不能随机选一个节点就代表所有节点。Hubble CLI需要已配置可达的服务或Relay。`cilium connectivity test`会创建测试工作负载并产生流量，应在隔离测试环境安排执行，不作为无副作用的查看命令。

Hubble 从 Cilium 数据面提供节点流量可见性；Hubble Relay 聚合节点流，CLI/UI 展示 L3/L4/L7 流。它能证明某个 flow 被转发或策略拒绝，但不能替代应用 trace，也不能凭单条 flow 推断整个请求成功。

从 kube-proxy 迁移到替代数据面会影响已有连接和节点规则。生产方案要包含内核能力、直连路由/隧道、MTU、HostPort/NodePort/源地址、NetworkPolicy 语义和回退验证，并按节点池逐步推进。

## Service Mesh：Sidecar 与 Ambient

传统 Istio Sidecar 模式把 Envoy 注入每个 Pod，Istiod 通过 xDS 分发监听器、路由、集群和证书配置。它提供细粒度 L7 路由、遥测和 mTLS，但增加 Pod 资源、启动顺序和代理升级耦合。

Ambient 模式把安全 L4 overlay 下沉到每节点 ztunnel，需要 L7 能力的流量再经过 waypoint proxy。ztunnel 使用 HBONE 建立身份感知隧道；waypoint 承担 HTTP 路由、授权和 L7 遥测。它减少 Sidecar 注入，但没有消除控制面、证书、隧道和代理故障。

两个ambient工作负载通信时，源节点ztunnel按目标决定是否经waypoint，再到目标节点ztunnel和Pod；直接访问Pod IP与访问Service的waypoint归属也可能不同。外部、网格外或Gateway来源是否经过waypoint取决于实现版本与配置，不能把所有入口请求都画成必经waypoint。身份按工作负载ServiceAccount建立，不是所有Pod共用节点ztunnel自己的身份。

| 需求 | Sidecar | Ambient |
| --- | --- | --- |
| 每工作负载独立代理边界 | 直接具备 | L4 共享 ztunnel，L7 按需 waypoint |
| Pod 资源开销 | 每 Pod 一份 | 节点级 L4 + 按需 L7 |
| 应用接入变更 | 需要注入和重建 Pod | 加入 ambient 网格无需 Sidecar 注入 |
| 排障重点 | Pod 内 Envoy 与应用 | ztunnel、waypoint、HBONE 与策略附着 |

选择模式应基于协议、L7 策略比例、多租户隔离、资源成本和运维成熟度。只需要 mTLS 与 L4 授权的服务，不必为所有流量强制经过 L7 代理。

## 三层联合排障

| 观测边界 | 证据 | 不能单独证明 |
| --- | --- | --- |
| Gateway/LB | 监听器、证书、Route Conditions、access log | 后端业务成功 |
| Service与节点数据面 | EndpointSlice、BPF/iptables、flow verdict | HTTP路径或事务正确 |
| Mesh | 工作负载身份、策略、代理配置、HBONE | 应用依赖和业务无错 |
| 应用 | 监听端口、请求日志、trace、业务结果 | 所有客户端和节点都可达 |

这些是排障边界，不是固定串联的四个代理。Gateway可能直接选择后端endpoint，eBPF可能在socket层完成Service转换，Mesh也可能参与路由选择，应按实际模式确认路径。

排障时从边界探测，而不是同时重启三层：

1. 从允许的测试来源访问Pod IP/端口，检查应用和基础网络；直接Pod访问仍可能经过Mesh或策略，不能默认已经绕过它们。
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
