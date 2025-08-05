# Apache DolphinScheduler 海豚调度器详解

## 概述

Apache DolphinScheduler 是一个分布式易扩展的可视化DAG工作流任务调度开源系统。致力于解决数据处理流程中错综复杂的依赖关系，使调度系统在数据处理流程中开箱即用。

### 核心特性

- **可视化DAG**：用户友好的可视化界面，轻松定义工作流
- **丰富的任务类型**：支持Shell、SQL、Python、Spark、Flink等多种任务类型
- **高可用性**：去中心化的多Master和多Worker服务架构
- **高性能**：支持多租户，同时支持线性扩展，易于扩展
- **云原生**：支持多云/数据中心工作流处理，支持Kubernetes部署
- **易于使用**：可视化流程定义，一键部署，支持多种操作系统

## 系统架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DolphinScheduler 架构                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Web UI                                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │  项目管理   │  │  工作流管理 │  │  任务管理   │  │  监控告警   │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        API Server                                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │  用户管理   │  │  项目管理   │  │  工作流API │  │  任务API   │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Master Server                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │  调度管理   │  │  工作流解析 │  │  任务分发   │  │  故障转移   │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Worker Server                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │  任务执行   │  │  日志管理   │  │  资源管理   │  │  心跳上报   │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Alert Server                                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │  告警规则   │  │  消息发送   │  │  告警历史   │  │  告警插件   │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Registry (Zookeeper)                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │  服务注册   │  │  配置管理   │  │  分布式锁   │  │  选主机制   │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Database (MySQL/PostgreSQL)                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │  元数据存储 │  │  用户信息   │  │  工作流定义 │  │  执行历史   │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 核心组件

#### 1. Master Server

**职责：**
- 工作流调度和管理
- 任务状态监控
- Worker节点管理
- 故障转移处理

**核心功能：**
```java
// Master Server 核心调度逻辑
public class MasterSchedulerService {
    
    // 工作流调度
    public void scheduleWorkflow(ProcessDefinition processDefinition) {
        // 1. 解析工作流DAG
        DAG dag = parseWorkflowDAG(processDefinition);
        
        // 2. 生成执行计划
        ExecutionPlan plan = generateExecutionPlan(dag);
        
        // 3. 提交任务到队列
        submitTasksToQueue(plan.getTasks());
        
        // 4. 监控执行状态
        monitorExecution(plan.getProcessInstanceId());
    }
    
    // 任务分发
    public void dispatchTask(TaskInstance taskInstance) {
        // 1. 选择合适的Worker
        WorkerGroup workerGroup = selectWorkerGroup(taskInstance);
        
        // 2. 发送任务到Worker
        sendTaskToWorker(workerGroup, taskInstance);
        
        // 3. 记录分发日志
        logTaskDispatch(taskInstance, workerGroup);
    }
    
    // 故障转移
    public void handleFailover(String failedMasterHost) {
        // 1. 获取失败Master的任务
        List<ProcessInstance> orphanProcesses = 
            getOrphanProcessInstances(failedMasterHost);
        
        // 2. 重新分配任务
         for (ProcessInstance process : orphanProcesses) {
             reassignProcess(process);
         }
     }
}
```

## 部署方案

### 1. 单机部署

```bash
#!/bin/bash
# DolphinScheduler 单机部署脚本

# 1. 环境准备
echo "准备部署环境..."

# 创建用户
sudo useradd -m -s /bin/bash dolphinscheduler
sudo usermod -aG sudo dolphinscheduler

# 安装依赖
sudo apt-get update
sudo apt-get install -y openjdk-8-jdk mysql-server

# 2. 下载和解压
echo "下载DolphinScheduler..."
cd /opt
sudo wget https://archive.apache.org/dist/dolphinscheduler/3.1.0/apache-dolphinscheduler-3.1.0-bin.tar.gz
sudo tar -zxf apache-dolphinscheduler-3.1.0-bin.tar.gz
sudo mv apache-dolphinscheduler-3.1.0-bin dolphinscheduler
sudo chown -R dolphinscheduler:dolphinscheduler /opt/dolphinscheduler

# 3. 数据库初始化
echo "初始化数据库..."
mysql -uroot -p << EOF
CREATE DATABASE dolphinscheduler DEFAULT CHARACTER SET utf8 DEFAULT COLLATE utf8_general_ci;
GRANT ALL PRIVILEGES ON dolphinscheduler.* TO 'dolphinscheduler'@'%' IDENTIFIED BY 'dolphinscheduler123';
GRANT ALL PRIVILEGES ON dolphinscheduler.* TO 'dolphinscheduler'@'localhost' IDENTIFIED BY 'dolphinscheduler123';
FLUSH PRIVILEGES;
EOF

# 4. 配置文件修改
echo "配置DolphinScheduler..."
cd /opt/dolphinscheduler

# 配置数据库连接
cat > conf/application.yaml << EOF
spring:
  profiles:
    active: mysql
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://127.0.0.1:3306/dolphinscheduler?useUnicode=true&characterEncoding=UTF-8&useSSL=false&serverTimezone=Asia/Shanghai
    username: dolphinscheduler
    password: dolphinscheduler123
  quartz:
    properties:
      org.quartz.threadPool.threadCount: 25
      org.quartz.threadPool.threadPriority: 5
      org.quartz.threadPool.threadsInheritContextClassLoaderOfInitializingThread: true
      org.quartz.jobStore.class: org.springframework.scheduling.quartz.LocalDataSourceJobStore
      org.quartz.jobStore.tablePrefix: QRTZ_
      org.quartz.jobStore.isClustered: true
      org.quartz.jobStore.clusterCheckinInterval: 5000
      org.quartz.jobStore.useProperties: false
      org.quartz.scheduler.instanceId: AUTO
      org.quartz.scheduler.instanceName: DolphinScheduler
      org.quartz.scheduler.makeSchedulerThreadDaemon: true
      org.quartz.jobStore.acquireTriggersWithinLock: true
      org.quartz.scheduler.batchTriggerAcquisitionMaxCount: 1

registry:
  type: zookeeper
  zookeeper:
    namespace: dolphinscheduler
    connect-string: localhost:2181
    retry-policy:
      base-sleep-time: 60ms
      max-sleep: 300ms
      max-retries: 5
    session-timeout: 30s
    connection-timeout: 9s
    block-until-connected: 600ms
    digest: ~

master:
  listen-port: 5678
  fetch-command-num: 10
  pre-exec-threads: 10
  exec-threads: 100
  dispatch-task-number: 3
  host-selector: lower_weight
  heartbeat-interval: 10s
  task-commit-retry-times: 5
  task-commit-interval: 1s
  state-wheel-interval: 5s
  max-cpu-load-avg: -1
  reserved-memory: 0.3

worker:
  listen-port: 1234
  exec-threads: 100
  heartbeat-interval: 10s
  host-weight: 100
  tenant-config:
    auto-create-tenant-enabled: true
  task-execute-threads-full-policy: REJECT
  max-cpu-load-avg: -1
  reserved-memory: 0.3

api:
  audit-enable: false
  traffic-control:
    global-switch: false
    max-global-qps-rate: 300
    tenant-switch: false
    default-tenant-qps-rate: 10
    customize-tenant-qps-rate:
      tenant1: 11
      tenant2: 20
EOF

# 5. 初始化数据库表结构
echo "初始化数据库表结构..."
sudo -u dolphinscheduler bash tools/bin/upgrade-schema.sh

# 6. 启动服务
echo "启动DolphinScheduler服务..."
sudo -u dolphinscheduler bash bin/dolphinscheduler-daemon.sh start standalone-server

echo "DolphinScheduler单机部署完成！"
echo "访问地址: http://localhost:12345/dolphinscheduler/ui"
echo "默认用户名: admin"
echo "默认密码: dolphinscheduler123"
```

### 2. 集群部署

