# kubernetes

## 1. 简介

Kubernetes 最初源自 Google 对其内部集群管理系统 Borg 的抽象和优化，于 2014 年 6 月 6 日首次以开源项目形式发布于 GitHub，项目创始人包括 Joe Beda、Brendan Burns 和 Craig McLuckie
Razorops

2015 年 7 月 21 日发布 1.0 版本，随后 Google 与 Linux 基金会合作，成立了云原生计算基金会（CNCF），并将 Kubernetes 作为其首个“种子”项目，为其后续生态建设奠定基础 Kubernetes。截至 2024 年底，Kubernetes 已成长为全球第二大开源项目，贡献者超 88,000 人，生态涵盖容器运行时、网络插件、存储接口、监控、服务网格等多个领域，并在超过 71% 的《财富》100 强企业中部署运行。

核心宗旨：一切皆是资源，资源是可以被定义描述的，被定义描述的资源是可以被系统监控执行到目标状态的，可以使用yaml配置来管理集群，k8s工程师有时候也被成为yaml工程师😂

## 2. 核心组价

### 2.1 控制平面

#### kube-apiserver

集群的入口，提供 RESTful API，用于接收和验证所有操作请求，并将集群状态持久化到 etcd

#### etcd

一个分布式、高可用的键值存储，保存集群的完整“期望状态”数据，在网络分区时保证一致性（CP 模式）

#### kube-scheduler

根据调度策略（资源需求、亲和性、污点/容忍度等）监听 API Server 中尚未绑定节点的 Pod，并将其分配到合适的工作节点
loft.sh。

#### kube-controller-manager

运行一系列控制循环（如 ReplicaSet、Deployment、Job 等），持续对比“当前状态”与“期望状态”，并发起 API 操作以达到一致
红帽。

#### cloud-controller-manager（非必要）

在云环境中运行，负责与云提供商 API 集成，如负载均衡、节点伸缩和路由等

### 2.2 数据面板

#### kubelet

节点代理，周期性向 API Server 上报节点和 Pod 状态，并根据 API 指令通过 CRI 调用容器运行时启动/停止容器。

#### Container Runtime

实际执行容器生命周期管理的组件，如 containerd、CRI-O 等；从 v1.24 开始，Docker Shim 被移除，推荐直接使用符合 CRI 的运行时 。

#### kube-proxy

实现 Service 抽象的网络代理，维护 iptables/ipvs 规则，将流量路由到后端 Pod，并支持负载均衡功能。

## 3. 核心资源概念

### 3.1 Pod

**Pod**是 Kubernetes 中最小的部署单元，表示一组紧密关联的一个或多个容器，共享网络命名空间和存储卷。每个 Pod 内的容器被调度到同一节点上运行，且拥有相同的 IP 地址和端口空间。

+ **主要特点**
  + 将紧密耦合的应用组件（如主进程 + 辅助进程）打包在一起。 参考：[Kubernetes](https://kubernetes.io/docs/concepts/workloads/pods/)
  + 生命周期与其内部容器一致，短暂且可重建。参考： [Kubernetes](https://kubernetes.io/docs/concepts/workloads/pods/)
  
+ **示例**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  labels:
    app: nginx
spec:
  containers:
    - name: nginx
      image: nginx:1.24
      ports:
        - containerPort: 80
```

上例创建了一个单容器 Pod，运行 nginx 服务并暴露 80 端口。
详细可参考： [Kubernetes](https://kubernetes.io/docs/concepts/workloads/pods/)

---

### 3.2 Service

**Service**为一组 Pod 提供稳定的网络访问入口，支持多种类型（ClusterIP、NodePort、LoadBalancer、ExternalName 等），并内置简单的负载均衡能力。
Service 通过标签选择器（Label Selector）动态关联后端 Pod，并为其分配持久的虚拟 IP（ClusterIP）和 DNS 名称，同时提供四层（L4）负载均衡能力

+ **核心属性**
  + **selector**：定义后端 Pod 的标签。
  + **type**：指定访问方式，如 `ClusterIP`（集群内部）、`NodePort`（节点端口）、`LoadBalancer`（云厂商 LB）等。 具体可参考：[Kubernetes](https://kubernetes.io/docs/tutorials/kubernetes-basics/expose/expose-intro/)
+ **ClusterIP 示例**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-clusterip-svc
spec:
  type: ClusterIP
  selector:
    app: nginx
  ports:
    - port: 80
      targetPort: 80
```

创建后，集群内部**Pod**可通过 `my-clusterip-svc.default.svc.cluster.local:80`访问后端 nginx Pod。 [Google Cloud](https://cloud.google.com/kubernetes-engine/docs/concepts/service)

+ **NodePort 示例**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-nodeport-svc
spec:
  type: NodePort
  selector:
    app: nginx
  ports:
    - port: 80
      targetPort: 80
      nodePort: 30080
```

通过集群任一节点的 `NodeIP:30080`，即可从外部访问后端 Pod。
参考：

+ [Kubernetes](https://kubernetes.io/docs/tutorials/kubernetes-basics/expose/expose-intro/)
+ [OpenShift 文档](https://docs.openshift.com/container-platform/3.11/dev_guide/expose_service/expose_internal_ip_nodeport.html)

---

## 3.3 Deployment

**Deployment**是一种高级控制器，用于声明式管理一组无状态 Pod（通过 ReplicaSet 实现副本控制），可以用于控制一个或一组pod的生命周期，支持滚动更新、回滚和扩缩容。

+ **主要作用**
  + 维护指定数量的 Pod 副本，实现高可用。
  + 支持声明式升级策略，如滚动更新、分批发布。 具体参考：[Kubernetes](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
+ **示例**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:1.24
          ports:
            - containerPort: 80
```

上述 Deployment 会启动 3 个 nginx Pod，并在更新时逐步替换旧版本。具体参考： [Kubernetes](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)

---

## 3.4 ConfigMap

**ConfigMap**用于存储非机密的配置信息（如配置文件、环境变量、命令行参数），并将其注入到 Pod 中，解耦配置与镜像。

+ **使用方式**
  + 作为环境变量：`envFrom`或单个 `env`。
  + 作为命令行参数：通过 `args`引用。
  + 作为卷挂载：以文件形式提供给容器。 [Kubernetes](https://kubernetes.io/docs/concepts/configuration/configmap/)
+ **示例**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  LOG_LEVEL: "debug"
  KEY_FILE: "/etc/keys/app.key"
---
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
    - name: app
      image: myapp:latest
      envFrom:
        - configMapRef:
            name: app-config
```

Pod 启动时会将 `LOG_LEVEL`和 `KEY_FILE`注入为环境变量。详细参考： [Kubernetes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/)

---

## 3.5 Secret

**Secret**与 ConfigMap 类似，但用于存储敏感数据（如密码、Token、TLS 证书），在 API Server 和 etcd 中可选加密存储，并在传输时自动 Base64 编码。

+ **注意事项**
  + 默认明文存储在 etcd，应启用加密插件。
  + 访问控制依赖于命名空间与 RBAC，需谨慎分配权限。 详细参考：[Kubernetes](https://kubernetes.io/docs/concepts/configuration/secret/)
+ **示例**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
data:
  username: bXlkYg==       # Base64("mydb")
  password: MWYyZDFlMmU2N2Rm  # Base64("1f2d1e2e67df")
---
apiVersion: v1
kind: Pod
metadata:
  name: db-pod
spec:
  containers:
    - name: app
      image: myapp:latest
      env:
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: username
        - name: DB_PASS
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
```

容器中可通过 `DB_USER`和 `DB_PASS`环境变量获取敏感信息。
