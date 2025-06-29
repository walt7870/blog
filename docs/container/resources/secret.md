# Secret

## 概述

Secret 是 Kubernetes 中用于存储和管理敏感信息的对象，如密码、OAuth 令牌、SSH 密钥等。它提供了一种安全的方式来处理敏感数据，避免将这些信息硬编码在应用程序或容器镜像中。

| 关键点 | 内容 |
| ---- | ---- |
| 核心作用 | 安全存储和管理敏感信息 |
| 数据编码 | Base64 编码存储 |
| 访问控制 | 基于 RBAC 的访问控制 |
| 使用方式 | 环境变量、文件挂载、镜像拉取凭证 |

## Secret 的本质

### 设计理念

* **安全隔离**：将敏感数据与应用程序代码分离
* **访问控制**：通过 RBAC 控制对敏感数据的访问
* **灵活使用**：支持多种方式将敏感数据注入到 Pod 中
* **版本管理**：支持敏感数据的版本控制和更新

### 工作原理

```
敏感数据 → Base64编码 → Secret对象 → etcd存储 → Pod使用
    ↓           ↓          ↓         ↓        ↓
  明文数据    编码存储    API对象   加密存储   解码使用
```

### Secret vs ConfigMap

| 特性 | Secret | ConfigMap |
| ---- | ---- | ---- |
| 数据类型 | 敏感数据 | 配置数据 |
| 存储方式 | Base64 编码 | 明文存储 |
| 安全性 | 高（可加密） | 低（明文） |
| 使用场景 | 密码、证书、密钥 | 配置文件、环境变量 |
| 大小限制 | 1MB | 1MB |

## Secret 类型

### 内置类型

| 类型 | 用途 | 数据字段 |
| ---- | ---- | ---- |
| `Opaque` | 通用类型，用户定义数据 | 任意键值对 |
| `kubernetes.io/service-account-token` | ServiceAccount 令牌 | token, ca.crt, namespace |
| `kubernetes.io/dockercfg` | Docker 配置文件 | .dockercfg |
| `kubernetes.io/dockerconfigjson` | Docker 配置 JSON | .dockerconfigjson |
| `kubernetes.io/basic-auth` | 基本认证 | username, password |
| `kubernetes.io/ssh-auth` | SSH 认证 | ssh-privatekey |
| `kubernetes.io/tls` | TLS 证书 | tls.crt, tls.key |
| `bootstrap.kubernetes.io/token` | Bootstrap 令牌 | token-id, token-secret |

## 基本配置

### 1. Opaque Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysecret
type: Opaque
data:
  username: YWRtaW4=  # admin 的 base64 编码
  password: MWYyZDFlMmU2N2Rm  # 1f2d1e2e67df 的 base64 编码
```

**使用 stringData（推荐）**：
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysecret
type: Opaque
stringData:
  username: admin
  password: 1f2d1e2e67df
```

### 2. Docker Registry Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: regcred
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: eyJhdXRocyI6eyJodHRwczovL2luZGV4LmRvY2tlci5pby92MS8iOnsidXNlcm5hbWUiOiJteXVzZXIiLCJwYXNzd29yZCI6Im15cGFzcyIsImVtYWlsIjoibXllbWFpbEBleGFtcGxlLmNvbSIsImF1dGgiOiJiWGwxYzJWeU9tMTVjR0Z6Y3c9PSJ9fX0=
```

**使用命令创建**：
```bash
kubectl create secret docker-registry regcred \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=myuser \
  --docker-password=mypass \
  --docker-email=myemail@example.com
```

### 3. TLS Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tls-secret
type: kubernetes.io/tls
data:
  tls.crt: LS0tLS1CRUdJTi... # base64 编码的证书
  tls.key: LS0tLS1CRUdJTi... # base64 编码的私钥
```

**使用命令创建**：
```bash
kubectl create secret tls tls-secret \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key
```

### 4. Basic Auth Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: basic-auth
type: kubernetes.io/basic-auth
stringData:
  username: admin
  password: secretpassword
```

### 5. SSH Auth Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ssh-key-secret
type: kubernetes.io/ssh-auth
data:
  ssh-privatekey: LS0tLS1CRUdJTi... # base64 编码的私钥
```

## 使用 Secret

### 1. 作为环境变量

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secret-env-pod
spec:
  containers:
  - name: mycontainer
    image: redis
    env:
    - name: SECRET_USERNAME
      valueFrom:
        secretKeyRef:
          name: mysecret
          key: username
    - name: SECRET_PASSWORD
      valueFrom:
        secretKeyRef:
          name: mysecret
          key: password
  restartPolicy: Never
```

**批量导入环境变量**：
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secret-envfrom-pod
spec:
  containers:
  - name: mycontainer
    image: redis
    envFrom:
    - secretRef:
        name: mysecret
  restartPolicy: Never
```

### 2. 作为文件挂载

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secret-volume-pod
spec:
  containers:
  - name: mycontainer
    image: redis
    volumeMounts:
    - name: secret-volume
      mountPath: "/etc/secret-volume"
      readOnly: true
  volumes:
  - name: secret-volume
    secret:
      secretName: mysecret
  restartPolicy: Never