```bash
#!/bin/bash
# DolphinScheduler 集群部署脚本

# 集群节点配置
MASTER_HOSTS=("192.168.1.10" "192.168.1.11")
WORKER_HOSTS=("192.168.1.12" "192.168.1.13" "192.168.1.14")
API_HOSTS=("192.168.1.15")
ALERT_HOST="192.168.1.16"
DB_HOST="192.168.1.20"
ZK_HOSTS="192.168.1.21:2181,192.168.1.22:2181,192.168.1.23:2181"

# 1. 环境准备（在所有节点执行）
prepare_environment() {
    echo "准备部署环境..."
    
    # 创建用户
    sudo useradd -m -s /bin/bash dolphinscheduler
    
    # 安装JDK
    sudo apt-get update
    sudo apt-get install -y openjdk-8-jdk
    
    # 配置环境变量
    echo 'export JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64' >> ~/.bashrc
    echo 'export PATH=$PATH:$JAVA_HOME/bin' >> ~/.bashrc
    source ~/.bashrc
    
    # 下载和解压DolphinScheduler
    cd /opt
    sudo wget https://archive.apache.org/dist/dolphinscheduler/3.1.0/apache-dolphinscheduler-3.1.0-bin.tar.gz
    sudo tar -zxf apache-dolphinscheduler-3.1.0-bin.tar.gz
    sudo mv apache-dolphinscheduler-3.1.0-bin dolphinscheduler
    sudo chown -R dolphinscheduler:dolphinscheduler /opt/dolphinscheduler
}

# 2. 配置集群
configure_cluster() {
    echo "配置集群参数..."
    
    cd /opt/dolphinscheduler
    
    # 配置数据库连接
    cat > conf/application.yaml << EOF
spring:
  profiles:
    active: mysql
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://${DB_HOST}:3306/dolphinscheduler?useUnicode=true&characterEncoding=UTF-8&useSSL=false&serverTimezone=Asia/Shanghai
    username: dolphinscheduler
    password: dolphinscheduler123
    hikari:
      connection-test-query: select 1
      minimum-idle: 5
      auto-commit: true
      validation-timeout: 3000
      pool-name: DolphinScheduler
      maximum-pool-size: 50
      connection-timeout: 30000
      idle-timeout: 600000
      leak-detection-threshold: 0
      initialization-fail-timeout: 1

registry:
  type: zookeeper
  zookeeper:
    namespace: dolphinscheduler
    connect-string: ${ZK_HOSTS}
    retry-policy:
      base-sleep-time: 60ms
      max-sleep: 300ms
      max-retries: 5
    session-timeout: 30s
    connection-timeout: 9s
    block-until-connected: 600ms
    digest: ~

master:
  listen-port: 5678
  fetch-command-num: 10
  pre-exec-threads: 10
  exec-threads: 100
  dispatch-task-number: 3
  host-selector: lower_weight
  heartbeat-interval: 10s
  task-commit-retry-times: 5
  task-commit-interval: 1s
  state-wheel-interval: 5s
  max-cpu-load-avg: -1
  reserved-memory: 0.3
  failover-interval: 10m
  kill-yarn-job-when-handle-failover: true

worker:
  listen-port: 1234
  exec-threads: 100
  heartbeat-interval: 10s
  host-weight: 100
  tenant-config:
    auto-create-tenant-enabled: true
  task-execute-threads-full-policy: REJECT
  max-cpu-load-avg: -1
  reserved-memory: 0.3

api:
  audit-enable: false
  traffic-control:
    global-switch: false
    max-global-qps-rate: 300
    tenant-switch: false
    default-tenant-qps-rate: 10
EOF
}

# 3. 部署Master节点
deploy_master() {
    for host in "${MASTER_HOSTS[@]}"; do
        echo "部署Master节点: $host"
        ssh dolphinscheduler@$host << 'EOF'
            cd /opt/dolphinscheduler
            bash bin/dolphinscheduler-daemon.sh start master-server
EOF
    done
}

# 4. 部署Worker节点
deploy_worker() {
    for host in "${WORKER_HOSTS[@]}"; do
        echo "部署Worker节点: $host"
        ssh dolphinscheduler@$host << 'EOF'
            cd /opt/dolphinscheduler
            bash bin/dolphinscheduler-daemon.sh start worker-server
EOF
    done
}

# 5. 部署API节点
deploy_api() {
    for host in "${API_HOSTS[@]}"; do
        echo "部署API节点: $host"
        ssh dolphinscheduler@$host << 'EOF'
            cd /opt/dolphinscheduler
            bash bin/dolphinscheduler-daemon.sh start api-server
EOF
    done
}

# 6. 部署Alert节点
deploy_alert() {
    echo "部署Alert节点: $ALERT_HOST"
    ssh dolphinscheduler@$ALERT_HOST << 'EOF'
        cd /opt/dolphinscheduler
        bash bin/dolphinscheduler-daemon.sh start alert-server
EOF
}

# 主函数
main() {
    echo "开始DolphinScheduler集群部署..."
    
    # 在所有节点准备环境
    for host in "${MASTER_HOSTS[@]}" "${WORKER_HOSTS[@]}" "${API_HOSTS[@]}" "$ALERT_HOST"; do
        echo "在节点 $host 准备环境..."
        ssh root@$host "$(declare -f prepare_environment); prepare_environment"
    done
    
    # 配置集群
    configure_cluster
    
    # 初始化数据库（只需在一个节点执行）
    echo "初始化数据库..."
    bash tools/bin/upgrade-schema.sh
    
    # 部署各个组件
    deploy_master
    deploy_worker
    deploy_api
    deploy_alert
    
    echo "DolphinScheduler集群部署完成！"
    echo "访问地址: http://${API_HOSTS[0]}:12345/dolphinscheduler/ui"
}

# 执行部署
main
```

### 3. Kubernetes部署

```yaml
# dolphinscheduler-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dolphinscheduler

---
# dolphinscheduler-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dolphinscheduler-config
  namespace: dolphinscheduler
data:
  application.yaml: |
    spring:
      profiles:
        active: mysql
      datasource:
        driver-class-name: com.mysql.cj.jdbc.Driver
        url: jdbc:mysql://mysql-service:3306/dolphinscheduler?useUnicode=true&characterEncoding=UTF-8&useSSL=false&serverTimezone=Asia/Shanghai
        username: dolphinscheduler
        password: dolphinscheduler123
    
    registry:
      type: zookeeper
      zookeeper:
        namespace: dolphinscheduler
        connect-string: zookeeper-service:2181
        retry-policy:
          base-sleep-time: 60ms
          max-sleep: 300ms
          max-retries: 5
        session-timeout: 30s
        connection-timeout: 9s
        block-until-connected: 600ms
    
    master:
      listen-port: 5678
      fetch-command-num: 10
      pre-exec-threads: 10
      exec-threads: 100
      dispatch-task-number: 3
      host-selector: lower_weight
      heartbeat-interval: 10s
      task-commit-retry-times: 5
      task-commit-interval: 1s
      state-wheel-interval: 5s
      max-cpu-load-avg: -1
      reserved-memory: 0.3
    
    worker:
      listen-port: 1234
      exec-threads: 100
      heartbeat-interval: 10s
      host-weight: 100
      tenant-config:
        auto-create-tenant-enabled: true
      task-execute-threads-full-policy: REJECT
      max-cpu-load-avg: -1
      reserved-memory: 0.3
    
    api:
      audit-enable: false
      traffic-control:
        global-switch: false
        max-global-qps-rate: 300
        tenant-switch: false
        default-tenant-qps-rate: 10

---
# dolphinscheduler-master.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dolphinscheduler-master
  namespace: dolphinscheduler
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dolphinscheduler-master
  template:
    metadata:
      labels:
        app: dolphinscheduler-master
    spec:
      containers:
      - name: master
        image: apache/dolphinscheduler-master:3.1.0
        ports:
        - containerPort: 5678
        env:
        - name: TZ
          value: Asia/Shanghai
        - name: SPRING_PROFILES_ACTIVE
          value: mysql
        volumeMounts:
        - name: config
          mountPath: /opt/dolphinscheduler/conf/application.yaml
          subPath: application.yaml
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          tcpSocket:
            port: 5678
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          tcpSocket:
            port: 5678
          initialDelaySeconds: 10
          periodSeconds: 10
      volumes:
      - name: config
        configMap:
          name: dolphinscheduler-config

---
# dolphinscheduler-worker.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dolphinscheduler-worker
  namespace: dolphinscheduler
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dolphinscheduler-worker
  template:
    metadata:
      labels:
        app: dolphinscheduler-worker
    spec:
      containers:
      - name: worker
        image: apache/dolphinscheduler-worker:3.1.0
        ports:
        - containerPort: 1234
        env:
        - name: TZ
          value: Asia/Shanghai
        - name: SPRING_PROFILES_ACTIVE
          value: mysql
        volumeMounts:
        - name: config
          mountPath: /opt/dolphinscheduler/conf/application.yaml
          subPath: application.yaml
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          tcpSocket:
            port: 1234
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          tcpSocket:
            port: 1234
          initialDelaySeconds: 10
          periodSeconds: 10
      volumes:
      - name: config
        configMap:
          name: dolphinscheduler-config

---
# dolphinscheduler-api.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dolphinscheduler-api
  namespace: dolphinscheduler
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dolphinscheduler-api
  template:
    metadata:
      labels:
        app: dolphinscheduler-api
    spec:
      containers:
      - name: api
        image: apache/dolphinscheduler-api:3.1.0
        ports:
        - containerPort: 12345
        env:
        - name: TZ
          value: Asia/Shanghai
        - name: SPRING_PROFILES_ACTIVE
          value: mysql
        volumeMounts:
        - name: config
          mountPath: /opt/dolphinscheduler/conf/application.yaml
          subPath: application.yaml
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /dolphinscheduler/actuator/health
            port: 12345
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /dolphinscheduler/actuator/health
            port: 12345
          initialDelaySeconds: 10
          periodSeconds: 10
      volumes:
      - name: config
        configMap:
          name: dolphinscheduler-config

---
# dolphinscheduler-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: dolphinscheduler-api-service
  namespace: dolphinscheduler
spec:
  selector:
    app: dolphinscheduler-api
  ports:
  - port: 12345
    targetPort: 12345
  type: LoadBalancer
```

