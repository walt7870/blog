# 08. 分布式编排与 KV 缓存组件：引擎之上的那一层

前七篇讲的都是“一个引擎实例”：vLLM、SGLang、TensorRT-LLM、LMDeploy 怎样把一张或一台机器的 GPU 用好，llama.cpp、Ollama、MLX-LM 怎样在一台个人设备上跑起来。资料助手推广到全公司以后，[生产部署篇](../llm-inference/21-production.md)算出高峰期要 9 到 10 个 Qwen3-8B 副本，每个占一张 H100。副本一多，新的问题就不在任何单个引擎里了：同一份员工手册在十个副本上各算一遍 Prefill；某个副本因为缓存命中高被路由器塞满，其他副本闲着；长文档问答需要把 Prefill 和 Decode 拆到两个池子；夜里流量下降，十张卡照样开着。

处理这些问题的软件位于引擎之上，统称为**编排层**。它不重新实现注意力和调度，而是决定请求发往哪个副本、KV Cache 在机器之间怎样搬、显存放不下的 KV 往哪里放、副本数怎样随负载变化。这一篇按问题介绍这层的主要开源项目：NVIDIA Dynamo、llm-d（及其依赖的 Kubernetes Gateway API Inference Extension）、vLLM production-stack、AIBrix，以及被它们共同使用的三个 KV 组件 NIXL、Mooncake、LMCache。读完你应该能说清每个项目解决哪一段问题、和引擎怎样组合，为资料助手画出不同规模下的拓扑，并判断自己的部署到底需不需要这一层。

前缀缓存、多卡并行和 P/D 分离的机制分别在[前缀缓存](../llm-inference/10-prefix-cache.md)、[分布式推理](../llm-inference/16-distributed.md)和 [P/D 分离](../llm-inference/17-pd-disaggregation.md)讲过，这里不重讲，只讲这些项目怎样把机制落成组件和配置。本篇的版本以 2026-10-27 查询的 GitHub 正式发布为准；所有 GPU 相关命令按官方仓库的文档与示例脚本核对，没有在 GPU 上实际运行。

## 副本多了以后，引擎管不到的事

先把问题按层次排好。一个请求从用户到 GPU，再加上管理副本数量的控制面，编排层涉及五件事：

![推理编排层分为网关、路由、引擎、KV 传输、KV 缓存层级五层，底部控制面横跨各层；右侧列出 Dynamo、llm-d、production-stack、AIBrix、NIXL、Mooncake、LMCache 分别落在哪一层](/ai/inference-engines/orch-layers.svg)

**路由：发往哪个副本。** 每个副本的前缀缓存是独立的。轮询会让同一份系统提示在每个副本上都冷启动一次；反过来，只按缓存命中分发，又会把热门前缀全部压到同一个副本上。路由层要同时看“哪个副本已经缓存了这段前缀”和“哪个副本现在不忙”。

**P/D 编排：两个池子之间谁先谁后。** 引擎提供了 P/D 分离的能力（vLLM 的 KV 连接器、SGLang 的 `--disaggregation-mode`），但“新请求先发给哪个 Prefill 实例、Prefill 完成后交给哪个 Decode 实例、中途失败怎样清理”是引擎之外的事，[P/D 分离篇](../llm-inference/17-pd-disaggregation.md)最后也提到这部分需要路由层或编排层负责。

**KV 传输：怎样搬得快。** P/D 分离要把 KV 从一台机器搬到另一台，跨机器共享缓存也要搬。走 CPU 中转的普通网络太慢，需要能让 GPU 显存直接通过 RDMA、NVLink 收发的传输库。

**多级 KV 缓存：显存放不下的 KV 去哪里。** 多轮对话和 Agent 的前缀很长、复用间隔也长，GPU 显存装不下全部“以后可能再用”的 KV。把被淘汰的块放到 CPU 内存、本地 SSD 甚至远端存储池，下次命中时读回来，比重算一次 Prefill 便宜。

**控制面：副本数随什么变。** 推理服务的瓶颈在 GPU，按 CPU 使用率扩缩是错的；批处理时 GPU 利用率又一直接近 100%，也不能直接用。更合适的信号是等待队列、KV 使用率和 TTFT/TPOT 分位数，P/D 部署还要调两个池子的比例。

