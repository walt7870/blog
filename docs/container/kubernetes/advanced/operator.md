---
title: Kubernetes Operator 与生产级 Reconcile
author: Walt
date: 2026-07-18
---

# Kubernetes Operator 与生产级 Reconcile

Operator 是使用 Kubernetes 控制循环管理应用及其组件的软件扩展。它通常监听一种或多种 CR，并创建 Kubernetes 对象、调用外部 API、执行备份升级等领域动作。Operator 的价值不在于生成 YAML，而在于异常和重启之后仍能根据当前事实恢复收敛。

例如AppRelease为订单服务申请云数据库：外部创建成功后进程退出，status还没写回；下一轮如果只凭status为空就再创建，会产生第二份数据库和费用。可靠控制器先用CR UID查找同一项操作，再从外部事实继续。

![Operator 调谐状态机](/container/kubernetes-operator-state-machine.svg)

## Manager、Scheme 与高可用实例

controller-runtime 的 Manager 统一启动共享缓存、Client、Controller、Webhook、指标和健康探针。Scheme 建立 GroupVersionKind 与 Go 类型的映射；遗漏类型注册会让 Client 无法正确编解码对象。Manager 的缓存范围也决定控制器实际观察哪些 namespace 和对象，不能只靠 RBAC 推断。

多副本部署通常通过 Lease 做 Leader Election，保证同一时刻只有一个实例启动需要单活的控制器。Leader Election 提高进程故障恢复能力，但不会让错误 Reconcile 变正确，也不自动保护外部 API 的重复副作用。切主期间仍可能重放对象，因此幂等要求不变。

```bash
kubectl get lease -A
operator_namespace=替换为控制器命名空间
operator_name=替换为Deployment名称
kubectl get deploy,pod -n "$operator_namespace" -o wide
kubectl logs -n "$operator_namespace" "deploy/$operator_name" --all-containers
```

## Reconcile 的输入和输出

队列通常只传入对象键，Reconcile 再从缓存或 API 读取当前对象。事件可能被合并、重复或丢失中间状态，因此实现不能依赖“先收到 A，再收到 B”的完整顺序。

一次 Reconcile 应完成有限工作：

1. 读取当前 CR；不存在时结束。
2. 处理删除状态和 finalizer。
3. 计算期望的下级对象或外部状态。
4. 查询实际状态，只执行必要差异。
5. 更新 Status/Conditions，必要时安排下一次检查。

```go
func (r *AppReleaseReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    var app platformv1.AppRelease
    if err := r.Get(ctx, req.NamespacedName, &app); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    if !app.DeletionTimestamp.IsZero() {
        return r.reconcileDelete(ctx, &app)
    }
    if err := r.ensureFinalizer(ctx, &app); err != nil {
        return ctrl.Result{}, err
    }

    result, err := r.reconcileResources(ctx, &app)
    statusErr := r.updateStatus(ctx, &app, result, err)
    return result.Requeue, errors.Join(err, statusErr)
}
```

示例表达结构而非可直接复制的完整实现，辅助函数与返回类型尚需实现。生产代码还要处理 patch、冲突、缓存陈旧、权限和指标。必须先成功持久化finalizer，再发起需要删除清理的外部副作用；否则在两者之间删除CR会失去清理机会。删除分支也要先确认本控制器的finalizer存在，不接管其他控制器的职责。

## 幂等不是“重复调用同一接口”

Reconcile 可能在外部动作成功但 Status 写回前崩溃。下一轮无法从返回值知道动作是否已经完成，因此副作用需要稳定身份和可查询结果。

| 副作用 | 幂等策略 |
| --- | --- |
| 创建 Kubernetes 对象 | 稳定名称、OwnerReference、Create-or-Patch |
| 创建云资源 | 使用 CR UID 或业务键作为 idempotency key |
| 触发备份 | 先创建带稳定键的 Backup 记录，再执行动作 |
| 发送通知 | 按事件版本或状态迁移去重 |
| 更新 Status | Patch 自己负责的字段，冲突后重新读取 |

如果外部 API 不支持幂等，操作记录还必须能关联外部已提交结果。仅在本地写“准备创建”无法消除“外部已成功、响应丢失”的窗口；需要可查询的唯一标识、外部约束或人工对账路径，否则超时重试仍可能创建重复数据库、DNS或账单资源。

## 缓存、并发和字段所有权

controller-runtime 的默认 Client 通常读缓存、写 API Server。写入成功后立即从缓存读取，可能暂时看不到新状态。代码应接受这种最终一致性，不用固定 sleep 猜传播时间。

