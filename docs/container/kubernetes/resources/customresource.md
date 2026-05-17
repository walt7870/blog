# Custom Resource (CR) 和 Custom Resource Definition (CRD)

## 概述

Custom Resource Definition (CRD) 是 Kubernetes 的扩展机制，允许用户定义自己的资源类型。通过 CRD，可以创建 Custom Resource (CR)，扩展 Kubernetes API，使其支持特定于应用程序的资源。

| 关键点 | 内容 |
| ---- | ---- |
| 核心作用 | 扩展 Kubernetes API，定义自定义资源 |
| 资源类型 | CRD（定义）、CR（实例） |
| API 版本 | apiextensions.k8s.io/v1 |
| 作用域 | 集群级别（CRD）、命名空间或集群级别（CR） |
| 适用场景 | 应用程序特定资源、Operator 开发 |

## CRD 的本质

### 设计理念

* **API 扩展**：扩展 Kubernetes API，支持自定义资源类型
* **声明式管理**：使用 YAML 声明式定义和管理自定义资源
* **原生集成**：与 Kubernetes 原生资源一样使用 kubectl 管理
* **版本控制**：支持多版本 API 和版本转换

### 工作原理

```
CRD 定义 → API Server 注册 → 创建 CR 实例 → Controller 处理 → 业务逻辑
    ↓           ↓              ↓             ↓           ↓
  资源模式    扩展API        自定义资源     监听变化    执行操作
```

### CRD vs ConfigMap

| 特性 | CRD | ConfigMap |
| ---- | ---- | ---- |
| 用途 | 定义新的资源类型 | 存储配置数据 |
| API 集成 | 完全集成到 Kubernetes API | 内置资源类型 |
| 验证 | 支持 OpenAPI 模式验证 | 无结构验证 |
| 版本控制 | 支持多版本 | 无版本概念 |
| 控制器 | 可以有专门的控制器 | 通常被其他资源引用 |

## 基本配置

### 1. 简单的 CRD 定义

```yaml
# 基础 CRD 定义
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: webapps.example.com  # 必须是 <plural>.<group> 格式
  labels:
    app: webapp-operator
    version: v1.0.0
spec:
  # 资源组
  group: example.com
  
  # 支持的版本
  versions:
  - name: v1
    served: true      # 是否提供 API 服务
    storage: true     # 是否作为存储版本
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              # 应用名称
              appName:
                type: string
                minLength: 1
                maxLength: 63
              # 副本数
              replicas:
                type: integer
                minimum: 1
                maximum: 100
                default: 1
              # 镜像
              image:
                type: string
                pattern: '^[a-zA-Z0-9._/-]+:[a-zA-Z0-9._-]+$'
              # 端口
              port:
                type: integer
                minimum: 1
                maximum: 65535
                default: 8080
              # 环境变量
              env:
                type: array
                items:
                  type: object
                  properties:
                    name:
                      type: string
                    value:
                      type: string
                  required: ["name", "value"]
            required: ["appName", "image"]
          status:
            type: object
            properties:
              # 状态
              phase:
                type: string
                enum: ["Pending", "Running", "Failed"]
              # 就绪副本数
              readyReplicas:
                type: integer
              # 消息
              message:
                type: string
              # 最后更新时间
              lastUpdateTime:
                type: string
                format: date-time
    
    # 额外的打印列
    additionalPrinterColumns:
    - name: App Name
      type: string
      description: The name of the application
      jsonPath: .spec.appName
    - name: Replicas
      type: integer
      description: The number of replicas
      jsonPath: .spec.replicas
    - name: Image
      type: string
      description: The container image
      jsonPath: .spec.image
    - name: Status
      type: string
      description: The status of the webapp
      jsonPath: .status.phase
    - name: Age
      type: date
      jsonPath: .metadata.creationTimestamp
  
  # 资源作用域
  scope: Namespaced  # 或 Cluster
  
  # 资源名称
  names:
    plural: webapps      # 复数形式
    singular: webapp     # 单数形式
    kind: WebApp         # 资源类型名
    shortNames:          # 简写
    - wa
    - webapp
    categories:          # 资源分类
    - all

---
# 对应的 Custom Resource 实例
apiVersion: example.com/v1
kind: WebApp
metadata:
  name: my-webapp
  namespace: production
  labels:
    app: my-webapp
    version: v1.0.0
  annotations:
    description: "示例 Web 应用程序"
spec:
  appName: "my-web-application"
  replicas: 3
  image: "nginx:1.20"
  port: 80
  env:
  - name: "ENV"
    value: "production"
  - name: "LOG_LEVEL"
    value: "info"
  - name: "DB_HOST"
    value: "postgres.database.svc.cluster.local"
status:
  phase: "Running"
  readyReplicas: 3
  message: "WebApp is running successfully"
  lastUpdateTime: "2024-01-15T10:30:00Z"
```

### 2. 多版本 CRD

```yaml
# 支持多版本的 CRD
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.storage.example.com
  labels:
    component: database-operator
spec:
  group: storage.example.com
  
  versions:
  # v1 版本（当前存储版本）
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
              # 数据库类型
              type:
                type: string
                enum: ["mysql", "postgresql", "mongodb"]
              # 版本
              version:
                type: string
              # 存储配置
              storage:
                type: object
                properties:
                  size:
                    type: string
                    pattern: '^[0-9]+[KMGT]i$'
                  storageClass:
                    type: string
                required: ["size"]
              # 资源配置
              resources:
                type: object
                properties:
                  requests:
                    type: object
                    properties:
                      cpu:
                        type: string
                      memory:
                        type: string
                  limits:
                    type: object
                    properties:
                      cpu:
                        type: string
                      memory:
                        type: string
              # 高可用配置
              highAvailability:
                type: object
                properties:
                  enabled:
                    type: boolean
                    default: false
                  replicas:
                    type: integer
                    minimum: 1
                    maximum: 9
                    default: 3
            required: ["type", "version", "storage"]
          status:
            type: object
            properties:
              phase:
                type: string
                enum: ["Pending", "Creating", "Running", "Updating", "Failed"]
              conditions:
                type: array
                items:
                  type: object
                  properties:
                    type:
                      type: string
                    status:
                      type: string
                    reason:
                      type: string
                    message:
                      type: string
                    lastTransitionTime:
                      type: string
                      format: date-time
              endpoints:
                type: object
                properties:
                  primary:
                    type: string
                  readonly:
                    type: array
                    items:
                      type: string
    
    additionalPrinterColumns:
    - name: Type
      type: string
      jsonPath: .spec.type
    - name: Version
      type: string
      jsonPath: .spec.version
    - name: Storage
      type: string
      jsonPath: .spec.storage.size
    - name: HA
      type: boolean
      jsonPath: .spec.highAvailability.enabled
    - name: Status
      type: string
      jsonPath: .status.phase
    - name: Age
      type: date
      jsonPath: .metadata.creationTimestamp
  
  # v1beta1 版本（兼容性版本）
  - name: v1beta1
    served: true
    storage: false
    deprecated: true
    deprecationWarning: "storage.example.com/v1beta1 Database is deprecated; use storage.example.com/v1 Database"
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              # 简化的配置（向后兼容）
              dbType:
                type: string
                enum: ["mysql", "postgres"]
              dbVersion:
                type: string
              storageSize:
                type: string
              replicas:
                type: integer
                minimum: 1
                default: 1
            required: ["dbType", "dbVersion", "storageSize"]
          status:
            type: object
            properties:
              state:
                type: string
              message:
                type: string
    
    additionalPrinterColumns:
    - name: Type
      type: string
      jsonPath: .spec.dbType
    - name: Version
      type: string
      jsonPath: .spec.dbVersion
    - name: Storage
      type: string
      jsonPath: .spec.storageSize
    - name: Replicas
      type: integer
      jsonPath: .spec.replicas
    - name: State
      type: string
      jsonPath: .status.state
    - name: Age
      type: date
      jsonPath: .metadata.creationTimestamp
  
  scope: Namespaced
  
  names:
    plural: databases
    singular: database
    kind: Database
    shortNames:
    - db
    categories:
    - all
    - storage
  
  # 版本转换策略
  conversion:
    strategy: None  # None, Webhook

---
# v1 版本的 Database 实例
apiVersion: storage.example.com/v1
kind: Database
metadata:
  name: production-postgres
  namespace: database
  labels:
    app: postgres
    environment: production
spec:
  type: postgresql
  version: "13.7"
  storage:
    size: "100Gi"
    storageClass: "fast-ssd"
  resources:
    requests:
      cpu: "1000m"
      memory: "2Gi"
    limits:
      cpu: "2000m"
      memory: "4Gi"
  highAvailability:
    enabled: true
    replicas: 3
status:
  phase: "Running"
  conditions:
  - type: "Ready"
    status: "True"
    reason: "DatabaseReady"
    message: "Database is ready and accepting connections"
    lastTransitionTime: "2024-01-15T10:30:00Z"
  endpoints:
    primary: "postgres-primary.database.svc.cluster.local:5432"
    readonly:
    - "postgres-replica-1.database.svc.cluster.local:5432"
    - "postgres-replica-2.database.svc.cluster.local:5432"
```

