# 第 08 篇核对记录：分布式编排与 KV 缓存组件

查询日期 2026-10-27（UTC 时间部分发布已是 10-28）。源码均为浅克隆，位于
`/private/tmp/claude-501/-Users-waltniu-project-blog/ab2dea5d-ac09-4d96-a1ed-1bc537d34308/scratchpad/src/<name>`，下文路径相对该目录。

## 版本快照（gh release list / releases/latest）

| 项目 | 正式版 | 日期 | 备注 |
| --- | --- | --- | --- |
| ai-dynamo/dynamo | v1.6.1 | 2026-10-27 | v1.6.0 为 2026-10-22；另有多个 `-dev.1` 模型专用预发布 |
| ai-dynamo/nixl | v1.5.1 | 2026-10-26 | |
| llm-d/llm-d | v1.0.0 | 2026-10-20 | 上一版 v0.10.0（2026-09-29） |
| llm-d/llm-d-router | v1.0.0 | 2026-10-16 | 原 llm-d-inference-scheduler，旧地址重定向到此 |
| kubernetes-sigs/gateway-api-inference-extension | v1.6.2 | 2026-09-17 | |
| vllm-project/production-stack | Helm chart vllm-stack-0.1.13 | 2026-09-29 | 路由镜像 `lmcache/lmstack-router` 默认标签 `latest`（helm/values.yaml:459-461） |
| vllm-project/aibrix | v0.8.0 | 2026-10-13 | |
| kvcache-ai/Mooncake | v0.3.13.post1 | 2026-08-31 | v0.3.14-pre 预发布 2026-10-26 |
| LMCache/LMCache | v0.5.6 | 2026-10-14 | `releases/latest` 返回 v0.5.6；v0.5.7rc1/rc2 按平台分标签发布且未标 prerelease，`gh release list` 首行会是 rc 或 nightly，需用 releases/latest 判断 |

## NVIDIA Dynamo v1.6.1

