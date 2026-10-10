---
title: Ingress 与 Gateway API
author: Walt
date: 2026-07-18
---

# Ingress 与 Gateway API

Ingress 描述 HTTP/HTTPS 请求如何按域名和路径转发到 Service。Ingress API 已冻结：它仍是稳定 API，Kubernetes 没有移除计划，但不会继续增加能力。新平台或复杂多团队入口应同时评估 Gateway API；现有 Ingress 不需要仅因“API 冻结”立即迁移。

## 资源和实现必须同时存在

创建 Ingress 只是在 API 中保存路由意图。集群还必须安装 Ingress Controller，并通过 `IngressClass` 选择实现。不同 Controller 的注解、证书、流量策略和状态行为并不通用。

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: order-api
  namespace: orders
spec:
  ingressClassName: nginx
  tls:
    - hosts: [orders.example.com]
      secretName: orders-tls
  rules:
    - host: orders.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: order-api
                port:
                  number: 80
```

`pathType` 必须明确：`Exact` 精确匹配，`Prefix` 按路径段前缀匹配，`ImplementationSpecific` 交给 Controller 解释。依赖实现私有正则和注解时，要把兼容性写进升级与迁移计划。

## 请求链路

```text
DNS
  -> LoadBalancer / NodePort
  -> Ingress Controller
  -> Ingress rule
  -> Service
  -> EndpointSlice
  -> Ready Pod
```

Ingress 显示地址不代表后端可用。TLS、路由、Service selector、目标端口、EndpointSlice Ready 和应用监听都要独立验证。

```bash
kubectl get ingressclass
kubectl get ingress order-api -n orders -o yaml
kubectl describe ingress order-api -n orders
kubectl get svc,endpointslice -n orders
kubectl logs -n <controller-namespace> <controller-pod>
curl -vk --resolve orders.example.com:443:<address> https://orders.example.com/api/health
```

## TLS 边界

`spec.tls.secretName` 引用同 Namespace 的 `kubernetes.io/tls` Secret。Ingress 只声明使用哪个证书，签发、续期和私钥保护通常由证书控制器或外部密钥系统负责。

检查顺序：

1. Secret 是否存在，类型和证书链是否正确。
2. Controller 是否允许读取该 Secret。
3. 证书域名、有效期和监听器状态是否匹配。
4. TLS 在入口终止后，后端使用 HTTP、HTTPS 还是 mTLS。

不要把私钥直接写进 Git；Base64 也不提供保密性。

## Gateway API 为什么不同

Gateway API 把职责拆成多个对象：

| 对象 | 主要职责 |
| --- | --- |
| GatewayClass | 选择控制器实现和基础设施类型 |
| Gateway | 地址、监听器、证书和允许挂接的路由范围 |
| HTTPRoute/GRPCRoute | 应用域名、匹配、后端和流量策略 |
| ReferenceGrant | 显式允许跨 Namespace 引用 |

这种角色模型更适合平台团队管理共享入口、应用团队管理自己的路由。Gateway API 仍需要具体 Controller；不同实现支持的标准/实验资源和 conformance profile 必须单独核对。

## 迁移而不是重写

从 Ingress 迁移时：

1. 盘点 IngressClass、注解、TLS、正则、重写、鉴权和流量策略。
2. 把标准语义映射到 Gateway/HTTPRoute，列出无法直接迁移的私有功能。
3. 在同一后端上双跑新旧入口，比较状态、证书、路由和真实流量。
4. 用 DNS 或负载均衡权重小流量切换，设置错误率和延迟停止条件。
5. 保留旧入口到观察窗口结束，再删除旧规则和私有注解。

## 常见故障

| 现象 | 优先检查 |
| --- | --- |
| Ingress 无地址 | IngressClass、Controller、云负载均衡器 Events |
| 404 | host/path/pathType、Controller 默认后端、请求 Host |
| 502/503 | Service 端口、EndpointSlice、Pod Ready、后端协议 |
| TLS 证书错误 | Secret、SNI、证书域名、续期控制器 |
| 一种 Controller 正常、换实现失败 | 私有注解和 ImplementationSpecific 语义 |

更完整的组件选型和迁移边界见 [云原生扩展生态](../advanced/ecosystem)。
