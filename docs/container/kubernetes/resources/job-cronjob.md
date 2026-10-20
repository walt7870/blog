---
title: Kubernetes Job 与 CronJob
author: Walt
date: 2026-10-20
---

# Kubernetes Job 与 CronJob

Job 运行一个需要完成的任务并跟踪成功次数；CronJob 按计划创建 Job。它们适合批处理、迁移、报表和周期任务，不适合常驻服务。控制器可能在故障边界上重复创建或执行，因此任务必须具备幂等和去重设计。

![重试尝试与同一业务任务的去重边界](/container/job-business-idempotency.svg)

## Job

以下清单以 `orders` namespace 已存在为前提；镜像 digest 和应用参数必须替换。run ID 是业务输入，不应直接使用随机 Pod 名。示例不包含数据库凭据和实际对账逻辑。

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

deadline 优先于剩余重试次数；Job 已进入 Failed 后，不会因 `restartPolicy` 自动重启整个 Job。即使 `parallelism: 1`、`completions: 1` 且 Pod 不重启，也不能承诺程序只启动一次。

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

`Forbid` 只约束同一个 CronJob 创建的 Job，不能阻止另一个 CronJob 或手工补跑处理同一日期。重叠时错过的调度还受启动截止窗口影响；不要把它当成全局数据库锁。修改 jobTemplate 只影响之后新建的 Job，已经运行的实例不会同步更新；`suspend: true` 也不会停止已有 Job。

## 任务幂等

可靠批任务通常采用：

- 输入区间或业务日期作为稳定 run ID。
- 数据库唯一键、状态机或 compare-and-set 防止重复写入。
- 先记录任务实例，再执行外部副作用。
- 可恢复的 checkpoint，而不是失败后从头重复所有动作。
- 把永久输入错误和暂时依赖错误分开处理。

例如按业务日期生成日报，两个 Pod 都处理 `daily-report:2026-07-18`。数据库以“报表类型 + 业务日期”设唯一约束，在同一事务中提交结果和完成状态；重复尝试读取已提交结果，未完成尝试按 checkpoint 恢复。若还有发邮件、转账等外部动作，单独插入“已开始”记录仍可能在崩溃后漏做或重做，需要 outbox、外部幂等键和结果对账形成闭环。

## 排障

```bash
kubectl get cronjob,job,pod -n orders
kubectl describe cronjob daily-order-report -n orders
job_name=替换为实际任务名称
kubectl describe job "$job_name" -n orders
kubectl logs "job/$job_name" -n orders
kubectl get events -n orders --sort-by=.metadata.creationTimestamp
```

Job 可能包含多个尝试或分片；`logs job/...` 的单次输出不等于所有 Pod 日志。继续按 `batch.kubernetes.io/job-name` 标签列出各 Pod，分别核对当前与上一轮容器日志，并与业务 run ID 关联。

| 现象 | 优先检查 |
| --- | --- |
| CronJob 未创建 Job | schedule、timeZone、suspend、deadline、控制器 Events |
| Job 重复处理 | 业务幂等键、Cron 重叠、Pod 重建和重试 |
| Job 长期 Active | deadline、外部依赖超时、Pod 状态 |
| Job Failed | backoffLimit、退出码、日志和输入数据 |
| 完成对象过多 | TTL 和 history limit，外部日志保留策略 |