- 自述：引擎之上的编排层，不替代 SGLang、TensorRT-LLM、vLLM（dynamo/README.md:36）；Rust 写性能部分、Python 做扩展（README.md:38）；Apache-2.0（pyproject.toml:12）。
- 组件模块：`components/src/dynamo/` 下有 frontend、router、planner、global_planner、global_router、vllm、sglang、trtllm、mocker、profiler 等。
- Frontend：OpenAI 兼容 HTTP，`--http-port` 默认 8000（docs/fern/pages/reference/components/frontend-configuration.mdx:25）；`ModelInput::Token` 时由 Dynamo 预处理（分词）（.../frontend/frontend-guide.md:60-61）。1.6.0 新增 `/v1/rerank`、mTLS。
- Router：`python -m dynamo.frontend --router-mode kv`；`--router-mode` 默认 `round-robin`（frontend-configuration.mdx:106），其他 random、power-of-two、least-loaded、device-aware-weighted（routing-concepts.md:86,104-107）。
- 成本函数（.../router/routing-concepts.md:28-36）：`raw_prefill_blocks = active_prefill_blocks + incoming_prompt_blocks`；`adjusted = max(0, raw - overlap_credit_blocks)`；`potential_decode_blocks = active_decode_blocks + incoming_active_blocks`；`cost = prefill_load_scale * adjusted + potential_decode_blocks + active_request_blocks`；`decode_active_request_weight` 默认 0；选最低成本；`--router-temperature` 默认 0.0（frontend-configuration.mdx:205），非零时按 softmax 采样（routing-concepts.md:66）。
- `--router-kv-overlap-score-credit` 默认 1.0、`--router-prefill-load-scale` 默认 1.0（frontend-configuration.mdx:148,168）。旧 `--router-kv-overlap-score-weight` 映射为 `prefill_load_scale`，1.6 起打分参数迁入 `--router-policy-config` YAML（configuration-and-tuning.md:550；v1.6.0 发布说明 #15202）；`--router-queue-threshold`/`--router-queue-policy` 1.6 弃用、计划 1.7 移除（configuration-and-tuning.md:73）。
- CPU/磁盘层命中折算：`--router-host-cache-hit-weight` 默认 0.75，`--router-disk-cache-hit-weight` 默认 0.25（configuration-and-tuning.md:75-76）。
- KV 事件：worker 经事件面发布块存入/淘汰；vLLM 示例 `--kv-events-config '{"publisher":"zmq","topic":"kv-events","endpoint":"tcp://*:20080","enable_kv_cache_events":true}'`（examples/backends/vllm/launch/agg_router.sh）；`--no-router-kv-events` 改为预测缓存状态；KV 路由不需要 NATS（README.md:300）。示例脚本设 `PYTHONHASHSEED=0`、`--block-size 64`。
- 同一 worker 集合要求模型部署卡（MDC）校验和一致，不一致的副本不接流量（configuration-and-tuning.md:18）。
- Planner（.../planner/overview.md）：按 TTFT/ITL SLA 伸缩 prefill、decode 副本；优化目标 throughput（默认）/latency/load/sla；吞吐法（流量预测 + 性能模型，默认 180 s）与负载法（前向指标，默认 5 s）；连接器 KubernetesConnector、VirtualConnector；前提是部署在 K8s 上（overview.md:107）。
- KVBM：G1 GPU → G2 CPU pinned → G3 磁盘 → G4 S3 兼容对象存储（docs/reference/components/kvbm-configuration.mdx:17-85），`DYN_KVBM_CPU_CACHE_GB`、`DYN_KVBM_DISK_CACHE_GB`；支持矩阵 TRT-LLM ✅、vLLM ✅、SGLang 🚧（README.md:70）。
- 功能矩阵（README.md:64-72）：P/D、KV 路由、SLA Planner、多模态、工具调用三个后端都 ✅。
- P/D 流程（concepts/system-architecture/disaggregated-serving.md:10-62）：先路由到 prefill worker，返回 `disaggregated_params`，再路由到 decode worker，decode 经 NIXL 拉取 KV（非阻塞）；SGLang 后端 prefill 作为后台任务、decode 可并行开始。
- 启动：`python3 -m dynamo.vllm --model ... --disaggregation-mode prefill|decode --kv-transfer-config '{"kv_connector":"NixlConnector","kv_role":"kv_producer|kv_consumer"}'`，每个 worker 单独 `VLLM_NIXL_SIDE_CHANNEL_PORT`（examples/backends/vllm/launch/disagg.sh）；`dynamo.sglang --model-path ... --disaggregation-mode`；安装 `uv pip install --prerelease=allow "ai-dynamo[vllm]"`（README.md:190）。
- 发现与消息：K8s 上用 CRD + EndpointSlices、TCP 请求面，不需要 etcd/NATS；本地 `--discovery-backend file`；非 K8s 多机仍推荐 etcd/NATS（README.md:286-300；docs/cli/installation/install-dynamo.mdx:74,173）。
- Operator CRD：DynamoGraphDeployment、DynamoGraphDeploymentRequest、DynamoComponentDeployment、DynamoGraphDeploymentScalingAdapter、DynamoModel 等（deploy/operator/config/crd/bases/）；Grove 负责多节点拓扑感知放置（PodCliqueSet/PodClique）。
- 1.6.1 锁定的引擎版本（pyproject.toml:56,67,80）：`vllm==0.31.0`、`sglang==0.5.21`、`tensorrt-llm==1.3.0rc29`。结论：Dynamo 跟随的引擎版本比引擎最新版（vLLM 0.32.0、SGLang 0.5.22）落后一个小版本，且 TRT-LLM 用的是预发布版。

## NIXL v1.5.1

