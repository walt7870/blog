// Figures for docs/ai/inference-engines/03-tensorrt-llm.md (TensorRT-LLM 1.2.1).
// Run: node .maintenance/inference-engines/diagrams-trtllm.mjs
import { svg, box, edge, text, label, write } from './svg-kit.mjs';

// ---- trtllm-architecture --------------------------------------------------------
// trtllm-serve main process -> ZMQ IPC -> one MPI worker per rank running the PyExecutor loop.
function architecture() {
  const W = 1400, H = 760;
  let body = '';
  body += box('client', 32, 128, 200, 150, 'node', '客户端', ['资料助手后端', 'POST /v1/chat/', 'completions'], '调用方');
  body += edge('M234 203H270');
  body += box('main', 272, 112, 320, 300, 'blue', 'trtllm-serve 主进程', [
    'FastAPI：OpenAI 兼容接口',
    '/health、/metrics、/v1/models',
    '对话模板、分词与反分词',
    '推理解析、工具调用解析',
    'LLM 对象',
    'GenerationExecutorProxy',
  ], '进程 1 · 默认监听 localhost:8000');

  // worker region
  const rx = 668, ry = 104, rw = 712, rh = 520;
  body += `<g data-node="region"><rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="10" class="gray"/>`;
  body += `<text x="${rx + 20}" y="${ry + 28}" class="k">每个 GPU rank 一个 MPI 工作进程（TP=2 就有两个，循环逐步同步）</text>`;
  body += `<text x="${rx + 20}" y="${ry + 58}" class="t">GenerationExecutorWorker 里的 PyExecutor 循环</text></g>`;
  body += edge(`M594 236H${rx - 4}`);
  body += text(604, 222, 'ZMQ IPC', 'xs');

  const cw = 220, ch = 150, gx = 12;
  const cx = [rx + 20, rx + 20 + cw + gx, rx + 20 + 2 * (cw + gx)];
  const r1 = ry + 84, r2 = ry + 300;
  const cells = [
    ['s1', cx[0], r1, 'node', '① 取请求', ['从请求队列取新请求', '多卡时广播到各 rank']],
    ['s2', cx[1], r1, 'violet', '② Scheduler', ['预算 max_batch_size', '与 max_num_tokens', '生成阶段优先排入']],
    ['s3', cx[2], r1, 'green', '③ KVCacheManager', ['分页块，每块 32 token', '基数树复用相同前缀', '可下沉到主机内存']],
    ['s4', cx[2], r2, 'amber', '④ ModelEngine', ['PyTorch 模型代码', 'TRTLLM 注意力内核', 'CUDA Graph 回放']],
    ['s5', cx[1], r2, 'node', '⑤ Sampler', ['TorchSampler 采样', '停止条件、logprobs']],
    ['s6', cx[0], r2, 'node', '⑥ 交回结果', ['经 IPC 回到主进程', '流式推给客户端']],
  ];
  cells.forEach(([id, x, y, cls, t, lines]) => { body += box(id, x, y, cw, ch, cls, t, lines); });
  body += edge(`M${cx[0] + cw + 2} ${r1 + 75}H${cx[1] - 4}`);
  body += edge(`M${cx[1] + cw + 2} ${r1 + 75}H${cx[2] - 4}`);
  body += edge(`M${cx[2] + cw / 2} ${r1 + ch + 2}V${r2 - 4}`);
  body += edge(`M${cx[2] - 2} ${r2 + 75}H${cx[1] + cw + 4}`);
  body += edge(`M${cx[1] - 2} ${r2 + 75}H${cx[0] + cw + 4}`);
  body += edge(`M${cx[0] + cw / 2} ${r2 - 2}V${r1 + ch + 4}`, 'dash');
  body += text(cx[0] + cw / 2 + 10, r1 + ch + 40, '下一轮', 'xs');
  // return path to main process
  body += edge(`M${cx[0] - 2} ${r2 + 110}H630V${412 - 30}H596`, 'dash');

  body += text(rx + 20, ry + rh - 22, '② ③ 的核心算法在 C++ batch_manager 中实现，经 Python 绑定调用；其余逻辑是 Python 与 PyTorch。', 'xs');

  // overlap note
  body += box('overlap', 32, 448, 560, 176, 'red', '重叠调度（默认开启）', [
    'GPU 执行第 n+1 步的前向时，CPU 处理第 n 步的',
    '采样结果：检查停止条件、更新输出、准备下一批。',
    '代价是多跑一步；两模型投机解码会自动关闭它。',
  ], '和 ①—⑥ 并行发生的事');

  body += text(32, 668, '多机时由 mpirun / Slurm（trtllm-llmapi-launch）拉起各 rank；1.2 起也可设 orchestrator_type: ray（原型）。', 's');
  body += text(32, 698, '图中模块名与 1.2.1 源码一致：tensorrt_llm/executor/proxy.py、worker.py，tensorrt_llm/_torch/pyexecutor/。', 'xs');

  return svg('trtllm-architecture', W, H,
    'TensorRT-LLM 1.2.1 默认 PyTorch 后端的进程与模块关系',
    'trtllm-serve 主进程负责 OpenAI 兼容接口、对话模板与分词，并持有 LLM 对象和 GenerationExecutorProxy；它通过 ZMQ IPC 把请求交给每个 GPU rank 上的 MPI 工作进程。工作进程里的 PyExecutor 循环依次取请求、由 Scheduler 按 max_batch_size 与 max_num_tokens 选批、由 KVCacheManager 分配分页块并复用前缀、由 ModelEngine 执行前向、由 Sampler 采样，然后把结果交回主进程。重叠调度让 CPU 处理上一步结果的同时 GPU 已经开始下一步。',
    'TensorRT-LLM 1.2.1：一个请求经过哪些进程和模块',
    '默认 PyTorch 后端。左边是 HTTP 服务进程，右边是每张卡上的执行循环。',
    body);
}