右侧那一列说明了这个领域最容易让人困惑的地方：没有哪个项目只占一层，也没有哪个项目占满全部五层。Dynamo 从入口一直覆盖到 KV 缓存层级；llm-d 主要做路由和 Kubernetes 上的部署编排，KV 传输和缓存交给 NIXL 与引擎自带的卸载；LMCache、Mooncake、NIXL 则是被其他项目拼装进去的零件。选型时先想清楚自己缺的是哪一层。

## KV 感知路由：命中和负载一起算

路由是编排层里收益最直接、也最常被需要的一层，先把它讲清楚。

最简单的前缀亲和是**会话亲和**：同一个会话的请求按会话 ID 哈希到同一个副本。它不需要知道副本里缓存了什么，实现成本几乎为零，对多轮对话有效；但不同用户共享的长前缀（同一份制度文件、同一个系统提示）照样分散在各个副本上。更进一步的做法是让路由器知道“每个副本缓存了哪些 KV 块”，再把这个信息和负载合起来打分。下图以 Dynamo Router 的默认成本函数为例：

![KV 感知路由：请求按块计算前缀哈希，查全局 KV 索引得到每个副本的命中块数，再按待算 Prefill 块数加预计 Decode 块数计算成本，选成本最低的副本；副本把块的存入与淘汰作为 KV 事件上报给索引](/ai/inference-engines/orch-kv-routing.svg)

路由器先把提示词分词，按引擎的 KV 块大小切块，对每一块计算一个**链式哈希**（每块的哈希包含它前面所有块的内容），这和引擎内部前缀缓存的做法一致，所以路由器算出的哈希能和引擎里的块对上号。然后在全局索引里查每个副本连续命中了多少块。Dynamo 的成本公式是：

```text
待算 Prefill 块 = max(0, 已在排队的 Prefill 块 + 本请求的块数 − 命中块数 × 抵扣系数)
预计 Decode 块  = 该副本当前活跃的 KV 块 + 本请求将占用的块
成本            = Prefill 权重 × 待算 Prefill 块 + 预计 Decode 块
```

图中三个副本的数字是教学示例：副本 A 命中 40 块但已经很忙，B 最闲却要从头算，C 命中同样多、负载适中，成本最低。只看命中会选 A，只看负载会选 B。两个系数默认都是 1.0（`--router-kv-overlap-score-credit`、`--router-prefill-load-scale`），调大 Prefill 权重会更偏向缓存命中，适合长输入、TTFT 敏感的负载；调小则更偏向均衡，适合输出长、Decode 压力大的负载。`--router-temperature` 默认 0，选成本最低者；设成正数时按成本做 softmax 随机抽样，避免多个前端同时把请求压到同一个“最优”副本上。

路由器怎么知道副本里有什么？有两种做法，取舍很重要：

- **订阅 KV 事件（精确）。** 引擎每存入或淘汰一个块就发一条事件（vLLM 用 `--kv-events-config` 打开，经 ZMQ 发布），路由器据此维护索引。索引贴近真实，但每个路由器副本都要订阅所有引擎，事件丢失或滞后时索引会和实际缓存不一致。
- **按路由历史估计（近似）。** 路由器记住“我把哪些前缀发给过谁”，假定那里还缓存着，按容量和时间做 LRU 估算。不需要引擎配合，代价是副本淘汰了缓存以后路由器并不知道。

各项目对同一个思想的表达方式不同。Dynamo 用一个加法成本函数，`--router-mode kv` 打开，事件可用 `--no-router-kv-events` 关闭改为预测；llm-d Router 用“过滤器 + 打分器”插件组合，默认的 Optimized Baseline 是 `prefix-cache-affinity-filter`（先缩小到前缀亲和的候选，过热时放开）加 `token-load-scorer`（按各副本的 Prefill token 负载打分），需要精确索引时再加订阅 KV 事件的 `precise-prefix-cache-producer`；production-stack 的路由器有 `prefixaware`（路由器内部的前缀树）和 `kvaware`（向 LMCache controller 查询 KV 所在位置）两种；AIBrix 网关有 `prefix-cache`、`prefix-cache-preble` 等策略。

**一个不适用的场景。** 资料助手如果每个请求的提示词都由检索结果拼成、开头就是不同的文档片段，系统提示又很短，那么各副本之间可共享的前缀几乎为零，KV 感知路由退化成负载均衡，还白白多了分词和查索引的开销。上线前先看引擎的前缀命中率指标：命中率本来就低，先调整提示词结构（把固定内容放在最前面），再谈路由。

## NVIDIA Dynamo：从入口到 KV 层级的一整套