## 性能优化

### 1. 系统参数调优

```yaml
# 性能优化配置
master:
  listen-port: 5678
  fetch-command-num: 20  # 增加命令获取数量
  pre-exec-threads: 20   # 增加预执行线程数
  exec-threads: 200      # 增加执行线程数
  dispatch-task-number: 5 # 增加任务分发数量
  host-selector: lower_weight
  heartbeat-interval: 10s
  task-commit-retry-times: 5
  task-commit-interval: 1s
  state-wheel-interval: 5s
  max-cpu-load-avg: -1
  reserved-memory: 0.3
  server-load-protection:
    enable: true
    max-cpu-usage-percentage-thresholds: 0.8
    max-jvm-memory-usage-percentage-thresholds: 0.8
    max-system-memory-usage-percentage-thresholds: 0.8
    max-disk-usage-percentage-thresholds: 0.8

worker:
  listen-port: 1234
  exec-threads: 200      # 增加执行线程数
  heartbeat-interval: 10s
  host-weight: 100
  tenant-config:
    auto-create-tenant-enabled: true
  task-execute-threads-full-policy: REJECT
  max-cpu-load-avg: -1
  reserved-memory: 0.3
  server-load-protection:
    enable: true
    max-cpu-usage-percentage-thresholds: 0.8
    max-jvm-memory-usage-percentage-thresholds: 0.8
    max-system-memory-usage-percentage-thresholds: 0.8
    max-disk-usage-percentage-thresholds: 0.8
```

### 2. JVM参数优化

```bash
# Master节点JVM参数
export MASTER_SERVER_OPTS="
-server
-Xms8g
-Xmx8g
-Xmn2g
-XX:+UseG1GC
-XX:G1HeartbeatPeriod=2
-XX:G1RSetUpdatingPauseTimePercent=5
-XX:MaxGCPauseMillis=100
-XX:+UseStringDeduplication
-XX:+PrintGC
-XX:+PrintGCDetails
-XX:+PrintGCTimeStamps
-XX:+UseGCLogFileRotation
-XX:NumberOfGCLogFiles=10
-XX:GCLogFileSize=100M
-Xloggc:logs/dolphinscheduler-master-gc.log
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=logs/
-Djava.security.krb5.conf=/opt/krb5.conf
"

# Worker节点JVM参数
export WORKER_SERVER_OPTS="
-server
-Xms16g
-Xmx16g
-Xmn4g
-XX:+UseG1GC
-XX:G1HeartbeatPeriod=2
-XX:G1RSetUpdatingPauseTimePercent=5
-XX:MaxGCPauseMillis=100
-XX:+UseStringDeduplication
-XX:+PrintGC
-XX:+PrintGCDetails
-XX:+PrintGCTimeStamps
-XX:+UseGCLogFileRotation
-XX:NumberOfGCLogFiles=10
-XX:GCLogFileSize=100M
-Xloggc:logs/dolphinscheduler-worker-gc.log
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=logs/
"

# API节点JVM参数
export API_SERVER_OPTS="
-server
-Xms4g
-Xmx4g
-Xmn1g
-XX:+UseG1GC
-XX:G1HeartbeatPeriod=2
-XX:G1RSetUpdatingPauseTimePercent=5
-XX:MaxGCPauseMillis=100
-XX:+UseStringDeduplication
-XX:+PrintGC
-XX:+PrintGCDetails
-XX:+PrintGCTimeStamps
-XX:+UseGCLogFileRotation
-XX:NumberOfGCLogFiles=10
-XX:GCLogFileSize=100M
-Xloggc:logs/dolphinscheduler-api-gc.log
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=logs/
"
```

### 3. 数据库优化

```sql
-- MySQL数据库优化配置
-- my.cnf配置
[mysqld]
# 基础配置
port = 3306
socket = /var/lib/mysql/mysql.sock
basedir = /usr
datadir = /var/lib/mysql
tmpdir = /tmp
lc-messages-dir = /usr/share/mysql

# 字符集配置
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
init_connect = 'SET NAMES utf8mb4'

# 内存配置
innodb_buffer_pool_size = 8G
innodb_log_file_size = 1G
innodb_log_buffer_size = 64M
key_buffer_size = 256M
tmp_table_size = 256M
max_heap_table_size = 256M
query_cache_size = 0
query_cache_type = 0

# 连接配置
max_connections = 1000
max_connect_errors = 100000
wait_timeout = 28800
interactive_timeout = 28800

# InnoDB配置
innodb_file_per_table = 1
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT
innodb_io_capacity = 2000
innodb_io_capacity_max = 4000
innodb_read_io_threads = 8
innodb_write_io_threads = 8
innodb_thread_concurrency = 0
innodb_lock_wait_timeout = 120

# 日志配置
log-error = /var/log/mysql/error.log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
log_queries_not_using_indexes = 1

-- 索引优化
-- 为常用查询字段添加索引
CREATE INDEX idx_process_instance_state ON t_ds_process_instance(state);
CREATE INDEX idx_process_instance_start_time ON t_ds_process_instance(start_time);
CREATE INDEX idx_task_instance_state ON t_ds_task_instance(state);
CREATE INDEX idx_task_instance_start_time ON t_ds_task_instance(start_time);
CREATE INDEX idx_task_instance_process_id ON t_ds_task_instance(process_instance_id);

-- 分区表优化（按月分区）
ALTER TABLE t_ds_process_instance 
PARTITION BY RANGE (YEAR(start_time) * 100 + MONTH(start_time)) (
    PARTITION p202301 VALUES LESS THAN (202302),
    PARTITION p202302 VALUES LESS THAN (202303),
    PARTITION p202303 VALUES LESS THAN (202304),
    PARTITION p202304 VALUES LESS THAN (202305),
    PARTITION p202305 VALUES LESS THAN (202306),
    PARTITION p202306 VALUES LESS THAN (202307),
    PARTITION p202307 VALUES LESS THAN (202308),
    PARTITION p202308 VALUES LESS THAN (202309),
    PARTITION p202309 VALUES LESS THAN (202310),
    PARTITION p202310 VALUES LESS THAN (202311),
    PARTITION p202311 VALUES LESS THAN (202312),
    PARTITION p202312 VALUES LESS THAN (202401),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

## 最佳实践

### 1. 工作流设计原则

```java
// 工作流设计最佳实践
public class WorkflowDesignBestPractices {
    
    /**
     * 1. 任务粒度控制
     * - 单个任务执行时间控制在30分钟以内
     * - 避免过于复杂的单体任务
     * - 合理拆分长时间运行的任务
     */
    public void taskGranularityControl() {
        // 错误示例：单个任务执行时间过长
        // TaskDefinition badTask = TaskDefinition.builder()
        //     .name("大数据全量处理")
        //     .taskType("SPARK")
        //     .timeout(7200) // 2小时超时
        //     .build();
        
        // 正确示例：拆分为多个小任务
        TaskDefinition extractTask = TaskDefinition.builder()
            .name("数据抽取")
            .taskType("SQL")
            .timeout(1800) // 30分钟超时
            .build();
            
        TaskDefinition transformTask = TaskDefinition.builder()
            .name("数据转换")
            .taskType("SPARK")
            .timeout(1800) // 30分钟超时
            .preTasks(Arrays.asList(extractTask.getCode()))
            .build();
            
        TaskDefinition loadTask = TaskDefinition.builder()
            .name("数据加载")
            .taskType("SQL")
            .timeout(1800) // 30分钟超时
            .preTasks(Arrays.asList(transformTask.getCode()))
            .build();
    }
    
    /**
     * 2. 依赖关系设计
     * - 避免循环依赖
     * - 减少不必要的依赖
     * - 合理使用条件依赖
     */
    public void dependencyDesign() {
        // 使用条件依赖
        TaskRelation conditionalRelation = TaskRelation.builder()
            .preTaskCode(111111111L)
            .postTaskCode(222222222L)
            .conditionType(ConditionType.SUCCESS) // 只有前置任务成功才执行
            .build();
            
        // 使用分支条件
        TaskDefinition conditionTask = TaskDefinition.builder()
            .name("条件判断")
            .taskType("CONDITIONS")
            .taskParams(ConditionsTaskParameters.builder()
                .dependTaskList(Arrays.asList(
                    DependentItem.builder()
                        .projectCode(123456L)
                        .definitionCode(111111111L)
                        .depTaskCode(222222222L)
                        .status(ExecutionStatus.SUCCESS)
                        .build()
                ))
                .relation("AND")
                .build())
            .build();
    }
    
