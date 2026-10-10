---
title: Kubernetes ConfigMap
author: Walt
date: 2026-07-18
---

# Kubernetes ConfigMap

ConfigMap 保存非敏感配置，让同一镜像在不同环境使用不同参数。它是 Namespace 级 API 对象，单个对象不适合存放大文件或高频变化数据；敏感值应使用 Secret 或外部密钥系统。

## 数据结构

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: order-api-config
  namespace: orders
data:
  LOG_LEVEL: info
  application.yaml: |
    payment:
      timeout: 2s
    features:
      asyncNotification: true
```

`data` 保存 UTF-8 字符串，`binaryData` 保存 Base64 编码的二进制内容，同一个 key 不能同时出现。ConfigMap 总数据不应超过 1 MiB；更大的内容应进入制品、对象存储或专门配置系统。

## 环境变量与卷的生效边界

环境变量在容器创建时展开，ConfigMap 更新后不会改变已运行进程：

```yaml
envFrom:
  - configMapRef:
      name: order-api-config
```

卷投影会由 kubelet 周期同步，但传播不是即时的，应用也未必自动重载：

```yaml
volumes:
  - name: config
    configMap:
      name: order-api-config
containers:
  - name: api
    volumeMounts:
      - name: config
        mountPath: /etc/order-api
        readOnly: true
```

使用 `subPath` 挂载单文件时，不会接收 ConfigMap 后续更新。需要确定性发布时，常用不可变版本名或把配置摘要写入 Pod template annotation，变更后触发受控滚动发布。

## 不可变 ConfigMap

```yaml
immutable: true
```

不可变对象可防止误改并减少 kubelet watch 压力，但更新时必须创建新名称并修改工作负载引用。适合与制品版本一起晋级的配置，不适合必须原地热更新的场景。

## 配置设计

- 默认值放在应用内，环境差异放 ConfigMap。
- 明确每个字段的类型、范围、单位和生效方式。
- 不把数据库密码、Token、私钥放入 ConfigMap。
- 不把环境变量与卷更新混成同一种“动态配置”。
- 多个服务共享配置时，定义所有者和兼容策略，避免一次修改同时破坏所有消费者。
- 配置变化需要审计、灰度、回滚和运行时指标，不只看对象更新成功。

## 排障

```bash
kubectl get configmap order-api-config -n orders -o yaml
kubectl describe pod <pod> -n orders
kubectl exec <pod> -n orders -- cat /etc/order-api/application.yaml
kubectl get deploy order-api -n orders -o jsonpath='{.spec.template.metadata.annotations}'
```

| 现象 | 优先检查 |
| --- | --- |
| Pod 创建失败 | ConfigMap 名称、Namespace、key 是否存在 |
| 对象已更新但环境变量没变 | 这是预期行为，需要重建 Pod |
| 挂载文件未变化 | kubelet 同步、subPath、对象是否 immutable |
| 文件变了但应用行为没变 | 应用是否 watch/reload、解析是否成功 |
| 发布后配置回退不了 | 配置是否版本化，是否与镜像 revision 一起记录 |
