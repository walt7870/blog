# PV 和 PVC

## 概述

PersistentVolume (PV) 和 PersistentVolumeClaim (PVC) 是 Kubernetes 中用于管理持久化存储的核心概念。PV 是集群中的存储资源，而 PVC 是用户对存储资源的请求。它们提供了存储资源的抽象层，使得 Pod 可以独立于具体的存储实现来使用持久化存储。

| 组件 | 作用 | 管理者 |
| ---- | ---- | ---- |
| PV (PersistentVolume) | 集群级别的存储资源 | 集群管理员 |
| PVC (PersistentVolumeClaim) | 对存储资源的请求 | 应用开发者 |
| StorageClass | 存储类，定义存储的类型和参数 | 集群管理员 |

## 核心概念

### 设计理念

* **存储抽象**：将存储资源从具体实现中抽象出来
* **资源分离**：存储资源的生命周期独立于 Pod
* **动态供应**：支持动态创建和分配存储资源
* **访问控制**：提供不同的访问模式和权限控制

### 工作流程

```
存储需求 → PVC创建 → 绑定PV → Pod使用 → 数据持久化
    ↓         ↓        ↓       ↓         ↓
  用户请求   资源声明   资源分配  挂载使用   数据保护
```

### 生命周期

| 阶段 | PV 状态 | PVC 状态 | 描述 |
| ---- | ---- | ---- | ---- |
| 供应 | Available | - | PV 已创建，等待绑定 |
| 绑定 | Bound | Bound | PV 与 PVC 成功绑定 |
| 使用 | Bound | Bound | Pod 正在使用存储 |
| 释放 | Released | - | PVC 被删除，PV 等待回收 |
| 回收 | Available/Failed | - | PV 被回收或回收失败 |

## PersistentVolume (PV)

### 基本配置

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-example
spec:
  capacity:
    storage: 10Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: manual
  hostPath:
    path: /mnt/data
```

### 访问模式

| 模式 | 缩写 | 描述 | 支持的存储类型 |
| ---- | ---- | ---- | ---- |
| ReadWriteOnce | RWO | 单节点读写 | 大部分存储类型 |
| ReadOnlyMany | ROX | 多节点只读 | NFS, CephFS 等 |
| ReadWriteMany | RWX | 多节点读写 | NFS, CephFS, GlusterFS 等 |
| ReadWriteOncePod | RWOP | 单 Pod 读写 | CSI 驱动支持 |

### 回收策略

| 策略 | 描述 | 适用场景 |
| ---- | ---- | ---- |
| Retain | 保留数据，手动回收 | 重要数据，需要手动处理 |
| Delete | 自动删除存储资源 | 临时数据，云存储 |
| Recycle | 清空数据后重用（已废弃） | 不推荐使用 |

### 存储类型示例

#### 1. HostPath PV

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-hostpath
spec:
  capacity:
    storage: 5Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Delete
  storageClassName: local-storage
  local:
    path: /mnt/disks/ssd1
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - node-1
```

#### 2. NFS PV

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-nfs
spec:
  capacity:
    storage: 20Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: nfs
  nfs:
    server: nfs-server.example.com
    path: /exported/path
```

#### 3. AWS EBS PV

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-aws-ebs
spec:
  capacity:
    storage: 100Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Delete
  storageClassName: gp2
  awsElasticBlockStore:
    volumeID: vol-12345678
    fsType: ext4
```

#### 4. CSI PV

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-csi
spec:
  capacity:
    storage: 50Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Delete
  storageClassName: csi-storage
  csi:
    driver: csi.example.com
    volumeHandle: volume-id-12345
    fsType: ext4
    volumeAttributes:
      storage.kubernetes.io/csiProvisionerIdentity: csi-provisioner
```

## PersistentVolumeClaim (PVC)

### 基本配置

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pvc-example
spec:
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
  resources:
    requests:
      storage: 8Gi
  storageClassName: manual
  selector:
    matchLabels:
      release: "stable"
    matchExpressions:
      - {key: environment, operator: In, values: [dev]}
```

### 资源请求

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pvc-with-limits
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi    # 最小存储需求
    limits:
      storage: 20Gi    # 最大存储限制
  storageClassName: fast-ssd
