// Figures for docs/ai/inference-engines/04-lmdeploy.md and 07-local-and-edge.md.
// Run: node .maintenance/inference-engines/diagrams-lmdeploy-mlx.mjs
import { svg, box, cell, edge, text, label, write } from './svg-kit.mjs';

// ---- lmdeploy-architecture ---------------------------------------------------
function lmdeployArchitecture() {
  const W = 1340, H = 620;
  let b = '';
  b += box('client', 32, 236, 180, 132, 'node', '客户端', ['OpenAI SDK', 'curl、网关'], '请求');
  b += box('server', 250, 112, 524, 476, 'node', '', [], 'api_server 进程 · FastAPI · 默认端口 23333');
  b += box('routes', 272, 160, 480, 92, 'blue', '路由与协议', ['/v1/chat/completions、/v1/messages 等']);
  b += box('template', 272, 274, 232, 120, 'blue', '对话模板与分词', ['套模板、编码 token', '反分词、流式返回']);
  b += box('vision', 520, 274, 232, 120, 'gray', 'ImageEncoder', ['仅多模态模型', '单线程，默认每批 1 张']);
  b += box('async', 272, 416, 480, 148, 'green', 'AsyncEngine', ['按 --backend 和模型架构选定引擎', '每个请求一个会话，收发 token', '多模态模型换用 VLAsyncEngine']);
  b += box('tm', 830, 112, 478, 206, 'amber', 'TurboMind', ['persistent batch：N 个常驻槽位', '分块 KV：预算 = 空闲显存 × 0.8', '自研 GEMM 与注意力算子', '张量并行：每卡一个线程 + NCCL'], '与 API 同一进程 · C++/CUDA');
  b += box('pt', 830, 358, 478, 206, 'violet', 'PyTorch 引擎', ['RequestManager → Scheduler → ModelAgent', '分页 KV、CUDA Graph、投机解码、多 LoRA', '后端：CUDA，或经 dlinfer 用昇腾等', 'P/D 分离、KV 连接器只在这里'], '独立进程 · 经 ZMQ 远程调用');
  b += edge('M212 302H268');
  b += edge('M388 252V270');
  b += edge('M636 252V270');
  b += edge('M388 394V412');
  b += edge('M636 394V412');
  b += edge('M752 456H792V215H826');
  b += edge('M752 520H806V461H826');
  b += text(32, 410, '实线：一个请求的去向。', 'xs');
  b += text(32, 432, '两台引擎二选一，', 'xs');
  b += text(32, 454, '对调用方接口相同。', 'xs');
  return svg('lmdeploy-architecture', W, H,
    'LMDeploy 中一个请求的路径',
    '客户端请求进入 api_server 进程，经过路由、对话模板与分词，多模态模型还要经过 ImageEncoder，然后由 AsyncEngine 交给同一进程内的 TurboMind，或经 ZMQ 交给独立进程中的 PyTorch 引擎。',
    '一个请求在 LMDeploy 里怎样流过',
    '服务层只有一套；引擎有两台，TurboMind 在进程内，PyTorch 引擎在单独进程里',
    b);
}

// ---- lmdeploy-backend-choice -------------------------------------------------
function lmdeployBackendChoice() {
  const W = 1340, H = 500, y = 120, h = 156, w = 228, gap = 34, x0 = 32;
  const xs = [0, 1, 2, 3, 4].map(i => x0 + i * (w + gap));
  const qs = [
    ['显式指定 PyTorch？', ['--backend pytorch，', '或 Python 里传入', 'PytorchEngineConfig'], '判断 1'],
    ['TurboMind 编译了吗？', ['昇腾等环境、', 'DISABLE_TURBOMIND=1', '安装时没有它'], '判断 2'],
    ['SmoothQuant 模型？', ['配置里 quant_method', '为 smooth_quant', '（W8A8）'], '判断 3'],
    ['架构在支持表里？', ['读 config.json 的', 'architectures，0.18.0', '共 19 个架构名'], '判断 4'],
  ];
  let b = '';
  qs.forEach(([t, lines, k], i) => { b += box(`q${i + 1}`, xs[i], y, w, h, 'blue', t, lines, k); });
  b += box('tm', xs[4], y, w, h, 'amber', '使用 TurboMind', ['日志不出现', 'Fallback 字样'], '结果');
  const right = ['否', '是', '否', '是'];
  right.forEach((s, i) => {
    b += edge(`M${xs[i] + w + 2} ${y + h / 2}H${xs[i + 1] - 4}`);
    b += label(xs[i] + w + 10, y + h / 2 - 14, s, 20);
  });
  const by = 360, bh = 104;
  b += box('pt', xs[0], by, xs[3] + w - xs[0], bh, 'violet', '使用 PyTorch 引擎', ['判断 2、4 触发回退时，日志打印 Fallback to pytorch engine because ...，据此确认实际引擎'], '结果');
  const down = ['是', '否', '是', '否'];
  down.forEach((s, i) => {
    b += edge(`M${xs[i] + w / 2} ${y + h + 2}V${by - 4}`);
    b += label(xs[i] + w / 2 + 10, y + h + 46, s, 20);
  });
  b += text(xs[4] + 18, by + 34, '--backend 默认写的是', 'xs');
  b += text(xs[4] + 18, by + 56, 'turbomind，但只要不是', 'xs');
  b += text(xs[4] + 18, by + 78, 'pytorch 就走这套判断。', 'xs');
  return svg('lmdeploy-backend-choice', W, H,
    'LMDeploy 自动选择引擎的判断顺序',
    '依次判断：是否显式指定 PyTorch、TurboMind 是否编译、模型是否为 SmoothQuant 量化、架构是否在 TurboMind 支持表中；全部通过才使用 TurboMind，否则使用 PyTorch 引擎。',
    '不写 --backend 时，LMDeploy 怎样选引擎',
    '四道判断依次进行，任何一道落到下方就用 PyTorch 引擎',
    b);
}

