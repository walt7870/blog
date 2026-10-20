---
title: Kubernetes 版本与升级
author: Walt
date: 2026-10-20
---

# Kubernetes 版本与升级

Kubernetes 升级不是替换一个二进制，而是让控制面、节点、API 对象、准入扩展、网络、存储和平台组件跨过兼容窗口。升级计划的核心不是“目标版本”，而是依赖图、状态迁移和可执行的停止条件。

![Kubernetes 升级验证链路](/container/kubernetes-upgrade-flow.svg)

## 版本基线

截至 2026-10-20，官方维护最近三个小版本分支：1.37、1.36、1.35。Kubernetes 1.19 及以后的分支通常获得约一年的补丁支持；托管平台的支持窗口可能不同。

生产计划应在执行当天再次查看官方 Releases 和 Patch Releases 页面。不要只写 `1.36`：补丁版本、托管平台支持窗口和关键插件兼容性都会影响实际目标。

## 一个特性怎样进入版本

Kubernetes 特性通常由负责领域的 SIG 提出和维护，通过 KEP 描述问题、API、毕业标准、兼容性、测试和回退方案。进入某个版本还要经过发布团队的跟踪阶段：Enhancements Freeze 前完成计划材料，随后进入实现和稳定期，Code Freeze 后只接受满足条件的修复。

| 阶段 | 能否默认依赖 | 生产判断 |
| --- | --- | --- |
| Alpha | 通常默认关闭，API 和行为可能变化 | 仅隔离实验，不承诺持久兼容 |
| Beta | 通常更稳定，但仍需核对 feature gate 和毕业条件 | 灰度验证，准备迁移与禁用路径 |
| Stable/GA | API 进入长期兼容承诺 | 仍需验证具体实现、发行版和插件支持 |

“进入某版本”不等于当前集群可直接使用：托管服务可能延后开放，Feature Gate 可能未启用，依赖组件也可能尚未支持。评估时应从发行说明回到 KEP 的风险、测试和毕业标准，而不只看功能介绍。

## 升级顺序来自版本偏差

基本约束包括：

- kubelet 不能比它通信的 kube-apiserver 更新，并可在支持范围内落后最多三个小版本。
- kube-controller-manager 和 kube-scheduler 不能比 kube-apiserver 更新，通常与其同版本，滚动升级时可落后一个小版本。
- 高可用控制面的新旧 kube-apiserver 通常只能相差一个小版本。
- kube-proxy 不能比 kube-apiserver 更新；现代版本可最多落后三个小版本，还需满足与同节点 kubelet 的偏差要求。
- kubectl 与 kube-apiserver 最多相差一个小版本，可新可旧；HA 中要同时满足它可能连接到的所有 API Server。

例如控制面同时存在 1.36 与 1.37 时，kubectl 1.36/1.37 都在交集内，1.38 则相对旧 API Server 超出范围；kubelet 1.37 也不能先连到 1.36。版本偏差是临时兼容上限，不代表所有旧分支仍受安全维护。

常见顺序是先滚动升级 kube-apiserver，待它们全部到位后升级 controller-manager/scheduler，再灰度节点池和相关客户端。kubeadm 不支持跳过小版本升级；从 1.35 到 1.37 应分成 1.35→1.36→1.37，每一步重新验收。托管平台或发行版可能有更严格要求，不能用最大偏差范围替代其升级流程。

## 升级前建立兼容矩阵

| 层级 | 必查内容 | 失败表现 |
| --- | --- | --- |
| Kubernetes API | 移除/弃用 API、feature gate、准入行为 | 对象无法读取或写入 |
| 控制面扩展 | Admission/Conversion Webhook、聚合 API | API 请求超时、CR 无法转换 |
| 节点数据面 | CNI、Service 实现、内核、kube-proxy 模式 | 网络中断、策略失效 |
| 存储 | CSI、StorageClass、快照 CRD、拓扑 | 卷无法挂载或恢复 |
| 平台组件 | Operator、GitOps、Gateway、Mesh、监控 | 控制器不收敛、状态误判 |
| 工作负载 | PDB、探针、优雅停机、容量 | 排空阻塞、发布容量不足 |

