---
title: Kubernetes Service
author: Walt
date: 2026-10-20
---

# Kubernetes Service

Service 为一组动态后端提供稳定名称、虚拟地址和端口映射。带 selector 的 Service 由控制平面维护 EndpointSlice；Pod IP 变化时，客户端仍通过 Service DNS 访问。Service 解决发现和转发，不提供应用级重试、熔断或事务语义。

## 端口关系

![Service 命名端口映射到不同版本的后端端口](/container/service-named-port-slices.svg)

例如订单服务从旧版 8080 迁到新版 9090，两版 Pod 都把端口命名为 `http`。客户端仍访问 `order-api.orders:80`；控制器按各 Pod 的命名端口生成不同端口的 EndpointSlice，数据面再选择实际地址。图中虚线是配置关系，不是请求转发链。

以下清单以前述 `orders` namespace 和带 `app: order-api` 标签、命名端口为 `http` 的 Pod 已存在为前提：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-api
  namespace: orders
spec:
  selector:
    app: order-api
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: http
```

| 字段 | 含义 |
| --- | --- |
| `port` | Service 对客户端暴露的端口 |
| `targetPort` | 后端 endpoint 的端口，可引用容器命名端口 |
| `nodePort` | NodePort/LoadBalancer 可选的节点端口 |

命名 `targetPort` 允许不同 Pod 版本把同一逻辑端口映射到不同数字，但命名必须在对应 Pod 中存在。`containerPort` 只是声明，不会替应用打开监听；进程仍需监听对应端口和可达地址。

## Service 类型

| 类型 | 入口 | 适用场景 |
| --- | --- | --- |
| ClusterIP | 集群内虚拟 IP 和 DNS | 默认的服务间访问 |
| NodePort | 每个节点开放同一端口 | 调试或外部负载均衡器的基础能力 |
| LoadBalancer | 由云/实现供应外部负载均衡器 | 对外四层入口 |
| ExternalName | DNS CNAME | 仅映射外部 DNS 名称 |

Headless 不是第五种 `spec.type`：它通常仍是 `type: ClusterIP`，但设置 `clusterIP: None`，不分配虚拟 IP，也不由 kube-proxy 提供这层负载均衡。DNS 返回可发现的后端地址，选择后端和重试由客户端负责，常用于 StatefulSet 成员发现。

NodePort 能通过哪些节点地址接入，还受 Service 实现、节点防火墙、`nodePortAddresses` 和流量策略限制；创建对象不等于端口已向公网开放。LoadBalancer 需要实现供应资源，也不保证一定创建公网地址。

截至 2026-10-20，Kubernetes 1.36 已将 Service `externalIPs` 弃用。新方案应使用受支持的负载均衡控制器或 Gateway API；`externalIPs` 本身不会替管理员分配地址或建立外部路由。

## EndpointSlice 是后端事实

```bash
kubectl get svc order-api -n orders -o yaml
kubectl get endpointslice -n orders \
  -l kubernetes.io/service-name=order-api -o wide
```

EndpointSlice 的地址、端口和 `ready/serving/terminating` Conditions 为 Service 实现提供后端信息；具体选择还受流量策略和实现影响。`publishNotReadyAddresses` 会改变 ready 表达，不能看到 `ready: true` 就断言业务健康。旧 Endpoints API 自 Kubernetes 1.33 起已弃用，且单个对象在超过 1000 个后端时会截断；新脚本与控制器应读取 EndpointSlice。

## 没有 selector 的 Service

Service 可以不带 selector，由人工或控制器创建 EndpointSlice，映射集群外数据库或迁移中的旧系统。该模式不会自动做健康检查，后端状态和地址更新由管理者负责。示例见 [EndpointSlice 与 Service 后端](./endpoint)。

ExternalName 不创建代理后端，只返回 CNAME。HTTP Host、TLS SNI 和证书域名仍由应用协议决定，因此把内部服务名直接 CNAME 到不同域名可能导致协议不匹配。

## 会话和流量策略

`sessionAffinity: ClientIP` 只提供基于客户端 IP 的有限粘性，不能替代共享 Session 或无状态设计。代理、NAT 和客户端地址变化都会影响结果。

`externalTrafficPolicy: Local` 避免把这类外部流量转发到其他节点的后端，通常用于保留源地址。正常情况下，没有本地可用端点的节点不能接这类流量；支持终止端点排空的实现还有特定行为。入口代理本身也可能改变源地址，必须结合负载均衡器健康检查、副本拓扑和实际应用日志验证。

## 排障顺序

```bash
kubectl get svc order-api -n orders
kubectl get pod -n orders -l app=order-api --show-labels
kubectl get endpointslice -n orders -l kubernetes.io/service-name=order-api -o yaml
```

在已经批准的诊断 Pod 中依次测试：Service DNS、ClusterIP:port、endpoint IP:targetPort。诊断 Pod 的 namespace、标签、ServiceAccount 和网络策略必须与被测路径相符，否则“调试 Pod 不通”不能代表业务 Pod 不通。例如先验证当前命名空间中的 Service 名称与 HTTP 入口：

```bash
debug_pod=替换为实际诊断Pod名称
kubectl exec -n orders "$debug_pod" -- \
  curl --fail --show-error --max-time 5 http://order-api.orders:80/health/readiness
```

继续对比实际 ClusterIP 和端点地址，保持请求路径、协议和 Host 一致，才能把问题缩小到 DNS、Service 数据面、NetworkPolicy 或应用监听。不要通过重建全部 Pod 代替逐层定位。

| 现象 | 优先检查 |
| --- | --- |
| DNS 不解析 | Service 名称/Namespace、CoreDNS、Pod DNS 配置 |
| Service 有 IP 但无后端 | selector、Pod labels、EndpointSlice |
| 后端存在但 `ready: false` | readinessProbe、Pod Conditions |
| 连接拒绝 | targetPort、容器监听地址和协议 |
| 只有跨节点请求失败 | CNI、Service 实现、节点路由和策略 |
| LoadBalancer 一直 Pending | 实现/云控制器、配额、Events、Class/annotation |
