// Figures for docs/ai/inference-engines/05-llama-cpp.md and 06-ollama.md.
// Run: node .maintenance/inference-engines/diagrams-local.mjs
import { svg, box, cell, edge, text, label, write } from './svg-kit.mjs';

// llama.cpp: from Hugging Face weights to a running server, and the layers inside one process.
function stack() {
  const W = 1340, H = 640;
  let b = '';
  // Top row: conversion pipeline
  const y = 112, h = 132, w = 230, gap = 36, x0 = 32;
  const xs = [0, 1, 2, 3, 4].map(i => x0 + i * (w + gap));
  const steps = [
    ['原始权重', 'safetensors', ['Hugging Face 仓库', 'config + tokenizer'], 'node'],
    ['转换', 'HF → GGUF', ['convert_hf_to_gguf.py', '通常输出 BF16/F16'], 'blue'],
    ['校准（可选）', 'llama-imatrix', ['用一段文本统计', '每列权重的重要性'], 'violet'],
    ['量化', 'llama-quantize', ['BF16 → Q4_K_M 等', 'IQ1/IQ2 必须 imatrix'], 'amber'],
    ['运行', 'llama-server / cli', ['加载 GGUF', '按 -ngl 放到设备'], 'green'],
  ];
  steps.forEach(([k, t, lines, cls], i) => {
    b += box(`step-${i}`, xs[i], y, w, h, cls, t, lines, k);
    if (i < 4) b += edge(`M${xs[i] + w + 2} ${y + h / 2}H${xs[i + 1] - 4}`);
  });
  b += edge(`M${xs[1] + w / 2} ${y + h + 2}C${xs[1] + w / 2} ${y + h + 40} ${xs[3] + 40} ${y + h + 40} ${xs[3] + 40} ${y + h + 4}`, 'dash');
  b += label(xs[2] - 10, y + h + 38, '不需要 IQ 低位类型时可跳过校准', 250);

  // Bottom: one process, layered
  const py = 320, px = 32, pw = 1276;
  b += `<rect x="${px}" y="${py}" width="${pw}" height="296" rx="10" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6 6"/>`;
  b += text(px + 18, py + 28, '一个 llama-server 进程的内部分层', 'k');
  b += box('tools', px + 18, py + 44, 400, 100, 'green', '工具层（tools/）', ['HTTP 接口、槽位调度、对话模板', '采样、语法约束、投机解码']);
  b += box('libllama', px + 438, py + 44, 400, 100, 'blue', 'libllama（src/）', ['读 GGUF、分词、按架构建计算图', 'KV Cache、批次拆分、上下文']);
  b += box('ggml', px + 858, py + 44, 400, 100, 'violet', 'ggml', ['张量与计算图、量化格式', '后端调度器把节点分给设备']);
  b += edge(`M${px + 420} ${py + 94}H${px + 434}`);
  b += edge(`M${px + 840} ${py + 94}H${px + 854}`);
  const backs = [['CPU', 'NEON / AVX / AMX'], ['Metal', 'Apple GPU'], ['CUDA / HIP', 'NVIDIA / AMD'], ['Vulkan', '跨厂商 GPU'], ['SYCL / CANN', 'Intel / 昇腾'], ['RPC', '远端机器上的后端']];
  const bw = 196, bg = 16;
  backs.forEach(([t, s], i) => {
    const bx = px + 18 + i * (bw + bg);
    b += box(`be-${i}`, bx, py + 186, bw, 88, i === 5 ? 'gray' : 'node', t, [s]);
  });
  // ggml fans out to every backend: one bus line, one arrow per backend.
  b += `<path d="M${px + 1058} ${py + 146}V${py + 166}M${px + 116} ${py + 166}H${px + 116 + 5 * (bw + bg)}" fill="none" stroke="#64748b" stroke-width="2"/>`;
  backs.forEach((_, i) => { b += edge(`M${px + 116 + i * (bw + bg)} ${py + 166}V${py + 182}`); });
  return svg('llamacpp-stack', W, H,
    'llama.cpp 从原始权重到运行服务的流程与进程内分层',
    '上排：safetensors 权重经 convert_hf_to_gguf.py 转成 GGUF，可选用 llama-imatrix 校准，再由 llama-quantize 量化，最后由 llama-server 或 llama-cli 加载。下排：一个服务进程内由工具层、libllama、ggml 三层组成，ggml 的后端调度器把计算分给 CPU、Metal、CUDA、Vulkan、SYCL 或 RPC 后端。',
    'llama.cpp：一条模型流水线，三层代码',
    '上排是模型文件怎样准备出来；下排是加载之后，一次推理在进程里经过的层次',
    b);
}

