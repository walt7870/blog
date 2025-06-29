# Job 和 CronJob

## 概述

Job 和 CronJob 是 Kubernetes 中用于运行批处理任务的工作负载控制器。Job 用于运行一次性任务，确保指定数量的 Pod 成功完成；CronJob 则基于时间调度定期运行 Job，类似于 Linux 的 cron。

| 控制器 | 用途 | 执行方式 | 适用场景 |
| ---- | ---- | ---- | ---- |
| Job | 一次性任务 | 立即执行 | 数据处理、备份、迁移 |
| CronJob | 定时任务 | 按时间调度 | 定期备份、报告生成、清理任务 |

## Job 详解

### Job 的本质

#### 设计理念

* **任务完成性**：确保任务成功完成指定次数
* **失败重试**：自动重试失败的任务
* **并行执行**：支持并行运行多个 Pod
* **资源清理**：任务完成后可选择保留或清理 Pod

#### 工作原理

```
Job 创建
    ↓
创建 Pod 执行任务
    ↓
Pod 执行完成 → 成功计数 +1
Pod 执行失败 → 重试或失败计数 +1
    ↓
达到成功次数 → Job 完成
达到失败次数 → Job 失败
```

### Job 基本配置

#### 1. 简单的 Job

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: simple-job
  labels:
    app: simple-job
spec:
  # 成功完成的 Pod 数量
  completions: 1
  
  # 并行运行的 Pod 数量
  parallelism: 1
  
  # 失败重试次数
  backoffLimit: 3
  
  # 任务超时时间（秒）
  activeDeadlineSeconds: 300
  
  template:
    metadata:
      labels:
        app: simple-job
    spec:
      restartPolicy: Never  # Job 中必须设置为 Never 或 OnFailure
      
      containers:
      - name: worker
        image: busybox:1.35
        command:
        - /bin/sh
        - -c
        - |
          echo "Starting job at $(date)"
          sleep 30
          echo "Job completed at $(date)"
        
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

#### 2. 并行处理 Job

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: parallel-job
  labels:
    app: parallel-job
spec:
  # 总共需要完成 10 个任务
  completions: 10
  
  # 同时运行 3 个 Pod
  parallelism: 3
  
  # 最多重试 2 次
  backoffLimit: 2
  
  template:
    metadata:
      labels:
        app: parallel-job
    spec:
      restartPolicy: OnFailure
      
      containers:
      - name: worker
        image: alpine:3.16
        command:
        - /bin/sh
        - -c
        - |
          # 模拟处理任务
          TASK_ID=$(shuf -i 1-1000 -n 1)
          echo "Processing task $TASK_ID"
          
          # 模拟处理时间
          sleep $((RANDOM % 60 + 10))
          
          # 模拟随机失败
          if [ $((RANDOM % 10)) -eq 0 ]; then
            echo "Task $TASK_ID failed"
            exit 1
          fi
          
          echo "Task $TASK_ID completed successfully"
        
        env:
        - name: JOB_COMPLETION_INDEX
          valueFrom:
            fieldRef:
              fieldPath: metadata.annotations['batch.kubernetes.io/job-completion-index']
        
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

#### 3. 带有工作队列的 Job

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: work-queue-job
  labels:
    app: work-queue-job
spec:
  # 不指定 completions，由工作队列控制
  parallelism: 5
  backoffLimit: 3
  
  template:
    metadata:
      labels:
        app: work-queue-job
    spec:
      restartPolicy: Never
      
      initContainers:
      # 初始化工作队列
      - name: queue-init
        image: redis:7-alpine
        command:
        - /bin/sh
        - -c
        - |
          # 等待 Redis 启动
          until redis-cli -h redis-service ping; do
            echo "Waiting for Redis..."
            sleep 2
          done
          
          # 填充工作队列
          for i in $(seq 1 100); do
            redis-cli -h redis-service lpush work-queue "task-$i"
          done
          
          echo "Work queue initialized with 100 tasks"
      
      containers:
      - name: worker
        image: alpine:3.16
        command:
        - /bin/sh
        - -c
        - |
          apk add --no-cache redis
          
          while true; do
            # 从队列获取任务
            TASK=$(redis-cli -h redis-service rpop work-queue)
            
            if [ "$TASK" = "" ]; then
              echo "No more tasks, exiting"
              break
            fi
            
            echo "Processing $TASK"
            
            # 模拟任务处理
            sleep $((RANDOM % 10 + 5))
            
            # 模拟失败率
            if [ $((RANDOM % 20)) -eq 0 ]; then
              echo "$TASK failed, putting back to queue"
              redis-cli -h redis-service lpush work-queue "$TASK"
              continue
            fi
            
            echo "$TASK completed"
            
            # 记录完成的任务
            redis-cli -h redis-service lpush completed-tasks "$TASK"
          done
        
        env:
        - name: REDIS_HOST
          value: "redis-service"
        
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 300m
            memory: 256Mi

