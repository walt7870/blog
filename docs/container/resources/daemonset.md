# DaemonSet

## 概述

DaemonSet 是 Kubernetes 中用于确保在集群的每个节点（或指定的节点子集）上运行一个 Pod 副本的工作负载控制器。当节点加入集群时，Pod 会自动添加到该节点；当节点从集群中移除时，相应的 Pod 也会被回收。

| 关键点 | 内容 |
| ---- | ---- |
| 核心作用 | 在每个节点上运行一个 Pod 副本 |
| 调度方式 | 绕过默认调度器，直接调度到节点 |
| 节点管理 | 自动处理节点的加入和离开 |
| 使用场景 | 日志收集、监控代理、网络插件、存储守护进程 |

## DaemonSet 的本质

### 设计理念

* **节点级服务**：为每个节点提供必要的系统级服务
* **自动部署**：新节点加入时自动部署 Pod
* **资源共享**：与节点上的其他 Pod 共享节点资源
* **系统集成**：通常需要访问节点的文件系统、网络或硬件

### 工作原理

```
DaemonSet 创建
    ↓
控制器监控集群节点
    ↓
为每个符合条件的节点创建 Pod
    ↓
节点加入 → 自动创建 Pod
节点离开 → 自动删除 Pod
```

### 与其他控制器的对比

| 特性 | DaemonSet | Deployment | StatefulSet |
| ---- | ---- | ---- | ---- |
| Pod 分布 | 每个节点一个 | 可配置副本数 | 有序的副本 |
| 调度方式 | 直接调度到节点 | 通过调度器 | 通过调度器 |
| 扩缩容 | 跟随节点数量 | 手动/自动扩缩容 | 手动/自动扩缩容 |
| 使用场景 | 节点级服务 | 无状态应用 | 有状态应用 |
| 网络标识 | 节点 IP | Service IP | 稳定的 DNS 名称 |

## 基本配置

### 1. 简单的 DaemonSet

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
  namespace: kube-system
  labels:
    app: fluentd
spec:
  selector:
    matchLabels:
      app: fluentd
  template:
    metadata:
      labels:
        app: fluentd
    spec:
      containers:
      - name: fluentd
        image: fluent/fluentd:v1.14
        env:
        - name: FLUENTD_SYSTEMD_CONF
          value: disable
        volumeMounts:
        - name: varlog
          mountPath: /var/log
          readOnly: true
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
      
      # 挂载节点目录
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
      
      # 容忍节点污点
      tolerations:
      - key: node-role.kubernetes.io/master
        effect: NoSchedule
      - key: node-role.kubernetes.io/control-plane
        effect: NoSchedule
```

### 2. 带有节点选择器的 DaemonSet

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: gpu-monitoring
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: gpu-monitoring
  template:
    metadata:
      labels:
        app: gpu-monitoring
    spec:
      # 只在有 GPU 的节点上运行
      nodeSelector:
        accelerator: nvidia-tesla-k80
      
      containers:
      - name: gpu-monitor
        image: nvidia/dcgm-exporter:latest
        ports:
        - containerPort: 9400
          name: metrics
        volumeMounts:
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: sys
          mountPath: /host/sys
          readOnly: true
        securityContext:
          privileged: true
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 100m
            memory: 128Mi
      
      volumes:
      - name: proc
        hostPath:
          path: /proc
      - name: sys
        hostPath:
          path: /sys
      
      hostNetwork: true
      hostPID: true
```

### 3. 网络插件 DaemonSet

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: calico-node
  namespace: kube-system
  labels:
    k8s-app: calico-node