```

### 选择器

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pvc-with-selector
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
  storageClassName: ""
  selector:
    matchLabels:
      type: "ssd"
      zone: "us-west-1a"
    matchExpressions:
      - key: performance
        operator: In
        values: ["high", "medium"]
```

## StorageClass

### 基本配置

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp2
  replication-type: none
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Delete
```

### 常见 StorageClass 示例

#### 1. AWS EBS StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: aws-ebs-gp3
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Delete
```

#### 2. GCE PD StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gce-pd-ssd
provisioner: kubernetes.io/gce-pd
parameters:
  type: pd-ssd
  replication-type: none
volumeBindingMode: Immediate
allowVolumeExpansion: true
reclaimPolicy: Delete
```

#### 3. Local StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-storage
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
```

#### 4. NFS StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-client
provisioner: k8s-sigs.io/nfs-subdir-external-provisioner
parameters:
  server: nfs-server.example.com
  path: /exported/path
  archiveOnDelete: "false"
volumeBindingMode: Immediate
allowVolumeExpansion: true
reclaimPolicy: Delete
```

## 在 Pod 中使用 PVC

### 基本使用

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod-with-pvc
spec:
  containers:
  - name: mycontainer
    image: nginx
    volumeMounts:
    - mountPath: "/var/www/html"
      name: mypd
  volumes:
  - name: mypd
    persistentVolumeClaim:
      claimName: pvc-example
```

### 多容器共享 PVC

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-container-pvc
spec:
  containers:
  - name: writer
    image: busybox
    command: ['sh', '-c', 'echo "Hello from writer" > /shared/data.txt; sleep 3600']
    volumeMounts:
    - name: shared-storage
      mountPath: /shared
  - name: reader
    image: busybox
    command: ['sh', '-c', 'while true; do cat /shared/data.txt; sleep 10; done']
    volumeMounts:
    - name: shared-storage
      mountPath: /shared
  volumes:
  - name: shared-storage
    persistentVolumeClaim:
      claimName: shared-pvc
```

### Deployment 中使用 PVC

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-deployment
spec:
  replicas: 1  # 注意：RWO 模式下只能有一个副本
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: nginx
        ports:
        - containerPort: 80
        volumeMounts:
        - name: web-storage
          mountPath: /usr/share/nginx/html
      volumes:
      - name: web-storage
        persistentVolumeClaim:
          claimName: web-pvc

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: web-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: fast-ssd
```

### StatefulSet 中使用 VolumeClaimTemplate

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  serviceName: "database"
  replicas: 3
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      containers:
      - name: database
        image: postgres:13
        env:
        - name: POSTGRES_DB
          value: mydb
        - name: POSTGRES_USER
          value: user
        - name: POSTGRES_PASSWORD
          value: password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: database-storage
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: database-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: "fast-ssd"
      resources:
        requests:
          storage: 20Gi
```

## 动态供应

### 自动创建 PV

```yaml
# 1. 创建 StorageClass
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: dynamic-storage
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp2
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Delete

---
# 2. 创建 PVC（自动创建 PV）
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dynamic-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: dynamic-storage

---
# 3. Pod 使用 PVC
apiVersion: v1
kind: Pod
metadata:
  name: pod-dynamic
spec:
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - name: storage
      mountPath: /data
  volumes:
  - name: storage
    persistentVolumeClaim:
      claimName: dynamic-pvc
```

### 延迟绑定

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: delayed-binding
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp2
volumeBindingMode: WaitForFirstConsumer  # 等待第一个消费者
allowVolumeExpansion: true
```

## 高级特性

### 1. 卷扩展

```yaml
# 1. StorageClass 支持扩展
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: expandable-storage
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp2
allowVolumeExpansion: true  # 允许卷扩展

---
# 2. 扩展 PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: expandable-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi  # 从 10Gi 扩展到 20Gi
  storageClassName: expandable-storage
```

### 2. 卷快照

```yaml
# VolumeSnapshotClass
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: csi-snapclass
driver: ebs.csi.aws.com
deletionPolicy: Delete

---
# VolumeSnapshot
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: pvc-snapshot
spec:
  volumeSnapshotClassName: csi-snapclass
  source:
    persistentVolumeClaimName: source-pvc

---
# 从快照恢复 PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: restored-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  dataSource:
    name: pvc-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  storageClassName: fast-ssd
```