- 点对点传输库，抽象 CPU/GPU 内存与文件、块、对象存储，插件式（nixl/README.md:6-8）；仅 Linux（README.md:32）；许可 `MIT AND Apache-2.0`（pyproject.toml:25）。
- 插件目录（src/plugins）：ucx、libfabric、mooncake、uccl、gpunetio、cuda_gds、gds_mt、posix、hf3fs、gusli、obj、azure_blob、infinia（外加 telemetry、tracing）。
- 内存类型 `DRAM_SEG, VRAM_SEG, BLK_SEG, OBJ_SEG, FILE_SEG`（src/api/cpp/nixl_types.h:41）。
- 元数据交换：agent 通过旁路通道或 etcd 等中心服务交换元数据（docs/nixl.md:31,53）。
- 引擎集成：vLLM `NixlConnector`；SGLang `--disaggregation-transfer-backend nixl`；TensorRT-LLM 1.2.1 `cache_transceiver_config.backend` 可选 DEFAULT/UCX/NIXL/MPI，默认 NIXL（trtllm/docs/source/features/disagg-serving.md:140）。

## llm-d v1.0.0 / llm-d-router v1.0.0 / GAIE v1.6.2

- llm-d：K8s 上的分布式推理栈，位于 vLLM、SGLang 之上（llm-d/README.md:18-24）；CNCF Sandbox（2026-03 加入），Red Hat、Google Cloud、IBM Research、CoreWeave、NVIDIA 发起（README.md:20,57）。
- well-lit paths（guides/README.md）：Optimized Baseline、Predicted Latency-Based Routing、Precise Prefix Cache Routing、Tiered Prefix Cache、P2P KV Cache Sharing（实验）、P/D Disaggregation、Wide Expert-Parallelism、Workload Autoscaling、Flow Control 等；另有 no-kubernetes-deployment 指南（EPP 用文件发现，guides/no-kubernetes-deployment/README.md:1-20）。
- Optimized Baseline 默认 `prefix-cache-affinity-filter` + `token-load-scorer`（guides/optimized-baseline/README.md:24-30），参考配置 Qwen3-32B、H100、TP=2；支持表含 vLLM、SGLang、TensorRT-LLM、Atom 列。
- 路由器模式：默认 Standalone（Envoy 旁车经 ext-proc 调 EPP），或 Gateway 模式 `GW_PROVIDER_NAME` 取 none/gke/agentgateway/istio（recipes/router/README.md）。
- P/D（docs/architecture/disaggregation/pd-disaggregation.md:32-57）：同一 InferencePool，路由器选两次；请求先到 decode Pod 的 routing sidecar，sidecar 以 `max_tokens=1, do_remote_decode=True` 调 prefill，拿回 KV 传输参数，再调本地 decode；默认 NixlConnector；v1.0 用 LWS 的 `DisaggregatedSet` 管理 P/D。注意与 Dynamo 顺序不同（Dynamo 先 prefill 后 decode，由 frontend 编排）。
- 分级前缀缓存（guides/tiered-prefix-cache/README.md:13-26,85）：默认 vLLM 原生 `OffloadingConnector`（`CONNECTOR=native`），可选 `lmcache-connector`、`mooncake-store`；CPU 层放在 `/dev/shm`，计入 Pod 内存上限；跨副本读同一存储需所有 Pod `PYTHONHASHSEED=0`（:230）。
- 自动扩缩：Workload Variant Autoscaler 已弃用，改用 KEDA + EPP 指标（队列深度、在途请求、KV 压力、饱和度）；理由是批处理时 GPU 利用率始终接近 100%（guides/workload-autoscaling/README.md:7-39）。
- v1.0.0 变化（发布页）：flowControl 优先级与公平、路由器热备 HA、`DisaggregatedSet`、路由配置 API `llm-d.ai/v1`、Responses API、会话亲和；llm-d-kv-cache 并入 llm-d-router；弃用自有推理镜像改用上游 vLLM/SGLang 镜像；锁定 vLLM v0.31.0、GAIE v1.6.2（仅 CRD）。
- llm-d-router：README:10 “Inference Scheduler 更名为 llm-d Router”；插件名（pkg/epp/framework/plugins/scheduling）：prefix-cache-scorer、kv-cache-utilization-scorer、queue-scorer、load-aware-scorer、token-load-scorer、active-request-scorer、session-affinity-scorer、lora-affinity-scorer、latency-scorer；过滤器 prefix-cache-affinity-filter、prefill-filter、decode-filter；`disagg-profile-handler`、`prefix-based-pd-decider`；`precise-prefix-cache-producer` 用 ZMQ 订阅 vLLM/SGLang KV 事件（pkg/kvevents/README.md）。配置 `apiVersion: llm-d.ai/v1`、`kind: EndpointPickerConfig`。
- GAIE：InferencePool `inference.networking.k8s.io/v1`（api/v1/doc.go:22，字段 selector/targetPorts/endpointPickerRef）；EPP 主体、InferenceObjective、Body-Based Router 已迁出到 llm-d 仓库，GAIE 保留 InferencePool API、轻量 EPP、协议与一致性测试；一致性页面列出 Istio、Agentgateway、NGINX Gateway Fabric。模型服务器协议指标：`vllm:num_requests_waiting`、`vllm:num_requests_running`、`vllm:kv_cache_usage_perc`；SGLang `sglang:num_queue_reqs`、`sglang:token_usage`（docs/proposals/003-model-server-protocol/README.md:30-34）。

