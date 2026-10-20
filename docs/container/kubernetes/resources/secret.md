---
title: Kubernetes Secret 与凭据边界
author: Walt
date: 2026-07-18
---

# Kubernetes Secret 与凭据边界

Secret 用于让 Pod、控制器和其他资源引用密码、Token、证书等敏感数据。它把凭据从镜像和普通配置中分离出来，但不是完整密钥系统：`data` 字段只是 Base64 编码，默认存储是否加密、谁能读取、怎样轮换和审计仍取决于集群配置。

## 创建时避免把明文留在命令历史

以下命令要求 `orders` Namespace 已存在，两个本地文件由批准的凭据渠道提供，限制文件权限并避免尾部换行意外成为密码的一部分。命令不会把明文放进参数，但管道仍传递编码后的敏感值，CI 不应开启命令追踪或保存该输出：

```bash
kubectl create secret generic order-db -n orders \
  --from-file=username=./username.txt \
  --from-file=password=./password.txt \
  --dry-run=client -o yaml | kubectl apply -n orders -f -
```

在清单中使用 `stringData` 只省去手工 Base64，不会让 Git 中的明文变安全。下面是字段示意，密码占位值必须在受控注入阶段替换；公开仓库和普通配置仓库不应保存真实 Secret 清单。

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: order-db
  namespace: orders
type: Opaque
stringData:
  username: order_app
  password: replace-outside-git
```

生产系统通常采用外部密钥管理、加密 Git 文件或部署时注入，并通过控制器把短期凭据同步或挂载给工作负载。

## 环境变量和卷挂载

环境变量只在容器创建时读取，Secret 更新不会改变已运行进程的环境。卷投影可以在 kubelet 同步后更新文件，但应用是否重新加载由应用自身决定。以下是 `.spec.template.spec` 的片段，需合并到已有工作负载模板，并保留镜像、启动参数等配置：

```yaml
volumes:
  - name: db-credentials
    secret:
      secretName: order-db
containers:
  - name: api
    volumeMounts:
      - name: db-credentials
        mountPath: /var/run/secrets/order-db
        readOnly: true
```

Secret 与 Pod 必须同 Namespace。`subPath` 单文件挂载不会收到自动更新；目录投影的传播也有同步和缓存延迟。只把卷挂给需要它的容器，并按应用 UID/GID 校验文件可读性。只有需要单个值且重启生效可接受时才使用环境变量。

## 凭据轮换顺序

![数据库先接受新旧凭据，再切换应用并撤销旧凭据的轮换时序](/container/secret-rotation-order.svg)

例如订单 API 使用数据库账号 A，轮换时先创建权限相同的账号 B，并让 A、B 在迁移窗口内都可认证，再把 Secret 更新为 B。挂载文件更新后，应用还需重新建立连接池，或者通过受控滚动发布替换全部副本；只验证旧连接仍能查询，不能证明新凭据有效。

逐个副本记录非敏感凭据版本、成功建立新连接的结果和认证失败指标。确认定时任务、缩容后重新启动的副本也不再依赖 A，才撤销 A。若数据库只支持单密码，无法提供重叠窗口，就需要采用双账号或明确维护窗口，不能假定更新 Secret 能让两端同时切换。

回滚必须以旧凭据仍有效为前提。撤销 A 后直接回滚只引用 A 的旧工作负载，会再次认证失败；此时需回滚到兼容 B 的配置或按数据库恢复流程处理。外部密钥控制器同步失败时，还要区分“已运行进程已有缓存”和“新 Pod 等不到所需 Secret”，两者可用性不同。

## ServiceAccount Token

现代工作负载应使用 TokenRequest/Projected ServiceAccount Token，由 kubelet 注入短期、可轮换、带 audience 的 Token。不要手工创建长期 `kubernetes.io/service-account-token` Secret 作为默认方案。

下面两个字段位于 Pod spec（Deployment 中为 `.spec.template.spec`），示例要求专用 ServiceAccount 已存在：

```yaml
serviceAccountName: order-api
automountServiceAccountToken: false
```

不访问 Kubernetes API 的 Pod 可以关闭自动挂载，这不会阻止普通 Secret 卷由 kubelet 挂载。需要访问时，为专用 ServiceAccount 授予最小 Role；应用还必须重新读取 kubelet 轮换后的 Token，不能把启动时读到的值永久缓存。身份与授权细节见 [ServiceAccount](./serviceaccount.md) 和 [RBAC](./rbac.md)。

## 生产安全边界

至少检查：

- kube-apiserver 是否启用 Secret 静态加密，并有轮换和重加密流程。
- RBAC 是否限制 `get/list/watch` Secret，是否存在间接读取权限。
- etcd 备份、审计日志、终端历史和 CI 输出是否泄露凭据。
- 节点、Pod exec、debug 容器和同一 Namespace 的权限边界。
- 外部密钥控制器不可用时，现有 Pod 和新 Pod 各会发生什么。
- 凭据轮换是否能在不扩大故障的情况下完成。

Base64、Namespace 和 Secret 资源类型都不等于保密。安全性来自加密、最小权限、短期凭据、轮换和审计的组合。

允许创建 Pod 或 Deployment 的主体，往往可以通过新工作负载引用同 Namespace 的 Secret；只禁止其直接 `get secret` 不足以阻断间接读取，还需准入约束和工作负载管理边界。普通 Secret 卷由 kubelet 获取，不要求应用 ServiceAccount 自己具备 `get secret`；应用代码直接调用 API 读取时才检查该身份的 API 权限。

## 排查

```bash
kubectl get secret order-db -n orders
pod_name=替换为实际订单Pod名称
kubectl describe pod "$pod_name" -n orders
kubectl auth can-i get secret/order-db -n orders --as=system:serviceaccount:orders:order-api
kubectl get events -n orders --sort-by=.metadata.creationTimestamp
```

`auth can-i --as` 需要操作者具有相应模拟身份权限，它检查 API 读取授权，不是卷挂载健康探测。排查时不必解码或输出凭据正文。

| 现象 | 检查 |
| --- | --- |
| Pod 创建时报 Secret not found | 名称、Namespace、部署顺序 |
| volume 挂载失败 | Secret key、items 映射、kubelet Events |
| Secret 已更新但应用仍用旧值 | 注入方式、kubelet 同步、应用重载或 Pod 重建 |
| API 返回 401 | Token 是否有效、过期，audience 是否被接收端接受 |
| API 返回 403 | 已认证身份、Role/Binding、资源、Namespace 和 verb |
| 轮换后部分副本失败 | 新旧凭据重叠窗口、连接池和滚动策略 |