// GGUF on-disk layout.
function gguf() {
  const W = 1340, H = 430;
  let b = '';
  const y = 120, h = 150;
  const parts = [
    [32, 190, 'gray', '文件头', ['magic "GGUF"', '版本 3', '张量数、KV 数']],
    [238, 360, 'blue', '元数据 KV', ['general.architecture', 'qwen3.block_count = 28', 'tokenizer.chat_template …']],
    [614, 300, 'violet', '张量信息表', ['名字、维度、类型', '数据区内的偏移', 'blk.0.attn_q.weight q4_K']],
    [930, 378, 'green', '张量数据（按对齐存放）', ['可以直接 mmap 进内存', '每个张量各有量化类型', '同一文件里 q4_K、q6_K、f32 并存']],
  ];
  parts.forEach(([x, w, cls, t, lines], i) => { b += box(`part-${i}`, x, y, w, h, cls, t, lines); });
  b += text(32, 318, '读法：', 't');
  b += text(98, 318, '加载器先读前三段（几 MB），就知道架构、超参数、分词器和每个张量在哪；数据区按偏移映射，不必整个读入。', 's');
  b += text(98, 348, '实测 Qwen3-0.6B Q4_K_M：28 个元数据键、310 个张量（f32 113、q4_K 168、q6_K 29），词表嵌入 121.7 MiB 用 q6_K。', 's');
  b += text(98, 378, '同一个模型换量化，只是张量数据和 general.file_type 变了；对话模板等元数据跟着文件走。', 's');
  return svg('llamacpp-gguf', W, H,
    'GGUF 文件的四段结构',
    'GGUF 文件依次是文件头、元数据键值对、张量信息表和按对齐存放的张量数据。加载器读完前三段就知道模型架构和张量位置，数据区可以直接内存映射。',
    'GGUF：一个文件装下模型需要的一切',
    '权重、超参数、分词器和对话模板都在同一个文件里，换机器不用再找配置',
    b);
}

// llama-server slots and the shared KV pool.
function slots() {
  const W = 1340, H = 600;
  let b = '';
  b += box('clients', 32, 120, 220, 170, 'node', '客户端请求', ['/v1/chat/completions', '/v1/embeddings', '多个用户同时发'], 'HTTP');
  b += box('queue', 300, 120, 220, 170, 'amber', '任务队列', ['有空槽：立刻分配', '无空槽：排队等待', '前缀相似的优先同槽'], '服务端');
  b += edge('M254 205H296');
  b += edge('M522 205H562');
  // slots
  const sx = 566, sy = 108, sw = 250, sh = 44;
  const slotTxt = [['槽 0', '生成中', 'fgreen'], ['槽 1', '处理 Prompt', 'fblue'], ['槽 2', '生成中', 'fgreen'], ['槽 3', '空闲', 'fgray']];
  b += text(sx, sy - 8, '-np 个槽位（默认 auto = 4）', 'k');
  slotTxt.forEach(([n, s, cls], i) => {
    b += cell(sx, sy + i * (sh + 10), sw, sh, cls, `${n}  ${s}`, 's');
  });
  b += edge(`M${sx + sw + 4} 205H${sx + sw + 44}`);
  b += box('batch', 864, 120, 200, 170, 'violet', '拼一个批次', ['所有活跃槽', '这一步的 token', '一起送进模型'], '每一步');
  b += edge('M1066 205H1104');
  b += box('decode', 1108, 120, 200, 170, 'blue', 'llama_decode', ['一次前向', '各槽各自采样', '新 token 回到槽'], 'libllama');
  b += edge('M1208 292V320H691V316', 'dash');
  b += label(800, 344, '下一步：结束的槽释放，新请求补进来（连续批处理）', 420);

  // KV pool comparison
  const ky = 380;
  b += box('unified', 32, ky, 620, 190, 'green', '不写 -np：统一 KV 池（kv_unified = true）', [], '-c 16384');
  const cw = 584 / 16;
  const fill1 = ['fgreen', 'fgreen', 'fgreen', 'fgreen', 'fgreen', 'fblue', 'fblue', 'fblue', 'fgreen', 'fgreen', 'fgreen', 'fgray', 'fgray', 'fgray', 'fgray', 'fgray'];
  fill1.forEach((c, i) => { b += cell(50 + i * cw, ky + 62, cw - 3, 34, c); });
  b += text(50, ky + 126, '16384 个单元由 4 个槽共用，哪个槽长就多占。', 's');
  b += text(50, ky + 152, '单个请求最长可以用到 16384；总量仍是 16384。', 's');
  b += box('split', 688, ky, 620, 190, 'amber', '写了 -np 4：平均切分（kv_unified = false）', [], '-c 16384 -np 4');
  const fill2 = ['fgreen', 'fgreen', 'fgray', 'fgray', 'fblue', 'fblue', 'fblue', 'fgray', 'fgreen', 'fgreen', 'fgreen', 'fgreen', 'fgray', 'fgray', 'fgray', 'fgray'];
  fill2.forEach((c, i) => { b += cell(706 + i * cw + Math.floor(i / 4) * 0, ky + 62, cw - 3, 34, c); });
  [1, 2, 3].forEach(k => { b += `<rect x="${706 + k * 4 * cw - 3}" y="${ky + 56}" width="3" height="46" fill="#172b3a"/>`; });
  b += text(706, ky + 126, '每个槽固定 4096，超过就要截断或报错，', 's');
  b += text(706, ky + 152, '即使别的槽空着也借不到。', 's');
  return svg('llamacpp-slots', W, H,
    'llama-server 的槽位、连续批处理和 KV 池两种分配方式',
    '请求进入任务队列，分配到空闲槽位；每一步把所有活跃槽的 token 拼成一个批次调用 llama_decode，结束的槽释放后补入新请求。下方对比：不写 -np 时 4 个槽共用一个 16384 单元的 KV 池；显式写 -np 4 时池被平均切成每槽 4096。',
    'llama-server：槽位、批次与 KV 池',
    '-c 是整个 KV 池的大小；它怎样分给各槽，取决于有没有显式写 -np',
    b);
}

