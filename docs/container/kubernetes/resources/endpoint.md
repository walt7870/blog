---
title: EndpointSlice 与 Service 后端
author: Walt
date: 2026-07-18
---

# EndpointSlice 与 Service 后端

EndpointSlice 记录 Service 当前可以转发到哪些网络端点，是连接 Service 抽象与真实 Pod 地址的关键对象。Kubernetes 1.33 起旧 Endpoints API 已弃用，新排障脚本和控制器应以 `discovery.k8s.io/v1` EndpointSlice 为准。

## 它解决什么问题

带 selector 的 Service 会由控制平面自动生成 EndpointSlice。Pod label、Ready Condition 或端口变化时，EndpointSlice 控制器更新后端集合，节点上的 Service 实现再消费这些变化。

```text
Service selector
  -> 匹配 Pod
  -> EndpointSlice(addresses + ports + conditions)
  -> kube-proxy / eBPF / 其他实现
  -> 后端 Pod
```

EndpointSlice 默认最多包含 100 个 endpoint；后端更多时会拆成多个 Slice。相比旧 Endpoints，它支持多 Slice、IPv4/IPv6、拓扑信息和 `ready`、`serving`、`terminating` 条件。旧 Endpoints 对单个 Service 超过 1000 个后端时会截断。

## 自动生成的对象

```bash
kubectl create deployment echo --image=hashicorp/http-echo -- --text=ok
kubectl expose deployment echo --port=80 --target-port=5678
kubectl get endpointslice -l kubernetes.io/service-name=echo -o yaml
```

典型结构：

```yaml
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  labels:
    kubernetes.io/service-name: echo
    endpointslice.kubernetes.io/managed-by: endpointslice-controller.k8s.io
addressType: IPv4
ports:
  - name: ""
    protocol: TCP
    port: 5678
endpoints:
  - addresses: ["10.244.1.27"]
    conditions:
      ready: true
      serving: true
      terminating: false
    targetRef:
      kind: Pod
      name: echo-7d9c7c5d8f-x2k9p
```

不要手工修改控制器管理的 Slice，下一次同步会覆盖它。

## 没有 selector 的 Service

Service 可以不设置 selector，用手工或自研控制器管理 EndpointSlice，把稳定 Service 名称映射到集群外数据库或迁移中的旧系统。

```yaml
apiVersion: v1
kind: Service
metadata:
  name: legacy-db
spec:
  ports:
    - name: postgres
      port: 5432
---
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: legacy-db-1
  labels:
    kubernetes.io/service-name: legacy-db
    endpointslice.kubernetes.io/managed-by: staff
addressType: IPv4
ports:
  - name: postgres
    protocol: TCP
    port: 5432
endpoints:
  - addresses: ["10.20.30.40"]
```

地址不能使用回环、链路本地或另一个 Service 的 ClusterIP。自研控制器必须使用唯一的 `managed-by` 值，避免和其他管理者互相覆盖。

## 排障路径

```bash
kubectl get svc order-api -n orders -o yaml
kubectl get pod -n orders -l app=order-api --show-labels
kubectl get endpointslice -n orders \
  -l kubernetes.io/service-name=order-api -o wide
kubectl get endpointslice -n orders \
  -l kubernetes.io/service-name=order-api -o yaml
```

| 现象 | 判断 |
| --- | --- |
| 没有 EndpointSlice | Service selector 无匹配、Service 不存在或控制器异常 |
| Slice 存在但 endpoints 为空 | Pod label 不匹配，或没有符合条件的后端 |
| endpoint `ready: false` | Pod 未 Ready；继续看探针、Pod Conditions 和 Events |
| 地址正确但端口错误 | Service `targetPort`、命名端口或容器监听端口不一致 |
| 只有部分地址 | 检查多个 Slice，不要只读取第一个对象 |
| 地址都正确但请求失败 | 继续检查 NetworkPolicy、Service 数据面和应用协议 |

资源清理后可用 `kubectl delete deployment,service echo` 删除示例。