---
# Redis 服务用于工作队列
apiVersion: v1
kind: Service
metadata:
  name: redis-service
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

### Job 完成模式

#### 1. Indexed Job（索引作业）

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: indexed-job
spec:
  completions: 5
  parallelism: 2
  completionMode: Indexed  # 启用索引模式
  
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: worker
        image: alpine:3.16
        command:
        - /bin/sh
        - -c
        - |
          # 获取当前 Pod 的索引
          INDEX=${JOB_COMPLETION_INDEX}
          echo "Processing task with index: $INDEX"
          
          # 基于索引处理不同的任务
          case $INDEX in
            0) echo "Processing user data batch 1" ;;
            1) echo "Processing user data batch 2" ;;
            2) echo "Processing user data batch 3" ;;
            3) echo "Processing user data batch 4" ;;
            4) echo "Processing user data batch 5" ;;
          esac
          
          # 模拟处理时间
          sleep $((INDEX * 10 + 20))
          
          echo "Task $INDEX completed"
        
        env:
        - name: JOB_COMPLETION_INDEX
          valueFrom:
            fieldRef:
              fieldPath: metadata.annotations['batch.kubernetes.io/job-completion-index']
```

#### 2. Pod Failure Policy（Pod 失败策略）

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: job-with-failure-policy
spec:
  completions: 3
  parallelism: 2
  backoffLimit: 6
  
  # Pod 失败策略
  podFailurePolicy:
    rules:
    # 对于退出码 42，忽略失败
    - action: Ignore
      onExitCodes:
        operator: In
        values: [42]
    
    # 对于退出码 1-10，立即失败整个 Job
    - action: FailJob
      onExitCodes:
        operator: In
        values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    
    # 对于特定的 Pod 条件，计入失败次数
    - action: Count
      onPodConditions:
      - type: DisruptionTarget
  
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: worker
        image: alpine:3.16
        command:
        - /bin/sh
        - -c
        - |
          # 模拟不同的退出码
          RANDOM_EXIT=$((RANDOM % 50))
          
          if [ $RANDOM_EXIT -eq 42 ]; then
            echo "Exiting with code 42 (will be ignored)"
            exit 42
          elif [ $RANDOM_EXIT -le 10 ]; then
            echo "Exiting with code $RANDOM_EXIT (will fail job)"
            exit $RANDOM_EXIT
          else
            echo "Task completed successfully"
            exit 0
          fi
```

## CronJob 详解

### CronJob 的本质

#### 设计理念

* **时间调度**：基于 cron 表达式定时执行
* **Job 管理**：自动创建和管理 Job
* **历史管理**：控制保留的 Job 历史记录
* **并发控制**：控制同时运行的 Job 数量

#### Cron 表达式格式

```
# 格式：分 时 日 月 周
# 字段：0-59 0-23 1-31 1-12 0-7 (0和7都表示周日)

# 示例
"0 2 * * *"     # 每天凌晨2点
"*/15 * * * *"  # 每15分钟
"0 9-17 * * 1-5" # 工作日9-17点的整点
"0 0 1 * *"     # 每月1号凌晨
"0 0 * * 0"     # 每周日凌晨
```

### CronJob 基本配置

#### 1. 简单的 CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: simple-cronjob
  labels:
    app: simple-cronjob
spec:
  # 每5分钟执行一次
  schedule: "*/5 * * * *"
  
  # 时区设置
  timeZone: "Asia/Shanghai"
  
  # 并发策略
  concurrencyPolicy: Forbid
  
  # 启动截止时间（秒）
  startingDeadlineSeconds: 300
  
  # 保留成功的 Job 数量
  successfulJobsHistoryLimit: 3
  
  # 保留失败的 Job 数量
  failedJobsHistoryLimit: 1
  
  # 暂停调度
  suspend: false
  
  jobTemplate:
    metadata:
      labels:
        app: simple-cronjob
    spec:
      backoffLimit: 2
      activeDeadlineSeconds: 600
      
      template:
        metadata:
          labels:
            app: simple-cronjob
        spec:
          restartPolicy: OnFailure
          
          containers:
          - name: worker
            image: alpine:3.16
            command:
            - /bin/sh
            - -c
            - |
              echo "CronJob started at $(date)"
              
              # 模拟任务处理
              echo "Processing scheduled task..."
              sleep 30
              
              echo "CronJob completed at $(date)"
            
            resources:
              requests:
                cpu: 100m
                memory: 128Mi
              limits:
                cpu: 200m
                memory: 256Mi