```

**指定文件权限**：
```yaml
volumes:
- name: secret-volume
  secret:
    secretName: mysecret
    defaultMode: 0400  # 只读权限
    items:
    - key: username
      path: my-group/my-username
      mode: 0777
```

### 3. 作为镜像拉取凭证

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: private-reg
spec:
  containers:
  - name: private-reg-container
    image: myregistry.com/myapp:latest
  imagePullSecrets:
  - name: regcred
```

**在 ServiceAccount 中配置**：
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-service-account
imagePullSecrets:
- name: regcred

---
apiVersion: v1
kind: Pod
metadata:
  name: pod-with-sa
spec:
  serviceAccountName: my-service-account
  containers:
  - name: mycontainer
    image: myregistry.com/myapp:latest
```

## 高级配置

### 1. 多个 Secret 组合使用

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-secret-pod
spec:
  containers:
  - name: mycontainer
    image: nginx
    env:
    - name: DB_USERNAME
      valueFrom:
        secretKeyRef:
          name: db-secret
          key: username
    - name: API_KEY
      valueFrom:
        secretKeyRef:
          name: api-secret
          key: key
    volumeMounts:
    - name: ssl-certs
      mountPath: "/etc/ssl/certs"
      readOnly: true
    - name: ssh-keys
      mountPath: "/root/.ssh"
      readOnly: true
  volumes:
  - name: ssl-certs
    secret:
      secretName: tls-secret
  - name: ssh-keys
    secret:
      secretName: ssh-key-secret
      defaultMode: 0600
```

### 2. Secret 的投影卷

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: projected-secret-pod
spec:
  containers:
  - name: mycontainer
    image: nginx
    volumeMounts:
    - name: projected-volume
      mountPath: "/etc/config"
      readOnly: true
  volumes:
  - name: projected-volume
    projected:
      sources:
      - secret:
          name: mysecret
          items:
          - key: username
            path: db-username
      - secret:
          name: api-secret
          items:
          - key: key
            path: api-key
      - configMap:
          name: myconfig
          items:
          - key: config.yaml
            path: app-config.yaml
```

### 3. 不可变 Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: immutable-secret
type: Opaque
immutable: true  # 设置为不可变
stringData:
  username: admin
  password: secretpassword
```

### 4. Secret 的子路径挂载

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: subpath-secret-pod
spec:
  containers:
  - name: mycontainer
    image: nginx
    volumeMounts:
    - name: secret-volume
      mountPath: "/etc/nginx/ssl/tls.crt"
      subPath: tls.crt
      readOnly: true
    - name: secret-volume
      mountPath: "/etc/nginx/ssl/tls.key"
      subPath: tls.key
      readOnly: true
  volumes:
  - name: secret-volume
    secret:
      secretName: tls-secret
```

## 命令行操作

### 创建 Secret

```bash
# 从字面值创建
kubectl create secret generic mysecret \
  --from-literal=username=admin \
  --from-literal=password=secretpassword

# 从文件创建
kubectl create secret generic mysecret \
  --from-file=username.txt \
  --from-file=password.txt

# 从目录创建
kubectl create secret generic mysecret \
  --from-file=path/to/secret/dir/

# 创建 Docker Registry Secret
kubectl create secret docker-registry regcred \
  --docker-server=myregistry.com \
  --docker-username=myuser \
  --docker-password=mypass \
  --docker-email=myemail@example.com

# 创建 TLS Secret
kubectl create secret tls tls-secret \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key
```

### 查看和管理 Secret

```bash
# 查看 Secret 列表
kubectl get secrets

# 查看 Secret 详细信息
kubectl describe secret mysecret

# 查看 Secret 内容（base64 编码）
kubectl get secret mysecret -o yaml

# 解码 Secret 内容
kubectl get secret mysecret -o jsonpath='{.data.username}' | base64 --decode

# 编辑 Secret
kubectl edit secret mysecret

# 删除 Secret
kubectl delete secret mysecret
```

### 更新 Secret

```bash
# 使用 kubectl patch 更新
kubectl patch secret mysecret -p '{"stringData":{"password":"newpassword"}}'

# 使用 kubectl apply 更新
kubectl apply -f updated-secret.yaml

# 替换整个 Secret
kubectl replace -f new-secret.yaml
```

## 安全最佳实践

### 1. 访问控制

```yaml
# RBAC 配置示例
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: secret-reader
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list"]
  resourceNames: ["mysecret"]  # 限制特定 Secret

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-secrets
  namespace: default
subjects:
- kind: ServiceAccount
  name: secret-reader-sa
  namespace: default
roleRef:
  kind: Role
  name: secret-reader
  apiGroup: rbac.authorization.k8s.io
```

### 2. 加密存储

```yaml
# EncryptionConfiguration
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
- resources:
  - secrets
  providers:
  - aescbc:
      keys:
      - name: key1
        secret: <32-byte base64 encoded key>
  - identity: {}
```

### 3. 网络策略

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-secret-access
spec:
  podSelector:
    matchLabels:
      access-secrets: "false"
  policyTypes:
  - Ingress
  - Egress
```

