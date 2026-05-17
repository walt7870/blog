---
title: Kubernetes 进阶导览
author: Walt
date: 2026-05-17
---

# Kubernetes 进阶导览

Kubernetes 的进阶能力主要围绕平台扩展展开。内置资源能覆盖通用部署需求，但数据库、消息队列、证书、网关、备份等复杂系统往往需要更高层的自动化模型，这时就会用到 CRD 和 Operator。

## 当前文档

| 文档 | 重点 | 适合场景 |
| --- | --- | --- |
| [CR 和 CRD](./CR-CRD) | 如何扩展 Kubernetes API，定义新的资源类型 | 平台扩展、声明式 API 设计 |
| [Operator](./operator) | 如何把运维逻辑写成控制器，持续调谐复杂应用 | 数据库、消息队列、存储系统自动化 |

## 从资源到平台能力

Kubernetes 内置控制器会管理 Deployment、StatefulSet、Job 等资源。Operator 的思路是把这种控制循环扩展到业务或中间件领域：

1. 用 CRD 注册一种新的资源类型，例如 `MysqlCluster`。
2. 用户创建 CR，描述期望状态，例如副本数、版本、存储大小。
3. Operator 监听 CR 变化。
4. Operator 创建或更新 StatefulSet、Service、PVC、Secret 等底层资源。
5. Operator 持续检查实际状态，并执行扩容、备份、恢复、升级等动作。

## 什么时候需要 CRD 和 Operator

| 场景 | 是否适合 |
| --- | --- |
| 只是部署一个无状态服务 | 不需要，Deployment 足够 |
| 需要抽象一组固定 YAML 模板 | 可以先用 Helm 或 Kustomize |
| 需要持续检查并修复状态 | 适合 Operator |
| 需要管理备份、恢复、主从切换、滚动升级 | 适合 Operator |
| 需要向用户暴露平台级声明式 API | 适合 CRD |

Operator 是平台自动化能力，不是所有应用都需要。只有当“创建资源”之外还有长期运维逻辑时，它才真正有价值。