// ---- trtllm-workflow ------------------------------------------------------------
// Old engine-build workflow vs. the PyTorch default, plus the release timeline.
function workflow() {
  const W = 1380, H = 800;
  let body = '';
  const bw = 236, gap = 30, x0 = 32;
  const xs = [0, 1, 2, 3, 4].map(i => x0 + i * (bw + gap));
  body += text(32, 116, '旧流程：TensorRT 引擎（0.x 的主线；1.2.1 仍可用，1.3.0rc21 起已删除）', 'k');
  const old = [
    ['HF 检查点', ['config.json', '+ safetensors'], 'node'],
    ['convert_checkpoint.py', ['每个模型一份脚本', '转成 TRT-LLM 检查点'], 'node'],
    ['trtllm-build', ['编译 TensorRT 引擎', '常需几分钟到更久'], 'amber'],
    ['引擎文件', ['绑定 GPU 架构、TP/PP', 'max_batch_size 等上限'], 'red'],
    ['C++ Executor 运行', ['改上限要重新构建', '换卡型要重新构建'], 'node'],
  ];
  old.forEach(([t, lines, cls], i) => {
    body += box(`old-${i}`, xs[i], 132, bw, 132, cls, t, lines);
    if (i < 4) body += edge(`M${xs[i] + bw + 2} 198H${xs[i + 1] - 4}`);
  });

  body += text(32, 318, '现流程：PyTorch 后端（1.0 起默认，预发布版中是唯一后端）', 'k');
  const now = [
    ['HF 或 ModelOpt 检查点', ['原始 BF16 权重', '或 FP8 / NVFP4 预量化'], 'node'],
    ['LLM(model=…)', ['或 trtllm-serve <模型>', '参数写进 YAML'], 'blue'],
    ['加载与预热', ['加载权重，试跑测峰值', '自动调优 GEMM 内核'], 'blue'],
    ['分配 KV 与录图', ['剩余显存 × 0.9 给 KV', '按批大小录 CUDA Graph'], 'green'],
    ['PyExecutor 服务', ['改参数只需重启', '无需编译步骤'], 'green'],
  ];
  now.forEach(([t, lines, cls], i) => {
    body += box(`new-${i}`, xs[i], 334, bw, 132, cls, t, lines);
    if (i < 4) body += edge(`M${xs[i] + bw + 2} 400H${xs[i + 1] - 4}`);
  });

  // timeline
  const ty = 600, tx0 = 60, tx1 = W - 60;
  body += text(32, 530, '版本时间线（GitHub 发布日期）', 'k');
  body += `<path d="M${tx0} ${ty}H${tx1}" class="axis"/>`;
  const marks = [
    [0.00, '2023-10', '0.5.0 首个版本', 'TensorRT 引擎流程'],
    [0.30, '2025-09', '1.0', 'PyTorch 成为默认'],
    [0.52, '2026-04', '1.2.1', '最新正式版'],
    [0.70, '2026-06', '1.3.0rc20', '最后带 TRT 后端'],
    [0.84, '2026-07', '1.3.0rc21', '删除 TRT 后端'],
    [1.00, '2026-10', '1.4.0rc1', '最新预发布'],
  ];
  marks.forEach(([f, d, v, note], i) => {
    const x = tx0 + f * (tx1 - tx0);
    const anchor = f === 0 ? 'start' : f === 1 ? 'end' : 'middle';
    const up = i % 2 === 0;
    body += `<circle cx="${x}" cy="${ty}" r="7" class="${i === 2 ? 'fgreen' : i >= 4 ? 'fred' : 'fblue'}"/>`;
    if (up) {
      body += text(x, ty - 46, v, 't', anchor);
      body += text(x, ty - 20, note, 's', anchor);
    } else {
      body += text(x, ty + 36, v, 't', anchor);
      body += text(x, ty + 62, note, 's', anchor);
    }
    body += text(x, up ? ty + 36 : ty - 20, d, 'xs', anchor);
  });
  body += text(32, 742, '1.3.0 没有正式版：1.3 系列停在 rc29，随后版本号进入 1.4.0 预发布。', 's');
  body += text(32, 770, '生产环境按正式版 1.2.1 规划；需要预发布版的新模型或新特性时，单独验证并固定镜像。', 's');

  return svg('trtllm-workflow', W, H,
    'TensorRT-LLM 从引擎构建流程到 PyTorch 后端的变化与版本时间线',
    '上方是旧的 TensorRT 引擎流程：HF 检查点经 convert_checkpoint.py 转换、trtllm-build 编译成绑定 GPU 与上限参数的引擎，再由 C++ Executor 运行。中间是 1.0 起默认的 PyTorch 流程：直接加载 HF 或 ModelOpt 量化检查点，预热、按剩余显存分配 KV、录制 CUDA Graph 后服务。下方时间线：2023-10 发布 0.5.0，2025-09 的 1.0 把 PyTorch 设为默认，2026-04 的 1.2.1 是最新正式版，2026-06 的 1.3.0rc20 是最后带 TensorRT 后端的预发布版，2026-07 的 1.3.0rc21 删除了它，2026-10 的最新预发布是 1.4.0rc1。',
    '两条流程：先编译引擎，还是直接加载 PyTorch 模型',
    '名字里的 TensorRT 来自旧流程；当前默认路径不再生成 TensorRT 引擎。',
    body);
}

