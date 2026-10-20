# 云原生架构（Cloud-Native Architecture）

云原生关注应用如何在动态环境中持续运行和交付：实例可以被替换，流量可以分散，配置和制品可以追溯，故障可以观察并恢复。把一个只能手工启动、状态存在本机目录的程序搬到云主机，并不会自动获得这些能力。

CNCF 的云原生定义 v1.1 强调可编程、可重复的交付以及安全、韧性、可管理和可观测的松耦合系统。容器、微服务、服务网格、声明式 API、不可变基础设施、Serverless 都是可组合的技术，**不是必须全部安装的清单**。模块化单体也可以采用云原生运行方式。

![订单服务的请求路径与平台控制](/architecture/cloud-native.svg)

## 订单服务为何需要这些能力

小林负责促销活动的订单接口。平时两台实例足够，活动前需要扩容；发布新版本时不能让正在支付的请求突然断开；某台机器故障后要补实例；订单错误率上升时，还要区分新版本、数据库和支付渠道的问题。

这些要求对应的是具体合同，而不是产品名称：新实例从哪里获取配置，何时可以接流量，旧实例何时停止，哪个指标说明扩容有效，数据库能否承受增加后的并发。Kubernetes 可以协调副本，但订单的幂等和支付事务仍由应用设计保护。

图中 Service 表示稳定访问抽象，实际转发由集群网络数据面实现；控制器调谐副本，不在每个订单请求的同步链路上。数据库可以是托管服务或独立集群，不能因为应用运行在 Kubernetes 就假定数据也自动具有高可用。

## 把运行合同补齐

| 合同 | 订单服务需要做什么 | 平台提供什么 |
| --- | --- | --- |
| 交付单元 | 固定依赖，记录提交，明确 CPU 架构和系统依赖 | 镜像仓库、制品校验、运行时 |
| 配置与身份 | 配置外置，区分普通配置与凭据，不把密钥写入镜像 | ConfigMap、Secret、外部密钥系统、工作负载身份 |
| 启动与就绪 | 初始化完成后再接请求，探针成本可控 | startup/readiness 探测与端点更新 |
| 停止 | 处理终止信号，停止接新任务，完成或交还在途任务 | 终止宽限期、流量摘除与容器停止 |
| 容量与状态 | 可水平扩展，定义连接池、队列和持久化边界 | 调度、资源治理、弹性控制、存储接口 |
| 故障证据 | 关联请求、订单、版本、错误与耗时 | 日志、指标、Trace、Events、审计 |

容器共享宿主机内核；镜像并非跨 CPU、跨内核能力都能直接运行。多架构制品要分别构建和验证，glibc/musl、GPU 驱动和设备访问也属于运行合同。更小的镜像能减少体积和攻击面，但基础镜像选择还要兼顾依赖兼容和维护周期。

十二要素应用可作为检查这些合同的起点：代码和依赖明确，配置与后端服务外置，构建/发布/运行分开，以进程扩展，快速启动和终止，日志按事件流处理，管理任务独立执行，并缩小开发与生产差异。它适合业务应用的运行设计，不能把“进程无状态”扩大成数据库也不需要管理状态。

## 探针分别决定什么

startup 保护慢启动阶段，成功之前不执行 readiness 和 liveness。readiness 决定实例是否准备好承接 Service 流量；失败通常不重启容器。liveness 用来发现重启才能恢复的故障，持续失败才触发容器重启，不能把所有外部依赖的短暂故障都当作“本进程已死”。

如果把数据库超时作为 liveness 失败条件，数据库抖动可能造成所有应用同时重启，进一步加重负载。readiness 是否检查某个依赖，也要按接口能否降级、依赖故障是否影响全部请求决定。探针通过只证明探针覆盖的条件成立，不保证支付业务成功。

下面是 `apps/v1` Deployment 的结构示例。镜像地址是占位，替换为已验证制品，生产发布固定 digest；应用必须实现三个端点并监听 8080。资源数值和时间只是起点，需要按启动时间、请求耗时和压力测试调整。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-api
  namespace: orders