扫描 API 使用不能只看仓库 YAML，还要看集群中已存储对象、Helm 渲染结果、Operator 生成对象和 Webhook 支持版本。

```bash
kubectl api-resources
kubectl get crd -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.versions[*]}{.name}{":"}{.served}{":"}{.storage}{" "}{end}{"\n"}{end}'
kubectl get mutatingwebhookconfigurations,validatingwebhookconfigurations
kubectl get apiservices
```

## CRD 版本迁移

`served: true` 决定 API 是否继续提供某版本，`storage: true` 决定新写入对象使用哪个存储版本。切换 storage 标记不会自动重写历史对象；旧对象需要经过读取、转换和重写，或使用经过验证的 Storage Version Migration 流程。

`status.storedVersions` 记录可能仍存储的版本，不是逐个对象的实时清单。确认全部对象已迁移并验证读写后，才按迁移流程移除旧 stored version，再从 `spec.versions` 移除旧声明。直接修改这份状态列表不会转换任何数据，也不能证明迁移完成。先关闭旧版本 `served` 前，还要确认客户端、控制器和清单均已切换。

如果 schema 变化需要 Conversion Webhook，升级前必须验证：

- 新旧版本可以双向转换，关键字段不丢失。
- Webhook 在控制面升级和节点维护期间仍高可用。
- 证书、Service、网络策略和超时不会形成 API 依赖环。
- 转换失败时能够停止升级，而不是删除有问题的 CR。

## 灰度、验证和停止条件

一次可控升级至少分成这些阶段：

1. 在隔离环境恢复 etcd 或平台备份，证明恢复步骤可用。
2. 用真实 CRD、Webhook、CNI、CSI 和工作负载执行预演。
3. 升级一个控制面或托管测试集群，观察 API 错误率和延迟。
4. 选择非关键节点池灰度，验证调度、网络、卷、探针和排空。
5. 扩大节点范围，同时保留故障域和容量余量。
6. 观察完整业务周期后再清理旧 API、旧节点池和兼容配置。

停止条件应在升级前量化，例如 API 5xx、Webhook P99、Pod Pending、卷挂载失败、网络错误率、业务尾延迟或错误预算消耗超过阈值。没有停止条件的“观察一下”无法支撑夜间决策。

## 回退边界

不要把 Kubernetes 升级回退写成“安装旧二进制”。kubeadm 的版本检查中存在降级偏差约束，但通过版本检查不代表 API、etcd、插件和业务状态都能反向迁移。控制面和 etcd 恢复必须遵循发行版支持的备份恢复流程，并确认快照、证书、组件版本与恢复点一致。另建旧节点池能否承接工作负载，也受 API Server 偏差和插件兼容约束。

CRD storage 版本、数据库迁移、CNI 数据面状态和外部云资源还可能形成单向变化。恢复集群快照会回退 API 对象，却不会同步撤销已发出的支付、云资源创建或外部数据库写入。

每项变更应明确属于哪一类：

| 类型 | 回退方式 |
| --- | --- |
| 应用无状态组件替换 | 在API和依赖兼容前提下切回旧镜像或已验证节点池 |
| API served 版本调整 | 重新开放兼容版本，前提是 schema 和转换仍可用 |
| 存储版本迁移 | 从备份恢复或执行反向转换，必须提前验证 |
| 数据库/外部资源变更 | 依赖应用自己的兼容和恢复方案 |
| CNI/Service 数据面切换 | 双跑、逐节点切换和明确的连接影响窗口 |

升级完成的定义不是所有节点显示新版本，而是兼容矩阵、核心业务、控制器收敛、网络存储、观测告警和恢复能力都重新通过验收。