    /**
     * 3. 参数传递
     * - 使用全局参数传递公共配置
     * - 使用局部参数传递任务特定配置
     * - 合理使用系统内置参数
     */
    public void parameterPassing() {
        // 全局参数定义
        List<Property> globalParams = Arrays.asList(
            Property.builder()
                .prop("bizdate")
                .value("${system.biz.date}")
                .type(DataType.VARCHAR)
                .build(),
            Property.builder()
                .prop("env")
                .value("prod")
                .type(DataType.VARCHAR)
                .build()
        );
        
        // 任务局部参数
        List<Property> localParams = Arrays.asList(
            Property.builder()
                .prop("table_name")
                .value("user_behavior_${bizdate}")
                .type(DataType.VARCHAR)
                .build()
        );
    }
    
    /**
     * 4. 错误处理
     * - 设置合理的重试次数和间隔
     * - 配置失败策略
     * - 设置超时时间
     */
    public void errorHandling() {
        TaskDefinition robustTask = TaskDefinition.builder()
            .name("健壮任务")
            .taskType("SHELL")
            .failRetryTimes(3)        // 失败重试3次
            .failRetryInterval(60)    // 重试间隔60秒
            .timeoutFlag(TimeoutFlag.OPEN) // 开启超时
            .timeout(1800)            // 超时时间30分钟
            .timeoutNotifyStrategy(TimeoutStrategy.WARN) // 超时告警
            .build();
    }
}
```

### 2. 运维监控

```bash
#!/bin/bash
# DolphinScheduler 运维监控脚本

# 1. 服务健康检查
check_service_health() {
    echo "检查DolphinScheduler服务状态..."
    
    # 检查Master服务
    master_status=$(sh /opt/dolphinscheduler/bin/dolphinscheduler-daemon.sh status master-server)
    if [[ $master_status == *"running"* ]]; then
        echo "✓ Master服务运行正常"
    else
        echo "✗ Master服务异常: $master_status"
        # 发送告警
        send_alert "Master服务异常" "$master_status"
    fi
    
    # 检查Worker服务
    worker_status=$(sh /opt/dolphinscheduler/bin/dolphinscheduler-daemon.sh status worker-server)
    if [[ $worker_status == *"running"* ]]; then
        echo "✓ Worker服务运行正常"
    else
        echo "✗ Worker服务异常: $worker_status"
        send_alert "Worker服务异常" "$worker_status"
    fi
    
    # 检查API服务
    api_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:12345/dolphinscheduler/actuator/health)
    if [[ $api_response == "200" ]]; then
        echo "✓ API服务运行正常"
    else
        echo "✗ API服务异常，HTTP状态码: $api_response"
        send_alert "API服务异常" "HTTP状态码: $api_response"
    fi
}

# 2. 资源使用监控
monitor_resources() {
    echo "监控系统资源使用情况..."
    
    # CPU使用率
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        echo "⚠ CPU使用率过高: ${cpu_usage}%"
        send_alert "CPU使用率告警" "当前CPU使用率: ${cpu_usage}%"
    fi
    
    # 内存使用率
    memory_usage=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')
    if (( $(echo "$memory_usage > 85" | bc -l) )); then
        echo "⚠ 内存使用率过高: ${memory_usage}%"
        send_alert "内存使用率告警" "当前内存使用率: ${memory_usage}%"
    fi
    
    # 磁盘使用率
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ $disk_usage -gt 85 ]]; then
        echo "⚠ 磁盘使用率过高: ${disk_usage}%"
        send_alert "磁盘使用率告警" "当前磁盘使用率: ${disk_usage}%"
    fi
}

# 3. 数据库连接检查
check_database() {
    echo "检查数据库连接..."
    
    mysql_result=$(mysql -h localhost -u dolphinscheduler -p'password' -e "SELECT 1" 2>&1)
    if [[ $? -eq 0 ]]; then
        echo "✓ 数据库连接正常"
    else
        echo "✗ 数据库连接异常: $mysql_result"
        send_alert "数据库连接异常" "$mysql_result"
    fi
}

# 4. 任务执行监控
monitor_tasks() {
    echo "监控任务执行情况..."
    
    # 查询失败任务数量
    failed_tasks=$(mysql -h localhost -u dolphinscheduler -p'password' -D dolphinscheduler -e "
        SELECT COUNT(*) FROM t_ds_task_instance 
        WHERE state = 6 AND start_time >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    " -s -N)
    
    if [[ $failed_tasks -gt 10 ]]; then
        echo "⚠ 近1小时失败任务过多: $failed_tasks 个"
        send_alert "任务失败告警" "近1小时失败任务数量: $failed_tasks"
    fi
    
    # 查询长时间运行的任务
    long_running_tasks=$(mysql -h localhost -u dolphinscheduler -p'password' -D dolphinscheduler -e "
        SELECT COUNT(*) FROM t_ds_task_instance 
        WHERE state = 1 AND start_time <= DATE_SUB(NOW(), INTERVAL 2 HOUR)
    " -s -N)
    
    if [[ $long_running_tasks -gt 0 ]]; then
        echo "⚠ 发现长时间运行任务: $long_running_tasks 个"
        send_alert "长时间运行任务告警" "超过2小时的运行任务数量: $long_running_tasks"
    fi
}

# 5. 日志清理
clean_logs() {
    echo "清理历史日志..."
    
    # 清理7天前的日志
    find /opt/dolphinscheduler/logs -name "*.log" -mtime +7 -delete
    find /opt/dolphinscheduler/logs -name "*.out" -mtime +7 -delete
    
    echo "日志清理完成"
}

# 6. 告警发送函数
send_alert() {
    local title="$1"
    local content="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # 发送邮件告警
    echo "[$timestamp] $title: $content" | mail -s "DolphinScheduler告警: $title" admin@example.com
    
    # 发送钉钉告警（可选）
    curl -X POST "https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"msgtype\": \"text\",
            \"text\": {
                \"content\": \"DolphinScheduler告警\\n时间: $timestamp\\n标题: $title\\n内容: $content\"
            }
        }"
}

# 主函数
main() {
    echo "开始DolphinScheduler运维检查 - $(date)"
    echo "================================================"
    
    check_service_health
    echo ""
    
    monitor_resources
    echo ""
    
    check_database
    echo ""
    
    monitor_tasks
    echo ""
    
    clean_logs
    echo ""
    
    echo "运维检查完成 - $(date)"
}

# 执行主函数
main
```

## 总结

Apache DolphinScheduler 作为新一代分布式大数据工作流任务调度平台，具有以下显著优势：

### 核心优势

1. **可视化DAG设计**：直观的拖拽式工作流设计界面
2. **丰富的任务类型**：支持Shell、SQL、Python、Spark、Flink等多种任务
3. **高可用架构**：去中心化设计，支持多Master和多Worker
4. **强大的调度能力**：支持定时调度、依赖调度、补数等多种调度方式
5. **完善的监控告警**：实时监控任务执行状态，支持多种告警方式
6. **云原生支持**：原生支持Kubernetes部署，适应云原生环境

### 适用场景

- **数据ETL流程**：数据抽取、转换、加载的自动化处理
- **机器学习流水线**：模型训练、验证、部署的自动化流程
- **业务流程自动化**：复杂业务逻辑的自动化执行
- **数据质量监控**：数据质量检查和异常处理
- **报表生成**：定时生成各类业务报表

### 发展趋势

随着大数据和云原生技术的发展，DolphinScheduler 将继续在以下方面进行优化：

- **更好的云原生支持**：增强Kubernetes集成能力
- **AI智能调度**：基于机器学习的智能任务调度优化
- **更丰富的连接器**：支持更多数据源和计算引擎
- **增强的安全性**：更完善的权限管理和数据安全保护
- **性能优化**：持续优化调度性能和资源利用率

DolphinScheduler 为企业提供了一个功能强大、易于使用的大数据工作流调度解决方案，是构建现代数据平台的重要组件。ssignProcess(process);
        }
        
        // 3. 更新任务状态
        updateProcessStatus(orphanProcesses);
    }
}
```

#### 2. Worker Server

**职责：**
- 任务执行
- 资源管理
- 日志收集
- 心跳上报

**任务执行框架：**
```java
// Worker Server 任务执行框架
public class WorkerTaskExecutor {
    
    // 任务执行入口
    public TaskExecutionResult executeTask(TaskExecutionContext context) {
        try {
            // 1. 任务前置检查
            preCheck(context);
            
            // 2. 准备执行环境
            prepareEnvironment(context);
            
            // 3. 执行具体任务
            TaskExecutionResult result = doExecute(context);
            
            // 4. 清理资源
            cleanup(context);
            
            return result;
            
        } catch (Exception e) {
            // 异常处理
            return handleException(context, e);
        }
    }
    
    // 具体任务执行
    private TaskExecutionResult doExecute(TaskExecutionContext context) {
        TaskType taskType = context.getTaskType();
        
        switch (taskType) {
            case SHELL:
                return executeShellTask(context);
            case SQL:
                return executeSqlTask(context);
            case PYTHON:
                return executePythonTask(context);
            case SPARK:
                return executeSparkTask(context);
            case FLINK:
                return executeFlinkTask(context);
            default:
                throw new UnsupportedTaskTypeException(taskType);
        }
    }
    
    // Shell任务执行
    private TaskExecutionResult executeShellTask(TaskExecutionContext context) {
        ShellTaskParameters params = context.getTaskParams();
        
        // 构建执行命令
        String command = buildShellCommand(params);
        
        // 执行命令
        ProcessBuilder pb = new ProcessBuilder("/bin/bash", "-c", command);
        pb.directory(new File(context.getExecutePath()));
        
        Process process = pb.start();
        int exitCode = process.waitFor();
        
        // 收集执行结果
        String output = collectOutput(process);
        String error = collectError(process);
        
        return TaskExecutionResult.builder()
            .exitCode(exitCode)
            .output(output)
            .error(error)
            .build();
    }
}
```