### 3. 集群级别的 CRD

```yaml
# 集群级别的自定义资源
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: clusters.infrastructure.example.com
  labels:
    component: cluster-manager
spec:
  group: infrastructure.example.com
  
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
              # 集群名称
              clusterName:
                type: string
                minLength: 1
                maxLength: 63
                pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$'
              # 集群类型
              clusterType:
                type: string
                enum: ["development", "staging", "production"]
              # 区域
              region:
                type: string
              # 可用区
              availabilityZones:
                type: array
                items:
                  type: string
                minItems: 1
                maxItems: 5
              # 节点组配置
              nodeGroups:
                type: array
                items:
                  type: object
                  properties:
                    name:
                      type: string
                    instanceType:
                      type: string
                    minSize:
                      type: integer
                      minimum: 0
                    maxSize:
                      type: integer
                      minimum: 1
                    desiredSize:
                      type: integer
                      minimum: 0
                    diskSize:
                      type: integer
                      minimum: 20
                      maximum: 1000
                    labels:
                      type: object
                      additionalProperties:
                        type: string
                    taints:
                      type: array
                      items:
                        type: object
                        properties:
                          key:
                            type: string
                          value:
                            type: string
                          effect:
                            type: string
                            enum: ["NoSchedule", "PreferNoSchedule", "NoExecute"]
                  required: ["name", "instanceType", "minSize", "maxSize", "desiredSize"]
                minItems: 1
              # 网络配置
              networking:
                type: object
                properties:
                  vpcId:
                    type: string
                  subnetIds:
                    type: array
                    items:
                      type: string
                  securityGroupIds:
                    type: array
                    items:
                      type: string
                  serviceIpv4Cidr:
                    type: string
                    pattern: '^([0-9]{1,3}\.){3}[0-9]{1,3}/[0-9]{1,2}$'
              # 加密配置
              encryption:
                type: object
                properties:
                  secretsEncryption:
                    type: boolean
                    default: true
                  kmsKeyId:
                    type: string
              # 日志配置
              logging:
                type: object
                properties:
                  enable:
                    type: boolean
                    default: true
                  types:
                    type: array
                    items:
                      type: string
                      enum: ["api", "audit", "authenticator", "controllerManager", "scheduler"]
            required: ["clusterName", "clusterType", "region", "availabilityZones", "nodeGroups"]
          status:
            type: object
            properties:
              phase:
                type: string
                enum: ["Creating", "Active", "Updating", "Deleting", "Failed"]
              version:
                type: string
              endpoint:
                type: string
              certificateAuthority:
                type: string
              nodeGroups:
                type: array
                items:
                  type: object
                  properties:
                    name:
                      type: string
                    status:
                      type: string
                    capacity:
                      type: integer
                    ready:
                      type: integer
              conditions:
                type: array
                items:
                  type: object
                  properties:
                    type:
                      type: string
                    status:
                      type: string
                    reason:
                      type: string
                    message:
                      type: string
                    lastTransitionTime:
                      type: string
                      format: date-time
    
    additionalPrinterColumns:
    - name: Cluster Name
      type: string
      jsonPath: .spec.clusterName
    - name: Type
      type: string
      jsonPath: .spec.clusterType
    - name: Region
      type: string
      jsonPath: .spec.region
    - name: Status
      type: string
      jsonPath: .status.phase
    - name: Version
      type: string
      jsonPath: .status.version
    - name: Age
      type: date
      jsonPath: .metadata.creationTimestamp
  
  # 集群级别资源
  scope: Cluster
  
  names:
    plural: clusters
    singular: cluster
    kind: Cluster
    shortNames:
    - cls
    categories:
    - all
    - infrastructure

---
# 集群级别的 Custom Resource 实例
apiVersion: infrastructure.example.com/v1
kind: Cluster
metadata:
  name: production-cluster-east
  labels:
    environment: production
    region: us-east-1
    managed-by: cluster-operator
spec:
  clusterName: "prod-east-k8s"
  clusterType: "production"
  region: "us-east-1"
  availabilityZones:
  - "us-east-1a"
  - "us-east-1b"
  - "us-east-1c"
  nodeGroups:
  - name: "system"
    instanceType: "m5.large"
    minSize: 3
    maxSize: 6
    desiredSize: 3
    diskSize: 50
    labels:
      node-type: "system"
      workload: "system-pods"
    taints:
    - key: "node-type"
      value: "system"
      effect: "NoSchedule"
  - name: "application"
    instanceType: "m5.xlarge"
    minSize: 5
    maxSize: 20
    desiredSize: 10
    diskSize: 100
    labels:
      node-type: "application"
      workload: "user-pods"
  networking:
    vpcId: "vpc-12345678"
    subnetIds:
    - "subnet-12345678"
    - "subnet-87654321"
    - "subnet-11111111"
    securityGroupIds:
    - "sg-12345678"
    serviceIpv4Cidr: "10.100.0.0/16"
  encryption:
    secretsEncryption: true
    kmsKeyId: "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
  logging:
    enable: true
    types:
    - "api"
    - "audit"
    - "authenticator"
status:
  phase: "Active"
  version: "1.24.7"
  endpoint: "https://12345678.gr7.us-east-1.eks.amazonaws.com"
  certificateAuthority: "LS0tLS1CRUdJTi..."
  nodeGroups:
  - name: "system"
    status: "Active"
    capacity: 3
    ready: 3
  - name: "application"
    status: "Active"
    capacity: 10
    ready: 10
  conditions:
  - type: "Ready"
    status: "True"
    reason: "ClusterReady"
    message: "Cluster is ready and all node groups are active"
    lastTransitionTime: "2024-01-15T10:30:00Z"
```

## 高级配置

### 1. 带有子资源的 CRD