## vLLM production-stack（vllm-stack-0.1.13）

- 自述为 vLLM 生产部署的参考栈（README.md:1,23）；安装 `helm repo add vllm https://vllm-project.github.io/production-stack` + `helm install vllm vllm/vllm-stack -f ...`（README.md:73-74）。
- 路由 `--routing-logic`：roundrobin、session、kvaware、loadaware、prefixaware、disaggregated_prefill、disaggregated_prefill_orchestrated、priority（src/vllm_router/parsers/parser.py:229-241）；Helm values 枚举不含 loadaware、priority（helm/values.yaml:549-550），默认 roundrobin；`--session-key` 指定会话头；`--service-discovery` static/k8s/external-only。
- `kvaware` 通过 LMCache controller 查询 KV 位置（routing_logic.py:36,284）。
- values：`servingEngineSpec.modelSpec[]` 的 `replicaCount`、`lmcacheConfig.enabled`、`cpuOffloadingBufferSize`、`keda.enabled/minReplicaCount/maxReplicaCount`（需另装 KEDA，支持缩到 0）（values.yaml:25-257）；路由器 HPA 按 CPU，默认关闭（:504）。
- P/D：`enablePD`、`nixlRole`，引擎侧 `LMCacheConnectorV1`（helm/templates/deployment-vllm-multi.yaml:114,208-214,297-314）。
- 可观测：helm/dashboards 下 vllm、模型指标、lmcache 三个 Grafana 面板。另有 Go operator（VLLMRuntime、VLLMRouter、CacheServer、LoraAdapter CRD）。
- 结论：0.1.x、默认 latest 镜像标签，适合作为参考与起点，生产需固定镜像摘要。

## AIBrix v0.8.0

- 存在，vllm-project 组织下；自述为生产 LLM 推理的 K8s 控制面，引擎可选 vLLM、SGLang、TensorRT-LLM（aibrix/README.md:18,24-34）；白皮书 arXiv 2504.03648；字节跳动背景依据 README 演讲列表（:113-114），README 未直接写“由字节开源”。
- 组件：网关路由（Envoy Gateway 插件）、LoRA 高密度部署、ModelClaim/ModelWarmup（0.8 新增，实验）、PodAutoscaler（HPA/KPA/APA，api/autoscaling/v1alpha1/podautoscaler_types.go:108-110）、StormService（多节点、多角色含 P/D）、RayClusterFleet、分布式 KV 缓存（L1 引擎内 DRAM、L2 InfiniStore/HPKV/PrisKV，docs/source/features/scaling-performance/kvcache-offloading.rst:31-72）、异构 GPU（实验）。
- 路由策略名（pkg/plugins/gateway/algorithms）：random、least-request、least-kv-cache、least-latency、throughput、prefix-cache、prefix-cache-preble、session-affinity、pd、slo 系列、vtc-basic 等；请求头 `routing-strategy` 或环境变量 `ROUTING_ALGORITHM` 选择（gateway-plugins.rst）。
- 安装：三个 `kubectl apply`（dependency、core-crds、core 的 v0.8.0 清单）（README.md:46-60）。
- 未核实：独立的“故障检测”组件在 0.8.0 中未找到。

## Mooncake v0.3.13.post1