spec:
  selector:
    matchLabels:
      k8s-app: calico-node
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
  template:
    metadata:
      labels:
        k8s-app: calico-node
      annotations:
        scheduler.alpha.kubernetes.io/critical-pod: ''
    spec:
      nodeSelector:
        kubernetes.io/os: linux
      
      hostNetwork: true
      
      tolerations:
      # 允许在所有节点上运行
      - operator: Exists
        effect: NoSchedule
      - operator: Exists
        effect: NoExecute
      
      serviceAccountName: calico-node
      
      # 终止宽限期
      terminationGracePeriodSeconds: 0
      
      priorityClassName: system-node-critical
      
      initContainers:
      # 安装 CNI 插件
      - name: install-cni
        image: calico/cni:v3.20.0
        command: ["/install-cni.sh"]
        env:
        - name: CNI_CONF_NAME
          value: "10-calico.conflist"
        - name: CNI_NETWORK_CONFIG
          valueFrom:
            configMapKeyRef:
              name: calico-config
              key: cni_network_config
        - name: KUBERNETES_NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        volumeMounts:
        - mountPath: /host/opt/cni/bin
          name: cni-bin-dir
        - mountPath: /host/etc/cni/net.d
          name: cni-net-dir
        securityContext:
          privileged: true
      
      containers:
      - name: calico-node
        image: calico/node:v3.20.0
        env:
        - name: DATASTORE_TYPE
          value: "kubernetes"
        - name: WAIT_FOR_DATASTORE
          value: "true"
        - name: NODENAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        - name: CALICO_NETWORKING_BACKEND
          valueFrom:
            configMapKeyRef:
              name: calico-config
              key: calico_backend
        - name: CLUSTER_TYPE
          value: "k8s,bgp"
        - name: IP
          value: "autodetect"
        - name: CALICO_IPV4POOL_IPIP
          value: "Always"
        - name: FELIX_IPINIPMTU
          valueFrom:
            configMapKeyRef:
              name: calico-config
              key: veth_mtu
        - name: CALICO_IPV4POOL_CIDR
          value: "192.168.0.0/16"
        - name: CALICO_DISABLE_FILE_LOGGING
          value: "true"
        - name: FELIX_DEFAULTENDPOINTTOHOSTACTION
          value: "ACCEPT"
        - name: FELIX_IPV6SUPPORT
          value: "false"
        - name: FELIX_LOGSEVERITYSCREEN
          value: "info"
        - name: FELIX_HEALTHENABLED
          value: "true"
        
        securityContext:
          privileged: true
        
        resources:
          requests:
            cpu: 250m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        
        livenessProbe:
          exec:
            command:
            - /bin/calico-node
            - -felix-live
            - -bird-live
          periodSeconds: 10
          initialDelaySeconds: 10
          failureThreshold: 6
        
        readinessProbe:
          exec:
            command:
            - /bin/calico-node
            - -felix-ready
            - -bird-ready
          periodSeconds: 10
        
        volumeMounts:
        - mountPath: /lib/modules
          name: lib-modules
          readOnly: true
        - mountPath: /run/xtables.lock
          name: xtables-lock
        - mountPath: /var/run/calico
          name: var-run-calico
        - mountPath: /var/lib/calico
          name: var-lib-calico
        - mountPath: /var/run/nodeagent
          name: policysync
      
      volumes:
      - name: lib-modules
        hostPath:
          path: /lib/modules
      - name: var-run-calico
        hostPath:
          path: /var/run/calico
      - name: var-lib-calico
        hostPath:
          path: /var/lib/calico
      - name: xtables-lock
        hostPath:
          path: /run/xtables.lock
          type: FileOrCreate
      - name: cni-bin-dir
        hostPath:
          path: /opt/cni/bin
      - name: cni-net-dir
        hostPath:
          path: /etc/cni/net.d
      - name: policysync
        hostPath:
          type: DirectoryOrCreate
          path: /var/run/nodeagent
```

## 更新策略

### 1. 滚动更新（RollingUpdate）

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: monitoring-agent
spec:
  selector:
    matchLabels:
      app: monitoring-agent
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1  # 同时最多有 1 个节点的 Pod 不可用
      # maxSurge: 0      # DaemonSet 不支持 maxSurge
  template:
    metadata:
      labels:
        app: monitoring-agent
    spec:
      containers:
      - name: agent
        image: monitoring-agent:v2.0  # 更新镜像版本
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

### 2. OnDelete 更新策略

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: critical-system-agent
spec:
  selector:
    matchLabels:
      app: critical-system-agent
  updateStrategy:
    type: OnDelete  # 手动删除 Pod 才会更新
  template:
    metadata:
      labels:
        app: critical-system-agent
    spec:
      containers:
      - name: agent
        image: critical-agent:v2.0
        securityContext:
          privileged: true
        volumeMounts:
        - name: host-root
          mountPath: /host
          readOnly: true
      volumes:
      - name: host-root
        hostPath:
          path: /
```