// ---- lmdeploy-proxy ----------------------------------------------------------
function lmdeployProxy() {
  const W = 1340, H = 560;
  let b = '';
  // Hybrid panel
  b += box('hybrid', 32, 108, 620, 420, 'node', '', [], 'Hybrid（默认）：每个实例完整地处理请求');
  b += box('h-client', 56, 196, 150, 96, 'gray', '客户端', ['只认代理地址']);
  b += box('h-proxy', 246, 166, 170, 156, 'amber', 'proxy', ['端口 8000', '按估算完成', '时间选节点'], 'serve proxy');
  b += box('h-n1', 458, 150, 170, 72, 'blue', 'api_server', []);
  b += box('h-n2', 458, 240, 170, 72, 'blue', 'api_server', []);
  b += box('h-n3', 458, 330, 170, 72, 'blue', 'api_server', []);
  b += edge('M206 244H242');
  b += edge('M416 200C436 200 436 186 454 186');
  b += edge('M416 244C436 244 436 276 454 276');
  b += edge('M416 290C436 290 436 366 454 366');
  b += text(56, 440, '实例启动时加 --proxy-url 自动注册；', 's');
  b += text(56, 466, '也可用 /nodes/add、/nodes/remove 管理。', 's');
  b += text(56, 492, '路由策略不考虑前缀缓存命中。', 's');
  // DistServe panel
  b += box('dist', 688, 108, 620, 420, 'node', '', [], 'DistServe：Prefill 与 Decode 分到不同实例');
  b += box('d-client', 712, 196, 150, 96, 'gray', '客户端', ['同样只认代理']);
  b += box('d-proxy', 902, 166, 170, 156, 'amber', 'proxy', ['按 DistServe', '策略编排', '先 P 后 D'], 'serve proxy');
  b += box('d-pre', 1114, 150, 170, 112, 'blue', 'Prefill 实例', ['--role Prefill']);
  b += box('d-dec', 1114, 340, 170, 112, 'green', 'Decode 实例', ['--role Decode']);
  b += edge('M862 244H898');
  b += edge('M1072 206H1110');
  b += edge('M1199 262V336');
  b += edge('M1110 396H988V326', 'dash');
  b += label(1210, 290, 'KV 迁移', 72);
  b += text(712, 440, 'KV 经 DLSlime 或 Mooncake 传输，', 's');
  b += text(712, 466, '默认 RDMA，可选 NVLink；', 's');
  b += text(712, 492, '两类实例都必须用 PyTorch 引擎。', 's');
  return svg('lmdeploy-proxy', W, H,
    'LMDeploy proxy 的两种部署方式',
    '左侧 Hybrid 模式下，客户端访问 proxy，proxy 按路由策略把请求分给多个完整的 api_server；右侧 DistServe 模式下，proxy 先把请求交给 Prefill 实例，KV 迁移到 Decode 实例后继续生成并经 proxy 返回。',
    '多个实例怎样组织成一个入口',
    '同一个 lmdeploy serve proxy，换一个 --serving-strategy 就是两种拓扑',
    b);
}