### 3. 卷克隆

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: cloned-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  dataSource:
    name: source-pvc
    kind: PersistentVolumeClaim
  storageClassName: fast-ssd
```

### 4. 通用临时卷

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod-with-ephemeral-volume
spec:
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - name: ephemeral-storage
      mountPath: /tmp
  volumes:
  - name: ephemeral-storage
    ephemeral:
      volumeClaimTemplate:
        spec:
          accessModes: [ "ReadWriteOnce" ]
          storageClassName: "fast-ssd"
          resources:
            requests:
              storage: 1Gi
```

## 命令行操作

### PV 操作

```bash
# 查看 PV 列表
kubectl get pv

# 查看 PV 详细信息
kubectl describe pv pv-name

# 查看 PV 状态
kubectl get pv -o wide

# 删除 PV
kubectl delete pv pv-name

# 查看 PV 的 YAML
kubectl get pv pv-name -o yaml
```

### PVC 操作

```bash
# 查看 PVC 列表
kubectl get pvc

# 查看特定命名空间的 PVC
kubectl get pvc -n namespace-name

# 查看 PVC 详细信息
kubectl describe pvc pvc-name

# 查看 PVC 使用情况
kubectl top pvc

# 扩展 PVC
kubectl patch pvc pvc-name -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'

# 删除 PVC
kubectl delete pvc pvc-name
```

### StorageClass 操作

```bash
# 查看 StorageClass 列表
kubectl get storageclass
kubectl get sc  # 简写

# 查看 StorageClass 详细信息
kubectl describe storageclass storage-class-name

# 设置默认 StorageClass
kubectl patch storageclass storage-class-name -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'

# 取消默认 StorageClass
kubectl patch storageclass storage-class-name -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"false"}}}'
```

### 调试和监控

```bash
# 查看存储相关事件
kubectl get events --field-selector involvedObject.kind=PersistentVolume
kubectl get events --field-selector involvedObject.kind=PersistentVolumeClaim

# 查看 PV 和 PVC 的绑定关系
kubectl get pv,pvc -o wide

# 查看 Pod 的卷挂载信息
kubectl describe pod pod-name | grep -A 10 "Volumes:"

# 查看存储使用情况
kubectl exec -it pod-name -- df -h

# 查看卷的详细挂载信息
kubectl exec -it pod-name -- mount | grep /path/to/mount
```

## 监控和告警

### Prometheus 监控指标

```yaml
# PV/PVC 监控规则
groups:
- name: storage-alerts
  rules:
  - alert: PVCPendingTooLong
    expr: kube_persistentvolumeclaim_status_phase{phase="Pending"} == 1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "PVC has been pending for too long"
      description: "PVC {{ $labels.persistentvolumeclaim }} in namespace {{ $labels.namespace }} has been pending for more than 5 minutes"
  
  - alert: PVCStorageUsageHigh
    expr: (kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes) * 100 > 85
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "PVC storage usage is high"
      description: "PVC {{ $labels.persistentvolumeclaim }} usage is above 85%"
  
  - alert: PVCStorageUsageCritical
    expr: (kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes) * 100 > 95
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "PVC storage usage is critical"
      description: "PVC {{ $labels.persistentvolumeclaim }} usage is above 95%"
```

### 存储使用情况监控

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: storage-monitoring
data:
  monitor.sh: |
    #!/bin/bash
    # 监控脚本
    kubectl get pvc --all-namespaces -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,STATUS:.status.phase,CAPACITY:.status.capacity.storage,STORAGECLASS:.spec.storageClassName
    
    # 检查未绑定的 PVC
    kubectl get pvc --all-namespaces --field-selector=status.phase=Pending
    
    # 检查存储使用情况
    kubectl top pvc --all-namespaces