同一个controller的标准工作队列通常避免同一对象键同时被两个worker处理；这不排除不同对象争用同一云资源、多控制器写同一字段或旧leader外部请求仍在执行。外部唯一键和并发控制必须按真实资源身份设计。

多个控制循环可能同时修改对象，常见做法包括：

- 用 Patch 缩小写入范围，不整对象 Update 覆盖他人字段。
- 使用 Server-Side Apply 声明明确 field manager。
- 冲突后重新读取并重新计算，不盲目重放旧 patch。
- 用 `status.observedGeneration` 和下级资源 revision 判断当前进度。

不要在进程内互斥锁中保存跨重启真相。需要持久协调时，应使用对象状态、Lease 或外部系统提供的并发语义。

## Conditions 与错误分类

| 错误类型 | 处理方式 | 对外状态 |
| --- | --- | --- |
| 输入永久无效 | 不做无意义重试，等待 spec 变化 | `Ready=False`，稳定 Reason |
| 外部依赖暂时不可用 | 指数退避或显式 RequeueAfter | `Ready=Unknown/False`，记录依赖 |
| API 冲突 | 重新读取并快速重算 | 通常不升级为用户故障 |
| 领域动作进行中 | 按状态轮询，不重复创建动作 | `Progressing=True` |
| 删除清理失败 | 保留 finalizer 并重试 | `Deleting=False/Unknown` 与 Event |

Reason 应是稳定机器标识，例如 `DependencyUnavailable`；Message 可以包含具体实例和错误。不要把完整日志塞进 Status，也不要每轮无变化地写同一个 Condition，避免制造无意义更新和自触发循环。

## Watch 关系和重排

除主 CR 外，控制器通常还观察自己拥有的 Deployment、Job 或 Secret。下级对象变化应通过 OwnerReference 或索引映射回主对象。外部系统没有 Kubernetes 事件时，可以使用 `RequeueAfter` 或外部事件桥接，但需要随机抖动和速率限制，避免所有对象同时轮询。

定期重排是安全网，不应替代正确 watch。只依赖定时全量扫描会增加 API 压力并拉长恢复时间。

`Owns()` 适合带 Controller OwnerReference 的下级对象；跨 namespace、集群级资源或外部关系通常需要字段索引和显式 MapFunc。OwnerReference 同时影响垃圾回收，不能为了触发 watch 随意设置：namespace 作用域和所有权关系不合法时，删除行为会与预期不同。

## 删除状态机

删除流程常比创建复杂：

1. 首次正常 Reconcile 添加 finalizer。
2. 用户删除 CR，API Server 写入 `deletionTimestamp`。
3. Operator 停止创建新资源，查询并清理外部依赖。
4. 清理可重复执行，部分成功后下一轮从当前事实继续。
5. 所有清理完成后移除 finalizer，对象才真正消失。

必须定义外部 API 永久不可用时的人工接管方式、审计记录和风险确认。直接移除 finalizer 是放弃剩余清理，不是“修复 Operator”。

## 生产验收

一个生产级 Operator 至少要通过：

- 同一对象连续 Reconcile 多次，副作用数量不增加。
- 在外部动作前、动作后、Status 写回前分别终止进程，重启后可恢复。
- 多个对象并发调谐不会互相覆盖或突破外部限流。
- 缓存陈旧和 API 冲突不会造成重复创建。
- 删除过程中外部依赖失败，恢复后能继续清理。
- CRD 新旧版本转换、控制器滚动升级和回退路径经过验证。
- 指标能看到队列深度、调谐耗时、错误率、重试和最长未收敛对象。

## 工具和成熟 Operator 怎么选

Kubebuilder 与 Operator SDK 都能搭建 controller-runtime 项目，差别主要在脚手架、打包和生态集成，不替代状态机设计。OLM 关注 Operator 的发现、安装、依赖和升级；它也不会替业务 CR 自动设计兼容迁移。

评估现成 Operator 时，优先检查它是否真的编码了领域生命周期。CloudNativePG 管理 PostgreSQL 实例、复制、备份和故障切换；Strimzi 管理 Kafka 组件和滚动变更。这类价值来自持续观察和领域动作，不只是把 Helm 包再包一层 CR。

自研前至少回答：模板和 GitOps 是否已经够用；上游 Operator 的 CRD 升级与备份模型是否满足要求；团队能否长期承担 API 兼容、值班和恢复演练。没有长期所有者的 Operator 会把一次性 YAML 成本换成永久控制面成本。