#### 3. API Server

**职责：**
- 提供REST API接口
- 用户认证和授权
- 请求路由和处理
- 数据验证

**API接口设计：**
```java
// 工作流管理API
@RestController
@RequestMapping("/api/v1/projects/{projectCode}/process-definition")
public class ProcessDefinitionController {
    
    // 创建工作流
    @PostMapping
    public Result<ProcessDefinition> createProcessDefinition(
            @PathVariable long projectCode,
            @RequestBody CreateProcessDefinitionRequest request) {
        
        // 1. 参数验证
        validateRequest(request);
        
        // 2. 权限检查
        checkPermission(projectCode, PermissionType.CREATE_WORKFLOW);
        
        // 3. 创建工作流
        ProcessDefinition processDefinition = 
            processDefinitionService.createProcessDefinition(projectCode, request);
        
        return Result.success(processDefinition);
    }
    
    // 启动工作流
    @PostMapping("/{code}/start")
    public Result<ProcessInstance> startProcessInstance(
            @PathVariable long projectCode,
            @PathVariable long code,
            @RequestBody StartProcessInstanceRequest request) {
        
        // 1. 获取工作流定义
        ProcessDefinition processDefinition = 
            processDefinitionService.findByCode(code);
        
        // 2. 权限检查
        checkPermission(projectCode, PermissionType.EXECUTE_WORKFLOW);
        
        // 3. 启动工作流实例
        ProcessInstance processInstance = 
            processInstanceService.startProcessInstance(processDefinition, request);
        
        return Result.success(processInstance);
    }
    
    // 查询工作流列表
    @GetMapping
    public Result<PageInfo<ProcessDefinition>> queryProcessDefinitionList(
            @PathVariable long projectCode,
            @RequestParam(defaultValue = "1") int pageNo,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String searchVal) {
        
        PageInfo<ProcessDefinition> pageInfo = 
            processDefinitionService.queryProcessDefinitionList(
                projectCode, pageNo, pageSize, searchVal);
        
        return Result.success(pageInfo);
    }
}
```

## 核心概念

### 1. 项目 (Project)

项目是DolphinScheduler中的顶层概念，用于组织和管理相关的工作流、资源和用户权限。

```sql
-- 项目表结构
CREATE TABLE t_ds_project (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code BIGINT NOT NULL UNIQUE,
    description TEXT,
    user_id INT NOT NULL,
    flag TINYINT DEFAULT 1,
    create_time DATETIME NOT NULL,
    update_time DATETIME NOT NULL
);
```

### 2. 工作流定义 (Process Definition)

工作流定义描述了任务之间的依赖关系和执行逻辑。

```json
{
  "code": 123456789,
  "name": "数据处理工作流",
  "version": 1,
  "description": "每日数据ETL处理流程",
  "projectCode": 987654321,
  "releaseState": "ONLINE",
  "executionType": "PARALLEL",
  "tasks": [
    {
      "code": 111111111,
      "name": "数据抽取",
      "taskType": "SQL",
      "taskParams": {
        "type": "MYSQL",
        "datasource": 1,
        "sql": "SELECT * FROM source_table WHERE date = '${bizdate}'",
        "sqlType": "0"
      },
      "flag": "YES",
      "taskPriority": "MEDIUM",
      "workerGroup": "default",
      "failRetryTimes": 3,
      "failRetryInterval": 1,
      "timeoutFlag": "CLOSE",
      "timeoutNotifyStrategy": "WARN",
      "timeout": 0
    },
    {
      "code": 222222222,
      "name": "数据转换",
      "taskType": "SPARK",
      "taskParams": {
        "mainClass": "com.example.DataTransform",
        "mainJar": {
          "res": "data-transform.jar"
        },
        "deployMode": "cluster",
        "driverCores": 1,
        "driverMemory": "1G",
        "numExecutors": 2,
        "executorMemory": "2G",
        "executorCores": 2,
        "others": "--conf spark.sql.adaptive.enabled=true"
      },
      "preTasks": ["111111111"],
      "flag": "YES",
      "taskPriority": "MEDIUM",
      "workerGroup": "spark-cluster",
      "failRetryTimes": 2,
      "failRetryInterval": 1
    }
  ],
  "taskDefinitionRelations": [
    {
      "name": "",
      "preTaskCode": 111111111,
      "preTaskVersion": 1,
      "postTaskCode": 222222222,
      "postTaskVersion": 1,
      "conditionType": "NONE",
      "conditionParams": {}
    }
  ],
  "globalParams": [
    {
      "prop": "bizdate",
      "value": "${system.biz.date}",
      "type": "VARCHAR"
    }
  ],
  "timeout": 0
}
```

### 3. 任务定义 (Task Definition)

任务定义描述了单个任务的执行逻辑和参数配置。

#### Shell任务
```json
{
  "taskType": "SHELL",
  "taskParams": {
    "rawScript": "#!/bin/bash\necho \"开始数据备份\"\ncp /data/source/* /data/backup/\necho \"备份完成\"",
    "localParams": [
      {
        "prop": "source_path",
        "value": "/data/source",
        "type": "VARCHAR"
      }
    ],
    "resourceList": []
  }
}
```

#### SQL任务
```json
{
  "taskType": "SQL",
  "taskParams": {
    "type": "MYSQL",
    "datasource": 1,
    "sql": "INSERT INTO target_table SELECT * FROM source_table WHERE create_date = '${bizdate}'",
    "sqlType": "0",
    "preStatements": [
      "SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO'"
    ],
    "postStatements": [
      "ANALYZE TABLE target_table"
    ],
    "localParams": [],
    "udfs": "",
    "showType": "TABLE",
    "connParams": "",
    "displayRows": 10
  }
}
```

#### Python任务
```json
{
  "taskType": "PYTHON",
  "taskParams": {
    "rawScript": "import pandas as pd\nimport numpy as np\n\n# 数据处理逻辑\ndf = pd.read_csv('/data/input.csv')\ndf_processed = df.groupby('category').sum()\ndf_processed.to_csv('/data/output.csv', index=False)\nprint('数据处理完成')",
    "localParams": [
      {
        "prop": "input_file",
        "value": "/data/input.csv",
        "type": "VARCHAR"
      }
    ],
    "resourceList": []
  }
}
```

### 4. 工作流实例 (Process Instance)

工作流实例是工作流定义的一次具体执行。

```sql
-- 工作流实例表结构
CREATE TABLE t_ds_process_instance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    process_definition_code BIGINT NOT NULL,
    process_definition_version INT NOT NULL,
    state TINYINT NOT NULL,
    recovery TINYINT NOT NULL,
    start_time DATETIME,
    end_time DATETIME,
    run_times INT DEFAULT 0,
    host VARCHAR(135),
    command_type TINYINT,
    command_param TEXT,
    task_depend_type TINYINT,
    max_try_times TINYINT DEFAULT 0,
    failure_strategy TINYINT DEFAULT 0,
    warning_type TINYINT DEFAULT 0,
    warning_group_id INT,
    schedule_time DATETIME,
    command_start_time DATETIME,
    global_params TEXT,
    flag TINYINT DEFAULT 1,
    update_time DATETIME,
    is_sub_process TINYINT DEFAULT 0,
    executor_id INT NOT NULL,
    history_cmd TEXT,
    process_instance_priority TINYINT DEFAULT 2,
    worker_group VARCHAR(64),
    environment_code BIGINT DEFAULT -1,
    timeout INT DEFAULT 0,
    tenant_id INT NOT NULL DEFAULT -1,
    var_pool LONGTEXT,
    dry_run TINYINT DEFAULT 0,
    next_process_instance_id INT DEFAULT 0,
    restart_time DATETIME
);
```

### 5. 任务实例 (Task Instance)

任务实例是任务定义的一次具体执行。