Dynamo 自述为“推理引擎之上的编排层，不替代 SGLang、TensorRT-LLM 或 vLLM，而是把它们组织成协同的多节点推理系统”。核心用 Rust 编写，组件和引擎包装用 Python，Apache-2.0 许可。当前正式版是 v1.6.1（2026-10-27）。

它由几类进程组成，每个都是 `python -m dynamo.<组件>` 启动：

| 组件 | 职责 |
| --- | --- |
| `dynamo.frontend` | OpenAI 兼容 HTTP 入口（默认 8000 端口），做对话模板与分词等预处理；内嵌路由器 |
| Router | `--router-mode` 默认 `round-robin`，还有 `random`、`power-of-two`、`least-loaded`、`kv` 等；`kv` 即上一节的成本函数 |
| `dynamo.vllm` / `dynamo.sglang` / `dynamo.trtllm` | 包装对应引擎的 worker 进程，向 Dynamo 注册、接收已分词的请求、发布 KV 事件和负载指标 |
| Planner | 按 SLA 或负载伸缩 Prefill、Decode 副本，需要部署在 Kubernetes 上 |
| KVBM（KV Block Manager） | 多级 KV 缓存：G1 GPU → G2 CPU 锁页内存 → G3 本地磁盘 → G4 S3 兼容对象存储 |
| NIXL | P/D 之间与 KVBM 各层之间的 KV 传输 |

单机两卡、合并部署加 KV 路由的最小形态如下（摘自官方 `examples/backends/vllm/launch/agg_router.sh`，以 Qwen3-0.6B 为例，未在 GPU 上实测）：

```bash
# 安装：uv pip install --prerelease=allow "ai-dynamo[vllm]"
export PYTHONHASHSEED=0

python -m dynamo.frontend --router-mode kv &

CUDA_VISIBLE_DEVICES=0 python3 -m dynamo.vllm --model Qwen/Qwen3-0.6B --block-size 64 \
  --kv-events-config '{"publisher":"zmq","topic":"kv-events","endpoint":"tcp://*:20080","enable_kv_cache_events":true}' &
# 第二个 worker 换 CUDA_VISIBLE_DEVICES=1 和另一个事件端口
```

`PYTHONHASHSEED=0` 不是可有可无：块哈希在不同进程之间必须一致，路由器的索引才能和引擎的块对上。

**P/D 的流程。** Dynamo 由前端编排两次路由：先选一个 Prefill worker，它算完 KV 后返回传输参数（vLLM 是 `kv_transfer_params`，TensorRT-LLM 是不透明状态，SGLang 是 bootstrap 信息）；前端把参数塞进请求，再选一个 Decode worker，后者通过 NIXL 从 Prefill 那边直接拉取 KV。SGLang 后端的 Prefill 以后台任务执行，Decode 可以并行开始建立连接。vLLM 的两类 worker 分别用 `--disaggregation-mode prefill` / `decode` 启动，配 `{"kv_connector":"NixlConnector","kv_role":"kv_producer"}` 或 `kv_consumer`，每个 worker 还要一个独立的 `VLLM_NIXL_SIDE_CHANNEL_PORT`。

**Planner。** 优化目标有 `throughput`（默认，看队列深度和 KV 使用率阈值）、`latency`、`load` 和 `sla`（给定 `ttft_ms`、`itl_ms`）。`sla` 目标下可以用基于吞吐的方法：预测流量，再用离线性能模型算出满足 SLA 需要几个 Prefill、几个 Decode 副本，默认 180 秒调整一次；基于负载的方法读取引擎每次前向的指标，默认 5 秒一次，用来应对突发。两者同时开时，前者给出下限，后者处理高于下限的部分。

**部署与依赖。** 早期资料常说 Dynamo 依赖 etcd 和 NATS。1.6 的说法是：Kubernetes 上用 CRD 和 EndpointSlice 做服务发现，请求走 TCP，不需要 etcd、NATS；本地开发用 `--discovery-backend file`；只有非 Kubernetes 的多机部署仍推荐 etcd 或 NATS。Kubernetes 上由 operator 管理 `DynamoGraphDeployment` 等 CRD，多节点的拓扑感知放置交给 Grove。

**和引擎版本的关系。** 1.6.1 的 `pyproject.toml` 锁定 `vllm==0.31.0`、`sglang==0.5.21`、`tensorrt-llm==1.3.0rc29`，都比各引擎的最新版晚一步，TensorRT-LLM 用的还是预发布版。用 Dynamo 意味着引擎版本跟着 Dynamo 走，不能随意单独升级引擎。功能矩阵里 P/D、KV 路由、SLA Planner 三个后端都支持，KVBM 对 vLLM 和 TensorRT-LLM 可用、SGLang 仍在开发。

