---
title: EndpointSlice 与 Service 后端
author: Walt
date: 2026-10-20
---

# EndpointSlice 与 Service 后端

EndpointSlice 记录 Service 关联的网络端点、端口和状态，是连接 Service 抽象与真实 Pod 地址的配置对象。端点可以未就绪或正在终止，出现在 Slice 中不等于当前应该接新请求。Kubernetes 1.33 起旧 Endpoints API 已弃用，新排障脚本和控制器应以 `discovery.k8s.io/v1` EndpointSlice 为准。

## 它解决什么问题

带 selector 的 Service 会由控制平面自动生成 EndpointSlice。Pod label、Ready Condition 或端口变化时，EndpointSlice 控制器更新后端集合，节点上的 Service 实现再消费这些变化。

![同一 Service 下不同命名端口对应多个 EndpointSlice](/container/service-named-port-slices.svg)

图中旧新版的 `http` 分别映射 8080 和 9090，因此需要不同的 Slice；一个 Slice 的 ports 对其所有 endpoints 生效。控制器默认每片最多容纳 100 个端点，阈值可通过 `--max-endpoints-per-slice` 调整，上限 1000。切片还按地址族、协议和端口组合分组，不能把“总端点数除以100”当作实际 Slice 数量。旧 Endpoints 对单个 Service 超过 1000 个后端时会截断。

读取方必须聚合该 Service 的全部 Slice，并对重复端点去重。更新期间多个 Slice 的 watch/cache 到达时间不同，同一端点可能暂时重复出现。Slice 没填满也不是故障，控制器会权衡同步次数，不持续做完美装箱。

## 自动生成的对象

```bash
kubectl get service order-api -n orders -o yaml
kubectl get endpointslice -n orders \
  -l kubernetes.io/service-name=order-api -o yaml
```

以下是缩减后的结构示意，实际地址、名称和 Pod 引用由控制器生成，不作为手工创建清单：

```yaml
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: order-api-example
  namespace: orders
  labels:
    kubernetes.io/service-name: order-api
    endpointslice.kubernetes.io/managed-by: endpointslice-controller.k8s.io
addressType: IPv4
ports:
  - name: http
    protocol: TCP
    port: 8080
endpoints:
  - addresses: ["10.244.1.27"]
    conditions:
      ready: true
      serving: true
      terminating: false
    targetRef:
      kind: Pod
      name: order-api-example-pod
```

不要手工修改控制器管理的 Slice，下一次同步会覆盖它。

## 三个 Conditions 怎样组合

| 场景 | ready | serving | terminating |
| --- | --- | --- | --- |
| 正常就绪 Pod | true | true | false |
| 未就绪 Pod | false | false | false |
| 删除中但仍可服务 | false | true | true |

上表是普通带 selector 的 Service 的常见状态。`serving` 对应 Pod Ready；`terminating` 在对象出现 deletionTimestamp 后成立，早于容器实际退出。`ready` 通常可理解为“serving 且非 terminating”，但 Service 设置 `publishNotReadyAddresses: true` 时，ready 会被发布为 true。

数据面通常不把新请求送到终止端点；部分实现会在所有可选端点都终止时使用仍 serving 的端点来排空。应用、代理、连接池和传播时延共同决定在途请求结果，不能把一行 Condition 当作零中断证明。

## 没有 selector 的 Service

Service 可以不设置 selector，用手工或自研控制器管理 EndpointSlice，把稳定 Service 名称映射到集群外数据库或迁移中的旧系统。

```yaml
apiVersion: v1
kind: Service
metadata:
  name: legacy-db
  namespace: orders
spec:
  ports:
    - name: postgres
      port: 5432
---
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: legacy-db-1
  namespace: orders
  labels:
    kubernetes.io/service-name: legacy-db
    endpointslice.kubernetes.io/managed-by: staff
addressType: IPv4
ports:
  - name: postgres
    protocol: TCP
    port: 5432
endpoints:
  - addresses: ["192.0.2.40"]
    conditions:
      ready: true
```

`orders` namespace 需预先存在；`192.0.2.40` 是文档保留地址，部署前替换为经过网络可达性与数据库健康验证的实际地址。Service 与 Slice 必须同命名空间，Service 端口名与 Slice 端口名需匹配。这里的 `ready: true` 是管理者声明，不是 Kubernetes 替外部数据库做了健康检查。

地址不能使用回环、链路本地或另一个 Service 的 ClusterIP。自研控制器必须使用唯一的 `managed-by` 值，避免和其他管理者互相覆盖。若自动生命周期管理还依赖 ownerReferences，应由控制器设置真实 Service UID。无 selector 的外部端点不能用 `kubectl port-forward service/...` 作为验证手段，应从被允许的业务网络探测。

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
| 没有 EndpointSlice | Service是否存在或带selector、控制器与权限；无selector时核对自定义管理者 |
| Slice 存在但 endpoints 为空 | Pod label 不匹配，或没有符合条件的后端 |
| endpoint `ready: false` | Pod 未 Ready；继续看探针、Pod Conditions 和 Events |
| 地址正确但端口错误 | Service `targetPort`、命名端口或容器监听端口不一致 |
| 只有部分地址 | 检查多个 Slice，不要只读取第一个对象 |
| 地址都正确但请求失败 | 继续检查 NetworkPolicy、Service 数据面和应用协议 |

人工维护的外部端点变更应同时核对地址、端口、健康状态、现存连接与回退配置；删除 Service 或 Slice 前先确认仍有哪些业务消费者。