```yaml
# 支持子资源的 CRD
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: applications.app.example.com
  labels:
    component: application-operator
spec:
  group: app.example.com
  
  versions:
  - name: v1
    served: true
    storage: true
    
    # 子资源配置
    subresources:
      # 状态子资源
      status: {}
      
      # 扩缩容子资源
      scale:
        # 指定副本数字段
        specReplicasPath: .spec.replicas
        statusReplicasPath: .status.replicas
        # 标签选择器路径
        labelSelectorPath: .status.selector
    
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              # 应用配置
              application:
                type: object
                properties:
                  name:
                    type: string
                  version:
                    type: string
                  image:
                    type: string
                required: ["name", "version", "image"]
              
              # 副本数（用于扩缩容）
              replicas:
                type: integer
                minimum: 0
                maximum: 100
                default: 1
              
              # 服务配置
              service:
                type: object
                properties:
                  enabled:
                    type: boolean
                    default: true
                  type:
                    type: string
                    enum: ["ClusterIP", "NodePort", "LoadBalancer"]
                    default: "ClusterIP"
                  port:
                    type: integer
                    minimum: 1
                    maximum: 65535
                    default: 80
              
              # 资源配置
              resources:
                type: object
                properties:
                  requests:
                    type: object
                    properties:
                      cpu:
                        type: string
                      memory:
                        type: string
                  limits:
                    type: object
                    properties:
                      cpu:
                        type: string
                      memory:
                        type: string
              
              # 健康检查
              healthCheck:
                type: object
                properties:
                  enabled:
                    type: boolean
                    default: true
                  path:
                    type: string
                    default: "/health"
                  port:
                    type: integer
                    default: 8080
                  initialDelaySeconds:
                    type: integer
                    minimum: 0
                    default: 30
                  periodSeconds:
                    type: integer
                    minimum: 1
                    default: 10
            
            required: ["application", "replicas"]
          
          status:
            type: object
            properties:
              # 当前副本数
              replicas:
                type: integer
              # 就绪副本数
              readyReplicas:
                type: integer
              # 可用副本数
              availableReplicas:
                type: integer
              # 标签选择器
              selector:
                type: string
              # 应用状态
              phase:
                type: string
                enum: ["Pending", "Running", "Updating", "Failed"]
              # 条件
              conditions:
                type: array
                items:
                  type: object
                  properties:
                    type:
                      type: string
                    status:
                      type: string
                    reason:
                      type: string
                    message:
                      type: string
                    lastTransitionTime:
                      type: string
                      format: date-time
              # 观察到的生成
              observedGeneration:
                type: integer
    
    additionalPrinterColumns:
    - name: App Name
      type: string
      jsonPath: .spec.application.name
    - name: Version
      type: string
      jsonPath: .spec.application.version
    - name: Replicas
      type: string
      jsonPath: .status.replicas
    - name: Ready
      type: string
      jsonPath: .status.readyReplicas
    - name: Status
      type: string
      jsonPath: .status.phase
    - name: Age
      type: date
      jsonPath: .metadata.creationTimestamp
  
  scope: Namespaced
  
  names:
    plural: applications
    singular: application
    kind: Application
    shortNames:
    - app
    categories:
    - all

---
# Application 实例
apiVersion: app.example.com/v1
kind: Application
metadata:
  name: web-frontend
  namespace: production
  labels:
    app: web-frontend
    tier: frontend
spec:
  application:
    name: "web-frontend"
    version: "v1.2.0"
    image: "myregistry/web-frontend:v1.2.0"
  
  replicas: 5
  
  service:
    enabled: true
    type: "LoadBalancer"
    port: 80
  
  resources:
    requests:
      cpu: "200m"
      memory: "256Mi"
    limits:
      cpu: "500m"
      memory: "512Mi"
  
  healthCheck:
    enabled: true
    path: "/api/health"
    port: 8080
    initialDelaySeconds: 15
    periodSeconds: 5

status:
  replicas: 5
  readyReplicas: 5
  availableReplicas: 5
  selector: "app=web-frontend"
  phase: "Running"
  conditions:
  - type: "Available"
    status: "True"
    reason: "MinimumReplicasAvailable"
    message: "Deployment has minimum availability."
    lastTransitionTime: "2024-01-15T10:30:00Z"
  - type: "Progressing"
    status: "True"
    reason: "NewReplicaSetAvailable"
    message: "ReplicaSet has successfully progressed."
    lastTransitionTime: "2024-01-15T10:25:00Z"
  observedGeneration: 1
```

### 2. 带有验证和默认值的 CRD