spec:
  replicas: 2
  selector:
    matchLabels:
      app: order-api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: order-api
    spec:
      automountServiceAccountToken: false
      terminationGracePeriodSeconds: 60
      containers:
        - name: api
          image: registry.example.com/order-api:release-example
          ports:
            - name: http
              containerPort: 8080
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: "1"
              memory: 512Mi
          startupProbe:
            httpGet: { path: /health/startup, port: http }
            periodSeconds: 5
            failureThreshold: 24
          readinessProbe:
            httpGet: { path: /health/ready, port: http }
            periodSeconds: 5
            timeoutSeconds: 2
          livenessProbe:
            httpGet: { path: /health/live, port: http }
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 3
```

`maxUnavailable: 0` 不能保证零中断：还需要额外容量容纳新副本、可用实例跨故障域分布、负载均衡摘除及时、在途连接能够排空。60 秒宽限期也不会替应用实现优雅停机。异步消费者要停止领取任务，对未完成消息不提前确认，并通过幂等处理恢复重投。

对象与运行细节见 [Deployment](/docs/container/kubernetes/resources/deployment)、[Pod](/docs/container/kubernetes/resources/pod) 和 [调度与节点生命周期](/docs/container/kubernetes/scheduling-node-lifecycle)。

## 一份制品怎样成为线上版本

CI 负责测试、构建、扫描和记录制品；CD 负责把经过验证的版本送入目标环境。持续交付保持随时可发布，持续部署把满足条件的版本自动发布到生产，二者的授权策略不同。

![从制品到期望状态，再到运行验收和回退](/architecture/cloud-native-delivery.svg)

GitOps 中，部署仓库保存镜像 digest、配置及环境差异，控制器从受信源读取期望状态，与集群实际对象比较并调谐。CI 不必持有生产集群管理员凭据，镜像拉取也不是由 GitOps 控制器转存应用镜像。应用仓库和配置仓库可以分开，也可以在同一仓库中按职责管理。

“Synced”只说明对象与期望清单一致；“Ready”主要说明资源就绪；订单成功率、尾延迟和重复支付等仍需业务验证。Deployment 的滚动更新不自动理解这些指标。需要按错误率暂停、按权重灰度或切换蓝绿环境时，再引入对应发布控制能力，并定义样本不足、指标查询失败时怎样处理。

GitOps 管理下直接执行临时回滚命令，可能很快被期望状态覆盖。正式回退应先修正部署来源并验证生效；紧急手工操作需按既定方式暂停调谐、留痕，恢复后对齐 Git。旧镜像可重新运行，不代表数据库迁移、消息格式或外部支付副作用可逆。数据库变更应考虑扩展/收缩、兼容窗口和恢复演练。

发布及供应链细节见 [GitOps、策略与供应链](/docs/container/kubernetes/advanced/delivery-security) 和 [DevOps 交付闭环](../develop-pattern/devops)。

## 弹性不是不断增加副本

HPA 根据指标调整副本数，节点扩容组件补计算容量，调度器再放置新 Pod。这是几条控制环，不能把其中一个成功等同于容量已经就绪。新实例启动、镜像拉取和预热都需要时间；促销已知高峰可提前预热，不能只等待实时 CPU 告警。

对于订单接口，增加应用副本会增加数据库连接和下游请求。若数据库已饱和，扩更多应用反而扩大排队。除了 CPU，还要观察接口尾延迟、在途请求、队列年龄、连接池等待和下游饱和度，给伸缩设置上限和稳定窗口。

异步导出 Worker 可以按积压任务或最旧任务年龄伸缩，但每项任务的成本不一致时，仅看消息数量会失真。长任务要考虑缩容时排空、租约和重复执行。容量细节见 [可靠性、弹性与容量](/docs/container/kubernetes/reliability-capacity)。

## 服务之间如何通信

同步调用应传播请求期限，设置连接与请求超时，限定重试次数和并发；重试必须结合幂等键、退避和抖动。多层分别重试会放大请求量。支付调用超时表示结果未知，不能直接当作支付失败再次扣款，应通过支付单和渠道查询确认。

异步消息将接收与处理解耦，但引入重复、乱序、积压和故障恢复。订单状态与待发事件可通过 Outbox 同事务提交，消费者在副作用完成后按规则确认；跨存储不能仅凭 MQ 配置宣称“恰好一次”。详见 [CQRS](./cqrs-architecture) 和 [事件驱动架构](./event-driven-architecture)。

Service Mesh 把部分服务通信能力放到代理和控制平面，例如流量策略、服务身份、mTLS 和遥测。以 Istio sidecar 模式为例，`istiod` 负责服务发现、配置与证书管理，Envoy 处理数据面流量；旧版将 Pilot、Citadel、Galley、Mixer 并列为独立控制组件的图，不能作为当前部署模板。Mesh 仍不代替业务幂等、用户授权和事务设计，少量服务不必为这些能力先安装一整套网格。

## 数据、工作负载和配置的边界

| 对象 | 适合承担什么 | 不会自动提供什么 |
| --- | --- | --- |
| Deployment | 可替换业务副本与滚动更新 | 数据复制、跨区域容灾 |
| StatefulSet + PVC | 稳定身份及持久卷关联 | 数据库主从选举、数据正确性、备份恢复 |
| DaemonSet | 在符合选择条件的节点运行节点级代理 | 无条件在所有节点运行 |
| Job / CronJob | 一次性或定时任务的执行管理 | 业务副作用恰好一次 |
| Service / Gateway 或 Ingress | 稳定发现与入口路由，需对应实现支持 | 应用内部的租户权限和幂等 |
| ConfigMap / Secret | 普通配置与凭据的注入入口 | 自动热加载、自动安全轮换 |

有状态系统需要单独确定 RPO/RTO、备份和恢复路径。每个服务拥有数据访问边界，不意味着必须购买独立数据库集群；可以在明确隔离前提下共享基础设施。跨服务不要直接修改别人拥有的表。是否采用事件溯源，由历史事实和重放需求决定，不能把它当作云原生必选项。

Secret 的 Base64 是编码，不是加密。还要配置存储加密、最小 RBAC、短期身份、密钥系统和轮换。环境变量不会随 Secret 更新自动改变；卷挂载更新也不等于应用自动重读，`subPath` 挂载还存在不同更新行为。见 [Secret](/docs/container/kubernetes/resources/secret) 和 [ConfigMap](/docs/container/kubernetes/resources/configmap)。

## 用证据定位故障

指标先回答影响面，Trace 帮助定位哪段依赖耗时，日志补充该次操作的业务细节，Events 与对象状态解释调度和容器生命周期。它们通过版本、Pod、时间和请求标识关联，不能把订单号直接作为无限增长的指标标签。追踪要考虑跨进程上下文传播和采样，没有采到的请求不能靠一张 Trace 图还原。

```bash
# 前提：kubectl 指向目标集群，orders 命名空间和 order-api 已存在。
kubectl rollout status deploy/order-api -n orders --timeout=120s
kubectl get deploy,rs,pod -n orders -o wide
kubectl get endpointslice -n orders -l kubernetes.io/service-name=order-api
kubectl get events -n orders --sort-by=.metadata.creationTimestamp
kubectl logs deploy/order-api -n orders --tail=100
```

| 现象 | 优先证据 | 应用侧需要补的验证 |
| --- | --- | --- |
| Pod 一直 Pending | Events、资源请求、配额、亲和性、卷 | 资源估算是否合理，是否需要特殊硬件 |
| 新版本反复重启 | 上次容器日志、退出码、OOM、探针结果 | 启动是否超预算，liveness 是否误依赖下游 |
| Pod Ready 但入口失败 | EndpointSlice、Service 端口、路由、网络策略 | 协议、监听地址、身份和超时是否一致 |
| 扩容后订单更慢 | 连接池等待、数据库负载、下游限流 | 并发上限、背压与幂等是否有效 |
| 回退后仍异常 | 镜像 digest、配置版本、数据模式、消息积压 | 状态副作用是否兼容，是否需补偿或重建 |

`kubectl logs deploy/...` 不是全部副本的完整日志，排查时应按具体 Pod、容器和时间范围取证；已重启容器可查 `--previous`，长期追踪依赖集中日志保留。详细链路见 [可观测性与证据链](/docs/container/kubernetes/observability)。

## 安全与选型

安全覆盖代码、镜像、集群和底层基础设施。可信构建和 digest 追踪解决来源问题，漏洞扫描是某个时间点的判断，签名也不等于没有漏洞。运行时按工作负载配置身份、RBAC、网络策略和受限安全上下文，应用仍要校验用户和租户权限。mTLS 证明对端工作负载身份，不能据此推断它可读取任意订单。

系统规模小、负载稳定、现有部署可靠时，可以先采用受控镜像、自动发布、备份和观测。需要跨节点调度、大量服务治理和弹性时，再评估编排平台。单体、HPC、GPU 和严格合规场景都可能使用云原生技术，但需要分别验证硬件拓扑、网络时延、数据位置和隔离要求，不能笼统归为不适用。

迁移从一个用例开始：记录当前发布与恢复耗时，完成可追溯制品、探针、停机和证据链；再演练实例故障、下游超时、滚动发布和恢复。确认系统改善后再引入更复杂的弹性、网格和平台能力。衡量的是业务可用性、变更失败率、恢复时间和总成本，而不是组件数量。

继续阅读：[Kubernetes 导览](/docs/container/kubernetes/)、[容器基础](/docs/container/basic/)、[微服务架构](./microservices-architecture)。
