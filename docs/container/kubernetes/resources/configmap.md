---
title: Kubernetes ConfigMap
author: Walt
date: 2026-07-18
---

# Kubernetes ConfigMap

ConfigMap 保存非敏感配置，让同一镜像在不同环境使用不同参数。它是 Namespace 级 API 对象，单个对象不适合存放大文件或高频变化数据；敏感值应使用 Secret 或外部密钥系统。

例如订单 API 的支付超时从 2 秒调成 5 秒，修改 ConfigMap 只完成了“配置对象更新”。容器环境、挂载文件和进程内存是三个不同位置，必须继续确认谁读取新值、何时读取、失败后如何恢复。

![ConfigMap 更新在环境变量、目录投影和 subPath 中的生效边界](/container/configmap-update-boundaries.svg)

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

环境变量在容器创建时展开，ConfigMap 更新后不会改变已运行进程。以下是工作负载 Pod 模板中 `.spec.template.spec.containers[]` 的字段片段；直接 Pod 对应 `.spec.containers[]`。只映射需要的键，避免把文件型配置也作为环境变量注入：

```yaml
env:
  - name: LOG_LEVEL
    valueFrom:
      configMapKeyRef:
        name: order-api-config
        key: LOG_LEVEL
```

卷投影会由 kubelet 周期同步，延迟受同步周期和缓存传播策略共同影响，不能约定修改后立即生效。下面是 `.spec.template.spec` 的片段，容器的镜像、启动参数等字段需在现有模板中保留：

```yaml
volumes:
  - name: config
    configMap:
      name: order-api-config
      items:
        - key: application.yaml
          path: application.yaml
containers:
  - name: api
    volumeMounts:
      - name: config
        mountPath: /etc/order-api
        readOnly: true
```

使用 `subPath` 挂载单文件时，不会接收 ConfigMap 后续更新。需要确定性发布时，常用不可变版本名或把配置摘要写入 Pod template annotation，变更后触发受控滚动发布。

Pod 与被引用的 ConfigMap 必须同 Namespace。目录挂载会覆盖该路径原有的可见文件，所以示例使用专用 `/etc/order-api`，不直接覆盖整个 `/etc`。省略 `items` 会把每个 key 投影成文件，不会自动解析其中的 YAML。

文件更新也不等于进程已更新：一直持有旧文件描述符、只在启动时解析配置，或者重载时校验失败，都可能继续使用旧值。应用应重新打开路径，校验整份配置后再切换内存状态；多字段配置不能按若干文件的独立读取假定为业务事务。

## 不可变 ConfigMap

`immutable: true` 放在 ConfigMap 顶层，与 `data` 同级；启用后不能再改回 `false`，也不能修改 `data/binaryData`。不可变对象可防止误改并减少 watch 压力。发布通常创建新名称，例如 `order-api-config-r18`，再修改工作负载引用，保留上一版供回滚。删除后同名重建也不应当作现有 Pod 的可靠更新方式。

例如把支付超时从 2 秒改到 5 秒：先在新配置对象里验证单位和范围，再让少量新 Pod 引用它；用应用暴露的配置版本和超时指标验证后继续发布。仅修改 ConfigMap 不会改变 Deployment 的 Pod 模板，也不会自动创建新的 ReplicaSet。摘要 annotation 必须由交付工具同步更新，Kubernetes 不会代算。

回滚要同时还原镜像和配置引用；若旧 ConfigMap 已被删除，单独回滚 Deployment revision 也可能起不来。清理历史对象前，先检查仍运行的 Pod 与保留的回滚版本是否引用它。

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
pod_name=替换为实际订单Pod名称
kubectl describe pod "$pod_name" -n orders
kubectl exec "$pod_name" -n orders -c api -- cat /etc/order-api/application.yaml
kubectl get deploy order-api -n orders -o jsonpath='{.spec.template.metadata.annotations}'
```

示例容器名为 `api`，并要求镜像有 `cat`；精简镜像没有该工具时，改查应用的非敏感配置版本状态。先对比 API 对象、挂载文件和应用版本，再决定是否重建 Pod；不要为验证普通配置顺带输出同目录下的 Secret。

| 现象 | 优先检查 |
| --- | --- |
| Pod 创建失败 | ConfigMap 名称、Namespace、key 是否存在 |
| 对象已更新但环境变量没变 | 这是预期行为，需要重建 Pod |
| 挂载文件未变化 | kubelet 同步、subPath、对象是否 immutable |
| 文件变了但应用行为没变 | 应用是否 watch/reload、解析是否成功 |
| 发布后配置回退不了 | 配置是否版本化，是否与镜像 revision 一起记录 |
