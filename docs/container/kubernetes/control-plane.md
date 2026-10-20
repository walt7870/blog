---
title: Kubernetes 控制面、API 与调谐
author: Walt
date: 2026-10-20
---

# Kubernetes 控制面、API 与调谐

Kubernetes 的核心不是“启动容器”，而是维护一组可观察、可并发修改、能够持续收敛的 API 对象。一次写入会跨过同步请求链和异步控制链；只有把两条链分开，才能解释为什么 `kubectl apply` 成功后 Pod 仍可能迟迟不运行。

![API 写入与调谐链路](/container/kubernetes-api-reconcile.svg)

## 同步写路径

客户端向 kube-apiserver 发起请求后，主要经过以下阶段：

1. 认证确认请求身份。
2. 授权判断身份能否对目标资源执行对应 verb。
3. Mutating Admission 可以补默认值或修改对象。
4. 对象经过 schema 和内置规则校验。
5. Validating Admission 决定修改后的最终对象是否允许写入。
6. 数据通过存储层写入 etcd，并产生新的 `resourceVersion`。

API 返回成功的边界到此为止。它不等待 Deployment 控制器创建 ReplicaSet，也不等待镜像拉取、探针通过和流量切换。

Admission Webhook 位于 API 写路径上，因此必须限制匹配范围、设置较短超时、保持幂等，并避免依赖自己会阻断的资源。把不需要外部调用的规则放入 ValidatingAdmissionPolicy 或 CRD CEL 校验，通常比增加一个同步网络依赖更稳妥。

## list、watch 与对象版本

控制器通常先 list 当前对象，再从某个 `resourceVersion` 开始 watch 后续变化。watch 是变化通知，不是永久可靠的消息队列：连接会断开，历史版本会被压缩，客户端必须能重新 list 并恢复观察。

这带来三个工程结论：

- 不要假设每个中间事件都会被处理一次。
- Reconcile 应根据当前事实计算下一步，而不是依赖完整事件历史。
- 更新对象时要处理版本冲突，不能无条件覆盖其他写入者的字段。

```bash
kubectl get deploy order-api -n orders -o jsonpath='{.metadata.resourceVersion}{"\n"}'
kubectl get deploy order-api -n orders -w --output-watch-events
kubectl get deploy order-api -n orders -o yaml --show-managed-fields
```

`generation` 是资源期望状态的代次，具体哪些更新使其递增由资源实现决定，不能当成通用的 spec 修改计数器。例如 Deployment 的某些 annotation 更新也会推进代次。支持这套约定的控制器用 `status.observedGeneration` 或 Condition 中的 `observedGeneration` 表达已处理代次；不是所有资源都提供相同字段。比较前先确认对象类型，旧代次的 Available/Ready 不能直接证明最新变更已生效。

`resourceVersion` 是 API Server 提供的并发与观察游标，应当视为不透明字符串，不能解析大小或推断时间。watch 断开后，客户端从最后处理的版本继续；如果历史已被压缩，API 会返回 `410 Gone`，客户端必须丢弃旧缓存、重新 list，再建立 watch。Bookmark 只帮助客户端推进游标，不包含新的对象状态。

成熟客户端通常使用 client-go 的 Reflector 和 Informer 完成这套恢复逻辑：Reflector 负责 list/watch，Store/Indexer 保存本地对象，DeltaFIFO 或事件处理器把变化转成对象键，WorkQueue 负责去重、限速和重试，Reconcile 再按键读取当前事实。事件只是“重新检查”的提示，不是必须逐条消费的业务消息。

## 字段所有权与 Server-Side Apply

对象可能同时被用户、默认化逻辑、控制器和 GitOps 系统修改。Server-Side Apply（SSA）通过 `managedFields` 记录每个 field manager 拥有的字段集合；两个管理者对同一字段声明不同值时会产生冲突，而不是静默覆盖。

```bash
kubectl apply --server-side --field-manager=platform-controller -f app.yaml
kubectl get deploy order-api -n orders -o yaml --show-managed-fields
```

处理冲突前应先确认字段责任。同一字段有其他所有者时，从本管理者的 Apply 配置删除它并再次 Apply，可以放弃管理权；若自己是唯一所有者，省略字段可能从线上对象删除它，或恢复默认值。不能把删配置一律理解为“线上值保持不变”。确实要接管时再使用 `--force-conflicts`，它会转移字段所有权，可能让另一个控制器下一轮再次争抢并形成抖动。