// Ollama: process structure and request path.
function ollama() {
  const W = 1340, H = 640;
  let b = '';
  b += box('cli', 32, 112, 250, 96, 'node', 'ollama CLI / 桌面 App', ['run、pull、create、ps']);
  b += box('apps', 32, 224, 250, 96, 'node', '你的程序', ['OpenAI / Anthropic SDK', '或 /api/chat']);
  b += box('serve', 330, 112, 400, 208, 'blue', 'ollama serve（Go）', ['监听 127.0.0.1:11434，无鉴权', '/api/*：原生接口', '/v1/*：OpenAI 兼容', '/v1/messages：Anthropic 兼容', '渲染对话模板、解析思考与工具调用'], '常驻进程');
  b += edge('M284 160H326');
  b += edge('M284 272H326');
  b += box('sched', 778, 112, 530, 208, 'amber', '调度器', ['队列上限 OLLAMA_MAX_QUEUE = 512，满了返回 503', '同时加载上限 3 × GPU 数，超过就卸载旧模型', '上下文 = 请求/Modelfile/环境变量/按显存自动', '并行 OLLAMA_NUM_PARALLEL = 1', '空闲 OLLAMA_KEEP_ALIVE = 5m 后卸载'], '决定加载什么、放哪');
  b += edge('M732 216H774');
  // runners
  const ry = 400;
  b += box('llamaserver', 330, ry, 470, 150, 'green', 'llama-server 子进程（GGUF 模型）', ['上游 llama.cpp，随 Ollama 打包', '-c 上下文×并行  -np 并行', '只监听 127.0.0.1 的随机端口'], '一模型一进程');
  b += box('mlx', 838, ry, 470, 150, 'violet', 'MLX runner 子进程（safetensors 模型）', ['ollama runner --model … --port …', 'Apple Silicon 上默认可用', '导入 safetensors 时可量化'], '一模型一进程');
  b += edge('M960 322V360H565V396');
  b += edge('M1073 322V396');
  b += label(600, 384, 'GGUF', 60);
  b += label(1086, 370, 'safetensors', 120);
  b += box('store', 32, 400, 250, 150, 'gray', '模型目录', ['~/.ollama/models', 'manifests/…/qwen3/0.6b', 'blobs/sha256-…'], 'OLLAMA_MODELS');
  b += edge('M284 475H326', 'dash');
  b += text(32, 600, 'ollama pull 从 ollama.com 仓库下载清单和分层，按 sha256 去重存进 blobs/。', 's');
  return svg('ollama-architecture', W, H,
    'Ollama 的进程结构与请求路径',
    'ollama CLI、桌面 App 和用户程序都通过 HTTP 调用常驻的 ollama serve；它提供原生、OpenAI 兼容和 Anthropic 兼容接口，交给调度器决定加载、排队和卸载。GGUF 模型由随包附带的 llama-server 子进程运行，safetensors 模型由 MLX runner 子进程运行，模型文件按清单和 sha256 分层存放在模型目录。',
    'Ollama：一个管理进程，加上每个模型一个推理子进程',
    'ollama serve 管接口、模板和调度；真正算 token 的是它拉起的 llama-server 或 MLX runner',
    b);
}

write({
  'llamacpp-stack': stack(),
  'llamacpp-gguf': gguf(),
  'llamacpp-slots': slots(),
  'ollama-architecture': ollama(),
});