```yaml
# 高级验证和默认值的 CRD
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: microservices.platform.example.com
  labels:
    platform: microservices
spec:
  group: platform.example.com
  
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
              # 服务基本信息
              service:
                type: object
                properties:
                  name:
                    type: string
                    minLength: 1
                    maxLength: 63
                    pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$'
                    description: "服务名称，必须符合 DNS 标准"
                  description:
                    type: string
                    maxLength: 256
                    description: "服务描述"
                  version:
                    type: string
                    pattern: '^v[0-9]+\.[0-9]+\.[0-9]+$'
                    description: "服务版本，格式：v1.0.0"
                  team:
                    type: string
                    description: "负责团队"
                  owner:
                    type: string
                    format: email
                    description: "服务负责人邮箱"
                required: ["name", "version", "team", "owner"]
              
              # 部署配置
              deployment:
                type: object
                properties:
                  image:
                    type: string
                    pattern: '^[a-zA-Z0-9._/-]+:[a-zA-Z0-9._-]+$'
                    description: "容器镜像"
                  replicas:
                    type: integer
                    minimum: 1
                    maximum: 50
                    default: 2
                    description: "副本数量"
                  strategy:
                    type: object
                    properties:
                      type:
                        type: string
                        enum: ["RollingUpdate", "Recreate"]
                        default: "RollingUpdate"
                      rollingUpdate:
                        type: object
                        properties:
                          maxUnavailable:
                            oneOf:
                            - type: integer
                              minimum: 0
                            - type: string
                              pattern: '^[0-9]+%$'
                            default: "25%"
                          maxSurge:
                            oneOf:
                            - type: integer
                              minimum: 0
                            - type: string
                              pattern: '^[0-9]+%$'
                            default: "25%"
                    default:
                      type: "RollingUpdate"
                      rollingUpdate:
                        maxUnavailable: "25%"
                        maxSurge: "25%"
                  resources:
                    type: object
                    properties:
                      requests:
                        type: object
                        properties:
                          cpu:
                            type: string
                            pattern: '^[0-9]+m?$'
                            default: "100m"
                          memory:
                            type: string
                            pattern: '^[0-9]+[KMGT]i$'
                            default: "128Mi"
                        default:
                          cpu: "100m"
                          memory: "128Mi"
                      limits:
                        type: object
                        properties:
                          cpu:
                            type: string
                            pattern: '^[0-9]+m?$'
                            default: "500m"
                          memory:
                            type: string
                            pattern: '^[0-9]+[KMGT]i$'
                            default: "512Mi"
                        default:
                          cpu: "500m"
                          memory: "512Mi"
                    default:
                      requests:
                        cpu: "100m"
                        memory: "128Mi"
                      limits:
                        cpu: "500m"
                        memory: "512Mi"
                required: ["image"]
              
              # 网络配置
              networking:
                type: object
                properties:
                  service:
                    type: object
                    properties:
                      enabled:
                        type: boolean
                        default: true
                      type:
                        type: string
                        enum: ["ClusterIP", "NodePort", "LoadBalancer"]
                        default: "ClusterIP"
                      ports:
                        type: array
                        items:
                          type: object
                          properties:
                            name:
                              type: string
                            port:
                              type: integer
                              minimum: 1
                              maximum: 65535
                            targetPort:
                              oneOf:
                              - type: integer
                                minimum: 1
                                maximum: 65535
                              - type: string
                            protocol:
                              type: string
                              enum: ["TCP", "UDP"]
                              default: "TCP"
                          required: ["port"]
                        minItems: 1
                        default:
                        - port: 80
                          targetPort: 8080
                          protocol: "TCP"
                    default:
                      enabled: true
                      type: "ClusterIP"
                      ports:
                      - port: 80
                        targetPort: 8080
                        protocol: "TCP"
                  ingress:
                    type: object
                    properties:
                      enabled:
                        type: boolean
                        default: false
                      className:
                        type: string
                        default: "nginx"
                      hosts:
                        type: array
                        items:
                          type: object
                          properties:
                            host:
                              type: string
                              format: hostname
                            paths:
                              type: array
                              items:
                                type: object
                                properties:
                                  path:
                                    type: string
                                    default: "/"
                                  pathType:
                                    type: string
                                    enum: ["Exact", "Prefix", "ImplementationSpecific"]
                                    default: "Prefix"
                                default:
                                  path: "/"
                                  pathType: "Prefix"
                              default:
                              - path: "/"
                                pathType: "Prefix"
                          required: ["host"]
                      tls:
                        type: array
                        items:
                          type: object
                          properties:
                            secretName:
                              type: string
                            hosts:
                              type: array
                              items:
                                type: string
                                format: hostname
                    default:
                      enabled: false
                      className: "nginx"
                default:
                  service:
                    enabled: true
                    type: "ClusterIP"
                    ports:
                    - port: 80
                      targetPort: 8080
                      protocol: "TCP"
                  ingress:
                    enabled: false
                    className: "nginx"
              
              # 监控配置
              monitoring:
                type: object
                properties:
                  enabled:
                    type: boolean
                    default: true
                  metrics:
                    type: object
                    properties:
                      enabled:
                        type: boolean
                        default: true
                      path:
                        type: string
                        default: "/metrics"
                      port:
                        type: integer
                        minimum: 1
                        maximum: 65535
                        default: 9090
                    default:
                      enabled: true
                      path: "/metrics"
                      port: 9090
                  healthCheck:
                    type: object
                    properties:
                      enabled:
                        type: boolean
                        default: true
                      livenessProbe:
                        type: object
                        properties:
                          path:
                            type: string
                            default: "/health"
                          port:
                            type: integer
                            minimum: 1
                            maximum: 65535
                            default: 8080
                          initialDelaySeconds:
                            type: integer
                            minimum: 0
                            default: 30
                          periodSeconds:
                            type: integer
                            minimum: 1
                            default: 10
                        default:
                          path: "/health"
                          port: 8080
                          initialDelaySeconds: 30
                          periodSeconds: 10
                      readinessProbe:
                        type: object
                        properties:
                          path:
                            type: string
                            default: "/ready"
                          port:
                            type: integer
                            minimum: 1
                            maximum: 65535
                            default: 8080
                          initialDelaySeconds:
                            type: integer
                            minimum: 0
                            default: 5
                          periodSeconds:
                            type: integer
                            minimum: 1
                            default: 5
                        default:
                          path: "/ready"
                          port: 8080
                          initialDelaySeconds: 5
                          periodSeconds: 5
                    default:
                      enabled: true
                      livenessProbe:
                        path: "/health"
                        port: 8080
                        initialDelaySeconds: 30
                        periodSeconds: 10
                      readinessProbe:
                        path: "/ready"
                        port: 8080
                        initialDelaySeconds: 5
                        periodSeconds: 5
                default:
                  enabled: true
                  metrics:
                    enabled: true
                    path: "/metrics"
                    port: 9090
                  healthCheck:
                    enabled: true
                    livenessProbe:
                      path: "/health"
                      port: 8080
                      initialDelaySeconds: 30
                      periodSeconds: 10
                    readinessProbe:
                      path: "/ready"
                      port: 8080
                      initialDelaySeconds: 5
                      periodSeconds: 5
            
            required: ["service", "deployment"]
            
            # 全局默认值
            default:
              deployment:
                replicas: 2
                strategy:
                  type: "RollingUpdate"
                  rollingUpdate:
                    maxUnavailable: "25%"
                    maxSurge: "25%"
                resources:
                  requests:
                    cpu: "100m"
                    memory: "128Mi"
                  limits:
                    cpu: "500m"
                    memory: "512Mi"
              networking:
                service:
                  enabled: true
                  type: "ClusterIP"
                  ports:
                  - port: 80
                    targetPort: 8080
                    protocol: "TCP"
                ingress:
                  enabled: false
                  className: "nginx"
              monitoring:
                enabled: true
                metrics:
                  enabled: true
                  path: "/metrics"
                  port: 9090
                healthCheck:
                  enabled: true
                  livenessProbe:
                    path: "/health"
                    port: 8080
                    initialDelaySeconds: 30
                    periodSeconds: 10
                  readinessProbe:
                    path: "/ready"
                    port: 8080
                    initialDelaySeconds: 5
                    periodSeconds: 5
          
          status:
            type: object
            properties:
              phase:
                type: string
                enum: ["Pending", "Deploying", "Running", "Updating", "Failed"]
              conditions:
                type: array
                items:
                  type: object
                  properties:
                    type:
                      type: string
                    status:
                      type: string
                    reason:
                      type: string
                    message:
                      type: string
                    lastTransitionTime:
                      type: string
                      format: date-time
              deploymentStatus:
                type: object
                properties:
                  replicas:
                    type: integer
                  readyReplicas:
                    type: integer
                  availableReplicas:
                    type: integer
              serviceStatus:
                type: object
                properties:
                  clusterIP:
                    type: string
                  externalIPs:
                    type: array
                    items:
                      type: string
              ingressStatus:
                type: object
                properties:
                  loadBalancer:
                    type: object
                    properties:
                      ingress:
                        type: array
                        items:
                          type: object
                          properties:
                            ip:
                              type: string
                            hostname:
                              type: string
    
    additionalPrinterColumns:
    - name: Service
      type: string
      jsonPath: .spec.service.name
    - name: Version
      type: string
      jsonPath: .spec.service.version
    - name: Team
      type: string
      jsonPath: .spec.service.team
    - name: Replicas
      type: integer
      jsonPath: .spec.deployment.replicas
    - name: Status
      type: string
      jsonPath: .status.phase
    - name: Age
      type: date
      jsonPath: .metadata.creationTimestamp
  
  scope: Namespaced
  
  names:
    plural: microservices
    singular: microservice
    kind: Microservice
    shortNames:
    - ms
    - micro
    categories:
    - all
    - platform

---
# Microservice 实例（使用默认值）
apiVersion: platform.example.com/v1
kind: Microservice
metadata:
  name: user-service
  namespace: production
  labels:
    app: user-service
    tier: backend
spec:
  service:
    name: "user-service"
    description: "用户管理服务"
    version: "v1.0.0"
    team: "backend-team"
    owner: "backend-team@example.com"
  
  deployment:
    image: "myregistry/user-service:v1.0.0"
    replicas: 3  # 覆盖默认值 2
  
  networking:
    service:
      ports:
      - port: 80
        targetPort: 8080
        name: "http"
    ingress:
      enabled: true  # 覆盖默认值 false
      hosts:
      - host: "user-service.example.com"
        paths:
        - path: "/api/users"
          pathType: "Prefix"
      tls:
      - secretName: "user-service-tls"
        hosts:
        - "user-service.example.com"
  
  # monitoring 使用所有默认值

status:
  phase: "Running"
  conditions:
  - type: "Available"
    status: "True"
    reason: "MinimumReplicasAvailable"
    message: "Deployment has minimum availability."
    lastTransitionTime: "2024-01-15T10:30:00Z"
  deploymentStatus:
    replicas: 3
    readyReplicas: 3
    availableReplicas: 3
  serviceStatus:
    clusterIP: "10.96.100.50"
  ingressStatus:
    loadBalancer:
      ingress:
      - ip: "203.0.113.10"
```

## 实际应用场景

### 1. 应用程序管理平台

```yaml
# 应用程序生命周期管理
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: applifecycles.platform.example.com
spec:
  group: platform.example.com
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
              # 应用元数据
              metadata:
                type: object
                properties:
                  name:
                    type: string
                  version:
                    type: string
                  description:
                    type: string
                  maintainer:
                    type: string
                  repository:
                    type: string
                    format: uri
              
              # 环境配置
              environments:
                type: array
                items:
                  type: object
                  properties:
                    name:
                      type: string
                      enum: ["development", "staging", "production"]
                    namespace:
                      type: string
                    config:
                      type: object
                      properties:
                        replicas:
                          type: integer
                        resources:
                          type: object
                        env:
                          type: array
                          items:
                            type: object
                            properties:
                              name:
                                type: string
                              value:
                                type: string
              
              # 部署策略
              deploymentStrategy:
                type: object
                properties:
                  type:
                    type: string
                    enum: ["BlueGreen", "Canary", "RollingUpdate"]
                  canary:
                    type: object
                    properties:
                      steps:
                        type: array
                        items:
                          type: object
                          properties:
                            weight:
                              type: integer
                            duration:
                              type: string
              
              # CI/CD 集成
              cicd:
                type: object
                properties:
                  enabled:
                    type: boolean
                  pipeline:
                    type: string
                  triggers:
                    type: array
                    items:
                      type: string
                      enum: ["push", "tag", "manual"]
          
          status:
            type: object
            properties:
              environments:
                type: array
                items:
                  type: object
                  properties:
                    name:
                      type: string
                    status:
                      type: string
                    version:
                      type: string
                    lastDeployment:
                      type: string
                      format: date-time
  scope: Namespaced
  names:
    plural: applifecycles
    singular: applifecycle
    kind: AppLifecycle
    shortNames: ["alc"]
```

### 2. 数据库管理

