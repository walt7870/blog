# CR和CRD

## 基本定义

在 Kubernetes 中，CR（Custom Resource） 和 CRD（CustomResourceDefinition） 是扩展 Kubernetes API 的核心机制，允许你添加自己的资源类型，就像 Pod、Service 等内建资源一样使用它们。

| 概念      | 说明                                                       | 类比   |
| ------- | -------------------------------------------------------- | ---- |
| **CRD** | CustomResourceDefinition，自定义资源定义，用于注册新类型到 Kubernetes API | 类的定义 |
| **CR**  | Custom Resource，自定义资源，是你基于 CRD 创建的对象                     | 类的实例 |

## 使用示例

以创建一个MyApp的CRD为例子

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myapps.example.com
spec:
  group: example.com
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                replicas:
                  type: integer
                image:
                  type: string
  scope: Namespaced
  names:
    plural: myapps
    singular: myapp
    kind: MyApp
    shortNames:
      - ma

```

### 字段说明

| 字段路径                | 说明                                          |
| ------------------- | ------------------------------------------- |
| `apiVersion`        | `apiextensions.k8s.io/v1`，用于定义 CRD 的 API    |
| `kind`              | 一定是 `CustomResourceDefinition`              |
| `metadata.name`     | CRD 的名称，格式必须为 `<plural>.<group>`            |
| `spec.group`        | 自定义资源所在的 API Group，例如 `example.com`         |
| `spec.scope`        | `Namespaced` 或 `Cluster`（是否在命名空间下）          |
| `spec.names.kind`   | 定义资源类型，如 `MyApp`                            |
| `spec.names.plural` | 用于访问资源的 URL，如 `/apis/example.com/v1/myapps` |
| `spec.versions`     | 版本列表，每个版本都可以有 schema、served、storage 等控制字段   |
| `schema`            | 使用 OpenAPI v3 格式定义字段校验规则                    |

### 具体使用

一旦你定义并部署了 CRD，Kubernetes 会自动为你注册一个新的 API 端点，比如：

```bash
#讲上面的文件命名为myapp-crd.yaml
kubectl apply -f myapp-crd.yaml

#查看CRD资源
kubectl get crd myapps.example.com

#接口获取
GET /apis/example.com/v1/namespaces/default/myapps


```

#### 创建CR

可以通过yaml

```yaml
apiVersion: example.com/v1
kind: MyApp
metadata:
  name: myapp-sample
spec:
  image: nginx:1.20
  replicas: 3
```

或者直接适用kubectl直接创建

```bash
 
kubectl create myapp example.com --group=example.com --version=v1 --kind=MyApp --plural=myapps
```

#### CR字段说明

| 字段           | 说明                                       |
| ------------ | ---------------------------------------- |
| `apiVersion` | 必须匹配 CRD 定义的 `group/version`             |
| `kind`       | 必须是 CRD 定义的 `kind`                       |
| `metadata`   | 常规 Kubernetes 对象元数据                      |
| `spec`       | 自定义结构，内容由 CRD 的 schema 定义                |
| `status`（可选） | 用于控制器反馈状态的字段，需显式开启 `subresources.status` |

### 作用说明

#### ✅1. 扩展 Kubernetes API 的官方方式

Kubernetes 是以 API 为核心的系统，而 CRD 是一种“无需更改 Kubernetes 核心代码”就能添加新资源类型的机制。

你可以像使用原生资源一样：

```bash
kubectl get myapp
kubectl describe myapp myapp-sample
```

#### ✅ 2. 与 Operator 结合使用

CRD 通常配合控制器（Operator）使用。控制器会监听某种 CR 的变化，并根据其内容操作 Kubernetes 资源：

你创建了 MyApp，控制器就自动创建一个 Deployment

你修改了 MyApp 的 spec.image，控制器自动更新镜像

这就是 Operator 模式的本质。

#### ✅ 3. 替代 ConfigMap/Annotation 的复杂逻辑

以往一些系统会通过复杂的 ConfigMap 或注解组合进行配置管理，不直观也不安全。而 CR 可以显式表达结构，并且支持验证和补全。

### 与原生资源对比

| 项目                 | CRD      | CR          | 原生资源（如 Deployment） |
| ------------------ | -------- | ----------- | ------------------ |
| 是 Kubernetes 原生支持吗 | ✅        | ✅（由 CRD 定义） | ✅                  |
| 可扩展性               | 无限扩展     | 无限扩展        | 受限于版本              |
| 是否有控制器逻辑           | ❌（需要自定义） | ❌（除非搭配控制器）  | ✅ 内置控制器            |
| 是否能定义字段结构          | ✅        | ✅（由 CRD 决定） | ✅                  |
| 是否可用 kubectl 操作    | ✅        | ✅           | ✅                  |

### 适用场景

| 场景         | 举例                                  |
| ---------- | ----------------------------------- |
| 管理数据库      | `PostgresCluster`，一键部署主从 PostgreSQL |
| 管理中间件      | `KafkaTopic`，自动为 Kafka 创建 topic     |
| 管理 SaaS 应用 | `Website`，自动部署网站前后端                 |
| 管理机器学习资源   | `ModelDeployment`，一键部署推理服务          |

总之，整合部署一整套产品，包括多个前端或者多个后端，对于要私有化部署类独立产品提供整套产品包方案