Dynamo 适合愿意整体采用 NVIDIA 方案、规模到几十张卡以上、需要 P/D 和 SLA 驱动扩缩的团队，和 [TensorRT-LLM](./03-tensorrt-llm.md) 配合最紧密。它的概念和配置面都很大：路由器 1.6 刚把打分参数迁到 `--router-policy-config` YAML，旧的 `--router-queue-threshold` 等参数已标记弃用、计划 1.7 移除，跨版本升级要读迁移说明。

## llm-d：Kubernetes 原生的那条路

llm-d 是一套跑在 Kubernetes 上的分布式推理栈，由 Red Hat、Google Cloud、IBM Research、CoreWeave、NVIDIA 发起，2026 年 3 月成为 CNCF Sandbox 项目，2026-10-20 发布 v1.0.0。和 Dynamo 最大的不同是：它不包装引擎进程，直接运行上游 vLLM、SGLang 镜像（v1.0 起弃用了自己的推理镜像），把智能放在**路由器**和 Kubernetes 资源编排上。

它的路由器建立在 Kubernetes 的 **Gateway API Inference Extension**（GAIE）之上。GAIE 定义了 `InferencePool` 资源（API 组 `inference.networking.k8s.io/v1`）：一组提供同一模型的 Pod，加上一个负责挑选具体 Pod 的 **Endpoint Picker**（EPP）。网关（Envoy、Istio、agentgateway 等）收到请求后通过 ext-proc 协议问 EPP“发给谁”，EPP 读取各 Pod 的 Prometheus 指标（vLLM 的 `vllm:num_requests_waiting`、`vllm:kv_cache_usage_perc` 等，SGLang 的 `sglang:num_queue_reqs`、`sglang:token_usage`）后回答。EPP 的主体实现现在是 llm-d 的 **llm-d Router**（原名 llm-d-inference-scheduler，v1.0 时 KV 索引库 llm-d-kv-cache 也并了进去），GAIE 仓库保留 InferencePool API、协议和一致性测试。路由器默认以 Standalone 模式运行（Envoy 旁车直接调 EPP），也可以挂在 Istio、agentgateway、GKE 等网关后面。

路由策略写在 `EndpointPickerConfig`（`apiVersion: llm-d.ai/v1`）里，由插件组合：过滤器先缩小候选（`prefix-cache-affinity-filter`、`prefill-filter`、`decode-filter`），打分器给剩下的打分（`token-load-scorer`、`queue-scorer`、`kv-cache-utilization-scorer`、`session-affinity-scorer`、`lora-affinity-scorer` 等），选择器取最高分。官方把经过基准验证的配置称为 well-lit paths，主要有：

| 路径 | 内容 |
| --- | --- |
| Optimized Baseline | 前缀亲和 + Prefill 负载打分，大多数部署的起点；参考配置为 H100 上 TP=2 的 Qwen3-32B |
| Precise Prefix Cache Routing | 路由器订阅 vLLM/SGLang 的 KV 事件，维护精确索引 |
| Predicted Latency-Based Routing | 在线训练的模型预测每个 Pod 的延迟再路由 |
| Tiered Prefix Cache | 默认用 vLLM 原生 `OffloadingConnector` 把淘汰的块放到 CPU 内存，可选共享文件系统；也可换 LMCache 或 Mooncake Store |
| P/D Disaggregation | 同一 InferencePool 内的 Prefill、Decode Pod，默认 NixlConnector |
| Wide Expert-Parallelism | DeepSeek 一类大 MoE 的大规模 EP 部署 |
| Workload Autoscaling | KEDA 按路由器指标伸缩 |

**P/D 的顺序和 Dynamo 相反。** llm-d 的路由器同样选两次（一个 Prefill Pod、一个 Decode Pod），但请求先到 **Decode Pod 的路由旁车**，旁车以 `max_tokens=1` 调用 Prefill Pod，拿回 KV 传输参数后再交给本地的 Decode 引擎，Decode 通过 NIXL 拉 KV。v1.0 用 LeaderWorkerSet 的 `DisaggregatedSet` 把 P 和 D 作为一个整体管理。两种顺序都能工作，差别在于失败时谁负责清理、谁持有用户的连接，排查问题时要知道自己用的是哪一种。