```yaml
# 数据库集群管理
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: dbclusters.database.example.com
spec:
  group: database.example.com
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
              # 数据库类型和版本
              database:
                type: object
                properties:
                  type:
                    type: string
                    enum: ["mysql", "postgresql", "mongodb", "redis"]
                  version:
                    type: string
                  charset:
                    type: string
                    default: "utf8mb4"
              
              # 集群配置
              cluster:
                type: object
                properties:
                  mode:
                    type: string
                    enum: ["standalone", "master-slave", "cluster"]
                  nodes:
                    type: integer
                    minimum: 1
                    maximum: 9
                  topology:
                    type: object
                    properties:
                      primary:
                        type: integer
                        default: 1
                      secondary:
                        type: integer
                        default: 2
              
              # 存储配置
              storage:
                type: object
                properties:
                  size:
                    type: string
                  storageClass:
                    type: string
                  backup:
                    type: object
                    properties:
                      enabled:
                        type: boolean
                      schedule:
                        type: string
                      retention:
                        type: string
              
              # 安全配置
              security:
                type: object
                properties:
                  tls:
                    type: boolean
                    default: true
                  authentication:
                    type: object
                    properties:
                      enabled:
                        type: boolean
                        default: true
                      method:
                        type: string
                        enum: ["password", "certificate", "ldap"]
                  encryption:
                    type: object
                    properties:
                      atRest:
                        type: boolean
                        default: true
                      inTransit:
                        type: boolean
                        default: true
              
              # 监控配置
              monitoring:
                type: object
                properties:
                  enabled:
                    type: boolean
                    default: true
                  metrics:
                    type: array
                    items:
                      type: string
                  alerts:
                    type: array
                    items:
                      type: object
                      properties:
                        name:
                          type: string
                        condition:
                          type: string
                        threshold:
                          type: string
          
          status:
            type: object
            properties:
              phase:
                type: string
                enum: ["Creating", "Running", "Updating", "Failed"]
              nodes:
                type: array
                items:
                  type: object
                  properties:
                    name:
                      type: string
                    role:
                      type: string
                    status:
                      type: string
                    endpoint:
                      type: string
              backup:
                type: object
                properties:
                  lastBackup:
                    type: string
                    format: date-time
                  status:
                    type: string
  scope: Namespaced
  names:
    plural: dbclusters
    singular: dbcluster
    kind: DBCluster
    shortNames: ["dbc"]
```

### 3. 监控和告警

```yaml
# 监控规则管理
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: monitoringrules.monitoring.example.com
spec:
  group: monitoring.example.com
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
              # 监控目标
              targets:
                type: array
                items:
                  type: object
                  properties:
                    type:
                      type: string
                      enum: ["service", "pod", "node", "custom"]
                    selector:
                      type: object
                      additionalProperties:
                        type: string
                    metrics:
                      type: array
                      items:
                        type: string
              
              # 告警规则
              alerts:
                type: array
                items:
                  type: object
                  properties:
                    name:
                      type: string
                    condition:
                      type: string
                    threshold:
                      type: object
                      properties:
                        value:
                          type: number
                        operator:
                          type: string
                          enum: [">=", "<=", ">", "<", "==", "!="]
                    duration:
                      type: string
                    severity:
                      type: string
                      enum: ["info", "warning", "critical"]
                    actions:
                      type: array
                      items:
                        type: object
                        properties:
                          type:
                            type: string
                            enum: ["email", "slack", "webhook", "scale"]
                          config:
                            type: object
              
              # 仪表板
              dashboards:
                type: array
                items:
                  type: object
                  properties:
                    name:
                      type: string
                    panels:
                      type: array
                      items:
                        type: object
                        properties:
                          title:
                            type: string
                          type:
                            type: string
                            enum: ["graph", "table", "gauge", "stat"]
                          query:
                            type: string
          
          status:
            type: object
            properties:
              activeAlerts:
                type: integer
              lastEvaluation:
                type: string
                format: date-time
              conditions:
                type: array
                items:
                  type: object
                  properties:
                    type:
                      type: string
                    status:
                      type: string
                    message:
                      type: string
  scope: Namespaced
  names:
    plural: monitoringrules
    singular: monitoringrule
    kind: MonitoringRule
    shortNames: ["mr"]
```

## 命令行操作

### 基本操作

```bash
# 查看 CRD
kubectl get crd
kubectl get customresourcedefinitions

# 查看特定 CRD
kubectl describe crd webapps.example.com
kubectl get crd webapps.example.com -o yaml

# 查看 CRD 支持的版本
kubectl get crd webapps.example.com -o jsonpath='{.spec.versions[*].name}'

# 查看 Custom Resource
kubectl get webapps
kubectl get webapp my-webapp -o yaml

# 使用简写
kubectl get wa  # 如果定义了 shortNames
```

### CRD 管理

```bash
# 创建 CRD
kubectl apply -f webapp-crd.yaml

# 更新 CRD
kubectl apply -f updated-webapp-crd.yaml

# 删除 CRD（会删除所有相关的 CR）
kubectl delete crd webapps.example.com

# 验证 CRD 状态
kubectl get crd webapps.example.com -o jsonpath='{.status.conditions}'

# 查看 CRD 的 OpenAPI 模式
kubectl get crd webapps.example.com -o jsonpath='{.spec.versions[0].schema.openAPIV3Schema}' | jq .
```

### Custom Resource 操作

```bash
# 创建 Custom Resource
kubectl apply -f my-webapp.yaml

# 查看 Custom Resource
kubectl get webapp my-webapp
kubectl describe webapp my-webapp

# 更新 Custom Resource
kubectl patch webapp my-webapp --type='merge' -p='{
  "spec": {
    "replicas": 5
  }
}'

# 删除 Custom Resource
kubectl delete webapp my-webapp

# 使用 kubectl scale（如果支持 scale 子资源）
kubectl scale webapp my-webapp --replicas=10

# 查看状态（如果支持 status 子资源）
kubectl get webapp my-webapp -o jsonpath='{.status}'
```

### 验证和调试

```bash
# 验证 CRD 配置
kubectl apply --dry-run=client -f webapp-crd.yaml

# 验证 Custom Resource
kubectl apply --dry-run=client -f my-webapp.yaml

# 查看 API 资源
kubectl api-resources | grep example.com

# 查看 API 版本
kubectl api-versions | grep example.com

# 获取 CRD 的详细信息
kubectl explain webapp
kubectl explain webapp.spec
kubectl explain webapp.spec.replicas

# 查看事件
kubectl get events --field-selector involvedObject.kind=WebApp
```

### 批量操作脚本

```bash
#!/bin/bash
# CRD 和 CR 管理脚本

CRD_DIR="./crds"
CR_DIR="./custom-resources"
NAMESPACE="default"

echo "=== CRD 和 Custom Resource 管理 ==="

# 1. 部署所有 CRD
echo "1. 部署 CRD..."
for crd_file in $CRD_DIR/*.yaml; do
    if [[ -f "$crd_file" ]]; then
        echo "部署 CRD: $crd_file"
        kubectl apply -f "$crd_file"
        
        # 等待 CRD 就绪
        crd_name=$(kubectl get -f "$crd_file" -o jsonpath='{.metadata.name}')
        echo "等待 CRD $crd_name 就绪..."
        kubectl wait --for=condition=Established crd/$crd_name --timeout=60s
    fi
done

# 2. 验证 CRD 状态
echo "2. 验证 CRD 状态"
for crd_file in $CRD_DIR/*.yaml; do
    if [[ -f "$crd_file" ]]; then
        crd_name=$(kubectl get -f "$crd_file" -o jsonpath='{.metadata.name}')
        echo "检查 CRD $crd_name 状态..."
        
        # 检查 CRD 是否建立
        if kubectl get crd $crd_name &>/dev/null; then
            status=$(kubectl get crd $crd_name -o jsonpath='{.status.conditions[?(@.type=="Established")].status}')
            if [[ "$status" == "True" ]]; then
                echo "✓ CRD $crd_name 已建立"
            else
                echo "✗ CRD $crd_name 未建立"
            fi
        else
            echo "✗ CRD $crd_name 不存在"
        fi
    fi
done

# 3. 部署 Custom Resources
echo "3. 部署 Custom Resources..."
for cr_file in $CR_DIR/*.yaml; do
    if [[ -f "$cr_file" ]]; then
        echo "部署 CR: $cr_file"
        kubectl apply -f "$cr_file" -n $NAMESPACE
    fi
done

# 4. 验证 Custom Resources
echo "4. 验证 Custom Resources..."
kubectl get all -n $NAMESPACE

# 5. 显示自定义资源
echo "5. 显示自定义资源..."
for crd_file in $CRD_DIR/*.yaml; do
    if [[ -f "$crd_file" ]]; then
        crd_name=$(kubectl get -f "$crd_file" -o jsonpath='{.metadata.name}')
        resource_name=$(kubectl get crd $crd_name -o jsonpath='{.spec.names.plural}')
        echo "=== $resource_name ==="
        kubectl get $resource_name -n $NAMESPACE
    fi
done

echo "完成！"
```

