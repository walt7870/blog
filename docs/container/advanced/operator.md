# Operator

## 概述

**Kubernetes Operator** 是一种用于扩展 Kubernetes 功能的模式和工具，它将人类运维经验（即如何部署、配置、管理某种应用或服务）编码为自动化控制器，使复杂有状态应用的运维自动化成为可能。
总之，Operator 是一种运行在 Kubernetes 上的控制器，它以编程方式管理应用的整个生命周期（安装、配置、扩缩容、升级、恢复、监控等）

## 由来

Kubernetes 中有很多内置控制器，比如 Deployment 控制器、ReplicaSet 控制器，它们负责管理相应资源的状态（比如保持副本数）。

这些内置控制器只能管理 Kubernetes 原生资源，比如 Pod、Service、ConfigMap。

但是当你想管理一个外部系统（如 MySQL、Kafka、Redis、Elasticsearch 等）怎么办？
这就需要 Operator，它可以让你定义自定义资源（CRD）和自定义控制器来管理这些服务。

## 架构

Kubernetes Operator 架构主要包括以下几个组件：

- **Operator SDK**：Operator SDK 是一个用于构建 Kubernetes Operator 的 SDK，它提供了一组工具和库，用于简化 Operator 的开发。
- **Custom Resource Definition（CRD）**：CRD 是一种 Kubernetes API 扩展机制，用于定义新的资源类型。Operator 可以通过 CRD 定义自己的资源类型，用于描述应用的状态和配置。
- **Controller**：Controller 是 Operator 的核心组件，它负责监听 CRD 资源的变化，并根据资源的状态执行相应的操作。
- **Client**：Client 是 Operator 用于与 Kubernetes API 交互的客户端库，它提供了一组方法用于创建、更新、删除资源等操作。

## 功能

Kubernetes Operator 具有以下几个主要功能：

- **自定义资源定义（CRD）**：Operator 允许用户定义自己的资源类型，用于描述应用的状态和配置。CRD 定义了资源的结构和行为，包括资源的名称、属性、状态等。
- **自定义控制器**：Operator 配备了一个自定义控制器，用于监听和响应自定义资源的变化。控制器根据自定义资源的状态执行相应的操作，如创建、更新、删除应用实例等。

## 主要处理过程

```
+-----------------------------+
|  用户创建 CR（MySQLCluster）|
+-------------+--------------+
              |
              v
+-------------+--------------+
| Operator 检测到 CR 变化     |
+-------------+--------------+
              |
              v
+-------------+--------------+
| Operator 控制器执行业务逻辑  |
| - 创建/修改 Pod/Service 等  |
| - 配置同步、健康检查等       |
+-------------+--------------+
              |
              v
+-------------+--------------+
|  Kubernetes 状态更新        |
+-----------------------------+

```

## 例子

在 Kubernetes 上部署一个 MySQL 高可用集群

### 整理处理过程
```
[CRD: MysqlCluster]         用户定义资源
        |
        v
[Custom Resource: my-db]    用户实际创建的数据库集群对象
        |
        v
[MySQL Operator Controller] 不断监听并 reconcile（对齐）状态
        |
        +--> 创建 StatefulSet（MySQL 主从节点）
        |
        +--> 配置 Service（主从服务暴露）
        |
        +--> 管理 PVC、ConfigMap、Secret（持久化和配置）
```

### 处理步骤

#### 1. 安装 CRD 和 MySQL Operator

通常 MySQL Operator 会通过 Helm 安装

```bash
# 添加 Helm 仓库
helm repo add bitpoke https://helm-charts.bitpoke.io
helm repo update

# 安装 Operator 到 mysql-operator 命名空间
helm install mysql-operator bitpoke/mysql-operator --namespace mysql-operator --create-namespace

```

#### 2. 定义一个 MySQLCluster 自定义资源（CR）

这个 YAML 就像是告诉 Operator：“我想要一个三副本的 MySQL 集群，名字叫 my-db”

```yaml
# mysql-cluster.yaml
apiVersion: mysql.presslabs.org/v1alpha1
kind: MysqlCluster
metadata:
  name: my-db
  namespace: default
spec:
  replicas: 3
  secretName: my-db-secret
  mysqlVersion: "8.0"
  volumeSpec:
    persistentVolumeClaim:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 5Gi
```

#### 3. 创建一个 MySQLCluster 的自定义资源

```bash
# mysql-cluster.yaml
apiVersion: mysql.presslabs.org/v1alpha1
kind: MysqlCluster
metadata:
  name: my-db
  namespace: default
spec:
  replicas: 3
  secretName: my-db-secret
  mysqlVersion: "8.0"
  volumeSpec:
    persistentVolumeClaim:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 5Gi

```

#### 4. 创建 Secret（存储用户名密码)

```bash
kubectl create secret generic my-db-secret \
  --from-literal=username="root" \
  --from-literal=password="strong-password" \
  --namespace=default
```

### 5. 创建自定义资源实例

```bash
kubectl apply -f mysql-cluster.yaml
```

### 6.查看效果

```bash
kubectl get mysqlcluster my-db
kubectl get pods -l app.kubernetes.io/name=mysql -w
kubectl get svc
```

### 7.处理过程

Operator 检测到 my-db CR 被创建：

1. 检查目标状态：发现期望有一个 MySQL 集群 my-db，3 个副本。

2. 创建资源：

    - 创建一个 StatefulSet：名字是 my-db-mysql，副本数是 3。

    - 为主节点创建 Service（如 my-db-mysql-master）。

    - 为从节点创建 Headless Service（如 my-db-mysql-replicas）。

    - 创建 PVC、挂载存储。

    - 使用 my-db-secret 进行初始化。

    - 使用 init container 初始化主从复制关系。

3. 持续对齐状态（Reconcile）：

- 如果 Pod 宕机，会重建。

- 如果 PVC 不健康，会尝试重连。

- 如果 CR 修改了副本数，会自动扩缩容。

## 优势

- 🚀 自动化部署、更新、故障恢复

- 📏 统一管理多个实例（数据库、多节点应用等）

- 🧩 与 Kubernetes 原生生态完美融合（RBAC、CRD、RBAC、Events）

- 🔁 可实现完整的声明式生命周期管理