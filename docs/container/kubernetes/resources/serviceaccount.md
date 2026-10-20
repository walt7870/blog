---
title: Kubernetes ServiceAccount
author: Walt
date: 2026-07-18
---

# Kubernetes ServiceAccount

ServiceAccount 是 Namespace 内工作负载访问 Kubernetes API 或外部身份系统时使用的机器身份。它本身不包含权限；RoleBinding/ClusterRoleBinding 把权限授予该身份。

例如订单 API 需要直接读取一个 ConfigMap，可使用 `orders/order-api` 身份并只授予该对象的 `get`。另一项需求若是调用外部对账服务，应签发面向该接收方的 Token，再由对账服务自己的策略决定允许什么；Kubernetes Role 不会自动变成外部服务权限。

![ServiceAccount Token 签发、投影轮换与两种接收方的验证边界](/container/serviceaccount-token-audience.svg)

## 每个工作负载使用专用身份

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-api
  namespace: orders
automountServiceAccountToken: false
```

示例要求 `orders` Namespace 已存在。不访问 Kubernetes API 的应用应关闭默认 API Token 挂载。需要直接调用 Kubernetes API 时，在 Pod 上显式启用并授予最小权限；以下是 Pod 字段片段，Deployment 中放在 `.spec.template.spec`：

```yaml
serviceAccountName: order-api
automountServiceAccountToken: true
```

不要让多个无关服务共享同一 ServiceAccount，也不要用 Namespace 的 `default` ServiceAccount 承载业务权限。

Pod 的 `automountServiceAccountToken` 设置优先于 ServiceAccount；关闭的是默认自动投影，不能阻止工作负载作者显式声明自己的 projected Token 卷。普通 Secret/ConfigMap 挂载也不会因此被禁用。能创建工作负载并选择高权限 ServiceAccount 的主体，需要额外准入与授权约束。

## TokenRequest 与投影 Token

现代 Pod 的默认 API 凭据使用短期、可轮换、绑定到 ServiceAccount/Pod 的投影 Token。下面是**只调用外部对账服务**时的 Pod spec 片段；合并到已有模板并保留镜像、启动参数等字段，避免同时注入无用的默认 API Token：

```yaml
serviceAccountName: order-api
automountServiceAccountToken: false
containers:
  - name: api
    volumeMounts:
      - name: reconciliation-token
        mountPath: /var/run/tokens/reconciliation
        readOnly: true
volumes:
  - name: reconciliation-token
    projected:
      sources:
        - serviceAccountToken:
            path: token
            audience: orders-reconciliation
            expirationSeconds: 3600
```

外部服务需配置可信 issuer、JWKS 和预期 audience，并在校验签名、有效期后识别 `system:serviceaccount:orders:order-api`，继续执行自身业务授权。API Server 不接受该 audience 时，这份 Token 不能用于读 Kubernetes ConfigMap；下面的 RBAC 例子对应前一节默认 API Token 场景。

`expirationSeconds` 是请求时长，实际有效期以签发结果为准。kubelet 负责刷新投影文件，应用负责重读路径，不能永久缓存启动时的字符串，也不应用 `subPath` 挂载轮换文件。只做离线 JWT 校验的外部系统，还需考虑删除 Pod 后直到 Token 到期之间的撤销边界；需要实时校验对象有效性时，应评估 TokenReview 及其可用性和调用权限。

已批准的临时认证排查可请求独立短期 Token；下面只展示命令，不把 Token 值写入示例或日志：

```bash
kubectl create token order-api -n orders --audience=orders-reconciliation --duration=10m
```

该命令会把 Token 输出到终端，它不是 kubelet 管理的轮换文件，默认也未绑定到某个 Pod。不要把输出粘贴到工单、命令参数或 CI 日志；调试身份、请求时长和输出渠道都应受控。TokenRequest 权限本身也应纳入最小权限审查。

## RBAC 绑定

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: config-reader
  namespace: orders
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    resourceNames: ["order-api-config"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: order-api-config-reader
  namespace: orders
subjects:
  - kind: ServiceAccount
    name: order-api
    namespace: orders
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: config-reader
```

优先使用 RoleBinding 把权限限制在 Namespace。即使引用 ClusterRole，RoleBinding 也只在自身 Namespace 授权；ClusterRoleBinding 才会把权限扩展到集群范围。

此例允许应用代码直接 `GET` 单个 ConfigMap，不允许列举整个空间。如果只通过普通卷使用 ConfigMap，不需要为了挂载再给应用身份增加这条 API 读取权限。改用 informer/list/watch 时也不能沿用这份仅 `get` 的合同。

## 云工作负载身份

访问云 API 时，优先使用云厂商的 workload identity/联合身份，把 ServiceAccount 映射到短期云凭据。不要把长期云密钥存进 Secret 并分发给所有副本。

要验证 Token 轮换、Pod 重建、节点迁移和身份系统不可用时的行为，并限制哪些 ServiceAccount 可以映射高权限云角色。

## 排障

```bash
kubectl get serviceaccount order-api -n orders -o yaml
kubectl auth can-i get configmap/order-api-config -n orders \
  --as=system:serviceaccount:orders:order-api
kubectl auth can-i --list -n orders \
  --as=system:serviceaccount:orders:order-api
pod_name=替换为实际订单Pod名称
kubectl describe pod "$pod_name" -n orders
```

模拟身份命令要求操作者具备相应权限。`can-i` 只验证授权，无法证明投影文件存在、Token 已刷新或外部服务接受它。验证轮换时记录文件更新时间与非敏感到期元数据，再以新 Token 完成受控请求；不要通过输出 Token 正文作验收。

| 现象 | 优先检查 |
| --- | --- |
| Pod 创建失败 | ServiceAccount 名称和 Namespace |
| API 返回 401 | Token 挂载、有效期、issuer/audience |
| API 返回 403 | Role、Binding、资源、verb、subresource |
| 云 API 拒绝 | 联合身份映射、audience、云角色策略 |
| Token 不应存在却被挂载 | Pod 与 ServiceAccount 的 automount 设置 |