```

#### 2. 数据库备份 CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
  namespace: production
  labels:
    app: database-backup
spec:
  # 每天凌晨2点执行
  schedule: "0 2 * * *"
  timeZone: "Asia/Shanghai"
  
  concurrencyPolicy: Forbid  # 禁止并发执行
  startingDeadlineSeconds: 600
  successfulJobsHistoryLimit: 7  # 保留一周的备份记录
  failedJobsHistoryLimit: 3
  
  jobTemplate:
    spec:
      backoffLimit: 1
      activeDeadlineSeconds: 3600  # 1小时超时
      
      template:
        spec:
          restartPolicy: Never
          
          serviceAccountName: backup-sa
          
          containers:
          - name: backup
            image: postgres:15-alpine
            command:
            - /bin/sh
            - -c
            - |
              set -e
              
              # 设置备份文件名
              BACKUP_FILE="backup-$(date +%Y%m%d-%H%M%S).sql"
              
              echo "Starting database backup: $BACKUP_FILE"
              
              # 执行数据库备份
              pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > /backup/$BACKUP_FILE
              
              # 压缩备份文件
              gzip /backup/$BACKUP_FILE
              
              echo "Backup completed: $BACKUP_FILE.gz"
              
              # 清理7天前的备份
              find /backup -name "backup-*.sql.gz" -mtime +7 -delete
              
              echo "Old backups cleaned up"
            
            env:
            - name: DB_HOST
              value: "postgresql.database.svc.cluster.local"
            - name: DB_USER
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: username
            - name: DB_NAME
              value: "production"
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: password
            
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
            
            resources:
              requests:
                cpu: 500m
                memory: 512Mi
              limits:
                cpu: 1000m
                memory: 1Gi
          
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc

---
# 备份存储 PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: backup-pvc
  namespace: production
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: fast-ssd

---
# 数据库凭据
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: production
type: Opaque
data:
  username: cG9zdGdyZXM=  # postgres
  password: cGFzc3dvcmQ=  # password
```

#### 3. 日志清理 CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: log-cleanup
  namespace: kube-system
  labels:
    app: log-cleanup
spec:
  # 每天凌晨3点执行
  schedule: "0 3 * * *"
  timeZone: "Asia/Shanghai"
  
  concurrencyPolicy: Replace  # 如果上次任务还在运行，替换它
  startingDeadlineSeconds: 300
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  
  jobTemplate:
    spec:
      backoffLimit: 2
      activeDeadlineSeconds: 1800  # 30分钟超时
      
      template:
        spec:
          restartPolicy: OnFailure
          
          # 需要访问节点文件系统
          hostNetwork: true
          
          tolerations:
          - operator: Exists
            effect: NoSchedule
          
          nodeSelector:
            kubernetes.io/os: linux
          
          containers:
          - name: cleanup
            image: alpine:3.16
            command:
            - /bin/sh
            - -c
            - |
              set -e
              
              echo "Starting log cleanup at $(date)"
              
              # 清理容器日志（保留7天）
              find /var/log/containers -name "*.log" -mtime +7 -delete || true
              
              # 清理 Pod 日志（保留7天）
              find /var/log/pods -name "*.log" -mtime +7 -delete || true
              
              # 清理系统日志（保留30天）
              find /var/log -name "*.log" -mtime +30 -delete || true
              find /var/log -name "*.log.*" -mtime +30 -delete || true
              
              # 清理 journal 日志（保留30天）
              journalctl --vacuum-time=30d || true
              
              # 清理 Docker 日志
              docker system prune -f --filter "until=168h" || true
              
              echo "Log cleanup completed at $(date)"
            
            securityContext:
              privileged: true
            
            volumeMounts:
            - name: var-log
              mountPath: /var/log
            - name: var-lib-docker
              mountPath: /var/lib/docker
            - name: docker-sock
              mountPath: /var/run/docker.sock
            
            resources:
              requests:
                cpu: 100m
                memory: 128Mi
              limits:
                cpu: 500m
                memory: 256Mi
          
          volumes:
          - name: var-log
            hostPath:
              path: /var/log
          - name: var-lib-docker
            hostPath:
              path: /var/lib/docker
          - name: docker-sock
            hostPath:
              path: /var/run/docker.sock