**扩缩容。** llm-d 早期的 Workload Variant Autoscaler 已弃用，现在的推荐是 KEDA 读取路由器暴露的队列深度、在途请求数、KV 压力和饱和度，经 External Metrics API 生成 HPA，支持缩容到零。官方文档专门说明了为什么不用 GPU 利用率：批处理期间它始终接近 100%，与负载无关。

**分级缓存的一个坑。** vLLM 原生 CPU 卸载层放在 `/dev/shm`，计入 Pod 的内存上限，调大缓存容量时要同步调 Pod 的内存请求和限制；多个副本共享文件系统层时，所有 Pod 必须设置同一个 `PYTHONHASHSEED`，否则块哈希不一致，读不到彼此写入的块。

llm-d 也提供了不依赖 Kubernetes 的部署指南（EPP 从 YAML 文件读取后端列表），但它的主场是 Kubernetes。已经有 Kubernetes 平台、希望沿用 Gateway API 体系、引擎用上游 [vLLM](./01-vllm.md) 或 [SGLang](./02-sglang.md) 的团队，从 Optimized Baseline 起步最自然。

## vLLM production-stack：vLLM 官方的参考栈

production-stack 是 vLLM 项目的“参考部署”：一个 Helm chart，包含 vLLM 引擎、一个 Python 写的路由器（镜像 `lmcache/lmstack-router`）和 Prometheus/Grafana 监控面板，与 LMCache 深度集成。首个版本在 LMCache 团队的博客上发布，当前 chart 版本 vllm-stack-0.1.13（2026-09-29）。

```bash
helm repo add vllm https://vllm-project.github.io/production-stack
helm install vllm vllm/vllm-stack -f values.yaml
```

`values.yaml` 的结构很直白，下面是资料助手的一个示意（字段名按 chart 0.1.13 的 `values.yaml` 和官方示例核对，未在集群上运行）：

```yaml
servingEngineSpec:
  modelSpec:
  - name: "qwen3-8b"
    repository: "vllm/vllm-openai"
    tag: "v0.32.0"            # 固定版本，不用 latest
    modelURL: "Qwen/Qwen3-8B"
    replicaCount: 4
    requestGPU: 1
    vllmConfig:
      enablePrefixCaching: true
      maxModelLen: 16384
    lmcacheConfig:
      enabled: true
      cpuOffloadingBufferSize: "60"   # 转成 LMCACHE_MAX_LOCAL_CPU_SIZE，单位 GB
routerSpec:
  routingLogic: "session"     # 或 prefixaware、kvaware、roundrobin
  sessionKey: "x-user-id"
```

路由器的 `--routing-logic` 有 `roundrobin`、`session`、`prefixaware`、`kvaware`、`loadaware`、`disaggregated_prefill`、`priority` 等；Helm 值 `routingLogic` 的枚举不含 `loadaware` 和 `priority`，需要时通过 `extraArgs` 传给路由器。`kvaware` 依赖 LMCache controller 报告 KV 位置，`prefixaware` 只在路由器内部维护前缀树。自动扩缩依赖另装的 KEDA（`keda.enabled`、`minReplicaCount` 可为 0）。P/D 通过 `enablePD` 和 LMCache 的连接器实现。

它的优点是轻：一个 Helm chart、一个容易读懂的 Python 路由器，比 Dynamo 和 llm-d 都容易上手和改造。成熟度要实事求是地看：版本号仍是 0.1.x，路由器镜像默认标签是 `latest`，不少官方示例固定的是很早的 `lmcache/vllm-openai` 镜像标签，生产使用前要把引擎、路由器镜像都固定到明确的版本并自己做回归。

## AIBrix：另一套 Kubernetes 控制面

AIBrix 同样在 vllm-project 组织下，起源于字节跳动的生产实践（相关演讲由字节跳动工程师在 KubeCon 上发表，另有 arXiv 白皮书 2504.03648），当前版本 v0.8.0（2026-10-13）。它把自己定位为“生产 LLM 推理的 Kubernetes 控制面”，引擎可以是 vLLM、SGLang 或 TensorRT-LLM。

它的组件比 production-stack 多得多：基于 Envoy Gateway 的网关插件提供十几种路由策略（`least-request`、`least-kv-cache`、`throughput`、`prefix-cache`、`session-affinity`、`pd`、一组 `slo` 策略等，可按请求头 `routing-strategy` 或全局环境变量选择）；`PodAutoscaler` 支持 HPA、KPA、APA 三种伸缩策略；`StormService` 管理多节点、多角色（包括 P/D）的部署与滚动；LoRA 高密度部署把很多适配器放在共享基座模型的 Pod 上；分布式 KV 缓存以引擎内 DRAM 为 L1、InfiniStore 等外部集群为 L2；0.8.0 新增了实验性的 `ModelClaim`、`ModelWarmup`。安装是三个 `kubectl apply`（依赖、CRD、核心组件）。