### CRD 版本管理脚本

```bash
#!/bin/bash
# CRD 版本管理和迁移脚本

CRD_NAME="$1"
OLD_VERSION="$2"
NEW_VERSION="$3"

if [[ -z "$CRD_NAME" || -z "$OLD_VERSION" || -z "$NEW_VERSION" ]]; then
    echo "用法: $0 <crd-name> <old-version> <new-version>"
    echo "示例: $0 webapps.example.com v1beta1 v1"
    exit 1
fi

echo "=== CRD 版本迁移: $CRD_NAME ($OLD_VERSION -> $NEW_VERSION) ==="

# 1. 检查当前 CRD 状态
echo "1. 检查当前 CRD 状态..."
if ! kubectl get crd $CRD_NAME &>/dev/null; then
    echo "错误: CRD $CRD_NAME 不存在"
    exit 1
fi

# 获取当前版本信息
current_versions=$(kubectl get crd $CRD_NAME -o jsonpath='{.spec.versions[*].name}')
echo "当前支持的版本: $current_versions"

storage_version=$(kubectl get crd $CRD_NAME -o jsonpath='{.spec.versions[?(@.storage==true)].name}')
echo "当前存储版本: $storage_version"

# 2. 备份现有资源
echo "2. 备份现有资源..."
resource_plural=$(kubectl get crd $CRD_NAME -o jsonpath='{.spec.names.plural}')
backup_dir="./backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p $backup_dir

# 备份所有命名空间的资源
for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
    resources=$(kubectl get $resource_plural -n $ns -o name 2>/dev/null)
    if [[ -n "$resources" ]]; then
        echo "备份命名空间 $ns 中的资源..."
        kubectl get $resource_plural -n $ns -o yaml > "$backup_dir/$ns-$resource_plural.yaml"
    fi
done

# 备份集群级别资源（如果适用）
scope=$(kubectl get crd $CRD_NAME -o jsonpath='{.spec.scope}')
if [[ "$scope" == "Cluster" ]]; then
    echo "备份集群级别资源..."
    kubectl get $resource_plural -o yaml > "$backup_dir/cluster-$resource_plural.yaml"
fi

echo "备份完成，保存在: $backup_dir"

# 3. 验证新版本兼容性
echo "3. 验证版本兼容性..."
if [[ "$OLD_VERSION" == "$storage_version" ]]; then
    echo "警告: 正在迁移存储版本，请确保已测试兼容性"
    read -p "是否继续? (y/N): " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo "取消迁移"
        exit 0
    fi
fi

# 4. 更新 CRD（添加新版本）
echo "4. 更新 CRD 以支持新版本..."
echo "请手动更新 CRD 定义文件以包含新版本 $NEW_VERSION"
echo "然后运行: kubectl apply -f <updated-crd.yaml>"

read -p "CRD 已更新? (y/N): " updated
if [[ "$updated" != "y" && "$updated" != "Y" ]]; then
    echo "请先更新 CRD"
    exit 1
fi

# 5. 验证新版本可用
echo "5. 验证新版本..."
new_versions=$(kubectl get crd $CRD_NAME -o jsonpath='{.spec.versions[*].name}')
if [[ "$new_versions" == *"$NEW_VERSION"* ]]; then
    echo "✓ 新版本 $NEW_VERSION 已添加"
else
    echo "✗ 新版本 $NEW_VERSION 未找到"
    exit 1
fi

# 6. 迁移资源（如果需要）
echo "6. 资源迁移..."
echo "如果需要迁移现有资源到新版本，请手动执行"
echo "示例命令:"
echo "kubectl get $resource_plural -o yaml | sed 's/$OLD_VERSION/$NEW_VERSION/g' | kubectl apply -f -"

echo "迁移完成！"
echo "备份位置: $backup_dir"
```

## 故障排查

### 常见问题

#### 1. CRD 创建失败

**问题现象**：
```bash
error validating data: ValidationError(CustomResourceDefinition.spec.versions[0].schema.openAPIV3Schema): 
unknown field "example" in io.k8s.apiextensions-apiserver.pkg.apis.apiextensions.v1.JSONSchemaProps
```

**解决方案**：
```bash
# 检查 OpenAPI 模式语法
kubectl apply --dry-run=client -f crd.yaml

# 验证 JSON Schema
cat crd.yaml | yq eval '.spec.versions[0].schema.openAPIV3Schema' - | jq .

# 常见错误修复
# 1. 移除不支持的字段（如 example）
# 2. 确保 type 字段正确
# 3. 检查 required 字段是否存在于 properties 中
```

#### 2. Custom Resource 验证失败

**问题现象**：
```bash
error validating data: ValidationError(WebApp.spec.replicas): 
invalid value: 0, must be greater than or equal to 1
```

**解决方案**：
```bash
# 检查资源定义
kubectl explain webapp.spec.replicas

# 验证资源配置
kubectl apply --dry-run=client -f webapp.yaml

# 查看 CRD 验证规则
kubectl get crd webapps.example.com -o jsonpath='{.spec.versions[0].schema.openAPIV3Schema.properties.spec}' | jq .
```

#### 3. 版本转换问题

**问题现象**：
```bash
conversion webhook for webapps.example.com failed: Post "https://webhook.example.com/convert": 
connection refused
```

**解决方案**：
```bash
# 检查转换 webhook 状态
kubectl get crd webapps.example.com -o jsonpath='{.spec.conversion}'

# 验证 webhook 服务
kubectl get svc webhook-service -n webhook-system
kubectl get endpoints webhook-service -n webhook-system

# 检查 webhook 证书
kubectl get secret webhook-certs -n webhook-system -o yaml

# 测试 webhook 连接
kubectl run test-pod --image=curlimages/curl --rm -it -- \
  curl -k https://webhook-service.webhook-system.svc.cluster.local/convert
```

### 诊断步骤

```bash
#!/bin/bash
# CRD 诊断脚本

CRD_NAME="$1"
if [[ -z "$CRD_NAME" ]]; then
    echo "用法: $0 <crd-name>"
    echo "示例: $0 webapps.example.com"
    exit 1
fi

echo "=== CRD 诊断: $CRD_NAME ==="

# 1. 检查 CRD 存在性
echo "1. 检查 CRD 存在性..."
if kubectl get crd $CRD_NAME &>/dev/null; then
    echo "✓ CRD $CRD_NAME 存在"
else
    echo "✗ CRD $CRD_NAME 不存在"
    exit 1
fi

# 2. 检查 CRD 状态
echo "2. 检查 CRD 状态..."
established=$(kubectl get crd $CRD_NAME -o jsonpath='{.status.conditions[?(@.type=="Established")].status}')
names_accepted=$(kubectl get crd $CRD_NAME -o jsonpath='{.status.conditions[?(@.type=="NamesAccepted")].status}')

echo "Established: $established"
echo "NamesAccepted: $names_accepted"

if [[ "$established" != "True" || "$names_accepted" != "True" ]]; then
    echo "✗ CRD 状态异常"
    kubectl describe crd $CRD_NAME
    exit 1
fi

# 3. 检查版本信息
echo "3. 检查版本信息..."
versions=$(kubectl get crd $CRD_NAME -o jsonpath='{.spec.versions[*].name}')
storage_version=$(kubectl get crd $CRD_NAME -o jsonpath='{.spec.versions[?(@.storage==true)].name}')
served_versions=$(kubectl get crd $CRD_NAME -o jsonpath='{.spec.versions[?(@.served==true)].name}')

echo "所有版本: $versions"
echo "存储版本: $storage_version"
echo "服务版本: $served_versions"

# 4. 检查 API 可用性
echo "4. 检查 API 可用性..."
resource_plural=$(kubectl get crd $CRD_NAME -o jsonpath='{.spec.names.plural}')
group=$(kubectl get crd $CRD_NAME -o jsonpath='{.spec.group}')

for version in $served_versions; do
    echo "测试 API: $group/$version"
    if kubectl api-resources --api-group=$group | grep -q $resource_plural; then
        echo "✓ API $group/$version 可用"
    else
        echo "✗ API $group/$version 不可用"
    fi
done

# 5. 检查现有资源
echo "5. 检查现有资源..."
scope=$(kubectl get crd $CRD_NAME -o jsonpath='{.spec.scope}')

if [[ "$scope" == "Namespaced" ]]; then
    echo "命名空间级别资源:"
    for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
        count=$(kubectl get $resource_plural -n $ns --no-headers 2>/dev/null | wc -l)
        if [[ $count -gt 0 ]]; then
            echo "  $ns: $count 个资源"
        fi
    done
else
    echo "集群级别资源:"
    count=$(kubectl get $resource_plural --no-headers 2>/dev/null | wc -l)
    echo "  总计: $count 个资源"
fi

# 6. 检查相关事件
echo "6. 检查相关事件..."
kubectl get events --all-namespaces --field-selector involvedObject.kind=$CRD_NAME

# 7. 检查 OpenAPI 模式
echo "7. 验证 OpenAPI 模式..."
for version in $served_versions; do
    echo "检查版本 $version 的模式..."
    schema=$(kubectl get crd $CRD_NAME -o jsonpath="{.spec.versions[?(@.name=='$version')].schema.openAPIV3Schema}")
    if [[ -n "$schema" ]]; then
        echo "✓ 版本 $version 有有效模式"
    else
        echo "✗ 版本 $version 缺少模式"
    fi
done

echo "诊断完成！"
```