```

## 故障排查

### 常见问题

| 问题 | 可能原因 | 解决方案 |
| ---- | ---- | ---- |
| PVC 一直 Pending | 没有匹配的 PV 或 StorageClass | 检查存储资源和配置 |
| Pod 无法启动 | PVC 挂载失败 | 检查 PVC 状态和权限 |
| 存储空间不足 | PV 容量不够 | 扩展 PVC 或清理数据 |
| 数据丢失 | PV 被意外删除 | 检查回收策略和备份 |
| 性能问题 | 存储类型不合适 | 选择合适的 StorageClass |

### 诊断步骤

1. **检查 PVC 状态**
```bash
kubectl get pvc
kubectl describe pvc pvc-name
```

2. **检查 PV 状态**
```bash
kubectl get pv
kubectl describe pv pv-name
```

3. **检查 StorageClass**
```bash
kubectl get storageclass
kubectl describe storageclass sc-name
```

4. **检查事件**
```bash
kubectl get events --sort-by=.metadata.creationTimestamp
```

5. **检查 Pod 挂载**
```bash
kubectl describe pod pod-name
kubectl exec -it pod-name -- mount | grep pvc
```

6. **检查存储驱动日志**
```bash
# 检查 CSI 驱动日志
kubectl logs -n kube-system -l app=csi-driver

# 检查 kubelet 日志
journalctl -u kubelet | grep -i volume
```

## 性能优化

### 1. 存储类型选择

```yaml
# 高性能存储
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: high-performance
provisioner: ebs.csi.aws.com
parameters:
  type: io2
  iops: "10000"
  throughput: "1000"
volumeBindingMode: WaitForFirstConsumer

---
# 成本优化存储
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cost-optimized
provisioner: ebs.csi.aws.com
parameters:
  type: sc1  # Cold HDD
volumeBindingMode: WaitForFirstConsumer
```

### 2. 本地存储优化

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-nvme
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete

---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: local-nvme-pv
spec:
  capacity:
    storage: 100Gi
  volumeMode: Filesystem
  accessModes:
  - ReadWriteOnce
  persistentVolumeReclaimPolicy: Delete
  storageClassName: local-nvme
  local:
    path: /mnt/nvme-ssd
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: node-type
          operator: In
          values:
          - storage-optimized
```

### 3. 缓存策略

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cached-app
spec:
  containers:
  - name: app
    image: myapp
    volumeMounts:
    - name: data-storage
      mountPath: /data
    - name: cache-storage
      mountPath: /cache
  volumes:
  - name: data-storage
    persistentVolumeClaim:
      claimName: data-pvc
  - name: cache-storage
    emptyDir:
      sizeLimit: 1Gi
```

## 最佳实践

### 1. 命名规范

```yaml
# 推荐的命名规范
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data-pvc  # app-用途-pvc
  labels:
    app: myapp
    component: database
    environment: production
    tier: storage
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: fast-ssd
```

### 2. 资源管理

```yaml
# 设置资源配额
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
spec:
  hard:
    requests.storage: "100Gi"
    persistentvolumeclaims: "10"
    count/storageclass.storage.k8s.io/fast-ssd: "5"
```

### 3. 安全配置

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-storage-pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
  containers:
  - name: app
    image: myapp
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
    volumeMounts:
    - name: data-storage
      mountPath: /data
    - name: tmp-storage
      mountPath: /tmp
  volumes:
  - name: data-storage
    persistentVolumeClaim:
      claimName: secure-pvc
  - name: tmp-storage
    emptyDir: {}
```

### 4. 备份策略

```yaml
# 定期备份 CronJob
apiVersion: batch/v1
kind: CronJob
metadata:
  name: pvc-backup
spec:
  schedule: "0 2 * * *"  # 每天凌晨2点
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: backup-tool
            command:
            - /bin/sh
            - -c
            - |
              # 创建快照
              kubectl create volumesnapshot backup-$(date +%Y%m%d) \
                --from-pvc=important-data-pvc \
                --snapshot-class=csi-snapclass
            volumeMounts:
            - name: data
              mountPath: /data
              readOnly: true
          volumes:
          - name: data
            persistentVolumeClaim:
              claimName: important-data-pvc
          restartPolicy: OnFailure
```

## 总结

PV 和 PVC 是 Kubernetes 存储管理的核心组件，提供了灵活、可扩展的持久化存储解决方案。通过合理配置存储类、访问模式和回收策略，可以满足不同应用的存储需求。

**关键要点**：
- 理解 PV、PVC 和 StorageClass 的关系和作用
- 选择合适的访问模式和存储类型
- 实施动态供应和自动化管理
- 建立监控和告警机制
- 制定备份和恢复策略
- 优化存储性能和成本
- 遵循安全和命名最佳实践