```sql
-- 任务实例表结构
CREATE TABLE t_ds_task_instance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    task_type VARCHAR(50) NOT NULL,
    task_code BIGINT NOT NULL,
    task_definition_version INT NOT NULL,
    process_instance_id INT NOT NULL,
    state TINYINT NOT NULL,
    submit_time DATETIME,
    start_time DATETIME,
    end_time DATETIME,
    host VARCHAR(135),
    execute_path VARCHAR(200),
    log_path VARCHAR(200),
    alert_flag TINYINT DEFAULT 0,
    retry_times INT DEFAULT 0,
    pid INT,
    app_link VARCHAR(255),
    task_params LONGTEXT,
    flag TINYINT DEFAULT 1,
    retry_interval INT DEFAULT 1,
    max_retry_times INT DEFAULT 0,
    task_instance_priority TINYINT DEFAULT 2,
    worker_group VARCHAR(64),
    environment_code BIGINT DEFAULT -1,
    executor_id INT,
    first_submit_time DATETIME,
    delay_time INT DEFAULT 0,
    var_pool LONGTEXT,
    dry_run TINYINT DEFAULT 0
);
```

## 调度机制

### 1. 定时调度

```java
// Cron表达式调度
public class CronScheduler {
    
    // 解析Cron表达式
    public List<Date> getNextExecutionTimes(String cronExpression, int count) {
        CronExpression cron = new CronExpression(cronExpression);
        List<Date> executionTimes = new ArrayList<>();
        
        Date nextTime = new Date();
        for (int i = 0; i < count; i++) {
            nextTime = cron.getNextValidTimeAfter(nextTime);
            if (nextTime != null) {
                executionTimes.add(nextTime);
            } else {
                break;
            }
        }
        
        return executionTimes;
    }
    
    // 调度任务
    public void scheduleProcess(ProcessDefinition processDefinition) {
        String cronExpression = processDefinition.getSchedule().getCrontab();
        
        // 计算下次执行时间
        Date nextExecutionTime = getNextExecutionTime(cronExpression);
        
        // 创建调度命令
        Command command = Command.builder()
            .commandType(CommandType.START_PROCESS)
            .processDefinitionCode(processDefinition.getCode())
            .scheduleTime(nextExecutionTime)
            .build();
        
        // 插入命令队列
        commandService.createCommand(command);
    }
}
```

### 2. 依赖调度

```java
// 依赖关系处理
public class DependencyScheduler {
    
    // 检查任务依赖
    public boolean checkTaskDependency(TaskInstance taskInstance) {
        List<TaskInstance> preTasks = getPreTasks(taskInstance);
        
        for (TaskInstance preTask : preTasks) {
            if (!isTaskCompleted(preTask)) {
                return false;
            }
        }
        
        return true;
    }
    
    // 处理任务完成事件
    public void handleTaskCompleted(TaskInstance completedTask) {
        // 获取后续任务
        List<TaskInstance> postTasks = getPostTasks(completedTask);
        
        for (TaskInstance postTask : postTasks) {
            // 检查依赖是否满足
            if (checkTaskDependency(postTask)) {
                // 提交任务执行
                submitTaskForExecution(postTask);
            }
        }
    }
    
    // 构建DAG图
    public DAG buildDAG(ProcessDefinition processDefinition) {
        DAG dag = new DAG();
        
        // 添加节点
        for (TaskDefinition taskDef : processDefinition.getTaskDefinitions()) {
            dag.addNode(taskDef.getCode(), taskDef);
        }
        
        // 添加边
        for (TaskRelation relation : processDefinition.getTaskRelations()) {
            dag.addEdge(relation.getPreTaskCode(), relation.getPostTaskCode());
        }
        
        return dag;
    }
}
```

### 3. 补数调度

```java
// 补数功能实现
public class BackfillScheduler {
    
    // 创建补数任务
    public List<ProcessInstance> createBackfillInstances(
            ProcessDefinition processDefinition,
            Date startDate,
            Date endDate,
            String cronExpression) {
        
        List<ProcessInstance> instances = new ArrayList<>();
        
        // 根据Cron表达式计算执行时间点
        List<Date> executionTimes = calculateExecutionTimes(
            cronExpression, startDate, endDate);
        
        for (Date executionTime : executionTimes) {
            // 创建工作流实例
            ProcessInstance instance = ProcessInstance.builder()
                .processDefinitionCode(processDefinition.getCode())
                .scheduleTime(executionTime)
                .commandType(CommandType.COMPLEMENT_DATA)
                .state(ExecutionStatus.SUBMITTED_SUCCESS)
                .build();
            
            instances.add(instance);
        }
        
        return instances;
    }
    
    // 并行度控制
    public void executeBackfillWithConcurrency(
            List<ProcessInstance> instances, int concurrency) {
        
        ExecutorService executor = Executors.newFixedThreadPool(concurrency);
        
        for (ProcessInstance instance : instances) {
            executor.submit(() -> {
                try {
                    executeProcessInstance(instance);
                } catch (Exception e) {
                    logger.error("补数任务执行失败", e);
                }
            });
        }
        
        executor.shutdown();
    }
}
```

## 任务类型详解

### 1. Shell任务

```java
// Shell任务执行器
public class ShellTaskExecutor extends AbstractTaskExecutor {
    
    @Override
    public TaskExecutionResult execute(TaskExecutionContext context) {
        ShellTaskParameters params = context.getTaskParams();
        
        try {
            // 1. 准备执行脚本
            String script = prepareScript(params);
            
            // 2. 创建执行环境
            ProcessBuilder pb = createProcessBuilder(script, context);
            
            // 3. 启动进程
            Process process = pb.start();
            
            // 4. 监控执行
            TaskExecutionResult result = monitorExecution(process, context);
            
            return result;
            
        } catch (Exception e) {
            return TaskExecutionResult.failure(e.getMessage());
        }
    }
    
    private String prepareScript(ShellTaskParameters params) {
        String rawScript = params.getRawScript();
        
        // 替换参数变量
        for (Property param : params.getLocalParams()) {
            String placeholder = "${" + param.getProp() + "}";
            rawScript = rawScript.replace(placeholder, param.getValue());
        }
        
        return rawScript;
    }
    
    private ProcessBuilder createProcessBuilder(String script, TaskExecutionContext context) {
        // 创建临时脚本文件
        File scriptFile = createTempScriptFile(script, context);
        
        // 构建执行命令
        ProcessBuilder pb = new ProcessBuilder("/bin/bash", scriptFile.getAbsolutePath());
        pb.directory(new File(context.getExecutePath()));
        
        // 设置环境变量
        Map<String, String> env = pb.environment();
        env.putAll(context.getEnvironmentConfig());
        
        return pb;
    }
}
```

### 2. SQL任务

```java
// SQL任务执行器
public class SqlTaskExecutor extends AbstractTaskExecutor {
    
    @Override
    public TaskExecutionResult execute(TaskExecutionContext context) {
        SqlTaskParameters params = context.getTaskParams();
        
        Connection connection = null;
        try {
            // 1. 获取数据库连接
            connection = getConnection(params.getDatasource());
            
            // 2. 执行前置语句
            executePreStatements(connection, params.getPreStatements());
            
            // 3. 执行主SQL
            TaskExecutionResult result = executeMainSql(connection, params);
            
            // 4. 执行后置语句
            executePostStatements(connection, params.getPostStatements());
            
            return result;
            
        } catch (Exception e) {
            return TaskExecutionResult.failure(e.getMessage());
        } finally {
            closeConnection(connection);
        }
    }
    
    private TaskExecutionResult executeMainSql(Connection connection, SqlTaskParameters params) {
        String sql = params.getSql();
        
        // 替换参数变量
        sql = replaceParameters(sql, params.getLocalParams());
        
        try (Statement statement = connection.createStatement()) {
            if (params.getSqlType() == SqlType.SELECT) {
                // 查询语句
                ResultSet resultSet = statement.executeQuery(sql);
                String result = formatResultSet(resultSet, params.getDisplayRows());
                return TaskExecutionResult.success(result);
            } else {
                // 更新语句
                int affectedRows = statement.executeUpdate(sql);
                return TaskExecutionResult.success("影响行数: " + affectedRows);
            }
        }
    }
}
```

### 3. Spark任务

```java
// Spark任务执行器
public class SparkTaskExecutor extends AbstractTaskExecutor {
    
    @Override
    public TaskExecutionResult execute(TaskExecutionContext context) {
        SparkTaskParameters params = context.getTaskParams();
        
        try {
            // 1. 构建Spark提交命令
            List<String> command = buildSparkSubmitCommand(params, context);
            
            // 2. 执行命令
            ProcessBuilder pb = new ProcessBuilder(command);
            pb.directory(new File(context.getExecutePath()));
            
            Process process = pb.start();
            
            // 3. 监控执行
            TaskExecutionResult result = monitorSparkExecution(process, context);
            
            return result;
            
        } catch (Exception e) {
            return TaskExecutionResult.failure(e.getMessage());
        }
    }
    
    private List<String> buildSparkSubmitCommand(SparkTaskParameters params, TaskExecutionContext context) {
        List<String> command = new ArrayList<>();
        
        command.add("spark-submit");
        command.add("--class");
        command.add(params.getMainClass());
        command.add("--master");
        command.add(params.getDeployMode());
        command.add("--driver-cores");
        command.add(String.valueOf(params.getDriverCores()));
        command.add("--driver-memory");
        command.add(params.getDriverMemory());
        command.add("--num-executors");
        command.add(String.valueOf(params.getNumExecutors()));
        command.add("--executor-cores");
        command.add(String.valueOf(params.getExecutorCores()));
        command.add("--executor-memory");
        command.add(params.getExecutorMemory());
        
        // 添加其他配置
        if (StringUtils.isNotEmpty(params.getOthers())) {
            String[] otherArgs = params.getOthers().split("\\s+");
            command.addAll(Arrays.asList(otherArgs));
        }
        
        // 添加主JAR文件
        command.add(params.getMainJar().getRes());
        
        // 添加程序参数
        if (params.getMainArgs() != null) {
            command.add(params.getMainArgs());
        }
        
        return command;
    }
}
```