### 常见错误和解决方案

#### 1. 模式验证错误

```yaml
# 错误示例
properties:
  replicas:
    type: integer
    minimum: 1
    example: 3  # 错误：不支持 example 字段

# 正确示例
properties:
  replicas:
    type: integer
    minimum: 1
    default: 3  # 使用 default 而不是 example
```

#### 2. 版本兼容性问题

```yaml
# 问题：存储版本变更导致数据丢失
versions:
- name: v1beta1
  served: true
  storage: false  # 从 true 改为 false
- name: v1
  served: true
  storage: true   # 新的存储版本

# 解决方案：使用转换 webhook
conversion:
  strategy: Webhook
  webhook:
    clientConfig:
      service:
        name: webhook-service
        namespace: webhook-system
        path: /convert
    conversionReviewVersions: ["v1", "v1beta1"]
```

#### 3. 子资源配置错误

```yaml
# 错误示例
subresources:
  scale:
    specReplicasPath: .spec.replicas
    statusReplicasPath: .status.replicas
    # 缺少 labelSelectorPath

# 正确示例
subresources:
  scale:
    specReplicasPath: .spec.replicas
    statusReplicasPath: .status.replicas
    labelSelectorPath: .status.selector  # 必需字段
```

## 最佳实践

### 设计原则

#### 1. API 设计

```yaml
# 良好的 API 设计示例
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: applications.platform.example.com
  # 使用标签进行分类
  labels:
    app.kubernetes.io/name: application-operator
    app.kubernetes.io/component: crd
    app.kubernetes.io/version: v1.0.0
spec:
  group: platform.example.com  # 使用有意义的组名
  
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
              # 使用清晰的字段名
              applicationName:
                type: string
                description: "应用程序名称"
                minLength: 1
                maxLength: 63
                pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$'
              
              # 提供合理的默认值
              replicas:
                type: integer
                minimum: 1
                maximum: 100
                default: 1
                description: "副本数量"
              
              # 使用枚举限制选项
              environment:
                type: string
                enum: ["development", "staging", "production"]
                default: "development"
                description: "部署环境"
              
              # 嵌套对象结构清晰
              resources:
                type: object
                description: "资源配置"
                properties:
                  requests:
                    type: object
                    properties:
                      cpu:
                        type: string
                        pattern: '^[0-9]+m?$'
                        default: "100m"
                      memory:
                        type: string
                        pattern: '^[0-9]+[KMGT]i$'
                        default: "128Mi"
                  limits:
                    type: object
                    properties:
                      cpu:
                        type: string
                        pattern: '^[0-9]+m?$'
                        default: "500m"
                      memory:
                        type: string
                        pattern: '^[0-9]+[KMGT]i$'
                        default: "512Mi"
            
            # 明确必需字段
            required: ["applicationName"]
          
          status:
            type: object
            description: "应用程序状态"
            properties:
              phase:
                type: string
                enum: ["Pending", "Running", "Failed"]
                description: "当前阶段"
              
              conditions:
                type: array
                description: "状态条件"
                items:
                  type: object
                  properties:
                    type:
                      type: string
                    status:
                      type: string
                      enum: ["True", "False", "Unknown"]
                    reason:
                      type: string
                    message:
                      type: string
                    lastTransitionTime:
                      type: string
                      format: date-time
                  required: ["type", "status"]
    
    # 提供有用的打印列
    additionalPrinterColumns:
    - name: App Name
      type: string
      description: Application name
      jsonPath: .spec.applicationName
    - name: Environment
      type: string
      description: Deployment environment
      jsonPath: .spec.environment
    - name: Replicas
      type: integer
      description: Number of replicas
      jsonPath: .spec.replicas
    - name: Status
      type: string
      description: Current status
      jsonPath: .status.phase
    - name: Age
      type: date
      jsonPath: .metadata.creationTimestamp
  
  scope: Namespaced
  
  names:
    plural: applications
    singular: application
    kind: Application
    # 提供有用的简写
    shortNames: ["app", "apps"]
    # 分类便于发现
    categories: ["all", "platform"]
```

#### 2. 版本管理策略

```yaml
# 版本演进策略
versions:
# 当前稳定版本
- name: v1
  served: true
  storage: true
  schema:
    # 完整的 v1 模式

# 下一个版本（开发中）
- name: v1alpha1
  served: true
  storage: false
  schema:
    # 新功能的模式

# 废弃版本（向后兼容）
- name: v1beta1
  served: true
  storage: false
  deprecated: true
  deprecationWarning: "platform.example.com/v1beta1 Application is deprecated; use platform.example.com/v1 Application"
  schema:
    # 简化的向后兼容模式
```

#### 3. 安全考虑

```yaml
# RBAC 配置示例
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: application-operator
rules:
# CRD 管理权限
- apiGroups: ["apiextensions.k8s.io"]
  resources: ["customresourcedefinitions"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]

# Custom Resource 权限
- apiGroups: ["platform.example.com"]
  resources: ["applications"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# 状态更新权限
- apiGroups: ["platform.example.com"]
  resources: ["applications/status"]
  verbs: ["get", "update", "patch"]

# 扩缩容权限（如果支持）
- apiGroups: ["platform.example.com"]
  resources: ["applications/scale"]
  verbs: ["get", "update", "patch"]

---
# 用户权限示例
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: application-user
rules:
# 只读权限
- apiGroups: ["platform.example.com"]
  resources: ["applications"]
  verbs: ["get", "list", "watch"]

# 特定资源的管理权限
- apiGroups: ["platform.example.com"]
  resources: ["applications"]
  resourceNames: ["my-app"]
  verbs: ["update", "patch"]
```

### 监控和告警

```yaml
# Prometheus 监控规则
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: crd-monitoring
  labels:
    prometheus: kube-prometheus
spec:
  groups:
  - name: crd.rules
    rules:
    # CRD 可用性监控
    - alert: CRDNotEstablished
      expr: |
        apiserver_crd_established{condition="False"} == 1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "CRD {{ $labels.crd }} is not established"
        description: "CRD {{ $labels.crd }} has not been established for more than 5 minutes."
    
    # Custom Resource 数量监控
    - alert: CustomResourceCountHigh
      expr: |
        apiserver_current_inflight_requests{requestKind="Application"} > 1000
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High number of Custom Resources"
        description: "There are {{ $value }} Application resources, which is unusually high."
    
    # API 请求错误率
    - alert: CustomResourceAPIErrors
      expr: |
        rate(apiserver_request_total{resource="applications",code=~"5.."}[5m]) > 0.1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High error rate for Custom Resource API"
        description: "Error rate for Application API is {{ $value }} errors per second."
```