```

### 并发策略

#### 1. Forbid - 禁止并发

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: exclusive-job
spec:
  schedule: "*/2 * * * *"
  concurrencyPolicy: Forbid  # 如果上次任务还在运行，跳过本次
  
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
          - name: worker
            image: alpine:3.16
            command: ["/bin/sh", "-c", "sleep 300"]  # 长时间运行
```

#### 2. Allow - 允许并发

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: concurrent-job
spec:
  schedule: "*/1 * * * *"
  concurrencyPolicy: Allow  # 允许多个任务同时运行
  
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
          - name: worker
            image: alpine:3.16
            command: ["/bin/sh", "-c", "sleep 120"]  # 可能重叠
```

#### 3. Replace - 替换运行

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: replace-job
spec:
  schedule: "*/3 * * * *"
  concurrencyPolicy: Replace  # 停止旧任务，启动新任务
  
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
          - name: worker
            image: alpine:3.16
            command: ["/bin/sh", "-c", "sleep 400"]  # 长时间运行
```

## 实际应用场景

### 1. 数据处理管道

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processing-pipeline
  labels:
    pipeline: data-processing
    version: v1.0
spec:
  completions: 1
  backoffLimit: 3
  activeDeadlineSeconds: 7200  # 2小时超时
  
  template:
    metadata:
      labels:
        pipeline: data-processing
    spec:
      restartPolicy: Never
      
      initContainers:
      # 数据验证
      - name: data-validator
        image: data-validator:v1.0
        command:
        - /bin/sh
        - -c
        - |
          echo "Validating input data..."
          
          # 检查数据源
          if ! curl -f $DATA_SOURCE_URL/health; then
            echo "Data source not available"
            exit 1
          fi
          
          # 验证数据格式
          python /app/validate_data.py --source $DATA_SOURCE_URL
          
          echo "Data validation completed"
        
        env:
        - name: DATA_SOURCE_URL
          value: "https://api.example.com/data"
        
        volumeMounts:
        - name: shared-data
          mountPath: /data
      
      containers:
      # 数据提取
      - name: data-extractor
        image: data-extractor:v1.0
        command:
        - /bin/sh
        - -c
        - |
          echo "Extracting data..."
          
          # 从API提取数据
          curl -o /data/raw_data.json $DATA_SOURCE_URL/export
          
          # 数据预处理
          python /app/extract.py --input /data/raw_data.json --output /data/extracted_data.json
          
          echo "Data extraction completed"
        
        env:
        - name: DATA_SOURCE_URL
          value: "https://api.example.com/data"
        
        volumeMounts:
        - name: shared-data
          mountPath: /data
        
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
      
      # 数据转换
      - name: data-transformer
        image: data-transformer:v1.0
        command:
        - /bin/sh
        - -c
        - |
          echo "Transforming data..."
          
          # 等待提取完成
          while [ ! -f /data/extracted_data.json ]; do
            echo "Waiting for data extraction..."
            sleep 10
          done
          
          # 数据转换
          python /app/transform.py --input /data/extracted_data.json --output /data/transformed_data.json
          
          echo "Data transformation completed"
        
        volumeMounts:
        - name: shared-data
          mountPath: /data
        
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 3000m
            memory: 8Gi
      
      # 数据加载
      - name: data-loader
        image: data-loader:v1.0
        command:
        - /bin/sh
        - -c
        - |
          echo "Loading data..."
          
          # 等待转换完成
          while [ ! -f /data/transformed_data.json ]; do
            echo "Waiting for data transformation..."
            sleep 10
          done
          
          # 加载到数据库
          python /app/load.py --input /data/transformed_data.json --db-url $DATABASE_URL
          
          echo "Data loading completed"
        
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: url
        
        volumeMounts:
        - name: shared-data
          mountPath: /data
        
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi
      
      volumes:
      - name: shared-data
        emptyDir:
          sizeLimit: 10Gi
