---
title: Kubernetes CRD 设计与版本演进
author: Walt
date: 2026-07-18
---

# Kubernetes CRD 设计与版本演进

CustomResourceDefinition（CRD）向 Kubernetes API 注册新的资源类型，Custom Resource（CR）是该类型的实例。CRD 解决的是 API 结构、校验、版本、存储和通用元数据，不会自动创建 Deployment，也不会凭空获得备份、升级或恢复逻辑；这些行为必须由控制器实现。

## 先判断是否需要 CRD

CRD 适合表达低频、声明式、需要被控制器观察的平台意图，例如 `DatabaseCluster`、`Application` 或 `Certificate`。以下内容通常不适合写进 CR：

- 高频指标、日志、追踪或事件流。
- 业务交易、用户数据或大体量应用状态。
- 需要复杂自定义存储、子资源协议或非声明式交互的数据服务。
- 只为减少几份 YAML 重复而创建、却没有稳定 API 契约的包装层。

简单模板优先使用 Helm 或 Kustomize；需要更灵活 API 行为时再评估 Aggregated API。

## 一个具备生产语义的最小 CRD

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: appreleases.platform.example.com
spec:
  group: platform.example.com
  scope: Namespaced
  names:
    kind: AppRelease
    plural: appreleases
    singular: apprelease
    shortNames: [ar]
  versions:
    - name: v1alpha1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          required: [spec]
          properties:
            spec:
              type: object
              required: [image, replicas]
              properties:
                image:
                  type: string
                  minLength: 1
                replicas:
                  type: integer
                  minimum: 1
                  maximum: 20
            status:
              type: object
              properties:
                observedGeneration:
                  type: integer
                  format: int64
                readyReplicas:
                  type: integer
                conditions:
                  type: array
                  x-kubernetes-list-type: map
                  x-kubernetes-list-map-keys: [type]
                  items:
                    type: object
                    required: [type, status, reason, message, lastTransitionTime]
                    properties:
                      type: { type: string }
                      status: { type: string, enum: ["True", "False", "Unknown"] }
                      reason: { type: string }
                      message: { type: string }
                      observedGeneration: { type: integer, format: int64 }
                      lastTransitionTime: { type: string, format: date-time }
      subresources:
        status: {}
        scale:
          specReplicasPath: .spec.replicas
          statusReplicasPath: .status.readyReplicas
```

CRD 名称必须是 `<plural>.<group>`。schema 不只是文档，它在 API Server 端拒绝无效输入，并影响默认值、字段裁剪、Server-Side Apply 和客户端生成。

## Spec、Status 和 Conditions

`spec` 描述用户期望，`status` 描述控制器已经观察到的事实。控制器不应修改用户声明来表示执行结果。

Conditions 适合表达多个可独立判断的方面，例如 `Ready`、`Progressing`、`Degraded`。每个 Condition 应包含稳定的 `type`、机器可判断的 `status` 和 `reason`、供人阅读的 `message`，并记录 `observedGeneration`。

当 `status.observedGeneration` 小于 `metadata.generation` 时，现有 Ready 可能属于旧 spec。平台界面如果忽略这个差异，就会在新发布尚未处理时显示错误的绿色状态。

## CEL 校验与不可变规则

OpenAPI schema 负责类型、必填、范围和格式；跨字段或更新前后比较可以使用 CRD 的 CEL validation rules。规则应快速、确定且不依赖外部网络。

```yaml
x-kubernetes-validations:
  - rule: "self.minReplicas <= self.maxReplicas"
    message: "minReplicas 不能大于 maxReplicas"
  - rule: "self.region == oldSelf.region"
    message: "region 创建后不可修改"
```

业务上允许但暂时无法执行的状态，不应伪装成 schema 错误。例如外部云配额不足应由控制器写入 Condition，而不是要求 API Server 调用外部服务校验。

## served、storage 与版本转换

一个 CRD 可以同时提供多个 API 版本，但任意时刻只能有一个 storage 版本。

| 字段 | 含义 |
| --- | --- |
| `served: true` | 客户端可以通过该版本读写对象 |
| `storage: true` | 新写入对象以该版本保存 |
| `status.storedVersions` | 历史上仍可能存在于存储中的版本 |

把 `storage` 从 `v1alpha1` 切到 `v1beta1` 不会自动重写旧对象。迁移应按以下顺序进行：

1. 新版本先 `served: true`，保持旧版本可用。
2. 部署并验证双向转换；无 schema 变化可以使用 `None`，复杂变化需要 Conversion Webhook。
3. 切换 storage 版本，新写入开始使用新表示。
4. 读取并重写历史对象，确认 `storedVersions` 已收敛。
5. 检查所有客户端和控制器不再使用旧版本，再停止 served。

Conversion Webhook 不可用可能阻断对应 CR 的读取、写入和删除。它需要高可用、短超时、证书轮换、监控和不依赖自身 CR 才能启动的部署路径。

复杂版本转换宜采用 hub-and-spoke：所有 served 版本先转换到一个内部 hub，再由 hub 转到目标版本。这样新增版本只需实现与 hub 的双向转换，不必维护每两个版本之间的组合。转换必须保留当前版本无法表达但未来往返仍需要的数据，否则旧客户端读写一次就可能造成字段丢失。

版本迁移实验至少包含：创建旧版本对象、通过新版本读取、修改后再用旧版本读取、切换 storage、重写历史对象、停用旧 served 版本，最后验证备份恢复。只测试“新对象能创建”无法证明兼容性。

## 删除与 Finalizer

Finalizer 把删除变成一个状态机。对象收到删除请求后出现 `deletionTimestamp`，控制器完成外部清理，再移除自己负责的 finalizer。

可靠实现需要：

- 清理动作可重复，外部资源不存在也视为成功。
- 清理失败写入 Condition/Event，并进入限速重试。
- 不阻塞与该对象无关的控制循环。
- 提供人工接管步骤，但不把“强删 finalizer”当常规恢复手段。

用户手工删除 finalizer 只会让 Kubernetes 忘记等待，不会自动清理云数据库、DNS 或密钥。

## 验证清单

```bash
kubectl apply -f apprelease-crd.yaml
kubectl explain apprelease.spec
kubectl get crd appreleases.platform.example.com -o yaml
kubectl get apprelease -A -o custom-columns='NS:.metadata.namespace,NAME:.metadata.name,GEN:.metadata.generation,OBS:.status.observedGeneration,READY:.status.conditions[?(@.type=="Ready")].status'
```

- 无效字段、越界值和跨字段错误会在 API Server 端被拒绝。
- Status 子资源只能由具备对应权限的控制器更新。
- 重复创建、修改、删除和控制器重启后对象仍能收敛。
- 新旧版本往返转换不丢字段，历史对象完成存储迁移。
- 删除外部依赖失败时对象保留证据，而不是永久无解释地 Terminating。