### 自动化管理

```bash
#!/bin/bash
# CRD 自动化部署和管理脚本

set -euo pipefail

# 配置
CRD_DIR="./crds"
CR_DIR="./examples"
NAMESPACE="default"
DRY_RUN=${DRY_RUN:-false}
VERBOSE=${VERBOSE:-false}

# 日志函数
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        log "$*"
    fi
}

error() {
    log "ERROR: $*" >&2
}

# 验证 CRD 函数
validate_crd() {
    local crd_file="$1"
    
    verbose "验证 CRD 文件: $crd_file"
    
    # 语法验证
    if ! kubectl apply --dry-run=client -f "$crd_file" &>/dev/null; then
        error "CRD 文件语法错误: $crd_file"
        return 1
    fi
    
    # 检查必需字段
    local crd_name
    crd_name=$(yq eval '.metadata.name' "$crd_file")
    if [[ "$crd_name" == "null" ]]; then
        error "CRD 缺少名称: $crd_file"
        return 1
    fi
    
    # 检查版本
    local versions
    versions=$(yq eval '.spec.versions | length' "$crd_file")
    if [[ "$versions" -eq 0 ]]; then
        error "CRD 缺少版本定义: $crd_file"
        return 1
    fi
    
    # 检查存储版本
    local storage_versions
    storage_versions=$(yq eval '.spec.versions[] | select(.storage == true) | .name' "$crd_file" | wc -l)
    if [[ "$storage_versions" -ne 1 ]]; then
        error "CRD 必须有且仅有一个存储版本: $crd_file"
        return 1
    fi
    
    verbose "✓ CRD 验证通过: $crd_file"
    return 0
}

# 部署 CRD 函数
deploy_crd() {
    local crd_file="$1"
    local crd_name
    
    crd_name=$(yq eval '.metadata.name' "$crd_file")
    log "部署 CRD: $crd_name"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "[DRY RUN] 将部署 CRD: $crd_name"
        return 0
    fi
    
    # 应用 CRD
    if kubectl apply -f "$crd_file"; then
        log "✓ CRD 应用成功: $crd_name"
    else
        error "CRD 应用失败: $crd_name"
        return 1
    fi
    
    # 等待 CRD 建立
    log "等待 CRD 建立: $crd_name"
    if kubectl wait --for=condition=Established crd/$crd_name --timeout=60s; then
        log "✓ CRD 已建立: $crd_name"
    else
        error "CRD 建立超时: $crd_name"
        return 1
    fi
    
    return 0
}

# 验证 Custom Resource 函数
validate_cr() {
    local cr_file="$1"
    
    verbose "验证 Custom Resource: $cr_file"
    
    # 语法验证
    if ! kubectl apply --dry-run=client -f "$cr_file" &>/dev/null; then
        error "Custom Resource 语法错误: $cr_file"
        return 1
    fi
    
    verbose "✓ Custom Resource 验证通过: $cr_file"
    return 0
}

# 主函数
main() {
    log "开始 CRD 自动化管理"
    
    # 检查依赖
    for cmd in kubectl yq; do
        if ! command -v $cmd &>/dev/null; then
            error "缺少依赖命令: $cmd"
            exit 1
        fi
    done
    
    # 验证目录
    if [[ ! -d "$CRD_DIR" ]]; then
        error "CRD 目录不存在: $CRD_DIR"
        exit 1
    fi
    
    # 1. 验证和部署 CRD
    log "=== 阶段 1: 验证和部署 CRD ==="
    
    local crd_files=()
    while IFS= read -r -d '' file; do
        crd_files+=("$file")
    done < <(find "$CRD_DIR" -name "*.yaml" -o -name "*.yml" -print0)
    
    if [[ ${#crd_files[@]} -eq 0 ]]; then
        log "未找到 CRD 文件"
    else
        for crd_file in "${crd_files[@]}"; do
            if validate_crd "$crd_file"; then
                deploy_crd "$crd_file"
            else
                error "跳过无效的 CRD: $crd_file"
            fi
        done
    fi
    
    # 2. 验证和部署示例 Custom Resource
    if [[ -d "$CR_DIR" ]]; then
        log "=== 阶段 2: 验证和部署示例 Custom Resource ==="
        
        local cr_files=()
        while IFS= read -r -d '' file; do
            cr_files+=("$file")
        done < <(find "$CR_DIR" -name "*.yaml" -o -name "*.yml" -print0)
        
        if [[ ${#cr_files[@]} -eq 0 ]]; then
            log "未找到 Custom Resource 文件"
        else
            for cr_file in "${cr_files[@]}"; do
                if validate_cr "$cr_file"; then
                    if [[ "$DRY_RUN" == "true" ]]; then
                        log "[DRY RUN] 将部署 Custom Resource: $cr_file"
                    else
                        log "部署 Custom Resource: $cr_file"
                        kubectl apply -f "$cr_file" -n "$NAMESPACE"
                    fi
                else
                    error "跳过无效的 Custom Resource: $cr_file"
                fi
            done
        fi
    fi
    
    # 3. 验证部署结果
    if [[ "$DRY_RUN" != "true" ]]; then
        log "=== 阶段 3: 验证部署结果 ==="
        
        # 显示 CRD 状态
        log "CRD 状态:"
        kubectl get crd
        
        # 显示 Custom Resource
        log "Custom Resource 状态:"
        for crd_file in "${crd_files[@]}"; do
            local crd_name resource_name
            crd_name=$(yq eval '.metadata.name' "$crd_file")
            resource_name=$(yq eval '.spec.names.plural' "$crd_file")
            
            if kubectl get crd "$crd_name" &>/dev/null; then
                log "$resource_name 资源:"
                kubectl get "$resource_name" -A 2>/dev/null || log "  无资源"
            fi
        done
    fi
    
    log "CRD 自动化管理完成"
}

# 显示帮助
show_help() {
    cat << EOF
CRD 自动化管理脚本

用法: $0 [选项]

选项:
  -h, --help     显示帮助信息
  -d, --dry-run  干运行模式，不实际部署
  -v, --verbose  详细输出
  -n, --namespace NAMESPACE  指定命名空间 (默认: default)
  --crd-dir DIR  CRD 文件目录 (默认: ./crds)
  --cr-dir DIR   Custom Resource 文件目录 (默认: ./examples)

环境变量:
  DRY_RUN=true   启用干运行模式
  VERBOSE=true   启用详细输出

示例:
  $0                           # 正常部署
  $0 --dry-run                 # 干运行
  $0 --verbose --namespace prod # 详细输出并部署到 prod 命名空间
EOF
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --crd-dir)
            CRD_DIR="$2"
            shift 2
            ;;
        --cr-dir)
            CR_DIR="$2"
            shift 2
            ;;
        *)
            error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 运行主函数
main
```

## 总结

Custom Resource Definition (CRD) 是 Kubernetes 最强大的扩展机制之一，它允许用户：

### 核心价值

1. **API 扩展**：无需修改 Kubernetes 核心代码即可添加新的资源类型
2. **声明式管理**：使用熟悉的 YAML 和 kubectl 管理自定义资源
3. **原生集成**：与 Kubernetes 生态系统完全集成
4. **版本控制**：支持 API 版本演进和向后兼容

### 使用建议

1. **设计阶段**：
   - 仔细设计 API 结构，考虑未来扩展性
   - 提供合理的默认值和验证规则
   - 使用清晰的字段名和描述

2. **开发阶段**：
   - 从简单的 CRD 开始，逐步添加复杂功能
   - 充分测试 OpenAPI 模式验证
   - 考虑版本兼容性和迁移策略

3. **运维阶段**：
   - 建立完善的监控和告警
   - 定期备份 Custom Resource
   - 制定版本升级计划

### 适用场景

- **应用程序管理**：定义应用程序生命周期管理资源
- **基础设施管理**：管理数据库、消息队列等基础设施
- **平台抽象**：为开发者提供高级抽象接口
- **Operator 开发**：作为 Operator 模式的基础

CRD 是构建 Kubernetes 原生应用和平台的基石，正确使用可以大大提升系统的可扩展性和可维护性。