## 节点选择和调度

### 1. 节点选择器

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: ssd-monitoring
spec:
  selector:
    matchLabels:
      app: ssd-monitoring
  template:
    metadata:
      labels:
        app: ssd-monitoring
    spec:
      # 只在有 SSD 存储的节点上运行
      nodeSelector:
        storage-type: ssd
        zone: production
      
      containers:
      - name: ssd-monitor
        image: ssd-monitor:latest
        volumeMounts:
        - name: dev
          mountPath: /dev
          readOnly: true
      
      volumes:
      - name: dev
        hostPath:
          path: /dev
```

### 2. 节点亲和性

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: edge-agent
spec:
  selector:
    matchLabels:
      app: edge-agent
  template:
    metadata:
      labels:
        app: edge-agent
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: node-type
                operator: In
                values:
                - edge
                - gateway
              - key: kubernetes.io/arch
                operator: In
                values:
                - amd64
                - arm64
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: network-speed
                operator: In
                values:
                - high
      
      containers:
      - name: edge-agent
        image: edge-agent:latest
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
```

### 3. 污点容忍

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: system-monitor
spec:
  selector:
    matchLabels:
      app: system-monitor
  template:
    metadata:
      labels:
        app: system-monitor
    spec:
      tolerations:
      # 容忍主节点污点
      - key: node-role.kubernetes.io/master
        operator: Exists
        effect: NoSchedule
      - key: node-role.kubernetes.io/control-plane
        operator: Exists
        effect: NoSchedule
      
      # 容忍节点未就绪状态
      - key: node.kubernetes.io/not-ready
        operator: Exists
        effect: NoExecute
        tolerationSeconds: 300
      
      # 容忍节点不可达状态
      - key: node.kubernetes.io/unreachable
        operator: Exists
        effect: NoExecute
        tolerationSeconds: 300
      
      # 容忍自定义污点
      - key: maintenance
        operator: Equal
        value: "true"
        effect: NoSchedule
      
      containers:
      - name: monitor
        image: system-monitor:latest
        securityContext:
          privileged: true
        volumeMounts:
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: sys
          mountPath: /host/sys
          readOnly: true
      
      volumes:
      - name: proc
        hostPath:
          path: /proc
      - name: sys
        hostPath:
          path: /sys
      
      hostNetwork: true
      hostPID: true
```

## 实际应用场景

### 1. 日志收集 - Filebeat

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: filebeat
  namespace: logging
  labels:
    app: filebeat
spec:
  selector:
    matchLabels:
      app: filebeat
  template:
    metadata:
      labels:
        app: filebeat
    spec:
      serviceAccountName: filebeat
      terminationGracePeriodSeconds: 30
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      
      containers:
      - name: filebeat
        image: docker.elastic.co/beats/filebeat:7.15.0
        args: [
          "-c", "/etc/filebeat.yml",
          "-e",
        ]
        env:
        - name: ELASTICSEARCH_HOST
          value: elasticsearch.logging.svc.cluster.local
        - name: ELASTICSEARCH_PORT
          value: "9200"
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        
        securityContext:
          runAsUser: 0
          privileged: true
        
        resources:
          requests:
            cpu: 100m
            memory: 100Mi
          limits:
            cpu: 200m
            memory: 200Mi
        
        volumeMounts:
        - name: config
          mountPath: /etc/filebeat.yml
          subPath: filebeat.yml
          readOnly: true
        - name: data
          mountPath: /usr/share/filebeat/data
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
        - name: varlog
          mountPath: /var/log
          readOnly: true
        - name: dockersock
          mountPath: /var/run/docker.sock
          readOnly: true
      
      volumes:
      - name: config
        configMap:
          defaultMode: 0640
          name: filebeat-config
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
      - name: varlog
        hostPath:
          path: /var/log
      - name: dockersock
        hostPath:
          path: /var/run/docker.sock
      - name: data
        hostPath:
          path: /var/lib/filebeat-data
          type: DirectoryOrCreate
      
      tolerations:
      - operator: Exists
        effect: NoSchedule

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-config
  namespace: logging
data:
  filebeat.yml: |
    filebeat.inputs:
    - type: container
      paths:
        - /var/log/containers/*.log
      processors:
        - add_kubernetes_metadata:
            host: ${NODE_NAME}
            matchers:
            - logs_path:
                logs_path: "/var/log/containers/"
    
    output.elasticsearch:
      hosts: ['${ELASTICSEARCH_HOST:elasticsearch}:${ELASTICSEARCH_PORT:9200}']
      index: "filebeat-%{+yyyy.MM.dd}"
    
    setup.template.name: "filebeat"
    setup.template.pattern: "filebeat-*"
    setup.template.enabled: false
    
    logging.level: info
    logging.to_files: true
    logging.files:
      path: /var/log/filebeat
      name: filebeat
      keepfiles: 7
      permissions: 0644
```