AIBrix 和 llm-d 的目标高度重叠，都是 Kubernetes 上的推理控制面。差别在于 AIBrix 自带的功能面更宽（LoRA 管理、异构 GPU、模型生命周期），llm-d 更强调 Gateway API 标准和经过基准验证的配方。大量 LoRA 适配器、多模型共享 GPU 的平台型场景，可以重点评估 AIBrix；不过它的 CRD 大多是 `v1alpha1`，接口仍可能变化。

## KV 传输与缓存组件：NIXL、Mooncake、LMCache

上面四个项目在 KV 搬运和存储上反复用到三个组件（Dynamo 另有自己的 KVBM，底层传输同样交给 NIXL）。

**NIXL**（NVIDIA Inference Xfer Library，v1.5.1，仅 Linux）是一个点对点传输抽象层。它把 GPU 显存、CPU 内存、块设备、文件、对象存储统一成几类“内存段”，具体搬运交给插件：`ucx`、`libfabric`、`mooncake`、`uccl`、GPUDirect Storage（`cuda_gds`）、`posix`、`obj`（S3）等。各进程的 NIXL agent 先交换元数据（连接信息、远端内存区域），之后一端可以直接读写另一端注册过的显存。vLLM 的 `NixlConnector`、SGLang 的 `--disaggregation-transfer-backend nixl`、TensorRT-LLM 的 `cache_transceiver_config`（1.2.1 文档写明默认后端是 NIXL）、Dynamo 和 llm-d 的 P/D 都建立在它上面。它解决的是 [P/D 分离篇](../llm-inference/17-pd-disaggregation.md)算过的那笔账：1 GiB 的 KV 在 400 Gb/s RDMA 上约 21 毫秒，前提是不经过 CPU 中转。

**Mooncake** 是月之暗面 Kimi 服务架构的开源部分（v0.3.13.post1），论文的思想是“以 KV Cache 为中心”。它包含两个主要组件：**Transfer Engine**，支持 RDMA、TCP、NVLink、CXL、NVMe-oF 等多种传输，是 SGLang P/D 的默认传输后端（`--disaggregation-transfer-backend` 默认 `mooncake`）；**Mooncake Store**，用集群里闲置的 CPU 内存和 SSD 组成一个分布式 KV 缓存池，由 `mooncake_master` 管理元数据、副本和淘汰。pip 包名是 `mooncake-transfer-engine`。vLLM 有 `MooncakeConnector`（P/D 传输）和 `MooncakeStoreConnector`（共享缓存池），SGLang 的 HiCache 可以把 Mooncake Store 当作存储后端，NIXL 和 LMCache 也各有 Mooncake 插件。

**LMCache**（v0.5.6）是一个 KV 缓存层：把引擎的 KV 按块（默认 256 个 token 一块）卸载到 CPU 内存（默认开启，5 GB）、本地磁盘或远端后端（Redis、Valkey、Mooncake Store、InfiniStore、S3 等），在副本之间共享，也能做 P/D 传输和 CacheBlend（非前缀位置的 KV 复用）。vLLM 中用一个连接器接入：

```bash
LMCACHE_CONFIG_FILE=lmcache.yaml vllm serve Qwen/Qwen3-8B \
  --kv-transfer-config '{"kv_connector":"LMCacheConnectorV1","kv_role":"kv_both"}'
```

SGLang 中通过 `--enable-lmcache` 和 `--lmcache-config-file` 打开，启用后改用接入 LMCache 的基数树缓存，与 HiCache 是两套并列的分层缓存方案。配置项都可以写成 `LMCACHE_` 前缀的环境变量。v0.5.6 的发布说明包含一组安全加固（进程间通信去掉 pickle、管理接口默认只绑定 localhost、脚本执行接口默认关闭），使用旧版本的要尽快升级，并且不要把它的管理端口暴露到集群外。

这三个组件的关系可以这样记：NIXL 和 Mooncake Transfer Engine 是“搬运工”，Mooncake Store、LMCache、Dynamo KVBM 是“仓库管理员”，仓库管理员底下可以用不同的搬运工。引擎自己也在往这个方向走：vLLM 有原生的 `OffloadingConnector`，SGLang 有 HiCache，llm-d 的分级缓存默认就用 vLLM 原生方案。只需要“单机 CPU 卸载”时，先试引擎自带功能，再考虑外部组件。

