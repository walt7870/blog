---
title: Kubernetes 版本与升级
author: Walt
date: 2026-07-18
---

# Kubernetes 版本与升级

Kubernetes 升级不是替换一个二进制，而是让控制面、节点、API 对象、准入扩展、网络、存储和平台组件跨过兼容窗口。升级计划的核心不是“目标版本”，而是依赖图、状态迁移和可执行的停止条件。

![Kubernetes 升级验证链路](/container/kubernetes-upgrade-flow.svg)

## 版本基线

截至 2026-07-18，官方维护最近三个小版本分支：1.36、1.35、1.34；1.36 当前补丁为 1.36.2，下一补丁计划为 1.36.3。小版本通常获得约一年的补丁支持。

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
- kubectl 只应在官方支持的版本偏差范围内使用。

因此常见顺序是先升级控制面，再灰度升级节点池，最后收敛客户端和运维工具。实际命令由 kubeadm、云厂商或集群发行版决定，但版本依赖不能跳过。

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

二进制或节点池可以回退，不代表所有状态都能无损回退。CRD storage 版本、etcd schema、数据库迁移、CNI 数据面状态和外部云资源都可能形成单向变化。

每项变更应明确属于哪一类：

| 类型 | 回退方式 |
| --- | --- |
| 无状态组件替换 | 切回旧 Deployment 或节点池 |
| API served 版本调整 | 重新开放兼容版本，前提是 schema 和转换仍可用 |
| 存储版本迁移 | 从备份恢复或执行反向转换，必须提前验证 |
| 数据库/外部资源变更 | 依赖应用自己的兼容和恢复方案 |
| CNI/Service 数据面切换 | 双跑、逐节点切换和明确的连接影响窗口 |

升级完成的定义不是所有节点显示新版本，而是兼容矩阵、核心业务、控制器收敛、网络存储、观测告警和恢复能力都重新通过验收。

## 官方资料

- [Kubernetes Release Process](https://kubernetes.io/releases/release/)
- [Version Skew Policy](https://kubernetes.io/releases/version-skew-policy/)