// ---- mlx-workflow ------------------------------------------------------------
function mlxWorkflow() {
  const W = 1340, H = 540;
  let b = '';
  b += box('hf', 32, 130, 230, 132, 'gray', 'Hugging Face 模型', ['safetensors + config', '如 Qwen/Qwen3-8B'], '输入');
  b += box('convert', 302, 130, 250, 132, 'blue', 'mlx_lm.convert -q', ['默认 affine 4 位', '每 64 个权重一组'], '量化转换');
  b += box('mlxdir', 592, 130, 250, 132, 'amber', 'MLX 模型目录', ['mlx_model/ 或', 'mlx-community 现成版本'], '产物');
  b += box('gen', 882, 112, 426, 100, 'green', 'mlx_lm.generate / chat', ['命令行单次生成与终端对话']);
  b += box('server', 882, 228, 426, 100, 'green', 'mlx_lm.server', ['127.0.0.1:8080，OpenAI 风格接口']);
  b += box('data', 302, 356, 250, 132, 'gray', '训练数据', ['train.jsonl', 'valid.jsonl（可选）'], '输入');
  b += box('lora', 592, 356, 250, 132, 'violet', 'mlx_lm.lora --train', ['量化模型即 QLoRA', '默认 rank 8、16 层'], '微调');
  b += box('adapters', 882, 356, 196, 132, 'violet', 'adapters/', ['--adapter-path', '加载使用'], '产物');
  b += box('fuse', 1112, 356, 196, 132, 'violet', 'mlx_lm.fuse', ['合并成新的', '模型目录'], '可选');
  b += edge('M262 196H298');
  b += edge('M552 196H588');
  b += edge('M842 172H878');
  b += edge('M842 230H860V278H878');
  b += edge('M552 422H588');
  b += edge('M717 262V352');
  b += edge('M842 422H878');
  b += edge('M1078 422H1108');
  b += edge('M980 356V332', 'dash');
  b += text(32, 330, '虚线：适配器也可以不合并，', 'xs');
  b += text(32, 352, '生成和服务时直接挂上。', 'xs');
  return svg('mlx-workflow', W, H,
    'MLX-LM 的几条命令怎样串起来',
    'Hugging Face 模型经 mlx_lm.convert 量化成 MLX 模型目录，再由 generate、chat 或 server 使用；训练数据经 mlx_lm.lora 得到适配器，可以直接加载，也可以用 mlx_lm.fuse 合并成新模型。',
    'MLX-LM：转换、运行、服务、微调',
    '同一个模型目录被所有命令共用；现成的 mlx-community 模型可以跳过转换',
    b);
}

// ---- mlx-memory --------------------------------------------------------------
function mlxMemory() {
  const W = 1340, H = 560;
  let b = '';
  // Discrete GPU sketch
  b += box('dgpu', 32, 108, 1276, 150, 'node', '', [], '独立显卡：两块内存，权重要先拷进显存');
  b += box('ram', 64, 152, 300, 82, 'gray', '系统内存', ['CPU 使用']);
  b += box('vram', 560, 152, 300, 82, 'blue', '显存', ['GPU 只能读这里']);
  b += edge('M364 193H556');
  b += label(398, 182, 'PCIe 拷贝权重', 128);
  b += text(900, 186, '显存容量决定能放多大的模型，', 's');
  b += text(900, 212, '系统内存再大也帮不上 GPU。', 's');
  // Unified memory bar, drawn to scale: 24 GiB = 1200 px. Weights: 8.2B params x 4.5 bits (4-bit + fp16 scale/bias per 64) ~ 4.6 GB = 4.3 GiB.
  const x0 = 64, bw = 1200, gib = bw / 24, by = 360, bh = 56;
  b += box('uma', 32, 282, 1276, 254, 'node', '', [], 'Apple 统一内存（本机 M4，24 GiB）：CPU 和 GPU 读同一块内存');
  const rec = 17.76, w8 = 4.3, kv = 1.13;
  b += cell(x0, by, bw, bh, 'fgray');
  b += cell(x0, by, Math.round(rec * gib), bh, 'fblue');
  b += cell(x0, by, Math.round(w8 * gib), bh, 'famber', '8B 4 位权重 ≈ 4.3 GiB', 'xs');
  b += cell(x0 + Math.round(w8 * gib), by, Math.round(kv * gib), bh, 'fgreen', 'KV', 'xs');
  const warn = x0 + Math.round(0.9 * rec * gib);
  b += `<path d="M${warn} ${by - 14}V${by + bh + 14}" class="axis"/>`;
  b += text(warn - 6, by - 20, '90%：mlx-lm 开始警告', 'xs', 'end');
  b += text(x0 + Math.round(rec * gib) + 8, by + 34, '系统与其他应用', 'xs');
  b += text(x0, by + bh + 32, '蓝色：GPU 推荐工作集上限 ≈ 17.8 GiB（总量的 74%，本机 mx.device_info() 实测）', 's');
  b += text(x0, by + bh + 58, '绿色 KV：Qwen3-8B 上下文 8192 token 时约 1.1 GiB；超出蓝色区域后会变慢，可用 sysctl iogpu.wired_limit_mb 调整上限', 's');
  return svg('mlx-memory', W, H,
    '独立显卡与 Apple 统一内存的对比',
    '独立显卡需要把权重从系统内存经 PCIe 拷贝到显存；Apple 统一内存中 CPU 和 GPU 共用同一块内存，本机 24 GiB 中 GPU 推荐工作集约 17.8 GiB，8B 模型 4 位权重约 4.3 GiB，8192 token 的 KV 约 1.1 GiB。',
    '统一内存：省掉拷贝，但上限比标称小',
    '下方条形按比例绘制：24 GiB 总量中，GPU 默认能稳定使用的约四分之三',
    b);
}

write({
  'lmdeploy-architecture': lmdeployArchitecture(),
  'lmdeploy-backend-choice': lmdeployBackendChoice(),
  'lmdeploy-proxy': lmdeployProxy(),
  'mlx-workflow': mlxWorkflow(),
  'mlx-memory': mlxMemory(),
});