// ---- trtllm-disagg --------------------------------------------------------------
// trtllm-serve disaggregated orchestration: context-only then generation-only, KV pulled via NIXL/UCX.
function disagg() {
  const W = 1400, H = 800;
  let body = '';
  body += box('client', 32, 236, 200, 130, 'node', '客户端', ['OpenAI 兼容请求', '发到 :8000'], '①');
  body += edge('M234 300H288');
  body += box('orch', 290, 150, 330, 272, 'blue', 'trtllm-serve disaggregated', [
    '读 disagg_config.yaml',
    '不加载模型，只做编排',
    '先发 context-only 请求',
    '拿到 ctx_params 后',
    '再发 generation-only 请求',
  ], '编排服务 :8000');

  body += box('ctx0', 760, 112, 300, 150, 'amber', 'context 服务 :8001', ['GPU 0，只做 Prefill', '返回首 token 与 ctx_params'], '② ③');
  body += box('ctx1', 760, 284, 300, 110, 'amber', 'context 服务 :8002', ['GPU 1，同上，可多实例']);
  body += box('gen', 760, 440, 300, 170, 'green', 'generation 服务 :8003', ['GPU 2，只做 Decode', '凭 ctx_params 找到', '对应 context 实例取 KV'], '④ ⑤ ⑥');

  body += edge('M622 200H756');
  body += text(634, 190, '② context-only', 'xs');
  body += edge('M758 245H626', 'dash');
  body += text(634, 270, '③ ctx_params', 'xs');
  body += edge('M560 424V525H756');
  body += text(574, 514, '④ generation-only', 'xs');

  body += box('kv', 1100, 290, 270, 150, 'violet', '⑤ KV 块传输', ['cache_transceiver_config', 'NIXL（默认）或 UCX', 'GPU 显存直接读写'], 'RDMA / NVLink');
  body += edge('M1062 160H1235V286');
  body += edge('M1235 442V525H1064');

  body += edge('M758 590H420V426', 'dash');
  body += edge('M288 350H236', 'dash');
  body += text(432, 580, '⑥ 生成的 token 经编排服务流式返回', 'xs');

  body += box('dynamo', 1100, 570, 270, 170, 'gray', '换成 Dynamo 时', ['dynamo.frontend 接请求', 'KV 感知路由', 'dynamo.trtllm 当工作进程'], '另一种编排');

  body += text(32, 770, '两类服务用同一个模型，各自的 YAML 可以设不同的并行方式和批大小；官方示例给 context 服务设 disable_overlap_scheduler: true。', 's');

  return svg('trtllm-disagg', W, H,
    'TensorRT-LLM 用 trtllm-serve 做 P/D 分离时的请求流',
    '客户端请求先到 trtllm-serve disaggregated 编排服务；编排服务把请求标记为 context-only 发给某个 context 服务，后者完成 Prefill 后返回首个 token 与 ctx_params；编排服务再把请求标记为 generation-only 发给 generation 服务，generation 服务凭 ctx_params 通过 NIXL 或 UCX 直接从 context 服务的显存拉取 KV 块，然后逐 token 生成并经编排服务流式返回。右上角说明也可以用 Dynamo 的前端、KV 感知路由和 dynamo.trtllm 工作进程替代编排服务。',
    'P/D 分离：trtllm-serve 怎样把一个请求拆给两类实例',
    '本例 2 个 context 实例、1 个 generation 实例，与官方文档示例一致。',
    body);
}

write({
  'trtllm-architecture': architecture(),
  'trtllm-workflow': workflow(),
  'trtllm-disagg': disagg(),
});
