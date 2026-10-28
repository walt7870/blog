// Figures for docs/ai/inference-engines/01-vllm.md. Run: node .maintenance/inference-engines/diagrams-vllm.mjs
import { svg, box, edge, text, label, write } from './svg-kit.mjs';

// ---- vllm-architecture ---------------------------------------------------------
// Process layout of `vllm serve Qwen/Qwen3-8B -tp 2` on vLLM 0.32.0 (V1 engine).
const architecture = svg('vllm-architecture', 960, 850,
  'vLLM V1 的进程结构',
  '以两卡张量并行为例：客户端经 HTTP 访问 API 服务进程；API 服务进程负责对话模板、分词、反分词和流式返回，经 ZMQ 与 EngineCore 进程交换请求和输出；EngineCore 运行调度器、KV 缓存管理器和执行器，把每一步的调度结果经共享内存队列广播给两个 Worker 进程；每个 Worker 管一张 GPU，运行 GPUModelRunner，两张卡之间用 NCCL 通信。数据并行时另有 DP 协调进程，P/D 分离或 KV 卸载时 Worker 通过 KV 连接器与外部交换 KV。',
  '一个 vllm serve 背后的进程',
  '以 vllm serve Qwen/Qwen3-8B -tp 2 为例：1 个 API 服务进程 + 1 个 EngineCore + 2 个 Worker，共 4 个进程。',
  [
    box('client', 32, 112, 200, 160, 'node', '客户端', ['OpenAI SDK', 'curl、网关']),
    box('api', 272, 112, 656, 160, 'blue', 'FastAPI + AsyncLLM', [
      '请求侧：对话模板、分词、多模态预处理、参数校验',
      '输出侧：增量反分词、停止字符串、SSE 流式推送',
    ], 'API 服务进程 · 默认 1 个，数据并行时等于 DP 数'),
    edge('M232 192H272'),
    text(236, 182, 'HTTP', 'xs'),

    box('core', 272, 320, 656, 220, 'green', '忙循环：schedule → execute → update', [], 'EngineCore 进程 · 每个 DP rank 一个'),
    box('sched', 292, 392, 196, 128, 'node', 'Scheduler', ['统一 token 预算', '先排运行中请求', '抢占后重算']),
    box('kvm', 504, 392, 196, 128, 'node', 'KVCacheManager', ['16 token 一块', '哈希链前缀缓存', 'LRU 回收']),
    box('exec', 716, 392, 192, 128, 'node', 'Executor', ['mp：共享内存广播', 'ray：多机可选']),
    edge('M520 272V320'),
    edge('M760 320V272'),
    label(530, 302, 'EngineCoreRequest', 150),
    label(770, 302, 'EngineCoreOutputs', 150),

    box('dp', 32, 320, 200, 220, 'gray', 'DP 协调进程', ['仅 DP>1 时存在', '汇总各 rank 负载', 'MoE 时对齐前向'], '可选'),
    edge('M232 430H272', 'dash'),

    edge('M812 540V575H428V630'),
    edge('M772 575V630'),
    label(452, 612, '共享内存广播调度结果', 160),

    box('w0', 272, 630, 312, 170, 'amber', 'GPUModelRunner', ['MRV2：准备输入、采样', 'torch.compile + CUDA Graph', '注意力后端读写 KV 块'], 'Worker 进程 · GPU 0'),
    box('w1', 616, 630, 312, 170, 'amber', 'GPUModelRunner', ['持有另一半权重分片', '同样的步骤同步执行', '结果由 rank 0 汇报'], 'Worker 进程 · GPU 1'),
    edge('M584 715H616', 'dash'),
    text(272, 830, 'GPU 0 与 GPU 1 属于同一个 TP 组，每层经 NCCL all-reduce 同步；ZMQ 消息用 msgpack 序列化。', 'xs'),

    box('kvc', 32, 630, 200, 170, 'violet', 'KV 连接器', ['NIXL、Mooncake', 'LMCache、CPU 卸载', 'P/D 时与其他实例', '交换 KV 块']),
    edge('M272 715H232', 'dash'),
  ].join('\n'));

// ---- vllm-request-lifecycle ----------------------------------------------------
const lifecycle = svg('vllm-request-lifecycle', 960, 690,
  'vLLM 中一个请求的生命周期',
  '资料助手的一次提问共 2,100 个 token，其中 2,000 个是与之前请求相同的前缀。第一步在 API 服务进程里套对话模板并分词；第二步经 ZMQ 进入 EngineCore 的等待队列；第三步调度器查前缀缓存命中 2,000 个 token，为剩余部分分配块并排进本步；第四、五步在 Worker 上做前向计算和采样；第六步 EngineCore 检查结束符和长度，没结束就在下一步回到第三步；第七步 API 服务进程增量反分词、检查停止字符串并流式推送，命中停止字符串时向 EngineCore 发 abort。',
  '一个请求在三个进程之间怎样推进',
  '资料助手的一次提问：输入 2,100 个 token，其中 2,000 个和之前的请求共享前缀。',
  [
    box('lane-api', 32, 104, 896, 150, 'gray', '', [], 'API 服务进程'),
    box('lane-core', 32, 270, 896, 170, 'gray', '', [], 'EngineCore 进程'),
    box('lane-worker', 32, 456, 896, 150, 'gray', '', [], 'Worker 进程（GPU）'),

    box('s1', 170, 124, 170, 100, 'blue', '① 渲染、分词', ['套对话模板', '得到 2,100 token']),
    box('s2', 360, 320, 170, 100, 'green', '② 进入队列', ['状态 WAITING', 'FCFS 先来先服务']),
    box('s3', 550, 320, 170, 100, 'green', '③ 调度本步', ['命中前缀 2,000', '分配块、排 100']),
    box('s4', 550, 476, 170, 100, 'amber', '④ 前向计算', ['准备输入张量', 'CUDA Graph 重放']),
    box('s5', 740, 476, 170, 100, 'amber', '⑤ 采样', ['语法掩码、采样', '得到 1 个 token']),
    box('s6', 740, 320, 170, 100, 'green', '⑥ 更新状态', ['检查 EOS、长度', '已结束则释放块']),
    box('s7', 740, 124, 170, 100, 'blue', '⑦ 反分词推送', ['增量反分词', '停止字符串、SSE']),

    edge('M340 174H400V320'),
    label(348, 164, 'ZMQ', 44),
    edge('M530 370H550'),
    edge('M635 420V476'),
    edge('M720 526H740'),
    edge('M825 476V420'),
    edge('M840 320V224'),
    edge('M885 224V320', 'dash'),
    text(420, 214, '命中停止字符串时，⑦ 经 ZMQ 向 ⑥ 发 abort', 'xs'),
    edge('M760 320V292H650V320', 'dash'),
    label(440, 300, '未结束：下一步回到 ③', 168),

    text(32, 640, '③→⑥ 每个引擎步重复一次：第一步算完剩余的 100 个输入 token 并产出首个 token，之后每步追加 1 个。', 's'),
    text(32, 666, '请求结束后块引用计数归零，满块连同哈希留在前缀缓存里，直到显存紧张时按 LRU 被回收。', 's'),
  ].join('\n'));

write({ 'vllm-architecture': architecture, 'vllm-request-lifecycle': lifecycle });