## 资料助手在不同规模下的拓扑

把这些组件放回资料助手。下面三个阶段以生产部署篇的数字为起点（Qwen3-8B，单张 H100 一个副本，高峰 30 请求/秒需要 9 到 10 个副本），规模和收益都是规划示例，实际要用自己的负载压测。

**阶段一：2 到 4 个副本。** 一台或两台机器，Docker Compose 或简单的 Kubernetes Deployment。前面放现有的 API 网关，按会话 ID 或用户 ID 做一致性哈希（Nginx、Envoy 都能做），系统提示和员工手册的固定部分放在提示词最前面，打开引擎的前缀缓存。这个规模不需要编排层：各副本之间可共享的前缀有限，会话亲和已经拿到大部分收益，多一个路由组件反而多一个故障点。

**阶段二：10 个左右副本，跑在 Kubernetes 上。** 这时轮询的缺点变得明显：员工手册的长前缀在十个副本上各算一遍，热门时段个别副本排队。可以引入 llm-d 的 Optimized Baseline（或 production-stack 的 `prefixaware`），让同一前缀的请求集中到少数副本、过热时再分散；对多轮对话多的用户群，打开 CPU 卸载（vLLM `OffloadingConnector` 或 LMCache），让过了几分钟才回来的会话不必重算；扩缩容用 KEDA 读等待队列，最少保留能扛住日常低谷的副本数。验收看三组数：前缀命中率是否上升，TTFT P95 是否下降，各副本的等待队列是否更均匀。

**阶段三：换成 70B 或大 MoE、长文档问答为主、几十张卡以上。** 输入普遍几万 token、对出字稳定性要求高时，才考虑 P/D 分离：Prefill 池用更大的 TP，Decode 池用更大的批，中间走 NIXL over RDMA。此时 Dynamo（偏 NVIDIA 全栈，自带 Planner 按 SLA 调 P/D 比例）和 llm-d（偏 Kubernetes 标准，P/D 加 KEDA）是两个主要候选，KV 层级可以加上 Mooncake Store 或 LMCache 的远端池。

## 要不要这一层：先问五个问题

大多数团队在只有几个副本时不需要编排层。按顺序回答下面几个问题，前两个答案都是“否”，就先别引入：

1. **副本数是否超过 4 到 5 个，且会持续增长？** 副本少时，会话亲和加普通负载均衡就够了。
2. **请求之间有没有大段共享前缀？** 看引擎的前缀命中率和提示词结构。没有共享前缀，KV 感知路由没什么可感知的。
3. **单个副本的 GPU 显存是不是装不下“近期会再用的 KV”？** 多轮对话间隔长、Agent 上下文长时，多级缓存才有收益；短问短答用不上。
4. **长 Prefill 是否明显拖慢了别人的出字，而且分块预填充已经调过？** 是，且有 RDMA 网络和几十张卡，再考虑 P/D 分离及其编排。
5. **团队能否运维 Kubernetes 上的 CRD、网关和额外的有状态组件？** 编排层本身也是需要升级、监控、排障的系统。

反过来说，最常见的失败场景是：三张卡的部署照着大厂的架构图引入了 P/D 分离和 Dynamo 全套。Prefill 池一张卡、Decode 池两张卡，Prefill 池在高峰时成为瓶颈而 Decode 池闲置，两个池子都小到无法均衡；KV 通过普通以太网传输，每次多出几百毫秒 TTFT；出现问题时要在前端、路由器、两类 worker、传输层之间逐层排查。改回三个合并部署的副本加分块预填充，TTFT 和吞吐都更好。判断依据始终是用真实负载对比 Goodput 和延迟分位数（[压测篇](../llm-inference/20-benchmark.md)），而不是架构图上的层数。

## 成熟度与常见坑

这一层整体比引擎年轻，版本号说明了一部分情况：llm-d 刚到 1.0，AIBrix 0.8，production-stack 的 chart 还是 0.1.x，Mooncake 0.3，Dynamo 虽然是 1.6，但每个小版本都有参数迁移和弃用。几个实际要注意的地方：

