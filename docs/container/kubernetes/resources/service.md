---
title: Kubernetes Service
author: Walt
date: 2026-07-18
---

# Kubernetes Service

Service 为一组动态后端提供稳定名称、虚拟地址和端口映射。带 selector 的 Service 由控制平面维护 EndpointSlice；Pod IP 变化时，客户端仍通过 Service DNS 访问。Service 解决发现和转发，不提供应用级重试、熔断或事务语义。

## 端口关系

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

命名 `targetPort` 允许不同 Pod 版本把同一逻辑端口映射到不同数字，但命名必须在对应 Pod 中存在。

## Service 类型

| 类型 | 入口 | 适用场景 |
| --- | --- | --- |
| ClusterIP | 集群内虚拟 IP 和 DNS | 默认的服务间访问 |
| Headless (`clusterIP: None`) | DNS 直接返回后端地址 | StatefulSet、客户端发现 |
| NodePort | 每个节点开放同一端口 | 调试或外部负载均衡器的基础能力 |
| LoadBalancer | 由云/实现供应外部负载均衡器 | 对外四层入口 |
| ExternalName | DNS CNAME | 仅映射外部 DNS 名称 |

Kubernetes 1.36 已将 Service `externalIPs` 置于弃用路径。新方案应使用受支持的负载均衡控制器或 Gateway API，不把任意外部地址声明当作通用入口设计。

## EndpointSlice 是后端事实

```bash
kubectl get svc order-api -n orders -o yaml
kubectl get endpointslice -n orders \
  -l kubernetes.io/service-name=order-api -o wide
```

EndpointSlice 的地址、端口和 `ready/serving/terminating` Conditions 决定 Service 实现看到哪些后端。旧 Endpoints API 自 Kubernetes 1.33 起已弃用，且单个对象在超过 1000 个后端时会截断；新脚本与控制器应读取 EndpointSlice。

## 没有 selector 的 Service

Service 可以不带 selector，由人工或控制器创建 EndpointSlice，映射集群外数据库或迁移中的旧系统。该模式不会自动做健康检查，后端状态和地址更新由管理者负责。示例见 [EndpointSlice 与 Service 后端](./endpoint)。

ExternalName 不创建代理后端，只返回 CNAME。HTTP Host、TLS SNI 和证书域名仍由应用协议决定，因此把内部服务名直接 CNAME 到不同域名可能导致协议不匹配。

## 会话和流量策略

`sessionAffinity: ClientIP` 只提供基于客户端 IP 的有限粘性，不能替代共享 Session 或无状态设计。代理、NAT 和客户端地址变化都会影响结果。

`externalTrafficPolicy: Local` 可以保留客户端源地址并减少跨节点转发，但只有存在本地 Ready 后端的节点才能正常接流量；负载均衡器健康检查和副本拓扑必须一起验证。

## 排障顺序

```bash
kubectl get svc order-api -n orders
kubectl get pod -n orders -l app=order-api --show-labels
kubectl get endpointslice -n orders -l kubernetes.io/service-name=order-api -o yaml
kubectl run net-debug --rm -it --restart=Never --image=curlimages/curl -- sh
```

在调试 Pod 中依次测试：Service DNS、ClusterIP:port、endpoint IP:targetPort。这样可以把问题缩小到 DNS、Service 数据面、NetworkPolicy 或应用监听。

| 现象 | 优先检查 |
| --- | --- |
| DNS 不解析 | Service 名称/Namespace、CoreDNS、Pod DNS 配置 |
| Service 有 IP 但无后端 | selector、Pod labels、EndpointSlice |
| 后端存在但 `ready: false` | readinessProbe、Pod Conditions |
| 连接拒绝 | targetPort、容器监听地址和协议 |
| 只有跨节点请求失败 | CNI、Service 实现、节点路由和策略 |
| LoadBalancer 一直 Pending | 实现/云控制器、配额、Events、Class/annotation |
