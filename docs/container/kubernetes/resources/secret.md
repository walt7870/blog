---
title: Kubernetes Secret 与凭据边界
author: Walt
date: 2026-07-18
---

# Kubernetes Secret 与凭据边界

Secret 用于让 Pod、控制器和其他资源引用密码、Token、证书等敏感数据。它把凭据从镜像和普通配置中分离出来，但不是完整密钥系统：`data` 字段只是 Base64 编码，默认存储是否加密、谁能读取、怎样轮换和审计仍取决于集群配置。

## 创建时避免把明文留在命令历史

```bash
kubectl create secret generic order-db \
  --from-file=username=./username.txt \
  --from-file=password=./password.txt \
  --dry-run=client -o yaml | kubectl apply -f -
```

在清单中使用 `stringData` 只省去手工 Base64，不会让 Git 中的明文变安全。公开仓库和普通配置仓库不应保存真实 Secret 清单。

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

环境变量只在容器创建时读取，Secret 更新不会改变已运行进程的环境。卷投影可以在 kubelet 同步后更新文件，但应用是否重新加载由应用自身决定。

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

只有需要单个值且重启生效可接受时才使用环境变量。需要轮换时，优先让应用读取文件并支持重载，或用受控滚动发布替换 Pod。

## ServiceAccount Token

现代工作负载应使用 TokenRequest/Projected ServiceAccount Token，由 kubelet 注入短期、可轮换、带 audience 的 Token。不要手工创建长期 `kubernetes.io/service-account-token` Secret 作为默认方案。

```yaml
serviceAccountName: order-api
automountServiceAccountToken: false
```

不访问 Kubernetes API 的 Pod 可以关闭自动挂载。需要访问时，为专用 ServiceAccount 授予最小 Role，不使用默认账号和宽泛 ClusterRoleBinding。

## 生产安全边界

至少检查：

- kube-apiserver 是否启用 Secret 静态加密，并有轮换和重加密流程。
- RBAC 是否限制 `get/list/watch` Secret，是否存在间接读取权限。
- etcd 备份、审计日志、终端历史和 CI 输出是否泄露凭据。
- 节点、Pod exec、debug 容器和同一 Namespace 的权限边界。
- 外部密钥控制器不可用时，现有 Pod 和新 Pod 各会发生什么。
- 凭据轮换是否能在不扩大故障的情况下完成。

Base64、Namespace 和 Secret 资源类型都不等于保密。安全性来自加密、最小权限、短期凭据、轮换和审计的组合。

## 排查

```bash
kubectl get secret order-db -n orders
kubectl describe pod <pod> -n orders
kubectl auth can-i get secret/order-db -n orders --as=system:serviceaccount:orders:order-api
kubectl get events -n orders --sort-by=.metadata.creationTimestamp
```

| 现象 | 检查 |
| --- | --- |
| Pod 创建时报 Secret not found | 名称、Namespace、部署顺序 |
| volume 挂载失败 | Secret key、items 映射、kubelet Events |
| Secret 已更新但应用仍用旧值 | 注入方式、kubelet 同步、应用重载或 Pod 重建 |
| ServiceAccount API 请求 403 | Token audience、Role/Binding、请求资源和 verb |
| 轮换后部分副本失败 | 新旧凭据重叠窗口、连接池和滚动策略 |