- **版本组合是锁死的。** Dynamo 1.6.1 锁定 vLLM 0.31.0，llm-d 1.0.0 锁定 vLLM 0.31.0 和 GAIE 1.6.2。编排层、引擎、KV 连接器三方版本要一起升级，一起回归。
- **名字变化快。** llm-d-inference-scheduler 改名 llm-d Router，llm-d-kv-cache 并入路由器，Workload Variant Autoscaler 弃用，GAIE 的 EPP 和 InferenceModel 一类资源迁到 llm-d；Dynamo 的路由打分参数迁进 YAML。搜到的教程如果用的是旧名字，大概率已经过时。
- **哈希一致性。** KV 感知路由和跨副本共享缓存都依赖块哈希一致：同样的块大小、同样的分词器与模型版本、同样的 `PYTHONHASHSEED`。任何一项不一致，表现都是“命中率莫名其妙地低”，不会报错。Dynamo 直接拒绝模型部署卡校验和不一致的副本加入同一组 worker，也是这个原因。
- **索引是估计。** 事件丢失、副本重启、缓存被淘汰，都会让路由器的索引过时。路由器把请求发到“以为有缓存”的副本，最坏情况只是退化为一次完整 Prefill，不影响正确性，但要监控命中率是否与路由器的预期一致。
- **KV 传输网络。** P/D 和远端缓存池的收益建立在 RDMA 级网络上。在普通以太网或没有 GPUDirect 的环境里，先算传输时间是否吃掉收益。
- **内存和安全边界。** CPU 卸载层占用的是主机内存（vLLM 在 `/dev/shm`），要计入容器限制；LMCache controller、Mooncake master、各类指标和管理端口都只应在集群内网可达。
- **故障域变大。** 合并部署时一个副本挂掉只影响它自己；P/D 部署中 Prefill 池整体过载会让所有请求的 TTFT 失控，远端缓存池故障会让所有副本同时退化成冷缓存。这些场景要在上线前演练。

## 版本与变化

以下为 2026-10-27 查询的 GitHub 正式发布：

| 项目 | 当前正式版 | 发布日期 | 近期要点 |
| --- | --- | --- | --- |
| NVIDIA Dynamo | v1.6.1 | 2026-10-27 | 1.6.0（10-22）路由打分迁入 `--router-policy-config`、队列参数弃用；K8s 上不再需要 etcd/NATS；锁定 vLLM 0.31.0、SGLang 0.5.21、TensorRT-LLM 1.3.0rc29 |
| NIXL | v1.5.1 | 2026-10-26 | 插件含 UCX、libfabric、Mooncake、UCCL、GDS、对象存储 |
| llm-d | v1.0.0 | 2026-10-20 | 路由配置 API 升为 `v1`、路由器热备、`DisaggregatedSet`、改用上游引擎镜像 |
| llm-d Router | v1.0.0 | 2026-10-16 | 原 llm-d-inference-scheduler；并入 KV 索引库 |
| Gateway API Inference Extension | v1.6.2 | 2026-09-17 | `InferencePool` 为 v1；EPP 主体迁至 llm-d |
| vLLM production-stack | chart 0.1.13 | 2026-09-29 | 维护性更新；路由器镜像默认 `latest` |
| AIBrix | v0.8.0 | 2026-10-13 | 实验性 `ModelClaim`、`ModelWarmup`，StormService 增强 |
| Mooncake | v0.3.13.post1 | 2026-08-31 | v0.3.14-pre 为预发布（10-26） |
| LMCache | v0.5.6 | 2026-10-14 | 安全加固；v0.5.7rc1/rc2 已发布但属候选版 |

升级时有两点要特别注意。第一，LMCache 的 GitHub 发布页按平台拆分标签，候选版和每日构建会排在列表最前面，判断“最新正式版”要看标记为 Latest 的那一个。第二，编排层的升级说明往往写在引擎之外：先读编排层的弃用和迁移说明，再确认它锁定的引擎版本，按[生产部署篇](../llm-inference/21-production.md)的流程离线回归、灰度、保留回退。

回顾一下：编排层解决的是副本多了以后的五件事——路由、P/D 编排、KV 传输、多级 KV 缓存和按 SLO 扩缩。KV 感知路由把缓存命中和负载放进同一个成本里，是最常用、收益最直接的一层；Dynamo 从入口覆盖到 KV 层级，llm-d 和 AIBrix 是 Kubernetes 上的控制面，production-stack 是轻量的参考栈，NIXL、Mooncake、LMCache 是被它们拼装的传输与缓存零件。几个副本时，会话亲和加前缀放前面通常就够了。各引擎和这些组件放在一起怎样取舍，见下一篇[整体对比与选型](./09-comparison.md)。