### 4. Python任务

```java
// Python任务执行器
public class PythonTaskExecutor extends AbstractTaskExecutor {
    
    @Override
    public TaskExecutionResult execute(TaskExecutionContext context) {
        PythonTaskParameters params = context.getTaskParams();
        
        try {
            // 1. 准备Python脚本
            File scriptFile = preparePythonScript(params, context);
            
            // 2. 构建执行命令
            List<String> command = buildPythonCommand(scriptFile, params);
            
            // 3. 执行命令
            ProcessBuilder pb = new ProcessBuilder(command);
            pb.directory(new File(context.getExecutePath()));
            
            // 设置Python环境
            Map<String, String> env = pb.environment();
            if (StringUtils.isNotEmpty(params.getPythonPath())) {
                env.put("PYTHONPATH", params.getPythonPath());
            }
            
            Process process = pb.start();
            
            // 4. 监控执行
            TaskExecutionResult result = monitorExecution(process, context);
            
            return result;
            
        } catch (Exception e) {
            return TaskExecutionResult.failure(e.getMessage());
        }
    }
    
    private File preparePythonScript(PythonTaskParameters params, TaskExecutionContext context) {
        String script = params.getRawScript();
        
        // 替换参数变量
        for (Property param : params.getLocalParams()) {
            String placeholder = "${" + param.getProp() + "}";
            script = script.replace(placeholder, param.getValue());
        }
        
        // 创建临时脚本文件
        File scriptFile = new File(context.getExecutePath(), "python_script.py");
        try (FileWriter writer = new FileWriter(scriptFile)) {
            writer.write(script);
        }
        
        return scriptFile;
    }
    
    private List<String> buildPythonCommand(File scriptFile, PythonTaskParameters params) {
        List<String> command = new ArrayList<>();
        
        // Python解释器
        String pythonCommand = StringUtils.isNotEmpty(params.getPythonCommand()) 
            ? params.getPythonCommand() : "python3";
        command.add(pythonCommand);
        
        // 脚本文件
        command.add(scriptFile.getAbsolutePath());
        
        return command;
    }
}
```

## 监控和告警

### 1. 系统监控

```java
// 系统监控服务
public class SystemMonitorService {
    
    // 监控Master节点状态
    public MasterStatus monitorMasterStatus() {
        return MasterStatus.builder()
            .cpuUsage(getCpuUsage())
            .memoryUsage(getMemoryUsage())
            .diskUsage(getDiskUsage())
            .activeProcessCount(getActiveProcessCount())
            .queueSize(getCommandQueueSize())
            .build();
    }
    
    // 监控Worker节点状态
    public List<WorkerStatus> monitorWorkerStatus() {
        List<WorkerStatus> workerStatusList = new ArrayList<>();
        
        for (WorkerGroup workerGroup : getWorkerGroups()) {
            for (String workerHost : workerGroup.getAddrList()) {
                WorkerStatus status = WorkerStatus.builder()
                    .host(workerHost)
                    .cpuUsage(getWorkerCpuUsage(workerHost))
                    .memoryUsage(getWorkerMemoryUsage(workerHost))
                    .runningTaskCount(getRunningTaskCount(workerHost))
                    .lastHeartbeatTime(getLastHeartbeatTime(workerHost))
                    .build();
                
                workerStatusList.add(status);
            }
        }
        
        return workerStatusList;
    }
    
    // 监控任务执行状态
    public TaskExecutionStatistics monitorTaskExecution() {
        Date today = new Date();
        
        return TaskExecutionStatistics.builder()
            .totalTasks(getTotalTaskCount(today))
            .successTasks(getSuccessTaskCount(today))
            .failedTasks(getFailedTaskCount(today))
            .runningTasks(getRunningTaskCount(today))
            .avgExecutionTime(getAvgExecutionTime(today))
            .build();
    }
}
```

### 2. 告警配置

```java
// 告警规则配置
public class AlertRuleConfig {
    
    // 任务失败告警
    public AlertRule createTaskFailureRule() {
        return AlertRule.builder()
            .name("任务失败告警")
            .type(AlertType.TASK_FAILURE)
            .condition("task.state == 'FAILURE'")
            .recipients(Arrays.asList("admin@example.com", "dev@example.com"))
            .alertWays(Arrays.asList(AlertWay.EMAIL, AlertWay.WECHAT))
            .enabled(true)
            .build();
    }
    
    // 工作流超时告警
    public AlertRule createProcessTimeoutRule() {
        return AlertRule.builder()
            .name("工作流超时告警")
            .type(AlertType.PROCESS_TIMEOUT)
            .condition("process.duration > process.timeout")
            .recipients(Arrays.asList("admin@example.com"))
            .alertWays(Arrays.asList(AlertWay.EMAIL))
            .enabled(true)
            .build();
    }
    
    // 系统资源告警
    public AlertRule createSystemResourceRule() {
        return AlertRule.builder()
            .name("系统资源告警")
            .type(AlertType.SYSTEM_RESOURCE)
            .condition("system.cpu_usage > 80 OR system.memory_usage > 85")
            .recipients(Arrays.asList("ops@example.com"))
            .alertWays(Arrays.asList(AlertWay.SMS, AlertWay.EMAIL))
            .enabled(true)
            .build();
    }
}
```

### 3. 告警发送

```java
// 告警发送服务
public class AlertSenderService {
    
    // 发送邮件告警
    public void sendEmailAlert(AlertMessage message) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true);
            
            helper.setTo(message.getRecipients().toArray(new String[0]));
            helper.setSubject(message.getTitle());
            helper.setText(message.getContent(), true);
            
            mailSender.send(mimeMessage);
            
            logger.info("邮件告警发送成功: {}", message.getTitle());
            
        } catch (Exception e) {
            logger.error("邮件告警发送失败", e);
        }
    }
    
    // 发送微信告警
    public void sendWechatAlert(AlertMessage message) {
        try {
            WechatMessage wechatMessage = WechatMessage.builder()
                .msgtype("text")
                .text(WechatText.builder()
                    .content(message.getContent())
                    .mentioned_list(message.getRecipients())
                    .build())
                .build();
            
            String response = wechatClient.sendMessage(wechatMessage);
            
            logger.info("微信告警发送成功: {}", response);
            
        } catch (Exception e) {
            logger.error("微信告警发送失败", e);
        }
    }
    
    // 发送短信告警
    public void sendSmsAlert(AlertMessage message) {
        try {
            for (String recipient : message.getRecipients()) {
                SmsRequest request = SmsRequest.builder()
                    .phoneNumber(recipient)
                    .content(message.getContent())
                    .build();
                
                SmsResponse response = smsClient.sendSms(request);
                
                if (response.isSuccess()) {
                    logger.info("短信告警发送成功: {}", recipient);
                } else {
                    logger.error("短信告警发送失败: {}, 错误: {}", recipient, response.getErrorMessage());
                }
            }
            
        } catch (Exception e) {
            logger.error("短信告警发送失败", e);
        }
    }
}
```

## 部署和配置

### 1. 单机部署