### 2. 监控代理 - Node Exporter

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
  labels:
    app: node-exporter
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9100"
        prometheus.io/path: "/metrics"
    spec:
      hostPID: true
      hostIPC: true
      hostNetwork: true
      
      containers:
      - name: node-exporter
        image: prom/node-exporter:v1.3.1
        args:
        - --path.procfs=/host/proc
        - --path.sysfs=/host/sys
        - --path.rootfs=/host/root
        - --collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc|rootfs/var/lib/docker/containers|rootfs/var/lib/docker/overlay2|rootfs/run/docker/netns|rootfs/var/lib/docker/aufs)($$|/)
        - --collector.filesystem.fs-types-exclude=^(autofs|binfmt_misc|bpf|cgroup2?|configfs|debugfs|devpts|devtmpfs|fusectl|hugetlbfs|iso9660|mqueue|nsfs|overlay|proc|procfs|pstore|rpc_pipefs|securityfs|selinuxfs|squashfs|sysfs|tracefs)$$
        
        ports:
        - containerPort: 9100
          hostPort: 9100
          name: metrics
        
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
        
        volumeMounts:
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: sys
          mountPath: /host/sys
          readOnly: true
        - name: root
          mountPath: /host/root
          mountPropagation: HostToContainer
          readOnly: true
        
        securityContext:
          runAsNonRoot: true
          runAsUser: 65534
      
      volumes:
      - name: proc
        hostPath:
          path: /proc
      - name: sys
        hostPath:
          path: /sys
      - name: root
        hostPath:
          path: /
      
      tolerations:
      - operator: Exists
        effect: NoSchedule

---
apiVersion: v1
kind: Service
metadata:
  name: node-exporter
  namespace: monitoring
  labels:
    app: node-exporter
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9100"
spec:
  type: ClusterIP
  clusterIP: None
  ports:
  - port: 9100
    targetPort: 9100
    name: metrics
  selector:
    app: node-exporter
```

### 3. 存储插件 - CSI Driver

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: csi-driver-node
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: csi-driver-node
  template:
    metadata:
      labels:
        app: csi-driver-node
    spec:
      serviceAccountName: csi-driver-node
      hostNetwork: true
      
      containers:
      # CSI Node Driver Registrar
      - name: csi-node-driver-registrar
        image: k8s.gcr.io/sig-storage/csi-node-driver-registrar:v2.5.0
        args:
        - --v=2
        - --csi-address=/csi/csi.sock
        - --kubelet-registration-path=/var/lib/kubelet/plugins/csi-driver/csi.sock
        
        securityContext:
          privileged: true
        
        env:
        - name: KUBE_NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        
        volumeMounts:
        - name: plugin-dir
          mountPath: /csi/
        - name: registration-dir
          mountPath: /registration/
        
        resources:
          requests:
            cpu: 10m
            memory: 20Mi
          limits:
            cpu: 100m
            memory: 100Mi
      
      # CSI Driver
      - name: csi-driver
        image: my-csi-driver:v1.0.0
        args:
        - --endpoint=$(CSI_ENDPOINT)
        - --node-id=$(NODE_ID)
        - --v=2
        
        env:
        - name: CSI_ENDPOINT
          value: unix:///csi/csi.sock
        - name: NODE_ID
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        
        securityContext:
          privileged: true
          capabilities:
            add: ["SYS_ADMIN"]
          allowPrivilegeEscalation: true
        
        volumeMounts:
        - name: plugin-dir
          mountPath: /csi
        - name: kubelet-dir
          mountPath: /var/lib/kubelet
          mountPropagation: "Bidirectional"
        - name: device-dir
          mountPath: /dev
        
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
      
      volumes:
      - name: registration-dir
        hostPath:
          path: /var/lib/kubelet/plugins_registry/
          type: DirectoryOrCreate
      - name: plugin-dir
        hostPath:
          path: /var/lib/kubelet/plugins/csi-driver/
          type: DirectoryOrCreate
      - name: kubelet-dir
        hostPath:
          path: /var/lib/kubelet
          type: Directory
      - name: device-dir
        hostPath:
          path: /dev
      
      tolerations:
      - operator: Exists
        effect: NoSchedule
```