```

### 2. 报告生成 CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: weekly-report
  namespace: analytics
  labels:
    app: weekly-report
spec:
  # 每周一早上8点执行
  schedule: "0 8 * * 1"
  timeZone: "Asia/Shanghai"
  
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 3600
  successfulJobsHistoryLimit: 4  # 保留4周的记录
  failedJobsHistoryLimit: 2
  
  jobTemplate:
    spec:
      backoffLimit: 2
      activeDeadlineSeconds: 7200  # 2小时超时
      
      template:
        spec:
          restartPolicy: Never
          
          serviceAccountName: report-generator
          
          containers:
          - name: report-generator
            image: report-generator:v2.0
            command:
            - /bin/sh
            - -c
            - |
              set -e
              
              echo "Starting weekly report generation at $(date)"
              
              # 计算报告周期
              END_DATE=$(date +%Y-%m-%d)
              START_DATE=$(date -d "7 days ago" +%Y-%m-%d)
              
              echo "Generating report for period: $START_DATE to $END_DATE"
              
              # 生成各种报告
              python /app/generate_user_report.py --start $START_DATE --end $END_DATE
              python /app/generate_sales_report.py --start $START_DATE --end $END_DATE
              python /app/generate_performance_report.py --start $START_DATE --end $END_DATE
              
              # 合并报告
              python /app/merge_reports.py --output /reports/weekly-report-$(date +%Y%m%d).pdf
              
              # 发送邮件
              python /app/send_email.py --report /reports/weekly-report-$(date +%Y%m%d).pdf
              
              echo "Weekly report generation completed at $(date)"
            
            env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: analytics-db
                  key: url
            - name: SMTP_SERVER
              value: "smtp.company.com"
            - name: SMTP_USER
              valueFrom:
                secretKeyRef:
                  name: email-credentials
                  key: username
            - name: SMTP_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: email-credentials
                  key: password
            - name: REPORT_RECIPIENTS
              value: "management@company.com,analytics@company.com"
            
            volumeMounts:
            - name: report-storage
              mountPath: /reports
            - name: temp-storage
              mountPath: /tmp
            
            resources:
              requests:
                cpu: 1000m
                memory: 2Gi
              limits:
                cpu: 2000m
                memory: 4Gi
          
          volumes:
          - name: report-storage
            persistentVolumeClaim:
              claimName: report-pvc
          - name: temp-storage
            emptyDir:
              sizeLimit: 5Gi
```

### 3. 系统维护任务

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: system-maintenance
  namespace: kube-system
  labels:
    app: system-maintenance
spec:
  # 每周日凌晨1点执行
  schedule: "0 1 * * 0"
  timeZone: "Asia/Shanghai"
  
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 1800
  successfulJobsHistoryLimit: 4
  failedJobsHistoryLimit: 2
  
  jobTemplate:
    spec:
      backoffLimit: 1
      activeDeadlineSeconds: 10800  # 3小时超时
      
      template:
        spec:
          restartPolicy: Never
          
          serviceAccountName: system-maintenance
          
          hostNetwork: true
          hostPID: true
          
          tolerations:
          - operator: Exists
            effect: NoSchedule
          
          containers:
          - name: maintenance
            image: maintenance-tools:v1.0
            command:
            - /bin/bash
            - -c
            - |
              set -e
              
              echo "Starting system maintenance at $(date)"
              
              # 1. 清理未使用的 Docker 镜像
              echo "Cleaning up Docker images..."
              docker image prune -a -f --filter "until=168h"
              
              # 2. 清理未使用的卷
              echo "Cleaning up Docker volumes..."
              docker volume prune -f
              
              # 3. 清理系统缓存
              echo "Cleaning up system cache..."
              sync && echo 3 > /proc/sys/vm/drop_caches
              
              # 4. 清理临时文件
              echo "Cleaning up temporary files..."
              find /tmp -type f -atime +7 -delete
              find /var/tmp -type f -atime +7 -delete
              
              # 5. 清理日志文件
              echo "Rotating log files..."
              logrotate -f /etc/logrotate.conf
              
              # 6. 检查磁盘使用情况
              echo "Checking disk usage..."
              df -h
              
              # 7. 检查内存使用情况
              echo "Checking memory usage..."
              free -h
              
              # 8. 更新系统包（如果需要）
              if [ "$UPDATE_PACKAGES" = "true" ]; then
                echo "Updating system packages..."
                apt-get update && apt-get upgrade -y
              fi
              
              echo "System maintenance completed at $(date)"
            
            env:
            - name: UPDATE_PACKAGES
              value: "false"  # 设置为 true 以启用包更新
            
            securityContext:
              privileged: true
            
            volumeMounts:
            - name: docker-sock
              mountPath: /var/run/docker.sock
            - name: host-root
              mountPath: /host
            - name: proc
              mountPath: /proc
            - name: sys
              mountPath: /sys
            
            resources:
              requests:
                cpu: 500m
                memory: 512Mi
              limits:
                cpu: 2000m
                memory: 2Gi
          
          volumes:
          - name: docker-sock
            hostPath:
              path: /var/run/docker.sock
          - name: host-root
            hostPath:
              path: /
          - name: proc
            hostPath:
              path: /proc
          - name: sys
            hostPath:
              path: /sys