例如 HPA 管理 `spec.replicas`，GitOps 每次却强制把副本写回 2，就会把扩到 6 的结果覆盖。应在工作流设计时明确谁负责副本数，再检查 `managedFields` 和实际更新事件；不要靠反复强制 Apply 解决控制权冲突。上面的 `app.yaml` 代表已有清单，SSA 命令会真实修改集群对象，应先确认 context 和文件内容。

## etcd 提供什么一致性

etcd 保存 Kubernetes API 的持久事实，但它不直接运行 Pod，也不替控制器完成业务副作用。kube-apiserver 负责把 Kubernetes 对象语义映射到存储操作，并对外提供一致的 API 行为。

高可用控制面需要关注的不只是 etcd 成员数，还包括：

- 多数派是否可达，提交延迟是否恶化。
- 磁盘空间、碎片和后端数据库是否健康。
- 快照是否在隔离环境完成过实际恢复。
- API Server 到 etcd 的网络与证书是否可用。

快照文件存在只证明执行过备份命令，不证明恢复时间和恢复点目标可达成。

## 控制器为什么可以重试

控制器把对象键放入工作队列，读取缓存中的当前对象，计算下一步动作并写回状态。一次 Reconcile 可能由创建、更新、关联对象变化、定时重排或上次失败触发。

可靠的控制器满足这些条件：

- 重复执行不会创建重复副作用。
- 外部动作有稳定幂等键，超时后可以查询结果。
- 只更新自己负责的字段，并处理乐观并发冲突。
- Status 描述已观察事实，不把动作意图伪装成成功。
- 临时错误进入限速重试，永久输入错误进入明确 Condition。

内置 Deployment 控制器和自定义 Operator 都遵循同一模型，差别只在负责的资源和领域动作。

工作队列把瞬时失败与热循环隔开。成功后忘记队列项；临时失败用限速重入；等待外部状态时使用带抖动的延迟重排；永久输入错误则更新 Condition，等待 spec 改变。所有错误都立即无延迟重试，会把一个坏对象放大成 API Server 压力。

## Pod 从提交到运行

Pod 落地跨越多个独立组件：

| 阶段 | 负责组件 | 关键结果 |
| --- | --- | --- |
| 创建 Pod | 控制器或用户 | API 中出现未绑定 Pod |
| 选择节点 | scheduler | `.spec.nodeName` 写入，PodScheduled 更新 |
| 准备运行 | kubelet | 取得配置与凭据，协调镜像、卷及沙箱准备 |
| 建立沙箱 | CRI 运行时、CNI | Pod sandbox、网络命名空间和 Pod IP |
| 挂载存储 | kubelet、CSI 及相关控制器 | 按驱动能力协调 attach、stage、publish |
| 启动容器 | CRI 运行时 | 容器进入 Running |
| 接收流量 | kubelet、EndpointSlice 控制器、数据面 | 就绪事实传播后，由数据面选择可服务端点 |

表格表达职责，卷与沙箱准备不构成所有实现都必须遵守的串行顺序。Pod phase 为 `Running` 表示已绑定节点、全部容器已创建，且至少一个仍在运行或启动、重启过程中，不等于业务可用。面向请求的判断还要看 Ready Condition、EndpointSlice 条件和真实响应。

## 用证据定位不收敛

先将 `pod_name` 改为实际 Pod 名。命令只查询现存对象，不创建测试应用：

```bash
pod_name=order-api-替换为实际名称
kubectl get deploy,rs,pod -n orders -o wide
kubectl describe deploy order-api -n orders
kubectl describe pod "$pod_name" -n orders
kubectl get pod "$pod_name" -n orders -o jsonpath='{range .status.conditions[*]}{.type}{"="}{.status}{" "}{.reason}{"\n"}{end}'
kubectl get events -n orders --sort-by=.metadata.creationTimestamp
```

按时间顺序记录“输入对象、控制器生成对象、调度结果、节点动作、就绪结果”。如果只保存最终 YAML，很容易把缓存延迟、队列阻塞、调度失败和节点执行失败混成同一个问题。

## 常见错误判断

| 错误判断 | 更准确的边界 |
| --- | --- |
| API 返回 200 就部署成功 | 只表示对象写入成功，异步收敛尚未完成 |
| watch 收到一次事件就执行一次动作 | watch 只用于触发检查，动作必须以当前事实为准 |
| 重启控制器能恢复就是偶发问题 | 重启可能清空局部状态，根因仍可能再次触发 |
| Status 是日志区 | Status 应是结构化、可观察的当前事实 |
| etcd 快照等于控制面容灾 | 还需验证恢复流程、证书、静态 Pod 和业务对象一致性 |