- 组件：Transfer Engine、Mooncake Store、Mooncake EP & PG（mooncake/README.md:89,136-149）；P2P Store 为演示，生产版为 checkpoint-engine（:59,73）。
- Transfer Engine 传输目录含 rdma、tcp、nvlink、cxl、nvmeof、efa、ascend 等（mooncake-transfer-engine/src/transport/）；未逐个核实成熟度。
- pip 包 `mooncake-transfer-engine`，含 `mooncake_master` 命令（mooncake-wheel/pyproject.toml:25,48-49）；master 参数 `--rpc_port`（旧 `--port` 默认 50051 已弃用）、`--enable_ha`、`--metrics_port` 9003、`--eviction_high_watermark_ratio`（mooncake-store/src/master.cpp:118-187）。
- 集成：vLLM `MooncakeConnector`、`MooncakeStoreConnector`（vllm factory.py:226,231）；SGLang `--disaggregation-transfer-backend` 默认 `mooncake`（choices.py:122-129，disagg.py:65-71），HiCache 存储后端含 mooncake（memory.py:145-163）；NIXL 有 mooncake 插件；LMCache 有 mooncakestore 远端连接器；llm-d 分级缓存可选 `mooncake-store`。

## LMCache v0.5.6

- 配置：`LMCACHE_` 前缀环境变量或 `LMCACHE_CONFIG_FILE` YAML（lmcache/v1/config_base.py:224,264,491）。
- 默认值（lmcache/v1/config.py）：`chunk_size` 256（:90）、`local_cpu` True（:91）、`max_local_cpu_size` 5.0 GB（:96）、`max_local_disk_size` 0.0（:113）、`enable_blending`（:137）、`enable_p2p`（:166）、`enable_pd`（:232，与 p2p 互斥 :761）。
- 远端连接器：redis、valkey、mooncakestore、infinistore、s3、fs、hf3fs、lm 等（v1/storage_backend/connector/）。
- vLLM：`--kv-transfer-config '{"kv_connector":"LMCacheConnectorV1","kv_role":"kv_both"}'`（examples/frontend/README.md:12；vllm factory.py:166）。SGLang：`--enable-lmcache` + `--lmcache-config-file`（sglang memory.py:237-240），不是 HiCache 存储后端。
- v0.5.6 发布说明：安全加固（MP 设备 IPC 移除 pickle，CVE-2026-105192 / GHSA-w5f2-9q9c-ff4h；`/run_script` 默认关闭；管理 HTTP 只绑 localhost），MP 服务器 ARC 淘汰等。

## vLLM v0.32.0 KV 连接器

- factory.py:154-248 注册：ExampleConnector、LMCacheConnectorV1、LMCacheMPConnector、NixlConnector（及 Pull/Push 变体）、MultiConnector、OffloadingConnector、MooncakeConnector、MooncakeStoreConnector、FlexKVConnectorV1、SimpleCPUOffloadConnector、HF3FSKVConnector、MoRIIOConnector 等。
- `kv_role` 取 kv_producer / kv_consumer / kv_both（vllm/config/kv_transfer.py:11-13,71）。

## 与推理系列现有说法的对照

- 第 17 篇“SGLang 传输后端默认使用 Mooncake，也支持 NIXL”：与 v0.5.22 一致。
- 第 17 篇“vLLM 连接器有基于 NIXL、LMCache、Mooncake 的”：一致。
- 第 21 篇把 Dynamo 与 KServe、Ray Serve 并列为“编排方案”：口径可接受；Dynamo 1.6 起 K8s 上不再需要 etcd/NATS，旧资料常写“依赖 etcd + NATS”，需以新版为准。
- 资料常见的旧名称：llm-d-inference-scheduler（现 llm-d-router）、llm-d-kv-cache-manager（并入 llm-d-router）、Workload Variant Autoscaler（已弃用）、GAIE 的 InferenceModel（迁出 GAIE）。

## 教学数值

- orch-kv-routing 图：50 块请求、三个副本命中/活跃块数为教学示例，公式按 Dynamo 默认（重叠抵扣 1.0、prefill 权重 1.0，无其他活跃 prefill）。