```

## 命令行操作

### Job 操作

```bash
# 创建 Job
kubectl apply -f job.yaml

# 查看 Job
kubectl get jobs
kubectl get job simple-job -o wide

# 查看 Job 详情
kubectl describe job simple-job

# 查看 Job 的 Pod
kubectl get pods -l job-name=simple-job

# 查看 Job 日志
kubectl logs -l job-name=simple-job
kubectl logs job/simple-job  # 查看所有 Pod 日志

# 删除 Job
kubectl delete job simple-job

# 删除 Job 但保留 Pod
kubectl delete job simple-job --cascade=orphan
```

### CronJob 操作

```bash
# 创建 CronJob
kubectl apply -f cronjob.yaml

# 查看 CronJob
kubectl get cronjobs
kubectl get cj  # 简写

# 查看 CronJob 详情
kubectl describe cronjob simple-cronjob

# 查看 CronJob 创建的 Job
kubectl get jobs -l cronjob=simple-cronjob

# 手动触发 CronJob
kubectl create job manual-job --from=cronjob/simple-cronjob

# 暂停 CronJob
kubectl patch cronjob simple-cronjob -p '{"spec":{"suspend":true}}'

# 恢复 CronJob
kubectl patch cronjob simple-cronjob -p '{"spec":{"suspend":false}}'

# 删除 CronJob
kubectl delete cronjob simple-cronjob
```

### 监控和调试

```bash
# 查看 Job 状态
kubectl get jobs -w  # 监控状态变化

# 查看 Job 事件
kubectl get events --field-selector involvedObject.kind=Job

# 查看失败的 Job
kubectl get jobs --field-selector status.successful!=1

# 查看 CronJob 的执行历史
kubectl get jobs -l cronjob=backup-job --sort-by=.metadata.creationTimestamp

# 查看 Pod 的退出码
kubectl get pods -l job-name=simple-job -o jsonpath='{.items[*].status.containerStatuses[*].state.terminated.exitCode}'

# 查看资源使用情况
kubectl top pods -l job-name=simple-job
```

## 故障排查

### 常见问题

| 问题 | 可能原因 | 解决方案 |
| ---- | ---- | ---- |
| Job 一直不完成 | Pod 无法成功退出 | 检查应用逻辑和退出码 |
| CronJob 没有执行 | cron 表达式错误 | 验证 cron 表达式格式 |
| Job 超时失败 | activeDeadlineSeconds 太小 | 增加超时时间 |
| Pod 重复重启 | restartPolicy 设置错误 | 设置为 Never 或 OnFailure |
| 并发 Job 冲突 | concurrencyPolicy 设置不当 | 调整并发策略 |

### 诊断步骤

1. **检查 Job/CronJob 状态**
```bash
kubectl describe job simple-job
kubectl describe cronjob simple-cronjob
```

2. **检查 Pod 状态**
```bash
kubectl get pods -l job-name=simple-job
kubectl describe pod <pod-name>
```

3. **查看日志**
```bash
kubectl logs -l job-name=simple-job
kubectl logs <pod-name> --previous  # 查看之前的日志
```

4. **检查事件**
```bash
kubectl get events --sort-by=.metadata.creationTimestamp
```

5. **验证 cron 表达式**
```bash
# 使用在线工具验证 cron 表达式
# 或使用命令行工具
echo "0 2 * * *" | crontab -
crontab -l
```

## 最佳实践

### 1. 资源配置

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: optimized-job
spec:
  completions: 1
  parallelism: 1
  backoffLimit: 3
  activeDeadlineSeconds: 3600
  
  template:
    spec:
      restartPolicy: Never
      
      containers:
      - name: worker
        image: worker:v1.0
        
        # 合理的资源配置
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        
        # 环境变量
        env:
        - name: JOB_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        
        # 优雅关闭
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 10"]
      
      # 节点选择
      nodeSelector:
        workload-type: batch
      
      # 容忍度
      tolerations:
      - key: batch-workload
        operator: Equal
        value: "true"
        effect: NoSchedule
```