```bash
#!/bin/bash
# DolphinScheduler 单机部署脚本

# 1. 下载安装包
wget https://archive.apache.org/dist/dolphinscheduler/3.1.0/apache-dolphinscheduler-3.1.0-bin.tar.gz
tar -zxf apache-dolphinscheduler-3.1.0-bin.tar.gz
cd apache-dolphinscheduler-3.1.0-bin

# 2. 配置数据库
# 创建数据库
mysql -u root -p -e "CREATE DATABASE dolphinscheduler DEFAULT CHARACTER SET utf8 DEFAULT COLLATE utf8_general_ci;"

# 初始化数据库
sh script/create-dolphinscheduler.sh

# 3. 修改配置文件
cp conf/application.yaml conf/application.yaml.bak

# 配置数据库连接
cat > conf/application.yaml << EOF
spring:
  profiles:
    active: mysql
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://localhost:3306/dolphinscheduler?useUnicode=true&characterEncoding=UTF-8&useSSL=false&serverTimezone=Asia/Shanghai
    username: root
    password: your_password
  
registry:
  type: zookeeper
  zookeeper:
    namespace: dolphinscheduler
    connect-string: localhost:2181
    retry-policy:
      base-sleep-time: 60ms
      max-sleep: 300ms
      max-retries: 5
    session-timeout: 30s
    connection-timeout: 9s
    block-until-connected: 600ms
    digest: ~

master:
  listen-port: 5678
  fetch-command-num: 10
  pre-exec-threads: 10
  exec-threads: 100
  dispatch-task-number: 3
  host-selector: lower_weight
  heartbeat-interval: 10s
  task-commit-retry-times: 5
  task-commit-interval: 1s
  state-wheel-interval: 5s
  server-load-protection:
    enable: false
    max-cpu-usage-percentage-thresholds: 0.7
    max-jvm-memory-usage-percentage-thresholds: 0.7
    max-system-memory-usage-percentage-thresholds: 0.7
    max-disk-usage-percentage-thresholds: 0.7

worker:
  listen-port: 1234
  exec-threads: 100
  heartbeat-interval: 10s
  host-weight: 100
  tenant-config:
    auto-create-tenant-enabled: true
  task-execute-threads-full-policy: REJECT
  server-load-protection:
    enable: false
    max-cpu-usage-percentage-thresholds: 0.7
    max-jvm-memory-usage-percentage-thresholds: 0.7
    max-system-memory-usage-percentage-thresholds: 0.7
    max-disk-usage-percentage-thresholds: 0.7

alert:
  listen-port: 50052
  sender:
    email:
      server-host: smtp.example.com
      server-port: 25
      sender: admin@example.com
      user: admin@example.com
      passwd: your_email_password
      starttls-enable: true
      ssl-enable: false
      ssl-trust: smtp.example.com
EOF

# 4. 启动服务
sh bin/dolphinscheduler-daemon.sh start standalone-server

# 5. 检查服务状态
sh bin/dolphinscheduler-daemon.sh status standalone-server

echo "DolphinScheduler 单机部署完成"
echo "访问地址: http://localhost:12345/dolphinscheduler/ui"
echo "默认用户名: admin"
echo "默认密码: dolphinscheduler123"
```

### 2. 集群部署

```bash
#!/bin/bash
# DolphinScheduler 集群部署脚本

# 集群节点配置
MASTER_HOSTS=("master1" "master2")
WORKER_HOSTS=("worker1" "worker2" "worker3")
ALERT_HOST="alert1"
API_HOST="api1"

# 1. 在所有节点安装DolphinScheduler
for host in "${MASTER_HOSTS[@]}" "${WORKER_HOSTS[@]}" "$ALERT_HOST" "$API_HOST"; do
    echo "在节点 $host 安装DolphinScheduler"
    ssh $host << 'EOF'
        cd /opt
        wget https://archive.apache.org/dist/dolphinscheduler/3.1.0/apache-dolphinscheduler-3.1.0-bin.tar.gz
        tar -zxf apache-dolphinscheduler-3.1.0-bin.tar.gz
        ln -s apache-dolphinscheduler-3.1.0-bin dolphinscheduler
EOF
done

# 2. 配置Master节点
for host in "${MASTER_HOSTS[@]}"; do
    echo "配置Master节点: $host"
    ssh $host << 'EOF'
        cd /opt/dolphinscheduler
        
        # 配置application.yaml
        cat > conf/application.yaml << 'CONFIG'
spring:
  profiles:
    active: mysql
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://mysql-cluster:3306/dolphinscheduler?useUnicode=true&characterEncoding=UTF-8&useSSL=false&serverTimezone=Asia/Shanghai
    username: dolphinscheduler
    password: dolphinscheduler_password

registry:
  type: zookeeper
  zookeeper:
    namespace: dolphinscheduler
    connect-string: zk1:2181,zk2:2181,zk3:2181
    retry-policy:
      base-sleep-time: 60ms
      max-sleep: 300ms
      max-retries: 5
    session-timeout: 30s
    connection-timeout: 9s
    block-until-connected: 600ms

master:
  listen-port: 5678
  fetch-command-num: 10
  pre-exec-threads: 10
  exec-threads: 100
  dispatch-task-number: 3
  host-selector: lower_weight
  heartbeat-interval: 10s
  task-commit-retry-times: 5
  task-commit-interval: 1s
  state-wheel-interval: 5s
CONFIG
        
        # 启动Master服务
        sh bin/dolphinscheduler-daemon.sh start master-server
EOF
done

# 3. 配置Worker节点
for host in "${WORKER_HOSTS[@]}"; do
    echo "配置Worker节点: $host"
    ssh $host << 'EOF'
        cd /opt/dolphinscheduler
        
        # 配置application.yaml
        cat > conf/application.yaml << 'CONFIG'
spring:
  profiles:
    active: mysql
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://mysql-cluster:3306/dolphinscheduler?useUnicode=true&characterEncoding=UTF-8&useSSL=false&serverTimezone=Asia/Shanghai
    username: dolphinscheduler
    password: dolphinscheduler_password

registry:
  type: zookeeper
  zookeeper:
    namespace: dolphinscheduler
    connect-string: zk1:2181,zk2:2181,zk3:2181

worker:
  listen-port: 1234
  exec-threads: 100
  heartbeat-interval: 10s
  host-weight: 100
  groups:
    - default
  tenant-config:
    auto-create-tenant-enabled: true
CONFIG
        
        # 启动Worker服务
        sh bin/dolphinscheduler-daemon.sh start worker-server
EOF
done

# 4. 配置Alert节点
echo "配置Alert节点: $ALERT_HOST"
ssh $ALERT_HOST << 'EOF'
    cd /opt/dolphinscheduler
    
    # 配置application.yaml
    cat > conf/application.yaml << 'CONFIG'
spring:
  profiles:
    active: mysql
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://mysql-cluster:3306/dolphinscheduler?useUnicode=true&characterEncoding=UTF-8&useSSL=false&serverTimezone=Asia/Shanghai
    username: dolphinscheduler
    password: dolphinscheduler_password

registry:
  type: zookeeper
  zookeeper:
    namespace: dolphinscheduler
    connect-string: zk1:2181,zk2:2181,zk3:2181

alert:
  listen-port: 50052
  sender:
    email:
      server-host: smtp.example.com
      server-port: 25
      sender: admin@example.com
      user: admin@example.com
      passwd: email_password
CONFIG
    
    # 启动Alert服务
    sh bin/dolphinscheduler-daemon.sh start alert-server
EOF

# 5. 配置API节点
echo "配置API节点: $API_HOST"
ssh $API_HOST << 'EOF'
    cd /opt/dolphinscheduler
    
    # 配置application.yaml
    cat > conf/application.yaml << 'CONFIG'
spring:
  profiles:
    active: mysql
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://mysql-cluster:3306/dolphinscheduler?useUnicode=true&characterEncoding=UTF-8&useSSL=false&serverTimezone=Asia/Shanghai
    username: dolphinscheduler
    password: dolphinscheduler_password

registry:
  type: zookeeper
  zookeeper:
    namespace: dolphinscheduler
    connect-string: zk1:2181,zk2:2181,zk3:2181

api:
  audit-enable: false
  traffic-control:
    global-switch: false
    max-global-qps-rate: 300
    tenant-switch: false
    default-tenant-qps-rate: 10
CONFIG
    
    # 启动API服务
    sh bin/dolphinscheduler-daemon.sh start api-server
EOF

echo "DolphinScheduler 集群部署完成"
echo "访问地址: http://$API_HOST:12345/dolphinscheduler/ui"
```

### 3. Kubernetes部署

```yaml
# dolphinscheduler-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dolphinscheduler

---
# dolphinscheduler-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dolphinscheduler-config
  namespace: dolphinscheduler
data:
  application.yaml: |
    spring:
      profiles:
        active: mysql
      datasource:
        driver-class-name: com.mysql.cj.jdbc.Driver
        url: jdbc:mysql://mysql-service:3306/dolphinscheduler?useUnicode=true&characterEncoding=UTF-8&useSSL=false&serverTimezone=Asia/Shanghai
        username: dolphinscheduler
        password: dolphinscheduler_password
    
    registry:
      type: zookeeper
      zookeeper:
        namespace: dolphinscheduler
        connect-string: zookeeper-service:2181
        retry-policy:
          base-sleep-time: 60ms
          max-sleep: 300ms
          max-retries: 5
        session-timeout: 30s
        connection-timeout: 9s
        block-until-connected: 600ms

---
# dolphinscheduler-master.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dolphinscheduler-master
  namespace: dolphinscheduler
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dolphinscheduler-master
  template:
    metadata:
      labels:
        app: dolphinscheduler-master
    spec:
      containers:
      - name: master
        image: apache/dolphinscheduler-master:3.1.0
        ports:
        - containerPort: 5678
        env:
        - name: TZ
          value: Asia/Shanghai
        - name: SPRING_PROFILES_ACTIVE
          value: mysql
        volumeMounts:
        - name: config
          mountPath: /opt/dolphinscheduler/conf/application.yaml
          subPath: application.yaml
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          tcpSocket:
            port: 5678
          initialDelaySeconds: 30
          periodSeconds: 30
        rea