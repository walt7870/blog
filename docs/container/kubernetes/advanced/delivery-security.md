---
title: Kubernetes GitOps、策略与供应链安全
author: Walt
date: 2026-07-18
---

# Kubernetes GitOps、策略与供应链安全

GitOps 解决“期望从哪里来、谁改变过”，Admission 解决“哪些对象允许进入”，运行时策略和供应链证据解决“进入后能否被信任”。三者是连续控制链，不能用“仓库有审批”替代集群准入，也不能用一个镜像扫描结果替代来源、签名和部署身份。

## GitOps 是双状态控制循环

Argo CD 区分目标状态、集群 live state、sync status、sync operation 和 health；对象 Synced 只表示期望与实际清单一致，不代表应用健康。Flux 把 Git/OCI 等 Source 拉取为 artifact，再由 Kustomize、Helm 等控制器分别调谐。

```text
Git/OCI Source -> 拉取并校验 artifact -> 渲染/组合 -> Apply
       ^                                      |
       |                                      v
  审批与晋级 <- 状态、漂移、Health、业务 SLI <- live cluster
```

要明确四种策略：

- 漂移后自动修复还是只告警。
- 删除 Git 中对象时是否允许 prune。
- 生成物在 CI 固化，还是由集群内控制器动态渲染。
- Git、OCI、集群实际状态和外部资源中，哪个是灾难恢复来源。

ApplicationSet 或 Flux Kustomization 可以生成多集群/多环境实例，但生成正确不代表所有目标都健康。平台应按目标集群展示接受、同步、健康和业务验证，不应压成一个绿色状态。

## 渐进式交付需要业务停止条件

Deployment RollingUpdate 只根据 Pod 数量和 Ready 推进，不理解业务错误率。Canary 或 Blue/Green 控制器可以分批改权重并运行分析，但指标查询失败、样本不足和分析超时必须有明确行为。

可靠发布至少关联：

- 镜像 digest、配置版本和变更单。
- 当前流量权重、Ready 副本和 EndpointSlice。
- 错误率、延迟、饱和度及关键业务指标。
- 自动暂停、回退阈值和人工接管条件。

回退也必须声明状态边界。镜像可以切回，不代表数据库 schema、消息格式或外部 API 副作用可逆。

## Admission：先用内置声明式能力

ValidatingAdmissionPolicy 使用 CEL 在 API Server 内完成声明式校验，避免一次额外网络调用。它需要 Policy 定义表达式，再由 Binding 选择资源、参数和 `validationActions`。适合镜像格式、标签、资源限制和字段组合等确定性规则。

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: require-image-digest
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: ["apps"]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["deployments"]
  validations:
    - expression: "object.spec.template.spec.containers.all(c, c.image.contains('@sha256:'))"
      message: "容器镜像必须使用 sha256 digest"
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: require-image-digest
spec:
  policyName: require-image-digest
  validationActions: [Deny]
```

上线前先用 `Audit` 或 `Warn` 观察存量影响，再切 `Deny`。Webhook 只留给 CEL 无法表达的代码或外部验证，并限制 namespace/resource 匹配、超时和 failurePolicy；否则策略系统自身故障会阻断所有发布。

## Pod Security 与运行边界

Pod Security Standards 分为 Privileged、Baseline、Restricted。Restricted 目标是更严格的 Pod 加固，常见要求包括禁止特权容器、限制 capabilities、非 root、受控 seccomp 和卷类型。具体字段会随标准版本演进，应通过 namespace 的 enforce/audit/warn 标签固定目标版本并先审计。

```yaml
metadata:
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: v1.36
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

生产环境通常不应永远使用 `latest`：先在测试中跟随最新标准验证，再把生产固定到明确版本，升级时主动迁移。Pod Security 只校验 Pod 安全上下文，不替代 RBAC、NetworkPolicy、节点隔离和 Secret 管理。

## 镜像供应链证据

一条可审计链路至少包含：

1. 源代码提交和受保护构建流程。
2. 可复现或受控构建产生的镜像 digest。
3. 漏洞报告、SBOM 和构建来源证明。
4. 使用受信身份对 digest 签名。
5. Admission 在部署时验证签名、身份、仓库与策略。
6. 运行对象保留 digest、版本和变更关联。

漏洞扫描是时间点判断：新 CVE 出现后旧镜像会变成高风险，因此需要持续重扫和修复 SLA。签名证明某身份认可某个 digest，不证明镜像没有漏洞；SBOM 描述组成，也不自动证明构建未被篡改。

## 身份、权限与网络

ServiceAccount token、RBAC、NetworkPolicy 和 Secret 构成运行时最小权限：

- 每个工作负载使用独立 ServiceAccount，不默认挂载不需要的 API token。
- Role/ClusterRole 按资源、verb、namespace 收敛，谨慎授予 `impersonate`、`escalate`、`bind` 和 Secret 读取。
- NetworkPolicy 同时考虑 ingress 和 egress；默认拒绝前先盘点 DNS、控制面和外部依赖。
- Secret 不是加密保险箱；还要启用静态加密、外部密钥管理、轮换、审计和最小读取范围。

```bash
kubectl auth can-i --as=system:serviceaccount:orders:order-api --list -n orders
kubectl get networkpolicy -n orders
kubectl get pod -n orders -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.serviceAccountName}{"\t"}{.spec.automountServiceAccountToken}{"\n"}{end}'
```

## 失败演练

至少验证：Git 源不可达时已有工作负载是否继续；渲染失败是否停止在 Apply 前；错误签名是否被拒绝；策略后端超时是否符合 failurePolicy；集群管理员紧急绕过后是否留下审计；回退到旧镜像时数据库和配置是否仍兼容。

安全控制的质量不只看拦截率，还看误报、延迟、可解释性、紧急路径和恢复时间。无法解释“哪条规则、哪个证据、谁能修复”的拒绝，会诱导团队绕开控制链。

## 官方资料

- [Argo CD Core Concepts](https://argo-cd.readthedocs.io/en/stable/core_concepts/)
- [Flux Concepts](https://fluxcd.io/flux/concepts/)
- [ValidatingAdmissionPolicy](https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/)
- [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