### 2. 错误处理

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: robust-job
spec:
  completions: 1
  backoffLimit: 5
  activeDeadlineSeconds: 7200
  
  # Pod 失败策略
  podFailurePolicy:
    rules:
    - action: Ignore
      onExitCodes:
        operator: In
        values: [42]  # 忽略特定退出码
    - action: FailJob
      onExitCodes:
        operator: In
        values: [1, 2, 3]  # 立即失败
  
  template:
    spec:
      restartPolicy: Never
      
      containers:
      - name: worker
        image: robust-worker:v1.0
        command:
        - /bin/bash
        - -c
        - |
          set -e  # 遇到错误立即退出
          
          # 错误处理函数
          handle_error() {
            echo "Error occurred at line $1"
            # 清理资源
            cleanup
            exit 1
          }
          
          # 清理函数
          cleanup() {
            echo "Cleaning up resources..."
            # 清理临时文件
            rm -rf /tmp/job-*
          }
          
          # 设置错误陷阱
          trap 'handle_error $LINENO' ERR
          
          # 设置退出陷阱
          trap cleanup EXIT
          
          echo "Starting job execution"
          
          # 重试机制
          retry_count=0
          max_retries=3
          
          while [ $retry_count -lt $max_retries ]; do
            if process_data; then
              echo "Job completed successfully"
              exit 0
            else
              retry_count=$((retry_count + 1))
              echo "Attempt $retry_count failed, retrying..."
              sleep $((retry_count * 10))
            fi
          done
          
          echo "Job failed after $max_retries attempts"
          exit 1
        
        env:
        - name: MAX_RETRIES
          value: "3"
        - name: RETRY_DELAY
          value: "10"
```

### 3. 监控和告警

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: monitored-cronjob
  labels:
    app: monitored-cronjob
  annotations:
    monitoring.coreos.com/enabled: "true"
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  
  jobTemplate:
    metadata:
      labels:
        app: monitored-cronjob
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
    spec:
      backoffLimit: 2
      activeDeadlineSeconds: 3600
      
      template:
        spec:
          restartPolicy: Never
          
          containers:
          - name: worker
            image: monitored-worker:v1.0
            
            ports:
            - containerPort: 8080
              name: metrics
            
            # 健康检查
            livenessProbe:
              httpGet:
                path: /health
                port: 8080
              initialDelaySeconds: 30
              periodSeconds: 10
            
            # 就绪检查
            readinessProbe:
              httpGet:
                path: /ready
                port: 8080
              initialDelaySeconds: 5
              periodSeconds: 5
            
            env:
            - name: METRICS_PORT
              value: "8080"
            - name: JOB_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.labels['job-name']
            
            command:
            - /bin/bash
            - -c
            - |
              # 启动指标服务器
              /app/metrics-server &
              
              # 记录开始时间
              start_time=$(date +%s)
              
              echo "Job started at $(date)"
              
              # 执行实际任务
              if /app/main-task; then
                # 记录成功指标
                echo "job_success{job_name=\"$JOB_NAME\"} 1" | curl -X POST --data-binary @- http://pushgateway:9091/metrics/job/cronjob
                echo "Job completed successfully"
                exit 0
              else
                # 记录失败指标
                echo "job_success{job_name=\"$JOB_NAME\"} 0" | curl -X POST --data-binary @- http://pushgateway:9091/metrics/job/cronjob
                echo "Job failed"
                exit 1
              fi
            
            resources:
              requests:
                cpu: 200m
                memory: 256Mi
              limits:
                cpu: 1000m
                memory: 1Gi
```

## 总结

Job 和 CronJob 是 Kubernetes 中处理批处理任务的重要工具。Job 适用于一次性任务，确保任务成功完成指定次数；CronJob 则用于定时执行任务，提供了灵活的调度机制。

**关键要点**：
- Job 提供了完成性保证和失败重试机制
- CronJob 基于 cron 表达式提供时间调度
- 合理配置并发策略和资源限制
- 实施适当的监控和错误处理
- 根据任务特性选择合适的重启策略和超时设置