## 命令行操作

### 基本操作

```bash
# 创建 DaemonSet
kubectl apply -f daemonset.yaml

# 查看 DaemonSet
kubectl get daemonset
kubectl get ds  # 简写

# 查看特定 DaemonSet
kubectl get ds fluentd -o wide
kubectl describe ds fluentd

# 查看 DaemonSet 的 Pod
kubectl get pods -l app=fluentd

# 查看 DaemonSet 在各节点的分布
kubectl get pods -l app=fluentd -o wide
```

### 更新操作

```bash
# 更新镜像
kubectl patch ds fluentd -p '{"spec":{"template":{"spec":{"containers":[{"name":"fluentd","image":"fluent/fluentd:v1.15"}]}}}}'

# 查看更新状态
kubectl rollout status ds fluentd

# 查看更新历史
kubectl rollout history ds fluentd

# 回滚到上一个版本
kubectl rollout undo ds fluentd

# 暂停更新
kubectl rollout pause ds fluentd

# 恢复更新
kubectl rollout resume ds fluentd
```

### 调试操作

```bash
# 查看特定节点上的 Pod
kubectl get pods -l app=fluentd --field-selector spec.nodeName=node1

# 查看 Pod 日志
kubectl logs -l app=fluentd
kubectl logs ds/fluentd  # 查看所有 Pod 日志

# 进入特定节点的 Pod
NODE_NAME="node1"
POD_NAME=$(kubectl get pods -l app=fluentd --field-selector spec.nodeName=$NODE_NAME -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it $POD_NAME -- /bin/bash

# 查看事件
kubectl get events --sort-by=.metadata.creationTimestamp

# 删除特定节点的 Pod（会自动重建）
kubectl delete pod -l app=fluentd --field-selector spec.nodeName=node1
```

### 节点管理

```bash
# 查看节点标签
kubectl get nodes --show-labels

# 给节点添加标签
kubectl label nodes node1 storage-type=ssd

# 给节点添加污点
kubectl taint nodes node1 maintenance=true:NoSchedule

# 移除节点污点
kubectl taint nodes node1 maintenance=true:NoSchedule-

# 查看节点上运行的 DaemonSet Pod
kubectl describe node node1 | grep -A 10 "Non-terminated Pods"
```

## 故障排查

### 常见问题

| 问题 | 可能原因 | 解决方案 |
| ---- | ---- | ---- |
| Pod 无法调度到节点 | 节点选择器不匹配 | 检查 nodeSelector 和节点标签 |
| Pod 在某些节点上失败 | 节点污点阻止调度 | 添加相应的 tolerations |
| Pod 无法访问主机资源 | 权限不足 | 检查 securityContext 和 hostPath |
| 更新卡住 | Pod 无法正常终止 | 检查应用的优雅关闭逻辑 |
| 资源不足 | 节点资源耗尽 | 调整资源请求和限制 |

### 诊断步骤

1. **检查 DaemonSet 状态**
```bash
kubectl get ds fluentd -o yaml
kubectl describe ds fluentd
```

2. **检查 Pod 分布**
```bash
kubectl get pods -l app=fluentd -o wide
kubectl get nodes
```

3. **检查节点状态**
```bash
kubectl describe nodes
kubectl get nodes --show-labels
```

4. **检查事件**
```bash
kubectl get events --field-selector involvedObject.kind=DaemonSet
kubectl get events --field-selector involvedObject.name=fluentd
```

