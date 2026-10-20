---
title: Custom Resource 阅读入口
author: Walt
date: 2026-07-18
---

# Custom Resource 阅读入口

Custom Resource是通过CRD注册的自定义资源实例，例如平台的AppRelease。类型定义、版本迁移和控制器生命周期集中在进阶扩展专题。

完整内容见：

- [CRD 设计与版本演进](../advanced/CR-CRD)：schema、Spec/Status、Conditions、CEL、served/storage、转换和 finalizer。
- [Operator 与生产级 Reconcile](../advanced/operator)：幂等、副作用、缓存、并发、错误分类、删除和验收。
- [进阶扩展导览](../advanced/)：CRD、模板、Operator、Gateway、GitOps 与平台 API 的选型边界。

CRD 只注册 API 类型，不会自动执行领域操作；需要持续维护外部状态时，必须由控制器或 Operator 实现可恢复的调谐逻辑。