### 4. Pod 安全策略

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
  containers:
  - name: mycontainer
    image: nginx
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
    volumeMounts:
    - name: secret-volume
      mountPath: "/etc/secret"
      readOnly: true
  volumes:
  - name: secret-volume
    secret:
      secretName: mysecret
      defaultMode: 0400
```

## 监控和审计

### 1. Secret 使用监控

```yaml
# ServiceMonitor for Prometheus
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: secret-usage-monitor
spec:
  selector:
    matchLabels:
      app: secret-monitor
  endpoints:
  - port: metrics
    path: /metrics
    interval: 30s
```

### 2. 审计策略

```yaml
# Audit Policy
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: Metadata
  resources:
  - group: ""
    resources: ["secrets"]
  verbs: ["get", "list", "create", "update", "patch", "delete"]
```

### 3. 告警规则

```yaml
# Prometheus Alert Rules
groups:
- name: secret-alerts
  rules:
  - alert: SecretAccessFailure
    expr: increase(apiserver_audit_total{verb="get",objectRef_resource="secrets",verb="get",code!~"2.."}[5m]) > 0
    for: 0m
    labels:
      severity: warning
    annotations:
      summary: "Secret access failure detected"
      description: "Failed attempts to access secrets detected"
  
  - alert: UnauthorizedSecretAccess
    expr: increase(apiserver_audit_total{verb="get",objectRef_resource="secrets",user_username!~"system:.*"}[5m]) > 10
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Unusual secret access pattern"
      description: "High number of secret access attempts by non-system users"
```

## 故障排查

### 常见问题

| 问题 | 可能原因 | 解决方案 |
| ---- | ---- | ---- |
| Secret 无法挂载 | 权限不足或 Secret 不存在 | 检查 RBAC 和 Secret 存在性 |
| 环境变量为空 | Secret key 不存在 | 检查 Secret 的 key 名称 |
| 文件权限错误 | defaultMode 设置不当 | 调整 defaultMode 或 mode 设置 |
| Base64 解码错误 | 编码格式问题 | 检查 base64 编码是否正确 |
| Pod 启动失败 | Secret 引用错误 | 检查 Secret 名称和命名空间 |

### 诊断步骤

1. **检查 Secret 存在性**
```bash
kubectl get secret mysecret
kubectl describe secret mysecret
```

2. **验证 Secret 内容**
```bash
kubectl get secret mysecret -o yaml
echo "<base64-string>" | base64 --decode
```

3. **检查 Pod 配置**
```bash
kubectl describe pod mypod
kubectl get pod mypod -o yaml
```

4. **查看 Pod 日志**
```bash
kubectl logs mypod
kubectl describe pod mypod
```

5. **测试 Secret 访问**
```bash
# 进入 Pod 检查
kubectl exec -it mypod -- /bin/sh
ls -la /etc/secret-volume/
echo $SECRET_USERNAME
```

## 性能优化

### 1. Secret 大小优化

```yaml
# 避免大型 Secret，考虑拆分
apiVersion: v1
kind: Secret
metadata:
  name: large-secret
type: Opaque
stringData:
  # 避免存储大文件，考虑使用外部存储
  config: |
    # 保持配置简洁
    key1: value1
    key2: value2
```

### 2. 缓存优化

```yaml
# 使用 projected volumes 减少 API 调用
volumes:
- name: combined-volume
  projected:
    sources:
    - secret:
        name: secret1
    - secret:
        name: secret2
    - configMap:
        name: config1
```

### 3. 更新策略

```yaml
# 使用不可变 Secret 提高性能
apiVersion: v1
kind: Secret
metadata:
  name: immutable-secret
type: Opaque
immutable: true
stringData:
  key: value
```

## 外部 Secret 管理

### 1. External Secrets Operator

```yaml
# SecretStore 配置
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
spec:
  provider:
    vault:
      server: "https://vault.example.com"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "example-role"

---
# ExternalSecret 配置
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: vault-secret
spec:
  refreshInterval: 15s
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: example-secret
    creationPolicy: Owner
  data:
  - secretKey: password
    remoteRef:
      key: secret/data/database
      property: password
```

### 2. Sealed Secrets

```yaml
# SealedSecret 配置
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: mysecret
spec:
  encryptedData:
    username: AgBy3i4OJSWK+PiTySYZZA9rO43cGDEQAx...
    password: AgBy3i4OJSWK+PiTySYZZA9rO43cGDEQAx...
  template:
    metadata:
      name: mysecret
    type: Opaque
```

## 总结

Secret 是 Kubernetes 中管理敏感信息的核心组件，提供了安全、灵活的敏感数据管理能力。通过合理配置 Secret 类型、访问控制和使用方式，可以构建安全可靠的应用程序。

**关键要点**：
- 选择合适的 Secret 类型和存储方式
- 实施严格的访问控制和 RBAC 策略
- 使用加密存储保护静态数据
- 建立监控和审计机制
- 遵循安全最佳实践
- 考虑使用外部 Secret 管理系统
- 优化 Secret 的大小和更新策略