5. **检查资源使用**
```bash
kubectl top nodes
kubectl top pods -l app=fluentd
```

## 最佳实践

### 1. 资源管理

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: resource-optimized-agent
spec:
  selector:
    matchLabels:
      app: resource-optimized-agent
  template:
    metadata:
      labels:
        app: resource-optimized-agent
    spec:
      containers:
      - name: agent
        image: monitoring-agent:v1.0.0
        
        # 合理的资源配置
        resources:
          requests:
            cpu: 100m      # 保守的 CPU 请求
            memory: 128Mi   # 保守的内存请求
          limits:
            cpu: 500m       # 允许突发使用
            memory: 512Mi   # 防止内存泄漏
        
        # 环境变量优化
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        
        # 健康检查
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        
        # 优雅关闭
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
      
      # 终止宽限期
      terminationGracePeriodSeconds: 30
      
      # 优先级类
      priorityClassName: system-node-critical
```

### 2. 安全配置

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: secure-agent
spec:
  selector:
    matchLabels:
      app: secure-agent
  template:
    metadata:
      labels:
        app: secure-agent
    spec:
      serviceAccountName: secure-agent-sa
      
      # 安全上下文
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
      
      containers:
      - name: agent
        image: secure-agent:v1.0.0
        
        # 容器安全上下文
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
            add:
            - NET_BIND_SERVICE  # 只添加必要的能力
        
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: var-run
          mountPath: /var/run
        - name: config
          mountPath: /etc/agent
          readOnly: true
      
      volumes:
      - name: tmp
        emptyDir: {}
      - name: var-run
        emptyDir: {}
      - name: config
        configMap:
          name: agent-config
          defaultMode: 0644
```

### 3. 监控和可观测性

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: observable-agent
  labels:
    app: observable-agent
spec:
  selector:
    matchLabels:
      app: observable-agent
  template:
    metadata:
      labels:
        app: observable-agent
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: agent
        image: observable-agent:v1.0.0
        
        ports:
        - containerPort: 8080
          name: http-metrics
        - containerPort: 8081
          name: health
        
        # 结构化日志
        env:
        - name: LOG_LEVEL
          value: "info"
        - name: LOG_FORMAT
          value: "json"
        
        # 健康检查端点
        livenessProbe:
          httpGet:
            path: /health
            port: 8081
          initialDelaySeconds: 30
          periodSeconds: 10
        
        readinessProbe:
          httpGet:
            path: /ready
            port: 8081
          initialDelaySeconds: 5
          periodSeconds: 5
        
        # 启动探针
        startupProbe:
          httpGet:
            path: /startup
            port: 8081
          initialDelaySeconds: 10
          periodSeconds: 5
          failureThreshold: 30
        
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

### 4. 高可用配置

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: ha-agent
spec:
  selector:
    matchLabels:
      app: ha-agent
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1  # 确保高可用
  template:
    metadata:
      labels:
        app: ha-agent
    spec:
      # 容忍各种节点状态
      tolerations:
      - operator: Exists
        effect: NoSchedule
      - operator: Exists
        effect: NoExecute
        tolerationSeconds: 300
      
      # 优先级确保重要性
      priorityClassName: system-node-critical
      
      containers:
      - name: agent
        image: ha-agent:v1.0.0
        
        # 重启策略
        restartPolicy: Always
        
        # 健康检查
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          failureThreshold: 3
        
        # 优雅关闭
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - |
                # 停止接收新请求
                kill -TERM 1
                # 等待现有请求完成
                sleep 15
        
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
      
      terminationGracePeriodSeconds: 30
```

## 总结

DaemonSet 是 Kubernetes 中用于在每个节点上运行系统级服务的重要控制器。它确保集群中的每个节点（或指定的节点子集）都运行一个 Pod 副本，非常适合部署日志收集、监控代理、网络插件等基础设施组件。

**关键要点**：
- DaemonSet 自动管理节点上的 Pod 生命周期
- 支持节点选择器和污点容忍来控制 Pod 分布
- 通常需要特殊权限来访问节点资源
- 更新策略影响服务的可用性
- 合理的资源配置和监控对于稳定运行至关重要