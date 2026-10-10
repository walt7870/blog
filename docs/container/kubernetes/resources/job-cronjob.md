---
title: Kubernetes Job 与 CronJob
author: Walt
date: 2026-07-18
---

# Kubernetes Job 与 CronJob

Job 运行一个需要完成的任务并跟踪成功次数；CronJob 按计划创建 Job。它们适合批处理、迁移、报表和周期任务，不适合常驻服务。控制器可能在故障边界上重复创建或执行，因此任务必须具备幂等和去重设计。

## Job

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: order-reconciliation-20260718
  namespace: orders
spec:
  backoffLimit: 3
  activeDeadlineSeconds: 1800
  ttlSecondsAfterFinished: 86400
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: worker
          image: registry.example.com/order-jobs@sha256:replace-with-digest
          args: ["reconcile", "--run-id=20260718"]
          resources:
            requests: { cpu: 200m, memory: 256Mi }
            limits: { memory: 512Mi }
```

`backoffLimit` 限制失败重试，`activeDeadlineSeconds` 限制整个 Job 运行时间，`ttlSecondsAfterFinished` 控制完成对象清理。关键任务的日志和结果应写入外部持久系统，不依赖已清理 Pod。

并行任务可配置 `completions` 和 `parallelism`，或使用 indexed completion mode 给每个 Pod 稳定索引。分片必须互斥或幂等，避免多个 Pod 处理同一数据。

## CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-order-report
  namespace: orders
spec:
  schedule: "0 2 * * *"
  timeZone: "Asia/Shanghai"
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 600
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: report
              image: registry.example.com/order-jobs@sha256:replace-with-digest
              args: ["daily-report"]
```

| 配置 | 选择边界 |
| --- | --- |
| `Allow` | 上一轮未结束也可启动新一轮，任务必须支持并发 |
| `Forbid` | 跳过重叠执行，适合不可并行任务 |
| `Replace` | 停止旧 Job 并创建新 Job，适合只关心最新结果 |
| `startingDeadlineSeconds` | 控制错过计划后的补启动窗口 |
| `timeZone` | 明确调度时区，避免依赖控制器本地时区 |

CronJob 调度不是严格的 exactly-once。控制器故障、时钟和状态更新边界都可能带来漏调或重复，业务应使用任务周期、run ID 或数据库唯一键去重。

## 任务幂等

可靠批任务通常采用：

- 输入区间或业务日期作为稳定 run ID。
- 数据库唯一键、状态机或 compare-and-set 防止重复写入。
- 先记录任务实例，再执行外部副作用。
- 可恢复的 checkpoint，而不是失败后从头重复所有动作。
- 把永久输入错误和暂时依赖错误分开处理。

## 排障

```bash
kubectl get cronjob,job,pod -n orders
kubectl describe cronjob daily-order-report -n orders
kubectl describe job <job> -n orders
kubectl logs job/<job> -n orders
kubectl get events -n orders --sort-by=.metadata.creationTimestamp
```

| 现象 | 优先检查 |
| --- | --- |
| CronJob 未创建 Job | schedule、timeZone、suspend、deadline、控制器 Events |
| Job 重复处理 | 业务幂等键、Cron 重叠、Pod 重建和重试 |
| Job 长期 Active | deadline、外部依赖超时、Pod 状态 |
| Job Failed | backoffLimit、退出码、日志和输入数据 |
| 完成对象过多 | TTL 和 history limit，外部日志保留策略 |
